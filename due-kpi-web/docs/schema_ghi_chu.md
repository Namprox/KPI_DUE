# Ghi chú schema — mô tả & giải thích các bảng

> File này chứa toàn bộ phần comment mô tả/giải thích nghiệp vụ tách ra từ
> `App_Data/schema.sql` (schema.sql giữ DDL + chú thích ngắn trên cột).
> Số mục (1.1, 2.8, 4.7…) trùng với số mục trong schema.sql.

---

## 1. BẢNG THAM CHIẾU

### 1.3. `chuc_danh_nghe_nghiep` — Chức danh nghề nghiệp

Theo Bảng 1 QĐ ĐHKT: Trợ giảng, Tập sự, GV, GVC, GVCC/PGS, GS.

### 1.5. `nhan_vien_chuc_vu` — Quan hệ người × đơn vị × chức vụ × thời gian

Từ Đợt 1 của kế hoạch kiêm nhiệm, bảng này không còn là "lịch sử chức vụ" mà là
**bảng quan hệ**. Từ Đợt 4 nó là **nguồn sự thật DUY NHẤT** về đơn vị và chức vụ —
`nhan_vien.id_don_vi` và `nhan_vien.id_chuc_vu` **không còn tồn tại**. Chi tiết xem mục 10.

Đọc **đơn vị chính** của một người: view `dbo.v_nhan_vien_chinh` (1 dòng / nhân viên).
Đọc **mọi đơn vị** của một người: `dbo.fn_pham_vi_don_vi`. Đừng tự viết JOIN `la_chinh = 1`
rải rác — view tồn tại để gom hợp đồng đó về một chỗ.

---

## 2. CẤU HÌNH KPI

### 2.3. `nhom_tieu_chi` — Nhóm tiêu chí (cây phân cấp)

- Nhóm A (100đ): I. Đào tạo (40), II. NCKH (40), III. PVCĐ (20)
- Nhóm B: Thành tích vượt trội

### 2.4 + 2.5. `thu_tu_hien_thi` của `tieu_chi_danh_gia` / `thang_diem`

`thu_tu_hien_thi` là **vị trí trong danh sách**, không phải một con số tự do:
luôn là dãy **liên tục 1..N, không trùng, không nhảy số** trong từng phạm vi.

| Bảng                | Phạm vi đánh số              |
| ------------------- | ---------------------------- |
| `tieu_chi_danh_gia` | một nhóm — `id_nhom`         |
| `thang_diem`        | một tiêu chí — `id_tieu_chi` |

Ràng buộc do 6 SP `sp_tieu_chi_danh_gia_*` / `sp_thang_diem_*` giữ (KHÔNG có
constraint DB, vì lúc chèn/dồn chỗ dãy tạm thời vi phạm tính duy nhất):

- **Tạo**: bỏ trống / 0 / lớn hơn `N+1` → xuống cuối (`N+1`); truyền `1..N` →
  chèn vào đúng chỗ đó, các dòng từ vị trí đó trở đi tự động +1.
- **Sửa**: bỏ trống → giữ nguyên; 0 hoặc lớn hơn `N` → về cuối; `1..N` → chuyển
  đến vị trí đó, các dòng nằm giữa dồn 1 bậc (lên hay xuống tùy hướng di chuyển).
  Đổi `id_nhom` / `id_tieu_chi` cha → dọn gap ở phạm vi cũ rồi chèn vào phạm vi mới.
- **Xóa**: `thang_diem` xóa cứng → dọn gap. `tieu_chi_danh_gia` xóa MỀM
  (`trang_thai = 0`) → **giữ nguyên chỗ**, vì dòng vẫn nằm trong bảng và vẫn được
  `sp_tieu_chi_danh_gia_get_all` trả về; đếm `N` cũng tính cả dòng này.

Các SP đọc `N` bằng `WITH (UPDLOCK, HOLDLOCK)` ngay trong transaction để 2 request
tạo cùng lúc không cùng đọc ra `N` rồi ghi trùng vị trí.

### 2.8. `tieu_chi_don_vi_cham` — Phân quyền đơn vị chấm tiêu chí

NGUỒN DUY NHẤT quyết định ai chấm một tiêu chí. Không còn khái niệm "cấp đánh giá"
ở mức tiêu chí: mọi tiêu chí đều do đơn vị chấm (slot `diem_khoa`), HT chỉ
duyệt / trả lại / chốt.

- Tiêu chí CÓ dòng ở đây → chỉ trưởng (`ma_chuc_vu` TK/TKL/TP) của đúng các đơn vị đó được chấm.
- Tiêu chí KHÔNG có dòng nào → mặc định trưởng đơn vị CHỦ QUẢN của người được đánh giá chấm.

Đọc live (không snapshot vào phiếu): sửa phân quyền có hiệu lực ngay cả trên phiếu đang mở.

Liên quan: cột "ai chấm" KHÔNG khai báo trong `tieu_chi_danh_gia` — cột
`cap_danh_gia` cũ đã bị bỏ (xem update_database.sql).

### 2.9. `gia_han_danh_gia` — Gia hạn tự đánh giá cá nhân

Mỗi `(id_nam, id_nhan_vien)` có tối đa **1 dòng gia hạn hiệu lực** (`da_xoa = 0`,
ép bằng filtered unique index `ux_ghdg_nam_nv`); cấp lại = UPDATE ghi đè `han_moi`,
thu hồi = soft delete (dòng `da_xoa = 1` giữ làm lịch sử).

- **Hạn hiệu lực** của 1 người = `MAX(hạn của giai đoạn phiếu đang ở, han_moi)`;
  NULL = không giới hạn. So sánh `CAST(GETDATE() AS DATE) > hạn` — hết trọn ngày hạn mới khóa.
- **Hạn của giai đoạn** — điểm dễ hiểu sai nhất, đọc kỹ:

  | Phiếu ở                                     | Hạn áp dụng                   | Vì sao                                      |
  | ------------------------------------------- | ----------------------------- | ------------------------------------------- |
  | `trang_thai = 1` (kê khai lần đầu)          | `ngay_dong_tu_danh_gia`       | Đúng giai đoạn 1                            |
  | `trang_thai = 2` (dòng bị thẩm định trả về) | `ngay_dong_danh_gia_cap_tren` | Thẩm định chạy SAU khi hạn tự đánh giá đóng |

  Giai đoạn 2 theo thiết kế bắt đầu sau khi giai đoạn 1 đóng, nên nếu gate mọi thao
  tác bằng `ngay_dong_tu_danh_gia` thì **gần như mọi lần trả về đều rơi vào `QUA_HAN`**
  và phải cấp gia hạn thủ công cho từng người — vòng lặp trả về không chạy được.
  Nguyên tắc: _còn quyền trả về thì còn quyền trả lời_, hai bên đóng cùng lúc.
  Hạn cấp trên được kẹp sẵn không thấp hơn hạn tự đánh giá, nên cấu hình ngược
  (đóng cấp trên trước) không siết chủ phiếu chặt hơn trước.

- Quá hạn → khóa các thao tác của chủ phiếu: sửa điểm tự đánh giá, thêm/sửa/xóa
  minh chứng, nộp (`sp_phieu_submit`), nộp lại (`sp_phieu_nop_lai`), hủy nộp
  (`sp_phieu_huy_nop`) — SP trả `QUA_HAN`.
  `sp_phieu_tong_hop_tu_dong` (engine chấm tự động) KHÔNG bị khóa — chủ đích.
- **`sp_phieu_submit` và `sp_phieu_huy_nop` luôn dùng `ngay_dong_tu_danh_gia`** kể cả
  khi phiếu ở trạng thái 2: cả hai là hành vi giai đoạn 1. Đặc biệt **hủy nộp không được
  biến thành đường vòng** để sửa bài sau khi hạn tự đánh giá đã hết.
- `sp_phieu_kiem_tra_hop_le` phải chọn hạn theo **cùng quy tắc này** — lệch là FE hiện
  nút "Nộp lại" rồi API trả 409, hoặc ẩn nút trong khi API vẫn cho nộp.
- Chỉ HT/ADMIN được cấp/thu hồi/xem danh sách (gate `ma_chuc_vu` trong `sp_gia_han_*`);
  GV xem hạn của mình qua `GET api/gia-han/me/{idNam}`.

---

## 3. DỮ LIỆU NGUỒN (INPUT DATA)

### 3.2.b. `loai_vi_pham` — Danh mục "việc chưa tuân thủ"

15 nội dung, mặc định 1 điểm / 1 nội dung. Quyền ghi nhận của 1 loại = HỢP của 3 nguồn:

- (a) danh sách đơn vị cố định trong `loai_vi_pham_don_vi_ghi_nhan`
- (b) `cho_phep_khoa_chu_quan = 1` → trưởng Khoa chủ quản của giảng viên
- (c) `cho_phep_moi_don_vi = 1` → bất kỳ trưởng đơn vị nào ("đơn vị chủ trì")

### 3.2.c. `loai_vi_pham_don_vi_ghi_nhan` — Phân quyền đơn vị ghi nhận vi phạm

Mirror `tieu_chi_don_vi_cham`: chỉ trưởng (`ma_chuc_vu` TK/TKL/TP) của đúng các đơn vị
ở đây mới được ghi nhận loại vi phạm tương ứng. Đọc live (không snapshot).

### 3.2. `vi_pham_giang_day` — Vi phạm giảng dạy

Lưu các vi phạm quy định giảng dạy trong năm để tính điểm trừ KPI.

- CHỈ áp dụng cho GIẢNG VIÊN thuộc KHOA (`ma_don_vi LIKE 'K_%'`).
  Giảng viên = `chuc_danh_nghe_nghiep.ma_chuc_danh IN ('GV','GVC','GVCC','PGS','GS')`
  — xem view `v_giang_vien_khoa` trong procedure.sql.
- KHÔNG bao gồm vi phạm pháp luật (xử lý qua `phieu_danh_gia.khong_vi_pham_phap_luat`).
- Điểm trừ cá nhân = `MIN(SUM(diem_tru) trong năm, 15)`.
- Điểm trừ tập thể của Khoa = `MIN(7.5 * T / (0.2 * 15 * N), 7.5)` — xem `sp_vi_pham_diem_tru_khoa`.
- Điểm tiêu chí "Tuân thủ đúng quy định về giảng dạy" (mã công thức `VPGD_TUAN_THU`,
  chấm tự động qua `fn_nckh_diem_tu_dong`) = `15 − SUM(diem_tru)` trong năm, sàn 0.

Cột đáng chú ý:

- `bi_ky_luat`: 1 = vi phạm này đã bị xử lý kỷ luật. HIỆN CHỈ LƯU — không ảnh hưởng
  điểm tiêu chí lẫn xếp loại (thay cho cột `la_nghiem_trong` cũ đã bỏ). DB đã migrate:
  cột này nằm CUỐI bảng do được DROP + ADD, không ở vị trí khai báo trong schema.sql.
- Minh chứng PDF (`mc_*`, thay cho `so_hieu_ho_so` cũ đã bỏ): tối đa 1 file / vi phạm,
  file nằm ở `App_Data/uploads/vi-pham/{id_vi_pham}/`, DB chỉ giữ metadata, chỉ nhận .pdf.

### 3.3. `phan_hoi_sinh_vien` — Phản hồi sinh viên (thang Likert 1-5) → nguồn cho KPI I.3

Lưu THÔ từng lượt trả lời (1 dòng = 1 sinh viên / 1 câu hỏi / 1 học phần), import từ
file khảo sát (streaming qua TVP `PhanHoiSinhVienRawRow`, ~200,000 dòng/lần).
KHÔNG lưu sẵn điểm trung bình ở đây — điểm trung bình được tính khi "chốt"
(xem `diem_tb_phan_hoi_sinh_vien`; mỗi năm giữ 1 lần chốt cuối cùng).
`ma_can_bo` resolve MỀM qua `nhan_vien.ma_nhan_vien` tại thời điểm chốt (không hard-FK,
không fail import nếu không khớp). `id_don_vi` / `id_nguoi_import` được SP import xác thực
trước khi ghi, nên có FK cứng.

### 3.3b. `diem_tb_phan_hoi_sinh_vien` — Điểm TB phản hồi sinh viên

1 dòng = điểm TB cả năm của 1 GV; mỗi năm giữ 1 lần chốt cuối cùng. Chốt lại một năm
sẽ GHI ĐÈ (xoá kết quả cũ của năm đó rồi tính lại) — không lưu lịch sử nhiều đợt chốt.
`id_nguoi_chot` / `ngay_chot` lặp trên mỗi dòng GV của cùng một năm (thay cho bảng header đã bỏ).

### 3.6. Bộ bảng `nckh_*` — Dữ liệu NCKH đồng bộ từ API

Nguồn: API nghiên cứu khoa học (`{NckhApiUrl}/api/kpilecturerdata`). API trả TOÀN BỘ
giảng viên trong 1 lần gọi, dữ liệu tích luỹ toàn thời gian và KHÔNG gắn năm.

Ánh xạ về nhân viên KPI: JOIN qua EMAIL — `LOWER(LTRIM(RTRIM(nhan_vien.email)))
= LOWER(LTRIM(RTRIM(nckh_ho_so.email)))`, bỏ email rỗng/NULL. (KHÔNG hard-FK: user NCKH
chưa khớp nhân viên vẫn lưu được.) Cột `nhan_vien.science_user_id` vẫn tồn tại nhưng
KHÔNG còn là khoá liên kết NCKH.

Đồng bộ qua `sp_nckh_dong_bo` (streaming TVP): upsert hồ sơ (không xoá — snapshot các năm
khác tham chiếu FK), ghi đè snapshot tổng hợp/phân loại theo `id_nam`, và refresh 4 bảng
chi tiết GIỚI HẠN TRONG NĂM `id_nam`.

PHÂN VÙNG THEO NĂM của 4 bảng chi tiết (đổi từ 2026-08-04; trước đây là delete-all + insert):

| Bảng           | Vị từ thuộc năm                                              |
| -------------- | ------------------------------------------------------------ |
| bài báo & sách | `ngay_xuat_ban ∈ [nam_danh_gia.ngay_bat_dau, ngay_ket_thuc]` |
| kê khai khác   | `ngay_ap_dung ∈ khoảng năm`                                  |
| đề tài         | GIAO khoảng thời gian với năm (NULL 1 đầu mốc = mở phía đó)  |

Thiếu ngày (trừ đề tài) → không thuộc năm nào → không được nạp. Bản ghi của các năm khác
GIỮ NGUYÊN khi đồng bộ 1 năm ⇒ mỗi năm cần chấm phải được đồng bộ ít nhất 1 lần
(`POST api/nckh/dong-bo?id_nam=<năm>`). Vị từ trên dùng CHUNG cho cả DELETE lẫn INSERT
trong `sp_nckh_dong_bo`, và trùng khớp `fn_nckh_minh_chung_tu_dong` + các `sp_nckh_*_list`.

