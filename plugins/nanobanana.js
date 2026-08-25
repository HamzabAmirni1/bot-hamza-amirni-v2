/*
Name: imgedit.ai - Nanobanana Image Editor
Type: Scraper -> ESM Plugin
Saluran: https://whatsapp.com/channel/0029Vb2OwWCElagtreIoke17
Base Url: https://imgedit.ai
Original scraper by: t.me/hazeloffc
*/

import axios from 'axios'
import crypto from 'crypto'

const CONFIG = {
  UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  TIMEOUT: 60000,
  MAX_RETRIES: 3,
  AES_KEY: Buffer.from('651cc172938d5b7799a23ac245e539a6', 'utf-8'),
  AES_IV: Buffer.from('35e5cd2d684e5c65', 'utf-8'),
  SOFT_ID: 'imgedit_web',
  DRAW_HOST: 'https://imgedit.ai',
  UPLOAD_HOST: 'https://upload.imgedit.ai'
}

const HDR = {
  'Content-Type': 'application/json',
  Origin: 'https://imgedit.ai',
  Referer: 'https://imgedit.ai/',
  'User-Agent': CONFIG.UA
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateEkey() {
  const l1 = ['a', 'd', 'g', 'h', 'k', 'o', '4', '5', '6', '7', '8']
  const l2 = ['0', '1', '2', '3', '8', '9', 'a', 'b', 'c', 'd', 'u', 'i', 'o', 'p', 'm', 'n']
  let s = String(Math.floor(Math.random() * 3000) + 7000)
  for (let i = 0; i < 4; i++) s += l1[Math.floor(Math.random() * l1.length)]
  for (let i = 0; i < 4; i++) s += l2[Math.floor(Math.random() * l2.length)]
  s += String(1000 + Math.floor(Math.random() * 3000))
  return s
}

function decrypt(data) {
  if (!data) return null
  try {
    const dec = crypto.createDecipheriv('aes-256-cbc', CONFIG.AES_KEY, CONFIG.AES_IV)
    const ct = Buffer.from(data, 'base64')
    const out = Buffer.concat([dec.update(ct), dec.final()])
    return JSON.parse(out.toString('utf-8'))
  } catch (e) {
    return null
  }
}

function commonParams() {
  return { ekey: generateEkey(), soft_id: CONFIG.SOFT_ID }
}

function detectMime(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e) return 'image/png'
  if (buf[0] === 0x47 && buf[1] === 0x49) return 'image/gif'
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45) return 'image/webp'
  return 'image/jpeg'
}

async function requestWithRetry(config, label, attempts = CONFIG.MAX_RETRIES) {
  let lastError
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await axios({
        timeout: CONFIG.TIMEOUT,
        validateStatus: () => true,
        ...config
      })
      return response
    } catch (e) {
      lastError = e
      if (i === attempts) throw new Error(`${label} failed: ${e.message}`)
      await sleep(1000 * i)
    }
  }
  throw lastError
}

// Directly convert an already-downloaded WhatsApp media buffer to a data URI,
// instead of fetching a remote image_url like the original scraper did.
function bufferToDataUri(buf) {
  const mime = detectMime(buf)
  return `data:${mime};base64,` + buf.toString('base64')
}

async function uploadBase64(dataUri) {
  const response = await requestWithRetry(
    {
      method: 'post',
      url: `${CONFIG.UPLOAD_HOST}/api/v1/files/uploadImgs`,
      data: { files_base64: dataUri },
      params: commonParams(),
      headers: HDR
    },
    'upload image'
  )

  const payload = decrypt(response.data && response.data.data)
  if (!payload || payload.code !== 0) {
    const msg = (payload && payload.msg) || (response.data && response.data.msg) || 'Upload failed'
    throw new Error(`Upload error: ${msg}`)
  }
  const paths = payload.data && payload.data.paths
  if (!Array.isArray(paths) || !paths.length) {
    throw new Error('Upload did not return an image path')
  }
  return paths[0]
}

