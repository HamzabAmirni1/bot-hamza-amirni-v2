let handler = async (m, { text }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let user = global.db.data.users[m.sender];
	user.afk = +new Date();
	user.afkReason = text;

	const name = conn.getName(m.sender);
	m.reply(t(
		`😴 *${name}* is now AFK${text ? '\n📝 Reason: ' + text : ''}`,
		`😴 *${name}* في وضع AFK الآن${text ? '\n📝 السبب: ' + text : ''}`,
		`😴 *${name}* دير AFK الدرك${text ? '\n📝 السبب: ' + text : ''}`
	));
};

handler.help = ['afk [reason]'];
handler.tags = ['main'];
handler.command = /^afk$/i;

export default handler;
