// ── Supplications & Adhkar Database ──────────────────────────────────────────
const ADHKAR = {
  sabah: {
    en: [
      "☀️ *Morning Adhkar:* 'We have reached the morning and at this very time all sovereignty belongs to Allah, Lord of the worlds.'",
      "☀️ *Morning Adhkar:* 'O Allah, by Your leave we have reached the morning and by Your leave we have reached the evening...'",
      "☀️ *Ayat Al-Kursi:* 'Allah! There is no deity except Him, the Ever-Living, the Sustainer of all existence...'"
    ],
    ar: [
      "☀️ *أذكار الصباح:* «أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ...»",
      "☀️ *أذكار الصباح:* «اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ»",
      "☀️ *آية الكرسي:* ﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ...﴾"
    ],
    da: [
      "☀️ *أذكار الصباح:* «أَصْبَحْنَا وَأَصْبَحَ المُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ...»",
      "☀️ *سيد الاستغفار:* «اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ...»",
      "☀️ *التحصين:* «بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ» (3 مرات)"
    ]
  },
  masaa: {
    en: [
      "🌆 *Evening Adhkar:* 'We have reached the evening and at this very time all sovereignty belongs to Allah...'",
      "🌆 *Evening Adhkar:* 'O Allah, whatever blessing has been received by me or any of Your creation this evening is from You alone...'"
    ],
    ar: [
      "🌆 *أذكار المساء:* «أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ...»",
      "🌆 *أذكار المساء:* «اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ...»"
    ],
    da: [
      "🌆 *أذكار المساء:* «أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ...»",
      "🌆 *أذكار المساء:* «أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ» (3 مرات)"
    ]
  },
  nawm: {
    en: [
      "🛌 *Sleep Adhkar:* 'In Your name, my Lord, I lie down, and in Your name I rise...'",
      "🛌 *Sleep Adhkar:* 'O Allah, I have submitted myself to You, and turned my face towards You...'"
    ],
    ar: [
      "🛌 *أذكار النوم:* «بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِاسْمِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا...»",
      "🛌 *أذكار النوم:* «اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ» (3 مرات)"
    ],
    da: [
      "🛌 *أذكار النوم:* «بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِاسْمِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا...»",
      "🛌 *قراءة المعوذات:* سورة الإخلاص والفرق والناس والمسح بهما على الجسد."
    ]
  },
  faraj: {
    en: [
      "🤲 *Dua for Relief:* 'La ilaha illa anta subhanaka inni kuntu minadh-dhalimin' (There is no deity except You, exalted are You! Indeed, I have been of the wrongdoers).",
      "🤲 *Dua for Relief:* 'O Allah, I hope for Your mercy, so do not leave me to myself even for the blink of an eye...'"
    ],
    ar: [
      "🤲 *دعاء الفرج:* «لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ»",
      "🤲 *دعاء التيسير:* «اللَّهُمَّ لاَ سَهْلَ إِلاَّ مَا جَعَلْتَهُ سَهْلاً، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلاً»"
    ],
    da: [
      "🤲 *دعاء الفرج:* «لَّا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ»",
      "🤲 *دعاء التيسير والرزق:* «اللَّهُمَّ لاَ سَهْلَ إِلاَّ مَا جَعَلْتَهُ سَهْلاً، وَأَنْتَ تَجْعَلُ الْحَزْنَ إِذَا شِئْتَ سَهْلاً»"
    ]
  },
  shifa: {
    en: [
      "🩺 *Dua for Healing:* 'Remove the harm, O Lord of mankind, and heal, You are the Healer, there is no healing but Your healing...'",
      "🩺 *Dua for Healing:* 'I seek refuge in Allah and His Power from the evil of what I find and fear' (7 times)."
    ],
    ar: [
      "🩺 *دعاء الشفاء:* «أَذْهِبِ الْبَاسَ رَبَّ النَّاسِ، وَاشْفِ أَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ، شِفَاءً لاَ يُغَادِرُ سَقَماً»",
      "🩺 *رقية المريض:* «أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ» (7 مرات)"
    ],
    da: [
      "🩺 *دعاء الشفاء:* «أَذْهِبِ الْبَاسَ رَبَّ النَّاسِ، وَاشْفِ أَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ...»",
      "🩺 *الرقية الشرعية:* «أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ» (7 مرات)"
    ]
  }
};

