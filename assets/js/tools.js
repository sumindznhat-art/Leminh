/* ============================================================
   TOOLS.JS — V7 · HEADER GỌN · KẾT QUẢ Ở ROBOT · MD5 TOOL
   ============================================================ */

var activeTool = null, toolInterval = null, toolRetry = 0;
var _engine = null, _lastSid = null, _im = false;

/* ============ STATUS HEADER (CHỈ ĐÈN XANH) ============ */
function setStatus(state) {
  var el = document.getElementById('gsStatus');
  var txt = document.getElementById('gsStatusText');
  if (txt) txt.textContent = '';
  if (!el) return;
  el.classList.remove('err', 'wait');
  if (state === 'err') el.classList.add('err');
  else if (state === 'wait') el.classList.add('wait');
}

/* ============ ROBOT DISPLAY ============ */
function updateRobot(sid, prediction, confidence) {
  var pEl = document.getElementById('phien-text');
  var predEl = document.getElementById('prediction-text');
  var confEl = document.getElementById('confidence-text');

  if (pEl) pEl.textContent = '#' + (sid != null && sid > 0 ? sid : '0') + ':';

  if (predEl) {
    if (prediction === 'TAI') {
      predEl.textContent = 'TÀI';
      predEl.style.color = '#ff3d71';
      predEl.style.textShadow = '0 0 30px rgba(255,61,113,.95)';
    } else if (prediction === 'XIU') {
      predEl.textContent = 'XỈU';
      predEl.style.color = '#8b5cf6';
      predEl.style.textShadow = '0 0 30px rgba(139,92,246,.95)';
    } else {
      predEl.textContent = '--';
      predEl.style.color = '#fff';
      predEl.style.textShadow = '0 2px 24px rgba(0,0,0,.95)';
    }
  }

  if (confEl) {
    confEl.textContent = 'Tỉ lệ: ' + (confidence != null ? confidence : '--') + '%';
    if (confidence >= 80) confEl.style.color = '#22c55e';
    else if (confidence >= 60) confEl.style.color = '#fbbf24';
    else confEl.style.color = '#ffd700';
  }
}
function resetRobot() { updateRobot(null, null, null); }

/* ============ OPEN TOOL ============ */
function openTool(slugOrId) {
  var ports = (window.CONFIG && window.CONFIG.ports) || [];
  var tool = ports.filter(function(x) {
    return x.slug === slugOrId || x.name === slugOrId;
  })[0];

  if (!tool) return alert('Tool không tồn tại!');
  if (!tool.enabled) return alert('Tool đã tắt!');
  if (tool.maintenance) return alert('⚠️ TOOL ĐANG BẢO TRÌ\n\nVui lòng quay lại sau!');

  var s = getSession();
  if (!s) return alert('Vui lòng đăng nhập!');
  var u = s.user || {};
  var isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);

  if (!isAdmin && isKeyExpired()) {
    var goBuy = confirm(
      '🔒 KEY ĐÃ HẾT HẠN\n\n' +
      'Cần kích hoạt key VIP để sử dụng tool.\n\n' +
      '💰 Số dư: ' + fmt(u.balance || 0) + '\n\n' +
      '👉 OK = MUA KEY\n' +
      '👉 Cancel = NẠP TIỀN'
    );
    if (goBuy) showPage('vip');
    else showPage('deposit');
    return;
  }

  activeTool = tool;
  _lastSid = null;
  _im = false;
  toolRetry = 0;

  var gsName = document.getElementById('gsName');
  if (gsName) gsName.textContent = tool.name;
  var gsLogo = document.getElementById('gsLogo');
  if (gsLogo) gsLogo.src = (tool.image || '');

  setStatus('wait');

  /* ===== TOOL MD5 — HIỆN PANEL NHẬP MD5 ===== */
  if (tool.kind === 'md5' || tool.cat === 'md5') {
    if (typeof showMD5Panel === 'function') showMD5Panel(tool.name, tool.image);
    var scrMD5 = document.getElementById('game-screen');
    if (scrMD5) scrMD5.classList.add('show');
    setStatus('ok');
    return;
  } else {
    if (typeof hideMD5Panel === 'function') hideMD5Panel();
  }

  /* ===== TOOL THƯỜNG — HIỆN IFRAME GAME ===== */
  if (tool.api_url) {
    _engine = new TEEngine.Yq();
  }

  var frame = document.getElementById('gameFrame');
  if (frame) {
    if (tool.kind === 'panel' || !tool.game_url) {
      frame.src = 'about:blank';
      frame.style.display = 'none';
    } else {
      frame.style.display = 'block';
      frame.src = tool.game_url;
    }
  }

  var screen = document.getElementById('game-screen');
  if (screen) screen.classList.add('show');

  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }
  resetRobot();

  if (tool.api_url) {
    tickApi();
    toolInterval = setInterval(tickApi, 4000);
  } else {
    setStatus('ok');
  }
}

