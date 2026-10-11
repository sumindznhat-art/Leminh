/* ============================================================
   ENGINE.JS — V6 ULTIMATE · 34 THUẬT TOÁN · BÁM CẦU CHUYÊN SÂU
   + Bám cầu bệt · cầu 1-1 · cầu 2-2 · cầu 3-3 · cầu nghiêng
   + Cầu đảo · cầu so le · cầu bẻ · cầu gãy · cầu bệt dài
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

    /* ============================================================
       NHÓM BÁM CẦU CHUYÊN SÂU (10 thuật toán mới)
       ============================================================ */

    /* 1. BÁM CẦU BỆT — cầu 1 bên dài, theo tiếp */
    bamCauBet() {
      const c = this.history;
      if (c.length < 6) return null;
      let streak = 1;
      for (let i = c.length - 1; i > 0; i--) {
        if (c[i] === c[i-1]) streak++;
        else break;
      }
      if (streak < 4) return null;
      // Xác suất bệt tiếp tục dựa vào lịch sử
      let continuations = 0, opportunities = 0;
      for (let i = 4; i < c.length; i++) {
        let s = 1;
        for (let j = i - 1; j > 0; j--) { if (c[j] === c[j-1]) s++; else break; }
        if (s >= 4 && s <= 8) {
          opportunities++;
          if (c[i] === c[i-1]) continuations++;
        }
      }
      if (opportunities < 3) return null;
      const pCont = continuations / opportunities;
      return { conf: Math.abs(pCont - 0.5) * 2, suggest: pCont > 0.5 ? c[c.length-1] : (c[c.length-1] === 'TAI' ? 'XIU' : 'TAI') };
    }

    /* 2. BÁM CẦU 1-1 — T-X-T-X-T-X... */
    bamCau11() {
      const c = this.history;
      if (c.length < 6) return null;
      const win = c.slice(-6);
      let pattern11 = 0;
      for (let i = 1; i < win.length; i++) {
        if (win[i] !== win[i-1]) pattern11++;
      }
      if (pattern11 < 5) return null;
      const last = c[c.length-1];
      const next = last === 'TAI' ? 'XIU' : 'TAI';
      return { conf: 0.72, suggest: next };
    }

    /* 3. BÁM CẦU 2-2 — TT-XX-TT-XX */
    bamCau22() {
      const c = this.history;
      if (c.length < 8) return null;
      const win = c.slice(-8);
      let matches = 0;
      for (let i = 0; i < win.length - 2; i += 2) {
        if (win[i] === win[i+1] && win[i+2] === win[i+3] && win[i] !== win[i+2]) matches++;
      }
      if (matches < 3) return null;
      const groups = groupRuns(win);
      if (groups.length < 4) return null;
      const lastG = groups[groups.length-1];
      if (lastG.n === 2) {
        const opposite = lastG.k === 'TAI' ? 'XIU' : 'TAI';
        return { conf: 0.75, suggest: opposite };
      }
      return null;
    }

    /* 4. BÁM CẦU 3-3 — TTT-XXX-TTT */
    bamCau33() {
      const c = this.history;
      if (c.length < 12) return null;
      const win = c.slice(-12);
      const groups = groupRuns(win);
      if (groups.length < 4) return null;
      // Kiểm tra chuỗi nhóm xen kẽ với n=3
      let matchN3 = 0;
      for (let i = 0; i < groups.length - 1; i++) {
        if (groups[i].n === 3 && groups[i+1].n === 3 && groups[i].k !== groups[i+1].k) matchN3++;
      }
      if (matchN3 < 2) return null;
      const last = groups[groups.length-1];
      if (last.n <= 3) {
        const opposite = last.k === 'TAI' ? 'XIU' : 'TAI';
        return { conf: 0.78, suggest: last.n === 3 ? opposite : last.k };
      }
      return null;
    }

    /* 5. CẦU NGHIÊNG — xu hướng lệch về 1 phía */
    cauNghieng() {
      const c = this.history;
      if (c.length < 15) return null;
      const win = c.slice(-15);
      let t = 0, x = 0;
      win.forEach(v => { if (v === 'TAI') t++; else x++; });
      const ratio = t / win.length;
      if (ratio > 0.66) return { conf: Math.min(0.82, ratio), suggest: 'TAI' };
      if (ratio < 0.34) return { conf: Math.min(0.82, 1 - ratio), suggest: 'XIU' };
      return null;
    }

    /* 6. CẦU ĐẢO — Đảo chiều liên tiếp */
    cauDao() {
      const c = this.history;
      if (c.length < 8) return null;
      const win = c.slice(-8);
      let flips = 0;
      for (let i = 1; i < win.length; i++) if (win[i] !== win[i-1]) flips++;
      if (flips < 6) return null;
      // Đang đảo mạnh → khả năng cao tiếp tục đảo 1 lần nữa
      const last = c[c.length-1];
      return { conf: 0.68, suggest: last === 'TAI' ? 'XIU' : 'TAI' };
    }

    /* 7. CẦU SO LE — pattern T-X-X-T-T-X-X-T */
    cauSoLe() {
      const c = this.history;
      if (c.length < 10) return null;
      const pat = c.slice(-8);
      let best = null;
      // Thử match các pattern mẫu
      const patterns = [
        ['TAI','XIU','XIU','TAI','TAI','XIU','XIU','TAI'],
        ['XIU','TAI','TAI','XIU','XIU','TAI','TAI','XIU'],
        ['TAI','TAI','XIU','TAI','XIU','XIU','TAI','XIU'],
        ['XIU','XIU','TAI','XIU','TAI','TAI','XIU','TAI']
      ];
      for (const p of patterns) {
        let match = 0;
        for (let i = 0; i < 8; i++) if (pat[i] === p[i]) match++;
        if (match >= 7) return { conf: 0.7, suggest: p[7] };
      }
      return null;
    }

    /* 8. CẦU BẺ — đang bệt tự nhiên bẻ */
    cauBe() {
      const c = this.history;
      if (c.length < 15) return null;
      // Đếm số lần bệt dài bị bẻ ở độ dài 5-8
      let totalBe = 0, chances = 0;
      for (let i = 5; i < c.length; i++) {
        let s = 1;
        for (let j = i - 1; j > 0; j--) { if (c[j] === c[j-1]) s++; else break; }
        if (s >= 5 && s <= 8) {
          chances++;
          if (i < c.length && c[i] !== c[i-1]) totalBe++;
        }
      }
      if (chances < 3) return null;
      const pBe = totalBe / chances;
      let streak = 1;
      for (let i = c.length - 1; i > 0; i--) { if (c[i] === c[i-1]) streak++; else break; }
      if (streak < 5) return null;
      if (pBe > 0.6) {
        const opposite = c[c.length-1] === 'TAI' ? 'XIU' : 'TAI';
        return { conf: pBe, suggest: opposite };
      }
      return null;
    }

    /* 9. CẦU GÃY — bệt bị gãy giữa chừng */
    cauGay() {
      const c = this.history;
      if (c.length < 20) return null;
      const groups = groupRuns(c.slice(-20));
      if (groups.length < 6) return null;
      // Nếu 2 nhóm cuối có n nhỏ xen kẽ → sắp bệt
      const lastTwo = groups.slice(-3);
      if (lastTwo.length === 3 && lastTwo[0].n >= 3 && lastTwo[1].n === 1 && lastTwo[2].n === 1) {
        return { conf: 0.72, suggest: lastTwo[2].k };
      }
      return null;
    }

    /* 10. CẦU BỆT DÀI — bệt > 8, khả năng còn tiếp */
    bamBetDai() {
      const c = this.history;
      if (c.length < 10) return null;
      let streak = 1;
      for (let i = c.length - 1; i > 0; i--) { if (c[i] === c[i-1]) streak++; else break; }
      if (streak < 8) return null;
      // Bệt dài thường tiếp tục đến 12-15
      return { conf: 0.8, suggest: c[c.length-1] };
    }

    /* ============================================================
       24 THUẬT TOÁN CŨ (giữ nguyên)
       ============================================================ */

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

    deepPattern() {
      const c = this.history; if (c.length < 12) return null;
      let best = null;
      for (let len = 10; len >= 5; len--) {
        const pattern = c.slice(-len);
        for (let skip = 1; skip <= 2; skip++) {
          let tT = 0, tX = 0, matches = 0;
          for (let i = 0; i <= c.length - len - skip - 1; i++) {
            let ok = true;
            for (let j = 0; j < len; j++) if (c[i+j] !== pattern[j]) { ok = false; break; }
            if (!ok) continue;
            matches++;
            const nxt = c[i+len+skip-1];
            if (nxt === 'TAI') tT++; else tX++;
          }
          if (matches >= 3) {
            const conf = Math.max(tT, tX) / matches;
            if (!best || conf > best.conf) best = { pT: tT/matches*100, pX: tX/matches*100, conf, suggest: tT > tX ? 'TAI' : 'XIU' };
          }
        }
      }
      return best;
    }

    sequenceRNN() {
      const c = this.history; if (c.length < 25) return null;
      const W = 8;
      const cur = c.slice(-W);
      let sT = 0, sX = 0, matches = 0;
      for (let i = 0; i < c.length - W - 1; i++) {
        let sim = 0;
        for (let j = 0; j < W; j++) if (c[i+j] === cur[j]) sim++;
        const weight = Math.exp(sim / W * 2) - 1;
        if (c[i+W] === 'TAI') sT += weight; else sX += weight;
        if (sim >= W - 2) matches++;
      }
      if (matches < 3 || sT + sX < 1) return null;
      const pT = sT / (sT + sX);
      return { pT: pT*100, pX: (1-pT)*100, conf: Math.abs(pT - 0.5) * 2, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
    }

    recurrentPattern() {
      const c = this.history; if (c.length < 20) return null;
      for (let L = 3; L <= 6; L++) {
        const pat = c.slice(-L);
        let tCount = 0, xCount = 0;
        for (let i = 0; i <= c.length - L - 1; i++) {
          let ok = true;
          for (let j = 0; j < L; j++) if (c[i+j] !== pat[j]) { ok = false; break; }
          if (!ok) continue;
          if (c[i+L] === 'TAI') tCount++; else xCount++;
        }
        if (tCount + xCount >= 4) {
          const pT = tCount / (tCount + xCount);
          if (Math.abs(pT - 0.5) > 0.15) return { conf: Math.abs(pT - 0.5) * 2, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
        }
      }
      return null;
    }

    neuralLike() {
      const c = this.history; if (c.length < 30) return null;
      const W = 10;
      const weights = [0.5, 0.7, 0.9, 1.1, 1.3, 1.1, 0.9, 0.7, 0.5, 0.3];
      let sT = 0;
      const win = c.slice(-W);
      for (let i = 0; i < W; i++) {
        const v = win[i] === 'TAI' ? 1 : -1;
        sT += v * weights[i];
      }
      const sig = 1 / (1 + Math.exp(-sT));
      if (Math.abs(sig - 0.5) < 0.08) return null;
      return { pT: sig*100, pX: (1-sig)*100, conf: Math.abs(sig - 0.5) * 2, suggest: sig > 0.5 ? 'TAI' : 'XIU' };
    }

    weightedMA() {
      const c = this.history; if (c.length < 12) return null;
      const W = 12;
      let sT = 0, sX = 0, wSum = 0;
      const win = c.slice(-W);
      for (let i = 0; i < W; i++) { const w = i + 1; wSum += w; if (win[i] === 'TAI') sT += w; else sX += w; }
      const pT = sT / wSum;
      if (Math.abs(pT - 0.5) < 0.05) return null;
      return { pT: pT*100, pX: (1-pT)*100, conf: Math.abs(pT - 0.5) * 2, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
    }

    exponentialMA() {
      const c = this.history; if (c.length < 15) return null;
      const alpha = 0.3;
      let emaT = c[0] === 'TAI' ? 1 : 0;
      for (let i = 1; i < c.length; i++) { const v = c[i] === 'TAI' ? 1 : 0; emaT = alpha * v + (1 - alpha) * emaT; }
      if (Math.abs(emaT - 0.5) < 0.05) return null;
      return { pT: emaT*100, pX: (1-emaT)*100, conf: Math.abs(emaT - 0.5) * 2, suggest: emaT > 0.5 ? 'TAI' : 'XIU' };
    }

    adaptiveThreshold() {
      const c = this.history; if (c.length < 20) return null;
      const win = c.slice(-20);
      const tCount = win.filter(x => x === 'TAI').length;
      const ratio = tCount / win.length;
      const variance = win.map((v, i) => (v === 'TAI' ? 1 : 0) - ratio).reduce((a, b) => a + b*b, 0) / win.length;
      if (variance < 0.15) return null;
      return { conf: Math.min(0.85, variance * 2), suggest: ratio > 0.5 ? 'XIU' : 'TAI' };
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

    secondOrderMarkov() {
      const c = this.history; if (c.length < 30) return null;
      const trans = {};
      for (let i = 2; i < c.length; i++) {
        const key = c.slice(i-2, i).join('');
        if (!trans[key]) trans[key] = { T: 0, X: 0 };
        if (c[i] === 'TAI') trans[key].T++; else trans[key].X++;
      }
      const curKey = c.slice(-2).join('');
      const stats = trans[curKey];
      if (!stats || (stats.T + stats.X) < 5) return null;
      const pT = stats.T / (stats.T + stats.X);
      return { pT: pT*100, pX: (1-pT)*100, conf: Math.abs(pT - 0.5) * 2, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
    }

    ensembleBayes() {
      const c = this.history; if (c.length < 25) return null;
      const last = c[c.length-1], opp = last === 'TAI' ? 'XIU' : 'TAI';
      let cA = 0, cAB = 0, cAAB = 0, cAA = 0;
      for (let i = 0; i < c.length; i++) {
        if (c[i] === last) {
          cA++;
          if (i >= 2 && c[i-1] === last) cAA++;
        }
        if (i > 0 && c[i-1] === last && c[i] === opp) cAB++;
        if (i > 1 && c[i-2] === last && c[i-1] === last && c[i] === opp) cAAB++;
      }
      if (cA < 5) return null;
      const p1 = cAB / cA;
      const p2 = cAA > 3 ? cAAB / cAA : p1;
      const pOpp = (p1 * 0.6 + p2 * 0.4);
      if (Math.abs(pOpp - 0.5) < 0.1) return null;
      return { conf: Math.abs(pOpp - 0.5) * 2, suggest: pOpp > 0.5 ? opp : last };
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

    chiSquare() {
      const c = this.history; if (c.length < 30) return null;
      const win = c.slice(-30);
      const tCount = win.filter(x => x === 'TAI').length;
      const xCount = win.length - tCount;
      const expected = win.length / 2;
      const chi = Math.pow(tCount - expected, 2) / expected + Math.pow(xCount - expected, 2) / expected;
      if (chi < 1.5) return null;
      return { conf: Math.min(0.85, chi / 6), suggest: tCount > expected ? 'XIU' : 'TAI' };
    }

    monteCarlo() {
      const c = this.history; if (c.length < 20) return null;
      const samples = 200;
      let tWins = 0;
      const win = c.slice(-15);
      for (let s = 0; s < samples; s++) {
        let simT = 0, simX = 0;
        for (let i = 0; i < win.length; i++) {
          const idx = Math.floor(Math.random() * win.length);
          if (win[idx] === 'TAI') simT++; else simX++;
        }
        if (simT > simX) tWins++;
      }
      const pT = tWins / samples;
      if (Math.abs(pT - 0.5) < 0.08) return null;
      return { pT: pT*100, pX: (1-pT)*100, conf: Math.abs(pT - 0.5) * 2, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
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

    streakFollow() {
      const c = this.history; if (c.length < 12) return null;
      let streak = 1;
      for (let i = c.length-1; i > 0; i--) { if (c[i] === c[i-1]) streak++; else break; }
      if (streak < 2 || streak > 5) return null;
      let followCount = 0, total = 0;
      for (let i = streak; i < c.length - 1; i++) {
        let s = 1;
        for (let j = i-1; j > 0; j--) { if (c[j] === c[j-1]) s++; else break; }
        if (s === streak) { total++; if (c[i] === c[i+1]) followCount++; }
      }
      if (total < 3) return null;
      const pF = followCount / total;
      return { conf: pF, suggest: pF > 0.5 ? c[c.length-1] : (c[c.length-1] === 'TAI' ? 'XIU' : 'TAI') };
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

    zigzag() {
      const c = this.history; if (c.length < 12) return null;
      const win = c.slice(-12);
      let zig = 0, zag = 0;
      for (let i = 1; i < win.length; i++) {
        if (win[i] !== win[i-1]) { if (win[i-1] === 'TAI') zig++; else zag++; }
      }
      if (zig >= 3 || zag >= 3) {
        const last = c[c.length-1];
        return { conf: 0.65, suggest: last === 'TAI' ? 'XIU' : 'TAI' };
      }
      return null;
    }

    diceSum() {
      const totals = this.totals.filter(t => t != null);
      if (totals.length < 20) return null;
      const recent = totals.slice(-20);
      const avg = recent.reduce((a,b) => a+b, 0) / recent.length;
      const deviation = avg - 10.5;
      if (avg > 12) return { avg, deviation, conf: Math.min(0.8, Math.abs(deviation) / 4), suggest: 'XIU' };
      if (avg < 9) return { avg, deviation, conf: Math.min(0.8, Math.abs(deviation) / 4), suggest: 'TAI' };
      return null;
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

    fiboLevel() {
      const c = this.history; if (c.length < 20) return null;
      const win = c.slice(-20);
      let tCount = win.filter(x => x === 'TAI').length;
      const ratio = tCount / win.length;
      if (ratio > 0.618) return { conf: 0.7, suggest: 'XIU' };
      if (ratio < 0.382) return { conf: 0.7, suggest: 'TAI' };
      return null;
    }

    /* ============================================================
       PREDICT — ENSEMBLE 34 THUẬT TOÁN
       ============================================================ */
    predict() {
      const algos = [
        /* BÁM CẦU — trọng số cao nhất (weight 2.5-3.0) */
        { w: 3.0, r: this.bamCauBet()      },
        { w: 2.8, r: this.bamCau11()       },
        { w: 2.9, r: this.bamCau22()       },
        { w: 2.9, r: this.bamCau33()       },
        { w: 2.7, r: this.cauNghieng()     },
        { w: 2.6, r: this.cauDao()         },
        { w: 2.7, r: this.cauSoLe()        },
        { w: 2.8, r: this.cauBe()          },
        { w: 2.7, r: this.cauGay()         },
        { w: 3.0, r: this.bamBetDai()      },
        /* Pattern/Sequence */
        { w: 2.2, r: this.patternMatch()   },
        { w: 2.4, r: this.deepPattern()    },
        { w: 2.1, r: this.sequenceRNN()    },
        { w: 1.9, r: this.recurrentPattern() },
        { w: 2.3, r: this.neuralLike()     },
        /* MA/Smoothing */
        { w: 1.5, r: this.weightedMA()     },
        { w: 1.6, r: this.exponentialMA()  },
        { w: 1.3, r: this.adaptiveThreshold() },
        /* Markov/Bayes */
        { w: 2.0, r: this.markovChain()    },
        { w: 1.9, r: this.secondOrderMarkov() },
        { w: 1.8, r: this.ensembleBayes()  },
        /* Statistic */
        { w: 1.6, r: this.bayesian()       },
        { w: 1.4, r: this.chiSquare()      },
        { w: 1.7, r: this.monteCarlo()     },
        { w: 1.0, r: this.entropy()        },
        /* Streak/Volatility */
        { w: 1.9, r: this.streakReversal() },
        { w: 1.7, r: this.streakFollow()   },
        { w: 1.5, r: this.volatility()     },
        { w: 1.8, r: this.clusterLong()    },
        /* Momentum */
        { w: 1.6, r: this.momentum()       },
        { w: 1.5, r: this.zigzag()         },
        { w: 1.4, r: this.diceSum()        },
        /* Fallback */
        { w: 1.9, r: this.knn()            },
        { w: 1.5, r: this.fiboLevel()      }
      ];

      let sT = 0, sX = 0, tW = 0, used = 0;
      for (const a of algos) {
        if (!a.r) continue;
        const conf = Math.min(1, a.r.conf || 0.5);
        const w = a.w * conf;
        if (a.r.suggest === 'TAI') sT += w; else sX += w;
        tW += w;
        used++;
      }

      if (tW < 1 || used < 2) return { g: null, conf: 0 };

      const total = sT + sX;
      let rawConf = Math.max(sT, sX) / total;

      /* Boost theo số thuật toán đồng thuận */
      if (used < 5)       rawConf *= 0.78;
      else if (used < 10) rawConf *= 0.90;
      else if (used < 18) rawConf *= 1.0;
      else if (used < 25) rawConf *= 1.08;
      else                rawConf *= Math.min(1.20, 1 + (used - 25) * 0.012);

      /* Phân loại 3 tầng */
      let conf = Math.round(rawConf * 100);

      if (rawConf > 0.80) {
        conf = 80 + Math.round((rawConf - 0.80) * 100);
        if (conf > 99) conf = 99;
      } else if (rawConf > 0.60) {
        conf = 60 + Math.round((rawConf - 0.60) * 50);
        if (conf > 70) conf = 70;
      } else if (rawConf > 0.50) {
        conf = 50 + Math.round((rawConf - 0.50) * 100);
        if (conf > 60) conf = 60;
      } else {
        conf = 50 + Math.round((0.5 - rawConf) * 100);
        if (conf > 60) conf = 60;
        const t = sT; sT = sX; sX = t;
      }

      return { g: sT > sX ? 'TAI' : 'XIU', conf, used };
    }
  }

  return { Yq: TaiXiuEngine, predict: (eng) => eng.predict() };
})();

window.TEEngine = TEEngine;
