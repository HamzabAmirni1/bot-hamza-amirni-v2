// ============================================================
// Book & Novel PDF Downloader Plugin (.kitab / .books)
// Commands: .kitab | .ktab | .book | .books | .pdfbook | .كتاب | .كتب | .رواية | .روايات | .novel
// Interactive Buttons & Direct PDF Transfer
// Developed for Bot Hamza Amirni by Hamza Amirni
// ============================================================

import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_BYTES = 65 * 1024 * 1024; // 65MB max for WhatsApp document transfer
const sessions = new Map(); // sender -> { at, items: [] }

// Helper for fetch with timeout
async function fetchWithTimeout(url, ms = 25000, opts = {}) {
	const ctrl = new AbortController();
	const tid = setTimeout(() => ctrl.abort(), ms);
	try {
		return await fetch(url, {
			...opts,
			signal: ctrl.signal,
			headers: { 'User-Agent': UA, ...(opts.headers || {}) }
		});
	} finally {
		clearTimeout(tid);
	}
}

// Clean title helper
function cleanBookTitle(str) {
	return String(str || '')
		.replace(/[\"\'\_\-]/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/kotobati|كتوباتي|تحميل|كتاب|pdf|مجانا|قراءة|أونلاين|online/gi, '')
		.trim();
}

/**
 * 1. Search Archive.org for PDF Books
 */
async function searchArchiveBooks(query) {
	const cleanQuery = query.replace(/[\"\'\(\)\+\-\*\/\:\~\^\?\!]/g, ' ').trim();
	if (!cleanQuery) return [];

	// First query with format:PDF
	let q = '(' + encodeURIComponent(cleanQuery) + ')+AND+mediatype:texts+AND+format:PDF';
	let url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=publicdate&fl[]=downloads&sort[]=downloads+desc&rows=8&output=json`;
	
	let docs = [];
	try {
		const res = await fetchWithTimeout(url, 20000);
		if (res.ok) {
			const data = await res.json();
			docs = data.response?.docs || [];
		}
	} catch (_) {}

	// Fallback if 0 results
	if (docs.length === 0) {
		q = '(' + encodeURIComponent(cleanQuery) + ')+AND+mediatype:texts';
		url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=downloads&sort[]=downloads+desc&rows=8&output=json`;
		try {
			const res = await fetchWithTimeout(url, 20000);
			if (res.ok) {
				const data = await res.json();
				docs = data.response?.docs || [];
			}
		} catch (_) {}
	}

	const results = [];
	for (const doc of docs) {
		if (!doc.identifier) continue;
		const author = Array.isArray(doc.creator) ? doc.creator.join('، ') : (doc.creator || '');
		results.push({
			source: 'Archive.org',
			id: doc.identifier,
			title: cleanBookTitle(doc.title) || doc.identifier,
			author: String(author).slice(0, 50),
			downloads: doc.downloads || 0
		});
	}
	return results;
}

/**
 * 2. Search Gutendex (Project Gutenberg) for classics
 */
async function searchGutenberg(term) {
	try {
		const res = await fetchWithTimeout(`https://gutendex.com/books?search=${encodeURIComponent(term)}`, 15000);
		if (!res.ok) return [];
		const data = await res.json();
		const results = [];
		for (const b of (data.results || []).slice(0, 4)) {
			const f = b.formats || {};
			const url = f['application/pdf'] || f['application/epub+zip'] || f['text/plain; charset=utf-8'] || '';
			if (!url || url.endsWith('.zip')) continue;
			results.push({
				source: 'Gutenberg',
				id: 'gutenberg_' + b.id,
				title: cleanBookTitle(b.title) || b.title,
				author: (b.authors || []).map(a => a.name).join('، '),
				url: url
			});
		}
		return results;
	} catch (_) {
		return [];
	}
}

/**
 * Extract PDF download URL and size from Archive.org metadata
 */
async function getArchivePdfMeta(identifier) {
	const res = await fetchWithTimeout(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, 25000);
	if (!res.ok) throw new Error(`Metadata error HTTP ${res.status}`);
	const data = await res.json();
	const files = data.files || [];

	// Filter viable PDF files
	const pdfs = files.filter(f => {
		const name = (f.name || '').toLowerCase();
		return name.endsWith('.pdf') && !name.includes('_text.pdf') && !name.includes('_bw.pdf') && !name.includes('_thumb');
	});

	if (pdfs.length === 0) {
		const anyPdf = files.find(f => (f.name || '').toLowerCase().endsWith('.pdf'));
		if (!anyPdf) throw new Error('لم يتم العثور على نسخة PDF في هذا الكتاب.');
		pdfs.push(anyPdf);
	}

	pdfs.sort((a, b) => (parseInt(b.size || 0) - parseInt(a.size || 0)));
	const best = pdfs[0];
	const size = parseInt(best.size || 0, 10);
	const sizeMb = (size / (1024 * 1024)).toFixed(1);

	return {
		fileName: best.name,
		size: size,
		sizeMb: sizeMb,
		url: `https://archive.org/download/${identifier}/${encodeURIComponent(best.name)}`
	};
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	let arg = (text || '').trim();

	// Check if user quoted a previous book search message with a number
	if (!arg && m.quoted && /^[1-8]$/.test((m.quoted.text || '').trim())) {
		arg = m.quoted.text.trim();
	}

	// ── CASE 1: DOWNLOAD A BOOK BY SELECTION NUMBER (1-8) ────────────────
	if (/^[1-8]$/.test(arg)) {
		const sess = sessions.get(m.sender);
		if (!sess || !sess.items || sess.items.length === 0) {
			return m.reply(t(
				`⚠️ No active book search session found.\nPlease search for a book first:\n← ${usedPrefix + command} <book name>`,
				`⚠️ لم يتم العثور على جلسة بحث نشطة.\nيرجى البحث أولاً عن اسم الكتاب:\n← ${usedPrefix + command} <اسم الكتاب>`,
				`⚠️ ما كايناش جلسة بحث دابا.\nقلب على الكتاب أولاً بـ:\n← ${usedPrefix + command} <سمية الكتاب>`
			));
		}

		const idx = parseInt(arg, 10) - 1;
		const target = sess.items[idx];
		if (!target) {
			return m.reply(t(`⚠️ Invalid choice. Select from 1 to ${sess.items.length}`, `⚠️ اختيار غير صحيح. اختر من 1 إلى ${sess.items.length}`, `⚠️ رقم غالط. اختار من 1 حتى لـ ${sess.items.length}`));
		}

		await m.react('⏳');
		await m.reply(t(
			`⏳ *Downloading:* ${target.title}...\nPreparing PDF document for transfer...`,
			`⏳ *جاري جلب وتحميل كتاب:* ${target.title}...\nنقوم بتجهيز ملف الـ PDF للإرسال...`,
			`⏳ *كنتيليشارجي كتاب:* ${target.title}...\nجاري تجهيز ملف PDF للإرسال دابا...`
		));

		try {
			let downloadUrl = target.url;
			let sizeMb = target.sizeMb || '0';
			let fileName = `${target.title}.pdf`.replace(/[/\\?%*:|"<>]/g, '_');

			if (target.source === 'Archive.org') {
				const meta = await getArchivePdfMeta(target.id);
				downloadUrl = meta.url;
				sizeMb = meta.sizeMb;
				if (meta.fileName) fileName = meta.fileName;

				if (meta.size > MAX_BYTES) {
					await m.react('📦');
					return conn.sendMessage(m.chat, {
						text: t(
							`📦 *Book File Exceeds WhatsApp Limit (65MB)*\n━━━━━━━━━━━━━━━━━━━━\n📖 *Title:* ${target.title}\n✍️ *Author:* ${target.author || 'N/A'}\n💾 *Size:* ${sizeMb} MB\n\n🔗 *Direct Download Link:*\n${downloadUrl}\n\n_Tap the link above to download instantly in your browser._`,
							`📦 *حجم الكتاب كبير ويتجاوز حد واتساب (65MB)*\n━━━━━━━━━━━━━━━━━━━━\n📖 *الكتاب:* ${target.title}\n✍️ *المؤلف:* ${target.author || 'غير محدد'}\n💾 *الحجم:* ${sizeMb} ميغابايت\n\n🔗 *رابط التحميل المباشر:*\n${downloadUrl}\n\n_اضغط على الرابط أعلاه لتحميل الكتاب فوراً من المتصفح._`,
							`📦 *حجم الكتاب كبير على واتساب (أكثر من 65MB)*\n━━━━━━━━━━━━━━━━━━━━\n📖 *الكتاب:* ${target.title}\n✍️ *الكاتب:* ${target.author || 'غير محدد'}\n💾 *الحجم:* ${sizeMb} MB\n\n🔗 *رابط التيليشارجومون ديريكت:*\n${downloadUrl}\n\n_كليكي على الرابط باش تحطو فتيليفونك ديريكت._`
						)
					}, { quoted: m });
				}
			}

			// Download the PDF stream
			const pdfRes = await fetchWithTimeout(downloadUrl, 90000);
			if (!pdfRes.ok) throw new Error(`Download failed with status ${pdfRes.status}`);

			const arrayBuf = await pdfRes.arrayBuffer();
			const pdfBuffer = Buffer.from(arrayBuf);

			await m.react('📚');
			return conn.sendMessage(m.chat, {
				document: pdfBuffer,
				mimetype: 'application/pdf',
				fileName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
				caption: t(
					`📚 *${target.title}*\n━━━━━━━━━━━━━━━━━━━━\n✍️ *Author:* ${target.author || 'N/A'}\n💾 *Size:* ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)} MB\n⚡ *Engine:* Bot Hamza Amirni\n📸 *Instagram:* @hamza_amirni_01`,
					`📚 *كتاب: ${target.title}*\n━━━━━━━━━━━━━━━━━━━━\n✍️ *المؤلف:* ${target.author || 'غير محدد'}\n💾 *الحجم:* ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)} ميغابايت\n⚡ *صانع البوت:* حمزة اعمرني (Hamza Amirni)\n📸 *إنستغرام:* @hamza_amirni_01`,
					`📚 *كتاب: ${target.title}*\n━━━━━━━━━━━━━━━━━━━━\n✍️ *الكاتب:* ${target.author || 'غير محدد'}\n💾 *الحجم:* ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)} MB\n⚡ *صممو:* Bot Hamza Amirni\n📸 *Instagram:* @hamza_amirni_01`
				)
			}, { quoted: m });

		} catch (dlErr) {
			console.error('[KITAB DL ERROR]:', dlErr);
			await m.react('❌');
			return m.reply(t(
				`❌ Failed to download book: ${dlErr.message}`,
				`❌ فشل تحميل ملف الـ PDF: ${dlErr.message}`,
				`❌ وقع مشكل وما قدرتش نحمل الكتاب: ${dlErr.message}`
			));
		}
	}

	// ── CASE 2: EMPTY QUERY (HELP MESSAGE WITH BUTTONS) ──────────────────
	if (!arg) {
		const helpText = t(
			`📚 *PDF Book & Novel Downloader*\n━━━━━━━━━━━━━━━━━━━━\nSearch and download millions of free books directly as PDF documents!\n\n*Usage:*\n← ${usedPrefix + command} <book or author name>\n\n*Examples:*\n← ${usedPrefix + command} مقدمة ابن خلدون\n← ${usedPrefix + command} العادات الذرية\n← ${usedPrefix + command} The Little Prince\n\n_Or click any of the popular search buttons below:_`,
			`📚 *مكتبة تحميل الكتب والروايات (PDF)*\n━━━━━━━━━━━━━━━━━━━━\nابحث وحمّل ملايين الكتب والروايات العربية والعالمية مباشرة بصيغة PDF على واتساب!\n\n*طريقة الاستخدام:*\n← ${usedPrefix + command} <اسم الكتاب أو المؤلف>\n\n*أمثلة:*\n← ${usedPrefix + command} مقدمة ابن خلدون\n← ${usedPrefix + command} العادات الذرية\n← ${usedPrefix + command} قواعد العشق الاربعون\n← ${usedPrefix + command} طه حسين\n\n_أو اضغط على أحد الأزرار السريعة بالأسفل للبحث الفوري:_`,
			`📚 *مكتبة الكتب والروايات PDF*\n━━━━━━━━━━━━━━━━━━━━\nتيليشارجي أي كتاب ولا رواية بغيتيها مباشرة بصيغة PDF فـ واتساب فابور!\n\n*طريقة الاستعمال:*\n← ${usedPrefix + command} <سمية الكتاب ولا الكاتب>\n\n*أمثلة:*\n← ${usedPrefix + command} مقدمة ابن خلدون\n← ${usedPrefix + command} العادات الذرية\n← ${usedPrefix + command} قواعد العشق الاربعون\n\n_أو ورك على أحد الأزرار التفاعلية لتحت باش تقلب فالبلاصة:_`
		);

		const sampleButtons = [
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '📖 مقدمة ابن خلدون',
					id: `${usedPrefix + command} مقدمة ابن خلدون`
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '📖 العادات الذرية',
					id: `${usedPrefix + command} العادات الذرية`
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '📖 The Little Prince',
					id: `${usedPrefix + command} The Little Prince`
				})
			}
		];

		try {
			return await conn.sendButton(
				m.chat,
				{
					text: helpText,
					footer: `${global.namebot || 'Bot Hamza Amirni'} • @hamza_amirni_01`,
					buttons: sampleButtons
				},
				{ quoted: m }
			);
		} catch (_) {
			return m.reply(helpText);
		}
	}

	// ── CASE 3: SEARCH FOR BOOKS ────────────────────────────────────────
	await m.react('🔍');

	const [archiveRes, gutenRes] = await Promise.all([
		searchArchiveBooks(arg),
		/[a-zA-Z]/.test(arg) ? searchGutenberg(arg) : Promise.resolve([])
	]);

	const merged = [...archiveRes, ...gutenRes].slice(0, 8);

	if (merged.length === 0) {
		await m.react('❌');
		return m.reply(t(
			`😕 No PDF books found for "*${arg}*".\nTry using simpler keywords or author's name.`,
			`😕 لم يتم العثور على نتائج لكتاب "*${arg}*".\nجرّب كتابة كلمات أدق أو اسم المؤلف بشكل مبسط.`,
			`😕 ما لقيت حتى كتاب بـ "*${arg}*".\nجرب تكتب اسم الكتاب بطريقة مبسطة ولا سمية الكاتب.`
		));
	}

	// Save active session for user
	sessions.set(m.sender, { at: Date.now(), items: merged });

	const formattedList = merged.map((b, i) => {
		const authorLine = b.author ? `\n   ✍️ ${b.author}` : '';
		return `${i + 1}. 📖 *${b.title}*${authorLine}\n   🏛️ ${b.source}`;
	}).join('\n\n');

	// Construct interactive selection menu rows (like .yts)
	const rows = merged.map((b, i) => ({
		header: '',
		title: `${i + 1}. ${b.title.substring(0, 24)}`,
		description: `✍️ ${(b.author || b.source).substring(0, 30)} | 🏛️ ${b.source}`,
		id: `${usedPrefix + command} ${i + 1}`
	}));

	const buttonSections = [
		{
			title: t(`Available Books (${merged.length} results)`, `قائمة الكتب المتوفرة (${merged.length} نتيجة)`, `ليستة ديال الكتوبة (${merged.length} نتيجة)`),
			rows: rows
		}
	];

	const buttons = [
		{
			name: 'single_select',
			buttonParamsJson: JSON.stringify({
				title: t('📖 Select Book to Download (PDF)', '📖 اختر كتاباً للتحميل (PDF)', '📖 اختار الكتاب للتحميل (PDF)'),
				sections: buttonSections
			})
		}
	];

	// Quick reply button for #1
	if (merged[0]) {
		buttons.push({
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: `📥 تحميل: 1. ${merged[0].title.substring(0, 16)}`,
				id: `${usedPrefix + command} 1`
			})
		});
	}

	// Channel & Instagram CTA buttons
	buttons.push({
		name: 'cta_url',
		buttonParamsJson: JSON.stringify({
			display_text: '📸 Instagram',
			url: 'https://www.instagram.com/hamza_amirni_01'
		})
	});

	const summaryText = t(
		`📚 *Book Search Results for "${arg}":*\n━━━━━━━━━━━━━━━━━━━━\n\n${formattedList}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *To Download as PDF:* Tap the *Select Book* button below, or reply with the number: *${usedPrefix + command} 1*`,
		`📚 *نتائج البحث عن: "${arg}":*\n━━━━━━━━━━━━━━━━━━━━\n\n${formattedList}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *للتحميل بصيغة PDF:* اضغط على زر *اختر كتاباً* بالأسفل، أو أرسل الرقم: *${usedPrefix + command} 1*`,
		`📚 *كتب لقيتها على: "${arg}":*\n━━━━━━━━━━━━━━━━━━━━\n\n${formattedList}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *باش التيليشارجيه PDF:* كليكي على البوطون ديال *اختار الكتاب* لتحت، ولا صيفط الرقم: *${usedPrefix + command} 1*`
	);

	await m.react('📚');

	try {
		return await conn.sendButton(
			m.chat,
			{
				text: summaryText,
				footer: `${global.namebot || 'Bot Hamza Amirni'} • @hamza_amirni_01`,
				buttons: buttons,
				messageParamsJson: JSON.stringify({
					bottom_sheet: {
						list_title: 'PDF Book Library',
						button_title: t('Select Book', 'اختر كتاباً', 'عزل الكتاب'),
					}
				})
			},
			{ quoted: m }
		);
	} catch (e) {
		console.error('[KITAB sendButton error]:', e.message);
		return m.reply(summaryText);
	}
};

handler.help = ['kitab <اسم الكتاب>', 'book <name>'];
handler.tags = ['downloader'];
handler.command = /^(kitab|ktab|book|books|pdfbook|كتاب|كتب|رواية|روايات|novel|kutub)$/i;

export default handler;
