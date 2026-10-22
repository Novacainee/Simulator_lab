/* ==========================================================================
   js/data/challenges.js - Dữ liệu Mạch mẫu, Thử thách Đo & Lắp,
                           Bác sĩ Mạch, Đố vui Ký hiệu & Điểm đến 3D
   ========================================================================== */

import { S, comps, wires, makeComp, addWire, clearCompsAndWires } from '../state.js';
import { solveCircuit, fmt } from '../physics/mnaSolver.js';

export const ZONE_TARGETS = {
  samples:     { x: -6.0, z: -1.5, yaw: 1.57,  pitch: 0.06,  name: 'Khu Xem Mạch Mẫu' },
  sample1:     { x: -6.0, z: -1.5, yaw: 1.57,  pitch: 0.06,  name: 'Thử Thách 1: Lắp Mạch Đơn' },
  sample2:     { x: -4.2, z: -4.6, yaw: 0.00,  pitch: 0.08,  name: 'Mẫu 2: Hai Đèn Nối Tiếp' },
  sample3:     { x: 3.8,  z: -4.6, yaw: 0.00,  pitch: 0.08,  name: 'Mẫu 3: Hai Đèn Song Song' },
  doctor:      { x: 6.0,  z: -3.2, yaw: -1.57, pitch: 0.06,  name: 'Khu Bác Sĩ Mạch' },
  free:        { x: 0,    z: 5.5,  yaw: 0,     pitch: -0.08, name: 'Khu Lắp Mạch Tự Do' },
  quiz:        { x: 7.2,  z: 3.8,  yaw: -1.45, pitch: -0.01, name: 'Khu Ôn Tập & Ký Hiệu' },
  challenge:   { x: -7.2, z: 4.5,  yaw: 1.45,  pitch: -0.01, name: 'Khu Thử Thách Đo & Lắp' },
  window_view: { x: -8.2, z: 0.2,  yaw: 1.57,  pitch: 0.00,  name: 'Cửa Sổ Ngắm Cảnh Sân Trường' }
};

export function loadPresetCircuit(idx, W, H, sayFn) {
  clearCompsAndWires();
  const cx = W * 0.45;
  const cy = H * 0.50;

  if (idx === 0) {
    const bat = makeComp('battery', cx - 130, cy - 110, { v: 9 });
    const sw  = makeComp('switch',  cx + 100, cy - 110, { closed: true });
    const am  = makeComp('ammeter', cx - 130, cy + 95);
    const blb = makeComp('bulb',    cx + 100, cy + 95, { r: 10 });
    makeComp('voltmeter', cx + 260, cy - 15);
    addWire(bat.id, 1, sw.id, 0);
    addWire(sw.id, 1, blb.id, 1);
    addWire(bat.id, 0, am.id, 0);
    addWire(am.id, 1, blb.id, 0);
    if (sayFn) sayFn('⚡ <b>Mạch Mẫu 1 (Mạch đơn):</b> Đèn đang sáng! Em hãy kéo 2 que đo Đen & Đỏ của Vôn kế chạm vào 2 chốt bóng đèn để đo số Vôn nhé.');
  } else if (idx === 1) {
    const bat = makeComp('battery', cx - 115, cy - 110, { v: 12 });
    const sw  = makeComp('switch',  cx + 115, cy - 110, { closed: true });
    const b1  = makeComp('bulb',    cx - 115, cy + 95, { r: 10 });
    const b2  = makeComp('bulb',    cx + 115, cy + 95, { r: 10 });
    makeComp('voltmeter', cx + 270, cy - 15);
    addWire(bat.id, 1, sw.id, 0);
    addWire(sw.id, 1, b2.id, 1);
    addWire(b2.id, 0, b1.id, 1);
    addWire(b1.id, 0, bat.id, 0);
    if (sayFn) sayFn('🔗 <b>Mạch Mẫu 2 (Hai đèn Nối tiếp):</b> Hiệu điện thế 12V của nguồn được chia đều cho mỗi đèn 6V!');
  } else {
    const bat = makeComp('battery', cx - 105, cy - 135, { v: 9 });
    const sw  = makeComp('switch',  cx + 105, cy - 135, { closed: true });
    const b1  = makeComp('bulb',    cx,       cy - 15,  { r: 10 });
    const b2  = makeComp('bulb',    cx,       cy + 120, { r: 10 });
    makeComp('voltmeter', cx + 260, cy - 10);
    addWire(bat.id, 1, sw.id, 0);
    addWire(sw.id, 1, b1.id, 1);
    addWire(b1.id, 1, b2.id, 1);
    addWire(bat.id, 0, b1.id, 0);
    addWire(b1.id, 0, b2.id, 0);
    if (sayFn) sayFn('🌟 <b>Mạch Mẫu 3 (Hai đèn Song song):</b> Cả hai đèn đều nhận đủ hiệu điện thế 9V của nguồn nên sáng rực rỡ như nhau!');
  }
  solveCircuit(false);
}

