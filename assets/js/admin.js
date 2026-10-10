/* ============================================================
   ADMIN.JS — QUẢN TRỊ + UPLOAD ẢNH BASE64 + CẤU HÌNH FULL
   ============================================================ */

async function openAdmin() {
  var s = getSession(); if (!s) { alert('Chưa đăng nhập'); return; }
  var u = s.user;
  var isAdmin = (s.email === ADMIN_EMAIL) || (u && u.is_admin == 1);
  if (!isAdmin) { alert('Không có quyền!'); return; }
  ['adminPendingView','adminUsersView','adminToolsView','adminKeysView','adminHistoryView'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">⏳ Đang tải...</p>';
  });
  openModal('adminPanel');
  renderAdminPending();
  renderAdminUsers();
  renderAdminTools();
  renderAdminKeys();
  renderAdminHistory();
}

function switchAdminTab(t) {
  document.querySelectorAll('.admin-tab').forEach(function(x) { x.classList.toggle('active', x.dataset.atab === t); });
  var map = { pending: 'adminPendingView', users: 'adminUsersView', tools: 'adminToolsView', keys: 'adminKeysView', history: 'adminHistoryView' };
  Object.values(map).forEach(function(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
  var target = document.getElementById(map[t]); if (target) target.style.display = '';
}

/* ============ NÉN ẢNH ============ */
function fileToBase64(file, maxSize, quality) {
  maxSize = maxSize || 800;
  quality = quality || 0.8;
  return new Promise(function(resolve) {
    if (!file) return resolve('');
    if (file.type.indexOf('image/') !== 0) return resolve('');
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var result = canvas.toDataURL('image/jpeg', quality);
        if (result.length > 1024 * 1024) result = canvas.toDataURL('image/jpeg', 0.6);
        resolve(result);
      };
      img.onerror = function() { resolve(''); };
      img.src = e.target.result;
    };
    reader.onerror = function() { resolve(''); };
    reader.readAsDataURL(file);
  });
}

/* ============ DUYỆT TIỀN ============ */
function renderAdminPending() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminPendingView'); if (!el) return;
  api('deposit_pending', { email: s.email, password: s.password }).then(function(res) {
    var deps = (res && res.success) ? (res.deposits || []) : [];
    if (!deps.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:30px">Không có yêu cầu nào</p>'; var b = document.getElementById('pendBadge'); if (b) b.style.display = 'none'; return; }
    var html = '<p style="text-align:center;font-size:12px;color:#8b93a7;margin-bottom:8px">Có <b style="color:#ff3d71">' + deps.length + '</b> yêu cầu</p>';
    deps.forEach(function(d) {
      var time = new Date(Number(d.created_at)).toLocaleString('vi-VN');
      html += '<div class="adm-row"><div><b>' + esc(d.email) + '</b></div><div style="font-size:16px;color:#ff3d71;font-weight:800;margin:4px 0">' + fmt(d.amount) + '</div><div class="info">IP: <code>' + esc(d.ip||'—') + '</code></div><div class="info">Note: ' + esc(d.note||'—') + '</div><div style="font-size:11px;color:#5a6175">' + time + '</div><div class="acts"><button class="b2" style="flex:1" onclick="approveDeposit(\'' + d.id + '\')">DUYỆT</button><button class="b5" style="flex:1" onclick="rejectDeposit(\'' + d.id + '\')">TỪ CHỐI</button></div></div>';
    });
    el.innerHTML = html;
    var badge = document.getElementById('pendBadge'); if (badge) { badge.textContent = deps.length; badge.style.display = 'inline-block'; }
  });
}

function approveDeposit(id) {
  if (!confirm('Xác nhận đã nhận tiền?')) return;
  var s = getSession();
  api('deposit_approve', { email: s.email, password: s.password, id: id }).then(function(res) {
    if (res && res.success) { alert('Đã duyệt! Số dư mới: ' + fmt(res.new_balance)); renderAdminPending(); renderAdminUsers(); }
    else alert((res && res.error) || 'Lỗi');
  });
}

