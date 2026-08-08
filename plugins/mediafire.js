import * as cheerio from 'cheerio';
import { assertFileSizeOk } from '../lib/checkFileSize.js';

const mediaRegex = /https?:\/\/(www\.)?mediafire\.com\/(file|folder)\/(\w+)/;

let handler = async (m, { conn, text, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	if (!text)
		throw t(
			`Example:\n← ${usedPrefix}${command} https://www.mediafire.com/file/941xczxhn27qbby/file`,
			`مثال:\n← ${usedPrefix}${command} https://www.mediafire.com/file/941xczxhn27qbby/file`,
			`مثال:\n← ${usedPrefix}${command} https://www.mediafire.com/file/941xczxhn27qbby/file`
		);

	if (!mediaRegex.test(text))
		throw t('Invalid link! Make sure the MediaFire link is correct.', 'الرابط غير صالح! تأكد من صحة رابط ميديافاير.', 'الرابط ماصحيحش! تحقق من رابط ميديافاير.');

	try {
		await m.react('📥');
		let res = await mediafire(text);

		let caption = `
📁 *${t('Name', 'الاسم', 'الاسم')}:* ${res.filename}
📊 *${t('Size', 'الحجم', 'الحجم')}:* ${res.sizeReadable}
🗂️ *${t('File Type', 'نوع الملف', 'نوع الملف')}:* ${res.filetype}
📦 *Mime Type:* ${res.mimetype}
🔐 *${t('Privacy', 'الخصوصية', 'الخصوصية')}:* ${res.privacy}
👤 *${t('Owner', 'المالك', 'المالك')}:* ${res.owner_name}
`.trim();

		await m.reply(caption);

		const sizeOk = await assertFileSizeOk(res.download, m, lang, 300 * 1024 * 1024);
		if (!sizeOk) return;

		await conn.sendMessage(
			m.chat,
			{
				document: { url: res.download },
				fileName: res.filename,
				mimetype: res.mimetype,
			},
			{ quoted: m }
		);
		await m.react('✅');
	} catch (e) {
		console.error(e);
		await m.react('❌');
		m.reply(t('Failed to fetch file from MediaFire.', 'فشل جلب الملف من ميديافاير.', 'ماقدرناش نجيبو الملف من ميديافاير.'));
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