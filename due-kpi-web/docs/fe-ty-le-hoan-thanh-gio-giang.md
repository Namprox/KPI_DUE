# Bàn giao Front-end: Tỷ lệ hoàn thành giờ giảng + tiêu chí chấm tự động `GIO_GIANG_TY_LE`

Tài liệu mô tả thay đổi backend để FE cập nhật cho khớp. Backend thêm 3 việc:

1. **Route mới** `GET api/gio-giang-tkb/ty-le-hoan-thanh`: tỷ lệ hoàn thành giờ giảng trong năm của
   từng giảng viên, kèm bảng giải trình giảm trừ định mức. Hỏi **một** người (`idNhanVien`) thì có thêm
   `DienGiai`: các dòng giải thích **vì sao** có từng con số (mục 2.1).
2. **Mã công thức mới** `GIO_GIANG_TY_LE` cho tiêu chí chấm tự động (`LoaiNguonDiem = 2`). Điểm quy từ
   tỷ lệ trên: ≥ 100% → 20; > 75% → 15; ≥ 50% → 10; < 50% → 0 (với `DiemToiDa = 20`).
3. **Toàn bộ phiếu KPI giảng viên năm 2026 bị xoá** để tạo lại theo mẫu có tiêu chí mới.

Không route nào bị đổi hay xoá. JSON dùng **PascalCase**.

⚠ Backend bật `NullValueHandling.Ignore`: field có giá trị `null` **không xuất hiện** trong JSON.
Type phía FE phải khai báo field đó là optional (`?:`) và coi `undefined` như `null`.

---

## Cách làm (dành cho người / agent sửa FE)

1. Đọc mục 1 để hiểu con số. **Không tự tính lại** tỷ lệ, định mức hay điểm ở FE: mọi con số lấy nguyên
   từ API. Backend dùng chung một hàm cho điểm ghi vào phiếu và cho endpoint này nên hai nơi luôn khớp.
2. Tìm trong code FE các chỗ liên quan bằng grep: `gio-giang-tkb`, `tong-hop`, `CongThucTongHop`,
   `NCKH_GIO_TY_LE` (danh sách mã công thức đang hardcode ở đâu thì mã mới cũng phải thêm ở đó),
   `diem-tu-dong`, `DiemTuDong`.
3. Làm theo mục 2 → 5. Tái sử dụng component bảng, bộ lọc năm / đơn vị, API client và kiểu response
   sẵn có của màn "Tổng hợp giờ giảng" (`api/gio-giang-tkb/tong-hop`). Không dựng mới nếu đã có.
4. Chạy type-check, lint, test của FE. Đi hết checklist ở mục 6.

---

## 1. Con số được tính thế nào (chỉ để hiển thị cho đúng, không tính lại)

```
TyLeHoanThanh (%) = TongGio × 100 / DinhMucApDung
TongGio           = GioTkb + GioKeKhai + GioQndb
DinhMucApDung     = DinhMucGoc − (tổng các cột Giam*) − DieuChinhSan0
```

- `DinhMucGoc`: định mức giờ giảng theo chức danh (270).
- Mỗi giờ bị giảm nằm ở **đúng một** cột `Giam*`, nên bảng giải trình cộng lại khớp (lệch làm tròn ≤ 0,01 / cột).
- `DieuChinhSan0` ≤ 0: phần giảm vượt quá định mức bị cắt vì định mức không âm. Thường là 0.

