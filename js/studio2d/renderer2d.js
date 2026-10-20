/* ==========================================================================
   js/studio2d/renderer2d.js - Vẽ bàn mạch 2D: Linh kiện PhET, Ký hiệu SGK,
                               Dòng hạt electron, Vôn kế 2 que đo & tia lửa điện
   ========================================================================== */

import { S, comps, wires, sparks, getTermPos } from '../state.js';
import { fmt, cleanZero, findProbeNode } from '../physics/mnaSolver.js';
import { sfxBell } from '../audio/soundEngine.js';

let cv = null;
let g = null;
let W = window.innerWidth;
let H = window.innerHeight;

const RES_COLS = ['#111','#795548','#f44336','#ff9800','#ffeb3b','#4caf50','#2196f3','#9c27b0','#9e9e9e','#fff'];

export function initRenderer2D(canvasElement) {
  cv = canvasElement;
  g = cv.getContext('2d');
  resize2D();
  window.addEventListener('resize', resize2D);
}

export function getCanvasDimensions() {
  return { W, H };
}

export function resize2D() {
  if (!cv || !g) return;
  const d = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  cv.width = W * d;
  cv.height = H * d;
  g.setTransform(d, 0, 0, d, 0, 0);
}

export function spawnBurst(x, y, color = '#ffc93c') {
  for (let i = 0; i < 24; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 1.5 + Math.random() * 4.5;
    sparks.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 1,
      life: 1,
      col: color
    });
  }
}

function getResistorBands(val) {
  const v = Math.max(1, Math.min(99, Math.round(val)));
  return [RES_COLS[Math.floor(v / 10)], RES_COLS[v % 10], RES_COLS[0], '#d4af37'];
}

export function drawGrid() {
  g.fillStyle = S.view === 'schem' ? '#0f1e3d' : '#0b1528';
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(148, 163, 184, 0.14)';
  const step = 30;
  for (let x = step; x < W; x += step) {
    for (let y = step; y < H; y += step) {
      g.fillRect(x - 1, y - 1, 2, 2);
    }
  }
}

export function drawParticlesOnSegment(p1, p2, currentI, objWithPhase, dt) {
  if (S.flow === 'none') return;
  const absI = Math.abs(currentI);
  const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const count = Math.max(2, Math.floor(len / 26));
  const dir = S.flow === 'elec' ? -Math.sign(currentI) : Math.sign(currentI);
  const speed = absI > 0.01 ? Math.min(8, Math.pow(absI, 0.65) * 1.6) : 0;
  objWithPhase.phase = (objWithPhase.phase + dir * speed * (dt / 1000) * 1.4 + 10) % 1;

  const ux = (p2.x - p1.x) / (len || 1);
  const uy = (p2.y - p1.y) / (len || 1);

  for (let i = 0; i < count; i++) {
    const t = ((i + objWithPhase.phase) / count) % 1;
    const px = p1.x + (p2.x - p1.x) * t;
    const py = p1.y + (p2.y - p1.y) * t;

    if (S.flow === 'elec') {
      g.beginPath();
      g.arc(px, py, 4.2, 0, Math.PI * 2);
      g.fillStyle = '#38bdf8';
      g.fill();
      g.strokeStyle = '#0b1528';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = '#0b1528';
      g.fillRect(px - 2.2, py - 0.6, 4.4, 1.2);
    } else if (absI > 0.01) {
      const ang = Math.atan2(uy * dir, ux * dir);
      g.save();
      g.translate(px, py);
      g.rotate(ang);
      g.fillStyle = '#ffc93c';
      g.beginPath();
      g.moveTo(5, 0);
      g.lineTo(-4, -4);
      g.lineTo(-4, 4);
      g.closePath();
      g.fill();
      g.restore();
    }
  }
}

