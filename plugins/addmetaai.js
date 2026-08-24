//~ Ahmad tumbuh kembang — translated by bot amirni hamza
let handler = async (m, { conn }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	const groupJid = m.chat;

	if (!groupJid.endsWith('@g.us')) {
		return m.reply(t(
			'❌ This command only works in groups!',
			'❌ هذا الأمر يعمل فقط في المجموعات!',
			'❌ هاد الأمر مخصص غير للجروبات!'
		));
	}

	try {
		await m.react('🤖');
		await conn.groupParticipantsUpdate(groupJid, ['867051314767696@bot'], 'add');

		m.reply(t(
			'✅ *Meta AI added to group successfully!*',
			'✅ *تمت إضافة Meta AI إلى المجموعة بنجاح!*',
			'✅ *تم إضافة Meta AI للجروب بنجاح!*'
		));
	} catch (e) {
		console.error(e);
		m.reply(t(
			`❌ Failed to add Meta AI: ${e?.message || e}`,
			`❌ فشل إضافة Meta AI: ${e?.message || e}`,
			`❌ ما قدرناش نضيفو Meta AI: ${e?.message || e}`
		));
	}
};

handler.help = ['addmetaai'];
handler.tags = ['ai', 'group'];
handler.command = /^(addmetaai)$/i;
handler.owner = true;

export default handler;
