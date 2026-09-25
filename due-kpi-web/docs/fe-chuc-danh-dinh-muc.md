# Bàn giao Front-end: Chức danh nghề nghiệp mới + định mức chỉ còn giờ giảng

Tài liệu này mô tả các thay đổi backend đã deploy để sửa FE cho khớp. Backend thay đổi 3 việc:

1. **Danh mục chức danh nghề nghiệp** thay bằng danh sách chính thức (24 mã). Có 6 mã cũ bị **xoá hẳn**.
2. **Định mức giảng viên chỉ còn giờ giảng** (270 giờ). Bỏ hẳn định mức giờ NCKH và giờ PVCĐ.
3. **"Đủ định mức giờ NCKH"** khi Trưởng khoa chốt hồ sơ giờ do **Trưởng khoa tick tay**.
   Hệ thống không còn tự đối chiếu, không còn gợi ý.

Không có route mới và không có route nào bị xoá. Chỉ có **field bị bỏ** khỏi request/response.
JSON dùng **PascalCase**. Response có dạng `{ Success, Message, Item | Items | Data, ... }`.

---

## Cách làm (dành cho người/agent sửa FE)

1. Tìm trong code FE mọi chỗ dùng các field ở **mục 2** và **mục 3** (grep đúng tên field, kể cả
   trong type/interface, form schema, validator, mock, test, i18n).
2. Xoá hoặc sửa theo hướng dẫn từng mục. **Không** giữ field cũ với giá trị mặc định: backend
   không còn đọc chúng nên giá trị FE gửi lên sẽ bị bỏ qua lặng lẽ.
3. Không hardcode id hay mã chức danh. Danh sách luôn lấy từ `GET api/chuc-danh-nghe-nghiep`.
4. Chạy type-check, lint và test của FE sau khi sửa.

---

## 1. Danh mục chức danh nghề nghiệp

`GET api/chuc-danh-nghe-nghiep`: shape response **không đổi**
(`IdChucDanh, MaChucDanh, TenChucDanh, MoTa, TrangThai`). Chỉ có dữ liệu thay đổi:

| Thay đổi | Chi tiết |
|---|---|
| Giữ nguyên id | `GV`(3), `GVC`(4), `GVCC`(5), `CV`(8), `NCV`(10) |
| **Đã xoá** | `TROGIANG`(1), `TAPSU`(2), `GS`(6), `PGS`(7), `NV`(9), `KHAC`(11). Các id này không còn tồn tại |
| Thêm mới | `HDLD_GV` (HĐLĐ/Giảng viên), `HDLD_HUU`, `KS`, `KTV`, `YS`, `CVC`, `TVV`, `KTV_TC`, `KTV_C`, `NV_PV68`, `NV_BV68`, `NV_KT68`, `HDLD_BV`, `HDLD_DC`, `HDLD_CTVP`, `HDLD_CNTT`, `HDLD_CTDT`, `HDLD_KNST`, `HDLD_CTD` |

**Ngạch giảng dạy** (người ở Khoa được chấm theo mẫu giảng viên) = `GV, GVC, GVCC, HDLD_GV`.

Việc FE cần làm:
- **Xoá mọi chỗ hardcode** mã hoặc id chức danh cũ, ví dụ: map `PGS`/`GS` sang nhãn, danh sách
  `['GV','GVC','GVCC','PGS','GS']` để nhận diện giảng viên, dropdown tĩnh, filter mặc định theo id 1–11.
- **Không tự suy "là giảng viên" từ chức danh.** Dùng `DonVi[].LoaiDoiTuong` của `GET api/auth/me`
  (1 = Giảng viên, 2 = Viên chức/NLĐ) như hiện tại. Nếu FE đang tự suy ở đâu đó thì thay bằng field này.
- **Tên chức danh có thể dài** (dài nhất: "HĐLĐ/ Hỗ trợ công tác khởi nghiệp và đổi mới sáng tạo")
  và có ký tự `/`. Kiểm tra dropdown, bảng, badge: không vỡ layout, dùng ellipsis kèm tooltip nếu cần.
- **Dropdown chọn chức danh** (màn nhân viên, lịch sử chức danh `api/nhan-vien-chuc-danh`, định mức):
  vẫn lọc `TrangThai == true` như cũ. Không có thay đổi API.
- **Cache hoặc localStorage** có lưu danh mục chức danh cũ thì phải invalidate.

---

## 2. Định mức giảng viên: chỉ còn giờ giảng

### 2.1. CRUD định mức: `api/dinhmucgiangvien`

