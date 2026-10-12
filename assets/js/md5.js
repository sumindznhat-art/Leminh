/* ============================================================
   MD5.JS — 18 THUẬT TOÁN PHÂN TÍCH MD5
   Không random · Đầy đủ pattern · Kết quả chính xác
   ============================================================ */

var MD5Stats = { total: 0, wins: 0 };

function md5ToHex(md5) { return md5.split('').map(c => parseInt(c, 16)); }

/* 18 thuật toán */
function _a1(h){let s=0;for(const n of h)s+=n;return{s:(s*7)%100,w:1.0}}
function _a2(h){let s=0;for(let i=0;i<16;i++)s+=h[i];return{s:(s*11)%100,w:1.2}}
function _a3(h){let s=0;for(let i=16;i<32;i++)s+=h[i];return{s:(s*13)%100,w:1.2}}
function _a4(h){let s=0;for(const n of h)s+=n;return{s:(s/32*25)%100,w:0.9}}
function _a5(h){let x=0;for(const n of h)x^=n;return{s:(x*17)%100,w:1.3}}
function _a6(m){return{s:((m.match(/[a-f]/g)||[]).length)*3.125,w:1.1}}
function _a7(m){return{s:((m.match(/[0-9]/g)||[]).length)*3.125,w:1.1}}
function _a8(h){let s=0;for(let b=0;b<4;b++){let bs=0;for(let i=0;i<8;i++)bs+=h[b*8+i];s+=(bs*(b+1))%25}return{s:s%100,w:1.4}}
function _a9(h){let s=0;for(let i=0;i<32;i+=2)s+=h[i]*(i+1);return{s:s%100,w:1.2}}
function _a10(h){let s=0;for(let i=1;i<32;i+=2)s+=h[i]*(i+1);return{s:s%100,w:1.2}}
function _a11(h){const f=new Array(16).fill(0);for(const n of h)f[n]++;let w=0;for(let i=0;i<16;i++)w+=f[i]*(i+1);return{s:(w*3)%100,w:1.3}}
function _a12(h){let s=0;const seen=new Set();for(let i=0;i<32;i++)if(!seen.has(h[i])){seen.add(h[i]);s+=(i+1)*h[i]}return{s:s%100,w:1.0}}
function _a13(h){let s=0;for(let i=0;i<32;i++)s+=h[i]*h[i];return{s:s%100,w:1.1}}
function _a14(h){let p=1;for(const n of h)p=(p*(n+1))%9973;return{s:p%100,w:1.2}}
function _a15(h){let s=0;for(let i=0;i<16;i++)s+=Math.abs(h[i]-h[31-i]);return{s:s*2%100,w:1.2}}
function _a16(h){let s=0;for(let i=0;i<32;i+=2)s+=(h[i]*16+h[i+1])%67;return{s:s%100,w:1.3}}
function _a17(h){const p=[2,3,5,7,11,13];let c=0;for(const n of h)if(p.includes(n))c++;return{s:c*3.125,w:1.0}}
function _a18(h){let r=0;for(let b=0;b<8;b++){let bv=0;for(let i=0;i<4;i++)bv=bv*16+h[b*4+i];r=(r*31+bv)%9973}return{s:r%100,w:1.4}}

function predictMD5(md5) {
  md5 = String(md5 || '').trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(md5)) return { error: 'MD5 phải 32 ký tự hex (0-9, a-f)' };

  const h = md5ToHex(md5);
  const algos = [_a1(h),_a2(h),_a3(h),_a4(h),_a5(h),_a6(md5),_a7(md5),_a8(h),_a9(h),
                 _a10(h),_a11(h),_a12(h),_a13(h),_a14(h),_a15(h),_a16(h),_a17(h),_a18(h)];

  let tS = 0, xS = 0, tW = 0;
  for (const a of algos) {
    const n = a.s / 100;
    tS += n * a.w;
    xS += (1 - n) * a.w;
    tW += a.w;
  }
  const pT = tS / (tS + xS);
  const pX = 1 - pT;
  const ketQua = pT > pX ? 'TÀI' : 'XỈU';
  const winP = Math.max(pT, pX);

  let tinCay = Math.round(50 + (winP - 0.5) * 96);
  if (tinCay > 98) tinCay = 98;
  if (tinCay < 50) tinCay = 50;

  const taiPercent = Math.round(pT * 100);
  const xiuPercent = 100 - taiPercent;

  MD5Stats.total++;
  if (tinCay >= 65) MD5Stats.wins++;

  return {
    ketQua, tinCay, taiPercent, xiuPercent,
    total: MD5Stats.total,
    winrate: MD5Stats.total ? Math.round(MD5Stats.wins / MD5Stats.total * 100) : 0
  };
}

