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
		name: 'Medi1 TV Arabic (ميدي 1)',
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
		name: 'قناة القرآن الكريم (مكة المكرمة)',
		category: '🕋 إسلامية',
		url: 'https://stream.sauditv.sa/hls/quran/index.m3u8'
	},
	{
		id: 'sunnah',
		aliases: ['sunnah', 'سنة', 'السنة', 'المدينة'],
		name: 'قناة السنة النبوية (المدينة المنورة)',
		category: '🕌 إسلامية',
		url: 'https://stream.sauditv.sa/hls/sunnah/index.m3u8'
	}
];

// Group channels by category for list sections
function buildSections(usedPrefix, command) {
	const groups = {};
	for (const ch of TV_CHANNELS) {
		if (!groups[ch.category]) groups[ch.category] = [];
		groups[ch.category].push({
			id: `${usedPrefix}${command} ${ch.id}`,
			title: ch.name,
			description: ch.category
		});
	}
	return Object.entries(groups).map(([cat, rows]) => ({
		title: cat,
		rows
	}));
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
	const choice = (args[0] || '').toLowerCase().trim();

	// ── No argument → show single_select list ──────────────────────────────
	if (!choice) {
		const sections = buildSections(usedPrefix, command);
		const caption =
			`📺 *بث القنوات التلفزيونية في مكالمة فيديو لايف* 📡\n` +
			`━━━━━━━━━━━━━━━━━━━━━\n` +
			`اختر القناة التي تريد مشاهدتها 👇\n` +
			`سيقوم البوت بالاتصال بك *فيديو واتساب حقيقي* وبث القناة مباشرة أمامك!\n` +
			`━━━━━━━━━━━━━━━━━━━━━\n` +
			`⚡ *bot amirni hamza*`;

		try {
			return await conn.sendButton(
				m.chat,
				{
					text: caption,
					footer: 'bot amirni hamza • 📡 Live TV',
					optionText: '📡 اختر القناة',
					optionTitle: '📡 اختر القناة',
					buttons: [
						{
							name: 'single_select',
							buttonParamsJson: JSON.stringify({
								title: '📡 اختر القناة',
								sections
							})
						}
					],
					nativeFlow: [{ text: '📡 اختر القناة', sections }]
				},
				{ quoted: m }
			);
		} catch (_) {
			// Fallback plain text list if sendButton fails
			let fallback = caption + '\n\n*القنوات المتوفرة:*\n';
			TV_CHANNELS.forEach((ch, i) => {
				fallback += `\n${i + 1}. *${ch.name}*\n   └ \`${usedPrefix}${command} ${ch.id}\``;
			});
			return m.reply(fallback);
		}
	}

	// ── Channel argument → find & call ─────────────────────────────────────
	const selected = TV_CHANNELS.find(ch => ch.id === choice || ch.aliases.includes(choice));
	if (!selected) {
		return m.reply(
			`❌ القناة *"${choice}"* غير موجودة!\n` +
			`اكتب \`${usedPrefix}${command}\` لرؤية قائمة جميع القنوات المتوفرة. 📺`
		);
	}

	// Target phone: the person who sent the command
	let targetPhone = m.sender.split('@')[0].replace(/\D/g, '');

	const callAlert =
		`📺 *جاري الاتصال بك في مكالمة فيديو مباشرة...*\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`📡 *القناة:* ${selected.name}\n` +
		`🏷️ *التصنيف:* ${selected.category}\n` +
		`📱 *المتصل به:* +${targetPhone}\n\n` +
		`📲 *المرجو قبول مكالمة الفيديو الآن لمشاهدة البث المباشر!*\n\n` +
		`_للإنهاء:_ اكتب \`${usedPrefix}voipend\`\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`⚡ *bot amirni hamza*`;

	// Control buttons (quick_reply) shown after call starts
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
				footer: 'bot amirni hamza • VoIP Live TV',
				buttons: controlButtons
			},
			{ quoted: m }
		);
	} catch (_) {
		await m.reply(callAlert);
	}

	// Initiate WhatsApp Video Call with Live TV Stream
	try {
		const voip = await getVoip(conn);
		console.log(`📺 [Live-TV] Calling +${targetPhone} → ${selected.name} (${selected.url})`);

		const call = await voip.call(targetPhone, selected.url, '240p', {
			autoEndCall: false,
			autoDowngrade: false,
			loop: true
		});

		call.on('ringing', () => {
			m.reply(`🔔 *جاري رنين الهاتف +${targetPhone}... افتح مكالمة الفيديو!*`).catch(() => {});
		});

		call.on('connected', () => {
			m.reply(`🟢 *تم الاتصال! يتم بث قناة ${selected.name} لايف الآن.* 📺`).catch(() => {});
		});

		call.on('ended', (reason) => {
			m.reply(`⏹️ *انتهى البث (${reason || 'finished'}).* مشاهدة ممتعة!`).catch(() => {});
		});

		call.on('error', (err) => {
			m.reply(`⚠️ خطأ في البث: ${err?.message || err}`).catch(() => {});
		});

	} catch (e) {
		console.error('[Live TV Call Error]:', e);
		return m.reply(`❌ فشل بدء مكالمة البث: ${e?.message || e}`);
	}
};

handler.help = ['tv', 'tv <channel>', 'tlfaz', 'قنوات'];
handler.tags = ['tools', 'entertainment'];
handler.command = /^(tv|tlfaz|قناة|قنوات|تلفاز|بث_مباشر|livetv)$/i;

export default handler;
