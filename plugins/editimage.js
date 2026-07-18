import axios from 'axios';
import crypto from 'crypto';

const handler = async (m, { conn, text, args, usedPrefix, command }) => {

  // ── GUIDE ────────────────────────────────────────────────────────────
  if (!text?.trim() && !m.quoted) {
    return m.reply(
      `╭─「 *AI IMAGE EDITOR* 」─────────────\n` +
      `│\n` +
      `│  Edit any image using AI — just send\n` +
      `│  an image with a caption describing\n` +
      `│  what you want changed!\n` +
      `│\n` +
      `├─「 *USAGE* 」\n` +
      `│  • Reply an image with:\n` +
      `│    ${usedPrefix}${command} <instruction>\n` +
      `│\n` +
      `├─「 *EXAMPLES* 」\n` +
      `│  • ${usedPrefix}${command} make him wear a hat\n` +
      `│  • ${usedPrefix}${command} change background to forest\n` +
      `│  • ${usedPrefix}${command} add sunglasses\n` +
      `│  • ${usedPrefix}${command} make it look like anime\n` +
      `│\n` +
      `├─「 *NOTE* 」\n` +
      `│  You must reply to an image message.\n` +
      `│  Supported: jpg, png, webp\n` +
      `│\n` +
      `╰────────────────────────────────────`
    );
  }

  // ── VALIDATE ─────────────────────────────────────────────────────────
  const prompt = text?.trim();
  if (!prompt) throw '❌ Please provide an instruction. Example: make him wear a hat';

  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';
  if (!mime.startsWith('image/')) throw '❌ Please reply to an image message.';

  await m.reply('_🎨 Downloading and processing your image..._');

  // ── DOWNLOAD QUOTED IMAGE ─────────────────────────────────────────────
  const mediaBuffer = await quoted.download();
  const base64Image = `data:image/webp;base64,${mediaBuffer.toString('base64')}`;

  // ── CALL AI EDITOR API ────────────────────────────────────────────────
  await m.reply('_🚀 Sending to AI editor, please wait..._');

  const payload = {
    prompt,
    input_image: base64Image,
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
  });

  // ── PARSE RESPONSE ────────────────────────────────────────────────────
  const lines = response.data.trim().split('\n');
  const lastLine = JSON.parse(lines[lines.length - 1]);

  if (lastLine.status !== 'complete') throw '❌ AI editing failed or got stuck in queue. Try again.';

  const resultUrl = `https://raphael.app${lastLine.data.url}`;

  // ── SEND RESULT ───────────────────────────────────────────────────────
  const caption =
    `╭─「 *AI Image Editor* 」─────────────\n` +
    `│\n` +
    `│  ✏️ Prompt : ${prompt}\n` +
    `│\n` +
    `╰────────────────────────────────────`;

  const imgBuffer = await axios.get(resultUrl, { responseType: 'arraybuffer' });
  await conn.sendMessage(m.chat, {
    image: Buffer.from(imgBuffer.data),
    caption,
  }, { quoted: m });

};

handler.help = handler.command = ['editimage'];
handler.tags = ['editor'];
handler.limit = true;

export default handler;