export function drawWires(dt) {
  wires.forEach(w => {
    const c1 = comps.find(c => c.id === w.c1);
    const c2 = comps.find(c => c.id === w.c2);
    if (!c1 || !c2) return;
    const p1 = getTermPos(c1, w.s1);
    const p2 = getTermPos(c2, w.s2);
    const isHot = Math.abs(w.I) > 20;

    g.save();
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    g.lineCap = 'round';

    if (S.view === 'schem') {
      g.strokeStyle = isHot ? '#ff5252' : '#ffffff';
      g.lineWidth = 3.2;
      g.stroke();
    } else {
      g.strokeStyle = '#4a1c0d';
      g.lineWidth = 9;
      g.stroke();
      g.strokeStyle = isHot ? '#ff4733' : '#d96b43';
      g.lineWidth = 5.8;
      g.stroke();
    }

    drawParticlesOnSegment(p1, p2, w.I, w, dt);
    g.restore();
  });
}

export function drawPhETVoltmeter(c) {
  g.save();
  if (S.selectedId === c.id) {
    g.strokeStyle = '#ffc93c';
    g.lineWidth = 2;
    g.setLineDash([5, 4]);
    g.strokeRect(c.x - 46, c.y - 48, 92, 96);
    g.setLineDash([]);
  }

  const sockBlack = { x: c.x - 7, y: c.y + 33 };
  const sockRed   = { x: c.x + 7, y: c.y + 33 };
  const angBlack = 0.34;
  const angRed   = -0.34;
  const handleLen = 58;

  const tailBlack = {
    x: c.p0.x - Math.sin(angBlack) * handleLen,
    y: c.p0.y + Math.cos(angBlack) * handleLen
  };
  const tailRed = {
    x: c.p1.x - Math.sin(angRed) * handleLen,
    y: c.p1.y + Math.cos(angRed) * handleLen
  };

  g.lineCap = 'round';
  g.lineWidth = 3.5;

  // Dây que đo Đen
  g.strokeStyle = '#111827';
  g.beginPath();
  g.moveTo(sockBlack.x, sockBlack.y);
  g.bezierCurveTo(sockBlack.x - 25, sockBlack.y + 45, tailBlack.x - 10, tailBlack.y + 30, tailBlack.x, tailBlack.y);
  g.stroke();

  // Dây que đo Đỏ
  g.strokeStyle = '#ff1e00';
  g.beginPath();
  g.moveTo(sockRed.x, sockRed.y);
  g.bezierCurveTo(sockRed.x + 25, sockRed.y + 45, tailRed.x + 10, tailRed.y + 30, tailRed.x, tailRed.y);
  g.stroke();

  // Thân vỏ đồng hồ PhET
  g.save();
  g.translate(c.x, c.y);
  g.fillStyle = '#1e1e1e';
  g.strokeStyle = '#000';
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(-38, -44, 76, 86, 22);
  g.fill();
  g.stroke();

  // Vệt bóng phản quang mặt kính cong
  g.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  g.lineWidth = 3.5;
  g.beginPath();
  g.arc(-18, -24, 15, Math.PI * 1.05, Math.PI * 1.48);
  g.stroke();

  // Mặt cam chuẩn PhET
  g.fillStyle = '#f59e2d';
  g.beginPath();
  g.roundRect(-30, -33, 60, 56, 15);
  g.fill();

  g.fillStyle = '#000';
  g.font = '700 13px "Be Vietnam Pro", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Hiệu thế', 0, -17);

  // Màn hình LCD trắng
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#111';
  g.lineWidth = 1.6;
  g.beginPath();
  g.roundRect(-24, -6, 48, 22, 5);
  g.fill();
  g.stroke();

  // Chữ số đo Vôn
  g.fillStyle = '#111';
  g.font = '800 11.5px "Be Vietnam Pro", monospace';
  g.fillText(c.connected ? `${fmt(c.U, 2)} V` : '—', 0, 5.5);

  // Chốt cắm Đen và Đỏ ở chân đồng hồ
  g.fillStyle = '#f59e2d';
  g.beginPath();
  g.ellipse(0, 33, 14, 7, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#000';
  g.beginPath();
  g.arc(-6.5, 33, 4, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#ff3b00';
  g.beginPath();
  g.arc(6.5, 33, 4, 0, Math.PI * 2);
  g.fill();

  g.restore();

  // Vẽ 2 đầu que đo kim loại cầm tay
  function drawProbe(tipPos, angle, isRed) {
    g.save();
    g.translate(tipPos.x, tipPos.y);
    g.rotate(angle);

    const idxOf = (cId, side) => {
      const ci = comps.findIndex(x => x.id === cId);
      return ci >= 0 ? ci * 2 + side : -1;
    };
    if (findProbeNode(tipPos, idxOf) >= 0) {
      g.fillStyle = 'rgba(76, 240, 138, 0.42)';
      g.beginPath();
      g.arc(0, 0, 10, 0, Math.PI * 2);
      g.fill();
    }

    // Mũi kim loại nhọn
    const gTip = g.createLinearGradient(-3, 0, 3, 0);
    gTip.addColorStop(0, '#e2e8f0');
    gTip.addColorStop(0.5, '#94a3b8');
    gTip.addColorStop(1, '#475569');
    g.fillStyle = gTip;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-2.5, 16);
    g.lineTo(2.5, 16);
    g.closePath();
    g.fill();

    // Thân cán que đo cách điện
    const gBody = g.createLinearGradient(-6, 0, 6, 0);
    gBody.addColorStop(0, isRed ? '#ff764d' : '#4b5563');
    gBody.addColorStop(0.45, isRed ? '#c83e1b' : '#111827');
    gBody.addColorStop(1, isRed ? '#7c1d05' : '#000000');
    g.fillStyle = gBody;
    g.fillRect(-3.5, 16, 7, 4);
    g.beginPath();
    g.roundRect(-7.5, 20, 15, 3.5, 1.5);
    g.fill();
    g.beginPath();
    g.moveTo(-4.8, 23.5);
    g.lineTo(4.8, 23.5);
    g.lineTo(3.8, 58);
    g.lineTo(-3.8, 58);
    g.closePath();
    g.fill();

    g.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    g.lineWidth = 1.3;
    for (let ry = 27; ry <= 39; ry += 3) {
      g.beginPath();
      g.moveTo(-4.3, ry);
      g.lineTo(4.3, ry);
      g.stroke();
    }
    g.restore();
  }

  drawProbe(c.p0, angBlack, false);
  drawProbe(c.p1, angRed, true);
  g.restore();
}

