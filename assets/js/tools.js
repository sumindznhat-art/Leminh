/* ============================================================
   TOOLS.JS — MỞ GAME + ROBOT AI + AUTO CƯỢC
   ============================================================ */

var activeTool = null, toolInterval = null;
var _engine = null, _lastSid = null, _lastGy = null, _im = false;
var _robotDragInit = false, _robotOpen = false;

function setStatus(state, text) {
  var el = document.getElementById('gsStatus'), txt = document.getElementById('gsStatusText');
  if (!el || !txt) return;
  el.classList.remove('err','wait');
  if (state === 'err') el.classList.add('err');
  else if (state === 'wait') el.classList.add('wait');
  txt.textContent = text;
}

/* ============================================================
   MỞ TOOL
   ============================================================ */
function openTool(slugOrId) {
  var ports = window.CONFIG.ports || [];
  var tool = ports.filter(function(x) { return x.slug === slugOrId || x.name === slugOrId; })[0];
  if (!tool) return alert('Tool không tồn tại!');
  if (!tool.enabled) return alert('🚫 Tool đã tắt!');
  if (tool.maintenance) return alert('🚧 Tool đang bảo trì!');

  var s = getSession(); if (!s) return alert('Vui lòng đăng nhập!');
  var u = s.user;
  var isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);
  var isVIP = isAdmin || (tool.vip == 0) || (Number(u.key_expiry) > Date.now());
  if (!isVIP) {
    var goBuy = confirm('🔒 CẦN KÍCH HOẠT VIP\n\n💰 Số dư: ' + fmt(u.balance) + '\n\nBấm OK để mua VIP');
    if (goBuy) showPage('vip'); else openKeyModal();
    return;
  }

  activeTool = tool;
  _engine = new TEEngine.Yq();
  _lastSid = null; _lastGy = null; _im = false;

  document.getElementById('gsName').textContent = tool.name;
  document.getElementById('gsLogo').src = getToolImage(tool) || '';
  document.getElementById('panelTitle').textContent = tool.cat === 'baccarat' ? 'BACCARAT' : 'TÀI XỈU';

  setStatus('wait', 'Đang kết nối');

  /* Load iframe hoặc ẩn nếu kind=panel */
  var frame = document.getElementById('gameFrame');
  if (tool.kind === 'panel' || !tool.game_url) {
    if (frame) { frame.src = 'about:blank'; frame.style.display = 'none'; }
  } else {
    if (frame) { frame.style.display = 'block'; frame.src = tool.game_url; }
  }

  document.getElementById('game-screen').classList.add('show');

  if (tool.api_url && typeof apiUpdateLastApi === 'function') apiUpdateLastApi(tool.api_url, tool.name).catch(function(){});

  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }
  resetPanel();

  /* Hiện Robot thay vì panel cũ */
  openRobotPanel();

  if (tool.api_url) {
    tickApi();
    toolInterval = setInterval(tickApi, 4000);
  } else {
    setStatus('ok', 'OK');
    setRobotStatus('Chế độ xem', 'idle');
  }
}

function closeGame() {
  document.getElementById('game-screen').classList.remove('show');
  var frame = document.getElementById('gameFrame');
  if (frame) { frame.src = 'about:blank'; frame.style.display = 'block'; }
  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }
  closeRobotPanel();
  activeTool = null;
}

/* ============================================================
   ROBOT PANEL — KÉO THẢ ĐƯỢC
   ============================================================ */
function openRobotPanel() {
  var old = document.getElementById('robotOverlay');
  if (old) old.remove();

  var robot = document.createElement('div');
  robot.id = 'robotOverlay';
  robot.innerHTML = `
    <div id="robotBox" class="robot-box">
      <img src="https://i.postimg.cc/j26ZMVPs/IMG-0481.gif" alt="Robot AI" draggable="false">
      <div class="robot-content">
        <div class="robot-row">
          <span class="robot-phien" id="robotPhien">#0:</span>
          <span class="robot-pred" id="robotPred">--</span>
        </div>
        <div class="robot-conf" id="robotConf">Tỉ lệ: --%</div>
      </div>
    </div>
    <div class="robot-tag" id="robotTag">AI PRO</div>
  `;
  document.body.appendChild(robot);
  _robotOpen = true;

  /* Kéo thả */
  initRobotDrag();

  /* Đặt vị trí ban đầu */
  robot.style.left = '14px';
  robot.style.top = '90px';

  /* Cập nhật dữ liệu ban đầu */
  updateRobotUI();
}

function closeRobotPanel() {
  var r = document.getElementById('robotOverlay');
  if (r) r.remove();
  _robotOpen = false;
}

