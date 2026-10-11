/* ============================================================
   AUTH.JS — V5 + KEY CHECK AFTER LOGIN
   ============================================================ */
function _$(id) { return document.getElementById(id); }

function _setLoading(spinId, btnTextId, text, load) {
  var sp = _$(spinId);
  var bt = _$(btnTextId);
  if (sp) sp.style.display = load ? 'inline-block' : 'none';
  if (bt) bt.innerHTML = text;
}
function _setError(m)    { var b = _$('loginError'); if (b) b.textContent = m || ''; }
function _setKeyError(m) { var b = _$('keyErr');     if (b) b.textContent = m || ''; }

var _loginBusy = false;
var _regBusy   = false;

function switchTab(tab) {
  _setError('');
  var tl = _$('tabLogin'), tr = _$('tabReg');
  var fl = _$('formLogin'), fr = _$('formReg');
  if (tab === 'login') {
    if (tl) tl.classList.add('active');
    if (tr) tr.classList.remove('active');
    if (fl) fl.style.display = '';
    if (fr) fr.style.display = 'none';
  } else {
    if (tr) tr.classList.add('active');
    if (tl) tl.classList.remove('active');
    if (fr) fr.style.display = '';
    if (fl) fl.style.display = 'none';
  }
}

function _loginBtnIdle() {
  _setLoading('loginSpinner', 'btnLoginText',
    '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP', false);
}
function _regBtnIdle() {
  _setLoading('regSpinner', 'btnRegText',
    '<i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ', false);
}

/* ---------- REGISTER ---------- */
function doRegister() {
  if (_regBusy) return;
  _setError('');
  var name  = (_$('regName')  ? _$('regName').value  : '').trim();
  var email = (_$('regEmail') ? _$('regEmail').value : '').trim().toLowerCase();
  var p1    = _$('regPass')   ? _$('regPass').value  : '';
  var p2    = _$('regPass2')  ? _$('regPass2').value : '';

  if (!name || !email || !p1 || !p2) return _setError('Vui lòng nhập đầy đủ!');
  if (p1.length < 6) return _setError('Mật khẩu từ 6 ký tự!');
  if (p1 !== p2) return _setError('Mật khẩu không khớp!');

  _regBusy = true;
  _setLoading('regSpinner', 'btnRegText', 'ĐANG XỬ LÝ...', true);

  var safety = setTimeout(function () {
    if (!_regBusy) return;
    _setError('Server không phản hồi.');
    _regBtnIdle();
    _regBusy = false;
  }, 14000);

  api('register', { name: name, email: email, password: p1 })
    .then(function (data) {
      clearTimeout(safety);
      if (data && data.success) {
        alert('ĐĂNG KÝ THÀNH CÔNG! Hãy đăng nhập.');
        switchTab('login');
        var le = _$('loginEmail'); if (le) le.value = email;
        var lp = _$('loginPass');  if (lp) lp.focus();
      } else {
        _setError((data && data.error) || 'Đăng ký thất bại!');
      }
    })
    .catch(function (e) {
      clearTimeout(safety);
      _setError((e && e.message) || 'Lỗi kết nối!');
    })
    .then(function () {
      _regBtnIdle();
      _regBusy = false;
    });
}

/* ---------- LOGIN ---------- */
function doLogin() {
  if (_loginBusy) return;
  _setError('');
  var email = (_$('loginEmail') ? _$('loginEmail').value : '').trim().toLowerCase();
  var pass  = _$('loginPass')   ? _$('loginPass').value  : '';

  if (!email || !pass) return _setError('Vui lòng nhập đầy đủ!');

  _loginBusy = true;
  _setLoading('loginSpinner', 'btnLoginText', 'ĐANG ĐĂNG NHẬP...', true);

  var safety = setTimeout(function () {
    if (!_loginBusy) return;
    _setError('Server không phản hồi (quá 14s).');
    _loginBtnIdle();
    _loginBusy = false;
  }, 14000);

  api('login', { email: email, password: pass })
    .then(function (data) {
      clearTimeout(safety);
      if (data && data.success && data.user) {
        if (email === ADMIN_EMAIL) data.user.is_admin = 1;
        setSessionData(email, pass, data.user);
        try {
          if (typeof enterApp === 'function') enterApp();
          else _setError('Lỗi: app.js chưa load');
          setTimeout(function () {
            if (typeof checkKeyAndNotify === 'function') checkKeyAndNotify();
          }, 800);
        } catch (e) {
          _setError('Lỗi khởi tạo: ' + (e.message || e));
        }
      } else {
        _setError((data && data.error) || 'Sai tài khoản hoặc mật khẩu!');
      }
    })
    .catch(function (e) {
      clearTimeout(safety);
      _setError((e && e.message) || 'Lỗi kết nối!');
    })
    .then(function () {
      _loginBtnIdle();
      _loginBusy = false;
    });
}