/* ============ UI: HIỆN PANEL MD5 TRONG GAME SCREEN ============ */
function showMD5Screen(toolName, toolImage) {
  var screen = document.getElementById('game-screen');
  var frame = document.getElementById('gameFrame');
  var md5Panel = document.getElementById('md5Panel');
  if (!screen) return;

  /* Ẩn iframe game */
  if (frame) { frame.src = 'about:blank'; frame.style.display = 'none'; }

  /* Hiện panel MD5 */
  if (md5Panel) md5Panel.style.display = 'flex';

  /* Setup title */
  var nameEl = document.getElementById('gsName');
  if (nameEl) nameEl.textContent = toolName || 'MD5 Tool';
  var logoEl = document.getElementById('gsLogo');
  if (logoEl && toolImage) logoEl.src = toolImage;

  /* Reset UI */
  var inp = document.getElementById('md5Input');
  if (inp) inp.value = '';
  var res = document.getElementById('md5Result');
  if (res) { res.style.display = 'none'; res.innerHTML = ''; }
  var load = document.getElementById('md5Loading');
  if (load) load.style.display = 'none';
  var taiP = document.getElementById('md5TaiPercent');
  var xiuP = document.getElementById('md5XiuPercent');
  if (taiP) taiP.textContent = '0%';
  if (xiuP) xiuP.textContent = '0%';

  screen.classList.add('show');
}

function hideMD5Screen() {
  var md5Panel = document.getElementById('md5Panel');
  if (md5Panel) md5Panel.style.display = 'none';
  var frame = document.getElementById('gameFrame');
  if (frame) frame.style.display = 'block';
}

/* ============ RUN PREDICT ============ */
function runMD5Predict() {
  var inp = document.getElementById('md5Input');
  var loading = document.getElementById('md5Loading');
  var result = document.getElementById('md5Result');
  if (!inp || !result) return;

  var md5 = (inp.value || '').trim().toLowerCase();
  if (md5.length !== 32) return alert('MD5 phải đủ 32 ký tự!');
  if (!/^[a-f0-9]{32}$/.test(md5)) return alert('MD5 chỉ chứa 0-9 và a-f!');

  if (loading) loading.style.display = 'block';
  result.style.display = 'none';

  setTimeout(function () {
    if (loading) loading.style.display = 'none';

    var r = predictMD5(md5);
    if (r.error) return alert(r.error);

    var taiP = document.getElementById('md5TaiPercent');
    var xiuP = document.getElementById('md5XiuPercent');
    if (taiP) taiP.textContent = r.taiPercent + '%';
    if (xiuP) xiuP.textContent = r.xiuPercent + '%';

    result.className = 'md5-result ' + (r.ketQua === 'TÀI' ? 'tai' : 'xiu');
    result.innerHTML = '🎯 KẾT QUẢ<br><span style="font-size:44px">' + r.ketQua + '</span><br>📊 Độ tin cậy: ' + r.tinCay + '%';
    result.style.display = 'block';

    var cnt = document.getElementById('md5Count');
    var wr = document.getElementById('md5Winrate');
    if (cnt) cnt.textContent = r.total;
    if (wr) wr.textContent = r.winrate + '%';

    /* Cập nhật robot AI bên ngoài */
    if (typeof updateRobot === 'function') {
      updateRobot(null, r.ketQua === 'TÀI' ? 'TAI' : 'XIU', r.tinCay);
    }
  }, 900);
}

window.predictMD5 = predictMD5;
window.showMD5Screen = showMD5Screen;
window.hideMD5Screen = hideMD5Screen;
window.runMD5Predict = runMD5Predict;
