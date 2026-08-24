let handler = async (m, { usedPrefix, command, text }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!text) {
		throw t(
			`📌 *Usage:*\n${usedPrefix + command} <text>\n\nExample:\n${usedPrefix + command} Welcome @user to @subject!\n\nVariables:\n@user = Mention User\n@subject = Group Name\n@desc = Group Description`,
			`📌 *طريقة الاستخدام:*\n← ${usedPrefix + command} <النص>\n\n*مثال:*\n← ${usedPrefix + command} مرحباً بك @user في مجموعتنا @subject!\n\nالمتغيرات:\n@user = منشن المستخدم\n@subject = اسم المجموعة\n@desc = وصف المجموعة`,
			`📌 *طريقة الاستعمال:*\n← ${usedPrefix + command} <النص>\n\n*مثال:*\n← ${usedPrefix + command} مرحباً بيك @user فـ @subject!\n\nالمتغيرات:\n@user = منشن الشخص\n@subject = سمية الجروب\n@desc = وصف الجروب`
		);
	}

	let chat = global.db.data.chats[m.chat];

	switch (command.toLowerCase()) {
		case 'setwelcome':
			chat.sWelcome = text;
			m.reply(t('✅ Welcome message set:\n' + text, '✅ تم ضبط رسالة الترحيب:\n' + text, '✅ تم حفظ ميساج الترحيب:\n' + text));
			break;
		case 'setbye':
			chat.sBye = text;
			m.reply(t('✅ Goodbye message set:\n' + text, '✅ تم ضبط رسالة المودع:\n' + text, '✅ تم حفظ ميساج المغادرة:\n' + text));
			break;
		case 'setpromote':
			chat.sPromote = text;
			m.reply(t('✅ Promote message set:\n' + text, '✅ تم ضبط رسالة الترقية:\n' + text, '✅ تم حفظ ميساج الترقية لـ أدمن:\n' + text));
			break;
		case 'setdemote':
			chat.sDemote = text;
			m.reply(t('✅ Demote message set:\n' + text, '✅ تم ضبط رسالة الإنزال:\n' + text, '✅ تم حفظ ميساج التنزيل من الأدمن:\n' + text));
			break;
	}
};

handler.help = ['setwelcome', 'setbye', 'setpromote', 'setdemote'];
handler.tags = ['owner'];
handler.command = /^(setwelcome|setbye|setpromote|setdemote)$/i;
handler.group = true;
handler.admin = true;
handler.owner = true;

export default handler;