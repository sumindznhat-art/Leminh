/* ============================================================
   ADMIN.JS — QUẢN TRỊ WEBSITE FULL (LOGO / CONTENT / BRANDING)
   ============================================================ */

async function openAdmin() {
  var s = getSession(); if (!s) { alert('Chưa đăng nhập'); return; }
  var u = s.user;
  var isAdmin = (s.email === ADMIN_EMAIL) || (u && u.is_admin == 1);
  if (!isAdmin) { alert('Không có quyền!'); return; }

  ['adminPendingView','adminUsersView','adminToolsView','adminBrandView',
   'adminContentView','adminKeysView','adminHistoryView','adminSystemView'
  ].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">⏳ Đang tải...</p>';
  });

  openModal('adminPanel');
  renderAdminPending();
  renderAdminUsers();
  renderAdminBrand();
  renderAdminContent();
  renderAdminTools();
  renderAdminKeys();
  renderAdminHistory();
  renderAdminSystem();
}

function switchAdminTab(t) {
  document.querySelectorAll('.admin-tab').forEach(function(x) {
    x.classList.toggle('active', x.dataset.atab === t);
  });
  var map = {
    pending: 'adminPendingView',
    users:   'adminUsersView',
    brand:   'adminBrandView',
    content: 'adminContentView',
    tools:   'adminToolsView',
    keys:    'adminKeysView',
    history: 'adminHistoryView',
    system:  'adminSystemView'
  };
  Object.values(map).forEach(function(id) {
    var el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  var target = document.getElementById(map[t]); if (target) target.style.display = '';
}

/* ============ NÉN ẢNH BASE64 ============ */
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
        var ctx = canvas.getContext('2d');
        // Nền trong suốt cho PNG logo
        if (file.type === 'image/png') {
          ctx.clearRect(0, 0, w, h);
        } else {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        var isPng = file.type === 'image/png';
        var result = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
        if (result.length > 1024 * 1024) {
          result = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.6);
        }
        resolve(result);
      };
      img.onerror = function() { resolve(''); };
      img.src = e.target.result;
    };
    reader.onerror = function() { resolve(''); };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   TAB 1 — DUYỆT NẠP TIỀN
   ============================================================ */
function renderAdminPending() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminPendingView'); if (!el) return;
  api('deposit_pending', { email: s.email, password: s.password }).then(function(res) {
    var deps = (res && res.success) ? (res.deposits || []) : [];
    if (!deps.length) {
      el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:30px">Không có yêu cầu nào</p>';
      var b = document.getElementById('pendBadge'); if (b) b.style.display = 'none';
      return;
    }
    var html = '<p style="text-align:center;font-size:12px;color:#8b93a7;margin-bottom:8px">Có <b style="color:#ff3d71">' + deps.length + '</b> yêu cầu</p>';
    deps.forEach(function(d) {
      var time = new Date(Number(d.created_at)).toLocaleString('vi-VN');
      html += '<div class="adm-row">'
        + '<div><b>' + esc(d.email) + '</b></div>'
        + '<div style="font-size:16px;color:#ff3d71;font-weight:800;margin:4px 0">' + fmt(d.amount) + '</div>'
        + '<div class="info">IP: <code>' + esc(d.ip||'—') + '</code></div>'
        + '<div class="info">Note: ' + esc(d.note||'—') + '</div>'
        + '<div style="font-size:11px;color:#5a6175">' + time + '</div>'
        + '<div class="acts">'
        + '<button class="b2" style="flex:1" onclick="approveDeposit(\'' + d.id + '\')">DUYỆT</button>'
        + '<button class="b5" style="flex:1" onclick="rejectDeposit(\'' + d.id + '\')">TỪ CHỐI</button>'
        + '</div></div>';
    });
    el.innerHTML = html;
    var badge = document.getElementById('pendBadge');
    if (badge) { badge.textContent = deps.length; badge.style.display = 'inline-block'; }
  });
}

function approveDeposit(id) {
  if (!confirm('Xác nhận đã nhận tiền?')) return;
  var s = getSession();
  api('deposit_approve', { email: s.email, password: s.password, id: id }).then(function(res) {
    if (res && res.success) {
      alert('Đã duyệt! Số dư mới: ' + fmt(res.new_balance));
      renderAdminPending(); renderAdminUsers();
    } else alert((res && res.error) || 'Lỗi');
  });
}

function rejectDeposit(id) {
  var reason = prompt('Lý do:', 'Không hợp lệ'); if (reason === null) return;
  var s = getSession();
  api('deposit_reject', { email: s.email, password: s.password, id: id, reason: reason }).then(function(res) {
    if (res && res.success) { alert('Đã từ chối'); renderAdminPending(); }
  });
}

