/* ============================================================
   STORE.JS — V5 + KEY EXPIRY GUARD
   ============================================================ */

var ADMIN_EMAIL  = 'leminhdz@gmail.com';
var AVATAR_KEY   = 'bonsicola_avatar';
var SESS_KEY     = 'bonsicola_session';
var DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>" +
  "<rect fill='%23e0f2fe' width='200' height='200'/>" +
  "<text x='50%25' y='56%25' font-size='90' text-anchor='middle' " +
  "dominant-baseline='middle'>🎀</text></svg>";

function now() { return Date.now(); }

function fmt(n) {
  var v = Number(n);
  if (!isFinite(v)) v = 0;
  return v.toLocaleString('vi-VN') + 'đ';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function getToolImage(t) { return t ? (t.image || '') : ''; }

/* ---------- KEY EXPIRY GUARD ---------- */
function isKeyExpired() {
  var s = getSession();
  if (!s || !s.user) return true;
  var u = s.user;
  if ((u.email === ADMIN_EMAIL) || (u.is_admin == 1)) return false;
  var exp = Number(u.key_expiry) || 0;
  return !exp || exp <= Date.now();
}

function getKeyRemaining() {
  var s = getSession();
  if (!s || !s.user) return { ms: 0, text: 'Chưa kích hoạt', expired: true };
  var u = s.user;
  if ((u.email === ADMIN_EMAIL) || (u.is_admin == 1))
    return { ms: Infinity, text: 'VÔ HẠN (ADMIN)', expired: false };
  var exp = Number(u.key_expiry) || 0;
  var ms = exp - Date.now();
  if (ms <= 0) return { ms: 0, text: 'ĐÃ HẾT HẠN', expired: true };
  var d = Math.floor(ms / 86400000);
  var h = Math.floor((ms % 86400000) / 3600000);
  var m = Math.floor((ms % 3600000) / 60000);
  var sec = Math.floor((ms % 60000) / 1000);
  var text = '';
  if (d > 0) text += d + 'n ';
  if (h > 0 || d > 0) text += h + 'h ';
  text += m + 'm ' + sec + 's';
  return { ms: ms, text: text, expired: false };
}

/* ---------- API WRAPPER ---------- */
function api(action, params, method) {
  params = params || {};
  method = method || 'POST';

  return new Promise(function (resolve) {
    var base = (window.CONFIG && window.CONFIG.API_BASE) ? window.CONFIG.API_BASE : '/api';

    if (base.indexOf('http') !== 0) {
      var origin = window.location.origin || '';
      if (origin && origin !== 'null' && origin.indexOf('file') !== 0) {
        base = origin + base;
      }
    }

    var url = base.replace(/\/$/, '') + '/index.php?action=' + encodeURIComponent(action);
    var xhr = new XMLHttpRequest();
    var done = false;
    function finish(r) { if (done) return; done = true; resolve(r); }

    try {
      xhr.open(method, url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.timeout = 12000;

      xhr.onload = function () {
        var t = xhr.responseText || '';
        if (!t) return finish({ success: false, error: 'Server không phản hồi' });
        try { finish(JSON.parse(t)); }
        catch (e) { finish({ success: false, error: 'Dữ liệu server không hợp lệ' }); }
      };
      xhr.onerror   = function () { finish({ success: false, error: 'Không kết nối được server' }); };
      xhr.ontimeout = function () { finish({ success: false, error: 'Server timeout (12s)' }); };
      xhr.onabort   = function () { finish({ success: false, error: 'Đã huỷ' }); };

      if (method === 'POST') xhr.send(JSON.stringify(params));
      else xhr.send();
    } catch (e) { finish({ success: false, error: e.message || 'Lỗi XHR' }); }
  });
}

/* ---------- SESSION ---------- */
function getSession() {
  try {
    var r = localStorage.getItem(SESS_KEY);
    if (!r) return null;
    var s = JSON.parse(r);
    if (!s || !s.email) return null;
    return s;
  } catch (e) { return null; }
}

function setSessionData(email, pass, user) {
  try {
    localStorage.setItem(SESS_KEY, JSON.stringify({
      email: email, password: pass, user: user, saved_at: now()
    }));
  } catch (e) {}
}

function clearSession() {
  try { localStorage.removeItem(SESS_KEY); } catch (e) {}
}

function refreshUser(user) {
  var s = getSession();
  if (!s || !user) return;
  s.user = user;
  try { localStorage.setItem(SESS_KEY, JSON.stringify(s)); } catch (e) {}
}

/* ---------- USER API ---------- */
function apiGetUser() {
  var s = getSession();
  if (!s) return Promise.resolve({ success: false, error: 'Chưa đăng nhập' });

  return api('get_user', { email: s.email, password: s.password })
    .then(function (res) {
      if (res && res.success && res.user) {
        if (String(s.email).toLowerCase() === String(ADMIN_EMAIL).toLowerCase()) {
          res.user.is_admin = 1;
        }
        refreshUser(res.user);
      }
      return res;
    });
}

function apiBuyPackage(days, price) {
  var s = getSession();
  if (!s) return Promise.resolve({ success: false, error: 'Chưa đăng nhập' });
  return api('buy_package', {
    email: s.email, password: s.password, days: days, price: price
  });
}

function apiUpdateLastApi(apiUrl, toolName) {
  var s = getSession();
  if (!s) return Promise.resolve({ success: false });
  return api('update_last_api', {
    email: s.email, password: s.password, api: apiUrl, tool: toolName
  });
}

/* ---------- AVATAR ---------- */
function getAvatarFromStorage() {
  try { return localStorage.getItem(AVATAR_KEY) || null; }
  catch (e) { return null; }
}

function setAvatarToStorage(src) {
  try {
    if (src) localStorage.setItem(AVATAR_KEY, src);
    else localStorage.removeItem(AVATAR_KEY);
  } catch (e) {}
}

function applyAvatarEverywhere(src) {
  if (!src) return;
  ['loginAvatarImg', 'hdrAvatar', 'profAvatar', 'drawerAvatar']
    .forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.src = src;
    });
}

window.ADMIN_EMAIL  = ADMIN_EMAIL;
window.AVATAR_KEY   = AVATAR_KEY;
window.SESS_KEY     = SESS_KEY;
window.DEFAULT_AVATAR = DEFAULT_AVATAR;
window.now = now;
window.fmt = fmt;
window.esc = esc;
window.getToolImage = getToolImage;
window.api = api;
window.apiGetUser = apiGetUser;
window.apiBuyPackage = apiBuyPackage;
window.apiUpdateLastApi = apiUpdateLastApi;
window.getSession = getSession;
window.setSessionData = setSessionData;
window.clearSession = clearSession;
window.refreshUser = refreshUser;
window.getAvatarFromStorage = getAvatarFromStorage;
window.setAvatarToStorage = setAvatarToStorage;
window.applyAvatarEverywhere = applyAvatarEverywhere;
window.isKeyExpired = isKeyExpired;
window.getKeyRemaining = getKeyRemaining;
