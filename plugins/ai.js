import axios from 'axios';

// Helper: validate AI reply
function isValid(txt) {
  if (!txt || typeof txt !== 'string') return false;
  const clean = txt.trim();
  if (clean.length < 2) return false;
  const bad = ['missing text parameter', 'missing parameter', 'bad request', 'rate limit', 'too many requests', 'error code', 'internal server error', 'undefined', 'null', '<html>', '<!doctype'];
  const lower = clean.toLowerCase();
  return !bad.some(b => lower.includes(b));
}

// Multi-provider AI Caller incorporating silana-lite providers
async function askAI(prompt, userText) {
  const msgs = [
    { role: 'system', content: prompt },
    { role: 'user', content: userText }
  ];

  // 1. DeepSeek v3 (from silana-lite)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 937e9831-d15e-4674-8bd3-a30be3e148e9',
        'Content-Type': 'application/json',
        'User-Agent': 'okhttp/4.12.0'
      },
      body: JSON.stringify({
        model: 'deepseek-v3-1-250821',
        messages: msgs,
        max_tokens: 600,
        temperature: 0.7
      }),
      signal: ctrl.signal
    });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const txt = data?.choices?.[0]?.message?.content;
      if (isValid(txt)) return txt.trim();
    }
  } catch (_) {}

  // 2. ChatUpAI (from silana-lite)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch('https://api.chatupai.org/api/v1/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ChatUpAI-Client/1.3.0'
      },
      body: JSON.stringify({ messages: msgs }),
      signal: ctrl.signal
    });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const txt = data?.data?.content;
      if (isValid(txt)) return txt.trim();
    }
  } catch (_) {}

  // 3. ChatEverywhere GPT-4 (from silana-lite)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch('https://chateverywhere.app/api/chat/', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
      },
      body: JSON.stringify({
        model: {
          id: 'gpt-4',
          name: 'GPT-4',
          maxLength: 32000,
          tokenLimit: 8000,
          completionTokenLimit: 5000,
          deploymentName: 'gpt-4'
        },
        messages: [{ pluginId: null, content: userText, role: 'user' }],
        prompt: prompt,
        temperature: 0.7
      }),
      signal: ctrl.signal
    });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.text();
      if (isValid(data)) return data.trim();
    }
  } catch (_) {}

  // 4. Airforce API (GPT-4o-mini)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch('https://api.airforce/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: msgs,
        temperature: 0.8,
        max_tokens: 600
      }),
      signal: ctrl.signal
    });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const txt = data?.choices?.[0]?.message?.content;
      if (isValid(txt)) return txt.trim();
    }
  } catch (_) {}

  // 5. BK9 AI (GPT-4)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(`https://bk9.fun/ai/gpt4?q=${encodeURIComponent(userText)}`, {
      signal: ctrl.signal
    });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const txt = data?.BK9 || data?.result || data?.message;
      if (isValid(txt)) return txt.trim();
    }
  } catch (_) {}

  // 6. Pollinations POST
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const seed = Math.floor(Math.random() * 9999999);
    const res = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ messages: msgs, model: 'openai', seed, temperature: 0.85 }),
      signal: ctrl.signal
    });
    clearTimeout(tid);
    if (res.ok) {
      const txt = await res.text();
      if (isValid(txt)) return txt.trim();
    }
  } catch (_) {}

  return null;
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
