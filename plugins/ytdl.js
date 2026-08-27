/*
  YouTube Downloader — Unified 7-Provider Fallback Engine
  Supports video and audio downloads
*/

import axios from 'axios';
import yts from 'yt-search';
import { downloadYouTube, getVideoId, cleanTitle } from '../lib/ytdl.js';
import { downloadWithProgress } from '../lib/downloadProgress.js';

let handler = async (m, { conn, args, text, usedPrefix, command }) => {
  const query = (text || args[0] || '').trim();
  if (!query) {
    return conn.reply(m.chat,
      `📥 *『 محمل يوتيوب الشامل 』*\n\n` +
      `حمل أي فيديو أو مقطع من يوتيوب مباشرة.\n\n` +
      `*الاستخدام:* ${usedPrefix + command} <رابط يوتيوب أو اسم الفيديو> [الجودة]\n` +
      `*الجودات:* 144, 240, 360, 480, 720, 1080 (الافتراضي: 720)\n\n` +
      `*أمثلة:*\n` +
      `← ${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ\n` +
      `← ${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ 480\n\n` +
      `⚡ *bot amirni hamza*`,
      m
    );
  }

  const format = args[1] || '720';
  await m.react('⏳');

  try {
    let videoUrl = query;
    let videoTitle = 'YouTube Video';
    let thumbnail = '';

    if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
      const search = await yts(query);
      const topVideo = search?.videos?.[0];
      if (!topVideo) {
        await m.react('❌');
        return m.reply('❌ لم يتم العثور على نتائج في يوتيوب.');
      }
      videoUrl = topVideo.url;
      videoTitle = topVideo.title;
      thumbnail = topVideo.thumbnail || topVideo.image || '';
    }

    const data = await downloadYouTube(videoUrl, 'mp4', format);
    const safeTitle = cleanTitle(data.title || videoTitle);
    const thumbUrl = data.thumbnail || thumbnail;

    // Check size limit (max 300MB)
    try {
      const head = await axios.head(data.download, { timeout: 8000 });
      const sizeMB = Number(head.headers['content-length'] || 0) / (1024 * 1024);
      if (sizeMB > 300) {
        await m.react('❌');
        return conn.reply(m.chat, `❌ الفيديو كبير جداً (${sizeMB.toFixed(1)} MB) — أكبر من 300MB ولا يمكن إرساله عبر واتساب.\n\n🔗 رابط التحميل المباشر:\n${data.download}`, m);
      }
    } catch (_) {}

    // Send thumbnail preview if available
    if (thumbUrl) {
      try {
        await conn.sendMessage(m.chat, {
          image: { url: thumbUrl },
          caption: `🎥 *${safeTitle}*\n⏳ *جاري تجهيز وتحميل الفيديو...*\n\n⚡ *bot amirni hamza*`
        }, { quoted: m });
      } catch (_) {}
    }

    // Live progress bar tracking
    try {
      await downloadWithProgress(data.download, {
        m, conn,
        title: safeTitle,
        emoji: '🎥',
      });
    } catch (pErr) {
      console.log('[YTDL] Progress bar notice:', pErr.message);
    }

    // Stream directly via Baileys (0% RAM overhead)
    await conn.sendMessage(m.chat, {
      document: { url: data.download },
      mimetype: 'video/mp4',
      fileName: `${safeTitle}.mp4`,
      caption: `🎥 *${safeTitle}*\n✅ *تم التحميل بنجاح*\n⚡ *bot amirni hamza*`
    }, { quoted: m });

    await m.react('✅');
  } catch (err) {
    console.error('[YTDL Error]', err.message);
    await m.react('❌');
    conn.reply(m.chat, `❌ ${err.message || 'فشل تحميل الفيديو من يوتيوب. المرجو المحاولة مجدداً.'}`, m);
  }
};

handler.help = ['ytdl', 'youtube', 'yt', 'يوتيوب'];
handler.command = /^(ytdl|yt|youtube|يوتيوب)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
