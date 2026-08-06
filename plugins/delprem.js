let handler = async (m, { conn, text }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!text) {
		throw t(
			'❌ Please mention a user or provide a phone number to remove premium.',
			'❌ يرجى تحديد المستخدم أو رقم الهاتف لإلغاء الاشتراك المميز.',
			'❌ منشن المستخدم ولا داخل رقم الهاتف باش تلغي الاشتراك.'
		);
	}

	let who;
	if (m.isGroup) {
		if (!m.mentionedJid?.[0]) {
			throw t('❌ No user mentioned to remove premium.', '❌ لم يتم تحديد أي مستخدم.', '❌ ما منشنتي حتى شخص.');
		}
		who = m.mentionedJid[0];
	} else {
		let phoneNumber = text.replace(/[^0-9]/g, '');
		who = phoneNumber + '@s.whatsapp.net';
	}

	let users = global.db.data.users;
	if (users[who]) {
		users[who].premium = false;
		users[who].premiumTime = 0;

		const num = who.split('@')[0];
		m.reply(t(
			`✅ *Premium removed successfully!*\n👤 User: +${num}`,
			`✅ *تم إلغاء الاشتراك المميز بنجاح!*\n👤 المستخدم: +${num}`,
			`✅ *تم إلغاء الاشتراك بنجاح!*\n👤 المستخدم: +${num}`
		));
	} else {
		throw t(
			'❌ User not found in database.',
			'❌ المستخدم غير موجود في قاعدة البيانات.',
			'❌ المستخدم ما كيناش فـ قاعدة البيانات.'
		);
	}
};

handler.help = ['delprem'];
handler.tags = ['owner'];
handler.command = /^delprem(user)?$/i;
handler.owner = true;

export default handler;