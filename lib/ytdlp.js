// ============================================================
// lib/ytdlp.js — Robust yt-dlp provider for YouTube downloads
// Native binary execution via Docker/Linux on Koyeb
// ============================================================

import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { cleanTitle, getVideoId } from './ytdl.js';

const exec = promisify(execFile);
const YT_DLP_TIMEOUT = 90000; // 90 seconds max

/**
 * Checks if yt-dlp binary is available in PATH
 */
let ytDlpAvailable = null;
async function checkYtDlp() {
	if (ytDlpAvailable !== null) return ytDlpAvailable;
	try {
		await exec('yt-dlp', ['--version'], { timeout: 5000 });
		ytDlpAvailable = true;
	} catch (_) {
		ytDlpAvailable = false;
	}
	return ytDlpAvailable;
}

/**
 * Download YouTube audio (MP3) or video (MP4) directly to local disk
 * @param {string} url - YouTube URL
 * @param {'mp3'|'mp4'|'audio'|'video'} type
 * @param {string} quality - e.g. '720', '480', '360'
 * @returns {Promise<{ download: string, isLocalFile: boolean, title: string, thumbnail: string, duration: string, ext: string, type: string }>}
 */
export async function ytdlpDownload(url, type = 'mp3', quality = '720') {
	const available = await checkYtDlp();
	if (!available) {
		throw new Error('yt-dlp binary is not installed in this environment');
	}

	const isAudio = type === 'mp3' || type === 'audio';
	const videoId = getVideoId(url) || Date.now().toString();
	const tmpDir = path.resolve('./tmp');
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

	const targetExt = isAudio ? 'mp3' : 'mp4';
	const outFile = path.join(tmpDir, `yt_${isAudio ? 'aud' : 'vid'}_${Date.now()}_${videoId}.${targetExt}`);

	// 1. Check for cookies (from file or env var)
	let cookieArgs = [];
	const cookiesPath = path.resolve('./cookies.txt');
	const envCookies = process.env.YOUTUBE_COOKIES;

	if (fs.existsSync(cookiesPath)) {
		cookieArgs = ['--cookies', cookiesPath];
	} else if (envCookies && envCookies.length > 20) {
		const tmpCookie = path.join(tmpDir, 'yt_cookies.txt');
		try {
			fs.writeFileSync(tmpCookie, envCookies.trim());
			cookieArgs = ['--cookies', tmpCookie];
		} catch (_) {}
	}

	// 2. Fetch metadata (title, thumbnail, duration)
	let title = 'YouTube';
	let thumbnail = '';
	let duration = '';

	try {
		const { stdout: infoOut } = await exec(
			'yt-dlp',
			[
				'--no-check-certificates',
				'--no-warnings',
				'--quiet',
				'--get-title',
				'--get-thumbnail',
				'--get-duration',
				'--no-playlist',
				'--extractor-args', 'youtube:player_client=tv,web_embedded;player_skip=webpage',
				...cookieArgs,
				url
			],
			{ timeout: 25000 }
		);
		const lines = infoOut.trim().split('\n').filter(Boolean);
		if (lines[0]) title = cleanTitle(lines[0]);
		if (lines[1]) thumbnail = lines[1];
		if (lines[2]) duration = lines[2];
	} catch (e) {
		console.log('[yt-dlp] Metadata fetch warning:', e.message);
	}

	// 3. Build download arguments with TV/Web-Embedded bypass
	let args = [
		'--no-check-certificates',
		'--no-warnings',
		'--no-playlist',
		'--max-filesize', '80M',
		'--extractor-args', 'youtube:player_client=tv,web_embedded;player_skip=webpage',
		'--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
		...cookieArgs
	];

	if (isAudio) {
		args.push(
			'-x',
			'--audio-format', 'mp3',
			'--audio-quality', '0',
			'-f', 'bestaudio/best',
			'-o', outFile,
			url
		);
	} else {
		const maxH = quality.replace(/[^0-9]/g, '') || '720';
		args.push(
			'-f', `bestvideo[height<=${maxH}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${maxH}][ext=mp4]/best[ext=mp4]/best`,
			'--merge-output-format', 'mp4',
			'-o', outFile,
			url
		);
	}

	console.log(`[yt-dlp] Downloading ${type} for video ${videoId}...`);
	await exec('yt-dlp', args, { timeout: YT_DLP_TIMEOUT });

	// Check if file was created (yt-dlp might keep original extension if no conversion)
	let finalPath = outFile;
	if (!fs.existsSync(finalPath)) {
		// Look for any file matching the pattern in ./tmp
		const matched = fs.readdirSync(tmpDir).find(f => f.includes(videoId));
		if (matched) {
			finalPath = path.join(tmpDir, matched);
		} else {
			throw new Error('yt-dlp: output file was not found after download');
		}
	}

	const stats = fs.statSync(finalPath);
	if (stats.size < 1024) {
		try { fs.unlinkSync(finalPath); } catch (_) {}
		throw new Error('yt-dlp: downloaded file is empty or corrupted');
	}

	console.log(`[yt-dlp] ✅ Successfully downloaded: ${finalPath} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

	return {
		download: finalPath,
		isLocalFile: true,
		title,
		thumbnail,
		duration,
		size: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`,
		ext: targetExt,
		type: isAudio ? 'audio' : 'video'
	};
}

/**
 * Fallback audio downloader by song query via SoundCloud (yt-dlp scsearch1:<query>)
 * Never blocked by YouTube bot checks!
 */
export async function soundcloudDownload(query) {
	const available = await checkYtDlp();
	if (!available) throw new Error('yt-dlp not available');

	const tmpDir = path.resolve('./tmp');
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

	const safeId = Date.now().toString();
	const outFile = path.join(tmpDir, `sc_aud_${safeId}.mp3`);

	let title = query;
	try {
		const { stdout: infoOut } = await exec(
			'yt-dlp',
			['--no-playlist', '--quiet', '--get-title', `scsearch1:${query}`],
			{ timeout: 20000 }
		);
		if (infoOut?.trim()) title = cleanTitle(infoOut.trim().split('\n')[0]);
	} catch (_) {}

	const args = [
		'--no-check-certificates',
		'--no-warnings',
		'--no-playlist',
		'--max-filesize', '60M',
		'-x',
		'--audio-format', 'mp3',
		'--audio-quality', '0',
		'-o', outFile,
		`scsearch1:${query}`
	];

	console.log(`[SoundCloud Engine] Downloading audio for "${query}"...`);
	await exec('yt-dlp', args, { timeout: YT_DLP_TIMEOUT });

	let finalPath = outFile;
	if (!fs.existsSync(finalPath)) {
		const matched = fs.readdirSync(tmpDir).find(f => f.includes(`sc_aud_${safeId}`));
		if (matched) finalPath = path.join(tmpDir, matched);
		else throw new Error('SoundCloud output file not found');
	}

	const stats = fs.statSync(finalPath);
	if (stats.size < 1024) throw new Error('Downloaded SoundCloud file is empty');

	console.log(`[SoundCloud Engine] ✅ Successfully downloaded: ${title}`);
	return {
		download: finalPath,
		isLocalFile: true,
		title,
		ext: 'mp3',
		type: 'audio',
		size: `${(stats.size / (1024 * 1024)).toFixed(1)} MB`
	};
}
