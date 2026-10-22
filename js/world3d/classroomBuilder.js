/* ==========================================================================
   js/world3d/classroomBuilder.js - Dựng phòng học 3D tươi sáng có các ô
                                    Cửa sổ kính thật nhìn ra thiên nhiên
   ========================================================================== */

import { ROOM_W, ROOM_D, ROOM_H, getCamera } from './sceneManager.js?v=32';
import { createStudentCharacter } from './characterFactory.js?v=32';

export const interactables3D = [];
export const animatedElements3D = [];
window.interactables3D = interactables3D;

export function buildClassroom(scene) {
  const roomGroup = new THREE.Group();

  // 1. Sàn gạch phòng học sáng bóng có phản quang nhẹ
  const floorMat = new THREE.MeshStandardMaterial({
    map: createFloorTileTexture(),
    roughness: 0.32,
    metalness: 0.08
  });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  roomGroup.add(floorMesh);

  // 2. Trần lớp học trắng sáng với các máng đèn huỳnh quang
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
  const ceilMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilMat);
  ceilMesh.rotation.x = Math.PI / 2;
  ceilMesh.position.y = ROOM_H;
  roomGroup.add(ceilMesh);

  // Các máng đèn trần phát sáng ấm
  createCeilingLamps(roomGroup);

  // 3. Tường phòng học sơn màu kem sáng ấm cúng kết hợp len chân tường gỗ
  const wallColor = 0xf5f3ee;
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });

  // Tường trước (Bắc: z = -ROOM_D / 2 = -10)
  const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  frontWall.position.set(0, ROOM_H / 2, -ROOM_D / 2);
  frontWall.receiveShadow = true;
  roomGroup.add(frontWall);

  // Tường sau (Nam: z = +ROOM_D / 2 = +10)
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  backWall.position.set(0, ROOM_H / 2, ROOM_D / 2);
  backWall.rotation.y = Math.PI;
  backWall.receiveShadow = true;
  roomGroup.add(backWall);

  // Tường phải (Đông: x = +ROOM_W / 2 = +12)
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  rightWall.position.set(ROOM_W / 2, ROOM_H / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  roomGroup.add(rightWall);

  // Len chân tường bằng gỗ chạy quanh phòng
  createBaseboards(roomGroup);

  // 4. BỨC TƯỜNG TRÁI CÓ CÁC Ô CỬA SỔ KÍNH THỰC SỰ (x = -ROOM_W / 2 = -12)
  // Xây dựng bằng các mảng tường rời để chừa 3 ô cửa sổ lớn nhìn thông ra sân trường
  buildWindowWall(roomGroup);

  // 5. Bảng đen giáo viên & khẩu hiệu lớp học
  buildBlackboard(roomGroup);

  // 6. Tủ trưng bày dụng cụ thí nghiệm phòng bộ môn
  buildLabCabinets(roomGroup);

  // 7. Dựng 3 Bàn Mạch Mẫu (Khu Xem Mạch Mẫu - Read-Only)
  buildSampleStations(roomGroup);

  // 8. Bàn Thực Hành Tự Do ở trung tâm phòng (Kèm bạn Robo 3D)
  buildCenterLabStation(roomGroup);

  // 9. Khu Thực Hành Bác Sĩ Mạch & Đo Đạc
  buildDoctorStation(roomGroup);

  // 10. Khu Ôn Tập & Ký Hiệu (Khối nút PLAY 3D màu vàng cam)
  buildQuizPlayButton(roomGroup);

  // 11. Nút PLAY Thử thách Đo & Lắp
  buildBuildPlayButton(roomGroup);

  scene.add(roomGroup);
}

function createFloorTileTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#fafaf9';
  ctx.fillRect(0, 0, 512, 512);

  // Đường ron gạch màu xám nhạt tinh tế
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 508);

  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 256); ctx.lineTo(512, 256);
  ctx.moveTo(256, 0); ctx.lineTo(256, 512);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 10);
  return tex;
}

function buildWindowWall(parentGroup) {
  const xPos = -ROOM_W / 2; // -12
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.85 });

  // 1. Mảng tường dưới bậu cửa sổ (từ y = 0 đến y = 1.15)
  const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.15, ROOM_D), wallMat);
  lowerWall.position.set(xPos, 0.575, 0);
  lowerWall.castShadow = true;
  lowerWall.receiveShadow = true;
  parentGroup.add(lowerWall);

  // Bệ bậu cửa sổ bằng gỗ nhô ra trong lớp học
  const sillWood = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.08, 16.5),
    new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6 })
  );
  sillWood.position.set(xPos + 0.1, 1.17, 0);
  sillWood.castShadow = true;
  parentGroup.add(sillWood);

  // 2. Mảng tường trên trần (từ y = 4.35 đến y = 5.6)
  const upperWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.25, ROOM_D), wallMat);
  upperWall.position.set(xPos, 4.975, 0);
  upperWall.castShadow = true;
  upperWall.receiveShadow = true;
  parentGroup.add(upperWall);

  // 3. Mảng tường góc ở hai đầu (z = -10 đến -8 và z = +8 đến +10)
  const leftEndWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 2.2), wallMat);
  leftEndWall.position.set(xPos, 2.75, -8.9);
  leftEndWall.castShadow = true;
  leftEndWall.receiveShadow = true;
  parentGroup.add(leftEndWall);

  const rightEndWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 2.2), wallMat);
  rightEndWall.position.set(xPos, 2.75, 8.9);
  rightEndWall.castShadow = true;
  rightEndWall.receiveShadow = true;
  parentGroup.add(rightEndWall);

  // 4. Các trụ tường ngăn giữa 3 ô cửa sổ lớn
  [-2.6, 2.6].forEach(zPillar => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.38, 3.2, 0.55), wallMat);
    pillar.position.set(xPos, 2.75, zPillar);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    parentGroup.add(pillar);
  });

  // 5. Lắp 3 khung cửa sổ kính trong suốt có nan chia ô
  const windowBays = [-5.2, 0, 5.2];
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.9,
    ior: 1.5
  });

  windowBays.forEach(zBay => {
    // Kính cửa sổ
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.1), glassMat);
    glass.position.set(xPos + 0.02, 2.75, zBay);
    glass.rotation.y = Math.PI / 2;
    parentGroup.add(glass);

    // Khung viền ngoài cửa sổ
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.7), frameMat);
    frameTop.position.set(xPos, 4.3, zBay);
    frameTop.castShadow = true;
    parentGroup.add(frameTop);

    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.7), frameMat);
    frameBottom.position.set(xPos, 1.22, zBay);
    frameBottom.castShadow = true;
    parentGroup.add(frameBottom);

    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.1, 0.12), frameMat);
    frameL.position.set(xPos, 2.75, zBay - 2.3);
    frameL.castShadow = true;
    parentGroup.add(frameL);

    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.1, 0.12), frameMat);
    frameR.position.set(xPos, 2.75, zBay + 2.3);
    frameR.castShadow = true;
    parentGroup.add(frameR);

    // Nan cửa sổ chia ô ngang và dọc tạo bóng đổ chân thực
    const mullionH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.6), frameMat);
    mullionH.position.set(xPos, 2.75, zBay);
    mullionH.castShadow = true;
    parentGroup.add(mullionH);

    [-1.15, 1.15].forEach(zM => {
      const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.0, 0.08), frameMat);
      mullionV.position.set(xPos, 2.75, zBay + zM);
      mullionV.castShadow = true;
      parentGroup.add(mullionV);
    });
  });
}

function createCeilingLamps(parentGroup) {
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
  const casingMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });

  [[-4, -3], [4, -3], [-4, 3], [4, 3]].forEach(([lx, lz]) => {
    const lampCasing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 4.5), casingMat);
    lampCasing.position.set(lx, ROOM_H - 0.05, lz);
    parentGroup.add(lampCasing);

    const lampBulb = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 4.2), lampMat);
    lampBulb.position.set(lx, ROOM_H - 0.09, lz);
    parentGroup.add(lampBulb);
  });
}

function createBaseboards(parentGroup) {
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  // Chân tường trước
  const bbFront = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.14, 0.06), woodMat);
  bbFront.position.set(0, 0.07, -ROOM_D / 2 + 0.03);
  parentGroup.add(bbFront);
  // Chân tường sau
  const bbBack = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.14, 0.06), woodMat);
  bbBack.position.set(0, 0.07, ROOM_D / 2 - 0.03);
  parentGroup.add(bbBack);
  // Chân tường phải
  const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, ROOM_D), woodMat);
  bbRight.position.set(ROOM_W / 2 - 0.03, 0.07, 0);
  parentGroup.add(bbRight);
}

function buildBlackboard(parentGroup) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Nền bảng xanh lá đậm trường học
  ctx.fillStyle = '#0f3a2a';
  ctx.fillRect(0, 0, 1024, 512);

  // Viền nhôm
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 1008, 496);

  // Nội dung bài học phấn trắng
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 36px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BÀI 22: MẠCH ĐIỆN ĐƠN GIẢN – ĐỊNH LUẬT OHM', 512, 70);

  ctx.font = '600 24px "Be Vietnam Pro", sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('1. Cường độ dòng điện: I = U / R (Đơn vị: Ampe - A)', 512, 130);
  ctx.fillText('2. Hiệu điện thế: U = I × R (Đơn vị: Vôn - V)', 512, 175);

  ctx.fillStyle = '#67e8f9';
  ctx.fillText('• Nối tiếp: I = I₁ = I₂  |  U = U₁ + U₂', 512, 235);
  ctx.fillText('• Song song: U = U₁ = U₂  |  I = I₁ + I₂', 512, 280);

  ctx.fillStyle = '#fca5a5';
  ctx.font = '700 22px "Be Vietnam Pro", sans-serif';
  ctx.fillText('⚠️ Chú ý: Ampe kế mắc NỐI TIẾP (R_A ≈ 0) · Vôn kế mắc SONG SONG', 512, 350);

  const tex = new THREE.CanvasTexture(c);
  const boardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6.8, 3.4),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })
  );
  boardMesh.position.set(0, 2.7, -ROOM_D / 2 + 0.05);
  boardMesh.castShadow = true;
  parentGroup.add(boardMesh);

  // Bàn giáo viên đặt trang trọng tại bục giảng ở góc trước bên trái (không che khuất Mẫu 2)
  const deskWood = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.9, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 })
  );
  deskWood.position.set(-8.8, 0.45, -8.8);
  deskWood.castShadow = true;
  deskWood.receiveShadow = true;
  parentGroup.add(deskWood);

  // Ghế tựa của giáo viên
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x572605, roughness: 0.75 });
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), chairMat);
  chairSeat.position.set(-8.8, 0.48, -9.55);
  chairSeat.castShadow = true;
  parentGroup.add(chairSeat);

  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, 0.06), chairMat);
  chairBack.position.set(-8.8, 0.74, -9.8);
  chairBack.castShadow = true;
  parentGroup.add(chairBack);

  // Laptop giáo viên trên bàn
  const laptopBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.02, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.25 })
  );
  laptopBase.position.set(-8.8, 0.91, -8.8);
  laptopBase.castShadow = true;
  parentGroup.add(laptopBase);

  const laptopScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.24, 0.015),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  laptopScreen.position.set(-8.8, 1.02, -8.93);
  laptopScreen.rotation.x = -0.25;
  laptopScreen.castShadow = true;
  parentGroup.add(laptopScreen);
}

