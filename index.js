console.log('🐾 Starting bot-amirni-hamza by Hamza Amirni...');
process.setMaxListeners(0); // unlimited — prevents MaxListenersExceededWarning in multi-bot worker threads
try { require('fs').watchFile; const { StatWatcher } = require('fs'); } catch (_) {}
// Increase max listeners on StatWatcher to prevent warnings during conflict reconnects
try { const fsModule = await import('fs'); } catch (_) {}

// ====== GLOBAL CONSOLE SILENCER & CRASH PROTECTION ======
const IGNORED_ERRORS = [
    'Timed Out', 'timed out', 'Connection Closed', 'connection closed',
    'uploadPreKeysToServerIfRequired', 'getAvailablePreKeysOnServer',
    'waitForMessage', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
    'socket hang up', 'read ECONNRESET', 'write ECONNRESET',
    'Could not decode', 'Conflict', 'conflict', 'Bad MAC'
];

process.on('unhandledRejection', (reason) => {
    const msg = reason?.message || reason?.toString() || '';
    const isIgnored = IGNORED_ERRORS.some(e => msg.includes(e));
    if (!isIgnored) console.error('🛑 Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    const msg = err?.message || err?.toString() || '';
    const isIgnored = IGNORED_ERRORS.some(e => msg.includes(e));
    if (!isIgnored) console.error('🛑 Uncaught Exception:', err);
});

function setupSilencer() {
    const _err = console.error.bind(console);
    const _log = console.log.bind(console);
    const _warn = console.warn.bind(console);
    const _info = console.info.bind(console);

    const silencePatterns = [
        'Closing open session',
        'Closing session',
        'SessionEntry',
        'Removing old closed session',
        'Replacing old closed session',
        'failed to decrypt message',
        'Failed to decrypt message',
        'Failed to decrypt',
        'SessionError',
        'Session error',
        'No session record',
        'incoming prekey bundle',
        'chainKey',
        'ratchetKey',
        'currentRatchet',
        'indexInfo',
        'Bad MAC',
        'libsignal',
        'verifyMAC',
        'doDecryptWhisperMessage',
        'decryptWithSessions'
    ];

    function shouldSilence(args) {
        if (!args || !args.length) return false;
        const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a || '')).join(' ');
        return silencePatterns.some(pattern => msg.includes(pattern));
    }

    console.error = (...args) => { if (!shouldSilence(args)) _err(...args); };
    console.log = (...args) => { if (!shouldSilence(args)) _log(...args); };
    console.warn = (...args) => { if (!shouldSilence(args)) _warn(...args); };
    console.info = (...args) => { if (!shouldSilence(args)) _info(...args); };
}
setupSilencer();

import { Worker } from 'worker_threads';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { watchFile, unwatchFile, readFileSync, existsSync, writeFileSync, mkdirSync, rmSync, readdirSync, unlinkSync } from 'fs';
import readline from 'readline';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');
const BOT_PHONE = (process.env.PAIRING_NUMBER || '212612030829').toString().replace(/[^0-9]/g, '');
// Mutable: updated when a pairing code is captured, so backup always uses the real connected phone
let currentBotPhone = BOT_PHONE;

function getBotPhone() {
  return (currentBotPhone || process.env.PAIRING_NUMBER || BOT_PHONE || '').toString().replace(/[^0-9]/g, '');
}

function getBotSessionDir(phone) {
  const clean = (phone || getBotPhone() || 'default').toString().replace(/[^0-9]/g, '');
  return clean ? join(__dirname, 'sessions', `session_${clean}`) : join(__dirname, 'sessions');
}

function getBotDbPath(phone) {
  return join(getBotSessionDir(phone), 'auth.db');
}

let latestAuthInfo = {
  pairing_code: null,
  qr_code: null,
  phone_number: BOT_PHONE,
  status: 'unknown',
  updated_at: null
};

