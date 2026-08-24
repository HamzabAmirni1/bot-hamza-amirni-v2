let handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin }) => {
	let reqUser = global.db.data.users[m.sender] || {};
	let lang = reqUser.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	const isEnable = /^(true|enable|(turn)?on|1)$/i.test(command);
	const chat = global.db.data.chats[m.chat];
	const user = global.db.data.users[m.sender];
	const settings = global.db.data.settings[conn.user.jid];
	let type = (args[0] || '').toLowerCase();
	let isAll = false;
	let isUser = false;

	switch (type) {
		case 'welcome':
			if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn);
			chat.welcome = isEnable;
			break;

		case 'detect':
			if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn);
			chat.detect = isEnable;
			break;

		case 'antidelete':
		case 'delete':
			if (m.isGroup && !(isAdmin || isOwner)) return global.dfail('admin', m, conn);
			chat.delete = isEnable;
			break;

		case 'autolevelup':
			isUser = true;
			user.autolevelup = isEnable;
			break;

		case 'autoread':
			isAll = true;
			if (!isOwner) return global.dfail('owner', m, conn);
			settings.autoread = isEnable;
			break;

		case 'public':
			isAll = true;
			if (!isOwner) return global.dfail('owner', m, conn);
			settings.public = isEnable;
			break;

		case 'gconly':
		case 'grouponly':
			isAll = true;
			if (!isOwner) return global.dfail('owner', m, conn);
			settings.gconly = isEnable;
			break;

		case 'anticall':
			isAll = true;
			if (!isOwner) return global.dfail('owner', m, conn);
			settings.anticall = isEnable;
			break;

		default:
			if (!/[01]/.test(command)) {
				const optList = t(
`⚙️ *List of configurable options:*

*For Users:*
- autolevelup

*For Group Admins:*
- welcome
- detect
- antidelete
${isOwner ? '*For Bot Owners:*\n- autoread\n- public\n- anticall\n- gconly\n' : ''}
*Usage examples:*
- ${usedPrefix}enable welcome
- ${usedPrefix}disable welcome`,

`⚙️ *قائمة الخيارات القابلة للتعديل:*

*للمستخدمين:*
- autolevelup

*لمشرفي المجموعات:*
- welcome (الترحيب)
- detect (إشعارات التغيير)
- antidelete (حفظ الممسوحات)
${isOwner ? '*لمالك البوت:*\n- autoread\n- public\n- anticall\n- gconly\n' : ''}
*أمثلة الاستخدام:*
← ${usedPrefix}enable welcome
← ${usedPrefix}disable welcome`,

`⚙️ *قائمة الخيارات المتاحة:*

*للمستخدمين:*
- autolevelup

*لأدمن المجموعة:*
- welcome (الترحيب)
- detect (التغييرات)
- antidelete (منع حظر الرسائل)
${isOwner ? '*لمالك البوت:*\n- autoread\n- public\n- anticall\n- gconly\n' : ''}
*أمثلة الاستخدام:*
← ${usedPrefix}enable welcome
← ${usedPrefix}disable welcome`
				);
				return m.reply(optList.trim());
			}

			throw false;
	}

	const statusTxt = isEnable ? t('enabled', 'تفعيله', 'تفعيله') : t('disabled', 'تعطيله', 'تعطيله');
	const targetTxt = isAll ? t('for the bot', 'للبوت بالكامل', 'للبوت كاملاً') : isUser ? '' : t('for this chat', 'لهذه المحادثة', 'لهاد الشات');

	m.reply(
		t(
			`*${type}* has been successfully *${statusTxt}* ${targetTxt}`,
			`تم *${statusTxt}* الخيار *${type}* بنجاح ${targetTxt}`,
			`تم *${statusTxt}* الخيار *${type}* بنجاح ${targetTxt}`
		)
	);
};

handler.help = ['enable', 'disable'];
handler.tags = ['group', 'owner'];
handler.command = /^((en|dis)able|(true|false)|(turn)?(on|off)|[01])$/i;

export default handler;