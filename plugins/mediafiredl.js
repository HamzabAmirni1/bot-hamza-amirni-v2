// plugin by instagram.com/noureddine_ouafy
// scrape by Codeverse

import axios from 'axios'
import * as cheerio from 'cheerio'

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.mediafire.com/',
  'Upgrade-Insecure-Requests': '1'
}

async function mediafireDl(url) {
  const res = await axios.get(url, { headers, maxRedirects: 5 })
  const $ = cheerio.load(res.data)

  const download = $('#download_link > a.input.popsok').attr('href') || null
  const filename = $('.dl-btn-label').first().text().trim() || 'file'
  const filesize = $('#download_link > a.input.popsok')
    .text()
    .match(/\(([^)]+)\)/)?.[1] || null

  if (!download) throw 'Download link not found.'

  return { filename, filesize, download }
}

let handler = async (m, { conn, text }) => {
  if (!text) throw `Please provide a MediaFire link.\n\nExample:\n.mediafiredl https://www.mediafire.com/file/zcx5dbv0pi7x7m0/Hoshino+Assistant+V1.0+Fix.zip/file?dkey=28z1j00mngh&r=61`

  if (!text.includes('mediafire.com'))
    throw 'Invalid link. Please provide a valid MediaFire URL.'

  try {
    await m.reply('Fetching file from MediaFire...')

    const data = await mediafireDl(text)

    // File size protection: max 300MB
    const sizeMatch = data.filesize?.match(/([\d.]+)\s*(KB|MB|GB)/i)
    if (sizeMatch) {
      const size = parseFloat(sizeMatch[1])
      const unit = sizeMatch[2].toUpperCase()

      let sizeMB = size
      if (unit === 'KB') sizeMB = size / 1024
      if (unit === 'GB') sizeMB = size * 1024

      if (sizeMB > 300) {
        await m.react('❌');
        return conn.reply(
          m.chat,
          `📦 *${data.filename}*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `⚖️ *الحجم:* ${data.filesize}\n` +
          `⚠️ *الملف أكبر من 300MB ولا يمكن إرساله عبر واتساب.*\n\n` +
          `🔗 *رابط التحميل المباشر:*\n${data.download}\n\n` +
          `⚡ *bot amirni hamza*`,
          m
        );
      }
    }

    // Download file as buffer
    const fileRes = await axios.get(data.download, {
      responseType: 'arraybuffer',
      headers
    })

    const buffer = Buffer.from(fileRes.data)

    await conn.sendMessage(
      m.chat,
      {
        document: buffer,
        fileName: data.filename,
        mimetype: fileRes.headers['content-type'] || 'application/octet-stream',
        caption: `📦 ${data.filename}\n📊 Size: ${data.filesize || 'Unknown'}`
      },
      { quoted: m }
    )

  } catch (err) {
    throw `Failed to download file.\nError: ${err}`
  }
}

handler.help = ['mediafiredl']
handler.command = ['mediafiredl']
handler.tags = ['downloader']
handler.limit = false 

export default handler
