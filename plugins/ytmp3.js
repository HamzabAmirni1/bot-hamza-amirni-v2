import { downloadYouTube } from '../lib/ytdl.js';

const YT_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/;

let handler = async (m, { conn, text, usedPrefix, command }) => {
	const url = (text || '').trim();

	if (!url || !YT_REGEX.test(url)) {
		return m.reply(
			`🎵 *YouTube MP3 Downloader*\n\n` +
			`*طريقة الاستعمال:*\n` +
			`${usedPrefix + command} <رابط يوتيوب>\n\n` +
			`*مثال:*\n` +
			`${usedPrefix + command} https://youtu.be/NJMEtaDTVtA\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	try {
		await m.react('⏳');

		const result = await downloadYouTube(url, 'mp3');
		if (!result?.download) throw new Error('تعذر استخراج رابط التحميل');

		const fs = await import('fs');
		const isLocal = result.isLocalFile || (typeof result.download === 'string' && fs.existsSync(result.download));
		const audioTarget = isLocal ? fs.readFileSync(result.download) : { url: result.download };

		await conn.sendMessage(m.chat, {
			audio: audioTarget,
			mimetype: 'audio/mpeg',
			fileName: `${result.title || 'audio'}.mp3`,
			ptt: false,
		}, { quoted: m });

		if (isLocal) {
			try { fs.unlinkSync(result.download); } catch (_) {}
		}

		await m.react('✅');
	} catch (e) {
		console.error('[ytmp3 error]:', e.message);
		await m.react('❌');
		m.reply(`❌ فشل تحميل الصوت: ${e.message || e}`);
	}
};

handler.help = ['ytmp3 <url>'];
handler.tags = ['downloader'];
handler.command = /^(ytmp3|ytaudio|yta)$/i;
handler.limit = false;

export default handler;
