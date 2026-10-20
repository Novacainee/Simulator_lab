/* ==========================================================================
   js/studio2d/uiController2d.js - Quản lý thanh Inspector, Trợ lý Robo,
                                   Ghim gợi ý, Trộn đáp án Quiz & UI
   ========================================================================== */

import { S, AppState, comps, wires, COMP_META, deleteComp, makeComp } from '../state.js';
import { solveCircuit, fmt, cleanZero } from '../physics/mnaSolver.js';
import { BUILD_TASKS, DOC_TASKS, SYM_QUIZ, shuffleQuizOptions, loadPresetCircuit } from '../data/challenges.js';
import { sfxClick, sfxZap, sfxWin } from '../audio/soundEngine.js';
import { resetProbes, rotateComp, toggleSwitch } from './interaction2d.js';
import { getCanvasDimensions } from './renderer2d.js';

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

  if (AppState.gmMode === 'build') {
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

  // Cập nhật huy hiệu chức năng chuyên biệt theo trạm Kiosk 3D
  const badgeWrap = $('stationBadge');
  const badgeTxt = $('stationBadgeTxt');
  if (badgeWrap && badgeTxt) {
    badgeWrap.className = `station-badge mode-${m}`;
    if (m === 'build') {
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

  // Ẩn nút "Đổi mạch mẫu" khi đang ở các Kiosk thử thách / đố vui / bác sĩ để học sinh tập trung làm bài
  const presetBtn = $('presetBtn');
  if (presetBtn) {
    presetBtn.style.display = (m === 'free' && !S.readOnly) ? 'inline-flex' : 'none';
  }

  renderTaskCard(true);

  const { W, H } = getCanvasDimensions();

  if (AppState.gmMode === 'build') {
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
      if (AppState.gmMode === 'build') BUILD_TASKS[AppState.buildLv].setup(W, H);
      else if (AppState.gmMode === 'doc') {
        DOC_TASKS[AppState.docLv].setup(W, H);
        renderTaskCard(false);
      }
    };
  }

  // Hint button
  const hintTaskBtn = $('hintTaskBtn');
  if (hintTaskBtn) {
    hintTaskBtn.onclick = () => {
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
