
let handler = async (m, { text, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	if (!text) {
		return m.reply(t(
			`🔍 *GOOGLE SEARCH*\n\nUsage:\n${usedPrefix + command} <search query>\n\n*Example:*\n${usedPrefix + command} Morocco world cup 2026`,
			`🔍 *بحث جوجل*\n\nالاستخدام:\n← ${usedPrefix + command} <كلمات البحث>\n\n*مثال:*\n← ${usedPrefix + command} المغرب كأس العالم 2026`,
			`🔍 *البحث فـ جوجل (Google Search)*\n\nطريقة الاستعمال:\n← ${usedPrefix + command} <كلمة البحث>\n\n*مثال:*\n← ${usedPrefix + command} المغرب كاس العالم 2026`
		));
	}

	await m.react('🔍');

	try {
		let results = [];

		// Try API 1 (agatz google search)
		try {
			const res = await fetch(`https://api.agatz.xyz/api/google?message=${encodeURIComponent(text)}`);
			const json = await res.json();
			const data = json?.data || json?.result;
			if (Array.isArray(data) && data.length > 0) {
				results = data.map(item => ({
					title: item.title || item.name || '',
					snippet: item.snippet || item.desc || item.description || '',
					link: item.link || item.url || ''
				})).filter(r => r.title && r.link);
			}
		} catch (_) {}

		// Try API 2 (vreden google search) if API 1 failed
		if (!results.length) {
			try {
				const res = await fetch(`https://api.vreden.my.id/api/googlesearch?query=${encodeURIComponent(text)}`);
				const json = await res.json();
				const data = json?.result || json?.data;
				if (Array.isArray(data) && data.length > 0) {
					results = data.map(item => ({
						title: item.title || '',
						snippet: item.snippet || item.desc || '',
						link: item.link || item.url || ''
					})).filter(r => r.title && r.link);
				}
			} catch (_) {}
		}

		// Try Fallback scraping via DuckDuckGo HTML
		if (!results.length) {
			try {
				const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(text)}`, {
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
						'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
					}
				});
				const html = await res.text();

				// Simple regex-based extraction (no cheerio needed)
				const resultBlockRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
				const snippetRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

				const titles = [], links = [], snippets = [];
				let m2;
				while ((m2 = resultBlockRe.exec(html)) !== null && titles.length < 5) {
					let href = m2[1];
					const title = m2[2].replace(/<[^>]+>/g, '').trim();
					if (href.includes('uddg=')) {
						const um = href.match(/uddg=([^&]+)/);
						if (um) href = decodeURIComponent(um[1]);
					}
					if (title && href) { titles.push(title); links.push(href); }
				}
				let sn;
				while ((sn = snippetRe.exec(html)) !== null && snippets.length < 5) {
					snippets.push(sn[1].replace(/<[^>]+>/g, '').trim());
				}

				titles.forEach((title, i) => {
					results.push({ title, snippet: snippets[i] || '', link: links[i] || '' });
				});
			} catch (_) {}
		}


		if (!results.length) {
			await m.react('❌');
			return m.reply(t(
				`❌ No Google search results found for "${text}".`,
				`❌ لم يتم العثور على أي نتائج بحث في جوجل لـ "${text}".`,
				`❌ مالقينا حتى نتيجة فـ جوجل لـ "${text}".`
			));
		}

		let responseText = t(
			`🔍 *GOOGLE SEARCH RESULTS*\nQuery: \`${text}\`\n━━━━━━━━━━━━━━━━━━━━━\n\n`,
			`🔍 *نتائج بحث جوجل*\nالربط: \`${text}\`\n━━━━━━━━━━━━━━━━━━━━━\n\n`,
			`🔍 *نتائج البحث فـ جوجل*\nالكلمة: \`${text}\`\n━━━━━━━━━━━━━━━━━━━━━\n\n`
		);

		results.slice(0, 5).forEach((item, index) => {
			responseText += `*${index + 1}. ${item.title}*\n`;
			if (item.snippet) responseText += `💬 ${item.snippet}\n`;
			responseText += `🔗 ${item.link}\n\n`;
		});

		responseText += `⚡ *bot amirni hamza*`;

		await m.reply(responseText);
		await m.react('✅');

	} catch (e) {
		console.error('[Google Search] Error:', e);
		await m.react('❌');
		m.reply(t(
			`❌ Google Search error: ${e.message}`,
			`❌ خطأ أثناء البحث في جوجل: ${e.message}`,
			`❌ وقع خطأ أثناء البحث فـ جوجل: ${e.message}`
		));
	}
};

handler.help = ['google', 'gsearch'];
handler.tags = ['tools', 'search'];
handler.command = /^(google|gsearch|g)$/i;

export default handler;
