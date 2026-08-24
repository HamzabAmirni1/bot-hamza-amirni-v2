import axios from 'axios';

const MOROCCAN_CITIES = [
  { ar: 'الرباط', en: 'Rabat' },
  { ar: 'الدار البيضاء', en: 'Casablanca' },
  { ar: 'فاس', en: 'Fes' },
  { ar: 'مراكش', en: 'Marrakech' },
  { ar: 'طنجة', en: 'Tangier' },
  { ar: 'أكادير', en: 'Agadir' },
  { ar: 'وجدة', en: 'Oujda' },
  { ar: 'الناظور', en: 'Nador' },
  { ar: 'مكناس', en: 'Meknes' },
  { ar: 'تطوان', en: 'Tetouan' },
  { ar: 'العيون', en: 'Laayoune' },
  { ar: 'الداخلة', en: 'Dakhla' },
  { ar: 'القنيطرة', en: 'Kenitra' },
  { ar: 'الجديدة', en: 'El Jadida' },
  { ar: 'آسفي', en: 'Safi' },
  { ar: 'بني ملال', en: 'Beni Mellal' },
  { ar: 'خريبكة', en: 'Khouribga' },
  { ar: 'تازة', en: 'Taza' },
  { ar: 'الحسيمة', en: 'Al Hoceima' },
  { ar: 'العرائش', en: 'Larache' },
  { ar: 'القصر الكبير', en: 'Ksar el-Kebir' },
  { ar: 'الصويرة', en: 'Essaouira' },
  { ar: 'برشيد', en: 'Berrechid' },
  { ar: 'سطات', en: 'Settat' },
  { ar: 'تيزنيت', en: 'Tiznit' },
  { ar: 'تافراوت', en: 'Tafraout' },
  { ar: 'ورزازات', en: 'Ouarzazate' },
  { ar: 'زاكورة', en: 'Zagora' },
  { ar: 'الراشيدية', en: 'Errachidia' },
  { ar: 'فيكيك', en: 'Figuig' },
  { ar: 'وادي زم', en: 'Oued Zem' },
  { ar: 'خنيفرة', en: 'Khenifra' },
  { ar: 'أزيلال', en: 'Azilal' },
  { ar: 'افران', en: 'Ifrane' },
  { ar: 'الخميسات', en: 'Khemisset' },
  { ar: 'تمارة', en: 'Temara' },
  { ar: 'سلا', en: 'Sale' },
  { ar: 'المحمدية', en: 'Mohammedia' },
  { ar: 'الفداء مديونة', en: 'Mediouna' },
  { ar: 'بنسليمان', en: 'Ben Slimane' },
  { ar: 'سيدي بنور', en: 'Sidi Bennour' },
  { ar: 'بركان', en: 'Berkane' },
  { ar: 'الدريوش', en: 'Driouch' },
  { ar: 'تاوريرت', en: 'Taourirt' },
  { ar: 'جرادة', en: 'Jerada' },
  { ar: 'الشاون', en: 'Chefchaouen' },
  { ar: 'صفرو', en: 'Sefrou' },
  { ar: 'تيسة', en: 'Tissa' },
  { ar: 'ميدلت', en: 'Midelt' },
  { ar: 'إيموزار كنداروسن', en: 'Imouzzer Kandar' },
  { ar: 'مرنيسة', en: 'Mrirt' },
  { ar: 'تنغير', en: 'Tinghir' },
  { ar: 'الطينة', en: 'Tan-Tan' },
  { ar: 'كلميم', en: 'Guelmim' },
  { ar: 'أسا زاك', en: 'Assa' },
  { ar: 'السمارة', en: 'Smara' },
  { ar: 'بوجدور', en: 'Boujdour' }
];

// City sections for single_select (max 5 rows per section recommended, 10 allowed)
const CITY_SECTIONS = [
  {
    titleAr: '🧭 الشمال',
    titleEn: '🧭 North',
    cities: ['Tangier', 'Tetouan', 'Al Hoceima', 'Larache', 'Chefchaouen', 'Nador']
  },
  {
    titleAr: '🏙️ الوسط',
    titleEn: '🏙️ Center',
    cities: ['Rabat', 'Sale', 'Casablanca', 'Mohammedia', 'Kenitra', 'Temara', 'Khemisset']
  },
  {
    titleAr: '🌊 الجنوب الغربي',
    titleEn: '🌊 Southwest',
    cities: ['Agadir', 'Tiznit', 'Guelmim', 'Tan-Tan', 'Essaouira', 'Safi']
  },
  {
    titleAr: '🌅 الشرق',
    titleEn: '🌅 East',
    cities: ['Oujda', 'Berkane', 'Figuig', 'Taourirt', 'Jerada']
  },
  {
    titleAr: '🏔️ الداخل',
    titleEn: '🏔️ Interior',
    cities: ['Meknes', 'Fes', 'Taza', 'Sefrou', 'Ifrane', 'Midelt', 'Khenifra', 'Beni Mellal']
  },
  {
    titleAr: '🏜️ الجنوب الشرقي',
    titleEn: '🏜️ Southeast',
    cities: ['Marrakech', 'Ouarzazate', 'Zagora', 'Errachidia', 'Tinghir']
  },
  {
    titleAr: '🌵 الصحراء',
    titleEn: '🌵 Sahara',
    cities: ['Laayoune', 'Dakhla', 'Smara', 'Boujdour']
  }
];