function rejectDeposit(id) {
  var reason = prompt('Lý do:', 'Không hợp lệ'); if (reason === null) return;
  var s = getSession();
  api('deposit_reject', { email: s.email, password: s.password, id: id, reason: reason }).then(function(res) {
    if (res && res.success) { alert('Đã từ chối'); renderAdminPending(); }
  });
}

/* ============ USERS ============ */
function renderAdminUsers() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminUsersView'); if (!el) return;
  api('user_list', { email: s.email, password: s.password }).then(function(res) {
    var list = (res && res.success) ? (res.users || []) : [];
    if (!list.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8">Không có</p>'; return; }
    var html = '<p style="text-align:center;font-size:12px;color:#8b93a7;margin-bottom:8px">Tổng: <b>' + list.length + '</b></p>';
    list.forEach(function(u) {
      var exp = (u.key_expiry && Number(u.key_expiry) > 0) ? new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN') : '—';
      var isAdm = (u.is_admin == 1), balance = Number(u.balance) || 0;
      html += '<div class="adm-row"><div class="r1"><b>' + esc(u.name || 'User') + '</b><span class="badge ' + (isAdm?'badge-admin':'badge-vip') + '">' + (isAdm?'ADMIN':'USER') + '</span></div><div class="info">Email: ' + esc(u.email) + '</div><div class="info">IP: <code>' + esc(u.ip||'—') + '</code></div><div class="info">Số dư: <b style="color:#22c55e">' + fmt(balance) + '</b></div><div class="info">VIP: ' + exp + '</div><div class="acts"><button class="b3" onclick="adminResetIP(\'' + esc(u.email) + '\')">Reset IP</button><button class="b4" onclick="adminAdjustBalance(\'' + esc(u.email) + '\',' + balance + ')">Cấp tiền</button>' + (!isAdm ? '<button class="b5" onclick="adminDeleteUser(\'' + esc(u.email) + '\')">Xoá</button>' : '') + '</div></div>';
    });
    el.innerHTML = html;
  });
}

function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?')) return;
  var s = getSession();
  api('user_reset_ip', { email: s.email, password: s.password, target_email: email }).then(function(res) { if (res && res.success) { alert('Đã reset'); renderAdminUsers(); } });
}

function adminAdjustBalance(email, currentBal) {
  var input = prompt('Cấp bao nhiêu (âm để trừ):', '10000'); if (input === null) return;
  var delta = Number(input); if (isNaN(delta) || delta === 0) return alert('Số không hợp lệ');
  var s = getSession();
  api('admin_set_balance', { email: s.email, password: s.password, target_email: email, amount: delta }).then(function(res) {
    if (res && res.success) { alert('Đã cấp! Số dư mới: ' + fmt(res.new_balance)); renderAdminUsers(); }
  });
}

function adminDeleteUser(email) {
  if (!confirm('XOÁ ' + email + '?')) return;
  var s = getSession();
  api('user_delete', { email: s.email, password: s.password, target_email: email }).then(function(res) { if (res && res.success) { alert('Đã xoá'); renderAdminUsers(); } });
}

