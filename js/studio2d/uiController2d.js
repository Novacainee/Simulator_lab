/* ==========================================================================
   js/studio2d/uiController2d.js - Quản lý thanh Inspector, Trợ lý Robo,
                                   Ghim gợi ý, Trộn đáp án Quiz & UI
   ========================================================================== */

import { S, AppState, comps, wires, COMP_META, deleteComp, makeComp, addWire } from '../state.js';
import { solveCircuit, fmt, cleanZero } from '../physics/mnaSolver.js';
import { BUILD_TASKS, DOC_TASKS, SYM_QUIZ, CHALLENGE_1_DATA, CHALLENGE_2_DATA, COMPONENT_FUNCTION_QUIZ, shuffleQuizOptions, loadPresetCircuit } from '../data/challenges.js';
import { sfxClick, sfxZap, sfxWin } from '../audio/soundEngine.js';
import { resetProbes, rotateComp, toggleSwitch } from './interaction2d.js';
import { getCanvasDimensions, spawnBurst } from './renderer2d.js';

const $ = id => document.getElementById(id);

let lastSay = 0;

export function say(txt, mood = '') {
  const b = $('bubble');
  if (!b) return;
  b.innerHTML = txt;
  b.className = 'robo-bubble ' + mood;

  const m = $('roboMouth');
  const a = $('roboAnt');
  if (m && a) {
    if (mood === 'warn') {
      m.setAttribute('d', 'M26 59 Q39 50 52 59');
      a.setAttribute('fill', '#ff2e2e');
    } else if (mood === 'ok') {
      m.setAttribute('d', 'M24 52 Q39 66 54 52');
      a.setAttribute('fill', '#1fb59a');
    } else {
      m.setAttribute('d', 'M26 54 Q39 62 52 54');
      a.setAttribute('fill', '#ffc93c');
    }
  }

  const r = $('robot');
  if (r) {
    r.classList.remove('bounce');
    void r.getBoundingClientRect();
    r.classList.add('bounce');
  }
  lastSay = Date.now();
}

export function sayThrottled(txt, mood = '', ms = 2200) {
  if (Date.now() - lastSay > ms) say(txt, mood);
}

export function diagnoseAndSpeak() {
  if (AppState.gmMode === 'challenge1') {
    const lit = comps.filter(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.05);
    if (lit.length >= 1 && !S.shortCircuit) {
      if (!AppState.challenge1Passed) {
        AppState.challenge1Passed = true;
        sfxWin();
        spawnBurst(lit[0].x, lit[0].y);
        say('🎉 <b>Bóng đèn đã phát sáng rực rỡ!</b><br>Em đã lắp thành công mạch điện từ 4 bộ phận. Hãy bấm nút <b>"📝 VÀO BÀI TRẮC NGHIỆM CÔNG DỤNG"</b> ở bảng bên phải để tiếp tục nhé!', 'ok');
      }
    } else if (S.shortCircuit) {
      sfxZap();
      sayThrottled('🔥 <b>ĐOẢN MẠCH!</b> Dây nối đang nối trực tiếp 2 cực của Pin làm chập nguồn, hãy cắt bớt dây đi tắt nhé!', 'warn', 1800);
    }
    renderTaskCard(false);
    return;
  }

  if (AppState.gmMode === 'challenge2') {
    const lit = comps.filter(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.05);
    if (lit.length >= 1 && !S.shortCircuit) {
      if (!AppState.challenge2Passed) {
        AppState.challenge2Passed = true;
        sfxWin();
        spawnBurst(lit[0].x, lit[0].y);
        say('🎉 <b>Bóng đèn đã phát sáng rực rỡ!</b><br>Em đã chẩn đoán đúng bệnh và nối dây kín mạch thành công!', 'ok');
      }
    } else if (S.shortCircuit) {
      sfxZap();
      sayThrottled('🔥 <b>ĐOẢN MẠCH!</b> Dây nối đang nối trực tiếp 2 cực của Pin làm chập nguồn, hãy ngắt bớt dây đi tắt nhé!', 'warn', 1800);
    }
    renderTaskCard(false);
    return;
  }

  if (S.docMysteryActive) {
    const anyLit = comps.some(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.1) && !S.shortCircuit;
    if (anyLit) {
      say('✨ <b>Đèn sáng lên rồi!</b> Hãy bấm nút <b>"✅ Kiểm tra"</b> ở bảng bên phải để hoàn thành ca bệnh nhé!', 'ok');
    } else if (S.shortCircuit) {
      sfxZap();
      if (AppState.unlockedHints === 0) {
        sayThrottled('🩺 Mạch điện vẫn đang có sự cố! Hãy quan sát đường đi của dòng điện hoặc bấm nút <b>💡 Mở Gợi ý 1</b> nhé!', 'warn', 1800);
      }
    }
    return;
  }

  if (S.ammeterShort) {
    sfxZap();
    say('🚨 <b>NGUY HIỂM! Em đang mắc Ampe kế SONG SONG!</b> Ampe kế có R<sub>A</sub> ≈ 0 Ω nên dòng điện cực lớn lao qua gây <b>ĐOẢN MẠCH</b>! Hãy mắc <b>NỐI TIẾP</b> nhé!', 'warn');
    return;
  }

  if (S.shortCircuit) {
    sfxZap();
    say('🔥 <b>CHẬP ĐIỆN (ĐOẢN MẠCH)!</b> Dòng điện đang đi tắt từ cực Dương (+) về cực Âm (-) mà không qua bóng đèn hay điện trở!', 'warn');
    return;
  }

  const litBulbs = comps.filter(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.05);
  if (litBulbs.length === 1) {
    const b = litBulbs[0];
    sayThrottled(`✨ Đèn sáng tốt! Cường độ dòng điện là <b>I = ${fmt(Math.abs(b.I), 2)} A</b> và hiệu điện thế hai đầu đèn là <b>U = ${fmt(b.U, 2)} V</b>.`, 'ok', 1600);
  }
}

