/*
  Uptodown (uptodown.com) Scraper & Downloader
  Commands:
    .apku <query>
    .uptodown <query>
    .apkudl <url_or_name>
*/

import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  'Referer': 'https://ar.uptodown.com/'
};

export class UptodownScraper {
  /**
   * Search Uptodown for apps and games
   */
  static async search(query) {
    try {
      // 1. Try DuckDuckGo / Google site-specific search or Uptodown search
      const searchUrl = `https://html.duckduckgo.com/html/?q=site:uptodown.com/android+${encodeURIComponent(query)}`;
      const { data: html } = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(html);
      const results = [];

      $('.result__body').each((_, el) => {
        const titleRaw = $(el).find('.result__title a').text().trim();
        let link = $(el).find('.result__title a').attr('href') || '';
        const snippet = $(el).find('.result__snippet').text().trim();

        // Decode DDG redirect URL if present
        if (link.includes('uddg=')) {
          const match = link.match(/uddg=([^&]+)/);
          if (match) link = decodeURIComponent(match[1]);
        }

        if (link.includes('uptodown.com/android') && !link.endsWith('/android') && !link.includes('/versions')) {
          const cleanTitle = titleRaw.replace(/\s*\(Android\)\s*|\s*-\s*تنزيل\s*|\s*-\s*Download\s*|\s*\|\s*Uptodown\.com\s*/gi, '').trim();
          if (cleanTitle && !results.some(r => r.link === link)) {
            results.push({
              title: cleanTitle,
              link,
              snippet: snippet.slice(0, 80)
            });
          }
        }
      });

      // 2. If results found, return them
      if (results.length > 0) return results;

      // Fallback: search via Siputzx API for Uptodown
      try {
        const apiRes = await axios.get(`https://api.siputzx.my.id/api/apk/uptodown?q=${encodeURIComponent(query)}`, { timeout: 8000 });
        if (apiRes.data?.data) {
          return (Array.isArray(apiRes.data.data) ? apiRes.data.data : [apiRes.data.data]).map(a => ({
            title: a.name || a.title || query,
            link: a.link || a.url,
            icon: a.icon || a.image,
            version: a.version || 'Latest',
            size: a.size || ''
          }));
        }
      } catch (_) {}

      return [];
    } catch (e) {
      console.error('[Uptodown Search Error]', e.message);
      return [];
    }
  }

