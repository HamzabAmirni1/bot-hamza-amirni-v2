// ============================================================
// Live News Plugin — Hespress, Al Jazeera, Al Arabiya, Le360, Febrayer
// Commands: .news | .hespress | .aljazeera | .alarabiya | .le360 | .febrayer
// ============================================================

const SOURCES = {
	hespress: { name: 'هسبريس (Hespress)', icon: '📰', url: 'https://www.hespress.com/feed' },
	aljazeera: { name: 'الجزيرة (Al Jazeera)', icon: '🌐', url: 'https://www.aljazeera.net/aljazeerarss/a7c6850e-b73a-44d4-b97c-3b0270a4aa50/73d0e1b4-532f-45ef-b135-bf77eb2d8467' },
	alarabiya: { name: 'العربية (Al Arabiya)', icon: '📺', url: 'https://www.alarabiya.net/.mrss/ar.xml' },
	le360:     { name: 'Le360 (لو 360)', icon: '🇲🇦', url: 'https://ar.le360.ma/rss' },
	febrayer:  { name: 'فبراير (Febrayer)', icon: '🗞️', url: 'https://www.febrayer.com/feed' }
};

function parseRssXml(xmlString) {
	const items = [];
	const itemMatches = xmlString.match(/<item[\s\S]*?<\/item>/gi) || [];
	for (const itemXml of itemMatches) {
		const titleMatch   = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
		const linkMatch    = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
		const descMatch    = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
		const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

		let imgUrl = '';
		const mcM  = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
		const mtM  = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
		const encM = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
		const imgM = descMatch ? descMatch[1].match(/<img[^>]+src=["']([^"']+)["']/i) : null;
		if (mcM) imgUrl = mcM[1];
		else if (mtM) imgUrl = mtM[1];
		else if (encM) imgUrl = encM[1];
		else if (imgM) imgUrl = imgM[1];

		let cleanDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';
		cleanDesc = cleanDesc
			.replace(/&nbsp;/gi,' ').replace(/&quot;/gi,'"').replace(/&amp;/gi,'&')
			.replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#039;/g,"'");

		let title = (titleMatch?.[1] || '').trim()
			.replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'')
			.replace(/&quot;/gi,'"').replace(/&amp;/gi,'&').replace(/&#039;/g,"'");
		let link = (linkMatch?.[1] || '').trim();

		if (title && link) items.push({
			title, link,
			description: cleanDesc,
			pubDate: pubDateMatch?.[1]?.trim() || '',
			image: imgUrl
		});
	}
	return items;
}

function getSourceKey(cmd, textArg) {
	const c = cmd.toLowerCase();
	const a = (textArg || '').toLowerCase().trim();
	if (/aljazeera|jazira|الجزيرة/.test(c+a)) return 'aljazeera';
	if (/alarabiya|arabiya|العربية/.test(c+a)) return 'alarabiya';
	if (/le360|360/.test(c+a)) return 'le360';
	if (/febrayer|فبراير/.test(c+a)) return 'febrayer';
	return 'hespress';
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!conn.newsSessions) conn.newsSessions = {};

	// ─── If user replied with a number button already handled via before() ───
	const selectedNum = parseInt(text?.trim());
	if (!isNaN(selectedNum) && selectedNum >= 1 && selectedNum <= 5) {
		const session = conn.newsSessions[m.sender];
		if (session?.items?.[selectedNum - 1]) {
			return sendArticleDetail(conn, m, session.items[selectedNum - 1], session.sourceName, t, usedPrefix, command);
		}
	}

	// ─── Determine source ──────────────────────────────────────────────────
	const sourceKey = getSourceKey(command, !isNaN(parseInt(text)) ? '' : text);
	const source = SOURCES[sourceKey];

	await m.react('⏳');

	try {
		const res = await fetch(source.url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'application/rss+xml, application/xml, text/xml; q=0.9, */*; q=0.8'
			}
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const xml  = await res.text();
		const items = parseRssXml(xml).slice(0, 5);

		if (!items.length) {
			await m.react('❌');
			return m.reply(t(
				`❌ Failed to load news from ${source.name}.`,
				`❌ متعذر جلب الأخبار من ${source.name}.`,
				`❌ ما قدرناش نجيبو الأخبار من ${source.name}.`
			));
		}

		// Save session for button handler
		conn.newsSessions[m.sender] = {
			sourceKey, sourceName: source.name, items, timestamp: Date.now()
		};

		const headerText = t(
			`${source.icon} *LATEST NEWS — ${source.name}*\n━━━━━━━━━━━━━━━━━━━━━`,
			`${source.icon} *آخر الأخبار — ${source.name}*\n━━━━━━━━━━━━━━━━━━━━━`,
			`${source.icon} *أحدث الأخبار — ${source.name}*\n━━━━━━━━━━━━━━━━━━━━━`
		);

		// ─── Build interactive buttons (one per article) ───────────────────
		const newsButtons = items.map((item, i) => ({
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: `${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i]} ${item.title.slice(0, 55)}${item.title.length > 55 ? '…' : ''}`,
				id: `${usedPrefix}${command} ${i + 1}`
			})
		}));

		// Add source switcher buttons
		const switchBtns = [
			{ label: '📰 هسبريس',    id: `${usedPrefix}hespress` },
			{ label: '🌐 الجزيرة',   id: `${usedPrefix}aljazeera` },
			{ label: '📺 العربية',   id: `${usedPrefix}alarabiya` },
			{ label: '🇲🇦 Le360',    id: `${usedPrefix}le360` },
			{ label: '🗞️ فبراير',    id: `${usedPrefix}febrayer` }
		]
			.filter(b => !b.id.includes(command.toLowerCase())) // exclude current source
			.slice(0, 2)
			.map(b => ({
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({ display_text: b.label, id: b.id })
			}));

		const allButtons = [...newsButtons, ...switchBtns];

		const bodyText = t(
			`${headerText}\n\n` + items.map((item, i) => `${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i]} *${item.title}*`).join('\n\n') +
			`\n\n💡 *Click a headline below to read the full article with photo!*`,

			`${headerText}\n\n` + items.map((item, i) => `${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i]} *${item.title}*`).join('\n\n') +
			`\n\n💡 *اضغط على عنوان الخبر أدناه لقراءة المقال الكامل مع الصورة!*`,

			`${headerText}\n\n` + items.map((item, i) => `${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i]} *${item.title}*`).join('\n\n') +
			`\n\n💡 *دوز على العنوان باش تقرا المقال كامل بالصورة!*`
		);

		try {
			await conn.sendButton(
				m.chat,
				{
					text: bodyText,
					footer: `⚡ bot amirni hamza`,
					buttons: allButtons
				},
				{ quoted: m }
			);
		} catch (_) {
			// Fallback plain text
			await m.reply(bodyText);
		}

		await m.react('📰');

	} catch (e) {
		console.error('[News Plugin Error]:', e);
		await m.react('❌');
		m.reply(t(
			`❌ Error fetching news: ${e.message}`,
			`❌ خطأ أثناء جلب الأخبار: ${e.message}`,
			`❌ وقع مشكل فـ جلب الأخبار: ${e.message}`
		));
	}
};

