// ============================================================
// AntiCall Plugin - Managed centrally by handler.js VoIP Engine
// Supports: Auto-Reject, VoIP Voice Streaming, and Auto-Block Callers
// ============================================================

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
	if (!isOwner) return m.reply('❌ This command is only for the bot owner.');
	
	const chat = global.db.data.settings[conn.user.jid] || {};
	const subCmd = (args[0] || '').toLowerCase();
	const subArg = (args[1] || '').toLowerCase();
	const myPhone = (conn.user?.id || conn.user?.jid || '').split(':')[0].split('@')[0].replace(/\D/g, '');

	// Subcommand: .anticall block on / off
	if (subCmd === 'block' || subCmd === 'بلوك' || subCmd === 'حظر') {
		if (subArg === 'on' || subArg === '1' || subArg === 'enable') {
			global.ANTICALL_BLOCK = true;
			if (myPhone) global[`ANTICALL_BLOCK_${myPhone}`] = true;
			return m.reply(`🚫 *تم تفعيل الحظر التلقائي للمتصلين (Auto-Block Callers)*\n\nأي شخص سيتصل بهذا البوت (+${myPhone}) سيتم رفض مكالمته وحظره فوراً فـ الواتساب.\n_⚡ bot amirni hamza_`);
		} else if (subArg === 'off' || subArg === '0' || subArg === 'disable') {
			global.ANTICALL_BLOCK = false;
			if (myPhone) global[`ANTICALL_BLOCK_${myPhone}`] = false;
			return m.reply(`🟢 *تم إيقاف الحظر التلقائي للمتصلين*\n\nالمكالمات سيتم رفضها أو الرد عليها بدون حظر المتصل.\n_⚡ bot amirni hamza_`);
		}
	}

	if (subCmd === 'on' || subCmd === 'enable' || subCmd === '1') {
		chat.anticall = true;
		global.ANTI_CALL = true;
		return m.reply('✅ Auto-Answer Anti-Call has been *ENABLED*.');
	} else if (subCmd === 'off' || subCmd === 'disable' || subCmd === '0') {
		chat.anticall = false;
		global.ANTI_CALL = false;
		return m.reply('❌ Anti-Call has been *DISABLED*.');
	} else {
		const isAntiCallOn = (global.ANTI_CALL !== false && chat.anticall !== false);
		const perBotBlock = myPhone ? global[`ANTICALL_BLOCK_${myPhone}`] : undefined;
		const isBlockOn = perBotBlock !== undefined ? perBotBlock : (global.ANTICALL_BLOCK !== undefined ? global.ANTICALL_BLOCK : true);

		return m.reply(`📞 *نظام مكافحة المكالمات (Anti-Call System)*
━━━━━━━━━━━━━━━━━━━━
🤖 *البوت الحالي:* +${myPhone}
📵 *رفض المكالمات (Anti-Call):* ${isAntiCallOn ? '🟢 مفعّل' : '🔴 معطّل'}
🚫 *حظر المتصل تلقائياً (Auto-Block):* ${isBlockOn ? '🔴 مفعّل (يحظر المتصل)' : '🟢 معطّل (بدون حظر)'}

📌 *طريقة الاستعمال:*
• \`${usedPrefix + command} block on\` — تفعيل حظر المتصل تلقائياً
• \`${usedPrefix + command} block off\` — إيقاف الحظر والرفض فقط
• \`${usedPrefix + command} on\` — تفعيل رفض المكالمات
• \`${usedPrefix + command} off\` — إيقاف رفض المكالمات
━━━━━━━━━━━━━━━━━━━━
_⚡ bot amirni hamza • حمزة اعمرني_`);
	}
};

handler.help = ['anticall <on/off>', 'anticall block <on/off>'];
handler.tags = ['owner'];
handler.command = /^(anticall|anticalls)$/i;
handler.owner = true;

export default handler;
