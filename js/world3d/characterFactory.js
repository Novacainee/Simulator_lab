/* ==========================================================================
   js/world3d/characterFactory.js - Nâng cấp Nhân vật Học sinh 3D
   Khắc họa chuẩn xác theo ảnh mẫu YooBook:
   - Tóc nâu sẫm vuốt lọn nhọn 3D bồng bềnh (Anime/Pixar style)
   - Đôi mắt to long lanh màu hổ phách nâu vàng, 2 đốm sáng bóng, má hồng đào, miệng cười tươi
   - Áo sơ mi polo ngắn tay màu xanh da trời nhạt (Baby Blue) có cổ bẻ & hàng cúc trắng
   - Quần âu màu be (Khaki) có đường túi xéo
   - Giày thể thao phối 3 màu: mũi xanh dương, thân xám, dây & đế cao su trắng
   - Cử động thở nhẹ, nghiêng đầu ngắm nhìn lớp học và vẫy tay
   - Tự động nạp file assets/models/student.glb nếu có (GLTFLoader), fallback về mô hình Procedural cao cấp
   ========================================================================== */

// Hàm tạo lưới chân váy xếp ly 3D đồng phục nữ sinh THCS
function createPleatedSkirtGeometry(waistR = 0.125, hemR = 0.178, height = 0.16, pleats = 16) {
  const geom = new THREE.BufferGeometry();
  const vertices = [];
  const indices = [];
  const uvs = [];

  const segments = pleats * 2;
  const dTheta = (Math.PI * 2) / segments;

  for (let i = 0; i <= segments; i++) {
    const theta = i * dTheta;
    const isOut = i % 2 === 0;
    const rTop = waistR * (isOut ? 1.03 : 0.97);
    const rBot = hemR * (isOut ? 1.05 : 0.95);

    const xTop = Math.cos(theta) * rTop;
    const zTop = Math.sin(theta) * rTop;
    const yTop = height / 2;

    const xBot = Math.cos(theta) * rBot;
    const zBot = Math.sin(theta) * rBot;
    const yBot = -height / 2;

    vertices.push(xTop, yTop, zTop);
    vertices.push(xBot, yBot, zBot);

    uvs.push(i / segments, 1);
    uvs.push(i / segments, 0);
  }

  for (let i = 0; i < segments; i++) {
    const i0 = i * 2;
    const i1 = i0 + 1;
    const i2 = i0 + 2;
    const i3 = i0 + 3;
    indices.push(i0, i1, i2);
    indices.push(i2, i1, i3);
  }

  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

export function createStudentCharacter(config = {}) {
  const group = new THREE.Group();

  // Kiểm tra nếu có file model GLTF cục bộ và có GLTFLoader
  const modelPath = config.modelUrl || 'assets/models/student.glb';
  let gltfLoaded = false;
  const isFemale = (config.gender === 'female');

  if (typeof THREE.GLTFLoader !== 'undefined') {
    const loader = new THREE.GLTFLoader();
    if (typeof THREE.DRACOLoader !== 'undefined') {
      const dracoLoader = new THREE.DRACOLoader();
      dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
      loader.setDRACOLoader(dracoLoader);
    }
    loader.load(
      modelPath,
      gltf => {
        gltfLoaded = true;
        const model = gltf.scene;
        
        // Tỷ lệ chuẩn: Chiều cao học sinh THCS (Nam: 1.88m | Nữ: 1.82m dáng thanh thoát)
        const targetScale = config.scale || (isFemale ? 1.82 : 1.88);
        model.scale.set(targetScale, targetScale, targetScale);

        // Bảng màu đồng phục chuẩn học sinh THCS Việt Nam: Áo sơ mi trắng + Quần đen (Nam) / Chân váy xếp ly xanh than (Nữ)
        const shirtColor = new THREE.Color(config.shirtColor || 0xffffff); // Áo sơ mi trắng đồng phục
        const pantsColor = new THREE.Color(0x18181b); // Quần tây màu đen tuyền học sinh nam
        const skirtColor = new THREE.Color(0x1e293b); // Chân váy màu xanh than học sinh nữ
        const shoeDark   = new THREE.Color(0x0f172a); // Giày tối màu lịch sự
        const sockColor  = new THREE.Color(isFemale ? 0xf8fafc : 0x334155); // Nữ vớ trắng cao cổ, nam vớ tối
        const hairColor  = new THREE.Color(isFemale ? 0x241610 : 0x2e1a12); // Tóc mượt mà tự nhiên

        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const name = (child.name || '').toLowerCase();
            if (name.includes('hair')) {
              if (child.material) {
                child.material = child.material.clone();
                child.material.color = hairColor;
                child.material.roughness = isFemale ? 0.45 : 0.65;
                child.material.needsUpdate = true;
              }
            } else if (name.includes('shirt') || name.includes('sleeve')) {
              // Đồng phục áo sơ mi trắng tinh khôi
              if (child.material) {
                child.material = child.material.clone();
                child.material.color = shirtColor;
                child.material.map = null;
                child.material.roughness = 0.55;
                child.material.needsUpdate = true;
              }
            } else if (name.includes('short') || name.includes('pant') || name.includes('leg')) {
              if (isFemale && (name.includes('short') || name.includes('pant'))) {
                // Với học sinh nữ, ẩn quần đùi nam để thay bằng chân váy xếp ly đồng phục
                child.visible = false;
              } else {
                if (child.material) {
                  child.material = child.material.clone();
                  child.material.color = pantsColor;
                  child.material.map = null;
                  child.material.roughness = 0.85;
                  child.material.needsUpdate = true;
                }
              }
            } else if (name.includes('sock')) {
              // Vớ trắng nữ sinh hoặc vớ sẫm nam sinh
              if (child.material) {
                child.material = child.material.clone();
                child.material.color = sockColor;
                child.material.map = null;
                child.material.roughness = 0.65;
                child.material.needsUpdate = true;
              }
            } else if (name.includes('shoe')) {
              // Giày thể thao / búp bê màu tối lịch sự
              if (child.material) {
                child.material = child.material.clone();
                child.material.color = shoeDark;
                child.material.map = null;
                child.material.roughness = isFemale ? 0.35 : 0.65;
                child.material.needsUpdate = true;
              }
            } else if (name.includes('face') || name.includes('skin') || name.includes('hand') || name.includes('arm')) {
              if (child.material) {
                child.material.roughness = isFemale ? 0.50 : 0.55;
              }
            }
          }
        });

        // ==================== PHỤ KIỆN ĐẶC BIỆT DÀNH CHO HỌC SINH NỮ ====================
        if (isFemale) {
          const femaleAccGroup = new THREE.Group();

          // 1. Chân váy xếp ly đồng phục nữ sinh (Pleated Skirt)
          const skirtGeo = createPleatedSkirtGeometry(0.125, 0.178, 0.16, 16);
          const skirtMat = new THREE.MeshStandardMaterial({
            color: skirtColor,
            roughness: 0.72,
            side: THREE.DoubleSide
          });
          const skirt = new THREE.Mesh(skirtGeo, skirtMat);
          skirt.position.set(0, 0.28, 0.015);
          skirt.castShadow = true;
          skirt.receiveShadow = true;
          femaleAccGroup.add(skirt);

          // 2. Nơ bướm đỏ xinh xắn dưới cổ áo sơ mi (Collar Ribbon Bow)
          const ribbonMat = new THREE.MeshStandardMaterial({
            color: 0xd92638,
            roughness: 0.38,
            metalness: 0.05
          });
          const ribbonKnot = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), ribbonMat);
          ribbonKnot.position.set(0, 0.655, 0.098);
          femaleAccGroup.add(ribbonKnot);

          [-0.024, 0.024].forEach((rx, idx) => {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.022, 0.012), ribbonMat);
            wing.position.set(rx, 0.655, 0.098);
            wing.rotation.z = idx === 0 ? 0.38 : -0.38;
            femaleAccGroup.add(wing);
          });

          [-0.012, 0.012].forEach((tx, idx) => {
            const tail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.055, 0.008), ribbonMat);
            tail.position.set(tx, 0.622, 0.099);
            tail.rotation.z = idx === 0 ? -0.15 : 0.15;
            femaleAccGroup.add(tail);
          });

          // 3. Tóc buộc hai bên bồng bềnh (Twintails) & Tóc mai mềm mại
          const femaleHairMat = new THREE.MeshStandardMaterial({
            color: hairColor,
            roughness: 0.45,
            metalness: 0.05
          });
          const hairTieMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            roughness: 0.35
          });

          [-0.14, 0.14].forEach((hx, idx) => {
            const twintailGroup = new THREE.Group();
            twintailGroup.position.set(hx, 0.77, -0.02);

            const tie = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.007, 8, 16), hairTieMat);
            tie.rotation.x = Math.PI / 2;
            twintailGroup.add(tie);

            const tailGeo = new THREE.CylinderGeometry(0.028, 0.008, 0.22, 10);
            tailGeo.translate(0, -0.10, 0);
            const tail = new THREE.Mesh(tailGeo, femaleHairMat);
            tail.rotation.z = idx === 0 ? 0.22 : -0.22;
            tail.rotation.x = 0.06;
            tail.castShadow = true;
            twintailGroup.add(tail);

            femaleAccGroup.add(twintailGroup);
          });

          // Tóc mai mềm mại buông nhẹ hai bên má
          [-0.13, 0.13].forEach((sx, idx) => {
            const lockGeo = new THREE.CylinderGeometry(0.012, 0.003, 0.16, 8);
            lockGeo.translate(0, -0.07, 0);
            const lock = new THREE.Mesh(lockGeo, femaleHairMat);
            lock.position.set(sx, 0.71, 0.08);
            lock.rotation.z = idx === 0 ? -0.06 : 0.06;
            lock.rotation.x = 0.06;
            femaleAccGroup.add(lock);
          });

          // Kẹp tóc màu vàng đáng yêu bên mái trái
          const clipMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.032, 0.016, 0.008),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.4 })
          );
          clipMesh.position.set(-0.085, 0.85, 0.14);
          clipMesh.rotation.z = 0.35;
          femaleAccGroup.add(clipMesh);

          // 4. Má hồng phớt đáng yêu (Blush)
          [-0.072, 0.072].forEach(bx => {
            const blush = new THREE.Mesh(
              new THREE.SphereGeometry(0.022, 10, 8),
              new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.65 })
            );
            blush.scale.set(1.4, 0.75, 0.2);
            blush.position.set(bx, 0.695, 0.168);
            femaleAccGroup.add(blush);
          });

          model.add(femaleAccGroup);
        }

        // Tìm các khớp xương cánh tay và đầu để tạo dáng đứng tự nhiên bên bàn thí nghiệm
        let headBone = null;
        let lUpperarm = null;
        let rUpperarm = null;
        let lForearm = null;
        let rForearm = null;

        model.traverse(child => {
          if (child.isBone) {
            const bname = child.name;
            if (bname.toLowerCase().includes('head')) headBone = child;
            if (bname === 'L_Upperarm') lUpperarm = child;
            if (bname === 'R_Upperarm') rUpperarm = child;
            if (bname === 'L_Forearm') lForearm = child;
            if (bname === 'R_Forearm') rForearm = child;
          }
        });

        // Tạo dáng đứng tự nhiên
        if (isFemale) {
          if (lUpperarm) {
            lUpperarm.rotation.z = -1.38;
            lUpperarm.rotation.x = 0.12;
          }
          if (rUpperarm) {
            rUpperarm.rotation.z = 1.32;
            rUpperarm.rotation.x = 0.12;
          }
          if (headBone) {
            headBone.rotation.z = 0.05; // Nghiêng đầu nhẹ đáng yêu
          }
        } else {
          if (lUpperarm) {
            lUpperarm.rotation.z = -1.35;
            lUpperarm.rotation.x = 0.08;
          }
          if (rUpperarm) {
            rUpperarm.rotation.z = 1.35;
            rUpperarm.rotation.x = 0.08;
          }
        }

        if (lForearm) lForearm.rotation.z = -0.15;
        if (rForearm) rForearm.rotation.z = 0.15;

        // Hoạt ảnh thở nhẹ và nghiêng đầu tự nhiên quan sát lớp học
        group.update = function(time) {
          const breath = Math.sin(time * 0.0028);
          model.position.y = breath * 0.008;

          if (headBone) {
            headBone.rotation.y = Math.sin(time * 0.001) * 0.15;
            headBone.rotation.x = Math.sin(time * 0.0014) * 0.04;
            if (isFemale) headBone.rotation.z = 0.05 + Math.sin(time * 0.0012) * 0.02;
          } else {
            model.rotation.y = Math.sin(time * 0.001) * 0.06;
          }

          // Cánh tay đung đưa nhẹ theo nhịp thở
          if (lUpperarm) {
            lUpperarm.rotation.z = (isFemale ? -1.38 : -1.35) + Math.sin(time * 0.002) * 0.03;
          }
          if (rUpperarm) {
            rUpperarm.rotation.z = (isFemale ? 1.32 : 1.35) - Math.sin(time * 0.002) * 0.03;
          }
        };

        group.add(model);
      },
      undefined,
      err => {
        console.warn('Lỗi tải mô hình GLTF student.glb, chuyển sang mô hình 3D Procedural:', err);
        if (!gltfLoaded) {
          buildYooBookAnimeStudent(group, config);
        }
      }
    );
  } else {
    buildYooBookAnimeStudent(group, config);
  }

  return group;
}

