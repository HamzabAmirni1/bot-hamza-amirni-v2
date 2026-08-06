let handler = async (m, { text }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let who;
	if (m.isGroup) who = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
	else who = m.chat;

	if (!who) {
		throw t(
			'❌ Please mention a user or reply to their message to ban them!',
			'❌ يرجى منشنة مستخدم أو الرد على رسالته لحظره!',
			'❌ طاقي شي حد ولا ريبوندي على الميساج ديالو باش تحظرو!'
		);
	}

	if (!global.db.data.users[who]) global.db.data.users[who] = {};
	global.db.data.users[who].banned = true;

	m.reply(t(
		`🚫 User *@${who.split('@')[0]}* has been banned.`,
		`🚫 تم حظر المستخدم *@${who.split('@')[0]}* بنجاح.`,
		`🚫 تم حظر المستخدم *@${who.split('@')[0]}* بنجاح.`
	));
};
handler.help = ['ban'];
handler.tags = ['owner'];
handler.command = /^ban(user)?$/i;
handler.owner = true;

export default handler;
