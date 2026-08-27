import axios from 'axios';
import FormData from 'form-data';
import { delay } from 'baileys';

// Helper to upload image to temporary host
async function uploadUguu(buffer) {
  const form = new FormData();
  form.append('files[]', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
  const res = await axios.post('https://uguu.se/upload.php', form, {
    headers: {
      ...form.getHeaders(),
      'User-Agent': 'Mozilla/5.0'
    },
    timeout: 25000
  });
  if (res.data?.success && res.data.files?.[0]?.url) {
    return res.data.files[0].url;
  }
  throw new Error('Upload to Uguu failed');
}

// ── Engine 1: ImgLarger Upscaler ──────────────────────────────────────────
async function upscaleImgLarger(buffer, ratio = 2) {
  const form = new FormData();
  form.append('myfile', buffer, { filename: `${Date.now()}.jpg`, contentType: 'image/jpeg' });
  form.append('scaleRadio', String(ratio));

  const upload = await axios.post(
    'https://get1.imglarger.com/api/UpscalerNew/UploadNew',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Origin: 'https://imgupscaler.com',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 30000
    }
  );

  if (upload.data?.data?.code) {
    const code = upload.data.data.code;
    for (let i = 0; i < 15; i++) {
      await delay(2500);
      const check = await axios.post(
        'https://get1.imglarger.com/api/UpscalerNew/CheckStatusNew',
        { code, scaleRadio: ratio },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );
      if (check.data?.data?.status === 'success' && check.data.data.downloadUrls?.[0]) {
        return check.data.data.downloadUrls[0];
      }
    }
  }
  throw new Error('ImgLarger failed');
}

// ── Engine 2: JPGHD Scraper ───────────────────────────────────────────────
async function upscaleJpghd(imgUrl) {
  const fakeIP = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
  const baseHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    Origin: 'https://jpghd.com',
    Referer: 'https://jpghd.com/en',
    Cookie: 'jpghd_lng=en',
    'User-Agent': 'CT Android/1.1.0',
    'X-Forwarded-For': fakeIP,
    'X-Real-IP': fakeIP
  };

  const createRes = await axios.post(
    'https://jpghd.com/api/task/',
    `conf=${JSON.stringify({
      filename: imgUrl.split('/').pop(),
      livephoto: '',
      color: '',
      scratch: '',
      style: 'art',
      input: imgUrl
    })}`,
    { headers: baseHeaders, timeout: 20000 }
  );

  if (createRes.data?.status === 'ok' && createRes.data?.tid) {
    const tid = createRes.data.tid;
    for (let i = 0; i < 15; i++) {
      await delay(2000);
      const checkRes = await axios.get(`https://jpghd.com/api/task/${tid}`, { headers: baseHeaders, timeout: 15000 });
      const data = checkRes.data?.[tid];
      if (data?.status === 'success' && data.output?.jpghd) {
        return data.output.jpghd;
      }
    }
  }
  throw new Error('JPGHD failed');
}

// ── Engine 3: Ihancer API ────────────────────────────────────────────────
async function upscaleIhancer(buffer) {
  const form = new FormData();
  form.append('method', '1');
  form.append('is_pro_version', 'false');
  form.append('is_enhancing_more', 'false');
  form.append('max_image_size', 'high');
  form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

  const res = await axios.post('https://ihancer.com/api/enhance', form, {
    headers: form.getHeaders(),
    responseType: 'arraybuffer',
    timeout: 35000
  });

  if (res.data && res.data.length > 1000) {
    return Buffer.from(res.data);
  }
  throw new Error('Ihancer failed');
}

// ── Engine 4: Siputzx AI Remini ──────────────────────────────────────────
async function upscaleSiputzx(imgUrl) {
  const res = await axios.get(`https://api.siputzx.my.id/api/ai/remini?url=${encodeURIComponent(imgUrl)}`, {
    responseType: 'arraybuffer',
    timeout: 30000
  });
  if (res.data && res.data.length > 1000) {
    return Buffer.from(res.data);
  }
  throw new Error('Siputzx failed');
}

