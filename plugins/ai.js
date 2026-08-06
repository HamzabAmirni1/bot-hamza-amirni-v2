import axios from 'axios';

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
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '🌐 ' + t('Change Language', 'تغيير اللغة', 'تغيير اللغة'),
        id: `${usedPrefix}lang`
      })
    }
  ];

  if (!text) {
    const usageMsg = t(
      `🤖 *AI Assistant & Image Generator*\n\n📌 *Usage:*\n• ${usedPrefix + command} What is Quantum Physics?\n• ${usedPrefix}imagine A cute kitten flying in space`,
      `🤖 *الذكاء الاصطناعي وتوليد الصور*\n\n📌 *طريقة الاستخدام:*\n← ${usedPrefix + command} ما هي عاصمة المغرب؟\n← ${usedPrefix}imagine قطة لطيفة تطير في الفضاء`,
      `🤖 *الذكاء الاصطناعي ورسم الصور*\n\n📌 *طريقة الاستعمال:*\n← ${usedPrefix + command} عاود ليا شي نكتة زوينة بالدارجة\n← ${usedPrefix}imagine مش طائر فالسماء كيضحك`
    );

    return await conn.sendButton(m.chat, {
      body: usageMsg,
      footer: 'bot amirni hamza • حمزة اعمرني',
      buttons: stdButtons
    }, { quoted: m });
  }

  // ── 1. Image Generation Commands (.imagine, .dalle) ──────────────────────
  if (/^(imagine|dalle|draw|رسم|تخيل)$/i.test(command)) {
    await m.reply(t('🎨 Generating AI image, please wait...', '🎨 جاري توليد الصورة بالذكاء الاصطناعي...', '🎨 جاري رسم الصورة بالذكاء الاصطناعي، انتظر لحظة...'));
    try {
      const encodedPrompt = encodeURIComponent(text);
      const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;
      
      await conn.sendButton(m.chat, {
        image: { url: imageUrl },
        caption: `🎨 *AI Image Generator*\n\n📝 *Prompt:* _${text}_\n\n🤖 *bot amirni hamza • حمزة اعمرني*`,
        footer: 'bot amirni hamza • حمزة اعمرني',
        buttons: stdButtons
      }, { quoted: m });
    } catch (e) {
      console.error(e);
      m.reply(t('❌ Failed to generate image. Please try again.', '❌ فشل توليد الصورة. يرجى المحاولة لاحقاً.', '❌ وقع مشكل فـ رسم الصورة، عاود حاول من بعد.'));
    }
    return;
  }

  // ── 2. Text AI Commands (.ai, .gpt, .chat) ──────────────────────────────
  await m.reply(t('🧠 Thinking...', '🧠 جاري التفكير والإجابة...', '🧠 البوت كيفكر فـ الجواب، انتظر لحظة...'));

  try {
    let aiResponse = null;

    try {
      const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(text)}?model=openai`);
      if (res.data && typeof res.data === 'string' && res.data.length > 5) {
        aiResponse = res.data;
      }
    } catch (_) {}

    if (!aiResponse) {
      try {
        const res = await axios.get(`https://api.simsimi.vn/v1/simtalk`, {
          params: { text: text, lc: 'ar' }
        });
        if (res.data && res.data.message) {
          aiResponse = res.data.message;
        }
      } catch (_) {}
    }

    if (!aiResponse) {
      aiResponse = t(
        'Sorry, I could not process your request at the moment.',
        'عذراً، لم أستطع معالجة طلبك حالياً.',
        'سمح ليا أ عشيري، وقع مشكل فـ السيرفر د الذكاء الاصطناعي، عاود سولني من بعد!'
      );
    }

    const responseText = `🧠 *AI Assistant (الذكاء الاصطناعي)*\n━━━━━━━━━━━━━━━━━━━━━\n\n${aiResponse}\n\n━━━━━━━━━━━━━━━━━━━━━`;
    
    await conn.sendButton(m.chat, {
      body: responseText,
      footer: 'bot amirni hamza • حمزة اعمرني',
      buttons: stdButtons
    }, { quoted: m });

  } catch (err) {
    console.error(err);
    m.reply(t('❌ An error occurred with AI service.', '❌ حدث خطأ في خدمة الذكاء الاصطناعي.', '❌ وقع خطأ فـ الذكاء الاصطناعي.'));
  }
};

handler.help = ['ai', 'gpt', 'imagine', 'dalle'];
handler.tags = ['ai'];
handler.command = /^(ai|gpt|chatgpt|imagine|dalle|draw|رسم|تخيل)$/i;

export default handler;
