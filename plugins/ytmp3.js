import crypto from 'crypto'
import yts from 'yt-search'
import axios from 'axios'

class YTDL {
  constructor() {
    this.headers = {
      'X-Package-Name': 'com.dapascript.mever',
      'User-Agent':     'okhttp/4.11.0',
    }
  }

  getVideoId(url) {
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/)
    if (!match) throw new Error('Invalid YouTube URL')
    return match[1]
  }

  async download(url, type = 'audio') {
    const id = this.getVideoId(url)
    const apiType = type === 'video' ? 'mp4' : 'mp3'
    const endpoint = `https://mever.zeabur.app/api/youtube?url=https://www.youtube.com/watch?v=${id}&type=${apiType}`
    
    const res = await axios.get(endpoint, { headers: this.headers, timeout: 20000 })
    if (!res.data || !res.data.status) {
      throw new Error(res.data?.message || 'Failed to download from Mever API')
    }
    
    return {
      url: res.data.data.url,
      title: res.data.data.title || 'YouTube Download',
      thumbnail: res.data.data.thumbnail || '',
      duration: res.data.data.duration || 0,
      size: res.data.data.size || '0 MB',
      quality: res.data.data.quality || '320kbps'
    }
  }
}

const ytdl = new YTDL()

export async function ytdown(url, type = 'mp3') {
  const t = type === 'video' ? 'video' : 'audio';
  const id = ytdl.getVideoId(url);
  
  const search = await yts({ videoId: id });
  const info = {
    title: search.title || 'YouTube Video',
    thumbnail: search.image || search.thumbnail || '',
    duration: search.duration?.timestamp || search.duration?.seconds || 0,
    uploader: search.author?.name || 'YouTube',
    views: search.views || 0,
    publishDate: search.ago || '',
  };

  const result = await ytdl.download(url, t);
  return {
    download: result.url,
    url: result.url,
    videoId: id,
    info: {
      ...info,
      size: result.size
    }
  };
}

let handler = async (m, { conn, text }) => {
  if (!text) {
    const guide = `*『 YOUTUBE MP3 DOWNLOADER 』*

Download audio from YouTube straight into this chat.

*How to use:*
> .ytmp3 <YouTube URL>

*Example:*
> .ytmp3 https://youtu.be/iSctNMm1XdA

Supported link formats:
youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...`

    return conn.sendMessage(m.chat, { text: guide }, { quoted: m })
  }

  try {
    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const result = await ytdown(text.trim(), 'audio')

    await conn.sendMessage(m.chat, {
      audio: { url: result.url },
      mimetype: 'audio/mpeg',
      fileName: `${result.info.title}.mp3`,
      ptt: false
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await conn.sendMessage(m.chat, { text: `Failed to download: ${e.message}` }, { quoted: m })
  }
}

handler.help = handler.command = ['ytmp3']
handler.tags = ['downloader']
handler.limit = false

export default handler
