// apk.js — APK search/downloader plugin
// Adapted from a standalone Node.js CLI scraper (espacioapk.com) into a
// Baileys-style WhatsApp bot command. All interactive CLI parts (readline,
// arrow-key menus, ANSI colors) were removed since a WhatsApp chat can't
// render those — they're replaced with subcommands the user types as text.
// thnx lannreal
import https from 'https'
import http from 'http'
import { URL } from 'url'

const BASE_URL = 'https://espacioapk.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ---------- low-level fetch ----------

function fetchHtml(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl)
    const client = parsed.protocol === 'http:' ? http : https
    const req = client.get(
      targetUrl,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,id;q=0.8'
        }
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, targetUrl).toString()
          return resolve(fetchHtml(redirectUrl))
        }
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => resolve(body))
      }
    )
    req.on('error', (err) => reject(err))
    req.setTimeout(25000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

function cleanHtml(text) {
  if (!text) return ''
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8217;/g, '’')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&#8230;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------- scraping (unchanged logic from the CLI version) ----------

async function getMenuStructure() {
  const html = await fetchHtml(`${BASE_URL}/`)
  const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i)
  if (!navMatch) return []

  const navHtml = navMatch[1]
  const categoryMap = new Map()
  const topRegex = /<li[^>]*class="[^"]*menu-item-has-children[^"]*"[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<ul[^>]*class="[^"]*sub-menu[^"]*"[^>]*>([\s\S]*?)<\/ul>\s*<\/li>/gi
  let match
  while ((match = topRegex.exec(navHtml)) !== null) {
    const parentUrl = match[1]
    const parentTitle = cleanHtml(match[2])
    const subUlHtml = match[3]
    const subMenus = []
    const subRegex = /<li[^>]*class="[^"]*menu-item[^"]*"[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
    let subMatch
    while ((subMatch = subRegex.exec(subUlHtml)) !== null) {
      const subUrl = subMatch[1]
      subMenus.push({
        name: cleanHtml(subMatch[2]),
        slug: subUrl.replace(/\/+$/, '').split('/').pop(),
        url: subUrl
      })
    }
    categoryMap.set(parentUrl, {
      title: parentTitle,
      slug: parentUrl.replace(/\/+$/, '').split('/').pop(),
      url: parentUrl,
      sub_menus: subMenus
    })
  }

  const standRegex = /<li[^>]*class="[^"]*menu-item(?![^"]*menu-item-has-children)[^"]*"[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/li>/gi
  while ((match = standRegex.exec(navHtml)) !== null) {
    const url = match[1]
    const title = cleanHtml(match[2])
    let isChild = false
    for (const parent of categoryMap.values()) {
      if (parent.sub_menus.some((sm) => sm.url === url)) { isChild = true; break }
    }
    if (!isChild && url.includes('espacioapk.com') && !url.includes('dmca') && !categoryMap.has(url)) {
      categoryMap.set(url, { title, slug: url.replace(/\/+$/, '').split('/').pop(), url, sub_menus: [] })
    }
  }

  return Array.from(categoryMap.values())
}

function parseCardItems(html) {
  const items = []
  const cardBlockRegex = /<div class="bav\s+bav1">([\s\S]*?)(?=<div class="bav\s+bav1"|\s*$|<nav|<\/section|<\/main)/gi
  let blockMatch
  while ((blockMatch = cardBlockRegex.exec(html)) !== null) {
    const block = blockMatch[1]
    const linkMatch = block.match(/<a\s+href="([^"]+)"[^>]*title="([^"]*)"[^>]*>/i)
    if (!linkMatch) continue

    const url = linkMatch[1]
    let title = cleanHtml(linkMatch[2])
    if (!url.startsWith(BASE_URL) || ['/juegos/', '/aplicaciones/', '/tag/', '/category/', '/dev/', '/page/', '/dmca/'].some((x) => url.includes(x))) continue

    if (!title) {
      const titleSpanMatch = block.match(/<span class="title">([\s\S]*?)<\/span>/i)
      if (titleSpanMatch) title = cleanHtml(titleSpanMatch[1])
    }

    let version = ''
    const verMatch = block.match(/<span class="version">\s*(?:<span>)?([^<]+)(?:<\/span>)?\s*<\/span>/i)
    if (verMatch) version = cleanHtml(verMatch[1])

    let developer = ''
    const devMatch = block.match(/<span class="developer">([\s\S]*?)<\/span>/i)
    if (devMatch) developer = cleanHtml(devMatch[1])

    let updated = ''
    const dateMatch = block.match(/<span class="app-date">([\s\S]*?)<\/span>/i)
    if (dateMatch) updated = cleanHtml(dateMatch[1])

    let rating = ''
    const starMatch = block.match(/<span class="stars"\s+style="width:([^%"]+)%"/i)
    if (starMatch) {
      const pct = parseFloat(starMatch[1])
      if (!isNaN(pct)) rating = (pct / 20).toFixed(1)
    }

    let image = ''
    const imgMatch = block.match(/<img[^>]+(?:src|data-src)="([^"]+)"/i)
    if (imgMatch) {
      const rawImg = imgMatch[1]
      if (rawImg.startsWith('data:image/svg') || rawImg.includes('data:image/gif')) {
        const srcsetMatch = block.match(/srcset="([^"]+)"/i)
        if (srcsetMatch) {
          const sources = srcsetMatch[1].split(',').map((s) => s.trim().split(' ')[0])
          image = sources[sources.length - 1] || sources[0] || ''
        } else image = rawImg
      } else image = rawImg
    }

    const slug = url.replace(/\/+$/, '').split('/').pop()
    if (!items.some((i) => i.url === url)) {
      items.push({
        title, slug,
        version: version || 'Latest',
        developer: developer || 'N/A',
        updated: updated || 'N/A',
        rating: rating || 'N/A',
        url, image
      })
    }
  }
  return items
}

