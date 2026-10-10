/* ============================================================
   TOOL MINHIOS — tools.js (REBUILD)
   Khớp với HTML thực tế: #robot, #phien-text, #prediction-text,
   #confidence-text, #gameFrame, #gsStatus, #gsStatusText
   ============================================================ */
var activeTool = null, toolInterval = null;
var _engine = null, _lastSid = null, _lastGy = null, _im = false;

/* ---------- STATUS ---------- */
function setStatus(state, text) {
  var el = document.getElementById('gsStatus');
  var txt = document.getElementById('gsStatusText');
  if (!el || !txt) return;
  el.classList.remove('err', 'wait');
  if (state === 'err') el.classList.add('err');
  else if (state === 'wait') el.classList.add('wait');
  txt.textContent = text;
}

/* ---------- ROBOT DISPLAY ---------- */
function updateRobot(sid, prediction, confidence) {
  var pEl    = document.getElementById('phien-text');
  var predEl = document.getElementById('prediction-text');
  var confEl = document.getElementById('confidence-text');

  if (pEl) {
    pEl.textContent = '#' + (sid != null && sid > 0 ? sid : '0') + ':';
  }
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
  }
}

function resetRobot() { updateRobot(null, null, null); }

/* ---------- OPEN / CLOSE TOOL ---------- */
function openTool(slugOrId) {
  var ports = (window.CONFIG && window.CONFIG.ports) || [];
  var tool = ports.filter(function(x) {
    return x.slug === slugOrId || x.name === slugOrId;
  })[0];
  if (!tool)                  return alert('Tool không tồn tại!');
  if (!tool.enabled)          return alert('Tool đã tắt!');
  if (tool.maintenance)       return alert('Tool đang bảo trì!');

  var s = getSession();
  if (!s) return alert('Vui lòng đăng nhập!');
  var u = s.user || {};
  var isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);
  var isVIP   = isAdmin || (tool.vip == 0) || (Number(u.key_expiry) > Date.now());
  if (!isVIP) {
    var goBuy = confirm('CẦN KÍCH HOẠT VIP\n\nSố dư: ' + fmt(u.balance || 0));
    if (goBuy) showPage('vip');
    else openKeyModal();
    return;
  }

  activeTool = tool;
  _engine = new TEEngine.Yq();
  _lastSid = null;
  _lastGy  = null;
  _im      = false;

  var gsName = document.getElementById('gsName');
  if (gsName) gsName.textContent = tool.name;
  var gsLogo = document.getElementById('gsLogo');
  if (gsLogo) gsLogo.src = getToolImage(tool) || '';

  setStatus('wait', 'Đang kết nối');

  var frame = document.getElementById('gameFrame');
  if (tool.kind === 'panel' || !tool.game_url) {
    if (frame) { frame.src = 'about:blank'; frame.style.display = 'none'; }
  } else {
    if (frame) { frame.style.display = 'block'; frame.src = tool.game_url; }
  }

  var screen = document.getElementById('game-screen');
  if (screen) screen.classList.add('show');

  if (tool.api_url && typeof apiUpdateLastApi === 'function') {
    apiUpdateLastApi(tool.api_url, tool.name).catch(function () {});
  }

  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }
  resetRobot();

  if (tool.api_url) {
    tickApi();
    toolInterval = setInterval(tickApi, 4000);
  } else {
    setStatus('ok', 'OK');
  }
}

function closeGame() {
  var screen = document.getElementById('game-screen');
  if (screen) screen.classList.remove('show');
  var frame = document.getElementById('gameFrame');
  if (frame) { frame.src = 'about:blank'; frame.style.display = 'block'; }
  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }
  activeTool = null;
}

/* ---------- FETCH + EXTRACT LIST (hỗ trợ nhiều format API) ---------- */
function extractList(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  var cands = [data.list, data.sessions, data.history, data.items,
               data.soicau, data.results, data.result, data.data];
  for (var i = 0; i < cands.length; i++) {
    var v = cands[i];
    if (Array.isArray(v) && v.length) return v;
  }
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    for (var k in data.data) {
      if (Array.isArray(data.data[k]) && data.data[k].length) return data.data[k];
    }
  }
  return null;
}

/* ---------- TICK ---------- */
function tickApi() {
  if (!activeTool || !activeTool.api_url) return;

  fetch(activeTool.api_url, { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (data) {
      var list = extractList(data);
      if (!Array.isArray(list) || !list.length) throw 0;

      // Sort tăng dần theo id, lấy phần tử mới nhất
      var asc = list.slice().sort(function (a, b) {
        return (Number(a.id) || 0) - (Number(b.id) || 0);
      });
      var latest = asc[asc.length - 1];
      var nid = Number(latest.id);
      if (!isFinite(nid) || nid <= 0) nid = Date.now();

      setStatus('ok', 'OK');
      var displaySid = nid + 1;

      // Phát hiện ván mới
      if (_lastSid !== null && nid !== _lastSid) {
        _im = true;
        updateRobot(displaySid, null, null);
        setTimeout(function () {
          _im = false;
          analyze(asc, displaySid);
        }, 5000);
        _lastSid = nid;
        return;
      }
      _lastSid = nid;
      if (!_im) analyze(asc, displaySid);
    })
    .catch(function () {
      setStatus('err', 'Lỗi kết nối');
    });
}

/* ---------- ANALYZE ---------- */
function analyze(asc, displaySid) {
  try {
    _engine.load(asc);
    var qs = TEEngine.predict(_engine);
    if (qs && qs.g) {
      updateRobot(displaySid, qs.g, qs.conf);
      setStatus('ok', 'Sẵn sàng ' + qs.conf + '%');
      _lastGy = qs.g;
    } else {
      updateRobot(displaySid, null, null);
      setStatus('ok', 'Chờ dữ liệu...');
      _lastGy = null;
    }
  } catch (e) {
    console.error('[analyze]', e);
  }
}

/* ---------- DRAG ROBOT (với lưu vị trí) ---------- */
(function () {
  function init() {
    var el = document.getElementById('robot');
    if (!el) return;

    // Phục hồi vị trí đã lưu
    try {
      var saved = localStorage.getItem('minhios_robot_pos');
      if (saved) {
        var pos = JSON.parse(saved);
        if (pos && pos.left) {
          el.style.left = pos.left;
          el.style.top  = pos.top;
          el.style.bottom = 'auto';
          el.style.right  = 'auto';
        }
      }
    } catch (_) {}

    var dragging = false, moved = false;
    var startX = 0, startY = 0, origX = 0, origY = 0;

    el.addEventListener('pointerdown', function (e) {
      // Bỏ qua click trên text
      if (e.target.closest('#box-content')) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      var rect = el.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });

    el.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      el.style.left   = (origX + dx) + 'px';
      el.style.top    = (origY + dy) + 'px';
      el.style.bottom = 'auto';
      el.style.right  = 'auto';
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ---------- EXPORTS ---------- */
window.openTool  = openTool;
window.closeGame = closeGame;
