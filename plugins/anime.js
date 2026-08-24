import axios from 'axios';

const JIKAN_API = 'https://api.jikan.moe/v4';

const POPULAR_ANIME = [
  { id: 21, title: 'One Piece (ون بيس)', query: 'One Piece' },
  { id: 16498, title: 'Attack on Titan (هجوم العمالقة)', query: 'Attack on Titan' },
  { id: 38000, title: 'Demon Slayer (قاتل الشياطين)', query: 'Demon Slayer' },
  { id: 40748, title: 'Jujutsu Kaisen (جوجوتسو كايسن)', query: 'Jujutsu Kaisen' },
  { id: 1535, title: 'Death Note (مذكرة الموت)', query: 'Death Note' },
  { id: 20, title: 'Naruto Shippuden (ناروتو شيبودن)', query: 'Naruto Shippuden' },
  { id: 11061, title: 'Hunter x Hunter (القناص)', query: 'Hunter x Hunter' },
  { id: 269, title: 'Bleach (بليتش)', query: 'Bleach' },
  { id: 5114, title: 'Fullmetal Alchemist: Brotherhood', query: 'Fullmetal Alchemist Brotherhood' },
  { id: 30276, title: 'One Punch Man (رجل اللكمة الواحدة)', query: 'One Punch Man' }
];

async function getJikanAnime(query) {
  try {
    const res = await axios.get(`${JIKAN_API}/anime`, {
      params: { q: query, limit: 1 },
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 8000
    });
    const anime = res.data?.data?.[0];
    if (!anime) return null;

    return {
      id: anime.mal_id,
      title: anime.title,
      titleJapanese: anime.title_japanese || '',
      type: anime.type || 'TV',
      episodes: anime.episodes || 'N/A',
      status: anime.status || 'Finished',
      score: anime.score || 'N/A',
      rating: anime.rating || 'G',
      synopsis: anime.synopsis ? (anime.synopsis.length > 350 ? anime.synopsis.slice(0, 350) + '...' : anime.synopsis) : 'No synopsis available',
      image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
      trailerUrl: anime.trailer?.url || anime.url,
      youtubeVideoId: anime.trailer?.youtube_id || '',
      url: anime.url,
      genres: (anime.genres || []).map(g => g.name).join(', ')
    };
  } catch (e) {
    return null;
  }
}

async function getAniListAnime(query) {
  try {
    const gql = `query ($search: String) {
      Media (search: $search, type: ANIME) {
        id
        title { english romaji native }
        type
        episodes
        status
        averageScore
        description(asHtml: false)
        coverImage { extraLarge large }
        genres
        siteUrl
        trailer { id site }
      }
    }`;
    const res = await axios.post('https://graphql.anilist.co', {
      query: gql,
      variables: { search: query }
    }, { timeout: 8000 });
    const media = res.data?.data?.Media;
    if (!media) return null;
    const desc = (media.description || '').replace(/<[^>]*>/g, '').trim();
    const ytId = (media.trailer?.site === 'youtube') ? media.trailer.id : '';
    return {
      id: media.id,
      title: media.title?.english || media.title?.romaji || query,
      titleJapanese: media.title?.native || '',
      type: media.type || 'TV',
      episodes: media.episodes || 'N/A',
      status: media.status || 'Finished',
      score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
      rating: 'PG-13',
      synopsis: desc ? (desc.length > 350 ? desc.slice(0, 350) + '...' : desc) : 'No synopsis available',
      image: media.coverImage?.extraLarge || media.coverImage?.large,
      trailerUrl: ytId ? `https://youtube.com/watch?v=${ytId}` : media.siteUrl,
      youtubeVideoId: ytId,
      url: media.siteUrl,
      genres: (media.genres || []).join(', ')
    };
  } catch (e) {
    return null;
  }
}

