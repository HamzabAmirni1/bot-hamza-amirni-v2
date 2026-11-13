// ============================================================
// plugins/radio.js — Live Radio WhatsApp Call Plugin
// بث المحطات الإذاعية المغربية في مكالمة واتساب حية ومباشرة
// ============================================================

import { execFile } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

const run = promisify(execFile);

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

const RADIO_STATIONS = [
	{
		id: 'hit',
		aliases: ['hit', 'hitradio', 'هيت', 'هيت_راديو', '1'],
		name: 'Hit Radio (هيت راديو)',
		category: '🎵 شبابية وموسيقى',
		url: 'https://hitradio-maroc.ice.infomaniak.ch/hitradio-maroc-128.mp3',
		desc: 'أحدث الأغاني الشبابية المغربية والعالمية'
	},
	{
		id: 'mars',
		aliases: ['mars', 'radiomars', 'مارس', 'راديو_مارس', 'رياضة', '2'],
		name: 'Radio Mars (راديو مارس الرياضية)',
		category: '⚽ رياضة وكرة قدم',
		url: 'https://radiomars.ice.infomaniak.ch/radiomars-128.mp3',
		desc: 'البطولة الوطنية، المنتخب المغربي وأخبار الرياضة'
	},
	{
		id: 'aswat',
		aliases: ['aswat', 'أصوات', 'اصوات', 'radioaswat', '3'],
		name: 'Radio Aswat (راديو أصوات)',
		category: '🎙️ برامج ومجتمع',
		url: 'https://broadcast.ice.infomaniak.ch/aswat-high.mp3',
		desc: 'استشارات قانونية، برامج تفاعلية وأخبار'
	},
	{
		id: 'medradio',
		aliases: ['medradio', 'ميد', 'ميد_راديو', 'med', '4'],
		name: 'Med Radio (ميد راديو)',
		category: '🎙️ برامج ومجتمع',
		url: 'http://medradio.ice.infomaniak.ch/medradio-128.mp3',
		desc: 'قهوة الصباح وبرامج اجتماعية وتفاعلية'
	},
	{
		id: 'mfm',
		aliases: ['mfm', 'ام_اف_ام', 'إم_إف_إم', '5'],
		name: 'MFM Radio (إم إف إم)',
		category: '📰 أخبار ومجتمع',
		url: 'https://a5.asurahosting.com:7980/radio.mp3',
		desc: 'أخبار الساعة، برامج فلاحية واجتماعية'
	},
	{
		id: 'medina',
		aliases: ['medina', 'medinafm', 'مدينة', 'مدينة_اف_ام', '6'],
		name: 'Medina FM (مدينة إف إم)',
		category: '🎶 طرب وفن مغربي',
		url: 'https://medinafm.ice.infomaniak.ch/medinafm-128.mp3',
		desc: 'طرب أصيل وأغاني مغربية تراثية وشعبية'
	},
	{
		id: 'atlantic',
		aliases: ['atlantic', 'اطلانتيك', 'أطلانتيك', '7'],
		name: 'Atlantic Radio (أطلانتيك راديو)',
		category: '💼 اقتصاد وتحليل',
		url: 'https://atlantic-sonic.nindohost.net:9300/stream',
		desc: 'أخبار الاقتصاد، أسواق المال وتحليلات الخبراء'
	},
	{
		id: 'cap',
		aliases: ['cap', 'capradio', 'كاب', 'كاب_راديو', 'طنجة', '8'],
		name: 'Cap Radio (كاب راديو)',
		category: '🌊 الشمال وطنجة',
		url: 'https://listen.radioking.com/radio/710810/stream/776366',
		desc: 'أخبار وبرامج الشمال: طنجة وتطوان والمضيق'
	},
	{
		id: 'quran',
		aliases: ['quran', 'قرآن', 'القرآن', 'القران', 'تلاوات', '9'],
		name: 'إذاعة القرآن الكريم (بث مباشر)',
		category: '📖 إسلامية',
		url: 'https://stream.radiojar.com/0tpy1h0kxtzuv',
		desc: 'تلاوات خاشعة ليل نهار بأعذب الأصوات'
	}
];

function buildSections(usedPrefix, command) {
	const groups = {};
	for (const st of RADIO_STATIONS) {
		if (!groups[st.category]) groups[st.category] = [];
		groups[st.category].push({
			id: `${usedPrefix}${command} ${st.id}`,
			title: st.name,
			description: st.desc
		});
	}
	return Object.entries(groups).map(([cat, rows]) => ({
		title: cat,
		rows
	}));
}