function buildLabCabinets(parentGroup) {
  // Tủ kính đựng dụng cụ thí nghiệm ở góc tường trước bên phải
  const cabWood = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 3.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 })
  );
  cabWood.position.set(8.5, 1.6, -9.4);
  cabWood.castShadow = true;
  cabWood.receiveShadow = true;
  parentGroup.add(cabWood);
}

function createMeterFaceTexture(type = 'A', reading = '0.90 A') {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 320);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 312);

  // Meter Arc Scale
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 300, 200, Math.PI * 1.25, Math.PI * 1.75, false);
  ctx.stroke();

  // Tick marks
  for (let i = 0; i <= 10; i++) {
    const angle = Math.PI * 1.25 + (Math.PI * 0.5) * (i / 10);
    const r1 = i % 5 === 0 ? 175 : 185;
    const r2 = 200;
    const x1 = 256 + Math.cos(angle) * r1;
    const y1 = 300 + Math.sin(angle) * r1;
    const x2 = 256 + Math.cos(angle) * r2;
    const y2 = 300 + Math.sin(angle) * r2;
    ctx.lineWidth = i % 5 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Scale numbers
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 20px monospace';
  ctx.textAlign = 'center';
  if (type === 'A') {
    ctx.fillText('0', 115, 175);
    ctx.fillText('0.5', 256, 120);
    ctx.fillText('1.0 A', 390, 175);
  } else {
    ctx.fillText('0', 115, 175);
    ctx.fillText('6', 256, 120);
    ctx.fillText('12 V', 390, 175);
  }

  // Type Symbol (A in blue, V in red)
  ctx.font = '900 64px "Be Vietnam Pro", sans-serif';
  if (type === 'A') {
    ctx.fillStyle = '#0284c7';
    ctx.fillText('A', 256, 215);
    ctx.font = '700 18px "Be Vietnam Pro", sans-serif';
    ctx.fillText('AMPE KẾ (NỐI TIẾP)', 256, 245);
  } else {
    ctx.fillStyle = '#dc2626';
    ctx.fillText('V', 256, 215);
    ctx.font = '700 18px "Be Vietnam Pro", sans-serif';
    ctx.fillText('VÔN KẾ (SONG SONG)', 256, 245);
  }

  // Value Display Badge
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(176, 260, 160, 42, 8);
  ctx.fill();
  ctx.fillStyle = type === 'A' ? '#38bdf8' : '#f87171';
  ctx.font = '800 22px monospace';
  ctx.fillText(reading, 256, 290);

  // Red Indicator Needle
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.beginPath();
  let ratio = 0.5;
  if (reading.includes('0.9')) ratio = 0.9;
  else if (reading.includes('0.6')) ratio = 0.6;
  else if (reading.includes('1.8')) ratio = 0.9;
  else if (reading.includes('9.0')) ratio = 0.75;
  else if (reading.includes('12.0')) ratio = 1.0;
  else if (reading.includes('0.0')) ratio = 0.0;
  const needleAngle = Math.PI * 1.25 + (Math.PI * 0.5) * ratio;
  ctx.moveTo(256, 300);
  ctx.lineTo(256 + Math.cos(needleAngle) * 190, 300 + Math.sin(needleAngle) * 190);
  ctx.stroke();

  // Needle Pivot Cap
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(256, 300, 14, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(c);
}

function makeWallBoardTexture(title, subtitle, schemeType) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 620;
  const g2 = c.getContext('2d');

  // Nền bảng xanh phấn chuẩn trường học Việt Nam
  const grad = g2.createLinearGradient(0, 0, 0, 620);
  grad.addColorStop(0, '#0d3a2b');
  grad.addColorStop(1, '#08231a');
  g2.fillStyle = grad;
  g2.fillRect(0, 0, 1024, 620);

  // Khung viền gỗ bảng đen chắc chắn
  g2.strokeStyle = '#94a3b8';
  g2.lineWidth = 14;
  g2.strokeRect(7, 7, 1010, 606);

  // Tiêu đề bài học
  g2.fillStyle = '#fde047';
  g2.font = '800 34px "Be Vietnam Pro", sans-serif';
  g2.textAlign = 'center';
  g2.fillText(title, 512, 54);

  // Phụ đề mô tả
  g2.fillStyle = '#bae6fd';
  g2.font = '600 20px "Be Vietnam Pro", sans-serif';
  g2.fillText(subtitle, 512, 88);

  // --- HÀM VẼ CÁC KÝ HIỆU QUY ƯỚC MẠCH ĐIỆN CHUẨN KHTN THCS ---
  const drawBatterySym = (cx, cy, label = 'Pin 9V') => {
    // Cực dương: vạch dài mảnh
    g2.strokeStyle = '#ffffff';
    g2.lineWidth = 3.5;
    g2.beginPath();
    g2.moveTo(cx - 10, cy - 28);
    g2.lineTo(cx - 10, cy + 28);
    g2.stroke();

    // Cực âm: vạch ngắn dày
    g2.lineWidth = 8;
    g2.beginPath();
    g2.moveTo(cx + 10, cy - 15);
    g2.lineTo(cx + 10, cy + 15);
    g2.stroke();

    // Dấu + và -
    g2.fillStyle = '#ef4444';
    g2.font = '800 20px sans-serif';
    g2.fillText('+', cx - 24, cy - 10);
    g2.fillStyle = '#38bdf8';
    g2.fillText('−', cx + 26, cy - 10);

    // Nhãn Nguồn
    g2.fillStyle = '#fde047';
    g2.font = '700 18px "Be Vietnam Pro", sans-serif';
    g2.fillText(label, cx, cy - 36);
  };

  const drawSwitchSym = (cx, cy, isClosed = true, label = 'K (Đóng)') => {
    // 2 chốt tròn nhỏ
    g2.fillStyle = '#ffffff';
    g2.beginPath(); g2.arc(cx - 26, cy, 6, 0, Math.PI * 2); g2.fill();
    g2.beginPath(); g2.arc(cx + 26, cy, 6, 0, Math.PI * 2); g2.fill();

    // Cần gạt dao
    g2.strokeStyle = '#ffffff';
    g2.lineWidth = 4;
    g2.beginPath();
    if (isClosed) {
      g2.moveTo(cx - 26, cy);
      g2.lineTo(cx + 26, cy);
      g2.lineTo(cx + 38, cy - 14); // Tay gạt
    } else {
      g2.moveTo(cx - 26, cy);
      g2.lineTo(cx + 20, cy - 26); // Mở góc 40 độ
    }
    g2.stroke();

    g2.fillStyle = '#67e8f9';
    g2.font = '700 18px "Be Vietnam Pro", sans-serif';
    g2.fillText(label, cx, cy - 28);
  };

  const drawBulbSym = (cx, cy, label = 'Đ', isLit = true) => {
    // Vòng tròn bóng đèn
    g2.fillStyle = isLit ? 'rgba(254, 240, 138, 0.25)' : '#0f172a';
    g2.strokeStyle = '#38bdf8';
    g2.lineWidth = 4;
    g2.beginPath();
    g2.arc(cx, cy, 26, 0, Math.PI * 2);
    g2.fill();
    g2.stroke();

    // Ký hiệu chữ X chéo bên trong vòng tròn (Quy ước chuẩn SGK KHTN)
    g2.strokeStyle = isLit ? '#fde047' : '#ffffff';
    g2.lineWidth = 3.5;
    g2.beginPath();
    g2.moveTo(cx - 17, cy - 17); g2.lineTo(cx + 17, cy + 17);
    g2.moveTo(cx - 17, cy + 17); g2.lineTo(cx + 17, cy - 17);
    g2.stroke();

    // Nhãn bóng đèn
    g2.fillStyle = '#fde047';
    g2.font = '800 20px "Be Vietnam Pro", sans-serif';
    g2.fillText(label, cx, cy + 46);
  };

  const drawAmmeterSym = (cx, cy) => {
    g2.fillStyle = '#0f172a';
    g2.strokeStyle = '#38bdf8';
    g2.lineWidth = 4;
    g2.beginPath();
    g2.arc(cx, cy, 26, 0, Math.PI * 2);
    g2.fill();
    g2.stroke();

    g2.fillStyle = '#38bdf8';
    g2.font = '900 26px "Be Vietnam Pro", sans-serif';
    g2.fillText('A', cx, cy + 9);
    g2.fillStyle = '#94a3b8';
    g2.font = '700 15px "Be Vietnam Pro", sans-serif';
    g2.fillText('Ampe kế', cx, cy + 46);
  };

  const drawVoltmeterSym = (cx, cy, x1, y1, x2, y2) => {
    // Dây đo đứt nét mắc song song
    g2.strokeStyle = '#ef4444';
    g2.lineWidth = 2.5;
    g2.setLineDash([6, 6]);
    g2.beginPath();
    g2.moveTo(x1, y1);
    g2.lineTo(x1, cy);
    g2.lineTo(cx - 26, cy);
    g2.stroke();

    g2.strokeStyle = '#38bdf8';
    g2.beginPath();
    g2.moveTo(x2, y2);
    g2.lineTo(x2, cy);
    g2.lineTo(cx + 26, cy);
    g2.stroke();
    g2.setLineDash([]); // Trả về nét liền

    // Điểm tiếp xúc que đo
    g2.fillStyle = '#ef4444';
    g2.beginPath(); g2.arc(x1, y1, 5, 0, Math.PI * 2); g2.fill();
    g2.fillStyle = '#38bdf8';
    g2.beginPath(); g2.arc(x2, y2, 5, 0, Math.PI * 2); g2.fill();

    // Vòng tròn Vôn kế
    g2.fillStyle = '#0f172a';
    g2.strokeStyle = '#f43f5e';
    g2.lineWidth = 4;
    g2.beginPath();
    g2.arc(cx, cy, 26, 0, Math.PI * 2);
    g2.fill();
    g2.stroke();

    g2.fillStyle = '#f43f5e';
    g2.font = '900 26px "Be Vietnam Pro", sans-serif';
    g2.fillText('V', cx, cy + 9);
    g2.fillStyle = '#fca5a5';
    g2.font = '700 15px "Be Vietnam Pro", sans-serif';
    g2.fillText('Vôn kế', cx, cy + 46);
  };

  const drawArrow = (x, y, angle) => {
    g2.save();
    g2.translate(x, y);
    g2.rotate(angle);
    g2.fillStyle = '#f59e0b';
    g2.beginPath();
    g2.moveTo(8, 0);
    g2.lineTo(-8, -6);
    g2.lineTo(-8, 6);
    g2.closePath();
    g2.fill();
    g2.restore();
  };

  // DÂY MẠCH ĐIỆN NÉT CHÍNH
  g2.strokeStyle = '#38bdf8';
  g2.lineWidth = 4;

  if (schemeType === 'sample1') {
    // MẪU 1: MẠCH ĐƠN
    const xL = 200, xR = 824, yT = 160, yB = 390;
    // Dây khung ngoài
    g2.beginPath();
    // Cạnh trên (Pin ở giữa, Khóa K bên phải)
    g2.moveTo(xL, yT); g2.lineTo(395, yT);
    g2.moveTo(485, yT); g2.lineTo(620, yT);
    g2.moveTo(706, yT); g2.lineTo(xR, yT);
    // Cạnh phải
    g2.lineTo(xR, yB);
    // Cạnh dưới (Ampe kế bên phải, Đèn bên trái)
    g2.lineTo(726, yB);
    g2.moveTo(674, yB); g2.lineTo(538, yB);
    g2.moveTo(482, yB); g2.lineTo(xL, yB);
    // Cạnh trái
    g2.lineTo(xL, yT);
    g2.stroke();

    // Linh kiện quy ước chuẩn
    drawBatterySym(440, yT, 'Pin 9V');
    drawSwitchSym(663, yT, true, 'Khóa K (Đóng)');
    drawAmmeterSym(700, yB);
    drawBulbSym(510, yB, 'Đèn Đ (Sáng 9V)', true);
    drawVoltmeterSym(510, 480, 482, yB, 538, yB);

    // Mũi tên chiều dòng điện I từ cực dương (+) qua tải về cực âm (-)
    drawArrow(200, 275, -Math.PI / 2);
    drawArrow(550, yT, 0);
    drawArrow(xR, 275, Math.PI / 2);
    drawArrow(600, yB, Math.PI);

    // Chú thích quy ước chuẩn SGK KHTN
    g2.fillStyle = '#67e8f9';
    g2.font = '700 17px "Be Vietnam Pro", sans-serif';
    g2.fillText(' Quy ước: (+) Vạch dài mảnh | (−) Vạch ngắn đậm | (X) Bóng đèn | (A) Ampe kế nối tiếp | (V) Vôn kế song song', 512, 535);

  } else if (schemeType === 'sample2') {
    // MẪU 2: HAI ĐÈN NỐI TIẾP
    const xL = 180, xR = 844, yT = 160, yB = 390;
    g2.beginPath();
    g2.moveTo(xL, yT); g2.lineTo(395, yT);
    g2.moveTo(485, yT); g2.lineTo(620, yT);
    g2.moveTo(706, yT); g2.lineTo(xR, yT);
    g2.lineTo(xR, yB);
    g2.lineTo(756, yB);
    g2.moveTo(704, yB); g2.lineTo(606, yB);
    g2.moveTo(554, yB); g2.lineTo(406, yB);
    g2.moveTo(354, yB); g2.lineTo(xL, yB);
    g2.lineTo(xL, yT);
    g2.stroke();

    drawBatterySym(440, yT, 'Pin 12V');
    drawSwitchSym(663, yT, true, 'Khóa K (Đóng)');
    drawAmmeterSym(730, yB);
    drawBulbSym(580, yB, 'Đ₂ (6V)', true);
    drawBulbSym(380, yB, 'Đ₁ (6V)', true);
    drawVoltmeterSym(480, 480, 354, yB, 606, yB);

    drawArrow(xL, 275, -Math.PI / 2);
    drawArrow(550, yT, 0);
    drawArrow(xR, 275, Math.PI / 2);
    drawArrow(650, yB, Math.PI);

    g2.fillStyle = '#67e8f9';
    g2.font = '700 17px "Be Vietnam Pro", sans-serif';
    g2.fillText('• Định luật nối tiếp: I = I₁ = I₂ (bằng nhau qua mọi linh kiện) · U = U₁ + U₂ = 6V + 6V = 12V', 512, 535);

  } else if (schemeType === 'sample3') {
    // MẪU 3: HAI ĐÈN SONG SONG
    const xL = 200, xR = 824, yT = 140, yM = 270, yB = 390;
    // Mạch chính trên
    g2.beginPath();
    g2.moveTo(xL, yT); g2.lineTo(395, yT);
    g2.moveTo(485, yT); g2.lineTo(620, yT);
    g2.moveTo(706, yT); g2.lineTo(xR, yT);
    g2.lineTo(xR, yM);
    // Nhánh 1 (yM = 270)
    g2.lineTo(540, yM);
    g2.moveTo(480, yM); g2.lineTo(xL, yM);
    // Nhánh 2 (yB = 390)
    g2.moveTo(xR, yM); g2.lineTo(xR, yB); g2.lineTo(540, yB);
    g2.moveTo(480, yB); g2.lineTo(xL, yB); g2.lineTo(xL, yM);
    // Dây về nguồn
    g2.lineTo(xL, yT);
    g2.stroke();

    // 2 Nút phân nhánh mạch song song
    g2.fillStyle = '#38bdf8';
    g2.beginPath(); g2.arc(xL, yM, 7, 0, Math.PI * 2); g2.fill();
    g2.beginPath(); g2.arc(xR, yM, 7, 0, Math.PI * 2); g2.fill();

    drawBatterySym(440, yT, 'Pin 9V');
    drawSwitchSym(663, yT, true, 'Khóa K (Đóng)');
    drawBulbSym(510, yM, 'Đèn Đ₁ (Sáng 9V)', true);
    drawBulbSym(510, yB, 'Đèn Đ₂ (Sáng 9V)', true);
    drawVoltmeterSym(310, 480, xL, yM, xR, yM);

    drawArrow(xL, 205, -Math.PI / 2);
    drawArrow(550, yT, 0);
    drawArrow(650, yM, Math.PI);
    drawArrow(650, yB, Math.PI);

    g2.fillStyle = '#67e8f9';
    g2.font = '700 17px "Be Vietnam Pro", sans-serif';
    g2.fillText('• Định luật song song: U = U₁ = U₂ = 9V (hai đèn nhận đủ áp nguồn) · Dòng điện chính I = I₁ + I₂', 512, 535);

  } else if (schemeType === 'doctor') {
    // BÁC SĨ MẠCH
    const xL = 200, xR = 824, yT = 160, yB = 390;
    g2.strokeStyle = '#f87171';
    g2.beginPath();
    g2.moveTo(xL, yT); g2.lineTo(395, yT);
    g2.moveTo(485, yT); g2.lineTo(620, yT);
    g2.moveTo(706, yT); g2.lineTo(xR, yT);
    g2.lineTo(xR, yB);
    g2.lineTo(726, yB);
    g2.moveTo(674, yB); g2.lineTo(538, yB);
    g2.moveTo(482, yB); g2.lineTo(xL, yB);
    g2.lineTo(xL, yT);
    g2.stroke();

    drawBatterySym(440, yT, 'Pin 9V');
    drawSwitchSym(663, yT, true, 'Khóa K (Đóng)');
    drawAmmeterSym(700, yB);
    drawBulbSym(510, yB, 'Đèn HỎNG (Tắt)', false);
    drawVoltmeterSym(510, 480, 482, yB, 538, yB);

    g2.fillStyle = '#f87171';
    g2.font = '800 24px "Be Vietnam Pro", sans-serif';
    g2.fillText('⚡ BÁC SĨ MẠCH: DÙNG QUE ĐO VÔN KẾ TÌM ĐIỂM HỞ MẠCH / ĐỨT DÂY TÓC', 512, 275);

    g2.fillStyle = '#fef08a';
    g2.font = '700 17px "Be Vietnam Pro", sans-serif';
    g2.fillText('• Gợi ý chẩn đoán: Nếu Vôn kế chỉ 9V nhưng đèn không sáng -> Dây tóc đèn bị đứt!', 512, 535);
  }

  // Nút hành động BẤM ĐỂ THỰC HÀNH
  const btnGrad = g2.createLinearGradient(340, 560, 684, 605);
  btnGrad.addColorStop(0, '#f59e0b');
  btnGrad.addColorStop(1, '#d97706');
  g2.fillStyle = btnGrad;
  g2.beginPath();
  g2.roundRect(340, 560, 344, 44, 22);
  g2.fill();
  g2.strokeStyle = '#fef08a';
  g2.lineWidth = 3;
  g2.stroke();

  g2.fillStyle = '#0f172a';
  g2.font = '900 20px "Be Vietnam Pro", sans-serif';
  g2.fillText('▶ NHẤP VÀO BÀN ĐỂ THỰC HÀNH', 512, 590);

  return new THREE.CanvasTexture(c);
}

