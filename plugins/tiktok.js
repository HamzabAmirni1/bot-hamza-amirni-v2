let handler = async (m, { text, usedPrefix, command }) => {
	try {
		const input = m.quoted ? m.quoted.text : text;
		const regex = /(https:\/\/(vt|vm)\.tiktok\.com\/[^\s]+|https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+)/;

		const parseUrl = input.match(regex)?.[0];
		if (parseUrl) {
			m.react('🔁');
			let res = await (await fetch(`https://www.tikwm.com/api/?url=${parseUrl}&hd=1`)).json();
			if (!res || !res.data) 'Failed to retrieve data from TikTok.';

			let data = res.data;
			await m.reply(`# *TIKTOK DOWNLOADER*

> *Title*: ${data.title}
> *Region*: ${data.region}
> *Duration*: ${formatDuration(data.duration)}
> *Views*: ${formatNumber(data.play_count)}
> *Comments*: ${formatNumber(data.comment_count)}
> *Shares*: ${formatNumber(data.share_count)}
> *Uploader*: ${data.author.nickname || data.author.unique_id}

Sending.....`);

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

			if (data.music_info.play) {
				await conn.sendMessage(
					m.chat,
					{
						audio: { url: data.music_info.play },
						mimetype: 'audio/mpeg',
						fileName: `${data.title}.mp3`,
					},
					{ quoted: m }
				);
			} else {
				m.reply('Music not found, only the media will be sent.');
			}
		} else if (input) {
			let search = await (await fetch(`https://www.tikwm.com/api/feed/search?keywords=${input}&count=1&cursor=0&web=1&hd=1`)).json();
			let video = search?.data?.videos[0];
			if (!video) throw `Video not found for search "${input}".`;

			let caption = `# *TIKTOK PLAYER*

> *Title:* ${video.title}
> *Region:* ${video.region}
> *Duration:* ${formatDuration(video.duration)}
> *Views:* ${formatNumber(video.play_count)}
> *Comments:* ${formatNumber(video.comment_count)}
> *Shares:* ${formatNumber(video.share_count)}
> *Uploader:* ${video.author.nickname || video.author.unique_id}
`.trim();

			conn.sendFile(m.chat, 'https://www.tikwm.com' + video.play, '', caption, m);
		} else {
			let cmd = usedPrefix + command;
			m.reply(`*TIKTOK DOWNLOADER*
> _*• Search:*_ \`${cmd} [query]\`
> _*• Download:*_ \`${cmd} [link]\`

*E X A M P L E:*
> *• ${cmd}* cosplayer
> *• ${cmd}* \`https://vt.tiktok.com/xxxxx\``);
		}
	} catch (err) {
		console.error(err);
		return m.reply('An error occurred while processing the request');
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