export const BUILD_TASKS = [
  {
    title: 'Màn 1/4: Thắp sáng bóng đèn đơn',
    desc: 'Hãy nối dây tạo thành mạch điện kín gồm Nguồn Pin, Công tắc (đóng) và 1 Đèn tròn sao cho đèn sáng bình thường.',
    setup: (W, H) => {
      clearCompsAndWires();
      const cx = W * 0.43, cy = H * 0.5;
      makeComp('battery', cx - 120, cy - 100, { v: 9 });
      makeComp('switch', cx + 120, cy - 100, { closed: false });
      makeComp('bulb', cx, cy + 100, { r: 10 });
      solveCircuit(false);
    },
    check: () => {
      const lit = comps.filter(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.1);
      if (S.shortCircuit) return { ok: false, msg: 'Mạch đang bị đoản mạch! Hãy kiểm tra lại dây nối.' };
      if (lit.length >= 1) return { ok: true, msg: '🎉 Xuất sắc! Mạch kín hoàn chỉnh và đèn đã sáng rực!' };
      return { ok: false, msg: 'Đèn vẫn chưa sáng! Em nhớ nối kín vòng mạch và bấm đóng Công tắc K nhé.' };
    }
  },
  {
    title: 'Màn 2/4: Mắc Ampe kế đo dòng điện',
    desc: 'Hãy mắc Ampe kế NỐI TIẾP vào mạch để đo cường độ dòng điện chạy qua bóng đèn.',
    setup: (W, H) => {
      clearCompsAndWires();
      const cx = W * 0.43, cy = H * 0.5;
      const b = makeComp('battery', cx - 120, cy - 100, { v: 9 });
      const k = makeComp('switch', cx + 120, cy - 100, { closed: true });
      const d = makeComp('bulb', cx + 120, cy + 100, { r: 10 });
      makeComp('ammeter', cx - 120, cy + 100);
      addWire(b.id, 1, k.id, 0);
      addWire(k.id, 1, d.id, 1);
      solveCircuit(false);
    },
    check: () => {
      if (S.ammeterShort) return { ok: false, msg: '🚨 Sai rồi! Em đang mắc Ampe kế song song gây đoản mạch!' };
      const am = comps.find(c => c.type === 'ammeter');
      const blb = comps.find(c => c.type === 'bulb' && !c.blown);
      if (am && blb && Math.abs(blb.I) > 0.2 && Math.abs(am.I - Math.abs(blb.I)) < 0.05) {
        return { ok: true, msg: `🎉 Chuẩn xác! Ampe kế đã mắc nối tiếp, đo được I = ${fmt(am.I, 2)} A!` };
      }
      return { ok: false, msg: 'Ampe kế chưa đo được dòng điện qua đèn. Hãy mắc Ampe kế nối tiếp giữa đèn và nguồn nhé!' };
    }
  },
  {
    title: 'Màn 3/4: Dùng đồng hồ Hiệu thế đo đèn',
    desc: 'Mạch đã có đèn sáng. Hãy kéo 2 que đo Đen và Đỏ của Vôn kế chạm vào 2 đầu bóng đèn để đo số Vôn!',
    setup: (W, H) => {
      clearCompsAndWires();
      const cx = W * 0.42, cy = H * 0.5;
      const b = makeComp('battery', cx - 110, cy - 100, { v: 9 });
      const k = makeComp('switch', cx + 110, cy - 100, { closed: true });
      const d = makeComp('bulb', cx, cy + 95, { r: 10 });
      makeComp('voltmeter', cx + 240, cy - 10);
      addWire(b.id, 1, k.id, 0);
      addWire(k.id, 1, d.id, 1);
      addWire(d.id, 0, b.id, 0);
      solveCircuit(false);
    },
    check: () => {
      const vm = comps.find(c => c.type === 'voltmeter');
      const blb = comps.find(c => c.type === 'bulb' && !c.blown);
      if (vm && blb && vm.connected && Math.abs(blb.I) > 0.2 && Math.abs(Math.abs(vm.U) - blb.U) < 0.2) {
        return { ok: true, msg: `🎉 Tuyệt vời! Hai que đo đã đặt chuẩn xác vào hai đầu đèn, đo được ${fmt(vm.U, 2)} V!` };
      }
      return { ok: false, msg: 'Hãy kéo 2 mũi kim Đen và Đỏ chạm vào 2 chốt tròn của bóng đèn nhé!' };
    }
  },
  {
    title: 'Màn 4/4: Lắp mạch 2 đèn mắc Song Song',
    desc: 'Hãy nối dây để 2 bóng đèn mắc SONG SONG với nhau vào nguồn điện 9V sao cho cả hai đèn đều sáng mạnh.',
    setup: (W, H) => {
      clearCompsAndWires();
      const cx = W * 0.43, cy = H * 0.5;
      const b = makeComp('battery', cx - 105, cy - 130, { v: 9 });
      const k = makeComp('switch', cx + 105, cy - 130, { closed: true });
      makeComp('bulb', cx, cy - 10, { r: 10 });
      makeComp('bulb', cx, cy + 120, { r: 10 });
      addWire(b.id, 1, k.id, 0);
      solveCircuit(false);
    },
    check: () => {
      const bulbs = comps.filter(c => c.type === 'bulb' && !c.blown);
      const bat = comps.find(c => c.type === 'battery');
      if (bulbs.length >= 2 && bat && !S.shortCircuit && bulbs.every(b => Math.abs(b.U - bat.v) < 0.3)) {
        return { ok: true, msg: '🏆 Hoàn hảo! Hai bóng đèn đã mắc song song và cùng nhận đủ 9V!' };
      }
      return { ok: false, msg: 'Hai đèn chưa được mắc song song. Hãy kiểm tra lại nhé!' };
    }
  }
];

