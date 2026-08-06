// ============================================================
// Bot Mode Checker — runs BEFORE every command
// Modes: public | private | admin | group
// Contract: Return TRUE to BLOCK command, Return FALSE to ALLOW
// ============================================================

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');
let syncedWithSupabase = false;

async function syncSettingsFromSupabase() {
	if (syncedWithSupabase) return;
	syncedWithSupabase = true;
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
			});
		}
		// Default to public mode if not specified
		if (!s.botMode) s.botMode = 'public';
		if (!s.botAdmins) s.botAdmins = [];
	} catch (_) {}
}

export async function before(m) {
	await syncSettingsFromSupabase();

	const isOwner = m.fromMe || (global.owner || []).some(o => {
		const num = Array.isArray(o) ? o[0] : o;
		return String(num || '').replace(/[^0-9]/g, '') === String(m.sender || '').replace(/[^0-9]/g, '');
	});
	if (isOwner) return false;

	const settings = global.db?.data?.settings || {};
	const mode     = settings.botMode || 'admin';
	const admins   = Array.isArray(settings.botAdmins) ? settings.botAdmins : [];

	const senderNum  = String(m.sender || '').replace(/[^0-9]/g, '');
	const isGroup    = m.chat?.endsWith('@g.us');
	const isPrivate  = !isGroup;
	const isBotAdmin = admins.some(a => String(a).replace(/[^0-9]/g, '') === senderNum);

	switch (mode) {
		case 'private':
		case 'pm':
			if (isGroup) return true;
			break;

		case 'group':
		case 'gc':
			if (isPrivate) return true;
			break;

		case 'admin':
		case 'self':
		case 'owner':
			if (!isBotAdmin) return true;
			break;

		case 'public':
		default:
			break;
	}

	return false;
}

before.all = true;
