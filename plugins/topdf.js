import { imageSize } from 'image-size';

// Temporary memory for users collecting multiple images into 1 PDF
// Map<userChatKey, { images: Array<{buffer, width, height}>, timer: Timeout }>
// ⚠️ Use global so session survives across worker threads (Koyeb multi-bot)
if (!global.pdfSessions) global.pdfSessions = new Map();
const pdfSessions = global.pdfSessions;

/**
 * دالة لتوليد ملف PDF نقي محلياً 100% بدون أي حزم خارجية أو أخطاء API
 * تنشئ مستند PDF حقيقي متوافق مع جميع الهواتف وقارئات PDF
 */
function createTextPdfBuffer(text) {
  const cleanStr = String(text || '').replace(/\r/g, '');
  const rawLines = cleanStr.split('\n');
  const lines = [];

  for (let rl of rawLines) {
    if (!rl) { lines.push(''); continue; }
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

  let textStream = 'BT\n/F1 14 Tf\n50 780 Td\n20 TL\n';
  for (let l of lines.slice(0, 36)) {
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

/**
 * دالة لتوليد ملف PDF عالي الجودة يدعم صفحة واحدة أو عدة صفحات
 * مع الحفاظ على الأبعاد والمقاييس الأصلية الدقيقة لكل صورة بدون أي تشويه أو تمديد
 * @param {Array<{buffer: Buffer, width: number, height: number}>} images
 */
function createMultiJpgPdf(images) {
  let pdf = '%PDF-1.4\n';
  const offsets = [];

  const catalogObjNum = 1;
  const pagesObjNum = 2;
  const numPages = images.length;
  const pageObjNums = [];
  let nextObjNum = 3;

  for (let i = 0; i < numPages; i++) {
    pageObjNums.push(nextObjNum++); // Page obj
    nextObjNum++; // Image XObject obj
    nextObjNum++; // Content stream obj
  }

  // 1. Catalog
  offsets[catalogObjNum] = Buffer.byteLength(pdf, 'utf8');
  pdf += `${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`;

  // 2. Pages tree
  offsets[pagesObjNum] = Buffer.byteLength(pdf, 'utf8');
  const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(' ');
  pdf += `${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>\nendobj\n`;

  const parts = [Buffer.from(pdf, 'utf8')];

  for (let i = 0; i < numPages; i++) {
    const pageObjNum = pageObjNums[i];
    const imgObjNum = pageObjNum + 1;
    const contentObjNum = pageObjNum + 2;
    const { buffer: jpegBuffer, width, height } = images[i];

    // Page object with exact photo dimensions as MediaBox
    const pageHeader = `${pageObjNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im1 ${imgObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`;
    offsets[pageObjNum] = parts.reduce((acc, p) => acc + p.length, 0);
    parts.push(Buffer.from(pageHeader, 'utf8'));

    // Image XObject (JPEG stream)
    offsets[imgObjNum] = parts.reduce((acc, p) => acc + p.length, 0);
    const imgHeader = `${imgObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBuffer.length} >>\nstream\n`;
    const imgFooter = '\nendstream\nendobj\n';
    parts.push(Buffer.from(imgHeader, 'utf8'));
    parts.push(jpegBuffer);
    parts.push(Buffer.from(imgFooter, 'utf8'));

    // Page content stream: draw image at 1:1 scale (width x height)
    offsets[contentObjNum] = parts.reduce((acc, p) => acc + p.length, 0);
    const streamContent = `q\n${width} 0 0 ${height} 0 0 cm\n/Im1 Do\nQ\n`;
    const contentObj = `${contentObjNum} 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}endstream\nendobj\n`;
    parts.push(Buffer.from(contentObj, 'utf8'));
  }

  // Cross-reference table (xref)
  const totalObjs = nextObjNum;
  const startxref = parts.reduce((acc, p) => acc + p.length, 0);
  let xref = `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (let i = 1; i < totalObjs; i++) {
    const off = offsets[i] || 0;
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  xref += `trailer\n<< /Size ${totalObjs} /Root ${catalogObjNum} 0 R >>\nstartxref\n${startxref}\n%%EOF`;
  parts.push(Buffer.from(xref, 'utf8'));

  return Buffer.concat(parts);
}

/**
 * Helper to ensure an image buffer is standard JPEG and returns { buffer, width, height }
 */
async function processImageToJpegItem(imgBuffer) {
  let jpgBuf = imgBuffer;
  // If not pure JPEG SOI (0xFF 0xD8 0xFF), convert to JPG via ffmpeg
  if (imgBuffer.length > 3 && !imgBuffer.slice(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) {
    try {
      const { ffmpeg } = await import('../lib/converter.js');
      const converted = await ffmpeg(imgBuffer, [], 'image', 'jpg');
      if (converted?.data) {
        jpgBuf = converted.data;
        try { await converted.delete(); } catch (_) {}
      }
    } catch (_) {}
  }

  let width = 595;
  let height = 842;
  try {
    const dims = imageSize(jpgBuf);
    if (dims?.width && dims?.height) {
      width = dims.width;
      height = dims.height;
    }
  } catch (_) {}

  return { buffer: jpgBuf, width, height };
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const userLang = (m.sender && global.db?.data?.users?.[m.sender]?.language) || 'darija';
  const sessionKey = `${m.chat}_${m.sender}`;
  const lowerCmd = (command || '').toLowerCase();

  // ── 0. Handle finish / compile commands (.donepdf / .savepdf) ──
  if (lowerCmd === 'donepdf' || lowerCmd === 'savepdf') {
    const session = pdfSessions.get(sessionKey);
    if (!session || !session.images.length) {
      const noSessionMsgs = {
        darija: `🤖 *بوت حمزة اعمرني • صانع الـ PDF*
━━━━━━━━━━━━━━━━━━━━━
⚠️ *ما كاينا حتى صورة مسجلة عندك دابا!*

باش تجمع عدة تصاور فـ ملف PDF واحد:

1️⃣ بدا الجلسة بهاد الأمر:
\u200E← .pdfm
أو جاوب على أول تصويرة بـ:
\u200E← .topdf

2️⃣ صيفط باقي الصور بالتتابع (البوت كايزيدهم تلقائياً).

3️⃣ فاش تسالي، اضغط على الزر لتحت أو كتب:
\u200E← .donepdf
باش يجمعهم ليك كاملين فـ PDF واحد بنفس مقاساتهم الأصلية.

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`,
        arabic: `🤖 *بوت حمزة اعمرني • صانع الـ PDF*
━━━━━━━━━━━━━━━━━━━━━
⚠️ *لا توجد صور مضافة حالياً في جلستك!*

لتجميع عدة صور في ملف PDF واحد:

1️⃣ ابدأ الجلسة بهذا الأمر:
\u200E← .pdfm
أو قم بالرد على أول صورة بـ:
\u200E← .topdf

2️⃣ أرسل بقية الصور بالتتابع وسيتم حفظها تلقائياً.

3️⃣ عند الانتهاء، اضغط على الزر أسفله أو اكتب:
\u200E← .donepdf
ليتم دمجها كلها في ملف PDF واحد بنفس مقاساتها الأصلية.

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`,
        english: `🤖 *Hamza Amirni Bot • Multi-Image PDF Maker*
━━━━━━━━━━━━━━━━━━━━━
⚠️ *No images currently collected in your session!*

How to make a multi-image PDF:

1️⃣ Start the session with:
\u200E← .pdfm
Or reply to the first photo with:
\u200E← .topdf

2️⃣ Send subsequent images (bot gathers them automatically).

3️⃣ When done, tap the button below or type:
\u200E← .donepdf
To compile all images into one PDF with exact original sizes.

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`
      };

      const msgBody = noSessionMsgs[userLang] || noSessionMsgs.darija;
      try {
        return await conn.sendButton(
          m.chat,
          {
            body: msgBody,
            footer: 'bot amirni hamza • حمزة اعمرني',
            buttons: [
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: '📸 بدء تجميع الصور (.pdfm)',
                  id: '.pdfm'
                })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: '📑 شرح أوامر الـ PDF',
                  id: '.topdf'
                })
              }
            ]
          },
          { quoted: m }
        );
      } catch (_) {
        return m.reply(msgBody);
      }
    }

    // Build multi-image PDF from collected images
    clearTimeout(session.timer);
    pdfSessions.delete(sessionKey);

    await m.react('⏳');
    try {
      const totalImgs = session.images.length;
      const validPdf = createMultiJpgPdf(session.images);

      await conn.sendMessage(m.chat, {
        document: validPdf,
        mimetype: 'application/pdf',
        fileName: `album_photos_${totalImgs}pages_${Date.now()}.pdf`,
        caption: `📄 *تم إنشاء ملف PDF بنجاح!*\n📑 *عدد الصور/الصفحات:* ${totalImgs} صورة بنفس مقاساتها الأصلية ✅\n\n⚡ *bot amirni hamza • حمزة اعمرني*`
      }, { quoted: m });

      await m.react('✅');
      return;
    } catch (e) {
      console.error('[DONEPDF Error]', e);
      await m.react('❌');
      return m.reply(`❌ فشل تجميع ملف الـ PDF: ${e.message || e}`);
    }
  }

  // ── 0.1 Handle direct multi-image trigger command (.pdfm) ──
  if (lowerCmd === 'pdfm') {
    pdfSessions.set(sessionKey, {
      images: [],
      timer: setTimeout(() => pdfSessions.delete(sessionKey), 300000)
    });
    const multiNotice =
      `📸 *تم تفعيل وضع تجميع الصور في PDF واحد (.pdfm)!* 🚀\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ أرسل الآن الصور واحدة تلو الأخرى (أو كـ ألبوم).\n` +
      `2️⃣ سيتم حفظ مقاسات كل صورة بدقة 100% بدون أي تغيير في أبعادها.\n` +
      `3️⃣ عند الانتهاء، اضغط الزر أسفله أو اكتب:\n` +
      `\u200E← .donepdf\n` +
      `━━━━━━━━━━━━━━━━━━━━━`;

    try {
      return await conn.sendButton(
        m.chat,
        {
          body: multiNotice,
          footer: 'bot amirni hamza • حمزة اعمرني',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '📑 تجميع واستخراج الـ PDF',
                id: '.donepdf'
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🗑️ إلغاء العملية',
                id: '.cancelpdf'
              })
            }
          ]
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(multiNotice);
    }
  }

  // ── 0.2 Handle cancel command (.cancelpdf) ──
  if (lowerCmd === 'cancelpdf') {
    const session = pdfSessions.get(sessionKey);
    if (session) {
      clearTimeout(session.timer);
      pdfSessions.delete(sessionKey);
      return m.reply('🗑️ *تم إلغاء جلسة تجميع الـ PDF وتفريغ الصور بنجاح.*');
    }
    return m.reply('ℹ️ *ليس لديك أي جلسة PDF مفتوحة حالياً.*');
  }

  let q = m.quoted ? m.quoted : m;
  let mime = (q.msg || q).mimetype || q.mediaType || '';

  // ── 1. If text is provided (and it is NOT just the command name itself or empty) ──
  const cleanInputText = (text || '').trim();
  const isCommandOnly = cleanInputText === '' || cleanInputText.toLowerCase() === lowerCmd || cleanInputText.toLowerCase() === `.${lowerCmd}`;

  // ── 1. Starting multi-mode explicitly: .topdf multi / .pdf album ──
  if (cleanInputText.toLowerCase().includes('multi') || cleanInputText.toLowerCase().includes('album') || cleanInputText.toLowerCase().includes('جمع')) {
    pdfSessions.set(sessionKey, {
      images: [],
      timer: setTimeout(() => pdfSessions.delete(sessionKey), 300000)
    });
    const multiNotice2 =
      `📸 *تم تفعيل وضع تجميع الصور في PDF واحد!* 🚀\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ أرسل الآن الصور واحدة تلو الأخرى (أو كـ ألبوم).\n` +
      `2️⃣ سيتم حفظ مقاسات كل صورة بدقة 100% بدون أي تغيير في أبعادها.\n` +
      `3️⃣ عند الانتهاء، اضغط الزر أسفله أو اكتب:\n` +
      `\u200E← .donepdf\n` +
      `━━━━━━━━━━━━━━━━━━━━━`;

    try {
      return await conn.sendButton(
        m.chat,
        {
          body: multiNotice2,
          footer: 'bot amirni hamza • حمزة اعمرني',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '📑 تجميع واستخراج الـ PDF',
                id: '.donepdf'
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🗑️ إلغاء العملية',
                id: '.cancelpdf'
              })
            }
          ]
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(multiNotice2);
    }
  }

  // ── 2. Handle image to PDF ──
  if (/image\/(jpeg|png|jpg|webp)/.test(mime)) {
    await m.react('⏳');
    try {
      let imgBuffer = await q.download();
      if (!imgBuffer) throw 'فشل تحميل الصورة!';

      const processed = await processImageToJpegItem(imgBuffer);

      // Check if user already has an active session collecting images
      let session = pdfSessions.get(sessionKey);
      if (session) {
        clearTimeout(session.timer);
        session.images.push(processed);
        session.timer = setTimeout(() => {
          pdfSessions.delete(sessionKey);
        }, 300000); // 5 minutes inactivity timeout

        await m.react('📥');
        const imgNotice =
          `📸 *تمت إضافة الصورة بنجاح إلى ملف الـ PDF!*\n` +
          `📊 *العدد الإجمالي حتى الآن:* ${session.images.length} صورة.\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `• أرسل المزيد من الصور، أو اضغط على الزر أسفله لتجميع ملف الـ PDF فوراً.`;

        try {
          return await conn.sendButton(
            m.chat,
            {
              body: imgNotice,
              footer: 'bot amirni hamza • حمزة اعمرني',
              buttons: [
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: `📑 تجميع الـ PDF (${session.images.length} صور)`,
                    id: '.donepdf'
                  })
                },
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: '🗑️ إلغاء العملية',
                    id: '.cancelpdf'
                  })
                }
              ]
            },
            { quoted: m }
          );
        } catch (_) {
          return m.reply(imgNotice);
        }
      }

      // If user typed .topdf / .pdf without starting a multi session,
      // create single PDF with EXACT original dimensions
      const validPdf = createMultiJpgPdf([processed]);

      await conn.sendMessage(m.chat, {
        document: validPdf,
        mimetype: 'application/pdf',
        fileName: `photo_${processed.width}x${processed.height}_${Date.now()}.pdf`,
        caption: `✅ *تم تحويل الصورة إلى PDF بنجاح!*\n📐 *الأبعاد الأصلية:* ${processed.width} × ${processed.height} px (بدون أي تشويه)\n💡 *ملاحظة:* إذا أردت جمع عدة صور فـ PDF واحد، اكتب:\n\u200E← .pdfm\n\n⚡ *bot amirni hamza • حمزة اعمرني*`
      }, { quoted: m });

      await m.react('✅');
      return;
    } catch (e) {
      console.error('[IMG2PDF Error]', e.message || e);
      await m.react('❌');
      return m.reply(`❌ فشل تحويل الصورة: ${e.message || e}`);
    }
  }

  // ── 3. If text is provided (and it is NOT just a command word or empty) ──
  if (!isCommandOnly && cleanInputText.length > 5 && !/image/.test(mime) && !m.quoted?.mimetype?.includes('image')) {
    await m.react('⏳');
    try {
      const pdfBuffer = createTextPdfBuffer(cleanInputText);

      await conn.sendMessage(m.chat, {
        document: pdfBuffer,
        mimetype: 'application/pdf',
        fileName: `document_${Date.now()}.pdf`,
        caption: `📄 *تم إنشاء ملف PDF بنجاح!*\n📝 *المحتوى:* ${cleanInputText.slice(0, 40)}...\n\n⚡ *bot amirni hamza • حمزة اعمرني*`
      }, { quoted: m });

      await m.react('✅');
      return;
    } catch (e) {
      console.error('[TEXT2PDF Error]', e);
      await m.react('❌');
      return m.reply(`❌ فشل إنشاء ملف الـ PDF: ${e.message || e}`);
    }
  }

  // ── 4. No arguments & no image: show multilingual rich help with clean LTR aligned command blocks ──
  const helpMsgs = {
    darija: `🤖 *بوت حمزة اعمرني • صانع ومحول الـ PDF*
━━━━━━━━━━━━━━━━━━━━━
📄 *كيفاش تخدم الأمر:*

1️⃣ *تحويل صورة إلى PDF بنفس قياساتها الأصلية:*
صيفط تصويرة ورد عليها بـ:
\u200E← .topdf

2️⃣ *جمع عدة صور فـ ملف PDF واحد عالي الدقة:*
كتب هاد الأمر وبدا تصيفط التصاور:
\u200E← .pdfm
فاش تسالي من إرسال الصور كتب:
\u200E← .donepdf

3️⃣ *تحويل نص أو مقال إلى مستند PDF جاهز:*
كتب الأمر وموراه النص طويل:
\u200E← .topdf تقرير حول الذكاء الاصطناعي وتطوره السريع في المغرب

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`,
    arabic: `🤖 *بوت حمزة اعمرني • صانع ومحول الـ PDF*
━━━━━━━━━━━━━━━━━━━━━
📄 *طريقة الاستخدام:*

1️⃣ *تحويل صورة إلى PDF بأبعادها الأصلية الدقيقة:*
قم بالرد على الصورة بالأمر:
\u200E← .topdf

2️⃣ *دمج عدة صور في ملف PDF واحد بجودة فائقة:*
اكتب هذا الأمر ثم أرسل الصور:
\u200E← .pdfm
عند الانتهاء اكتب:
\u200E← .donepdf

3️⃣ *تحويل نص أو بحث إلى مستند PDF قابل للطباعة:*
اكتب الأمر متبوعاً بنص المقال:
\u200E← .topdf بحث كامل حول الطاقة المتجددة في العالم

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`,
    english: `🤖 *Hamza Amirni Bot • PDF Maker & Converter*
━━━━━━━━━━━━━━━━━━━━━
📄 *How to use:*

1️⃣ *Convert single Image to PDF (exact original dimensions):*
Reply to any photo with:
← .topdf

2️⃣ *Combine multiple images into 1 high-res PDF:*
Start the session:
← .pdfm
When finished sending photos, type:
← .donepdf

3️⃣ *Convert text to PDF document:*
← .topdf <Your article or summary text here>

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`
  };

  return m.reply(helpMsgs[userLang] || helpMsgs.darija);
};

