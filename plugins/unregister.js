import { createHash } from 'crypto';

let handler = async function (m, { args, usedPrefix }) {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	const user = global.db.data.users[m.sender];
	const sn = createHash('md5').update(m.sender).digest('hex');

	if (!args[0]) {
		throw t(
			`❌ Please provide your serial number to unregister.\nExample: *${usedPrefix}unreg ${sn}*`,
			`❌ يرجى إدخال رمزك الشخصي لإلغاء التسجيل.\nمثال: *${usedPrefix}unreg ${sn}*`,
			`❌ داخل الكود الخاص بيك باش تلغي التسجيل.\nمثال: *${usedPrefix}unreg ${sn}*`
		);
	}

	if (args[0] !== sn) {
		throw t(
			'❌ Wrong serial number! Check your code with *.register* command.',
			'❌ رمز خاطئ! تحقق من رمزك الشخصي عبر أمر\n← *.register*',
			'❌ الكود غلط! شوف الكود ديالك من خلال\n← *.register*.'
		);
	}

	user.registered = false;
	user.name = '';
	user.age = 0;

	m.reply(t(
		'✅ *You have been successfully unregistered.*\nYou can register again with *.register*',
		'✅ *تم إلغاء تسجيلك بنجاح.*\nتقدر تسجل مجدداً عبر:\n← *.register*',
		'✅ *تم إلغاء تسجيلك بنجاح.*\nتقدر تسجل من جديد بـ:\n← *.register*'
	));
};

handler.help = ['unregister'];
handler.tags = ['infobot'];
handler.command = /^unreg(ister)?$/i;
handler.register = false;

export default handler;