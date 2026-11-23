import { getSmartAIReply } from '../lib/gemini.js';
import { default as ocrSpace } from 'axios';

const LEVELS = {
	'ابتدائي': 'المستوى الابتدائي (شرح مبسط جداً، كلمات سهلة، أمثلة مصورة وواضحة)',
	'اعدادي': 'المستوى الإعدادي (السنة 1، 2، أو 3 إعدادي - تركيز على المفاهيم الأساسية، القواعد، وأسئلة الامتحانات المحلية والجهوية)',
	'ثانوي': 'المستوى الثانوي التأهيلي (الجذع المشترك أو 1 باك - تحليل عميق، مصطلحات علمية دقيقة، ومنهجية واضحة)',
	'باك': 'مستوى الباكالوريا (2 باك - تركيز كامل على الإطار المرجعي للامتحان الوطني، خلاصات مركزة، القواعد الأساسية، ونصائح لنيل أعلى نقطة)',
	'جامعة': 'المستوى الجامعي والتعليم العالي (صياغة أكاديمية راقية، مراجع، مصطلحات تخصصية، وتحليل علمي شامل)'
};

function detectLevel(txt) {
	const t = txt.toLowerCase();
	if (t.includes('ابتدائي') || t.includes('primaire')) return 'ابتدائي';
	if (t.includes('اعدادي') || t.includes('إعدادي') || t.includes('college')) return 'اعدادي';
	if (t.includes('ثانوي') || t.includes('lycee') || t.includes('1bac') || t.includes('جذع')) return 'ثانوي';
	if (t.includes('باك') || t.includes('bac') || t.includes('وطني') || t.includes('2bac')) return 'باك';
	if (t.includes('جامع') || t.includes('fac') || t.includes('univ') || t.includes('licence') || t.includes('master')) return 'جامعة';
	return 'باك'; // Default to Bac if not specified
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const quoted = m.quoted ? m.quoted : m;
	const mime = (quoted.msg || quoted).mimetype || '';

	let inputText = text || '';
	let fromImage = false;

	// Check if user quoted or sent an image containing text/lesson
	if (mime && mime.startsWith('image')) {
		await m.react('📷');
		await m.reply('🔍 *جاري قراءة محتوى الدرس من الصورة واستخراج النص...*');
		try {
			const buf = await quoted.download();
			if (buf && buf.length > 500) {
				const fd = new (await import('form-data')).default();
				fd.append('base64Image', 'data:image/jpeg;base64,' + buf.toString('base64'));
				fd.append('language', 'ara');
				fd.append('isOverlayRequired', 'false');

				const ocrRes = await ocrSpace.post('https://api.ocr.space/parse/image', fd, {
					headers: { ...fd.getHeaders(), apikey: 'helloworld' },
					timeout: 20000
				});
				const parsed = ocrRes.data?.ParsedResults?.[0]?.ParsedText;
				if (parsed && parsed.trim().length > 10) {
					inputText = (text ? text + '\n\n' : '') + parsed.trim();
					fromImage = true;
				}
			}
		} catch (err) {
			console.log('[resume] OCR failed, falling back to prompt title:', err.message);
		}
	} else if (!inputText && m.quoted?.text) {
		inputText = m.quoted.text;
	}

	if (!inputText) {
		return m.reply(
			`📚 *مساعد تلخيص الدروس لجميع المستويات (.resume)*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			`لخص أي درس أو مقرر دراسي بالذكاء الاصطناعي بطريقة مركزة ومناسبة للامتحانات.\n\n` +
			`📌 *طريقة الاستعمال:*\n` +
			`← ${usedPrefix + command} [المستوى] [اسم الدرس أو النص]\n\n` +
			`💡 *أمثلة:* \n` +
			`• \`${usedPrefix + command} باك درس الموجات الميكانيكية المتوالية\`\n` +
			`• \`${usedPrefix + command} اعدادي درس الجهاز العضلي\`\n` +
			`• \`${usedPrefix + command} باك فلسفة مفهوم الغير\`\n` +
			`• أو قم بالرد (Reply) على صورة درس أو فقرة واكتب: *${usedPrefix + command} باك*\n\n` +
			`🎓 *المستويات المتاحة:* ابتدائي | اعدادي | ثانوي | باك | جامعة\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	await m.react('⏳');

	const levelKey = detectLevel(inputText);
	const levelDesc = LEVELS[levelKey];

	const systemPrompt =
		`أنت أستاذ وخبير تربوي متميز في التعليم المغربي والعربي. ` +
		`مهمتك هي كتابة ملخص ممتاز واحترافي وشامل للدرس المطلوب. ` +
		`المستوى الدراسي المطلوب مراعاته: ${levelDesc}. ` +
		`قواعد التلخيص:\n` +
		`1. تنظيم وتنسيق فائق بالعناوين والرموز التعبيرية والنقاط المحددة.\n` +
		`2. الفكرة العامة وأهداف الدرس الأساسية.\n` +
		`3. المحاور الرئيسية للدرس مع شرح مركز وقوانين/قواعد لا غنى عنها.\n` +
		`4. المفاهيم والمصطلحات الأساسية التي تتكرر في الامتحانات.\n` +
		`5. نصائح وتوجيهات ذهبية للتفوق والإجابة في الفروض والامتحانات.\n` +
		`اكتب باللغة العربية الواضحة والفصيحة والمبسطة، مع المصطلحات العلمية بالفرنسية بين قوسين إذا كانت مادة علمية.`;

	const userPrompt = `يرجى تقديم ملخص شامل ومركز ومتقن للدرس التالي:\n\n${inputText}`;

	try {
		const reply = await getSmartAIReply(userPrompt, { systemPrompt });
		await m.react('✅');

		const header =
			`📚 *ملخص الدرس الذكي (${levelKey.toUpperCase()})*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			(fromImage ? `📸 _(تم استخراج النص وتلخيصه من الصورة بنجاح)_\n\n` : '');

		const footer = `\n━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza • رفيقك نحو التفوق والنجاح*`;

		return m.reply(header + reply + footer);
	} catch (err) {
		await m.react('❌');
		return m.reply(`❌ تعذر تلخيص الدرس حالياً: ${err.message}`);
	}
};

handler.help = ['resume <المستوى> <اسم الدرس>'];
handler.tags = ['education', 'ai'];
handler.command = /^(resume|talkhis|darsai|تلخيص|لخص)$/i;

export default handler;