/* ============================================================
   TAB 2 — QUẢN LÝ USERS
   ============================================================ */
function renderAdminUsers() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminUsersView'); if (!el) return;
  api('user_list', { email: s.email, password: s.password }).then(function(res) {
    var list = (res && res.success) ? (res.users || []) : [];
    if (!list.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8">Không có</p>'; return; }

    var html = '<input class="adm-input" id="userSearch" placeholder="🔍 Tìm email / tên..." oninput="filterAdminUsers()">';
    html += '<p style="text-align:center;font-size:12px;color:#8b93a7;margin:8px 0">Tổng: <b>' + list.length + '</b></p>';

    list.forEach(function(u) {
      var exp = (u.key_expiry && Number(u.key_expiry) > 0)
        ? new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN') : '—';
      var isAdm = (u.is_admin == 1);
      var balance = Number(u.balance) || 0;
      html += '<div class="adm-row" data-search="' + esc((u.email + ' ' + (u.name||'')).toLowerCase()) + '">'
        + '<div class="r1"><b>' + esc(u.name || 'User') + '</b>'
        + '<span class="badge ' + (isAdm?'badge-admin':'badge-vip') + '">' + (isAdm?'ADMIN':'USER') + '</span></div>'
        + '<div class="info">Email: ' + esc(u.email) + '</div>'
        + '<div class="info">IP: <code>' + esc(u.ip||'—') + '</code></div>'
        + '<div class="info">Số dư: <b style="color:#22c55e">' + fmt(balance) + '</b></div>'
        + '<div class="info">VIP: ' + exp + '</div>'
        + '<div class="acts">'
        + '<button class="b3" onclick="adminResetIP(\'' + esc(u.email) + '\')">Reset IP</button>'
        + '<button class="b4" onclick="adminAdjustBalance(\'' + esc(u.email) + '\',' + balance + ')">Cấp tiền</button>'
        + (!isAdm ? '<button class="b5" onclick="adminDeleteUser(\'' + esc(u.email) + '\')">Xoá</button>' : '')
        + '</div></div>';
    });
    el.innerHTML = html;
  });
}

function filterAdminUsers() {
  var q = (document.getElementById('userSearch').value || '').toLowerCase().trim();
  document.querySelectorAll('#adminUsersView .adm-row').forEach(function(r) {
    r.style.display = r.dataset.search.indexOf(q) >= 0 ? '' : 'none';
  });
}

function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?')) return;
  var s = getSession();
  api('user_reset_ip', { email: s.email, password: s.password, target_email: email })
    .then(function(res) { if (res && res.success) { alert('Đã reset'); renderAdminUsers(); } });
}

function adminAdjustBalance(email, currentBal) {
  var input = prompt('Cấp bao nhiêu (âm để trừ):', '10000'); if (input === null) return;
  var delta = Number(input); if (isNaN(delta) || delta === 0) return alert('Số không hợp lệ');
  var s = getSession();
  api('admin_set_balance', { email: s.email, password: s.password, target_email: email, amount: delta })
    .then(function(res) {
      if (res && res.success) {
        alert('Đã cấp! Số dư mới: ' + fmt(res.new_balance));
        renderAdminUsers();
      }
    });
}

function adminDeleteUser(email) {
  if (!confirm('XOÁ ' + email + '?')) return;
  var s = getSession();
  api('user_delete', { email: s.email, password: s.password, target_email: email })
    .then(function(res) { if (res && res.success) { alert('Đã xoá'); renderAdminUsers(); } });
}

/* ============================================================
   TAB 3 — BRANDING (LOGO / AVATAR / TÊN WEB / SEO)
   ============================================================ */
