import axios from 'axios';

// ─── Reciters ───────────────────────────────────────────────────────────────
const RECITERS = [
  { id: 1, name: 'عبد الرحمن السديس',      nameEn: 'Al-Sudais',   key: 'sudais',   base: 'https://server8.mp3quran.net/afs/' },
  { id: 2, name: 'مشاري العفاسي',           nameEn: 'Al-Afasy',    key: 'alafasy',  base: 'https://server8.mp3quran.net/afs/' },
  { id: 3, name: 'ماهر المعيقلي',           nameEn: 'Maher',       key: 'maher',    base: 'https://server8.mp3quran.net/maher/' },
  { id: 4, name: 'سعد الغامدي',             nameEn: 'Al-Ghamdi',   key: 'ghamdi',   base: 'https://server8.mp3quran.net/sa3d/' },
  { id: 5, name: 'عبد الباسط عبد الصمد',    nameEn: 'Abdul Basit', key: 'basit',    base: 'https://server8.mp3quran.net/basit_haraka/' }
];

// ─── All 114 Surah Names ─────────────────────────────────────────────────────
const SURAH_NAMES = {
  1: 'الفاتحة',      2: 'البقرة',        3: 'آل عمران',     4: 'النساء',
  5: 'المائدة',      6: 'الأنعام',       7: 'الأعراف',      8: 'الأنفال',
  9: 'التوبة',       10: 'يونس',         11: 'هود',          12: 'يوسف',
  13: 'الرعد',       14: 'إبراهيم',      15: 'الحجر',       16: 'النحل',
  17: 'الإسراء',     18: 'الكهف',        19: 'مريم',         20: 'طه',
  21: 'الأنبياء',    22: 'الحج',         23: 'المؤمنون',     24: 'النور',
  25: 'الفرقان',     26: 'الشعراء',      27: 'النمل',        28: 'القصص',
  29: 'العنكبوت',    30: 'الروم',        31: 'لقمان',        32: 'السجدة',
  33: 'الأحزاب',     34: 'سبأ',          35: 'فاطر',         36: 'يس',
  37: 'الصافات',     38: 'ص',            39: 'الزمر',        40: 'غافر',
  41: 'فصلت',        42: 'الشورى',       43: 'الزخرف',       44: 'الدخان',
  45: 'الجاثية',     46: 'الأحقاف',      47: 'محمد',         48: 'الفتح',
  49: 'الحجرات',     50: 'ق',            51: 'الذاريات',     52: 'الطور',
  53: 'النجم',       54: 'القمر',        55: 'الرحمن',       56: 'الواقعة',
  57: 'الحديد',      58: 'المجادلة',     59: 'الحشر',        60: 'الممتحنة',
  61: 'الصف',        62: 'الجمعة',       63: 'المنافقون',    64: 'التغابن',
  65: 'الطلاق',      66: 'التحريم',      67: 'الملك',        68: 'القلم',
  69: 'الحاقة',      70: 'المعارج',      71: 'نوح',          72: 'الجن',
  73: 'المزمل',      74: 'المدثر',       75: 'القيامة',      76: 'الإنسان',
  77: 'المرسلات',    78: 'النبأ',        79: 'النازعات',     80: 'عبس',
  81: 'التكوير',     82: 'الانفطار',     83: 'المطففين',     84: 'الانشقاق',
  85: 'البروج',      86: 'الطارق',       87: 'الأعلى',       88: 'الغاشية',
  89: 'الفجر',       90: 'البلد',        91: 'الشمس',        92: 'الليل',
  93: 'الضحى',       94: 'الشرح',        95: 'التين',        96: 'العلق',
  97: 'القدر',       98: 'البينة',       99: 'الزلزلة',      100: 'العاديات',
  101: 'القارعة',    102: 'التكاثر',     103: 'العصر',       104: 'الهمزة',
  105: 'الفيل',      106: 'قريش',        107: 'الماعون',     108: 'الكوثر',
  109: 'الكافرون',   110: 'النصر',       111: 'المسد',       112: 'الإخلاص',
  113: 'الفلق',      114: 'الناس'
};