/* ============ TOOLS + CẤU HÌNH FULL ============ */
function renderAdminTools() {
  var el = document.getElementById('adminToolsView'); if (!el) return;
  var cfg = window.CONFIG || {};
  var bank = cfg.bank || {};
  var logo = cfg.logo || '';
  var avatar = cfg.avatar || '';
  var bg = cfg.background || '';
  var banner = cfg.banner || '';

  var html = '';

  /* ===== 1. THÔNG TIN WEBSITE ===== */
  html += '<div class="adm-section" style="border-color:#60a5fa">';
  html += '<h4>🌐 THÔNG TIN WEBSITE</h4>';
  html += '<label style="font-size:11px;font-weight:700">Tên Site</label><input class="adm-input" id="cfgSiteName" value="' + esc(cfg.site_name||'') + '" placeholder="TOOL MINHIOS">';
  html += '<label style="font-size:11px;font-weight:700">Mô tả / Slogan</label><input class="adm-input" id="cfgSiteDesc" value="' + esc(cfg.site_desc||'') + '" placeholder="Tool hỗ trợ miễn phí">';
  html += '<label style="font-size:11px;font-weight:700">Tiêu đề tab (title)</label><input class="adm-input" id="cfgPageTitle" value="' + esc(cfg.page_title||'') + '" placeholder="TOOL MINHIOS">';
  html += '<label style="font-size:11px;font-weight:700">Từ khoá SEO (keywords)</label><input class="adm-input" id="cfgKeywords" value="' + esc(cfg.keywords||'') + '" placeholder="tool, free, vip">';
  html += '<label style="font-size:11px;font-weight:700">Chữ chạy (marquee)</label><input class="adm-input" id="cfgMarquee" value="' + esc(cfg.marquee||'') + '" placeholder="🔥 Chào mừng bạn đến với tool!">';
  html += '<label style="font-size:11px;font-weight:700">🎵 URL nhạc nền</label><input class="adm-input" id="cfgMusicUrl" value="' + esc(cfg.music_url||'') + '" placeholder="https://.../music.mp3">';
  html += '</div>';

  /* ===== 2. NỘI DUNG HIỂN THỊ ===== */
  html += '<div class="adm-section" style="border-color:#a78bfa">';
  html += '<h4>📝 NỘI DUNG HIỂN THỊ</h4>';
  html += '<label style="font-size:11px;font-weight:700">Tiêu đề trang đăng nhập</label><input class="adm-input" id="cfgLoginTitle" value="' + esc(cfg.login_title||'') + '" placeholder="ĐĂNG NHẬP">';
  html += '<label style="font-size:11px;font-weight:700">Nội dung chào mừng (home)</label><textarea class="adm-input" id="cfgHomeWelcome" rows="2" style="resize:vertical" placeholder="Chào mừng bạn đến với tool!">' + esc(cfg.home_welcome||'') + '</textarea>';
  html += '<label style="font-size:11px;font-weight:700">Thông báo (hiện popup/đầu trang)</label><textarea class="adm-input" id="cfgAnnounce" rows="2" style="resize:vertical" placeholder="Nhập thông báo...">' + esc(cfg.announce||'') + '</textarea>';
  html += '<label style="font-size:11px;font-weight:700">Footer (chân trang)</label><input class="adm-input" id="cfgFooter" value="' + esc(cfg.footer||'') + '" placeholder="© 2025 TOOL MINHIOS">';
  html += '<label style="font-size:11px;font-weight:700">📞 Liên hệ (SĐT/Zalo/Tele)</label><input class="adm-input" id="cfgContact" value="' + esc(cfg.contact||'') + '" placeholder="Zalo: 0123456789">';
  html += '<label style="font-size:11px;font-weight:700">📘 Facebook/Group</label><input class="adm-input" id="cfgFacebook" value="' + esc(cfg.facebook||'') + '" placeholder="https://facebook.com/...">';
  html += '<label style="font-size:11px;font-weight:700">💬 Telegram</label><input class="adm-input" id="cfgTelegram" value="' + esc(cfg.telegram||'') + '" placeholder="https://t.me/...">';
  html += '<label style="font-size:11px;font-weight:700">📺 YouTube</label><input class="adm-input" id="cfgYoutube" value="' + esc(cfg.youtube||'') + '" placeholder="https://youtube.com/...">';
  html += '<label style="font-size:11px;font-weight:700">📱 TikTok</label><input class="adm-input" id="cfgTiktok" value="' + esc(cfg.tiktok||'') + '" placeholder="https://tiktok.com/@...">';
  html += '</div>';

  /* ===== 3. LOGO ===== */
  html += '<div class="adm-section" style="border-color:#22c55e">';
  html += '<h4>🖼️ LOGO WEBSITE</h4>';
  html += '<input type="file" id="cfgLogoFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  if (logo) html += '<div style="text-align:center;margin-top:8px;background:#0a0b0f;border-radius:10px;padding:10px"><img src="' + logo + '" style="max-width:100px;max-height:100px;border-radius:8px"><br><button class="b5" style="margin-top:6px;font-size:11px" onclick="clearCfgImage(\'logo\')">Xoá logo</button></div>';
  html += '</div>';

  /* ===== 4. AVATAR ===== */
  html += '<div class="adm-section" style="border-color:#22c55e">';
  html += '<h4>👤 AVATAR MẶC ĐỊNH</h4>';
  html += '<input type="file" id="cfgAvatarFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  if (avatar) html += '<div style="text-align:center;margin-top:8px;background:#0a0b0f;border-radius:10px;padding:10px"><img src="' + avatar + '" style="max-width:100px;max-height:100px;border-radius:50%"><br><button class="b5" style="margin-top:6px;font-size:11px" onclick="clearCfgImage(\'avatar\')">Xoá avatar</button></div>';
  html += '</div>';

  /* ===== 5. BANNER ===== */
  html += '<div class="adm-section" style="border-color:#f59e0b">';
  html += '<h4>🎨 ẢNH BANNER</h4>';
  html += '<input type="file" id="cfgBannerFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  if (banner) html += '<div style="text-align:center;margin-top:8px;background:#0a0b0f;border-radius:10px;padding:10px"><img src="' + banner + '" style="max-width:100%;max-height:120px;border-radius:8px"><br><button class="b5" style="margin-top:6px;font-size:11px" onclick="clearCfgImage(\'banner\')">Xoá banner</button></div>';
  html += '</div>';

  /* ===== 6. BACKGROUND ===== */
  html += '<div class="adm-section" style="border-color:#f59e0b">';
  html += '<h4>🌈 ẢNH NỀN</h4>';
  html += '<input type="file" id="cfgBgFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  if (bg) html += '<div style="text-align:center;margin-top:8px;background:#0a0b0f;border-radius:10px;padding:10px"><img src="' + bg + '" style="max-width:100%;max-height:120px;border-radius:8px"><br><button class="b5" style="margin-top:6px;font-size:11px" onclick="clearCfgImage(\'background\')">Xoá nền</button></div>';
  html += '</div>';

  /* ===== 7. BANK + QR ===== */
  html += '<div class="adm-section" style="border-color:#3b82f6">';
  html += '<h4>🏦 BANK + QR NẠP TIỀN</h4>';
  html += '<label style="font-size:11px;font-weight:700">Tên NH</label><input class="adm-input" id="cfgBankName" value="' + esc(bank.name||'') + '" placeholder="MB Bank">';
  html += '<label style="font-size:11px;font-weight:700">STK</label><input class="adm-input" id="cfgBankAcc" value="' + esc(bank.account||'') + '" placeholder="0123456789">';
  html += '<label style="font-size:11px;font-weight:700">Chủ TK</label><input class="adm-input" id="cfgBankOwner" value="' + esc(bank.owner||'') + '" placeholder="NGUYEN VAN A">';
  html += '<label style="font-size:11px;font-weight:700">Nội dung CK mẫu</label><input class="adm-input" id="cfgBankNote" value="' + esc(bank.note||'') + '" placeholder="NAP [email]">';
  html += '<label style="font-size:11px;font-weight:700">Ảnh QR</label><input type="file" id="cfgQRFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  if (bank.qr) html += '<div style="text-align:center;margin-top:8px;background:#0a0b0f;border-radius:10px;padding:10px"><img src="' + bank.qr + '" style="max-width:140px;border-radius:8px"><br><button class="b5" style="margin-top:6px;font-size:11px" onclick="clearCfgImage(\'qr\')">Xoá QR</button></div>';
  html += '</div>';

  /* ===== 8. TUỲ CHỈNH NÂNG CAO ===== */
  html += '<div class="adm-section" style="border-color:#ef4444">';
  html += '<h4>⚡ TUỲ CHỈNH NÂNG CAO</h4>';
  html += '<label style="font-size:11px;font-weight:700">Màu chủ đạo (hex)</label><input class="adm-input" id="cfgPrimaryColor" value="' + esc(cfg.primary_color||'#3b82f6') + '" placeholder="#3b82f6">';
  html += '<label style="font-size:11px;font-weight:700">Màu nền (hex)</label><input class="adm-input" id="cfgBgColor" value="' + esc(cfg.bg_color||'#0a0b0f') + '" placeholder="#0a0b0f">';
  html += '<label style="font-size:11px;font-weight:700">Thông báo bảo trì (để trống = tắt)</label><textarea class="adm-input" id="cfgMaintenance" rows="2" style="resize:vertical" placeholder="Tool đang bảo trì...">' + esc(cfg.maintenance||'') + '</textarea>';
  html += '<label style="font-size:11px;font-weight:700">Số dư tối thiểu nạp</label><input class="adm-input" id="cfgMinDeposit" type="number" value="' + (cfg.min_deposit||10000) + '">';
  html += '<label style="font-size:11px;font-weight:700">Tỉ lệ quy đổi (VNĐ → điểm)</label><input class="adm-input" id="cfgRate" type="number" value="' + (cfg.rate||1) + '" placeholder="1">';
  html += '</div>';

  /* ===== NÚT LƯU ===== */
  html += '<button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);margin-top:12px;font-size:14px;padding:14px" onclick="saveSiteConfig()">💾 LƯU TẤT CẢ CẤU HÌNH</button>';
  html += '<button class="adm-btn" style="background:linear-gradient(135deg,#ef4444,#b91c1c);margin-top:8px;font-size:12px" onclick="resetSiteConfig()">🔄 RESET CẤU HÌNH</button>';

  el.innerHTML = html;
}