// Health check & API dashboard server for Koyeb
const PORT = process.env.PORT || 8000;
http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url.startsWith('/api/')) {
    const endpoint = req.url.replace('/api/', '').split('?')[0];
    
    try {
      if (endpoint === 'stats') {
        const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_stats?select=*&limit=1', {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const data = await fetchRes.json();
        const row = data[0] || {};

        // Calculate total_users dynamically from bot_users table
        try {
          const uRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users?select=count', {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Prefer': 'count=exact', 'Range': '0-0' }
          });
          const cHeader = uRes.headers.get('content-range') || '';
          const uCount = parseInt(cHeader.split('/')[1] || '0', 10);
          row.total_users = uCount || Object.keys(global.db?.data?.users || {}).length || row.total_users || 0;
        } catch (_) {
          row.total_users = Object.keys(global.db?.data?.users || {}).length || row.total_users || 0;
        }

        row.bot_connected = workersMap.size > 0 && Array.from(workersMap.values()).some(w => w.connected);
        row.phone = Array.from(workersMap.entries())
          .filter(([, info]) => info.connected)
          .map(([phone]) => '+' + phone)
          .join(', ') || BOT_PHONE;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(row));
        return;
      }
      
      if (endpoint === 'sessions') {
        const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth?select=*&order=updated_at.desc', {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const data = await fetchRes.json();
        
        // Mark each session as is_active = true if its worker is running and connected
        const sanitized = (data || []).map(row => {
          const cleanRowPhone = (row.phone_number || '').toString().replace(/[^0-9]/g, '');
          const workerInfo = workersMap.get(cleanRowPhone);
          const isActive = !!(workerInfo && workerInfo.connected);
          return {
            ...row,
            is_active: isActive,
            status: isActive ? 'connected' : (row.status || 'unknown')
          };
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sanitized));
        return;
      }
      
      if (endpoint === 'aichat') {
        const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?select=jid,last_image,updated_at&order=updated_at.desc&limit=100', {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const data = await fetchRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }

      if (endpoint === 'aichat-detail') {
        const jid = req.url.split('jid=')[1]?.split('&')[0] || '';
        const fetchRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?select=history,last_image&jid=eq.${encodeURIComponent(jid)}&limit=1`, {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const data = await fetchRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data[0] || {}));
        return;
      }
      
      if (endpoint === 'devmsg') {
        const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/dev_messages?select=*&order=timestamp.desc&limit=50', {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const data = await fetchRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }

      // ── GET /api/broadcasts — broadcast history ────────────
      if (endpoint === 'broadcasts' && req.method === 'GET') {
        try {
          const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/broadcasts?select=*&order=created_at.desc&limit=30', {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
          });
          const data = await fetchRes.json();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(Array.isArray(data) ? data : []));
        } catch (err) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([]));
        }
        return;
      }

      // ── GET /api/users — users count from Supabase ─────────
      if (endpoint === 'users' && req.method === 'GET') {
        try {
          const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users?select=count', {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Prefer': 'count=exact', 'Range': '0-0' }
          });
          const countHeader = fetchRes.headers.get('content-range') || '';
          const total = parseInt(countHeader.split('/')[1] || '0', 10);
          const memUsers = Object.keys(global.db?.data?.users || {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ count: total || memUsers.length }));
        } catch (_) {
          const memUsers = Object.keys(global.db?.data?.users || {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ count: memUsers.length }));
        }
        return;
      }

      // ── GET /api/users-list — full list from Supabase ──────
      if (endpoint === 'users-list' && req.method === 'GET') {
        try {
          const page = parseInt(req.url.split('page=')[1] || '1', 10);
          const limit = 50;
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          const fetchRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users?select=*&order=last_seen.desc`, {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Range': `${from}-${to}`, 'Prefer': 'count=exact' }
          });
          const data = await fetchRes.json();
          const countHeader = fetchRes.headers.get('content-range') || '';
          const total = parseInt(countHeader.split('/')[1] || '0', 10);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ users: Array.isArray(data) ? data : [], total, page, limit }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, users: [] }));
        }
        return;
      }

      // ── GET /api/banned-users — fetch all banned & registered users with ban state & bot isolation ──
      if (endpoint.startsWith('banned-users') && req.method === 'GET') {
        try {
          const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
          const filterBotPhone = (urlParams.get('bot_phone') || '').replace(/[^0-9]/g, '');

          // Fetch users from Supabase bot_users
          const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users?select=*&order=last_seen.desc', {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
          });
          const sbUsers = await fetchRes.json();

          const userMap = new Map();
          if (Array.isArray(sbUsers)) {
            sbUsers.forEach(u => {
              const cleanPhone = (u.phone_number || u.jid || '').replace(/[^0-9]/g, '');
              const uBotPhone = (u.bot_phone || '').replace(/[^0-9]/g, '');
              if (cleanPhone) {
                const key = `${uBotPhone || 'all'}:${cleanPhone}`;
                userMap.set(key, {
                  phone: cleanPhone,
                  name: u.name || cleanPhone,
                  jid: u.jid || cleanPhone + '@s.whatsapp.net',
                  bot_phone: uBotPhone || null,
                  banned: u.is_banned === true || u.is_banned === 'true' || u.banned === true,
                  last_seen: u.last_seen || null
                });
              }
            });
          }

          if (global.db?.data?.users) {
            Object.entries(global.db.data.users).forEach(([jid, u]) => {
              const cleanPhone = jid.replace(/[^0-9]/g, '');
              if (cleanPhone) {
                const key = `all:${cleanPhone}`;
                const existing = userMap.get(key) || Array.from(userMap.values()).find(x => x.phone === cleanPhone) || {};
                userMap.set(key, {
                  phone: cleanPhone,
                  name: u.name || existing.name || cleanPhone,
                  jid,
                  bot_phone: existing.bot_phone || null,
                  banned: u.banned === true || u.is_banned === true || existing.banned || false,
                  last_seen: existing.last_seen || null
                });
              }
            });
          }

          let allUsers = Array.from(userMap.values());
          if (filterBotPhone && filterBotPhone !== 'all') {
            allUsers = allUsers.filter(u => !u.bot_phone || u.bot_phone === filterBotPhone);
          }

          const bannedUsers = allUsers.filter(u => u.banned);

          // Build unique list of bots found in DB
          const activeBotsList = Array.from(workersMap.keys());
          if (BOT_PHONE && !activeBotsList.includes(BOT_PHONE)) activeBotsList.push(BOT_PHONE);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            users: allUsers,
            bannedUsers,
            bots: activeBotsList,
            totalBanned: bannedUsers.length,
            totalUsers: allUsers.length
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, users: [], bannedUsers: [], bots: [] }));
        }
        return;
      }

      // ── POST /api/ban-user — ban or unban a user by phone number ──
      if (endpoint === 'ban-user' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { phone, ban, bot_phone } = JSON.parse(body || '{}');
            if (!phone) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'phone is required' }));
              return;
            }
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const cleanBotPhone = (bot_phone || '').replace(/[^0-9]/g, '');
            const targetJid = cleanPhone + '@s.whatsapp.net';
            const isBanned = Boolean(ban);

            // 1. Update in-memory DB
            if (global.db?.data?.users) {
              if (!global.db.data.users[targetJid]) {
                global.db.data.users[targetJid] = { banned: isBanned };
              } else {
                global.db.data.users[targetJid].banned = isBanned;
              }
            }

            // 2. Upsert to Supabase bot_users
            const payload = { jid: targetJid, phone_number: cleanPhone, is_banned: isBanned };
            if (cleanBotPhone) payload.bot_phone = cleanBotPhone;

            await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users', {
              method: 'POST',
              headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify([payload])
            }).catch(() => {});

            console.log(`🔒 User +${cleanPhone} ban status updated to: ${isBanned} (bot: +${cleanBotPhone || 'all'})`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, phone: cleanPhone, banned: isBanned, bot_phone: cleanBotPhone }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }


      // ── POST /api/broadcast — send broadcast to all users ──
      if (endpoint === 'broadcast' && req.method === 'POST') {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          try {
            // Parse multipart manually (simple boundary parse for text field)
            const raw = Buffer.concat(chunks).toString('utf8');
            let text = '';
            // Extract text field from multipart
            const textMatch = raw.match(/name="text"\r\n\r\n([\s\S]*?)(?=\r\n--)/);
            if (textMatch) text = textMatch[1].trim();
            if (!text) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'لا توجد رسالة' }));
              return;
            }

            // Get all registered users from Supabase bot_users table first, then fallback to global.db
            let users = [];
            try {
              const uFetch = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users?select=jid,phone_number', {
                headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
              });
              const uRows = await uFetch.json();
              if (Array.isArray(uRows)) {
                users = uRows.map(r => r.jid || (r.phone_number ? r.phone_number + '@s.whatsapp.net' : null)).filter(Boolean);
              }
            } catch (_) {}

            if (!users.length && global.db?.data?.users) {
              users = Object.keys(global.db.data.users);
            }

            let sent = 0;
            res.writeHead(200, { 'Content-Type': 'application/json' });

            (async () => {
              for (const jid of users) {
                try {
                  if (!jid || jid.includes('@broadcast') || jid.includes('@newsletter')) continue;
                  const activeW = getActiveWorker();
                  if (activeW) {
                    const formattedText = 
`📌 *إشعار هام من المطور* 👨‍💻
━━━━━━━━━━━━━━━━━━━━━

${text}

━━━━━━━━━━━━━━━━━━━━━
🤖 *bot amirni hamza • حمزة اعمرني*
📢 *القناة الرسمية:* https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p
📸 *إنستغرام:* https://www.instagram.com/hamza_amirni_01`;

                    activeW.postMessage({ type: 'send_msg', jid: jid, text: formattedText });
                    sent++;
                    await new Promise(r => setTimeout(r, 600));
                  }
                } catch (_) {}
              }
              // Log to Supabase
              await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/broadcasts', {
                method: 'POST',
                headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ text, sent_count: sent, failed_count: 0, total_count: users.length, sent_by: 'dashboard', created_at: new Date().toISOString() })
              }).catch(() => {});
              console.log(`[Broadcast] Posted ${sent} broadcast messages to WhatsApp`);
            })();

            res.end(JSON.stringify({ sent: users.length, failed: 0, total: users.length, status: 'sending' }));
          } catch (err) {
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
            }
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (endpoint === 'errors') {
        const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/error_logs?select=*&order=created_at.desc&limit=50', {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const data = await fetchRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
        return;
      }

      if (endpoint === 'sendmsg' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/dev_messages', {
              method: 'POST',
              headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(payload)
            });
            const data = await fetchRes.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // ── GET /api/user-chat-history — get chat history for a specific user ──
      if (endpoint === 'user-chat-history' && req.method === 'GET') {
        try {
          const phone = req.url.split('phone=')[1]?.split('&')[0] || '';
          if (!phone) throw new Error('رقم الهاتف مطلوب');
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const targetJid = cleanPhone + '@s.whatsapp.net';

          // 1. Fetch from dev_messages
          const devRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/dev_messages?sender_phone=eq.${cleanPhone}&order=timestamp.asc`, {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
          });
          const devMsgs = await devRes.json();

          // 2. Fetch from ai_memory
          const aiRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?jid=eq.${encodeURIComponent(targetJid)}&limit=1`, {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
          });
          const aiData = await aiRes.json();
          const aiHistory = aiData && aiData[0] && Array.isArray(aiData[0].history) ? aiData[0].history : [];

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            phone: cleanPhone,
            jid: targetJid,
            dev_messages: Array.isArray(devMsgs) ? devMsgs : [],
            ai_history: aiHistory
          }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      if (endpoint === 'send-direct' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { phone, text, bot_phone } = JSON.parse(body);
            if (!phone || !text) throw new Error('الرقم والنص مطلوبان');
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const cleanBotPhone = (bot_phone || '').replace(/[^0-9]/g, '');
            const targetJid = cleanPhone + '@s.whatsapp.net';

            // Route through SPECIFIC bot worker if bot_phone provided
            const targetWorker = cleanBotPhone ? getActiveWorker(cleanBotPhone) : getActiveWorker();
            if (targetWorker) {
              const formattedDirect = 
`╭━━━━━━━━━━━━━━━━━━━━━╮
│   💬 *رسالة خاصة من المطور*
│   ⚡ *bot amirni hamza*
╰━━━━━━━━━━━━━━━━━━━━━╯

👨‍💻 *حمزة اعمرني — Hamza Amirni*
━━━━━━━━━━━━━━━━━━━━━

${text}

━━━━━━━━━━━━━━━━━━━━━
📸 *Instagram:* @hamza_amirni_01
📢 *قناة الواتساب:* https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p
╰━━━━━━━━━━━━━━━━━━━━━╯`;
              targetWorker.postMessage({ type: 'send_msg', jid: targetJid, text: formattedDirect });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, jid: targetJid, bot_phone: cleanBotPhone || 'default' }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (endpoint === 'reply' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { id, reply_text } = JSON.parse(body);
            const fetchRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/dev_messages?id=eq.${id}`, {
              method: 'PATCH',
              headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                replied: true,
                reply_text: reply_text,
                reply_timestamp: new Date().toISOString()
              })
            });

            // Post reply message to worker thread so Baileys sends reply live to WhatsApp from the EXACT receiving bot
            if (id) {
              try {
                const mRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/dev_messages?id=eq.${id}&select=sender_jid,sender_phone,bot_phone`, {
                  headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
                });
                const mRows = await mRes.json();
                if (mRows && mRows[0]) {
                  const rJid = mRows[0].sender_jid || (mRows[0].sender_phone ? mRows[0].sender_phone + '@s.whatsapp.net' : null);
                  const botPhone = mRows[0].bot_phone || null;
                  const targetWorker = getActiveWorker(botPhone);
                  if (rJid && targetWorker) {
                    const formattedReply =
`╭━━━━━━━━━━━━━━━━━━━━━╮
│   📣 *رسالة من المطور*
│   ⚡ *bot amirni hamza*
╰━━━━━━━━━━━━━━━━━━━━━╯

👨‍💻 *حمزة اعمرني — Hamza Amirni*
━━━━━━━━━━━━━━━━━━━━━

${reply_text}

━━━━━━━━━━━━━━━━━━━━━
📸 *Instagram:* @hamza_amirni_01
📢 *قناة الواتساب:* https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p
╰━━━━━━━━━━━━━━━━━━━━━╯`;
                    targetWorker.postMessage({ type: 'send_msg', jid: rJid, text: formattedReply });
                  }
                }
              } catch (_) {}
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if ((endpoint === 'requestpair' || endpoint === 'set-phone') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            const rawPhone = payload.phone_number || payload.pairingNumber;
            if (!rawPhone) throw new Error('رقم الهاتف مطلوب');
            const cleanPhone = rawPhone.toString().replace(/[^0-9]/g, '');

            // 1. Stop worker for cleanPhone if already running
            stopBotWorker(cleanPhone);

            // 2. Clear specific session folder for cleanPhone
            try {
              const specificDir = getBotSessionDir(cleanPhone);
              if (existsSync(specificDir)) {
                rmSync(specificDir, { recursive: true, force: true });
              }
            } catch (_) {}

            // 3. Insert/update requesting entry for cleanPhone in Supabase
            await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth', {
              method: 'POST',
              headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify({
                phone_number: cleanPhone,
                session_data: null,
                pairing_code: null,
                status: 'requesting',
                updated_at: new Date().toISOString()
              })
            }).catch(() => {});

            console.log(`📱 Requesting fresh pairing code for phone: +${cleanPhone}. Spawning worker...`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, phone_number: cleanPhone }));

            setTimeout(() => startBotWorker(cleanPhone, true), 1000);
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }
      
      // ── GET /api/settings — read bot config ──────────────
      if (endpoint === 'settings' && req.method === 'GET') {
        const cfg = {};
        try {
          const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_configs?select=key,value', {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
          });
          if (fetchRes.ok) {
            const rows = await fetchRes.json();
            if (Array.isArray(rows)) rows.forEach(r => { cfg[r.key] = r.value; });
          }
        } catch (_) {}

        // Fallback: fill from live globals if not found in DB
        if (cfg.auto_ai === undefined) cfg.auto_ai = String(global.AUTO_AI !== undefined ? global.AUTO_AI : true);
        if (cfg.auto_read === undefined) cfg.auto_read = String(global.AUTO_READ !== undefined ? global.AUTO_READ : true);
        if (cfg.auto_status_read === undefined) cfg.auto_status_read = String(global.AUTO_STATUS_READ !== undefined ? global.AUTO_STATUS_READ : true);
        if (cfg.anti_call === undefined) cfg.anti_call = String(global.ANTI_CALL !== undefined ? global.ANTI_CALL : false);
        if (cfg.silent_mode === undefined) cfg.silent_mode = String(global.SILENT_MODE !== undefined ? global.SILENT_MODE : false);
        if (cfg.auto_online === undefined) cfg.auto_online = String(global.AUTO_ONLINE !== undefined ? global.AUTO_ONLINE : true);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cfg));
        return;
      }

      // ── POST /api/settings — save bot config ──────────────
      if (endpoint === 'settings' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const settings = JSON.parse(body); // { key: value, ... }
            
            // 1. Try saving to bot_configs table
            try {
              const rows = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
              await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_configs', {
                method: 'POST',
                headers: {
                  'apikey': SB_KEY,
                  'Authorization': 'Bearer ' + SB_KEY,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(rows)
              });
            } catch (_) {}

            // 2. Dual backup save to ai_memory config rows (inline)
            for (const [k, v] of Object.entries(settings)) {
              fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
                method: 'POST',
                headers: {
                  'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
                  'Content-Type': 'application/json',
                  'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify([{ jid: 'config_' + k, history: String(v) }])
              }).catch(() => {});
            }

            // 3. Update global vars if bot is running
            if (settings.apk_daily_limit !== undefined) global.APK_DAILY_LIMIT = parseInt(settings.apk_daily_limit);
            if (settings.default_user_limit !== undefined) global.DEFAULT_USER_LIMIT = parseInt(settings.default_user_limit);
            if (settings.bot_name) global.namebot = settings.bot_name;
            if (settings.auto_read !== undefined) global.AUTO_READ = (settings.auto_read === 'true' || settings.auto_read === true);
            if (settings.auto_status_read !== undefined) global.AUTO_STATUS_READ = (settings.auto_status_read === 'true' || settings.auto_status_read === true);
            if (settings.anti_call !== undefined) global.ANTI_CALL = (settings.anti_call === 'true' || settings.anti_call === true);
            if (settings.silent_mode !== undefined) global.SILENT_MODE = (settings.silent_mode === 'true' || settings.silent_mode === true);
            if (settings.auto_online !== undefined) global.AUTO_ONLINE = (settings.auto_online === 'true' || settings.auto_online === true);
            if (settings.auto_ai !== undefined) global.AUTO_AI = (settings.auto_ai === 'true' || settings.auto_ai === true);

            // Broadcast settings to all active worker threads
            for (const [_, info] of workersMap.entries()) {
              if (info.worker) {
                info.worker.postMessage({ type: 'update_configs', settings });
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, saved: Object.keys(settings) }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // ── GET /api/active-servers — list all active server nodes ────────
      if (endpoint === 'active-servers' && req.method === 'GET') {
        try {
          const resSup = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?jid=like.server_node_*&select=history', {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
          });
          const activeServers = [];
          if (resSup.ok) {
            const rows = await resSup.json();
            const now = Date.now();
            if (Array.isArray(rows)) {
              rows.forEach(r => {
                try {
                  const data = JSON.parse(r.history || '{}');
                  if (data.last_ping && (now - data.last_ping < 45000)) {
                    activeServers.push(data);
                  }
                } catch (_) {}
              });
            }
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            count: activeServers.length,
            current_instance: SERVER_INSTANCE_ID,
            servers: activeServers
          }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      // ── POST /api/user-limit — update specific user's command limit ──
      if (endpoint === 'user-limit' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { phone, limit } = JSON.parse(body || '{}');
            if (!phone) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'phone is required' }));
              return;
            }
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const targetJid = cleanPhone + '@s.whatsapp.net';
            const parsedLimit = parseInt(limit);

            // 1. Update in-memory DB if available
            if (global.db?.data?.users) {
              if (!global.db.data.users[targetJid]) {
                global.db.data.users[targetJid] = { limit: parsedLimit };
              } else {
                global.db.data.users[targetJid].limit = parsedLimit;
              }
            }

            // 2. Update Supabase bot_users table
            await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users', {
              method: 'POST',
              headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify([{
                jid: targetJid,
                phone_number: cleanPhone,
                limit: parsedLimit,
                updated_at: new Date().toISOString()
              }])
            }).catch(() => {});

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, phone: cleanPhone, limit: parsedLimit }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // ── POST /api/restart — restart active bot worker process ──
      if (endpoint === 'restart' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { phone_number } = JSON.parse(body || '{}');
            const activePhone = (phone_number || getBotPhone()).toString().replace(/[^0-9]/g, '');
            stopBotWorker(activePhone);
            setTimeout(() => startBotWorker(activePhone), 1500);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Bot +${activePhone} restarting...` }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // ── POST /api/resetsession — clear session & restart bot ──
      if (endpoint === 'resetsession' && req.method === 'POST') {
        try {
          const body = JSON.parse(await new Promise(r => req.on('data', c => r(c.toString()))));
          const activePhone = (body.phone_number || BOT_PHONE).toString().replace(/[^0-9]/g, '');
          
          // 1. Stop worker
          stopBotWorker(activePhone);

          // 2. Delete local session folder
          try {
            const specificDir = getBotSessionDir(activePhone);
            if (existsSync(specificDir)) {
              rmSync(specificDir, { recursive: true, force: true });
            }
          } catch (_) {}
          
          // 3. Clear session in Supabase
          await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth', {
            method: 'POST',
            headers: {
              'apikey': SB_KEY,
              'Authorization': 'Bearer ' + SB_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              phone_number: activePhone,
              session_data: null,
              pairing_code: null,
              status: 'logged_out',
              updated_at: new Date().toISOString()
            })
          });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Session cleared. Bot restarting...' }));
          setTimeout(() => startBotWorker(activePhone, true), 2000);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // ── GET /api/pairingcode — get current pairing code & QR ──
      if (endpoint === 'pairingcode' && req.method === 'GET') {
        try {
          const parsedUrl = new URL(req.url, 'http://localhost');
          const qPhone = parsedUrl.searchParams.get('phone') ? parsedUrl.searchParams.get('phone').replace(/[^0-9]/g, '') : null;
          
          if (qPhone && workersMap.has(qPhone)) {
            const info = workersMap.get(qPhone);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: info.connected ? 'connected' : 'requesting',
              pairing_code: info.pairingCode,
              qr_code: info.pairingCode ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(info.pairingCode)}` : null,
              phone_number: qPhone
            }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'unknown', pairing_code: null }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // ── POST /api/delete-session — delete specific old session from Supabase ──
      if (endpoint === 'delete-session' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { phone_number } = JSON.parse(body || '{}');
            if (!phone_number) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing phone_number' }));
              return;
            }
            const cleanPhone = phone_number.toString().replace(/[^0-9]/g, '');
            
            // 1. Stop worker
            stopBotWorker(cleanPhone);

            // 2. Delete from Supabase
            await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth?phone_number=eq.${cleanPhone}`, {
              method: 'DELETE',
              headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY
              }
            });
            console.log(`🗑️ Deleted session for +${cleanPhone} from Supabase and stopped worker`);

            // 3. Delete session folder
            try {
              const specificDir = getBotSessionDir(cleanPhone);
              if (existsSync(specificDir)) {
                rmSync(specificDir, { recursive: true, force: true });
              }
            } catch (_) {}

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, deleted: cleanPhone }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }


      // ── GET /api/bot-status — return current bot state ──
      if (endpoint === 'bot-status') {
        const statuses = [];
        for (const [phone, info] of workersMap.entries()) {
          statuses.push({ phone, connected: info.connected });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ bots: statuses }));
        return;
      }

      // ── Supabase Cloud Config Helper ──────────────────────
      const getConfigsFromSupabase = async () => {
        try {
          const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?jid=like.config_*&select=jid,history', {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
          });
          if (!res.ok) return {};
          const rows = await res.json();
          const cfg = {};
          if (Array.isArray(rows)) rows.forEach(r => {
            const key = r.jid.replace('config_', '');
            cfg[key] = r.history;
          });
          return cfg;
        } catch (_) { return {}; }
      };

      const saveConfigToSupabase = async (key, val) => {
        try {
          const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
            method: 'POST',
            headers: {
              'apikey': SB_KEY,
              'Authorization': 'Bearer ' + SB_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify([{ jid: 'config_' + key, history: strVal }])
          });
        } catch (_) {}
      };

      // ── GET /api/bot-mode — return current mode & admins from Supabase ──
      if (endpoint === 'bot-mode' && req.method === 'GET') {
        try {
          const cfg = await getConfigsFromSupabase();
          let mode = cfg.bot_mode || 'public';
          let admins = [];
          try { admins = JSON.parse(cfg.bot_admins || '[]'); } catch (_) {}

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ mode, admins }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // ── POST /api/bot-mode — change mode & save to Supabase ──
      if (endpoint === 'bot-mode' && req.method === 'POST') {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', async () => {
          try {
            const { mode } = JSON.parse(body);
            const VALID = ['public', 'private', 'admin', 'group'];
            if (!VALID.includes(mode)) throw new Error('Invalid mode');

            await saveConfigToSupabase('bot_mode', mode);
            const w = getActiveWorker();
            if (w) w.postMessage({ type: 'set_bot_mode', mode });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, mode }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // ── GET /api/bot-admins — list admins from Supabase ──
      if (endpoint === 'bot-admins' && req.method === 'GET') {
        try {
          const cfg = await getConfigsFromSupabase();
          let admins = [];
          try { admins = JSON.parse(cfg.bot_admins || '[]'); } catch (_) {}
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ admins }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // ── POST /api/bot-admins — add admin & save to Supabase ──
      if (endpoint === 'bot-admins' && req.method === 'POST') {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', async () => {
          try {
            const { phone } = JSON.parse(body);
            if (!phone) throw new Error('phone required');
            const jid = phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

            const cfg = await getConfigsFromSupabase();
            let admins = [];
            try { admins = JSON.parse(cfg.bot_admins || '[]'); } catch (_) {}
            if (!admins.includes(jid)) {
              admins.push(jid);
              await saveConfigToSupabase('bot_admins', admins);
            }

            const w = getActiveWorker();
            if (w) w.postMessage({ type: 'add_bot_admin', jid });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, jid }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // ── DELETE /api/bot-admins — remove admin & save to Supabase ──
      if (endpoint === 'bot-admins' && req.method === 'DELETE') {
        let body = '';
        req.on('data', c => { body += c; });
        req.on('end', async () => {
          try {
            const { jid } = JSON.parse(body);
            if (!jid) throw new Error('jid required');

            const cfg = await getConfigsFromSupabase();
            let admins = [];
            try { admins = JSON.parse(cfg.bot_admins || '[]'); } catch (_) {}
            const idx = admins.indexOf(jid);
            if (idx !== -1) {
              admins.splice(idx, 1);
              await saveConfigToSupabase('bot_admins', admins);
            }

            const w = getActiveWorker();
            if (w) w.postMessage({ type: 'remove_bot_admin', jid });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, jid }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // ── GET /api/bots-list — List all connected/registered bots ──
      if (endpoint === 'bots-list' && req.method === 'GET') {
        try {
          const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth?select=phone_number,status,updated_at&order=updated_at.desc', {
            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
          });
          const rows = await fetchRes.json() || [];
          const botMap = new Map();
          for (let r of rows) {
            const clean = (r.phone_number || '').replace(/[^0-9]/g, '');
            if (!clean || botMap.has(clean)) continue;
            const wInfo = workersMap.get(clean);
            botMap.set(clean, {
              phone_number: clean,
              connected: wInfo ? wInfo.connected : (r.status === 'connected'),
              last_active: r.updated_at
            });
          }
          if (BOT_PHONE && !botMap.has(BOT_PHONE)) {
            const wInfo = workersMap.get(BOT_PHONE);
            botMap.set(BOT_PHONE, {
              phone_number: BOT_PHONE,
              connected: wInfo ? wInfo.connected : false,
              last_active: new Date().toISOString()
            });
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ bots: Array.from(botMap.values()) }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // ── GET /api/bot-details — Get stats, users, and inbox specific to a single bot ──
      if (endpoint === 'bot-details' && req.method === 'GET') {
        try {
          const reqUrl = new URL(req.url, 'http://localhost');
          const phone = (reqUrl.searchParams.get('phone') || '').replace(/[^0-9]/g, '');
          if (!phone) throw new Error('phone parameter is required');

          const wInfo = workersMap.get(phone);
          const isConnected = wInfo ? wInfo.connected : false;

          // 1. Fetch users for this bot from bot_users table
          let userRows = [];
          try {
            const uRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users?select=*&order=last_seen.desc&limit=50`, {
              headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
            });
            const allUsers = await uRes.json();
            if (Array.isArray(allUsers)) {
              const specific = allUsers.filter(u => !u.bot_phone || u.bot_phone === phone);
              userRows = specific.length > 0 ? specific : allUsers;
            }
          } catch (_) {}

          // 2. Fetch dev messages received specifically by this bot
          let devMsgs = [];
          try {
            const dRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/dev_messages?select=*&order=timestamp.desc&limit=30`, {
              headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
            });
            const allDev = await dRes.json();
            if (Array.isArray(allDev)) {
              const specificDev = allDev.filter(d => !d.bot_phone || d.bot_phone === phone);
              devMsgs = specificDev.length > 0 ? specificDev : allDev;
            }
          } catch (_) {}

          // 3. Fetch top commands & stats
          let topCmds = [];
          let totalMsgs = 0;
          try {
            const stRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_stats?select=*&limit=1', {
              headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
            });
            const stData = await stRes.json();
            if (stData && stData[0]) {
              topCmds = stData[0].top_commands || [];
              totalMsgs = stData[0].messages_handled || 0;
            }
          } catch (_) {}

          // 4. Fetch bot mode
          const cfg = await getConfigsFromSupabase();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            phone: phone,
            connected: isConnected,
            mode: cfg.bot_mode || 'public',
            total_users: userRows.length,
            messages_handled: totalMsgs,
            users: userRows,
            dev_messages: devMsgs,
            top_commands: topCmds
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }



      // ── POST /api/auth-login — username/password dashboard login ──
      if (endpoint === 'auth-login' && req.method === 'POST') {
        try {
          const body = await new Promise((resolve) => {
            let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(JSON.parse(d || '{}')));
          });
          const { username, password } = body;
          if (!username || !password) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'بيانات ناقصة' }));
            return;
          }
          // Check Supabase access_requests for approved user
          const qRes = await fetch(
            `https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/access_requests?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&status=eq.approved&select=id&limit=1`,
            { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
          );
          const rows = await qRes.json();
          // Also allow master admin credentials from env
          const masterUser = process.env.ADMIN_USER || 'admin';
          const masterPass = process.env.ADMIN_PASS || 'hamza2026';
          if ((rows && rows.length > 0) || (username === masterUser && password === masterPass)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'اسم المستخدم أو كلمة المرور خاطئة' }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // ── GET /api/access-requests — check request by phone or get all ──
      if (endpoint === 'access-requests' && req.method === 'GET') {
        try {
          const phone = req.url.split('phone=')[1]?.split('&')[0] || '';
          if (phone) {
            // Check single request by phone
            const qRes = await fetch(
              `https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/access_requests?phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=1`,
              { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
            );
            const rows = await qRes.json();
            if (!rows || !rows.length) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'not found' }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(rows[0]));
            }
          } else {
            // Get all requests (admin)
            const qRes = await fetch(
              'https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/access_requests?select=*&order=created_at.desc&limit=100',
              { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
            );
            const rows = await qRes.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(Array.isArray(rows) ? rows : []));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // ── POST /api/access-requests — submit new request ──
      if (endpoint === 'access-requests' && req.method === 'POST') {
        try {
          const body = await new Promise((resolve) => {
            let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(JSON.parse(d || '{}')));
          });
          const { name, phone, reason } = body;
          if (!name || !phone) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'الاسم والرقم مطلوبان' }));
            return;
          }
          // Check if already requested
          const checkRes = await fetch(
            `https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/access_requests?phone=eq.${encodeURIComponent(phone)}&status=eq.pending&select=id&limit=1`,
            { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
          );
          const existing = await checkRes.json();
          if (existing && existing.length > 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'طلبك قيد المراجعة بالفعل' }));
            return;
          }
          // Insert new request
          const insertRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/access_requests', {
            method: 'POST',
            headers: {
              'apikey': SB_KEY,
              'Authorization': 'Bearer ' + SB_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ name, phone, reason: reason || '', status: 'pending', created_at: new Date().toISOString() })
          });
          if (insertRes.ok || insertRes.status === 201) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            const errData = await insertRes.text();
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'فشل الحفظ: ' + errData }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // ── PATCH /api/access-requests — approve or reject ──
      if (endpoint === 'access-requests' && req.method === 'PATCH') {
        try {
          const body = await new Promise((resolve) => {
            let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(JSON.parse(d || '{}')));
          });
          const { id, action } = body; // action: 'approve' | 'reject'
          if (!id || !action) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'id and action required' }));
            return;
          }
          let updateData = { status: action === 'approve' ? 'approved' : 'rejected', updated_at: new Date().toISOString() };
          if (action === 'approve') {
            // Auto-generate credentials
            const reqRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/access_requests?id=eq.${id}&select=name,phone&limit=1`, {
              headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
            });
            const reqRows = await reqRes.json();
            const reqRow = reqRows?.[0] || {};
            const baseName = (reqRow.name || 'user').replace(/\s+/g, '').toLowerCase().substring(0, 10);
            const randNum = Math.floor(1000 + Math.random() * 9000);
            const randPass = Math.random().toString(36).substring(2, 8).toUpperCase() + randNum;
            updateData.username = baseName + randNum;
            updateData.password = randPass;
          }
          const patchRes = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/access_requests?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SB_KEY,
              'Authorization': 'Bearer ' + SB_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData)
          });
          const updated = await patchRes.json();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, data: updated?.[0] || updateData }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
      return;
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
      return;
    }
  }

  // Serve add-number.html for root '/' — pairing page for new users
  let filePath;
  if (req.url === '/') {
    filePath = join(__dirname, 'public', 'add-number.html');
  } else {
    filePath = join(__dirname, 'public', req.url.split('?')[0]);
  }
  if (!existsSync(filePath) || req.url.includes('..')) {
    filePath = join(__dirname, 'public', 'add-number.html');
  }
  try {
    const data = readFileSync(filePath);
    let contentType = 'text/html';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    else if (filePath.endsWith('.css')) contentType = 'text/css';
    else if (filePath.endsWith('.json')) contentType = 'application/json';
    else if (filePath.endsWith('.png')) contentType = 'image/png';
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filePath.endsWith('.ico')) contentType = 'image/x-icon';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}).listen(PORT, () => {
  console.log(`📡 Health check & dashboard server listening on port ${PORT}`);
});

