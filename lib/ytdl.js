// ============================================================
// lib/ytdl.js — Unified Ultra-Resilient YouTube Downloader
// 12 Fallback Providers for MP3 Audio and MP4 Video (yt-dlp first)
// ============================================================

import axios from 'axios';
import crypto from 'crypto';
import https from 'https';
import { ytdlpDownload } from './ytdlp.js';

const agent = new https.Agent({ rejectUnauthorized: false });
const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const axiosIgnoreSSL = axios.create({ httpsAgent: agent, headers: COMMON_HEADERS, timeout: 25000 });

export function getVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function cleanTitle(text) {
  return (text || 'YouTube')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── 0. Provider: Mever API (Works on music videos, fast) ────────────────────
async function fromMever(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const videoId = getVideoId(url);
  if (!videoId) throw new Error('Mever: invalid URL');

  const params = isAudio
    ? { url: `https://www.youtube.com/watch?v=${videoId}`, type: 'audio', quality: '128kbps' }
    : { url: `https://www.youtube.com/watch?v=${videoId}`, type: 'video', quality: '360p' };

  const res = await axios.get('https://mever.zeabur.app/api/youtube', {
    params,
    headers: { 'X-Package-Name': 'com.dapascript.mever', 'User-Agent': 'okhttp/4.11.0' },
    timeout: 15000
  });
  const data = res.data;
  if (!data?.status || !data?.data?.url) throw new Error('Mever: no download URL');
  return {
    download: data.data.url,
    title: cleanTitle(data.title || data.data.filename || 'YouTube'),
    thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: data.duration || '',
    ext: isAudio ? 'mp3' : 'mp4',
    type: isAudio ? 'audio' : 'video'
  };
}

// ─── 1. Provider: ytdown.to (Very fast & reliable) ───────────────────────────
async function fromYtDown(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const headers = {
    'accept': '*/*',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'x-requested-with': 'XMLHttpRequest',
    'referer': 'https://app.ytdown.to/id21/',
    'origin': 'https://app.ytdown.to'
  };

  const { data } = await axios.post(
    'https://app.ytdown.to/proxy.php',
    new URLSearchParams({ url }).toString(),
    { headers, timeout: 15000 }
  );

  if (data?.api?.status !== 'ok' || !Array.isArray(data.api?.mediaItems)) {
    throw new Error('ytdown: invalid response');
  }

  const items = data.api.mediaItems;
  const title = data.api.title || 'YouTube';
  const thumbnail = data.api.imagePreviewUrl || '';
  const duration = items[0]?.mediaDuration || '';

  if (isAudio) {
    for (const item of items) {
      if (item.type !== 'Audio') continue;
      const { data: conv } = await axios.post(
        'https://app.ytdown.to/proxy.php',
        new URLSearchParams({ url: item.mediaUrl }).toString(),
        { headers, timeout: 15000 }
      );
      if (conv?.api?.status === 'completed' && conv?.api?.fileUrl) {
        return {
          download: conv.api.fileUrl,
          title,
          thumbnail,
          duration,
          size: conv.api.fileSize || 'N/A',
          ext: 'mp3',
          type: 'audio'
        };
      }
    }
  } else {
    // Video
    for (const item of items) {
      if (item.type !== 'Video') continue;
      const { data: conv } = await axios.post(
        'https://app.ytdown.to/proxy.php',
        new URLSearchParams({ url: item.mediaUrl }).toString(),
        { headers, timeout: 15000 }
      );
      if (conv?.api?.status === 'completed' && conv?.api?.fileUrl) {
        return {
          download: conv.api.fileUrl,
          title,
          thumbnail,
          duration,
          quality: item.mediaQuality || quality,
          size: conv.api.fileSize || 'N/A',
          ext: 'mp4',
          type: 'video'
        };
      }
    }
  }
  throw new Error('ytdown: no converted media found');
}

// ─── 2. Provider: YTConvert / ytmp3.gg ────────────────────────────────────────
async function fromYTConvert(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const headers = { accept: 'application/json', 'content-type': 'application/json', referer: 'https://ytmp3.gg/' };
  const payload = {
    url,
    os: 'android',
    output: {
      type: isAudio ? 'audio' : 'video',
      format: isAudio ? 'mp3' : 'mp4',
      quality: isAudio ? '320kbps' : (quality.includes('p') ? quality : `${quality}p`)
    }
  };

  let initData = null;
  for (const base of ['https://hub.ytconvert.org', 'https://api.ytconvert.org']) {
    try {
      const r = await axios.post(`${base}/api/download`, payload, { headers, timeout: 12000 });
      if (r.data?.statusUrl) { initData = r.data; break; }
    } catch (_) {}
  }

  if (!initData?.statusUrl) throw new Error('YTConvert: no statusUrl');

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1500));
    const { data } = await axios.get(initData.statusUrl, { headers, timeout: 8000 });
    if (data.status === 'completed' && data.downloadUrl) {
      return {
        download: data.downloadUrl,
        title: data.title || 'YouTube',
        ext: isAudio ? 'mp3' : 'mp4',
        type: isAudio ? 'audio' : 'video'
      };
    }
    if (data.status === 'failed') throw new Error('YTConvert: failed');
  }
  throw new Error('YTConvert: timeout');
}

