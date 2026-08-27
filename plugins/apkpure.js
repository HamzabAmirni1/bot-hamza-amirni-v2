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
   * Extract download link and real title from APKPure app page or package
   */
  static async getDownloadDetails(appUrlOrPkg) {
    try {
      let pkg = '';
      let slugName = '';
      let pageUrl = '';

      if (appUrlOrPkg.startsWith('http')) {
        pageUrl = appUrlOrPkg.replace(/\/$/, '');
        // Extract package e.g. /com.instagram.lite or ?id=com.instagram.lite
        pkg = (pageUrl.match(/[\/=]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)/) || [])[1] || '';
        // Extract slug e.g. /instagram-lite-app/ -> "Instagram Lite App"
        const slugMatch = pageUrl.match(/apkpure\.net\/([^\/]+)/);
        if (slugMatch && slugMatch[1] && !slugMatch[1].includes('.')) {
          slugName = slugMatch[1].replace(/[-_]+/g, ' ').replace(/\bapk\b|\bapp\b/gi, '').trim();
          slugName = slugName.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
        }
      } else if (appUrlOrPkg.includes('.')) {
        pkg = appUrlOrPkg.trim();
        pageUrl = `https://apkpure.net/app/${pkg}`;
      }

      let realTitle = slugName || pkg || 'App';
      let downloadUrl = '';
      let icon = '';

      // 1. Try Aptoide CDN first (Rock solid, fast, never 403)
      if (pkg) {
        try {
          const { data } = await axios.get(`https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(pkg)}&limit=1`, { timeout: 8000 });
          const item = data?.datalist?.list?.[0];
          if (item?.file?.path) {
            downloadUrl = item.file.path_alt || item.file.path;
            if (item.name) realTitle = item.name;
            if (item.icon && !icon) icon = item.icon;
          }
        } catch (_) {}
      }

      // 2. Try fetching download page to get exact title and direct link if available
      try {
        const downloadPage = pageUrl.endsWith('/download') ? pageUrl : `${pageUrl}/download`;
        const { data: html } = await axios.get(downloadPage, { headers: HEADERS, timeout: 10000 });
        const $ = cheerio.load(html);

        const pageTitle = $('h1.title, .title_first, .info-title, h1, .banner h1').first().text().trim() ||
                          $('title').text().replace(/\s*-\s*APK.*|APKPure.*$/i, '').trim();
        if (pageTitle && pageTitle.length > 2 && !pageTitle.toLowerCase().includes('download')) {
          realTitle = pageTitle;
        }

        const iconSrc = $('img.icon, .banner img, .head-info img, .icon img').first().attr('src') ||
                        $('img[alt*="icon" i], img.pic').first().attr('src') || '';
        if (iconSrc && !icon) icon = iconSrc;

        const directBtn = $('#download_link, a.download-btn, a[href*="winudf.com"], a[href*="download.apkpure"]').attr('href');
        if (directBtn && !directBtn.includes('d.apkpure.com')) downloadUrl = directBtn;
      } catch (_) {}

      if (!downloadUrl && pkg) {
        downloadUrl = `https://d.apkpure.com/b/APK/${pkg}?version=latest`;
      }

      return {
        title: realTitle,
        downloadUrl,
        icon,
        pkg
      };
    } catch (e) {
      console.error('[APKPure Download Extraction Error]', e.message);
      return { title: 'App', downloadUrl: null, icon: '' };
    }
  }
}

function cleanFileName(text) {
  return (text || 'app')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.apk$/i, '')
    .trim();
}

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
  // ── Download mode: .apkpdl <url_or_pkg> ───────────
  if (/^apkpdl$/i.test(command)) {
    const target = (text || args[0] || '').trim();
    if (!target) return m.reply(`المرجو وضع اسم الحزمة أو الرابط:\n← ${usedPrefix}apkpdl com.whatsapp`);

    await m.react('⏳');

    const details = await APKPureScraper.getDownloadDetails(target);
    let downloadUrl = details.downloadUrl;
    let appTitle = details.title;
    let appIcon = details.icon;

    if (!downloadUrl) {
      const searchRes = await APKPureScraper.search(target);
      if (searchRes.length > 0) {
        const subDetails = await APKPureScraper.getDownloadDetails(searchRes[0].link);
        downloadUrl = subDetails.downloadUrl;
        appTitle = searchRes[0].title || subDetails.title;
        appIcon = searchRes[0].icon || subDetails.icon;
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

      // Send photo preview with loading message
      if (appIcon) {
        await conn.sendMessage(m.chat, {
          image: { url: appIcon },
          caption: `📦 *${appTitle}*\n⏳ *جاري تحميل وتجهيز ملف الـ APK من متجر APKPure...*\n\n⚡ *bot amirni hamza*`
        }, { quoted: m });
      } else {
        await conn.reply(m.chat, `⏳ جاري تحميل وتجهيز تطبيق *${appTitle}* من APKPure...`, m);
      }

      const isXapk = downloadUrl.includes('.xapk') || downloadUrl.includes('xapk');
      const ext = isXapk ? 'xapk' : 'apk';
      const safeName = cleanFileName(appTitle);

      // Method 1: Stream directly via Baileys (Fastest & 0% local RAM overhead)
      try {
        await conn.sendMessage(m.chat, {
          document: { url: downloadUrl },
          mimetype: 'application/vnd.android.package-archive',
          fileName: `${safeName}.${ext}`,
          caption: `📦 *${appTitle}*\n✅ *تم التحميل بنجاح من متجر APKPure*\n⚡ *bot amirni hamza*`
        }, { quoted: m });

        return m.react('✅');
      } catch (streamErr) {
        console.log('[APKPure] Stream failed, downloading buffer fallback...', streamErr.message);

        // Method 2: Buffer download fallback
        const fileRes = await axios.get(downloadUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          responseType: 'arraybuffer',
          timeout: 180000
        });

        const buffer = Buffer.from(fileRes.data);

        await conn.sendMessage(m.chat, {
          document: buffer,
          mimetype: 'application/vnd.android.package-archive',
          fileName: `${safeName}.${ext}`,
          caption: `📦 *${appTitle}*\n✅ *تم التحميل بنجاح من متجر APKPure*\n⚡ *bot amirni hamza*`
        }, { quoted: m });

        return m.react('✅');
      }
    } catch (err) {
      console.error('[APKPure DL Error]', err.message);
      await m.react('❌');
      return m.reply(`❌ فشل تحميل ملف *${appTitle}* مباشرة من APKPure: ${err.message}\n🔗 رابط التحميل:\n${downloadUrl}`);
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
