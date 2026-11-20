// ============================================================
// PowerPoint (.pptx) Presentation Generator Plugin
// Developed for Bot Amirni Hamza by Hamza Amirni
// Commands: .ppt | .pptx | .powerpoint | .presentation | .عرض | .بوربوينت
// ============================================================

import fs from 'fs';
import { getSmartAIReply } from '../lib/gemini.js';

let PptxGenJS;
async function getPptxGen() {
	if (PptxGenJS) return PptxGenJS;
	try {
		const mod = await import('pptxgenjs');
		PptxGenJS = mod.default || mod;
		return PptxGenJS;
	} catch (e) {
		console.error('[PPT] Failed to load pptxgenjs:', e.message);
		return null;
	}
}

const isRtl = (str) => /[\u0600-\u06FF]/.test(String(str || ''));

/**
 * Generate structured slide data using AI
 */
async function generatePresentationData(topic, userLang = 'darija') {
	const systemPrompt = `You are a professional presentation designer and subject matter expert for "Bot Amirni Hamza".
Your task is to create a complete, well-structured, informative PowerPoint presentation outline about the topic provided by the user.

IMPORTANT RULES:
1. Return ONLY a valid, raw JSON object (NO markdown backticks, NO code blocks, NO preamble, NO extra commentary).
2. The language of the content MUST match the user's topic language (e.g. Arabic/Darija if requested in Arabic, English if requested in English, French if requested in French).
3. The JSON structure MUST be exactly:
{
  "title": "Short Main Presentation Title",
  "subtitle": "Informative Subtitle",
  "slides": [
    {
      "title": "Title of Slide",
      "points": [
        "First key point explaining the concept clearly",
        "Second key point with relevant data or insight",
        "Third key point highlighting practical details",
        "Fourth key point or takeaway"
      ]
    }
  ]
}
4. Provide between 6 to 8 slides total:
   - Slide 1: Introduction / Background (المقدمة والسياق)
   - Slide 2: Key Concepts / Framework (المفاهيم الأساسية)
   - Slide 3: Main Topic Deep-Dive (التحليل والتفاصيل)
   - Slide 4: Benefits & Opportunities (المزايا والفوائد)
   - Slide 5: Challenges & Solutions (التحديات والحلول)
   - Slide 6: Future Outlook / Trends (الآفاق المستقبلية)
   - Slide 7: Conclusion & Key Takeaways (الخلاصة والتوصيات)
5. Each point must be meaningful, complete, and professionally written.`;

	const rawResponse = await getSmartAIReply(`Topic: ${topic}`, systemPrompt);
	if (!rawResponse) throw new Error('AI service failed to respond.');

	// Extract JSON safely
	let cleanedJson = rawResponse.trim();
	if (cleanedJson.includes('```json')) {
		cleanedJson = cleanedJson.split('```json')[1].split('```')[0].trim();
	} else if (cleanedJson.includes('```')) {
		cleanedJson = cleanedJson.split('```')[1].split('```')[0].trim();
	}

	const firstBrace = cleanedJson.indexOf('{');
	const lastBrace = cleanedJson.lastIndexOf('}');
	if (firstBrace !== -1 && lastBrace !== -1) {
		cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
	}

	return JSON.parse(cleanedJson);
}

/**
 * Build professional .pptx presentation using PptxGenJS
 */
