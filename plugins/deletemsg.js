let handler = async (m, { conn, isAdmin, isBotAdmin, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';

	if (!m.quoted) return m.reply(
		lang === 'english'
			? `Reply to the message you want to delete with the caption ${usedPrefix + command}`
			: lang === 'arabic'
			? `رد على الرسالة التي تريد حذفها مع الأمر:\n← ${usedPrefix + command}`
			: `ريبوندي على الرسالة اللي بغيتي تمسحها مع:\n← ${usedPrefix + command}`
	);

	if (m.quoted.fromMe) {
		await m.quoted.delete();
	} else {
		if (!isBotAdmin) return global.dfail('botAdmin', m, conn);
		if (!isAdmin) return global.dfail('admin', m, conn);

		let participant = m.message.extendedTextMessage.contextInfo.participant;
		let messageId = m.message.extendedTextMessage.contextInfo.stanzaId;

		await conn.sendMessage(m.chat, {
			delete: {
				remoteJid: m.chat,
				fromMe: false,
				id: messageId,
				participant: participant
			}
		});
	}
};

handler.help = ['deletemsg'];
handler.tags = ['owner'];
handler.command = /^(del|deletemsg|removemsg?)$/i;
handler.owner = true;
export default handler;