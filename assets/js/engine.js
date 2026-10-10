/* ============================================================
   ENGINE.JS — AI 3 TẦNG: 50-60 / 60-70 / 80-100
   Chỉ hiện % — Không hiện chữ mô tả
   ============================================================ */

const TEEngine = (() => {

  const groupRuns = (arr) => {
    if (!arr.length) return [];
    const out = []; let last = arr[0], count = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === last) count++;
      else { out.push({ k: last, n: count }); last = arr[i]; count = 1; }
    }
    out.push({ k: last, n: count });
    return out;
  };

  class TaiXiuEngine {
    constructor() {
      this.history = [];
      this.dice = [];
      this.totals = [];
      this.max = 500;
    }

    parseDice(it) {
      const maps = [['dice1','dice2','dice3'],['xucxac1','xucxac2','xucxac3'],['d1','d2','d3'],['x1','x2','x3']];
      for (const [a,b,c] of maps) {
        if (it[a] != null && it[b] != null && it[c] != null) {
          const ar = [+it[a], +it[b], +it[c]];
          if (ar.every(n => n >= 1 && n <= 6)) return ar;
        }
      }
      for (const f of ['dice','dices','xucxac']) {
        if (Array.isArray(it[f]) && it[f].length >= 3) {
          const ar = it[f].slice(0,3).map(Number);
          if (ar.every(n => n >= 1 && n <= 6)) return ar;
        }
      }
      return null;
    }

    load(items) {
      this.history = []; this.dice = []; this.totals = [];
      for (const it of items) {
        const r = it.resultTruyenThong || it.result || it.ketQua;
        if (r !== 'TAI' && r !== 'XIU') continue;
        this.history.push(r);
        const d = this.parseDice(it);
        this.dice.push(d);
        this.totals.push(d ? d[0]+d[1]+d[2] : null);
      }
      if (this.history.length > this.max) {
        const c = -this.max;
        this.history = this.history.slice(c);
        this.dice = this.dice.slice(c);
        this.totals = this.totals.slice(c);
      }
    }

    /* ============ 12 THUẬT TOÁN ============ */

    patternMatch() {
      const c = this.history; if (c.length < 5) return null;
      let best = null;
      for (let len = Math.min(8, Math.floor(c.length/2)); len >= 1; len--) {
        const pattern = c.slice(-len);
        let tT = 0, tX = 0, matches = 0;
        for (let i = 0; i <= c.length - len - 1; i++) {
          let ok = true;
          for (let j = 0; j < len; j++) if (c[i+j] !== pattern[j]) { ok = false; break; }
          if (!ok) continue;
          if (i > 0 && c[i-1] === c[i]) continue;
          matches++;
          if (c[i+len] === 'TAI') tT++; else tX++;
        }
        if (matches >= len * 3) {
          const conf = Math.max(tT, tX) / matches;
          if (!best || conf > best.conf) best = { pT: tT/matches*100, pX: tX/matches*100, conf, suggest: tT > tX ? 'TAI' : 'XIU' };
        }
      }
      return best;
    }

    markovChain() {
      const c = this.history; if (c.length < 15) return null;
      for (let order = 4; order >= 1; order--) {
        const trans = {};
        for (let i = order; i < c.length; i++) {
          const key = c.slice(i-order, i).join('');
          if (!trans[key]) trans[key] = { T: 0, X: 0 };
          if (c[i] === 'TAI') trans[key].T++; else trans[key].X++;
        }
        const curKey = c.slice(-order).join('');
        const stats = trans[curKey];
        if (!stats) continue;
        const total = stats.T + stats.X;
        if (total < 5) continue;
        const pT = stats.T / total;
        const conf = Math.abs(pT - 0.5) * 2;
        if (conf > 0.15) return { pT: pT*100, pX: (1-pT)*100, conf, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
      }
      return null;
    }

    bayesian() {
      const c = this.history; if (c.length < 20) return null;
      const last = c[c.length-1], opposite = last === 'TAI' ? 'XIU' : 'TAI';
      let cA = 0, cAB = 0;
      for (let i = 0; i < c.length; i++) {
        if (c[i] === last) cA++;
        if (i > 0 && c[i-1] === last && c[i] === opposite) cAB++;
      }
      if (cA < 5) return null;
      const pOpp = cAB / cA;
      return { pT: last === 'TAI' ? (1-pOpp)*100 : pOpp*100, pX: last === 'XIU' ? (1-pOpp)*100 : pOpp*100, conf: Math.abs(pOpp-0.5)*2, suggest: pOpp > 0.5 ? opposite : last };
    }

    diceSum() {
      const totals = this.totals.filter(t => t != null);
      if (totals.length < 20) return null;
      const recent = totals.slice(-20);
      const avg = recent.reduce((a,b) => a+b, 0) / recent.length;
      const deviation = avg - 10.5;
      let suggest;
      if (avg > 12) suggest = 'XIU'; else if (avg < 9) suggest = 'TAI'; else return null;
      return { avg, deviation, conf: Math.min(0.8, Math.abs(deviation) / 4), suggest };
    }

    streakReversal() {
      const c = this.history; if (c.length < 10) return null;
      let streak = 1;
      for (let i = c.length-1; i > 0; i--) { if (c[i] === c[i-1]) streak++; else break; }
      if (streak < 3) return null;
      let reverses = 0, total = 0;
      for (let i = streak; i < c.length; i++) {
        let s = 1;
        for (let j = i-1; j > 0; j--) { if (c[j] === c[j-1]) s++; else break; }
        if (s >= streak) { total++; if (i < c.length && c[i] !== c[i-1]) reverses++; }
      }
      if (total < 3) return null;
      const pR = reverses / total, opposite = c[c.length-1] === 'TAI' ? 'XIU' : 'TAI';
      return { conf: pR, suggest: pR > 0.5 ? opposite : c[c.length-1] };
    }

    volatility() {
      const c = this.history; if (c.length < 25) return null;
      const win = c.slice(-25);
      let changes = 0;
      for (let i = 1; i < win.length; i++) if (win[i] !== win[i-1]) changes++;
      const ratio = changes / (win.length - 1);
      const last = c[c.length-1], opposite = last === 'TAI' ? 'XIU' : 'TAI';
      if (ratio > 0.65) return { suggest: last, conf: Math.min(0.75, ratio) };
      if (ratio < 0.35) return { suggest: opposite, conf: Math.min(0.75, 1-ratio) };
      return null;
    }

    momentum() {
      const c = this.history; if (c.length < 15) return null;
      const win = c.slice(-15);
      let sT = 0, sX = 0;
      for (let i = 0; i < win.length; i++) {
        const w = Math.exp(-(win.length-1-i)/5);
        if (win[i] === 'TAI') sT += w; else sX += w;
      }
      const total = sT + sX; if (total < 1) return null;
      const pT = sT / total;
      return { pT: pT*100, pX: (1-pT)*100, conf: Math.abs(pT-0.5)*2, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
    }

    knn() {
      const c = this.history; const W = 6;
      if (c.length < W + 20) return null;
      const cur = c.slice(-W);
      const matches = [];
      for (let i = 0; i < c.length - W - 1; i++) {
        let same = 0;
        for (let j = 0; j < W; j++) if (c[i+j] === cur[j]) same++;
        if (same >= W - 1) matches.push({ dist: W - same, next: c[i+W] });
      }
      if (matches.length < 5) return null;
      matches.sort((a,b) => a.dist - b.dist);
      const top = matches.slice(0, 12);
      let t = 0, x = 0;
      for (const m of top) { if (m.next === 'TAI') t++; else x++; }
      return { conf: Math.max(t,x)/top.length, suggest: t > x ? 'TAI' : 'XIU' };
    }

    entropy() {
      const c = this.history; if (c.length < 20) return null;
      const win = c.slice(-20);
      let t = 0, x = 0;
      for (const v of win) { if (v === 'TAI') t++; else x++; }
      const pT = t/win.length, pX = x/win.length;
      let H = 0;
      if (pT > 0) H -= pT * Math.log2(pT);
      if (pX > 0) H -= pX * Math.log2(pX);
      return { conf: 1-H, suggest: pT > pX ? 'TAI' : 'XIU' };
    }

    zigzag() {
      const c = this.history; if (c.length < 12) return null;
      const win = c.slice(-12);
      let zig = 0, zag = 0;
      for (let i = 1; i < win.length; i++) {
        if (win[i] !== win[i-1]) {
          if (win[i-1] === 'TAI') zig++; else zag++;
        }
      }
      if (zig >= 3 || zag >= 3) {
        const last = c[c.length-1];
        return { conf: 0.65, suggest: last === 'TAI' ? 'XIU' : 'TAI' };
      }
      return null;
    }

    fiboLevel() {
      const c = this.history; if (c.length < 20) return null;
      const win = c.slice(-20);
      let tCount = win.filter(x => x === 'TAI').length;
      const ratio = tCount / win.length;
      if (ratio > 0.618) return { conf: 0.7, suggest: 'XIU' };
      if (ratio < 0.382) return { conf: 0.7, suggest: 'TAI' };
      return null;
    }

    clusterLong() {
      const c = this.history; if (c.length < 30) return null;
      const win = c.slice(-30);
      const groups = groupRuns(win);
      if (groups.length < 5) return null;
      const avgRun = win.length / groups.length;
      const lastGroup = groups[groups.length-1];
      if (lastGroup.n >= avgRun * 2.5) {
        const opposite = lastGroup.k === 'TAI' ? 'XIU' : 'TAI';
        return { conf: 0.7, suggest: opposite };
      }
      return null;
    }

    /* ============ DỰ ĐOÁN TỔNG HỢP ============ */
    predict() {
      const algos = [
        { weight: 2.0, result: this.patternMatch() },
        { weight: 1.8, result: this.markovChain() },
        { weight: 1.5, result: this.bayesian() },
        { weight: 1.3, result: this.diceSum() },
        { weight: 1.7, result: this.streakReversal() },
        { weight: 1.4, result: this.volatility() },
        { weight: 1.5, result: this.momentum() },
        { weight: 1.9, result: this.knn() },
        { weight: 1.0, result: this.entropy() },
        { weight: 1.6, result: this.zigzag() },
        { weight: 1.4, result: this.fiboLevel() },
        { weight: 1.8, result: this.clusterLong() }
      ];

      let sT = 0, sX = 0, tW = 0, used = 0;
      for (const a of algos) {
        if (!a.result) continue;
        const conf = Math.min(1, a.result.conf || 0.5);
        const w = a.weight * conf;
        if (a.result.suggest === 'TAI') sT += w; else sX += w;
        tW += w;
        used++;
      }

      if (tW < 1) return { g: null, conf: 0 };

      const total = sT + sX;
      let rawConf = Math.max(sT, sX) / total;

      /* Điều chỉnh theo số thuật toán */
      if (used < 3) rawConf *= 0.7;
      else if (used < 5) rawConf *= 0.85;
      else if (used >= 8) rawConf = Math.min(0.95, rawConf * 1.15);

      /* Phân loại 3 tầng */
      let conf = Math.round(rawConf * 100);

      if (rawConf > 0.80) {
        /* Tầng cao: 80-100 */
        conf = 80 + Math.round((rawConf - 0.80) * 100);
        if (conf > 100) conf = 100;
      } else if (rawConf > 0.60) {
        /* Tầng ổn: 60-70 */
        conf = 60 + Math.round((rawConf - 0.60) * 50);
        if (conf > 70) conf = 70;
      } else if (rawConf > 0.50) {
        /* Tầng TB: 50-60 */
        conf = 50 + Math.round((rawConf - 0.50) * 100);
        if (conf > 60) conf = 60;
      } else {
        /* Đảo chiều */
        conf = 50 + Math.round((0.5 - rawConf) * 100);
        if (conf > 60) conf = 60;
        const t = sT; sT = sX; sX = t;
      }

      return {
        g: sT > sX ? 'TAI' : 'XIU',
        conf: conf
      };
    }
  }

  return { Yq: TaiXiuEngine, predict: (eng) => eng.predict() };
})();

window.TEEngine = TEEngine;
