/*
# Feature : Facebook Media Downloader (Video & Audio Selector)
# Type : ESM Plugin
# Source API : https://fget.io with fallbacks
*/
import axios from 'axios';
import * as cheerio from 'cheerio';

const fget = async (url) => {
  const endpoint = 'https://fget.io/process';
  const body = new URLSearchParams({ id: url, locale: 'id' });

  const { data: html } = await axios.post(endpoint, body.toString(), {
    headers: {
      'HX-Request': 'true',
      'HX-Trigger': 'form',
      'HX-Target': 'target',
      'HX-Current-URL': 'https://fget.io/id',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': '*/*',
      'Origin': 'https://fget.io',
      'Referer': 'https://fget.io/id'
    },
    timeout: 20000
  });

  const $ = cheerio.load(html);
  const result = {
    status: true,
    title: $('.result-title').first().text().trim() || null,
    thumbnail: $('.result-thumbnail img').attr('src') || null,
    video: [],
    audio: null
  };

  $('a.download-result').each((_, el) => {
    const a = $(el);
    const href = a.attr('href');
    const download = a.attr('download');
    if (!href) return;

    const quality = a
      .closest('div.flex.items-center')
      .find('.text-sm')
      .first()
      .text()
      .trim();

    const type = a.hasClass('hd')
      ? 'hd'
      : a.hasClass('sd')
        ? 'sd'
        : a.hasClass('mp3')
          ? 'mp3'
          : 'unknown';

    const item = { type, quality: quality || null, url: href, filename: download || null };

    if (type === 'mp3') {
      result.audio = item;
    } else {
      result.video.push(item);
    }
  });

  return result;
};

// Fallback provider: Siputzx
const siputzxFb = async (url) => {
  const { data } = await axios.get(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, { timeout: 15000 });
  if (data?.status && data?.data) {
    const d = data.data;
    const res = {
      status: true,
      title: d.title || null,
      thumbnail: d.thumbnail || null,
      video: [],
      audio: d.audio ? { type: 'mp3', url: d.audio } : null
    };
    if (d.hd) res.video.push({ type: 'hd', url: d.hd });
    if (d.sd) res.video.push({ type: 'sd', url: d.sd });
    if (!res.video.length && d.video) res.video.push({ type: 'hd', url: d.video });
    return res;
  }
  throw new Error('Siputzx no media');
};

const getFbMedia = async (url) => {
  try {
    const res = await fget(url);
    if (res.status && (res.video.length || res.audio)) return res;
  } catch (_) {}

  try {
    const res2 = await siputzxFb(url);
    if (res2.status && (res2.video.length || res2.audio)) return res2;
  } catch (_) {}

  throw new Error('No downloadable media found for this Facebook link.');
};

const isFbUrl = (str = '') => /facebook\.com|fb\.watch/i.test(str);

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const parts = (text || '').trim().split(/\s+/);
  const url = parts.find(p => isFbUrl(p)) || '';
  const isAudio = parts.some(p => /^(audio|mp3|sound|صوت)$/i.test(p));
  const isVideo = parts.some(p => /^(video|mp4|vid|فيديو)$/i.test(p));

  // No link provided -> show a guide card
  if (!url) {
    const guide = `
📥 *Facebook Media Downloader*
━━━━━━━━━━━━━━━━━━━━━
حمل مقاطع الفيديو والريلز والصوتيات من فيسبوك بكل سهولة.

*طريقة الاستخدام:*
← ${usedPrefix + command} <رابط فيسبوك>
← ${usedPrefix + command} <رابط فيسبوك> video (تحميل فيديو مباشرة)
← ${usedPrefix + command} <رابط فيسبوك> audio (تحميل صوت مباشرة)

*مثال:*
${usedPrefix + command} https://www.facebook.com/share/r/184NbDt7Lw/

⚡ *bot amirni hamza*
`.trim();

    return conn.reply(m.chat, guide, m);
  }

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    const result = await getFbMedia(url);

    const bestVideo =
      result.video.find((v) => v.type === 'hd') ||
      result.video.find((v) => v.type === 'sd') ||
      result.video[0];

    const hasVideo = !!bestVideo;
    const hasAudio = !!result.audio;

    // ── Mode 1: User didn't choose yet, and BOTH video & audio exist -> Show 2 Buttons! ──
    if (!isAudio && !isVideo && hasVideo && hasAudio) {
      const caption = `📥 *Facebook Media Downloader*\n━━━━━━━━━━━━━━━━━━━━━\n${result.title ? `🎬 *العنوان:* ${result.title}\n\n` : ''}👇 *اختر ماذا تريد تحميله (فيديو أو صوت):*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`;

      const buttons = [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🎥 تحميل فيديو MP4',
            id: `${usedPrefix + command} ${url} video`
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🎵 تحميل صوت MP3',
            id: `${usedPrefix + command} ${url} audio`
          })
        }
      ];

      try {
        if (result.thumbnail) {
          await conn.sendButton(m.chat, {
            image: { url: result.thumbnail },
            caption,
            footer: 'bot amirni hamza • حمزة اعمرني',
            buttons
          }, { quoted: m });
        } else {
          await conn.sendButton(m.chat, {
            body: caption,
            footer: 'bot amirni hamza • حمزة اعمرني',
            buttons
          }, { quoted: m });
        }
      } catch (_) {
        await conn.sendMessage(m.chat, { text: `${caption}\n\n← ${usedPrefix + command} ${url} video\n← ${usedPrefix + command} ${url} audio` }, { quoted: m });
      }

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return;
    }

    // ── Mode 2: Send ONLY Audio ──
    if (isAudio || (!hasVideo && hasAudio)) {
      if (!result.audio?.url) throw new Error('No audio found for this Facebook post.');
      await conn.sendMessage(
        m.chat,
        {
          audio: { url: result.audio.url },
          mimetype: 'audio/mpeg',
          fileName: `${result.title || 'facebook_audio'}.mp3`
        },
        { quoted: m }
      );
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return;
    }

    // ── Mode 3: Send ONLY Video ──
    if (isVideo || (hasVideo && !hasAudio) || (!isAudio && !isVideo)) {
      if (!bestVideo?.url) throw new Error('No video found for this Facebook post.');
      const caption = result.title ? `🎬 *${result.title}*\n\n⚡ *bot amirni hamza*` : '🎬 *Facebook Video*\n\n⚡ *bot amirni hamza*';
      await conn.sendMessage(
        m.chat,
        {
          video: { url: bestVideo.url },
          caption,
          mimetype: 'video/mp4'
        },
        { quoted: m }
      );
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
      return;
    }

  } catch (err) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat, `❌ Failed to download from Facebook: ${err.message}`, m);
  }
};

handler.help = ['fb', 'facebook', 'fbdl'];
handler.command = /^(fb|facebook|fbdl|فيس|فيسبوك)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
