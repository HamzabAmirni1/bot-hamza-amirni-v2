import axios from 'axios';
import * as cheerio from 'cheerio';
import { assertFileSizeOk } from '../lib/checkFileSize.js';

// ─── InstaSave for Instagram ───────────────────────────────────────────────
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

const igScraper = new InstaSave();

// ─── fget.io for Facebook ──────────────────────────────────────────────────
async function fgetFacebook(url) {
  try {
    const endpoint = 'https://fget.io/process';
    const body = new URLSearchParams({ id: url, locale: 'id' });
    const { data: html } = await axios.post(endpoint, body.toString(), {
      headers: {
        'HX-Request': 'true',
        'HX-Trigger': 'form',
        'HX-Target': 'target',
        'HX-Current-URL': 'https://fget.io/id',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://fget.io',
        'Referer': 'https://fget.io/id'
      },
      timeout: 25000
    });
    const $ = cheerio.load(html);
    let bestUrl = null;
    $('a.download-result').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !bestUrl) bestUrl = href;
    });
    if (bestUrl) return { type: 'video', url: bestUrl, title: $('.result-title').first().text().trim() || 'Facebook Video' };
    return null;
  } catch {
    return null;
  }
}

// ─── mever.zeabur.app fallback ──────────────────────────────────────────────
class MeverClient {
  constructor() {
    this.base = 'https://mever.zeabur.app/api/';
    this.headers = {
      'X-Package-Name': 'com.dapascript.mever',
      'User-Agent': 'okhttp/4.11.0',
    };
    this.map = {
      tiktok: 'tiktok',
      youtube: 'youtube',
      facebook: 'fb',
      instagram: 'ig',
      pinterest: 'pin-v2',
      twitter: 'twitter',
      threads: 'threads',
      soundcloud: 'soundcloud',
      spotify: 'spotify',
      pixiv: 'pixiv',
      terabox: 'terabox',
      videy: 'videy',
      applemusic: 'applemusic',
      douyin: 'douyin',
    };
  }

  async run({ mode, url, quality = '720p', type = 'video' }) {
    if (!this.map[mode]) throw new Error(`Unknown mode: ${mode}`);
    if (!url) throw new Error('URL is required');
    const { data } = await axios.get(`${this.base}${this.map[mode]}`, {
      params: { url, quality, type },
      headers: this.headers,
      timeout: 30_000,
    });
    return data?.data || data;
  }
}

function extractMediaUrl(data) {
  const candidates = [
    data?.url, data?.download_url, data?.downloadUrl,
    data?.video_url, data?.videoUrl, data?.audio_url, data?.audioUrl,
    data?.medias?.[0]?.url, data?.result?.[0]?.url, data?.data?.[0]?.url,
    data?.urls?.[0],
    ...(Array.isArray(data?.medias) ? data.medias.map(x => x?.url) : []),
    ...(Array.isArray(data?.results) ? data.results.map(x => x?.url) : []),
  ];
  return candidates.find(u => typeof u === 'string' && u.startsWith('http')) || null;
}

function extractTitle(data) {
  return data?.title || data?.caption || data?.description || data?.name || 'ميديا';
}

// ─── tikwm.com for TikTok specifically (best for TikTok slideshows) ─────────
async function tikwmDownload(url) {
  try {
    const res = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
      timeout: 15000
    });
    const data = res.data?.data;
    if (!data) return null;
    if (data.images?.length > 0) {
      return { type: 'photos', urls: data.images, title: data.title, audio: data.music_info?.play };
    }
    if (data.play) return { type: 'video', url: data.play, title: data.title };
    return null;
  } catch (_) { return null; }
}

function detectMode(url) {
  const u = url.toLowerCase();
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('douyin.com')) return 'douyin';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'instagram';
  if (u.includes('pinterest.com') || u.includes('pin.it')) return 'pinterest';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  if (u.includes('threads.net')) return 'threads';
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('open.spotify.com')) return 'spotify';
  if (u.includes('pixiv.net')) return 'pixiv';
  if (u.includes('terabox.com')) return 'terabox';
  if (u.includes('videy.co')) return 'videy';
  if (u.includes('music.apple.com')) return 'applemusic';
  return null;
}

const handler = {};

