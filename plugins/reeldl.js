/*
 * Instagram Reels Downloader
 * Author: AhmadXyz
 * Base: downreels.com
 *
 * Features:
 * - Download Instagram Reels
 * - Supports Instagram Reel URLs
 * - Returns the downloadable video
 */

import axios from 'axios'

const API_URL = 'https://api.zoraahub.com/fetch.php'

async function scrape(url) {
  try {
    const res = await axios.post(
      API_URL,
      { url },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Mobile Safari/537.36',
          Referer:
            'https://downreels.com/instagram-video-downloader-free/',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        decompress: true,
        timeout: 30000
      }
    )

    const data = res.data

    return {
      status: data?.status || 'ok',
      thumbnail: data?.thumbnail || null,
      videos: Array.isArray(data?.videos)
        ? data.videos.map(v => ({
            quality: v.quality,
            url: v.url,
            isVideo: v.isVideo,
            thumb: v.thumb,
            index: v.index
          }))
        : []
    }
  } catch (error) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to fetch the Instagram Reel.'
    )
  }
}

let handler = async (m, { conn, text }) => {
  /*
   * GUIDE
   */
  if (!text?.trim()) {
    return m.reply(
      `╭─〔 Instagram Reels Downloader 〕\n` +
      `│\n` +
      `│ Download Instagram Reels directly\n` +
      `│ from WhatsApp using a Reel URL.\n` +
      `│\n` +
      `├─〔 Usage 〕\n` +
      `│\n` +
      `│ .reeldl <Instagram Reel URL>\n` +
      `│\n` +
      `├─〔 Example 〕\n` +
      `│\n` +
      `│ .reeldl https://www.instagram.com/reel/xxxxx/\n` +
      `│\n` +
      `├─〔 How it works 〕\n` +
      `│\n` +
      `│ 1. Copy the URL of an Instagram Reel.\n` +
      `│ 2. Send the URL after the command.\n` +
      `│ 3. The downloader retrieves the available video.\n` +
      `│ 4. The bot sends the Reel back to you.\n` +
      `│\n` +
      `├─〔 Notes 〕\n` +
      `│\n` +
      `│ • The Reel must be publicly accessible.\n` +
      `│ • Private Instagram posts may not work.\n` +
      `│ • Download availability depends on the\n` +
      `│   external downloader service.\n` +
      `│\n` +
      `╰────────────────────`
    )
  }

  const url = text.trim()

  /*
   * Validate Instagram URL
   */
  if (
    !/^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p)\//i.test(
      url
    )
  ) {
    return m.reply(
      `❌ Invalid Instagram URL.\n\n` +
      `Please provide a valid Instagram Reel URL.\n\n` +
      `Example:\n` +
      `.igdl https://www.instagram.com/reel/xxxxx/`
    )
  }

  await m.reply(
    `⏳ *Downloading Instagram Reel...*\n\n` +
    `Please wait while I process the video.`
  )

  try {
    const result = await scrape(url)

    if (
      !Array.isArray(result.videos) ||
      !result.videos.length
    ) {
      return m.reply(
        `❌ No downloadable video was found.\n\n` +
        `The Reel may be private, unavailable, or unsupported.`
      )
    }

    /*
     * Prefer actual video results
     */
    const videos = result.videos.filter(
      video =>
        video?.url &&
        video?.isVideo !== false
    )

    const selected =
      videos[0] || result.videos[0]

    if (!selected?.url) {
      return m.reply(
        `❌ The downloader returned no valid video URL.`
      )
    }

    /*
     * Send the Reel
     */
    await conn.sendFile(
      m.chat,
      selected.url,
      'instagram-reel.mp4',
      `✅ *Instagram Reel Downloaded*\n\n` +
        `• Quality: ${selected.quality || 'Unknown'}\n` +
        `• Source: Instagram`,
      m
    )
  } catch (error) {
    console.error(
      'Instagram Reel Downloader:',
      error
    )

    return m.reply(
      `❌ *Download Failed*\n\n` +
      `${error?.message || 'An unexpected error occurred.'}`
    )
  }
}

handler.help = ['reeldl']
handler.command = ['reeldl']
handler.tags = ['downloader']
export default handler