// ==================== CÁC HÀM DỰNG MÔ HÌNH VẬT LÝ 3D TRÊN BÀN THÍ NGHIỆM ====================

function build3DBatteryPack(voltage = '9V') {
  const batGroup = new THREE.Group();

  // Khay đế pin bằng nhựa cách điện màu đen
  const holderMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const holder = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.22), holderMat);
  holder.position.y = 0.04;
  holder.castShadow = true;
  batGroup.add(holder);

  // Thân khối pin 9V bọc decal xanh kim loại
  const cellMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.25 });
  const cell = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.18), cellMat);
  cell.position.y = 0.12;
  cell.castShadow = true;
  batGroup.add(cell);

  // Dải tem màu vàng trên pin
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.324, 0.05, 0.184),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 })
  );
  stripe.position.y = 0.12;
  batGroup.add(stripe);

  // Hai cực pin kim loại
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.95, roughness: 0.15 });

  // Cực dương (+) bát giác có viền đỏ
  const posCap = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.04, 8), metalMat);
  posCap.position.set(-0.08, 0.22, 0);
  batGroup.add(posCap);
  const posRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
  posRing.rotation.x = Math.PI / 2;
  posRing.position.set(-0.08, 0.205, 0);
  batGroup.add(posRing);

  // Cực âm (-) lò xo đĩa có viền đen
  const negCap = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 16), metalMat);
  negCap.position.set(0.08, 0.215, 0);
  batGroup.add(negCap);
  const negRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 8, 16), new THREE.MeshBasicMaterial({ color: 0x18181b }));
  negRing.rotation.x = Math.PI / 2;
  negRing.position.set(0.08, 0.205, 0);
  batGroup.add(negRing);

  return batGroup;
}

function build3DKnifeSwitch(isClosed = true) {
  const swGroup = new THREE.Group();

  // Đế sứ / nhựa cách điện
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x3f2e1e, roughness: 0.65 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.035, 0.16), baseMat);
  base.position.y = 0.0175;
  base.castShadow = true;
  swGroup.add(base);

  // 2 trụ tiếp điểm bằng đồng thau
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
  const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 16), brassMat);
  post1.position.set(-0.09, 0.065, 0);
  swGroup.add(post1);

  const post2 = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 16), brassMat);
  post2.position.set(0.09, 0.065, 0);
  swGroup.add(post2);

  // Ngàm kẹp đàn hồi trụ bên phải
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.04, 0.03), brassMat);
  clip.position.set(0.09, 0.085, 0);
  swGroup.add(clip);

  // Cần gạt dao (Knife blade)
  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(-0.09, 0.085, 0);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.012, 0.018), brassMat);
  blade.position.x = 0.09;
  bladeGroup.add(blade);

  // Cán nắm cách điện màu đỏ
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.06, 12),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0.20, 0, 0);
  bladeGroup.add(handle);

  if (!isClosed) {
    bladeGroup.rotation.z = 0.65; // Mở cần gạt
  }
  swGroup.add(bladeGroup);

  return swGroup;
}