function renderAdminBrand() {
  var el = document.getElementById('adminBrandView'); if (!el) return;
  var c = window.CONFIG || {};

  var html = '<div class="adm-section" style="border-color:#a855f7">';
  html += '<h4 style="color:#a855f7">🎨 BRANDING & NHẬN DIỆN</h4>';

  /* TÊN WEB + SLOGAN */
  html += '<label style="font-size:11px;font-weight:700">Tên Website *</label>';
  html += '<input class="adm-input" id="cfgSiteName" value="' + esc(c.site_name||'') + '" placeholder="TOOL MINHIOS">';

  html += '<label style="font-size:11px;font-weight:700">Slogan / Mô tả ngắn</label>';
  html += '<input class="adm-input" id="cfgSiteDesc" value="' + esc(c.site_desc||'') + '" placeholder="Hệ thống tool chuyên nghiệp">';

  html += '<label style="font-size:11px;font-weight:700">Tên tab trình duyệt (SEO Title)</label>';
  html += '<input class="adm-input" id="cfgSeoTitle" value="' + esc(c.seo_title||c.site_name||'') + '">';

  html += '<label style="font-size:11px;font-weight:700">Từ khóa SEO (cách nhau dấu phẩy)</label>';
  html += '<input class="adm-input" id="cfgSeoKeywords" value="' + esc(c.seo_keywords||'') + '" placeholder="tool, facebook, auto">';

  html += '<label style="font-size:11px;font-weight:700">Favicon (icon tab)</label>';
  html += '<input type="file" id="cfgFaviconFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  if (c.favicon) html += '<div style="text-align:center;margin-top:6px"><img src="' + c.favicon + '" style="max-width:40px;border-radius:6px"></div>';

  /* LOGO */
  html += '<div style="background:#0a0b0f;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #2e3342">';
  html += '<div style="font-size:12px;font-weight:800;color:#60a5fa;margin-bottom:8px">🖼️ LOGO WEBSITE</div>';
  html += '<input type="file" id="cfgLogoFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  html += '<label style="font-size:11px;font-weight:700;margin-top:6px;display:block">Hoặc nhập URL logo</label>';
  html += '<input class="adm-input" id="cfgLogoUrl" value="' + (c.logo && c.logo.indexOf('data:') !== 0 ? esc(c.logo) : '') + '" placeholder="https://.../logo.png">';
  if (c.logo) html += '<div style="text-align:center;margin-top:6px"><img src="' + c.logo + '" style="max-width:80px;border-radius:50%;background:#1a1d26;padding:4px"></div>';
  html += '</div>';

  /* AVATAR */
  html += '<div style="background:#0a0b0f;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #2e3342">';
  html += '<div style="font-size:12px;font-weight:800;color:#60a5fa;margin-bottom:8px">👤 AVATAR MẶC ĐỊNH</div>';
  html += '<input type="file" id="cfgAvatarFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  if (c.avatar) html += '<div style="text-align:center;margin-top:6px"><img src="' + c.avatar + '" style="max-width:80px;border-radius:50%;background:#1a1d26;padding:4px"></div>';
  html += '</div>';

  /* BACKGROUND */
  html += '<div style="background:#0a0b0f;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #2e3342">';
  html += '<div style="font-size:12px;font-weight:800;color:#60a5fa;margin-bottom:8px">🌌 BACKGROUND</div>';
  html += '<input type="file" id="cfgBgFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';
  html += '<label style="font-size:11px;font-weight:700;margin-top:6px;display:block">Màu nền (gradient)</label>';
  html += '<input class="adm-input" id="cfgBgColor" value="' + esc(c.bg_color||'') + '" placeholder="#0a0b0f hoặc linear-gradient(...)">';
  if (c.bg_image) html += '<div style="text-align:center;margin-top:6px"><img src="' + c.bg_image + '" style="max-width:100%;max-height:80px;border-radius:6px"></div>';
  html += '</div>';

  /* MÀU CHỦ ĐẠO */
  html += '<div style="background:#0a0b0f;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #2e3342">';
  html += '<div style="font-size:12px;font-weight:800;color:#60a5fa;margin-bottom:8px">🌈 MÀU CHỦ ĐẠO</div>';
  html += '<label style="font-size:11px;font-weight:700">Màu chính (Primary)</label>';
  html += '<input type="color" id="cfgColorPrimary" value="' + (c.color_primary||'#3b82f6') + '" style="width:100%;height:40px;border-radius:8px;border:1px solid #2e3342;background:#0a0b0f">';
  html += '<label style="font-size:11px;font-weight:700;margin-top:6px;display:block">Màu phụ (Accent)</label>';
  html += '<input type="color" id="cfgColorAccent" value="' + (c.color_accent||'#22c55e') + '" style="width:100%;height:40px;border-radius:8px;border:1px solid #2e3342;background:#0a0b0f">';
  html += '</div>';

  html += '<button class="adm-btn" style="background:linear-gradient(135deg,#a855f7,#7c3aed);margin-top:12px" onclick="saveBrandConfig()">💾 LƯU BRANDING</button>';
  html += '</div>';

  el.innerHTML = html;
}

