import axios from 'axios';
import { generateWAMessageContent, generateWAMessageFromContent, proto } from 'baileys';

// ============================================================
// APK Downloader Plugin — Uses ws75.aptoide.com API (Aptoide)
// Commands: .apk <app> / .apkdl <package_or_query>
// ============================================================

// ── Daily limit tracker (in-memory, resets every 24h) ──────
const downloadCount = new Map(); // jid → { count, resetAt }

function getLimit() {
  return (global.APK_DAILY_LIMIT && !isNaN(global.APK_DAILY_LIMIT))
    ? parseInt(global.APK_DAILY_LIMIT) : 5;
}

function canDownload(jid) {
  const now = Date.now();
  const entry = downloadCount.get(jid);
  if (!entry || now >= entry.resetAt) {
    downloadCount.set(jid, { count: 0, resetAt: now + 24 * 60 * 60 * 1000 });
    return true;
  }
  return entry.count < getLimit();
}

function incrementDownload(jid) {
  const entry = downloadCount.get(jid) || { count: 0, resetAt: Date.now() + 24 * 60 * 60 * 1000 };
  entry.count++;
  downloadCount.set(jid, entry);
}

function isOwner(jid) {
  const num = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  const owners = global.owner || [];
  return owners.some(o => String(o[0]) === String(num));
}

