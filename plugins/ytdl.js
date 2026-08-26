/*
  YouTube Downloader — Multi-provider fallback chain (ported from hamza-chatbot-main)
  Providers: YTConvert -> Convert1s -> SaveTube -> SaveNow -> Ootaizumi
*/

import axios from 'axios';
import crypto from 'crypto';
import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });
const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};
const axiosIgnoreSSL = axios.create({ httpsAgent: agent, headers: COMMON_HEADERS, timeout: 30000 });

async function getYtconvert(url, isAudio) {
  const headers = { accept: 'application/json', 'content-type': 'application/json', referer: 'https://ytmp3.gg/' };
  const payload = { url, os: 'android', output: { type: isAudio ? 'audio' : 'video', format: isAudio ? 'mp3' : 'mp4', quality: isAudio ? '320kbps' : '720p' } };
  let initData;
  for (const base of ['https://hub.ytconvert.org', 'https://api.ytconvert.org']) {
    try {
      const r = await axios.post(`${base}/api/download`, payload, { headers, timeout: 15000 });
      if (r.data?.statusUrl) { initData = r.data; break; }
    } catch (_) {}
  }
  if (!initData?.statusUrl) throw new Error('YTConvert: no statusUrl');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const { data } = await axios.get(initData.statusUrl, { headers, timeout: 10000 });
    if (data.status === 'completed' && data.downloadUrl) return { download: data.downloadUrl, title: data.title || 'YouTube' };
    if (data.status === 'failed') throw new Error('YTConvert: failed');
  }
  throw new Error('YTConvert: timeout');
}

async function getConvert1s(url, isAudio) {
  const headers = { accept: 'application/json', 'content-type': 'application/json', origin: 'https://ssvid.cc', referer: 'https://ssvid.cc/', 'user-agent': COMMON_HEADERS['User-Agent'] };
  const payload = isAudio
    ? { url, audio: { bitrate: '128k' }, output: { type: 'audio', format: 'mp3' } }
    : { url, output: { type: 'video', format: 'mp4', quality: '720p' } };
  const initRes = await axios.post('https://hub.convert1s.com/api/download', payload, { headers, timeout: 15000 });
  const { statusUrl, title } = initRes.data;
  if (!statusUrl) throw new Error('Convert1s: no statusUrl');
  for (let i = 0; i < 25; i++) {
    const s = await axios.get(statusUrl, { headers, timeout: 10000 });
    if (s.data.status === 'completed') return { download: s.data.downloadUrl, title: s.data.title || title };
    if (s.data.status === 'error' || s.data.status === 'failed') break;
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('Convert1s: failed');
}

async function getSaveTube(url, isAudio) {
  const id = (url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
  if (!id) throw new Error('SaveTube: invalid ID');
  const ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
  const infoRes = await axiosIgnoreSSL.post('https://cdn401.savetube.vip/v2/info', { url: `https://www.youtube.com/watch?v=${id}` }, { timeout: 25000 });
  const decrypt = (enc) => {
    const buf = Buffer.from(enc, 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(ky, 'hex'), buf.slice(0, 16));
    return JSON.parse(Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString());
  };
  const dec = decrypt(infoRes.data.data);
  const dlRes = await axiosIgnoreSSL.post('https://cdn401.savetube.vip/download', { id, downloadType: isAudio ? 'audio' : 'video', quality: isAudio ? '128' : '360', key: dec.key }, { timeout: 25000 });
  if (dlRes.data?.data?.downloadUrl) return { download: dlRes.data.data.downloadUrl, title: dec.title || 'YouTube', thumb: dec.thumbnail, referer: 'https://yt.savetube.me/' };
  throw new Error('SaveTube: no downloadUrl');
}

async function getSaveNow(url, isAudio) {
  const headers = { 'User-Agent': COMMON_HEADERS['User-Agent'], 'Referer': 'https://y2down.cc/', 'Origin': 'https://y2down.cc' };
  const format = isAudio ? 'mp3' : '720';
  const initRes = await axios.get('https://p.savenow.to/ajax/download.php', { params: { copyright: '0', format, url, api: 'dfcb6d76f2f6a9894gjkege8a4ab232222' }, headers, timeout: 20000 });
  if (!initRes.data?.progress_url) throw new Error('SaveNow: no progress_url');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const p = await axios.get(initRes.data.progress_url, { headers, timeout: 10000 });
      if (p.data?.download_url) return { download: p.data.download_url, title: initRes.data.info?.title || 'YouTube' };
      if (p.data?.error) throw new Error(`SaveNow: ${p.data.error}`);
    } catch (e) { if (i > 5) throw e; }
  }
  throw new Error('SaveNow: timeout');
}

