let handler = async (m) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	global.db.data.chats[m.chat].isBanned = false;
	m.reply(t(
		'✅ *Bot successfully re-enabled in this chat.*',
		'✅ *تم إعادة تفعيل البوت في هذه المجموعة بنجاح.*',
		'✅ *تم إعادة تفعيل البوت فهاد الجروب بنجاح.*'
	));
};
handler.help = ['unbanchat'];
handler.tags = ['group'];
handler.command = /^(unbanchat|ubnc)$/i;
handler.admin = true;
handler.group = true;

export default handler;
