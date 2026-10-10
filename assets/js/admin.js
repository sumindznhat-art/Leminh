async function openAdmin() {
  var s = getSession(); if (!s) { alert('Chưa đăng nhập'); return; }
  var u = s.user;
  var isAdmin = (s.email === ADMIN_EMAIL) || (u && u.is_admin == 1);
  if (!isAdmin) { alert('Không có quyền!'); return; }
  ['adminPendingView','adminUsersView','adminKeysView','adminHistoryView'].forEach(function(id) { var el = document.getElementById(id); if (el) el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">Đang tải...</p>'; });
  openModal('adminPanel');
  renderAdminPending(); renderAdminUsers(); renderAdminKeys(); renderAdminHistory();
}

function switchAdminTab(t) {
  document.querySelectorAll('.admin-tab').forEach(function(x) { x.classList.toggle('active', x.dataset.atab === t); });
  var map = { pending: 'adminPendingView', users: 'adminUsersView', keys: 'adminKeysView', history: 'adminHistoryView' };
  Object.values(map).forEach(function(id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
  var target = document.getElementById(map[t]); if (target) target.style.display = '';
}

function renderAdminPending() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminPendingView'); if (!el) return;
  api('deposit_pending', { email: s.email, password: s.password }).then(function(res) {
    var deps = (res && res.success) ? (res.deposits || []) : [];
    if (!deps.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:30px">Không có yêu cầu</p>'; var b = document.getElementById('pendBadge'); if (b) b.style.display = 'none'; return; }
    var html = '<p style="text-align:center;font-size:12px;color:#8b93a7;margin-bottom:8px">Có <b style="color:#ff3d71">' + deps.length + '</b> yêu cầu</p>';
    deps.forEach(function(d) { var time = new Date(Number(d.created_at)).toLocaleString('vi-VN'); html += '<div class="adm-row"><div><b>' + esc(d.email) + '</b></div><div style="font-size:16px;color:#ff3d71;font-weight:800;margin:4px 0">' + fmt(d.amount) + '</div><div class="info">IP: <code>' + esc(d.ip||'—') + '</code></div><div class="info">Note: ' + esc(d.note||'—') + '</div><div style="font-size:11px;color:#5a6175">' + time + '</div><div class="acts"><button class="b2" style="flex:1" onclick="approveDeposit(\'' + d.id + '\')">DUYỆT</button><button class="b5" style="flex:1" onclick="rejectDeposit(\'' + d.id + '\')">TỪ CHỐI</button></div></div>'; });
    el.innerHTML = html;
    var badge = document.getElementById('pendBadge'); if (badge) { badge.textContent = deps.length; badge.style.display = 'inline-block'; }
  });
}

function approveDeposit(id) { if (!confirm('Xác nhận đã nhận tiền?')) return; var s = getSession(); api('deposit_approve', { email: s.email, password: s.password, id: id }).then(function(res) { if (res && res.success) { alert('Đã duyệt! Số dư mới: ' + fmt(res.new_balance)); renderAdminPending(); renderAdminUsers(); } else alert((res && res.error) || 'Lỗi'); }); }

function rejectDeposit(id) { var reason = prompt('Lý do:', 'Không hợp lệ'); if (reason === null) return; var s = getSession(); api('deposit_reject', { email: s.email, password: s.password, id: id, reason: reason }).then(function(res) { if (res && res.success) { alert('Đã từ chối'); renderAdminPending(); } }); }

function renderAdminUsers() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminUsersView'); if (!el) return;
  api('user_list', { email: s.email, password: s.password }).then(function(res) {
    var list = (res && res.success) ? (res.users || []) : [];
    if (!list.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8">Không có</p>'; return; }
    var html = '<p style="text-align:center;font-size:12px;color:#8b93a7;margin-bottom:8px">Tổng: <b>' + list.length + '</b></p>';
    list.forEach(function(u) { var exp = (u.key_expiry && Number(u.key_expiry) > 0) ? new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN') : '—'; var isAdm = (u.is_admin == 1), balance = Number(u.balance) || 0; html += '<div class="adm-row"><div class="r1"><b>' + esc(u.name || 'User') + '</b><span class="badge ' + (isAdm?'badge-admin':'badge-vip') + '">' + (isAdm?'ADMIN':'USER') + '</span></div><div class="info">Email: ' + esc(u.email) + '</div><div class="info">IP: <code>' + esc(u.ip||'—') + '</code></div><div class="info">Số dư: <b style="color:#22c55e">' + fmt(balance) + '</b></div><div class="info">VIP: ' + exp + '</div><div class="acts"><button class="b3" onclick="adminResetIP(\'' + esc(u.email) + '\')">Reset IP</button><button class="b4" onclick="adminAdjustBalance(\'' + esc(u.email) + '\',' + balance + ')">Cấp tiền</button>' + (!isAdm ? '<button class="b5" onclick="adminDeleteUser(\'' + esc(u.email) + '\')">Xoá</button>' : '') + '</div></div>'; });
    el.innerHTML = html;
  });
}

function adminResetIP(email) { if (!confirm('Reset IP cho ' + email + '?')) return; var s = getSession(); api('user_reset_ip', { email: s.email, password: s.password, target_email: email }).then(function(res) { if (res && res.success) { alert('Đã reset'); renderAdminUsers(); } }); }

function adminAdjustBalance(email, currentBal) { var input = prompt('Cấp bao nhiêu:', '10000'); if (input === null) return; var delta = Number(input); if (isNaN(delta) || delta === 0) return alert('Số không hợp lệ'); var s = getSession(); api('admin_set_balance', { email: s.email, password: s.password, target_email: email, amount: delta }).then(function(res) { if (res && res.success) { alert('Đã cấp! Số dư: ' + fmt(res.new_balance)); renderAdminUsers(); } }); }

function adminDeleteUser(email) { if (!confirm('XOÁ ' + email + '?')) return; var s = getSession(); api('user_delete', { email: s.email, password: s.password, target_email: email }).then(function(res) { if (res && res.success) { alert('Đã xoá'); renderAdminUsers(); } }); }

function renderAdminKeys() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminKeysView'); if (!el) return;
  api('key_list', { email: s.email, password: s.password }).then(function(res) {
    var keys = (res && res.success) ? (res.keys || []) : [];
    var html = '<div style="padding:14px;border-radius:14px;background:#141620;border:1px dashed #2e3342;margin-bottom:14px"><h4 style="font-size:12.5px;font-weight:900;margin-bottom:10px;color:#fff">TẠO KEY</h4><input class="adm-input" id="keyDays" type="number" value="30" placeholder="Số ngày"><input class="adm-input" id="keyQty" type="number" value="1" placeholder="Số lượng"><button class="adm-btn" onclick="adminGenKeys()">TẠO KEY</button></div>';
    keys.forEach(function(k) { var used = (k.used == 1); html += '<div class="adm-row" style="border-left:3px solid ' + (used?'#ef4444':'#22c55e') + '"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-family:monospace;color:#ff6b9d;font-size:13px;word-break:break-all">' + esc(k.code) + '</b><span style="font-size:11px;color:' + (used?'#ef4444':'#22c55e') + '">' + (used?'ĐÃ DÙNG':'CHƯA DÙNG') + '</span></div><div class="info">' + k.days + ' ngày</div><div class="acts"><button class="b5" onclick="adminDelKey(\'' + esc(k.code) + '\')">Xoá</button></div></div>'; });
    el.innerHTML = html;
  });
}

function adminGenKeys() { var days = parseInt(document.getElementById('keyDays').value) || 30; var qty = Math.min(100, Math.max(1, parseInt(document.getElementById('keyQty').value) || 1)); if (!confirm('Tạo ' + qty + ' key loại ' + days + ' ngày?')) return; var s = getSession(); api('key_create', { email: s.email, password: s.password, days: days, qty: qty }).then(function(res) { if (res && res.success) { alert('Đã tạo ' + (res.keys||[]).length + ' key:\n\n' + (res.keys||[]).join('\n')); renderAdminKeys(); } }); }

function adminDelKey(code) { if (!confirm('Xoá key ' + code + '?')) return; var s = getSession(); api('key_delete', { email: s.email, password: s.password, code: code }).then(function(res) { if (res && res.success) { alert('Đã xoá'); renderAdminKeys(); } }); }

function renderAdminHistory() {
  var s = getSession(); if (!s) return;
  var el = document.getElementById('adminHistoryView'); if (!el) return;
  api('history', { email: s.email, password: s.password }).then(function(res) {
    var hist = (res && res.success) ? (res.history || []) : [];
    if (!hist.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8">Chưa có</p>'; return; }
    var html = '';
    hist.slice(0, 100).forEach(function(h) { var amt = Number(h.amount) || 0, color = amt > 0 ? '#22c55e' : (amt < 0 ? '#ef4444' : '#3b82f6'), sign = amt > 0 ? '+' : ''; html += '<div class="adm-row" style="border-left:3px solid ' + color + '"><div><b>' + esc((h.type||'').toUpperCase()) + '</b></div>' + (amt ? '<div style="font-size:12px">Số tiền: <b style="color:' + color + '">' + sign + fmt(amt) + '</b></div>' : '') + '</div>'; });
    el.innerHTML = html;
  });
}

window.openAdmin = openAdmin;
window.switchAdminTab = switchAdminTab;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.adminResetIP = adminResetIP;
window.adminAdjustBalance = adminAdjustBalance;
window.adminDeleteUser = adminDeleteUser;
window.adminGenKeys = adminGenKeys;
window.adminDelKey = adminDelKey;
window.renderAdminPending = renderAdminPending;
window.renderAdminUsers = renderAdminUsers;
window.renderAdminKeys = renderAdminKeys;
window.renderAdminHistory = renderAdminHistory;
