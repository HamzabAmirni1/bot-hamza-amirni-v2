import axios from 'axios';
import fs from 'fs';
import { downloadYouTube } from '../lib/ytdl.js';

const YT_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;

let handler = async (m, { conn, args, usedPrefix, command }) => {
	const url = (args[0] || '').trim();
	const quality = (args[1] || '720').replace(/p$/i, '');

	if (!url || !YT_REGEX.test(url)) {
		return m.reply(
			`🎬 *YouTube MP4 Downloader*\n\n` +
			`*طريقة الاستعمال:*\n` +
			`${usedPrefix + command} <رابط يوتيوب> [الجودة]\n\n` +
			`*مثال:*\n` +
			`${usedPrefix + command} https://youtu.be/NJMEtaDTVtA 720\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	try {
		await m.react('⏳');

		const result = await downloadYouTube(url, 'mp4', quality);
		if (!result?.download) throw new Error('تعذر استخراج رابط التحميل من السيرفرات');

		let videoBuffer = null;
		let isLocal = result.isLocalFile || (typeof result.download === 'string' && fs.existsSync(result.download));

		if (isLocal) {
			videoBuffer = fs.readFileSync(result.download);
			try { fs.unlinkSync(result.download); } catch (_) {}
		} else {
			// Download directly via axios arrayBuffer with standard headers to avoid Baileys CDN socket drop
			try {
				const dlRes = await axios.get(result.download, {
					responseType: 'arraybuffer',
					timeout: 60000,
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
						'Accept': '*/*'
					}
				});
				if (dlRes.data && dlRes.data.byteLength > 1024) {
					videoBuffer = Buffer.from(dlRes.data);
				}
			} catch (_) {}
		}

		const vidTarget = videoBuffer || { url: result.download };
		const caption = `🎬 *${result.title || 'YouTube Video'}*\n📺 *الجودة:* ${result.quality || quality}p\n\n⚡ *bot amirni hamza*`;

		try {
			await conn.sendMessage(m.chat, {
				video: vidTarget,
				mimetype: 'video/mp4',
				fileName: `${result.title || 'video'}.mp4`,
				caption: caption
			}, { quoted: m });
		} catch (vErr) {
			// Fallback to document
			await conn.sendMessage(m.chat, {
				document: vidTarget,
				mimetype: 'video/mp4',
				fileName: `${result.title || 'video'}.mp4`,
				caption: caption
			}, { quoted: m });
		}

		await m.react('✅');
	} catch (e) {
		console.error('[ytmp4 error]:', e.message);
		await m.react('❌');
		m.reply(`❌ فشل تحميل الفيديو: ${e.message || e}`);
	}
};

handler.help = ['ytmp4 <url> [quality]', 'video <url>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv|ytvideo)$/i;
handler.limit = false;

export default handler;
