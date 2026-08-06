import axios from 'axios';
import FormData from 'form-data';

const apii = axios.create({ baseURL: 'https://aivocalremover.com' });

const getKey = async () => {
  const res = await apii.get('/', { timeout: 10000 });
  const match = res.data.match(/key:"(\w+)/);
  if (!match) throw new Error("Could not find API key on the page.");
  return match[1];
};

const vocalRemove = async (audioBuffer) => {
  const form = new FormData();
  const fileName = Math.random().toString(36).substring(2, 10) + '.mpeg';
  form.append('fileName', audioBuffer, {
    filename: fileName,
    contentType: 'audio/mpeg'
  });

  const [key, fileUpload] = await Promise.all([
    getKey(),
    apii.post('/api/v2/FileUpload', form, { headers: form.getHeaders(), timeout: 30000 }).catch(e => e.response)
  ]);

  if (!fileUpload || fileUpload.status !== 200) {
    throw new Error(fileUpload?.data?.message || fileUpload?.statusText || "Upload failed");
  }

  const processFile = await apii.post('/api/v2/ProcessFile', new URLSearchParams({
    file_name: fileUpload.data.file_name,
    action: 'watermark_video',
    key: key,
    web: 'web'
  }), { timeout: 60000 }).catch(e => e.response);

  if (!processFile || processFile.status !== 200) {
    throw new Error(processFile?.data?.message || "Processing failed");
  }

  return processFile.data; // Returns { vocal_path, instrumental_path }
};

const handler = async (m, { conn, usedPrefix: _p, command }) => {
  let user = global.db.data.users[m.sender] || {};
  let lang = user.language || 'darija';
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da;

  const quoted = m.quoted ? m.quoted : m;
  const mime = (quoted.msg || quoted).mimetype || '';

  if (!/audio/.test(mime) && !/video/.test(mime)) {
    const helpMsg = t(
`🎤 *AI Vocal & Music Remover* 🎤

🔹 *How to use:*
Reply to any audio or video file with:
${_p}${command}

💡 Uses AI to separate vocals from music/instrumentals into two separate audio files!
⚠️ Tip: For best results, use clips shorter than 2-3 minutes.

⚡ *bot amirni hamza*`,

`🎤 *عازل الصوت والموسيقى بالذكاء الاصطناعي* 🎤

🔹 *طريقة الاستخدام:*
قم بالرد على أي مقطع صوتي أو فيديو بالأمر:
← ${_p}${command}

💡 يستخدم الذكاء الاصطناعي لفصل صوت المغني عن الموسيقى وإرسالهما في ملفين منفصلين!
⚠️ نصيحة: يُفضل استخدام مقاطع أقل من 3 دقائق للحصول على أفضل نتيجة.

⚡ *bot amirni hamza*`,

`🎤 *عازل الصوت والموسيقى (Vocal Remover)* 🎤

🔹 *طريقة الاستخدام:*
ريبوندي على شي أوديو ولا فيديو بهاد الكوموند:
← ${_p}${command}

💡 كيعزل صوت الغناء على الموسيقى وكيسيفطهم بجوج فملفات مفرقة!
⚠️ نصيحة: استعمل أوديو أقل من 3 دقائق باش تخرج النتيجة ناضية.

⚡ *bot amirni hamza*`
    );

    return m.reply(helpMsg);
  }

  try {
    await m.reply(t(
      '⏳ *Processing audio... Separating vocals from instrumental background music.*\nPlease wait a moment...',
      '⏳ *جاري معالجة المقطع وفصل الصوت عن الموسيقى...*\nيرجى الانتظار، هذه العملية قد تستغرق دقيقة أو أكثر.',
      '⏳ *جاري معالجة المقطع وفصل الصوت عن الموسيقى...*\nصبر شوية، هاد العملية كتاخد شوية دالوقت.'
    ));

    await conn.sendMessage(m.chat, { react: { text: "🎧", key: m.key } });

    const mediaBuffer = await quoted.download();
    if (!mediaBuffer || mediaBuffer.length < 100) {
      throw new Error(t('Failed to download media file.', 'تعذر تحميل المقطع الصوتي.', 'ما قدرناش ننزلوا المقطع الصوتي.'));
    }

    const { vocal_path, instrumental_path } = await vocalRemove(mediaBuffer);

    if (!vocal_path || !instrumental_path) {
      throw new Error(t('Failed to extract audio URLs from server.', 'فشل استخراج الروابط من الخادم.', 'السيرفر ما رجعش الروابط مقادين.'));
    }

    // Send Vocals
    await conn.sendMessage(m.chat, {
      audio: { url: vocal_path },
      mimetype: 'audio/mpeg',
      fileName: 'Vocals.mp3',
      caption: t('🎤 *Vocals Only*', '🎤 *صوت المغني فقط (Vocals)*', '🎤 *صوت المغني بوحدو (Vocals)*')
    }, { quoted: m });

    // Send Instrumental
    await conn.sendMessage(m.chat, {
      audio: { url: instrumental_path },
      mimetype: 'audio/mpeg',
      fileName: 'Instrumental.mp3',
      caption: t('🎸 *Instrumental Music Only*', '🎸 *الموسيقى فقط (Instrumental)*', '🎸 *الموسيقى بوحدها (Instrumental)*')
    }, { quoted: m });

    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

  } catch (error) {
    console.error('[VocalRemover] Error:', error.message);
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    return m.reply(t(
      `❌ Operation failed: ${error.message}`,
      `❌ فشلت العملية: ${error.message}`,
      `❌ فشلات العملية أ خاي: ${error.message}`
    ));
  }
};

handler.help = ['vocalremover', '3azlsawt', 'hazf-sawt'];
handler.tags = ['ai', 'tools'];
handler.command = /^(vocalremover|vocalremove|3azlsawt|hazf-sawt|cazlsawt|vocal|acapella|instrumental)$/i;

export default handler;