// ─── 3. Provider: Convert1s / ssvid.cc ─────────────────────────────────────────
async function fromConvert1s(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    origin: 'https://ssvid.cc',
    referer: 'https://ssvid.cc/',
    'user-agent': COMMON_HEADERS['User-Agent']
  };

  const payload = isAudio
    ? { url, audio: { bitrate: '128k' }, output: { type: 'audio', format: 'mp3' } }
    : { url, video: { quality: quality.includes('p') ? quality : `${quality}p` }, output: { type: 'video', format: 'mp4' } };

  const initRes = await axios.post('https://hub.convert1s.com/api/download', payload, { headers, timeout: 15000 });
  const { statusUrl, title } = initRes.data;
  if (!statusUrl) throw new Error('Convert1s: no statusUrl');

  for (let i = 0; i < 25; i++) {
    const s = await axios.get(statusUrl, { headers, timeout: 8000 });
    if (s.data.status === 'completed' && s.data.downloadUrl) {
      return {
        download: s.data.downloadUrl,
        title: s.data.title || title || 'YouTube',
        ext: isAudio ? 'mp3' : 'mp4',
        type: isAudio ? 'audio' : 'video'
      };
    }
    if (s.data.status === 'error' || s.data.status === 'failed') break;
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error('Convert1s: timeout or failed');
}

// ─── 4. Provider: SaveTube ───────────────────────────────────────────────────
async function fromSaveTube(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const id = getVideoId(url);
  if (!id) throw new Error('SaveTube: invalid YouTube ID');

  const stH = {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://yt.savetube.me',
    'referer': 'https://yt.savetube.me/',
    'user-agent': 'Postify/1.0.0'
  };

  let cdn = 'cdn51.savetube.vip';
  try {
    const cdnRes = await axios.get('https://media.savetube.me/api/random-cdn', { headers: stH, timeout: 8000 });
    if (cdnRes.data?.cdn) cdn = cdnRes.data.cdn;
  } catch (_) {}

  const ky = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
  const infoRes = await axiosIgnoreSSL.post(
    `https://${cdn}/api/v2/info`,
    { url: `https://www.youtube.com/watch?v=${id}` },
    { headers: stH, timeout: 15000 }
  );

  const decrypt = (enc) => {
    const buf = Buffer.from(enc, 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(ky, 'hex'), buf.slice(0, 16));
    return JSON.parse(Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString());
  };

  const dec = decrypt(infoRes.data.data);
  const dlRes = await axiosIgnoreSSL.post(
    `https://${cdn}/api/download`,
    {
      id,
      downloadType: isAudio ? 'audio' : 'video',
      quality: isAudio ? '128' : (quality.replace(/[^0-9]/g, '') || '360'),
      key: dec.key
    },
    { headers: stH, timeout: 20000 }
  );

  if (dlRes.data?.data?.downloadUrl) {
    return {
      download: dlRes.data.data.downloadUrl,
      title: dec.title || 'YouTube',
      thumbnail: dec.thumbnail,
      ext: isAudio ? 'mp3' : 'mp4',
      type: isAudio ? 'audio' : 'video'
    };
  }
  throw new Error('SaveTube: no downloadUrl');
}

