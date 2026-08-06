import axios from 'axios';

// ─── API 1: cobalt.tools ────────────────────────────────────────────────────
async function cobaltTwitter(url) {
  try {
    const res = await axios.post('https://api.cobalt.tools/api/json', {
      url,
      vCodec: 'h264',
      vQuality: '720',
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 15000
    });
    const d = res.data;
    if (d?.status === 'stream' || d?.status === 'redirect') return { type: 'video', url: d.url };
    if (d?.status === 'picker') return { type: 'photos', urls: d.picker.map(p => p.url) };
    return null;
  } catch (_) { return null; }
}

// ─── API 2: twitsave.com ────────────────────────────────────────────────────
async function twitSave(url) {
  try {
    const html1 = await axios.get('https://twitsave.com/info?url=' + encodeURIComponent(url), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 12000
    });
    const data = html1.data || '';
    // Extract highest quality download link
    const hdMatch = data.match(/href="(https:\/\/video\.twimg\.com[^"]+)"/);
    if (hdMatch) return { type: 'video', url: hdMatch[1] };

    // Try image extraction
    const imgMatch = data.match(/href="(https:\/\/pbs\.twimg\.com\/media\/[^"]+)"/g);
    if (imgMatch?.length > 0) {
      const urls = imgMatch.map(m => m.match(/href="([^"]+)"/)[1].replace(/&amp;/g, '&'));
      return urls.length > 1 ? { type: 'photos', urls } : { type: 'image', url: urls[0] };
    }
    return null;
  } catch (_) { return null; }
}

// ─── API 3: ssstwitter.com ──────────────────────────────────────────────────
async function sssTwit(url) {
  try {
    const res = await axios.post('https://ssstwitter.com/', `id=${encodeURIComponent(url)}&locale=en&tt_token=&timestamp=&token=`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://ssstwitter.com/',
        'Origin': 'https://ssstwitter.com'
      },
      timeout: 12000
    });
    const html = res.data || '';
    const vidMatch = html.match(/href="(https?:\/\/[^"]*\.mp4[^"]*)"/);
    if (vidMatch) return { type: 'video', url: vidMatch[1].replace(/&amp;/g, '&') };
    return null;
  } catch (_) { return null; }
}

// ─── Main handler ──────────────────────────────────────────────────────────
const handler = async (m, { conn, usedPrefix, command, args }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : (da || ar);

  const url = (args[0] || '').trim();

  // ─── Prompt ────────────────────────────────────────────────────────────
  if (!url || !url.startsWith('http')) {
    return m.reply(t(
`🐦 *Twitter/X Video Downloader* 🐦
━━━━━━━━━━━━━━━━━━━━━
Download any Twitter / X video or GIF!

📌 *How to use:*
← ${usedPrefix}${command} <tweet link>

📌 *Example:*
← ${usedPrefix}${command} https://x.com/user/status/123456

✅ *Supports:* Videos • GIFs • Photos
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🐦 *محمل فيديوهات تويتر/X* 🐦
━━━━━━━━━━━━━━━━━━━━━
حمّل أي فيديو أو صورة متحركة من تويتر/X!

📌 *طريقة الاستخدام:*
← ${usedPrefix}${command} <رابط التغريدة>

📌 *مثال:*
← ${usedPrefix}${command} https://x.com/user/status/123456

✅ *يدعم:* الفيديوهات • GIF • الصور
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`,

`🐦 *تحميل من تويتر/X* 🐦
━━━━━━━━━━━━━━━━━━━━━
حمل أي فيديو أو صورة من تويتر/X!

📌 *كيفاش تستعملو:*
← ${usedPrefix}${command} <رابط التغريدة>

📌 *مثال:*
← ${usedPrefix}${command} https://x.com/user/status/123456

✅ *كيدعم:* الفيديوهات • GIF • الصور
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`
    ));
  }

  if (!url.includes('twitter.com') && !url.includes('x.com') && !url.includes('t.co')) {
    return m.reply(t(
      '❌ Please send a valid Twitter/X link.',
      '❌ أرسل رابط تويتر/X صحيحاً.',
      '❌ صيفط رابط صحيح ديال تويتر/X.'
    ));
  }

  await m.react('⏳');
  await m.reply(t(
    '🐦 Fetching Twitter/X media... please wait!',
    '🐦 جاري تحميل محتوى تويتر...',
    '🐦 كنجيبو الفيديو من تويتر، صبر شوية...'
  ));

  let result = await cobaltTwitter(url);
  if (!result) result = await twitSave(url);
  if (!result) result = await sssTwit(url);

  if (!result) {
    await m.react('❌');
    return m.reply(t(
      '❌ Failed to download! Make sure the tweet is *public* and contains media.',
      '❌ فشل التحميل! تأكد من أن التغريدة *عامة* وتحتوي على فيديو.',
      '❌ ماقدرناش نحملو! تأكد بلي التغريدة *عامة* وفيها فيديو.'
    ));
  }

  const caption = t(
    `🐦 *Downloaded from Twitter/X* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `🐦 *تم التحميل من تويتر/X* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,
    `🐦 *تم التحميل من تويتر/X* ✅\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
  );

  try {
    if (result.type === 'video') {
      await conn.sendMessage(m.chat, {
        video: { url: result.url },
        caption,
        mimetype: 'video/mp4'
      }, { quoted: m });

    } else if (result.type === 'image') {
      await conn.sendMessage(m.chat, {
        image: { url: result.url },
        caption
      }, { quoted: m });

    } else if (result.type === 'photos' && result.urls?.length > 0) {
      await m.reply(t(
        `🐦 *Twitter Album* — ${result.urls.length} photo(s)`,
        `🐦 *ألبوم تويتر* — ${result.urls.length} صورة`,
        `🐦 *ألبوم تويتر* — ${result.urls.length} صورة`
      ));
      for (let i = 0; i < result.urls.length; i++) {
        const imgUrl = result.urls[i];
        try {
          await conn.sendMessage(m.chat, {
            image: { url: imgUrl },
            caption: `${i + 1}/${result.urls.length}`
          }, { quoted: m });
        } catch (_) {}
        await new Promise(r => setTimeout(r, 500));
      }
    }
    await m.react('✅');
  } catch (e) {
    await m.react('❌');
    await m.reply(t(
      `❌ Error sending media: ${e.message}`,
      `❌ حدث خطأ أثناء الإرسال: ${e.message}`,
      `❌ وقع خطأ فـ الإرسال: ${e.message}`
    ));
  }
};

handler.help = ['twitter', 'x'];
handler.tags = ['downloader'];
handler.command = /^(tw|twit|twitter|xdl|xdownload|تويتر|تويت)$/i;
handler.limit = false;

export default handler;
