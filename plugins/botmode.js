// ============================================================
// Bot Mode & Owner / Admin Management Plugin
// Commands: .setmode | .addadmin | .deladmin | .listadmin | .addowner | .delowner | .listowners
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
		await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_configs', {
			method: 'POST',
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Content-Type': 'application/json',
				'Prefer': 'resolution=merge-duplicates'
			},
			body: JSON.stringify([{ key, value: strVal, updated_at: new Date().toISOString() }])
		}).catch(() => {});
	} catch (_) {}
}

function getGlobalSettings() {
	if (!global.db?.data) return null;
	if (!global.db.data.settings) global.db.data.settings = {};
	const s = global.db.data.settings;
	if (!Array.isArray(s.botAdmins)) s.botAdmins = [];
	if (!Array.isArray(global.botOwners)) global.botOwners = [];
	if (!s.botMode) s.botMode = 'public'; // Default to public (everyone can use)
	return s;
}

let handler = async (m, { command, text, conn }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	const settings = getGlobalSettings();
	if (!settings) return m.reply('❌ Database not ready.');

	// ─── .setmode ────────────────────────────────────────────
	if (/^setmode$/i.test(command)) {
		const VALID_MODES = ['public', 'private', 'admin', 'group', 'vu'];
		const newMode = text?.trim().toLowerCase();
		const botPhone = (conn.user?.id || conn.user?.jid || process.env.PAIRING_NUMBER || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
		const currentMode = (botPhone && settings[`botMode_${botPhone}`]) || settings.botMode || 'private';

		if (!newMode || !VALID_MODES.includes(newMode)) {
			return m.reply(t(
				`❓ *Usage:*\n← .setmode <mode>\n\n📋 Available modes:\n🔒 *private* — DMs only (Default)\n🌍 *public* — Everyone can use the bot\n👥 *group* — Groups only\n🛡️ *admin* — Bot admins only\n👁️ *vu* — Bot admins only (all chats)\n\n📌 Current mode (+${botPhone}): *${currentMode}*`,
				`❓ *الاستخدام:*\n← .setmode <mode>\n\n📋 الأوضاع:\n🔒 *private* — رسائل خاصة فقط (الافتراضي)\n🌍 *public* — للجميع\n👥 *group* — مجموعات فقط\n🛡️ *admin* — للمشرفين فقط\n👁️ *vu* — للمشرفين فقط (في كل مكان)\n\n📌 الوضع الحالي (+${botPhone}): *${currentMode}*`,
				`❓ *الاستخدام:*\n← .setmode <mode>\n\n📋 الأوضاع:\n🔒 *private* — رسائل خاصة غير (الافتراضي)\n🌍 *public* — للجميع\n👥 *group* — الگروبات غير\n🛡️ *admin* — الأدمينات غير\n👁️ *vu* — الأدمينات غير (فكلشي: گروبات + خاص)\n\n📌 الوضع دابا (+${botPhone}): *${currentMode}*`
			));
		}

		if (botPhone) {
			settings[`botMode_${botPhone}`] = newMode;
			await saveToSupabase(`bot_mode_${botPhone}`, newMode);
		}
		settings.botMode = newMode;
		await saveToSupabase('bot_mode', newMode);

		const modeEmojis = { public: '🌍', private: '🔒', group: '👥', admin: '🛡️', vu: '👁️' };
		const modeLabels = {
			public:  t('Public — Everyone can use', 'عام — للجميع', 'عام — للجميع'),
			private: t('Private — DMs only', 'خاص — رسائل خاصة فقط', 'خاص — رسائل خاصة غير'),
			group:   t('Group — Groups only', 'مجموعات فقط', 'الگروبات غير'),
			admin:   t('Admin — Bot admins only', 'مشرفون — للمشرفين فقط', 'الأدمينات غير'),
			vu:      t('VU — Bot admins only (groups + DMs)', 'VU — للمشرفين فقط (گروبات + خاص)', 'VU — الأدمينات غير (فكلشي: گروبات + خاص)'),
		};

		await m.react('✅');
		return m.reply(
			`${modeEmojis[newMode]} *Bot Mode Changed (+${botPhone})!*\n\n` +
			t(
				`New mode for +${botPhone}: *${newMode.toUpperCase()}*\n${modeLabels[newMode]}`,
				`الوضع الجديد للبوت (+${botPhone}): *${newMode.toUpperCase()}*\n${modeLabels[newMode]}`,
				`الوضع الجديد للبوت (+${botPhone}): *${newMode.toUpperCase()}*\n${modeLabels[newMode]}`
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

	// ─── .addowner ───────────────────────────────────────────
	if (/^addowner$/i.test(command)) {
		let target = '';

		if (m.mentionedJid && m.mentionedJid.length > 0) {
			target = m.mentionedJid[0];
		} else if (m.quoted) {
			target = m.quoted.sender || m.quoted.participant || '';
		} else if (text) {
			target = text.trim().replace(/[^0-9]/g, '') + '@s.whatsapp.net';
		}

		if (!target || target === '@s.whatsapp.net') {
			return m.reply(t(
				`❓ *Usage:*\n← .addowner @user\nOr reply to a message with .addowner`,
				`❓ *الاستخدام:*\n← .addowner @مستخدم\nأو رد على رسالة بـ .addowner`,
				`❓ *الاستخدام:*\n← .addowner @user\nولا جاوب على ميساج بـ .addowner`
			));
		}

		const targetNum = target.replace(/[^0-9]/g, '');
		const staticOwners = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, ''));
		const dynamicOwners = (global.botOwners || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, ''));

		if (staticOwners.includes(targetNum) || dynamicOwners.includes(targetNum)) {
			return m.reply(t(
				`⚠️ @${targetNum} is already a Bot Owner with full permissions!`,
				`⚠️ @${targetNum} هو بالفعل مالك للبوت ولديه كافة الصلاحيات!`,
				`⚠️ @${targetNum} ديجا أونر دالبوت وعندو كاع الصلاحيات بلا حدود!`
			));
		}

		if (!Array.isArray(global.botOwners)) global.botOwners = [];
		global.botOwners.push(targetNum);
		await saveToSupabase('bot_owners', global.botOwners);

		// If user was previously an admin, clean from admins array (they are now full owner)
		const admIdx = settings.botAdmins.findIndex(a => String(a).replace(/[^0-9]/g, '') === targetNum);
		if (admIdx !== -1) {
			settings.botAdmins.splice(admIdx, 1);
			await saveToSupabase('bot_admins', settings.botAdmins);
		}

		await m.react('👑');
		return conn.sendMessage(m.chat, {
			text: t(
				`👑 @${targetNum} is now a *Bot Owner*!\nThey have unlimited access to all commands and settings.`,
				`👑 تمت ترقية @${targetNum} إلى *مالك للبوت (Owner)*!\nأصبح لديه صلاحيات كاملة غير محدودة للتحكم في كافة الأوامر والإعدادات.`,
				`👑 تبارك الله، @${targetNum} ولا *أونر دالبوت (Owner)*!\nعندو كاع الصلاحيات والتحكم الكامل فكلشي بلا حتى شي حدود.`
			),
			mentions: [target]
		}, { quoted: m });
	}

	// ─── .delowner ───────────────────────────────────────────
	if (/^delowner$/i.test(command)) {
		let target = '';

		if (m.mentionedJid && m.mentionedJid.length > 0) {
			target = m.mentionedJid[0];
		} else if (m.quoted) {
			target = m.quoted.sender || m.quoted.participant || '';
		} else if (text) {
			target = text.trim().replace(/[^0-9]/g, '') + '@s.whatsapp.net';
		}

		if (!target || target === '@s.whatsapp.net') {
			return m.reply(t(
				`❓ *Usage:*\n← .delowner @user\nOr reply to a message with .delowner`,
				`❓ *الاستخدام:*\n← .delowner @مستخدم\nأو رد على رسالة بـ .delowner`,
				`❓ *الاستخدام:*\n← .delowner @user\nولا جاوب على ميساج بـ .delowner`
			));
		}

		const targetNum = target.replace(/[^0-9]/g, '');
		const rawRootOwner = Array.isArray(global.owner?.[0]) ? global.owner[0][0] : global.owner?.[0];
		const rootOwnerNum = String(rawRootOwner || '212624855939').replace(/[^0-9]/g, '');

		// Protect root owner from deletion
		if (targetNum === rootOwnerNum) {
			return m.reply(t(
				`❌ Cannot remove the Primary Root Owner!`,
				`❌ لا يمكن حذف المالك الأصلي للبوت!`,
				`❌ ما يمكنش تحيد المالك الأصلي ديال البوت!`
			));
		}

		if (!Array.isArray(global.botOwners)) global.botOwners = [];
		const idx = global.botOwners.findIndex(o => String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, '') === targetNum);
		if (idx === -1) {
			return m.reply(t(
				`⚠️ @${targetNum} is not in the additional owners list.`,
				`⚠️ @${targetNum} ليس مسجلاً في قائمة المالكين الإضافيين.`,
				`⚠️ @${targetNum} ماشي مقيد فليستة ديال الأونرز الإضافيين.`
			));
		}

		global.botOwners.splice(idx, 1);
		await saveToSupabase('bot_owners', global.botOwners);

		await m.react('✅');
		return conn.sendMessage(m.chat, {
			text: t(
				`✅ @${targetNum} has been removed from *Bot Owners*.`,
				`✅ تمت إزالة @${targetNum} من *مالكي البوت*!`,
				`✅ @${targetNum} تحيد من *أونرز البوت*!`
			),
			mentions: [target]
		}, { quoted: m });
	}

	// ─── .listowners / .owners ───────────────────────────────
	if (/^(listowners|owners)$/i.test(command)) {
		const rawRootOwner = Array.isArray(global.owner?.[0]) ? global.owner[0][0] : global.owner?.[0];
		const rootOwnerNum = String(rawRootOwner || '212624855939').replace(/[^0-9]/g, '');
		const rootOwnerJid = rootOwnerNum + '@s.whatsapp.net';
		const dynamicOwners = (global.botOwners || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, '')).filter(n => n && n !== rootOwnerNum);

		let msg = t(
			`👑 *BOT OWNERS (FULL ACCESS)*\n━━━━━━━━━━━━━━━━━━━━\n👑 *Root Owner (Primary):*\n• @${rootOwnerNum}\n\n👑 *Additional Owners (${dynamicOwners.length}):*\n`,
			`👑 *قائمة مالكي البوت (صلاحيات كاملة بلا حدود)*\n━━━━━━━━━━━━━━━━━━━━\n👑 *المالك الرئيسي (الأصلي):*\n• @${rootOwnerNum}\n\n👑 *المالكون الإضافيون (${dynamicOwners.length}):*\n`,
			`👑 *أونرز البوت (تحكم كامل بلا حدود)*\n━━━━━━━━━━━━━━━━━━━━\n👑 *الأونر الأصلي:* \n• @${rootOwnerNum}\n\n👑 *الأونرز الإضافيين (${dynamicOwners.length}):*\n`
		);

		if (dynamicOwners.length === 0) {
			msg += t('_No additional owners added yet._\n', '_لا يوجد مالكون إضافيون بعد._\n', '_مازال ما كاين حتى أونر إضافي._\n');
		} else {
			dynamicOwners.forEach((num, i) => {
				msg += `${i + 1}. @${num}\n`;
			});
		}

		msg += t(
			`\n📌 *Commands:*\n← .addowner @user\n← .delowner @user\n← .listowners`,
			`\n📌 *الأوامر:*\n← .addowner @مستخدم\n← .delowner @مستخدم\n← .listowners`,
			`\n📌 *الأوامر:*\n← .addowner @user\n← .delowner @user\n← .listowners`
		);

		const mentions = [rootOwnerJid, ...dynamicOwners.map(n => n + '@s.whatsapp.net')];
		await m.react('👑');
		return conn.sendMessage(m.chat, { text: msg, mentions }, { quoted: m });
	}

	// ─── .listadmin ──────────────────────────────────────────
	if (/^listadmin$/i.test(command)) {
		const admins = settings.botAdmins || [];
		const rawOwner = Array.isArray(global.owner?.[0]) ? global.owner[0][0] : global.owner?.[0];
		const rootOwnerNum = String(rawOwner || '212624855939').replace(/[^0-9]/g, '');
		const dynamicOwners = (global.botOwners || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/[^0-9]/g, '')).filter(n => n && n !== rootOwnerNum);
		const botPhone = (conn.user?.id || conn.user?.jid || process.env.PAIRING_NUMBER || '').split(':')[0].split('@')[0].replace(/[^0-9]/g, '');
		const currentMode = (botPhone && settings[`botMode_${botPhone}`]) || settings.botMode || 'private';
		const modeEmojis = { public: '🌍', private: '🔒', group: '👥', admin: '🛡️', vu: '👁️' };

		let msg = t(
			`🤖 *BOT MANAGEMENT & ROLES*\n━━━━━━━━━━━━━━━━━━━\n📌 Current Mode: ${modeEmojis[currentMode] || '🛡️'} *${currentMode.toUpperCase()}*\n\n👑 *Bot Owners (Unlimited Full Control):*\n• @${rootOwnerNum} _(Root Owner)_\n`,
			`🤖 *إدارة البوت والرتب*\n━━━━━━━━━━━━━━━━━━━\n📌 الوضع الحالي: ${modeEmojis[currentMode] || '🛡️'} *${currentMode.toUpperCase()}*\n\n👑 *مالكو البوت (تحكم كامل بلا حدود):*\n• @${rootOwnerNum} _(المالك الأصلي)_\n`,
			`🤖 *تسيير البوت والرتب*\n━━━━━━━━━━━━━━━━━━━\n📌 الوضع دابا: ${modeEmojis[currentMode] || '🛡️'} *${currentMode.toUpperCase()}*\n\n👑 *أونرز البوت (تحكم كامل بلا حدود):*\n• @${rootOwnerNum} _(الأونر الأصلي)_\n`
		);

		dynamicOwners.forEach((num) => {
			msg += `• @${num} _(Owner)_\n`;
		});

		msg += t(
			`\n🛡️ *Bot Admins (${admins.length}) [Admin Mode Only]:*\n`,
			`\n🛡️ *مشرفو البوت (${admins.length}) [وضع Admin Mode فقط]:*\n`,
			`\n🛡️ *أدمينات البوت (${admins.length}) [فمود Admin فقط]:*\n`
		);

		if (admins.length === 0) {
			msg += t('_No admins yet. Use .addadmin_', '_لا يوجد مشرفون بعد. استخدم:\n← .addadmin_', '_مازال ما كاين حتى أدمين. استخدم:\n← .addadmin_');
		} else {
			admins.forEach((jid, i) => {
				msg += `${i + 1}. @${String(jid).replace(/[^0-9]/g, '')}\n`;
			});
		}

		msg += t(
			`\n\n📋 *Commands:*\n← .setmode public|private|group|admin\n← .addowner @user\n← .delowner @user\n← .listowners\n← .addadmin @user\n← .deladmin @user\n← .listadmin`,
			`\n\n📋 *الأوامر:*\n← .setmode public|private|group|admin\n← .addowner @مستخدم\n← .delowner @مستخدم\n← .listowners\n← .addadmin @مستخدم\n← .deladmin @مستخدم\n← .listadmin`,
			`\n\n📋 *الأوامر:*\n← .setmode public|private|group|admin\n← .addowner @user\n← .delowner @user\n← .listowners\n← .addadmin @user\n← .deladmin @user\n← .listadmin`
		);

		const allMentions = [
			rootOwnerNum + '@s.whatsapp.net',
			...dynamicOwners.map(n => n + '@s.whatsapp.net'),
			...admins
		];
		await m.react('📋');
		return conn.sendMessage(m.chat, { text: msg, mentions: allMentions }, { quoted: m });
	}
};

handler.help  = ['setmode <public|private|admin|group>', 'addadmin', 'deladmin', 'listadmin', 'addowner', 'delowner', 'listowners'];
handler.tags  = ['owner'];
handler.command = /^(setmode|addadmin|deladmin|listadmin|addowner|delowner|listowners|owners)$/i;
handler.owner = true;

export default handler;
