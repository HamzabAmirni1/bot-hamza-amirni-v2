const handler = async (m, { conn, text, participants, groupMetadata, command }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';

	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	const target = m.quoted
		? m.quoted.sender
		: m.mentionedJid && m.mentionedJid[0]
		? m.mentionedJid[0]
		: text
		? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
		: null;

	const cmd = ['add', 'kick', 'promote', 'demote'];

	if (cmd.includes(command) && !target)
		throw t('Reply/tag the user you want to process.', 'رد على المستخدم أو اذكره لتنفيذ الأمر.', 'ريبوندي على الشخص ولا تاكه باش نخدم الأمر.');

	const inGc = participants.some(
		(v) => v.jid == target || v.id === target || v.phoneNumber === target
	);

	switch (command) {
		case 'add':
			{
				if (inGc) throw t('User is already in the group!', 'المستخدم موجود بالفعل في المجموعة!', 'هاد الشخص كايجي ديجا فالقروب!');
				const response = await conn.groupParticipantsUpdate(
					m.chat,
					[target],
					'add'
				);

				const jpegThumbnail = await conn.profilePictureUrl(
					m.chat,
					'image',
					'buffer'
				);

				for (const participant of response) {
					const jid =
						participant.content.attrs.phone_number ||
						participant.content.attrs.jid;

					const status = participant.status;

					if (status === '408') {
						m.reply(t(
							`Cannot add @${jid.split('@')[0]}! They may have recently left or been kicked.`,
							`تعذر إضافة @${jid.split('@')[0]}! ربما غادر أو أُخرج مؤخراً.`,
							`ماقدرناش نضيف @${jid.split('@')[0]} ربما خرج من القروب بكري.`
						));
					} else if (status === '403') {
						const inviteCode = participant.content.content[0].attrs.code;
						const inviteExp = participant.content.content[0].attrs.expiration;

						await m.reply(t(
							`Inviting @${jid.split('@')[0]} via invite link...`,
							`جارٍ دعوة @${jid.split('@')[0]} عبر رابط الدعوة...`,
							`كنصيفطو لينفيتاسيون لـ @${jid.split('@')[0]} باللينك...`
						));

						await conn.sendGroupV4Invite(
							m.chat,
							jid,
							inviteCode,
							inviteExp,
							groupMetadata.subject,
							t('Invitation to join my WhatsApp group', 'دعوة للانضمام إلى مجموعة واتساب', 'دعوة ديال القروب'),
							jpegThumbnail
						);
					}
				}
			}
			break;

		case 'kick':
			if (!inGc) throw t('User is not in the group.', 'المستخدم ليس في المجموعة.', 'هاد الشخص ماشي فالقروب.');
			conn.groupParticipantsUpdate(m.chat, [target], 'remove');
			m.reply(t(`✅ Successfully kicked: @${target.split('@')[0]}`, `✅ تم إخراج: @${target.split('@')[0]}`, `✅ تخرج بنجاح: @${target.split('@')[0]}`));
			break;

		case 'promote':
			if (!inGc) throw t('User is not in the group!', 'المستخدم ليس في المجموعة!', 'هاد الشخص ماشي فالقروب!');
			conn.groupParticipantsUpdate(m.chat, [target], 'promote');
			m.reply(t(`✅ Promoted to admin: @${target.split('@')[0]}`, `✅ تمت ترقيته لمشرف: @${target.split('@')[0]}`, `✅ صار أدمين: @${target.split('@')[0]}`));
			break;

		case 'demote':
			if (!inGc) throw t('User is not in the group!', 'المستخدم ليس في المجموعة!', 'هاد الشخص ماشي فالقروب!');
			conn.groupParticipantsUpdate(m.chat, [target], 'demote');
			m.reply(t(`✅ Demoted from admin: @${target.split('@')[0]}`, `✅ تم خفض رتبته: @${target.split('@')[0]}`, `✅ تنزل من الإدارة: @${target.split('@')[0]}`));
			break;

		case 'closegc':
		case 'mute':
			conn.groupSettingUpdate(m.chat, 'announcement');
			m.reply(t(
				'🔒 Group closed — only admins can send messages.',
				'🔒 تم إغلاق المجموعة — المشرفون فقط يمكنهم الإرسال.',
				'🔒 القروب تسكر — غير الأدمينية كيقدرو يكتبو.'
			));
			break;

		case 'opengc':
		case 'unmute':
			conn.groupSettingUpdate(m.chat, 'not_announcement');
			m.reply(t(
				'🔓 Group opened — all members can send messages.',
				'🔓 تم فتح المجموعة — جميع الأعضاء يمكنهم الإرسال.',
				'🔓 القروب يتفتح — جميع الأعضاء كيقدرو يكتبو.'
			));
			break;

		default:
			return m.reply(t('Unknown command.', 'أمر غير معروف.', 'أمر ماعرفتوش.'));
	}
};

handler.help = [
	'add @user',
	'kick @user',
	'promote @user',
	'demote @user',
	'opengc',
	'closegc',
	'mute',
	'unmute'
];

handler.tags = ['group'];

handler.command =
	/^(add|kick|promote|demote|mute|unmute|opengc|closegc)$/i;

handler.admin = true;
handler.group = true;
handler.botAdmin = true;
export default handler;