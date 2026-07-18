// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  📌 Pinterest Search Plugin — Silana Bot
//  Searches Pinterest for pins (images) by keyword
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function getSession() {
    const res = await fetch("https://id.pinterest.com/", {
        headers: {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
            "accept-language": "en-US,en;q=0.9"
        }
    })
    const raw = res.headers.getSetCookie?.() || []
    const cookies = raw.map(c => c.split(";")[0]).join("; ")
    const csrf = raw.find(c => c.startsWith("csrftoken="))?.match(/csrftoken=([^;]+)/)?.[1] || ""
    return { cookies, csrf }
}

async function pinterestSearch(query, options = {}) {
    const { limit = 5, scope = "pins", bookmark = null } = options
    const session = await getSession()

    const data = {
        options: {
            query,
            scope,
            page_size: limit,
            refine_search_with_filters: true,
            ...(bookmark ? { bookmarks: [bookmark] } : {})
        },
        context: {}
    }

    const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(query)}`
    const url = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(data))}&_=${Date.now()}`

    const res = await fetch(url, {
        headers: {
            "accept": "application/json, text/javascript, */*, q=0.01",
            "accept-language": "en-US,en;q=0.9",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
            "referer": `https://id.pinterest.com${sourceUrl}`,
            "x-requested-with": "XMLHttpRequest",
            "x-app-version": "6d51d5a",
            "x-pinterest-appstate": "active",
            "x-pinterest-pws-handler": "www/search/[scope].js",
            "x-pinterest-source-url": sourceUrl,
            ...(session.csrf ? { "x-csrftoken": session.csrf } : {}),
            ...(session.cookies ? { "cookie": session.cookies } : {})
        }
    })

    if (!res.ok) return { results: [], bookmark: null, error: `HTTP ${res.status}` }

    const json = await res.json().catch(() => null)
    const payload = json?.resource_response?.data
    if (!payload) return { results: [], bookmark: null, error: "no data" }

    const arr = Array.isArray(payload) ? payload : payload.results || []

    const mapPin = (pin) => ({
        title: pin.title || pin.grid_title || "",
        image: pin.images?.orig?.url || pin.images?.["736x"]?.url || null,
        video: pin.videos?.video_list?.V_HLSV4?.url
            || pin.videos?.video_list?.V_EXP7?.url
            || pin.videos?.video_list?.V_720P?.url
            || null,
        username: pin.pinner?.username || null,
        fullName: pin.pinner?.full_name || null,
        pinUrl: `https://id.pinterest.com/pin/${pin.id}/`
    })

    return {
        query,
        count: arr.length,
        bookmark: payload.bookmark || null,
        results: arr.filter(x => x?.id).map(mapPin)
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let handler = async (m, { conn, text, usedPrefix, command }) => {

    // ── Guide (no args) ──────────────────────────────────────
    if (!text) {
        const guide = `
╔══════════════════════════════╗
║   📌  *Pinterest Search*     ║
╚══════════════════════════════╝

*What is this?*
Search Pinterest directly from WhatsApp and get images or videos sent right here in the chat — no app needed!

*How to use:*
➤ ${usedPrefix}${command} <keyword>

*Examples:*
• ${usedPrefix}${command} logo design
• ${usedPrefix}${command} aesthetic room
• ${usedPrefix}${command} anime wallpaper
• ${usedPrefix}${command} minimalist tattoo

*What you get:*
🖼️ Up to 5 Pinterest images per search
📎 Direct link to each pin
👤 Creator username & name

*Notes:*
- Only images are sent (videos are linked)
- Results come from Pinterest's public search
- Each search may give different results`.trim()

        return conn.sendMessage(m.chat, { text: guide }, { quoted: m })
    }

    // ── Processing ───────────────────────────────────────────
    const query = text.trim()
    await conn.sendMessage(m.chat, {
        text: `🔍 Searching Pinterest for *"${query}"*...`
    }, { quoted: m })

    let data
    try {
        data = await pinterestSearch(query, { limit: 5 })
    } catch (err) {
        return conn.sendMessage(m.chat, {
            text: `❌ Failed to reach Pinterest.\n\nError: ${err.message}`
        }, { quoted: m })
    }

    if (data.error || !data.results?.length) {
        return conn.sendMessage(m.chat, {
            text: `😕 No results found for *"${query}"*.\n\nTry a different keyword.`
        }, { quoted: m })
    }

    // ── Send results ─────────────────────────────────────────
    await conn.sendMessage(m.chat, {
        text: `📌 Found *${data.count}* pins for *"${query}"*:`
    }, { quoted: m })

    for (let i = 0; i < data.results.length; i++) {
        const pin = data.results[i]

        const caption =
            `*📌 Pin ${i + 1}/${data.results.length}*\n` +
            (pin.title ? `📝 ${pin.title}\n` : "") +
            (pin.fullName ? `👤 ${pin.fullName}` + (pin.username ? ` (@${pin.username})` : "") + "\n" : "") +
            `🔗 ${pin.pinUrl}` +
            (pin.video ? `\n🎬 Video: ${pin.video}` : "")

        if (pin.image) {
            try {
                await conn.sendMessage(m.chat, {
                    image: { url: pin.image },
                    caption
                }, { quoted: m })
            } catch {
                // fallback to text if image fails to download
                await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
            }
        } else {
            await conn.sendMessage(m.chat, { text: caption }, { quoted: m })
        }
    }
}

handler.help = handler.command = ['pinterest']
handler.tags = ['downloader']
handler.limit = true

export default handler
