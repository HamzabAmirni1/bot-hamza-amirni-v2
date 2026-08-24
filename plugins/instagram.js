import axios from 'axios';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';
import { assertFileSizeOk } from '../lib/checkFileSize.js';

// ─── API 1: cobalt.tools (free, best quality) ──────────────────────────────
async function cobaltDownload(url) {
  try {
    const res = await axios.post('https://api.cobalt.tools/api/json', {
      url,
      vCodec: 'h264',
      vQuality: '720',
      aFormat: 'mp3',
      isNoTTWatermark: true,
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 15000
    });
    const d = res.data;
    if (d?.status === 'stream' || d?.status === 'redirect') return { type: 'video', url: d.url };
    if (d?.status === 'picker') return { type: 'photos', urls: d.picker.map(p => p.url) };
    return null;
  } catch (_) { return null; }
}

// ─── API 2: Instaloader via savefrom.net ────────────────────────────────────
async function savefromDownload(url) {
  try {
    const encoded = encodeURIComponent(url);
    const res = await axios.get(`https://sfrom.info/api/convert?url=${encoded}&lang=en`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 12000
    });
    const d = res.data;
    if (!d || !d.url) return null;
    const links = Array.isArray(d.url) ? d.url : [d.url];
    const best = links.find(l => l.url) || links[0];
    const directUrl = best?.url || best;
    if (typeof directUrl !== 'string') return null;
    return { type: 'video', url: directUrl, title: d.meta?.title || 'Instagram Media' };
  } catch (_) { return null; }
}

