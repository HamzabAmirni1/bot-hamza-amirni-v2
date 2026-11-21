// ============================================================
// Comprehensive PDF Book, Novel & Course Downloader Plugin
// Commands: .kitab | .ktab | .book | .books | .pdfbook | .كتاب | .كتب | .رواية | .روايات | .novel | .kutub | .dross | .dars | .دروس | .درس | .cours | .resume
// Moroccan Bac Novels & Summaries, Bestsellers, Islamic Classics & Global Search
// Developed for Bot Hamza Amirni by Hamza Amirni
// ============================================================

import fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MAX_BYTES = 65 * 1024 * 1024; // 65MB max for WhatsApp document transfer
const sessions = new Map(); // sender -> { at, items: [] }

// Helper for fetch with timeout
async function fetchWithTimeout(url, ms = 20000, opts = {}) {
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

// Normalize text for fuzzy matching (removes accents, arabic diacritics, etc.)
function normalizeText(str) {
	return String(str || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // remove french accents
		.replace(/[إأآا]/g, 'ا')
		.replace(/[ىي]/g, 'ي')
		.replace(/ة/g, 'ه')
		.replace(/[ًٌٍَُِّْ]/g, '') // remove harakat
		.replace(/[^a-z0-9\u0621-\u064A\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

// ─────────────────────────────────────────────────────────────
// MEGA CURATED CATALOGUE: BAC NOVELS, COURSES & BESTSELLERS
// ─────────────────────────────────────────────────────────────
const CURATED_CATALOGUE = [
	// ── CATEGORY 1: روايات ومقررات الباكالوريا (Bac Novels) ───────────
	{
		id: 'bac_antigone_novel',
		category: 'cat_bac_novels',
		categoryName: '🎓 روايات الباكالوريا',
		title: 'Antigone (Texte Intégral)',
		author: 'Jean Anouilh',
		year: '1ère Bac',
		desc: 'Pièce de théâtre moderne intégrale au programme du 1er Bac marocain.',
		keywords: ['antigone', 'antigon', 'antigab', 'anouilh', 'jean anouilh', 'انتيغون', 'انتيجون', '1bac', 'جهوي'],
		url: 'https://archive.org/download/AntigoneJeanAnouilh_201610/Antigone%20Jean%20Anouilh.pdf',
		sizeMb: '1.2'
	},
	{
		id: 'bac_antigone_resume',
		category: 'cat_bac_novels',
		categoryName: '🎓 روايات الباكالوريا',
		title: 'Antigone - Résumé & Analyse Complète',
		author: 'Préparation Bac Maroc',
		year: '1ère Bac',
		desc: 'Résumé scène par scène, personnages, schéma actanciel et fiches d\'examen.',
		keywords: ['antigone', 'antigon', 'resume antigone', 'ملخص انتيجون', 'تحليل انتيجون', 'fiche antigone'],
		url: 'https://archive.org/download/antigone-resume-complet-1bac/antigone-resume.pdf',
		sizeMb: '2.4'
	},
	{
		id: 'bac_boite_novel',
		category: 'cat_bac_novels',
		categoryName: '🎓 روايات الباكالوريا',
		title: 'La Boîte à Merveilles (Texte Intégral)',
		author: 'Ahmed Sefrioui',
		year: '1ère Bac',
		desc: 'Roman autobiographique relatant l\'enfance de Sidi Mohammed dans la médina de Fès.',
		keywords: ['boite', 'boite a merveilles', 'boite a merveille', 'sefrioui', 'ahmed sefrioui', 'علبة العجائب', 'صفريوي', 'احمد الصفريوي', '1bac'],
		url: 'https://archive.org/download/la-boite-a-merveilles-ahmed-sefrioui/La_Boite_a_Merveilles.pdf',
		sizeMb: '3.1'
	},
	{
		id: 'bac_boite_resume',
		category: 'cat_bac_novels',
		categoryName: '🎓 روايات الباكالوريا',
		title: 'La Boîte à Merveilles - Résumé & Fiches',
		author: 'Préparation Bac Maroc',
		year: '1ère Bac',
		desc: 'Résumé chapitre par chapitre (1 à 12), objets de la boîte et analyse littéraire.',
		keywords: ['boite', 'resume boite', 'ملخص علبة العجائب', 'تحليل علبة العجائب', 'fiches boite'],
		url: 'https://archive.org/download/la-boite-a-merveilles-resume-bac/boite-resume.pdf',
		sizeMb: '1.8'
	},
	{
		id: 'bac_condamne_novel',
		category: 'cat_bac_novels',
		categoryName: '🎓 روايات الباكالوريا',
		title: 'Le Dernier Jour d\'un Condamné',
		author: 'Victor Hugo',
		year: '1ère Bac',
		desc: 'Roman à thèse vibrant plaidoyer contre la peine de mort au 1er Bac.',
		keywords: ['dernier jour', 'condamne', 'victor hugo', 'hugo', 'اليوم الاخير لمحكوم عليه بالاعدام', 'فيكتور هوجو', '1bac'],
		url: 'https://archive.org/download/LeDernierJourDunCondamne_201610/Le%20dernier%20jour%20d%27un%20condamn%C3%A9.pdf',
		sizeMb: '2.5'
	},
	{
		id: 'bac_candide_novel',
		category: 'cat_bac_novels',
		categoryName: '🎓 روايات الباكالوريا',
		title: 'Candide ou l\'Optimisme',
		author: 'Voltaire',
		year: '2ème Bac',
		desc: 'Conte philosophique majeur au programme du 2ème Bac marocain.',
		keywords: ['candide', 'voltaire', 'كانديد', 'فولتير', 'التفاؤل', '2bac', 'وطني'],
		url: 'https://archive.org/download/candideoulloptim00volt/candideoulloptim00volt.pdf',
		sizeMb: '3.8'
	},
	{
		id: 'bac_goriot_novel',
		category: 'cat_bac_novels',
		categoryName: '🎓 روايات الباكالوريا',
		title: 'Le Père Goriot',
		author: 'Honoré de Balzac',
		year: '2ème Bac',
		desc: 'Chef-d\'œuvre du réalisme balzacien, l\'ambition de Rastignac et le drame de Goriot.',
		keywords: ['pere goriot', 'goriot', 'balzac', 'الاب غوريو', 'غوريو', 'بالزاك', '2bac'],
		url: 'https://archive.org/download/leperegoriot00balz/leperegoriot00balz.pdf',
		sizeMb: '4.5'
	},
	{
		id: 'bac_vieux_couple_novel',
		category: 'cat_bac_novels',
		categoryName: '🎓 روايات الباكالوريا',
		title: 'Il était une fois un vieux couple heureux',
		author: 'Mohammed Khaïr-Eddine',
		year: '2ème Bac',
		desc: 'Roman maghrébin sur la mémoire, la tradition et la modernité dans la vallée d\'Ammeln.',
		keywords: ['vieux couple', 'vieux couple heureux', 'khair eddine', 'محمد خير الدين', 'زوجين سعيدين', 'الزوجين السعيدين', '2bac'],
		url: 'https://archive.org/download/il-etait-une-fois-un-vieux-couple-heureux/Il%20%C3%A9tait%20une%20fois%20un%20vieux%20couple%20heureux.pdf',
		sizeMb: '2.9'
	},

	// ── CATEGORY 2: دروس وملخصات الباكالوريا (Bac Courses & Summaries) ──
	{
		id: 'bac_falsafa_summary',
		category: 'cat_bac_lessons',
		categoryName: '📚 دروس وملخصات الباك',
		title: 'ملخص شامل لدروس الفلسفة (2 باك)',
		author: 'أساتذة مادة الفلسفة بالمغرب',
		year: '2026/2027',
		desc: 'جميع المجزوءات (الوضع البشري، المعرفة، السياسة، الأخلاق) + منهجية القولة والنص والسؤال.',
		keywords: ['فلسفة', 'falsafa', 'philo', 'دروس الفلسفة', 'ملخص الفلسفة', 'الوضع البشري', 'المعرفة', 'السياسة', 'الأخلاق', 'منهجية الفلسفة', 'dross', 'دروس'],
		url: 'https://archive.org/download/falsafa-2bac-maroc/falsafa-resume-complet.pdf',
		sizeMb: '4.2'
	},
	{
		id: 'bac_ijtima3iyat_summary',
		category: 'cat_bac_lessons',
		categoryName: '📚 دروس وملخصات الباك',
		title: 'ملخص التاريخ والجغرافيا الشامل (1 و 2 باك)',
		author: 'أساتذة مادة الاجتماعيات',
		year: '2026/2027',
		desc: 'ملخصات مركزة لجميع دروس التاريخ والجغرافيا مع المصطلحات والخرائط الذهنية والمنهجية المقالية.',
		keywords: ['اجتماعيات', 'تاريخ', 'جغرافيا', 'ijtima3iyat', 'histoire', 'geo', 'دروس الاجتماعيات', 'ملخص التاريخ', 'جهوي اجتماعيات'],
		url: 'https://archive.org/download/ijtima3iyat-1bac-maroc/ijtima3iyat-resume.pdf',
		sizeMb: '5.1'
	},
	{
		id: 'bac_islamiyat_summary',
		category: 'cat_bac_lessons',
		categoryName: '📚 دروس وملخصات الباك',
		title: 'ملخص التربية الإسلامية + سورة يوسف ويس',
		author: 'مفتشو مادة التربية الإسلامية',
		year: '2026/2027',
		desc: 'المداخل الخمسة (التزكية، الاقتداء، الاستجابة، القسط، الحكمة) وشرح سور الامتحان الجهوي والوطني.',
		keywords: ['اسلاميات', 'تربية اسلامية', 'islamiyat', 'سورة يوسف', 'سورة يس', 'مداخل التربية الاسلامية', 'دروس التربية الاسلامية'],
		url: 'https://archive.org/download/tarbiya-islamiya-1bac/tarbiya-islamiya-resume.pdf',
		sizeMb: '3.6'
	},
	{
		id: 'bac_maths_summary',
		category: 'cat_bac_lessons',
		categoryName: '📚 دروس وملخصات الباك',
		title: 'Formulaire & Résumé Maths (2 Bac)',
		author: 'Équipe Maths Maroc',
		year: '2026/2027',
		desc: 'الملخص الشامل: الدوال العددية، الأعداد العقدية، المتتاليات، الاحتمالات وحساب التكامل.',
		keywords: ['رياضيات', 'math', 'maths', 'دروس الرياضيات', 'الدوال', 'الاعداد العقدية', 'الاحتمالات', 'المتتاليات', 'nombres complexes'],
		url: 'https://archive.org/download/maths-2bac-resumes/maths-2bac-formulaire.pdf',
		sizeMb: '6.0'
	},
	{
		id: 'bac_physique_summary',
		category: 'cat_bac_lessons',
		categoryName: '📚 دروس وملخصات الباك',
		title: 'ملخص دروس الفيزياء والكيمياء (2 باك)',
		author: 'أساتذة العلوم الفيزيائية',
		year: '2026/2027',
		desc: 'الموجات، التحولات النووية، الكهرباء RLC، الميكانيك والكيمياء التوازنية والأسترة.',
		keywords: ['فيزياء', 'كيمياء', 'physique', 'chimie', 'pc', 'دروس الفيزياء', 'الموجات', 'النووي', 'الكهرباء', 'الميكانيك'],
		url: 'https://archive.org/download/physique-chimie-2bac-maroc/pc-resume-complet.pdf',
		sizeMb: '7.4'
	},
	{
		id: 'bac_svt_summary',
		category: 'cat_bac_lessons',
		categoryName: '📚 دروس وملخصات الباك',
		title: 'ملخص دروس علوم الحياة والأرض (SVT)',
		author: 'أساتذة مادة SVT',
		year: '2026/2027',
		desc: 'استهلاك المادة العضوية، الخبر الوراثي، علم المناعة، والجيولوجيا مع الرسوم البيانية.',
		keywords: ['svt', 'علوم الحياة والارض', 'دروس svt', 'المناعة', 'الخبر الوراثي', 'atp', 'الجيولوجيا'],
		url: 'https://archive.org/download/svt-2bac-resumes/svt-2bac-resume.pdf',
		sizeMb: '8.2'
	},
	{
		id: 'bac_english_summary',
		category: 'cat_bac_lessons',
		categoryName: '📚 دروس وملخصات الباك',
		title: 'English 2nd Bac: Grammar & Writing Guide',
		author: 'Moroccan English Association',
		year: '2026/2027',
		desc: 'All 10 Units grammar rules, writing templates, linking words & exam vocabulary.',
		keywords: ['anglais', 'english', 'انجليزية', 'english bac', 'writing bac', 'grammar bac', 'دروس الانجليزية'],
		url: 'https://archive.org/download/english-2bac-morocco-guide/english-2bac-complete.pdf',
		sizeMb: '2.8'
	},

	// ── CATEGORY 3: أشهر الروايات العربية والعالمية (World & Arabic Novels) ─
	{
		id: 'novel_forty_rules',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: 'قواعد العشق الأربعون',
		author: 'إليف شافاق (Elif Shafak)',
		year: 'رواية عالمية',
		desc: 'رواية ملهمة عن جلال الدين الرومي وشمس التبريزي ومفهوم العشق الصوفي والحياة.',
		keywords: ['قواعد العشق', 'قواعد العشق الاربعون', 'اليف شافاق', 'شمس التبريزي', 'جلال الدين الرومي', 'forty rules'],
		url: 'https://archive.org/download/TheFortyRulesOfLoveArabic/The%20Forty%20Rules%20of%20Love.pdf',
		sizeMb: '9.5'
	},
	{
		id: 'novel_alchemist',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: 'الخيميائي (L\'Alchimiste)',
		author: 'باولو كويلو (Paulo Coelho)',
		year: 'رواية عالمية',
		desc: 'قصة الراعي الإسباني سانتياغو ورحلته للبحث عن أسطورته الشخصية لكنز الأهرامات.',
		keywords: ['الخيميائي', 'باولو كويلو', 'alchimiste', 'alchemist', 'paulo coelho', 'سانتياغو'],
		url: 'https://archive.org/download/Al-kimiya2i-Paulo-Coelho/al-kimiya2i.pdf',
		sizeMb: '3.2'
	},
	{
		id: 'novel_ard_zikola',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: 'أرض زيكولا',
		author: 'د. عمرو عبد الحميد',
		year: 'رواية خيال وتشويق',
		desc: 'أرض يتعامل أهلها بوحدات الذكاء بدل النقود، ومن ينفد ذكاؤه يذبح في يوم الزيكولا!',
		keywords: ['ارض زيكولا', 'زيكولا', 'عمرو عبد الحميد', 'خالد', 'وحدات الذكاء'],
		url: 'https://archive.org/download/Ard-Zikola-Amr-Abdelhamid/ard-zikola.pdf',
		sizeMb: '4.8'
	},
	{
		id: 'novel_ontha_3ibriya',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: 'في قلبي أنثى عبرية',
		author: 'د. خولة حمدي',
		year: 'رواية رومانسية اجتماعية',
		desc: 'رواية واقعية مؤثرة تدور بين تونس وجنوب لبنان عن الصراع الإنساني والإيمان والحب.',
		keywords: ['في قلبي انثى عبرية', 'انثى عبرية', 'خولة حمدي', 'ريما', 'ندى'],
		url: 'https://archive.org/download/Fi-Qalbi-Ontha-3ibriya/fi-qalbi-ontha.pdf',
		sizeMb: '5.6'
	},
	{
		id: 'novel_1984',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: '1984 (عالم الأخ الأكبر)',
		author: 'جورج أورويل (George Orwell)',
		year: 'رواية ديستوبيا خالدة',
		desc: 'الرواية الأشهر عن المراقبة والتحكم في العقول وأنظمة الحكم الدكتاتورية.',
		keywords: ['1984', 'جورج اورويل', 'اورويل', 'george orwell', 'الاخ الاكبر', 'big brother'],
		url: 'https://archive.org/download/1984-george-orwell-arabic/1984-arabic.pdf',
		sizeMb: '5.2'
	},
	{
		id: 'novel_les_miserables',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: 'البؤساء (Les Misérables)',
		author: 'فيكتور هوجو (Victor Hugo)',
		year: 'ملحمة أدبية إنسانية',
		desc: 'قصة جان فالجان والعدالة الاجتماعية والتضحية والرحمة في تاريخ فرنسا.',
		keywords: ['البؤساء', 'les miserables', 'جان فالجان', 'كوزيت', 'فيكتور هوجو'],
		url: 'https://archive.org/download/les-miserables-arabic-complete/les-miserables.pdf',
		sizeMb: '12.4'
	},
	{
		id: 'novel_crime_punishment',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: 'الجريمة والعقاب',
		author: 'فيودور دوستويفسكي',
		year: 'تحفة الأدب الروسي',
		desc: 'الصراع النفسي العنيف للطالب راسكولنيكوف وعذاب الضمير بعد ارتكاب الجريمة.',
		keywords: ['الجريمة والعقاب', 'دوستويفسكي', 'راسكولنيكوف', 'dostoevsky', 'crime punishment'],
		url: 'https://archive.org/download/crime-and-punishment-arabic-dostoevsky/crime-punishment.pdf',
		sizeMb: '11.0'
	},
	{
		id: 'novel_animal_farm',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: 'مزرعة الحيوان (Animal Farm)',
		author: 'جورج أورويل',
		year: 'رواية رمزية سياسية',
		desc: 'رواية ساخرة تحكي قصة تمرد الحيوانات ضد البشر وما آل إليه أمر المزرعة.',
		keywords: ['مزرعة الحيوان', 'animal farm', 'جورج اورويل'],
		url: 'https://archive.org/download/animal-farm-arabic-orwell/animal-farm.pdf',
		sizeMb: '2.1'
	},
	{
		id: 'novel_petit_prince',
		category: 'cat_world_novels',
		categoryName: '📖 روايات عربية وعالمية',
		title: 'الأمير الصغير (Le Petit Prince)',
		author: 'أنطوان دو سانت إكزوبيري',
		year: 'تحفة فلسفية خيالية',
		desc: 'الرواية العالمية الأجمل المترجمة لأكثر من 300 لغة عن معاني الصداقة والجوهر الحقيقي.',
		keywords: ['الامير الصغير', 'le petit prince', 'the little prince', 'سانت اكزوبيري'],
		url: 'https://archive.org/download/le-petit-prince-arabic-french/le-petit-prince.pdf',
		sizeMb: '3.4'
	},

	// ── CATEGORY 4: كتب تطوير الذات والمال (Self-Help & Finance) ──────
	{
		id: 'self_atomic_habits',
		category: 'cat_self_help',
		categoryName: '🧠 تطوير الذات والمال',
		title: 'العادات الذرية (Atomic Habits)',
		author: 'جيمس كلير (James Clear)',
		year: 'تطوير الذات #1',
		desc: 'الطريقة السهلة والمثبتة لبناء عادات جيدة والتخلص من العادات السيئة خطوة بخطوة.',
		keywords: ['العادات الذرية', 'عادات ذرية', 'جيمس كلير', 'atomic habits', 'james clear'],
		url: 'https://archive.org/download/atomic-habits-arabic-james-clear/atomic-habits-ar.pdf',
		sizeMb: '6.8'
	},
	{
		id: 'self_rich_dad',
		category: 'cat_self_help',
		categoryName: '🧠 تطوير الذات والمال',
		title: 'الأب الغني والأب الفقير',
		author: 'روبرت كيوساكي (Robert Kiyosaki)',
		year: 'الثقافة المالية #1',
		desc: 'ما يعلمه الأغنياء لأبنائهم عن المال ولا يعلمه الآباء من الطبقة المتوسطة.',
		keywords: ['الاب الغني', 'الاب الفقير', 'الاب الغني والاب الفقير', 'روبرت كيوساكي', 'rich dad'],
		url: 'https://archive.org/download/rich-dad-poor-dad-arabic-kiyosaki/rich-dad-poor-dad.pdf',
		sizeMb: '7.2'
	},
	{
		id: 'self_subtle_art',
		category: 'cat_self_help',
		categoryName: '🧠 تطوير الذات والمال',
		title: 'فن اللامبالاة (The Subtle Art)',
		author: 'مارك مانسون (Mark Manson)',
		year: 'تطوير الذات والوعي',
		desc: 'لعيش حياة تخالف المألوف والتركيز على ما يهم حقاً دون إرهاق النفس بالتوافه.',
		keywords: ['فن اللامبالاة', 'اللامبالاة', 'مارك مانسون', 'mark manson', 'subtle art'],
		url: 'https://archive.org/download/the-subtle-art-arabic-mark-manson/subtle-art.pdf',
		sizeMb: '5.9'
	},
	{
		id: 'self_richest_man_babylon',
		category: 'cat_self_help',
		categoryName: '🧠 تطوير الذات والمال',
		title: 'أغنى رجل في بابل',
		author: 'جورج كلاسون (George Clason)',
		year: 'الذكاء المالي',
		desc: 'قوانين الثروة الخالدة من خلال حكايات وتجارب مدينة بابل العريقة.',
		keywords: ['اغنى رجل في بابل', 'جورج كلاسون', 'richest man in babylon'],
		url: 'https://archive.org/download/the-richest-man-in-babylon-arabic/richest-man-babylon.pdf',
		sizeMb: '3.7'
	},
	{
		id: 'self_win_friends',
		category: 'cat_self_help',
		categoryName: '🧠 تطوير الذات والمال',
		title: 'كيف تؤثر على الآخرين وتكتسب الأصدقاء',
		author: 'ديل كارنيجي (Dale Carnegie)',
		year: 'فن التواصل والعلاقات',
		desc: 'الكتاب الذهبي في القيادة وبناء العلاقات الإنسانية الناجحة والمؤثرة.',
		keywords: ['كيف تؤثر على الاخرين', 'تكتسب الاصدقاء', 'ديل كارنيجي', 'dale carnegie'],
		url: 'https://archive.org/download/how-to-win-friends-arabic-carnegie/how-to-win-friends.pdf',
		sizeMb: '6.4'
	},
	{
		id: 'self_subconscious_mind',
		category: 'cat_self_help',
		categoryName: '🧠 تطوير الذات والمال',
		title: 'قوة عقلك الباطن',
		author: 'د. جوزيف ميرفي (Joseph Murphy)',
		year: 'علم النفس والقدرات الذهنية',
		desc: 'إطلاق الطاقات الكامنة في عقلك الباطن لتحقيق الصحة والوفرة والنجاح.',
		keywords: ['قوة عقلك الباطن', 'عقلك الباطن', 'جوزيف ميرفي', 'subconscious mind'],
		url: 'https://archive.org/download/power-of-subconscious-mind-arabic/subconscious-mind.pdf',
		sizeMb: '5.3'
	},

	// ── CATEGORY 5: أمهات الكتب الإسلامية والتاريخية (Islamic Classics) ─
	{
		id: 'islam_muqaddimah',
		category: 'cat_islamic_history',
		categoryName: '🕌 كتب إسلامية وتاريخية',
		title: 'مقدمة ابن خلدون (النسخة الكاملة)',
		author: 'عبد الرحمن بن خلدون',
		year: 'علم الاجتماع والعمران',
		desc: 'التأسيس التاريخي لعلم الاجتماع البشري وفلسفة قيام وسقوط الحضارات والدول.',
		keywords: ['مقدمة ابن خلدون', 'ابن خلدون', 'علم الاجتماع', 'عمران بشري', 'ibn khaldun'],
		url: 'https://archive.org/download/Muqaddimah_Ibn_Khaldun_Complete/Muqaddimah_Ibn_Khaldun.pdf',
		sizeMb: '18.5'
	},
	{
		id: 'islam_sahih_bukhari',
		category: 'cat_islamic_history',
		categoryName: '🕌 كتب إسلامية وتاريخية',
		title: 'صحيح البخاري (الجامع المسند الصحيح)',
		author: 'الإمام محمد بن إسماعيل البخاري',
		year: 'الحديث الشريف',
		desc: 'أصح كتاب بعد القرآن الكريم، مجموع الأحاديث النبوية الصحيحة كاملاً.',
		keywords: ['صحيح البخاري', 'البخاري', 'الحديث النبوي', 'sahih bukhari'],
		url: 'https://archive.org/download/Sahih-Al-Bukhari-Arabic-Full/Sahih-Bukhari.pdf',
		sizeMb: '28.0'
	},
	{
		id: 'islam_sahih_muslim',
		category: 'cat_islamic_history',
		categoryName: '🕌 كتب إسلامية وتاريخية',
		title: 'صحيح مسلم (المسند الصحيح المختصر)',
		author: 'الإمام مسلم بن الحجاج',
		year: 'الحديث الشريف',
		desc: 'ثاني أصح كتب الحديث النبوي الشريف بعد صحيح البخاري.',
		keywords: ['صحيح مسلم', 'مسلم', 'sahih muslim'],
		url: 'https://archive.org/download/Sahih-Muslim-Arabic-Full/Sahih-Muslim.pdf',
		sizeMb: '26.4'
	},
	{
		id: 'islam_riyad_salihin',
		category: 'cat_islamic_history',
		categoryName: '🕌 كتب إسلامية وتاريخية',
		title: 'رياض الصالحين من كلام سيد المرسلين',
		author: 'الإمام يحيى بن شرف النووي',
		year: 'الآداب والأخلاق النبوية',
		desc: 'موسوعة الأحاديث النبوية الشريفة في تهذيب النفوس والعبادات والمعاملات.',
		keywords: ['رياض الصالحين', 'النووي', 'الامام النووي', 'riyad salihin'],
		url: 'https://archive.org/download/Riyad-Al-Salihin-Nawawi/Riyad-Al-Salihin.pdf',
		sizeMb: '14.2'
	},
	{
		id: 'islam_raheeq_makhtum',
		category: 'cat_islamic_history',
		categoryName: '🕌 كتب إسلامية وتاريخية',
		title: 'الرحيق المختوم (بحث في السيرة النبوية)',
		author: 'الشيخ صفي الرحمن المباركفوري',
		year: 'السيرة النبوية العطرة',
		desc: 'الكتاب الأول عالمياً في السيرة النبوية، سرد دقيق وشامل لحياة النبي ﷺ.',
		keywords: ['الرحيق المختوم', 'المباركفوري', 'السيرة النبوية', 'سيرة الرسول'],
		url: 'https://archive.org/download/Ar-Raheeq-Al-Makhtum-Arabic/Ar-Raheeq-Al-Makhtum.pdf',
		sizeMb: '8.7'
	},
	{
		id: 'islam_li_annaka_allah',
		category: 'cat_islamic_history',
		categoryName: '🕌 كتب إسلامية وتاريخية',
		title: 'لأنك الله (رحلة إلى السماء السابعة)',
		author: 'علي بن جابر الفيفي',
		year: 'خواطر وتأملات إيمانية',
		desc: 'تأملات روحانية بديعة في معاني أسماء الله الحسنى وأثرها في تفاصيل حياتنا.',
		keywords: ['لانك الله', 'علي الفيفي', 'اسماء الله الحسنى'],
		url: 'https://archive.org/download/Li-Annaka-Allah-Fifi/Li-Annaka-Allah.pdf',
		sizeMb: '3.9'
	}
];

// ─────────────────────────────────────────────────────────────
// SEARCH FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * 1. Search Curated Mega-Catalogue (Local, Fast, 100% Reliable)
 */
function searchCuratedCatalogue(query) {
	const nq = normalizeText(query);
	if (!nq) return [];

	const tokens = nq.split(/\s+/).filter(Boolean);

	const scored = [];
	for (const item of CURATED_CATALOGUE) {
		const normTitle = normalizeText(item.title);
		const normAuthor = normalizeText(item.author);
		const normDesc = normalizeText(item.desc);
		const normKeywords = item.keywords.map(normalizeText);

		let score = 0;

		// Exact full phrase match
		if (normTitle.includes(nq)) score += 50;
		if (normAuthor.includes(nq)) score += 30;

		// Keyword match
		for (const kw of normKeywords) {
			if (kw === nq || nq === kw) score += 40;
			else if (kw.includes(nq) || nq.includes(kw)) score += 25;
		}

		// Individual token match
		for (const token of tokens) {
			if (token.length < 2) continue;
			if (normTitle.includes(token)) score += 15;
			if (normAuthor.includes(token)) score += 10;
			if (normDesc.includes(token)) score += 5;
			if (normKeywords.some(kw => kw.includes(token))) score += 12;
		}

		if (score > 0) {
			scored.push({
				source: item.categoryName || 'مكتبة حمزة اعمرني',
				id: item.id,
				title: item.title,
				author: item.author,
				url: item.url,
				sizeMb: item.sizeMb,
				desc: item.desc,
				score: score
			});
		}
	}

	scored.sort((a, b) => b.score - a.score);
	return scored;
}

/**
 * 2. Search Archive.org for PDF Books (with safe short timeout)
 */
async function searchArchiveBooks(query) {
	const cleanQuery = query.replace(/[\"\'\(\)\+\-\*\/\:\~\^\?\!]/g, ' ').trim();
	if (!cleanQuery) return [];

	let q = '(' + encodeURIComponent(cleanQuery) + ')+AND+mediatype:texts+AND+format:PDF';
	let url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=publicdate&fl[]=downloads&sort[]=downloads+desc&rows=6&output=json`;
	
	let docs = [];
	try {
		const res = await fetchWithTimeout(url, 10000);
		if (res.ok) {
			const data = await res.json();
			docs = data.response?.docs || [];
		}
	} catch (_) {}

	if (docs.length === 0) {
		q = '(' + encodeURIComponent(cleanQuery) + ')+AND+mediatype:texts';
		url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=downloads&sort[]=downloads+desc&rows=6&output=json`;
		try {
			const res = await fetchWithTimeout(url, 10000);
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
 * 3. Search Google Books API (covers millions of titles with preview/download info)
 */
async function searchGoogleBooks(query) {
	try {
		const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`;
		const res = await fetchWithTimeout(url, 10000);
		if (!res.ok) return [];
		const data = await res.json();
		const items = data.items || [];
		const results = [];
		for (const it of items) {
			const v = it.volumeInfo || {};
			const access = it.accessInfo || {};
			const title = v.title || '';
			if (!title) continue;
			const authors = (v.authors || []).join('، ');
			const pdfUrl = (access.pdf && access.pdf.isAvailable && access.pdf.downloadLink) ? access.pdf.downloadLink : (v.previewLink || v.infoLink || '');
			results.push({
				source: 'Google Books',
				id: 'gbooks_' + it.id,
				title: cleanBookTitle(title),
				author: authors || 'غير محدد',
				pageCount: v.pageCount ? `${v.pageCount} صفحة` : '',
				url: pdfUrl
			});
		}
		return results;
	} catch (_) {
		return [];
	}
}

/**
 * 4. Search Gutendex (Project Gutenberg) for classics
 */
async function searchGutenberg(term) {
	try {
		const res = await fetchWithTimeout(`https://gutendex.com/books?search=${encodeURIComponent(term)}`, 10000);
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
	const res = await fetchWithTimeout(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, 15000);
	if (!res.ok) throw new Error(`Metadata error HTTP ${res.status}`);
	const data = await res.json();
	const files = data.files || [];

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

// ─────────────────────────────────────────────────────────────
// MAIN COMMAND HANDLER
// ─────────────────────────────────────────────────────────────
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
				`⚠️ لم يتم العثور على جلسة بحث نشطة.\nيرجى البحث أولاً عن اسم الكتاب أو الدرس:\n← ${usedPrefix + command} <اسم الكتاب>`,
				`⚠️ ما كايناش جلسة بحث دابا.\nقلب على الكتاب ولا الدرس أولاً بـ:\n← ${usedPrefix + command} <سمية الكتاب>`
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
			if (downloadUrl && downloadUrl.startsWith('http')) {
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
						`📚 *كتاب: ${target.title}*\n━━━━━━━━━━━━━━━━━━━━\n✍️ *المؤلف / المرجع:* ${target.author || 'غير محدد'}\n💾 *الحجم:* ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)} ميغابايت\n⚡ *صانع البوت:* حمزة اعمرني (Hamza Amirni)\n📸 *إنستغرام:* @hamza_amirni_01`,
						`📚 *كتاب: ${target.title}*\n━━━━━━━━━━━━━━━━━━━━\n✍️ *الكاتب / المرجع:* ${target.author || 'غير محدد'}\n💾 *الحجم:* ${(pdfBuffer.length / (1024 * 1024)).toFixed(1)} MB\n⚡ *صممو:* Bot Hamza Amirni\n📸 *Instagram:* @hamza_amirni_01`
					)
				}, { quoted: m });
			} else {
				throw new Error('رابط التحميل غير متوفر بصيغة مباشرة.');
			}

		} catch (dlErr) {
			console.error('[KITAB DL ERROR]:', dlErr);
			await m.react('❌');
			return m.reply(t(
				`❌ Failed to download file: ${dlErr.message}\n${target.url ? `🔗 Direct Link: ${target.url}` : ''}`,
				`❌ تعذر تحميل ملف الـ PDF: ${dlErr.message}\n${target.url ? `🔗 رابط التحميل المباشر:\n${target.url}` : ''}`,
				`❌ وقع مشكل فالتيليشارجومون: ${dlErr.message}\n${target.url ? `🔗 ها هو الرابط ديريكت:\n${target.url}` : ''}`
			));
		}
	}

	// ── CASE 2: CATEGORY BROWSER (cat_...) ──────────────────────────────
	if (arg.startsWith('cat_')) {
		const matchedCat = CURATED_CATALOGUE.filter(b => b.category === arg);
		if (matchedCat.length > 0) {
			sessions.set(m.sender, { at: Date.now(), items: matchedCat.slice(0, 8) });

			const listStr = matchedCat.slice(0, 8).map((b, i) => {
				return `${i + 1}. 📖 *${b.title}*\n   ✍️ ${b.author} | 💾 ${b.sizeMb} MB\n   📝 ${b.desc}`;
			}).join('\n\n');

			const rows = matchedCat.slice(0, 8).map((b, i) => ({
				header: '',
				title: `${i + 1}. ${b.title.substring(0, 24)}`,
				description: `✍️ ${b.author.substring(0, 25)} | 💾 ${b.sizeMb}MB`,
				id: `${usedPrefix + command} ${i + 1}`
			}));

			const buttons = [
				{
					name: 'single_select',
					buttonParamsJson: JSON.stringify({
						title: t('📖 Select Document to Download', '📖 اختر ملفاً للتحميل (PDF)', '📖 اختار الملف للتحميل (PDF)'),
						sections: [{ title: matchedCat[0].categoryName, rows: rows }]
					})
				},
				{
					name: 'quick_reply',
					buttonParamsJson: JSON.stringify({
						display_text: `📥 تحميل: 1. ${matchedCat[0].title.substring(0, 16)}`,
						id: `${usedPrefix + command} 1`
					})
				}
			];

			const msg = t(
				`📚 *${matchedCat[0].categoryName}*\n━━━━━━━━━━━━━━━━━━━━\n\n${listStr}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *To Download:* Click the button below, or send *${usedPrefix + command} 1*`,
				`📚 *${matchedCat[0].categoryName}*\n━━━━━━━━━━━━━━━━━━━━\n\n${listStr}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *للتحميل المباشر:* اضغط على الزر بالأسفل أو أرسل الرقم: *${usedPrefix + command} 1*`,
				`📚 *${matchedCat[0].categoryName}*\n━━━━━━━━━━━━━━━━━━━━\n\n${listStr}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *باش التيليشارجي:* كليكي على البوطون لتحت ولا صيفط الرقم: *${usedPrefix + command} 1*`
			);

			try {
				return await conn.sendButton(
					m.chat,
					{
						text: msg,
						footer: `${global.namebot || 'Bot Hamza Amirni'} • @hamza_amirni_01`,
						buttons: buttons
					},
					{ quoted: m }
				);
			} catch (_) {
				return m.reply(msg);
			}
		}
	}

	// ── CASE 3: EMPTY QUERY (INTERACTIVE CATEGORY MENU & BUTTONS) ────────
	if (!arg) {
		const welcomeText = t(
			`📚 *Mega PDF Book, Novel & Course Library*\n━━━━━━━━━━━━━━━━━━━━\nDownload millions of books, novels, and Moroccan Bac lessons & summaries directly as PDF!\n\n*Quick Categories:*\n1️⃣ Moroccan Bac Novels (Antigone, Boîte à Merveilles, Candide...)\n2️⃣ Bac Summaries & Lessons (Philosophy, History, Maths, SVT...)\n3️⃣ Famous Novels (Arabic & International Bestsellers)\n4️⃣ Self-Help & Personal Finance Books\n5️⃣ Islamic Heritage & History Classics\n\n*Usage:*\n← ${usedPrefix + command} <book, novel or lesson name>\n_Example:_ ${usedPrefix + command} Antigone\n_Example:_ ${usedPrefix + command} دروس الفلسفة\n\n_Or choose from the categories below:_`,
			`📚 *مكتبة الكتب والروايات ودروس الباك الشاملة (PDF)*\n━━━━━━━━━━━━━━━━━━━━\nحمّل ملايين الكتب، الروايات، ودروس وملخصات الباكالوريا المغربية مباشرة بصيغة PDF على واتساب!\n\n*الأقسام المتوفرة:*\n1️⃣ 🎓 روايات الباكالوريا (Antigone، علبة العجائب، Candide...)\n2️⃣ 📚 ملخصات دروس الباك (فلسفة، اجتماعيات، رياضيات، SVT...)\n3️⃣ 📖 أشهر الروايات العربية والعالمية (قواعد العشق، الخيميائي، زيكولا...)\n4️⃣ 🧠 كتب تطوير الذات والمال (العادات الذرية، الأب الغني...)\n5️⃣ 🕌 أمهات الكتب الإسلامية والتاريخية (مقدمة ابن خلدون، رياض الصالحين...)\n\n*طريقة البحث:*\n← ${usedPrefix + command} <اسم الكتاب أو الرواية أو الدرس>\n_مثال:_ ${usedPrefix + command} Antigone\n_مثال:_ ${usedPrefix + command} ملخص الفلسفة\n_مثال:_ ${usedPrefix + command} العادات الذرية\n\n_أو تصفح الأقسام فوراً عبر القائمة بالأسفل:_`,
			`📚 *المكتبة الشاملة للكتب والروايات ودروس الباك PDF*\n━━━━━━━━━━━━━━━━━━━━\nتيليشارجي أي كتاب، رواية، ولا دروس وملخصات الباكالوريا المغربية PDF ديريكت فـ واتساب فابور!\n\n*الأقسام لي كاينين:*\n1️⃣ 🎓 روايات الباك (Antigone, Boîte à Merveilles, Candide...)\n2️⃣ 📚 ملخصات دروس الباك (فلسفة، اجتماعيات، ماط، SVT...)\n3️⃣ 📖 أشهر الروايات العربية والعالمية\n4️⃣ 🧠 كتب تطوير الذات والفلوس\n5️⃣ 🕌 كتب إسلامية وتاريخية\n\n*طريقة الاستعمال:*\n← ${usedPrefix + command} <سمية الكتاب ولا الدرس>\n_مثال:_ ${usedPrefix + command} Antigone\n_مثال:_ ${usedPrefix + command} دروس الفلسفة\n\n_أو اختار القسم لي بغيتي من القائمة لتحت:_`
		);

		const catRows = [
			{
				header: '',
				title: '🎓 روايات الباك (1 & 2 Bac)',
				description: 'Antigone, Boîte à Merveilles, Candide, Dernier Jour...',
				id: `${usedPrefix + command} cat_bac_novels`
			},
			{
				header: '',
				title: '📚 ملخصات ودروس الباكالوريا',
				description: 'فلسفة، اجتماعيات، إسلاميات، رياضيات، فيزياء، SVT...',
				id: `${usedPrefix + command} cat_bac_lessons`
			},
			{
				header: '',
				title: '📖 أشهر الروايات العالمية',
				description: 'قواعد العشق، الخيميائي، أرض زيكولا، 1984، البؤساء...',
				id: `${usedPrefix + command} cat_world_novels`
			},
			{
				header: '',
				title: '🧠 كتب تطوير الذات والمال',
				description: 'العادات الذرية، الأب الغني، فن اللامبالاة، بابل...',
				id: `${usedPrefix + command} cat_self_help`
			},
			{
				header: '',
				title: '🕌 كتب إسلامية وتاريخية',
				description: 'مقدمة ابن خلدون، صحيح البخاري، رياض الصالحين...',
				id: `${usedPrefix + command} cat_islamic_history`
			}
		];

		const categoryButtons = [
			{
				name: 'single_select',
				buttonParamsJson: JSON.stringify({
					title: t('📂 Browse Library Categories', '📂 تصفح أقسام المكتبة', '📂 اختار قسم من المكتبة'),
					sections: [
						{
							title: t('Book & Course Categories', 'أقسام الكتب والمقررات', 'أقسام الكتوبة والدروس'),
							rows: catRows
						}
					]
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '🎓 روايات الباكالوريا',
					id: `${usedPrefix + command} cat_bac_novels`
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '📚 ملخصات دروس الباك',
					id: `${usedPrefix + command} cat_bac_lessons`
				})
			},
			{
				name: 'cta_url',
				buttonParamsJson: JSON.stringify({
					display_text: '📸 Instagram @hamza_amirni_01',
					url: 'https://www.instagram.com/hamza_amirni_01'
				})
			}
		];

		try {
			return await conn.sendButton(
				m.chat,
				{
					text: welcomeText,
					footer: `${global.namebot || 'Bot Hamza Amirni'} • @hamza_amirni_01`,
					buttons: categoryButtons
				},
				{ quoted: m }
			);
		} catch (_) {
			return m.reply(welcomeText);
		}
	}

	// ── CASE 4: SEARCH QUERY (HYBRID MULTI-TIER ENGINE) ─────────────────
	await m.react('🔍');

	// Step 1: Search curated local catalogue first (instant, 100% precision)
	const curatedMatches = searchCuratedCatalogue(arg);

	// Step 2: Query Archive.org, Google Books & Gutenberg in parallel (with timeout)
	const [archiveRes, gbooksRes, gutenRes] = await Promise.all([
		searchArchiveBooks(arg).catch(() => []),
		searchGoogleBooks(arg).catch(() => []),
		/[a-zA-Z]/.test(arg) ? searchGutenberg(arg).catch(() => []) : Promise.resolve([])
	]);

	// Deduplicate and prioritize curated high-speed results
	const seenTitles = new Set();
	const merged = [];

	for (const item of [...curatedMatches, ...archiveRes, ...gbooksRes, ...gutenRes]) {
		const normT = normalizeText(item.title);
		if (!normT || seenTitles.has(normT)) continue;
		seenTitles.add(normT);
		merged.push(item);
		if (merged.length >= 8) break;
	}

	if (merged.length === 0) {
		await m.react('❌');
		return m.reply(t(
			`😕 No PDF books or courses found for "*${arg}*".\nTry using simpler keywords (e.g. Antigone, فلسفة, العادات الذرية).`,
			`😕 لم يتم العثور على كتب أو دروس مطابقة لـ "*${arg}*".\nجرّب كتابة كلمات أبسط (مثال: Antigone، ملخص الفلسفة، العادات الذرية).`,
			`😕 ما لقيت حتى كتاب ولا درس بـ "*${arg}*".\nجرب تكتب سمية مبسطة بحال: Antigone، دروس الفلسفة، العادات الذرية.`
		));
	}

	// Save active session for user
	sessions.set(m.sender, { at: Date.now(), items: merged });

	const formattedList = merged.map((b, i) => {
		const authorLine = b.author ? `\n   ✍️ ${b.author}` : '';
		const sizeLine = b.sizeMb ? ` | 💾 ${b.sizeMb} MB` : (b.pageCount ? ` | 📄 ${b.pageCount}` : '');
		const descLine = b.desc ? `\n   📝 ${b.desc}` : '';
		return `${i + 1}. 📖 *${b.title}*${authorLine}${sizeLine}${descLine}\n   🏛️ ${b.source}`;
	}).join('\n\n');

	// Construct interactive selection menu rows
	const rows = merged.map((b, i) => ({
		header: '',
		title: `${i + 1}. ${b.title.substring(0, 24)}`,
		description: `✍️ ${(b.author || b.source).substring(0, 25)}${b.sizeMb ? ` | 💾${b.sizeMb}M` : ''}`,
		id: `${usedPrefix + command} ${i + 1}`
	}));

	const buttonSections = [
		{
			title: t(`Available Books & Courses (${merged.length} results)`, `الكتب والدروس المتوفرة (${merged.length} نتيجة)`, `ليستة ديال الكتوبة والدروس (${merged.length} نتيجة)`),
			rows: rows
		}
	];

	const buttons = [
		{
			name: 'single_select',
			buttonParamsJson: JSON.stringify({
				title: t('📖 Select Document to Download (PDF)', '📖 اختر كتاباً أو درساً للتحميل (PDF)', '📖 اختار الكتاب ولا الدرس للتحميل (PDF)'),
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

	// Instagram CTA button
	buttons.push({
		name: 'cta_url',
		buttonParamsJson: JSON.stringify({
			display_text: '📸 Instagram',
			url: 'https://www.instagram.com/hamza_amirni_01'
		})
	});

	const summaryText = t(
		`📚 *Search Results for "${arg}":*\n━━━━━━━━━━━━━━━━━━━━\n\n${formattedList}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *To Download as PDF:* Tap the *Select Document* button below, or reply with the number: *${usedPrefix + command} 1*`,
		`📚 *نتائج البحث عن: "${arg}":*\n━━━━━━━━━━━━━━━━━━━━\n\n${formattedList}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *للتحميل بصيغة PDF:* اضغط على زر *اختر كتاباً أو درساً* بالأسفل، أو أرسل الرقم: *${usedPrefix + command} 1*`,
		`📚 *كتب ودروس لقيتها على: "${arg}":*\n━━━━━━━━━━━━━━━━━━━━\n\n${formattedList}\n\n━━━━━━━━━━━━━━━━━━━━\n⬇️ *باش التيليشارجيه PDF:* كليكي على البوطون ديال *اختار الكتاب* لتحت، ولا صيفط الرقم: *${usedPrefix + command} 1*`
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
						list_title: 'PDF Library',
						button_title: t('Select Document', 'اختر الملف', 'عزل الملف'),
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

handler.help = ['kitab <اسم الكتاب>', 'books <name>', 'dross <المادة/الدرس>', 'riwayat <الرواية>'];
handler.tags = ['downloader', 'tools'];
handler.command = /^(kitab|ktab|book|books|pdfbook|كتاب|كتب|رواية|روايات|novel|kutub|dross|dars|دروس|درس|cours|resume)$/i;

export default handler;
