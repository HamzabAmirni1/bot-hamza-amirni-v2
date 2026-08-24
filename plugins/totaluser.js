const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

let handler = async (m, { conn }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let totalDbUsers = Object.keys(global.db?.data?.users || {}).length;
	let registeredUsers = Object.values(global.db?.data?.users || {}).filter((u) => u.registered === true).length;

	// Query Supabase bot_users table for exact total users in Supabase database
	try {
		const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users?select=count', {
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Prefer': 'count=exact',
				'Range': '0-0'
			}
		});
		const contentRange = res.headers.get('content-range');
		if (contentRange) {
			const count = parseInt(contentRange.split('/')[1]);
			if (!isNaN(count) && count > totalDbUsers) {
				totalDbUsers = count;
			}
		}
	} catch (_) {}

	const caption = t(
`📊 *USER DATABASE STATISTICS*
━━━━━━━━━━━━━━━━━━━━━
👥 *Total Users in Database:* ${totalDbUsers}
✅ *Registered Users:* ${registeredUsers}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📊 *إحصائيات قاعدة البيانات والأعضاء*
━━━━━━━━━━━━━━━━━━━━━
👥 *إجمالي المستخدمين في قاعدة البيانات:* ${totalDbUsers}
✅ *الأعضاء المسجلين رسمياً:* ${registeredUsers}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`📊 *إحصائيات قاعدة البيانات والأعضاء*
━━━━━━━━━━━━━━━━━━━━━
👥 *مجموع المستخدمين فـ قاعدة البيانات:* ${totalDbUsers}
✅ *الأعضاء المأكدين (Registered):* ${registeredUsers}
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
	);

	await m.reply(caption);
};

handler.help = ['totaluser', 'users'];
handler.tags = ['infobot'];
handler.command = /^(totaluser|users|usercount)$/i;

export default handler;