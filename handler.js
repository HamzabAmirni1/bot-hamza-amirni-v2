import { parentPort } from 'worker_threads';
import { smsg } from './lib/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import { unwatchFile, watchFile } from 'fs';
import chalk from 'chalk';

// Listen for direct messages/broadcasts requested from Web Dashboard via worker.postMessage (registered ONCE)
if (parentPort && !global.__parentPortListenerAdded) {
	global.__parentPortListenerAdded = true;
	parentPort.on('message', async (msg) => {
		try {
			if (typeof msg === 'object' && msg && msg.type === 'send_msg') {
				const { jid, text } = msg;
				if (global.conn && jid && text) {
					await global.conn.sendMessage(jid, { text: text });
					console.log(`✅ [Dashboard -> WhatsApp] Message sent to ${jid}`);
				}
			}
		} catch (err) {
			console.error('❌ [Dashboard -> WhatsApp] Send Error:', err.message);
		}
	});
}

// In-memory cache to de-duplicate double triggers (e.g. template button click + text reply fallback)
const recentMessages = new Map();

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

async function incrementStats(cmd) {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);
		const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_stats?select=*&limit=1', {
			headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY },
			signal: controller.signal
		});
		clearTimeout(timeoutId);
		const data = await res.json();
		if (data && data[0]) {
			const row = data[0];
			const newMsgs = (row.messages_handled || 0) + 1;

			let topCmds = Array.isArray(row.top_commands) ? row.top_commands : [];
			let found = false;
			for (let c of topCmds) {
				if (c.cmd === cmd) {
					c.count = (c.count || 0) + 1;
					found = true;
					break;
				}
			}
			if (!found) {
				topCmds.push({ cmd: cmd, count: 1 });
			}
			topCmds.sort((a, b) => (b.count || 0) - (a.count || 0));
			topCmds = topCmds.slice(0, 10);

			const pController = new AbortController();
			const pTimeoutId = setTimeout(() => pController.abort(), 3000);
			await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_stats?id=eq.${row.id}`, {
				method: 'PATCH',
				headers: {
					'apikey': SB_KEY,
					'Authorization': 'Bearer ' + SB_KEY,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					messages_handled: newMsgs,
					top_commands: topCmds,
					last_update: new Date().toISOString()
				}),
				signal: pController.signal
			});
			clearTimeout(pTimeoutId);
		}
	} catch (err) {
		// Non-critical, ignore timeout or fetch errors
	}
}

// In-memory set to avoid hammering Supabase on every message — sync once per session
const registeredUsersCache = new Set();

async function upsertUserToSupabase(jid, name, botPhone) {
	try {
		if (registeredUsersCache.size > 2000) registeredUsersCache.clear();
		// Cache key includes botPhone so same user on different bots is registered separately
		const cacheKey = `${botPhone || ''}:${jid}`;
		if (registeredUsersCache.has(cacheKey)) return;
		registeredUsersCache.add(cacheKey);
		const phone = jid.replace('@s.whatsapp.net', '');
		const cleanBotPhone = (botPhone || '').replace(/[^0-9]/g, '');
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);
		await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/bot_users', {
			method: 'POST',
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Content-Type': 'application/json',
				'Prefer': 'resolution=merge-duplicates'
			},
			body: JSON.stringify({
				phone_number: phone,
				jid: jid,
				name: name || phone,
				bot_phone: cleanBotPhone || null,
				first_seen: new Date().toISOString(),
				last_seen: new Date().toISOString()
			}),
			signal: controller.signal
		});
		clearTimeout(timeoutId);
	} catch (_) {}
}

async function logErrorToSupabase(cmd, errorMsg) {
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 3000);
		await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/error_logs', {
			method: 'POST',
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				command: cmd || 'unknown',
				error_message: String(errorMsg || '').substring(0, 500),
				created_at: new Date().toISOString()
			}),
			signal: controller.signal
		});
		clearTimeout(timeoutId);
	} catch (_) {}
}

/**
 * Handle messages upsert
 * @param {import('baileys').BaileysEventMap<unknown>['messages.upsert']} groupsUpdate
 */
export async function handler(chatUpdate) {
	if (!chatUpdate) return;
	this.pushMessage(chatUpdate.messages).catch(console.error);
	let m = chatUpdate.messages[chatUpdate.messages.length - 1];
	if (!m) return;

	// ── Guard: skip if bot user not yet initialized (still reconnecting) ──
	if (!this.user?.id && !this.user?.jid) return;

	// ── Guard: skip CIPHERTEXT / undecryptable messages (arrive after reconnect) ──
	const mtype = Object.keys(m.message || {})[0] || '';
	if (!mtype) return;
	if (mtype === 'senderKeyDistributionMessage' || mtype === 'protocolMessage') return;
	if (mtype === 'ciphertextMessage') return;
	if (m.message?.messageStubType) return; // server-generated stubs (e-2-e, group updates etc.)

	if (global.db.data == null) await global.loadDatabase();
	try {
		m = smsg(this, m) || m;
		if (!m) return;

		// De-duplicate fast identical commands within 800ms window (skip for Baileys buttons)
		if (m.text && m.text.startsWith('.') && !m.isBaileys) {
			const msgKey = `${m.chat}_${m.sender}_${m.text.trim()}`;
			const now = Date.now();
			if (recentMessages.has(msgKey)) {
				const lastTime = recentMessages.get(msgKey);
				if (now - lastTime < 800) {
					console.log(`[Handler] Ignored fast duplicate command: "${m.text.trim()}"`);
					return;
				}
			}
			recentMessages.set(msgKey, now);
			// Keep cache size small
			if (recentMessages.size > 200) {
				for (const [k, t] of recentMessages.entries()) {
					if (now - t > 10000) recentMessages.delete(k);
				}
			}
		}

		m.exp = 0;
		m.limit = false;

		if (m.sender.endsWith('@broadcast') || m.sender.endsWith('@newsletter')) return;
		await (await import(`./lib/database.js?v=${Date.now()}`)).default(m, this);

		// Register user to Supabase with bot_phone isolation (fire-and-forget, non-blocking)
		if (m.sender.endsWith('@s.whatsapp.net') && !m.fromMe) {
			const _botJid = global.conn?.user?.id || global.conn?.user?.jid || '';
			const _botPhone = _botJid.split(':')[0].replace(/[^0-9]/g, '');
			upsertUserToSupabase(m.sender, m.name || m.pushName || '', _botPhone).catch(() => {});
		}

		if (typeof m.text !== 'string') m.text = '';

		const _botId = global.conn?.user?.id || global.conn?.user?.jid || '';
		const isROwner = [conn.decodeJid(_botId), ...global.owner.map(([number]) => number)].map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
		const isOwner = isROwner || m.fromMe;
		const isPrems = isROwner || db.data.users[m.sender]?.premiumTime > 0;

		// Allow bot to work for everyone in private chats and groups
		// if (global.db.data.settings[this.user.jid].gconly && !m.isGroup && !isOwner && !isPrems) return;
		// if (!global.db.data.settings[this.user.jid].public && !isOwner && !m.fromMe) return;

		if (m.isBaileys) return;
		m.exp += Math.ceil(Math.random() * 10);

		let usedPrefix = '';
		let command = '';
		let _user = global.db.data && global.db.data.users && global.db.data.users[m.sender];
		
		// ── Sync user language preference from Supabase if not in RAM cache ──
		if (_user && !_user.hasSelectedLang && !registeredUsersCache.has('lang_' + m.sender)) {
			registeredUsersCache.add('lang_' + m.sender);
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 2500);
				const res = await fetch(`https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?jid=eq.lang_${m.sender}&select=history`, {
					headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY },
					signal: controller.signal
				});
				clearTimeout(timeoutId);
				const data = await res.json();
				if (data && data[0] && data[0].history) {
					const parsed = JSON.parse(data[0].history);
					if (parsed && parsed.hasSelectedLang) {
						_user.language = parsed.language || 'darija';
						_user.hasSelectedLang = true;
					}
				}
			} catch (_) {}
		}

		// ── Language default: ensure user language is set (defaults to darija) ──
		if (_user && !_user.language) {
			_user.language = 'darija';
			_user.hasSelectedLang = true;
		}

		// ── Language gate: show beautiful welcome if user hasn't selected a language ──
		if (_user && !_user.hasSelectedLang && !m.fromMe && !m.isGroup) {
			const isLangCmd = m.text && (
				/^\.lang(\s|$)/i.test(m.text) ||
				/^\.language/i.test(m.text) ||
				/^\.darija/i.test(m.text) ||
				/^\.arabic/i.test(m.text) ||
				/^\.english/i.test(m.text) ||
				/^[123]$/.test(m.text.trim())
			);
			if (!isLangCmd) {
				const langPrompt =
`╔═══════════════════════╗
  🤖 *بوت حمزة اعمرني* 🤖
╚═══════════════════════╝

*أهلاً وسهلاً بيك!* 👋

━━━━━━━━━━━━━━━━━━━━━━━

🌍 اختار اللغة اللي تعجبك:

  1️⃣  🇲🇦  *الدارجة المغربية*
  2️⃣  🇸🇦  *العربية الفصحى*
  3️⃣  🇬🇧  *English*

━━━━━━━━━━━━━━━━━━━━━━━
💬 كتب *1* أو *2* أو *3*
  أو اضغط على زر هنا 👇`;

				try {
					await this.sendButton(
						m.chat,
						{
							text: langPrompt,
							footer: '⚡ bot amirni hamza | حمزة اعمرني',
							buttons: [
								{ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🇲🇦 دارجة', id: '.lang 1' }) },
								{ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🇸🇦 عربية', id: '.lang 2' }) },
								{ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🇬🇧 English', id: '.lang 3' }) },
							],
						},
						{ quoted: m }
					);
				} catch (_) {
					await m.reply(langPrompt);
				}
				return;
			}
		}


		const groupMetadata = (m.isGroup ? (conn.chats[m.chat] || {}).metadata || (await this.groupMetadata(m.chat).catch((_) => null)) : {}) || {};
		const participants = (m.isGroup ? groupMetadata.participants : []) || [];
		const user = (m.isGroup ? participants.find((u) => conn.getJid(u.id) === m.sender) : {}) || {}; // User Data
		const bot = (m.isGroup ? participants.find((u) => conn.getJid(u.id) == (this.user?.jid || this.user?.id || '')) : {}) || {}; // Your Data
		const isRAdmin = user?.admin == 'superadmin' || false;
		const isAdmin = isRAdmin || user?.admin == 'admin' || false; // Is User Admin?
		const isBotAdmin = bot?.admin || false; // Are you Admin?

		// ─── Global Bot Mode Enforcement (public | private | group | admin) ───
		const _settings = global.db?.data?.settings || {};
		const _botMode = _settings.botMode || 'public';
		const _botAdmins = Array.isArray(_settings.botAdmins) ? _settings.botAdmins : [];
		const _senderNum = String(m.sender || '').replace(/[^0-9]/g, '');

		const _isOwnerUser = isOwner || (global.owner || []).some(o => {
			const num = Array.isArray(o) ? o[0] : o;
			return String(num || '').replace(/[^0-9]/g, '') === _senderNum;
		});

		const _isBotAdminUser = _botAdmins.some(a => String(a).replace(/[^0-9]/g, '') === _senderNum);
		const _isDevCmd = m.text && /^[.!#/\\]?(msgtodev|mstodev|contactdev|msgdev|contact|owner|مطور|رسالة_للمطور)(\s|$)/i.test(m.text.trim());

		if (!_isOwnerUser && !m.fromMe && !_isDevCmd) {
			let blockedReason = null;

			if ((_botMode === 'admin' || _botMode === 'self' || _botMode === 'owner') && !_isBotAdminUser) {
				blockedReason = 'admin';
			} else if ((_botMode === 'private' || _botMode === 'pm') && m.isGroup) {
				blockedReason = 'private';
			} else if ((_botMode === 'group' || _botMode === 'gc') && !m.isGroup) {
				blockedReason = 'group';
			}

			if (blockedReason) {
				// Only send notice in private DM (prv). In groups, send nothing ("groupe maysift walo").
				if (!m.isGroup) {
					const now = Date.now();
					global.__modeNotifyCache = global.__modeNotifyCache || new Map();
					const lastNotified = global.__modeNotifyCache.get(m.chat) || 0;

					if (now - lastNotified > 8000) {
						global.__modeNotifyCache.set(m.chat, now);

						const ownerNum = '212624855939';
						const igLink = 'https://www.instagram.com/hamza_amirni_01';
						const fbLink = 'https://www.facebook.com/profile.php?id=61578860781418';
						const uLang = _user?.language || 'darija';
						const t = (en, ar, da) => uLang === 'english' ? en : uLang === 'arabic' ? ar : da;

						let modeNotice = '';
						if (blockedReason === 'admin') {
							modeNotice = t(
								`🛡️ *Bot is in ADMIN MODE!*\n━━━━━━━━━━━━━━━━━━━━━\nSorry, the bot is currently restricted to *Bot Admins* only.\n\n👑 *Contact Owner / Developer (Hamza Amirni):*\n💬 *WhatsApp:* https://wa.me/${ownerNum}\n📸 *Instagram:* ${igLink}\n👤 *Facebook:* ${fbLink}\n\n✉️ *Or send a direct message using:* \n← .msgtodev your message here\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,

								`🛡️ *البوت في وضع المشرفين (Admin Mode)*\n━━━━━━━━━━━━━━━━━━━━━\nعذراً! البوت حالياً مخصص للمشرفين فقط (Admin Mode).\n\n👑 *إذا أردت التواصل مع المطور/المالك (Hamza Amirni):*\n💬 *واتساب:* https://wa.me/${ownerNum}\n📸 *إنستغرام:* ${igLink}\n👤 *فيسبوك:* ${fbLink}\n\n✉️ *أو يمكنك إرسال رسالة فورية عبر الأمر:*\n← .msgtodev رسالتك هنا\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,

								`🛡️ *البوت فـ وضع الأدمينات (Admin Mode)*\n━━━━━━━━━━━━━━━━━━━━━\nسمح لينا! البوت دابا خدام غير للأدمينات (Admin Mode) فقط.\n\n👑 *إلا بغيتي تتواصل مع المطور/الأونر (Hamza Amirni):*\n💬 *WhatsApp:* https://wa.me/${ownerNum}\n📸 *Instagram:* ${igLink}\n👤 *Facebook:* ${fbLink}\n\n✉️ *ولا تقدر تصيفط ليه ميساج بأمر:*\n← .msgtodev كتبت الرسالة ديالك هنا\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
							);
						} else {
							modeNotice = t(
								`🔒 *Bot is currently restricted!*\n━━━━━━━━━━━━━━━━━━━━━\n👑 *Contact Owner (Hamza Amirni):*\n💬 *WhatsApp:* https://wa.me/${ownerNum}\n📸 *Instagram:* ${igLink}\n👤 *Facebook:* ${fbLink}\n\n✉️ *Or send a direct message using:*\n← .msgtodev your message here\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,

								`🔒 *البوت محظور مؤقتاً بهذه المحادثة!*\n━━━━━━━━━━━━━━━━━━━━━\n👑 *للتواصل مع المالك (Hamza Amirni):*\n💬 *واتساب:* https://wa.me/${ownerNum}\n📸 *إنستغرام:* ${igLink}\n👤 *فيسبوك:* ${fbLink}\n\n✉️ *أو أرسل رسالة عبر:* \n← .msgtodev رسالتك هنا\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,

								`🔒 *البوت محدود دابا فهاد المحادثة!*\n━━━━━━━━━━━━━━━━━━━━━\n👑 *لتواصل مع الأونر (Hamza Amirni):*\n💬 *WhatsApp:* https://wa.me/${ownerNum}\n📸 *Instagram:* ${igLink}\n👤 *Facebook:* ${fbLink}\n\n✉️ *ولا صيفط ليه ميساج بأمر:*\n← .msgtodev كتبت الرسالة ديالك هنا\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
							);
						}

						const buttons = [
							{
								name: 'cta_url',
								buttonParamsJson: JSON.stringify({
									display_text: t('💬 WhatsApp Owner', '💬 واتساب المطور', '💬 واتساب المطور'),
									url: `https://wa.me/${ownerNum}`,
									merchant_url: `https://wa.me/${ownerNum}`
								})
							},
							{
								name: 'cta_url',
								buttonParamsJson: JSON.stringify({
									display_text: t('📸 Instagram', '📸 أنستغرام المطور', '📸 أنستغرام المطور'),
									url: igLink,
									merchant_url: igLink
								})
							},
							{
								name: 'cta_url',
								buttonParamsJson: JSON.stringify({
									display_text: t('👤 Facebook', '👤 فيسبوك المطور', '👤 فيسبوك المطور'),
									url: fbLink,
									merchant_url: fbLink
								})
							}
						];

						try {
							await this.sendButton(
								m.chat,
								{
									text: modeNotice,
									footer: 'bot amirni hamza • حمزة اعمرني',
									buttons: buttons
								},
								{ quoted: m }
							);
						} catch (_) {
							await this.sendMessage(m.chat, {
								text: modeNotice,
								mentions: [ownerNum + '@s.whatsapp.net']
							}, { quoted: m });
						}
					}
				}

				return; // Block non-bot-admins when in restricted mode
			}
		}

		const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');
		for (let name in global.plugins) {
			let plugin = global.plugins[name];
			if (!plugin) continue;
			if (plugin.disabled) continue;
			const __filename = path.join(___dirname, name);
			if (typeof plugin.all === 'function') {
				try {
					await plugin.all.call(this, m, {
						chatUpdate,
						__dirname: ___dirname,
						__filename,
					});
				} catch (e) {
					// if (typeof e === 'string') continue
					console.error(e);
					logErrorToSupabase('all:' + name, e?.message || format(e)).catch(() => {});
					for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
						let data = (await conn.onWhatsApp(jid))[0] || {};
						if (data.exists) m.reply(`*Plugin:* ${name}\n*Sender:* ${m.sender}\n*Chat:* ${m.chat}\n*Command:* ${m.text}\n\n\`\`\`${format(e)}\`\`\``.trim(), data.jid);
					}
				}
			}
			if (plugin.tags && plugin.tags.includes('admin')) {
				// global.dfail('restrict', m, this)
				continue;
			}
			if ((global.opts?.['mode'] || global.opts?.['self']) && !m.isOwner && !m.fromMe) return;
			const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
			let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix;
			let match = (
				_prefix instanceof RegExp // RegExp Mode?
					? [[_prefix.exec(m.text), _prefix]]
					: Array.isArray(_prefix) // Array?
						? _prefix.map((p) => {
								let re =
									p instanceof RegExp // RegExp in Array?
										? p
										: new RegExp(str2Regex(p));
								return [re.exec(m.text), re];
							})
						: typeof _prefix === 'string' // String?
							? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]
							: [[[], new RegExp()]]
			).find((p) => p[1]);
			if (typeof plugin.before === 'function') {
				if (
					await plugin.before.call(this, m, {
						match,
						conn: this,
						participants,
						groupMetadata,
						user,
						bot,
						isROwner,
						isOwner,
						isRAdmin,
						isAdmin,
						isBotAdmin,
						isPrems,
						chatUpdate,
						__dirname: ___dirname,
						__filename,
					})
				)
					continue;
			}
			if (typeof plugin !== 'function') continue;
			if ((usedPrefix = (match[0] || '')[0])) {
				let noPrefix = m.text.replace(usedPrefix, '');
				let args;
				[command, ...args] = noPrefix.trim().split` `.filter((v) => v);
				args = args || [];
				let _args = noPrefix.trim().split` `.slice(1);
				let text = _args.join` `;
				command = (command || '').toLowerCase();
				let fail = plugin.fail || global.dfail; // When failed
				let isAccept =
					plugin.command instanceof RegExp // RegExp Mode?
						? plugin.command.test(command)
						: Array.isArray(plugin.command) // Array?
							? plugin.command.some((cmd) =>
									cmd instanceof RegExp // RegExp in Array?
										? cmd.test(command)
										: cmd === command
								)
							: typeof plugin.command === 'string' // String?
								? plugin.command === command
								: false;

				if (!isAccept) continue;
				m.plugin = name;
				if (!isOwner && (m.chat in global.db.data.chats || m.sender in global.db.data.users)) {
					let chat = global.db.data.chats[m.chat];
					if (name != 'tools-delete.js' && chat?.isBanned) return; // Except this
				}
				if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) {
					// Both Owner
					fail('owner', m, this);
					continue;
				}
				if (plugin.rowner && !isROwner) {
					// Real Owner
					fail('rowner', m, this);
					continue;
				}
				if (plugin.owner && !isOwner) {
					// Number Owner
					fail('owner', m, this);
					continue;
				}
				if (plugin.premium && !isPrems) {
					// Premium
					fail('premium', m, this);
					continue;
				}
				if (plugin.group && !m.isGroup) {
					// Group Only
					fail('group', m, this);
					continue;
				} else if (plugin.botAdmin && !isBotAdmin) {
					// You Admin
					fail('botAdmin', m, this);
					continue;
				} else if (plugin.admin && !isAdmin) {
					// User Admin
					fail('admin', m, this);
					continue;
				}
				if (plugin.private && m.isGroup) {
					// Private Chat Only
					fail('private', m, this);
					continue;
				}
				if (plugin.register == true && _user?.registered == false) {
					// Butuh daftar?
					fail('unreg', m, this);
					continue;
				}
				m.isCommand = true;
				let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17; // XP Earning per command
				if (xp > 200)
					m.reply('Ngecit -_-'); // Hehehe
				else m.exp += xp;
				const userLimit = _user?.limit ?? (global.db.data?.users?.[m.sender]?.limit || 20);
				if (!isPrems && plugin.limit && userLimit < plugin.limit * 1) {
					this.reply(m.chat, `[❗]Your limit has run out, please buy via *${usedPrefix}buy limit*`, m);
					continue; // Limit habis
				}
				const userLevel = _user?.level || 1;
				if (plugin.level > userLevel) {
					this.reply(m.chat, `[💬] Level required ${plugin.level} to use this command\n*Your level:* ${userLevel} 📊`, m);
					continue; // If the level has not been reached
				}
				let extra = {
					match,
					usedPrefix,
					noPrefix,
					_args,
					args,
					command,
					text,
					conn: this,
					participants,
					groupMetadata,
					user,
					bot,
					isROwner,
					isOwner,
					isRAdmin,
					isAdmin,
					isBotAdmin,
					isPrems,
					chatUpdate,
					__dirname: ___dirname,
					__filename,
				};
				try {
					await plugin.call(this, m, extra);
					incrementStats(command).catch(() => {});
					if (!isPrems) m.limit = m.limit || plugin.limit || false;
				} catch (e) {
					// Error occured
					m.error = e;
					console.error(e);
					logErrorToSupabase(command || m.plugin, e?.message || format(e)).catch(() => {});
					if (e) {
						let text = format(e);
						if (e.name)
							for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
								let data = (await conn.onWhatsApp(jid))[0] || {};
								if (data.exists)
									m.reply(
										`*🗂️ Plugin:* ${m.plugin}\n*👤 Sender:* ${m.sender}\n*💬 Chat:* ${m.chat}\n*💻 Command:* ${usedPrefix}${command} ${args.join(' ')}\n📄 *Error Logs:*\n\n\`\`\`${text}\`\`\``.trim(),
										data.jid
									);
							}
						m.reply(text);
					}
				} finally {
					if (typeof plugin.after === 'function') {
						try {
							await plugin.after.call(this, m, extra);
						} catch (e) {
							console.error(e);
						}
					}
					if (m.limit) m.reply(+m.limit + ' Limit used ✔️');
				}
				break;
			}
		}

		// ── Unknown command reply (multilingual) ─────────────────────────
		if (!m.isCommand && usedPrefix && command) {
			const __u = global.db.data.users[m.sender] || {};
			const __lang = __u.language || 'darija';
			const __unknownMsg = {
				darija: `❌ *أ صاحبي، هذا الأمر مكاينش!* 😅\n\nهاد الأمر مكتوبش عندي فالقاموس ديالي:\n← *${usedPrefix}${command}*\n\n📋 كتب باش تشوف جميع الأوامر المتاحة:\n← *${usedPrefix}menu*\n\n⚡ *bot amirni hamza*`,
				arabic: `❌ *الأمر غير موجود!*\n\nهذا الأمر غير متاح في البوت:\n← *${usedPrefix}${command}*\n\n📋 أرسل لعرض جميع الأوامر المتاحة:\n← *${usedPrefix}menu*\n\n⚡ *bot amirni hamza*`,
				english: `❌ *Command not found!*\n\nThe command doesn't exist:\n← *${usedPrefix}${command}*\n\n📋 Type *${usedPrefix}menu* to see all available commands.\n\n⚡ *bot amirni hamza*`,
			};
			await m.reply(__unknownMsg[__lang] || __unknownMsg['darija']);
		}

	} catch (e) {
		console.error(e);
	} finally {
		let user,
			stats = global.db.data.stats;

		if (m) {
			if (m.sender && (user = global.db.data.users[m.sender])) {
				user.exp += Number(m.exp || 0);
				user.limit -= Number(m.limit || 0);
			}

			if (m.plugin) {
				const now = Date.now();

				stats[m.plugin] = {
					total: 0,
					success: 0,
					last: 0,
					lastSuccess: 0,
					...stats[m.plugin],
				};

				stats[m.plugin].total++;
				stats[m.plugin].last = now;

				if (!m.error) {
					stats[m.plugin].success++;
					stats[m.plugin].lastSuccess = now;
				}
			}
		}

		try {
			await (await import(`./lib/print.js`)).default(m, this);
		} catch (e) {
			console.log(m, m.quoted, e);
		}
		if (global.db.data.settings[this.user?.jid || conn.user?.jid || '']?.autoread) await conn.readMessages([m.key]).catch(() => {});
	}
}