export function updateHUD() {
  const pill = $('statPill');
  if (!pill) return;
  const cutTxt = S.cutMode ? `<b style="color:#ff6b57">[✂️ Đang bật Cắt dây]</b> · ` : '';
  const countTxt = `${comps.length} thiết bị · ${wires.length} dây nối`;

  if (AppState.gmMode === 'challenge1') {
    const lit = comps.some(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.05);
    pill.innerHTML = cutTxt + (lit
      ? `<b style="color:#4cf08a">✨ Đèn đã sáng! Hãy vào Bài trắc nghiệm</b> · ${countTxt}`
      : (S.shortCircuit
        ? `<b style="color:#ff6b57">🔥 ĐANG ĐOẢN MẠCH NGUỒN!</b> · ${countTxt}`
        : `<b style="color:#f59e0b">🎯 Thử thách 1: Lắp mạch 4 bộ phận</b> · ${countTxt}`));
    return;
  }

  if (AppState.gmMode === 'challenge2') {
    const lit = comps.some(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.05);
    pill.innerHTML = cutTxt + (lit
      ? `<b style="color:#4cf08a">✨ Thử Thách 2: Đã sửa xong mạch & Đèn sáng!</b> · ${countTxt}`
      : (AppState.challenge2Diagnosed
        ? `<b style="color:#38bdf8">🛠️ Bước 2: Hãy nối dây vào Pin & đóng Khóa K</b> · ${countTxt}`
        : `<b style="color:#f59e0b">🩺 Bước 1: Hãy chọn đúng 2 nguyên nhân đèn tắt</b> · ${countTxt}`));
    return;
  }

  if (S.readOnly) {
    pill.innerHTML = `<b style="color:#f59e0b">👁️ ĐANG XEM MẠCH MẪU</b> · ${countTxt}`;
    return;
  }

  if (S.docMysteryActive) {
    const anyLit = comps.some(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.1) && !S.shortCircuit;
    pill.innerHTML = cutTxt + (anyLit
      ? `<b style="color:#4cf08a">🩺 Đèn đã sáng! Hãy bấm "✅ Kiểm tra"</b> · ${countTxt}`
      : `<b style="color:#ffc93c">🩺 Bác sĩ Mạch: Hãy tìm lỗi và sửa!</b> · ${countTxt}`);
    return;
  }

  if (S.ammeterShort) {
    pill.innerHTML = cutTxt + `<b style="color:#ff6b57">🚨 ĐOẢN MẠCH QUA AMPE KẾ!</b> · ${countTxt}`;
  } else if (S.shortCircuit) {
    pill.innerHTML = cutTxt + `<b style="color:#ff6b57">🔥 ĐANG ĐOẢN MẠCH NGUỒN!</b> · ${countTxt}`;
  } else {
    const active = comps.some(c => (c.type === 'bulb' || c.type === 'resistor' || c.type === 'bell') && Math.abs(c.I) > 0.02);
    pill.innerHTML = cutTxt + (active
      ? `<b style="color:#4cf08a">⚡ Mạch kín – Có dòng điện</b> · ${countTxt}`
      : `<b>Mạch hở / Chưa có dòng điện</b> · ${countTxt}`);
  }
}

export function updateInspector() {
  const bar = $('insp');
  if (!bar) return;
  const c = comps.find(x => x.id === S.selectedId);
  if (!c) {
    bar.classList.remove('open');
    return;
  }
  bar.classList.add('open');

  const meta = COMP_META[c.type];
  const dispU = fmt(Math.abs(c.U), 2);
  const dispI = fmt(Math.abs(c.I), 2);
  let ctrlHTML = '';

  if (S.readOnly) {
    // Trong chế độ Read-Only: Khóa toàn bộ thanh trượt & ô nhập số
    if (c.type === 'battery') {
      ctrlHTML = `<div class="ro-lock-badge">🔒 U = ${c.v} V (Cố định ở mạch mẫu)</div>`;
    } else if (c.type === 'bulb' || c.type === 'resistor' || c.type === 'bell') {
      ctrlHTML = `<div class="ro-lock-badge">🔒 R = ${c.r} Ω (Cố định ở mạch mẫu)</div>`;
    } else if (c.type === 'switch') {
      ctrlHTML = `<button class="btn ${c.closed ? 'success' : 'accent'}" id="inspToggleSwitchBtn">${c.closed ? '🔓 Mở Công tắc (K)' : '🔒 Đóng Công tắc (K)'}</button>`;
    } else if (c.type === 'ammeter') {
      const txtI = c.I > 25 ? 'NGẮN MẠCH!' : `${fmt(c.I, 2)} A`;
      ctrlHTML = `<div style="font-size:.78rem">Số chỉ: <b style="color:var(--blue)">I = ${txtI}</b> <small style="color:var(--muted)">(R<sub>A</sub> ≈ 0 Ω)</small></div>`;
    } else if (c.type === 'voltmeter') {
      const txtU = c.connected ? `${fmt(c.U, 2)} V` : '— (Kéo 2 que đo chạm mạch)';
      ctrlHTML = `<div style="font-size:.78rem">Số chỉ: <b style="color:var(--blue)">${txtU}</b></div>`;
    } else if (c.type === 'fuse') {
      ctrlHTML = `<div style="font-size:.78rem">Dòng qua cầu chì: <b>${dispI} A</b></div>`;
    }

    const resetProbeBtn = c.type === 'voltmeter'
      ? `<button class="btn" id="inspResetProbeBtn">📍 Thu gọn que đo</button>`
      : '';

    bar.innerHTML = `
      <div class="insp-head">
        <strong>${meta.name}</strong>
        <span id="inspSub">${c.type === 'voltmeter' ? (c.connected ? `Đo được: ${fmt(c.U, 2)} V` : 'Kéo 2 kim để đo') : `U = ${dispU} V · I = ${dispI} A`}</span>
      </div>
      ${ctrlHTML}
      <div style="display:flex;gap:6px">
        ${resetProbeBtn}
      </div>`;

    attachInspectorEvents(c);
    return;
  }

  // Chế độ chỉnh sửa bình thường (Full Sandbox)
  if (c.type === 'battery') {
    ctrlHTML = `
      <div class="insp-ctrl">
        <label>Hiệu điện thế (U):</label>
        <input id="rngVal" type="range" min="0.5" max="24" step="0.5" value="${c.v}">
        <div class="num-input-wrap">
          <input id="numVal" type="number" min="0.5" max="50" step="0.1" value="${c.v}">
          <b>V</b>
        </div>
      </div>`;
  } else if (c.type === 'bulb' || c.type === 'resistor' || c.type === 'bell') {
    ctrlHTML = `
      <div class="insp-ctrl">
        <label>Điện trở (R):</label>
        <input id="rngVal" type="range" min="1" max="100" step="0.5" value="${c.r}">
        <div class="num-input-wrap">
          <input id="numVal" type="number" min="0.5" max="500" step="0.1" value="${c.r}">
          <b>Ω</b>
        </div>
      </div>`;
  } else if (c.type === 'switch') {
    ctrlHTML = `<button class="btn ${c.closed ? 'success' : 'accent'}" id="inspToggleSwitchBtn">${c.closed ? '🔓 Mở Công tắc (K)' : '🔒 Đóng Công tắc (K)'}</button>`;
  } else if (c.type === 'ammeter') {
    const txtI = c.I > 25 ? 'NGẮN MẠCH!' : `${fmt(c.I, 2)} A`;
    ctrlHTML = `<div style="font-size:.78rem">Số chỉ: <b style="color:var(--blue)">I = ${txtI}</b> <small style="color:var(--muted)">(R<sub>A</sub> ≈ 0 Ω)</small></div>`;
  } else if (c.type === 'voltmeter') {
    const txtU = c.connected ? `${fmt(c.U, 2)} V` : '— (Chưa chạm đủ 2 que đo)';
    ctrlHTML = `<div style="font-size:.78rem">Số chỉ: <b style="color:var(--blue)">${txtU}</b></div>`;
  } else if (c.type === 'fuse') {
    ctrlHTML = `<div style="font-size:.78rem">Dòng qua cầu chì: <b>${dispI} A</b> / Giới hạn: <b style="color:var(--danger)">2.50 A</b></div>`;
  }

  const repairBtn = c.blown ? `<button class="btn success" id="inspRepairBtn">🛠️ Sửa mới</button>` : '';
  const rotBtn = c.type === 'voltmeter'
    ? `<button class="btn" id="inspResetProbeBtn">📍 Thu gọn que đo</button>`
    : `<button class="btn" id="inspRotateBtn">🔄 Xoay 90°</button>`;

  const subTxt = c.type === 'voltmeter'
    ? (c.connected ? `Đo được: ${fmt(c.U, 2)} V` : 'Kéo 2 kim để đo')
    : `U = ${dispU} V · I = ${dispI} A`;

  bar.innerHTML = `
    <div class="insp-head">
      <strong>${meta.name}</strong>
      <span id="inspSub">${subTxt}</span>
    </div>
    ${ctrlHTML}
    <div style="display:flex;gap:6px">
      ${repairBtn}
      ${rotBtn}
      <button class="btn danger" id="inspDeleteBtn">🗑 Xóa</button>
    </div>`;

  attachInspectorEvents(c);
}

