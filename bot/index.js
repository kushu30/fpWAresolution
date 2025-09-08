// bot/index.js
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import Redis from 'ioredis';
import sha256 from 'sha256';
import 'dotenv/config';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const GLOBAL_RATE_LIMIT_PER_SECOND = parseInt(process.env.GLOBAL_RATE_LIMIT_PER_SECOND || '1', 10) || 1;
const DEDUPE_TTL_SECONDS = parseInt(process.env.DEDUPE_TTL_SECONDS || '30', 10) || 30;
const TRIGGER_KEYWORD = process.env.TRIGGER_KEYWORD || ''; // e.g. '@bot'
const redis = new Redis(REDIS_URL);
const redisSub = new Redis(REDIS_URL); // blocking operations

// --- Connection status flag (the main fix) ---
let isConnected = false;

async function startOutgoingConsumer(sock) {
  console.log('Starting outgoing message consumer...');
  const rateLimitDelay = Math.max(1, Math.floor(1000 / GLOBAL_RATE_LIMIT_PER_SECOND));

  while (true) {
    try {
      // Pause if bot is not connected
      if (!isConnected) {
        // Wait 1s and re-check connection
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const isPaused = await redis.get('bot:paused');
      if (isPaused) {
        // If paused by operator, sleep longer
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      // BRPOP blocks until there's an outgoing job
      const result = await redisSub.brpop('queue:outgoing', 0);
      const jobString = result && result[1];
      if (!jobString) {
        // nothing to do, loop again
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }

      let job;
      try {
        job = JSON.parse(jobString);
      } catch (err) {
        console.error('Failed to parse outgoing job JSON:', err, jobString);
        continue;
      }

      // If still not connected, re-enqueue the job and wait
      if (!isConnected) {
        console.warn('Not connected, re-enqueueing outgoing job and waiting...');
        await redis.lpush('queue:outgoing', jobString);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      const jid = job.to && job.to.endsWith('@g.us')
        ? job.to
        : `${(job.to || '').toString().replace(/[^0-9]/g, '')}@s.whatsapp.net`;

      try {
        await sock.sendMessage(jid, { text: job.text });
        console.log(`Sent message to ${job.to}`);
      } catch (err) {
        // If send fails (socket closed), requeue job and let loop handle reconnect/wait
        console.error('Failed to send message — requeueing job:', err);
        await redis.lpush('queue:outgoing', jobString);
        // small delay so we don't tight-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // rate limit delay
      await new Promise((resolve) => setTimeout(resolve, rateLimitDelay));
    } catch (error) {
      console.error('Error in outgoing consumer loop:', error);
      // backoff on unexpected error
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
  });

  // Persist credentials
  sock.ev.on('creds.update', saveCreds);

  // Connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('QR code received, please scan with your phone:');
      qrcode.generate(qr, { small: true });
    }

    // connection open
    if (connection === 'open') {
      isConnected = true;
      console.log('WhatsApp connection opened.');

      // Start outgoing consumer only once per socket
      if (!sock.consumerStarted) {
        sock.consumerStarted = true;
        // start but don't await — consumer loop runs continuously
        startOutgoingConsumer(sock).catch(err => {
          console.error('Outgoing consumer crashed:', err);
          sock.consumerStarted = false;
        });
      }
    }

    // connection closed
    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode) !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect, lastDisconnect?.error);
      if (shouldReconnect) {
        // small delay before reconnecting to avoid tight reconnect loop
        setTimeout(() => connectToWhatsApp().catch((e) => console.error('Reconnect failed', e)), 1000);
      } else {
        console.log('Logged out — please re-authenticate.');
      }
    }
  });

  // Incoming messages
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages && m.messages[0];
      if (!msg || !msg.message || !msg.key || !msg.key.remoteJid) return;
      // We only handle group messages here
      if (!msg.key.remoteJid.endsWith('@g.us')) return;

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const mentionedJids = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const botJid = sock.user?.id?.split(':')?.[0] + '@s.whatsapp.net';
      const isMentioned = mentionedJids.includes(botJid);
      const hasTrigger = TRIGGER_KEYWORD ? text.includes(TRIGGER_KEYWORD) : false;

      if (!isMentioned && !hasTrigger) return;

      const groupJid = msg.key.remoteJid;
      const senderPhone = msg.key.participant;
      const hash = sha256(`${groupJid}|${senderPhone}|${text}`);
      const dedupeKey = `dedupe:${hash}`;
      const isDuplicate = await redis.get(dedupeKey);

      if (isDuplicate) {
        console.log(`Duplicate message detected, ignoring: ${hash}`);
        return;
      }

      const groupMetadata = await sock.groupMetadata(groupJid).catch(() => ({ subject: '' }));
      const groupName = groupMetadata.subject || '';

      const jobPayload = {
        groupJid,
        groupName,
        senderPhone,
        senderName: msg.pushName || '',
        text,
        timestamp: new Date().toISOString(),
      };

      await redis.lpush('queue:incoming', JSON.stringify(jobPayload));
      await redis.set(dedupeKey, '1', 'EX', DEDUPE_TTL_SECONDS);

      console.log(`Message enqueued from ${jobPayload.senderName} in ${groupName}`);
    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  });
}

// Start the connection
connectToWhatsApp().catch((err) => {
  console.error('Fatal error connecting to WhatsApp:', err);
  process.exit(1);
});