/* ---------- KEY CHECK AFTER LOGIN ---------- */
function checkKeyAndNotify() {
  var s = getSession();
  if (!s || !s.user) return;
  var u = s.user;
  var isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);
  if (isAdmin) return;

  var exp = Number(u.key_expiry) || 0;
  if (!exp || exp <= Date.now()) {
    setTimeout(function () {
      var go = confirm(
        '🔒 KEY ĐÃ HẾT HẠN\n\n' +
        'Bạn không thể mở tool khi chưa kích hoạt key.\n\n' +
        '👉 OK = MUA KEY NGAY\n' +
        '👉 Cancel = NẠP TIỀN TRƯỚC'
      );
      if (go) showPage('vip');
      else showPage('deposit');
    }, 500);
  } else {
    var remain = exp - Date.now();
    if (remain < 86400000 && remain > 0) {
      setTimeout(function () {
        var h = Math.floor(remain / 3600000);
        var m = Math.floor((remain % 3600000) / 60000);
        alert('⚠️ KEY SẮP HẾT HẠN!\n\nCòn lại: ' + h + ' giờ ' + m + ' phút\n\nGia hạn ngay!');
      }, 700);
    }
  }
}

/* ---------- LOGOUT ---------- */
function doLogout() {
  if (!confirm('Đăng xuất?')) return;
  clearSession();
  location.reload();
}

/* ---------- ACTIVATE KEY ---------- */
function activateKey() {
  _setKeyError('');
  var key = (_$('keyInput') ? _$('keyInput').value : '').trim().toUpperCase();
  if (!key) return _setKeyError('Vui lòng nhập key!');

  var s = getSession();
  if (!s) return _setKeyError('Vui lòng đăng nhập lại!');

  _setKeyError('Đang xử lý...');
  api('key_activate', { email: s.email, password: s.password, code: key })
    .then(function (data) {
      if (data && data.success) {
        alert('KÍCH HOẠT THÀNH CÔNG! +' + data.days + ' ngày');
        if (typeof closeModal === 'function') closeModal('keyModal');
        apiGetUser().then(function () {
          if (typeof renderAll === 'function') renderAll();
          if (typeof updateVipBanner === 'function') updateVipBanner();
          if (typeof buildPorts === 'function') buildPorts();
        });
      } else {
        _setKeyError((data && data.error) || 'Key không hợp lệ!');
      }
    })
    .catch(function (e) {
      _setKeyError((e && e.message) || 'Lỗi kết nối!');
    });
}

/* ---------- SUBMIT DEPOSIT ---------- */
function submitDeposit() {
  var amtEl  = _$('depAmount');
  var noteEl = _$('depNote');
  var amount = Number(amtEl ? amtEl.value : 0);
  var note   = noteEl ? noteEl.value.trim() : '';

  if (!amount || amount < 10000) return alert('Số tiền tối thiểu 10,000đ');
  var s = getSession();
  if (!s) return alert('Vui lòng đăng nhập lại!');

  api('deposit_create', {
    email: s.email, password: s.password, amount: amount, note: note
  }).then(function (data) {
    if (data && data.success) {
      alert(data.message || 'Đã gửi yêu cầu nạp!');
      if (typeof closeModal === 'function') closeModal('depositModal');
      if (typeof renderAll === 'function') renderAll();
    } else {
      alert((data && data.error) || 'Lỗi!');
    }
  }).catch(function (e) {
    alert((e && e.message) || 'Lỗi kết nối!');
  });
}

window.switchTab = switchTab;
window.doRegister = doRegister;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.activateKey = activateKey;
window.submitDeposit = submitDeposit;
window.checkKeyAndNotify = checkKeyAndNotify;