export const DOC_TASKS = [
  {
    title: 'Ca đố 1/4: Bí ẩn bóng đèn tối om!',
    desc: 'Mạch điện đã có Pin 9V và Công tắc K đang đóng, nhưng bóng đèn lại tối om không sáng, dây dẫn thì nóng bất thường! Em hãy tìm điểm bất thường và sửa lại cho đèn sáng.',
    hints: [
      '💡 <b>Gợi ý 1:</b> Hãy nhìn đường chạy của các hạt Electron! Dòng điện đang đi đường vòng mà không đi qua bóng đèn.',
      '💡 <b>Gợi ý 2:</b> Có một sợi dây đang nối trực tiếp giữa 2 chốt của bóng đèn gây nối tắt. Hãy bấm nút <b>"✂️ Cắt dây"</b> trên thanh công cụ và cắt bỏ sợi dây ngang qua bóng đèn đó!'
    ],
    setup: (W, H) => {
      clearCompsAndWires();
      S.docMysteryActive = true;
      const cx = W * 0.43, cy = H * 0.5;
      const b = makeComp('battery', cx - 115, cy - 100, { v: 9 });
      const k = makeComp('switch', cx + 115, cy - 100, { closed: true });
      const d = makeComp('bulb', cx, cy + 100, { r: 10 });
      addWire(b.id, 1, k.id, 0);
      addWire(k.id, 1, d.id, 1);
      addWire(d.id, 0, b.id, 0);
      addWire(d.id, 0, d.id, 1); // Dây đoản mạch đèn
      solveCircuit(false);
    },
    check: () => {
      const res = BUILD_TASKS[0].check();
      if (res.ok) S.docMysteryActive = false;
      return res;
    }
  },
  {
    title: 'Ca đố 2/4: Sự cố khi đo dòng điện!',
    desc: 'Một bạn học sinh lắp thêm dụng cụ đo vào mạch nhưng vừa đóng công tắc là mạch chập cháy, đèn không sáng! Hãy tìm nguyên nhân và mắc lại dụng cụ đo cho đúng.',
    hints: [
      '💡 <b>Gợi ý 1:</b> Hãy nhìn vào Ampe kế! Dòng điện toàn mạch đang dồn hết qua Ampe kế vì nó có điện trở gần bằng 0 Ω.',
      '💡 <b>Gợi ý 2:</b> Ampe kế đang bị mắc SONG SONG với đèn. Hãy bật <b>"✂️ Cắt dây"</b> tháo dây ở Ampe kế ra và mắc lại Ampe kế <b>NỐI TIẾP</b> trên cùng 1 vòng mạch với bóng đèn!'
    ],
    setup: (W, H) => {
      clearCompsAndWires();
      S.docMysteryActive = true;
      const cx = W * 0.43, cy = H * 0.5;
      const b = makeComp('battery', cx - 115, cy - 125, { v: 9 });
      const k = makeComp('switch', cx + 115, cy - 125, { closed: true });
      const d = makeComp('bulb', cx, cy - 5, { r: 10 });
      const a = makeComp('ammeter', cx, cy + 120);
      addWire(b.id, 1, k.id, 0);
      addWire(k.id, 1, d.id, 1);
      addWire(d.id, 0, b.id, 0);
      addWire(d.id, 1, a.id, 1);
      addWire(d.id, 0, a.id, 0); // Ampe kế mắc song song gây chập
      solveCircuit(false);
    },
    check: () => {
      const res = BUILD_TASKS[1].check();
      if (res.ok) S.docMysteryActive = false;
      return res;
    }
  },
  {
    title: 'Ca đố 3/4: Cầu chì nổ liên hoàn!',
    desc: 'Mạch điện bị đứt Cầu chì nên đèn tắt. Nhưng hễ bấm vào Cầu chì chọn "🛠️ Sửa mới" là nó lại nổ tách ngay lập tức! Hãy tìm lỗi gây quá tải, khắc phục xong rồi sửa lại Cầu chì nhé.',
    hints: [
      '💡 <b>Gợi ý 1:</b> Cầu chì tự đứt vì dòng điện vượt quá 2.5A. Hãy kiểm tra xem có sợi dây nào đi tắt từ Cầu chì về thẳng cực Âm của Pin không?',
      '💡 <b>Gợi ý 2:</b> Hãy dùng <b>"✂️ Cắt dây"</b> cắt bỏ sợi dây nối chéo giữa Cầu chì và cực Âm của Pin, sau đó bấm vào Cầu chì chọn <b>"🛠️ Sửa mới"</b>!'
    ],
    setup: (W, H) => {
      clearCompsAndWires();
      S.docMysteryActive = true;
      const cx = W * 0.43, cy = H * 0.5;
      const b = makeComp('battery', cx - 120, cy - 100, { v: 9 });
      const f = makeComp('fuse', cx + 120, cy - 100);
      const d = makeComp('bulb', cx, cy + 100, { r: 10 });
      addWire(b.id, 1, f.id, 0);
      addWire(f.id, 1, d.id, 1);
      addWire(d.id, 0, b.id, 0);
      addWire(f.id, 1, b.id, 0); // Đoản mạch sau cầu chì
      solveCircuit(false);
    },
    check: () => {
      const f = comps.find(c => c.type === 'fuse');
      const d = comps.find(c => c.type === 'bulb');
      if (f && !f.blown && d && !d.blown && Math.abs(d.I) > 0.2 && !S.shortCircuit) {
        S.docMysteryActive = false;
        return { ok: true, msg: '🎉 Quá giỏi! Em đã tìm ra sợi dây gây chập mạch và khôi phục Cầu chì hoạt động an toàn!' };
      }
      return { ok: false, msg: 'Đèn vẫn chưa sáng hoặc Cầu chì vẫn đang bị đứt!' };
    }
  },
  {
    title: 'Ca đố 4/4: Hai bóng đèn sáng quá yếu!',
    desc: 'Mạch điện có 2 bóng đèn nhưng cả hai đều sáng lờ mờ. Hãy tìm nguyên nhân và sửa lại dây nối để cả 2 đèn đều nhận đủ 9V sáng rực rỡ!',
    hints: [
      '💡 <b>Gợi ý 1:</b> Thử kéo 2 que đo của Vôn kế vào 2 đầu mỗi bóng đèn xem: mỗi đèn hiện chỉ nhận được 4.5V!',
      '💡 <b>Gợi ý 2:</b> Hai đèn đang mắc NỐI TIẾP nên bị yếu. Hãy cắt dây và mắc lại thành <b>2 nhánh SONG SONG</b>!'
    ],
    setup: (W, H) => {
      clearCompsAndWires();
      S.docMysteryActive = true;
      const cx = W * 0.42, cy = H * 0.5;
      const b = makeComp('battery', cx - 115, cy - 105, { v: 9 });
      const k = makeComp('switch', cx + 115, cy - 105, { closed: true });
      const d1 = makeComp('bulb', cx - 115, cy + 95, { r: 10 });
      const d2 = makeComp('bulb', cx + 115, cy + 95, { r: 10 });
      makeComp('voltmeter', cx + 250, cy - 10);
      addWire(b.id, 1, k.id, 0);
      addWire(k.id, 1, d2.id, 1);
      addWire(d2.id, 0, d1.id, 1);
      addWire(d1.id, 0, b.id, 0);
      solveCircuit(false);
    },
    check: () => {
      const res = BUILD_TASKS[3].check();
      if (res.ok) S.docMysteryActive = false;
      return res;
    }
  }
];

