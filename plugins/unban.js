let handler = async (m, { text }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let who;
	if (m.isGroup) who = m.mentionedJid[0] || (m.quoted ? m.quoted.sender : null);
	else who = m.chat;

	if (!who) {
		throw t(
			'❌ Please mention a user or reply to their message to unban them!',
			'❌ يرجى منشنة مستخدم أو الرد على رسالته لإلغاء حظره!',
			'❌ طاقي شي حد ولا ريبوندي على الميساج ديالو باش تحيد ليه الحظر!'
		);
	}

	if (!global.db.data.users[who]) global.db.data.users[who] = {};
	global.db.data.users[who].banned = false;

	// Sync unban state to Supabase bot_users table
	try {
		const cleanPhone = who.replace(/[^0-9]/g, '');
		const _botJid = global.conn?.user?.id || global.conn?.user?.jid || '';
		const _botPhone = _botJid.split(':')[0].replace(/[^0-9]/g, '');
		const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');
		fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users', {
			method: 'POST',
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Content-Type': 'application/json',
				'Prefer': 'resolution=merge-duplicates'
			},
			body: JSON.stringify([{ jid: who, phone_number: cleanPhone, bot_phone: _botPhone || null, is_banned: false }])
		}).catch(() => {});
	} catch(_) {}

	m.reply(t(
		`✅ User *@${who.split('@')[0]}* has been unbanned.`,
		`✅ تم إلغاء حظر المستخدم *@${who.split('@')[0]}* بنجاح.`,
		`✅ تم إلغاء حظر المستخدم *@${who.split('@')[0]}* بنجاح.`
	));
};
handler.help = ['unban'];
handler.tags = ['owner'];
handler.command = /^unban(user)?$/i;
handler.owner = true;

export default handler;
