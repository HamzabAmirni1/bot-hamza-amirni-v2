import axios from 'axios';
import crypto from 'crypto';
import yts from 'yt-search';
import { downloadYouTube } from '../lib/ytdl.js';

// ============================================================
// AUDIO DOWNLOADERS — Fallback chain
// ============================================================

async function ytmp3Convert1s(ytUrl) {
	const headers = {
		'accept': 'application/json',
		'content-type': 'application/json',
		'origin': 'https://ssvid.cc',
		'referer': 'https://ssvid.cc/',
		'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
	};
	const initRes = await axios.post('https://hub.convert1s.com/api/download', {
		url: ytUrl,
		audio: { bitrate: '128k' },
		output: { type: 'audio', format: 'mp3' },
	}, { headers, timeout: 15000 });

	const { statusUrl, title, duration } = initRes.data;
	if (!statusUrl) throw new Error('No statusUrl');

	let downloadData = null;
	for (let attempts = 0; attempts < 25; attempts++) {
		const statusRes = await axios.get(statusUrl, { headers, timeout: 10000 });
		if (statusRes.data.status === 'completed') {
			downloadData = statusRes.data;
			break;
		}
		if (statusRes.data.status === 'error' || statusRes.data.status === 'failed') break;
		await new Promise(r => setTimeout(r, 1500));
	}

	if (!downloadData?.downloadUrl) throw new Error('convert1s audio failed');
	return { download: downloadData.downloadUrl, title: downloadData.title || title };
}

async function ytmp3Yupra(url) {
	const r = await axios.get(
		`https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`,
		{ timeout: 25000 }
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
		init = await axios.post('https://hub.ytconvert.org/api/download', payload, { headers, timeout: 15000 });
	} catch {
		init = await axios.post('https://api.ytconvert.org/api/download', payload, { headers, timeout: 15000 });
	}
	if (!init?.data?.statusUrl) throw new Error('YTConvert empty');
	for (let i = 0; i < 30; i++) {
		const { data } = await axios.get(init.data.statusUrl, { headers, timeout: 10000 });
		if (data.status === 'completed') return { download: data.downloadUrl, title: 'Audio' };
		if (data.status === 'failed') throw new Error('Failed');
		await new Promise(r => setTimeout(r, 2000));
	}
	throw new Error('YTConvert timeout');
}

async function ytmp3Mever(url) {
	const id = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
	if (!id) throw new Error('Invalid YouTube URL');
	const r = await axios.get(
		`https://mever.zeabur.app/api/youtube?url=https://www.youtube.com/watch?v=${id}&type=mp3`,
		{ headers: { 'X-Package-Name': 'com.dapascript.mever', 'User-Agent': 'okhttp/4.11.0' }, timeout: 20000 }
	);
	if (r?.data?.status && r?.data?.data?.url) return { download: r.data.data.url, title: r.data.data.title || 'Audio' };
	throw new Error('Mever mp3 failed');
}

