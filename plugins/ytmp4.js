import { ytdown } from './ytmp3.js';

let handler = async (m, { usedPrefix, command, text }) => {
	if (!text) throw `Usage: ${usedPrefix + command} <YouTube Video URL>`;
	m.react('🔁');

	try {
		const dl = await ytdown(text, 'video');
		const info = dl.info;

		const sthumb = await conn.adReply(
			m.chat,
			`– 乂 *YouTube - Video*
> *- Title :* ${info.title}
> *- Channel :* ${info.uploader}
> *- Duration :* ${info.duration}
> *- Views :* ${info.views}
> *- Size :* ${info.size}`,
			info.thumbnail,
			m,
			{ title: info.title, source: text }
		);

		await conn.sendMessage(
			m.chat,
			{
				video: { url: dl.download },
				fileName: `${info.title}.mp4`,
			},
			{ quoted: sthumb }
		);

	} catch (e) {
		return m.reply(e.message);
	}
};

handler.help = ['ytmp4'];
handler.tags = ['downloader'];
handler.command = /^(ytmp4)$/i;
handler.limit = false;

export default handler;