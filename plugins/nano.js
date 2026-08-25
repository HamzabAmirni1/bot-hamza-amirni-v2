/**
 * 🍌 Nano-Banana AI Multi-Engine
 * Author: Omegatech
 * Version: 5.0 (Collector Mode)
 * Description: Advanced AI image generation and editing with multi-image blending
 *
 * 🛠️ Features:
 * - Text to image generation
 * - Image editing with prompts
 * - Multi-image blending (up to 4 images)
 * - Collector mode for batch processing
 */

import axios from 'axios'
import FormData from 'form-data'

let bananaSession = {}

async function uploadMedia(m) {
  try {
    const q = m.quoted ? m.quoted : m
    if (!/image/.test(q.mimetype || q.msg?.mimetype)) return null
    const media = await q.download()
    const form = new FormData()
    form.append('file', media, { filename: 'image.jpg' })
    form.append('type', 'permanent')
    const res = await axios.post('https://tmp.malvryx.dev/upload', form, {
      headers: form.getHeaders()
    })
    return res.data?.cdnUrl || res.data?.directUrl || null
  } catch (e) {
    return null
  }
}

function showGuide(m, conn, usedPrefix, command, userLang = 'darija') {
  let guideText = '';

  if (userLang === 'darija') {
    guideText = `🍌 *الذكاء الاصطناعي نانو بنانا (Nano-Banana AI)*
━━━━━━━━━━━━━━━━━━━━

_توليد ورسم الصور وتعديلها بالذكاء الاصطناعي، مع إمكانية دمج حتى 4 صور معاً باحترافية!_ 🎨

📌 *طريقة الاستعمال:*
• *${usedPrefix}nano <الوصف>* — رسم وتوليد صورة بالذكاء الاصطناعي من النص
• رد على أي صورة بـ *${usedPrefix}nano <التعديل>* — تعديل ديك الصورة بالذكاء الاصطناعي
• *${usedPrefix}nanopro* — تفعيل وضع التجميع، صيفط الصور وحدة وحدة (حتى 4 صور)
• *${usedPrefix}nanopro done <الوصف>* — دمج جميع الصور المجموعة مع الوصف ديالك

💡 *أمثلة:*
${usedPrefix}nano قطة كترتدي نظارات شمسية فالفضاء 4k
${usedPrefix}nanopro done ادمج هاد الصور بأسلوب أنمي سينمائي

⚡ _bot amirni hamza • حمزة اعمرني_`;
  } else if (userLang === 'arabic') {
    guideText = `🍌 *الذكاء الاصطناعي نانو بنانا (Nano-Banana AI)*
━━━━━━━━━━━━━━━━━━━━

_توليد وتعديل الصور بواسطة الذكاء الاصطناعي، مع إمكانية دمج ما يصل إلى 4 صور معاً!_ 🎨

📌 *طريقة الاستخدام:*
• *${usedPrefix}nano <الوصف>* — توليد ورسم صورة جديدة من النص
• الرد على أي صورة بـ *${usedPrefix}nano <التعديل>* — تعديل الصورة المحددة بالذكاء الاصطناعي
• *${usedPrefix}nanopro* — تفعيل وضع التجميع، أرسل الصور واحدة تلو الأخرى (حتى 4 صور)
• *${usedPrefix}nanopro done <الوصف>* — دمج كافة الصور المجمعة مع وصفك المخصص

💡 *أمثلة:*
${usedPrefix}nano رائد فضاء في غابة مضيئة بدقة عالية
${usedPrefix}nanopro done ادمج هذه الصور بأسلوب سينمائي فخم

⚡ _bot amirni hamza • حمزة اعمرني_`;
  } else {
    guideText = `🍌 *Nano-Banana AI Engine*
━━━━━━━━━━━━━━━━━━━━

_AI image generation and editing with support for blending up to 4 images together!_ 🎨

📌 *How to use:*
• *${usedPrefix}nano <prompt>* — Generate image from text
• Reply to an image with *${usedPrefix}nano <prompt>* — Edit that image
• *${usedPrefix}nanopro* — Start collector mode, then send images one by one (up to 4)
• *${usedPrefix}nanopro done <prompt>* — Blend all collected images using your prompt

💡 *Examples:*
${usedPrefix}nano Cyberpunk neon city in rain 4k
${usedPrefix}nanopro done Blend these photos into anime cinematic style

⚡ _bot amirni hamza • Hamza Amirni_`;
  }

  return conn.reply(m.chat, guideText, m);
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const userId = m.sender
  const userLang = global.db?.data?.users?.[m.sender]?.language || 'darija';
  text = text || m.quoted?.text || m.msg?.caption || ''
  const isNanoPro = /nanopro/i.test(command)

  if (isNanoPro) {
    if (!bananaSession[userId]) bananaSession[userId] = { images: [] }

    if (text?.toLowerCase().startsWith('done')) {
      const session = bananaSession[userId]
      const finalPrompt = text.replace(/done/i, '').trim()

      if (session.images.length < 2) {
        const minMsg = userLang === 'english'
          ? '⚠️ *Nano-Banana Pro*\n\nPlease add at least 2 images before finishing.'
          : userLang === 'arabic'
          ? '⚠️ *نانو بنانا برو*\n\nيرجى إضافة صورتين على الأقل قبل إتمام الدمج.'
          : '⚠️ *نانو بنانا برو*\n\nخاصك تصيفط 2 تصاور على الأقل عاد دير done أ العشير.';
        return conn.reply(m.chat, minMsg, m)
      }
      if (!finalPrompt) {
        const reqPrompt = userLang === 'english'
          ? `⚠️ *Prompt Required*\n\nUsage: ${usedPrefix + command} done <your prompt>`
          : userLang === 'arabic'
          ? `⚠️ *الوصف مطلوب*\n\nالاستخدام: ${usedPrefix + command} done <الوصف المطلوب>`
          : `⚠️ *الوصف مطلوب*\n\nالاستعمال: ${usedPrefix + command} done <الوصف ديالك>`;
        return conn.reply(m.chat, reqPrompt, m)
      }

      await m.react('🕒')
      try {
        let apiUrl = `https://omegatech-api.dixonomega.tech/api/ai/nanobana-pro-v3?prompt=${encodeURIComponent(finalPrompt)}`
        session.images.forEach((url, i) => {
          apiUrl += `&image${i + 1}=${encodeURIComponent(url)}`
        })

        const { data: initRes } = await axios.get(apiUrl)
        if (!initRes.success) throw new Error('API failed to initiate blend.')

        const taskId = initRes.task_id
        let resultUrl = null
        let attempts = 0

        while (!resultUrl && attempts < 25) {
          await new Promise(r => setTimeout(r, 5000))
          const { data: check } = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}`)
          if (check.status === 'completed' && check.image_url) {
            resultUrl = check.image_url
            break
          }
          if (check.status === 'failed') throw new Error('Server reported generation failure.')
          attempts++
        }

        if (!resultUrl) throw new Error('Generation timed out.')

        const caption = userLang === 'english'
          ? `🍌 *NANO-BANANA PRO SUCCESS*\n\n🖼️ *Images Blended:* ${session.images.length}\n📝 *Prompt:* ${finalPrompt}\n⚡ *bot amirni hamza*`
          : userLang === 'arabic'
          ? `🍌 *تم دمج الصور بنجاح (Nano Pro)*\n\n🖼️ *عدد الصور المدمجة:* ${session.images.length}\n📝 *الوصف:* ${finalPrompt}\n⚡ *بوت حمزة اعمرني*`
          : `🍌 *تم دمج الصور بنجاح أ العشير (Nano Pro)*\n\n🖼️ *عدد الصور المدمجة:* ${session.images.length}\n📝 *الوصف:* ${finalPrompt}\n⚡ *بوت حمزة اعمرني*`;

        await conn.sendMessage(m.chat, {
          image: { url: resultUrl },
          caption
        }, { quoted: m })

        await m.react('✅')
        delete bananaSession[userId]
      } catch (e) {
        await m.react('❌')
        conn.reply(m.chat, `❌ *Error:* ${e.message}`, m)
        delete bananaSession[userId]
      }
      return
    }

    const link = await uploadMedia(m)
    if (!link) {
      return showGuide(m, conn, usedPrefix, command, userLang)
    }

    if (bananaSession[userId].images.length >= 4) {
      const maxMsg = userLang === 'english'
        ? '❌ *Limit Reached*\n\nMaximum of 4 images allowed.'
        : userLang === 'arabic'
        ? '❌ *تم الوصول للحد الأقصى*\n\nالحد الأقصى هو 4 صور فقط.'
        : '❌ *الحد الأقصى*\n\nالحد الأقصى هو 4 تصاور فقط أ الساط.';
      return conn.reply(m.chat, maxMsg, m)
    }

    bananaSession[userId].images.push(link)
    await m.react('📥')

    const addedMsg = userLang === 'english'
      ? `✅ *Image ${bananaSession[userId].images.length}/4 Added*\n\nSend another image or type:\n*${usedPrefix + command} done <prompt>*`
      : userLang === 'arabic'
      ? `✅ *تمت إضافة الصورة (${bananaSession[userId].images.length}/4)*\n\nأرسل صورة أخرى أو اكتب:\n*${usedPrefix + command} done <الوصف>*`
      : `✅ *تمت إضافة الصورة (${bananaSession[userId].images.length}/4)*\n\nصيفط تصويرة أخرى ولا كتب:\n*${usedPrefix + command} done <الوصف>*`;

    return conn.reply(m.chat, addedMsg, m)
  }

  if (command === 'nano') {
    if (!text && !m.quoted) {
      return showGuide(m, conn, usedPrefix, command, userLang)
    }

    const imageUrl = await uploadMedia(m)

    if (imageUrl) {
      if (!text) {
        const instMsg = userLang === 'english'
          ? `⚠️ *Instruction Required*\n\nExample: Reply to an image with ${usedPrefix}nano make it a zombie`
          : userLang === 'arabic'
          ? `⚠️ *يرجى كتابة التعديل المطلوب*\n\nمثال: قم بالرد على الصورة بـ ${usedPrefix}nano حوله إلى أنمي`
          : `⚠️ *خاصك تكتب التعديل المطلوب*\n\nمثال: رد على التصويرة بـ ${usedPrefix}nano ردو لابس كوستيم`;
        return conn.reply(m.chat, instMsg, m)
      }

      await m.react('🎨')
      try {
        const { data: init } = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(text)}&image=${encodeURIComponent(imageUrl)}`)

        let resultUrl = null
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 5000))
          const { data: check } = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${init.task_id}`)
          if (check.status === 'completed') {
            resultUrl = check.image_url
            break
          }
        }

        if (resultUrl) {
          const editCaption = userLang === 'english'
            ? `✨ *NANO EDIT SUCCESS*\n\n📝 *Prompt:* ${text}\n⚡ *bot amirni hamza*`
            : userLang === 'arabic'
            ? `✨ *تم تعديل الصورة بنجاح*\n\n📝 *الوصف:* ${text}\n⚡ *بوت حمزة اعمرني*`
            : `✨ *تم تعديل الصورة بنجاح أ العشير*\n\n📝 *الوصف:* ${text}\n⚡ *بوت حمزة اعمرني*`;

          await conn.sendMessage(m.chat, {
            image: { url: resultUrl },
            caption: editCaption
          }, { quoted: m })
          await m.react('✅')
        } else {
          await m.react('❌')
          conn.reply(m.chat, '❌ Image edit timed out.', m)
        }
      } catch (e) {
        await m.react('❌')
        conn.reply(m.chat, '❌ Image edit failed.', m)
      }
    } else {
      await m.react('⏳')
      try {
        const { data } = await axios.get(`https://omegatech-api.dixonomega.tech/api/ai/nano-banana-pro?prompt=${encodeURIComponent(text)}`)
        if (data.image) {
          const genCaption = userLang === 'english'
            ? `🍌 *NANO PRO GENERATION*\n\n📝 *Prompt:* ${text}\n⚡ *bot amirni hamza*`
            : userLang === 'arabic'
            ? `🍌 *تم توليد الصورة بالذكاء الاصطناعي*\n\n📝 *الوصف:* ${text}\n⚡ *بوت حمزة اعمرني*`
            : `🍌 *تم رسم الصورة بالذكاء الاصطناعي أ العشير*\n\n📝 *الوصف:* ${text}\n⚡ *بوت حمزة اعمرني*`;

          await conn.sendMessage(m.chat, {
            image: { url: data.image },
            caption: genCaption
          }, { quoted: m })
          await m.react('✅')
        } else {
          await m.react('❌')
          conn.reply(m.chat, '❌ No image generated.', m)
        }
      } catch (e) {
        await m.react('❌')
        conn.reply(m.chat, '❌ Generation failed.', m)
      }
    }
  }
}

handler.help = handler.command = ['nano', 'nanopro']
handler.tags = ['editor']
handler.limit = false

export default handler
