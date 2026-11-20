// ============================================================
// PowerPoint (.pptx) Presentation Generator Plugin
// Developed for Bot Hamza Amirni by Hamza Amirni
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
	/(présentation|sujet|projet|cours|gestion|management|analyse|rapport|travail|devoir|exposé|société|santé|technologie|avenir|monde|expert)/i.test(String(str || ''));

/**
 * Clean & extract a concise presentation title (max 50 chars) from any input or prompt
 */
function sanitizeTitle(str) {
	let t = String(str || '').trim();
	if (t.length > 55 || t.includes('\n')) {
		// Look for patterns like "sur le sujet suivant : X" or "حول موضوع : X"
		const matchFr = t.match(/sujet\s*(?:suivant)?\s*[:]\s*([^\n\.\,\!\?]+)/i);
		const matchAr = t.match(/موضوع\s*(?:التالي)?\s*[:]\s*([^\n\.\,\!\?]+)/i);
		if (matchFr && matchFr[1]) {
			t = matchFr[1].trim();
		} else if (matchAr && matchAr[1]) {
			t = matchAr[1].trim();
		} else {
			// Take the first line or first clean phrase
			t = t.split('\n')[0].split(/[.:!?]/)[0].trim();
			if (t.length > 50) t = t.substring(0, 47) + '...';
		}
	}
	return t || 'Présentation';
}

/**
 * Intelligent parser that extracts or constructs slides from any AI response (JSON or plain text)
 */
