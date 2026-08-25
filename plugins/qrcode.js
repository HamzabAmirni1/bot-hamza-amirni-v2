let handler = async (m, { conn, text, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';

	if (!text) {
		const promptMsg = lang === 'english'
			? `📱 *QR Code Generator*\n\nUsage:\n${usedPrefix + command} <text or link>\n\n*Example:*\n${usedPrefix + command} https://wa.me/212624855939`
			: lang === 'arabic'
			? `📱 *مولّد رمز QR*\n\nالاستخدام:\n← ${usedPrefix + command} <نص أو رابط>\n\n*مثال:*\n← ${usedPrefix + command} https://wa.me/212624855939`
			: `📱 *صنع رمز QR*\n\nالاستخدام:\n← ${usedPrefix + command} <نص ولا رابط>\n\n*مثال:*\n← ${usedPrefix + command} https://wa.me/212624855939`;
		return m.reply(promptMsg);
	}

	await m.react('📱');
	conn.sendFile(
		m.chat,
		`https://quickchart.io/qr?text=${encodeURIComponent(text)}`,
		'qrcode.png',
		lang === 'english' ? '✅ Here is your QR Code!' : lang === 'arabic' ? '✅ هذا رمز QR الخاص بك!' : '✅ هاذا رمز QR ديالك! 🚀',
		m
	);
};

handler.help = ['qrcode'];
handler.tags = ['tools'];
handler.command = /^qr(code)?$/i;
export default handler;