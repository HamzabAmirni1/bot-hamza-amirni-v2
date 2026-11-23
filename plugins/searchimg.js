import axios from 'axios';
import { getSmartAIReply } from '../lib/gemini.js';

// Free high-speed image uploaders for reverse lookup
async function uploadToSavedly(buffer, ext = 'jpg') {
	const fd = new FormData();
	fd.append('file', new Blob([buffer], { type: 'image/jpeg' }), `image_${Date.now()}.${ext}`);
	const res = await axios.post('https://savedly.net/api/upload', fd, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
			'Origin': 'https://savedly.net',
			'Referer': 'https://savedly.net/'
		},
		timeout: 15000
	});
	const data = res.data;
	const id = data?.id || String(data?.url || data?.link || '').match(/\/f\/([a-z0-9]+)/i)?.[1];
	if (id) return `https://cdn.savedly.net/${id}`;
	if (data?.url) return data.url;
	throw new Error('Upload failed');
}

async function uploadToTmpfiles(buffer, ext = 'jpg') {
	const FormDataNode = (await import('form-data')).default;
	const form = new FormDataNode();
	form.append('file', buffer, { filename: `search_${Date.now()}.${ext}`, contentType: 'image/jpeg' });
	const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
		headers: form.getHeaders(),
		timeout: 15000
	});
	if (res.data?.status === 'success' && res.data?.data?.url) {
		// Convert tmpfiles.org/123/file.jpg to direct tmpfiles.org/dl/123/file.jpg
		return res.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
	}
	throw new Error('tmpfiles failed');
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const quoted = m.quoted ? m.quoted : m;
	const mime = (quoted.msg || quoted).mimetype || '';

	if (!mime || !mime.startsWith('image')) {
		return m.reply(
			`🔍 *البحث العكسي عن الصور (Reverse Image Search / Google Lens)*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			`ابحث عن أصل أي صورة، الأشخاص أو المنتجات المشابهة لها على الإنترنت عبر محركات البحث العالمية.\n\n` +
			`📌 *طريقة الاستعمال:*\n` +
			`1. أرسل صورة مع كتابة: *${usedPrefix + command}*\n` +
			`2. أو قم بالرد (Reply) على أي صورة واكتب: *${usedPrefix + command}*\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	await m.react('🔍');
	await m.reply('⏳ *جاري فحص الصورة والبحث عن مصادرها وشبيهاتها...*');

	let imgBuffer = null;
	try {
		imgBuffer = await quoted.download();
	} catch (err) {
		await m.react('❌');
		return m.reply('❌ تعذر تحميل الصورة من واتساب. حاول مجدداً.');
	}

	if (!imgBuffer || imgBuffer.length < 500) {
		await m.react('❌');
		return m.reply('❌ ملف الصورة غير صالح.');
	}

	// 1. Upload image to get public URL for Google Lens & Yandex
	let publicUrl = null;
	try {
		publicUrl = await uploadToTmpfiles(imgBuffer);
	} catch (_) {
		try {
			publicUrl = await uploadToSavedly(imgBuffer);
		} catch (_) {}
	}

	// 2. Generate search engine deep links
	const googleLensUrl = publicUrl
		? `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(publicUrl)}`
		: `https://images.google.com/`;

	const yandexUrl = publicUrl
		? `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(publicUrl)}`
		: `https://yandex.com/images/`;

	const bingUrl = publicUrl
		? `https://www.bing.com/images/searchbyimage?cbir=sbi&imgurl=${encodeURIComponent(publicUrl)}`
		: `https://www.bing.com/visualsearch`;

	// 3. AI analysis of the image topic
	let aiAnalysis = '';
	try {
		const aiPrompt = `قم بتحليل ما تحتويه هذه الصورة واذكر أهم الكلمات المفتاحية للبحث عنها: ${text || 'أعطني ملخص لما يظهر في الصورة وأين يمكن العثور عليها'}`;
		aiAnalysis = await getSmartAIReply(aiPrompt);
	} catch (_) {}

	const caption =
		`🔍 *نتائج البحث عن الصورة (Visual Search)*\n` +
		`━━━━━━━━━━━━━━━━━━━━\n` +
		(publicUrl ? `🌐 *رابط الصورة المرفوعة:*\n${publicUrl}\n\n` : '') +
		`🔗 *محركات البحث العكسي المباشرة:*\n` +
		`• 🔎 *Google Lens:* \n${googleLensUrl}\n\n` +
		`• 🇷🇺 *Yandex Visual:* \n${yandexUrl}\n\n` +
		`• 🟦 *Bing Visual Search:* \n${bingUrl}\n` +
		`━━━━━━━━━━━━━━━━━━━━\n` +
		(aiAnalysis ? `💡 *تحليل الذكاء الاصطناعي لمحتوى الصورة:*\n${aiAnalysis.slice(0, 500)}\n\n` : '') +
		`⚡ *bot amirni hamza*`;

	await m.react('✅');
	return m.reply(caption);
};

handler.help = ['searchimg', 'googlelens'];
handler.tags = ['tools', 'search'];
handler.command = /^(searchimg|reverseimg|googlelens|lens|قلب)$/i;

export default handler;
