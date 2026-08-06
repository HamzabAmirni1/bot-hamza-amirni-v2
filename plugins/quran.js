import axios from 'axios';

const API = 'https://api.alquran.cloud/v1';

// قائمة القراء المشهورين ورجوع سيرفرات التلاوة
const RECITERS = [
  { id: 1, name: 'عبد الباسط عبد الصمد', server: 'https://everyayah.com/data/AbdulSamad_64kbps_QuranExplorer.Com/' },
  { id: 2, name: 'مشاري العفاسي', server: 'https://everyayah.com/data/Alafasy_128kbps/' },
  { id: 3, name: 'ماهر المعيقلي', server: 'https://everyayah.com/data/MaherAlMuaiqly128kbps/' },
  { id: 4, name: 'سعد الغامدي', server: 'https://everyayah.com/data/Ghamadi_40kbps/' },
  { id: 5, name: 'ياسر الدوسري', server: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/' },
  { id: 6, name: 'عبد الرحمن السديس', server: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/' },
  { id: 7, name: 'سعود الشريم', server: 'https://everyayah.com/data/Saood_ash-Shuraym_128kbps/' }
];

const SURAH_MAP = {
  'الفاتحة': 1, 'البقرة': 2, 'آل عمران': 3, 'النساء': 4, 'المائدة': 5,
  'الأنعام': 6, 'الأعراف': 7, 'الأنفال': 8, 'التوبة': 9, 'يونس': 10,
  'هود': 11, 'يوسف': 12, 'الرعد': 13, 'إبراهيم': 14, 'الحجر': 15,
  'النحل': 16, 'الإسراء': 17, 'الكهف': 18, 'مريم': 19, 'طه': 20,
  'الأنبياء': 21, 'الحج': 22, 'المؤمنون': 23, 'النور': 24, 'الفرقان': 25,
  'الشعراء': 26, 'النمل': 27, 'القصص': 28, 'العنكبوت': 29, 'الروم': 30,
  'لقمان': 31, 'السجدة': 32, 'الأحزاب': 33, 'سبأ': 34, 'فاطر': 35,
  'يس': 36, 'الصافات': 37, 'ص': 38, 'الزمر': 39, 'غافر': 40,
  'فصلت': 41, 'الشورى': 42, 'الزخرف': 43, 'الدخان': 44, 'الجاثية': 45,
  'الأحقاف': 46, 'محمد': 47, 'الفتح': 48, 'الحجرات': 49, 'ق': 50,
  'الذاريات': 51, 'الطور': 52, 'النجم': 53, 'القمر': 54, 'الرحمن': 55,
  'الواقعة': 56, 'الحديد': 57, 'المجادلة': 58, 'الحشر': 59, 'الممتحنة': 60,
  'الصف': 61, 'الجمعة': 62, 'المنافقون': 63, 'التغابن': 64, 'الطلاق': 65,
  'التحريم': 66, 'الملك': 67, 'القلم': 68, 'الحاقة': 69, 'المعارج': 70,
  'نوح': 71, 'الجن': 72, 'المزمل': 73, 'المدثر': 74, 'القيامة': 75,
  'الإنسان': 76, 'المرسلات': 77, 'النبأ': 78, 'النازعات': 79, 'عبس': 80,
  'التكوير': 81, 'الانفطار': 82, 'المطففين': 83, 'الانشقاق': 84, 'البروج': 85,
  'الطارق': 86, 'الأعلى': 87, 'الغاشية': 88, 'الفجر': 89, 'البلد': 90,
  'الشمس': 91, 'الليل': 92, 'الضحى': 93, 'الشرح': 94, 'التين': 95,
  'العلق': 96, 'القدر': 97, 'البينة': 98, 'الزلزلة': 99, 'العاديات': 100,
  'القارعة': 101, 'التكاثر': 102, 'العصر': 103, 'الهمزة': 104, 'الفيل': 105,
  'قريش': 106, 'الماعون': 107, 'الكوثر': 108, 'الكافرون': 109, 'النصر': 110,
  'المسد': 111, 'الإخلاص': 112, 'الفلق': 113, 'الناس': 114
};

async function fetchAyah(surah, ayah) {
  const editions = 'quran-uthmani,ar.jalalayn,en.ahmedali';
  const res = await axios.get(
    `${API}/ayah/${surah}:${ayah}/editions/${editions}`,
    { timeout: 12000 }
  );

  const data = res.data?.data;
  if (!data || !Array.isArray(data)) throw new Error('رد غير متوقع من API القرآن');

  const arabic = data.find(d => d.edition.identifier === 'quran-uthmani');
  const tafseer = data.find(d => d.edition.identifier === 'ar.jalalayn');
  const trans = data.find(d => d.edition.identifier === 'en.ahmedali');

  return {
    surahNumber: arabic?.surah?.number || surah,
    surahName: arabic?.surah?.name || '',
    surahNameEn: arabic?.surah?.englishName || '',
    ayahNumber: arabic?.numberInSurah || ayah,
    text: arabic?.text || '',
    tafseer: tafseer?.text || '',
    translation: trans?.text || '',
    juz: arabic?.juz || '',
    page: arabic?.page || '',
  };
}

function getAudioUrl(reciterServer, surah, ayah) {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  return `${reciterServer}${s}${a}.mp3`;
}

async function getRandomAyah() {
  const surahNum = Math.floor(Math.random() * 114) + 1;
  const infoRes = await axios.get(`${API}/surah/${surahNum}`, { timeout: 8000 });
  const count = infoRes.data?.data?.numberOfAyahs || 1;
  const ayahNum = Math.floor(Math.random() * count) + 1;
  return { surah: surahNum, ayah: ayahNum };
}

function findSurahNumber(query) {
  if (!query) return null;
  const numOnly = parseInt(query);
  if (!isNaN(numOnly) && numOnly >= 1 && numOnly <= 114) return numOnly;

  let q = query.trim().toLowerCase()
    .replace(/^سورة\s*/i, '')
    .replace(/^سوره\s*/i, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');

  for (const [name, num] of Object.entries(SURAH_MAP)) {
    let normalizedName = name.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
    if (normalizedName === q || name === query.trim()) return num;
  }

  for (const [name, num] of Object.entries(SURAH_MAP)) {
    let normalizedName = name.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
    if (normalizedName.includes(q) || q.includes(normalizedName)) return num;
  }

  return null;
}

async function sendTafseerAyahList(conn, m, _p, surahNumber) {
  const infoRes = await axios.get(`${API}/surah/${surahNumber}`, { timeout: 10000 });
  const surahData = infoRes.data?.data;
  if (!surahData) throw new Error('فشل جلب معطيات السورة');

  const surahName = surahData.name || `سورة رقم ${surahNumber}`;
  const totalAyahs = surahData.numberOfAyahs || 1;

  const cardText =
`📝 *تفسير سورة ${surahName} (عدد الآيات: ${totalAyahs})* 📝
━━━━━━━━━━━━━━━━━━━━━

اختر رقم الآية التي تريد عرض تفسيرها من القائمة التفاعلية أسفله:

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`;

  const sections = [];
  const chunkSize = 30;
  for (let i = 0; i < totalAyahs; i += chunkSize) {
    const start = i + 1;
    const end = Math.min(i + chunkSize, totalAyahs);
    const rows = [];
    for (let a = start; a <= end; a++) {
      rows.push({
        title: `الآية رقم (${a})`,
        description: `عرض تفسير الآية ${a} من سورة ${surahName}`,
        id: `${_p}tafseer ${surahNumber}:${a}`
      });
    }
    sections.push({
      title: `📖 الآيات من (${start} إلى ${end})`,
      rows
    });
  }

  return await conn.sendButton(
    m.chat,
    {
      text: cardText,
      footer: 'bot amirni hamza',
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: `📝 اختر الآية لتفسيرها (سورة ${surahName})`,
            sections
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🎧 استماع صوتي',
            id: `${_p}quranaudio ${surahNumber}`
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '👑 المطور والمالك',
            id: `${_p}owner`
          })
        }
      ]
    },
    { quoted: m }
  );
}