const rl = readline.createInterface(process.stdin, process.stdout);

// ── Multi-Bot Engine: Active Workers Map (phone -> WorkerInfo) ─────────────────
const workersMap = new Map();

function getActiveWorker(phone) {
  if (phone) {
    const clean = phone.toString().replace(/[^0-9]/g, '');
    if (workersMap.has(clean)) return workersMap.get(clean).worker;
  }
  for (const info of workersMap.values()) {
    if (info.worker && info.connected) return info.worker;
  }
  const first = workersMap.values().next().value;
  return first ? first.worker : null;
}

const stoppedWorkers = new Set();

function stopBotWorker(phone) {
  const clean = (phone || '').toString().replace(/[^0-9]/g, '');
  if (!clean) return;
  stoppedWorkers.add(clean);
  if (workersMap.has(clean)) {
    const info = workersMap.get(clean);
    if (info.worker) {
      try { info.worker.terminate(); } catch (_) {}
    }
    workersMap.delete(clean);
    console.log(`🛑 Stopped worker for bot: +${clean}`);
  }
}

function startBotWorker(phone, isManual = false) {
  const cleanPhone = (phone || BOT_PHONE).toString().replace(/[^0-9]/g, '');
  if (!cleanPhone || cleanPhone.length < 10) return null;

  if (!global._launchBlockedUntil) global._launchBlockedUntil = {};
  if (isManual) {
    stoppedWorkers.delete(cleanPhone);
    delete global._launchBlockedUntil[cleanPhone];
  } else if (stoppedWorkers.has(cleanPhone)) {
    console.log(`🛑 Worker +${cleanPhone} is marked as deleted/stopped. Skipping launch.`);
    return null;
  } else if (global._launchBlockedUntil[cleanPhone] && global._launchBlockedUntil[cleanPhone] > Date.now()) {
    const remainingSec = Math.round((global._launchBlockedUntil[cleanPhone] - Date.now()) / 1000);
    console.log(`⏸️ [+${cleanPhone}] Stream Conflict Backoff: Blocking launch for another ${remainingSec}s...`);
    return null;
  }

  if (workersMap.has(cleanPhone)) {
    const existing = workersMap.get(cleanPhone);
    if (existing.worker) return existing.worker;
  }

  const sessionDir = `./sessions/session_${cleanPhone}`;
  const full = join(__dirname, 'main.js');

  console.log(`🚀 Spawning worker thread for bot: +${cleanPhone}`);

  const w = new Worker(full, {
    stdout: true,
    stderr: true,
    env: {
      ...process.env,
      PAIRING_NUMBER: cleanPhone,
      SESSION_FOLDER: sessionDir,
      UV_THREADPOOL_SIZE: '16'
    }
  });

  const botInfo = {
    worker: w,
    phone: cleanPhone,
    connected: false,
    pairingCode: null,
    lastActivity: Date.now()
  };
  workersMap.set(cleanPhone, botInfo);

  w.stdout.on('data', (chunk) => {
    botInfo.lastActivity = Date.now();
    const chunkStr = chunk.toString();

    // Capture pairing code for this worker
    const pairingMatch = chunkStr.match(/Your Pairing Code\s*:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/i) ||
                         chunkStr.match(/([A-Z0-9]{4}-[A-Z0-9]{4})/);
    if (pairingMatch) {
      const code = pairingMatch[1];
      botInfo.pairingCode = code;
      console.log(`📡 Captured Pairing Code: ${code} for phone +${cleanPhone}`);
      fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth', {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({ phone_number: cleanPhone, pairing_code: code, status: 'requesting', updated_at: new Date().toISOString() })
      }).catch(() => {});
    }

    const silencePatterns = ['Closing open session', 'Closing session', 'SessionEntry', 'No session record', 'Bad MAC'];
    if (silencePatterns.some(p => chunkStr.includes(p))) return;

    const isConnectEvent = chunkStr.includes('Tersambung') ||
                           chunkStr.includes('🟢 الحالة: نشط') ||
                           chunkStr.includes('متصل ✅') ||
                           chunkStr.includes('في انتظار الرسائل');

    if (isConnectEvent) {
      botInfo.connected = true;
      // Instantly backup session on every connection event — keep it always fresh
      backupSessionForPhone(cleanPhone, true);
      // Also backup after 30s in case creds file updated after handshake
      setTimeout(() => backupSessionForPhone(cleanPhone, true), 30000);
    }

    const translated = chunkStr
      .replace(/Mengaktifkan Bot,?\s*Mohon tunggu sebentar\.*/gi, `⚡ تشغيل [+${cleanPhone}]...`)
      .replace(/Menunggu Pesan Baru/gi, `📨 [+${cleanPhone}] في انتظار الرسائل`)
      .replace(/Status Aktif/gi, `🟢 الحالة: نشط [+${cleanPhone}]`)
      .replace(/Tersambung/gi, `متصل ✅ [+${cleanPhone}]`);

    process.stdout.write(translated);
  });

  w.stderr.on('data', (chunk) => {
    const chunkStr = chunk.toString();

    const silencePatterns = ['Closing open session', 'Closing session', 'SessionEntry', 'No session record', 'Bad MAC', 'Timed Out', 'Connection Closed', 'Precondition Required', 'MaxListenersExceededWarning', 'socket hang up'];
    if (!silencePatterns.some(p => chunkStr.includes(p))) {
      process.stderr.write(`[+${cleanPhone}] ${chunkStr}`);
    }
  });

  // Track conflict detection via GLOBAL map — survives across worker restarts
  if (!global._workerConflicts) global._workerConflicts = {};
  if (!global._workerRestarts)  global._workerRestarts  = {};
  if (!global._workerRestarts[cleanPhone])  global._workerRestarts[cleanPhone]  = 0;
  if (!global._workerConflicts[cleanPhone]) global._workerConflicts[cleanPhone] = 0;

  w.stdout.on('data', (chunk) => {
    const s = chunk.toString();
    if (s.includes('Stream Errored (conflict)') || s.includes('Conflict')) {
      global._workerConflicts[cleanPhone] = Date.now();
      global._workerRestarts[cleanPhone]  = (global._workerRestarts[cleanPhone] || 0) + 1;
      console.log(`⚠️ [+${cleanPhone}] Stream conflict! Another session is open. Blocking reconnect for 90s...`);
    }
  });

  w.on('exit', (code) => {
    console.log(`🛑 Worker for +${cleanPhone} exited (code ${code})`);
    workersMap.delete(cleanPhone);

    if (stoppedWorkers.has(cleanPhone)) {
      console.log(`🛑 Worker +${cleanPhone} was manually stopped. Skipping auto-restart.`);
      return;
    }

    const now = Date.now();
    const lastConflict = global._workerConflicts[cleanPhone] || 0;
    const restartCount = global._workerRestarts[cleanPhone] || 0;

    // If conflict happened recently → hard block for 90s + escalating wait
    const isRecentConflict = (now - lastConflict) < 15000;
    let delayMs;
    if (isRecentConflict) {
      // Session conflict: escalate wait time — NEVER delete the session!
      // After many conflicts, wait longer for the old WhatsApp session to expire naturally.
      // Koyeb old container takes a few minutes to fully shut down.
      if (restartCount >= 6) {
        // Too many conflicts — wait 15 minutes then retry with same session
        delayMs = 900000; // 15 minutes
        console.log(`⏰ [+${cleanPhone}] Too many conflicts (${restartCount}x). Waiting 15 min for old session to expire...`);
      } else {
        // Escalating: 2min → 4min → 6min → 8min → 10min → 12min
        delayMs = Math.min(120000 + restartCount * 120000, 720000);
        console.log(`🚫 [+${cleanPhone}] CONFLICT — waiting ${Math.round(delayMs/1000/60)}min for old session to expire (attempt ${restartCount+1}/6)...`);
      }
    } else {
      // Normal disconnect: 5s → 7.5s → 11s … max 45s
      delayMs = Math.min(5000 * Math.pow(1.5, Math.min(restartCount, 6)), 45000);
    }

    global._workerRestarts[cleanPhone] = restartCount + 1;
    global._launchBlockedUntil[cleanPhone] = Date.now() + delayMs;

    // Reset conflict + restart counters after 10 minutes of no conflicts
    setTimeout(() => {
      if (Date.now() - (global._workerConflicts[cleanPhone] || 0) >= 600000) {
        global._workerRestarts[cleanPhone]  = 0;
        global._workerConflicts[cleanPhone] = 0;
      }
    }, 600000);

    setTimeout(() => {
      if (stoppedWorkers.has(cleanPhone)) {
        console.log(`🛑 Worker +${cleanPhone} deleted during delay. Skipping restart.`);
        return;
      }
      console.log(`🔄 Restarting worker for +${cleanPhone} (attempt ${restartCount + 1}, waited ${Math.round(delayMs/1000)}s)...`);
      startBotWorker(cleanPhone);
    }, delayMs);
  });

  return w;
}

