import axios from 'axios'

// ─── MeverClient (self-contained) ─────────────────────────────────────────────
class MeverClient {
  constructor() {
    this.base    = 'https://mever.zeabur.app/api/'
    this.headers = {
      'X-Package-Name': 'com.dapascript.mever',
      'User-Agent':     'okhttp/4.11.0',
    }
    this.map = {
      tiktok:     'tiktok',
      youtube:    'youtube',
      facebook:   'fb',
      instagram:  'ig',
      pinterest:  'pin-v2',
      twitter:    'twitter',
      threads:    'threads',
      soundcloud: 'soundcloud',
      spotify:    'spotify',
      pixiv:      'pixiv',
      terabox:    'terabox',
      videy:      'videy',
      applemusic: 'applemusic',
      douyin:     'douyin',
    }
  }

  async run({ mode, url, quality = '720p', type = 'video' }) {
    if (!this.map[mode]) throw new Error(`Unknown mode: ${mode}`)
    if (!url)            throw new Error('URL is required')

    const { data } = await axios.get(`${this.base}${this.map[mode]}`, {
      params:  { url, quality, type },
      headers: this.headers,
      timeout: 45_000,
    })

    return data?.data || data
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Detect platform from URL
function detectMode(url) {
  const u = url.toLowerCase()
  if (u.includes('tiktok.com'))                          return 'tiktok'
  if (u.includes('douyin.com'))                          return 'douyin'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook'
  if (u.includes('instagram.com'))                       return 'instagram'
  if (u.includes('pinterest.com') || u.includes('pin.it')) return 'pinterest'
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter'
  if (u.includes('threads.net'))                         return 'threads'
  if (u.includes('soundcloud.com'))                      return 'soundcloud'
  if (u.includes('open.spotify.com'))                    return 'spotify'
  if (u.includes('pixiv.net'))                           return 'pixiv'
  if (u.includes('terabox.com'))                         return 'terabox'
  if (u.includes('videy.co'))                            return 'videy'
  if (u.includes('music.apple.com'))                     return 'applemusic'
  return null
}

// Extract a usable download URL from various API response shapes
function extractMediaUrl(data) {
  // common fields across platforms
  const candidates = [
    data?.url,
    data?.download_url,
    data?.downloadUrl,
    data?.video_url,
    data?.videoUrl,
    data?.audio_url,
    data?.audioUrl,
    data?.medias?.[0]?.url,
    data?.result?.[0]?.url,
    data?.data?.[0]?.url,
    data?.urls?.[0],
    // TikTok / YouTube style arrays
    ...(Array.isArray(data?.medias)  ? data.medias.map(x => x?.url)  : []),
    ...(Array.isArray(data?.results) ? data.results.map(x => x?.url) : []),
  ]
  return candidates.find(u => typeof u === 'string' && u.startsWith('http')) || null
}

function extractTitle(data) {
  return data?.title || data?.caption || data?.description || data?.name || 'Media'
}

// ─── GUIDE TEXT ───────────────────────────────────────────────────────────────
const GUIDE = (p, cmd) => `
📥  *Multi-Platform Downloader*

Download videos, audio, and media from the most popular platforms — just send the link!

━━━━━━━━━━━━━━━━━━━━
📌  *How to use:*
  ${p}${cmd} <link>

📌  *Examples:*
  ${p}${cmd} https://www.tiktok.com/@user/video/123
  ${p}${cmd} https://youtu.be/dQw4w9WgXcQ
  ${p}${cmd} https://www.instagram.com/reel/abc123
  ${p}${cmd} https://twitter.com/user/status/123

━━━━━━━━━━━━━━━━━━━━
✅  *Supported Platforms:*
  • TikTok & Douyin
  • YouTube
  • Facebook
  • Instagram
  • Twitter / X
  • Threads
  • Pinterest
  • SoundCloud
  • Spotify
  • Pixiv
  • Terabox
  • Videy
  • Apple Music

⚠️  *Notes:*
  • Make sure the link is public (not private)
  • YouTube videos are downloaded at 720p by default
  • Large files may take a few seconds
`.trim()

// ─── Handler ──────────────────────────────────────────────────────────────────
const handler = async (m, { conn, usedPrefix, command, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

  const GUIDE_ML = (p, cmd) => lang === 'english' ? GUIDE(p, cmd) : lang === 'arabic' ? `
📥  *محمل متعدد المنصات*

حمّل مقاطع الفيديو والصوت من أشهر المنصات — فقط أرسل الرابط!

━━━━━━━━━━━━━━━━━━━━
📌  *كيفية الاستخدام:*
  ${p}${cmd} <الرابط>

📌  *أمثلة:*
  ${p}${cmd} https://www.tiktok.com/@user/video/123
  ${p}${cmd} https://youtu.be/dQw4w9WgXcQ
  ${p}${cmd} https://www.instagram.com/reel/abc123

✅  *المنصات المدعومة:*
  • تيك توك • يوتيوب • فيسبوك • إنستغرام
  • تويتر/X • ثريدز • بينتريست • ساوندكلاود
  • سبوتيفاي • وغيرها...
`.trim() : `
📥  *تحميل من جميع المنصات*

صيفطلنا الرابط ونحملو ليك الفيديو أو الصوت مباشرة!

━━━━━━━━━━━━━━━━━━━━
📌  *كيفية الاستخدام:*
  ${p}${cmd} <رابط الفيديو>

📌  *أمثلة:*
  ${p}${cmd} https://www.tiktok.com/@user/video/123
  ${p}${cmd} https://youtu.be/dQw4w9WgXcQ

✅  *المنصات:*
  تيك توك، يوتيوب، فيسبوك، إنستغرام، تويتر/X
  بينتريست، ساوندكلاود، سبوتيفاي وكثر...
`.trim();

  // ── No args → show guide ──
  if (!args[0]) return m.reply(GUIDE_ML(usedPrefix, command))

  const url = args[0].trim()

  // ── Validate URL ──
  if (!url.startsWith('http')) {
    return m.reply(t(
      `❌ Please send a valid URL.\n\nExample:\n← ${usedPrefix}${command} https://www.tiktok.com/@user/video/123`,
      `❌ أرسل رابطاً صحيحاً.\n\nمثال:\n← ${usedPrefix}${command} https://www.tiktok.com/@user/video/123`,
      `❌ صيفط رابط صحيح أ عشيري.\n\nمثال:\n← ${usedPrefix}${command} https://www.tiktok.com/@user/video/123`
    ))
  }

  // ── Auto-detect platform ──
  const mode = detectMode(url)
  if (!mode) {
    return m.reply(t(
      `❌ Unsupported platform.\n\nSend *${usedPrefix}${command}* (without a link) to see all supported platforms.`,
      `❌ المنصة غير مدعومة.\n\nأرسل *${usedPrefix}${command}* (بدون رابط) لرؤية المنصات المدعومة.`,
      `❌ هاد المنصة ماخدمناها.\n\nصيفط *${usedPrefix}${command}* بلا رابط باش تشوف المنصات المدعومة.`
    ))
  }

  await m.reply(t(`⏳ Fetching media from *${mode}*... Please wait!`, `⏳ جارٍ جلب المحتوى من *${mode}*... انتظر!`, `⏳ كنجيبو الفيديو من *${mode}*، صبر شوية...`))

  // ── Fetch ──
  const client = new MeverClient()
  let data
  try {
    data = await client.run({ mode, url })
  } catch (e) {
    return m.reply(t(`❌ Failed to fetch media.\n\n_${e.message}_`, `❌ فشل جلب المحتوى.\n\n_${e.message}_`, `❌ ماجابش، وقع خطأ.\n\n_${e.message}_`))
  }

  if (!data) return m.reply(t('❌ The API returned no data. The link may be private or unsupported.', '❌ لم تُرجع واجهة البرمجة بيانات. قد يكون الرابط خاصاً أو غير مدعوم.', '❌ ماجابش أي معطيات. ربما الرابط خاص ولا ما دعمناهوش.'))

  // ── Extract media URL & title ──
  const mediaUrl = extractMediaUrl(data)
  const title    = extractTitle(data)

  if (!mediaUrl) {
    return m.reply(t(
      `❌ Could not find a download link in the API response.\n\nThis platform may require a different approach or the content is restricted.`,
      `❌ تعذر إيجاد رابط التحميل.\n\nقد يكون المحتوى محمياً أو غير مدعوم.`,
      `❌ مالقيناش رابط تحميل. ربما المحتوى خاص ولا محمي.`
    ))
  }

  // ── Determine media type ──
  const isAudio = ['soundcloud', 'spotify', 'applemusic'].includes(mode)
    || mediaUrl.includes('.mp3')
    || mediaUrl.includes('.m4a')

  const caption = t(`📥  *${title}*\n\n🔗  Platform: *${mode}*\n\n⚡ *bot amirni hamza*`, `📥  *${title}*\n\n🔗  المنصة: *${mode}*\n\n⚡ *bot amirni hamza*`, `📥  *${title}*\n\n🔗  المنصة: *${mode}*\n\n⚡ *bot amirni hamza*`)

  // ── Send media ──
  try {
    if (isAudio) {
      await conn.sendMessage(
        m.chat,
        { audio: { url: mediaUrl }, mimetype: 'audio/mp4', fileName: `${title}.mp3` },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        { video: { url: mediaUrl }, caption, mimetype: 'video/mp4' },
        { quoted: m }
      )
    }
    await m.react('✅')
  } catch (sendErr) {
    // fallback: send as document if video/audio send fails
    try {
      await conn.sendMessage(
        m.chat,
        {
          document: { url: mediaUrl },
          mimetype:  isAudio ? 'audio/mp4' : 'video/mp4',
          fileName:  `${title}.${isAudio ? 'mp3' : 'mp4'}`,
          caption,
        },
        { quoted: m }
      )
      await m.react('✅')
    } catch {
      await m.reply(
        t(
          `✅ Media found but could not be sent directly.\n\n📎 Direct link:\n${mediaUrl}\n\n📝 Title: ${title}`,
          `✅ تم العثور على المحتوى لكن تعذر إرساله.\n\n📎 الرابط المباشر:\n${mediaUrl}\n\n📝 العنوان: ${title}`,
          `✅ لقيناه الفيديو ولكن ماقدرناش نصيفطه.\n\n📎 الرابط المباشر:\n${mediaUrl}\n\n📝 العنوان: ${title}`
        )
      )
    }
  }
}

handler.help    = ['alldownload']
handler.command = /^(alldownload|alldl|download|dl|تحميل|تنزيل|هبط)$/i
handler.tags    = ['downloader']
handler.limit   = false
export default handler