async function fetchFullSurah(surahNum) {
  const res = await axios.get(`${API}/surah/${surahNum}/quran-uthmani`, { timeout: 20000 });
  const data = res.data?.data;
  if (!data) throw new Error('فشل جلب السورة الكاملة');

  const ayahs = data.ayahs || [];
  const surahName = data.name || `سورة رقم ${surahNum}`;
  const surahNameEn = data.englishName || '';
  const revelationType = data.revelationType || '';
  const juz = ayahs[0]?.juz || '';
  const page = ayahs[0]?.page || '';

  // Build the full text: each ayah on its own line with its number
  const fullText = ayahs.map(a => `${a.text} ﴿${a.numberInSurah}﴾`).join('\n');

  return { surahName, surahNameEn, revelationType, juz, page, fullText, totalAyahs: ayahs.length };
}

// Split text into chunks of max maxLen chars, never cutting a word or ayah marker
function splitTextSafe(text, maxLen = 3800) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    // Try to cut at a newline (ayah boundary) before maxLen
    let cutAt = remaining.lastIndexOf('\n', maxLen);
    if (cutAt <= 0) {
      // No newline — cut at last space before maxLen
      cutAt = remaining.lastIndexOf(' ', maxLen);
    }
    if (cutAt <= 0) {
      // No space either — hard cut (very long single ayah, shouldn't happen)
      cutAt = maxLen;
    }
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  if (remaining.length > 0) chunks.push(remaining.trim());
  return chunks;
}