// ─── Helper: get audio URL ───────────────────────────────────────────────────
function getSurahAudioUrl(surahNum, reciterKey) {
  const reciter = RECITERS.find(r => r.key === reciterKey) || RECITERS[0];
  const num = String(surahNum).padStart(3, '0');
  return `${reciter.base}${num}.mp3`;
}

// ─── Helper: resolve surah number from arabic or english name ────────────────
function resolveSurahNum(input) {
  const n = parseInt(input, 10);
  if (!isNaN(n) && n >= 1 && n <= 114) return n;
  const lower = input.trim().toLowerCase();
  for (const [num, ar] of Object.entries(SURAH_NAMES)) {
    if (ar === input.trim() || ar.includes(input.trim())) return parseInt(num, 10);
    if (lower === ar) return parseInt(num, 10);
  }
  return null;
}

// ─── Build surah sections (10 per section) ───────────────────────────────────
function buildSurahSections(prefix, lang) {
  const sections = [];
  for (let s = 1; s <= 114; s += 10) {
    const end = Math.min(s + 9, 114);
    const rows = [];
    for (let i = s; i <= end; i++) {
      rows.push({
        title: `📖 ${i}. ${SURAH_NAMES[i]}`,
        description: lang === 'english' ? `Surah ${i} of 114` : `السورة ${i} من 114`,
        id: `${prefix}quranmp3 ${i}`
      });
    }
    sections.push({
      title: lang === 'english'
        ? `Surahs ${s}–${end}`
        : `السور ${s}–${end}`,
      rows
    });
  }
  return sections;
}

