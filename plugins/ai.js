import axios from 'axios';
import crypto from 'crypto';

// Helper: validate AI reply
function isValid(txt) {
  if (!txt || typeof txt !== 'string') return false;
  const clean = txt.trim();
  if (clean.length < 3) return false;
  const bad = ['missing text parameter', 'missing parameter', 'bad request', 'rate limit', 'too many requests', 'error code', 'internal server error', 'undefined', 'null', '<html>', '<!doctype', 'error', 'not exist', 'unexpected response', 'invalid response', '404 not found', 'no response received'];
  const lower = clean.toLowerCase();
  return !bad.some(b => lower === b || lower.startsWith(b + ':') || lower.startsWith(b + ' '));
}

// Multi-provider AI Caller using DuckDuckGo GPT-4o-mini + Airforce + Nowtech
async function askAI(prompt, userText) {
  // 1. DuckDuckGo DuckChat (Official GPT-4o-mini, ultra-fast)
  const fetchDuckDuckGo = async () => {
    const statusRes = await fetch('https://duckduckgo.com/duckchat/v1/status', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'x-vqd-accept': '1'
      }
    });
    const vqd = statusRes.headers.get('x-vqd-4');
    if (!vqd) throw new Error('No VQD');

    const chatRes = await fetch('https://duckduckgo.com/duckchat/v1/chat', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'x-vqd-4': vqd
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `${prompt}\n\nسؤال المستخدم: ${userText}` }]
      })
    });
    if (!chatRes.ok) throw new Error('DuckChat HTTP error');
    const raw = await chatRes.text();
    let text = '';
    for (const line of raw.split('\n')) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const json = JSON.parse(line.slice(6));
          if (json.message) text += json.message;
        } catch (_) {}
      }
    }
    if (isValid(text)) return text.trim();
    throw new Error('Invalid DuckChat reply');
  };

  // 2. Airforce API (GPT-4o-mini)
  const fetchAirforce = async () => {
    const res = await fetch('https://api.airforce/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }, { role: 'user', content: userText }],
        temperature: 0.8,
        max_tokens: 500
      })
    });
    if (!res.ok) throw new Error('Airforce error');
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content;
    if (isValid(txt)) return txt.trim();
    throw new Error('Invalid reply');
  };

  // 3. Nowtech (HMAC SHA512)
  const fetchNowtech = async () => {
    const ts = Date.now().toString();
    const secretKey = 'dfaugf098ad0g98-idfaugf098ad0g98-iduoafiunoa-f09a8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8gduoafiunoa-f09adfaugf098ad0g98-iduoafiunoa-f09a8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8g8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8g';
    const key = crypto.createHmac('sha512', secretKey).update(ts).digest('base64');
    const res = await fetch('http://aichat.nowtechai.com/now/v1/ai', {
      method: 'POST',
      headers: {
        'User-Agent': 'Ktor client',
        'Connection': 'Keep-Alive',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Key': key,
        'TimeStamps': ts
      },
      body: JSON.stringify({ content: `${prompt}\n\nسؤال: ${userText}` })
    });
    if (!res.ok) throw new Error('Nowtech error');
    const raw = await res.text();
    let result = '';
    for (const line of raw.split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          const content = json?.choices?.[0]?.delta?.content;
          if (content) result += content;
        } catch (_) {}
      }
    }
    if (isValid(result)) return result.trim();
    throw new Error('Invalid reply');
  };

  try {
    return await Promise.any([fetchDuckDuckGo(), fetchAirforce(), fetchNowtech()]);
  } catch (_) {
    return null;
  }
}

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

  let aiResponse = await askAI(sysPrompt, text);

  if (!aiResponse) {
    aiResponse = t(
      'Sorry, the AI service is temporarily busy. Please ask again in a moment.',
      'عذراً، خدمة الذكاء الاصطناعي مشغولة حالياً. حاول إعادة السؤال بعد قليل.',
      'سمح ليا أ عشيري، خدمة الذكاء الاصطناعي عليها ضغط حالياً 😅 عاود سولني دابا نيت!'
    );
  }

  try {
    await conn.sendButton(m.chat, {
      body: `🧠 *AI Assistant (بوت حمزة اعمرني)*\n━━━━━━━━━━━━━━━━\n\n${aiResponse}\n\n━━━━━━━━━━━━━━━━`,
      footer: 'bot amirni hamza • حمزة اعمرني',
      buttons: stdButtons
    }, { quoted: m });
  } catch (_) {
    await m.reply(aiResponse);
  }
};

handler.help = ['ai', 'gpt', 'imagine', 'dalle'];
handler.tags = ['ai'];
handler.command = /^(ai|gpt|chatgpt|imagine|dalle|draw|رسم|تخيل)$/i;

export default handler;
