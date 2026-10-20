/* ==========================================================================
   js/main.js - Điểm khởi chạy (Entry Point) của Dự án Phòng Thí Nghiệm 3D
   Quản lý vòng lặp kết xuất kép, chuyển cảnh 3D <-> 2D & phân quyền khu vực
   ========================================================================== */

import { S, AppState } from './state.js';
import { initSceneManager, getScene, getCamera, getRenderer, detectedGPU } from './world3d/sceneManager.js?v=25';
import { buildClassroom, interactables3D, animatedElements3D } from './world3d/classroomBuilder.js?v=25';
import { buildOutdoorScenery, updateOutdoorScenery } from './world3d/outdoorScenery.js?v=25';
import { initControls3D, updateControls, flyToZone, registerControlsCallback } from './world3d/controls3d.js?v=25';

import { initRenderer2D, render2DFrame, resize2D, spawnBurst, getCanvasDimensions } from './studio2d/renderer2d.js';
import { initInteraction2D, getWireStartState, getMousePos, registerInteractionCallbacks } from './studio2d/interaction2d.js';
import {
  initUIEventListeners,
  say,
  sayThrottled,
  diagnoseAndSpeak,
  updateHUD,
  updateInspector,
  setReadOnlyMode,
  switchStudioMode,
  renderTaskCard
} from './studio2d/uiController2d.js';

import { registerSolverCallbacks, solveCircuit } from './physics/mnaSolver.js';
import { sfxClick } from './audio/soundEngine.js';
import { loadPresetCircuit } from './data/challenges.js';

const $ = id => document.getElementById(id);

export function openStudio(mode = 'free', presetIdx = null, readOnly = false) {
  AppState.inStudio = true;
  const hoverLbl = $('hoverLabel3D');
  if (hoverLbl) hoverLbl.style.display = 'none';

  const overlay = $('studioOverlay');
  if (overlay) overlay.classList.add('active');

  resize2D();
  setReadOnlyMode(readOnly);

  if (presetIdx !== null && presetIdx !== undefined) {
    S.presetIdx = presetIdx;
    const { W, H } = getCanvasDimensions();
    loadPresetCircuit(presetIdx, W, H, say);
  }

  switchStudioMode(mode);
}

export function closeStudio() {
  sfxClick(420);
  AppState.inStudio = false;
  const overlay = $('studioOverlay');
  if (overlay) overlay.classList.remove('active');
}

// Gắn các hàm điều khiển vào đối tượng window để hỗ trợ gọi từ UI hoặc debug console
window.openStudio = openStudio;
window.closeStudio = closeStudio;
window.flyToZone = flyToZone;

function initApp() {
  // 1. Khởi tạo Không gian Phòng học 3D (Three.js)
  const cv3d = $('cv3d');
  const { scene, camera, renderer } = initSceneManager(cv3d);

  // Dựng bối cảnh thiên nhiên ngoài cửa sổ
  buildOutdoorScenery(scene);

  // Dựng phòng học 3D với các ô cửa sổ kính thật & các bàn thí nghiệm
  buildClassroom(scene);

  // Khởi tạo hệ thống điều khiển camera 3D (chuột, phím, joystick, bay nhanh)
  initControls3D(camera, cv3d, interactables3D);
  registerControlsCallback(openStudio);

  // 2. Khởi tạo Bàn lắp mạch 2D (Canvas & tương tác)
  const cv2d = $('cv');
  initRenderer2D(cv2d);
  initInteraction2D(cv2d);
  registerInteractionCallbacks({ updateInspector });

  // Đăng ký các hook cho bộ giải MNA
  registerSolverCallbacks({
    updateUI: triggerFeedback => {
      if (triggerFeedback) diagnoseAndSpeak();
      updateHUD();
      updateInspector();
    },
    spawnBurst,
    sayMessage: say
  });

  // Khởi tạo các sự kiện giao diện 2D
  initUIEventListeners();

  const closeStudioBtn = $('closeStudioBtn');
  if (closeStudioBtn) {
    closeStudioBtn.onclick = closeStudio;
  }

  // Tải cấu hình mạch ban đầu và nhiệm vụ
  const { W, H } = getCanvasDimensions();
  loadPresetCircuit(0, W, H, null);
  renderTaskCard(true);

  // Hiển thị Card GPU rời đang hoạt động lên giao diện
  const gpuTxt = $('gpuNameTxt');
  if (gpuTxt) {
    let cleanName = detectedGPU;
    // Rút gọn chuỗi GPU cho gọn gàng đẹp mắt nếu quá dài
    cleanName = cleanName.replace(/ANGLE \(([^,]+), ([^,]+), .*\)/, '$2').replace('Direct3D11 vs_5_0 ps_5_0', '').trim();
    gpuTxt.textContent = '🎮 ' + cleanName + ' · 60 FPS';
  }

  // 3. Khởi động Vòng lặp Kết xuất Kép (Dual Render Loop) khống chế 60 FPS
  // Giúp GPU RTX 4060 chạy êm ái, CPU mát mẻ, không bị quá nhiệt trên màn hình gaming 144Hz/240Hz
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS; // 16.67ms
  let lastFrameTime = performance.now();
  let lastT = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);

    // Khi người dùng chuyển tab khác -> Dừng render để CPU và GPU nghỉ 0% tải
    if (document.hidden) return;

    // Giới hạn tốc độ khung hình ở mức 60 FPS ổn định
    const elapsed = now - lastFrameTime;
    if (elapsed < frameInterval - 1) return;
    lastFrameTime = now - (elapsed % frameInterval);

    const dt = Math.min(50, now - lastT);
    lastT = now;

    if (!AppState.inStudio) {
      // Cập nhật điều khiển góc nhìn và di chuyển người chơi
      updateControls(dt);

      // Cập nhật cây xanh đung đưa theo gió & mây trôi ngoài cửa sổ
      updateOutdoorScenery(now, dt);

      // Cập nhật hoạt ảnh học sinh thở và vẫy tay, robo nhấp nhô
      animatedElements3D.forEach(el => {
        if (el.update) el.update(now);
      });

      // Kết xuất đồ họa 3D bằng GPU rời RTX 4060
      renderer.render(scene, camera);
    } else {
      // Kết xuất đồ họa Bàn mạch 2D
      render2DFrame(now, dt, getWireStartState(), getMousePos());
    }
  }

  requestAnimationFrame(animate);
}

// Khởi chạy khi DOM đã sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
