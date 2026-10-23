// ============================================================
// Live TV Video Call Plugin — بث القنوات التلفزيونية في مكالمة فيديو واتساب مباشرة
// ============================================================

global.__voipInstances = global.__voipInstances || new WeakMap();

async function getVoip(conn) {
	let voip = global.__voipInstances.get(conn);
	if (!voip) {
		const { default: Voip } = await import('../lib/voip/index.js');
		voip = new Voip(conn, { voipLogLevel: 'warn' });
		global.__voipInstances.set(conn, voip);
		voip.listen().catch(() => {});
	}
	return voip;
}

const TV_CHANNELS = [
	{
		id: '2m',
		aliases: ['2m', 'دوزيم', 'دوزيم_المغربية', '2mmaroc'],
		name: '2M Maroc (دوزيم المغربية)',
		category: '🇲🇦 مغربية',
		url: 'https://d2qh3gh0k5vp3v.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-n6pess5lwbghr/2M_ES.m3u8'
	},
	{
		id: 'medi1',
		aliases: ['medi1', 'ميدي1', 'ميدي_1', 'medi1tv'],
		name: 'Medi1 TV Arabic (ميدي 1 تيفي)',
		category: '🇲🇦 مغربية',
		url: 'https://cdn.live.easybroadcast.io/abr_corp/83_medi1tv-arabic_g90v4ec/playlist.m3u8'
	},
	{
		id: 'medi1maghreb',
		aliases: ['medi1maghreb', 'ميدي1_مغارب'],
		name: 'Medi1 TV Maghreb (ميدي 1 مغارب)',
		category: '🇲🇦 مغربية',
		url: 'https://cdn.live.easybroadcast.io/abr_corp/83_medi1tv-maghreb_jnbspmg/playlist.m3u8'
	},
	{
		id: 'chada',
		aliases: ['chada', 'شدى', 'chadatv'],
		name: 'Chada TV (شدى تيفي)',
		category: '🇲🇦 مغربية',
		url: 'https://edge13.vedge.infomaniak.com/livecast/ik:chadatv/manifest.m3u8'
	},
	{
		id: 'mbc5',
		aliases: ['mbc5', 'ام_بي_سي_5', 'mbc_5'],
		name: 'MBC 5 Maroc (إم بي سي 5)',
		category: '🎬 ترفيه',
		url: 'https://shd-gcp-live.edgenextcdn.net/live/bitmovin-mbc-5/ee6b000cee0629411b666ab26cb13e9b/index.m3u8'
	},
	{
		id: 'aljazeera',
		aliases: ['aljazeera', 'الجزيرة', 'jazeera', 'aj'],
		name: 'Al Jazeera (الجزيرة الإخبارية)',
		category: '🌐 إخبارية',
		url: 'https://live-hls-apps-aja-fa.getaj.net/AJA/01.m3u8'
	},
	{
		id: 'ajm',
		aliases: ['ajm', 'الجزيرة_مباشر', 'mubasher'],
		name: 'Al Jazeera Mubasher (الجزيرة مباشر)',
		category: '🌐 إخبارية',
		url: 'https://live-hls-apps-ajm-fa.getaj.net/AJM/index.m3u8'
	},
	{
		id: 'skynews',
		aliases: ['skynews', 'سكاي_نيوز', 'sky', 'سكاي'],
		name: 'Sky News Arabia (سكاي نيوز عربية)',
		category: '🌐 إخبارية',
		url: 'https://live-stream.skynewsarabia.com/c-horizontal-channel/horizontal-stream/index.m3u8'
	},
	{
		id: 'trtarabi',
		aliases: ['trtarabi', 'trt', 'تي_ار_تي'],
		name: 'TRT Arabi (تي آر تي عربي)',
		category: '🌐 إخبارية',
		url: 'https://tv-trtarabi.medya.trt.com.tr/master.m3u8'
	},
	{
		id: 'quran',
		aliases: ['quran', 'قرآن', 'القرآن', 'مكة'],
		name: 'قناة القرآن الكريم (مكة المكرمة مباشرة)',
		category: '🕋 إسلامية',
		url: 'https://stream.sauditv.sa/hls/quran/index.m3u8'
	},
	{
		id: 'sunnah',
		aliases: ['sunnah', 'سنة', 'السنة', 'المدينة'],
		name: 'قناة السنة النبوية (المدينة المنورة مباشرة)',
		category: '🕌 إسلامية',
		url: 'https://stream.sauditv.sa/hls/sunnah/index.m3u8'
	}
];