/**
 * Xây dựng mô hình 3D Học sinh chuẩn xác theo ảnh mẫu YooBook
 */
function buildYooBookAnimeStudent(parentGroup, config) {
  // Bảng màu chuẩn đồng phục THCS Việt Nam
  const skinColor = 0xfce4ce;      // Màu da hồng hào tự nhiên
  const hairColor = 0x2a170e;      // Tóc nâu espresso trầm ấm
  const shirtColor = config.shirtColor || 0xffffff; // Áo sơ mi trắng đồng phục
  const collarColor = 0xf1f5f9;
  const pantsColor = 0x18181b;     // Quần tây màu đen tuyền học sinh THCS
  const shoeBlue = 0x0f172a;       // Mũi giày đen
  const shoeGrey = 0x1e293b;       // Thân giày đen xám
  const shoeWhite = 0xffffff;      // Đế & dây giày trắng

  // Vật liệu PBR cao cấp
  const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55, metalness: 0.02 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.65, metalness: 0.08 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5, metalness: 0.02 });
  const collarMat = new THREE.MeshStandardMaterial({ color: collarColor, roughness: 0.5 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.85, metalness: 0.02 });
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

  // ==================== 1. ĐẦU & KHUÔN MẶT ANIME ====================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.58, 0);

  // Đầu tròn dáng Chibi / Pixar má phúng phính dễ thương
  const headGeo = new THREE.SphereGeometry(0.26, 32, 24);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.scale.set(1.0, 1.06, 1.03);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  // Mũi nhỏ xinh (Button Nose)
  const noseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfcbda2, roughness: 0.6 })
  );
  noseMesh.position.set(0, 0.015, 0.262);
  noseMesh.scale.set(1.1, 0.8, 0.9);
  headGroup.add(noseMesh);

  // Tai trái và tai phải có đường nét vành tai
  [-0.26, 0.26].forEach((ex, idx) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(ex, 0.01, -0.02);
    earGroup.rotation.y = idx === 0 ? -0.2 : 0.2;

    const outerEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 12, 12),
      skinMat
    );
    outerEar.scale.set(0.45, 1.0, 0.75);
    earGroup.add(outerEar);

    const innerEar = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xf5aa8f, roughness: 0.7 })
    );
    innerEar.position.set(idx === 0 ? 0.012 : -0.012, -0.005, 0.01);
    innerEar.scale.set(0.3, 0.8, 0.55);
    earGroup.add(innerEar);

    headGroup.add(earGroup);
  });

  // Tấm họa tiết khuôn mặt Canvas 2D độ phân giải cao (1024x1024)
  // Vẽ đôi mắt hổ phách long lanh, lông mày, má hồng & nụ cười tươi chuẩn ảnh
  const faceTexture = createHighResFaceTexture();
  const faceMat = new THREE.MeshBasicMaterial({
    map: faceTexture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const phiCenter = Math.PI * 0.5; // Hướng thẳng trục +Z (Mặt trước)
  const phiSpan = 1.74;
  const thetaStart = Math.PI * 0.25;
  const thetaSpan = Math.PI * 0.50;
  const facePlaneGeo = new THREE.SphereGeometry(
    0.264,
    32,
    24,
    phiCenter - phiSpan / 2,
    phiSpan,
    thetaStart,
    thetaSpan
  );
  const facePlane = new THREE.Mesh(facePlaneGeo, faceMat);
  facePlane.scale.set(1.0, 1.06, 1.03);
  headGroup.add(facePlane);

  // ==================== 2. TÓC NÂU VUỐT LỌN NHỌN BỒNG BỀNH (ANIME HAIR) ====================
  const hairGroup = new THREE.Group();

  // Vòm tóc cơ sở ôm lấy nửa trên của đầu
  const hairHelmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairHelmet.position.set(0, 0.02, -0.02);
  hairHelmet.scale.set(1.02, 1.05, 1.04);
  hairHelmet.castShadow = true;
  hairGroup.add(hairHelmet);

  // Tạo các lọn tóc 3D uốn lượn sắc sảo (Tapered hair clumps)
  function addHairStrand(x, y, z, rx, ry, rz, sx, sy, sz) {
    const strandGeo = new THREE.ConeGeometry(0.065 * sx, 0.22 * sy, 8);
    strandGeo.translate(0, -0.1 * sy, 0); // Đặt tâm quay ở gốc lọn tóc
    const strand = new THREE.Mesh(strandGeo, hairMat);
    strand.position.set(x, y, z);
    strand.rotation.set(rx, ry, rz);
    strand.scale.set(1, 1, 0.8 * sz);
    strand.castShadow = true;
    hairGroup.add(strand);
  }

  // 1. Mái tóc phía trước trán (Bangs vuốt nhọn sang bên như ảnh mẫu)
  addHairStrand(-0.06, 0.26, 0.23,  0.4,  0.2, -0.25, 1.15, 1.35, 1.1); // Lọn chính giữa lệch trái
  addHairStrand( 0.03, 0.27, 0.24,  0.45, -0.1,  0.15, 1.25, 1.45, 1.1); // Lọn dài giữa trán
  addHairStrand( 0.12, 0.25, 0.22,  0.35, -0.3,  0.35, 1.1,  1.25, 1.0); // Lọn phải
  addHairStrand(-0.14, 0.23, 0.20,  0.3,   0.4, -0.4,  1.0,  1.15, 1.0); // Lọn mai trái
  addHairStrand( 0.19, 0.22, 0.18,  0.25, -0.5,  0.45, 0.95, 1.1,  1.0); // Lọn mai phải
  addHairStrand(-0.02, 0.31, 0.21,  0.6,   0.0, -0.1,  1.1,  1.2,  1.0); // Lọn đè tầng 2

  // 2. Các lọn tóc vuốt dựng bồng bềnh trên đỉnh đầu (Top Spikes)
  addHairStrand( 0.00, 0.36,  0.06, -0.35, 0.1,  0.0,  1.3, 1.5, 1.2);
  addHairStrand(-0.10, 0.35,  0.08, -0.3,  0.3, -0.3,  1.2, 1.4, 1.1);
  addHairStrand( 0.09, 0.35,  0.07, -0.3, -0.3,  0.3,  1.2, 1.4, 1.1);
  addHairStrand(-0.05, 0.37, -0.05, -0.6,  0.2, -0.2,  1.25, 1.45, 1.1);
  addHairStrand( 0.06, 0.37, -0.06, -0.6, -0.2,  0.2,  1.25, 1.45, 1.1);

  // 3. Tóc hai bên thái dương và vành tai
  addHairStrand(-0.25, 0.12, 0.05,  0.1,  0.8, -0.5,  1.0, 1.2, 0.9);
  addHairStrand( 0.25, 0.12, 0.05,  0.1, -0.8,  0.5,  1.0, 1.2, 0.9);

  // 4. Tóc ôm sau gáy nhiều lớp
  addHairStrand( 0.00, 0.06, -0.26, -0.9, 0.0, 3.14,  1.2, 1.3, 1.0);
  addHairStrand(-0.11, 0.08, -0.24, -0.8, 0.3, 3.0,   1.1, 1.2, 1.0);
  addHairStrand( 0.11, 0.08, -0.24, -0.8,-0.3,-3.0,   1.1, 1.2, 1.0);

  headGroup.add(hairGroup);
  parentGroup.add(headGroup);

  // ==================== 3. CỔ & ÁO SƠ MI POLO BABY BLUE ====================
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 1.05;

  // Cổ người
  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.095, 0.14, 16),
    skinMat
  );
  neckMesh.position.y = 0.36;
  torsoGroup.add(neckMesh);

  // Thân áo Polo màu xanh da trời nhạt
  const bodyMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.205, 0.58, 20),
    shirtMat
  );
  bodyMesh.scale.set(1.12, 1.0, 0.85); // Dáng người thanh thoát
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  torsoGroup.add(bodyMesh);

  // Cổ bẻ Polo 3D (Collar flaps)
  const collarRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.135, 0.024, 8, 20, Math.PI * 1.5),
    collarMat
  );
  collarRing.rotation.x = Math.PI / 2 + 0.25;
  collarRing.rotation.z = -Math.PI / 2;
  collarRing.position.set(0, 0.28, 0);
  torsoGroup.add(collarRing);

  // Hai cánh ve cổ áo gập vát xuống ngực
  [-0.055, 0.055].forEach((cx, idx) => {
    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.015, 0.12),
      collarMat
    );
    flap.position.set(cx, 0.26, 0.14);
    flap.rotation.set(0.35, idx === 0 ? 0.3 : -0.3, idx === 0 ? -0.2 : 0.2);
    flap.castShadow = true;
    torsoGroup.add(flap);
  });



  // Hàng nẹp áo và 3 cúc áo màu trắng trước ngực
  const placketMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.038, 0.28, 0.012),
    collarMat
  );
  placketMesh.position.set(0, 0.13, 0.174);
  torsoGroup.add(placketMesh);

  [0.23, 0.15, 0.07].forEach(by => {
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.008, 12),
      buttonMat
    );
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, by, 0.181);
    torsoGroup.add(btn);
  });

  // Gấu áo polo viền nhẹ ở eo
  const hemMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.012, 8, 24),
    collarMat
  );
  hemMesh.rotation.x = Math.PI / 2;
  hemMesh.position.set(0, -0.28, 0);
  torsoGroup.add(hemMesh);

  parentGroup.add(torsoGroup);

  // ==================== 4. TAY ÁO NGẮN & CÁNH TAY CẦM TAY DỄ THƯƠNG ====================
  // Tay áo ngắn màu xanh có đường viền gập gấu
  const armLGroup = new THREE.Group();
  armLGroup.position.set(-0.25, 1.28, 0);

  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.076, 0.18, 16), shirtMat);
  sleeveL.position.set(-0.02, -0.06, 0.01);
  sleeveL.rotation.z = 0.28;
  sleeveL.castShadow = true;
  armLGroup.add(sleeveL);

  const sleeveCuffL = new THREE.Mesh(new THREE.TorusGeometry(0.077, 0.01, 8, 16), collarMat);
  sleeveCuffL.position.set(-0.045, -0.14, 0.01);
  sleeveCuffL.rotation.x = Math.PI / 2;
  armLGroup.add(sleeveCuffL);

  // Cánh tay & Bàn tay trái buông thẳng tự nhiên cạnh đùi
  const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.36, 14), skinMat);
  forearmL.position.set(-0.06, -0.29, 0.02);
  forearmL.rotation.z = 0.15;
  forearmL.castShadow = true;
  armLGroup.add(forearmL);

  const handL = createDetailedHand(skinMat, false);
  handL.position.set(-0.09, -0.48, 0.02);
  handL.rotation.z = 0.12;
  armLGroup.add(handL);
  parentGroup.add(armLGroup);

  // Cánh tay phải
  const armRGroup = new THREE.Group();
  armRGroup.position.set(0.25, 1.28, 0);

  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.076, 0.18, 16), shirtMat);
  sleeveR.position.set(0.02, -0.06, 0.01);
  sleeveR.rotation.z = -0.28;
  sleeveR.castShadow = true;
  armRGroup.add(sleeveR);

  const sleeveCuffR = new THREE.Mesh(new THREE.TorusGeometry(0.077, 0.01, 8, 16), collarMat);
  sleeveCuffR.position.set(0.045, -0.14, 0.01);
  sleeveCuffR.rotation.x = Math.PI / 2;
  armRGroup.add(sleeveCuffR);

  const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.36, 14), skinMat);
  forearmR.position.set(0.06, -0.29, 0.02);
  forearmR.rotation.z = -0.15;
  forearmR.castShadow = true;
  armRGroup.add(forearmR);

  const handR = createDetailedHand(skinMat, true);
  handR.position.set(0.09, -0.48, 0.02);
  handR.rotation.z = -0.12;
  armRGroup.add(handR);
  parentGroup.add(armRGroup);

  // ==================== 5. QUẦN ÂU MÀU BE (KHAKI) CÓ ĐƯỜNG TÚI ====================
  const legsGroup = new THREE.Group();
  legsGroup.position.set(0, 0.52, 0);

  // Hông & Đáy quần
  const pelvisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, 0.19, 0.22, 18),
    pantsMat
  );
  pelvisMesh.position.y = 0.16;
  pelvisMesh.scale.set(1.08, 1.0, 0.88);
  pelvisMesh.castShadow = true;
  legsGroup.add(pelvisMesh);

  // Đường gân túi xéo màu nâu nhạt bên hông quần như ảnh mẫu
  const pocketMat = new THREE.MeshStandardMaterial({ color: 0xbaab94, roughness: 0.8 });
  const pocketLineL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), pocketMat);
  pocketLineL.position.set(-0.21, 0.15, 0.03);
  pocketLineL.rotation.z = 0.32;
  legsGroup.add(pocketLineL);

  const pocketLineR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.16, 0.012), pocketMat);
  pocketLineR.position.set(0.21, 0.15, 0.03);
  pocketLineR.rotation.z = -0.32;
  legsGroup.add(pocketLineR);

  // Hai ống quần màu be
  [-0.105, 0.105].forEach((lx, idx) => {
    const legMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.078, 0.52, 16),
      pantsMat
    );
    legMesh.position.set(lx, -0.14, 0);
    legMesh.castShadow = true;
    legsGroup.add(legMesh);

    // Gấu quần
    const cuffMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.082, 0.009, 8, 16),
      pantsMat
    );
    cuffMesh.rotation.x = Math.PI / 2;
    cuffMesh.position.set(lx, -0.39, 0);
    legsGroup.add(cuffMesh);

    // ==================== 6. GIÀY THỂ THAO 3 MÀU CHUẨN ẢNH ====================
    // Mũi xanh dương, thân xám, dây trắng, đế cao su trắng
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(lx, -0.44, 0.03);

    // Thân giày màu xám
    const shoeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.09, 0.22),
      new THREE.MeshStandardMaterial({ color: shoeGrey, roughness: 0.5 })
    );
    shoeBody.position.set(0, 0.045, 0);
    shoeBody.castShadow = true;
    shoeGroup.add(shoeBody);

    // Mũi giày vòm tròn màu xanh dương rực rỡ (Royal Blue)
    const toeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.068, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: shoeBlue, roughness: 0.4 })
    );
    toeCap.rotation.x = Math.PI / 2;
    toeCap.position.set(0, 0.038, 0.08);
    toeCap.scale.set(0.9, 1.2, 0.85);
    shoeGroup.add(toeCap);

    // Lưỡi gà & Dây giày màu trắng
    const tongue = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.03, 0.12),
      new THREE.MeshStandardMaterial({ color: shoeWhite, roughness: 0.3 })
    );
    tongue.position.set(0, 0.085, 0.02);
    shoeGroup.add(tongue);

    // Dây buộc giày trắng
    [-0.01, 0.02, 0.05].forEach(lz => {
      const lace = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.01, 0.015),
        new THREE.MeshStandardMaterial({ color: shoeWhite })
      );
      lace.position.set(0, 0.095, lz);
      shoeGroup.add(lace);
    });

    // Đế giày cao su màu trắng dày dặn
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.032, 0.24),
      new THREE.MeshStandardMaterial({ color: shoeWhite, roughness: 0.4 })
    );
    sole.position.set(0, 0.01, 0.01);
    sole.receiveShadow = true;
    shoeGroup.add(sole);

    legsGroup.add(shoeGroup);
  });

  parentGroup.add(legsGroup);

  if (config.scale) {
    const s = config.scale / 1.52;
    parentGroup.scale.set(s, s, s);
  }

  // ==================== 7. HOẠT ẢNH THỞ & QUAY ĐẦU TỰ NHIÊN ====================
  parentGroup.update = function(time) {
    const breath = Math.sin(time * 0.0028);
    torsoGroup.position.y = 1.05 + breath * 0.009;
    headGroup.position.y = 1.58 + breath * 0.012;

    // Đầu quay nhẹ ngắm nhìn lớp học và người chơi
    headGroup.rotation.y = Math.sin(time * 0.001) * 0.15;
    headGroup.rotation.z = Math.cos(time * 0.0012) * 0.03;

    // Hai cánh tay đung đưa nhẹ theo nhịp thở
    armLGroup.rotation.z = Math.sin(time * 0.002) * 0.04;
    armRGroup.rotation.z = -Math.sin(time * 0.002) * 0.04;
  };
}