| Method | Route | Thay đổi |
|---|---|---|
| GET | `api/dinhmucgiangvien` (và `?chucDanhId=&namId=`) | Item **không còn** `GioNckh` |
| GET | `api/dinhmucgiangvien/{id}` | Item **không còn** `GioNckh` |
| POST | `api/dinhmucgiangvien` | Body **bỏ** `GioNckh` |
| PUT | `api/dinhmucgiangvien/{id}` | Body **bỏ** `GioNckh` |

Shape mới của `DinhMucGiangVienDto`:
```json
{ "IdDinhMuc": 1, "IdChucDanh": 3, "MaChucDanh": "GV", "TenChucDanh": "Giảng viên",
  "IdNam": 2026, "GioGiangLyThuyet": 270.00, "MoTa": null }
```
Body create/update: `{ IdChucDanh, IdNam, GioGiangLyThuyet, MoTa }`.

Việc FE cần làm (màn "Định mức giảng viên"):
- Xoá cột **"Giờ NCKH"** (và "Giờ PVCĐ" nếu có) khỏi bảng danh sách.
- Xoá ô nhập **Giờ NCKH** khỏi form thêm/sửa, cùng validation của ô đó.
- Nhãn còn lại: "Giờ giảng lý thuyết (giờ/năm)".
- Dữ liệu hiện có: 4 dòng năm 2026 (GV, GVC, GVCC, HĐLĐ/Giảng viên), mỗi dòng **270**.

### 2.2. Định mức áp dụng: `GET api/dinh-muc-giang-vien/ap-dung/{idNv}/{idNam}`

`Data` (kiểu `DinhMucApDungDto`) **bỏ** 7 field sau:
`TyLeNckhChucVu`, `GioNckhBase`, `GioPvcdBase`, `GioNckhApDung`, `GioPvcdApDung`, `HeSoNckhApDung`, `MienNckh`.

Shape mới:
```json
{ "IdNhanVien": 8, "IdNam": 2026, "IdChucDanh": 3, "TenChucDanh": "Giảng viên",
  "IdChucVuApDung": 33, "TenChucVuApDung": "Thư ký Khoa", "TyLeGiangChucVu": 1.0,
  "GioGiangBase": 270.00, "GioGiangApDung": 270.00,
  "LyDoDieuChinh": null, "NgoaiLeApDung": [] }
```

Việc FE cần làm: mọi thẻ hoặc bảng đang hiện "Định mức NCKH", "Định mức PVCĐ", "Hệ số NCKH",
"Miễn NCKH", "Tỷ lệ NCKH theo chức vụ" lấy từ API này thì **xoá**. Chỉ giữ khối giờ giảng
(gốc, tỷ lệ chức vụ, áp dụng, lý do điều chỉnh). `LyDoDieuChinh` giờ chỉ nói về giờ giảng.

`GET api/dinh-muc-giang-vien/gio-nckh-thuc-te/{idNv}/{idNam}`: **không đổi**.

---

## 3. Màn "Chốt hồ sơ" của Trưởng khoa

### 3.1. `GET api/phieu/{id}/xem-truoc-chot?duNckh=&khongViPham=&qd838=`

Response **bỏ** 4 field:
`DuDinhMucGioNckhTuDong`, `GioNckhThucTe`, `GioNckhDinhMucApDung`, `MienNckh`.

Vẫn giữ: `DuDinhMucGioNckhApDung` (giá trị thật dùng để tính `XepLoaiDeXuat`), `CanhBaoDinhMuc`
và toàn bộ phần còn lại.

Hành vi mới của query `duNckh`:
- Có gửi thì dùng đúng giá trị đó (như cũ).
- **Bỏ trống** thì lấy giá trị đã lưu trên phiếu. Chưa lưu thì mặc định **false**.
  Trước đây trường hợp bỏ trống lấy kết luận tự động; nay backend không còn kết luận tự động.

Việc FE cần làm:
- Checkbox **"Đủ định mức giờ NCKH"** là **tick tay thuần**:
  - Xoá phần hiện "Hệ thống: Đạt / Chưa đạt", "thực tế X / định mức Y giờ", "Được miễn NCKH".
  - Giá trị ban đầu của checkbox = `DuDinhMucGioNckhApDung` của lần gọi đầu (không gửi `duNckh`).
  - Mỗi lần tick hoặc bỏ tick, gọi lại endpoint với `duNckh=true|false` (như cũ) để lấy
    `XepLoaiDeXuat` và `CacMucChonDuoc` mới.
- Checkbox chỉ hiện với phiếu giảng viên (`LoaiDoiTuong == 1`), như cũ.
- Vẫn hiển thị `CanhBaoDinhMuc` khi khác null. Lỗi này xảy ra khi GV chưa có chức danh hoặc chưa
  có định mức giờ giảng; bấm Chốt sẽ bị 400.

