/* ============================================================
   TOOL DỰ ĐOÁN MD5
   
   ============================================================ */

var MD5Stats = { total: 0, wins: 0 };

function md5ToHex(md5) { return md5.split('').map(function(c){return parseInt(c,16)}); }

/* 18 thuật toán phân tích MD5 */
function _a1(h){var s=0,i;for(i=0;i<h.length;i++)s+=h[i];return{s:(s*7)%100,w:1.0}}
function _a2(h){var s=0,i;for(i=0;i<16;i++)s+=h[i];return{s:(s*11)%100,w:1.2}}
function _a3(h){var s=0,i;for(i=16;i<32;i++)s+=h[i];return{s:(s*13)%100,w:1.2}}
function _a4(h){var s=0,i;for(i=0;i<h.length;i++)s+=h[i];return{s:(s/32*25)%100,w:0.9}}
function _a5(h){var x=0,i;for(i=0;i<h.length;i++)x^=h[i];return{s:(x*17)%100,w:1.3}}
function _a6(m){var c=(m.match(/[a-f]/g)||[]).length;return{s:c*3.125,w:1.1}}
function _a7(m){var c=(m.match(/[0-9]/g)||[]).length;return{s:c*3.125,w:1.1}}
function _a8(h){var s=0,b,i,bs;for(b=0;b<4;b++){bs=0;for(i=0;i<8;i++)bs+=h[b*8+i];s+=(bs*(b+1))%25}return{s:s%100,w:1.4}}
function _a9(h){var s=0,i;for(i=0;i<32;i+=2)s+=h[i]*(i+1);return{s:s%100,w:1.2}}
function _a10(h){var s=0,i;for(i=1;i<32;i+=2)s+=h[i]*(i+1);return{s:s%100,w:1.2}}
function _a11(h){var f=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],i;for(i=0;i<h.length;i++)f[h[i]]++;var w=0;for(i=0;i<16;i++)w+=f[i]*(i+1);return{s:(w*3)%100,w:1.3}}
function _a12(h){var s=0,i,seen={};for(i=0;i<32;i++)if(!seen[h[i]]){seen[h[i]]=1;s+=(i+1)*h[i]}return{s:s%100,w:1.0}}
function _a13(h){var s=0,i;for(i=0;i<32;i++)s+=h[i]*h[i];return{s:s%100,w:1.1}}
function _a14(h){var p=1,i;for(i=0;i<h.length;i++)p=(p*(h[i]+1))%9973;return{s:p%100,w:1.2}}
function _a15(h){var s=0,i;for(i=0;i<16;i++)s+=Math.abs(h[i]-h[31-i]);return{s:s*2%100,w:1.2}}
function _a16(h){var s=0,i;for(i=0;i<32;i+=2)s+=(h[i]*16+h[i+1])%67;return{s:s%100,w:1.3}}
function _a17(h){var p=[2,3,5,7,11,13],c=0,i,j;for(i=0;i<h.length;i++)for(j=0;j<p.length;j++)if(h[i]===p[j]){c++;break}return{s:c*3.125,w:1.0}}
function _a18(h){var r=0,b,i,bv;for(b=0;b<8;b++){bv=0;for(i=0;i<4;i++)bv=bv*16+h[b*4+i];r=(r*31+bv)%9973}return{s:r%100,w:1.4}}

function predictMD5(md5) {
  md5 = String(md5 || '').trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(md5)) return { error: 'MD5 phải 32 ký tự hex (0-9, a-f)' };

  var h = md5ToHex(md5);
  var algos = [_a1(h),_a2(h),_a3(h),_a4(h),_a5(h),_a6(md5),_a7(md5),_a8(h),_a9(h),
               _a10(h),_a11(h),_a12(h),_a13(h),_a14(h),_a15(h),_a16(h),_a17(h),_a18(h)];

  var tS=0, xS=0, i, a, n;
  for (i=0; i<algos.length; i++) {
    a = algos[i];
    n = a.s / 100;
    tS += n * a.w;
    xS += (1 - n) * a.w;
  }
  var pT = tS / (tS + xS);
  var pX = 1 - pT;
  var ketQua = pT > pX ? 'TÀI' : 'XỈU';
  var winP = Math.max(pT, pX);

  var tinCay = Math.round(50 + (winP - 0.5) * 96);
  if (tinCay > 98) tinCay = 98;
  if (tinCay < 50) tinCay = 50;

  var taiPercent = Math.round(pT * 100);
  var xiuPercent = 100 - taiPercent;

  MD5Stats.total++;
  if (tinCay >= 65) MD5Stats.wins++;

  return {
    ketQua: ketQua,
    tinCay: tinCay,
    taiPercent: taiPercent,
    xiuPercent: xiuPercent,
    total: MD5Stats.total,
    winrate: MD5Stats.total ? Math.round(MD5Stats.wins / MD5Stats.total * 100) : 0
  };
}

/* ============ HIỆN PANEL MD5 TRONG GAME SCREEN ============ */
function showMD5Panel(toolName, toolImage) {
  var frame = document.getElementById('gameFrame');
  var md5Panel = document.getElementById('md5Panel');
  if (frame) { frame.style.display = 'none'; frame.src = 'about:blank'; }
  if (md5Panel) md5Panel.style.display = 'block';

  var nameEl = document.getElementById('gsName');
  if (nameEl) nameEl.textContent = toolName || 'MD5 Tool';
  var logoEl = document.getElementById('gsLogo');
  if (logoEl && toolImage) logoEl.src = toolImage;

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
}

function hideMD5Panel() {
  var md5Panel = document.getElementById('md5Panel');
  if (md5Panel) md5Panel.style.display = 'none';
  var frame = document.getElementById('gameFrame');
  if (frame) frame.style.display = 'block';
}

/* ============ CHẠY DỰ ĐOÁN ============ */
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

    /* Cập nhật robot AI */
    if (typeof updateRobot === 'function') {
      updateRobot(null, r.ketQua === 'TÀI' ? 'TAI' : 'XIU', r.tinCay);
    }
  }, 900);
}

window.predictMD5 = predictMD5;
window.showMD5Panel = showMD5Panel;
window.hideMD5Panel = hideMD5Panel;
window.runMD5Predict = runMD5Predict;