/**
 * Tạo bàn tay có ngón tay chi tiết
 */
function createDetailedHand(skinMat, isRight) {
  const hand = new THREE.Group();

  // Lòng bàn tay
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.075, 0.035), skinMat);
  palm.castShadow = true;
  hand.add(palm);

  // Ngón cái
  const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.011, 0.045, 8), skinMat);
  thumb.position.set(isRight ? -0.038 : 0.038, -0.01, 0.018);
  thumb.rotation.z = isRight ? 0.65 : -0.65;
  hand.add(thumb);

  // 4 ngón tay con
  [-0.022, -0.007, 0.008, 0.023].forEach((fx, i) => {
    const fingerLen = i === 1 || i === 2 ? 0.052 : 0.045;
    const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.008, fingerLen, 8), skinMat);
    finger.position.set(fx, -0.055, 0);
    finger.castShadow = true;
    hand.add(finger);
  });

  return hand;
}

/**
 * Tạo họa tiết khuôn mặt Anime sắc nét (Canvas 1024x1024):
 * Mắt to hổ phách, 2 đốm sáng, lông mày thanh mảnh, má hồng & khóe miệng cười
 */
function createHighResFaceTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 1024);

  // Tọa độ hai mắt chuẩn tỷ lệ anime chibi
  const leftEyeCenter  = { x: 375, y: 495 };
  const rightEyeCenter = { x: 649, y: 495 };
  const eyeRadiusX = 74;
  const eyeRadiusY = 98;

  // 1. Hai vệt má hồng đào ửng mịn dưới mắt
  [350, 674].forEach(bx => {
    const gBlush = ctx.createRadialGradient(bx, 630, 8, bx, 630, 85);
    gBlush.addColorStop(0, 'rgba(251, 113, 133, 0.48)');
    gBlush.addColorStop(0.55, 'rgba(251, 113, 133, 0.22)');
    gBlush.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = gBlush;
    ctx.beginPath();
    ctx.ellipse(bx, 630, 85, 55, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 2. Vẽ đôi mắt to long lanh màu hổ phách
  [leftEyeCenter, rightEyeCenter].forEach((eye, eyeIdx) => {
    const isLeft = eyeIdx === 0;

    // Tròng trắng mắt hình hạnh nhân lớn
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(eye.x, eye.y, eyeRadiusX, eyeRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip(); // Giới hạn lòng đen bên trong tròng trắng

    // Tròng đen / Con ngươi màu Hổ phách (Amber / Hazel) nhiều tầng gradient
    const irisX = eye.x + (isLeft ? 5 : -5);
    const irisY = eye.y + 4;
    const irisR = 66;

    // Gradient màu hổ phách từ nâu đậm viền trên xuống vàng mật ong rực sáng bên dưới
    const gIris = ctx.createLinearGradient(irisX, irisY - irisR, irisX, irisY + irisR);
    gIris.addColorStop(0.0, '#1f1109'); // Nâu cà phê đậm viền trên
    gIris.addColorStop(0.28, '#4a250e');
    gIris.addColorStop(0.62, '#b45309'); // Nâu hổ phách ấm
    gIris.addColorStop(0.88, '#f59e0b');  // Vàng cam mật ong sáng
    gIris.addColorStop(1.0, '#fbbf24');

    ctx.fillStyle = gIris;
    ctx.beginPath();
    ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Viền đậm xung quanh con ngươi
    ctx.strokeStyle = '#180d06';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    // Đồng tử đen tuyền ở trung tâm
    ctx.fillStyle = '#0a0a0c';
    ctx.beginPath();
    ctx.ellipse(irisX, irisY + 2, 29, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vành sáng cánh cung bên dưới đồng tử
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(irisX, irisY + 8, 44, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // 2 Đốm sáng phản chiếu (Specular Glints) tạo độ long lanh như ảnh mẫu
    // Đốm sáng lớn góc trên bên phải
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(irisX + 18, irisY - 24, 18, 22, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Đốm sáng nhỏ góc dưới bên trái
    ctx.beginPath();
    ctx.arc(irisX - 22, irisY + 22, 10, 0, Math.PI * 2);
    ctx.fill();

    // Điểm sáng li ti thứ ba
    ctx.beginPath();
    ctx.arc(irisX + 22, irisY + 16, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Đường mi trên dày dặn, sắc nét phong cách hoạt hình
    ctx.strokeStyle = '#180d07';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(eye.x, eye.y - 10, eyeRadiusX + 2, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    // Nếp gấp mí mắt trên (Eyelid crease)
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y - 26, eyeRadiusX - 10, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();

    // Đường viền mi dưới nhẹ nhàng
    ctx.strokeStyle = '#57331b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y + 16, eyeRadiusX - 14, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();

    // Lông mày cong màu nâu sẫm thanh tú
    ctx.strokeStyle = '#271810';
    ctx.lineWidth = 12;
    ctx.beginPath();
    if (isLeft) {
      ctx.moveTo(eye.x - 65, eye.y - 120);
      ctx.quadraticCurveTo(eye.x - 10, eye.y - 148, eye.x + 55, eye.y - 126);
    } else {
      ctx.moveTo(eye.x - 55, eye.y - 126);
      ctx.quadraticCurveTo(eye.x + 10, eye.y - 148, eye.x + 65, eye.y - 120);
    }
    ctx.stroke();
  });

  // 3. Khóe miệng cười tươi tắn hiền hòa
  ctx.strokeStyle = '#881337';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(460, 735);
  ctx.quadraticCurveTo(512, 765, 564, 735);
  ctx.stroke();

  // Môi dưới phớt hồng
  ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
  ctx.beginPath();
  ctx.ellipse(512, 752, 26, 8, 0, 0, Math.PI);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  return tex;
}
