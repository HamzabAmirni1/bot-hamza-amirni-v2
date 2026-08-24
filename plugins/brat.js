let handler = async (m, { text, conn }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!text) {
		throw t(
			'📌 *Usage:*\n.brat <text>\n\nExample:\n.brat hamza amirni',
			'📌 *طريقة الاستخدام:*\n← .brat <النص>\n\n*مثال:*\n← .brat حمزة اعمرني',
			'📌 *طريقة الاستعمال:*\n← .brat <النص>\n\n*مثال:*\n← .brat حمزة اعمرني'
		);
	}

	try {
		await m.react('🎨');
		const url = 'https://shinana-brat.hf.space/?text=' + encodeURIComponent(text);
		conn.sendSticker(m.chat, url, m);
	} catch (e) {
		console.error(e);
		m.reply(t(
			'❌ Failed to generate brat sticker. Please try again!',
			'❌ فشل في إنشاء الملصق. حاول مرة أخرى!',
			'❌ ما قدرناش نصاوبو الستيكر. حاول من جديد!'
		));
	}
};

handler.help = ['brat'];
handler.tags = ['ai', 'sticker'];
handler.command = /^brat$/i;
handler.register = false;

export default handler;