| Field | Ý nghĩa hiển thị |
|---|---|
| `GiamChuaVaoTruong` | Thời gian trước ngày bắt đầu làm việc tại Trường |
| `GiamTapSu` | Tập sự / thử việc (định mức = 0 trong thời gian này) |
| `GiamNghi` | Nghỉ BHXH / theo Bộ luật Lao động |
| `GiamDaoTao` | Được cử đi đào tạo |
| `GiamChucVu` | Giảm theo tỷ lệ định mức của chức vụ |
| `GiamConNho10` | Con nhỏ tháng 13–36: giảm 10% định mức |
| `GiamCongDoan` | Chức vụ công đoàn: giảm số giờ cố định (44h / 22h) |
| `GiamConNho40` | Con nhỏ tháng 7–12: giảm 40 giờ |
| `GiamDacBietHt` | Giảm đặc biệt do Hiệu trưởng quyết định |
| `GioQndb` | Huấn luyện QNDB / tự vệ: 2,5 giờ / ngày, **cộng vào giờ thực hiện** (không phải khoản giảm) |
| `SoThangMien` / `SoThangNam` | Số tháng được miễn định mức / số tháng của năm (12) |

---

## 2. Route mới: `GET api/gio-giang-tkb/ty-le-hoan-thanh`

Query:

| Tham số | Bắt buộc | Ý nghĩa |
|---|---|---|
| `idNam` | có | Năm đánh giá, vd `2026` |
| `idDonVi` | không | Lọc hiển thị: đơn vị đó hoặc đơn vị con một cấp. **Không** phải phân quyền |
| `idNhanVien` | không | Chỉ lấy một người. Bằng id người đang đăng nhập → giảng viên **tự xem** của mình |

Quyền (backend tự kiểm, FE chỉ cần ẩn / hiện menu cho hợp lý):
- ADMIN / Hiệu trưởng: xem toàn trường.
- Trưởng khoa / Trưởng phòng (TK, TKL, TP): xem đơn vị mình giữ chức vụ và các đơn vị cấp dưới.
- Mọi người: xem dòng của chính mình bằng `idNhanVien = IdNhanVien` của `GET api/auth/me`.
- Còn lại → **403** `ErrorCode = "FORBIDDEN"`.

Lỗi khác: **400** `INVALID` (thiếu hoặc sai `idNam` / `idNhanVien`), **404** `NOT_FOUND` (không có năm đánh giá).

Response 200 dùng chung bao `GioGiangTkbResponse` như các route `gio-giang-tkb` khác:

```json
{
  "Success": true,
  "Message": "Lay ty le hoan thanh gio giang trong nam thanh cong.",
  "SoDongChuaAnhXa": 73,
  "TyLeHoanThanh": [
    {
      "IdNhanVien": 214, "MaNhanVien": "GV0001", "HoTen": "Nguyễn Văn A",
      "IdDonVi": 12, "MaDonVi": "K_LUAT", "TenDonVi": "Khoa Luật",
      "MaChucDanh": "GV", "TenChucDanh": "Giảng viên", "IdNam": 2026,
      "DinhMucGoc": 270.00, "SoThangNam": 12.0000, "SoThangMien": 0.0000,
      "GiamChuaVaoTruong": 0.00, "GiamTapSu": 0.00, "GiamNghi": 0.00, "GiamDaoTao": 0.00,
      "GiamChucVu": 0.00, "GiamConNho10": 15.60, "GiamCongDoan": 0.00, "GiamConNho40": 33.77,
      "GiamDacBietHt": 0.00, "DieuChinhSan0": 0.00, "DinhMucApDung": 220.63,
      "GioTkb": 634.50, "GioKeKhai": 0.00, "GioQndb": 0.00, "TongGio": 634.50,
      "TyLeHoanThanh": 287.59,
      "DiemDuKien": 20.00, "DiemToiDa": 20.00
    }
  ]
}
```

Các field có thể **vắng mặt** (tức là null):

| Field | Vắng khi | FE hiển thị |
|---|---|---|
| `TyLeHoanThanh` | không tính được, xem `LyDo` | "—" kèm nhãn lý do |
| `DinhMucApDung`, `DinhMucGoc`, `SoThangNam`, `SoThangMien` | chưa có chức danh / định mức, hoặc dữ liệu cần kiểm tra | "—" |
| `DiemDuKien` | **không chấm tự động** (`LyDo` = `MIEN_TOAN_BO` / `DU_LIEU_CAN_KIEM_TRA`) | "Không chấm tự động" |
| `LyDo`, `CanhBao` | không có lý do / cảnh báo | không hiện gì |
| `IdDonVi`, `MaDonVi`, `TenDonVi`, `MaChucDanh`, `TenChucDanh` | thiếu dữ liệu nhân sự | "—" |

