// ============================================================
// lib/stt.js — Speech-to-Text (Audio to Text) Module
// Optimized for Moroccan Darija (ar-MA), Arabic, and French
// Uses ffmpeg + Google Speech v2 (Free & High Accuracy)
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const TMP = path.join(process.cwd(), 'tmp');
try { fs.mkdirSync(TMP, { recursive: true }); } catch {}

const GKEY = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw';

/**
 * Converts any audio buffer into 16kHz mono FLAC buffer using ffmpeg
 */
export async function bufferToFlac(audioBuffer) {
	const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
	const inFile = path.join(TMP, `stt_in_${stamp}.bin`);
	const outFile = path.join(TMP, `stt_out_${stamp}.flac`);

	try {
		await fs.promises.writeFile(inFile, audioBuffer);
		await exec('ffmpeg', [
			'-y',
			'-v', 'error',
			'-i', inFile,
			'-ar', '16000',
			'-ac', '1',
			outFile
		], { timeout: 35000 });

		if (!fs.existsSync(outFile)) throw new Error('FLAC conversion failed');
		const flac = await fs.promises.readFile(outFile);
		return flac;
	} finally {
		try { if (fs.existsSync(inFile)) fs.unlinkSync(inFile); } catch (_) {}
		try { if (fs.existsSync(outFile)) fs.unlinkSync(outFile); } catch (_) {}
	}
}

/**
 * Transcribes FLAC buffer using Google Speech v2 API
 * @param {Buffer} flacBuffer
 * @param {string} lang - default 'ar-MA' (Moroccan Arabic / Darija)
 * @returns {Promise<string>}
 */
export async function transcribeFlac(flacBuffer, lang = 'ar-MA') {
	const res = await fetch(`https://www.google.com/speech-api/v2/recognize?output=json&lang=${lang}&key=${GKEY}&pfilter=0`, {
		method: 'POST',
		headers: { 'Content-Type': 'audio/x-flac; rate=16000' },
		body: flacBuffer,
		signal: AbortSignal.timeout(25000)
	});

	if (!res.ok) throw new Error(`Google Speech HTTP ${res.status}`);
	const body = await res.text();

	for (const line of body.split('\n')) {
		if (!line.trim()) continue;
		try {
			const json = JSON.parse(line);
			const alt = json?.result?.[0]?.alternative?.[0]?.transcript;
			if (alt) return alt.trim();
		} catch (_) {}
	}
	return '';
}

/**
 * Full pipeline: takes an audio Buffer and returns transcribed text
 * Automatically tries Moroccan Darija (ar-MA), then Arabic/French if empty
 */
export async function transcribeAudio(audioBuffer, preferredLang = 'ar-MA') {
	if (!audioBuffer || audioBuffer.length < 100) return '';
	const flacBuffer = await bufferToFlac(audioBuffer);
	if (!flacBuffer || flacBuffer.length === 0) return '';

	// 1. Try preferred language (default Moroccan Darija)
	let text = await transcribeFlac(flacBuffer, preferredLang).catch(() => '');
	if (text) return text;

	// 2. If ar-MA returned empty, try standard Arabic (ar-SA)
	if (preferredLang === 'ar-MA') {
		text = await transcribeFlac(flacBuffer, 'ar-SA').catch(() => '');
		if (text) return text;

		// 3. Try French (fr-FR) as many Moroccans mix French with Darija
		text = await transcribeFlac(flacBuffer, 'fr-FR').catch(() => '');
		if (text) return text;
	}

	return text || '';
}
