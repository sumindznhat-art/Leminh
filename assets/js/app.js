var _currentCat = 'all';

document.addEventListener('DOMContentLoaded', function() {
  loadRemoteConfig().then(function() {
    var s = getSession();
    if (s && s.user) enterApp();
    else { applyLoginBranding(); var ls = document.getElementById('login-screen'); if (ls) ls.style.display = ''; }
    ['loginEmail','loginPass'].forEach(function(id) { var el = document.getElementById(id); if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') doLogin(); }); });
    ['regName','regEmail','regPass','regPass2'].forEach(function(id) { var el = document.getElementById(id); if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') doRegister(); }); });
    startClock();
  });
});

function loadRemoteConfig() {
  return api('config_get').then(function(res) {
    if (res && res.success && res.config) {
      var remote = res.config;
      ['site_name','site_desc','marquee','footer','logo','avatar','music_url'].forEach(function(k) { if (remote[k]) window.CONFIG[k] = remote[k]; });
      if (remote.bank) window.CONFIG.bank = Object.assign({}, window.CONFIG.bank, remote.bank);
      if (Array.isArray(remote.ports) && remote.ports.length) window.CONFIG.ports = remote.ports;
    }
  }).catch(function(){});
}

function saveRemoteConfig() { var s = getSession(); if (!s) return Promise.resolve({ success: false }); return api('config_save', { email: s.email, password: s.password, config: window.CONFIG }); }

function applyLoginBranding() {
  var t = document.getElementById('loginSiteName'); if (t && window.CONFIG.site_name) t.textContent = window.CONFIG.site_name;
  var s = document.getElementById('subText'); if (s && window.CONFIG.site_desc) s.textContent = window.CONFIG.site_desc;
  var m = document.getElementById('marqueeText'); if (m && window.CONFIG.marquee) m.textContent = window.CONFIG.marquee;
  if (window.CONFIG.logo) { var lg = document.getElementById('loginAvatarImg'); if (lg) lg.src = window.CONFIG.logo; }
}

function enterApp() {
  var ls = document.getElementById('login-screen'); if (ls) ls.style.display = 'none';
  var app = document.getElementById('app'); if (app) app.style.display = 'flex';
  var s = getSession(); if (!s) { doLogout(); return; }
  var u = s.user;
  apiGetUser().then(function(res) {
    if (res && res.success && res.user) u = res.user;
    if (!u) { doLogout(); return; }
    var isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);
    var float = document.getElementById('adminFloat'), diAdm = document.getElementById('diAdmin');
    if (float) float.style.display = isAdmin ? 'flex' : 'none';
    if (diAdm) diAdm.style.display = isAdmin ? '' : 'none';
    var av = u.avatar || getAvatarFromStorage() || window.CONFIG.avatar || DEFAULT_AVATAR;
    applyAvatarEverywhere(av);
    var hn = document.getElementById('hdrName'); if (hn) hn.textContent = u.name || 'User';
    var hc = document.getElementById('hdrCoin'); if (hc) hc.textContent = fmt(u.balance || 0);
    var dn = document.getElementById('drawerName'); if (dn) dn.textContent = u.name || 'User';
    var de = document.getElementById('drawerEmail'); if (de) de.textContent = u.email;
    if (isAdmin) {
      api('deposit_pending', { email: s.email, password: s.password }).then(function(r) {
        var cnt = r && r.success ? (r.deposits || []).length : 0;
        var b = document.getElementById('pendBadge');
        if (b) { b.textContent = cnt; b.style.display = cnt ? 'inline-block' : 'none'; }
      });
    }
    applyLoginBranding();
    buildBankInfo();
    buildPackages();
    buildCatTabs();
    buildPorts();
    renderAll();
    showPage('home');
  });
}

function showPage(p) {
  document.querySelectorAll('.page').forEach(function(x) { x.classList.remove('active'); });
  var el = document.getElementById('page-' + p); if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.toggle('active', b.dataset.page === p); });
  var c = document.getElementById('appContent'); if (c) c.scrollTop = 0;
  if (p === 'deposit' || p === 'vip' || p === 'profile') renderAll();
}

function startClock() { setInterval(function() { var d = new Date(); var a = document.getElementById('liveClock'); if (a) a.textContent = d.toLocaleTimeString('vi-VN', { hour12: false }); }, 1000); }

function renderAll() {
  var s = getSession(); if (!s || !s.user) return;
  var u = s.user;
  var bal = fmt(u.balance || 0);
  ['hdrCoin','curBalance','depBalance','vipBalance','profBalance'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = bal; });
  var pn = document.getElementById('profName'); if (pn) pn.textContent = u.name || 'User';
  var pr = document.getElementById('profRole'); if (pr) pr.textContent = (u.is_admin == 1 || u.email === ADMIN_EMAIL) ? 'ADMIN' : 'THÀNH VIÊN';
  var pj = document.getElementById('profJoined'); if (pj) pj.textContent = u.created_at ? new Date(Number(u.created_at)).toLocaleDateString('vi-VN') : '—';
  var pl = document.getElementById('profLastLogin'); if (pl) pl.textContent = u.last_login ? new Date(Number(u.last_login)).toLocaleString('vi-VN') : '—';
  var pi = document.getElementById('profIP'); if (pi) pi.textContent = u.ip || '—';
  var hasVip = Number(u.key_expiry) > Date.now();
  var ve = document.getElementById('vipExpiry'); if (ve) ve.textContent = hasVip ? new Date(Number(u.key_expiry)).toLocaleString('vi-VN') : 'Chưa kích hoạt';
  var ds = document.getElementById('depStatus'); if (ds) ds.textContent = hasVip ? 'VIP đến ' + new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN') : 'Chưa có key';
}

