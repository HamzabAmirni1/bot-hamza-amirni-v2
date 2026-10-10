import { toAudio } from '../lib/converter.js';

let handler = async (m, { conn, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || q.mediaType || '';

  if (!/video|audio/.test(mime)) {
    return m.reply(
      `🎵 *محول الصوتيات إلى MP3*\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *طريقة الاستعمال:*\n` +
      `قم بالرد على أي فيديو أو مقطع صوتي (أو فويس) بالأمر:\n` +
      `← *${usedPrefix + command}*\n\n` +
      `⚡ *bot amirni hamza • حمزة اعمرني*`
    );
  }

  await m.react('⏳');

  try {
    let media = await q.download();
    if (!media) throw 'فشل تحميل الملف!';

    let ext = /video/.test(mime) ? 'mp4' : (mime.split('/')[1]?.split(';')[0]?.replace('vnd.wave', 'wav') || 'ogg');
    let audio = await toAudio(media, ext);
    if (!audio?.data) throw 'فشل تحويل الملف إلى MP3!';

    await conn.sendMessage(m.chat, {
      audio: audio.data,
      mimetype: 'audio/mpeg',
      fileName: `audio_${Date.now()}.mp3`
    }, { quoted: m });

    await m.react('✅');
    if (audio.delete) audio.delete().catch(() => {});
  } catch (e) {
    console.error('[TOMP3] Error:', e);
    await m.react('❌');
    m.reply(`❌ فشل التحويل إلى MP3:\n${e.message || e}`);
  }
};

handler.help = ['tomp3', 'toaudio'];
handler.tags = ['tools', 'converter'];
handler.command = /^(tomp3|toaudio|mp3)$/i;

export default handler;
