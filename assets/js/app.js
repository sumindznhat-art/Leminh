/* ============================================================
   TOOL MINHIOS — app.js (REBUILD FULL)
   Đã fix toàn bộ lỗi load, null check, try/catch
   ============================================================ */

var _currentCat = 'all';
var _appReady   = false;

/* ---------- BOOTSTRAP ---------- */
function _bootstrap() {
  if (_appReady) return;
  _appReady = true;

  console.log('[app.js] bootstrap start');

  // Luôn gắn sự kiện Enter cho form login/register trước
  ['loginEmail', 'loginPass'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doLogin();
    });
  });
  ['regName', 'regEmail', 'regPass', 'regPass2'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doRegister();
    });
  });

  // Load config remote — dù thành công hay thất bại vẫn phải cho login hiện
  loadRemoteConfig()
    .catch(function (e) { console.warn('[loadRemoteConfig]', e); })
    .then(function () {
      var s = getSession();
      if (s && s.user) {
        try { enterApp(); }
        catch (e) {
          console.error('[enterApp fail]', e);
          alert('Lỗi khởi động app: ' + (e.message || e));
          clearSession();
          _showLogin();
        }
      } else {
        _showLogin();
      }
    });
}

function _showLogin() {
  applyLoginBranding();
  var ls = document.getElementById('login-screen');
  if (ls) ls.style.display = 'flex';
  var app = document.getElementById('app');
  if (app) app.style.display = 'none';
}

// Đảm bảo chạy dù script load trước hay sau DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootstrap);
} else {
  _bootstrap();
}

/* ---------- REMOTE CONFIG ---------- */
function loadRemoteConfig() {
  return api('config_get')
    .then(function (res) {
      if (res && res.success && res.config && typeof res.config === 'object') {
        var remote = res.config;
        var keys = ['site_name', 'site_desc', 'marquee', 'footer',
                    'logo', 'avatar', 'music_url', 'support_link'];
        keys.forEach(function (k) {
          if (remote[k]) window.CONFIG[k] = remote[k];
        });
        if (remote.bank && typeof remote.bank === 'object') {
          window.CONFIG.bank = Object.assign({}, window.CONFIG.bank, remote.bank);
        }
        if (Array.isArray(remote.ports) && remote.ports.length) {
          window.CONFIG.ports = remote.ports;
        }
      }
      return res;
    });
}

function saveRemoteConfig() {
  var s = getSession();
  if (!s) return Promise.resolve({ success: false, error: 'Chưa đăng nhập' });
  return api('config_save', {
    email: s.email,
    password: s.password,
    config: window.CONFIG
  });
}

/* ---------- BRANDING ---------- */
function applyLoginBranding() {
  if (!window.CONFIG) return;

  var t = document.getElementById('loginSiteName');
  if (t && window.CONFIG.site_name) t.textContent = window.CONFIG.site_name;

  var s = document.getElementById('subText');
  if (s && window.CONFIG.site_desc) s.textContent = window.CONFIG.site_desc;

  // Avatar đăng nhập: ưu tiên avatar từ storage / config.avatar / logo
  var av = getAvatarFromStorage()
        || window.CONFIG.avatar
        || window.CONFIG.logo
        || DEFAULT_AVATAR;
  var lg = document.getElementById('loginAvatarImg');
  if (lg && av) lg.src = av;

  // Đổi title trang
  if (window.CONFIG.site_name) document.title = window.CONFIG.site_name;
}

/* ---------- ENTER APP (sau khi login) ---------- */
function enterApp() {
  var ls = document.getElementById('login-screen');
  if (ls) ls.style.display = 'none';
  var app = document.getElementById('app');
  if (app) app.style.display = 'flex';

  var s = getSession();
  if (!s || !s.user) {
    doLogout();
    return;
  }

  var u = s.user;

  // Load lại user từ server (fresh data)
  apiGetUser()
    .then(function (res) {
      if (res && res.success && res.user) u = res.user;
    })
    .catch(function (e) { console.warn('[apiGetUser]', e); })
    .then(function () {
      if (!u) { doLogout(); return; }

      try {
        _initAppUI(u);
      } catch (e) {
        console.error('[initAppUI]', e);
        alert('Lỗi khởi tạo giao diện: ' + (e.message || e));
      }
    });
}

