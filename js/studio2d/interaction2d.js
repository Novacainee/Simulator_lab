/* ==========================================================================
   js/studio2d/interaction2d.js - Kéo thả linh kiện, nối dây, cắt dây,
                                  kéo 2 que đo Vôn kế & khóa Read-Only
   ========================================================================== */

import { S, AppState, comps, wires, getTermPos, addWire, deleteWireByIndex } from '../state.js';
import { solveCircuit, distToSegment, findProbeNode } from '../physics/mnaSolver.js';
import { sfxClick } from '../audio/soundEngine.js';

let cv = null;
let dragComp = null;
let dragOff = { x: 0, y: 0 };
let dragProbe = null;
let wireStart = null;
let mousePos = { x: 0, y: 0 };

let onUpdateInspector = null;
let onSay = null;

export function registerInteractionCallbacks(callbacks) {
  if (callbacks.updateInspector) onUpdateInspector = callbacks.updateInspector;
  if (callbacks.say) onSay = callbacks.say;
}

export function getWireStartState() {
  return wireStart;
}

export function getMousePos() {
  return mousePos;
}

export function toggleSwitch(id) {
  const c = comps.find(x => x.id === id);
  if (!c) return;
  c.closed = !c.closed;
  sfxClick(c.closed ? 750 : 420);
  solveCircuit(true);
}

export function resetProbes(id) {
  const c = comps.find(x => x.id === id);
  if (!c) return;
  c.p0 = { x: c.x - 52, y: c.y + 68 };
  c.p1 = { x: c.x + 52, y: c.y + 68 };
  solveCircuit(false);
}

export function rotateComp(id) {
  if (S.readOnly || (AppState.gmMode === 'challenge2' && !AppState.challenge2Diagnosed)) return;
  const c = comps.find(x => x.id === id);
  if (!c || c.type === 'voltmeter') return;
  c.rot = c.rot ? 0 : 1;
  sfxClick(500);
  solveCircuit(false);
}

