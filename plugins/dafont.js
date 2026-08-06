// elyas_tzy x furqan
// permission to share
import axios from 'axios';
import * as cheerio from 'cheerio';

let handler = async (m, { conn, args }) => {
	let user = global.db.data.users[m.sender] || {};
	let lang = user.language || 'darija';
	const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

	let cmd = args[0]?.toLowerCase();

	if (!cmd)
		throw t(
			`*『 DAFONT FONTS DOWNLOADER 』*\n\n1 *.dafont search [font_name]*\n   Search for fonts by name.\n\n2 *.dafont dl [download_link]*\n   Download font ZIP from link.\n\n*Example:*\n← .dafont search fancy\n← .dafont dl https://dl.dafont.com/dl/?f=fancy_nancy_2`,
			`*『 محمل الخطوط DaFont 』*\n\n1 *.dafont search [اسم_الخط]*\n   البحث عن الخطوط حسب الاسم.\n\n2 *.dafont dl [رابط_التحميل]*\n   تحميل الخط برابط مباشر.\n\n*مثال:*\n← .dafont search fancy\n← .dafont dl https://dl.dafont.com/dl/?f=fancy_nancy_2`,
			`*『 تحميل خطوط DaFont 』*\n\n1 *.dafont search [اسم_الخط]*\n   قلب على خط بالسمية.\n\n2 *.dafont dl [رابط_التحميل]*\n   هبط الخط من الرابط.\n\n*مثال:*\n← .dafont search fancy\n← .dafont dl https://dl.dafont.com/dl/?f=fancy_nancy_2`
		);

	switch (cmd) {
		case 'search':
			if (!args[1]) throw t('What font do you want to search for?', 'ما هو الخط الذي تريد البحث عنه؟', 'شنو الخط اللي باغي تقلب عليه؟');
			const query = args[1];
			try {
				m.reply(t('🔍 Searching fonts...', '🔍 جارٍ البحث عن الخطوط...', '🔍 كُنقلبو على الخطوط...'));

				let result = await dafont(query);
				if (!result.length) throw t(`Font "${query}" not found`, `لم يتم العثور على الخط "${query}"`, `مالقيناش الخط "${query}"`);

				let teks = t(`*『 DAFONT SEARCH 』*`, `*『 نتائج البحث في DAFONT 』*`, `*『 نتائج البحث فـ DAFONT 』*`);

				result.slice(0, 10).forEach((font, i) => {
					teks += `\n\n*${i + 1}. ${font.name}*\n✍️ ${t('Creator', 'المصمم', 'المصمم')}: ${font.creator}\n⬇️ ${t('Downloads', 'التحميلات', 'التحميلات')}: ${font.total_down}\n🔗 ${font.link}`;
				});

				teks += `\n\n${t('Use:', 'استخدم:', 'استخدم:')}\n← *.dafont dl [download_link]*`;
				m.reply(teks);
			} catch (e) {
				console.error(e);
				m.reply(t('❌ Error while searching fonts', '❌ خطأ أثناء البحث عن الخطوط', '❌ وقع مشكل فالبحث'));
			}
			break;

		case 'dl':
			if (!args[1]) throw t('Where is the link?', 'أين رابط التحميل؟', 'فين هو الرابط؟');
			const url = args[1];
			if (!url.startsWith('https://dl.dafont.com/')) throw t('❌ Invalid link', '❌ رابط غير صالح', '❌ رابط ماشي هو هذاك');

			try {
				m.reply(t('⬇️ Downloading font...', '⬇️ جارٍ تحميل الخط...', '⬇️ كنهبطو الخط...'));

				const res = await fetch(url);
				if (!res.ok) throw `An error occurred: ${res.statusText}`;

				const buffer = Buffer.from(await res.arrayBuffer());

				const name = url.split('=').pop();
				await conn.sendMessage(
					m.chat,
					{
						document: buffer,
						mimetype: 'application/zip',
						fileName: `${name}.zip`,
					},
					{ quoted: m }
				);
			} catch (e) {
				console.error(e);
				m.reply(t('❌ Failed to download font', '❌ فشل تحميل الخط', '❌ ما قدرناش ننزلوا الخط'));
			}
			break;

		default:
			m.reply(t('*Available Subcommands:*\n← .dafont search\n← .dafont dl', '*الأوامر الفرعية المتاحة:*\n← .dafont search\n← .dafont dl', '*الأوامر المتاحة:*\n← .dafont search\n← .dafont dl'));
	}
};

async function dafont(query) {
	const res = await fetch('https://www.dafont.com/search.php?q=' + encodeURIComponent(query));

	if (!res.ok) throw new Error(`Status ${res.status}`);

	const data = await res.text();
	const $ = cheerio.load(data);
	const result = [];

	$('.lv1left.dfbg').each((_, el) => {
		const text = $(el).text().replace(/\s+/g, ' ').trim();

		const name = text.split(' by ')[0];
		const creator = text.split(' by ')[1] || '-';

		const total_down = $(el).parent().find('.light').first().text().trim();

		const link = $(el).parent().find('a.dl').attr('href');

		if (link) {
			result.push({
				name,
				creator,
				total_down,
				link: 'https:' + link,
			});
		}
	});

	return result;
}

handler.help = ['dafont'];
handler.tags = ['downloader'];
handler.command = /^dafont$/i;
export default handler;