function attachInspectorEvents(c) {
  const rng = $('rngVal');
  const num = $('numVal');

  if (rng) {
    rng.oninput = () => {
      const val = parseFloat(rng.value);
      if (num) num.value = val;
      setCompVal(c.id, c.type === 'battery' ? 'v' : 'r', val);
    };
  }
  if (num) {
    num.oninput = () => {
      const val = parseFloat(num.value);
      if (rng && !isNaN(val)) rng.value = val;
      setCompVal(c.id, c.type === 'battery' ? 'v' : 'r', val);
    };
  }

  const toggleBtn = $('inspToggleSwitchBtn');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      toggleSwitch(c.id);
      updateInspector();
    };
  }

  const resetBtn = $('inspResetProbeBtn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      resetProbes(c.id);
      updateInspector();
    };
  }

  const rotBtn = $('inspRotateBtn');
  if (rotBtn) {
    rotBtn.onclick = () => {
      rotateComp(c.id);
    };
  }

  const repairBtn = $('inspRepairBtn');
  if (repairBtn) {
    repairBtn.onclick = () => {
      c.blown = false;
      sfxClick(820);
      solveCircuit(true);
      updateInspector();
    };
  }

  const delBtn = $('inspDeleteBtn');
  if (delBtn) {
    delBtn.onclick = () => {
      deleteComp(c.id);
      sfxClick(320);
      solveCircuit(false);
      updateInspector();
    };
  }
}

export function setCompVal(id, key, val) {
  if (S.readOnly) return;
  const c = comps.find(x => x.id === id);
  if (!c || isNaN(val) || val <= 0) return;
  c[key] = Math.max(0.1, Math.min(500, val));
  solveCircuit(false);

  const sub = $('inspSub');
  if (sub) {
    sub.textContent = `U = ${fmt(Math.abs(c.U), 2)} V · I = ${fmt(Math.abs(c.I), 2)} A`;
  }
}

