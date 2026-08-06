import axios from 'axios';

// ── In-Memory Sessions ────────────────────────────────────────────────────────
const activeSessions = new Map(); // chatJid -> { type, answer, data }

// ── True/False Questions Bank ──────────────────────────────────────────────────
const TF_QUESTIONS = [
  { q: { en: "Is Rabat the capital of Morocco?", ar: "هل الرباط هي عاصمة المغرب؟", da: "واش الرباط هي عاصمة المغرب؟" }, a: true },
  { q: { en: "Does the sun revolve around the Earth?", ar: "هل الشمس تدور حول الأرض؟", da: "واش الشمس كتدور حول الأرض؟" }, a: false },
  { q: { en: "Do elephants fly?", ar: "هل الفيل يطير؟", da: "واش الفيل كيطير؟" }, a: false },
  { q: { en: "Is water made of Hydrogen and Oxygen?", ar: "هل الماء يتكون من الهيدروجين والأكسجين؟", da: "واش الماء كيتكون من هيدروجين وأكسجين؟" }, a: true },
  { q: { en: "Did Morocco win against Brazil in 2023?", ar: "هل فاز المغرب على البرازيل في 2023؟", da: "واش المغرب ربح البرازيل ف 2023؟" }, a: true },
  { q: { en: "Do fish sleep with their eyes open?", ar: "هل الأسماك تنام وأعينها مفتوحة؟", da: "واش الحوت كينعس وعينيه محلولين؟" }, a: true },
  { q: { en: "Does an octopus have 3 hearts?", ar: "هل الأخطبوط يملك 3 قلوب؟", da: "واش الأخطبوط عندو 3 دالقلوب؟" }, a: true },
  { q: { en: "Is Bitcoin a digital currency?", ar: "هل البيتكوين عملة رقمية؟", da: "واش البيتكوين عملة رقمية؟" }, a: true }
];

// ── Truth & Dare Bank ──────────────────────────────────────────────────────────
const TRUTHS = {
  en: ["What is your biggest secret?", "Who was your first crush?", "What is your biggest fear?", "Have you ever lied to your best friend?"],
  ar: ["ما هو أكبر سر تخفيه؟", "من كان أول شخص أحببته؟", "ما هو أكبر مخاوفك في الحياة؟", "هل كذبت يوماً على صديقك المقرب؟"],
  da: ["شنو أكبر سر مخبي؟", "شكون أول واحد عجبك؟", "شنو أكبر حاجة كتخاف منها؟", "واش عمرك كذبتي على أعز صديق عندك؟"]
};

const DARES = {
  en: ["Send a funny audio message to the group!", "Change your WhatsApp status to 'I love AI Bots' for 1 hour!", "Send the 5th image in your gallery to the group!"],
  ar: ["أرسل رسالة صوتية مضحكة في المجموعة!", "غيّر حالتك في واتساب إلى 'أنا أحب الذكاء الاصطناعي' لمدة ساعة!", "أرسل الصورة رقم 5 في الاستوديو إلى المجموعة!"],
  da: ["صيفط أوديو مضحك فالجروب!", "بدّل الستاتي ديالك فواتساب لـ 'أنا كنبغي البوتات' لمدة ساعة!", "صيفط التصويرة رقم 5 فالغاليري ديالك فالجروب!"]
};

