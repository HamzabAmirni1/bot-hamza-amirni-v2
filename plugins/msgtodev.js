import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://tpchjgdnovfbtvlhhszq.supabase.co';
const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

let handler = async (m, { text, usedPrefix, command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!text) {
		return m.reply(t(
`╭━━━━━━━━━━━━━━━━╮
│   📩 Message To Developer
╰━━━━━━━━━━━━━━━━╯

📌 *Usage:*
← ${usedPrefix}${command} your message here

🔰 *Example:*
← ${usedPrefix}${command} Hello, I need help with the bot

╭━━━━━━━━━━━━━━━━╮
│ ⚡ bot amirni hamza
│ 👨‍💻 By Hamza Amirni
╰━━━━━━━━━━━━━━━━╯`,
`╭━━━━━━━━━━━━━━━━╮
│   📩 رسالة للمطور
╰━━━━━━━━━━━━━━━━╯

📌 *كيفية الاستخدام:*
← ${usedPrefix}${command} رسالتك هنا

🔰 *مثال:*
← ${usedPrefix}${command} مرحبا أريد مساعدة في البوت

╭━━━━━━━━━━━━━━━━╮
│ ⚡ bot amirni hamza
│ 👨‍💻 By Hamza Amirni
╰━━━━━━━━━━━━━━━━╯`,
`╭━━━━━━━━━━━━━━━━╮
│   📩 رسالة للمطور
╰━━━━━━━━━━━━━━━━╯

📌 *كيفية الاستخدام:*
← ${usedPrefix}${command} كتب رسالتك هنا

🔰 *مثال:*
← ${usedPrefix}${command} السلام، بغيت مساعدة فالبوت

╭━━━━━━━━━━━━━━━━╮
│ ⚡ bot amirni hamza
│ 👨‍💻 By Hamza Amirni
╰━━━━━━━━━━━━━━━━╯`
		));
	}

	const senderName = m.pushName || m.sender?.split('@')[0] || 'مجهول';
	const senderPhone = m.sender?.split('@')[0] || 'unknown';
	const platform = m.chat?.endsWith('@g.us') ? 'group' : 'private';

	try {
		// Only include columns that definitely exist and are nullable
		const payload = {
			id: randomUUID(),
			sender_name: senderName,
			platform: platform,
			text: `${senderName} (${senderPhone}): ${text}`,
			replied: false,
			timestamp: new Date().toISOString(),
		};

		const botPhone = (conn.user?.id || conn.user?.jid || '').split('@')[0].split(':')[0];

		// Try extended columns safely (ignore if columns don't exist)
		try { payload.sender_jid = m.sender || null; } catch(_) {}
		try { payload.sender_phone = senderPhone || null; } catch(_) {}
		try { payload.chat_id = m.chat || null; } catch(_) {}
		try { payload.bot_phone = botPhone || null; } catch(_) {}

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
│ ⚡ bot amirni hamza
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
			console.error('❌ msgtodev Supabase error [' + res.status + ']:', errText);
			console.error('❌ msgtodev payload was:', JSON.stringify(payload));
			await m.react('⚠️');
			await m.reply(t('⚠️ Failed to send message, please try again later.', '⚠️ تعذر إرسال الرسالة، يرجى المحاولة لاحقاً.', '⚠️ ما قدرناش نصيفطو الرسالة، عاود حاول من بعد.'));
		}

	} catch (err) {
		console.error('❌ msgtodev error:', err.message);
		await m.react('❌');
		await m.reply(t(`❌ Send error: ${err.message}`, `❌ خطأ في الإرسال: ${err.message}`, `❌ وقع خطأ: ${err.message}`));
	}
};

handler.help = ['msgtodev <رسالتك>'];
handler.tags = ['main'];
handler.command = ['msgtodev', 'mstodev', 'contactdev', 'msgdev', 'contact', 'رسالة_للمطور', 'المطور'];

export default handler;