async function createNanoTask(imageKey, prompt) {
  const body = {
    layout: 9,
    action: 145,
    prompt_text: prompt,
    image_key_type: 3,
    task_params: { input_image: [imageKey] }
  }

  const response = await requestWithRetry(
    {
      method: 'post',
      url: `${CONFIG.DRAW_HOST}/api/v1/draw-task/nano`,
      data: body,
      params: commonParams(),
      headers: HDR
    },
    'create task'
  )

  const payload = decrypt(response.data && response.data.data)
  if (!payload || payload.code !== 0) {
    const msg = (payload && payload.msg) || (response.data && response.data.msg) || 'Create task failed'
    throw new Error(`Create task error: ${msg}`)
  }
  const serialNo = payload.data && payload.data.serial_no
  if (!serialNo) throw new Error('Task did not return a serial_no')
  return serialNo
}

async function pollTask(serialNo, { maxTries = 90, intervalMs = 2000 } = {}) {
  for (let i = 0; i < maxTries; i++) {
    await sleep(intervalMs)

    const response = await requestWithRetry(
      {
        method: 'get',
        url: `${CONFIG.DRAW_HOST}/api/v1/draw-task/${serialNo}`,
        params: commonParams(),
        headers: HDR
      },
      'poll task'
    )

    const payload = decrypt(response.data && response.data.data)
    const detail = payload && payload.data && payload.data.detail
    if (!detail) continue

    if (detail.status === 2) {
      let paths
      try {
        paths = JSON.parse(detail.path)
      } catch (e) {
        paths = null
      }
      if (!Array.isArray(paths) || !paths.length) {
        throw new Error('Task completed but path is empty')
      }
      return paths
    }
    if (detail.status === 3) {
      throw new Error('Task failed: ' + (detail.fail_msg || 'unknown'))
    }
  }
  throw new Error('Task timeout — did not complete in time')
}

async function nanoBananaEditor(imageBuffer, prompt) {
  if (!imageBuffer) throw new Error('image buffer is required')
  if (!prompt) throw new Error('prompt is required')

  const dataUri = bufferToDataUri(imageBuffer)
  const imageKey = await uploadBase64(dataUri)
  const serial = await createNanoTask(imageKey, prompt)
  const results = await pollTask(serial)

  return {
    serial_no: serial,
    image_key: imageKey,
    prompt,
    images: results,
    image: results[0]
  }
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const quoted = m.quoted ? m.quoted : m
  const mime = (quoted.msg || quoted).mimetype || ''

  if (!/image/.test(mime)) {
    return conn.reply(
      m.chat,
      `🎨 *Nanobanana Image Editor*

Edit any photo using AI just by describing the change you want — add objects, change scenery, alter style, and more.

*How to use:*
1. Send a photo (or reply to an existing photo).
2. Add the caption/command followed by what you want changed.

*Example:*
${usedPrefix + command} add a rainbow across the sky
_(send this as caption on a photo, or reply to a photo with this text)_

Processing may take up to a minute depending on server load.`,
      m
    )
  }

  if (!text) {
    return conn.reply(m.chat, `Please describe the edit you want.\n\nExample: ${usedPrefix + command} add a rainbow across the sky`, m)
  }

  try {
    await conn.reply(m.chat, '🎨 Editing your image, this may take up to a minute...', m)

    const buffer = await quoted.download()
    const result = await nanoBananaEditor(buffer, text)

    if (!result.image) return conn.reply(m.chat, '❌ Failed to retrieve the edited image.', m)

    await conn.sendMessage(
      m.chat,
      {
        image: { url: result.image },
        caption: `✅ Done! Edit applied: *${text}*`
      },
      { quoted: m }
    )
  } catch (e) {
    console.log(e)
    await conn.reply(m.chat, `❌ Failed to edit the image.\n${e.message || ''}`, m)
  }
}

handler.help = handler.command = ['nanobanana']
handler.tags = ['ai']
handler.limit = false 
export default handler
