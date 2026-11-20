// ============================================================
// lib/yts.js — Resilient YouTube Search & Metadata Engine
// Bypasses yt-search "title.trim is not a function" bug
// ============================================================

/**
 * Direct scraper fallback when yt-search package fails or is not available
 */
async function scrapeYouTubeSearch(query) {
	try {
		const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en`;
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				'Accept-Language': 'en-US,en;q=0.9',
			},
			signal: AbortSignal.timeout(10000),
		});

		const html = await res.text();
		const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) || html.match(/var ytInitialData\s*=\s*({.+?});/s);
		if (!match) return [];

		const data = JSON.parse(match[1]);
		const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

		const videos = [];
		for (const c of contents) {
			const items = c?.itemSectionRenderer?.contents || [];
			for (const item of items) {
				const v = item?.videoRenderer;
				if (!v || !v.videoId) continue;

				const title = v.title?.runs?.[0]?.text || v.title?.simpleText || (typeof v.title === 'string' ? v.title : '');
				const thumbnail = v.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
				const duration = v.lengthText?.simpleText || '';
				const author = v.ownerText?.runs?.[0]?.text || '';

				videos.push({
					videoId: v.videoId,
					url: `https://www.youtube.com/watch?v=${v.videoId}`,
					title: (title || '').trim(),
					thumbnail,
					image: thumbnail,
					timestamp: duration,
					author: { name: author },
				});

				if (videos.length >= 15) break;
			}
			if (videos.length >= 15) break;
		}
		return videos;
	} catch (err) {
		console.log('[scrapeYouTubeSearch] Error:', err.message);
		return [];
	}
}

/**
 * Resilient Search: Tries yt-search first, falls back to direct parser
 * @param {string} query
 * @returns {Promise<{ videos: Array<{ videoId: string, url: string, title: string, thumbnail: string, image: string, timestamp: string, author: { name: string } }> }>}
 */
export async function searchYouTube(query) {
	if (!query) return { videos: [] };

	// 1. Try yt-search library
	try {
		const { default: yts } = await import('yt-search');
		const search = await yts(query);
		if (Array.isArray(search?.videos) && search.videos.length > 0) {
			return { videos: search.videos };
		}
	} catch (e) {
		console.log('[searchYouTube] yt-search threw error, switching to direct scraper:', e.message);
	}

	// 2. Fallback to direct HTML scraper
	const scraped = await scrapeYouTubeSearch(query);
	return { videos: scraped };
}

/**
 * Resilient Video Info by Video ID
 * @param {string} videoId
 * @returns {Promise<{ title: string, thumbnail: string, image: string }>}
 */
export async function getVideoDetails(videoId) {
	if (!videoId) return { title: '', thumbnail: '', image: '' };

	// 1. Try yt-search
	try {
		const { default: yts } = await import('yt-search');
		const res = await yts({ videoId });
		if (res?.title) {
			return {
				title: res.title || '',
				thumbnail: res.image || res.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
				image: res.image || res.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
			};
		}
	} catch (_) {}

	// 2. Try oEmbed
	try {
		const oRes = await (await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: AbortSignal.timeout(5000) })).json();
		const thumb = oRes?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
		return {
			title: oRes?.title || '',
			thumbnail: thumb,
			image: thumb,
		};
	} catch (_) {}

	return {
		title: '',
		thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
		image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
	};
}
