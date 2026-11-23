import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

async function fetchGoogleTTS(text, lang = 'ar') {
	const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
	const res = await axios.get(url, {
		responseType: 'arraybuffer',
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Referer': 'https://translate.google.com/'
		},
		timeout: 15000
	});
	return Buffer.from(res.data);
}

function detectTextLang(txt) {
	if (/[a-zA-Z]/.test(txt) && !/[\u0600-\u06FF]/.test(txt)) {
		if (/(le|la|les|un|une|des|est|sont|dans|pour|avec)/i.test(txt)) return 'fr';
		return 'en';
	}
	return 'ar';
}

const handler = async (m, { conn, text, usedPrefix, command, args }) => {
	let raw = text || m.quoted?.text || '';

	if (!raw) {
		return m.reply(
			`🗣️ *محول النص إلى صوت بنت أو ولد (.voice)*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			`حول أي نص أو رسالة إلى فويس (بصمة صوتية PTT) بصوت بنت ناعم أو صوت ولد وقور.\n\n` +
			`📌 *طريقة الاستعمال:*\n` +
			`• *صوت بنت (Female):*\n` +
			`← \`${usedPrefix + command} bent مرحبا كيف دايرين، لاباس عليكم\`\n` +
			`← \`${usedPrefix + command} fille Bonjour tout le monde\`\n\n` +
			`• *صوت ولد (Male):*\n` +
			`← \`${usedPrefix + command} wld السلام عليكم ورحمة الله، تبارك الله عليكم\`\n` +
			`← \`${usedPrefix + command} garcon Welcome to Bot Amirni Hamza\`\n\n` +
			`💡 يمكنك أيضاً الرد (Reply) على أي رسالة مكتوبة واكتب:\n` +
			`← \`${usedPrefix + command} bent\` أو \`${usedPrefix + command} wld\`\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	await m.react('🗣️');

	let gender = 'bent';
	let spokenText = raw.trim();

	const firstWord = (args[0] || '').toLowerCase();
	if (['bent', 'bnt', 'fille', 'f', 'girl', 'female', 'بنت'].includes(firstWord)) {
		gender = 'bent';
		spokenText = args.slice(1).join(' ').trim() || (m.quoted?.text || '');
	} else if (['wld', 'ولد', 'dori', 'garcon', 'm', 'boy', 'male'].includes(firstWord)) {
		gender = 'wld';
		spokenText = args.slice(1).join(' ').trim() || (m.quoted?.text || '');
	}

	if (!spokenText) {
		return m.reply('❌ المرجو كتابة النص الذي تريد تحويله إلى صوت.');
	}

	if (spokenText.length > 500) {
		return m.reply('⚠️ الحد الأقصى للنص هو 500 حرف لضمان جودة وسرعة الصوت.');
	}

	const lang = detectTextLang(spokenText);

	try {
		const rawAudio = await fetchGoogleTTS(spokenText, lang);

		// If ffmpeg is available, apply male/female formant & pitch filters and encode as opus OGG
		const tmpDir = path.join(process.cwd(), 'tmp');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		const inPath = path.join(tmpDir, `tts_in_${Date.now()}.mp3`);
		const outPath = path.join(tmpDir, `tts_out_${Date.now()}.ogg`);
		fs.writeFileSync(inPath, rawAudio);

		let filter = '';
		if (gender === 'bent') {
			// Female pitch & lightness
			filter = 'asetrate=44100*1.18,aresample=44100,atempo=0.92,treble=g=2.5,loudnorm=I=-16:TP=-1.5:LRA=11';
		} else {
			// Male warmth & depth
			filter = 'asetrate=44100*0.86,aresample=44100,atempo=1.16,bass=g=3.5,loudnorm=I=-16:TP=-1.5:LRA=11';
		}

		let finalAudio = rawAudio;
		let usePtt = true;

		try {
			await run('ffmpeg', [
				'-y', '-i', inPath,
				'-af', filter,
				'-c:a', 'libopus', '-b:a', '48k', '-ar', '48000', '-ac', '1',
				outPath
			], { timeout: 15000 });

			if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
				finalAudio = fs.readFileSync(outPath);
			}
		} catch (_) {
			// Fallback: send raw mp3 if ffmpeg is unavailable on local Windows host
			usePtt = false;
		} finally {
			try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (_) {}
			try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
		}

		await m.react('✅');
		return conn.sendMessage(
			m.chat,
			{
				audio: finalAudio,
				mimetype: usePtt ? 'audio/ogg; codecs=opus' : 'audio/mp4',
				ptt: true
			},
			{ quoted: m }
		);
	} catch (err) {
		await m.react('❌');
		return m.reply(`❌ تعذر توليد الصوت: ${err.message}`);
	}
};

handler.help = ['voice bent <نص>', 'voice wld <نص>'];
handler.tags = ['audio', 'tools'];
handler.command = /^(voice|sawt|ttsvoice|صوت)$/i;

export default handler;