function _initAppUI(u) {
  var isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);

  // Nút admin
  var float = document.getElementById('adminFloat');
  if (float) float.style.display = isAdmin ? 'flex' : 'none';
  var diAdm = document.getElementById('diAdmin');
  if (diAdm) diAdm.style.display = isAdmin ? '' : 'none';

  // Avatar
  var av = u.avatar
        || getAvatarFromStorage()
        || (window.CONFIG && window.CONFIG.avatar)
        || DEFAULT_AVATAR;
  if (av) applyAvatarEverywhere(av);

  // Header
  var hn = document.getElementById('hdrName');
  if (hn) hn.textContent = u.name || 'User';
  var hc = document.getElementById('hdrCoin');
  if (hc) hc.textContent = fmt(u.balance || 0);

  // Drawer
  var dn = document.getElementById('drawerName');
  if (dn) dn.textContent = u.name || 'User';
  var de = document.getElementById('drawerEmail');
  if (de) de.textContent = u.email || '';

  // Badge admin
  if (isAdmin) {
    var s = getSession();
    api('deposit_pending', { email: s.email, password: s.password })
      .then(function (r) {
        var cnt = (r && r.success) ? (r.deposits || []).length : 0;
        var b = document.getElementById('pendBadge');
        if (b) {
          b.textContent = cnt;
          b.style.display = cnt ? 'inline-block' : 'none';
        }
      })
      .catch(function () {});
  }

  applyLoginBranding();
  buildBankInfo();
  buildPackages();
  buildCatTabs();
  buildPorts();
  renderAll();
  showPage('home');
}

/* ---------- PAGE NAVIGATION ---------- */
function showPage(p) {
  document.querySelectorAll('.page').forEach(function (x) {
    x.classList.remove('active');
  });
  var el = document.getElementById('page-' + p);
  if (el) el.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(function (b) {
    b.classList.toggle('active', b.dataset.page === p);
  });

  var c = document.getElementById('appContent');
  if (c) c.scrollTop = 0;

  if (p === 'deposit' || p === 'vip' || p === 'profile') renderAll();
}

/* ---------- RENDER INFO ---------- */
function renderAll() {
  var s = getSession();
  if (!s || !s.user) return;
  var u = s.user;
  var bal = fmt(u.balance || 0);

  ['hdrCoin', 'depBalance', 'vipBalance', 'profBalance'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = bal;
  });

  var pn = document.getElementById('profName');
  if (pn) pn.textContent = u.name || 'User';

  var pr = document.getElementById('profRole');
  if (pr) pr.textContent = (u.is_admin == 1 || u.email === ADMIN_EMAIL)
    ? 'ADMIN' : 'THÀNH VIÊN';

  var pj = document.getElementById('profJoined');
  if (pj) pj.textContent = u.created_at
    ? new Date(Number(u.created_at)).toLocaleDateString('vi-VN')
    : '—';

  var pl = document.getElementById('profLastLogin');
  if (pl) pl.textContent = u.last_login
    ? new Date(Number(u.last_login)).toLocaleString('vi-VN')
    : '—';

  var pi = document.getElementById('profIP');
  if (pi) pi.textContent = u.ip || '—';

  var hasVip = Number(u.key_expiry) > Date.now();

  var ve = document.getElementById('vipExpiry');
  if (ve) ve.textContent = hasVip
    ? new Date(Number(u.key_expiry)).toLocaleString('vi-VN')
    : 'Chưa kích hoạt';

  var ds = document.getElementById('depStatus');
  if (ds) ds.textContent = hasVip
    ? 'VIP đến ' + new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN')
    : 'Chưa có key';
}