async function getOotaizumi(url, isAudio) {
  const ep = isAudio
    ? `https://api.ootaizumi.web.id/downloader/ytmp3?url=${encodeURIComponent(url)}`
    : `https://api.ootaizumi.web.id/downloader/ytmp4?url=${encodeURIComponent(url)}`;
  const res = await axiosIgnoreSSL.get(ep);
  const d = res.data;
  const dl = d.result?.download || d.result?.url || d.data?.download_url || d.download;
  if (dl) return { download: dl, title: d.result?.title || d.title || 'YouTube' };
  throw new Error('Ootaizumi: no download URL');
}

export async function downloadYouTube(url, type = 'mp3') {
  const isAudio = type === 'mp3' || type === 'audio';
  const providers = [
    { name: 'YTConvert', fn: () => getYtconvert(url, isAudio) },
    { name: 'Convert1s', fn: () => getConvert1s(url, isAudio) },
    { name: 'SaveTube',  fn: () => getSaveTube(url, isAudio) },
    { name: 'SaveNow',   fn: () => getSaveNow(url, isAudio) },
    { name: 'Ootaizumi', fn: () => getOotaizumi(url, isAudio) },
  ];
  for (const p of providers) {
    try {
      console.log(`[YTDL] Trying ${p.name}...`);
      const result = await p.fn();
      if (result?.download) { console.log(`[YTDL] ✅ ${p.name}`); return result; }
    } catch (e) { console.log(`[YTDL] ❌ ${p.name}: ${e.message}`); }
  }
  return null;
}

function cleanFileName(text) {
  return (text || 'video').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}

let handler = async (m, { conn, args }) => {
  const url = args[0];
  if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
    return m.reply(
      `📥 *YouTube Downloader*\n\n` +
      `حمل فيديوهات يوتيوب مباشرة.\n\n` +
      `*الاستخدام:* .ytdl <رابط> [الجودة]\n` +
      `*الجودات:* 144, 240, 360, 480, 720, 1080\n\n` +
      `*مثال:*\n` +
      `← .ytdl https://youtu.be/9zvdMLfYFkM\n` +
      `← .ytdl https://youtu.be/9zvdMLfYFkM 480\n\n` +
      `⚡ *bot amirni hamza*`
    );
  }

  const format = args[1] || '720';
  await m.react('⏳');

  let data = null;
  try {
    const headers = { 'User-Agent': COMMON_HEADERS['User-Agent'], 'Referer': 'https://y2down.cc/', 'Origin': 'https://y2down.cc' };
    const initRes = await axios.get('https://p.savenow.to/ajax/download.php', { params: { copyright: '0', format, url, api: 'dfcb6d76f2f6a9894gjkege8a4ab232222' }, headers, timeout: 20000 });
    if (initRes.data?.progress_url) {
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const p = await axios.get(initRes.data.progress_url, { headers, timeout: 10000 });
        if (p.data?.download_url) { data = { download: p.data.download_url, title: initRes.data.info?.title || 'YouTube Video' }; break; }
      }
    }
  } catch (_) {}

  if (!data) data = await downloadYouTube(url, 'mp4');

  if (!data) {
    await m.react('❌');
    return conn.reply(m.chat, `❌ فشل تحميل الفيديو. جرب رابطاً آخر أو جودة أخرى.`, m);
  }

  try {
    const head = await axios.head(data.download, { timeout: 10000 });
    const sizeMB = Number(head.headers['content-length'] || 0) / (1024 * 1024);
    if (sizeMB > 95) {
      await m.react('❌');
      return conn.reply(m.chat, `❌ الفيديو كبير جداً (${sizeMB.toFixed(1)} MB)\n\n🔗 تقدر تحمله من هنا:\n${data.download}`, m);
    }
  } catch (_) {}

  const fileRes = await axios.get(data.download, { responseType: 'arraybuffer', timeout: 120000 });
  const buffer = Buffer.from(fileRes.data);
  const safeTitle = cleanFileName(data.title);

  await conn.sendMessage(m.chat, {
    document: buffer,
    mimetype: 'video/mp4',
    fileName: `${safeTitle}.mp4`,
    caption: `🎥 *${safeTitle}*\n⚡ *bot amirni hamza*`
  }, { quoted: m });

  await m.react('✅');
};

handler.help = ['ytdl', 'youtube', 'yt', 'يوتيوب'];
handler.command = /^(ytdl|yt|youtube|يوتيوب)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
