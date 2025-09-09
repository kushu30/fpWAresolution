import makeWASocket, { DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import Redis from 'ioredis'
import sha256 from 'sha256'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const GLOBAL_RATE_LIMIT_PER_SECOND = parseInt(process.env.GLOBAL_RATE_LIMIT_PER_SECOND || '1', 10) || 1
const DEDUPE_TTL_SECONDS = parseInt(process.env.DEDUPE_TTL_SECONDS || '30', 10) || 30
const TRIGGER_KEYWORD = process.env.TRIGGER_KEYWORD || '@support'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_IMAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET || 'ticket-images'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const redis = new Redis(REDIS_URL)
const redisSub = new Redis(REDIS_URL)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let isConnected = false

async function startOutgoingConsumer(sock) {
  console.log('Starting outgoing message consumer...')
  const rateLimitDelay = Math.max(1, Math.floor(1000 / GLOBAL_RATE_LIMIT_PER_SECOND))
  while (true) {
    try {
      if (!isConnected) {
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      const isPaused = await redis.get('bot:paused')
      if (isPaused) {
        await new Promise((r) => setTimeout(r, 5000))
        continue
      }
      const result = await redisSub.brpop('queue:outgoing', 0)
      const jobString = result && result[1]
      if (!jobString) {
        await new Promise((r) => setTimeout(r, 200))
        continue
      }
      let job
      try {
        job = JSON.parse(jobString)
      } catch (err) {
        console.error('Failed to parse outgoing job JSON:', err, jobString)
        continue
      }
      if (!isConnected) {
        console.warn('Not connected, re-enqueueing outgoing job and waiting...')
        await redis.lpush('queue:outgoing', jobString)
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      const jid = job.to && job.to.endsWith('@g.us') ? job.to : `${(job.to || '').toString().replace(/[^0-9]/g, '')}@s.whatsapp.net`
      try {
        await sock.sendMessage(jid, { text: job.text })
        console.log(`Sent message to ${job.to}`)
      } catch (err) {
        console.error('Failed to send message — requeueing job:', err)
        await redis.lpush('queue:outgoing', jobString)
        await new Promise((r) => setTimeout(r, 1000))
      }
      await new Promise((r) => setTimeout(r, rateLimitDelay))
    } catch (error) {
      console.error('Error in outgoing consumer loop:', error)
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
  })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      console.log('QR code received — scan with phone:')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') {
      isConnected = true
      console.log('WhatsApp connection opened.')
      if (!sock.consumerStarted) {
        sock.consumerStarted = true
        startOutgoingConsumer(sock).catch((err) => {
          console.error('Outgoing consumer crashed:', err)
          sock.consumerStarted = false
        })
      }
    }
    if (connection === 'close') {
      isConnected = false
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode) !== DisconnectReason.loggedOut
      console.log('Connection closed, reconnecting:', shouldReconnect, lastDisconnect?.error)
      if (shouldReconnect) {
        setTimeout(() => {
          connectToWhatsApp().catch((e) => console.error('Reconnect failed', e))
        }, 1000)
      } else {
        console.log('Logged out — manual re-authentication required.')
      }
    }
  })
  sock.ev.on('messages.upsert', async (m) => {
    try {
      const msg = m.messages && m.messages[0]
      if (!msg || !msg.message || !msg.key || !msg.key.remoteJid) return
      if (!msg.key.remoteJid.endsWith('@g.us')) return
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        ''
      const mentionedJids = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || []
      const botJid = sock.user?.id?.split(':')?.[0] + '@s.whatsapp.net'
      const isMentioned = mentionedJids.includes(botJid)
      const hasTrigger = TRIGGER_KEYWORD ? text.includes(TRIGGER_KEYWORD) : false
      if (!isMentioned && !hasTrigger) return
      const groupJid = msg.key.remoteJid
      const senderPhone = msg.key.participant
      const hash = sha256(`${groupJid}|${senderPhone}|${text}`)
      const dedupeKey = `dedupe:${hash}`
      const isDuplicate = await redis.get(dedupeKey)
      if (isDuplicate) {
        console.log(`Duplicate message detected, ignoring: ${hash}`)
        return
      }
      const groupMetadata = await sock.groupMetadata(groupJid).catch(() => ({ subject: '' }))
      const groupName = groupMetadata.subject || ''
      let imageUrl = null
      try {
        if (msg.message.imageMessage || msg.message.videoMessage) {
          const buffer = await downloadMediaMessage(msg, 'buffer', {})
          const ext = msg.message.imageMessage ? 'jpg' : 'mp4'
          const filename = `${Date.now()}_${msg.key.id}.${ext}`
          const filePath = filename
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(SUPABASE_IMAGE_BUCKET)
            .upload(filePath, buffer, { contentType: msg.message.imageMessage ? 'image/jpeg' : 'video/mp4' })
          if (uploadError) {
            console.error('Error uploading to Supabase Storage:', uploadError)
          } else {
            const { data: urlData } = supabase.storage.from(SUPABASE_IMAGE_BUCKET).getPublicUrl(filePath)
            imageUrl = urlData?.publicUrl ?? null
            console.log('Uploaded media to:', imageUrl)
          }
        }
      } catch (err) {
        console.error('Error handling media download/upload:', err)
      }
      const jobPayload = {
        groupJid,
        groupName,
        senderPhone,
        senderName: msg.pushName || '',
        text,
        imageUrl,
        timestamp: new Date().toISOString(),
      }
      await redis.lpush('queue:incoming', JSON.stringify(jobPayload))
      await redis.set(dedupeKey, '1', 'EX', DEDUPE_TTL_SECONDS)
      console.log(`Message enqueued from ${jobPayload.senderName} in ${groupName}`)
    } catch (error) {
      console.error('Error processing incoming message:', error)
    }
  })
}

async function ensureBucketExists() {
  const bucketName = SUPABASE_IMAGE_BUCKET
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    if (listError) {
      console.warn('Could not list buckets:', listError)
    } else {
      const found = (buckets || []).find((b) => b.name === bucketName)
      if (found) {
        console.log(`Supabase bucket "${bucketName}" already exists.`)
        return
      }
    }
    const { data: created, error: createError } = await supabase.storage.createBucket(bucketName, { public: true })
    if (createError) {
      console.error('Error creating bucket:', createError)
    } else {
      console.log(`Created Supabase bucket "${bucketName}".`, created)
    }
  } catch (err) {
    console.error('ensureBucketExists error:', err)
  }
}

;(async () => {
  await ensureBucketExists()
  connectToWhatsApp().catch((err) => {
    console.error('Fatal error connecting to WhatsApp:', err)
    process.exit(1)
  })
})()