// ── Background listener: if user has an active PDF session and sends an image, add it automatically ──
handler.before = async function (m) {
  if (!m || m.isBaileys || !m.chat || !m.sender) return;
  const sessionKey = `${m.chat}_${m.sender}`;
  const session = pdfSessions.get(sessionKey);
  if (!session) return;

  const mime = (m.msg || m).mimetype || m.mediaType || '';
  if (/image\/(jpeg|png|jpg|webp)/.test(mime)) {
    try {
      const buffer = await m.download();
      if (buffer) {
        const processed = await processImageToJpegItem(buffer);
        clearTimeout(session.timer);
        session.images.push(processed);
        session.timer = setTimeout(() => pdfSessions.delete(sessionKey), 300000);

        await m.react('📥');
        const imgNotice =
          `📸 *تمت إضافة الصورة رقم ${session.images.length} إلى الـ PDF!* (${processed.width}x${processed.height}px)\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `• أرسل المزيد من الصور، أو اضغط على الزر أسفله لتجميع واستخراج ملف الـ PDF فوراً.`;

        try {
          await this.sendButton(
            m.chat,
            {
              body: imgNotice,
              footer: 'bot amirni hamza • حمزة اعمرني',
              buttons: [
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: `📑 تجميع الـ PDF (${session.images.length} صور)`,
                    id: '.donepdf'
                  })
                },
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: '🗑️ إلغاء العملية',
                    id: '.cancelpdf'
                  })
                }
              ]
            },
            { quoted: m }
          );
        } catch (_) {
          await m.reply(
            `📸 *تمت إضافة الصورة رقم ${session.images.length} إلى الـ PDF!*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `• أرسل المزيد من الصور، أو اكتب:\n` +
            `\u200E← .donepdf\n` +
            `لإصدار الملف النهائي فوراً.`
          );
        }
      }
    } catch (e) {
      console.error('[PDF Session Image Collector Error]', e);
    }
  }
};

handler.help = ['topdf', 'img2pdf', 'text2pdf', 'pdfm', 'donepdf', 'savepdf', 'cancelpdf'];
handler.tags = ['tools', 'converter'];
handler.command = /^(topdf|img2pdf|text2pdf|pdf|pdfm|donepdf|savepdf|cancelpdf)$/i;
handler.limit = false;

export default handler;