function build3DLightBulb(label = 'Đ', isLit = true, intensity = 1.0) {
  const bulbGroup = new THREE.Group();

  // Đế đui đèn tròn bằng nhựa/sứ màu trắng kem
  const socketMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.045, 28), socketMat);
  socket.position.y = 0.0225;
  socket.castShadow = true;
  bulbGroup.add(socket);

  // 2 ốc vít kim loại bằng đồng thau kẹp dây ở hai bên
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.2 });
  [-0.11, 0.11].forEach(sx => {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 12), brassMat);
    screw.position.set(sx, 0.05, 0);
    bulbGroup.add(screw);
  });

  // Cổ đui xoáy kim loại có ren
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 18), brassMat);
  collar.position.y = 0.065;
  bulbGroup.add(collar);

  // Bóng đèn thủy tinh tròn
  let glassMat;
  if (isLit) {
    glassMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfde047,
      emissiveIntensity: 1.25 * intensity,
      roughness: 0.12,
      metalness: 0.05
    });
  } else {
    glassMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.2
    });
  }

  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 24), glassMat);
  glass.position.y = 0.17;
  bulbGroup.add(glass);

  // Dây tóc vonfram bên trong
  const filMat = new THREE.MeshBasicMaterial({ color: isLit ? 0xffffff : 0x475569 });
  const filRing = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), filMat);
  filRing.position.y = 0.165;
  bulbGroup.add(filRing);

  // Ánh sáng tỏa ấm áp nếu bóng đèn đang sáng
  if (isLit) {
    const bulbLight = new THREE.PointLight(0xfef08a, 0.9 * intensity, 3.0, 1.4);
    bulbLight.position.set(0, 0.22, 0);
    bulbGroup.add(bulbLight);
  }

  return bulbGroup;
}

function build3DMeter(type = 'A', reading = '0.90 A') {
  const meterGroup = new THREE.Group();

  // Thân máy đo phòng lab dốc nghiêng
  const caseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.20), caseMat);
  body.position.y = 0.08;
  body.castShadow = true;
  meterGroup.add(body);

  // Mặt đồng hồ nghiêng vát góc 35 độ
  const dial = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.14),
    new THREE.MeshBasicMaterial({ map: createMeterFaceTexture(type, reading) })
  );
  dial.rotation.x = -Math.PI / 4;
  dial.position.set(0, 0.13, 0.04);
  meterGroup.add(dial);

  // 3 Cọc cắm dây (1 Đen, 2 Đỏ)
  const postBlack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: 0x18181b })
  );
  postBlack.rotation.x = Math.PI / 2;
  postBlack.position.set(-0.07, 0.04, 0.105);
  meterGroup.add(postBlack);

  [0, 0.07].forEach(px => {
    const postRed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.03, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    postRed.rotation.x = Math.PI / 2;
    postRed.position.set(px, 0.04, 0.105);
    meterGroup.add(postRed);
  });

  return meterGroup;
}

function build3DWireCurve(p1, p2, color = 0xef4444, archY = 0.03) {
  const midX = (p1.x + p2.x) / 2;
  const midZ = (p1.z + p2.z) / 2;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(p1.x, p1.y, p1.z),
    new THREE.Vector3(midX, Math.max(p1.y, p2.y) + archY, midZ),
    new THREE.Vector3(p2.x, p2.y, p2.z)
  ]);
  const tubeGeo = new THREE.TubeGeometry(curve, 18, 0.008, 8, false);
  const wireMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35 });
  const wire = new THREE.Mesh(tubeGeo, wireMat);
  wire.castShadow = true;
  return wire;
}

function createExperimentStation({ x, z, rotY, title, subtitle, schemeType, actionData, studentShirt, studentGender = 'male' }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  // 1. Bàn gỗ thí nghiệm chắc chắn
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xb46934, roughness: 0.7 });
  const topMesh = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 1.1), woodMat);
  topMesh.position.y = 0.95;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  const legGeo = new THREE.BoxGeometry(0.1, 0.95, 0.1);
  [[-1.0, -0.42], [1.0, -0.42], [-1.0, 0.42], [1.0, 0.42]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, 0.475, lz);
    leg.castShadow = true;
    leg.receiveShadow = true;
    group.add(leg);
  });

  // 2. PHỤC DỰNG ĐẦY ĐỦ MÔ HÌNH VẬT LÝ 3D TRÊN MẶT BÀN (Pin 3D, Đèn 3D, Khóa K 3D, Đồng hồ 3D, Dây nối 3D)
  const tableY = 1.0; // Mặt bàn ở y = 1.0

  if (schemeType === 'sample1') {
    // MẪU 1: PIN 9V + KHÓA K + AMPE KẾ + ĐÈN Đ + VÔN KẾ ĐO ĐÈN
    const bat = build3DBatteryPack('9V');
    bat.position.set(-0.65, tableY, -0.15);
    group.add(bat);

    const sw = build3DKnifeSwitch(true);
    sw.position.set(-0.15, tableY, -0.22);
    group.add(sw);

    const am = build3DMeter('A', '0.90 A');
    am.position.set(0.48, tableY, -0.20);
    group.add(am);

    const bulb = build3DLightBulb('Đ', true, 1.0);
    bulb.position.set(0.38, tableY, 0.22);
    group.add(bulb);

    const vm = build3DMeter('V', '9.0 V');
    vm.position.set(-0.35, tableY, 0.22);
    group.add(vm);

    // Dây dẫn nối mạch 3D
    // Dây Đỏ: Cực dương Pin -> Khóa K
    group.add(build3DWireCurve({ x: -0.73, y: tableY + 0.22, z: -0.15 }, { x: -0.24, y: tableY + 0.065, z: -0.22 }, 0xef4444));
    // Dây Đỏ: Khóa K -> Cực dương Ampe kế
    group.add(build3DWireCurve({ x: -0.06, y: tableY + 0.065, z: -0.22 }, { x: 0.48, y: tableY + 0.04, z: -0.10 }, 0xef4444));
    // Dây Vàng: Cực âm Ampe kế -> Đui đèn (ốc 1)
    group.add(build3DWireCurve({ x: 0.41, y: tableY + 0.04, z: -0.10 }, { x: 0.27, y: tableY + 0.05, z: 0.22 }, 0xfacc15));
    // Dây Đen: Đui đèn (ốc 2) -> Cực âm Pin
    group.add(build3DWireCurve({ x: 0.49, y: tableY + 0.05, z: 0.22 }, { x: -0.57, y: tableY + 0.215, z: -0.15 }, 0x18181b, 0.06));
    // 2 Que đo Vôn kế nối song song với 2 ốc đui đèn
    group.add(build3DWireCurve({ x: -0.35, y: tableY + 0.04, z: 0.32 }, { x: 0.27, y: tableY + 0.05, z: 0.22 }, 0xef4444, 0.02));
    group.add(build3DWireCurve({ x: -0.42, y: tableY + 0.04, z: 0.32 }, { x: 0.49, y: tableY + 0.05, z: 0.22 }, 0x18181b, 0.03));

  } else if (schemeType === 'sample2') {
    // MẪU 2: PIN 12V + KHÓA K + 2 BÓNG ĐÈN NỐI TIẾP (MỖI ĐÈN 6V)
    const bat = build3DBatteryPack('12V');
    bat.position.set(-0.70, tableY, -0.15);
    group.add(bat);

    const sw = build3DKnifeSwitch(true);
    sw.position.set(-0.20, tableY, -0.22);
    group.add(sw);

    const am = build3DMeter('A', '0.60 A');
    am.position.set(0.55, tableY, -0.20);
    group.add(am);

    const bulb1 = build3DLightBulb('Đ₁', true, 0.75);
    bulb1.position.set(0.05, tableY, 0.22);
    group.add(bulb1);

    const bulb2 = build3DLightBulb('Đ₂', true, 0.75);
    bulb2.position.set(0.52, tableY, 0.22);
    group.add(bulb2);

    const vm = build3DMeter('V', '12.0 V');
    vm.position.set(-0.45, tableY, 0.22);
    group.add(vm);

    // Dây nối mạch nối tiếp
    group.add(build3DWireCurve({ x: -0.78, y: tableY + 0.22, z: -0.15 }, { x: -0.29, y: tableY + 0.065, z: -0.22 }, 0xef4444));
    group.add(build3DWireCurve({ x: -0.11, y: tableY + 0.065, z: -0.22 }, { x: 0.55, y: tableY + 0.04, z: -0.10 }, 0xef4444));
    group.add(build3DWireCurve({ x: 0.48, y: tableY + 0.04, z: -0.10 }, { x: 0.63, y: tableY + 0.05, z: 0.22 }, 0xfacc15));
    // Dây nối giữa 2 đèn Đ₂ và Đ₁
    group.add(build3DWireCurve({ x: 0.41, y: tableY + 0.05, z: 0.22 }, { x: 0.16, y: tableY + 0.05, z: 0.22 }, 0x3b82f6));
    // Dây từ Đèn 1 về cực âm Pin
    group.add(build3DWireCurve({ x: -0.06, y: tableY + 0.05, z: 0.22 }, { x: -0.62, y: tableY + 0.215, z: -0.15 }, 0x18181b));
    // Dây đo Vôn kế toàn mạch
    group.add(build3DWireCurve({ x: -0.45, y: tableY + 0.04, z: 0.32 }, { x: 0.63, y: tableY + 0.05, z: 0.22 }, 0xef4444, 0.04));
    group.add(build3DWireCurve({ x: -0.52, y: tableY + 0.04, z: 0.32 }, { x: -0.06, y: tableY + 0.05, z: 0.22 }, 0x18181b, 0.04));

  } else if (schemeType === 'sample3') {
    // MẪU 3: PIN 9V + KHÓA K + 2 BÓNG ĐÈN SONG SONG (CÙNG NHẬN ĐỦ 9V)
    const bat = build3DBatteryPack('9V');
    bat.position.set(-0.70, tableY, -0.15);
    group.add(bat);

    const sw = build3DKnifeSwitch(true);
    sw.position.set(-0.20, tableY, -0.22);
    group.add(sw);

    const am = build3DMeter('A', '1.80 A');
    am.position.set(0.55, tableY, -0.22);
    group.add(am);

    // 2 Đèn đặt song song (1 Đèn trước, 1 Đèn sau)
    const bulb1 = build3DLightBulb('Đ₁', true, 1.1);
    bulb1.position.set(0.18, tableY, 0.05);
    group.add(bulb1);

    const bulb2 = build3DLightBulb('Đ₂', true, 1.1);
    bulb2.position.set(0.18, tableY, 0.35);
    group.add(bulb2);

    const vm = build3DMeter('V', '9.0 V');
    vm.position.set(-0.45, tableY, 0.22);
    group.add(vm);

    // Dây mạch chính
    group.add(build3DWireCurve({ x: -0.78, y: tableY + 0.22, z: -0.15 }, { x: -0.29, y: tableY + 0.065, z: -0.22 }, 0xef4444));
    group.add(build3DWireCurve({ x: -0.11, y: tableY + 0.065, z: -0.22 }, { x: 0.55, y: tableY + 0.04, z: -0.12 }, 0xef4444));
    // Dây rẽ nhánh song song vào Đèn 1 & Đèn 2
    group.add(build3DWireCurve({ x: 0.48, y: tableY + 0.04, z: -0.12 }, { x: 0.29, y: tableY + 0.05, z: 0.05 }, 0xfacc15));
    group.add(build3DWireCurve({ x: 0.29, y: tableY + 0.05, z: 0.05 }, { x: 0.29, y: tableY + 0.05, z: 0.35 }, 0xfacc15));
    // Dây nối về nút âm và Pin
    group.add(build3DWireCurve({ x: 0.07, y: tableY + 0.05, z: 0.35 }, { x: 0.07, y: tableY + 0.05, z: 0.05 }, 0x18181b));
    group.add(build3DWireCurve({ x: 0.07, y: tableY + 0.05, z: 0.05 }, { x: -0.62, y: tableY + 0.215, z: -0.15 }, 0x18181b));
    // Que đo Vôn kế kẹp 2 nút chung
    group.add(build3DWireCurve({ x: -0.45, y: tableY + 0.04, z: 0.32 }, { x: 0.29, y: tableY + 0.05, z: 0.35 }, 0xef4444, 0.03));
    group.add(build3DWireCurve({ x: -0.52, y: tableY + 0.04, z: 0.32 }, { x: 0.07, y: tableY + 0.05, z: 0.35 }, 0x18181b, 0.03));

  } else if (schemeType === 'doctor') {
    // BÁC SĨ MẠCH: MẠCH CÓ LỖI (ĐÈN HỎNG DÂY TÓC) ĐỂ KHÁM VÀ SỬA
    const bat = build3DBatteryPack('9V');
    bat.position.set(-0.65, tableY, -0.15);
    group.add(bat);

    const sw = build3DKnifeSwitch(true);
    sw.position.set(-0.15, tableY, -0.22);
    group.add(sw);

    const am = build3DMeter('A', '0.00 A');
    am.position.set(0.48, tableY, -0.20);
    group.add(am);

    // Đèn bị cháy không sáng (isLit = false)
    const bulb = build3DLightBulb('Đ (Lỗi)', false, 0);
    bulb.position.set(0.38, tableY, 0.22);
    group.add(bulb);

    const vm = build3DMeter('V', '9.0 V');
    vm.position.set(-0.35, tableY, 0.22);
    group.add(vm);

    group.add(build3DWireCurve({ x: -0.73, y: tableY + 0.22, z: -0.15 }, { x: -0.24, y: tableY + 0.065, z: -0.22 }, 0xef4444));
    group.add(build3DWireCurve({ x: -0.06, y: tableY + 0.065, z: -0.22 }, { x: 0.48, y: tableY + 0.04, z: -0.10 }, 0xef4444));
    group.add(build3DWireCurve({ x: 0.41, y: tableY + 0.04, z: -0.10 }, { x: 0.27, y: tableY + 0.05, z: 0.22 }, 0xfacc15));
    group.add(build3DWireCurve({ x: 0.49, y: tableY + 0.05, z: 0.22 }, { x: -0.57, y: tableY + 0.215, z: -0.15 }, 0x18181b, 0.06));
    group.add(build3DWireCurve({ x: -0.35, y: tableY + 0.04, z: 0.32 }, { x: 0.27, y: tableY + 0.05, z: 0.22 }, 0xef4444, 0.02));
    group.add(build3DWireCurve({ x: -0.42, y: tableY + 0.04, z: 0.32 }, { x: 0.49, y: tableY + 0.05, z: 0.22 }, 0x18181b, 0.03));
  }

  // 3. Nhân vật Học sinh 3D chi tiết cao chuẩn THCS (Chiều cao chuẩn 1.88m có khăn quàng đỏ)
  const student = createStudentCharacter({
    scale: 1.88,
    shirtColor: studentShirt,
    gender: studentGender
  });
  student.position.set(-1.52, 0, 0.25);
  student.rotation.y = 0.35;
  group.add(student);
  animatedElements3D.push(student);

  // 4. Màn hình bảng đen treo trên tường với Ký hiệu quy ước mạch điện chuẩn
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 2.30),
    new THREE.MeshBasicMaterial({ map: makeWallBoardTexture(title, subtitle, schemeType) })
  );
  screenMesh.position.set(0, 2.55, -1.75);
  group.add(screenMesh);

  // Gắn hành động bấm chuột mở Bàn Lắp Mạch 2D tương ứng
  topMesh.userData = actionData;
  screenMesh.userData = actionData;
  interactables3D.push(topMesh, screenMesh);

  return group;
}

