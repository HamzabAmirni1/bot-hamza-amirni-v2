import axios from 'axios';

// ============================================================
// APK Download Plugin — Uses appteka.store API
// Commands: .apk <اسم التطبيق> → بحث + تحميل مباشر
// ============================================================

const BASE = 'https://appteka.store';
const HEADERS = { 'content-type': 'application/json', 'user-agent': 'Postify/1.0.0' };

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
		`▸ \`.apk Instagram\`\n` +
		`▸ \`.apk TikTok\`\n\n` +
		`⚡ *bot amirini hamza*`
	);

	await m.react('🔍');

	// ── 1. Search for apps ─────────────────────────────────────
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
		return m.reply(`❌ لم يتم العثور على نتائج لـ *"${text}"*\nجرب بالأحرف اللاتينية.`);
	}

	// ── 2. Show search results list ────────────────────────────
	const top = apps.slice(0, 6);
	let msg = `╭━━━〔 *📦 APK Search* 〕━━━⬣\n`;
	msg += `┃ 🔎 نتائج: *${text}*\n`;
	msg += `╰━━━━━━━━━━━━━━━⬣\n\n`;

	top.forEach((a, i) => {
		msg += `*${i + 1}. ${a.name}*\n`;
		msg += `📦 \`${a.package || '—'}\`\n`;
		msg += `🔢 ${a.version}  |  ⚖️ ${a.size}\n`;
		if (a.appId) {
			msg += `📥 للتحميل: \`.apkdl ${a.appId}\`\n`;
		}
		msg += `\n`;
	});

	msg += `━━━━━━━━━━━━━━━\n`;
	msg += `💡 *اكتب \`.apkdl [رقم]\` لتحميل التطبيق*\n`;
	msg += `⚡ *bot amirini hamza*`;

	// Send with icon of first result
	try {
		if (top[0].icon && top[0].appId) {
			await conn.sendMessage(m.chat, {
				image: { url: top[0].icon },
				caption: msg
			}, { quoted: m });
		} else {
			await m.reply(msg);
		}
	} catch (_) {
		await m.reply(msg);
	}

	await m.react('✅');

	// ── 3. Auto-download the FIRST result immediately ──────────
	if (!top[0].appId) return;

	try {
		await m.react('⏳');
		const info = await getDownloadInfo(top[0].appId);

		// Size check — WhatsApp limit ~100MB for documents
		if (info.rawSize > 95 * 1024 * 1024) {
			return conn.sendMessage(m.chat, {
				text: `⚠️ *${info.name}* كبير جداً (${info.size}) للإرسال عبر واتساب.\n\n📲 حمله مباشرة من:\n${top[0].link}`
			}, { quoted: m });
		}

		if (!info.downloadUrl) throw new Error('No download URL');

		// Send info card
		await conn.sendMessage(m.chat, {
			text: `📦 *${info.name}*\n` +
				`🔢 *الإصدار:* ${info.version}\n` +
				`⚖️ *الحجم:* ${info.size}\n` +
				`📱 *أندرويد:* ${info.android}+\n` +
				(info.description ? `\n📝 ${info.description}...\n` : '') +
				`\n⏳ *جاري إرسال ملف APK...*`
		}, { quoted: m });

		// Send the APK as document
		await conn.sendMessage(m.chat, {
			document: { url: info.downloadUrl },
			fileName: `${info.name}_${info.version}.apk`,
			mimetype: 'application/vnd.android.package-archive',
			caption: `✅ *${info.name}* v${info.version}\n⚖️ ${info.size}\n\n⚡ *bot amirini hamza*`
		}, { quoted: m });

		await m.react('✅');

	} catch (e) {
		console.log('[apk] download failed:', e.message);
		// Don't show error — search results already sent above
	}
};

// ── .apkdl <appId> — Direct download by appteka app ID ──────
const handlerDl = async (m, { conn, text }) => {
	if (!text) return m.reply('أرسل رقم التطبيق:\n.apkdl 12345678');

	await m.react('⏳');

	try {
		const info = await getDownloadInfo(text.trim());

		if (info.rawSize > 95 * 1024 * 1024) {
			await m.react('⚠️');
			return m.reply(`⚠️ *${info.name}* كبير جداً (${info.size}).\n\nحمله من:\nhttps://appteka.store/app/${text.trim()}`);
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
