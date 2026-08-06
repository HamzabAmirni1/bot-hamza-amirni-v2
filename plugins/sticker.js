let handler = async (m, { conn, text }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';

	let q = m.quoted ? m.quoted : m;
	let mime = (q.msg || q).mimetype || '';

	if (/image|video|webp/.test(mime)) {
		if ((q.msg?.seconds || q.seconds) > 10) {
			const limitMsg = lang === 'english'
				? '❌ Video must be under 10 seconds long.'
				: lang === 'arabic'
				? '❌ يجب أن يكون الفيديو أقل من 10 ثوانٍ.'
				: '❌ خاص الفيديو يكون أقل من 10 ثواني أ عشيري.';
			return m.reply(limitMsg);
		}

		let media = await q.download();
		let exif;
		if (text) {
			const [packname, author] = text.split(/[,|\-+&]/);
			exif = { packName: packname || '', packPublish: author || '' };
		}
		conn.sendSticker(m.chat, media, m, exif);
	} else {
		const instruction = lang === 'english'
			? '🖼️ *Sticker Maker*\n\nSend or reply to an image or video to turn it into a sticker!'
			: lang === 'arabic'
			? '🖼️ *صانع الملصقات*\n\nأرسل أو رد على صورة أو فيديو قصير لتحويله إلى ملصق!'
			: '🖼️ *صانع الملصقات (Sticker)*\n\nصيفط صورة ولا فيديو قصير ولا ريبوندي عليه باش نرجعو ليك ستيكر ناضي! 🚀';
		m.reply(instruction);
	}
};

handler.help = ['sticker'];
handler.tags = ['sticker'];
handler.command = /^(s(tic?ker)?(gif)?|ستيكر|ملصق|ملصقات)$/i;
handler.register = false;

export default handler;