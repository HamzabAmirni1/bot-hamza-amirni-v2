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
const isFrenchTopic = (str) => /[àâäéèêëîïôöùûüçœ]/i.test(String(str || '')) ||
	/(présentation|sujet|projet|cours|gestion|management|analyse|rapport|travail|devoir|exposé|société|santé|technologie|avenir|monde)/i.test(String(str || ''));

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
					subtitle: parsed.subtitle || (isRtl(topic) ? 'عرض تقديمي شامل ومفصل' : isFrenchTopic(topic) ? 'Présentation Complète et Professionnelle' : 'Comprehensive Presentation'),
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
		if (/^(أهلاً|مرحباً|أهلا|بالتأكيد|إليك|السلام|hello|sure|here is|welcome|bonjour|voici)/i.test(line) && line.length < 80) {
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

	// 3. Fallback: High-Standard Professional Structure (Academic & Executive Standard)
	if (slides.length < 3) {
		const rtl = isRtl(topic);
		const fr = isFrenchTopic(topic);

		if (rtl) {
			return {
				title: topic,
				subtitle: 'عرض تقديمي شامل واحترافي • Bot Amirni Hamza',
				slides: [
					{
						title: 'المقدمة العامة وسياق الموضوع',
						points: [
							`نظرة عامة وشاملة تمهد لأبعاد ومفاهيم ${topic}`,
							'أهمية الموضوع وحيويته في الواقع المعاصر والمستقبل',
							'الإشكالية المحورية ومحاور العرض الأساسية'
						]
					},
					{
						title: 'أهداف العرض التقديمي',
						points: [
							'تحديد المفاهيم الأساسية والأبعاد الجوهرية للموضوع',
							'تحليل آليات التطبيق وأحدث الممارسات المتبعة علمياً',
							'تقديم حلول عملية وتوصيات استراتيجية قابلة للتنفيذ'
						]
					},
					{
						title: 'المفاهيم والأسس الجوهرية',
						points: [
							`التعريف العلمي والدقيق لمفهوم ${topic}`,
							'المبادئ الأساسية والقيم الحاكمة المرتبطة بالموضوع',
							'التأثير المباشر والأبعاد الهيكلية على الفرد والمجتمع'
						]
					},
					{
						title: 'التحليل المعمق والأمثلة العملية',
						points: [
							'دراسة تحليلية ونماذج واقعية ناجحة أثبتت فعاليتها',
							'تجارب ملهمة وأفضل الممارسات التطبيقية في المجال',
							'خطوات إجرائية لتطبيق هذه المبادئ في بيئة العمل والحياة'
						]
					},
					{
						title: 'المزايا والتحديات وسبل التجاوز',
						points: [
							'المنافع الاستراتيجية والقيمة المضافة المستدامة',
							'أبرز الصعوبات والمعوقات المحتملة وكيفية احتوائها',
							'حلول مبتكرة واستراتيجيات ذكية للتغلب على التحديات'
						]
					},
					{
						title: 'التركيب وحصيلة الأفكار الرئيسية',
						points: [
							'ملخص مكثف لأهم الدروس المستفادة والركائز الجوهرية',
							'حصيلة نهائية متكاملة تربط بين النظرية والتطبيق',
							'خارطة طريق واضحة للتطوير المستمر والارتقاء'
						]
					},
					{
						title: 'الخاتمة والتوصيات والختام',
						points: [
							'خلاصة جامعة ورسالة ختامية ترسم آفاق النجاح المستمر',
							'توصيات ختامية للتنفيذ المباشر والتقييم الدوري',
							'شكراً جزيلاً لحسن متابعتكم وانتباهكم الكريم'
						]
					}
				]
			};
		} else if (fr) {
			return {
				title: topic,
				subtitle: 'Présentation Complète & Professionnelle • Bot Amirni Hamza',
				slides: [
					{
						title: 'Introduction Générale & Contexte',
						points: [
							`Vue d'ensemble et mise en contexte globale de : ${topic}`,
							'Importance majeure et pertinence du sujet dans le monde contemporain',
							'Problématique centrale et cadre général de réflexion'
						]
					},
					{
						title: 'Objectifs de la Présentation',
						points: [
							'Comprendre les notions fondamentales et les enjeux stratégiques',
							'Analyser les mécanismes opérationnels et les facteurs clés de succès',
							'Identifier des solutions pratiques et des perspectives d\'avenir durables'
						]
					},
					{
						title: 'Fondements & Concepts Clés',
						points: [
							`Définition rigoureuse et éléments constitutifs de : ${topic}`,
							'Les piliers méthodologiques et le cadre théorique de référence',
							'Règles d\'or, principes directeurs et normes d\'excellence'
						]
					},
					{
						title: 'Développement & Exemples Concrets',
						points: [
							'Étude approfondie des cas d\'usage réels et applications pratiques',
							'Retours d\'expérience, illustrations chiffrées et modèles inspirants',
							'Méthodes concrètes de mise en œuvre et d\'exécution sur le terrain'
						]
					},
					{
						title: 'Avantages, Défis & Solutions',
						points: [
							'Bénéfices tangibles, opportunités stratégiques et valeur ajoutée',
							'Obstacles fréquents et risques potentiels à anticiper avec rigueur',
							'Solutions innovantes et stratégies de dépassement éprouvées'
						]
					},
					{
						title: 'Synthèse des Idées & Bilan',
						points: [
							'Récapitulatif des enseignements majeurs et points d\'ancrage',
							'Bilan stratégique global et feuille de route opérationnelle',
							'Recommandations pragmatiques pour une mise en action immédiate'
						]
					},
					{
						title: 'Conclusion & Remerciements',
						points: [
							'Conclusion générale et ouverture vers de nouvelles perspectives',
							'Message clé final inspirant et vision prospective',
							'Merci chaleureusement pour votre attention et vos échanges'
						]
					}
				]
			};
		} else {
			return {
				title: topic,
				subtitle: 'Comprehensive & Executive Presentation • Bot Amirni Hamza',
				slides: [
					{
						title: 'General Introduction & Background',
						points: [
							`Comprehensive overview and strategic context of ${topic}`,
							'Core relevance, market impact, and significance today',
							'Fundamental problem statement and central roadmap'
						]
					},
					{
						title: 'Presentation Objectives',
						points: [
							'Understand essential definitions, pillars, and overarching goals',
							'Analyze key operational mechanisms and proven benchmarks',
							'Deliver actionable recommendations and future-ready strategies'
						]
					},
					{
						title: 'Core Principles & Framework',
						points: [
							`Formal definitions and theoretical foundation of ${topic}`,
							'Key methodologies, architecture, and regulatory considerations',
							'Best-in-class standards and foundational prerequisites'
						]
					},
					{
						title: 'Deep-Dive & Practical Case Studies',
						points: [
							'Detailed examination of real-world implementation models',
							'Proven success stories, benchmarks, and tactical takeaways',
							'Step-by-step roadmap for immediate execution'
						]
					},
					{
						title: 'Strategic Benefits & Risk Mitigation',
						points: [
							'Measurable performance improvements and sustainable ROI',
							'Critical bottlenecks, pitfalls, and risk management',
							'Innovative countermeasures and continuous improvement'
						]
					},
					{
						title: 'Key Synthesis & Strategic Review',
						points: [
							'Consolidated review of core insights and essential lessons',
							'Integrated assessment bridging theory with execution',
							'Actionable next steps and performance milestones'
						]
					},
					{
						title: 'Conclusion & Thank You',
						points: [
							'Final concluding remarks and visionary outlook',
							'Strategic call to action for stakeholders and teams',
							'Thank you very much for your attention and time'
						]
					}
				]
			};
		}
	}

	return {
		title: topic,
		subtitle: isRtl(topic) ? 'عرض تقديمي بواسطة Bot Amirni Hamza' : 'Présentation par Bot Amirni Hamza',
		slides: slides.slice(0, 8)
	};
}