function saveBrandConfig() {
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  var c = window.CONFIG = window.CONFIG || {};

  c.site_name     = val('cfgSiteName') || 'TOOL MINHIOS';
  c.site_desc     = val('cfgSiteDesc');
  c.seo_title     = val('cfgSeoTitle') || c.site_name;
  c.seo_keywords  = val('cfgSeoKeywords');
  c.bg_color      = val('cfgBgColor');
  c.color_primary = val('cfgColorPrimary') || '#3b82f6';
  c.color_accent  = val('cfgColorAccent') || '#22c55e';

  var logoUrl = val('cfgLogoUrl');
  if (logoUrl) c.logo = logoUrl;

  var tasks = [];
  var logoFile    = document.getElementById('cfgLogoFile').files[0];
  var avatarFile  = document.getElementById('cfgAvatarFile').files[0];
  var faviconFile = document.getElementById('cfgFaviconFile').files[0];
  var bgFile      = document.getElementById('cfgBgFile').files[0];

  if (logoFile)    tasks.push(fileToBase64(logoFile, 400, 0.9).then(function(b) { if (b) c.logo = b; }));
  if (avatarFile)  tasks.push(fileToBase64(avatarFile, 300, 0.85).then(function(b) { if (b) c.avatar = b; }));
  if (faviconFile) tasks.push(fileToBase64(faviconFile, 128, 0.9).then(function(b) { if (b) c.favicon = b; }));
  if (bgFile)      tasks.push(fileToBase64(bgFile, 1600, 0.8).then(function(b) { if (b) c.bg_image = b; }));

  Promise.all(tasks).then(function() {
    var s = getSession();
    api('config_save', { email: s.email, password: s.password, config: c }).then(function(res) {
      if (res && res.success) {
        alert('✅ ĐÃ LƯU BRANDING!');
        if (typeof applyLoginBranding === 'function') applyLoginBranding();
        if (typeof applySiteBranding === 'function') applySiteBranding();
        renderAdminBrand();
      } else alert('❌ ' + ((res && res.error) || 'Lỗi'));
    });
  });
}

/* ============================================================
   TAB 4 — NỘI DUNG (MARQUEE, FOOTER, THÔNG BÁO, LIÊN HỆ)
   ============================================================ */
function renderAdminContent() {
  var el = document.getElementById('adminContentView'); if (!el) return;
  var c = window.CONFIG || {};

  var html = '<div class="adm-section" style="border-color:#f59e0b">';
  html += '<h4 style="color:#f59e0b">📝 NỘI DUNG WEBSITE</h4>';

  /* MARQUEE */
  html += '<label style="font-size:11px;font-weight:700">📢 Chữ chạy (Marquee)</label>';
  html += '<textarea class="adm-input" id="cfgMarquee" rows="2" placeholder="Thông báo chạy trên đầu trang...">' + esc(c.marquee||'') + '</textarea>';

  /* THÔNG BÁO */
  html += '<label style="font-size:11px;font-weight:700">🔔 Thông báo Popup (để trống để tắt)</label>';
  html += '<textarea class="adm-input" id="cfgNotice" rows="3" placeholder="Nội dung thông báo quan trọng...">' + esc(c.notice||'') + '</textarea>';

  /* WELCOME */
  html += '<label style="font-size:11px;font-weight:700">👋 Lời chào trang chủ</label>';
  html += '<input class="adm-input" id="cfgWelcome" value="' + esc(c.welcome||'') + '" placeholder="Chào mừng bạn đến với...">';

  /* FOOTER */
  html += '<label style="font-size:11px;font-weight:700">🦶 Footer (chân trang)</label>';
  html += '<textarea class="adm-input" id="cfgFooter" rows="2" placeholder="© 2024 YourBrand. All rights reserved.">' + esc(c.footer||'') + '</textarea>';

  /* LIÊN HỆ */
  html += '<div style="background:#0a0b0f;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #2e3342">';
  html += '<div style="font-size:12px;font-weight:800;color:#60a5fa;margin-bottom:8px">📞 LIÊN HỆ</div>';
  html += '<label style="font-size:11px;font-weight:700">Facebook</label>';
  html += '<input class="adm-input" id="cfgFacebook" value="' + esc(c.facebook||'') + '" placeholder="https://facebook.com/...">';
  html += '<label style="font-size:11px;font-weight:700">Zalo</label>';
  html += '<input class="adm-input" id="cfgZalo" value="' + esc(c.zalo||'') + '" placeholder="https://zalo.me/...">';
  html += '<label style="font-size:11px;font-weight:700">Telegram</label>';
  html += '<input class="adm-input" id="cfgTelegram" value="' + esc(c.telegram||'') + '" placeholder="https://t.me/...">';
  html += '<label style="font-size:11px;font-weight:700">Email</label>';
  html += '<input class="adm-input" id="cfgEmail" value="' + esc(c.email||'') + '" placeholder="admin@example.com">';
  html += '</div>';

  /* NHẠC NỀN */
  html += '<div style="background:#0a0b0f;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #2e3342">';
  html += '<div style="font-size:12px;font-weight:800;color:#60a5fa;margin-bottom:8px">🎵 NHẠC NỀN</div>';
  html += '<input class="adm-input" id="cfgMusicUrl" value="' + esc(c.music_url||'') + '" placeholder="https://.../music.mp3">';
  html += '<label style="font-size:11px;font-weight:700;margin-top:6px;display:block">Hoặc tải file MP3 (nhỏ)</label>';
  html += '<input type="file" id="cfgMusicFile" accept="audio/*" class="adm-input" style="padding:5px;font-size:11px">';
  html += '</div>';

  /* POPUP LOGIN TEXT */
  html += '<div style="background:#0a0b0f;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #2e3342">';
  html += '<div style="font-size:12px;font-weight:800;color:#60a5fa;margin-bottom:8px">🔐 TEXT ĐĂNG NHẬP</div>';
  html += '<label style="font-size:11px;font-weight:700">Tiêu đề login</label>';
  html += '<input class="adm-input" id="cfgLoginTitle" value="' + esc(c.login_title||'ĐĂNG NHẬP') + '">';
  html += '<label style="font-size:11px;font-weight:700">Mô tả login</label>';
  html += '<input class="adm-input" id="cfgLoginDesc" value="' + esc(c.login_desc||'') + '">';
  html += '</div>';

  html += '<button class="adm-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);margin-top:12px" onclick="saveContentConfig()">💾 LƯU NỘI DUNG</button>';
  html += '</div>';

  el.innerHTML = html;
}

