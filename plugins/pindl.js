/*
# Name : Pinterest Download (Support Carousel)
# Type : ESM
# Url : https://pintsave.net
# Snippet : https://snippet.zellrayy.com/qF7waW22gK
# Source : https://whatsapp.com/channel/0029Vb8SsEn4NViqwX3HaN0x
*/
import axios from 'axios';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `📌 *Pinterest Downloader*\n\n` +
      `Download images, GIFs, or carousels (multiple images/videos in one pin) directly from Pinterest.\n\n` +
      `*How to use:*\n` +
      `Send the command followed by a Pinterest link (pin.it or pinterest.com).\n\n` +
      `*Example:*\n` +
      `${usedPrefix + command} https://pin.it/7JCAkz6RE\n\n` +
      `*Note:* Carousel pins (pins with multiple slides) will send each media item separately.`,
      m
    );
  }

  const url = text.trim();
  if (!/pin(terest)?\.(it|com)/i.test(url)) {
    return conn.reply(m.chat, '❌ That doesn\'t look like a valid Pinterest URL. Please send a link like https://pin.it/xxxxxxx', m);
  }

  await m.react('🕓');

  try {
    const body = new URLSearchParams();
    body.append('url', url);

    const { data } = await axios.post(
      'https://pintsave.net/api/fetch-media',
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 30000
      }
    );

    if (!data || data.success === false) {
      throw new Error(data?.message || 'Failed to fetch media from Pinterest.');
    }

    // Normalize: API may return a single media object or a carousel array
    const mediaItems = Array.isArray(data.media)
      ? data.media
      : Array.isArray(data.result)
      ? data.result
      : data.url
      ? [data]
      : [];

    if (!mediaItems.length) {
      throw new Error('No media found for this link.');
    }

    for (const item of mediaItems) {
      const mediaUrl = item.url || item.video || item.image || item.download_url;
      if (!mediaUrl) continue;

      const isVideo = /\.mp4($|\?)/i.test(mediaUrl) || item.type === 'video';

      if (isVideo) {
        await conn.sendMessage(m.chat, { video: { url: mediaUrl }, caption: '📌 Pinterest Downloader' }, { quoted: m });
      } else {
        await conn.sendMessage(m.chat, { image: { url: mediaUrl }, caption: '📌 Pinterest Downloader' }, { quoted: m });
      }
    }

    await m.react('✅');
  } catch (e) {
    console.error('[pinterest]', e);
    await m.react('❌');
    return conn.reply(m.chat, `❌ Failed to download: ${e.message || 'Unknown error occurred.'}`, m);
  }
};

handler.help = ['pindl'];
handler.command = ['pindl'];
handler.tags = ['downloader'];
handler.limit = false;

export default handler;
