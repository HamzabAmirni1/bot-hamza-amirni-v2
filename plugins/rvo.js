let handler = async (m) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!m.quoted) {
		return m.reply(t(
			'❌ Reply to a view-once image or video to reveal it!',
			'❌ رد على صورة أو فيديو مشاهدة مرة واحدة لكشفها!',
			'❌ ريبوندي على صورة ولا فيديو "مرة واحدة" باش تبانو!'
		));
	}

	if (m.quoted.mediaMessage?.[m.quoted?.mediaType]?.viewOnce) {
		let msg = await m.getQuotedObj()?.message;
		let type = Object.keys(msg)[0];
		let media = (await m.quoted?.download()) || (await m.getQuotedObj().download());

		if (!media) {
			return m.reply(t(
				'❌ Failed to download the media!',
				'❌ فشل تحميل الوسائط!',
				'❌ ما قدرناش تحميل الميديا!'
			));
		}

		await conn.sendFile(m.chat, media, 'rvo.mp4', msg[type]?.caption || '', m);
	} else {
		m.reply(t(
			'⚠️ This is not a view-once message!',
			'⚠️ هذه ليست رسالة مشاهدة مرة واحدة!',
			'⚠️ هاد الميساج مشي "مرة واحدة"!'
		));
	}
};

handler.help = ['rvo'];
handler.tags = ['tools'];
handler.command = /^rvo|read/i;
handler.register = false;

export default handler;