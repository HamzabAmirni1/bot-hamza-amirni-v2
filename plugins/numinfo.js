import PhoneNumber from 'awesome-phonenumber';

// Moroccan Mobile & Fixed Prefix Mapping based on ANRT specifications
const MOROCCAN_OPERATORS = [
	{ name: 'Maroc Telecom (IAM)', emoji: '🔴', prefixes: ['0610', '0611', '0612', '0613', '0614', '0615', '0616', '0617', '0618', '0620', '0621', '0622', '0623', '0624', '0628', '0636', '0637', '0638', '0639', '0641', '0642', '0643', '0648', '0650', '0651', '0652', '0653', '0654', '0655', '0658', '0659', '0661', '0662', '0666', '0667', '0668', '0670', '0671', '0672', '0673', '0676', '0677', '0678', '0679', '0682', '0688', '0700', '0701', '0702', '0707', '0708', '0761', '0762', '0766', '0767', '0768'] },
	{ name: 'Orange Maroc', emoji: '🟠', prefixes: ['0619', '0625', '0631', '0632', '0644', '0645', '0649', '0656', '0657', '0660', '0663', '0669', '0674', '0675', '0680', '0681', '0690', '0710', '0711', '0712', '0713', '0714', '0715', '0716', '0717', '0718', '0719', '0760', '0763', '0769', '0770', '0771', '0772', '0773', '0774'] },
	{ name: 'Inwi (Wana Corporate)', emoji: '🟣', prefixes: ['0626', '0627', '0629', '0630', '0633', '0634', '0635', '0640', '0646', '0647', '0684', '0687', '0689', '0699', '0703', '0704', '0705', '0706', '0709', '0764', '0765', '0775', '0776', '0777', '0778', '0779'] },
	// Fixed lines
	{ name: 'Maroc Telecom (Fixe)', emoji: '☎️', prefixes: ['0520', '0521', '0522', '0523', '0524', '0528', '0530', '0531', '0532', '0533', '0534', '0537', '0538', '0539'] },
	{ name: 'Inwi (Fixe)', emoji: '☎️', prefixes: ['0529', '0532', '0538', '0550'] },
	{ name: 'Orange (Fixe)', emoji: '☎️', prefixes: ['0521', '0525', '0527', '0531', '0533'] }
];

// Moroccan Regional Landlines Mapping
const MOROCCAN_REGIONS = {
	'0522': 'الدار البيضاء الكبرى (Casablanca)',
	'0523': 'سطات، المحمدية، بنسليمان، برشيد',
	'0524': 'مراكش، الصويرة، ورزازات، آسفي',
	'0528': 'أكادير، العيون، الداخلة، كلميم، تارودانت',
	'0535': 'فاس، مكناس، تازة، إفران',
	'0536': 'وجدة، بركان، الناظور، تاوريرت',
	'0537': 'الرباط، سلا، تمارة، القنيطرة، الخميسات',
	'0539': 'طنجة، تطوان، العرائش، الحسيمة، أصيلة'
};

function getMoroccoOperator(cleanNum) {
	let local = cleanNum;
	if (local.startsWith('212')) local = '0' + local.slice(3);
	if (!local.startsWith('0')) local = '0' + local;

	const prefix4 = local.slice(0, 4);
	for (const op of MOROCCAN_OPERATORS) {
		if (op.prefixes.includes(prefix4)) {
			return `${op.emoji} *${op.name}*`;
		}
	}
	return '🇲🇦 شبكة اتصالات وطنية';
}

