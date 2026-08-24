import os from 'os';

let handler = async (m) => {
	const start = Date.now();
	await m.react('🚀');

	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';

	const totalMem = os.totalmem();
	const freeMem = os.freemem();
	const usedMem = totalMem - freeMem;
	const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
	const speed = Date.now() - start;
	const uptime = toTime(process.uptime() * 1000);
	const memStr = `${formatSize(usedMem)} / ${formatSize(totalMem)} (${memPercent}%)`;

	let cap = '';
	if (lang === 'darija') {
		cap = `⚡ *سرعة واستجابة البوت* 🚀
━━━━━━━━━━━━━━━━━━━━━

🏎️ *السرعة:* ${speed} ms (مريقل وطاير كي الساروح! 🚀)
⏱️ *مدة التشغيل:* ${uptime}
📊 *الذاكرة (RAM):* ${memStr}
💻 *المعالج:* ${os.cpus()[0].model}

💡 البوت خدام معاك 24/7 بالنشاط والضحك أ عشيري! 😂
⚡ *bot amirni hamza*`;
	} else if (lang === 'arabic') {
		cap = `⚡ *سرعة البوت والمعلومات* 🚀
━━━━━━━━━━━━━━━━━━━━━

🏎️ *سرعة الاستجابة:* ${speed} ملي ثانية
⏱️ *مدة التشغيل:* ${uptime}
📊 *استهلاك الذاكرة:* ${memStr}
💻 *المعالج:* ${os.cpus()[0].model}

⚡ *bot amirni hamza*`;
	} else {
		cap = `⚡ *Bot Status & Ping* 🚀
━━━━━━━━━━━━━━━━━━━━━

🏎️ *Response Speed:* ${speed} ms
⏱️ *Uptime:* ${uptime}
📊 *Memory Usage:* ${memStr}
💻 *CPU:* ${os.cpus()[0].model}

⚡ *bot amirni hamza*`;
	}

	m.reply(cap);
};

handler.help = ['ping'];
handler.tags = ['infobot'];
handler.command = ['ping', 'speed', 'os', 'سرعة', 'السرعة'];

export default handler;

function toTime(ms) {
	let d = Math.floor(ms / 86400000);
	let h = Math.floor((ms % 86400000) / 3600000);
	let m = Math.floor((ms % 3600000) / 60000);
	let s = Math.floor((ms % 60000) / 1000);

	return (d ? `${d}d ` : '') + (h ? `${h}h ` : '') + (m ? `${m}m ` : '') + (s ? `${s}s` : '');
}

function formatSize(size) {
	const multiplier = Math.pow(10, 1);
	return Math.round((size / (1024 * 1024)) * multiplier) / multiplier + 'MiB';
}