export function renderTaskCard(reshuffle = true) {
  const card = $('taskCard');
  const body = $('taskBody');
  const btns = $('taskBtns');
  const hintBtn = $('hintTaskBtn');
  if (!card || !body) return;

  if (AppState.gmMode === 'free') {
    card.classList.remove('show');
    S.docMysteryActive = false;
    updateHUD();
    return;
  }
  card.classList.add('show');
  const scoreLbl = $('scoreLbl');
  if (scoreLbl) scoreLbl.textContent = `${AppState.totalScore} điểm`;

  if (AppState.gmMode === 'challenge1') {
    $('taskHeaderTitle').textContent = '🎯 Thử thách Màn 1';
    btns.style.display = 'flex';
    hintBtn.style.display = 'inline-flex';
    hintBtn.textContent = '💡 Gợi ý lắp';

    const hasBattery = comps.some(c => c.type === 'battery');
    const hasSwitch = comps.some(c => c.type === 'switch');
    const hasClosedSwitch = comps.some(c => c.type === 'switch' && c.closed);
    const litBulb = comps.find(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.05);
    const isLit = Boolean(litBulb);
    const wireCount = wires.length;

    let partsScore = 0;
    if (hasBattery) partsScore++;
    if (hasSwitch) partsScore++;
    if (wireCount >= 2) partsScore++;
    if (isLit) partsScore++;

    const quizBtnHTML = isLit ? `
      <div id="quizActionWrap" style="margin-top:12px">
        <button class="btn success pulse-gold" id="openQuizBtn" style="width:100%;padding:11px 10px;font-weight:800;font-size:.84rem;justify-content:center;border-radius:10px;cursor:pointer">
          📝 VÀO BÀI TRẮC NGHIỆM CÔNG DỤNG (4 CÂU)
        </button>
      </div>
    ` : `
      <div style="margin-top:10px;font-size:.73rem;color:var(--muted);text-align:center">
        ⚡ Nối kín mạch & đóng công tắc cho đèn sáng để mở bài trắc nghiệm!
        <div style="margin-top:6px">
          <button class="btn" id="autoWireChallenge1Btn" style="font-size:.72rem;padding:4px 10px;margin:0 auto;background:#f1f5f9;color:#334155;border:1px dashed #94a3b8">
            ⚡ Hoặc bấm: Nối dây mẫu nhanh
          </button>
        </div>
      </div>
    `;

    body.innerHTML = `
      <div class="task-box" style="border-left-color:#f59e0b">
        <h4 style="color:#b45309">${CHALLENGE_1_DATA.title}</h4>
        <p style="margin:4px 0 8px 0">${CHALLENGE_1_DATA.desc}</p>
        
        <div class="challenge-checklist">
          <div class="chk-item ${hasBattery ? 'done' : ''}">
            <span>🔋 <b>1. Nguồn Pin 9V:</b> ${hasBattery ? 'Đã có trên bàn' : 'Thiếu pin'}</span>
          </div>
          <div class="chk-item ${hasSwitch ? (hasClosedSwitch ? 'done-active' : 'done') : ''}">
            <span>⚡ <b>2. Công tắc:</b> ${hasSwitch ? (hasClosedSwitch ? 'Đã đóng kín (Mạch kín)' : 'Đang mở (Nhấp để ĐÓNG)') : 'Thiếu công tắc'}</span>
          </div>
          <div class="chk-item ${wireCount >= 2 ? 'done' : ''}">
            <span>〰️ <b>3. Dây dẫn điện:</b> ${wireCount >= 2 ? `Đã nối ${wireCount} sợi dây` : `Cần nối thêm dây (${wireCount}/2+)`}</span>
          </div>
          <div class="chk-item ${isLit ? 'done-lit' : ''}">
            <span>💡 <b>4. Bóng đèn:</b> ${isLit ? '✨ ĐÃ SÁNG RỰC RỠ!' : 'Chưa sáng (cần mạch kín)'}</span>
          </div>
        </div>
        ${quizBtnHTML}
      </div>
    `;

    $('progBar').style.width = `${(partsScore / 4) * 100}%`;
    $('progLbl').textContent = isLit ? 'Hoàn thành lắp mạch! Đã mở trắc nghiệm' : `Tiến độ: ${partsScore}/4 bước`;

    const autoWireBtn = $('autoWireChallenge1Btn');
    if (autoWireBtn) {
      autoWireBtn.onclick = () => {
        const bat = comps.find(c => c.type === 'battery');
        const sw = comps.find(c => c.type === 'switch');
        const blb = comps.find(c => c.type === 'bulb');
        if (bat && sw && blb) {
          wires.length = 0;
          addWire(bat.id, 1, sw.id, 0);
          addWire(sw.id, 1, blb.id, 1);
          addWire(blb.id, 0, bat.id, 0);
          sw.closed = true;
          sfxWin();
          solveCircuit(true);
        }
      };
    }

    const openQuizBtn = $('openQuizBtn');
    if (openQuizBtn) {
      openQuizBtn.onclick = () => {
        openChallenge1Quiz();
      };
    }
  } else if (AppState.gmMode === 'challenge2') {
    $('taskHeaderTitle').textContent = '🩺 Thử thách Màn 2';
    btns.style.display = 'flex';
    hintBtn.style.display = 'inline-flex';
    hintBtn.textContent = '💡 Gợi ý bắt bệnh';

    const hasBattery = comps.some(c => c.type === 'battery');
    const hasSwitch = comps.some(c => c.type === 'switch');
    const hasClosedSwitch = comps.some(c => c.type === 'switch' && c.closed);
    const litBulb = comps.find(c => c.type === 'bulb' && !c.blown && Math.abs(c.I) > 0.05);
    const isLit = Boolean(litBulb);
    const wireCount = wires.length;

    if (!AppState.challenge2Diagnosed) {
      // BƯỚC 1: BÁC SĨ CHẨN ĐOÁN NGUYÊN NHÂN (PHẢI CHỌN ĐÚNG 2 Ô)
      body.innerHTML = `
        <div class="task-box" style="border-left-color:#ef4444">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="background:#ef4444;color:#fff;font-size:.68rem;font-weight:800;padding:2px 7px;border-radius:4px">BƯỚC 1 / 2</span>
            <span style="font-size:.78rem;font-weight:700;color:#dc2626">Bác Sĩ Bắt Bệnh Đèn Tắt</span>
          </div>
          <h4 style="color:#b91c1c;margin:2px 0 6px 0">${CHALLENGE_2_DATA.title}</h4>
          <p style="margin:4px 0 10px 0;font-size:.78rem;color:var(--text)">
            Mạch điện gồm Pin, Khóa K và Bóng đèn nhưng <b>đèn KHÔNG sáng</b>. Quan sát mạch và <b>chọn đúng 2 ô</b> nguyên nhân khiến mạch hở:
          </p>

          <div class="diagnosis-options-list" style="display:flex;flex-direction:column;gap:7px;margin:8px 0">
            ${CHALLENGE_2_DATA.diagnosisOptions.map(opt => `
              <label class="diag-opt-label">
                <input type="checkbox" name="challenge2_diag" value="${opt.id}" style="width:17px;height:17px;cursor:pointer;accent-color:#0284c7" />
                <span>${opt.text}</span>
              </label>
            `).join('')}
          </div>

          <div id="diagFeedback" style="display:none;margin-top:8px;padding:8px 10px;border-radius:8px;font-size:.74rem;line-height:1.4"></div>

          <button class="btn success" id="confirmDiagBtn" style="width:100%;margin-top:10px;padding:9px 10px;font-weight:800;font-size:.82rem;justify-content:center;border-radius:8px;background:#ef4444;color:#fff;border:none;cursor:pointer">
            🩺 XÁC NHẬN CHẨN ĐOÁN
          </button>
        </div>
      `;

      $('progBar').style.width = '25%';
      $('progLbl').textContent = 'Bước 1: Chẩn đoán nguyên nhân (Chọn đúng 2 ô)';

      const confirmBtn = $('confirmDiagBtn');
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          const checked = Array.from(document.querySelectorAll('input[name="challenge2_diag"]:checked')).map(cb => cb.value);
          const fb = $('diagFeedback');
          if (checked.length !== 2) {
            sfxClick(220);
            if (fb) {
              fb.style.display = 'block';
              fb.style.background = '#fef2f2';
              fb.style.border = '1px solid #fecaca';
              fb.style.color = '#b91c1c';
              fb.innerHTML = `⚠️ <b>Em phải chọn đúng 2 ô nguyên nhân</b> trong 4 phương án trên! (Hiện tại em đã chọn ${checked.length} ô)`;
            }
            say(`⚠️ Em hãy chọn đúng 2 ô nguyên nhân khiến đèn chưa sáng nhé! (Hiện chọn ${checked.length} ô)`, 'warn');
            return;
          }

          const hasSwitch = checked.includes('switch_open');
          const hasLoose = checked.includes('loose_wire');

          if (hasSwitch && hasLoose) {
            // Đúng cả 2 đáp án!
            AppState.challenge2Diagnosed = true;
            sfxWin();
            say('🎉 <b>Chẩn đoán chính xác!</b><br>Em đã tìm đúng 2 nguyên nhân: <b>Khóa K chưa đóng</b> và <b>1 đầu dây chưa nối vào cực pin</b>.<br>🔓 <b>ĐÃ MỞ KHÓA SỬA MẠCH!</b> Bây giờ em hãy nối dây còn lại vào cực Pin và ĐÓNG KHÓA K nhé!', 'ok');
            renderTaskCard(false);
          } else {
            // Có chọn đáp án sai
            sfxClick(220);
            let wrongMsg = '';
            if (checked.includes('wrong_pole')) {
              wrongMsg = '❌ <b>Nối sai cực pin:</b> Bóng đèn dây tóc không phân cực âm/dương, dù đổi chiều pin thì đèn vẫn sáng nếu mạch kín. Đây không phải nguyên nhân đèn tắt!';
            } else if (checked.includes('blown_bulb')) {
              wrongMsg = '❌ <b>Bóng đèn bị đứt dây tóc:</b> Quan sát kỹ bóng đèn, dây tóc bên trong vẫn còn nguyên vẹn. Mạch chưa sáng là do đang bị hở!';
            } else {
              wrongMsg = '❌ Chưa đúng rồi! Hãy quan sát kỹ lại Khóa K và sợi dây nối từ Đèn sang Pin xem có điểm hở nào không nhé!';
            }
            if (fb) {
              fb.style.display = 'block';
              fb.style.background = '#fef2f2';
              fb.style.border = '1px solid #fecaca';
              fb.style.color = '#b91c1c';
              fb.innerHTML = wrongMsg;
            }
            say(wrongMsg, 'warn');
          }
        };
      }
    } else {
      // BƯỚC 2: KHẮC PHỤC & SỬA MẠCH (ĐÃ MỞ KHÓA)
      let repairScore = 2; // Đã xong chẩn đoán (2 điểm)
      if (wireCount >= 3) repairScore++;
      if (hasClosedSwitch) repairScore++;
      if (isLit) repairScore++;

      const finishBtnHTML = isLit ? `
        <div id="finishChallenge2Wrap" style="margin-top:12px">
          <button class="btn success pulse-gold" id="finishChallenge2Btn" style="width:100%;padding:11px 10px;font-weight:800;font-size:.84rem;justify-content:center;border-radius:10px;cursor:pointer">
            🏆 HOÀN THÀNH THỬ THÁCH 2 & QUAY LẠI 3D
          </button>
        </div>
      ` : `
        <div style="margin-top:10px;font-size:.73rem;color:var(--muted);text-align:center">
          ⚡ Nối dây còn lại vào cực Pin (-) và đóng Khóa K cho đèn sáng!
          <div style="margin-top:6px">
            <button class="btn" id="autoFixChallenge2Btn" style="font-size:.72rem;padding:4px 10px;margin:0 auto;background:#f1f5f9;color:#334155;border:1px dashed #94a3b8">
              ⚡ Hoặc bấm: Sửa nhanh mạch mẫu
            </button>
          </div>
        </div>
      `;

      body.innerHTML = `
        <div class="task-box" style="border-left-color:#10b981">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="background:#10b981;color:#fff;font-size:.68rem;font-weight:800;padding:2px 7px;border-radius:4px">BƯỚC 2 / 2</span>
            <span style="font-size:.78rem;font-weight:700;color:#059669">Khắc Phục & Sửa Mạch Điện</span>
          </div>
          <h4 style="color:#047857;margin:2px 0 6px 0">🔓 Đã Mở Khóa Sửa Mạch!</h4>
          
          <div class="challenge-checklist">
            <div class="chk-item done">
              <span>🩺 <b>1. Chẩn đoán:</b> ĐÃ XÁC ĐỊNH ĐÚNG 2 LỖI</span>
            </div>
            <div class="chk-item ${wireCount >= 3 ? 'done' : ''}">
              <span>〰️ <b>2. Nối đầu dây vào Pin (-):</b> ${wireCount >= 3 ? 'Đã nối dây kín mạch' : 'Chưa nối dây từ Đèn vào cực (-) Pin'}</span>
            </div>
            <div class="chk-item ${hasClosedSwitch ? 'done-active' : ''}">
              <span>⚡ <b>3. Đóng Khóa K:</b> ${hasClosedSwitch ? 'Đã đóng (Mạch kín)' : 'Đang mở (Bấm vào Khóa K để ĐÓNG)'}</span>
            </div>
            <div class="chk-item ${isLit ? 'done-lit' : ''}">
              <span>💡 <b>4. Bóng đèn:</b> ${isLit ? '✨ ĐÃ PHÁT SÁNG RỰC RỠ!' : 'Chưa sáng (cần nối kín & đóng K)'}</span>
            </div>
          </div>
          ${finishBtnHTML}
        </div>
      `;

      $('progBar').style.width = isLit ? '100%' : `${(repairScore / 5) * 100}%`;
      $('progLbl').textContent = isLit ? 'Hoàn thành Thử Thách 2!' : `Tiến độ sửa mạch: ${repairScore}/5`;

      const autoFixBtn = $('autoFixChallenge2Btn');
      if (autoFixBtn) {
        autoFixBtn.onclick = () => {
          const bat = comps.find(c => c.type === 'battery');
          const sw = comps.find(c => c.type === 'switch');
          const blb = comps.find(c => c.type === 'bulb');
          if (bat && sw && blb) {
            wires.length = 0;
            addWire(bat.id, 1, sw.id, 0);
            addWire(sw.id, 1, blb.id, 1);
            addWire(blb.id, 0, bat.id, 0);
            sw.closed = true;
            sfxWin();
            solveCircuit(true);
          }
        };
      }

      const finishBtn = $('finishChallenge2Btn');
      if (finishBtn) {
        finishBtn.onclick = () => {
          sfxWin();
          if (window.closeStudio) window.closeStudio();
          if (window.flyToZone) window.flyToZone('doctor');
        };
      }
    }
  } else if (AppState.gmMode === 'build') {
    $('taskHeaderTitle').textContent = '🎯 Thử thách Đo & Lắp';
    btns.style.display = 'flex';
    hintBtn.style.display = 'none';
    const t = BUILD_TASKS[AppState.buildLv];
    body.innerHTML = `<div class="task-box"><h4>${t.title}</h4><p>${t.desc}</p></div>`;
    $('progBar').style.width = `${((AppState.buildLv + 1) / BUILD_TASKS.length) * 100}%`;
    $('progLbl').textContent = `Màn ${AppState.buildLv + 1}/${BUILD_TASKS.length}`;
  } else if (AppState.gmMode === 'doc') {
    $('taskHeaderTitle').textContent = '🩺 Bác sĩ Mạch điện';
    btns.style.display = 'flex';
    hintBtn.style.display = 'inline-flex';
    const t = DOC_TASKS[AppState.docLv];

    hintBtn.textContent = AppState.unlockedHints < t.hints.length
      ? `💡 Mở Gợi ý ${AppState.unlockedHints + 1} (${AppState.unlockedHints}/${t.hints.length})`
      : `💡 Xem lại (${t.hints.length}/${t.hints.length})`;

    // Ghim cố định gợi ý đã mở, không bị mất đi
    const pinnedHTML = AppState.unlockedHints > 0
      ? `<div class="pinned-hints">` + t.hints.slice(0, AppState.unlockedHints).map((h, i) =>
          `<div class="hint-item" data-hint-idx="${i}">${h}</div>`).join('') + `</div>`
      : '';

    body.innerHTML = `<div class="task-box" style="border-left-color:var(--accent)"><h4>${t.title}</h4><p>${t.desc}</p></div>${pinnedHTML}`;
    $('progBar').style.width = `${((AppState.docLv + 1) / DOC_TASKS.length) * 100}%`;
    $('progLbl').textContent = `Ca đố ${AppState.docLv + 1}/${DOC_TASKS.length}`;

    // Gắn sự kiện click lại từng gợi ý đã ghim
    body.querySelectorAll('.hint-item').forEach(el => {
      el.onclick = () => {
        const idx = parseInt(el.dataset.hintIdx, 10);
        showSpecificHint(idx);
      };
    });
  } else if (AppState.gmMode === 'sym') {
    $('taskHeaderTitle').textContent = '📐 Đố vui Ký hiệu';
    btns.style.display = 'none';
    const q = SYM_QUIZ[AppState.symLv];
    if (reshuffle || AppState.currentShuffledQuiz.length === 0) {
      AppState.currentShuffledQuiz = shuffleQuizOptions(q);
    }
    body.innerHTML = `
      <div style="background:#0b1528;border-radius:9px;height:48px;display:flex;align-items:center;justify-content:center;margin-bottom:6px">
        <svg width="120" height="48">${q.svg}</svg>
      </div>
      <div style="font-size:.77rem;font-weight:700;color:var(--ink)">Câu ${AppState.symLv + 1}/${SYM_QUIZ.length}: ${q.q}</div>
      <div class="quiz-list">${AppState.currentShuffledQuiz.map((item, idx) => `<button class="quiz-opt" data-opt-idx="${idx}">${item.txt}</button>`).join('')}</div>`;
    $('progBar').style.width = `${((AppState.symLv + 1) / SYM_QUIZ.length) * 100}%`;
    $('progLbl').textContent = `Câu ${AppState.symLv + 1}/${SYM_QUIZ.length}`;

    body.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.optIdx, 10);
        answerQuiz(idx);
      };
    });
  }
}

