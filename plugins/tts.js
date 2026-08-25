/**
 * 🗣️ TTS (Text-to-Speech) / تحويل النص إلى رسالة صوتية (Voice Note)
 */

let handler = async (m, { conn, text, usedPrefix, command, args }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';

	if (!text && !m.quoted?.text) {
		const guide = `🗣️ *تحويل النص إلى صوت (Voice Note)*
━━━━━━━━━━━━━━━━
_اكتب النص لي بغيتي البوت يحولو لأوديو صوتي_

📌 *طريقة الاستعمال:*
• *${usedPrefix + command} <نص>*
• *${usedPrefix + command} fr <نص بالفرنسية>*
• *${usedPrefix + command} en <English text>*

💡 *أمثلة:*
• \`${usedPrefix + command} حمزة اعمرني مكاينش دابا، خلي ميساج\`
• \`${usedPrefix + command} en Welcome to Bot Amirni Hamza\`

⚡ *bot amirni hamza*`;
		return m.reply(guide);
	}

	let lang = 'ar';
	let qText = text || m.quoted?.text || '';

	if (args[0] && args[0].length === 2 && /^(ar|fr|en|es|de|it|ja|ko|ru|tr)$/i.test(args[0])) {
		lang = args[0].toLowerCase();
		qText = args.slice(1).join(' ');
	}

	if (!qText) return m.reply('❌ المرجو كتابة النص لتحويله إلى صوت.');

	await m.reply('🗣️ *جاري تسجيل المقطع الصوتي...*');

	try {
		const { default: axios } = await import('axios');
		const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(qText)}&tl=${lang}&client=tw-ob`;

		const res = await axios.get(ttsUrl, {
			responseType: 'arraybuffer',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Referer': 'https://translate.google.com/'
			},
			timeout: 10000
		});

		const audioBuffer = Buffer.from(res.data);
		let sent = false;

		try {
			const { toPTT } = await import('../lib/converter.js');
			const ptt = await toPTT(audioBuffer, 'mp3');
			if (ptt?.data) {
				await conn.sendMessage(m.chat, {
					audio: ptt.data,
					mimetype: 'audio/ogg; codecs=opus',
					ptt: true
				}, { quoted: m });
				sent = true;
			}
		} catch (_) {}

		if (!sent) {
			await conn.sendMessage(m.chat, {
				audio: audioBuffer,
				mimetype: 'audio/mpeg',
				ptt: false
			}, { quoted: m });
		}
	} catch (e) {
		console.error('TTS Error:', e);
		m.reply(`❌ فشل توليد الصوت: ${e.message}`);
	}
};

handler.help = ['tts [lang] <text>', 'vn <text>'];
handler.tags = ['tools'];
handler.command = /^(tts|vn|say|speak|صوت)$/i;
handler.limit = false;

export default handler;
