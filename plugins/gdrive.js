
let handler = async (m, { conn, text, usedPrefix, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	if (!text) {
		return m.reply(t(
			`📥 *GOOGLE DRIVE DOWNLOADER*\n\nUsage: ${usedPrefix + command} <Google Drive Link>\n\n*Example:*\n${usedPrefix + command} https://drive.google.com/file/d/1Bzi65A2.../view`,
			`📥 *محمل جوجل درايف*\n\nالاستخدام:\n← ${usedPrefix + command} <رابط جوجل درايف>\n\n*مثال:*\n← ${usedPrefix + command} https://drive.google.com/file/d/1Bzi65A2.../view`,
			`📥 *تحميل من جوجل درايف (Google Drive)*\n\nطريقة الاستعمال:\n← ${usedPrefix + command} <رابط جوجل درايف>\n\n*مثال:*\n← ${usedPrefix + command} https://drive.google.com/file/d/1Bzi65A2.../view`
		));
	}

	const driveRegex = /(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|folderview\?id=)([a-zA-Z0-9_-]+)/i;
	const match = text.match(driveRegex);

	if (!match && !text.includes('drive.google.com')) {
		throw t(
			'❌ Invalid Google Drive link. Please check the URL.',
			'❌ رابط جوجل درايف غير صالح. يرجى التحقق من الرابط.',
			'❌ رابط جوجل درايف ما صحيحش. تحقق من الرابط أ عشيري.'
		);
	}

	await m.react('📥');
	await m.reply(t(
		'⏳ *Fetching file from Google Drive...*',
		'⏳ *جارٍ جلب الملف من جوجل درايف...*',
		'⏳ *كجيبو الملف من جوجل درايف...*'
	));

	try {
		let fileData = null;

		// Try API 1 (vreden)
		try {
			const res = await fetch(`https://api.vreden.my.id/api/gdrive?url=${encodeURIComponent(text)}`);
			const json = await res.json();
			if (json?.result?.downloadUrl) {
				fileData = {
					fileName: json.result.fileName || json.result.name || 'file.zip',
					fileSize: json.result.fileSize || json.result.size || 'Unknown',
					downloadUrl: json.result.downloadUrl,
					mimetype: json.result.mimetype || 'application/octet-stream'
				};
			}
		} catch (_) {}

		// Try API 2 (agatz) if API 1 failed
		if (!fileData) {
			try {
				const res = await fetch(`https://api.agatz.xyz/api/gdrive?url=${encodeURIComponent(text)}`);
				const json = await res.json();
				const data = json?.data || json?.result;
				if (data && (data.downloadUrl || data.link || data.url)) {
					fileData = {
						fileName: data.name || data.fileName || 'gdrive_file.zip',
						fileSize: data.size || data.fileSize || 'Unknown',
						downloadUrl: data.downloadUrl || data.link || data.url,
						mimetype: data.mimetype || 'application/octet-stream'
					};
				}
			} catch (_) {}
		}

		// Try Direct UC export fallback if file ID is present
		if (!fileData && match?.[1]) {
			const fileId = match[1];
			fileData = {
				fileName: `gdrive_${fileId}.zip`,
				fileSize: 'Direct Download',
				downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
				mimetype: 'application/octet-stream'
			};
		}

		if (!fileData || !fileData.downloadUrl) {
			throw new Error('Could not resolve download link');
		}

		const caption = t(
			`📁 *Google Drive File*\n━━━━━━━━━━━━━━━━━━━━━\n📛 *Name:* ${fileData.fileName}\n📊 *Size:* ${fileData.fileSize}\n\n⚡ *bot amirni hamza*`,
			`📁 *ملف جوجل درايف*\n━━━━━━━━━━━━━━━━━━━━━\n📛 *الاسم:* ${fileData.fileName}\n📊 *الحجم:* ${fileData.fileSize}\n\n⚡ *bot amirni hamza*`,
			`📁 *ملف من جوجل درايف*\n━━━━━━━━━━━━━━━━━━━━━\n📛 *الاسم:* ${fileData.fileName}\n📊 *الحجم:* ${fileData.fileSize}\n\n⚡ *bot amirni hamza*`
		);

		await m.reply(caption);

		await conn.sendMessage(
			m.chat,
			{
				document: { url: fileData.downloadUrl },
				fileName: fileData.fileName,
				mimetype: fileData.mimetype,
			},
			{ quoted: m }
		);

		await m.react('✅');

	} catch (e) {
		console.error('[GDrive] Error:', e);
		await m.react('❌');
		m.reply(t(
			`❌ Failed to download Google Drive file: ${e.message}`,
			`❌ فشل تحميل ملف جوجل درايف: ${e.message}`,
			`❌ ما قدرناش ننزلوا ملف جوجل درايف: ${e.message}`
		));
	}
};

handler.help = ['gdrive', 'gd'];
handler.tags = ['downloader'];
handler.command = /^(gdrive|gd|googledrive|درايف|جوجل_درايف)$/i;

export default handler;
