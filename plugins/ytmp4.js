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
		if (!result?.download) throw new Error('تعذر استخراج رابط التحميل');

		await conn.sendMessage(m.chat, {
			video: { url: result.download },
			mimetype: 'video/mp4',
			fileName: `${result.title || 'video'}.mp4`,
			caption: `🎬 *${result.title || 'YouTube Video'}*\n📺 *الجودة:* ${result.quality || quality}p\n\n⚡ *bot amirni hamza*`,
		}, { quoted: m });

		await m.react('✅');
	} catch (e) {
		console.error('[ytmp4 error]:', e.message);
		await m.react('❌');
		m.reply(`❌ فشل تحميل الفيديو: ${e.message || e}`);
	}
};

handler.help = ['ytmp4 <url> [quality]'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4|ytv|ytvideo)$/i;
handler.limit = false;

export default handler;
