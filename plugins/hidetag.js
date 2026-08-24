let handler = async (m, { conn, text, participants }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!text) {
		return m.reply(t(
			'📣 *Hidetag*\n\nMention all members silently!\n\nUsage:\n← .hidetag <message>',
			'📣 *منشن خفي*\n\nاذكر كل الأعضاء بدون إشعار!\n\nالاستخدام:\n← .hidetag <الرسالة>',
			'📣 *طاق الجميع بخفية*\n\nطاقي جميع الأعضاء بدون ما يتبانو!\n\nالاستخدام:\n← .hidetag <المسج>'
		));
	}

	conn.reply(m.chat, text, m, { mentions: participants.map((a) => a.id) });
};

handler.help = ['hidetag'];
handler.tags = ['group'];
handler.command = /^(hidetag)$/i;
handler.group = true;
handler.admin = true;

export default handler;
