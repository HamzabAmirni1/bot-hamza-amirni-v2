console.log('🐾 Starting bot-amirni-hamza by Hamza Amirni...');

import { Worker } from 'worker_threads';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { watchFile, unwatchFile, readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import readline from 'readline';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Health check & static dashboard server for Koyeb
const PORT = process.env.PORT || 8000;
http.createServer((req, res) => {
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

function start(file) {
	if (running) return;
	running = true;
	const full = join(__dirname, file);

	if (worker) worker.terminate();
	worker = new Worker(full, { stdout: true, stderr: true });

	worker.stdout.on('data', (chunk) => {
		const chunkStr = chunk.toString();
		process.stdout.write(chunk);
		
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
		if (code !== 0) {
			restartTimer = setTimeout(
				() => {
					console.log('⏳ Auto restart...');
					restart();
				},
				30 * 60 * 1000
			);
		}
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
	running = false;

	start('main.js');
}

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

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

function startBackupWatcher() {
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

async function init() {
  await restoreSession();
  startBackupWatcher();
  start('main.js');
}

init();