function buildBankInfo() {
  var el = document.getElementById('bankInfo'); if (!el) return;
  var b = window.CONFIG.bank || {};
  el.innerHTML = '<div class="sec-title">THÔNG TIN CHUYỂN KHOẢN</div><div class="action-card" style="cursor:default"><div class="ac-icon"><i class="fa-solid fa-building-columns"></i></div><div class="ac-info"><div class="ac-name">' + esc(b.name || '—') + '</div><div class="ac-desc">STK: <b>' + esc(b.account || '—') + '</b> — ' + esc(b.owner || '—') + '</div></div></div>';
}

function buildPackages() {
  var el = document.getElementById('pkgList'); if (!el) return;
  var pkgs = window.CONFIG.packages || [];
  el.innerHTML = pkgs.map(function(p) { return '<div class="action-card" onclick="buyPackage(\'' + p.id + '\')"><div class="ac-icon" style="background:linear-gradient(135deg,#fbbf24,#f59e0b)"><i class="fa-solid fa-crown"></i></div><div class="ac-info"><div class="ac-name">' + esc(p.name) + '</div><div class="ac-desc">' + p.days + ' ngày • <b>' + fmt(p.price) + '</b></div></div><i class="fa-solid fa-chevron-right ac-arrow"></i></div>'; }).join('');
}

function buyPackage(id) {
  var pkg = (window.CONFIG.packages || []).filter(function(x) { return x.id === id; })[0];
  if (!pkg) return;
  var s = getSession(); if (!s) return;
  var u = s.user;
  if ((u.balance || 0) < pkg.price) { alert('Số dư không đủ!'); showPage('deposit'); return; }
  if (!confirm('Mua ' + pkg.name + ' giá ' + fmt(pkg.price) + '?')) return;
  apiBuyPackage(pkg.days, pkg.price).then(function(res) { if (res && res.success) { alert('Mua thành công!'); apiGetUser().then(function() { renderAll(); }); } else alert((res && res.error) || 'Lỗi'); });
}

function buildCatTabs() {
  var els = [document.getElementById('catTabs'), document.getElementById('catTabs2')];
  var ports = window.CONFIG.ports || [];
  var tabs = [{ key: 'all', label: 'TẤT CẢ' }, { key: 'taixiu', label: 'TÀI XỈU' }, { key: 'sicbo', label: 'SICBO' }, { key: 'baccarat', label: 'BACCARAT' }];
  var html = tabs.map(function(t) { return '<button class="cat-tab ' + (t.key === _currentCat ? 'active' : '') + '" data-cat="' + t.key + '" onclick="switchCat(\'' + t.key + '\')">' + t.label + '</button>'; }).join('');
  els.forEach(function(el) { if (el) el.innerHTML = html; });
}

function switchCat(cat) { _currentCat = cat; document.querySelectorAll('.cat-tab').forEach(function(x) { x.classList.toggle('active', x.dataset.cat === cat); }); buildPorts(); }

function buildPorts() {
  var ports = window.CONFIG.ports || [];
  var list = ports.filter(function(p) { return p.enabled; });
  if (_currentCat !== 'all') list = list.filter(function(p) { return p.cat === _currentCat; });
  list.sort(function(a, b) { return (a.sort || 0) - (b.sort || 0); });
  var html = '';
  if (!list.length) html = '<p style="text-align:center;color:#94a3b8;padding:40px 20px">Không có tool</p>';
  else {
    var groups = {};
    list.forEach(function(t) { var c = t.cat || 'other'; if (!groups[c]) groups[c] = []; groups[c].push(t); });
    var catNames = { taixiu: 'TOOL TÀI XỈU', sicbo: 'TOOL SICBO', baccarat: 'TOOL BACCARAT', other: 'TOOL KHÁC' };
    Object.keys(groups).forEach(function(c) {
      html += '<div class="sec-head">' + (catNames[c] || c) + '</div><div class="tool-grid">';
      groups[c].forEach(function(t) { html += renderToolItem(t); });
      html += '</div>';
    });
  }
  ['toolList','toolList2'].forEach(function(id) { var el = document.getElementById(id); if (el) el.innerHTML = html; });
}

