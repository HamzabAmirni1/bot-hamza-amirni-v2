console.log('🐾 Starting bot-amirni-hamza by Hamza Amirni...');

import { Worker } from 'worker_threads';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { watchFile, unwatchFile, readFileSync, existsSync } from 'fs';
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
	worker = new Worker(full);
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

start('main.js');
