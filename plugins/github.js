
let handler = async (m, { conn, text, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	if (!text) {
		return m.reply(t(
			`💻 *GITHUB DOWNLOADER & SEARCH*\n━━━━━━━━━━━━━━━━━━━━━\n\n1️⃣ *Download Repo ZIP:*\n← ${usedPrefix}${command} https://github.com/owner/repo\n\n2️⃣ *Search Repos:*\n← ${usedPrefix}${command} whatsapp bot\n\n*Example:*\n← ${usedPrefix}gitclone https://github.com/owner/repo`,
			`💻 *محمل وباحث GitHub*\n━━━━━━━━━━━━━━━━━━━━━\n\n1️⃣ *تحميل مستودع (ZIP):*\n← ${usedPrefix}${command} https://github.com/owner/repo\n\n2️⃣ *البحث عن مستودعات:*\n← ${usedPrefix}${command} whatsapp-bot\n\n*مثال:*\n← ${usedPrefix}gitclone https://github.com/owner/repo`,
			`💻 *تحميل والبحث فـ GitHub*\n━━━━━━━━━━━━━━━━━━━━━\n\n1️⃣ *تحميل مشروع (ZIP):*\n← ${usedPrefix}${command} https://github.com/owner/repo\n\n2️⃣ *قلب على مشاريع:*\n← ${usedPrefix}${command} whatsapp-bot\n\n*مثال:*\n← ${usedPrefix}gitclone https://github.com/owner/repo`
		));
	}

	const githubRepoRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)(?:\.git)?/i;
	const match = text.match(githubRepoRegex);
	const isCloneCmd = /^gitclone$/i.test(command);

	// ── 1. DOWNLOAD REPOSITORY ZIP ───────────────────────────────────────
	if (match || isCloneCmd) {
		let userOrUrl = text.trim();
		let owner = match ? match[1] : '';
		let repo = match ? match[2].replace(/\.git$/i, '') : '';

		if (!owner || !repo) {
			const parts = userOrUrl.replace(/^https?:\/\/github\.com\//i, '').split('/');
			if (parts.length >= 2) {
				owner = parts[0];
				repo = parts[1].replace(/\.git$/i, '');
			}
		}

		if (!owner || !repo) {
			throw t(
				'❌ Invalid GitHub URL! Example: https://github.com/owner/repo',
				'❌ رابط GitHub غير صالح!\n← مثال: https://github.com/owner/repo',
				'❌ الرابط ديال GitHub ما صحيحش!\n← مثال: https://github.com/owner/repo'
			);
		}

		await m.react('📦');
		await m.reply(t(
			`⏳ *Fetching repository info for ${owner}/${repo}...*`,
			`⏳ *جارٍ جلب معلومات المستودع ${owner}/${repo}...*`,
			`⏳ *كجيبو معلومات المشروع ${owner}/${repo}...*`
		));

		try {
			// Fetch repository info
			const infoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
				headers: { 'User-Agent': 'AntigravityBot/1.0' }
			});

			let repoInfo = {};
			if (infoRes.ok) {
				repoInfo = await infoRes.json();
			}

			const defaultBranch = repoInfo.default_branch || 'master';
			const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${defaultBranch}`;

			const caption = t(
				`📦 *GITHUB REPOSITORY*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *Repo:* ${owner}/${repo}\n⭐ *Stars:* ${repoInfo.stargazers_count || 0}\n🍴 *Forks:* ${repoInfo.forks_count || 0}\n🌿 *Branch:* ${defaultBranch}\n📝 *Description:* ${repoInfo.description || 'No description'}\n\n⚡ *bot amirni hamza*`,
				`📦 *مستودع GITHUB*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *المستودع:* ${owner}/${repo}\n⭐ *النجوم:* ${repoInfo.stargazers_count || 0}\n🍴 *التفرعات:* ${repoInfo.forks_count || 0}\n🌿 *الفرع:* ${defaultBranch}\n📝 *الوصف:* ${repoInfo.description || 'لا يوجد وصف'}\n\n⚡ *bot amirni hamza*`,
				`📦 *مشروع GITHUB*\n━━━━━━━━━━━━━━━━━━━━━\n📌 *المشروع:* ${owner}/${repo}\n⭐ *النجوم:* ${repoInfo.stargazers_count || 0}\n🍴 *الفوركات:* ${repoInfo.forks_count || 0}\n🌿 *الفرع:* ${defaultBranch}\n📝 *الوصف:* ${repoInfo.description || 'بلا وصف'}\n\n⚡ *bot amirni hamza*`
			);

			await m.reply(caption);

			await conn.sendMessage(
				m.chat,
				{
					document: { url: zipUrl },
					fileName: `${repo}-${defaultBranch}.zip`,
					mimetype: 'application/zip',
				},
				{ quoted: m }
			);

			await m.react('✅');

		} catch (e) {
			console.error('[GitHub] Download Error:', e);
			await m.react('❌');
			m.reply(t(
				`❌ Failed to download GitHub repo: ${e.message}`,
				`❌ فشل تحميل مستودع GitHub: ${e.message}`,
				`❌ ما قدرناش ننزلو مشروع GitHub: ${e.message}`
			));
		}
		return;
	}

	// ── 2. SEARCH REPOSITORIES ───────────────────────────────────────────
	await m.react('🔍');
	try {
		const searchRes = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(text)}&sort=stars&order=desc&per_page=6`, {
			headers: { 'User-Agent': 'AntigravityBot/1.0' }
		});

		if (!searchRes.ok) throw new Error(`GitHub API HTTP ${searchRes.status}`);

		const json = await searchRes.json();
		const items = json.items || [];

		if (!items.length) {
			await m.react('❌');
			return m.reply(t(
				`❌ No GitHub repositories found for "${text}".`,
				`❌ لم يتم العثور على أي مستودعات لـ "${text}".`,
				`❌ مالقينا حتى مشروع فـ GitHub لـ "${text}".`
			));
		}

		let responseText = t(
			`🔍 *GITHUB SEARCH RESULTS*\nQuery: \`${text}\`\n━━━━━━━━━━━━━━━━━━━━━\n\n`,
			`🔍 *نتائج بحث GITHUB*\nالبحث: ${text}\n━━━━━━━━━━━━━━━━━━━━━\n\n`,
			`🔍 *نتائج البحث فـ GITHUB*\nالكلمة: ${text}\n━━━━━━━━━━━━━━━━━━━━━\n\n`
		);

		items.slice(0, 5).forEach((item, index) => {
			responseText += `*${index + 1}. ${item.full_name}*\n`;
			responseText += `⭐ ${item.stargazers_count} | 🍴 ${item.forks_count} | 💻 ${item.language || 'Code'}\n`;
			if (item.description) responseText += `📝 ${item.description.slice(0, 80)}...\n`;
			responseText += t(
				`🔗 \`${usedPrefix}gitclone ${item.html_url}\`\n\n`,
				`🔗 ← ${usedPrefix}gitclone ${item.html_url}\n\n`,
				`🔗 ← ${usedPrefix}gitclone ${item.html_url}\n\n`
			);
		});

		responseText += t(
			`💡 *Tip:* Use \`${usedPrefix}gitclone <url>\` to download any repo as a ZIP file!`,
			`💡 *ملاحظة:* استخدم الأمر:\n← ${usedPrefix}gitclone <الرابط>\nلتحميل أي مستودع كملف ZIP!`,
			`💡 *نصيحة:* استعمل الأمر:\n← ${usedPrefix}gitclone <الرابط>\nباش تنزل أي مشروع ZIP!`
		);

		await m.reply(responseText);
		await m.react('✅');

	} catch (e) {
		console.error('[GitHub] Search Error:', e);
		await m.react('❌');
		m.reply(t(
			`❌ GitHub search error: ${e.message}`,
			`❌ خطأ أثناء البحث في GitHub: ${e.message}`,
			`❌ وقع مشكل فالبحث فـ GitHub: ${e.message}`
		));
	}
};

handler.help = ['github', 'gitclone'];
handler.tags = ['downloader', 'tools'];
handler.command = /^(github|gitclone|gh)$/i;

export default handler;
