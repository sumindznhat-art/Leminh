var activeTool = null, toolInterval = null;
var _engine = null, _lastSid = null, _lastGy = null, _im = false;

function setStatus(state, text) { var el = document.getElementById('gsStatus'), txt = document.getElementById('gsStatusText'); if (!el || !txt) return; el.classList.remove('err','wait'); if (state === 'err') el.classList.add('err'); else if (state === 'wait') el.classList.add('wait'); txt.textContent = text; }

function openTool(slugOrId) {
  var ports = window.CONFIG.ports || [];
  var tool = ports.filter(function(x) { return x.slug === slugOrId || x.name === slugOrId; })[0];
  if (!tool) return alert('Tool không tồn tại!');
  if (!tool.enabled) return alert('Tool đã tắt!');
  if (tool.maintenance) return alert('Tool đang bảo trì!');
  var s = getSession(); if (!s) return alert('Đăng nhập!');
  var u = s.user;
  var isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);
  var isVIP = isAdmin || (tool.vip == 0) || (Number(u.key_expiry) > Date.now());
  if (!isVIP) { var goBuy = confirm('CẦN KÍCH HOẠT VIP\n\nSố dư: ' + fmt(u.balance)); if (goBuy) showPage('vip'); else openKeyModal(); return; }
  activeTool = tool;
  _engine = new TEEngine.Yq();
  _lastSid = null; _lastGy = null; _im = false;
  document.getElementById('gsName').textContent = tool.name;
  document.getElementById('gsLogo').src = getToolImage(tool) || '';
  document.getElementById('panelTitle').textContent = tool.cat === 'baccarat' ? 'BACCARAT AI' : 'TÀI XỈU';
  setStatus('wait', 'Đang kết nối');
  var frame = document.getElementById('gameFrame');
  if (tool.kind === 'panel' || !tool.game_url) { if (frame) { frame.src = 'about:blank'; frame.style.display = 'none'; } }
  else { if (frame) { frame.style.display = 'block'; frame.src = tool.game_url; } }
  document.getElementById('game-screen').classList.add('show');
  if (tool.api_url && typeof apiUpdateLastApi === 'function') apiUpdateLastApi(tool.api_url, tool.name).catch(function(){});
  if (toolInterval) { clearInterval(toolInterval); toolInterval = null; }
  resetPanel();
  if (tool.api_url) { tickApi(); toolInterval = setInterval(tickApi, 4000); }
  else { setStatus('ok', 'OK'); var st = document.getElementById('statusText'); if (st) st.textContent = 'Chế độ xem'; }
}

function closeGame() { document.getElementById('game-screen').classList.remove('show'); var frame = document.getElementById('gameFrame'); if (frame) { frame.src = 'about:blank'; frame.style.display = 'block'; } if (toolInterval) { clearInterval(toolInterval); toolInterval = null; } activeTool = null; }
function togglePanel() { var card = document.querySelector('.predict-card'); if (card) card.classList.toggle('collapsed'); }
function resetPanel() { var tc = document.getElementById('taiCircle'), xc = document.getElementById('xiuCircle'); if (tc) { tc.className = 'tx-circle tai'; tc.textContent = '--%'; } if (xc) { xc.className = 'tx-circle xiu'; xc.textContent = '--%'; } var sid = document.getElementById('sidValue'); if (sid) sid.textContent = '#@hk'; var st = document.getElementById('statusText'); if (st) { st.textContent = 'Đang kết nối...'; st.classList.remove('analyzing'); } }
function setCircles(gy, active, rt, rx) { var tc = document.getElementById('taiCircle'), xc = document.getElementById('xiuCircle'); if (!tc || !xc) return; tc.className = 'tx-circle tai'; xc.className = 'tx-circle xiu'; if (rt != null && rx != null) { tc.textContent = Math.round(rt) + '%'; xc.textContent = Math.round(rx) + '%'; } else { tc.textContent = '--%'; xc.textContent = '--%'; } if (gy) { var el = gy === 'TAI' ? tc : xc; el.classList.add(active ? 'active' : 'resting'); } }

function tickApi() {
  if (!activeTool || !activeTool.api_url) return;
  fetch(activeTool.api_url, { cache: 'no-store' }).then(function(r) { if (!r.ok) throw 0; return r.json(); }).then(function(data) {
    var list = data.list || data.data || data.sessions || data.result || data.history || data.items || data.soicau;
    if (!Array.isArray(list) && data.data && typeof data.data === 'object') { var first = Object.values(data.data).find(function(v) { return Array.isArray(v); }); if (first) list = first; }
    if (!Array.isArray(list) || !list.length) throw 0;
    var asc = list.slice().sort(function(a, b) { return (a.id || 0) - (b.id || 0); });
    var nid = list[0].id || asc[asc.length-1].id || Date.now();
    setStatus('ok', 'OK');
    var sid = document.getElementById('sidValue'); if (sid) sid.textContent = '#' + (nid + 1);
    if (_lastSid !== null && nid !== _lastSid) { _im = true; setCircles(null, false, null, null); var st = document.getElementById('statusText'); if (st) st.textContent = 'Chờ ván mới...'; setTimeout(function() { _im = false; analyze(asc, nid); }, 5000); _lastSid = nid; return; }
    _lastSid = nid;
    if (!_im) analyze(asc, nid);
  }).catch(function() { setStatus('err', 'Lỗi'); var st = document.getElementById('statusText'); if (st) st.textContent = 'Đang kết nối lại...'; });
}

function analyze(asc, nid) {
  try {
    _engine.load(asc);
    var qs = TEEngine.predict(_engine);
    var sid = document.getElementById('sidValue'); if (sid) sid.textContent = '#' + (nid + 1);
    if (qs.g) { setCircles(qs.g, true, qs.pT, qs.pX); var st = document.getElementById('statusText'); if (st) { st.textContent = 'Sẵn sàng (' + qs.conf + '%)'; st.classList.add('analyzing'); } _lastGy = qs.g; }
    else { setCircles(null, false, null, null); var st2 = document.getElementById('statusText'); if (st2) st2.textContent = 'Chờ dữ liệu...'; _lastGy = null; }
  } catch(e) {}
}

(function() { document.addEventListener('DOMContentLoaded', function() { var el = document.getElementById('dragPanel'); if (!el) return; var drag = false, sx, sy, ix, iy; el.addEventListener('pointerdown', function(e) { if (e.target.closest('.toggle-btn')) return; drag = true; sx = e.clientX; sy = e.clientY; ix = el.offsetLeft; iy = el.offsetTop; try { el.setPointerCapture(e.pointerId); } catch(_) {} }); el.addEventListener('pointermove', function(e) { if (!drag) return; var dx = e.clientX - sx, dy = e.clientY - sy; requestAnimationFrame(function() { el.style.left = (ix + dx) + 'px'; el.style.top = (iy + dy) + 'px'; el.style.right = 'auto'; }); }); var stop = function() { drag = false; }; el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); }); })();

window.openTool = openTool;
window.closeGame = closeGame;
window.togglePanel = togglePanel;
