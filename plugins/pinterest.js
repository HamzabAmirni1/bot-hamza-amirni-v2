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

        async function createHeaderImage(url) {
            try {
                const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
                const { imageMessage } = await generateWAMessageContent({ image: Buffer.from(res.data) }, { upload: conn.waUploadToServer });
                return imageMessage;
            } catch (_) {
                try {
                    const fallbackUrl = `https://ui-avatars.com/api/?name=Pinterest&background=E60023&color=FFFFFF&size=200`;
                    const fallbackRes = await axios.get(fallbackUrl, { responseType: 'arraybuffer', timeout: 3000 });
                    const { imageMessage } = await generateWAMessageContent({ image: Buffer.from(fallbackRes.data) }, { upload: conn.waUploadToServer });
                    return imageMessage;
                } catch (__) {
                    return null;
                }
            }
        }

        let cards = [];
        for (let i = 0; i < data.results.length; i++) {
            const pin = data.results[i];
            if (!pin.image) continue;

            const imageMessage = await createHeaderImage(pin.image);

            const buttons = [
                {
                    "name": "quick_reply",
                    "buttonParamsJson": JSON.stringify({ display_text: t("📥 Download Image", "📥 تحميل الصورة", "📥 تحميل الصورة"), id: `.pindl ${pin.image}` })
                },
                {
                    "name": "cta_url",
                    "buttonParamsJson": JSON.stringify({ display_text: t("🔗 Open on Pinterest", "🔗 فتح على Pinterest", "🔗 فتح فـ Pinterest"), url: pin.pinUrl })
                }
            ];

            const cardTitle = t(`Image ${i + 1}/${data.results.length}`, `صورة ${i + 1}/${data.results.length}`, `صورة ${i + 1}/${data.results.length}`);
            const cardBody = t(`📝 ${pin.title || 'Creative Pin'}\n👤 By: ${pin.fullName || 'Pinterest'}`, `📝 ${pin.title || 'تصميم مميز'}\n👤 الناشر: ${pin.fullName || 'Pinterest'}`, `📝 ${pin.title || 'تصميم ناضي'}\n👤 الناشر: ${pin.fullName || 'Pinterest'}`);

            cards.push({
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: cardBody }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                    title: cardTitle,
                    hasMediaAttachment: !!imageMessage,
                    ...(imageMessage ? { imageMessage } : {})
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                    buttons
                })
            });
        }

        const carouselBodyText = t(`📌 Pinterest results for: *${query}*`, `📌 نتائج البحث في Pinterest عن: *${query}*`, `📌 نتائج البحث فـ Pinterest عن: *${query}*`);

        const botMsg = generateWAMessageFromContent(m.chat, {
            interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                body: proto.Message.InteractiveMessage.Body.create({ text: carouselBodyText }),
                footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirni hamza' }),
                carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
            })
        }, { quoted: m, userJid: conn.user?.jid || conn.decodeJid(conn.user?.id) });

        await conn.relayMessage(m.chat, botMsg.message, { messageId: botMsg.key.id });
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