// ─── Provider: y2mate ────────────────────────────────────────────────────────
async function fromY2mate(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const id = getVideoId(url);
  if (!id) throw new Error('y2mate: invalid id');
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'referer': 'https://www.y2mate.com/', 'User-Agent': 'Mozilla/5.0' };
  const r1 = await axios.post('https://www.y2mate.com/mates/analyzeV2/ajax', `k_query=https://www.youtube.com/watch?v=${id}&k_page=home&hl=en&q_auto=0`, { headers, timeout: 15000 });
  const links = isAudio ? r1?.data?.links?.mp3 : r1?.data?.links?.mp4;
  if (!links) throw new Error('y2mate: no links');
  const best = Object.values(links).find(x => x.size && x.k) || Object.values(links)[0];
  if (!best?.k) throw new Error('y2mate: no key');
  const r2 = await axios.post('https://www.y2mate.com/mates/convertV2/index', `vid=${id}&k=${best.k}`, { headers, timeout: 20000 });
  if (r2?.data?.dlink) {
    return {
      download: r2.data.dlink,
      title: r1.data.title || 'YouTube',
      ext: isAudio ? 'mp3' : 'mp4',
      type: isAudio ? 'audio' : 'video'
    };
  }
  throw new Error('y2mate: convert failed');
}

// ─── Provider: yt1s ──────────────────────────────────────────────────────────
async function fromYt1s(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const id = getVideoId(url);
  if (!id) throw new Error('yt1s: invalid id');
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'referer': 'https://yt1s.io/', 'User-Agent': 'Mozilla/5.0' };
  const r = await axios.post('https://yt1s.io/api/ajaxSearch/index', `q=https://www.youtube.com/watch?v=${id}&vt=home`, { headers, timeout: 15000 });
  const links = isAudio ? r?.data?.links?.mp3 : r?.data?.links?.mp4;
  if (links) {
    const q = Object.values(links).find(x => x.size && x.url) || Object.values(links)[0];
    if (q?.url) {
      return {
        download: q.url,
        title: r.data.title || 'YouTube',
        ext: isAudio ? 'mp3' : 'mp4',
        type: isAudio ? 'audio' : 'video'
      };
    }
  }
  throw new Error('yt1s failed');
}

// ─── 5. Provider: SaveNow (y2down) ───────────────────────────────────────────
async function fromSaveNow(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const headers = { 'User-Agent': COMMON_HEADERS['User-Agent'], 'Referer': 'https://y2down.cc/', 'Origin': 'https://y2down.cc' };
  const format = isAudio ? 'mp3' : (quality.replace(/[^0-9]/g, '') || '720');

  const initRes = await axios.get('https://p.savenow.to/ajax/download.php', {
    params: { copyright: '0', format, url, api: 'dfcb6d76f2f6a9894gjkege8a4ab232222' },
    headers,
    timeout: 15000
  });

  if (!initRes.data?.progress_url) throw new Error('SaveNow: no progress_url');

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1500));
    try {
      const p = await axios.get(initRes.data.progress_url, { headers, timeout: 8000 });
      if (p.data?.download_url) {
        return {
          download: p.data.download_url,
          title: initRes.data.info?.title || 'YouTube',
          ext: isAudio ? 'mp3' : 'mp4',
          type: isAudio ? 'audio' : 'video'
        };
      }
      if (p.data?.error) throw new Error(`SaveNow: ${p.data.error}`);
    } catch (e) {
      if (i > 3) throw e;
    }
  }
  throw new Error('SaveNow: timeout');
}

// ─── 6. Provider: Siputzx API ────────────────────────────────────────────────
async function fromSiputzx(url, type = 'mp3') {
  const isAudio = type === 'mp3' || type === 'audio';
  const ep = isAudio
    ? `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(url)}`
    : `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`;
  const { data } = await axios.get(ep, { timeout: 20000 });
  const d = data?.data || data?.result || data;
  const dl = d?.dl || d?.download || d?.url;
  if (dl) {
    return {
      download: dl,
      title: d?.title || 'YouTube',
      thumbnail: d?.thumbnail || '',
      ext: isAudio ? 'mp3' : 'mp4',
      type: isAudio ? 'audio' : 'video'
    };
  }
  throw new Error('Siputzx: no download URL');
}

