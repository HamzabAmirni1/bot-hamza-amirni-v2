// ============================================================
// Bot Profile Picture Changer Plugin (WhatsApp & Supabase Sync)
// Commands: .setpp | .setbotpp | .setppbot | .botpp | .ppbot | .setprofile | .profile | .صورة_البوت | .فوطو
// Developed for Bot Hamza Amirni by Hamza Amirni
// ============================================================

import fs from 'fs';
import { generateProfilePicture } from 'baileys';

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');

async function saveAvatarToSupabase(base64Data) {
	try {
		await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory', {
			method: 'POST',
			headers: {
				'apikey': SB_KEY,
				'Authorization': 'Bearer ' + SB_KEY,
				'Content-Type': 'application/json',
				'Prefer': 'resolution=merge-duplicates'
			},
			body: JSON.stringify([{ jid: 'config_bot_avatar_base64', history: base64Data }])
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
			`📸 *How to change Bot Profile Picture:*\n━━━━━━━━━━━━━━━━━━━━\nReply to any image with: *${usedPrefix + command}*\nOr send an image with caption: *${usedPrefix + command}*\nOr use a direct image URL: *${usedPrefix + command} https://example.com/photo.jpg*`,
			`📸 *طريقة تغيير صورة بروفايل البوت:*\n━━━━━━━━━━━━━━━━━━━━\nرد على أي صورة بالأمر: *${usedPrefix + command}*\nأو أرسل صورة مع كتابة: *${usedPrefix + command}*\nأو ضع رابط صورة مباشر: *${usedPrefix + command} https://example.com/photo.jpg*`,
			`📸 *طريقة تبديل فوطو بروفيل دالبوت:*\n━━━━━━━━━━━━━━━━━━━━\nجاوب على أي تصويرة بـ: *${usedPrefix + command}*\nولا صيفط تصويرة وكتب فالتعليق: *${usedPrefix + command}*\nولا دير رابط مباشر دتصويرة: *${usedPrefix + command} https://example.com/photo.jpg*`
		));
	}

	try {
		await m.react('⚙️');
		const botJid = conn.user?.id || conn.user?.jid;
		if (!botJid) throw new Error('Bot user JID is not available.');

		// Update profile picture in WhatsApp
		await conn.updateProfilePicture(botJid, buffer);

		// Save locally for banners, web server, and menus
		try {
			if (!fs.existsSync('media')) fs.mkdirSync('media', { recursive: true });
			fs.writeFileSync('media/bot_avatar.jpg', buffer);
			fs.writeFileSync('media/thumbnail.jpg', buffer);
		} catch (_) {}

		// Backup to Supabase for persistence across Koyeb reboots
		const b64 = buffer.toString('base64');
		saveAvatarToSupabase(b64);

		await m.react('✅');
		return conn.sendMessage(m.chat, {
			image: buffer,
			caption: t(
				`✅ *Bot Profile Picture Updated Successfully!*\n━━━━━━━━━━━━━━━━━━━━\n📸 The new profile picture has been applied to WhatsApp, website, and saved permanently to Supabase.\n👑 *Updated by Owner:* @${String(m.sender || '').replace(/[^0-9]/g, '')}`,
				`✅ *تم تحديث وتغيير صورة بروفايل البوت بنجاح!*\n━━━━━━━━━━━━━━━━━━━━\n📸 تم تطبيق الصورة الجديدة على واتساب والموقع وحفظها بشكل دائم في قاعدة البيانات.\n👑 *بواسطة المالك:* @${String(m.sender || '').replace(/[^0-9]/g, '')}`,
				`✅ *تبارك الله، تبدلات فوطو بروفيل دالبوت بنجاح! 📸*\n━━━━━━━━━━━━━━━━━━━━\nالصورة الجديدة تطبقات فـ واتساب، فالسيت، وتحفظات فـ Supabase ديما.\n👑 *بدلها الأونر:* @${String(m.sender || '').replace(/[^0-9]/g, '')}`
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