export function showSpecificHint(idx) {
  if (AppState.gmMode !== 'doc') return;
  const t = DOC_TASKS[AppState.docLv];
  if (t && t.hints[idx]) {
    sfxClick(700);
    say(t.hints[idx]);
  }
}

export function answerQuiz(idx) {
  const chosen = AppState.currentShuffledQuiz[idx];
  if (chosen && chosen.isCorrect) {
    sfxWin();
    AppState.totalScore += 25;
    AppState.symLv = (AppState.symLv + 1) % SYM_QUIZ.length;
    say('🎉 <b>Chính xác!</b> Em nắm rất vững ký hiệu sơ đồ mạch điện đấy!', 'ok');
    renderTaskCard(true);
  } else {
    sfxClick(220);
    say('🤔 <b>Chưa đúng rồi!</b> Thứ tự đáp án đã được trộn lại, em hãy quan sát kỹ ký hiệu rồi chọn lại nhé!', 'warn');
    renderTaskCard(true);
  }
}

export function setReadOnlyMode(readOnly) {
  S.readOnly = readOnly;
  document.body.classList.toggle('readonly-mode', readOnly);
  const roBanner = $('roBanner');
  if (roBanner) {
    roBanner.classList.toggle('active', readOnly);
  }
  const badgeTxt = $('stationBadgeTxt');
  if (badgeTxt && AppState.gmMode === 'free') {
    badgeTxt.innerHTML = readOnly
      ? '👁️ <b>Trạm Quan Sát:</b> Mạch Mẫu Thực Nghiệm'
      : '🛠️ <b>Trạm Thực Hành:</b> Phòng Lab Lắp Mạch Tự Do';
  }
  updateInspector();
  updateHUD();
}