### 3.2. `POST api/phieu/{id}/khoa/duyet-ho-so`

Body **không đổi**: `{ XepLoaiKhoa, LyDoXepLoai, GhiChuXepLoai, NhanXet, MucNckhcnQd838,
DuDinhMucGioNckh, KhongViPhamPhapLuat, RowVersion }`.

Khác biệt: backend **không còn tự thêm** dòng ghi chú `"[Dieu kien gio NCKH] Tu dong: ...
Hoi dong quyet dinh: ..."` vào `GhiChuXepLoai`. Nếu FE có parse hoặc hiển thị riêng dòng này thì bỏ.

### 3.3. Chi tiết phiếu: `GET api/phieu/{id}`

Không bỏ field nào. Nhưng với phiếu chốt **từ nay trở đi**, 3 field sau luôn là `null`:
`GioNckhDinhMucApDung`, `GioPvcdDinhMucApDung`, `HeSoNckhApDung`.

Việc FE cần làm: ẩn 3 dòng này trên màn chi tiết hoặc in phiếu. Tối thiểu phải hiện "—" khi null,
**không** hiện `0` hay `NaN`. `GioGiangDinhMucApDung`, `GioGiangThucTeSnapshot`,
`GioNckhThucTeSnapshot` vẫn giữ.

---

## 4. Field còn trong API nhưng **không còn tác dụng** (nên ẩn khỏi form)

Backend vẫn nhận và trả các field này để FE không bị gãy, nhưng giá trị **không còn ảnh hưởng**
tới bất kỳ phép tính nào. Nên ẩn khỏi form để người dùng không nhập vô ích:

| Màn / API | Field nên ẩn |
|---|---|
| Chức vụ: `api/chucvu` (form thêm/sửa, bảng) | `TyLeDinhMucNckh`. Giữ `TyLeDinhMucGiang` |
| Ngoại lệ định mức: `api/ngoai-le-dinh-muc` | `HeSoNckh`, `HeSoGiamNckh`, `SoGioThemNckh`, `HeSoGiamPvcd`, `MienNckh`. Giữ `HeSoGiamGiang`, `SoGioGiamGiang` |

⚠ Ngoại lệ **loại 1 (Tập sự)**: backend vẫn **bắt buộc `MienNckh = true`**. Nếu ẩn checkbox thì
FE phải tự gửi `MienNckh: true` khi `LoaiNgoaiLe == 1`, nếu không sẽ bị 400.

**Không đổi:** điểm tự động tiêu chí NCKH và các màn đồng bộ/đối chiếu NCKH (`api/nckh/...`,
`GioNckhDinhMuc`, `DatDinhMuc`, `TyLeHoanThanh` của dữ liệu từ web NCKH). Đó là định mức của hệ thống
NCKH, không phải bảng định mức KPI. **Đừng xoá nhầm.**

---

## 5. Kiểm tra sau khi sửa

- [ ] Dropdown chức danh hiện đủ 24 mục, không còn Phó Giáo sư, Giáo sư, Trợ giảng, Tập sự,
      Nhân viên, Khác. Tên dài không vỡ layout.
- [ ] Màn định mức chỉ có Giờ giảng; thêm, sửa, xoá định mức thành công; body không còn `GioNckh`.
- [ ] Màn định mức áp dụng của 1 GV hiện giờ giảng 270, không còn khối NCKH/PVCĐ.
- [ ] Màn Chốt hồ sơ GV: checkbox NCKH tick tay; tick hoặc bỏ tick thì mức đề xuất đổi đúng;
      không còn chữ "Hệ thống: Đạt/Chưa đạt"; chốt thành công.
- [ ] Chi tiết phiếu vừa chốt: không hiện `0`/`NaN` cho 3 field NCKH/PVCĐ.
- [ ] Tạo ngoại lệ loại 1 (Tập sự) vẫn thành công khi đã ẩn checkbox Miễn NCKH.
- [ ] Grep FE không còn: `GioNckhBase`, `GioPvcdBase`, `GioNckhApDung`, `GioPvcdApDung`,
      `TyLeNckhChucVu`, `DuDinhMucGioNckhTuDong`, `GioNckhDinhMucApDung` (trừ chỗ chỉ hiển thị null
      của chi tiết phiếu), cùng `GioNckh` trong code của định mức giảng viên.
      Cũng không còn hardcode `'PGS'`, `'GS'`, `'TROGIANG'`, `'TAPSU'`, `'KHAC'`.
- [ ] Type-check, lint, test FE đều qua.