function closeGame() {
  var screen = document.getElementById('game-screen');
  if (screen) screen.classList.remove('show');
  var frame = document.getElementById('gameFrame');
  if (frame) { frame.src = 'about:blank'; frame.style.display = 'block'; }
  if (typeof hideMD5Panel === 'function') hideMD5Panel();
  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }
  activeTool = null;
}

/* ============ EXTRACT LIST ============ */
function extractList(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  var direct = ['list','sessions','history','items','soicau','results','result','data','records','rows','arr','content','game'];
  for (var i = 0; i < direct.length; i++) {
    var v = data[direct[i]];
    if (Array.isArray(v) && v.length) return v;
  }
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    for (var k in data.data) {
      if (Array.isArray(data.data[k]) && data.data[k].length) return data.data[k];
    }
  }
  if (data.payload && typeof data.payload === 'object') {
    for (var k2 in data.payload) {
      if (Array.isArray(data.payload[k2]) && data.payload[k2].length) return data.payload[k2];
    }
  }
  return null;
}

/* ============ NORMALIZE ITEM ============ */
function normalizeItem(it, idx) {
  if (!it || typeof it !== 'object') return null;
  var id = Number(it.id || it.sid || it.session || it.issue || it.ky || it.period || it.Phien || 0);
  var result = it.resultTruyenThong || it.result || it.ketQua || it.outcome || it.value || it.kq || it.KetQua;
  if (typeof result === 'string') {
    var up = result.toUpperCase();
    if (up === 'TAI' || up === 'TÀI' || up === 'T' || up === 'BIG') result = 'TAI';
    else if (up === 'XIU' || up === 'XỈU' || up === 'X' || up === 'SMALL') result = 'XIU';
    else result = null;
  } else if (result === 1 || result === '1') result = 'TAI';
  else if (result === 0 || result === '0') result = 'XIU';
  else result = null;
  if (!result) return null;
  if (!id || id <= 0) id = idx + 1;
  return { id: id, result: result, raw: it };
}

/* ============ TICK API ============ */
function tickApi() {
  if (!activeTool || !activeTool.api_url) return;
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, 9000);

  fetch(activeTool.api_url, { cache: 'no-store', signal: ctrl.signal })
    .then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      toolRetry = 0;
      var list = extractList(data);
      if (!Array.isArray(list) || !list.length) throw new Error('Không có dữ liệu');

      var norm = [];
      for (var i = 0; i < list.length; i++) {
        var n = normalizeItem(list[i], i);
        if (n) norm.push(n);
      }
      if (!norm.length) throw new Error('Không có kết quả');

      norm.sort(function (a, b) { return a.id - b.id; });
      var latest = norm[norm.length - 1];
      var nid = latest.id;
      setStatus('ok');
      var displaySid = nid + 1;

      if (_lastSid !== null && nid !== _lastSid) {
        _im = true;
        updateRobot(displaySid, null, null);
        setTimeout(function () {
          _im = false;
          analyze(norm, displaySid);
        }, 5000);
        _lastSid = nid;
        return;
      }
      _lastSid = nid;
      if (!_im) analyze(norm, displaySid);
    })
    .catch(function (e) {
      clearTimeout(timer);
      toolRetry++;
      if (toolRetry <= 2) {
        setStatus('wait');
        setTimeout(tickApi, 1500);
      } else {
        setStatus('err');
      }
    });
}

/* ============ ANALYZE ============ */
function analyze(asc, displaySid) {
  try {
    var hist = asc.map(function (x) { return x.raw; });
    _engine.load(hist);
    var qs = TEEngine.predict(_engine);
    if (qs && qs.g) {
      updateRobot(displaySid, qs.g, qs.conf);
    } else {
      updateRobot(displaySid, null, null);
    }
    setStatus('ok');
  } catch (e) {
    console.error('[analyze]', e);
  }
}

/* ============ DRAG ROBOT ============ */
(function () {
  function init() {
    var el = document.getElementById('robot');
    if (!el) return;
    try {
      var saved = localStorage.getItem('minhios_robot_pos');
      if (saved) {
        var pos = JSON.parse(saved);
        if (pos && pos.left) {
          el.style.left = pos.left;
          el.style.top = pos.top;
          el.style.bottom = 'auto';
          el.style.right = 'auto';
        }
      }
    } catch (_) {}
    var dragging = false, moved = false;
    var startX = 0, startY = 0, origX = 0, origY = 0;
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest('#box-content')) return;
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      var rect = el.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      el.style.left = (origX + dx) + 'px';
      el.style.top = (origY + dy) + 'px';
      el.style.bottom = 'auto';
      el.style.right = 'auto';
    });
    function stop() {
      if (dragging && moved) {
        try {
          localStorage.setItem('minhios_robot_pos',
            JSON.stringify({ left: el.style.left, top: el.style.top }));
        } catch (_) {}
      }
      dragging = false;
    }
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('pointerleave', stop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

window.openTool = openTool;
window.closeGame = closeGame;