export function drawComp(c, time, dt) {
  if (c.type === 'voltmeter') {
    drawPhETVoltmeter(c);
    return;
  }
  g.save();
  g.translate(c.x, c.y);
  if (c.rot === 1) g.rotate(Math.PI / 2);

  if (S.selectedId === c.id) {
    g.strokeStyle = '#ffc93c';
    g.lineWidth = 2;
    g.setLineDash([5, 4]);
    g.strokeRect(-54, -36, 108, 72);
    g.setLineDash([]);
  }

  if (c.type !== 'wire_seg') {
    g.strokeStyle = S.view === 'schem' ? '#fff' : '#94a3b8';
    g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(-46, 0);
    g.lineTo(-28, 0);
    g.moveTo(28, 0);
    g.lineTo(46, 0);
    g.stroke();
  }

  if (S.view === 'schem') drawCompSchem(c);
  else drawCompReal(c, time);

  if (c.type === 'wire_seg') {
    drawParticlesOnSegment({ x: -42, y: 0 }, { x: 42, y: 0 }, c.I, c, dt);
  }

  // Chốt nối 2 đầu linh kiện
  [-46, 46].forEach((tx, sIdx) => {
    const col = c.type === 'battery' ? (sIdx === 1 ? '#ff5252' : '#38bdf8') : '#ffc93c';
    g.beginPath();
    g.arc(tx, 0, 7.5, 0, Math.PI * 2);
    g.fillStyle = col;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#fff';
    g.stroke();
  });

  g.restore();

  // Hiệu ứng bốc cháy khi ngắn mạch
  if ((c.type === 'battery' && Math.abs(c.I) > 25) || (c.type === 'ammeter' && Math.abs(c.I) > 25)) {
    drawFire(c.x, c.y - 12, time);
    if (Math.random() < 0.35) spawnBurst(c.x + (Math.random() - 0.5) * 30, c.y, '#ff6b57');
  }

  if (c.type === 'bell' && Math.abs(c.I) > 0.08) {
    sfxBell();
  }
}