// NEW: SaveTube audio downloader (same site used for video but audio output)
async function ytmp3Savetube(url) {
	const videoId = (url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
	if (!videoId) throw new Error('Invalid YouTube ID');
	const stH = { 'accept': '*/*', 'content-type': 'application/json', 'origin': 'https://yt.savetube.me', 'referer': 'https://yt.savetube.me/', 'user-agent': 'Postify/1.0.0' };
	const cdnRes = await axios.get('https://media.savetube.me/api/random-cdn', { headers: stH, timeout: 10000 });
	const cdn = cdnRes.data.cdn;
	const infoRes = await axios.post(`https://${cdn}/api/v2/info`, { url: `https://www.youtube.com/watch?v=${videoId}` }, { headers: stH, timeout: 15000 });
	const data2 = Buffer.from(infoRes.data.data, 'base64');
	const iv = data2.slice(0, 16), content = data2.slice(16);
	const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12'.match(/.{1,2}/g).join(''), 'hex');
	const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
	const decrypted = JSON.parse(Buffer.concat([decipher.update(content), decipher.final()]).toString());
	const dlRes = await axios.post(`https://${cdn}/api/download`, { id: videoId, downloadType: 'audio', quality: '128', key: decrypted.key }, { headers: stH, timeout: 15000 });
	if (dlRes.data?.data?.downloadUrl) return { download: dlRes.data.data.downloadUrl, title: decrypted.title };
	throw new Error('Savetube audio no URL');
}

// NEW: y2mate API
async function ytmp3Y2mate(url) {
	const id = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
	if (!id) throw new Error('Invalid YouTube URL');
	const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'referer': 'https://www.y2mate.com/', 'User-Agent': 'Mozilla/5.0' };
	const r1 = await axios.post('https://www.y2mate.com/mates/analyzeV2/ajax', `k_query=https://www.youtube.com/watch?v=${id}&k_page=home&hl=en&q_auto=0`, { headers, timeout: 15000 });
	const links = r1?.data?.links?.mp3;
	if (!links) throw new Error('y2mate no mp3 links');
	const best = Object.values(links).find(x => x.size && x.k);
	if (!best?.k) throw new Error('y2mate no key');
	const r2 = await axios.post('https://www.y2mate.com/mates/convertV2/index', `vid=${id}&k=${best.k}`, { headers, timeout: 20000 });
	if (r2?.data?.dlink) return { download: r2.data.dlink, title: r1.data.title || 'Audio' };
	throw new Error('y2mate convert failed');
}

// NEW: yt-download.org
async function ytmp3Ytdl(url) {
	const id = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
	if (!id) throw new Error('Invalid YouTube URL');
	const r = await axios.get(`https://www.yt-download.org/api/button/mp3/${id}`, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
	const match = r.data?.match(/href="(https:\/\/www\.yt-download\.org\/[^"]+\.mp3[^"]*)"/);
	if (match?.[1]) return { download: match[1], title: 'Audio' };
	throw new Error('yt-download.org failed');
}

// ============================================================
// VIDEO DOWNLOADERS — Fallback chain
// ============================================================

const HEADERS = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
	'Accept': 'application/json, text/plain, */*'
};

// Resolve final URL (follows 302 redirects)
async function resolveFinalUrl(url) {
	try {
		const res = await axios.head(url, { maxRedirects: 10, timeout: 15000, headers: HEADERS });
		return res.request?.res?.responseUrl || res.config?.url || url;
	} catch (e) {
		// if HEAD fails, try GET with maxRedirects
		try {
			const res2 = await axios.get(url, { maxRedirects: 10, timeout: 15000, responseType: 'stream', headers: HEADERS });
			res2.data.destroy();
			return res2.request?.res?.responseUrl || url;
		} catch { return url; }
	}
}

async function ytmp4Convert1s(ytUrl) {
	const headers = {
		'accept': 'application/json',
		'content-type': 'application/json',
		'origin': 'https://ssvid.cc',
		'referer': 'https://ssvid.cc/',
		'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
	};
	const initRes = await axios.post('https://hub.convert1s.com/api/download', {
		url: ytUrl,
		video: { quality: '720p' },
		output: { type: 'video', format: 'mp4' },
	}, { headers, timeout: 15000 });

	const { statusUrl, title, duration } = initRes.data;
	if (!statusUrl) throw new Error('No statusUrl');

	let downloadData = null;
	for (let attempts = 0; attempts < 30; attempts++) {
		const statusRes = await axios.get(statusUrl, { headers, timeout: 10000 });
		if (statusRes.data.status === 'completed') {
			downloadData = statusRes.data;
			break;
		}
		if (statusRes.data.status === 'error' || statusRes.data.status === 'failed') break;
		await new Promise(r => setTimeout(r, 1500));
	}

	if (!downloadData?.downloadUrl) throw new Error('convert1s mp4 failed');
	return { download: downloadData.downloadUrl, title: downloadData.title || title };
}

