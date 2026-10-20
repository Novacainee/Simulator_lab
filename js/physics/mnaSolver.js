/* ==========================================================================
   js/physics/mnaSolver.js - Bộ giải mạch điện MNA (Modified Nodal Analysis)
   ========================================================================== */

import { S, comps, wires, getTermPos } from '../state.js';
import { sfxZap } from '../audio/soundEngine.js';

export function cleanZero(val, eps = 1e-4) {
  return Math.abs(val) < eps ? 0 : val;
}

export function fmt(val, dec = 2) {
  return cleanZero(val).toFixed(dec);
}

export function solveLinearSystem(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    let maxVal = Math.abs(A[i][i]);
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxVal) {
        maxVal = Math.abs(A[k][i]);
        maxRow = k;
      }
    }
    if (maxVal < 1e-18) continue;
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];
    for (let k = i + 1; k < n; k++) {
      const f = A[k][i] / A[i][i];
      b[k] -= f * b[i];
      for (let j = i; j < n; j++) A[k][j] -= f * A[i][j];
    }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = Math.abs(A[i][i]) > 1e-18 ? s / A[i][i] : 0;
  }
  return x;
}

export function distToSegment(p, a, b) {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

export function findProbeNode(pt, idxOf) {
  for (let ci = 0; ci < comps.length; ci++) {
    const c = comps[ci];
    if (c.type === 'voltmeter') continue;
    for (let s = 0; s <= 1; s++) {
      const tp = getTermPos(c, s);
      if (Math.hypot(pt.x - tp.x, pt.y - tp.y) <= 20) return ci * 2 + s;
    }
  }
  for (let ci = 0; ci < comps.length; ci++) {
    const c = comps[ci];
    if (c.type === 'wire_seg') {
      if (distToSegment(pt, getTermPos(c, 0), getTermPos(c, 1)) <= 12) return ci * 2;
    }
  }
  for (const w of wires) {
    const c1 = comps.find(x => x.id === w.c1);
    const c2 = comps.find(x => x.id === w.c2);
    if (c1 && c2 && distToSegment(pt, getTermPos(c1, w.s1), getTermPos(c2, w.s2)) <= 12) {
      return idxOf(w.c1, w.s1);
    }
  }
  return -1;
}

// Hooks được đăng ký bởi uiController2d & renderer2d
let onUpdateUI = null;
let onSpawnBurst = null;
let onSayMessage = null;

export function registerSolverCallbacks(callbacks) {
  if (callbacks.updateUI) onUpdateUI = callbacks.updateUI;
  if (callbacks.spawnBurst) onSpawnBurst = callbacks.spawnBurst;
  if (callbacks.sayMessage) onSayMessage = callbacks.sayMessage;
}

export function solveCircuit(triggerFeedback = false) {
  const N = comps.length * 2;
  if (N === 0) {
    if (onUpdateUI) onUpdateUI();
    return;
  }

  const idxOf = (cId, side) => {
    const ci = comps.findIndex(c => c.id === cId);
    return ci >= 0 ? ci * 2 + side : -1;
  };

  const G = Array.from({ length: N }, () => new Float64Array(N));
  const rhs = new Float64Array(N);
  const adj = Array.from({ length: N }, () => []);

  function stampR(n1, n2, R, isActiveEdge = true) {
    const g = 1 / R;
    G[n1][n1] += g; G[n2][n2] += g;
    G[n1][n2] -= g; G[n2][n1] -= g;
    if (isActiveEdge) {
      adj[n1].push(n2);
      adj[n2].push(n1);
    }
  }

  wires.forEach(w => {
    const n1 = idxOf(w.c1, w.s1);
    const n2 = idxOf(w.c2, w.s2);
    if (n1 >= 0 && n2 >= 0) stampR(n1, n2, 1e-5, true);
  });

  comps.forEach((c, ci) => {
    const n1 = ci * 2, n2 = ci * 2 + 1;
    if (c.type === 'wire_seg') {
      stampR(n1, n2, 1e-5, true);
    } else if (c.type === 'battery') {
      const Rint = 1e-4;
      stampR(n1, n2, Rint, true);
      const Ieq = c.v / Rint;
      rhs[n1] -= Ieq;
      rhs[n2] += Ieq;
    } else if (c.type === 'switch') {
      if (c.closed) stampR(n1, n2, 1e-5, true);
      else stampR(n1, n2, 1e9, false);
    } else if (c.type === 'bulb') {
      if (c.blown) stampR(n1, n2, 1e9, false);
      else stampR(n1, n2, c.r, true);
    } else if (c.type === 'resistor' || c.type === 'bell') {
      stampR(n1, n2, c.r, true);
    } else if (c.type === 'fuse') {
      if (c.blown) stampR(n1, n2, 1e9, false);
      else stampR(n1, n2, 1e-4, true);
    } else if (c.type === 'ammeter') {
      stampR(n1, n2, 1e-5, true);
    } else if (c.type === 'voltmeter') {
      stampR(n1, n2, 1e9, false);
    }
  });

  const visited = new Uint8Array(N);
  const domainOf = new Int32Array(N).fill(-1);
  let domId = 0;

  for (let start = 0; start < N; start++) {
    if (visited[start]) continue;
    domId++;
    const compNodes = [];
    const q = [start];
    visited[start] = 1;
    domainOf[start] = domId;
    while (q.length) {
      const u = q.shift();
      compNodes.push(u);
      for (const v of adj[u]) {
        if (!visited[v]) {
          visited[v] = 1;
          domainOf[v] = domId;
          q.push(v);
        }
      }
    }
    let gnd = compNodes[0];
    for (const u of compNodes) {
      const c = comps[u >> 1];
      if (c.type === 'battery' && (u & 1) === 0) {
        gnd = u;
        break;
      }
    }
    for (let j = 0; j < N; j++) G[gnd][j] = 0;
    G[gnd][gnd] = 1;
    rhs[gnd] = 0;
  }
  for (let i = 0; i < N; i++) G[i][i] += 1e-12;

  const V = solveLinearSystem(G, rhs);

  S.shortCircuit = false;
  S.ammeterShort = false;
  let newlyBlownFuse = false;
  let newlyBlownBulb = false;

  comps.forEach((c, ci) => {
    const v1 = V[ci * 2], v2 = V[ci * 2 + 1];
    if (c.type === 'wire_seg') {
      c.U = cleanZero(Math.abs(v1 - v2));
      c.I = cleanZero((v1 - v2) / 1e-5);
    } else if (c.type === 'battery') {
      c.U = cleanZero(v2 - v1);
      c.I = cleanZero((c.v - (v2 - v1)) / 1e-4);
      if (Math.abs(c.I) > 25) S.shortCircuit = true;
    } else if (c.type === 'switch') {
      c.U = cleanZero(Math.abs(v1 - v2));
      c.I = c.closed ? cleanZero((v1 - v2) / 1e-5) : 0;
    } else if (c.type === 'bulb') {
      c.U = cleanZero(Math.abs(v1 - v2));
      c.I = c.blown ? 0 : cleanZero((v1 - v2) / c.r);
      c.P = cleanZero(Math.abs(c.U * c.I));
      if (!c.blown && c.U > 16.0) {
        c.blown = true;
        c.I = 0;
        c.P = 0;
        newlyBlownBulb = true;
        if (onSpawnBurst) onSpawnBurst(c.x, c.y, '#ffffff');
        sfxZap();
      }
    } else if (c.type === 'resistor' || c.type === 'bell') {
      c.U = cleanZero(Math.abs(v1 - v2));
      c.I = cleanZero((v1 - v2) / c.r);
    } else if (c.type === 'fuse') {
      c.U = cleanZero(Math.abs(v1 - v2));
      c.I = c.blown ? 0 : cleanZero((v1 - v2) / 1e-4);
      if (!c.blown && Math.abs(c.I) > 2.5) {
        c.blown = true;
        c.I = 0;
        newlyBlownFuse = true;
        if (onSpawnBurst) onSpawnBurst(c.x, c.y, '#ffc93c');
        sfxZap();
      }
    } else if (c.type === 'ammeter') {
      // Ampe kế PhET: không phân cực, đo chiều nào cũng ra I >= 0
      c.U = cleanZero(Math.abs(v1 - v2));
      c.I = cleanZero(Math.abs(v1 - v2) / 1e-5);
      if (c.I > 25) {
        S.ammeterShort = true;
        S.shortCircuit = true;
      }
    } else if (c.type === 'voltmeter') {
      const nBlack = findProbeNode(c.p0, idxOf);
      const nRed   = findProbeNode(c.p1, idxOf);
      if (nBlack >= 0 && nRed >= 0 && domainOf[nBlack] === domainOf[nRed]) {
        c.connected = true;
        c.U = cleanZero(V[nRed] - V[nBlack]);
      } else {
        c.connected = false;
        c.U = 0;
      }
      c.I = 0;
    }
  });

  if (newlyBlownFuse || newlyBlownBulb) {
    solveCircuit(false);
    if (!S.docMysteryActive && onSayMessage) {
      if (newlyBlownFuse) {
        onSayMessage('⚡ <b>TÁCH! Cầu chì đã tự đứt dây chì!</b> Do dòng điện vượt quá 2,5 A, cầu chì tự ngắt mạch để bảo vệ nguồn điện!', 'warn');
      } else if (newlyBlownBulb) {
        onSayMessage('💥 <b>BỤP! Bóng đèn bị cháy đứt dây tóc rồi!</b> Hiệu điện thế vượt quá 16 V. Hãy giảm số Vôn của nguồn và bấm <b>"Sửa mới"</b> nhé!', 'warn');
      }
    }
    if (onUpdateUI) onUpdateUI();
    return;
  }

  wires.forEach(w => {
    const n1 = idxOf(w.c1, w.s1);
    const n2 = idxOf(w.c2, w.s2);
    w.I = (n1 >= 0 && n2 >= 0) ? cleanZero((V[n1] - V[n2]) / 1e-5) : 0;
  });

  if (onUpdateUI) onUpdateUI(triggerFeedback);
}
