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
      `🤖 *AI Assistant*\n📌 Usage: ${usedPrefix + command} What is quantum physics?\n🎨 Image: ${usedPrefix}imagine a cat in space`,
      `🤖 *الذكاء الاصطناعي*\n📌 طريقة الاستخدام: ${usedPrefix + command} ما هي عاصمة المغرب؟\n🎨 صورة: ${usedPrefix}imagine قطة تطير`,
      `🤖 *الذكاء الاصطناعي*\n📌 طريقة الاستعمال: ${usedPrefix + command} عاود ليا نكتة بالدارجة\n🎨 صورة: ${usedPrefix}imagine قطة كتطير`
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
  await m.reply(t('🧠 Thinking...', '🧠 جاري التفكير...', '🧠 البوت كيفكر، انتظر لحظة...'));

  const sysPrompt = `أنت بوت واتساب ذكي اسمك "بوت حمزة اعمرني"، صنعك المطور المغربي "حمزة اعمرني". تجيب مباشرة وبدقة على سؤال المستخدم بنفس اللغة التي كتب بها (دارجة/عربية/إنجليزية/فرنسية). ردودك طبيعية ومفيدة بدون فلسفة زائدة. لا تذكر ChatGPT أو OpenAI أبداً.`;

  let aiResponse = await getSmartAIReply(text, { systemPrompt: sysPrompt });

  if (!aiResponse) {
    aiResponse = t(
      'Sorry, the AI service is temporarily busy. Please ask again in a moment.',
      'عذراً، خدمة الذكاء الاصطناعي مشغولة حالياً. حاول إعادة السؤال بعد قليل.',
      'سمح ليا أ عشيري، خدمة الذكاء الاصطناعي عليها ضغط حالياً 😅 عاود سولني دابا نيت!'
    );
  }

  try {
    await conn.sendButton(m.chat, {
      body: `🧠 *AI Assistant (Google Gemini • بوت حمزة اعمرني)*\n━━━━━━━━━━━━━━━━\n\n${aiResponse}\n\n━━━━━━━━━━━━━━━━`,
      footer: 'bot amirni hamza • حمزة اعمرني',
      buttons: stdButtons
    }, { quoted: m });
  } catch (_) {
    await m.reply(aiResponse);
  }
};

handler.help = ['ai', 'gemini', 'gpt', 'imagine', 'dalle'];
handler.tags = ['ai'];
handler.command = /^(ai|gemini|bard|gpt|chatgpt|imagine|dalle|draw|رسم|تخيل)$/i;

export default handler;