async function ytmp4Vreden(url) {
	const r = await axios.get(
		`https://api.vreden.web.id/api/v1/download/youtube/video?url=${encodeURIComponent(url)}&quality=720`,
		{ timeout: 30000, headers: HEADERS }
	);
	if (r?.data?.result?.download?.url) return { download: r.data.result.download.url, title: r.data.result.title };
	throw new Error('Vreden failed');
}

async function ytmp4Nekolabs(url) {
	const r = await axios.get(
		`https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=mp4`,
		{ timeout: 30000, headers: HEADERS }
	);
	if (r?.data?.result?.downloadUrl) return { download: r.data.result.downloadUrl, title: r.data.result.title };
	throw new Error('Nekolabs failed');
}

async function ytmp4Ytconvert(url) {
	const headers = { accept: 'application/json', 'content-type': 'application/json', referer: 'https://ytmp3.gg/' };
	const payload = { url, os: 'android', output: { type: 'video', format: 'mp4', quality: '720p' } };
	let init;
	try {
		init = await axios.post('https://hub.ytconvert.org/api/download', payload, { headers, timeout: 15000 });
	} catch {
		init = await axios.post('https://api.ytconvert.org/api/download', payload, { headers, timeout: 15000 });
	}
	if (!init?.data?.statusUrl) throw new Error('YTConvert empty');
	for (let i = 0; i < 30; i++) {
		const { data } = await axios.get(init.data.statusUrl, { headers, timeout: 10000 });
		if (data.status === 'completed') return { download: data.downloadUrl, title: 'Video' };
		if (data.status === 'failed') throw new Error('Failed');
		await new Promise(r => setTimeout(r, 2000));
	}
	throw new Error('YTConvert timeout');
}

async function ytmp4Yupra(url) {
	const r = await axios.get(
		`https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`,
		{ timeout: 30000, headers: HEADERS }
	);
	if (r?.data?.success && r?.data?.data?.download_url)
		return { download: r.data.data.download_url, title: r.data.data.title };
	throw new Error('Yupra mp4 failed');
}

async function ytmp4Yt1s(url) {
	const id = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
	if (!id) throw new Error('Invalid YouTube URL');
	const headers2 = { 'Content-Type': 'application/x-www-form-urlencoded', 'referer': 'https://yt1s.io/', 'User-Agent': 'Mozilla/5.0' };
	const r = await axios.post('https://yt1s.io/api/ajaxSearch/index', `q=https://www.youtube.com/watch?v=${id}&vt=home`, { headers: headers2, timeout: 15000 });
	if (r?.data?.links?.mp4) {
		const q = Object.values(r.data.links.mp4).find(x => x.size && x.url) || Object.values(r.data.links.mp4)[0];
		if (q?.url) return { download: q.url, title: r.data.title || 'Video' };
	}
	throw new Error('yt1s failed');
}

