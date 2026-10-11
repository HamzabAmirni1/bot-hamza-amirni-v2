import yts from 'yt-search';

let handler = async (m, { conn, usedPrefix, command, text }) => {
 let user = global.db.data.users[m.sender] || {};
 let lang = user.language || 'darija';
 const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

 if (!text) throw t(`Usage: ${usedPrefix + command} Saad Lamjarred`, `الاستخدام: ${usedPrefix + command} سعد لمجرد`, `📌 كتب اسم المقطع أو الأغنية:\nمثال: ${usedPrefix + command} tflow`);

 m.react('🔍');

 try {
  const search = await yts(text);

  const results = (search.videos || []).slice(0, 20);

  if (!results.length) {
   m.react('❌');
   return m.reply(t(`❌ No results found on YouTube for "${text}". Try another song name.`, `❌ لم يتم العثور على أي نتائج في يوتيوب عن "${text}". حاول باسم آخر.`, `❌ مالقينا حتى نتيجة فـ يوتيوب بهاد الاسم: "*${text}*".\nجرب تكتب اسم الأغنية أو الفنان (مثال: ${usedPrefix}play tflow)`));
  }

  // Clean formatted text with top results
  let textSummary = `🔍 *${t('YouTube Search Results for:', 'نتائج البحث في YouTube عن:', 'نتائج البحث في YouTube عن:')}*\n"${text}"\n\n`;
  results.forEach((v, i) => {
   textSummary += `*${i + 1}.* *${v.title}*\n`;
   textSummary += `   ⏱️ ${v.timestamp || '??'} | 👁️ ${v.views ? v.views.toLocaleString() : 'N/A'} | 👤 ${v.author?.name || 'YouTube'}\n`;
   textSummary += `   🔗 ${v.url}\n\n`;
  });
  textSummary += `💡 *${t('Direct Download Commands:', 'أوامر التحميل المباشر:', 'أوامر التحميل المباشر:')}*\n- 🎵 MP3: *${usedPrefix}ytmp3 <link>*\n- 🎬 MP4: *${usedPrefix}ytmp4 <link>*\n\n⚡ *bot amirni hamza*`;

  const Audio = results.map((item, idx) => ({
   title: `${idx + 1}. ${item.title.substring(0, 55)}`,
   description: `🕛 ${item.timestamp} | 👤 ${item.author?.name || 'YouTube'}`,
   id: `${usedPrefix}ytmp3 ${item.url}`,
  }));

  const Video = results.map((item, idx) => ({
   title: `${idx + 1}. ${item.title.substring(0, 55)}`,
   description: `🕛 ${item.timestamp} | 👤 ${item.author?.name || 'YouTube'}`,
   id: `${usedPrefix}ytmp4 ${item.url}`,
  }));

  try {
   await conn.sendButton(
    m.chat,
    {
     text: textSummary,
     footer: global.namebot || 'bot amirni hamza',
     buttons: [
      {
       name: 'single_select',
       buttonParamsJson: JSON.stringify({
        title: t('🎵 Audio (MP3)', '🎵 صوتيات (MP3)', '🎵 أوديو (MP3)'),
        sections: [
         {
          title: t(`Audio List (${results.length} results)`, `قائمة الصوتيات (${results.length} نتيجة)`, `قائمة الصوتيات (${results.length} نتيجة)`),
          rows: Audio,
         },
        ],
       }),
      },
      {
       name: 'single_select',
       buttonParamsJson: JSON.stringify({
        title: t('🎬 Video (MP4)', '🎬 فيديوهات (MP4)', '🎬 فيديو (MP4)'),
        sections: [
         {
          title: t(`Video List (${results.length} results)`, `قائمة الفيديوهات (${results.length} نتيجة)`, `قائمة الفيديوهات (${results.length} نتيجة)`),
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
  } catch (_) {
   await m.reply(textSummary);
  }
  await m.react('✅');
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
