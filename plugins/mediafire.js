import * as cheerio from 'cheerio';

const mediaRegex = /https?:\/\/(www\.)?mediafire\.com\/(file|folder)\/(\w+)/;

let handler = async (m, { conn, text, usedPrefix, command }) => {
	if (!text)
		throw `Example:\n${usedPrefix}${command} https://www.mediafire.com/file/941xczxhn27qbby/GBWA_V12.25FF-By.SamMods-.apk/file`;

	if (!mediaRegex.test(text))
		throw 'Invalid link! Make sure the MediaFire link is correct.';

	try {
		let res = await mediafire(text);

		let caption = `
*💌 Name:* ${res.filename}
*📊 Size:* ${res.sizeReadable}
*🗂️ File Type:* ${res.filetype}
*📦 Mime Type:* ${res.mimetype}
*🔐 Privacy:* ${res.privacy}
*👤 Owner:* ${res.owner_name}
`.trim();

		await m.reply(caption);

		await conn.sendMessage(
			m.chat,
			{
				document: { url: res.download },
				fileName: res.filename,
				mimetype: res.mimetype,
			},
			{ quoted: m }
		);
	} catch (e) {
		console.error(e);
		m.reply('Failed to fetch file from MediaFire.');
	}
};

handler.help = ['mediafire'];
handler.tags = ['downloader'];
handler.command = /^(mediafire|mf)$/i;
handler.limit = false;

export default handler;

async function mediafire(url) {
	const match = mediaRegex.exec(url);

	if (!match) throw 'Invalid URL!';

	const id = match[3];

	const response = await fetch(url);
	const html = await response.text();

	const $ = cheerio.load(html);

	const download = $('a#downloadButton').attr('href');

	if (!download)
		throw 'Failed to get download link from MediaFire page.';

	const infoResponse = await fetch(
		`https://www.mediafire.com/api/1.5/file/get_info.php?response_format=json&quick_key=${id}`
	);

	const json = await infoResponse.json();

	if (json.response.result !== 'Success')
		throw 'Failed to fetch file information.';

	const info = json.response.file_info;

	const size = parseInt(info.size);
	const ext = info.filename.split('.').pop();

	return {
		filename: info.filename,
		ext: ext,
		size: size,
		sizeReadable: formatBytes(size),
		download: download,
		filetype: info.filetype,
		mimetype: info.mimetype || `application/${ext}`,
		privacy: info.privacy,
		owner_name: info.owner_name,
	};
}

function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;

	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat(
		(bytes / Math.pow(k, i)).toFixed(dm)
	)} ${sizes[i]}`;
}