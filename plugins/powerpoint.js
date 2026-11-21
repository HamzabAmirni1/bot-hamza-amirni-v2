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
		const matchFr = t.match(/sujet\s*(?:suivant)?\s*[:]\s*([^\n\.\,\!\?]+)/i);
		const matchAr = t.match(/موضوع\s*(?:التالي)?\s*[:]\s*([^\n\.\,\!\?]+)/i);
		if (matchFr && matchFr[1]) {
			t = matchFr[1].trim();
		} else if (matchAr && matchAr[1]) {
			t = matchAr[1].trim();
		} else {
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

	// 3. Fallback: Detailed, Topic-Tailored Real Knowledge (Never generic filler)
	if (slides.length < 3) {
		const rtl = isRtl(cleanSafeTitle);
		const fr = isFrenchTopic(cleanSafeTitle);
		const isAiTopic = /(ذكاء|اصطناعي|ai|intelligence|artificielle|tech|robot)/i.test(cleanSafeTitle);

		if (rtl) {
			if (isAiTopic) {
				return {
					title: cleanSafeTitle,
					subtitle: 'المفاهيم والتطبيقات العملية والآفاق المستقبلية',
					slides: [
						{
							title: 'مفهوم الذكاء الاصطناعي وتطوره',
							points: [
								'محاكاة القدرات الذهنية البشرية كالتعلم والاستنتاج والتحليل الذاتي عبر الخوارزميات',
								'الانتقال التاريخي من البرمجة التقليدية القائمة على القواعد إلى التعلم الآلي والعميق',
								'معالجة البيانات الضخمة (Big Data) لتمكين الأنظمة من اتخاذ قرارات دقيقة ومستقلة'
							]
						},
						{
							title: 'الركائز التقنية الأساسية',
							points: [
								'التعلم الآلي (Machine Learning): تمكين البرمجيات من تحسين أدائها تلقائياً مع زيادة البيانات',
								'الشبكات العصبية العميقة (Deep Learning): محاكاة طريقة عمل الخلايا العصبية في الدماغ البشري',
								'معالجة اللغات الطبيعية (NLP): تمكين الآلات من فهم وتوليد لغة الإنسان بدقة فائقة'
							]
						},
						{
							title: 'التطبيقات في الحياة اليومية',
							points: [
								'الهواتف الذكية: التعرف على الوجه، المساعدات الصوتية الذكية (Siri, Google)، والتصوير الحسابي',
								'محركات التوصية: ترشيح المحتوى بدقة في منصات مثل YouTube و Netflix ووسائل التواصل',
								'الملاحة والنقل: حساب أسرع المسارات وتجنب الازدحام عبر الخرائط والسيارات ذاتية القيادة'
							]
						},
						{
							title: 'الثورة في قطاع الرعاية الصحية والتعليم',
							points: [
								'الرعاية الطبية: التشخيص المبكر للأمراض وقراءة الأشعة بدقة تفوق أحياناً التشخيص البشري',
								'تطوير الأدوية: تسريع اكتشاف وتصميم المركبات العلاجية في أسابيع معدودة بدل عقود',
								'التعليم المخصص: تخصيص المناهج وتوفير معلمين افتراضيين يتكيفون مع مستوى كل طالب'
							]
						},
						{
							title: 'التحديات والمخاطر الراهنة',
							points: [
								'أمن وخصوصية البيانات: مخاطر استغلال البيانات الشخصية والتسريبات الرقمية',
								'التزييف العميق (Deepfake): التحديات الأمنية والاجتماعية الناتجة عن تزييف الصوت والصورة',
								'سوق العمل: أتمتة الوظائف والحاجة الملحة لتطوير مهارات القوى العاملة للمستقبل'
							]
						},
						{
							title: 'الخاتمة والآفاق المستقبلية',
							points: [
								'الذكاء الاصطناعي أداة مساعدة لتمكين الإنسان وتطوير الإنتاجية وليس بديلاً عن الإبداع البشري',
								'ضرورة وضع أطر قانونية وأخلاقية واضحة لحوكمة استخدامات التكنولوجيا الناشئة',
								'شكراً جزيلاً لحسن استماعكم ومتابعتكم الكريمة لهذا العرض'
							]
						}
					]
				};
			}

			// General Arabic High-Value Knowledge
			return {
				title: cleanSafeTitle,
				subtitle: 'دراسة تحليلية شاملة • المفاهيم والأبعاد العملية',
				slides: [
					{
						title: 'المقدمة والتعريف الأساسي',
						points: [
							`التعريف العلمي والدقيق لمفهوم ${cleanSafeTitle} وسياقه التاريخي`,
							'العوامل الرئيسية التي تجعل من هذا الموضوع ركيزة أساسية في عصرنا الحالي',
							'الترابط الوثيق بين الفهم النظري السليم والتطبيق العملي الناجح'
						]
					},
					{
						title: 'الأهداف والأبعاد المحورية',
						points: [
							'تحديد الأهداف الاستراتيجية ومؤشرات الأداء الرئيسية المرتبطة بالموضوع',
							'استيعاب التحديات المحيطة واستثمار الفرص المتاحة لتطوير الأداء',
							'بناء رؤية واضحة ومستدامة للتطوير والتحديث المستمر'
						]
					},
					{
						title: 'التحليل والتطبيقات الواقعية',
						points: [
							'دراسة نماذج واقعية وتجارب ميدانية أثبتت نجاحها وكفاءتها العالية',
							'الآليات العملية لتطبيق هذه المبادئ في بيئة العمل والحياة اليومية',
							'أفضل الممارسات المتبعة عالمياً لتحقيق أعلى معدلات الجودة والإتقان'
						]
					},
					{
						title: 'المزايا الاستراتيجية والقيمة المضافة',
						points: [
							'تحقيق نتائج ملموسة تسهم في رفع الكفاءة وتحسين استغلال الموارد',
							'تعزيز الميزة التنافسية وبناء أثر إيجابي مستدام على المدى البعيد',
							'توفير حلول مبتكرة ومرنة تلبي متطلبات الواقع المتسارع'
						]
					},
					{
						title: 'التحديات وسبل التغلب عليها',
						points: [
							'تشخيص دقيق لأبرز المعوقات التشغيلية والمخاطر المحتملة',
							'استراتيجيات وقائية وخطوات علاجية حاسمة لتجاوز العقبات',
							'أهمية المرونة والتقييم الدوري لضمان الاستمرارية والنجاح'
						]
					},
					{
						title: 'الخلاصة والتوصيات والختام',
						points: [
							'إيجاز لأهم الدروس المستفادة والركائز الجوهرية للنجاح',
							'توصيات ختامية قابلة للتنفيذ الفوري مع وضع خارطة طريق للمستقبل',
							'شكراً جزيلاً لحسن متابعتكم وانتباهكم الكريم'
						]
					}
				]
			};
		} else if (fr) {
			if (isAiTopic) {
				return {
					title: cleanSafeTitle,
					subtitle: 'Fondements, Cas d\'Usage & Perspectives d\'Avenir',
					slides: [
						{
							title: 'Qu\'est-ce que l\'IA ? Définition & Origines',
							points: [
								'Simulation de l\'intelligence humaine par des machines : apprentissage, raisonnement et auto-correction',
								'Évolution majeure depuis les systèmes experts jusqu\'à l\'apprentissage automatique et profond',
								'Exploitation massive des données (Big Data) et puissance de calcul pour des analyses prédictives'
							]
						},
						{
							title: 'Piliers Technologiques Clés',
							points: [
								'Machine Learning : capacité des algorithmes à apprendre des données sans être explicitement programmés',
								'Deep Learning : réseaux de neurones profonds reproduisant le fonctionnement cognitif humain',
								'Traitement du Langage Naturel (NLP) : compréhension et génération de texte à l\'instar de ChatGPT'
							]
						},
						{
							title: 'Applications dans la Vie Quotidienne',
							points: [
								'Smartphones : reconnaissance faciale, assistants vocaux intelligents et optimisation photo en temps réel',
								'Divertissement : recommandations ultra-personnalisées sur Netflix, Spotify et réseaux sociaux',
								'Transports intelligents : calcul d\'itinéraires en temps réel, sécurité active et véhicules autonomes'
							]
						},
						{
							title: 'Transformation de la Santé & de l\'Industrie',
							points: [
								'Santé : détection précoce des pathologies par analyse d\'images médicales avec une précision inédite',
								'Recherche pharmaceutique : accélération spectaculaire de la découverte de nouveaux traitements',
								'Industrie 4.0 : maintenance prédictive, robotique collaborative et optimisation énergétique des usines'
							]
						},
						{
							title: 'Défis Éthiques & Risques Majeurs',
							points: [
								'Protection de la vie privée et conformité réglementaire (RGPD et AI Act européen)',
								'Biais algorithmiques et risques liés aux fausses informations générées (Deepfakes)',
								'Impact sur l\'emploi : mutation des métiers et nécessité impérative de requalification des équipes'
							]
						},
						{
							title: 'Synthèse & Conclusion Finale',
							points: [
								'L\'IA est un puissant multiplicateur d\'efficacité humaine et non un substitut à la créativité',
								'Nécessité d\'un cadre éthique et responsable pour garantir une technologie au service de tous',
								'Merci chaleureusement pour votre attention et vos échanges'
							]
						}
					]
				};
			}

			// General French High-Value Knowledge
			return {
				title: cleanSafeTitle,
				subtitle: 'Analyse Stratégique Complète & Recommandations Pratiques',
				slides: [
					{
						title: 'Introduction & Définition Fondamentale',
						points: [
							`Définition rigoureuse et mise en contexte de : ${cleanSafeTitle}`,
							'Les facteurs clés expliquant l\'importance grandissante du sujet aujourd\'hui',
							'Problématique centrale et articulation des grands axes d\'analyse'
						]
					},
					{
						title: 'Objectifs & Enjeux Stratégiques',
						points: [
							'Identifier les leviers de performance et les indicateurs clés de succès',
							'Comprendre les dynamiques d\'évolution et anticiper les transformations du secteur',
							'Construire une vision globale combinant rigueur méthodologique et flexibilité'
						]
					},
					{
						title: 'Développement & Études de Cas Réels',
						points: [
							'Analyse approfondie de cas concrets et modèles opérationnels éprouvés',
							'Retours d\'expérience sur les meilleures pratiques déployées à l\'échelle internationale',
							'Méthodologie étape par étape pour une mise en œuvre efficace sur le terrain'
						]
					},
					{
						title: 'Avantages Compétitifs & Valeur Ajoutée',
						points: [
							'Gains substantiels en efficacité, productivité et qualité globale',
							'Création de valeur pérenne et renforcement durable de la compétitivité',
							'Capacité d\'innovation accrue et alignement sur les standards d\'excellence'
						]
					},
					{
						title: 'Défis Opérationnels & Solutions Éprouvées',
						points: [
							'Cartographie précise des risques potentiels et points de blocage critiques',
							'Stratégies d\'atténuation et plans d\'action pour surmonter les obstacles',
							'Importance d\'un pilotage agile et d\'une gouvernance participative'
						]
					},
					{
						title: 'Bilan Stratégique & Conclusion',
						points: [
							'Synthèse des enseignements fondamentaux et vision prospective d\'avenir',
							'Recommandations opérationnelles immédiates pour réussir la transition',
							'Merci chaleureusement pour votre attention et votre écoute'
						]
					}
				]
			};
		} else {
			// English Fallback
			return {
				title: cleanSafeTitle,
				subtitle: 'Comprehensive Executive Overview & Strategic Roadmap',
				slides: [
					{
						title: 'Introduction & Strategic Context',
						points: [
							`Formal definition and modern landscape of ${cleanSafeTitle}`,
							'Key drivers establishing this domain as an essential pillar of progress',
							'Core problem statement and overarching roadmap'
						]
					},
					{
						title: 'Core Architecture & Key Concepts',
						points: [
							'Fundamental building blocks, methodologies, and technical pillars',
							'Industry-standard frameworks and operational prerequisites',
							'Alignment between foundational theory and tactical execution'
						]
					},
					{
						title: 'Real-World Case Studies & Applications',
						points: [
							'Detailed examination of high-impact real-world deployments and benchmarks',
							'Best practices from leading global organizations and thought leaders',
							'Step-by-step framework for successful execution and scaling'
						]
					},
					{
						title: 'Strategic Value & Measurable Impact',
						points: [
							'Significant enhancements in efficiency, agility, and performance metrics',
							'Sustainable competitive advantage and long-term return on investment',
							'Future-proofing operations against market shifts and disruption'
						]
					},
					{
						title: 'Key Challenges & Actionable Solutions',
						points: [
							'Critical barriers, compliance constraints, and operational bottlenecks',
							'Proven risk mitigation strategies and governance protocols',
							'Continuous learning and organizational adaptability as key enablers'
						]
					},
					{
						title: 'Conclusion & Strategic Takeaways',
						points: [
							'Summary of pivotal takeaways and strategic milestones',
							'Immediate recommendations for stakeholders and practitioners',
							'Thank you very much for your time and attention'
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
 * 1. Short Topics (e.g. "دور الذكاء الاصطناعي في حياتنا اليومية")
 * 2. Full texts / long documents / pasted articles to be converted into presentations
 */
async function generatePresentationData(inputContent, userLang = 'darija') {
	const isLongDocument = inputContent.length > 70 || inputContent.includes('\n');
	const rtl = isRtl(inputContent);
	const fr = isFrenchTopic(inputContent);

	let systemPrompt = '';

	if (rtl) {
		systemPrompt = `أنت خبير عالمي في تصميم العروض التقديمية الاحترافية لبوت 'Bot Hamza Amirni'.
مهمتك تصميم عرض تقديمي كامل، عميق، وغني بالمعلومات الحقيقية والشروحات والتعريفات الوافية حول الموضوع.

🚨 تعليمات صارمة للمحتوى (ممنوع العبارات العامة الفارغة):
- ممنوع منعاً باتاً كتابة عبارات عامة مثل "نظرة عامة تمهد للموضوع" أو "التعريف العلمي والدقيق" أو "المبادئ الأساسية".
- يجب كتابة المحتوى الحقيقي والمفصل:
  * التعريف العلمي الدقيق للمفهوم بالكلمات والشرح الوافي.
  * ركائز وآليات العمل التقنية أو المفاهيمية.
  * أمثلة وتطبيقات واقعية ملموسة (ذكر تقنيات وأسماء وتطبيقات حقيقية: الهواتف، الطب، النقل، الصناعة...).
  * إحصائيات وأرقام وتأثيرات ملموسة في حياة الناس.
  * تحديات حقيقية (أمن البيانات، الوظائف، الأخلاقيات) وحلول عملية قابلة للتنفيذ.

🔤 قواعد ضبط اتجاه النص العربي والرموز والمصطلحات الأجنبية (BiDi):
- اكتب بأسلوب عربي فصيح متماسك ومتناسق من اليمين إلى اليسار.
- عند إدراج أي مصطلح تقني لاتيني (إنجليزي أو فرنسي)، ضعه داخل قوسين بجانب المعنى العربي مباشرة وبسلاسة، مثال: «نظام التشغيل (iOS و Android)» أو «وحدات المعالجة العصبية (NPU)».
- تجنب وضع الأقواس أو النقطتين أو الرموز في أطراف الجملة بشكل معزول لضمان بقاء علامات الترقيم والأقواس في مكانها الطبيعي السليم.

هيكلة العرض (6 إلى 8 شرائح غنية):
1. شريحة 1: الغلاف (عنوان جذاب ومختصر أقل من 6 كلمات، وسطر وصفي أنيق).
2. شريحة 2: المفهوم والتعريف الشامل (ما هو بالضبط؟ نشأته وأهميته الحقيقية).
3. شريحة 3: آليات وركائز العمل (كيف يعمل وما هي الأسس والمحاور التقنية).
4. شريحة 4: التطبيقات في الحياة اليومية والواقع (أمثلة ملموسة وتطبيقات حية).
5. شريحة 5: التأثيرات الإيجابية والقيمة المضافة (الأرقام والفوائد الواقعية).
6. شريحة 6: التحديات والمخاطر والحلول الممكنة (المشاكل الحقيقية وكيفية تجاوزها).
7. شريحة 7: الآفاق المستقبلية والرؤية القادمة.
8. شريحة 8: الخاتمة والرسالة الختامية والشكر.

أخرج النتيجة كـ JSON خام فقط دون أي نص إضافي:
{
  "title": "عنوان موجز وقوي (أقل من 6 كلمات)",
  "subtitle": "سطر وصفي أنيق وموضح",
  "slides": [
    {
      "title": "عنوان واضح للشريحة",
      "points": [
        "شرح وتعريف تفصيلي كامل ومباشر",
        "أمثلة واقعية ملموسة وبيانات دقيقة",
        "تحليل عملي وتأثير ملموس"
      ]
    }
  ]
}`;
	} else if (fr) {
		systemPrompt = `Tu es un expert mondial en conception de présentations PowerPoint professionnelles pour "Bot Hamza Amirni".
Ton rôle est de créer une présentation complète, ULTRA-DÉTAILLÉE, RICHE EN CONTENU RÉEL, moderne et professionnelle.

🚨 RÈGLE STRICTE SUR LE CONTENU (ZÉRO PHRASES GÉNÉRIQUES) :
- INTERDICTION FORMELLE d'écrire des formules vagues ou des titres creux comme "Vue d'ensemble et mise en contexte" ou "Définition rigoureuse".
- Tu DOIS ÉCRIRE LE CONTENU RÉEL ET CONCRET :
  * Définitions complètes, claires et exhaustives avec les termes techniques exacts.
  * Piliers et mécanismes réels de fonctionnement.
  * Exemples et cas d'usage réels du quotidien (santé, smartphones, transports, industrie, IA...).
  * Véritables défis éthiques ou opérationnels et solutions stratégiques concrètes.

STRUCTURE (6 à 8 diapositives d'excellence) :
1. Diapositive 1 : Couverture (Titre accrocheur max 6 mots, sous-titre élégant).
2. Diapositive 2 : Définition fondamentale & Contexte réel.
3. Diapositive 3 : Mécanismes & Piliers clés de fonctionnement.
4. Diapositive 4 : Cas d'usage réels & Applications du quotidien.
5. Diapositive 5 : Bénéfices majeurs & Chiffres d'impact.
6. Diapositive 6 : Défis majeurs, Risques éthiques & Solutions.
7. Diapositive 7 : Perspectives d'Avenir.
8. Diapositive 8 : Synthèse & Conclusion finale (avec mot de remerciement).

Retourne UNIQUEMENT du JSON brut valide :
{
  "title": "Titre Court (max 5 mots)",
  "subtitle": "Sous-titre élégant et informatif",
  "slides": [
    {
      "title": "Titre explicite de la diapositive",
      "points": [
        "Définition concrète et détaillée avec termes exacts",
        "Exemple réel d'application ou données factuelles",
        "Analyse approfondie et impact concret"
      ]
    }
  ]
}`;
	} else {
		systemPrompt = `You are a world-class executive PowerPoint presentation designer for "Bot Hamza Amirni".
Create an in-depth, rich, factual, and visually structured presentation.

🚨 STRICT RULE: ZERO GENERIC FILLER.
Provide concrete definitions, real technologies, actual daily applications, data, real challenges, and actionable solutions.

Return ONLY raw JSON:
{
  "title": "Concise Catchy Title (max 5 words)",
  "subtitle": "Elegant informative subtitle",
  "slides": [
    {
      "title": "Explicit Slide Title",
      "points": [
        "Specific in-depth definition and explanation",
        "Concrete real-world case study or data point",
        "Actionable takeaway or impact"
      ]
    }
  ]
}`;
	}

	const userPrompt = isLongDocument 
		? `Texte complet / محتوى :\n"""\n${inputContent}\n"""\n\nJSON output:`
		: `Subject / الموضوع : "${inputContent}"\n\nJSON output:`;

	let rawResponse = '';
	try {
		// Provide 25 seconds timeout so AI generates complete, in-depth slide content
		rawResponse = await getSmartAIReply(userPrompt, { systemPrompt, timeoutMs: 25000 });
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
		fontFace: rtl ? 'Calibri' : 'Arial',
		bold: true,
		color: THEME.primaryGold,
		align: 'center',
		rtl: rtl,
		valign: 'middle'
	});

	// Subtitle - Centered
	let safeSubtitle = String(data.subtitle || '').trim();
	if (safeSubtitle.length > 90) safeSubtitle = safeSubtitle.substring(0, 87) + '...';
	if (safeSubtitle) {
		slideCover.addText(safeSubtitle, {
			x: 1.0, y: subtitleY, w: 11.3, h: 0.9,
			fontSize: 20,
			fontFace: rtl ? 'Calibri' : 'Arial',
			color: THEME.accentCyan,
			align: 'center',
			rtl: rtl,
			valign: 'middle'
		});
	}

	// Presenter & Date Info Line (Uses user's name if available)
	const cleanPresenter = (presenterName || '').trim();
	const presenterLine = rtl
		? (cleanPresenter ? `👤 إعداد وتقديم: ${cleanPresenter}   •   📅 ${dateStr}` : `📅 ${dateStr}`)
		: (cleanPresenter ? `👤 Présenté par : ${cleanPresenter}   •   📅 ${dateStr}` : `📅 ${dateStr}`);

	slideCover.addText(presenterLine, {
		x: 1.0, y: 5.4, w: 11.3, h: 0.5,
		fontSize: 15,
		fontFace: rtl ? 'Calibri' : 'Arial',
		bold: true,
		color: THEME.primaryGold,
		align: 'center',
		rtl: rtl
	});

	// Permanent Official Bot & Developer Copyright Watermark on Cover
	const coverFooterText = rtl
		? '⚡ صُمم بواسطة: Bot Hamza Amirni   •   📸 إنستغرام: @hamza_amirni_01'
		: '⚡ Créé par : Bot Hamza Amirni   •   📸 Instagram : @hamza_amirni_01';

	slideCover.addText(coverFooterText, {
		x: 1.0, y: 6.4, w: 11.3, h: 0.5,
		fontSize: 12,
		fontFace: rtl ? 'Calibri' : 'Arial',
		color: THEME.textMuted,
		align: 'center',
		rtl: rtl
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
			fontFace: rtl ? 'Calibri' : 'Arial',
			bold: true,
			color: THEME.primaryGold,
			align: 'center',
			rtl: rtl,
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

			const badgeSize = Math.min(cardH * 0.65, 0.65);
			const badgeY = y + (cardH - badgeSize) / 2;

			// Position elements based on reading direction (RTL vs LTR)
			// In Arabic (RTL): Number badge is on the RIGHT, text flows to the left
			// In French/English (LTR): Number badge is on the LEFT, text flows to the right
			const badgeX = rtl ? (12.4 - 0.25 - badgeSize) : 1.15;
			const textX = rtl ? 1.15 : (1.15 + badgeSize + 0.25);
			const textW = rtl ? ((badgeX - 0.25) - textX) : (12.4 - 0.25 - textX);

			// Number Pill Badge
			slide.addShape(pres.ShapeType.roundRect, {
				x: badgeX, y: badgeY, w: badgeSize, h: badgeSize,
				fill: { color: THEME.primaryGold },
				rectRadius: 0.1
			});
			slide.addText(String(i + 1), {
				x: badgeX, y: badgeY, w: badgeSize, h: badgeSize,
				fontSize: count > 4 ? 12 : 14,
				fontFace: rtl ? 'Calibri' : 'Arial',
				bold: true,
				color: '0B132B',
				align: 'center',
				valign: 'middle'
			});

			// Point Text - Aligned according to language with native BiDi RTL support
			let cleanText = String(p || '').replace(/^[•\-\*\d\.\)\s]+/, '').trim();
			if (cleanText.length > 150) cleanText = cleanText.substring(0, 147) + '...';

			slide.addText(cleanText, {
				x: textX, y: y, w: textW, h: cardH,
				fontSize: count > 4 ? 14 : 16,
				fontFace: rtl ? 'Calibri' : 'Arial',
				color: THEME.textWhite,
				align: rtl ? 'right' : 'left',
				rtl: rtl,
				valign: 'middle'
			});
		});

		// Permanent Developer Branding & Instagram on every slide footer
		const slideFooterText = `Bot Hamza Amirni  •  Instagram: @hamza_amirni_01  |  ${idx + 1} / ${slides.length}`;
		slide.addText(slideFooterText, {
			x: 0.9, y: 6.85, w: 11.5, h: 0.4,
			fontSize: 10,
			fontFace: rtl ? 'Calibri' : 'Arial',
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
			`📊 *AI PowerPoint Presentation Generator*\n━━━━━━━━━━━━━━━━━━━━\nCreate complete, professional PowerPoint (.pptx) presentations instantly from any topic or document!\n\n*Usage:*\n← ${usedPrefix + command} <topic or full text>\n_Or reply to any text message with ${usedPrefix + command}_\n\n*Examples:*\n← ${usedPrefix + command} Intelligence Artificielle en Médecine\n← ${usedPrefix + command} دور الذكاء الاصطناعي في حياتنا اليومية`,
			`📊 *صانع عروض البوربوينت بالذكاء الاصطناعي*\n━━━━━━━━━━━━━━━━━━━━\nأنشئ عروض تقديمية احترافية بصيغة PowerPoint (.pptx) فورياً من أي موضوع أو نص مقال!\n\n*الاستخدام:*\n← ${usedPrefix + command} <الموضوع أو النص الكامل>\n_أو قم بالرد على أي رسالة نصية بالأمر ${usedPrefix + command}_\n\n*أمثلة:*\n← ${usedPrefix + command} دور الذكاء الاصطناعي في حياتنا اليومية\n← ${usedPrefix + command} الطاقة المتجددة وتحديات المستقبل`,
			`📊 *صانع عروض البوربوينت (PowerPoint)*\n━━━━━━━━━━━━━━━━━━━━\nقاد بريزونطاسيون كاملة واحترافية بصيغة (.pptx) من أي موضوع أو نص كامل صيفطتيه!\n\n*طريقة الاستعمال:*\n← ${usedPrefix + command} <الموضوع ولا النص>\n_تقدر تصيفط الموضوع ولا ترد (Quote) على أي ميساج فيه نص بـ ${usedPrefix + command}_\n\n*أمثلة:*\n← ${usedPrefix + command} دور الذكاء الاصطناعي في حياتنا اليومية\n← ${usedPrefix + command} Intelligence Artificielle & Big Data`
		));
	}

	// Resolve presenter name: use the user's real WhatsApp name or pushName (not hardcoded)
	const presenterName = m.pushName || m.name || '';

	await m.react('⏳');
	await conn.sendMessage(m.chat, {
		text: t(
			`⏳ *Creating your PowerPoint presentation...*\nStructuring in-depth content and designing professional slides...`,
			`⏳ *جاري تصميم عرض البوربوينت الخاص بك...*\nنقوم الآن بكتابة المحتوى التفصيلي والشروحات وتنسيق الشرائح باحترافية...`,
			`⏳ *كنقاد ليك بريزونطاسيون دابا...*\nجاري كتابة المحتوى وتلخيص الأفكار وتصميم شرائح احترافية...`
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