`LyDo` (khi `TyLeHoanThanh` vắng). Nhãn tiếng Việt do FE map:

| Mã | Nhãn gợi ý | Điểm |
|---|---|---|
| `CHUA_CO_CHUC_DANH` | Chưa có chức danh nghề nghiệp | 0 |
| `CHUA_CAU_HINH_DINH_MUC` | Chưa cấu hình định mức cho chức danh / năm | 0 |
| `DINH_MUC_BANG_0` | Định mức sau giảm trừ bằng 0 | 0 |
| `MIEN_TOAN_BO` | Được miễn định mức cả năm (đi học, tập sự…) | Không chấm tự động |
| `DU_LIEU_CAN_KIEM_TRA` | Số tháng miễn vượt quá năm, cần kiểm tra file giảm trừ | Không chấm tự động |
| `KHONG_TIM_THAY_NHAN_VIEN`, `NAM_KHONG_TON_TAI` | Dữ liệu không hợp lệ | 0 |

`CanhBao`: chuỗi nhiều mã nối bằng `;`. FE `split(';')` rồi hiện thành badge hoặc tooltip. Cảnh báo
**không** làm đổi điểm.

| Mã | Nhãn gợi ý |
|---|---|
| `CHUA_CO_DU_LIEU_GIAM_TRU` | Chưa có dữ liệu file giảm trừ năm này. Hiện chỉ tính giảm theo chức vụ |
| `CHUC_VU_DOI_TRONG_NAM` | Chức vụ thay đổi trong năm. Kiểm tra lịch sử chức vụ đã nhập đủ chưa |
| `TAP_SU_KIEM_TRA_TRAN_50` | Đang tập sự và vượt 50% định mức. Kiểm tra trần khối lượng được giao |
| `THANG_MIEN_VUOT_NAM` | Số tháng miễn vượt quá số tháng của năm |

Mã lạ (backend thêm sau này): hiện nguyên mã, **không** được làm vỡ UI.

`SoDongChuaAnhXa > 0`: còn dòng giờ giảng TKB chưa gán được vào giảng viên, nên số liệu chưa đầy đủ.
Hiện banner cảnh báo giống màn "Tổng hợp giờ giảng" (nếu màn đó đã có banner này thì tái sử dụng).

**Hiệu năng:** gọi toàn trường mất vài giây vì tính theo từng ngày cho mỗi người. Hiện loading, không
gọi lại mỗi lần gõ phím, và không tự refetch định kỳ.

### 2.1. `DienGiai`: vì sao có từng con số

Chỉ có khi gọi với `idNhanVien`. Gọi toàn trường thì field **vắng mặt**, nên muốn xem chi tiết một dòng
phải gọi lại với `idNhanVien` của dòng đó. Mảng đã sắp theo `ThuTu`.

Mỗi phần tử thuộc **đúng một** cột tổng theo `KhoanMuc`. Tổng `SoGio` các phần tử cùng `KhoanMuc` **bằng
đúng** cột tổng đó; backend đã đảm bảo, FE không phải cộng lại để kiểm.

