var activeTool=null,toolInterval=null,toolRetry=0;
var _engine=null,_lastSid=null,_im=false;

function setStatus(state){
  var el=$('gsStatus');if(!el)return;
  el.classList.remove('err','wait');
  if(state==='err')el.classList.add('err');
  else if(state==='wait')el.classList.add('wait');
}

function updateRobot(sid,pred,conf){
  var pEl=$('phien-text'),predEl=$('prediction-text'),confEl=$('confidence-text');
  if(pEl)pEl.textContent='#'+(sid!=null&&sid>0?sid:'0')+':';
  if(predEl){
    if(pred==='TAI'){predEl.textContent='TÀI';predEl.style.color='#ff3d71'}
    else if(pred==='XIU'){predEl.textContent='XỈU';predEl.style.color='#8b5cf6'}
    else{predEl.textContent='--';predEl.style.color='#fff'}
  }
  if(confEl){confEl.textContent='Tỉ lệ: '+(conf!=null?conf:'--')+'%';
    if(conf>=80)confEl.style.color='#22c55e';else if(conf>=60)confEl.style.color='#fbbf24';else confEl.style.color='#ffd700';
  }
}
function resetRobot(){updateRobot(null,null,null)}

function openTool(slug){
  var ports=(window.CONFIG&&window.CONFIG.ports)||[];
  var tool=ports.filter(function(x){return x.slug===slug})[0];
  if(!tool)return alert('Tool không tồn tại!');
  if(!tool.enabled)return alert('Tool đã tắt!');
  if(tool.maintenance)return alert('⚠️ TOOL ĐANG BẢO TRÌ!');
  var s=getSession();if(!s)return alert('Đăng nhập!');
  var u=s.user,isAdm=isAdmin(u);
  if(!isAdm&&isKeyExpired()){
    if(confirm('🔒 KEY ĐÃ HẾT HẠN!\n\nMua key để dùng tool?'))showPage('vip');
    return;
  }

  /* MD5 TOOL — MỞ MÀN HÌNH RIÊNG */
  if(tool.kind==='md5'||tool.cat==='md5'){
    var md5Scr=$('md5-screen');
    if(md5Scr)md5Scr.classList.add('show');
    resetMD5UI();
    return;
  }

  /* TOOL THƯỜNG */
  activeTool=tool;_lastSid=null;_im=false;toolRetry=0;
  if($('gsName'))$('gsName').textContent=tool.name;
  if($('gsLogo'))$('gsLogo').src=tool.image||'';
  setStatus('wait');

  if(typeof TEEngine!=='undefined'&&TEEngine.Yq)_engine=new TEEngine.Yq();

  var frame=$('gameFrame');
  if(frame){
    if(tool.kind==='panel'||!tool.game_url){frame.src='about:blank';frame.style.display='none'}
    else{frame.style.display='block';frame.src=tool.game_url}
  }
  if($('game-screen'))$('game-screen').classList.add('show');
  if(toolInterval){clearInterval(toolInterval);toolInterval=null}
  resetRobot();
  if(tool.api_url){tickApi();toolInterval=setInterval(tickApi,4000)}
  else setStatus('ok');
}

function closeGame(){
  if($('game-screen'))$('game-screen').classList.remove('show');
  if($('gameFrame')){$('gameFrame').src='about:blank';$('gameFrame').style.display='block'}
  if(toolInterval){clearInterval(toolInterval);toolInterval=null}
  activeTool=null;
}

function closeMD5(){
  if($('md5-screen'))$('md5-screen').classList.remove('show');
}