function saveContentConfig() {
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  var c = window.CONFIG = window.CONFIG || {};

  c.marquee     = val('cfgMarquee');
  c.notice      = val('cfgNotice');
  c.welcome     = val('cfgWelcome');
  c.footer      = val('cfgFooter');
  c.facebook    = val('cfgFacebook');
  c.zalo        = val('cfgZalo');
  c.telegram    = val('cfgTelegram');
  c.email       = val('cfgEmail');
  c.music_url   = val('cfgMusicUrl');
  c.login_title = val('cfgLoginTitle') || 'ĐĂNG NHẬP';
  c.login_desc  = val('cfgLoginDesc');

  var musicFile = document.getElementById('cfgMusicFile').files[0];
  var task = Promise.resolve();
  if (musicFile && musicFile.size < 1024 * 1024 * 2) {
    task = new Promise(function(resolve) {
      var r = new FileReader();
      r.onload = function(e) { c.music_url = e.target.result; resolve(); };
      r.onerror = function() { resolve(); };
      r.readAsDataURL(musicFile);
    });
  }

  task.then(function() {
    var s = getSession();
    api('config_save', { email: s.email, password: s.password, config: c }).then(function(res) {
      if (res && res.success) {
        alert('✅ ĐÃ LƯU NỘI DUNG!');
        if (typeof applySiteBranding === 'function') applySiteBranding();
        if (typeof applyContent === 'function') applyContent();
        renderAdminContent();
      } else alert('❌ ' + ((res && res.error) || 'Lỗi'));
    });
  });
}

/* ============================================================
   TAB 5 — TOOLS + CẤU HÌNH BANK
   ============================================================ */
function renderAdminTools() {
  var el = document.getElementById('adminToolsView'); if (!el) return;
  var bank = (window.CONFIG && window.CONFIG.bank) || {};

  var html = '<div class="adm-section" style="border-color:#93c5fd">';
  html += '<h4>🏦 CẤU HÌNH BANK + QR</h4>';

  html += '<label style="font-size:11px;font-weight:700">Tên Ngân hàng</label>';
  html += '<input class="adm-input" id="cfgBankName" value="' + esc(bank.name||'') + '" placeholder="Vietcombank">';

  html += '<label style="font-size:11px;font-weight:700">Số tài khoản</label>';
  html += '<input class="adm-input" id="cfgBankAcc" value="' + esc(bank.account||'') + '">';

  html += '<label style="font-size:11px;font-weight:700">Chủ tài khoản</label>';
  html += '<input class="adm-input" id="cfgBankOwner" value="' + esc(bank.owner||'') + '">';

  html += '<label style="font-size:11px;font-weight:700">Chi nhánh</label>';
  html += '<input class="adm-input" id="cfgBankBranch" value="' + esc(bank.branch||'') + '">';

  html += '<label style="font-size:11px;font-weight:700">Nội dung CK mặc định</label>';
  html += '<input class="adm-input" id="cfgBankPrefix" value="' + esc(bank.prefix||'NAP') + '" placeholder="NAP">';

  html += '<label style="font-size:11px;font-weight:700">Số tiền tối thiểu (VND)</label>';
  html += '<input class="adm-input" id="cfgBankMin" type="number" value="' + (bank.min_amount||10000) + '">';

  html += '<label style="font-size:11px;font-weight:700">Ảnh QR (upload)</label>';
  html += '<input type="file" id="cfgQRFile" accept="image/*" class="adm-input" style="padding:5px;font-size:11px">';

  html += '<label style="font-size:11px;font-weight:700;margin-top:6px;display:block">Hoặc URL ảnh QR</label>';
  html += '<input class="adm-input" id="cfgQRUrl" value="' + (bank.qr && bank.qr.indexOf('data:') !== 0 ? esc(bank.qr) : '') + '" placeholder="https://.../qr.png">';

  if (bank.qr) html += '<div style="text-align:center;margin-top:6px"><img src="' + bank.qr + '" style="max-width:120px;border-radius:8px;background:#1a1d26;padding:4px"></div>';

  html += '<button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);margin-top:12px" onclick="saveBankConfig()">💾 LƯU BANK</button>';
  html += '</div>';

  el.innerHTML = html;
}

