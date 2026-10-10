/**
 * 📹 WhatsApp Live PTV Video & VoIP Call Simulator
 * كيرسل مكالمة فيديو دائرية PTV مباشرة أو رسالة مكالمة WhatsApp VoIP واقعية
 */

import { generateWAMessageContent } from 'baileys';

let handler = async (m, { conn, text, usedPrefix, command, args }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	let q = m.quoted ? m.quoted : m;
	let mime = (q.msg || q).mimetype || q.mediaType || '';

	// ── 1. إرسال فيديو PTV مباشر (مكالمة فيديو مباشرة / كاميرا مباشرة) ─────────
	if (/video/g.test(mime)) {
		await m.react('📹');
		try {
			const media = await q.download();
			if (!media) throw 'فشل تحميل الفيديو!';

			// إرسال الفيديو كـ PTV (مقطع فيديو دائري للمكالمات الحية)
			await conn.sendMessage(m.chat, {
				video: media,
				mimetype: 'video/mp4',
				ptv: true
			}, { quoted: m });

			await m.react('✅');
			return;
		} catch (e) {
			console.error('[PTV Video Call] Error:', e);
			await m.react('❌');
			return m.reply(`❌ فشل إرسال مكالمة الفيديو PTV: ${e.message || e}`);
		}
	}

	// ── 2. محاكاة مكالمة واتساب VoIP مباشرة بأزرار الاتصال ────────────────────
	await m.react('📞');
	try {
		const isVideo = /video/i.test(command) || /video/i.test(text || '');
		const cleanTarget = (args[0] || '').replace(/[^0-9]/g, '');
		const targetNum = cleanTarget.length >= 8 ? cleanTarget : (m.sender.split('@')[0] || '212624855939');

		const callButtons = [
			{
				name: 'cta_call',
				buttonParamsJson: JSON.stringify({
					display_text: isVideo ? '📹 بدء مكالمة الفيديو الآن' : '📞 بدء المكالمة الصوتية الآن',
					id: `+${targetNum}`
				})
			},
			{
				name: 'cta_url',
				buttonParamsJson: JSON.stringify({
					display_text: '📢 بث القناة المباشر',
					url: 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p',
					merchant_url: 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '👑 المطور حمزة اعمرني',
					id: `${usedPrefix}owner`
				})
			}
		];

		const timeStr = new Date().toLocaleTimeString('ar-MA', { hour: 'numeric', minute: '2-digit', hour12: true });

		const guideText = (
			`📹 *مكالمة واتساب فيديو وصوت (Live Call & PTV)*\n━━━━━━━━━━━━━━━━━━━━\n` +
			`👤 *المتصل:* +${targetNum}\n` +
			`⏰ *الوقت:* ${timeStr}\n` +
			`📡 *الحالة:* ${isVideo ? 'مكالمة فيديو مشفرة بدقة عالية (HD Video Call) 📹' : 'مكالمة صوتية مشفرة (Encrypted VoIP Call) 📞'}\n\n` +
			`💡 *ملاحظة:* لإرسال فيديو كاميرا دائري مباشر (PTV Call):\n` +
			`← رد على أي مقطع فيديو بالأمر *${usedPrefix + command}* وسيقوم البوت بإرساله كـ PTV مباشر!`
		);

		await conn.sendButton(m.chat, {
			title: isVideo ? '📹 *WhatsApp Live Video Call*' : '📞 *WhatsApp Live VoIP Call*',
			body: guideText,
			footer: '⚡ bot amirni hamza • حمزة اعمرني',
			buttons: callButtons
		}, { quoted: m });

		await m.react('✅');
	} catch (e) {
		console.error('[VoIP Call Error]:', e);
		await m.react('❌');
		m.reply(`❌ فشل إنشاء المكالمة: ${e.message || e}`);
	}
};

handler.help = ['call', 'videocall', 'audiocall', 'ptv', 'voipcall'];
handler.tags = ['tools'];
handler.command = /^(call|videocall|audiocall|ptv|fakecall|voipcall|voip|calloffer)$/i;
handler.limit = false;

export default handler;
