let handler = async (m) => {
	let hash;
	if (m.quoted && m.quoted.fileSha256) hash = m.quoted.fileSha256;
	if (!hash) throw `No hash found`;
	let sticker = global.db.data.sticker;
	if (sticker[hash] && sticker[hash].locked) throw 'You do not have permission to delete this sticker command';
	delete sticker[hash];
	m.reply(`Success!`);
};

handler.help = ['delcmd'];
handler.tags = ['database'];
handler.command = ['delcmd'];

export default handler;