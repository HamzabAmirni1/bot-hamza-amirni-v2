// APK Downloader Plugin

import axios from 'axios';

let handler = async (m, { conn, args }) => {
  const appName = args.join(" ");
  if (!appName) {
    return m.reply('المرجو كتابة اسم التطبيق. مثال: \n.apkdownload whatsapp');
  }

  // رسالة انتظار
  await m.reply("⏳ *المرجو الانتظار قليلاً جاري جلب وتجهيز التطبيق...*\n\n⚡ *bot amirni hamza • حمزة اعمرني*");

  try {
    const apiUrl = `https://api.nexoracle.com/downloader/apk`;
    const params = {
      apikey: 'free_key@maher_apis',
      q: appName
    };

    const response = await axios.get(apiUrl, { params });

    if (!response.data || response.data.status !== 200 || !response.data.result) {
      return m.reply('❌ لم يتم العثور على التطبيق. حاول مرة أخرى.');
    }

    const { name, lastup, package: pkg, size, icon, dllink } = response.data.result;

    // Parse size to avoid OOM
    let isTooLarge = false;
    const sizeMatch = String(size || '').match(/([\d.]+)\s*(MB|GB)/i);
    if (sizeMatch) {
      const val = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      if ((unit === 'MB' && val > 70) || unit === 'GB') isTooLarge = true;
    }

    if (isTooLarge) {
      await m.react('⚠️');
      const captionTooLarge = `📦 *معلومات التطبيق:*\n\n` +
                              `🔖 *الاسم:* ${name}\n` +
                              `📅 *آخر تحديث:* ${lastup}\n` +
                              `📦 *الحزمة:* ${pkg}\n` +
                              `📏 *الحجم:* ${size}\n\n` +
                              `⚠️ *الملف أكبر من 70MB ولا يمكن إرساله عبر واتساب تفادياً لتوقف البوت.*\n\n` +
                              `🔗 *رابط التحميل المباشر:*\n${dllink}\n\n` +
                              `⚡ *bot amirni hamza*`;
      return conn.sendMessage(m.chat, {
        image: { url: icon },
        caption: captionTooLarge
      }, { quoted: m });
    }

    // إرسال صورة التطبيق مع رسالة
    await conn.sendMessage(m.chat, {
      image: { url: icon },
      caption: `📦 *جاري تحميل ${name}...*\n\n⚡ *bot amirni hamza*`
    }, { quoted: m });

    const caption = `📦 *معلومات التطبيق:*\n\n` +
                    `🔖 *الاسم:* ${name}\n` +
                    `📅 *آخر تحديث:* ${lastup}\n` +
                    `📦 *الحزمة:* ${pkg}\n` +
                    `📏 *الحجم:* ${size}\n\n` +
                    `> 📥 تم التحميل بواسطة: bot amirni hamza`;

    await conn.sendMessage(m.chat, {
      document: { url: dllink },
      mimetype: 'application/vnd.android.package-archive',
      fileName: `${name}.apk`,
      caption
    }, { quoted: m });

    await m.reply("✅ تم إرسال التطبيق بنجاح");

  } catch (error) {
    console.error('خطأ أثناء تحميل التطبيق:', error);
    await m.reply('❌ حصل خطأ أثناء تحميل التطبيق.');
  }
};

handler.help = ['apkdownload'];
handler.tags = ['downloader'];
handler.command = ['apkdownload'];
handler.limit = false;
export default handler;