function saveBankConfig() {
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  var c = window.CONFIG = window.CONFIG || {};
  c.bank = c.bank || {};

  c.bank.name       = val('cfgBankName');
  c.bank.account    = val('cfgBankAcc');
  c.bank.owner      = val('cfgBankOwner');
  c.bank.branch     = val('cfgBankBranch');
  c.bank.prefix     = val('cfgBankPrefix') || 'NAP';
  c.bank.min_amount = parseInt(val('cfgBankMin')) || 10000;

  var qrUrl = val('cfgQRUrl');
  if (qrUrl) c.bank.qr = qrUrl;

  var qrFile = document.getElementById('cfgQRFile').files[0];
  var task = Promise.resolve();
  if (qrFile) {
    task = fileToBase64(qrFile, 600, 0.85).then(function(b) { if (b) c.bank.qr = b; });
  }

  task.then(function() {
    var s = getSession();
    api('config_save', { email: s.email, password: s.password, config: c }).then(function(res) {
      if (res && res.success) {
        alert('✅ ĐÃ LƯU BANK!');
        if (typeof buildBankInfo === 'function') buildBankInfo();
        renderAdminTools();
      } else alert('❌ ' + ((res && res.error) || 'Lỗi'));
    });
  });
}

/* ============================================================
   TAB 6 — KEYS VIP
   ============================================================ */
function renderAdminKeys() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminKeysView'); if (!el) return;
  api('key_list', { email: s.email, password: s.password }).then(function(res) {
    var keys = (res && res.success) ? (res.keys || []) : [];
    var html = '<div class="adm-section">'
      + '<h4>🔑 TẠO KEY VIP</h4>'
      + '<div style="display:flex;gap:6px">'
      + '<input class="adm-input" id="keyDays" type="number" value="30" placeholder="Số ngày" style="flex:1">'
      + '<input class="adm-input" id="keyQty" type="number" value="1" placeholder="SL" style="flex:1">'
      + '</div>'
      + '<button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a)" onclick="adminGenKeys()">➕ TẠO KEY</button>'
      + '</div>';

    html += '<p style="text-align:center;font-size:12px;color:#8b93a7;margin:8px 0">Tổng keys: <b>' + keys.length + '</b></p>';

    keys.forEach(function(k) {
      var used = (k.used == 1);
      html += '<div class="adm-row" style="border-left:3px solid ' + (used?'#ef4444':'#22c55e') + '">'
        + '<div style="display:flex;justify-content:space-between;gap:8px">'
        + '<b style="font-family:monospace;color:#ff6b9d;font-size:13px;word-break:break-all">' + esc(k.code) + '</b>'
        + '<span style="font-size:11px;color:' + (used?'#ef4444':'#22c55e') + '">' + (used?'ĐÃ DÙNG':'CHƯA') + '</span>'
        + '</div>'
        + '<div class="info">' + k.days + ' ngày</div>'
        + (k.used_by ? '<div class="info">Bởi: ' + esc(k.used_by) + '</div>' : '')
        + '<div class="acts">'
        + '<button class="b3" onclick="adminCopyKey(\'' + esc(k.code) + '\')">Copy</button>'
        + '<button class="b5" onclick="adminDelKey(\'' + esc(k.code) + '\')">Xoá</button>'
        + '</div></div>';
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
    if (res && res.success) {
      alert('Đã tạo ' + (res.keys||[]).length + ' key:\n\n' + (res.keys||[]).join('\n'));
      renderAdminKeys();
    }
  });
}

function adminCopyKey(code) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(function() { alert('📋 Đã copy: ' + code); });
  } else {
    prompt('Copy key:', code);
  }
}

function adminDelKey(code) {
  if (!confirm('Xoá key ' + code + '?')) return;
  var s = getSession();
  api('key_delete', { email: s.email, password: s.password, code: code })
    .then(function(res) { if (res && res.success) { alert('Đã xoá'); renderAdminKeys(); } });
}

/* ============================================================
   TAB 7 — LỊCH SỬ GIAO DỊCH
   ============================================================ */
