import axios from 'axios';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';
import { assertFileSizeOk } from '../lib/checkFileSize.js';

// ─── API 1: cobalt.tools ────────────────────────────────────────────────────
async function cobaltFB(url) {
  try {
    const res = await axios.post('https://api.cobalt.tools/api/json', {
      url,
      vCodec: 'h264',
      vQuality: '720',
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 15000
    });
    const d = res.data;
    if (d?.status === 'stream' || d?.status === 'redirect') return d.url;
    return null;
  } catch (_) { return null; }
}

// ─── API 2: getvideoapi.com ─────────────────────────────────────────────────
async function getVideoApiFB(url) {
  try {
    const res = await axios.get(`https://getvideoapi.com/api/facebook?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 12000
    });
    const d = res.data;
    // Try HD first, then SD
    const hdUrl = d?.hd || d?.hd_download_link || d?.download_links?.hd;
    const sdUrl = d?.sd || d?.sd_download_link || d?.download_links?.sd;
    return hdUrl || sdUrl || null;
  } catch (_) { return null; }
}

// ─── API 3: fbdownloader.to scraper ─────────────────────────────────────────
async function fbDownloaderTo(fbUrl) {
  try {
    const { data: html } = await axios.get('https://fbdownloader.to/id', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
      timeout: 10000
    });
    const regex = /k_exp="(.*?)".*?k_token="(.*?)"/s;
    const match = html.match(regex);
    if (!match) return null;

    const payload = new URLSearchParams({
      k_exp: match[1], k_token: match[2],
      p: 'home', q: fbUrl, lang: 'en', v: 'v2', W: ''
    });

    const { data } = await axios.post('https://fbdownloader.to/api/ajaxSearch', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://fbdownloader.to',
        'Referer': 'https://fbdownloader.to/id'
      },
      timeout: 12000
    });

    if (!data?.data) return null;
    const rowRegex = /href="(https:\/\/[^"]+\.mp4[^"]*)"/g;
    const matches = [...data.data.matchAll(rowRegex)];
    return matches?.[0]?.[1] || null;
  } catch (_) { return null; }
}

// ─── API 4: fdown.net ────────────────────────────────────────────────────────
async function fdownNet(url) {
  try {
    const res = await axios.get(`https://fdown.net/download.php?URLz=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://fdown.net/' },
      timeout: 12000
    });
    const html = res.data || '';
    const hdMatch = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"[^>]*>.*?HD/i);
    const sdMatch = html.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
    return hdMatch?.[1] || sdMatch?.[1] || null;
  } catch (_) { return null; }
}

