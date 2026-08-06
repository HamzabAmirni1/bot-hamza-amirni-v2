import axios from 'axios'

// ─── Qwa Class (self-contained) ───────────────────────────────────────────────
class Qwa {
  constructor() {
    this.url = 'https://qwa.eeq.my.id/api/generate'
  }

  _toBase64(v) {
    return Buffer.isBuffer(v)
      ? `data:image/png;base64,${v.toString('base64')}`
      : v || ''
  }

  async generate({ message, ...rest }) {
    try {
      const payload = {
        sender_name: rest?.sender_name || `User-${Math.floor(Math.random() * 1000)}`,
        message:     message || `Sent at ${new Date().toISOString()}`,
        ...(rest?.sender_number && { sender_number: rest.sender_number }),
        ...(rest?.sender_avatar && { sender_avatar: this._toBase64(rest.sender_avatar) }),
        ...(rest?.sender_image  && { sender_image:  this._toBase64(rest.sender_image)  }),
        ...(rest?.time          && { time:           rest.time                          }),
        ...(rest?.background !== undefined && { background: rest.background }),
        ...(rest?.quoted && {
          quoted: { ...rest.quoted, image: this._toBase64(rest.quoted?.image) },
        }),
      }

      const { data, headers } = await axios.post(this.url, payload, {
        responseType: 'arraybuffer',
        headers: { 'Content-Type': 'application/json' },
      })

      return {
        buffer:      Buffer.from(data),
        contentType: headers['content-type'] || 'image/png',
      }
    } catch (e) {
      const msg = e?.response?.data
        ? Buffer.from(e.response.data).toString()
        : e.message
      throw new Error(msg)
    }
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────
const handler = async (m, { conn, usedPrefix, command, args, quoted }) => {
  let user = global.db.data.users[m.sender] || {}
  let lang = user.language || 'darija'
  const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : da

  // ── Guide card (no args) ──────────────────────────────────────────────────
  if (!args[0]) {
    const guide = t(
`🖼️  *Fake WhatsApp Chat Generator*

Generate a realistic-looking WhatsApp chat screenshot with a custom sender name and message — great for fun, memes, or creative content!

━━━━━━━━━━━━━━━━━━━━
📌  *Basic usage:*
← ${usedPrefix}${command} <SenderName> | <message>

📌  *Examples:*
← ${usedPrefix}${command} Ahmed | Hello, how are you?
← ${usedPrefix}${command} Hamza | Bot Amirni 🤖

━━━━━━━━━━━━━━━━━━━━
📌  *Optional — reply to an image* to use it as the sender's avatar photo.`,

`🖼️  *صانع محادثات واتساب الوهمية*

اصنع لقطة شاشة لمحادثة واتساب غير حقيقية باسم ورسالة مخصصة — رائع للميمز والمزاح!

━━━━━━━━━━━━━━━━━━━━
📌  *طريقة الاستخدام:*
← ${usedPrefix}${command} <الاسم> | <الرسالة>

📌  *أمثلة:*
← ${usedPrefix}${command} أحمد | السلام عليكم كيف الحال؟
← ${usedPrefix}${command} حمزة | بوت اعمرني 🤖

━━━━━━━━━━━━━━━━━━━━
📌  *اختياري — قم بالرد على صورة* لاستخدامها كصورة شخصية (Avatar).`,

`🖼️  *مولد شات واتساب وهمي*

صاوب سكرين شات ديالمحادثة واتساب مسبكة بالسمية والمسج اللي بغيتي — ناضية للميمز والضحك!

━━━━━━━━━━━━━━━━━━━━
📌  *طريقة الاستخدام:*
← ${usedPrefix}${command} <السمية> | <المسج>

📌  *أمثلة:*
← ${usedPrefix}${command} أحمد | السلام عليكم كي داير؟
← ${usedPrefix}${command} حمزة | بوت اعمرني 🤖

━━━━━━━━━━━━━━━━━━━━
📌  *اختياري — ريبوندي على صورة* باش تولي هي التصويرة الشخصية (Avatar).`
    ).trim()

    return m.reply(guide)
  }

  // ── Parse input: "SenderName | message" ──────────────────────────────────
  const raw   = args.join(' ')
  const parts = raw.split('|').map(s => s.trim())

  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return m.reply(
      t(
        `❌ Wrong format!\n\nUse:\n← ${usedPrefix}${command} <SenderName> | <message>\n\nExample:\n← ${usedPrefix}${command} Ahmed | Hello there!`,
        `❌ الصيغة غير صحيحة!\n\nاستخدم:\n← ${usedPrefix}${command} <الاسم> | <الرسالة>\n\nمثال:\n← ${usedPrefix}${command} أحمد | مرحباً بك!`,
        `❌ كتب الشي مقاد أ عشيري!\n\nاستخدم:\n← ${usedPrefix}${command} <السمية> | <المسج>\n\nمثال:\n← ${usedPrefix}${command} أحمد | هاني أ خاي!`
      )
    )
  }

  const senderName = parts[0]
  const message    = parts.slice(1).join('|').trim() // allow | inside message

  await m.reply(t('🖼️ Generating your chat screenshot... Please wait!', '🖼️ جارٍ إنشاء لقطة الشاشة... انتظر لحظة!', '🖼️ كنسكرينيو الشات... صبر شوية!'))

  // ── Optionally grab avatar from quoted image ──────────────────────────────
  let senderAvatar
  try {
    if (quoted?.msg?.mimetype?.startsWith('image')) {
      senderAvatar = await quoted.download()
    }
  } catch { /* ignore, avatar is optional */ }

  // ── Generate ──────────────────────────────────────────────────────────────
  const qwa = new Qwa()

  let result
  try {
    result = await qwa.generate({
      sender_name:   senderName,
      message,
      time:          new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      ...(senderAvatar && { sender_avatar: senderAvatar }),
    })
  } catch (e) {
    return m.reply(t(`❌ Failed to generate image.\n\n_${e.message}_`, `❌ فشل إنشاء الصورة.\n\n_${e.message}_`, `❌ ما قدرناش نصاوبو الصورة.\n\n_${e.message}_`))
  }

  if (!result?.buffer) {
    return m.reply(t('❌ The API returned an empty response. Please try again later.', '❌ لم يُرجع السيرفر أي نتيجة. حاول لاحقاً.', '❌ السيرفر ما رجع والو. حاول من بعد.'))
  }

  // ── Send result ───────────────────────────────────────────────────────────
  const caption = t(
    `🖼️  *Fake Chat Screenshot*\n\n👤  Sender  :  *${senderName}*\n💬  Message  :  ${message}`,
    `🖼️  *محادثة وهمية*\n\n👤  المرسل  :  *${senderName}*\n💬  الرسالة  :  ${message}`,
    `🖼️  *شات وهمي*\n\n👤  المرسل  :  *${senderName}*\n💬  المسج  :  ${message}`
  )

  await conn.sendMessage(
    m.chat,
    { image: result.buffer, caption },
    { quoted: m }
  )
}

handler.help    = ['fakechat']
handler.command = /^(fakechat|fakem|qwa|chatfake)$/i
handler.tags    = ['ai', 'tools']
handler.limit   = false
export default handler
