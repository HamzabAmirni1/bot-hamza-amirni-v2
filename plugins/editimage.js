import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';

// ============================================================
// AI Image Editing, Background Removal & Colorizing Plugin
// Commands: .editimage / .removebg / .nobg / .photo2anime / .colorize
// ============================================================

async function tryRemoveBgAPI(imageBuffer) {
  try {
    const form = new FormData();
    form.append("file", imageBuffer, { filename: "image.jpg", contentType: "image/jpeg" });
    const res = await axios.post("https://loadbalancer.dalliegenerator.app/images/remove-bg", form, {
      headers: form.getHeaders(),
      timeout: 30000
    });
    const base64Str = res.data?.image_base64 || res.data?.image_base64_encoded;
    if (base64Str) return Buffer.from(base64Str, 'base64');
    return null;
  } catch (_) { return null; }
}

async function tryRaphaelEdit(base64Img, prompt) {
  try {
    const payload = {
      prompt,
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
        'User-Agent': 'Mozilla/5.0'
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
    return null;
  } catch (_) { return null; }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : (da || ar);

  const isRemoveBg = /^(removebg|nobg|rmbg|حيد_الخلفية)$/i.test(command);
  const isColorize = /^(colorize|color|تلوين)$/i.test(command);

  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';

  // ── GUIDE ────────────────────────────────────────────────────────────
  if (!/image/.test(mime)) {
    return m.reply(
      t(
        `🎨 *AI Photo Editor & Remover*\n\nSend or reply to an image with:\n← \`${usedPrefix}editimage <prompt>\` (e.g. make him anime)\n← \`${usedPrefix}removebg\` (Remove image background)\n← \`${usedPrefix}hd\` (HD Upscale)\n\n⚡ *bot amirni hamza*`,
        `🎨 *معدل الصور بالذكاء الاصطناعي*\n\nأرسل أو رد على صورة مع:\n← \`${usedPrefix}editimage <التعديل>\` (مثال: اجعله أنمي)\n← \`${usedPrefix}removebg\` (إزالة خلفية الصورة)\n← \`${usedPrefix}hd\` (تحسين الجودة)\n\n⚡ *bot amirni hamza*`,
        `🎨 *معدل الصور بالذكاء الاصطناعي*\n\nصيفط ولا ريبوندي على صورة مع:\n← \`${usedPrefix}editimage <التعديل>\` (مثال: ردو أنمي)\n← \`${usedPrefix}removebg\` (حيد الخلفية)\n← \`${usedPrefix}hd\` (زيادة الجودة)\n\n⚡ *bot amirni hamza*`
      )
    );
  }

  await m.react('⏳');
  const mediaBuffer = await quoted.download();
  if (!mediaBuffer || mediaBuffer.length < 100) {
    await m.react('❌');
    throw t('❌ Failed to download image.', '❌ فشل تحميل الصورة.', '❌ ما قدرناش نهبطو الصورة.');
  }

  let resultBuffer = null;
  let statusText = '';

  if (isRemoveBg) {
    await m.reply(t('✂️ Removing background...', '✂️ جاري إزالة الخلفية...', '✂️ كينحيدو الخلفية...'));
    resultBuffer = await tryRemoveBgAPI(mediaBuffer);
    if (!resultBuffer) {
      // Fallback
      resultBuffer = await tryRaphaelEdit(`data:image/webp;base64,${mediaBuffer.toString('base64')}`, 'remove background isolate main subject on clean transparent or plain background');
    }
    statusText = t('✂️ Background removed successfully!', '✂️ تم إزالة الخلفية بنجاح!', '✂️ حيدنا الخلفية بنجاح!');
  } else {
    const prompt = (text || '').trim() || 'make it vibrant digital art anime style high resolution';
    await m.reply(t('🎨 Editing photo with AI...', '🎨 جاري تعديل الصورة بالذكاء الاصطناعي...', '🎨 كنهبطو الصورة ونعدلو عليها بالذكاء الاصطناعي...'));
    resultBuffer = await tryRaphaelEdit(`data:image/webp;base64,${mediaBuffer.toString('base64')}`, prompt);
    statusText = t(`🎨 Photo edited: "${prompt}"`, `🎨 تم تعديل الصورة: "${prompt}"`, `🎨 تعدلات الصورة بنجاح!`);
  }

  if (!resultBuffer) {
    await m.react('❌');
    return m.reply(t('❌ Editing failed. Please try another image or command!', '❌ فشل التعديل. جرب صورة أخرى أو أمراً مختلفاً!', '❌ ما نجحش التعديل. جرب صورة أخرى!'));
  }

  const caption = `${statusText}\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`;

  try {
    const { imageMessage } = await generateWAMessageContent({ image: resultBuffer }, { upload: conn.waUploadToServer });
    const buttons = [
      {
        "name": "quick_reply",
        "buttonParamsJson": JSON.stringify({ display_text: t("🖼️ HD Upscale", "🖼️ تحسين الجودة HD", "🖼️ زيادة الجودة HD"), id: `.hd` })
      },
      {
        "name": "quick_reply",
        "buttonParamsJson": JSON.stringify({ display_text: t("✂️ Remove BG", "✂️ إزالة الخلفية", "✂️ حيد الخلفية"), id: `.removebg` })
      }
    ];

    const botMsg = generateWAMessageFromContent(m.chat, {
      interactiveMessage: proto.Message.InteractiveMessage.fromObject({
        body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
        footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirni hamza' }),
        header: proto.Message.InteractiveMessage.Header.create({
          hasMediaAttachment: true,
          imageMessage
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons })
      })
    }, { quoted: m });

    await conn.relayMessage(m.chat, botMsg.message, { messageId: botMsg.key.id });
    await m.react('✅');
  } catch (e) {
    await conn.sendFile(m.chat, resultBuffer, 'edited.png', caption, m);
    await m.react('✅');
  }
};

handler.help = ['editimage <prompt>', 'removebg', 'nobg'];
handler.tags = ['ai', 'editor'];
handler.command = /^(editimage|imgedit|removebg|nobg|rmbg|حيد_الخلفية)$/i;
handler.limit = true;

export default handler;
