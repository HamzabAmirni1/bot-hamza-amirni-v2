/*
- YouTube MP3 Downloader Plugin
- Adapted from SoyMaycol's scraper to fit the bot's handler architecture
*/

import crypto from 'crypto'

const BASE_URL = 'https://embed.dlsrv.online'

class YTDL {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': BASE_URL,
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Priority': 'u=1,i'
    }
  }

  getVideoId(url) {
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/)
    if (!match) throw new Error('Invalid YouTube URL, could not extract video ID')
    return match[1]
  }

  sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex')
  }

  hmac(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest('hex')
  }

  buildFingerprint() {
    const d = {
      ua: this.headers['User-Agent'],
      lang: 'en-US',
      langs: 'en-US,en',
      screen: { w: 1920, h: 1080, cd: 24 },
      tzOffset: '-300',
      tz: 'America/New_York',
      hc: '12',
      dm: '8',
      chrome: 'true',
      canvasHash: '',
      webdriver: 'false',
      gpu: '',
      gpuVendor: ''
    }
    const fp = this.sha256([
      d.ua, d.lang, d.langs,
      `${d.screen.w}x${d.screen.h}x${d.screen.cd}`,
      d.tzOffset, d.tz, d.hc, d.dm, d.chrome, d.canvasHash
    ].join('|'))
    return { fp, d }
  }

  async solveChallenge(ch) {
    let n = 0n
    const prefix = '0'.repeat(ch.difficulty)
    while (!this.sha256(`${ch.salt}:${ch.ts}:${n}`).startsWith(prefix)) n++
    return n.toString()
  }

  async download(url) {
    const format = 'mp3'
    const quality = '320'
    const id = this.getVideoId(url)
    const headers = {
      ...this.headers,
      Referer: `${BASE_URL}/v1/full?videoId=${id}`
    }

    // Step 1: get the init token from the embed page
    const page = await (await fetch(`${BASE_URL}/v1/full?videoId=${id}`, { headers })).text()
    const tokenMatch = page.match(/data-token="([^"]+)"/)
    if (!tokenMatch) throw new Error('Failed to fetch init token, the service may be down')
    const initToken = tokenMatch[1]

    // Step 2: fetch a proof-of-work challenge
    const challenge = await (await fetch(`${BASE_URL}/api/challenge`, { method: 'POST', headers })).json()

    // Step 3: solve the challenge and verify
    const nonce = await this.solveChallenge(challenge)
    const { fp, d } = this.buildFingerprint()

    const verify = await (await fetch(`${BASE_URL}/api/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        initToken,
        fpHash: fp,
        fpDetails: d,
        salt: challenge.salt,
        ts: challenge.ts,
        signature: challenge.signature,
        nonce,
        telemetry: { interactions: 10, timeToVerify: 5000 }
      })
    })).json()

    if (!verify?.token) throw new Error('Verification failed, could not get access token')

    // Step 4: request the actual download link
    const ts = Date.now().toString()
    const sig = this.hmac(verify.token.slice(-32), `${ts}:${id}`)

    const result = await (await fetch(`${BASE_URL}/api/download/mp3`, {
      method: 'POST',
      headers: {
        ...headers,
        Authorization: `Bearer ${verify.token}`,
        'x-fp': fp,
        'x-ts': ts,
        'x-sig': sig
      },
      body: JSON.stringify({ videoId: id, format, quality })
    })).json()

    if (!result?.url) throw new Error('Failed to get download link from server')

    return { ...result, videoId: id, format, quality }
  }
}

const ytdl = new YTDL()

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

    const result = await ytdl.download(text.trim())

    await conn.sendMessage(m.chat, {
      audio: { url: result.url },
      mimetype: 'audio/mpeg',
      fileName: `${result.videoId}.mp3`,
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
