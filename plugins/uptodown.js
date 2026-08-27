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
   * Multi-provider Search for Uptodown & Android Apps
   */
  static async search(query) {
    const results = [];

    // Provider 1: Aptoide Official Global API (Huge repository with millions of apps)
    try {
      const { data } = await axios.get(
        `https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(query)}&limit=10`,
        { headers: HEADERS, timeout: 8000 }
      );
      const list = data?.datalist?.list || [];
      for (const item of list) {
        if (item.name && item.file?.path) {
          const sizeMB = item.size ? (item.size / (1024 * 1024)).toFixed(1) + ' MB' : '';
          results.push({
            title: item.name,
            link: item.file.path,
            icon: item.icon,
            dev: item.developer?.name || 'Android',
            rating: item.stats?.rating?.avg ? item.stats.rating.avg.toFixed(1) : '',
            size: sizeMB,
            direct: true
          });
        }
      }
      if (results.length > 0) return results;
    } catch (_) {}

    // Provider 2: DuckDuckGo Uptodown site search
    try {
      const searchUrl = `https://html.duckduckgo.com/html/?q=site:uptodown.com/android+${encodeURIComponent(query)}`;
      const { data: html } = await axios.get(searchUrl, { headers: HEADERS, timeout: 10000 });
      const $ = cheerio.load(html);

      $('.result__body').each((_, el) => {
        const titleRaw = $(el).find('.result__title a').text().trim();
        let link = $(el).find('.result__title a').attr('href') || '';
        const snippet = $(el).find('.result__snippet').text().trim();

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

      if (results.length > 0) return results;
    } catch (_) {}

    // Provider 3: Siputzx Uptodown API
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

    return results;
  }

  /**
   * Extract direct download link and real title from Uptodown app page or direct link
   */
  static async getDownloadDetails(appUrlOrName) {
    try {
      // If it's already a direct APK link (from Aptoide/CDN)
      if (appUrlOrName.startsWith('http') && (appUrlOrName.endsWith('.apk') || appUrlOrName.includes('/apks/'))) {
        return {
          title: 'Android App',
          downloadUrl: appUrlOrName
        };
      }

      const cleanUrl = appUrlOrName.replace(/\/$/, '');
      const downloadPage = cleanUrl.endsWith('/download') ? cleanUrl : `${cleanUrl}/download`;

      // Extract slug from URL for fallback name e.g. https://whatsapp-messenger.ar.uptodown.com
      let slugName = '';
      const domainMatch = cleanUrl.match(/https?:\/\/([^\.]+)\.[^\/]*uptodown\.com/i);
      if (domainMatch && domainMatch[1]) {
        slugName = domainMatch[1].replace(/[-_]+/g, ' ').trim();
        slugName = slugName.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
      }

      let realTitle = slugName || 'App';
      let directUrl = null;

      try {
        const { data: html } = await axios.get(downloadPage, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(html);

        const pageTitle = $('h1#detail-app-name, h1.title, h1, .info .name').first().text().trim() ||
                          $('title').text().replace(/\s*-\s*تنزيل.*|\s*-\s*Download.*|Uptodown.*$/i, '').trim();
        if (pageTitle && pageTitle.length > 2) {
          realTitle = pageTitle;
        }

        const iconSrc = $('img#detail-app-icon, .icon img, figure img, img.feature').first().attr('src') || '';
        if (iconSrc) icon = iconSrc;

        directUrl = $('#detail-download-button').attr('data-url') ||
                    $('button[data-url]').attr('data-url') ||
                    $('a.button.download').attr('href') ||
                    $('a[href*="/post-download/"]').attr('href');

        if (directUrl && !directUrl.startsWith('http')) {
          const origin = new URL(downloadPage).origin;
          directUrl = `${origin}${directUrl}`;
        }
      } catch (_) {}

      return {
        title: realTitle,
        downloadUrl: directUrl,
        icon
      };
    } catch (e) {
      console.error('[Uptodown Download Extraction Error]', e.message);
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
  // ── Download mode: .apkudl <url_or_name> ───────────
  if (/^apkudl$/i.test(command)) {
    const target = (text || args[0] || '').trim();
    if (!target) return m.reply(`المرجو وضع الرابط للتحميل:\n← ${usedPrefix}apkudl https://whatsapp-messenger.ar.uptodown.com/android`);

    await m.react('⏳');

    let downloadUrl = '';
    let appTitle = 'Uptodown App';
    let appIcon = '';

    if (target.startsWith('http')) {
      const details = await UptodownScraper.getDownloadDetails(target);
      downloadUrl = details.downloadUrl;
      appTitle = details.title;
      appIcon = details.icon;
    }

    if (!downloadUrl) {
      const searchRes = await UptodownScraper.search(target);
      if (searchRes.length > 0) {
        appIcon = searchRes[0].icon || '';
        if (searchRes[0].direct && searchRes[0].link) {
          downloadUrl = searchRes[0].link;
          appTitle = searchRes[0].title;
        } else {
          const details = await UptodownScraper.getDownloadDetails(searchRes[0].link);
          downloadUrl = details.downloadUrl;
          appTitle = searchRes[0].title || details.title;
          if (details.icon) appIcon = details.icon;
        }
      }
    }

    if (!downloadUrl) {
      await m.react('❌');
      return m.reply('❌ لم نتمكن من استخراج رابط التحميل من متجر Uptodown. تأكد من صحة الرابط أو الاسم.');
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

      // Send photo preview with loading message
      if (appIcon) {
        await conn.sendMessage(m.chat, {
          image: { url: appIcon },
          caption: `📦 *${appTitle}*\n⏳ *جاري تحميل وتجهيز ملف الـ APK من متجر Uptodown...*\n\n⚡ *bot amirni hamza*`
        }, { quoted: m });
      } else {
        await conn.reply(m.chat, `⏳ جاري تحميل وتجهيز تطبيق *${appTitle}* من Uptodown...`, m);
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
          caption: `📦 *${appTitle}*\n✅ *تم التحميل بنجاح من متجر Uptodown*\n⚡ *bot amirni hamza*`
        }, { quoted: m });

        return m.react('✅');
      } catch (streamErr) {
        console.log('[Uptodown] Stream failed, downloading buffer fallback...', streamErr.message);

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
          caption: `📦 *${appTitle}*\n✅ *تم التحميل بنجاح من متجر Uptodown*\n⚡ *bot amirni hamza*`
        }, { quoted: m });

        return m.react('✅');
      }
    } catch (err) {
      console.error('[Uptodown DL Error]', err.message);
      await m.react('❌');
      return m.reply(`❌ فشل تحميل ملف *${appTitle}* مباشرة من Uptodown: ${err.message}\n🔗 رابط التحميل:\n${downloadUrl}`);
    }
  }

  // ── Search mode: .apku / .uptodown <query> ───────────
  const query = (text || '').trim();
  if (!query) {
    return conn.reply(
      m.chat,
      `🔵 *Uptodown — متجر التطبيقات والألعاب APK*\n\n` +
      `ابحث وحمّل أحدث التطبيقات والألعاب الرسمية من متجر Uptodown الشهير.\n\n` +
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
    if (item.dev) textList += `👤 *المطور:* ${item.dev}\n`;
    if (item.size) textList += `⚖️ *الحجم:* ${item.size}\n`;
    if (item.rating) textList += `⭐ *التقييم:* ${item.rating}\n`;
    if (item.snippet) textList += `📝 ${item.snippet}\n`;
    textList += `📥 *للتحميل:* ${usedPrefix}apkudl ${item.link}\n\n`;

    rows.push({
      title: `📦 ${num}. ${item.title.slice(0, 35)}`,
      description: item.size ? `حجم: ${item.size}` : 'Uptodown Store',
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
