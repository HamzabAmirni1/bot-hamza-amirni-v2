let handler = async (m, { conn, text, usedPrefix, command }) => {
	if (!text) {
		return conn.reply(
			m.chat,
			`Usage example:\n${usedPrefix + command} <text>`,
			m
		);
	}

	conn.sendFile(
		m.chat,
		`https://quickchart.io/qr?text=${encodeURIComponent(text)}`,
		'qrcode.png',
		'¯\\_(ツ)_/¯',
		m
	);
};

handler.help = ['qrcode'];
handler.tags = ['tools'];
handler.command = /^qr(code)?$/i;
export default handler;