export function switchStudioMode(m) {
  AppState.gmMode = m;
  AppState.unlockedHints = 0;
  if (m === 'challenge1') {
    AppState.challenge1Passed = false;
  } else if (m === 'challenge2') {
    AppState.challenge2Diagnosed = false;
    AppState.challenge2Passed = false;
  }

  // Cập nhật huy hiệu chức năng chuyên biệt theo trạm Kiosk 3D
  const badgeWrap = $('stationBadge');
  const badgeTxt = $('stationBadgeTxt');
  if (badgeWrap && badgeTxt) {
    badgeWrap.className = `station-badge mode-${m}`;
    if (m === 'challenge1') {
      badgeTxt.innerHTML = '🎯 <b>Thử Thách Màn 1:</b> Lắp Mạch Điện Đơn Giản';
    } else if (m === 'challenge2') {
      badgeTxt.innerHTML = '🩺 <b>Thử Thách Màn 2:</b> Bác Sĩ Bắt Bệnh & Sửa Mạch';
    } else if (m === 'build') {
      badgeTxt.innerHTML = '🎯 <b>Trạm Kiosk:</b> Thử Thách Đo & Lắp Mạch';
    } else if (m === 'sym') {
      badgeTxt.innerHTML = '🏆 <b>Trạm Kiosk:</b> Đố Vui Ký Hiệu & Linh Kiện';
    } else if (m === 'doc') {
      badgeTxt.innerHTML = '🩺 <b>Trạm Khám:</b> Bác Sĩ Chuẩn Đoán & Sửa Mạch';
    } else if (m === 'free') {
      badgeTxt.innerHTML = S.readOnly
        ? '👁️ <b>Trạm Quan Sát:</b> Mạch Mẫu Thực Nghiệm'
        : '🛠️ <b>Trạm Thực Hành:</b> Phòng Lab Lắp Mạch Tự Do';
    }
  }

  // Lọc khay linh kiện: Trong challenge1 và challenge2 chỉ hiển thị đúng 4 bộ phận
  const drawerBtns = document.querySelectorAll('.comp-drawer [data-add]');
  const meterCard = document.querySelector('.right-dock .side-card:first-child');

  if (m === 'challenge1' || m === 'challenge2') {
    drawerBtns.forEach(btn => {
      const type = btn.dataset.add;
      if (['wire_seg', 'battery', 'bulb', 'switch'].includes(type)) {
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });
    if (meterCard) meterCard.style.display = 'none';
  } else {
    drawerBtns.forEach(btn => {
      btn.style.display = '';
    });
    if (meterCard) meterCard.style.display = '';
  }

  // Ẩn nút "Đổi mạch mẫu" khi đang ở các Kiosk thử thách / đố vui / bác sĩ để học sinh tập trung làm bài
  const presetBtn = $('presetBtn');
  if (presetBtn) {
    presetBtn.style.display = (m === 'free' && !S.readOnly) ? 'inline-flex' : 'none';
  }

  renderTaskCard(true);

  const { W, H } = getCanvasDimensions();

  if (AppState.gmMode === 'challenge1') {
    setReadOnlyMode(false);
    CHALLENGE_1_DATA.setup(W, H);
    say('🎯 <b>Thử Thách Màn 1:</b> Dùng <b>Dây nối</b> liên kết <b>Pin 9V</b>, <b>Công tắc K</b> và <b>Bóng đèn</b> thành mạch kín. Sau đó đóng công tắc để đèn sáng!');
  } else if (AppState.gmMode === 'challenge2') {
    setReadOnlyMode(false);
    CHALLENGE_2_DATA.setup(W, H);
    say('🩺 <b>Thử Thách Màn 2:</b> Quan sát mạch điện trên bàn. Hãy <b>chọn đúng 2 nguyên nhân</b> khiến đèn chưa sáng trong thẻ bên phải để mở khóa sửa mạch nhé!');
  } else if (AppState.gmMode === 'build') {
    setReadOnlyMode(false);
    BUILD_TASKS[AppState.buildLv].setup(W, H);
    say('🎯 <b>Chế độ Đo & Lắp:</b> Hãy hoàn thành yêu cầu trong thẻ nhiệm vụ bên phải rồi bấm <b>"✅ Kiểm tra"</b> nhé!');
  } else if (AppState.gmMode === 'doc') {
    setReadOnlyMode(false);
    DOC_TASKS[AppState.docLv].setup(W, H);
    say('🩺 <b>Bác sĩ Mạch điện:</b> Mạch trên bàn đang gặp sự cố bí ẩn! Hãy tự tìm lỗi và sửa lại, hoặc bấm nút <b>"💡 Mở Gợi ý 1"</b> nhé.');
  } else if (AppState.gmMode === 'free') {
    say('🛠️ <b>Chế độ Tự do:</b> Em có thể tùy ý kéo linh kiện từ khay bên trái, nối dây và thử nghiệm mọi hiện tượng điện học!');
  } else if (AppState.gmMode === 'sym') {
    say('📐 <b>Đố vui Ký hiệu:</b> Hãy chọn phương án đúng tương ứng với sơ đồ hiển thị nhé!');
  }
}

export function initUIEventListeners() {

  // View switcher (Real / Schematic)
  document.querySelectorAll('#viewSeg button').forEach(b => {
    b.onclick = () => {
      S.view = b.dataset.v;
      document.querySelectorAll('#viewSeg button').forEach(x => x.classList.toggle('on', x === b));
    };
  });

  // Flow button (Electron / Conventional / None)
  const FLOW_MODES = [
    { id: 'elec', lbl: '🔵 Hạt Electron (- → +)' },
    { id: 'conv', lbl: '🔺 Dòng quy ước (+ → -)' },
    { id: 'none', lbl: '⚪ Ẩn dòng hạt' }
  ];
  let flowIdx = 0;
  const flowBtn = $('flowBtn');
  if (flowBtn) {
    flowBtn.onclick = () => {
      flowIdx = (flowIdx + 1) % FLOW_MODES.length;
      S.flow = FLOW_MODES[flowIdx].id;
      flowBtn.textContent = FLOW_MODES[flowIdx].lbl;
    };
  }

  // Cut button
  const cutBtn = $('cutBtn');
  if (cutBtn) {
    cutBtn.onclick = () => {
      if (S.readOnly) return;
      S.cutMode = !S.cutMode;
      cutBtn.classList.toggle('cut-active', S.cutMode);
      $('cv').style.cursor = S.cutMode ? 'not-allowed' : 'default';
      updateHUD();
      if (!(AppState.gmMode === 'doc' && AppState.unlockedHints > 0)) {
        say(S.cutMode ? '✂️ <b>Đã bật Kéo cắt dây:</b> Bấm vào sợi dây bất kỳ để tháo bỏ!' : 'Đã tắt chế độ cắt dây.');
      }
    };
  }

  // Preset button
  const presetBtn = $('presetBtn');
  if (presetBtn) {
    presetBtn.onclick = () => {
      S.presetIdx = (S.presetIdx + 1) % 3;
      const { W, H } = getCanvasDimensions();
      loadPresetCircuit(S.presetIdx, W, H, say);
    };
  }

  // Clear button
  const clearBtn = $('clearBtn');
  if (clearBtn) {
    clearBtn.onclick = () => {
      if (S.readOnly) return;
      if (AppState.gmMode === 'challenge2' && !AppState.challenge2Diagnosed) {
        sayThrottled('🔒 <b>Mạch đang tạm khóa!</b> Em hãy hoàn thành bước <b>Bác sĩ bắt bệnh</b> ở bảng bên phải trước nhé!', 'warn', 1800);
        return;
      }
      comps.length = 0;
      wires.length = 0;
      S.selectedId = null;
      S.docMysteryActive = false;
      solveCircuit(false);
    };
  }

  // Load Task button
  const loadTaskBtn = $('loadTaskBtn');
  if (loadTaskBtn) {
    loadTaskBtn.onclick = () => {
      const { W, H } = getCanvasDimensions();
      if (AppState.gmMode === 'challenge1') {
        AppState.challenge1Passed = false;
        CHALLENGE_1_DATA.setup(W, H);
        renderTaskCard(false);
        say('🔄 <b>Đã tải lại 4 bộ phận ban đầu.</b> Hãy dùng Dây nối lắp thành mạch kín rồi bấm đóng công tắc nhé!');
      } else if (AppState.gmMode === 'challenge2') {
        AppState.challenge2Diagnosed = false;
        AppState.challenge2Passed = false;
        CHALLENGE_2_DATA.setup(W, H);
        renderTaskCard(false);
        say('🔄 <b>Đã tải lại mạch lỗi ban đầu.</b> Hãy quan sát và chọn đúng 2 ô nguyên nhân đèn chưa sáng nhé!');
      } else if (AppState.gmMode === 'build') {
        BUILD_TASKS[AppState.buildLv].setup(W, H);
      } else if (AppState.gmMode === 'doc') {
        DOC_TASKS[AppState.docLv].setup(W, H);
        renderTaskCard(false);
      }
    };
  }

  // Hint button
  const hintTaskBtn = $('hintTaskBtn');
  if (hintTaskBtn) {
    hintTaskBtn.onclick = () => {
      if (AppState.gmMode === 'challenge1') {
        sfxClick(720);
        say('💡 <b>Gợi ý Thử Thách 1:</b><br>1. Kéo dây nối từ cực (+) Pin sang 1 đầu Công tắc.<br>2. Kéo dây nối từ đầu còn lại của Công tắc sang chốt dưới Đèn.<br>3. Kéo dây nối từ chốt bên hông Đèn về cực (-) Pin.<br>4. Nhấp vào Công tắc để <b>ĐÓNG MẠCH</b> làm bóng đèn sáng!');
        return;
      }
      if (AppState.gmMode === 'challenge2') {
        sfxClick(720);
        if (!AppState.challenge2Diagnosed) {
          say('💡 <b>Gợi ý Bắt bệnh:</b><br>1. Quan sát lưỡi gạt của <b>Khóa K</b> xem đang nằm ngang hay ngửa lên?<br>2. Nhìn sợi dây màu xanh từ bóng đèn: Nó đã chạm vào cực (-) của Pin hay đang hở ra?');
        } else {
          say('💡 <b>Gợi ý Sửa mạch:</b><br>1. Kéo dây nối từ chốt hở của Đèn vào cực (-) của Pin.<br>2. Bấm vào Khóa K để gạt đóng công tắc kín mạch!');
        }
        return;
      }
      if (AppState.gmMode !== 'doc') return;
      const t = DOC_TASKS[AppState.docLv];
      if (AppState.unlockedHints < t.hints.length) {
        const msg = t.hints[AppState.unlockedHints];
        AppState.unlockedHints++;
        sfxClick(720);
        say(msg);
        renderTaskCard(false);
      } else {
        sfxClick(720);
        say(t.hints.join('<br><br>'));
      }
    };
  }

  // Check Task button
  const checkTaskBtn = $('checkTaskBtn');
  if (checkTaskBtn) {
    checkTaskBtn.onclick = () => {
      if (AppState.gmMode === 'challenge1') {
        const res = CHALLENGE_1_DATA.check();
        if (res.ok) {
          sfxWin();
          AppState.totalScore += 50;
          say(res.msg + '<br>👉 Hãy bấm nút <b>"📝 VÀO BÀI TRẮC NGHIỆM CÔNG DỤNG"</b> để thử thách 4 câu hỏi lý thuyết!', 'ok');
          renderTaskCard(false);
        } else {
          sfxClick(220);
          say(res.msg, 'warn');
          renderTaskCard(false);
        }
        return;
      }
      if (AppState.gmMode === 'challenge2') {
        if (!AppState.challenge2Diagnosed) {
          sfxClick(220);
          say('🩺 Em hãy tích chọn đúng 2 ô nguyên nhân ở bảng bên phải và bấm <b>"🩺 XÁC NHẬN CHẨN ĐOÁN"</b> trước nhé!', 'warn');
          return;
        }
        const res = CHALLENGE_2_DATA.checkFixed();
        if (res.ok) {
          sfxWin();
          AppState.totalScore += 50;
          say(res.msg, 'ok');
          renderTaskCard(false);
        } else {
          sfxClick(220);
          say(res.msg, 'warn');
          renderTaskCard(false);
        }
        return;
      }
      const list = AppState.gmMode === 'build' ? BUILD_TASKS : DOC_TASKS;
      const idx = AppState.gmMode === 'build' ? AppState.buildLv : AppState.docLv;
      const res = list[idx].check();
      const { W, H } = getCanvasDimensions();

      if (res.ok) {
        sfxWin();
        AppState.totalScore += 50;
        AppState.unlockedHints = 0;
        say(res.msg, 'ok');
        if (AppState.gmMode === 'build') {
          AppState.buildLv = (AppState.buildLv + 1) % BUILD_TASKS.length;
          BUILD_TASKS[AppState.buildLv].setup(W, H);
        } else {
          AppState.docLv = (AppState.docLv + 1) % DOC_TASKS.length;
          DOC_TASKS[AppState.docLv].setup(W, H);
        }
        renderTaskCard(true);
      } else {
        sfxClick(220);
        say(res.msg, 'warn');
      }
    };
  }

  const closeQuizBtn = $('closeQuizModalBtn');
  if (closeQuizBtn) {
    closeQuizBtn.onclick = closeChallenge1Quiz;
  }

  // Quick switch from Read-Only to Free Lab
  const roSwitchBtn = $('roSwitchBtn');
  if (roSwitchBtn) {
    roSwitchBtn.onclick = () => {
      setReadOnlyMode(false);
      switchStudioMode('free');
      say('🛠️ <b>Đã mở trong Phòng Lab Tự Do!</b> Em có thể thoải mái thêm linh kiện, nối dây và sửa đổi mạch điện.');
    };
  }

  // Component Drawer add buttons
  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.onclick = () => {
      if (S.readOnly) return;
      if (AppState.gmMode === 'challenge2' && !AppState.challenge2Diagnosed) {
        sayThrottled('🔒 <b>Mạch đang tạm khóa!</b> Em hãy hoàn thành bước <b>Bác sĩ bắt bệnh</b> ở bảng bên phải để mở khóa sửa mạch nhé!', 'warn', 1800);
        return;
      }
      const type = btn.dataset.add;
      sfxClick(600);
      const { W, H } = getCanvasDimensions();
      const offset = (comps.length % 5) * 26 - 40;
      const c = makeComp(type, W * 0.46 + offset, H * 0.5 + offset * 0.5);
      S.selectedId = c.id;
      solveCircuit(false);
      updateInspector();
    };
  });
}