function makeWallTextSign(mainText, subText, width = 4.2, height = 1.2) {
  const c = document.createElement('canvas');
  c.width = 1536;
  c.height = 384;
  const g2 = c.getContext('2d');

  // Nền thẻ bảng màu tối bán trong suốt (Glassmorphism Dark) giúp chữ nổi bật tuyệt đối
  g2.fillStyle = 'rgba(15, 23, 42, 0.88)';
  g2.beginPath();
  g2.roundRect(16, 16, 1504, 352, 32);
  g2.fill();
  g2.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  g2.lineWidth = 5;
  g2.stroke();

  // Tiêu đề chính: Tự động đo độ dài và co dãn font size, cam kết không bao giờ bị cắt chữ
  let mainFontSize = 64;
  g2.font = `800 ${mainFontSize}px "Be Vietnam Pro", sans-serif`;
  while (g2.measureText(mainText).width > 1400 && mainFontSize > 32) {
    mainFontSize -= 4;
    g2.font = `800 ${mainFontSize}px "Be Vietnam Pro", sans-serif`;
  }
  g2.fillStyle = '#ffffff';
  g2.textAlign = 'center';
  g2.shadowColor = 'rgba(0, 0, 0, 0.65)';
  g2.shadowBlur = 10;
  g2.fillText(mainText, 768, subText ? 155 : 210);

  // Phụ đề mô tả: Tự động co dãn vừa khít khung
  if (subText) {
    let subFontSize = 34;
    g2.font = `600 ${subFontSize}px "Be Vietnam Pro", sans-serif`;
    while (g2.measureText(subText).width > 1400 && subFontSize > 20) {
      subFontSize -= 2;
      g2.font = `600 ${subFontSize}px "Be Vietnam Pro", sans-serif`;
    }
    g2.fillStyle = '#fef08a';
    g2.fillText(subText, 768, 260);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}

function buildSampleStations(parentGroup) {
  // MẪU 1: MẠCH ĐIỆN ĐƠN (Gần tường trái cửa sổ)
  const st1 = createExperimentStation({
    x: -9.5, z: -1.5, rotY: Math.PI / 2,
    title: 'MẪU 1: MẠCH ĐIỆN ĐƠN',
    subtitle: 'Pin 9V + Khóa K + Đèn tròn + Vôn kế',
    schemeType: 'sample1',
    studentShirt: 0xffffff, // Áo trắng đồng phục
    studentGender: 'male',
    actionData: {
      label: '👁️ Xem Mạch Mẫu 1 (Mạch đơn – Chỉ quan sát & Đo thử)',
      mode: 'free',
      preset: 0,
      readOnly: true
    }
  });
  parentGroup.add(st1);

  // MẪU 2: HAI ĐÈN MẮC NỐI TIẾP
  const st2 = createExperimentStation({
    x: -4.2, z: -7.8, rotY: 0,
    title: 'MẪU 2: HAI ĐÈN MẮC NỐI TIẾP',
    subtitle: 'Cường độ dòng điện I bằng nhau · U chia đều',
    schemeType: 'sample2',
    studentShirt: 0xffffff,
    studentGender: 'female',
    actionData: {
      label: '👁️ Xem Mạch Mẫu 2 (2 Đèn Nối Tiếp – Chỉ quan sát & Đo thử)',
      mode: 'free',
      preset: 1,
      readOnly: true
    }
  });
  parentGroup.add(st2);

  // MẪU 3: HAI ĐÈN MẮC SONG SONG
  const st3 = createExperimentStation({
    x: 3.8, z: -7.8, rotY: 0,
    title: 'MẪU 3: HAI ĐÈN MẮC SONG SONG',
    subtitle: 'Cùng hiệu điện thế U · Đèn sáng mạnh độc lập',
    schemeType: 'sample3',
    studentShirt: 0xffffff,
    studentGender: 'male',
    actionData: {
      label: '👁️ Xem Mạch Mẫu 3 (2 Đèn Song Song – Chỉ quan sát & Đo thử)',
      mode: 'free',
      preset: 2,
      readOnly: true
    }
  });
  parentGroup.add(st3);

  // Biển hiệu Khu I trên tường chính diện
  const bannerZone1 = makeWallTextSign('I. KHU XEM MẠCH ĐIỆN MẪU', 'Chế độ Chỉ Xem – Thử nghiệm bật/tắt Khóa K & Kéo que đo Vôn kế', 6.6, 1.3);
  bannerZone1.position.set(-0.2, 4.45, -9.9);
  parentGroup.add(bannerZone1);
}

function createOscilloscopeTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 320;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#02182b';
  ctx.fillRect(0, 0, 512, 320);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
  ctx.lineWidth = 1;
  for (let x = 32; x < 512; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 320); ctx.stroke();
  }
  for (let y = 32; y < 320; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 320); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 160); ctx.lineTo(512, 160); ctx.stroke();

  // Wave 1 (Green Sine)
  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let x = 0; x < 512; x++) {
    const y = 160 + Math.sin(x * 0.04) * 55;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Wave 2 (Cyan Cosine)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let x = 0; x < 512; x++) {
    const y = 160 + Math.cos(x * 0.04) * 35;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 16px monospace';
  ctx.fillText('CH1: 5.00V/div', 20, 32);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('CH2: 2.50V/div', 190, 32);
  ctx.fillStyle = '#facc15';
  ctx.fillText('M: 500μs', 360, 32);
  ctx.fillStyle = '#4ade80';
  ctx.fillText('f = 1.000 kHz · TRIG: AUTO [OK]', 20, 298);

  return new THREE.CanvasTexture(c);
}

function createPowerSupplyTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 248);

  // Red LED Voltage
  ctx.fillStyle = '#1e1111';
  ctx.fillRect(20, 20, 220, 110);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 220, 110);
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#dc2626';
  ctx.shadowBlur = 12;
  ctx.font = '900 50px monospace';
  ctx.fillText('12.0 V', 42, 95);

  // Green LED Current
  ctx.fillStyle = '#111e14';
  ctx.fillRect(272, 20, 220, 110);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  ctx.strokeRect(272, 20, 220, 110);
  ctx.fillStyle = '#22c55e';
  ctx.shadowColor = '#16a34a';
  ctx.shadowBlur = 12;
  ctx.font = '900 50px monospace';
  ctx.fillText('2.50 A', 294, 95);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 18px "Be Vietnam Pro", sans-serif';
  ctx.fillText('DC REGULATED POWER SUPPLY', 110, 175);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 15px "Be Vietnam Pro", sans-serif';
  ctx.fillText('C.V. / C.C. AUTOMATIC CROSSOVER · 30V / 5A', 75, 215);

  return new THREE.CanvasTexture(c);
}

function createRobotFaceTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 18;

  // Eyes (happy curves)
  ctx.beginPath();
  ctx.arc(80, 115, 36, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(176, 115, 36, Math.PI * 1.15, Math.PI * 1.85, false);
  ctx.stroke();

  // Smile
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 160, 32, Math.PI * 0.15, Math.PI * 0.85, false);
  ctx.stroke();

  return new THREE.CanvasTexture(c);
}

function createFreeLabBillboardTexture() {
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 800;
  const ctx = c.getContext('2d');

  // Background Gradient Glassmorphism
  const grad = ctx.createLinearGradient(0, 0, 2048, 800);
  grad.addColorStop(0, '#060c18');
  grad.addColorStop(0.5, '#0c1b33');
  grad.addColorStop(1, '#081426');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 800);

  // Circuit Grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
  ctx.lineWidth = 2;
  for (let x = 64; x < 2048; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 800); ctx.stroke();
  }
  for (let y = 64; y < 800; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2048, y); ctx.stroke();
  }

  // Outer Neon Cyan Glow Border
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
  ctx.lineWidth = 12;
  ctx.shadowColor = '#00f2fe';
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.roundRect(24, 24, 2000, 752, 44);
  ctx.stroke();

  // Header Pill
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
  ctx.beginPath();
  ctx.roundRect(690, 50, 668, 64, 32);
  ctx.fill();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#67e8f9';
  ctx.font = '800 28px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ KHÔNG GIAN STEM · THỰC HÀNH TỰ DO', 1024, 94);

  // Main Title with Glow
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px "Be Vietnam Pro", sans-serif';
  ctx.fillText('III. PHÒNG LAB TỰ DO', 1024, 230);

  // Subtitle
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 36px "Be Vietnam Pro", sans-serif';
  ctx.fillText('Thỏa sức thiết kế mạch điện · Thử nghiệm Vôn kế & Ampe kế · Lõi MNA chuẩn xác', 1024, 310);

  // Feature Badges
  const badges = [
    '✨ Không giới hạn linh kiện',
    '🔬 Vôn kế 2 que đo Đen/Đỏ',
    '⚡ Thử nghiệm quá tải & ngắt mạch',
    '🤖 Bác sĩ Mạch AI đồng hành'
  ];
  badges.forEach((bg, idx) => {
    const bx = 265 + idx * 380;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(bx - 175, 375, 350, 54, 27);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '700 23px "Be Vietnam Pro", sans-serif';
    ctx.fillText(bg, bx, 411);
  });

  // Action Button
  const btnGrad = ctx.createLinearGradient(600, 490, 1448, 640);
  btnGrad.addColorStop(0, '#059669');
  btnGrad.addColorStop(1, '#0d9488');
  ctx.fillStyle = btnGrad;
  ctx.shadowColor = '#10b981';
  ctx.shadowBlur = 32;
  ctx.beginPath();
  ctx.roundRect(620, 505, 808, 126, 63);
  ctx.fill();
  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px "Be Vietnam Pro", sans-serif';
  ctx.fillText('▶ NHẤP VÀO ĐÂY ĐỂ VÀO PHÒNG LAB (PLAY)', 1024, 584);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText('💡 Mẹo: Nhấp vào màn hình hoặc mặt bàn để bắt đầu toàn quyền sáng tạo mạch 2D', 1024, 715);

  return new THREE.CanvasTexture(c);
}

function createCenterLabStool(x, z) {
  const stool = new THREE.Group();
  stool.position.set(x, 0, z);

  const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.92, roughness: 0.15 });

  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 24), chromeMat);
  baseMesh.position.y = 0.015;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  stool.add(baseMesh);

  const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.58, 16), chromeMat);
  stemMesh.position.y = 0.32;
  stemMesh.castShadow = true;
  stool.add(stemMesh);

  const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 8, 24), chromeMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.24;
  stool.add(ringMesh);

  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const seatMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 24), seatMat);
  seatMesh.position.y = 0.65;
  seatMesh.castShadow = true;
  stool.add(seatMesh);

  return stool;
}

