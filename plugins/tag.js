let handler = async (m, { conn, participants }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let users = participants.map((u) => u.id).filter((v) => v !== conn.user.jid);
	if (!m.quoted) {
		throw t(
			'❌ Please reply to a message you want to tag everyone with!',
			'❌ يرجى الرد على الرسالة التي تريد المنشن عليها للجميع!',
			'❌ ريبوندي على الميساج اللي بغيتي تبارتاژيه مع كاع الأعضاء!'
		);
	}

	conn.sendMessage(m.chat, { forward: m.quoted.fakeObj, mentions: users });
};

handler.help = ['tag'];
handler.tags = ['group'];
handler.command = /^(totag|tag)$/i;

handler.admin = true;
handler.group = true;

export default handler;