async function getLatestUpdates(page = 1) {
  const url = page > 1 ? `${BASE_URL}/page/${page}/` : `${BASE_URL}/`
  const html = await fetchHtml(url)
  return parseCardItems(html)
}

async function listCategory(categorySlugOrUrl, page = 1) {
  let targetUrl = categorySlugOrUrl
  if (!targetUrl.startsWith('http')) {
    const slug = categorySlugOrUrl.replace(/^\/+|\/+$/g, '')
    targetUrl = `${BASE_URL}/${slug}/`
  }
  if (!targetUrl.endsWith('/')) targetUrl += '/'
  if (page > 1) targetUrl = `${targetUrl}page/${page}/`
  const html = await fetchHtml(targetUrl)
  return parseCardItems(html)
}

async function searchApk(query, page = 1) {
  const encQuery = encodeURIComponent(query)
  const targetUrl = page > 1 ? `${BASE_URL}/page/${page}/?s=${encQuery}` : `${BASE_URL}/?s=${encQuery}`
  const html = await fetchHtml(targetUrl)
  return parseCardItems(html)
}

async function scrapeDetail(slugOrUrl) {
  let url = slugOrUrl
  if (!url.startsWith('http')) url = `${BASE_URL}/${slugOrUrl.replace(/^\/+|\/+$/g, '')}/`
  if (!url.endsWith('/')) url += '/'

  const html = await fetchHtml(url)

  let appData = {}
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">(\{.*?"@type":"SoftwareApplication".*?\})<\/script>/is)
  if (jsonLdMatch) { try { appData = JSON.parse(jsonLdMatch[1]) } catch (_) {} }

  const metaInfo = {}
  const fieldRegex = /<div class="da-s"><b>([^<]+)<\/b><br>(.*?)<\/div>/gis
  let fMatch
  while ((fMatch = fieldRegex.exec(html)) !== null) metaInfo[cleanHtml(fMatch[1])] = cleanHtml(fMatch[2])

  let categoryName = ''
  const catMatch = html.match(/<a\s+href="https:\/\/espacioapk\.com\/(?:juegos|aplicaciones)\/[^"]+"[^>]*rel="category tag"[^>]*>([^<]+)<\/a>/i)
  if (catMatch) categoryName = cleanHtml(catMatch[1])
  else {
    const genericCatMatch = html.match(/<a\s+href="https:\/\/espacioapk\.com\/(?:juegos|aplicaciones)\/([^"/]+)\/"[^>]*>([^<]+)<\/a>/i)
    if (genericCatMatch) categoryName = cleanHtml(genericCatMatch[2])
  }

  let description = ''
  const descMatch = html.match(/<div class="entry desent">[\s\S]*?<div class="entry-limit">([\s\S]*?)<\/div>\s*<\/div>/i)
  if (descMatch) description = cleanHtml(descMatch[1])

  const downloadPageUrl = `${url}download/`
  const dlLinks = []
  try {
    const dlHtml = await fetchHtml(downloadPageUrl)
    const dlRegex = /<a\s+href="([^"]+)"[^>]*class="[^"]*(?:buttond|downloadAPK|dapk_b)[^"]*"[^>]*>/gi
    let dlMatch
    while ((dlMatch = dlRegex.exec(dlHtml)) !== null) {
      const link = dlMatch[1].trim()
      if (!dlLinks.includes(link) && !link.endsWith('/download/') && link.replace(/\/+$/, '') !== url.replace(/\/+$/, '')) dlLinks.push(link)
    }
    if (dlLinks.length === 0) {
      const cloudRegex = /<a\s+href="([^"]+(?:mediafire\.com|drive\.google\.com|mega\.nz)[^"]*)"/gi
      while ((dlMatch = cloudRegex.exec(dlHtml)) !== null) {
        const link = dlMatch[1].trim()
        if (!dlLinks.includes(link)) dlLinks.push(link)
      }
    }
  } catch (_) {}
  if (dlLinks.length === 0) dlLinks.push(downloadPageUrl)

  let ratingVal = ''
  if (appData.aggregateRating && appData.aggregateRating.ratingValue) ratingVal = String(appData.aggregateRating.ratingValue)
  else {
    const starMatch = html.match(/<span class="stars"\s+style="width:([^%"]+)%"/i)
    if (starMatch) {
      const pct = parseFloat(starMatch[1])
      if (!isNaN(pct)) ratingVal = (pct / 20).toFixed(1)
    }
  }

  return {
    title: cleanHtml(appData.name || metaInfo['Nombre del paquete'] || slugOrUrl.replace(/^\/+|\/+$/g, '').split('/').pop()),
    slug: slugOrUrl.replace(/^\/+|\/+$/g, '').split('/').pop(),
    category: categoryName || (url.includes('/juegos/') ? 'Juegos' : 'Aplicaciones'),
    version: appData.softwareVersion || metaInfo['Versión'] || 'Latest',
    developer: metaInfo['Desarrollador'] || 'N/A',
    updated: metaInfo['Actualización'] || 'N/A',
    size: metaInfo['Tamaño'] || 'N/A',
    requirements: metaInfo['Requerimientos'] || 'Android',
    rating: ratingVal || 'N/A',
    image: appData.image || `${BASE_URL}/favicon.ico`,
    download_links: dlLinks,
    description: description || 'No description available.',
    screenshots: Array.isArray(appData.screenshot) ? appData.screenshot.map((s) => s.url).filter(Boolean) : []
  }
}

