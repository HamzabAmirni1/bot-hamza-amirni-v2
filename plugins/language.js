const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

async function saveLangToSupabase(sender, lang) {
  try {
    await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        jid: `lang_${sender}`,
        history: JSON.stringify({ language: lang, hasSelectedLang: true }),
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    console.error('[saveLangToSupabase] Error:', e.message);
  }
}

let handler = async (m, { conn, text, command, usedPrefix }) => {
  let user = global.db.data.users[m.sender];
  if (!user) {
    user = { language: 'darija', hasSelectedLang: false };
    global.db.data.users[m.sender] = user;
  }

  const choice = (text || '').trim().toLowerCase();

  // Quick command alias triggers (e.g. .darija / .arabic / .english)
  if (command === 'darija' || choice === '1' || choice === 'darija' || choice === 'الدارجة' || choice === 'دارجة') {
    user.language = 'darija';
    user.hasSelectedLang = true;
    saveLangToSupabase(m.sender, 'darija');
    return m.reply(
`🇲🇦 *واخا أ عشيري! مختارها الدارجة!* 🥳
━━━━━━━━━━━━━━━━━━━━━

صافي، دابا غادي نهضرو بالدارجة النشاط! 😂
كل حاجة طلبتيها كنجيبها ليك — حتى واخا كانت فالسماء 🚀

📌 *جرب دابا كتب:*
← ${usedPrefix}menu
باش تشوف القائمة!

📌 *بغيتي تبدل اللغة؟ كتب غير:*
← ${usedPrefix}lang

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`
    );
  }

  if (command === 'arabic' || choice === '2' || choice === 'arabic' || choice === 'عربي' || choice === 'العربية') {
    user.language = 'arabic';
    user.hasSelectedLang = true;
    saveLangToSupabase(m.sender, 'arabic');
    return m.reply(
`🇸🇦 *تم اختيار اللغة العربية الفصحى بنجاح!*
━━━━━━━━━━━━━━━━━━━━━

أهلاً بك! تم ضبط لغة البوت إلى العربية الفصحى.

📌 *أرسل الآن:*
← ${usedPrefix}menu
لعرض القائمة الرئيسية والأوامر المتاحة.

📌 *للتغيير في أي وقت أرسل:*
← ${usedPrefix}lang

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`
    );
  }

  if (command === 'english' || choice === '3' || choice === 'en' || choice === 'english' || choice === 'إنجليزي') {
    user.language = 'english';
    user.hasSelectedLang = true;
    saveLangToSupabase(m.sender, 'english');
    return m.reply(
`🇬🇧 *Language Changed to English Successfully!*
━━━━━━━━━━━━━━━━━━━━━

Welcome! Your preferred language is now set to English.

📌 Type *.menu* to display the main features and commands list.
📌 To change language anytime, type *.lang*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`
    );
  }

  // Display Language Selection Card with 3 Options
  const currentLang = user.language || 'darija';
  const menuText = 
`🌐 *اختيار لغة البوت | Choose Bot Language*
━━━━━━━━━━━━━━━━━━━━━

سلام! 👋 اختار اللغة اللي بغيتي نهضر معاك بيها:

1️⃣ 🇲🇦 *الدارجة المغربية* — كنهضر معاك بالدارجة كيف الناس العارفين
2️⃣ 🇸🇦 *العربية الفصحى* — أسلوب فصيح ومباشر
3️⃣ 🇬🇧 *English* — Clean & Friendly

━━━━━━━━━━━━━━━━━━━━━
👇 *كيداز تختار:*
• كتب *1* للدارجة المغربية 🇲🇦
• كتب *2* للعربية الفصحى 🇸🇦
• كتب *3* للإنجليزية 🇬🇧

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`;

  // Send with quick buttons / text fallback
  try {
    await conn.sendButton(
      m.chat,
      {
        text: menuText,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🇲🇦 الدارجة المغربية',
              id: `${usedPrefix}lang 1`,
            }),
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🇸🇦 العربية الفصحى',
              id: `${usedPrefix}lang 2`,
            }),
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🇬🇧 English',
              id: `${usedPrefix}lang 3`,
            }),
          },
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
              display_text: '📢 WhatsApp Channel',
              url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p',
              merchant_url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '👑 Owner المطور',
              id: `${usedPrefix}owner`
            })
          }
        ],
      },
      { quoted: m }
    );
  } catch (_) {
    m.reply(menuText);
  }
};

handler.help = ['language'];
handler.tags = ['main'];
handler.command = ['lang', 'language', 'لغة', 'اللغة', 'darija', 'arabic', 'english'];

export default handler;