```json
"DienGiai": [
  { "IdNhanVien": 440, "ThuTu": 1, "KhoanMuc": "DINH_MUC_GOC", "SoGio": 270.00 },
  { "IdNhanVien": 440, "ThuTu": 2, "KhoanMuc": "TAP_SU",
    "TuNgay": "2026-01-01T00:00:00", "DenNgay": "2026-06-30T00:00:00",
    "NguonTuNgay": "2025-07-01T00:00:00", "NguonDenNgay": "2026-06-30T00:00:00",
    "KhoiTuNgay": "2026-01-01T00:00:00", "KhoiDenNgay": "2026-06-30T00:00:00", "KhoiSoThang": 6.0000,
    "SoThang": 6.0000, "SoGio": 135.00, "CongThuc": "270 x 6 / 12 = 135", "GhiChu": "DO_THEO_NGAY" },
  { "IdNhanVien": 440, "ThuTu": 3, "KhoanMuc": "DAO_TAO",
    "TuNgay": "2026-09-01T00:00:00", "DenNgay": "2026-12-31T00:00:00",
    "NguonTuNgay": "2026-09-01T00:00:00", "NguonDenNgay": "2030-08-01T00:00:00",
    "SoThang": 4.0000, "SoGio": 90.00, "CongThuc": "270 x 4 / 12 = 90", "GhiChu": "DO_THEO_NGAY" },
  { "IdNhanVien": 440, "ThuTu": 4, "KhoanMuc": "GIO_TKB", "IdGioGiangTkb": 1234,
    "TenNguon": "Nguyễn Văn A - Du lịch", "SoLop": 3, "SoTiet": 90, "SoGio": 117.00 }
]
```

Ngày trả dạng `"yyyy-MM-ddT00:00:00"`: chỉ lấy phần ngày, hiển thị `dd/MM/yyyy`. Field null bị bỏ khỏi JSON
như mọi chỗ khác.

**Mẫu hiển thị từng loại dòng.** Chỉ dùng field có mặt. `CongThuc` là biểu thức dựng sẵn (dấu phẩy
thập phân), hiện nguyên văn ở cột "Cách tính".

| `KhoanMuc` | Nhãn | Câu diễn giải gợi ý |
|---|---|---|
| `DINH_MUC_GOC` | Định mức gốc | "Theo chức danh {TenChucDanh của dòng tổng}" |
| `CHUA_VAO_TRUONG` | Trước ngày vào Trường | "Bắt đầu làm việc {NguonDenNgay}; không tính định mức {TuNgay}–{DenNgay}" |
| `TAP_SU` | Tập sự / thử việc | "Tập sự {NguonTuNgay}–{NguonDenNgay}; trong năm {TuNgay}–{DenNgay}" |
| `NGHI` | Nghỉ BHXH / theo BLLĐ | "Nghỉ {NguonTuNgay}–{NguonDenNgay}; trong năm {TuNgay}–{DenNgay}" |
| `DAO_TAO` | Được cử đi đào tạo | "Đào tạo {NguonTuNgay}–{NguonDenNgay}; trong năm {TuNgay}–{DenNgay}" |
| `CHUC_VU` | Giảm theo chức vụ | "{TenNguon} (giảng {TyLe×100}% định mức), giữ từ {NguonTuNgay} đến {NguonDenNgay, vắng thì 'nay'}; áp dụng {TuNgay}–{DenNgay}" |
| `CONG_DOAN` | Chức vụ công đoàn | "{TenNguon}: giảm {GioNam} giờ/năm; áp dụng {TuNgay}–{DenNgay}" |
| `CON_NHO_10` | Con nhỏ 13–36 tháng | "Con sinh {NgaySinhCon}: tháng 13–36 là {NguonTuNgay}–{NguonDenNgay}; trong năm {TuNgay}–{DenNgay}, giảm {TyLe×100}%" |
| `CON_NHO_40` | Con nhỏ 7–12 tháng | "Con sinh {NgaySinhCon}: tháng 7–12 là {NguonTuNgay}–{NguonDenNgay}; phần tính trong năm {TuNgay}–{DenNgay}" |
| `DAC_BIET_HT` | Giảm đặc biệt (Hiệu trưởng) | — |
| `DIEU_CHINH_SAN_0` | Điều chỉnh (không để định mức âm) | "Tổng giảm vượt định mức; phần vượt không tính" |
| `GIO_TKB` | Giờ theo TKB | "{TenNguon}: {SoLop} lớp, {SoTiet} tiết". Link tới chi tiết lớp `GET api/gio-giang-tkb/{IdGioGiangTkb}/chi-tiet` nếu FE đã có màn đó |
| `GIO_KE_KHAI` | Kê khai Phụ lục II | "Bản kê #{IdKeKhai}, phần Đại học" (`TenNguon` = `DH`) hoặc "phần Sau đại học" (`SDH`) |
| `GIO_QNDB` | Huấn luyện QNDB / tự vệ | "{SoNgay} ngày × 2,5 giờ" |

