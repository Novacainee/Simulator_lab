/* ==========================================================================
   js/world3d/controls3d.js - Điều khiển xoay 360, cuộn chuột, Joystick ảo,
                              va chạm tường lớp học & Bay nhanh (flyToZone)
   ========================================================================== */

import { AppState } from '../state.js';
import { interactables3D } from './classroomBuilder.js?v=25';
import { ZONE_TARGETS } from '../data/challenges.js?v=25';
import { sfxClick, sfxWin } from '../audio/soundEngine.js';
import { ROOM_W, ROOM_D } from './sceneManager.js?v=25';

const $ = id => document.getElementById(id);

let camera = null;
let cv3d = null;
let activeInteractables = interactables3D;

let camYaw = 0;
let camPitch = -0.03;
let isDragging3D = false;
let pointerDownPos = { x: 0, y: 0 };
let prevPointerPos = { x: 0, y: 0 };
let flyAnim = null;

const keys3D = { w: false, a: false, s: false, d: false };
const joyVec = { x: 0, y: 0 };
let isJoyDragging = false;

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

let onOpenStudioCallback = null;

export function registerControlsCallback(openStudioCallback) {
  onOpenStudioCallback = openStudioCallback;
}

export function getEffectiveInteractables() {
  if (activeInteractables && activeInteractables.length > 0) return activeInteractables;
  if (window.interactables3D && window.interactables3D.length > 0) return window.interactables3D;
  return interactables3D;
}

export function initControls3D(cam, canvas3D, customInteractables = null) {
  camera = cam;
  cv3d = canvas3D;
  if (customInteractables && Array.isArray(customInteractables)) {
    activeInteractables = customInteractables;
  }

  setupMouseAndTouch();
  setupKeyboard();
  setupJoystick();
  setupMenuNavigation();
}

function getNDC(clientX, clientY) {
  const rect = cv3d.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1
  };
}

function checkRaycastHit(clientX, clientY) {
  if (!camera || !cv3d) return null;
  const ndc = getNDC(clientX, clientY);
  mouseNDC.set(ndc.x, ndc.y);
  raycaster.setFromCamera(mouseNDC, camera);
  const targets = getEffectiveInteractables();
  const hits = raycaster.intersectObjects(targets, false);
  if (hits.length > 0 && hits[0].object && hits[0].object.userData) {
    return hits[0].object.userData;
  }
  return null;
}

function setupMouseAndTouch() {
  cv3d.addEventListener('pointerdown', ev => {
    if (AppState.inStudio) return;
    const drop = $('menu3DDrop');
    if (drop) drop.classList.remove('open');
    isDragging3D = true;
    flyAnim = null;
    pointerDownPos = { x: ev.clientX, y: ev.clientY };
    prevPointerPos = { x: ev.clientX, y: ev.clientY };
  });

  window.addEventListener('pointermove', ev => {
    if (AppState.inStudio) return;

    if (isDragging3D) {
      const dx = ev.clientX - prevPointerPos.x;
      const dy = ev.clientY - prevPointerPos.y;
      prevPointerPos = { x: ev.clientX, y: ev.clientY };
      camYaw   -= dx * 0.0045;
      camPitch = Math.max(-0.55, Math.min(0.55, camPitch - dy * 0.0035));
      return;
    }

    // Raycast kiểm tra trỏ chuột vào bàn thí nghiệm / màn hình / nút PLAY
    const data = checkRaycastHit(ev.clientX, ev.clientY);
    const lbl = $('hoverLabel3D');

    if (data && data.label) {
      cv3d.style.cursor = 'pointer';
      if (lbl) {
        lbl.style.display = 'block';
        lbl.style.left = ev.clientX + 'px';
        lbl.style.top = ev.clientY + 'px';
        lbl.textContent = data.label;
      }
    } else {
      cv3d.style.cursor = 'grab';
      if (lbl) lbl.style.display = 'none';
    }
  });

  window.addEventListener('pointerup', ev => {
    if (AppState.inStudio) return;
    if (isDragging3D) {
      isDragging3D = false;
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);

      // Cho phép độ dịch chuyển thao tác chuột tự nhiên (< 25px)
      if (dist < 25) {
        const data = checkRaycastHit(ev.clientX, ev.clientY);
        if (data && data.mode) {
          sfxWin();
          if (onOpenStudioCallback) {
            onOpenStudioCallback(data.mode, data.preset, data.readOnly);
          }
        }
      }
    }
  });

  // Sự kiện click trực tiếp dự phòng bảo đảm 100% phản hồi trên mọi thiết bị
  cv3d.addEventListener('click', ev => {
    if (AppState.inStudio) return;
    const data = checkRaycastHit(ev.clientX, ev.clientY);
    if (data && data.mode) {
      sfxWin();
      if (onOpenStudioCallback) {
        onOpenStudioCallback(data.mode, data.preset, data.readOnly);
      }
    }
  });

  // Cuộn chuột để tiến tới / lùi lại
  cv3d.addEventListener('wheel', ev => {
    if (AppState.inStudio) return;
    ev.preventDefault();
    flyAnim = null;
    const step = -Math.sign(ev.deltaY) * 0.85;
    movePlayer(step, 0);
  }, { passive: false });
}

