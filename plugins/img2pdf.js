import { PDFDocument } from 'pdf-lib';

let handler = async (m, { conn, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || q.mediaType || '';

  if (!/image\/(jpeg|png|jpg|webp)/.test(mime)) {
    return m.reply(
      `📄 *محول الصور إلى PDF*\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *طريقة الاستعمال:*\n` +
      `قم بالرد على صورة بالأمر:\n` +
      `← *${usedPrefix + command}*\n\n` +
      `⚡ *bot amirni hamza • حمزة اعمرني*`
    );
  }

  await m.react('⏳');

  try {
    let imgBuffer = await q.download();
    if (!imgBuffer) throw 'فشل تحميل الصورة!';

    // إنشاء مستند PDF وإدراج الصورة فيه
    const pdfDoc = await PDFDocument.create();
    let image;

    if (/png/.test(mime)) {
      image = await pdfDoc.embedPng(imgBuffer);
    } else {
      // JPEG / JPG / Webp fallback
      try {
        image = await pdfDoc.embedJpg(imgBuffer);
      } catch (_) {
        image = await pdfDoc.embedPng(imgBuffer);
      }
    }

    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height
    });

    const pdfBytes = await pdfDoc.save();

    await conn.sendMessage(m.chat, {
      document: Buffer.from(pdfBytes),
      mimetype: 'application/pdf',
      fileName: `image_${Date.now()}.pdf`,
      caption: `✅ *تم تحويل الصورة إلى PDF بنجاح!*\n⚡ *bot amirni hamza • حمزة اعمرني*`
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    console.error('[IMG2PDF] Error:', e);
    await m.react('❌');
    m.reply(`❌ وقع خطأ أثناء تحويل الصورة إلى PDF:\n${e.message || e}`);
  }
};

handler.help = ['img2pdf', 'topdf'];
handler.tags = ['tools', 'converter'];
handler.command = /^(img2pdf|topdf)$/i;

export default handler;
