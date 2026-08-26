/*
  APKPure (apkpure.net) Scraper & Downloader
  Commands:
    .apkp <query>
    .apkpure <query>
    .apkpdl <package_or_url>
*/

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://apkpure.net';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  'Referer': 'https://apkpure.net/'
};

export class APKPureScraper {
  /**
   * Search APKPure for apps and games
   */
  static async search(query) {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
      const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(html);
      const results = [];

      // 1. Check Brand top result (Featured result)
      const brandTop = $('.search-brand-container');
      if (brandTop.length > 0) {
        const title = brandTop.find('.brand-top .top').text().trim();
        const link = brandTop.find('.brand-top .top').attr('href') || brandTop.find('.brand-bottom a').attr('href');
        const icon = brandTop.find('.brand-top img').attr('src') || '';
        const dev = brandTop.find('.brand-top .developer').text().trim();
        const rating = brandTop.find('.brand-middle .head').text().trim();

        if (title && link) {
          results.push({
            title,
            link: link.startsWith('http') ? link : `${BASE_URL}${link}`,
            icon,
            dev,
            rating,
            featured: true
          });
        }
      }

      // 2. Check regular search list (.apk-item)
      $('.apk-list .apk-item, .apk-item').each((_, el) => {
        const title = $(el).find('.title').text().trim() || $(el).find('a').attr('title');
        let link = $(el).find('a').attr('href') || $(el).attr('href');
        const icon = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
        const dev = $(el).find('.dev').text().trim();
        const stars = $(el).find('.stars').text().trim();

        if (title && link) {
          if (!link.startsWith('http')) link = `${BASE_URL}${link}`;
          if (!results.some(r => r.link === link)) {
            results.push({
              title,
              link,
              icon,
              dev,
              rating: stars || 'N/A'
            });
          }
        }
      });

      return results;
    } catch (e) {
      console.error('[APKPure Search Error]', e.message);
      return [];
    }
  }

  /**
   * Extract download link from APKPure app page
   */
  static async getDownloadUrl(appUrl) {
    try {
      // Direct CDN APKPure link pattern: https://d.apkpure.com/b/APK/<package_name>?version=latest
      let pkg = (appUrl.match(/[\/=]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)/) || [])[1];
      
      const cleanUrl = appUrl.replace(/\/$/, '');
      const downloadPage = cleanUrl.endsWith('/download') ? cleanUrl : `${cleanUrl}/download`;
      
      try {
        const { data: html } = await axios.get(downloadPage, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(html);
        const directBtn = $('#download_link, a.download-btn, a[href*="d.apkpure.com"]').attr('href');
        if (directBtn) return directBtn;
      } catch (_) {}

      if (pkg) {
        return `https://d.apkpure.com/b/APK/${pkg}?version=latest`;
      }

      return null;
    } catch (e) {
      console.error('[APKPure Download Extraction Error]', e.message);
      return null;
    }
  }
}

