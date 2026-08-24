let handler = async (m) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	global.db.data.chats[m.chat].isBanned = true;
	m.reply(t(
		'🚫 *Bot successfully disabled in this chat.*',
		'🚫 *تم إيقاف البوت في هذه المجموعة بنجاح.*',
		'🚫 *تم إيقاف البوت فهاد الجروب بنجاح.*'
	));
};
handler.help = ['banchat'];
handler.tags = ['group'];
handler.command = /^(banchat)$/i;
handler.admin = true;
handler.group = true;
export default handler;
