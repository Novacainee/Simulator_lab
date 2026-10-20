/* ==========================================================================
   js/state.js - Quản lý trạng thái toàn cục của ứng dụng
   ========================================================================== */

export const S = {
  view: 'real',             // 'real' (PhET) hoặc 'schem' (Ký hiệu SGK)
  flow: 'elec',             // 'elec' (Electron), 'conv' (Quy ước), 'none' (Ẩn)
  cutMode: false,           // Bật/tắt chế độ kéo cắt dây
  selectedId: null,         // Linh kiện đang chọn
  presetIdx: 0,             // Mạch mẫu hiện tại (0, 1, 2)
  shortCircuit: false,      // Đoản mạch nguồn
  ammeterShort: false,      // Ampe kế mắc song song gây ngắn mạch
  docMysteryActive: false,  // Đang trong ca đố Bác sĩ mạch
  readOnly: false           // Chế độ chỉ xem cho Khu Xem Mạch Mẫu
};

export const AppState = {
  inStudio: false,
  gmMode: 'free',           // 'free', 'build', 'doc', 'sym'
  buildLv: 0,
  docLv: 0,
  symLv: 0,
  unlockedHints: 0,
  totalScore: 0,
  currentShuffledQuiz: []
};

export let comps = [];
export let wires = [];
export let sparks = [];
let nextId = 1;

export const COMP_META = {
  wire_seg:  { name: 'Đoạn dây nối' },
  battery:   { name: 'Nguồn Pin' },
  switch:    { name: 'Công tắc (Khóa K)' },
  bulb:      { name: 'Đèn tròn dây tóc' },
  resistor:  { name: 'Điện trở (R)' },
  ammeter:   { name: 'Ampe kế (Đo cường độ)' },
  voltmeter: { name: 'Đồng hồ Hiệu thế (V)' },
  fuse:      { name: 'Cầu chì bảo vệ' },
  bell:      { name: 'Chuông điện' }
};

export function setComps(newComps) {
  comps = newComps;
}

export function setWires(newWires) {
  wires = newWires;
}

export function setSparks(newSparks) {
  sparks = newSparks;
}

export function clearCompsAndWires() {
  comps = [];
  wires = [];
  S.selectedId = null;
  S.docMysteryActive = false;
  S.shortCircuit = false;
  S.ammeterShort = false;
}

export function makeComp(type, x, y, opts = {}) {
  const c = {
    id: nextId++,
    type,
    x,
    y,
    rot: opts.rot || 0,
    v: opts.v ?? (type === 'battery' ? 9 : 0),
    r: opts.r ?? (type === 'bulb' ? 10 : type === 'resistor' ? 15 : type === 'bell' ? 12 : 10),
    closed: opts.closed ?? (type === 'switch' ? false : true),
    blown: false,
    I: 0,
    U: 0,
    P: 0,
    phase: 0,
    p0: opts.p0 ? { ...opts.p0 } : { x: x - 52, y: y + 68 }, // Que đo Đen
    p1: opts.p1 ? { ...opts.p1 } : { x: x + 52, y: y + 68 }, // Que đo Đỏ
    connected: false
  };
  comps.push(c);
  return c;
}

export function getTermPos(c, side) {
  const d = 46;
  const dir = side === 0 ? -1 : 1;
  if (c.rot === 0) return { x: c.x + dir * d, y: c.y };
  return { x: c.x, y: c.y + dir * d };
}

export function addWire(c1, s1, c2, s2) {
  if (c1 === c2 && s1 === s2) return false;
  const comp1 = comps.find(x => x.id === c1);
  const comp2 = comps.find(x => x.id === c2);
  if (!comp1 || !comp2 || comp1.type === 'voltmeter' || comp2.type === 'voltmeter') return false;

  const dup = wires.some(w =>
    (w.c1 === c1 && w.s1 === s1 && w.c2 === c2 && w.s2 === s2) ||
    (w.c1 === c2 && w.s1 === s2 && w.c2 === c1 && w.s2 === s1)
  );
  if (!dup) {
    wires.push({ id: nextId++, c1, s1, c2, s2, I: 0, phase: 0 });
    return true;
  }
  return false;
}

export function deleteComp(id) {
  comps = comps.filter(x => x.id !== id);
  wires = wires.filter(w => w.c1 !== id && w.c2 !== id);
  if (S.selectedId === id) S.selectedId = null;
}

export function deleteWireByIndex(idx) {
  if (idx >= 0 && idx < wires.length) {
    wires.splice(idx, 1);
    return true;
  }
  return false;
}
