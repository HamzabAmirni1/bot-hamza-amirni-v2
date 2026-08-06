// ============================================================
// Bot Mode & Admin Management Plugin
// Commands: .setmode | .addadmin | .deladmin | .listadmin
// ============================================================

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

async function saveToSupabase(key, val) {
	try {
		const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
		await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
			method: 'POST',
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Content-Type': 'application/json',
				'Prefer': 'resolution=merge-duplicates'
			},
			body: JSON.stringify([{ jid: 'config_' + key, history: strVal }])
		});
	} catch (_) {}
}

function getGlobalSettings() {
	if (!global.db?.data) return null;
	if (!global.db.data.settings) global.db.data.settings = {};
	const s = global.db.data.settings;
	if (!Array.isArray(s.botAdmins)) s.botAdmins = [];
	if (!s.botMode) s.botMode = 'public'; // Default to public mode
	return s;
}

let handler = async (m, { command, text, conn }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	const settings = getGlobalSettings();
	if (!settings) return m.reply('❌ Database not ready.');

	// ─── .setmode ────────────────────────────────────────────
	if (/^setmode$/i.test(command)) {
		const VALID_MODES = ['public', 'private', 'admin', 'group'];
		const newMode = text?.trim().toLowerCase();

		if (!newMode || !VALID_MODES.includes(newMode)) {
			return m.reply(t(
				`❓ *Usage:*\n← .setmode <mode>\n\n📋 Available modes:\n🌍 *public* — Everyone can use the bot\n🔒 *private* — DMs only\n👥 *group* — Groups only\n🛡️ *admin* — Bot admins only\n\n📌 Current mode: *${settings.botMode || 'admin'}*`,
				`❓ *الاستخدام:*\n← .setmode <mode>\n\n📋 الأوضاع:\n🌍 *public* — للجميع\n🔒 *private* — رسائل خاصة فقط\n👥 *group* — مجموعات فقط\n🛡️ *admin* — للمشرفين فقط\n\n📌 الوضع الحالي: *${settings.botMode || 'admin'}*`,
				`❓ *الاستخدام:*\n← .setmode <mode>\n\n📋 الأوضاع:\n🌍 *public* — للجميع\n🔒 *private* — رسائل خاصة غير\n👥 *group* — الگروبات غير\n🛡️ *admin* — الأدمينات غير\n\n📌 الوضع دابا: *${settings.botMode || 'admin'}*`
			));
		}

		settings.botMode = newMode;
		await saveToSupabase('bot_mode', newMode);

		const modeEmojis = { public: '🌍', private: '🔒', group: '👥', admin: '🛡️' };
		const modeLabels = {
			public:  t('Public — Everyone can use', 'عام — للجميع', 'عام — للجميع'),
			private: t('Private — DMs only', 'خاص — رسائل خاصة فقط', 'خاص — رسائل خاصة غير'),
			group:   t('Group — Groups only', 'مجموعات فقط', 'الگروبات غير'),
			admin:   t('Admin — Bot admins only', 'مشرفون — للمشرفين فقط', 'الأدمينات غير'),
		};

		await m.react('✅');
		return m.reply(
			`${modeEmojis[newMode]} *Bot Mode Changed!*\n\n` +
			t(
				`New mode: *${newMode.toUpperCase()}*\n${modeLabels[newMode]}`,
				`الوضع الجديد: *${newMode.toUpperCase()}*\n${modeLabels[newMode]}`,
				`الوضع الجديد: *${newMode.toUpperCase()}*\n${modeLabels[newMode]}`
			)
		);
	}

	// ─── .addadmin ───────────────────────────────────────────
	if (/^addadmin$/i.test(command)) {
		let target = '';

		if (m.mentionedJid && m.mentionedJid.length > 0) {
			target = m.mentionedJid[0];
		} else if (m.quoted) {
			target = m.quoted.sender || m.quoted.participant || '';
		} else if (text) {
			target = text.trim().replace(/[^0-9]/g, '') + '@s.whatsapp.net';
		}

		if (!target) {
			return m.reply(t(
				`❓ *Usage:*\n← .addadmin @user\nOr reply to a message with .addadmin`,
				`❓ *الاستخدام:*\n← .addadmin @مستخدم\nأو رد على رسالة بـ .addadmin`,
				`❓ *الاستخدام:*\n← .addadmin @user\nولا جاوب على رسالة بـ .addadmin`
			));
		}

		const targetNum = target.replace(/[^0-9]/g, '');
		const alreadyAdmin = settings.botAdmins.some(a => String(a).replace(/[^0-9]/g, '') === targetNum);
		if (alreadyAdmin) {
			return m.reply(t(
				`⚠️ @${targetNum} is already a bot admin!`,
				`⚠️ @${targetNum} هو بالفعل مشرف للبوت!`,
				`⚠️ @${targetNum} ديجا أدمين دالبوت!`
			));
		}

		settings.botAdmins.push(target);
		await saveToSupabase('bot_admins', settings.botAdmins);
		await m.react('✅');
		return conn.sendMessage(m.chat, {
			text: t(
				`✅ @${targetNum} has been added as a *Bot Admin*!`,
				`✅ تمت إضافة @${targetNum} كـ *مشرف للبوت*!`,
				`✅ @${targetNum} تزاد كـ *أدمين دالبوت*!`
			),
			mentions: [target]
		}, { quoted: m });
	}

	// ─── .deladmin ───────────────────────────────────────────
	if (/^deladmin$/i.test(command)) {
		let target = '';

		if (m.mentionedJid && m.mentionedJid.length > 0) {
			target = m.mentionedJid[0];
		} else if (m.quoted) {
			target = m.quoted.sender || m.quoted.participant || '';
		} else if (text) {
			target = text.trim().replace(/[^0-9]/g, '') + '@s.whatsapp.net';
		}

		if (!target) {
			return m.reply(t(
				`❓ *Usage:*\n← .deladmin @user\nOr reply to a message with .deladmin`,
				`❓ *الاستخدام:*\n← .deladmin @مستخدم\nأو رد على رسالة بـ .deladmin`,
				`❓ *الاستخدام:*\n← .deladmin @user\nولا جاوب على رسالة بـ .deladmin`
			));
		}

		const targetNum = target.replace(/[^0-9]/g, '');
		const idx = settings.botAdmins.findIndex(a => String(a).replace(/[^0-9]/g, '') === targetNum);
		if (idx === -1) {
			return m.reply(t(
				`⚠️ @${targetNum} is not a bot admin.`,
				`⚠️ @${targetNum} ليس مشرفاً للبوت.`,
				`⚠️ @${targetNum} ماشي أدمين دالبوت.`
			));
		}

		settings.botAdmins.splice(idx, 1);
		await saveToSupabase('bot_admins', settings.botAdmins);
		await m.react('✅');
		return conn.sendMessage(m.chat, {
			text: t(
				`✅ @${targetNum} has been removed from *Bot Admins*!`,
				`✅ تمت إزالة @${targetNum} من *مشرفي البوت*!`,
				`✅ @${targetNum} تحيد من *أدمينات البوت*!`
			),
			mentions: [target]
		}, { quoted: m });
	}

	// ─── .listadmin ──────────────────────────────────────────
	if (/^listadmin$/i.test(command)) {
		const admins = settings.botAdmins || [];
		const rawOwner = Array.isArray(global.owner?.[0]) ? global.owner[0][0] : global.owner?.[0];
		const ownerNum = String(rawOwner || '212624855939').replace(/[^0-9]/g, '');
		const ownerJid = ownerNum + '@s.whatsapp.net';
		const currentMode = settings.botMode || 'admin';
		const modeEmojis = { public: '🌍', private: '🔒', group: '👥', admin: '🛡️' };

		let msg = t(
			`🤖 *BOT MANAGEMENT*\n━━━━━━━━━━━━━━━━━━━\n📌 Current Mode: ${modeEmojis[currentMode] || '🛡️'} *${currentMode.toUpperCase()}*\n\n👑 *Owner:*\n• @${ownerNum}\n\n🛡️ *Bot Admins (${admins.length}):*\n`,
			`🤖 *إدارة البوت*\n━━━━━━━━━━━━━━━━━━━\n📌 الوضع الحالي: ${modeEmojis[currentMode] || '🛡️'} *${currentMode.toUpperCase()}*\n\n👑 *المالك:*\n• @${ownerNum}\n\n🛡️ *مشرفو البوت (${admins.length}):*\n`,
			`🤖 *تسيير البوت*\n━━━━━━━━━━━━━━━━━━━\n📌 الوضع دابا: ${modeEmojis[currentMode] || '🛡️'} *${currentMode.toUpperCase()}*\n\n👑 *الأونر:*\n• @${ownerNum}\n\n🛡️ *أدمينات البوت (${admins.length}):*\n`
		);

		if (admins.length === 0) {
			msg += t('_No admins yet. Use .addadmin_', '_لا يوجد مشرفون بعد. استخدم:\n← .addadmin_', '_مازال ما كاين حتى أدمين. استخدم:\n← .addadmin_');
		} else {
			admins.forEach((jid, i) => {
				msg += `${i + 1}. @${String(jid).replace(/[^0-9]/g, '')}\n`;
			});
		}

		msg += t(
			`\n\n📋 *Commands:*\n← .setmode public|private|group|admin\n← .addadmin @user\n← .deladmin @user\n← .listadmin`,
			`\n\n📋 *الأوامر:*\n← .setmode public|private|group|admin\n← .addadmin @مستخدم\n← .deladmin @مستخدم\n← .listadmin`,
			`\n\n📋 *الأوامر:*\n← .setmode public|private|group|admin\n← .addadmin @user\n← .deladmin @user\n← .listadmin`
		);

		const allMentions = [ownerJid, ...admins];
		await m.react('📋');
		return conn.sendMessage(m.chat, { text: msg, mentions: allMentions }, { quoted: m });
	}
};

handler.help  = ['setmode <public|private|admin|group>', 'addadmin', 'deladmin', 'listadmin'];
handler.tags  = ['owner'];
handler.command = /^(setmode|addadmin|deladmin|listadmin)$/i;
handler.owner = true;

export default handler;
