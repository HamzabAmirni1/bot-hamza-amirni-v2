import axios from 'axios';
import { Button, Carousel } from '../lib/MessageBuilder.js';

// ============================================================
// APK Download Plugin — Uses appteka.store API
// Commands: .apk <اسم التطبيق> → بحث + تحميل مباشر
// ============================================================

const BASE = 'https://appteka.store';
const HEADERS = { 'content-type': 'application/json', 'user-agent': 'Postify/1.0.0' };

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

function getRemainingDownloads(jid) {
  const entry = downloadCount.get(jid);
  if (!entry || Date.now() >= entry.resetAt) return getLimit();
  return Math.max(0, getLimit() - entry.count);
}

function isOwner(jid) {
  const num = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
  const owners = global.owner || [];
  return owners.some(o => String(o[0]) === String(num));
}

// ── Search apps on appteka ──────────────────────────────────
async function searchApps(query) {
	const r = await axios.get(`${BASE}/api/1/app/search`, {
		params: { query, offset: 0, locale: 'en', count: 8 },
		headers: HEADERS,
		timeout: 15000,
		validateStatus: false
	});
	if (r.status !== 200 || !r.data?.result?.entries) return [];
	return r.data.result.entries.map(a => ({
		appId: a.app_id,
		name: a.label,
		package: a.package,
		version: a.ver_name || '—',
		size: a.size ? (a.size / (1024 * 1024)).toFixed(1) + ' MB' : '—',
		downloads: a.downloads || 0,
		icon: `https://appteka.store/static/app/${a.app_id}/icon.png`,
		link: `${BASE}/app/${a.app_id}`
	}));
}

// ── Get direct download link for an app by appId ───────────
async function getDownloadInfo(appId) {
	const r = await axios.get(`${BASE}/api/1/app/info`, {
		params: { app_id: appId },
		headers: HEADERS,
		timeout: 20000,
		validateStatus: false
	});
	if (r.status !== 200 || !r.data?.result) throw new Error('App info not found');
	const d = r.data.result;
	return {
		name: d.info?.label || 'App',
		package: d.info?.package || '',
		version: d.info?.ver_name || '—',
		size: d.info?.size ? (d.info.size / (1024 * 1024)).toFixed(1) + ' MB' : '—',
		rawSize: d.info?.size || 0,
		downloadUrl: d.link,
		android: d.info?.android || '—',
		description: d?.meta?.description?.slice(0, 200) || ''
	};
}

// ── Fallback: search on APKPure via scraping ────────────────
async function fallbackSearch(query) {
	try {
		const r = await axios.get(
			`https://apkpure.com/search?q=${encodeURIComponent(query)}`,
			{ headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 12000 }
		);
		const matches = [...r.data.matchAll(/<div class="first-info">\s*<a[^>]+href="([^"]+)"[^>]*>\s*<p[^>]*>([^<]+)<\/p>/g)];
		return matches.slice(0, 5).map(m => ({
			appId: null,
			name: m[2].trim(),
			package: m[1].replace(/^\//, '').split('/')[0],
			version: '—',
			size: '—',
			downloads: 0,
			icon: '',
			link: `https://apkpure.com${m[1]}`
		}));
	} catch (_) { return []; }
}

// ============================================================
// HANDLER
// ============================================================
const handler = async (m, { conn, text }) => {
	if (!text) return m.reply(
		`📦 *APK Downloader*\n\n` +
		`ابحث عن أي تطبيق أندرويد وحمله مباشرة!\n\n` +
		`*مثال:*\n` +
		`▸ \`.apk WhatsApp\`\n` +
		`▸ \`.apk Instagram\`\n\n` +
		`⚡ *bot amirini hamza*`
	);

	await m.react('🔍');

	let apps = [];
	try {
		apps = await searchApps(text);
	} catch (e) {
		console.log('[apk] appteka search failed:', e.message);
	}

	if (!apps.length) {
		apps = await fallbackSearch(text);
	}

	if (!apps.length) {
		await m.react('❌');
		return m.reply(`❌ لم يتم العثور على نتائج لـ *"${text}"*`);
	}

	// Send Carousel cards instead of listing text
	const carousel = new Carousel(conn);
	carousel.setBody(`🚀 *مكتبة التطبيقات* — نتائج البحث عن: *${text}*`);
	carousel.setFooter('اضغط على الزر أسفل الكارت لتحميل التطبيق مباشرة');

	for (const a of apps.slice(0, 6)) {
		const btn = new Button(conn);
		const iconUrl = a.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=random&size=300`;
		btn.setTitle(a.name)
		   .setBody(`📦 *الحزمة:* ${a.package || '—'}\n🔢 *الإصدار:* ${a.version}\n⚖️ *الحجم:* ${a.size}`)
		   .setImage(iconUrl);

		if (a.appId) {
			btn.addReply('📥 تحميل التطبيق الآن', `.apkdl ${a.appId}`);
		} else {
			btn.addUrl('🔗 صفحة التحميل خارجية', a.link);
		}

		const card = await btn.toCard();
		carousel.addCard(card);
	}

	await carousel.send(m.chat, { quoted: m });
	await m.react('✅');
};

// ── .apkdl <appId> — Direct download by appteka app ID ──────
const handlerDl = async (m, { conn, text }) => {
	if (!text) return m.reply('أرسل رقم التطبيق:\n.apkdl 12345678');

	const sender = m.sender || m.key.participant || m.key.remoteJid;
	
	// Check user limits (owners have bypass)
	if (!isOwner(sender) && !canDownload(sender)) {
		await m.react('❌');
		return m.reply(`❌ لقد تجاوزت الحد اليومي الأقصى المسموح به لك اليوم وهو (${getLimit()} تطبيقات).`);
	}

	await m.react('⏳');

	try {
		const info = await getDownloadInfo(text.trim());

		if (info.rawSize > 95 * 1024 * 1024) {
			await m.react('⚠️');
			return m.reply(`⚠️ *${info.name}* كبير جداً (${info.size}) للإرسال عبر واتساب.\n\nحمله من:\nhttps://appteka.store/app/${text.trim()}`);
		}

		if (!info.downloadUrl) { await m.react('❌'); return m.reply('❌ لم يتم العثور على رابط التحميل.'); }

		await conn.sendMessage(m.chat, {
			text: `📦 *${info.name}*\n🔢 v${info.version}  |  ⚖️ ${info.size}\n📱 Android ${info.android}+\n\n⏳ *جاري إرسال APK...*`
		}, { quoted: m });

		await conn.sendMessage(m.chat, {
			document: { url: info.downloadUrl },
			fileName: `${info.name}_${info.version}.apk`,
			mimetype: 'application/vnd.android.package-archive',
			caption: `✅ *${info.name}* v${info.version}\n⚖️ ${info.size}\n\n⚡ *bot amirini hamza*`
		}, { quoted: m });

		if (!isOwner(sender)) {
			incrementDownload(sender);
		}
		
		await m.react('✅');

	} catch (e) {
		await m.react('❌');
		console.error('[apkdl] error:', e.message);
		m.reply('❌ فشل التحميل: ' + e.message);
	}
};

handler.help = ['apk <اسم التطبيق>'];
handler.tags = ['downloader'];
handler.command = /^apk$/i;

handlerDl.help = ['apkdl <appId>'];
handlerDl.tags = ['downloader'];
handlerDl.command = /^apkdl$/i;

export { handlerDl };
export default handler;
