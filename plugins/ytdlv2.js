import axios from 'axios';

/* =========================================================================
 * FEATURE: YouTube Downloader (MP4 / MP3)
 * -------------------------------------------------------------------------
 * Downloads a YouTube video as MP4 (video) or extracts the audio as MP3.
 * Source: cnv.cx conversion API.
 *
 * USAGE:
 *   .ytdl <url>                -> downloads MP4 at default quality (360p)
 *   .ytdl <url> mp4 720        -> downloads MP4 at 720p
 *   .ytdl <url> mp3 320        -> downloads MP3 at 320kbps
 *
 * SUPPORTED QUALITIES:
 *   mp4: 144 / 240 / 360 / 480 / 720 / 1080
 *   mp3: 128 / 256 / 320
 *   (any other number is rounded down to the nearest supported rung)
 *
 * The <url> accepts a full YouTube link (youtube.com, youtu.be, shorts,
 * embed, live) or a bare 11-character video ID.
 * ========================================================================= */

const CNV_KEY = 'https://cnv.cx/v2/sanity/key';
const CNV_CONV = 'https://cnv.cx/v2/converter';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const VALID_MP4 = [1080, 720, 480, 360, 240, 144];
const VALID_MP3 = [320, 256, 128];

function extractVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s; // already a video ID
  let u;
  try { u = new URL(s); } catch { return null; }
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const ok = (v) => (/^[a-zA-Z0-9_-]{11}$/.test(v || '') ? v : null);
  if (host === 'youtu.be') return ok(u.pathname.split('/').filter(Boolean)[0]);
  if (/(^|\.)youtube\.com$/.test(host) || host === 'youtube-nocookie.com') {
    const v = ok(u.searchParams.get('v'));
    if (v) return v;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && ['shorts', 'embed', 'v', 'live'].includes(parts[0])) return ok(parts[1]);
  }
  return null;
}

function normMp4(q) {
  const n = parseInt(String(q == null ? 360 : q).replace(/[^\d]/g, ''), 10);
  if (!n) return 360;
  const rungs = VALID_MP4.slice().sort((a, b) => a - b);
  if (n >= rungs[rungs.length - 1]) return rungs[rungs.length - 1];
  let pick = rungs[0];
  for (const r of rungs) if (r <= n) pick = r;
  return pick;
}

function normMp3(q) {
  const n = parseInt(String(q == null ? 128 : q).replace(/[^\d]/g, ''), 10);
  return VALID_MP3.includes(n) ? n : 128;
}

async function ytMeta(videoId) {
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  try {
    const r = await axios.get(
      `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&format=json`,
      { timeout: 15000, headers: { 'User-Agent': UA } },
    );
    return { available: true, title: r.data.title || null, thumbnail: r.data.thumbnail_url || thumb };
  } catch (e) {
    if (e.response && e.response.status === 404) return { available: false, title: null, thumbnail: thumb };
    return { available: true, title: null, thumbnail: thumb }; // meta failing shouldn't block the download
  }
}

async function convert(videoId, format, quality) {
  const isMp3 = format === 'mp3';

  const kr = await axios.get(`${CNV_KEY}?id=${encodeURIComponent(videoId)}`, {
    timeout: 20000,
    headers: {
      'User-Agent': UA,
      Origin: 'https://frame.y2meta-uk.com',
      Referer: 'https://frame.y2meta-uk.com/',
      accept: 'application/json',
    },
  });
  const key = kr.data && kr.data.key;
  if (!key) throw new Error('Empty conversion key (video may be unavailable or blocked)');

  const params = new URLSearchParams();
  params.set('link', `https://youtu.be/${videoId}`);
  params.set('format', isMp3 ? 'mp3' : 'mp4');
  params.set('audioBitrate', isMp3 ? quality : 128);
  params.set('videoQuality', isMp3 ? 720 : quality);
  params.set('filenameStyle', 'pretty');
  params.set('vCodec', 'h264');

  const cr = await axios.post(CNV_CONV, params.toString(), {
    timeout: 30000,
    headers: {
      'User-Agent': UA,
      Origin: 'https://frame.y2meta-uk.com',
      Referer: 'https://frame.y2meta-uk.com/',
      'Content-Type': 'application/x-www-form-urlencoded',
      accept: '*/*',
      key,
    },
  });
  const d = cr.data || {};
  if (!d.url) throw new Error(`Conversion failed${d.text ? ` (${d.text})` : ''}`);
  return d;
}

