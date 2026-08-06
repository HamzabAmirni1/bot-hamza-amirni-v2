import { ytdown } from './ytmp3.js';

let handler = async (m, { usedPrefix, command, text }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	if (!text) throw t(`Usage: ${usedPrefix + command} <YouTube Video URL>`, `الاستخدام: ${usedPrefix + command} <رابط فيديو يوتيوب>`, `الاستخدام: ${usedPrefix + command} <رابط فيديو يوتيوب>`);
	m.react('🔁');

	try {
		const dl = await ytdown(text, 'video');
		const info = dl.info;

		const cap = t(
			`– 乂 *YouTube - Video*\n> *- Title:* ${info.title}\n> *- Channel:* ${info.uploader}\n> *- Duration:* ${info.duration}\n> *- Views:* ${info.views}\n> *- Size:* ${info.size}`,
			`– 乂 *يوتيوب - فيديو*\n> *- العنوان:* ${info.title}\n> *- القناة:* ${info.uploader}\n> *- المدة:* ${info.duration}\n> *- المشاهدات:* ${info.views}\n> *- الحجم:* ${info.size}`,
			`– 乂 *يوتيوب - فيديو*\n> *- العنوان:* ${info.title}\n> *- القناة:* ${info.uploader}\n> *- المدة:* ${info.duration}\n> *- المشاهدات:* ${info.views}\n> *- الحجم:* ${info.size}`
		);

		const sthumb = await conn.adReply(
			m.chat,
			cap,
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