// plugins/stt.js — تحويل البصمات الصوتية إلى نص (بالدارجة المغربية)
// كيرد على أي فويس/أوديو بالنص ديالو مكتوب. المحرك مضبوط على ar-MA
// (العربية المغربية) باش يفهم الدارجة كما هي، ماشي غير الفصحى.
//
// الاستعمال: رد (quote) على بصمة صوتية واكتب:
//   .audiototxt            تفريغ بالدارجة المغربية (الافتراضي)
//   .audiototxt fr         تفريغ بالفرنسية — لغات أخرى: en / es / ar / de / it
//
// التقنية: الصوت كيتحول بـ ffmpeg إلى FLAC 16kHz وكيتصيفط لخدمة Google
// Speech المجانية بنفس مفتاح Chromium العمومي المستعمل في مكتبات التعرف
// الصوتي المفتوحة. حد الطول: دقيقتان للبصمة الواحدة.

import fs from 'node:fs';
import path from 'node:path';
import { transcribeAudio, bufferToFlac, transcribeFlac } from '../lib/stt.js';

const LANGS = { ma: 'ar-MA', ar: 'ar-MA', fr: 'fr-FR', en: 'en-US', es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', tr: 'tr-TR' };
const MAX_SECONDS = 120;

let handler = async (m, { text, isOwner, usedPrefix, command }) => {
    const q = m.quoted;
    if (!q) {
        return m.reply(`🎙️ *تحويل الصوت إلى نص*\n\nرد على بصمة صوتية (quote) واكتب ${usedPrefix + command}\nاللغة الافتراضية: الدارجة المغربية 🇲🇦\nلغات أخرى: ${usedPrefix + command} fr / en / es ...`);
    }
    const mime = q.mimetype || '';
    if (!mime.startsWith('audio/')) {
        return m.reply('⚠️ خاص ترد على *بصمة صوتية* أو ملف صوتي.');
    }
    const seconds = Number(q.seconds || q.duration || 0);
    if (seconds > MAX_SECONDS) {
        return m.reply(`⚠️ البصمة طويلة بزاف (${seconds} ثانية). الحد الأقصى هو ${MAX_SECONDS} ثانية — قسمها وجرب.`);
    }

    const langArg = (text || '').trim().toLowerCase();
    const lang = LANGS[langArg] || (/^[a-z]{2}(-[A-Z]{2})?$/i.test(langArg) ? langArg : 'ar-MA');

    await m.react?.('🎧').catch(() => {});
    try {
        let buffer = null;
        try { buffer = await q.download(); }
        catch { buffer = null; }
        if (!buffer?.length) throw new Error('تعذر تحميل الصوت من الرسالة');

        const transcript = await transcribeAudio(buffer, lang);
        if (!transcript) {
            return m.reply('🤔 ما قدرت نفهم حتى كلمة من هاد البصمة. جرب بصمة أوضح، أقصر، وبعيدة على الضجيج.');
        }
        await m.react?.('✅').catch(() => {});
        return m.reply(`📝 *النص المفرغ* (${lang === 'ar-MA' ? 'دارجة مغربية' : lang}):\n\n${transcript}`);
    } catch (e) {
        return m.reply('❌ فشل التفريغ. عاود من بعد.' + (isOwner ? `\n\n🔧 تفاصيل للمالك: ${String(e?.message || e).slice(0, 150)}` : ''));
    }
};

handler.help = ['audiototxt'];
handler.command = ['audiototxt', 'voicetotext', 'totext'];
handler.tags = ['ai'];
handler.limit = false;
export default handler;
