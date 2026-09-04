import moment from 'moment-timezone';
import fs from 'fs';

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');
let cachedDbUserCount = 0;
let lastUserCountFetch = 0;

async function getDbUserCount() {
  const now = Date.now();
  if (cachedDbUserCount > 0 && (now - lastUserCountFetch < 30000)) {
    return cachedDbUserCount;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users?select=count', {
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Prefer': 'count=exact',
        'Range': '0-0'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);
    const contentRange = res.headers.get('content-range');
    if (contentRange) {
      const count = parseInt(contentRange.split('/')[1]);
      if (!isNaN(count) && count > 0) {
        cachedDbUserCount = count;
        lastUserCountFetch = now;
        return count;
      }
    }
  } catch (_) {}
  return cachedDbUserCount;
}

const handler = async (m, { conn, usedPrefix: _p, command, isOwner, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';

  // Default language to darija if not set
  if (!user.language) user.language = 'darija';
  user.hasSelectedLang = true;

  // Section titles by language
  const allTagsMap = {
    darija: {
      main: '⚡ الرئيسية والخدمات السريعة',
      islamic: '🕌 القرآن الكريم والإسلاميات',
      ai: '🧠 الذكاء الاصطناعي والشات (AI)',
      news: '📰 الأخبار المباشرة (هسبريس / الجزيرة / العربية)',
      downloader: '📥 تحميل الميديا (TikTok, FB, Insta, YT)',
      uploader: '📤 رفع الملفات والروابط',
      editor: '🎨 التعديل وتصميم الصور',
      sticker: '🖼️ صناعة وتعديل الستيكرات',
      tools: '🛠️ أدوات نافعة وحيل سريعة',
      game: '🎮 الألعاب التفاعلية (Games)',
      fun: '🎉 التسلية والمرح (Fun)',
      infobot: '📊 معلومات ومعطيات البوت',
      group: '👥 تحكم وإدارة المجموعات',
      owner: '👑 أوامر المطور والمالك'
    },
    arabic: {
      main: '⚡ الرئيسية والخدمات السريعة',
      islamic: '🕌 القرآن الكريم والإسلاميات',
      ai: '🧠 الذكاء الاصطناعي (AI)',
      news: '📰 الأخبار العاجلة (هسبريس / الجزيرة / العربية)',
      downloader: '📥 تحويل وتحميل الميديا',
      uploader: '📤 مركز رفع الملفات',
      editor: '🎨 التعديل والتصميم',
      sticker: '🖼️ صناعة وتعديل الملصقات',
      tools: '🛠️ أدوات عامة وخدمية',
      game: '🎮 الألعاب التفاعلية',
      fun: '🎉 الترفيه والتسلية',
      infobot: '📊 معلومات إحصائيات البوت',
      group: '👥 إدارة المجموعات والأدمن',
      owner: '👑 أوامر المطور والمالك'
    },
    english: {
      main: '⚡ Main & Quick Services',
      islamic: '🕌 Quran & Islamic Content',
      ai: '🧠 AI Assistant & Chat',
      news: '📰 Live News (Hespress / Al Jazeera / Al Arabiya)',
      downloader: '📥 Media Downloader Suite',
      uploader: '📤 File Uploader Tools',
      editor: '🎨 Media Editor & Design',
      sticker: '🖼️ Sticker Maker Tools',
      tools: '🛠️ Useful General Tools',
      game: '🎮 Interactive Games',
      fun: '🎉 Fun & Entertainment',
      infobot: '📊 Bot Info & Analytics',
      group: '👥 Group Administration',
      owner: '👑 Owner & Admin Tools'
    }
  };

  const allTags = allTagsMap[lang] || allTagsMap['darija'];

  let teks = (args[0] || '').toLowerCase();
  let tags = {};

  if (!Object.keys(allTags).includes(teks)) teks = 'all';

  tags = teks === 'all' ? { ...allTags } : { [teks]: allTags[teks] };

  if (!isOwner && teks === 'all') delete tags.owner;
  if (!m.isGroup && teks === 'all') delete tags.group;

  // Header Greetings & Humor by Language
  let greetingMsg = '';
  if (lang === 'darija') {
    const jokes = [
      'مريقل أ عشيري! البوت ديالك هنا خدام كي النحلة 🐝',
      'وا فينك أ الساط! ها الأوامر كاملين مستفين ليك مقادين 🚀',
      'مرحبا بيك أ الحبيب، البوت راه ضاحك ومناشط معاك اليوم! 😂',
      'كلشي ناضي ومقاد، غير اختار واش بغيتي وخلّي البوت يتكلف 🎯'
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    greetingMsg = `
✨ *BOT AMIRNI HAMZA* ✨
👑 *المطور:* حمزة اعمرني (Hamza Amirni)
━━━━━━━━━━━━━━━━━━━━━
👤 *المستخدم:* %name
📅 *التاريخ:* %date
⏱️ *مدة التشغيل:* %uptime
👥 *المستخدمين:* %totalreg
🌐 *اللغة:* 🇲🇦 الدارجة المغربية
💡 *ملاحظة:* ${joke}
━━━━━━━━━━━━━━━━━━━━━
📌 *اختر قسم الأوامر من القائمة أسفله:*`;
  } else if (lang === 'arabic') {
    greetingMsg = `
✨ *BOT AMIRNI HAMZA* ✨
👑 *المطور:* حمزة اعمرني (Hamza Amirni)
━━━━━━━━━━━━━━━━━━━━━
👤 *المستخدم:* %name
📅 *التاريخ:* %date
⏱️ *مدة التشغيل:* %uptime
👥 *المستخدمين:* %totalreg
🌐 *اللغة:* 🇸🇦 العربية الفصحى
━━━━━━━━━━━━━━━━━━━━━
📌 *اختر قسم الأوامر من القائمة أسفله:*`;
  } else {
    greetingMsg = `
✨ *BOT AMIRNI HAMZA* ✨
👑 *Owner:* Hamza Amirni
━━━━━━━━━━━━━━━━━━━━━
👤 *User:* %name
📅 *Date:* %date
⏱️ *Uptime:* %uptime
👥 *Total Users:* %totalreg
🌐 *Language:* 🇬🇧 English
━━━━━━━━━━━━━━━━━━━━━
📌 *Select a category from the list below:*`;
  }

  const cmdDescMap = {
    darija: {
      // Group
      'add': 'إضافة عضو للمجموعة',
      'add @user': 'إضافة عضو للمجموعة',
      'kick': 'طرد عضو من المجموعة',
      'kick @user': 'طرد عضو من المجموعة',
      'promote': 'ترقية عضو ليكون أدمن',
      'promote @user': 'ترقية عضو ليكون أدمن',
      'demote': 'تنزيل رتبة الأدمن لمستخدم عادي',
      'demote @user': 'تنزيل رتبة الأدمن لمستخدم عادي',
      'opengc': 'فتح الشات للمجموعة كاملا',
      'closegc': 'قفل الشات للأدمن فقط',
      'mute': 'كتم المجموعة للأدمن فقط',
      'unmute': 'فك كتم المجموعة',
      'banchat': 'توقيف استجابة البوت فالمجموعة',
      'unbanchat': 'إعادة تشغيل وتفعيل البوت فالمجموعة',
      'ubnc': 'إعادة تشغيل البوت فالمجموعة',
      'hidetag': 'منشن إشعار لجميع أعضاء المجموعة',
      'totag': 'منشن لجميع الأعضاء مع نص',
      'tag': 'منشن لجميع أعضاء المجموعة',
      'revoke': 'تغيير وتجديد رابط المجموعة',
      'linkgc': 'جلب ونسخ رابط دعوة المجموعة',
      'setwelcome': 'تحديد رسالة الترحيب بالأعضاء الجدد',
      'setbye': 'تحديد رسالة المغادرة',
      'setpromote': 'تحديد رسالة الترقية لأدمن',
      'setdemote': 'تحديد رسالة التنزيل من الأدمن',

      // Islamic
      'quran': 'قراءة ونصوص سور القرآن الكريم كاملاً',
      'quranaudio': 'استماع وتنزيل تلاوات كبار القراء',
      'qurantext': 'قراءة نص السور وتصفح الآيات',
      'tafseer': 'عرض تفسير الجلالين للآيات والسور',
      'ad3iya': 'أذكار وأدعية إسلامية مختارة بفئات تفاعلية',
      'dua': 'أذكار وأدعية إسلامية مختارة',
      'salat': 'أوقات الصلاة لجميع المدن المغربية والعالمية',
      'prayer': 'أوقات الصلاة والمواقيت',
      'taqs': 'حالة الطقس وأرصاد جوية لجميع مدن المغرب',
      'weather': 'حالة الطقس المباشرة',
      'quranmp3': 'تشغيل وتحميل أي سورة قرآنية كاملة بصوت القراء الكبار',
      'seerah': 'السيرة النبوية الشريفة كاملة بصوت الشيخ نبيل العوضي',

      // AI
      'ai': 'محادثة وطرح أسئلة على الذكاء الاصطناعي',
      'gpt': 'محادثة وطرح أسئلة على الذكاء الاصطناعي',
      'imagine': 'توليد ورسم الصور بالذكاء الاصطناعي',
      'dalle': 'توليد ورسم الصور بالذكاء الاصطناعي',
      'brat': 'توليد صور نصوص بتأثير Brat',
      'addmetaai': 'محادثة وتحدث مع Meta AI',
      'fakechat': 'صنع وإنشاء محادثات واتساب وهمية',
      'aimusic': 'توليد وتأليف مقاطع موسيقية وأغاني بالذكاء الاصطناعي',
      'sdxl': 'توليد وتصميم صور فائقة الجودة بنموذج SDXL',
      'artly': 'توليد رسومات وتصاميم فنية بالذكاء الاصطناعي',
      'tibbi': 'استشارة ومعلومات طبية وصحية بالذكاء الاصطناعي',

      // Downloader & Music
      'play': 'البحث وتحميل مقاطع صوتية MP3',
      'ytplay': 'البحث وتحميل مقاطع صوتية MP3',
      'song': 'البحث وتحميل الأغاني والمقاطع الصوتية MP3',
      'music': 'البحث وتشغيل الموسيقى والأغاني',
      'aghani': 'البحث وتحميل الأغاني والموسيقى',
      'applemusic': 'تحميل الأغاني من Apple Music',
      'remusic': 'تحميل وتوليد الموسيقى الذكية',
      'lyric': 'البحث عن كلمات ونصوص الأغاني',
      'ytmp3': 'تحميل صوت مباشر برابط يوتيوب',
      'ytmp4': 'تحميل فيديو عالي الجودة من يوتيوب MP4',
      'video': 'تحميل فيديو عالي الجودة من يوتيوب',
      'ytv': 'تحميل فيديو من يوتيوب MP4',
      'yts': 'البحث في فيديوهات ومقاطع يوتيوب',
      'yts2': 'البحث في فيديوهات ومقاطع يوتيوب',
      'youtubesearch2': 'البحث في فيديوهات يوتيوب',
      'tiktok': 'تحميل مقاطع تيك توك بدون علامة مائية',
      'ttdl': 'تحميل فيديوهات TikTok',
      'savetik': 'تحميل سريع لفيديوهات وصوتيات تيك توك',
      'instagram': 'تحميل ريلز وصور وألبومات إنستغرام كاملة',
      'ig': 'تحميل مقاطع وصور إنستغرام',
      'insta': 'تحميل ريلز وصور وفيديوهات إنستغرام',
      'reels': 'تحميل ريلز إنستغرام وفيديوهات قصيرة',
      'facebook': 'تحميل مقاطع وفيديوهات وريلز فيسبوك',
      'fb': 'تحميل فيديوهات وريلز فيسبوك',
      'fbdl': 'تحميل مقاطع وفيديوهات فيسبوك',
      'capcut': 'تحميل قوالب وفيديوهات CapCut بدون علامة مائية',
      'capcutdl': 'تحميل فيديوهات وقوالب CapCut',
      'twitter': 'تحميل فيديوهات وصور تويتر / X',
      'tw': 'تحميل فيديوهات تويتر / X',
      'xdl': 'تحميل فيديوهات وميديا منصة X (تويتر)',
      'alldownload': 'تحميل شامل من جميع المنصات (TikTok, IG, FB, YT, Twitter...)',
      'dl': 'تحميل سريع من أي رابط ميديا',
      'download': 'تحميل شامل للميديا من أي رابط',
      'mediafire': 'تحميل الملفات مباشرة من MediaFire',
      'mf': 'تحميل الملفات من MediaFire',
      'pinterest': 'البحث وتحميل الصور من Pinterest',
      'pindl': 'تحميل صور وفيديوهات Pinterest',
      'dafont': 'البحث وتحميل الخطوط من DaFont',
      'sfile': 'البحث وتحميل الملفات من Sfile',
      'gdrive': 'تحميل الملفات مباشرة من Google Drive',
      'gd': 'تحميل ملفات Google Drive',
      'github': 'البحث وتحميل مشاريع GitHub كملفات ZIP',
      'gitclone': 'تحميل أي سورس/مشروع من GitHub كـ ZIP',
      'gh': 'البحث وتحميل مشاريع GitHub',
      'google': 'البحث الشامل والمباشر في محرك Google',
      'gsearch': 'البحث في محرك البحث Google',
      'apkm': 'تحميل تطبيقات وألعاب مهكرة (TraidMode APK MOD)',
      'apkp': 'تحميل تطبيقات وألعاب من متجر APKPure',
      'apku': 'تحميل تطبيقات وألعاب من متجر Uptodown',
      'apk': 'البحث وتنزيل تطبيقات أندرويد APK',
      'apkdl': 'تحميل تطبيقات أندرويد APK',
      'appteka': 'تحميل وتنزيل تطبيقات أندرويد من متجر AppTeka',
      'f-droid': 'البحث وتحميل تطبيقات أندرويد مفتوحة المصدر (F-Droid)',
      'arabicfont': 'تنزيل حزم خطوط عربية حديثة مضغوطة ZIP',
      'unsplash': 'البحث وتحميل صور فوتوغرافية احترافية HD',

      // Sticker & Media Tools
      'sticker': 'تحويل الصور والفيديوهات إلى ملصق',
      's': 'تحويل الصور والفيديوهات إلى ملصق',
      'toimg': 'تحويل الملصق إلى صورة عادية',
      'editimage': 'إزالة وقص خلفية الصور باحترافية',
      'removebg': 'إزالة خلفية الصور تلقائياً',
      'nobg': 'إزالة خلفية الصور تلقائياً',
      'rmbg': 'إزالة خلفية الصور تلقائياً',
      'hd': 'تحسين وتوضيح جودة الصور HD',
      'remini': 'توضيح وتصفية الصور بالذكاء الاصطناعي',
      'enhance': 'رفع جودة الصور وتوضيح الملامح',
      'colorize': 'تلوين الصور القديمة بالأبيض والأسود',
      'compress': 'ضغط وتصغير حجم الصور بدون فقدان الجودة',
      'removal': 'إزالة العناصر والخلفيات من الصور',
      'ssweb': 'التقاط صورة شاشة لأي موقع إلكتروني',
      'qrcode': 'تحويل النص أو الرابط إلى رمز QR',
      'rvo': 'استرجاع وقراءة رسائل العرض لمرة واحدة',
      'read': 'استرجاع وسائط العرض لمرة واحدة',
      'vocalremover': 'فصل صوت المغني عن الموسيقى بالذكاء الاصطناعي',
      '3azlsawt': 'فصل صوت المغني عن الموسيقى بالذكاء الاصطناعي',
      'hazf-sawt': 'فصل صوت المغني عن الموسيقى بالذكاء الاصطناعي',
      'tovn': 'تحويل أي أوديو إلى تسجيل صوتي واتساب (Voice Note)',
      'tts': 'تحويل النص المكتوب إلى تسجيل صوتي مسموع',
      'wavel': 'تحويل النصوص والأصوات باحترافية',
      'nano': 'توليد وتعديل الصور المتقدم بالذكاء الاصطناعي (Nano Banana)',
      'nanopro': 'دمج وتعديل صور متعددة بالذكاء الاصطناعي',
      'drich': 'إنشاء بطاقات تفاعلية أنيقة بأزرار وروابط',
      'texttrick': 'تزيين وزخرفة النصوص بأشكال وفونتات فخمة',
      'notoemoji': 'Google Noto Emoji Kitchen إيموجيات ثلاثية الأبعاد',
      'firelogo': 'تصميم شعارات وتأثيرات نارية ثلاثية الأبعاد',
      'carbon': 'تحويل الأكواد البرمجية إلى صور ملونة وأنيقة',
      'code2img': 'تحويل الكود إلى صور ملونة بخلفيات جذابة',
      'pdf2jpg': 'تحويل ملفات PDF إلى صور JPG في ملف ZIP',

      // Tools & Utilities
      'tourl': 'رفع الصور والملفات والحصول على رابط',
      'fetch': 'جلب ومعاينة بيانات أي رابط API',
      'get': 'جلب بيانات واستجابة أي رابط',
      'anime': 'البحث ومعرفة معلومات الأنمي',
      'animesearch': 'البحث عن تفاصيل الأنمي',
      'animerandom': 'عرض أنمي عشوائي',
      'manga': 'البحث وقراءة معلومات المانجا',
      'mangasearch': 'البحث عن تفاصيل المانجا',
      'mangarandom': 'عرض مانجا عشوائية',
      'landsat': 'صور الأقمار الصناعية والفضاء باسمك',
      'nameinspace': 'صور الفضاء باسمك',
      'satellite': 'صور الأقمار الصناعية الفضائية',
      'couple': 'صور تطقيم وتطابق للبروفايل للثنائيات',
      'savezip': 'سحب وتنزيل أي موقع ويب بالكامل كملف ZIP',
      'stalkwa-channels': 'كشف بيانات وإحصائيات أي قناة واتساب',
      'whatsgrouplink': 'البحث عن روابط مجموعات واتساب',
      'searchgroups': 'البحث في دليل روابط قروبات واتساب',
      'githubtrend': 'استعراض مشاريع وتريندات GitHub الرائجة اليوم',
      'githubstalk': 'فحص ومتابعة حسابات ومستودعات GitHub',
      'tiktokstat': 'حساب إحصائيات وأرباح وتفاعل حسابات تيك توك',
      'ytpost': 'استخراج منشورات وصور واستطلاعات منتدى يوتيوب',
      'fontsearch': 'البحث وتنزيل الخطوط من Google Fonts',

      // News
      'news': 'آخر الأخبار من هسبريس والجزيرة والعربية بأزرار تفاعلية',
      'hespress': 'آخر أخبار هسبريس بأزرار تفاعلية',
      'aljazeera': 'آخر أخبار الجزيرة بأزرار تفاعلية',
      'alarabiya': 'آخر أخبار العربية بأزرار تفاعلية',
      'le360': 'آخر أخبار Le360 بالدارجة',
      'febrayer': 'آخر أخبار فبراير بأزرار تفاعلية',
      'اخبار': 'آخر الأخبار المغربية والعربية العاجلة',

      // Games
      'rps': 'لعبة حجرة ورقة مقص مع أزرار تفاعلية',
      'truefalse': 'اختبار صح أم خطأ مع أزرار تفاعلية',
      'penalty': 'لعبة ضربات الترجيح الكروية مع أزرار',
      'slots': 'لعبة ماكينة الحظ (Slot Machine)',
      '8ball': 'كرة الحظ السحرية لطرح الأسئلة',
      'truth': 'لعبة صراحة أم تحدي — صراحة',
      'dare': 'لعبة صراحة أم تحدي — تحدي',
      'kora': 'لعبة ضربات الجزاء التفاعلية ضد الحارس',
      'doom': 'لعبة دووم الكلاسيكية التفاعلية',
      'dino': 'لعبة الديناصور التفاعلية',
      'snake': 'لعبة الثعبان الكلاسيكية التفاعلية',
      'brick': 'لعبة تكسير الطوب التفاعلية',
      'turbodash': 'لعبة سباق السيارات السريع التفاعلية',
      'skyhop': 'لعبة القفز السحابي التفاعلية',
      'ninja': 'لعبة قتال نينجا الظل التفاعلية',
      'memory': 'لعبة تطابق البطاقات واختبار الذاكرة',
      'suit': 'لعبة حجر ورقة مقص التفاعلية',
      'tictactoe': 'لعبة إكس أو التفاعلية',
      'xo': 'لعبة إكس أو التفاعلية',
      'xo2': 'لعبة إكس أو التفاعلية المتطورة',

      // Fun
      'love': 'حساب نسبة الحب والتوافق بين شخصين',
      'rate': 'قياس نسبة تقييم عشوائية',
      'simp': 'قياس نسبة التأثر والتعلق بشخص',
      'stupid': 'قياس نسبة الغباء',
      'joke': 'الحصول على نكتة مضحكة عشوائية',
      'fact': 'الحصول على معلومة علمية عشوائية',
      'flirt': 'رسالة إطراء وغزل جميلة',
      'cat': 'صورة قطة طريفة عشوائية',
      'dog': 'صورة كلب طريف عشوائي',
      'meme': 'صورة ميم مضحكة عشوائية',

      // Info & Main
      'menu': 'عرض القائمة التفاعلية لجميع الأوامر',
      'lang': 'تغيير لغة التواصل مع البوت',
      'language': 'تغيير لغة التواصل مع البوت',
      'owner': 'معلومات وتواصل المطور والمالك',
      'creator': 'معلومات وتواصل المطور والمالك',
      'ping': 'قياس سرعة استجابة وسيرفر البوت',
      'speed': 'قياس سرعة استجابة البوت',
      'os': 'عرض معلومات سيرفر ونظام البوت',
      'dashboard': 'عرض لوحة إحصائيات وأداء البوت',
      'dash': 'عرض لوحة إحصائيات وأداء البوت',
      'totalfeatures': 'عرض عدد مميزات وأوامر البوت',
      'feature': 'عرض عدد مميزات البوت',
      'totaluser': 'عرض عدد مستخدمي البوت الإجمالي',
      'register': 'التسجيل وتأكيد الحساب في البوت',
      'verify': 'تأكيد التسجيل في البوت',
      'reg': 'التسجيل في البوت',
      'unregister': 'إلغاء التسجيل وحذف الحساب',
      'unreg': 'إلغاء التسجيل من البوت',
      'afk': 'تفعيل وضع الغياب AFK',

      // Owner & Admin
      'setmode': 'تغيير وضع البوت (عام / خاص / مجموعات / مشرفين)',
      'addadmin': 'إضافة أدمين جديد للبوت',
      'deladmin': 'حذف أدمين من البوت',
      'listadmin': 'عرض قائمة الأدمينات والوضع الحالي للبوت',
      'addprem': 'إضافة عضو لقائمة المميزين Premium',
      'delprem': 'إزالة العضو من قائمة Premium',
      'listpremium': 'عرض قائمة الأعضاء المميزين',
      'ban': 'حظر وتوقيف استخدام البوت لمستخدم',
      'banuser': 'حظر مستخدم معين من البوت',
      'unban': 'فك الحظر عن مستخدم محظور',
      'unbanuser': 'فك الحظر عن مستخدم محظور',
      'delcmd': 'حذف أمر خاص مربوط بملصق',
      'listcmd': 'عرض قائمة أوامر الملصقات',
      'setcmd': 'ربط ملصق بأمر معين',
      'lockcmd': 'قفل أمر ملصق مخصص',
      'unlockcmd': 'فتح أمر ملصق مخصص',
      'deletemsg': 'حذف رسالة أرسلها البوت',
      'deleteplugin': 'حذف ملف إضافة plugin',
      'dfp': 'حذف ملف إضافة plugin',
      'getplugin': 'عرض كود وسورس ملف إضافة',
      'gp': 'عرض كود وسورس ملف إضافة',
      'restart': 'إعادة تشغيل وتحديث البوت',
      'res': 'إعادة تشغيل وتحديث البوت',
      'devmsg': 'إرسال نشرة جماعية لجميع المستخدمين',
      'broadcast': 'إرسال إذاعة جماعية للمستخدمين',
      'bcast': 'إرسال إذاعة جماعية للمستخدمين',
      'msgtodev': 'إرسال رسالة مباشرة للمطور',
      'contactdev': 'التواصل المباشر مع المطور',
      'msgdev': 'إرسال رسالة للمطور',
      'contact': 'التواصل مع المطور'
    },
    arabic: {
      // Group
      'add': 'إضافة عضو جديد للمجموعة',
      'add @user': 'إضافة عضو جديد للمجموعة',
      'kick': 'طرد عضو من المجموعة',
      'kick @user': 'طرد عضو من المجموعة',
      'promote': 'ترقية عضو إلى رتبة مشرف',
      'promote @user': 'ترقية عضو إلى رتبة مشرف',
      'demote': 'تنزيل رتبة المشرف إلى عضو',
      'demote @user': 'تنزيل رتبة المشرف إلى عضو',
      'opengc': 'فتح المحادثة لجميع الأعضاء',
      'closegc': 'قفل المحادثة للمشرفين فقط',
      'mute': 'كتم المجموعة للمشرفين فقط',
      'unmute': 'إلغاء كتم المجموعة',
      'banchat': 'حظر وتوقيف استجابة البوت في المجموعة',
      'unbanchat': 'تفعيل وإلغاء حظر البوت في المجموعة',
      'ubnc': 'تفعيل البوت في المجموعة',
      'hidetag': 'إرسال إشعار مخفي لجميع الأعضاء',
      'totag': 'منشن لجميع الأعضاء مع النص',
      'tag': 'منشن لكافة أعضاء المجموعة',
      'revoke': 'إعادة تعيين رابط دعوة المجموعة',
      'linkgc': 'جلب رابط دعوة المجموعة',
      'setwelcome': 'تعيين رسالة الترحيب بالأعضاء',
      'setbye': 'تعيين رسالة المغادرة',
      'setpromote': 'تعيين رسالة الترقية',
      'setdemote': 'تعيين رسالة تنزيل الرتبة',

      // Islamic
      'quran': 'عرض وتلاوة سور القرآن الكريم كاملاً',
      'quranaudio': 'الاستماع وتنزيل تلاوات القرآن الكريم',
      'qurantext': 'عرض النصوص القرآنية المباركة',
      'tafseer': 'تفسير الآيات والسور القرآنية',
      'ad3iya': 'أذكار وأدعية إسلامية مختارة مصنّفة بفئات تفاعلية',
      'dua': 'أذكار وأدعية إسلامية مختارة',
      'salat': 'عرض أوقات الصلاة لجميع المدن المغربية والعالمية',
      'prayer': 'أوقات الصلاة والمواقيت الشرعية',
      'taqs': 'حالة الطقس والأرصاد الجوية لجميع مدن المغرب',
      'weather': 'حالة الطقس المباشرة',
      'quranmp3': 'تشغيل وتحميل أي سورة قرآنية كاملة بصوت كبار القراء',
      'seerah': 'السيرة النبوية الشريفة كاملة بصوت الشيخ نبيل العوضي',

      // AI
      'ai': 'المحادثة وطرح الأسئلة على الذكاء الاصطناعي',
      'gpt': 'المحادثة وطرح الأسئلة على الذكاء الاصطناعي',
      'imagine': 'توليد ورسم الصور بواسطة الذكاء الاصطناعي',
      'dalle': 'توليد ورسم الصور بواسطة الذكاء الاصطناعي',
      'brat': 'إنشاء تصميم نصي بأسلوب Brat',
      'addmetaai': 'التحدث مع مساعد Meta AI',
      'fakechat': 'إنشاء محادثات واتساب وهمية',
      'aimusic': 'توليد وتأليف مقاطع موسيقية وأغاني بالذكاء الاصطناعي',
      'sdxl': 'توليد وتصميم صور فائقة الجودة بنموذج SDXL',
      'artly': 'توليد رسومات وتصاميم فنية بالذكاء الاصطناعي',
      'tibbi': 'استشارات ومعلومات طبية وصحية بالذكاء الاصطناعي',

      // Downloader & Music
      'play': 'البحث وتحميل الصوت من يوتيوب MP3',
      'ytplay': 'البحث وتحميل الصوت من يوتيوب MP3',
      'song': 'البحث وتحميل الأغاني والمقاطع الصوتية MP3',
      'music': 'البحث وتشغيل الموسيقى والأغاني',
      'aghani': 'البحث وتحميل الأغاني والموسيقى',
      'applemusic': 'تحميل الأغاني من Apple Music',
      'remusic': 'تحميل وتوليد الموسيقى الذكية',
      'lyric': 'البحث عن كلمات ونصوص الأغاني',
      'ytmp3': 'تحميل ملف صوتي مباشر من يوتيوب',
      'ytmp4': 'تحميل مقطع فيديو من يوتيوب MP4',
      'video': 'تحميل مقطع فيديو من يوتيوب MP4',
      'ytv': 'تحميل فيديو من يوتيوب MP4',
      'yts': 'البحث في محتوى وقنوات يوتيوب',
      'yts2': 'البحث في محتوى وقنوات يوتيوب',
      'youtubesearch2': 'البحث في محتوى يوتيوب',
      'tiktok': 'تحميل مقاطع تيك توك بدون علامة مائية',
      'ttdl': 'تحميل مقاطع تيك توك بدون علامة مائية',
      'savetik': 'تحميل سريع لفيديوهات وصوتيات تيك توك',
      'instagram': 'تحميل فيديوهات وصور وألبومات إنستغرام',
      'ig': 'تحميل مقاطع وصور إنستغرام',
      'insta': 'تحميل فيديوهات وصور إنستغرام',
      'reels': 'تحميل ريلز إنستغرام الفيديوهات القصيرة',
      'facebook': 'تحميل الفيديوهات والريلز من فيسبوك',
      'fb': 'تحميل الفيديوهات من فيسبوك',
      'fbdl': 'تحميل الفيديوهات من فيسبوك',
      'capcut': 'تحميل قوالب وفيديوهات كاب كات بدون علامة مائية',
      'capcutdl': 'تحميل فيديوهات وقوالب CapCut',
      'twitter': 'تحميل الفيديوهات والصور من تويتر / X',
      'tw': 'تحميل الفيديوهات من تويتر / X',
      'xdl': 'تحميل الميديا من منصة X (تويتر)',
      'alldownload': 'تحميل الشامل من جميع المنصات الاجتماعية',
      'dl': 'تحميل مباشر وسريع من أي رابط ميديا',
      'download': 'تحميل الميديا من كافة المنصات',
      'mediafire': 'تنزيل الملفات المباشرة من ميديا فاير',
      'mf': 'تنزيل الملفات من ميديا فاير',
      'pinterest': 'البحث وتحميل الصور من بينترست',
      'pindl': 'تحميل صور وفيديوهات بينترست',
      'dafont': 'تحميل الخطوط الاحترافية من دافونت',
      'sfile': 'البحث وتنزيل الملفات من Sfile',
      'gdrive': 'تحميل الملفات مباشرة من جوجل درايف',
      'gd': 'تحميل ملفات جوجل درايف',
      'github': 'البحث وتحميل المستودعات من GitHub كملف ZIP',
      'gitclone': 'تحميل أي مستودع من GitHub كملف ZIP',
      'gh': 'البحث في مستودعات GitHub',
      'google': 'البحث المباشر في محرك البحث جوجل',
      'gsearch': 'البحث الشامل في محرك جوجل',
      'g': 'البحث السريع في جوجل',
      'apkm': 'تحميل ألعاب وتطبيقات مهكرة (TraidMode APK MOD)',
      'apkp': 'تحميل تطبيقات وألعاب من متجر APKPure',
      'apku': 'تحميل تطبيقات وألعاب من متجر Uptodown',
      'apk': 'تنزيل تطبيقات الأندرويد APK مباشرة',
      'apkdl': 'تنزيل تطبيقات الأندرويد APK',
      'appteka': 'تحميل وتنزيل تطبيقات أندرويد من متجر AppTeka',
      'f-droid': 'البحث وتحميل تطبيقات أندرويد مفتوحة المصدر (F-Droid)',
      'arabicfont': 'تنزيل حزم خطوط عربية حديثة مضغوطة ZIP',
      'unsplash': 'البحث وتحميل صور فوتوغرافية احترافية عالية الجودة',

      // Sticker & Media Tools
      'sticker': 'تحويل الصور والمقاطع إلى ملصقات',
      's': 'تحويل الصور والمقاطع إلى ملصقات',
      'toimg': 'تحويل الملصق إلى صورة قابلة للحفظ',
      'editimage': 'إزالة خلفية الصور تلقائياً',
      'removebg': 'إزالة خلفية الصور تلقائياً',
      'nobg': 'إزالة خلفية الصور تلقائياً',
      'rmbg': 'إزالة خلفية الصور تلقائياً',
      'hd': 'رفع جودة وتوضيح الصور HD',
      'remini': 'توضيح وتصفية الصور بالذكاء الاصطناعي',
      'enhance': 'رفع جودة الصور وتوضيح الملامح',
      'colorize': 'تلوين الصور القديمة بالأبيض والأسود',
      'compress': 'ضغط وتصغير حجم الصور بدون فقدان الجودة',
      'removal': 'إزالة العناصر والخلفيات من الصور',
      'ssweb': 'التقاط صورة شاشة كاملة لموقع ويب',
      'qrcode': 'توليد واستخراج رمز الاستجابة السريعة QR',
      'rvo': 'فتح ورؤية وسائط العرض لمرة واحدة',
      'read': 'فتح وسائط العرض لمرة واحدة',
      'vocalremover': 'فصل صوت المغني عن الموسيقى بالذكاء الاصطناعي',
      '3azlsawt': 'عزل الصوت والموسيقى ديال أي أوديو/فيديو بالذكاء الاصطناعي',
      'hazf-sawt': 'عزل الصوت والموسيقى ديال أي أوديو/فيديو بالذكاء الاصطناعي',
      'tovn': 'تحويل أي أوديو إلى تسجيل صوتي واتساب (Voice Note)',
      'tts': 'تحويل النص المكتوب إلى تسجيل صوتي مسموع',
      'wavel': 'تحويل ومعالجة الصوت والنصوص باحترافية',
      'nano': 'توليد وتعديل الصور المتقدم بالذكاء الاصطناعي (Nano Banana)',
      'nanopro': 'دمج وتعديل صور متعددة بالذكاء الاصطناعي',
      'drich': 'إنشاء بطاقات تفاعلية غنية بالأزرار والروابط',
      'voipcall': 'طلب وإجراء مكالمات واتساب برمجية (VoIP)',
      'texttrick': 'تزيين وزخرفة النصوص بأشكال وفونتات فخمة',
      'notoemoji': 'Google Noto Emoji Kitchen توليد إيموجيات ثلاثية الأبعاد',
      'firelogo': 'تصميم شعارات وتأثيرات نارية ثلاثية الأبعاد',
      'carbon': 'تحويل الأكواد البرمجية إلى صور ملونة وأنيقة',
      'code2img': 'تحويل الكود إلى صور ملونة بخلفيات جذابة',
      'pdf2jpg': 'تحويل صفحات ملفات PDF إلى صور JPG في ملف ZIP',

      // Tools & Utilities
      'tourl': 'رفع الصور والملفات والحصول على رابط مباشر',
      'fetch': 'جلب بيانات واستجابة أي رابط API',
      'get': 'جلب بيانات واستجابة أي رابط',
      'anime': 'البحث عن معلومات وتفاصيل أنمي',
      'animesearch': 'البحث عن تفاصيل أنمي',
      'animerandom': 'عرض أنمي عشوائي',
      'manga': 'البحث عن تفاصيل ومعلومات المانجا',
      'mangasearch': 'البحث عن تفاصيل المانجا',
      'mangarandom': 'عرض مانجا عشوائية',
      'landsat': 'صور الفضاء والأقمار الصناعية المخصصة',
      'nameinspace': 'صور الفضاء باسمك',
      'satellite': 'صور الأقمار الصناعية الفضائية',
      'couple': 'صور تطقيم وتطابق للبروفايل للثنائيات',
      'savezip': 'سحب وتنزيل أي موقع ويب بالكامل كملف ZIP',
      'stalkwa-channels': 'كشف بيانات وإحصائيات أي قناة واتساب',
      'whatsgrouplink': 'البحث عن روابط مجموعات واتساب',
      'searchgroups': 'البحث في دليل روابط قروبات واتساب',
      'githubtrend': 'استعراض مشاريع وتريندات GitHub الرائجة اليوم',
      'githubstalk': 'فحص ومتابعة حسابات ومستودعات GitHub',
      'tiktokstat': 'حساب إحصائيات وأرباح وتفاعل حسابات تيك توك',
      'ytpost': 'استخراج منشورات وصور واستطلاعات منتدى يوتيوب',
      'fontsearch': 'البحث وتنزيل الخطوط من Google Fonts',

      // News
      'news': 'آخر الأخبار من هسبريس والجزيرة والعربية بأزرار تفاعلية',
      'hespress': 'آخر أخبار هسبريس بأزرار تفاعلية',
      'aljazeera': 'آخر أخبار الجزيرة بأزرار تفاعلية',
      'alarabiya': 'آخر أخبار العربية بأزرار تفاعلية',
      'le360': 'آخر أخبار Le360',
      'febrayer': 'آخر أخبار فبراير',
      'اخبار': 'آخر الأخبار المغربية والعربية العاجلة',

      // Games
      'rps': 'لعبة حجرة ورقة مقص مع أزرار تفاعلية',
      'truefalse': 'لعبة صح أم خطأ مع أزرار تفاعلية',
      'penalty': 'لعبة ضربات الترجيح الكروية مع أزرار للاختيار',
      'slots': 'لعبة ماكينة الحظ والسلوتس',
      '8ball': 'كرة الحظ السحرية تجاوب على أسئلتك',
      'truth': 'لعبة صراحة أم تحدي — صراحة',
      'dare': 'لعبة صراحة أم تحدي — تحدي',
      'kora': 'لعبة ضربات الجزاء التفاعلية ضد الحارس',
      'doom': 'لعبة دووم الكلاسيكية التفاعلية',
      'dino': 'لعبة الديناصور التفاعلية',
      'snake': 'لعبة الثعبان الكلاسيكية التفاعلية',
      'brick': 'لعبة تكسير الطوب التفاعلية',
      'turbodash': 'لعبة سباق السيارات السريع التفاعلية',
      'skyhop': 'لعبة القفز السحابي التفاعلية',
      'ninja': 'لعبة قتال نينجا الظل التفاعلية',
      'memory': 'لعبة تطابق البطاقات واختبار الذاكرة',
      'suit': 'لعبة حجر ورقة مقص التفاعلية',
      'tictactoe': 'لعبة إكس أو التفاعلية',
      'xo': 'لعبة إكس أو التفاعلية',
      'xo2': 'لعبة إكس أو التفاعلية المتطورة',

      // Fun
      'love': 'حساب نسبة الحب والانسجام بين شخصين',
      'rate': 'قياس نسبة تقييم عشوائية بالمئة',
      'simp': 'قياس نسبة التطبيل والخرفنة',
      'stupid': 'قياس نسبة الكلاخ',
      'joke': 'نكتة مضحكة عشوائية بالدارجة',
      'fact': 'معلومة علمية مثيرة عشوائية',
      'flirt': 'رسالة غزل ومدح جميلة',
      'cat': 'تصويرة قطة كيوت عشوائية',
      'dog': 'تصويرة كلب طريف عشوائي',
      'meme': 'تصويرة ميم مضحكة عشوائية',

      // Info & Main
      'menu': 'عرض القائمة الرئيسية للأوامر والخدمات',
      'lang': 'تغيير لغة التواصل مع البوت',
      'language': 'تغيير لغة التواصل مع البوت',
      'owner': 'معلومات التواصل مع مطور ومالك البوت',
      'creator': 'معلومات التواصل مع المطور',
      'ping': 'فحص سرعة استجابة البوت وأداء السيرفر',
      'speed': 'قياس سرعة استجابة البوت',
      'os': 'عرض معلومات النظام والسيرفر',
      'dashboard': 'عرض لوحة تحكم وإحصائيات البوت',
      'dash': 'عرض لوحة تحكم وإحصائيات البوت',
      'totalfeatures': 'عرض إجمالي عدد الأوامر والمميزات المتاحة',
      'feature': 'عرض إجمالي عدد المميزات',
      'totaluser': 'إحصائيات إجمالي عدد المستعملين المسجلين',
      'register': 'تسجيل وتأكيد حساب المستخدم',
      'verify': 'تأكيد حساب المستخدم',
      'reg': 'تسجيل حساب المستخدم',
      'unregister': 'إلغاء تسجيل حساب المستخدم',
      'unreg': 'إلغاء تسجيل الحساب',
      'afk': 'تفعيل وضع الغياب AFK',

      // Owner & Admin
      'setmode': 'تغيير وضع البوت (عام / خاص / مجموعات / مشرفين)',
      'addadmin': 'إضافة مشرف جديد للبوت',
      'deladmin': 'إزالة مشرف من البوت',
      'listadmin': 'عرض قائمة المشرفين ووضع البوت الحالي',
      'addprem': 'إضافة عضو إلى قائمة المستخدمين المميزين',
      'delprem': 'إلغاء اشتراك العضو المميز',
      'listpremium': 'عرض قائمة الأعضاء المشتركين',
      'ban': 'حظر مستخدم معين من استعمال البوت',
      'banuser': 'حظر مستخدم محدد من البوت',
      'unban': 'إلغاء حظر مستخدم محدد',
      'unbanuser': 'إلغاء حظر مستخدم محدد',
      'delcmd': 'حذف أمر ملصق مخصص',
      'listcmd': 'عرض الأوامر المخصصة للملصقات',
      'setcmd': 'تعيين أمر مخصص لملصق',
      'lockcmd': 'قفل أمر ملصق مخصص',
      'unlockcmd': 'فتح أمر ملصق مخصص',
      'deletemsg': 'حذف رسالة البوت في المحادثة',
      'deleteplugin': 'حذف ملف إضافة من البوت',
      'dfp': 'حذف ملف إضافة من البوت',
      'getplugin': 'عرض كود المصدر لملف إضافة',
      'gp': 'عرض كود المصدر لملف إضافة',
      'restart': 'إعادة تشغيل نظام وسيرفر البوت',
      'res': 'إعادة تشغيل البوت',
      'devmsg': 'إرسال إذاعة جماعية لكافة مستخدمي البوت',
      'broadcast': 'إرسال إذاعة جماعية للمستخدمين',
      'bcast': 'إرسال إذاعة جماعية للمستخدمين',
      'msgtodev': 'إرسال رسالة مباشرة للمطور',
      'contactdev': 'التواصل المباشر مع المطور',
      'msgdev': 'إرسال رسالة للمطور',
      'contact': 'التواصل مع المطور'
    },
    english: {
      // Group
      'add': 'Add member to the group',
      'add @user': 'Add member to the group',
      'kick': 'Remove member from the group',
      'kick @user': 'Remove member from the group',
      'promote': 'Promote member to group admin',
      'promote @user': 'Promote member to group admin',
      'demote': 'Demote admin to regular member',
      'demote @user': 'Demote admin to regular member',
      'opengc': 'Open group chat for all members',
      'closegc': 'Close group chat for admins only',
      'mute': 'Mute group chat for admins only',
      'unmute': 'Unmute group chat',
      'banchat': 'Disable/Ban bot in current group',
      'unbanchat': 'Enable/Unban bot in current group',
      'ubnc': 'Enable bot in current group',
      'hidetag': 'Mention & notify all group members',
      'totag': 'Mention all members with text',
      'tag': 'Mention all group members',
      'revoke': 'Revoke & reset group invite link',
      'linkgc': 'Get group invite link',
      'setwelcome': 'Set group welcome message',
      'setbye': 'Set group leave/bye message',
      'setpromote': 'Set admin promotion message',
      'setdemote': 'Set admin demotion message',

      // Islamic
      'quran': 'Read full Holy Quran surahs with text',
      'quranaudio': 'Listen & download Quran recitations',
      'qurantext': 'Read Quranic verses & text',
      'tafseer': 'Tafseer (exegesis) of Quranic verses',
      'ad3iya': 'Islamic adhkar & duas organized in interactive categories',
      'dua': 'Islamic adhkar & duas collection',
      'salat': 'Prayer times for all Moroccan cities & worldwide',
      'prayer': 'Islamic prayer times & schedules',
      'taqs': 'Live weather forecast for all Moroccan cities',
      'weather': 'Live weather forecast',
      'quranmp3': 'Play & download any full surah as MP3 by top reciters',

      // AI
      'ai': 'Chat and ask questions to AI Assistant',
      'gpt': 'Chat and ask questions to AI Assistant',
      'imagine': 'Generate & draw images using AI',
      'dalle': 'Generate & draw images using AI',
      'brat': 'Generate text design in Brat style',
      'addmetaai': 'Interact with Meta AI Assistant',
      'fakechat': 'Create fake WhatsApp chat layout',

      // Downloader
      'play': 'Search & download MP3 audio from YouTube',
      'ytplay': 'Search & download MP3 audio from YouTube',
      'song': 'Search & download songs and MP3 audio',
      'music': 'Search and play music & audio tracks',
      'aghani': 'Search & download music and songs',
      'applemusic': 'Download songs directly from Apple Music',
      'remusic': 'AI music remix & generation',
      'lyric': 'Search song lyrics & transcriptions',
      'ytmp3': 'Download MP3 audio directly from YouTube link',
      'ytmp4': 'Download MP4 video directly from YouTube link',
      'video': 'Download MP4 video from YouTube',
      'ytv': 'Download MP4 video from YouTube',
      'yts': 'Search YouTube videos & channels',
      'yts2': 'Search YouTube videos & channels',
      'youtubesearch2': 'Search YouTube content',
      'tiktok': 'Download TikTok videos without watermark',
      'ttdl': 'Download TikTok videos without watermark',
      'savetik': 'Fast TikTok video & audio downloader',
      'instagram': 'Download Instagram reels, posts, IGTV & photo carousels',
      'ig': 'Download Instagram reels & photos',
      'insta': 'Download Instagram reels & photos',
      'reels': 'Download Instagram reels & short videos',
      'facebook': 'Download Facebook videos & reels in high quality',
      'fb': 'Download Facebook videos & reels',
      'fbdl': 'Download Facebook videos & reels',
      'capcut': 'Download CapCut templates & videos without watermark',
      'capcutdl': 'Download CapCut templates & videos',
      'twitter': 'Download Twitter / X videos, GIFs & photos',
      'tw': 'Download Twitter / X videos & GIFs',
      'xdl': 'Download media from X (Twitter)',
      'alldownload': 'Universal social media downloader (TikTok, IG, FB, YT, Twitter, etc.)',
      'dl': 'Quick downloader for any social media URL',
      'download': 'Universal media downloader for all platforms',
      'mediafire': 'Download files directly from MediaFire',
      'mf': 'Download files from MediaFire',
      'pinterest': 'Search & download images from Pinterest',
      'pindl': 'Download Pinterest photos & videos',
      'dafont': 'Search & download custom fonts from DaFont',
      'sfile': 'Search & download files from Sfile',
      'gdrive': 'Download files directly from Google Drive',
      'gd': 'Download files from Google Drive',
      'github': 'Search & download repositories from GitHub as ZIP',
      'gitclone': 'Download any GitHub repository as ZIP archive',
      'gh': 'Search & download GitHub repositories',
      'google': 'Perform web searches directly on Google',
      'gsearch': 'Search Google web index',
      'g': 'Quick search on Google',
      'apkm': 'Download Modded APKs & Games (TraidMode)',
      'apkp': 'Download APKs from APKPure Store',
      'apku': 'Download APKs from Uptodown Store',
      'apk': 'Download Android APK apps directly',
      'apkdl': 'Download Android APK apps directly',

      // Sticker & Media Tools
      'sticker': 'Create sticker from image or short video',
      's': 'Create sticker from image or short video',
      'toimg': 'Convert WhatsApp sticker back to image',
      'editimage': 'Remove image background automatically',
      'removebg': 'Remove image background automatically',
      'nobg': 'Remove image background automatically',
      'rmbg': 'Remove image background automatically',
      'hd': 'Enhance & upscale image quality to HD',
      'remini': 'AI Photo enhancer & HD unblur',
      'enhance': 'Upscale image quality & enhance facial details',
      'colorize': 'Colorize old black & white photos using AI',
      'compress': 'Compress image file size without losing quality',
      'removal': 'Remove objects & backgrounds from photos',
      'ssweb': 'Take full screenshot of any website URL',
      'qrcode': 'Generate QR code from text or URL',
      'rvo': 'Retrieve View Once messages & media',
      'read': 'Retrieve View Once messages & media',
      'vocalremover': 'Separate vocals and music from audio/video using AI',
      '3azlsawt': 'Separate vocals and music from audio/video using AI',
      'hazf-sawt': 'Separate vocals and music from audio/video using AI',
      'tovn': 'Convert any audio to WhatsApp Voice Note (PTT)',
      'tts': 'Convert written text to natural speech audio',
      'wavel': 'Professional voice & text audio generator',
      'nano': 'Nano Banana advanced multi-modal AI image editor',
      'nanopro': 'Blend and edit multiple images with AI',
      'drich': 'Create rich interactive cards with dynamic buttons',
      'voipcall': 'Schedule and trigger WhatsApp VoIP voice & video calls',
      'texttrick': 'Transform text into stylish fancy Unicode fonts',

      // Tools & Utilities
      'tourl': 'Upload media & get public direct link',
      'fetch': 'Fetch raw data/response from API URL',
      'get': 'Fetch raw data/response from URL',
      'anime': 'Search anime details & character info',
      'animesearch': 'Search anime details',
      'animerandom': 'Get random anime info',
      'manga': 'Search manga details & chapter info',
      'mangasearch': 'Search manga details',
      'mangarandom': 'Get random manga info',
      'landsat': 'NASA satellite & space view with custom name',
      'nameinspace': 'Custom space view with your name',
      'satellite': 'NASA satellite space image',

      // News
      'news': 'Latest news from Hespress, Al Jazeera & Al Arabiya with interactive buttons',
      'hespress': 'Latest Hespress news with interactive buttons',
      'aljazeera': 'Latest Al Jazeera news with interactive buttons',
      'alarabiya': 'Latest Al Arabiya news with interactive buttons',
      'le360': 'Latest Le360 Morocco news',
      'febrayer': 'Latest Febrayer news',
      'اخبار': 'Latest Moroccan & Arab breaking news',

      // Games
      'rps': 'Rock Paper Scissors with interactive buttons',
      'truefalse': 'True or False Quiz with interactive buttons',
      'penalty': 'Football Penalty Shootout with direction buttons',
      'slots': 'Spin the Slot Machine for prizes',
      '8ball': 'Ask the Magic 8-Ball fortune teller',
      'truth': 'Truth or Dare — Truth question',
      'dare': 'Truth or Dare — Dare challenge',

      // Fun
      'love': 'Calculate love & compatibility % between two users',
      'rate': 'Get a random rate percentage',
      'simp': 'Check simp rating for a user',
      'stupid': 'Check stupidity rating for a user',
      'joke': 'Get a random funny joke',
      'fact': 'Get a random interesting fact',
      'flirt': 'Get a sweet flirt/compliment message',
      'cat': 'Get a random cute cat image',
      'dog': 'Get a random cute dog image',
      'meme': 'Get a random hilarious meme',

      // Info & Main
      'menu': 'Display main interactive command menu',
      'lang': 'Change bot language (Darija/Arabic/English)',
      'language': 'Change bot language',
      'owner': 'Contact bot owner & developer info',
      'creator': 'Contact bot developer info',
      'ping': 'Check bot response speed & latency',
      'speed': 'Check bot latency & server speed',
      'os': 'Display server OS & system info',
      'dashboard': 'Display bot analytics & performance dashboard',
      'dash': 'Display bot analytics dashboard',
      'totalfeatures': 'Display total count of available bot features',
      'feature': 'Display total bot features count',
      'totaluser': 'Display total count of registered users',
      'register': 'Register & verify user account',
      'verify': 'Verify user account',
      'reg': 'Register user account',
      'unregister': 'Unregister user account',
      'unreg': 'Unregister user account',
      'afk': 'Set away-from-keyboard AFK mode',

      // Owner & Admin
      'setmode': 'Change bot mode (public / private / group / admin)',
      'addadmin': 'Add a new bot admin',
      'deladmin': 'Remove a bot admin',
      'listadmin': 'List all bot admins and current bot mode',
      'addprem': 'Grant premium status to user',
      'delprem': 'Revoke premium status from user',
      'listpremium': 'List all active premium users',
      'ban': 'Ban specified user from using the bot',
      'banuser': 'Ban specified user from using the bot',
      'unban': 'Unban specified user',
      'unbanuser': 'Unban specified user',
      'delcmd': 'Delete custom sticker command',
      'listcmd': 'List all custom sticker commands',
      'setcmd': 'Set custom sticker command',
      'lockcmd': 'Lock custom sticker command',
      'unlockcmd': 'Unlock custom sticker command',
      'deletemsg': 'Delete bot message in group',
      'deleteplugin': 'Delete a plugin file',
      'dfp': 'Delete a plugin file',
      'getplugin': 'Get source code of a plugin',
      'gp': 'Get source code of a plugin',
      'restart': 'Restart bot process',
      'res': 'Restart bot process',
      'devmsg': 'Broadcast message to all registered users',
      'broadcast': 'Broadcast message to all users',
      'bcast': 'Broadcast message to all users',
      'msgtodev': 'Send message directly to developer',
      'contactdev': 'Contact developer directly',
      'msgdev': 'Send message to developer',
      'contact': 'Contact developer'
    }
  };

  const defaultMenu = {
    before: greetingMsg.trim(),
    header: '\n┌───〔 %category 〕─┈⬣',
    body: '│ 🚀 *%cmd* %flags%desc',
    footer: '└────────────────┈⬣',
    after: '\n⚡ *bot amirni hamza • حمزة اعمرني*'
  };

  try {
    const plugins = Object.values(global.plugins).filter(p => !p.disabled);

    const help = plugins.map(p => ({
      help: Array.isArray(p.help) ? p.help : [p.help],
      tags: Array.isArray(p.tags) ? p.tags : [p.tags],
      prefix: 'customPrefix' in p,
      limit: '',
      premium: '',
      owner: p.owner ? '👑' : ''
    }));

    const voirToutTitle = lang === 'darija' ? '📋 جميع الأوامر (Voir Tout)' : lang === 'arabic' ? '📋 جميع الأوامر (Voir Tout)' : '📋 All Commands (Voir Tout)';
    const voirToutDesc  = lang === 'darija' ? 'عرض جميع أوامر البوت دفعة واحدة' : lang === 'arabic' ? 'عرض كافة أوامر البوت' : 'Show all bot commands';

    const rows = [
      {
        title: voirToutTitle,
        description: voirToutDesc,
        id: `${_p + command} all`
      },
      ...Object.keys(allTags).map(tag => ({
        title: allTags[tag],
        description: `أوامر قسم ${allTags[tag]}`,
        id: `${_p + command} ${tag}`
      }))
    ];

    const hasArg = Boolean(args[0]);

    let textToSend;
    if (!hasArg) {
      // Small clean greeting text
      textToSend = defaultMenu.before + '\n\n' + defaultMenu.after;
    } else {
      // Full command list text for selected category or all
      const userLangDesc = cmdDescMap[lang] || cmdDescMap['darija'];

      const getPriority = (tag, cmdName) => {
        if (tag === 'downloader') {
          const c = String(cmdName).toLowerCase().replace(/^[.!#/]/, '').split(' ')[0].trim();
          if (c === 'apkm') return 1;
          if (c === 'apkp' || c === 'apkpure') return 2;
          if (c === 'apku' || c === 'uptodown') return 3;
          if (c === 'apk' || c === 'apkdl') return 4;
          if (['song', 'play', 'music', 'aghani', 'ytmp3', 'applemusic', 'remusic', 'lyric'].includes(c)) return 10;
          if (['instagram', 'ig', 'insta', 'reels', 'facebook', 'fb', 'fbdl', 'tiktok', 'ttdl', 'savetik', 'ytdl', 'ytmp4', 'video', 'ytv', 'yts', 'yts2', 'twitter', 'tw', 'xdl', 'capcut', 'capcutdl', 'pinterest', 'pindl'].includes(c)) return 20;
          if (['alldownload', 'dl', 'download', 'mediafire', 'mf', 'gdrive', 'gd', 'github', 'gitclone', 'gh', 'sfile', 'dafont', 'google', 'gsearch', 'g'].includes(c)) return 30;
          return 50;
        }
        return 0;
      };

      textToSend = [
        defaultMenu.before,
        ...Object.keys(tags).map(tag => {
          let tagItems = help
            .filter(p => p.tags.includes(tag))
            .flatMap(p => p.help.map(h => ({ h, p })));

          if (tag === 'downloader') {
            tagItems.sort((a, b) => getPriority(tag, a.h) - getPriority(tag, b.h));
          }

          const items = tagItems.map(({ h, p }) => {
            const cmd = p.prefix ? h : `${_p}${h}`;
            const rawName = String(h).trim().split(' ')[0];
            const desc = userLangDesc[rawName] || cmdDescMap['darija'][rawName] || cmdDescMap['arabic'][rawName] || '';
            const descText = desc ? ` — _${desc}_` : '';
            const flags = [p.owner].filter(Boolean).join(' ');
            return defaultMenu.body
              .replace(/%cmd/g, cmd)
              .replace(/%flags/g, flags ? `${flags} ` : '')
              .replace(/%desc/g, descText);
          }).join('\n');

          return `${defaultMenu.header.replace('%category', tags[tag])}\n${items}\n${defaultMenu.footer}`;
        }),
        defaultMenu.after
      ].join('\n');
    }

    let registered = user.registered;
    let name = registered ? user.name : (m.name || m.pushName || conn.getName(m.sender));
    let uptime = clockString(process.uptime() * 1000);

    let dbCount = await getDbUserCount();
    let localCount = Object.keys(global.db?.data?.users || {}).length;
    let totalreg = Math.max(localCount, dbCount);
    let rtotalreg = totalreg;

    let d = new Date();
    let locale = lang === 'english' ? 'en-US' : 'ar-MA';

    let date = d.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const replace = {
      '%': '',
      p: _p,
      uptime,
      me: conn.user.name,
      name,
      date,
      totalreg,
      rtotalreg
    };

    const finalCaption = textToSend.replace(
      new RegExp(`%(${Object.keys(replace).join('|')})`, 'g'),
      (_, key) => replace[key]
    );

    let imageBuffer;
    try {
      if (fs.existsSync('./media/menu.jpg')) {
        imageBuffer = fs.readFileSync('./media/menu.jpg');
      }
    } catch (_) {}

    const buttonTitle = lang === 'darija' ? '📂 اختر القائمة' : lang === 'arabic' ? '📂 اختر القائمة' : '📂 Select Menu';
    const ownerBtnTitle = lang === 'darija' ? '👑 المطور والمالك' : lang === 'arabic' ? '👑 التواصل مع المطور' : '👑 Contact Owner';

    const stdButtons = [
      {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: buttonTitle,
          sections: [{ rows }]
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
          display_text: '📢 WhatsApp Channel',
          url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p',
          merchant_url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
        })
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: ownerBtnTitle,
          id: `${_p}owner`
        })
      },
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: lang === 'english' ? '🌐 Change Language' : '🌐 تغيير اللغة',
          id: `${_p}lang`
        })
      }
    ];

    if (imageBuffer) {
      await conn.sendButton(
        m.chat,
        {
          image: imageBuffer,
          caption: finalCaption,
          footer: 'bot amirni hamza • حمزة اعمرني',
          buttons: stdButtons
        },
        { quoted: m }
      );
    } else {
      await conn.sendButton(
        m.chat,
        {
          body: finalCaption,
          footer: 'bot amirni hamza • حمزة اعمرني',
          buttons: stdButtons
        },
        { quoted: m }
      );
    }

  } catch (e) {
    console.error(e);
    m.reply('❌ حدث خطأ أثناء عرض القائمة / Error loading menu.');
  }
};

handler.help = ['menu'];
handler.tags = ['main'];
handler.command = /^(menu|help|mneu|meun|\?|الاوامر|أوامر|الأوامر|منيو|قائمة|القائمة|مساعدة)$/i;

export default handler;

function clockString(ms) {
  let h = Math.floor(ms / 3600000);
  let m = Math.floor(ms / 60000) % 60;
  let s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

function ucapanDarija() {
  const time = moment.tz('Africa/Casablanca').format('HH');
  if (time < 5) return 'ليلة سعيدة وزوينة أ عشيري';
  if (time < 12) return 'صباح الخير والورد والفل';
  if (time < 18) return 'مساء الخير والنشاط';
  return 'مساء النور أ السي';
}

function ucapanArabic() {
  const time = moment.tz('Africa/Casablanca').format('HH');
  if (time < 5) return 'طاب مساؤك';
  if (time < 12) return 'صباح الخير';
  if (time < 18) return 'مساء الخير';
  return 'مساء النور';
}