const handler = async (m, { conn, usedPrefix: _p, command, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;
  const langKey = lang === 'english' ? 'en' : lang === 'arabic' ? 'ar' : 'da';

  const category = (args[0] || '').toLowerCase();

  const categoriesMap = {
    'sabah': ADHKAR.sabah, 'صباح': ADHKAR.sabah, 'الصباح': ADHKAR.sabah, 'morning': ADHKAR.sabah,
    'masaa': ADHKAR.masaa, 'مساء': ADHKAR.masaa, 'المساء': ADHKAR.masaa, 'evening': ADHKAR.masaa,
    'nawm': ADHKAR.nawm, 'نوم': ADHKAR.nawm, 'النوم': ADHKAR.nawm, 'sleep': ADHKAR.nawm,
    'faraj': ADHKAR.faraj, 'فرج': ADHKAR.faraj, 'تيسير': ADHKAR.faraj, 'relief': ADHKAR.faraj,
    'shifa': ADHKAR.shifa, 'شفاء': ADHKAR.shifa, 'الشفاء': ADHKAR.shifa, 'healing': ADHKAR.shifa
  };

  if (!category || !categoriesMap[category]) {
    const mainCardText = t(
`🕌 *Islamic Adhkar & Supplications (Ad3iya)* 🕌
━━━━━━━━━━━━━━━━━━━━━

Select an Adhkar category below to read authentic supplications:

1️⃣ ☀️ *Morning Adhkar*
2️⃣ 🌆 *Evening Adhkar*
3️⃣ 🛌 *Sleep Adhkar*
4️⃣ 🤲 *Dua for Relief & Ease*
5️⃣ 🩺 *Dua for Healing*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *الأدعية والأذكار الإسلامية* 🕌
━━━━━━━━━━━━━━━━━━━━━

اختر فئة الأذكار والأدعية من القائمة التفاعلية أسفله:

1️⃣ ☀️ *أذكار الصباح*
2️⃣ 🌆 *أذكار المساء*
3️⃣ 🛌 *أذكار النوم*
4️⃣ 🤲 *أدعية الفرج والتيسير*
5️⃣ 🩺 *أدعية الشفاء والرقية*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *الأدعية والأذكار الإسلامية (Ad3iya)* 🕌
━━━━━━━━━━━━━━━━━━━━━

عزل تصنيف الأذكار والأدعية اللي باغي من القائمة أسفله:

1️⃣ ☀️ *أذكار الصباح*
2️⃣ 🌆 *أذكار المساء*
3️⃣ 🛌 *أذكار النوم*
4️⃣ 🤲 *أدعية الفرج والتيسير*
5️⃣ 🩺 *أدعية الشفاء والرقية*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    );

    const rows = [
      { title: t('☀️ Morning Adhkar', '☀️ أذكار الصباح', '☀️ أذكار الصباح'), description: t('Morning supplications', 'أذكار وأدعية الصباح', 'أذكار وأدعية الصباح'), id: `${_p}ad3iya صباح` },
      { title: t('🌆 Evening Adhkar', '🌆 أذكار المساء', '🌆 أذكار المساء'), description: t('Evening supplications', 'أذكار وأدعية المساء', 'أذكار وأدعية المساء'), id: `${_p}ad3iya مساء` },
      { title: t('🛌 Sleep Adhkar', '🛌 أذكار النوم', '🛌 أذكار النوم'), description: t('Bedtime supplications', 'أذكار وأدعية النوم', 'أذكار وأدعية النوم'), id: `${_p}ad3iya نوم` },
      { title: t('🤲 Relief & Ease Dua', '🤲 أدعية الفرج والتيسير', '🤲 أدعية الفرج والتيسير'), description: t('Dua for relief and ease', 'أدعية الفرج وتيسير الأمور', 'أدعية الفرج وتيسير الأمور'), id: `${_p}ad3iya فرج` },
      { title: t('🩺 Healing & Ruqyah Dua', '🩺 أدعية الشفاء والرقية', '🩺 أدعية الشفاء والرقية'), description: t('Dua for healing and health', 'أدعية الشفاء والرقية الشرعية', 'أدعية الشفاء والرقية الشرعية'), id: `${_p}ad3iya شفاء` }
    ];

    try {
      return await conn.sendButton(
        m.chat,
        {
          text: mainCardText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: t('🕌 Select Adhkar Category', '🕌 اختر قسم الأذكار', '🕌 عزل قسم الأذكار'),
                sections: [{ title: t('📖 Categories', '📖 الأقسام المتاحة', '📖 الأقسام المتاحة'), rows }]
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: t('☀️ Morning Adhkar', '☀️ أذكار الصباح', '☀️ أذكار الصباح'),
                id: `${_p}ad3iya صباح`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: t('🌆 Evening Adhkar', '🌆 أذكار المساء', '🌆 أذكار المساء'),
                id: `${_p}ad3iya مساء`
              })
            }
          ]
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(mainCardText);
    }
  }

  const selectedBank = categoriesMap[category];
  const list = selectedBank[langKey] || selectedBank['da'];

  const adhkarText =
`🕌 *${t('Adhkar & Supplications', 'الأدعية والأذكار المختارة', 'الأدعية والأذكار المختارة')}* 🕌
━━━━━━━━━━━━━━━━━━━━━

${list.join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`;

  try {
    return await conn.sendButton(
      m.chat,
      {
        text: adhkarText,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: t('🔄 Change Category', '🔄 قسم آخر', '🔄 قسم آخر'),
              id: `${_p}ad3iya`
            })
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
              display_text: '📢 ' + t('WhatsApp Channel', 'قناة الواتساب', 'قناة الواتساب'),
              url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p',
              merchant_url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '👑 ' + t('Owner', 'المطور', 'مالك البوت'),
              id: `${_p}owner`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🌐 ' + t('Change Language', 'تغيير اللغة', 'تغيير اللغة'),
              id: `${_p}lang`
            })
          }
        ]
      },
      { quoted: m }
    );
  } catch (_) {
    return m.reply(adhkarText);
  }
};

handler.help = ['ad3iya', 'dua', 'اذكار'];
handler.tags = ['islamic'];
handler.command = /^(ad3iya|dua|ادعية|أدعية|اذكار|أذكار)$/i;

export default handler;
