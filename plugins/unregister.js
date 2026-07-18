import { createHash } from 'crypto';

let handler = async function (m, { args }) {
	if (!args[0]) throw 'Serial Number is empty';

	let user = global.db.data.users[m.sender];
	let sn = createHash('md5').update(m.sender).digest('hex');

	if (args[0] !== sn) throw 'Wrong Serial Number';

	user.registered = false;

	m.reply('```Successfully Unregistered!```');
};

handler.help = ['unregister'];
handler.tags = ['infobot'];
handler.command = /^unreg(ister)?$/i;
handler.register = false;
export default handler;