// ─── 7. Provider: Yupra API ──────────────────────────────────────────────────
async function fromYupra(url, type = 'mp3') {
  const isAudio = type === 'mp3' || type === 'audio';
  const ep = isAudio
    ? `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(url)}`
    : `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`;
  const { data } = await axios.get(ep, { timeout: 20000 });
  const dl = data?.data?.download_url || data?.download_url || data?.result?.url;
  if (dl) {
    return {
      download: dl,
      title: data?.data?.title || data?.title || 'YouTube',
      thumbnail: data?.data?.thumbnail || '',
      ext: isAudio ? 'mp3' : 'mp4',
      type: isAudio ? 'audio' : 'video'
    };
  }
  throw new Error('Yupra: no download URL');
}

// ─── 0. Provider: YouTube Innertube Direct (Ultra-fast, Official API) ──────
async function fromInnertube(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const videoId = getVideoId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  const { data } = await axios.post(
    'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
    {
      videoId,
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.56.21',
          deviceMake: 'Oculus',
          deviceModel: 'Quest 3',
          hl: 'en',
          gl: 'US'
        }
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Origin': 'https://www.youtube.com',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`
      },
      timeout: 20000
    }
  );

  if (data?.playabilityStatus?.status !== 'OK') {
    throw new Error(data?.playabilityStatus?.reason || 'Innertube unavailable');
  }

  const title = data.videoDetails?.title || 'YouTube';
  const thumbnail = data.videoDetails?.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const duration = data.videoDetails?.lengthSeconds || '';

  if (isAudio) {
    // Select best audio/mp4 stream
    const audioFormats = (data.streamingData?.adaptiveFormats || []).filter(
      f => f.url && f.mimeType && f.mimeType.startsWith('audio/mp4')
    );
    const bestAudio = audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0] ||
      (data.streamingData?.adaptiveFormats || []).find(f => f.url && f.mimeType?.startsWith('audio/'));

    if (bestAudio?.url) {
      return {
        download: bestAudio.url,
        title,
        thumbnail,
        duration,
        ext: 'mp3',
        type: 'audio'
      };
    }
  } else {
    // Select muxed video+audio format (video/mp4)
    const muxed = (data.streamingData?.formats || []).filter(
      f => f.url && f.mimeType && f.mimeType.startsWith('video/mp4')
    );
    const bestVid = muxed.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (bestVid?.url) {
      return {
        download: bestVid.url,
        title,
        thumbnail,
        duration,
        quality: bestVid.qualityLabel || quality,
        ext: 'mp4',
        type: 'video'
      };
    }
  }

  throw new Error('Innertube: no compatible stream url');
}

// ─── Provider: cnv.cx / y2meta API ──────────────────────────────────────────
async function fromCnv(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const videoId = getVideoId(url);
  if (!videoId) throw new Error('cnv: invalid video ID');

  const kr = await axios.get(`https://cnv.cx/v2/sanity/key?id=${encodeURIComponent(videoId)}`, {
    timeout: 20000,
    headers: {
      'User-Agent': COMMON_HEADERS['User-Agent'],
      'Origin': 'https://frame.y2meta-uk.com',
      'Referer': 'https://frame.y2meta-uk.com/',
      'accept': 'application/json'
    }
  });
  const key = kr.data && kr.data.key;
  if (!key) throw new Error('cnv: key unavailable');

  const params = new URLSearchParams();
  params.set('link', `https://youtu.be/${videoId}`);
  params.set('format', isAudio ? 'mp3' : 'mp4');
  params.set('audioBitrate', isAudio ? '128' : '128');
  params.set('videoQuality', isAudio ? '720' : (quality.replace(/[^0-9]/g, '') || '360'));
  params.set('filenameStyle', 'pretty');
  params.set('vCodec', 'h264');

  const cr = await axios.post('https://cnv.cx/v2/converter', params.toString(), {
    timeout: 30000,
    headers: {
      'User-Agent': COMMON_HEADERS['User-Agent'],
      'Origin': 'https://frame.y2meta-uk.com',
      'Referer': 'https://frame.y2meta-uk.com/',
      'Content-Type': 'application/x-www-form-urlencoded',
      'accept': '*/*',
      key
    }
  });

  const d = cr.data || {};
  if (!d.url) throw new Error('cnv: conversion failed');

  return {
    download: d.url,
    title: d.title || 'YouTube',
    ext: isAudio ? 'mp3' : 'mp4',
    type: isAudio ? 'audio' : 'video'
  };
}