function renderAdminHistory() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminHistoryView'); if (!el) return;
  api('history', { email: s.email, password: s.password }).then(function(res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    if (!hist.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8">Chưa có</p>'; return; }
    var html = '';
    hist.slice(0, 200).forEach(function(h) {
      var amt = Number(h.amount) || 0;
      var color = amt > 0 ? '#22c55e' : (amt < 0 ? '#ef4444' : '#3b82f6');
      var sign = amt > 0 ? '+' : '';
      var time = h.created_at ? new Date(Number(h.created_at)).toLocaleString('vi-VN') : '';
      html += '<div class="adm-row" style="border-left:3px solid ' + color + '">'
        + '<div><b>' + esc((h.type||'').toUpperCase()) + '</b></div>'
        + (amt ? '<div style="font-size:12px">Số tiền: <b style="color:' + color + '">' + sign + fmt(amt) + '</b></div>' : '')
        + (h.note ? '<div class="info">' + esc(h.note) + '</div>' : '')
        + (time ? '<div style="font-size:11px;color:#5a6175">' + time + '</div>' : '')
        + '</div>';
    });
    el.innerHTML = html;
  });
}

/* ============================================================
   TAB 8 — HỆ THỐNG (BACKUP / CACHE / MAINTENANCE)
   ============================================================ */
function renderAdminSystem() {
  var el = document.getElementById('adminSystemView'); if (!el) return;
  var c = window.CONFIG || {};

  var html = '<div class="adm-section" style="border-color:#ef4444">';
  html += '<h4 style="color:#ef4444">⚙️ HỆ THỐNG</h4>';

  /* BẢO TRÌ */
  html += '<label style="font-size:11px;font-weight:700">🚧 Chế độ bảo trì</label>';
  html += '<select class="adm-input" id="cfgMaintenance">';
  html += '<option value="0"' + (!c.maintenance ? ' selected' : '') + '>Tắt (hoạt động bình thường)</option>';
  html += '<option value="1"' + (c.maintenance == 1 ? ' selected' : '') + '>Bật (chỉ admin vào được)</option>';
  html += '</select>';

  html += '<label style="font-size:11px;font-weight:700">Thông báo bảo trì</label>';
  html += '<textarea class="adm-input" id="cfgMaintenanceMsg" rows="2">' + esc(c.maintenance_msg||'Hệ thống đang bảo trì, vui lòng quay lại sau!') + '</textarea>';

  /* ĐĂNG KÝ */
  html += '<label style="font-size:11px;font-weight:700">Cho phép đăng ký mới</label>';
  html += '<select class="adm-input" id="cfgAllowRegister">';
  html += '<option value="1"' + (c.allow_register != 0 ? ' selected' : '') + '>Cho phép</option>';
  html += '<option value="0"' + (c.allow_register == 0 ? ' selected' : '') + '>Khoá đăng ký</option>';
  html += '</select>';

  /* NẠP TIỀN */
  html += '<label style="font-size:11px;font-weight:700">Cho phép nạp tiền</label>';
  html += '<select class="adm-input" id="cfgAllowDeposit">';
  html += '<option value="1"' + (c.allow_deposit != 0 ? ' selected' : '') + '>Cho phép</option>';
  html += '<option value="0"' + (c.allow_deposit == 0 ? ' selected' : '') + '>Tắt nạp tiền</option>';
  html += '</select>';

  html += '<button class="adm-btn" style="background:linear-gradient(135deg,#ef4444,#dc2626);margin-top:12px" onclick="saveSystemConfig()">💾 LƯU CẤU HÌNH HỆ THỐNG</button>';
  html += '</div>';

  /* BACKUP */
  html += '<div class="adm-section" style="border-color:#3b82f6;margin-top:10px">';
  html += '<h4 style="color:#3b82f6">💾 BACKUP / RESTORE</h4>';
  html += '<button class="adm-btn" style="background:#3b82f6" onclick="adminExportConfig()">📤 XUẤT CẤU HÌNH (JSON)</button>';
  html += '<label style="font-size:11px;font-weight:700;margin-top:8px;display:block">Nhập cấu hình (JSON)</label>';
  html += '<input type="file" id="cfgImportFile" accept=".json" class="adm-input" style="padding:5px;font-size:11px">';
  html += '<button class="adm-btn" style="background:#22c55e;margin-top:6px" onclick="adminImportConfig()">📥 NHẬP CẤU HÌNH</button>';
  html += '</div>';

  /* STATS */
  html += '<div class="adm-section" style="border-color:#a855f7;margin-top:10px">';
  html += '<h4 style="color:#a855f7">📊 THỐNG KÊ NHANH</h4>';
  html += '<div id="adminStats" style="text-align:center;color:#94a3b8">Đang tải...</div>';
  html += '</div>';

  el.innerHTML = html;
  loadAdminStats();
}