// The tunnel URL cnv.cx returns is often short-lived and picky about who
// fetches it, so we download it ourselves (with the same headers used to
// obtain it) instead of handing the raw URL to Baileys to fetch.
async function fetchBuffer(url) {
  const r = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
      'User-Agent': UA,
      Referer: 'https://frame.y2meta-uk.com/',
      Origin: 'https://frame.y2meta-uk.com',
    },
  });
  return Buffer.from(r.data);
}

function guideText(prefix, command) {
  return (
    `📺 *YouTube Downloader*\n\n` +
    `Download a YouTube video as *MP4*, or just the audio as *MP3*.\n\n` +
    `*Usage:*\n` +
    `${prefix}${command} <url>\n` +
    `${prefix}${command} <url> mp4 720\n` +
    `${prefix}${command} <url> mp3 320\n\n` +
    `*Examples:*\n` +
    `${prefix}${command} https://youtu.be/dQw4w9WgXcQ\n` +
    `${prefix}${command} https://youtu.be/dQw4w9WgXcQ mp4 1080\n` +
    `${prefix}${command} https://youtu.be/dQw4w9WgXcQ mp3 320\n\n` +
    `*Available qualities:*\n` +
    `MP4 ➜ 144, 240, 360, 480, 720, 1080\n` +
    `MP3 ➜ 128, 256, 320\n\n` +
    `If you skip the format/quality, it defaults to MP4 360p.`
  );
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return conn.reply(m.chat, guideText(usedPrefix, command), m);
  }

  const [urlArg, fmtArg, qualArg] = text.trim().split(/\s+/);
  const videoId = extractVideoId(urlArg);

  if (!videoId) {
    return conn.reply(m.chat, `❌ That's not a valid YouTube URL or video ID.\n\n${guideText(usedPrefix, command)}`, m);
  }

  const format = String(fmtArg || 'mp4').toLowerCase() === 'mp3' ? 'mp3' : 'mp4';
  const quality = format === 'mp3' ? normMp3(qualArg) : normMp4(qualArg);

  try {
    await conn.sendMessage(m.chat, { react: { text: '🕒', key: m.key } });

    const info = await ytMeta(videoId);
    if (!info.available) throw new Error('Video not found, private, or deleted.');

    const conv = await convert(videoId, format, quality);

    let buffer;
    try {
      buffer = await fetchBuffer(conv.url);
    } catch (fetchErr) {
      throw new Error('Could not fetch the file from the download server (link may have expired or is blocked). Try again.');
    }

    const caption =
      `*${info.title || 'YouTube Media'}*\n\n` +
      `📥 Format: ${format.toUpperCase()}\n` +
      `🎚️ Quality: ${format === 'mp3' ? quality + 'kbps' : quality + 'p'}`;

    if (format === 'mp3') {
      await conn.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${info.title || videoId}.mp3`,
        },
        { quoted: m },
      );
    } else {
      await conn.sendMessage(
        m.chat,
        {
          video: buffer,
          caption,
          fileName: `${info.title || videoId}.mp4`,
        },
        { quoted: m },
      );
    }

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat, `⚠️ Download failed: ${e.message}`, m);
  }
};

handler.help = handler.command = ['ytdlv2'];
handler.tags = ['downloader'];
handler.limit = false;
export default handler;
