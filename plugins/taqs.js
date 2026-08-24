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
  { ar: 'الراشيدية', en: 'Er-Rachidia' },
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
    cities: ['Marrakech', 'Ouarzazate', 'Zagora', 'Er-Rachidia', 'Tinghir']
  },
  {
    titleAr: '🌵 الصحراء',
    titleEn: '🌵 Sahara',
    cities: ['Laayoune', 'Dakhla', 'Smara', 'Boujdour']
  }
];

async function getWeatherInfo(city) {
  try {
    const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 10000 });
    const data = res.data;
    if (!data || !data.current_condition?.[0]) return null;

    const current = data.current_condition[0];
    const area = data.nearest_area?.[0];

    return {
      city: area?.areaName?.[0]?.value || city,
      country: area?.country?.[0]?.value || 'Morocco',
      tempC: current.temp_C,
      feelsLikeC: current.FeelsLikeC,
      humidity: current.humidity,
      windKm: current.windspeedKmph,
      condition: current.weatherDesc?.[0]?.value || 'Clear',
      uvIndex: current.uvIndex || 'N/A'
    };
  } catch (e) {
    console.error('Weather API error:', e.message);
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
`🌤️ *Weather Forecast (Taqs)* 🌤️
━━━━━━━━━━━━━━━━━━━━━

Select your city below to get current live weather report:

1️⃣ 🏙️ *Select a major city*
2️⃣ 📍 *Or type your city name:* \`${_p}taqs Casablanca\`

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🌤️ *حالة الطقس والأرصاد الجوية* 🌤️
━━━━━━━━━━━━━━━━━━━━━

اختر مدينتك من القائمة أسفله لعرض حالة الطقس المباشرة:

1️⃣ 🏙️ *اختر مدينة مغربية رئيسية*
2️⃣ 📍 *أو اكتب اسم مدينتك:* \`${_p}taqs الرباط\`

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🌤️ *حالة الطقس والأرصاد الجوية (Taqs)* 🌤️
━━━━━━━━━━━━━━━━━━━━━

عزل مدينتك من القائمة أسفله باش تشوف حالة الطقس المباشرة:

1️⃣ 🏙️ *اختر مدينة مغربية*
2️⃣ 📍 *ولا اكتب اسم مدينتك:* \`${_p}taqs الرباط\`

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
          title: `🌤️ ${c.ar} (${c.en})`,
          description: t(`Weather forecast for ${c.en}`, `حالة الطقس لمدينة ${c.ar}`, `حالة الطقس لمدينة ${c.ar}`),
          id: `${_p}taqs ${c.en}`
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
                title: t('🌤️ Select City', '🌤️ اختر مدينة', '🌤️ عزل مدينة'),
                sections
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🌤️ ' + t('Rabat', 'الرباط', 'الرباط'),
                id: `${_p}taqs Rabat`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🌤️ ' + t('Casablanca', 'الدار البيضاء', 'الدار البيضاء'),
                id: `${_p}taqs Casablanca`
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

  // Fetch Weather Info
  await m.react('🌤️');
  const weather = await getWeatherInfo(cityInput);

  if (!weather) {
    return m.reply(t(
      `❌ Could not fetch weather report for: *${cityInput}*. Please check the city name!`,
      `❌ تعذر جلب حالة الطقس لمدينة: *${cityInput}*. يرجى التأكد من اسم المدينة!`,
      `❌ ما قدرناش نجيبو حالة الطقس لمدينة: *${cityInput}*. تأكد من اسم المدينة أ خاي!`
    ));
  }

  const cardCaption = t(
`🌤️ *WEATHER FORECAST — ${weather.city.toUpperCase()} (${weather.country.toUpperCase()})* 🌤️
━━━━━━━━━━━━━━━━━━━━━
🌡️ *Temperature:* ${weather.tempC}°C (Feels like: ${weather.feelsLikeC}°C)
🌤️ *Condition:* ${weather.condition}
💧 *Humidity:* ${weather.humidity}%
💨 *Wind Speed:* ${weather.windKm} km/h
☀️ *UV Index:* ${weather.uvIndex}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🌤️ *حالة الطقس لمدينة ${weather.city}* 🌤️
━━━━━━━━━━━━━━━━━━━━━
🌡️ *درجة الحرارة:* ${weather.tempC}°م (المرجحة: ${weather.feelsLikeC}°م)
🌤️ *الحالة الجوية:* ${weather.condition}
💧 *نسبة الرطوبة:* ${weather.humidity}%
💨 *سرعة الرياح:* ${weather.windKm} كم/س
☀️ *مؤشر الأشعة:* ${weather.uvIndex}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🌤️ *حالة الطقس لمدينة ${weather.city}* 🌤️
━━━━━━━━━━━━━━━━━━━━━
🌡️ *درجة الحرارة:* ${weather.tempC}°C (الإحساس: ${weather.feelsLikeC}°C)
🌤️ *الحالة الجوية:* ${weather.condition}
💧 *نسبة الرطوبة:* ${weather.humidity}%
💨 *سرعة الرياح:* ${weather.windKm} km/h
☀️ *مؤشر الشمس:* ${weather.uvIndex}
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
              id: `${_p}taqs`
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

handler.help = ['taqs', 'weather', 'طقس'];
handler.tags = ['islamic', 'tools'];
handler.command = /^(taqs|taqes|weather|طقس|الطقس|أرصاد)$/i;

export default handler;
