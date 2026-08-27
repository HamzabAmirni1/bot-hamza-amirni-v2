// ============================================================
// downloadProgress.js — Live progress bar downloader
// Downloads a file via stream with real-time progress editing
// Usage: const buffer = await downloadWithProgress(url, { m, conn, title, emoji })
// ============================================================

import axios from 'axios';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': '*/*',
};

/**
 * Renders a Unicode progress bar
 * e.g. buildBar(48, 12) => "▓▓▓▓▓░░░░░░░"
 */
function buildBar(percent, len = 12) {
  const filled = Math.round((percent / 100) * len);
  const empty  = len - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

/** Format bytes to human-readable string */
function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024)        return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

/** Edit a Baileys text message. Silently ignores if unsupported. */
async function editMsg(conn, chat, key, newText) {
  try {
    await conn.sendMessage(chat, { text: newText, edit: key });
  } catch (_) {}
}

/**
 * Main function: Download URL with live progress bar message
 *
 * @param {string} url           Direct download URL
 * @param {object} opts
 * @param {object} opts.m        Baileys message object
 * @param {object} opts.conn     Baileys connection object
 * @param {string} opts.title    App/file display name
 * @param {string} [opts.emoji]  Leading emoji (default 📦)
 * @param {number} [opts.updateInterval] How often to edit (ms, default 2000)
 * @param {number} [opts.timeout]        Axios timeout ms (default 300000)
 * @returns {Promise<Buffer>}    Downloaded file as Buffer
 */
export async function downloadWithProgress(url, opts = {}) {
  const {
    m,
    conn,
    title          = 'الملف',
    emoji          = '📦',
    updateInterval = 2000,
    timeout        = 300_000,
  } = opts;

  const chat = m?.chat;

  // Step 1: Send initial progress message
  let progressMsgKey = null;
  const initialText =
    `${emoji} *${title}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏳ *جاري التحميل...*\n` +
    `${buildBar(0)} 0%\n` +
    `📊 0 B / جاري الجلب...\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ *bot amirni hamza*`;

  try {
    const sent = await conn.sendMessage(chat, { text: initialText }, { quoted: m });
    progressMsgKey = sent?.key;
  } catch (_) {}

  // Step 2: Start stream download
  let totalBytes      = 0;
  let downloadedBytes = 0;
  const chunks        = [];

  const response = await axios({
    method:       'GET',
    url,
    headers:      HEADERS,
    responseType: 'stream',
    timeout,
  });

  totalBytes = parseInt(response.headers['content-length'] || '0', 10);

  return new Promise((resolve, reject) => {
    let intervalId = null;

    // Edit progress message at fixed intervals
    if (progressMsgKey && chat) {
      intervalId = setInterval(async () => {
        const percent = totalBytes > 0
          ? Math.min(99, Math.round((downloadedBytes / totalBytes) * 100))
          : null;

        const barLine = percent !== null
          ? `${buildBar(percent)} ${percent}%`
          : `${buildBar(0)} ⌛`;

        const sizeLine = totalBytes > 0
          ? `${fmtBytes(downloadedBytes)} / ${fmtBytes(totalBytes)}`
          : `${fmtBytes(downloadedBytes)}`;

        await editMsg(conn, chat, progressMsgKey,
          `${emoji} *${title}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⬇️ *جاري التحميل...*\n` +
          `${barLine}\n` +
          `📊 ${sizeLine}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚡ *bot amirni hamza*`
        );
      }, updateInterval);
    }

    response.data.on('data', (chunk) => {
      chunks.push(chunk);
      downloadedBytes += chunk.length;
    });

    response.data.on('end', async () => {
      if (intervalId) clearInterval(intervalId);

      // Final 100% edit
      if (progressMsgKey && chat) {
        await editMsg(conn, chat, progressMsgKey,
          `${emoji} *${title}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `✅ *اكتمل التحميل!*\n` +
          `${buildBar(100)} 100%\n` +
          `📊 ${fmtBytes(downloadedBytes)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⏳ *جاري الإرسال...*\n` +
          `⚡ *bot amirni hamza*`
        );
      }

      resolve(Buffer.concat(chunks));
    });

    response.data.on('error', async (err) => {
      if (intervalId) clearInterval(intervalId);

      if (progressMsgKey && chat) {
        await editMsg(conn, chat, progressMsgKey,
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

/**
 * Delete the progress message after the final file is sent.
 * Call this after conn.sendMessage() with the APK/document.
 */
export async function clearProgressMsg(conn, chat, key) {
  try {
    await conn.sendMessage(chat, { delete: key });
  } catch (_) {}
}