let handler = async (m, { conn, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';

  let quoted = m.quoted ? m.quoted : m;
  let mime = (quoted.msg || quoted).mimetype || '';

  if (!/image/.test(mime)) {
    const promptMsg = lang === 'english'
      ? `🖼️ *HD Image Enhancer*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *Usage:*\nReply to an image or send an image with:\n← ${usedPrefix + command}\n\n⚡ *bot amirni hamza*`
      : lang === 'arabic'
      ? `🖼️ *مُحسّن وتوضيح الصور بجودة HD*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *طريقة الاستعمال:*\nأرسل صورة أو رد على أي صورة بالأمر:\n← ${usedPrefix + command}\n\n⚡ *bot amirni hamza*`
      : `🖼️ *توضيح وتحسين جودة الصور HD*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *طريقة الاستعمال:*\nصيفط صورة أو ريبوندي على أي صورة بـ:\n← ${usedPrefix + command}\n\n⚡ *bot amirni hamza*`;
    return m.reply(promptMsg);
  }

  await m.react('⏳');

  // Send Loading Message
  const loadingTxt = lang === 'english'
    ? '⏳ *Enhancing and upscaling image to ultra HD quality...*'
    : lang === 'arabic'
    ? '⏳ *جاري تحسين وتوضيح تفاصيل الصورة بجودة HD فائقة...*'
    : '⏳ *جاري تحسين وتصفية وتوضيح الصورة بجودة HD...*';
  await conn.sendMessage(m.chat, { text: loadingTxt }, { quoted: m });

  let mediaBuffer = null;
  try {
    mediaBuffer = await quoted.download();
  } catch (e) {
    await m.react('❌');
    return m.reply('❌ فشل تحميل الصورة من الرسالة. تأكد من إرسال صورة واضحة.');
  }

  // Upload to temporary URL for engines that need an image URL
  let publicUrl = null;
  try {
    publicUrl = await uploadUguu(mediaBuffer);
  } catch (_) {}

  let enhancedResult = null;

  // 1. Try ImgLarger
  try {
    const r = await upscaleImgLarger(mediaBuffer, /^hdr$/i.test(command) ? 4 : 2);
    if (r) enhancedResult = r;
  } catch (_) {}

  // 2. Try Ihancer
  if (!enhancedResult) {
    try {
      const r = await upscaleIhancer(mediaBuffer);
      if (r) enhancedResult = r;
    } catch (_) {}
  }

  // 3. Try JPGHD (if publicUrl exists)
  if (!enhancedResult && publicUrl) {
    try {
      const r = await upscaleJpghd(publicUrl);
      if (r) enhancedResult = r;
    } catch (_) {}
  }

  // 4. Try Siputzx (if publicUrl exists)
  if (!enhancedResult && publicUrl) {
    try {
      const r = await upscaleSiputzx(publicUrl);
      if (r) enhancedResult = r;
    } catch (_) {}
  }

  if (!enhancedResult) {
    await m.react('❌');
    const failTxt = lang === 'english'
      ? '❌ Failed to enhance image from all servers. Please try again later.'
      : lang === 'arabic'
      ? '❌ فشل تحسين وتوضيح الصورة من جميع السيرفرات. المرجو المحاولة مجدداً لاحقاً.'
      : '❌ فشل تحسين الصورة من السيرفرات كاملين. عاود صيفط صورة أخرى ولا جرب من بعد شوية.';
    return m.reply(failTxt);
  }

  const resultCaption = lang === 'english'
    ? `✨ *Image successfully enhanced to Ultra HD!* 🔥\n\n⚡ *bot amirni hamza • حمزة اعمرني*`
    : lang === 'arabic'
    ? `✨ *تم توضيح وتحسين جودة الصورة إلى HD بنجاح!* 🔥\n\n⚡ *bot amirni hamza • حمزة اعمرني*`
    : `✨ *هاذي صورتك مصفية وموضحة بجودة HD عالية!* 🔥\n\n⚡ *bot amirni hamza • حمزة اعمرني*`;

  try {
    if (Buffer.isBuffer(enhancedResult)) {
      await conn.sendMessage(m.chat, {
        image: enhancedResult,
        caption: resultCaption
      }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, {
        image: { url: enhancedResult },
        caption: resultCaption
      }, { quoted: m });
    }
    return m.react('✅');
  } catch (err) {
    await m.react('❌');
    return m.reply(`❌ وقع خطأ أثناء إرسال الصورة: ${err.message}`);
  }
};

handler.help = ['hd', 'hdr', 'remini', 'enhance'];
handler.tags = ['ai', 'editor'];
handler.command = /^(hd|hdr|remini|enhance|توضيح|جودة)$/i;
handler.limit = false;

export default handler;