function renderToolItem(t) {
  var img = getToolImage(t), badges = '';
  if (t.hot == 1) badges += '<span class="tool-badge hot">HOT</span>';
  if (t.is_new == 1) badges += '<span class="tool-badge new">NEW</span>';
  if (t.vip == 1) badges += '<span class="tool-badge vip">VIP</span>';
  if (t.maintenance == 1) badges += '<span class="tool-badge maintenance">BT</span>';
  var thumb = img ? '<img src="' + img + '" alt="' + esc(t.name) + '">' : '<i class="fa-solid fa-cube" style="color:#ff3d71;font-size:40px"></i>';
  return '<div class="tool-item ' + (t.maintenance ? 'disabled' : '') + '" onclick="openTool(\'' + t.slug + '\')">' + badges + '<div class="tool-thumb">' + thumb + '</div><div class="tool-name">' + esc(t.name) + '</div></div>';
}

function openDepositModal() { var a = document.getElementById('depAmount'); if (a) a.value = ''; var n = document.getElementById('depNote'); if (n) n.value = ''; openModal('depositModal'); }

function openHistoryDeposit() {
  var s = getSession(); if (!s) return;
  api('history', { email: s.email, password: s.password }).then(function(res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    var deps = hist.filter(function(h) { return h.type === 'deposit' || h.type === 'auto-buy'; });
    var html = deps.length ? '' : '<p style="text-align:center;color:#94a3b8">Chưa có</p>';
    deps.forEach(function(d) { var amt = Number(d.amount) || 0, color = amt > 0 ? '#22c55e' : '#ef4444', sign = amt > 0 ? '+' : ''; html += '<div style="border-left:3px solid ' + color + ';padding:8px;margin-bottom:6px;background:#0a0b0f;border-radius:6px"><div style="font-weight:700;color:' + color + '">' + sign + fmt(amt) + '</div><div style="font-size:12px;color:#8b93a7">' + esc(d.note || '') + '</div></div>'; });
    document.getElementById('histTitle').textContent = 'LỊCH SỬ NẠP';
    document.getElementById('histContent').innerHTML = html;
    openModal('historyModal');
  });
}

function openHistoryKey() {
  var s = getSession(); if (!s) return;
  api('history', { email: s.email, password: s.password }).then(function(res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    var keys = hist.filter(function(h) { return h.type === 'key' || h.type === 'buy'; });
    var html = keys.length ? '' : '<p style="text-align:center;color:#94a3b8">Chưa có</p>';
    keys.forEach(function(h) { html += '<div style="border-left:3px solid #8b5cf6;padding:8px;margin-bottom:6px;background:#0a0b0f;border-radius:6px"><div style="font-weight:700">' + esc(h.note || h.type) + '</div></div>'; });
    document.getElementById('histTitle').textContent = 'LỊCH SỬ KEY';
    document.getElementById('histContent').innerHTML = html;
    openModal('historyModal');
  });
}

function openModal(id) { var el = document.getElementById(id); if (el) el.classList.add('show'); }
function closeModal(id) { var el = document.getElementById(id); if (el) el.classList.remove('show'); }
function openKeyModal() { var ki = document.getElementById('keyInput'); if (ki) ki.value = ''; var ke = document.getElementById('keyErr'); if (ke) ke.textContent = ''; openModal('keyModal'); }
function openAvatarModal() { var inp = document.getElementById('avBase64Input'); if (inp) inp.value = ''; var st = document.getElementById('avStatus'); if (st) st.textContent = ''; openModal('avatarModal'); }
function saveAvatar() { var val = document.getElementById('avBase64Input').value.trim(); var status = document.getElementById('avStatus'); if (!val) { if (status) status.textContent = 'Chưa có'; return; } var src = val.indexOf('data:') === 0 ? val : 'data:image/png;base64,' + val; setAvatarToStorage(src); applyAvatarEverywhere(src); if (status) status.textContent = 'Đã lưu'; setTimeout(function() { closeModal('avatarModal'); }, 800); }
function resetAvatar() { setAvatarToStorage(''); applyAvatarEverywhere(window.CONFIG.avatar || DEFAULT_AVATAR); }

function openDrawer() { var d = document.getElementById('drawer'); if (d) d.classList.add('show'); var m = document.getElementById('drawerMask'); if (m) m.classList.add('show'); }
function closeDrawer() { var d = document.getElementById('drawer'); if (d) d.classList.remove('show'); var m = document.getElementById('drawerMask'); if (m) m.classList.remove('show'); }

window.enterApp = enterApp;
window.showPage = showPage;
window.renderAll = renderAll;
window.openDepositModal = openDepositModal;
window.openHistoryDeposit = openHistoryDeposit;
window.openHistoryKey = openHistoryKey;
window.openKeyModal = openKeyModal;
window.openAvatarModal = openAvatarModal;
window.saveAvatar = saveAvatar;
window.resetAvatar = resetAvatar;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.buyPackage = buyPackage;
window.openModal = openModal;
window.closeModal = closeModal;
window.loadRemoteConfig = loadRemoteConfig;
window.saveRemoteConfig = saveRemoteConfig;
window.buildPorts = buildPorts;
window.buildCatTabs = buildCatTabs;
window.switchCat = switchCat;
window.buildBankInfo = buildBankInfo;
window.buildPackages = buildPackages;
window.applyLoginBranding = applyLoginBranding;