function buildCenterLabStation(parentGroup) {
  const centerLabGroup = new THREE.Group();
  centerLabGroup.position.set(0, 0, 1.2);

  // 1. Vòng tròn sàn phát sáng Neon Cyan (Cyber Ring)
  const floorGlowMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });
  const floorRing1 = new THREE.Mesh(new THREE.RingGeometry(2.38, 2.50, 64), floorGlowMat);
  floorRing1.rotation.x = -Math.PI / 2;
  floorRing1.position.y = 0.008;
  centerLabGroup.add(floorRing1);

  const floorRing2 = new THREE.Mesh(
    new THREE.RingGeometry(1.90, 1.96, 64),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
  );
  floorRing2.rotation.x = -Math.PI / 2;
  floorRing2.position.y = 0.008;
  centerLabGroup.add(floorRing2);

  // 4 vạch đánh dấu hướng trên sàn
  const tickMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(ang => {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.004, 0.28), tickMat);
    tick.position.set(Math.sin(ang) * 2.44, 0.01, Math.cos(ang) * 2.44);
    tick.rotation.y = ang;
    centerLabGroup.add(tick);
  });

  // 2. Bục sàn kim loại tròn thấp nâng đỡ đảo thí nghiệm
  const podiumMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });
  const podium = new THREE.Mesh(new THREE.CylinderGeometry(2.32, 2.42, 0.05, 48), podiumMat);
  podium.position.y = 0.025;
  podium.castShadow = true;
  podium.receiveShadow = true;
  centerLabGroup.add(podium);

  // 3. Chân bàn trụ Titanium hiện đại có khe LED năng lượng
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.35 });
  const cTable = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.95, 48), baseMat);
  cTable.position.y = 0.50;
  cTable.castShadow = true;
  cTable.receiveShadow = true;
  centerLabGroup.add(cTable);

  // 4 rãnh LED xanh dương phát quang thẳng đứng trên thân bàn
  const slotLightMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x00f2fe,
    emissiveIntensity: 1.0
  });
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(ang => {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.04), slotLightMat);
    slot.position.set(Math.sin(ang) * 1.52, 0.50, Math.cos(ang) * 1.52);
    slot.rotation.y = ang;
    centerLabGroup.add(slot);
  });

  // 4. Vành mép bàn kim loại Anodized Teal và Mặt bàn Polymer trắng chống tĩnh điện
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, metalness: 0.7, roughness: 0.25 });
  const cRim = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 1.95, 0.08, 48), rimMat);
  cRim.position.y = 0.97;
  cRim.castShadow = true;
  cRim.receiveShadow = true;
  centerLabGroup.add(cRim);

  const topMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.05 });
  const cTop = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.05, 48), topMat);
  cTop.position.y = 1.01;
  cTop.castShadow = true;
  cTop.receiveShadow = true;
  centerLabGroup.add(cTop);

  // 5. Trang bị 4 ghế thí nghiệm hiện đại xung quanh bàn
  const stoolOffsets = [
    [1.6, 1.6],
    [-1.6, 1.6],
    [-1.6, -1.6],
    [1.6, -1.6]
  ];
  stoolOffsets.forEach(([sx, sz]) => {
    centerLabGroup.add(createCenterLabStool(sx, sz));
  });

  // 6. THIẾT BỊ 1: Máy hiện sóng số chuyên dụng (Digital Oscilloscope)
  const oscGroup = new THREE.Group();
  oscGroup.position.set(-0.92, 1.21, 0.15);
  oscGroup.rotation.y = 0.45;

  const oscChassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.36, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
  );
  oscChassis.castShadow = true;
  oscGroup.add(oscChassis);

  const oscHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.015, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
  );
  oscHandle.position.set(0, 0.20, 0);
  oscGroup.add(oscHandle);

  const oscScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.24),
    new THREE.MeshBasicMaterial({ map: createOscilloscopeTexture() })
  );
  oscScreen.position.set(-0.06, 0.02, 0.152);
  oscGroup.add(oscScreen);

  // Các núm vặn và cổng cắm BNC kim loại
  const bncMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
  [0.17, 0.22].forEach(bx => {
    const bnc = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 12), bncMat);
    bnc.rotation.x = Math.PI / 2;
    bnc.position.set(bx, -0.09, 0.16);
    oscGroup.add(bnc);
  });
  const knobMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
  [[-0.04, 0.18], [0.04, 0.18], [0.12, 0.18]].forEach(([ky, kx]) => {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12), knobMat);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(kx, ky, 0.155);
    oscGroup.add(knob);
  });
  centerLabGroup.add(oscGroup);

  // 7. THIẾT BỊ 2: Bộ nguồn biến đổi DC chính xác (Benchtop DC Power Supply)
  const psGroup = new THREE.Group();
  psGroup.position.set(0.92, 1.20, 0.15);
  psGroup.rotation.y = -0.45;

  const psChassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.36, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
  );
  psChassis.castShadow = true;
  psGroup.add(psChassis);

  const psScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.22),
    new THREE.MeshBasicMaterial({ map: createPowerSupplyTexture() })
  );
  psScreen.position.set(0, 0.04, 0.162);
  psGroup.add(psScreen);

  // Cọc cắm đầu ra (Đỏ +, Đen -, Xanh lá GND)
  const postColors = [0xef4444, 0x18181b, 0x22c55e];
  [-0.12, 0, 0.12].forEach((px, i) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.035, 12),
      new THREE.MeshStandardMaterial({ color: postColors[i], metalness: 0.5 })
    );
    post.rotation.x = Math.PI / 2;
    post.position.set(px, -0.11, 0.17);
    psGroup.add(post);
  });
  centerLabGroup.add(psGroup);

  // 8. THIẾT BỊ 3: Khay Testboard điện tử gắn linh kiện & dây dẫn đa sắc
  const bbGroup = new THREE.Group();
  bbGroup.position.set(0.0, 1.045, 0.90);

  const bbBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.035, 0.36),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
  );
  bbBase.castShadow = true;
  bbGroup.add(bbBase);

  // Rãnh giữa và vạch nguồn màu đỏ/xanh
  const bbGroove = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.005, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x64748b })
  );
  bbGroove.position.set(0, 0.018, 0);
  bbGroup.add(bbGroove);

  const railRed = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.005, 0.008),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  railRed.position.set(0, 0.018, -0.15);
  bbGroup.add(railRed);

  const railBlue = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.005, 0.008),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
  );
  railBlue.position.set(0, 0.018, 0.15);
  bbGroup.add(railBlue);

  // Chip IC DIP-8
  const icChip = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.03, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 })
  );
  icChip.position.set(0.12, 0.03, 0);
  bbGroup.add(icChip);

  // Điện trở có vạch màu
  const resMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8 });
  const resistor1 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 12), resMat);
  resistor1.rotation.z = Math.PI / 2;
  resistor1.position.set(-0.16, 0.032, -0.06);
  bbGroup.add(resistor1);

  // Tụ điện hình trụ màu xanh
  const capMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.07, 16),
    new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.3 })
  );
  capMesh.position.set(-0.06, 0.05, 0.05);
  bbGroup.add(capMesh);

  // Các vòng dây cắm nối mạch uốn cong (Jumper Wires)
  const wireColors = [0xef4444, 0xeab308, 0x06b6d4, 0x8b5cf6];
  wireColors.forEach((wc, i) => {
    const wireArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.05 + i * 0.015, 0.006, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: wc, roughness: 0.4 })
    );
    wireArch.position.set(-0.2 + i * 0.11, 0.02, 0);
    wireArch.rotation.z = Math.PI;
    bbGroup.add(wireArch);
  });
  centerLabGroup.add(bbGroup);

  // 9. THIẾT BỊ 4: Đồng hồ VOM số màu vàng đặc trưng
  const vomGroup = new THREE.Group();
  vomGroup.position.set(-0.52, 1.05, 0.85);
  vomGroup.rotation.y = 0.25;

  const vomBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.06, 0.32),
    new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.5 })
  );
  vomBody.castShadow = true;
  vomGroup.add(vomBody);

  const vomDial = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.015, 16),
    new THREE.MeshStandardMaterial({ color: 0x18181b })
  );
  vomDial.position.set(0, 0.035, 0.02);
  vomGroup.add(vomDial);

  const vomScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.13, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x64748b })
  );
  vomScreen.rotation.x = -Math.PI / 2;
  vomScreen.position.set(0, 0.032, -0.08);
  vomGroup.add(vomScreen);

  // Que đo VOM (1 Đỏ, 1 Đen) nằm cạnh khay
  const probeRed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8),
    new THREE.MeshStandardMaterial({ color: 0xef4444 })
  );
  probeRed.rotation.z = Math.PI / 2;
  probeRed.position.set(0.12, 0.01, 0.04);
  vomGroup.add(probeRed);

  const probeBlack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.14, 8),
    new THREE.MeshStandardMaterial({ color: 0x18181b })
  );
  probeBlack.rotation.z = Math.PI / 2;
  probeBlack.position.set(0.12, 0.01, 0.09);
  vomGroup.add(probeBlack);
  centerLabGroup.add(vomGroup);

  // 10. Kính bảo hộ phòng lab trong suốt
  const glassesGroup = new THREE.Group();
  glassesGroup.position.set(0.52, 1.045, 0.85);
  glassesGroup.rotation.y = -0.25;
  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1
    })
  );
  visor.rotation.x = Math.PI / 2;
  glassesGroup.add(visor);
  centerLabGroup.add(glassesGroup);

  // 11. MÔ HÌNH ROBOT TRỢ LÝ AI BAY LƠ LỬNG (Animated Cyber Companion)
  const roboGroup = new THREE.Group();
  roboGroup.position.set(1.25, 1.55, 0.65);
  roboGroup.rotation.y = -0.45;

  // Thân robot dạng viên ngọc trắng ánh kim
  const roboBodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35, roughness: 0.2 });
  const roboBody = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), roboBodyMat);
  roboBody.castShadow = true;
  roboGroup.add(roboBody);

  // Mặt nạ kính đen bóng
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.15 });
  const roboVisor = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 16, 0, Math.PI, 0, Math.PI * 0.55),
    visorMat
  );
  roboVisor.rotation.x = Math.PI / 2;
  roboVisor.position.set(0, 0.02, 0.06);
  roboGroup.add(roboVisor);

  // Mắt LED biểu cảm cười thân thiện
  const faceMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.18),
    new THREE.MeshBasicMaterial({ map: createRobotFaceTexture(), transparent: true })
  );
  faceMesh.position.set(0, 0.04, 0.252);
  roboGroup.add(faceMesh);

  // Vòng phản lực từ trường phát sáng bên dưới
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x00f2fe,
    emissiveIntensity: 1.0
  });
  const thrusterRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 16, 32), thrusterMat);
  thrusterRing.rotation.x = Math.PI / 2;
  thrusterRing.position.y = -0.22;
  roboGroup.add(thrusterRing);

  // Ăng-ten phát sóng tín hiệu có quả cầu phát sáng
  const antStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 })
  );
  antStem.position.y = 0.32;
  roboGroup.add(antStem);

  const antOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x00f2fe, emissiveIntensity: 1.0 })
  );
  antOrb.position.y = 0.44;
  roboGroup.add(antOrb);

  // 2 bàn tay robot bay lơ lửng
  const handMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, metalness: 0.6 });
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), handMat);
  leftHand.position.set(-0.32, -0.04, 0.05);
  roboGroup.add(leftHand);

  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), handMat);
  rightHand.position.set(0.32, -0.04, 0.05);
  roboGroup.add(rightHand);

  centerLabGroup.add(roboGroup);

  // Hoạt ảnh robot bay lơ lửng nhấp nhô
  animatedElements3D.push({
    update: time => {
      roboGroup.position.y = 1.55 + Math.sin(time * 0.003) * 0.06;
      roboGroup.rotation.y = -0.45 + Math.sin(time * 0.0015) * 0.2;
      thrusterMat.emissiveIntensity = 0.8 + Math.sin(time * 0.006) * 0.25;
    }
  });

  // 12. CỘT TRỤ ĐỠ TRUNG TÂM (Đỡ từ mặt bàn lên đáy bảng hiển thị)
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
  const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.66, 32), pylonMat);
  pylon.position.y = 1.34;
  pylon.castShadow = true;
  centerLabGroup.add(pylon);

  // Vòng từ trường phát sáng quanh cột
  const pylonRingMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x00f2fe,
    emissiveIntensity: 0.95
  });
  const pRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 16, 32), pylonRingMat);
  pRing.rotation.x = Math.PI / 2;
  pRing.position.y = 1.34;
  centerLabGroup.add(pRing);

  // Khớp xoay cơ khí đỡ phía dưới bảng
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 32), pylonMat);
  collar.position.y = 1.67;
  centerLabGroup.add(collar);

  // Nhóm Bảng hiển thị tự động xoay trên trục Y hướng thẳng về phía Camera
  const billboardRotatorGroup = new THREE.Group();
  billboardRotatorGroup.position.set(0, 0, 0);

  // Càng đỡ lưng gắn vào phía sau khung viền
  const mountBracket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.16), pylonMat);
  mountBracket.position.set(0, 1.88, -0.06);
  billboardRotatorGroup.add(mountBracket);

  // Khung viền kim loại cao cấp
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
  const billboardFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.55, 0.10), frameMat);
  billboardFrame.position.set(0, 2.45, 0);
  billboardFrame.castShadow = true;
  billboardRotatorGroup.add(billboardFrame);

  // Viền Neon Cyan phát sáng rực rỡ bọc ngoài
  const frameGlowMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.85
  });
  const frameGlow = new THREE.Mesh(new THREE.BoxGeometry(4.24, 1.59, 0.03), frameGlowMat);
  frameGlow.position.set(0, 2.45, 0);
  billboardRotatorGroup.add(frameGlow);

  // Mặt hiển thị Texture độ phân giải cao 2048x800 (DoubleSide)
  const boardMat = new THREE.MeshStandardMaterial({
    map: createFreeLabBillboardTexture(),
    roughness: 0.25,
    metalness: 0.1,
    side: THREE.DoubleSide
  });
  const frontScreen = new THREE.Mesh(new THREE.PlaneGeometry(4.14, 1.48), boardMat);
  frontScreen.position.set(0, 2.45, 0.065);
  frontScreen.castShadow = true;
  billboardRotatorGroup.add(frontScreen);

  // Mặt lưng bảng hiển thị phong cách Sci-Fi có tản nhiệt và biểu tượng STEM
  const backPanelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.4 });
  const backScreen = new THREE.Mesh(new THREE.PlaneGeometry(4.14, 1.48), backPanelMat);
  backScreen.position.set(0, 2.45, -0.065);
  backScreen.rotation.y = Math.PI;
  billboardRotatorGroup.add(backScreen);

  centerLabGroup.add(billboardRotatorGroup);

  // HOẠT ẢNH QUAN TRỌNG: Bảng hiển thị liên tục quay theo góc nhìn hiện tại của người dùng
  animatedElements3D.push({
    update: () => {
      const cam = getCamera();
      if (cam) {
        // centerLabGroup nằm ở vị trí (0, 0, 1.2)
        const dx = cam.position.x - centerLabGroup.position.x;
        const dz = cam.position.z - centerLabGroup.position.z;
        // Mặt phẳng hướng theo vector +Z -> Math.atan2(dx, dz) giúp mặt bảng luôn nhìn thẳng trực diện vào mắt người dùng
        billboardRotatorGroup.rotation.y = Math.atan2(dx, dz);
      }
    }
  });

  // 13. Phân quyền tương tác: Nhấp vào Mặt bảng, Khung viền, Mặt bàn hoặc Robot đều mở ngay Lab Tự Do
  const freeActionData = {
    label: '🛠️ Mở Phòng Lab Tự Do (Toàn quyền sáng tạo & thử nghiệm)',
    mode: 'free',
    preset: 0,
    readOnly: false
  };
  frontScreen.userData = freeActionData;
  billboardFrame.userData = freeActionData;
  cTop.userData = freeActionData;
  roboBody.userData = freeActionData;
  bbBase.userData = freeActionData;

  interactables3D.push(frontScreen, billboardFrame, cTop, roboBody, bbBase);

  parentGroup.add(centerLabGroup);
}

function buildDoctorStation(parentGroup) {
  const docStation = createExperimentStation({
    x: 9.8, z: -3.2, rotY: -Math.PI / 2,
    title: 'II. BÁC SĨ MẠCH & ĐO ĐẠC',
    subtitle: 'Tìm lỗi mạch bị hỏng & Thực hành mắc đồng hồ đo',
    schemeType: 'doctor',
    studentShirt: 0xffffff,
    studentGender: 'female',
    actionData: {
      label: '🩺 Vào Khu Bác Sĩ Mạch (Tìm lỗi & Sửa chữa bí ẩn)',
      mode: 'doc',
      readOnly: false
    }
  });
  parentGroup.add(docStation);
}

function buildQuizPlayButton(parentGroup) {
  createInteractiveKioskBoard({
    parentGroup,
    x: 11.1, y: 0, z: 3.8, rotY: -Math.PI / 2 + 0.12,
    tagText: '🏆 KHU ÔN TẬP & KÝ HIỆU',
    titleText: 'LUYỆN TẬP & ĐỐ VUI KÝ HIỆU',
    subText: 'Ôn tập nhận biết các ký hiệu linh kiện & định luật Ôm',
    badges: ['📚 Trắc Nghiệm Ký Hiệu', '⚡ Định Luật Ôm', '💯 Bảng Xếp Hạng'],
    btnText: 'BẮT ĐẦU ÔN TẬP (PLAY)',
    themeColor: 0xf59e0b,
    btnGradColors: ['#fbbf24', '#d97706', '#92400e'],
    actionData: {
      label: '🏆 Bắt đầu Khu Luyện Tập & Đố Vui Ký Hiệu',
      mode: 'sym',
      readOnly: false
    }
  });
}