Với dòng miễn theo thời gian (`CHUA_VAO_TRUONG`, `TAP_SU`, `NGHI`, `DAO_TAO`) có `KhoiTuNgay`: nếu khối rộng
hơn đoạn của dòng thì thêm một câu "Gộp chung khối miễn {KhoiTuNgay}–{KhoiDenNgay} = {KhoiSoThang} tháng".

`GhiChu`: chuỗi mã nối bằng `;`. FE `split(';')` và hiện thành tooltip hoặc chú thích nhỏ dưới dòng. Mã lạ
thì hiện nguyên mã.

| Mã | Chú thích gợi ý |
|---|---|
| `DO_THEO_NGAY` | Tính theo số ngày thực tế trong tháng |
| `THEO_COT_O` | Số tháng lấy theo cột "Thời gian không làm việc" của file giảm trừ (tháng tròn) |
| `COT_O_KHONG_CONG_THEM` | Đã gộp với tập sự / đào tạo, không cộng thêm số tháng ở cột O |
| `COT_O_KHONG_CO_NGAY` | File có số tháng không làm việc nhưng không ghi ngày cụ thể |
| `MIEN_TOAN_BO` | Được miễn định mức cả năm |
| `THANG_MIEN_VUOT_NAM` | Số tháng miễn vượt quá năm, cần kiểm tra file giảm trừ |
| `QUY_DOI_THEO_COT_O` | Số tháng đã quy đổi theo cột O |
| `TU_NGAY_BU_TU_COT_I` | Ngày bắt đầu chức vụ lấy theo file giảm trừ |
| `KIEM_NHIEM_LAY_TY_LE_THAP_NHAT` | Kiêm nhiệm nhiều chức vụ, áp tỷ lệ giảm nhiều nhất |
| `NHIEU_CON_KHONG_CONG_DON` | Nhiều con cùng độ tuổi, chỉ giảm một lần |
| `CUA_SO_VAT_NAM` | Một phần thời gian thuộc năm khác, chỉ tính phần trong năm |
| `TRUNG_THOI_GIAN_MIEN` | Trùng thời gian đã được miễn, phần trùng không trừ thêm |

`SoGio` vắng mặt (chỉ xảy ra khi `LyDo = DU_LIEU_CAN_KIEM_TRA`): dòng chỉ để xem số tháng. Hiện "—" ở cột
giờ.

---

## 3. Màn hình cần làm

### 3.1. Màn "Tỷ lệ hoàn thành giờ giảng" (quản lý)

Đặt cạnh màn "Tổng hợp giờ giảng" (cùng nhóm menu giờ giảng). Hiện với ADMIN, HT, TK, TKL, TP. Dùng
chính cách màn tổng hợp đang quyết định hiện menu, không tự chế luật quyền mới.

- Bộ lọc: năm (bắt buộc), đơn vị (tuỳ chọn). Tái sử dụng bộ lọc của màn tổng hợp.
- Bảng: Mã NV, Họ tên, Đơn vị, Chức danh, Định mức gốc, **Định mức áp dụng**, Tổng giờ, **Tỷ lệ (%)**,
  **Điểm dự kiến / Điểm tối đa**, Lý do / Cảnh báo.
