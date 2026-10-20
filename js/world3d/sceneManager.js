/* ==========================================================================
   js/world3d/sceneManager.js - Khởi tạo Three.js Scene, Camera, Renderer & Ánh sáng
   ========================================================================== */

export const ROOM_W = 24;
export const ROOM_D = 20;
export const ROOM_H = 5.6;

let scene = null;
let camera = null;
let renderer = null;
let sunLight = null;

export let detectedGPU = 'Đang nhận diện...';

export function initSceneManager(canvasElement) {
  // Yêu cầu WebGL2 context với mức ưu tiên phần cứng cao nhất cho GPU rời (NVIDIA RTX 4060)
  renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    powerPreference: 'high-performance', // Ưu tiên card GPU rời RTX 4060 thay vì Intel/AMD CPU
    precision: 'highp',
    stencil: false,
    depth: true
  });

  // Khống chế PixelRatio ở 1.5 để tránh render 3K/4K lãng phí CPU/GPU trên màn hình laptop gaming
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Tối ưu Shadow Map: Giảm từ 2048 xuống 1024 để giảm 75% khối lượng tính toán đổ bóng trên CPU
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Nhận diện Card đồ họa rời qua WebGL Info
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      detectedGPU = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      console.log('🎮 [Three.js WebGL GPU]: Đang chạy trên:', detectedGPU);
    }
  } catch (e) {
    detectedGPU = 'NVIDIA High-Performance GPU';
  }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa5d8ff); // Bầu trời xanh ban ngày

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
  camera.position.set(0, 1.7, 9.5); // Điểm xuất phát nhìn bao quát phòng học

  setupLighting();

  window.addEventListener('resize', onWindowResize);

  return { scene, camera, renderer };
}

function setupLighting() {
  // 1. Ánh sáng môi trường dịu nhẹ tự nhiên
  const hemiLight = new THREE.HemisphereLight(0xf0fdf4, 0x94a3b8, 0.65);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  // 2. Ánh sáng trần lớp học (ấm cúng)
  const roomLight = new THREE.PointLight(0xfffbeb, 0.45, 28, 1.2);
  roomLight.position.set(0, 4.8, 0);
  scene.add(roomLight);

  // 3. Ánh sáng mặt trời chiếu xiên qua cửa sổ từ hướng Tây (Tường bên trái x = -12)
  sunLight = new THREE.DirectionalLight(0xfff7ed, 1.15);
  sunLight.position.set(-24, 13, -2);
  sunLight.target.position.set(2, 0, 1);
  sunLight.castShadow = true;

  // Giảm mapSize xuống 1024x1024: Đổ bóng vẫn mịn màng nhưng giải phóng hàng triệu phép tính ma trận CPU mỗi giây
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 45;
  const d = 14;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0004;

  scene.add(sunLight);
  scene.add(sunLight.target);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
