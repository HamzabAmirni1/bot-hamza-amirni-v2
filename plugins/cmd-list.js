let handler = async (m, { conn }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	const entries = Object.entries(global.db.data.sticker || {});

	if (!entries.length) {
		return m.reply(t(
			'📭 No custom commands found.',
			'📭 لا توجد أوامر مخصصة حتى الآن.',
			'📭 ما كاين حتى أمر مخصص الدرك.'
		));
	}

	const header = t('📋 *CUSTOM COMMAND LIST*', '📋 *قائمة الأوامر المخصصة*', '📋 *قائمة الأوامر المخصصة*');
	const list = entries
		.map(([key, value], index) => `*${index + 1}.* ${value.locked ? '🔒 ' : ''}${key}\n   └ ${value.text?.substring(0, 60) || ''}`)
		.join('\n\n');

	conn.reply(
		m.chat,
		`${header}\n━━━━━━━━━━━━━━━━━━━━━\n\n${list}`,
		null,
		{
			mentions: Object.values(global.db.data.sticker)
				.map((x) => x.mentionedJid)
				.reduce((a, b) => [...a, ...b], []),
		}
	);
};

handler.help = ['listcmd'];
handler.tags = ['database'];
handler.command = ['listcmd'];

export default handler;