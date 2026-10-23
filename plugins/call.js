/**
 * 📞 Real WhatsApp VoIP Calling Plugin
 * إجراء مكالمات واتساب حقيقية مباشرة (صوتية أو فيديو) مع بث وسائط والتحكم فيها
 */

import os from 'os';
import path from 'path';
import fs from 'fs';

const voipInstances = new WeakMap();

async function getVoip(conn) {
	let voip = voipInstances.get(conn);
	if (!voip) {
		const { default: Voip } = await import('../lib/voip/index.js');
		voip = new Voip(conn, { voipLogLevel: 'info' });
		voipInstances.set(conn, voip);
	}
	return voip;
}

let activeCalls = new Map();
const VIDEO_EXT_RE = /\.(mp4|mov|webm|mkv|avi|m4v|3gp)(\?|#|$)/i;

async function downloadQuotedMedia(quoted) {
	const mime = quoted?.mimetype || '';
	const kind = /^video/.test(mime) ? 'video' : /^audio/.test(mime) ? 'audio' : null;
	if (!kind) return null;

	const buffer = await quoted.download();
	if (!buffer) throw 'فشل تحميل المقطع الصوتي أو الفيديو المرفق.';

	const ext = kind === 'video' ? '.mp4' : '.audio';
	const filePath = path.join(os.tmpdir(), `voip_${kind}_${Date.now()}${ext}`);
	fs.writeFileSync(filePath, buffer);
	return filePath;
}

function requireCall(m) {
	const entry = activeCalls.get(m.chat);
	if (!entry) throw '⚠️ لا توجد مكالمة جارية حالياً في هذه المحادثة.';
	return entry;
}

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
	const user = global.db?.data?.users?.[m.sender] || {};
	const lang = user.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	const voip = await getVoip(conn);

	// ── 1. إنهاء المكالمة (.voipend / .قطع / .endcall) ───────────
	if (/^(voipend|endcall|قطع|انهاء_المكالمة)$/i.test(command)) {
		await voip.end(args[0] === 'force');
		activeCalls.delete(m.chat);
		return m.reply(args[0] === 'force' 
			? t('✦ VOIP state force-reset.', '✦ تم إنهاء حالة المكالمة قسرياً.', '✦ تم قطع المكالمة بالكامل.') 
			: t('✦ Hangup requested...', '✦ جاري قطع المكالمة...', '✦ كنساليو المكالمة دابا...'));
	}

	// ── 2. إرسال تفاعل إيموجي أثناء المكالمة (.voipreact) ────────
	if (/^(voipreact|reactcall)$/i.test(command)) {
		const entry = requireCall(m);
		const emoji = args[0] || '👍';
		const sent = entry.call.react(emoji);
		return m.reply(sent 
			? t(`✦ Reaction ${emoji} sent.`, `✦ تم إرسال التفاعل ${emoji} في المكالمة.`, `✦ صيفطنا التفاعل ${emoji} فـ المكالمة.`) 
			: t('✦ Failed to send reaction (call is not active yet).', '✦ فشل إرسال التفاعل (المكالمة لم تبدأ بعد).', '✦ ما قدرناش نصيفطو التفاعل (المكالمة مزال ما بداتش).'));
	}

	// ── 3. كتم / تشغيل المايك والفيديو (.voipsilent / .كتم) ───────
	if (/^(voipsilent|silentcall|كتم|ميوت)$/i.test(command)) {
		const entry = requireCall(m);
		const nowSilenced = await entry.call.silent();
		return m.reply(nowSilenced 
			? t('✦ Muted mic and paused video.', '✦ تم كتم المايكروفون وإيقاف الفيديو مؤقتاً.', '✦ تم كتم المايك وإيقاف الفيديو مؤقتاً.') 
			: t('✦ Resumed.', '✦ تم استئناف الصوت والفيديو.', '✦ تم استئناف المكالمة بنجاح.'));
	}

	// ── 4. بدء مكالمة جديدة (.call / .voip / .اتصال / .appel) ───
	if (!args[0]) {
		return m.reply(t(
			`📞 *WhatsApp Real Call Engine*\n━━━━━━━━━━━━━━━━━━━━━\n*Usage:*\n← ${usedPrefix + command} <phone_number> [media_url] [resolution] [auto] [loop]\n\n*Examples:*\n• ${usedPrefix + command} 212624855939\n• ${usedPrefix + command} 212624855939 auto (auto hangup after audio)\n• Reply to an audio/video with ${usedPrefix + command} <number>\n\n*Controls during call:*\n• ${usedPrefix}voipend (hang up)\n• ${usedPrefix}voipsilent (mute/resume)\n• ${usedPrefix}voipreact <emoji>\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
			`📞 *نظام مكالمات واتساب الحقيقية*\n━━━━━━━━━━━━━━━━━━━━━\n*طريقة الاستخدام:*\n← ${usedPrefix + command} <رقم_الهاتف> [رابط_ميديا] [auto] [loop]\n\n*أمثلة:*\n• ${usedPrefix + command} 212624855939\n• ${usedPrefix + command} 212624855939 auto (إنهاء تلقائي بعد نهاية الصوت)\n• قم بالرد على أوديو أو فيديو بـ: ${usedPrefix + command} <الرقم>\n\n*التحكم أثناء المكالمة:*\n• ${usedPrefix}voipend (إنهاء المكالمة)\n• ${usedPrefix}voipsilent (كتم/استئناف)\n• ${usedPrefix}voipreact 👍 (إرسال إيموجي)\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
			`📞 *محرك مكالمات واتساب الحقيقية*\n━━━━━━━━━━━━━━━━━━━━━\n*كيفاش تخدمو:*\n← ${usedPrefix + command} <نمرة_الهاتف> [رابط] [auto] [loop]\n\n*أمثلة:*\n• ${usedPrefix + command} 212624855939\n• ${usedPrefix + command} 212624855939 auto (كيقطع بوحدو فاش كيسالي الأوديو)\n• رد على شي أوديو ولا فيديو بـ: ${usedPrefix + command} <النمرة>\n\n*أوامر التحكم فالمكالمة:*\n• ${usedPrefix}voipend (قطع المكالمة)\n• ${usedPrefix}voipsilent (كتم الصوت/استئناف)\n• ${usedPrefix}voipreact ❤️ (تفاعل بإيموجي)\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
		));
	}

	if (activeCalls.has(m.chat)) {
		throw t('⚠️ A call is already in progress in this chat. End it with .voipend first.', '⚠️ توجد مكالمة جارية بالفعل في هذه المحادثة، قم بإنهائها أولاً عبر: .voipend', '⚠️ كاينا مكالمة جارية فهاد الشات، قطعها هي اللولة بـ: .voipend');
	}

	const phoneNumber = args[0].replace(/\D/g, '');
	if (!phoneNumber || phoneNumber.length < 9) {
		throw t('❌ Invalid phone number.', '❌ رقم الهاتف غير صالح.', '❌ هاد نمرة الهاتف ماشي صحيحة.');
	}

	const RESOLUTION_RE = /^(240p|360p|480p|720p|1080p)$/i;
	const resolutionArg = args.find((a, i) => i > 0 && RESOLUTION_RE.test(a));
	const resolution = resolutionArg ? resolutionArg.toLowerCase() : undefined;

	const autoEndCall = args.some((a, i) => i > 0 && /^auto$/i.test(a));
	const loop = args.some((a, i) => i > 0 && /^loop$/i.test(a));

	const urls = args.filter((a, i) => i > 0 && /^https?:\/\//i.test(a));
	let media = [...urls];
	const tempFiles = [];

	const quotedPath = m.quoted ? await downloadQuotedMedia(m.quoted).catch(() => null) : null;
	if (quotedPath) {
		tempFiles.push(quotedPath);
		media.unshift(quotedPath);
	}

	const willBeVideo = media.some((src) => src !== 'silence' && VIDEO_EXT_RE.test(src));

	if (media.length === 0) media = 'silence';
	else if (media.length === 1) media = media[0];

	const startMsg = t(
		`📞 Calling +${phoneNumber}...${willBeVideo ? ' (video)' : ''}\n(Use .voipend to hang up, .voipsilent to mute)`,
		`📞 جاري الاتصال بالرقم +${phoneNumber}...${willBeVideo ? ' (مكالمة فيديو)' : ''}\n(استخدم .voipend للإنهاء، و .voipsilent للكتم)`,
		`📞 كنعيطو لـ +${phoneNumber}...${willBeVideo ? ' (مكالمة فيديو)' : ''}\n(خدم .voipend باش تقطع، و .voipsilent باش تكتم)`
	);

	const sentMsg = await m.reply(startMsg);
	const key = sentMsg?.key;

	const cleanupTempFiles = () => {
		for (const f of tempFiles) {
			if (fs.existsSync(f)) {
				try { fs.unlinkSync(f); } catch (_) {}
			}
		}
	};

	try {
		const call = await voip.call(phoneNumber, media, resolution, { autoEndCall, loop });
		activeCalls.set(m.chat, { call, key, phoneNumber });

		call.on('ringing', () => {
			if (key) conn.sendMessage(m.chat, { text: `🔔 *Ringing +${phoneNumber}...*`, edit: key }).catch(() => {});
		});

		call.on('connected', () => {
			if (key) conn.sendMessage(m.chat, { text: `✅ *Call connected with +${phoneNumber}!* \nUse .voipend to hang up.`, edit: key }).catch(() => {});
		});

		call.on('item', ({ index, kind }) => {
			if (index === 0) return;
			conn.sendMessage(m.chat, { text: `▶️ *Playing media item ${index + 1} (${kind})*` }).catch(() => {});
		});

		call.on('downgraded', () => {
			conn.sendMessage(m.chat, { text: '📷 All cameras are off, call downgraded to audio.' }).catch(() => {});
		});

		call.on('ended', (reason) => {
			activeCalls.delete(m.chat);
			const friendlyText = reason === 'declined'
				? `📵 Call to +${phoneNumber} was declined.`
				: `⏹️ Call ended for +${phoneNumber} (${reason || 'normal'})`;
			if (key) conn.sendMessage(m.chat, { text: friendlyText, edit: key }).catch(() => {});
			cleanupTempFiles();
		});

		call.on('error', (err) => {
			if (!voip.calls.includes(call)) {
				activeCalls.delete(m.chat);
				cleanupTempFiles();
			}
			conn.reply(m.chat, `❌ Call error: ${err?.message || err}`, m).catch(() => {});
		});

	} catch (e) {
		console.error('[VOIP Error]:', e);
		activeCalls.delete(m.chat);
		cleanupTempFiles();
		throw `❌ Failed to place call: ${e?.message || e}`;
	}
};

handler.help = ['call <number>', 'appel <number>', 'voip <number>', 'voipend', 'voipsilent', 'voipreact <emoji>'];
handler.tags = ['owner', 'tools'];
handler.command = /^(call|appel|voip|voipcall|اتصال|مكالمة|voipend|endcall|قطع|انهاء_المكالمة|voipreact|reactcall|voipsilent|silentcall|كتم|ميوت)$/i;

export default handler;
