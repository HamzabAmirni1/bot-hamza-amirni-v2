// ============================================================
// PowerPoint (.pptx) Presentation Generator Plugin
// Developed for Bot Amirni Hamza by Hamza Amirni
// Commands: .ppt | .pptx | .pp | .powerpoint | .presentation | .عرض | .بوربوينت
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
 * Intelligent parser that extracts or constructs slides from any AI response (JSON or plain text)
 */
function parseSlidesFromAnyText(raw, topic) {
	if (!raw) raw = '';

	// 1. Try pure JSON extraction
	const firstBrace = raw.indexOf('{');
	const lastBrace = raw.lastIndexOf('}');
	if (firstBrace !== -1 && lastBrace > firstBrace) {
		try {
			const parsed = JSON.parse(raw.substring(firstBrace, lastBrace + 1));
			if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
				return {
					title: parsed.title || topic,
					subtitle: parsed.subtitle || (isRtl(topic) ? 'عرض تقديمي شامل ومفصل' : 'Comprehensive Presentation'),
					slides: parsed.slides.slice(0, 10)
				};
			}
		} catch (_) {}
	}

	// 2. Parse Markdown headings or bullet points
	const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
	const slides = [];
	let currentSlide = null;

	for (const line of lines) {
		if (/^(أهلاً|مرحباً|أهلا|بالتأكيد|إليك|السلام|hello|sure|here is|welcome)/i.test(line) && line.length < 80) {
			continue;
		}

		const isHeading = /^(\#{1,4}|[0-9]+[\.\-\)]|[•\-\*]\s*عنوان|\*\*)/.test(line) || (line.endsWith(':') && line.length < 60);
		if (isHeading && line.length < 80) {
			if (currentSlide && currentSlide.points.length > 0) {
				slides.push(currentSlide);
			}
			const cleanTitle = line.replace(/^[\#\*\d\.\-\)\:\s]+/, '').replace(/[\*\:]+$/g, '').trim();
			currentSlide = { title: cleanTitle || ('شريحة ' + (slides.length + 1)), points: [] };
		} else if (currentSlide) {
			const cleanPoint = line.replace(/^[•\-\*\d\.\)\s]+/, '').trim();
			if (cleanPoint.length > 3) currentSlide.points.push(cleanPoint);
		} else {
			const clean = line.replace(/^[•\-\*\d\.\)\s]+/, '').trim();
			if (clean.length > 10) {
				currentSlide = { title: topic || 'المقدمة', points: [clean] };
			}
		}
	}
	if (currentSlide && currentSlide.points.length > 0) slides.push(currentSlide);

	// 3. Fallback: Generate comprehensive professional slides if AI output is sparse
	if (slides.length < 3) {
		const rtl = isRtl(topic);
		if (rtl) {
			return {
				title: topic,
				subtitle: 'عرض تقديمي شامل ومفصل • Bot Amirni Hamza',
				slides: [
					{
						title: 'المقدمة والأهداف الرئيسية',
						points: [
							`نظرة عامة وشاملة حول ${topic}`,
							'أهمية الموضوع وأهدافه المحورية في حياتنا ومجتمعنا',
							'المحاور والمفاهيم الأساسية التي سنتناولها في هذا العرض'
						]
					},
					{
						title: 'المفاهيم والأسس الجوهرية',
						points: [
							`التعريف العلمي والدقيق لمفهوم ${topic}`,
							'المبادئ الأساسية والقيم المرتبطة بالموضوع',
							'التأثير المباشر والعميق على الفرد والمجتمع'
						]
					},
					{
						title: 'التحليل والتطبيق العملي',
						points: [
							'تحليل معمق للجوانب الإيجابية والتطبيقات الواقعية',
							'نماذج ملهمة وتجارب عملية أثبتت نجاحها',
							'خطوات عملية لتطبيق هذه المبادئ في الحياة اليومية'
						]
					},
					{
						title: 'الفوائد والنتائج المستدامة',
						points: [
							'تحقيق التوازن النفسي والارتقاء بجودة الحياة',
							'تعزيز العلاقات الإنسانية وبناء بيئة إيجابية ومحفزة',
							'الأثر طويل الأمد على النجاح الشخصي والمهني'
						]
					},
					{
						title: 'التحديات وسبل التغلب عليها',
						points: [
							'أبرز الصعوبات والمعوقات المحتملة التي قد تواجهنا',
							'الحلول المبتكرة والاستراتيجيات الفعالة لتجاوزها',
							'أهمية الاستمرارية والتطوير الذاتي المستمر'
						]
					},
					{
						title: 'الخاتمة والتوصيات العملية',
						points: [
							'ملخص شامل لأهم النقاط والدروس المستفادة',
							'خارطة طريق وتوصيات ختامية قابلة للتنفيذ الفوري',
							'شكر وتقدير لمتابعتكم هذا العرض التقديمي'
						]
					}
				]
			};
		} else {
			return {
				title: topic,
				subtitle: 'Comprehensive Presentation • Bot Amirni Hamza',
				slides: [
					{
						title: 'Introduction & Objectives',
						points: [
							`Comprehensive overview of ${topic}`,
							'Core significance and impact in modern context',
							'Key milestones and agenda of this presentation'
						]
					},
					{
						title: 'Key Concepts & Framework',
						points: [
							`Fundamental definitions and principles of ${topic}`,
							'Key theoretical and practical pillars',
							'Industry standards and best practices'
						]
					},
					{
						title: 'Deep-Dive & Practical Analysis',
						points: [
							'In-depth examination of core operational mechanisms',
							'Real-world case studies and notable examples',
							'Actionable insights for direct implementation'
						]
					},
					{
						title: 'Benefits & Strategic Value',
						points: [
							'Measurable improvements in efficiency and quality',
							'Strategic advantages and sustainable long-term value',
							'Positive impact on key performance indicators'
						]
					},
					{
						title: 'Challenges & Solutions',
						points: [
							'Common pitfalls and potential barriers to success',
							'Proven risk mitigation techniques and strategies',
							'Continuous improvement and adaptation framework'
						]
					},
					{
						title: 'Conclusion & Key Takeaways',
						points: [
							'Summary of essential lessons and core takeaways',
							'Recommended next steps and future roadmap',
							'Thank you for viewing this presentation'
						]
					}
				]
			};
		}
	}

	return {
		title: topic,
		subtitle: isRtl(topic) ? 'عرض تقديمي بواسطة Bot Amirni Hamza' : 'Presented by Bot Amirni Hamza',
		slides: slides.slice(0, 8)
	};
}