function extractList(data){
  if(!data)return null;
  if(Array.isArray(data))return data;
  var keys=['list','sessions','history','items','soicau','results','result','data','records','rows'];
  for(var i=0;i<keys.length;i++){var v=data[keys[i]];if(Array.isArray(v)&&v.length)return v}
  if(data.data&&typeof data.data==='object'){for(var k in data.data){if(Array.isArray(data.data[k])&&data.data[k].length)return data.data[k]}}
  return null;
}
function normalizeItem(it,idx){
  if(!it||typeof it!=='object')return null;
  var id=Number(it.id||it.sid||it.session||it.issue||it.ky||it.period||0);
  var result=it.resultTruyenThong||it.result||it.ketQua||it.outcome||it.value||it.kq;
  if(typeof result==='string'){
    var up=result.toUpperCase();
    if(up==='TAI'||up==='TÀI'||up==='T')result='TAI';
    else if(up==='XIU'||up==='XỈU'||up==='X')result='XIU';
    else result=null;
  } else if(result===1||result==='1')result='TAI';
  else if(result===0||result==='0')result='XIU';
  else result=null;
  if(!result)return null;
  if(!id||id<=0)id=idx+1;
  return{id:id,result:result,raw:it};
}
function tickApi(){
  if(!activeTool||!activeTool.api_url)return;
  var ctrl=new AbortController();
  var timer=setTimeout(function(){ctrl.abort()},9000);
  fetch(activeTool.api_url,{cache:'no-store',signal:ctrl.signal})
    .then(function(r){clearTimeout(timer);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
    .then(function(data){
      toolRetry=0;
      var list=extractList(data);
      if(!Array.isArray(list)||!list.length)throw new Error('Không có dữ liệu');
      var norm=[];
      for(var i=0;i<list.length;i++){var n=normalizeItem(list[i],i);if(n)norm.push(n)}
      if(!norm.length)throw new Error('Không có kết quả');
      norm.sort(function(a,b){return a.id-b.id});
      var nid=norm[norm.length-1].id;
      setStatus('ok');
      var displaySid=nid+1;
      if(_lastSid!==null&&nid!==_lastSid){
        _im=true;updateRobot(displaySid,null,null);
        setTimeout(function(){_im=false;analyze(norm,displaySid)},5000);
        _lastSid=nid;return;
      }
      _lastSid=nid;
      if(!_im)analyze(norm,displaySid);
    })
    .catch(function(){
      clearTimeout(timer);toolRetry++;
      if(toolRetry<=2){setStatus('wait');setTimeout(tickApi,1500)}
      else setStatus('err');
    });
}
function analyze(asc,displaySid){
  try{
    if(_engine&&_engine.load)_engine.load(asc.map(function(x){return x.raw}));
    if(typeof TEEngine==='undefined'){updateRobot(displaySid,null,null);setStatus('ok');return}
    var qs=TEEngine.predict(_engine);
    if(qs&&qs.g)updateRobot(displaySid,qs.g,qs.conf);
    else updateRobot(displaySid,null,null);
    setStatus('ok');
  }catch(e){console.error(e)}
}

/* MD5 ALGORITHMS — 18 thuật toán */
function md5ToHex(m){var a=[],i;for(i=0;i<m.length;i++)a.push(parseInt(m[i],16));return a}
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

var MD5Stats={total:0,wins:0};
function predictMD5(md5){
  md5=String(md5||'').trim().toLowerCase();
  if(!/^[a-f0-9]{32}$/.test(md5))return{error:'MD5 phải 32 ký tự hex'};
  var h=md5ToHex(md5);
  var algos=[_a1(h),_a2(h),_a3(h),_a4(h),_a5(h),_a6(md5),_a7(md5),_a8(h),_a9(h),_a10(h),_a11(h),_a12(h),_a13(h),_a14(h),_a15(h),_a16(h),_a17(h),_a18(h)];
  var tS=0,xS=0,i,a,n;
  for(i=0;i<algos.length;i++){a=algos[i];n=a.s/100;tS+=n*a.w;xS+=(1-n)*a.w}
  var pT=tS/(tS+xS);var pX=1-pT;
  var ketQua=pT>pX?'TÀI':'XỈU';
  var winP=Math.max(pT,pX);
  var tinCay=Math.round(50+(winP-0.5)*96);
  if(tinCay>98)tinCay=98;if(tinCay<50)tinCay=50;
  var taiPercent=Math.round(pT*100);
  MD5Stats.total++;if(tinCay>=65)MD5Stats.wins++;
  return{ketQua:ketQua,tinCay:tinCay,taiPercent:taiPercent,xiuPercent:100-taiPercent,total:MD5Stats.total,winrate:MD5Stats.total?Math.round(MD5Stats.wins/MD5Stats.total*100):0};
}
function resetMD5UI(){
  if($('md5Input'))$('md5Input').value='';
  if($('md5Result')){$('md5Result').className='md5-result';$('md5Result').innerHTML=''}
  if($('md5Loading'))$('md5Loading').style.display='none';
  if($('md5TaiPercent'))$('md5TaiPercent').textContent='0%';
  if($('md5XiuPercent'))$('md5XiuPercent').textContent='0%';
}
function runMD5Predict(){
  var inp=$('md5Input'),loading=$('md5Loading'),result=$('md5Result');
  if(!inp||!result)return;
  var md5=(inp.value||'').trim().toLowerCase();
  if(md5.length!==32)return alert('MD5 phải đủ 32 ký tự!');
  if(!/^[a-f0-9]{32}$/.test(md5))return alert('MD5 chỉ chứa 0-9 và a-f!');
  if(loading)loading.style.display='block';
  result.className='md5-result';
  setTimeout(function(){
    if(loading)loading.style.display='none';
    var r=predictMD5(md5);
    if(r.error)return alert(r.error);
    if($('md5TaiPercent'))$('md5TaiPercent').textContent=r.taiPercent+'%';
    if($('md5XiuPercent'))$('md5XiuPercent').textContent=r.xiuPercent+'%';
    result.className='md5-result show '+(r.ketQua==='TÀI'?'tai':'xiu');
    result.innerHTML='🎯 KẾT QUẢ<br><span style="font-size:44px">'+r.ketQua+'</span><br>📊 Độ tin cậy: '+r.tinCay+'%';
    if($('md5Count'))$('md5Count').textContent=r.total;
    if($('md5Winrate'))$('md5Winrate').textContent=r.winrate+'%';
  },900);
}

/* ROBOT DRAG (chỉ hoạt động khi ở game-screen) */
function initRobotDrag(){
  var el=$('robot');if(!el)return;
  try{var s=localStorage.getItem('minhios_robot_pos');if(s){var p=JSON.parse(s);if(p&&p.left){el.style.left=p.left;el.style.top=p.top;el.style.bottom='auto';el.style.right='auto'}}}catch(_){}
  var dragging=false,moved=false,startX=0,startY=0,origX=0,origY=0;
  el.addEventListener('pointerdown',function(e){
    if(e.target.closest('#box-content'))return;
    dragging=true;moved=false;startX=e.clientX;startY=e.clientY;
    var rect=el.getBoundingClientRect();origX=rect.left;origY=rect.top;
    el.style.left=origX+'px';el.style.top=origY+'px';el.style.bottom='auto';el.style.right='auto';
    try{el.setPointerCapture(e.pointerId)}catch(_){}
  });
  el.addEventListener('pointermove',function(e){
    if(!dragging)return;
    var dx=e.clientX-startX,dy=e.clientY-startY;
    if(Math.abs(dx)>3||Math.abs(dy)>3)moved=true;
    var nl=origX+dx,nt=origY+dy;
    var rect=el.getBoundingClientRect();
    if(nl<-rect.width*0.3)nl=-rect.width*0.3;
    if(nt<0)nt=0;
    if(nl>window.innerWidth-rect.width)nl=window.innerWidth-rect.width;
    if(nt>window.innerHeight-rect.height)nt=window.innerHeight-rect.height;
    el.style.left=nl+'px';el.style.top=nt+'px';
  });
  function stop(){
    if(dragging&&moved){try{localStorage.setItem('minhios_robot_pos',JSON.stringify({left:el.style.left,top:el.style.top}))}catch(_){}}
    dragging=false;
  }
  el.addEventListener('pointerup',stop);
  el.addEventListener('pointercancel',stop);
  el.addEventListener('pointerleave',stop);
}

window.openTool=openTool;
window.closeGame=closeGame;
window.closeMD5=closeMD5;
window.runMD5Predict=runMD5Predict;
window.updateRobot=updateRobot;
window.initRobotDrag=initRobotDrag;
