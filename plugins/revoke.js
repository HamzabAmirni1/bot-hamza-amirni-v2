let handler = async (m, { command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (command === 'linkgc') {
		const link = 'https://chat.whatsapp.com/' + (await conn.groupInviteCode(m.chat));
		m.reply(t(
			`🔗 *Group Link:*\n${link}`,
			`🔗 *رابط المجموعة:*\n${link}`,
			`🔗 *رابط الجروب:*\n${link}`
		));
	}

	if (command === 'revoke') {
		const newLink = 'https://chat.whatsapp.com/' + (await conn.groupRevokeInvite(m.chat));
		m.reply(t(
			`✅ *Group link reset successfully!*\n\n🔗 New Link:\n${newLink}`,
			`✅ *تم إعادة تعيين رابط المجموعة بنجاح!*\n\n🔗 الرابط الجديد:\n${newLink}`,
			`✅ *تم تغيير رابط الجروب بنجاح!*\n\n🔗 الرابط الجديد:\n${newLink}`
		));
	}
};

handler.help = ['revoke', 'linkgc'];
handler.tags = ['group'];
handler.command = /^(linkgc|revoke)$/i;
handler.admin = true;
handler.group = true;
handler.botAdmin = true;

export default handler;
