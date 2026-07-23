console.log('🐾 Starting bot-amirni-hamza by Hamza Aamarni...');
process.setMaxListeners(50); // prevent MaxListenersExceededWarning during reconnects

import { Worker } from 'worker_threads';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { watchFile, unwatchFile, readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import readline from 'readline';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

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
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data[0] || {}));
        return;
      }
      
      if (endpoint === 'sessions') {
        const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth?select=*&order=updated_at.desc', {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const data = await fetchRes.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
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
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      if (endpoint === 'requestpair' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth', {
              method: 'POST',
              headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify(payload)
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }
      
      // ── GET /api/settings — read bot config ──────────────
      if (endpoint === 'settings' && req.method === 'GET') {
        const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_config?select=key,value', {
          headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
        });
        const rows = await fetchRes.json();
        // Convert [{key,value}] array to {key:value} object
        const cfg = {};
        if (Array.isArray(rows)) rows.forEach(r => { cfg[r.key] = r.value; });
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
            // Upsert each key-value pair
            const rows = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
            const fetchRes = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_config', {
              method: 'POST',
              headers: {
                'apikey': SB_KEY,
                'Authorization': 'Bearer ' + SB_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
              },
              body: JSON.stringify(rows)
            });
            // Update global vars if bot is running
            if (settings.apk_daily_limit) global.APK_DAILY_LIMIT = parseInt(settings.apk_daily_limit);
            if (settings.bot_name) global.namebot = settings.bot_name;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, saved: Object.keys(settings) }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
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

  let filePath = join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  if (!existsSync(filePath) || req.url.includes('..')) {
    filePath = join(__dirname, 'public', 'index.html');
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

let worker = null;
let running = false;
let restartTimer = null;
let restartCount = 0;          // exponential back-off counter
let lastRestartTime = 0;

function start(file) {
	if (running) return;
	running = true;
	const full = join(__dirname, file);

	if (worker) worker.terminate();
	worker = new Worker(full, { stdout: true, stderr: true });

	worker.stdout.on('data', (chunk) => {
		const chunkStr = chunk.toString();
		// Replace Indonesian UI messages with branded Arabic messages
		const translated = chunkStr
			.replace(/Mengaktifkan Bot,?\s*Mohon tunggu sebentar\.*/gi, '⚡ جاري تشغيل البوت، انتظر لحظة...')
			.replace(/Menunggu Pesan Baru/gi, '📨 في انتظار الرسائل')
			.replace(/Status Aktif/gi, '🟢 الحالة: نشط')
			.replace(/Tersambung/gi, 'متصل ✅')
			.replace(/Stream Errored \(conflict\)/gi, '⚠️ تعارض في الاتصال، إعادة المحاولة...');
		process.stdout.write(translated);

		
		const codeMatch = chunkStr.match(/Your Pairing Code\s*:\s*([A-Z0-9-]{8,10})/i);
		if (codeMatch) {
			const code = codeMatch[1].trim();
			console.log(`\n📡 Captured Pairing Code: ${code}. Syncing to Supabase...`);
			
			const payload = {
				phone_number: '212612030829',
				pairing_code: code,
				status: 'pending',
				updated_at: new Date().toISOString()
			};
			
			fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth', {
				method: 'POST',
				headers: {
					'apikey': SB_KEY,
					'Authorization': 'Bearer ' + SB_KEY,
					'Content-Type': 'application/json',
					'Prefer': 'resolution=merge-duplicates'
				},
				body: JSON.stringify(payload)
			}).then(res => {
				if (res.ok) console.log('☁️ Backup pairing code to Supabase successfully!');
				else res.text().then(txt => console.error('❌ Failed to backup pairing code to Supabase:', txt));
			}).catch(err => console.error('❌ Error uploading pairing code:', err.message));
		}
	});

	worker.stderr.on('data', (chunk) => {
		process.stderr.write(chunk);
	});
	if (restartTimer) {
		clearTimeout(restartTimer);
		restartTimer = null;
	}

	worker.on('message', (msg) => {
		console.log('[MESSAGE]', msg);

		if (msg === 'restart' || msg === 'reset') {
			restart();
		}
	});

	worker.on('exit', (code) => {
		console.log('❗ Worker exited with code', code);
		running = false;

		// Exponential back-off: 5s → 10s → 20s → 40s … capped at 5 min
		const now = Date.now();
		if (now - lastRestartTime < 60_000) {
			restartCount++;
		} else {
			restartCount = 0; // reset if last restart was >1 min ago
		}
		lastRestartTime = now;
		const backoffMs = Math.min(5000 * Math.pow(2, restartCount), 5 * 60 * 1000);

		if (code !== 0) {
			console.log(`⏳ Restarting in ${Math.round(backoffMs / 1000)}s (attempt #${restartCount + 1})...`);
			restartTimer = setTimeout(() => restart(), backoffMs);
		}

		// Always unwatchFile before adding a new one to prevent listener leak
		try { unwatchFile(full); } catch {}
		watchFile(full, () => {
			unwatchFile(full);
			console.log('♻️ File updated → Restarting...');
			start(file);
		});
	});

	if (!rl.listenerCount('line')) {
		rl.on('line', (line) => {
			const cmd = line.trim().toLowerCase();
			if (!cmd) return;

			if (cmd === 'exit') {
				console.log('⛔ Exiting...');
				worker?.terminate();
				process.exit(0);
			}
			if (cmd === 'restart' || cmd === 'reset') {
				console.log('🍃Restart...');
				restart();
			}

			worker?.postMessage(cmd);
		});
	}
}