async function restoreAllSessions() {
  console.log(`☁️ Restoring all connected sessions from Supabase...`);
  try {
    const res = await fetch(
      `https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth?select=session_data,phone_number,status&order=updated_at.desc&limit=50`,
      { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
    );
    if (!res.ok) return;
    const rows = await res.json();

    let count = 0;
    const seenPhones = new Set();
    for (const r of rows) {
      if (r.phone_number && r.session_data && r.status === 'connected') {
        const cleanP = r.phone_number.toString().replace(/[^0-9]/g, '');
        if (cleanP.length < 10 || seenPhones.has(cleanP)) continue;
        seenPhones.add(cleanP);

        const buffer = Buffer.from(r.session_data, 'base64');
        if (buffer.length > 5000) {
          const targetDir = getBotSessionDir(cleanP);
          const targetDb = getBotDbPath(cleanP);
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(targetDb, buffer);
          console.log(`✅ Restored session files for +${cleanP}`);

          // Spawn worker thread for this connected bot if not already running!
          if (!workersMap.has(cleanP)) {
            startBotWorker(cleanP);
            count++;
          }
        }
      }
    }

    if (count === 0) {
      console.log(`ℹ️ No active connected sessions in Supabase. Spawning default bot +${BOT_PHONE}...`);
      startBotWorker(BOT_PHONE);
    } else {
      console.log(`🚀 Multi-Bot Engine: ${count} connected bot(s) running simultaneously!`);
    }
  } catch (err) {
    console.error('❌ Error restoring sessions from Supabase:', err.message);
  }
}

const lastBackupTimes = new Map();

async function backupSessionForPhone(phone, force = false) {
  try {
    const clean = (phone || '').toString().replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) return;

    const now = Date.now();
    const last = lastBackupTimes.get(clean) || 0;
    if (!force && (now - last < 2 * 60 * 1000)) return; // throttle: max once per 2min

    const phoneDbPath = getBotDbPath(clean);
    if (!existsSync(phoneDbPath)) return;

    const content = readFileSync(phoneDbPath);
    if (content.length < 5000) return;

    lastBackupTimes.set(clean, now);

    const base64 = content.toString('base64');
    const payload = {
      phone_number: clean,
      session_data: base64,
      pairing_code: null,
      status: 'connected',
      updated_at: new Date().toISOString()
    };

    const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth', {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      console.log(`☁️ Session backed up to Supabase for +${clean}`);
    }
  } catch (err) {
    console.error(`❌ Error backing up session for +${phone}:`, err.message);
  }
}

