// ============================================================
// Bot Mode Checker — runs BEFORE every command
// Modes: public | private | admin | group | vu
// Contract: Return TRUE to BLOCK command, Return FALSE to ALLOW
//
// public: Everyone can use in both Groups and DMs
// private: DMs allowed for everyone; Groups allowed for group admins & bot admins/owners
// group: Groups allowed for everyone; DMs blocked for non-admins
// admin / self / owner / vu: Bot Admins & Owners ONLY (all chats)
// ============================================================

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');
let _lastModeSync = 0;

async function syncSettingsFromSupabase() {
	const now = Date.now();
	if (now - _lastModeSync < 15000) return; // re-sync every 15s
	_lastModeSync = now;
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 4000);
		const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?jid=like.config_*&select=jid,history', {
			headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY },
			signal: controller.signal
		});
		clearTimeout(timeoutId);
		if (!res.ok) return;
		const rows = await res.json();
		if (!global.db?.data) return;
		if (!global.db.data.settings) global.db.data.settings = {};
		const s = global.db.data.settings;

		if (Array.isArray(rows)) {
			rows.forEach(r => {
				if (r.jid === 'config_bot_mode' && r.history) s.botMode = r.history;
				if (r.jid && r.jid.startsWith('config_bot_mode_') && r.history) {
					const p = r.jid.replace('config_bot_mode_', '');
					s[`botMode_${p}`] = r.history;
				}
				if (r.jid === 'config_bot_admins' && r.history) {
					try { s.botAdmins = JSON.parse(r.history); } catch (_) {}
				}
				if (r.jid === 'config_bot_owners' && r.history) {
					try { global.botOwners = JSON.parse(r.history); } catch (_) {}
				}
			});
		}
		// Default to public if nothing saved yet
		if (!s.botMode) s.botMode = 'public';
		if (!s.botAdmins) s.botAdmins = [];
	} catch (_) {}
}

const _cleanPhoneNum = (j) => String(j || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

const _matchPhone = (a, b) => {
	if (!a || !b) return false;
	const na = String(a).replace(/[^0-9]/g, '');
	const nb = String(b).replace(/[^0-9]/g, '');
	if (!na || !nb) return false;
	if (na === nb) return true;
	if (na.length >= 9 && nb.length >= 9 && na.slice(-9) === nb.slice(-9)) return true;
	return false;
};

export async function before(m, { isAdmin, isBotAdmin, isOwner, isROwner } = {}) {
	await syncSettingsFromSupabase();

	const senderNum = _cleanPhoneNum(m.sender);
	let resolvedPhone = senderNum;
	if (m.sender && m.sender.endsWith('@lid')) {
		try {
			let pn = null;
			if (this.signalRepository?.lidMapping?.getPNForLID) {
				pn = await this.signalRepository.lidMapping.getPNForLID(m.sender);
			}
			if ((!pn || pn.endsWith('@lid')) && typeof this.getJid === 'function') {
				const mapped = this.getJid(m.sender);
				if (mapped && !mapped.endsWith('@lid')) pn = mapped;
			}
			if (pn && !pn.endsWith('@lid')) resolvedPhone = _cleanPhoneNum(pn);
		} catch (_) {}
	}

	// Developer / Owner checks (never blocked anywhere)
	const isOwnerUser = m.fromMe || isOwner || isROwner || (global.owner || []).some(o => {
		const num = Array.isArray(o) ? o[0] : o;
		return _matchPhone(num, senderNum) || _matchPhone(num, resolvedPhone);
	}) || (global.botOwners || []).some(o => {
		const num = Array.isArray(o) ? o[0] : o;
		return _matchPhone(num, senderNum) || _matchPhone(num, resolvedPhone);
	});
	if (isOwnerUser) return false;

	const settings = global.db?.data?.settings || {};
	const botPhone = _cleanPhoneNum(this.user?.id || this.user?.jid || process.env.PAIRING_NUMBER || '');
	const mode     = (botPhone && settings[`botMode_${botPhone}`]) || 
	                 (botPhone && global[`BOT_MODE_${botPhone}`]) || 
	                 settings.botMode || global.BOT_MODE || 'private';
	const admins   = Array.isArray(settings.botAdmins) ? settings.botAdmins : [];

	const isGroup        = m.chat?.endsWith('@g.us') || m.isGroup;
	const isPrivate      = !isGroup;
	let isBotAdminUser = admins.some(a => _matchPhone(a, senderNum) || _matchPhone(a, resolvedPhone)) || isBotAdmin;

	// Reverse LID check: for any admin phone number, check if Baileys maps it to this sender's LID
	if (!isBotAdminUser && m.sender && m.sender.endsWith('@lid') && this.signalRepository?.lidMapping?.getLIDForPN) {
		for (const adm of admins) {
			try {
				const cleanA = _cleanPhoneNum(adm);
				if (cleanA) {
					const lid = await this.signalRepository.lidMapping.getLIDForPN(cleanA + '@s.whatsapp.net');
					if (lid && (_cleanPhoneNum(lid) === senderNum || lid === m.sender)) {
						isBotAdminUser = true;
						break;
					}
				}
			} catch (_) {}
		}
	}

	// Bot admins are NEVER blocked anywhere
	if (isBotAdminUser) return false;

	// Always allow dev contact commands
	const isDevCmd = m.text && /^[.!#/\\]?(msgtodev|mstodev|contactdev|msgdev|contact|owner|مطور|رسالة_للمطور)(\s|$)/i.test(m.text.trim());
	if (isDevCmd) return false;

	// Group rule:
	// If mode is 'private' or 'pm', groups are BLOCKED for everyone (even group admins).
	// Only bot owners and bot admins (checked above) bypass this.
	// Groups ONLY work if mode is 'public' or 'group' / 'gc'.
	switch (mode) {
		case 'private':
		case 'pm':
			// In private mode: Groups are completely blocked; DMs are allowed for everyone
			if (isGroup) return true;
			return false;

		case 'group':
		case 'gc':
			// In group mode: Groups allowed for everyone; DMs blocked for non-admins
			if (isPrivate) return true;
			return false;

		case 'admin':
		case 'self':
		case 'owner':
		case 'vu':
			// Bot admins & owners only in all chats
			if (!isBotAdminUser) return true;
			return false;

		case 'public':
		default:
			// Public mode: both groups and DMs allowed for everyone
			return false;
	}
}

before.all = true;