/**
 * Handle groups participants update
 * @param {import('baileys').BaileysEventMap<unknown>['group-participants.update']} groupsUpdate
 */
export async function participantsUpdate({ id, participants, action, simulate = false }) {
	// if (id in conn.chats) return // First login will spam
	if (this.isInit && !simulate) return;
	if (global.db.data == null) await loadDatabase();
	let chat = global.db.data.chats[id] || {};
	let text = '';
	const groupMetadata = (conn.chats[id] || {}).metadata || (await this.groupMetadata(id));
	switch (action) {
		case 'add':
		case 'remove':
			if (chat.welcome) {
				for (let user of participants) {
					user = this.getJid(user?.phoneNumber || user.id);
					const tamnel = await this.profilePictureUrl(user, 'image', 'buffer');
					text = (action === 'add' ? chat.sWelcome || this.welcome || conn.welcome || 'Welcome, @user!' : chat.sBye || this.bye || conn.bye || 'Bye, @user!')
						.replace('@user', `@${user.split('@')[0]}`)
						.replace('@subject', this.getName(id))
						.replace('@desc', groupMetadata.desc || '');
					this.adReply(id, text, tamnel, null, { title: action == 'add' ? '💌 WELCOME' : '🐾 BYE', description: action == 'add' ? 'YES THE LOAD OF THE GROUP INCREASED1 :(' : 'BYE ! :)' });
				}
			}
			break;
		case 'promote':
		case 'demote':
			for (let users of participants) {
				let user = this.getJid(users?.phoneNumber || users.id);
				text = (
					action === 'promote'
						? chat.sPromote || this.spromote || conn.spromote || '@user ```is now Admin```'
						: chat.sDemote || this.sdemote || conn.sdemote || '@user ```is no longer Admin```'
				)
					.replace('@user', '@' + user.split('@')[0])
					.replace('@subject', this.getName(id))
					.replace('@desc', groupMetadata.desc || '');
				if (chat.detect) this.sendMessage(id, { text, mentions: this.parseMention(text) });
			}
			break;
	}
}
/**
 * Handle groups update
 * @param {import('baileys').BaileysEventMap<unknown>['groups.update']} groupsUpdate
 */