function startBackupWatcher() {
  if (backupWatcherStarted) return;
  backupWatcherStarted = true;
  console.log('📡 Starting Multi-Bot Supabase session backup watcher...');

  // Backup every 2 minutes for all connected bots
  setInterval(() => {
    for (const [phone, info] of workersMap.entries()) {
      if (info.connected) {
        backupSessionForPhone(phone);
      }
    }
  }, 2 * 60 * 1000);
}

let backupWatcherStarted = false;

async function initStats() {
  try {
    const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_stats?select=id&limit=1', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    const data = await res.json();
    if (!data || data.length === 0) {
      console.log('📊 Stats table is empty, initializing default stats row...');
      const payload = {
        messages_handled: 524,
        total_users: 38,
        visits: 125,
        active_bots: 1,
        ram_usage: '142 MB',
        last_update: new Date().toISOString(),
        top_commands: [
          { "cmd": "play", "count": 48 },
          { "cmd": "apk", "count": 35 },
          { "cmd": "yts", "count": 29 },
          { "cmd": "menu", "count": 52 }
        ]
      };
      
      const insertRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_stats', {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (insertRes.ok) {
        console.log('✅ Default stats row initialized successfully!');
      } else {
        console.error('❌ Failed to initialize default stats row:', await insertRes.text());
      }
    }
  } catch (err) {
    console.error('❌ Error checking/initializing stats:', err.message);
  }
}

