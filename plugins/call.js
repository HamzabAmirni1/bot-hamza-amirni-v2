/**
 * 📞 Real WhatsApp VoIP Calling Plugin
 * إجراء مكالمات واتساب حقيقية مباشرة (صوتية أو فيديو) مع أزرار تحكم وبث وسائط
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
	const mime = quoted?.mimetype || (quoted?.mtype === 'audioMessage' ? 'audio/ogg' : quoted?.mtype === 'videoMessage' ? 'video/mp4' : '');
	const kind = /^video/.test(mime) ? 'video' : (/^audio/.test(mime) || quoted?.mtype === 'audioMessage') ? 'audio' : null;
	if (!kind) return null;

	const buffer = await quoted.download?.();
	if (!buffer) return null;

	const ext = kind === 'video' ? '.mp4' : (mime.includes('ogg') || mime.includes('opus')) ? '.ogg' : '.mp3';
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
		try {
			await voip.end(true);
		} catch (_) {}
		activeCalls.delete(m.chat);
		return m.reply(t('🔴 Call ended successfully.', '🔴 تم إنهاء المكالمة بنجاح.', '🔴 تم قطع المكالمة بنجاح.'));
	}

	// ── 2. إرسال تفاعل إيموجي أثناء المكالمة (.voipreact) ────────
	if (/^(voipreact|reactcall)$/i.test(command)) {
		const entry = requireCall(m);
		const emoji = args[0] || '❤️';
		const sent = entry.call.react(emoji);
		return m.reply(sent 
			? t(`✦ Reaction ${emoji} sent to call.`, `✦ تم إرسال التفاعل ${emoji} في المكالمة.`, `✦ صيفطنا التفاعل ${emoji} فـ المكالمة.`) 
			: t('✦ Reaction failed (call is not active yet).', '✦ تعذر إرسال التفاعل (المكالمة لم تبدأ بعد).', '✦ ما قدرناش نصيفطو التفاعل (المكالمة مزال ما بداتش).'));
	}

	// ── 3. كتم / تشغيل المايك والفيديو (.voipsilent / .كتم) ───────
	if (/^(voipsilent|silentcall|كتم|ميوت)$/i.test(command)) {
		const entry = requireCall(m);
		const nowSilenced = await entry.call.silent();
		return m.reply(nowSilenced 
			? t('🔇 Muted mic and paused video.', '🔇 تم كتم المايكروفون وإيقاف الفيديو مؤقتاً.', '🔇 تم كتم المايك وإيقاف الفيديو مؤقتاً.') 
			: t('🔊 Resumed audio & video.', '🔊 تم استئناف الصوت والفيديو.', '🔊 تم استئناف المكالمة بنجاح.'));
	}

	// ── 4. بدء مكالمة جديدة (.call / .voip / .اتصال / .appel) ───
	if (!args[0]) {
		const helpText = t(
			`📞 *WhatsApp Real Call Engine*\n━━━━━━━━━━━━━━━━━━━━━\n*How to use:*\n← \`${usedPrefix + command} <phone_number>\`\n\n*Examples:*\n• \`${usedPrefix + command} 212624855939\`\n• Reply to a Voice Note (PTT) or Video with: \`${usedPrefix + command} <number>\`\n• Add \`auto\` to hang up when audio finishes\n\n*Touch buttons below or use:*\n• \`${usedPrefix}voipend\` (Hang up)\n• \`${usedPrefix}voipsilent\` (Mute)\n• \`${usedPrefix}voipreact ❤️\` (Reaction)\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
			`📞 *نظام مكالمات واتساب الحقيقية*\n━━━━━━━━━━━━━━━━━━━━━\n*طريقة الاستخدام:*\n← \`${usedPrefix + command} <رقم_الهاتف>\`\n\n*أمثلة:*\n• \`${usedPrefix + command} 212624855939\`\n• رد على أي تسجيل صوتي (أوديو) بـ: \`${usedPrefix + command} <الرقم>\`\n• أضف \`auto\` للإنهاء التلقائي بعد انتهاء الصوت\n\n*اضغط على الأزرار بالأسفل أو استخدم:*\n• \`${usedPrefix}voipend\` (إنهاء المكالمة)\n• \`${usedPrefix}voipsilent\` (كتم الصوت)\n• \`${usedPrefix}voipreact ❤️\` (تفاعل)\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
			`📞 *محرك مكالمات واتساب الحقيقية*\n━━━━━━━━━━━━━━━━━━━━━\n*كيفاش تخدمو:*\n← \`${usedPrefix + command} <نمرة_الهاتف>\`\n\n*أمثلة:*\n• \`${usedPrefix + command} 212624855939\`\n• رد على شي تسجيل صوتي (Vocal) بـ: \`${usedPrefix + command} <النمرة>\`\n• زيد \`auto\` باش يقطع بوحدو فاش يسالي الأوديو\n\n*كليكي على الأزرار التحت ولا كتب:*\n• \`${usedPrefix}voipend\` (قطع المكالمة)\n• \`${usedPrefix}voipsilent\` (كتم الصوت)\n• \`${usedPrefix}voipreact ❤️\` (تفاعل إيموجي)\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
		);
		return m.reply(helpText);
	}

	// Auto-cleanup any old / hanging call session so user is never blocked!
	if (activeCalls.has(m.chat)) {
		try {
			await voip.end(true);
		} catch (_) {}
		activeCalls.delete(m.chat);
	}

	const phoneNumber = args[0].replace(/\D/g, '');
	if (!phoneNumber || phoneNumber.length < 9) {
		return m.reply(t('❌ Invalid phone number.', '❌ رقم الهاتف غير صالح.', '❌ هاد نمرة الهاتف ماشي صحيحة.'));
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
		`📞 *Calling +${phoneNumber}...* ${willBeVideo ? '(Video Call)' : '(Voice Call)'}\n\n_Use the buttons below to control the call without typing._`,
		`📞 *جاري الاتصال بالرقم +${phoneNumber}...* ${willBeVideo ? '(مكالمة فيديو)' : '(مكالمة صوتية)'}\n\n_استخدم الأزرار في الأسفل للتحكم في المكالمة بضغطة زر._`,
		`📞 *كنعيطو لـ +${phoneNumber}...* ${willBeVideo ? '(مكالمة فيديو)' : '(مكالمة صوتية)'}\n\n_خدم الأزرار لتحت باش تقطع ولا تكتم بلا ما تكتب والو._`
	);

	const cleanupTempFiles = () => {
		for (const f of tempFiles) {
			if (fs.existsSync(f)) {
				try { fs.unlinkSync(f); } catch (_) {}
			}
		}
	};

	// Interactive action buttons for one-touch call control
	const buttons = [
		{
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: t('🔴 End Call', '🔴 إنهاء المكالمة', '🔴 قطع المكالمة'),
				id: `${usedPrefix}voipend force`
			})
		},
		{
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: t('🔇 Mute / Unmute', '🔇 كتم / استئناف', '🔇 كتم / تشغيل'),
				id: `${usedPrefix}voipsilent`
			})
		},
		{
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: t('❤️ React', '❤️ تفاعل إيموجي', '❤️ تفاعل ❤️'),
				id: `${usedPrefix}voipreact ❤️`
			})
		}
	];

	try {
		await conn.sendButton(
			m.chat,
			{
				text: startMsg,
				footer: 'bot amirni hamza • VoIP Call Control',
				buttons
			},
			{ quoted: m }
		);
	} catch (_) {
		await m.reply(startMsg);
	}

	try {
		const call = await voip.call(phoneNumber, media, resolution, { autoEndCall, loop });
		activeCalls.set(m.chat, { call, phoneNumber });

		call.on('ringing', () => {
			m.reply(t(`🔔 *Ringing +${phoneNumber}...*`, `🔔 *يرن الآن عند الرقم +${phoneNumber}...*`, `🔔 *كيصوني دابا عند +${phoneNumber}...*`)).catch(() => {});
		});

		call.on('connected', () => {
			m.reply(t(`✅ *Call connected with +${phoneNumber}!*`, `✅ *تم الرد وفتح المكالمة مع +${phoneNumber}!*`, `✅ *تفتحات المكالمة وكيسمعك +${phoneNumber}!*`)).catch(() => {});
		});

		call.on('ended', (reason) => {
			activeCalls.delete(m.chat);
			const friendlyText = reason === 'declined'
				? t(`📵 Call to +${phoneNumber} was declined / busy.`, `📵 تم رفض المكالمة من قِبل +${phoneNumber}.`, `📵 تم رفض أو إنهاء المكالمة من طرف +${phoneNumber}.`)
				: t(`⏹️ Call ended for +${phoneNumber} (${reason || 'finished'}).`, `⏹️ انتهت المكالمة مع +${phoneNumber}.`, `⏹️ سالات المكالمة مع +${phoneNumber}.`);
			m.reply(friendlyText).catch(() => {});
			cleanupTempFiles();
		});

		call.on('error', (err) => {
			activeCalls.delete(m.chat);
			cleanupTempFiles();
			m.reply(t(`❌ Call error: ${err?.message || err}`, `❌ خطأ في المكالمة: ${err?.message || err}`, `❌ وقع مشكل فالمكالمة: ${err?.message || err}`)).catch(() => {});
		});

	} catch (e) {
		console.error('[VOIP Error]:', e);
		activeCalls.delete(m.chat);
		cleanupTempFiles();
		return m.reply(t(`❌ Failed to place call: ${e?.message || e}`, `❌ تعذر بدء الاتصال: ${e?.message || e}`, `❌ ما قدرناش نتصلو: ${e?.message || e}`));
	}
};

handler.help = ['call <number>', 'appel <number>', 'voip <number>', 'voipend', 'voipsilent', 'voipreact <emoji>'];
handler.tags = ['owner', 'tools'];
handler.command = /^(call|appel|voip|voipcall|اتصال|مكالمة|voipend|endcall|قطع|انهاء_المكالمة|voipreact|reactcall|voipsilent|silentcall|كتم|ميوت)$/i;

export default handler;
