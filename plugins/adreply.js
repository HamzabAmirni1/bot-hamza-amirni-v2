/*
 * AdReply All — كل ردود البوت على شكل AdReply — Bot Amirni Hamza v2
 *
 * كيخدم بـ before hook: كيبدل m.reply ديال أي أمر، فأي رد نصي
 * (مثال: جواب .s "Send or reply to media...") كيخرج ببطاقة
 * AdReply ديال Bot Amirni Hamza نفسها (conn.adReply): صورة + عنوان + وصف
 * + رابط — بدل النص العادي.
 *
 * التحكم (للمالك فقط):  .adreply on  /  .adreply off
 * الحالة كتبقى حتى يعاود البوت التشغيل.
 *
 * ملاحظة: الردود لي ماشي نصية (صور/ملفات...) كتبقى عادية.
 */

import fs, { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

// — إعدادات البطاقة الرسمية لبوت حمزة اعمرني —
const AD_TITLE = 'Bot Amirni Hamza ✦ حمزة اعمرني بوت'                 // عنوان البطاقة
const AD_BODY = 'أقوى بوت واتساب ذكي ومتطور ⚡ سرعة • ذكاء • أمان' // الوصف تحت العنوان
const AD_SOURCE = 'https://whatsapp.com/channel/0029ValXRoHCnA7yKopcrn1p' // القناة الرسمية لحمزة اعمرني

// تصغير صورة لـ JPEG صغير (320px) بـ ffmpeg — thumbnails ديال معاينة
// الروابط فواتساب خاصهم يكونو صغار
function downscaleJpeg(buffer) {
    return new Promise((resolve) => {
        try {
            const ff = spawn('ffmpeg', ['-y', '-i', 'pipe:0', '-vf', 'scale=320:320:force_original_aspect_ratio=decrease', '-f', 'mjpeg', '-q:v', '3', 'pipe:1'])
            const chunks = []
            ff.stdout.on('data', c => chunks.push(c))
            ff.on('error', () => resolve(null))
            ff.on('close', code => resolve(code === 0 && chunks.length ? Buffer.concat(chunks) : null))
            ff.stdin.on('error', () => {})
            ff.stdin.end(buffer)
        } catch { resolve(null) }
    })
}

let thumbCache // undefined = ما تحسبش، null = ما كاينش
async function getThumb(conn) {
    if (thumbCache !== undefined) return thumbCache
    try {
        const local = fileURLToPath(new URL('../media/thumbnail.jpg', import.meta.url))
        if (existsSync(local)) {
            const buf = await fs.promises.readFile(local)
            const scaled = await downscaleJpeg(buf)
            return (thumbCache = scaled || buf)
        }
        if (conn?.user?.jid && typeof conn.profilePictureUrl === 'function') {
            const pp = await conn.profilePictureUrl(conn.user.jid, 'image', 'buffer').catch(() => null)
            if (pp) return (thumbCache = pp)
        }
    } catch {}
    return (thumbCache = null)
}

let handler = async (m, { conn, text }) => {
    const arg = (text || '').trim().toLowerCase()
    if (arg === 'off') {
        globalThis.__adReplyAll = false
        return m.reply('🔕 AdReply replies: OFF — الردود رجعات عادية.')
    }
    if (arg === 'on') {
        globalThis.__adReplyAll = true
        return m.reply('🔔 AdReply replies: ON — كل الردود النصية غادي تخرج ببطاقة AdReply.')
    }
    return m.reply(`AdReply replies are currently: ${globalThis.__adReplyAll === false ? 'OFF 🔕' : 'ON 🔔'}\nUsage: .adreply on | off`)
}
handler.help = handler.command = ['adreply']
handler.tags = ['owner']
handler.owner = true

handler.before = async function (m, { conn }) {
    if (globalThis.__adReplyAll === false) return
    if (!m || typeof m.reply !== 'function' || m.__adReplyWrapped) return
    if (typeof conn?.adReply !== 'function') return
    m.__adReplyWrapped = true
    const original = m.reply.bind(m)
    const wrapped = async (text, ...rest) => {
        if (typeof text !== 'string' || !text.trim()) return original(text, ...rest)
        try {
            const thumb = await getThumb(conn)
            if (!thumb) return original(text, ...rest)
            return await conn.adReply(m.chat, text, thumb, m, {
                title: AD_TITLE || conn.user?.name || 'BOT AMIRNI HAMZA',
                description: AD_BODY,
                source: global.source || global.channel || AD_SOURCE,
            })
        } catch (e) {
            console.error('[adreply] failed, falling back:', e?.message || e)
            return original(text, ...rest)
        }
    }
    try {
        // m.reply فـ Bot Amirni Hamza معرفة على الـ prototype بـ defineProperties
        // (read-only) — التعيين العادي m.reply = ... كيخسر، ولكن
        // defineProperty على الرسالة نفسها كتظللها بنجاح
        Object.defineProperty(m, 'reply', { value: wrapped, writable: true, configurable: true })
    } catch (e) {
        console.error('[adreply] could not wrap m.reply:', e?.message || e)
    }
}

export default handler
