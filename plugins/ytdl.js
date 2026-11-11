// scrape by hannuniverse

import axios from 'axios'
import { downloadYouTube } from '../lib/ytdl.js'

/* ================= HELPERS ================= */

function cleanFileName(text) {
  return text
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sendGuide(m) {
  return m.reply(`
📥 *YouTube Downloader*

Download YouTube videos directly.

📌 *Usage*
.ytdl <youtube_url> [quality]

🎥 *Video qualities*
144, 240, 320, 480, 720, 1080

⭐ *Default quality*
720p (if not specified)

🧪 *Examples*
.ytdl https://youtu.be/9zvdMLfYFkM
.ytdl https://youtu.be/9zvdMLfYFkM 480
.ytdl https://youtube.com/watch?v=9zvdMLfYFkM 1080

⚡ *bot amirni hamza*
`.trim())
}

/* ================= HANDLER ================= */

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) return sendGuide(m)

  const url = args[0]
  const quality = (args[1] || '720').replace(/p$/i, '')

  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return sendGuide(m)
  }

  await m.react('⏳')

  try {
    const data = await downloadYouTube(url, 'mp4', quality)

    if (!data?.download) {
      await m.react('❌')
      throw '❌ تعذر تحميل الفيديو. جرب جودة أخرى أو رابط آخر.'
    }

    // Try sending as streaming video first
    const fs = await import('fs');
    const isLocal = data.isLocalFile || (typeof data.download === 'string' && fs.existsSync(data.download));
    const vidTarget = isLocal ? fs.readFileSync(data.download) : { url: data.download };

    try {
      await conn.sendMessage(
        m.chat,
        {
          video: vidTarget,
          mimetype: 'video/mp4',
          fileName: `${cleanFileName(data.title || 'video')}.mp4`,
          caption: `🎬 *${data.title || 'YouTube Video'}*\n📺 *الجودة:* ${data.quality || quality}p\n\n⚡ *bot amirni hamza*`
        },
        { quoted: m }
      )
      if (isLocal) { try { fs.unlinkSync(data.download); } catch (_) {} }
    } catch (_) {
      // Fallback: document mode (clean download)
      const head = !isLocal ? await axios.head(data.download, { timeout: 10000 }).catch(() => null) : null;
      const sizeMB = isLocal ? (vidTarget.length / (1024 * 1024)) : (Number(head?.headers?.['content-length'] || 0) / (1024 * 1024));

      if (sizeMB > 95) {
        return conn.reply(
          m.chat,
          `⚠️ حجم الفيديو كبير على الواتساب (${sizeMB.toFixed(1)} MB)\n\n🔗 *رابط التحميل المباشر:*\n${data.download}`,
          m
        )
      }

      await conn.sendMessage(
        m.chat,
        {
          document: vidTarget,
          mimetype: 'video/mp4',
          fileName: `${cleanFileName(data.title || 'video')}.mp4`
        },
        { quoted: m }
      )
      if (isLocal) { try { fs.unlinkSync(data.download); } catch (_) {} }
    }

    await m.react('✅')
  } catch (err) {
    console.error('[ytdl error]:', err?.message || err)
    await m.react('❌')
    m.reply(`❌ فشل تحميل الفيديو: ${err?.message || err}`)
  }
}

handler.help = ['ytdl <url> [quality]']
handler.tags = ['downloader']
handler.command = /^(ytdl)$/i
handler.limit = false

export default handler