function findStation(q) {
	q = (q || '').trim().toLowerCase();
	if (!q) return null;
	if (/^\d+$/.test(q)) return RADIO_STATIONS[parseInt(q, 10) - 1] || null;
	return RADIO_STATIONS.find(s => s.id === q || s.aliases.includes(q)) ||
		RADIO_STATIONS.find(s => s.name.toLowerCase().includes(q) || s.aliases.some(a => a.includes(q))) || null;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
	let query = (args[0] || '').toLowerCase().trim();

	// Support .radio vn <station> or .radiovn to send a 30s voice note sample instead of a call
	const isVnMode = command === 'radiovn' || query === 'vn' || query === 'sample';
	if (isVnMode && (query === 'vn' || query === 'sample')) {
		query = (args[1] || '').toLowerCase().trim();
	}

	// ── 1. No arguments: show interactive list ──────────────────────
	if (!query) {
		const sections = buildSections(usedPrefix, command);
		const caption =
			`📻 *بث محطات الراديو في مكالمة واتساب مباشرة* 📡\n` +
			`━━━━━━━━━━━━━━━━━━━━━\n` +
			`اختار المحطة الإذاعية اللي بغيتي تسمع ليها 👇\n` +
			`غادي يتصل بيك البوت فـ *مكالمة واتساب مباشرة وحية* ويبث ليك الراديو لايف!\n` +
			`━━━━━━━━━━━━━━━━━━━━━\n` +
			`💡 _لأخذ عينة صوتية 30 ثانية في الشات:_ \`${usedPrefix}radiovn <المحطة>\`\n` +
			`⚡ *bot amirni hamza*`;

		try {
			return await conn.sendButton(
				m.chat,
				{
					text: caption,
					footer: 'bot amirni hamza • 📻 Live Radio',
					optionText: '📻 اختار المحطة الإذاعية',
					optionTitle: '📻 اختار المحطة الإذاعية',
					buttons: [
						{
							name: 'single_select',
							buttonParamsJson: JSON.stringify({
								title: '📻 المحطات الإذاعية المغربية',
								sections
							})
						}
					],
					nativeFlow: [{ text: '📻 اختار المحطة الإذاعية', sections }]
				},
				{ quoted: m }
			);
		} catch (_) {
			// Fallback text list
			let fallback = caption + '\n\n*📻 المحطات المتوفرة:*\n';
			RADIO_STATIONS.forEach((st, i) => {
				fallback += `\n*${i + 1}.* ${st.name} — ${st.desc}\n   └ \`${usedPrefix}${command} ${st.id}\``;
			});
			return m.reply(fallback);
		}
	}

	const selected = findStation(query);
	if (!selected) {
		return m.reply(
			`❌ المحطة الإذاعية *"${query}"* غير موجودة!\n` +
			`اكتب \`${usedPrefix}${command}\` لرؤية قائمة جميع المحطات المتوفرة. 📻`
		);
	}

	// ── 2. Voice Note mode (.radiovn) ────────────────────────────────
	if (isVnMode) {
		const file = `./tmp/radio-${Date.now()}.ogg`;
		try {
			await m.reply(`🔴 كنسجل عينة حية 30 ثانية من *${selected.name}*...`);
			await run('ffmpeg', [
				'-hide_banner', '-loglevel', 'error', '-user_agent', 'Mozilla/5.0',
				'-i', selected.url, '-t', '30', '-vn', '-ac', '1', '-ar', '48000',
				'-c:a', 'libopus', '-b:a', '48k', file, '-y'
			], { timeout: 45000 });

			if (!fs.existsSync(file) || fs.statSync(file).size < 1000) throw new Error('Empty recording');

			await conn.sendMessage(m.chat, {
				audio: fs.readFileSync(file),
				mimetype: 'audio/ogg; codecs=opus',
				ptt: true
			}, { quoted: m });

			return m.reply(`📻 *${selected.name}*\nبث حي مباشر شغال دابا! للإتصال المباشر: \`${usedPrefix}radio ${selected.id}\``);
		} catch (e) {
			return m.reply(`❌ تعذر تسجيل عينة من ${selected.name}. جرب الاتصال المباشر: \`${usedPrefix}radio ${selected.id}\``);
		} finally {
			try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
		}
	}

	// ── 3. Live VoIP Call Mode (بحال TV تماماً) ────────────────────────
	const targetPhone = m.sender.split('@')[0].replace(/\D/g, '');

	const callAlert =
		`📻 *جاري الاتصال بك في مكالمة راديو لايف...*\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`📡 *المحطة:* ${selected.name}\n` +
		`🏷️ *التصنيف:* ${selected.category}\n` +
		`📱 *المتصل به:* +${targetPhone}\n\n` +
		`📲 *المرجو قبول مكالمة الواتساب الآن للاستماع للبث الحي المباشر!* 🎧\n\n` +
		`_للإنهاء في أي وقت:_ اقطع المكالمة أو اكتب \`${usedPrefix}voipend\`\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`⚡ *bot amirni hamza*`;

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
				footer: 'bot amirni hamza • VoIP Live Radio',
				buttons: controlButtons
			},
			{ quoted: m }
		);
	} catch (_) {
		await m.reply(callAlert);
	}

	// Initiate WhatsApp Voice Call streaming the live radio
	try {
		const voip = await getVoip(conn);
		console.log(`📻 [Live-Radio] Calling +${targetPhone} → ${selected.name} (${selected.url})`);

		const call = await voip.call(targetPhone, { audio: selected.url, isLiveStream: true }, undefined, {
			autoEndCall: false,
			autoDowngrade: false,
			loop: true
		});

		call.on('ringing', () => {
			m.reply(`🔔 *جاري رنين الهاتف +${targetPhone}... افتح المكالمة للاستماع للراديو!* 📻`).catch(() => {});
		});

		call.on('connected', () => {
			m.reply(`🟢 *تم الاتصال! يتم بث إذاعة ${selected.name} لايف في المكالمة الآن.* 📻🎧`).catch(() => {});
		});

		call.on('ended', (reason) => {
			m.reply(`⏹️ *انتهت المكالمة (${reason || 'finished'}).* استماع ممتع! 📻`).catch(() => {});
		});

		call.on('error', (err) => {
			m.reply(`⚠️ خطأ في بث الراديو: ${err?.message || err}`).catch(() => {});
		});

	} catch (e) {
		console.error('[Live Radio Call Error]:', e);
		return m.reply(`❌ فشل بدء مكالمة الراديو: ${e?.message || e}`);
	}
};

handler.help = ['radio', 'radio <station>', 'radiovn <station>', 'راديو'];
handler.tags = ['morocco', 'entertainment'];
handler.command = /^(radio|راديو|idhaa|اذاعة|إذاعة|radiomoc|radiovn)$/i;

export default handler;