// ---------- WhatsApp text formatting ----------

function formatList(items, title) {
  if (!items.length) return `❌ No results found for *${title}*.`
  const shown = items.slice(0, 15)
  let text = `📦 *${title}*\n\n`
  shown.forEach((it, i) => {
    text += `*${i + 1}.* ${it.title}\n`
    text += `    Version: ${it.version} • ⭐ ${it.rating}\n`
    text += `    Slug: \`${it.slug}\`\n\n`
  })
  if (items.length > shown.length) text += `_...and ${items.length - shown.length} more._\n\n`
  text += `_Use *.apk get <slug>* to see full details and download links._`
  return text
}

function formatDetail(d) {
  let text = `📱 *${d.title}*\n\n`
  text += `🏷️ Category: ${d.category}\n`
  text += `🔖 Version: ${d.version}\n`
  text += `👤 Developer: ${d.developer}\n`
  text += `📅 Updated: ${d.updated}\n`
  text += `💾 Size: ${d.size}\n`
  text += `📋 Requires: ${d.requirements}\n`
  text += `⭐ Rating: ${d.rating}\n\n`
  if (d.description) {
    const desc = d.description.length > 280 ? d.description.slice(0, 280) + '...' : d.description
    text += `📝 ${desc}\n\n`
  }
  text += `⬇️ *Download:*\n`
  d.download_links.slice(0, 5).forEach((l, i) => { text += `${i + 1}. ${l}\n` })
  text += `\n_⚠️ This link comes from a third-party site, not an official store. Scan the file before installing._`
  return text
}

