// ============================================================
// checkFileSize.js — Shared helper for all downloader plugins
// Checks the remote file size via HEAD request before sending.
// MAX_MB default: 300 MB  (configurable per-call)
// ============================================================

const DEFAULT_MAX_BYTES = 300 * 1024 * 1024; // 300 MB

/**
 * Returns the remote file size in bytes (or null if unknown / unreachable).
 * Uses a HEAD request, falls back to a range-0 GET if HEAD is blocked.
 */
export async function getRemoteFileSize(url, timeoutMs = 8000) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(tid);
    const cl = res.headers.get('content-length');
    if (cl) return parseInt(cl, 10);
  } catch (_) {}

  // Fallback: range GET
  try {
    const controller2 = new AbortController();
    const tid2 = setTimeout(() => controller2.abort(), timeoutMs);
    const res2 = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal: controller2.signal,
    });
    clearTimeout(tid2);
    const cr = res2.headers.get('content-range'); // e.g. "bytes 0-0/123456789"
    if (cr) {
      const total = cr.split('/')[1];
      if (total && !isNaN(total)) return parseInt(total, 10);
    }
    const cl2 = res2.headers.get('content-length');
    if (cl2) return parseInt(cl2, 10);
  } catch (_) {}

  return null; // size unknown
}

/**
 * Returns { ok: true } if file is within limit,
 * or { ok: false, sizeBytes, sizeMB, maxMB } if too large / server overload risk.
 */
export async function checkFileSize(url, maxBytes = DEFAULT_MAX_BYTES) {
  const size = await getRemoteFileSize(url);
  if (size === null) return { ok: true, sizeBytes: null }; // unknown → allow (will stream)
  const maxMB = Math.round(maxBytes / 1024 / 1024);
  const sizeMB = (size / 1024 / 1024).toFixed(1);
  if (size > maxBytes) {
    return { ok: false, sizeBytes: size, sizeMB, maxMB };
  }
  return { ok: true, sizeBytes: size, sizeMB };
}

/**
 * Convenience: replies with a friendly "file too large" error message in
 * the user's language, then returns false so caller can bail out.
 */
export async function assertFileSizeOk(url, m, lang = 'darija', maxBytes = DEFAULT_MAX_BYTES) {
  const check = await checkFileSize(url, maxBytes);
  if (!check.ok) {
    await m.react?.('⚠️').catch(() => {});
    const t = (en, ar, da) => lang === 'english' ? en : lang === 'arabic' ? ar : (da || ar);
    const msg = t(
      `⚠️ *FILE TOO LARGE! (Limit: ${check.maxMB} MB)*\n━━━━━━━━━━━━━━━━━━━━━\n📊 *File Size:* ${check.sizeMB} MB\n🛑 *Limit:* ${check.maxMB} MB\n\n❌ The server cannot download or send files larger than 300MB to avoid freezing.\n💡 *Tip:* Try downloading a shorter video or selecting a lower resolution/quality!\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,

      `⚠️ *الملف كبير جداً! (الحد: ${check.maxMB} ميغابايت)*\n━━━━━━━━━━━━━━━━━━━━━\n📊 *حجم الملف:* ${check.sizeMB} MB\n🛑 *الحد الأقصى:* ${check.maxMB} MB\n\n❌ لا يمكن للسيرفر تحميل أو إرسال ملفات تتجاوز 300MB حمايةً للسيرفر من التوقف.\n💡 *نصيحة:* جرب فيديو أقصر أو اختر جودة أقل!\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`,

      `⚠️ *هاد الملف كبير بزاف! (الحد: ${check.maxMB} ميغا)*\n━━━━━━━━━━━━━━━━━━━━━\n📊 *حجم الملف:* ${check.sizeMB} MB\n🛑 *الحد الأقصى:* ${check.maxMB} MB\n\n❌ السيرفر ما يقدرش يهبط ولا يصيفط ملفات كبر من 300 ميغا باش ما يتبلوكاش البوت.\n💡 *نصيحة:* جرب فيديو أقصر ولا اختار جودة قل!\n━━━━━━━━━━━━━━━━━━━━━\n⚡ *bot amirni hamza*`
    );
    await m.reply(msg);
    return false;
  }
  return true;
}