// ── Aptoide Search Provider (combines Aptoide & Siputzx) ────
async function searchAptoide(query, limit = 6) {
	try {
		const res = await axios.get(`https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(query)}&limit=${limit}`, { timeout: 8000 });
		return (res.data?.datalist?.list || []).map(app => ({
			name: app.name,
			package: app.package,
			sizeMB: (app.size / (1024 * 1024)).toFixed(1),
			sizeBytes: app.size,
			version: app.file?.vername || 'N/A',
			icon: app.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.name)}&background=25D366&color=FFFFFF`,
			downloadUrl: app.file?.path_alt || app.file?.path
		}));
	} catch (e) {
		console.log('[apk] Aptoide official API failed, trying fallback...');
		// Fallback to Siputzx API
		try {
			const res = await axios.get(`https://api.siputzx.my.id/api/apk/search?q=${encodeURIComponent(query)}`, { timeout: 8000 });
			return (res.data?.data || []).map(app => ({
				name: app.name,
				package: app.id || app.package || query,
				sizeMB: 'N/A',
				sizeBytes: 0,
				version: 'Latest',
				icon: app.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.name)}&background=25D366&color=FFFFFF`,
				downloadUrl: app.url
			}));
		} catch (_) {
			return [];
		}
	}
}

// ── Get Download details for a specific package ────────────
async function getDownloadDetails(pkgName) {
	try {
		// Fetch info via searching package specifically
		const res = await axios.get(`https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(pkgName)}&limit=1`, { timeout: 8000 });
		const app = res.data?.datalist?.list?.[0];
		if (app) {
			return {
				name: app.name,
				package: app.package,
				sizeBytes: app.size,
				sizeMB: (app.size / (1024 * 1024)).toFixed(1),
				version: app.file?.vername || 'N/A',
				downloadUrl: app.file?.path_alt || app.file?.path
			};
		}
	} catch (_) {}
	return null;
}

// ============================================================
// HANDLER
// ============================================================
const handler = async (m, { conn, text, command }) => {

	// ── 1. Search Aptoide apps and send Carousel (.apk) ────────
	if (/^apk$/i.test(command)) {
		if (!text) return m.reply(
			`📦 *APK Downloader*\n\n` +
			`ابحث عن أي تطبيق أندرويد وحمله مباشرة!\n\n` +
			`*مثال:*\n` +
			`▸ \`.apk WhatsApp\`\n` +
			`▸ \`.apk Instagram\`\n\n` +
			`⚡ *bot amirni hamza*`
		);

		await m.react('🔍');

		const apps = await searchAptoide(text, 6);
		if (!apps.length) {
			await m.react('❌');
			return m.reply(`❌ لم يتم العثور على نتائج لـ *"${text}"*`);
		}

		// Helper to download icon and pass it as Buffer
		async function createHeaderImage(url) {
			try {
				const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
				const { imageMessage } = await generateWAMessageContent({ image: Buffer.from(res.data) }, { upload: conn.waUploadToServer });
				return imageMessage;
			} catch (_) {
				try {
					const fallbackUrl = `https://ui-avatars.com/api/?name=APK&background=25D366&color=FFFFFF&size=200`;
					const fallbackRes = await axios.get(fallbackUrl, { responseType: 'arraybuffer', timeout: 3000 });
					const { imageMessage } = await generateWAMessageContent({ image: Buffer.from(fallbackRes.data) }, { upload: conn.waUploadToServer });
					return imageMessage;
				} catch (__) {
					return null;
				}
			}
		}

		let cards = [];
		for (const a of apps) {
			const imageMessage = await createHeaderImage(a.icon);
			cards.push({
				body: proto.Message.InteractiveMessage.Body.fromObject({
					text: `📦 *الحزمة:* ${a.package || '—'}\n🔢 *الإصدار:* ${a.version}\n⚖️ *الحجم:* ${a.sizeMB} MB`
				}),
				header: proto.Message.InteractiveMessage.Header.fromObject({
					title: a.name,
					hasMediaAttachment: !!imageMessage,
					...(imageMessage ? { imageMessage } : {})
				}),
				nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
					buttons: [
						{
							"name": "quick_reply",
							"buttonParamsJson": JSON.stringify({ display_text: "📥 تحميل التطبيق", id: `.apkdl ${a.package}` })
						},
						{
							"name": "cta_url",
							"buttonParamsJson": JSON.stringify({ display_text: "📢 قناة الواتساب", url: "https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p" })
						},
						{
							"name": "cta_url",
							"buttonParamsJson": JSON.stringify({ display_text: "📸 إنستغرام", url: "https://www.instagram.com/hamza_amirni_01" })
						}
					]
				})
			});
		}

		const botMsg = generateWAMessageFromContent(m.chat, {
			interactiveMessage: proto.Message.InteractiveMessage.fromObject({
				body: proto.Message.InteractiveMessage.Body.create({ text: `🚀 *مكتبة التطبيقات* — نتائج البحث عن: *${text}*` }),
				footer: proto.Message.InteractiveMessage.Footer.create({ text: 'bot amirni hamza' }),
				carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
			})
		}, { quoted: m });

		await conn.relayMessage(m.chat, botMsg.message, { messageId: botMsg.key.id });
		await m.react('✅');
	}

	// ── 2. Download Aptoide app (.apkdl) ──────────────────────
	if (/^apkdl$/i.test(command)) {
		if (!text) return m.reply('أرسل اسم الحزمة للتحميل:\n.apkdl com.whatsapp');

		const sender = m.sender || m.key.participant || m.key.remoteJid;
		
		// Check limits
		if (!isOwner(sender) && !canDownload(sender)) {
			await m.react('❌');
			return m.reply(`❌ لقد تجاوزت الحد اليومي الأقصى المسموح به لك اليوم وهو (${getLimit()} تطبيقات).`);
		}

		await m.react('⏳');

		try {
			const info = await getDownloadDetails(text.trim());
			if (!info || !info.downloadUrl) {
				await m.react('❌');
				return m.reply('❌ لم يتم العثور على ملف APK للتطبيق المطلوب.');
			}

			// Size check (max 300MB)
			if (info.sizeBytes > 300 * 1024 * 1024) {
				await m.react('⚠️');
				return m.reply(`⚠️ *${info.name}* كبير جداً (${info.sizeMB} MB) للإرسال عبر واتساب (الحد الأقصى 300MB).\n\nيمكنك تحميله يدوياً.`);
			}

			await conn.sendMessage(m.chat, {
				text: `📦 *${info.name}*\n🔢 *الإصدار:* ${info.version}\n⚖️ *الحجم:* ${info.sizeMB} MB\n\n⏳ *جاري إرسال ملف APK...*`
			}, { quoted: m });

			// Stream directly from Aptoide CDN via Baileys (0% local RAM overhead)
			await conn.sendMessage(m.chat, {
				document: { url: info.downloadUrl },
				fileName: `${info.name}_v${info.version}.apk`,
				mimetype: 'application/vnd.android.package-archive',
				caption: `✅ *${info.name}* v${info.version}\n⚖️ ${info.sizeMB} MB\n\n⚡ *bot amirni hamza*`
			}, { quoted: m });

			if (!isOwner(sender)) {
				incrementDownload(sender);
			}

			await m.react('✅');

		} catch (e) {
			await m.react('❌');
			console.error('[apkdl] error:', e.message);
			m.reply('❌ فشل تحميل التطبيق: ' + e.message);
		}
	}
};

handler.help = ['apk <اسم التطبيق>', 'apkdl <الحزمة>'];
handler.tags = ['downloader'];
handler.command = /^(apk|apkdl)$/i;

export default handler;