/**
 * Generate structured slide data using AI following professional expert standards
 */
async function generatePresentationData(topic, userLang = 'darija') {
	const systemPrompt = `Tu es un expert mondial en conception de présentations PowerPoint professionnelles, en communication visuelle et en design moderne pour "Bot Amirni Hamza".
Ton rôle est de créer une présentation complète, moderne, élégante et professionnelle sur le sujet demandé par l'utilisateur.

RÈGLES IMPÉRATIVES DE STRUCTURE ET DE CONTENU:
1. LANGUE : Le contenu doit être OBLIGATOIREMENT dans la langue du sujet (Arabe si le sujet est en arabe/darija, Français si le sujet est en français, Anglais si le sujet est en anglais).
2. STRUCTURE DE LA PRÉSENTATION (6 à 8 diapositives complètes) :
   - Diapositive 1 : Page de couverture (Titre accrocheur et sous-titre élégant).
   - Diapositive 2 : Introduction générale et présentation du contexte du sujet.
   - Diapositive 3 : Objectifs clés de la présentation.
   - Diapositives 4 à 6 : Développement organisé en plusieurs parties avec des explications claires, des exemples concrets et des informations pertinentes.
   - Avant-dernière diapositive : Synthèse des idées principales et bilan stratégique.
   - Dernière diapositive : Conclusion professionnelle et remerciements ("Merci pour votre attention" / "شكراً لحسن متابعتكم").
3. QUALITÉ DU CONTENU :
   - Utiliser un langage soigné, professionnel et accessible.
   - 3 à 4 points essentiels par diapositive, concis, bien rédigés et percutants.
   - Titres de diapositives courts et explicites (moins de 7 mots).
   - Des exemples concrets et des explications pertinentes pour chaque concept.
4. FORMAT DE SORTIE STRICT :
Retourne UNIQUEMENT un objet JSON brut valide (SANS backticks markdown, SANS \`\`\`json, SANS texte introductif) avec la structure exacte suivante :
{
  "title": "Titre principal accrocheur",
  "subtitle": "Sous-titre élégant et informatif",
  "slides": [
    {
      "title": "Titre explicite de la diapositive",
      "points": [
        "Premier point clé essentiel et bien formulé",
        "Deuxième point avec analyse ou exemple concret",
        "Troisième point d'impact ou recommandation"
      ]
    }
  ]
}`;

	const userPrompt = `Sujet de la présentation : "${topic}".
Retourne UNIQUEMENT l'objet JSON contenant les diapositives.`;

	let rawResponse = '';
	try {
		rawResponse = await getSmartAIReply(userPrompt, { systemPrompt });
	} catch (e) {
		console.warn('[PPT] AI fetch failed, using smart slide builder:', e.message);
	}

	return parseSlidesFromAnyText(rawResponse, topic);
}

