import { createHash } from 'crypto';

let Reg = /\|?(.*)([.|] *?)([0-9]*)$/i;

let handler = async function (m, { text, usedPrefix }) {
	let user = global.db.data.users[m.sender];
	let lang = user.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	const pp = await conn.profilePictureUrl(m.sender, 'image', 'buffer');

	if (user.registered === true)
		throw t(
			`You are already registered! Re-register? Use *${usedPrefix}unreg*`,
			`أنت مسجل بالفعل! هل تريد إعادة التسجيل؟ استخدم *${usedPrefix}unreg*`,
			`ديجا مسجل! باغي تعاود؟ استخدم *${usedPrefix}unreg*`
		);

	if (!Reg.test(text))
		throw t(
			`Enter your name and age.\n\nExample:\n.register John.17`,
			`أدخل اسمك وعمرك.\n\n*مثال:*\n← .register أحمد.17`,
			`داخل سميتك وعمرك.\n\n*مثال:*\n← .register حمزة.20`
		);

	let [_, name, _splitter, age] = text.match(Reg);

	if (!name) throw t('Name cannot be empty', 'لا يمكن أن يكون الاسم فارغاً', 'الاسم ما يكونش فارغ');
	if (!age) throw t('Age cannot be empty', 'لا يمكن أن يكون العمر فارغاً', 'العمر ما يكونش فارغ');

	age = parseInt(age);

	if (age > 50) throw t('Too old to register!', 'العمر كبير جداً!', 'كبار علينا ضرك 😅');
	if (age < 12) throw t('Must be at least 12 years old', 'يجب أن تكون 12 عاماً على الأقل', 'خاصك تكون 12 سنة على الأقل');

	user.name = name.trim();
	user.age = age;
	user.regTime = Date.now();
	user.registered = true;

	user.axe = 1;
	user.axedurability = 30;

	user.pickaxe = 1;
	user.pickaxedurability = 40;

	let sn = createHash('md5').update(m.sender).digest('hex');

	let cap = t(
		`─── USER INFO ───\n• Name: ${name}\n• Age: ${age} Years\n• Status: Registered ✅\n• Serial: ${sn}\n\n── STARTER PACK ──\n• Axe: 1 (30 Durability)\n• Pickaxe: 1 (40 Durability)`,
		`─── معلومات المستخدم ───\n• الاسم: ${name}\n• العمر: ${age} سنة\n• الحالة: مسجل ✅\n• الرمز: ${sn}\n\n── حزمة البداية ──\n• فأس: 1 (30 متانة)\n• معول: 1 (40 متانة)`,
		`─── معلومات المستخدم ───\n• الاسم: ${name}\n• العمر: ${age} سنة\n• الحالة: مسجل ✅\n• الكود: ${sn}\n\n── باكو البداية ──\n• فأس: 1 (متانة 30)\n• معول: 1 (متانة 40)`
	);

	conn.adReply(m.chat, cap, pp, m, {
		title: t('Registration Successful ✅', 'تم التسجيل بنجاح ✅', 'تسجلتي بنجاح ✅'),
		body: t(
			'You are user number ' + Object.values(db.data.users).filter((v) => v.registered == true).length,
			'أنت المستخدم رقم ' + Object.values(db.data.users).filter((v) => v.registered == true).length,
			'أنت المستخدم رقم ' + Object.values(db.data.users).filter((v) => v.registered == true).length
		),
	});
};

handler.help = ['register '];
handler.tags = ['infobot'];
handler.command = /^(register|verify|reg(ister)?)$/i;
export default handler;