#### 3.6.2. `nckh_bai_bao` — Bài báo → nguồn cho TC 18/19/20 (WoS/Scopus, Q1/Q2)

PK ghép (user, `ma_bai_bao_nguon`): 1 bài đồng tác giả xuất hiện ở nhiều user = nhiều dòng.
`members_json` giữ nguyên MembersJSON để audit — KHÔNG bóc vai trò per-user (không đáng tin:
user có thể không có trong members, UserId lúc là số lúc là chuỗi rỗng).

#### 3.6.3. `nckh_de_tai` — Đề tài → nguồn cho TC 40/41/42 (cấp Nhà nước / Bộ, Tỉnh / Cơ sở)

Vai trò Chủ nhiệm: cột `la_chu_nhiem`, do C# (`Helper/NckhMemberRole.cs`) bóc từ MembersJSON
lúc đồng bộ — KHÔNG lấy từ `nckh_phan_loai`. Cấp đề tài suy từ `cap_de_tai` bằng LIKE trong
`fn_nckh_minh_chung_tu_dong` ('%cơ sở%' ưu tiên loại trừ, rồi '%Nhà nước%', '%Bộ%|%Tỉnh%').

#### 3.6.4. `nckh_sach` — Sách → nguồn cho TC 32-37 (phụ thuộc ĐỒNG THỜI loại sách + vai trò)

Vai trò Chủ biên: cột `la_chu_bien`, do C# (`Helper/NckhMemberRole.cs`) bóc từ MembersJSON
lúc đồng bộ — KHÔNG lấy từ `nckh_phan_loai`. Loại sách suy từ `loai_sach` bằng LIKE trong
`fn_nckh_minh_chung_tu_dong` ('%chuyên khảo%' / '%giáo trình%' / '%tham khảo%').

#### 3.6.5. `nckh_ke_khai_khac` — Kê khai khác → nguồn cho các "Nội dung NCKH"

(hướng dẫn SV NCKH, chuyển giao công nghệ, sở hữu trí tuệ, diễn giả hội thảo...).
Nguồn = mảng OtherDeclarations của từng giảng viên. Refresh theo năm dựa trên `ngay_ap_dung`,
giống `nckh_bai_bao`/`de_tai`/`sach` (xem mục 3.6). `ten_noi_dung` giữ nguyên ContentName
(kèm mức điểm trong ngoặc, vd "... (0.5 điểm)"). KHÔNG có `members_json`.

#### 3.6.6. `nckh_tong_hop` — Tổng hợp NCKH theo năm

11 cờ boolean TỰ TÍNH THEO NĂM từ các bảng chi tiết (KHÔNG lấy điểm do API tính sẵn).
Bài báo/sách lọc theo `ngay_xuat_ban ∈ [nam_bd, nam_kt]`; đề tài lọc theo GIAO khoảng
thời gian với năm. Vai trò (chủ biên/chủ nhiệm) đã được C# bóc từ MembersJSON và lưu vào
`nckh_sach.la_chu_bien` / `nckh_de_tai.la_chu_nhiem`. Đồng bộ lại cùng năm = GHI ĐÈ
(DELETE theo `id_nam` rồi tính lại).

#### 3.6.7. `nckh_phan_loai` — Phân loại NCKH

Flatten 2 dictionary mà API trả sẵn: `loai = 1` BookClassifications
(vd "Thành viên biên soạn sách tham khảo"), `loai = 2` ProjectClassifications.

⚠️ CẢNH BÁO: bảng có cột `id_nam` và bị ghi đè theo `id_nam`, NHƯNG số liệu bên trong là
TOÀN THỜI GIAN (API không tách theo năm) — không dùng `so_luong` ở đây làm nguồn chấm điểm
theo năm nếu chưa xử lý lại. Hiện KHÔNG có tiêu chí nào đọc bảng này: 11 cờ của
`nckh_tong_hop` tự tính từ các bảng chi tiết qua `fn_nckh_minh_chung_tu_dong`, còn vai trò
chủ biên/chủ nhiệm lấy từ `nckh_sach.la_chu_bien` / `nckh_de_tai.la_chu_nhiem`.

TVP: `HoSoNckhRow`, `BaiBaoNckhRow`, `DeTaiNckhRow`, `SachNckhRow`, `KeKhaiKhacNckhRow`,
`PhanLoaiNckhRow` dùng cho `sp_nckh_dong_bo` (streaming từng dòng qua SqlDataRecord, không giữ
bản sao trong RAM). 2 type snapshot KHÔNG chứa `id_nam` — truyền scalar `@id_nam` để tránh lặp
trên mỗi dòng. (TongHopNckhRow đã bỏ: `nckh_tong_hop` nay do `sp_nckh_dong_bo` TỰ TÍNH theo năm.)

---

## 4. DỮ LIỆU ĐÁNH GIÁ

### State machine — QUY TRÌNH 4 GIAI ĐOẠN

Có **HAI trục trạng thái song song**. Hiểu sai quan hệ giữa hai trục này là nguồn lỗi
lớn nhất của module, nên đọc kỹ phần "Quan hệ giữa hai trục" bên dưới.

#### Trục 1 — `chi_tiet_danh_gia.trang_thai_dong` (theo TỪNG DÒNG tiêu chí)

| Trạng thái | Tên           | Ai sửa được                                     |
| ---------- | ------------- | ----------------------------------------------- |
| 1          | KE_KHAI       | Chủ phiếu — sửa được cả **điểm lẫn minh chứng** |
| 2          | CHO_THAM_DINH | Đơn vị được giao trong `tieu_chi_don_vi_cham`   |
| 3          | DA_CHOT       | Không ai. `diem_chinh_thuc` đã ghi, khóa cứng   |

```
tạo phiếu ────────────────────────────────► 1 KE_KHAI
1 ──[nộp phiếu / nộp lại]──────────────────► 2 CHO_THAM_DINH
1 ──[dòng loai_nguon_diem=2, chấm tự động]─► 3 DA_CHOT      (bỏ qua thẩm định)
2 ──[thẩm định: duyệt giữ nguyên điểm]─────► 3 DA_CHOT
2 ──[thẩm định: sửa điểm + LÝ DO bắt buộc]─► 3 DA_CHOT
2 ──[thẩm định: trả về, LÝ DO bắt buộc]────► 1 KE_KHAI       (nguon_tra_ve = 2)
3 ──[Trưởng khoa trả về thẩm định lại]─────► 2 CHO_THAM_DINH (nguon_tra_ve = 3)
```

#### Trục 2 — `phieu_danh_gia.trang_thai` (theo HỒ SƠ)

| Trạng thái | Tên          | Ý nghĩa                                              | Giai đoạn |
| ---------- | ------------ | ---------------------------------------------------- | --------- |
| 1          | NHAP         | GV kê khai, chưa nộp lần nào                         | GĐ1       |
| 2          | THAM_DINH    | Còn ≥1 dòng ở trạng thái 1 hoặc 2                    | GĐ1↔GĐ2   |
| 3          | CHO_TK_DUYET | 100% dòng đã chốt, chờ Trưởng khoa                   | GĐ3       |
| 4          | TK_DA_DUYET  | TK đã chốt hồ sơ + chọn xếp loại, chờ đóng gói/HT    | GĐ3→GĐ4   |
| 5          | HOAN_TAT     | HT đã duyệt gói KPI Khoa (read-only, trừ khi mở lại) | GĐ4       |

```
1 ──[GV nộp phiếu]────────────────────────────────► 2
2 ──[TỰ ĐỘNG: mọi dòng = DA_CHOT]─────────────────► 3
3 ──[TỰ ĐỘNG: có dòng rớt về 1 hoặc 2]────────────► 2
3 ──[TK chốt hồ sơ + chọn xếp loại 1/2/3]─────────► 4
4 ──[TK trả 1 dòng về thẩm định]──────────────────► 2
4 ──[HT duyệt gói KPI Khoa]───────────────────────► 5
4 ──[HT trả riêng hồ sơ này về TK]────────────────► 3
2 ──[GV hủy nộp — chỉ khi chưa dòng nào DA_CHOT]──► 1
5 ──[HT mở lại]───────────────────────────────────► 1/2/3
```

#### Quan hệ giữa hai trục

- **Phiếu ở trạng thái 2 BAO TRÙM cả trường hợp GV đang sửa dòng bị trả về.** Đây chính là
  "vòng lặp trả về": hồ sơ KHÔNG tụt về trạng thái 1, chỉ có DÒNG tụt về `KE_KHAI`. Nhờ vậy
  các dòng đang chờ Phòng khác duyệt hoặc đã duyệt vẫn giữ nguyên tiến độ.
- **Trigger 2↔3 là TỰ ĐỘNG**, phải tính lại sau MỌI thao tác cấp dòng (duyệt dòng, sửa điểm
  dòng, trả về dòng theo cả hai hướng):
  `trang_thai = 3` ⟺ `NOT EXISTS (SELECT 1 FROM chi_tiet_danh_gia WHERE id_phieu = @id AND trang_thai_dong <> 3)`.
  Điều này THAY THẾ điều kiện cũ "mọi dòng chấm tay đều có `diem_khoa`".
- **`diem_chinh_thuc` nay được ghi ở CẤP DÒNG**, tại thời điểm dòng chốt (GĐ2) — không còn
  dồn về bước HT chốt phiếu. Đồng nhất với dòng chấm tự động vốn đã ghi thẳng `diem_chinh_thuc`.
  Công thức tổng điểm `COALESCE(diem_chinh_thuc, diem_truong, diem_khoa, diem_tu_danh_gia, 0)`
  GIỮ NGUYÊN, tự động đúng vì `diem_chinh_thuc` đứng đầu.

#### Các quy tắc khác

- **Sửa điểm ở GĐ2 BẮT BUỘC ghi lý do** (`nhan_xet_khoa`) khi điểm khác `diem_tu_danh_gia` —
  error `THIEU_LY_DO`. "Duyệt giữ nguyên điểm" không cần lý do.
- **Trả về (cả hai hướng) BẮT BUỘC ghi `ly_do_tra_ve`.** Yêu cầu đang mở nằm ở cặp
  `nguon_tra_ve` + `ly_do_tra_ve`; xóa (set NULL) khi dòng được nộp lại / chấm lại.
  `so_lan_tra_ve` cộng dồn qua cả vòng đời, KHÔNG reset.
- **`id_don_vi_tham_dinh`** snapshot đơn vị đã thẩm định dòng. KHÔNG suy ra từ
  `id_nguoi_dg_khoa` được vì đơn vị của người chấm có thể đổi sau đó, mà TK cần biết trả
  dòng về ĐÚNG Phòng.
- **HT KHÔNG chấm điểm từng tiêu chí.** Các cột `diem_truong*` chỉ giữ dữ liệu lịch sử của
  phiếu chốt trước thay đổi này; không có đường ghi mới nào vào chúng.
- **"Hủy nộp"** (2 → 1, `hanh_dong = 6`): chủ phiếu tự rút phiếu vừa nộp qua
  `sp_phieu_huy_nop` — chỉ khi **chưa dòng nào ở trạng thái 3** và còn trong hạn tự đánh giá
  (xem 2.9). GIỮ NGUYÊN `lan_danh_gia`.
- **"Nộp lại"** (`hanh_dong = 7`) sau khi bị trả về dòng: đẩy mọi dòng `KE_KHAI` → `CHO_THAM_DINH`.
  **GIỮ NGUYÊN `lan_danh_gia`** — đây không phải vòng đánh giá mới, khác hẳn "trả lại phiếu" cũ.
- **"Mở lại"** sau HOAN_TAT: `trang_thai` quay về 1/2/3 tuỳ HT chọn, `lan_danh_gia += 1`,
  reset `trang_thai_dong` tương ứng, LUÔN loại trừ `loai_nguon_diem = 2`.
- **Hạn**: quá hạn hiệu lực (mục 2.9) thì phiếu bị khóa với chủ phiếu cho tới khi được gia hạn.
  Hạn nào thì **tùy giai đoạn**: phiếu trạng thái 1 theo `ngay_dong_tu_danh_gia`; dòng bị trả về
  ở trạng thái 2 theo `ngay_dong_danh_gia_cap_tren` (bảng trong mục 2.9).
  Nghĩa là chuyên viên trả về một dòng sau hạn tự đánh giá thì GV **vẫn** sửa và nộp lại được,
  miễn còn trong hạn thẩm định — không cần xin `gia_han_danh_gia` như trước.
  Ngoại lệ giữ nguyên: `sp_phieu_huy_nop` vẫn theo hạn tự đánh giá.
- `sp_chi_tiet_tham_dinh_tra_ve` **không kiểm tra hạn** — thẩm định viên trả về được bất cứ lúc
  nào trong giai đoạn của mình. Nếu hạn thẩm định cũng đã hết thì dòng trả về đó sẽ không ai
  hoàn thành được; khi đó mới cần `gia_han_danh_gia`.

#### SP hiện thực GĐ1 + GĐ2 và hợp đồng lỗi

| SP                                        | Vai trò                                                     | `error_code` riêng                                |
| ----------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| `sp_phieu_dong_bo_trang_thai_dong`        | Helper giữ bất biến 2↔3. **Mọi** thao tác cấp dòng phải gọi | — (không SELECT, không bắt lỗi)                   |
| `sp_chi_tiet_danh_gia_update_tu_danh_gia` | GV kê khai / sửa dòng bị trả về                             | `INVALID_STATE_DONG`                              |
| `sp_phieu_submit`                         | Nộp lần đầu, dòng 1→2                                       | (giữ nguyên)                                      |
| `sp_phieu_nop_lai`                        | Nộp lại sau trả về, dòng 1→2, `hanh_dong = 7`               | `KHONG_CO_DONG_CHO_NOP`                           |
| `sp_phieu_huy_nop`                        | Rút phiếu 2→1, reset mọi dòng về 1                          | `DA_CHAM` (nay xét `trang_thai_dong = 3`)         |
| `sp_chi_tiet_danh_gia_update_diem_khoa`   | Thẩm định **sửa điểm**, dòng 2→3                            | `THIEU_DIEM`, `THIEU_LY_DO`, `INVALID_STATE_DONG` |
| `sp_chi_tiet_tham_dinh_duyet`             | Thẩm định **giữ nguyên điểm GV**, dòng 2→3                  | `INVALID_STATE_DONG`                              |
| `sp_chi_tiet_tham_dinh_tra_ve`            | Trả dòng về GV, dòng 2→1                                    | `THIEU_LY_DO`, `INVALID_STATE_DONG`               |
| `sp_tham_dinh_get_pending`                | Hàng đợi theo **dòng** (không theo phiếu)                   | —                                                 |

#### SP hiện thực GĐ3 + GĐ4 và hợp đồng lỗi

