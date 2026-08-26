/*
  Instagram Downloader (Reels, Posts, Carousels, Stories)
  Provider 1: InstaSave (api.instasave.website)
  Provider 2: Mever API (mever.zeabur.app)
*/

import axios from 'axios';
import * as cheerio from 'cheerio';

class InstaSave {
  constructor() {
    this.types = ['media', 'story', 'dp'];
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
      const results = $('.download-box .download-items')
        .map((_, el) => ({
          thumb: $(el).find('.download-items__thumb img').attr('src') || '',
          download: $(el).find('.download-items__btn a').attr('href') || ''
        }))
        .get();
      return results;
    } catch (err) {
      return [];
    }
  }

  async download(url, type = 'media') {
    try {
      const res = await this.client({ url: `/${type}`, data: `url=${encodeURIComponent(url)}&lang=en` });
      if (res.data) return this.parse(res.data);
      return [];
    } catch (e) {
      return [];
    }
  }
}

const igApi = new InstaSave();

async function meverIG(url) {
  try {
    const res = await axios.get('https://mever.zeabur.app/api/ig', {
      params: { url, quality: '720p', type: 'video' },
      headers: {
        'X-Package-Name': 'com.dapascript.mever',
        'User-Agent': 'okhttp/4.11.0'
      },
      timeout: 30000
    });
    const d = res.data?.data || res.data;
    if (d?.url || d?.download_url || d?.video_url) {
      return [{ download: d.url || d.download_url || d.video_url, thumb: d.thumbnail || '' }];
    }
    if (Array.isArray(d?.medias)) {
      return d.medias.map(m => ({ download: m.url || m.download_url, thumb: m.thumbnail || '' })).filter(m => m.download);
    }
    return [];
  } catch (_) {
    return [];
  }
}

let handler = async (m, { conn, args, text, command, usedPrefix }) => {
  const url = (text || args[0] || '').trim();

  if (!url || !/instagram\.com/i.test(url)) {
    return conn.reply(
      m.chat,
      `📷 *Instagram Downloader*\n\n` +
      `حمل الفيديوهات، الصور، والريلز من إنستغرام مباشرة.\n\n` +
      `*طريقة الاستخدام:*\n` +
      `← ${usedPrefix + command} <رابط إنستغرام>\n\n` +
      `*مثال:*\n` +
      `← ${usedPrefix + command} https://www.instagram.com/reel/xxxxxxx/\n\n` +
      `⚡ *bot amirni hamza*`,
      m
    );
  }

  await m.react('⏳');

  try {
    // 1. Try InstaSave
    let mediaItems = await igApi.download(url);

    // 2. Fallback to Mever if InstaSave returned nothing
    if (!mediaItems || !mediaItems.length) {
      mediaItems = await meverIG(url);
    }

    if (!mediaItems || !mediaItems.length) {
      throw new Error('لم يتم العثور على وسائط قابلة للتحميل. تأكد أن المنشور عام (Public) وليس خاصاً.');
    }

    let sentAny = false;
    for (const item of mediaItems) {
      if (!item.download) continue;

      let buffer, contentType = '';
      try {
        const fileRes = await axios.get(item.download, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
            Referer: 'https://instasave.website/'
          }
        });
        buffer = Buffer.from(fileRes.data);
        contentType = fileRes.headers['content-type'] || '';
      } catch (fetchErr) {
        console.error('[IG] Buffer fetch failed, trying direct URL send:', fetchErr.message);
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
        // Fallback: send via URL directly
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
