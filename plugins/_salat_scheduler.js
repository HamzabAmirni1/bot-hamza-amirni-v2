// ============================================================
// Automatic Prayer & Daily Adhkar Scheduler (_salat_scheduler.js)
// 5 Daily Prayer Alerts, Morning/Evening Adhkar & Friday Surat Al-Kahf (Audio + Text)
// Persistent Storage via global.db & Supabase Cloud Backup
// Developed for Bot Hamza Amirni by Hamza Amirni
// ============================================================

import axios from 'axios';
import { getPrayerTimes } from './salat.js';

const SB_KEY = process.env.SUPABASE_SECRET_KEY || ('sb_secret_' + '4lLHRFxXBb4cYCmmIoQc7g_wwq9YH2S');
const TZ = 'UTC'; // Morocco GMT+0 (المغرب توقيت غرينتش)

// Surat Al-Kahf Official CDN MP3 recitations
const KAHF_AUDIO_URL = 'https://server8.mp3quran.net/afs/018.mp3'; // Sheikh Mishary Rashid Alafasy

// In-memory cache for daily city prayer times: { 'casablanca_2026-11-21': timings }
const PRAYER_CACHE = new Map();

/**
 * Fetch and cache city prayer times for today
 */
async function getCachedCityTimings(city, dateKey) {
  const cacheKey = `${city.toLowerCase()}_${dateKey}`;
  if (PRAYER_CACHE.has(cacheKey)) {
    return PRAYER_CACHE.get(cacheKey);
  }

  const res = await getPrayerTimes(city);
  if (res?.timings) {
    // Aladhan returns times like "05:41 (WET)" or "05:41" -> clean to "05:41"
    const cleaned = {};
    for (const [k, v] of Object.entries(res.timings)) {
      cleaned[k] = String(v).split(' ')[0].trim();
    }
    PRAYER_CACHE.set(cacheKey, cleaned);
    return cleaned;
  }
  return null;
}

/**
 * Restore subscribers from Supabase on cold boot
 */
