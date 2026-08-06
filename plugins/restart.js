import { parentPort } from 'worker_threads';

let handler = async (m, { conn }) => {
	const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
	const t = (en, ar, da) => userLang === 'english' ? en : userLang === 'arabic' ? ar : da;

	if (!parentPort) {
		throw t(
			'❌ Wrong launch! Use: *node index.js*',
			'❌ طريقة الإطلاق خاطئة! استخدم: *node index.js*',
			'❌ الطريقة غلط! استعمل: *node index.js*'
		);
	}

	if (global.conn.user.jid == conn.user.jid) {
		await m.reply(t(
			'🔄 *Restarting bot... Please wait a moment!*',
			'🔄 *جارٍ إعادة تشغيل البوت... انتظر لحظة!*',
			'🔄 *كنعيدو تشغيل البوت... صبر شوية!*'
		));
		parentPort.postMessage('restart');
	} else {
		throw t(
			'❌ You cannot restart this bot instance.',
			'❌ لا يمكنك إعادة تشغيل هذا البوت.',
			'❌ ما يمكنكش تعيد تشغيل هاد البوت.'
		);
	}
};

handler.help = ['restart'];
handler.tags = ['owner'];
handler.command = /^(res(tart)?)$/i;
handler.owner = true;

export default handler;
