let handler = async (m, { args, usedPrefix, command }) => {
	let reqUser = global.db.data.users[m.sender] || {};
	let lang = reqUser.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	let who;

	if (m.quoted) {
		who = m.quoted.sender;
	} else if (m.isGroup) {
		who = m.mentionedJid[0]
			? m.mentionedJid[0]
			: m.quoted
			? m.quoted.sender
			: args[1]
			? args[1]
			: false;
	} else if (args[1]) {
		who = args[1] + '@s.whatsapp.net';
	}

	if (!who) throw t('Who do you want to change the premium status for?', 'من المستخدم الذي تريد تغيير حالته الممتازة (Premium)؟', 'شكون المستخدم اللي باغي تبدل ليه حالة البريميوم؟');

	let user = db.data.users[who];

	switch (command) {
		case 'addprem':
		case 'tambahprem':
		case '+prem':
			if (!args[0]) throw t(
				'How many days?\nExample:\n.addprem 30 @user',
				'كم عدد الأيام؟\nمثال:\n← .addprem 30 @user',
				'شحال من نهار؟\nمثال:\n← .addprem 30 @user'
			);

			if (args[0] == 'permanent') {
				user.premium = true;
				user.premiumTime = null;

				await m.reply(
					t(
						`✅ *Success*\n\n*Name:* ${user.name}\n*Premium Status:* Permanent\n*Date:* ${new Date().toLocaleDateString()}`,
						`✅ *تم بنجاح*\n\n*الاسم:* ${user.name}\n*حالة البريميوم:* دائم\n*التاريخ:* ${new Date().toLocaleDateString()}`,
						`✅ *تم بنجاح*\n\n*الاسم:* ${user.name}\n*حالة البريميوم:* دائم (مدى الحياة)\n*التاريخ:* ${new Date().toLocaleDateString()}`
					)
				);

				await conn.reply(
					who,
					t(
						`✨ *Premium Status Granted!*\n\n*Name:* ${user.name}\n*Status:* Permanent`,
						`✨ *تم منحك العضوية الممتازة (Premium)!*\n\n*الاسم:* ${user.name}\n*الحالة:* دائم`,
						`✨ *مبروك! وليتي مستخدم بريميوم (Premium)!*\n\n*الاسم:* ${user.name}\n*الحالة:* دائم (مدى الحياة)`
					),
					null
				);
			} else {
				if (isNaN(args[0]))
					throw t(
						`⚠️ Numbers only!\n\nExample:\n${usedPrefix + command} 30 @${m.sender.split`@`[0]}`,
						`⚠️ أرقام فقط!\n\nمثال:\n← ${usedPrefix + command} 30 @${m.sender.split`@`[0]}`,
						`⚠️ كتب غير الأرقام أ عشيري!\n\nمثال:\n← ${usedPrefix + command} 30 @${m.sender.split`@`[0]}`
					);

				let txt = args[0];
				let jumlahHari = 86400000 * txt;

				let now = new Date();

				if (now < user.premiumTime) {
					user.premiumTime += jumlahHari;
				} else {
					user.premiumTime = now.getTime() + jumlahHari;
				}

				user.premium = true;

				let expirationDate = new Date(
					user.premiumTime
				).toLocaleDateString();

				await m.reply(
					t(
						`✅ *Success*\n\n*Name:* ${user.name}\n*Duration:* ${txt} Days\n*Expires:* ${expirationDate}`,
						`✅ *تم بنجاح*\n\n*الاسم:* ${user.name}\n*المدة:* ${txt} يوم\n*تاريخ الانتهاء:* ${expirationDate}`,
						`✅ *تم بنجاح*\n\n*الاسم:* ${user.name}\n*المدة:* ${txt} يوم\n*تاريخ الانتهاء:* ${expirationDate}`
					)
				);

				await conn.reply(
					who,
					t(
						`✨ *Premium Status Activated!*\n\n*Duration:* ${txt} Days\n*Expires:* ${expirationDate}`,
						`✨ *تم تفعيل العضوية الممتازة (Premium)!*\n\n*المدة:* ${txt} يوم\n*تاريخ الانتهاء:* ${expirationDate}`,
						`✨ *مبروك! فعلنا لك العضوية الممتازة (Premium)!*\n\n*المدة:* ${txt} يوم\n*تاريخ الانتهاء:* ${expirationDate}`
					),
					null
				);
			}
			break;

		case 'delprem':
		case 'hapusprem':
		case '-prem':
			user.premium = false;
			user.premiumTime = 0;

			await m.reply(
				t(
					`⚠️ *Premium Removed*\n\n*Name:* ${user.name}`,
					`⚠️ *تم إلغاء العضوية الممتازة*\n\n*الاسم:* ${user.name}`,
					`⚠️ *تحيدات العضوية الممتازة*\n\n*الاسم:* ${user.name}`
				)
			);

			await conn.reply(
				who,
				t(
					`⚠️ *Premium Status Expired/Removed.*`,
					`⚠️ *تم إلغاء العضوية الممتازة الخاصة بك.*`,
					`⚠️ *تحيدات لك العضوية الممتازة.*`
				),
				null
			);
			break;

		default:
			throw t('Invalid command.', 'أمر غير صالح.', 'أمر ما صحيحش.');
	}
};

handler.help = ['addprem', 'delprem'];
handler.tags = ['owner'];
handler.command = /^(add|tambah|\+|del|hapus|-)p(rem)?$/i;
handler.group = false;
handler.owner = true;

export default handler;