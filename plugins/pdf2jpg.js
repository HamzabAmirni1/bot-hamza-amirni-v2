import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BASE = 'https://api.ilovepdf.com';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  let filePath;

  if (m.quoted?.mimetype === 'application/pdf') {
    await m.react('⏳');

    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true });
    const buffer = await m.quoted.download();
    filePath = `./tmp/${Date.now()}.pdf`;
    fs.writeFileSync(filePath, buffer);
  } else if (text) {
    filePath = text.trim();
  } else {
    const userLang = (m.sender && global.db?.data?.users?.[m.sender]?.language) || 'darija';
    const helpMsgs = {
      darija: `🤖 *بوت حمزة اعمرني • محول الـ PDF إلى صور*
━━━━━━━━━━━━━━━━━━━━━
🖼️ *كيفاش تخدم الأمر:*

1️⃣ *تحويل صفحات PDF إلى صور JPG عالية الدقة:*
← صيفط ملف PDF وجاوب عليه بـ: \`${usedPrefix + command}\`

📌 *النتيجة:*
كايجيك ملف مضغوط (ZIP) فيه كاع الصفحات مقادين ومحولين لـ JPG جودة عالية.

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`,
      arabic: `🤖 *بوت حمزة اعمرني • تحويل PDF إلى صور*
━━━━━━━━━━━━━━━━━━━━━
🖼️ *طريقة الاستخدام:*

1️⃣ *تحويل صفحات أي ملف PDF إلى صور JPG عالية الدقة:*
← قم بالرد (Reply) على أي ملف PDF بالأمر: \`${usedPrefix + command}\`

📌 *النتيجة:*
ستستلم أرشيف ZIP يحتوي على جميع الصفحات محولة إلى صور JPG بجودة عالية (300 DPI).

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`,
      english: `🤖 *Hamza Amirni Bot • PDF to JPG Converter*
━━━━━━━━━━━━━━━━━━━━━
🖼️ *How to use:*

1️⃣ *Convert PDF pages to high-res JPG images:*
← Reply to any PDF document with: \`${usedPrefix + command}\`

📌 *Result:*
You will receive a ZIP archive with each page converted into a 300 DPI JPG image.

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`
    };
    return m.reply(helpMsgs[userLang] || helpMsgs.darija);
  }

  if (!fs.existsSync(filePath)) {
    throw '❌ The specified PDF file could not be found.';
  }

  if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true });
  const outputZip = `./tmp/pdf2jpg_${Date.now()}.zip`;

  try {
    await pdfToJpg(filePath, outputZip, {
      dpi: '300'
    });

    await conn.sendFile(
      m.chat,
      outputZip,
      'pdf-pages.zip',
      `✅ *Conversion Complete!*

Your PDF has been successfully converted into JPG images.

The ZIP archive contains one JPG image for each page.`,
      m
    );

    await m.react('✅');
  } catch (e) {
    console.error('[pdf2jpg Error]:', e);
    await m.react('❌');
    throw `Conversion failed.\n\n${e.message || e}`;
  } finally {
    if (m.quoted && fs.existsSync(filePath)) { try { fs.unlinkSync(filePath); } catch (_) {} }
    if (fs.existsSync(outputZip)) { try { fs.unlinkSync(outputZip); } catch (_) {} }
  }
};

async function getPublicToken() {
  const res = await axios.get('https://www.ilovepdf.com/pdf_to_jpg', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
    },
    timeout: 15000
  });

  const match = res.data.match(/"token":"([^"]+)"/);

  if (!match) throw new Error('Unable to obtain public token.');

  return match[1];
}

async function startTask(token) {
  const res = await axios.get(`${BASE}/v1/start/pdfjpg`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    timeout: 15000
  });

  return {
    server: `https://${res.data.server}`,
    task: res.data.task
  };
}

async function uploadFile(server, task, token, filePath) {
  const form = new FormData();

  form.append('task', task);
  form.append(
    'file',
    fs.createReadStream(filePath),
    path.basename(filePath)
  );

  const res = await axios.post(`${server}/v1/upload`, form, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders()
    },
    timeout: 25000
  });

  return res.data.server_filename;
}

async function processTask(
  server,
  task,
  token,
  serverFilename,
  originalName,
  mode = 'pages',
  dpi = '300'
) {
  const form = new FormData();

  form.append('task', task);
  form.append('tool', 'pdfjpg');
  form.append('pdfjpg_mode', mode);
  form.append('dpi', dpi);
  form.append('output_filename', '{filename}_page');
  form.append('packaged_filename', 'pdf-pages');
  form.append('files[0][server_filename]', serverFilename);
  form.append('files[0][filename]', originalName);

  await axios.post(`${server}/v1/process`, form, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders()
    },
    timeout: 30000
  });
}

async function downloadResult(server, task, token, outputPath) {
  const res = await axios.get(`${server}/v1/download/${task}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    responseType: 'arraybuffer',
    timeout: 30000
  });

  fs.writeFileSync(outputPath, res.data);
}

async function pdfToJpg(
  filePath,
  outputPath = 'output.zip',
  {
    mode = 'pages',
    dpi = '300'
  } = {}
) {
  const token = await getPublicToken();

  const { server, task } = await startTask(token);

  const serverFilename = await uploadFile(
    server,
    task,
    token,
    filePath
  );

  await processTask(
    server,
    task,
    token,
    serverFilename,
    path.basename(filePath),
    mode,
    dpi
  );

  await downloadResult(server, task, token, outputPath);
}

handler.help = [
  'pdf2jpg',
  '',
  '📄 PDF to JPG Converter',
  '',
  'Convert every page of a PDF into separate JPG images.',
  '',
  'Features:',
  '• Converts all PDF pages',
  '• High-quality output (300 DPI)',
  '• Returns a ZIP archive',
  '',
  'How to use:',
  '1. Reply to a PDF document with the command.',
  '2. Or provide a local PDF file path.',
  '',
  'Examples:',
  '.pdf2jpg',
  '.pdf2jpg ./tmp/report.pdf',
  '',
  'Output:',
  '• ZIP file containing JPG images'
].join('\n');

handler.command = ['pdf2jpg', 'pdf2img', 'pdftoimg', 'pdftojpg'];
handler.tags = ['tools', 'converter'];
handler.limit = false;

export default handler;