function parseSlidesFromAnyText(raw, topic) {
	if (!raw) raw = '';
	const cleanSafeTitle = sanitizeTitle(topic);

	// 1. Try pure JSON extraction
	const firstBrace = raw.indexOf('{');
	const lastBrace = raw.lastIndexOf('}');
	if (firstBrace !== -1 && lastBrace > firstBrace) {
		try {
			const parsed = JSON.parse(raw.substring(firstBrace, lastBrace + 1));
			if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
				return {
					title: sanitizeTitle(parsed.title || cleanSafeTitle),
					subtitle: parsed.subtitle || (isRtl(cleanSafeTitle) ? 'عرض تقديمي شامل ومفصل' : isFrenchTopic(cleanSafeTitle) ? 'Présentation Complète et Professionnelle' : 'Comprehensive Presentation'),
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
		if (/^(أهلاً|مرحباً|أهلا|بالتأكيد|إليك|السلام|hello|sure|here is|welcome|bonjour|voici|agis comme)/i.test(line) && line.length < 80) {
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
				currentSlide = { title: cleanSafeTitle || 'المقدمة', points: [clean] };
			}
		}
	}
	if (currentSlide && currentSlide.points.length > 0) slides.push(currentSlide);

	// 3. Fallback: High-Standard Professional Structure (Academic & Executive Standard)
	if (slides.length < 3) {
		const rtl = isRtl(cleanSafeTitle);
		const fr = isFrenchTopic(cleanSafeTitle);

		if (rtl) {
			return {
				title: cleanSafeTitle,
				subtitle: 'عرض تقديمي شامل واحترافي • Bot Hamza Amirni',
				slides: [
					{
						title: 'المقدمة العامة وسياق الموضوع',
						points: [
							`نظرة عامة وشاملة تمهد لأبعاد ومفاهيم ${cleanSafeTitle}`,
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
							`التعريف العلمي والدقيق لمفهوم ${cleanSafeTitle}`,
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
				title: cleanSafeTitle,
				subtitle: 'Présentation Complète & Professionnelle • Bot Hamza Amirni',
				slides: [
					{
						title: 'Introduction Générale & Contexte',
						points: [
							`Vue d'ensemble et mise en contexte globale de : ${cleanSafeTitle}`,
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
							`Définition rigoureuse et éléments constitutifs de : ${cleanSafeTitle}`,
							'Les piliers méthodologiques et le cadre théorique de référence',
							'Règles d\'or, principes directeurs et normes d\'excellence'
						]
					},
					{
						title: 'Développement & Exemples Concrets',
						points: [
							'Étude approfondie des cas d\'usage réels et applications pratiques',
							'Retours d\'expérience, illustrations et modèles inspirants',
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
				title: cleanSafeTitle,
				subtitle: 'Comprehensive & Executive Presentation • Bot Hamza Amirni',
				slides: [
					{
						title: 'General Introduction & Background',
						points: [
							`Comprehensive overview and strategic context of ${cleanSafeTitle}`,
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
							`Formal definitions and theoretical foundation of ${cleanSafeTitle}`,
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
		title: cleanSafeTitle,
		subtitle: isRtl(cleanSafeTitle) ? 'عرض تقديمي بواسطة Bot Hamza Amirni' : 'Présentation par Bot Hamza Amirni',
		slides: slides.slice(0, 8)
	};
}

/**
 * Generate structured slide data using AI following professional expert standards
 * Handles both:
 * 1. Short Topics (e.g. "Intelligence Artificielle")
 * 2. Full texts / long documents / pasted articles to be converted into presentations
 */
async function generatePresentationData(inputContent, userLang = 'darija') {
	const isLongDocument = inputContent.length > 70 || inputContent.includes('\n');

	const systemPrompt = `Tu es un expert mondial en conception de présentations PowerPoint professionnelles, en communication visuelle et en design moderne pour "Bot Hamza Amirni".
${isLongDocument 
	? 'L\'utilisateur te fournit un TEXTE COMPLET, un article, des notes de cours ou un document à transformer et synthétiser en une présentation PowerPoint magistrale.'
	: 'L\'utilisateur te fournit un SUJET. Développe une présentation PowerPoint complète, moderne, élégante et professionnelle sur ce sujet.'}

RÈGLES IMPÉRATIVES DE STRUCTURE ET DE CONTENU:
1. TITRE ET SOUS-TITRE (OBLIGATOIREMENT CONCIS) :
   - Dégage un TITRE COURT ET PERCUTANT (maximum 4 à 6 mots) représentant le cœur du sujet.
   - Ne jamais mettre une phrase longue ou un paragraphe entier comme titre !
   - Dégage un SOUS-TITRE ÉLÉGANT (maximum 10 mots).
2. LANGUE : Le contenu doit être OBLIGATOIREMENT dans la langue du texte/sujet (Arabe si en arabe/darija, Français si en français, Anglais si en anglais).
3. STRUCTURE DE LA PRÉSENTATION (6 à 8 diapositives complètes) :
   - Diapositive 1 : Page de couverture (Titre accrocheur et sous-titre élégant).
   - Diapositive 2 : Introduction générale et présentation du contexte.
   - Diapositive 3 : Objectifs clés de la présentation.
   - Diapositives 4 à 6 : Développement organisé en plusieurs parties avec des explications claires, des exemples concrets et des informations pertinentes extraites ou développées.
   - Avant-dernière diapositive : Synthèse des idées principales et bilan stratégique.
   - Dernière diapositive : Conclusion professionnelle et remerciements ("Merci pour votre attention" / "شكراً لحسن متابعتكم").
4. QUALITÉ DU CONTENU :
   - Utiliser un langage soigné, professionnel et accessible.
   - 3 à 4 points essentiels par diapositive, concis, bien formulés et percutants.
   - Titres de diapositives courts et explicites (moins de 6 mots).
5. FORMAT DE SORTIE STRICT :
Retourne UNIQUEMENT un objet JSON brut valide (SANS backticks markdown, SANS \`\`\`json, SANS texte introductif) avec la structure exacte suivante :
{
  "title": "Titre Court (max 6 mots)",
  "subtitle": "Sous-titre élégant et informatif (max 10 mots)",
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

	const userPrompt = isLongDocument 
		? `Texte complet à analyser et convertir en présentation PowerPoint :\n\n"""\n${inputContent}\n"""\n\nRetourne UNIQUEMENT l'objet JSON contenant les diapositives.`
		: `Sujet de la présentation : "${inputContent}".\nRetourne UNIQUEMENT l'objet JSON contenant les diapositives.`;

	let rawResponse = '';
	try {
		rawResponse = await getSmartAIReply(userPrompt, { systemPrompt });
	} catch (e) {
		console.warn('[PPT] AI fetch failed, using smart slide builder:', e.message);
	}

	return parseSlidesFromAnyText(rawResponse, inputContent);
}

/**
 * Build professional .pptx presentation using PptxGenJS (True 16:9 LAYOUT_WIDE)
 */
async function buildPptxBuffer(data, presenterName = '') {
	const PptxClass = await getPptxGen();
	if (!PptxClass) throw new Error('pptxgenjs library is not available.');

	const pres = new PptxClass();
	// LAYOUT_WIDE is 13.33 x 7.5 inches (the true standard 16:9 widescreen)
	pres.layout = 'LAYOUT_WIDE';
	pres.author = 'Hamza Amirni';
	pres.company = 'Bot Hamza Amirni';
	pres.title = sanitizeTitle(data.title) || 'Presentation';

	const THEME = {
		bgDark: '0B132B',       // Deep tech navy
		cardDark: '1C2541',     // Slate card
		primaryGold: 'F59E0B',  // Metallic gold
		accentCyan: '06B6D4',   // Electric cyan
		textWhite: 'FFFFFF',    // Crisp white
		textMuted: '94A3B8',    // Soft slate
		borderCyan: '1E293B'
	};

	const safeTitle = sanitizeTitle(data.title);
	const rtl = isRtl(safeTitle);
	const fr = isFrenchTopic(safeTitle);

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

	// Presentation Title - Clean, centered, and sanitized
	slideCover.addText(safeTitle, {
		x: 0.9, y: titleY, w: 11.5, h: 1.4,
		fontSize: safeTitle.length > 35 ? 30 : 36,
		fontFace: 'Arial',
		bold: true,
		color: THEME.primaryGold,
		align: 'center',
		valign: 'middle'
	});

	// Subtitle - Centered
	let safeSubtitle = String(data.subtitle || '').trim();
	if (safeSubtitle.length > 90) safeSubtitle = safeSubtitle.substring(0, 87) + '...';
	if (safeSubtitle) {
		slideCover.addText(safeSubtitle, {
			x: 1.0, y: subtitleY, w: 11.3, h: 0.9,
			fontSize: 20,
			fontFace: 'Arial',
			color: THEME.accentCyan,
			align: 'center',
			valign: 'middle'
		});
	}

	// Presenter & Date Info Line (Uses the user's name, or default if empty)
	const cleanPresenter = (presenterName || '').trim();
	const presenterLine = rtl
		? (cleanPresenter ? `👤 إعداد وتقديم: ${cleanPresenter}   •   📅 ${dateStr}` : `📅 ${dateStr}`)
		: (cleanPresenter ? `👤 Présenté par : ${cleanPresenter}   •   📅 ${dateStr}` : `📅 ${dateStr}`);

	slideCover.addText(presenterLine, {
		x: 1.0, y: 5.4, w: 11.3, h: 0.5,
		fontSize: 15,
		fontFace: 'Arial',
		bold: true,
		color: THEME.primaryGold,
		align: 'center'
	});

	// Permanent Official Bot & Developer Copyright Watermark on Cover
	const coverFooterText = rtl
		? '⚡ صُمم بواسطة: Bot Hamza Amirni   •   📸 إنستغرام: @hamza_amirni_01'
		: '⚡ Créé par : Bot Hamza Amirni   •   📸 Instagram : @hamza_amirni_01';

	slideCover.addText(coverFooterText, {
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
		let rawTitle = String(s.title || (rtl ? `الشريحة ${idx + 1}` : fr ? `Diapositive ${idx + 1}` : `Slide ${idx + 1}`)).trim();
		if (rawTitle.length > 50) rawTitle = rawTitle.substring(0, 47) + '...';

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
			let cleanText = String(p || '').replace(/^[•\-\*\d\.\)\s]+/, '').trim();
			if (cleanText.length > 150) cleanText = cleanText.substring(0, 147) + '...';

			slide.addText(cleanText, {
				x: 1.95, y: y, w: 10.2, h: cardH,
				fontSize: count > 4 ? 14 : 16,
				fontFace: 'Arial',
				color: THEME.textWhite,
				align: 'center',
				valign: 'middle'
			});
		});

		// Permanent Developer Branding & Instagram on every slide footer
		const slideFooterText = `Bot Hamza Amirni  •  Instagram: @hamza_amirni_01  |  ${idx + 1} / ${slides.length}`;
		slide.addText(slideFooterText, {
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

	// Support both direct text AND quoted message text!
	let rawInput = (text || '').trim();
	if (!rawInput && m.quoted && m.quoted.text) {
		rawInput = m.quoted.text.trim();
	}

	if (!rawInput || rawInput.length < 2) {
		return m.reply(t(
			`📊 *AI PowerPoint Presentation Generator*\n━━━━━━━━━━━━━━━━━━━━\nCreate complete, professional PowerPoint (.pptx) presentations instantly from any topic or document!\n\n*Usage:*\n← ${usedPrefix + command} <topic or full text>\n_Or reply to any text message with ${usedPrefix + command}_\n\n*Examples:*\n← ${usedPrefix + command} Intelligence Artificielle en Médecine\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته في التعليم`,
			`📊 *صانع عروض البوربوينت بالذكاء الاصطناعي*\n━━━━━━━━━━━━━━━━━━━━\nأنشئ عروض تقديمية احترافية بصيغة PowerPoint (.pptx) فورياً من أي موضوع أو نص مقال!\n\n*الاستخدام:*\n← ${usedPrefix + command} <الموضوع أو النص الكامل>\n_أو قم بالرد على أي رسالة نصية بالأمر ${usedPrefix + command}_\n\n*أمثلة:*\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته في التعليم\n← ${usedPrefix + command} الطاقة المتجددة وتحديات المستقبل`,
			`📊 *صانع عروض البوربوينت (PowerPoint)*\n━━━━━━━━━━━━━━━━━━━━\nقاد بريزونطاسيون كاملة واحترافية بصيغة (.pptx) من أي موضوع أو نص كامل صيفطتيه!\n\n*طريقة الاستعمال:*\n← ${usedPrefix + command} <الموضوع ولا النص>\n_تقدر تصيفط الموضوع ولا ترد (Quote) على أي ميساج فيه نص بـ ${usedPrefix + command}_\n\n*أمثلة:*\n← ${usedPrefix + command} الذكاء الاصطناعي وتطبيقاته\n← ${usedPrefix + command} Intelligence Artificielle & Big Data`
		));
	}

	// Resolve presenter name: use the user's real WhatsApp name or pushName (not hardcoded)
	const presenterName = m.pushName || m.name || '';

	await m.react('⏳');
	await conn.sendMessage(m.chat, {
		text: t(
			`⏳ *Creating your PowerPoint presentation...*\nStructuring content and designing professional slides...`,
			`⏳ *جاري تصميم عرض البوربوينت الخاص بك...*\nنقوم الآن بتحليل النص وإنشاء المحتوى وتنسيق الشرائح باحترافية...`,
			`⏳ *كنقاد ليك بريزونطاسيون دابا...*\nجاري تلخيص وتوليد الأفكار وتصميم شرائح احترافية...`
		)
	}, { quoted: m });

	try {
		// 1. Generate content outline via AI
		const presentationData = await generatePresentationData(rawInput, userLang);

		// 2. Build .pptx presentation file
		const pptxBuffer = await buildPptxBuffer(presentationData, presenterName);

		const safeTitle = sanitizeTitle(presentationData.title || rawInput)
			.replace(/[/\\?%*:|"<>]/g, '_')
			.substring(0, 45);
		const fileName = `${safeTitle}.pptx`;
		const slideCount = (presentationData.slides || []).length;

		await m.react('📊');
		await conn.sendMessage(m.chat, {
			document: pptxBuffer,
			mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			fileName,
			caption: t(
				`📊 *Your PowerPoint Presentation is Ready!*\n━━━━━━━━━━━━━━━━━━━━\n📌 *Topic:* ${safeTitle}\n📑 *Slides:* ${slideCount + 1} slides\n⚡ *Engine:* Bot Hamza Amirni\n📸 *Instagram:* @hamza_amirni_01\n━━━━━━━━━━━━━━━━━━━━\n_Open directly in Microsoft PowerPoint, Google Slides, or WPS Office._`,
				`📊 *عرض البوربوينت الخاص بك جاهز!*\n━━━━━━━━━━━━━━━━━━━━\n📌 *الموضوع:* ${safeTitle}\n📑 *عدد الشرائح:* ${slideCount + 1} شريحة\n⚡ *المحرك:* بوت حمزة اعمرني (Bot Hamza Amirni)\n📸 *إنستغرام:* @hamza_amirni_01\n━━━━━━━━━━━━━━━━━━━━\n_يمكنك فتح الملف مباشرة في Microsoft PowerPoint أو Google Slides أو WPS Office._`,
				`📊 *البريزونطاسيون ديالك واجدة!*\n━━━━━━━━━━━━━━━━━━━━\n📌 *الموضوع:* ${safeTitle}\n📑 *عدد الشرائح:* ${slideCount + 1} سلايدات\n⚡ *صممها:* Bot Hamza Amirni\n📸 *Instagram:* @hamza_amirni_01\n━━━━━━━━━━━━━━━━━━━━\n_تقدر تحلها ديريكت فـ PowerPoint أو Google Slides أو التيليفون._`
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

handler.help = ['ppt <topic|text>', 'pptx <topic|text>', 'pp <topic|text>', 'powerpoint <topic|text>', 'presentation <topic|text>'];
handler.tags = ['ai', 'tools'];
handler.command = /^(ppt|pptx|pp|powerpoint|presentation|عرض|بوربوينت)$/i;

export default handler;