export function initInteraction2D(canvasElement) {
  cv = canvasElement;

  function getCanvasPt(ev) {
    const r = cv.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  function findTerminalAt(p, radius = 18) {
    for (const c of comps) {
      if (c.type === 'voltmeter') continue;
      for (let s = 0; s <= 1; s++) {
        const tp = getTermPos(c, s);
        if (Math.hypot(p.x - tp.x, p.y - tp.y) <= radius) {
          return { cId: c.id, side: s, x: tp.x, y: tp.y };
        }
      }
    }
    return null;
  }

  function findVoltmeterProbeAt(p) {
    for (let i = comps.length - 1; i >= 0; i--) {
      const c = comps[i];
      if (c.type !== 'voltmeter') continue;
      const centerBlack = { x: c.p0.x - 9, y: c.p0.y + 26 };
      const centerRed   = { x: c.p1.x + 9, y: c.p1.y + 26 };
      if (Math.hypot(p.x - c.p0.x, p.y - c.p0.y) < 22 || Math.hypot(p.x - centerBlack.x, p.y - centerBlack.y) < 24) {
        return { comp: c, which: 'p0', offX: p.x - c.p0.x, offY: p.y - c.p0.y };
      }
      if (Math.hypot(p.x - c.p1.x, p.y - c.p1.y) < 22 || Math.hypot(p.x - centerRed.x, p.y - centerRed.y) < 24) {
        return { comp: c, which: 'p1', offX: p.x - c.p1.x, offY: p.y - c.p1.y };
      }
    }
    return null;
  }

  cv.addEventListener('pointerdown', ev => {
    cv.setPointerCapture(ev.pointerId);
    const p = getCanvasPt(ev);
    mousePos = p;

    // Trong Thử thách 2: Khi chưa chẩn đoán đúng 2 nguyên nhân thì tạm khóa tương tác sửa mạch
    if (AppState.gmMode === 'challenge2' && !AppState.challenge2Diagnosed) {
      if (onSay) onSay('🔒 <b>Mạch đang tạm khóa!</b> Em hãy hoàn thành bước <b>Bác sĩ bắt bệnh</b> ở bảng bên phải để mở khóa sửa mạch nhé!', 'warn', 1800);
      return;
    }

    // 1. Chế độ cắt dây (Chỉ khả dụng khi không ở Read-Only)
    if (S.cutMode && !S.readOnly) {
      const idx = wires.findIndex(w => {
        const c1 = comps.find(c => c.id === w.c1);
        const c2 = comps.find(c => c.id === w.c2);
        return c1 && c2 && distToSegment(p, getTermPos(c1, w.s1), getTermPos(c2, w.s2)) < 12;
      });
      if (idx >= 0) {
        deleteWireByIndex(idx);
        sfxClick(300);
        solveCircuit(true);
        return;
      }
    }

    // 2. Kéo que đo Vôn kế (HOÀN TOÀN ĐƯỢC PHÉP Ở CẢ CHẾ ĐỘ READ-ONLY)
    const prb = findVoltmeterProbeAt(p);
    if (prb) {
      S.selectedId = prb.comp.id;
      dragProbe = prb;
      if (onUpdateInspector) onUpdateInspector();
      return;
    }

    // 3. Nối dây từ chốt (BỊ KHÓA NẾU Ở READ-ONLY)
    const term = findTerminalAt(p, 18);
    if (term) {
      if (S.readOnly) {
        // Thông báo nhẹ không thể kéo dây trong chế độ mẫu
        return;
      }
      wireStart = term;
      return;
    }

    // 4. Bấm / Kéo linh kiện
    for (let i = comps.length - 1; i >= 0; i--) {
      const c = comps[i];
      if (Math.abs(p.x - c.x) < 42 && Math.abs(p.y - c.y) < 40) {
        S.selectedId = c.id;

        // Nếu là công tắc (Switch) và click chuột: Cho phép bật/tắt ở CẢ Read-Only!
        if (c.type === 'switch') {
          dragComp = c;
          dragOff = { x: p.x - c.x, y: p.y - c.y };
          dragComp.moved = false;
          if (onUpdateInspector) onUpdateInspector();
          return;
        }

        // Với các linh kiện khác: Nếu Read-Only thì không cho kéo di chuyển
        if (!S.readOnly) {
          dragComp = c;
          dragOff = { x: p.x - c.x, y: p.y - c.y };
          dragComp.moved = false;
        }

        if (onUpdateInspector) onUpdateInspector();
        return;
      }
    }

    // Bấm ra ngoài khoảng trống
    S.selectedId = null;
    if (onUpdateInspector) onUpdateInspector();
  });

  cv.addEventListener('pointermove', ev => {
    const p = getCanvasPt(ev);
    mousePos = p;

    // Kéo que đo Vôn kế
    if (dragProbe) {
      const c = dragProbe.comp;
      let nx = Math.max(12, Math.min(window.innerWidth - 12, p.x - dragProbe.offX));
      let ny = Math.max(12, Math.min(window.innerHeight - 12, p.y - dragProbe.offY));
      const snapTerm = findTerminalAt({ x: nx, y: ny }, 18);
      if (snapTerm) {
        nx = snapTerm.x;
        ny = snapTerm.y;
      }
      c[dragProbe.which] = { x: nx, y: ny };
      solveCircuit(false);
      return;
    }

    // Kéo linh kiện (nếu được phép)
    if (dragComp && !S.readOnly) {
      const dx = p.x - dragOff.x - dragComp.x;
      const dy = p.y - dragOff.y - dragComp.y;
      if (Math.hypot(dx, dy) > 4) dragComp.moved = true;

      const newX = Math.max(135, Math.min(window.innerWidth - 60, p.x - dragOff.x));
      const newY = Math.max(80, Math.min(window.innerHeight - 60, p.y - dragOff.y));
      const actualDx = newX - dragComp.x;
      const actualDy = newY - dragComp.y;

      dragComp.x = newX;
      dragComp.y = newY;

      // Nếu kéo thân Vôn kế, di chuyển theo cả 2 que đo nếu chúng đang không ghim vào chốt
      if (dragComp.type === 'voltmeter') {
        const idxOf = (cId, side) => {
          const ci = comps.findIndex(x => x.id === cId);
          return ci >= 0 ? ci * 2 + side : -1;
        };
        if (findProbeNode(dragComp.p0, idxOf) < 0) {
          dragComp.p0.x += actualDx;
          dragComp.p0.y += actualDy;
        }
        if (findProbeNode(dragComp.p1, idxOf) < 0) {
          dragComp.p1.x += actualDx;
          dragComp.p1.y += actualDy;
        }
      }

      solveCircuit(false);
    }
  });

  cv.addEventListener('pointerup', ev => {
    const p = getCanvasPt(ev);

    if (dragProbe) {
      sfxClick(640);
      solveCircuit(false);
      dragProbe = null;
      return;
    }

    if (wireStart && !S.readOnly) {
      const target = findTerminalAt(p, 22);
      if (target && !(target.cId === wireStart.cId && target.side === wireStart.side)) {
        const added = addWire(wireStart.cId, wireStart.side, target.cId, target.side);
        if (added) {
          sfxClick(680);
          solveCircuit(true);
        }
      }
      wireStart = null;
    }

    if (dragComp) {
      // Nếu chỉ click vào Công tắc mà không di chuyển -> Bật/tắt công tắc
      if (!dragComp.moved && dragComp.type === 'switch') {
        toggleSwitch(dragComp.id);
      }
      dragComp = null;
    }
  });
}
