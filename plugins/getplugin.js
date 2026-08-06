import cp, { exec as _exec } from 'child_process';
import { promisify } from 'util';
let exec = promisify(_exec).bind(cp);

let handler = async (m, { usedPrefix, command, text }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let ar = Object.keys(plugins);
	let ar1 = ar.map((v) => v.replace('.js', ''));

	if (!text) {
		throw t(
			`📌 *Usage:*\n${usedPrefix + command} <plugin_name>\n\nExample:\n${usedPrefix + command} menu`,
			`📌 *طريقة الاستخدام:*\n← ${usedPrefix + command} <اسم_الاضافة>\n\n*مثال:*\n← ${usedPrefix + command} menu`,
			`📌 *طريقة الاستعمال:*\n← ${usedPrefix + command} <سمية_البلاكن>\n\n*مثال:*\n← ${usedPrefix + command} menu`
		);
	}

	if (!ar1.includes(text)) {
		throw t(
			`❌ *Plugin not found! Available plugins:*\n${ar1.join(', ')}`,
			`❌ *الاضافة غير موجودة! الاضافات المتاحة:*\n${ar1.join(', ')}`,
			`❌ *البلاكن ما كاينش! البلاكنات المتاحة:*\n${ar1.join(', ')}`
		);
	}

	let o;
	try {
		o = await exec('cat plugins/' + text + '.js');
	} catch (e) {
		o = e;
	} finally {
		let { stdout, stderr } = o;
		if (stdout && stdout.trim()) m.reply(stdout);
		if (stderr && stderr.trim()) m.reply(stderr);
	}
};
handler.help = ['getplugin'];
handler.tags = ['owner'];
handler.command = /^(getplugin|gp)$/i;
handler.owner = true;
export default handler;