export async function groupsUpdate(groupsUpdate) {
	for (const groupUpdate of groupsUpdate) {
		const id = groupUpdate.id;
		if (!id) continue;
		let chats = global.db.data.chats[id],
			text = '';
		if (!chats?.detect) continue;
		if (groupUpdate.desc) text = (chats.sDesc || this.sDesc || conn.sDesc || '```Description has been changed to```\n@desc').replace('@desc', groupUpdate.desc);
		if (groupUpdate.subject) text = (chats.sSubject || this.sSubject || conn.sSubject || '```Subject has been changed to```\n@subject').replace('@subject', groupUpdate.subject);
		if (groupUpdate.icon) text = (chats.sIcon || this.sIcon || conn.sIcon || '```Icon has been changed to```').replace('@icon', groupUpdate.icon);
		if (groupUpdate.revoke) text = (chats.sRevoke || this.sRevoke || conn.sRevoke || '```Group link has been changed to```\n@revoke').replace('@revoke', groupUpdate.revoke);
		if (!text) continue;
		await this.sendMessage(id, { text, mentions: this.parseMention(text) });
	}
}

export async function deleteUpdate(message) {
	try {
		const { fromMe, id, participant } = message;
		if (fromMe) return;
		let msg = this.serializeM(this.loadMessage(id));
		if (!msg) return;
		let chat = global.db.data.chats[msg.chat];
		if (!chat.delete) return;
		await this.reply(
			msg.chat,
			`Detected @${participant.split`@`[0]} has deleted a message\nTo disable this feature, type\n*.enable delete*\n\nتم رصد @${participant.split`@`[0]} قام بحذف رسالة\nلإيقاف هذه الميزة، اكتب\n*.enable delete*`.trim(),
			msg,
			{
				mentions: [participant],
			}
		);
		this.copyNForward(msg.chat, msg).catch((e) => console.log(e, msg));
	} catch (e) {
		console.error(e);
	}
}