// ─── BEFORE: Handle quick_reply button press (news_1, news_2 … news_5) ──────
handler.before = async function (m) {
	if (!m.text || m.isBaileys) return;
	const num = parseInt(m.text.trim());
	if (isNaN(num) || num < 1 || num > 5) return;
	if (!this.newsSessions?.[m.sender]) return;
	const session = this.newsSessions[m.sender];
	if (Date.now() - session.timestamp > 10 * 60 * 1000) {
		delete this.newsSessions[m.sender];
		return;
	}
	const item = session.items?.[num - 1];
	if (!item) return;
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;
	await sendArticleDetail(this, m, item, session.sourceName, t, '.', 'news');
	return true;
};

// ─── HELPER: Send full article with photo ─────────────────────────────────────
async function sendArticleDetail(conn, m, item, sourceName, t, usedPrefix, command) {
	await m.react('📄');

	const caption = t(
		`📰 *${sourceName}*\n━━━━━━━━━━━━━━━━━━━━━\n\n📌 *${item.title}*\n\n${item.description ? `📝 ${item.description.slice(0, 500)}` : ''}\n\n🔗 ${item.link}\n\n⚡ *bot amirni hamza*`,
		`📰 *${sourceName}*\n━━━━━━━━━━━━━━━━━━━━━\n\n📌 *${item.title}*\n\n${item.description ? `📝 ${item.description.slice(0, 500)}` : ''}\n\n🔗 ${item.link}\n\n⚡ *bot amirni hamza*`,
		`📰 *${sourceName}*\n━━━━━━━━━━━━━━━━━━━━━\n\n📌 *${item.title}*\n\n${item.description ? `📝 ${item.description.slice(0, 500)}` : ''}\n\n🔗 ${item.link}\n\n⚡ *bot amirni hamza*`
	);

	const backBtn = {
		name: 'quick_reply',
		buttonParamsJson: JSON.stringify({
			display_text: t('◀️ Back to news list', '◀️ رجوع للأخبار', '◀️ ارجع للأخبار'),
			id: `${usedPrefix}${command}`
		})
	};

	if (item.image && /^https?:\/\//i.test(item.image)) {
		try {
			await conn.sendButton(
				m.chat,
				{
					image: { url: item.image },
					caption,
					footer: '⚡ bot amirni hamza',
					buttons: [backBtn]
				},
				{ quoted: m }
			);
			await m.react('✅');
			return;
		} catch (_) {}
	}

	try {
		await conn.sendButton(
			m.chat,
			{ text: caption, footer: '⚡ bot amirni hamza', buttons: [backBtn] },
			{ quoted: m }
		);
	} catch (_) {
		await m.reply(caption);
	}
	await m.react('✅');
}

handler.help = ['news', 'hespress', 'aljazeera', 'alarabiya', 'le360', 'febrayer', 'اخبار'];
handler.tags = ['news'];
handler.command = /^(news|hespress|aljazeera|jazira|alarabiya|arabiya|le360|360|febrayer|فبراير|هسبريس|الجزيرة|العربية|اخبار|أخبار|عاجل)$/i;

export default handler;