export const SYM_QUIZ = [
  {
    q: 'Ký hiệu vòng tròn có dấu nhân (⊗) bên trong biểu diễn bộ phận nào?',
    svg: `<circle cx="60" cy="24" r="15" fill="none" stroke="#fff" stroke-width="2.5"/><line x1="49" y1="13" x2="71" y2="35" stroke="#fff" stroke-width="2.5"/><line x1="71" y1="13" x2="49" y2="35" stroke="#fff" stroke-width="2.5"/>`,
    opts: ['Bóng đèn sợi đốt', 'Ampe kế', 'Nguồn điện', 'Chuông điện'],
    ans: 0
  },
  {
    q: 'Trong ký hiệu Nguồn điện (Pin), vạch dài mảnh và vạch ngắn đậm biểu thị cực nào?',
    svg: `<line x1="25" y1="24" x2="54" y2="24" stroke="#fff" stroke-width="2.5"/><line x1="54" y1="10" x2="54" y2="38" stroke="#ffc93c" stroke-width="2.5"/><line x1="66" y1="16" x2="66" y2="32" stroke="#38bdf8" stroke-width="5"/><line x1="66" y1="24" x2="95" y2="24" stroke="#fff" stroke-width="2.5"/>`,
    opts: ['Vạch dài: Cực (+), Vạch ngắn: Cực (-)', 'Vạch dài: Cực (-), Vạch ngắn: Cực (+)', 'Hai cực như nhau', 'Ký hiệu của Cầu chì'],
    ans: 0
  },
  {
    q: 'Để đo cường độ dòng điện qua bóng đèn, ta chọn dụng cụ có ký hiệu nào và mắc ra sao?',
    svg: `<circle cx="60" cy="24" r="15" fill="none" stroke="#fff" stroke-width="2.5"/><text x="60" y="29" fill="#ff9f43" font-size="15" font-weight="800" text-anchor="middle">A</text>`,
    opts: ['Ampe kế - Mắc nối tiếp', 'Ampe kế - Mắc song song', 'Vôn kế - Mắc nối tiếp', 'Vôn kế - Mắc song song'],
    ans: 0
  },
  {
    q: 'Ký hiệu hình chữ nhật có đường thẳng chạy xuyên qua giữa biểu diễn linh kiện nào?',
    svg: `<line x1="20" y1="24" x2="100" y2="24" stroke="#ffc93c" stroke-width="2.5"/><rect x="40" y="15" width="40" height="18" fill="none" stroke="#fff" stroke-width="2.5"/>`,
    opts: ['Cầu chì bảo vệ', 'Điện trở cố định', 'Biến trở', 'Công tắc đóng'],
    ans: 0
  }
];

