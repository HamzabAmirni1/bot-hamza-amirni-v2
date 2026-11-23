import { getSmartAIReply } from '../lib/gemini.js';
import axios from 'axios';

async function uploadToTmp(buffer) {
	try {
		const FormDataNode = (await import('form-data')).default;
		const form = new FormDataNode();
		form.append('file', buffer, { filename: `prod_${Date.now()}.jpg`, contentType: 'image/jpeg' });
		const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
			headers: form.getHeaders(),
			timeout: 15000
		});
		if (res.data?.status === 'success' && res.data?.data?.url) {
			return res.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
		}
	} catch (_) {}
	return null;
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const quoted = m.quoted ? m.quoted : m;
	const mime = (quoted.msg || quoted).mimetype || '';

	let itemQuery = text || '';
	let uploadedUrl = null;

	if (mime && mime.startsWith('image')) {
		await m.react('🔍');
		await m.reply('📸 *جاري فحص صورة المنتج وتحديد الموديل ومقارنة الأسعار في المغرب والعالم...*');
		try {
			const buf = await quoted.download();
			if (buf) {
				uploadedUrl = await uploadToTmp(buf);
			}
		} catch (_) {}
	} else if (!itemQuery && m.quoted?.text) {
		itemQuery = m.quoted.text;
	}

	if (!itemQuery && !mime) {
		return m.reply(
			`🏷️ *كاشف أسعار المنتجات والسلع (.pricepic)*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			`صيفط تصويرة ديال أي منتج (سبرديلة، حوايج، تليفون، بيسي، ساعة، ريحة...) والبوت يجبد ليك سميتو وثمنو فـ المغرب (جديد ومستعمل) وفين كايتباع.\n\n` +
			`📌 *طريقة الاستعمال:*\n` +
			`1. أرسل صورة مع كتابة: *${usedPrefix + command}*\n` +
			`2. أو قم بالرد (Reply) على أي صورة واكتب: *${usedPrefix + command}*\n` +
			`3. أو اكتب اسم المنتج مباشرة:\n` +
			`← \`${usedPrefix + command} iPhone 14 Pro Max 256GB\`\n` +
			`← \`${usedPrefix + command} Nike Air Jordan 4 Retro\`\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	await m.react('💰');

	const systemPrompt =
		`أنت خبير أسعار وتسوق محترف في السوق المغربي (e-commerce, Avito, Marjane, Derb Ghallef, Jumia, Electroplanet) والأسواق العالمية. ` +
		`المستخدم يسأل عن سعر وقيمة منتج معين سواء من خلال صورته أو اسمه. ` +
		`قم بإعداد تقرير تسعير شامل ومرتب بالدارجة المغربية المفهومة مع العربية الفصحى يتضمن:\n` +
		`1. 🏷️ اسم وموديل المنتج بدقة والماركة المصنعة.\n` +
		`2. 🇲🇦 السعر التقريبي في المغرب بالدرهم (MAD):\n` +
		`   - ثمن الجديد (Neuf / Emballé).\n` +
		`   - ثمن المستعمل النقي (Occasion / Bon état).\n` +
		`3. 💵 السعر العالمي بالدولار ($) أو الأورو (€).\n` +
		`4. 🛒 أشهر أماكن الشراء في المغرب (متاجر رسمية، أسواق معروفة، مواقع).\n` +
		`5. ⚠️ نصائح التحقق من الأصلي (Original) وتجنب التقليد (Fake / الشينوا).\n` +
		`كن دقيقاً وواقعياً في أثمنة السوق المغربي الحالية.`;

	const userPrompt = itemQuery
		? `ما هو السعر التقريبي وتفاصيل المنتج التالي في السوق المغربي والعالمي: "${itemQuery}"؟`
		: `بناءً على هذا المنتج المرفوع في الرابط (${uploadedUrl || 'صورة منتج تجاري معروض'}), ما هو اسمه، مواصفاته، وثمنه التقديري جديد ومستعمل بالدرهم المغربي؟`;

	try {
		const reply = await getSmartAIReply(userPrompt, { systemPrompt });
		await m.react('✅');

		const lensLink = uploadedUrl
			? `\n\n🔍 *البحث عن عروض بيع مطابقة في Google:*\nhttps://lens.google.com/uploadbyurl?url=${encodeURIComponent(uploadedUrl)}\n`
			: '';

		return m.reply(
			`💰 *تقرير تسعير وقيمة المنتج:*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			reply +
			lensLink +
			`\n━━━━━━━━━━━━━━━━━━━━\n` +
			`⚡ *bot amirni hamza • تسوق بذكاء وبأحسن ثمن*`
		);
	} catch (err) {
		await m.react('❌');
		return m.reply(`❌ تعذر جلب السعر حالياً: ${err.message}`);
	}
};

handler.help = ['pricepic <صورة أو اسم منتج>'];
handler.tags = ['shopping', 'tools'];
handler.command = /^(pricepic|price|thaman|chhal|ثمن|شحال)$/i;

export default handler;
