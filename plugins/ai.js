import { getSmartAIReply, isValidReply } from '../lib/gemini.js';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';

  const t = (en, ar, da) => {
    if (userLang === 'english') return en;
    if (userLang === 'arabic') return ar;
    return da;
  };

  const stdButtons = [
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '📸 Instagram',
        url: 'https://instagram.com/hamza_amirni_01',
        merchant_url: 'https://instagram.com/hamza_amirni_01'
      })
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '📢 ' + t('WhatsApp Channel', 'قناة الواتساب', 'قناة الواتساب'),
        url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p',
        merchant_url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
      })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '👑 ' + t('Owner', 'المطور', 'مالك البوت'),
        id: `${usedPrefix}owner`
      })
    }
  ];

  if (!text) {
    return m.reply(t(
      `🤖 *AI Assistant*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *Usage:*\n← ${usedPrefix + command} What is quantum physics?\n\n🎨 *Image Generator:*\n← ${usedPrefix}imagine a cat in space\n\n⚡ *bot amirni hamza • حمزة اعمرني*`,
      `🤖 *الذكاء الاصطناعي*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *طريقة الاستعمال:*\n← ${usedPrefix + command} ما هي عاصمة المغرب؟\n\n🎨 *توليد الصور:*\n← ${usedPrefix}imagine قطة تطير في الفضاء\n\n⚡ *bot amirni hamza • حمزة اعمرني*`,
      `🤖 *الذكاء الاصطناعي*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *طريقة الاستعمال:*\n← ${usedPrefix + command} عاود ليا نكتة بالدارجة\n\n🎨 *رسم وتوليد الصور:*\n← ${usedPrefix}imagine قطة كتطير\n\n⚡ *bot amirni hamza • حمزة اعمرني*`
    ));
  }

  // ── Image Generation (.imagine, .dalle, .draw) ─────────────────────────────
  if (/^(imagine|dalle|draw|رسم|تخيل)$/i.test(command)) {
    await m.reply(t('🎨 Generating AI image...', '🎨 جاري توليد الصورة...', '🎨 جاري رسم الصورة، انتظر...'));
    try {
      const seed = Math.floor(Math.random() * 100000);
      const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(text)}?width=1024&height=1024&seed=${seed}&nologo=true`;
      await conn.sendButton(m.chat, {
        image: { url: imageUrl },
        caption: `🎨 *AI Image Generator*\n\n📝 *Prompt:* _${text}_\n\n🤖 *bot amirni hamza • حمزة اعمرني*`,
        footer: 'bot amirni hamza • حمزة اعمرني',
        buttons: stdButtons
      }, { quoted: m });
    } catch (e) {
      m.reply(t('❌ Failed to generate image.', '❌ فشل توليد الصورة.', '❌ وقع مشكل فـ رسم الصورة.'));
    }
    return;
  }

  // ── Text AI (.ai, .gpt, .chat) ─────────────────────────────────────────────
  await m.reply(t(
    '🧠 *Thinking...*\n_Bot Amirni Hamza is processing your request..._',
    '🧠 *جاري التفكير...*\n_بوت حمزة اعمرني يعالج سؤالك..._',
    '🧠 *البوت كيفكر...*\n_انتظر لحظة أ صاحبي..._'
  ));

  const sysPrompt = `You are a smart, helpful WhatsApp assistant named *Bot Amirni Hamza* (بوت حمزة اعمرني), created by the Moroccan developer *Hamza Amirni* (حمزة اعمرني).

LANGUAGE RULES:
• English → Respond 100% in English. Name: *Bot Amirni Hamza*. NO Arabic script.
• French → Respond 100% in French. Name: *Bot Amirni Hamza*. NO Arabic script.
• Moroccan Darija → Respond in Darija. Name: *بوت حمزة اعمرني*.
• Standard Arabic → Respond in Arabic. Name: *بوت حمزة اعمرني*.

WHATSAPP FORMATTING — ALWAYS apply:
• Use *bold* for titles, key words, commands
• Use _italic_ for definitions, examples, subtitles
• Use • or ➤ for lists
• Separate sections with ─────────
• Use emojis to make replies visual and engaging
• Structure: title → content → short closing
• NEVER dump a plain wall of text — always format nicely
• NEVER mention ChatGPT or OpenAI`;

  let aiResponse = await getSmartAIReply(text, { systemPrompt: sysPrompt });

  if (!aiResponse) {
    aiResponse = t(
      '❌ *AI Busy*\n─────────\n_Sorry, the AI service is temporarily busy._\nPlease try again in a moment 🙏',
      '❌ *الذكاء الاصطناعي مشغول*\n─────────\n_عذراً، خدمة الذكاء الاصطناعي مشغولة حالياً._\nحاول مجدداً بعد قليل 🙏',
      '❌ *البوت مشغول دابا*\n─────────\n_سمح ليا أ صاحبي، عليه ضغط دابا 😅_\nعاود سولني بعد شوية 🙏'
    );
  }

  const isEnOrFr = /^[a-zA-Z0-9\s.,!?'"()\-]+$/.test(text);
  const headerTitle = isEnOrFr
    ? '🤖 *Bot Amirni Hamza — AI*\n━━━━━━━━━━━━━━━━'
    : '🤖 *بوت حمزة اعمرني — الذكاء الاصطناعي*\n━━━━━━━━━━━━━━━━';

  try {
    await conn.sendButton(m.chat, {
      body: `${headerTitle}\n\n${aiResponse}\n\n━━━━━━━━━━━━━━━━\n_🔗 Powered by Google Gemini_`,
      footer: '⚡ bot amirni hamza • حمزة اعمرني',
      buttons: stdButtons
    }, { quoted: m });
  } catch (_) {
    await m.reply(`${headerTitle}\n\n${aiResponse}\n\n━━━━━━━━━━━━━━━━\n_⚡ bot amirni hamza_`);
  }
};

handler.help = ['ai', 'gemini', 'gpt', 'imagine', 'dalle'];
handler.tags = ['ai'];
handler.command = /^(ai|gemini|bard|gpt|chatgpt|imagine|dalle|draw|رسم|تخيل)$/i;

export default handler;
