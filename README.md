# ĐẶC TẢ DỰ ÁN: PHÒNG THÍ NGHIỆM MẠCH ĐIỆN 3D (KHTN THCS)

## 1. Tổng quan dự án
Dự án là một ứng dụng Web 3D kết hợp 2D tương tác (WebGL/Three.js + HTML5 Canvas + Web Audio API) phục vụ giảng dạy môn Khoa học Tự nhiên cấp THCS (chủ đề Điện học: Mạch điện, Cường độ dòng điện, Hiệu điện thế).
Học sinh có thể đi dạo trong một không gian lớp học/phòng bộ môn 3D trực quan, bước tới các khu vực chức năng (Xem mạch mẫu, Phòng Lab tự do, Khu Bác sĩ sửa mạch, Khu Ôn tập ký hiệu) và tương tác trực tiếp với bàn lắp mạch vật lý chuẩn PhET.

---

## 2. Cấu trúc kỹ thuật hiện có trong file `.html` (CẦN GIỮ NGUYÊN LÕI VẬT LÝ)
Khi nâng cấp giao diện 3D và phân quyền khu vực, **tuyệt đối giữ nguyên và không làm hỏng** các thành phần lõi sau đây đã hoạt động ổn định trong file `.html`:

1. **Bộ giải mạch vật lý MNA (`solveCircuit()`, `solveLinearSystem()`):**
   - Giải điện thế nút biến đổi theo thời gian thực cho mọi cấu hình mạch (đơn, nối tiếp, song song, hỗn hợp).
   - Tự động phát hiện đoản mạch nguồn (`S.shortCircuit`), đoản mạch do mắc Ampe kế song song (`S.ammeterShort`), nổ cầu chì khi `I > 2.5A`, cháy bóng đèn khi `U > 16V`.
2. **Thiết kế Ampe kế & Đồng hồ Hiệu thế (Vôn kế) chuẩn PhET:**
   - **Ampe kế (`type: 'ammeter'`):** Không phân biệt cực âm/dương, đo chiều nào cũng hiển thị giá trị cường độ dòng điện dương (`I >= 0.00 A`), điện trở nội `R ≈ 1e-5 Ω`.
   - **Đồng hồ Hiệu thế (`type: 'voltmeter'`, vẽ bằng `drawPhETVoltmeter()`):** Vỏ đen, mặt cam, màn hình trắng hiện `—` khi chưa đo. Có 2 que đo Đen (`p0`) và Đỏ (`p1`) kéo thả độc lập bằng chuột để chạm vào bất kỳ chốt linh kiện hoặc dây dẫn nào trên mạch.
3. **Chế độ hiển thị & Dòng hạt (`S.view`, `S.flow`):**
   - Chuyển đổi tức thì giữa **Hình ảnh thực tế PhET (`real`)** và **Sơ đồ ký hiệu SGK (`schem`)**.
   - Chuyển đổi giữa **Hạt Electron (`elec`: - sang +)**, **Dòng điện quy ước (`conv`: + sang -)** và **Ẩn hạt (`none`)**.
4. **Thanh chỉnh thông số chính xác (`updateInspector()`, `setCompVal()`):**
   - Kết hợp thanh trượt (`<input type="range">`) và ô nhập số trực tiếp (`<input type="number">`) cho Hiệu điện thế nguồn (`V`) và Điện trở (`Ω`).
   - Hàm `cleanZero()` và `fmt()` khử hoàn toàn lỗi hiển thị `-0.00 A`.
5. **Hệ thống Trợ lý Robo & Gợi ý ghim cố định (`unlockedHints`, `pinned-hints`):**
   - Trong chế độ **Bác sĩ Mạch (`doc`)**, không tự động tiết lộ lỗi của mạch đề bài.
   - Các gợi ý (`Gợi ý 1`, `Gợi ý 2`) sau khi bấm mở sẽ được ghim cố định trong bảng bên phải (`#taskBody`) và không bị mất đi khi người dùng bấm nút `✂️ Cắt dây`.
6. **Hệ thống trộn đáp án trắc nghiệm (`shuffleQuizOptions()`):**
   - Sử dụng thuật toán Fisher-Yates trộn ngẫu nhiên vị trí 4 phương án trả lời mỗi lần hiển thị câu hỏi ở chế độ **Đố vui Ký hiệu (`sym`)**.

---

## 3. YÊU CẦU NÂNG CẤP MỚI (DÀNH CHO ANTIGRAVITY TRIỂN KHAI)