async function getKitsuAnime(query) {
  try {
    const res = await axios.get(`https://kitsu.io/api/edge/anime`, {
      params: { 'filter[text]': query, 'page[limit]': 1 },
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    const anime = res.data?.data?.[0]?.attributes;
    if (!anime) return null;
    return {
      id: anime.slug,
      title: anime.canonicalTitle || anime.titles?.en || query,
      titleJapanese: anime.titles?.ja_jp || '',
      type: anime.subtype?.toUpperCase() || 'TV',
      episodes: anime.episodeCount || 'N/A',
      status: anime.status || 'Finished',
      score: anime.averageRating ? (parseFloat(anime.averageRating) / 10).toFixed(1) : 'N/A',
      rating: anime.ageRating || 'PG-13',
      synopsis: anime.synopsis ? (anime.synopsis.length > 350 ? anime.synopsis.slice(0, 350) + '...' : anime.synopsis) : 'No synopsis available',
      image: anime.posterImage?.large || anime.posterImage?.original,
      trailerUrl: anime.youtubeVideoId ? `https://youtube.com/watch?v=${anime.youtubeVideoId}` : '',
      youtubeVideoId: anime.youtubeVideoId || '',
      url: `https://kitsu.io/anime/${anime.slug}`,
      genres: 'Anime'
    };
  } catch (e) {
    return null;
  }
}

// Fetch animated GIF from Tenor (free, no API key needed for basic use)
async function fetchAnimeGif(title) {
  try {
    // Try Tenor first (no key needed for basic endpoint)
    const tenorRes = await axios.get('https://tenor.googleapis.com/v2/search', {
      params: {
        q: `${title} anime`,
        key: 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCyk', // public demo key
        limit: 8,
        media_filter: 'gif'
      },
      timeout: 6000
    });
    const results = tenorRes.data?.results;
    if (results && results.length > 0) {
      // Pick a random one from top 8 for variety
      const pick = results[Math.floor(Math.random() * results.length)];
      return pick.media_formats?.gif?.url || pick.media_formats?.mediumgif?.url || null;
    }
  } catch (_) {}
  return null;
}

async function getAnimeInfo(query) {
  let anime = await getJikanAnime(query);
  if (!anime) anime = await getAniListAnime(query);
  if (!anime) anime = await getKitsuAnime(query);
  return anime;
}

async function getRandomAnime() {
  try {
    const res = await axios.get(`${JIKAN_API}/random/anime`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    const anime = res.data?.data;
    if (anime) {
      return {
        id: anime.mal_id,
        title: anime.title,
        titleJapanese: anime.title_japanese || '',
        type: anime.type || 'TV',
        episodes: anime.episodes || 'N/A',
        status: anime.status || 'Finished',
        score: anime.score || 'N/A',
        rating: anime.rating || 'G',
        synopsis: anime.synopsis ? (anime.synopsis.length > 350 ? anime.synopsis.slice(0, 350) + '...' : anime.synopsis) : 'No synopsis available',
        image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
        trailerUrl: anime.trailer?.url || anime.url,
        url: anime.url,
        genres: (anime.genres || []).map(g => g.name).join(', ')
      };
    }
  } catch (e) {}

  // Fallback to searching popular random term on AniList
  const popularTerms = ['Naruto', 'One Piece', 'Bleach', 'Demon Slayer', 'Jujutsu Kaisen', 'Attack on Titan', 'Hunter x Hunter'];
  const randTerm = popularTerms[Math.floor(Math.random() * popularTerms.length)];
  return await getAniListAnime(randTerm);
}

// Banner image for main anime card
const ANIME_BANNER_IMAGE = 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg';

let handler = async (m, { conn, text, command, usedPrefix: _p }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';

  // 4-language helper: en, ar, darija, fr
  const t = (en, ar, da, fr) => {
    if (lang === 'french') return fr || en;
    if (lang === 'english') return en;
    if (lang === 'arabic') return ar;
    return da || ar;
  };

  const arg = (text || '').trim();

  // 1️⃣ Main Interactive Anime Menu Card (.anime with no args)
  if (!arg && (command === 'anime' || command === 'أنمي' || command === 'انمي')) {
    const mainCardText = t(
`🎬 *Anime World Zone* 🎬
━━━━━━━━━━━━━━━━━━━━━

Welcome to the Anime Zone! 👋
Select a popular anime from the list below or search for any anime:

1️⃣ 📺 *Popular & Top Rated Anime List*
2️⃣ 🎲 *Discover Random Anime*
3️⃣ 👑 *Contact Developer*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🎬 *عالم الأنمي والرسوم المتحركة* 🎬
━━━━━━━━━━━━━━━━━━━━━

مرحباً بك في قسم الأنمي الاحترافي! 👋
اختر أنمي شهير من القائمة التفاعلية أسفله أو ابحث عن أي أنمي تريد:

1️⃣ 📺 *قائمة أشهر وأفضل الأنميات العالمية*
2️⃣ 🎲 *اكتشاف أنمي عشوائي مقترح*
3️⃣ 👑 *التواصل مع المطور والمالك*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🎬 *عالم الأنمي والرسوم المتحركة - Anime Zone* 🎬
━━━━━━━━━━━━━━━━━━━━━

مرحباً بيك فقسم الأنمي الاحترافي! 👋
عزل أنمي شهير من القائمة أسفله ولا قلب على أي أنمي باغي:

1️⃣ 📺 *قائمة أشهر وأفضل الأنميات العالمية*
2️⃣ 🎲 *اكتشاف أنمي عشوائي مقترح*
3️⃣ 👑 *التواصل مع المطور والمالك*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🎬 *Zone Anime Monde* 🎬
━━━━━━━━━━━━━━━━━━━━━

Bienvenue dans la Zone Anime ! 👋
Sélectionnez un anime populaire ci-dessous ou recherchez n'importe quel anime :

1️⃣ 📺 *Liste des Animes Populaires & Mieux Notés*
2️⃣ 🎲 *Découvrir un Anime Aléatoire*
3️⃣ 👑 *Contacter le Développeur*

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    );

    const rows = POPULAR_ANIME.map(a => ({
      title: `🎬 ${a.title}`,
      description: t(
        `View details for ${a.title}`,
        `عرض تفاصيل ومعلومات ${a.title}`,
        `عرض معلومات وتفاصيل ${a.title}`,
        `Voir les détails de ${a.title}`
      ),
      id: `${_p}animesearch ${a.query}`
    }));

    try {
      return await conn.sendButton(
        m.chat,
        {
          image: { url: ANIME_BANNER_IMAGE },
          caption: mainCardText,
          footer: 'bot amirni hamza',
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: t('🎬 Select Popular Anime', '🎬 اختر أنمي من القائمة', '🎬 عزل أنمي من القائمة', '🎬 Choisir un Anime'),
                sections: [{ title: t('🔥 Popular Anime', '🔥 أشهر الأنميات', '🔥 أشهر الأنميات', '🔥 Animes Populaires'), rows }]
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: t('🎲 Random Anime', '🎲 أنمي عشوائي', '🎲 أنمي عشوائي', '🎲 Anime Aléatoire'),
                id: `${_p}animerandom`
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
        },
        { quoted: m }
      );
    } catch (_) {
      return m.reply(mainCardText);
    }
  }

  // 2️⃣ Random Anime Recommendation (.animerandom)
  if (command === 'animerandom' || arg === 'random' || arg === 'عشوائي') {
    await m.reply(t(
      '🎲 Fetching a random featured anime...',
      '🎲 جاري اختيار أنمي عشوائي مميز...',
      '🎲 جاري اختيار أنمي عشوائي...',
      '🎲 Recherche d\'un anime aléatoire...'
    ));
    const anime = await getRandomAnime();
    if (!anime) return m.reply(t(
      '❌ Failed to fetch a random anime, try again!',
      '❌ تعذر جلب أنمي عشوائي الآن، حاول مجدداً!',
      '❌ ما قدرناش نجيبو أنمي عشوائي، عاود جرب!',
      '❌ Échec de la récupération de l\'anime, réessayez !'
    ));

    return sendAnimeCard(conn, m, anime, _p, t);
  }

  // 3️⃣ Search Anime (.animesearch or .anime <title>)
  if (arg || command === 'animesearch') {
    const query = command === 'animesearch' ? arg : arg;
    await m.reply(t(
      `🔍 Searching for anime: *${query}*...`,
      `🔍 جاري البحث عن الأنمي: *${query}*...`,
      `🔍 كنبحتو على الأنمي: *${query}*...`,
      `🔍 Recherche de l'anime: *${query}*...`
    ));

    const anime = await getAnimeInfo(query);
    if (!anime) return m.reply(t(
      `❌ No anime results found for: *${query}*`,
      `❌ لم يتم العثور على أي أنمي باسم: *${query}*`,
      `❌ ما لقينا حتى أنمي بهاد السمية: *${query}*`,
      `❌ Aucun anime trouvé pour: *${query}*`
    ));

    return sendAnimeCard(conn, m, anime, _p, t);
  }
};

async function sendAnimeCard(conn, m, anime, _p, t) {
  const caption = t(
`🎬 *ANIME DETAILS* 🎬
━━━━━━━━━━━━━━━━━━━━━
📌 *Title:* ${anime.title} (${anime.titleJapanese})
⭐ *Score:* ${anime.score} / 10
📺 *Type:* ${anime.type} | 🎞️ *Episodes:* ${anime.episodes}
🎭 *Genres:* ${anime.genres}
🔞 *Rating:* ${anime.rating}

📝 *Synopsis:*
_${anime.synopsis}_
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🎬 *تفاصيل ومعلومات الأنمي* 🎬
━━━━━━━━━━━━━━━━━━━━━
📌 *العنوان:* ${anime.title} (${anime.titleJapanese})
⭐ *التقييم:* ${anime.score} / 10
📺 *النوع:* ${anime.type} | 🎞️ *الحلقات:* ${anime.episodes}
🎭 *التصنيفات:* ${anime.genres}
🔞 *التصنيف العمري:* ${anime.rating}

📝 *القصة والملخص:*
_${anime.synopsis}_
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🎬 *تفاصيل ومعلومات الأنمي* 🎬
━━━━━━━━━━━━━━━━━━━━━
📌 *العنوان:* ${anime.title} (${anime.titleJapanese})
⭐ *التقييم:* ${anime.score} / 10
📺 *النوع:* ${anime.type} | 🎞️ *الحلقات:* ${anime.episodes}
🎭 *التصنيفات:* ${anime.genres}
🔞 *التصنيف العمري:* ${anime.rating}

📝 *قصة الأنمي:*
_${anime.synopsis}_
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🎬 *DÉTAILS DE L'ANIME* 🎬
━━━━━━━━━━━━━━━━━━━━━
📌 *Titre :* ${anime.title} (${anime.titleJapanese})
⭐ *Note :* ${anime.score} / 10
📺 *Type :* ${anime.type} | 🎞️ *Épisodes :* ${anime.episodes}
🎭 *Genres :* ${anime.genres}
🔞 *Classification :* ${anime.rating}

📝 *Synopsis :*
_${anime.synopsis}_
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
  );

  // Build buttons — add YouTube trailer button if available
  const buttons = [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: t('🎲 Another Anime', '🎲 أنمي آخر', '🎲 أنمي آخر', '🎲 Autre Anime'),
        id: `${_p}animerandom`
      })
    }
  ];

  if (anime.youtubeVideoId) {
    buttons.push({
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '▶️ ' + t('Watch Trailer', 'شاهد الاعلان', 'شوف الـ Trailer', 'Voir la Bande-Annonce'),
        url: `https://youtube.com/watch?v=${anime.youtubeVideoId}`,
        merchant_url: `https://youtube.com/watch?v=${anime.youtubeVideoId}`
      })
    });
  }

  buttons.push({
    name: 'cta_url',
    buttonParamsJson: JSON.stringify({ display_text: '📸 Instagram', url: 'https://instagram.com/hamza_amirni_01', merchant_url: 'https://instagram.com/hamza_amirni_01' })
  });
  buttons.push({
    name: 'cta_url',
    buttonParamsJson: JSON.stringify({ display_text: '📢 ' + t('WhatsApp Channel', 'قناة الواتساب', 'قناة الواتساب', 'Chaîne WhatsApp'), url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p', merchant_url: global.source || 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p' })
  });
  buttons.push({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: '👑 ' + t('Owner', 'المطور والمالك', 'مالك البوت', 'Développeur'),
      id: `${_p}owner`
    })
  });

  // 1️⃣ Send the main info card (with poster image)
  try {
    if (anime.image) {
      await conn.sendButton(m.chat, { image: { url: anime.image }, caption, footer: 'bot amirni hamza', buttons }, { quoted: m });
    } else {
      await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
    }
  } catch (_) {
    await conn.sendMessage(m.chat, { text: caption }, { quoted: m });
  }

  // 2️⃣ Fetch & send animated GIF preview (non-blocking, best-effort)
  try {
    const gifUrl = await fetchAnimeGif(anime.title);
    if (gifUrl) {
      const gifCaption = t(
        `🎬 *${anime.title}* — Animated Preview`,
        `🎬 *${anime.title}* — معاينة متحركة`,
        `🎬 *${anime.title}* — معاينة متحركة`,
        `🎬 *${anime.title}* — Aperçu Animé`
      );
      await conn.sendMessage(m.chat, {
        video: { url: gifUrl },
        caption: gifCaption,
        gifPlayback: true,
        mimetype: 'video/mp4'
      }, { quoted: m });
    }
  } catch (_) {}
}

handler.help = ['anime', 'animesearch', 'animerandom'];
handler.tags = ['tools'];
handler.command = /^(anime|انمي|أنمي|animesearch|animerandom)$/i;

export default handler;