function initRobotDrag() {
  var el = document.getElementById('robotOverlay');
  if (!el) return;
  var drag = false, sx = 0, sy = 0, ix = 0, iy = 0;

  function down(e) {
    var t = e.touches ? e.touches[0] : e;
    drag = true;
    sx = t.clientX; sy = t.clientY;
    var rect = el.getBoundingClientRect();
    ix = rect.left; iy = rect.top;
    el.style.left = ix + 'px';
    el.style.top = iy + 'px';
    el.style.bottom = 'auto';
    el.style.right = 'auto';
    el.style.cursor = 'grabbing';
    e.preventDefault();
  }
  function move(e) {
    if (!drag) return;
    var t = e.touches ? e.touches[0] : e;
    var dx = t.clientX - sx;
    var dy = t.clientY - sy;
    el.style.left = (ix + dx) + 'px';
    el.style.top = (iy + dy) + 'px';
    e.preventDefault();
  }
  function up() { drag = false; el.style.cursor = 'grab'; }

  el.addEventListener('mousedown', down);
  el.addEventListener('touchstart', down, { passive: false });
  document.addEventListener('mousemove', move);
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('mouseup', up);
  document.addEventListener('touchend', up);
}

function updateRobotUI() {
  if (!_robotOpen) return;
  var s = getSession(); if (!s) return;
  var u = s.user;
  var pred = document.getElementById('robotPred');
  var phien = document.getElementById('robotPhien');
  var conf = document.getElementById('robotConf');
  if (!pred) return;

  var phienNum = (typeof _lastSid !== 'undefined' && _lastSid) ? _lastSid : '0';
  phien.textContent = '#' + phienNum + ':';

  if (_lastGy) {
    pred.textContent = _lastGy;
    pred.style.color = _lastGy === 'TAI' ? '#00ff88' : '#ff4444';
  } else {
    pred.textContent = '--';
    pred.style.color = '#8b93a7';
  }
}

function setRobotStatus(text, type) {
  var el = document.getElementById('robotTag');
  if (!el) return;
  el.textContent = text;
  el.className = 'robot-tag ' + (type || 'idle');
}

/* ============================================================
   PANEL CŨ — ẨN ĐI (không dùng nữa)
   ============================================================ */
function resetPanel() {
  /* Không làm gì — đã chuyển sang robot */
}
function setCircles() {
  /* Không dùng */
}
function togglePanel() {
  /* Không dùng */
}

/* ============================================================
   API TICK
   ============================================================ */
function tickApi() {
  if (!activeTool || !activeTool.api_url) return;
  fetch(activeTool.api_url, { cache: 'no-store' }).then(function(r) {
    if (!r.ok) throw 0;
    return r.json();
  }).then(function(data) {
    var list = data.list || data.data || data.sessions || data.result || data.history || data.items || data.soicau;
    if (!Array.isArray(list) && data.data && typeof data.data === 'object') {
      var first = Object.values(data.data).find(function(v) { return Array.isArray(v); });
      if (first) list = first;
    }
    if (!Array.isArray(list) || !list.length) throw 0;

    var asc = list.slice().sort(function(a, b) { return (a.id || 0) - (b.id || 0); });
    var nid = list[0].id || asc[asc.length-1].id || Date.now();

    setStatus('ok', 'OK');
    _lastSid = nid;

    /* Nếu phát hiện ván mới → reset trạng thái chờ */
    if (window._prevSid === undefined) {
      window._prevSid = nid;
      analyze(asc, nid);
      return;
    }
    if (nid !== window._prevSid) {
      _im = true;
      setRobotStatus('Chờ ván mới', 'wait');
      setTimeout(function() {
        _im = false;
        window._prevSid = nid;
        analyze(asc, nid);
      }, 4000);
      return;
    }
    if (!_im) analyze(asc, nid);
  }).catch(function() {
    setStatus('err', 'Lỗi');
    setRobotStatus('Lỗi kết nối', 'err');
  });
}

function analyze(asc, nid) {
  try {
    _engine.load(asc);
    var qs = TEEngine.predict(_engine);

    if (qs.g) {
      _lastGy = qs.g;
      var confEl = document.getElementById('robotConf');
      if (confEl) confEl.textContent = 'Tỉ lệ: ' + qs.conf + '%';
      setRobotStatus('Sẵn sàng', 'ok');
      setStatus('ok', 'Sẵn sàng');
    } else {
      _lastGy = null;
      setRobotStatus('Chờ dữ liệu', 'idle');
    }
    updateRobotUI();
  } catch(e) { console.error('Analyze error', e); }
}

/* Auto-play music */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function once() {
      var audio = document.getElementById('bgMusic');
      if (audio && audio.src && audio.paused && window.CONFIG.music_url) {
        audio.volume = 0.5;
        audio.play().catch(function(){});
      }
      document.removeEventListener('click', once);
    }, { once: true });
  });
})();

/* ============================================================
   EXPOSE
   ============================================================ */
window.openTool = openTool;
window.closeGame = closeGame;
window.togglePanel = togglePanel;
window.openRobotPanel = openRobotPanel;
window.closeRobotPanel = closeRobotPanel;
