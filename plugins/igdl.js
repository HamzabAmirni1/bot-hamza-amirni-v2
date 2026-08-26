/*
  Instagram Downloader (Reels, Posts, Carousels, Stories)
  Engine Fallback Chain:
  1. Vreden API (api.vreden.web.id)
  2. Mever API (mever.zeabur.app)
  3. SnapSave (snapsave.app)
  4. InstaSave (api.instasave.website)
*/

import axios from 'axios';
import * as cheerio from 'cheerio';

class InstaSave {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.instasave.website',
      method: 'POST',
      headers: {
        'sec-ch-ua': '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://instasave.website/',
        'Accept-Language': 'en-US,en;q=0.9',
        'sec-ch-ua-mobile': '?1',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
        'sec-ch-ua-platform': '"Android"'
      }
    });
  }

  parse(html) {
    try {
      const clean = (html || '')
        .replace(/loader\['style'\]\['display'\]='none',document\['getElementById'\]\('div_download'\)\['innerHTML'\]='/g, '')
        .replace(/',document\['getElementById'\]\('downloader'\)\['remove'\]\(\),showAd\(\);/g, '')
        .replace(/\\x22/g, '"')
        .replace(/\\x20/g, ' ');
      const $ = cheerio.load(clean);
      return $('.download-box .download-items')
        .map((_, el) => ({
          thumb: $(el).find('.download-items__thumb img').attr('src') || '',
          download: $(el).find('.download-items__btn a').attr('href') || ''
        }))
        .get();
    } catch {
      return [];
    }
  }

  async download(url) {
    try {
      const res = await this.client({ url: '/media', data: `url=${encodeURIComponent(url)}&lang=en` });
      if (res.data) return this.parse(res.data);
      return [];
    } catch {
      return [];
    }
  }
}

const igInstaSave = new InstaSave();

async function vredenIG(url) {
  try {
    const res = await axios.get(`https://api.vreden.web.id/api/v1/download/instagram?url=${encodeURIComponent(url)}`, {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const d = res.data?.result;
    if (Array.isArray(d) && d.length > 0) {
      return d.map(item => ({ download: item.url || item.download_url, thumb: item.thumbnail || '' })).filter(x => x.download);
    }
    if (d?.download?.url || d?.url) {
      return [{ download: d.download?.url || d.url, thumb: d.thumbnail || '' }];
    }
    return [];
  } catch {
    return [];
  }
}

async function meverIG(url) {
  try {
    const res = await axios.get('https://mever.zeabur.app/api/ig', {
      params: { url, quality: '720p', type: 'video' },
      headers: {
        'X-Package-Name': 'com.dapascript.mever',
        'User-Agent': 'okhttp/4.11.0'
      },
      timeout: 25000
    });
    const d = res.data?.data || res.data;
    if (d?.url || d?.download_url || d?.video_url) {
      return [{ download: d.url || d.download_url || d.video_url, thumb: d.thumbnail || '' }];
    }
    if (Array.isArray(d?.medias) && d.medias.length > 0) {
      return d.medias.map(m => ({ download: m.url || m.download_url, thumb: m.thumbnail || '' })).filter(m => m.download);
    }
    return [];
  } catch {
    return [];
  }
}

async function snapsaveIG(url) {
  try {
    const params = new URLSearchParams({ url });
    const res = await axios.post('https://snapsave.app/action.php', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://snapsave.app',
        'Referer': 'https://snapsave.app/'
      },
      timeout: 20000
    });
    const html = String(res.data || '');
    const urls = [];
    const matches = html.matchAll(/href=\\"(https:[^\\"]+\.mp4[^\\"]*)\\"/g);
    for (const match of matches) {
      if (match[1]) urls.push({ download: match[1].replace(/\\/g, ''), thumb: '' });
    }
    return urls;
  } catch {
    return [];
  }
}

let handler = async (m, { conn, args, text, command, usedPrefix }) => {
  const rawInput = (text || args[0] || '').trim();
  const urlMatch = rawInput.match(/https?:\/\/[^\s]+/i);
  const originalUrl = urlMatch ? urlMatch[0] : rawInput;

  if (!originalUrl || !/instagram\.com/i.test(originalUrl)) {
    return conn.reply(
      m.chat,
      `📷 *Instagram Downloader*\n\n` +
      `حمل الفيديوهات، الصور، والريلز من إنستغرام مباشرة.\n\n` +
      `*طريقة الاستخدام:*\n` +
      `← ${usedPrefix + command} <رابط إنستغرام>\n\n` +
      `*مثال:*\n` +
      `← ${usedPrefix + command} https://www.instagram.com/reel/DcIob81ttHi/\n\n` +
      `⚡ *bot amirni hamza*`,
      m
    );
  }

  await m.react('⏳');

  // Clean URL by stripping tracking parameters (igsi, utm, img_index, etc.)
  let cleanUrl = originalUrl.split('?')[0].split('&')[0].replace(/\/$/, '');
  if (!cleanUrl.endsWith('/')) cleanUrl += '/';

  try {
    let mediaItems = [];

    // Try providers in order
    for (const provider of [
      () => meverIG(cleanUrl),
      () => vredenIG(cleanUrl),
      () => igInstaSave.download(cleanUrl),
      () => snapsaveIG(cleanUrl),
      () => meverIG(originalUrl),
      () => vredenIG(originalUrl)
    ]) {
      try {
        const res = await provider();
        if (Array.isArray(res) && res.length > 0) {
          mediaItems = res;
          break;
        }
      } catch (_) {}
    }

    if (!mediaItems || !mediaItems.length) {
      throw new Error('لم يتم العثور على وسائط قابلة للتحميل. تأكد أن المنشور عام (Public) وليس خاصاً.');
    }

    let sentAny = false;
    for (const item of mediaItems) {
      if (!item.download) continue;

      let buffer = null, contentType = '';
      try {
        const fileRes = await axios.get(item.download, {
          responseType: 'arraybuffer',
          timeout: 35000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
            Referer: 'https://instagram.com/'
          }
        });
        buffer = Buffer.from(fileRes.data);
        contentType = fileRes.headers['content-type'] || '';
      } catch (fetchErr) {
        console.error('[IG] Buffer fetch failed, trying direct URL:', fetchErr.message);
      }

      const isVideo = contentType.includes('video') || /\.mp4(\?|$)/i.test(item.download);
      const caption = `📷 *Instagram Download*\n⚡ *bot amirni hamza*`;

      if (buffer) {
        await conn.sendMessage(
          m.chat,
          isVideo ? { video: buffer, caption } : { image: buffer, caption },
          { quoted: m }
        );
        sentAny = true;
      } else {
        await conn.sendMessage(
          m.chat,
          isVideo ? { video: { url: item.download }, caption } : { image: { url: item.download }, caption },
          { quoted: m }
        );
        sentAny = true;
      }
    }

    if (!sentAny) {
      throw new Error('تعذر تحميل الملفات من السيرفر. حاول مرة أخرى.');
    }

    await m.react('✅');
  } catch (err) {
    console.error('[Instagram Error]', err.message);
    await m.react('❌');
    conn.reply(m.chat, `❌ ${err.message || 'فشل التحميل. حاول مجدداً.'}`, m);
  }
};

handler.help = ['ig', 'igdl', 'insta', 'instagram', 'reels'];
handler.command = /^(ig|igdl|insta|instagram|reels|ريلز|انستا|إنستغرام|انستقرام)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
