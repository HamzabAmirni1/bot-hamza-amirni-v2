/*
  TraidMode (traidmode.com) APK Mod Scraper & Downloader
  Commands:
    .traidmode <query>
    .traid <query>
    .apkmod <query>
    .modapk <query>
    .مهكر <query>
    .ترايد <query>
    .traiddl <url>
*/

import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://traidmode.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  'Referer': 'https://traidmode.com/'
};

export class TraidModeScraper {
  /**
   * Search TraidMode for modded apps/games
   */
  static async search(query) {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
      const { data: html } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(html);
      const items = [];

      $('.post-item').each((_, el) => {
        const title = $(el).find('.content h3 a').text().trim() || $(el).find('h3 a').text().trim();
        let link = $(el).find('.content h3 a').attr('href') || $(el).find('h3 a').attr('href');
        if (!link) {
          const onclick = $(el).attr('onclick') || '';
          const match = onclick.match(/'(https:\/\/[^']+)'/);
          if (match) link = match[1];
        }

        const icon = $(el).find('img').attr('src') || '';
        const isMod = $(el).find('.label').text().trim() || 'مهكرة';
        const category = $(el).find('.content p').text().trim() || '';

        let version = 'أحدث إصدار';
        let size = '';
        $(el).find('ul li').each((__, li) => {
          const txt = $(li).find('span').text().trim();
          if (/^v\.?/i.test(txt)) version = txt;
          else if (/MB|GB|KB/i.test(txt)) size = txt;
        });

        if (title && link) {
          items.push({
            title,
            link,
            icon,
            isMod,
            category,
            version,
            size
          });
        }
      });

      return items;
    } catch (e) {
      console.error('[TraidMode] Search error:', e.message);
      return [];
    }
  }

  /**
   * Extract direct download links from a post's download page
   */
  static async getDownloadOptions(postUrl) {
    try {
      const cleanUrl = postUrl.replace(/\/$/, '');
      const downloadPageUrl = cleanUrl.endsWith('/download') ? cleanUrl : `${cleanUrl}/download`;
      const { data: html } = await axios.get(downloadPageUrl, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(html);
      const downloadOptions = [];

      $('ul li').each((_, el) => {
        const nameHeader = $(el).find('span[show-download-item]').text().trim();
        const anchor = $(el).find('.downloadLink a, a[href*="/get/?urls="]');
        const href = anchor.attr('href');
        const btnText = anchor.text().trim();

        if (href) {
          let directUrl = '';
          let apkName = nameHeader;

          try {
            const parsed = new URL(href, BASE_URL);
            directUrl = parsed.searchParams.get('urls') || '';
            apkName = parsed.searchParams.get('names') || apkName || 'TraidMode App';
          } catch (_) {
            const m = href.match(/urls=([^&]+)/);
            if (m) directUrl = decodeURIComponent(m[1]);
          }

          if (directUrl) {
            downloadOptions.push({
              name: (apkName || 'APK').replace(/\s+/g, ' ').trim(),
              downloadUrl: directUrl,
              size: btnText.replace(/تحميل/g, '').trim(),
              rawText: btnText
            });
          }
        }
      });

      return downloadOptions;
    } catch (e) {
      console.error('[TraidMode] Download extraction error:', e.message);
      return [];
    }
  }
}

function cleanFileName(text) {
  return (text || 'app').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}

