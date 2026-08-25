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

  // ── No args → show guide ──
  if (!args[0]) return m.reply(GUIDE(usedPrefix, command))

  const url = args[0].trim()

  // ── Validate URL ──
  if (!url.startsWith('http')) {
    return m.reply(
      `❌ Please send a valid URL.\n\nExample:\n  ${usedPrefix}${command} https://www.tiktok.com/@user/video/123`
    )
  }

  // ── Auto-detect platform ──
  const mode = detectMode(url)
  if (!mode) {
    return m.reply(
      `❌ Unsupported platform.\n\nSend *${usedPrefix}${command}* (without a link) to see all supported platforms.`
    )
  }

  await m.reply(`⏳ Fetching media from *${mode}*... Please wait!`)

  // ── Fetch ──
  const client = new MeverClient()
  let data
  try {
    data = await client.run({ mode, url })
  } catch (e) {
    return m.reply(`❌ Failed to fetch media.\n\n_${e.message}_`)
  }

  if (!data) return m.reply('❌ The API returned no data. The link may be private or unsupported.')

  // ── Extract media URL & title ──
  const mediaUrl = extractMediaUrl(data)
  const title    = extractTitle(data)

  if (!mediaUrl) {
    return m.reply(
      `❌ Could not find a download link in the API response.\n\n` +
      `This platform may require a different approach or the content is restricted.`
    )
  }

  // ── Determine media type ──
  const isAudio = ['soundcloud', 'spotify', 'applemusic'].includes(mode)
    || mediaUrl.includes('.mp3')
    || mediaUrl.includes('.m4a')

  const caption = `📥  *${title}*\n\n🔗  Platform : *${mode}*`

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
    } catch {
      await m.reply(
        `✅ Media found but could not be sent directly.\n\n📎 Direct link:\n${mediaUrl}\n\n📝 Title: ${title}`
      )
    }
  }
}

handler.help    = ['alldownload']
handler.command = /^(alldownload)$/i
handler.tags    = ['downloader']
handler.limit   = false
export default handler
