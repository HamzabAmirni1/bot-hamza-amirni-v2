// ============================================================
// aptoide.js — Dedicated Aptoide Official Store APK Downloader
// High-Speed Direct CDN Streaming | Zero-RAM
// ============================================================

import axios from 'axios';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

function cleanFileName(text) {
  let cleaned = (text || 'app')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[^\w\s\u0600-\u06FF.-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.apk$/i, '')
    .trim();
  return cleaned || 'app';
}

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
  // ── 1. Direct Download Mode: .aptdl <package_or_name> ───────────
  if (/^aptdl$/i.test(command)) {
    const target = (text || args[0] || '').trim();
    if (!target) return m.reply(`المرجو إدخال اسم التطبيق أو الحزمة للتحميل من Aptoide:\n← ${usedPrefix}aptdl com.whatsapp`);

    await m.react('⏳');

    try {
      const { data } = await axios.get(
        `https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(target)}&limit=1`,
        { headers: HEADERS, timeout: 10000 }
      );

      const app = data?.datalist?.list?.[0];
      if (!app || !app.file?.path) {
        await m.react('❌');
        return m.reply(`❌ لم يتم العثور على التطبيق في متجر Aptoide. جرب البحث عبر:\n← ${usedPrefix}aptoide ${target}`);
      }

      const downloadUrl = app.file.path_alt || app.file.path;
      const appTitle = app.name || 'Application';
      const appIcon = app.icon || '';
      const sizeMB = app.size ? Number(app.size) / (1024 * 1024) : 0;

      if (sizeMB > 300) {
        await m.react('❌');
        return conn.reply(
          m.chat,
          `📦 *${appTitle}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚖️ *الحجم:* ${sizeMB.toFixed(1)} MB\n` +
          `⚠️ *الملف أكبر من 300MB ولا يمكن إرساله عبر واتساب.*\n\n` +
          `🔗 *رابط التحميل المباشر من Aptoide:*\n${downloadUrl}\n\n` +
          `⚡ *bot amirni hamza*`,
          m
        );
      }

      // Send photo preview with loading message
      if (appIcon) {
        try {
          await conn.sendMessage(m.chat, {
            image: { url: appIcon },
            caption: `📦 *${appTitle}*\n⏳ *جاري تجهيز وتحميل ملف الـ APK من متجر Aptoide...*\n\n⚡ *bot amirni hamza*`
          }, { quoted: m });
        } catch (_) {}
      }

      const safeName = cleanFileName(appTitle);

      try {
        const { downloadWithProgress } = await import('../lib/downloadProgress.js');
        await downloadWithProgress(downloadUrl, {
          m, conn,
          title: appTitle,
          emoji: '📦',
        });
      } catch (pErr) {
        console.log('[Aptoide] Progress bar stream notice:', pErr.message);
      }

      await conn.sendMessage(m.chat, {
        document: { url: downloadUrl },
        mimetype: 'application/vnd.android.package-archive',
        fileName: `${safeName}.apk`,
        caption: `📦 *${appTitle}*\n🏪 *المصدر:* متجر Aptoide الرسمي\n⚡ *bot amirni hamza*`
      }, { quoted: m });

      return m.react('✅');
    } catch (err) {
      console.error('[Aptoide DL Error]', err.message);
      await m.react('❌');
      return m.reply(`❌ فشل تحميل الملف من متجر Aptoide: ${err.message}`);
    }
  }

  // ── 2. Search Mode: .aptoide / .apt <query> ───────────
  const query = (text || '').trim();
  if (!query) {
    const userLang = (m.sender && global.db?.data?.users?.[m.sender]?.language) || 'darija';
    const aptHelp = {
      darija: `🤖 *بوت حمزة اعمرني • متجر التطبيقات Aptoide*
━━━━━━━━━━━━━━━━━━━━━
🏪 *كيفاش تخدم الأمر:*

← \`${usedPrefix + command} <سمية التطبيق أو اللعبة>\`

📌 *أمثلة:*
← \`${usedPrefix + command} WhatsApp\`
← \`${usedPrefix + command} Telegram\`
← \`${usedPrefix + command} Spotify\`
← \`${usedPrefix + command} Free Fire\`

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`,
      arabic: `🤖 *بوت حمزة اعمرني • متجر التطبيقات Aptoide*
━━━━━━━━━━━━━━━━━━━━━
🏪 *طريقة الاستخدام:*

← \`${usedPrefix + command} <اسم التطبيق أو اللعبة>\`

📌 *أمثلة:*
← \`${usedPrefix + command} WhatsApp\`
← \`${usedPrefix + command} Telegram\`
← \`${usedPrefix + command} Spotify\`

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`,
      english: `🤖 *Hamza Amirni Bot • Aptoide App Store*
━━━━━━━━━━━━━━━━━━━━━
🏪 *How to use:*

← \`${usedPrefix + command} <app or game name>\`

📌 *Examples:*
← \`${usedPrefix + command} WhatsApp\`
← \`${usedPrefix + command} Spotify\`

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`
    };
    return m.reply(aptHelp[userLang] || aptHelp.darija);
  }

  await m.react('🔍');

  try {
    const { data } = await axios.get(
      `https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(query)}&limit=8`,
      { headers: HEADERS, timeout: 10000 }
    );

    const list = data?.datalist?.list || [];
    if (!list.length) {
      await m.react('❌');
      return conn.reply(m.chat, `❌ لم يتم العثور على نتائج لـ *"${query}"* في متجر Aptoide.`, m);
    }

    const headerText = `🏪 *Aptoide — نتائج البحث عن: "${query}"*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
    let textList = headerText;
    const rows = [];

    list.forEach((item, index) => {
      const num = index + 1;
      const sizeStr = item.size ? (Number(item.size) / (1024 * 1024)).toFixed(1) + ' MB' : '';
      const verStr = item.file?.vername || '';
      textList += `*${num}️⃣ ${item.name}*\n`;
      if (verStr || sizeStr) textList += `🔢 *الإصدار:* ${verStr} | ⚖️ *الحجم:* ${sizeStr || '—'}\n`;
      textList += `📥 *للتحميل:* ${usedPrefix}aptdl ${item.package || item.name}\n\n`;

      rows.push({
        title: `📦 ${num}. ${item.name.slice(0, 35)}`,
        description: `${sizeStr ? sizeStr + ' | ' : ''}${verStr || item.package || ''}`,
        id: `${usedPrefix}aptdl ${item.package || item.name}`
      });
    });

    textList += `━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`;

    try {
      await conn.sendButton(m.chat, {
        image: { url: list[0]?.icon || 'https://raw.githubusercontent.com/HamzabAmirni1/bot-hamza-amirni-v2/master/media/bot_logo.jpg' },
        caption: textList,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: '📥 اختر التطبيق لتحميله من Aptoide',
              sections: [{ title: '🏪 Aptoide App Store', rows }]
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📥 تحميل أول نتيجة',
              id: `${usedPrefix}aptdl ${list[0]?.package || list[0]?.name}`
            })
          }
        ]
      }, { quoted: m });
    } catch (_) {
      await conn.sendMessage(m.chat, { text: textList }, { quoted: m });
    }

    await m.react('✅');
  } catch (err) {
    console.error('[Aptoide Search Error]', err.message);
    await m.react('❌');
    return m.reply(`❌ تعذر الاتصال بمتجر Aptoide: ${err.message}`);
  }
};

handler.help = ['aptoide <الاسم>', 'apt <الاسم>', 'aptdl <package>'];
handler.tags = ['downloader'];
handler.command = /^(aptoide|apt|aptdl)$/i;
handler.limit = false;

export default handler;