function formatMenu(categories) {
  let text = `📂 *APK Categories*\n\n`
  categories.forEach((c) => {
    text += `*${c.title}* (\`${c.slug}\`)\n`
    c.sub_menus.slice(0, 8).forEach((sm) => { text += `   • ${sm.name} → \`${c.slug}/${sm.slug}\`\n` })
    text += '\n'
  })
  text += `_Use *.apk category <slug>* to browse one._`
  return text.trim()
}

function helpText(usedPrefix, command) {
  const p = usedPrefix + command
  return `📲 *APK Search — Guide*

This command searches and pulls APK download info (games and apps) from a third-party APK mirror site. It does not host or check the files itself — always verify a download before installing it.

*Commands:*
• *${p} search <name>* — search by app/game name
   e.g. \`${p} search minecraft\`
• *${p} latest [page]* — latest updates on the site
   e.g. \`${p} latest 2\`
• *${p} menu* — list available categories
• *${p} category <slug> [page]* — browse a category
   e.g. \`${p} category juegos/accion\`
• *${p} get <slug>* — full details + download links for one app
   e.g. \`${p} get some-app-slug\`

Tip: run a search or "latest" first — each result shows a *slug* you then pass to *${p} get*.`
}

// ---------- handler ----------

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const sub = (args[0] || '').toLowerCase()

  try {
    if (!sub || sub === 'help') {
      return m.reply(helpText(usedPrefix, command))
    }

    if (sub === 'latest') {
      const page = parseInt(args[1]) || 1
      const items = await getLatestUpdates(page)
      return m.reply(formatList(items, `Latest APKs (page ${page})`))
    }

    if (sub === 'search') {
      const query = args.slice(1).join(' ')
      if (!query) return m.reply(`❌ Please provide a search term.\nExample: *${usedPrefix}${command} search minecraft*`)
      const items = await searchApk(query)
      return m.reply(formatList(items, `Search: "${query}"`))
    }

    if (sub === 'menu') {
      const categories = await getMenuStructure()
      if (!categories.length) return m.reply('❌ Could not load categories right now.')
      return m.reply(formatMenu(categories))
    }

    if (sub === 'category') {
      const slug = args[1]
      if (!slug) return m.reply(`❌ Please provide a category slug.\nExample: *${usedPrefix}${command} category juegos/accion*\nUse *${usedPrefix}${command} menu* to see valid slugs.`)
      const page = parseInt(args[2]) || 1
      const items = await listCategory(slug, page)
      return m.reply(formatList(items, `Category: ${slug} (page ${page})`))
    }

    if (sub === 'get') {
      const slug = args[1]
      if (!slug) return m.reply(`❌ Please provide an APK slug or URL.\nExample: *${usedPrefix}${command} get some-app-slug*`)
      const detail = await scrapeDetail(slug)
      return m.reply(formatDetail(detail))
    }

    return m.reply(helpText(usedPrefix, command))
  } catch (err) {
    return m.reply(`⚠️ Error: ${err.message}`)
  }
}

handler.help = ['espacio-apk']
handler.command = ['espacio-apk']
handler.tags = ['downloader']
handler.limit = false

export default handler