let handler = async (m, { conn, args, usedPrefix, command }) => {
	const choice = (args[0] || '').toLowerCase().trim();

	if (!choice) {
		let listText = `📺 *بث القنوات التلفزيونية في مكالمة فيديو مباشرة* 📡\n━━━━━━━━━━━━━━━━━━━━━\nاختر أي قناة وسيقوم البوت بالاتصال بك في *مكالمة فيديو واتساب حقيقية* لبث القناة لايف أمامك مباشرة!\n\n*القنوات المتوفرة حالياً:*\n`;

		TV_CHANNELS.forEach((ch, idx) => {
			listText += `\n${idx + 1}. *${ch.name}*\n   ├ 🏷️ الصنف: ${ch.category}\n   └ 🔘 الأمر: \`${usedPrefix + command} ${ch.id}\`\n`;
		});

		listText += `\n━━━━━━━━━━━━━━━━━━━━━\n💡 *طريقة التشغيل:*\n• اكتب: \`${usedPrefix + command} 2m\`\n• أو اكتب: \`${usedPrefix + command} aljazeera\`\n• أو اكتب: \`${usedPrefix + command} quran\`\n\n_أو اضغط على الأزرار بالأسفل_ 👇\n⚡ *bot amirni hamza*`;

		const buttons = [
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '📺 2M Maroc (دوزيم)',
					id: `${usedPrefix + command} 2m`
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '🌐 الجزيرة الإخبارية',
					id: `${usedPrefix + command} aljazeera`
				})
			},
			{
				name: 'quick_reply',
				buttonParamsJson: JSON.stringify({
					display_text: '🕋 قناة القرآن الكريم',
					id: `${usedPrefix + command} quran`
				})
			}
		];

		try {
			return await conn.sendButton(
				m.chat,
				{
					text: listText,
					footer: 'bot amirni hamza • بث التلفاز في مكالمة فيديو',
					buttons
				},
				{ quoted: m }
			);
		} catch (_) {
			return m.reply(listText);
		}
	}

	// Find chosen channel
	const selected = TV_CHANNELS.find(ch => ch.id === choice || ch.aliases.includes(choice));
	if (!selected) {
		return m.reply(`❌ القناة غير موجودة!\nاكتب \`${usedPrefix + command}\` لرؤية قائمة جميع القنوات المتوفرة.`);
	}

	// Target phone number: caller themselves (or specified in args[1])
	let targetPhone = args[1]?.replace(/\D/g, '') || m.sender.split('@')[0].replace(/\D/g, '');
	if (!targetPhone || targetPhone.length < 8) {
		targetPhone = m.sender.split('@')[0].replace(/\D/g, '');
	}

	const callAlert = `📺 *جاري الاتصال بك في مكالمة فيديو مباشرة...*\n━━━━━━━━━━━━━━━━━━━━━\n📡 *القناة المختارة:* ${selected.name}\n🏷️ *التصنيف:* ${selected.category}\n📱 *المتصل به:* +${targetPhone}\n\n📲 *المرجو قبول مكالمة الفيديو الآن لمشاهدة البث المباشر لايف!*\n\n_للإنهاء في أي وقت:_ اكتب \`${usedPrefix}voipend\` أو اضغط على الزر أدناه.\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`;

	const controlButtons = [
		{
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: '🔴 إنهاء المكالمة',
				id: `${usedPrefix}voipend force`
			})
		},
		{
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: '🔇 كتم / تشغيل الصوت',
				id: `${usedPrefix}voipsilent`
			})
		}
	];

	try {
		await conn.sendButton(
			m.chat,
			{
				text: callAlert,
				footer: 'bot amirni hamza • VoIP Live TV Streamer',
				buttons: controlButtons
			},
			{ quoted: m }
		);
	} catch (_) {
		await m.reply(callAlert);
	}

	// Initiate Real WhatsApp Video Call with Live TV Stream
	try {
		const voip = await getVoip(conn);
		console.log(`📺 [Live-TV] Placing video call to +${targetPhone} streaming: ${selected.name} (${selected.url})`);

		const call = await voip.call(targetPhone, selected.url, '360p', {
			autoEndCall: false,
			loop: true
		});

		call.on('ringing', () => {
			m.reply(`🔔 *جاري رنين الهاتف +${targetPhone}... افتح مكالمة الفيديو!*`).catch(() => {});
		});

		call.on('connected', () => {
			m.reply(`🟢 *تم الاتصال بنجاح! يتم الآن بث قناة ${selected.name} لايف في المكالمة.* 📺`).catch(() => {});
		});

		call.on('ended', (reason) => {
			m.reply(`⏹️ *انتهى بث القناة (${reason || 'finished'}).* نتمنى لك مشاهدة ممتعة!`).catch(() => {});
		});

		call.on('error', (err) => {
			m.reply(`⚠️ خطأ في بث المكالمة: ${err?.message || err}`).catch(() => {});
		});

	} catch (e) {
		console.error('[Live TV Call Error]:', e);
		return m.reply(`❌ فشل بدء مكالمة البث المباشر: ${e?.message || e}`);
	}
};

handler.help = ['tv', 'tv <channel>', 'tlfaz', 'قنوات'];
handler.tags = ['tools', 'entertainment'];
handler.command = /^(tv|tlfaz|قناة|قنوات|تلفاز|بث_مباشر|livetv)$/i;

export default handler;
