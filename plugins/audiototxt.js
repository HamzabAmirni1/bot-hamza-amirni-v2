// plugins/audiototxt.js — تحويل البصمات الصوتية إلى نص + رد AI عليها
// الاستعمال:
//   .audiototxt            → تفريغ الصوت بالدارجة المغربية فقط
//   .audiototxt ai         → تفريغ + رد AI على النص المفرغ
//   .audiototxt fr         → تفريغ بالفرنسية
//   .audiototxt ai fr      → تفريغ بالفرنسية + رد AI
//
// التقنية: الصوت كيتحول بـ ffmpeg إلى FLAC 16kHz وكيتصيفط لـ Google Speech.
// حد الطول: دقيقتان للبصمة الواحدة.

import fs from 'node:fs';
import path from 'node:path';
import { transcribeAudio } from '../lib/stt.js';
import { getSmartAIReply, cleanAIResponse } from '../lib/ai.js';

const LANGS = {
    ma: 'ar-MA', ar: 'ar-MA', fr: 'fr-FR', en: 'en-US',
    es: 'es-ES', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', tr: 'tr-TR'
};
const MAX_SECONDS = 120;

// system prompt لـ AI باش يفهم إنو الكلام جا من صوت
const buildAIPrompt = (transcript, lang) => `You are *Bot Amirni Hamza* (بوت حمزة اعمرني), a smart WhatsApp assistant created by Moroccan developer *Hamza Amirni*.

A user sent a voice message. The voice was transcribed and the text is below. Your job is to UNDERSTAND what they said and give a helpful, conversational reply.

LANGUAGE RULES (STRICT):
• If the transcribed text is in Moroccan Darija or Arabizi → reply in Moroccan Darija using ARABIC script (بالحروف العربية).
• If in French → reply in French.
• If in English → reply in English.
• If in Standard Arabic → reply in Standard Arabic.
• NEVER mix languages unexpectedly. Match the user's language.

WHATSAPP FORMATTING:
• Use *bold* for key points.
• Use emojis naturally.
• Keep reply concise and conversational (this is a voice message reply, not an essay).
• NO Markdown links like [text](url) — write URLs as plain text.
• NEVER mention ChatGPT or OpenAI.

TRANSCRIBED VOICE MESSAGE:
"${transcript}"

Now reply to what the user said in their voice message:`;

let handler = async (m, { conn, text, isOwner, usedPrefix, command }) => {
    const q = m.quoted;
    if (!q) {
        return m.reply(
            `🎙️ *تحويل الصوت إلى نص*\n\n` +
            `رد على بصمة صوتية (quote) واكتب:\n` +
            `➤ *${usedPrefix + command}* — تفريغ الصوت بالدارجة\n` +
            `➤ *${usedPrefix + command} ai* — تفريغ + رد AI على المحتوى\n` +
            `➤ *${usedPrefix + command} fr* — تفريغ بالفرنسية\n` +
            `➤ *${usedPrefix + command} ai fr* — تفريغ فرنسي + رد AI\n\n` +
            `🌍 لغات: ma | ar | fr | en | es | de | it | pt | tr\n` +
            `⏱️ الحد الأقصى: دقيقتان`
        );
    }

    const mime = q.mimetype || '';
    if (!mime.startsWith('audio/')) {
        return m.reply('⚠️ خاص ترد على *بصمة صوتية* أو ملف صوتي.');
    }

    const seconds = Number(q.seconds || q.duration || 0);
    if (seconds > MAX_SECONDS) {
        return m.reply(`⚠️ البصمة طويلة بزاف (${seconds} ثانية). الحد الأقصى هو ${MAX_SECONDS} ثانية — قسمها وجرب.`);
    }

    // parse arguments: check for "ai" flag and language
    const args = (text || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const wantsAI = args.includes('ai');
    const langArgs = args.filter(a => a !== 'ai');
    const langArg = langArgs[0] || '';
    const lang = LANGS[langArg] || (/^[a-z]{2}(-[A-Z]{2})?$/i.test(langArg) ? langArg : 'ar-MA');

    await m.react?.('🎧').catch(() => {});

    try {
        // ── Step 1: Download audio ──────────────────────────────────────────
        let buffer = null;
        try { buffer = await q.download(); } catch { buffer = null; }
        if (!buffer?.length) throw new Error('تعذر تحميل الصوت من الرسالة');

        // ── Step 2: Transcribe ─────────────────────────────────────────────
        const transcript = await transcribeAudio(buffer, lang);
        if (!transcript) {
            return m.reply('🤔 ما قدرت نفهم حتى كلمة من هاد البصمة. جرب بصمة أوضح، أقصر، وبعيدة على الضجيج.');
        }

        await m.react?.('✅').catch(() => {});

        const langLabel = lang === 'ar-MA' ? 'دارجة مغربية 🇲🇦' : lang;

        // ── Step 3: If only transcribe (no AI flag) ─────────────────────────
        if (!wantsAI) {
            return m.reply(`🎙️ *النص المفرغ* (${langLabel}):\n\n${transcript}`);
        }

        // ── Step 4: AI mode — transcribe + reply ───────────────────────────
        await m.reply(`🎙️ *النص المفرغ* (${langLabel}):\n\n_${transcript}_\n\n🧠 *البوت كيفكر فـ الجواب...*`);

        const aiPrompt = buildAIPrompt(transcript, lang);
        let aiResponse = await getSmartAIReply(transcript, { systemPrompt: aiPrompt });
        if (aiResponse) aiResponse = cleanAIResponse(aiResponse);

        if (!aiResponse) {
            return m.reply('❌ *الـ AI ما قدرش يجاوب دابا*\n_عاود من بعد أ صاحبي_ 🙏');
        }

        const header = '🤖 *بوت حمزة اعمرني — رد على البصمة*\n━━━━━━━━━━━━━━━━';
        const footer = '━━━━━━━━━━━━━━━━\n_🎙️ Powered by Voice AI • bot amirni hamza_';

        try {
            await conn.sendButton(m.chat, {
                body: `${header}\n\n${aiResponse}\n\n${footer}`,
                footer: '⚡ bot amirni hamza • حمزة اعمرني',
                buttons: [
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📸 Instagram',
                            url: 'https://instagram.com/hamza_amirni_01',
                            merchant_url: 'https://instagram.com/hamza_amirni_01'
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '👑 مالك البوت',
                            id: `${usedPrefix}owner`
                        })
                    }
                ]
            }, { quoted: m });
        } catch (_) {
            await m.reply(`${header}\n\n${aiResponse}\n\n${footer}`);
        }

    } catch (e) {
        await m.react?.('❌').catch(() => {});
        return m.reply(
            '❌ وقع مشكل فـ المعالجة.' +
            (isOwner ? `\n\n🔧 تفاصيل: ${String(e?.message || e).slice(0, 200)}` : '')
        );
    }
};

handler.help = ['audiototxt [ai] [lang]'];
handler.tags = ['ai'];
handler.command = ['audiototxt', 'voicetotext', 'totext', 'audiai', 'voiceai'];
handler.limit = false;

export default handler;