| SP                                           | Vai trò                                                   | `error_code` riêng                                                                                 |
| -------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `sp_chi_tiet_khoa_tra_tham_dinh`             | TK trả 1 dòng về thẩm định, dòng 3→2 (`nguon_tra_ve = 3`) | `THIEU_LY_DO`, `TO_TRINH_DA_TRINH`                                                                 |
| `sp_phieu_khoa_duyet_ho_so`                  | TK chốt hồ sơ, phiếu 3→4, chọn `xep_loai_khoa`            | `CAM_CHON_XUAT_SAC`, `XEP_LOAI_KHONG_HOP_LE`, `VUOT_MUC_VIEN_CHUC`, `THIEU_LY_DO`, `CHUA_CHOT_HET` |
| `sp_phieu_khoa_uu_tien_xuat_sac`             | TK chỉ định ai được suất cuối khi đồng hạng               | `VUOT_MUC_VIEN_CHUC`, `TO_TRINH_DA_TRINH`                                                          |
| `sp_to_trinh_khoa_dong_goi`                  | **Nơi DUY NHẤT ghi `xep_loai = 4`**                       | `CHUA_DU_HO_SO`, `DONG_HANG`, `KHONG_CO_HO_SO`, `TY_LE_KHONG_HOP_LE`                               |
| `sp_to_trinh_khoa_trinh`                     | Gói 2→3, `lan_trinh += 1`                                 | `TRAN_LAN_TRINH`                                                                                   |
| `sp_to_trinh_khoa_ht_duyet`                  | Gói 3→4, mọi phiếu 4→5                                    | —                                                                                                  |
| `sp_to_trinh_khoa_ht_tra_lai`                | Gói 3→5, các phiếu được chọn 4→3                          | `DANH_SACH_RONG`, `HO_SO_KHONG_HOP_LE`, `THIEU_LY_DO`                                              |
| `sp_to_trinh_khoa_get_paged` / `_get_detail` | Đọc                                                       | —                                                                                                  |

**Ai duyệt hồ sơ của ai:** người có `ma_chuc_vu` ∈ {`TK`,`TKL`,`TP`} **và** `phieu.id_don_vi`
nằm trong cây đơn vị của họ. Nghĩa là TK duyệt hồ sơ giảng viên Khoa mình, TP duyệt hồ sơ
viên chức Phòng mình — không ai với sang đơn vị khác. `ADMIN` đi đường tắt. `HT` **không**
duyệt lẻ từng hồ sơ nữa, chỉ thao tác ở cấp gói.

**Tờ trình được tạo tự động** bởi `sp_phieu_khoa_duyet_ho_so` khi hồ sơ đầu tiên của
(năm, đơn vị) được chốt. Có hồ sơ mới vào gói đang ở trạng thái 2 hoặc 5 thì gói tự hạ về 1
— hạn ngạch cũ tính trên mẫu số cũ nên không còn đúng.

#### Ba bất biến mà mọi SP phải giữ

Kiểm được bằng query ở mục 7 của `update_database.sql`:

1. `phieu.trang_thai = 3` ⟺ 100% dòng có `trang_thai_dong = 3`.
2. Dòng chấm tay có `trang_thai_dong <> 3` thì `diem_chinh_thuc` **phải NULL** — nếu không,
   `COALESCE(diem_chinh_thuc, …)` sẽ cộng vào tổng một con số không còn ai duyệt. Vì vậy
   `sp_chi_tiet_tham_dinh_tra_ve`, `sp_chi_tiet_khoa_tra_tham_dinh` và `sp_phieu_huy_nop`
   đều xóa `diem_chinh_thuc` khi kéo dòng ra khỏi trạng thái chốt.
3. `xep_loai = 4` ⟹ `id_to_trinh IS NOT NULL`; và phiếu ở trạng thái 4/5 phải có
   `xep_loai_khoa`. Mức 4 không có đường ghi nào khác ngoài `sp_to_trinh_khoa_dong_goi`.

### 4.0. `danh_muc_vai_tro_pvcd` — Lookup nhóm vai trò PVCĐ theo đơn vị

Mỗi khoa có thể có bộ vai trò + điểm quy đổi riêng (`id_don_vi` NULL = áp dụng toàn trường,
default). `id_nam` NULL = áp dụng mọi năm. App resolve theo thứ tự:
`(don_vi, nam) > (don_vi, NULL) > (NULL, nam) > (NULL, NULL)`.

### 4.1. `phieu_danh_gia` — Phiếu đánh giá (Header – 1 phiếu / người / ĐƠN VỊ / năm)

Snapshot toàn bộ định mức ÁP DỤNG (sau khi đã áp dụng các ngoại lệ) tại thời điểm chốt phiếu.
Đảm bảo có thể truy vết kết luận xếp loại về sau ngay cả khi quy định / cấu hình thay đổi.

**Khoá duy nhất — đổi ở Đợt 3 (kiêm nhiệm đa đơn vị):**
`uq_phieu_unique` từ `UNIQUE (id_nam, id_nhan_vien)` → `UNIQUE (id_nam, id_nhan_vien, id_don_vi)`.
Người kiêm nhiệm 2 đơn vị nộp **2 phiếu / năm**, mỗi phiếu rơi vào tờ trình + hạn ngạch 20%
của đúng đơn vị đó (mỗi đơn vị xếp loại riêng). Người không kiêm nhiệm vẫn đúng 1 phiếu.
Khoá **không** lọc `da_xoa` — phiếu soft-delete vẫn chiếm chỗ, y như trước Đợt 3.

**`loai_doi_tuong` suy theo ĐƠN VỊ CỦA PHIẾU, không phải theo chức danh của người:**

| Đơn vị của phiếu              | `id_chuc_danh` | `loai_doi_tuong` | Mẫu dùng                                   |
| ----------------------------- | -------------- | ---------------- | ------------------------------------------ |
| Khoa (`ma_don_vi LIKE 'K_%'`) | có             | **1**            | Giảng viên                                 |
| Khoa                          | NULL           | **2**            | Viên chức / NLĐ — nhân viên văn phòng Khoa |
| Phòng / Trung tâm / Trường    | bất kỳ         | **2**            | Viên chức / NLĐ                            |

Đây là hiện thực của quyết định "KPI Phòng khác KPI Khoa": một PGS làm Trưởng phòng chấm
theo **mẫu viên chức** trên phiếu Phòng và theo **mẫu giảng viên** trên phiếu Khoa.
`id_chuc_vu` snapshot cũng lấy **tại đơn vị của phiếu** — người là TP của Phòng nhưng chỉ
giảng dạy ở Khoa thì phiếu Khoa mang `id_chuc_vu` NULL.

> ⚠ **HỆ QUẢ ĐÃ BIẾT VÀ CỐ Ý GIỮ.** Phiếu ở Phòng mang `loai_doi_tuong = 2` nên dính luật
> **"viên chức / NLĐ tối đa mức 2 (Hoàn thành nhiệm vụ)"** đang cưỡng chế trong
> `sp_phieu_khoa_chot_ho_so` (`VUOT_MUC_VIEN_CHUC`) và `sp_phieu_khoa_danh_dau_uu_tien`.
> Tức **Trưởng phòng không thể đạt Xuất sắc trên phiếu Phòng** — nhưng **vẫn đạt Xuất sắc
> được trên phiếu Khoa** của chính họ. Đây là luật sẵn có áp cho mọi nhân sự Phòng, không
> phải hiệu ứng phụ của Đợt 3. Muốn mở ngoại lệ cho cấp lãnh đạo Phòng thì phải sửa 2 SP
> trên, đừng sửa `loai_doi_tuong`.

**Điểm tự động: mỗi năm chỉ MỘT phiếu được chấm.** Mọi nguồn tự động (NCKH, phản hồi SV,
vi phạm giảng dạy, nhiệm vụ Khoa) khoá theo `(id_nhan_vien, id_nam)` — **không** theo đơn vị
— nên chạy engine trên cả 2 phiếu sẽ cộng trùng. `sp_phieu_cham_tu_dong_apply` và
`sp_phieu_tong_hop_tu_dong` chọn **phiếu nhận điểm tự động** theo thứ tự: có ít nhất 1 dòng
`loai_nguon_diem = 2` → `loai_doi_tuong = 1` (mẫu GV) trước → đơn vị chính trước →
`id_phieu` nhỏ nhất. Gọi endpoint trên phiếu còn lại trả 409 `PHIEU_KHONG_NHAN_DIEM_TU_DONG`.
Lưu ý đây **không** phải "phiếu của đơn vị chính": với người vừa là GV Khoa vừa là Trưởng
phòng thì đơn vị chính là **Phòng**, mà phiếu Phòng dùng mẫu viên chức và có 0 dòng tự động;
toàn bộ điểm NCKH nằm ở phiếu Khoa (đơn vị kiêm nhiệm).

Xếp loại (theo QĐ ĐHKT). `tong_diem_tich_luy = tong_diem_co_ban + tong_diem_vuot_troi`.

| `xep_loai` | Mức                          | Điều kiện                                                                                                                   |
| ---------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1          | Không hoàn thành nhiệm vụ    | `tong_diem_tich_luy < 80`, HOẶC `du_dinh_muc_gio_nckh = 0`, HOẶC `khong_vi_pham_phap_luat = 0` (bị xử lý kỷ luật trong năm) |
| 2          | Hoàn thành nhiệm vụ          | `80 <= tong_diem_tich_luy <= 100` + đủ định mức giờ NCKH (QĐ 3237 + QĐ 1356) + không vi phạm pháp luật                      |
| 3          | Hoàn thành tốt nhiệm vụ      | Thỏa (2) + `tong_diem_tich_luy > 100` + `muc_nckhcn_qd838 >= 1` (đạt mức HT Tốt KHCN — QĐ 838)                              |
| 4          | Hoàn thành xuất sắc nhiệm vụ | Thỏa (3) + `muc_nckhcn_qd838 = 2` + **nằm trong hạn ngạch top 20% của Khoa** (xem mục 8)                                    |

**AI GHI CỘT NÀO — đọc kỹ, đây là chỗ dễ nhầm nhất:**

| Cột                | Ai ghi                         | Khi nào                       | Giá trị hợp lệ                                    |
| ------------------ | ------------------------------ | ----------------------------- | ------------------------------------------------- |
| `xep_loai_de_xuat` | Hệ thống (`XepLoaiCalculator`) | Khi TK mở hồ sơ ở GĐ3         | 1–4, chỉ để **đối chiếu**                         |
| `xep_loai_khoa`    | **Trưởng khoa chọn tay**       | Chốt hồ sơ cá nhân (GĐ3, 3→4) | **1/2/3 — cấm chọn 4**                            |
| `xep_loai`         | Hệ thống                       | Đóng gói tờ trình (mục 8)     | `= xep_loai_khoa`, nâng lên 4 nếu trúng hạn ngạch |

Mức 4 KHÔNG ai chọn tay được: nó phụ thuộc thứ hạng trong cả Khoa nên chỉ tính được khi
100% hồ sơ của Khoa đã chốt. `ly_do_xep_loai` bắt buộc khi `xep_loai_khoa <> xep_loai_de_xuat`.

### 4.2. `chi_tiet_danh_gia` — Chi tiết đánh giá (Detail – 1 dòng = 1 tiêu chí)

Mỗi cấp có cột điểm + nhận xét + người chấm + ngày chấm RIÊNG. Khi GV/đơn vị sửa, giá trị cũ
được snapshot sang `lich_su_cham_diem` trước khi ghi đè.

Luồng hiện tại chỉ ghi `diem_tu_danh_gia` (GV) và `diem_khoa` (đơn vị được giao trong
`tieu_chi_don_vi_cham`). Nhóm cột `diem_truong*` CHỈ còn giữ dữ liệu lịch sử của phiếu đã
chốt trước khi bỏ bước "Trường chấm điểm" — không có đường ghi mới nào vào chúng.

**Trạng thái theo từng dòng** (`trang_thai_dong` + nhóm cột `*_tra_ve` + `id_don_vi_tham_dinh`):
xem phần "State machine — QUY TRÌNH 4 GIAI ĐOẠN" ở đầu mục 4. Đây là thứ cho phép trả về
ĐÚNG MỘT tiêu chí mà không đụng tới các tiêu chí khác của cùng hồ sơ.

Không snapshot "cấp chấm" nữa: ai chấm tra live từ `tieu_chi_don_vi_cham`
(cột `cap_danh_gia_snapshot` cũ đã bị bỏ).

Chấm tự động (`loai_nguon_diem = 2`): snapshot nguồn/công thức từ tiêu chí lúc tạo phiếu
(mirror `chi_tiet_danh_gia_don_vi`). Điểm tự động là điểm KHÓA CỨNG: engine ghi thẳng
`diem_chinh_thuc`, bỏ qua 3 cấp chấm tay.

`id_thang_diem_chon` mang **2 nghĩa** tùy loại dòng:

- Dòng chấm tay (`loai_nguon_diem = 1`): mức thang điểm GV **tự chọn** khi tự đánh giá (cấp 1).
- Dòng tự động (`loai_nguon_diem = 2`): mức thang điểm **máy ánh xạ** trong
  `sp_phieu_cham_tu_dong_apply`, sau khi đã tính xong điểm. Không xung đột với nghĩa trên
  vì dòng tự động không bao giờ được chấm tay (cả 3 SP `update_*` chặn bằng `AUTO_SCORED`)
  nên toàn bộ cột cấp 1 của nó luôn NULL.

Quy tắc ánh xạ (engine và preview `sp_mau_danh_gia_diem_tu_dong` dùng chung):

- CHỈ áp dụng cho tiêu chí RỜI RẠC — `tieu_chi_danh_gia.loai_thang_diem = 1`.
- Khớp **CHÍNH XÁC** `thang_diem.gia_tri_diem = điểm vừa tính`; nhiều mức trùng giá trị thì
  lấy `MIN(thu_tu_hien_thi)` rồi `MIN(id_thang_diem)`.
- Không khớp → NULL. Tiêu chí LIÊN TỤC (`loai_thang_diem = 2`, vd `VPGD_TUAN_THU` =
  `15 − tổng diem_tru`) bị loại hẳn: điểm là phần còn lại sau khi trừ chứ không phải một
  mức rời rạc, nên tuyệt đối không được kéo về mức nào.
- Ánh xạ **KHÔNG** làm thay đổi điểm số — chỉ là nhãn hiển thị (`dieu_kien_diem`) cho FE.
- Engine ghi cả NULL (có chủ đích): chạy lại sau khi admin sửa `thang_diem` sẽ đồng bộ lại,
  không để sót map cũ đã sai.

Hệ quả: `sp_thang_diem_delete` vốn chặn xóa mức đang được `chi_tiet_danh_gia` tham chiếu,
nay chặn cả mức máy đã gán → muốn sửa/xóa mức đó phải xóa phiếu hoặc chạy lại engine trước.