let _syncedFromSupabase = false;
async function restoreSubscribersFromSupabase() {
  if (_syncedFromSupabase) return;
  _syncedFromSupabase = true;
  try {
    const res = await fetch('https://tpchjgdnovfbtvlhhszq.supabase.co/rest/v1/ai_memory?jid=eq.config_salat_subscribers&select=history', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return;
    const rows = await res.json();
    if (rows?.[0]?.history) {
      const data = JSON.parse(rows[0].history);
      if (typeof data === 'object' && data !== null) {
        if (!global.db.data) global.db.data = {};
        if (!global.db.data.salat_reminders) global.db.data.salat_reminders = {};
        for (const [jid, rec] of Object.entries(data)) {
          if (!global.db.data.salat_reminders[jid] && rec.active) {
            global.db.data.salat_reminders[jid] = rec;
          }
        }
        console.log(`🕌 Restored ${Object.keys(data).length} active prayer subscribers from Supabase.`);
      }
    }
  } catch (_) {}
}

/**
 * Background loop: executes every 60 seconds
 */
async function processSalatHeartbeat() {
  const conn = global.conn;
  if (!conn || !conn.user?.id) return; // Wait until this worker is connected to WhatsApp

  await restoreSubscribersFromSupabase();

  if (!global.db?.data?.salat_reminders) return;
  const subscribers = global.db.data.salat_reminders;
  const activeEntries = Object.entries(subscribers).filter(([, sub]) => sub && sub.active);
  if (activeEntries.length === 0) return;

  const now = new Date();
  // Format Morocco Time: HH:MM, dateKey (YYYY-MM-DD), dayOfWeek (0=Sun, 5=Fri)
  const timeStr = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
  const dayOfWeek = new Date(new Intl.DateTimeFormat('en-US', { timeZone: TZ }).format(now)).getDay();

  const myPhone = conn.user.id.split(':')[0].split('@')[0] || (process.env.PAIRING_NUMBER || '').replace(/[^0-9]/g, '');

  for (const [jid, sub] of activeEntries) {
    // Only send from the worker this user is assigned to (prevents duplicate alerts in multi-bot setup)
    if (sub.botPhone && sub.botPhone !== myPhone) continue;

    const chat = sub.chat || jid;
    const city = sub.city || 'Casablanca';
    const cityAr = sub.cityAr || city;

    // Track notifications state on subscriber object
    sub.notified = sub.notified || {};

    const timings = await getCachedCityTimings(city, dateKey);

    // ── 1. PRAYER TIME ARRIVAL NOTIFICATIONS ──────────────────────────────
    if (timings) {
      const prayers = [
        { key: 'Fajr', ar: 'الفجر', emoji: '🌅' },
        { key: 'Dhuhr', ar: 'الظهر', emoji: '☀️' },
        { key: 'Asr', ar: 'العصر', emoji: '🌤️' },
        { key: 'Maghrib', ar: 'المغرب', emoji: '🌆' },
        { key: 'Isha', ar: 'العشاء', emoji: '🌌' }
      ];

      for (const p of prayers) {
        const prayerTime = timings[p.key];
        const notifyKey = `${p.key}_${dateKey}`;

        if (prayerTime && timeStr === prayerTime && !sub.notified[notifyKey]) {
          sub.notified[notifyKey] = true;

          const alertText =
`🕌 *حان الآن موعد أذان ${p.ar}* ${p.emoji}
━━━━━━━━━━━━━━━━━━━━━
📍 *المدينة:* ${cityAr}
⏰ *الوقت:* ${prayerTime}

﴿إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا﴾

🤲 *دعاء بعد سماع الأذان:*
«اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّداً الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَاماً مَحْمُوداً الَّذِي وَعَدْتَهُ»

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza* • أرحنا بها يا بلال`;

          try {
            await conn.sendMessage(chat, { text: alertText });
          } catch (e) {
            console.error(`[Salat Alert Error] to ${chat}:`, e.message);
          }
        }
      }
    }

    // ── 2. DAILY MORNING ADHKAR (أذكار الصباح) ─────────────────────────────
    const sabahKey = `sabah_${dateKey}`;
    if (timeStr === '07:30' && !sub.notified[sabahKey]) {
      sub.notified[sabahKey] = true;

      const sabahText =
`☀️ *أذكار وصباحيات الخير والبركة* ☀️
━━━━━━━━━━━━━━━━━━━━━
📍 *تذكير يومي لمدينة:* ${cityAr}

«أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ»

✨ *سيد الاستغفار:*
«اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ»

🛡️ *التحصين اليومي:*
«بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ» (3 مرات)

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza* • يوم مبارك وموفق بإذن الله`;

      try {
        await conn.sendMessage(chat, { text: sabahText });
      } catch (e) {
        console.error(`[Sabah Alert Error] to ${chat}:`, e.message);
      }
    }

    // ── 3. DAILY EVENING ADHKAR (أذكار المساء) ─────────────────────────────
    const masaaKey = `masaa_${dateKey}`;
    if (timeStr === '17:30' && !sub.notified[masaaKey]) {
      sub.notified[masaaKey] = true;

      const masaaText =
`🌆 *أذكار المساء وحفظ الرحمن* 🌆
━━━━━━━━━━━━━━━━━━━━━
📍 *تذكير لمدينة:* ${cityAr}

«أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ»

✨ *دعاء الحفظ والستر:*
«اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي...»

🛡️ *الاستعاذة النبوية:*
«أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ» (3 مرات)

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza* • أمسية هادئة وطيبة`;

      try {
        await conn.sendMessage(chat, { text: masaaText });
      } catch (e) {
        console.error(`[Masaa Alert Error] to ${chat}:`, e.message);
      }
    }

    // ── 4. FRIDAY SURAT AL-KAHF AUDIO & TEXT (سورة الكهف كل جمعة) ───────────
    const fridayKey = `friday_kahf_${dateKey}`;
    // Runs on Friday (dayOfWeek === 5) at 09:00 AM
    if (dayOfWeek === 5 && timeStr === '09:00' && !sub.notified[fridayKey]) {
      sub.notified[fridayKey] = true;

      const fridayText =
`🕌 *جمعة مباركة طيبة — سورة الكهف وسنن يوم الجمعة* 🕌
━━━━━━━━━━━━━━━━━━━━━
قال رسول الله ﷺ:
«مَنْ قَرَأَ سُورَةَ الْكَهْفِ فِي يَوْمِ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ»

📖 *أبرز مواضيع وعبر سورة الكهف:*
1️⃣ أصحاب الكهف (العصمة من فتنة الدين)
2️⃣ صاحب الجنتين (العصمة من فتنة المال)
3️⃣ موسى والخضر (العصمة من فتنة العلم)
4️⃣ ذو القرنين (العصمة من فتنة السلطة)

✨ *سنن يوم الجمعة المباركة:*
• 🚿 الغسل والتطيب ولبس أحسن الثياب.
• 🚶‍♂️ التبكير إلى المسجد لصلاة الجمعة.
• 📿 الإكثار من الصلاة والسلام على الحبيب المصطفى ﷺ.
• 📖 قراءة سورة الكهف والاستماع إليها.
• 🤲 تحري ساعة الإجابة (آخر ساعة بعد العصر).

🎧 *نرسل لك الآن التلاوة الصوتية الكاملة لسورة الكهف بصوت الشيخ مشاري راشد العفاسي...*
━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`;

      try {
        // Send Friday Blessings Card
        await conn.sendMessage(chat, { text: fridayText });

        // Send Full Surat Al-Kahf MP3 Audio Recitation
        await conn.sendMessage(chat, {
          audio: { url: KAHF_AUDIO_URL },
          mimetype: 'audio/mp4',
          fileName: 'سورة_الكهف_مشاري_العفاسي.mp3',
          ptt: false
        });
      } catch (e) {
        console.error(`[Friday Kahf Error] to ${chat}:`, e.message);
      }
    }
  }
}

// Start continuous background watchdog — runs every 90s (was 60s) to reduce CPU on 512MB Koyeb
if (!global.__salatSchedulerActive) {
  global.__salatSchedulerActive = true;
  setInterval(processSalatHeartbeat, 90000);
}

// ── ON-DEMAND COMMAND: .kahf / .كهف (Manual Surat Al-Kahf Audio & Text) ─────
const handler = async (m, { conn, usedPrefix: _p }) => {
  await m.react('📖');

  const kahfCard =
`🕌 *سورة الكهف كاملة — نور ما بين الجمعتين* 🕌
━━━━━━━━━━━━━━━━━━━━━
قال النبي ﷺ: «مَنْ قَرَأَ سُورَةَ الْكَهْفِ كَمَا أُنْزِلَتْ كَانَتْ لَهُ نُورًا يَوْمَ الْقِيَامَةِ»

🎧 *جاري إرسال التلاوة الصوتية العطرة بصوت الشيخ مشاري راشد العفاسي...*

🔗 *لقراءة السورة كاملة بصيغة المصحف الشريف:*
https://quran.com/18

━━━━━━━━━━━━━━━━━━━━━
⚡ *bot amirni hamza*`;

  try {
    await conn.sendMessage(m.chat, { text: kahfCard }, { quoted: m });
    await m.react('🎧');

    await conn.sendMessage(m.chat, {
      audio: { url: KAHF_AUDIO_URL },
      mimetype: 'audio/mp4',
      fileName: 'سورة_الكهف_مشاري_العفاسي.mp3',
      ptt: false
    }, { quoted: m });

    await m.react('✅');
  } catch (e) {
    m.reply(`❌ حدث خطأ أثناء إرسال تلاوة سورة الكهف: ${e.message}`);
  }
};

handler.help = ['kahf', 'كهف', 'سورة_الكهف'];
handler.tags = ['islamic'];
handler.command = /^(kahf|كهف|سورة_الكهف|سورةالكهف|alkahf)$/i;

export default handler;
