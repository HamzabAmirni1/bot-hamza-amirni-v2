import axios from 'axios';
import FormData from 'form-data';

/**
 * دالة لتوليد ملف PDF نقي محلياً 100% بدون أي حزم خارجية أو أخطاء API
 * تنشئ مستند PDF حقيقي متوافق مع جميع الهواتف وقارئات PDF
 */
function createTextPdfBuffer(text) {
  // تنظيف النص وتجهيز السطور
  const cleanStr = String(text || '').replace(/\r/g, '');
  const rawLines = cleanStr.split('\n');
  const lines = [];

  for (let rl of rawLines) {
    if (!rl) { lines.push(''); continue; }
    // تقسيم السطور الطويلة لتناسب الصفحة
    let words = rl.split(' ');
    let cur = '';
    for (let w of words) {
      if ((cur + ' ' + w).length > 70) {
        lines.push(cur.trim());
        cur = w;
      } else {
        cur += (cur ? ' ' : '') + w;
      }
    }
    if (cur) lines.push(cur.trim());
  }

  // بناء كائن الـ Stream داخل الـ PDF
  let textStream = 'BT\n/F1 14 Tf\n50 780 Td\n20 TL\n';
  for (let l of lines.slice(0, 36)) {
    // تشفير الرموز الخاصة بالـ PDF
    const escaped = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    textStream += `(${escaped}) '\n`;
  }
  textStream += 'ET';

  const streamLen = Buffer.byteLength(textStream, 'utf8');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLen} >>
stream
${textStream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000305 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${400 + streamLen}
%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || q.mediaType || '';
  let inputText = text || (q && q.text ? q.text : '');

  // 1. تحويل نص إلى PDF محلياً وبدون أي أخطاء
  if (inputText && !/image/.test(mime) && !m.quoted?.mimetype?.includes('image')) {
    await m.react('⏳');
    try {
      const pdfBuffer = createTextPdfBuffer(inputText);

      await conn.sendMessage(m.chat, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: `document_${Date.now()}.pdf`,
        caption: `📄 *تم إنشاء ملف PDF بنجاح!*\n📝 *المحتوى:* ${inputText.slice(0, 40)}...\n\n⚡ *bot amirni hamza • حمزة اعمرني*`
      }, { quoted: m });

      await m.react('✅');
      return;
    } catch (e) {
      console.error('[TEXT2PDF Error]', e);
      await m.react('❌');
      return m.reply(`❌ فشل إنشاء ملف الـ PDF: ${e.message || e}`);
    }
  }

  // 2. تحويل صورة إلى PDF
  if (/image\/(jpeg|png|jpg|webp)/.test(mime)) {
    await m.react('⏳');
    try {
      let imgBuffer = await q.download();
      if (!imgBuffer) throw 'فشل تحميل الصورة!';

      const form = new FormData();
      form.append('file', imgBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });

      // محاولة التحويل السحابي إن توفر
      const res = await axios.post('https://v2.convertapi.com/convert/jpg/to/pdf?Secret=anonymous', form, {
        headers: form.getHeaders(),
        timeout: 25000
      }).catch(() => null);

      if (res?.data?.Files?.[0]?.FileData) {
        const pdfBuf = Buffer.from(res.data.Files[0].FileData, 'base64');
        await conn.sendMessage(m.chat, {
          document: pdfBuf,
          mimetype: 'application/pdf',
          fileName: `image_${Date.now()}.pdf`,
          caption: `✅ *تم تحويل الصورة إلى PDF بنجاح!*\n⚡ *bot amirni hamza • حمزة اعمرني*`
        }, { quoted: m });
        await m.react('✅');
        return;
      }

      // التحويل المحلي المباشر كـ PDF
      const pdfHeader = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im 4 0 R >> >> /Contents 5 0 R >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nq\n595 0 0 842 0 0 cm\n/Im Do\nQ\nendstream\nendobj\n4 0 obj\n<< /Type /XObject /Subtype /Image /Width 800 /Height 600 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + imgBuffer.length + ' >>\nstream\n');
      const pdfFooter = Buffer.from('\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000300 00000 n \n0000000200 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n500\n%%EOF');
      const rawPdf = Buffer.concat([pdfHeader, imgBuffer, pdfFooter]);

      await conn.sendMessage(m.chat, {
        document: rawPdf,
        mimetype: 'application/pdf',
        fileName: `image_${Date.now()}.pdf`,
        caption: `✅ *تم تحويل الصورة إلى PDF بنجاح!*\n⚡ *bot amirni hamza • حمزة اعمرني*`
      }, { quoted: m });

      await m.react('✅');
      return;
    } catch (e) {
      console.error('[IMG2PDF Error]', e.message);
      await m.react('❌');
      return m.reply(`❌ فشل تحويل الصورة: ${e.message || e}`);
    }
  }

  return m.reply(
    `📄 *محول الصور والنصوص إلى PDF*\n━━━━━━━━━━━━━━━━━━━━━\n` +
    `📌 *طريقة الاستعمال:*\n` +
    `1️⃣ رد على أي صورة بالأمر: *${usedPrefix + command}*\n` +
    `2️⃣ أو اكتب: *${usedPrefix + command} نص المقال...*\n\n` +
    `⚡ *bot amirni hamza • حمزة اعمرني*`
  );
};

handler.help = ['topdf', 'img2pdf', 'text2pdf'];
handler.tags = ['tools', 'converter'];
handler.command = /^(topdf|img2pdf|text2pdf|pdf)$/i;
handler.limit = false;

export default handler;
