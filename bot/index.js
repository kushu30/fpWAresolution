// bot/index.js
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import Redis from 'ioredis';
import sha256 from 'sha256';
import 'dotenv/config';

const redis = new Redis(process.env.REDIS_URL);
const redisSub = new Redis(process.env.REDIS_URL); // Separate client for blocking commands

async function startOutgoingConsumer(sock) {
  console.log('Starting outgoing message consumer...');
  const rateLimitDelay = 1000 / parseInt(process.env.GLOBAL_RATE_LIMIT_PER_SECOND);

  while (true) {
    try {
      const isPaused = await redis.get('bot:paused');
      if (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s if paused
        continue;
      }
      
      const result = await redisSub.brpop('queue:outgoing', 0);
      const jobString = result[1];
      const job = JSON.parse(jobString);

      const jid = job.to.endsWith('@g.us') ? job.to : `${job.to.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      
      await sock.sendMessage(jid, { text: job.text });
      console.log(`Sent message to ${job.to}`);

      await new Promise(resolve => setTimeout(resolve, rateLimitDelay));

    } catch (error) {
      console.error('Error in outgoing consumer:', error);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retrying
    }
  }
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('QR code received, please scan with your phone:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp connection opened.');
      startOutgoingConsumer(sock); // Start consumer only when connected
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || !msg.key.remoteJid.endsWith('@g.us')) {
      return;
    }
    try {
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const mentionedJids = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const isMentioned = mentionedJids.includes(botJid);
      const hasTrigger = text.includes(process.env.TRIGGER_KEYWORD);

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

      const groupMetadata = await sock.groupMetadata(groupJid);
      const groupName = groupMetadata.subject;
      
      const jobPayload = { groupJid, groupName, senderPhone, senderName: msg.pushName, text, timestamp: new Date().toISOString() };
      await redis.lpush('queue:incoming', JSON.stringify(jobPayload));
      await redis.set(dedupeKey, '1', 'EX', parseInt(process.env.DEDUPE_TTL_SECONDS));
      
      console.log(`Message enqueued from ${jobPayload.senderName} in ${groupName}`);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
}

connectToWhatsApp();