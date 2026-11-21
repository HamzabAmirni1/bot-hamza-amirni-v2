// ============================================================
// 🥩 PROTEIN / NUTRITION DAILY TRACKER — Bot Hamza Amirni
// ============================================================
// Commands:
//   .protein           → show today's progress
//   .protein setup     → set weight & goal
//   .protein <num>     → log Xg protein
//   .protein +<num>    → add Xg to today
//   .protein reset     → clear today's log
//   .protein history   → last 7 days chart
//   .protein food      → show food catalog buttons
//   .protein goal <g>  → set custom daily goal
// ============================================================

import pkg from '../lib/database.js'
const { db } = pkg

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const sender = m.sender
  const chat   = m.chat
  const lang   = global.db?.data?.users?.[sender]?.language || 'darija'

  const t = (en, ar, da) =>
    lang === 'english' ? en : lang === 'arabic' ? ar : da

  // ── helpers ────────────────────────────────────────────────
  const getTodayKey = () => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const progressBar = (val, max, len = 12) => {
    const pct  = Math.min(val / max, 1)
    const fill = Math.round(pct * len)
    const bar  = '▓'.repeat(fill) + '░'.repeat(len - fill)
    const pctStr = Math.round(pct * 100)
    let emoji = '🔴'
    if (pct >= 1)   emoji = '✅'
    else if (pct >= 0.7) emoji = '🟢'
    else if (pct >= 0.3) emoji = '🟡'
    return `${emoji} [${bar}] ${pctStr}%`
  }

  // ── data init ──────────────────────────────────────────────
  if (!global.db.data.protein_logs)   global.db.data.protein_logs   = {}
  if (!global.db.data.protein_goals)  global.db.data.protein_goals  = {}

  const userGoals = global.db.data.protein_goals
  const userLogs  = global.db.data.protein_logs

  if (!userGoals[sender]) userGoals[sender] = { weight: 0, goal: 0 }
  if (!userLogs[sender])  userLogs[sender]  = {}

  const today   = getTodayKey()
  const todayG  = userLogs[sender][today] || 0
  const goal    = userGoals[sender].goal  || 0
  const weight  = userGoals[sender].weight || 0

  const sub = (args[0] || '').toLowerCase().trim()

  // ── FOOD CATALOG ──────────────────────────────────────────
  const FOODS = [
    { name: '🍗 Chicken Breast',   protein: 31,  unit: '/100g' },
    { name: '🐟 Tuna',             protein: 28,  unit: '/100g' },
    { name: '🥚 Egg (1 egg)',       protein: 6,   unit: '/egg'  },
    { name: '🫙 Greek Yogurt',      protein: 10,  unit: '/100g' },
    { name: '🥩 Beef',             protein: 26,  unit: '/100g' },
    { name: '🫘 Lentils',          protein: 9,   unit: '/100g' },
    { name: '🥛 Protein Shake',    protein: 25,  unit: '/scoop'},
    { name: '🧀 Cheese',           protein: 25,  unit: '/100g' },
    { name: '🥛 Milk',             protein: 3,   unit: '/100ml'},
    { name: '🌰 Almonds',          protein: 21,  unit: '/100g' },
    { name: '🫘 Chickpeas',        protein: 8,   unit: '/100g' },
    { name: '🐠 Salmon',           protein: 25,  unit: '/100g' },
  ]

  // ── SETUP ─────────────────────────────────────────────────
  if (sub === 'setup' || sub === 'إعداد') {
    const weightArg = parseFloat(args[1])
    if (!weightArg || isNaN(weightArg) || weightArg < 30 || weightArg < 1) {
      return conn.sendButton(chat, {
        text: t(
          `⚙️ *Protein Tracker Setup*\n\nUsage: \`.protein setup <weight_kg>\`\n\nExample: \`.protein setup 75\`\n\nI'll auto-calculate your daily protein goal (1.8g × kg).`,
          `⚙️ *إعداد تتبع البروتين*\n\nالاستخدام: \`.protein setup <الوزن>\`\n\nمثال: \`.protein setup 75\``,
          `⚙️ *إعداد تتبع البروتين*\n\nكتب وزنك بالكيلو:\n\`.protein setup 75\`\n\nغادي نحسبو ليك l'objectif dial bروتين كل نهار.`
        ),
        footer: 'Bot Hamza Amirni • @hamza_amirni_01',
        buttons: [
          { type: 'quick_reply', display: '📲 ' + t('Help', 'مساعدة', 'مساعدة'), id: `${usedPrefix}protein help` },
        ]
      }, { quoted: m })
    }

    const wkg = weightArg
    const rec  = Math.round(wkg * 1.8)
    userGoals[sender] = { weight: wkg, goal: rec }
    if (!userLogs[sender]) userLogs[sender] = {}
    await global.db.write()

    return conn.sendButton(chat, {
      text: t(
        `✅ *Setup Complete!*\n\n👤 Weight: ${wkg} kg\n🎯 Daily Protein Goal: *${rec}g*\n\n_(Based on 1.8g per kg body weight)_\n\nNow log your protein with:\n\`.protein 50\` → logs 50g\n\`.protein +30\` → adds 30g\n\`.protein food\` → quick food catalog`,
        `✅ *اكتمل الإعداد!*\n\n👤 الوزن: ${wkg} كجم\n🎯 هدف البروتين اليومي: *${rec}غ*\n\nسجّل البروتين بـ:\n\`.protein 50\``,
        `✅ *تم الإعداد!*\n\n👤 الوزن: ${wkg} كيلو\n🎯 L'objectif ديالك كل نهار: *${rec}g*\n\n_(1.8g × كل كيلو)_\n\nدبا سجل:\n\`.protein 50\` ← تسجيل 50g\n\`.protein food\` ← كتالوغ الأكل`
      ),
      footer: 'Bot Hamza Amirni • @hamza_amirni_01',
      buttons: [
        { type: 'quick_reply', display: '📊 ' + t('View Progress', 'التقدم', 'شوف التقدم'), id: `${usedPrefix}protein` },
        { type: 'quick_reply', display: '🍗 ' + t('Food Catalog', 'كتالوج الطعام', 'الأكل'), id: `${usedPrefix}protein food` },
      ]
    }, { quoted: m })
  }

  // ── SET CUSTOM GOAL ────────────────────────────────────────
  if (sub === 'goal' || sub === 'هدف') {
    const g = parseInt(args[1])
    if (!g || isNaN(g) || g < 10 || g > 500) {
      return m.reply(t(
        `❌ Invalid goal. Use: \`.protein goal 150\` (10–500g)`,
        `❌ هدف غير صالح. استخدم: \`.protein goal 150\``,
        `❌ Chhal bغرامات? مثلا: \`.protein goal 150\``
      ))
    }
    userGoals[sender].goal = g
    await global.db.write()
    return m.reply(t(
      `✅ Daily protein goal set to *${g}g*!`,
      `✅ تم ضبط هدف البروتين اليومي على *${g}غ*!`,
      `✅ L'objectif تبدل لـ *${g}g* كل نهار! 💪`
    ))
  }

  // ── RESET TODAY ────────────────────────────────────────────
  if (sub === 'reset' || sub === 'إعادة') {
    userLogs[sender][today] = 0
    await global.db.write()
    return m.reply(t(
      `🔄 Today's protein log has been reset to 0g.`,
      `🔄 تم إعادة ضبط سجل البروتين اليومي إلى 0غ.`,
      `🔄 تمسح سجل النهار، رجعت لـ 0g. ابدا من جديد! 💪`
    ))
  }

  // ── HISTORY (last 7 days) ──────────────────────────────────
  if (sub === 'history' || sub === 'تاريخ' || sub === 'historique') {
    if (goal === 0) {
      return m.reply(t(
        `⚠️ Please set up first: \`.protein setup <weight_kg>\``,
        `⚠️ يرجى الإعداد أولاً: \`.protein setup <الوزن>\``,
        `⚠️ خصك تعمل setup أولاً: \`.protein setup 75\``
      ))
    }

    const logs = userLogs[sender] || {}
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }))
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const val = logs[key] || 0
      const pct = Math.min(val / goal, 1)
      const fill = Math.round(pct * 8)
      const bar  = '▓'.repeat(fill) + '░'.repeat(8 - fill)
      const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`
      let emoji = val === 0 ? '⬛' : pct >= 1 ? '✅' : pct >= 0.7 ? '🟢' : pct >= 0.3 ? '🟡' : '🔴'
      days.push(`${emoji} ${dayLabel}  [${bar}]  ${val}g`)
    }

    // streak count
    let streak = 0
    for (let i = 0; i < 30; i++) {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }))
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if ((logs[key] || 0) >= goal) streak++
      else break
    }

    const histText = t(
      `📅 *Protein History — Last 7 Days*\n\n${days.join('\n')}\n\n🎯 Daily Goal: ${goal}g\n🔥 Current Streak: ${streak} day(s)`,
      `📅 *تاريخ البروتين — آخر 7 أيام*\n\n${days.join('\n')}\n\n🎯 الهدف اليومي: ${goal}غ\n🔥 السلسلة الحالية: ${streak} يوم`,
      `📅 *Historique البروتين — 7 أيام*\n\n${days.join('\n')}\n\n🎯 L'objectif: ${goal}g/نهار\n🔥 Streak: ${streak} نهار`
    )

    return conn.sendButton(chat, {
      text: histText,
      footer: 'Bot Hamza Amirni • @hamza_amirni_01',
      buttons: [
        { type: 'quick_reply', display: '📊 ' + t('Today', 'اليوم', 'اليوم'), id: `${usedPrefix}protein` },
        { type: 'quick_reply', display: '🍗 ' + t('Food Catalog', 'الأكل', 'الأكل'), id: `${usedPrefix}protein food` },
      ]
    }, { quoted: m })
  }

  // ── FOOD CATALOG (buttons) ─────────────────────────────────
  if (sub === 'food' || sub === 'أكل' || sub === 'aliment') {
    if (goal === 0) {
      return m.reply(t(
        `⚠️ Please set up first: \`.protein setup <weight_kg>\``,
        `⚠️ يرجى الإعداد أولاً: \`.protein setup <الوزن>\``,
        `⚠️ خصك تعمل setup أولاً: \`.protein setup 75\``
      ))
    }

    const rows = FOODS.map(f => ({
      title: `${f.name} — ${f.protein}g${f.unit}`,
      description: t(
        `Tap to log ${f.protein}g protein`,
        `اضغط لتسجيل ${f.protein}غ بروتين`,
        `Click باش تسجل ${f.protein}g`
      ),
      id: `${usedPrefix}protein ${f.protein}`
    }))

    return conn.sendButton(chat, {
      text: t(
        `🍽️ *High-Protein Food Catalog*\n\nSelect a food to quickly log its protein content:\n\n📊 Today so far: ${todayG}g / ${goal}g`,
        `🍽️ *كتالوج الأطعمة الغنية بالبروتين*\n\nاختر طعامًا لتسجيل محتوى البروتين:\n\n📊 اليوم حتى الآن: ${todayG}غ / ${goal}غ`,
        `🍽️ *كتالوغ الأكل الغني بالبروتين*\n\nختار واحد باش تسجل:\n\n📊 اليوم: ${todayG}g / ${goal}g`
      ),
      footer: 'Bot Hamza Amirni • @hamza_amirni_01',
      buttons: [
        {
          type: 'single_select',
          display: t('🍗 Select Food', '🍗 اختر طعامًا', '🍗 ختار أكل'),
          title: t('Foods', 'الأطعمة', 'الأكل'),
          rows
        },
        { type: 'quick_reply', display: '📊 ' + t('My Progress', 'تقدمي', 'التقدم ديالي'), id: `${usedPrefix}protein` },
      ]
    }, { quoted: m })
  }

  // ── LOG PROTEIN (number or +number) ───────────────────────
  const rawArg = args[0] || ''
  const isAdd  = rawArg.startsWith('+')
  const numStr = rawArg.replace('+', '')
  const amount = parseFloat(numStr)

  if (!isNaN(amount) && amount > 0 && amount <= 1000) {
    if (goal === 0) {
      return m.reply(t(
        `⚠️ Please set up first:\n\`.protein setup <weight_kg>\`\n\nExample: \`.protein setup 75\``,
        `⚠️ يرجى الإعداد أولاً:\n\`.protein setup <الوزن>\``,
        `⚠️ خصك تعمل setup أولاً:\n\`.protein setup 75\``
      ))
    }

    const prev    = userLogs[sender][today] || 0
    const newTotal = isAdd ? prev + amount : prev + amount
    userLogs[sender][today] = Math.round(newTotal * 10) / 10
    await global.db.write()

    const bar      = progressBar(newTotal, goal)
    const remaining = Math.max(goal - newTotal, 0)

    // streak
    let streak = 0
    const logs = userLogs[sender]
    for (let i = 0; i < 30; i++) {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }))
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if ((logs[key] || 0) >= goal) streak++
      else break
    }

    const isGoalMet = newTotal >= goal
    const congrats  = isGoalMet
      ? t('\n\n🎉 *Goal reached today! Great job!*', '\n\n🎉 *وصلت للهدف اليوم! عمل رائع!*', '\n\n🎉 *وصلت للهدف! Bravo! 💪*')
      : ''

    const logText = t(
      `✅ *+${amount}g Protein Logged!*\n\n${bar}\n\n📊 Today: ${newTotal}g / ${goal}g\n📉 Remaining: ${remaining}g\n🔥 Streak: ${streak} day(s)${congrats}`,
      `✅ *تم تسجيل +${amount}غ بروتين!*\n\n${bar}\n\n📊 اليوم: ${newTotal}غ / ${goal}غ\n📉 المتبقي: ${remaining}غ\n🔥 السلسلة: ${streak} يوم${congrats}`,
      `✅ *تسجيل +${amount}g!*\n\n${bar}\n\n📊 اليوم: ${newTotal}g / ${goal}g\n📉 Reste: ${remaining}g\n🔥 Streak: ${streak} نهار${congrats}`
    )

    return conn.sendButton(chat, {
      text: logText,
      footer: 'Bot Hamza Amirni • @hamza_amirni_01',
      buttons: [
        { type: 'quick_reply', display: '🍗 ' + t('Add Food', 'إضافة طعام', 'زيد أكل'), id: `${usedPrefix}protein food` },
        { type: 'quick_reply', display: '📅 ' + t('History', 'التاريخ', 'Historique'), id: `${usedPrefix}protein history` },
        { type: 'quick_reply', display: '🔄 ' + t('Reset', 'إعادة', 'Reset'), id: `${usedPrefix}protein reset` },
      ]
    }, { quoted: m })
  }

  // ── DEFAULT: SHOW TODAY'S PROGRESS ────────────────────────
  if (goal === 0) {
    return conn.sendButton(chat, {
      text: t(
        `💪 *Protein Tracker — Bot Hamza Amirni*\n\nTrack your daily protein intake to maintain muscle mass and health!\n\n⚙️ *First, set up your profile:*\n\`.protein setup <weight_kg>\`\n\nExample: \`.protein setup 75\`\n\n📌 *Available Commands:*\n• \`.protein setup 75\` — setup\n• \`.protein 50\` — log 50g\n• \`.protein +30\` — add 30g\n• \`.protein food\` — food catalog\n• \`.protein history\` — 7-day chart\n• \`.protein reset\` — reset today\n• \`.protein goal 150\` — set custom goal`,
        `💪 *تتبع البروتين — Bot Hamza Amirni*\n\nتتبع تناول البروتين اليومي للحفاظ على كتلة العضلات والصحة!\n\n⚙️ *أولاً، أعدّ ملفك الشخصي:*\n\`.protein setup <الوزن>\`\n\nمثال: \`.protein setup 75\``,
        `💪 *Protein Tracker — Bot Hamza Amirni*\n\nتتبع البروتين ديالك كل نهار باش تحافظ على العضلات والصحة! 🏋️\n\n⚙️ *أولاً setup:*\n\`.protein setup 75\` ← (وزنك بالكيلو)\n\n📌 *الأوامر:*\n• \`.protein 50\` — سجل 50g\n• \`.protein +30\` — زيد 30g\n• \`.protein food\` — كتالوغ الأكل\n• \`.protein history\` — 7 أيام\n• \`.protein reset\` — reset اليوم\n• \`.protein goal 150\` — حدد L'objectif`
      ),
      footer: 'Bot Hamza Amirni • @hamza_amirni_01',
      buttons: [
        { type: 'quick_reply', display: '⚙️ Setup', id: `${usedPrefix}protein setup 75` },
        { type: 'quick_reply', display: '🍗 ' + t('Food Catalog', 'الأكل', 'الأكل'), id: `${usedPrefix}protein food` },
      ]
    }, { quoted: m })
  }

  // ── Show today's stats ─────────────────────────────────────
  const bar       = progressBar(todayG, goal)
  const remaining = Math.max(goal - todayG, 0)
  const logs2     = userLogs[sender]
  let streak2     = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }))
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if ((logs2[key] || 0) >= goal) streak2++
    else break
  }

  const progressText = t(
    `💪 *Daily Protein Tracker*\n\n${bar}\n\n📊 Consumed: *${todayG}g* / ${goal}g\n📉 Remaining: *${remaining}g*\n👤 Weight: ${weight}kg\n🎯 Goal: ${goal}g/day\n🔥 Streak: ${streak2} day(s)\n\n_Log protein: \`.protein 50\` or select food below_`,
    `💪 *تتبع البروتين اليومي*\n\n${bar}\n\n📊 المستهلك: *${todayG}غ* / ${goal}غ\n📉 المتبقي: *${remaining}غ*\n👤 الوزن: ${weight}كجم\n🎯 الهدف: ${goal}غ/يوم\n🔥 السلسلة: ${streak2} يوم`,
    `💪 *Protein Tracker — اليوم*\n\n${bar}\n\n📊 Consommé: *${todayG}g* / ${goal}g\n📉 Reste: *${remaining}g*\n👤 Poids: ${weight}kg\n🎯 L'objectif: ${goal}g/نهار\n🔥 Streak: ${streak2} نهار\n\n_سجل: \`.protein 50\` أو ختار من الأكل_`
  )

  return conn.sendButton(chat, {
    text: progressText,
    footer: 'Bot Hamza Amirni • @hamza_amirni_01',
    buttons: [
      { type: 'quick_reply', display: '🍗 ' + t('Food Catalog', 'الأكل', 'الأكل'), id: `${usedPrefix}protein food` },
      { type: 'quick_reply', display: '📅 ' + t('History', 'التاريخ', 'Historique'), id: `${usedPrefix}protein history` },
      { type: 'quick_reply', display: '🔄 ' + t('Reset Today', 'إعادة', 'Reset'), id: `${usedPrefix}protein reset` },
    ]
  }, { quoted: m })
}

handler.command    = /^(protein|protin|بروتين|nutrition|نوتريشن)$/i
handler.tags       = ['tools', 'main']
handler.help       = ['protein', 'protin', 'nutrition']
handler.description = 'Daily protein intake tracker to maintain muscle mass and health 💪'
handler.group      = false
handler.private    = true
handler.register   = false
handler.admin      = false
handler.botAdmin   = false

export default handler
