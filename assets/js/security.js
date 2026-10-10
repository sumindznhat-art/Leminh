(function(){
  'use strict';
  async function fetchIP() {
    var apis = ['https://api.ipify.org?format=json','https://api64.ipify.org?format=json'];
    for (var i = 0; i < apis.length; i++) { try { var ctrl = new AbortController(); var timer = setTimeout(function() { ctrl.abort(); }, 3000); var res = await fetch(apis[i], { cache: 'no-store', signal: ctrl.signal }); clearTimeout(timer); if (!res.ok) continue; var data = await res.json(); if (data.ip) return data.ip; } catch(e) {} }
    return null;
  }
  async function detectIP() {
    try {
      var ip = await fetchIP(); if (!ip) return;
      try { localStorage.setItem('bonsicola_current_ip', ip); } catch(e) {}
      try { var sessRaw = localStorage.getItem('bonsicola_session'); if (sessRaw) { var sess = JSON.parse(sessRaw); if (sess && sess.user) { sess.currentIP = ip; localStorage.setItem('bonsicola_session', JSON.stringify(sess)); } } } catch(e) {}
    } catch(e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { setTimeout(detectIP, 1500); });
  else setTimeout(detectIP, 1500);
  window.IPGuard = { getCached: function() { try { return localStorage.getItem('bonsicola_current_ip'); } catch(e) { return null; } }, check: detectIP };
})();