### 4.4. `nhiem_vu_cong_dong` — Nhiệm vụ PVCĐ (KPI Nhóm III – nhiều dòng, cộng dồn, tối đa 20đ)

LƯU Ý: trần 20đ enforce ở tầng API (SQL Server 2008 không enforce được cross-row sum
constraint). Hỗ trợ soft-delete (`da_xoa` / `ngay_xoa`) tương tự bảng `minh_chung`.

### 4.6. `phe_duyet` — Luồng phê duyệt

`cap_duyet` TINYINT 1/2/3 (thay vì FK đến `chuc_vu` để workflow ổn định).
Snapshot `id_chuc_vu` để truy vết về sau ai đã duyệt với cương vị nào.

### 4.7. `lich_su_cham_diem` — Lịch sử chấm điểm chi tiết

`hanh_dong`: 1 Chấm · 2 Sửa · 3 Chốt điểm chính thức · **4 Duyệt giữ nguyên điểm** (thẩm định
đồng ý với điểm GV tự kê khai) · **5 Trả về dòng**. Không tạo bảng lịch sử riêng cho dòng —
bảng này đã khóa theo `id_chi_tiet` + `lan_danh_gia` + `cap` + `nhan_xet`, vừa đủ để dựng lại
lịch sử một dòng tiêu chí.

Mục đích:

- Audit trail mọi lần chấm/sửa điểm ở từng cấp.
- Reconstruct được điểm của bất kỳ "phiên bản" (`lan_danh_gia`) nào.
- Hiển thị UI: "Lần 1 Khoa chấm X điểm, lần 2 sau trả lại Khoa chấm Y điểm".

Cách dùng (xử lý ở tầng API trong cùng transaction với UPDATE `chi_tiet_danh_gia`):

1. Insert một row mỗi khi diem/nhan_xet của bất kỳ cấp nào thay đổi.
2. Khi Trường chốt `diem_chinh_thuc` → insert với `hanh_dong = 3` (Chốt).
3. Khi Trường mở lại phiếu HOAN_TAT → snapshot toàn bộ chi_tiet hiện tại sang đây
   (`hanh_dong = 3`, đánh dấu `lan_danh_gia` hiện tại của phiếu), sau đó tăng
   `lan_danh_gia` của phiếu.

LƯU Ý CASCADE: `fk_lscd_ct` không có ON DELETE CASCADE (để tránh multiple cascade paths
trên SQL Server 2008). Cascade dọn lịch sử đi qua đường `phieu_danh_gia → lich_su_cham_diem`
(`fk_lscd_phieu`).

### 4.8. `lich_su_trang_thai_phieu` — Lịch sử trạng thái phiếu (state-machine audit)

Mọi chuyển trạng thái của phiếu được ghi vào đây — bao gồm cả "trả lại", "mở lại" và
"hủy nộp". Mỗi row = 1 transition.

`hanh_dong`: 1 Gửi đi (submit) · 2 Duyệt & chuyển tiếp · 3 Trả lại · 4 Chốt (vào HOAN_TAT) ·
5 Mở lại (từ HOAN_TAT về 1/2/3) · 6 Hủy nộp (GV tự rút, 2 → 1, giữ nguyên `lan_danh_gia`) ·
7 Nộp lại sau khi bị trả về DÒNG (giữ nguyên `lan_danh_gia`) · 8 Trưởng khoa chốt hồ sơ cá nhân ·
9 Hiệu trưởng trả riêng hồ sơ về Trưởng khoa.

`cap_thuc_hien`: 1 GV · 2 Đơn vị thẩm định · 3 Hiệu trưởng/Trường · 4 Trưởng khoa · NULL hệ thống.
Giá trị 1/2/3 GIỮ NGUYÊN nghĩa cũ để không phá dữ liệu lịch sử đã có; 4 là mã mới.
Quy ước này áp dụng chung cho cả `lich_su_cham_diem.cap`.

Query mẫu:

```sql
-- "Phiếu có bị trả lại bao giờ không?"
SELECT 1 FROM lich_su_trang_thai_phieu WHERE id_phieu = ? AND hanh_dong = 3;

-- "Phiếu đã được mở lại bao nhiêu lần?"
SELECT COUNT(*) FROM lich_su_trang_thai_phieu WHERE id_phieu = ? AND hanh_dong = 5;
```

### 4.9 → 4.14. ĐÁNH GIÁ ĐƠN VỊ (KHOA / PHÒNG)

Bộ bảng bản ghi đánh giá đơn vị, song song với luồng người (`phieu_danh_gia` …) nhưng khoá
theo `id_phieu_dv` / `id_chi_tiet_dv`. Quy trình 3 cấp nhận diện theo `ma_chuc_vu`:
Thư ký Khoa/Phòng (TKK/TKP) nhập → Trưởng Khoa/Phòng (TK/TKL/TP) duyệt → Hiệu trưởng (HT)
duyệt & chốt.

Trạng thái `phieu_danh_gia_don_vi.trang_thai`:

| Trạng thái | Ý nghĩa                              |
| ---------- | ------------------------------------ |
| 1          | Nháp / đang nhập (TKK/TKP)           |
| 2          | Chờ Trưởng đơn vị duyệt              |
| 3          | Trưởng đơn vị đã duyệt / chờ Trường  |
| 4          | Trường (HT) đã duyệt, chờ chốt       |
| 5          | Hoàn tất (read-only, trừ khi mở lại) |

Ghi chú từng bảng:

- **4.10 `chi_tiet_danh_gia_don_vi`**: `loai_nguon_diem` 1 = chấm thủ công (TKK/TKP nhập
  `diem_nhap`), 2 = tự động tổng hợp từ KPI thành viên (hệ thống điền `diem_tong_hop`).
- **4.11 `phe_duyet_don_vi`** (mirror `phe_duyet`): `cap_duyet` 1 = TKK/TKP nhập,
  2 = Trưởng đơn vị, 3 = Trường (HT).
- **4.12 `lich_su_cham_diem_don_vi`** (mirror `lich_su_cham_diem`): `fk_lscddv_ct` KHÔNG
  cascade (tránh multiple cascade paths trên SQL 2008); cascade dọn lịch sử đi qua
  `phieu_danh_gia_don_vi → fk_lscddv_phieu`.
- **4.13 `lich_su_trang_thai_phieu_don_vi`** (mirror `lich_su_trang_thai_phieu`):
  `hanh_dong` chỉ 1-5 — luồng đơn vị KHÔNG có "hủy nộp".
- **4.14 `minh_chung_don_vi`** (mirror `minh_chung`).

---

## 6. INDEXES — ghi chú

- `ux_nhan_vien_science_user_not_null`: thay cho UNIQUE constraint cũ — cho phép nhiều NULL,
  nhưng `science_user_id` đã gán phải duy nhất (đồng bộ 1-1 với hệ thống NCKH).
- `ix_nvcv_nv_ngay`: resolve "chức vụ áp dụng" của 1 GV theo ngày.
- `ix_nv_don_vi` và `ix_nv_chuc_vu` **đã bị bỏ ở Đợt 4** cùng 2 cột tương ứng trên `nhan_vien`.
  Truy vấn "ai thuộc đơn vị X" nay đi qua `ix_nvcv_don_vi` trên `nhan_vien_chuc_vu`.
- `ux_ghdg_nam_nv` (filtered `WHERE da_xoa = 0`): 1 dòng gia hạn HIỆU LỰC / (năm, nhân viên);
  dòng đã thu hồi giữ làm lịch sử. Bảng có filtered index ⇒ mọi script ghi vào bảng phải chạy
  với `SET QUOTED_IDENTIFIER ON` (chạy bằng SSMS, không sqlcmd).
- Nhóm `lich_su_*`: sẽ là các bảng dài nhất theo thời gian.
- Bảng `nckh_*`: khi chấm điểm sẽ lọc theo năm; tra theo giảng viên đã được PK phủ.

---

## 7. NHIỆM VỤ THEO PHÂN CÔNG CỦA KHOA (KPI Nhóm III)

### Vì sao đảo chiều nhập liệu

Nhóm III trước đây dự kiến để **giảng viên tự kê khai** (bảng `nhiem_vu_cong_dong`).
Cách đó sai nghiệp vụ: vai trò _chủ trì_ / _phối hợp chính_ / _phối hợp_ là **quan hệ
tương đối giữa nhiều người trong CÙNG một nhiệm vụ**, chỉ Khoa mới có thẩm quyền phân
định. Mô hình cũ gắn mỗi dòng vào phiếu của một người nên nhiều GV cùng khai "chủ trì"
cho một việc mà hệ thống không phát hiện được.

Module này: **Khoa nhập liệu, giảng viên phản hồi.** Không có bước "xác nhận" của giảng
viên — thay bằng hạn phản hồi: hết hạn mà không lên tiếng thì hiểu là đồng ý.

Luồng cũ đã KHOÁ: `sp_nhiem_vu_cong_dong_create/_update/_soft_delete` trả
`NVCD_DA_NGUNG`, và `NhiemVuCongDongService` chặn sớm hơn (HTTP 409). Các endpoint
GET và dữ liệu năm cũ vẫn đọc bình thường.

### Năm quy tắc bất biến

1. **Điểm ghi cứng vào bản ghi phân công** (`phan_cong_nhiem_vu_khoa.diem_snapshot`)
   tại thời điểm gán, KHÔNG tính động từ vai trò mỗi lần đọc. `sp_nhiem_vu_khoa_save`
   chỉ re-snapshot điểm khi `id_vai_tro` THAY ĐỔI — sửa nhiệm vụ mà không đổi vai trò
   ai thì điểm giữ nguyên, kể cả khi `danh_muc_vai_tro_pvcd` đã đổi mức. Nhờ vậy dữ
   liệu kỳ cũ luôn khớp bản báo cáo đã ký.
2. **Mỗi nhiệm vụ tối đa một chủ trì** — chặn hai lớp: filtered unique index
   `ux_pcnvk_chu_tri` và kiểm tường minh trong SP (trả `TRUNG_CHU_TRI` → HTTP 422).
   Nhiệm vụ CHƯA có chủ trì vẫn lưu được (Khoa nhập dở), chỉ chặn khi CHỐT kỳ.
3. **Trần 20 điểm KHÔNG chặn việc gán.** Mọi API trả tổng điểm đều có hai con số:
   `TongDiemThucTe` và `TongDiemQuyDoi` = `MIN(thực tế, trần)`. Báo cáo và Excel dùng
   điểm quy đổi. Đây là khác biệt CÓ CHỦ ĐÍCH so với `nhiem_vu_cong_dong` cũ (vốn chặn
   cứng bằng `PVCD_CAP_EXCEEDED`).
4. **Điều kiện chốt kỳ**: không còn nhiệm vụ thiếu chủ trì, không còn nhiệm vụ chưa
   phân công ai, không còn phản hồi chưa xử lý. Vượt trần chỉ là CẢNH BÁO hiển thị.
   `sp_nhiem_vu_khoa_chot` tự tính lại điều kiện, không tin kết quả màn hình
   `kiem-tra-chot` mà client vừa xem.
5. **Ghi nhật ký mọi thay đổi vai trò, điểm và thao tác chốt kỳ** vào
   `lich_su_nhiem_vu_khoa`, trong CÙNG transaction với thao tác.

### 7.1. `ky_nhiem_vu_khoa`

Trạng thái duyệt gắn vào KỲ, không gắn vào từng bản ghi — không có state machine cho
từng dòng phân công. Chỉ 2 trạng thái: `1` đang mở (Khoa sửa tự do, GV phản hồi tự do),
`2` đã chốt (khoá ghi toàn bộ).

Kỳ được **tạo lười**: `sp_nhiem_vu_khoa_ky_get` và `_save` tự INSERT nếu chưa có, nên
Khoa không phải bấm "mở kỳ".

