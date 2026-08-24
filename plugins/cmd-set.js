let handler = async (m, { text, usedPrefix, command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!m.quoted) {
		throw t(
			`❌ Reply to a sticker with *${usedPrefix + command} <cmd_name>*`,
			`❌ يرجى الرد على ملصق بالأمر *${usedPrefix + command} <اسم_الأمر>*`,
			`❌ ريبوندي على شي ستيكر بالـ *${usedPrefix + command} <سمية_الأمر>*`
		);
	}

	if (!m.quoted.fileSha256) {
		throw t('❌ Hash Missing from media', '❌ التشفير مفقود من الملصق', '❌ التشفير ناقص من الستيكر');
	}

	if (!text) {
		throw t(
			`📌 *Usage:*\n${usedPrefix + command} <command_text>\n\nExample:\n${usedPrefix + command} .menu`,
			`📌 *طريقة الاستخدام:*\n← ${usedPrefix + command} <نص_الأمر>\n\n*مثال:*\n← ${usedPrefix + command} .menu`,
			`📌 *طريقة الاستعمال:*\n← ${usedPrefix + command} <كود_الأمر>\n\n*مثال:*\n← ${usedPrefix + command} .menu`
		);
	}

	let sticker = global.db.data.sticker;
	let hash = m.quoted.fileSha256;

	if (sticker[hash] && sticker[hash].locked) {
		throw t(
			'❌ You do not have permission to modify this locked sticker command',
			'❌ ليس لديك صلاحية لتغيير أمر هذا الملصق المقفول',
			'❌ ما عندكش الصلاحية تبدل هاد الستيكر حيت مقفول'
		);
	}

	sticker[hash] = {
		text,
		mentionedJid: m.mentionedJid,
		creator: m.sender,
		at: Date.now(),
		locked: false,
	};

	m.reply(t('✅ Sticker command successfully set!', '✅ تم ربط الملصق بالأمر بنجاح!', '✅ تم ربط الستيكر بالأمر بنجاح!'));
};

handler.help = ['setcmd'];
handler.tags = ['database'];
handler.command = ['setcmd'];

export default handler;