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
    `🎨 *AI Image Generated*\n━━━━━━━━━━━━━━━━━━━━━\n📝 *Prompt:* ${prompt}\n⚡ *bot amirni hamza*`,
    `🎨 *تم إنشاء الصورة بالذكاء الاصطناعي*\n━━━━━━━━━━━━━━━━━━━━━\n📝 *الوصف:* ${prompt}\n⚡ *bot amirni hamza*`,
    `🎨 *ها هي التصويرة بالذكاء الاصطناعي واجدة*\n━━━━━━━━━━━━━━━━━━━━━\n📝 *الوصف:* ${prompt}\n⚡ *bot amirni hamza*`
  );

  try {
    const { imageMessage } = await generateWAMessageContent({ image: imgBuffer }, { upload: conn.waUploadToServer });
    const buttons = [
      {
        "name": "quick_reply",
        "buttonParamsJson": JSON.stringify({ display_text: t("🖼️ HD Upscale", "🖼️ تحسين الجودة HD", "🖼️ زيادة الجودة HD"), id: `.hd` })
      },
      {
        "name": "quick_reply",
        "buttonParamsJson": JSON.stringify({ display_text: t("✂️ Remove BG", "✂️ إزالة الخلفية", "✂️ حيد الخلفية"), id: `.removebg` })
      },
      {
        "name": "quick_reply",
        "buttonParamsJson": JSON.stringify({ display_text: t("🔄 Re-Generate", "🔄 إعادة الإنشاء", "🔄 صاوب وحدة أخرى"), id: `.${command} ${prompt}` })
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
    // Fallback to sendFile
    await conn.sendFile(m.chat, imgBuffer, 'ai_image.png', caption, m);
    await m.react('✅');
  }
};

handler.help = ['imagine <prompt>', 'aiimage <prompt>', 'gen <prompt>'];
handler.tags = ['ai'];
handler.command = /^(imagine|aiimage|aiimg|gen|draw|صورة_بالذكاء)$/i;
handler.limit = true;

export default handler;
