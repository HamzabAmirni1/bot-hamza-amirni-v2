let handler = async (m) => {
	let totalreg = Object.keys(global.db.data.users).length;
	let rtotalreg = Object.values(global.db.data.users).filter((user) => user.registered == true).length;
	let kon = `乂 *U S E R*
    
╭╾• *Current Database ${totalreg} Users*
=
╰╾• *Currently Registered ${rtotalreg} Users*`;
	await m.reply(kon);
};
handler.help = ['totaluser'];
handler.tags = ['infobot'];
handler.command = /^(totaluser)$/i;
export default handler;