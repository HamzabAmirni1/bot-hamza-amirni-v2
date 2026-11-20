import https from 'https';

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function uploadZass(buffer, mimeType, filename) {
  return new Promise((resolve, reject) => {
    let boundary = '----FormBoundary' + Date.now();

    let body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    let req = https.request({
      hostname: 'cdn.zass.in',
      path: '/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

let handler = async (m, { conn }) => {
  // Grab either a directly attached image or a quoted/replied one
  let quoted = m.quoted ? m.quoted : m;
  let mime = (quoted.msg || quoted).mimetype || '';

  if (!mime.startsWith('image/')) {
    return conn.reply(m.chat, `📤 *Image Upload*

Upload any image to a public CDN and get a direct link back.

*How to use:*
1. Send an image with the caption *.imgupload*
   _or_
2. Reply to an existing image with *.imgupload*

Example: reply to a photo and type \`.imgupload\``, m);
  }

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    let buffer = await quoted.download();
    let filename = `${Date.now()}.${mime.split('/')[1] || 'jpg'}`;

    let result = await uploadZass(buffer, mime, filename);

    if (!result || !result.url) {
      throw new Error('Upload service did not return a URL');
    }

    await conn.reply(m.chat, `✅ *Upload successful!*\n\n🔗 Link: ${result.url}`, m);
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
  } catch (e) {
    await conn.reply(m.chat, `❌ Upload failed: ${e.message}`, m);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
  }
};

handler.help = handler.command = ['imgupload'];

handler.tags = ['uploader'];

handler.limit = false;

export default handler;