### 3.1. Thiết kế lại Bối cảnh 3D: Phòng học bình thường có Cửa sổ nhìn ra Thiên nhiên nắng nhẹ
Thay thế căn phòng hộp kín màu tối hiện tại bằng một **Phòng học / Phòng bộ môn KHTN tươi sáng, chân thực và ấm cúng**:
- **Kiến trúc phòng học:**
  - Tường sơn màu kem sáng hoặc xanh nhạt dịu mắt, có len chân tường bằng gỗ, sàn lát gạch sáng bóng có phản xạ nhẹ (`MeshStandardMaterial`).
  - Trần nhà sáng có gắn các máng đèn huỳnh quang phát sáng ấm, bảng giáo viên, bàn giáo viên và kệ tủ đựng dụng cụ thí nghiệm.
- **Hệ thống Cửa sổ lớn (Windows) & Cảnh quan bên ngoài (Exterior Scenery):**
  - Ở bức tường bên trái (hoặc tường chính diện), thiết kế **2 đến 3 khung cửa sổ kính lớn trong suốt** (dùng các mảng tường ghép lại chừa ô cửa sổ thực sự thay vì một tấm phẳng kín).
  - **Nhìn qua cửa sổ ra bên ngoài:**
    - **Bầu trời nắng nhẹ:** Bầu trời xanh trong trẻo (`Sky` hoặc `HemisphereLight` kết hợp nền gradient xanh da trời sáng), có mây trắng nhẹ và những đám nắng chiếu xiên qua khung cửa sổ vào sàn lớp học (sử dụng `DirectionalLight` có bật `castShadow = true` để tạo bóng đổ khung cửa sổ xuống sàn nhà).
    - **Thảm cỏ xanh & Cây xanh:** Bên ngoài cửa sổ là một mặt phẳng địa hình thảm cỏ xanh mướt trải rộng, điểm xuyết các tán cây xanh 3D (thân gỗ, tán lá xanh nhiều lớp đung đưa nhẹ theo gió trong hàm `animate()`), hàng rào trường học và vài bụi hoa nhỏ.

### 3.2. Nâng cấp độ chi tiết của Nhân vật Học sinh 3D & Mô hình trên bàn
- Cải thiện hàm tạo nhân vật học sinh 3D đứng cạnh các bàn thí nghiệm:
  - Sử dụng vật liệu PBR (`MeshStandardMaterial` với `roughness`, `metalness` hợp lý) và các khối hình học bo tròn mượt mà.
  - Nhân vật có đầy đủ chi tiết: khuôn mặt dễ thương (mắt có tròng đen/trắng, miệng cười, tóc tạo kiểu), mặc đồng phục học sinh Việt Nam (áo sơ mi trắng có cổ áo và khăn quàng đỏ trên vai, quần/váy xanh tím than, giày thể thao), có tay cầm sổ tay hoặc chỉ tay vào mô hình mạch điện.
  - Thêm chuyển động thở nhẹ, quay đầu nhìn người chơi và vẫy tay nhẹ trong vòng lặp `animate()`.
  - *(Tùy chọn mở rộng)*: Hỗ trợ cấu trúc `GLTFLoader` có cơ chế fallback tự động về mô hình Procedural 3D chất lượng cao nếu không tìm thấy file `.glb` cục bộ.

### 3.3. Phân chia Không gian & Phân quyền Tương tác (4 Khu vực rõ rệt)

