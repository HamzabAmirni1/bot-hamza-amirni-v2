import yts from 'yt-search';
import { downloadYouTube, getVideoId, cleanTitle } from '../lib/ytdl.js';
import { downloadWithProgress } from '../lib/downloadProgress.js';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  let user = global.db?.data?.users?.[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : (da || ar);

  const query = (text || '').trim();
  if (!query) {
    const guide =
      `🎵 *『 محمل صوتيات يوتيوب MP3 』*\n\n` +
      `تحميل الصوتيات والأغاني من يوتيوب بجودة عالية MP3.\n\n` +
      `*طريقة الاستخدام:*\n` +
      `← ${usedPrefix + command} <رابط يوتيوب أو اسم الأغنية>\n\n` +
      `*أمثلة:*\n` +
      `← ${usedPrefix + command} https://youtu.be/dQw4w9WgXcQ\n` +
      `← ${usedPrefix + command} Saad Lamjarred Ghazali\n\n` +
      `⚡ *bot amirni hamza*`;

    return conn.reply(m.chat, guide, m);
  }

  await m.react('⏳');

  try {
    let videoUrl = query;
    let videoTitle = 'YouTube Audio';
    let thumbnail = '';

    // If query is not a direct URL, search YouTube first
    if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
      const search = await yts(query);
      const topVideo = search?.videos?.[0];
      if (!topVideo) {
        await m.react('❌');
        return m.reply(t('❌ No YouTube results found.', '❌ لم يتم العثور على نتائج في يوتيوب.', '❌ مالقينا حتى نتيجة فـ يوتيوب.'));
      }
      videoUrl = topVideo.url;
      videoTitle = topVideo.title;
      thumbnail = topVideo.thumbnail || topVideo.image || '';
    }

    // Download via 7-provider fallback engine
    const result = await downloadYouTube(videoUrl, 'mp3');
    const safeTitle = cleanTitle(result.title || videoTitle);
    const thumbUrl = result.thumbnail || thumbnail;

    // Send thumbnail preview if available
    if (thumbUrl) {
      try {
        await conn.sendMessage(m.chat, {
          image: { url: thumbUrl },
          caption: `🎵 *${safeTitle}*\n⏳ *جاري تجهيز وتحميل ملف الـ MP3...*\n\n⚡ *bot amirni hamza*`
        }, { quoted: m });
      } catch (_) {}
    }

    // Live progress bar tracking
    try {
      await downloadWithProgress(result.download, {
        m, conn,
        title: safeTitle,
        emoji: '🎵',
      });
    } catch (pErr) {
      console.log('[ytmp3] Progress notice:', pErr.message);
    }

    // Dispatch MP3 via Baileys native URL streaming (0 RAM)
    await conn.sendMessage(m.chat, {
      audio: { url: result.download },
      mimetype: 'audio/mpeg',
      fileName: `${safeTitle}.mp3`,
      ptt: false
    }, { quoted: m });

    await m.react('✅');
  } catch (err) {
    console.error('[ytmp3 error]', err.message);
    await m.react('❌');
    conn.reply(m.chat, `❌ ${err.message || 'فشل تحميل الصوت من يوتيوب. المرجو المحاولة مجدداً.'}`, m);
  }
};

handler.help = ['ytmp3', 'yta', 'ytaudio', 'mp3', 'صوت_يوتيوب'];
handler.command = /^(ytmp3|yta|ytaudio|mp3|صوت_يوتيوب)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