function saveSystemConfig() {
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  var c = window.CONFIG = window.CONFIG || {};
  c.maintenance      = parseInt(val('cfgMaintenance')) || 0;
  c.maintenance_msg  = val('cfgMaintenanceMsg');
  c.allow_register   = parseInt(val('cfgAllowRegister'));
  c.allow_deposit    = parseInt(val('cfgAllowDeposit'));

  var s = getSession();
  api('config_save', { email: s.email, password: s.password, config: c }).then(function(res) {
    if (res && res.success) { alert('✅ ĐÃ LƯU HỆ THỐNG!'); renderAdminSystem(); }
    else alert('❌ ' + ((res && res.error) || 'Lỗi'));
  });
}

function adminExportConfig() {
  var data = JSON.stringify(window.CONFIG || {}, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'config_backup_' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  alert('✅ Đã xuất file backup!');
}

function adminImportConfig() {
  var f = document.getElementById('cfgImportFile').files[0];
  if (!f) return alert('Chọn file JSON trước!');
  var r = new FileReader();
  r.onload = function(e) {
    try {
      var cfg = JSON.parse(e.target.result);
      if (!confirm('Ghi đè cấu hình hiện tại?')) return;
      var s = getSession();
      api('config_save', { email: s.email, password: s.password, config: cfg }).then(function(res) {
        if (res && res.success) {
          alert('✅ Đã nhập cấu hình! Tải lại trang...');
          window.CONFIG = cfg;
          setTimeout(function() { location.reload(); }, 800);
        }
      });
    } catch(err) { alert('❌ File JSON không hợp lệ!'); }
  };
  r.readAsText(f);
}

function loadAdminStats() {
  var s = getSession(); if (!s) return;
  var box = document.getElementById('adminStats'); if (!box) return;
  api('user_list', { email: s.email, password: s.password }).then(function(res) {
    var users = (res && res.success) ? (res.users || []) : [];
    var total = users.length;
    var admins = users.filter(function(u) { return u.is_admin == 1; }).length;
    var totalBal = users.reduce(function(a, u) { return a + (Number(u.balance)||0); }, 0);
    var vip = users.filter(function(u) { return u.key_expiry && Number(u.key_expiry) > Date.now(); }).length;

    box.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + '<div style="background:#0a0b0f;padding:10px;border-radius:8px;border:1px solid #2e3342"><div style="font-size:22px;font-weight:800;color:#3b82f6">' + total + '</div><div style="font-size:11px">Tổng User</div></div>'
      + '<div style="background:#0a0b0f;padding:10px;border-radius:8px;border:1px solid #2e3342"><div style="font-size:22px;font-weight:800;color:#a855f7">' + vip + '</div><div style="font-size:11px">VIP Active</div></div>'
      + '<div style="background:#0a0b0f;padding:10px;border-radius:8px;border:1px solid #2e3342"><div style="font-size:22px;font-weight:800;color:#ef4444">' + admins + '</div><div style="font-size:11px">Admin</div></div>'
      + '<div style="background:#0a0b0f;padding:10px;border-radius:8px;border:1px solid #2e3342"><div style="font-size:16px;font-weight:800;color:#22c55e">' + fmt(totalBal) + '</div><div style="font-size:11px">Tổng số dư</div></div>'
      + '</div>';
  });
}

/* ============================================================
   XUẤT HÀM RA WINDOW
   ============================================================ */
window.openAdmin = openAdmin;
window.switchAdminTab = switchAdminTab;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.adminResetIP = adminResetIP;
window.adminAdjustBalance = adminAdjustBalance;
window.adminDeleteUser = adminDeleteUser;
window.filterAdminUsers = filterAdminUsers;
window.adminGenKeys = adminGenKeys;
window.adminCopyKey = adminCopyKey;
window.adminDelKey = adminDelKey;
window.saveBrandConfig = saveBrandConfig;
window.saveContentConfig = saveContentConfig;
window.saveBankConfig = saveBankConfig;
window.saveSystemConfig = saveSystemConfig;
window.adminExportConfig = adminExportConfig;
window.adminImportConfig = adminImportConfig;
window.fileToBase64 = fileToBase64;
window.renderAdminPending = renderAdminPending;
window.renderAdminUsers = renderAdminUsers;
window.renderAdminBrand = renderAdminBrand;
window.renderAdminContent = renderAdminContent;
window.renderAdminTools = renderAdminTools;
window.renderAdminKeys = renderAdminKeys;
window.renderAdminHistory = renderAdminHistory;
window.renderAdminSystem = renderAdminSystem;
