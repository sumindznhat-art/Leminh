/* ============================================================
   ENGINE.JS 
   ============================================================ */

const TEEngine = (() => {

  /* Nhóm các phần tử liên tiếp giống nhau */
  const groupRuns = (arr) => {
    if (!arr.length) return [];
    const out = [];
    let last = arr[0], count = 1;
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
      this.max = 1000;
    }

    load(items) {
      this.history = [];
      for (const it of items) {
        const r = it.resultTruyenThong || it.result || it.ketQua;
        if (r !== 'TAI' && r !== 'XIU') continue;
        this.history.push(r);
      }
      if (this.history.length > this.max) {
        this.history = this.history.slice(-this.max);
      }
    }

    /* ============================================================
       UTILITY: So khớp pattern & đếm kết quả thực tế
       ============================================================ */
    matchPattern(pattern) {
      const c = this.history;
      const L = pattern.length;
      if (c.length < L + 3) return null;
      let tHit = 0, xHit = 0;
      for (let i = 0; i <= c.length - L - 1; i++) {
        let ok = true;
        for (let j = 0; j < L; j++) {
          if (c[i + j] !== pattern[j]) { ok = false; break; }
        }
        if (!ok) continue;
        // Bỏ qua nếu i+L chính là phiên hiện tại (tránh nhìn trước tương lai)
        if (i + L >= c.length) break;
        if (c[i + L] === 'TAI') tHit++; else xHit++;
      }
      const total = tHit + xHit;
      if (total < 3) return null;
      return {
        tai: tHit,
        xiu: xHit,
        total: total,
        confidence: Math.max(tHit, xHit) / total,
        suggest: tHit > xHit ? 'TAI' : (xHit > tHit ? 'XIU' : null)
      };
    }

    /* Đếm tổng quát cho 1 bên trong N phiên gần */
    countRecent(n) {
      const c = this.history.slice(-n);
      let t = 0, x = 0;
      for (const v of c) if (v === 'TAI') t++; else x++;
      return { tai: t, xiu: x, total: c.length };
    }

    /* ============================================================
       NHÓM 1: BÁM CẦU THUẦN (14 thuật toán)
       ============================================================ */

    /* 1. CẦU BỆT — chuỗi liên tiếp cùng bên */
    cauBet() {
      const c = this.history;
      if (c.length < 8) return null;
      const last = c[c.length - 1];
      let streak = 1;
      for (let i = c.length - 2; i >= 0; i--) {
        if (c[i] === last) streak++;
        else break;
      }
      if (streak < 3) return null;

      // Đếm số lần chuỗi có độ dài >= streak tiếp tục trong lịch sử
      let cont = 0, total = 0;
      for (let i = streak; i < c.length; i++) {
        let s = 1;
        for (let j = i - 1; j > 0; j--) {
          if (c[j] === c[j - 1]) s++;
          else break;
        }
        if (s >= streak) {
          total++;
          if (c[i] === c[i - 1]) cont++;
        }
      }
      if (total < 3) return null;
      const pCont = cont / total;

      // Nếu chuỗi quá dài (>7), khả năng bẻ cao
      if (streak >= 8) {
        return { confidence: Math.min(0.85, 1 - pCont + 0.3),
                 suggest: last === 'TAI' ? 'XIU' : 'TAI' };
      }
      if (pCont > 0.55) return { confidence: pCont, suggest: last };
      if (pCont < 0.45) return { confidence: 1 - pCont, suggest: last === 'TAI' ? 'XIU' : 'TAI' };
      return null;
    }

    /* 2. CẦU 1-1 — T-X-T-X-T-X */
    cau11() {
      const c = this.history;
      if (c.length < 8) return null;
      const win = c.slice(-6);
      let flips = 0;
      for (let i = 1; i < win.length; i++) if (win[i] !== win[i - 1]) flips++;
      if (flips < 5) return null;

      // Xác thực: pattern 6 phần tử đảo liên tục có tiếp tục?
      let cont = 0, total = 0;
      for (let i = 6; i < c.length; i++) {
        let ok = true;
        for (let j = 1; j < 6; j++) {
          if (c[i - 6 + j] === c[i - 6 + j - 1]) { ok = false; break; }
        }
        if (ok) {
          total++;
          if (c[i] !== c[i - 1]) cont++;
        }
      }
      const pCont = total >= 3 ? cont / total : 0.6;
      return { confidence: pCont, suggest: c[c.length - 1] === 'TAI' ? 'XIU' : 'TAI' };
    }

    /* 3. CẦU 2-2 */
    cau22() { return this.cauNN(2); }
    /* 4. CẦU 3-3 */
    cau33() { return this.cauNN(3); }
    /* 5. CẦU 4-4 */
    cau44() { return this.cauNN(4); }

    /* Hàm chung cho cầu N-N */
    cauNN(n) {
      const c = this.history;
      const need = n * 4;
      if (c.length < need) return null;
      const groupsAll = groupRuns(c.slice(-need));

      // Kiểm tra 4 nhóm cuối có phải là n-n-n-n xen kẽ
      if (groupsAll.length < 4) return null;
      const recent4 = groupsAll.slice(-4);
      let valid = true;
      for (let i = 0; i < recent4.length; i++) {
        if (recent4[i].n !== n) { valid = false; break; }
      }
      if (!valid) return null;
      // Kiểm tra xen kẽ bên
      for (let i = 1; i < recent4.length; i++) {
        if (recent4[i].k === recent4[i - 1].k) { valid = false; break; }
      }
      if (!valid) return null;

      // Nhóm cuối nếu đã đủ n → đảo bên
      const lastG = recent4[recent4.length - 1];
      if (lastG.n === n) {
        return { confidence: 0.78, suggest: lastG.k === 'TAI' ? 'XIU' : 'TAI' };
      }
      // Nhóm cuối chưa đủ n → tiếp tục bên đó
      return { confidence: 0.72, suggest: lastG.k };
    }

    /* 6. CẦU NGHIÊNG — 1 bên chiếm ưu thế rõ */
    cauNghieng() {
      const c = this.history;
      if (c.length < 20) return null;
      const win = c.slice(-20);
      let t = 0, x = 0;
      for (const v of win) if (v === 'TAI') t++; else x++;
      const ratio = t / win.length;
      if (ratio > 0.68) return { confidence: Math.min(0.82, ratio), suggest: 'TAI' };
      if (ratio < 0.32) return { confidence: Math.min(0.82, 1 - ratio), suggest: 'XIU' };
      return null;
    }

    /* 7. CẦU BẺ — chuỗi bệt bị bẻ tại phiên thứ k */
    cauBe() {
      const c = this.history;
      if (c.length < 15) return null;

      // Tính xác suất bệt bị bẻ ở độ dài 4-7
      let broke = 0, total = 0;
      for (let i = 4; i < c.length - 1; i++) {
        let s = 1;
        for (let j = i - 1; j > 0; j--) {
          if (c[j] === c[j - 1]) s++;
          else break;
        }
        if (s >= 4 && s <= 7) {
          total++;
          if (c[i] !== c[i - 1]) broke++;
        }
      }
      if (total < 4) return null;
      const pBreak = broke / total;

      // Chuỗi hiện tại
      let cur = 1;
      for (let i = c.length - 1; i > 0; i--) {
        if (c[i] === c[i - 1]) cur++;
        else break;
      }
      if (cur < 4) return null;

      if (cur >= 5 && pBreak > 0.5) {
        return { confidence: pBreak, suggest: c[c.length - 1] === 'TAI' ? 'XIU' : 'TAI' };
      }
      if (cur >= 4 && pBreak < 0.4) {
        return { confidence: 1 - pBreak, suggest: c[c.length - 1] };
      }
      return null;
    }

    /* 8. CẦU GÃY — pattern 3-1-2-1-3 (nhóm dài bị cắt) */
    cauGay() {
      const c = this.history;
      if (c.length < 20) return null;
      const groups = groupRuns(c.slice(-20));
      if (groups.length < 6) return null;
      const last3 = groups.slice(-3);
      // 3 nhóm: dài - ngắn - dài, khác bên
      if (last3[0].n >= 3 && last3[1].n <= 2 && last3[2].n >= 3 &&
          last3[0].k !== last3[2].k) {
        return { confidence: 0.7, suggest: last3[2].k === 'TAI' ? 'XIU' : 'TAI' };
      }
      // 3 nhóm: ngắn - dài - ngắn
      if (last3[0].n <= 2 && last3[1].n >= 3 && last3[2].n <= 2) {
        return { confidence: 0.68, suggest: last3[2].k };
      }
      return null;
    }

    /* 9. CẦU ĐẢO — đảo chiều liên tục */
    cauDao() {
      const c = this.history;
      if (c.length < 10) return null;
      const win = c.slice(-10);
      let flips = 0;
      for (let i = 1; i < win.length; i++) if (win[i] !== win[i - 1]) flips++;
      if (flips < 8) return null;

      // Kiểm tra pattern 10 phần tử đảo liên tục
      let cont = 0, total = 0;
      for (let i = 10; i < c.length; i++) {
        let ok = true;
        for (let j = 1; j < 10; j++) {
          if (c[i - 10 + j] === c[i - 10 + j - 1]) { ok = false; break; }
        }
        if (ok) {
          total++;
          if (c[i] !== c[i - 1]) cont++;
        }
      }
      const pCont = total >= 3 ? cont / total : 0.7;
      return { confidence: pCont, suggest: c[c.length - 1] === 'TAI' ? 'XIU' : 'TAI' };
    }

    /* 10. CẦU SO LE (pattern 2-1-2-1-2) */
    cauSoLe() {
      const c = this.history;
      if (c.length < 16) return null;
      const groups = groupRuns(c.slice(-15));
      if (groups.length < 6) return null;
      const last6 = groups.slice(-6);
      // Check: 2,1,2,1,2,1 hoặc 1,2,1,2,1,2
      const pat1 = [2, 1, 2, 1, 2, 1];
      const pat2 = [1, 2, 1, 2, 1, 2];
      const ns = last6.map(g => g.n);
      const matchPat1 = ns.every((v, i) => v === pat1[i]);
      const matchPat2 = ns.every((v, i) => v === pat2[i]);
      if (matchPat1 || matchPat2) {
        const lastG = groups[groups.length - 1];
        const nextN = matchPat1 ? 2 : 1;
        if (lastG.n < nextN) {
          return { confidence: 0.72, suggest: lastG.k };
        }
        return { confidence: 0.72, suggest: lastG.k === 'TAI' ? 'XIU' : 'TAI' };
      }
      return null;
    }

    /* 11. CẦU BỆT DÀI (streak > 8 có xu hướng tiếp tục) */
    bamBetDai() {
      const c = this.history;
      if (c.length < 12) return null;
      const last = c[c.length - 1];
      let streak = 1;
      for (let i = c.length - 2; i >= 0; i--) {
        if (c[i] === last) streak++;
        else break;
      }
      if (streak < 8) return null;

      // Đếm trong lịch sử: khi bệt >= 8, có tiếp tục đến >= 10?
      let cont = 0, total = 0;
      for (let i = 8; i < c.length; i++) {
        let s = 1;
        for (let j = i - 1; j > 0; j--) {
          if (c[j] === c[j - 1]) s++;
          else break;
        }
        if (s >= 8) {
          total++;
          if (c[i] === c[i - 1]) cont++;
        }
      }
      if (total < 2) return null;
      const pCont = cont / total;
      // Bệt dài thường tiếp tục nhưng càng dài càng nguy hiểm
      const decay = Math.max(0.35, 1 - (streak - 8) * 0.08);
      if (pCont * decay > 0.5) {
        return { confidence: pCont * decay, suggest: last };
      }
      return { confidence: 1 - pCont * decay, suggest: last === 'TAI' ? 'XIU' : 'TAI' };
    }

    /* 12. CẦU 3-2-1 giảm dần */
    cau321() {
      const c = this.history;
      if (c.length < 15) return null;
      const groups = groupRuns(c.slice(-12));
      if (groups.length < 3) return null;
      const last3 = groups.slice(-3);
      const ns = last3.map(g => g.n);
      // 3-2-1 hoặc 2-1 hoặc 1-2-3 (tăng dần)
      const decreasing = ns[0] > ns[1] && ns[1] > ns[2];
      const increasing = ns[0] < ns[1] && ns[1] < ns[2];
      if (decreasing) {
        // Tiếp tục giảm → nhóm tới có n = 1 hoặc đảo
        return { confidence: 0.65, suggest: last3[2].k === 'TAI' ? 'XIU' : 'TAI' };
      }
      if (increasing) {
        // Đang tăng → tiếp tục nhóm cuối
        return { confidence: 0.68, suggest: last3[2].k };
      }
      return null;
    }

    /* 13. CẦU ĐỐI XỨNG — mirror pattern */
    cauDoiXung() {
      const c = this.history;
      if (c.length < 12) return null;
      // So sánh 6 phiên gần với 6 phiên trước đó
      const a = c.slice(-12, -6);
      const b = c.slice(-6);
      // Nếu a = đảo của b → cầu đối xứng
      let mirror = true;
      for (let i = 0; i < 6; i++) {
        const oppA = a[i] === 'TAI' ? 'XIU' : 'TAI';
        if (b[i] !== oppA) { mirror = false; break; }
      }
      if (mirror) {
        return { confidence: 0.7, suggest: b[0] };
      }
      return null;
    }

    /* 14. CẦU ĐẦU-CUỐI (đầu chuỗi = cuối chuỗi) */
    cauDauCuoi() {
      const c = this.history;
      if (c.length < 16) return null;
      const last8 = c.slice(-8);
      const prev8 = c.slice(-16, -8);
      // Check nếu chuỗi 8 phiên lặp lại
      let same = 0;
      for (let i = 0; i < 8; i++) if (last8[i] === prev8[i]) same++;
      if (same >= 6) {
        return { confidence: 0.72, suggest: last8[0] };
      }
      return null;
    }

    /* ============================================================
       NHÓM 2: PATTERN MATCHING (8 thuật toán)
       ============================================================ */

    /* 15. N-GRAM match chính */
    nGramMatch() {
      const c = this.history;
      if (c.length < 20) return null;
      let best = null;
      for (let L = Math.min(12, Math.floor(c.length / 2)); L >= 4; L--) {
        const pattern = c.slice(-L);
        const stats = this.matchPattern(pattern);
        if (stats && stats.suggest && stats.total >= 4) {
          // Ưu tiên pattern dài và có tỉ lệ cao
          const score = stats.confidence * Math.log(stats.total + 1) + L * 0.02;
          if (!best || score > best.score) {
            best = { ...stats, length: L, score };
          }
        }
      }
      return best ? { confidence: best.confidence, suggest: best.suggest } : null;
    }

    /* 16. N-GRAM ngắn 3 phiên */
    nGram3() {
      const c = this.history;
      if (c.length < 12) return null;
      const pattern = c.slice(-3);
      const stats = this.matchPattern(pattern);
      if (!stats || !stats.suggest || stats.total < 3) return null;
      return { confidence: stats.confidence, suggest: stats.suggest };
    }

    /* 17. N-GRAM trung 5 phiên */
    nGram5() {
      const c = this.history;
      if (c.length < 15) return null;
      const pattern = c.slice(-5);
      const stats = this.matchPattern(pattern);
      if (!stats || !stats.suggest || stats.total < 3) return null;
      return { confidence: stats.confidence, suggest: stats.suggest };
    }

    /* 18. N-GRAM dài 8 phiên */
    nGram8() {
      const c = this.history;
      if (c.length < 25) return null;
      const pattern = c.slice(-8);
      const stats = this.matchPattern(pattern);
      if (!stats || !stats.suggest || stats.total < 3) return null;
      return { confidence: stats.confidence, suggest: stats.suggest };
    }

    /* 19. Markov chuỗi bậc 1 */
    markov1() {
      const c = this.history;
      if (c.length < 15) return null;
      const last = c[c.length - 1];
      let tAfterT = 0, xAfterT = 0, tAfterX = 0, xAfterX = 0;
      for (let i = 1; i < c.length; i++) {
        if (c[i - 1] === 'TAI') {
          if (c[i] === 'TAI') tAfterT++; else xAfterT++;
        } else {
          if (c[i] === 'TAI') tAfterX++; else xAfterX++;
        }
      }
      let p, suggest;
      if (last === 'TAI') {
        const total = tAfterT + xAfterT;
        if (total < 5) return null;
        p = tAfterT / total;
        suggest = p > 0.5 ? 'TAI' : 'XIU';
      } else {
        const total = tAfterX + xAfterX;
        if (total < 5) return null;
        p = xAfterX / total;
        suggest = p > 0.5 ? 'XIU' : 'TAI';
      }
      const conf = Math.abs(p - 0.5) * 2;
      if (conf < 0.1) return null;
      return { confidence: conf, suggest };
    }

    /* 20. Markov chuỗi bậc 2 */
    markov2() {
      const c = this.history;
      if (c.length < 20) return null;
      const last2 = c.slice(-2).join('');
      let tHit = 0, xHit = 0;
      for (let i = 2; i < c.length; i++) {
        if (c.slice(i - 2, i).join('') === last2) {
          if (c[i] === 'TAI') tHit++; else xHit++;
        }
      }
      const total = tHit + xHit;
      if (total < 4) return null;
      const p = Math.max(tHit, xHit) / total;
      return { confidence: p, suggest: tHit > xHit ? 'TAI' : 'XIU' };
    }

    /* 21. Markov chuỗi bậc 3 */
    markov3() {
      const c = this.history;
      if (c.length < 25) return null;
      const last3 = c.slice(-3).join('');
      let tHit = 0, xHit = 0;
      for (let i = 3; i < c.length; i++) {
        if (c.slice(i - 3, i).join('') === last3) {
          if (c[i] === 'TAI') tHit++; else xHit++;
        }
      }
      const total = tHit + xHit;
      if (total < 3) return null;
      const p = Math.max(tHit, xHit) / total;
      return { confidence: p, suggest: tHit > xHit ? 'TAI' : 'XIU' };
    }

    /* 22. KNN so khớp chuỗi tương tự */
    knn() {
      const c = this.history;
      const W = 6;
      if (c.length < W + 15) return null;
      const cur = c.slice(-W);
      const matches = [];
      for (let i = 0; i <= c.length - W - 1; i++) {
        let same = 0;
        for (let j = 0; j < W; j++) if (c[i + j] === cur[j]) same++;
        if (same >= W - 1) matches.push({ sim: same, next: c[i + W] });
      }
      if (matches.length < 4) return null;
      matches.sort((a, b) => b.sim - a.sim);
      const top = matches.slice(0, 15);
      let t = 0, x = 0;
      for (const m of top) if (m.next === 'TAI') t++; else x++;
      const p = Math.max(t, x) / top.length;
      return { confidence: p, suggest: t > x ? 'TAI' : 'XIU' };
    }

    /* ============================================================
       NHÓM 3: THỐNG KÊ / XÁC SUẤT (6 thuật toán)
       ============================================================ */

    /* 23. Bayesian đảo */
    bayesian() {
      const c = this.history;
      if (c.length < 20) return null;
      const last = c[c.length - 1];
      const opp = last === 'TAI' ? 'XIU' : 'TAI';
      let cA = 0, cAB = 0;
      for (let i = 0; i < c.length; i++) {
        if (c[i] === last) {
          cA++;
          if (i > 0 && c[i - 1] === last && i < c.length) {} // no-op
        }
        if (i > 0 && c[i - 1] === last && c[i] === opp) cAB++;
      }
      if (cA < 5) return null;
      const pOpp = cAB / cA;
      const conf = Math.abs(pOpp - 0.5) * 2;
      if (conf < 0.1) return null;
      return { confidence: conf, suggest: pOpp > 0.5 ? opp : last };
    }

    /* 24. Xu hướng 15 phiên */
    trend15() {
      const c = this.history;
      if (c.length < 15) return null;
      const { tai, xiu } = this.countRecent(15);
      const ratio = tai / 15;
      if (ratio > 0.6) return { confidence: 0.62, suggest: 'XIU' };
      if (ratio < 0.4) return { confidence: 0.62, suggest: 'TAI' };
      return null;
    }

    /* 25. Xu hướng 30 phiên */
    trend30() {
      const c = this.history;
      if (c.length < 30) return null;
      const { tai } = this.countRecent(30);
      const ratio = tai / 30;
      if (ratio > 0.62) return { confidence: 0.65, suggest: 'XIU' };
      if (ratio < 0.38) return { confidence: 0.65, suggest: 'TAI' };
      return null;
    }

    /* 26. Fibonacci — tỉ lệ vàng */
    fibo() {
      const c = this.history;
      if (c.length < 20) return null;
      const { tai } = this.countRecent(20);
      const ratio = tai / 20;
      if (ratio > 0.618) return { confidence: 0.7, suggest: 'XIU' };
      if (ratio < 0.382) return { confidence: 0.7, suggest: 'TAI' };
      return null;
    }

    /* 27. Entropy — độ hỗn loạn */
    entropy() {
      const c = this.history;
      if (c.length < 20) return null;
      const { tai, xiu, total } = this.countRecent(20);
      const pT = tai / total, pX = xiu / total;
      let H = 0;
      if (pT > 0) H -= pT * Math.log2(pT);
      if (pX > 0) H -= pX * Math.log2(pX);
      // H cao → hỗn loạn → theo cầu đảo
      if (H > 0.95) return null;
      return { confidence: 1 - H, suggest: pT > pX ? 'TAI' : 'XIU' };
    }

    /* 28. Adaptive variance */
    adaptive() {
      const c = this.history;
      if (c.length < 20) return null;
      const win = c.slice(-20);
      const { tai } = this.countRecent(20);
      const ratio = tai / 20;
      let variance = 0;
      for (const v of win) variance += Math.pow((v === 'TAI' ? 1 : 0) - ratio, 2);
      variance /= win.length;
      if (variance < 0.15) return null;
      return { confidence: Math.min(0.85, variance * 2), suggest: ratio > 0.5 ? 'XIU' : 'TAI' };
    }

    /* ============================================================
       NHÓM 4: MOMENTUM / SMOOTHING (5 thuật toán)
       ============================================================ */

    /* 29. Momentum có trọng số */
    momentum() {
      const c = this.history;
      if (c.length < 15) return null;
      let sT = 0, sX = 0;
      for (let i = Math.max(0, c.length - 15); i < c.length; i++) {
        const w = Math.exp(-(c.length - 1 - i) / 5);
        if (c[i] === 'TAI') sT += w; else sX += w;
      }
      const total = sT + sX;
      if (total < 1) return null;
      const pT = sT / total;
      const conf = Math.abs(pT - 0.5) * 2;
      if (conf < 0.08) return null;
      return { confidence: conf, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
    }

    /* 30. Weighted Moving Average 12 */
    wma12() {
      const c = this.history;
      if (c.length < 12) return null;
      let sT = 0, wSum = 0;
      for (let i = 0; i < 12; i++) {
        const w = i + 1;
        wSum += w;
        if (c[c.length - 12 + i] === 'TAI') sT += w;
      }
      const pT = sT / wSum;
      const conf = Math.abs(pT - 0.5) * 2;
      if (conf < 0.1) return null;
      return { confidence: conf, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
    }

    /* 31. EMA 12 */
    ema12() {
      const c = this.history;
      if (c.length < 12) return null;
      const alpha = 0.3;
      let ema = c[0] === 'TAI' ? 1 : 0;
      for (let i = 1; i < c.length; i++) {
        const v = c[i] === 'TAI' ? 1 : 0;
        ema = alpha * v + (1 - alpha) * ema;
      }
      const conf = Math.abs(ema - 0.5) * 2;
      if (conf < 0.1) return null;
      return { confidence: conf, suggest: ema > 0.5 ? 'TAI' : 'XIU' };
    }

    /* 32. Neural-like sigmoid */
    neural() {
      const c = this.history;
      if (c.length < 15) return null;
      const W = 10;
      const weights = [0.4, 0.6, 0.9, 1.2, 1.5, 1.2, 0.9, 0.6, 0.4, 0.3];
      let s = 0;
      for (let i = 0; i < W; i++) {
        const v = c[c.length - W + i] === 'TAI' ? 1 : -1;
        s += v * weights[i];
      }
      const sig = 1 / (1 + Math.exp(-s));
      const conf = Math.abs(sig - 0.5) * 2;
      if (conf < 0.1) return null;
      return { confidence: conf, suggest: sig > 0.5 ? 'TAI' : 'XIU' };
    }

    /* 33. Recurrent sequence */
    recurrent() {
      const c = this.history;
      if (c.length < 20) return null;
      const W = 8;
      const cur = c.slice(-W);
      let sT = 0, sX = 0, total = 0;
      for (let i = 0; i <= c.length - W - 1; i++) {
        let sim = 0;
        for (let j = 0; j < W; j++) if (c[i + j] === cur[j]) sim++;
        if (sim < W - 2) continue;
        const weight = Math.pow(2, sim - (W - 2));
        if (c[i + W] === 'TAI') sT += weight; else sX += weight;
        total++;
      }
      if (total < 3 || sT + sX < 1) return null;
      const pT = sT / (sT + sX);
      const conf = Math.abs(pT - 0.5) * 2;
      if (conf < 0.1) return null;
      return { confidence: conf, suggest: pT > 0.5 ? 'TAI' : 'XIU' };
    }

    /* ============================================================
       NHÓM 5: VOLATILITY / CLUSTER (3 thuật toán)
       ============================================================ */

    /* 34. Volatility — độ biến động */
    volatility() {
      const c = this.history;
      if (c.length < 25) return null;
      const win = c.slice(-25);
      let changes = 0;
      for (let i = 1; i < win.length; i++) if (win[i] !== win[i - 1]) changes++;
      const ratio = changes / (win.length - 1);
      const last = c[c.length - 1];
      const opp = last === 'TAI' ? 'XIU' : 'TAI';
      if (ratio > 0.7) return { confidence: Math.min(0.75, ratio), suggest: last };
      if (ratio < 0.3) return { confidence: Math.min(0.75, 1 - ratio), suggest: opp };
      return null;
    }

    /* 35. Cluster — chuỗi dài bất thường */
    cluster() {
      const c = this.history;
      if (c.length < 30) return null;
      const win = c.slice(-30);
      const groups = groupRuns(win);
      if (groups.length < 5) return null;
      const avgRun = win.length / groups.length;
      const lastG = groups[groups.length - 1];
      if (lastG.n >= avgRun * 2.5) {
        return { confidence: 0.72, suggest: lastG.k === 'TAI' ? 'XIU' : 'TAI' };
      }
      return null;
    }

    /* 36. Zigzag */
    zigzag() {
      const c = this.history;
      if (c.length < 12) return null;
      const win = c.slice(-12);
      let zig = 0, zag = 0;
      for (let i = 1; i < win.length; i++) {
        if (win[i] !== win[i - 1]) {
          if (win[i - 1] === 'TAI') zig++; else zag++;
        }
      }
      if (zig >= 4 || zag >= 4) {
        return { confidence: 0.68, suggest: c[c.length - 1] === 'TAI' ? 'XIU' : 'TAI' };
      }
      return null;
    }

    /* ============================================================
       ENSEMBLE — TỔNG HỢP 36 THUẬT TOÁN
       ============================================================ */
    predict() {
      const algos = [
        /* BÁM CẦU — trọng số cao */
        { name: 'cauBet',      w: 3.2, r: this.cauBet() },
        { name: 'cau11',       w: 3.0, r: this.cau11() },
        { name: 'cau22',       w: 3.1, r: this.cau22() },
        { name: 'cau33',       w: 3.1, r: this.cau33() },
        { name: 'cau44',       w: 2.9, r: this.cau44() },
        { name: 'cauNghieng',  w: 2.7, r: this.cauNghieng() },
        { name: 'cauBe',       w: 3.0, r: this.cauBe() },
        { name: 'cauGay',      w: 2.8, r: this.cauGay() },
        { name: 'cauDao',      w: 2.8, r: this.cauDao() },
        { name: 'cauSoLe',     w: 2.8, r: this.cauSoLe() },
        { name: 'bamBetDai',   w: 3.2, r: this.bamBetDai() },
        { name: 'cau321',      w: 2.6, r: this.cau321() },
        { name: 'cauDoiXung',  w: 2.7, r: this.cauDoiXung() },
        { name: 'cauDauCuoi',  w: 2.7, r: this.cauDauCuoi() },
        /* Pattern Matching */
        { name: 'nGramMatch',  w: 3.3, r: this.nGramMatch() },
        { name: 'nGram3',      w: 2.8, r: this.nGram3() },
        { name: 'nGram5',      w: 3.0, r: this.nGram5() },
        { name: 'nGram8',      w: 3.1, r: this.nGram8() },
        { name: 'markov1',     w: 2.6, r: this.markov1() },
        { name: 'markov2',     w: 2.9, r: this.markov2() },
        { name: 'markov3',     w: 2.9, r: this.markov3() },
        { name: 'knn',         w: 2.8, r: this.knn() },
        /* Thống kê */
        { name: 'bayesian',    w: 2.0, r: this.bayesian() },
        { name: 'trend15',     w: 1.7, r: this.trend15() },
        { name: 'trend30',     w: 1.6, r: this.trend30() },
        { name: 'fibo',        w: 1.5, r: this.fibo() },
        { name: 'entropy',     w: 1.2, r: this.entropy() },
        { name: 'adaptive',    w: 1.5, r: this.adaptive() },
        /* Momentum */
        { name: 'momentum',    w: 1.9, r: this.momentum() },
        { name: 'wma12',       w: 1.7, r: this.wma12() },
        { name: 'ema12',       w: 1.8, r: this.ema12() },
        { name: 'neural',      w: 2.1, r: this.neural() },
        { name: 'recurrent',   w: 2.4, r: this.recurrent() },
        /* Volatility */
        { name: 'volatility',  w: 1.6, r: this.volatility() },
        { name: 'cluster',     w: 2.0, r: this.cluster() },
        { name: 'zigzag',      w: 1.8, r: this.zigzag() }
      ];

      let sT = 0, sX = 0, tW = 0, used = 0;
      let tCount = 0, xCount = 0;

      for (const a of algos) {
        if (!a.r || !a.r.suggest) continue;
        const conf = Math.min(1, a.r.confidence || 0.5);
        const w = a.w * conf;
        if (a.r.suggest === 'TAI') { sT += w; tCount++; }
        else { sX += w; xCount++; }
        tW += w;
        used++;
      }

      if (tW < 1 || used < 3) {
        return { g: null, conf: 0, used: used };
      }

      const total = sT + sX;
      let rawConf = Math.max(sT, sX) / total;

      /* Boost theo số thuật toán đồng thuận */
      const agreement = Math.max(tCount, xCount) / used;
      if (used < 5)       rawConf *= 0.75;
      else if (used < 10) rawConf *= 0.88;
      else if (used < 15) rawConf *= 0.95;
      else if (used < 22) rawConf *= 1.02;
      else if (used < 28) rawConf *= 1.08;
      else                rawConf *= Math.min(1.18, 1 + (used - 28) * 0.008);

      /* Agreement bonus */
      rawConf = rawConf * (0.7 + agreement * 0.3);

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

      return {
        g: sT > sX ? 'TAI' : 'XIU',
        conf: conf,
        used: used
      };
    }
  }

  return { Yq: TaiXiuEngine, predict: (eng) => eng.predict() };
})();

window.TEEngine = TEEngine;
