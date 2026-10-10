import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ذاكرة مؤقتة لتخزين صور الجلسة لكل مستخدم
// conn.pdfSession = { [userId]: [Buffer, Buffer, ...] }
let handler = async (m, { conn, text, usedPrefix, command }) => {
  conn.pdfSessions = conn.pdfSessions || {};
  const userId = m.sender;

  // ── أمر إنهاء وتحويل الجلسة إلى PDF ──────────────────────────
  if (/^(savepdf|finishpdf|donepdf|pdfdone)$/i.test(command)) {
    const list = conn.pdfSessions[userId] || [];
    if (!list.length) {
      return m.reply(
        `⚠️ ليس لديك صور مجمعة حالياً!\n\n` +
        `📌 قم بإرسال أو الرد على الصور بالأمر:\n` +
        `← *${usedPrefix}addpdf*\n` +
        `ثم اكتب *${usedPrefix}savepdf* لجمعها في ملف واحد.`
      );
    }

    await m.react('⏳');
    try {
      const pdfDoc = await PDFDocument.create();

      for (let item of list) {
        let image;
        try {
          if (item.mime.includes('png')) {
            image = await pdfDoc.embedPng(item.buffer);
          } else {
            image = await pdfDoc.embedJpg(item.buffer);
          }
        } catch (_) {
          try {
            image = await pdfDoc.embedPng(item.buffer);
          } catch (err) {
            continue; // تخطي الصورة إذا كانت غير صالحة
          }
        }

        const { width, height } = image.scale(1);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(image, { x: 0, y: 0, width, height });
      }

      const pdfBytes = await pdfDoc.save();
      delete conn.pdfSessions[userId];

      await conn.sendMessage(m.chat, {
        document: Buffer.from(pdfBytes),
        mimetype: 'application/pdf',
        fileName: `album_${list.length}_images_${Date.now()}.pdf`,
        caption: `✅ *تم تجميع ${list.length} صورة بنجاح في ملف PDF واحد!*\n⚡ *bot amirni hamza • حمزة اعمرني*`
      }, { quoted: m });

      await m.react('✅');
    } catch (e) {
      console.error('[SAVEPDF] Error:', e);
      await m.react('❌');
      m.reply(`❌ فشل تجميع الصور في PDF:\n${e.message || e}`);
    }
    return;
  }

  // ── أمر تفريغ أو إلغاء الصور المجمعة ────────────────────────
  if (/^(cancelpdf|resetpdf|clearpdf)$/i.test(command)) {
    const count = (conn.pdfSessions[userId] || []).length;
    delete conn.pdfSessions[userId];
    return m.reply(`🗑️ تم مسح ${count} صورة من قائمة الانتظار.`);
  }

  // ── أمر إضافة صورة لقائمة التجميع ─────────────────────────
  if (/^(addpdf|pdfadd)$/i.test(command)) {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || '';

    if (!/image\/(jpeg|png|jpg|webp)/.test(mime)) {
      return m.reply(`⚠️ المرجو الرد على صورة لإضافتها للملف PDF!`);
    }

    await m.react('⏳');
    try {
      let imgBuffer = await q.download();
      if (!imgBuffer) throw 'فشل تحميل الصورة!';

      conn.pdfSessions[userId] = conn.pdfSessions[userId] || [];
      conn.pdfSessions[userId].push({ buffer: imgBuffer, mime });

      const total = conn.pdfSessions[userId].length;
      await m.react('✅');
      return m.reply(
        `📸 تم إضافة الصورة إلى القائمة! (العدد الحالي: *${total}* صور)\n\n` +
        `• لإضافة صورة أخرى: رد عليها بـ *${usedPrefix}addpdf*\n` +
        `• لإنشاء ملف الـ PDF: أرسل *${usedPrefix}savepdf*\n` +
        `• لإلغاء القائمة: أرسل *${usedPrefix}cancelpdf*`
      );
    } catch (e) {
      await m.react('❌');
      return m.reply(`❌ فشل تحميل الصورة: ${e.message || e}`);
    }
  }

  // ── التحويل المباشر: صورة واحدة أو نص (text2pdf / img2pdf) ─
  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || q.mediaType || '';
  let inputText = text || (q && q.text ? q.text : '');

  // 1. تحويل نص إلى PDF (Text to PDF)
  if (inputText && !/image/.test(mime) && !m.quoted?.mimetype?.includes('image')) {
    await m.react('⏳');
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const margin = 50;
      const pageWidth = 595.28;  // A4
      const pageHeight = 841.89; // A4
      const textWidth = pageWidth - (margin * 2);
      const lineHeight = fontSize * 1.5;

      // تقسيم الأسطر الطويلة
      const rawLines = inputText.split('\n');
      const lines = [];

      for (let rawLine of rawLines) {
        let words = rawLine.split(' ');
        let currentLine = '';
        for (let word of words) {
          let testLine = currentLine ? currentLine + ' ' + word : word;
          // فحص تقريبي للعرض
          if (testLine.length * 6 > textWidth) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
      }

      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      for (let line of lines) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        try {
          page.drawText(line, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0.1, 0.1, 0.1)
          });
        } catch (_) {
          // في حال وجود حروف Unicode/رموز لا يدعمها Helvetica
          page.drawText(Buffer.from(line).toString('ascii'), {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0.1, 0.1, 0.1)
          });
        }
        y -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();

      await conn.sendMessage(m.chat, {
        document: Buffer.from(pdfBytes),
        mimetype: 'application/pdf',
        fileName: `text_${Date.now()}.pdf`,
        caption: `✅ *تم تحويل النص إلى PDF بنجاح!*\n⚡ *bot amirni hamza • حمزة اعمرني*`
      }, { quoted: m });

      await m.react('✅');
      return;
    } catch (e) {
      console.error('[TEXT2PDF] Error:', e);
      await m.react('❌');
      return m.reply(`❌ فشل تحويل النص إلى PDF: ${e.message || e}`);
    }
  }

  // 2. تحويل صورة واحدة إلى PDF
  if (/image\/(jpeg|png|jpg|webp)/.test(mime)) {
    await m.react('⏳');
    try {
      let imgBuffer = await q.download();
      if (!imgBuffer) throw 'فشل تحميل الصورة!';

      const pdfDoc = await PDFDocument.create();
      let image;

      if (/png/.test(mime)) {
        image = await pdfDoc.embedPng(imgBuffer);
      } else {
        try {
          image = await pdfDoc.embedJpg(imgBuffer);
        } catch (_) {
          image = await pdfDoc.embedPng(imgBuffer);
        }
      }

      const { width, height } = image.scale(1);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });

      const pdfBytes = await pdfDoc.save();

      await conn.sendMessage(m.chat, {
        document: Buffer.from(pdfBytes),
        mimetype: 'application/pdf',
        fileName: `image_${Date.now()}.pdf`,
        caption: `✅ *تم تحويل الصورة إلى PDF!*\n💡 *لجمع عدة صور في PDF واحد:* استعمل أمر *${usedPrefix}addpdf* لكل صورة ثم *${usedPrefix}savepdf*.\n\n⚡ *bot amirni hamza • حمزة اعمرني*`
      }, { quoted: m });

      await m.react('✅');
      return;
    } catch (e) {
      console.error('[IMG2PDF] Error:', e);
      await m.react('❌');
      return m.reply(`❌ وقع خطأ أثناء تحويل الصورة إلى PDF:\n${e.message || e}`);
    }
  }

  // رسالة المساعدة الشاملة
  m.reply(
    `📑 *دليل تحويل الملفات والنصوص إلى PDF*\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `1️⃣ *تحويل صورة واحدة إلى PDF:*\n` +
    `← رد على أي صورة بالأمر: *${usedPrefix + command}*\n\n` +
    `2️⃣ *تحويل نص أو كتابة إلى PDF:*\n` +
    `← اكتب: *${usedPrefix + command} النص الذي تريده*\n` +
    `أو رد على رسالة نصية بالأمر *${usedPrefix + command}*\n\n` +
    `3️⃣ *تجميع عدة صور في ملف PDF واحد:* 📚\n` +
    `← رد على كل صورة بالأمر: *${usedPrefix}addpdf*\n` +
    `← وعند الانتهاء اكتب: *${usedPrefix}savepdf*\n` +
    `← لإلغاء القائمة: *${usedPrefix}cancelpdf*\n\n` +
    `⚡ *bot amirni hamza • حمزة اعمرني*`
  );
};

handler.help = ['topdf', 'img2pdf', 'text2pdf', 'addpdf', 'savepdf'];
handler.tags = ['tools', 'converter'];
handler.command = /^(topdf|img2pdf|text2pdf|txt2pdf|addpdf|savepdf|finishpdf|donepdf|cancelpdf|clearpdf)$/i;

export default handler;