// ─── Build reciter sections ──────────────────────────────────────────────────
function buildReciterSections(surahNum, prefix, lang) {
  return [{
    title: lang === 'english' ? '🎙️ Choose Reciter' : '🎙️ اختر القارئ',
    rows: RECITERS.map(r => ({
      title: `🎙️ ${r.name}`,
      description: lang === 'english' ? r.nameEn : r.name,
      id: `${prefix}quranmp3 ${surahNum} ${r.id}`
    }))
  }];
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
const handler = async (m, { conn, usedPrefix: _p, command, text, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

  const input = (text || args.join(' ')).trim();
  const parts = input.split(/\s+/);

  // ── Case 1: No args → show full surah list + reciter picker ──────────────
  if (!input) {
    const cardText = t(
`📖 *Quran MP3 — Full Surah Audio* 🎙️
━━━━━━━━━━━━━━━━━━━━━

Listen to any full surah recited by top reciters.

1️⃣ Select a surah from the list below
2️⃣ Then choose your preferred reciter

Or send: \`${_p}quranmp3 1\` (surah number)
Or send: \`${_p}quranmp3 1 2\` (surah + reciter)

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *القرآن MP3 — تلاوة كاملة للسور* 🎙️
━━━━━━━━━━━━━━━━━━━━━

استمع لأي سورة قرآنية كاملة بصوت كبار القراء.

1️⃣ اختر السورة من القائمة أسفله
2️⃣ ثم اختر القارئ المفضل لديك

← \`${_p}quranmp3 1\` (رقم السورة)
← \`${_p}quranmp3 1 2\` (رقم السورة + رقم القارئ)

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *القرآن MP3 — استماع للسور الكاملة* 🎙️
━━━━━━━━━━━━━━━━━━━━━

سمع أي سورة قرآنية كاملة بصوت القراء الكبار.

1️⃣ اختر السورة من القائمة
2️⃣ بعدها اختر القارئ

← \`${_p}quranmp3 1\` (رقم السورة)
← \`${_p}quranmp3 1 2\` (السورة + رقم القارئ)

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    );

    const surahSections = buildSurahSections(_p, lang);
    const reciterSection = [{
      title: t('🎙️ Reciters', '🎙️ القراء', '🎙️ القراء'),
      rows: RECITERS.map(r => ({
        title: `🎙️ ${r.name}`,
        description: r.nameEn,
        id: `${_p}quranmp3 1 ${r.id}`
      }))
    }];

    try {
      return await conn.sendButton(
        m.chat,
        {
          text: cardText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: t('📖 Select Surah', '📖 اختر السورة', '📖 اختر السورة'),
                sections: surahSections
              })
            },
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: t('🎙️ Select Reciter', '🎙️ اختر القارئ', '🎙️ اختر القارئ'),
                sections: reciterSection
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
      return m.reply(cardText);
    }
  }

  // ── Case 2: surah only → show reciter selection card ─────────────────────
  const surahNum = resolveSurahNum(parts[0]);
  if (!surahNum) {
    return m.reply(t(
      `❌ Unknown surah: *${parts[0]}*. Use a number (1–114) or Arabic name.`,
      `❌ السورة غير موجودة: *${parts[0]}*. استخدم رقم السورة (1-114) أو اسمها بالعربية.`,
      `❌ ما عرفناش السورة: *${parts[0]}*. خدم رقم السورة (1-114) أو اسمها بالعربي.`
    ));
  }

  const surahName = SURAH_NAMES[surahNum];

  if (parts.length === 1) {
    const cardText = t(
`📖 *Surah ${surahNum} — ${surahName}* 🎙️
━━━━━━━━━━━━━━━━━━━━━

Now select your preferred reciter to listen to this surah:

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *سورة ${surahName} (${surahNum})* 🎙️
━━━━━━━━━━━━━━━━━━━━━

اختر القارئ المفضل لديك لتشغيل هذه السورة:

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *سورة ${surahName} (${surahNum})* 🎙️
━━━━━━━━━━━━━━━━━━━━━

اختر القارئ باش تسمع هاد السورة:

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    );

    try {
      return await conn.sendButton(
        m.chat,
        {
          text: cardText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: t('🎙️ Select Reciter', '🎙️ اختر القارئ', '🎙️ اختر القارئ'),
                sections: buildReciterSections(surahNum, _p, lang)
              })
            }
          ]
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(cardText);
    }
  }

  // ── Case 3: surah + reciter → send audio directly ─────────────────────────
  const reciterId = parseInt(parts[1], 10);
  const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];

  await m.react('📖');

  const audioUrl = getSurahAudioUrl(surahNum, reciter.key);

  const caption = t(
`📖 *Surah ${surahNum} — ${surahName}*
🎙️ *Reciter:* ${reciter.nameEn} (${reciter.name})
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *سورة ${surahName} (${surahNum})*
🎙️ *القارئ:* ${reciter.name}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *سورة ${surahName} (${surahNum})*
🎙️ *القارئ:* ${reciter.name}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
  );

  try {
    // Try to send audio via URL
    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `surah_${surahNum}_${reciter.key}.mp3`,
        caption
      },
      { quoted: m }
    );

    // Send follow-up card with download CTA
    const downloadCardText = t(
`✅ *Playing: ${surahName}* by ${reciter.nameEn}
Tap below to download the full MP3 file:`,
`✅ *تشغيل: سورة ${surahName}* بصوت ${reciter.name}
اضغط أسفله لتحميل ملف MP3 الكامل:`,
`✅ *تشغيل: سورة ${surahName}* بصوت ${reciter.name}
دوز على الزر باش تحمل ملف MP3:`
    );

    try {
      await conn.sendButton(
        m.chat,
        {
          text: downloadCardText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'cta_url',
              buttonParamsJson: JSON.stringify({
                display_text: t('⬇️ Download MP3', '⬇️ تحميل MP3', '⬇️ تحميل MP3'),
                url: audioUrl
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: t('📖 Other Surah', '📖 سورة أخرى', '📖 سورة أخرى'),
                id: `${_p}quranmp3`
              })
            }
          ]
        },
        { quoted: m }
      );
    } catch (_) {
      // Fallback: just reply with URL
      await m.reply(`⬇️ *Download MP3:* ${audioUrl}`);
    }
  } catch (e) {
    console.error('quranmp3 send error:', e.message);
    return m.reply(t(
      `❌ Failed to send audio for Surah ${surahName}. Try again later.`,
      `❌ تعذر إرسال صوت سورة ${surahName}. حاول مرة أخرى لاحقاً.`,
      `❌ ما قدرناش نبعتو صوت سورة ${surahName}. جرب مرة أخرى.`
    ));
  }
};

handler.help = ['quranmp3', 'سورة_mp3'];
handler.tags = ['islamic'];
handler.command = /^(quranmp3|سورة_mp3|سورةmp3|quran_mp3)$/i;

export default handler;