let handler = async (m, { conn, text, command, usedPrefix: _p }) => {
  const arg = (text || '').trim().toLowerCase();

  // 1️⃣ Main Selection Card (.quran with no args) -> Single Select Dropdown with ALL 114 Surahs
  if (!arg && (command === 'quran' || command === 'قرآن' || command === 'قران')) {
    const mainCardText =
`🕌 *قسم القرآن الكريم - قائمة السور والتلاوات* 🕌
━━━━━━━━━━━━━━━━━━━━━

مرحباً بك أخي الكريم فقسم القرآن! 👋
اختر السورة المفضلة لديك من القائمة التفاعلية أسفله (114 سورة) أو اختر الاستماع للقراء:

1️⃣ 📖 *اختيار السورة من القائمة التفاعلية*
2️⃣ 🎧 *الاستماع والتلاوة بصوت كبار القراء*
3️⃣ 👑 *التواصل مع المطور والمالك*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`;

    const surahEntries = Object.entries(SURAH_MAP);

    const sections = [
      {
        title: '📖 السور من (1 إلى 30)',
        rows: surahEntries.slice(0, 30).map(([name, num]) => ({
          title: `${num}. سورة ${name}`,
          description: `عرض وتلاوة سورة ${name}`,
          id: `${_p}quran ${num}`
        }))
      },
      {
        title: '📖 السور من (31 إلى 60)',
        rows: surahEntries.slice(30, 60).map(([name, num]) => ({
          title: `${num}. سورة ${name}`,
          description: `عرض وتلاوة سورة ${name}`,
          id: `${_p}quran ${num}`
        }))
      },
      {
        title: '📖 السور من (61 إلى 90)',
        rows: surahEntries.slice(60, 90).map(([name, num]) => ({
          title: `${num}. سورة ${name}`,
          description: `عرض وتلاوة سورة ${name}`,
          id: `${_p}quran ${num}`
        }))
      },
      {
        title: '📖 السور من (91 إلى 114)',
        rows: surahEntries.slice(90, 114).map(([name, num]) => ({
          title: `${num}. سورة ${name}`,
          description: `عرض وتلاوة سورة ${name}`,
          id: `${_p}quran ${num}`
        }))
      }
    ];

    try {
      return await conn.sendButton(
        m.chat,
        {
          text: mainCardText,
          footer: 'bot amirni hamza • حمزة اعمرني',
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: '📖 اختر السورة من القائمة (114 سورة)',
                sections
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🎧 الاستماع للقراء',
                id: `${_p}quranaudio`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '👑 المطور والمالك',
                id: `${_p}owner`
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

  // 2️⃣ Quran Audio Reciters List Card (.quranaudio)
  if (command === 'quranaudio' || arg === 'audio' || arg === 'صوت') {
    const audioCardText =
`🎧 *تلاوات القرآن الكريم - كبار القراء المشهورين*
━━━━━━━━━━━━━━━━━━━━━

اختر القارئ المفضل لديك لاستماع وتحميل التلاوات العطرة:

1️⃣ 🎙️ *عبد الباسط عبد الصمد*
2️⃣ 🎙️ *مشاري العفاسي*
3️⃣ 🎙️ *ماهر المعيقلي*
4️⃣ 🎙️ *سعد الغامدي*
5️⃣ 🎙️ *ياسر الدوسري*
6️⃣ 🎙️ *عبد الرحمن السديس*
7️⃣ 🎙️ *سعود الشريم*

━━━━━━━━━━━━━━━━━━━━━
👇 *اضغط على زر القارئ من القائمة أسفله:*
⚡ *bot amirni hamza • حمزة اعمرني*`;

    const rawSurah = (text || '').trim().split(/\s+/)[0] || '';
    const lastSurah = findSurahNumber(rawSurah) || rawSurah;
    const rows = RECITERS.map(r => ({
      title: `🎙️ ${r.name}`,
      description: `استماع وتلاوة بصوت ${r.name}`,
      id: `${_p}quranreciter ${r.id}${lastSurah ? ' ' + lastSurah : ''}`
    }));

    try {
      return await conn.sendButton(
        m.chat,
        {
          text: audioCardText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: '🎙️ اختر القارئ المفضل',
                sections: [{ rows }]
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '👑 المطور والمالك',
                id: `${_p}owner`
              })
            }
          ]
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(audioCardText);
    }
  }

  // 3️⃣ Play & Download Reciter Audio (.quranreciter <reciterId> [surahNum] [ayahNum])
  if (command === 'quranreciter') {
    const parts = arg.trim().split(/\s+/);
    const reciterId = parseInt(parts[0]) || 1;
    const surahArg  = parseInt(parts[1]) || 0;
    const ayahArg   = parseInt(parts[2]) || 0;
    const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];

    // ── mp3quran.net slugs for full-surah audio (one per reciter, same order as RECITERS) ──
    const MP3QURAN_SLUGS = [
      'abdul_basit_murattal',   // 1 عبد الباسط
      'afasy',                  // 2 مشاري العفاسي
      'maher_al_muaiqly',       // 3 ماهر المعيقلي
      'ghamdi',                 // 4 سعد الغامدي
      'yasser_ad-dussary',      // 5 ياسر الدوسري
      'sudais',                 // 6 عبد الرحمن السديس
      'shuraym'                 // 7 سعود الشريم
    ];

    const fullSurahMode = surahArg >= 1 && surahArg <= 114 && ayahArg < 1;

    await m.reply(`🎧 جاري جلب التلاوة بصوت القارئ *${reciter.name}*...`);

    try {
      // ── FULL SURAH MODE: use mp3quran.net for complete surah audio ──
      if (fullSurahMode) {
        const slug = MP3QURAN_SLUGS[reciterId - 1] || MP3QURAN_SLUGS[0];
        const surahPadded = String(surahArg).padStart(3, '0');

        // Try primary URL format (mp3quran.net)
        const fullAudioUrl = `https://download.quranicaudio.com/quran/${slug}/${surahPadded}.mp3`;

        // Get surah info for display
        const infoRes = await axios.get(`${API}/surah/${surahArg}`, { timeout: 8000 });
        const surahData = infoRes.data?.data;
        const surahName = surahData?.name || `سورة ${surahArg}`;
        const surahNameEn = surahData?.englishName || '';
        const totalAyahs = surahData?.numberOfAyahs || '';

        const captionText =
`🕌 *تلاوة السورة كاملة* 🕌
🎙️ *القارئ:* ${reciter.name}
📖 *السورة:* ${surahName} (${surahNameEn})
📊 *عدد الآيات:* ${totalAyahs} آية
━━━━━━━━━━━━━━━━━━━━━
🎵 يتم إرسال تلاوة السورة كاملاً...
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`;

        await conn.sendMessage(m.chat, {
          audio: { url: fullAudioUrl },
          mimetype: 'audio/mpeg',
          ptt: false,
          fileName: `${surahName}_${reciter.name}.mp3`
        }, { quoted: m });

        return await conn.sendButton(m.chat, {
          text: captionText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({ display_text: '📥 تحميل الصوت MP3', url: fullAudioUrl })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '📝 تفسير آيات السورة',
                id: `${_p}tafseer ${surahArg}`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '📖 نص السورة كاملة',
                id: `${_p}quran ${surahArg}`
              })
            }
          ]
        }, { quoted: m });
      }

      // ── SINGLE AYAH MODE: use everyayah.com ──
      let surah, ayah;
      if (surahArg >= 1 && surahArg <= 114) {
        surah = surahArg;
        ayah = ayahArg >= 1 ? ayahArg : 1;
      } else {
        const rand = await getRandomAyah();
        surah = rand.surah;
        ayah = rand.ayah;
      }

      const info = await fetchAyah(surah, ayah);
      const audioUrl = getAudioUrl(reciter.server, info.surahNumber, info.ayahNumber);

      const captionText =