- Tỷ lệ: hiện 2 chữ số thập phân + `%`. Tô màu theo bậc điểm, dựa vào `DiemDuKien` so với `DiemToiDa`,
  **không** tự so ngưỡng 100 / 75 / 50. Tỷ lệ rất lớn (vd 12 591%) là hợp lệ khi người đó được miễn gần
  trọn năm, định mức còn vài giờ. Đừng coi là lỗi, đừng cắt số.
- Mở rộng dòng (hoặc drawer): gọi lại route với `idNhanVien` của dòng đó (lazy, chỉ khi mở) để lấy
  `DienGiai`. Hiện bảng giải trình **theo nhóm `KhoanMuc`**:
  - dòng nhóm = nhãn khoản mục + cột tổng tương ứng (vd "Được cử đi đào tạo — 67,5");
  - bên dưới là từng phần tử `DienGiai` của khoản đó: câu diễn giải (mục 2.1), cột "Cách tính" = `CongThuc`,
    cột giờ = `SoGio`, chú thích từ `GhiChu`.

  Thứ tự: định mức gốc → các khoản giảm → dòng kết quả `DinhMucGoc − tổng giảm = DinhMucApDung` → nhóm giờ
  thực hiện (TKB, kê khai, QNDB) → `TongGio`. Khoản có cột tổng bằng 0 và không có dòng nào thì ẩn.
  Không cộng lại `SoGio` để suy ra cột tổng: dùng cột tổng của dòng chính.
- Sắp xếp / lọc phía client: theo đơn vị, theo tỷ lệ, "chỉ dòng có cảnh báo", "chỉ dòng không chấm tự động".
- Xuất Excel: nếu màn tổng hợp đã có nút xuất thì làm tương tự với đủ các cột trên.

### 3.2. Giảng viên tự xem

Ở trang cá nhân hoặc trang phiếu KPI của giảng viên, thêm thẻ "Giờ giảng năm {năm}":
gọi route với `idNhanVien = IdNhanVien` của `GET api/auth/me` (response có luôn `DienGiai`). Hiện tổng giờ,
định mức áp dụng, tỷ lệ, điểm dự kiến và bảng giải trình như 3.1. Chỉ hiện khi người dùng thuộc đơn vị có
`LoaiDoiTuong == 1` (giảng viên) trong `GET api/auth/me`.

---

## 4. Tiêu chí và mẫu đánh giá

### 4.1. Form tiêu chí `api/tieuchidanhgia`

Body không đổi. Chỉ thêm giá trị hợp lệ mới cho `CongThucTongHop`:

```json
{ "TenTieuChi": "Hoàn thành định mức giờ giảng", "IdNhom": <nhóm>, "DiemToiDa": 20,
  "LoaiThangDiem": 1, "LoaiNguonDiem": 2, "CongThucTongHop": "GIO_GIANG_TY_LE",
  "LoaiDoiTuong": 1 }
```

- Danh sách mã công thức mà FE đang hardcode (dropdown, map nhãn…) thì thêm
  `GIO_GIANG_TY_LE` với nhãn "Tỷ lệ hoàn thành định mức giờ giảng".
- Sau khi tạo tiêu chí, tạo 4 mức thang điểm qua `api/thangdiem`: 20, 15, 10, 0. Đây là luồng sẵn có, FE
  không phải làm thêm. Nhãn gợi ý: "≥ 100%", "> 75% đến < 100%", "≥ 50% đến ≤ 75%", "< 50%".

### 4.2. Xem trước điểm tự động `GET api/maudanhgia/{id}/diem-tu-dong`

Shape không đổi. **Nghĩa của `DiemTuDong` vắng mặt (null) mở rộng thêm:** trước đây chỉ có nghĩa là
"mã chưa hỗ trợ". Nay với `CongThucTongHop == "GIO_GIANG_TY_LE"` nó có nghĩa là **"không chấm tự động"**
(người được miễn định mức cả năm, hoặc dữ liệu cần kiểm tra).

