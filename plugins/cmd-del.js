let handler = async (m) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let hash;
	if (m.quoted && m.quoted.fileSha256) hash = m.quoted.fileSha256;
	if (!hash) {
		throw t(
			'❌ Please reply to a sticker that has a command attached!',
			'❌ يرجى الرد على ملصق مرتبط بأمر!',
			'❌ ريبوندي على شي ستيكر مبيسط بـ أمر!'
		);
	}

	let sticker = global.db.data.sticker;
	if (sticker[hash] && sticker[hash].locked) {
		throw t(
			'❌ You do not have permission to delete this locked sticker command',
			'❌ ليس لديك صلاحية لحذف أمر هذا الملصق المقفول',
			'❌ ما عندكش الصلاحية تمسح أمر هاد الستيكر'
		);
	}

	delete sticker[hash];
	m.reply(t('✅ Sticker command successfully deleted!', '✅ تم حذف أمر الملصق بنجاح!', '✅ تم مسح أمر الستيكر بنجاح!'));
};

handler.help = ['delcmd'];
handler.tags = ['database'];
handler.command = ['delcmd'];

export default handler;