import axios from 'axios';

const JIKAN_API = 'https://api.jikan.moe/v4';
const MANGADEX_API = 'https://api.mangadex.org';

const POPULAR_MANGA = [
  { id: 13, title: 'One Piece (ون بيس مانغا)', query: 'One Piece' },
  { id: 2, title: 'Berserk (بيرسيرك)', query: 'Berserk' },
  { id: 23390, title: 'Attack on Titan (هجوم العمالقة مانغا)', query: 'Attack on Titan' },
  { id: 113138, title: 'Solo Leveling (سولو ليفلينج مانوا)', query: 'Solo Leveling' },
  { id: 105398, title: 'Demon Slayer (قاتل الشياطين مانغا)', query: 'Demon Slayer' },
  { id: 113415, title: 'Jujutsu Kaisen (جوجوتسو كايسن مانغا)', query: 'Jujutsu Kaisen' },
  { id: 21, title: 'Death Note (مذكرة الموت مانغا)', query: 'Death Note' },
  { id: 11, title: 'Naruto (ناروتو مانغا)', query: 'Naruto' },
  { id: 116778, title: 'Chainsaw Man (رجل المنشار)', query: 'Chainsaw Man' },
  { id: 33327, title: 'Tokyo Ghoul (طوكيو غول مانغا)', query: 'Tokyo Ghoul' }
];

const MANGA_BANNER_IMAGE = 'https://cdn.myanimelist.net/images/manga/2/253146.jpg';

// ─── MangaDex helpers ───────────────────────────────────────────────────────

async function searchMangaDexId(query) {
  try {
    const res = await axios.get(`${MANGADEX_API}/manga`, {
      params: { title: query, limit: 1, 'order[relevance]': 'desc' },
      timeout: 8000
    });
    return res.data?.data?.[0]?.id || null;
  } catch (_) { return null; }
}

// Get chapters list from MangaDex (English preferred, else first available)
async function getMangaDexChapters(mangaDexId, limit = 10) {
  try {
    const res = await axios.get(`${MANGADEX_API}/manga/${mangaDexId}/feed`, {
      params: {
        translatedLanguage: ['en'],
        'order[chapter]': 'asc',
        limit,
        offset: 0,
        'includes[]': ['scanlation_group']
      },
      timeout: 8000
    });
    return (res.data?.data || []).filter(ch => ch.attributes?.pages > 0);
  } catch (_) { return []; }
}

// Get page image URLs for a chapter
async function getMangaDexPages(chapterId) {
  try {
    const res = await axios.get(`${MANGADEX_API}/at-home/server/${chapterId}`, { timeout: 8000 });
    const baseUrl = res.data?.baseUrl;
    const chapter = res.data?.chapter;
    if (!baseUrl || !chapter) return [];
    return chapter.dataSaver.map(f => `${baseUrl}/data-saver/${chapter.hash}/${f}`);
  } catch (_) { return []; }
}

// ─── Jikan / AniList / Kitsu manga info ─────────────────────────────────────