/**
 * Build professional .pptx presentation using PptxGenJS (True 16:9 LAYOUT_WIDE)
 */
async function buildPptxBuffer(data) {
	const PptxClass = await getPptxGen();
	if (!PptxClass) throw new Error('pptxgenjs library is not available.');

	const pres = new PptxClass();
	// LAYOUT_WIDE is 13.33 x 7.5 inches (the true standard 16:9 widescreen)
	pres.layout = 'LAYOUT_WIDE';
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

	const rtl = isRtl(data.title);
	const fr = isFrenchTopic(data.title);

	// Date formatting
	const now = new Date();
	const dateStr = now.toLocaleDateString(rtl ? 'ar-MA' : fr ? 'fr-FR' : 'en-US', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	// ─── DIAPOSITIVE 1: PAGE DE COUVERTURE ──────────────────────────────
	const slideCover = pres.addSlide();
	slideCover.background = { color: THEME.bgDark };

	// Decorative Top Accent Bar
	slideCover.addShape(pres.ShapeType.rect, {
		x: 0, y: 0, w: '100%', h: 0.15,
		fill: { color: THEME.primaryGold }
	});

	// Embed Bot Logo Avatar (centered at x = 5.76)
	let hasLogo = false;
	try {
		if (fs.existsSync('media/thumbnail.jpg')) {
			slideCover.addImage({
				path: 'media/thumbnail.jpg',
				x: 5.76, y: 0.55, w: 1.8, h: 1.8,
				rounding: true
			});
			hasLogo = true;
		}
	} catch (_) {}

	const titleY = hasLogo ? 2.5 : 2.1;
	const subtitleY = hasLogo ? 4.0 : 3.6;

	// Presentation Title - Centered with balanced margins
	slideCover.addText(data.title || 'Présentation', {
		x: 0.9, y: titleY, w: 11.5, h: 1.4,
		fontSize: 36,
		fontFace: 'Arial',
		bold: true,
		color: THEME.primaryGold,
		align: 'center',
		valign: 'middle'
	});

	// Subtitle - Centered
	if (data.subtitle) {
		slideCover.addText(data.subtitle, {
			x: 1.0, y: subtitleY, w: 11.3, h: 0.9,
			fontSize: 20,
			fontFace: 'Arial',
			color: THEME.accentCyan,
			align: 'center',
			valign: 'middle'
		});
	}

	// Presenter & Date Info Badge
	const presenterLine = rtl
		? `👤 إعداد وتقديم: حمزة اعمرني (Hamza Amirni)   •   📅 ${dateStr}`
		: fr
		? `👤 Présenté par : Hamza Amirni   •   📅 ${dateStr}`
		: `👤 Presented by: Hamza Amirni   •   📅 ${dateStr}`;

	slideCover.addText(presenterLine, {
		x: 1.0, y: 5.4, w: 11.3, h: 0.5,
		fontSize: 14,
		fontFace: 'Arial',
		bold: true,
		color: THEME.primaryGold,
		align: 'center'
	});

	// Footer Badge
	slideCover.addText('⚡ Bot Amirni Hamza • Professional Presentation Engine', {
		x: 1.0, y: 6.4, w: 11.3, h: 0.5,
		fontSize: 12,
		fontFace: 'Arial',
		color: THEME.textMuted,
		align: 'center'
	});

	// ─── DIAPOSITIVES 2+: CONTENU STRUCTURÉ ─────────────────────────
	const slides = Array.isArray(data.slides) ? data.slides : [];
	slides.forEach((s, idx) => {
		const slide = pres.addSlide();
		slide.background = { color: THEME.bgDark };

		// Top Header Banner (Centered with balanced 0.9 in margins)
		slide.addShape(pres.ShapeType.rect, {
			x: 0.9, y: 0.5, w: 11.5, h: 0.95,
			fill: { color: THEME.cardDark },
			line: { color: THEME.accentCyan, width: 1.5 }
		});

		// Slide Title & Number - Centered and explicit
		const rawTitle = String(s.title || (rtl ? `الشريحة ${idx + 1}` : fr ? `Diapositive ${idx + 1}` : `Slide ${idx + 1}`)).trim();
		const displayTitle = /^(\d+|شريحة|slide|diapositive)/i.test(rawTitle)
			? rawTitle
			: `${idx + 1}. ${rawTitle}`;

		slide.addText(displayTitle, {
			x: 1.0, y: 0.5, w: 11.3, h: 0.95,
			fontSize: 21,
			fontFace: 'Arial',
			bold: true,
			color: THEME.primaryGold,
			align: 'center',
			valign: 'middle'
		});

		// Render Content Points as Modern Glass Card Rows
		const points = (Array.isArray(s.points) ? s.points : []).slice(0, 6);
		const count = Math.min(Math.max(points.length, 1), 6);
		const startY = 1.65;
		const totalAvailH = 4.95;
		const gap = count <= 3 ? 0.3 : count === 4 ? 0.2 : 0.14;
		const cardH = (totalAvailH - (count - 1) * gap) / count;

		points.forEach((p, i) => {
			const y = startY + i * (cardH + gap);

			// Card Row Background Box (Balanced x = 0.9, w = 11.5 inside 13.33 in canvas)
			slide.addShape(pres.ShapeType.roundRect, {
				x: 0.9, y: y, w: 11.5, h: cardH,
				fill: { color: THEME.cardDark },
				line: { color: THEME.accentCyan, width: 1 },
				rectRadius: 0.12
			});

			// Number Pill Badge (Left-side golden pill)
			const badgeSize = Math.min(cardH * 0.65, 0.65);
			const badgeY = y + (cardH - badgeSize) / 2;
			slide.addShape(pres.ShapeType.roundRect, {
				x: 1.15, y: badgeY, w: badgeSize, h: badgeSize,
				fill: { color: THEME.primaryGold },
				rectRadius: 0.1
			});
			slide.addText(String(i + 1), {
				x: 1.15, y: badgeY, w: badgeSize, h: badgeSize,
				fontSize: count > 4 ? 12 : 14,
				fontFace: 'Arial',
				bold: true,
				color: '0B132B',
				align: 'center',
				valign: 'middle'
			});

			// Point Text - Centered with safe margins (never clips on left or right)
			const cleanText = String(p || '').replace(/^[•\-\*\d\.\)\s]+/, '').trim();
			slide.addText(cleanText, {
				x: 1.95, y: y, w: 10.2, h: cardH,
				fontSize: count > 4 ? 14 : 16,
				fontFace: 'Arial',
				color: THEME.textWhite,
				align: 'center',
				valign: 'middle'
			});
		});

		// Footer branding
		slide.addText(`Bot Amirni Hamza  |  ${idx + 1} / ${slides.length}`, {
			x: 0.9, y: 6.85, w: 11.5, h: 0.4,
			fontSize: 10,
			fontFace: 'Arial',
			color: THEME.textMuted,
			align: 'center'
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
			`📊 *AI PowerPoint Presentation Generator*\n━━━━━━━━━━━━━━━━━━━━\nCreate complete, professional PowerPoint (.pptx) presentations instantly using AI!\n\n*Usage:*\n← ${usedPrefix + command} <topic>\n\n*Examples:*\n← ${usedPrefix + command} Intelligence Artificielle en Médecine\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته في التعليم\n← ${usedPrefix + command} Cybersecurity & Cloud Computing`,
			`📊 *صانع عروض البوربوينت بالذكاء الاصطناعي*\n━━━━━━━━━━━━━━━━━━━━\nأنشئ عروض تقديمية احترافية بصيغة PowerPoint (.pptx) فورياً وبأعلى جودة!\n\n*الاستخدام:*\n← ${usedPrefix + command} <الموضوع>\n\n*أمثلة:*\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته في التعليم\n← ${usedPrefix + command} الطاقة المتجددة وتحديات المستقبل\n← ${usedPrefix + command} أهمية الأمن السيبراني للشركات`,
			`📊 *صانع عروض البوربوينت (PowerPoint)*\n━━━━━━━━━━━━━━━━━━━━\nقاد بريزونطاسيون كاملة واحترافية بصيغة (.pptx) فـ ثواني بالذكاء الاصطناعي!\n\n*طريقة الاستعمال:*\n← ${usedPrefix + command} <الموضوع>\n\n*أمثلة:*\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته\n← ${usedPrefix + command} Intelligence Artificielle & Big Data\n← ${usedPrefix + command} التجارة الإلكترونية فالمغرب`
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