// ─── Main handler ─────────────────────────────────────────────────────────
const handler = async (m, { conn, usedPrefix, command, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : (da || ar);

  const url = (args[0] || '').trim();

  // ─── Prompt ──────────────────────────────────────────────────────────────
  if (!url || !url.startsWith('http')) {
    return m.reply(t(
`📘 *Facebook Video Downloader* 📘
━━━━━━━━━━━━━━━━━━━━━
Download any Facebook video or reel with ease!

📌 *How to use:*
← ${usedPrefix}${command} <facebook link>

📌 *Examples:*
← ${usedPrefix}${command} https://www.facebook.com/reel/123456
← ${usedPrefix}${command} https://fb.watch/abc123

✅ *Supports:* Videos • Reels • Public Stories
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📘 *محمل فيديوهات فيسبوك* 📘
━━━━━━━━━━━━━━━━━━━━━
حمّل أي فيديو أو ريل من فيسبوك بسهولة!

📌 *طريقة الاستخدام:*
← ${usedPrefix}${command} <رابط فيسبوك>

📌 *أمثلة:*
← ${usedPrefix}${command} https://www.facebook.com/reel/123456
← ${usedPrefix}${command} https://fb.watch/abc123

✅ *يدعم:* الفيديوهات • الريلز • القصص العامة
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📘 *تحميل فيديوهات فيسبوك* 📘
━━━━━━━━━━━━━━━━━━━━━
حمل أي فيديو أو ريلز من فيسبوك!

📌 *كيفاش تستعملو:*
← ${usedPrefix}${command} <رابط الفيسبوك>

📌 *مثال:*
← ${usedPrefix}${command} https://www.facebook.com/reel/123456
← ${usedPrefix}${command} https://fb.watch/abc123

✅ *كيدعم:* الفيديوهات • الريلز
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    ));
  }

  if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.com')) {
    return m.reply(t(
      '❌ Please send a valid Facebook link.',
      '❌ أرسل رابط فيسبوك صحيحاً.',
      '❌ صيفط رابط صحيح ديال الفيسبوك.'
    ));
  }

  await m.react('⏳');
  await m.reply(t(
    '📥 Fetching Facebook video... please wait!',
    '📥 جاري تحميل فيديو فيسبوك...',
    '📥 كنجيبو الفيديو من فيسبوك، صبر شوية...'
  ));

  // ─── Try all APIs in order ───────────────────────────────────────────────
  let videoUrl = await cobaltFB(url);
  if (!videoUrl) videoUrl = await getVideoApiFB(url);
  if (!videoUrl) videoUrl = await fbDownloaderTo(url);
  if (!videoUrl) videoUrl = await fdownNet(url);

  if (!videoUrl) {
    await m.react('❌');
    return m.reply(t(
      '❌ Failed to download! Make sure the video is *public* and the link is correct.',
      '❌ فشل التحميل! تأكد من أن الفيديو *عام* والرابط صحيح.',
      '❌ ماقدرناش نحملو! تأكد بلي الفيديو *عام* والرابط مزيان.'
    ));
  }

  const caption = t(
    `📘 *Downloaded from Facebook* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `📘 *تم التحميل من فيسبوك* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `📘 *تم التحميل من فيسبوك* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
  );

  // ── File size guard (300 MB max) ──
  const sizeOk = await assertFileSizeOk(videoUrl, m, lang, 300 * 1024 * 1024);
  if (!sizeOk) return;
  try {
    const { videoMessage } = await generateWAMessageContent({ video: { url: videoUrl } }, { upload: conn.waUploadToServer });
    const buttons = [
      {
        "name": "quick_reply",
        "buttonParamsJson": JSON.stringify({ display_text: t("🎵 Extract Audio MP3", "🎵 تحويل إلى صوت MP3", "🎵 ردها صوت MP3"), id: `.tomp3` })
      },
      {
        "name": "cta_url",
        "buttonParamsJson": JSON.stringify({ display_text: t("🔗 Open Video", "🔗 فتح الفيديو", "🔗 فتح الفيديو"), url: videoUrl })
      }
    ];

    const botMsg = generateWAMessageFromContent(m.chat, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirni hamza' }),
        header: proto.Message.InteractiveMessage.Header.create({
          hasMediaAttachment: true,
          videoMessage
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons })
      })
    }, { quoted: m });

    await conn.relayMessage(m.chat, botMsg.message, { messageId: botMsg.key.id });
    await m.react('✅');
  } catch (e) {
    // Fallback: send directly
    try {
      await conn.sendMessage(m.chat, {
        video: { url: videoUrl },
        caption,
        mimetype: 'video/mp4'
      }, { quoted: m });
      await m.react('✅');
    } catch {
      await m.react('❌');
      await m.reply(t(
        `✅ Video found but can't be sent directly.\n\n📎 Direct link:\n← ${videoUrl}`,
        `✅ تم العثور على الفيديو لكن تعذر إرساله مباشرة.\n\n📎 الرابط المباشر:\n← ${videoUrl}`,
        `✅ لقينا الفيديو ولكن ماقدرناش نصيفطه.\n\n📎 الرابط المباشر:\n← ${videoUrl}`
      ));
    }
  }
};

handler.help = ['facebook', 'fb'];
handler.tags = ['downloader'];
handler.command = /^(fb|facebook|fbdl|فيسبوك|فيس)$/i;
handler.limit = false;

export default handler;