// ==========================================================================
// ĐIỀU KHIỂN BÀI TRẮC NGHIỆM CÔNG DỤNG 4 BỘ PHẬN THỬ THÁCH MÀN 1
// ==========================================================================
let currentQuizIdx = 0;
let quizUserScore = 0;
let quizAnswered = false;

export function openChallenge1Quiz() {
  const modal = $('challenge1QuizModal');
  if (!modal) return;
  modal.style.display = 'flex';
  currentQuizIdx = 0;
  quizUserScore = 0;
  quizAnswered = false;
  sfxClick(600);
  renderQuizQuestion(0);
}

export function closeChallenge1Quiz() {
  const modal = $('challenge1QuizModal');
  if (modal) modal.style.display = 'none';
  sfxClick(350);
}

export function renderQuizQuestion(idx) {
  const container = $('quizModalContent');
  if (!container) return;
  const q = COMPONENT_FUNCTION_QUIZ[idx];
  if (!q) {
    renderQuizSummary();
    return;
  }
  quizAnswered = false;

  const total = COMPONENT_FUNCTION_QUIZ.length;
  const progressPct = ((idx + 1) / total) * 100;

  container.innerHTML = `
    <div class="quiz-q-progress">
      <div class="quiz-q-meta">
        <span class="quiz-q-count">Câu hỏi ${idx + 1}/${total}</span>
        <span class="quiz-q-component">${q.icon} ${q.partName}</span>
      </div>
      <div class="prog-bar" style="margin-top:6px;height:5px"><i style="width:${progressPct}%;background:linear-gradient(90deg, #38bdf8, #10b981)"></i></div>
    </div>
    <div class="quiz-q-title">${q.question}</div>
    <div class="quiz-options-list" id="quizOptionsList">
      ${q.options.map((opt, i) => `
        <button class="quiz-option-btn" data-opt-idx="${i}">
          <span class="opt-bullet">${String.fromCharCode(65 + i)}</span>
          <span class="opt-text">${opt.text.replace(/^[A-D]\.\s*/, '')}</span>
        </button>
      `).join('')}
    </div>
    <div id="quizFeedbackBox" style="display:none"></div>
    <div class="quiz-q-actions" id="quizActionBox" style="display:none">
      <button class="btn success" id="nextQuizBtn" style="padding:10px 20px;font-weight:700">
        ${idx + 1 < total ? 'Câu tiếp theo ➔' : 'Xem kết quả tổng kết 🏆'}
      </button>
    </div>
  `;

  // Gắn sự kiện chọn đáp án
  const optionBtns = container.querySelectorAll('.quiz-option-btn');
  optionBtns.forEach(btn => {
    btn.onclick = () => {
      if (quizAnswered) return;
      quizAnswered = true;
      const optIdx = parseInt(btn.dataset.optIdx, 10);
      const chosen = q.options[optIdx];
      const fbBox = $('quizFeedbackBox');
      const actBox = $('quizActionBox');

      optionBtns.forEach((b, i) => {
        b.disabled = true;
        if (q.options[i].isCorrect) {
          b.classList.add('correct');
        }
      });

      if (chosen.isCorrect) {
        btn.classList.add('correct');
        quizUserScore++;
        sfxWin();
        if (fbBox) {
          fbBox.className = 'quiz-feedback-box correct';
          fbBox.innerHTML = `<b>🎉 Chính xác!</b><br>${q.explain}`;
          fbBox.style.display = 'block';
        }
      } else {
        btn.classList.add('wrong');
        sfxZap();
        if (fbBox) {
          fbBox.className = 'quiz-feedback-box wrong';
          fbBox.innerHTML = `<b>❌ Chưa chính xác!</b><br>${q.explain}`;
          fbBox.style.display = 'block';
        }
      }

      if (actBox) actBox.style.display = 'flex';
      const nextBtn = $('nextQuizBtn');
      if (nextBtn) {
        nextBtn.onclick = () => {
          sfxClick(550);
          if (idx + 1 < total) {
            renderQuizQuestion(idx + 1);
          } else {
            renderQuizSummary();
          }
        };
      }
    };
  });
}