/* Xoá ảnh trong config */
function clearCfgImage(key) {
  if (!confirm('Xoá ảnh này?')) return;
  if (key === 'qr') { if (window.CONFIG.bank) window.CONFIG.bank.qr = ''; }
  else window.CONFIG[key] = '';
  saveSiteConfig();
}

/* Reset toàn bộ config */
function resetSiteConfig() {
  if (!confirm('RESET toàn bộ cấu hình về mặc định?')) return;
  if (!confirm('Chắc chắn? Hành động không thể hoàn tác!')) return;
  window.CONFIG = {
    site_name: 'TOOL MINHIOS',
    site_desc: '',
    page_title: 'TOOL MINHIOS',
    keywords: '',
    marquee: '',
    music_url: '',
    login_title: 'ĐĂNG NHẬP',
    home_welcome: '',
    announce: '',
    footer: '',
    contact: '',
    facebook: '',
    telegram: '',
    youtube: '',
    tiktok: '',
    logo: '',
    avatar: '',
    banner: '',
    background: '',
    bank: { name: '', account: '', owner: '', note: '', qr: '' },
    primary_color: '#3b82f6',
    bg_color: '#0a0b0f',
    maintenance: '',
    min_deposit: 10000,
    rate: 1
  };
  var s = getSession();
  api('config_save', { email: s.email, password: s.password, config: window.CONFIG }).then(function(res) {
    if (res && res.success) { alert('✅ ĐÃ RESET!'); location.reload(); }
  });
}

