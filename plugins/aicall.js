import { getSmartAIReply } from '../lib/gemini.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);

// Public speech-to-text key from Chromium
const GKEY = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw';

async function speechToText(audioBuffer) {
	try {
		const tmpDir = path.join(process.cwd(), 'tmp');
		if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

		const inPath = path.join(tmpDir, `stt_${Date.now()}.bin`);
		const flacPath = path.join(tmpDir, `stt_${Date.now()}.flac`);
		fs.writeFileSync(inPath, audioBuffer);

		await run('ffmpeg', ['-y', '-i', inPath, '-ar', '16000', '-ac', '1', flacPath], { timeout: 15000 });
		const flacBuf = fs.readFileSync(flacPath);

		try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (_) {}
		try { if (fs.existsSync(flacPath)) fs.unlinkSync(flacPath); } catch (_) {}

		const url = `https://www.google.com/speech-api/v2/recognize?output=json&lang=ar-MA&key=${GKEY}`;
		const res = await axios.post(url, flacBuf, {
			headers: { 'Content-Type': 'audio/x-flac; rate=16000' },
			timeout: 15000
		});

		const lines = (res.data || '').toString().split('\n').filter(Boolean);
		for (const line of lines) {
			try {
				const j = JSON.parse(line);
				const txt = j.result?.[0]?.alternative?.[0]?.transcript;
				if (txt) return txt.trim();
			} catch (_) {}
		}
	} catch (_) {}
	return null;
}

async function textToVoiceOgg(text) {
	const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=ar&client=tw-ob`;
	const res = await axios.get(ttsUrl, {
		responseType: 'arraybuffer',
		headers: { 'User-Agent': 'Mozilla/5.0' },
		timeout: 15000
	});

	const tmpDir = path.join(process.cwd(), 'tmp');
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

	const inPath = path.join(tmpDir, `tts_call_in_${Date.now()}.mp3`);
	const outPath = path.join(tmpDir, `tts_call_out_${Date.now()}.ogg`);
	fs.writeFileSync(inPath, Buffer.from(res.data));

	try {
		await run('ffmpeg', [
			'-y', '-i', inPath,
			'-af', 'asetrate=44100*1.14,aresample=44100,atempo=0.94,treble=g=2,loudnorm=I=-16:TP=-1.5:LRA=11',
			'-c:a', 'libopus', '-b:a', '48k', '-ar', '48000', '-ac', '1',
			outPath
		], { timeout: 15000 });

		if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
			const ogg = fs.readFileSync(outPath);
			return { buffer: ogg, isOpus: true };
		}
	} catch (_) {} finally {
		try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch (_) {}
		try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch (_) {}
	}

	return { buffer: Buffer.from(res.data), isOpus: false };
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const quoted = m.quoted ? m.quoted : m;
	const mime = (quoted.msg || quoted).mimetype || '';

	let userSaid = text || '';

	if (mime && (mime.includes('audio') || mime.includes('ogg'))) {
		await m.react('🎙️');
		try {
			const audioBuf = await quoted.download();
			const transcribed = await speechToText(audioBuf);
			if (transcribed) userSaid = transcribed;
		} catch (_) {}
	}

	if (!userSaid && !mime) {
		return m.reply(
			`🎙️ *المكالمة الصوتية الذكية الذكاء الاصطناعي (.aicall)*\n` +
			`━━━━━━━━━━━━━━━━━━━━\n` +
			`تحدث صوتياً مع البوت كأنك تجري مكالمة هاتفية حقيقية مع شخص ذكي ومرح (مثل Gemini Live و ChatGPT Voice).\n\n` +
			`📌 *طريقة الاستعمال:*\n` +
			`1. أرسل فويس صوتي واكتب في الوصف: *${usedPrefix + command}*\n` +
			`2. أو قم بالرد (Reply) على أي فويس واكتب: *${usedPrefix + command}*\n` +
			`3. أو اكتب أي سؤال أو موضوع تريده أن يجيبك عليه بالصوت:\n` +
			`← \`${usedPrefix + command} أهلاً، عاود ليا شي قصة مضحكة\`\n\n` +
			`⚡ *bot amirni hamza*`
		);
	}

	await m.react('🎧');

	const systemPrompt =
		`أنت صديق ذكي ومرح ولطيف تجري مكالمة صوتية ودية مع المستخدم عبر واتساب. ` +
		`اسمك "بوت حمزة اعمرني". ` +
		`قواعد المحادثة الصوتية:\n` +
		`1. أجب بالدارجة المغربية العفوية الحية والمحبوبة كأنك تتكلم في الهاتف.\n` +
		`2. الإجابة يجب أن تكون موجهة للإلقاء الصوتي: قصيرة وممتعة وموجزة (بين سطرين إلى 4 أسطر كحد أقصى).\n` +
		`3. لا تستخدم الإيموجي أو التنسيقات المعقدة أو الرموز لأن النص سيتحول لصوت مباشر.\n` +
		`4. كن دافئاً وودوداً وذكياً وسريع البديهة.`;

	try {
		const replyText = await getSmartAIReply(userSaid || 'أهلاً كيف داير لاباس عليك', { systemPrompt });

		// Generate voice response
		const { buffer, isOpus } = await textToVoiceOgg(replyText);

		await m.react('📞');
		return conn.sendMessage(
			m.chat,
			{
				audio: buffer,
				mimetype: isOpus ? 'audio/ogg; codecs=opus' : 'audio/mp4',
				ptt: true
			},
			{ quoted: m }
		);
	} catch (err) {
		await m.react('❌');
		return m.reply(`❌ تعذر إتمام المكالمة الصوتية: ${err.message}`);
	}
};

handler.help = ['aicall (أرسل فويس للتحدث)'];
handler.tags = ['ai', 'audio'];
handler.command = /^(aicall|call|voicecall|مكالمة|مكالمة_صوتية)$/i;

export default handler;