async function ytmp4Savetube(url, quality = '720') {
	const videoId = (url.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
	if (!videoId) throw new Error('Invalid YouTube ID');
	const stH = { 'accept': '*/*', 'content-type': 'application/json', 'origin': 'https://yt.savetube.me', 'referer': 'https://yt.savetube.me/', 'user-agent': 'Postify/1.0.0' };
	const cdnRes = await axios.get('https://media.savetube.me/api/random-cdn', { headers: stH, timeout: 10000 });
	const cdn = cdnRes.data.cdn;
	const infoRes = await axios.post(`https://${cdn}/api/v2/info`, { url: `https://www.youtube.com/watch?v=${videoId}` }, { headers: stH, timeout: 15000 });
	const data2 = Buffer.from(infoRes.data.data, 'base64');
	const iv = data2.slice(0, 16), content = data2.slice(16);
	const key = Buffer.from('C5D58EF67A7584E4A29F6C35BBC4EB12'.match(/.{1,2}/g).join(''), 'hex');
	const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
	const decrypted = JSON.parse(Buffer.concat([decipher.update(content), decipher.final()]).toString());
	const dlRes = await axios.post(`https://${cdn}/api/download`, { id: videoId, downloadType: 'video', quality, key: decrypted.key }, { headers: stH, timeout: 15000 });
	if (dlRes.data?.data?.downloadUrl) return { download: dlRes.data.data.downloadUrl, title: decrypted.title };
	throw new Error('Savetube no URL');
}

async function ytmp4Mever(url) {
	const id = (url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || [])[1];
	if (!id) throw new Error('Invalid YouTube URL');
	const r = await axios.get(
		`https://mever.zeabur.app/api/youtube?url=https://www.youtube.com/watch?v=${id}&type=mp4`,
		{ headers: { 'X-Package-Name': 'com.dapascript.mever', 'User-Agent': 'okhttp/4.11.0' }, timeout: 20000 }
	);
	if (r?.data?.status && r?.data?.data?.url) return { download: r.data.data.url, title: r.data.data.title || 'Video' };
	throw new Error('Mever mp4 failed');
}

// ============================================================
// HANDLER
// ============================================================
// ============================================================
// HANDLER
// ============================================================
const handler = async (m, { conn, text, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';

	const txtPromptPlay = lang === 'english'
		? `🎵 *YouTube Audio Downloader & Search*\n\nSend song name or YouTube URL:\n\n*Example:*\n← .play Shape of You\n← .yts Shape of You`
		: lang === 'arabic'
		? `🎵 *محمل ومحرك بحث يوتيوب الصوتيات*\n\nأرسل اسم المقطع أو رابط يوتيوب:\n\n*مثال:*\n← .play سيف عامر\n← .yts سيف عامر`
		: `🎵 *تحميل واستماع صوتيات يوتيوب*\n\nكتب اسم الأغنية أو التلاوة أو رولي لينا الرابط:\n\n*مثال:*\n← .play سيف عامر\n← .yts سيف عامر`;

	const txtNoResults = lang === 'english' ? '❌ No results found.' : lang === 'arabic' ? '❌ لم يتم العثور على نتائج.' : '❌ مالقينا حتى نتيجة، جرب كلمة أخرى.';
	const btnAudio = lang === 'english' ? '🎵 Download Audio' : lang === 'arabic' ? '🎵 تحميل صوت' : '🎵 تحميل الصوت MP3';
	const btnVideo = lang === 'english' ? '🎥 Download Video' : lang === 'arabic' ? '🎥 تحميل فيديو' : '🎥 تحميل الفيديو MP4';
	const txtSearchResultTitle = lang === 'english' ? '📺 Search results for:' : lang === 'arabic' ? '📺 نتائج البحث عن:' : '📺 نتائج البحث ديال:';

	// ── .play / .song / .music: Download Audio / Search Carousel ───────────
	if (/^(play|ytplay|song|music|aghani)$/i.test(command)) {
		if (!text) return m.reply(txtPromptPlay);

		// If it's a search term, search and get video
		if (!text.startsWith('http')) {
			await m.react('🔍');
			const search = await yts(text);
			const videos = search.videos || [];
			if (!videos.length) { await m.react('❌'); return m.reply(txtNoResults); }

			const firstVid = videos[0];

			// Build formatted text list for 100% mobile screen compatibility
			let captionText = `${txtSearchResultTitle} *${text}*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
			const rows = [];
			videos.slice(0, 7).forEach((v, i) => {
				const num = i + 1;
				captionText += `*${num}️⃣ ${v.title}*\n⏱️ *المدة:* ${v.timestamp} | 👤 *القناة:* ${v.author.name}\n← .play ${v.url}\n\n`;
				rows.push({
					title: `🎵 ${num}. ${v.title.slice(0, 40)}`,
					description: `⏱️ ${v.timestamp} | 👤 ${v.author.name.slice(0, 25)}`,
					id: `.play ${v.url}`
				});
			});
			captionText += `━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`;

			const selectTitle = lang === 'english' ? '🎧 Choose Song to Download' : lang === 'arabic' ? '🎧 اختر مقطعاً للتحميل' : '🎧 عزل الأغنية باش تهبطها';

			try {
				await conn.sendButton(m.chat, {
					image: { url: firstVid.thumbnail },
					caption: captionText,
					footer: 'bot amirni hamza',
					buttons: [
						{
							name: 'single_select',
							buttonParamsJson: JSON.stringify({
								title: selectTitle,
								sections: [{ title: '🎵 YouTube Results', rows }]
							})
						},
						{
							name: 'quick_reply',
							buttonParamsJson: JSON.stringify({ display_text: btnAudio, id: `.play ${firstVid.url}` })
						},
						{
							name: 'quick_reply',
							buttonParamsJson: JSON.stringify({ display_text: btnVideo, id: `.video ${firstVid.url}` })
						}
					]
				}, { quoted: m });
			} catch (_) {
				await conn.sendMessage(m.chat, { image: { url: firstVid.thumbnail }, caption: captionText }, { quoted: m });
			}

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
				caption: `🎵 *${videoTitle || 'جاري البحث...'}*\n⏳ *جاري تحميل الصوت...*\n\n⚡ *bot amirni hamza*`
			}, { quoted: m });
		}

		// Try audio downloaders in fallback order — downloadYouTube (multi-engine) first
		let audioData = null;

		// Primary: use shared downloadYouTube engine from ytdl.js
		try {
			const res = await downloadYouTube(videoUrl, 'mp3');
			if (res?.download) { audioData = res; console.log('[play] ✅ Audio via downloadYouTube engine'); }
		} catch (e) { console.log('[play] ❌ downloadYouTube failed:', e.message); }

		// Inline fallbacks if primary fails
		if (!audioData?.download) {
			for (const [fn, name] of [
				[ytmp3Convert1s, 'Convert1s'],
				[ytmp3Mever, 'Mever'],
				[ytmp3Savetube, 'SaveTube'],
				[ytmp3Y2mate, 'y2mate'],
				[ytmp3Yupra, 'Yupra'],
				[ytmp3Ytdl, 'yt-download.org'],
				[ytmp3Ytconvert, 'YTConvert']
			]) {
				try {
					audioData = await fn(videoUrl);
					if (audioData?.download) {
						console.log(`[play] ✅ Audio downloaded via ${name}`);
						break;
					}
				} catch (e) {
					console.log(`[play] ❌ ${name} failed: ${e.message}`);
				}
			}
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
					body: 'bot amirni hamza',
					mediaType: 2,
					renderLargerThumbnail: true,
					thumbnailUrl: videoThumb || 'https://ui-avatars.com/api/?name=YouTube&background=FF0000&color=FFFFFF'
				}
			}
		}, { quoted: m });

		return m.react('✅');
	}

	// ── .video / .ytv: Download Video MP4 ───────────────────────────
	if (/^(video|ytv)$/i.test(command)) {
		const txtPromptVideo = lang === 'english'
			? `🎥 *YouTube Video Downloader*\n\nSend video name or YouTube URL:\n\n*Example:*\n← .video Shape of You\n← .video https://youtu.be/xxxx`
			: lang === 'arabic'
			? `🎥 *محمل فيديوهات يوتيوب*\n\nأرسل اسم الفيديو أو رابط يوتيوب:\n\n*مثال:*\n← .video سيف عامر\n← .video https://youtu.be/xxxx`
			: `🎥 *تحميل فيديوهات يوتيوب*\n\nكتب اسم الفيديو أو رولي لينا الرابط:\n\n*مثال:*\n← .video سيف عامر\n← .video https://youtu.be/xxxx`;

		if (!text) return m.reply(txtPromptVideo);

		// If it's a search term, send Carousel search results using direct Baileys protobufs
		if (!text.startsWith('http')) {
			await m.react('🔍');
			const search = await yts(text);
			const videos = search.videos || [];
			if (!videos.length) { await m.react('❌'); return m.reply(txtNoResults); }

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
				const bodyTxt = lang === 'english'
					? `⏱️ *Duration:* ${v.timestamp}\n👀 *Views:* ${v.views}\n📅 *Uploaded:* ${v.ago}\n👤 *Channel:* ${v.author.name}`
					: `⏱️ *المدة:* ${v.timestamp}\n👀 *المشاهدات:* ${v.views}\n📅 *النشر:* ${v.ago}\n👤 *القناة:* ${v.author.name}`;
				cards.push({
					body: proto.Message.InteractiveMessage.Body.fromObject({ text: bodyTxt }),
					header: proto.Message.InteractiveMessage.Header.fromObject({
						title: v.title,
						hasMediaAttachment: true,
						imageMessage
					}),
					nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
						buttons: [
							{
								"name": "quick_reply",
								"buttonParamsJson": JSON.stringify({ display_text: btnAudio, id: `.play ${v.url}` })
							},
							{
								"name": "quick_reply",
								"buttonParamsJson": JSON.stringify({ display_text: btnVideo, id: `.video ${v.url}` })
							}
						]
					})
				});
			}

			const botMsg = generateWAMessageFromContent(m.chat, {
				viewOnceMessage: {
					message: {
						messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
						interactiveMessage: proto.Message.InteractiveMessage.fromObject({
							body: proto.Message.InteractiveMessage.Body.create({ text: `${txtSearchResultTitle} *${text}*` }),
							footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirni hamza' }),
							carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
						})
					}
				}
			}, { quoted: m, userJid: conn.user?.jid || conn.decodeJid(conn.user?.id) });

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
			const downloadingTxt = lang === 'english'
				? `🎬 *${videoTitle || 'Searching...'}*\n⏳ *Downloading video...*\n\n⚡ *bot amirni hamza*`
				: lang === 'arabic'
				? `🎬 *${videoTitle || 'جارٍ البحث...'}*\n⏳ *جارٍ تحميل الفيديو...*\n\n⚡ *bot amirni hamza*`
				: `🎬 *${videoTitle || 'كنقلبو...'}*\n⏳ *كنحملو الفيديو...*\n\n⚡ *bot amirni hamza*`;
			await conn.sendMessage(m.chat, {
				image: { url: thumbUrl },
				caption: downloadingTxt
			}, { quoted: m });
		}

		// Try video downloaders in fallback order
		let videoData = null;
		try {
			const res = await downloadYouTube(videoUrl, 'mp4');
			if (res?.download) videoData = res;
		} catch (e) {
			console.log('[ytsplay/video] downloadYouTube failed:', e.message);
		}

		if (!videoData?.download) {
			for (const fn of [ytmp4Convert1s, ytmp4Ytconvert, ytmp4Savetube, ytmp4Yupra, ytmp4Yt1s, ytmp4Mever]) {
				try {
					videoData = await fn(videoUrl);
					if (videoData?.download) break;
				} catch (e) {
					console.log('[ytsplay/video] fallback failed:', e.message);
				}
			}
		}

		if (!videoData?.download) {
			await m.react('❌');
			const failVideoMsg = lang === 'english'
				? '❌ Failed to download video from all sources. Please try again later.'
				: lang === 'arabic'
				? '❌ فشل تحميل الفيديو من جميع المصادر. حاول مرة أخرى.'
				: '❌ فشل تحميل الفيديو من جميع المصادر. حاول مرة أخرى.';
			return m.reply(failVideoMsg);
		}

		// Resolve any 302 redirects before sending to Baileys
		const finalVideoUrl = await resolveFinalUrl(videoData.download);
		const vidTitle = videoData.title || videoTitle || 'video';
		await conn.sendMessage(m.chat, {
			video: { url: finalVideoUrl },
			mimetype: 'video/mp4',
			fileName: `${vidTitle}.mp4`,
			caption: `🎬 *${vidTitle}*\n\n⚡ *bot amirni hamza*`
		}, { quoted: m });

		return m.react('✅');
	}
};

handler.help = ['play <اسم أو URL>', 'song <اسم الأغنية>', 'video <اسم أو URL>'];
handler.tags = ['downloader'];
handler.command = /^(play|ytplay|song|music|aghani|video|ytv)$/i;

export default handler;
