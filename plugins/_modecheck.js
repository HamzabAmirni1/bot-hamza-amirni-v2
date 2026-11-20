// ============================================================
// Bot Mode Checker — runs BEFORE every command
// Modes: public | private | admin | group | vu
// Contract: Return TRUE to BLOCK command, Return FALSE to ALLOW
//
// GROUP RULE: groups are ALWAYS blocked unless mode is 'group', 'gc', or 'vu'
// In 'vu' mode: only bot admins/owners can use in groups
// ============================================================

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');
let _lastModeSync = 0;

async function syncSettingsFromSupabase() {
	const now = Date.now();
	if (now - _lastModeSync < 30000) return; // re-sync every 30s
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
		// Default to private if nothing saved yet
		if (!s.botMode) s.botMode = 'private';
		if (!s.botAdmins) s.botAdmins = [];
	} catch (_) {}
}

export async function before(m) {
	await syncSettingsFromSupabase();

	const isOwner = m.fromMe || (global.owner || []).some(o => {
		const num = Array.isArray(o) ? o[0] : o;
		return String(num || '').replace(/[^0-9]/g, '') === String(m.sender || '').replace(/[^0-9]/g, '');
	}) || (global.botOwners || []).some(o => {
		const num = Array.isArray(o) ? o[0] : o;
		return String(num || '').replace(/[^0-9]/g, '') === String(m.sender || '').replace(/[^0-9]/g, '');
	});
	if (isOwner) return false;

	const settings = global.db?.data?.settings || {};
	const mode     = settings.botMode || 'private'; // default: private (DMs only)
	const admins   = Array.isArray(settings.botAdmins) ? settings.botAdmins : [];

	const senderNum  = String(m.sender || '').replace(/[^0-9]/g, '');
	const isGroup    = m.chat?.endsWith('@g.us');
	const isPrivate  = !isGroup;
	const isBotAdmin = admins.some(a => String(a).replace(/[^0-9]/g, '') === senderNum);

	// ── GLOBAL GROUP BLOCK ──────────────────────────────────────────────────
	// Groups are forbidden in ALL modes EXCEPT 'group', 'gc', and 'vu'.
	// In 'vu' mode, only bot admins/owners can use the bot in groups.
	const groupAllowedModes = ['group', 'gc', 'vu'];
	if (isGroup && !groupAllowedModes.includes(mode)) return true;

	switch (mode) {
		case 'private':
		case 'pm':
			// Groups already blocked above; allow DMs
			break;

		case 'group':
		case 'gc':
			if (isPrivate) return true;
			break;

		case 'admin':
		case 'self':
		case 'owner':
			// admin mode = bot admins only, DMs only (groups already blocked)
			if (!isBotAdmin) return true;
			break;

		case 'vu':
			// VU mode: bot admins can use the bot in BOTH groups AND DMs; everyone else blocked
			if (!isBotAdmin) return true;
			break;

		case 'public':
		default:
			// public = DMs only (groups already blocked by global rule above)
			break;
	}

	return false;
}

before.all = true;