  /**
   * Extract direct download link from Uptodown app page
   */
  static async getDownloadUrl(appUrl) {
    try {
      const cleanUrl = appUrl.replace(/\/$/, '');
      const downloadPage = cleanUrl.endsWith('/download') ? cleanUrl : `${cleanUrl}/download`;

      const { data: html } = await axios.get(downloadPage, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(html);

      // Extract download button data-url or href
      let directUrl = $('#detail-download-button').attr('data-url') ||
                      $('button[data-url]').attr('data-url') ||
                      $('a.button.download').attr('href') ||
                      $('a[href*="/post-download/"]').attr('href');

      if (directUrl && !directUrl.startsWith('http')) {
        const origin = new URL(downloadPage).origin;
        directUrl = `${origin}${directUrl}`;
      }

      return directUrl || null;
    } catch (e) {
      console.error('[Uptodown Download Extraction Error]', e.message);
      return null;
    }
  }
}

function cleanFileName(text) {
  return (text || 'app').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
  // ── Download mode: .apkudl <url_or_name> ───────────
  if (/^apkudl$/i.test(command)) {
    const target = (text || args[0] || '').trim();
    if (!target) return m.reply(`المرجو وضع الرابط للتحميل:\n← ${usedPrefix}apkudl https://whatsapp-messenger.ar.uptodown.com/android`);

    await m.react('⏳');

    let downloadUrl = '';
    let appTitle = 'Uptodown App';

    if (target.startsWith('http') && target.includes('uptodown.com')) {
      downloadUrl = await UptodownScraper.getDownloadUrl(target);
    } else {
      const searchRes = await UptodownScraper.search(target);
      if (searchRes.length > 0) {
        downloadUrl = await UptodownScraper.getDownloadUrl(searchRes[0].link);
        appTitle = searchRes[0].title;
      }
    }

    if (!downloadUrl) {
      await m.react('❌');
      return m.reply('❌ لم نتمكن من استخراج رابط التحميل من Uptodown. تأكد من صحة الرابط.');
    }

    try {
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
          `🔗 *رابط التحميل المباشر والسريع من Uptodown:*\n${downloadUrl}\n\n` +
          `⚡ *bot amirni hamza*`,
          m
        );
      }

      await conn.reply(m.chat, `⏳ جاري تحميل وتجهيز ملف الـ APK من Uptodown...`, m);

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
        caption: `📦 *${appTitle}*\n✅ *تم التحميل بنجاح من Uptodown*\n⚡ *bot amirni hamza*`
      }, { quoted: m });

      return m.react('✅');
    } catch (err) {
      console.error('[Uptodown DL Error]', err.message);
      await m.react('❌');
      return m.reply(`❌ فشل تحميل الملف مباشرة من Uptodown: ${err.message}\n🔗 رابط التحميل:\n${downloadUrl}`);
    }
  }

  // ── Search mode: .apku / .uptodown <query> ───────────
  const query = (text || '').trim();
  if (!query) {
    return conn.reply(
      m.chat,
      `🔵 *Uptodown — متجر التطبيقات والألعاب APK*\n\n` +
      `ابحث وحمّل أحدث التطبيقات والألعاب الرسمية والتاريخية من متجر Uptodown الشهير.\n\n` +
      `*طريقة الاستخدام:*\n` +
      `← ${usedPrefix}apku <اسم اللعبة أو التطبيق>\n\n` +
      `*أمثلة:*\n` +
      `← ${usedPrefix}apku WhatsApp\n` +
      `← ${usedPrefix}apku Telegram\n` +
      `← ${usedPrefix}apku Subway Surfers\n\n` +
      `⚡ *bot amirni hamza*`,
      m
    );
  }

  await m.react('🔍');

  const results = await UptodownScraper.search(query);
  if (!results.length) {
    await m.react('❌');
    return conn.reply(m.chat, `❌ لم يتم العثور على نتائج لـ *"${query}"* في متجر Uptodown.`, m);
  }

  const headerText = `🔵 *Uptodown — نتائج البحث عن: "${query}"*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  let textList = headerText;
  const rows = [];

  results.slice(0, 8).forEach((item, index) => {
    const num = index + 1;
    textList += `*${num}️⃣ ${item.title}*\n`;
    if (item.snippet) textList += `📝 ${item.snippet}\n`;
    textList += `📥 *للتحميل:* ${usedPrefix}apkudl ${item.link}\n\n`;

    rows.push({
      title: `📦 ${num}. ${item.title.slice(0, 35)}`,
      description: 'Uptodown Android',
      id: `${usedPrefix}apkudl ${item.link}`
    });
  });

  textList += `━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`;

  try {
    await conn.sendButton(m.chat, {
      image: { url: results[0]?.icon || 'https://stc.utdstc.com/img/Uptodown-card-template-Facebook.png' },
      caption: textList,
      footer: 'bot amirni hamza',
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: '📥 اختر التطبيق للتحميل',
            sections: [{ title: '🔵 Uptodown Store', rows }]
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '📥 تحميل أول تطبيق',
            id: `${usedPrefix}apkudl ${results[0]?.link}`
          })
        }
      ]
    }, { quoted: m });
  } catch (_) {
    await conn.sendMessage(m.chat, { text: textList }, { quoted: m });
  }

  await m.react('✅');
};

handler.help = ['apku'];
handler.command = /^(apku|uptodown|apkudl)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
