/*
# Name : Instagram Download (video, image carousel)
# Type : ESM
# Url : https://clipssaver.com
# Snippet : https://snippet.zellrayy.com/kTLUERvPx2
# Source : https://whatsapp.com/channel/0029Vb8SsEn4NViqwX3HaN0x
*/
import axios from 'axios';

async function instagramScrape(url) {
  const { data } = await axios.post(
    'https://clipssaver.com/api/instagram/instagramDownloader/download-post',
    { url },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  if (data.status !== 'success') throw new Error('Failed to fetch data');

  const result = data.data.post;

  return {
    id: result.id,
    shortcode: result.short_code,
    username: result.owner?.username,
    caption: result.edge_media_to_caption?.edges?.[0]?.node?.text || '',
    thumbnail: result.thumbnail_src,
    image: result.display_url,
    video: result.video_url,
    download: result.download_url,
    likes: result.edge_liked_by?.count,
    comments: result.edge_media_to_comment?.count,
    duration: result.video_duration,
    type: result.type,
    // carousel items, if present
    sidecar: result.edge_sidecar_to_children?.edges?.map(e => ({
      isVideo: e.node.is_video,
      display: e.node.display_url,
      video: e.node.video_url
    })) || []
  };
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return conn.reply(
      m.chat,
      `📷 *Instagram Downloader*\n\n` +
      `Download Instagram posts, reels, and image carousels directly to WhatsApp.\n\n` +
      `*How to use:*\n` +
      `Send the command followed by an Instagram post/reel link.\n\n` +
      `*Example:*\n` +
      `${usedPrefix + command} https://www.instagram.com/reel/DZ2zV8UhBQZ/\n\n` +
      `*Note:* Carousel posts (multiple photos/videos in one post) will send each item separately.`,
      m
    );
  }

  const url = text.trim();
  if (!/instagram\.com\/(reel|p|tv)\//i.test(url)) {
    return conn.reply(m.chat, '❌ That doesn\'t look like a valid Instagram post/reel URL. Please send a link like https://www.instagram.com/reel/xxxxxxx/', m);
  }

  await m.react('🕓');

  try {
    const result = await instagramScrape(url);
    const caption = `📷 *Instagram Downloader*\n\n👤 ${result.username || 'Unknown'}\n❤️ ${result.likes ?? '-'} likes | 💬 ${result.comments ?? '-'} comments\n\n${result.caption ? result.caption.slice(0, 300) : ''}`;

    if (result.sidecar && result.sidecar.length > 0) {
      // Carousel post — send each item
      for (const item of result.sidecar) {
        if (item.isVideo && item.video) {
          await conn.sendMessage(m.chat, { video: { url: item.video }, caption: '📷 Instagram Downloader' }, { quoted: m });
        } else if (item.display) {
          await conn.sendMessage(m.chat, { image: { url: item.display }, caption: '📷 Instagram Downloader' }, { quoted: m });
        }
      }
    } else if (result.video || result.download) {
      await conn.sendMessage(m.chat, { video: { url: result.video || result.download }, caption }, { quoted: m });
    } else if (result.image) {
      await conn.sendMessage(m.chat, { image: { url: result.image }, caption }, { quoted: m });
    } else {
      throw new Error('No downloadable media found for this post.');
    }

    await m.react('✅');
  } catch (e) {
    console.error('[instagram]', e);
    await m.react('❌');
    return conn.reply(m.chat, `❌ Failed to download: ${e.message || 'Unknown error occurred.'}`, m);
  }
};

handler.help = ['ig', 'igdl', 'insta', 'instagram', 'reels'];
handler.command = /^(ig|igdl|insta|instagram|reels|ريلز|انستا|إنستغرام|انستقرام)$/i;
handler.tags = ['downloader'];
handler.limit = false;
export default handler;
