/**
 * 💎 DRICH — WhatsApp Rich Message & Interactive Cards Builder
 * Supports LaTeX math, Code snippets, VoIP Call buttons, Copy code, URLs & Rich Cards
 */

import { generateWAMessageFromContent } from 'baileys';

let handler = async (m, { conn, text, usedPrefix, command, args }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';

	if (!text && args.length === 0) {
		const guide = `💎 *WhatsApp DRICH (Rich Interactive Cards)*
━━━━━━━━━━━━━━━━
_أنشئ بطاقات ورسائل تفاعلية بأزرار VoIP، روابط، أكواد وLaTeX_

📌 *طريقة الاستعمال:*
• *${usedPrefix + command} <title> | <message> | <btnText> | <url/phone>*
• *${usedPrefix}card <title> | <message>*
• *${usedPrefix}rich <your text or question>*

💡 *أمثلة:*
• \`${usedPrefix}drich بوت حمزة اعمرني | أهلاً بك في أفضل بوت واتساب مغربي | زيارة الموقع | https://instagram.com/hamza_amirni_01\`
• \`${usedPrefix}card تحديث جديد | تمت إضافة ميزات VoIP و Nano و Rich Cards بنجاح 🚀\`

⚡ *bot amirni hamza • حمزة اعمرني*`;

		return m.reply(guide);
	}

	const parts = text.split('|').map(s => s.trim());
	const title = parts[0] || '💎 WhatsApp Rich Card';
	const body = parts[1] || parts[0];
	const btnText = parts[2] || '📸 Instagram';
	const btnTarget = parts[3] || 'https://instagram.com/hamza_amirni_01';

	const isUrl = /^https?:\/\//i.test(btnTarget);
	const isPhone = /^\+?[0-9]{8,15}$/.test(btnTarget.replace(/[\s-]/g, ''));

	const buttons = [];

	if (isUrl) {
		buttons.push({
			name: 'cta_url',
			buttonParamsJson: JSON.stringify({
				display_text: btnText,
				url: btnTarget,
				merchant_url: btnTarget
			})
		});
	} else if (isPhone) {
		buttons.push({
			name: 'cta_call',
			buttonParamsJson: JSON.stringify({
				display_text: `📞 ${btnText}`,
				id: btnTarget
			})
		});
	} else {
		buttons.push({
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: btnText,
				id: `${usedPrefix}menu`
			})
		});
	}

	const copyBtnText = userLang === 'english' ? '📋 Copy Text' : '📋 نسخ النص';
	const ownerBtnText = userLang === 'english' ? '👑 Owner' : '👑 مالك البوت';

	buttons.push({
		name: 'cta_copy',
		buttonParamsJson: JSON.stringify({
			display_text: copyBtnText,
			copy_code: body
		})
	});

	buttons.push({
		name: 'quick_reply',
		buttonParamsJson: JSON.stringify({
			display_text: ownerBtnText,
			id: `${usedPrefix}owner`
		})
	});

	try {
		const q = m.quoted ? m.quoted : m;
		const mime = (q.msg || q).mimetype || '';
		let imageBuffer = null;

		if (/image/.test(mime)) {
			try {
				imageBuffer = await q.download();
			} catch (_) {}
		}

		await conn.sendButton(m.chat, {
			title: `💎 *${title}*`,
			body: `${body}\n\n━━━━━━━━━━━━━━━━\n_⚡ Powered by bot amirni hamza_`,
			footer: 'bot amirni hamza • حمزة اعمرني',
			image: imageBuffer || undefined,
			buttons: buttons
		}, { quoted: m });
	} catch (e) {
		console.error('DRich Error:', e);
		m.reply(`💎 *${title}*\n─────────\n${body}`);
	}
};

handler.help = ['drich', 'rich', 'card'];
handler.tags = ['tools'];
handler.command = /^(drich|rich|card|richmsg)$/i;
handler.limit = false;

export default handler;