handler.before = async function (m, { conn }) {
  if (!m.text || m.fromMe) return;

  // Don't trigger on bot commands
  if (/^[.!#/\\]/.test(m.text.trim())) return;

  // Extract social media link from message
  const urlMatch = m.text.match(/https?:\/\/[^\s]+/i);
  if (!urlMatch) return;

  const url = urlMatch[0];
  const mode = detectMode(url);
  if (!mode) return; // Not a supported social media link

  // Get user language
  const user = global.db.data?.users?.[m.sender] || {};
  const lang = user.language || 'darija';

  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : (da || ar);

  await m.reply(t(
    `📥 Auto-detected *${mode.toUpperCase()}* link! Downloading... ⏳`,
    `📥 تم رصد رابط *${mode.toUpperCase()}* تلقائياً! جاري التحميل... ⏳`,
    `📥 لقا البوت رابط *${mode.toUpperCase()}*! كيحمل الآن... ⏳`
  ));

  let result = null;

  // ── TikTok ──
  if (mode === 'tiktok') {
    result = await tikwmDownload(url);
  }

  // ── Instagram ──
  if (!result && mode === 'instagram') {
    try {
      const items = await igScraper.download(url);
      if (items?.length === 1) {
        result = { type: items[0].download.includes('.mp4') ? 'video' : 'photos', url: items[0].download, urls: [items[0].download] };
      } else if (items?.length > 1) {
        result = { type: 'photos', urls: items.map(i => i.download).filter(Boolean) };
      }
    } catch (_) {}
  }

  // ── Facebook ──
  if (!result && mode === 'facebook') {
    result = await fgetFacebook(url);
  }

  // ── Universal Mever Fallback ──
  if (!result) {
    try {
      const mever = new MeverClient();
      const data = await mever.run({ mode, url });
      if (data) {
        const mediaUrl = extractMediaUrl(data);
        const title = extractTitle(data);
        if (mediaUrl) {
          const isAudio = ['soundcloud', 'spotify', 'applemusic'].includes(mode)
            || mediaUrl.includes('.mp3') || mediaUrl.includes('.m4a');
          result = { type: isAudio ? 'audio' : 'video', url: mediaUrl, title };
        }
      }
    } catch (_) {}
  }

  if (!result) return; // Silently fail for auto-download

  const caption = t(
    `📥 *${mode.toUpperCase()}* Download ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `📥 تحميل من *${mode.toUpperCase()}* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `📥 تحميل من *${mode.toUpperCase()}* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
  );

  try {
    if (result.type === 'audio') {
      await conn.sendMessage(m.chat, {
        audio: { url: result.url },
        mimetype: 'audio/mp4',
        fileName: `${result.title || mode}.mp3`
      }, { quoted: m });

    } else if (result.type === 'video') {
      const sizeOk = await assertFileSizeOk(result.url, m, lang, 300 * 1024 * 1024);
      if (!sizeOk) return;
      await conn.sendMessage(m.chat, {
        video: { url: result.url },
        caption,
        mimetype: 'video/mp4'
      }, { quoted: m });

    } else if (result.type === 'photos' && result.urls?.length > 0) {
      // Send all photos (carousel)
      const headerMsg = t(
        `📸 *${mode.toUpperCase()} Album* — ${result.urls.length} item(s)`,
        `📸 *ألبوم ${mode.toUpperCase()}* — ${result.urls.length} صورة`,
        `📸 *ألبوم ${mode.toUpperCase()}* — ${result.urls.length} صورة`
      );
      await m.reply(headerMsg);

      for (let i = 0; i < result.urls.length; i++) {
        const imgUrl = result.urls[i];
        const isVid = imgUrl.includes('.mp4') || imgUrl.includes('video');
        try {
          if (isVid) {
            await conn.sendMessage(m.chat, {
              video: { url: imgUrl },
              caption: `${i + 1}/${result.urls.length}`,
              mimetype: 'video/mp4'
            }, { quoted: m });
          } else {
            await conn.sendMessage(m.chat, {
              image: { url: imgUrl },
              caption: `${i + 1}/${result.urls.length}`
            }, { quoted: m });
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
      }

      // If TikTok slideshow, also send the audio
      if (result.audio) {
        try {
          await conn.sendMessage(m.chat, {
            audio: { url: result.audio },
            mimetype: 'audio/mpeg',
            fileName: `${result.title || 'audio'}.mp3`
          }, { quoted: m });
        } catch (_) {}
      }
    }

    await m.react('✅');
  } catch (e) {
    console.error('[AutoDownload] Send error:', e.message);
  }
};

export default handler;
