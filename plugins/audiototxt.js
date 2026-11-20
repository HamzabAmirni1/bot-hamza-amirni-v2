// plugins/audiototxt.js — تحويل البصمات الصوتية إلى نص + رد AI عليها
// بوت حمزة اعمرني | Hamza Amirni
//
// الاستعمال:
//   .audiototxt       → تفريغ الصوت بالدارجة المغربية
//   .audiototxt ai    → تفريغ + رد AI على المحتوى 🆕
//   .audiai           → alias سريع لـ AI mode 🆕
//   .voiceai          → alias آخر 🆕

import { transcribeAudio } from '../lib/stt.js';
import { getSmartAIReply, cleanAIResponse } from '../lib/ai.js';

const MAX_SECONDS = 120;

const buildAIPrompt = (transcript) => `You are *Bot Amirni Hamza* (بوت حمزة اعمرني), a smart WhatsApp assistant created by Moroccan developer *Hamza Amirni* (حمزة اعمرني).

A user sent a voice message. The voice was transcribed to text. Your job is to understand what they said and give a helpful, friendly reply.

LANGUAGE RULES (STRICT):
• If the text is Moroccan Darija or Arabizi → reply ONLY in Moroccan Darija using ARABIC script (بالحروف العربية).
• If in French → reply in French.
• If in English → reply in English.
• If in Standard Arabic → reply in Standard Arabic.
• NEVER switch language unexpectedly.

WHATSAPP FORMATTING:
• Use *bold* for key points.
• Use emojis naturally.
• Keep reply concise and conversational.
• NO Markdown links [text](url) — write URLs as plain text.
• NEVER mention ChatGPT or OpenAI.

TRANSCRIBED VOICE MESSAGE:
"${transcript}"

Reply to what the user said in their voice message:`;

let handler = async (m, { conn, text, isOwner, usedPrefix, command }) => {
    const q = m.quoted;

    if (!q) {
        return m.reply(
            `🎙️ *تحويل الصوت إلى نص*\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `رد على بصمة صوتية (quote) واكتب:\n\n` +
            `➤ *${usedPrefix}audiototxt* — تفريغ الصوت بالدارجة\n` +
            `➤ *${usedPrefix}audiototxt ai* — تفريغ + رد AI على المحتوى 🤖\n` +
            `➤ *${usedPrefix}audiai* — رد AI مباشر على الصوت\n\n` +
            `⏱️ الحد الأقصى للبصمة: دقيقتان\n` +
            `━━━━━━━━━━━━━━━━\n` +
            `_⚡ بوت حمزة اعمرني_`
        );
    }

    const mime = q.mimetype || '';
    if (!mime.startsWith('audio/')) {
        return m.reply('⚠️ خاص ترد على *بصمة صوتية* أو ملف صوتي.');
    }

    const seconds = Number(q.seconds || q.duration || 0);
    if (seconds > MAX_SECONDS) {
        return m.reply(`⚠️ البصمة طويلة بزاف (${seconds} ثانية). الحد الأقصى هو ${MAX_SECONDS} ثانية.`);
    }

    // .audiai / .voiceai → force AI mode
    const forceAI = /^(audiai|voiceai)$/i.test(command);
    const wantsAI = forceAI || (text || '').trim().toLowerCase().split(/\s+/).includes('ai');

    await m.react?.('🎧').catch(() => {});

    try {
        let buffer = null;
        try { buffer = await q.download(); } catch { buffer = null; }
        if (!buffer?.length) throw new Error('تعذر تحميل الصوت من الرسالة');

        // ── Transcribe (always Darija) ─────────────────────────────────────
        const transcript = await transcribeAudio(buffer);
        if (!transcript) {
            await m.react?.('❓').catch(() => {});
            return m.reply('🤔 ما قدرت نفهم حتى كلمة من هاد البصمة.\nجرب بصمة أوضح، أقصر، وبعيدة على الضجيج.');
        }

        await m.react?.('✅').catch(() => {});

        // ── Transcribe only ────────────────────────────────────────────────
        if (!wantsAI) {
            return m.reply(
                `🎙️ *النص المفرغ* (دارجة مغربية 🇲🇦):\n` +
                `━━━━━━━━━━━━━━━━\n\n` +
                `${transcript}\n\n` +
                `━━━━━━━━━━━━━━━━\n` +
                `_💡 لرد AI على البصمة: ${usedPrefix}audiototxt ai_\n` +
                `_⚡ بوت حمزة اعمرني_`
            );
        }

        // ── AI Mode: transcribe + answer ───────────────────────────────────
        await m.reply(
            `🎙️ *النص المفرغ:*\n_${transcript}_\n\n` +
            `🧠 *البوت كيفكر فـ الجواب...*`
        );

        let aiResponse = await getSmartAIReply(transcript, { systemPrompt: buildAIPrompt(transcript) });
        if (aiResponse) aiResponse = cleanAIResponse(aiResponse);

        if (!aiResponse) {
            return m.reply('❌ *الـ AI ما قدرش يجاوب دابا*\n_عاود من بعد أ صاحبي_ 🙏');
        }

        const header = '🤖 *بوت حمزة اعمرني — رد على البصمة*\n━━━━━━━━━━━━━━━━';
        const footer = '━━━━━━━━━━━━━━━━\n_🎙️ Voice AI • بوت حمزة اعمرني_';

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
            (isOwner ? `\n\n🔧 _${String(e?.message || e).slice(0, 200)}_` : '')
        );
    }
};

handler.help = ['audiototxt', 'audiai'];
handler.tags = ['ai'];
handler.command = ['audiototxt', 'voicetotext', 'totext', 'audiai', 'voiceai'];
handler.limit = false;

export default handler;