function restart() {
	if (worker) {
		try {
			worker.terminate();
		} catch {}
	}
	worker = null;
	running = false;
	start('main.js');
}

async function restoreSession() {
  console.log('☁️ Restoring session from Supabase...');
  try {
    const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/whatsapp_auth?select=session_data,phone_number&order=updated_at.desc&limit=1', {
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY
      }
    });
    if (!res.ok) {
      console.log('⚠️ Failed to query Supabase for session restoration:', await res.text());
      return;
    }
    const data = await res.json();
    if (data && data[0] && data[0].session_data) {
      const buffer = Buffer.from(data[0].session_data, 'base64');
      mkdirSync(join(__dirname, 'sessions'), { recursive: true });
      writeFileSync(join(__dirname, 'sessions', 'auth.db'), buffer);
      console.log(`✅ Restored WhatsApp session for ${data[0].phone_number} from Supabase successfully!`);
    } else {
      console.log('ℹ️ No previous session found in Supabase.');
    }
  } catch (err) {
    console.error('❌ Error restoring session from Supabase:', err.message);
  }
}

let uploadTimeout = null;
const dbPath = join(__dirname, 'sessions', 'auth.db');

let backupWatcherStarted = false; // guard: only ever register ONE watcher

function startBackupWatcher() {
  if (backupWatcherStarted) return; // prevent duplicate listeners
  backupWatcherStarted = true;
  console.log('📡 Starting Supabase session backup watcher...');
  
  // Ensure the directory exists
  mkdirSync(join(__dirname, 'sessions'), { recursive: true });
  
  // Touch the file if it doesn't exist so we can watch it
  if (!existsSync(dbPath)) {
    writeFileSync(dbPath, '');
  }

  watchFile(dbPath, () => {
    if (uploadTimeout) clearTimeout(uploadTimeout);
    uploadTimeout = setTimeout(async () => {
      try {
        if (!existsSync(dbPath)) return;
        const content = readFileSync(dbPath);
        if (content.length === 0) return; // don't backup empty files
        const base64 = content.toString('base64');
        
        const payload = {
          phone_number: '212612030829',
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
          console.log('☁️ Backup WhatsApp session to Supabase database successfully!');
        } else {
          console.error('❌ Failed to backup session to Supabase:', await res.text());
        }
      } catch (err) {
        console.error('❌ Error during Supabase session backup:', err.message);
      }
    }, 10000); // 10-second debounce
  });
}

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

async function init() {
  await restoreSession();
  await initStats();
  startBackupWatcher();
  start('main.js');
}

init();