function setupKeyboard() {
  window.addEventListener('keydown', ev => {
    const k = ev.key.toLowerCase();
    if (k === 'w' || ev.key === 'ArrowUp') keys3D.w = true;
    if (k === 's' || ev.key === 'ArrowDown') keys3D.s = true;
    if (k === 'a' || ev.key === 'ArrowLeft') keys3D.a = true;
    if (k === 'd' || ev.key === 'ArrowRight') keys3D.d = true;
  });

  window.addEventListener('keyup', ev => {
    const k = ev.key.toLowerCase();
    if (k === 'w' || ev.key === 'ArrowUp') keys3D.w = false;
    if (k === 's' || ev.key === 'ArrowDown') keys3D.s = false;
    if (k === 'a' || ev.key === 'ArrowLeft') keys3D.a = false;
    if (k === 'd' || ev.key === 'ArrowRight') keys3D.d = false;
  });
}

function setupJoystick() {
  const joyWrap = $('joyWrap');
  const joyKnob = $('joyKnob');
  if (!joyWrap || !joyKnob) return;

  function updateJoystick(clientX, clientY) {
    const r = joyWrap.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const maxR = 32;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVec.x = dx / maxR;
    joyVec.y = dy / maxR;
  }

  joyWrap.addEventListener('pointerdown', ev => {
    ev.stopPropagation();
    joyWrap.setPointerCapture(ev.pointerId);
    isJoyDragging = true;
    flyAnim = null;
    updateJoystick(ev.clientX, ev.clientY);
  });

  joyWrap.addEventListener('pointermove', ev => {
    if (!isJoyDragging) return;
    updateJoystick(ev.clientX, ev.clientY);
  });

  joyWrap.addEventListener('pointerup', () => {
    isJoyDragging = false;
    joyKnob.style.transform = 'translate(0px, 0px)';
    joyVec.x = 0;
    joyVec.y = 0;
  });
}

function setupMenuNavigation() {
  const menuBtn = $('menu3DBtn');
  const menuDrop = $('menu3DDrop');

  if (menuBtn && menuDrop) {
    menuBtn.onclick = () => {
      menuDrop.classList.toggle('open');
      sfxClick(600);
    };
  }

  document.querySelectorAll('.zone-jump-btn[data-zone]').forEach(btn => {
    btn.onclick = () => {
      const zoneKey = btn.dataset.zone;
      flyToZone(zoneKey);
    };
  });

  const directBtn = $('openDirectStudioBtn');
  if (directBtn) {
    directBtn.onclick = () => {
      if (menuDrop) menuDrop.classList.remove('open');
      if (onOpenStudioCallback) onOpenStudioCallback('free', 0, false);
    };
  }
}

export function flyToZone(zoneKey) {
  const menuDrop = $('menu3DDrop');
  if (menuDrop) menuDrop.classList.remove('open');

  const t = ZONE_TARGETS[zoneKey];
  if (!t || !camera) return;

  sfxClick(640);
  flyAnim = {
    startX: camera.position.x,
    startZ: camera.position.z,
    startYaw: camYaw,
    startPitch: camPitch,
    endX: t.x,
    endZ: t.z,
    endYaw: t.yaw,
    endPitch: t.pitch,
    progress: 0
  };
}

export function movePlayer(forwardDelta, strafeDelta) {
  if (!camera) return;
  const fx = -Math.sin(camYaw);
  const fz = -Math.cos(camYaw);
  const rx = Math.cos(camYaw);
  const rz = -Math.sin(camYaw);

  const nx = camera.position.x + fx * forwardDelta + rx * strafeDelta;
  const nz = camera.position.z + fz * forwardDelta + rz * strafeDelta;

  // Giới hạn va chạm trong phòng học
  camera.position.x = Math.max(-ROOM_W / 2 + 1.6, Math.min(ROOM_W / 2 - 1.6, nx));
  camera.position.z = Math.max(-ROOM_D / 2 + 1.6, Math.min(ROOM_D / 2 - 1.6, nz));
}

export function updateControls(dt) {
  if (!camera) return;

  // Cập nhật hoạt ảnh bay mượt mà đến khu vực
  if (flyAnim) {
    flyAnim.progress = Math.min(1, flyAnim.progress + dt * 0.0022);
    const t = 1 - Math.pow(1 - flyAnim.progress, 3); // Ease-out cubic
    camera.position.x = flyAnim.startX + (flyAnim.endX - flyAnim.startX) * t;
    camera.position.z = flyAnim.startZ + (flyAnim.endZ - flyAnim.startZ) * t;
    camYaw   = flyAnim.startYaw   + (flyAnim.endYaw   - flyAnim.startYaw) * t;
    camPitch = flyAnim.startPitch + (flyAnim.endPitch - flyAnim.startPitch) * t;
    if (flyAnim.progress >= 1) flyAnim = null;
  } else {
    // Di chuyển bằng bàn phím hoặc joystick ảo
    const spd = 0.0055 * dt;
    const fwd = (keys3D.w ? 1 : 0) - (keys3D.s ? 1 : 0) - joyVec.y;
    const str = (keys3D.d ? 1 : 0) - (keys3D.a ? 1 : 0) + joyVec.x;
    if (Math.abs(fwd) > 0.01 || Math.abs(str) > 0.01) {
      movePlayer(fwd * spd, str * spd);
    }
  }

  camera.rotation.order = 'YXZ';
  camera.rotation.y = camYaw;
  camera.rotation.x = camPitch;
}