const handler = async (m, { conn, usedPrefix: _p, command, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

  const langKey = lang === 'english' ? 'en' : lang === 'arabic' ? 'ar' : 'da';

  const cmd = command.toLowerCase();

  // 1️⃣ Rock Paper Scissors (.rps / .حجرة) ── Interactive Buttons Card ────────
  if (['rps', 'حجرة', 'ورقة', 'مقص'].includes(cmd)) {
    const input = (args[0] || '').toLowerCase();
    const map = {
      'rock': 'rock', 'hjar': 'rock', 'hjra': 'rock', 'pierre': 'rock', 'حجرة': 'rock', 'حجره': 'rock', '🪨': 'rock', '✊': 'rock',
      'paper': 'paper', 'wr9a': 'paper', 'warqa': 'paper', 'feuille': 'paper', 'ورقة': 'paper', 'ورقه': 'paper', '📄': 'paper', '✋': 'paper',
      'scissors': 'scissors', 'm9as': 'scissors', 'mqas': 'scissors', 'ciseaux': 'scissors', 'مقص': 'scissors', '✂️': 'scissors', '✌️': 'scissors'
    };

    if (!input || !map[input]) {
      const rpsCardText = t(
`🎮 *Rock Paper Scissors Game* 🎮

Choose your move by clicking one of the buttons below:

✊ *Rock*  •  ✋ *Paper*  •  ✌️ *Scissors*

Challenge the bot and see who wins! 🤖`,

`🎮 *لعبة حجرة ورقة مقص* 🎮

اختر حركتك بالضغط على أحد الأزرار التفاعلية أسفله:

✊ *حجرة*  •  ✋ *ورقة*  •  ✌️ *مقص*

تحدى البوت وشوف من سيفوز! 🤖`,

`🎮 *لعبة حجرة ورقة مقص* 🎮

عزل الحركة ديالك بالضغط على الزرار أسفله:

✊ *حجرة*  •  ✋ *ورقة*  •  ✌️ *مقص*

تحدى البوت وشوف شكون يربح! 🤖`
      );

      try {
        return await conn.sendButton(
          m.chat,
          {
            text: rpsCardText,
            footer: 'bot amirni hamza',
            buttons: [
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '✊ ' + t('Rock', 'حجرة', 'حجرة'), id: `${_p}rps حجرة` })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '✋ ' + t('Paper', 'ورقة', 'ورقة'), id: `${_p}rps ورقة` })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '✌️ ' + t('Scissors', 'مقص', 'مقص'), id: `${_p}rps مقص` })
              },
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({ display_text: '📸 Instagram', url: 'https://instagram.com/hamza_amirni_01', merchant_url: 'https://instagram.com/hamza_amirni_01' })
              },
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({ display_text: '📢 WhatsApp Channel', url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p', merchant_url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p' })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '👑 Owner المطور', id: `${_p}owner` })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '🌐 Change Language', id: `${_p}lang` })
              }
            ]
          },
          { quoted: m }
        );
      } catch (_) {
        return m.reply(rpsCardText);
      }
    }

    const player = map[input];
    const choices = ['rock', 'paper', 'scissors'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    const names = {
      rock: t('Rock', 'حجرة', 'حجرة'),
      paper: t('Paper', 'ورقة', 'ورقة'),
      scissors: t('Scissors', 'مقص', 'مقص')
    };

    let resultMsg = '';
    if (player === botChoice) {
      resultMsg = t('🤝 *Draw!* We picked the same.', '🤝 *تعادل!* اخترنا نفس الشيء.', '🤝 *تعادل!* بجوجنا بحال بحال.');
    } else if (
      (player === 'rock' && botChoice === 'scissors') ||
      (player === 'paper' && botChoice === 'rock') ||
      (player === 'scissors' && botChoice === 'paper')
    ) {
      resultMsg = t('🎉 *You Won!* Outstanding job! 💪', '🎉 *فزت!* عمل رائع جدًا! 💪', '🎉 *ربحتي!* نتا واعر معلم. 💪');
    } else {
      resultMsg = t('🤖 *Bot Won!* Better luck next time! 😜', '🤖 *أنا فزت!* حظًا أوفر المرة القادمة! 😜', '🤖 *أنا ربحت!* حظ أوفر المرة الجاية. 😜');
    }

    const resText = t(
`🎮 *RPS Result:*

👤 *You:* ${emojis[player]} (${names[player]})
🤖 *Bot:* ${emojis[botChoice]} (${names[botChoice]})

${resultMsg}`,

`🎮 *نتيجة المباراة:*

👤 *أنت:* ${emojis[player]} (${names[player]})
🤖 *البوت:* ${emojis[botChoice]} (${names[botChoice]})

${resultMsg}`,

`🎮 *النتيجة:*

👤 *نتا:* ${emojis[player]} (${names[player]})
🤖 *البوت:* ${emojis[botChoice]} (${names[botChoice]})

${resultMsg}`
    );

    return await conn.sendButton(
      m.chat,
      {
        text: resText,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: '🔄 ' + t('Play Again', 'لعب مرة أخرى', 'العب مرة خرى'), id: `${_p}rps` })
          }
        ]
      },
      { quoted: m }
    );
  }

  // 2️⃣ True or False (.truefalse / .صح) ── Interactive Buttons Card ──────────
  if (['truefalse', 'tf', 'صح', 'خطأ'].includes(cmd)) {
    const session = activeSessions.get(m.chat);
    const userAnsInput = (args[0] || '').toLowerCase();

    if (session && session.type === 'tf' && userAnsInput) {
      let userAns = null;
      if (['true', 't', 'صحيح', 'صح', 'oui', 'yes', '1'].includes(userAnsInput)) userAns = true;
      if (['false', 'f', 'خطأ', 'لا', 'non', 'no', '0'].includes(userAnsInput)) userAns = false;

      if (userAns !== null) {
        activeSessions.delete(m.chat);
        if (userAns === session.answer) {
          return m.reply(t('✅ *Correct!* Great job! 🎉', '✅ *إجابة صحيحة!* ممتاز! 🎉', '✅ *برافو!* جواب صحيح. 🎉'));
        } else {
          const correctText = session.answer ? t('True', 'صحيح', 'صح') : t('False', 'خطأ', 'خطأ');
          return m.reply(t(`❌ *Wrong!* Correct answer was: *${correctText}*`, `❌ *إجابة خاطئة!* الجواب الصحيح هو: *${correctText}*`, `❌ *غلط!* الجواب الصحيح كان: *${correctText}*`));
        }
      }
    }

    // Start new question
    const item = TF_QUESTIONS[Math.floor(Math.random() * TF_QUESTIONS.length)];
    activeSessions.set(m.chat, { type: 'tf', answer: item.a });

    const qText = item.q[langKey] || item.q['da'];
    const cardText = t(
`🤔 *True or False Quiz* 🤔

Question: *${qText}*

Click your answer below:`,

`🤔 *سؤال صح أم خطأ؟* 🤔

السؤال: *${qText}*

اضغط على إجابتك أسفله:`,

`🤔 *صح أم خطأ؟* 🤔

السؤال: *${qText}*

اضغط على جوابك أسفله:`
    );

    try {
      return await conn.sendButton(
        m.chat,
        {
          text: cardText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '✅ ' + t('True', 'صحيح', 'صح'), id: `${_p}truefalse صح` })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '❌ ' + t('False', 'خطأ', 'خطأ'), id: `${_p}truefalse خطأ` })
            }
          ]
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(cardText);
    }
  }

  // 3️⃣ Football Penalty Kick (.penalty / .ضربات_ترجيح) ──────────────────────
  if (['penalty', 'kora', 'كرة', 'ضربة'].includes(cmd)) {
    const directionInput = (args[0] || '').toLowerCase();
    const dirs = {
      'left': 'left', 'يسار': 'left', 'اليسار': 'left', '⬅️': 'left',
      'center': 'center', 'وسط': 'center', 'الوسط': 'center', '⬆️': 'center',
      'right': 'right', 'يمين': 'right', 'اليمين': 'right', '➡️': 'right'
    };

    if (!directionInput || !dirs[directionInput]) {
      const penText = t(
`⚽ *Football Penalty Shootout* ⚽

Choose where to shoot your penalty kick:

⬅️ *Left*  •  ⬆️ *Center*  •  ➡️ *Right*

Can you beat the goalkeeper? 🧤`,

`⚽ *ضربات الترجيح لكرة القدم* ⚽

اختر اتجاه تسديد ركلة الترجيح:

⬅️ *اليسار*  •  ⬆️ *الوسط*  •  ➡️ *اليمين*

هل يمكنك التغلب على الحارس؟ 🧤`,

`⚽ *ضربات ترجيح كرة القدم* ⚽

عزل فين باغي تيري الكورة:

⬅️ *اليسار*  •  ⬆️ *الوسط*  •  ➡️ *اليمين*

واش تقدر تسجل على الحارس؟ 🧤`
      );

      try {
        return await conn.sendButton(
          m.chat,
          {
            text: penText,
            footer: 'bot amirni hamza',
            buttons: [
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '⬅️ ' + t('Left', 'اليسار', 'اليسار'), id: `${_p}penalty يسار` })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '⬆️ ' + t('Center', 'الوسط', 'الوسط'), id: `${_p}penalty وسط` })
              },
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({ display_text: '➡️ ' + t('Right', 'اليمين', 'اليمين'), id: `${_p}penalty يمين` })
              }
            ]
          },
          { quoted: m }
        );
      } catch (_) {
        return m.reply(penText);
      }
    }

    const playerDir = dirs[directionInput];
    const keeperChoices = ['left', 'center', 'right'];
    const keeperDir = keeperChoices[Math.floor(Math.random() * keeperChoices.length)];

    const dirNames = {
      left: t('Left ⬅️', 'اليسار ⬅️', 'اليسار ⬅️'),
      center: t('Center ⬆️', 'الوسط ⬆️', 'الوسط ⬆️'),
      right: t('Right ➡️', 'اليمين ➡️', 'اليمين ➡️')
    };

    if (playerDir !== keeperDir) {
      const winText = t(
`⚽ *GOOOAL!* 🎉

👤 *Your Kick:* ${dirNames[playerDir]}
🧤 *Goalkeeper Jumped:* ${dirNames[keeperDir]}

🔥 Fantastic goal! You scored!`,

`⚽ *هـــــــــــدف!* 🎉

👤 *تسديدتك:* ${dirNames[playerDir]}
🧤 *ارتمى الحارس إلى:* ${dirNames[keeperDir]}

🔥 هدف رائع وجميل جداً!`,

`⚽ *جــــــــــــــــول!* 🎉

👤 *التيرية ديالك:* ${dirNames[playerDir]}
🧤 *الحارس طاح فـ:* ${dirNames[keeperDir]}

🔥 كول ناضي معلم!`
      );

      return await conn.sendButton(
        m.chat,
        {
          text: winText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '⚽ ' + t('Shoot Again', 'تسديدة أخرى', 'تيري كورة أخرى'), id: `${_p}penalty` })
            }
          ]
        },
        { quoted: m }
      );
    } else {
      const loseText = t(
`🧤 *SAVED BY THE KEEPER!* ❌

👤 *Your Kick:* ${dirNames[playerDir]}
🧤 *Goalkeeper Jumped:* ${dirNames[keeperDir]}

😅 The goalkeeper caught your shot!`,

`🧤 *تصدي رائع من الحارس!* ❌

👤 *تسديدتك:* ${dirNames[playerDir]}
🧤 *ارتمى الحارس إلى:* ${dirNames[keeperDir]}

😅 الحارس جاب الكورة وحرمك من الهدف!`,

`🧤 *الحارس شدها لك!* ❌

👤 *التيرية ديالك:* ${dirNames[playerDir]}
🧤 *الحارس طاح فـ:* ${dirNames[keeperDir]}

😅 الحارس حواها لك وحبس الكورة!`
      );

      return await conn.sendButton(
        m.chat,
        {
          text: loseText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '⚽ ' + t('Try Again', 'محاولة أخرى', 'جرب مرة خرى'), id: `${_p}penalty` })
            }
          ]
        },
        { quoted: m }
      );
    }
  }

  // 4️⃣ Slot Machine (.slots / .سلوتس) ───────────────────────────────────────
  if (['slots', 'slot', 'سلوتس'].includes(cmd)) {
    const items = ['🍒', '🍋', '🍉', '🍇', '💎', '7️⃣'];
    const a = items[Math.floor(Math.random() * items.length)];
    const b = items[Math.floor(Math.random() * items.length)];
    const c = items[Math.floor(Math.random() * items.length)];

    const isJackpot = a === b && b === c;
    const isPair = a === b || b === c || a === c;

    const resMsg = t(
`🎰 *SLOT MACHINE* 🎰
━━━━━━━━━━━━━━━━━━━━━
[  ${a}  |  ${b}  |  ${c}  ]
━━━━━━━━━━━━━━━━━━━━━

${isJackpot ? '🎉 *JACKPOT!* Big Win! 🏆' : isPair ? '✨ *Nice Match!* 2 of a kind!' : '😅 *No match!* Try your luck again!'}`,

`🎰 *ماكينة الحظ - سلوتس* 🎰
━━━━━━━━━━━━━━━━━━━━━
[  ${a}  |  ${b}  |  ${c}  ]
━━━━━━━━━━━━━━━━━━━━━

${isJackpot ? '🎉 *الجائزة الكبرى!* فوز ساحق! 🏆' : isPair ? '✨ *تطابق جيد!* عنصران متشابهان!' : '😅 *حاول مرة أخرى!*'}`,

`🎰 *ماكينة الحظ والسلوتس* 🎰
━━━━━━━━━━━━━━━━━━━━━
[  ${a}  |  ${b}  |  ${c}  ]
━━━━━━━━━━━━━━━━━━━━━

${isJackpot ? '🎉 *الجاكبوت!* فركعتيها أ الساط! 🏆' : isPair ? '✨ *جبتي جوج متشابهين!* ناضي!' : '😅 *ما جبتي والو!* عاود ضرب الحظ!'}`
    );

    return await conn.sendButton(
      m.chat,
      {
        text: resMsg,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: '🎰 ' + t('Spin Again', 'تدوير مرة أخرى', 'دور السلوتس تاني'), id: `${_p}slots` })
          }
        ]
      },
      { quoted: m }
    );
  }

  // 5️⃣ Magic 8-Ball (.8ball / .حظ) ──────────────────────────────────────────
  if (['8ball', 'eightball', 'كرة_الحظ'].includes(cmd)) {
    const question = args.join(' ');
    if (!question) {
      return m.reply(t(
        'Ask a question!\n\nExample:\n.8ball Will I be rich?',
        'اطرح سؤالاً على كرة الحظ!\n\n*مثال:*\n← .8ball هل سأصبح غنياً؟',
        'سول كرة الحظ شي سؤال!\n\n*مثال:*\n← .8ball واش غنولي لاباس عليا؟'
      ));
    }

    const answers = {
      en: ["Yes, definitely!", "It is certain.", "Most likely.", "Ask again later.", "Cannot predict now.", "Don't count on it.", "My sources say no.", "Outlook not so good."],
      ar: ["نعم، بالتأكيد!", "من المؤكد ذلك.", "على الأرجح نعم.", "إسأل لاحقاً.", "لا يمكن التنبؤ الآن.", "لا تعتمد على ذلك.", "مصادر تؤكد لا.", "الآفاق ليست جيدة."],
      da: ["إيه، آكييييد!", "مضمونة 100%.", "غالبًا إيه.", "سولني من بعد.", "مابانش ليا دابا.", "ماتعولش عليها.", "الجواب هو لا.", "الناضية مكيناش."]
    };

    const list = answers[langKey] || answers['da'];
    const ans = list[Math.floor(Math.random() * list.length)];

    return m.reply(`🎱 *Magic 8-Ball*\n\n❓ *Question:* ${question}\n🔮 *Answer:* ${ans}`);
  }

  // 6️⃣ Truth or Dare (.truth / .dare / .صراحة / .تحدي) ──────────────────────
  if (['truth', 'dare', 'صراحة', 'تحدي'].includes(cmd)) {
    const isTruth = ['truth', 'صراحة'].includes(cmd);
    const bank = isTruth ? TRUTHS : DARES;
    const items = bank[langKey] || bank['da'];
    const selected = items[Math.floor(Math.random() * items.length)];

    const title = isTruth ? t('🎯 *TRUTH QUESTION*', '🎯 *سؤال صراحة*', '🎯 *سؤال صراحة*') : t('🔥 *DARE CHALLENGE*', '🔥 *تحدي جريح*', '🔥 *تحدي واعر*');

    return await conn.sendButton(
      m.chat,
      {
        text: `${title}\n\n${selected}`,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: '🎯 ' + t('Truth', 'صراحة', 'صراحة'), id: `${_p}truth` })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: '🔥 ' + t('Dare', 'تحدي', 'تحدي'), id: `${_p}dare` })
          }
        ]
      },
      { quoted: m }
    );
  }
};

handler.help = ['rps', 'truefalse', 'penalty', 'slots', '8ball', 'truth', 'dare'];
handler.tags = ['game'];
handler.command = /^(rps|حجرة|ورقة|مقص|truefalse|tf|صح|خطأ|penalty|kora|كرة|ضربة|slots|slot|سلوتس|8ball|eightball|كرة_الحظ|truth|dare|صراحة|تحدي)$/i;

export default handler;
