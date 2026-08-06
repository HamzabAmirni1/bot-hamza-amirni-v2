import axios from 'axios';
import crypto from 'crypto';

const handler = async (m, { conn, text, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

  const isRemoveBgCmd = /^(removebg|nobg|rmbg)$/i.test(command);

  // ── GUIDE ────────────────────────────────────────────────────────────
  if (!text?.trim() && !m.quoted && !isRemoveBgCmd) {
    return m.reply(
      t(
`╭─「 *AI IMAGE EDITOR* 」─────────────
│
│  AI Image Editing & Enhancements
│
├─「 *How to Use* 」
│  • Send or reply to an image with:
← ${usedPrefix}${command} <description>
│  • Remove background: ${usedPrefix}removebg
│
├─「 *Examples* 」
← ${usedPrefix}${command} remove background
← ${usedPrefix}${command} make him wear a red hat
← ${usedPrefix}${command} change background to beach
← ${usedPrefix}${command} make it look like anime
│
╰────────────────────────────────────`,

`╭─「 *معدّل الصور بالذكاء الاصطناعي* 」─────────────
│
│  التعديل على الصور بواسطة الذكاء الاصطناعي
│
├─「 *طريقة الاستخدام* 」
│  • أرسل أو رُد على صورة مع:
← ${usedPrefix}${command} <التعديل المطلوب>
│  • إزالة الخلفية:
← ${usedPrefix}removebg
│
├─「 *أمثلة* 」
← ${usedPrefix}${command} remove background
← ${usedPrefix}${command} اجعله يرتدي قبعة حمراء
← ${usedPrefix}${command} غيّر الخلفية إلى شاطئ
← ${usedPrefix}${command} حوّلها إلى نمط أنمي
│
╰────────────────────────────────────`,

`╭─「 *معدّل الصور بالذكاء الاصطناعي* 」─────────────
│
│  تعديل الصور بالذكاء الاصطناعي بنقرة واحدة
│
├─「 *طريقة الاستخدام* 」
│  • صيفط ولا ريبوندي على صورة مع:
← ${usedPrefix}${command} <التعديل اللي بغيتي>
│  • تحييد الخلفية:
← ${usedPrefix}removebg
│
├─「 *أمثلة* 」
← ${usedPrefix}${command} remove background
← ${usedPrefix}${command} لبسو طاقية حمرا
← ${usedPrefix}${command} بدّل الخلفية بالبحر
← ${usedPrefix}${command} ردها أنمي
│
╰────────────────────────────────────`
      )
    );
  }

  // ── VALIDATE IMAGE ───────────────────────────────────────────────────
  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';
  if (!mime.startsWith('image/')) throw t('❌ Please reply to an image.', '❌ يرجى الرد على صورة (image).', '❌ ريبوندي على شي تصويرة أ عشيري.');

  let prompt = text?.trim() || '';
  if (isRemoveBgCmd) {
    prompt = 'remove background';
  } else if (!prompt) {
    throw t(
      '❌ Please describe the edit.\n\nExample:\n.editimage make him wear sunglasses',
      '❌ يرجى كتابة التعديل المطلوب.\n\n*مثال:*\n← .editimage make him wear sunglasses',
      '❌ كتب شنو بغيتي تبدل فالتصويرة.\n\n*مثال:*\n← .editimage make him wear sunglasses'
    );
  }

  await m.reply(t('_🎨 Downloading and processing image..._', '_🎨 جاري تحميل ومعالجة صورتك الأصلية..._', '_🎨 كنهبطو التصويرة ونعدلو عليها..._'));

  // 1. Download Quoted Image
  const mediaBuffer = await quoted.download();
  if (!mediaBuffer || mediaBuffer.length < 100) {
    throw t('❌ Failed to download image from WhatsApp.', '❌ فشل تحميل الصورة من واتساب.', '❌ ما قدرناش ننزلوا التصويرة من واتساب.');
  }

  const base64Image = `data:image/webp;base64,${mediaBuffer.toString('base64')}`;

  await m.reply(t('_🚀 Sending image to AI for editing..._', '_🚀 جاري إرسال الصورة للذكاء الاصطناعي للتعديل عليها..._', '_🚀 صيفطنا التصويرة للذكاء الاصطناعي يقادها..._'));

  // ── RAPHAEL AI EDITOR (from gaff-ai-master) ───────────────────────────
  async function tryRaphael(base64Img, prt) {
    const payload = {
      prompt: prt,
      input_image: base64Img,
      input_image_mime_type: 'image/webp',
      input_image_extension: 'webp',
      width: 576,
      height: 1024,
      mode: 'standard',
      client_request_id: crypto.randomUUID(),
    };
    const response = await axios.post('https://raphael.app/api/ai-image-editor', payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      responseType: 'text',
      timeout: 60000,
    });

    const lines = response.data.trim().split('\n');
    const lastLine = JSON.parse(lines[lines.length - 1]);
    if (lastLine.status === 'complete' && lastLine.data?.url) {
      const resultUrl = `https://raphael.app${lastLine.data.url}`;
      const imgBuffer = await axios.get(resultUrl, { responseType: 'arraybuffer', timeout: 30000 });
      if (imgBuffer.data && imgBuffer.data.byteLength > 1000) return Buffer.from(imgBuffer.data);
    }
    throw new Error(lastLine.message || 'فشل التعديل بالسيرفر الرئيسي');
  }

  let resultBuffer = null;
  const errors = [];

  try {
    resultBuffer = await tryRaphael(base64Image, prompt);
  } catch (e) {
    errors.push('raphael: ' + e.message);
  }

  if (!resultBuffer) {
    throw `❌ فشل التعديل على صورتك الأصلية.\nالأسباب:\n${errors.join('\n')}\n\nيرجى المحاولة مرة أخرى بصورة أخرى أو أمر مختلف.`;
  }

  // ── SEND RESULT ───────────────────────────────────────────────────────
  const caption =
    `╭─「 *AI Image Editor* 」─────────────\n` +
    `│\n` +
    `│  ✏️ Prompt : ${prompt}\n` +
    `│  📷 Status : تم التعديل على صورتك الأصلية بنجاح ✅\n` +
    `│\n` +
    `╰────────────────────────────────────`;

  await conn.sendMessage(m.chat, {
    image: resultBuffer,
    caption,
  }, { quoted: m });

};

handler.help = ['editimage', 'removebg'];
handler.command = ['editimage', 'removebg', 'nobg', 'rmbg'];
handler.tags = ['ai', 'editor'];
handler.limit = true;

export default handler;
