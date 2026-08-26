/*
  Instagram Downloader from hamza-chatbot-main
  Direct Instagram GraphQL scraper + Snapsave Unpacker + Multi-engine Fallback
*/

import axios from 'axios';
import * as cheerio from 'cheerio';
import qs from 'qs';

const HEADERS = {
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/x-www-form-urlencoded",
    "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
    "X-CSRFToken": "RVDUooU5MYsBbS1CNN3CzVAuEP8oHB52",
    "X-IG-App-ID": "1217981644879628",
    "X-FB-LSD": "AVqbxe3J_YA",
    "X-ASBD-ID": "129477",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36",
};

function getInstagramPostId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|tv|stories|reel)\/([^/?#&]+).*/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function encodeGraphqlRequestData(shortcode) {
    const requestData = {
        av: "0", __d: "www", __user: "0", __a: "1", __req: "3",
        __hs: "19624.HYP:instagram_web_pkg.2.1..0.0", dpr: "3", __ccg: "UNKNOWN",
        __rev: "1008824440", __s: "xf44ne:zhh75g:xr51e7", __hsi: "7282217488877343271",
        __dyn: "7xeUmwlEnwn8K2WnFw9-2i5U4e0yoW3q32360CEbo1nEhw2nVE4W0om78b87C0yE5ufz81s8hwGwQwoEcE7O2l0Fwqo31w9a9x-0z8-U2zxe2GewGwso88cobEaU2eUlwhEe87q7-0iK2S3qazo7u1xwIw8O321LwTwKG1pg661pwr86C1mwraCg",
        __csr: "gZ3yFmJkillQvV6ybimnG8AmhqujGbLADgjyEOWz49z9XDlAXBJpC7Wy-vQTSvUGWGh5u8KibG44dBiigrgjDxGjU0150Q0848azk48N09C02IR0go4SaR70r8owyg9pU0V23hwiA0LQczA48S0f-x-27o05NG0fkw",
        __comet_req: "7", lsd: "AVqbxe3J_YA", jazoest: "2957", __spin_r: "1008824440",
        __spin_b: "trunk", __spin_t: "1695523385", fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
        variables: JSON.stringify({
            shortcode: shortcode, fetch_comment_count: null, fetch_related_profile_media_count: null,
            parent_comment_count: null, child_comment_count: null, fetch_like_count: null,
            fetch_tagged_user_count: null, fetch_preview_comment_count: null, has_threaded_comments: false,
            hoisted_comment_id: null, hoisted_reply_id: null,
        }),
        server_timestamps: "true", doc_id: "10015901848480474",
    };
    return qs.stringify(requestData);
}

const getDownloadLinks = (url) => {
    return new Promise(async (resolve, reject) => {
        try {
            function decodeData(data) {
                let [part1, part2, part3, part4, part5, part6] = data;
                function decodeSegment(segment, base, length) {
                    const charSet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split("");
                    let baseSet = charSet.slice(0, base);
                    let decodeSet = charSet.slice(0, length);
                    let decodedValue = segment.split("").reverse().reduce((accum, char, index) => {
                        if (baseSet.indexOf(char) !== -1) return accum += baseSet.indexOf(char) * Math.pow(base, index);
                    }, 0);
                    let result = "";
                    while (decodedValue > 0) {
                        result = decodeSet[decodedValue % length] + result;
                        decodedValue = Math.floor(decodedValue / length);
                    }
                    return result || "0";
                }
                part6 = "";
                for (let i = 0, len = part1.length; i < len; i++) {
                    let segment = "";
                    while (part1[i] !== part3[part5]) { segment += part1[i]; i++; }
                    for (let j = 0; j < part3.length; j++) segment = segment.replace(new RegExp(part3[j], "g"), j.toString());
                    part6 += String.fromCharCode(decodeSegment(segment, part5, 10) - part4);
                }
                return decodeURIComponent(encodeURIComponent(part6));
            }
            function extractParams(data) { return data.split("decodeURIComponent(escape(r))}(")[1].split("))")[0].split(",").map(item => item.replace(/"/g, "").trim()); }
            function extractDownloadUrl(data) { return data.split("getElementById(\"download-section\").innerHTML = \"")[1].split("\"; document.getElementById(\"inputData\").remove(); ")[0].replace(/\\(\\)?/g, ""); }
            function getVideoUrl(data) { return extractDownloadUrl(decodeData(extractParams(data))); }

            const response = await axios.post("https://snapsave.app/action.php?lang=id", "url=" + url, {
                headers: {
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "content-type": "application/x-www-form-urlencoded",
                    origin: "https://snapsave.app", referer: "https://snapsave.app/id",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/103.0.0.0 Safari/537.36"
                },
                timeout: 20000
            });

            const data = response.data;
            const videoPageContent = getVideoUrl(data);
            const $ = cheerio.load(videoPageContent);
            const downloadLinks = [];

            $("div.download-items__thumb").each((index, item) => {
                $("div.download-items__btn").each((btnIndex, button) => {
                    let downloadUrl = $(button).find("a").attr("href");
                    if (!/https?:\/\//.test(downloadUrl || "")) downloadUrl = "https://snapsave.app" + downloadUrl;
                    downloadLinks.push(downloadUrl);
                });
            });

            if (!downloadLinks.length) return reject({ msg: "No data found" });
            return resolve({ url: downloadLinks, metadata: { url: url } });
        } catch (error) {
            return reject({ msg: error.message });
        }
    });
};

async function igScraper(url) {
    let result = null;
    try {
        const postId = getInstagramPostId(url);
        if (!postId) throw new Error("Invalid Instagram URL");
        const data = await axios.post("https://www.instagram.com/api/graphql", encodeGraphqlRequestData(postId), { headers: HEADERS, timeout: 15000 });
        const mediaData = data.data?.xdt_shortcode_media;
        
        if (mediaData) {
            const getUrlFromData = (d) => {
                if (d.edge_sidecar_to_children) return d.edge_sidecar_to_children.edges.map((edge) => edge.node.video_url || edge.node.display_url);
                return d.video_url ? [d.video_url] : [d.display_url];
            };

            result = {
                url: getUrlFromData(mediaData),
                metadata: {
                    caption: mediaData.edge_media_to_caption?.edges?.[0]?.node?.text || "",
                    username: mediaData.owner?.username,
                    isVideo: mediaData.is_video,
                }
            };
        }
    } catch (_) {}

    if (!result || !result.url || !result.url.length) {
        try {
            result = await getDownloadLinks(url);
        } catch (_) {}
    }

    // Fallback to Mever
    if (!result || !result.url || !result.url.length) {
        try {
            const res = await axios.get('https://mever.zeabur.app/api/ig', {
                params: { url, quality: '720p', type: 'video' },
                headers: { 'X-Package-Name': 'com.dapascript.mever', 'User-Agent': 'okhttp/4.11.0' },
                timeout: 20000
            });
            const d = res.data?.data || res.data;
            if (d?.url || d?.download_url || d?.video_url) {
                result = { url: [d.url || d.download_url || d.video_url] };
            } else if (Array.isArray(d?.medias) && d.medias.length > 0) {
                result = { url: d.medias.map(m => m.url || m.download_url).filter(Boolean) };
            }
        } catch (_) {}
    }

    return result;
}

let handler = async (m, { conn, args, text, command, usedPrefix }) => {
    const rawInput = (text || args[0] || '').trim();
    const urlMatch = rawInput.match(/https?:\/\/[^\s]+/i);
    const originalUrl = urlMatch ? urlMatch[0] : rawInput;

    if (!originalUrl || !/instagram\.com/i.test(originalUrl)) {
        return conn.reply(
            m.chat,
            `📷 *Instagram Downloader*\n\n` +
            `حمل الفيديوهات، الصور، والريلز من إنستغرام مباشرة.\n\n` +
            `*طريقة الاستخدام:*\n` +
            `← ${usedPrefix + command} <رابط إنستغرام>\n\n` +
            `*مثال:*\n` +
            `← ${usedPrefix + command} https://www.instagram.com/reel/DcIob81ttHi/\n\n` +
            `⚡ *bot amirni hamza*`,
            m
        );
    }

    await m.react('⏳');

    // Clean tracking params
    let cleanUrl = originalUrl.split('?')[0].split('&')[0];

    try {
        const result = await igScraper(cleanUrl) || await igScraper(originalUrl);
        if (!result || !result.url || result.url.length === 0) {
            throw new Error('لم يتم العثور على محتوى. تأكد أن المنشور عام (Public) وليس خاصاً.');
        }

        const mediaUrls = result.url;
        let isFirst = true;

        for (const mediaUrl of mediaUrls) {
            if (!mediaUrl) continue;
            const caption = isFirst ? `📷 *Instagram Download*\n⚡ *bot amirni hamza*` : undefined;
            isFirst = false;

            const isImage = mediaUrl.includes('.jpg') || mediaUrl.includes('.webp') || mediaUrl.includes('.jpeg') || mediaUrl.includes('jpg');

            if (isImage) {
                await conn.sendMessage(m.chat, { image: { url: mediaUrl }, caption }, { quoted: m });
            } else {
                await conn.sendMessage(m.chat, { video: { url: mediaUrl }, caption, mimetype: 'video/mp4' }, { quoted: m });
            }
        }

        await m.react('✅');
    } catch (err) {
        console.error('[Instagram Error]', err.message);
        await m.react('❌');
        conn.reply(m.chat, `❌ ${err.message || 'فشل التحميل. حاول مجدداً.'}`, m);
    }
};

handler.help = ['ig', 'igdl', 'insta', 'instagram', 'reels'];
handler.command = /^(ig|igdl|insta|instagram|reels|ريلز|انستا|إنستغرام|انستقرام)$/i;
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