Việc FE cần làm:
- Dòng có mã này và `DiemTuDong` vắng → hiện "Không chấm tự động", **không** hiện "Chưa hỗ trợ".
- Muốn giải thích cách tính cho dòng này: gọi route mục 2 với `idNhanVien` của dòng đó. Route preview
  **không** trả chi tiết giờ giảng (khác `NCKH_GIO_TY_LE` có `DuLieuGioNckh`).

### 4.3. Chi tiết phiếu `GET api/phieu/{id}`

Dòng tiêu chí `GIO_GIANG_TY_LE` là dòng tự động (`LoaiNguonDiem = 2`), hiển thị như các dòng tự động
khác. Người được miễn cả năm có dòng này **đã chốt nhưng điểm trống**: hiện "Không chấm tự động",
không hiện `0` hay `NaN`. Có thể thêm link "Xem cách tính" mở dữ liệu mục 2 của chủ phiếu.

---

## 5. Phiếu giảng viên năm 2026 bị xoá

Trước khi bản FE này lên, backend xoá cứng toàn bộ phiếu cá nhân của giảng viên năm 2026, gồm cả phiếu đã nộp / đã chốt
(`App_Data/xoa_phieu_giang_vien.sql`), cùng các tờ trình KPI Khoa không còn phiếu nào. Phiếu
viên chức / NLĐ và phiếu đơn vị **không** bị xoá.

Việc FE cần kiểm tra (thường không phải sửa code):
- `GET api/phieu/me/{idNam}` trả rỗng → màn "Phiếu của tôi" phải hiện trạng thái **chưa có phiếu** và nút
  tạo phiếu như với người mới, không crash, không hiện phiếu cũ từ cache.
- **Xoá cache** (localStorage, state persist, query cache) đang giữ id phiếu, chi tiết phiếu hay nháp
  tự đánh giá của năm 2026. Id cũ sẽ trả 404.
- Danh sách chờ duyệt của Khoa / Trường, màn tờ trình KPI Khoa: hiện đúng trạng thái rỗng.

---

## 6. Kiểm tra sau khi sửa

- [ ] Tài khoản ADMIN: màn "Tỷ lệ hoàn thành giờ giảng" năm 2026 tải được. Bảng giải trình của một dòng
      cộng lại đúng `DinhMucApDung`.
- [ ] Tài khoản Trưởng khoa: chỉ thấy người của khoa mình. Tài khoản giảng viên vào màn quản lý thì nhận
      403 và FE hiện thông báo, không trắng trang.
- [ ] Giảng viên tự xem (`idNhanVien` = chính mình): thẻ giờ giảng hiện đúng.
- [ ] Mở giải trình một dòng: mỗi khoản có các dòng con kèm khoảng ngày, "Cách tính" và chú thích `GhiChu`.
      Ca kiểm: người vào trường giữa năm và tập sự đến 30/06 hiện 2 dòng ("Trước ngày vào Trường", "Tập sự")
      cùng một khối 6 tháng; người kiêm nhiệm hiện chú thích "áp tỷ lệ giảm nhiều nhất".
- [ ] Gọi toàn trường không có `DienGiai` và FE không lỗi vì thiếu field này.
- [ ] Dòng `MIEN_TOAN_BO`: tỷ lệ "—", điểm "Không chấm tự động". Dòng có `CanhBao` nhiều mã: hiện đủ badge.
- [ ] Field vắng mặt (null bị bỏ khỏi JSON) không gây lỗi runtime: không `undefined.toFixed`, không `NaN`.
- [ ] Tạo được tiêu chí với `CongThucTongHop = GIO_GIANG_TY_LE`. Preview điểm tự động của mẫu hiện đúng
      "Không chấm tự động" thay vì "Chưa hỗ trợ".
- [ ] Màn "Phiếu của tôi" năm 2026 hiện trạng thái chưa có phiếu và tạo được phiếu mới.
- [ ] Grep FE: mọi danh sách mã công thức đang có `NCKH_GIO_TY_LE` đều đã có `GIO_GIANG_TY_LE`.
- [ ] Type-check, lint, test FE đều qua.
