async function handler(m) {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!m.quoted) {
		throw t(
			'❌ Please reply to a message first!',
			'❌ يرجى الرد على رسالة أولاً!',
			'❌ ريبوندي على شي ميساج أولاً!'
		);
	}

	let q = await m.getQuotedObj();

	if (!q.quoted) {
		throw t(
			'❌ The message you replied to does not contain a quoted reply!',
			'❌ الرسالة التي رددت عليها لا تحتوي على ردٍّ مقتبس!',
			'❌ الميساج اللي ريبوندتي عليه ما فيه ريبوند!'
		);
	}

	await q.quoted.copyNForward(m.chat, true);
}

handler.help = ['quoted'];
handler.tags = ['tools'];
handler.command = /^(quoted|q)$/i;

export default handler;