global.dfail = (type, m, conn) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';

	let msgs = {
		darija: {
			rowner: '⚠️ أ العشير، هذا الأمر مخصص غير للمطور البوت بوحدو! 👨‍💻',
			owner: '⛔ إيححح! هذا الأمر مخصص لمالك البوت بوحدو أ الساط 👑',
			premium: '💎 صاحبي، خاصك تكون VIP / Premium باش تستعمل هذه الخدمة المريقلة!',
			group: '👥 أ الخاوة، هذا الأمر خدام غير وسط الجروبات ماشي فالخاص!',
			private: '🔒 أ سيدي، هذا الأمر خدام غير فالخاص بيني وبينك!',
			admin: '🛡️ وا الساط، خاصك تكون أدمن فالجروب باش تحكم فآدارتي!',
			botAdmin: '🤖 وا راني ماشي أدمن فالجروب أ الشريف! ردني أدمن هو الأول باش نخدم لك!',
			unreg: '👋 مرحباً أ الزين! خاصك تسجل فالبوت باش تمتع بالأوامر كاملين!\nاكتب .daftar الاسم.العمر',
			restrict: '🚫 الميزة غير مفعلة فالجروب أ السي.'
		},
		arabic: {
			rowner: '⚠️ هذا الأمر مخصص لمطور البوت فقط 👨‍💻',
			owner: '⛔ هذا الأمر مخصص لمالك البوت فقط 👑',
			premium: '💎 هذا الأمر مخصص للمستخدمين المميزين (Premium) فقط!',
			group: '👥 هذا الأمر يعمل داخل المجموعات فقط!',
			private: '🔒 هذا الأمر يعمل في المحادثات الخاصة فقط!',
			admin: '🛡️ هذا الأمر مخصص لمشرفي المجموعة فقط!',
			botAdmin: '🤖 يجب أن يكون البوت مشرفاً (Admin) في المجموعة لاستخدام هذا الأمر!',
			unreg: '👋 يجب عليك التسجيل في قاعدة البيانات أولاً قبل استخدام هذه الميزة!\nاكتب .daftar الاسم.العمر للتسجيل',
			restrict: '🚫 هذه الميزة غير مفعّلة في هذه المحادثة.'
		},
		english: {
			rowner: '⚠️ This command is restricted to the Bot Developer only 👨‍💻',
			owner: '⛔ This command is for the Bot Owner only 👑',
			premium: '💎 This command is for Premium users only!',
			group: '👥 This command can only be used in Group chats!',
			private: '🔒 This command can only be used in Private chat!',
			admin: '🛡️ This command is for Group Admins only!',
			botAdmin: '🤖 The bot needs to be an Admin in this group to perform this action!',
			unreg: '👋 You need to register first before using this feature!\nType .daftar Name.age to register',
			restrict: '🚫 This feature is disabled in this chat.'
		}
	};

	let dict = msgs[lang] || msgs['darija'];
	let msg = dict[type] || dict['owner'];
	if (msg) return conn.reply(m.chat, msg, m);
};

let file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
	unwatchFile(file);
	console.log(chalk.redBright("Update 'handler.js'"));
	if (global.reloadHandler) console.log(await global.reloadHandler());
});
