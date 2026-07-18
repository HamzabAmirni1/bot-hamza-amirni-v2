let handler = async (m, { text, usedPrefix, command }) => {
	if (!m.quoted) throw `Reply to a sticker with the command *${usedPrefix + command}*`;
	if (!m.quoted.fileSha256) throw 'SHA256 Hash Missing';
	if (!text) throw `Usage:\n${usedPrefix + command} <text>\n\nExample:\n${usedPrefix + command} test`;

	let sticker = db.data.sticker;
	let hash = m.quoted.fileSha256;

	if (sticker[hash] && sticker[hash].locked)
		throw 'You do not have permission to change this sticker command';

	sticker[hash] = {
		text,
		mentionedJid: m.mentionedJid,
		creator: m.sender,
		at: Date.now(),
		locked: false,
	};

	m.reply(`Success!`);
};

handler.help = ['setcmd'];
handler.tags = ['database'];
handler.command = ['setcmd'];

export default handler;