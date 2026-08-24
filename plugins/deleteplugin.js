import path from 'path';
import { unlinkSync } from 'fs';

let handler = async (m, { usedPrefix, command, __dirname, args }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let ar = Object.keys(plugins);
	let ar1 = ar.map((v) => v.replace('.js', ''));

	if (!args || !args[0]) {
		throw t(
			`📌 *Usage:*\n${usedPrefix + command} <plugin_name>\n\nExample:\n${usedPrefix + command} test`,
			`📌 *طريقة الاستخدام:*\n← ${usedPrefix + command} <اسم_الاضافة>\n\n*مثال:*\n← ${usedPrefix + command} test`,
			`📌 *طريقة الاستعمال:*\n← ${usedPrefix + command} <سمية_البلاكن>\n\n*مثال:*\n← ${usedPrefix + command} test`
		);
	}

	if (!ar1.includes(args[0])) {
		throw t(
			`❌ *Plugin not found! Available plugins:*\n${ar1.join(', ')}`,
			`❌ *الاضافة غير موجودة! الاضافات المتاحة:*\n${ar1.join(', ')}`,
			`❌ *البلاكن ما كاينش! البلاكنات المتاحة:*\n${ar1.join(', ')}`
		);
	}

	const file = path.join(__dirname, '../plugins/' + args[0] + '.js');
	unlinkSync(file);
	m.reply(t(
		`✅ Successfully deleted *plugins/${args[0]}.js*`,
		`✅ تم حذف الاضافة بنجاح *plugins/${args[0]}.js*`,
		`✅ تم مسح البلاكن بنجاح *plugins/${args[0]}.js*`
	));
};

handler.help = ['dfp'];
handler.tags = ['owner'];
handler.command = /^(dfp|deleteplugin)$/i;
handler.owner = true;

export default handler;
