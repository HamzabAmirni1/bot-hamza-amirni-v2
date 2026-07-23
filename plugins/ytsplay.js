import axios from 'axios';
import crypto from 'crypto';
import yts from 'yt-search';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';

// ============================================================
// AUDIO DOWNLOADERS — Fallback chain
// ============================================================

async function ytmp3Yupra(url) {
	const r = await axios.get(
		`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
		{ timeout: 6000 }
	);
	if (r?.data?.success && r?.data?.data?.download_url)
		return { download: r.data.data.download_url, title: r.data.data.title };
	throw new Error('Yupra mp3 failed');
}

async function ytmp3Ytconvert(url) {
	const headers = { accept: 'application/json', 'content-type': 'application/json', referer: 'https://ytmp3.gg/' };
	const payload = { url, os: 'android', output: { type: 'audio', format: 'mp3', quality: '320kbps' } };
	let init;
	try {
		init = await axios.post('https://hub.ytconvert.org/api/download', payload, { headers, timeout: 5000 });
	} catch {
		init = await axios.post('https://api.ytconvert.org/api/download', payload, { headers, timeout: 5000 });
	}
	if (!init?.data?.statusUrl) throw new Error('YTConvert empty');
	for (let i = 0; i < 5; i++) { // reduce check iterations
		const { data } = await axios.get(init.data.statusUrl, { headers, timeout: 5000 });
		if (data.status === 'completed') return { download: data.downloadUrl, title: 'Audio' };
		if (data.status === 'failed') throw new Error('Failed');
		await new Promise(r => setTimeout(r, 1000));
	}
	throw new Error('YTConvert timeout');
}

async function ytmp3Mever(url) {
	const id = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
	if (!id) throw new Error('Invalid YouTube URL');
	const r = await axios.get(
		`https://mever.zeabur.app/api/youtube?url=https://www.youtube.com/watch?v=${id}&type=mp3`,
		{ headers: { 'X-Package-Name': 'com.dapascript.mever', 'User-Agent': 'okhttp/4.11.0' }, timeout: 5000 }
	);
	if (r?.data?.status && r?.data?.data?.url) return { download: r.data.data.url, title: r.data.data.title || 'Audio' };
	throw new Error('Mever mp3 failed');
}

// ============================================================
// VIDEO DOWNLOADERS — Fallback chain
// ============================================================

const HEADERS = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
	'Accept': 'application/json, text/plain, */*'
};

async function ytmp4Yupra(url) {
	const r = await axios.get(
		`https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`,
		{ timeout: 6000, headers: HEADERS }
	);
	if (r?.data?.success && r?.data?.data?.download_url)
		return { download: r.data.data.download_url, title: r.data.data.title };
	throw new Error('Yupra mp4 failed');
}

async function ytmp4Vreden(url) {
	const r = await axios.get(
		`https://api.vreden.web.id/api/v1/download/youtube/video?url=${encodeURIComponent(url)}&quality=720`,
		{ timeout: 5000, headers: HEADERS }
	);
	if (r?.data?.result?.download?.url) return { download: r.data.result.download.url, title: r.data.result.title };
	throw new Error('Vreden failed');
}

async function ytmp4Nekolabs(url) {
	const r = await axios.get(
		`https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=mp4`,
		{ timeout: 5000, headers: HEADERS }
	);
	if (r?.data?.result?.downloadUrl) return { download: r.data.result.downloadUrl, title: r.data.result.title };
	throw new Error('Nekolabs failed');
}

async function ytmp4Ytconvert(url) {
	const headers = { accept: 'application/json', 'content-type': 'application/json', referer: 'https://ytmp3.gg/' };
	const payload = { url, os: 'android', output: { type: 'video', format: 'mp4', quality: '720p' } };
	let init;
	try {
		init = await axios.post('https://hub.ytconvert.org/api/download', payload, { headers, timeout: 5000 });
	} catch {
		init = await axios.post('https://api.ytconvert.org/api/download', payload, { headers, timeout: 5000 });
	}
	if (!init?.data?.statusUrl) throw new Error('YTConvert empty');
	for (let i = 0; i < 5; i++) { // reduce check iterations
		const { data } = await axios.get(init.data.statusUrl, { headers, timeout: 5000 });
		if (data.status === 'completed') return { download: data.downloadUrl, title: 'Video' };
		if (data.status === 'failed') throw new Error('Failed');
		await new Promise(r => setTimeout(r, 1000));
	}
	throw new Error('YTConvert timeout');
}

