import fs from 'fs';
import syntaxError from 'syntax-error';

let handler = async (m, { text, usedPrefix, command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!text) {
		throw t(
			`📌 *Usage:*\n${usedPrefix + command} <filename>\n\nExample:\n${usedPrefix + command} plugins/myplugin.js`,
			`📌 *طريقة الاستخدام:*\n← ${usedPrefix + command} <اسم_الملف>\n\n*مثال:*\n← ${usedPrefix + command} plugins/myplugin.js`,
			`📌 *طريقة الاستعمال:*\n← ${usedPrefix + command} <سمية_الملف>\n\n*مثال:*\n← ${usedPrefix + command} plugins/myplugin.js`
		);
	}

	if (!m.quoted?.text) {
		throw t(
			'❌ Please reply to the code message you want to save!',
			'❌ يرجى الرد على الرسالة التي تحتوي على الكود الحفظ!',
			'❌ ريبوندي على الميساج اللي فيه الكود باش تحفظو!'
		);
	}

	let code = m.quoted.text;
	let path = text.endsWith('.js') ? text : `./plugins/${text}.js`;

	let err = syntaxError(code, path, {
		sourceType: 'module',
		allowAwaitOutsideFunction: true,
	});

	if (err) {
		throw t(
			`❌ *Syntax Error in Code:*\nMessage: ${err.message}\nLine: ${err.line}`,
			`❌ *خطأ برمجي في الكود:*\nالرسالة: ${err.message}\nالسطر: ${err.line}`,
			`❌ *كاين خطأ فالسنتكس ديال الكود:*\nالميساج: ${err.message}\nالسطر: ${err.line}`
		);
	}

	fs.writeFileSync(path, code);
	m.reply(t(
		`✅ Code successfully saved to *${path}*`,
		`✅ تم حفظ الكود بنجاح في *${path}*`,
		`✅ تم حفظ الكود بنجاح فـ *${path}*`
	));
};

handler.help = ['sfp'];
handler.tags = ['owner'];
handler.command = /^sfp$/i;
handler.owner = true;

export default handler;