function getMoroccoRegion(cleanNum) {
	let local = cleanNum;
	if (local.startsWith('212')) local = '0' + local.slice(3);
	const p4 = local.slice(0, 4);
	return MOROCCAN_REGIONS[p4] || 'المملكة المغربية 🇲🇦';
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
	let rawInput = text;

	// If no text, check if replied to a user or message
	if (!rawInput && m.quoted) {
		rawInput = m.quoted.sender ? m.quoted.sender.split('@')[0] : m.quoted.text;
	}

	if (!rawInput) {
		return m.reply(
			`📞 *كاشف معلومات الأرقام (Number Info & Caller)*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			`كشف معلومات أي رقم هاتف (الشركة المشغلة، المدينة، والتحقق من حساب الواتساب والبيو).\n\n` +
			`📌 *طريقة الاستعمال:*\n` +
			`← ${usedPrefix + command} 06xxxxxxxx\n` +
			`← ${usedPrefix + command} +2126xxxxxxxx\n` +
			`← أو قم بالرد (Reply) على رسالة أي شخص واكتب: *${usedPrefix + command}*\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	await m.react('🔍');

	let clean = rawInput.replace(/[^0-9]/g, '');
	if (clean.startsWith('00')) clean = clean.slice(2);
	if (clean.startsWith('0') && clean.length === 10) {
		clean = '212' + clean.slice(1);
	}

	const pn = PhoneNumber('+' + clean);
	const isValid = pn.isValid();
	const countryCode = pn.getRegionCode() || (clean.startsWith('212') ? 'MA' : 'Unknown');
	const intFormat = pn.getNumber('international') || ('+' + clean);
	const natFormat = pn.getNumber('national') || clean;
	const numType = pn.getNumberType() || 'mobile';

	let operator = 'غير محدد';
	let location = 'غير محدد';

	if (clean.startsWith('212') || countryCode === 'MA') {
		operator = getMoroccoOperator(clean);
		location = getMoroccoRegion(clean);
	} else {
		operator = `شبكة دولية (${countryCode})`;
		location = countryCode;
	}

	// Check WhatsApp Account Status via Baileys
	let waStatus = '❌ غير مسجل في واتساب';
	let waBio = 'لا يوجد';
	let hasProfilePic = false;
	const jid = `${clean}@s.whatsapp.net`;

	try {
		const onWa = await conn.onWhatsApp(jid);
		if (onWa && onWa.length > 0 && onWa[0].exists) {
			waStatus = '✅ متصل ومفعل على واتساب';
			try {
				const bioRes = await conn.fetchStatus(jid);
				if (bioRes && bioRes.status) waBio = bioRes.status;
			} catch (_) {}
			try {
				const picUrl = await conn.profilePictureUrl(jid, 'image');
				if (picUrl) hasProfilePic = true;
			} catch (_) {}
		}
	} catch (_) {}

	const typeLabel = numType === 'mobile' ? '📱 هاتف محمول (Mobile)' : numType === 'fixed-line' ? '☎️ هاتف ثابت (Fixe)' : '📡 خط رقمي/افتراضي';

	const replyText =
		`📋 *معلومات الرقم الهاتف:* \`${intFormat}\`\n` +
		`━━━━━━━━━━━━━━━━━━━━\n` +
		`🏷️ *الصيغة المحلية:* \`${natFormat}\`\n` +
		`🌍 *الدولة:* ${countryCode === 'MA' ? 'المغرب 🇲🇦' : countryCode}\n` +
		`📶 *المشغّل / الشركة:* ${operator}\n` +
		`📍 *المنطقة / المدينة:* ${location}\n` +
		`🔌 *نوع الخط:* ${typeLabel}\n` +
		`✔️ *صحة الرقم:* ${isValid ? 'رقم حقيقي وصحيح 🟢' : 'صيغة غير قياسية ⚠️'}\n` +
		`━━━━━━━━━━━━━━━━━━━━\n` +
		`💬 *حالة الواتساب:* ${waStatus}\n` +
		`📝 *الـ Bio / الحالة:* ${waBio}\n` +
		`🖼️ *الصورة الشخصية:* ${hasProfilePic ? 'متوفرة 👤' : 'غير متوفرة أو مخفية'}\n` +
		`🔗 *رابط المراسلة المباشر:*\nhttps://wa.me/${clean}\n` +
		`━━━━━━━━━━━━━━━━━━━━\n` +
		`⚡ *bot amirni hamza*`;

	await m.react('✅');
	return m.reply(replyText);
};

handler.help = ['numinfo <رقم>'];
handler.tags = ['tools', 'search'];
handler.command = /^(numinfo|numberinfo|whoisnumber|caller|num)$/i;

export default handler;