async function getPrayerTimes(city, country = 'Morocco') {
  try {
    const res = await axios.get(`http://api.aladhan.com/v1/timingsByCity`, {
      params: { city, country, method: 3 }, // Method 3 = Muslim World League / General
      timeout: 10000
    });

    const data = res.data?.data;
    if (!data) return null;

    return {
      timings: data.timings,
      date: data.date?.readable,
      hijri: `${data.date?.hijri?.day} ${data.date?.hijri?.month?.ar || data.date?.hijri?.month?.en} ${data.date?.hijri?.year}`,
      city
    };
  } catch (e) {
    console.error('Aladhan API error:', e.message);
    return null;
  }
}

const handler = async (m, { conn, usedPrefix: _p, command, text, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

  const cityInput = (text || args.join(' ')).trim();

  // If no city provided, show main cities selection menu card
  if (!cityInput) {
    const mainCardText = t(
`🕌 *Morocco & Global Prayer Times (Salat)* 🕌
━━━━━━━━━━━━━━━━━━━━━

Select your city below to get accurate prayer times:

1️⃣ 🏙️ *Select a major Moroccan city*
2️⃣ 📍 *Or type your city name:* \`${_p}salat Rabat\`

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *أوقات الصلاة في المغرب والعالم* 🕌
━━━━━━━━━━━━━━━━━━━━━

اختر مدينتك من القائمة أسفله لعرض أوقات الصلاة الدقيقة اليوم:

1️⃣ 🏙️ *اختر مدينة مغربية رئيسية*
2️⃣ 📍 *أو اكتب اسم مدينتك:*
← \`${_p}salat الرباط\`

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *أوقات الصلاة لجميع المدن المغربية (Salat)* 🕌
━━━━━━━━━━━━━━━━━━━━━

عزل مدينتك من القائمة أسفله باش تشوف أوقات الصلاة داليوم:

1️⃣ 🏙️ *اختر مدينة مغربية*
2️⃣ 📍 *ولا اكتب اسم مدينتك:*
← \`${_p}salat الرباط\`

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    );

    // Build sections with city rows
    const cityMap = Object.fromEntries(MOROCCAN_CITIES.map(c => [c.en, c]));
    const sections = CITY_SECTIONS.map(sec => ({
      title: t(sec.titleEn, sec.titleAr, sec.titleAr),
      rows: sec.cities
        .map(en => cityMap[en])
        .filter(Boolean)
        .map(c => ({
          title: `🕌 ${c.ar} (${c.en})`,
          description: t(`Prayer times for ${c.en}`, `أوقات الصلاة لمدينة ${c.ar}`, `أوقات الصلاة لمدينة ${c.ar}`),
          id: `${_p}salat ${c.en}`
        }))
    }));

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
                title: t('🕌 Select Moroccan City', '🕌 اختر مدينة مغربية', '🕌 عزل مدينة مغربية'),
                sections
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🕌 ' + t('Rabat', 'الرباط', 'الرباط'),
                id: `${_p}salat Rabat`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🏙️ ' + t('Casablanca', 'الدار البيضاء', 'الدار البيضاء'),
                id: `${_p}salat Casablanca`
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

  // Fetch Prayer Times for provided city
  await m.react('🕌');
  const result = await getPrayerTimes(cityInput);

  if (!result) {
    return m.reply(t(
      `❌ Could not fetch prayer times for: *${cityInput}*. Please check the city name!`,
      `❌ تعذر جلب أوقات الصلاة لمدينة: *${cityInput}*. يرجى التأكد من اسم المدينة!`,
      `❌ ما قدرناش نجيبو أوقات الصلاة لمدينة: *${cityInput}*. تأكد من اسم المدينة أ خاي!`
    ));
  }

  const { timings, date, hijri, city } = result;

  const cardCaption = t(
`🕌 *PRAYER TIMES — ${city.toUpperCase()}* 🕌
━━━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${date}
🌙 *Hijri Date:* ${hijri}

🌅 *Fajr:* ${timings.Fajr}
☀️ *Sunrise:* ${timings.Sunrise}
☀️ *Dhuhr:* ${timings.Dhuhr}
🌤️ *Asr:* ${timings.Asr}
🌆 *Maghrib:* ${timings.Maghrib}
🌌 *Isha:* ${timings.Isha}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *أوقات الصلاة لمدينة ${city}* 🕌
━━━━━━━━━━━━━━━━━━━━━
📅 *التاريخ الميلادي:* ${date}
🌙 *التاريخ الهجري:* ${hijri}

🌅 *الفجر:* ${timings.Fajr}
☀️ *الشرق/الشروق:* ${timings.Sunrise}
☀️ *الظهر:* ${timings.Dhuhr}
🌤️ *العصر:* ${timings.Asr}
🌆 *المغرب:* ${timings.Maghrib}
🌌 *العشاء:* ${timings.Isha}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *أوقات الصلاة لمدينة ${city}* 🕌
━━━━━━━━━━━━━━━━━━━━━
📅 *التاريخ الميلادي:* ${date}
🌙 *التاريخ الهجري:* ${hijri}

🌅 *الفجر:* ${timings.Fajr}
☀️ *الشروق:* ${timings.Sunrise}
☀️ *الظهر:* ${timings.Dhuhr}
🌤️ *العصر:* ${timings.Asr}
🌆 *المغرب:* ${timings.Maghrib}
🌌 *العشاء:* ${timings.Isha}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
  );

  try {
    return await conn.sendButton(
      m.chat,
      {
        text: cardCaption,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🔄 ' + t('Change City', 'تغيير المدينة', 'بدّل المدينة'),
              id: `${_p}salat`
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
    return m.reply(cardCaption);
  }
};

handler.help = ['salat', 'prayer', 'صلاة'];
handler.tags = ['islamic'];
handler.command = /^(salat|prayer|صلاة|أوقات_الصلاة|الصلوات|صلوات)$/i;

export default handler;
