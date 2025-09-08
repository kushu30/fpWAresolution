// backend/index.js
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import 'dotenv/config';

// --- Config / Clients ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3001;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const redis = new Redis(REDIS_URL);
const redisSub = new Redis(REDIS_URL); // separate client for blocking ops

// --- Express app ---
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.send({ status: 'ok' }));

// --- API Endpoints ---

// Reply endpoint: store agent message and enqueue outgoing job
app.post('/tickets/:ticketId/reply', async (req, res) => {
  const { ticketId } = req.params;
  const { agentName, text } = req.body;

  if (!agentName || !text) {
    return res.status(400).send({ error: 'agentName and text are required.' });
  }

  try {
    // insert message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({ ticket_id: ticketId, source: 'agent', body: text });

    if (msgError) throw new Error(`Supabase message insert error: ${msgError.message}`);

    // fetch ticket to get group_jid and ticket_id_text
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('group_jid, ticket_id_text')
      .eq('id', ticketId)
      .single();

    if (ticketError) throw new Error(`Supabase ticket fetch error: ${ticketError.message}`);
    if (!ticket || !ticket.group_jid) throw new Error('Ticket or ticket.group_jid not found');

    const replyText = `*${agentName}*: ${text}`;
    await redis.lpush('queue:outgoing', JSON.stringify({ to: ticket.group_jid, text: replyText, meta: { origin: 'agent_reply', ticketId } }));

    console.log(`Enqueued reply for ticket ${ticket.ticket_id_text ?? ticketId}`);
    return res.status(200).send({ message: 'Reply queued for sending' });
  } catch (error) {
    console.error('Error in /tickets/:ticketId/reply:', error);
    return res.status(500).send({ error: (error && error.message) || 'unknown error' });
  }
});

// Ticket status endpoint: update status and notify group
app.post('/tickets/:ticketId/status', async (req, res) => {
  const { ticketId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).send({ error: 'Status is required.' });
  }

  try {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw new Error(`Supabase ticket update error: ${error.message}`);

    const replyText = `*Support Agent* has changed the status of ticket *${ticket.ticket_id_text}* to: *${status}*.`;
    await redis.lpush('queue:outgoing', JSON.stringify({ to: ticket.group_jid, text: replyText }));

    res.status(200).send(ticket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).send({ error: error.message });
  }
});

