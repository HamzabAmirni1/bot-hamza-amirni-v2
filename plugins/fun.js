import axios from 'axios';

// ── Jokes Database ─────────────────────────────────────────────────────────────
const JOKES = {
  en: [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the computer go to the doctor? Because it had a virus!",
    "What do you call a fake noodle? An impasta!"
  ],
  ar: [
    "مرة واحد اشترى تلفزيون جديد، قعد قدامه ومسكه ريموت وقال: يالا يا جميل وريني شطارتك!",
    "واحد دخل مطعم وسأل الجرسون: عندكم أكل؟ قال له: آه، قال له: طب هات لي شوية أكل وأكون شاكر جداً!",
    "محشش بيسأل محشش تاني: تفتكر الجمعة توافق آخر الشهر؟ قال له: لو ضغطنا عليها يمكن توافق!"
  ],
  da: [
    "واحد المحشش شرى نضارات كبار، قال للناس: تبارك الله الدرب كبر هاد الأيام! 😂",
    "استاذ سول كولونيل: شنو هي أسرع حاجة فالعالم؟ قال له: الضوء. سول محشش، قال له: الفكرة! كيجيك إحساس دغيا فبالك! 😂",
    "واحد الشفار دخل لواحد الدار باش يسرق، لقي وحدة ناعسة، بقا يشوف فيها وهي تفيق وقالت ليه: كتعرف تقرأ الكف؟ قال ليها: أنا شفار مشي عراف! 😂"
  ]
};

// ── Facts Database ─────────────────────────────────────────────────────────────
const FACTS = {
  en: [
    "Honey never spoils. Organic honey found in ancient Egyptian tombs is still edible!",
    "Bananas are naturally slightly radioactive!",
    "Octopuses have three hearts and blue blood!"
  ],
  ar: [
    "العسل الصافي لا يفسد أبداً، ويمكن تناوله حتى بعد آلاف السنين!",
    "الأخطبوط يمتلك 3 قلوب ودمه لونه أزرق!",
    "الموز يعتبر من الفواكه ذات النشاط الإشعاعي الطبيعي البسيط!"
  ],
  da: [
    "العسل الحر ما كيكسرش وما كيطرا ليه والو حتى لو دازت عليه آلاف السنين!",
    "الأخطبوط عندو 3 دالقلوب والدم ديالو لونو أزرق!",
    "الفراشة كتدوق الماكلة بالرجلين ديالها ماشي بلسانها!"
  ]
};

// ── Flirt & Compliment Database ───────────────────────────────────────────────
const FLIRTS = {
  en: [
    "Are you a magician? Because whenever I look at you, everyone else disappears! ✨",
    "Do you have a map? I just keep getting lost in your eyes! 🗺️",
    "If perfection had a name, it would definitely be yours! 💖"
  ],
  ar: [
    "هل أنت ساحر؟ لأنك عندما تظهر يختفي الجميع من حولي! ✨",
    "عيناك أجمل من نجمات السماء في ليلة صافية! 🌟",
    "لو كان للجمال عنوان لكان اسمك! 💖"
  ],
  da: [
    "واش نتي ساحرة؟ حيت منين كنشوف فيك كلشي كيمشي وكتبقى غير نتي! ✨",
    "عينيك أ الزين أحسن من نجوم السماء! 🌟",
    "الزين والحاطة والنخوة.. تبارك الله عليك أ العشير! 💖"
  ]
};

