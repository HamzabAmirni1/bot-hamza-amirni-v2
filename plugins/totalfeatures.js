let handler = async (m) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let total = Object.values(global.plugins).filter((v) => v.help && v.tags).length;

	m.reply(t(
		`⚙️ *Bot Features Count*\n━━━━━━━━━━━━━━━━━━━━━\n🔢 *Total Active Commands:* ${total}\n\n⚡ *bot amirni hamza*`,
		`⚙️ *إحصائيات أوامر البوت*\n━━━━━━━━━━━━━━━━━━━━━\n🔢 *إجمالي الأوامر النشطة:* ${total}\n\n⚡ *bot amirni hamza*`,
		`⚙️ *إحصائيات أوامر البوت*\n━━━━━━━━━━━━━━━━━━━━━\n🔢 *مجموع الأوامر النشطة:* ${total}\n\n⚡ *bot amirni hamza*`
	));
};

handler.help = ['totalfeatures'];
handler.tags = ['infobot'];
handler.command = ['totalfeatures', 'feature'];

export default handler;