// --- Redis Worker: process queue:incoming ---
async function processIncomingQueue() {
  console.log('Starting incoming message worker (BRPOP on queue:incoming)...');

  while (true) {
    try {
      const result = await redisSub.brpop('queue:incoming', 0);
      const jobString = result && result[1];
      if (!jobString) {
        console.warn('Empty job from BRPOP, skipping.');
        continue;
      }

      let job;
      try {
        job = JSON.parse(jobString);
      } catch (err) {
        console.error('Failed to parse incoming job JSON:', err, jobString);
        continue;
      }

      // Keep original job.text intact for extraction; use a lowercase copy for command detection
      const originalText = (job.text || '').toString();
      const commandText = originalText.toLowerCase();

      // ----- @close command (FIXED) -----
      // Expecting: "@close FXPABC-123" (case-insensitive command; ID extracted from original text)
      if (commandText.startsWith('@close')) {
        // Use the original text to extract the ID (so casing/format is preserved before uppercasing)
        const ticketIdToClose = originalText.split(' ')[1]?.toUpperCase();
        if (!ticketIdToClose) {
          console.log('Close command received but no ticket ID provided.');
          continue;
        }

        // Search by ticket_id_text (custom FXP ID)
        const { data: ticket, error } = await supabase
          .from('tickets')
          .update({ status: 'closed' })
          .eq('ticket_id_text', ticketIdToClose)
          .select()
          .single();

        if (error || !ticket) {
          console.log(`Could not find ticket ${ticketIdToClose} to close.`);
          continue;
        }

        const confirmationText = `Ticket *${ticket.ticket_id_text}* has been closed by the user.`;
        await redis.lpush('queue:outgoing', JSON.stringify({ to: ticket.group_jid, text: confirmationText, meta: { origin: 'close_command', ticketId: ticket.id } }));
        console.log(`Closed ticket ${ticket.ticket_id_text}`);
        continue;
      }

      // ----- @support command: create ticket & message -----
      if (commandText.includes('@support')) {
        // ensure group exists or create
        let { data: group, error: groupError } = await supabase.from('groups').select('*').eq('group_jid', job.groupJid).maybeSingle();
        if (groupError) {
          console.error('Error fetching group:', groupError);
          throw new Error(groupError.message);
        }

        if (!group) {
          const { data: newGroup, error: newGroupError } = await supabase.from('groups').insert({ group_jid: job.groupJid, group_name: job.groupName }).select().single();
          if (newGroupError) throw new Error(newGroupError.message);
          group = newGroup;
        }

        // Create a new ticket id text using group.ticket_counter
        const newTicketCounter = (group.ticket_counter || 0) + 1;
        const newTicketIdText = `FXP${(group.id || '').split('-')[0].toUpperCase()}-${newTicketCounter}`;

        // increment group's counter
        await supabase.from('groups').update({ ticket_counter: newTicketCounter }).eq('id', group.id);

        // create ticket
        const { data: newTicket, error: createError } = await supabase
          .from('tickets')
          .insert({
            group_id: group.id,
            group_jid: job.groupJid,
            group_name: job.groupName,
            sender_phone: job.senderPhone,
            sender_name: job.senderName,
            subject: originalText,
            ticket_id_text: newTicketIdText
          })
          .select()
          .single();

        if (createError) throw new Error(createError.message);

        // insert the originating message
        await supabase.from('messages').insert({ ticket_id: newTicket.id, source: 'user', body: originalText });

        const confirmationText = `Ticket *${newTicket.ticket_id_text}* has been created.`;
        await redis.lpush('queue:outgoing', JSON.stringify({ to: job.groupJid, text: confirmationText, meta: { origin: 'ticket_created', ticketId: newTicket.id } }));
        console.log(`Created ticket ${newTicket.ticket_id_text}`);
        continue;
      }

      // ----- Default: handle as normal incoming message -----
      // Attempt to attach to existing open ticket for (group_jid, sender_phone)
      let isNewTicket = false;
      const { data: foundTicket, error: findError } = await supabase
        .from('tickets')
        .select('*')
        .eq('group_jid', job.groupJid)
        .eq('sender_phone', job.senderPhone)
        .eq('status', 'open')
        .maybeSingle();

      if (findError) {
        console.error('Error finding ticket:', findError);
        throw new Error(findError.message);
      }

      let ticket = foundTicket;
      if (!ticket) {
        // create a fallback ticket (no @support used)
        isNewTicket = true;
        const subject = originalText.substring(0, 50) + (originalText.length > 50 ? '...' : '');
        const { data: newTicket, error: createError } = await supabase
          .from('tickets')
          .insert({
            group_jid: job.groupJid,
            group_name: job.groupName || null,
            sender_phone: job.senderPhone || null,
            sender_name: job.senderName || null,
            subject
          })
          .select()
          .single();

        if (createError) throw new Error(createError.message);
        ticket = newTicket;
        console.log(`Created fallback ticket #${ticket.ticket_number ?? ticket.id}`);
      } else {
        console.log(`Found existing ticket #${ticket.ticket_number ?? ticket.id}`);
      }

      // insert user's message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({ ticket_id: ticket.id, source: 'user', body: originalText });

      if (msgError) throw new Error(msgError.message);

      // enqueue a confirmation back to group
      const confirmationText = isNewTicket
        ? `✅ Ticket #${ticket.ticket_number ?? ticket.ticket_id_text ?? ticket.id} created for "${ticket.subject}".`
        : `💬 New message added to Ticket #${ticket.ticket_number ?? ticket.ticket_id_text ?? ticket.id}.`;

      await redis.lpush('queue:outgoing', JSON.stringify({
        to: job.groupJid,
        text: confirmationText,
        meta: { origin: 'incoming_message', ticketId: ticket.id }
      }));

      console.log(`Enqueued confirmation for ticket ${ticket.ticket_id_text ?? ticket.id}`);
    } catch (error) {
      console.error('Error in incoming worker loop:', error);
      // small backoff on error
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Start worker (non-blocking)
processIncomingQueue().catch((err) => {
  console.error('Fatal error starting incoming worker:', err);
  process.exit(1);
});

// --- Start Express server ---
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
  console.log('Ensure Redis and Supabase are reachable via env vars.');
});