function cleanFileName(text) {
  return (text || 'app').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
  // ── Download mode: .apkpdl <url_or_pkg> ───────────
  if (/^apkpdl$/i.test(command)) {
    const target = (text || args[0] || '').trim();
    if (!target) return m.reply(`المرجو وضع اسم الحزمة أو الرابط:\n← ${usedPrefix}apkpdl com.whatsapp`);

    await m.react('⏳');

    let downloadUrl = '';
    let appTitle = 'APKPure App';

    if (target.startsWith('http') && target.includes('apkpure')) {
      downloadUrl = await APKPureScraper.getDownloadUrl(target);
    } else if (target.includes('.')) {
      downloadUrl = `https://d.apkpure.com/b/APK/${target}?version=latest`;
      appTitle = target;
    } else {
      const searchRes = await APKPureScraper.search(target);
      if (searchRes.length > 0) {
        downloadUrl = await APKPureScraper.getDownloadUrl(searchRes[0].link);
        appTitle = searchRes[0].title;
      }
    }

    if (!downloadUrl) {
      await m.react('❌');
      return m.reply('❌ لم نتمكن من العثور على رابط التحميل المباشر من APKPure.');
    }

    try {
      // Check file size
      let sizeMB = 0;
      try {
        const head = await axios.head(downloadUrl, { headers: HEADERS, timeout: 10000 });
        sizeMB = Number(head.headers['content-length'] || 0) / (1024 * 1024);
      } catch (_) {}

      if (sizeMB > 95) {
        await m.react('✅');
        return conn.reply(
          m.chat,
          `📦 *${appTitle}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚖️ *الحجم:* ${sizeMB ? sizeMB.toFixed(1) + ' MB' : 'أكبر من 95 MB'}\n` +
          `⚠️ *الملف كبير الحجم بالنسبة للواتساب.*\n\n` +
          `🔗 *رابط التحميل المباشر والسريع من APKPure:*\n${downloadUrl}\n\n` +
          `⚡ *bot amirni hamza*`,
          m
        );
      }

      await conn.reply(m.chat, `⏳ جاري تحميل وتجهيز ملف الـ APK من APKPure...`, m);

      const fileRes = await axios.get(downloadUrl, {
        headers: HEADERS,
        responseType: 'arraybuffer',
        timeout: 180000
      });

      const buffer = Buffer.from(fileRes.data);
      const isXapk = downloadUrl.includes('.xapk') || downloadUrl.includes('xapk');
      const ext = isXapk ? 'xapk' : 'apk';
      const safeName = cleanFileName(appTitle);

      await conn.sendMessage(m.chat, {
        document: buffer,
        mimetype: 'application/vnd.android.package-archive',
        fileName: `${safeName}.${ext}`,
        caption: `📦 *${appTitle}*\n✅ *تم التحميل بنجاح من APKPure*\n⚡ *bot amirni hamza*`
      }, { quoted: m });

      return m.react('✅');
    } catch (err) {
      console.error('[APKPure DL Error]', err.message);
      await m.react('❌');
      return m.reply(`❌ فشل تحميل الملف مباشرة من APKPure: ${err.message}\n🔗 رابط التحميل:\n${downloadUrl}`);
    }
  }

  // ── Search mode: .apkp / .apkpure <query> ───────────
  const query = (text || '').trim();
  if (!query) {
    return conn.reply(
      m.chat,
      `🟢 *APKPure — متجر التطبيقات والألعاب APK*\n\n` +
      `ابحث وحمّل أحدث التطبيقات والألعاب الرسمية مباشرة من متجر APKPure.\n\n` +
      `*طريقة الاستخدام:*\n` +
      `← ${usedPrefix}apkp <اسم اللعبة أو التطبيق>\n\n` +
      `*أمثلة:*\n` +
      `← ${usedPrefix}apkp WhatsApp\n` +
      `← ${usedPrefix}apkp Free Fire\n` +
      `← ${usedPrefix}apkp Instagram\n\n` +
      `⚡ *bot amirni hamza*`,
      m
    );
  }

  await m.react('🔍');

  const results = await APKPureScraper.search(query);
  if (!results.length) {
    await m.react('❌');
    return conn.reply(m.chat, `❌ لم يتم العثور على نتائج لـ *"${query}"* في موقع APKPure.`, m);
  }

  const headerText = `🟢 *APKPure — نتائج البحث عن: "${query}"*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  let textList = headerText;
  const rows = [];

  results.slice(0, 8).forEach((item, index) => {
    const num = index + 1;
    textList += `*${num}️⃣ ${item.title}*\n`;
    if (item.dev) textList += `👤 *المطور:* ${item.dev}\n`;
    if (item.rating && item.rating !== 'N/A') textList += `⭐ *التقييم:* ${item.rating}\n`;
    textList += `📥 *للتحميل:* ${usedPrefix}apkpdl ${item.link}\n\n`;

    rows.push({
      title: `📦 ${num}. ${item.title.slice(0, 35)}`,
      description: item.dev ? item.dev.slice(0, 30) : 'APKPure',
      id: `${usedPrefix}apkpdl ${item.link}`
    });
  });

  textList += `━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`;

  try {
    await conn.sendButton(m.chat, {
      image: { url: results[0]?.icon || 'https://apkpure.net/favicon_v2.ico' },
      caption: textList,
      footer: 'bot amirni hamza',
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: '📥 اختر التطبيق للتحميل',
            sections: [{ title: '🟢 APKPure Store', rows }]
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '📥 تحميل أول تطبيق',
            id: `${usedPrefix}apkpdl ${results[0]?.link}`
          })
        }
      ]
    }, { quoted: m });
  } catch (_) {
    await conn.sendMessage(m.chat, { text: textList }, { quoted: m });
  }

  await m.react('✅');
};

handler.help = ['apkp'];
handler.command = /^(apkp|apkpure|apkpdl)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
