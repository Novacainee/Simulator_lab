# ĐẶC TẢ DỰ ÁN: PHÒNG THÍ NGHIỆM MẠCH ĐIỆN 3D (MODULAR MULTI-FILE ARCHITECTURE)

## 1. Mục tiêu Nâng cấp & Tái cấu trúc (Refactoring)
Chuyển đổi toàn bộ ứng dụng từ 1 file `.html` đơn lẻ hiện tại sang **kiến trúc dự án đa file (ES6 Modules)** sạch sẽ, chuyên nghiệp, dễ mở rộng và hỗ trợ nạp tài nguyên 3D bên ngoài (`.glb/.gltf`, textures, âm thanh).

---

## 2. Cấu trúc Thư mục Dự án (Directory Structure)
Yêu cầu khởi tạo và tách file `.html` gốc thành cấu trúc thư mục sau:

```text
project-root/
├── index.html                  # Giao diện khung HTML chính (3D HUD + 2D Studio Overlay)
├── PROJECT_SPEC.md             # Tài liệu đặc tả dự án
├── assets/
│   ├── models/                 # Chứa file 3D (.glb/.gltf) của học sinh, bàn ghế, cây cối (nếu có)
│   └── textures/               # Chứa ảnh texture sàn gỗ/gạch, bầu trời, cỏ (nếu có)
├── css/
│   ├── main.css                # Biến CSS, reset, bố cục chung
│   ├── hud3d.css               # Giao diện Menu 3D, Banner, Joystick ảo, Tooltip 3D
│   └── studio2d.css            # Giao diện bàn lắp mạch 2D, Khay linh kiện PhET, Inspector, Thẻ nhiệm vụ
└── js/
    ├── main.js                 # Điểm khởi chạy (Entry point), quản lý chuyển cảnh 3D <-> 2D
    ├── state.js                # Quản lý trạng thái toàn cục (S, comps, wires, chế độ Read-Only...)
    ├── audio/
    │   └── soundEngine.js      # Bộ tạo âm thanh Web Audio API (sfxClick, sfxZap, sfxBell, sfxWin)
    ├── physics/
    │   └── mnaSolver.js        # Bộ giải mạch điện thế nút biến đổi (MNA) + phát hiện đoản mạch/đứt cầu chì
    ├── data/
    │   └── challenges.js       # Dữ liệu 3 mạch mẫu, 4 màn Đo & Lắp, 4 ca Bác sĩ Mạch (kèm Gợi ý), Bộ câu hỏi Ký hiệu
    ├── studio2d/
    │   ├── renderer2d.js       # Vẽ Canvas 2D: Linh kiện PhET, Ký hiệu SGK, Hạt electron, Vôn kế 2 que đo
    │   ├── interaction2d.js    # Kéo thả linh kiện, nối dây, cắt dây, kéo que đo Đen/Đỏ, khóa Read-Only
    │   └── uiController2d.js   # Quản lý thanh Inspector, Trợ lý Robo, Ghim gợi ý, Trộn đáp án Quiz
    └── world3d/
        ├── sceneManager.js     # Khởi tạo Three.js Scene, Camera, Renderer, Shadows, Ánh sáng mặt trời
        ├── classroomBuilder.js # Dựng lớp học 3D (Tường có ô cửa sổ thật, sàn gạch, bảng đen, bàn ghế, đèn trần)
        ├── outdoorScenery.js   # Dựng cảnh ngoài cửa sổ: Bầu trời nắng nhẹ, mây, thảm cỏ xanh, cây xanh đung đưa
        ├── characterFactory.js # Tải mô hình học sinh .glb (GLTFLoader) + Procedural 3D chi tiết cao làm fallback
        └── controls3d.js       # Điều khiển giữ chuột xoay 360, cuộn chuột đi tới/lui, Joystick ảo, Bay nhanh (flyToZone)