export function shuffleQuizOptions(qObj) {
  const arr = qObj.opts.map((txt, i) => ({ txt, isCorrect: i === qObj.ans }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ==========================================================================
// THỬ THÁCH MÀN 1: LẮP MẠCH ĐIỆN ĐƠN GIẢN TỪ 4 BỘ PHẬN & BÀI TRẮC NGHIỆM
// ==========================================================================
export const CHALLENGE_1_DATA = {
  title: 'Thử Thách Màn 1: Thắp Sáng Bóng Đèn',
  desc: 'Hãy sử dụng <b>Dây nối</b> để liên kết 4 bộ phận: <b>Nguồn Pin 9V</b>, <b>Công tắc K</b> và <b>Bóng đèn</b> thành một mạch điện kín. Sau đó bấm đóng <b>Công tắc K</b> sao cho bóng đèn phát sáng!',
  setup: (W, H) => {
    clearCompsAndWires();
    const cx = W * 0.44;
    const cy = H * 0.48;
    // 3 linh kiện đặt rời rạc trên bàn, chưa nối dây (Dây nối là bộ phận thứ 4)
    makeComp('battery', cx - 180, cy - 80, { v: 9 });
    makeComp('switch',  cx + 140, cy - 80, { closed: false });
    makeComp('bulb',    cx,       cy + 90, { r: 10 });
    solveCircuit(false);
  },
  check: () => {
    const lit = comps.filter(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.05);
    if (S.shortCircuit) {
      return { ok: false, msg: '🚨 Mạch đang bị đoản mạch trực tiếp hai cực của Pin! Hãy ngắt hoặc sửa lại đường dây nối.' };
    }
    if (lit.length >= 1) {
      return { ok: true, msg: '🎉 Xuất sắc! Mạch điện kín đã hoàn thành và bóng đèn đã phát sáng rực rỡ!' };
    }
    const sw = comps.find(c => c.type === 'switch');
    if (sw && !sw.closed) {
      return { ok: false, msg: '💡 Hãy bấm vào Công tắc (Khóa K) để ĐÓNG MẠCH cho dòng điện chạy qua nhé!' };
    }
    return { ok: false, msg: '💡 Đèn chưa sáng! Hãy kéo Dây nối giữa các chốt tròn của Pin 9V, Công tắc và Bóng đèn thành một vòng kín liên tục.' };
  }
};

export const COMPONENT_FUNCTION_QUIZ = [
  {
    id: 1,
    partName: 'Nguồn điện (Pin 9V)',
    icon: '🔋',
    badge: 'Bộ phận 1/4',
    question: 'Trong mạch điện, nguồn điện (Pin) có công dụng chính là gì?',
    options: [
      { text: 'A. Tiêu thụ năng lượng điện và phát ra ánh sáng', isCorrect: false },
      { text: 'B. Cung cấp năng lượng điện và duy trì dòng điện chạy trong mạch kín', isCorrect: true },
      { text: 'C. Đóng hoặc ngắt mạch điện một cách an toàn', isCorrect: false },
      { text: 'D. Dẫn truyền dòng điện đi từ thiết bị này sang thiết bị khác', isCorrect: false }
    ],
    explain: '💡 <b>Giải thích:</b> Nguồn điện (pin, ắc quy...) có nhiệm vụ cung cấp và duy trì năng lượng điện (hiệu điện thế) để tạo ra dòng điện chạy trong mạch kín.'
  },
  {
    id: 2,
    partName: 'Bóng đèn tròn',
    icon: '💡',
    badge: 'Bộ phận 2/4',
    question: 'Bóng đèn trong mạch điện đóng vai trò là bộ phận nào?',
    options: [
      { text: 'A. Nguồn cung cấp năng lượng điện cho toàn mạch', isCorrect: false },
      { text: 'B. Thiết bị tiêu thụ điện năng, biến đổi điện năng thành quang năng để phát sáng', isCorrect: true },
      { text: 'C. Dụng cụ đóng ngắt dòng điện tự động', isCorrect: false },
      { text: 'D. Dây dẫn kết nối các cực của pin lại với nhau', isCorrect: false }
    ],
    explain: '💡 <b>Giải thích:</b> Bóng đèn là thiết bị tiêu thụ điện năng (tải tiêu thụ), chuyển hóa năng lượng điện thành quang năng (ánh sáng) và nhiệt năng.'
  },
  {
    id: 3,
    partName: 'Công tắc (Khóa K)',
    icon: '⚡',
    badge: 'Bộ phận 3/4',
    question: 'Công tắc (Khóa K) có công dụng gì trong mạch điện?',
    options: [
      { text: 'A. Đóng hoặc ngắt mạch điện một cách chủ động, cho phép hoặc ngăn dòng điện chạy qua', isCorrect: true },
      { text: 'B. Tăng hiệu điện thế của pin lên nhiều lần để đèn sáng hơn', isCorrect: false },
      { text: 'C. Làm cho bóng đèn phát sáng mà không cần dùng đến nguồn pin', isCorrect: false },
      { text: 'D. Đo cường độ dòng điện chạy qua bóng đèn', isCorrect: false }
    ],
    explain: '💡 <b>Giải thích:</b> Công tắc (Khóa K) là thiết bị đóng/ngắt mạch: Khi đóng, mạch kín -> có dòng điện; Khi mở, mạch hở -> dòng điện bị ngắt.'
  },
  {
    id: 4,
    partName: 'Dây dẫn điện',
    icon: '〰️',
    badge: 'Bộ phận 4/4',
    question: 'Dây dẫn điện (lõi kim loại đồng bọc vỏ nhựa cách điện) có công dụng gì?',
    options: [
      { text: 'A. Tự phát sinh dòng điện để thắp sáng các thiết bị', isCorrect: false },
      { text: 'B. Kết nối các bộ phận thành mạch kín và dẫn truyền dòng điện từ nguồn qua các linh kiện', isCorrect: true },
      { text: 'C. Tự động ngắt mạch điện khi quá tải', isCorrect: false },
      { text: 'D. Đo hiệu điện thế giữa hai đầu của bóng đèn', isCorrect: false }
    ],
    explain: '💡 <b>Giải thích:</b> Dây dẫn điện có lõi đồng dẫn điện tốt, dùng để kết nối nguồn điện, công tắc và các thiết bị thành một vòng mạch kín liên tục.'
  }
];