`han_phan_hoi` **hết hạn KHÔNG khoá gì** — chỉ là nhãn hiển thị ("không lên tiếng =
đồng ý"). Khác hẳn `ngay_dong_tu_danh_gia` của luồng phiếu (mục 2.9) vốn khoá ghi.

### 7.2 – 7.3. `nhiem_vu_khoa`, `phan_cong_nhiem_vu_khoa`

Danh mục dùng lại (KHÔNG tạo bảng mới):

- **`danh_muc_nhom_nhiem_vu`** — seed 7 nhóm công tác cố định, `loai_doi_tuong = 1`.
- **`danh_muc_vai_tro_pvcd`** — đã seed CT = 10, PHC = 7, PH = 4; giữ nguyên cơ chế
  override theo `(id_don_vi, id_nam)`. `sp_nhiem_vu_khoa_save` resolve theo đúng thứ tự
  ưu tiên `(đơn vị,năm) > (đơn vị,NULL) > (NULL,năm) > (NULL,NULL)`.

Client **không gửi điểm** — server tự resolve từ danh mục rồi mới snapshot.

Lưu theo lô: `sp_nhiem_vu_khoa_save` nhận TVP `dbo.PhanCongNhiemVuKhoaRow` chứa TOÀN BỘ
danh sách sau khi sửa, tự tính diff DELETE / UPDATE / INSERT trong một transaction.
Một form, một lần lưu — KHÔNG có endpoint riêng cho phân công.

### 7.4. `phan_hoi_nhiem_vu_khoa`

Hai loại: `1` sai vai trò (bắt buộc trỏ tới một nhiệm vụ của chính kỳ đó), `2` thiếu
nhiệm vụ (thường rơi vào nhóm 7). **Giảng viên chỉ tạo được PHẢN HỒI, không tự tạo được
nhiệm vụ** — đây là điểm chốt của thiết kế.

### 7.5. `minh_chung_nhiem_vu_khoa` — minh chứng HAI CẤP

- `cap_gan = 1` → cấp **nhiệm vụ**: quyết định phân công, kế hoạch, biên bản — dùng
  chung cho cả nhóm, tải lên một lần.
- `cap_gan = 2` → cấp **phản hồi**: file giảng viên tự gửi kèm.

Nếu chỉ cho tải ở cấp cá nhân thì cùng một quyết định bị tải lên nhiều lần và không biết
bản nào chuẩn; nếu chỉ cho ở cấp nhiệm vụ thì giảng viên không gửi bổ sung được khi Khoa
bỏ sót. Một bảng với XOR hai FK (`chk_mcnvk_cap`) thay vì hai bảng, vì cùng module và
cùng luồng upload/download.

Chỉ nhận **PDF**, kiểm HAI LỚP: đuôi file + chữ ký `%PDF-` (chặn đổi đuôi). File nằm ở
`App_Data/uploads/nhiem-vu-khoa/{nhiem-vu|phan-hoi}/{id}/{guid}.pdf` (ngoài webroot, đã
gitignore); DB chỉ giữ metadata. Tải xuống kiểm quyền và chặn path traversal.

Quyền đọc: người của Khoa (theo `fn_nhiem_vu_khoa_quyen`) | GV được phân công nhiệm vụ
đó | chủ nhân phản hồi. Quyền xoá: người nhập của Khoa | người tự tải file lên — và kỳ
phải còn mở.

### 7.6. `lich_su_nhiem_vu_khoa`

Dùng bảng `lich_su_*` riêng theo convention dự án (`lich_su_cham_diem`,
`lich_su_trang_thai_phieu`) — **KHÔNG** dùng bảng `nhat_ky`: bảng đó khai báo trong
schema từ đầu nhưng chưa từng có dòng nào ghi vào.

### Phân quyền

Tập trung ở inline TVF **`fn_nhiem_vu_khoa_quyen(@id_don_vi, @chuc_vu, @don_vi)`** —
một nơi duy nhất, fail-closed (chức vụ không tồn tại ⇒ tất cả cờ = 0). BLL
(`NhiemVuKhoaService`) gate lại lần nữa bằng `ma_chuc_vu` resolve qua `ChucVuDal`.

| Cờ         | Ai                                                             | Làm gì                                                                   |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `can_nhap` | `TK` `TKL` `TP` **`TLGVK`** trong phạm vi đơn vị, hoặc `ADMIN` | Tạo/sửa/xoá nhiệm vụ, phân công, xử lý phản hồi, minh chứng cấp nhiệm vụ |
| `can_chot` | `TK` `TKL` `TP` trong phạm vi đơn vị, hoặc `ADMIN`             | Chốt kỳ / mở lại kỳ — **`TLGVK` CỐ Ý bị loại**                           |
| `can_xem`  | `can_nhap`, hoặc `HT` / `ADMIN`                                | Xem toàn bộ                                                              |

`TLGVK` (trợ lý giáo vụ khoa) được nhập liệu vì thực tế họ là người gõ dữ liệu, nhưng
chốt kỳ là thẩm quyền của trưởng đơn vị.

Module chỉ áp dụng cho **Khoa** (`ma_don_vi LIKE 'K_%'`); đơn vị khác trả
`KHONG_PHAI_KHOA`. Giảng viên của Khoa xác định qua view `v_giang_vien_khoa`.

### Điểm đi vào phiếu đánh giá

Dùng lại **khung chấm điểm tự động** đã có, không viết đường mới (xem mục 4.2):

- Tiêu chí `Thực hiện nhiệm vụ theo phân công của Khoa` (nhóm 4, `diem_toi_da` 20) đặt
  `loai_nguon_diem = 2`, `cong_thuc_tong_hop = N'NVK_PHAN_CONG_KHOA'`.
- `fn_nckh_diem_tu_dong` thêm một nhánh khoá theo `@id_nhan_vien` + `@id_nam`: tổng
  `diem_snapshot` của các phân công trong năm, cap ở `@diem_toi_da`. Nhờ đó **cả ba
  luồng có ngay**: chấm khi GV nộp phiếu (`sp_phieu_cham_tu_dong_apply`), endpoint
  `POST api/phieu/{id}/tong-hop-tu-dong`, và preview `GET api/maudanhgia/{id}/diem-tu-dong`.
- `fn_nckh_minh_chung_tu_dong` thêm nhánh `loai_nguon = 6` liệt kê từng nhiệm vụ kèm vai
  trò và điểm ⇒ điểm và minh chứng không thể lệch nhau.
- `loai_thang_diem = 2` (Liên tục), KHÔNG có dòng `thang_diem` ⇒ `id_thang_diem_chon`
  luôn NULL — giống `VPGD_TUAN_THU`, vì điểm là tổng cộng dồn chứ không phải một mức
  rời rạc.

**CÓ Ý không lọc theo trạng thái kỳ**: GV thường nộp phiếu TRƯỚC khi Khoa chốt kỳ; nếu
đợi chốt mới tính thì điểm sẽ là 0 lúc nộp. Khoa chốt xong, chạy lại
`POST api/phieu/{id}/tong-hop-tu-dong` để refresh.

**Trần điểm định nghĩa MỘT nơi**: scalar UDF `fn_nhiem_vu_khoa_tran_diem()` (= 20). Đổi
trần = sửa hàm này VÀ `diem_toi_da` của tiêu chí. `sp_nhiem_vu_khoa_kiem_tra_chot` phát
cảnh báo `loai_van_de = 5` nếu hai con số lệch nhau, và
`GET api/cau-hinh/nhiem-vu-khoa` trả cờ `LechCauHinh`.

### Mã lỗi của module

`FORBIDDEN` → 403 · `NOT_FOUND` → 404 · `INVALID` / `KHONG_PHAI_KHOA` /
`GV_NGOAI_KHOA` → 400 · `KY_DA_CHOT` → 409 · `TRUNG_CHU_TRI` /
`CHOT_KHONG_HOP_LE` → 422 · `SQL_ERROR` → 500.

### Hợp đồng result set

Mọi SP của module: **RS1** = `success` / `message` / `error_code`; **RS2..** = dữ liệu,
chỉ phát khi `success = 1`. Nhờ vậy không nhánh lỗi nào phải NULL-pad danh sách cột
(khác `sp_nhiem_vu_cong_dong_create` cũ vốn lặp khối NULL 5 lần).

---

## 8. TỜ TRÌNH KPI KHOA & HẠN NGẠCH XUẤT SẮC

Gói hồ sơ KPI của 1 Khoa trong 1 năm. Đây là nơi **DUY NHẤT** tính hạn ngạch 20% và nâng
`xep_loai` lên mức 4 — không SP nào khác được ghi mức 4 vào `phieu_danh_gia.xep_loai`.

### 8.1. `to_trinh_kpi_khoa` — trạng thái gói

| Trạng thái | Tên           | Ý nghĩa                                                            |
| ---------- | ------------- | ------------------------------------------------------------------ |
| 1          | DANG_TONG_HOP | Chưa đủ 100% hồ sơ được Trưởng khoa chốt                           |
| 2          | DA_DONG_GOI   | Đã tính hạn ngạch + nâng xuất sắc; mở nút "Trình Hiệu trưởng"      |
| 3          | DA_TRINH      | Chờ Hiệu trưởng duyệt                                              |
| 4          | HT_DA_DUYET   | Chốt số liệu toàn Khoa, khóa chiến dịch, sinh báo cáo lương/thưởng |
| 5          | HT_TRA_VE     | HT trả về ≥1 hồ sơ; TK xử lý rồi trình lại                         |

```
1 ──[đóng gói: 100% hồ sơ ở trạng thái 4]──► 2
2 ──[TK trình Hiệu trưởng]──────────────────► 3   (lan_trinh += 1)
3 ──[HT duyệt gói]──────────────────────────► 4   (mọi phiếu 4 → 5)
3 ──[HT trả về, kèm danh sách hồ sơ]────────► 5   (các phiếu được chọn 4 → 3)
5 ──[TK xử lý xong, đóng gói lại]───────────► 2
```

Có hồ sơ rớt khỏi trạng thái 4 (TK trả dòng về thẩm định, HT trả hồ sơ về TK) thì gói
tự động về trạng thái 1.

### 8.2. Luật hạn ngạch top 20% — ĐÃ CHỐT VỚI NGƯỜI DÙNG

Phạm vi xếp hạng là **TỪNG KHOA**, không phải toàn trường.

```
so_giang_vien      = COUNT(phiếu trong gói WHERE loai_doi_tuong = 1)
han_ngach_xuat_sac = FLOOR(so_giang_vien * ty_le_xuat_sac)        -- ty_le mặc định 0.2000
```

Bốn điểm dễ hiểu sai, đọc kỹ:

1. **Mẫu số là TỔNG SỐ giảng viên của Khoa**, KHÔNG phải số người "Hoàn thành tốt".
   Khoa có 30 GV, 10 người mức 3 ⇒ hạn ngạch = `FLOOR(30 × 0.2)` = **6**, không phải 2.
2. **Làm tròn XUỐNG** (`FLOOR`). 27 GV ⇒ 5 suất, không phải 6.
3. **Viên chức/NLĐ (`loai_doi_tuong = 2`) KHÔNG tính vào mẫu số** và không tranh hạn ngạch.
   Họ giữ luật riêng, tối đa mức 2 (`TinhXepLoaiVienChuc`).
4. **Suất được LẤP ĐẦY, không bỏ trống.** Duyệt từ điểm cao xuống, chỉ lấy người vừa
   `xep_loai_khoa = 3` vừa `muc_nckhcn_qd838 = 2`. Người điểm cao nhưng không đạt QĐ 838
   bị **BỎ QUA** và suất dồn cho người kế tiếp — không bị mất suất.

Thứ tự xếp hạng: `ORDER BY tong_diem_tich_luy DESC, uu_tien_xuat_sac DESC`.
(SQL Server 2008: dùng `ROW_NUMBER() OVER (...)`, **không** có `OFFSET/FETCH`.)

### 8.3. Đồng hạng ở ranh giới — CHẶN, không tự quyết

Nếu số người **bằng điểm nhau** đang tranh số suất cuối còn lại nhiều hơn số suất, và chưa
ai được đánh dấu `uu_tien_xuat_sac`, thì `sp_to_trinh_khoa_dong_goi` phải **DỪNG** với
`error_code = 'DONG_HANG'` kèm danh sách người đồng hạng. Trưởng khoa vào chỉ định
(`PUT api/phieu/{id}/uu-tien-xuat-sac`) rồi đóng gói lại.

Cố ý KHÔNG tự tie-break bằng `id_nhan_vien` hay `tong_diem_vuot_troi`: đây là quyết định
nhân sự, hệ thống không được âm thầm chọn thay người.

### 8.4. Dữ liệu di trú từ quy trình cũ

Tờ trình sinh tự động cho các `(năm, đơn vị)` đã có hồ sơ HOAN_TAT, trạng thái = 4.
**`so_dat_xuat_sac` của dữ liệu cũ CÓ THỂ LỚN HƠN `han_ngach_xuat_sac`** — quy trình cũ
không có hạn ngạch nào. Đây là sự thật lịch sử, không phải lỗi dữ liệu; hạn ngạch chỉ áp
cho gói đóng mới.

### 8.5. `lich_su_to_trinh_kpi_khoa`

`hanh_dong`: 1 Đóng gói · 2 Trình HT · 3 HT duyệt gói · 4 HT trả về · 5 Mở lại gói.
`ly_do` bắt buộc (ở tầng API) khi `hanh_dong IN (4, 5)`. `so_ho_so_tra_ve` chỉ có nghĩa
khi `hanh_dong = 4`.

---

## 9. KÊ KHAI GIỜ QUY ĐỔI THEO PHỤ LỤC II

"Quy đổi các hoạt động chuyên môn ra giờ chuẩn giảng dạy". Giảng viên **tự kê khai** số
lượng từng đầu việc; Trưởng khoa/Trưởng khoa liên/Trưởng phòng **duyệt hoặc từ chối từng
dòng** và **được sửa số lượng** trước khi chốt.

### 9.0. Vì sao có module này — và phạm vi CHƯA làm

"Thời gian thực hiện" của giảng viên trong năm có **hai** nguồn:

1. **Tiết giảng dạy quy đổi theo từng loại** — dữ liệu do hệ thống ngoài gọi về. **CHƯA làm.**
2. **Hoạt động chuyên môn theo PHỤ LỤC II** — chính là module này.

Vì nguồn (1) chưa có, module này **CỐ Ý không ghi vào `gio_thuc_hien_gv`** và **không sửa
`sp_phieu_tong_hop_tu_dong`**. Nó chỉ lưu và phát API đọc. Điểm nối cho bước sau là
`sp_ke_khai_gio_quy_doi_tong_hop` (`GET api/ke-khai-gio-quy-doi/tong-hop`) — trả tổng giờ
đã duyệt / GV / năm, tách sẵn theo hai mục cấp 1 (Sau đại học / Đại học).

Đây **không phải** `gio_giang_import` (3.5): bảng đó là staging phẳng khớp theo `ho_ten`,
không có `id_nhan_vien`, không có `id_nam`, không có trạng thái duyệt.

### 9.1. `danh_muc_cong_viec_quy_doi` — cây, độ sâu KHÔNG đều

Dùng cây tự tham chiếu (giống `nhom_tieu_chi`) vì lá nằm ở các cấp khác nhau:

| Cấp của lá | Ví dụ                                                          |
| ---------- | -------------------------------------------------------------- |
| 2          | `Hướng dẫn đề án môn học` = 2,0/sinh viên                      |
| 3          | `Hoàn thành đề cương chi tiết` = 10/học viên                   |
| 4          | `Chủ tịch` (trong _Bảo vệ đề cương LV cao học_) = 2,0/đề cương |

Chỉ nút `la_la = 1` mới kê khai được. Nút gộp bắt buộc `he_so_quy_doi IS NULL`
(`chk_dmcvqd_la`).

**Cách đọc hệ số** — `giờ = ROUND(so_luong × he_so_quy_doi / so_luong_mau, 2)`:

| Chuỗi trong QĐ    | `he_so_quy_doi` | `so_luong_mau` | `don_vi_tinh` |
| ----------------- | --------------- | -------------- | ------------- |
| `10/học viên`     | 10,000          | 1              | học viên      |
| `2,5/LV(ĐA)`      | 2,500           | 1              | LV(ĐA)        |
| `1,0/10 bài`      | 1,000           | 10             | bài           |
| `1,0/5 sinh viên` | 1,000           | 5              | sinh viên     |
| `45/lớp/năm`      | 45,000          | 1              | lớp/năm       |

Giảng viên nhập **số lượng theo đơn vị tính** (số bài, số học viên, số bộ đề), **không bao
giờ nhập giờ**. Chuỗi gốc giữ nguyên ở `ghi_chu_quy_doi` để FE hiển thị đúng văn bản QĐ.

Seed: **74 dòng** = 2 mục cấp 1 + 20 nút gộp + **52 đầu việc kê khai được**
(36 ở _Giảng dạy sau đại học_, 16 ở _Giảng dạy đại học_).

Sửa danh mục **chỉ ADMIN** — đây là văn bản quy định của Trường, không để từng Khoa tự đổi
hệ số. Xoá là **soft** (`trang_thai = 0`) và bị chặn khi còn nút con đang hoạt động
(`CO_CON_HOAT_DONG`) — buộc Admin ngừng từ lá lên.

### 9.2. Vì sao snapshot hệ số vào từng dòng

`chi_tiet_ke_khai_gio_quy_doi` giữ `he_so_snapshot`, `so_luong_mau_snapshot`,
`ten_cong_viec_snapshot`, `don_vi_tinh_snapshot` (pattern `phan_cong_nhiem_vu_khoa.diem_snapshot`).

Nhờ vậy Admin sửa danh mục khi có QĐ mới **không làm đổi số liệu của bản kê đã chốt**.
Snapshot chỉ được làm mới khi **`id_cong_viec` của dòng đổi** — giữ nguyên đầu việc thì giữ
nguyên hệ số cũ.

**CỐ Ý không UNIQUE `(id_ke_khai, id_cong_viec)`**: cùng một đầu việc có thể kê nhiều dòng
cho các học viên / học phần / kỳ học khác nhau.

`ky_hoc` (261/262/263) nằm ở **dòng**, không ở header: header theo `id_nam` để cộng cả năm,
còn `ky_hoc` chỉ để đối chiếu với `gio_giang_import`. Có thể NULL.

### 9.3. Vòng đời và ai được làm gì

`ke_khai_gio_quy_doi.trang_thai`:

```
1 NHAP ──nộp──> 2 CHO_DUYET ──chốt──> 3 DA_DUYET
  ^               │
  └──huỷ nộp──────┘
                  └──trả lại──> 4 TRA_LAI ──nộp lại──> 2
```

`chi_tiet.trang_thai_dong`: 1 Chờ duyệt · 2 Đã duyệt · 3 Từ chối.

- `tong_gio_ke_khai` = SUM `gio_ke_khai` các dòng còn sống.
- `tong_gio_duyet` = SUM `gio_duyet` **chỉ các dòng `trang_thai_dong = 2`**. Dòng bị từ chối
  cho `gio_duyet = 0` nhưng **vẫn giữ** `so_luong` và `so_luong_duyet` để đối chiếu.
- **Chốt bị chặn** khi còn dòng `trang_thai_dong = 1` → `CON_DONG_CHUA_XET`.
- **Huỷ nộp bị chặn** khi người duyệt đã xét bất kỳ dòng nào → `DA_XET`.
- **Trả lại** bắt buộc có lý do, và reset toàn bộ `trang_thai_dong` về 1 + xoá
  `so_luong_duyet`/`gio_duyet` để giảng viên nộp lại từ đầu.

### 9.4. Phân quyền — `fn_ke_khai_gio_quy_doi_quyen`

Nguồn duy nhất, fail-closed (chức vụ không rõ ⇒ 0 hết):

| Cờ          | Ai                                                                                  |
| ----------- | ----------------------------------------------------------------------------------- |
| `can_sua`   | **chỉ chính chủ** bản kê                                                            |
| `can_duyet` | `ADMIN`, `HT`, hoặc `TK`/`TKL`/`TP` trong phạm vi đơn vị (đơn vị mình + đơn vị con) |
| `can_xem`   | chính chủ ∪ `can_duyet`                                                             |

`TLGVK` **cố ý bị loại** khỏi duyệt — duyệt là thẩm quyền của trưởng đơn vị (giống
`fn_nhiem_vu_khoa_quyen`).

**Trưởng đơn vị tự duyệt bản kê của chính mình là HỢP LỆ** — nếu chặn thì không ai duyệt
được bản kê của Trưởng khoa. `HT` duyệt được toàn trường nên vẫn còn đường duyệt chéo nếu
đơn vị muốn.

### 9.5. Ràng buộc CỐ Ý KHÔNG có

Người dùng đã chốt bỏ, ghi lại để đợt sau đừng "sửa nhầm" thành có:

- **Không** khoá theo hạn tự đánh giá (`nam_danh_gia.ngay_dong_tu_danh_gia` / `gia_han_danh_gia`).
- **Không** bắt buộc minh chứng — `minh_chung_ke_khai_gio_quy_doi` là tuỳ chọn.
- **Không** có trần tổng giờ quy đổi (khác nhiệm vụ Khoa, vốn có trần 20 điểm).

### 9.6. Hợp đồng result set + xung đột phiên bản

Mọi SP của module theo hợp đồng của `nhiem_vu_khoa`: `RS1 = success / message / error_code`,
`RS2..` chỉ phát khi `success = 1`.

Module này **CỐ Ý không dùng `RAISERROR`** (khác luồng phiếu): xung đột phiên bản trả về
như một `error_code = 'CONCURRENCY_CONFLICT'` ở RS1, để tầng DAL chỉ phải đọc một định dạng.
Bảo vệ vẫn đủ hai lớp: so `@row_version` trước, và guard mất-cập-nhật
`UPDATE ... WHERE trang_thai = <kỳ vọng>` + `@@ROWCOUNT = 0`.

Mọi SP thao tác bản kê kết thúc bằng `sp_ke_khai_gio_quy_doi_result_sets` (header / dòng /
minh chứng) nên mọi endpoint trả về **cùng một hình dạng dữ liệu**.

### 9.7. `lich_su_ke_khai_gio_quy_doi`

`hanh_dong`: 1 Tạo dòng · 2 Sửa dòng · 3 Xoá dòng · 4 Nộp · 5 Duyệt dòng · 6 Từ chối dòng ·
7 Chốt bản kê · 8 Trả lại · 9 Huỷ nộp.

Bước xoá dòng dùng `OUTPUT INSERTED.* INTO @dong_xoa` để chỉ ghi nhật ký các dòng **vừa**
bị gỡ ở lần lưu này, không dính các dòng đã gỡ từ trước.

---

## 10. KIÊM NHIỆM ĐA ĐƠN VỊ

Ca nghiệp vụ: một người vừa là giảng viên của Khoa, vừa giữ chức vụ lãnh đạo ở Phòng.
Hệ thống cũ chốt cứng **1 người = 1 đơn vị** qua `nhan_vien.id_don_vi`.

### 10.1. Mô hình đích

`nhan_vien_chuc_vu` trở thành bảng quan hệ **(người × đơn vị × chức vụ × khoảng thời gian)** —
nguồn sự thật duy nhất. `nhan_vien` chỉ còn giữ thuộc tính của **con người**.

- `id_don_vi` **NOT NULL** — mọi dòng quan hệ đều gắn với đúng 1 đơn vị.
- `id_chuc_vu` **NULL được** — "chỉ là thành viên, không giữ chức vụ" là trạng thái phổ biến nhất
  (danh mục `chuc_vu` **không có** mã `GV`/`NV` để điền).
- `la_chinh` — cờ đơn vị chính. JWT chỉ chứa được **1** `id_don_vi`, nên luôn phải có một dòng
  được chọn làm nguồn cho claim đó. Khái niệm này **vẫn cần** kể cả sau khi bỏ 2 cột
  denormalized ở Đợt 4 — nó chỉ chuyển từ cột sang cờ.
- `id_chuc_danh` **không chuyển** sang bảng này: chức danh nghề nghiệp (GV/GVC/PGS/GS) thuộc về
  con người, không thuộc quan hệ với đơn vị — một PGS dạy 2 khoa vẫn là PGS.

### 10.2. Hai filtered unique index (bắt buộc `SET QUOTED_IDENTIFIER ON`)

| Index                                                                           | Ý nghĩa                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `ux_nvcv_chinh (id_nhan_vien) WHERE la_chinh = 1 AND den_ngay IS NULL`          | Tối đa **1 đơn vị chính đang hiệu lực** / người                      |
| `ux_nvcv_hieu_luc (id_nhan_vien, id_don_vi, id_chuc_vu) WHERE den_ngay IS NULL` | Không trùng cặp (người, đơn vị, chức vụ) trên các dòng đang hiệu lực |

Unique index coi các `NULL` là **bằng nhau**, nên `ux_nvcv_hieu_luc` cũng chặn luôn việc một
người có hai dòng "thành viên không chức vụ" trên cùng một đơn vị.

Do có filtered index, **mọi script `CREATE/ALTER PROCEDURE` đụng tới bảng này phải chạy
bằng SSMS** (`SET QUOTED_IDENTIFIER ON`), không dùng `sqlcmd`.

### 10.3. Nguyên tắc phân quyền (áp dụng đầy đủ từ Đợt 2)

**Quyền = CẶP (đơn vị, chức vụ), không phải 2 scalar rời.** Nếu chỉ mở rộng đơn vị thành
tập hợp mà giữ chức vụ là scalar, người `TP` của Phòng sẽ nghiễm nhiên có quyền `TP` trên
Khoa mà họ chỉ giảng dạy → **leo thang quyền**.

Dấu vết đầu tiên của nguyên tắc này đã có từ Đợt 1:
`sp_nhan_vien_resolve_chuc_vu_ap_dung` nhận thêm `@id_don_vi` để resolve **trong phạm vi 1
đơn vị**. Claim JWT chỉ lấy chức vụ của **đơn vị chính** — chức vụ giữ ở đơn vị kiêm
nhiệm không được "chạy" vào claim. (Đợt 1–3 việc này do `sp_nhan_vien_sync_chuc_vu_ap_dung`
đảm nhiệm; Đợt 4 đã **xoá hẳn** SP đó và chuyển việc cho view `v_nhan_vien_chinh`.)

### 10.4. Trạng thái sau Đợt 1

Đợt 1 là đợt **chuẩn bị dữ liệu**; tiêu chí đạt là **hành vi của mọi API y hệt trước
migration**. Cụ thể:

- `nhan_vien.id_don_vi` / `id_chuc_vu` **vẫn còn và vẫn là nguồn đọc của ~49 chỗ trong SQL** —
  còn cột là còn lưới đỡ, đó là thứ cho phép chia đợt (expand → migrate → contract).
  _(Đợt 4 đã bỏ hẳn 2 cột này — xem mục 10.8.)_
- 74 đối tượng SQL nhận `@current_user_don_vi` **chưa bị đụng tới**.
- Backfill sinh cho mỗi `nhan_vien` có `trang_thai = 1` đúng 1 dòng `la_chinh = 1` copy nguyên
  `(id_don_vi, id_chuc_vu)` từ 2 cột hiện có, `tu_ngay = '2020-01-01'`. Nếu người đó đã có
  sẵn một dòng hiệu lực khớp đúng cặp đó thì **nâng dòng cũ** thay vì chèn dòng mới.
- `GET /api/auth/me` trả thêm mảng `DonVi[]` (đơn vị chính đứng đầu). **JWT không đổi.**
- `sp_auth_register` **chưa** sinh dòng `nhan_vien_chuc_vu` — việc đó thuộc Đợt 4. Người mới
  đăng ký sẽ có `DonVi[]` rỗng cho đến khi Admin thêm dòng hoặc Đợt 4 chạy; mọi chức năng
  khác vẫn chạy vì còn 2 cột denormalized.
  _(Đợt 4 đã sửa — `sp_auth_register` nay sinh đúng 1 dòng `la_chinh = 1`.)_

Các mục 4.1 (phiếu đánh giá), 7 (nhiệm vụ Khoa) và 9 (kê khai giờ quy đổi) **chưa đổi ở Đợt 1**.
Đợt 2 (phân quyền đa đơn vị) và Đợt 3 (2 phiếu / người / năm) đã chạy — xem mục 4.1 cho khoá
duy nhất mới và cách suy `loai_doi_tuong`, và mục 10.7 cho tổng kết Đợt 3.

### 10.5. Ràng buộc nghiệp vụ được cưỡng chế trong SP

- `sp_nhan_vien_chuc_vu_create` / `_update`: đặt `la_chinh = 1` sẽ **hạ cờ** dòng chính cũ trong
  cùng transaction; dòng chính bắt buộc `den_ngay IS NULL`.
- `sp_nhan_vien_chuc_vu_delete` / `_update`: **chặn** xoá hoặc hạ cờ dòng `la_chinh` cuối cùng của
  một nhân viên đang hoạt động — không ai được rơi vào trạng thái "không có đơn vị chính".
- Trùng cặp (người, đơn vị, chức vụ) trên dòng hiệu lực được báo bằng **thông điệp nghiệp vụ**
  chứ không để vỡ index.
- `sp_nhan_vien_chuc_vu_create` / `_update` trả về result set bằng cách `EXEC`
  `sp_nhan_vien_chuc_vu_get_by_id` (SP này có thêm `@success` / `@message` có default) —
  tầng DAL chỉ phải đọc **một định dạng duy nhất**.
- Ở tầng BLL, thao tác **đặt/đổi đơn vị chính hoặc đổi đơn vị của dòng** chỉ dành cho `ADMIN`
  (kiểm tra theo `ma_chuc_vu`); các thao tác còn lại giữ nguyên gate Admin/BGH cũ.

### 10.6. Đợt 2 — phân quyền đa đơn vị (đang triển khai theo module)

Đợt 2 là đợt **đổi hành vi**: từ đây một người dùng có thể dùng quyền ở đơn vị **không phải
đơn vị chính** mà **không cần đổi JWT**. Toàn bộ logic đa đơn vị nằm trong **đúng hai hàm**;
không SP nào được tự viết lại CTE đệ quy trên `don_vi` nữa.

#### Hai hàm dùng chung

| Hàm                                                       | Vai trò                                                                                                                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fn_pham_vi_don_vi(@id_nguoi, @chuc_vu_jwt, @don_vi_jwt)` | Bảng mọi cặp **(đơn vị, chức vụ)** đang hiệu lực, **đã bung sẵn cây đơn vị cấp dưới**. Cột: `id_don_vi`, `id_chuc_vu`, `ma_chuc_vu`, `la_chinh`, `la_goc` |
| `fn_co_quyen_don_vi(..., @id_don_vi_dich, @nhom)`         | Gate 1 dòng cho các kiểm tra vô hướng. `@nhom` ∈ `DUYET` / `NHAP` / `XEM`; fail-closed                                                                    |

`la_goc = 1` là đơn vị người đó **trực tiếp** thuộc, `0` là đơn vị con bung ra từ cây — cần để
phân biệt "trưởng đơn vị" với "trưởng cấp trên".

**Nhánh tương thích ngược (bắt buộc):** cặp trong JWT **luôn** có mặt trong kết quả, kể cả khi
người đó chưa có dòng `nhan_vien_chuc_vu` nào hoặc caller chưa truyền `@current_user_id`. Nhờ
vậy người **không** kiêm nhiệm cho kết quả **y hệt trước Đợt 2**.

`sp_nhan_vien_pham_vi_don_vi` là vỏ bọc của hàm thứ nhất cho tầng C#
(`NhanVienChucVuDal.GetPhamVi` → `List<PhamViDonViDto>`).

#### Bốn dạng điểm gate được viết lại

|        | Dạng cũ                                                            | Dạng mới                                                   |
| ------ | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| **P1** | `id_don_vi = @cu_dv OR id_don_vi_cha = @cu_dv` (chỉ **1 cấp** con) | `id_don_vi IN (SELECT id_don_vi FROM @don_vi_truong)`      |
| **P2** | CTE đệ quy tự viết (**toàn bộ** cây con)                           | như trên — hàm đã bung sẵn cây                             |
| **P3** | `tieu_chi_don_vi_cham pq WHERE pq.id_don_vi = @cu_dv`              | `pq.id_don_vi IN (…)` — tập đơn vị người đó **làm trưởng** |
| **P4** | snapshot `id_don_vi_tham_dinh = @cu_dv`                            | ghi **đúng đơn vị đã cho quyền** trên dòng đó              |

P1 và P2 vốn hiểu "đơn vị của tôi" **khác nhau**; cả hai nay đi qua `fn_pham_vi_don_vi` nên
thống nhất về **toàn bộ cây con**. DB hiện chỉ có 2 cấp (`DUE` → Khoa/Phòng/TT) nên kết quả
thực tế không đổi.

#### Cái bẫy phải tránh ở mọi điểm gate

Hầu hết SP cũ resolve `@ma_chuc_vu` từ JWT **một lần ở đầu**, rồi kiểm
`@ma_chuc_vu IN (N'TK', N'TKL', N'TP')` **tách rời** với phép kiểm đơn vị. Hai vế tách rời =
người `TP` của Phòng mang tư cách `TP` sang **mọi** đơn vị mà câu lệnh nhắc tới. Hai vế đó
**phải gộp vào cùng một mệnh đề `EXISTS`**:

```sql
EXISTS (SELECT 1 FROM dbo.fn_pham_vi_don_vi(@uid, @cv, @dv) q
        WHERE q.id_don_vi = <cột đơn vị của dữ liệu>
          AND q.ma_chuc_vu IN (N'TK', N'TKL', N'TP'))
```

Nguyên tắc này áp cả ở tầng BLL: `PhamViDonViDto` giữ `IdDonVi` và `MaChucVu` **trên cùng một
phần tử**, và mọi phép kiểm đi qua `CoChucVuTrongPhamVi(phamVi, set, idDonViDich)` —
`idDonViDich = null` chỉ dành cho vai trò có hiệu lực toàn hệ thống (`HT` / `ADMIN`).

#### Tiến độ

| Bước           | Nội dung                                                                      | Trạng thái |
| -------------- | ----------------------------------------------------------------------------- | ---------- |
| 1              | `fn_pham_vi_don_vi` + `fn_co_quyen_don_vi` + `sp_nhan_vien_pham_vi_don_vi`    | Xong       |
| 2              | `fn_nhiem_vu_khoa_quyen` + 16 SP module nhiệm vụ Khoa                         | Xong       |
| 3              | `fn_ke_khai_gio_quy_doi_quyen` + module kê khai giờ quy đổi                   | Xong       |
| 4              | View `v_giang_vien_khoa` → **1 dòng / (GV, Khoa)** + các consumer             | Xong       |
| 5 · module 1/6 | Vi phạm giảng dạy (15 SP)                                                     | Xong       |
| 5 · module 2/6 | **Phiếu KPI cá nhân (16 SP)** + 2 SP hỗ trợ `sp_tieu_chi_don_vi_cham_check_*` | Xong       |
| 5 · module 3/6 | **Phiếu đánh giá đơn vị (8 SP)**                                              | Xong       |
| 5 · module 4/6 | **Báo cáo (3 SP)**                                                            | Xong       |
| 5 · module 5/6 | **Tờ trình KPI Khoa (4 SP)**                                                  | Xong       |
| 5 · module 6/6 | **Phản hồi SV (2 SP)**                                                        | Xong       |
| 6              | Bỏ 2 chỗ hardcode `N'P_QLCL'`                                                 | Xong       |
| 7              | 16 SP còn đọc chức vụ như **một scalar JWT** (gate `ADMIN` / `HT`+`ADMIN`)    | Xong       |
| 8              | `NhanVienChucVuDal.GetPhamVi` + 5 chỗ so sánh đơn vị trực tiếp ở BLL          | Xong       |

#### Ảnh hưởng tới mục 4.1 (phiếu đánh giá) sau module 2/6

- **Chữ ký SP đổi ở đúng 3 chỗ**, đều có `DEFAULT` nên caller cũ không gãy:
  `sp_phieu_khoa_get_pending` (+`@current_user_chuc_vu`),
  `sp_tieu_chi_don_vi_cham_check_quyen` và `_check_phieu` (+`@current_user_id`).
  13 SP còn lại không đổi chữ ký — chúng đã có sẵn `@current_user_id`, hoặc có
  `@id_nguoi_thuc_hien` / `@id_nguoi_dg_khoa` vốn **luôn** bằng `currentUserId`.
- `chi_tiet_danh_gia.id_don_vi_tham_dinh` (P4) nay ghi **đơn vị đã cho quyền** chứ không
  phải đơn vị trong JWT. Với người không kiêm nhiệm hai giá trị trùng nhau.
- `sp_tieu_chi_don_vi_cham_check_quyen` trả `don_vi_duoc_cham` đã **bao hàm** "người này làm
  trưởng tại đơn vị được giao". Vì thế BLL phải hỏi `LaTruongDonVi` **trước**
  `DonViDuocCham`, nếu không người không phải trưởng đơn vị sẽ nhận thông điệp sai.
- `PhieuDanhGiaService.ResolveMaChucVu(id)` và bản sao của nó trong `MinhChungService`
  **đã bị xoá**: chúng chỉ đọc `id_chuc_vu` của JWT nên mọi chỗ dùng chúng đều là một phép
  kiểm chức vụ **vô hướng**. Cần `ma_chuc_vu` thì lấy từ `LayPhamVi()` (có `id_don_vi` đi kèm).
- 4 method service nhận thêm `currentUserDonVi` (`Submit` / `HuyNop` / `NopLai` /
  `GetPagedPendingTruong`) — chúng gọi tới gate vai trò nhưng trước đây không thread giá trị
  này. Controller đã có sẵn biến, chỉ truyền thêm.

#### Ảnh hưởng tới mục 4.9–4.14 (đánh giá đơn vị) sau module 3/6

Module này có **bộ vai trò riêng**, khác phiếu cá nhân:

| Vai trò             | Được làm gì                                            |
| ------------------- | ------------------------------------------------------ |
| `TKK` / `TKP`       | tạo phiếu, tổng hợp KPI, nhập điểm, gửi (1 → 2)        |
| `TK` / `TKL` / `TP` | chấm điểm duyệt + duyệt cấp đơn vị (2 → 3)             |
| `HT` / `ADMIN`      | xem tất cả; duyệt trường (3 → 4), chốt (4 → 5), mở lại |

`TKK`/`TKP` **không** thuộc nhóm nào của `fn_co_quyen_don_vi` (`NHAP` = TK/TKL/TP/TLGVK),
nên 8 SP của module ghép **trực tiếp** trên `fn_pham_vi_don_vi` — đúng nguyên tắc
“module có ngữ nghĩa riêng thì tự ghép, không ép vào hàm gate chung”.

- **Chữ ký đổi ở đúng 2 SP đọc**, đều có `DEFAULT`: `sp_phieu_dv_get_paged` và
  `sp_phieu_dv_get_detail` (+`@current_user_id INT = NULL`). 6 SP ghi không đổi — chúng
  đã có `@id_nguoi_thuc_hien` / `@id_nguoi_nhap` / `@id_nguoi_duyet` vốn **luôn** bằng
  `currentUserId`.
- **Tầng BLL không có gate nào phải bỏ**: `PhieuDanhGiaDonViService` không tự kiểm
  `ma_chuc_vu` ở đâu cả — toàn bộ phân quyền của module nằm trong SP. Chỉ sửa `DAL` để
  truyền `currentUserId` cho 2 SP đọc.
- **4 SP cấp Trường không đổi ở module này**: `sp_phieu_dv_truong_duyet`,
  `sp_chi_tiet_dv_update_diem_truong`, `sp_phieu_dv_chot`, `sp_phieu_dv_mo_lai` chỉ kiểm
  `ma_chuc_vu IN (N'HT', N'ADMIN')` — vai trò toàn hệ thống, không dính đơn vị.
  (Cả 4 được **bước 7** xử lý riêng: vai trò toàn hệ thống vẫn phải đọc từ _tập_ chức vụ
  chứ không từ claim JWT — xem mục “Bước 7” bên dưới. Chữ ký vẫn không đổi.)
- **`@member_don_vi` trong `sp_phieu_dv_tong_hop_kpi` KHÔNG phải điểm gate.** Đó là phạm vi
  **dữ liệu** (“lấy thành viên của đơn vị nào để tính KPI”), đi từ `id_don_vi` của **phiếu**
  chứ không từ người đăng nhập — giữ nguyên CTE đệ quy ở đó.

#### Module 4/6 (báo cáo) — một điểm cần biết

Ba SP `sp_bao_cao_*` dùng chung **một** mệnh đề gate (HT/ADMIN ∨ chủ phiếu ∨ trưởng đơn
vị), không đổi chữ ký SP nào và **không sửa một dòng C# nào** — `BaoCaoService` chỉ
validate đầu vào rồi gọi thẳng DAL.

Riêng `sp_bao_cao_diem_trung_binh` gom nhóm theo các đơn vị **con trực tiếp** của một
`@parent_id`. Khi caller không truyền `@id_don_vi`, trưởng đơn vị trước đây lấy thẳng
`@current_user_don_vi` làm gốc. Nay “đơn vị của tôi” là một **tập**, mà báo cáo chỉ gom
được theo **một** gốc, nên chọn xác định: `ORDER BY la_chinh DESC, la_goc DESC,
id_don_vi ASC` — cùng thứ tự đã dùng ở module vi phạm và phiếu cá nhân.

> `@parent_id` **không phải điểm gate**: nó chỉ quyết định cách gom nhóm. Quyền đọc vẫn
> do mệnh đề `WHERE` cưỡng chế, nên truyền `@id_don_vi` tùy ý không lộ dữ liệu của đơn
> vị khác — chỉ ra kết quả rỗng.

#### Ảnh hưởng tới mục 8 (tờ trình KPI Khoa) sau module 5/6

Kế hoạch ghi 5 SP; thực tế chỉ **4 SP** mang gate theo đơn vị
(`sp_to_trinh_khoa_get_paged` · `_get_detail` · `_dong_goi` · `_trinh`).
`_ht_duyet` và `_ht_tra_lai` chỉ kiểm `ma_chuc_vu IN (N'HT', N'ADMIN')` — vai trò toàn
hệ thống, không dính đơn vị, nên module này không phải sửa. **Không đổi chữ ký SP nào.**
(Hai SP đó được **bước 7** xử lý — xem mục “Bước 7” bên dưới.)

**Một sự không nhất quán có sẵn — cố ý giữ nguyên:**

| SP                            | Ai đọc được                                                         |
| ----------------------------- | ------------------------------------------------------------------- |
| `sp_to_trinh_khoa_get_paged`  | **mọi người** thuộc đơn vị (không lọc chức vụ; BLL cũng không gate) |
| `sp_to_trinh_khoa_get_detail` | chỉ `TK`/`TKL`/`TP` của đúng đơn vị (+ `HT`/`ADMIN`)                |

Đợt 2 **chỉ** sửa phần “đơn vị”, không âm thầm siết vai trò: siết ở `get_paged` sẽ làm
giảng viên thường mất danh sách họ đang xem được — vi phạm tiêu chí “người không kiêm
nhiệm cho kết quả y hệt trước”. Muốn siết thì làm thành một thay đổi **riêng, có chủ
đích**. Hệ quả của việc giữ nguyên: người kiêm nhiệm thấy thêm **header** gói KPI của đơn
vị thứ hai trong danh sách — đúng theo luật hiện hành của SP đó, không phải lộ dữ liệu.

**Tầng BLL:** `ToTrinhKhoaService` có **4 gate chức vụ vô hướng** (nguồn 403 giả) đã chuyển
sang đọc phạm vi: `IsTruongDonVi` → `DongGoi`/`Trinh`, `IsCapTruong` → `HtDuyet`/`HtTraLai`.
Hai method `HtDuyet`/`HtTraLai` nhận thêm `currentUserDonVi` (Controller đã có sẵn biến).
`ResolveMaChucVu(id)` trong service này **đã bị xoá** — giống `PhieuDanhGiaService` và
`MinhChungService` ở module 2/6.

#### Mục 5 (điểm TB phản hồi sinh viên) sau module 6/6 — và bước 6

Hai SP `sp_diem_tb_phan_hoi_sv_chot` / `_get_chi_tiet` vừa là module 6/6, vừa là nơi chứa
**2 chỗ hardcode `N'P_QLCL'`** của bước 6 — nên làm cùng một lần.

**Luật nghiệp vụ KHÔNG đổi**: quyền chốt vẫn là `ADMIN` (bất kỳ đâu) hoặc `TP` **tại
đúng** đơn vị `P_QLCL`. Cái đổi là **cách đo**: trước đây `@ma_don_vi` suy từ
`@current_user_don_vi` — một giá trị duy nhất trong JWT — nên người là `TP` của `P_QLCL`
mà đơn vị **chính** lại là Khoa (ca kiêm nhiệm) không thao tác được. Nay kiểm trên **tập**
đơn vị.

> **Không nới lỏng quyền.** `@pham_vi` mang theo cả `ma_don_vi`, và hai vế (chức vụ, mã
> đơn vị) vẫn đối chiếu **trên cùng một dòng** — `TP` của một Phòng khác vẫn bị từ chối.

Mã `N'P_QLCL'` **vẫn là hằng số**; biến nó thành cấu hình là một việc khác, không thuộc
phạm vi Đợt 2.

Chữ ký chỉ đổi ở `_get_chi_tiet` (`+@current_user_id INT = NULL`). `_chot` không đổi — nó
đã có `@id_nguoi_chot` vốn luôn bằng `currentUserId`. `DiemTbPhanHoiSinhVienService`
không có gate vai trò nào để bỏ.

#### Bước 7 — vai trò **cấp Trường** cũng phải đọc từ _tập_, không từ claim JWT

Rà soát trước khi sửa cho thấy **không còn** SP nào thiếu đường lấy id người đăng nhập:
61 SP đã có `@current_user_id` (DAL truyền đủ), và các SP viết lại ở bước 2–6 dùng tham số
người thực hiện có sẵn (`@id_nguoi_thuc_hien` / `@id_nguoi_duyet` / `@id_nguoi_nhap` /
`@id_nguoi_chot` / `@id_nguoi_dg_khoa`) — đều **luôn** bằng `currentUserId`. Việc thật sự
còn lại của bước 7 là **16 SP** gate bằng chức vụ cấp Trường mà vẫn đọc kiểu cũ:

```sql
DECLARE @ma_chuc_vu NVARCHAR(20);
SELECT @ma_chuc_vu = ma_chuc_vu FROM dbo.chuc_vu
 WHERE id_chuc_vu = @current_user_chuc_vu;   -- MỘT giá trị từ JWT
```

Claim JWT chỉ mang cặp của **đơn vị chính** (Đợt 4 giữ nguyên ý nghĩa claim này). Người
kiêm nhiệm giữ `ADMIN`/`HT` ở **dòng không phải đơn vị chính** sẽ bị từ chối, dù họ thực
sự có dòng đó trong `nhan_vien_chuc_vu`.

Cách sửa là **nâng** chức vụ chứ không thay thế phép kiểm — đặt ngay sau câu `SELECT`
scalar cũ, giữ nguyên câu `IF` gate bên dưới:

```sql
IF (@ma_chuc_vu IS NULL OR @ma_chuc_vu NOT IN (N'HT', N'ADMIN'))
    SELECT TOP 1 @ma_chuc_vu = q.ma_chuc_vu
    FROM dbo.fn_pham_vi_don_vi(<id người dùng>, @current_user_chuc_vu, NULL) q
    WHERE q.ma_chuc_vu IN (N'HT', N'ADMIN');
```

Đây là thay đổi **cộng thêm**: chỉ chạy khi cặp JWT _chưa_ đủ quyền, và chỉ nhận được giá
trị nằm trong chính danh sách chức vụ mà gate cho phép. Không có đường nào cấp thêm quyền
cho người không có dòng tương ứng trong bảng.

> **Vì sao `@don_vi_jwt = NULL` ở đây.** `ADMIN`/`HT` là vai trò cấp Trường — đơn vị
> **không tham gia** phép kiểm (`fn_co_quyen_don_vi` cũng trả 1 cho `ADMIN` ở mọi đơn vị).
> Nhánh tương thích ngược của `fn_pham_vi_don_vi` không cần dùng, vì cặp JWT đã được câu
> `SELECT` scalar ở trên xử lý rồi. Đây **không phải** chỗ “tách đơn vị khỏi chức vụ”: mọi
> gate theo đơn vị (`TK`/`TKL`/`TP`/`TLGVK`) vẫn đối chiếu hai vế **trên cùng một dòng**.

**Chữ ký:** 8 SP thêm `@current_user_id INT = NULL` (có `DEFAULT` nên caller cũ không gãy);
8 SP còn lại không đổi vì đã có sẵn tham số người thực hiện.

| Thêm `@current_user_id`                                                   | Dùng tham số có sẵn                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `sp_loai_vi_pham_create` · `_update` · `_delete` · `_don_vi_ghi_nhan_set` | `sp_chi_tiet_dv_update_diem_truong` → `@id_nguoi_dg_truong`         |
| `sp_gia_han_list`                                                         | `sp_phieu_dv_truong_duyet` → `@id_nguoi_duyet`                      |
| `sp_danh_muc_cong_viec_quy_doi_create` · `_update` · `_delete`            | `sp_phieu_dv_chot` → `@id_nguoi_chot`                               |
|                                                                           | `sp_phieu_dv_mo_lai` → `@id_nguoi_mo_lai`                           |
|                                                                           | `sp_gia_han_upsert` · `_delete` → `@current_user_id` (đã có)        |
|                                                                           | `sp_to_trinh_khoa_ht_duyet` · `_ht_tra_lai` → `@id_nguoi_thuc_hien` |

**Tầng C#** — 3 chuỗi DAL/BLL/Controller cho 8 SP đổi chữ ký: `LoaiViPham*`, `GiaHan*`,
`CongViecQuyDoi*`. Ba Controller **vốn đã** lấy `currentUserId` ra rồi bỏ đi, nay truyền
tiếp. Gate `ADMIN` ở tầng BLL (`LoaiViPhamService.EnsureAdmin` và
`CongViecQuyDoiService.CheckAdmin`) **phải nâng theo cùng một cách**, nếu không BLL vẫn trả
403 _trước_ khi chạm tới SP. `GiaHanService` không có gate BLL — SP là lớp duy nhất.

#### Bước 8 — tầng C#

`NhanVienChucVuDal.GetPhamVi(idNhanVien, chucVuJwt, donViJwt)` (bọc
`sp_nhan_vien_pham_vi_don_vi`) đã có từ bước 5. Trong 5 chỗ so sánh đơn vị trực tiếp mà kế
hoạch liệt kê, 4 chỗ đã chuyển sang phạm vi trong lúc làm bước 5
(`MinhChungService` · `PhieuDanhGiaService` · `ViPhamGiangDayService` ×2); chỗ còn lại là
`NhiemVuCongDongService.CanRead` — đúng dạng leo thang kinh điển:

```csharp
if (IsCapKhoa(currentUserChucVu))            // chức vụ lấy từ JWT
{
    if (ctx.IdDonVi == currentUserDonVi) return true;      // đơn vị so sánh RỜI
    return ctx.IdDonViCha.HasValue && ctx.IdDonViCha.Value == currentUserDonVi;
}
```

nay gộp thành `CoChucVuTrongPhamVi(phamVi, CapKhoaMaChucVu, ctx.IdDonVi)` — cùng khuôn với
`MinhChungService`, kèm cache 1 phần tử. Nhánh `IdDonViCha` **bỏ hẳn**:
`fn_pham_vi_don_vi` đã bung sẵn cây đơn vị cấp dưới. `CanWrite` chỉ kiểm vai trò cấp Trường
và **không** mang `currentUserDonVi` (ba method gọi nó thuộc luồng tự kê khai đã ngừng), nên
truyền `0` cho đơn vị JWT — đơn vị không tham gia phép kiểm này. Chữ ký của 14 service đang
thread `currentUserDonVi` **giữ nguyên** đúng như kế hoạch.

### 10.7. Đợt 3 — hai phiếu / người / năm

| Việc                                                    | Trạng thái                            |
| ------------------------------------------------------- | ------------------------------------- |
| `uq_phieu_unique` → `(id_nam, id_nhan_vien, id_don_vi)` | Xong                                  |
| `sp_phieu_danh_gia_create` + `@id_don_vi INT = NULL`    | Xong                                  |
| Guard chống cộng trùng điểm tự động (2 SP)              | Xong                                  |
| `sp_to_trinh_khoa_dong_goi`                             | **Không sửa** — đã xác nhận bằng test |
| C#: `PhieuDanhGiaCreateRequest.IdDonVi` + DAL + BLL     | Xong                                  |

Chi tiết ngữ nghĩa (khoá duy nhất, cách suy `loai_doi_tuong`, luật viên chức tối đa mức 2,
quy tắc chọn phiếu nhận điểm tự động) nằm ở **mục 4.1** — chỗ đó là nguồn duy nhất, đừng
chép lại ở đây.

**`sp_phieu_danh_gia_create` — 2 điểm dễ vấp:**

- Đơn vị truyền lên phải có **dòng `nhan_vien_chuc_vu` còn hiệu lực tại `ngay_ket_thuc` của
  năm đánh giá** của **người được tạo phiếu** (không phải của người đang đăng nhập). Đơn vị
  chính luôn hợp lệ kể cả khi chưa backfill. Sai → `"Nhan vien khong thuoc don vi nay trong
nam danh gia"`.
- `id_mau` truyền lên phải cùng `loai_doi_tuong` với kết quả SP suy ra từ đơn vị. Tạo phiếu
  Phòng mà đưa mẫu GV sẽ bị chặn ở bước kiểm mẫu.

**Bản định nghĩa trùng lặp đã bị xoá.** `procedure.sql` trước Đợt 3 chứa **hai** khối
`CREATE PROCEDURE sp_phieu_danh_gia_create`; bản sau ghi đè bản trước nên bản đầu là rác từ
một lần refactor cũ. Đợt 3 xoá hẳn bản rác — nếu sau này thấy SP "không nhận thay đổi", hãy
`grep -c "CREATE PROCEDURE dbo.<tên>"` trước khi debug tiếp.

**Ba bảng CỐ Ý giữ 1 dòng / người / năm — đừng tách theo đơn vị:**
`gio_thuc_hien_gv`, `ke_khai_gio_quy_doi`, `diem_tb_phan_hoi_sinh_vien`. Chúng mô tả **con
người** (giờ đã dạy, giờ đã kê khai, điểm SV chấm), không mô tả quan hệ với đơn vị. Chính vì
chúng đơn trị mà điểm tự động mới phải chọn đúng một phiếu để ghi vào.

**Tại sao `sp_to_trinh_khoa_dong_goi` không phải sửa** (đã kiểm bằng đóng gói thật, rollback):
SP phân hoạch mọi truy vấn theo `(id_nam, id_don_vi)` và mẫu số hạn ngạch chỉ đếm
`loai_doi_tuong = 1`. Hai phiếu của người kiêm nhiệm tự rơi vào 2 gói khác nhau. Kết quả đo
được với người `id_nhan_vien = 39` (GV Khoa Kế toán kiêm TP Phòng KH): gói `K_KTOAN` có
`so_giang_vien = 1`, gói `P_KH` có `so_giang_vien = 0`.

---

### 10.8. Đợt 4 — bỏ hẳn `nhan_vien.id_don_vi` + `nhan_vien.id_chuc_vu` (contract)

Đây là bước **contract** của expand → migrate → contract. Sau đợt này **không còn lưới đỡ**:
mọi chỗ đọc đơn vị / chức vụ đều phải đi qua `nhan_vien_chuc_vu`.

`nhan_vien.id_chuc_danh` **GIỮ NGUYÊN**. Chức danh nghề nghiệp thuộc về **con người**, không
thuộc quan hệ với đơn vị — một PGS dạy 2 khoa vẫn là PGS.

#### View `v_nhan_vien_chinh` — cái thay thế 2 cột

```sql
FROM dbo.nhan_vien nv          →   FROM dbo.v_nhan_vien_chinh nv
```

Giữ nguyên alias `nv.` nên thân truy vấn không phải sửa — đó là lý do view tồn tại.

| Đặc tính                         | Giá trị                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| Số dòng                          | **Đúng 1 / nhân viên** — `LEFT JOIN` chứ không `INNER JOIN`     |
| Nguồn `id_don_vi` / `id_chuc_vu` | Dòng `nhan_vien_chuc_vu` có `la_chinh = 1 AND den_ngay IS NULL` |
| Vì sao không nhân dòng           | Vị từ JOIN **trùng khít** với vị từ của `ux_nvcv_chinh`         |
| Khi không có dòng `la_chinh`     | 2 cột = `NULL` (người đó **không biến mất** khỏi danh sách)     |

**Chỉ thay ở nơi thực sự cần 2 cột đó.** SP nào chỉ cần `ho_ten` / `email` vẫn đọc thẳng
`dbo.nhan_vien` — không thay đại trà.

#### Những chỗ **không** dùng view mà đọc thẳng bảng quan hệ

| SP                                          | Vì sao                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| `sp_nhan_vien_get_list`                     | Bộ lọc `@id_don_vi` / `@ma_don_vi` / `@bao_gom_don_vi_con` phải thấy **mọi** đơn vị |
| `sp_don_vi_get_all` / `sp_don_vi_get_by_id` | `so_nguoi_dung` đếm theo quan hệ, có `DISTINCT`                                     |
| `sp_don_vi_delete` / `sp_chuc_vu_delete`    | Kiểm "đang được sử dụng" trên quan hệ                                               |

`sp_nhan_vien_get_list` — **ba điểm phải nhớ**:

1. Người kiêm nhiệm **xuất hiện ở danh sách của cả 2 đơn vị** — đúng mong đợi.
2. Lọc bằng `EXISTS`, **không JOIN** → mỗi người vẫn đúng **1 dòng**.
3. `@id_don_vi` và `@id_chuc_vu` phải khớp **trên cùng một dòng quan hệ** — quyền là **cặp**
   (đơn vị, chức vụ). Lọc "TP của Khoa K" **không** được trả về người là TP ở Phòng
   nhưng chỉ là thành viên của Khoa K.

Cột `id_don_vi` / `id_chuc_vu` **trả về** vẫn là của **đơn vị chính** — DTO C# giữ nguyên
`IdDonVi` / `IdChucVu` nên FE không phải sửa gì. Hệ quả cần biết: lọc theo Khoa K có thể
trả về một người hiển thị đơn vị là Phòng KH — **đúng** theo hợp đồng "giá trị của đơn
vị chính".

#### `sp_auth_register` — chỗ **ghi** duy nhất

INSERT `nhan_vien` (không còn 2 cột) **rồi** INSERT 1 dòng `nhan_vien_chuc_vu` với
`la_chinh = 1`, `tu_ngay = hôm nay` — **cùng một transaction**, không bao giờ tồn tại nhân
viên "không thuộc đơn vị nào". Chữ ký SP **không đổi** (vẫn `@id_don_vi` + `@id_chuc_vu`).
SP validate `@id_don_vi` / `@id_chuc_vu` **trước** khi mở transaction để trả thông báo nghiệp
vụ thay vì lỗi FK thô.

#### JWT — tên và ý nghĩa claim **không đổi**

`sp_auth_get_user_for_login`, `sp_auth_get_user_for_refresh_token`, `sp_auth_get_user_by_id`
đọc `id_don_vi` / `id_chuc_vu` từ `v_nhan_vien_chinh`. Tên cột result set giữ nguyên nên
mapping C# không đổi tên field — chỉ phải **chịu được `DBNull`**.

`AuthService.Login` và `.Refresh` **chặn** phát token khi `IdDonVi <= 0` (403 +
_"Tai khoan chua duoc gan don vi chinh"_). Phát JWT với `id_don_vi` rỗng sẽ khiến mọi gate
phân quyền SQL im lặng trả về rỗng — triệu chứng rất khó chẩn đoán, nên fail nhanh ở đây.

#### Đã xoá hẳn

`sp_nhan_vien_sync_chuc_vu_ap_dung` + `NhanVienChucVuDal.SyncChucVuApDung` +
`NhanVienChucVuService.SyncChucVuApDung` + 3 chỗ gọi trong create / update / delete.
SP này chỉ làm một việc: đồng bộ 2 cột denormalized. Hết cột là hết lý do tồn tại.
`sp_nhan_vien_resolve_chuc_vu_ap_dung` **vẫn còn** — nó resolve chức vụ theo ngày + đơn vị,
không ghi gì.

#### DDL cuối — thứ tự bắt buộc

`DROP INDEX ix_nv_don_vi`, `ix_nv_chuc_vu` → `DROP CONSTRAINT fk_nv_don_vi`, `fk_nv_chuc_vu`
→ `ALTER TABLE nhan_vien DROP COLUMN`. Index và FK đều **chặn** `DROP COLUMN`; hai cột được
drop bằng **hai câu lệnh riêng** để script chạy lại được.

`update_database.sql` của đợt này **dừng hẳn** (`RAISERROR ... 20`) nếu còn nhân viên đang
hoạt động không có dòng `la_chinh` — họ sẽ mất đơn vị ngay khi cột biến mất.

#### Cách tìm chỗ còn sót

```sql
-- Chạy sau migration; phải trả 0 dòng (bước 5b của update_database.sql).
SELECT * FROM sys.dm_sql_referenced_entities('dbo.<tên SP>', 'OBJECT')
WHERE referenced_entity_name = N'nhan_vien'
  AND referenced_minor_name IN (N'id_don_vi', N'id_chuc_vu');
```

`grep` không đủ vì alias có thể tên gì cũng được — `sys.dm_sql_referenced_entities` mới là
cách đếm đúng.