/* ---------- BANK INFO ---------- */
function buildBankInfo() {
  var el = document.getElementById('bankInfo');
  if (!el) return;
  var b = (window.CONFIG && window.CONFIG.bank) || {};

  var html = '<div class="sec-title">THÔNG TIN CHUYỂN KHOẢN</div>';
  html += '<div class="action-card" style="cursor:default">'
        +   '<div class="ac-icon"><i class="fa-solid fa-building-columns"></i></div>'
        +   '<div class="ac-info">'
        +     '<div class="ac-name">' + esc(b.name || '—') + '</div>'
        +     '<div class="ac-desc">STK: <b>' + esc(b.account || '—') + '</b> — ' + esc(b.owner || '—') + '</div>'
        +   '</div>'
        + '</div>';

  if (b.qr) {
    html += '<div style="margin:16px;text-align:center">'
          +   '<img src="' + esc(b.qr) + '" style="max-width:220px;border-radius:16px;border:2px solid #232734" alt="QR">'
          + '</div>';
  }
  el.innerHTML = html;
}

/* ---------- PACKAGES ---------- */
function buildPackages() {
  var el = document.getElementById('pkgList');
  if (!el) return;
  var pkgs = (window.CONFIG && window.CONFIG.packages) || [];

  if (!pkgs.length) {
    el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có gói</p>';
    return;
  }

  el.innerHTML = pkgs.map(function (p) {
    return '<div class="action-card" onclick="buyPackage(\'' + esc(p.id) + '\')">'
         +   '<div class="ac-icon" style="background:linear-gradient(135deg,#fbbf24,#f59e0b)">'
         +     '<i class="fa-solid fa-crown"></i>'
         +   '</div>'
         +   '<div class="ac-info">'
         +     '<div class="ac-name">' + esc(p.name) + '</div>'
         +     '<div class="ac-desc">' + p.days + ' ngày • <b>' + fmt(p.price) + '</b></div>'
         +   '</div>'
         +   '<i class="fa-solid fa-chevron-right ac-arrow"></i>'
         + '</div>';
  }).join('');
}

function buyPackage(id) {
  var pkgs = (window.CONFIG && window.CONFIG.packages) || [];
  var pkg = pkgs.filter(function (x) { return x.id === id; })[0];
  if (!pkg) return;

  var s = getSession();
  if (!s || !s.user) return;
  var u = s.user;

  if ((u.balance || 0) < pkg.price) {
    alert('Số dư không đủ! Vui lòng nạp thêm.');
    showPage('deposit');
    return;
  }
  if (!confirm('Mua ' + pkg.name + ' giá ' + fmt(pkg.price) + '?')) return;

  apiBuyPackage(pkg.days, pkg.price).then(function (res) {
    if (res && res.success) {
      alert('Mua thành công!');
      apiGetUser().then(function () { renderAll(); });
    } else {
      alert((res && res.error) || 'Lỗi mua gói');
    }
  }).catch(function (e) {
    alert((e && e.message) || 'Lỗi kết nối');
  });
}

/* ---------- CATEGORY TABS ---------- */
function buildCatTabs() {
  var els = [
    document.getElementById('catTabs'),
    document.getElementById('catTabs2')
  ];
  var tabs = [
    { key: 'all',       label: 'TẤT CẢ'    },
    { key: 'taixiu',    label: 'TÀI XỈU'   },
    { key: 'sicbo',     label: 'SICBO'     },
    { key: 'baccarat',  label: 'BACCARAT'  }
  ];

  var html = tabs.map(function (t) {
    return '<button class="cat-tab ' + (t.key === _currentCat ? 'active' : '')
         + '" data-cat="' + t.key + '" '
         + 'onclick="switchCat(\'' + t.key + '\')">'
         + t.label + '</button>';
  }).join('');

  els.forEach(function (el) { if (el) el.innerHTML = html; });
}