async function initGlobalConfigs() {
  try {
    const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_configs?select=key,value', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    if (fetchRes.ok) {
      const rows = await fetchRes.json();
      const cfg = {};
      if (Array.isArray(rows)) rows.forEach(r => { cfg[r.key] = r.value; });

      global.AUTO_READ = cfg.auto_read !== undefined ? (cfg.auto_read === 'true' || cfg.auto_read === true) : true;
      global.AUTO_STATUS_READ = cfg.auto_status_read !== undefined ? (cfg.auto_status_read === 'true' || cfg.auto_status_read === true) : true;
      global.ANTI_CALL = cfg.anti_call !== undefined ? (cfg.anti_call === 'true' || cfg.anti_call === true) : false;
      global.SILENT_MODE = cfg.silent_mode !== undefined ? (cfg.silent_mode === 'true' || cfg.silent_mode === true) : false;
      global.AUTO_ONLINE = cfg.auto_online !== undefined ? (cfg.auto_online === 'true' || cfg.auto_online === true) : true;
      global.AUTO_AI = cfg.auto_ai !== undefined ? (cfg.auto_ai === 'true' || cfg.auto_ai === true) : true;
      global.DEFAULT_USER_LIMIT = cfg.default_user_limit !== undefined ? parseInt(cfg.default_user_limit) : 20;
      global.APK_DAILY_LIMIT = cfg.apk_daily_limit !== undefined ? parseInt(cfg.apk_daily_limit) : 5;
      global.BOT_MODE = cfg.bot_mode || 'public';
      
      console.log('⚙️ Initialized global configs from Supabase:', {
        AUTO_READ: global.AUTO_READ,
        AUTO_STATUS_READ: global.AUTO_STATUS_READ,
        ANTI_CALL: global.ANTI_CALL,
        SILENT_MODE: global.SILENT_MODE,
        AUTO_ONLINE: global.AUTO_ONLINE,
        AUTO_AI: global.AUTO_AI,
        DEFAULT_USER_LIMIT: global.DEFAULT_USER_LIMIT,
        APK_DAILY_LIMIT: global.APK_DAILY_LIMIT,
        BOT_MODE: global.BOT_MODE
      });
    }
  } catch (err) {
    console.error('❌ Failed to load global configs from Supabase:', err.message);
  }
}

