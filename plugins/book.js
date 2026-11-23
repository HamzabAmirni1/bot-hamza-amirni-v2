import { getSmartAIReply } from '../lib/gemini.js';

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const query = text || m.quoted?.text || '';

	if (!query) {
		return m.reply(
			`📖 *ملخص ومراجعة الكتب الذكية (.book)*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			`لخص أي كتاب، رواية، أو مرجع فكري وعلمي بالذكاء الاصطناعي مع أهم الدروس المستفادة والاقتباسات.\n\n` +
			`📌 *طريقة الاستعمال:*\n` +
			`← ${usedPrefix + command} <اسم الكتاب أو المؤلف>\n\n` +
			`💡 *أمثلة:* \n` +
			`• \`${usedPrefix + command} العادات الذرية\`\n` +
			`• \`${usedPrefix + command} الأب الغني والأب الفقير\`\n` +
			`• \`${usedPrefix + command} قواعد العشق الأربعون\`\n` +
			`• \`${usedPrefix + command} سيكولوجية الجماهير غوستاف لوبون\`\n` +
			`• \`${usedPrefix + command} The 48 Laws of Power\`\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	await m.react('📖');
	await m.reply(`⏳ *جاري تلخيص وقراءة أهم أفكار كتاب:* "${query}"...`);

	const systemPrompt =
		`أنت قارئ موسوعي ومراجع كتب محترف. مهمتك تقديم تلخيص تنفيذي عميق وشامل وممتع للكتاب المطلوب باللغة العربية الواضحة والمبسطة. ` +
		`قم بتنسيق التلخيص بشكل جذاب واحترافي كما يلي:\n` +
		`1. 📖 *بطاقة الكتاب:* اسم الكتاب، المؤلف، وسنة الإصدار ونوعه الأساسي.\n` +
		`2. 🎯 *الفكرة الجوهرية (Core Thesis):* ما هي الرسالة الأهم التي يريد الكاتب إيصالها في 3 أسطر.\n` +
		`3. 🔑 *أهم 5 خلاصات ودروس عملية (Key Takeaways):* أفكار رئيسية قابلة للتطبيق الفوري في الحياة أو العمل.\n` +
		`4. 💬 *أشهر اقتباس ملهم من الكتاب:*\n` +
		`5. 🌟 *لمن يوصى بقراءة هذا الكتاب؟* (الفئة المستهدفة ولماذا يستحق وقتك).\n` +
		`اجعل التلخيص غنياً بالفائدة وممتع القراءة.`;

	const userPrompt = `قدم لي ملخصاً تنفيذياً شاملاً وعميقاً لكتاب: "${query}".`;

	try {
		const reply = await getSmartAIReply(userPrompt, { systemPrompt });
		await m.react('✅');

		const fullReply =
			`📖 *ملخص كتاب: ${query}*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			reply +
			`\n━━━━━━━━━━━━━━━━━━━━\n` +
			`💡 *للتحميل المباشر للكتاب PDF:* اكتب \`.kitab ${query}\`\n` +
			`⚡ *bot amirni hamza • خير جليس في الزمان كتاب*`;

		return m.reply(fullReply);
	} catch (err) {
		await m.react('❌');
		return m.reply(`❌ تعذر تلخيص الكتاب حالياً: ${err.message}`);
	}
};

handler.help = ['book <اسم الكتاب>'];
handler.tags = ['education', 'tools'];
handler.command = /^(book|kitabsummary|talkhisktab|ملخص_كتاب|لخص_كتاب)$/i;

export default handler;