/**
 * Generate structured slide data using AI
 */
async function generatePresentationData(topic, userLang = 'darija') {
	const systemPrompt = `You are a professional presentation designer for "Bot Amirni Hamza".
Create a complete, high-quality PowerPoint presentation outline about: "${topic}".
Format your response ONLY as valid raw JSON (no greetings, no code block backticks):
{
  "title": "Presentation Title",
  "subtitle": "Subtitle",
  "slides": [
    {
      "title": "Slide Title",
      "points": ["Point 1", "Point 2", "Point 3", "Point 4"]
    }
  ]
}
Include 6 to 8 slides in the language of the topic (Arabic for Arabic topics, English for English).`;

	const userPrompt = `Topic: "${topic}".
Output ONLY the raw JSON object for the slides.`;

	let rawResponse = '';
	try {
		rawResponse = await getSmartAIReply(userPrompt, { systemPrompt });
	} catch (e) {
		console.warn('[PPT] AI fetch failed, using smart slide builder:', e.message);
	}

	return parseSlidesFromAnyText(rawResponse, topic);
}

/**
 * Build professional .pptx presentation using PptxGenJS
 */
async function buildPptxBuffer(data) {
	const PptxClass = await getPptxGen();
	if (!PptxClass) throw new Error('pptxgenjs library is not available.');

	const isPresentationRtl = isRtl(data.title || (data.slides && data.slides[0]?.title));

	const pres = new PptxClass();
	pres.layout = 'LAYOUT_16x9'; // 16:9 widescreen format (13.33 x 7.5 in)
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

	const titleY = hasLogo ? 2.5 : 2.1;
	const subtitleY = hasLogo ? 4.0 : 3.7;

	// Presentation Title
	slideCover.addText(data.title || 'عرض تقديمي', {
		x: 0.8, y: titleY, w: 11.7, h: 1.4,
		fontSize: 36,
		fontFace: 'Arial',
		bold: true,
		color: THEME.primaryGold,
		align: 'center',
		valign: 'middle'
	});

	// Subtitle
	if (data.subtitle) {
		slideCover.addText(data.subtitle, {
			x: 1.0, y: subtitleY, w: 11.3, h: 0.9,
			fontSize: 19,
			fontFace: 'Arial',
			color: THEME.accentCyan,
			align: 'center',
			valign: 'middle'
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

		// Slide Title & Number - Centered so it NEVER gets cut off on left or right!
		const rawTitle = String(s.title || (rtl ? `الشريحة ${idx + 1}` : `Slide ${idx + 1}`)).trim();
		const displayTitle = /^(\d+|شريحة|slide)/i.test(rawTitle)
			? rawTitle
			: `${idx + 1}. ${rawTitle}`;

		slide.addText(displayTitle, {
			x: 1.0, y: 0.48, w: 11.3, h: 0.9,
			fontSize: 21,
			fontFace: 'Arial',
			bold: true,
			color: THEME.primaryGold,
			align: 'center',
			valign: 'middle'
		});

		// Content Card Box
		slide.addShape(pres.ShapeType.roundRect, {
			x: 0.8, y: 1.6, w: 11.7, h: 4.9,
			fill: { color: THEME.cardDark },
			line: { color: THEME.borderCyan, width: 1 },
			rectRadius: 0.15
		});

		// Bullet Points using clean literal bullets & paragraphs (avoids PPTX indent bug on mobile)
		const points = Array.isArray(s.points) ? s.points : [];
		const bulletRuns = points.map((p) => {
			const cleanText = String(p || '').replace(/^[•\-\*\d\.\)\s]+/, '').trim();
			return {
				text: '•  ' + cleanText,
				options: {
					breakLine: true,
					fontSize: 15,
					fontFace: 'Arial',
					color: THEME.textWhite,
					spacing: { after: 16 },
					lineSpacing: 24
				}
			};
		});

		if (bulletRuns.length > 0) {
			// Position text with 0.4 in safety padding on both left and right (x: 1.2, w: 10.9 inside w: 11.7)
			slide.addText(bulletRuns, {
				x: 1.2, y: 1.85, w: 10.9, h: 4.5,
				valign: 'top',
				align: rtl ? 'right' : 'left'
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
	await conn.sendMessage(m.chat, {
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

handler.help = ['ppt <topic>', 'pptx <topic>', 'pp <topic>', 'powerpoint <topic>', 'presentation <topic>'];
handler.tags = ['ai', 'tools'];
handler.command = /^(ppt|pptx|pp|powerpoint|presentation|عرض|بوربوينت)$/i;

export default handler;