let handler = async (m, { conn, text, args, command, usedPrefix }) => {
  // ── Download mode: .traiddl <post_url_or_direct_url> ───────────
  if (/^traiddl$/i.test(command)) {
    const target = (text || args[0] || '').trim();
    if (!target) return m.reply(`المرجو وضع رابط التحميل:\n← ${usedPrefix}traiddl https://traidmode.com/...`);

    await m.react('⏳');

    let directUrl = '';
    let apkTitle = 'TraidMode App';

    if (target.startsWith('http') && target.includes('traidmode.com')) {
      const options = await TraidModeScraper.getDownloadOptions(target);
      if (!options.length) {
        await m.react('❌');
        return m.reply('❌ لم نتمكن من استخراج روابط التحميل من هذه الصفحة. تأكد من صحة الرابط.');
      }
      directUrl = options[0].downloadUrl;
      apkTitle = options[0].name || apkTitle;
    } else if (target.startsWith('http')) {
      directUrl = target;
    }

    if (!directUrl) {
      await m.react('❌');
      return m.reply('❌ تعذر العثور على رابط التحميل المباشر.');
    }

    try {
      // Check file size
      let sizeMB = 0;
      try {
        const head = await axios.head(directUrl, { headers: HEADERS, timeout: 10000 });
        sizeMB = Number(head.headers['content-length'] || 0) / (1024 * 1024);
      } catch (_) {}

      if (sizeMB > 95) {
        await m.react('✅');
        return conn.reply(
          m.chat,
          `📦 *${apkTitle}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚖️ *الحجم:* ${sizeMB ? sizeMB.toFixed(1) + ' MB' : 'أكبر من 95 MB'}\n` +
          `⚠️ *الملف كبير الحجم بالنسبة للواتساب.*\n\n` +
          `🔗 *رابط التحميل المباشر والسريع:*\n${directUrl}\n\n` +
          `⚡ *bot amirni hamza*`,
          m
        );
      }

      await conn.reply(m.chat, `⏳ جاري تحميل وتجهيز ملف الـ APK (${apkTitle})...`, m);

      const fileRes = await axios.get(directUrl, {
        headers: HEADERS,
        responseType: 'arraybuffer',
        timeout: 180000
      });

      const buffer = Buffer.from(fileRes.data);
      const isXapk = directUrl.includes('.xapk') || directUrl.includes('xapk');
      const ext = isXapk ? 'xapk' : 'apk';
      const safeName = cleanFileName(apkTitle);

      await conn.sendMessage(m.chat, {
        document: buffer,
        mimetype: 'application/vnd.android.package-archive',
        fileName: `${safeName}.${ext}`,
        caption: `🎮 *${apkTitle}*\n🔥 *نسخة مهكرة جاهزة للتشغيل*\n⚡ *bot amirni hamza*`
      }, { quoted: m });

      return m.react('✅');
    } catch (err) {
      console.error('[TraidMode DL Error]', err.message);
      await m.react('❌');
      return m.reply(`❌ فشل تحميل الملف مباشرة: ${err.message}\n🔗 رابط التحميل:\n${directUrl}`);
    }
  }

  // ── Search mode: .apkm / .traidmode / .apkmod / .مهكر <query> ───────────
  const query = (text || '').trim();
  if (!query) {
    return conn.reply(
      m.chat,
      `🎮 *TraidMode — متجر التطبيقات والألعاب المهكرة*\n\n` +
      `ابحث وحمّل أحدث التطبيقات والألعاب المهكرة والبريميوم مباشرة من موقع TraidMode.\n\n` +
      `*طريقة الاستخدام:*\n` +
      `← ${usedPrefix}apkm <اسم اللعبة أو التطبيق>\n\n` +
      `*أمثلة:*\n` +
      `← ${usedPrefix}apkm Subway Surfers\n` +
      `← ${usedPrefix}apkm Spotify\n` +
      `← ${usedPrefix}apkm WhatsApp\n` +
      `← ${usedPrefix}apkm Free Fire\n` +
      `← ${usedPrefix}apkm GTA\n\n` +
      `⚡ *bot amirni hamza*`,
      m
    );
  }

  await m.react('🔍');

  const results = await TraidModeScraper.search(query);
  if (!results.length) {
    await m.react('❌');
    return conn.reply(m.chat, `❌ لم يتم العثور على ألعاب أو تطبيقات مهكرة مطابقة لـ *"${query}"* في موقع TraidMode.`, m);
  }

  const headerText = `🔥 *TraidMode — نتائج البحث عن: "${query}"*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  let textList = headerText;
  const rows = [];

  results.slice(0, 8).forEach((item, index) => {
    const num = index + 1;
    textList += `*${num}️⃣ ${item.title}*\n`;
    if (item.version) textList += `🔢 *الإصدار:* ${item.version} | ⚖️ *الحجم:* ${item.size || '—'}\n`;
    if (item.category) textList += `🏷️ *القسم:* ${item.category}\n`;
    textList += `📥 *للتحميل:* ${usedPrefix}traiddl ${item.link}\n\n`;

    rows.push({
      title: `🎮 ${num}. ${item.title.slice(0, 35)}`,
      description: `${item.size ? item.size + ' | ' : ''}${item.version}`,
      id: `${usedPrefix}traiddl ${item.link}`
    });
  });

  textList += `━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`;

  try {
    await conn.sendButton(m.chat, {
      image: { url: results[0]?.icon || 'https://traidmode.com/wp-content/uploads/2026/02/traidmod.webp' },
      caption: textList,
      footer: 'bot amirni hamza',
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: '📥 اختر اللعبة/التطبيق للتحميل',
            sections: [{ title: '🎮 TraidMode Mod APK', rows }]
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '📥 تحميل أول تطبيق',
            id: `${usedPrefix}traiddl ${results[0]?.link}`
          })
        }
      ]
    }, { quoted: m });
  } catch (_) {
    await conn.sendMessage(m.chat, { text: textList }, { quoted: m });
  }

  await m.react('✅');
};

handler.help = ['apkm'];
handler.command = /^(apkm|traidmode|traid|apkmod|modapk|مهكر|ترايد|تطبيق_مهكر|لعبة_مهكرة|traiddl)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
