import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

const handler = async (m, { conn, usedPrefix, command }) => {
	const quoted = m.quoted ? m.quoted : m;
	const mime = (quoted.msg || quoted).mimetype || '';

	if (!mime || (!mime.includes('audio') && !mime.includes('ogg') && !mime.includes('mp4'))) {
		return m.reply(
			`👽 *مؤثر الصوت الفضائي الغريب (.alien)*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			`بدل صوتك أو صوت أي أوديو لصوت كائن فضائي (Extraterrestrial Alien) مرعب ومضحك.\n\n` +
			`📌 *طريقة الاستعمال:*\n` +
			`1. سجل فويس أو اختر أي مقطع صوتي في المحادثة.\n` +
			`2. قم بالرد عليه (Reply) واكتب: *${usedPrefix + command}*\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	await m.react('👽');

	let audioBuf = null;
	try {
		audioBuf = await quoted.download();
	} catch (err) {
		await m.react('❌');
		return m.reply('❌ تعذر تحميل المقطع الصوتي.');
	}

	if (!audioBuf || audioBuf.length < 500) {
		await m.react('❌');
		return m.reply('❌ ملف الصوت فارغ أو غير صالح.');
	}

	const tmpDir = path.join(process.cwd(), 'tmp');
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

	const inPath = path.join(tmpDir, `alien_in_${Date.now()}.bin`);
	const outPath = path.join(tmpDir, `alien_out_${Date.now()}.ogg`);
	fs.writeFileSync(inPath, audioBuf);

	// Alien audio processing chain: modulated vibrato + flanger + high metallic echo + sci-fi pitch
	const alienChain = 'asetrate=44100*1.22,aresample=44100,vibrato=f=18:d=0.9,flanger=delay=6:depth=3.5:speed=0.6,aecho=0.8:0.7:60|120:0.35|0.2,loudnorm=I=-16:TP=-1.5:LRA=11';

	try {
		await run('ffmpeg', [
			'-y', '-i', inPath,
			'-af', alienChain,
			'-c:a', 'libopus', '-b:a', '48k', '-ar', '48000', '-ac', '1',
			outPath
		], { timeout: 30000 });

		if (!fs.existsSync(outPath) || fs.statSync(outPath).size < 1000) {
			throw new Error('Alien audio render empty');
		}

		const rendered = fs.readFileSync(outPath);
		await m.react('🛸');
		return conn.sendMessage(
			m.chat,
			{
				audio: rendered,
				mimetype: 'audio/ogg; codecs=opus',
				ptt: true
			},
			{ quoted: m }
		);
	} catch (err) {
		await m.react('❌');
		return m.reply(`❌ تعذر تطبيق المؤثر الفضائي: ${err.message}`);
	} finally {
		try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (_) {}
		try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
	}
};

handler.help = ['alien (قم بالرد على فويس)'];
handler.tags = ['audio'];
handler.command = /^(alien|فضائي|alienvoice)$/i;

export default handler;
