import axios from 'axios';
import FormData from 'form-data';

// ── Upload Image to Catbox ─────────────────────────────────────────────
async function uploadCatbox(buffer) {
  try {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    const res = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders(),
      timeout: 12000
    });
    if (res.data && typeof res.data === 'string' && res.data.startsWith('http')) {
      return res.data.trim();
    }
  } catch (e) {
    console.log('[uploadCatbox failed]:', e.message);
  }
  throw new Error('Upload image failed');
}

// ── AI Image Editor Fallback APIs ──────────────────────────────────────

// Provider 1: Pollinations Flux img2img
async function aiEditPollinations(imageUrl, prompt) {
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&nologo=true&seed=${seed}&image=${encodeURIComponent(imageUrl)}`;
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
  if (res.status === 200 && res.data?.length > 1000) {
    return Buffer.from(res.data);
  }
  throw new Error('Pollinations failed');
}

// Provider 2: Siputzx img2img / photoleap API
async function aiEditSiputzx(imageUrl, prompt) {
  const r = await axios.get(
    `https://api.siputzx.my.id/api/ai/img2img?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`,
    { timeout: 15000, responseType: 'arraybuffer' }
  );
  if (r.status === 200 && r.data?.length > 1000) {
    return Buffer.from(r.data);
  }
  throw new Error('Siputzx failed');
}

// Provider 3: Yupra AI Image Editor
async function aiEditYupra(imageUrl, prompt) {
  const r = await axios.get(
    `https://api.yupra.my.id/api/ai/editimage?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`,
    { timeout: 15000 }
  );
  const imgUrl = r.data?.data?.url || r.data?.url || r.data?.result;
  if (imgUrl) {
    const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 12000 });
    return Buffer.from(imgRes.data);
  }
  throw new Error('Yupra failed');
}

// Provider 4: Vreden AI Edit
async function aiEditVreden(imageUrl, prompt) {
  const r = await axios.get(
    `https://api.vreden.web.id/api/v1/ai/editimage?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`,
    { timeout: 15000 }
  );
  const imgUrl = r.data?.result?.url || r.data?.url;
  if (imgUrl) {
    const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 12000 });
    return Buffer.from(imgRes.data);
  }
  throw new Error('Vreden failed');
}

// ── Handler ─────────────────────────────────────────────────────────────
const handler = async (m, { conn, text, usedPrefix, command }) => {

  // ── GUIDE ────────────────────────────────────────────────────────────
  if (!text?.trim() && !m.quoted) {
    return m.reply(
      `╭─「 *AI IMAGE EDITOR* 」─────────────\n` +
      `│\n` +
      `│  قم بتعديل أي صورة بالذكاء الاصطناعي!\n` +
      `│  قم بالرد على الصورة واكتب الوصف المطلوب.\n` +
      `│\n` +
      `├─「 *طريقة الاستخدام* 」\n` +
      `│  • رد على أي صورة بـ:\n` +
      `│    ${usedPrefix}${command} <التعديل المطلوب>\n` +
      `│\n` +
      `├─「 *أمثلة* 」\n` +
      `│  • ${usedPrefix}${command} Add glasses and hat\n` +
      `│  • ${usedPrefix}${command} Change background to cyber city\n` +
      `│  • ${usedPrefix}${command} Make it anime style\n` +
      `│\n` +
      `╰────────────────────────────────────`
    );
  }

  const prompt = text?.trim();
  if (!prompt) throw '❌ يرجى كتابة التعديل المطلوب. مثال: .editimage Add glasses';

  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';
  if (!mime.startsWith('image/')) throw '❌ يرجى الرد على صورة!';

  await m.react('🎨');
  await m.reply('🎨 *جاري رفع الصورة وتحليلها بالذكاء الاصطناعي...*');

  // 1. Download image buffer
  const mediaBuffer = await quoted.download();
  
  // 2. Upload to host (Catbox) to get public URL
  let publicUrl = '';
  try {
    publicUrl = await uploadCatbox(mediaBuffer);
  } catch (e) {
    await m.react('❌');
    return m.reply('❌ فشل رفع الصورة. يرجى المحاولة لاحقاً.');
  }

  await m.reply('🚀 *جاري تطبيق التعديل بالذكاء الاصطناعي...*');

  // 3. Try AI editing providers in fallback order
  let resultBuffer = null;
  for (const fn of [aiEditPollinations, aiEditSiputzx, aiEditYupra, aiEditVreden]) {
    try {
      resultBuffer = await fn(publicUrl, prompt);
      if (resultBuffer) break;
    } catch (e) {
      console.log('[editimage provider failed]:', e.message);
    }
  }

  if (!resultBuffer) {
    await m.react('❌');
    return m.reply('❌ فشل تعديل الصورة من جميع السيرفرات. يرجى المحاولة لاحقاً أو تغيير الوصف.');
  }

  // 4. Send result
  const caption =
    `╭─「 *AI Image Editor* 」─────────────\n` +
    `│\n` +
    `│  ✏️ *الوصف:* ${prompt}\n` +
    `│  ⚡ *bot amirni hamza*\n` +
    `│\n` +
    `╰────────────────────────────────────`;

  await conn.sendMessage(m.chat, {
    image: resultBuffer,
    caption,
  }, { quoted: m });

  await m.react('✅');
};

handler.help = handler.command = ['editimage'];
handler.tags = ['editor'];
handler.limit = true;

export default handler;
