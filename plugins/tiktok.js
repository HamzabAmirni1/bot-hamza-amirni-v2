let handler = async (m, { conn, text, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';

	try {
		const input = m.quoted ? m.quoted.text : text;
		const regex = /(https:\/\/(vt|vm)\.tiktok\.com\/[^\s]+|https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+)/;

		const parseUrl = input?.match(regex)?.[0];
		if (parseUrl) {
			m.react('🔁');
			let res = await (await fetch(`https://www.tikwm.com/api/?url=${parseUrl}&hd=1`)).json();
			if (!res || !res.data) throw new Error(lang === 'english' ? 'Failed to retrieve data from TikTok.' : 'فشل جلب معطيات تيك توك.');

			let data = res.data;
			const cardHeader = lang === 'english' ? '# *TIKTOK DOWNLOADER*' : lang === 'arabic' ? '# *محمل تيك توك*' : '# *تنزيل مقاطع تيك توك* 🎵';
			const capInfo = `> *Title*: ${data.title}\n> *Duration*: ${formatDuration(data.duration)}\n> *Views*: ${formatNumber(data.play_count)}\n> *Uploader*: ${data.author.nickname || data.author.unique_id}`;
			
			await m.reply(`${cardHeader}\n\n${capInfo}`);

			if (data.images && data.images.length > 0) {
				if (data.images.length < 2) {
					for (let img of data.images) {
						await conn.sendFile(m.chat, img, '', '', m);
					}
				} else {
					let media = data.images.map((img) => ({
						image: { url: img },
					}));
					await conn.sendAlbumMessage(m.chat, media, { quoted: m });
				}
			} else {
				await conn.sendFile(m.chat, data.play, '', '', m);
			}

			if (data.music_info?.play) {
				await conn.sendMessage(
					m.chat,
					{
						audio: { url: data.music_info.play },
						mimetype: 'audio/mpeg',
						fileName: `${data.title}.mp3`,
					},
					{ quoted: m }
				);
			}
			await m.react('✅');
		} else if (input) {
			await m.react('🔍');
			let search = await (await fetch(`https://www.tikwm.com/api/feed/search?keywords=${input}&count=1&cursor=0&web=1&hd=1`)).json();
			let video = search?.data?.videos[0];
			if (!video) throw new Error(lang === 'english' ? `Video not found for "${input}".` : `لم يتم العثور على فيديو لـ "${input}".`);

			let caption = `# *TIKTOK PLAYER*\n\n> *Title:* ${video.title}\n> *Uploader:* ${video.author.nickname || video.author.unique_id}`.trim();

			await conn.sendFile(m.chat, 'https://www.tikwm.com' + video.play, '', caption, m);
			await m.react('✅');
		} else {
			let cmd = usedPrefix + command;
			const prompt = lang === 'english'
				? `🎵 *TIKTOK DOWNLOADER*\n> • *Search:* \`${cmd} [query]\`\n> • *Download:* \`${cmd} [link]\`\n\n*Example:* \`${cmd} https://vt.tiktok.com/xxxx\``
				: lang === 'arabic'
				? `🎵 *محمل تيك توك*\n> • *بحث:*\n> ← \`${cmd} [كلمة البحث]\`\n> • *تحميل:*\n> ← \`${cmd} [الرابط]\`\n\n*مثال:*\n← \`${cmd} https://vt.tiktok.com/xxxx\``
				: `🎵 *تحميل فيديوهات تيك توك*\n> • *بحث:*\n> ← \`${cmd} [اسم المقطع]\`\n> • *تحميل:*\n> ← \`${cmd} [رابط التيك توك]\`\n\n*مثال:*\n← \`${cmd} https://vt.tiktok.com/xxxx\``;
			m.reply(prompt);
		}
	} catch (err) {
		console.error(err);
		await m.react('❌');
		return m.reply(lang === 'english' ? '❌ An error occurred while processing TikTok request.' : '❌ وقع خطأ أثناء جلب المقطع من تيك توك.');
	}
};

handler.help = ['tiktok'];
handler.tags = ['downloader'];
handler.command = /^(tiktok)$/i;
handler.limit = false;

export default handler;

function formatNumber(number) {
	return number.toLocaleString();
}

function formatDuration(seconds) {
	if (!seconds) return '00:00';

	const m = Math.floor(seconds / 60)
		.toString()
		.padStart(2, '0');

	const s = Math.floor(seconds % 60)
		.toString()
		.padStart(2, '0');

	return `${m}:${s}`;
}