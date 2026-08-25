/**
 * 📞 VoIP Call & Scheduled Call Creator
 * Allows users to create realistic WhatsApp VoIP Calls & Scheduled Audio/Video Calls
 */

import { generateWAMessageFromContent } from 'baileys';

let handler = async (m, { conn, text, usedPrefix, command, args }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';

	const isVideo = /video/i.test(command) || /video/i.test(text || '');
	const isAudio = /audio/i.test(command) || (!isVideo && /audio/i.test(text || ''));

	// Title / topic of the call
	const cleanTitle = (text || '').replace(/(video|audio|صوت|فيديو)/gi, '').trim() || (isVideo ? 'WhatsApp Video Call 📹' : 'WhatsApp VoIP Audio Call 📞');

	if (!text && args.length === 0) {
		const guide = userLang === 'english'
			? `📞 *WhatsApp VoIP Call Generator*\n━━━━━━━━━━━━━━━━\n\n📌 *Usage:*\n• *${usedPrefix + command} <title>* — Create scheduled VoIP audio call\n• *${usedPrefix}videocall <title>* — Create scheduled VoIP video call\n• *${usedPrefix}audiocall <title>* — Create instant VoIP audio call\n\n💡 *Example:*\n${usedPrefix}voipcall Urgent Meeting with Hamza\n${usedPrefix}videocall Discussion Project 2026\n\n⚡ *bot amirni hamza*`
			: `📞 *ميزة مكالمات الواتساب (VoIP & Scheduled Call)*\n━━━━━━━━━━━━━━━━\n\n📌 *طريقة الاستعمال:*\n• *${usedPrefix + command} <عنوان المكالمة>* — إنشاء مكالمة صوتية مجدولة\n• *${usedPrefix}videocall <عنوان المكالمة>* — إنشاء مكالمة فيديو مجدولة\n• *${usedPrefix}audiocall <عنوان المكالمة>* — مكالمة صوتية فورية\n\n💡 *أمثلة:*\n${usedPrefix}voipcall اجتماع هام مع حمزة اعمرني\n${usedPrefix}videocall مراجعة المشروع 🚀\n\n⚡ *bot amirni hamza*`;

		return m.reply(guide);
	}

	try {
		const isVideo = /video/i.test(command) || /video/i.test(text || '');
		const cleanTarget = (args[0] || '').replace(/[^0-9]/g, '');
		const targetNum = cleanTarget.length >= 8 ? cleanTarget : '212624855939';

		const callButtons = [
			{
				name: 'cta_call',
				buttonParamsJson: JSON.stringify({
					display_text: isVideo ? '📹 Join Video Call' : '📞 Join Voice Call',
					id: `+${targetNum}`
				})
			},
			{
				name: 'cta_url',
				buttonParamsJson: JSON.stringify({
					display_text: '📸 Instagram',
					url: 'https://www.instagram.com/hamza_amirni_01',
					merchant_url: 'https://www.instagram.com/hamza_amirni_01'
				})
			},
			{
				name: 'cta_url',
				buttonParamsJson: JSON.stringify({
					display_text: userLang === 'english' ? '📢 WhatsApp Channel' : '📢 قناة الواتساب',
					url: 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p',
					merchant_url: 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p'
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: userLang === 'english' ? '👑 Owner' : '👑 مالك البوت',
					id: `${usedPrefix}owner`
				})
			}
		];

		const timeStr = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

		await conn.sendButton(m.chat, {
			title: isVideo ? '📹 *WhatsApp Video Call*' : '📞 *WhatsApp VoIP Call*',
			body: `*+${targetNum}*\n━━━━━━━━━━━━━━━━━━━━\n👤 *Organizer:* Hamza Amirni (حمزة اعمرني)\n⏰ *Time:* ${timeStr}\n📡 *Type:* ${isVideo ? 'HD Video Call 📹' : 'Encrypted VoIP Audio 📞'}`,
			footer: '⚡ bot amirni hamza • حمزة اعمرني',
			buttons: callButtons
		}, { quoted: m });

	} catch (e) {
		console.error('VoIP Call Error:', e);
		m.reply(`❌ *Failed to create VoIP Call:* ${e.message}`);
	}
};

handler.help = ['voipcall', 'videocall', 'audiocall', 'call', 'fakecall'];
handler.tags = ['tools'];
handler.command = /^(voipcall|voip|call|fakecall|videocall|audiocall|calloffer)$/i;
handler.limit = false;

export default handler;
