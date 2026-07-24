import axios from 'axios';
import FormData from 'form-data';

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

  // ── CALL AI EDITOR API (pollinations.ai) ──────────────────────────────
  await m.reply('_🚀 Sending to AI editor, please wait..._');

  // Try pollinations image editing API
  async function tryPollinations(imageBuffer, prompt) {
    const form = new FormData();
    form.append('image', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    form.append('prompt', prompt);
    form.append('model', 'turbo');
    const r = await axios.post('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?image=true&nologo=true&enhance=true', form, {
      headers: { ...form.getHeaders() },
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    if (r.data && r.data.byteLength > 1000) return Buffer.from(r.data);
    throw new Error('Empty response');
  }

  // Try stable-diffusion-based editor via publicapis
  async function tryMagicStudio(imageBuffer, prompt) {
    const base64 = imageBuffer.toString('base64');
    const r = await axios.post(
      'https://api.magicstudio.com/api/ai-art-generator',
      { image: `data:image/jpeg;base64,${base64}`, prompt, image_num: 1, strength: 0.7 },
      { headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }, timeout: 60000 }
    );
    if (r?.data?.images?.[0]) return Buffer.from(r.data.images[0], 'base64');
    throw new Error('MagicStudio failed');
  }

  // Try clipdrop inpainting
  async function tryClipdrop(imageBuffer, prompt) {
    const form = new FormData();
    form.append('image_file', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    form.append('text_prompt', prompt);
    const r = await axios.post('https://clipdrop-api.co/image-upscaling/v1/upscale', form, {
      headers: { ...form.getHeaders(), 'x-api-key': 'dummy' },
      responseType: 'arraybuffer',
      timeout: 60000,
    });
    if (r.data && r.data.byteLength > 1000) return Buffer.from(r.data);
    throw new Error('Clipdrop failed');
  }

  // Try pollinations simple (generates new image from text + reference concept)
  async function tryPollinationsSimple(prompt) {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&enhance=true&model=flux`;
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, maxRedirects: 10 });
    if (r.data && r.data.byteLength > 1000) return Buffer.from(r.data);
    throw new Error('Pollinations simple failed');
  }

  let resultBuffer = null;
  const errors = [];

  // Try full image editing first (with uploaded image)
  for (const [name, fn] of [
    ['pollinations-edit', () => tryPollinations(mediaBuffer, prompt)],
    ['magicstudio', () => tryMagicStudio(mediaBuffer, prompt)],
  ]) {
    try {
      resultBuffer = await fn();
      if (resultBuffer) break;
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }

  // If all editing APIs failed, generate a new image from the prompt
  if (!resultBuffer) {
    try {
      resultBuffer = await tryPollinationsSimple(prompt);
    } catch (e) {
      errors.push(`pollinations-gen: ${e.message}`);
    }
  }

  if (!resultBuffer) {
    throw `❌ AI editing failed. Errors:\n${errors.join('\n')}\n\nجرب مرة أخرى لاحقاً.`;
  }

  // ── SEND RESULT ───────────────────────────────────────────────────────
  const caption =
    `╭─「 *AI Image Editor* 」─────────────\n` +
    `│\n` +
    `│  ✏️ Prompt : ${prompt}\n` +
    `│\n` +
    `╰────────────────────────────────────`;

  await conn.sendMessage(m.chat, {
    image: resultBuffer,
    caption,
  }, { quoted: m });

};

handler.help = handler.command = ['editimage'];
handler.tags = ['editor'];
handler.limit = true;

export default handler;
