import yts from 'yt-search';
import { downloadYouTube, getVideoId, cleanTitle } from '../lib/ytdl.js';
import { downloadWithProgress } from '../lib/downloadProgress.js';

const VALID_QUALITIES = ['144', '240', '360', '480', '720', '1080'];
const DEFAULT_QUALITY = '720';

const handler = async (m, { conn, usedPrefix, command, args, text }) => {
  const query = (text || args[0] || '').trim();
  const requestedQuality = (args[1] || '').replace(/p$/i, '');
  const quality = VALID_QUALITIES.includes(requestedQuality) ? requestedQuality : DEFAULT_QUALITY;

  if (!query) {
    return conn.reply(m.chat,
      `🎬 *『 محمل فيديوهات يوتيوب MP4 』*\n\n` +
      `تحميل الفيديوهات والريلز من يوتيوب بجودات متعددة.\n\n` +
      `*طريقة الاستخدام:*\n` +
      `← ${usedPrefix + command} <رابط يوتيوب أو اسم الفيديو> [الجودة]\n\n` +
      `*الجودات المتاحة:* 144, 240, 360, 480, 720, 1080 (الافتراضي: 720p)\n\n` +
      `*أمثلة:*\n` +
      `← ${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ 720\n` +
      `← ${usedPrefix + command} فيديو مضحك 480\n\n` +
      `⚡ *bot amirni hamza*`,
      m
    );
  }

  await m.react('⏳');

  try {
    let videoUrl = query;
    let videoTitle = 'YouTube Video';
    let thumbnail = '';

    // If query is not a direct URL, search YouTube first
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

    // Download via 7-provider fallback engine
    const result = await downloadYouTube(videoUrl, 'mp4', quality);
    const safeTitle = cleanTitle(result.title || videoTitle);
    const thumbUrl = result.thumbnail || thumbnail;

    // Send thumbnail preview if available
    if (thumbUrl) {
      try {
        await conn.sendMessage(m.chat, {
          image: { url: thumbUrl },
          caption: `🎬 *${safeTitle}*\n⏳ *جاري تجهيز وتحميل الفيديو...*\n\n⚡ *bot amirni hamza*`
        }, { quoted: m });
      } catch (_) {}
    }

    // Live progress bar tracking
    try {
      await downloadWithProgress(result.download, {
        m, conn,
        title: safeTitle,
        emoji: '🎬',
      });
    } catch (pErr) {
      console.log('[ytmp4] Progress bar notice:', pErr.message);
    }

    // Dispatch MP4 Video via Baileys native URL streaming (0 RAM)
    await conn.sendMessage(m.chat, {
      video: { url: result.download },
      mimetype: 'video/mp4',
      fileName: `${safeTitle}.mp4`,
      caption: `🎬 *${safeTitle}*\n📺 *الجودة:* ${quality}p\n⚡ *bot amirni hamza*`,
    }, { quoted: m });

    await m.react('✅');
  } catch (err) {
    console.error('[ytmp4 error]', err.message);
    await m.react('❌');
    conn.reply(m.chat, `❌ ${err.message || 'فشل تحميل الفيديو من يوتيوب. المرجو المحاولة مجدداً.'}`, m);
  }
};

handler.help = ['ytmp4', 'ytv', 'ytvideo', 'فيديو_يوتيوب'];
handler.command = /^(ytmp4|ytv|ytvideo|فيديو_يوتيوب)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;