export function renderQuizSummary() {
  const container = $('quizModalContent');
  if (!container) return;
  const total = COMPONENT_FUNCTION_QUIZ.length;
  const pct = Math.round((quizUserScore / total) * 100);
  const isPerfect = quizUserScore === total;

  if (isPerfect) sfxWin();

  container.innerHTML = `
    <div class="quiz-summary-wrap">
      <div class="summary-trophy">${isPerfect ? '🏆' : '🌟'}</div>
      <div class="summary-title">${isPerfect ? 'Xuất Sắc! Bạn Đã Làm Chủ Kiến Thức Màn 1' : 'Hoàn Thành Bài Trắc Nghiệm Màn 1!'}</div>
      <div class="summary-score">Kết quả đạt được: <b>${quizUserScore}/${total} câu đúng</b> (${pct}%)</div>
      
      <div class="summary-review-card">
        <h4>📋 TỔNG KẾT CÔNG DỤNG 4 BỘ PHẬN TRONG MẠCH ĐIỆN:</h4>
        <ul>
          <li><b>🔋 1. Nguồn điện (Pin 9V):</b> Cung cấp năng lượng điện và duy trì dòng điện chạy trong mạch kín liên tục.</li>
          <li><b>💡 2. Bóng đèn:</b> Thiết bị tiêu thụ điện năng (tải), biến đổi điện năng thành quang năng (ánh sáng) và nhiệt.</li>
          <li><b>⚡ 3. Công tắc (Khóa K):</b> Dụng cụ đóng/ngắt mạch chủ động, cho phép hoặc ngắt dòng điện một cách an toàn.</li>
          <li><b>〰️ 4. Dây dẫn điện:</b> Lõi kim loại dẫn truyền dòng điện, kết nối các linh kiện thành một vòng mạch kín.</li>
        </ul>
      </div>

      <div class="summary-actions">
        <button class="btn accent" id="retryQuizBtn" style="padding:10px 18px;font-weight:700">🔄 Làm lại trắc nghiệm</button>
        <button class="btn success" id="finishBack3dBtn" style="padding:10px 22px;font-weight:700">🚶 Hoàn thành & Quay lại Phòng 3D</button>
      </div>
    </div>
  `;

  const retryBtn = $('retryQuizBtn');
  if (retryBtn) {
    retryBtn.onclick = () => {
      sfxClick(600);
      renderQuizQuestion(0);
    };
  }

  const back3dBtn = $('finishBack3dBtn');
  if (back3dBtn) {
    back3dBtn.onclick = () => {
      closeChallenge1Quiz();
      if (window.closeStudio) window.closeStudio();
      if (window.flyToZone) window.flyToZone('sample1');
    };
  }
}