const handler = async (m, { conn, usedPrefix: _p, command, text, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

  // Map full language name → short key used in databases
  const langKey = lang === 'english' ? 'en' : lang === 'arabic' ? 'ar' : 'da';

  const cmd = command.toLowerCase();

  // 1️⃣ Love Calculator (.love / .ship / .حب) ──────────────────────────────────
  if (['love', 'ship', 'حب', 'نسبة_الحب'].includes(cmd)) {
    let who1 = m.sender;
    let who2 = m.mentionedJid && m.mentionedJid[0];

    if (!who2 && m.quoted) who2 = m.quoted.sender;
    if (!who2) {
      return m.reply(t(
        '❌ Mention a user or reply to a message to calculate love percentage!\n\nExample:\n.love @user',
        '❌ يرجى منشنة شخص أو الرد على رسالته لحساب نسبة الحب!\n\n*مثال:*\n← .love @user',
        '❌ طاقي شي حد ولا ريبوندي عليه باش نحسبو نسبة الحب بيناتكم!\n\n*مثال:*\n← .love @user'
      ));
    }

    const name1 = who1.split('@')[0];
    const name2 = who2.split('@')[0];
    const percentage = Math.floor(Math.random() * 101);

    let comment = '';
    if (percentage < 25) comment = t('💔 Very low compatibility! Better off as strangers.', '💔 نسبة ضعيفة جداً! ربما من الأفضل البقاء غرباء.', '💔 العلاقة مكرفسة! غير نساو الموضوع السلك مقطوع.');
    else if (percentage < 50) comment = t('😐 Might work with patience and effort.', '😐 تحتاج إلى الكثير من الصبر والجهد لتنجح.', '😐 يمكن تصدق.. ولكن خاصها بزاف ديال الصبر.');
    else if (percentage < 75) comment = t('❤️ Good potential! Great chemistry.', '❤️ نسبة جيدة جداً وتوافق جميل!', '❤️ كاين أمل كبير! علاقة زوينة وغادة فالمزيان.');
    else if (percentage < 90) comment = t('😍 Amazing connection! True soulmates.', '😍 انسياب رائع وتفاهم كبير جداً!', '😍 يا سلام! حب كبير وتفاهم رائع الله يكمل بالخير.');
    else comment = t('💍 PerfectMatch! Get married already! 🔥', '💍 طاقة حب هائلة! استعدا للزواج فوراً! 🔥', '💍 صافي وجدو العرس! هادشي مكتوب فالسماء حب أبدي! 🔥');

    const filled = Math.floor(percentage / 10);
    const empty = 10 - filled;
    const bar = "🟥".repeat(filled) + "⬜".repeat(empty);

    const loveText = t(
`📠 *Love Calculator* 📠
━━━━━━━━━━━━━━━━━━━━━
👤 *@${name1}* ❤️ *@${name2}*
📊 *Percentage:* ${percentage}%
[${bar}]

💬 *Result:*
${comment}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📠 *حاسبة الحب والانسجام* 📠
━━━━━━━━━━━━━━━━━━━━━
👤 *@${name1}* ❤️ *@${name2}*
📊 *النسبة:* ${percentage}%
[${bar}]

💬 *التحليل:*
${comment}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📠 *ماكينة الحب* 📠
━━━━━━━━━━━━━━━━━━━━━
👤 *@${name1}* ❤️ *@${name2}*
📊 *النسبة:* ${percentage}%
[${bar}]

💬 *التحليل:*
${comment}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    );

    return await conn.sendMessage(m.chat, { text: loveText, mentions: [who1, who2] }, { quoted: m });
  }

  // 2️⃣ Rate / Simp / Stupid Meter (.rate / .simp / .stupid) ────────────────────
  if (['rate', 'simp', 'stupid', 'نسبة', 'تقييم'].includes(cmd)) {
    const target = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : (m.quoted ? m.quoted.sender : m.sender);
    const targetNum = target.split('@')[0];
    const score = Math.floor(Math.random() * 101);

    const filled = Math.floor(score / 10);
    const empty = 10 - filled;
    const bar = "🟩".repeat(filled) + "⬜".repeat(empty);

    const label = cmd === 'simp' ? t('Simp Rate', 'مقياس الخروف (Simp)', 'نسبة التطبيل والخرفنة') :
                  cmd === 'stupid' ? t('Stupidity Level', 'مقياس الغباء', 'نسبة الكلاخ') :
                  t('Rating', 'التقييم العام', 'النسبة العامة');

    const rateText = 
`📊 *${label}* 📊
👤 *@${targetNum}*
🔢 *Score:* ${score}%
[${bar}]

⚡ *bot amirni hamza*`;

    return await conn.sendMessage(m.chat, { text: rateText, mentions: [target] }, { quoted: m });
  }

  // 3️⃣ Jokes (.joke / .نكتة) ────────────────────────────────────────────────
  if (['joke', 'نكتة', 'نكت'].includes(cmd)) {
    const list = JOKES[langKey] || JOKES['da'];
    const item = list[Math.floor(Math.random() * list.length)];
    return m.reply(`😂 *${t('Random Joke', 'نكتة مضحكة', 'نكتة هربانة')}* 😂\n\n${item}`);
  }

  // 4️⃣ Facts (.fact / .معلومة) ──────────────────────────────────────────────
  if (['fact', 'معلومة', 'حقائق'].includes(cmd)) {
    const list = FACTS[langKey] || FACTS['da'];
    const item = list[Math.floor(Math.random() * list.length)];
    return m.reply(`💡 *${t('Did you know?', 'هل تعلم؟', 'واش كتعرف؟')}*\n\n${item}`);
  }

  // 5️⃣ Flirt & Compliment (.flirt / .غزل / .مدح) ───────────────────────────
  if (['flirt', 'compliment', 'غزل', 'مدح'].includes(cmd)) {
    const list = FLIRTS[langKey] || FLIRTS['da'];
    const item = list[Math.floor(Math.random() * list.length)];
    return m.reply(item);
  }

  // 6️⃣ Random Animal & Meme Images (.cat / .dog / .meme) ────────────────────
  if (['cat', 'قطة', 'قط'].includes(cmd)) {
    try {
      await m.react('🐱');
      const res = await axios.get('https://api.thecatapi.com/v1/images/search', { timeout: 8000 });
      const imgUrl = res.data?.[0]?.url;
      if (imgUrl) {
        return await conn.sendMessage(m.chat, { image: { url: imgUrl }, caption: '🐱 *Meow!* 🐾' }, { quoted: m });
      }
    } catch (_) {
      return m.reply('🐱 🐾');
    }
  }

  if (['dog', 'كلب'].includes(cmd)) {
    try {
      await m.react('🐶');
      const res = await axios.get('https://dog.ceo/api/breeds/image/random', { timeout: 8000 });
      const imgUrl = res.data?.message;
      if (imgUrl) {
        return await conn.sendMessage(m.chat, { image: { url: imgUrl }, caption: '🐶 *Woof!* 🐾' }, { quoted: m });
      }
    } catch (_) {
      return m.reply('🐶 🐾');
    }
  }

  if (['meme', 'ميمز', 'ميم'].includes(cmd)) {
    await m.react('😂');

    if (langKey === 'da') {
      const DARIJA_MEMES = [
        {
          title: "منين كتقول لمك 'راني مريض' وتقول ليك 'من داك التيليفون اللي فإيدك'",
          desc: "😂 *ميم مغربي هربان:* \n\nالمعاناة اليومية ديال أي مغربي مع الوالدة 💀"
        },
        {
          title: "منين كتدخل للدار مع 3 دالليل وكتلقى الباب مقفول بالسوارت من الداخل",
          desc: "😂 *لحظة الصدمة:* \n\nهنا كتعرف بلي المبيت فالدروج هو الحل الوحيد 😭👍"
        },
        {
          title: "الأستاذ: 'شكون اللي ما فهمش المادة؟'\nأنا والدراري فآخر الطاولة:",
          desc: "😂 *فالمدرسة المغربية:* \n\nنحنو لا نفهم شيئاً ولكننا نبتسم للجميع 🗿"
        },
        {
          title: "منين كتدخل للحمام وتلقى السطل الخاوي هو اللي باقي",
          desc: "😂 *المعاناة فالحمام:* \n\nأكبر خيانة فالتاريخ المغربي 💔"
        },
        {
          title: "صاحبك اللي كيقترض منك 20 درهم ويقولك 'غدا نردها ليك'",
          desc: "😂 *الأسطورة تقول:* \n\nدازت 3 سنوات ومازال غدا ما جاش 💀"
        },
        {
          title: "منين كتكون فالعرس وتشوف الطواجن جايين من بعيد",
          desc: "😂 *فالعراس المغربية:* \n\nالتركيز والسرعة 100% 🔥🍗"
        },
        {
          title: "منين كيسولك شي حد فالدرب 'واش كتعرف فلان؟'\nنتا:",
          desc: "😂 *الجواب المغربي الشهير:* \n\n'كنعرفو وما كنعرفوش' 😭👌"
        },
        {
          title: "منين كتفيق نهار الأحد مع 12 وتلقى الدار كاملة مسافرة وما خلاو ليك والو فالثلاجة",
          desc: "😂 *الجوع القاتل:* \n\nهنا كتعرف بلي نتا مجرد ضيف فداك الدار 💔"
        }
      ];

      const item = DARIJA_MEMES[Math.floor(Math.random() * DARIJA_MEMES.length)];
      const textMsg = `🇲🇦 *MEME MAROCAIN — ميم مغربي هربان* 😂\n━━━━━━━━━━━━━━━━━━━━━\n📌 *الوضعية:* \n"${item.title}"\n\n${item.desc}`;

      return await conn.sendButton(
        m.chat,
        {
          text: textMsg,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '🔄 ميم هربان آخر', id: `${_p}meme` })
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
    } else if (langKey === 'ar') {
      const ARABIC_MEMES = [
        {
          title: "عندما تدرس 5 دقائق وتكافئ نفسك بالنوم 8 ساعات",
          desc: "😂 *ميم عربي:* \n\nالإنتاجية والدراسة المكثفة 🗿"
        },
        {
          title: "الشخص الذي قال سأبدأ الدايت يوم الأحد:",
          desc: "😂 *الدايت:* \n\nتمر الأيام والأحد لا يأتي أبداً 😭"
        },
        {
          title: "عندما تسأل والدتك أين مفتاحي وتقول 'لو قمت ووجدته ماذا أفعل بك؟'",
          desc: "😂 *الرعب الحقيقي:* \n\nتجد الشيء في نفس المكان الذي بحثت فيه 10 مرات 💀"
        }
      ];

      const item = ARABIC_MEMES[Math.floor(Math.random() * ARABIC_MEMES.length)];
      const textMsg = `🇸🇦 *ميم عربي مضحك* 😂\n━━━━━━━━━━━━━━━━━━━━━\n📌 *الموقف:* \n"${item.title}"\n\n${item.desc}`;

      return await conn.sendButton(
        m.chat,
        {
          text: textMsg,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '🔄 ميم آخر', id: `${_p}meme` })
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
    } else {
      try {
        const res = await axios.get('https://meme-api.com/gimme', { timeout: 8000 });
        const imgUrl = res.data?.url;
        const title = res.data?.title || 'Funny Meme';
        if (imgUrl) {
          return await conn.sendMessage(m.chat, { image: { url: imgUrl }, caption: `😂 *${title}*` }, { quoted: m });
        }
      } catch (_) {
        return m.reply('😂 Funny Meme!');
      }
    }
  }
};

handler.help = ['love', 'rate', 'joke', 'fact', 'flirt', 'cat', 'dog', 'meme'];
handler.tags = ['fun'];
handler.command = /^(love|ship|حب|نسبة_الحب|rate|simp|stupid|نسبة|تقييم|joke|نكتة|نكت|fact|معلومة|حقائق|flirt|compliment|غزل|مدح|cat|قطة|قط|dog|كلب|meme|ميمز|ميم)$/i;

export default handler;
