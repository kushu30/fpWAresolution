// backend/index.js
require('dotenv').config();
const express = require('express');
const IORedis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_SECRET = process.env.BOT_SECRET;
const ADMIN_SECRET = process.env.ADMIN_SECRET;
const REDIS_URL = process.env.REDIS_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const redis = new IORedis(REDIS_URL);
const PER_USER_COOLDOWN_SECONDS = parseInt(process.env.PER_USER_COOLDOWN_SECONDS) || 300;
const PER_GROUP_COOLDOWN_SECONDS = 60;

app.post('/tickets/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { message, senderPhone, senderName } = req.body;
  if (req.headers['x-agent-secret'] !== ADMIN_SECRET) return res.status(401).send('Unauthorized');
  
  await supabase.from('messages').insert({ ticket_id: id, source: 'agent', body: message });
  await redis.lpush('queue:outgoing', JSON.stringify({ type: 'dm', phone: senderPhone, text: `Reply to your ticket: ${message}` }));

  res.status(200).send('Reply queued.');
});

app.post('/admin/pause', (req, res) => {
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET) return res.status(401).send('Unauthorized');
  redis.set('bot:paused', 'true');
  res.status(200).send('Bot paused.');
});

app.post('/admin/resume', (req, res) => {
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET) return res.status(401).send('Unauthorized');
  redis.del('bot:paused');
  res.status(200).send('Bot resumed.');
});

app.listen(3000, () => console.log('Backend listening on port 3000'));

const worker = async () => {
  while (true) {
    const isPaused = await redis.get('bot:paused');
    if (isPaused) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      continue;
    }

    const job = await redis.brpop('queue:incoming', 0);
    if (!job) continue;
    const [queue, data] = job;
    const { groupJid, groupName, senderPhone, senderName, text, messageId } = JSON.parse(data);

    let { data: ticket, error } = await supabase.from('tickets').select('*').eq('group_jid', groupJid).eq('sender_phone', senderPhone).eq('status', 'open').single();
    if (!ticket) {
      const { data, error: createError } = await supabase.from('tickets').insert({ group_jid: groupJid, group_name: groupName, sender_phone: senderPhone, sender_name: senderName, subject: text }).select().single();
      ticket = data;
    }
    
    await supabase.from('messages').insert({ ticket_id: ticket.id, source: 'user', body: text });

    const isGroupCooledDown = await redis.set(`cooldown:group:${groupJid}`, '1', 'EX', PER_GROUP_COOLDOWN_SECONDS, 'NX');
    if (isGroupCooledDown) {
      await redis.lpush('queue:outgoing', JSON.stringify({ type: 'group', groupJid, text: `We received your request, ticket #${ticket.ticket_number} is open. An agent will be with you shortly.` }));
    }

    const isUserCooledDown = await redis.set(`cooldown:user:${senderPhone}`, '1', 'EX', PER_USER_COOLDOWN_SECONDS, 'NX');
    if (isUserCooledDown) {
      await redis.lpush('queue:outgoing', JSON.stringify({ type: 'dm', phone: senderPhone, text: `We've opened a new ticket for you, #${ticket.ticket_number}.` }));
    }
  }
};

worker();