async function buildPptxBuffer(data) {
	const PptxClass = await getPptxGen();
	if (!PptxClass) throw new Error('pptxgenjs library is not available.');

	const pres = new PptxClass();
	pres.layout = 'LAYOUT_16x9'; // 16:9 widescreen format
	pres.author = 'Hamza Amirni';
	pres.company = 'Bot Amirni Hamza';
	pres.title = data.title || 'Presentation';

	const THEME = {
		bgDark: '0B132B',       // Deep tech navy
		cardDark: '1C2541',     // Slate card
		primaryGold: 'F59E0B',  // Metallic gold
		accentCyan: '06B6D4',   // Electric cyan
		textWhite: 'FFFFFF',    // Crisp white
		textMuted: '94A3B8',    // Soft slate
		borderCyan: '1E293B'
	};

	// ─── SLIDE 1: COVER SLIDE ──────────────────────────────
	const slideCover = pres.addSlide();
	slideCover.background = { color: THEME.bgDark };

	// Decorative Top Accent Bar
	slideCover.addShape(pres.ShapeType.rect, {
		x: 0, y: 0, w: '100%', h: 0.15,
		fill: { color: THEME.primaryGold }
	});

	// Embed Bot Logo Avatar on Cover
	let hasLogo = false;
	try {
		if (fs.existsSync('media/thumbnail.jpg')) {
			slideCover.addImage({
				path: 'media/thumbnail.jpg',
				x: 5.75, y: 0.5, w: 1.8, h: 1.8,
				rounding: true
			});
			hasLogo = true;
		}
	} catch (_) {}

	const coverTitleRtl = isRtl(data.title);
	const titleY = hasLogo ? 2.5 : 2.1;
	const subtitleY = hasLogo ? 3.9 : 3.7;

	// Presentation Title
	slideCover.addText(data.title || 'عرض تقديمي', {
		x: 0.8, y: titleY, w: 11.7, h: 1.3,
		fontSize: 36,
		fontFace: 'Arial',
		bold: true,
		color: THEME.primaryGold,
		align: 'center',
		valign: 'middle',
		rtl: coverTitleRtl
	});

	// Subtitle
	if (data.subtitle) {
		slideCover.addText(data.subtitle, {
			x: 1.0, y: subtitleY, w: 11.3, h: 0.9,
			fontSize: 19,
			fontFace: 'Arial',
			color: THEME.accentCyan,
			align: 'center',
			valign: 'middle',
			rtl: isRtl(data.subtitle)
		});
	}

	// Footer Badge
	slideCover.addText('⚡ صُمم بواسطة: Bot Amirni Hamza • حمزة اعمرني', {
		x: 1.0, y: 6.3, w: 11.3, h: 0.5,
		fontSize: 13,
		fontFace: 'Arial',
		color: THEME.textMuted,
		align: 'center'
	});

	// ─── SLIDES 2+: CONTENT SLIDES ─────────────────────────
	const slides = Array.isArray(data.slides) ? data.slides : [];
	slides.forEach((s, idx) => {
		const slide = pres.addSlide();
		slide.background = { color: THEME.bgDark };

		const rtl = isRtl(s.title || (s.points && s.points[0]));

		// Top Header Banner
		slide.addShape(pres.ShapeType.rect, {
			x: 0.8, y: 0.45, w: 11.7, h: 0.95,
			fill: { color: THEME.cardDark },
			line: { color: THEME.accentCyan, width: 1.5 }
		});

		// Slide Number Badge
		slide.addText(`${idx + 1}`, {
			x: rtl ? 11.6 : 1.0, y: 0.55, w: 0.7, h: 0.7,
			fontSize: 16,
			fontFace: 'Arial',
			bold: true,
			color: THEME.primaryGold,
			align: 'center'
		});

		// Slide Title
		slide.addText(s.title || (rtl ? `الشريحة ${idx + 1}` : `Slide ${idx + 1}`), {
			x: rtl ? 1.0 : 1.8, y: 0.48, w: 10.4, h: 0.85,
			fontSize: 22,
			fontFace: 'Arial',
			bold: true,
			color: THEME.textWhite,
			align: rtl ? 'right' : 'left',
			valign: 'middle',
			rtl: rtl
		});

		// Content Card Box
		slide.addShape(pres.ShapeType.roundRect, {
			x: 0.8, y: 1.6, w: 11.7, h: 4.9,
			fill: { color: THEME.cardDark },
			line: { color: THEME.borderCyan, width: 1 },
			rectRadius: 0.15
		});

		// Bullet Points
		const points = Array.isArray(s.points) ? s.points : [];
		const bulletItems = points.map((p) => {
			const pointRtl = isRtl(p);
			return {
				text: p,
				options: {
					bullet: { type: 'bullet', color: THEME.primaryGold },
					fontSize: 16,
					fontFace: 'Arial',
					color: THEME.textWhite,
					spacing: { after: 14 },
					lineSpacing: 24,
					rtl: pointRtl
				}
			};
		});

		if (bulletItems.length > 0) {
			slide.addText(bulletItems, {
				x: 1.2, y: 1.85, w: 10.9, h: 4.4,
				valign: 'top',
				align: rtl ? 'right' : 'left',
				rtl: rtl
			});
		}

		// Footer branding
		slide.addText(`Bot Amirni Hamza  |  ${idx + 1} / ${slides.length}`, {
			x: 0.8, y: 6.7, w: 11.7, h: 0.4,
			fontSize: 10,
			fontFace: 'Arial',
			color: THEME.textMuted,
			align: rtl ? 'left' : 'right'
		});
	});

	// Output Buffer
	return await pres.write({ outputType: 'nodebuffer' });
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!text || text.trim().length < 2) {
		return m.reply(t(
			`📊 *AI PowerPoint Presentation Generator*\n━━━━━━━━━━━━━━━━━━━━\nCreate complete, professional PowerPoint (.pptx) presentations instantly using AI!\n\n*Usage:*\n← ${usedPrefix + command} <topic>\n\n*Examples:*\n← ${usedPrefix + command} Artificial Intelligence in Medicine\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته في التعليم\n← ${usedPrefix + command} الطاقة المتجددة في المغرب`,
			`📊 *صانع عروض البوربوينت بالذكاء الاصطناعي*\n━━━━━━━━━━━━━━━━━━━━\nأنشئ عروض تقديمية احترافية بصيغة PowerPoint (.pptx) فورياً وبأعلى جودة!\n\n*الاستخدام:*\n← ${usedPrefix + command} <الموضوع>\n\n*أمثلة:*\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته في التعليم\n← ${usedPrefix + command} الطاقة المتجددة وتحديات المستقبل\n← ${usedPrefix + command} أهمية الأمن السيبراني للشركات`,
			`📊 *صانع عروض البوربوينت (PowerPoint)*\n━━━━━━━━━━━━━━━━━━━━\nقاد بريزونطاسيون كاملة واحترافية بصيغة (.pptx) فـ ثواني بالذكاء الاصطناعي!\n\n*طريقة الاستعمال:*\n← ${usedPrefix + command} <الموضوع>\n\n*أمثلة:*\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته\n← ${usedPrefix + command} التجارة الإلكترونية فالمغرب\n← ${usedPrefix + command} Cybersecurity & Cloud Computing`
		));
	}

	await m.react('⏳');
	const waitMsg = await conn.sendMessage(m.chat, {
		text: t(
			`⏳ *Creating your PowerPoint presentation...*\nStructuring content and designing professional slides about: *${text.trim()}*`,
			`⏳ *جاري تصميم عرض البوربوينت الخاص بك...*\nنقوم الآن بإنشاء المحتوى وتنسيق الشرائح باحترافية حول: *${text.trim()}*`,
			`⏳ *كنقاد ليك بريزونطاسيون دابا...*\nجاري توليد الأفكار وتصميم شرائح احترافية حول: *${text.trim()}*`
		)
	}, { quoted: m });

	try {
		// 1. Generate content outline via AI
		const presentationData = await generatePresentationData(text.trim(), userLang);

		// 2. Build .pptx presentation file
		const pptxBuffer = await buildPptxBuffer(presentationData);

		const safeTitle = (presentationData.title || text.trim())
			.replace(/[/\\?%*:|"<>]/g, '_')
			.substring(0, 50);
		const fileName = `${safeTitle}.pptx`;
		const slideCount = (presentationData.slides || []).length;

		await m.react('📊');
		await conn.sendMessage(m.chat, {
			document: pptxBuffer,
			mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			fileName,
			caption: t(
				`📊 *Your PowerPoint Presentation is Ready!*\n━━━━━━━━━━━━━━━━━━━━\n📌 *Topic:* ${presentationData.title}\n📑 *Slides:* ${slideCount + 1} slides\n⚡ *Created by:* Bot Amirni Hamza\n━━━━━━━━━━━━━━━━━━━━\n_Open directly in Microsoft PowerPoint, Google Slides, or WPS Office._`,
				`📊 *عرض البوربوينت الخاص بك جاهز!*\n━━━━━━━━━━━━━━━━━━━━\n📌 *الموضوع:* ${presentationData.title}\n📑 *عدد الشرائح:* ${slideCount + 1} شريحة\n⚡ *تم التصميم بواسطة:* بوت حمزة اعمرني (Bot Amirni Hamza)\n━━━━━━━━━━━━━━━━━━━━\n_يمكنك فتح الملف مباشرة في Microsoft PowerPoint أو Google Slides أو WPS Office._`,
				`📊 *البريزونطاسيون ديالك واجدة!*\n━━━━━━━━━━━━━━━━━━━━\n📌 *الموضوع:* ${presentationData.title}\n📑 *عدد الشرائح:* ${slideCount + 1} سلايدات\n⚡ *صممها:* Bot Amirni Hamza • حمزة اعمرني\n━━━━━━━━━━━━━━━━━━━━\n_تقدر تحلها ديريكت فـ PowerPoint أو Google Slides أو التيليفون._`
			)
		}, { quoted: m });

	} catch (err) {
		console.error('[PPT Plugin Error]:', err);
		await m.react('❌');
		return m.reply(t(
			`❌ Failed to generate presentation: ${err.message}`,
			`❌ فشل إنشاء العرض التقديمي: ${err.message}`,
			`❌ وقع خطأ أثناء إنشاء العرض: ${err.message}`
		));
	}
};

handler.help = ['ppt <topic>', 'pptx <topic>', 'powerpoint <topic>', 'presentation <topic>'];
handler.tags = ['ai', 'tools'];
handler.command = /^(ppt|pptx|powerpoint|presentation|عرض|بوربوينت)$/i;

export default handler;