/* ============ LƯU CẤU HÌNH ============ */
function saveSiteConfig() {
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function num(id, def) { var v = Number(val(id)); return isNaN(v) ? def : v; }

  /* Thông tin website */
  window.CONFIG.site_name = val('cfgSiteName') || 'TOOL MINHIOS';
  window.CONFIG.site_desc = val('cfgSiteDesc');
  window.CONFIG.page_title = val('cfgPageTitle') || window.CONFIG.site_name;
  window.CONFIG.keywords = val('cfgKeywords');
  window.CONFIG.marquee = val('cfgMarquee');
  window.CONFIG.music_url = val('cfgMusicUrl');

  /* Nội dung */
  window.CONFIG.login_title = val('cfgLoginTitle') || 'ĐĂNG NHẬP';
  window.CONFIG.home_welcome = val('cfgHomeWelcome');
  window.CONFIG.announce = val('cfgAnnounce');
  window.CONFIG.footer = val('cfgFooter');
  window.CONFIG.contact = val('cfgContact');
  window.CONFIG.facebook = val('cfgFacebook');
  window.CONFIG.telegram = val('cfgTelegram');
  window.CONFIG.youtube = val('cfgYoutube');
  window.CONFIG.tiktok = val('cfgTiktok');

  /* Bank */
  window.CONFIG.bank = window.CONFIG.bank || {};
  window.CONFIG.bank.name = val('cfgBankName');
  window.CONFIG.bank.account = val('cfgBankAcc');
  window.CONFIG.bank.owner = val('cfgBankOwner');
  window.CONFIG.bank.note = val('cfgBankNote');

  /* Nâng cao */
  window.CONFIG.primary_color = val('cfgPrimaryColor') || '#3b82f6';
  window.CONFIG.bg_color = val('cfgBgColor') || '#0a0b0f';
  window.CONFIG.maintenance = val('cfgMaintenance');
  window.CONFIG.min_deposit = num('cfgMinDeposit', 10000);
  window.CONFIG.rate = num('cfgRate', 1);

  /* Ảnh */
  var logoFile = document.getElementById('cfgLogoFile') ? document.getElementById('cfgLogoFile').files[0] : null;
  var avatarFile = document.getElementById('cfgAvatarFile') ? document.getElementById('cfgAvatarFile').files[0] : null;
  var qrFile = document.getElementById('cfgQRFile') ? document.getElementById('cfgQRFile').files[0] : null;
  var bannerFile = document.getElementById('cfgBannerFile') ? document.getElementById('cfgBannerFile').files[0] : null;
  var bgFile = document.getElementById('cfgBgFile') ? document.getElementById('cfgBgFile').files[0] : null;

  var chain = Promise.resolve();
  if (logoFile) chain = chain.then(function() { return fileToBase64(logoFile, 400, 0.88).then(function(b64) { if (b64) window.CONFIG.logo = b64; }); });
  if (avatarFile) chain = chain.then(function() { return fileToBase64(avatarFile, 400, 0.88).then(function(b64) { if (b64) window.CONFIG.avatar = b64; }); });
  if (qrFile) chain = chain.then(function() { return fileToBase64(qrFile, 600, 0.88).then(function(b64) { if (b64) window.CONFIG.bank.qr = b64; }); });
  if (bannerFile) chain = chain.then(function() { return fileToBase64(bannerFile, 1200, 0.85).then(function(b64) { if (b64) window.CONFIG.banner = b64; }); });
  if (bgFile) chain = chain.then(function() { return fileToBase64(bgFile, 1200, 0.85).then(function(b64) { if (b64) window.CONFIG.background = b64; }); });

  chain.then(function() {
    var s = getSession();
    if (document.getElementById('cfgLogoFile')) document.getElementById('cfgLogoFile').value = '';
    if (document.getElementById('cfgAvatarFile')) document.getElementById('cfgAvatarFile').value = '';
    if (document.getElementById('cfgQRFile')) document.getElementById('cfgQRFile').value = '';
    if (document.getElementById('cfgBannerFile')) document.getElementById('cfgBannerFile').value = '';
    if (document.getElementById('cfgBgFile')) document.getElementById('cfgBgFile').value = '';

    api('config_save', { email: s.email, password: s.password, config: window.CONFIG }).then(function(res) {
      if (res && res.success) {
        alert('✅ ĐÃ LƯU CẤU HÌNH!');
        if (typeof applyLoginBranding === 'function') applyLoginBranding();
        if (typeof buildBankInfo === 'function') buildBankInfo();
        if (typeof applySiteConfig === 'function') applySiteConfig();
        else if (typeof applyConfig === 'function') applyConfig();
        renderAdminTools();
      } else alert('❌ ' + ((res && res.error) || 'Lỗi'));
    });
  });
}