#### Khu vực 1: Khu Xem Mạch Mẫu (CHẾ ĐỘ CHỈ XEM - READ-ONLY MODE)
- **Bố trí 3D:** Dọc theo bức tường trong lớp học, đặt 3 bàn trưng bày mô hình mạch điện mẫu (*Mẫu 1: Mạch điện đơn*, *Mẫu 2: Hai đèn mắc nối tiếp*, *Mẫu 3: Hai đèn mắc song song*), mỗi bàn có 1 bạn học sinh 3D đứng thuyết trình bên cạnh và bảng sơ đồ minh họa trên tường.
- **Logic tương tác bắt buộc (`S.readOnly = true`):**
  - Khi người chơi click vào một trong 3 bàn mạch mẫu này, mở giao diện bàn mạch 2D ứng với mạch mẫu đó nhưng ở **Chế độ Chỉ Xem (View-Only / Read-Only)**:
    1. **KHÔNG ĐƯỢC CHỈNH SỬA CẤU TRÚC MẠCH:**
       - Ẩn hoàn toàn khay lấy linh kiện bên trái (`.comp-drawer`).
       - Ẩn các nút `✂️ Cắt dây`, `🗑 Xóa bàn`, và ẩn nút `🗑 Xóa` / `🔄 Xoay` trên thanh Inspector.
       - Khóa thao tác kéo dây mới từ các chốt (`wireStart = null`), khóa xóa dây khi double-click, và khóa kéo di chuyển vị trí các linh kiện cố định của mạch.
       - Khóa chỉnh sửa thanh trượt `U` và `R` (hoặc chỉ hiển thị thông số dạng văn bản tĩnh).
    2. **CÁC THAO TÁC ĐƯỢC PHÉP TRONG CHẾ ĐỘ XEM MẪU:**
       - Được phép **bấm đóng/mở Công tắc (Khóa K)** để quan sát đèn sáng/tắt và dòng hạt chạy.
       - Được phép **kéo 2 que đo Đen/Đỏ của Đồng hồ Hiệu thế (Vôn kế)** có sẵn trên bàn chạm vào các điểm trên mạch mẫu để xem số đo hiệu điện thế thực tế.
       - Được phép chuyển đổi qua lại giữa nút **Thực tế / Ký hiệu SGK** và đổi chế độ hiển thị **Hạt Electron / Dòng điện quy ước**.
       - Hiển thị một nhãn nổi rõ ràng ở phía trên: `👁️ CHẾ ĐỘ XEM MẠCH MẪU (Chỉ quan sát & Đo thử – Không chỉnh sửa cấu trúc)` kèm nút chuyển nhanh sang `🛠️ Mở trong Phòng Lab Tự Do` nếu học sinh muốn tự tay tháo lắp mạch đó.

#### Khu vực 2: Phòng Lab Tự Do (SANDBOX MODE - `S.readOnly = false`, `gmMode = 'free'`)
- **Bố trí 3D:** Khu bàn thí nghiệm lớn ở trung tâm phòng (hoặc góc phòng Lab thực hành) có Trợ lý Robo 3D đứng đón.
- **Logic tương tác:** Mở khóa toàn bộ 100% quyền chỉnh sửa: tự do lấy linh kiện từ khay bên trái (Dây nối, Pin, Đèn tròn, Điện trở, Công tắc, Cầu chì, Chuông điện, Ampe kế, Vôn kế), tự do nối dây, cắt dây, nhập thông số `U`, `R` chính xác và thử nghiệm các hiện tượng đoản mạch/nổ cầu chì.

#### Khu vực 3: Khu Thực Hành Sửa Mạch & Đo Đạc (`gmMode = 'doc'` và `gmMode = 'build'`)
- **Bố trí 3D:** Khu bàn thực hành chuyên biệt với biển hiệu **"KHU THỰC HÀNH: BÁC SĨ MẠCH & ĐO ĐẠC"**.
- **Logic tương tác:**
  - Mở quyền chỉnh sửa (`S.readOnly = false`) để học sinh giải quyết 4 màn **Thử thách Đo & Lắp** và 4 ca bệnh **Bác sĩ Mạch**.
  - Giữ nguyên cơ chế câu đố bí ẩn kèm nút `💡 Mở Gợi ý 1/2` được ghim cố định vào bảng nhiệm vụ bên phải.

#### Khu vực 4: Khu Ôn Tập & Ký Hiệu (`gmMode = 'sym'`)
- **Bố trí 3D:** Góc tường có biển hiệu lớn **"KHU ÔN TẬP & KÝ HIỆU"** cùng khối nút **PLAY** 3D màu vàng cam nổi bật (tương tự phong cách YooBook).
- **Logic tương tác:** Khi click vào nút PLAY 3D, mở giao diện câu hỏi trắc nghiệm nhận diện ký hiệu sơ đồ mạch điện và quy tắc mắc Ampe kế, Vôn kế (có đảo vị trí đáp án ngẫu nhiên mỗi lần lặp lại).

### 3.4. Hệ thống Điều khiển & Menu Điều hướng trong Phòng 3D
- **Giữ chuột trái + Di chuột:** Xoay góc nhìn camera 360 độ mượt mà.
- **Cuộn con lăn chuột (Wheel):** Tiến tới / lùi lại theo hướng nhìn.
- **Cụm nút Joystick ảo góc dưới phải + Phím WASD/Mũi tên:** Di chuyển tự do trong lớp học (có giới hạn va chạm với tường và cửa sổ).
- **Nút `☰ Menu Khu Vực` ở góc trên bên trái:** Cho phép chọn bay mượt mà (`flyToZone`) đến đứng trước:
  1. Khu Xem Mạch Mẫu (3 bàn mẫu)
  2. Phòng Lab Tự Do
  3. Khu Thực Hành Sửa Mạch (Bác sĩ Mạch)
  4. Khu Ôn Tập (Nút PLAY)
  5. Góc Cửa Sổ Ngắm Cảnh Sân Trường