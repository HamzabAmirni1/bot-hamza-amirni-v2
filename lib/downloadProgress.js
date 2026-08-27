// ============================================================
// downloadProgress.js — Ultra-Lightweight Live Progress Bar
// Zero-RAM overhead: Streams chunks and discards to avoid OOM
// Updates WhatsApp message live with percentage and progress bar
// ============================================================

import axios from 'axios';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
};

/** Build a clean Unicode progress bar */
function buildBar(percent, len = 10) {
  const p = Math.max(0, Math.min(100, percent || 0));
  const filled = Math.round((p / 100) * len);
  const empty  = Math.max(0, len - filled);
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

/** Format bytes into readable MB/KB */
function fmtBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024)        return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

/** Safe message editor */
async function editMsg(conn, chat, key, newText) {
  if (!key || !chat || !conn) return;
  try {
    await conn.sendMessage(chat, { text: newText, edit: key });
  } catch (_) {}
}

/**
 * Downloads a URL via a lightweight streaming pipeline with a live progress bar.
 * Consumes 0 MB of RAM so the server never crashes from OOM (exit code 9).
 *
 * @param {string} url           Direct download URL
 * @param {object} opts
 * @param {object} opts.m        Message object
 * @param {object} opts.conn     Baileys connection
 * @param {string} opts.title    File title
 * @param {string} [opts.emoji]  Emoji (default 📦)
 * @param {number} [opts.timeout] Timeout ms (default 5min)
 * @returns {Promise<{ sizeBytes: number, progressKey: any }>}
 */
export async function downloadWithProgress(url, opts = {}) {
  const {
    m,
    conn,
    title   = 'الملف',
    emoji   = '📦',
    timeout = 300_000,
  } = opts;

  const chat = m?.chat;
  let progressMsgKey = null;

  // Step 1: Send Initial Progress Message
  try {
    const initialText =
      `${emoji} *${title}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏳ *جاري التحميل...*\n` +
      `${buildBar(0)} 0%\n` +
      `📊 0 B / جاري الجلب...\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ *bot amirni hamza*`;

    const sent = await conn.sendMessage(chat, { text: initialText }, { quoted: m });
    progressMsgKey = sent?.key;
  } catch (_) {}

  // Step 2: Stream Download to measure progress without holding buffers in RAM
  const response = await axios({
    method: 'GET',
    url,
    headers: HEADERS,
    responseType: 'stream',
    timeout,
  });

  const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
  let downloadedBytes = 0;
  let lastEditTime = Date.now();
  let lastReportedPercent = -1;

  return new Promise((resolve, reject) => {
    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;

      const now = Date.now();
      // Throttle edits: update every ~2.5s or on major % jumps to avoid socket congestion
      if (now - lastEditTime >= 2500 && progressMsgKey && chat) {
        const percent = totalBytes > 0
          ? Math.min(99, Math.round((downloadedBytes / totalBytes) * 100))
          : null;

        if (percent === null || Math.abs(percent - lastReportedPercent) >= 4) {
          lastEditTime = now;
          lastReportedPercent = percent || 0;

          const barLine = percent !== null ? `${buildBar(percent)} ${percent}%` : `${buildBar(0)} ⌛`;
          const sizeLine = totalBytes > 0
            ? `${fmtBytes(downloadedBytes)} / ${fmtBytes(totalBytes)}`
            : `${fmtBytes(downloadedBytes)}`;

          editMsg(conn, chat, progressMsgKey,
            `${emoji} *${title}*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `⬇️ *جاري التحميل...*\n` +
            `${barLine}\n` +
            `📊 ${sizeLine}\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `⚡ *bot amirni hamza*`
          );
        }
      }
    });

    response.data.on('end', async () => {
      // Final 100% notification
      if (progressMsgKey && chat) {
        await editMsg(conn, chat, progressMsgKey,
          `${emoji} *${title}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `✅ *اكتمل التحميل! (100%)*\n` +
          `${buildBar(100)} 100%\n` +
          `📊 ${fmtBytes(downloadedBytes)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⏳ *جاري الإرسال على واتساب...*\n` +
          `⚡ *bot amirni hamza*`
        );
      }

      resolve({
        sizeBytes: downloadedBytes,
        progressKey: progressMsgKey
      });
    });

    response.data.on('error', (err) => {
      if (progressMsgKey && chat) {
        editMsg(conn, chat, progressMsgKey,
          `${emoji} *${title}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `❌ *فشل التحميل!*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚡ *bot amirni hamza*`
        );
      }
      reject(err);
    });
  });
}