// ─── API 3: RapidAPI SnapInstagram ─────────────────────────────────────────
async function snapigDownload(url) {
  try {
    const res = await axios.post('https://www.saveig.app/api/', `url=${encodeURIComponent(url)}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.saveig.app/'
      },
      timeout: 12000
    });
    const html = res.data || '';
    // Extract video links
    const videoUrls = [...html.matchAll(/href="(https:\/\/[^"]+\.mp4[^"]*)"/g)].map(m => m[1]);
    if (videoUrls.length > 0) return { type: 'video', url: videoUrls[0] };
    // Extract image links (carousel)
    const imgUrls = [...html.matchAll(/href="(https:\/\/[^"]+\.jpg[^"]*)"/g)].map(m => m[1]);
    if (imgUrls.length > 1) return { type: 'photos', urls: imgUrls };
    if (imgUrls.length === 1) return { type: 'image', url: imgUrls[0] };
    return null;
  } catch (_) { return null; }
}

// ─── API 4: LocoLoader / igdownloader.app ──────────────────────────────────
async function igDownloaderApp(url) {
  try {
    const res = await axios.post('https://igdownloader.app/api/download', {
      url
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://igdownloader.app/'
      },
      timeout: 12000
    });
    const d = res.data;
    if (!d) return null;
    if (d.type === 'video' && d.data?.video_url) return { type: 'video', url: d.data.video_url };
    if (d.type === 'image' && d.data?.image_url) return { type: 'image', url: d.data.image_url };
    if (d.type === 'album' && d.data?.length > 0) {
      const urls = d.data.map(item => item.video_url || item.image_url).filter(Boolean);
      return { type: 'photos', urls };
    }
    return null;
  } catch (_) { return null; }
}

// ─── API 5: Delirius API ───────────────────────────────────────────────────
async function deliriusIgDownload(url) {
  try {
    const res = await axios.get(`https://delirius-apiofc.vercel.app/download/instagram?url=${encodeURIComponent(url)}`, { timeout: 12000 });
    const data = res.data?.data;
    if (!data || !Array.isArray(data) || data.length === 0) return null;
    const urls = data.map(item => item.url).filter(Boolean);
    if (urls.length === 1) {
      return { type: data[0].type === 'video' || urls[0].includes('.mp4') ? 'video' : 'image', url: urls[0] };
    }
    return { type: 'photos', urls };
  } catch (_) { return null; }
}

// ─── API 6: Vreden API ─────────────────────────────────────────────────────
async function vredenIgDownload(url) {
  try {
    const res = await axios.get(`https://api.vreden.my.id/api/instagram?url=${encodeURIComponent(url)}`, { timeout: 12000 });
    const result = res.data?.result;
    if (!result) return null;
    if (Array.isArray(result) && result.length > 0) {
      const urls = result.map(i => typeof i === 'string' ? i : (i.url || i.downloadUrl)).filter(Boolean);
      if (urls.length === 1) return { type: urls[0].includes('.mp4') ? 'video' : 'image', url: urls[0] };
      return { type: 'photos', urls };
    }
    if (result.url) return { type: result.url.includes('.mp4') ? 'video' : 'image', url: result.url };
    return null;
  } catch (_) { return null; }
}

// ─── Main handler ─────────────────────────────────────────────────────────
const handler = async (m, { conn, usedPrefix, command, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da, fr) => lang === 'french' ? (fr || en) : lang === 'english' ? en : lang === 'arabic' ? ar : (da || ar);

  const url = (args[0] || '').trim();

  // ─── Prompt if no URL ────────────────────────────────────────────────────
  if (!url || !url.startsWith('http')) {
    const prompt = t(
`📸 *Instagram Downloader* 📸
━━━━━━━━━━━━━━━━━━━━━
Download any Instagram content: Reels, Posts, Carousels, Stories!

📌 *How to use:*
← ${usedPrefix}${command} <instagram link>

📌 *Examples:*
← ${usedPrefix}${command} https://www.instagram.com/reel/ABC123
← ${usedPrefix}${command} https://www.instagram.com/p/ABC123

✅ *Supports:* Reels • Posts • Carousels (all photos) • Videos
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📸 *محمل الإنستغرام* 📸
━━━━━━━━━━━━━━━━━━━━━
حمّل أي محتوى من انستغرام: ريلز، بوستات، صور متعددة، قصص!

📌 *طريقة الاستخدام:*
← ${usedPrefix}${command} <رابط الإنستغرام>

📌 *أمثلة:*
← ${usedPrefix}${command} https://www.instagram.com/reel/ABC123

✅ *يدعم:* الريلز • الصور • الكاروسيل • الفيديوهات
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📸 *تحميل من إنستا* 📸
━━━━━━━━━━━━━━━━━━━━━
حمل أي حاجة من الإنستا: ريلز، بوستات، صور كثيرة، فيديوهات!

📌 *كيفاش تستعملو:*
← ${usedPrefix}${command} <رابط الإنستا>

📌 *مثال:*
← ${usedPrefix}${command} https://www.instagram.com/reel/ABC123

✅ *كيدعم:* الريلز • الصور • الكاروسيل • الفيديوهات
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    );
    return m.reply(prompt);
  }

  if (!url.includes('instagram.com') && !url.includes('instagr.am')) {
    return m.reply(t(
      '❌ Please send a valid Instagram link.',
      '❌ أرسل رابط إنستغرام صحيحاً.',
      '❌ صيفط رابط صحيح ديال الإنستا.'
    ));
  }

  await m.react('⏳');
  await m.reply(t(
    '📥 Fetching Instagram media... please wait!',
    '📥 جاري تحميل محتوى الإنستغرام...',
    '📥 كنجيبو الحاجة من الإنستا، صبر شوية...'
  ));

  // ─── Try all APIs in order ───────────────────────────────────────────────
  let result = await cobaltDownload(url);
  if (!result) result = await deliriusIgDownload(url);
  if (!result) result = await vredenIgDownload(url);
  if (!result) result = await igDownloaderApp(url);
  if (!result) result = await savefromDownload(url);
  if (!result) result = await snapigDownload(url);

  if (!result) {
    await m.react('❌');
    return m.reply(t(
      '❌ Failed to download! Make sure the account is *public* and the link is correct.',
      '❌ فشل التحميل! تأكد من أن الحساب *عام* والرابط صحيح.',
      '❌ ماقدرناش نحملو! تأكد بلي الحساب *عام* والرابط صحيح.'
    ));
  }

  const caption = t(
    `📸 *Downloaded from Instagram* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `📸 *تم التحميل من إنستغرام* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `📸 *تم التحميل من الإنستا* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
  );

  try {
    if (result.type === 'video') {
      // ─── Single video / reel ─────────────────────────────────────
      const sizeOk = await assertFileSizeOk(result.url, m, lang, 300 * 1024 * 1024);
      if (!sizeOk) return;
      await conn.sendMessage(m.chat, {
        video: { url: result.url },
        caption,
        mimetype: 'video/mp4'
      }, { quoted: m });

    } else if (result.type === 'image') {
      // ─── Single image ────────────────────────────────────────────────────
      await conn.sendMessage(m.chat, {
        image: { url: result.url },
        caption
      }, { quoted: m });

    } else if (result.type === 'photos' && result.urls?.length > 0) {
      // ─── Carousel: send all photos one by one ────────────────────────────
      const photosTitle = t(
        `📸 *Instagram Carousel* — ${result.urls.length} photo(s)\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
        `📸 *ألبوم إنستغرام* — ${result.urls.length} صورة\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
        `📸 *ألبوم إنستا* — ${result.urls.length} صورة\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
      );
      await m.reply(photosTitle);

      for (let i = 0; i < result.urls.length; i++) {
        const imgUrl = result.urls[i];
        const isVid = imgUrl.includes('.mp4') || imgUrl.includes('video');
        try {
          if (isVid) {
            await conn.sendMessage(m.chat, {
              video: { url: imgUrl },
              caption: `🎬 ${i + 1}/${result.urls.length}`,
              mimetype: 'video/mp4'
            }, { quoted: m });
          } else {
            await conn.sendMessage(m.chat, {
              image: { url: imgUrl },
              caption: `📸 ${i + 1}/${result.urls.length}`
            }, { quoted: m });
          }
        } catch (_) {}
        // Small delay to avoid flood
        await new Promise(r => setTimeout(r, 600));
      }
    }

    await m.react('✅');
  } catch (e) {
    await m.react('❌');
    await m.reply(t(
      `❌ Error sending media: ${e.message}`,
      `❌ حدث خطأ أثناء الإرسال: ${e.message}`,
      `❌ وقع خطأ فـ الإرسال: ${e.message}`
    ));
  }
};

handler.help = ['instagram', 'ig', 'reels'];
handler.tags = ['downloader'];
handler.command = /^(ig|insta|instagram|reels|ريلز|إنستا|انستا|إنستغرام|انستقرام)$/i;
handler.limit = false;

export default handler;