export function drawCompReal(c, time) {
  if (c.type === 'wire_seg') {
    const isHot = Math.abs(c.I) > 20;
    const grad = g.createLinearGradient(0, -6, 0, 6);
    grad.addColorStop(0, isHot ? '#ff9f80' : '#f3a683');
    grad.addColorStop(0.5, isHot ? '#ff3300' : '#c4512d');
    grad.addColorStop(1, '#5a1e0c');
    g.fillStyle = grad;
    g.beginPath();
    g.roundRect(-46, -5.5, 92, 11, 5);
    g.fill();
  } else if (c.type === 'battery') {
    const gB = g.createLinearGradient(0, -16, 0, 16);
    gB.addColorStop(0, '#64748b');
    gB.addColorStop(0.45, '#1e293b');
    gB.addColorStop(1, '#090d16');
    g.fillStyle = gB;
    g.fillRect(-32, -16, 42, 32);

    const gC = g.createLinearGradient(0, -16, 0, 16);
    gC.addColorStop(0, '#fde68a');
    gC.addColorStop(0.5, '#f59e0b');
    gC.addColorStop(1, '#b45309');
    g.fillStyle = gC;
    g.fillRect(10, -16, 20, 32);

    g.fillStyle = '#cbd5e1';
    g.fillRect(30, -7, 5, 14);
    g.strokeStyle = '#fff';
    g.lineWidth = 1.5;
    g.strokeRect(-32, -16, 62, 32);

    g.fillStyle = '#fff';
    g.font = '800 11px "Be Vietnam Pro"';
    g.textAlign = 'center';
    g.fillText(`${c.v}V`, -9, 4);
    g.fillText('-', -24, -5);
    g.fillStyle = '#1e293b';
    g.fillText('+', 20, 4);
  } else if (c.type === 'bulb') {
    const P = c.blown ? 0 : Math.min(25, c.P);
    if (P > 0.05) {
      const rad = Math.min(80, 18 + Math.sqrt(P) * 14);
      const grad = g.createRadialGradient(0, -14, 4, 0, -14, rad);
      grad.addColorStop(0, 'rgba(255, 245, 157, 0.95)');
      grad.addColorStop(0.5, 'rgba(255, 201, 60, 0.45)');
      grad.addColorStop(1, 'rgba(255, 201, 60, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, -14, rad, 0, Math.PI * 2);
      g.fill();

      g.strokeStyle = '#ffe066';
      g.lineWidth = 2;
      const rays = 12;
      const rayLen = Math.min(34, 6 + Math.sqrt(P) * 7);
      for (let i = 0; i < rays; i++) {
        const a = (i / rays) * Math.PI * 2;
        g.beginPath();
        g.moveTo(Math.cos(a) * 20, -14 + Math.sin(a) * 20);
        g.lineTo(Math.cos(a) * (20 + rayLen), -14 + Math.sin(a) * (20 + rayLen));
        g.stroke();
      }
    }
    g.fillStyle = '#94a3b8';
    g.fillRect(-11, 2, 22, 14);
    g.beginPath();
    g.arc(0, -14, 18, 0, Math.PI * 2);
    g.fillStyle = c.blown ? 'rgba(51, 65, 85, 0.85)' : (P > 0.05 ? 'rgba(255, 249, 196, 0.9)' : 'rgba(226, 232, 240, 0.38)');
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#cbd5e1';
    g.stroke();

    g.strokeStyle = c.blown ? '#ef4444' : (P > 0.05 ? '#ffffff' : '#d9534f');
    g.lineWidth = P > 0.05 ? 2.5 : 1.8;
    g.beginPath();
    if (c.blown) {
      g.moveTo(-7, 2); g.lineTo(-4, -14);
      g.moveTo(7, 2); g.lineTo(4, -12);
    } else {
      g.moveTo(-7, 2); g.lineTo(-5, -17);
      g.lineTo(5, -17); g.lineTo(7, 2);
    }
    g.stroke();

    g.fillStyle = '#fff';
    g.font = '700 9.5px "Be Vietnam Pro"';
    g.textAlign = 'center';
    g.fillText(`${c.r}Ω`, 0, 27);
  } else if (c.type === 'switch') {
    g.fillStyle = '#c4512d';
    g.beginPath(); g.roundRect(-30, -4, 14, 8, 3); g.fill();
    g.beginPath(); g.roundRect(16, -4, 14, 8, 3); g.fill();

    g.strokeStyle = '#e07a5f';
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-20, 0);
    if (c.closed) g.lineTo(20, 0);
    else g.lineTo(14, -22);
    g.stroke();

    g.fillStyle = '#cbd5e1';
    g.strokeStyle = '#1e293b';
    g.lineWidth = 2;
    g.beginPath(); g.arc(-20, 0, 5.5, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(20, 0, 4.5, 0, Math.PI * 2); g.fill(); g.stroke();

    g.fillStyle = '#fff';
    g.font = '700 10px "Be Vietnam Pro"';
    g.textAlign = 'center';
    g.fillText(c.closed ? 'K (Đóng)' : 'K (Mở)', 0, 22);
  } else if (c.type === 'resistor') {
    const gR = g.createLinearGradient(0, -11, 0, 11);
    gR.addColorStop(0, '#fff3d6');
    gR.addColorStop(0.55, '#e6c28b');
    gR.addColorStop(1, '#b58950');
    g.fillStyle = gR;
    g.beginPath();
    g.roundRect(-28, -11, 56, 22, 8);
    g.fill();

    const bands = getResistorBands(c.r);
    [-16, -6, 4, 16].forEach((bx, i) => {
      g.fillStyle = bands[i];
      g.fillRect(bx, -10, 5, 20);
    });

    g.fillStyle = '#fff';
    g.font = '700 10px "Be Vietnam Pro"';
    g.textAlign = 'center';
    g.fillText(`${c.r} Ω`, 0, -15);
  } else if (c.type === 'ammeter') {
    g.fillStyle = '#f8fafc';
    g.beginPath();
    g.roundRect(-34, -24, 68, 48, 11);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#475569';
    g.stroke();

    g.fillStyle = '#1e293b';
    g.font = '800 11px "Be Vietnam Pro"';
    g.textAlign = 'center';
    g.fillText('Cường độ', 0, -10);

    const valI = cleanZero(c.I);
    g.fillStyle = '#0f172a';
    g.beginPath();
    g.roundRect(-29, -3, 58, 19, 4);
    g.fill();

    g.fillStyle = valI > 25 ? '#ff5252' : '#4cf08a';
    g.font = '700 10.5px monospace';
    g.fillText(valI > 25 ? 'NGẮN MẠCH!' : `${fmt(valI, 2)} A`, 0, 9.5);
  } else if (c.type === 'fuse') {
    g.fillStyle = 'rgba(226, 232, 240, 0.25)';
    g.fillRect(-26, -10, 52, 20);
    g.strokeStyle = '#94a3b8';
    g.lineWidth = 1.5;
    g.strokeRect(-26, -10, 52, 20);

    g.fillStyle = '#cbd5e1';
    g.fillRect(-28, -11, 8, 22);
    g.fillRect(20, -11, 8, 22);

    g.strokeStyle = c.blown ? '#ef4444' : '#fbbf24';
    g.lineWidth = 2.2;
    g.beginPath();
    if (c.blown) {
      g.moveTo(-20, 0); g.lineTo(-6, -4);
      g.moveTo(20, 0); g.lineTo(6, 4);
    } else {
      g.moveTo(-20, 0);
      g.bezierCurveTo(-8, -7, 8, 7, 20, 0);
    }
    g.stroke();

    g.fillStyle = '#fff';
    g.font = '700 9.5px "Be Vietnam Pro"';
    g.textAlign = 'center';
    g.fillText(c.blown ? 'Đứt (>2.5A)' : 'Cầu chì 2.5A', 0, -14);
  } else if (c.type === 'bell') {
    const ringing = Math.abs(c.I) > 0.08;
    const shake = ringing ? Math.sin(time * 0.08) * 2.5 : 0;
    g.save();
    g.translate(shake, 0);
    g.beginPath();
    g.arc(0, -4, 18, Math.PI, 0);
    g.closePath();
    g.fillStyle = '#ef4444';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#fee2e2';
    g.stroke();

    g.fillStyle = '#fbbf24';
    g.beginPath();
    g.arc(20, -6, 4.5, 0, Math.PI * 2);
    g.fill();
    g.restore();

    g.fillStyle = '#fff';
    g.font = '700 10px "Be Vietnam Pro"';
    g.textAlign = 'center';
    g.fillText('Chuông', 0, 14);
  }
}

export function drawCompSchem(c) {
  g.strokeStyle = '#fff';
  g.fillStyle = '#0f1e3d';
  g.lineWidth = 2.8;
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  if (c.type === 'wire_seg') {
    g.beginPath(); g.moveTo(-46, 0); g.lineTo(46, 0); g.stroke();
  } else if (c.type === 'battery') {
    g.fillRect(-10, -20, 20, 40);
    g.beginPath(); g.moveTo(-28, 0); g.lineTo(-7, 0); g.moveTo(7, 0); g.lineTo(28, 0); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(-7, -11); g.lineTo(-7, 11); g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(7, -20); g.lineTo(7, 20); g.stroke();
    g.fillStyle = '#ffc93c';
    g.font = '800 13px "Be Vietnam Pro"';
    g.fillText('-', -16, -15);
    g.fillText('+', 16, -15);
  } else if (c.type === 'bulb') {
    g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-12.5, -12.5); g.lineTo(12.5, 12.5);
    g.moveTo(12.5, -12.5); g.lineTo(-12.5, 12.5); g.stroke();
  } else if (c.type === 'switch') {
    g.fillRect(-18, -14, 36, 28);
    g.beginPath();
    g.moveTo(-16, 0);
    g.lineTo(c.closed ? 16 : 13, c.closed ? 0 : -16);
    g.stroke();
  } else if (c.type === 'resistor') {
    g.fillRect(-22, -10, 44, 20);
    g.strokeRect(-22, -10, 44, 20);
    g.fillStyle = '#fff';
    g.font = '700 10.5px "Be Vietnam Pro"';
    g.fillText(`R=${c.r}Ω`, 0, 0);
  } else if (c.type === 'ammeter') {
    g.beginPath(); g.arc(0, 0, 19, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#ff9f43';
    g.font = '800 16px "Be Vietnam Pro"';
    g.fillText('A', 0, 1);
  } else if (c.type === 'fuse') {
    g.fillRect(-20, -9, 40, 18);
    g.strokeRect(-20, -9, 40, 18);
    if (!c.blown) {
      g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); g.stroke();
    }
  } else if (c.type === 'bell') {
    g.beginPath(); g.arc(0, 4, 16, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
  }
}

export function drawFire(x, y, time) {
  g.save();
  g.translate(x, y);
  for (let i = 0; i < 3; i++) {
    const s = 1 + Math.sin(time * 0.02 + i * 2) * 0.22;
    g.fillStyle = i === 0 ? '#ef4444' : (i === 1 ? '#f97316' : '#facc15');
    g.beginPath();
    g.moveTo(-14 / (i + 1), 10);
    g.quadraticCurveTo(-16 * s, -15 * s, 0, (-34 + i * 8) * s);
    g.quadraticCurveTo(16 * s, -15 * s, 14 / (i + 1), 10);
    g.closePath();
    g.fill();
  }
  g.restore();
}

export function render2DFrame(time, dt, wireStart, mousePos) {
  drawGrid();
  drawWires(dt);

  // Đường vẽ dây nối đang kéo dở
  if (wireStart) {
    g.save();
    g.strokeStyle = '#ffc93c';
    g.lineWidth = 4;
    g.setLineDash([6, 5]);
    g.beginPath();
    g.moveTo(wireStart.x, wireStart.y);
    g.lineTo(mousePos.x, mousePos.y);
    g.stroke();
    g.restore();
  }

  // Vẽ các linh kiện bình thường trước, Vôn kế vẽ sau để nổi lên trên
  comps.filter(c => c.type !== 'voltmeter').forEach(c => drawComp(c, time, dt));
  comps.filter(c => c.type === 'voltmeter').forEach(c => drawComp(c, time, dt));

  // Cập nhật và vẽ các hạt tia lửa điện
  for (let i = sparks.length - 1; i >= 0; i--) {
    const sp = sparks[i];
    sp.x += sp.vx;
    sp.y += sp.vy;
    sp.vy += 0.18;
    sp.life -= 0.035;
    if (sp.life <= 0) {
      sparks.splice(i, 1);
      continue;
    }
    g.fillStyle = sp.col;
    g.globalAlpha = sp.life;
    g.beginPath();
    g.arc(sp.x, sp.y, 2.8, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }
}