async function getJikanManga(query) {
  try {
    const res = await axios.get(`${JIKAN_API}/manga`, {
      params: { q: query, limit: 1 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    const manga = res.data?.data?.[0];
    if (!manga) return null;
    return {
      id: manga.mal_id,
      title: manga.title,
      titleJapanese: manga.title_japanese || '',
      type: manga.type || 'Manga',
      chapters: manga.chapters || 'N/A',
      volumes: manga.volumes || 'N/A',
      status: manga.status || 'Finished',
      score: manga.score || 'N/A',
      synopsis: manga.synopsis ? (manga.synopsis.length > 350 ? manga.synopsis.slice(0, 350) + '...' : manga.synopsis) : 'No synopsis available',
      image: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
      url: manga.url,
      genres: (manga.genres || []).map(g => g.name).join(', ')
    };
  } catch (_) { return null; }
}

async function getAniListManga(query) {
  try {
    const gql = `query ($search: String) {
      Media (search: $search, type: MANGA) {
        id title { english romaji native }
        type chapters volumes status averageScore
        description(asHtml: false)
        coverImage { extraLarge large }
        genres siteUrl
      }
    }`;
    const res = await axios.post('https://graphql.anilist.co', {
      query: gql, variables: { search: query }
    }, { timeout: 8000 });
    const media = res.data?.data?.Media;
    if (!media) return null;
    const desc = (media.description || '').replace(/<[^>]*>/g, '').trim();
    return {
      id: media.id,
      title: media.title?.english || media.title?.romaji || query,
      titleJapanese: media.title?.native || '',
      type: media.type || 'Manga',
      chapters: media.chapters || 'N/A',
      volumes: media.volumes || 'N/A',
      status: media.status || 'Finished',
      score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
      synopsis: desc ? (desc.length > 350 ? desc.slice(0, 350) + '...' : desc) : 'No synopsis available',
      image: media.coverImage?.extraLarge || media.coverImage?.large,
      url: media.siteUrl,
      genres: (media.genres || []).join(', ')
    };
  } catch (_) { return null; }
}

async function getKitsuManga(query) {
  try {
    const res = await axios.get(`https://kitsu.io/api/edge/manga`, {
      params: { 'filter[text]': query, 'page[limit]': 1 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    const manga = res.data?.data?.[0]?.attributes;
    if (!manga) return null;
    return {
      id: manga.slug,
      title: manga.canonicalTitle || manga.titles?.en || query,
      titleJapanese: manga.titles?.ja_jp || '',
      type: manga.subtype?.toUpperCase() || 'Manga',
      chapters: manga.chapterCount || 'N/A',
      volumes: manga.volumeCount || 'N/A',
      status: manga.status || 'Finished',
      score: manga.averageRating ? (parseFloat(manga.averageRating) / 10).toFixed(1) : 'N/A',
      synopsis: manga.synopsis ? (manga.synopsis.length > 350 ? manga.synopsis.slice(0, 350) + '...' : manga.synopsis) : 'No synopsis available',
      image: manga.posterImage?.large || manga.posterImage?.original,
      url: `https://kitsu.io/manga/${manga.slug}`,
      genres: 'Manga'
    };
  } catch (_) { return null; }
}

async function getMangaInfo(query) {
  let manga = await getJikanManga(query);
  if (!manga) manga = await getAniListManga(query);
  if (!manga) manga = await getKitsuManga(query);
  return manga;
}

async function getRandomManga() {
  try {
    const res = await axios.get(`${JIKAN_API}/random/manga`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    const manga = res.data?.data;
    if (manga) {
      return {
        id: manga.mal_id,
        title: manga.title,
        titleJapanese: manga.title_japanese || '',
        type: manga.type || 'Manga',
        chapters: manga.chapters || 'N/A',
        volumes: manga.volumes || 'N/A',
        status: manga.status || 'Finished',
        score: manga.score || 'N/A',
        synopsis: manga.synopsis ? (manga.synopsis.length > 350 ? manga.synopsis.slice(0, 350) + '...' : manga.synopsis) : 'No synopsis available',
        image: manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
        url: manga.url,
        genres: (manga.genres || []).map(g => g.name).join(', ')
      };
    }
  } catch (_) {}
  const popularTerms = ['One Piece', 'Berserk', 'Attack on Titan', 'Solo Leveling', 'Jujutsu Kaisen', 'Naruto'];
  return await getAniListManga(popularTerms[Math.floor(Math.random() * popularTerms.length)]);
}

// ─── In-memory session store for manga reading ──────────────────────────────
// key: sender → { chapterId, pages, pageIndex, chapterNum, totalChapters, allChapterIds, chapterIndex, mangaTitle }
const mangaSessions = {};

// ─── Main Handler ─────────────────────────────────────────────────────────────

let handler = async (m, { conn, text, command, usedPrefix: _p }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';

  const t = (en, ar, da, fr) => {
    if (lang === 'french') return fr || en;
    if (lang === 'english') return en;
    if (lang === 'arabic') return ar;
    return da || ar;
  };

  const arg = (text || '').trim();

  // ─────────────────────────────────────────────────────────────────────────
  // 🔖 PAGE NAVIGATION: .mangapage <chapterId> <pageIndex>
  // ─────────────────────────────────────────────────────────────────────────
  if (command === 'mangapage') {
    const parts = arg.split(' ');
    const chapterId = parts[0];
    const pageIndex = parseInt(parts[1] || '0', 10);

    // Try session first, else fetch fresh
    let session = mangaSessions[m.sender];
    if (!session || session.chapterId !== chapterId) {
      const pages = await getMangaDexPages(chapterId);
      if (!pages || pages.length === 0) {
        return m.reply(t(
          '❌ Could not load this chapter. Try again!',
          '❌ تعذر تحميل هذا الفصل، حاول مجدداً!',
          '❌ ما قدرناش نحملو هاد الفصل، عاود جرب!',
          '❌ Impossible de charger ce chapitre, réessayez !'
        ));
      }
      session = { chapterId, pages, pageIndex: 0, chapterNum: '?', totalPages: pages.length };
      mangaSessions[m.sender] = session;
    }

    const pages = session.pages;
    const total = pages.length;
    const idx = Math.max(0, Math.min(pageIndex, total - 1));
    session.pageIndex = idx;

    const pageUrl = pages[idx];
    const pageCaption = t(
      `📖 *Page ${idx + 1} / ${total}*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📖 *الصفحة ${idx + 1} من ${total}*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📖 *الصفحة ${idx + 1} من ${total}*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📖 *Page ${idx + 1} / ${total}*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
    );

    const navButtons = [];

    // Prev page button
    if (idx > 0) {
      navButtons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: t('⬅️ Previous Page', '⬅️ الصفحة السابقة', '⬅️ الصفحة السابقة', '⬅️ Page Précédente'),
          id: `${_p}mangapage ${chapterId} ${idx - 1}`
        })
      });
    }

    // Next page button
    if (idx < total - 1) {
      navButtons.push({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: t('➡️ Next Page', '➡️ الصفحة التالية', '➡️ الصفحة التالية', '➡️ Page Suivante'),
          id: `${_p}mangapage ${chapterId} ${idx + 1}`
        })
      });
    }

    // If at last page — offer next chapter if available
    if (idx === total - 1 && session.chapterIndex !== undefined) {
      const nextChIdx = session.chapterIndex + 1;
      if (session.allChapterIds && session.allChapterIds[nextChIdx]) {
        const nextChId = session.allChapterIds[nextChIdx];
        navButtons.push({
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: t('📘 Next Chapter ▶️', '📘 الفصل التالي ▶️', '📘 الفصل التالي ▶️', '📘 Chapitre Suivant ▶️'),
            id: `${_p}mangachapter ${nextChId} ${nextChIdx}`
          })
        });
      }
    }

    navButtons.push({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '🔢 ' + t('Go to Page...', 'انتقل للصفحة...', 'سير للصفحة...', 'Aller à la Page...'),
        id: `${_p}mangapage ${chapterId} 0`
      })
    });

    try {
      return await conn.sendButton(m.chat, {
        image: { url: pageUrl },
        caption: pageCaption,
        footer: 'bot amirni hamza',
        buttons: navButtons
      }, { quoted: m });
    } catch (_) {
      return await conn.sendMessage(m.chat, { image: { url: pageUrl }, caption: pageCaption }, { quoted: m });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 📘 CHAPTER NAVIGATION: .mangachapter <chapterId> <chapterIndex>
  // ─────────────────────────────────────────────────────────────────────────
  if (command === 'mangachapter') {
    const parts = arg.split(' ');
    const chapterId = parts[0];
    const chapterIndex = parseInt(parts[1] || '0', 10);

    const pages = await getMangaDexPages(chapterId);
    if (!pages || pages.length === 0) {
      return m.reply(t(
        '❌ Could not load this chapter!',
        '❌ تعذر تحميل هذا الفصل!',
        '❌ ما قدرناش نحملو هاد الفصل!',
        '❌ Chapitre introuvable !'
      ));
    }

    // Update session
    const session = mangaSessions[m.sender] || {};
    session.chapterId = chapterId;
    session.pages = pages;
    session.pageIndex = 0;
    session.chapterIndex = chapterIndex;
    mangaSessions[m.sender] = session;

    // Send first page of new chapter
    const pageUrl = pages[0];
    const pageCaption = t(
      `📘 *Chapter ${chapterIndex + 1} — Page 1 / ${pages.length}*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📘 *الفصل ${chapterIndex + 1} — الصفحة 1 من ${pages.length}*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📘 *الفصل ${chapterIndex + 1} — الصفحة 1 من ${pages.length}*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📘 *Chapitre ${chapterIndex + 1} — Page 1 / ${pages.length}*\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
    );

    try {
      return await conn.sendButton(m.chat, {
        image: { url: pageUrl },
        caption: pageCaption,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: t('➡️ Next Page', '➡️ الصفحة التالية', '➡️ الصفحة التالية', '➡️ Page Suivante'),
              id: `${_p}mangapage ${chapterId} 1`
            })
          }
        ]
      }, { quoted: m });
    } catch (_) {
      return await conn.sendMessage(m.chat, { image: { url: pageUrl }, caption: pageCaption }, { quoted: m });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1️⃣ Main Menu Card
  // ─────────────────────────────────────────────────────────────────────────
  if (!arg && (command === 'manga' || command === 'مانجا' || command === 'مانغا')) {
    const mainCardText = t(
`📖 *Manga & Manhwa Zone* 📖
━━━━━━━━━━━━━━━━━━━━━

Welcome to the Manga Zone! 👋
Select a popular manga from the list below or search for any title:

1️⃣ 📚 *Popular & Top Rated Manga List*
2️⃣ 🎲 *Discover Random Manga*
3️⃣ 👑 *Contact Developer*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *عالم المانجا والمانهوا* 📖
━━━━━━━━━━━━━━━━━━━━━

مرحباً بك في قسم المانجا الاحترافي! 👋
اختر مانجا شهيرة من القائمة التفاعلية أسفله أو ابحث عن أي عنوان تريد:

1️⃣ 📚 *قائمة أشهر وأفضل المانجات العالمية*
2️⃣ 🎲 *اكتشاف مانجا عشوائية مقترحة*
3️⃣ 👑 *التواصل مع المطور والمالك*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *عالم المانجا والمانهوا - Manga Zone* 📖
━━━━━━━━━━━━━━━━━━━━━

مرحباً بيك فقسم المانجا الاحترافي! 👋
عزل مانجا شهيرة من القائمة أسفله ولا قلب على أي عنوان باغي:

1️⃣ 📚 *قائمة أشهر وأفضل المانجات العالمية*
2️⃣ 🎲 *اكتشاف مانجا عشوائية مقترحة*
3️⃣ 👑 *التواصل مع المطور والمالك*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *Zone Manga & Manhwa* 📖
━━━━━━━━━━━━━━━━━━━━━

Bienvenue dans la Zone Manga ! 👋
Sélectionnez un manga populaire ci-dessous ou recherchez un titre :

1️⃣ 📚 *Liste des Mangas Populaires*
2️⃣ 🎲 *Découvrir un Manga Aléatoire*
3️⃣ 👑 *Contacter le Développeur*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    );

    const rows = POPULAR_MANGA.map(manga => ({
      title: `📖 ${manga.title}`,
      description: t(
        `View details for ${manga.title}`,
        `عرض تفاصيل ومعلومات ${manga.title}`,
        `عرض تفاصيل ومعلومات ${manga.title}`,
        `Voir les détails de ${manga.title}`
      ),
      id: `${_p}mangasearch ${manga.query}`
    }));

    try {
      return await conn.sendButton(m.chat, {
        image: { url: MANGA_BANNER_IMAGE },
        caption: mainCardText,
        footer: 'bot amirni hamza',
        buttons: [
          {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: t('📖 Select Popular Manga', '📖 اختر مانجا من القائمة', '📖 عزل مانجا من القائمة', '📖 Choisir un Manga'),
              sections: [{ title: t('🔥 Popular Manga', '🔥 أشهر المانجات', '🔥 أشهر المانجات', '🔥 Mangas Populaires'), rows }]
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: t('🎲 Random Manga', '🎲 مانجا عشوائية', '🎲 مانجا عشوائية', '🎲 Manga Aléatoire'),
              id: `${_p}mangarandom`
            })
          },
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({ display_text: '📸 Instagram', url: 'https://instagram.com/hamza_amirni_01', merchant_url: 'https://instagram.com/hamza_amirni_01' })
          },
          {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({ display_text: '📢 ' + t('WhatsApp Channel', 'قناة الواتساب', 'قناة الواتساب', 'Chaîne WhatsApp'), url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p', merchant_url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p' })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '👑 ' + t('Owner', 'المطور والمالك', 'مالك البوت', 'Développeur'),
              id: `${_p}owner`
            })
          },
          {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
              display_text: '🌐 ' + t('Change Language', 'تغيير اللغة', 'تغيير اللغة', 'Changer de Langue'),
              id: `${_p}lang`
            })
          }
        ]
      }, { quoted: m });
    } catch (_) {
      return m.reply(mainCardText);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2️⃣ Random Manga
  // ─────────────────────────────────────────────────────────────────────────
  if (command === 'mangarandom' || arg === 'random' || arg === 'عشوائي') {
    await m.reply(t(
      '🎲 Fetching a random featured manga...',
      '🎲 جاري اختيار مانجا عشوائية مميزة...',
      '🎲 جاري اختيار مانجا عشوائية...',
      '🎲 Recherche d\'un manga aléatoire...'
    ));
    const manga = await getRandomManga();
    if (!manga) return m.reply(t(
      '❌ Failed to fetch a random manga, try again!',
      '❌ تعذر جلب مانجا عشوائية الآن، حاول مجدداً!',
      '❌ ما قدرناش نجيبو مانجا عشوائية، عاود جرب!',
      '❌ Échec de la récupération du manga, réessayez !'
    ));
    return sendMangaCard(conn, m, manga, _p, t);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3️⃣ Search Manga
  // ─────────────────────────────────────────────────────────────────────────
  if (arg || command === 'mangasearch') {
    const query = arg;
    await m.reply(t(
      `🔍 Searching for manga: *${query}*...`,
      `🔍 جاري البحث عن المانجا: *${query}*...`,
      `🔍 كنبحتو على المانجا: *${query}*...`,
      `🔍 Recherche du manga: *${query}*...`
    ));
    const manga = await getMangaInfo(query);
    if (!manga) return m.reply(t(
      `❌ No manga results found for: *${query}*`,
      `❌ لم يتم العثور على أي مانجا باسم: *${query}*`,
      `❌ ما لقينا حتى مانجا بهاد السمية: *${query}*`,
      `❌ Aucun manga trouvé pour: *${query}*`
    ));
    return sendMangaCard(conn, m, manga, _p, t);
  }
};

// ─── Send Manga Info Card + Chapter List + First Page ───────────────────────

async function sendMangaCard(conn, m, manga, _p, t) {
  const caption = t(
`📖 *MANGA DETAILS* 📖
━━━━━━━━━━━━━━━━━━━━━
📌 *Title:* ${manga.title} (${manga.titleJapanese})
⭐ *Score:* ${manga.score} / 10
📚 *Type:* ${manga.type} | 📄 *Chapters:* ${manga.chapters}
📦 *Volumes:* ${manga.volumes} | 📌 *Status:* ${manga.status}
🎭 *Genres:* ${manga.genres}

📝 *Synopsis:*
_${manga.synopsis}_
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *تفاصيل ومعلومات المانجا* 📖
━━━━━━━━━━━━━━━━━━━━━
📌 *العنوان:* ${manga.title} (${manga.titleJapanese})
⭐ *التقييم:* ${manga.score} / 10
📚 *النوع:* ${manga.type} | 📄 *الفصول:* ${manga.chapters}
📦 *المجلدات:* ${manga.volumes} | 📌 *الحالة:* ${manga.status}
🎭 *التصنيفات:* ${manga.genres}

📝 *القصة والملخص:*
_${manga.synopsis}_
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *تفاصيل ومعلومات المانجا* 📖
━━━━━━━━━━━━━━━━━━━━━
📌 *العنوان:* ${manga.title} (${manga.titleJapanese})
⭐ *التقييم:* ${manga.score} / 10
📚 *النوع:* ${manga.type} | 📄 *الفصول:* ${manga.chapters}
📦 *المجلدات:* ${manga.volumes} | 📌 *الحالة:* ${manga.status}
🎭 *التصنيفات:* ${manga.genres}

📝 *قصة المانجا:*
_${manga.synopsis}_
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📖 *DÉTAILS DU MANGA* 📖
━━━━━━━━━━━━━━━━━━━━━
📌 *Titre :* ${manga.title} (${manga.titleJapanese})
⭐ *Note :* ${manga.score} / 10
📚 *Type :* ${manga.type} | 📄 *Chapitres :* ${manga.chapters}
📦 *Volumes :* ${manga.volumes} | 📌 *Statut :* ${manga.status}
🎭 *Genres :* ${manga.genres}

📝 *Synopsis :*
_${manga.synopsis}_
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
  );

  // ─── 1. Send main info card with cover image ─────────────────────────────
  const infoButtons = [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: t('🎲 Another Manga', '🎲 مانجا أخرى', '🎲 مانجا أخرى', '🎲 Autre Manga'),
        id: `${_p}mangarandom`
      })
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({ display_text: '📸 Instagram', url: 'https://instagram.com/hamza_amirni_01', merchant_url: 'https://instagram.com/hamza_amirni_01' })
    },
    {
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({ display_text: '📢 ' + t('WhatsApp Channel', 'قناة الواتساب', 'قناة الواتساب', 'Chaîne WhatsApp'), url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p', merchant_url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p' })
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: '👑 ' + t('Owner', 'المطور والمالك', 'مالك البوت', 'Développeur'),
        id: `${_p}owner`
      })
    }
  ];

  try {
    if (manga.image) {
      await conn.sendButton(m.chat, { image: { url: manga.image }, caption, footer: 'bot amirni hamza', buttons: infoButtons }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    }
  } catch (_) {
    await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
  }

  // ─── 2. Fetch chapters from MangaDex & send chapter selector ─────────────
  try {
    const mangaDexId = await searchMangaDexId(manga.title);
    if (!mangaDexId) return;

    const chapters = await getMangaDexChapters(mangaDexId, 15);
    if (!chapters || chapters.length === 0) return;

    const chapterIds = chapters.map(ch => ch.id);

    // Build chapter selection rows
    const chapterRows = chapters.slice(0, 10).map((ch, i) => ({
      title: t(
        `📘 Chapter ${ch.attributes.chapter || (i + 1)}`,
        `📘 الفصل ${ch.attributes.chapter || (i + 1)}`,
        `📘 الفصل ${ch.attributes.chapter || (i + 1)}`,
        `📘 Chapitre ${ch.attributes.chapter || (i + 1)}`
      ),
      description: t(
        ch.attributes.title ? ch.attributes.title.slice(0, 60) : `Read chapter ${ch.attributes.chapter || (i + 1)}`,
        ch.attributes.title ? ch.attributes.title.slice(0, 60) : `اقرأ الفصل ${ch.attributes.chapter || (i + 1)}`,
        ch.attributes.title ? ch.attributes.title.slice(0, 60) : `قرا الفصل ${ch.attributes.chapter || (i + 1)}`,
        ch.attributes.title ? ch.attributes.title.slice(0, 60) : `Lire le chapitre ${ch.attributes.chapter || (i + 1)}`
      ),
      id: `${_p}mangachapter ${ch.id} ${i}`
    }));

    // Store chapter IDs in session for next-chapter navigation
    mangaSessions[m.sender] = {
      ...( mangaSessions[m.sender] || {}),
      allChapterIds: chapterIds,
      mangaTitle: manga.title
    };

    const chapterSelectText = t(
      `📚 *${manga.title}* — Choose a chapter to read:\n━━━━━━━━━━━━━━━━━━━━━\n📖 Use the button below to pick a chapter, then navigate page by page!\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📚 *${manga.title}* — اختر فصلاً للقراءة:\n━━━━━━━━━━━━━━━━━━━━━\n📖 استخدم الزر أسفله لاختيار الفصل، ثم تنقل صفحة بصفحة!\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📚 *${manga.title}* — عزل فصل باش تقرا:\n━━━━━━━━━━━━━━━━━━━━━\n📖 استعمل الزر لاختيار الفصل، بعداً تنقل صفحة بصفحة!\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
      `📚 *${manga.title}* — Choisissez un chapitre à lire:\n━━━━━━━━━━━━━━━━━━━━━\n📖 Utilisez le bouton pour choisir un chapitre, puis naviguez page par page !\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
    );

    await conn.sendButton(m.chat, {
      image: { url: manga.image || MANGA_BANNER_IMAGE },
      caption: chapterSelectText,
      footer: 'bot amirni hamza',
      buttons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: t('📘 Choose Chapter', '📘 اختر الفصل', '📘 عزل الفصل', '📘 Choisir un Chapitre'),
            sections: [{
              title: t('📚 Available Chapters', '📚 الفصول المتاحة', '📚 الفصول المتاحة', '📚 Chapitres Disponibles'),
              rows: chapterRows
            }]
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: t('📖 Read from Chapter 1', '📖 ابدأ من الفصل الأول', '📖 ابدأ من الفصل الأول', '📖 Lire depuis le Ch.1'),
            id: `${_p}mangachapter ${chapterIds[0]} 0`
          })
        }
      ]
    }, { quoted: m });

  } catch (_) {
    // MangaDex not available, silently skip
  }
}

handler.help = ['manga', 'mangasearch', 'mangarandom', 'mangapage', 'mangachapter'];
handler.tags = ['tools'];
handler.command = /^(manga|مانجا|مانغا|mangasearch|mangarandom|mangapage|mangachapter)$/i;

export default handler;
