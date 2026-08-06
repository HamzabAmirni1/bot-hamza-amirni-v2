// ==============================================================================
// BOT AMIRNI HAMZA — DASHBOARD FRONTEND LOGIC (app.js)
// ==============================================================================

const DEF_URL = 'https://tpchjgdnovfbtvlhhszq.supabase.co';
const DEF_KEY = 'sb_publishable_gv0guj6Es3nZYktbwoHTdQ_QOkaU3us';

let cfg = {
  url: localStorage.getItem('sb_url') || DEF_URL,
  key: localStorage.getItem('sb_key') || DEF_KEY,
};

let sb = null;
let allAI = [], allDevMsg = [];
let connectMode = 'code'; // 'code' or 'qr'
let connectQrTimer = null;

// Initialize Supabase
function initSB() {
  try {
    sb = supabase.createClient(cfg.url, cfg.key);
    return true;
  } catch(e) {
    toast('❌ خطأ في قاعدة البيانات: ' + e.message, 'err');
    return false;
  }
}

// ── Sidebar & Layout Toggles ──────────────────────────────────────────────────
function toggleSB() {
  const sbEl = document.getElementById('sidebar');
  const overlay = document.getElementById('sb-overlay');
  sbEl.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSB() {
  const sbEl = document.getElementById('sidebar');
  const overlay = document.getElementById('sb-overlay');
  if (sbEl) sbEl.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

function showConfirm({ title = 'تأكيد الإجراء', text = 'هل أنت متأكد؟', confirmText = 'تأكيد', icon = '⚠️', isDanger = false } = {}) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('confirm-title');
    const textEl = document.getElementById('confirm-text');
    const iconEl = document.getElementById('confirm-icon');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    if (!modal) { resolve(window.confirm(text)); return; }

    iconEl.textContent = icon;
    titleEl.textContent = title;
    textEl.textContent = text;
    okBtn.textContent = confirmText;

    if (isDanger) {
      okBtn.className = 'btn btn-danger lg';
    } else {
      okBtn.className = 'btn btn-b lg';
    }

    modal.classList.add('show');

    function onOk() {
      cleanup();
      resolve(true);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function cleanup() {
      modal.classList.remove('show');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
    }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

async function doLogout() {
  const ok = await showConfirm({
    title: 'تسجيل الخروج',
    text: 'هل أنت متأكد من تسجيل الخروج من اللوحة؟',
    confirmText: 'تسجيل الخروج',
    icon: '🚪',
    isDanger: true
  });
  if (!ok) return;
  sessionStorage.removeItem('bot_auth');
  sessionStorage.removeItem('bot_user');
  window.location.href = '/login.html';
}

function goPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nv').forEach(n => n.classList.remove('active'));
  
  const pageEl = document.getElementById('page-' + id);
  if (pageEl) pageEl.classList.add('active');
  
  const targetNav = el || Array.from(document.querySelectorAll('.nv')).find(n => n.getAttribute('onclick')?.includes(`'${id}'`));
  if (targetNav) targetNav.classList.add('active');
  
  closeSB();
  localStorage.setItem('active_page', id);

  // Trigger page specific loaders
  if (id === 'aichat')      loadAI();
  if (id === 'devmsg')      { loadDevMsg(); loadBroadcastHistory(); loadBcUserCount(); }
  if (id === 'sessions')    { loadBotStatus(); loadAuth(); }
  if (id === 'adminmode')   { loadBotMode(); }
  if (id === 'errors')      loadErrors();
  if (id === 'commands')    renderCmds();
  if (id === 'settings')    loadCfgForm();
  if (id === 'botusers')    loadBotUsers(1);
  if (id === 'botdetails')  loadBotDetailsPage();
  if (id === 'access-req')  loadAccessRequests();
  if (id === 'dashboard' || id === 'mainbot') loadStats();
}

// ── Toast Notifications ────────────────────────────────────────────────────────
function toast(msg, type='inf') {
  const container = document.getElementById('toasts');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  el.innerHTML = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

// ── Modals ─────────────────────────────────────────────────────────────────────
function closeM(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show'); 
}

// ── Dashboard Statistics Loader ───────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    if (!data || Object.keys(data).length === 0) return;

    animN('s-msgs',   data.messages_handled || 0);
    animN('s-users',  data.total_users || 0);
    animN('s-visits', data.visits || 0);
    animN('s-bots',   data.active_bots || 0);

    const ramEl = document.getElementById('sys-ram');
    if (ramEl) ramEl.textContent = data.ram_usage || '—';
    
    const updateEl = document.getElementById('sys-update');
    if (updateEl) updateEl.textContent = data.last_update ? new Date(data.last_update).toLocaleTimeString('ar') : '—';

    // Update Topbar Status Header
    const statusTxt = document.getElementById('topbar-status-txt');
    const statusBox = document.getElementById('topbar-status-box');
    const phoneVal = document.getElementById('topbar-phone-val');
    const phoneBox = document.getElementById('topbar-phone-box');

    if (data.phone) {
      if (phoneVal) phoneVal.textContent = '+' + data.phone;
      if (phoneBox) phoneBox.style.display = 'block';
    }

    if (data.bot_connected) {
      if (statusTxt) statusTxt.textContent = 'متصل ونشط';
      if (statusBox) statusBox.className = 'topbar-status on';
    } else {
      if (statusTxt) statusTxt.textContent = 'غير متصل';
      if (statusBox) statusBox.className = 'topbar-status off';
    }

    // Top Commands
    const tc = document.getElementById('top-cmds');
    if (tc) {
      const cmds = Array.isArray(data.top_commands) ? data.top_commands : [];
      if (!cmds.length) { tc.innerHTML = empty('fas fa-chart-bar', 'لا توجد بيانات استخدام بعد'); }
      else {
        tc.innerHTML = cmds.slice(0, 5).map((c, i) => {
          const name = typeof c === 'object' ? (c.cmd || c.command || c.name || '') : c;
          const count = typeof c === 'object' ? (c.count || c.times || 0) : 0;
          const pct = i === 0 ? 100 : Math.round((count / (cmds[0]?.count || 1)) * 100);
          return `
            <div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:13px;font-weight:700">.${name}</span>
                <span style="font-size:11px;color:var(--text2)">${count} استخدام</span>
              </div>
              <div class="ptrack"><div class="pfill" style="width:${pct}%"></div></div>
            </div>`;
        }).join('');
      }
    }
  } catch(e) {
    console.error('Stats load error:', e);
  }
}

// ── Connect & Add Phone Widget ─────────────────────────────────────────────────
function switchConnectMode(mode) {
  connectMode = mode;
  const codeBtn = document.getElementById('pmode-code-btn');
  const qrBtn = document.getElementById('pmode-qr-btn');
  const btnTxt = document.getElementById('connect-btn-txt');
  const btnIcon = document.getElementById('connect-btn-icon');

  if (mode === 'code') {
    codeBtn.className = 'pair-mode-btn active-g';
    qrBtn.className = 'pair-mode-btn';
    btnTxt.textContent = 'طلب كود الربط';
    btnIcon.className = 'fas fa-key';
  } else {
    qrBtn.className = 'pair-mode-btn active-b';
    codeBtn.className = 'pair-mode-btn';
    btnTxt.textContent = 'طلب QR Code';
    btnIcon.className = 'fas fa-qrcode';
  }

  document.getElementById('connect-results-wrap').style.display = 'none';
  document.getElementById('connect-code-result').style.display = 'none';
  document.getElementById('connect-qr-result').style.display = 'none';
}

async function executeConnect() {
  const input = document.getElementById('connect-phone-input');
  const phone = input ? input.value.trim().replace(/\D/g,'') : '';

  if (!phone || phone.length < 10) {
    toast('⚠️ أدخل رقم هاتف صحيح مع كود الدولة (مثال: 212612030829)', 'err');
    return;
  }

  const btn = document.getElementById('connect-submit-btn');
  btn.disabled = true;

  const resultsWrap = document.getElementById('connect-results-wrap');
  const statusBar = document.getElementById('connect-status-bar');
  const statusTxt = document.getElementById('connect-status-txt');

  resultsWrap.style.display = 'block';
  statusBar.className = 'sbar loading';
  statusTxt.textContent = 'جاري إرسال الطلب للسيرفر...';

  document.getElementById('connect-code-result').style.display = 'none';
  document.getElementById('connect-qr-result').style.display = 'none';

  try {
    const res = await fetch('/api/requestpair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone })
    });
    const data = await res.json();

    if (data.success) {
      if (connectMode === 'code') {
        statusTxt.textContent = 'جاري توليد كود الإقران... (انتظر 8 ثوانٍ)';
        await pollPairingCode(phone);
      } else {
        statusTxt.textContent = 'جاري جلب رمز QR...';
        await loadConnectQR(phone);
      }
    } else {
      statusBar.className = 'sbar error';
      statusTxt.textContent = '❌ فشل الطلب: ' + (data.error || 'خطأ غير معروف');
    }
  } catch(e) {
    statusBar.className = 'sbar error';
    statusTxt.textContent = '❌ خطأ في الاتصال: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

async function pollPairingCode(phone, attempts = 0) {
  if (attempts > 10) {
    const statusBar = document.getElementById('connect-status-bar');
    statusBar.className = 'sbar error';
    document.getElementById('connect-status-txt').textContent = '❌ انتهت مهلة الانتظار. حاول مرة أخرى!';
    return;
  }

  await new Promise(r => setTimeout(r, 2500));

  try {
    const res = await fetch(`/api/pairingcode?phone=${phone}`);
    const data = await res.json();

    if (data.status === 'connected') {
      const statusBar = document.getElementById('connect-status-bar');
      statusBar.className = 'sbar success';
      document.getElementById('connect-status-txt').textContent = '✅ البوت متصل بالفعل بهذا الرقم!';
      return;
    }

    if (data.pairing_code) {
      const statusBar = document.getElementById('connect-status-bar');
      statusBar.className = 'sbar success';
      document.getElementById('connect-status-txt').textContent = '✅ تم توليد كود الإقران بنجاح!';

      const formatted = data.pairing_code.replace(/(.{4})(.{4})/, '$1 - $2');
      document.getElementById('connect-code-val').textContent = formatted;
      document.getElementById('connect-code-result').style.display = 'block';
      return;
    }

    document.getElementById('connect-status-txt').textContent = `جاري التوليد... (${attempts + 1}/10)`;
    await pollPairingCode(phone, attempts + 1);
  } catch(e) {
    console.error(e);
  }
}

async function loadConnectQR(phone) {
  try {
    const res = await fetch(`/api/pairingcode?phone=${phone}`);
    const data = await res.json();

    if (data.status === 'connected') {
      const statusBar = document.getElementById('connect-status-bar');
      statusBar.className = 'sbar success';
      document.getElementById('connect-status-txt').textContent = '✅ الرقم متصل بالفعل!';
      return;
    }

    const qrUrl = data.qr_code || (data.pairing_code ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data.pairing_code)}` : null);

    if (qrUrl) {
      const statusBar = document.getElementById('connect-status-bar');
      statusBar.className = 'sbar success';
      document.getElementById('connect-status-txt').textContent = '✅ تم جلب QR Code بنجاح!';

      document.getElementById('connect-qr-img').src = qrUrl;
      document.getElementById('connect-qr-result').style.display = 'block';
    } else {
      setTimeout(() => loadConnectQR(phone), 3000);
    }
  } catch(e) {
    console.error(e);
  }
}

function copyConnectCode() {
  const code = document.getElementById('connect-code-val').textContent;
  if (!code || code === '--------') return;
  navigator.clipboard.writeText(code.replace(/\s|-/g, ''));
  toast('✅ تم نسخ كود الإقران!', 'ok');
}

// ── Bot Control (Pause / Resume / Sessions) ──────────────────────────────────
async function loadBotStatus() {
  const wrap = document.getElementById('bot-control-wrap');
  if (!wrap) return;
  wrap.innerHTML = spin();
  try {
    const res = await fetch('/api/bot-status');
    const d = await res.json();

    // New multi-bot format: { bots: [{phone, connected}] }
    const bots = d.bots || [];

    if (bots.length === 0) {
      wrap.innerHTML = `
        <div class="bot-row">
          <div class="row">
            <div class="bot-ava">
              🤖
              <div class="dot dot-off"></div>
            </div>
            <div>
              <div style="font-weight:800;font-size:15px">bot amirni hamza</div>
              <div class="mono text-accent" style="font-size:13px">—</div>
              <div style="margin-top:4px"><span class="badge b-r">🔴 غير متصل</span></div>
            </div>
          </div>
        </div>`;
      return;
    }

    const cards = bots.map(bot => {
      const phone = bot.phone || '—';
      const connected = !!bot.connected;
      const dotClass = connected ? 'dot-on' : 'dot-off';
      const stateBadge = connected
        ? `<span class="badge b-g">🟢 متصل ونشط</span>`
        : `<span class="badge b-r">🔴 غير متصل</span>`;

      return `
        <div class="bot-row" style="margin-bottom:12px">
          <div class="row">
            <div class="bot-ava">
              🤖
              <div class="dot ${dotClass}"></div>
            </div>
            <div style="flex:1">
              <div style="font-weight:800;font-size:15px">bot amirni hamza</div>
              <div class="mono text-accent" style="font-size:13px">+${phone}</div>
              <div style="margin-top:4px">${stateBadge}</div>
            </div>
            <button onclick="deleteSessionRow('${phone}')" class="btn btn-danger" style="font-size:12px;padding:6px 12px">
              <i class="fas fa-trash"></i> مسح
            </button>
          </div>
        </div>`;
    }).join('');

    wrap.innerHTML = cards;
  } catch(e) {
    wrap.innerHTML = empty('fas fa-exclamation-triangle', 'فشل التحميل: ' + e.message);
  }
}


async function botPause() {
  const ok = await showConfirm({
    title: 'إيقاف البوت مؤقتاً',
    text: 'هل تريد إيقاف البوت مؤقتاً؟ لن يستقبل أي رسائل حتى تقوم بتشغيله مجدداً.',
    confirmText: 'إيقاف البوت',
    icon: '⏸️',
    isDanger: false
  });
  if (!ok) return;
  try {
    const r = await fetch('/api/bot-pause', { method: 'POST' });
    const d = await r.json();
    if (d.success) { toast('⏸️ تم إيقاف البوت', 'ok'); loadBotStatus(); }
    else toast('❌ خطأ: ' + d.error, 'err');
  } catch(e) { toast('❌ خطأ: ' + e.message, 'err'); }
}

async function botResume() {
  try {
    const r = await fetch('/api/bot-resume', { method: 'POST' });
    const d = await r.json();
    if (d.success) { toast('▶️ تم تشغيل البوت بنجاح!', 'ok'); setTimeout(loadBotStatus, 2500); }
    else toast('❌ خطأ: ' + d.error, 'err');
  } catch(e) { toast('❌ خطأ: ' + e.message, 'err'); }
}

async function botDelete() {
  const ok = await showConfirm({
    title: 'مسح الجلسة وإعادة التشغيل',
    text: 'سيتم مسح السيشن الحالية وإعادة تشغيل البوت لتجهيزه لإقران جديد. هل أنت متأكد؟',
    confirmText: 'مسح الجلسة',
    icon: '🗑️',
    isDanger: true
  });
  if (!ok) return;
  try {
    const r = await fetch('/api/bot-delete', { method: 'POST' });
    const d = await r.json();
    if (d.success) { toast('🗑️ تم مسح الجلسة وتجهيز البوت للربط', 'ok'); setTimeout(loadBotStatus, 4000); }
    else toast('❌ خطأ: ' + d.error, 'err');
  } catch(e) { toast('❌ خطأ: ' + e.message, 'err'); }
}

async function deleteSessionRow(phone) {
  const ok = await showConfirm({
    title: 'حذف الجلسة القديمة',
    text: `هل أنت متأكد من مسح الجلسة القديمة للرقم +${phone} نهائياً من قاعدة البيانات؟`,
    confirmText: 'مسح الجلسة',
    icon: '🗑️',
    isDanger: true
  });
  if (!ok) return;
  try {
    const res = await fetch('/api/delete-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phone })
    });
    const data = await res.json();
    if (data.success) {
      toast(`✅ تم مسح الجلسة +${phone} من Supabase بنجاح!`, 'ok');
      loadAuth();
    } else {
      toast('❌ فشل مسح الجلسة: ' + (data.error || 'خطأ غير معروف'), 'err');
    }
  } catch(e) {
    toast('❌ خطأ: ' + e.message, 'err');
  }
}

// ── Bot Mode & Admin Management ──────────────────────────────────
async function loadBotMode() {
  try {
    const res = await fetch('/api/bot-mode');
    const d = await res.json();
    const mode = d.mode || 'public';
    const admins = d.admins || [];

    // 1. Update stats & labels
    const statCount = document.getElementById('stat-admin-count');
    const statMode = document.getElementById('stat-current-mode');
    const modeLabel = document.getElementById('current-mode-label');

    if (statCount) statCount.textContent = admins.length;
    if (statMode) statMode.textContent = mode.toUpperCase();
    if (modeLabel) modeLabel.textContent = mode.toUpperCase();

    // 2. Highlight active mode card button
    ['public', 'private', 'group', 'admin'].forEach(m => {
      const btn = document.getElementById(`mcard-${m}`);
      if (btn) {
        if (m === mode) btn.classList.add('active');
        else btn.classList.remove('active');
      }
    });

    // 3. Render Admins Table
    const tableWrap = document.getElementById('bot-admins-table-wrap');
    if (tableWrap) {
      if (admins.length === 0) {
        tableWrap.innerHTML = empty('fas fa-user-slash', 'لا يوجد مشرفون مسجلون حالياً فـ البوت');
      } else {
        const rows = admins.map((jid, i) => {
          const num = jid.split('@')[0];
          return `
            <tr>
              <td>${i + 1}</td>
              <td class="bold"><i class="fas fa-user-shield text-accent"></i> مشرف البوت</td>
              <td class="mono font-bold text-accent">+${num}</td>
              <td><span class="badge b-g">🟢 أدمين نشط</span></td>
              <td>
                <div style="display:flex;gap:6px">
                  <button onclick="removeBotAdmin('${jid}')" class="btn btn-danger sm">
                    <i class="fas fa-trash-alt"></i> حذف المشرف
                  </button>
                  <a href="https://wa.me/${num}" target="_blank" class="btn btn-ghost sm">
                    <i class="fab fa-whatsapp"></i> مراسلة
                  </a>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        tableWrap.innerHTML = `
          <div class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الرتبة</th>
                  <th>رقم الهاتف</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      }
    }
  } catch(e) {
    console.error('Failed to load bot mode/admins:', e);
  }
}

async function addBotAdminPage() {
  const input = document.getElementById('admin-page-phone-input');
  if (!input || !input.value.trim()) return toast('⚠️ أدخل رقم الهاتف أولاً', 'err');
  const phone = input.value.trim();
  try {
    const r = await fetch('/api/bot-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const d = await r.json();
    if (d.success) {
      toast(`✅ تمت إضافة +${phone.replace(/[^0-9]/g, '')} كـ أدمين للبوت`, 'ok');
      input.value = '';
      loadBotMode();
    } else {
      toast('❌ خطأ: ' + d.error, 'err');
    }
  } catch(e) { toast('❌ خطأ: ' + e.message, 'err'); }
}

async function setBotMode(newMode) {
  try {
    const r = await fetch('/api/bot-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode })
    });
    const d = await r.json();
    if (d.success) {
      toast(`✅ تم تغيير وضع البوت إلى: ${newMode.toUpperCase()}`, 'ok');
      loadBotMode();
    } else {
      toast('❌ خطأ: ' + d.error, 'err');
    }
  } catch(e) { toast('❌ خطأ: ' + e.message, 'err'); }
}

async function addBotAdmin() {
  const input = document.getElementById('admin-phone-input');
  if (!input || !input.value.trim()) return toast('⚠️ أدخل رقم الهاتف أولاً', 'err');
  const phone = input.value.trim();
  try {
    const r = await fetch('/api/bot-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const d = await r.json();
    if (d.success) {
      toast(`✅ تمت إضافة +${phone.replace(/[^0-9]/g, '')} كـ أدمين`, 'ok');
      input.value = '';
      loadBotMode();
    } else {
      toast('❌ خطأ: ' + d.error, 'err');
    }
  } catch(e) { toast('❌ خطأ: ' + e.message, 'err'); }
}

async function removeBotAdmin(jid) {
  const num = jid.split('@')[0];
  const ok = await showConfirm({
    title: 'حذف مشرف البوت',
    text: `هل أنت متأكد من حذف +${num} من قائمة مشرفي البوت؟`,
    confirmText: 'حذف',
    icon: '👤',
    isDanger: true
  });
  if (!ok) return;

  try {
    const r = await fetch('/api/bot-admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid })
    });
    const d = await r.json();
    if (d.success) {
      toast(`✅ تم حذف +${num} من المشرفين`, 'ok');
      loadBotMode();
    } else {
      toast('❌ خطأ: ' + d.error, 'err');
    }
  } catch(e) { toast('❌ خطأ: ' + e.message, 'err'); }
}

async function loadAuth() {
  const wrap = document.getElementById('auth-wrap');
  if (!wrap) return;
  wrap.innerHTML = spin();
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) throw new Error(res.statusText);
    const list = await res.json();
    if (!list || !list.length) {
      wrap.innerHTML = empty('fas fa-key', 'لا توجد جلسات مسجلة حالياً');
      return;
    }
    wrap.innerHTML = `
      <div class="ov-x-auto"><table class="tbl">
      <thead><tr><th>الرقم</th><th>رمز الإقران</th><th>الحالة</th><th>آخر تحديث</th><th>إجراءات</th></tr></thead>
      <tbody>
      ${list.map(s => {
        const isConn = s.status === 'connected';
        const isPend = s.status === 'pending' || s.status === 'requesting';
        const badgeClass = isConn ? 'b-g' : (isPend ? 'b-y' : 'b-r');
        const statusText = isConn ? (s.is_active ? '🟢 متصل ونشط' : '✅ متصل') : (isPend ? '⏳ في الانتظار' : '🔴 غير متصل');
        return `<tr>
          <td class="mono" style="font-weight:700">+${s.phone_number||'—'}</td>
          <td><code class="badge b-g">${s.pairing_code||'—'}</code></td>
          <td><span class="badge ${badgeClass}">${statusText}</span></td>
          <td style="font-size:11px;color:var(--text2)">${s.updated_at ? new Date(s.updated_at).toLocaleString('ar') : '—'}</td>
          <td>
            <button class="btn btn-danger sm" onclick="deleteSessionRow('${s.phone_number||''}')" title="مسح الجلسة من قاعدة البيانات">
              <i class="fas fa-trash-alt"></i> مسح
            </button>
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table></div>`;
  } catch(e) {
    wrap.innerHTML = empty('fas fa-exclamation-circle', 'خطأ: ' + e.message);
  }
}

// ── Bot Users Page Logic ───────────────────────────────────────────────────────
let allBotUsersRaw = [];
let currentUsersPage = 1;

async function loadBotUsers(page = 1) {
  currentUsersPage = page;
  const wrap = document.getElementById('bot-users-wrap');
  if (!wrap) return;
  wrap.innerHTML = spin();
  try {
    const res = await fetch(`/api/users-list?page=${page}`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    allBotUsersRaw = data.users || [];
    const countEl = document.getElementById('users-total-count');
    if (countEl) countEl.textContent = data.total || allBotUsersRaw.length;
    renderBotUsers(allBotUsersRaw);
    renderUsersPagination(data.total || 0, page, data.limit || 50);
  } catch(e) {
    wrap.innerHTML = empty('fas fa-users-slash', 'فشل تحميل المستخدمين: ' + e.message);
  }
}

function filterBotUsers() {
  const q = document.getElementById('users-search')?.value?.toLowerCase() || '';
  if (!q) return renderBotUsers(allBotUsersRaw);
  const filtered = allBotUsersRaw.filter(u =>
    (u.phone_number || '').includes(q) ||
    (u.name || '').toLowerCase().includes(q) ||
    (u.jid || '').includes(q)
  );
  renderBotUsers(filtered);
}

function renderBotUsers(list) {
  const wrap = document.getElementById('bot-users-wrap');
  if (!list.length) { wrap.innerHTML = empty('fas fa-users-slash', 'لا يوجد مستخدمون'); return; }
  wrap.innerHTML = `<div class="ov-x-auto">
    <table class="tbl">
      <thead><tr><th>#</th><th>الاسم</th><th>الرقم</th><th>أول ظهور</th><th>آخر نشاط</th><th>إجراءات</th></tr></thead>
      <tbody>
      ${list.map((u, i) => {
        const phone = u.phone_number || u.jid?.replace('@s.whatsapp.net','') || '—';
        const encName = encodeURIComponent(u.name || phone);
        const first = u.first_seen ? new Date(u.first_seen).toLocaleDateString('ar') : '—';
        const last = u.last_seen ? new Date(u.last_seen).toLocaleTimeString('ar', {hour:'2-digit',minute:'2-digit'}) : '—';
        return `<tr>
          <td style="color:var(--text3)">${(currentUsersPage - 1) * 50 + i + 1}</td>
          <td style="font-weight:700">${u.name || phone}</td>
          <td><a href="https://wa.me/${phone}" target="_blank" class="mono text-accent" style="text-decoration:none">+${phone}</a></td>
          <td style="font-size:11px;color:var(--text2)">${first}</td>
          <td style="font-size:11px;color:var(--text2)">${last}</td>
          <td>
            <div class="row">
              <button class="btn btn-g sm" onclick="viewUserChatModal('${phone}', '${encName}')">💬 المحادثة</button>
              <button class="btn btn-b sm" onclick="openDirectMsgModal('${phone}', '${encName}')">✉️ مراسلة</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table></div>`;
}

function renderUsersPagination(total, page, limit) {
  const el = document.getElementById('bot-users-pagination');
  if (!el || total <= limit) { if(el) el.innerHTML = ''; return; }
  const totalPages = Math.ceil(total / limit);
  let html = '';
  for (let p = 1; p <= totalPages; p++) {
    html += `<button onclick="loadBotUsers(${p})" class="btn ${p===page?'btn-g':'btn-ghost'} sm">${p}</button>`;
  }
  el.innerHTML = html;
}

// ── Modals & Individual User Chat History ─────────────────────────────────────
let currentChatPhone = '', currentChatName = '';
let targetDMPhone = '', targetDMName = '';

function openDirectMsgModal(phone, encodedName) {
  targetDMPhone = phone;
  targetDMName = decodeURIComponent(encodedName) || phone;
  document.getElementById('dm-user-name').textContent = targetDMName;
  document.getElementById('dm-text-input').value = '';
  document.getElementById('modal-direct-msg').classList.add('show');
}

async function sendDirectMsgAction() {
  const text = document.getElementById('dm-text-input').value.trim();
  if (!text) return toast('⚠️ اكتب نص الرسالة أولاً', 'err');

  try {
    const res = await fetch('/api/send-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: targetDMPhone, text: text })
    });
    const data = await res.json();
    if (data.success) {
      toast(`✅ تم إرسال الرسالة لـ ${targetDMName}!`, 'ok');
      closeM('modal-direct-msg');
    } else {
      toast('❌ فشل الإرسال: ' + data.error, 'err');
    }
  } catch(e) {
    toast('❌ خطأ: ' + e.message, 'err');
  }
}

async function viewUserChatModal(phone, encodedName) {
  currentChatPhone = phone;
  currentChatName = decodeURIComponent(encodedName) || phone;
  document.getElementById('uchat-user-name').textContent = currentChatName;
  document.getElementById('uchat-user-phone').textContent = '+' + currentChatPhone;
  const bodyEl = document.getElementById('uchat-body');
  bodyEl.innerHTML = spin();
  document.getElementById('modal-user-chat').classList.add('show');

  try {
    const res = await fetch(`/api/user-chat-history?phone=${phone}`);
    if (!res.ok) throw new Error('فشل جلب المحادثة');
    const data = await res.json();
    
    let messages = [];
    if (Array.isArray(data.dev_messages)) {
      data.dev_messages.forEach(m => {
        if (m.text) messages.push({ role: 'user', content: m.text, time: m.timestamp });
        if (m.replied && m.reply_text) messages.push({ role: 'bot', content: m.reply_text, time: m.reply_timestamp });
      });
    }
    if (Array.isArray(data.ai_history)) {
      data.ai_history.forEach(m => {
        const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        messages.push({ role: m.role === 'user' ? 'user' : 'bot', content: text, time: null });
      });
    }

    if (!messages.length) {
      bodyEl.innerHTML = empty('fas fa-comment-slash', 'لا يوجد سجل محادثة لهذا المستخدم');
      return;
    }

    bodyEl.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${messages.map(m => {
          const isUser = m.role === 'user';
          return `
            <div style="display:flex;${isUser ? 'justify-content:flex-end' : 'justify-content:flex-start'}">
              <div style="max-width:85%;padding:9px 13px;border-radius:12px;font-size:12px;line-height:1.5;
                background:${isUser ? 'rgba(34,211,103,0.15)' : 'rgba(56,189,248,0.15)'};
                border:1px solid ${isUser ? 'rgba(34,211,103,0.25)' : 'rgba(56,189,248,0.25)'};">
                <div style="font-size:10px;font-weight:700;color:${isUser ? 'var(--green)' : 'var(--blue)'};margin-bottom:3px">
                  ${isUser ? '👤 ' + currentChatName : '🤖 البوت'}
                </div>
                <div>${(m.content || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
    bodyEl.scrollTop = bodyEl.scrollHeight;
  } catch(e) {
    bodyEl.innerHTML = empty('fas fa-exclamation-triangle', e.message);
  }
}

async function sendUserChatReply() {
  const input = document.getElementById('uchat-reply-input');
  const text = input ? input.value.trim() : '';
  if (!text || !currentChatPhone) return;

  try {
    const res = await fetch('/api/send-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: currentChatPhone, text: text })
    });
    const data = await res.json();
    if (data.success) {
      toast('✅ تم إرسال الرد!', 'ok');
      if (input) input.value = '';
      viewUserChatModal(currentChatPhone, encodeURIComponent(currentChatName));
    } else {
      toast('❌ فشل: ' + data.error, 'err');
    }
  } catch(e) {
    toast('❌ خطأ: ' + e.message, 'err');
  }
}

// ── AI Memory Page ─────────────────────────────────────────────────────────────
async function loadAI() {
  const wrap = document.getElementById('ai-wrap');
  if (!wrap) return;
  wrap.innerHTML = spin();
  try {
    const res = await fetch('/api/aichat');
    if (!res.ok) throw new Error(res.statusText);
    allAI = await res.json() || [];
    renderAI(allAI);
  } catch(e) {
    wrap.innerHTML = empty('fas fa-brain', 'خطأ: ' + e.message);
  }
}

function filterAI(q) {
  renderAI(allAI.filter(u => (u.jid||'').includes(q)));
}

function renderAI(list) {
  const wrap = document.getElementById('ai-wrap');
  if (!list.length) { wrap.innerHTML = empty('fas fa-brain','لا توجد ذاكرة AI مخزنة'); return; }
  wrap.innerHTML = `<div class="ov-x-auto">
    <table class="tbl">
      <thead><tr><th>#</th><th>المعرف (JID)</th><th>المنصة</th><th>التحديث</th><th>عرض</th></tr></thead>
      <tbody>
      ${list.map((u,i) => `<tr>
        <td style="color:var(--text3)">${i+1}</td>
        <td class="mono" style="font-size:11px">${u.jid||'—'}</td>
        <td><span class="badge b-b">${u.jid?.includes('@s.whatsapp')?'WhatsApp':'Telegram'}</span></td>
        <td style="font-size:11px;color:var(--text2)">${u.updated_at ? new Date(u.updated_at).toLocaleTimeString('ar') : '—'}</td>
        <td><button class="btn btn-ghost sm" onclick="viewAI('${(u.jid||'').replace(/'/g,"\\'")}')">عرض</button></td>
      </tr>`).join('')}
      </tbody>
    </table></div>`;
}

async function viewAI(jid) {
  document.getElementById('modal-ai-title').textContent = jid;
  document.getElementById('modal-ai-body').innerHTML = spin();
  document.getElementById('modal-ai').classList.add('show');
  try {
    const res = await fetch(`/api/aichat-detail?jid=${encodeURIComponent(jid)}`);
    const data = await res.json();
    const hist = Array.isArray(data.history) ? data.history : [];
    document.getElementById('modal-ai-body').innerHTML = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px">${hist.length} رسالة بالذاكرة</div>
      <div style="max-height:350px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
        ${hist.map(m => `<div style="padding:8px 12px;background:var(--surface);border-radius:8px;font-size:12px">
          <b>${m.role==='user'?'👤 User':'🤖 Bot'}:</b> ${(typeof m.content==='string'?m.content:JSON.stringify(m.content)).substring(0,250)}
        </div>`).join('')}
      </div>`;
  } catch(e) {
    document.getElementById('modal-ai-body').innerHTML = empty('fas fa-exclamation', e.message);
  }
}

// ── Broadcast Center & Dev Messages ───────────────────────────────────────────
let bcMediaFile = null;

function updateBcPreview() {
  const text = document.getElementById('bc-msg-text').value.trim();
  const prev = document.getElementById('bc-preview-text');
  if (!text) {
    prev.style.fontStyle = 'italic';
    prev.style.color = 'var(--text2)';
    prev.textContent = 'اكتب رسالتك لترى المعاينة هنا...';
  } else {
    prev.style.fontStyle = 'normal';
    prev.style.color = 'var(--text)';
    prev.textContent = text;
  }
}

function bcAttachFile(input) {
  const file = input.files[0];
  if (!file) return;
  bcMediaFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('bc-attach-img').src = e.target.result;
    document.getElementById('bc-attach-preview').style.display = 'block';
    toast('📎 تم إرفاق الصورة', 'ok');
  };
  reader.readAsDataURL(file);
}

function removeBcAttach() {
  bcMediaFile = null;
  document.getElementById('bc-attach-preview').style.display = 'none';
  document.getElementById('bc-file-input').value = '';
}

async function sendBroadcast() {
  const text = document.getElementById('bc-msg-text').value.trim();
  if (!text && !bcMediaFile) {
    toast('❌ اكتب رسالة أو أرفق صورة للإرسال', 'err');
    return;
  }

  const btn = document.getElementById('bc-send-btn');
  const badge = document.getElementById('bc-status-badge');
  btn.disabled = true;
  badge.textContent = 'جاري الإرسال';
  badge.className = 'badge b-y';

  try {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (bcMediaFile) formData.append('image', bcMediaFile);

    const res = await fetch('/api/broadcast', { method: 'POST', body: formData });
    const result = await res.json();

    badge.textContent = 'تم ✅';
    badge.className = 'badge b-g';
    toast(`✅ تم إرسال البث لـ ${result.sent || 0} مستخدم!`, 'ok');

    document.getElementById('bc-msg-text').value = '';
    updateBcPreview();
    removeBcAttach();
    loadBroadcastHistory();
  } catch(e) {
    badge.textContent = 'خطأ';
    badge.className = 'badge b-r';
    toast('❌ ' + e.message, 'err');
  } finally {
    btn.disabled = false;
  }
}

async function loadBroadcastHistory() {
  const wrap = document.getElementById('bc-history-wrap');
  if (!wrap) return;
  wrap.innerHTML = spin();
  try {
    const res = await fetch('/api/broadcasts');
    const data = await res.json();
    if (!data || !data.length) { wrap.innerHTML = empty('fas fa-satellite-dish','لا توجد بثوث سابقة'); return; }
    wrap.innerHTML = data.map(b => `
      <div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:10px;border-right:3px solid var(--green)">
        <div class="row-between mb-8">
          <span class="badge b-g">✅ ${b.sent_count||0} نجاح</span>
          <span style="font-size:10px;color:var(--text2)">${b.created_at ? new Date(b.created_at).toLocaleDateString('ar') : ''}</span>
        </div>
        <div style="font-size:12px">${(b.text||'').substring(0,100)}</div>
      </div>`).join('');
  } catch(e) {
    wrap.innerHTML = empty('fas fa-exclamation', e.message);
  }
}

async function loadBcUserCount() {
  try {
    const res = await fetch('/api/users?count=1');
    const d = await res.json();
    const el = document.getElementById('bc-user-count');
    if (el) el.textContent = `${d.count || 0} مستخدم مسجل بالسيرفر`;
  } catch(_) {}
}

async function loadDevMsg() {
  const wrap = document.getElementById('devmsg-wrap');
  if (!wrap) return;
  wrap.innerHTML = spin();
  try {
    const res = await fetch('/api/devmsg');
    const data = await res.json();
    allDevMsg = data || [];
    renderDevMsg(allDevMsg);

    const dw = document.getElementById('dash-devmsg');
    if (dw) {
      const recent = allDevMsg.slice(0, 3);
      if (!recent.length) { dw.innerHTML = empty('fas fa-inbox','لا توجد رسائل موجهة للمطور'); return; }
      dw.innerHTML = recent.map(m => `
        <div class="msg-item">
          <div class="msg-meta">
            <span class="badge ${m.replied ? 'b-g' : 'b-y'}">${m.replied ? 'مردود' : 'جديد'}</span>
            <span style="font-size:12px;font-weight:700">${m.sender_name||'—'}</span>
          </div>
          <div class="msg-text">${(m.text||'').substring(0,75)}</div>
        </div>`).join('');
    }
  } catch(e) {
    wrap.innerHTML = empty('fas fa-exclamation', e.message);
  }
}

function filterDevMsg() {
  const f = document.getElementById('devmsg-filter').value;
  if (f === 'all') renderDevMsg(allDevMsg);
  else renderDevMsg(allDevMsg.filter(m => String(m.replied) === f));
}

function renderDevMsg(list) {
  const wrap = document.getElementById('devmsg-wrap');
  if (!list.length) { wrap.innerHTML = empty('fas fa-inbox','لا توجد رسائل'); return; }
  wrap.innerHTML = list.map(m => `
    <div class="msg-item">
      <div class="msg-meta">
        <span class="badge ${m.replied ? 'b-g':'b-y'}">${m.replied ? 'تم الرد':'جديد'}</span>
        <b>${m.sender_name||'—'}</b>
        <span class="mono" style="font-size:11px;color:var(--text2)">+${m.sender||''}</span>
      </div>
      <div class="msg-text">${m.text||'—'}</div>
      ${m.reply_text ? `<div class="msg-reply"><b>الرد:</b> ${m.reply_text}</div>` : ''}
      ${!m.replied ? `
        <button class="btn btn-g sm mt-16" onclick="openReply('${(m.id||'').replace(/'/g,"\\'")}')">
          <i class="fas fa-reply"></i> رد على الرسالة
        </button>` : ''}
    </div>`).join('');
}

function openReply(id) {
  document.getElementById('reply-id').value = id;
  document.getElementById('reply-text').value = '';
  document.getElementById('modal-reply').classList.add('show');
}

async function sendReply() {
  const id   = document.getElementById('reply-id').value;
  const text = document.getElementById('reply-text').value.trim();
  if (!text) return toast('❌ اكتب الرد أولاً', 'err');
  const { error } = await sb.from('dev_messages').update({
    replied: true, reply_text: text, reply_timestamp: new Date().toISOString()
  }).eq('id', id);
  if (error) return toast('❌ فشل الرد: ' + error.message, 'err');
  toast('✅ تم إرسال الرد للمستخدم!', 'ok');
  closeM('modal-reply');
  loadDevMsg();
}

// ── Error Logs ─────────────────────────────────────────────────────────────────
async function loadErrors() {
  const wrap = document.getElementById('errors-wrap');
  if (!wrap) return;
  wrap.innerHTML = spin();
  try {
    const res = await fetch('/api/errors');
    const list = await res.json();
    if (!list.length) { wrap.innerHTML = empty('fas fa-check-circle','لم يتم رصد أي أخطاء! 🎉'); return; }
    wrap.innerHTML = `<div class="ov-x-auto"><table class="tbl">
      <thead><tr><th>#</th><th>الأمر</th><th>الخطأ</th><th>التاريخ</th></tr></thead>
      <tbody>
      ${list.map((e,i) => `<tr>
        <td style="color:var(--text3)">${i+1}</td>
        <td><code class="text-accent">.${e.command||'—'}</code></td>
        <td style="color:var(--red);font-size:12px">${e.error_message||'—'}</td>
        <td style="font-size:11px;color:var(--text2)">${e.created_at ? new Date(e.created_at).toLocaleString('ar') : '—'}</td>
      </tr>`).join('')}
      </tbody>
    </table></div>`;
  } catch(e) {
    wrap.innerHTML = empty('fas fa-exclamation-triangle', e.message);
  }
}

// ── Commands Registry Display ──────────────────────────────────────────────────
const CMDS = [
  { icon:'📥', name:'ytmp3',   desc:'تنزيل أوديو يوتيوب', tag:'downloader' },
  { icon:'📹', name:'ytmp4',   desc:'تنزيل فيديو يوتيوب', tag:'downloader' },
  { icon:'🎵', name:'yts',     desc:'بحث يوتيوب',         tag:'downloader' },
  { icon:'📲', name:'tiktok',  desc:'تنزيل تيك توك',      tag:'downloader' },
  { icon:'🖼️', name:'pinterest',desc:'تنزيل بينتريست',    tag:'downloader' },
  { icon:'🎤', name:'vocalremover',desc:'عزل صوت المغني AI',tag:'editor'    },
  { icon:'📖', name:'quran',   desc:'تلاوة وآيات قرآنية',  tag:'islamic'    },
  { icon:'🎧', name:'quranmp3',desc:'سورة كاملة MP3',    tag:'islamic'    },
  { icon:'🕌', name:'salat',   desc:'مواقيت الصلاة',     tag:'islamic'    },
  { icon:'⛅', name:'taqs',    desc:'حالة الطقس والجو',   tag:'tools'      },
  { icon:'🎮', name:'rps',     desc:'حجرة ورقة مقص',     tag:'game'       },
  { icon:'🎯', name:'truefalse',desc:'لعبة صح أم خطأ',   tag:'game'       },
  { icon:'😂', name:'joke',    desc:'نكت مضحكة وهربانة', tag:'fun'        },
  { icon:'💡', name:'fact',    desc:'حقائق ومعلومات',    tag:'fun'        },
  { icon:'💖', name:'flirt',   desc:'كلام غزل هربان',    tag:'fun'        },
  { icon:'🖼️', name:'meme',    desc:'ميمز كوميدية',       tag:'fun'        },
];

function copyCmd(cmd) {
  navigator.clipboard.writeText('.' + cmd).catch(() => {});
  toast('✅ تم نسخ الأمر: .' + cmd, 'ok');
}

function renderCmds() {
  const grid = document.getElementById('cmds-grid');
  if (!grid) return;
  grid.innerHTML = CMDS.map(c => `
    <div class="card" style="cursor:pointer" onclick="copyCmd('${c.name}')">
      <div style="font-size:28px;margin-bottom:8px">${c.icon}</div>
      <div class="mono" style="font-size:14px;font-weight:700;margin-bottom:4px">.${c.name}</div>
      <div style="font-size:11px;color:var(--text2);margin-bottom:8px">${c.desc}</div>
      <span class="badge b-g">${c.tag}</span>
    </div>`).join('');
}

// ── Settings Page Logic ────────────────────────────────────────────────────────
function switchSettingsTab(tab) {
  ['bot','owner','db'].forEach(t => {
    const panel = document.getElementById('spanel-' + t);
    const btn = document.getElementById('stab-' + t);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'db') loadCfgForm();
  if (tab === 'bot') loadBotSettings();
}

function saveBotSettings() {
  const data = {
    botname: document.getElementById('s-botname').value.trim(),
    author: document.getElementById('s-author').value.trim(),
    source: document.getElementById('s-source').value.trim(),
    owner1: document.getElementById('s-owner1').value.trim(),
    owner2: document.getElementById('s-owner2').value.trim(),
    pairing: document.getElementById('s-pairing').value.trim(),
  };
  localStorage.setItem('bot_settings', JSON.stringify(data));
  toast('✅ تم حفظ إعدادات البوت', 'ok');
}

function loadBotSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('bot_settings') || '{}');
    if (saved.botname) document.getElementById('s-botname').value = saved.botname;
    if (saved.author) document.getElementById('s-author').value = saved.author;
    if (saved.source) document.getElementById('s-source').value = saved.source;
    if (saved.owner1) document.getElementById('s-owner1').value = saved.owner1;
    if (saved.owner2) document.getElementById('s-owner2').value = saved.owner2;
    if (saved.pairing) document.getElementById('s-pairing').value = saved.pairing;
  } catch(e) {}
}

function syncApkSlider(val) {
  val = parseInt(val);
  const big = document.getElementById('apk-limit-big');
  const slider = document.getElementById('apk-limit-slider');
  if (big) big.textContent = val;
  if (slider) slider.value = val;
}

async function saveApkLimit() {
  const limit = parseInt(document.getElementById('apk-limit-slider').value);
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apk_daily_limit: String(limit) })
    });
    const data = await res.json();
    if (data.success) toast(`✅ تم حفظ حد APK: ${limit} تطبيق/يوم`, 'ok');
  } catch(e) {
    toast('⚠️ خطأ بالحفظ: ' + e.message, 'warn');
  }
  localStorage.setItem('apk_daily_limit', String(limit));
}

function loadCfgForm() {
  document.getElementById('cfg-url').value = cfg.url;
  document.getElementById('cfg-key').value = cfg.key;
}

async function saveConfig() {
  cfg.url = document.getElementById('cfg-url').value.trim() || DEF_URL;
  cfg.key = document.getElementById('cfg-key').value.trim() || DEF_KEY;
  localStorage.setItem('sb_url', cfg.url);
  localStorage.setItem('sb_key', cfg.key);
  initSB();
  toast('✅ تم تحديث إعدادات Supabase', 'ok');
}

function animN(id, target) {
  const el = document.getElementById(id); if (!el) return;
  let cur = 0; const step = Math.max(1, Math.ceil(target/25));
  const t = setInterval(() => {
    cur = Math.min(cur+step, target);
    el.textContent = cur.toLocaleString('ar');
    if (cur >= target) clearInterval(t);
  }, 30);
}

function spin() { return '<div class="sw"><div class="sp"></div></div>'; }
function empty(icon, msg) { return `<div class="empty"><i class="${icon}"></i><p>${msg}</p></div>`; }

// ── Startup Initialization ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  initSB();
  const activePage = localStorage.getItem('active_page') || 'dashboard';
  goPage(activePage);
  await loadStats();
});

// ══════════════════════════════════════════════════════════════════════════════
// ── PAGE: BOT DETAILS — Per-bot analytics, inbox, and user roster ─────────────
// ══════════════════════════════════════════════════════════════════════════════
let _bdSelectedPhone = null;

async function loadBotDetailsPage() {
  const bar = document.getElementById('bd-selector-bar');
  if (!bar) return;
  bar.innerHTML = spin();

  try {
    const res = await fetch('/api/bots-list');
    const data = await res.json();
    const bots = data.bots || [];

    if (!bots.length) {
      bar.innerHTML = empty('fas fa-robot', 'لا توجد بوتات مسجلة بعد');
      return;
    }

    bar.innerHTML = bots.map((b, idx) => {
      const phone = b.phone_number;
      const isOnline = b.connected;
      const isSelected = (_bdSelectedPhone === phone) || (!_bdSelectedPhone && idx === 0);
      const bg = isSelected ? 'var(--accent)' : 'var(--bg2, #f1f5f9)';
      const col = isSelected ? '#ffffff' : 'var(--txt, #0f172a)';
      const border = isSelected ? '2px solid var(--accent)' : '1px solid var(--bd, #cbd5e1)';
      return `
        <button class="btn bd-bot-btn" data-phone="${phone}" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;background:${bg};color:${col};border:${border};" onclick="selectBotDetail('${phone}')">
          <span style="width:10px;height:10px;border-radius:50%;background:${isOnline ? '#22c55e' : '#ef4444'};display:inline-block;flex-shrink:0;"></span>
          <span style="direction:ltr;unicode-bidi:embed;display:inline-block;color:inherit;">+${phone}</span>
        </button>`;
    }).join('');

    // Auto-select first bot if none selected
    if (!_bdSelectedPhone && bots.length) {
      await selectBotDetail(bots[0].phone_number);
    } else if (_bdSelectedPhone) {
      await fetchBotDetail(_bdSelectedPhone);
    }
  } catch (err) {
    bar.innerHTML = `<div class="empty"><i class="fas fa-exclamation-triangle"></i><p>خطأ في تحميل البوتات: ${err.message}</p></div>`;
  }
}

async function selectBotDetail(phone) {
  _bdSelectedPhone = phone;
  // Highlight selected button
  const bar = document.getElementById('bd-selector-bar');
  if (bar) {
    bar.querySelectorAll('.bd-bot-btn').forEach(btn => {
      const isThis = btn.dataset.phone === phone;
      if (isThis) {
        btn.style.background = 'var(--accent)';
        btn.style.color = '#ffffff';
        btn.style.border = '2px solid var(--accent)';
        btn.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)';
      } else {
        btn.style.background = 'var(--bg2, #f1f5f9)';
        btn.style.color = 'var(--txt, #0f172a)';
        btn.style.border = '1px solid var(--bd, #cbd5e1)';
        btn.style.boxShadow = 'none';
      }
    });
  }
  await fetchBotDetail(phone);
}

async function fetchBotDetail(phone) {
  // Show spinners in all sections
  ['bd-top-cmds-wrap', 'bd-dev-msgs-wrap', 'bd-users-table-wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = spin();
  });

  try {
    const res = await fetch(`/api/bot-details?phone=${encodeURIComponent(phone)}`);
    const d = await res.json();
    if (d.error) throw new Error(d.error);

    // ── Stat Cards ──────────────────────────────────────────────
    const phoneEl = document.getElementById('bd-phone-val');
    const statusEl = document.getElementById('bd-status-badge');
    const usersEl = document.getElementById('bd-users-count');
    const msgsEl = document.getElementById('bd-msgs-count');
    const modeEl = document.getElementById('bd-mode-val');

    if (phoneEl) phoneEl.innerHTML = `<span style="direction:ltr;unicode-bidi:embed;display:inline-block;">+${phone}</span>`;
    if (statusEl) statusEl.innerHTML = d.connected
      ? '<span style="color:#22c55e;font-weight:700;">🟢 متصل الآن</span>'
      : '<span style="color:#ef4444;font-weight:700;">🔴 غير متصل</span>';
    if (usersEl) usersEl.textContent = (d.total_users || 0).toLocaleString('ar');
    if (msgsEl)  msgsEl.textContent  = (d.messages_handled || 0).toLocaleString('ar');

    const modeLabels = { public: '🌐 عام', private: '🔒 خاص', group: '👥 مجموعات', admin: '👑 أدمن' };
    if (modeEl) modeEl.textContent = modeLabels[d.mode] || d.mode || '—';

    // ── Top Commands ─────────────────────────────────────────────
    const cmdsWrap = document.getElementById('bd-top-cmds-wrap');
    if (cmdsWrap) {
      const cmds = d.top_commands || [];
      if (!cmds.length) {
        cmdsWrap.innerHTML = empty('fas fa-terminal', 'لا توجد أوامر مسجلة بعد');
      } else {
        const max = cmds[0]?.count || 1;
        cmdsWrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
          ${cmds.slice(0, 10).map((c, i) => {
            const pct = Math.round((c.count / max) * 100);
            return `<div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:12px;font-weight:700;color:var(--accent);min-width:20px;">#${i+1}</span>
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span style="font-weight:600;font-size:13px;">.${c.cmd}</span>
                  <span style="font-size:12px;color:var(--txt2);">${c.count.toLocaleString('ar')} مرة</span>
                </div>
                <div style="background:var(--bg2);border-radius:8px;height:6px;overflow:hidden;">
                  <div style="background:var(--accent);height:100%;width:${pct}%;border-radius:8px;transition:width 0.5s;"></div>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>`;
      }
    }

    // ── Dev Messages Inbox (isolated to this bot) ─────────────────
    const devWrap = document.getElementById('bd-dev-msgs-wrap');
    if (devWrap) {
      const msgs = d.dev_messages || [];
      if (!msgs.length) {
        devWrap.innerHTML = empty('fas fa-inbox', 'لا توجد رسائل واردة لهذا البوت بعد');
      } else {
        devWrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;max-height:360px;overflow-y:auto;padding-right:4px;">
          ${msgs.map(msg => {
            const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString('ar-MA') : '—';
            const replied = msg.replied;
            const botP = msg.bot_phone || phone;
            return `<div style="border:1px solid var(--bd);border-radius:12px;padding:12px;background:var(--bg2);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-weight:700;font-size:13px;color:var(--txt);">👤 ${msg.sender_name || msg.sender_phone || '—'}</span>
                <span style="font-size:11px;color:var(--txt2);">${ts}</span>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:var(--txt2);line-height:1.6;">${msg.text || '—'}</p>
              <div style="display:flex;gap:8px;align-items:center;">
                ${replied
                  ? `<span class="badge b-g" style="font-size:11px;">✅ تم الرد</span><span style="font-size:12px;color:var(--txt2);">${msg.reply_text || ''}</span>`
                  : `<button class="btn sm btn-g" onclick="bdReplyMsg('${msg.id}','${(msg.sender_name||'').replace(/'/g,'')}','${botP}')"><i class="fas fa-reply"></i> رد الآن</button>`
                }
              </div>
            </div>`;
          }).join('')}
        </div>`;
      }
    }

    // ── User Roster ───────────────────────────────────────────────
    const usersWrap = document.getElementById('bd-users-table-wrap');
    if (usersWrap) {
      const users = d.users || [];
      if (!users.length) {
        usersWrap.innerHTML = empty('fas fa-user-slash', 'لا يوجد مستخدمون مسجلون لهذا البوت بعد');
      } else {
        usersWrap.innerHTML = `<div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="border-bottom:2px solid var(--bd);">
                <th style="padding:10px 12px;text-align:right;color:var(--txt2);font-weight:600;">#</th>
                <th style="padding:10px 12px;text-align:right;color:var(--txt2);font-weight:600;">الاسم</th>
                <th style="padding:10px 12px;text-align:right;color:var(--txt2);font-weight:600;">الرقم</th>
                <th style="padding:10px 12px;text-align:right;color:var(--txt2);font-weight:600;">آخر ظهور</th>
                <th style="padding:10px 12px;text-align:center;color:var(--txt2);font-weight:600;">إجراء</th>
              </tr>
            </thead>
            <tbody>
              ${users.map((u, i) => {
                const lastSeen = u.last_seen ? new Date(u.last_seen).toLocaleDateString('ar-MA') : '—';
                const num = u.phone_number || u.jid?.split('@')[0] || '—';
                return `<tr style="border-bottom:1px solid var(--bd);transition:background 0.2s;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
                  <td style="padding:10px 12px;color:var(--txt2);">${i+1}</td>
                  <td style="padding:10px 12px;font-weight:600;">${u.name || '—'}</td>
                  <td style="padding:10px 12px;direction:ltr;color:var(--accent);">+${num}</td>
                  <td style="padding:10px 12px;color:var(--txt2);">${lastSeen}</td>
                  <td style="padding:10px 12px;text-align:center;">
                    <button class="btn sm" style="font-size:11px;" onclick="bdSendMsg('${num}','${phone}')"><i class="fas fa-paper-plane"></i> رسالة</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
      }
    }

  } catch (err) {
    ['bd-top-cmds-wrap', 'bd-dev-msgs-wrap', 'bd-users-table-wrap'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="empty"><i class="fas fa-exclamation-triangle"></i><p>خطأ: ${err.message}</p></div>`;
    });
  }
}

// ── Custom Prompt Modal (replaces browser window.prompt) ─────────────────────
let _promptResolve = null;

function openPromptModal({ title = 'إدخال نص', subtitle = '', icon = '✍️', placeholder = 'اكتب هنا...' } = {}) {
  return new Promise((resolve) => {
    _promptResolve = resolve;
    document.getElementById('prompt-title').textContent     = title;
    document.getElementById('prompt-subtitle').textContent  = subtitle;
    document.getElementById('prompt-icon').textContent      = icon;
    document.getElementById('prompt-input').placeholder     = placeholder;
    document.getElementById('prompt-input').value           = '';
    const mo = document.getElementById('modal-prompt');
    mo.classList.add('show');
    // Autofocus after animation frame
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('prompt-input').focus()));
  });
}

function closePromptModal(confirmed) {
  const mo = document.getElementById('modal-prompt');
  mo.classList.remove('show');
  const val = document.getElementById('prompt-input').value.trim();
  if (_promptResolve) {
    _promptResolve(confirmed && val ? val : null);
    _promptResolve = null;
  }
}

// ── Reply to a msgtodev message from the EXACT receiving bot ─────────────────
async function bdReplyMsg(msgId, senderName, botPhone) {
  const txt = await openPromptModal({
    icon: '✍️',
    title: `الرد على رسالة "${senderName}"`,
    subtitle: `سيتم إرسال الرد من البوت +${botPhone}`,
    placeholder: 'اكتب ردك هنا...'
  });
  if (!txt) return;
  try {
    const res = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: msgId, reply_text: txt })
    });
    const d = await res.json();
    if (d.success) {
      toast('✅ تم إرسال الرد بنجاح عبر البوت +' + botPhone, 'ok');
      await fetchBotDetail(botPhone);
    } else {
      toast('❌ فشل الإرسال: ' + (d.error || 'خطأ غير معروف'), 'err');
    }
  } catch (err) {
    toast('❌ خطأ: ' + err.message, 'err');
  }
}

// ── Send a direct message from a specific bot ─────────────────────────────────
async function bdSendMsg(toPhone, fromBotPhone) {
  const txt = await openPromptModal({
    icon: '📤',
    title: `إرسال رسالة مباشرة إلى +${toPhone}`,
    subtitle: `سيتم الإرسال من البوت +${fromBotPhone}`,
    placeholder: 'اكتب نص الرسالة...'
  });
  if (!txt) return;
  try {
    const res = await fetch('/api/send-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: toPhone, text: txt, bot_phone: fromBotPhone })
    });
    const d = await res.json();
    if (d.success) toast('✅ تم الإرسال بنجاح', 'ok');
    else toast('❌ فشل الإرسال: ' + (d.error || ''), 'err');
  } catch (err) {
    toast('❌ خطأ: ' + err.message, 'err');
  }
}

// ── Load Access Requests (Admin) ───────────────────────────────────────────────
async function loadAccessRequests() {
  const wrap = document.getElementById('access-req-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="sw"><div class="sp"></div></div>';
  try {
    const res = await fetch('/api/access-requests');
    const rows = await res.json();
    if (!rows || !rows.length) {
      wrap.innerHTML = empty('fas fa-inbox', 'لا توجد طلبات دخول بعد');
      return;
    }

    const statusBadge = (s) => {
      if (s === 'approved') return `<span class="sbar success" style="display:inline-flex;padding:3px 10px;font-size:11px;font-weight:700;border-radius:20px;margin:0">✅ موافق عليه</span>`;
      if (s === 'rejected') return `<span class="sbar error" style="display:inline-flex;padding:3px 10px;font-size:11px;font-weight:700;border-radius:20px;margin:0">❌ مرفوض</span>`;
      return `<span class="sbar warn" style="display:inline-flex;padding:3px 10px;font-size:11px;font-weight:700;border-radius:20px;margin:0">⏳ قيد المراجعة</span>`;
    };

    wrap.innerHTML = rows.map(r => `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex;align-items:flex-start;gap:16px;">
          <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(16,185,129,0.2),rgba(6,182,212,0.15));display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">👤</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:700;margin-bottom:6px">${r.name || '—'}</div>
            <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--text2);margin-bottom:10px">
              <span><i class="fas fa-phone"></i> ${r.phone || '—'}</span>
              <span><i class="fas fa-clock"></i> ${r.created_at ? new Date(r.created_at).toLocaleString('ar') : '—'}</span>
              ${statusBadge(r.status)}
            </div>
            ${r.reason ? `<div style="font-size:12px;color:var(--text2);font-style:italic;margin-bottom:12px">"${r.reason}"</div>` : ''}
            ${r.status === 'approved' && r.username ? `
              <div style="background:rgba(16,185,129,0.07);border:1px dashed rgba(16,185,129,0.3);border-radius:9px;padding:10px 14px;font-size:12px;margin-bottom:12px;font-family:monospace">
                👤 المستخدم: <strong style="color:#10b981">${r.username}</strong> &nbsp;|&nbsp; 🔑 كلمة السر: <strong style="color:#10b981">${r.password}</strong>
              </div>` : ''}
            ${r.status === 'pending' ? `
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-g sm" onclick="handleAccessReq('${r.id}','approve')"><i class="fas fa-check"></i> موافقة وإنشاء حساب</button>
                <button class="btn btn-danger sm" onclick="handleAccessReq('${r.id}','reject')"><i class="fas fa-times"></i> رفض</button>
              </div>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    // Update pending badge count in sidebar
    const pending = rows.filter(r => r.status === 'pending').length;
    const badge = document.getElementById('req-badge');
    if (badge) {
      badge.textContent = pending;
      badge.style.display = pending > 0 ? 'inline-block' : 'none';
    }
  } catch (err) {
    wrap.innerHTML = `<div class="sbar error">❌ خطأ في تحميل الطلبات: ${err.message}</div>`;
  }
}

async function handleAccessReq(id, action) {
  const label = action === 'approve' ? 'الموافقة على الطلب وإنشاء حساب تلقائي' : 'رفض الطلب';
  const ok = await showConfirm({ title: label, text: 'هل أنت متأكد؟', confirmText: label, isDanger: action === 'reject' });
  if (!ok) return;
  try {
    const res = await fetch('/api/access-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    });
    const d = await res.json();
    if (d.success) {
      toast(action === 'approve' ? '✅ تمت الموافقة وإنشاء الحساب' : '✅ تم الرفض', 'ok');
      loadAccessRequests();
    } else {
      toast('❌ ' + (d.error || 'خطأ'), 'err');
    }
  } catch (err) {
    toast('❌ ' + err.message, 'err');
  }
}
