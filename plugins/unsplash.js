// PLUGINS: UNSPLASH || TYPE: ESM || NOTE: MAX 15 IMAGES || SOURCE: 𝐁𝐋𝐔𝐄 𝐒𝐊𝐘

// SCRAPE: https://whatsapp.com/channel/0029Vb2WECv9xVJaXVi46y2m/328

import axios from 'axios'
import * as cheerio from 'cheerio'

let handler = async (m, { conn, text, usedPrefix, command }) => {
    await conn.sendMessage(m.chat, {
        react: {
            text: '📷',
            key: m.key
        }
    })

    if (!text) return m.reply(`Example usage:\n${usedPrefix + command} sunset --5`)

    const match = text.match(/^(.*?)(?:\s+--?(\d+))?$/i)
    const query = match?.[1]?.trim()
    if (!query) return m.reply(`Please enter a search keyword\n\nExample:\n${usedPrefix + command} mountain --5`)

    if (!match?.[2]) return m.reply(`Please enter the number of images\n\nExample:\n${usedPrefix + command} landscape --5`)

    let limit = Math.min(parseInt(match[2]), 15)

    const result = await unsplashScraper(query)
    if (!result.length) return m.reply('No images found 🗿')

    for (let i = 0; i < Math.min(result.length, limit); i++) {
        let caption = `📷 *UNSPLASH SEARCH*\n`
        caption += `➤ Keyword : ${query}\n`
        caption += `➤ Image : ${i + 1} of ${limit}\n`

        await conn.sendFile(m.chat, result[i], 'unsplash.jpg', caption, m)
    }
}

handler.help = ['unsplash']
handler.tags = ['downloader']
handler.command = ['unsplash']
handler.limit = false 
export default handler

async function unsplashScraper(query) {
    const url = `https://unsplash.com/s/photos/${encodeURIComponent(query)}`
    const { data } = await axios.get(url)
    const $ = cheerio.load(data)
    const seen = new Set()
    const imageUrls = []

    $('img[src^="https://images.unsplash.com"]').each((_, el) => {
        const fullUrl = $(el).attr('src')
        if (fullUrl && fullUrl.includes('photo') && !fullUrl.includes('profile')) {
            const baseUrl = fullUrl.split('?')[0]
            if (!seen.has(baseUrl)) {
                seen.add(baseUrl)
                imageUrls.push(fullUrl)
            }
        }
    })

    return imageUrls.slice(0, 15)
}
