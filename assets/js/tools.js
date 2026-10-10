/* ============================================================
   TOOLS.JS — MỞ GAME + ROBOT AI KÉO THẢ
   ============================================================ */

var activeTool = null, toolInterval = null;
var _engine = null, _lastSid = null, _lastGy = null, _im = false;
var _prevSid = null;

function setStatus(state, text) {
  var el = document.getElementById('gsStatus'), txt = document.getElementById('gsStatusText');
  if (!el || !txt) return;
  el.classList.remove('err','wait');
  if (state === 'err') el.classList.add('err');
  else if (state === 'wait') el.classList.add('wait');
  txt.textContent = text;
}

function openTool(slugOrId) {
  var ports = window.CONFIG.ports || [];
  var tool = ports.filter(function(x) { return x.slug === slugOrId || x.name === slugOrId; })[0];
  if (!tool) return alert('Tool không tồn tại!');
  if (!tool.enabled) return alert('🚫 Tool đã tắt!');
  if (tool.maintenance) return alert('🚧 Tool đang bảo trì!');

  var s = getSession();
  if (!s) return alert('Vui lòng đăng nhập!');
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
  _lastSid = null;
  _lastGy = null;
  _im = false;
  _prevSid = null;

  document.getElementById('gsName').textContent = tool.name;
  document.getElementById('gsLogo').src = getToolImage(tool) || '';
  setStatus('wait', 'Đang kết nối');

  var frame = document.getElementById('gameFrame');
  if (tool.kind === 'panel' || !tool.game_url) {
    if (frame) { frame.src = 'about:blank'; frame.style.display = 'none'; }
  } else {
    if (frame) { frame.style.display = 'block'; frame.src = tool.game_url; }
  }

  document.getElementById('game-screen').classList.add('show');

  /* Reset robot vị trí mặc định */
  var robot = document.getElementById('robot');
  if (robot) {
    robot.style.left = '20px';
    robot.style.top = 'auto';
    robot.style.right = 'auto';
    robot.style.bottom = '30px';
  }

  /* Reset text robot */
  var pt = document.getElementById('phien-text');
  var pr = document.getElementById('prediction-text');
  var cf = document.getElementById('confidence-text');
  if (pt) pt.textContent = '#0:';
  if (pr) { pr.textContent = '--'; pr.style.color = '#8b93a7'; }
  if (cf) cf.textContent = 'Tỉ lệ: --%';

  if (tool.api_url && typeof apiUpdateLastApi === 'function') {
    apiUpdateLastApi(tool.api_url, tool.name).catch(function(){});
  }

  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }

  if (tool.api_url) {
    tickApi();
    toolInterval = setInterval(tickApi, 4000);
  } else {
    setStatus('ok', 'OK');
  }
}

function closeGame() {
  var gs = document.getElementById('game-screen');
  if (gs) gs.classList.remove('show');
  var frame = document.getElementById('gameFrame');
  if (frame) { frame.src = 'about:blank'; frame.style.display = 'block'; }
  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }
  activeTool = null;
}

/* ============ KÉO THẢ ROBOT ============ */
(function() {
  function initDrag() {
    var robot = document.getElementById('robot');
    if (!robot) return;

    var drag = false, sx = 0, sy = 0, ox = 0, oy = 0;

    function gp(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function down(e) {
      var p = gp(e);
      var r = robot.getBoundingClientRect();
      drag = true;
      sx = p.x; sy = p.y;
      ox = r.left; oy = r.top;
      robot.style.left = ox + 'px';
      robot.style.top = oy + 'px';
      robot.style.right = 'auto';
      robot.style.bottom = 'auto';
      robot.style.cursor = 'grabbing';
      e.preventDefault();
    }

    function move(e) {
      if (!drag) return;
      var p = gp(e);
      robot.style.left = (ox + p.x - sx) + 'px';
      robot.style.top = (oy + p.y - sy) + 'px';
      e.preventDefault();
    }

    function up() {
      if (!drag) return;
      drag = false;
      robot.style.cursor = 'grab';
    }

    robot.addEventListener('mousedown', down);
    robot.addEventListener('touchstart', down, { passive: false });
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDrag);
  else initDrag();
})();

/* ============ UPDATE ROBOT ============ */
function updateRobot(nid, pred, conf) {
  var pt = document.getElementById('phien-text');
  var pr = document.getElementById('prediction-text');
  var cf = document.getElementById('confidence-text');
  if (pt && nid != null) pt.textContent = '#' + nid + ':';
  if (pr) {
    if (pred) {
      pr.textContent = pred;
      pr.style.color = pred === 'TAI' ? '#00ff88' : '#ff4444';
      pr.style.transform = 'scale(1.1)';
      setTimeout(function() { pr.style.transform = 'scale(1)'; }, 150);
    } else {
      pr.textContent = '--';
      pr.style.color = '#8b93a7';
    }
  }
  if (cf) cf.textContent = 'Tỉ lệ: ' + (conf != null ? conf + '%' : '--%');
}

/* ============ API TICK ============ */
function tickApi() {
  if (!activeTool || !activeTool.api_url) return;

  fetch(activeTool.api_url, { cache: 'no-store' })
    .then(function(r) { if (!r.ok) throw 0; return r.json(); })
    .then(function(data) {
      var list = data.list || data.data || data.sessions || data.result || data.history || data.items || data.soicau;
      if (!Array.isArray(list) && data.data && typeof data.data === 'object') {
        var first = Object.values(data.data).find(function(v) { return Array.isArray(v); });
        if (first) list = first;
      }
      if (!Array.isArray(list) || !list.length) throw 0;

      var asc = list.slice().sort(function(a, b) { return (a.id || 0) - (b.id || 0); });
      var nid = list[0].id || asc[asc.length-1].id || Date.now();

      setStatus('ok', 'OK');

      if (_prevSid === null) {
        _prevSid = nid;
        _lastSid = nid;
        analyze(asc, nid);
        return;
      }
      if (nid !== _prevSid) {
        _im = true;
        updateRobot(nid + 1, null, null);
        setTimeout(function() {
          _im = false;
          _prevSid = nid;
          _lastSid = nid;
          analyze(asc, nid);
        }, 4000);
        return;
      }
      if (!_im) analyze(asc, nid);
    })
    .catch(function() {
      setStatus('err', 'Lỗi');
    });
}

function analyze(asc, nid) {
  try {
    _engine.load(asc);
    var qs = TEEngine.predict(_engine);
    _lastGy = qs.g;
    _lastSid = nid;
    updateRobot(nid + 1, qs.g, qs.conf);
    setStatus('ok', 'Sẵn sàng');
  } catch (e) {
    console.error('Analyze error', e);
  }
}

window.openTool = openTool;
window.closeGame = closeGame;
window.updateRobot = updateRobot;