function buildBuildPlayButton(parentGroup) {
  createInteractiveKioskBoard({
    parentGroup,
    x: -11.1, y: 0, z: 4.5, rotY: Math.PI / 2 - 0.12,
    tagText: '⚡ CHẾ ĐỘ THỰC HÀNH KHTN 8',
    titleText: 'THỬ THÁCH ĐO & LẮP MẠCH',
    subText: 'Rèn luyện kỹ năng mắc Ampe kế & Vôn kế đo mạch điện chuẩn xác',
    badges: ['🎯 4 Màn Thử Thách', '⚡ Đo Dòng Điện I & Áp U', '🏆 Chấm Điểm Tự Động'],
    btnText: 'VÀO THỬ THÁCH (PLAY)',
    themeColor: 0x0ea5e9,
    btnGradColors: ['#38bdf8', '#0284c7', '#0369a1'],
    actionData: {
      label: '🎯 Bắt đầu 4 Màn Thử Thách Đo & Lắp Mạch',
      mode: 'build',
      readOnly: false
    }
  });
}

function createInteractiveKioskBoard({
  parentGroup,
  x, y, z, rotY,
  tagText,
  titleText,
  subText,
  badges,
  btnText,
  actionData,
  themeColor = 0x0ea5e9,
  btnGradColors = ['#38bdf8', '#0284c7', '#0369a1']
}) {
  const kioskGroup = new THREE.Group();
  kioskGroup.position.set(x, y, z);
  kioskGroup.rotation.y = rotY;

  // 1. Chân đế kim loại đặt vững chãi trên sàn phòng học (Floor Base)
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.6 });
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.0), baseMat);
  baseMesh.position.set(0, 0.04, 0);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  kioskGroup.add(baseMesh);

  // Viền đế phát sáng màu chủ đạo của khu vực
  const baseTrim = new THREE.Mesh(
    new THREE.BoxGeometry(2.84, 0.02, 1.04),
    new THREE.MeshBasicMaterial({ color: themeColor })
  );
  baseTrim.position.set(0, 0.07, 0);
  kioskGroup.add(baseTrim);

  // 2. Hai cột trụ kim loại đỡ lưng Kiosk (ĐẶT PHÍA SAU MÀN HÌNH z = -0.08, TUYỆT ĐỐI KHÔNG ĐÈ LÊN MÀN HÌNH)
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.8 });
  [-0.95, 0.95].forEach(px => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.45, 16), pillarMat);
    // Đặt cột ở z = -0.08 (sau lưng màn hình), đỉnh cột kết nối với ngàm gắn lưng
    pillar.position.set(px, 0.725, -0.08);
    pillar.castShadow = true;
    kioskGroup.add(pillar);
  });

  // Khung ngàm ngang kim loại sau lưng màn hình
  const crossbarMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.12, 0.08),
    pillarMat
  );
  crossbarMesh.position.set(0, 1.35, -0.08);
  kioskGroup.add(crossbarMesh);

  // 3. Khung màn hình hiển thị cảm ứng 3D kích thước lớn
  const boardW = 4.3;
  const boardH = 2.45;
  const boardD = 0.08;
  const screenCenterY = 2.22;

  // Vỏ lưng màn hình titan cao cấp
  const casingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.4 });
  const casingMesh = new THREE.Mesh(new THREE.BoxGeometry(boardW, boardH, boardD), casingMat);
  casingMesh.position.set(0, screenCenterY, 0);
  casingMesh.castShadow = true;
  kioskGroup.add(casingMesh);

  // Dải đèn LED neon viền quanh màn hình Kiosk
  const borderMesh = new THREE.Mesh(
    new THREE.BoxGeometry(boardW + 0.06, boardH + 0.06, 0.02),
    new THREE.MeshBasicMaterial({ color: themeColor })
  );
  borderMesh.position.set(0, screenCenterY, -0.02);
  kioskGroup.add(borderMesh);

  // 4. Màn hình Canvas độ phân giải cực cao (2048 x 1200) - Tự động co dãn chữ, KHÔNG BAO GIỜ TRÀN
  const c = document.createElement('canvas');
  c.width = 2048;
  c.height = 1200;
  const ctx = c.getContext('2d');

  // Nền kính tối sang trọng phong cách phòng lab khoa học hiện đại
  const gBg = ctx.createLinearGradient(0, 0, 0, 1200);
  gBg.addColorStop(0, '#070c18');
  gBg.addColorStop(0.55, '#0f172a');
  gBg.addColorStop(1, '#1e293b');
  ctx.fillStyle = gBg;
  ctx.beginPath();
  ctx.roundRect(12, 12, 2024, 1176, 36);
  ctx.fill();

  // Viền neon màn hình
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Huy hiệu danh mục (Top Badge)
  ctx.fillStyle = 'rgba(14, 165, 233, 0.18)';
  ctx.beginPath();
  ctx.roundRect(724, 52, 600, 56, 28);
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 26px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText || '⚡ CHẾ ĐỘ THỰC HÀNH KHTN THCS', 1024, 80);

  // Tiêu đề chính (Title) - Tự động đo và tinh chỉnh cỡ chữ đảm bảo hiển thị trọn vẹn
  let titleSize = 70;
  ctx.font = `900 ${titleSize}px "Be Vietnam Pro", sans-serif`;
  while (ctx.measureText(titleText).width > 1820 && titleSize > 36) {
    titleSize -= 4;
    ctx.font = `900 ${titleSize}px "Be Vietnam Pro", sans-serif`;
  }
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 14;
  ctx.fillText(titleText, 1024, 190);

  // Phụ đề mô tả (Subtitle) - Co dãn vừa vặn
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#94a3b8';
  let subSize = 32;
  ctx.font = `600 ${subSize}px "Be Vietnam Pro", sans-serif`;
  while (ctx.measureText(subText).width > 1820 && subSize > 20) {
    subSize -= 2;
    ctx.font = `600 ${subSize}px "Be Vietnam Pro", sans-serif`;
  }
  ctx.fillText(subText, 1024, 275);

  // Đường kẻ ngang phát sáng
  const gLine = ctx.createLinearGradient(250, 0, 1798, 0);
  gLine.addColorStop(0, 'rgba(56, 189, 248, 0)');
  gLine.addColorStop(0.5, 'rgba(56, 189, 248, 0.75)');
  gLine.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.strokeStyle = gLine;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, 330);
  ctx.lineTo(1748, 330);
  ctx.stroke();

  // 3 Thẻ tính năng (Feature Badges) - Căn chỉnh kích thước và font vừa vặn
  const badgeList = badges || ['🎯 4 Màn Thử Thách', '⚡ Đo Dòng Điện I & Áp U', '🏆 Chấm Điểm Tự Động'];
  const badgeWidth = 470;
  const startX = 1024 - ((badgeList.length * badgeWidth + (badgeList.length - 1) * 28) / 2) + badgeWidth / 2;
  badgeList.forEach((bText, i) => {
    const bx = startX + i * (badgeWidth + 28);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.beginPath();
    ctx.roundRect(bx - badgeWidth / 2, 370, badgeWidth, 64, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    let bSize = 24;
    ctx.font = `700 ${bSize}px "Be Vietnam Pro", sans-serif`;
    while (ctx.measureText(bText).width > (badgeWidth - 40) && bSize > 16) {
      bSize -= 1;
      ctx.font = `700 ${bSize}px "Be Vietnam Pro", sans-serif`;
    }
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(bText, bx, 402);
  });

  // Nút BẮT ĐẦU (PLAY) Viên thuốc 3D - TỰ ĐỘNG CO DÃN CHỮ, TUYỆT ĐỐI KHÔNG TRÀN
  const btnW = 860; // Tăng chiều rộng nút từ 740 lên 860
  const btnH = 200;
  const btnX = 1024 - btnW / 2;
  const btnY = 520;

  // Hào quang phát sáng tỏa tròn phía sau nút PLAY
  const gGlow = ctx.createRadialGradient(1024, btnY + btnH / 2, 60, 1024, btnY + btnH / 2, 460);
  gGlow.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
  gGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = gGlow;
  ctx.beginPath();
  ctx.ellipse(1024, btnY + btnH / 2, 490, 240, 0, 0, Math.PI * 2);
  ctx.fill();

  // Thân nút bo tròn hoàn hảo dạng viên thuốc (Pill)
  const gBtn = ctx.createLinearGradient(0, btnY, 0, btnY + btnH);
  gBtn.addColorStop(0, btnGradColors[0] || '#fbbf24');
  gBtn.addColorStop(0.5, btnGradColors[1] || '#d97706');
  gBtn.addColorStop(1, btnGradColors[2] || '#92400e');
  ctx.fillStyle = gBtn;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, btnH / 2);
  ctx.fill();

  // Viền vàng nổi khối dày dặn
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Vệt phản chiếu ánh sáng bóng bẩy góc trên của nút
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.beginPath();
  ctx.ellipse(1024, btnY + 42, btnW * 0.38, 25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Chữ PLAY to rõ, nổi bật - Tự động đo độ dài để luôn nằm trọn trong nút viên thuốc
  const fullBtnText = '▶ ' + (btnText || 'BẮT ĐẦU (PLAY)');
  let btnFontSize = 52;
  ctx.font = `900 ${btnFontSize}px "Be Vietnam Pro", sans-serif`;
  while (ctx.measureText(fullBtnText).width > (btnW - 100) && btnFontSize > 30) {
    btnFontSize -= 2;
    ctx.font = `900 ${btnFontSize}px "Be Vietnam Pro", sans-serif`;
  }

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 12;
  ctx.fillText(fullBtnText, 1024, btnY + btnH / 2 - 14);

  // Lời gợi ý nhấp chuột
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fef08a';
  ctx.font = '700 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText('🖱️ Nhấp trực tiếp vào đây để bắt đầu', 1024, btnY + btnH / 2 + 46);

  // Hướng dẫn ở đáy màn hình (rõ ràng, không bị bất kỳ cột nào che)
  ctx.fillStyle = '#64748b';
  ctx.font = '600 24px "Be Vietnam Pro", sans-serif';
  ctx.fillText('💡 Bấm vào màn hình Kiosk để mở bảng thực hành bài tập & chấm điểm', 1024, 1060);

  // Gắn actionData cho màn hình, vỏ titan, viền LED và chân đế Kiosk
  casingMesh.userData = actionData;
  borderMesh.userData = actionData;
  baseMesh.userData = actionData;

  // Kết xuất bề mặt màn hình (Không trong suốt, hỗ trợ DoubleSide)
  const screenTex = new THREE.CanvasTexture(c);
  screenTex.anisotropy = 8;
  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTex,
    side: THREE.DoubleSide
  });

  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(boardW - 0.08, boardH - 0.08),
    screenMat
  );
  screenMesh.position.set(0, screenCenterY, boardD / 2 + 0.015);
  screenMesh.userData = actionData;
  interactables3D.push(screenMesh, casingMesh, borderMesh, baseMesh);
  kioskGroup.add(screenMesh);

  parentGroup.add(kioskGroup);
}