const SERVER_INSTANCE_ID = 'node_' + Math.random().toString(36).substring(2, 9);
const SERVER_HOST_TYPE = process.env.KOYEB_SERVICE_NAME ? 'Koyeb Cloud' : (process.env.HEROKU_APP_NAME ? 'Heroku' : (process.env.RENDER ? 'Render' : 'Local PC / External Server'));

let isMasterInstance = false;

async function forceClaimMasterLock() {
  try {
    isMasterInstance = true;
    const payload = {
      instance_id: SERVER_INSTANCE_ID,
      host_type: SERVER_HOST_TYPE,
      last_ping: Date.now()
    };
    await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify([{ jid: 'config_master_server_lock', history: JSON.stringify(payload) }])
    }).catch(() => {});
  } catch (_) {}
}

async function checkMasterLock() {
  try {
    const res = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?jid=eq.config_master_server_lock&select=history,updated_at`, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    });
    const now = Date.now();
    let currentMaster = null;
    let lastPing = 0;

    if (res.ok) {
      const rows = await res.json();
      if (rows && rows[0] && rows[0].history) {
        try {
          const parsed = JSON.parse(rows[0].history);
          currentMaster = parsed.instance_id;
          lastPing = parsed.last_ping || 0;
        } catch (_) {}
      }
    }

    const isStale = (now - lastPing > 30000);

    if (!currentMaster || currentMaster === SERVER_INSTANCE_ID || isStale) {
      await forceClaimMasterLock();
      return true;
    } else {
      isMasterInstance = false;
      return false;
    }
  } catch (_) {
    return true;
  }
}

async function pingServerHeartbeat() {
  try {
    const payload = {
      instance_id: SERVER_INSTANCE_ID,
      host_type: SERVER_HOST_TYPE,
      port: PORT,
      is_master: isMasterInstance,
      last_ping: Date.now()
    };
    await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify([{ jid: 'server_node_' + SERVER_INSTANCE_ID, history: JSON.stringify(payload) }])
    });
  } catch (_) {}
}

function startServerHeartbeat() {
  pingServerHeartbeat();
  setInterval(pingServerHeartbeat, 15000);
}

async function init() {
  await forceClaimMasterLock(); // Force-claim Master Lock on startup!
  startServerHeartbeat();
  await initGlobalConfigs();
  await initStats();
  startBackupWatcher();
  await restoreAllSessions(); // Always restore and launch all connected sessions from Supabase!

  // Check Master Lock periodically: if a newer deployment claims Master Lock, stop workers on this old container!
  setInterval(async () => {
    const isMasterNow = await checkMasterLock();
    if (!isMasterNow && workersMap.size > 0) {
      console.log(`⏸️ [Master Lock Handover] Another container took Master Lock. Stopping local workers on old container (${SERVER_INSTANCE_ID})...`);
      for (const phone of Array.from(workersMap.keys())) {
        stopBotWorker(phone);
      }
    }
  }, 10000);
}

init();

