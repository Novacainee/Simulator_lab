/* ==========================================================================
   js/world3d/outdoorScenery.js - Dựng cảnh ngoài cửa sổ: Bầu trời nắng nhẹ,
                                  mây trắng, thảm cỏ xanh mướt & cây xanh đung đưa
   ========================================================================== */

const treesList = [];
const cloudsList = [];

export function buildOutdoorScenery(scene) {
  const outdoorGroup = new THREE.Group();

  // 1. Vòm trời nắng nhẹ bên ngoài (Sky Dome / Horizon Gradient)
  const skyGeo = new THREE.SphereGeometry(75, 32, 16);
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 128;
  skyCanvas.height = 128;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 128);
  skyGrad.addColorStop(0, '#60a5fa');   // Xanh da trời sáng
  skyGrad.addColorStop(0.65, '#bae6fd'); // Xanh nhạt dịu
  skyGrad.addColorStop(1, '#fef08a');   // Ánh vàng nắng chân trời
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 128, 128);

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    fog: false
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.position.set(-15, 0, 0);
  outdoorGroup.add(skyDome);

  // Mặt trời nhân tạo rực rỡ ngoài chân trời
  const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(3.5, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffedd5 })
  );
  sunSphere.position.set(-55, 32, -18);
  outdoorGroup.add(sunSphere);

  // 2. Thảm cỏ xanh mướt trải rộng bên ngoài cửa sổ
  const grassTex = createGrassTexture();
  const grassMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.85,
    metalness: 0.05
  });
  const grassMesh = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), grassMat);
  grassMesh.rotation.x = -Math.PI / 2;
  grassMesh.position.set(-45, -0.05, 0);
  grassMesh.receiveShadow = true;
  outdoorGroup.add(grassMesh);

  // 3. Hàng rào sân trường / bụi rậm phân cách
  const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 });
  const hedgeGeo = new THREE.BoxGeometry(0.8, 1.2, 36);
  const hedge = new THREE.Mesh(hedgeGeo, hedgeMat);
  hedge.position.set(-28, 0.6, 0);
  hedge.castShadow = true;
  hedge.receiveShadow = true;
  outdoorGroup.add(hedge);

  // 4. Những tán cây xanh 3D bên ngoài cửa sổ
  const treePositions = [
    { x: -18, z: -8,  scale: 1.2,  speed: 1.0 },
    { x: -20, z: -2,  scale: 1.45, speed: 0.9 },
    { x: -17, z: 4.5, scale: 1.15, speed: 1.1 },
    { x: -22, z: 9,   scale: 1.35, speed: 0.95 },
    { x: -25, z: -14, scale: 1.5,  speed: 0.85 },
    { x: -26, z: 15,  scale: 1.6,  speed: 0.8 },
    { x: -32, z: -5,  scale: 1.8,  speed: 0.75 },
    { x: -30, z: 6,   scale: 1.7,  speed: 0.78 }
  ];

  treePositions.forEach((pos, idx) => {
    const tree = createRealistic3DTree(pos.scale, idx);
    tree.position.set(pos.x, 0, pos.z);
    outdoorGroup.add(tree);
    treesList.push({
      group: tree,
      canopy: tree.userData.canopyGroup,
      baseRotZ: tree.userData.canopyGroup.rotation.z,
      baseRotX: tree.userData.canopyGroup.rotation.x,
      speed: pos.speed,
      phase: idx * 0.8
    });
  });

  // 5. Những cụm mây trắng bồng bềnh trôi trên bầu trời
  const cloudPositions = [
    { x: -28, y: 19, z: -18, scale: 1.3 },
    { x: -35, y: 23, z: 2,   scale: 1.8 },
    { x: -24, y: 17, z: 16,  scale: 1.2 },
    { x: -45, y: 26, z: -8,  scale: 2.1 }
  ];

  cloudPositions.forEach(pos => {
    const cloud = create3DCloud(pos.scale);
    cloud.position.set(pos.x, pos.y, pos.z);
    outdoorGroup.add(cloud);
    cloudsList.push(cloud);
  });

  // 6. Các khóm hoa nhỏ sắc màu trên thảm cỏ gần cửa sổ
  createFlowerBushes(outdoorGroup);

  scene.add(outdoorGroup);
}

function createGrassTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Nền cỏ xanh tươi
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 0, 512, 512);

  // Điểm xuyết vệt cỏ đậm nhạt
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 3 + 1;
    ctx.fillStyle = Math.random() < 0.5 ? '#16a34a' : (Math.random() < 0.5 ? '#4ade80' : '#15803d');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

function createRealistic3DTree(scale = 1.0, seed = 0) {
  const treeGroup = new THREE.Group();

  // Thân cây gỗ tự nhiên
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c3818,
    roughness: 0.9,
    metalness: 0.05
  });
  const trunkGeo = new THREE.CylinderGeometry(0.24 * scale, 0.42 * scale, 3.6 * scale, 12);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.8 * scale;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  treeGroup.add(trunk);

  // Tán lá xanh nhiều tầng có thể đung đưa theo gió
  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(0, 3.2 * scale, 0);

  const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 });
  const leafMat3 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });

  // Cụm cầu lá nhiều lớp tự nhiên
  const layers = [
    { y: 0.0, r: 1.6 * scale, mat: leafMat1 },
    { y: 0.9 * scale, r: 1.35 * scale, mat: leafMat2 },
    { y: 1.7 * scale, r: 1.05 * scale, mat: leafMat3 },
    { y: 2.3 * scale, r: 0.7 * scale, mat: leafMat2 }
  ];

  layers.forEach((layer, lIdx) => {
    const geo = new THREE.DodecahedronGeometry(layer.r, 1);
    const mesh = new THREE.Mesh(geo, layer.mat);
    mesh.position.set((lIdx % 2 === 0 ? 0.15 : -0.15) * scale, layer.y, (lIdx === 1 ? 0.2 : -0.1) * scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    canopyGroup.add(mesh);
  });

  treeGroup.add(canopyGroup);
  treeGroup.userData = { canopyGroup };

  return treeGroup;
}

function create3DCloud(scale = 1.0) {
  const cloud = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.88
  });

  const puffData = [
    { x: 0, y: 0, z: 0, r: 2.2 },
    { x: 1.8, y: -0.3, z: 0.2, r: 1.6 },
    { x: -1.8, y: -0.2, z: -0.2, r: 1.7 },
    { x: 0.8, y: 0.8, z: -0.1, r: 1.8 },
    { x: -0.9, y: 0.7, z: 0.3, r: 1.5 }
  ];

  puffData.forEach(p => {
    const geo = new THREE.SphereGeometry(p.r * scale, 12, 10);
    const puff = new THREE.Mesh(geo, mat);
    puff.position.set(p.x * scale, p.y * scale, p.z * scale);
    cloud.add(puff);
  });

  return cloud;
}

function createFlowerBushes(parentGroup) {
  const flowerMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const flowerMatYellow = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const flowerMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const bushGeo = new THREE.SphereGeometry(0.55, 8, 8);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x166534 });

  const bushPositions = [
    { x: -14.5, z: -4 },
    { x: -15.0, z: 0 },
    { x: -14.2, z: 3.5 },
    { x: -16.0, z: 7 }
  ];

  bushPositions.forEach((bPos, idx) => {
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.set(bPos.x, 0.35, bPos.z);
    bush.castShadow = true;
    parentGroup.add(bush);

    // Điểm các bông hoa nhỏ li ti trên bụi
    for (let f = 0; f < 5; f++) {
      const flMat = f % 3 === 0 ? flowerMatRed : (f % 3 === 1 ? flowerMatYellow : flowerMatWhite);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), flMat);
      const ang = (f / 5) * Math.PI * 2;
      fl.position.set(bPos.x + Math.cos(ang) * 0.45, 0.6 + Math.sin(ang * 2) * 0.15, bPos.z + Math.sin(ang) * 0.45);
      parentGroup.add(fl);
    }
  });
}

export function updateOutdoorScenery(time, dt) {
  // Cây cối đung đưa nhẹ nhàng tự nhiên theo làn gió
  treesList.forEach(item => {
    const wind = Math.sin(time * 0.0018 * item.speed + item.phase);
    item.canopy.rotation.z = item.baseRotZ + wind * 0.055;
    item.canopy.rotation.x = item.baseRotX + Math.cos(time * 0.0014 * item.speed + item.phase) * 0.035;
  });

  // Mây trắng từ từ trôi qua bầu trời
  cloudsList.forEach((cloud, idx) => {
    cloud.position.z += dt * 0.0006 * (idx % 2 === 0 ? 1 : 0.8);
    if (cloud.position.z > 40) {
      cloud.position.z = -40;
    }
  });
}