`🕌 *تلاوة قرآنية مباركة* 🕌
🎙️ *القارئ:* ${reciter.name}
📖 *السورة:* ${info.surahName} (الآية ${info.ayahNumber})
━━━━━━━━━━━━━━━━━━━━━

*${info.text}*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`;

      await conn.sendMessage(m.chat, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${info.surahName}_${info.ayahNumber}.mp3`
      }, { quoted: m });

      return await conn.sendButton(m.chat, {
        text: captionText,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({ display_text: '📥 تحميل الصوت MP3', url: audioUrl })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📝 تفسير آيات السورة',
              id: `${_p}tafseer ${info.surahNumber}`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📖 نص السورة كاملة',
              id: `${_p}quran ${info.surahNumber}`
            })
          }
        ]
      }, { quoted: m });
    } catch (e) {
      return m.reply(`❌ فشل جلب الصوت: ${e.message}`);
    }
  }

  // 4️⃣ Dedicated Tafseer Handler (.tafseer 53:1 or .tafseer 53 or .tafseer)
  if (command === 'tafseer' || command === 'تفسير') {
    const parts = arg.split(':');
    const parsedSurah = parseInt(parts[0]);

    if (!parts[1] && !isNaN(parsedSurah) && parsedSurah >= 1 && parsedSurah <= 114) {
      await m.reply(`📝 جاري جلب قائمة آيات سورة رقم ${parsedSurah} لتفسيرها...`);
      return await sendTafseerAyahList(conn, m, _p, parsedSurah);
    }

    if (!parts[1] && arg) {
      const found = findSurahNumber(arg);
      if (found) {
        await m.reply(`📝 جاري جلب قائمة آيات سورة رقم ${found} لتفسيرها...`);
        return await sendTafseerAyahList(conn, m, _p, found);
      }
    }

    if (!arg) {
      await m.reply('📝 جاري جلب قائمة آيات سورة الفاتحة لتفسيرها...');
      return await sendTafseerAyahList(conn, m, _p, 1);
    }

    // Specific ayah: .tafseer 53:5
    let surah = parsedSurah || 1;
    let ayah = parseInt(parts[1]) || 1;

    await m.reply(`📝 جاري جلب تفسير الآية ${ayah} من سورة رقم ${surah}...`);

    try {
      const info = await fetchAyah(surah, ayah);
      const tafseerMsg =
`📝 *تفسير سورة ${info.surahName}* (الآية ${info.ayahNumber})
🕌 سورة ${info.surahNameEn}  •  الجزء ${info.juz}  •  الصفحة ${info.page}
━━━━━━━━━━━━━━━━━━━━━

📖 *الآية الكريمة:*
*${info.text}*

━━━━━━━━━━━━━━━━━━━━━
📝 *تفسير الجلالين:*
${info.tafseer}

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`;

      return await conn.sendButton(m.chat, {
        text: tafseerMsg,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📝 اختيار آية أخرى لتفسيرها',
              id: `${_p}tafseer ${info.surahNumber}`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🎧 استماع صوتي',
              id: `${_p}quranaudio ${info.surahNumber}`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📖 نص السورة كاملة',
              id: `${_p}quran ${info.surahNumber}`
            })
          }
        ]
      }, { quoted: m });
    } catch (e) {
      return m.reply(`❌ فشل جلب التفسير: ${e.message}`);
    }
  }

  // 5️⃣ Full Surah Text (.quran 53, .quran النجم) — sends the COMPLETE surah split into multiple msgs
  if (arg || command === 'qurantext') {
    await m.reply('🕌 جاري جلب نص السورة كاملاً... انتظر لحظة!');

    let surahNum = 1;
    try {
      const colonMatch = arg.match(/^(\d+):(\d+)$/);
      if (colonMatch) {
        // Specific ayah requested: .quran 53:5
        const surah = parseInt(colonMatch[1]);
        const ayah  = parseInt(colonMatch[2]);
        const info = await fetchAyah(surah, ayah);
        const textMsg =
`📖 *سورة ${info.surahName}*  •  الآية ${info.ayahNumber}
🕌 سورة ${info.surahNameEn}  •  الجزء ${info.juz}  •  الصفحة ${info.page}
━━━━━━━━━━━━━━━━━━━━━

*${info.text}*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza • حمزة اعمرني*`;

        return await conn.sendButton(m.chat, {
          text: textMsg,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '📝 تفسير هذه الآية', id: `${_p}tafseer ${surah}:${ayah}` })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '🎧 استماع صوتي', id: `${_p}quranaudio ${surah}` })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({ display_text: '📖 السورة كاملة', id: `${_p}quran ${surah}` })
            }
          ]
        }, { quoted: m });
      }

      // Full surah
      let rawText = arg === 'text' || arg === 'مكتوب' ? '' : arg;
      if (!rawText) {
        const rand = await getRandomAyah();
        surahNum = rand.surah;
      } else {
        const foundNum = findSurahNumber(rawText);
        surahNum = foundNum || 1;
      }

      const { surahName, surahNameEn, fullText, totalAyahs, juz, page } = await fetchFullSurah(surahNum);

      const header =
`📖 *سورة ${surahName}* (${surahNameEn}) | ${totalAyahs} آية
🕌 الجزء ${juz}  •  الصفحة ${page}
━━━━━━━━━━━━━━━━━━━━━`;

      const footer = `━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza • حمزة اعمرني*`;

      // Split the surah text safely (never cuts a word or ayah marker)
      const chunks = splitTextSafe(fullText, 3500);

      // Send header as first message
      await conn.sendMessage(m.chat, { text: header }, { quoted: m });

      // Send each chunk as plain text with small delay to avoid rate limit
      for (let i = 0; i < chunks.length; i++) {
        const isLast = (i === chunks.length - 1);
        const partLabel = chunks.length > 1 ? `\n_(الجزء ${i + 1} من ${chunks.length})_` : '';
        await conn.sendMessage(m.chat, { text: chunks[i] + (isLast ? '' : partLabel) });
        if (!isLast) await new Promise(r => setTimeout(r, 600)); // small delay between parts
      }

      // Final message with action buttons
      return await conn.sendButton(m.chat, {
        text: footer,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📝 تفسير آيات السورة',
              id: `${_p}tafseer ${surahNum}`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🎧 استماع صوتي',
              id: `${_p}quranaudio ${surahNum}`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '📖 سورة أخرى',
              id: `${_p}quran`
            })
          }
        ]
      });
    } catch (e) {
      return m.reply(`❌ حدث خطأ أثناء جلب السورة: ${e.message}`);
    }
  }
};

handler.help = ['quran', 'quranaudio', 'tafseer'];
handler.tags = ['islamic'];
handler.command = ['quran', 'قرآن', 'قران', 'آية', 'سورة', 'quranaudio', 'qurantext', 'quranreciter', 'tafseer', 'تفسير'];

export default handler;
