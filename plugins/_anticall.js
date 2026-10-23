// ============================================================
// AntiCall Plugin - Managed centrally by handler.js VoIP Engine
// Auto-answers incoming WhatsApp calls and streams voice note
// ============================================================

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
	if (!isOwner) return m.reply('❌ This command is only for the bot owner.');
	
	const chat = global.db.data.settings[conn.user.jid] || {};
	const action = (args[0] || '').toLowerCase();
	
	if (action === 'on' || action === 'enable' || action === '1') {
		chat.anticall = true;
		global.ANTI_CALL = true;
		return m.reply('✅ Auto-Answer Anti-Call with Voice Streaming has been *ENABLED*.');
	} else if (action === 'off' || action === 'disable' || action === '0') {
		chat.anticall = false;
		global.ANTI_CALL = false;
		return m.reply('❌ Anti-Call has been *DISABLED*.');
	} else {
		const isEnabled = (global.ANTI_CALL !== false && chat.anticall !== false);
		const status = isEnabled ? '🟢 ENABLED (Auto-Answer & Stream)' : '🔴 DISABLED';
		return m.reply(`📞 *Anti-Call VoIP System*\n━━━━━━━━━━━━━━━━━━━━\nStatus: *${status}*\n\nUsage:\n• \`${usedPrefix + command} on\` - Enable auto-answer & voice streaming\n• \`${usedPrefix + command} off\` - Disable anti-call system\n━━━━━━━━━━━━━━━━━━━━\n_bot amirni hamza_`);
	}
};

handler.help = ['anticall <on/off>'];
handler.tags = ['owner'];
handler.command = /^(anticall|anticalls)$/i;
handler.owner = true;

export default handler;