/* ============ KEYS ============ */
function renderAdminKeys() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminKeysView'); if (!el) return;
  api('key_list', { email: s.email, password: s.password }).then(function(res) {
    var keys = (res && res.success) ? (res.keys || []) : [];
    var html = '<div class="adm-section"><h4>🔑 TẠO KEY</h4><input class="adm-input" id="keyDays" type="number" value="30" placeholder="Số ngày"><input class="adm-input" id="keyQty" type="number" value="1" placeholder="Số lượng"><button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a)" onclick="adminGenKeys()">TẠO KEY</button></div>';
    keys.forEach(function(k) {
      var used = (k.used == 1);
      html += '<div class="adm-row" style="border-left:3px solid ' + (used?'#ef4444':'#22c55e') + '"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-family:monospace;color:#ff6b9d;font-size:13px;word-break:break-all">' + esc(k.code) + '</b><span style="font-size:11px;color:' + (used?'#ef4444':'#22c55e') + '">' + (used?'ĐÃ DÙNG':'CHƯA') + '</span></div><div class="info">' + k.days + ' ngày</div><div class="acts"><button class="b5" onclick="adminDelKey(\'' + esc(k.code) + '\')">Xoá</button></div></div>';
    });
    el.innerHTML = html;
  });
}

function adminGenKeys() {
  var days = parseInt(document.getElementById('keyDays').value) || 30;
  var qty = Math.min(100, Math.max(1, parseInt(document.getElementById('keyQty').value) || 1));
  if (!confirm('Tạo ' + qty + ' key loại ' + days + ' ngày?')) return;
  var s = getSession();
  api('key_create', { email: s.email, password: s.password, days: days, qty: qty }).then(function(res) {
    if (res && res.success) { alert('Đã tạo ' + (res.keys||[]).length + ' key:\n\n' + (res.keys||[]).join('\n')); renderAdminKeys(); }
  });
}

