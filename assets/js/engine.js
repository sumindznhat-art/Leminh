const TEEngine = (() => {
  class TaiXiuEngine {
    constructor() { this.history = []; this.dice = []; this.totals = []; this.max = 500; }
    parseDice(it) { const maps = [['dice1','dice2','dice3'],['xucxac1','xucxac2','xucxac3'],['d1','d2','d3'],['x1','x2','x3']]; for (const [a,b,c] of maps) { if (it[a] != null && it[b] != null && it[c] != null) { const ar = [+it[a], +it[b], +it[c]]; if (ar.every(n => n >= 1 && n <= 6)) return ar; } } for (const f of ['dice','dices','xucxac']) { if (Array.isArray(it[f]) && it[f].length >= 3) { const ar = it[f].slice(0,3).map(Number); if (ar.every(n => n >= 1 && n <= 6)) return ar; } } return null; }
    load(items) { this.history = []; this.dice = []; this.totals = []; for (const it of items) { const r = it.resultTruyenThong || it.result || it.ketQua; if (r !== 'TAI' && r !== 'XIU') continue; this.history.push(r); const d = this.parseDice(it); this.dice.push(d); this.totals.push(d ? d[0]+d[1]+d[2] : null); } if (this.history.length > this.max) { const c = -this.max; this.history = this.history.slice(c); this.dice = this.dice.slice(c); this.totals = this.totals.slice(c); } }
    patternMatch() { const c = this.history; if (c.length < 5) return null; let best = null; for (let len = Math.min(8, Math.floor(c.length/2)); len >= 1; len--) { const pattern = c.slice(-len); let tT = 0, tX = 0, matches = 0; for (let i = 0; i <= c.length - len - 1; i++) { let ok = true; for (let j = 0; j < len; j++) if (c[i+j] !== pattern[j]) { ok = false; break; } if (!ok) continue; if (i > 0 && c[i-1] === c[i]) continue; matches++; if (c[i+len] === 'TAI') tT++; else tX++; } if (matches >= len * 3) { const conf = Math.max(tT, tX) / matches; if (!best || conf > best.conf) best = { len, matches, pT: tT/matches*100, pX: tX/matches*100, conf, suggest: tT > tX ? 'TAI' : 'XIU' }; } } return best; }
    markovChain() { const c = this.history; if (c.length < 15) return null; for (let order = 4; order >= 1; order--) { const trans = {}; for (let i = order; i < c.length; i++) { const key = c.slice(i-order, i).join(''); if (!trans[key]) trans[key] = { T: 0, X: 0 }; if (c[i] === 'TAI') trans[key].T++; else trans[key].X++; } const curKey = c.slice(-order).join(''); const stats = trans[curKey]; if (!stats) continue; const total = stats.T + stats.X; if (total < 5) continue; const pT = stats.T / total; const conf = Math.abs(pT - 0.5) * 2; if (conf > 0.15) return { order, total, pT: pT*100, pX: (1-pT)*100, conf, suggest: pT > 0.5 ? 'TAI' : 'XIU' }; } return null; }
    bayesian() { const c = this.history; if (c.length < 20) return null; const last = c[c.length-1], opposite = last === 'TAI' ? 'XIU' : 'TAI'; let cA = 0, cB = 0, cAB = 0; for (let i = 0; i < c.length; i++) { if (c[i] === last) cA++; if (c[i] === opposite) cB++; if (i > 0 && c[i-1] === last && c[i] === opposite) cAB++; } if (cA < 5) return null; const pOpp = cAB / cA; return { pT: last === 'TAI' ? (1-pOpp)*100 : pOpp*100, pX: last === 'XIU' ? (1-pOpp)*100 : pOpp*100, conf: Math.abs(pOpp-0.5)*2, suggest: pOpp > 0.5 ? opposite : last }; }
    diceSum() { const totals = this.totals.filter(t => t != null); if (totals.length < 20) return null; const recent = totals.slice(-20); const avg = recent.reduce((a,b) => a+b, 0) / recent.length; const deviation = avg - 10.5; let suggest; if (avg > 12) suggest = 'XIU'; else if (avg < 9) suggest = 'TAI'; else return null; return { avg, deviation, conf: Math.min(0.8, Math.abs(deviation) / 4), suggest }; }
    streakReversal() { const c = this.history; if (c.length < 10) return null; let streak = 1; for (let i = c.length-1; i > 0; i--) { if (c[i] === c[i-1]) streak++; else break; } if (streak < 4) return null; let reverses = 0, total = 0; for (let i = streak; i < c.length; i++) { let s = 1; for (let j = i-1; j > 0; j--) { if (c[j] === c[j-1]) s++; else break; } if (s >= streak) { total++; if (i < c.length && c[i] !== c[i-1]) reverses++; } } if (total < 3) return null; const pR = reverses / total, opposite = c[c.length-1] === 'TAI' ? 'XIU' : 'TAI'; return { streak, total, pReverse: pR*100, conf: pR, suggest: pR > 0.5 ? opposite : c[c.length-1] }; }
    volatility() { const c = this.history; if (c.length < 25) return null; const win = c.slice(-25); let changes = 0; for (let i = 1; i < win.length; i++) if (win[i] !== win[i-1]) changes++; const ratio = changes / (win.length - 1); const last = c[c.length-1], opposite = last === 'TAI' ? 'XIU' : 'TAI'; if (ratio > 0.65) return { ratio, suggest: last, conf: Math.min(0.75, ratio) }; if (ratio < 0.35) return { ratio, suggest: opposite, conf: Math.min(0.75, 1-ratio) }; return null; }
    momentum() { const c = this.history; if (c.length < 15) return null; const win = c.slice(-15); let sT = 0, sX = 0; for (let i = 0; i < win.length; i++) { const w = Math.exp(-(win.length-1-i)/5); if (win[i] === 'TAI') sT += w; else sX += w; } const total = sT + sX; if (total < 1) return null; const pT = sT / total; return { pT: pT*100, pX: (1-pT)*100, conf: Math.abs(pT-0.5)*2, suggest: pT > 0.5 ? 'TAI' : 'XIU' }; }
    knn() { const c = this.history; const W = 6; if (c.length < W + 20) return null; const cur = c.slice(-W); const matches = []; for (let i = 0; i < c.length - W - 1; i++) { let same = 0; for (let j = 0; j < W; j++) if (c[i+j] === cur[j]) same++; if (same >= W - 1) matches.push({ dist: W - same, next: c[i+W] }); } if (matches.length < 5) return null; matches.sort((a,b) => a.dist - b.dist); const top = matches.slice(0, 12); let t = 0, x = 0; for (const m of top) { if (m.next === 'TAI') t++; else x++; } return { matches: matches.length, k: top.length, pT: t/top.length*100, pX: x/top.length*100, conf: Math.max(t,x)/top.length, suggest: t > x ? 'TAI' : 'XIU' }; }
    entropy() { const c = this.history; if (c.length < 20) return null; const win = c.slice(-20); let t = 0, x = 0; for (const v of win) { if (v === 'TAI') t++; else x++; } const pT = t/win.length, pX = x/win.length; let H = 0; if (pT > 0) H -= pT * Math.log2(pT); if (pX > 0) H -= pX * Math.log2(pX); return { H, pT: pT*100, pX: pX*100, conf: 1-H, suggest: pT > pX ? 'TAI' : 'XIU' }; }
    predict() {
      const algos = [
        { name: 'Pattern', weight: 2.0, result: this.patternMatch() },
        { name: 'Markov', weight: 1.8, result: this.markovChain() },
        { name: 'Bayes', weight: 1.5, result: this.bayesian() },
        { name: 'DiceSum', weight: 1.3, result: this.diceSum() },
        { name: 'Streak', weight: 1.7, result: this.streakReversal() },
        { name: 'Volatility', weight: 1.4, result: this.volatility() },
        { name: 'Momentum', weight: 1.5, result: this.momentum() },
        { name: 'KNN', weight: 1.9, result: this.knn() },
        { name: 'Entropy', weight: 1.0, result: this.entropy() }
      ];
      let sT = 0, sX = 0, tW = 0, used = 0;
      for (const a of algos) { if (!a.result) continue; const conf = Math.min(1, a.result.conf || 0.5); const w = a.weight * conf; if (a.result.suggest === 'TAI') sT += w; else sX += w; tW += w; used++; }
      if (tW < 1) return { g: null, conf: 0, pT: 50, pX: 50 };
      const pT = sT / tW, pX = sX / tW, total = sT + sX;
      let finalConf = Math.max(sT, sX) / total;
      if (used < 3) finalConf *= 0.7; else if (used < 5) finalConf *= 0.85; else if (used >= 7) finalConf = Math.min(0.95, finalConf * 1.1);
      return { g: sT > sX ? 'TAI' : 'XIU', conf: Math.round(finalConf * 100), pT: pT*100, pX: pX*100 };
    }
  }
  return { Yq: TaiXiuEngine, predict: (eng) => eng.predict() };
})();
window.TEEngine = TEEngine;
