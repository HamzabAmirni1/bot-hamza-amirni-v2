let handler = async (m, { text }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let who;
	if (m.isGroup) who = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
	else who = m.chat;

	if (!who) {
		throw t(
			'❌ Please mention a user or reply to their message to unban them!',
			'❌ يرجى منشنة مستخدم أو الرد على رسالته لإلغاء حظره!',
			'❌ طاقي شي حد ولا ريبوندي على الميساج ديالو باش تحيد ليه الحظر!'
		);
	}

	if (!global.db.data.users[who]) global.db.data.users[who] = {};
	global.db.data.users[who].banned = false;

	m.reply(t(
		`✅ User *@${who.split('@')[0]}* has been unbanned.`,
		`✅ تم إلغاء حظر المستخدم *@${who.split('@')[0]}* بنجاح.`,
		`✅ تم إلغاء حظر المستخدم *@${who.split('@')[0]}* بنجاح.`
	));
};
handler.help = ['unban'];
handler.tags = ['owner'];
handler.command = /^unban(user)?$/i;
handler.owner = true;

export default handler;