// ─── Provider: Cobalt API (Ultra-modern multi-instance downloader) ──────────
async function fromCobalt(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const instances = [
    'https://api.cobalt.tools',
    'https://cobalt.api.scip.io',
    'https://dl.vantech.site/api/json',
    'https://co.wuk.sh/api/json',
    'https://cobalt-api.koyeb.app'
  ];

  const payload = {
    url,
    videoQuality: quality.replace(/[^0-9]/g, '') || '720',
    downloadMode: isAudio ? 'audio' : 'auto',
    audioFormat: 'mp3',
    filenamePattern: 'pretty'
  };

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  for (const base of instances) {
    try {
      const endpoint = base.endsWith('/json') ? base : `${base}/`;
      const res = await axios.post(endpoint, payload, { headers, timeout: 12000 });
      const data = res.data;
      const dlUrl = data.url || data.downloadUrl || (data.status === 'stream' || data.status === 'tunnel' ? data.url : null);
      if (dlUrl) {
        return {
          download: dlUrl,
          title: data.filename || 'YouTube Media',
          ext: isAudio ? 'mp3' : 'mp4',
          type: isAudio ? 'audio' : 'video'
        };
      }
    } catch (_) {}
  }
  throw new Error('Cobalt: all instances failed');
}

// ─── Provider: Vreden API ───────────────────────────────────────────────────
async function fromVreden(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const q = quality.replace(/[^0-9]/g, '') || '720';
  const ep = isAudio
    ? `https://api.vreden.web.id/api/v1/download/youtube/audio?url=${encodeURIComponent(url)}`
    : `https://api.vreden.web.id/api/v1/download/youtube/video?url=${encodeURIComponent(url)}&quality=${q}`;
  const res = await axios.get(ep, { timeout: 15000, headers: COMMON_HEADERS });
  const result = res.data?.result;
  const dlUrl = result?.download?.url || result?.downloadUrl || result?.url;
  if (dlUrl) {
    return {
      download: dlUrl,
      title: result?.title || 'YouTube Media',
      thumbnail: result?.thumbnail || '',
      ext: isAudio ? 'mp3' : 'mp4',
      type: isAudio ? 'audio' : 'video'
    };
  }
  throw new Error('Vreden: no download URL');
}

// ─── Provider: Nekolabs API ─────────────────────────────────────────────────
async function fromNekolabs(url, type = 'mp3', quality = '720') {
  const isAudio = type === 'mp3' || type === 'audio';
  const ep = `https://api.nekolabs.web.id/downloader/youtube/v1?url=${encodeURIComponent(url)}&format=${isAudio ? 'mp3' : 'mp4'}`;
  const res = await axios.get(ep, { timeout: 15000, headers: COMMON_HEADERS });
  const result = res.data?.result;
  const dlUrl = result?.downloadUrl || result?.download?.url || result?.url;
  if (dlUrl) {
    return {
      download: dlUrl,
      title: result?.title || 'YouTube Media',
      thumbnail: result?.thumbnail || '',
      ext: isAudio ? 'mp3' : 'mp4',
      type: isAudio ? 'audio' : 'video'
    };
  }
  throw new Error('Nekolabs: no download URL');
}

// ─── 12. INVIDIOUS API PROVIDER (Bypasses Datacenter IP Blocks) ──────────────
async function fromInvidious(url, type = 'mp3', quality = '720') {
  const instances = [
    'https://inv.nadeko.net',
    'https://invidious.perennialte.ch',
    'https://invidious.nerdvpn.de',
    'https://iv.ggtyler.dev',
    'https://invidious.projectsegfau.lt'
  ];
  const videoId = getVideoId(url);
  if (!videoId) throw new Error('Invidious: invalid URL');
  const isAudio = type === 'mp3' || type === 'audio';
  const maxH = parseInt(quality) || 720;

  for (const base of instances) {
    try {
      const res = await axios.get(`${base}/api/v1/videos/${videoId}`, { timeout: 3500, headers: COMMON_HEADERS });
      const data = res.data;
      const title = cleanTitle(data.title || 'YouTube');
      const thumbnail = data.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const duration = data.lengthSeconds ? `${Math.floor(data.lengthSeconds / 60)}:${String(data.lengthSeconds % 60).padStart(2, '0')}` : '';

      if (isAudio) {
        const streams = (data.adaptiveFormats || []).filter(f => f.type?.startsWith('audio'));
        const best = streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) return { download: best.url, title, thumbnail, duration, ext: 'mp3', type: 'audio' };
      } else {
        const streams = (data.adaptiveFormats || []).filter(f => f.type?.startsWith('video/mp4'));
        const best = streams.filter(f => parseInt(f.resolution) <= maxH).sort((a, b) => parseInt(b.resolution) - parseInt(a.resolution))[0] || streams[0];
        if (best?.url) return { download: best.url, title, thumbnail, duration, quality: best.resolution || quality, ext: 'mp4', type: 'video' };
      }
    } catch (_) {}
  }
  throw new Error('Invidious: all instances failed');
}

