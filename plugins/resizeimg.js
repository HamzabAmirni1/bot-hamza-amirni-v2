/*
 * Image Resize Plugin — powered by iloveimg.com (unofficial, scraped session)
 * Commands: resize / imgresize / resizeimg
 */

import axios from 'axios';
import FormData from 'form-data';

const SITE_URL = 'https://www.iloveimg.com/resize-image';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

function getMimeType(fileName = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  return (
    {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
    }[ext] || 'image/jpeg'
  );
}

async function scrapeSession() {
  const { data: html } = await axios.get(SITE_URL, { headers: HEADERS, timeout: 15000 });
  const token = html.match(/"token"\s*:\s*"([^"]+)"/)?.[1];
  const taskId = html.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1];
  const servers = JSON.parse('[' + (html.match(/"servers"\s*:\s*\[([^\]]+)\]/)?.[1] || '') + ']');
  if (!token || !taskId || !servers.length) throw new Error('Could not get a session from iloveimg.com');
  return { token, taskId, servers };
}

async function uploadImage(token, server, taskId, buffer, fileName) {
  const form = new FormData();
  form.append('task', taskId);
  form.append('file', buffer, { filename: fileName, contentType: getMimeType(fileName) });
  const serverUrl = `https://${server}.ilovepdf.com`;
  const { data } = await axios.post(`${serverUrl}/v1/upload`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${token}`,
      Origin: 'https://www.iloveimg.com',
      Referer: SITE_URL,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 60000,
  });
  return { serverFilename: data.server_filename, serverUrl };
}

async function processResize(token, serverUrl, taskId, serverFilename, originalName, opts) {
  const payload = {
    task: taskId,
    tool: 'resizeimage',
    files: [{ server_filename: serverFilename, filename: originalName }],
    keep_proportion: 'true',
    if_enlarge: 'false',
  };
  if (opts.percentage) {
    payload.resize_mode = 'percentage';
    payload.percentage = String(opts.percentage);
  } else {
    payload.resize_mode = 'pixels';
    if (opts.width) payload.pixels_width = String(opts.width);
    if (opts.height) payload.pixels_height = String(opts.height);
  }
  const { data } = await axios.post(`${serverUrl}/v1/process`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Origin: 'https://www.iloveimg.com',
      Referer: SITE_URL,
    },
    timeout: 60000,
  });
  return data;
}

async function downloadResult(token, serverUrl, taskId) {
  const { data } = await axios.get(`${serverUrl}/v1/download/${taskId}`, {
    headers: { Authorization: `Bearer ${token}`, Origin: 'https://www.iloveimg.com', Referer: SITE_URL },
    responseType: 'arraybuffer',
    timeout: 60000,
  });
  return Buffer.from(data);
}

async function resizeImage(buffer, fileName, opts) {
  const session = await scrapeSession();
  const { serverFilename, serverUrl } = await uploadImage(
    session.token,
    session.servers[0],
    session.taskId,
    buffer,
    fileName
  );
  await processResize(session.token, serverUrl, session.taskId, serverFilename, fileName, opts);
  return downloadResult(session.token, serverUrl, session.taskId);
}

// Tries a few common ways of pulling a Buffer out of a quoted/attached image,
// same fallback-chain pattern used in the other media plugins.
async function getImageBuffer(m, conn) {
  const target = m.quoted ? m.quoted : m;
  if (!target) return null;

  try {
    if (typeof target.download === 'function') return await target.download();
  } catch {}

  try {
    if (typeof conn.downloadMediaMessage === 'function') return await conn.downloadMediaMessage(target);
  } catch {}

  try {
    if (typeof conn.downloadM === 'function') return await conn.downloadM(target.message || target);
  } catch {}

  return null;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const buffer = await getImageBuffer(m, conn);

  if (!buffer) {
    return conn.reply(
      m.chat,
      `📐 *Image Resize*\n\nSend an image (or reply to one) with the caption *${usedPrefix + command}*, followed by the size you want.\n\nExamples:\n• ${usedPrefix + command} 800 600 → resize to 800×600 px\n• ${usedPrefix + command} 1200 → resize width to 1200 px, height auto\n• ${usedPrefix + command} 50% → shrink to 50% of the original size`,
      m
    );
  }

  const opts = {};
  const firstArg = (args[0] || '').trim();

  if (firstArg.endsWith('%')) {
    opts.percentage = parseInt(firstArg, 10);
  } else if (args.length >= 2) {
    opts.width = parseInt(args[0], 10);
    opts.height = parseInt(args[1], 10);
  } else if (args.length === 1) {
    opts.width = parseInt(args[0], 10);
  }

  const hasValidSize =
    (opts.percentage && !isNaN(opts.percentage)) ||
    (opts.width && !isNaN(opts.width)) ||
    (opts.height && !isNaN(opts.height));

  if (!hasValidSize) {
    return conn.reply(
      m.chat,
      `❌ Please tell me the size.\n\nExamples:\n• ${usedPrefix + command} 800 600\n• ${usedPrefix + command} 1200\n• ${usedPrefix + command} 50%`,
      m
    );
  }

  await conn.sendMessage(m.chat, { react: { text: '🕒', key: m.key } });

  try {
    const resized = await resizeImage(buffer, 'image.jpg', opts);
    await conn.sendFile(m.chat, resized, 'resized.jpg', '✅ Here is your resized image.', m);
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
  } catch (err) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat, `❌ Failed to resize the image: ${err.message}`, m);
  }
};

handler.help = ['resize'];
handler.command = ['resizeimg'];
handler.tags = ['editor'];
handler.limit = false;
export default handler;           