function switchCat(cat) {
  _currentCat = cat;
  document.querySelectorAll('.cat-tab').forEach(function (x) {
    x.classList.toggle('active', x.dataset.cat === cat);
  });
  buildPorts();
}

/* ---------- TOOL LIST ---------- */
function buildPorts() {
  var ports = (window.CONFIG && window.CONFIG.ports) || [];

  // Chỉ lấy tool enabled + đúng category
  var list = ports.filter(function (p) {
    if (!p || !p.enabled) return false;
    if (_currentCat !== 'all' && p.cat !== _currentCat) return false;
    return true;
  });

  // Sort theo sort field
  list.sort(function (a, b) {
    return (Number(a.sort) || 0) - (Number(b.sort) || 0);
  });

  var html = '';
  if (!list.length) {
    html = '<p style="text-align:center;color:#94a3b8;padding:40px 20px">Không có tool</p>';
  } else {
    // Nhóm theo category
    var groups = {};
    list.forEach(function (t) {
      var c = t.cat || 'other';
      if (!groups[c]) groups[c] = [];
      groups[c].push(t);
    });

    var catNames = {
      taixiu:   'TOOL TÀI XỈU',
      sicbo:    'TOOL SICBO',
      baccarat: 'TOOL BACCARAT',
      other:    'TOOL KHÁC'
    };

    Object.keys(groups).forEach(function (c) {
      html += '<div class="sec-head">' + (catNames[c] || c.toUpperCase()) + '</div>';
      html += '<div class="tool-grid">';
      groups[c].forEach(function (t) { html += renderToolItem(t); });
      html += '</div>';
    });
  }

  ['toolList', 'toolList2'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

function renderToolItem(t) {
  if (!t) return '';
  var slug = t.slug || t.name || '';
  var img  = getToolImage(t);
  var badges = '';

  if (t.hot == 1)         badges += '<span class="tool-badge hot">HOT</span>';
  if (t.is_new == 1)      badges += '<span class="tool-badge new">NEW</span>';
  if (t.vip == 1)         badges += '<span class="tool-badge vip">VIP</span>';
  if (t.maintenance == 1) badges += '<span class="tool-badge maintenance">BT</span>';

  var thumb = img
    ? '<img src="' + esc(img) + '" alt="' + esc(t.name) + '" loading="lazy">'
    : '<i class="fa-solid fa-cube" style="color:#ff3d71;font-size:40px"></i>';

  return '<div class="tool-item ' + (t.maintenance ? 'disabled' : '') + '" '
       + 'onclick="openTool(\'' + esc(slug) + '\')">'
       + badges
       + '<div class="tool-thumb">' + thumb + '</div>'
       + '<div class="tool-name">' + esc(t.name) + '</div>'
       + '</div>';
}

/* ---------- MODALS ---------- */
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('show');
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function openDepositModal() {
  var a = document.getElementById('depAmount'); if (a) a.value = '';
  var n = document.getElementById('depNote');   if (n) n.value = '';
  openModal('depositModal');
}

function openKeyModal() {
  var ki = document.getElementById('keyInput'); if (ki) ki.value = '';
  var ke = document.getElementById('keyErr');   if (ke) ke.textContent = '';
  openModal('keyModal');
}

function openAvatarModal() {
  var inp = document.getElementById('avBase64Input'); if (inp) inp.value = '';
  var st  = document.getElementById('avStatus');      if (st) st.textContent = '';
  openModal('avatarModal');
}

function saveAvatar() {
  var inp = document.getElementById('avBase64Input');
  var val = inp ? inp.value.trim() : '';
  var status = document.getElementById('avStatus');

  if (!val) { if (status) status.textContent = 'Chưa có dữ liệu'; return; }

  var src;
  if (val.indexOf('data:') === 0 || val.indexOf('http') === 0) {
    src = val;
  } else {
    src = 'data:image/png;base64,' + val;
  }

  setAvatarToStorage(src);
  applyAvatarEverywhere(src);
  if (status) status.textContent = 'Đã lưu ✓';
  setTimeout(function () { closeModal('avatarModal'); }, 800);
}

function resetAvatar() {
  setAvatarToStorage('');
  var av = (window.CONFIG && window.CONFIG.avatar) || DEFAULT_AVATAR;
  applyAvatarEverywhere(av);
}

/* ---------- HISTORY ---------- */
function openHistoryDeposit() {
  var s = getSession();
  if (!s) return;
  api('history', { email: s.email, password: s.password }).then(function (res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    var deps = hist.filter(function (h) {
      return h.type === 'deposit' || h.type === 'auto-buy';
    });

    var html = deps.length ? '' :
      '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có</p>';

    deps.forEach(function (d) {
      var amt = Number(d.amount) || 0;
      var color = amt > 0 ? '#22c55e' : '#ef4444';
      var sign = amt > 0 ? '+' : '';
      html += '<div style="border-left:3px solid ' + color + ';padding:10px;margin-bottom:6px;background:#0a0b0f;border-radius:6px">'
           +  '<div style="font-weight:700;color:' + color + '">' + sign + fmt(amt) + '</div>'
           +  '<div style="font-size:12px;color:#8b93a7">' + esc(d.note || '') + '</div>'
           + '</div>';
    });

    var t = document.getElementById('histTitle');
    if (t) t.textContent = 'LỊCH SỬ NẠP';
    var c = document.getElementById('histContent');
    if (c) c.innerHTML = html;
    openModal('historyModal');
  });
}

function openHistoryKey() {
  var s = getSession();
  if (!s) return;
  api('history', { email: s.email, password: s.password }).then(function (res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    var keys = hist.filter(function (h) {
      return h.type === 'key' || h.type === 'buy';
    });

    var html = keys.length ? '' :
      '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có</p>';

    keys.forEach(function (h) {
      html += '<div style="border-left:3px solid #8b5cf6;padding:10px;margin-bottom:6px;background:#0a0b0f;border-radius:6px">'
           +  '<div style="font-weight:700">' + esc(h.note || h.type) + '</div>'
           + '</div>';
    });

    var t = document.getElementById('histTitle');
    if (t) t.textContent = 'LỊCH SỬ KEY';
    var c = document.getElementById('histContent');
    if (c) c.innerHTML = html;
    openModal('historyModal');
  });
}

/* ---------- DRAWER ---------- */
function openDrawer() {
  var d = document.getElementById('drawer');     if (d) d.classList.add('show');
  var m = document.getElementById('drawerMask'); if (m) m.classList.add('show');
}
function closeDrawer() {
  var d = document.getElementById('drawer');     if (d) d.classList.remove('show');
  var m = document.getElementById('drawerMask'); if (m) m.classList.remove('show');
}

/* ---------- EXPORTS ---------- */
window.enterApp           = enterApp;
window.showPage           = showPage;
window.renderAll          = renderAll;
window.openDepositModal   = openDepositModal;
window.openHistoryDeposit = openHistoryDeposit;
window.openHistoryKey     = openHistoryKey;
window.openKeyModal       = openKeyModal;
window.openAvatarModal    = openAvatarModal;
window.saveAvatar         = saveAvatar;
window.resetAvatar        = resetAvatar;
window.openDrawer         = openDrawer;
window.closeDrawer        = closeDrawer;
window.buyPackage         = buyPackage;
window.openModal          = openModal;
window.closeModal         = closeModal;
window.loadRemoteConfig   = loadRemoteConfig;
window.saveRemoteConfig   = saveRemoteConfig;
window.buildPorts         = buildPorts;
window.buildCatTabs       = buildCatTabs;
window.switchCat          = switchCat;
window.buildBankInfo      = buildBankInfo;
window.buildPackages      = buildPackages;
window.applyLoginBranding = applyLoginBranding;