function adminDelKey(code) {
  if (!confirm('Xoá key ' + code + '?')) return;
  var s = getSession();
  api('key_delete', { email: s.email, password: s.password, code: code }).then(function(res) { if (res && res.success) { alert('Đã xoá'); renderAdminKeys(); } });
}

/* ============ HISTORY ============ */
function renderAdminHistory() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminHistoryView'); if (!el) return;
  api('history', { email: s.email, password: s.password }).then(function(res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    if (!hist.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8">Chưa có</p>'; return; }
    var html = '';
    hist.slice(0, 100).forEach(function(h) {
      var amt = Number(h.amount) || 0, color = amt > 0 ? '#22c55e' : (amt < 0 ? '#ef4444' : '#3b82f6'), sign = amt > 0 ? '+' : '';
      html += '<div class="adm-row" style="border-left:3px solid ' + color + '"><div><b>' + esc((h.type||'').toUpperCase()) + '</b></div>' + (amt ? '<div style="font-size:12px">Số tiền: <b style="color:' + color + '">' + sign + fmt(amt) + '</b></div>' : '') + '</div>';
    });
    el.innerHTML = html;
  });
}

/* ============ EXPORT ============ */
window.openAdmin = openAdmin;
window.switchAdminTab = switchAdminTab;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.adminResetIP = adminResetIP;
window.adminAdjustBalance = adminAdjustBalance;
window.adminDeleteUser = adminDeleteUser;
window.adminGenKeys = adminGenKeys;
window.adminDelKey = adminDelKey;
window.saveSiteConfig = saveSiteConfig;
window.resetSiteConfig = resetSiteConfig;
window.clearCfgImage = clearCfgImage;
window.fileToBase64 = fileToBase64;
window.renderAdminPending = renderAdminPending;
window.renderAdminUsers = renderAdminUsers;
window.renderAdminTools = renderAdminTools;
window.renderAdminKeys = renderAdminKeys;
window.renderAdminHistory = renderAdminHistory;