// ─── 13. PIPED API PROVIDER ──────────────────────────────────────────────────
async function fromPiped(url, type = 'mp3', quality = '720') {
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.darkness.services',
    'https://piped-api.codebb.gr'
  ];
  const videoId = getVideoId(url);
  if (!videoId) throw new Error('Piped: invalid URL');
  const isAudio = type === 'mp3' || type === 'audio';
  const maxH = parseInt(quality) || 720;

  for (const base of instances) {
    try {
      const res = await axios.get(`${base}/streams/${videoId}`, { timeout: 3500, headers: COMMON_HEADERS });
      const data = res.data;
      const title = cleanTitle(data.title || 'YouTube');
      const thumbnail = data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      if (isAudio) {
        const streams = (data.audioStreams || []);
        const best = streams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) return { download: best.url, title, thumbnail, ext: 'mp3', type: 'audio' };
      } else {
        const streams = (data.videoStreams || []).filter(f => f.mimeType?.includes('mp4'));
        const best = streams.filter(f => parseInt(f.quality) <= maxH).sort((a, b) => parseInt(b.quality) - parseInt(a.quality))[0] || streams[0];
        if (best?.url) return { download: best.url, title, thumbnail, quality: best.quality || quality, ext: 'mp4', type: 'video' };
      }
    } catch (_) {}
  }
  throw new Error('Piped: all instances failed');
}

// ─── MAIN UNIFIED DISPATCHER ─────────────────────────────────────────────────
/**
 * Downloads YouTube Audio (MP3) or Video (MP4) using 15 robust providers.
 * @param {string} url - YouTube URL
 * @param {'mp3'|'mp4'|'audio'|'video'} type - 'mp3' or 'mp4'
 * @param {string} quality - e.g. '720', '480', '360'
 * @returns {Promise<{ download: string, title: string, thumbnail?: string, duration?: string, ext: string, type: string }>}
 */
export async function downloadYouTube(url, type = 'mp3', quality = '720') {
  const providers = [
    { name: 'Mever',     fn: () => fromMever(url, type, quality) },
    { name: 'Innertube', fn: () => fromInnertube(url, type, quality) },
    { name: 'Invidious', fn: () => fromInvidious(url, type, quality) },
    { name: 'Cobalt',    fn: () => fromCobalt(url, type, quality) },
    { name: 'yt1s',      fn: () => fromYt1s(url, type, quality) },
    { name: 'SaveNow',   fn: () => fromSaveNow(url, type, quality) },
    { name: 'Convert1s', fn: () => fromConvert1s(url, type, quality) },
    { name: 'SaveTube',  fn: () => fromSaveTube(url, type, quality) },
    { name: 'YtDown',    fn: () => fromYtDown(url, type, quality) },
    { name: 'YTConvert', fn: () => fromYTConvert(url, type, quality) },
    { name: 'Cnv',       fn: () => fromCnv(url, type, quality) },
    { name: 'yt-dlp',   fn: () => ytdlpDownload(url, type, quality) },
    { name: 'y2mate',    fn: () => fromY2mate(url, type, quality) },
    { name: 'Piped',     fn: () => fromPiped(url, type, quality) },
    { name: 'Vreden',    fn: () => fromVreden(url, type, quality) },
    { name: 'Nekolabs',  fn: () => fromNekolabs(url, type, quality) },
  ];

  for (const p of providers) {
    try {
      console.log(`[YouTube Engine] Trying ${p.name} for ${type}...`);
      const res = await p.fn();
      if (res?.download) {
        console.log(`[YouTube Engine] ✅ Success via ${p.name}!`);
        return res;
      }
    } catch (err) {
      console.log(`[YouTube Engine] ❌ ${p.name} failed: ${err.message}`);
    }
  }

  throw new Error('تعذر استخراج رابط التحميل من جميع سيرفرات يوتيوب. المرجو المحاولة برابط آخر.');
}
