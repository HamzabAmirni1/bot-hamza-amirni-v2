import yts from 'yt-search';

let handler = async (m, { conn, usedPrefix, command, text }) => {
 let user = global.db.data.users[m.sender] || {};
 let lang = user.language || 'darija';
 const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

 if (!text) throw t(`Usage: ${usedPrefix + command} Saad Lamjarred`, `الاستخدام: ${usedPrefix + command} سعد لمجرد`, `📌 كتب اسم المقطع أو الأغنية:\nمثال: ${usedPrefix + command} tflow`);

 m.react('🔍');

 try {
  const search = await yts(text);

  const results = search.videos.slice(0, 10);

  if (!results.length) {
   m.react('❌');
   return m.reply(t(`❌ No results found on YouTube for "${text}". Try another song name.`, `❌ لم يتم العثور على أي نتائج في يوتيوب عن "${text}". حاول باسم آخر.`, `❌ مالقينا حتى نتيجة فـ يوتيوب بهاد الاسم: "*${text}*".\nجرب تكتب اسم الأغنية أو الفنان (مثال: ${usedPrefix}play tflow)`));
  }

  const Audio = results.map((item) => ({
   title: item.title,
   description: `🕛 ${item.timestamp} | 👤 ${item.author.name}`,
   id: `${usedPrefix}ytmp3 ${item.url}`,
  }));

  const Video = results.map((item) => ({
   title: item.title,
   description: `🕛 ${item.timestamp} | 👤 ${item.author.name}`,
   id: `${usedPrefix}ytmp4 ${item.url}`,
  }));

  await conn.sendButton(
   m.chat,
   {
    text: t(`Search results for "${text}"`, `نتائج البحث عن "${text}"`, `نتائج البحث عن "${text}"`),
    footer: global.namebot || 'bot amirni hamza',
    buttons: [
     {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
       title: t('Audio (MP3)', 'صوتيات (MP3)', 'صوت (MP3)'),
       sections: [
        {
         title: t('Audio List', 'قائمة الصوتيات', 'قائمة الصوتيات'),
         rows: Audio,
        },
       ],
      }),
     },
     {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
       title: t('Video (MP4)', 'فيديوهات (MP4)', 'فيديو (MP4)'),
       sections: [
        {
         title: t('Video List', 'قائمة الفيديوهات', 'قائمة الفيديوهات'),
         rows: Video,
        },
       ],
      }),
     },
     {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
       display_text: '📢 WhatsApp Channel',
       url: 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
      })
     },
     {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
       display_text: '📸 Instagram',
       url: 'https://www.instagram.com/hamza_amirni_01'
      })
     },
    ],
    messageParamsJson: JSON.stringify({
     bottom_sheet: {
      list_title: 'YouTube Downloader',
      button_title: t('Choose Format', 'اختر الصيغة', 'عزل الصيغة'),
      in_thread_buttons_limit: 1,
     },
    }),
   },
   { quoted: m }
  );
 } catch (e) {
  console.error(e);
  m.reply(String(e));
 }
};

handler.help = ['yts <name>', 'yts2 <name>'];
handler.tags = ['downloader', 'tools'];
handler.command = /^(yts|yts2|youtubesearch|youtubesearch2)$/i;
handler.limit = false;

export default handler;
