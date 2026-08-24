let handler = async (m) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let response = t(
		'👑 *PREMIUM SUBSCRIBERS*\n━━━━━━━━━━━━━━━━━━━━━\n\n',
		'👑 *قائمة المشتركين المميزين*\n━━━━━━━━━━━━━━━━━━━━━\n\n',
		'👑 *قائمة المشتركين المميزين*\n━━━━━━━━━━━━━━━━━━━━━\n\n'
	);
	let totalPremium = 0;

	for (let user in global.db.data.users) {
		if (global.db.data.users[user].premium) {
			let number = user.split('@')[0];
			let name = global.db.data.users[user].name || '-';
			let days = Math.abs(Math.floor((global.db.data.users[user].premiumTime - new Date()) / (24 * 60 * 60 * 1000)));
			let hours = Math.abs(Math.floor((global.db.data.users[user].premiumTime - new Date()) / (60 * 60 * 1000))) % 24;
			let minutes = Math.abs(Math.floor((global.db.data.users[user].premiumTime - new Date()) / (60 * 1000))) % 60;

			const period = t(
				`${days}d ${hours}h ${minutes}m`,
				`${days} يوم ${hours} ساعة ${minutes} دقيقة`,
				`${days} يوم ${hours} ساعة ${minutes} دقيقة`
			);
			response += `∝───────•••───────\n👤 *+${number}*\n📛 ${name}\n⏰ ${t('Active period', 'مدة النشاط', 'مدة النشاط')}: ${period}\n∝───────•••───────\n`;
			totalPremium++;
		}
	}

	if (totalPremium === 0) {
		response += t(
			'😕 No premium users found.',
			'😕 لا يوجد مستخدمون مميزون حتى الآن.',
			'😕 ما كاين حتى شخص مميز الدرك.'
		);
	}

	response += `\n${t('┌ Total Premium:', '┌ مجموع المميزين:', '┌ مجموع المميزين:')} *${totalPremium}*\n${t('└ Get Premium:', '└ احصل على بريميوم:\n← .owner', '└ احصل على بريميوم:\n← .owner')}`;

	m.reply(response, m.from, {
		contextInfo: {
			mentionedJid: Object.keys(global.db.data.users).filter((jid) => global.db.data.users[jid].premium),
		},
	});
};

handler.help = ['listpremium'];
handler.command = /^(listpremium)$/i;
handler.tags = ['owner'];
handler.owner = true;

export default handler;