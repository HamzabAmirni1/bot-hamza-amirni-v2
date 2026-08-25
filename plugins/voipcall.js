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

	await m.reply('📞 *Creating VoIP Call message...*');

	try {
		// 1. Scheduled Call Creation Message in Baileys
		const callType = isVideo ? 2 : 1; // 1: AUDIO, 2: VIDEO
		const scheduledTime = Date.now() + 60000; // scheduled in 1 min or immediate

		const callMsg = generateWAMessageFromContent(
			m.chat,
			{
				scheduledCallCreationMessage: {
					scheduledTimestampMs: scheduledTime,
					callType: callType,
					title: cleanTitle
				}
			},
			{ quoted: m }
		);

		await conn.relayMessage(m.chat, callMsg.message, { messageId: callMsg.key.id });

		// 2. Also send Interactive Call Action Button card
		const botPhone = (conn.user?.id || conn.user?.jid || '').split(':')[0].split('@')[0] || '212708869993';
		const callButtons = [
			{
				name: 'cta_call',
				buttonParamsJson: JSON.stringify({
					display_text: isVideo ? '📹 Join Video Call' : '📞 Call Now (VoIP)',
					id: `+${botPhone}`
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '👑 Owner Contact',
					id: `${usedPrefix}owner`
				})
			}
		];

		if (conn.sendButton) {
			await conn.sendButton(m.chat, {
				title: isVideo ? '📹 *WhatsApp Video Call*' : '📞 *WhatsApp VoIP Call*',
				body: `*${cleanTitle}*\n───────────\n👤 *Organizer:* ${m.name || m.pushName || 'Hamza Amirni'}\n⏰ *Time:* ${new Date(scheduledTime).toLocaleTimeString()}\n📡 *Type:* ${isVideo ? 'HD Video Call' : 'Encrypted VoIP Audio'}`,
				footer: '⚡ bot amirni hamza • حمزة اعمرني',
				buttons: callButtons
			}, { quoted: m }).catch(() => {});
		}

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
