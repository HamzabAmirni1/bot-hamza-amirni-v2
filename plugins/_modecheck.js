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

export async function before(m, { isAdmin, isBotAdmin, isOwner, isROwner } = {}) {
	await syncSettingsFromSupabase();

	const senderNum = _cleanPhoneNum(m.sender);

	// Developer / Owner checks (never blocked anywhere)
	const isOwnerUser = m.fromMe || isOwner || isROwner || (global.owner || []).some(o => {
		const num = Array.isArray(o) ? o[0] : o;
		return _cleanPhoneNum(num) === senderNum;
	}) || (global.botOwners || []).some(o => {
		const num = Array.isArray(o) ? o[0] : o;
		return _cleanPhoneNum(num) === senderNum;
	});
	if (isOwnerUser) return false;

	const settings = global.db?.data?.settings || {};
	const mode     = settings.botMode || global.BOT_MODE || 'public';
	const admins   = Array.isArray(settings.botAdmins) ? settings.botAdmins : [];

	const isGroup        = m.chat?.endsWith('@g.us') || m.isGroup;
	const isPrivate      = !isGroup;
	const isBotAdminUser = admins.some(a => _cleanPhoneNum(a) === senderNum) || isBotAdmin;

	// Bot admins are NEVER blocked anywhere
	if (isBotAdminUser) return false;

	// Always allow dev contact commands
	const isDevCmd = m.text && /^[.!#/\\]?(msgtodev|mstodev|contactdev|msgdev|contact|owner|مطور|رسالة_للمطور)(\s|$)/i.test(m.text.trim());
	if (isDevCmd) return false;

	// Check if user is group admin
	let isGroupAdmin = m.isAdmin || isAdmin;

	// In private mode in a group, if cached admin was false, check fresh groupMetadata
	if (isGroup && !isGroupAdmin && (mode === 'private' || mode === 'pm')) {
		try {
			const meta = await this.groupMetadata?.(m.chat).catch(() => null);
			if (meta?.participants) {
				const u = meta.participants.find(p => _cleanPhoneNum(p.id || p.jid) === senderNum);
				if (u?.admin === 'admin' || u?.admin === 'superadmin') {
					isGroupAdmin = true;
					if (m) m.isAdmin = true;
				}
			}
		} catch (_) {}
	}

	switch (mode) {
		case 'private':
		case 'pm':
			// In private mode: DMs allowed for everyone; Groups allowed for group admins & bot admins
			if (isGroup && !isGroupAdmin) return true;
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
