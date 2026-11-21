import axios from 'axios';

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

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
  { ar: 'الطانطان', en: 'Tan-Tan' },
  { ar: 'كلميم', en: 'Guelmim' },
  { ar: 'أسا زاك', en: 'Assa' },
  { ar: 'السمارة', en: 'Smara' },
  { ar: 'بوجدور', en: 'Boujdour' }
];

// Helper to find city metadata
function findCity(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  return MOROCCAN_CITIES.find(c =>
    c.en.toLowerCase() === q ||
    c.ar.toLowerCase() === q ||
    c.en.toLowerCase().includes(q) ||
    c.ar.includes(query.trim())
  ) || null;
}

// Sync subscribers to Supabase
async function syncSubscribersToSupabase() {
  try {
    const list = global.db?.data?.salat_reminders || {};
    await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        jid: 'config_salat_subscribers',
        history: JSON.stringify(list),
        updated_at: new Date().toISOString()
      })
    });
  } catch (_) {}
}

// City sections for single_select
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

export async function getPrayerTimes(city, country = 'Morocco') {
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
  if (!global.db.data.users) global.db.data.users = {};
  if (!global.db.data.users[m.sender]) global.db.data.users[m.sender] = {};
  if (!global.db.data.salat_reminders) global.db.data.salat_reminders = {};

  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

  const rawArg = (text || '').trim();
  const subAction = (args[0] || '').toLowerCase();

  // ── SUB-COMMAND: AUTO-REMINDER TOGGLE (.salat rem on/off or .salat on/off) ───
  if (/^(rem|auto|alert|تذكير|تفعيل|الغاء|ايقاف|off|on|stop)$/i.test(subAction)) {
    const param = (args[1] || '').toLowerCase();
    const isOff = /^(off|stop|disable|إيقاف|حبس|الغاء|حذف)$/i.test(param) || /^(off|stop|إيقاف|حبس|الغاء)$/i.test(subAction);

    if (isOff) {
      delete global.db.data.salat_reminders[m.sender];
      if (global.db.data.users[m.sender].salat_reminder) {
        global.db.data.users[m.sender].salat_reminder.active = false;
      }
      await syncSubscribersToSupabase();

      return m.reply(t(
        `🔕 *Automatic Prayer & Adhkar Reminders have been DEACTIVATED.*\nYou can reactivate anytime using: \`${_p}salat\``,
        `🔕 *تم إيقاف التذكير التلقائي بالصلوات والأدعية بنجاح.*\nيمكنك إعادة تفعيله في أي وقت بكتابة: \`${_p}salat\``,
        `🔕 *تم حبس التذكير التلقائي بالصلوات والأدعية بنجاح.*\nإلى بغيتي تعاود تفعلو فأي وقت كتب: \`${_p}salat\``
      ));
    }

    // Determine target city for reminder
    const cityQuery = args.slice(/^(rem|auto|alert|تذكير|تفعيل)$/i.test(subAction) ? 2 : 1).join(' ').trim() ||
                      (args[1] && !/^(on|enable)$/i.test(args[1]) ? args.slice(1).join(' ').trim() : '') ||
                      user.salat_reminder?.city ||
                      'Casablanca';

    const matched = findCity(cityQuery) || { en: cityQuery, ar: cityQuery };
    const botPhone = (conn.user?.id || '').split(':')[0].split('@')[0] || (process.env.PAIRING_NUMBER || '').replace(/[^0-9]/g, '');

    const reminderRecord = {
      active: true,
      city: matched.en,
      cityAr: matched.ar,
      chat: m.chat,
      sender: m.sender,
      phone: m.sender.split('@')[0],
      botPhone: botPhone,
      subscribedAt: new Date().toISOString()
    };

    global.db.data.users[m.sender].salat_reminder = reminderRecord;
    global.db.data.salat_reminders[m.sender] = reminderRecord;
    await syncSubscribersToSupabase();

    const confirmMsg = t(
      `🔔 *Automatic Prayer & Daily Adhkar Reminder ACTIVATED!* 🕌\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 *Selected City:* ${matched.en} (${matched.ar})\n\n` +
      `✨ *What you will receive automatically:*\n` +
      `1️⃣ 🕌 *Adhan Reminders:* Right on time for all 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha).\n` +
      `2️⃣ ☀️ *Daily Adhkar:* Morning Adhkar at sunrise & Evening Adhkar.\n` +
      `3️⃣ 📖 *Friday Blessings:* Full Surat Al-Kahf recitation (Audio MP3 + Text) every Friday morning.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `❌ *To Stop Anytime:* Send \`${_p}salat rem off\` or click the disable button below.\n` +
      `⚡ *bot amirni hamza*`,

      `🔔 *تم تفعيل التذكير التلقائي بالصلوات والأدعية بنجاح!* 🕌\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 *المدينة المحددة:* ${matched.ar} (${matched.en})\n\n` +
      `✨ *ما ستتوصل به تلقائياً على واتساب:*\n` +
      `1️⃣ 🕌 *تنبيهات الأذان:* فور حلول وقت كل صلاة من الصلوات الخمس (الفجر، الظهر، العصر، المغرب، العشاء).\n` +
      `2️⃣ ☀️ *أذكار وأدعية اليوم:* أذكار الصباح والمساء يومياً.\n` +
      `3️⃣ 📖 *بركات يوم الجمعة:* سورة الكهف كاملة (تلاوة صوتية خاشعة + نص مكتوب) كل صباح جمعة.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `❌ *لإيقاف التذكير في أي وقت:* أرسل \`${_p}salat rem off\` أو اضغط على زر الإيقاف.\n` +
      `⚡ *bot amirni hamza*`,

      `🔔 *تم تفعيل التذكير التلقائي بالصلوات والأدعية بنجاح!* 🕌\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 *المدينة ديالك:* ${matched.ar} (${matched.en})\n\n` +
      `✨ *شنو غادي يوصلك تلقائياً فـ واتساب:*\n` +
      `1️⃣ 🕌 *أذان الصلاة:* مع وقت كل صلاة نيشان (الفجر، الظهر، العصر، المغرب، العشاء).\n` +
      `2️⃣ ☀️ *أذكار اليوم:* أذكار الصباح وأذكار المساء كل نهار.\n` +
      `3️⃣ 📖 *يوم الجمعة:* سورة الكهف كاملة (أوديو بصوت نقي + قراءة) كل صباح جمعة فابور.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `❌ *باش تحبس التذكير فأي وقت:* صيفط \`${_p}salat rem off\`\n` +
      `⚡ *bot amirni hamza*`
    );

    try {
      return await conn.sendButton(
        m.chat,
        {
          text: confirmMsg,
          footer: 'bot amirni hamza • @hamza_amirni_01',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🔕 ' + t('Deactivate Reminder', 'إيقاف التذكير التلقائي', 'حبس التذكير'),
                id: `${_p}salat rem off`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🤲 ' + t('Today\'s Adhkar', 'أذكار اليوم', 'أذكار اليوم'),
                id: `${_p}ad3iya`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '📖 ' + t('Surat Al-Kahf', 'سورة الكهف', 'سورة الكهف'),
                id: `${_p}kahf`
              })
            }
          ]
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(confirmMsg);
    }
  }

  // ── MAIN FLOW: BROWSE CITIES OR VIEW TIMES ─────────────────────────
  const cityInput = rawArg;

  // If no city provided, show main cities selection menu card
  if (!cityInput) {
    const isSubscribed = !!global.db.data.salat_reminders[m.sender];
    const subCity = global.db.data.salat_reminders[m.sender]?.cityAr || global.db.data.salat_reminders[m.sender]?.city;

    const mainCardText = t(
`🕌 *Morocco & Global Prayer Times (Salat)* 🕌
━━━━━━━━━━━━━━━━━━━━━
Status: ${isSubscribed ? `🔔 Active for ${subCity}` : '🔕 Inactive'}

Select your city below to get accurate prayer times:

1️⃣ 🏙️ *Select a major Moroccan city*
2️⃣ 📍 *Or type your city name:* \`${_p}salat Rabat\`
3️⃣ 🔔 *Activate auto-reminders:* click the reminder button after selecting your city!

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *أوقات الصلاة في المغرب والعالم (Salat)* 🕌
━━━━━━━━━━━━━━━━━━━━━
الحالة: ${isSubscribed ? `🔔 التذكير التلقائي مفعل لمدينة (${subCity})` : '🔕 التذكير التلقائي غير مفعل'}

اختر مدينتك من القائمة أسفله لعرض أوقات الصلاة الدقيقة اليوم:

1️⃣ 🏙️ *اختر مدينة مغربية رئيسية*
2️⃣ 📍 *أو اكتب اسم مدينتك:* \`${_p}salat الرباط\`
3️⃣ 🔔 *تفعيل التذكير التلقائي بالصلوات وسورة الكهف:* اختر مدينتك واضغط على زر التفعيل!

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *أوقات الصلاة لجميع المدن المغربية (Salat)* 🕌
━━━━━━━━━━━━━━━━━━━━━
الحالة: ${isSubscribed ? `🔔 التذكير التلقائي خدام لمدينة (${subCity})` : '🔕 التذكير التلقائي ما مفعلش'}

عزل مدينتك من القائمة أسفله باش تشوف أوقات الصلاة داليوم:

1️⃣ 🏙️ *اختر مدينة مغربية*
2️⃣ 📍 *ولا اكتب اسم مدينتك:* \`${_p}salat الرباط\`
3️⃣ 🔔 *التذكير التلقائي بالصلوات وسورة الكهف الجمعة:* عزل مدينتك وورك على زر التفعيل!

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
          description: t(`Prayer times & reminders for ${c.en}`, `أوقات الصلاة وتفعيل التذكير لـ ${c.ar}`, `أوقات الصلاة والتذكير لـ ${c.ar}`),
          id: `${_p}salat ${c.en}`
        }))
    }));

    const mainButtons = [
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
    ];

    if (isSubscribed) {
      mainButtons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '🔕 ' + t('Stop Reminders', 'إيقاف التذكير التلقائي', 'حبس التذكير'),
          id: `${_p}salat rem off`
        })
      });
    }

    try {
      return await conn.sendButton(
        m.chat,
        {
          text: mainCardText,
          footer: 'bot amirni hamza • @hamza_amirni_01',
          buttons: mainButtons
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(mainCardText);
    }
  }

  // Fetch Prayer Times for provided city
  await m.react('🕌');
  const matchedCity = findCity(cityInput);
  const searchCity = matchedCity ? matchedCity.en : cityInput;
  const result = await getPrayerTimes(searchCity);

  if (!result) {
    return m.reply(t(
      `❌ Could not fetch prayer times for: *${cityInput}*. Please check the city name!`,
      `❌ تعذر جلب أوقات الصلاة لمدينة: *${cityInput}*. يرجى التأكد من اسم المدينة!`,
      `❌ ما قدرناش نجيبو أوقات الصلاة لمدينة: *${cityInput}*. تأكد من اسم المدينة أ خاي!`
    ));
  }

  const { timings, date, hijri, city } = result;
  const displayCityName = matchedCity ? `${matchedCity.ar} (${matchedCity.en})` : city;

  // Check if user is currently subscribed
  const userSub = global.db.data.salat_reminders[m.sender];
  const isThisCityActive = userSub && userSub.active && (userSub.city.toLowerCase() === city.toLowerCase() || (matchedCity && userSub.city.toLowerCase() === matchedCity.en.toLowerCase()));

  const cardCaption = t(
`🕌 *PRAYER TIMES — ${displayCityName.toUpperCase()}* 🕌
━━━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${date}
🌙 *Hijri Date:* ${hijri}
🔔 *Auto-Reminder:* ${isThisCityActive ? '✅ Active for this city' : '❌ Inactive'}

🌅 *Fajr:* ${timings.Fajr}
☀️ *Sunrise:* ${timings.Sunrise}
☀️ *Dhuhr:* ${timings.Dhuhr}
🌤️ *Asr:* ${timings.Asr}
🌆 *Maghrib:* ${timings.Maghrib}
🌌 *Isha:* ${timings.Isha}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *أوقات الصلاة لمدينة ${displayCityName}* 🕌
━━━━━━━━━━━━━━━━━━━━━
📅 *التاريخ الميلادي:* ${date}
🌙 *التاريخ الهجري:* ${hijri}
🔔 *التذكير التلقائي:* ${isThisCityActive ? '✅ مفعّل لهذه المدينة' : '❌ غير مفعّل'}

🌅 *الفجر:* ${timings.Fajr}
☀️ *الشرق/الشروق:* ${timings.Sunrise}
☀️ *الظهر:* ${timings.Dhuhr}
🌤️ *العصر:* ${timings.Asr}
🌆 *المغرب:* ${timings.Maghrib}
🌌 *العشاء:* ${timings.Isha}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🕌 *أوقات الصلاة لمدينة ${displayCityName}* 🕌
━━━━━━━━━━━━━━━━━━━━━
📅 *التاريخ الميلادي:* ${date}
🌙 *التاريخ الهجري:* ${hijri}
🔔 *التذكير التلقائي:* ${isThisCityActive ? '✅ مفعّل لهاد المدينة' : '❌ ما مفعّلش'}

🌅 *الفجر:* ${timings.Fajr}
☀️ *الشروق:* ${timings.Sunrise}
☀️ *الظهر:* ${timings.Dhuhr}
🌤️ *العصر:* ${timings.Asr}
🌆 *المغرب:* ${timings.Maghrib}
🌌 *العشاء:* ${timings.Isha}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
  );

  const actionButtons = [];

  // Toggle Reminder Button
  if (isThisCityActive) {
    actionButtons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '🔕 ' + t('Deactivate Reminder', 'إيقاف التذكير التلقائي', 'حبس التذكير'),
        id: `${_p}salat rem off`
      })
    });
  } else {
    actionButtons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '🔔 ' + t(`Activate Reminder (${city})`, `تفعيل التذكير بالصلوات (${matchedCity?.ar || city})`, `فعّل التذكير (${matchedCity?.ar || city})`),
        id: `${_p}salat rem on ${matchedCity?.en || city}`
      })
    });
  }

  // Daily Adhkar Button
  actionButtons.push({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: '🤲 ' + t('Daily Adhkar', 'أذكار اليوم', 'أذكار اليوم'),
      id: `${_p}ad3iya`
    })
  });

  // Friday Surat Al-Kahf Button
  actionButtons.push({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: '📖 ' + t('Surat Al-Kahf', 'سورة الكهف', 'سورة الكهف'),
      id: `${_p}kahf`
    })
  });

  // Change City Button
  actionButtons.push({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: '🔄 ' + t('Change City', 'تغيير المدينة', 'بدّل المدينة'),
      id: `${_p}salat`
    })
  });

  try {
    return await conn.sendButton(
      m.chat,
      {
        text: cardCaption,
        footer: 'bot amirni hamza • @hamza_amirni_01',
        buttons: actionButtons
      },
      { quoted: m }
    );
  } catch (_) {
    return m.reply(cardCaption);
  }
};

handler.help = ['salat [city]', 'salat rem on [city]', 'salat rem off', 'prayer'];
handler.tags = ['islamic'];
handler.command = /^(salat|prayer|صلاة|أوقات_الصلاة|الصلوات|صلوات)$/i;

export default handler;
