let handler = async (m, { command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!m.quoted) {
		throw t('❌ Reply to a message first!', '❌ رد على رسالة أولاً!', '❌ ريبوندي على شي رسالة أولاً!');
	}
	if (!m.quoted.fileSha256) {
		throw t('❌ SHA256 hash missing!', '❌ البصمة SHA256 غير موجودة!', '❌ البصمة SHA256 ماكيناش!');
	}

	let sticker = db.data.sticker;
	let hash = m.quoted.fileSha256;

	if (!(hash in sticker)) {
		throw t('❌ Hash not found in database.', '❌ البصمة غير موجودة في قاعدة البيانات.', '❌ البصمة ما كيناش في قاعدة البيانات.');
	}

	const isLock = !/^un/i.test(command);
	sticker[hash].locked = isLock;

	m.reply(t(
		`✅ Command has been *${isLock ? 'locked' : 'unlocked'}* successfully!`,
		`✅ تم *${isLock ? 'قفل' : 'فتح'}* الأمر بنجاح!`,
		`✅ تم *${isLock ? 'قفل' : 'فتح'}* الأمر بنجاح!`
	));
};

handler.help = ['lockcmd', 'unlockcmd'];
handler.tags = ['database'];
handler.command = /^(un)?lockcmd$/i;

export default handler;
