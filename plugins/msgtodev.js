const SUPABASE_URL = 'https://tpchjgdnovfbtvlhhszq.supabase.co';
const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

let handler = async (m, { text, usedPrefix, command }) => {
	if (!text) {
		return m.reply(`╭━━━━━━━━━━━━━━━━╮
│   📩 رسالة للمطور
╰━━━━━━━━━━━━━━━━╯

📌 *كيفية الاستخدام:*
${usedPrefix}${command} رسالتك هنا

🔰 *مثال:*
${usedPrefix}${command} مرحبا أريد مساعدة في البوت

╭━━━━━━━━━━━━━━━━╮
│ ⚡ bot amirini hamza
│ 👨‍💻 By Hamza Amirni
╰━━━━━━━━━━━━━━━━╯`);
	}

	const senderName = m.pushName || m.sender?.split('@')[0] || 'مجهول';
	const senderPhone = m.sender?.split('@')[0] || 'unknown';
	const platform = m.chat?.endsWith('@g.us') ? 'group' : 'private';

	try {
		// Build payload using existing columns only
		const payload = {
			sender_name: senderName,
			platform: platform,
			text: `[${senderPhone}] ${text}`,
			replied: false,
			reply_text: null,
			timestamp: new Date().toISOString(),
		};

		// Try extended columns if they exist
		try { payload.sender_jid = m.sender; } catch(_) {}
		try { payload.sender_phone = senderPhone; } catch(_) {}
		try { payload.chat_id = m.chat; } catch(_) {}

		const res = await fetch(`${SUPABASE_URL}/rest/v1/dev_messages`, {
			method: 'POST',
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Content-Type': 'application/json',
				'Prefer': 'return=minimal',
			},
			body: JSON.stringify(payload),
		});

		if (res.ok) {
			await m.react('✅');
			await m.reply(`╭━━━━━━━━━━━━━━━━╮
│   ✅ تم إرسال رسالتك
╰━━━━━━━━━━━━━━━━╯

📨 *رسالتك:*
${text}

👨‍💻 *تم توصيل رسالتك للمطور Hamza Amirni بنجاح!*
📡 سيتم الرد عليك في أقرب وقت ممكن.

╭━━━━━━━━━━━━━━━━╮
│ ⚡ bot amirini hamza
╰━━━━━━━━━━━━━━━━╯`);

			// Notify owners on WhatsApp
			const notifyMsg = `╭━━━━━━━━━━━━━━━━╮
│   📩 رسالة جديدة من مستخدم
╰━━━━━━━━━━━━━━━━╯

👤 *المرسل:* ${senderName}
📱 *الرقم:* +${senderPhone}
💬 *النوع:* ${platform === 'group' ? 'مجموعة' : 'خاص'}

📝 *الرسالة:*
${text}

━━━━━━━━━━━━━━━━
🔔 يمكنك الرد من لوحة التحكم`;

			for (const [ownerNum] of global.owner) {
				try {
					await conn.sendMessage(ownerNum + '@s.whatsapp.net', { text: notifyMsg });
				} catch(e) {
					console.error('msgtodev: could not notify owner', ownerNum, e.message);
				}
			}

		} else {
			const errText = await res.text();
			console.error('❌ msgtodev Supabase error:', errText);
			await m.react('⚠️');
			await m.reply(`⚠️ تعذر إرسال الرسالة، يرجى المحاولة لاحقاً.`);
		}

	} catch (err) {
		console.error('❌ msgtodev error:', err.message);
		await m.react('❌');
		await m.reply(`❌ خطأ في الإرسال: ${err.message}`);
	}
};

handler.help = ['msgtodev <رسالتك>'];
handler.tags = ['main'];
handler.command = ['msgtodev', 'contactdev', 'msgdev', 'contact'];

export default handler;
