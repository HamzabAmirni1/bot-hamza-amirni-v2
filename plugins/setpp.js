// ============================================================
// Per-Bot Profile Picture Changer Plugin (Independent PP per Bot)
// Commands: .setpp | .setbotpp | .setppbot | .botpp | .ppbot | .setprofile | .profile | .صورة_البوت | .فوطو
// Developed for Bot Hamza Amirni by Hamza Amirni
// ============================================================

import fs from 'fs';

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

async function saveBotAvatarToSupabase(botPhone, base64Data) {
	try {
		await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
			method: 'POST',
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Content-Type': 'application/json',
				'Prefer': 'resolution=merge-duplicates'
			},
			body: JSON.stringify([{ jid: 'config_bot_avatar_' + botPhone, history: base64Data }])
		});
	} catch (_) {}
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let q = m.quoted ? m.quoted : m;
	let mime = (q.msg || q).mimetype || q.mediaType || '';
	let buffer = null;

	// 1. Check if an image or sticker was quoted or attached
	if (/image|sticker|webp/i.test(mime)) {
		try {
			await m.react('⏳');
			buffer = await q.download?.();
		} catch (e) {
			console.error('[SETPP] Failed to download media:', e.message);
		}
	} else if (args[0] && /^https?:\/\/.+/i.test(args[0])) {
		// 2. Direct image URL provided
		try {
			await m.react('⏳');
			const res = await fetch(args[0], { headers: { 'User-Agent': 'Mozilla/5.0' } });
			if (res.ok) {
				const ab = await res.arrayBuffer();
				buffer = Buffer.from(ab);
			}
		} catch (e) {
			console.error('[SETPP] Failed to fetch image URL:', e.message);
		}
	}

	if (!buffer || buffer.length < 100) {
		return m.reply(t(
			`📸 *How to change this Bot's Profile Picture:*\n━━━━━━━━━━━━━━━━━━━━\nReply to any image with: *${usedPrefix + command}*\nOr send an image with caption: *${usedPrefix + command}*\nOr use a direct image URL: *${usedPrefix + command} https://example.com/photo.jpg*`,
			`📸 *طريقة تغيير صورة بروفايل هذا البوت:*\n━━━━━━━━━━━━━━━━━━━━\nرد على أي صورة بالأمر: *${usedPrefix + command}*\nأو أرسل صورة مع كتابة: *${usedPrefix + command}*\nأو ضع رابط صورة مباشر: *${usedPrefix + command} https://example.com/photo.jpg*`,
			`📸 *طريقة تبديل فوطو بروفيل ديال هاد البوت:*\n━━━━━━━━━━━━━━━━━━━━\nجاوب على أي تصويرة بـ: *${usedPrefix + command}*\nولا صيفط تصويرة وكتب فالتعليق: *${usedPrefix + command}*\nولا دير رابط مباشر دتصويرة: *${usedPrefix + command} https://example.com/photo.jpg*`
		));
	}

	try {
		await m.react('⚙️');
		const botJid = conn.user?.id || conn.user?.jid;
		if (!botJid) throw new Error('Bot user JID is not available.');

		const botPhone = String(botJid).split(':')[0].split('@')[0].replace(/[^0-9]/g, '');

		// Update WhatsApp Profile Picture ONLY for THIS connected bot instance
		await conn.updateProfilePicture(botJid, buffer);

		// Save locally per-bot (never touch menu.jpg or bot_avatar.jpg)
		try {
			if (!fs.existsSync('media/profiles')) fs.mkdirSync('media/profiles', { recursive: true });
			fs.writeFileSync(`media/profiles/pp_${botPhone}.jpg`, buffer);
		} catch (_) {}

		// Backup per-bot to Supabase
		const b64 = buffer.toString('base64');
		saveBotAvatarToSupabase(botPhone, b64);

		await m.react('✅');
		return conn.sendMessage(m.chat, {
			image: buffer,
			caption: t(
				`✅ *Profile Picture Updated for Bot +${botPhone}!*\n━━━━━━━━━━━━━━━━━━━━\n📸 Profile picture updated independently for this bot only.\nMenu banner and other bots remain untouched.\n👑 *Updated by Owner:* @${String(m.sender || '').replace(/[^0-9]/g, '')}`,
				`✅ *تم تحديث صورة بروفايل البوت (+${botPhone}) بنجاح!*\n━━━━━━━━━━━━━━━━━━━━\n📸 تم تغيير صورة هذا البوت بشكل مستقل وخاص به فقط.\nصورة القائمة والبوتات الأخرى لم تتأثر.\n👑 *بواسطة المالك:* @${String(m.sender || '').replace(/[^0-9]/g, '')}`,
				`✅ *تبدلات فوطو بروفيل ديال هاد البوت (+${botPhone}) بوحدو! 📸*\n━━━━━━━━━━━━━━━━━━━━\nالصورة ديال هاد النمرة تبدلات بوحدها بلا ما تقيس الموني ولا البوتات لاخرين.\n👑 *بدلها الأونر:* @${String(m.sender || '').replace(/[^0-9]/g, '')}`
			),
			mentions: [m.sender]
		}, { quoted: m });

	} catch (err) {
		console.error('[SETPP Error]:', err);
		await m.react('❌');
		return m.reply(t(
			`❌ Failed to update bot profile picture: ${err.message}`,
			`❌ فشل تغيير صورة البروفايل: ${err.message}`,
			`❌ وقع خطأ وما قدرتش نبدل صورة البروفيل: ${err.message}`
		));
	}
};

handler.help = ['setpp', 'setbotpp', 'setppbot', 'botpp', 'profile'];
handler.tags = ['owner'];
handler.command = /^(setpp|setbotpp|setppbot|botpp|ppbot|setprofile|profile|صورة_البوت|بروفايل_البوت|بروفايل|فوطو)$/i;
handler.owner = true;

export default handler;
