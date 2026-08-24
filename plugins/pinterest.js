import axios from 'axios';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';

// ============================================================
// Pinterest Search & Downloader Plugin
// Commands: .pinterest <query> / .pindl <url>
// ============================================================

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
    const { limit = 6, scope = "pins", bookmark = null } = options
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

// ============================================================
// HANDLER
// ============================================================
const handler = async (m, { conn, text, usedPrefix, command }) => {
    let user = global.db.data.users[m.sender] || {};
    let lang = user.language || 'darija';
    const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

    // ── 1. Search Pinterest (.pinterest) ─────────────────────
    if (/^pinterest$/i.test(command)) {
        if (!text) return m.reply(
            t(
                `📌 *Pinterest Search*\n\nSearch Pinterest and get interactive image cards!\n\n*Example:*\n▸ \`${usedPrefix}pinterest anime wallpaper\`\n▸ \`${usedPrefix}pinterest minimalist tattoo\`\n\n⚡ *bot amirni hamza*`,
                `📌 *البحث في بينتريست*\n\nابحث في Pinterest واحصل على كروت للصور والتحميل المباشر!\n\n*مثال:*\n▸\n← ${usedPrefix}pinterest anime wallpaper\n▸\n← ${usedPrefix}pinterest minimalist tattoo\n\n⚡ *bot amirni hamza*`,
                `📌 *البحث فـ بينتريست*\n\nقلب فـ Pinterest وحصل على تصاور ناضية وتحميل مباشر!\n\n*مثال:*\n▸\n← ${usedPrefix}pinterest anime wallpaper\n▸\n← ${usedPrefix}pinterest minimalist tattoo\n\n⚡ *bot amirni hamza*`
            )
        );

        const query = text.trim()
        await m.react('🔍');

        let data;
        try {
            data = await pinterestSearch(query, { limit: 6 })
        } catch (err) {
            await m.react('❌');
            return m.reply(t(`❌ Failed to connect to Pinterest: ${err.message}`, `❌ فشل الاتصال بـ Pinterest: ${err.message}`, `❌ ما قدرناش نتصلوا بـ Pinterest: ${err.message}`))
        }

        if (data.error || !data.results?.length) {
            await m.react('❌');
            return m.reply(t(`😕 No results found for *"${query}"*`, `😕 لم يتم العثور على نتائج لـ *"${query}"*`, `😕 مالقينا حتى نتيجة لـ *"${query}"*`))
        }

        const validResults = data.results.filter(p => p.image).slice(0, 5);

        for (let i = 0; i < validResults.length; i++) {
            const pin = validResults[i];
            const caption = t(
                `📌 *Pinterest Result (${i + 1}/${validResults.length})*\n━━━━━━━━━━━━━━━━━━━━━\n📝 *Title:* ${pin.title || 'Pinterest Image'}\n👤 *By:* ${pin.fullName || 'Pinterest'}\n🔗 *Link:* ${pin.pinUrl}\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
                `📌 *نتيجة Pinterest (${i + 1}/${validResults.length})*\n━━━━━━━━━━━━━━━━━━━━━\n📝 *العنوان:* ${pin.title || 'صورة Pinterest'}\n👤 *الناشر:* ${pin.fullName || 'Pinterest'}\n🔗 *الرابط:* ${pin.pinUrl}\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
                `📌 *نتيجة Pinterest (${i + 1}/${validResults.length})*\n━━━━━━━━━━━━━━━━━━━━━\n📝 *العنوان:* ${pin.title || 'صورة Pinterest'}\n👤 *الناشر:* ${pin.fullName || 'Pinterest'}\n🔗 *الرابط:* ${pin.pinUrl}\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
            );

            try {
                await conn.sendMessage(m.chat, {
                    image: { url: pin.image },
                    caption: caption
                }, { quoted: i === 0 ? m : undefined });
            } catch (err) {
                console.error('[Pinterest img send error]:', err.message);
            }
        }

        await m.react('✅');
    }

    // ── 2. Direct download image (.pindl) ─────────────────────
    if (/^pindl$/i.test(command)) {
        if (!text) return m.reply(t('Send image URL to download:\n← .pindl https://...', 'أرسل رابط الصورة للتحميل:\n← .pindl https://...', 'صيفط رابط الصورة باش تهبط:\n← .pindl https://...'));

        await m.react('⏳');

        try {
            await conn.sendMessage(m.chat, {
                image: { url: text.trim() },
                caption: t(`✅ *Image downloaded successfully*\n\n⚡ *bot amirni hamza*`, `✅ *تم تحميل الصورة بنجاح*\n\n⚡ *bot amirni hamza*`, `✅ *ها هي التصويرة هبطات بنجاح*\n\n⚡ *bot amirni hamza*`)
            }, { quoted: m });
            await m.react('✅');
        } catch (e) {
            await m.react('❌');
            console.error('[pindl] failed to send image:', e.message);
            m.reply(t('❌ Failed to download image: ' + e.message, '❌ فشل تحميل الصورة: ' + e.message, '❌ ما قدرناش ننزلوا الصورة: ' + e.message));
        }
    }
}

handler.help = ['pinterest <البحث>', 'pindl <الرابط>']
handler.tags = ['downloader']
handler.command = /^(pinterest|pindl)$/i
handler.limit = true

export default handler
