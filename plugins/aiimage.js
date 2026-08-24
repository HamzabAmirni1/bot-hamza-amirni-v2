import axios from 'axios';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';

// ============================================================
// AI Image Generation Plugin (Text to Image)
// Commands: .imagine <prompt> / .aiimg <prompt> / .gen <prompt>
// ============================================================

async function generatePollinations(prompt) {
  try {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?nologo=true&seed=${Math.floor(Math.random() * 999999)}&width=1024&height=1024`;
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 35000 });
    if (res.status === 200 && res.data?.byteLength > 2000) {
      return Buffer.from(res.data);
    }
    return null;
  } catch (_) { return null; }
}

async function generateDallE(prompt) {
  try {
    const url = `https://text2pet.zdex.top/images`;
    const res = await axios.post(url, { prompt }, {
      headers: {
        'user-agent': 'NB Android/1.0.0',
        'content-type': 'application/json',
        'authorization': 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW'
      },
      timeout: 30000
    });
    if (res.data?.data) {
      const imgRes = await axios.get(res.data.data, { responseType: 'arraybuffer', timeout: 25000 });
      return Buffer.from(imgRes.data);
    }
    return null;
  } catch (_) { return null; }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : (da || ar);

  if (!text || !text.trim()) {
    return m.reply(
      t(
        `🎨 *AI Image Generator*\n\nGenerate realistic AI photos & artwork from text!\n\n*Usage:*\n← \`${usedPrefix}${command} cute cat wearing astronaut suit\`\n← \`${usedPrefix}${command} cyberpunk city neon lights 8k\`\n\n⚡ *bot amirni hamza*`,
        `🎨 *مولد الصور بالذكاء الاصطناعي*\n\nأنشئ صوراً ورسومات بالذكاء الاصطناعي بنقرة واحدة!\n\n*طريقة الاستخدام:*\n← \`${usedPrefix}${command} قطة لطيفة ترتدي زي رائد فضاء\`\n← \`${usedPrefix}${command} مدينة سايبربانك بأنوار نيون 8k\`\n\n⚡ *bot amirni hamza*`,
        `🎨 *مولد الصور بالذكاء الاصطناعي*\n\nصاوب تصاور وعالم من الخيال بالذكاء الاصطناعي!\n\n*طريقة الاستخدام:*\n← \`${usedPrefix}${command} قطة لطيفة ترتدي زي رائد فضاء\`\n← \`${usedPrefix}${command} مدينة سايبربانك بأنوار نيون 8k\`\n\n⚡ *bot amirni hamza*`
      )
    );
  }

  const prompt = text.trim();
  await m.react('🎨');
  await m.reply(t('🎨 Generating AI image... please wait!', '🎨 جاري إنشاء الصورة بالذكاء الاصطناعي...', '🎨 كنزوقو ليك التصويرة بالذكاء الاصطناعي، صبر شوية...'));

  let imgBuffer = await generatePollinations(prompt);
  if (!imgBuffer) imgBuffer = await generateDallE(prompt);

  if (!imgBuffer) {
    await m.react('❌');
    return m.reply(t('❌ Failed to generate AI image. Try another prompt!', '❌ فشل إنشاء الصورة. جرب وصفاً آخر!', '❌ ما قدرناش نصاوبو الصورة. جرب وصف آخر!'));
  }

  const caption = t(
    `🎨 *AI Image Generated* ✅\n━━━━━━━━━━━━━━━━━━━━━\n📝 *Prompt:* ${prompt}\n\n💡 *Quick Options:*\n▸ \`.hd\` — Increase image resolution (HD)\n▸ \`.removebg\` — Remove image background\n▸ \`.imagine ${prompt}\` — Generate another version\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `🎨 *تم إنشاء الصورة بالذكاء الاصطناعي* ✅\n━━━━━━━━━━━━━━━━━━━━━\n📝 *الوصف:* ${prompt}\n\n💡 *خيارات سريعة:*\n▸ \`.hd\` — تحسين جودة الصورة (HD)\n▸ \`.removebg\` — إزالة خلفية الصورة\n▸ \`.imagine ${prompt}\` — صاوب صورة أخرى\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `🎨 *ها هي التصويرة بالذكاء الاصطناعي واجدة* ✅\n━━━━━━━━━━━━━━━━━━━━━\n📝 *الوصف:* ${prompt}\n\n💡 *خيارات سريعة:*\n▸ \`.hd\` — زيد الجودة (HD)\n▸ \`.removebg\` — حيد الخلفية\n▸ \`.imagine ${prompt}\` — صاوب وحدة أخرى\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
  );

  try {
    await conn.sendMessage(m.chat, {
      image: imgBuffer,
      caption: caption
    }, { quoted: m });
    await m.react('✅');
  } catch (sendErr) {
    console.error('[aiimage error]:', sendErr);
    await m.react('❌');
    return m.reply(t('❌ Failed to send AI image.', '❌ تعذر إرسال الصورة.', '❌ ما قدرناش نصيفطو التصويرة.'));
  }
};

handler.help = ['imagine <prompt>', 'aiimage <prompt>', 'gen <prompt>'];
handler.tags = ['ai', 'tools'];
handler.command = /^(imagine|aiimage|aiimg|gen|صورة_ذكاء|صاوب_تصويرة)$/i;
handler.limit = false;

export default handler;
