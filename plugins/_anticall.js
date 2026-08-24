// ============================================================
// AntiCall Plugin — Automatically rejects calls, sends social links, and blocks caller
// ============================================================

export async function before(m) {
	if (this.__anticallListenerAdded) return;
	this.__anticallListenerAdded = true;

	this.ev.on('call', async (callEvents) => {
		try {
			const settings = global.db.data.settings[this.user?.jid] || {};
			if (settings.anticall === false) return; // If explicitly disabled by owner

			for (const call of callEvents) {
				if (call.status === 'offer') {
					console.log(`[AntiCall] Rejecting call from ${call.from} (ID: ${call.id})`);

					// 1. Reject the call
					try {
						await this.rejectCall(call.id, call.from);
					} catch (e) {
						console.error('[AntiCall] rejectCall error:', e.message);
					}

					// 2. Send warning message with Instagram & WhatsApp Channel links
					const msg = 
`⚠️ *ممنوع الاتصال بالبوت!* ⚠️

عذراً، الاتصال بالصوت أو الفيديو غير مسموح بصفة نهائية 🛑
تم حظرك تلقائياً لتجنب الإزعاج.

━━━━━━━━━━━━━━━━━━━━━
📸 *حساب الإنستغرام الرسمي:*
https://www.instagram.com/hamza_amirni_01

📢 *قناة الواتساب الرسمية:*
https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p

⚡ *bot amirni hamza • حمزة اعمرني*`;

					try {
						await this.sendMessage(call.from, { text: msg });
					} catch (e) {
						console.error('[AntiCall] sendMessage error:', e.message);
					}

					// 3. Block the caller on WhatsApp
					try {
						await this.updateBlockStatus(call.from, 'block');
						console.log(`[AntiCall] Successfully blocked ${call.from}`);
					} catch (e) {
						console.error('[AntiCall] updateBlockStatus error:', e.message);
					}
				}
			}
		} catch (err) {
			console.error('[AntiCall] Error:', err.message);
		}
	});
}