async function ytmp4Savetube(url, quality = '720') {
	const videoId = (url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
	if (!videoId) throw new Error('Invalid YouTube ID');
	const stH = { 'accept': '*/*', 'content-type': 'application/json', 'origin': 'https://yt.savetube.me', 'referer': 'https://yt.savetube.me/', 'user-agent': 'Postify/1.0.0' };
	const cdnRes = await axios.get('https://media.savetube.me/api/random-cdn', { headers: stH, timeout: 5000 });
	const cdn = cdnRes.data.cdn;
	const infoRes = await axios.post(`https://${cdn}/api/v2/info`, { url: `https://www.youtube.com/watch?v=${videoId}` }, { headers: stH, timeout: 5000 });
	const data2 = Buffer.from(infoRes.data.data, 'base64');
	const iv = data2.slice(0, 16), content = data2.slice(16);
	const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12'.match(/.{1,2}/g).join(''), 'hex');
	const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
	const decrypted = JSON.parse(Buffer.concat([decipher.update(content), decipher.final()]).toString());
	const dlRes = await axios.post(`https://${cdn}/api/download`, { id: videoId, downloadType: 'video', quality, key: decrypted.key }, { headers: stH, timeout: 5000 });
	if (dlRes.data?.data?.downloadUrl) return { download: dlRes.data.data.downloadUrl, title: decrypted.title };
	throw new Error('Savetube no URL');
}

async function ytmp4Mever(url) {
	const id = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
	if (!id) throw new Error('Invalid YouTube URL');
	const r = await axios.get(
		`https://mever.zeabur.app/api/youtube?url=https://www.youtube.com/watch?v=${id}&type=mp4`,
		{ headers: { 'X-Package-Name': 'com.dapascript.mever', 'User-Agent': 'okhttp/4.11.0' }, timeout: 5000 }
	);
	if (r?.data?.status && r?.data?.data?.url) return { download: r.data.data.url, title: r.data.data.title || 'Video' };
	throw new Error('Mever mp4 failed');
}

// ============================================================
// HANDLER
// ============================================================
const handler = async (m, { conn, text, command }) => {

	// ── .play / .yts: Download Audio / Search Carousel ───────────
	if (/^(play|ytplay|yts)$/i.test(command)) {
		if (!text) return m.reply(
			`🎵 *YouTube Downloader & Search*\n\nأرسل اسم الأغنية أو رابط يوتيوب:\n\n*مثال:*\n.play سيف عامر\n.yts سيف عامر`
		);

		// If it's a search term OR if command is explicitly "yts", send Carousel search results
		if (!text.startsWith('http') || /^yts$/i.test(command)) {
			await m.react('🔍');
			const search = await yts(text);
			const videos = search.videos || [];
			if (!videos.length) { await m.react('❌'); return m.reply('❌ لم يتم العثور على نتائج.'); }

			// Fallback helper for headers
			async function createHeaderImage(url) {
				try {
					const { imageMessage } = await generateWAMessageContent({ image: { url } }, { upload: conn.waUploadToServer });
					return imageMessage;
				} catch (e) {
					const fallback = 'https://ui-avatars.com/api/?name=YouTube&background=FF0000&color=FFFFFF&size=512';
					const { imageMessage } = await generateWAMessageContent({ image: { url: fallback } }, { upload: conn.waUploadToServer });
					return imageMessage;
				}
			}

			let cards = [];
			for (const v of videos.slice(0, 6)) {
				const imageMessage = await createHeaderImage(v.thumbnail);
				cards.push({
					body: proto.Message.InteractiveMessage.Body.fromObject({
						text: `⏱️ *المدة:* ${v.timestamp}\n👀 *المشاهدات:* ${v.views}\n📅 *النشر:* ${v.ago}\n👤 *القناة:* ${v.author.name}`
					}),
					header: proto.Message.InteractiveMessage.Header.fromObject({
						title: v.title,
						hasMediaAttachment: true,
						imageMessage
					}),
					nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
						buttons: [
							{
								"name": "quick_reply",
								"buttonParamsJson": JSON.stringify({ display_text: "🎵 تحميل صوت", id: `.play ${v.url}` })
							},
							{
								"name": "quick_reply",
								"buttonParamsJson": JSON.stringify({ display_text: "🎥 تحميل فيديو", id: `.video ${v.url}` })
							},
							{
								"name": "cta_url",
								"buttonParamsJson": JSON.stringify({ display_text: "📢 قناة الواتساب", url: "https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p" })
							},
							{
								"name": "cta_url",
								"buttonParamsJson": JSON.stringify({ display_text: "📸 إنستغرام", url: "https://www.instagram.com/hamza_amirni_01" })
							}
						]
					})
				});
			}

			const botMsg = generateWAMessageFromContent(m.chat, {
				interactiveMessage: proto.Message.InteractiveMessage.fromObject({
					body: proto.Message.InteractiveMessage.Body.create({ text: `📺 نتائج البحث عن: *${text}*` }),
					footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirini hamza' }),
					carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
				})
			}, { quoted: m });

			await conn.relayMessage(m.chat, botMsg.message, { messageId: botMsg.key.id });
			await m.react('✅');
			return;
		}

		await m.react('🎧');
		let videoUrl = text, videoTitle = '', videoThumb = '';

		// Extract info from URL
		try {
			const id = (videoUrl.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
			if (id) {
				const res = await yts({ videoId: id });
				videoTitle = res.title || '';
				videoThumb = res.image || res.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
			}
		} catch (_) {}

		// Show thumbnail preview while downloading
		if (videoThumb) {
			await conn.sendMessage(m.chat, {
				image: { url: videoThumb },
				caption: `🎵 *${videoTitle || 'جاري البحث...'}*\n⏳ *جاري تحميل الصوت...*\n\n⚡ *bot amirini hamza*`
			}, { quoted: m });
		}

		// Try audio downloaders in fallback order (Yupra first for speed)
		let audioData = null;
		for (const fn of [ytmp3Yupra, ytmp3Mever, ytmp3Ytconvert]) {
			try {
				audioData = await fn(videoUrl);
				if (audioData?.download) break;
			} catch (_) {}
		}

		if (!audioData?.download) {
			await m.react('❌');
			return m.reply('❌ فشل تحميل الصوت من جميع المصادر. حاول مرة أخرى لاحقاً.');
		}

		const audioTitle = audioData.title || videoTitle || 'audio';

		// Send the audio by passing the download URL directly to Baileys (streams directly, 0% RAM usage)
		await conn.sendMessage(m.chat, {
			audio: { url: audioData.download },
			mimetype: 'audio/mpeg',
			fileName: `${audioTitle}.mp3`,
			ptt: false,
			contextInfo: {
				externalAdReply: {
					title: audioTitle,
					body: 'bot amirini hamza',
					mediaType: 2,
					renderLargerThumbnail: true,
					thumbnailUrl: videoThumb || 'https://ui-avatars.com/api/?name=YouTube&background=FF0000&color=FFFFFF'
				}
			}
		}, { quoted: m });

		return m.react('✅');
	}

	// ── .video / .ytv: Download Video MP4 ─────────────────────
	if (/^(video|ytv)$/i.test(command)) {
		if (!text) return m.reply(
			`🎬 *YouTube Downloader*\n\nأرسل اسم الفيديو أو رابط يوتيوب:\n\n*مثال:*\n.video سيف عامر\n.video https://youtu.be/xxxx`
		);

		// If it's a search term, send Carousel search results using direct Baileys protobufs
		if (!text.startsWith('http')) {
			await m.react('🔍');
			const search = await yts(text);
			const videos = search.videos || [];
			if (!videos.length) { await m.react('❌'); return m.reply('❌ لم يتم العثور على نتائج.'); }

			// Fallback helper for headers
			async function createHeaderImage(url) {
				try {
					const { imageMessage } = await generateWAMessageContent({ image: { url } }, { upload: conn.waUploadToServer });
					return imageMessage;
				} catch (e) {
					const fallback = 'https://ui-avatars.com/api/?name=YouTube&background=FF0000&color=FFFFFF&size=512';
					const { imageMessage } = await generateWAMessageContent({ image: { url: fallback } }, { upload: conn.waUploadToServer });
					return imageMessage;
				}
			}

			let cards = [];
			for (const v of videos.slice(0, 6)) {
				const imageMessage = await createHeaderImage(v.thumbnail);
				cards.push({
					body: proto.Message.InteractiveMessage.Body.fromObject({
						text: `⏱️ *المدة:* ${v.timestamp}\n👀 *المشاهدات:* ${v.views}\n📅 *النشر:* ${v.ago}\n👤 *القناة:* ${v.author.name}`
					}),
					header: proto.Message.InteractiveMessage.Header.fromObject({
						title: v.title,
						hasMediaAttachment: true,
						imageMessage
					}),
					nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
						buttons: [
							{
								"name": "quick_reply",
								"buttonParamsJson": JSON.stringify({ display_text: "🎵 تحميل صوت", id: `.play ${v.url}` })
							},
							{
								"name": "quick_reply",
								"buttonParamsJson": JSON.stringify({ display_text: "🎥 تحميل فيديو", id: `.video ${v.url}` })
							},
							{
								"name": "cta_url",
								"buttonParamsJson": JSON.stringify({ display_text: "📢 قناة الواتساب", url: "https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p" })
							},
							{
								"name": "cta_url",
								"buttonParamsJson": JSON.stringify({ display_text: "📸 إنستغرام", url: "https://www.instagram.com/hamza_amirni_01" })
							}
						]
					})
				});
			}

			const botMsg = generateWAMessageFromContent(m.chat, {
				interactiveMessage: proto.Message.InteractiveMessage.fromObject({
					body: proto.Message.InteractiveMessage.Body.create({ text: `📺 نتائج البحث عن: *${text}*` }),
					footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirini hamza' }),
					carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
				})
			}, { quoted: m });

			await conn.relayMessage(m.chat, botMsg.message, { messageId: botMsg.key.id });
			await m.react('✅');
			return;
		}

		await m.react('🎬');
		let videoUrl = text, videoTitle = '', videoThumb = '';

		try {
			const id = (videoUrl.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
			if (id) {
				const res = await yts({ videoId: id });
				videoTitle = res.title || '';
				videoThumb = res.image || res.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
			}
		} catch (_) {}

		// Show thumbnail preview while downloading
		const ytId = (videoUrl.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
		const thumbUrl = videoThumb || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : '');
		if (thumbUrl) {
			await conn.sendMessage(m.chat, {
				image: { url: thumbUrl },
				caption: `🎬 *${videoTitle || 'جاري البحث...'}*\n⏳ *جاري تحميل الفيديو...*\n\n⚡ *bot amirini hamza*`
			}, { quoted: m });
		}

		// Try video downloaders in fallback order (Yupra first for speed)
		let videoData = null;
		for (const fn of [ytmp4Yupra, ytmp4Vreden, ytmp4Nekolabs, ytmp4Ytconvert, ytmp4Savetube, ytmp4Mever]) {
			try {
				videoData = await fn(videoUrl);
				if (videoData?.download) break;
			} catch (e) {
				console.log('[ytsplay/video] failed:', e.message);
			}
		}

		if (!videoData?.download) {
			await m.react('❌');
			return m.reply('❌ فشل تحميل الفيديو من جميع المصادر. حاول مرة أخرى لاحقاً.');
		}

		const vidTitle = videoData.title || videoTitle || 'video';
		await conn.sendMessage(m.chat, {
			video: { url: videoData.download },
			mimetype: 'video/mp4',
			fileName: `${vidTitle}.mp4`,
			caption: `🎬 *${vidTitle}*\n\n⚡ *bot amirini hamza*`
		}, { quoted: m });

		return m.react('✅');
	}
};

handler.help = ['play <اسم أو URL>', 'video <اسم أو URL>', 'yts <اسم البحث>'];
handler.tags = ['downloader'];
handler.command = /^(play|ytplay|video|ytv|yts)$/i;

export default handler;
