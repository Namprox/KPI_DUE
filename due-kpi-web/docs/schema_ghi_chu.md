# Ghi chú schema — mô tả & giải thích các bảng

> File này chứa toàn bộ phần comment mô tả/giải thích nghiệp vụ tách ra từ
> `App_Data/schema.sql` (schema.sql giữ DDL + chú thích ngắn trên cột).
> Số mục (1.1, 2.8, 4.7…) trùng với số mục trong schema.sql.

---

> **Trạng thái đồng bộ `schema.sql`** (cập nhật ở đợt "Đánh giá KPI viên chức theo quý"):
> `App_Data/schema.sql` đã được đối chiếu với DB thật bằng `sys.tables` / `sys.columns` /
> `sys.objects` / `sys.indexes` và **khớp 100%**: 72/72 bảng, toàn bộ cột, toàn bộ constraint
> đặt tên tay, 90/90 index. Các nhãn "PHÂN KỲ khỏi `schema.sql`" của những đợt trước đã được
> gỡ. Khi thêm đối tượng mới, hãy cập nhật `schema.sql` trong cùng đợt để trạng thái này
> không bị mất.

## 1. BẢNG THAM CHIẾU

### 1.1. `don_vi` — Quy ước mã đơn vị (cơ cấu 2026)
Không có cột "loại đơn vị": code phân loại **chỉ qua tiền tố `ma_don_vi`**. Từ đợt "Cơ cấu đơn vị 2026"
chỉ còn 2 tiền tố (không còn `TT_`, `V_`, `TO_`):

| Tiền tố | Nhóm | Hệ quả trong code |
|---|---|---|
| `K_` | Khoa | GV (ngạch giảng dạy) → loại đối tượng 1 (`fn_loai_doi_tuong_ca_nhan`); vào `v_giang_vien_khoa`; có điểm trừ tập thể, nhiệm vụ Khoa, NCKH Khoa; phiếu đơn vị mẫu loại 3 |
| `P_` | Phòng / Trung tâm / Viện / Tổ | Mọi người → loại 2 (viên chức); phiếu đơn vị mẫu loại 4 |

Ở **mọi** tiền tố, người có chức danh miễn KPI (`HDLD_GV`, `HDLD_HUU`) → loại 0, không đánh giá (xem §1.3).

Mã đơn vị duy nhất còn viết cứng trong SP: `N'P_DTBDCL'` (Phòng Đào tạo và Bảo đảm chất lượng, gộp từ
`P_DT` + `P_QLCL`) — TP của đơn vị này được chốt / xem toàn trường điểm TB phản hồi SV
(`sp_diem_tb_phan_hoi_sv_chot`, `_get_chi_tiet`). Đổi mã này phải sửa cả 2 SP.
Từ đợt "Hoạt động đào tạo" (§16) mã này còn viết cứng ở `fn_hoat_dong_dao_tao_thuoc_phong`,
`fn_hoat_dong_dao_tao_quyen` và `sp_hoat_dong_dao_tao_nguoi_nhap_ung_vien` (module học vụ §14 cũng
dùng qua `fn_hoc_vu_co_quyen_quan_ly`) — đổi mã phải sửa cả các chỗ này.
Từ đợt "Thành tích đoàn thể" (§17) có thêm cặp mã viết cứng `N'P_TCTD'` (đơn vị — Tổ Công tác Đảng - Đoàn thể) + `N'TT'` (chức vụ Tổ trưởng), chỉ
ở **một** chỗ: `fn_thanh_tich_doan_the_quyen`. Đổi mã tổ / mã chức vụ thì chỉ sửa hàm này.
Từ đợt "Phát triển đội ngũ" (§18) có thêm mã `N'P_TCHC'` (Phòng Tổ chức – Hành chính), viết cứng ở
`fn_phat_trien_doi_ngu_thuoc_phong`, `fn_phat_trien_doi_ngu_quyen` và `sp_phat_trien_doi_ngu_nguoi_nhap_ung_vien`
(cùng khuôn §16) — đổi mã phải sửa cả 3 chỗ.
Từ đợt "Sáng kiến" (§19) có thêm mã `N'P_KH'`, viết cứng ở `fn_sang_kien_thuoc_phong`, `fn_sang_kien_quyen` và
`sp_sang_kien_nguoi_nhap_ung_vien` (cùng khuôn §18) — đổi mã phải sửa cả 3 chỗ.
Từ đợt "Phân quyền đồng bộ / import" (§20) `N'P_KH'` còn viết cứng ở `fn_nckh_co_quyen_dong_bo`, và `N'P_DTBDCL'`
còn viết cứng ở `fn_phan_hoi_sinh_vien_co_quyen_import` — đổi mã phải sửa thêm 2 hàm này.
Đơn vị mới thuộc nhóm Phòng/TT/Viện **không được** đặt mã `K_…`, kể cả khi danh sách tổ chức xếp nó cạnh các Khoa
(vd Viện Đào tạo quốc tế = `P_DTQT`).

### 1.3. `chuc_danh_nghe_nghiep` — Chức danh nghề nghiệp
Từ đợt "Chức danh chính thức": danh mục = **23 chức danh theo danh sách nhân sự thực tế + `HDLD_GV`**
(24 mã). Tên lưu **nguyên văn** danh sách (kể cả khoảng trắng sau "HĐLĐ/").

| Mã | Tên | Ngạch giảng dạy | Miễn KPI |
|---|---|---|---|
| `GV` / `GVC` / `GVCC` | Giảng viên / Giảng viên chính / Giảng viên cao cấp | ✅ | — |
| `HDLD_GV` | HĐLĐ/Giảng viên | — | ✅ (đợt "Miễn KPI HDLD") |
| `HDLD_HUU` | HĐLĐ/ Hưu trí | — | ✅ (đợt "Miễn KPI HDLD") |
| `CV`, `CVC`, `NCV`, `KS`, `TVV`, `YS` | Chuyên viên, Chuyên viên chính, Nghiên cứu viên, Kỹ sư, Thư viện viên, Y sĩ | — | — |
| `KTV`, `KTV_C`, `KTV_TC` | Kế toán viên, Kế toán viên chính, Kế toán viên trung cấp | — | — |
| `NV_PV68`, `NV_BV68`, `NV_KT68` | Nhân viên phục vụ/68, bảo vệ/68, kỹ thuật/68 | — | — |
| `HDLD_BV`, `HDLD_DC` | HĐLĐ/ Nhân viên bảo vệ, HĐLĐ dùng chung | — | — |
| `HDLD_CTVP`, `HDLD_CNTT`, `HDLD_CTDT`, `HDLD_KNST`, `HDLD_CTD` | HĐLĐ/ Hỗ trợ CTVP, CNTT, CTĐT, công tác khởi nghiệp và đổi mới sáng tạo, CT Đảng | — | — |

**Ngạch giảng dạy = `GV, GVC, GVCC`**, khai báo **một chỗ duy nhất**: inline TVF `fn_chuc_danh_giang_day()`.
`fn_loai_doi_tuong_ca_nhan`, `v_giang_vien_khoa`, `v_vien_chuc_don_vi` đều đọc hàm này (trước đợt "Miễn KPI HDLD"
danh sách viết cứng ở cả ba chỗ). Thêm ngạch giảng dạy mới = thêm mã vào hàm + tạo định mức giờ giảng cho nó.
Thông điệp lỗi `NOT_GIANG_VIEN_KHOA` của `sp_vi_pham_kiem_tra_quyen_ghi` còn liệt kê cứng danh sách — sửa kèm.

**Chức danh miễn KPI = `HDLD_GV, HDLD_HUU`**, khai báo một chỗ: inline TVF `fn_chuc_danh_mien_kpi()`.
Đợt "Miễn KPI HDLD" (2026-10-01): giảng viên chỉ xét 3 ngạch; hai mã HĐLĐ trên **không thuộc diện đánh giá KPI
ở bất kỳ đơn vị nào**:
- `fn_loai_doi_tuong_ca_nhan` trả **0**. `sp_phieu_danh_gia_create` / `sp_phieu_quy_create` chặn tạo phiếu (kể cả
  khi BLL truyền override `@loai_doi_tuong`). `GET api/auth/me` trả `DonVi[].LoaiDoiTuong = 0`, FE ẩn menu đánh
  giá cá nhân.
- Không nằm trong `v_giang_vien_khoa` lẫn `v_vien_chuc_don_vi` ⇒ không vào `N` điểm trừ tập thể, chỉ số KPI Khoa
  (phản hồi SV, NCKH, WoS/Scopus), giao nhiệm vụ Khoa, không ghi được vi phạm.
- Không được đếm ở báo cáo tiến độ lập phiếu (`sp_bao_cao_tong_quan`, `sp_bao_cao_chua_lap_phieu`,
  `fn_bao_cao_phieu_nam_don_vi`, `fn_bao_cao_phieu_quy_don_vi`).
- Phiếu của họ trong năm đang mở bị **xoá hẳn** (dữ liệu test) bởi `update_database.sql` của đợt; năm đã đóng giữ
  nguyên. Dòng `dinh_muc_giang_vien` của `HDLD_HUU` / `HDLD_GV` giữ nguyên nhưng không còn được dùng.
- Sửa kèm: `v_vien_chuc_don_vi` viết lại vế loại trừ bằng `EXISTS` — bản cũ `NOT (Khoa AND ma_chuc_danh IN (...))`
  ra UNKNOWN khi chức danh NULL nên nhân viên văn phòng Khoa không chức danh bị loại nhầm khỏi view.

> Lịch sử: đợt "Thêm HDLD_HUU vào ngạch giảng dạy" từng đưa `HDLD_HUU` ở Khoa từ loại 2 sang loại 1. Đợt
> "Miễn KPI HDLD" thay thế hoàn toàn quyết định đó.

Các mã cũ `TROGIANG, TAPSU, GS, PGS, NV, KHAC` đã **xoá hẳn** (người mang PGS/GS chuyển tạm sang `GVCC`,
NV → `HDLD_CNTT` — dữ liệu dev). GS/PGS là **học hàm**, không phải chức danh nghề nghiệp.

### 2.2. `dinh_muc_giang_vien` — chỉ còn giờ giảng
Từ đợt "Chức danh chính thức": cột `gio_nckh`, `gio_pvcd` đã **DROP**. Định mức = `gio_giang_ly_thuyet`
(270 cho 3 ngạch giảng dạy `GV, GVC, GVCC`; dòng định mức của `HDLD_GV` / `HDLD_HUU` còn trong bảng nhưng không
dùng nữa vì hai mã này miễn KPI — xem §1.3). Hệ quả:
- Điều kiện "đủ định mức giờ NCKH" khi duyệt hồ sơ do **Trưởng khoa tick tay**; hệ thống không còn gợi ý.
- Điểm tự động NCKH (`NCKH_GIO_TY_LE`) **không đổi** — dùng `nckh_gio_nckh.gio_nckh_dinh_muc` của web NCKH.
- Còn lại nhưng **không còn tác dụng**: `ngoai_le_dinh_muc.he_so_nckh /
  he_so_giam_nckh / so_gio_them_nckh / he_so_giam_pvcd / mien_nckh`; `phieu_danh_gia.gio_nckh_dinh_muc_ap_dung /
  gio_pvcd_dinh_muc_ap_dung / he_so_nckh_ap_dung` (phiếu mới lưu NULL).
- `chuc_vu.ty_le_dinh_muc_nckh` (+ CHECK `chk_chuc_vu_tldm_nckh`) **đã DROP** (2026-09-26), cùng field
  JSON `ty_le_dinh_muc_nckh` của `api/chucvu`. Tỷ lệ định mức theo chức vụ chỉ còn `ty_le_dinh_muc_giang`.
- `schema.sql` đã bỏ `chuc_vu.ty_le_dinh_muc_nckh`, nhưng **chưa** phản ánh việc DROP `dinh_muc_giang_vien.gio_nckh /
  gio_pvcd` — nguồn sự thật là DB sau `update_database.sql`.
- **Giảm trừ theo chức vụ** (2026-09-26): `chuc_vu` thêm `loai_giam_tru` + `gio_giam_tru_nam DECIMAL(6,2) NULL`
  (JSON `LoaiGiamTru` / `GioGiamTruNam` của `api/chucvu`). 2026-09-27: `loai_giam_tru` đổi `VARCHAR(30)` →
  `BIT NOT NULL DEFAULT 0`, bỏ CHECK `chk_chuc_vu_loai_gt`. **JSON vẫn là chuỗi** — map 2 chiều ở
  `Helper/LoaiGiamTruChucVu.cs` (gọi từ `ChucVuDal`).
  - `0` (JSON `dinh_muc_phan_tram`): giảm theo `ty_le_dinh_muc_giang`, `gio_giam_tru_nam` NULL.
  - `1` (JSON `gio_chuan_co_dinh`): giảm `gio_giam_tru_nam` giờ chuẩn/năm, `ty_le_dinh_muc_giang` NULL (công đoàn:
    CTCD / PCTCD 44h, CTCDBP / UVBCHCD 22h). CHECK `chk_chuc_vu_gt_nhat_quan` giữ cặp này nhất quán.
  - `sp_chuc_vu_update` nhận `@loai_giam_tru` NULL → **giữ nguyên cả loại lẫn số giờ** (FE cũ sửa tên / ghi chú không
    xoá mất 44h).
  - "Quân nhân dự bị, tự vệ" **không** là chức vụ: dùng `giam_tru_nhan_vien.so_ngay_huan_luyen_qndb` (1 ngày = 2.5 giờ
    chuẩn, **cộng vào giờ thực hiện** — không trừ định mức; xem §13.10).
  - Phép trừ số giờ cố định vào định mức: **đã làm** ở `fn_gio_giang_ty_le_hoan_thanh` (§13.10), tỷ lệ theo thời
    gian giữ chức vụ. `sp_nhan_vien_resolve_chuc_vu_ap_dung` / `DinhMucGiangVienService.TinhDinhMucApDung` (định mức
    áp dụng trên phiếu) **vẫn** chỉ xét tỷ lệ (NULL = 1.0) — hai đường tính khác nhau, không dùng lẫn.
  - `schema.sql` đã có 2 cột này + 3 CHECK (`chk_chuc_vu_loai_gt`, `chk_chuc_vu_gio_gt`, `chk_chuc_vu_gt_nhat_quan`).

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

### 2.4. `tieu_chi_danh_gia.diem_toi_da` — dấu ÂM có nghĩa

`diem_toi_da` **khác 0**, và **dấu của nó là một quy ước nghiệp vụ**:

| Dấu | Nghĩa | Ví dụ |
|:--|:--|:--|
| Dương | Điểm tối đa thông thường | Mục I.1 bảng VC/NLĐ = `70` |
| **Âm** | Tiêu chí **CHỈ TRỪ ĐIỂM** — không có điểm tối đa, con số là **mức trừ tối đa** | Mục III "Chấp hành quy định" = `-100` |

`diem_toi_da` âm **chỉ hợp lệ khi `loai_doi_tuong = 2`** (Viên chức/NLĐ). Giảng viên
(1), Khoa (3), Phòng/TT (4) vẫn bắt buộc dương — gate nằm trong
`sp_tieu_chi_danh_gia_create` / `_update`, không phải ở `CHECK`.

**Khoảng điểm hợp lệ của một dòng chấm** suy ra từ cặp (`loai_doi_tuong`, `diem_toi_da`):

| Tiêu chí | Sàn | Trần |
|:--|:--|:--|
| `loai_doi_tuong <> 2` | `0` | `diem_toi_da` |
| `loai_doi_tuong = 2`, trần > 0 | `-diem_toi_da` | `diem_toi_da` |
| `loai_doi_tuong = 2`, trần < 0 | `diem_toi_da` | `0` |

Công thức này **lặp lại y hệt ở 6 nơi**, lệch một nơi là sinh lỗi 400 giả hoặc lọt
điểm rác: `sp_chi_tiet_danh_gia_update_tu_danh_gia`,
`sp_chi_tiet_danh_gia_update_diem_khoa` (error_code `DIEM_VUOT_TOI_DA` /
`DIEM_DUOI_SAN`), sàn trong `sp_thang_diem_create` / `_update`,
`fn_phieu_chi_tiet_vuot_troi_quy`, và nhánh `VPVC_*` của `fn_nckh_diem_tu_dong`.

Nơi thứ sáu chỉ dùng **nửa bảng** (vì `loai_doi_tuong` của cả ba tiêu chí `VPVC_*`
đều `= 2`) nhưng dùng đúng chỗ hiểm nhất: rẽ theo **dấu của `diem_toi_da`** để phân biệt
tiêu chí *có điểm rồi trừ dần* (70 / 30) với tiêu chí *chỉ trừ điểm* (`-100`). Xem mục 3.2.

Bốn nơi đầu kẹp **một dòng chấm**; nơi thứ năm kẹp **tổng của một tiêu chí qua các
quý** (mục 4.1). Bản thứ năm là bắt buộc chứ không phải trùng lặp thừa: tiêu chí chỉ
trừ điểm `-100` mà cộng dồn 4 quý sẽ ra `-400` nếu không có sàn.

⚠️ **`CHECK (diem_* >= 0)` trên `chi_tiet_danh_gia` và `thang_diem` ĐÃ BỊ GỠ.**
Lý do: `CHECK` là ràng buộc cấp bảng, không đọc được `loai_doi_tuong` nằm ở bảng
`tieu_chi_danh_gia`, nên không viết được điều kiện "chỉ loại 2 mới được âm".
Hệ quả: **stored procedure là rào chắn CUỐI CÙNG** cho luồng cá nhân — ghi thẳng
vào bảng sẽ lọt điểm âm cho cả dòng của Giảng viên.

Tổng phiếu thì ngược lại: `phieu_danh_gia` **giữ nguyên** `CHECK (tong_diem_* >= 0)`,
SP **kẹp sàn 0** khi tổng ra âm (nghiệp vụ không phân biệt `0` với `-25` — đều dưới
80 = Không hoàn thành). Kẹp ở đúng 2 nơi phải khớp từng chữ:
`sp_phieu_danh_gia_tinh_tong_diem` ⟷ `sp_phieu_khoa_duyet_ho_so`.

Luồng **đơn vị** không đụng tới: `chi_tiet_danh_gia_don_vi` giữ đủ 5
`chk_ctdv_diem_*`, `sp_phieu_dv_tinh_tong_diem` / `sp_phieu_dv_chot` không đổi.

### 2.4 + 2.5. `thu_tu_hien_thi` của `tieu_chi_danh_gia` / `thang_diem`
`thu_tu_hien_thi` là **vị trí trong danh sách**, không phải một con số tự do:
luôn là dãy **liên tục 1..N, không trùng, không nhảy số** trong từng phạm vi.

| Bảng | Phạm vi đánh số |
|------|-----------------|
| `tieu_chi_danh_gia` | một nhóm — `id_nhom` |
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

**Áp dụng cho CẢ phiếu đơn vị (Khoa/Phòng, §4.9–4.14)** — slot `diem_duyet_dv` ở trạng thái 2:
tiêu chí có dòng → trưởng đơn vị được giao chấm; không có dòng → trưởng đơn vị CỦA PHIẾU.
Nguồn "được giao" của luồng đơn vị: `dbo.fn_tieu_chi_dv_duoc_giao_cham`. Tiêu chí của mẫu cá nhân
và mẫu đơn vị là các dòng `tieu_chi_danh_gia` khác nhau nên dùng chung bảng không đụng nhau.

Liên quan: cột "ai chấm" KHÔNG khai báo trong `tieu_chi_danh_gia` — cột
`cap_danh_gia` cũ đã bị bỏ (xem update_database.sql).

### 2.9. `gia_han_danh_gia` — Gia hạn tự đánh giá cá nhân
Mỗi `(id_nam, id_nhan_vien)` có tối đa **1 dòng gia hạn hiệu lực** (`da_xoa = 0`,
ép bằng filtered unique index `ux_ghdg_nam_nv`); cấp lại = UPDATE ghi đè `han_moi`,
thu hồi = soft delete (dòng `da_xoa = 1` giữ làm lịch sử).

- **Hạn hiệu lực** của 1 người = `MAX(hạn của giai đoạn phiếu đang ở, han_moi)`;
  NULL = không giới hạn. So sánh `CAST(GETDATE() AS DATE) > hạn` — hết trọn ngày hạn mới khóa.
- **Hạn của giai đoạn** — điểm dễ hiểu sai nhất, đọc kỹ:

  | Phiếu ở | Hạn áp dụng | Vì sao |
  |---|---|---|
  | `trang_thai = 1` (kê khai lần đầu) | `ngay_dong_tu_danh_gia` | Đúng giai đoạn 1 |
  | `trang_thai = 2` (dòng bị thẩm định trả về) | `ngay_dong_danh_gia_cap_tren` | Thẩm định chạy SAU khi hạn tự đánh giá đóng |

  Giai đoạn 2 theo thiết kế bắt đầu sau khi giai đoạn 1 đóng, nên nếu gate mọi thao
  tác bằng `ngay_dong_tu_danh_gia` thì **gần như mọi lần trả về đều rơi vào `QUA_HAN`**
  và phải cấp gia hạn thủ công cho từng người — vòng lặp trả về không chạy được.
  Nguyên tắc: *còn quyền trả về thì còn quyền trả lời*, hai bên đóng cùng lúc.
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

### 3.2.a. `nhom_vi_pham` — Nhóm nội dung, và cột `ma_nhom`
`loai_doi_tuong` tách danh mục làm hai rổ: 6 nhóm giảng viên (`= 1`, không trần theo nhóm)
và 3 nhóm viên chức/NLĐ (`= 2`, `tran_diem_tru` = 70 / 30 / NULL).

`ma_nhom` (NVARCHAR(50), NULL, **unique index LỌC** `uq_nhom_vi_pham_ma` — filtered vì 6
nhóm giảng viên đều phải NULL được) là mã nghiệp vụ ổn định, mirror
`loai_vi_pham.ma_loai_vi_pham`. Nó được seed **TRÙNG ĐÚNG mã `cong_thuc_tong_hop`** của tiêu
chí chấm tự động tương ứng (`VPVC_HOAN_THANH_CV` / `VPVC_NOI_QUY` / `VPVC_CHINH_TRI`), nên
`fn_nckh_diem_tu_dong` chỉ cần `nvp.ma_nhom = @cong_thuc` — không có bảng ánh xạ, và thêm
nhóm thứ 4 sau này chỉ phải seed thêm một mã.

Lý do KHÔNG khoá theo `id_nhom_vp`: đó là IDENTITY, khác nhau giữa các môi trường.
Lý do KHÔNG khoá theo `ten_nhom` / `thu_tu_hien_thi`: admin sửa được cả hai.

`nhom_vi_pham` **không có SP create/update** — chỉ `sp_nhom_vi_pham_get_all`. Nhóm được quản
lý trực tiếp trong DB, nên seed `ma_nhom` nằm ở `update_database.sql` và **có guard**: chỉ
UPDATE khi tìm thấy đúng 1 nhóm `loai_doi_tuong = 2` khớp `tran_diem_tru`, ngược lại `PRINT`
nhắc gán tay — không đoán, không tạo nhóm mới.

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
  Giảng viên = chức danh thuộc `fn_chuc_danh_giang_day()` (`GV, GVC, GVCC`)
  — xem view `v_giang_vien_khoa` trong procedure.sql. Người có chức danh miễn KPI (`HDLD_GV`, `HDLD_HUU`)
  không ghi được vi phạm loại 1 lẫn loại 2.
- KHÔNG bao gồm vi phạm pháp luật (xử lý qua `phieu_danh_gia.khong_vi_pham_phap_luat`).
- Điểm trừ cá nhân = `MIN(SUM(diem_tru) trong năm, 15)`.
- Điểm trừ tập thể của Khoa = `MIN(7.5 * T / (0.2 * 15 * N), 7.5)` — công thức nằm ở **inline TVF
  `fn_diem_tru_tap_the_khoa(@id_don_vi, @id_nam)`**, là nguồn sự thật duy nhất. Hai nơi tiêu thụ:
  `sp_vi_pham_diem_tru_khoa` (báo cáo `GET api/vi-pham/diem-tru-khoa`) và `sp_phieu_dv_tong_hop_kpi`
  (mã công thức `DIEM_TRU_TAP_THE` chấm điểm tiêu chí KPI Khoa — xem §4.9-4.14). Sửa công thức chỉ
  được sửa trong hàm; hai con số này lệch nhau là bảng đối chiếu trên FE vô nghĩa.
  Hàm **luôn trả đúng 1 dòng**; đơn vị không phải Khoa (mã `P_`) → tất cả cột = 0.
- Điểm tiêu chí "Tuân thủ đúng quy định về giảng dạy" (mã công thức `VPGD_TUAN_THU`,
  chấm tự động qua `fn_nckh_diem_tu_dong`) = `15 − SUM(diem_tru)` trong năm, sàn 0.

**Viên chức / NLĐ — 3 tiêu chí, mỗi nhóm một tiêu chí.** Cùng bảng nguồn
`vi_pham_giang_day` (tên bảng là di sản, nó lưu vi phạm của cả hai rổ), nhưng khác
`VPGD_TUAN_THU` ở chỗ **lọc theo nhóm** và **áp trần của nhóm**:

```
T = MIN( SUM(diem_tru) của nhóm TRONG PHẠM VI @quy , nhom_vi_pham.tran_diem_tru )

diem_toi_da ≥ 0  →  diem = MAX(0, diem_toi_da − T)     ← tiêu chí CÓ ĐIỂM rồi trừ dần
diem_toi_da < 0  →  diem = MAX(diem_toi_da, −T)        ← tiêu chí CHỈ TRỪ ĐIỂM
```

`@quy` là tham số thứ sáu của `fn_nckh_diem_tu_dong`: `0` = trọn năm (phiếu năm, và mọi mã
công thức khác), `1..4` = đúng quý đó (phiếu quý). Trần của nhóm áp **sau** phép SUM, nên
một nhánh code phục vụ đúng cả hai cấp — cấp năm cắt ở 70/30 trên **tổng cả năm**, chứ
không phải tổng của bốn lần đã cắt rồi.

| Mã công thức | Nhóm | `diem_toi_da` | `tran_diem_tru` | Khoảng điểm |
|---|---|---|---|---|
| `VPVC_HOAN_THANH_CV` | Hoàn thành công việc | **70** | 70 | `[0, 70]` |
| `VPVC_NOI_QUY` | Giờ giấc, tác phong, nội quy | **30** | 30 | `[0, 30]` |
| `VPVC_CHINH_TRI` | Chính trị, tư tưởng | **−100** | NULL = không cắt | `[−100, 0]` |

> ⚠️ **Hai dạng tiêu chí, không dùng chung một biểu thức được.** `VPVC_CHINH_TRI` khai
> `diem_toi_da = -100` — nó **chỉ trừ điểm**, không phải "có 100 điểm rồi trừ dần". Áp công
> thức dạng dương lên nó cho ra `-100 − 25 = -125 < 0` → sàn 0, tức là **mọi vi phạm chính
> trị đều bị nuốt** trong khi phiếu vẫn chốt bình thường. Đây chính là bảng KHOẢNG ĐIỂM HỢP
> LỆ ở mục 2.4 (cặp `loai_doi_tuong = 2`), nay là bản sao thứ sáu của nó.
>
> Với nhóm này, sàn `-100` đóng vai trò của trần nhóm (nên `tran_diem_tru` để NULL là đúng),
> và vì thế `diem_tru_sau_tran` của `sp_vi_pham_tong_hop_nhan_vien` **có thể lớn hơn** phần
> điểm thực sự bị trừ khi tổng vi phạm vượt 100 — cùng kiểu chênh với ghi chú về trần 70/30
> ở danh sách minh chứng.

- **BẤT BIẾN:** phép gộp trong `fn_nckh_diem_tu_dong` phải cho ra đúng `diem_tru_sau_tran`
  của `sp_vi_pham_tong_hop_nhan_vien` — ở **cả hai phạm vi** (`@quy = 0` đối chiếu phiếu năm,
  `@quy = q` đối chiếu phiếu quý q). Lệch nhau thì bảng tổng hợp trên FE không giải thích
  được điểm trong phiếu. Mệnh đề lọc được **nhân bản** ở nhánh minh chứng `loai_nguon = 8`
  của `fn_nckh_minh_chung_tu_dong` — sửa một bên phải sửa cả ba.
- **Cạm bẫy T-SQL:** SQL Server **không** cho bỏ qua tham số có DEFAULT khi gọi UDF. Thêm
  tham số vào `fn_nckh_diem_tu_dong` / `fn_nckh_minh_chung_tu_dong` bắt buộc rà **hết** call
  site; thiếu một chỗ là lỗi lúc **chạy**, không lộ ra lúc deploy.
- `INNER JOIN loai_vi_pham` loại luôn các dòng cũ `id_loai_vi_pham IS NULL` — đúng ý, chúng
  không thuộc nhóm nào.
- Nhóm chưa seed `ma_nhom` → không khớp dòng nào → **trọn điểm** (không phải NULL; NULL ở
  hàm đó nghĩa là "mã chưa hỗ trợ" và làm engine giữ nguyên điểm cũ).
- Tiêu chí phải đặt `loai_thang_diem = 2` (LIÊN TỤC), cùng lý do với `VPGD_TUAN_THU` — xem
  mục 4.2.
- Minh chứng `loai_nguon = 8` liệt kê tổng **THÔ**: khi tổng vượt trần 70/30 thì tổng các
  dòng sẽ lớn hơn phần điểm thực sự bị trừ.

Cột đáng chú ý:
- **`quy` (TINYINT NOT NULL, 1-4)**: quý chịu điểm trừ này — chiều thời gian mà bảng này
  trước đây không hề có (chỉ `id_nam` + `ngay_vi_pham` NULL-able). Nó quyết định **phiếu quý
  nào** bị trừ, nên sai quý = trừ nhầm kỳ. `sp_..._create` suy từ `ngay_vi_pham` khi không
  được truyền; `sp_..._update` để `NULL` nghĩa là **giữ nguyên** (suy lại sẽ khiến một lần
  sửa mô tả vô tình chuyển điểm trừ sang quý khác). **NOT NULL có chủ đích**: dòng `quy`
  NULL sẽ rơi khỏi mọi phiếu quý nhưng vẫn vào tổng năm — lệch giữa hai cấp mà không ai
  phát hiện. Index `ix_vi_pham_nv_nam_quy(id_nhan_vien, id_nam, quy)` phục vụ nhánh `VPVC_*`
  (hàm chạy 3 lần / phiếu, mỗi nhóm một lần).
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
Bộ bảng này lấy từ HAI endpoint KHÁC NHAU của web NCKH, cơ chế đồng bộ ngược nhau —
đừng suy diễn từ cái này sang cái kia:

| Nguồn | Bảng | Cơ chế |
|---|---|---|
| `/api/kpilecturerdata` | 3.6.1 – 3.6.7 (`nckh_ho_so`, bài báo, đề tài, sách, kê khai khác, tổng hợp, phân loại) | Trả toàn thời gian, KHÔNG gắn năm → KPI tự phân vùng, refresh **theo từng năm** `@id_nam` |
| `/api/kpisciencescoring` | 3.6.8 (`nckh_gio_nckh`) | Mỗi dòng TỰ MANG năm (`Year`) → ghi đè **toàn bảng**, không có tham số năm |
| `/api/kpiinternationalarticle?year=` | 3.6.9 (`nckh_kpi_bai_bao_quoc_te`) | API CÓ nhận `year`, payload KHÔNG có năm → `id_nam` = tham số gọi, refresh **theo từng năm** |

Phần 3.6 dưới đây (đến 3.6.7) nói về nguồn thứ nhất. API trả TOÀN BỘ
giảng viên trong 1 lần gọi, dữ liệu tích luỹ toàn thời gian và KHÔNG gắn năm.

Ánh xạ về nhân viên KPI: JOIN qua EMAIL — `LOWER(LTRIM(RTRIM(nhan_vien.email)))
= LOWER(LTRIM(RTRIM(nckh_ho_so.email)))`, bỏ email rỗng/NULL. (KHÔNG hard-FK: user NCKH
chưa khớp nhân viên vẫn lưu được.) Cột `nhan_vien.science_user_id` vẫn tồn tại nhưng
KHÔNG còn là khoá liên kết NCKH.

Đồng bộ qua `sp_nckh_dong_bo` (streaming TVP): upsert hồ sơ (không xoá — snapshot các năm
khác tham chiếu FK), ghi đè snapshot tổng hợp/phân loại theo `id_nam`, và refresh 4 bảng
chi tiết GIỚI HẠN TRONG NĂM `id_nam`.

PHÂN VÙNG THEO NĂM của 4 bảng chi tiết (đổi từ 2026-08-04; trước đây là delete-all + insert):

| Bảng | Vị từ thuộc năm |
|---|---|
| bài báo & sách | `ngay_xuat_ban ∈ [nam_danh_gia.ngay_bat_dau, ngay_ket_thuc]` |
| kê khai khác | `ngay_ap_dung ∈ khoảng năm` |
| đề tài | GIAO khoảng thời gian với năm (NULL 1 đầu mốc = mở phía đó) |

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

#### 3.6.8. `nckh_gio_nckh` — Giờ NCKH (nguồn `/api/kpisciencescoring`)
Mỗi dòng = 1 giảng viên × 1 năm, gồm 4 số liệu giờ do web NCKH tính sẵn. Vừa để ĐỐI CHIẾU
khi đánh giá, vừa là NGUỒN của tiêu chí chấm tự động `NCKH_GIO_TY_LE` (xem "Điểm đi vào
phiếu đánh giá" ở cuối mục này).

| Cột | Trường API | Ý nghĩa | Khái niệm KPI tương đương |
|---|---|---|---|
| `gio_chuan` | `StandardHours` | Giờ chuẩn tổng/năm (vd 720) | — |
| `ty_le_giam` | `ReductionPercentage` | Tỷ lệ định mức, đơn vị **%** (vd 85) | — (`chuc_vu.ty_le_dinh_muc_nckh` đã DROP, xem §2.2) |
| `gio_nckh_dinh_muc` | `RequiredHours` | Định mức giờ NCKH phải đạt (vd 108) | — (`dinh_muc_giang_vien.gio_nckh` đã DROP, xem §2.2) |
| `gio_nckh_quy_doi` | `ConvertedHours` | Giờ NCKH quy đổi thực tế (vd 100.02) | `gio_thuc_hien_gv.gio_nckh_thuc_te` |

⚠️ **API KHÔNG NHẬN THAM SỐ LỌC.** Đã kiểm chứng: `?nam=2025` và `?nam=2026` trả kết quả
GIỐNG HỆT NHAU (326 dòng, `Year` trải 2021–2026). Hệ quả — khác hẳn `sp_nckh_dong_bo`:

* Đồng bộ = kéo trọn vẹn rồi **GHI ĐÈ TOÀN BẢNG** trong 1 transaction
  (`sp_nckh_gio_nckh_dong_bo`). Endpoint `POST api/nckh/gio-nckh/dong-bo` **không có tham số**.
* `id_nam` = trường **`Year` CỦA CHÍNH DÒNG ĐÓ**, KHÔNG phải tham số gọi. Kèm
  `ky_bao_cao` = `Period` dạng text (vd "01/07/2024 - 30/06/2025") — mỗi GV một kỳ khác nhau,
  nên là cột theo dòng chứ không phải hằng số của cả lô.
* Xoá-toàn-bảng (thay vì xoá theo năm) là BẮT BUỘC: giữa 2 lần đồng bộ một GV có thể đổi năm
  ở hệ thống nguồn; xoá theo năm sẽ để lại dòng cũ mồ côi.
* Guard: API trả rỗng → KHÔNG xoá gì (tránh mất dữ liệu khi API lỗi) — giống `sp_nckh_dong_bo`.

**KHÔNG có FK nào tới `nam_danh_gia` hay `nckh_ho_so`** (cố ý, đừng "sửa" lại):
dữ liệu nguồn có các năm 2021–2024 chưa khai báo trong `nam_danh_gia` — đặt FK sẽ làm
đồng bộ thất bại toàn bộ. Vẫn lưu để khi năm đó được mở thì số liệu đã sẵn sàng.
Với `nckh_ho_so`: hai luồng đồng bộ độc lập, không đảm bảo thứ tự chạy.

Ánh xạ nhân viên KPI làm **lúc ĐỌC** bằng LEFT JOIN theo email (giống 3.6), KHÔNG lưu cột
`id_nhan_vien` → email nhân viên đổi thì lần đọc kế tiếp tự khớp lại, không cần đồng bộ lại.
User NCKH chưa khớp vẫn được liệt kê với `IdNhanVien = null`.

Hai cột DẪN XUẤT do `sp_nckh_gio_nckh_list` tính, KHÔNG lưu trong bảng:
`dat_dinh_muc` = `gio_nckh_quy_doi >= gio_nckh_dinh_muc` (thiếu 1 trong 2 số → 0) và
`ty_le_hoan_thanh` = quy đổi/định mức × 100, **NULL khi định mức ≤ 0** (tránh chia 0 —
dữ liệu thực tế CÓ dòng định mức = 0).

⚠️ **PHẠM VI — đã chốt với người dùng:** đồng bộ KHÔNG ghi gì vào `gio_thuc_hien_gv`.
Cột `gio_nckh_quy_doi` ở đây và `gio_thuc_hien_gv.gio_nckh_thuc_te` (`nguon = 2: Đồng bộ
qua API`) là HAI nguồn số liệu SONG SONG, đối chiếu thủ công. Lý do: `gio_thuc_hien_gv`
đang được `sp_dinh_muc_lay_context_ap_dung` và phiếu đánh giá dùng, ghi tự động sẽ đè
số liệu nhập tay. Muốn đẩy sang thì làm endpoint "áp dụng" riêng có xem trước.

##### Điểm đi vào phiếu đánh giá — `NCKH_GIO_TY_LE`

Dùng lại **khung chấm điểm tự động** đã có, không viết đường mới (xem mục 4.2):

- Tiêu chí `Hoàn thành định mức giờ NCKH` (nhóm II, `diem_toi_da` 40) đặt
  `loai_nguon_diem = 2`, `cong_thuc_tong_hop = N'NCKH_GIO_TY_LE'`.
- `fn_nckh_diem_tu_dong` thêm một nhánh khoá theo `@id_nhan_vien` + `@id_nam`, quy
  `ty_le_hoan_thanh` về 4 bậc — bậc tính theo **tỷ lệ của `@diem_toi_da`** chứ không
  hardcode 40/30/20, vì hợp đồng của hàm là không bao giờ trả quá `@diem_toi_da`:

  | Tỷ lệ hoàn thành | Điểm trả về | Với `diem_toi_da` = 40 |
  |---|---|---|
  | `>= 100%` | `@diem_toi_da` | 40 |
  | `> 75%` và `< 100%` | `@diem_toi_da * 0.75` | 30 |
  | `> 50%` và `<= 75%` | `@diem_toi_da * 0.50` | 20 |
  | `<= 50%` | `0` | 0 |

  Vượt định mức vẫn chặn trần ở `@diem_toi_da`. **Đúng 50% rơi vào bậc 0đ** (bậc trên là
  "> 50%"). Nhờ dùng chung 1 hàm nên **cả ba luồng có ngay**: chấm khi GV nộp phiếu
  (`sp_phieu_cham_tu_dong_apply`), endpoint `POST api/phieu/{id}/tong-hop-tu-dong`, và
  preview `GET api/maudanhgia/{id}/diem-tu-dong`.
- Ánh xạ GV bằng **EMAIL** (`nhan_vien.email` = `nckh_gio_nckh.email`, LOWER + TRIM), giống
  `sp_nckh_gio_nckh_list`. **CỐ Ý không dùng `@ma_nckh`**: bảng này không có FK sang
  `nckh_ho_so` và hai endpoint nguồn không đảm bảo phủ nhau — GV có giờ NCKH nhưng chưa có
  hồ sơ NCKH vẫn phải được chấm đúng. `SELECT TOP 1 ... ORDER BY ma_nguoi_dung_nckh` để tất
  định nếu nguồn có 2 mã NCKH trùng email trong cùng một năm.
- **Dòng nguồn trả về cho FE** (`dbo.fn_nckh_gio_chi_tiet`): điểm của mã này là kết quả một
  phép chia chứ không phải đạt/không đạt, nên `GET api/maudanhgia/{id}/diem-tu-dong` trả kèm
  nguyên dòng `nckh_gio_nckh` đã sinh ra điểm (`DuLieuGioNckh`, cùng shape với
  `GET api/nckh/gio-nckh`) và `LyDoDiemTuDong` khi điểm 0 là do dữ liệu nguồn. Cài đặt: inline
  TVF `fn_nckh_gio_chi_tiet(@id_nhan_vien, @id_nam)` được `OUTER APPLY` vào **RS2** của
  `sp_mau_danh_gia_diem_tu_dong` với các cột tiền tố `gio_*` (bắt buộc: `ho_ten` / `email` /
  `id_nam` / `ma_nguoi_dung_nckh` trùng tên cột sẵn có của RS2). **Cố ý KHÔNG thêm result set
  mới**: RS4 minh chứng chỉ phát khi `@id_nhan_vien IS NOT NULL` nên chuỗi `NextResult()` ở DAL
  rất dễ lệch.
  ⚠️ **BẤT BIẾN:** mệnh đề tìm dòng của `fn_nckh_gio_chi_tiet` (`TOP 1` + JOIN email +
  `ORDER BY ma_nguoi_dung_nckh`) phải GIỐNG HỆT nhánh `NCKH_GIO_TY_LE` trong
  `fn_nckh_diem_tu_dong` — lệch nhau thì FE hiển thị một dòng KHÁC dòng đã tạo ra điểm. Hàm chi
  tiết **không tham gia tính điểm**, chỉ để hiển thị. Hai luồng chấm thật
  (`sp_phieu_cham_tu_dong_apply`, `POST api/phieu/{id}/tong-hop-tu-dong`) không trả dòng nguồn.
- Thiếu dữ liệu → **0 điểm** (không phải NULL — NULL ở hàm này nghĩa là "mã chưa hỗ trợ",
  engine sẽ giữ nguyên điểm cũ): không có dòng cho (GV, năm), `gio_nckh_dinh_muc` NULL
  hoặc ≤ 0, hoặc `gio_nckh_quy_doi` NULL. Lưu ý định mức ≤ 0 là **dữ liệu thật** (GV được
  miễn NCKH) chứ không phải lỗi — cùng ca mà `ty_le_hoan_thanh` trả NULL ở mục trên.
- `loai_thang_diem = 1` (Rời rạc) + 4 dòng `thang_diem` giá trị 40 / 30 / 20 / 0 ⇒ engine
  ánh xạ được `id_thang_diem_chon` để FE hiện nhãn `dieu_kien_diem`. Khác `VPGD_TUAN_THU`
  và `NVK_PHAN_CONG_KHOA` (liên tục, không có `thang_diem`) vì điểm ở đây là 4 mức rời rạc.
  Nếu admin đổi `diem_toi_da` khác 40 thì điểm không còn khớp mức nào → `id_thang_diem_chon`
  NULL, điểm vẫn đúng.

**Không có nhánh minh chứng**: `fn_nckh_minh_chung_tu_dong` KHÔNG được mở rộng cho mã này
(đã chốt). Số liệu nguồn tra qua `GET api/nckh/gio-nckh?id_nam=&id_nhan_vien=`.

#### 3.6.9. `nckh_kpi_bai_bao_quoc_te` — KPI bài báo quốc tế (nguồn `/api/kpiinternationalarticle`)
Bảng PHỤ, chỉ để LƯU TRỮ / ĐỐI CHIẾU. Mỗi dòng = 1 giảng viên × 1 năm. Điểm ĐÃ ĐƯỢC PHÍA
NCKH TÍNH SẴN — phía KPI không tính lại:

| Cột | Trường API | Ý nghĩa |
|---|---|---|
| `tong_bai_wos_scopus` | `TotalWosScopusArticles` | Số bài thuộc danh mục WoS/Scopus |
| `co_q1_q2` | `HasQ1Q2` | Có ít nhất 1 bài xếp hạng Q1 hoặc Q2 |
| `tong_diem_tac_gia` | `TotalAuthorScore` | Tổng điểm tác giả (cộng dồn `YourScore` các bài) |
| `diem_kpi_cuoi` | `FinalKpiScore` | Điểm KPI cuối sau quy đổi phía NCKH |
| `articles_json` | `Articles[]` | Nguyên mảng chi tiết bài báo, lưu JSON |
| `so_bai_bao` | — | **DẪN XUẤT**: `Articles.Count`, lưu sẵn để khỏi parse JSON khi truy vấn |

⚠️ **API CÓ NHẬN THAM SỐ LỌC `year`** — ngược hẳn 3.6.8, đừng suy diễn từ đó sang. Nhưng
payload lại KHÔNG có trường năm ở cấp giảng viên. Hệ quả:

* `id_nam` = **THAM SỐ `year` của lần gọi**, không phải field trong payload (khác `nckh_gio_nckh`
  lấy `Year` của chính dòng đó).
* Đồng bộ ghi đè **THEO TỪNG NĂM**: `DELETE WHERE id_nam = @id_nam` rồi INSERT lại, trong
  1 transaction (`sp_nckh_kpi_bai_bao_quoc_te_dong_bo`). Dữ liệu các năm khác GIỮ NGUYÊN.
  Endpoint `POST api/nckh/bai-bao-quoc-te/dong-bo?id_nam=2026` **bắt buộc có tham số**.
* Vẫn phải DELETE trước INSERT (không MERGE): giữa 2 lần đồng bộ một GV có thể biến mất khỏi
  kết quả của năm đó, MERGE sẽ để lại dòng cũ mồ côi.
* TVP `KpiBaiBaoQuocTeRow` **KHÔNG chứa `id_nam`** (khác `GioNckhRow`) — cả lô thuộc đúng
  một năm nên truyền scalar `@id_nam`, tránh lặp trên mỗi dòng.
* Guard: API trả rỗng → KHÔNG xoá gì. Đánh đổi đã biết: một năm *thật sự* chưa có GV nào thì
  không xoá được dữ liệu cũ của năm đó bằng đồng bộ; cần thì làm tham số xoá riêng.

`articles_json` dùng đúng quy ước `members_json` ở 3.6 (NVARCHAR(MAX), rỗng → NULL chứ không
lưu `"[]"`). Nội dung do `JsonConvert.SerializeObject` sinh lại từ DTO có kiểu
(`NckhInternationalArticleItemDto`) ⇒ field mới phía NCKH sẽ bị rơi cho tới khi bổ sung vào DTO.

**KHÔNG có FK tới `nam_danh_gia` hay `nckh_ho_so`** — cùng lý do như 3.6.8 (đừng "sửa" lại).
Ánh xạ nhân viên KPI làm **lúc ĐỌC** theo email, không lưu cột `id_nhan_vien`.

⚠️ **PHẠM VI:** CHƯA có API đọc (GET) độc lập cho bảng này. Đồng bộ KHÔNG tự ghi vào bảng
điểm/phiếu đánh giá nào — điểm chỉ đi vào phiếu qua tiêu chí `NCKH_BBQT_DIEM_KPI` bên dưới,
và cũng chỉ khi admin gắn tiêu chí đó vào mẫu.

##### Điểm đi vào phiếu đánh giá — `NCKH_BBQT_DIEM_KPI`

Dùng lại **khung chấm điểm tự động** đã có, không viết đường mới (xem mục 4.2) — song song
với `NCKH_GIO_TY_LE` ở 3.6.8:

- Tiêu chí đặt `loai_nguon_diem = 2`, `cong_thuc_tong_hop = N'NCKH_BBQT_DIEM_KPI'`. Tiêu chí
  thật tạo qua API tiêu chí sẵn có, **không seed trong SQL**.
- ⚠️ **KHÁC HẲN 14 mã còn lại: phía KPI KHÔNG tính điểm.** Nhánh trong `fn_nckh_diem_tu_dong`
  chỉ `SELECT` cột `diem_kpi_cuoi` và trả **nguyên văn**, sàn ở 0 và chặn trần ở
  `@diem_toi_da`. **TUYỆT ĐỐI không tính lại** từ `articles_json` / `tong_diem_tac_gia`: quy
  đổi là nghiệp vụ bên NCKH, tính lại chắc chắn lệch. Không có bậc thang như `NCKH_GIO_TY_LE`.
- Chặn trần là **hợp đồng của hàm** (không bao giờ trả quá `@diem_toi_da`), nhưng thang điểm
  hai hệ thống có thể khác nhau ⇒ đặt `diem_toi_da` ĐỦ LỚN (≥ `diem_kpi_cuoi` lớn nhất trong
  năm), nếu không điểm sẽ bị cắt âm thầm. Đã chốt với người dùng: để trần lớn, không thêm cờ
  cảnh báo chặn trần trong response.
- Ánh xạ GV bằng **EMAIL** (`nhan_vien.email` = `nckh_kpi_bai_bao_quoc_te.email`, LOWER + TRIM).
  **CỐ Ý không dùng `@ma_nckh`** — cùng lý do như `NCKH_GIO_TY_LE`: bảng không có FK sang
  `nckh_ho_so`, và `/api/kpiinternationalarticle` với `/api/nckh/dong-bo` là 2 endpoint khác
  nhau, GV có điểm bài báo quốc tế nhưng chưa có hồ sơ NCKH vẫn phải được chấm đúng.
  `SELECT TOP 1 ... ORDER BY ma_nguoi_dung_nckh` để tất định nếu nguồn có 2 mã NCKH trùng email
  trong cùng một năm.
- **Dòng nguồn trả về cho FE** (`dbo.fn_nckh_bbqt_chi_tiet`): vì điểm do hệ thống KHÁC tính,
  FE bắt buộc phải xem được dòng đã sinh ra nó. `GET api/maudanhgia/{id}/diem-tu-dong` trả kèm
  `DuLieuBaiBaoQuocTe` (nguyên dòng + mảng `BaiBao`) và `LyDoDiemTuDong` khi điểm 0 là do dữ
  liệu nguồn. Cài đặt: inline TVF `fn_nckh_bbqt_chi_tiet(@id_nhan_vien, @id_nam)` được
  `OUTER APPLY` vào **RS2** của `sp_mau_danh_gia_diem_tu_dong` với các cột tiền tố `bbqt_*`
  (bắt buộc: `ho_ten` / `email` / `id_nam` / `ma_nguoi_dung_nckh` trùng tên cột sẵn có của RS2).
  **Cố ý KHÔNG thêm result set mới** — cùng lý do như `gio_*`.
  `bbqt_articles_json` **chỉ phát khi `@id_nhan_vien IS NOT NULL`** (cùng quy ước với RS4 minh
  chứng): mảng bài báo rất lớn, gọi toàn trường vẫn có `bbqt_so_bai_bao` để biết số lượng.
  ⚠️ **BẤT BIẾN:** mệnh đề tìm dòng của `fn_nckh_bbqt_chi_tiet` (`TOP 1` + JOIN email +
  `ORDER BY ma_nguoi_dung_nckh`) phải GIỐNG HỆT nhánh `NCKH_BBQT_DIEM_KPI` trong
  `fn_nckh_diem_tu_dong` — lệch nhau thì FE hiển thị một dòng KHÁC dòng đã tạo ra điểm. Hàm chi
  tiết **không tham gia tính điểm**, chỉ để hiển thị.
- **Tập giảng viên mở rộng**: `sp_mau_danh_gia_diem_tu_dong` có cờ `@co_tieu_chi_bbqt` — khi mẫu
  có tiêu chí này, danh sách GV mở thêm những người có dòng trong `nckh_kpi_bai_bao_quoc_te` của
  năm đó. Bắt buộc, vì đây là **nguồn đồng bộ RIÊNG**, không kéo theo snapshot `nckh_tong_hop`
  (GV chỉ có bài báo quốc tế sẽ bị rơi khỏi lưới nếu thiếu cờ này).
- Thiếu dữ liệu → **0 điểm** (không phải NULL — NULL nghĩa là "mã chưa hỗ trợ", engine giữ
  nguyên điểm cũ): không có dòng cho (GV, năm), hoặc `diem_kpi_cuoi` NULL. Phòng thủ thêm: điểm
  âm từ nguồn cũng về 0. Lưu ý `diem_kpi_cuoi = 0` là **kết quả thật** (có dòng nhưng chưa đạt
  điểm nào) nên BLL không sinh `LyDoDiemTuDong` cho ca này.

**Không có nhánh minh chứng**: `fn_nckh_minh_chung_tu_dong` KHÔNG được mở rộng cho mã này —
dòng nguồn đã nằm ở `DuLieuBaiBaoQuocTe` (chi tiết hơn hẳn 1 dòng minh chứng gộp).

TVP `GioNckhRow` — **KHÁC 6 TVP ở trên: type này CÓ `id_nam`**, vì mỗi dòng tự mang năm
nên không thể truyền scalar `@id_nam` chung cho cả lô.

---

## 4. DỮ LIỆU ĐÁNH GIÁ

### State machine — QUY TRÌNH 4 GIAI ĐOẠN

Có **HAI trục trạng thái song song**. Hiểu sai quan hệ giữa hai trục này là nguồn lỗi
lớn nhất của module, nên đọc kỹ phần "Quan hệ giữa hai trục" bên dưới.

#### Trục 1 — `chi_tiet_danh_gia.trang_thai_dong` (theo TỪNG DÒNG tiêu chí)

| Trạng thái | Tên | Ai sửa được |
|---|---|---|
| 1 | KE_KHAI | Chủ phiếu — sửa được cả **điểm lẫn minh chứng** |
| 2 | CHO_THAM_DINH | Đơn vị được giao trong `tieu_chi_don_vi_cham` |
| 3 | DA_CHOT | Không ai. `diem_chinh_thuc` đã ghi, khóa cứng |

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

| Trạng thái | Tên | Ý nghĩa | Giai đoạn |
|---|---|---|---|
| 1 | NHAP | GV kê khai, chưa nộp lần nào | GĐ1 |
| 2 | THAM_DINH | Còn ≥1 dòng ở trạng thái 1 hoặc 2 | GĐ1↔GĐ2 |
| 3 | CHO_TK_DUYET | 100% dòng đã chốt, chờ Trưởng khoa | GĐ3 |
| 4 | TK_DA_DUYET | TK đã chốt hồ sơ + chọn xếp loại, chờ đóng gói. Sau đóng gói **chỉ hồ sơ lãnh đạo** còn đọng ở đây, chờ HT | GĐ3→GĐ4 |
| 5 | HOAN_TAT | Kết quả đã chốt (read-only, trừ khi mở lại) | GĐ4 |

```
1 ──[GV nộp phiếu]────────────────────────────────► 2
2 ──[TỰ ĐỘNG: mọi dòng = DA_CHOT]─────────────────► 3
3 ──[TỰ ĐỘNG: có dòng rớt về 1 hoặc 2]────────────► 2
3 ──[TK chốt hồ sơ + chọn xếp loại 1/2/3]─────────► 4
4 ──[TK trả 1 dòng về thẩm định]──────────────────► 2
4 ──[TK đóng gói — hồ sơ THƯỜNG, can_ht_duyet=0]──► 5
4 ──[HT duyệt gói — hồ sơ LÃNH ĐẠO, =1]───────────► 5
4 ──[HT/ADMIN chốt xét chọn cấp Trường — viên chức Khoa mức 3]──► 5   (§8.7)
4 ──[HT trả riêng hồ sơ này về TK]────────────────► 3
2 ──[GV hủy nộp — chỉ khi chưa dòng nào DA_CHOT]──► 1
5 ──[HT mở lại]───────────────────────────────────► 1/2/3
```

#### LUỒNG DUYỆT TÁCH ĐÔI — ai mới cần Hiệu trưởng duyệt

- **KPI của nhân viên / giảng viên**: Trưởng khoa (TK/TKL) hoặc Trưởng phòng (TP) duyệt là
  xong. **Không** qua Hiệu trưởng.
- **KPI của lãnh đạo đơn vị** (`TK`, `TKL`, `PTK`, `PTKL`, `TP`, `PTP`): mới cần HT duyệt.

Cột `phieu_danh_gia.can_ht_duyet` (BIT) là **snapshot chốt một lần** tại bước TK chốt hồ sơ
(`sp_phieu_khoa_duyet_ho_so`, GĐ3), không suy động về sau — vì nhân sự có thể đổi sau khi
chốt, và `phieu.id_chuc_vu` resolve theo `ty_le_dinh_muc_giang` nên người vừa có dòng chức vụ
NULL vừa có dòng PTK tại cùng đơn vị có thể snapshot nhầm NULL. Quy tắc ghi:

```
can_ht_duyet = 1  ⟺  EXISTS dòng nhan_vien_chuc_vu của (phieu.id_nhan_vien, phieu.id_don_vi)
                      còn hiệu lực tại nam_danh_gia.ngay_ket_thuc, ma_chuc_vu ∈ tập lãnh đạo
                  HOẶC phieu.id_chuc_vu trỏ tới một mã trong tập đó
```

> ⚠ **Mốc HOÀN TẤT của hồ sơ thường là bước ĐÓNG GÓI, không phải bước TK chốt hồ sơ.**
> `xep_loai` cuối cùng (kể cả mức 4) chỉ tính được khi 100% hồ sơ của đơn vị đã chốt, vì hạn
> ngạch 20% xếp hạng trên toàn Khoa. Đây là ràng buộc dữ liệu, không phải lựa chọn thiết kế:
> không có cách nào cho một hồ sơ "xong" trước khi biết thứ hạng của nó trong Khoa.

Tập mã chức vụ lãnh đạo khai báo ở **một nơi duy nhất**: `dbo.fn_chuc_vu_can_ht_duyet()`
(inline TVF, không phải scalar UDF — SQL 2008 gọi scalar UDF theo từng dòng rất chậm). Bản
sao chỉ-đọc phía C# ở `Helper/ChucVuLanhDao.cs`, **chỉ để hiển thị**, không phải cổng phân
quyền. Sửa một chỗ thì sửa cả hai.

> ⚠ **`PTK` / `PTKL` / `PTP` CỐ Ý KHÔNG có quyền duyệt.** Chúng nằm trong
> `fn_chuc_vu_can_ht_duyet` nhưng **không** nằm trong nhóm `DUYET` của `fn_co_quyen_don_vi`,
> cũng không có trong `PhieuDanhGiaService.CapKhoaMaChucVu`. Hồ sơ của cấp phó cần HT duyệt,
> nhưng bản thân cấp phó không được chốt hồ sơ của người khác.

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

| SP | Vai trò | `error_code` riêng |
|---|---|---|
| `sp_phieu_dong_bo_trang_thai_dong` | Helper giữ bất biến 2↔3. **Mọi** thao tác cấp dòng phải gọi | — (không SELECT, không bắt lỗi) |
| `sp_chi_tiet_danh_gia_update_tu_danh_gia` | GV kê khai / sửa dòng bị trả về | `INVALID_STATE_DONG`, `DIEM_VUOT_TOI_DA`, `DIEM_DUOI_SAN` |
| `sp_phieu_submit` | Nộp lần đầu, dòng 1→2 | (giữ nguyên) |
| `sp_phieu_nop_lai` | Nộp lại sau trả về, dòng 1→2, `hanh_dong = 7` | `KHONG_CO_DONG_CHO_NOP` |
| `sp_phieu_huy_nop` | Rút phiếu 2→1, reset mọi dòng về 1 | `DA_CHAM` (nay xét `trang_thai_dong = 3`) |
| `sp_chi_tiet_danh_gia_update_diem_khoa` | Thẩm định **sửa điểm**, dòng 2→3 | `THIEU_DIEM`, `THIEU_LY_DO`, `INVALID_STATE_DONG`, `DIEM_VUOT_TOI_DA`, `DIEM_DUOI_SAN` |
| `sp_chi_tiet_tham_dinh_duyet` | Thẩm định **giữ nguyên điểm GV**, dòng 2→3 | `INVALID_STATE_DONG` |
| `sp_chi_tiet_tham_dinh_tra_ve` | Trả dòng về GV, dòng 2→1 | `THIEU_LY_DO`, `INVALID_STATE_DONG` |
| `sp_tham_dinh_get_pending` | Hàng đợi theo **dòng** (không theo phiếu) | — |

#### SP hiện thực GĐ3 + GĐ4 và hợp đồng lỗi

| SP | Vai trò | `error_code` riêng |
|---|---|---|
| `sp_chi_tiet_khoa_tra_tham_dinh` | TK trả 1 dòng về thẩm định, dòng 3→2 (`nguon_tra_ve = 3`) | `THIEU_LY_DO`, `TO_TRINH_DA_TRINH` |
| `sp_phieu_khoa_duyet_ho_so` | TK chốt hồ sơ, phiếu 3→4, chọn `xep_loai_khoa` | `CAM_CHON_XUAT_SAC`, `XEP_LOAI_KHONG_HOP_LE`, `DIEM_KHONG_DU`, `THIEU_LY_DO`, `CHUA_CHOT_HET` |
| `sp_phieu_khoa_uu_tien_xuat_sac` | TK/TKL/TP chỉ định ai được suất cuối khi đồng hạng | `TO_TRINH_DA_TRINH`, `FORBIDDEN`, `FORBIDDEN_DON_VI`, `XET_XUAT_SAC_CAP_TRUONG` (viên chức Khoa) |
| `sp_xet_xuat_sac_vc_khoa_get` / `_chot` | HT / ADMIN xem + chốt danh sách xuất sắc cấp Trường của viên chức Khoa (§8.7) | `FORBIDDEN`, `NOT_FOUND`, `NAM_DA_DONG`, `CHUA_DU_HO_SO`, `KHONG_CO_UNG_VIEN`, `HO_SO_KHONG_HOP_LE`, `CONCURRENCY_CONFLICT` |

> `VUOT_MUC_VIEN_CHUC` **đã bị gỡ bỏ khỏi cả hai SP** (đợt tách 3 nhóm): viên chức / NLĐ nay
> lên được mức 3/4 và có tham gia hạn ngạch. Ngưỡng điểm của họ do `DIEM_KHONG_DU` cưỡng chế
> — nhánh riêng cho `loai_doi_tuong = 2` (`>= 101`, khác nhánh giảng viên là `> 100`).
> `TY_LE_KHONG_HOP_LE` nay có nghĩa "tỷ lệ khác 0.2000" (trước là "ngoài khoảng (0, 1]").
| `sp_to_trinh_khoa_dong_goi` | **Nơi DUY NHẤT ghi `xep_loai = 4`**; đồng thời đẩy hồ sơ **thường** 4→5 và quyết định gói → 2 hay → 4 | `CHUA_DU_HO_SO`, `DONG_HANG`, `KHONG_CO_HO_SO`, `TY_LE_KHONG_HOP_LE` |
| `sp_to_trinh_khoa_trinh` | Gói 2→3, `lan_trinh += 1` | `TRAN_LAN_TRINH`, `KHONG_CO_HO_SO_LANH_DAO` |
| `sp_to_trinh_khoa_ht_duyet` | Gói 3→4, các phiếu **lãnh đạo** còn ở 4 → 5. **Không đổi sau luồng tách đôi**: SP đã lọc `trang_thai = 4`, mà tập đó nay chính xác là hồ sơ lãnh đạo | — |
| `sp_to_trinh_khoa_ht_tra_lai` | Gói 3→5, các phiếu được chọn 4→3 | `DANH_SACH_RONG`, `HO_SO_KHONG_HOP_LE`, `THIEU_LY_DO` |
| `sp_to_trinh_khoa_get_paged` / `_get_detail` | Đọc | — |

**Ai duyệt hồ sơ của ai:** người có `ma_chuc_vu` ∈ {`TK`,`TKL`,`TP`} **và** `phieu.id_don_vi`
nằm trong cây đơn vị của họ. Nghĩa là TK duyệt hồ sơ giảng viên Khoa mình, TP duyệt hồ sơ
viên chức Phòng mình — không ai với sang đơn vị khác. `ADMIN` đi đường tắt. `HT` **không**
duyệt lẻ từng hồ sơ nữa, chỉ thao tác ở cấp gói.

Sau khi luồng duyệt tách đôi, đọc bảng này cho **đủ hai bước**:

| Hồ sơ của | Bước GĐ3 (chốt hồ sơ + chọn xếp loại) | Bước GĐ4 (HOÀN TẤT) |
|---|---|---|
| Nhân viên / giảng viên | TK/TKL của Khoa, hoặc TP của Phòng | TK đóng gói tờ trình — **hết, không qua HT** |
| Viên chức **Khoa** được chốt mức 3 | TK/TKL của Khoa | **HT / ADMIN chốt danh sách xuất sắc cấp Trường** (§8.7) — không qua gói |
| PTK / PTKL / PTP | TK/TKL/TP của chính đơn vị đó | HT duyệt gói |
| TK / TKL / TP | **Chính họ tự chốt** (giữ nguyên gate hiện tại) | HT duyệt gói |

Việc TK/TP tự chốt hồ sơ của chính mình là **có chủ đích**: HT duyệt ở cấp gói mới là bước
kiểm soát thật. Cấp phó (PTK/PTKL/PTP) **không** được chốt hồ sơ — kể cả của chính mình.

**Tờ trình được tạo tự động** bởi `sp_phieu_khoa_duyet_ho_so` khi hồ sơ đầu tiên của
(năm, đơn vị) được chốt. Có hồ sơ mới vào gói đang ở trạng thái 2, 5, **hoặc 4-tự-động-hoàn-tất**
thì gói tự hạ về 1 — hạn ngạch cũ tính trên mẫu số cũ nên không còn đúng.

> ⚠ **Gói ở trạng thái 4 có HAI nguồn gốc khác hẳn nhau**, phân biệt qua
> `to_trinh_kpi_khoa.id_nguoi_duyet`:
> - `id_nguoi_duyet IS NOT NULL` — Hiệu trưởng duyệt thật. **Khoá cứng**: hồ sơ mới chốt muộn
>   sẽ bị `TO_TRINH_DA_TRINH`, không được âm thầm lật quyết định của HT.
> - `id_nguoi_duyet IS NULL` — **gói tự động hoàn tất**: đơn vị không có hồ sơ lãnh đạo nào
>   nên đóng gói xong là chốt luôn, chưa qua tay HT lần nào. Gói này vẫn mở lại được.
>
> `sp_phieu_khoa_duyet_ho_so` và `sp_chi_tiet_khoa_tra_tham_dinh` đều phải kiểm **cả hai** vế,
> không được chỉ so `trang_thai = 4`.

#### Bốn bất biến mà mọi SP phải giữ

Kiểm được bằng query ở mục 7 của `update_database.sql`:

1. `phieu.trang_thai = 3` ⟺ 100% dòng có `trang_thai_dong = 3`.
2. Dòng chấm tay có `trang_thai_dong <> 3` thì `diem_chinh_thuc` **phải NULL** — nếu không,
   `COALESCE(diem_chinh_thuc, …)` sẽ cộng vào tổng một con số không còn ai duyệt. Vì vậy
   `sp_chi_tiet_tham_dinh_tra_ve`, `sp_chi_tiet_khoa_tra_tham_dinh` và `sp_phieu_huy_nop`
   đều xóa `diem_chinh_thuc` khi kéo dòng ra khỏi trạng thái chốt.
3. `xep_loai = 4` ⟹ `id_to_trinh IS NOT NULL`; và phiếu ở trạng thái 4/5 phải có
   `xep_loai_khoa`. Mức 4 chỉ có **hai** đường ghi: `sp_to_trinh_khoa_dong_goi` (hạn ngạch theo
   đơn vị) và `sp_xet_xuat_sac_vc_khoa_chot` (viên chức Khoa, §8.7) — viên chức Khoa mức 4 thì
   `xep_loai_khoa = 3`.
4. **(Luồng tách đôi)** Phiếu ở trạng thái 4 ⟹ `can_ht_duyet = 1` **hoặc** là ứng viên xét
   xuất sắc cấp Trường (viên chức Khoa mức 3, §8.7). Hồ sơ thường không bao giờ
   đọng ở 4 sau khi đơn vị đã đóng gói — nó đi thẳng 4→5 ngay trong `sp_to_trinh_khoa_dong_goi`.
   Bất biến này chỉ đúng **sau khi đơn vị được đóng gói lại**; hồ sơ tồn từ quy trình cũ vi
   phạm nó một cách hợp lệ cho tới lúc đó (xem query (b) và (e) của `update_database.sql`).

### 4.0. `danh_muc_vai_tro_pvcd` — Lookup nhóm vai trò PVCĐ theo đơn vị
Mỗi khoa có thể có bộ vai trò + điểm quy đổi riêng (`id_don_vi` NULL = áp dụng toàn trường,
default). `id_nam` NULL = áp dụng mọi năm. App resolve theo thứ tự:
`(don_vi, nam) > (don_vi, NULL) > (NULL, nam) > (NULL, NULL)`.

### 4.1. `phieu_danh_gia` — Phiếu đánh giá (Header – 1 phiếu / người / ĐƠN VỊ / năm)
Snapshot toàn bộ định mức ÁP DỤNG (sau khi đã áp dụng các ngoại lệ) tại thời điểm chốt phiếu.
Đảm bảo có thể truy vết kết luận xếp loại về sau ngay cả khi quy định / cấu hình thay đổi.

**Khoá duy nhất — đổi ở Đợt 3 (kiêm nhiệm đa đơn vị), rồi đổi tiếp ở đợt "Đánh giá theo quý":**
`UNIQUE (id_nam, id_nhan_vien)` → `UNIQUE (id_nam, id_nhan_vien, id_don_vi)`
→ `UNIQUE (id_nam, id_nhan_vien, id_don_vi, quy)`.
Người kiêm nhiệm 2 đơn vị nộp **2 phiếu / năm**, mỗi phiếu rơi vào tờ trình + hạn ngạch 20%
của đúng đơn vị đó (mỗi đơn vị xếp loại riêng). Người không kiêm nhiệm vẫn đúng 1 phiếu.
Khoá **không** lọc `da_xoa` — phiếu soft-delete vẫn chiếm chỗ, y như trước Đợt 3.
`quy` đặt **cuối** khoá để mọi truy vấn seek theo `(id_nam, id_nhan_vien, id_don_vi)` vẫn dùng
được index này.

#### `quy` — phiếu NĂM và phiếu QUÝ dùng chung một bảng

`phieu_danh_gia.quy TINYINT NOT NULL DEFAULT 0`, `CHECK (quy BETWEEN 0 AND 4)`:

| `quy` | Nghĩa |
|---|---|
| **0** | Phiếu **NĂM**. Mọi phiếu có trước đợt này, và **toàn bộ** phiếu giảng viên. |
| **1..4** | Phiếu **QUÝ**, chỉ viên chức / NLĐ. Xem mục 14 trong `procedure.sql`. |

**Mọi SP cấp NĂM đều phải lọc `quy = 0`.** Ba chỗ mà thiếu bộ lọc sẽ hỏng nặng nhất:

1. `sp_to_trinh_khoa_dong_goi` — phiếu quý lọt vào bảng xếp hạng ⇒ `so_mau_so` phình ⇒
   **con số hạn ngạch 20% đổi**. Đây là quyết định nhân sự, không phải chuyện hiển thị.
2. `sp_phieu_cham_tu_dong_apply` / `sp_phieu_tong_hop_tu_dong` — bộ chọn "mỗi năm một phiếu
   nhận điểm tự động" sắp theo `id_phieu ASC`; phiếu Q1 có id nhỏ nhất nên **giành mất suất**
   của phiếu năm. Hỏng âm thầm, không báo lỗi.
3. `sp_tham_dinh_get_pending` — dòng phiếu quý nằm ở `trang_thai_dong = 2` chờ TP; không lọc
   thì chúng tràn vào hàng đợi của chuyên viên thẩm định.

**Bốn bất biến ở tầng DB là lưới an toàn** cho trường hợp sót một SP — sót `quy = 0` ở một
đường GHI thì va vào CHECK và báo lỗi ầm ĩ, thay vì âm thầm làm sai một quyết định nhân sự:

| Constraint | Nội dung |
|---|---|
| `chk_pdg_quy_loai_doi_tuong` | `quy = 0 OR loai_doi_tuong = 2` — phiếu quý chỉ cho viên chức |
| `chk_pdg_quy_trang_thai` | `quy = 0 OR trang_thai IN (1,2,5)` — không có trạng thái 3, 4 |
| `chk_pdg_quy_khong_xep_loai` | `quy = 0 OR (xep_loai / xep_loai_khoa / xep_loai_de_xuat / id_to_trinh / nhom_xep_hang / hang_trong_khoa đều NULL, `uu_tien_xuat_sac` = 0, `can_ht_duyet` = 0)` |
| `chk_pdg_quy_nguon_diem` | `quy = 0 OR nguon_diem_co_ban = 1` |

`chk_pdg_quy_khong_xep_loai` khiến `sp_to_trinh_khoa_ht_duyet` / `_ht_tra_lai` (khoá trên
`id_to_trinh`) **về mặt cấu trúc** không thể chạm vào phiếu quý.

#### Xếp loại theo quý — HAI CỘT RIÊNG, tự động theo điểm (đợt 2026-09-29)

Phiếu quý **có** xếp loại, nhưng ở cột riêng — `chk_pdg_quy_khong_xep_loai` giữ nguyên:

| Cột | Phiếu | Ghi ở đâu | Công thức |
|---|---|---|---|
| `xep_loai_quy` | QUÝ (1..4), `trang_thai = 5` | `sp_phieu_quy_tp_duyet`, cùng UPDATE lên 5 | `fn_xep_loai_vien_chuc(tong_diem_tich_luy của quý, 1)` |
| `xep_loai_tong_hop_quy` | NĂM, `nguon_diem_co_ban = 2` | `sp_phieu_nam_tong_hop_tu_quy` (roll-up) | `fn_xep_loai_vien_chuc(tong_diem_tich_luy năm, khong_vi_pham_phap_luat)` |

Luật (`fn_xep_loai_vien_chuc` = bản sao SQL của `XepLoaiCalculator.TinhXepLoaiVienChuc`, hai
bên **phải khớp**): `< 80` hoặc vi phạm pháp luật → 1; `80 .. < 101` → 2; `>= 101` → 3.
**Trần 3** — quý không có hạn ngạch 20%; mức 4 cả năm vẫn chỉ do `sp_to_trinh_khoa_dong_goi`
ghi vào `xep_loai`. Phiếu quý không có cờ vi phạm pháp luật: vi phạm của quý đã trừ điểm qua
3 dòng `VPVC_*`, nên truyền 1. Cờ của phiếu năm `NULL` = không vi phạm (giống `XemTruocChot`).

**Vì sao không dùng lại `xep_loai`:** đó là kết quả cuối của luồng năm và được các SP báo cáo
đếm theo năm — ghi xếp loại quý vào đó sẽ làm phình mọi thống kê xếp loại. Hai cột mới có
CHECK riêng làm lưới an toàn:

| Constraint | Nội dung |
|---|---|
| `chk_pdg_xep_loai_quy` | `NULL` hoặc (`quy BETWEEN 1 AND 4` **và** `trang_thai = 5` **và** giá trị 1..3). Nếu sau này có nghiệp vụ mở lại phiếu quý, CHECK buộc SP đó xoá `xep_loai_quy` cùng lúc. |
| `chk_pdg_xep_loai_tong_hop_quy` | `NULL` hoặc (`quy = 0` **và** `nguon_diem_co_ban = 2` **và** giá trị 1..3) |

`xep_loai_tong_hop_quy` thuộc **nhóm cột vết roll-up** (như `so_quy_da_chot`): chỉ roll-up
ghi, mở lại phiếu năm **không** xoá. Có quý chốt **sau** lần tổng hợp thì giá trị này cũ cho
tới khi chạy lại tổng hợp — `sp_phieu_quy_tong_hop_nhan_vien` trả thêm `xep_loai_du_kien`
(tính lại mỗi lần từ `diem_tich_luy_du_kien`) để FE phát hiện lệch.

#### `nguon_diem_co_ban` — công tắc chuyển mạch của điểm CƠ BẢN

| Giá trị | Hai vế điểm lấy từ đâu |
|---|---|
| **1** | Cả hai vế lấy từ dòng của **chính phiếu này**: nhóm A → cơ bản, nhóm B → vượt trội. Hành vi cũ: giảng viên, mọi phiếu cũ, và **cả phiếu quý**. |
| **2** | Phiếu này **chỉ có đúng 3 dòng `VPVC_*`**, ngoài ra là bản ghi tổng hợp. Cơ bản = **TRUNG BÌNH** các quý đã chốt (đã loại `VPVC_*`) **+ 3 dòng `VPVC_*` chấm trọn năm**; vượt trội = **CỘNG DỒN** các quý, từng tiêu chí kẹp ở khoảng hợp lệ của nó. Chỉ viên chức / NLĐ, và chỉ khi `nam_danh_gia.ap_dung_phieu_quy = 1`. |

Mặc định 1 nên **mọi phiếu cũ chạy y hệt** — delta hành vi bằng 0.

Nhánh `nguon_diem_co_ban = 2` tồn tại ở **đúng hai chỗ** và phải giống hệt nhau:
`sp_phieu_danh_gia_tinh_tong_diem` (màn xem trước) và khối chống tamper trong
`sp_phieu_khoa_duyet_ho_so` (ghi thật). Lệch một chữ số giữa hai bên là **lỗi nghiêm trọng**
— cùng lý lẽ với hằng số hạn ngạch ở `XepLoaiCalculator.cs:52-59`. Cả hai nhánh đều gọi chung
`fn_phieu_so_quy_da_chot` / `fn_phieu_diem_co_ban_tb_quy` / `fn_phieu_diem_vpvc_nam` /
`fn_phieu_diem_vuot_troi_tong_quy`, nên phần trùng lặp chỉ là ống dẫn. Chỗ gọi thứ ba là
`sp_phieu_nam_tong_hop_tu_quy` (roll-up).

##### Ngoại lệ `VPVC_*` — vì sao phiếu năm KHÔNG còn 0 dòng

Ba tiêu chí chấm tự động `VPVC_HOAN_THANH_CV` / `VPVC_CHINH_TRI` / `VPVC_NOI_QUY` **không
được lấy trung bình 4 quý**. Trung bình chỉ trừ ~1/4 số vi phạm cả năm: người vi phạm 12
điểm trong năm chỉ bị trừ 3 — sai nghiệp vụ. Vì vậy:

- Phiếu **quý** seed 3 dòng đó và chấm theo **vi phạm của quý đó** (`vi_pham_giang_day.quy`).
- Phiếu **năm** seed lại 3 dòng đó và chấm **trọn năm** (`sp_phieu_cham_tu_dong_apply` với
  `quy = 0`) — trừ **đủ** mọi vi phạm tương ứng trong năm.
- `fn_phieu_diem_co_ban_tb_quy` **loại** các dòng `VPVC_*` ra khỏi phép trung bình, nên
  không đếm đôi. Vì thế vế cơ bản cuối năm có **hai số hạng**, không phải một.

Trần điểm trừ của nhóm (`nhom_vi_pham.tran_diem_tru` = 70 / 30 / NULL) áp ở **cả hai cấp**:
mỗi quý cắt tổng của quý đó, phiếu năm cắt **tổng cả năm**. Trần nằm **sau** phép SUM trong
`fn_nckh_diem_tu_dong` nên một nhánh code phục vụ đúng cả hai cấp.

Guard `PHIEU_NAM_CON_DONG_CHI_TIET` (hai chỗ: `sp_phieu_khoa_duyet_ho_so` và
`sp_phieu_nam_tong_hop_tu_quy`) vì vậy chặn theo dòng **KHÁC `VPVC_*`**, chứ không còn chặn
"còn bất kỳ dòng nào". Phiếu cũ vẫn còn dòng nhóm B vẫn bị chặn như trước — điểm của chúng
không được tính nữa, và bỏ qua im lặng là người đó mất điểm mà không ai biết.

**Phiếu năm (gần như) 0 dòng vẫn chạy hết luồng năm.** `sp_phieu_submit` gọi
`sp_phieu_dong_bo_trang_thai_dong`; hàm này đếm 0 dòng chưa chốt nên đẩy thẳng phiếu
**2 → 3 (CHO_TK_DUYET)** trong cùng transaction — đúng nhánh vốn dành cho mẫu toàn tiêu
chí tự động. Hai hệ quả phải nhớ:

- `sp_phieu_nam_tong_hop_tu_quy` phải cho cả trạng thái **3**, không chỉ 1–2, nếu không
  ai nộp trước khi tổng hợp sẽ bị khoá cứng.
- `sp_phieu_truong_mo_lai` hạ `@trang_thai_moi = 2` xuống 1 với phiếu 0 dòng: không có
  thao tác cấp dòng nào để kích hoạt bất biến 2 → 3 nên mở lại về 2 là kẹt vĩnh viễn.

Khối chống tamper **không bị gỡ**, chỉ **đổi nguồn**: vẫn recompute từ DB, không tin con số
BLL gửi lên. Nó thêm một cửa chặn mới: `CHUA_TONG_HOP_QUY` khi chưa quý nào chốt.

Bảy cột phục vụ roll-up: `diem_co_ban_tb_quy`, `so_quy_da_chot`, `danh_sach_quy_da_chot`
(ví dụ `'1,2,4'` — `so_quy_da_chot = 3` một mình không audit được là những quý nào),
`ngay_tong_hop_quy`, `id_nguoi_tong_hop_quy`, `xep_loai_tong_hop_quy` (đợt "Xếp loại theo
quý"), cộng `nguon_diem_co_ban`.

#### State machine RÚT GỌN của phiếu quý

Dùng lại cột `trang_thai` nhưng **chỉ ba giá trị**, và **đọc giá trị 2 khác hẳn** luồng năm:

| | Luồng NĂM | Luồng QUÝ |
|---|---|---|
| 1 | Nháp | Nhân viên đang tự chấm |
| 2 | Đang thẩm định | **Đã nộp, chờ Trưởng phòng duyệt** |
| 3 | Chờ Trưởng khoa duyệt | **KHÔNG DÙNG** |
| 4 | Chờ Hiệu trưởng duyệt | **KHÔNG DÙNG** |
| 5 | Hoàn tất | TP đã chốt điểm + `xep_loai_quy` (tự động). `xep_loai` **NULL vĩnh viễn** |

    1 --[nhân viên nộp]-------------> 2
    2 --[TP trả về, LÝ DO bắt buộc]-> 1   (dòng về 1, nguon_tra_ve = 2)
    2 --[nhân viên huỷ nộp]---------> 1   (chặn nếu TP đã chấm dòng nào)
    2 --[TP duyệt và chốt điểm]-----> 5   (terminal — chưa có nghiệp vụ mở lại)

Cổng quyền duyệt: **TP / TK / TKL** (+ ADMIN) **tại đúng đơn vị của phiếu**. TK/TKL nằm trong
danh sách vì viên chức văn phòng Khoa có cấp trên là Trưởng khoa chứ không phải Trưởng phòng —
để "chỉ TP" thì nhóm người đó không bao giờ duyệt được phiếu quý.

`Helper/TrangThaiPhieu.MapText` **giữ nguyên** (mọi response luồng năm gọi nó qua
`PhieuDanhGiaChiTietDto.TrangThaiText`); luồng quý dùng hàm riêng `MapTextQuy`.

#### Công thức cuối năm — HAI VẾ, HAI PHÉP KHÁC NHAU

Mỗi quý chấm **cả nhóm A lẫn nhóm B** và cho ra đủ ba con số của riêng quý đó. Cuối năm
hai vế được gộp lại theo hai phép **khác nhau**, dùng nhầm là sai nghiệp vụ:

    diem_co_ban_tb_quy  = SUM(nhóm A của các quý trang_thai = 5, KHÔNG tính dòng VPVC_*)
                          / COUNT(các quý đó)

    diem_vpvc_nam       = Σ 3 dòng VPVC_* trên chính phiếu năm, chấm TRỌN NĂM
                          (mỗi dòng = MAX(0, diem_toi_da − MIN(Σ vi phạm cả năm, trần nhóm)))

    tong_diem_co_ban    = diem_co_ban_tb_quy + diem_vpvc_nam        ← HAI số hạng

    tong_diem_vuot_troi = MIN( tran_nhom_B ,
                               Σ theo từng tiêu chí nhóm B:
                                   kẹp( Σ điểm của tiêu chí đó qua các quý đã chốt ) )
                          khoảng kẹp theo bảng ở mục 2.4;
                          tran_nhom_B = fn_phieu_tran_nhom_vuot_troi (NULL = không cắt)

    tong_diem_tich_luy  = tong_diem_co_ban + tong_diem_vuot_troi

Cột audit `diem_co_ban_tb_quy` lưu **riêng** số hạng thứ nhất, không pha lẫn phần VPVC —
để còn đối chiếu được phép trung bình. `sp_phieu_nam_tong_hop_tu_quy` trả cả ba con số
(`diem_co_ban_tb_quy`, `diem_vpvc_nam`, `tong_diem_co_ban`) để FE giải trình được vì sao vế
cơ bản khác phép trung bình.

Cơ bản lấy **trung bình** để làm nhiều quý không làm điểm phình ra. Vượt trội **cộng dồn**
vì thành tích cả năm phải được cộng đủ — nhưng kẹp theo từng tiêu chí để một thành tích
khai lặp ở nhiều quý không vượt trần của tiêu chí đó.

**Hệ quả phải nhớ:** `tong_diem_vuot_troi` cuối năm **không** bằng tổng bốn con số
`tong_diem_vuot_troi` của các quý — khi trần cắn thì nó nhỏ hơn. Đừng đem cộng bốn quý rồi
đối khớp. `fn_phieu_chi_tiet_vuot_troi_quy` trả bảng phân rã theo từng tiêu chí
(`tong_cac_quy`, `diem_sau_kep`, `bi_kep`) để giải trình đúng chỗ nào bị cắt.

Vế vượt trội có **hai phép cắt nối tiếp**: (1) từng tiêu chí, (2) cả nhóm — xem mục "Trần 50
của cả nhóm". Bảng phân rã trên chỉ giải trình được phép (1); phép (2) đi kèm hai cột riêng
`tran_nhom_vuot_troi` và `tong_vuot_troi_truoc_tran_nhom` trên RS1 của
`sp_phieu_nam_tong_hop_tu_quy` và RS3 của `sp_phieu_quy_tong_hop_nhan_vien`.

Phép kẹp là **hai phía**, không phải chỉ chặn trên: tiêu chí chỉ trừ điểm có
`diem_toi_da = -100` mà cộng dồn 4 quý sẽ ra `-400` nếu thiếu sàn.

Quyết định nghiệp vụ: người vào làm giữa năm / nghỉ thai sản không bị phạt vì những quý
không tồn tại. **0 quý đã chốt → không ghi gì**, trả `KHONG_CO_QUY_DA_CHOT`; không ngầm coi
là 0 điểm, không ngầm chia 4. Hệ quả xuôi dòng là cố ý: `sp_phieu_khoa_duyet_ho_so` chặn tiếp
bằng `CHUA_TONG_HOP_QUY`, nên người chưa chốt quý nào **không xếp loại được** — đúng như mong
đợi. 1–3 quý vẫn thành công, kèm `canh_bao = 1` để FE hiện "chỉ tổng hợp từ N quý".

#### Tiêu chí chấm TỰ ĐỘNG: `VPVC_*` đã mở cổng, `TTVT_*` vẫn đóng

Cổng `loai_nguon_diem = 2` được mở **hẹp**, chỉ đúng 3 mã `VPVC_*` — ba mã đó đã có chiều
quý thật sự (`vi_pham_giang_day.quy`) và `fn_nckh_diem_tu_dong` đã nhận `@quy`, nên vi phạm
của quý 1 không thể rơi vào phiếu quý 2.

`TTVT_*` **vẫn đóng**: `fn_nckh_diem_tu_dong` (nhánh `TTVT_*`) gom
`chi_tiet_ke_khai_thanh_tich` theo `(id_nhan_vien, id_nam)` chứ **không theo quý**, nên mở
trước là đếm một thành tích bốn lần. Nguy hiểm hơn: phép kẹp trần sẽ **che lấp** lỗi đó
(4 lần vượt trần bị cắt về đúng trần, nhìn rất hợp lý) nên nó không lộ ra. Cột `quy` đã có
sẵn ở `chi_tiet_ke_khai_thanh_tich` — đợt bật cổng phải nối nó vào cùng commit.

> ⚠️ **Tripwire cũ từng mù.** `so_tieu_chi_tu_dong_bo_sot` trước đây lọc `ntc.loai_nhom = 2`,
> trong khi 3 tiêu chí `VPVC_*` nằm ở **nhóm A**. Nghĩa là chúng bị bỏ rơi suốt mà tripwire
> vẫn báo "0 tiêu chí bỏ sót" — đúng kịch bản mất điểm trong im lặng mà nó sinh ra để chặn.
> Nay bộ lọc `loai_nhom` đã bỏ, và loại trừ chính 3 mã `VPVC_*` (đã được seed) — còn lại
> đúng những mã thật sự chưa có chỗ đứng.

`sp_phieu_nam_tong_hop_tu_quy` đếm và trả `so_tieu_chi_tu_dong_bo_sot` /
`canh_bao_tieu_chi_tu_dong` để không ai mất điểm trong im lặng.

> ⚠️ **Cạm bẫy ở `sp_phieu_quy_tp_duyet`.** Bước chốt điểm chạy
> `diem_chinh_thuc = COALESCE(diem_khoa, diem_tu_danh_gia, 0)`. Dòng `VPVC_*` có **cả hai**
> đều NULL, nên nếu không loại `loai_nguon_diem = 2` ra khỏi `UPDATE` đó thì điểm tự động
> vừa chấm bị **ghi đè thành 0** ngay tại bước chốt — phiếu vẫn chốt thành công, chỉ có điểm
> là mất. TP cũng **không được chấm tay** dòng tự động (`DONG_CHAM_TU_DONG`).

**Ba thời điểm engine chạy:** nhân viên nộp phiếu quý (`sp_phieu_quy_nop`), TP chốt phiếu quý
(`sp_phieu_quy_tp_duyet`, để bắt vi phạm ghi nhận sau lúc nộp), và roll-up cuối năm
(`sp_phieu_nam_tong_hop_tu_quy`, chấm 3 dòng của phiếu năm với `quy = 0`). Cả ba đều
idempotent. Suất "phiếu nhận điểm tự động" (chống cộng trùng khi kiêm nhiệm đa đơn vị) nay
khoá theo `(id_nam, id_nhan_vien, quy)` thay vì `(id_nam, id_nhan_vien)` + chặn cứng
`quy = 0` — mỗi quý là một phạm vi tính điểm độc lập.

**Thứ tự bắt buộc:** chốt các quý → `POST api/phieu/{id}/tong-hop-tu-quy` → TK chốt hồ sơ →
đóng gói tờ trình.

#### `nam_danh_gia.ap_dung_phieu_quy` — công tắc theo năm

`BIT NOT NULL DEFAULT 0`. Năm đang chạy dở giữ nguyên hành vi cũ. Chỉ khi ADMIN bật:
`sp_phieu_quy_create` mới cho tạo phiếu quý, và `sp_phieu_danh_gia_create` mới đặt
`nguon_diem_co_ban = 2` cho viên chức.

#### LỖI TIỀM ẨN ĐÃ SỬA: `chk_lscd_diem`

`schema.sql:1163` khai `lich_su_cham_diem CHECK (diem IS NULL OR diem >= 0)`, trong khi tiêu chí
viên chức **được âm điểm** (mục 2.4, ví dụ mục III "Chấp hành quy định" khai `diem_toi_da = -100`)
và `sp_chi_tiet_danh_gia_update_tu_danh_gia` ghi **thẳng** `@diem` vào bảng này.

> ⚠️ CHECK này **vẫn còn trong DB thật** tới tận đợt "Đánh giá theo quý" — bước 1.6 của
> `update_database.sql` báo `[OK] Go chk_lscd_diem` chứ không phải `[SKIP]`. Nghĩa là đây
> **không** phải trôi lệch tài liệu mà là một **lỗi tiềm ẩn có thật**: bất kỳ ai chấm điểm âm
> cho một tiêu chí viên chức đều làm `sp_chi_tiet_danh_gia_update_tu_danh_gia` chết ở
> constraint. Nó chưa nổ chỉ vì nhánh chấm điểm âm chưa từng được dùng thật.

Đợt này bắt buộc phải gỡ vì phiếu quý gồm **toàn bộ** dòng nhóm A của viên chức — đúng chỗ
điểm âm sống. `update_database.sql` mục 1.6 gỡ **có kiểm tra trước**, nên chạy lại vẫn an toàn.
**`loai_doi_tuong` suy theo ĐƠN VỊ CỦA PHIẾU, không phải theo chức danh của người:**

| Đơn vị của phiếu | Chức danh (`nhan_vien.id_chuc_danh`) | `loai_doi_tuong` | Mẫu dùng |
|---|---|---|---|
| bất kỳ | miễn KPI: `HDLD_GV, HDLD_HUU` (`fn_chuc_danh_mien_kpi`) | **0** | — không tạo phiếu (chỉ có ở hàm / `auth/me`, không bao giờ ghi xuống `phieu_danh_gia`) |
| Khoa (`ma_don_vi LIKE 'K_%'`) | ngạch giảng dạy: `GV, GVC, GVCC` (`fn_chuc_danh_giang_day`) | **1** | Giảng viên |
| Khoa | NULL, hoặc mọi mã còn lại (`CV, CVC, NCV, KTV, HDLD_CNTT, ...`) | **2** | Viên chức / NLĐ — nhân viên văn phòng Khoa |
| Phòng / Trung tâm / Trường | mọi mã trừ mã miễn KPI | **2** | Viên chức / NLĐ |

Luật này khai báo **một nơi duy nhất**: inline TVF `dbo.fn_loai_doi_tuong_ca_nhan(@id_nhan_vien,
@id_don_vi)`, dùng bởi `sp_phieu_danh_gia_create`, `sp_phieu_quy_create` (chặn tạo phiếu quý
cho người loại 1) và `sp_auth_get_user_by_id` RS2 → `GET api/auth/me` trả
`DonVi[].LoaiDoiTuong`. FE bật menu đánh giá theo trường đó, không tự suy từ chức danh.

> ⚠ Trước đợt này SP chỉ kiểm `id_chuc_danh IS NOT NULL`, nên chuyên viên (`CV`) ở Khoa bị
> tạo phiếu năm theo **mẫu giảng viên** trong khi phiếu quý lại theo mẫu viên chức.
> `update_database.sql` của đợt này có truy vấn liệt kê các phiếu lệch loại còn sót.
>
> ✅ Đợt "Chức danh chính thức" đã thống nhất: hàm này, `v_giang_vien_khoa` và `v_vien_chuc_don_vi`
> (module vi phạm) cùng dùng **4 ngạch** `GV, GVC, GVCC, HDLD_GV` (trước đó hàm dùng 7 mã, hai view
> dùng 5 mã). Sửa danh sách ở một nơi phải sửa cả ba — xem §1.3.
>
> ✅ Đợt "Thêm HDLD_HUU vào ngạch giảng dạy": cả ba nâng lên **5 ngạch** (+ `HDLD_HUU`).
>
> ✅ Đợt "Miễn KPI HDLD": còn **3 ngạch** `GV, GVC, GVCC`, khai báo một chỗ ở `fn_chuc_danh_giang_day()`;
> `HDLD_GV, HDLD_HUU` → loại 0 (`fn_chuc_danh_mien_kpi()`), xem §1.3.

Đây là hiện thực của quyết định "KPI Phòng khác KPI Khoa": một PGS làm Trưởng phòng chấm
theo **mẫu viên chức** trên phiếu Phòng và theo **mẫu giảng viên** trên phiếu Khoa.
`id_chuc_vu` snapshot cũng lấy **tại đơn vị của phiếu** — người là TP của Phòng nhưng chỉ
giảng dạy ở Khoa thì phiếu Khoa mang `id_chuc_vu` NULL.

> ⚠ **HỆ QUẢ CŨ ĐÃ ĐƯỢC GỠ BỎ.** Trước đợt tách 3 nhóm, phiếu ở Phòng mang
> `loai_doi_tuong = 2` nên dính luật *"viên chức / NLĐ tối đa mức 2"* (`VUOT_MUC_VIEN_CHUC`)
> ⇒ **Trưởng phòng không thể đạt Xuất sắc trên phiếu Phòng**. Luật đó **KHÔNG CÒN**:
> `VUOT_MUC_VIEN_CHUC` đã bị gỡ khỏi cả `sp_phieu_khoa_duyet_ho_so` lẫn
> `sp_phieu_khoa_uu_tien_xuat_sac`.
>
> Nay viên chức / NLĐ lên được mức 3 (từ 101 điểm) và mức 4 (trong Top hạn ngạch của nhóm
> mình). Trưởng phòng thuộc **nhóm 3 Cán bộ quản lý** của chính Phòng đó, tranh hạn ngạch
> với PTP — xem §8.2.
>
> `loai_doi_tuong` vẫn suy theo đơn vị của phiếu như cũ; nó nay quyết định **luật xếp loại
> cá nhân** (ngưỡng điểm, có cần QĐ 838 không), KHÔNG còn quyết định việc có tranh hạn ngạch
> hay không.

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

**GIẢNG VIÊN (`loai_doi_tuong = 1`)** — `XepLoaiCalculator.TinhXepLoai`:

| `xep_loai` | Mức | Điều kiện |
|---|---|---|
| 1 | Không hoàn thành nhiệm vụ | `tong_diem_tich_luy < 80`, HOẶC `du_dinh_muc_gio_nckh = 0`, HOẶC `khong_vi_pham_phap_luat = 0` (bị xử lý kỷ luật trong năm) |
| 2 | Hoàn thành nhiệm vụ | `80 <= tong_diem_tich_luy <= 100` + đủ định mức giờ NCKH (QĐ 3237 + QĐ 1356) + không vi phạm pháp luật |
| 3 | Hoàn thành tốt nhiệm vụ | Thỏa (2) + `tong_diem_tich_luy > 100` + `muc_nckhcn_qd838 >= 1` (đạt mức HT Tốt KHCN — QĐ 838) |
| 4 | Hoàn thành xuất sắc nhiệm vụ | Thỏa (3) + `muc_nckhcn_qd838 = 2` + **nằm trong Top hạn ngạch 20% của nhóm mình** (xem mục 8) |

**VIÊN CHỨC / NLĐ (`loai_doi_tuong = 2`)** — `XepLoaiCalculator.TinhXepLoaiVienChuc`.
Họ không có định mức giảng dạy / giờ NCKH / QĐ 838 nên **không** phụ thuộc
`du_dinh_muc_gio_nckh`:

| `xep_loai` | Mức | Điều kiện |
|---|---|---|
| 1 | Không hoàn thành nhiệm vụ | `tong_diem_tich_luy < 80` HOẶC `khong_vi_pham_phap_luat = 0` |
| 2 | Hoàn thành nhiệm vụ | `80 <= tong_diem_tich_luy <= 100` + không vi phạm pháp luật |
| 3 | Hoàn thành tốt nhiệm vụ | `tong_diem_tich_luy >= 101` + không vi phạm pháp luật |
| 4 | Hoàn thành xuất sắc nhiệm vụ | Thỏa (3) + **nằm trong Top hạn ngạch 20% của nhóm mình** |

> ⚠ **NGƯỠNG MỨC 3 LỆCH CÓ CHỦ Ý: giảng viên `> 100`, viên chức `>= 101`.**
> Điểm lẻ là **có thật** — `chi_tiet_danh_gia.diem_*` là `DECIMAL(5,2)` và
> `tieu_chi_danh_gia.loai_thang_diem` hỗ trợ `2 = Liên tục` / `4 = Công thức`, không có bước
> làm tròn nào trong hệ thống. Nên ở dải **100.01–100.99**: giảng viên lên mức 3, viên chức
> không. `sp_phieu_khoa_duyet_ho_so` tách `DIEM_KHONG_DU` thành 2 nhánh đúng theo lệch này.
> Đừng "sửa cho nhất quán".

Cán bộ quản lý (nhóm 3) dùng đúng bảng của **loại đối tượng mình mang**, không có bảng riêng.

**AI GHI CỘT NÀO — đọc kỹ, đây là chỗ dễ nhầm nhất:**

| Cột | Ai ghi | Khi nào | Giá trị hợp lệ |
|---|---|---|---|
| `xep_loai_de_xuat` | Hệ thống (`XepLoaiCalculator`) | Khi TK mở hồ sơ ở GĐ3 | 1–4, chỉ để **đối chiếu** |
| `xep_loai_khoa` | **Trưởng khoa chọn tay** | Chốt hồ sơ cá nhân (GĐ3, 3→4) | **1/2/3 — cấm chọn 4** |
| `xep_loai` | Hệ thống | Đóng gói tờ trình (mục 8) | `= xep_loai_khoa`, nâng lên 4 nếu trúng Top hạn ngạch |
| `can_ht_duyet` | Hệ thống (`sp_phieu_khoa_duyet_ho_so`) | TK chốt hồ sơ (GĐ3, 3→4) | 0/1 — snapshot, **không** suy lại về sau |
| `hang_trong_khoa` | Hệ thống | Đóng gói tờ trình | Thứ hạng **trong nhóm**, trên toàn bộ quần thể nhóm |
| `nhom_xep_hang` | Hệ thống | Đóng gói tờ trình | 1/2/3 — snapshot, **không** suy lại về sau |
| `xep_loai_quy` | Hệ thống (`fn_xep_loai_vien_chuc`) | TP chốt phiếu **quý** (2→5) | 1/2/3, chỉ phiếu quý — **không** phải xếp loại năm |
| `xep_loai_tong_hop_quy` | Hệ thống (`fn_xep_loai_vien_chuc`) | Roll-up phiếu năm từ các quý | 1/2/3, chỉ phiếu năm `nguon_diem_co_ban = 2` — mức **theo điểm**, để đối chiếu |

Hai dòng cuối (đợt "Xếp loại theo quý") là **mức theo điểm**, không ai chọn tay và **không
tham gia** chuỗi `xep_loai_khoa → xep_loai`. Xem mục 4.1 "Xếp loại theo quý".

Mức 4 KHÔNG ai chọn tay được: nó phụ thuộc thứ hạng trong nhóm của cả đơn vị nên chỉ tính
được khi 100% hồ sơ của đơn vị đã chốt. `ly_do_xep_loai` bắt buộc khi
`xep_loai_khoa <> xep_loai_de_xuat`.

`nhom_xep_hang` phải snapshot vì nhóm phụ thuộc bộ chức vụ **tại thời điểm đóng gói**, vốn
đổi về sau khi có bổ nhiệm / miễn nhiệm — cùng lý do `can_ht_duyet` phải snapshot.
`Helper/ChucVuLanhDao.XacDinhNhom()` chỉ dùng để **hiển thị / xem trước**, không thay được
cột snapshot này.

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
  `15 − tổng diem_tru`, và 3 mã `VPVC_*` của viên chức) bị loại hẳn: điểm là phần còn lại
  sau khi trừ chứ không phải một mức rời rạc, nên tuyệt đối không được kéo về mức nào.
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
Thư ký Khoa/Phòng (TKK/TKP) nhập → Trưởng Khoa/Phòng (TK/TKL/TP) duyệt (tiêu chí đã phân quyền
do trưởng đơn vị được giao chấm) → Hiệu trưởng (HT) duyệt & chốt.

Trạng thái `phieu_danh_gia_don_vi.trang_thai`:

| Trạng thái | Ý nghĩa |
|---|---|
| 1 | Nháp / đang nhập (TKK/TKP) |
| 2 | Chờ Trưởng đơn vị duyệt |
| 3 | Trưởng đơn vị đã duyệt / chờ Trường |
| 4 | Trường (HT) đã duyệt, chờ chốt |
| 5 | Hoàn tất (read-only, trừ khi mở lại) |

**Chấm cấp 2 theo `tieu_chi_don_vi_cham`** (xem §2.8):

| Tiêu chí | Ai ghi `diem_duyet_dv` (trạng thái 2) | Bắt buộc có `diem_duyet_dv` trước khi duyệt 2→3? |
|---|---|---|
| Có phân quyền, nhập tay (`loai_nguon_diem = 1`) | TK/TKL/TP của đơn vị được giao | **Có** — thiếu → `VALIDATION_FAILED` |
| Có phân quyền, tự động (`loai_nguon_diem = 2`) | TK/TKL/TP của đơn vị được giao | Không — không chấm = giữ `diem_tong_hop` |
| Không phân quyền | TK/TKL/TP của đơn vị của phiếu (như cũ) | Không (điểm nguồn là đủ) |

- Nút duyệt 2→3 (`sp_phieu_dv_duyet`) **vẫn** thuộc trưởng đơn vị của phiếu. Trưởng đơn vị
  của phiếu **không** sửa được điểm tiêu chí đã giao cho đơn vị khác (trừ khi đơn vị mình cũng
  được giao). HT vẫn ghi đè được ở trạng thái 3 như cũ.
- Trưởng đơn vị được giao **xem** được phiếu (list/detail) và **đọc** minh chứng của phiếu từ
  trạng thái ≥ 2. Không thấy phiếu đang nháp; không ghi minh chứng; kho minh chứng
  (`sp_minh_chung_dv_get_kho`) không mở.
- Hàng đợi: `GET api/phieu-don-vi?choToiCham=true` = phiếu trạng thái 2 còn tiêu chí được giao
  cho mình mà `diem_duyet_dv IS NULL`.
- `sp_phieu_dv_get_detail` trả cờ theo người xem: header `so_tieu_chi_giao_chua_cham`; chi tiết
  `co_phan_quyen`, `duoc_cham_duyet_dv`, `ten_don_vi_cham`. Luật của `duoc_cham_duyet_dv` phải
  GIỐNG HỆT gate của `sp_chi_tiet_dv_update_diem_duyet_dv` — sửa một nơi phải sửa cả hai.
- Mở lại về 2 (`sp_phieu_dv_mo_lai`) xoá `diem_duyet_dv` → đơn vị được giao phải chấm lại.

Ghi chú từng bảng:
- **4.10 `chi_tiet_danh_gia_don_vi`**: `loai_nguon_diem` 1 = chấm thủ công (TKK/TKP nhập
  `diem_nhap`), 2 = tự động tổng hợp từ KPI thành viên (hệ thống điền `diem_tong_hop`).

**Mã `cong_thuc_tong_hop` của phiếu đơn vị** (`loai_nguon_diem = 2`, dispatch bằng `CASE` trong
`sp_phieu_dv_tong_hop_kpi`; mã lạ → giữ nguyên điểm cũ). `cong_thuc_snapshot` được **chốt lúc tạo
phiếu** nên phiếu tạo trước khi gán tiêu chí sẽ không nhận mã mới — phải tạo lại phiếu.

| Mã | Công thức | Nguồn |
|---|---|---|
| `DIEM_TB_THANH_VIEN` | `MIN(diem_toi_da, AVG(tong_diem_tich_luy))` | `phieu_danh_gia` đã chốt (`trang_thai = 5`) |
| `TY_LE_XUAT_SAC` | `diem_toi_da * (số `xep_loai = 4` / tổng phiếu)` | nt |
| `TY_LE_HOAN_THANH` | `diem_toi_da * (số `xep_loai IN (2,3,4)` / tổng phiếu)` | nt |
| `DIEM_TRU_TAP_THE` | `MAX(0, diem_toi_da − diem_tru_tap_the)` | `fn_diem_tru_tap_the_khoa` (vi phạm của Khoa) |
| `PHSV_DIEM_TB_KHOA` | `>= 3 → 2.50` ; `[2, 3) → 1.50` ; `< 2 → 0` (kẹp trần `diem_toi_da`) | `fn_diem_tb_phan_hoi_sv_khoa` (điểm TB phản hồi SV đã chốt) |
| `NCKH_TY_LE_HOAN_THANH_KHOA` | `> 75% → 20` ; `(65, 75] → 15` ; `(50, 65] → 10` ; `<= 50% → 0` (kẹp trần `diem_toi_da`) | `fn_ty_le_hoan_thanh_nckh_khoa` (giờ NCKH đã đồng bộ) |
| `NCKH_BAI_BAO_TB_KHOA` | `MIN(so_bai_bao / N, 1) × diem_toi_da` (tuyến tính, kẹp trần) | `fn_so_bai_bao_wos_scopus_khoa` (bài báo WoS/Scopus đã đồng bộ) |
| `NCKH_BAI_BAO_Q1Q2_TB_KHOA` | `MIN(so_bai_bao_q1q2 / N, 1) × diem_toi_da` (tuyến tính, kẹp trần) | `fn_so_bai_bao_wos_scopus_khoa` (**cùng hàm**, cột `so_bai_bao_q1q2`) |
| `HV_TOT_NGHIEP_TREN_50_KHOA` | `ty_le_tot_nghiep_dung_han > 50 → diem_toi_da` ; ngược lại `0` | `fn_ty_le_hoc_vu_khoa` (xem 14.5) |
| `HV_CANH_BAO_DUOI_20_KHOA` | `ty_le_canh_bao_hoc_vu < 20 → diem_toi_da` ; ngược lại `0` | nt |
| `HV_TOT_NGHIEP_TREN_70_KHOA` | `ty_le_tot_nghiep_dung_han > 70 → diem_toi_da` ; ngược lại `0` | nt |
| `HV_CANH_BAO_DUOI_10_KHOA` | `ty_le_canh_bao_hoc_vu < 10 → diem_toi_da` ; ngược lại `0` | nt |

- Ba mã đầu phụ thuộc phiếu thành viên: **không có phiếu nào chốt → 0**.
- `DIEM_TRU_TAP_THE`, `PHSV_DIEM_TB_KHOA`, `NCKH_TY_LE_HOAN_THANH_KHOA`, `NCKH_BAI_BAO_TB_KHOA`,
  `NCKH_BAI_BAO_Q1Q2_TB_KHOA` và 4 mã `HV_*` thì
  **không**: chúng đọc từ
  số vi phạm / điểm phản hồi sinh viên / giờ NCKH / bài báo NCKH / học vụ sinh viên, nên các nhánh này nằm **TRƯỚC** guard
  `@so_phieu = 0` trong `CASE`. Để sau guard thì
  Khoa chưa chốt phiếu nào sẽ bị ghi 0, tức là bị trừ sạch `diem_toi_da` thay vì đạt đủ điểm. Đây là
  cái bẫy chính mỗi khi thêm mã "không phụ thuộc phiếu thành viên".
- Tiêu chí dùng `DIEM_TRU_TAP_THE` là **mức TUÂN THỦ của tập thể**, không phải điểm trừ: không vi
  phạm → đủ `diem_toi_da` (thường đặt 7.5 = đúng bằng trần điểm trừ tập thể), sàn 0. Cùng khuôn với
  `VPGD_TUAN_THU` / `VPVC_*` của luồng cá nhân, và tránh `diem_toi_da` âm — tiêu chí đơn vị
  (`loai_doi_tuong = 3`) không được phép âm, còn `sp_phieu_dv_tinh_tong_diem` thì CỘNG mọi chi tiết.
- Đặt `loai_thang_diem = 2` (liên tục): điểm là phần CÒN LẠI sau khi trừ, không phải mức rời rạc.
- `PHSV_DIEM_TB_KHOA` = "Điểm đánh giá phản hồi của sinh viên trung bình của Khoa". TB tính bằng
  `AVG` các `diem_tb_phan_hoi_sinh_vien.diem_trung_binh` của **từng giảng viên** thuộc Khoa — mỗi GV
  đếm đúng 1 lần, KHÔNG phải trung bình trên từng lượt trả lời (GV dạy 10 lớp không nặng ký gấp 10).
  Thang Likert **1-5**, nên mốc 3 và 2 là mốc trên thang 5.
  - Lọc Khoa qua `v_giang_vien_khoa.id_khoa`, **KHÔNG** dùng `diem_tb_phan_hoi_sinh_vien.id_don_vi`:
    cột đó là snapshot **đơn vị chính** của GV nên có thể là Bộ môn → lọc thẳng sẽ sót người. Cùng lý
    do với `DIEM_TRU_TAP_THE`, hàm nhận `@id_don_vi` của **chính phiếu**, không nhận tập đơn vị con.
  - Mốc điểm là **hằng số tuyệt đối** theo văn bản quy định (khác khuôn `NCKH_GIO_TY_LE` vốn nhân tỉ
    lệ với `diem_toi_da`) → đổi trọng số tiêu chí sau này phải sửa stored procedure. Vẫn kẹp trần
    `diem_toi_da` vì `sp_phieu_dv_tinh_tong_diem` CỘNG mọi chi tiết. Đặt `diem_toi_da = 2.5`,
    `loai_thang_diem = 2`.
  - **Chưa chốt điểm TB → 0** (cùng quy ước với mã cá nhân `PHSV_DIEM_TB_GTE_3`). P.QLCL phải gọi
    `POST api/diem-tb-phan-hoi-sv/chot` TRƯỚC khi Khoa tổng hợp KPI. Result set của
    `sp_phieu_dv_tong_hop_kpi` trả kèm `so_gv_co_phan_hoi` để FE phân biệt "0 vì điểm thấp" với
    "0 vì thiếu dữ liệu". Chốt lại điểm TB **không** tự sửa điểm đã ghi vào phiếu — phải tổng hợp lại.
- `NCKH_TY_LE_HOAN_THANH_KHOA` = "Tỷ lệ GV hoàn thành nhiệm vụ NCKH" của Khoa.
  `ty_le = D * 100 / N` với `D` = số GV hoàn thành, `N` = số GV thuộc diện tính.
  - **"Hoàn thành" dùng ĐÚNG điều kiện GV được ĐIỂM TỐI ĐA của tiêu chí cá nhân `NCKH_GIO_TY_LE`**
    (`gio_nckh_quy_doi >= gio_nckh_dinh_muc`, tức tỷ lệ ≥ 100% — xem 3.6.8), để tỷ lệ của Khoa luôn
    khớp với điểm cá nhân của từng GV. Đổi định nghĩa một bên mà không đổi bên kia → hai con số lệch
    nhau và bảng đối soát vô nghĩa.
  - ⚠️ **BẤT BIẾN:** mệnh đề tìm dòng giờ NCKH (`TOP 1` + JOIN email LOWER+TRIM +
    `ORDER BY ma_nguoi_dung_nckh`) trong `fn_ty_le_hoan_thanh_nckh_khoa` phải GIỐNG HỆT nhánh
    `NCKH_GIO_TY_LE` của `fn_nckh_diem_tu_dong` và `fn_nckh_gio_chi_tiet` — ba nơi, sửa một phải sửa
    cả ba. Dùng `OUTER APPLY` + `TOP 1` chứ **không** `INNER JOIN` thẳng: nguồn có thể có 2 mã NCKH
    trùng email trong cùng một năm → JOIN thẳng sẽ đếm GV đó **hai lần**.
  - **Mẫu số** = toàn bộ GV của Khoa (`v_giang_vien_khoa.id_khoa`, đã cuộn Bộ môn lên Khoa) **TRỪ**
    GV được **miễn NCKH**. "Được miễn" = `gio_nckh_dinh_muc IS NOT NULL AND <= 0` (định mức `= 0` là
    dữ liệu thật đã khai báo) — để trong mẫu số sẽ phạt Khoa vì một điều Khoa không kiểm soát.
    CỐ Ý **không** dùng `ISNULL(dinh_muc, 0) <= 0` như `fn_nckh_diem_tu_dong`: bên đó gộp NULL với 0
    vì cả hai đều ra 0 điểm, còn ở đây phải TÁCH — định mức NULL / không có dòng nào là **thiếu số
    liệu**, GV đó vẫn nằm trong mẫu số và tính là **chưa hoàn thành**. Gộp lại sẽ cho Khoa hưởng lợi
    từ chính lỗi thiếu dữ liệu của mình.
  - Mốc điểm là **hằng số tuyệt đối** 20 / 15 / 10 / 0 theo văn bản (cùng khuôn `PHSV_DIEM_TB_KHOA`,
    khác khuôn `NCKH_GIO_TY_LE` vốn nhân tỉ lệ) → đổi trọng số phải sửa stored procedure. Vẫn kẹp
    trần `diem_toi_da`. **Đúng 50% rơi vào bậc 0đ** (bậc trên là "> 50%") — cùng quy ước với
    `NCKH_GIO_TY_LE`. Đặt `diem_toi_da = 20`, `loai_thang_diem = 2` (liên tục).
  - ⚠️ Tuy điểm là 4 mức rời rạc, vẫn đặt `loai_thang_diem = 2` như `PHSV_DIEM_TB_KHOA`, **KHÁC**
    `NCKH_GIO_TY_LE` (đặt 1 + 4 mức `thang_diem`): `chi_tiet_danh_gia_don_vi` **không có cột
    `id_thang_diem_chon`** và `sp_phieu_dv_tong_hop_kpi` **không** ánh xạ mức thang điểm. Đặt
    `loai_thang_diem = 1` chỉ tạo ra các dòng `thang_diem` không bao giờ được chọn.
  - **Chưa đồng bộ giờ NCKH → 0**. Phải gọi `POST api/nckh/gio-nckh/dong-bo` TRƯỚC khi Khoa tổng hợp
    KPI. Result set trả kèm `ty_le_hoan_thanh_nckh`, `so_gv_thuoc_dien_nckh`, `so_gv_hoan_thanh_nckh`,
    `so_gv_mien_nckh` để FE phân biệt "0 vì tỷ lệ thấp" với "0 vì thiếu dữ liệu"
    (`so_gv_thuoc_dien_nckh = 0`). Đơn vị KHÔNG phải Khoa (Phòng, TTNCN): hàm trả `N = 0`,
    `ty_le = NULL` → chấm 0, không chia 0, không mất dòng.
- `NCKH_BAI_BAO_TB_KHOA` = "Số bài báo trong tạp chí/kỷ yếu WoS/Scopus TB trên 1 giáo viên" của Khoa.
  `so_bai_tren_gv = B / N` với `B` = số bài WoS/Scopus của Khoa trong năm, `N` = tổng số GV của Khoa.
  - ⚠️ **BẤT BIẾN:** vị từ WoS/Scopus + khung năm trong `fn_so_bai_bao_wos_scopus_khoa` phải GIỐNG HỆT
    nhánh `NCKH_BAI_WOS_SCOPUS` của `fn_nckh_minh_chung_tu_dong` (`danh_muc_tap_chi IN (SCIE, SSCI,
    AHCI, SCOPUS, ESCI)`, `ngay_xuat_ban` trong `[nam_danh_gia.ngay_bat_dau, ngay_ket_thuc]`) — sửa
    một nơi phải sửa cả hai, nếu không số của Khoa sẽ lệch điểm cá nhân của từng GV và lệch cả danh
    sách minh chứng mà API xem trước liệt kê.
  - **Tử số khử trùng đồng tác giả — ĐÃ CHỐT:** gom `GROUP BY bb.ma_bai_bao_nguon` rồi `COUNT(*)`
    (tương đương `COUNT(DISTINCT bb.ma_bai_bao_nguon)` — dùng `GROUP BY` để có chỗ gắn thêm cờ
    `la_q1q2`, xem `NCKH_BAI_BAO_Q1Q2_TB_KHOA` bên dưới). PK của
    `nckh_bai_bao` là `(ma_nguoi_dung_nckh, ma_bai_bao_nguon)` nên `ma_bai_bao_nguon` là id bài **bên
    nguồn** — hai đồng tác giả cùng Khoa đứng tên một bài có CÙNG giá trị đó. Vậy `B` là số **bài
    thật sự** của Khoa, không phải số lượt ghi nhận: Khoa không được lợi khi các GV nội bộ ghép tên
    nhau. **KHÁC** cách chấm cá nhân (mọi đồng tác giả đều được ghi nhận bài đó) — chủ ý, không phải
    bất nhất.
  - ⚠️ **CỐ Ý KHÔNG dùng `OUTER APPLY + TOP 1`** như `fn_ty_le_hoan_thanh_nckh_khoa`. Bên đó mỗi GV
    chỉ được lấy MỘT dòng giờ NCKH nên `TOP 1` là bắt buộc để không đếm GV hai lần. Ở đây ngược lại:
    GV có 2 mã NCKH trùng email thì phải gộp bài của **cả hai**, và `DISTINCT ma_bai_bao_nguon` đã lo
    phần khử trùng. Dùng `TOP 1` ở đây sẽ **LÀM MẤT** bài.
  - **Mẫu số** = toàn bộ GV của Khoa (`v_giang_vien_khoa.id_khoa`), dùng **đúng** vị từ `dem_gv` của
    `fn_diem_tru_tap_the_khoa` → `so_giang_vien` của hai hàm LUÔN bằng nhau. Phiếu đơn vị chỉ trả về
    MỘT cột `so_giang_vien` cho cả hai tiêu chí đối chiếu, nên hai con số này không được phép lệch.
  - **Hệ số BÁM `diem_toi_da`, KHÁC khuôn hằng số tuyệt đối** của `PHSV_DIEM_TB_KHOA` /
    `NCKH_TY_LE_HOAN_THANH_KHOA`. Văn bản ghi "TB trên 1 GV × 10" mà trần tiêu chí cũng đang là 10 →
    nghĩa thật là "TB 1 bài/GV = đạt TRỌN tiêu chí". Viết theo tỉ lệ (`MIN(TB, 1) × diem_toi_da`, cùng
    khuôn `NCKH_GIO_TY_LE`) nên đổi trọng số tiêu chí sau này **chỉ cần sửa `diem_toi_da`**, không
    phải sửa stored procedure. Nhánh `TB >= 1` trả THẲNG `diem_toi_da`: vừa là kẹp trần, vừa tránh
    sai số làm tròn của phép nhân. Đặt `diem_toi_da = 10`, `loai_thang_diem = 2` (liên tục — điểm
    biến thiên liên tục theo TB, không phải mức rời rạc).
  - **Chưa đồng bộ bài báo → 0**. Phải gọi `POST api/nckh/dong-bo` TRƯỚC khi Khoa tổng hợp KPI.
    Result set trả kèm `so_bai_bao_wos_scopus` và `so_bai_bao_tren_gv`; FE dùng `so_giang_vien = 0`
    để phân biệt "0 vì ít bài" với "0 vì đơn vị không phải Khoa". Đơn vị KHÔNG phải Khoa: hàm trả
    `N = 0`, `B = 0`, `so_bai_tren_gv = NULL` → chấm 0, không chia 0, không mất dòng.
- `NCKH_BAI_BAO_Q1Q2_TB_KHOA` = "Số bài báo trong tạp chí/kỷ yếu WoS/Scopus **Q1/Q2** TB trên 1 giáo
  viên" của Khoa. `so_bai_q1q2_tren_gv = B_q / N` với `B_q` = số bài Q1/Q2 của Khoa trong năm,
  `N` = tổng số GV của Khoa. **Cùng khuôn `NCKH_BAI_BAO_TB_KHOA`, chỉ khác TỬ SỐ.**
  - **DÙNG CHUNG hàm `fn_so_bai_bao_wos_scopus_khoa`** (hàm trả thêm 2 cột `so_bai_bao_q1q2` /
    `so_bai_q1q2_tren_gv`), **KHÔNG** tách hàm riêng. Lý do: `B_q` là tập con của `B` nên hai tiêu
    chí chung khối join GV/email/bài báo và **chung MẪU SỐ `N`**. Tách hàm sẽ cho phép hai mẫu số
    lệch nhau, trong khi phiếu đơn vị chỉ trả về **MỘT** cột `so_giang_vien` cho cả ba tiêu chí đối
    chiếu (`DIEM_TRU_TAP_THE`, `NCKH_BAI_BAO_TB_KHOA`, mã này). `sp_phieu_dv_tong_hop_kpi` cũng chỉ
    gọi hàm **một lần** cho cả hai mã.
  - ⚠️ **BẤT BIẾN:** vị từ Q1/Q2 `UPPER(LTRIM(RTRIM(bb.xep_hang_q))) IN (N'Q1', N'Q2')` phải GIỐNG
    HỆT dòng lọc cuối của nhánh `NCKH_BAI_Q1Q2` trong `fn_nckh_minh_chung_tu_dong`. Q1/Q2 **chồng
    lên** vị từ WoS/Scopus (bài Q1/Q2 vẫn phải thuộc `danh_muc_tap_chi IN (SCIE, SSCI, AHCI, SCOPUS,
    ESCI)`) — đừng bỏ dòng `danh_muc_tap_chi` đi.
  - **Cờ `la_q1q2` dùng `MAX(...)`:** một bài có NHIỀU dòng (1 dòng / đồng tác giả), chỉ cần **MỘT**
    dòng ghi Q1/Q2 là cả bài tính là Q1/Q2 — cùng quy ước với luồng cá nhân (mọi đồng tác giả đều
    được ghi nhận bài đó). Nếu nguồn ghi `xep_hang_q` không đồng nhất giữa các dòng của cùng một
    bài thì `MAX` là lựa chọn an toàn: không **LÀM MẤT** bài vì một dòng bị bỏ trống.
  - ⚠️ **TÍNH TRÙNG với `NCKH_BAI_BAO_TB_KHOA` là CHỦ Ý:** bài Q1/Q2 là **tập con** của bài
    WoS/Scopus nên một bài Q1/Q2 được tính ở **CẢ HAI** tiêu chí (× 10 và × 50). Đây là chủ đích của
    quy định — tiêu chí Q1/Q2 là phần thưởng **THÊM** cho chất lượng. **KHÔNG** được "sửa lỗi đếm
    trùng" bằng cách trừ bài Q1/Q2 ra khỏi tiêu chí WoS/Scopus.
  - **Hệ số BÁM `diem_toi_da`** (cùng khuôn `NCKH_BAI_BAO_TB_KHOA`, khác khuôn hằng số tuyệt đối của
    `PHSV_DIEM_TB_KHOA` / `NCKH_TY_LE_HOAN_THANH_KHOA`). Văn bản ghi "TB trên 1 GV × 50" mà trần
    tiêu chí cũng đang là 50 → nghĩa thật là "TB 1 bài Q1/Q2 trên 1 GV = đạt TRỌN tiêu chí". Đối
    chiếu ví dụ trong văn bản: **TB 0.3 bài/GV → 0.3 × 50 = 15 điểm** ✔. Đổi trọng số tiêu chí sau
    này **chỉ cần sửa `diem_toi_da`**. Nhánh `TB >= 1` trả THẲNG `diem_toi_da`: vừa là kẹp trần, vừa
    tránh sai số làm tròn. Đặt `diem_toi_da = 50`, `loai_thang_diem = 2` (liên tục).
  - **Chưa đồng bộ bài báo → 0**. Result set trả kèm `so_bai_bao_q1q2` và `so_bai_q1q2_tren_gv`
    (luôn có `so_bai_bao_q1q2 <= so_bai_bao_wos_scopus`); mẫu số vẫn là `so_giang_vien` ở trên, SP
    **không** trả lại lần ba. Đơn vị KHÔNG phải Khoa: `N = 0`, `B_q = 0`,
    `so_bai_q1q2_tren_gv = NULL` → chấm 0, không chia 0, không mất dòng.
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
- `ix_gio_nckh_nam` trên `nckh_gio_nckh`: PK là `(ma_nguoi_dung_nckh, id_nam)` nên `id_nam`
  KHÔNG phải cột dẫn đầu, trong khi mọi truy vấn đọc đều lọc theo năm ⇒ cần index riêng.
  Join về `nhan_vien` theo email là **non-sargable** (`LOWER(LTRIM(RTRIM(...)))` cả 2 vế) —
  index trên `email` không giúp được; quy mô vài trăm dòng nên chấp nhận scan.
- `ix_kpi_bbqt_nam` trên `nckh_kpi_bai_bao_quoc_te`: cùng lý do, nhưng ở đây index còn phục vụ
  chính `DELETE WHERE id_nam = @id_nam` của mỗi lần đồng bộ (không chỉ truy vấn đọc).


---

## 7. NHIỆM VỤ KHOA — CHỦ TRÌ KÊ KHAI, TRƯỞNG KHOA DUYỆT (KPI Nhóm III)

Tên bảng vẫn là `nhiem_vu_khoa` / `phan_cong_nhiem_vu_khoa` (giữ nguyên để không phá dữ liệu
và FE), nhưng từ **2026-10-02** người nhập liệu là **chủ trì nhiệm vụ**, không còn là Khoa.

### Vì sao đổi người nhập liệu — lần thứ ba

1. **Ban đầu: giảng viên tự kê khai vào phiếu của mình** (bảng `nhiem_vu_cong_dong`, mục 4.4).
   Sai vì vai trò *chủ trì* / *phối hợp chính* / *phối hợp* là **quan hệ tương đối giữa nhiều
   người trong CÙNG một nhiệm vụ**, mà mỗi dòng lại gắn vào phiếu của một người — nhiều GV cùng
   khai "chủ trì" cho một việc mà hệ thống không phát hiện được. Luồng này đã khoá
   (`NVCD_DA_NGUNG`, HTTP 409).
2. **Sau đó: "Khoa nhập liệu, GV phản hồi, Trưởng khoa chốt cả kỳ".** Đúng mô hình dữ liệu
   (một nhiệm vụ, nhiều người, tối đa một chủ trì) nhưng dồn việc gõ dữ liệu cho Khoa, trong
   khi người biết rõ nhất ai làm gì là **chủ trì**.
3. **Hiện tại (chốt với người dùng 2026-10-02): chủ trì kê khai, Trưởng khoa duyệt.** Giữ
   nguyên mô hình dữ liệu của bước 2 — một nhiệm vụ, danh sách phân công, tối đa một CT — chỉ
   đổi **ai** được ghi:
   - Giảng viên của Khoa tạo nhiệm vụ ⇒ **tự động là chủ trì (CT)**, tự chọn người phối hợp
     chính (PHC) / phối hợp (PH) trong Khoa. Một người không thể ghi mình là PHC rồi gán CT
     cho người khác: "người khai = chủ trì" là bất biến cứng.
   - Trưởng khoa **duyệt từng nhiệm vụ**; **duyệt = chốt dữ liệu** của nhiệm vụ đó. Không
     còn bước chốt cả kỳ.
   - TK / TKL / TP **chỉ duyệt** (và xoá nhiệm vụ sai / trùng), không nhập thay. **TLGVK chỉ
     xem.**
   - **Bỏ luồng phản hồi**: GV thiếu nhiệm vụ thì tự kê khai (nếu là chủ trì) hoặc báo chủ
     trì thêm vào; sai vai trò thì báo chủ trì sửa trước khi Trưởng khoa duyệt.

Hai GV cùng kê khai **trùng một việc** (mỗi người tự nhận chủ trì một bản) là rủi ro còn lại
của mô hình — hệ thống không tự phát hiện vì tên nhiệm vụ là văn bản tự do. Trưởng khoa là
chốt chặn: trả về hoặc xoá bản trùng khi duyệt.

### State machine — `nhiem_vu_khoa.trang_thai`

```
          ┌──── chủ trì sửa (THẬT SỰ đổi) ────┐
          v                                   │
1 CHO_DUYET ──TK duyệt──> 2 DA_DUYET ──TK mở lại (lý do)──> 3 TRA_VE
     │                        ^                                 │
     └──TK trả về (lý do)──> 3 TRA_VE ──────TK duyệt────────────┘
```

| | Ý nghĩa |
|---|---|
| **1 CHO_DUYET** | Chủ trì sửa / xoá / thêm minh chứng được; nằm trong hàng đợi của Trưởng khoa. **Không tính điểm.** |
| **2 DA_DUYET** | Khoá với chủ trì (`NHIEM_VU_DA_DUYET` 409 khi sửa / xoá / thêm-gỡ minh chứng). **Tính điểm.** |
| **3 TRA_VE** | Kèm `ly_do_tra_ve` (bắt buộc — `THIEU_LY_DO`). Chủ trì sửa thì **tự quay về 1**. Trưởng khoa vẫn duyệt thẳng 3 → 2 được. **Không tính điểm.** |

- Chỉ quay 3 → 1 khi nội dung **thật sự đổi** (nhóm / tên / mô tả / thêm-gỡ-đổi vai trò /
  ghi chú người phối hợp; so sánh `COLLATE Latin1_General_BIN` nên sửa hoa-thường cũng tính).
  Mở form rồi bấm lưu mà không sửa gì thì **giữ 3** — không được âm thầm nuốt lý do trả về
  (cùng quy ước mục 9.3). SP trả message *"Không có thay đổi nào được ghi nhận"*.
- `id_nguoi_duyet` / `ngay_duyet` = người và thời điểm **xét gần nhất** (duyệt hoặc trả về /
  mở lại), chỉ để hiển thị. Lịch sử đầy đủ ở `lich_su_nhiem_vu_khoa`.
- **Điều kiện duyệt**: có chủ trì. Nhiệm vụ kê khai theo luồng mới luôn có; chỉ dữ liệu cũ do
  Khoa nhập mới có thể thiếu ⇒ `DUYET_KHONG_HOP_LE` (422).
- **Chống ghi đè dựa vào trạng thái, không có row-version** (giống 9.6): `sp_nhiem_vu_khoa_xet`
  `UPDATE ... WHERE trang_thai = @cu`, `_save` đọc lại trạng thái dưới `UPDLOCK, HOLDLOCK`
  trong transaction, `_delete` của chủ trì kèm `trang_thai <> 2` ngay trong câu `UPDATE`. Hai
  người đụng cùng nhiệm vụ thì người sau nhận `TRANG_THAI_KHONG_HOP_LE` / `NHIEM_VU_DA_DUYET`.
  Rủi ro chấp nhận được: chủ trì sửa (vẫn ở 1) ngay trước khi TK bấm duyệt ⇒ TK duyệt bản mới
  mà màn hình chưa tải lại.
- **Trưởng khoa tự duyệt nhiệm vụ mình chủ trì là HỢP LỆ** (giống 9.4): chặn thì không ai trong
  Khoa duyệt được việc của Trưởng khoa.

### Năm quy tắc bất biến

1. **Điểm ghi cứng vào bản ghi phân công** (`phan_cong_nhiem_vu_khoa.diem_snapshot`) tại thời
   điểm gán, KHÔNG tính động từ vai trò mỗi lần đọc. `sp_nhiem_vu_khoa_save` chỉ re-snapshot
   điểm khi `id_vai_tro` THAY ĐỔI. Dòng **CT của chủ trì** khi sửa được chép nguyên từ dòng
   đang có (form không gửi dòng này) — nếu resolve lại từ danh mục thì một mức override mới cho
   (Khoa, năm) sẽ âm thầm đổi điểm CT. Nhờ vậy dữ liệu kỳ cũ luôn khớp bản báo cáo đã ký.
2. **Mỗi nhiệm vụ đúng một chủ trì = người kê khai.** Request chỉ chứa người phối hợp; gửi vai
   trò CT ⇒ `TRUNG_CHU_TRI` (422), gửi chính mình ⇒ `INVALID`. Filtered unique index
   `ux_pcnvk_chu_tri` vẫn là lớp chặn cuối.
3. **Trần 20 điểm KHÔNG chặn việc kê khai / duyệt.** Mọi API trả tổng điểm đều có hai con số:
   `TongDiemThucTe` và `TongDiemQuyDoi` = `MIN(thực tế, trần)`. Báo cáo và Excel dùng điểm quy
   đổi.
4. **Chỉ nhiệm vụ DA_DUYET mới là số liệu chính thức**: điểm vào phiếu, tổng điểm, đếm theo vai
   trò / nhóm, Excel. Phần chưa duyệt (1 + 3) luôn tách riêng (`TongDiemChoDuyet`,
   `SoNhiemVuChoDuyet`) — không bao giờ cộng lẫn.
5. **Ghi nhật ký mọi thay đổi vai trò, điểm và mọi lần xét** vào `lich_su_nhiem_vu_khoa`, trong
   CÙNG transaction với thao tác.

### 7.1. `ky_nhiem_vu_khoa`

Từ 2026-10-02 kỳ chỉ còn là **container** (năm × Khoa) của các nhiệm vụ — trạng thái duyệt
nằm ở **từng nhiệm vụ**. Kỳ được **tạo lười**: `sp_nhiem_vu_khoa_ky_get` và `_save` tự INSERT
nếu chưa có.

`trang_thai = 2` (đã chốt) chỉ còn sinh ra từ **luồng cũ**: kỳ đó vẫn khoá ghi toàn bộ
(`KY_DA_CHOT`) cho tới khi Trưởng khoa mở lại qua `PUT api/nhiem-vu-khoa/ky` (`MoLai` + lý do).
`sp_nhiem_vu_khoa_chot` / `_kiem_tra_chot` trả `LUONG_DA_NGUNG` nên không sinh thêm kỳ chốt mới.
`han_phan_hoi` là vết tích của luồng phản hồi — vẫn đọc / ghi được, không còn ý nghĩa nghiệp vụ.

### 7.2 – 7.3. `nhiem_vu_khoa`, `phan_cong_nhiem_vu_khoa`

Danh mục dùng lại (KHÔNG tạo bảng mới):
- **`danh_muc_nhom_nhiem_vu`** — seed 7 nhóm công tác cố định, `loai_doi_tuong = 1`.
- **`danh_muc_vai_tro_pvcd`** — đã seed CT = 10, PHC = 7, PH = 4; giữ nguyên cơ chế override theo
  `(id_don_vi, id_nam)`. `sp_nhiem_vu_khoa_save` resolve theo đúng thứ tự ưu tiên
  `(đơn vị,năm) > (đơn vị,NULL) > (NULL,năm) > (NULL,NULL)`.

4 cột mới trên `nhiem_vu_khoa` (đợt 2026-10-02): `trang_thai` (`DEFAULT 1`, CHECK 1/2/3),
`id_nguoi_duyet` (FK `nhan_vien`), `ngay_duyet`, `ly_do_tra_ve`; filtered index
`ix_nvk_ky_trang_thai (id_ky, trang_thai) WHERE da_xoa = 0` cho hàng đợi duyệt.
`id_nguoi_tao` = người kê khai (= chủ trì với dữ liệu mới; với dữ liệu cũ là TK / TLGVK).

Client **không gửi điểm** — server tự resolve từ danh mục rồi mới snapshot.

Lưu theo lô: `sp_nhiem_vu_khoa_save` nhận TVP `dbo.PhanCongNhiemVuKhoaRow` chứa TOÀN BỘ danh
sách **người phối hợp** sau khi sửa, tự thêm dòng CT cho người gọi, tự tính diff DELETE /
UPDATE / INSERT trong một transaction. Một form, một lần lưu — KHÔNG có endpoint riêng cho
phân công. TVP **không đổi** so với luồng cũ.

### 7.4. `phan_hoi_nhiem_vu_khoa` — LUỒNG ĐÃ NGỪNG

Hai loại: `1` sai vai trò, `2` thiếu nhiệm vụ. Từ 2026-10-02 `sp_phan_hoi_nhiem_vu_khoa_create`
/ `_xu_ly` và upload minh chứng cấp 2 trả `LUONG_DA_NGUNG` (409; controller trả ngay, không đọc
multipart). `sp_phan_hoi_nhiem_vu_khoa_list` và RS5 của `_cua_toi` vẫn đọc dữ liệu cũ.
Phản hồi cũ còn "chờ xử lý" không chặn gì nữa — `update_database.sql` KT4 liệt kê để Trưởng
khoa đọc và xử lý ngoài hệ thống.

### 7.5. `minh_chung_nhiem_vu_khoa` — minh chứng HAI CẤP

- `cap_gan = 1` → cấp **nhiệm vụ**: quyết định phân công, kế hoạch, biên bản — dùng chung cho cả
  nhóm, tải lên một lần. **Chỉ chủ trì** thêm được, và chỉ khi nhiệm vụ **chưa duyệt**.
- `cap_gan = 2` → cấp **phản hồi** (luồng đã ngừng): chỉ còn đọc / gỡ dữ liệu cũ.

Một bảng với XOR hai FK (`chk_mcnvk_cap`) thay vì hai bảng, vì cùng module và cùng luồng
upload/download.

Chỉ nhận **PDF**, kiểm HAI LỚP: đuôi file + chữ ký `%PDF-` (chặn đổi đuôi). File nằm ở
`App_Data/uploads/nhiem-vu-khoa/{nhiem-vu|phan-hoi}/{id}/{guid}.pdf` (ngoài webroot, đã
gitignore); DB chỉ giữ metadata. Tải xuống kiểm quyền và chặn path traversal.

Quyền đọc: người của Khoa (`can_xem`) | thành viên nhiệm vụ đó | chủ nhân phản hồi.
Quyền gỡ (kỳ phải còn mở): cấp 1 = (người tự tải lên | chủ trì) **và** nhiệm vụ chưa duyệt;
cấp 2 = người tự tải lên | Trưởng khoa.

### 7.6. `lich_su_nhiem_vu_khoa`

Dùng bảng `lich_su_*` riêng theo convention dự án (`lich_su_cham_diem`,
`lich_su_trang_thai_phieu`) — **KHÔNG** dùng bảng `nhat_ky`: bảng đó khai báo trong schema từ
đầu nhưng chưa từng có dòng nào ghi vào.

`hanh_dong`: 1 Kê khai nhiệm vụ · 2 Sửa nhiệm vụ (mô tả thêm *"(gửi duyệt lại)"* khi 3 → 1) ·
3 Xoá · 4 Thêm phân công · 5 Đổi vai trò / điểm · 6 Gỡ phân công · **10 Duyệt** · **11 Trả
về** · **12 Mở lại nhiệm vụ đã duyệt**. 7 (Chốt kỳ) · 8 (Mở lại kỳ) · 9 (Xử lý phản hồi) là
của luồng cũ — 8 vẫn sinh ra khi mở lại kỳ cũ; 7 / 9 không còn sinh ra nhưng **vẫn nằm trong
`chk_lsnvk_hd`** vì dòng lịch sử cũ mang các giá trị đó.

Hành động 2 chỉ ghi khi nội dung nhiệm vụ / danh sách thật sự đổi (trước đây ghi mỗi lần lưu).

### Phân quyền

Hai loại quyền, đặt ở hai chỗ khác nhau:

- **Theo chức vụ** — inline TVF **`fn_nhiem_vu_khoa_quyen(@id_don_vi, @user, @chuc_vu, @don_vi)`**,
  fail-closed, đọc tập cặp (đơn vị, chức vụ) qua `fn_pham_vi_don_vi` (mục 10.6).
- **Theo dữ liệu** — chủ trì / thành viên là quan hệ trên `phan_cong_nhiem_vu_khoa`, từng SP tự
  kiểm. Không đưa vào UDF vì UDF tính theo đơn vị, không theo nhiệm vụ.

| Ai | Làm gì | Kiểm ở |
|---|---|---|
| **GV của Khoa** (`v_giang_vien_khoa.id_khoa`) | Kê khai nhiệm vụ mới (trở thành CT); xem DS giảng viên Khoa để chọn người phối hợp (không kèm điểm) | `_save`, `_giang_vien_list` |
| **Chủ trì** (`pc.la_chu_tri = 1`) | Sửa / xoá / thêm-gỡ minh chứng — khi nhiệm vụ chưa duyệt | `_save`, `_delete`, `sp_minh_chung_nvk_*` |
| **Thành viên** (có dòng phân công) | Xem chi tiết nhiệm vụ + minh chứng | `_get_by_id`, `sp_minh_chung_nvk_get_by_id` |
| `can_duyet`: `TK` `TKL` `TP` trong phạm vi đơn vị, hoặc `ADMIN` | Duyệt / trả về / mở lại; xoá ở mọi trạng thái; sửa hạn / ghi chú / mở lại kỳ cũ | `_xet`, `_delete`, `_ky_set` |
| `can_xem`: `can_duyet` ∪ `TLGVK` trong phạm vi ∪ `HT` / `ADMIN` | Xem toàn bộ, tổng hợp, Excel, lịch sử | các SP đọc |

`can_nhap` / `can_chot` của UDF là **vết tích**: giữ cột để SP chỉ đọc `can_xem` không phải
sửa, nhưng không SP ghi nào còn gate bằng `can_nhap` (TLGVK vì thế mất mọi quyền ghi).

**BLL không gate thêm bằng `ma_chuc_vu` của JWT** (khác trước đây): quyền duyệt là CẶP (đơn vị,
chức vụ), người chỉ làm TK ở đơn vị **kiêm nhiệm** mang JWT chức vụ khác và sẽ bị 403 GIẢ —
cùng lý do `PhanHoiNhiemVuKhoaService` đã bỏ gate ở Đợt 2. `NhiemVuKhoaService` chỉ kiểm hình
dạng request; SP là nguồn sự thật duy nhất.

Module chỉ áp dụng cho **Khoa** (`ma_don_vi LIKE 'K_%'`); đơn vị khác trả `KHONG_PHAI_KHOA`.

### Điểm đi vào phiếu đánh giá

Dùng lại **khung chấm điểm tự động** đã có (xem mục 4.2):

- Tiêu chí `Thực hiện nhiệm vụ theo phân công của Khoa` (nhóm 4, `diem_toi_da` 20) đặt
  `loai_nguon_diem = 2`, `cong_thuc_tong_hop = N'NVK_PHAN_CONG_KHOA'` (giữ tên mã cũ).
- `fn_nckh_diem_tu_dong` nhánh khoá theo `@id_nhan_vien` + `@id_nam`: tổng `diem_snapshot` của
  các phân công thuộc nhiệm vụ **`trang_thai = 2`** trong năm (mọi Khoa), cap ở `@diem_toi_da`.
  Cả ba luồng có ngay: chấm khi GV nộp phiếu (`sp_phieu_cham_tu_dong_apply`), endpoint
  `POST api/phieu/{id}/tong-hop-tu-dong`, và preview `GET api/maudanhgia/{id}/diem-tu-dong`.
- `fn_nckh_minh_chung_tu_dong` nhánh `loai_nguon = 6` liệt kê từng nhiệm vụ **đã duyệt** kèm vai
  trò và điểm. **BẤT BIẾN: vị từ lọc (`da_xoa = 0` + `trang_thai = 2` + cùng năm) phải giống
  hệt ở hai hàm** — lệch nhau thì FE hiển thị minh chứng khác tập dòng đã sinh ra điểm.
- `loai_thang_diem = 2` (Liên tục), KHÔNG có dòng `thang_diem` ⇒ `id_thang_diem_chon` luôn NULL.

**Chưa duyệt ⇒ 0 điểm** (giống `TTVT_*`, mục 11.6). GV thường nộp phiếu trước khi Trưởng khoa
duyệt hết; duyệt xong chạy lại `POST api/phieu/{id}/tong-hop-tu-dong` để làm mới. **Không lọc
theo trạng thái kỳ** — kỳ không còn bước chốt.

`sp_nhiem_vu_khoa_cua_toi` cộng **mọi Khoa** trong năm cho khớp hàm chấm (trước đây chỉ một
kỳ — GV kiêm nhiệm có thể thấy tổng nhỏ hơn điểm thật trên phiếu). Header luôn có `id_don_vi`
= Khoa chính của GV (ưu tiên `la_chinh = 1`) **kể cả khi Khoa chưa có kỳ** — đó là Khoa FE gửi
lên khi kê khai.

**Trần điểm định nghĩa MỘT nơi**: scalar UDF `fn_nhiem_vu_khoa_tran_diem()` (= 20). Đổi trần =
sửa hàm này VÀ `diem_toi_da` của tiêu chí. `GET api/cau-hinh/nhiem-vu-khoa` trả cờ
`LechCauHinh` khi hai con số lệch nhau.

### Di trú dữ liệu cũ (đợt 2026-10-02)

- Nhiệm vụ thuộc kỳ **đã chốt** ⇒ `DA_DUYET`, người / ngày duyệt = người / ngày chốt kỳ, kèm
  dòng lịch sử `hanh_dong = 10`.
- Nhiệm vụ ở kỳ **đang mở** ⇒ `CHO_DUYET` — **thôi được tính điểm** cho tới khi Trưởng khoa
  duyệt (Trưởng khoa chưa từng xác nhận chúng). KT2 của script liệt kê GV bị ảnh hưởng.
- Nhiệm vụ cũ **thiếu chủ trì** (KT3): không ai sửa được, không duyệt được ⇒ Trưởng khoa xoá,
  chủ trì thật kê khai lại.
- Nhiệm vụ cũ do Khoa nhập: người đang là CT trở thành người sửa được nhiệm vụ.

### Mã lỗi của module

`FORBIDDEN` → 403 · `NOT_FOUND` → 404 · `INVALID` / `KHONG_PHAI_KHOA` / `GV_NGOAI_KHOA` /
`THIEU_LY_DO` → 400 · `KY_DA_CHOT` / `NHIEM_VU_DA_DUYET` / `TRANG_THAI_KHONG_HOP_LE` /
`LUONG_DA_NGUNG` → 409 · `TRUNG_CHU_TRI` / `DUYET_KHONG_HOP_LE` / `CHOT_KHONG_HOP_LE` (luồng
cũ) → 422 · `SQL_ERROR` → 500.

### Hợp đồng result set

Mọi SP của module: **RS1** = `success` / `message` / `error_code`; **RS2..** = dữ liệu, chỉ phát
khi `success = 1`. `_save` và `_xet` chỉ trả id / RS1 — BLL đọc lại chi tiết qua `_get_by_id` để
mọi endpoint ghi trả cùng một hình dạng. RS nhiệm vụ có sẵn `cho_phep_sua` / `cho_phep_xet` để
FE không phải tự suy từ trạng thái.
---

## 8. TỜ TRÌNH KPI KHOA & HẠN NGẠCH XUẤT SẮC

Gói hồ sơ KPI của 1 Khoa trong 1 năm. Đây là nơi **DUY NHẤT** tính hạn ngạch 20% và nâng
`xep_loai` lên mức 4 — **trừ viên chức Khoa**: từ 2026-10-01 họ không có hạn ngạch Khoa, mức 4
do Hiệu trưởng / ADMIN chọn ở `sp_xet_xuat_sac_vc_khoa_chot` (§8.7). Không SP nào khác được ghi
mức 4 vào `phieu_danh_gia.xep_loai`.

### 8.1. `to_trinh_kpi_khoa` — trạng thái gói

| Trạng thái | Tên | Ý nghĩa |
|---|---|---|
| 1 | DANG_TONG_HOP | Chưa đủ 100% hồ sơ được Trưởng khoa chốt |
| 2 | DA_DONG_GOI | Đã tính hạn ngạch + nâng xuất sắc; mở nút "Trình Hiệu trưởng" |
| 3 | DA_TRINH | Chờ Hiệu trưởng duyệt |
| 4 | HT_DA_DUYET | Chốt số liệu toàn Khoa, khóa chiến dịch, sinh báo cáo lương/thưởng. **Cũng là trạng thái của gói TỰ ĐỘNG HOÀN TẤT** — phân biệt qua `id_nguoi_duyet` (NULL = tự động) |
| 5 | HT_TRA_VE | HT trả về ≥1 hồ sơ; TK xử lý rồi trình lại |

```
1 ──[đóng gói, đơn vị CÓ hồ sơ lãnh đạo]────► 2
1 ──[đóng gói, đơn vị KHÔNG có hồ sơ LĐ]────► 4   (tự động hoàn tất, id_nguoi_duyet = NULL,
                                                   lich_su hanh_dong = 6)
2 ──[TK trình Hiệu trưởng]──────────────────► 3   (lan_trinh += 1)
3 ──[HT duyệt gói]──────────────────────────► 4   (các phiếu LÃNH ĐẠO còn ở 4 → 5)
3 ──[HT trả về, kèm danh sách hồ sơ]────────► 5   (các phiếu được chọn 4 → 3)
5 ──[TK xử lý xong, đóng gói lại]───────────► 2
```

Điều kiện đóng gói là 100% hồ sơ ở trạng thái **4 hoặc 5** (không còn chỉ là 4): sau luồng
tách đôi, hồ sơ thường đã HOÀN TẤT ở lần đóng gói trước nên đang nằm ở 5. Giữ điều kiện cũ thì
mọi lần đóng gói **lại** đều báo `CHUA_DU_HO_SO` vĩnh viễn.

Có hồ sơ rớt khỏi trạng thái 4 (TK trả dòng về thẩm định, HT trả hồ sơ về TK) thì gói
tự động về trạng thái 1.

> ⚠ **ĐÓNG GÓI LẠI CÓ THỂ HẠ XẾP LOẠI CỦA HỒ SƠ ĐÃ HOÀN TẤT.** Thêm hồ sơ mới vào đơn vị làm
> mẫu số hạn ngạch 20% đổi ⇒ bước (6) của `sp_to_trinh_khoa_dong_goi` ghi đè `xep_loai` cho
> **toàn bộ** phiếu của (năm, đơn vị), kể cả phiếu đang ở trạng thái 5. Một người đang Xuất sắc
> có thể rớt về Hoàn thành tốt.
>
> Đây là hệ quả toán học không tránh được của việc cho hồ sơ "xong sớm ở cấp TK" trong khi hạn
> ngạch vẫn tính trên toàn đơn vị — **không phải lỗi**. SP ghi một dòng `lich_su_trang_thai_phieu`
> (`trang_thai_truoc = trang_thai_sau = 5`, `hanh_dong = 4`) nêu rõ mức cũ → mức mới, kèm **tên
> nhóm và mẫu số** đã dùng, cho mỗi phiếu bị đổi, để truy vết.
>
> **Từ đợt tách 3 nhóm, biên độ hạ mức còn rộng hơn**, vì hai lý do mới:
> - Luật **bỏ-lấp-suất** (§8.2 điểm 4) có thể làm GIẢM số người đạt mức 4 ngay cả khi thành phần
>   nhóm không đổi — chỉ cần người đứng đầu Top đổi.
> - Một người **đổi nhóm** (ví dụ được bổ nhiệm PTK giữa chừng) làm đổi mẫu số của **HAI** nhóm
>   cùng lúc: nhóm cũ mất một người, nhóm quản lý thêm một người.
>
> Muốn chặn hẳn thì phải khoá không cho thêm hồ sơ sau khi đơn vị đã đóng gói lần đầu — là một
> quyết định nghiệp vụ riêng, chưa làm.

### 8.2. Luật hạn ngạch top 20% — ĐÃ CHỐT VỚI NGƯỜI DÙNG

Phạm vi xếp hạng là **TỪNG ĐƠN VỊ** (Khoa / Phòng / Trung tâm), không phải toàn trường.

Mỗi đơn vị xếp hạng **BA BẢNG ĐỘC LẬP, LOẠI TRỪ NHAU**, khóa theo `fn_chuc_vu_can_ht_duyet()`:

| Nhóm | Thành viên | **Mẫu số hạn ngạch** | Điều kiện lên mức 4 |
|---|---|---|---|
| 1 Giảng viên thường | `loai_doi_tuong = 1`, chức vụ ∉ bộ 6 mã | **số người `xep_loai_khoa = 3`** | trong Top **và** `muc_nckhcn_qd838 = 2` |
| 2 Viên chức / NLĐ | `loai_doi_tuong = 2`, chức vụ ∉ bộ 6 mã — **chỉ Phòng / Trung tâm** (viên chức Khoa: §8.7) | **số người `xep_loai_khoa = 3`** | trong Top **và** `xep_loai_khoa = 3` |
| 3 Cán bộ quản lý | chức vụ ∈ `{TK,TKL,PTK,PTKL,TP,PTP}` | **TỔNG số quản lý của đơn vị** | trong Top **và** mức 3 theo loại đối tượng của mình |

```
so_mau_so = 0  ->  han_ngach = 0
so_mau_so > 0  ->  han_ngach = MAX(1, FLOOR(so_mau_so * ty_le_xuat_sac))
```

`id_chuc_vu` NULL ⇒ rơi vào nhóm 1 hoặc 2 theo `loai_doi_tuong`. Vì `id_chuc_vu` snapshot
**tại đơn vị của phiếu**, phiếu Khoa chỉ mang TK/TKL/PTK/PTKL và phiếu Phòng chỉ mang
TP/PTP ⇒ nhóm 3 của mỗi đơn vị luôn đồng nhất thang điểm, không so điểm chéo hai mẫu phiếu.
Hạn ngạch nhóm 3 tính **riêng trong từng đơn vị**, KHÔNG gộp toàn trường.

Năm điểm dễ hiểu sai, đọc kỹ:

1. **MẪU SỐ KHÁC NHAU GIỮA CÁC NHÓM — quyết định nghiệp vụ.** Giảng viên / viên chức
   **không giữ chức vụ quản lý** (nhóm 1 và 2) lấy *số người được chốt mức 3 (Hoàn thành
   tốt)*; nhóm 3 lấy *tổng số quản lý* của đơn vị.
   Khoa có 30 GV mà chỉ 10 người mức 3 ⇒ hạn ngạch nhóm 1 = `FLOOR(10 × 0.2)` = **2**.
   Phòng có 8 viên chức mà chỉ 2 người mức 3 ⇒ hạn ngạch nhóm 2 = `MAX(1, FLOOR(2 × 0.2))` = **1**.
   Phòng có 8 viên chức mà **không ai** mức 3 ⇒ mẫu số 0 ⇒ hạn ngạch nhóm 2 = **0**.

   > **Đổi ngày 2026-10-01:** trước đó nhóm 2 lấy *tổng đầu người* của nhóm. Snapshot
   > `to_trinh_kpi_khoa_nhom` của các gói đóng trước ngày này vẫn mang mẫu số cũ (không
   > backfill); gói còn đóng gói lại được (trạng thái 1/2/5) sẽ tính lại theo luật mới ở
   > lần đóng gói kế tiếp, gói đã trình / đã duyệt (3/4) giữ nguyên kết quả cũ.
2. **Làm tròn XUỐNG, NHƯNG tối thiểu 1 suất** nếu mẫu số > 0. Mẫu số 27 ⇒ 5; mẫu số 3 ⇒
   `FLOOR(0.6) = 0` ⇒ nâng lên **1**. Đây là ngoại lệ nghiệp vụ đã xác nhận: nhóm 1–4
   người sẽ vượt tỷ lệ 20% trên thực tế (nhóm 3 người ⇒ 1 suất = 33%). Chấp nhận.
3. **Viên chức/NLĐ Phòng / Trung tâm CÓ tranh hạn ngạch** và lên được mức 3 (từ 101 điểm) lẫn
   mức 4 — ở bảng riêng của mình. Trần mức 2 cũ (`VUOT_MUC_VIEN_CHUC`) đã bị gỡ bỏ.
   **Viên chức Khoa** (từ 2026-10-01) không còn hạn ngạch Khoa — xem §8.7.
4. ⚠ **XÁC ĐỊNH TOP TRƯỚC, XÉT ĐIỀU KIỆN SAU — SUẤT BỎ TRỐNG, KHÔNG DỒN XUỐNG.**
   Xếp hạng trên **TOÀN BỘ** quần thể của nhóm → cắt Top đúng bằng hạn ngạch → *rồi mới*
   lọc điều kiện mức 4. Người trong Top mà thiếu điều kiện thì **giữ mức 3 và suất đó bỏ
   trống**; người đứng dưới Top **KHÔNG** được nâng lên thay.

   > Ví dụ chuẩn: hạn ngạch 2 · hạng 1 không đạt QĐ 838 mức 2 · hạng 2 đạt · hạng 3 đạt
   > ⇒ **chỉ hạng 2 lên mức 4**. Hạng 3 không nhận suất của hạng 1.

   ⇒ **`so_dat` ĐƯỢC PHÉP nhỏ hơn `han_ngach`.**

   Tuyệt đối KHÔNG lọc `du_dieu_kien_muc4 = 1` trước khi cắt Top — đó chính là cơ chế dồn
   suất mà luật này loại bỏ.
5. **Điều kiện mức 4 xét theo LOẠI ĐỐI TƯỢNG của chính người đó, không theo nhóm.** Cán bộ
   quản lý là giảng viên vẫn phải đạt QĐ 838 mức 2; là viên chức thì không (họ không có
   QĐ 838).

Thứ tự xếp hạng: `ORDER BY tong_diem_tich_luy DESC, uu_tien_xuat_sac DESC, id_phieu ASC`,
`PARTITION BY nhom`. (SQL Server 2008: dùng `ROW_NUMBER() OVER (...)`, **không** có
`OFFSET/FETCH`.)

`hang_trong_khoa` nay là **thứ hạng TRONG NHÓM** (trên toàn bộ quần thể nhóm, không chỉ
người đủ điều kiện) và **không bao giờ NULL** — khác hẳn trước đây.

**Tỷ lệ khóa cứng ở 0.2000.** Tham số `@ty_le_xuat_sac` giữ trong chữ ký SP để không phá
contract API, nhưng `NULL` = `0.2000` và giá trị khác trả `TY_LE_KHONG_HOP_LE` (chặn ở cả
BLL lẫn SP). Cột `ty_le_xuat_sac` và cơ chế snapshot **giữ nguyên**: quy định có thể đổi
theo năm và tờ trình cũ phải tra cứu lại được tỷ lệ đã dùng.

### 8.3. Đồng hạng ở ranh giới — CHẶN CÓ ĐIỀU KIỆN, không tự quyết

Đồng hạng xét tại ranh giới Top của **TOÀN BỘ** quần thể nhóm, và có thể nổ ở **tối đa 3
nhóm cùng lúc**. `sp_to_trinh_khoa_dong_goi` xét hết cả 3 nhóm rồi báo lỗi **MỘT LẦN** —
fail-fast nhóm đầu sẽ bắt trưởng đơn vị đóng gói lại 3 lần mới biết hết.

Gọi `so_bang_ddk` = số người đồng hạng tại ranh giới **có `du_dieu_kien_muc4 = 1`**:

| Điều kiện | Xử lý |
|---|---|
| `so_bang <= suat_con_lai` | Cắt gọn đẹp, lấy hết. Không chặn |
| `so_bang_ddk <= suat_con_lai` | Mọi người đủ điều kiện chắc chắn có suất bất kể chia thế nào ⇒ kết quả duy nhất. **Không chặn**; lấp Top ưu tiên người đủ điều kiện, rồi `id_phieu ASC` |
| `so_uu_tien_ddk = suat_con_lai` | Trưởng đơn vị đã chỉ định đúng số người còn thiếu. Không chặn |
| còn lại | **DỪNG** với `error_code = 'DONG_HANG'` |

> Vì sao phải lọc: từ khi cắt Top trên toàn bộ quần thể (thay vì trên tập đã đủ điều kiện),
> đồng hạng ở ranh giới trở nên phổ biến hơn hẳn — kể cả giữa những người mức 1/2 chẳng liên
> quan tới mức 4. Chặn hết sẽ khiến đóng gói gần như không thực hiện được. Tinh thần cũ giữ
> nguyên: hệ thống **không bao giờ tự tie-break khi kết quả thực sự phụ thuộc vào lựa chọn**.

`uu_tien` chỉ tính trong số người **đủ điều kiện**: chỉ định một người không thể lên mức 4
là vô nghĩa, và để nguyên thì trưởng đơn vị có thể vô tình khóa suất của người đủ điều kiện.

Cố ý KHÔNG tự tie-break bằng `id_nhan_vien` hay `tong_diem_vuot_troi`: đây là quyết định
nhân sự. Trưởng đơn vị chỉ định qua `PUT api/phieu/{id}/uu-tien-xuat-sac` rồi đóng gói lại.

**Chỉ TK/TKL/TP (và ADMIN) chỉ định được.** PTK/PTKL/PTP nằm trong `fn_chuc_vu_can_ht_duyet()`
(hồ sơ của họ cần HT duyệt) nhưng **không** có quyền chốt hồ sơ người khác — xem ghi chú ở
đầu `procedure.sql` và gate của `sp_phieu_khoa_uu_tien_xuat_sac`.

Hình dạng result set của nhánh `DONG_HANG`:
- **RS1** — scalar mô tả nhóm bị chặn có số hiệu **nhỏ nhất**, kèm `so_nhom_dong_hang`.
  Cột `so_giang_vien` là **alias deprecated** của `so_mau_so` (giữ cho FE đang chạy).
- **RS2** — người đồng hạng của **tất cả** nhóm bị chặn, kèm `nhom` và cờ `du_dieu_kien_muc4`.
- **RS3** — 1 dòng / nhóm bị chặn với đầy đủ counter.

### 8.4. Dữ liệu di trú từ quy trình cũ

Tờ trình sinh tự động cho các `(năm, đơn vị)` đã có hồ sơ HOAN_TAT, trạng thái = 4.
**`so_dat_xuat_sac` của dữ liệu cũ CÓ THỂ LỚN HƠN `han_ngach_xuat_sac`** — quy trình cũ
không có hạn ngạch nào. Đây là sự thật lịch sử, không phải lỗi dữ liệu; hạn ngạch chỉ áp
cho gói đóng mới.

**Gói cũ KHÔNG có dòng nào trong `to_trinh_kpi_khoa_nhom`** (đợt tách 3 nhóm cố ý không
backfill). FE gặp danh sách nhóm rỗng thì fallback về các cột phẳng trên bảng cha;
`to_trinh_kpi_khoa.so_nguoi_muc3` NULL chính là dấu hiệu nhận biết "gói legacy". Đây cũng là
lý do `chk_ttkkn_so_dat CHECK (so_dat <= han_ngach)` an toàn: dữ liệu vi phạm bất biến
không bao giờ vào được bảng con.

⚠ **`phieu_danh_gia.nhom_xep_hang` trên dòng cũ là TÁI DỰNG, không phải snapshot.** Script
di trú suy nó từ bộ chức vụ **hiện tại**, trong khi `hang_trong_khoa` nằm cạnh vẫn mang
nghĩa CŨ (thứ hạng trong toàn bộ giảng viên, theo mẫu số cũ). Hai cột này **lệch nhau về
bản chất** trên dữ liệu legacy — đừng đọc ra "người này xếp thứ N trong nhóm X" từ gói cũ.

### 8.5. `lich_su_to_trinh_kpi_khoa`

`hanh_dong`: 1 Đóng gói · 2 Trình HT · 3 HT duyệt gói · 4 HT trả về · 5 Mở lại gói ·
**6 Tự động hoàn tất** (đóng gói xong mà đơn vị không có hồ sơ lãnh đạo nào ⇒ gói đi thẳng
sang trạng thái 4, không qua HT).
`ly_do` bắt buộc (ở tầng API) khi `hanh_dong IN (4, 5)`. `so_ho_so_tra_ve` chỉ có nghĩa
khi `hanh_dong = 4`.

`chk_lsttkk_hd` đã được nới từ `IN (1,2,3,4,5)` lên `IN (1,2,3,4,5,6)` để nhận giá trị mới.

### 8.6. `to_trinh_kpi_khoa_nhom` — hạn ngạch theo nhóm

Bảng cha chỉ có **một** bộ cột hạn ngạch nhưng luật mới cần **ba**. Dùng bảng con thay vì
nới rộng bảng cha thêm 9+ cột: `GROUP BY` chỉ sinh dòng cho nhóm **thực sự tồn tại**, nên
Phòng ra `{2,3}` và Khoa không có quản lý ra `{1,2}` — không có dòng rỗng giả.

| Cột | Nghĩa |
|---|---|
| `id_to_trinh` | FK → `to_trinh_kpi_khoa`, **ON DELETE CASCADE** |
| `nhom` | 1 Giảng viên · 2 Viên chức/NLĐ · 3 Cán bộ quản lý |
| `so_nguoi` | Tổng đầu người trong nhóm |
| `so_nguoi_muc3` | Số người `xep_loai_khoa = 3` |
| **`so_mau_so`** | **Mẫu số thực dùng** — nhóm 1/2 = `so_nguoi_muc3`; nhóm 3 = `so_nguoi` (gói đóng trước 2026-10-01: nhóm 2 = `so_nguoi`) |
| `so_du_dieu_kien` | Số người đủ điều kiện mức 4 trong **toàn** nhóm (không chỉ trong Top) |
| `han_ngach` | `MAX(1, FLOOR(so_mau_so × ty_le))`, hoặc 0 khi `so_mau_so = 0` |
| `so_dat` | Thực tế đạt mức 4 — **có thể < `han_ngach`** |

FE **phải** đọc `so_mau_so`, KHÔNG được tự suy mẫu số từ `so_nguoi_muc3` hay `so_nguoi`
(mẫu số khác nhau giữa các nhóm và đã đổi luật theo thời gian — xem §8.2 điểm 1).

`chk_ttkkn_so_dat CHECK (so_dat <= han_ngach)` — dưới luật "cắt Top rồi lọc xuống" đây là
bất biến đúng theo cấu trúc, khác hẳn luật cũ (lấp đầy suất). An toàn vì bảng này không
backfill dữ liệu di trú (§8.4).

**Ba thay đổi của đợt này** — trước đây phân kỳ khỏi `schema.sql`, **nay đã được đồng bộ
vào file đó**:

| Đối tượng | Kiểu |
|---|---|
| `to_trinh_kpi_khoa_nhom` | bảng mới (mục 8.1b trong `schema.sql`) |
| `to_trinh_kpi_khoa.so_nguoi_muc3 INT NULL` | cột thêm qua `ALTER` + `chk_ttkk_so_muc3` |
| `phieu_danh_gia.nhom_xep_hang TINYINT NULL` | cột thêm qua `ALTER` + `chk_pdg_nhom_xep_hang` |

`to_trinh_kpi_khoa.so_giang_vien` **giữ nguyên nhưng ĐỔI Ý NGHĨA**: từ nay chỉ là headcount
hiển thị (`COUNT(loai_doi_tuong = 1)`), **không còn là mẫu số**. `so_nguoi_muc3` trên bảng
cha chỉ là số liệu tổng hợp tham khảo; `han_ngach_xuat_sac` / `so_dat_xuat_sac` là roll-up
`SUM` của ba nhóm.

### 8.7. Xét chọn xuất sắc CẤP TRƯỜNG cho viên chức Khoa (đợt 2026-10-01)

**Chốt với người dùng:** viên chức / NLĐ ở **Khoa** không còn tranh hạn ngạch 20% trong Khoa
mình. Trưởng khoa chốt tối đa mức 3; những người được chốt **mức 3 (Hoàn thành tốt = đủ điều
kiện lên xuất sắc)** của **tất cả các Khoa** được gom thành một danh sách xếp theo tổng điểm
tích lũy giảm dần, **Hiệu trưởng hoặc ADMIN tự chốt** ai đạt mức 4. **Không hạn ngạch, không gợi
ý.** Giảng viên, cán bộ quản lý và viên chức Phòng / Trung tâm **giữ nguyên** §8.2.

```
1 Tự đánh giá  →  2 Đơn vị phụ trách thẩm định từng tiêu chí  →  3 TK chốt hồ sơ (≤ mức 3)
   →  4 TK đóng gói tờ trình:  mức 1/2 → HOÀN TẤT (5)  ·  mức 3 → Ở LẠI 4 "chờ HT xét"
   →  5 HT / ADMIN chốt danh sách toàn trường:  được chọn → 4  ·  còn lại → 3  ·  tất cả → 5
```

**Hai tập phiếu, khai báo ở MỘT nơi** — inline TVF `dbo.fn_phieu_vc_khoa_xet_truong(@id_nam)`:

| Tập | Điều kiện | Dùng cho |
|---|---|---|
| Viên chức Khoa (mọi dòng hàm trả) | phiếu năm, chưa xoá, `loai_doi_tuong = 2`, `ma_don_vi LIKE 'K[_]%'`, `id_chuc_vu` ∉ `fn_chuc_vu_can_ht_duyet()` — đúng "nhóm 2 tại Khoa" | loại khỏi hạn ngạch Khoa; điều kiện 100%; chặn chỉ định ưu tiên |
| Ứng viên (`la_ung_vien = 1`) | thêm `trang_thai IN (4,5)` và `xep_loai_khoa = 3` | giữ ở trạng thái 4; danh sách HT; phạm vi ghi khi chốt; loại khỏi HT duyệt gói |

**Không có cột cờ mới trên `phieu_danh_gia`.** Lựa chọn của HT **chính là** `xep_loai = 4` trên
ứng viên ở trạng thái 5. `sp_phieu_truong_mo_lai` vốn xoá `xep_loai` / `xep_loai_khoa` nên mở
lại phiếu tự huỷ lựa chọn; phiếu phải qua TK chốt lại rồi HT chốt lại.

**Bảng `xet_xuat_sac_vien_chuc_khoa`** (`schema.sql` mục 8.5; tạo ở `update_database.sql` đợt này)
— 1 dòng / năm, giữ **lần chốt gần nhất**:

| Cột | Nghĩa |
|---|---|
| `id_nam` | PK, FK → `nam_danh_gia` |
| `lan_chot` | Số lần đã chốt (≥ 1) |
| `so_ung_vien`, `so_xuat_sac` | **Snapshot lúc chốt** — số hiện tại đọc qua `sp_xet_xuat_sac_vc_khoa_get` |
| `id_nguoi_chot`, `ngay_chot`, `ghi_chu` | Người / lúc / ghi chú lần chốt gần nhất |
| `row_version` | Chống ghi đè: từ lần chốt thứ hai **bắt buộc** gửi row_version của lần đọc |

Vết từng phiếu nằm ở `lich_su_trang_thai_phieu` (`hanh_dong = 4`, `cap_thuc_hien = 3`), cho
mọi ứng viên vừa 4→5 **và** mọi ứng viên đã 5 bị đổi mức; ứng viên 4→5 còn có snapshot
`lich_su_cham_diem` (cap 3, hanh_dong 3) — đối xứng `sp_to_trinh_khoa_ht_duyet`.

**Luật của `sp_xet_xuat_sac_vc_khoa_chot`** (thứ tự kiểm = thứ tự mã lỗi):

| Mã lỗi | Khi nào |
|---|---|
| `FORBIDDEN` | không phải HT / ADMIN (luôn kiểm, không có nhánh bỏ qua) |
| `NOT_FOUND` / `NAM_DA_DONG` | năm không tồn tại / `nam_danh_gia.trang_thai = 3` |
| `CONCURRENCY_CONFLICT` | đã có header mà `row_version` NULL / lệch (RAISERROR ngoài transaction, hoặc dòng lỗi cùng mã khi đọc lại có khoá trong transaction) |
| `CHUA_DU_HO_SO` | còn viên chức Khoa ở trạng thái 1–3 (**chốt với người dùng: chỉ chốt khi 100% đã được TK duyệt** — phiếu chưa duyệt vẫn có thể thành ứng viên). RS2 liệt kê ai đang chặn |
| `KHONG_CO_UNG_VIEN` | không ai được chốt mức 3 |
| `HO_SO_KHONG_HOP_LE` | id gửi lên không phải ứng viên; RS2 kèm `ly_do` |

Danh sách **rỗng là hợp lệ** (không ai xuất sắc). Chốt được **nhiều lần** — mỗi lần tính lại
**toàn bộ** ứng viên, nên ứng viên mới được TK duyệt sau lần chốt trước (đang ở 4) chỉ cần HT
chốt lại. Viên chức mức 1/2 không bao giờ bị SP này chạm tới.

**Thay đổi ở các SP tờ trình:**

| SP | Thay đổi |
|---|---|
| `sp_to_trinh_khoa_dong_goi` | Viên chức Khoa vẫn được xếp `hang_trong_khoa` trong nhóm 2, nhưng `@nhom` **không** sinh dòng nhóm 2 cho họ ⇒ Khoa không còn hạn ngạch / DONG_HANG / dòng `to_trinh_kpi_khoa_nhom` nhóm 2. Ứng viên **ở lại 4**, không tính vào `so_ho_so_cho_ht`; ứng viên **đã được HT chốt (5) giữ nguyên `xep_loai`** khi đóng gói lại. RS1 thêm `so_ho_so_cho_xet_truong` |
| `sp_to_trinh_khoa_get_detail` | CTE `live` loại viên chức Khoa (khớp `@nhom`); RS2 thêm `xet_xuat_sac_cap_truong`, `cho_xet_xuat_sac_truong` |
| `sp_to_trinh_khoa_ht_duyet` | HT duyệt gói **không** hoàn tất ứng viên |
| `sp_to_trinh_khoa_ht_tra_lai` | ứng viên → `HO_SO_KHONG_HOP_LE` |
| `sp_to_trinh_khoa_trinh` | đếm hồ sơ lãnh đạo loại ứng viên |
| `sp_phieu_khoa_uu_tien_xuat_sac` | viên chức Khoa → 409 `XET_XUAT_SAC_CAP_TRUONG` |

> ⚠ **Bất biến 3 và 4 ở §4 đổi theo:** mức 4 nay có **hai** đường ghi (`sp_to_trinh_khoa_dong_goi`
> cho mọi nhóm trừ viên chức Khoa; `sp_xet_xuat_sac_vc_khoa_chot` cho viên chức Khoa). Phiếu ở
> trạng thái 4 sau đóng gói ⟹ `can_ht_duyet = 1` **hoặc** là ứng viên cấp Trường.

> ⚠ **Gói Khoa đã HT duyệt thật (4, `id_nguoi_duyet` NOT NULL) hoặc đang trình (3)** thì TK không
> trả thẩm định được ứng viên đang chờ HT xét — hành vi cũ của `sp_chi_tiet_khoa_tra_tham_dinh`,
> không đổi. HT xử lý bằng cách chốt (mức 3) rồi mở lại phiếu nếu cần.
>
> ⚠ **Luật 100% có thể bị một phiếu kẹt chặn cả trường.** Phiếu viên chức bỏ ở Nháp, hoặc
> phiếu nộp muộn ở Khoa có gói đã được HT duyệt thật (TK chốt sẽ gặp `TO_TRINH_DA_TRINH`, và
> chưa có SP mở lại gói), sẽ giữ `CHUA_DU_HO_SO` cho toàn trường. RS4 của
> `sp_xet_xuat_sac_vc_khoa_get` chỉ đúng phiếu đang chặn; xử lý bằng soft-delete phiếu của người
> không thuộc diện đánh giá. Đây là hệ quả trực tiếp của quyết định "chỉ chốt khi 100%".

**Dữ liệu cũ — cố ý không migrate.** Ứng viên của gói Khoa đóng trước đợt này đang ở 5, một số
mang mức 4 của hạn ngạch Khoa cũ. Họ vẫn là ứng viên nên hiện trong danh sách HT; lần HT chốt
**đầu tiên** tính lại mức 3/4 cho toàn bộ. Trước đó `xep_loai` cũ giữ nguyên (kể cả khi TK đóng
gói lại). Snapshot nhóm 2 của gói cũ khiến vế hiện tại lệch vế snapshot ⇒ FE báo "cần đóng gói
lại" — **đúng**.


---

## 9. KÊ KHAI GIỜ QUY ĐỔI THEO PHỤ LỤC II — ĐÃ GỠ (2026-09-30)

> ⛔ **MODULE ĐÃ GỠ TOÀN BỘ (2026-09-30, chốt với người dùng — dữ liệu kê khai chỉ là test).**
> Đã xoá: route `api/ke-khai-gio-quy-doi/*` và `api/cong-viec-quy-doi/*`; Controller / BLL / DAL /
> Model của module; 17 SP / hàm (`fn_ke_khai_gio_quy_doi_quyen`, `sp_danh_muc_cong_viec_quy_doi_*`,
> `sp_ke_khai_gio_quy_doi_*`, `sp_minh_chung_ke_khai_gio_*`) cùng `fn_gio_giang_ke_khai_dong`;
> **5 bảng** `danh_muc_cong_viec_quy_doi`, `ke_khai_gio_quy_doi`, `chi_tiet_ke_khai_gio_quy_doi`,
> `minh_chung_ke_khai_gio_quy_doi`, `lich_su_ke_khai_gio_quy_doi`; 2 TVP `ChiTietKeKhaiGioQuyDoiRow`,
> `DuyetChiTietKeKhaiRow`. Migration: `update_database.sql` đợt "Gỡ kê khai giờ quy đổi".
>
> **Giờ giảng (mục 13) chỉ còn nguồn file TKB** — không còn cộng giờ kê khai.
>
> `schema.sql` đã bỏ khối mục 9 (chỉ còn ghi chú "đã gỡ").
> Phần dưới đây **giữ lại làm tài liệu thiết kế**, vì mục 11 (kê khai thành tích) nhân bản kiến
> trúc này và tham chiếu tới 9.2 / 9.3 / 9.4. Không có gì bên dưới còn chạy.

"Quy đổi các hoạt động chuyên môn ra giờ chuẩn giảng dạy". Giảng viên **tự kê khai** số
lượng từng đầu việc; Trưởng khoa/Trưởng khoa liên/Trưởng phòng **chốt hoặc trả về từng
dòng** và **được sửa số lượng** khi chốt.

> **Đổi thiết kế (đợt "duyệt theo dòng"):** vòng đời chuyển từ BẢN KÊ xuống TỪNG DÒNG.
> Không còn bước "nộp": giảng viên kê tới đâu người duyệt thấy tới đó. Bốn SP
> `sp_ke_khai_gio_quy_doi_nop` / `_huy_nop` / `_chot` / `_tra_lai` **đã bị gỡ** cùng các
> endpoint tương ứng. Lý do và chi tiết migration: `App_Data/update_database.sql`.

### 9.0. Vì sao có module này — và phạm vi CHƯA làm

"Thời gian thực hiện" của giảng viên trong năm có **hai** nguồn:

1. **Tiết giảng dạy quy đổi theo từng loại** — **ĐÃ LÀM**, xem mục 13
   (`gio_giang_tkb`, nhập từ file Excel thời khoá biểu). Lúc viết mục 9 này nguồn (1)
   chưa có nên bên dưới còn ghi "chưa làm"; nay đã có.
2. **Hoạt động chuyên môn theo PHỤ LỤC II** — chính là module này.

Module này **CỐ Ý không ghi vào `gio_thuc_hien_gv`** và **không sửa
`sp_phieu_tong_hop_tu_dong`** — quyết định vẫn giữ nguyên sau khi có nguồn (1), vì ghi tự
động sẽ đè số liệu nhập tay. Nó chỉ lưu và phát API đọc. Điểm nối là
`sp_ke_khai_gio_quy_doi_tong_hop` (`GET api/ke-khai-gio-quy-doi/tong-hop`) — trả tổng giờ
đã chốt / GV / năm, tách sẵn theo hai mục cấp 1 (Sau đại học / Đại học).

**Điều kiện cộng giờ**: cả `sp_ke_khai_gio_quy_doi_tong_hop` lẫn `sp_gio_giang_tkb_tong_hop`
cộng theo **`chi_tiet.trang_thai_dong = 2`** (dòng đã chốt), **KHÔNG** đòi cả bản kê ở một
trạng thái nào. Trước đợt đổi thiết kế chúng đòi `k.trang_thai = 3`, nên một bản kê đã có
dòng được duyệt nhưng chưa chốt cả bản thì bị tính 0 giờ.

Nơi **cộng hai nguồn** lại là `sp_gio_giang_tkb_tong_hop`
(`GET api/gio-giang-tkb/tong-hop`): giờ TKB + giờ kê khai đã duyệt = **tổng giờ giảng
trong năm**.

Khác với cách nhập staging phẳng trước đây (chỉ khớp theo `ho_ten`, không có `id_nam`,
không có trạng thái duyệt), nhóm bảng này có đủ cả ba.

### 9.1. `danh_muc_cong_viec_quy_doi` — cây, độ sâu KHÔNG đều

Dùng cây tự tham chiếu (giống `nhom_tieu_chi`) vì lá nằm ở các cấp khác nhau:

| Cấp của lá | Ví dụ |
|---|---|
| 2 | `Hướng dẫn đề án môn học` = 2,0/sinh viên |
| 3 | `Hoàn thành đề cương chi tiết` = 10/học viên |
| 4 | `Chủ tịch` (trong *Bảo vệ đề cương LV cao học*) = 2,0/đề cương |

Chỉ nút `la_la = 1` mới kê khai được. Nút gộp bắt buộc `he_so_quy_doi IS NULL`
(`chk_dmcvqd_la`).

**Cách đọc hệ số** — `giờ = ROUND(so_luong × he_so_quy_doi / so_luong_mau, 2)`:

| Chuỗi trong QĐ | `he_so_quy_doi` | `so_luong_mau` | `don_vi_tinh` |
|---|---|---|---|
| `10/học viên` | 10,000 | 1 | học viên |
| `2,5/LV(ĐA)` | 2,500 | 1 | LV(ĐA) |
| `1,0/10 bài` | 1,000 | 10 | bài |
| `1,0/5 sinh viên` | 1,000 | 5 | sinh viên |
| `45/lớp/năm` | 45,000 | 1 | lớp/năm |

Giảng viên nhập **số lượng theo đơn vị tính** (số bài, số học viên, số bộ đề), **không bao
giờ nhập giờ**. Chuỗi gốc giữ nguyên ở `ghi_chu_quy_doi` để FE hiển thị đúng văn bản QĐ.

Seed: **74 dòng** = 2 mục cấp 1 + 20 nút gộp + **52 đầu việc kê khai được**
(36 ở *Giảng dạy sau đại học*, 16 ở *Giảng dạy đại học*).

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
còn `ky_hoc` chỉ để người dùng đối chiếu công việc thuộc kỳ nào. Có thể NULL.

### 9.3. Vòng đời nằm ở DÒNG, không ở bản kê

`chi_tiet.trang_thai_dong` là state machine thật của module:

```
        ┌──────────── GV sửa dòng ────────────┐
        v                                     │
1 CHO_DUYET ──chốt──> 2 DA_CHOT ──mở lại──> 3 TRA_VE
                          ^  (người duyệt)       │
                          └──── chốt ────────────┘
```

- **1 Chờ duyệt** — GV sửa/xoá được; người duyệt phải xét.
- **2 Đã chốt** — khoá với GV (`DONG_DA_CHOT` nếu cố sửa; vắng mặt trong form cũng KHÔNG bị
  xoá). Người có `can_duyet` vẫn xét lại được → nhật ký `hanh_dong = 10`.
- **3 Trả về** — bắt buộc kèm lý do (`THIEU_LY_DO` nếu thiếu). `gio_duyet = 0` nhưng **vẫn
  giữ** `so_luong`/`so_luong_duyet` để đối chiếu. GV sửa dòng → **tự quay về 1**, đồng thời
  xoá `so_luong_duyet`/`gio_duyet`/`nhan_xet_duyet`.
  Reset chỉ xảy ra khi dòng **thật sự đổi** (`id_cong_viec`/`so_luong`/`ky_hoc`/`mo_ta`) —
  lưu cả form không được làm mất nhận xét trên dòng GV chưa đụng tới.

`ke_khai_gio_quy_doi.trang_thai` giờ là **nhãn DẪN XUẤT**, tính lại bởi
`sp_ke_khai_gio_quy_doi_rollup` sau mỗi lần lưu/xét — không phải khoá, không ai set tay:

| Giá trị | Khi nào |
|---|---|
| 4 TRA_LAI | còn dòng trạng thái 3 (ưu tiên cao nhất — GV còn việc phải sửa) |
| 2 CHO_DUYET | còn dòng trạng thái 1 |
| 3 DA_DUYET | có dòng và **tất cả** đã chốt |
| 1 NHAP | không còn dòng sống nào |

`rollup` cũng là nơi duy nhất tính `tong_gio_ke_khai` (SUM các dòng còn sống) và
`tong_gio_duyet` (SUM `gio_duyet` **chỉ các dòng trạng thái 2**).

**Lazy-create**: `sp_ke_khai_gio_quy_doi_get` **KHÔNG** tạo bản kê nữa — chưa có thì phát
header ảo `id_ke_khai = 0`. Header chỉ sinh ra trong `sp_ke_khai_gio_quy_doi_luu_chi_tiet`,
khi có dòng đầu tiên. Trước đây SP `_get` INSERT ngay khi ĐỌC, mà gate của nó là `can_xem`
chứ không phải `can_sua`, nên **Trưởng khoa mở bản kê của một GV cũng sinh ra bản kê rỗng
cho người đó**.

Các cột header thành vết tích, giữ lại nhưng không còn nghĩa nghiệp vụ: `ngay_nop` (không ai
ghi nữa), `nhan_xet_duyet` (lý do trả về nằm ở từng dòng), `row_version`.
`id_nguoi_duyet`/`ngay_duyet` = người và thời điểm xét **gần nhất**, chỉ để hiển thị.

### 9.4. Phân quyền — `fn_ke_khai_gio_quy_doi_quyen`

Nguồn duy nhất, fail-closed (chức vụ không rõ ⇒ 0 hết):

| Cờ | Ai |
|---|---|
| `can_sua` | **chỉ chính chủ** bản kê |
| `can_duyet` | `ADMIN`, `HT`, hoặc `TK`/`TKL`/`TP` trong phạm vi đơn vị (đơn vị mình + đơn vị con) |
| `can_xem` | chính chủ ∪ `can_duyet` |

`TLGVK` **cố ý bị loại** khỏi duyệt — duyệt là thẩm quyền của trưởng đơn vị (giống
`fn_nhiem_vu_khoa_quyen`).

**Trưởng đơn vị tự duyệt bản kê của chính mình là HỢP LỆ** — nếu chặn thì không ai duyệt
được bản kê của Trưởng khoa. `HT` duyệt được toàn trường nên vẫn còn đường duyệt chéo nếu
đơn vị muốn.

### 9.5. Ràng buộc CỐ Ý KHÔNG có

Người dùng đã chốt bỏ, ghi lại để đợt sau đừng "sửa nhầm" thành có:

- **Không** khoá theo hạn tự đánh giá (`nam_danh_gia.ngay_dong_tu_danh_gia` / `gia_han_danh_gia`).
- **Không** bắt buộc minh chứng — `minh_chung_ke_khai_gio_quy_doi` là tuỳ chọn. Gate thêm/gỡ
  minh chứng theo **dòng** (`trang_thai_dong = 2` thì khoá), không theo trạng thái header.
- **Không** có trần tổng giờ quy đổi (khác nhiệm vụ Khoa, vốn có trần 20 điểm).
- **Không** có điểm khoá cuối năm: bản kê không bao giờ bị khoá cứng cả năm. Đây chính là
  lỗi của thiết kế cũ — chốt sớm ở kỳ 261 là GV mất quyền kê khai cho phần còn lại của năm,
  kể cả ADMIN cũng không mở lại được.
- **Không** migrate dữ liệu dòng cũ: `trang_thai_dong = 3` trước đây nghĩa là "Từ chối", từ
  nay đọc là "Trả về". Cùng hệ quả `gio_duyet = 0`, khác ở chỗ GV sửa được. CHECK
  `chk_ctkkgqd_tt_dong` giữ nguyên `(1,2,3)`.

### 9.6. Hợp đồng result set + xung đột phiên bản

Mọi SP của module theo hợp đồng của `nhiem_vu_khoa`: `RS1 = success / message / error_code`,
`RS2..` chỉ phát khi `success = 1`.

Module này **CỐ Ý không dùng `RAISERROR`** (khác luồng phiếu): mọi lỗi về như một
`error_code` ở RS1, để tầng DAL chỉ phải đọc một định dạng. Mã lỗi riêng của đợt duyệt theo
dòng: **`DONG_DA_CHOT`** (sửa/gỡ minh chứng của dòng đã chốt) và **`THIEU_LY_DO`** (trả về
mà không ghi lý do).

Kiểm tra `@row_version` không còn: 4 SP dùng nó đã bị gỡ. Chống ghi đè giờ dựa vào chính
trạng thái dòng — hai người cùng đụng một dòng thì người sau nhận `DONG_DA_CHOT` hoặc thấy
dòng đã quay về `1` sau khi GV sửa.

Mọi SP thao tác bản kê kết thúc bằng `sp_ke_khai_gio_quy_doi_result_sets` (header / dòng /
minh chứng) nên mọi endpoint trả về **cùng một hình dạng dữ liệu** — kể cả khi bản kê chưa
tồn tại, lúc đó RS header là bản ảo `id_ke_khai = 0` và hai RS còn lại rỗng.
RS dòng có sẵn `cho_phep_sua` / `cho_phep_xet` để FE không phải tự suy theo trạng thái.

### 9.7. `lich_su_ke_khai_gio_quy_doi`

`hanh_dong`: 1 Tạo dòng · 2 Sửa dòng · 3 Xoá dòng · **5 Chốt dòng** · **6 Trả về dòng** ·
**10 Mở lại dòng đã chốt**.

4 (Nộp) · 7 (Chốt bản kê) · 8 (Trả lại) · 9 (Huỷ nộp) **không còn được sinh ra** nhưng vẫn
nằm trong `chk_lskkgqd_hd`: các dòng lịch sử CŨ mang những giá trị đó, bỏ khỏi CHECK là
không ALTER được bảng.

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

| Index | Ý nghĩa |
|---|---|
| `ux_nvcv_chinh (id_nhan_vien) WHERE la_chinh = 1 AND den_ngay IS NULL` | Tối đa **1 đơn vị chính đang hiệu lực** / người |
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
  *(Đợt 4 đã bỏ hẳn 2 cột này — xem mục 10.8.)*
- 74 đối tượng SQL nhận `@current_user_don_vi` **chưa bị đụng tới**.
- Backfill sinh cho mỗi `nhan_vien` có `trang_thai = 1` đúng 1 dòng `la_chinh = 1` copy nguyên
  `(id_don_vi, id_chuc_vu)` từ 2 cột hiện có, `tu_ngay = '2020-01-01'`. Nếu người đó đã có
  sẵn một dòng hiệu lực khớp đúng cặp đó thì **nâng dòng cũ** thay vì chèn dòng mới.
- `GET /api/auth/me` trả thêm mảng `DonVi[]` (đơn vị chính đứng đầu). **JWT không đổi.**
- `sp_auth_register` **chưa** sinh dòng `nhan_vien_chuc_vu` — việc đó thuộc Đợt 4. Người mới
  đăng ký sẽ có `DonVi[]` rỗng cho đến khi Admin thêm dòng hoặc Đợt 4 chạy; mọi chức năng
  khác vẫn chạy vì còn 2 cột denormalized.
  *(Đợt 4 đã sửa — `sp_auth_register` nay sinh đúng 1 dòng `la_chinh = 1`.)*

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

| Hàm | Vai trò |
|---|---|
| `fn_pham_vi_don_vi(@id_nguoi, @chuc_vu_jwt, @don_vi_jwt)` | Bảng mọi cặp **(đơn vị, chức vụ)** đang hiệu lực, **đã bung sẵn cây đơn vị cấp dưới**. Cột: `id_don_vi`, `id_chuc_vu`, `ma_chuc_vu`, `la_chinh`, `la_goc` |
| `fn_co_quyen_don_vi(..., @id_don_vi_dich, @nhom)` | Gate 1 dòng cho các kiểm tra vô hướng. `@nhom` ∈ `DUYET` / `NHAP` / `XEM`; fail-closed |

`la_goc = 1` là đơn vị người đó **trực tiếp** thuộc, `0` là đơn vị con bung ra từ cây — cần để
phân biệt "trưởng đơn vị" với "trưởng cấp trên".

**Nhánh tương thích ngược (bắt buộc):** cặp trong JWT **luôn** có mặt trong kết quả, kể cả khi
người đó chưa có dòng `nhan_vien_chuc_vu` nào hoặc caller chưa truyền `@current_user_id`. Nhờ
vậy người **không** kiêm nhiệm cho kết quả **y hệt trước Đợt 2**.

`sp_nhan_vien_pham_vi_don_vi` là vỏ bọc của hàm thứ nhất cho tầng C#
(`NhanVienChucVuDal.GetPhamVi` → `List<PhamViDonViDto>`).

#### Bốn dạng điểm gate được viết lại

| | Dạng cũ | Dạng mới |
|---|---|---|
| **P1** | `id_don_vi = @cu_dv OR id_don_vi_cha = @cu_dv` (chỉ **1 cấp** con) | `id_don_vi IN (SELECT id_don_vi FROM @don_vi_truong)` |
| **P2** | CTE đệ quy tự viết (**toàn bộ** cây con) | như trên — hàm đã bung sẵn cây |
| **P3** | `tieu_chi_don_vi_cham pq WHERE pq.id_don_vi = @cu_dv` | `pq.id_don_vi IN (…)` — tập đơn vị người đó **làm trưởng** |
| **P4** | snapshot `id_don_vi_tham_dinh = @cu_dv` | ghi **đúng đơn vị đã cho quyền** trên dòng đó |

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

| Bước | Nội dung | Trạng thái |
|---|---|---|
| 1 | `fn_pham_vi_don_vi` + `fn_co_quyen_don_vi` + `sp_nhan_vien_pham_vi_don_vi` | Xong |
| 2 | `fn_nhiem_vu_khoa_quyen` + 16 SP module nhiệm vụ Khoa | Xong |
| 3 | `fn_ke_khai_gio_quy_doi_quyen` + module kê khai giờ quy đổi | Xong (module đã gỡ 2026-09-30) |
| 4 | View `v_giang_vien_khoa` → **1 dòng / (GV, Khoa)** + các consumer | Xong |
| 5 · module 1/6 | Vi phạm giảng dạy (15 SP) | Xong |
| 5 · module 2/6 | **Phiếu KPI cá nhân (16 SP)** + 2 SP hỗ trợ `sp_tieu_chi_don_vi_cham_check_*` | Xong |
| 5 · module 3/6 | **Phiếu đánh giá đơn vị (8 SP)** | Xong |
| 5 · module 4/6 | **Báo cáo (3 SP)** | Xong |
| 5 · module 5/6 | **Tờ trình KPI Khoa (4 SP)** | Xong |
| 5 · module 6/6 | **Phản hồi SV (2 SP)** | Xong |
| 6 | Bỏ 2 chỗ hardcode `N'P_QLCL'` | Xong |
| 7 | 16 SP còn đọc chức vụ như **một scalar JWT** (gate `ADMIN` / `HT`+`ADMIN`) | Xong |
| 8 | `NhanVienChucVuDal.GetPhamVi` + 5 chỗ so sánh đơn vị trực tiếp ở BLL | Xong |

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

| Vai trò | Được làm gì |
|---|---|
| `TKK` / `TKP` | tạo phiếu, tổng hợp KPI, nhập điểm, gửi (1 → 2) |
| `TK` / `TKL` / `TP` | chấm điểm duyệt + duyệt cấp đơn vị (2 → 3) |
| `HT` / `ADMIN` | xem tất cả; duyệt trường (3 → 4), chốt (4 → 5), mở lại |

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
  (Cả 4 được **bước 7** xử lý riêng: vai trò toàn hệ thống vẫn phải đọc từ *tập* chức vụ
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

| SP | Ai đọc được |
|---|---|
| `sp_to_trinh_khoa_get_paged` | **mọi người** thuộc đơn vị (không lọc chức vụ; BLL cũng không gate) |
| `sp_to_trinh_khoa_get_detail` | chỉ `TK`/`TKL`/`TP` của đúng đơn vị (+ `HT`/`ADMIN`) |

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
phạm vi Đợt 2. *(Đợt "Cơ cấu đơn vị 2026": `P_QLCL` gộp vào `P_DTBDCL`, hằng số đổi thành `N'P_DTBDCL'` — xem §1.1.)*

Chữ ký chỉ đổi ở `_get_chi_tiet` (`+@current_user_id INT = NULL`). `_chot` không đổi — nó
đã có `@id_nguoi_chot` vốn luôn bằng `currentUserId`. `DiemTbPhanHoiSinhVienService`
không có gate vai trò nào để bỏ.

#### Bước 7 — vai trò **cấp Trường** cũng phải đọc từ *tập*, không từ claim JWT

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

Đây là thay đổi **cộng thêm**: chỉ chạy khi cặp JWT *chưa* đủ quyền, và chỉ nhận được giá
trị nằm trong chính danh sách chức vụ mà gate cho phép. Không có đường nào cấp thêm quyền
cho người không có dòng tương ứng trong bảng.

> **Vì sao `@don_vi_jwt = NULL` ở đây.** `ADMIN`/`HT` là vai trò cấp Trường — đơn vị
> **không tham gia** phép kiểm (`fn_co_quyen_don_vi` cũng trả 1 cho `ADMIN` ở mọi đơn vị).
> Nhánh tương thích ngược của `fn_pham_vi_don_vi` không cần dùng, vì cặp JWT đã được câu
> `SELECT` scalar ở trên xử lý rồi. Đây **không phải** chỗ “tách đơn vị khỏi chức vụ”: mọi
> gate theo đơn vị (`TK`/`TKL`/`TP`/`TLGVK`) vẫn đối chiếu hai vế **trên cùng một dòng**.

**Chữ ký:** 8 SP thêm `@current_user_id INT = NULL` (có `DEFAULT` nên caller cũ không gãy);
8 SP còn lại không đổi vì đã có sẵn tham số người thực hiện.

| Thêm `@current_user_id` | Dùng tham số có sẵn |
|---|---|
| `sp_loai_vi_pham_create` · `_update` · `_delete` · `_don_vi_ghi_nhan_set` | `sp_chi_tiet_dv_update_diem_truong` → `@id_nguoi_dg_truong` |
| `sp_gia_han_list` | `sp_phieu_dv_truong_duyet` → `@id_nguoi_duyet` |
| `sp_danh_muc_cong_viec_quy_doi_create` · `_update` · `_delete` | `sp_phieu_dv_chot` → `@id_nguoi_chot` |
| | `sp_phieu_dv_mo_lai` → `@id_nguoi_mo_lai` |
| | `sp_gia_han_upsert` · `_delete` → `@current_user_id` (đã có) |
| | `sp_to_trinh_khoa_ht_duyet` · `_ht_tra_lai` → `@id_nguoi_thuc_hien` |

**Tầng C#** — 3 chuỗi DAL/BLL/Controller cho 8 SP đổi chữ ký: `LoaiViPham*`, `GiaHan*`,
`CongViecQuyDoi*`. Ba Controller **vốn đã** lấy `currentUserId` ra rồi bỏ đi, nay truyền
tiếp. Gate `ADMIN` ở tầng BLL (`LoaiViPhamService.EnsureAdmin` và
`CongViecQuyDoiService.CheckAdmin`) **phải nâng theo cùng một cách**, nếu không BLL vẫn trả
403 *trước* khi chạm tới SP. `GiaHanService` không có gate BLL — SP là lớp duy nhất.

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

| Việc | Trạng thái |
|---|---|
| `uq_phieu_unique` → `(id_nam, id_nhan_vien, id_don_vi)` | Xong |
| `sp_phieu_danh_gia_create` + `@id_don_vi INT = NULL` | Xong |
| Guard chống cộng trùng điểm tự động (2 SP) | Xong |
| `sp_to_trinh_khoa_dong_goi` | Không sửa **ở Đợt 3**. Sau đó đã viết lại toàn bộ ở đợt tách 3 nhóm — xem §8.2 |
| C#: `PhieuDanhGiaCreateRequest.IdDonVi` + DAL + BLL | Xong |

Chi tiết ngữ nghĩa (khoá duy nhất, cách suy `loai_doi_tuong`, luật xếp loại viên chức,
quy tắc chọn phiếu nhận điểm tự động) nằm ở **mục 4.1** — chỗ đó là nguồn duy nhất, đừng
chép lại ở đây. Lưu ý luật "viên chức tối đa mức 2" mô tả ở Đợt 3 **đã hết hiệu lực**:
xem §4.1 và §8.2 cho luật hiện hành.

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
`gio_thuc_hien_gv`, `ke_khai_gio_quy_doi` (đã gỡ 2026-09-30), `diem_tb_phan_hoi_sinh_vien`. Chúng mô tả **con
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

| Đặc tính | Giá trị |
|---|---|
| Số dòng | **Đúng 1 / nhân viên** — `LEFT JOIN` chứ không `INNER JOIN` |
| Nguồn `id_don_vi` / `id_chuc_vu` | Dòng `nhan_vien_chuc_vu` có `la_chinh = 1 AND den_ngay IS NULL` |
| Vì sao không nhân dòng | Vị từ JOIN **trùng khít** với vị từ của `ux_nvcv_chinh` |
| Khi không có dòng `la_chinh` | 2 cột = `NULL` (người đó **không biến mất** khỏi danh sách) |

**Chỉ thay ở nơi thực sự cần 2 cột đó.** SP nào chỉ cần `ho_ten` / `email` vẫn đọc thẳng
`dbo.nhan_vien` — không thay đại trà.

#### Những chỗ **không** dùng view mà đọc thẳng bảng quan hệ

| SP | Vì sao |
|---|---|
| `sp_nhan_vien_get_list` | Bộ lọc `@id_don_vi` / `@ma_don_vi` / `@bao_gom_don_vi_con` phải thấy **mọi** đơn vị |
| `sp_don_vi_get_all` / `sp_don_vi_get_by_id` | `so_nguoi_dung` đếm theo quan hệ, có `DISTINCT` |
| `sp_don_vi_delete` / `sp_chuc_vu_delete` | Kiểm "đang được sử dụng" trên quan hệ |

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
*"Tai khoan chua duoc gan don vi chinh"*). Phát JWT với `id_don_vi` rỗng sẽ khiến mọi gate
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


---

## 11. KÊ KHAI THÀNH TÍCH VƯỢT TRỘI (Nhóm II — viên chức / NLĐ)

Bảng đánh giá KPI của viên chức/NLĐ có **"Nhóm các tiêu chí liên quan đến thành tích vượt
trội"**, trần **50 điểm**, gồm 4 tiêu chí:

| # | Tiêu chí | Trần | Đơn vị phụ trách |
|---|---|---:|---|
| 1 | Sáng kiến, cải tiến công việc được công nhận | 30 | Đơn vị quản lý trực tiếp + P.KHHTQT |
| 2 | Khen thưởng đột xuất | 15 | P.TCHC |
| 3 | Hoàn thành chương trình đào tạo, bồi dưỡng | 10 | Đơn vị quản lý trực tiếp |
| 4 | Tham gia / tổ chức chương trình, phong trào của Trường | 10 | Đơn vị quản lý trực tiếp + Đơn vị tổ chức |

> **Từ đợt "Sáng kiến" (2026-10-05, §19): tiêu chí 1 KHÔNG còn đi qua module này.** `TTVT_SANG_KIEN` đọc bảng
> `sang_kien` (đồng bộ NCKH + cờ cải tiến do trưởng đơn vị đánh dấu — §19.9); `sp_ke_khai_thanh_tich_luu_chi_tiet` chặn dòng loại 1 mới / đổi nội dung
> (`SANG_KIEN_DA_CHUYEN`); dòng cũ giữ trong DB nhưng không còn tính điểm. Các mô tả loại 1 bên dưới là lịch sử.

### 11.0. Vì sao có module này

Trước đó hệ thống **không có chỗ nào** để kê khai từng sáng kiến / quyết định khen thưởng /
khoá học / sự kiện. Viên chức chỉ **tự gõ một con số** vào `chi_tiet_danh_gia` rồi đính minh
chứng — không có danh mục quy đổi mức → điểm, không cộng dồn, không chặn trần tự động, và
không có luồng duyệt riêng cho từng đơn vị phụ trách.

Module này nhân bản kiến trúc của **mục 9 (kê khai giờ quy đổi)**: nhân viên kê khai **quanh
năm** ngay khi phát sinh (không chờ mở phiếu KPI), đơn vị phụ trách duyệt **từng dòng**, và
điểm đã duyệt **tự động chảy vào phiếu** qua 4 mã công thức `TTVT_*` của
`fn_nckh_diem_tu_dong`. Khác mục 9 ở chỗ này: mục 9 **cố ý dừng ở API đọc**, module này nối
thẳng vào chấm điểm.

### 11.1. `danh_muc_thanh_tich_vuot_troi` — cây 2 cấp

Nút gốc = tiêu chí (4 nút, mang `tran_diem` 30/15/10/10), nút lá = mức quy đổi (13 mức, mang
`diem_quy_doi`). Chỉ `la_la = 1` mới kê khai được.

Ba cột đáng chú ý:

- **`loai_thanh_tich` (1..4)** — khoá **1-1** với 4 mã công thức chấm tự động
  (`TTVT_SANG_KIEN` / `TTVT_KHEN_THUONG` / `TTVT_DAO_TAO` / `TTVT_PHONG_TRAO`). Thêm giá trị
  mới ở đây mà chưa thêm nhánh tương ứng trong `fn_nckh_diem_tu_dong` thì dòng kê khai sẽ
  không bao giờ thành điểm. Nút con **luôn kéo** `loai_thanh_tich` từ cha, không nhận từ client.
- **`tran_diem`** — chỉ có nghĩa ở **nút gốc**. Đây là con số **để hiển thị / cảnh báo**; trần
  THẬT SỰ khi chấm điểm là `tieu_chi_danh_gia.diem_toi_da`. **Hai chỗ phải đặt bằng nhau** —
  lệch nhau thì màn hình kê khai nói một con số, phiếu KPI ghi một con số khác.
- **`id_don_vi_duyet`** — hiện thực hoá cột *"Đơn vị phụ trách"* của bảng KPI.
  `NOT NULL` → chỉ TK/TKL/TP của **chính đơn vị đó** (và ADMIN/HT) duyệt được dòng ấy;
  `NULL` → rơi về trưởng đơn vị quản lý trực tiếp của nhân viên.
  Seed để **NULL hết** vì `id_don_vi` của P.TCHC / P.KHHTQT khác nhau trên từng bản triển khai
  — Admin gán bằng `PUT api/danh-muc-thanh-tich/{id}`, và phải gán **cho các mức lá**, không
  chỉ nút gốc, vì quyền đọc theo từng dòng.

`cho_phep_so_luong = 0` (khen thưởng): mỗi dòng luôn tính 1 đơn vị — mỗi quyết định khen là
một dòng riêng, không nhân hệ số. Server **ép** `so_luong = 1`, không tin client.

### 11.2 – 11.3. `ke_khai_thanh_tich_vuot_troi`, `chi_tiet_ke_khai_thanh_tich`

**VÒNG ĐỜI NẰM Ở TỪNG DÒNG, KHÔNG Ở BẢN KÊ.** Module này trước đây dùng mô hình *"nộp cả
bản kê"* (1 NHAP → 2 CHO_DUYET → 3 DA_DUYET, trả về 4 TRA_LAI) và **đã chuyển** sang xét
từng dòng, giống hệt đợt đã làm cho mục 9. Hai module lại đọc chéo được sang nhau.

Lý do đổi — đúng hai lỗi mà mục 9 từng mắc, cộng một lỗi riêng:

1. **Chốt xong là khoá cứng CẢ NĂM.** Trạng thái 3 là trạng thái cuối một chiều, mà header
   là 1 bản / người / **năm**. Chốt sớm ở quý 1 là nhân viên mất quyền kê khai cho toàn bộ
   phần còn lại của năm.
2. **Bản kê RỖNG vẫn được sinh ra.** `sp_ke_khai_thanh_tich_get` INSERT header ngay khi
   ĐỌC, mà gate là `can_xem` chứ không phải `can_sua` — trưởng đơn vị mở bản kê của một
   nhân viên là hệ thống tạo luôn bản kê rỗng cho người đó.
3. **Thiếu minh chứng chỉ lộ ra ở phút chót** — xem điểm 2 bên dưới.

Vòng đời thật nay nằm ở `chi_tiet.trang_thai_dong`:

| | Ý nghĩa |
|---|---|
| **1 CHO_DUYET** | Nhân viên sửa / gỡ được; đơn vị phụ trách phải xét. |
| **2 DA_CHOT** | Khoá với nhân viên: sửa → `DONG_DA_CHOT`, và **vắng mặt trong form cũng KHÔNG bị gỡ**. Người có `can_duyet` vẫn mở lại được → nhật ký `hanh_dong = 10`. |
| **3 TRA_VE** | Bắt buộc kèm lý do (`THIEU_LY_DO` nếu thiếu). Nhân viên sửa dòng thì nó **tự** quay về 1 và xoá sạch kết quả xét cũ — nhưng **chỉ khi dòng thật sự đổi**, mở form rồi bấm lưu mà không sửa gì thì không được âm thầm nuốt lý do trả về. |

Giá trị 3 trước đây đọc là *"Từ chối"*, nay đọc là *"Trả về"* — cùng cho `diem_duyet = 0`,
khác ở chỗ nhân viên sửa được. **KHÔNG migrate dữ liệu cũ.**

`ke_khai_thanh_tich_vuot_troi.trang_thai` tụt xuống thành **NHÃN DẪN XUẤT**, tính lại bởi
`sp_ke_khai_thanh_tich_rollup` sau mỗi lần lưu / xét, theo thứ tự ưu tiên `4 → 2 → 3 → 1`
(còn dòng trả về → còn dòng chờ duyệt → có dòng và tất cả đã chốt → không còn dòng nào).
Không ai set tay. `ngay_nop`, `nhan_xet_duyet`, `row_version` ở header thành **vết tích**:
giữ cột để không phá dữ liệu cũ, không SP nào ghi vào chúng nữa.

**LAZY-CREATE**: header chỉ được tạo trong `sp_ke_khai_thanh_tich_luu_chi_tiet` (dưới
`UPDLOCK, HOLDLOCK`), khi thật sự có dòng đầu tiên. `_get` phát header **ẢO** `id_ke_khai = 0`
với đủ 4 result set đúng hình dạng, nên tầng DAL không phải xử lý nhánh riêng.

Bốn SP `_nop`, `_huy_nop`, `_chot`, `_tra_lai` đã bị **gỡ hẳn**, cùng các route và action
tương ứng.

Ba điểm khác so với mục 9:

1. **Cột `quy` (1..4) trên từng DÒNG.** Header vẫn khoá theo **năm**; `quy` là quý phát sinh
   thành tích. Phiếu đánh giá theo quý nay **ĐÃ có** (mục 4.1) — nhưng cột này **vẫn chưa
   được nối vào chấm điểm**: `fn_nckh_diem_tu_dong` (nhánh `TTVT_*`) còn gom theo
   `(id_nhan_vien, id_nam)` và bỏ qua `quy`. Đợt bật chấm tự động nhóm B theo quý phải nối
   nó vào cùng commit, nếu không một thành tích bị đếm bốn lần. Xem mục 11.9.
2. **Minh chứng là BẮT BUỘC** với mức có `yeu_cau_minh_chung = 1` (toàn bộ 13 mức seed đều
   bắt buộc), và nay bị chặn **NGAY KHI LƯU** (`sp_ke_khai_thanh_tich_luu_chi_tiet`) chứ
   không dồn tới bước nộp — nhân viên biết mình thiếu file ngay lúc kê, không phải sau khi
   kê xong cả năm. Cả request bị từ chối với `THIEU_MINH_CHUNG` kèm **danh sách dòng còn
   thiếu** ở result set thứ 2.

   Việc này đẻ ra một vòng khoá: không lưu được dòng vì thiếu minh chứng, mà không gắn được
   minh chứng vì chưa có `id_chi_tiet`. Phá vòng bằng **KHO TẠM** trong chính bảng
   `minh_chung_ke_khai_thanh_tich` — một bản ghi có hai dạng:

   | | `id_chi_tiet` | `id_nam` |
   |---|---|---|
   | đã gắn | NOT NULL | NULL |
   | kho tạm | NULL | NOT NULL |

   `chk_mcttvt_chu` giữ bất biến "đúng một chủ sở hữu". Chủ của file tạm là cặp
   (`nguoi_tai_len`, `id_nam`) — **cố ý dùng `id_nam` chứ không phải `id_ke_khai`**, vì
   lazy-create nghĩa là bản kê có thể chưa tồn tại lúc tải file lên.

   Luồng: `POST .../minh-chung-tam?idNam=` → lấy `IdMinhChungTt` → gửi kèm trong
   `ChiTiet[i].IdMinhChung` khi lưu → SP gắn file vào dòng vừa tạo **trong cùng transaction**
   rồi xoá `id_nam`. Vì dòng mới chưa có id, TVP `GanMinhChungThanhTichRow` khoá theo
   **`thu_tu`** (vị trí của dòng trong form); `sp_..._luu_chi_tiet` dùng `MERGE` thay
   `INSERT...SELECT` vì chỉ `MERGE` mới `OUTPUT` được cột của nguồn để lấy cặp
   (`thu_tu` → `id_chi_tiet` vừa sinh).

   File tạm không bao giờ được gắn sẽ bị `sp_..._don_tam` dọn sau 7 ngày; SP này được gọi
   ngay đầu `MinhChungThanhTichService.AddTam` nên mỗi người tự dọn rác của mình, không cần
   job nền.

   ⚠️ **File đã gắn vẫn NẰM NGUYÊN ở thư mục `uploads/ke-khai-thanh-tich/tam/{idNhanVien}/`** —
   khi gắn, chỉ `id_chi_tiet` trong DB đổi, file vật lý không bị di chuyển. Cố ý: `File.Move`
   sau khi SP đã commit sẽ đẻ ra trạng thái hỏng "DB bảo đã gắn nhưng file không còn ở đường
   dẫn cũ". `sp_..._don_tam` chỉ quét bản ghi `id_chi_tiet IS NULL` nên **không** đụng tới file
   đã gắn. Hệ quả cần nhớ: **đừng xoá tay cả thư mục `tam/`** — trong đó có cả minh chứng
   đang được dùng thật.

   Gate thêm / gỡ minh chứng cũng chuyển từ **trạng thái bản kê** sang **trạng thái DÒNG**:
   dòng đã chốt thì khoá (`DONG_DA_CHOT`), các dòng khác của cùng bản kê vẫn thao tác được.
3. **`id_nguoi_duyet_dong` / `ngay_duyet_dong` trên từng dòng** — vì một bản kê trộn 4 loại
   có thể do **nhiều người khác nhau** duyệt, không như mục 9 chỉ có một người duyệt.

`chi_tiet_ke_khai_thanh_tich` **cố ý KHÔNG UNIQUE** `(id_ke_khai, id_muc)`: cùng một mức kê
được nhiều dòng (nhiều sáng kiến cấp Trường, nhiều sự kiện tham gia) — cùng lý do với 9.3.

Ba cột snapshot (`loai_thanh_tich_snapshot`, `ten_muc_snapshot`, `diem_snapshot`) chốt cứng
lúc nhập, chỉ làm mới khi **đổi `id_muc`** — sửa danh mục về sau không làm đổi số liệu của
bản kê đã lưu. Cùng bất biến với `he_so_snapshot` (9.2) và `phan_cong_nhiem_vu_khoa.diem_snapshot`.

### 11.4. Hai quyết định nghiệp vụ — **KHÔNG chặn lưu**

Đây là chỗ dễ làm sai nhất của module, ghi lại để về sau đừng "sửa" ngược.

**Vượt trần không chặn lưu.** Người có 4 sáng kiến cấp Bộ (80 điểm thô) vẫn kê được cả 4.
Bảng KPI ghi *"Điểm tối đa 30"*, **không** ghi *"chỉ được kê khai 30"* — chặn ở bước lưu là
làm mất dữ liệu thật. Trần áp lúc **chấm điểm** (`fn_nckh_diem_tu_dong` cap ở
`tieu_chi_danh_gia.diem_toi_da`). Để người dùng không bị bất ngờ, mọi endpoint kê khai trả
thêm một result set **tổng hợp theo loại** kèm `ma_canh_bao = 'VUOT_TRAN'` và câu
*"kê X, được tính Y"*.

**Khen thưởng trùng nội dung được KHỬ TRÙNG lúc chấm, không bị chặn lúc lưu.** Quy định ghi
*"một nội dung được khen nhiều cấp thì chỉ tính cấp cao nhất"* — người đó **thật sự** được
khen ở cả hai cấp, cả hai đều là dữ liệu đúng. Nhánh `TTVT_KHEN_THUONG` gom theo
`LOWER(LTRIM(RTRIM(ten_thanh_tich)))` rồi lấy dòng có `diem_duyet` cao nhất trên từng nhóm.
Cảnh báo `KHEN_THUONG_TRUNG_NOI_DUNG` chỉ để thông báo, không phải lỗi.

⚠️ **Khử trùng ở phạm vi CẢ NĂM, cộng ở phạm vi QUÝ.** Từ đợt "TTVT_* chấm theo quý", nhánh
này chọn **dòng thắng** (`diem_duyet` lớn nhất; hoà → `id_chi_tiet` nhỏ nhất) rồi mới lọc
`ct.quy` — điểm rơi vào quý của chính dòng thắng. **Không** được hạ phép khử trùng xuống
phạm vi quý: cùng một nội dung được khen ở hai quý khác nhau sẽ cộng **hai lần**, và trần 15
của tiêu chí sẽ che lấp lỗi đó.

**BẤT BIẾN:** vị từ chọn dòng thắng phải giống **từng chữ** với biểu thức `la_dong_bi_khu`
trong `fn_nckh_minh_chung_tu_dong` — lệch nhau thì FE hiển thị một dòng **khác** dòng đã tạo
ra điểm.

### 11.5. Phân quyền — hai tầng

Khác hẳn mục 9: quyền duyệt **không phải một bit duy nhất** vì mỗi mức có thể trỏ tới một đơn
vị phụ trách khác nhau.

- **`fn_ke_khai_thanh_tich_quyen(@id_nv, @id_don_vi_duyet, …)`** — nhân bản
  `fn_ke_khai_gio_quy_doi_quyen` (9.4), giữ nguyên bẫy fail-closed (tầng trong là aggregate
  không GROUP BY nên luôn đúng 1 dòng). Tham số `@id_don_vi_duyet`: `NULL` → phạm vi duyệt là
  đơn vị của nhân viên; `NOT NULL` → đúng đơn vị đó.
- **`sp_ke_khai_thanh_tich_quyen_ban_ke`** — "người này duyệt được **ít nhất một dòng** của
  bản kê này không?". Dùng cho các **gate cấp bản kê** (mở màn hình duyệt, đọc nhật ký, đọc
  minh chứng). Bản kê rỗng → lấy quyền mặc định theo đơn vị nhân viên, để màn hình vẫn mở
  được. Từ đợt lazy-create, bản kê có thể **chưa tồn tại**, nên SP nhận thêm `@id_nhan_vien`
  để vẫn tra được quyền mặc định khi `@id_ke_khai` còn NULL.
- **Gate cấp DÒNG** nằm trong `sp_ke_khai_thanh_tich_duyet_chi_tiet`: từng dòng đối chiếu
  riêng `id_don_vi_duyet` của mức nó trỏ tới. Gửi lấn sang dòng của đơn vị khác → **cả
  request bị từ chối** (`FORBIDDEN_DONG`, không ghi một phần) kèm danh sách dòng vi phạm.

Hệ quả cần biết: **`can_xem` của UDF trả 0 cho người phụ trách một loại** (P.TCHC không phải
trưởng đơn vị của nhân viên). Nên `sp_ke_khai_thanh_tich_get_by_id`, `_lich_su` và
`sp_minh_chung_ke_khai_thanh_tich_get_by_id` đều mở cửa theo `can_xem OR can_duyet` — không
đọc được minh chứng thì không thẩm định được.

Không còn thao tác "chốt cả bản kê", nên cũng không còn câu hỏi *ai được chốt*: mỗi đơn vị
phụ trách chốt đúng phần dòng của mình, và bản kê tự mang nhãn `3 DA_DUYET` khi mọi dòng đã
chốt. Đây chính là chỗ mô hình mới gọn hơn mô hình cũ — trước đây phải có một người "bấm nút
kết thúc" sau khi tất cả đã xét xong.

### 11.6. Điểm đi vào phiếu đánh giá

Sửa **3 object dùng chung** với module NCKH (`update_database.sql` phần 4):

| Object | Thay đổi |
|---|---|
| `fn_nckh_diem_tu_dong` | +4 mã `TTVT_*` vào danh sách `IN`, +1 nhánh `IF` |
| `fn_nckh_minh_chung_tu_dong` | +nhánh 7 — dòng nguồn đã sinh ra điểm |
| `sp_mau_danh_gia_diem_tu_dong` | +cờ `@co_tieu_chi_ttvt` mở rộng tập nhân sự |

Nhánh `TTVT_*` khoá theo **`id_nhan_vien`** (viên chức không có hồ sơ NCKH nên `@ma_nckh` vô
dụng), cộng `SUM(diem_duyet)` của các dòng **`trang_thai_dong = 2`**, cap ở `@diem_toi_da`.

**Cố ý dùng `diem_duyet` chứ không phải `diem_ke_khai`**: chỉ thành tích đã được đơn vị phụ
trách thẩm định mới vào KPI. Chưa duyệt ⇒ **0 điểm**; duyệt xong phải chạy lại
`POST api/phieu/{id}/tong-hop-tu-dong` — cùng quy ước với `NVK_PHAN_CONG_KHOA` (7.x).

**Cố ý KHÔNG lọc theo `ke_khai_thanh_tich_vuot_troi.trang_thai`**: dòng đã được chốt thì đã
có giá trị, không bắt nhân viên chờ cả bản kê chốt xong. Điều này **đã đúng từ trước** và
không phải sửa gì ở đợt chuyển sang xét từng dòng — nhưng nay nó còn là hệ quả bắt buộc:
`trang_thai` của header chỉ còn là nhãn dẫn xuất, lọc theo nó là vô nghĩa. Hệ quả nghiệp vụ
cần nói rõ với người dùng cuối: **điểm chảy vào phiếu KPI ngay khi dòng được chốt**, không
chờ chốt cả bản kê nữa.

`@co_tieu_chi_ttvt` cần thiết vì viên chức phòng ban **không có mặt trong 4 nguồn cũ** (NCKH /
phản hồi SV / vi phạm giảng dạy / bài báo quốc tế) — không mở rộng tập thì họ biến mất khỏi
bản xem trước toàn trường dù đang có bản kê đầy đủ. Cùng khuôn với `@co_tieu_chi_bbqt`.

⚠️ **KHÔNG thêm result set mới** vào `sp_mau_danh_gia_diem_tu_dong`: RS4 (minh chứng) chỉ phát
khi `@id_nhan_vien IS NOT NULL`, thêm RS sẽ làm lệch chuỗi `NextResult()` ở `MauDanhGiaDal`.

**Bất biến bắt buộc:** 16 mã công thức cũ phải chấm ra kết quả **giống hệt** trước và sau
migration. Cách kiểm: snapshot `dbo.fn_nckh_diem_tu_dong` trên toàn bộ
(nhân viên × năm × 16 mã) trước khi chạy, chạy trong transaction, so lại, rồi `ROLLBACK`.

### 11.7. Hợp đồng result set

Giống mục 9: `RS1 = success / message / error_code`, `RS2..` chỉ phát khi `success = 1`. Các SP
thao tác bản kê đều kết thúc bằng **4 result set** do `sp_ke_khai_thanh_tich_result_sets` phát:
header / dòng / minh chứng / **tổng hợp theo loại**.

**Ngoại lệ:** hai mã lỗi `THIEU_MINH_CHUNG` (khi lưu) và `FORBIDDEN_DONG` (khi duyệt) phát
**thêm một result set** liệt kê các dòng gây lỗi — `KeKhaiThanhTichDal.ReadDongCoVanDe` đọc
tiếp khi gặp đúng hai mã này, các mã khác `NextResult()` trả false nên vô hại.

Từ khi gate minh chứng chuyển vào bước LƯU, result set của `THIEU_MINH_CHUNG` mang thêm cột
**`thu_tu`**: dòng bị chặn thường là dòng MỚI, chưa có `id_chi_tiet` (phát ra 0), nên đó là
cách duy nhất để FE trỏ đúng dòng trong form vừa gửi lên. Đánh số `thu_tu` phải khớp tuyệt
đối giữa `BuildChiTietRecords` và `BuildGanMinhChungRecords` — cả hai cùng bỏ qua phần tử
`null`, lệch một nhịp là minh chứng gắn nhầm dòng.

Header còn hai cờ mới ở **từng dòng**: `cho_phep_sua` (chính chủ + dòng chưa chốt) và
`cho_phep_xet` (người gọi xét được dòng này), để FE không phải tự suy từ trạng thái.

### 11.8. Mục II.4 — phần TRỪ điểm

Vế *"Không tham gia khi được đơn vị yêu cầu và không có lý do chính đáng: trừ 5 điểm/lần"*
**không** thuộc module này — kê khai là người lao động **tự khai thành tích của mình**, không
ai tự khai lỗi của mình. Nó nằm ở danh mục vi phạm sẵn có (`loai_vi_pham` với
`loai_doi_tuong = 2`, `che_do_diem_tru = 1` cố định 5 điểm), đọc qua
`sp_vi_pham_tong_hop_nhan_vien` → `GET api/vi-pham/tong-hop-nhan-vien`.

`update_database.sql` phần 5 seed loại vi phạm này **có guard**: tự tìm nhóm vi phạm của viên
chức (ưu tiên nhóm trần 30), không tìm thấy thì `PRINT` nhắc và bỏ qua — không tạo dữ liệu đoán.
Dùng dynamic SQL vì 4 cột `loai_doi_tuong` / `tran_diem_tru` / `che_do_diem_tru` **chưa có
trong `schema.sql`** (xem ghi chú trôi lệch ở mục 3.2), tham chiếu trực tiếp sẽ làm cả script
không compile được trên bản DB chưa chạy đợt "Vi phạm nhân viên".

### 11.9. Ngoài phạm vi

- ~~**Phiếu đánh giá theo quý**~~ — ĐÃ LÀM ở đợt "Đánh giá KPI viên chức theo quý". Xem mục 4.1
  (cột `quy`, công tắc `nguon_diem_co_ban`, state machine rút gọn, công thức trung bình) và
  mục 14 trong `procedure.sql`. `Models/PhieuQuy/` nay đã có nội dung.
  **Còn ngoài phạm vi trong chính đợt đó:**
  - ~~*Thành tích vượt trội theo quý.*~~ — ĐÃ LÀM ở đợt "Đánh giá vượt trội theo quý".
    Mỗi quý nay chấm **cả nhóm A lẫn nhóm B**; phiếu năm thành bản ghi tổng hợp thuần tuý
    không còn dòng nào. Vượt trội vẫn **cộng dồn cả năm** (không lấy trung bình) nhưng
    từng tiêu chí bị kẹp ở khoảng hợp lệ của nó — xem mục 4.1 và
    `fn_phieu_chi_tiet_vuot_troi_quy`.
    - ~~*Chấm tự động nhóm B theo quý.*~~ — ĐÃ LÀM ở đợt "TTVT_* chấm theo quý + trần
      nhóm B". Hai việc đi **cùng một commit** đúng như cảnh báo cũ:
      `sp_phieu_quy_create` mở cổng seed cho 4 mã `TTVT_*`, **và** nhánh `TTVT_*` của
      `fn_nckh_diem_tu_dong` lọc theo `chi_tiet_ke_khai_thanh_tich.quy`. Mở cổng trước
      khi nối cột `quy` vào hàm là đếm một thành tích **bốn lần**, và phép kẹp trần sẽ
      **che lấp** lỗi đó.
      `so_tieu_chi_tu_dong_bo_sot` nay loại trừ cả 7 mã đã mở cổng (3 `VPVC_*` +
      4 `TTVT_*`); còn > 0 nghĩa là có mã chấm tự động khác chưa có chỗ đứng ở cấp quý.
  - *Hạn kê khai theo quý.* `nam_danh_gia` chỉ có MỘT mốc `ngay_dong_tu_danh_gia` cho cả năm;
    mốc đó rơi vào tháng 11 thì không ai kê khai được Q4. Nên `sp_chi_tiet_danh_gia_update_tu_danh_gia`
    **bỏ qua** chặn hạn khi `quy > 0`. Bảng `han_phieu_quy(id_nam, quy, ngay_mo, ngay_dong)`
    để đợt sau; hiện TP kiểm soát bằng bước duyệt/chốt chứ không bằng ngày.
  - *Mở lại phiếu quý đã chốt.* Trạng thái 5 của phiếu quý là terminal — chưa có nghiệp vụ.
- ~~**Trần 50 của cả nhóm.**~~ — ĐÃ LÀM ở đợt "TTVT_* chấm theo quý + trần nhóm B".
  Từng tiêu chí cap ở `tieu_chi_danh_gia.diem_toi_da` (30/15/10/10, tổng 65 > 50), rồi
  **cả nhóm** cắt ở `nhom_tieu_chi.diem_toi_da` của **nút gốc** cây `loai_nhom = 2`.
  Nguồn sự thật: `fn_phieu_tran_nhom_vuot_troi(@id_phieu)` — trả `NULL` = *không có trần*
  (không được `ISNULL` về 0). Giải từ `phieu_danh_gia.id_mau`, **không** từ các dòng của
  phiếu: phiếu năm roll-up không có dòng nhóm B nào.

  **Hai phép cắt nối tiếp, đúng thứ tự** — đảo lại sẽ ra số khác (cắt nhóm trước rồi kẹp
  tiêu chí sau sẽ cho phép một tiêu chí ăn hết hạn mức của cả nhóm):

  ```
  (1) từng TIÊU CHÍ  kẹp ở tieu_chi_danh_gia.diem_toi_da   (30/15/10/10)
  (2) cả   NHÓM      cắt ở nhom_tieu_chi.diem_toi_da gốc   (50)
  ```

  Áp ở **ba nơi phải giống hệt nhau**: `sp_phieu_danh_gia_tinh_tong_diem` (xem trước),
  `sp_phieu_khoa_duyet_ho_so` (ghi thật + chống tamper), `sp_phieu_nam_tong_hop_tu_quy`
  (roll-up). ⚠️ **Cạm bẫy:** ở nhánh `ELSE` của hai SP đầu, `tong_diem_tich_luy` là `SUM`
  của **mọi** dòng (để trùm cả nhóm `loai_nhom` NULL) chứ **không** phải
  `co_ban + vuot_troi` — cắt vế vượt trội mà để nguyên tích luỹ là làm hai vế lệch nhau,
  nên phải trừ đúng phần vừa bị cắt.

  Hai cột giải trình đi kèm (`tran_nhom_vuot_troi`, `tong_vuot_troi_truoc_tran_nhom` →
  `TranNhomVuotTroi`, `TongVuotTroiTruocTranNhom`): bảng `VuotTroiTheoTieuChi` chỉ giải
  trình được phép cắt **thứ nhất**, trần nhóm không xuất hiện ở dòng nào trong bảng đó.

  ⚠️ `nhom_tieu_chi.diem_toi_da` trước đợt này **chỉ để hiển thị**, nên giá trị ở môi
  trường cũ có thể còn là `DEFAULT 100`. Mục 0 của `update_database.sql` bắt kiểm tra
  trước khi chạy.
- ~~**Hạn ngạch 20% xuất sắc cho viên chức**~~ — ĐÃ LÀM. Xem §8.2: viên chức / NLĐ nay có
  bảng xếp hạng riêng (nhóm 2) với mẫu số = số người mức 3 (từ 2026-10-01), và cán bộ quản lý có nhóm 3
  riêng của từng đơn vị.
- **Quy tắc "đơn vị đạt HTXS ⇒ người đứng đầu đơn vị được xem xét HTXS".** Xếp loại đơn vị
  (`phieu_danh_gia_don_vi`) và xếp loại cá nhân hiện vẫn hoàn toàn rời nhau. Đợt tách 3 nhóm
  **cố ý không** đụng `sp_phieu_dv_chot` / `XepLoaiCalculator.TinhXepLoaiPhongTrungTam`.
- **Trôi điểm của tiêu chí `TY_LE_XUAT_SAC` cấp đơn vị.** Tiêu chí tự động đó đếm
  `xep_loai = 4` trên **mọi** phiếu của đơn vị. Từ khi viên chức lên được mức 4, con số này
  tăng lên và kéo theo điểm tự động của phiếu đơn vị. Không sửa lần này (thiết kế lại chấm
  điểm đơn vị nằm ngoài phạm vi) — nhưng là hệ quả đã biết, không phải lỗi.

---

## 12. HỌC VỊ — CHƯA LÀM, để phát triển sau

> ⚠️ **Mục này mô tả thiết kế ĐỀ XUẤT, chưa có trong database.** Đợt "Khoa Thống kê -
> Tin học" chỉ nạp người + đơn vị + chức danh nghề nghiệp; phần học vị đã cắt khỏi
> `update_database.sql` để làm sau. Đừng viết code dựa vào các bảng dưới đây cho tới
> khi chúng thực sự được tạo.

### 12.1. Hiện trạng: không có chỗ nào lưu học vị của nhân sự

Hai thứ dễ nhầm là chỗ lưu nhưng không phải:

- `nckh_gio_nckh.hoc_vi` / `hoc_ham` — chỉ là text denormalize đổ về từ API NCKH, nằm trên bảng
  **wipe-and-reload** (`sp_nckh_gio_nckh_dong_bo` mở đầu bằng `DELETE FROM dbo.nckh_gio_nckh;`),
  không FK tới `nhan_vien`, mất sạch sau mỗi lần đồng bộ. Không dùng làm hồ sơ nhân sự được.
- `chuc_danh_nghe_nghiep` — đây là **ngạch/chức danh nghề nghiệp** (GV/GVC/GVCC/HĐLĐ…), không
  phải học vị. Trước đây có cả GS/PGS (theo Bảng 1 QĐ ĐHKT); đợt "Chức danh chính thức" đã xoá
  vì đó là học hàm, không có trong danh sách chức danh nhân sự — xem §1.3.

**Học vị (ĐH/ThS/TS) ≠ chức danh nghề nghiệp (GV/GVC/GVCC) ≠ học hàm (GS/PGS).** Một người có
thể là Tiến sĩ nhưng vẫn giữ ngạch Giảng viên.

### 12.2. Thiết kế đề xuất — sao chép pattern `chuc_danh_nghe_nghiep` + `nhan_vien_chuc_danh`

```
danh_muc_hoc_vi   (id_hoc_vi PK, ma_hoc_vi UNIQUE, ten_hoc_vi, thu_tu, trang_thai)
                  seed: DH / Đại học / 1, THS / Thạc sĩ / 2, TS / Tiến sĩ / 3

nhan_vien_hoc_vi  (id_nv_hoc_vi PK, id_nhan_vien FK, id_hoc_vi FK,
                   tu_ngay, den_ngay, ghi_chu, ngay_tao)
                  ix_nvhv_nv_ngay (id_nhan_vien, tu_ngay, den_ngay)

nhan_vien.id_hoc_vi INT NULL FK -> danh_muc_hoc_vi    -- học vị ĐANG hiệu lực hôm nay
                  ix_nv_hoc_vi WHERE id_hoc_vi IS NOT NULL
```

Ba quy ước nên giữ giống hệt lịch sử chức danh để khỏi phải học lại:

1. **Không có cờ `IsCurrent`.** Hiện hành = `tu_ngay <= hôm nay AND (den_ngay IS NULL OR den_ngay >= hôm nay)`.
2. `nhan_vien.id_hoc_vi` là **cache denormalize**. Mọi CUD trên `nhan_vien_hoc_vi` phải resolve
   lại và ghi đè cột này — y như `sp_nhan_vien_chuc_danh_create` làm với `nhan_vien.id_chuc_danh`.
3. `thu_tu` dùng để **so bậc** học vị (ThS < TS), không dùng để sắp lịch sử — lịch sử sắp theo `tu_ngay`.

Khi viết CRUD, copy nguyên `sp_nhan_vien_chuc_danh_create/_update/_delete` (auto-close bản ghi
đang mở, từ chối chồng lấn, sync cột cache).

### 12.3. Hai mã chức danh `CV` và `KHAC` (lịch sử)

Nguồn NCKH trả về `TitleName` = "Chuyên viên" và "Khác". Đợt "Khoa Thống kê - Tin học" đã seed
thêm `CV` (Chuyên viên) và `KHAC` (Khác). Đợt "Chức danh chính thức" **giữ `CV`** (có trong danh
sách chính thức) và **xoá `KHAC`**.

⚠️ Mọi mã ngoài `GV, GVC, GVCC, HDLD_GV, HDLD_HUU` **cố ý** nằm ngoài danh sách ngạch giảng dạy (§1.3).
Người mang `CV`, `CVC`, `NCV`… **không** được tính là giảng viên khi chấm KPI — đúng nghiệp vụ,
đừng "sửa" bằng cách nhét chúng vào danh sách đó.

### 12.4. Đặc thù dữ liệu nguồn NCKH (biết trước để khỏi tưởng là bug)

Dữ liệu `tkth.json` dùng cờ `IsCurrent` cho **bản ghi học vị**, không cho chức danh — nên dòng
`IsCurrent = 0` thường mang ngạch **mới hơn** dòng `IsCurrent = 1`. Mốc `18/10/2020` xuất hiện
dày đặc là **ngày migration của hệ thống nguồn**, không phải ngày bổ nhiệm thật.

`update_database.sql` đợt này đã **rút gọn 46 dòng JSON xuống 27 dòng** trong `#tkth_raw`, bỏ
hẳn hai cột `ma_hoc_vi` / `ngay_hoc_vi`. Bốn quyết định đã bake sẵn vào dữ liệu (có chú thích
ngay trong file):

1. **UserId 4000 bị loại** — trùng người với 3987 ("Nguyễn Thị Sáng", khác email). Giữ 3987
   → khoa còn **23 người**.
2. **`ngay_chuc_danh = NULL`** = nguồn không có `TitleDate` (13/23 người). Trước đây mượn
   `DegreeDate`; nay học vị đã gỡ nên phần 5 dùng biến `@ngay_chuc_danh_mac_dinh`
   (mặc định `2020-01-01`, bằng `@tu_ngay_don_vi`). **Đây là dữ liệu test — ngày này không
   phải ngày bổ nhiệm thật**, đừng dùng để tính thâm niên.
3. **Đã lọc mốc ngạch trùng** trong nguồn: UserId 239 (2 dòng GVC giống hệt), 252 (2 dòng GV),
   253 (3 dòng GVC), 4198 (2 dòng GV).
4. **UserId 251 Châu Ngọc Tuấn** — nguồn ghi thêm ngạch "Giảng viên" không có `TitleDate`;
   sắp theo ngày thì thành ra bị **giáng** GVC (18/10/2020) → GV, vô lý. Chốt: giữ
   **Giảng viên chính**, bỏ dòng GV.

### 12.5. Hai ca học vị còn treo — xử lý khi làm bảng học vị

Quyết định nghiệp vụ đã chốt: **giữ dòng Thạc sĩ cho cả hai.**

| UserId | Nguồn ghi | Vô lý ở chỗ | Xử lý khi nạp học vị |
|---|---|---|---|
| 238 Trần Hoàng Hiếu | TS 01/01/2016 **trước** ThS 06/07/2016 | không ai lấy TS xong mới lấy ThS | bỏ mốc TS → **Thạc sĩ** |
| 4198 Trần Thị Thuý Trinh | `IsCurrent=1` nói TS 01/01/2023, nhưng có mốc ThS 30/05/2025 mới hơn | cờ và mốc ngày đá nhau | bỏ mốc TS → **Thạc sĩ** |

Hai ca này chỉ ảnh hưởng tới học vị nên đợt này không đụng tới. Dữ liệu học vị gốc nằm ở
`tkth.json` (đã không còn trong `update_database.sql`) — lấy lại từ đó khi cần.

## 13. GIỜ GIẢNG — FILE THỐNG KÊ SỐ TIẾT, SHEET DH + SDH (`gio_giang_tkb`)

### 13.0. Vì sao có module này

Mục 9.0 ghi "Thời gian thực hiện" của giảng viên có **hai** nguồn, và nguồn (1) — *tiết
giảng dạy quy đổi* — **CHƯA làm**. Module này **chính là nguồn (1)**, lấy từ file Excel
thống kê số tiết thay vì chờ hệ thống ngoài gọi sang. Từ 2026-09-30 nguồn (2) — kê khai
Phụ lục II — **đã gỡ** (mục 9), nên đây là **nguồn duy nhất** của giờ giảng.

File có **hai sheet**: `DH` (giảng dạy đại học) và `SDH` (giảng dạy sau đại học) — xem 13.9.
Bản đầu chỉ đọc một sheet thời khoá biểu đại học; tên bảng / endpoint `gio-giang-tkb` giữ
nguyên để không phá hợp đồng API.

Kết quả cuối cùng nằm ở `sp_gio_giang_tkb_tong_hop` (`GET api/gio-giang-tkb/tong-hop`):

```
TỔNG GIỜ GIẢNG trong năm = giờ theo TKB
```

(Trước 2026-09-30 còn cộng thêm giờ kê khai Phụ lục II đã duyệt — nguồn đó đã gỡ.)

Bảng này khoá theo **năm đánh giá**, tự lọc theo kỳ học, và có đường nối về nhân viên —
khác hẳn cách nhập staging phẳng theo **kỳ học** trước đây, vốn chỉ nhận các cột tổng giờ
đã tính sẵn ở nơi khác nên không kiểm chứng được.

### 13.1. Phạm vi CỐ Ý chưa làm — đã chốt với người dùng

- ~~**KHÔNG** thêm mã chấm điểm tự động vào `fn_nckh_diem_tu_dong`.~~ **Đã đảo** (2026-09-27): có mã
  `GIO_GIANG_TY_LE` chấm theo tỷ lệ hoàn thành sau giảm trừ — xem §13.10.
- **KHÔNG** ghi vào `gio_thuc_hien_gv`. Cùng lý do đã ghi ở 3.6.8 và 9.0: ghi tự động sẽ
  đè số liệu nhập tay mà `sp_dinh_muc_lay_context_ap_dung` và phiếu đánh giá đang đọc.
- Ánh xạ họ tên → nhân viên: **tự động** khi tên khớp duy nhất một nhân viên, còn lại làm
  tay. Xem 13.6.

### 13.2. Dòng nào thuộc năm nào — chỉ nhìn cột `KY_HOC`

`ky_hoc` mã hoá `nam_hoc * 10 + {1,2,3}`, trong đó `nam_hoc` là **năm KẾT THÚC** của năm học
đó. Vì năm học lệch pha nửa năm so với năm dương lịch, một **năm đánh giá N** cắt qua đúng
**ba** kỳ:

| Kỳ | Công thức | Với `idNam = 2026` | Rơi vào |
|---|---|---|---|
| Kỳ 2 của năm học trước | `(N−2000)*10 + 2` | 262 | nửa đầu 2026 |
| Kỳ hè của năm học trước | `(N−2000)*10 + 3` | 263 | giữa 2026 |
| Kỳ 1 của năm học mới | `(N−1999)*10 + 1` | 271 | nửa cuối 2026 |

Kỳ khác (261 = nửa cuối **2025**, 272 = nửa đầu **2027**, …) thuộc năm dương lịch khác nên
bị **bỏ qua im lặng**, không báo lỗi — bản xuất TKB thường gồm nhiều kỳ và việc lọc là việc
của API, không phải của người nhập. Số dòng bỏ qua trả về ở `SoDongBoQua` để đối chiếu.

Toàn bộ file không có dòng nào thuộc ba kỳ trên → **400**, thông báo nêu đúng ba kỳ mong đợi
(gần như luôn là chọn nhầm `idNam` hoặc nhầm file).

### 13.3. Số tiết lấy THẲNG cột `SoTiet` — và vì sao bỏ cách tính cũ

`so_tiet_trong_nam` = **nguyên văn cột `SoTiet`** của file. Không đọc lịch học, không quy ra
ngày, không trừ tuần nghỉ.

Bản đầu tiên làm ngược lại: đọc các ô `Thu2..chuNhat` dạng `"7,8,9 T(2-17)"`, quy mỗi lượt
dạy `(một đoạn, một tuần)` ra **một ngày cụ thể** bằng mốc `ngayBatDauKy1 + soTuanNamTruoc`,
trừ các tuần nghỉ khai báo qua `tuanNghiKy1` / `tuanNghiNamCu` / `tuanNghiNamMoi`, rồi cắt
theo `nam_danh_gia.ngay_bat_dau .. ngay_ket_thuc` — một đoạn vắt qua giao thừa bị cắt đôi.

Chính xác hơn về lý thuyết, nhưng **5 tham số cấu hình đều sai được mà không có dấu hiệu
nào**: lệch mốc vài ngày, nhầm 52/53 tuần, hay quên khai báo đợt Tết đều cho ra một con số
trông vẫn hợp lý. Người dùng đã chốt bỏ: cột `SoTiet` là con số họ nhìn thấy và cộng tay
được trên Excel, nên số của hệ thống và số của họ **luôn khớp tuyệt đối**.

Hệ quả kéo theo, ghi lại để không ai đi lại đường cũ:

- `Helper/ThoiKhoaBieuParser.cs` và các cột `Thu2..chuNhat` **không còn được đọc**.
- `gio_giang_tkb_lan_import` không còn cột tham số nào: quy tắc suy ra hoàn toàn từ `id_nam`,
  nên lưu `id_nam` là đủ để tái lập y hệt một lần tính.
- Endpoint import chỉ còn **hai** field: `file` và `idNam`.
- `SoTiet` trống hoặc ≤ 0 → dòng vẫn được nhận nhưng đóng góp **0 giờ**, kèm cảnh báo
  `SO_TIET_TRONG`. Không chặn: thiếu dữ liệu ở một lớp không nên huỷ cả lần import.

### 13.4. Quy đổi tiết → giờ chuẩn theo hệ đào tạo, sĩ số và loại hình

| `SLSV_DangKyHoc` | ĐH – Tiếng Việt | ĐH – Tiếng Anh | SĐH – Tiếng Việt | SĐH – Tiếng Anh |
|---|---|---|---|---|
| ≤ 40 | 1,0 | 1,5 | 1,5 | 1,7 |
| 41 – 50 | 1,1 | 1,5 | 1,6 | 1,8 |
| 51 – 60 | 1,2 | 1,5 | 1,7 | 1,9 |
| 61 – 70 | 1,3 | 1,5 | 1,8 | 2,0 |
| 71 – 80 | 1,4 | 1,5 | 1,8 | 2,0 |
| ≥ 81 | 1,5 | 1,5 | 1,8 | 2,0 |

"Tiếng Anh" = giảng bằng tiếng nước ngoài đối với môn **không** phải môn ngoại ngữ
(`LoaiHinhGiangDay = "Tiếng Anh"`). ĐH tiếng Anh là 1,5 phẳng, không xét sĩ số.

Hệ số áp **theo tiết**, không theo lớp: lớp ĐH 90 SV dạy 45 tiết = 45 × 1,5 = 67,5 giờ chuẩn.
Sĩ số ≤ 0 (ô trống / thiếu dữ liệu) áp bậc **thấp nhất của loại hình** (ĐH 1,0; SĐH 1,5 hoặc
1,7) — không có căn cứ để cho hưởng hệ số cao hơn.

`gio_chuan_trong_nam = ROUND(so_tiet_trong_nam × he_so, 2)`, làm tròn `AwayFromZero` để
không lệch với cách người dùng cộng tay trên Excel. Làm tròn **từng lớp** rồi mới cộng, đúng
thứ tự mà bảng chi tiết hiển thị — nhờ vậy tổng ở dòng header luôn bằng tổng các dòng chi
tiết mà người dùng nhìn thấy.

⚠️ **BẤT BIẾN — toàn bộ quy tắc ở tầng C#.** `BLL/GioGiangTkbService` lọc kỳ học và đọc
`LoaiHinhGiangDay`, `Helper/GioChuanQuyDoi` quy đổi tiết → giờ. SQL **chỉ nhận** các con số
đã chốt qua TVP `dbo.GioGiangTkbRow`. Tuyệt đối không tính lại ở SQL — nhân bản logic sẽ lệch.

### 13.5. Các cột số

| Cột | Ý nghĩa |
|---|---|
| `so_tiet_trong_nam` | tổng cột `SoTiet` của các lớp thuộc 3 kỳ của năm (cả hai sheet) |
| `gio_chuan_trong_nam` | tổng `SoTiet × hệ số` của từng lớp (cả hai sheet) |
| `gio_chuan_dai_hoc` / `gio_chuan_sau_dai_hoc` | phần của sheet DH / SDH; tổng hai cột = `gio_chuan_trong_nam` |

Hai cột tách ĐH / SĐH chỉ nằm ở **dòng tổng hợp** để `sp_gio_giang_tkb_tong_hop` không phải
quét lại chi tiết; nguồn gốc vẫn là cột `he_dao_tao` của `gio_giang_tkb_chi_tiet`.

Bản trước có **bốn** cột (`so_tiet_excel`, `so_tiet_tkb`, `so_tiet_nghi`,
`so_tiet_trong_nam`) để lọc dần từng bước và đối chiếu tay. Khi số tiết lấy thẳng từ file thì
cả bốn luôn bằng nhau (hoặc bằng 0), nên ba cột đầu đã bị **bỏ hẳn** khỏi bảng, khỏi TVP và
khỏi DTO — xem `App_Data/update_database.sql`.

Dòng trùng `(họ tên, kỳ học, mã lớp tín chỉ)` được **giữ nguyên cả hai** — đồng giảng là có
thật, khử trùng sẽ làm mất giờ — kèm cảnh báo `TRUNG_LOP`. Vì vậy TVP `GioGiangTkbRow` **cố ý
không có PRIMARY KEY**.

### 13.6. Ánh xạ (họ tên, khoa) → nhân viên (`gio_giang_tkb_anh_xa`)

File **chỉ có** `HoLot`/`Ho` + `Ten` + `TenKhoa` — không mã giảng viên, không email.
`TenKhoa` là khoa **của giảng viên** (đã chốt với người dùng). Khoá gộp và khoá ánh xạ là
cặp **`(ho_ten_chuan, khoa_chuan)`**: cả hai do `Helper/ChuanHoaTen.ChuanHoa` sinh ra (bỏ
dấu + gộp khoảng trắng + viết hoa); `khoa_chuan = ''` khi file không ghi khoa. Hai người
trùng tên ở hai khoa vì vậy là **hai dòng** tổng hợp riêng, không bị gộp giờ vào nhau.

**Quyết định đã chốt: hệ thống TỰ ánh xạ khi xác định được duy nhất một người**
(`fn_gio_giang_tkb_khop_ten`):

| Tình huống | Kết quả |
|---|---|
| Tên khớp **đúng một** nhân viên đang hoạt động | gắn ngay — **không** xét khoa (một `TenKhoa` ghi lệch không được chặn mất ánh xạ đúng) |
| Trùng tên (≥ 2) và **khoa** khớp đúng một người | gắn người đó |
| Không khớp ai / trùng cả tên lẫn khoa / file không ghi khoa | để trống — người dùng xử lý tay |

API trả `SoNguoiKhopTen` và `SoNguoiKhopKhoa` để FE giải thích vì sao một dòng chưa ánh xạ.

**Khoa của nhân viên**: mọi dòng `nhan_vien_chuc_vu` đang hiệu lực → `don_vi` là Khoa (`K_`),
hoặc Khoa cha nếu là Bộ môn — cùng cách `v_giang_vien_khoa` leo cây, nhưng **không** lọc 5
ngạch (tập ứng viên theo tên là mọi nhân viên đang hoạt động). Người kiêm nhiệm nhiều Khoa
khớp nếu **bất kỳ** Khoa nào trùng.

**So tên khoa**: `don_vi.ten_don_vi` lưu `"Khoa Kế toán"`, file ghi `"Kế toán"`. Tiền tố
`"Khoa "` chỉ được bỏ ở **phía DB** (`fn_gio_giang_tkb_khoa_so_sanh`), và phép so khớp chấp
nhận **cả** tên đầy đủ lẫn tên đã bỏ tiền tố. Cố ý **không** bỏ tiền tố ở phía C#: tên thật có
thể bắt đầu bằng chữ "Khoa" — `"Khoa học cơ bản"` (DB: `"Khoa Khoa học cơ bản"`) sẽ bị cắt
thành `"HOC CO BAN"` và không bao giờ khớp.

**Chuyển đổi từ khoá cũ (chỉ theo tên)**: ánh xạ cũ nhận `khoa_chuan = ''`, nên dữ liệu các
năm đã import (dòng tổng hợp cũ cũng có `khoa_chuan = ''`) vẫn khớp y nguyên. Từ lần import
đầu bằng file hai sheet, dòng tổng hợp có khoa → ánh xạ **tự động** được tạo lại, còn ánh xạ
**tay** cũ của những tên không tự khớp được phải gán lại **một lần** (`update_database.sql`
KT3 liệt kê chúng). Cố ý **không** làm ánh xạ "mọi khoa" (wildcard) để giữ công cũ: khi một
người mới trùng tên vào khoa khác, wildcard sẽ lặng lẽ cộng giờ của họ cho người cũ.

Đây là **đảo lại** quyết định ban đầu ("cố ý không tự ánh xạ") vì với file cả trường thì việc
bấm xác nhận từng người là hàng trăm lượt. Lý do cũ — *khớp tên là phỏng đoán, ghi nhầm sẽ
cộng giờ của người này cho người khác* — vẫn đúng, nên **ranh giới được giữ nguyên**: chỉ
diện khớp duy nhất mới bị đoán; trường hợp mơ hồ vẫn không.

#### Ràng buộc cứng: CHỈ THÊM, KHÔNG BAO GIỜ GHI ĐÈ

Cả hai đường ghi tự động (`sp_gio_giang_tkb_dong_bo` lúc import và
`sp_gio_giang_tkb_anh_xa_tu_dong` khi quét lại) đều dùng **một câu `INSERT ... WHERE NOT
EXISTS`** — chỉ thêm dòng còn thiếu.

Lý do: bảng này **không có** cột phân biệt "máy gắn" với "người gắn" (đã chốt là không thêm
`tu_dong`). Nếu đổi thành `MERGE` / `UPDATE`, một lần import lại sẽ kéo ánh xạ tay về người
khớp tên — xoá công sửa của người dùng mà không có cách nào biết. Hệ quả tốt kèm theo: chạy
bao nhiêu lần cũng vô hại, lần thứ hai trả về 0.

#### `fn_gio_giang_tkb_khop_ten` — một định nghĩa cho phép khớp

Bốn nơi cần biết "dòng này khớp ai": hai đường ghi ở trên, `sp_gio_giang_tkb_list` và
`sp_gio_giang_tkb_chi_tiet`. Trước đây mỗi nơi tự viết lại; nay tất cả gọi chung hàm này,
trả `(ho_ten_chuan, khoa_chuan, id_nhan_vien, so_nguoi_khop, so_nguoi_khop_khoa)`. Tham số
là `(@id_nam, @id_gio_giang_tkb)` — cả hai nullable = không lọc.

Nó là **multi-statement TVF** chứ không phải inline, có lý do: bên trong vật hoá tên so sánh
của nhân viên vào một table variable **một lần** rồi mới join. Để `fn_gio_giang_tkb_ten_so_sanh`
vào thẳng mệnh đề `JOIN` thì số lần gọi hàm là `N * M` thay vì `M`.

`nhan_vien` là **1 dòng / người** (PK `id_nhan_vien`, `uq_ma_nhan_vien`; kiêm nhiệm nằm ở
`nhan_vien_chuc_vu`) — nên `so_nguoi_khop > 1` đúng nghĩa là **hai người khác nhau trùng
tên**, không phải một người bị đếm hai lần.

`SoNguoiKhopTen` được trả ra API: với dòng chưa ánh xạ, `0` = không có ai tên này trong hệ
thống (sai chính tả / chưa có hồ sơ), `≥ 2` = trùng tên — xem tiếp `SoNguoiKhopKhoa`: `0` =
không ai trong số đó thuộc khoa này (hoặc file không ghi khoa), `≥ 2` = trùng cả tên lẫn
khoa, cần người chọn.

Hệ quả: `GoiYIdNhanVien` nay **gần như luôn null** — tên khớp duy nhất thì đã được gắn rồi.
Cột vẫn giữ (không phá hợp đồng API) và còn giá trị trong khoảng giữa hai lần quét, ví dụ
vừa thêm nhân viên mới mà chưa gọi `POST api/gio-giang-tkb/anh-xa/tu-dong`.

Ba tính chất làm nên giá trị của bảng này:

1. **Không gắn `id_nam`** → ánh xạ làm một lần dùng cho mọi năm.
2. **Không bị xoá khi import lại** → công sức ánh xạ tay không mất.
3. **Join lúc ĐỌC** (không lưu `id_nhan_vien` trên `gio_giang_tkb`) → sửa ánh xạ có hiệu lực
   **ngay**, không phải import lại file.

Một nhân viên có thể nhận **nhiều** cặp (tên, khoa) (file ghi không nhất quán giữa các kỳ
hoặc giữa hai sheet), nên **không** đặt UNIQUE trên `id_nhan_vien`, và
`sp_gio_giang_tkb_tong_hop` phải `SUM` chứ không lấy một dòng.

Mọi phép nối dòng tổng hợp ↔ ánh xạ đi qua **`fn_gio_giang_tkb_dong`** (list, chi tiết, tổng
hợp, bộ đếm `so_chua_anh_xa` của import) — một định nghĩa khoá ánh xạ duy nhất.

Hàm `fn_gio_giang_tkb_ten_so_sanh` chỉ làm **hai** việc: gộp khoảng trắng và đổi `Đ`/`đ`
(U+0110 / U+0111) thành `D`/`d`. Phần bỏ dấu thanh giao cho `COLLATE Latin1_General_CI_AI`
tại chỗ gọi — nếu không sẽ phải viết ~90 lệnh `REPLACE`. Riêng `Đ` là **chữ cái riêng** trong
tiếng Việt nên collation AI *không* gộp nó về `D`; bỏ bước này thì mọi họ "Đặng", "Đỗ" đều
không khớp được.

⚠️ Từ khi phép khớp này **ghi thẳng** vào `gio_giang_tkb_anh_xa` (chứ không chỉ sinh gợi ý
như trước), sai sót của hàm không còn "tốn một lần bấm" nữa mà thành **dữ liệu sai**: giờ của
người này cộng cho người khác. Sửa hàm phải cân nhắc theo chuẩn đó — nới lỏng phép khớp để
"khớp được nhiều hơn" là đúng cách tạo ra ánh xạ nhầm.

### 13.7. Import lại = ghi đè sạch, có chốt chặn

`sp_gio_giang_tkb_dong_bo` xoá toàn bộ `gio_giang_tkb` + `gio_giang_tkb_chi_tiet` của
`@id_nam` — **cả ĐH lẫn SĐH** — rồi chèn lại, trong **một** transaction (khuôn của
`sp_nckh_gio_nckh_dong_bo`). Vì vậy file **bắt buộc đủ hai sheet** (13.9): thiếu một sheet mà
vẫn chạy sẽ xoá sạch hệ đào tạo đó của năm.

**GUARD: TVP rỗng → KHÔNG xoá gì.** Nếu không, một file lỗi sẽ xoá sạch dữ liệu cũ.

Quyền: **ADMIN / HT** — import ghi đè cả năm nên không mở cho cấp Khoa. Ánh xạ thì mở tới
TK / TKL / TP, kể cả `sp_gio_giang_tkb_anh_xa_tu_dong`: thủ tục đó chỉ **thêm** ánh xạ, không
phá dữ liệu nào, nên không cần siết bằng cổng của import.

### 13.8. Tổng hợp — chỉ còn nguồn TKB

`sp_gio_giang_tkb_tong_hop` lấy tập giảng viên là người có dòng giờ giảng (sheet DH hoặc SDH)
**đã ánh xạ**. Trước 2026-09-30 tập này là HỢP với người có bản kê khai Phụ lục II đã chốt;
nguồn kê khai đã gỡ (mục 9) nên người chỉ có kê khai không còn xuất hiện.

RS2 trả giờ file tách sẵn `gio_tkb_dai_hoc` / `gio_tkb_sau_dai_hoc` (tổng = `gio_tkb` =
`tong_gio`). Ba cột Phụ lục II cũ `gio_ke_khai_duyet` / `gio_dai_hoc` / `gio_sau_dai_hoc` đã bỏ.

Dòng giờ giảng **chưa ánh xạ** không vào được bảng tổng hợp (không biết là ai). Số lượng những
dòng đó trả về ở `SoDongChuaAnhXa` — còn lớn hơn 0 nghĩa là **tổng hợp chưa đầy đủ**, FE
phải cảnh báo trước khi ai đó dùng số liệu.

Cổng quyền: ADMIN/HT toàn trường; TK/TKL/TP theo đơn vị mình giữ chức vụ
(+ cây con). Dùng `EXISTS` trên tập `DISTINCT` chứ **không** `JOIN`, để người kiêm nhiệm
nhiều đơn vị không bị nhân dòng.

### 13.9. File hai sheet DH + SDH và `LoaiHinhGiangDay`

| Ý nghĩa | Sheet `DH` | Sheet `SDH` | Cột DB |
|---|---|---|---|
| Kỳ học | `KY_HOC` | `KYHOC` | `ky_hoc` |
| Mã lớp | `MA_LOP_TIN_CHI` | `Lop` | `ma_lop_tin_chi` |
| Họ (lót) | `HoLot` | `Ho` | ghép vào `ho_ten` |
| Tên | `Ten` | `Ten` | ghép vào `ho_ten` |
| Học phần | `MA_HOC_PHAN`, `TEN_HOC_PHAN` | như DH | `ma_hoc_phan`, `ten_hoc_phan` |
| Sĩ số | `SLSV_DangKyHoc` | như DH | `slsv_dang_ky_hoc` |
| Số tiết | `SoTiet` | như DH | `so_tiet_trong_nam` |
| Loại hình | `LoaiHinhGiangDay` (**bắt buộc**) | `LoaiHinhGiangDay` (**tuỳ chọn**, hiện chưa có) | `giang_tieng_anh` |
| Khoa của GV | `TenKhoa` | `TenKhoa` | `ten_khoa`, `khoa_chuan` |

- `Helper/ExcelHelper.ReadGioGiangRows` tìm sheet theo **tên** (bỏ dấu, không phân biệt hoa
  thường) và tìm cột theo **alias** tiêu đề — một parser cho cả hai sheet. Thiếu sheet nào →
  400, thông báo liệt kê các sheet có trong file.
- Lọc kỳ học (13.2) áp dụng cho **cả hai** sheet. Một sheet có 0 dòng thuộc năm là hợp lệ
  (năm đó không mở lớp SĐH); cả hai cùng 0 dòng → 400.
- `LoaiHinhGiangDay` chỉ có hai giá trị: `"Tiếng Anh"` → `giang_tieng_anh = 1`; `"Tiếng
  Việt"`, ô trống hoặc sheet không có cột (SDH hiện tại) → 0. Giá trị khác → **lỗi dòng**, huỷ
  cả lần import (đoán ở đây là áp sai hệ số mà không ai biết). Khi bổ sung cột này vào sheet
  SDH thì không phải sửa code.
- `he_dao_tao` (`'DH'` / `'SDH'`, CHECK) ghi sheet nguồn của từng lớp. Dòng trùng
  (`TRUNG_LOP`) chỉ so trong cùng sheet.


### 13.10. Tỷ lệ hoàn thành giờ giảng + mã chấm tự động `GIO_GIANG_TY_LE`

```
ty_le_hoan_thanh (%) = tong_gio × 100 / dinh_muc_ap_dung
tong_gio             = giờ TKB + 2,5 × số ngày QNDB   (giờ kê khai Phụ lục II đã gỡ 2026-09-30)
dinh_muc_ap_dung     = định mức gốc khoản 3 (270) − miễn theo thời gian − giảm chức vụ
                       − giảm con nhỏ − công đoàn − giảm đặc biệt do HT (cột Y)
```

**Nguồn sự thật duy nhất:** hàm lõi `dbo.fn_gio_giang_ty_le_chi_tiet(@id_nhan_vien, @id_nam, @kem_dien_giai)`.
Hàm này sinh 1 dòng tổng (`loai_dong = 'T'`) và, khi `@kem_dien_giai = 1`, thêm các dòng diễn giải (`'D'`).
Không gọi trực tiếp hàm lõi mà dùng hai hàm bọc:

- `fn_gio_giang_ty_le_hoan_thanh(@id_nhan_vien, @id_nam)`: dòng tổng, luôn đúng 1 dòng. Không sinh diễn giải
  nên nhanh như trước.
- `fn_gio_giang_ty_le_dien_giai(@id_nhan_vien, @id_nam)`: các dòng diễn giải (xem mục "Diễn giải" bên dưới).
Có ba nơi đọc hàm này, nên không nơi nào lệch nhau:

- nhánh `GIO_GIANG_TY_LE` của `fn_nckh_diem_tu_dong`: chấm khi nộp phiếu, `POST api/phieu/{id}/tong-hop-tu-dong`
  và preview `GET api/maudanhgia/{id}/diem-tu-dong`;
- `sp_gio_giang_ty_le_hoan_thanh`, tức `GET api/gio-giang-tkb/ty-le-hoan-thanh`;
- tử số (C1) đi qua `fn_gio_giang_thuc_hien`, hàm mà `sp_gio_giang_tkb_tong_hop` cũng dùng. Đã đối chiếu: kết quả của SP
  trước và sau khi tách hàm giống hệt nhau. Từ 2026-09-30 hàm chỉ còn cộng giờ TKB đã ánh xạ (phần kê khai,
  `fn_gio_giang_ke_khai_dong` và dòng diễn giải `GIO_KE_KHAI` đã gỡ).

#### Quy tắc — đã chốt với người dùng (2026-09-27)

| Khoản | Nguồn | Quy tắc |
|---|---|---|
| Định mức gốc | `dinh_muc_giang_vien` theo `nhan_vien.id_chuc_danh` + năm | Chưa có chức danh hoặc chưa cấu hình định mức → `ty_le` NULL, 0 điểm |
| Chức vụ (tỷ lệ) | lịch sử `nhan_vien_chuc_vu` | Mỗi ngày lấy `ty_le_dinh_muc_giang` **thấp nhất** trong các chức vụ đang giữ (NULL = 1). `tu_ngay` được **bù** từ cột I của file khi cùng `id_chuc_vu` và I sớm hơn |
| Chức vụ (giờ cố định) | `chuc_vu.loai_giam_tru = 1` | Công đoàn 44h / 22h, cộng trên DISTINCT `id_chuc_vu`, **tỷ lệ theo thời gian giữ trên ngày làm việc**, nhân `(12 − E)/12` |
| a) Tập sự | K | Định mức = 0 trong thời gian tập sự. Chỉ miễn phần tập sự **trong năm** (vd K 01/07/2025–30/06/2026 → miễn 6 tháng 01/01–30/06/2026); phần còn lại tính **bình thường**, không cảnh báo trần 50% (chốt 2026-09-28) |
| b) Nghỉ | **O** (chuẩn), M–N, P | Xem "Khối miễn" bên dưới |
| c) Đào tạo | R–S, **mọi dòng**, không xét Q | Đào tạo tiến sĩ. Coi toàn bộ là tập trung → định mức = 0 trong khoảng đó. Q chỉ là trạng thái "còn đang học tại tháng 9". **Khối miễn chứa đào tạo làm tròn tới bội 0,5 gần nhất** (2026-09-28), xem "Làm tròn tháng đào tạo". **Thời gian đào tạo tính hoàn thành 100%**: miễn cả năm mà có đào tạo → `ty_le = 100`, `ly_do = DAO_TAO_TINH_100`, đủ điểm (2026-09-28) |
| d) Con 13–36 tháng | V | −10% định mức **gốc** (không phải định mức sau chức vụ), mỗi ngày tối đa một lần dù nhiều con |
| d) Con 7–12 tháng | V | −40 giờ **mỗi con**. Cửa sổ `[sinh + 6 tháng, sinh + 12 tháng − 1 ngày]`; chỉ trừ phần rơi vào **ngày làm việc** của năm, chia theo tháng lịch |
| d) Giới tính | `nhan_vien.gioi_tinh` | Có ngày ở cột V là áp dụng, trừ khi `gioi_tinh = 1` (Nam). NULL vẫn áp dụng |
| e) QNDB | X | 2,5 giờ / ngày **cộng vào `tong_gio`**, không trừ định mức |
| Giảm đặc biệt | Y (`gio_giam_dac_biet`) | Trừ thẳng số giờ |
| `ngoai_le_dinh_muc` | — | **Không** đọc, tránh trừ trùng với file |

**Đơn vị đo thời gian = tháng lịch** (`fn_so_thang_lich`): mỗi tháng đóng góp *số ngày được phủ / số ngày
của tháng*, tính **cả ngày cuối**. Ví dụ 01/01–30/06 = 6; 01/02–31/12 = 11.

#### Khối miễn — vì sao không cộng O với tập sự / đào tạo

Cột O của file là công thức Excel `DATEDIF(từ, đến, "m")`: số tháng tròn, **bỏ phần lẻ**, không tính ngày cuối.
Nó đo đúng **một** thứ: thời gian trước ngày P **hoặc** khoảng M–N trong năm. Kết luận này khớp 38/38 dòng
có O > 0 của file 23.9.2026. O **không** chứa tập sự, cũng **không** chứa đào tạo.

Ngày miễn = trước P | M–N | K | R–S. Các ngày miễn liên tiếp gộp thành **khối** (gaps-and-islands):

- **Khối chỉ gồm trước P / M–N** → số tháng = **O** (dùng nguyên văn). Ví dụ vào trường 17/07 → 6 tháng, không phải 6,52.
  Nếu O phải chia cho nhiều khối, chia theo tỷ lệ độ dài ngày. O trống → đo khối theo tháng lịch.
- **Khối có K hoặc R–S** → đo **cả khối** theo tháng lịch. Phần O nằm trong khối **không cộng thêm**.
  - Ca đã chốt: vào trường 10/02 (hoặc 24/03), tập sự đến 30/06, O = 1 (hoặc 2) → khối 01/01–30/06 = **6 tháng → 135**.
    Không cộng O, không nhân hệ số O, không tính theo ngày / 365.
  - 2140112: đào tạo từ 01/02, nghỉ 21/07–31/12 (O = 5) → khối 01/02–31/12 = **11 tháng**, không phải 16.

Lấy quy ước của O để đo khối có tập sự thì 01/01–30/06 chỉ ra **5** tháng, trái với ca đã chốt. Vì vậy hai quy ước
**cố ý** khác nhau.

`E` = tổng số tháng miễn; `M` = số tháng của năm (12).
- `E > M` → `ly_do = DU_LIEU_CAN_KIEM_TRA`, `canh_bao` có `THANG_MIEN_VUOT_NAM`. **Không** ép về 12.
- Không còn ngày làm việc nào, hoặc `E ≥ M` → `ly_do = MIEN_TOAN_BO`.
- Miễn cả năm như trên **mà có đào tạo** (còn ngày `D` sau phân bổ ưu tiên) → dòng tổng trả `ty_le_hoan_thanh = 100`,
  `ly_do = DAO_TAO_TINH_100` (chốt 2026-09-28: thời gian đào tạo tiến sĩ tính hoàn thành 100%). Ví dụ đào tạo
  01/09/2024–31/08/2028 → năm 2026 miễn 12 tháng → 100% → 20 điểm. Chỉ đổi ở dòng tổng: bên trong hàm vẫn là nhánh
  `MIEN_TOAN_BO` nên các cột `giam_*`, `dinh_muc_ap_dung = 0` và dòng diễn giải giữ nguyên. Tỷ lệ này **cố định**, không
  phải `tong_gio / dinh_muc_ap_dung`.
  - Gồm cả khối gộp (vd tập sự 6 tháng đầu năm rồi đi học 6 tháng cuối): không còn ngày làm việc, phần đào tạo tính 100%.
  - Miễn cả năm **không** có đào tạo (chỉ tập sự / nghỉ / trước ngày vào trường) vẫn là `MIEN_TOAN_BO`, không chấm tự động.
  - `DU_LIEU_CAN_KIEM_TRA` giữ nguyên, không chấm tự động.

#### Làm tròn tháng đào tạo (chốt với người dùng 2026-09-28)

R–S liên tục và mọi ngày trong đó đều là ngày miễn, nên toàn bộ đào tạo trong năm nằm trong **một** khối miễn.
Độ dài khối đó (tháng lịch) được **làm tròn tới bội 0,5 gần nhất**: phần lẻ < 0,25 → bỏ; 0,25–0,74 → 0,5;
≥ 0,75 → lên tháng tròn. Phần chênh tính vào **đào tạo**.

- Khối chỉ có đào tạo (thường gặp) → chính số tháng đào tạo được làm tròn. Ví dụ 2110223, đào tạo
  01/11/2022–01/12/2026 → trong năm 01/01–01/12/2026 = 11,03 → **11** → 270 × 11 / 12 = 247,5.
- Khối gộp đào tạo với tập sự / nghỉ / trước P → **tổng khối** tròn 0,5, đào tạo = khối − phần khác (phần khác đo theo
  ngày như cũ). Ví dụ 2140112: khối 01/02–31/12 = 11 (ca đã chốt) giữ nguyên; dòng đào tạo 5,65 + nghỉ 5,35. Làm tròn
  riêng phần đào tạo (5,65 → 5,5) sẽ phá tổng 11 đã chốt, nên **không** làm vậy.
- Phần làm tròn **lên** chỉ lấy từ thời gian còn lại của năm (`M − E` thô), nên không sinh `THANG_MIEN_VUOT_NAM` giả.
- `MIEN_TOAN_BO` vì không còn ngày làm việc: phần làm tròn **xuống** được tính lại vào đào tạo (không có ngày làm việc
  để trả), không rơi sang cột nghỉ / cột O.
- `DU_LIEU_CAN_KIEM_TRA` xét trên `E` **thô**; khi đó không làm tròn, để thấy số tháng thật vì sao vượt năm.
- Ngày đào tạo vẫn là ngày miễn: trung bình chức vụ / công đoàn / con 13–36 vẫn tính trên ngày làm việc, số tháng đưa
  vào công thức quy đổi theo `(M − E) / tháng làm việc` (cùng cơ chế với cột O).
- Chỉ đào tạo được làm tròn; tập sự / nghỉ / trước ngày vào trường / cột O giữ nguyên quy tắc.

#### Công thức phần còn lại

```
phan_con = (M − E) / M
tb       = trung bình (theo tháng lịch, trên NGÀY LÀM VIỆC) của MAX(0, ty_le_cv − 0,10 × co_con_13_36)
dinh_muc_ap_dung = MAX(0, goc × phan_con × tb − TB(giờ công đoàn) × phan_con − con nhỏ 40h − Y)
```

**Cột giải trình:** mỗi giờ giảm vào **đúng một** cột. Ngày miễn phân bổ theo ưu tiên
trước P → tập sự → nghỉ → đào tạo. Các cột là `giam_chua_vao_truong`, `giam_tap_su`, `giam_nghi`, `giam_dao_tao`,
`giam_chuc_vu`, `giam_con_nho_10`, `giam_cong_doan`, `giam_con_nho_40`, `giam_dac_biet_ht`, `dieu_chinh_san_0`
(≤ 0, là phần bị cắt khi sàn 0). Bất biến: `goc − Σ giam_* − dieu_chinh_san_0 = dinh_muc_ap_dung`, sai số làm tròn
≤ 0,01 / cột. `update_database.sql` KT4 kiểm tra bất biến này.

#### Thang điểm (`fn_nckh_diem_tu_dong`, tỷ lệ theo `@diem_toi_da`)

| Tỷ lệ | Điểm | Với 20 |
|---|---|---|
| ≥ 100% | `diem_toi_da` | 20 |
| > 75% và < 100% | × 0,75 | 15 |
| ≥ 50% và ≤ 75% | × 0,50 | 10 |
| < 50% | 0 | 0 |

- **Khác `NCKH_GIO_TY_LE` ở biên:** đúng 50% → 10 (NCKH ra 0); đúng 75% → 10.
- `ly_do` là `MIEN_TOAN_BO` hoặc `DU_LIEU_CAN_KIEM_TRA` → hàm trả **NULL** = không chấm tự động.
  Engine giữ điểm cũ; dòng chưa từng có điểm sẽ được chốt với điểm trống.
- `ly_do = DAO_TAO_TINH_100` đi kèm `ty_le = 100` → rơi vào bậc ≥ 100% → `diem_toi_da`. Nhánh chấm **không** phải sửa.
- `ty_le` NULL vì lý do khác (chưa có chức danh / định mức, định mức = 0) → **0**.

#### `canh_bao` (không chặn tính điểm)

| Mã | Nghĩa / việc phải làm |
|---|---|
| `CHUA_CO_DU_LIEU_GIAM_TRU` | Không có dòng file giảm trừ của năm → chỉ tính chức vụ |
| `CHUC_VU_DOI_TRONG_NAM` | Có chức vụ bắt đầu / kết thúc trong năm. Chức vụ **trước đó** chỉ có ở ghi chú tự do cột AA của file (vd "26/3/2018–27/8/2026: Trưởng khoa") → phải nhập tay qua API `nhanvienchucvu`, nếu không phần đầu năm tính sai |
| `THANG_MIEN_VUOT_NAM` | Đi kèm `DU_LIEU_CAN_KIEM_TRA` |

`TAP_SU_KIEM_TRA_TRAN_50` **đã bỏ** (2026-09-28): phần tập sự trong năm đã miễn, phần còn lại tính bình thường nên
không cần kiểm tra trần 50% bằng tay.

#### Hệ quả cần biết (dữ liệu 2026)

- 39 giảng viên đi học **cả năm** (kể cả 2100219 làm tròn lên 12) → `DAO_TAO_TINH_100`: tỷ lệ 100%, **đủ 20 điểm**
  (trước 2026-09-28 là `MIEN_TOAN_BO`, không chấm tự động). Dữ liệu 2026 không còn ai `MIEN_TOAN_BO`.
- Người được miễn **gần** trọn năm còn định mức rất nhỏ nên tỷ lệ phình lớn (vd miễn 11,5 tháng → định mức
  11,25 giờ). Đây là hệ quả đúng của quy tắc, không phải lỗi.
- Từ khi làm tròn tháng đào tạo: đi học **≥ 11,75 tháng** trong năm (đến khoảng 24/12 trở đi) → 12 tháng →
  miễn cả năm → `DAO_TAO_TINH_100`, 100%, đủ 20 điểm. Ví dụ 2100219 đi học đến 28/12 (11,90 → 12). Đi học
  < 0,25 tháng trong năm (kết thúc trước khoảng 08/01) → 0 tháng, không giảm.
- Tập sự vắt hai năm (vd 01/07/2025–30/06/2026): năm 2026 miễn 6 tháng (135 giờ), 6 tháng còn lại tính định mức bình
  thường, không còn cảnh báo `TAP_SU_KIEM_TRA_TRAN_50`.
- Nhân sự chưa có `dinh_muc_giang_vien` (Chuyên viên…, và `HDLD_HUU` năm 2026 chưa tạo định mức) →
  `CHUA_CAU_HINH_DINH_MUC`. Tiêu chí chỉ gắn cho mẫu giảng viên nên không ảnh hưởng.

#### Diễn giải — vì sao có từng con số

`GET api/gio-giang-tkb/ty-le-hoan-thanh?idNam=&idNhanVien=` trả thêm mảng `DienGiai` (RS3 của SP). **Chỉ** trả khi
có `idNhanVien`; gọi toàn trường thì không có, giống quy ước `MinhChung` của API xem trước điểm.

Mỗi dòng thuộc **đúng một** cột tổng theo `khoan_muc`:

| `khoan_muc` | Cột tổng | Một dòng là | Cột nguồn đáng chú ý |
|---|---|---|---|
| `DINH_MUC_GOC` | `dinh_muc_goc` | định mức theo chức danh | — |
| `CHUA_VAO_TRUONG` / `TAP_SU` / `NGHI` / `DAO_TAO` | `giam_*` tương ứng | một đoạn ngày liên tiếp cùng khối, cùng nguyên nhân | `nguon_*` = khoảng trong file (P / K / M–N / R–S), `khoi_*` = khối chứa đoạn |
| `CHUC_VU` | `giam_chuc_vu` | một đoạn liên tiếp cùng chức vụ áp dụng, cùng tỷ lệ | `ty_le`, `ten_nguon`, `nguon_*` = từ–đến giữ chức vụ |
| `CONG_DOAN` | `giam_cong_doan` | một đoạn giữ chức vụ giờ cố định | `gio_nam` |
| `CON_NHO_10` | `giam_con_nho_10` | một đoạn của một con trong tháng 13–36 | `ngay_sinh_con`, `nguon_*` = cửa sổ tháng 13–36 |
| `CON_NHO_40` | `giam_con_nho_40` | một con có cửa sổ tháng 7–12 giao với năm | `nguon_*` = cả cửa sổ, `mau_so` = độ dài cửa sổ |
| `DAC_BIET_HT` | `giam_dac_biet_ht` | cột Y | — |
| `DIEU_CHINH_SAN_0` | `dieu_chinh_san_0` | phần bị cắt khi sàn 0 | — |
| `GIO_TKB` | `gio_tkb` | một dòng `gio_giang_tkb` đã ánh xạ | `id_gio_giang_tkb` (mở `GET api/gio-giang-tkb/{id}/chi-tiet`), `so_lop`, `so_tiet` |
| `GIO_QNDB` | `gio_qndb` | cột X | `so_ngay` |

- **Bất biến:** tổng `so_gio` các dòng cùng `khoan_muc` = **đúng** cột tổng (phần lẻ làm tròn dồn vào dòng lớn
  nhất). `update_database.sql` KT5 kiểm tra; trên dữ liệu 2026 ra 0 dòng lệch.
- **Không tính lại quy tắc:** dòng diễn giải lấy từ chính bảng ngày / khối / biến của lần tính dòng tổng, trong cùng
  hàm lõi.
- **`so_thang` của `CHUC_VU` / `CONG_DOAN` / `CON_NHO_10`** là số tháng **đưa vào công thức**. Khi có khối lấy theo
  cột O (O làm tròn xuống), số tháng này được quy đổi theo O và `ghi_chu` có `QUY_DOI_THEO_COT_O`. Khi số tháng
  đào tạo đã làm tròn 0,5, `ghi_chu` có `QUY_DOI_THEO_LAM_TRON_DAO_TAO` (có thể có cả hai).
- **`so_thang` của `DAO_TAO`** là phần đào tạo **sau làm tròn khối**, chia theo độ dài đoạn. Khối chỉ có đào tạo → dòng
  hiện đúng số đã làm tròn (11). Khối gộp với tập sự / nghỉ (vd 2140112) → `khoi_so_thang` tròn 0,5, còn dòng đào tạo
  có thể lẻ. `ghi_chu` có `LAM_TRON_NUA_THANG` khi khác độ dài thật; `khoi_so_thang` là độ dài khối đã làm tròn.
- **`cong_thuc`**: biểu thức hiển thị sẵn, dấu phẩy thập phân (`fn_so_gon`), ví dụ `270 x 20% x 4,129 / 12 = 18,58`.
- **Các trường hợp đặc biệt:**
  - `ly_do = DU_LIEU_CAN_KIEM_TRA`: dòng thời gian vẫn có (`so_gio` NULL) để thấy vì sao số tháng miễn vượt năm.
  - `MIEN_TOAN_BO` (kể cả `DAO_TAO_TINH_100`): không sinh dòng chức vụ / công đoàn / con nhỏ 10% vì chúng đều bằng 0.

Mã `ghi_chu` (nối bằng `;`):

| Mã | Nghĩa |
|---|---|
| `DO_THEO_NGAY` | Đo theo ngày thực tế (tháng lịch) |
| `THEO_COT_O` | Khối chỉ gồm trước ngày vào trường / nghỉ → số tháng lấy từ cột O |
| `COT_O_KHONG_CONG_THEM` | Khối có tập sự / đào tạo chứa cả phần cột O đã đếm → O không cộng thêm |
| `COT_O_KHONG_CO_NGAY` | Cột O có giá trị nhưng file không có ngày tương ứng |
| `MIEN_TOAN_BO` | Phần O được nâng lên cho đủ cả năm (miễn toàn bộ) |
| `THANG_MIEN_VUOT_NAM` | Đi kèm `DU_LIEU_CAN_KIEM_TRA` |
| `QUY_DOI_THEO_COT_O` | Số tháng đã quy đổi theo cột O (xem trên) |
| `LAM_TRON_NUA_THANG` | Dòng `DAO_TAO`: số tháng khác độ dài thật do khối đào tạo đã làm tròn tới bội 0,5 |
| `QUY_DOI_THEO_LAM_TRON_DAO_TAO` | Số tháng đã quy đổi do làm tròn tháng đào tạo |
| `TU_NGAY_BU_TU_COT_I` | Ngày bắt đầu chức vụ lấy từ cột I của file (sớm hơn dữ liệu quan hệ) |
| `KIEM_NHIEM_LAY_TY_LE_THAP_NHAT` | Đang giữ thêm chức vụ khác; áp tỷ lệ thấp nhất |
| `NHIEU_CON_KHONG_CONG_DON` | Nhiều con cùng trong tháng 13–36; 10% chỉ tính một lần |
| `CUA_SO_VAT_NAM` | Cửa sổ tháng 7–12 vắt sang năm khác; chỉ trừ phần trong năm |
| `TRUNG_THOI_GIAN_MIEN` | Một phần cửa sổ trùng thời gian được miễn; phần đó không trừ |

#### Gắn vào tiêu chí KPI

Tạo tiêu chí qua API, **không** seed SQL: `loai_doi_tuong = 1`, `loai_nguon_diem = 2`,
`cong_thuc_tong_hop = 'GIO_GIANG_TY_LE'`, `diem_toi_da = 20`, `loai_thang_diem = 1` + 4 dòng `thang_diem`
20 / 15 / 10 / 0 để engine gán được `id_thang_diem_chon`. Phiếu tạo **trước** khi gán tiêu chí phải tạo lại.
Import lại file giảm trừ / TKB **không** tự sửa điểm đã ghi, phải gọi lại tổng hợp tự động.

---

## 14. HỌC VỤ SINH VIÊN — tốt nghiệp đúng hạn + cảnh báo học vụ (`sinh_vien_hoc_vu`, `canh_bao_hoc_vu`)

### 14.0. Vì sao có module này

KPI Khoa cần hai số liệu của Phòng Đào tạo: **tỷ lệ tốt nghiệp đúng hạn** và **tỷ lệ cảnh báo học vụ**.
Mỗi năm đánh giá upload 2 file Excel:

| File | Sheet | Cột | Endpoint |
|---|---|---|---|
| 1 — danh sách SV | `Sheet1` | MaKhoa, TenKhoa, namNhaphoc, maKhoahoc, LOP, MA_SINH_VIEN, hovaten, ThoiHoc, SO_HIEU_VAN_BANG_TOT_NGHIEP_CT1, NamTotNghiepNganh1 | `POST api/hoc-vu/import-sinh-vien` |
| 2 — cảnh báo học vụ | `Cảnh báo` | MSV, Họ, Tên, Ghi chú CB, số QĐ, số TB | `POST api/hoc-vu/import-canh-bao` |

- Cột tìm **theo tên header** đã chuẩn hoá (bỏ dấu, `Đ → d`, chữ thường, bỏ ký tự không phải chữ/số), không theo vị trí.
  Header được dò trong 10 dòng đầu. Workbook chỉ có 1 sheet mà sai tên thì vẫn dùng sheet đó.
- Ô rỗng **hoặc chữ `NULL`** = không có giá trị (file xuất từ hệ thống đào tạo ghi `NULL` dạng text).
- **Không lưu** Khoa `201`, `344` và lớp bắt đầu bằng `CTS` (lọc trong `sp_sinh_vien_hoc_vu_import`, đếm `ExcludedRows`).
  File 2 **chỉ lưu SV có trong `sinh_vien_hoc_vu`**: file chứa cả SV khoá trên (không cần xét) và SV
  Khoa 201 / 344 / lớp CTS (file không có MaKhoa/LOP để lọc) → bỏ qua, đếm `UnmatchedStudents` / `UnmatchedRows`.
  ⇒ **Import danh sách SV (File 1) trước.** Không SV nào khớp → trả 400, không xoá cảnh báo cũ.
  Import lại File 1 có thêm SV thì phải import lại File 2 để lấy cảnh báo của các SV đó.
- Quyền import / sửa ánh xạ: **ADMIN hoặc TP của `P_DTBDCL`** (`fn_hoc_vu_co_quyen_quan_ly`, cùng luật
  `sp_diem_tb_phan_hoi_sv_chot`).
- Quyền **xem** (`fn_hoc_vu_khoa_duoc_xem`, dùng chung cho `ty-le-khoa` và `sinh-vien`):
  ADMIN / TP@`P_DTBDCL` → mọi Khoa (kèm `TongQuan` đối soát toàn trường); **TK / TKL / TKK** → chỉ Khoa
  mình thực sự giữ chức vụ (qua `fn_pham_vi_don_vi`, kiêm nhiệm nhiều Khoa thấy đủ); người khác → 403.
  Chốt với người dùng: **không** gồm TP (trưởng phòng khác) và giảng viên.
- `GET api/hoc-vu/sinh-vien?loai=tot-nghiep|canh-bao` cho Khoa đối chiếu từng con số. `TrangThai` của mỗi SV
  dùng **đúng** định nghĩa của `fn_ty_le_hoc_vu_khoa`: 1 = vào tử số, 2 = trong mẫu số nhưng không vào tử số,
  3 = thôi học. Không keyword thì `SoTrangThai1 / (SoTrangThai1 + SoTrangThai2)` = tỷ lệ của Khoa.
  ⚠️ Sửa định nghĩa ở một bên phải sửa cả bên kia.

### 14.1. Khoá học suy ra từ `id_nam` — không hardcode

| id_nam | Tốt nghiệp đúng hạn (`nam_nhap_hoc = id_nam − 4`) | Cảnh báo (`nam_nhap_hoc` từ `id_nam − 3` đến `id_nam`) |
|---|---|---|
| 2026 | 2022 (khoá 48) | 2023–2026 (khoá 49–52) |
| 2027 | 2023 (khoá 49) | 2024–2027 (khoá 50–53) |

Dùng `nam_nhap_hoc`, **không** dùng `ma_khoa_hoc` (chỉ lưu thông tin). File có thêm khoá ngoài khoảng vẫn lưu nhưng không tính.

### 14.2. Công thức (`fn_ty_le_hoc_vu_khoa(@id_don_vi, @id_nam)` — nguồn sự thật duy nhất)

- `ty_le_tot_nghiep_dung_han = so_tot_nghiep_dung_han × 100 / (so_sv_khoa_tot_nghiep − so_thoi_hoc_khoa_tot_nghiep)`
  - tử số: SV khoá tốt nghiệp, `thoi_hoc = 0`, **có** `so_hieu_van_bang`. `nam_tot_nghiep` chỉ lưu tham khảo, không xét.
- `ty_le_canh_bao_hoc_vu = so_sv_bi_canh_bao × 100 / (so_sv_khoa_canh_bao − so_thoi_hoc_khoa_canh_bao)`
  - tử số: SV các khoá cảnh báo, `thoi_hoc = 0`, có ≥ 1 dòng `canh_bao_hoc_vu` **cùng `id_nam`**.
    Bị cảnh báo nhiều lần (CB lần 1, lần 2) vẫn đếm **1** SV.
- SV thôi học bị loại khỏi **cả tử lẫn mẫu** → tử không bao giờ vượt mẫu.
- Đơn vị: **phần trăm 0..100** (cùng quy ước `fn_ty_le_hoan_thanh_nckh_khoa`). Mẫu số 0 → **NULL**, khác 0%.
- Luôn trả **đúng 1 dòng** (aggregate không GROUP BY) → gọi từ `sp_phieu_dv_tong_hop_kpi` an toàn.

### 14.3. Upload lại / sang năm mới — đã chốt với người dùng

**Sinh viên: 1 MSSV = 1 bản ghi dùng chung mọi năm** (`UNIQUE (ma_sinh_vien)`), `MERGE` theo MSSV:

| Trường hợp | Xử lý |
|---|---|
| Có trong file, đã có trong bảng | UPDATE, `id_nam_cap_nhat = @id_nam` |
| Có trong file, chưa có | INSERT |
| Không có trong file, `id_nam_cap_nhat = @id_nam` | DELETE — upload lại cùng năm = thay toàn bộ phần của năm đó |
| Không có trong file, năm cũ hơn | **Giữ nguyên** (vd khoá 48 khi upload 2027 — còn cần để tính lại 2026) |
| Bản ghi có `id_nam_cap_nhat > @id_nam` | **Bỏ qua** (`SkippedNewerRows`) — file năm cũ không đè dữ liệu mới hơn |

- Trùng MSSV trong cùng file → giữ dòng xuất hiện **đầu tiên** (`dong_excel`), đếm `DuplicateRows`.
- File không còn dòng hợp lệ → **không thay đổi gì** (không xoá dữ liệu cũ).
- ⚠️ Hệ quả (người dùng đã chấp nhận): xem lại tỷ lệ năm cũ tính trên dữ liệu SV **mới nhất**.
  SV khoá 48 nhận bằng muộn trong file 2027 → tỷ lệ tốt nghiệp 2026 tăng. Điểm đã ghi vào phiếu thì không đổi.

**Cảnh báo học vụ: lưu theo `id_nam`** (cảnh báo là sự kiện của từng năm). Upload lại = xoá cảnh báo năm đó rồi chèn lại.

### 14.4. Ánh xạ MaKhoa → Khoa (`khoa_dao_tao_anh_xa`)

MaKhoa trong file (vd `202`) không khớp `don_vi.ma_don_vi` (`K_*`) → cần bảng ánh xạ, cùng khuôn `gio_giang_tkb_anh_xa` (13.6):

- **Không** gắn `id_nam`, **không** bị xoá khi import, JOIN **lúc đọc** → sửa ánh xạ có hiệu lực ngay, không phải import lại.
- Import tự **thêm** ánh xạ khi `TenKhoa` trùng **duy nhất** `ten_don_vi` của một Khoa đang hoạt động
  (cấp 2, mã `K_*`). Không khớp / khớp ≥ 2 → để trống, không đoán. **Không bao giờ ghi đè** ánh xạ đã có.
- Nhiều MaKhoa có thể về cùng một Khoa (Khoa gộp).
- Mã còn thiếu: `GET api/hoc-vu/anh-xa-khoa` (dòng chưa ánh xạ xếp đầu) → `POST api/hoc-vu/anh-xa-khoa`.
  Chưa ánh xạ = SV của mã đó **không được tính vào Khoa nào** (xem `TongQuan.SoSinhVienChuaAnhXa`).

### 14.5. Gắn vào phiếu đơn vị — 4 mã `HV_*`

`sp_phieu_dv_tong_hop_kpi` đọc `fn_ty_le_hoc_vu_khoa(@id_don_vi, @id_nam)` (`@id_don_vi` của **chính phiếu**)
và chấm **ĐẠT / KHÔNG ĐẠT** — đạt → đủ `diem_toi_da`, không đạt → 0, không có bậc trung gian:

| Mã | Đạt khi |
|---|---|
| `HV_TOT_NGHIEP_TREN_50_KHOA` | `ty_le_tot_nghiep_dung_han > 50` |
| `HV_CANH_BAO_DUOI_20_KHOA` | `ty_le_canh_bao_hoc_vu < 20` |
| `HV_TOT_NGHIEP_TREN_70_KHOA` | `ty_le_tot_nghiep_dung_han > 70` |
| `HV_CANH_BAO_DUOI_10_KHOA` | `ty_le_canh_bao_hoc_vu < 10` |

- So sánh **CHẶT** đúng văn bản: đúng 50% / 70% → 0đ; đúng 20% / 10% → 0đ.
- So trên tỷ lệ `DECIMAL(5,2)` của hàm — chính con số `ty-le-khoa` hiển thị — nên điểm và số hiển thị không lệch.
- Điểm đạt **BÁM `diem_toi_da`** (không hằng số) → đổi trọng số chỉ cần sửa tiêu chí, không sửa SP.
- **Tỷ lệ NULL → 0đ** (đã chốt với người dùng). ⚠️ Quan trọng nhất với 2 mã cảnh báo: không có số liệu
  **không** được coi là "< 20%" — đừng viết lại thành `NOT (ty_le >= 20)`, biểu thức đó cho NULL đạt đủ điểm.
- Nhánh nằm **TRƯỚC** guard `@so_phieu = 0` (không phụ thuộc phiếu thành viên).
- Result set trả thêm `TyLeTotNghiepDungHan`, `SoSvKhoaTotNghiep`, `SoThoiHocKhoaTotNghiep`, `SoTotNghiepDungHan`,
  `TyLeCanhBaoHocVu`, `SoSvKhoaCanhBao`, `SoThoiHocKhoaCanhBao`, `SoSvBiCanhBao`. Mẫu số = 0 ⇒ thiếu dữ liệu,
  FE dùng để phân biệt với "0% cảnh báo".
- Tiêu chí tạo qua API tiêu chí (`loai_doi_tuong = 3`, `loai_nguon_diem = 2`, `loai_thang_diem = 2`), **không seed SQL**.
  Phiếu tạo trước khi gán tiêu chí phải tạo lại. Import lại học vụ **không** tự sửa điểm đã ghi — phải tổng hợp lại.

---

## 15. GIẢM TRỪ ĐỊNH MỨC — import file "Mẫu giảm trừ" (`giam_tru_nhan_vien`, `giam_tru_con_nho`)

### 15.0. Vì sao có module này

File Excel "Mẫu giảm trừ" (Phòng TCHC) vừa là **danh sách toàn bộ CBVC hiện tại**, vừa chứa các thông tin để
**tính giảm trừ định mức** theo năm. `POST api/giam-tru/import` (multipart: `file` + `idNam`, **chỉ ADMIN**) làm
2 việc trong 1 transaction (`sp_giam_tru_nhan_vien_import`):

1. **Đồng bộ nhân sự**: tạo `nhan_vien` chưa có (theo `ma_nhan_vien`), cập nhật họ tên, chức danh
   (`nhan_vien_chuc_danh`) và đơn vị chính + chức vụ đang giữ (`nhan_vien_chuc_vu`, `la_chinh = 1`).
2. **Lưu NGUYÊN dữ liệu giảm trừ** theo (năm × nhân viên). Phép **tính** giảm trừ nằm ở
   `fn_gio_giang_ty_le_hoan_thanh` (§13.10), đọc thẳng hai bảng này lúc chấm.

### 15.1. Đọc file (`Helper/GiamTruExcelReader.cs`)

- Đọc **sheet đầu tiên**; 2 sheet sau ("Dữ liệu đi học", "Dữ liệu dân quân tự vệ") là bảng tham khảo, không đọc.
- Header **gộp 2 dòng** → cột đọc **theo vị trí cố định**, không theo tên. Dòng tiêu đề chỉ dùng để xác nhận
  đúng mẫu (cột B bắt đầu bằng "Mã", cột D = "Họ và tên").

| Cột | Nội dung | Lưu vào |
|---|---|---|
| B / C / D | Mã CBVC / Email / Họ và tên | `nhan_vien` |
| F / G / H | Đơn vị / Chức danh nghề nghiệp / Chức vụ | `id_don_vi` / `id_chuc_danh` / `id_chuc_vu` |
| I / J | Giữ chức vụ từ / đến ngày | `chuc_vu_tu_ngay` / `chuc_vu_den_ngay` |
| K | Tập sự / thử việc "dd/MM/yyyy - dd/MM/yyyy" | `tap_su_tu_ngay` / `tap_su_den_ngay` |
| M / N | Nghỉ từ / đến ngày | `nghi_tu_ngay` / `nghi_den_ngay` |
| O | Số tháng không làm việc trong năm | `so_thang_khong_lam_viec` |
| P | Ngày bắt đầu làm việc tại Trường | `ngay_bat_dau_lam_viec` |
| Q / R / S | Đi đào tạo TS (Có/Không) / bắt đầu / kết thúc | `di_dao_tao_tien_si` / `dao_tao_tu_ngay` / `dao_tao_den_ngay` |
| V | Ngày sinh con nhỏ (nhiều con cách nhau xuống dòng) | `giam_tru_con_nho` (1 dòng / con) |
| X | Số ngày huấn luyện / diễn tập QNDB, tự vệ | `so_ngay_huan_luyen_qndb` |
| Y | Giảm đặc biệt do Hiệu trưởng quyết định — giờ giảng (Z = giờ NCKH: **không** đọc) | `gio_giam_dac_biet` (từ 2026-09-27) |

- Ngày: ô ngày, số serial Excel, hoặc text `d/M/yyyy` (một số ô I/J là text do VLOOKUP).
- **J = "nay" / "đến nay" / "khi hết tuổi quản lý" → NULL = đang giữ, không thời hạn** (không cảnh báo).
  Text khác hoặc ngày sai (vd `31/2/2027`) → NULL + cảnh báo.
- Thiếu Mã CBVC / Họ tên / Đơn vị → **bỏ dòng**. Ô giảm trừ sai định dạng → **để trống + cảnh báo**, nhân viên
  vẫn được tạo. Cặp ngày ngược (đến < từ) → bỏ cả cặp + cảnh báo (bảng có CHECK `den >= tu`).
- Q = "Không" nhưng có R/S → lưu nguyên như file (Q là cờ "tính 2024–2026 tại tháng 9", không suy từ R/S).

### 15.2. Quy tắc đồng bộ — đã chốt với người dùng

- **Danh mục STRICT**: tên Đơn vị / Chức danh / Chức vụ phải khớp **đúng 1** mục đang hoạt động (so theo
  collation CSDL → không phân biệt hoa thường; C# đã trim + gộp khoảng trắng). Còn tên nào thiếu → **từ chối cả
  file**, không ghi gì, `ChiTiet` liệt kê tên thiếu. Người dùng tự bổ sung danh mục rồi import lại.
  "Trưởng khoa" chỉ khớp `TK` (không khớp `TKL`) — phân biệt khoa lớn để dành bước tính giảm trừ.
- **Nhân viên mới**: mật khẩu = `appSettings["ImportNhanVien:MatKhauMacDinh"]` (mặc định `123456`).
  Email trống / trùng người khác / trùng dòng trước → **vẫn tạo, email = NULL** (sẽ có đăng nhập bằng mã cán bộ).
- **Nhân viên đã có**: cập nhật họ tên, chức danh, đơn vị chính + chức vụ; **giữ nguyên email + mật khẩu**
  (chỉ điền email khi đang NULL).
- **Chức vụ đang giữ** = H khớp VÀ (I NULL hoặc ≤ hôm nay) VÀ (J NULL hoặc ≥ hôm nay). Hết hạn / chưa bắt đầu
  → chỉ là thành viên (`id_chuc_vu` NULL). Chức vụ đã hết (J < hôm nay, kể cả khi H trống) → thành viên từ J + 1.
- **Người đang giữ ADMIN ở đơn vị chính → không đụng `nhan_vien_chuc_vu`** (tránh tự khoá quyền Admin);
  vẫn cập nhật họ tên / chức danh / giảm trừ. Trả `GIU_ADMIN` trong `ChiTiet`.
- Thay đơn vị / chức vụ / chức danh: đóng dòng mở cũ (`den_ngay = hôm qua`; tạo trong ngày thì xoá), thêm dòng
  mới từ hôm nay. Có sẵn dòng kiêm nhiệm trùng (đơn vị, chức vụ) → nâng thành đơn vị chính (tránh `ux_nvcv_hieu_luc`).
- **Idempotent**: import lại cùng file không đổi `nhan_vien_chuc_vu` / `nhan_vien_chuc_danh`;
  dữ liệu giảm trừ của năm bị **ghi đè** (xoá rồi chèn lại).
- Nhân viên có trong DB mà không có trong file: **không xoá / không khoá** (chỉ đếm `NhanVienNgoaiFile`).
- **`capNhatNhanVien = false`** (field multipart tuỳ chọn, mặc định `true` → `@cap_nhat_nhan_vien`):
  **không** tạo / sửa `nhan_vien`, `nhan_vien_chuc_danh`, `nhan_vien_chuc_vu` — chỉ ghi đè dữ liệu giảm trừ
  của năm. Dòng có mã chưa tồn tại → **bỏ qua** (FK không cho lưu), liệt kê `KHONG_CO_NHAN_VIEN` trong
  `ChiTiet`, đếm `KhongCoNhanVien`. Danh mục strict chỉ xét các dòng được lưu (người mới chưa có tài khoản
  không chặn cả file). Không dòng nào khớp → 400 `EMPTY`, dữ liệu giảm trừ cũ giữ nguyên.

### 15.3. DB test — `App_Data/reset_nhan_vien_test.sql`

Muốn danh sách nhân viên **chỉ** gồm người trong file (DB test restore từ backup): chạy `update_database.sql`,
sửa `@ten_db_test` trong script reset rồi chạy trong SSMS, sau đó mới import.

- Guard: `DB_NAME()` phải bằng `@ten_db_test`; dừng nếu không còn ai giữ ADMIN.
- **Giữ** người đang giữ ADMIN (để còn đăng nhập gọi API import) cùng dòng đơn vị / chức danh của họ.
- **Xoá toàn bộ** dữ liệu nghiệp vụ gắn với con người (phiếu cá nhân / đơn vị, tờ trình, nhiệm vụ Khoa, kê khai,
  vi phạm, ngoại lệ định mức, giờ thực hiện, gia hạn, điểm TB phản hồi SV, ánh xạ tên TKB, giảm trừ).
- **Giữ** dữ liệu nguồn đã import (SV học vụ, cảnh báo, giờ giảng TKB, phản hồi SV, NCKH, ánh xạ Khoa, kỳ
  nhiệm vụ Khoa): chỉ SET NULL cột người import / đồng bộ / chốt.
- Lưới an toàn: quét mọi FK trỏ vào `nhan_vien`; còn dòng tham chiếu người sắp xoá (bảng mới chưa có trong
  script) → ROLLBACK và báo tên bảng. **Thêm bảng mới có FK tới `nhan_vien` thì bổ sung vào script này.**
- Sau reset: chốt lại điểm TB phản hồi SV; chạy lại tự ánh xạ giờ giảng TKB sau khi import nhân viên.

---

## 16. HOẠT ĐỘNG ĐÀO TẠO — P_DTBDCL GHI NHẬN (`hoat_dong_dao_tao`) → nguồn 4 tiêu chí chấm tự động của GV

### 16.0. Vì sao có module này

Bốn tiêu chí của mẫu đánh giá **giảng viên** đang do GV **tự nhập điểm**. Mỗi nội dung là **1 tiêu chí riêng**,
điểm = `diem_toi_da` của tiêu chí:

| Loại | `ma_loai` | Nội dung | Điểm |
|---|---|---|---|
| 1 | `CTDT_HOI_DONG` | Thành viên hội đồng xây dựng và rà soát CTĐT | 5 |
| 2 | `CTDT_TO_GIUP_VIEC` | Thành viên tổ giúp việc / tổ soạn thảo xây dựng CTĐT | 3 |
| 3 | `NCS_SP_TRUNG_GIAN` | Hướng dẫn NCS có các sản phẩm trung gian đạt yêu cầu | 5 |
| 4 | `NCS_BAO_VE_LA` | Hướng dẫn NCS bảo vệ thành công luận án tiến sĩ | 10 |

Người nắm số liệu gốc là **P_DTBDCL**, nên P_DTBDCL nhập danh sách GV tham gia theo năm, làm nguồn chấm tự động.

Đợt 2026-10-02 làm module nhập liệu (§16.1–16.5). Đợt 2026-10-02 #2 nối 4 tiêu chí vào engine chấm tự động và
chuyển các phiếu năm đã tạo (§16.6).

### 16.1. Bảng

- **`loai_hoat_dong_dao_tao`** — danh mục **cố định 4 dòng** (seed trong `schema.sql` / `update_database.sql`).
  - `ma_loai` đặt **trùng mã `cong_thuc_tong_hop`** của tiêu chí tương ứng, cùng mẹo với `nhom_vi_pham.ma_nhom` (§3.2.a) → không cần bảng ánh xạ.
  - `nhan_noi_dung` là nhãn của ô "Nội dung" trên form ("Tên chương trình đào tạo" / "Họ tên NCS – tên đề tài luận án").
- **`hoat_dong_dao_tao`** — **1 dòng = 1 GV × 1 hoạt động**. Một hội đồng 9 thành viên = 9 dòng; hai người cùng hướng dẫn 1 NCS = 2 dòng.
  - `id_nam` do người nhập chọn, **không** suy từ `ngay_quyet_dinh`. Ngày QĐ không bắt buộc và không bị chặn theo khoảng năm.
  - `nguon`: 1 = form, 2 = import Excel.
  - **Không lưu điểm.**
  - Xoá **mềm** (`da_xoa`, `id_nguoi_xoa`, `ngay_xoa`); CHECK `chk_hddt_xoa` giữ cặp `da_xoa` / `ngay_xoa` nhất quán.
- **`hoat_dong_dao_tao_nguoi_nhap`** — ủy quyền nhập liệu.
  - Filtered unique `ux_hddtnn_nv (id_nhan_vien) WHERE da_thu_hoi = 0`: mỗi người tối đa 1 ủy quyền còn hiệu lực.
  - Thu hồi = `da_thu_hoi = 1`, giữ dòng làm lịch sử; cấp lại = thêm dòng mới.
- **`lich_su_hoat_dong_dao_tao`** — theo convention `lich_su_*`, **không** dùng `nhat_ky`.
  - `hanh_dong`: 1 Ghi nhận · 2 Sửa (chỉ ghi khi thật sự đổi) · 3 Xoá · 4 Import Excel · 5 Cấp quyền nhập · 6 Thu hồi quyền nhập.
  - Với 5 / 6 thì `id_hoat_dong` NULL.
- Index:
  - `ix_hddt_nv_nam_loai (id_nhan_vien, id_nam, id_loai) WHERE da_xoa = 0` phục vụ `EXISTS` của engine (§16.6).
  - `ix_hddt_nam_loai` phục vụ màn danh sách.
  - Cả hai là filtered index ⇒ bắt buộc `SET QUOTED_IDENTIFIER ON` (§10.2).
- TVP:
  - `HoatDongDaoTaoGiangVienRow (id_nhan_vien PK)` — ghi nhận 1 hoạt động cho nhiều GV.
  - `HoatDongDaoTaoImportRow` — dòng Excel; cột `loi_dinh_dang` do C# điền.

### 16.2. Quy tắc nghiệp vụ — đã chốt với người dùng (2026-10-02)

1. **Chỉ tính 1 lần / năm**: có ≥ 1 dòng còn hiệu lực của (GV, năm, loại) → đủ `diem_toi_da` của tiêu chí; nhiều dòng **không** cộng thêm. Hiện thực ở §16.6.
2. **Chỉ ghi nhận cho giảng viên đang công tác tại Khoa** (`v_giang_vien_khoa`: GV / GVC / GVCC).
   - Khi **sửa** mà giữ nguyên GV thì không kiểm lại, nên GV đã nghỉ vẫn sửa được nội dung bản ghi cũ.
   - Đổi sang GV khác thì người mới phải đạt điều kiện này.
3. **Chống trùng trong SP** (không có unique index): không cho 2 dòng còn hiệu lực cùng (`id_nam`, `id_loai`, `id_nhan_vien`, `LTRIM(RTRIM(noi_dung))`).
   - So sánh theo **collation CSDL** (không phân biệt hoa / thường).
   - SP đọc dưới `UPDLOCK, HOLDLOCK` để hai request cùng lúc không cùng lọt.
4. **Bản ghi có hiệu lực ngay**, không có bước duyệt: P_DTBDCL là nơi nắm số liệu gốc.
5. **Ghi nhận nhiều GV = all-or-nothing** (`sp_hoat_dong_dao_tao_create`): một người không hợp lệ hoặc trùng thì không ghi ai. Message liệt kê tên.
6. **Sửa = thay toàn bộ** (PUT): trường tuỳ chọn bỏ trống = xoá giá trị.
   - Không có gì đổi (so `Latin1_General_BIN`, nên sửa hoa / thường cũng tính là đổi) → không UPDATE, không ghi lịch sử, `co_thay_doi = 0`. Cùng quy ước §7 / §9.3.

### 16.3. Phân quyền — `fn_hoat_dong_dao_tao_quyen` (inline TVF, luôn 1 dòng, fail-closed)

| Cột | Điều kiện | Được làm |
|---|---|---|
| `la_quan_ly` | ADMIN, hoặc TP / QTP **tại** `P_DTBDCL` | Toàn quyền + cấp / thu hồi ủy quyền |
| `duoc_nhap` | `la_quan_ly`, **hoặc** có ủy quyền chưa thu hồi **và** hôm nay vẫn thuộc P_DTBDCL | Thêm / sửa / xoá / import, picker GV, file mẫu |
| `xem_tat_ca` | `duoc_nhap`, hoặc HT | Xem toàn trường |

- Đọc tập (đơn vị, chức vụ) qua `fn_pham_vi_don_vi` (§10.6): người kiêm nhiệm TP P_DTBDCL mà đơn vị **chính** là Khoa vẫn được nhận đúng.
  - Luật `la_quan_ly` **chép** từ `fn_hoc_vu_co_quyen_quan_ly` chứ không gọi hàm đó, để hai module độc lập.
- **"Thuộc P_DTBDCL"** = `fn_hoat_dong_dao_tao_thuoc_phong`: có dòng `nhan_vien_chuc_vu` hiệu lực hôm nay tại P_DTBDCL (có hay không có chức vụ) và nhân viên đang hoạt động.
  - **Rời phòng ⇒ tự mất quyền**, không cần thu hồi.
  - Danh sách ủy quyền trả cờ `con_thuoc_phong` để TP thấy các ủy quyền đã "chết".
- Cấp quyền:
  - Người nhận phải đang thuộc phòng (`KHONG_THUOC_PHONG`).
  - Người đã có toàn quyền (TP / QTP / ADMIN) → `INVALID`.
  - Người được ủy quyền **không** cấp tiếp được (gate `la_quan_ly`).
- Gọi hàm quyền cho **người khác** thì truyền `@chuc_vu_jwt` / `@don_vi_jwt` = NULL, để bỏ nhánh tương thích JWT của `fn_pham_vi_don_vi`.
- **Phạm vi xem** (`_list`, `_get_by_id`):
  - `xem_tat_ca` → toàn trường.
  - TK / TKL / TKK → GV thuộc Khoa mình (`fn_hoat_dong_dao_tao_khoa_duoc_xem`, cùng luật nhánh hai của `fn_hoc_vu_khoa_duoc_xem`), tính mọi Khoa GV thuộc, kể cả kiêm nhiệm.
  - Người khác → chỉ bản ghi của chính mình. Danh sách không trả 403.
  - Bản ghi đã xoá chỉ người `xem_tat_ca` mở được.
- BLL **không** gate bằng `ma_chuc_vu` của JWT (cùng lý do §7): SP là nguồn sự thật.

### 16.4. Import Excel — `POST api/hoat-dong-dao-tao/import`

- C# (`Helper/HoatDongDaoTaoExcelReader.cs`, ExcelDataReader) đọc **sheet đầu tiên**.
  - Cột tìm **theo tên header** đã chuẩn hoá (bỏ dấu, chữ thường), dò trong 10 dòng đầu.
  - Cột bắt buộc: Loại, Mã nhân viên (hoặc "Mã NV" / "Mã CBVC"), Nội dung.
  - Cột tuỳ chọn: Họ tên, Số QĐ, Ngày QĐ (ô ngày, số serial hoặc `dd/MM/yyyy`), Ghi chú.
  - Tối đa 5000 dòng; bỏ dòng trống hoàn toàn.
  - Lỗi **định dạng** (ngày sai, chuỗi quá dài) **không bỏ dòng**: ghi vào `loi_dinh_dang` rồi vẫn gửi xuống SP, để có **một** bảng kết quả theo từng dòng.
- `sp_hoat_dong_dao_tao_import` **chỉ thêm, không ghi đè**. Import lại cùng file thì toàn bộ ra TRUNG, an toàn.
  - Mỗi dòng ra đúng một trong ba kết quả:
    - **LOI**: `DINH_DANG` · `LOAI_KHONG_HOP_LE` · `THIEU_MA_NHAN_VIEN` · `NHAN_VIEN_KHONG_TON_TAI` · `KHONG_PHAI_GIANG_VIEN` · `THIEU_NOI_DUNG`. Dòng giữ lỗi **đầu tiên** theo thứ tự này.
    - **TRUNG**: `TRUNG_DU_LIEU_CU` (trùng bản ghi còn hiệu lực) · `TRUNG_TRONG_FILE` (giữ dòng đầu tiên).
    - **THEM**.
  - Cột "Loại" nhận số thứ tự (1..4) hoặc `ma_loai`. GV khớp theo `ma_nhan_vien`.
  - Họ tên trong file lệch hệ thống → `canh_bao`, dòng **vẫn được thêm**.
  - `@chi_kiem_tra = 1` → chỉ trả báo cáo, không ghi.
- File mẫu: `GET api/hoat-dong-dao-tao/mau-import` (`ExcelHelper.WriteHoatDongDaoTaoMau`).
  - Sheet 1 chỉ có dòng tiêu đề; mã loại và dòng ví dụ ở sheet 2, để không bị import nhầm.
  - Tên cột lấy từ `HoatDongDaoTaoExcelReader.TenCotMau` ⇒ mẫu và reader không lệch nhau.

### 16.5. Mã lỗi + hợp đồng result set

- Mọi SP: **RS1** = `success` / `message` / `error_code` (+ cột đếm); dữ liệu chỉ phát khi `success = 1`.
- `_get_by_id`: RS2 bản ghi, RS3 lịch sử.
- `_import`: RS2 từng dòng.
- `_create`: RS2 id vừa tạo.
- HTTP:
  - `FORBIDDEN` → 403
  - `NOT_FOUND` → 404
  - `INVALID` → 400
  - `KHONG_PHAI_GIANG_VIEN` / `KHONG_THUOC_PHONG` → 422
  - `TRUNG_BAN_GHI` / `DA_DUOC_CAP` → 409
  - `DB_ERROR` → 500
- POST tạo mới trả 201.

### 16.6. Nối vào chấm tự động (đợt 2026-10-02 #2)

Dùng lại **khung chấm điểm tự động** (§4.2), cùng checklist với `NVK_PHAN_CONG_KHOA` (§7). Cả ba luồng có ngay:
chấm khi GV nộp phiếu, `POST api/phieu/{id}/tong-hop-tu-dong`, và preview `GET api/maudanhgia/{id}/diem-tu-dong`.

#### Engine và minh chứng — hai hàm, một vị từ

| Nơi | Thay đổi |
|---|---|
| `fn_nckh_diem_tu_dong` | 4 mã vào whitelist + **một** nhánh chung: `EXISTS` bản ghi `da_xoa = 0` của (`@id_nhan_vien`, `@id_nam`, `ma_loai = @cong_thuc`) → `@diem_toi_da`, không có → **0** |
| `fn_nckh_minh_chung_tu_dong` | Nhánh `loai_nguon = 9` ("Hoạt động đào tạo"): mỗi bản ghi một dòng |
| `sp_mau_danh_gia_diem_tu_dong` | Cờ `@co_tieu_chi_hddt`: gọi toàn trường thì mở rộng tập GV ra người có bản ghi trong năm. Không thêm result set |
| `MauDanhGiaService` (C#) | `LyDoDiemTuDong` khi điểm 0: "Phòng Đào tạo và Bảo đảm chất lượng chưa ghi nhận… chấm lại phiếu bằng chức năng Tổng hợp tự động" (từ §21 nằm ở `BLL/DiemTuDongDienGiai.cs`) |

- Chưa có bản ghi → **0**, không phải NULL. NULL ở hàm này nghĩa là "mã chưa hỗ trợ", khi đó engine giữ điểm cũ.
- Khoá theo `@id_nhan_vien`, **không đọc `@quy`**: giảng viên chỉ có phiếu năm. `ApDungQuy` của 4 mã = false.
- **Bất biến:** vị từ lọc (`id_nhan_vien` + `id_nam` + `da_xoa = 0` + `ma_loai`) giống hệt nhau ở hai hàm. Lệch nhau thì FE thấy
  minh chứng mà điểm 0, hoặc ngược lại.
- Dòng minh chứng 9:
  - `ma_nguon` = `id_hoat_dong`, FE mở bằng `GET api/hoat-dong-dao-tao/{id}`.
  - `tieu_de` = `noi_dung`.
  - `mo_ta` = tên loại + số / ngày QĐ + ghi chú.
  - `ngay` = `ngay_quyet_dinh`, **có thể NULL**.
  - Nhiều dòng vẫn chỉ đủ điểm một lần.
- Phiếu GV kiêm nhiệm 2 Khoa: áp quy tắc "phiếu nhận điểm tự động" như mọi mã khác (§4.1).

#### Tiêu chí

- 4 tiêu chí đặt `loai_nguon_diem = 2`, `cong_thuc_tong_hop = ma_loai`, `loai_thang_diem = 1`.
- `thang_diem` phải có mức `= diem_toi_da` và mức `= 0`, để engine gán được nhãn (`id_thang_diem_chon`).
  - Script chỉ **thêm** mức còn thiếu, nối tiếp `MAX(thu_tu_hien_thi)`.
  - Mức cũ giữ nguyên, vì có thể đang được `chi_tiet_danh_gia` cũ tham chiếu. Engine không bao giờ gán mức khác hai giá trị trên.
- Không có cột mã trên `tieu_chi_danh_gia`, nên `update_database.sql` (PHẦN 1) xác định tiêu chí theo thứ tự:
  1. Id điền tay trong `#hddt_cau_hinh`.
  2. Tiêu chí đã chấm tự động với mã đó (admin sửa qua API, hoặc lần chạy trước).
  3. Dò theo **tên**, trong các tiêu chí GV đang hoạt động và còn chấm tay. Phải khớp **đúng 1**.
  - Không xác định được thì script in danh sách tiêu chí GV rồi **dừng trước khi đổi gì**.

#### Phiếu đã tạo — chuyển 4 dòng sang tự động

`chi_tiet_danh_gia` snapshot `loai_nguon_diem` / `cong_thuc_snapshot` lúc tạo phiếu, và engine **không** đồng bộ lại phiếu cũ.
Đã chọn cách **script chuyển dòng**, không xoá / tạo lại phiếu: tạo lại thì GV mất điểm tự chấm của mọi tiêu chí khác.

| Phạm vi | Xử lý |
|---|---|
| Phiếu năm, chưa xoá, năm **chưa đóng** (`nam_danh_gia.trang_thai <> 3`), phiếu **1 / 2**, dòng **1 / 2** | **Chuyển** |
| Dòng `DA_CHOT` (đơn vị thẩm định đã chốt) | Giữ chấm tay — không lật quyết định đã có |
| Phiếu 3 / 4 / 5 | Giữ chấm tay |
| Năm đã đóng | Giữ chấm tay |

- Mọi dòng giữ chấm tay ở năm chưa đóng được liệt kê ở KT3 để xử lý tay (TK trả dòng về thẩm định / mở lại phiếu).
- Dòng được chuyển có hình dạng như dòng tự động vừa seed:
  - `loai_nguon_diem = 2`, `cong_thuc_snapshot = ma_loai`, `trang_thai_dong = 1`.
  - Xoá sạch cột cấp 1 / 2 / 3, `diem_chinh_thuc`, yêu cầu trả về đang mở và `id_don_vi_tham_dinh`.
  - Xoá cả `diem_truong*`: công thức tổng `COALESCE(diem_chinh_thuc, diem_truong, …)` sẽ nhặt lại số cũ nếu để sót.
  - `so_lan_tra_ve` giữ nguyên (cộng dồn cả vòng đời).
- Vết audit: dòng có điểm cũ được ghi `lich_su_cham_diem` (cap 1, `hanh_dong = 2`, `diem` NULL, `nhan_xet` chứa điểm tự chấm / thẩm định cũ).
- **Minh chứng GV đã đính kèm giữ nguyên.** Không xoá file của người dùng; dòng tự động không đọc chúng.
- Phiếu được chuyển cập nhật `ngay_cap_nhat`, nên ai đang mở phiếu phải tải lại.
- Phiếu 2 vẫn ở 2, vì còn dòng chưa chốt. Bất biến 2 ↔ 3 (§4) giữ nguyên.
- KT2b liệt kê GV **đã tự chấm > 0 mà P_DTBDCL chưa có bản ghi**: gửi danh sách này cho P_DTBDCL đối chiếu.

#### Chấm ngay hay chờ — mặc định CHỜ (`cham_ngay = 0`)

- Bẫy nếu chấm ngay:
  - Chấm ngay lúc P_DTBDCL chưa nhập xong sẽ cho 0.
  - Nếu mọi dòng khác của phiếu đã chốt, phiếu nhảy 2 → 3.
  - `sp_phieu_tong_hop_tu_dong` chỉ nhận phiếu 1 / 2, nên điểm 0 bị **đóng băng**.
- Vì vậy mặc định chỉ chuyển dòng. Dòng tự động của phiếu 2 nằm ở `trang_thai_dong = 1` chờ engine.
  - Phiếu không lên 3 được, nên TK không chốt nhầm điểm 0.
  - Nộp lại / hàng đợi thẩm định / huỷ nộp đều đã loại dòng `loai_nguon_diem = 2`, không ai chạm tới chúng.
- P_DTBDCL nhập xong thì làm **một trong hai**:
  - Đặt `cham_ngay = 1` rồi chạy lại cả `update_database.sql`. PHẦN 5 chấm mọi phiếu 2 có 4 mã, mỗi phiếu một transaction,
    kết quả ở KT4. Đây cũng là đường **tổng hợp lại hàng loạt** cho các lần nhập bổ sung sau.
  - Khoa bấm `POST api/phieu/{id}/tong-hop-tu-dong` từng phiếu.
- Phiếu 1 không cần làm gì: engine tự chấm khi GV nộp.
- **Còn mở:**
  - Chưa có endpoint tổng hợp lại hàng loạt.
  - Phiếu GV nộp **sau** đợt này vẫn chấm ngay lúc nộp, theo hành vi chung của engine. Nếu P_DTBDCL chưa nhập thì cùng bẫy
    đóng băng ở trạng thái 3 như NVK / TTVT.

---

## 17. THÀNH TÍCH ĐOÀN THỂ — TT P_TCTD GHI NHẬN (`thanh_tich_doan_the`) → nguồn 2 tiêu chí chấm tự động của GV

### 17.0. Vì sao có module này

Hai tiêu chí của mẫu đánh giá **giảng viên** đang do GV **tự nhập điểm**. Mỗi nội dung là **1 tiêu chí riêng**,
điểm = `diem_toi_da` của tiêu chí:

| Loại | `ma_loai` | Nội dung |
|---|---|---|
| 1 | `TTDT_HUY_CHUONG` | Đạt huy chương Đồng trở lên trong các chương trình thể thao, văn nghệ, Đoàn thể cấp ĐHĐN trở lên |
| 2 | `TTDT_GHI_NHAN_NGOAI` | Được tổ chức, cơ quan ngoài DUE và UD ghi nhận thành tích trong hoạt động xã hội, đoàn thể, cộng đồng (minh chứng: bằng khen / giấy khen UBND cấp xã, phường trở lên và tương đương) |

Người nắm số liệu gốc là **Tổ trưởng (TT) của P_TCTD**, nên TT nhập danh sách GV đạt thành tích theo năm, làm nguồn
chấm tự động. Đợt 2026-10-03 làm cả module nhập liệu lẫn phần nối engine. Thiết kế **nhân bản §16** (Hoạt động đào tạo),
bỏ phần ủy quyền. Tiền tố `TTDT_` = **T**hành **T**ích **Đ**oàn **T**hể.

### 17.1. Bảng

- **`loai_thanh_tich_doan_the`** — danh mục **cố định 2 dòng**.
  - `ma_loai` đặt **trùng mã `cong_thuc_tong_hop`** (cùng mẹo §16.1) → không cần bảng ánh xạ.
- **`thanh_tich_doan_the`** — **1 dòng = 1 GV × 1 thành tích**. Một đội 5 GV đạt HC Đồng = 5 dòng.
  - Cột giống `hoat_dong_dao_tao`, thêm **`co_quan_ghi_nhan`** (cấp / cơ quan khen, vd "ĐHĐN", "UBND phường …"), vì cả
    hai tiêu chí đều xét theo cấp khen. Không bắt buộc.
  - `id_nam` do người nhập chọn, không suy từ `ngay_quyet_dinh`. `nguon`: 1 form, 2 import Excel. **Không lưu điểm.**
  - Xoá **mềm**; CHECK `chk_ttdt_xoa` giữ cặp `da_xoa` / `ngay_xoa` nhất quán.
- **`lich_su_thanh_tich_doan_the`** — `hanh_dong`: 1 Ghi nhận · 2 Sửa (chỉ ghi khi thật sự đổi) · 3 Xoá · 4 Import Excel.
  Không có ủy quyền nên `id_thanh_tich` **NOT NULL**.
- Index lọc `WHERE da_xoa = 0`: `ix_ttdt_nv_nam_loai` (EXISTS của engine), `ix_ttdt_nam_loai` (màn danh sách) — bắt buộc
  `SET QUOTED_IDENTIFIER ON` (§10.2).
- TVP: `ThanhTichDoanTheGiangVienRow`, `ThanhTichDoanTheImportRow` (có `co_quan_ghi_nhan`).

### 17.2. Quy tắc nghiệp vụ — đã chốt với người dùng (2026-10-03)

1. **Chỉ giảng viên** (phiếu năm, loại đối tượng 1). Không có chiều quý; `ApDungQuy = false`.
2. **Chỉ tính 1 lần / năm**: có ≥ 1 dòng còn hiệu lực của (GV, năm, loại) → đủ `diem_toi_da`; nhiều dòng không cộng thêm.
3. Còn lại **giống hệt §16.2 mục 2–6**: chỉ GV đang công tác tại Khoa (`v_giang_vien_khoa`); chống trùng trong SP theo
   (`id_nam`, `id_loai`, `id_nhan_vien`, `LTRIM(RTRIM(noi_dung))`) dưới `UPDLOCK, HOLDLOCK`; bản ghi có hiệu lực ngay;
   ghi nhận nhiều GV all-or-nothing; PUT thay toàn bộ, không đổi gì (`Latin1_General_BIN`) → `co_thay_doi = 0`.
4. **Tiêu chí không do script sửa**: 2 tiêu chí đã có trong mẫu GV, người dùng tự đặt `loai_nguon_diem = 2` +
   `cong_thuc_tong_hop = ma_loai` trong DB. Script cũng **không** chuyển dòng của phiếu đã tạo (khác §16.6).

### 17.3. Phân quyền — `fn_thanh_tich_doan_the_quyen` (inline TVF, luôn 1 dòng, fail-closed)

| Cột | Điều kiện | Được làm |
|---|---|---|
| `duoc_nhap` | ADMIN, hoặc chức vụ `TT` **tại** `P_TCTD` | Thêm / sửa / xoá / import, picker GV, file mẫu |
| `xem_tat_ca` | `duoc_nhap`, hoặc HT | Xem toàn trường |

- Đọc tập (đơn vị, chức vụ) qua `fn_pham_vi_don_vi` (§10.6): người kiêm nhiệm TT P_TCTD mà đơn vị chính khác vẫn được
  nhận đúng. Rời tổ (dòng `nhan_vien_chuc_vu` hết hiệu lực) → tự mất quyền.
- **Không có ủy quyền** (khác §16.3) — chốt với người dùng.
- `N'TT'` / `N'P_TCTD'` viết cứng ở **một** chỗ duy nhất: hàm này. `update_database.sql` KT1 / KT2 báo nếu hai mã chưa có
  trong `chuc_vu` / `don_vi` hoặc chưa ai giữ chức vụ — khi đó chỉ ADMIN nhập được.
- Phạm vi xem (`_list`, `_get_by_id`) giống §16.3: TK / TKL / TKK xem GV thuộc Khoa mình
  (`fn_thanh_tich_doan_the_khoa_duoc_xem` — **chép** chứ không gọi hàm của §16); người khác chỉ xem bản ghi của mình.
- BLL **không** gate bằng `ma_chuc_vu` của JWT: SP là nguồn sự thật.

### 17.4. Import Excel — `POST api/thanh-tich-doan-the/import`

Giống §16.4, khác ở:
- `Helper/ThanhTichDoanTheExcelReader.cs`: thêm cột **tuỳ chọn** "Cơ quan ghi nhận" (alias: "Cơ quan khen (thưởng)",
  "Cấp khen (thưởng)"), tối đa 255 ký tự.
- Cột "Loại" nhận số thứ tự (**1..2**) hoặc `ma_loai`.
- File mẫu `GET api/thanh-tich-doan-the/mau-import` (`ExcelHelper.WriteThanhTichDoanTheMau`), tên cột lấy từ
  `ThanhTichDoanTheExcelReader.TenCotMau`.
- Kết quả từng dòng: LOI / TRUNG / THEM, cùng bộ mã lỗi §16.4.

### 17.5. Mã lỗi + HTTP

`FORBIDDEN` 403 · `NOT_FOUND` 404 · `INVALID` 400 · `KHONG_PHAI_GIANG_VIEN` 422 · `TRUNG_BAN_GHI` 409 · `DB_ERROR` 500.
POST tạo mới trả 201. Hợp đồng result set như §16.5.

### 17.6. Nối vào chấm tự động

| Nơi | Thay đổi |
|---|---|
| `fn_nckh_diem_tu_dong` | 2 mã vào whitelist + **một** nhánh: `EXISTS` bản ghi `da_xoa = 0` của (`@id_nhan_vien`, `@id_nam`, `ma_loai = @cong_thuc`) → `@diem_toi_da`, không có → **0** |
| `fn_nckh_minh_chung_tu_dong` | Nhánh `loai_nguon = 10` ("Thành tích đoàn thể"): mỗi bản ghi một dòng; `ma_nguon` = `id_thanh_tich`, `tieu_de` = `noi_dung`, `mo_ta` = tên loại + cơ quan ghi nhận + số / ngày QĐ + ghi chú, `ngay` = `ngay_quyet_dinh` (có thể NULL) |
| `sp_mau_danh_gia_diem_tu_dong` | Cờ `@co_tieu_chi_ttdt`: gọi toàn trường thì mở rộng tập GV ra người có bản ghi trong năm |
| `MauDanhGiaService` (C#) | `LyDoDiemTuDong` khi điểm 0: "Tổ trưởng Tổ Công tác Đảng - Đoàn thể chưa ghi nhận… chấm lại phiếu bằng chức năng Tổng hợp tự động" (từ §21 nằm ở `BLL/DiemTuDongDienGiai.cs`) |

- **Bất biến:** vị từ lọc (`id_nhan_vien` + `id_nam` + `da_xoa = 0` + `ma_loai`) giống hệt nhau ở hai hàm.
- Không đọc `@quy`. `sp_phieu_quy_create` / tripwire phiếu năm VC **không** mở cổng cho 2 mã (chỉ dùng cho GV).
- Cả ba luồng có ngay khi tiêu chí mang mã: chấm khi GV nộp phiếu, `POST api/phieu/{id}/tong-hop-tu-dong`, preview
  `GET api/maudanhgia/{id}/diem-tu-dong`.

#### Việc người dùng tự làm với tiêu chí

- Đặt `loai_nguon_diem = 2`, `cong_thuc_tong_hop = N'TTDT_HUY_CHUONG'` / `N'TTDT_GHI_NHAN_NGOAI'` cho 2 tiêu chí GV.
- `loai_thang_diem = 1` → `thang_diem` phải có mức `= diem_toi_da` và mức `= 0` để engine gán được `id_thang_diem_chon`
  (KT4 của `update_database.sql` báo mức thiếu).
- **Phiếu đã tạo không nhận mã mới** (`chi_tiet_danh_gia` snapshot `loai_nguon_diem` / `cong_thuc_snapshot`). KT5 liệt kê
  các dòng còn chấm tay ở năm chưa đóng; muốn chuyển thì tạo lại phiếu hoặc dùng cách §16.6 PHẦN 4.
- Thêm / sửa / xoá bản ghi **không** tự chấm lại phiếu: gọi `POST api/phieu/{id}/tong-hop-tu-dong`. Phiếu GV nộp trước khi
  TT nhập xong cùng bẫy "đóng băng điểm 0 ở trạng thái 3" như §16.6.

---

## 18. PHÁT TRIỂN ĐỘI NGŨ — P_TCHC GHI NHẬN (`phat_trien_doi_ngu`) → nguồn 3 tiêu chí chấm tự động của GV

### 18.0. Vì sao có module này

Ba tiêu chí của mẫu đánh giá **giảng viên** đang do GV **tự nhập điểm**. Mỗi nội dung là **1 tiêu chí riêng**; đạt thì
được **trọn** `diem_toi_da` của tiêu chí:

| Loại | `ma_loai` = mã công thức | Nội dung |
|---|---|---|
| 1 | `PTDN_DANH_HIEU_NHA_GIAO` | Được phong tặng danh hiệu Nhà giáo Nhân dân, Nhà giáo Ưu tú |
| 2 | `PTDN_NGACH_HOC_HAM_HOC_VI` | Được bổ nhiệm ngạch / học hàm, học vị (GVC, GVCC, TS, PGS, GS) |
| 3 | `PTDN_BOI_DUONG` | Hoàn thành các khoá học bồi dưỡng phát triển đội ngũ quan trọng (theo danh mục đính kèm, vd trung cấp / cao cấp lý luận chính trị) |

Người nắm số liệu gốc là **P_TCHC**, nên P_TCHC (và người được TP / QTP ủy quyền) nhập danh sách GV theo năm, làm nguồn
chấm tự động. Đợt 2026-10-03 #2 làm cả module nhập liệu lẫn phần nối engine. Thiết kế **nhân bản §16** (Hoạt động đào
tạo, **có** ủy quyền), thêm **danh mục hạng mục**. Tiền tố `PTDN_` = **P**hát **T**riển **Đ**ội **N**gũ.

Vì sao không suy từ dữ liệu sẵn có: `nhan_vien_chuc_danh` có lịch sử GV / GVC / GVCC nhưng **không** có học vị / học hàm
(§12.1 — chưa có bảng nào lưu), danh hiệu nhà giáo và khoá bồi dưỡng cũng không có nguồn. Nhập tay một chỗ cho cả ba loại
nhất quán hơn.

### 18.1. Bảng

- **`loai_phat_trien_doi_ngu`** — danh mục **cố định 3 dòng**.
  - `ma_loai` đặt **trùng mã `cong_thuc_tong_hop`** (cùng mẹo §16.1) → không cần bảng ánh xạ.
  - `nhan_noi_dung` = nhãn ô "Chi tiết" (tuỳ chọn) trên form.
  - `cho_them_hang_muc = 1` chỉ ở loại 3: TP / QTP P_TCHC được thêm / sửa / ngừng dùng hạng mục.
- **`hang_muc_phat_trien_doi_ngu`** — danh mục hạng mục của từng loại.
  - Seed 9 dòng: loại 1 `NGND`, `NGUT`; loại 2 `NGACH_GVC`, `NGACH_GVCC`, `HOC_VI_TS`, `HOC_HAM_PGS`, `HOC_HAM_GS`
    (`la_co_dinh = 1` — nêu đích danh trong câu chữ tiêu chí, không sửa / ngừng dùng được); loại 3 `LLCT_TRUNG_CAP`,
    `LLCT_CAO_CAP` (`la_co_dinh = 0`).
  - `ma_hang_muc` **tuỳ chọn** (filtered unique `ux_hmptdn_ma`), chỉ chữ không dấu / số / `_`, lưu IN HOA; dùng cho cột
    "Hạng mục" khi import. Tên không trùng trong cùng loại — kiểm trong SP theo collation CSDL dưới `UPDLOCK, HOLDLOCK`.
  - `dang_su_dung = 0`: không chọn được cho bản ghi mới; bản ghi cũ giữ nguyên và **vẫn tính điểm**. **Không xoá cứng.**
  - `uq_hmptdn_id_loai (id_hang_muc, id_loai)` là đích của **FK kép** từ `phat_trien_doi_ngu`.
- **`phat_trien_doi_ngu`** — **1 dòng = 1 GV × 1 hạng mục**.
  - `id_loai` lưu denormalize; FK kép `(id_hang_muc, id_loai)` giữ nó luôn khớp hạng mục ⇒ `EXISTS` của engine và index
    giống hệt §16 (`id_nhan_vien, id_nam, id_loai`).
  - `noi_dung` **NULL được** (khác §16): hạng mục đã nói đạt cái gì; ô này chỉ ghi thêm đợt / chuyên ngành / khoá / cơ sở
    đào tạo. CHECK `chk_ptdn_noi_dung` cấm chuỗi rỗng.
  - `id_nam` do người nhập chọn, không suy từ `ngay_quyet_dinh`. `nguon`: 1 form, 2 import Excel. **Không lưu điểm.**
  - Xoá **mềm**; CHECK `chk_ptdn_xoa`.
- **`phat_trien_doi_ngu_nguoi_nhap`** — ủy quyền nhập liệu, clone `hoat_dong_dao_tao_nguoi_nhap` (filtered unique
  `ux_ptdnnn_nv WHERE da_thu_hoi = 0`; thu hồi giữ dòng; cấp lại = dòng mới).
- **`lich_su_phat_trien_doi_ngu`** — `hanh_dong`: 1 Ghi nhận · 2 Sửa · 3 Xoá · 4 Import · 5 Cấp quyền nhập · 6 Thu hồi quyền
  nhập · 7 Thêm hạng mục · 8 Sửa hạng mục.
  - 1..4: `id_ban_ghi` + `id_hang_muc` (sau thao tác) + `id_nhan_vien` (GV).
  - 5 / 6: chỉ `id_nhan_vien` (người được cấp). 7 / 8: chỉ `id_hang_muc`.
- Index lọc `WHERE da_xoa = 0`: `ix_ptdn_nv_nam_loai` (EXISTS của engine), `ix_ptdn_nam_loai` (màn danh sách) — bắt buộc
  `SET QUOTED_IDENTIFIER ON` (§10.2). Thêm `ux_ptdnnn_nv`, `ux_hmptdn_ma`, `ix_lsptdn_bg`.
- TVP: `PhatTrienDoiNguGiangVienRow`, `PhatTrienDoiNguImportRow` (cột `hang_muc` = mã hoặc tên hạng mục).

### 18.2. Quy tắc nghiệp vụ — đã chốt với người dùng (2026-10-03)

1. **Chỉ giảng viên** (phiếu năm, loại đối tượng 1), GV đang công tác tại Khoa (`v_giang_vien_khoa`). Không có chiều quý;
   `ApDungQuy = false`. `sp_phieu_quy_create` / tripwire phiếu năm VC **không** mở cổng cho 3 mã.
2. **Chỉ tính 1 lần / năm cho mỗi loại**: có ≥ 1 dòng còn hiệu lực của (GV, năm, loại) → đủ `diem_toi_da`; nhiều dòng (kể
   cả khác hạng mục, vd GVC + TS cùng năm) **không** cộng thêm. Hạng mục cụ thể không ảnh hưởng điểm.
3. **Chống trùng trong SP** theo (`id_nam`, `id_nhan_vien`, `id_hang_muc`) dưới `UPDLOCK, HOLDLOCK` — **chỉ trong cùng
   năm**. Nhập nhầm cùng danh hiệu ở hai năm khác nhau thì cả hai năm đều đủ điểm (người dùng được báo, chưa yêu cầu chặn).
4. Còn lại **giống §16.2 mục 2–6**: sửa giữ nguyên GV không kiểm lại; bản ghi có hiệu lực ngay; ghi nhận nhiều GV
   all-or-nothing; PUT thay toàn bộ, không đổi gì (`Latin1_General_BIN`) → `co_thay_doi = 0`.
5. **Hạng mục ngừng dùng**: chọn cho bản ghi mới / đổi sang ở PUT → `HANG_MUC_NGUNG_DUNG`; giữ nguyên hạng mục cũ khi sửa
   thì được.
6. **Danh mục**: đọc — mọi người đã đăng nhập; thêm / sửa / ngừng dùng — `la_quan_ly`, chỉ loại `cho_them_hang_muc = 1`.
   Đổi tên hạng mục = đổi hiển thị của mọi bản ghi đang trỏ tới (bản ghi lưu id).
7. **Tiêu chí không do script sửa** (cùng cách §17): người dùng tự đặt `loai_nguon_diem = 2` + `cong_thuc_tong_hop = ma_loai`
   cho 3 tiêu chí trong DB. Script cũng **không** chuyển dòng của phiếu đã tạo.

### 18.3. Phân quyền — `fn_phat_trien_doi_ngu_quyen` (inline TVF, luôn 1 dòng, fail-closed)

| Cột | Điều kiện | Được làm |
|---|---|---|
| `la_quan_ly` | ADMIN, hoặc TP / QTP **tại** `P_TCHC` | Toàn quyền + cấp / thu hồi ủy quyền + quản lý danh mục hạng mục |
| `duoc_nhap` | `la_quan_ly`, **hoặc** có ủy quyền chưa thu hồi **và** hôm nay vẫn thuộc P_TCHC | Thêm / sửa / xoá / import, picker GV, file mẫu |
| `xem_tat_ca` | `duoc_nhap`, hoặc HT | Xem toàn trường |

- **Chép** luật của `fn_hoat_dong_dao_tao_quyen` (không gọi) để hai module độc lập; đọc (đơn vị, chức vụ) qua
  `fn_pham_vi_don_vi` (§10.6).
- "Thuộc P_TCHC" = `fn_phat_trien_doi_ngu_thuoc_phong` (dòng `nhan_vien_chuc_vu` hiệu lực hôm nay tại P_TCHC, có hay không
  có chức vụ). Rời phòng ⇒ tự mất quyền; danh sách ủy quyền trả `con_thuoc_phong`.
- Cấp quyền: người nhận phải thuộc phòng (`KHONG_THUOC_PHONG`); đã có toàn quyền → `INVALID`; đã được cấp → `DA_DUOC_CAP`;
  người được ủy quyền không cấp tiếp được.
- `N'P_TCHC'` viết cứng ở 3 chỗ (§1.1). `update_database.sql` KT1 / KT2 báo nếu mã chưa có trong `don_vi` hoặc chưa ai là
  TP / QTP — khi đó chỉ ADMIN quản lý / nhập được.
- Phạm vi xem (`_list`, `_get_by_id`) giống §16.3 (`fn_phat_trien_doi_ngu_khoa_duoc_xem` — chép, không gọi).
- BLL **không** gate bằng `ma_chuc_vu` của JWT: SP là nguồn sự thật.

### 18.4. Import Excel — `POST api/phat-trien-doi-ngu/import`

Giống §16.4, khác ở:
- `Helper/PhatTrienDoiNguExcelReader.cs`: cột bắt buộc **Hạng mục** (alias "Mã hạng mục", "Tên hạng mục") + **Mã nhân viên**;
  cột "Chi tiết" (alias "Nội dung") **tuỳ chọn**.
- `sp_phat_trien_doi_ngu_import` khớp hạng mục theo `ma_hang_muc` trước, rồi `ten_hang_muc` (chỉ nhận khi khớp **đúng 1**).
- Thứ tự lỗi: `DINH_DANG` · `HANG_MUC_KHONG_HOP_LE` · `HANG_MUC_NGUNG_DUNG` · `THIEU_MA_NHAN_VIEN` · `NHAN_VIEN_KHONG_TON_TAI` ·
  `KHONG_PHAI_GIANG_VIEN`. Trùng: `TRUNG_DU_LIEU_CU` / `TRUNG_TRONG_FILE` theo (năm, hạng mục, GV).
- File mẫu `GET api/phat-trien-doi-ngu/mau-import` (`ExcelHelper.WritePhatTrienDoiNguMau`): sheet 2 liệt kê **hạng mục đang
  dùng** đọc từ DB; tên cột lấy từ `PhatTrienDoiNguExcelReader.TenCotMau`.

### 18.5. Mã lỗi + HTTP

`FORBIDDEN` 403 · `NOT_FOUND` 404 · `INVALID` / `HANG_MUC_KHONG_HOP_LE` 400 · `KHONG_PHAI_GIANG_VIEN` / `KHONG_THUOC_PHONG` /
`HANG_MUC_NGUNG_DUNG` 422 · `TRUNG_BAN_GHI` / `TRUNG_HANG_MUC` / `DA_DUOC_CAP` 409 · `DB_ERROR` 500. POST tạo mới (bản ghi,
hạng mục) trả 201. Hợp đồng result set như §16.5.

### 18.6. Nối vào chấm tự động

| Nơi | Thay đổi |
|---|---|
| `fn_nckh_diem_tu_dong` | 3 mã vào whitelist + **một** nhánh: `EXISTS` bản ghi `da_xoa = 0` của (`@id_nhan_vien`, `@id_nam`, `ma_loai = @cong_thuc`) → `@diem_toi_da`, không có → **0** |
| `fn_nckh_minh_chung_tu_dong` | Nhánh `loai_nguon = 11` ("Phát triển đội ngũ"): mỗi bản ghi một dòng; `ma_nguon` = `id_ban_ghi`, `tieu_de` = tên hạng mục (+ chi tiết), `mo_ta` = tên loại + số / ngày QĐ + ghi chú, `ngay` = `ngay_quyet_dinh` (có thể NULL) |
| `sp_mau_danh_gia_diem_tu_dong` | Cờ `@co_tieu_chi_ptdn`: gọi toàn trường thì mở rộng tập GV ra người có bản ghi trong năm |
| `MauDanhGiaService` (C#) | `GanLyDoDiemPhatTrienDoiNgu`: `LyDoDiemTuDong` khi điểm 0 — "Phòng Tổ chức – Hành chính chưa ghi nhận… chấm lại phiếu bằng chức năng Tổng hợp tự động" (từ §21 nằm ở `BLL/DiemTuDongDienGiai.cs`) |

- **Bất biến:** vị từ lọc (`id_nhan_vien` + `id_nam` + `da_xoa = 0` + `ma_loai`) giống hệt nhau ở hai hàm. Hạng mục ngừng
  dùng không bị lọc ở cả hai.
- Cả ba luồng có ngay khi tiêu chí mang mã: chấm khi GV nộp phiếu, `POST api/phieu/{id}/tong-hop-tu-dong`, preview
  `GET api/maudanhgia/{id}/diem-tu-dong`.

#### Việc người dùng tự làm với tiêu chí

- Đặt `loai_nguon_diem = 2`, `cong_thuc_tong_hop = N'PTDN_DANH_HIEU_NHA_GIAO'` / `N'PTDN_NGACH_HOC_HAM_HOC_VI'` /
  `N'PTDN_BOI_DUONG'` cho 3 tiêu chí GV.
- `loai_thang_diem = 1` → `thang_diem` phải có mức `= diem_toi_da` và mức `= 0` (KT4 của `update_database.sql` báo mức thiếu).
- **Phiếu đã tạo không nhận mã mới** (snapshot). KT5 liệt kê các dòng còn chấm tay ở năm chưa đóng.
- Thêm / sửa / xoá bản ghi **không** tự chấm lại phiếu: gọi `POST api/phieu/{id}/tong-hop-tu-dong`. Phiếu GV nộp trước khi
  P_TCHC nhập xong cùng bẫy "đóng băng điểm 0 ở trạng thái 3" như §16.6.


---

## 19. SÁNG KIẾN — ĐỒNG BỘ NCKH + 2 CỜ ĐÁNH DẤU (`sang_kien`) → nguồn tiêu chí GV `SK_DOI_MOI_GIANG_DAY` và tiêu chí VC `TTVT_SANG_KIEN`

> **Đợt 2026-10-06 #3 — bỏ nhập tay, thêm cờ "Cải tiến công việc" (xem 19.9).** Hệ thống NCKH đã kê khai sáng kiến cho
> **mọi người** (GV lẫn VC) nên luồng P_KH nhập tay bị bỏ; VC được cộng 5 khi **trưởng đơn vị** đánh dấu cải tiến. Các
> mục 19.0 – 19.6 bên dưới đã cập nhật theo đợt này; chỗ nào còn nói "nhập tay" là mô tả dữ liệu cũ.

### 19.0. Vì sao có module này

Hai tiêu chí liên quan tới sáng kiến:

| Đối tượng | Mã công thức | Câu chữ tiêu chí | Cách tính |
|---|---|---|---|
| Giảng viên | `SK_DOI_MOI_GIANG_DAY` (**mã mới**) | Có sáng kiến trong Đổi mới, sáng tạo trong giảng dạy (phương pháp giảng dạy, kiểm tra đánh giá, học liệu, LMS) được DUE công nhận | Có / không: ≥ 1 sáng kiến được P_KH đánh dấu → đủ `diem_toi_da` |
| Viên chức / NLĐ | `TTVT_SANG_KIEN` (**mã cũ, đổi nguồn**) | Có sáng kiến, cải tiến công việc được công nhận (30 đ) | Mỗi sáng kiến: cấp Bộ trở lên 20 / cấp Trường (+ ĐHĐN) 10, **cộng thêm 5** nếu trưởng đơn vị đánh dấu "Cải tiến công việc, tham mưu chính trong việc ban hành các quy định, giải quyết các công việc tại đơn vị được công nhận"; trần 30 |

Phía NCKH (`NckhApiUrl`) có `GET /api/kpiinitiative`, trả sáng kiến của **mọi** người dùng NCKH (giảng viên lẫn viên chức),
**toàn thời gian**. Mỗi phần tử là 1 người dùng (`UserId`, `FullName`, `Email`) kèm mảng `Initiatives`
(`InitiativeId`, `Name`, `InitiativeLevel`, `SolutionType`, `HostInstitution`, `ApprovalDate`, `CertificateNumber`,
`IsMainAuthor`). Sáng kiến nhiều tác giả ⇒ **cùng `InitiativeId` lặp lại** dưới nhiều `UserId`.

Hai vấn đề mà dữ liệu thô không tự giải quyết được:
1. API **không cho biết** sáng kiến có thuộc giảng dạy hay không (`SolutionType` chỉ là lĩnh vực khoa học) ⇒ cần **P_KH
   đánh dấu** cho tiêu chí GV.
2. API **không cho biết** sáng kiến có phải "cải tiến công việc … tại đơn vị" hay không ⇒ cần **trưởng đơn vị đánh dấu**
   cho phần +5 của tiêu chí VC (đợt 2026-10-06 #3). *(Đợt 2026-10-05 tưởng VC không có trên NCKH nên làm luồng P_KH
   nhập tay — đã bỏ.)*

Quyết định đã chốt với người dùng (2026-10-05): **MỘT bảng chung**; **bỏ** luồng viên chức tự kê khai sáng kiến
(`ke_khai_thanh_tich_vuot_troi` loại 1). Đợt 2026-10-06 #3: **chỉ còn dữ liệu đồng bộ NCKH** + 2 cờ.

### 19.1. Bảng

- **`cap_sang_kien`** — **cố định 4 dòng**: `CAP_DHDN` 10 · `CAP_TRUONG` 10 · `CAP_BO` 20 · `CAI_TIEN_CONG_VIEC` 5.
  - `ten_nguon` = **đúng text** `InitiativeLevel` của NCKH ("Cấp cơ sở (ĐHĐN)", "Cấp cơ sở (Trường)", "Cấp Bộ"), dùng để
    ánh xạ khi đồng bộ (filtered unique `ux_cap_sk_ten_nguon`).
  - `diem_vien_chuc` = điểm / sáng kiến của tiêu chí VC. Trần thật vẫn là `tieu_chi_danh_gia.diem_toi_da` (30).
  - Cấp cơ sở (ĐHĐN) tính **10** như cấp Trường (đã chốt với người dùng).
  - Dòng **`CAI_TIEN_CONG_VIEC`** (`ten_nguon` NULL) từ đợt 2026-10-06 #3 **không còn là cấp** của sáng kiến:
    `diem_vien_chuc` của nó là **điểm cộng thêm** khi cờ `la_cai_tien_cong_viec = 1` (`fn_sang_kien_hop_le` đọc theo
    `ma_cap`; `GET danh-muc` trả riêng ở `DiemCaiTienCongViec`). Giữ dòng vì dòng nhập tay cũ còn tham chiếu FK.
- **`loai_giai_phap_sang_kien`** — **cố định 7 dòng**, `ten_loai` = đúng text `SolutionType` của NCKH. Chỉ để hiển thị /
  lọc, **không** ảnh hưởng điểm.
- **`sang_kien`** — **1 dòng = 1 sáng kiến**.
  - `nguon` 1 = đồng bộ NCKH (khoá nghiệp vụ `ma_sang_kien_nguon` = `InitiativeId`, filtered unique `ux_sk_ma_nguon`);
    2 = P_KH nhập tay (`ma_sang_kien_nguon` NULL — `chk_sk_ma_nguon`).
  - `id_cap` / `id_loai_giai_phap` **NULL được với dòng đồng bộ** khi text API không khớp danh mục; text gốc giữ ở
    `cap_text_nguon` / `loai_giai_phap_text_nguon`. Dòng nhập tay bắt buộc `id_cap` + `ngay_cong_nhan` + `id_nguoi_tao`
    (`chk_sk_nhap_tay`).
  - **Không lưu `id_nam` / `quy`**: năm = `nam_danh_gia` có `ngay_bat_dau ≤ ngay_cong_nhan ≤ ngay_ket_thuc`, quý =
    `DATEPART(QUARTER, ngay_cong_nhan)` (quý lịch, cùng quy ước `vi_pham_giang_day`). Lý do: API trả toàn thời gian, năm
    đánh giá tạo sau vẫn tự đúng mà không phải đồng bộ lại.
  - Cột xét **"đổi mới giảng dạy"**: `la_doi_moi_giang_day` (NULL chưa xét / 1 có / 0 không) + `id_nguoi_xet`,
    `ngay_xet`, `ghi_chu_xet`. **Chỉ dòng đồng bộ** có giá trị (`chk_sk_xet_nguon`). Đồng bộ lại **không** ghi đè.
  - Cột xét **"cải tiến công việc"** (đợt 2026-10-06 #3): `la_cai_tien_cong_viec` (NULL / 1 / 0) +
    `id_nguoi_xet_cai_tien` (FK `fk_sk_nguoi_xet_ct`), `ngay_xet_cai_tien`, `ghi_chu_xet_cai_tien`. **1 cờ cho cả sáng
    kiến**; chỉ dòng đồng bộ (`chk_sk_cai_tien_nguon`); có giá trị ⇒ có ngày xét (`chk_sk_cai_tien`). Đồng bộ lại **không**
    ghi đè.
  - `con_o_nguon` = 0: lần đồng bộ gần nhất **không còn thấy** sáng kiến ⇒ giữ dòng (kèm kết quả xét) nhưng **không tính**.
  - Xoá **mềm** chỉ cho dòng nhập tay (`chk_sk_xoa_nguon`).
- **`sang_kien_tac_gia`** — 1 dòng = 1 tác giả. **Không có tác giả chính** (người dùng chốt: chỉ lưu danh sách tác giả,
  mọi tác giả đều được tính); `IsMainAuthor` có trong DTO nhưng không lưu.
  - Dòng đồng bộ: `ma_nguoi_dung_nckh` + `ho_ten` / `email` từ API; `id_nhan_vien` ghép lúc đồng bộ, 2 bước:
    1. **Email** (lower + trim; ưu tiên nhân viên đang hoạt động rồi id nhỏ nhất) → `cach_ghep = 1`.
    2. **TẠM THỜI — họ tên** (người dùng chốt 2026-10-05: "không có mail thì tìm theo họ tên tạm thời, tính sau"):
       email không khớp ⇒ so họ tên chuẩn hoá (lower + trim + gộp khoảng trắng) với nhân viên **đang hoạt
       động**; chỉ ghép khi khớp **đúng 1** người (trùng tên ⇒ không ghép) và người đó **chưa** được một tài
       khoản NCKH khác ghép theo email trong cùng lần đồng bộ ⇒ `cach_ghep = 2`. Có tính điểm, nhưng cần
       P_KH rà soát (`ghepTheoHoTen=true`, KT6). Sửa email `nhan_vien` cho khớp NCKH rồi đồng bộ lại ⇒ tự
       chuyển sang `cach_ghep = 1`.
    Không khớp cả hai ⇒ `id_nhan_vien` NULL, vẫn lưu (lọc `chuaKhopTacGia=true`); đồng bộ lại sẽ ghép lại.
    Giới hạn: so tên theo collation CSDL — tên khác cách bỏ dấu (vd "Hòa" / "Hoà", Unicode tổ hợp / dựng sẵn)
    sẽ không khớp.
  - `cach_ghep`: 1 email · 2 họ tên (tạm) · 3 P_KH nhập tay · NULL chưa khớp.
  - Dòng nhập tay: chỉ `id_nhan_vien`, **phải là viên chức** (`v_vien_chuc_don_vi`).
  - Filtered unique `(id_sang_kien, id_nhan_vien)` và `(id_sang_kien, ma_nguoi_dung_nckh)`. Hai tài khoản NCKH cùng khớp
    1 nhân viên trong 1 sáng kiến ⇒ chỉ dòng đầu giữ `id_nhan_vien`.
- **`sang_kien_nguoi_nhap`** — ủy quyền, clone §18 (`ux_sknn_nv WHERE da_thu_hoi = 0`).
- **`lich_su_sang_kien`** — `hanh_dong`: 1 Tạo · 2 Sửa · 3 Xoá (1–3 chỉ còn ở dữ liệu nhập tay cũ) · 4 Xét đổi mới giảng
  dạy · 5 Đồng bộ (1 dòng tóm tắt / lần, `id_sang_kien` NULL) · 6 Cấp quyền nhập · 7 Thu hồi quyền nhập (`id_nhan_vien` =
  người được cấp) · **8 Xét cải tiến công việc** (`chk_lssk_hd` 1..8).
- TVP: `SangKienNckhRow` (payload làm phẳng, 1 dòng / (UserId × InitiativeId)), `SangKienXetRow`, `SangKienXetCaiTienRow`
  (đợt 2026-10-06 #3; `SangKienTacGiaRow` của luồng nhập tay bị DROP).
  Định nghĩa có ở **cả** `schema.sql` §19.7 và `procedure.sql` mục 19 — sửa một bên phải sửa cả bên kia.

### 19.2. Đồng bộ — `POST api/sang-kien/dong-bo` → `sp_sang_kien_dong_bo`

1. C#: hỏi quyền (`duoc_nhap`) **trước** khi gọi API NCKH; lỗi API → 502; payload **không có sáng kiến nào** → 502 và
   **không ghi gì** (tránh đánh dấu `con_o_nguon = 0` cho toàn bộ khi API trả rỗng bất thường).
2. C# làm phẳng + bỏ trùng (UserId, InitiativeId) + bỏ `InitiativeId ≤ 0`; `ApprovalDate` parse `yyyy-MM-dd` (nhận thêm
   ISO có giờ, `dd/MM/yyyy`), sai / ngoài 1900..2100 → NULL.
3. SP: `sp_getapplock` chặn 2 lần đồng bộ chồng nhau (`DANG_DONG_BO`); mỗi `InitiativeId` lấy 1 bản mô tả
   (`ma_nguoi_dung_nckh` nhỏ nhất); ánh xạ cấp / loại giải pháp theo text chuẩn hoá; **MERGE** theo `ma_sang_kien_nguon`
   (danh sách `SET` **không** có cột xét); vắng mặt → `con_o_nguon = 0`; **thay toàn bộ** tác giả của các sáng kiến có
   trong payload.
4. Kết quả trả các bộ đếm: `soSangKien`, `soMoi`, `soDaCo`, `soKhongConONguon`, `soTacGia`, `soTacGiaChuaKhop`,
   `soTacGiaGhepHoTen`, `soCapKhongNhanDien`, `soThieuNgayCongNhan` — bốn số cuối là chỗ cần xử lý dữ liệu (sửa
   email nhân sự / text cấp; rà soát các tác giả ghép tạm theo họ tên).

### 19.3. Quy tắc nghiệp vụ — đã chốt với người dùng (2026-10-05)

1. **Một vị từ duy nhất** `dbo.fn_sang_kien_hop_le(@id_nhan_vien, @id_nam)`: `da_xoa = 0`, `nguon = 1` **và**
   `con_o_nguon = 1` (từ đợt 2026-10-06 #3 — trước đó dòng nhập tay luôn tính), ngày công nhận trong năm, người đó là
   tác giả. Hàm trả sẵn `diem_cap`, `diem_cai_tien`, `diem_vien_chuc` (= tổng). Engine điểm, minh chứng, preview và báo
   cáo tổng hợp kê khai **đều đọc hàm này** ⇒ không còn bất biến "chép từng chữ" giữa hai hàm như §16–18.
2. **GV** (`SK_DOI_MOI_GIANG_DAY`): ≥ 1 dòng hợp lệ có `la_doi_moi_giang_day = 1` ⇒ đủ điểm; chỉ phiếu năm, không đọc
   `@quy`.
3. **VC** (`TTVT_SANG_KIEN`): `SUM(diem_vien_chuc)` của các dòng hợp lệ có `diem_vien_chuc > 0`, lọc quý khi phiếu quý,
   sàn 0, trần `diem_toi_da`. `diem_vien_chuc` = điểm cấp (cấp không nhận diện = 0) **+** điểm dòng `CAI_TIEN_CONG_VIEC`
   (5) khi `la_cai_tien_cong_viec = 1` ⇒ sáng kiến không nhận diện cấp nhưng được đánh dấu cải tiến vẫn được 5. Giữ
   nguyên hợp đồng "TTVT_* biết lọc quý" (`sp_phieu_quy_create`, `ap_dung_quy`, tripwire không đổi).
4. *(Đã bỏ đợt 2026-10-06 #3)* Nhập tay chỉ viên chức, chống trùng `TRUNG_SANG_KIEN`, `KHONG_PHAI_VIEN_CHUC`.
5. Dòng đồng bộ không sửa / xoá được qua API: sửa trên NCKH rồi đồng bộ lại.
6. **Kê khai cũ loại 1** (§11): `sp_ke_khai_thanh_tich_luu_chi_tiet` chặn dòng **mới / đổi nội dung** thuộc mục loại 1
   (`SANG_KIEN_DA_CHUYEN`, 422); dòng cũ giữ nguyên trong DB, **không còn tính điểm**, P_KH nhập lại nếu cần (người dùng
   chọn). `sp_ke_khai_thanh_tich_result_sets` cho loại 1 `diem_duoc_tinh = 0` + cảnh báo `SANG_KIEN_DA_CHUYEN`;
   `sp_ke_khai_thanh_tich_tong_hop` lấy cột loại 1 từ `fn_sang_kien_hop_le` (vẫn chỉ liệt kê người **có** bản kê).
7. Ghi nhận / đánh dấu / đồng bộ **không** tự chấm lại phiếu: phiếu năm → `POST api/phieu/{id}/tong-hop-tu-dong`;
   phiếu quý → nộp lại.

### 19.4. Phân quyền — `fn_sang_kien_quyen` (inline TVF, luôn 1 dòng, fail-closed)

| Cột | Điều kiện | Được làm |
|---|---|---|
| `la_quan_ly` | ADMIN, hoặc TP / QTP **tại** `P_KH` | Toàn quyền + cấp / thu hồi ủy quyền |
| `duoc_nhap` | `la_quan_ly`, **hoặc** có ủy quyền chưa thu hồi **và** hôm nay vẫn thuộc P_KH | Đồng bộ, xét giảng dạy |
| `xem_tat_ca` | `duoc_nhap`, hoặc HT | Xem toàn trường |
| `xem_theo_don_vi` | Trưởng đơn vị (`fn_chuc_vu_truong_don_vi`) ở ≥ 1 đơn vị | Xem sáng kiến có tác giả thuộc đơn vị mình |
| `duoc_xet_cai_tien` | ADMIN, HT, hoặc trưởng đơn vị | Mở màn xét cải tiến công việc |
| `xet_cai_tien_tat_ca` | ADMIN hoặc HT | Xét cải tiến **mọi** sáng kiến (trưởng đơn vị: theo dòng, xem 19.9) |

- Người còn lại xem sáng kiến mà **mình là tác giả** (`fn_sang_kien_nhan_vien_duoc_xem` = chính mình + nhân sự hiệu lực
  hôm nay của các đơn vị mình làm trưởng).
- `N'P_KH'` viết cứng ở 3 chỗ: `fn_sang_kien_thuoc_phong`, `fn_sang_kien_quyen`, `sp_sang_kien_nguoi_nhap_ung_vien`.
  KT1 của `update_database.sql` báo nếu mã chưa có / chưa ai là TP / QTP.

### 19.5. Mã lỗi + HTTP

`FORBIDDEN` 403 · `NOT_FOUND` 404 · `INVALID` 400 · `KHONG_THUOC_PHONG` / `DONG_NHAP_TAY` 422 · `DA_DUOC_CAP` /
`DANG_DONG_BO` 409 · `DB_ERROR` 500 · lỗi API NCKH (`NCKH_API_ERROR` / `NCKH_API_RONG`) 502. Hợp đồng result set như
§16.5. (`KHONG_PHAI_VIEN_CHUC` / `TRUNG_SANG_KIEN` / `DONG_DONG_BO` và 201 chỉ có ở luồng nhập tay — đã bỏ.)

### 19.6. Nối vào chấm tự động

| Nơi | Thay đổi |
|---|---|
| `fn_sang_kien_hop_le` (MỚI) | Vị từ chung — **phải tạo trước** `fn_nckh_minh_chung_tu_dong` (inline TVF tham chiếu inline TVF khác phải có sẵn lúc CREATE) |
| `fn_nckh_diem_tu_dong` | Whitelist + `SK_DOI_MOI_GIANG_DAY`; nhánh `TTVT_SANG_KIEN` **tách riêng** đọc `fn_sang_kien_hop_le`; khối TTVT chung chỉ còn loại 2 / 3 / 4 |
| `fn_nckh_minh_chung_tu_dong` | Bỏ `TTVT_SANG_KIEN` khỏi nhánh 7; nhánh **`loai_nguon = 12` "Sáng kiến"** cho cả 2 mã (`ma_nguon` = `id_sang_kien`; `mo_ta` = cấp (+ "+ Cải tiến công việc" + điểm + quý với VC) + "Đồng bộ NCKH" + số chứng nhận) |
| `sp_mau_danh_gia_diem_tu_dong` | Cờ `@co_tieu_chi_sk`: gọi toàn trường thì mở rộng tập người ra tác giả có sáng kiến hợp lệ trong năm |
| `MauDanhGiaService` (C#) | `GanLyDoDiemSangKien` cho cả 2 mã; `GanLyDoDiemThanhTichVuotTroi` bỏ qua `TTVT_SANG_KIEN` (câu nhắc "kê khai" không còn đúng) |

#### Việc người dùng tự làm với tiêu chí

- Tạo tiêu chí GV `loai_nguon_diem = 2`, `cong_thuc_tong_hop = N'SK_DOI_MOI_GIANG_DAY'`, gắn vào mẫu GV
  (`loai_thang_diem = 1` → `thang_diem` cần mức `= diem_toi_da` và mức `= 0`).
- Tiêu chí VC `TTVT_SANG_KIEN` giữ nguyên (KT3); `diem_toi_da` phải là 30.
- Phiếu đã tạo không nhận mã mới (snapshot). Phiếu VC đang có điểm `TTVT_SANG_KIEN` từ nguồn cũ (KT5) đổi khi chấm lại.

### 19.9. Đợt 2026-10-06 #3 — bỏ nhập tay + cờ "Cải tiến công việc" do trưởng đơn vị đánh dấu

**Lý do.** Hệ thống NCKH đã kê khai sáng kiến cho **tất cả** mọi người (GV lẫn VC), nên luồng P_KH nhập tay cho VC (dựng
ở đợt 2026-10-05 vì tưởng VC không có trên NCKH) thừa. Điều duy nhất NCKH không cho biết với VC là sáng kiến có phải
"cải tiến công việc, tham mưu chính … tại đơn vị" hay không.

**Đã chốt với người dùng (2026-10-06):**

| # | Quyết định |
|---|---|
| 1 | **Bỏ hẳn nhập tay**: DROP `sp_sang_kien_create / _update / _delete / _vien_chuc_list` + TVP `SangKienTacGiaRow`; gỡ `POST /api/sang-kien`, `PUT` / `DELETE /api/sang-kien/{id}`, `GET /api/sang-kien/vien-chuc` (giờ 404). Dòng nhập tay cũ còn hiệu lực bị **xoá mềm** trong migration (in số dòng trước; `id_nguoi_xoa` NULL + `ngay_xoa` = lúc chạy — đảo được). |
| 2 | VC: cấp Bộ **20** / cấp Trường **10** mỗi sáng kiến (ĐHĐN giữ 10) — tự động theo `InitiativeLevel`. |
| 3 | Cờ **cải tiến công việc** → **cộng thêm** điểm dòng `CAI_TIEN_CONG_VIEC` (5): cấp Trường + cải tiến = 15. Trần 30. |
| 4 | Cờ gắn với **cả sáng kiến** (mọi tác giả hưởng); trưởng đơn vị nào có tác giả trong sáng kiến cũng đổi được (đè nhau, lịch sử `hanh_dong = 8` giữ vết). |
| 5 | Cờ GV "đổi mới giảng dạy" **giữ nguyên** (P_KH, `POST /xet-giang-day`). |

**Giả định (người dùng chưa nói, chọn theo tiền lệ — sửa nếu khác):**
- Ai được đánh dấu: **ADMIN / HT** mọi sáng kiến; **trưởng đơn vị** (`fn_chuc_vu_truong_don_vi`) chỉ sáng kiến có ≥ 1 tác
  giả là nhân sự **hôm nay** của đơn vị mình làm trưởng, **trừ chính mình** (`fn_sang_kien_nhan_vien_xet_cai_tien`) —
  không tự đánh dấu cho sáng kiến chỉ có mình là tác giả trong đơn vị (tiền lệ "Trưởng khoa không tự duyệt gói");
  HT / ADMIN lo phần đó.
- Không giới hạn chỉ sáng kiến có tác giả VC (cờ chỉ ảnh hưởng `TTVT_SANG_KIEN`; FE lọc `doiTuong=2`).

**Thay đổi:**

| Nơi | Thay đổi |
|---|---|
| `sang_kien` | + `la_cai_tien_cong_viec`, `id_nguoi_xet_cai_tien`, `ngay_xet_cai_tien`, `ghi_chu_xet_cai_tien` + `fk_sk_nguoi_xet_ct`, `chk_sk_cai_tien_nguon`, `chk_sk_cai_tien` |
| `lich_su_sang_kien` | `chk_lssk_hd` 1..8 |
| `fn_sang_kien_hop_le` | Chỉ `nguon = 1`; + `la_cai_tien_cong_viec`, `diem_cap`, `diem_cai_tien`; `diem_vien_chuc` = tổng |
| `fn_nckh_diem_tu_dong` / `fn_nckh_minh_chung_tu_dong` (nhánh 12) / `sp_ke_khai_thanh_tich_tong_hop` | Lọc VC `id_cap IS NOT NULL` → `diem_vien_chuc > 0` |
| `fn_sang_kien_quyen` | + `duoc_xet_cai_tien`, `xet_cai_tien_tat_ca` (+ `la_admin` nội bộ) |
| `fn_sang_kien_nhan_vien_xet_cai_tien` (MỚI) | Nhân sự hôm nay của đơn vị mình làm trưởng, trừ chính mình |
| `sp_sang_kien_xet_cai_tien` (MỚI) | Clone `sp_sang_kien_xet_giang_day`; all-or-nothing: NOT_FOUND (không có / đã xoá / không phải đồng bộ), FORBIDDEN liệt kê dòng ngoài phạm vi |
| `sp_sang_kien_list` / `_get_by_id` | + 5 cột cờ cải tiến, `cho_phep_xet_cai_tien` (cùng luật SP xét); bỏ `cho_phep_sua`; list + `@trang_thai_cai_tien`, RS1 + `duoc_xet_cai_tien` |
| `sp_sang_kien_quyen` | + `duoc_xet_cai_tien` |
| `sp_sang_kien_danh_muc` | RS1 + `diem_cai_tien_cong_viec`; RS2 chỉ cấp có `ten_nguon`; bỏ `chi_nhap_tay` |
| Không đổi | `sp_sang_kien_dong_bo` (MERGE liệt kê cột tường minh, không đụng cột cờ), `sp_sang_kien_xet_giang_day`, `sp_mau_danh_gia_diem_tu_dong` (chỉ `EXISTS`), câu báo `SANG_KIEN_DA_CHUYEN` của `sp_ke_khai_thanh_tich_luu_chi_tiet` (vẫn ghi "P_KH ghi nhận" — đổi phải chép lại cả SP) |

---

## 20. PHÂN QUYỀN ĐỒNG BỘ NCKH + IMPORT PHẢN HỒI SINH VIÊN (2026-10-06)

### 20.0. Vì sao có đợt này

Rà soát các API nạp dữ liệu từ bên ngoài: 4 API chỉ có `[TokenAuthorize]` trơn và SP không có cổng quyền, nên **mọi
người đăng nhập** đều gọi được:

- `POST api/nckh/dong-bo`, `api/nckh/gio-nckh/dong-bo`, `api/nckh/bai-bao-quoc-te/dong-bo`: gọi API NCKH (tới 2 phút)
  và ghi đè dữ liệu tính giờ NCKH / KPI (`gio-nckh` xoá **toàn bảng** `nckh_gio_nckh`).
- `POST api/phanhoisinhvien/import`: ghi đè toàn bộ phản hồi SV của một (năm học, đơn vị).
- Thêm vào đó, `DELETE api/phanhoisinhvien/{id}` xoá được từng dòng khảo sát, cũng không kiểm quyền.

`POST api/sang-kien/dong-bo` (§19, cũng gọi API NCKH) đã có cổng quyền từ trước — **không đổi**.

### 20.1. Luật quyền — đã chốt với người dùng (2026-10-06)

| Thao tác | Được làm | Hàm |
|---|---|---|
| 3 API đồng bộ NCKH | ADMIN, hoặc TP / QTP **tại** `P_KH` — **không** có ủy quyền | `fn_nckh_co_quyen_dong_bo` (scalar BIT) |
| Import phản hồi SV | ADMIN, hoặc TP / QTP **tại** `P_DTBDCL` (cùng luật `sp_diem_tb_phan_hoi_sv_chot`) | `fn_phan_hoi_sinh_vien_co_quyen_import` (scalar BIT) |
| Xoá từng dòng phản hồi SV | **Không ai** — API bị bỏ, `sp_phan_hoi_sinh_vien_delete` bị DROP; `DELETE` trả 405 | — |

- Cả hai hàm đều đọc tập (đơn vị, chức vụ) qua `fn_pham_vi_don_vi`, chức vụ và mã đơn vị đối chiếu **trên cùng một dòng**,
  nên người kiêm nhiệm vẫn được nhận đúng.
- Hai hàm **chép** luật chứ không gọi `fn_sang_kien_quyen` / `fn_hoc_vu_co_quyen_quan_ly`, để các module độc lập (quy ước §16.3).

### 20.2. Hai lớp chặn

1. **Hỏi quyền trước** (khuôn §19.2): BLL gọi `sp_nckh_quyen_dong_bo` / `sp_phan_hoi_sinh_vien_quyen_import`
   (trả `success, message, error_code, duoc_phep`) **trước** khi gọi API NCKH hoặc đọc file Excel. Lý do: TVP stream
   được enumerate hết lúc `ExecuteReader`, nên nếu chỉ SP ghi chặn thì người không có quyền vẫn phải chờ API ngoài,
   hoặc file ~200k dòng vẫn bị đọc hết, rồi mới nhận 403.
2. **SP ghi kiểm lại** (fail-closed): `sp_nckh_dong_bo`, `sp_nckh_gio_nckh_dong_bo`, `sp_nckh_kpi_bai_bao_quoc_te_dong_bo`,
   `sp_phan_hoi_sinh_vien_import_raw` có thêm `@current_user_chuc_vu`, `@current_user_don_vi` (**mặc định NULL**) và
   cổng `FORBIDDEN` ở **đầu SP**:
   - Thiếu người đồng bộ / import (NULL hoặc không tồn tại) → `FORBIDDEN`. Trước đây SP lặng lẽ ghi NULL.
   - Tham số mặc định NULL nên backend cũ gọi SP mới vẫn chạy và vẫn bị chặn đúng, vì `fn_pham_vi_don_vi` đọc
     `nhan_vien_chuc_vu`.
   - Mọi result set của 4 SP này có thêm cột `error_code` (`FORBIDDEN` / `INVALID` / `NOT_FOUND` / `DB_ERROR` / NULL).
     DAL đọc cột này bằng cách dò tên cột (`NckhSyncDal.ReadErrorCode`), nên vẫn chạy với DB chưa nâng cấp.

### 20.3. Mã lỗi + HTTP

`FORBIDDEN` 403. Các mã còn lại **giữ nguyên HTTP cũ**: NCKH `INVALID` (năm không tồn tại) 400, lỗi ghi DB 409;
phản hồi SV mọi lỗi khác 400; lỗi API NCKH 502. `DELETE api/phanhoisinhvien/{id}` → 405 (Web API không còn action).

### 20.4. Thứ tự deploy

Chạy `update_database.sql` **trước**, deploy C# **sau**. C# mới gọi 2 SP hỏi quyền mới; deploy C# trước thì đồng bộ
NCKH / import phản hồi SV lỗi 500 cho tới khi chạy script.

---

## 21. XEM ĐIỂM TỰ ĐỘNG TRÊN PHIẾU + SIẾT XEM TRƯỚC THEO MẪU (2026-10-06 #2)

### 21.0. Vì sao có đợt này

10 tiêu chí GV vừa chuyển sang chấm tự động (§16 `CTDT_*` / `NCS_*`, §17 `TTDT_*`, §18 `PTDN_*`, §19
`SK_DOI_MOI_GIANG_DAY`). GV đã xem được bản ghi nguồn của mình (list / `{id}` của 4 module) và điểm trên phiếu
(`GET api/phieu/me/{idNam}`). Còn **minh chứng + lý do 0 điểm theo từng tiêu chí** thì chỉ lấy được qua
`GET api/maudanhgia/{id}/diem-tu-dong?idNhanVien=`, và các tài liệu FE §16–§19 đang chỉ dùng route này cho GV. Route đó
có hai vấn đề:

1. **Không kiểm quyền**: ai đăng nhập cũng đọc được vi phạm giảng dạy / điểm trừ / kỷ luật / phản hồi SV / bài báo của
   người khác, hoặc cả trường (bỏ trống `idNhanVien`).
2. **Không gắn phiếu**: tính trên tiêu chí hiện tại của mẫu, nên bỏ qua `cong_thuc_snapshot`, quý của phiếu và luật
   "mỗi (người, năm, quý) chỉ 1 phiếu nhận điểm tự động" (§10.7).

### 21.1. `GET api/phieu/{id}/tu-dong` → `sp_phieu_tu_dong_chi_tiet` (chỉ đọc)

Mỗi dòng `chi_tiet_danh_gia` có `loai_nguon_diem = 2` của phiếu, kèm:

- **Đã ghi**: `diem_da_ghi` (`ct.diem_tu_dong`), `diem_chinh_thuc`, `id_thang_diem_da_ghi`, `ngay_tu_dong`, `trang_thai_dong`.
- **Tính lại**: `diem_tu_dong` = `fn_nckh_diem_tu_dong(ct.cong_thuc_snapshot, …, tc.diem_toi_da, …, quy của phiếu)`, tức
  **cùng lời gọi với engine** (`sp_phieu_cham_tu_dong_apply`). Vì vậy tính lại lệch đã ghi chỉ khi dữ liệu nguồn đã đổi
  sau lần chấm. BLL đặt `CanChamLai` = `DiemDaGhi` có giá trị **và** khác `DiemTuDong`.
- **Minh chứng**: `fn_nckh_minh_chung_tu_dong` (consumer thứ 3, sau `sp_nckh_dong_bo` và preview theo mẫu).
- **Lý do 0 điểm**: `BLL/DiemTuDongDienGiai.cs`, dùng chung với preview theo mẫu.
  Câu lý do viết **tiếng Việt có dấu** và hiện nguyên văn cho người dùng cuối: gọi tên đơn vị / chức năng
  ("Phòng Tổ chức – Hành chính", "chức năng Tổng hợp tự động") thay cho mã đơn vị, mã công thức và đường dẫn API.

Phiếu không phải phiếu nhận điểm tự động → `la_phieu_nhan_tu_dong = 0`: RS2 vẫn liệt kê dòng nhưng `diem_tu_dong`
NULL, RS4 rỗng. Engine cũng không bao giờ chấm phiếu đó.

**Bất biến chép (không gọi)**, sửa một nơi phải sửa cả nơi kia:

| Phần | Chép từ |
|---|---|
| Cổng xem phiếu năm | `sp_phieu_danh_gia_get_detail`: chủ phiếu · HT / ADMIN · trưởng đơn vị chủ quản (+ cây con) · trưởng đơn vị được giao chấm ≥ 1 tiêu chí |
| Cổng xem phiếu quý | `sp_phieu_quy_get_detail`: chủ phiếu · HT / ADMIN · `fn_chuc_vu_can_ht_duyet()` tại đơn vị phiếu |
| Chọn phiếu nhận điểm tự động + khớp `@ma_nckh` qua email | `sp_phieu_cham_tu_dong_apply` |
| Tên cột RS2 (`gio_*` / `bbqt_*`), RS3, RS4 | `sp_mau_danh_gia_diem_tu_dong`: C# đọc chung bằng `DAL/DiemTuDongReader.cs` |

Không qua cổng → `NOT_FOUND` (404), giống `GET api/phieu/{id}`: không lộ phiếu có tồn tại hay không.

### 21.2. Siết `sp_mau_danh_gia_diem_tu_dong`

Thêm `@current_user_id`, `@current_user_chuc_vu`, `@current_user_don_vi`, **không mặc định**: quên truyền là lỗi gọi SP,
không âm thầm thành "ai cũng xem được". Cổng **sao y** `sp_gio_giang_ty_le_hoan_thanh` (chép, không gọi):

| Người gọi | Được xem |
|---|---|
| ADMIN / HT | Mọi người, kể cả `@id_nhan_vien` NULL (toàn trường) |
| `@id_nhan_vien` = chính mình | Tự xem |
| Trưởng đơn vị (`fn_chuc_vu_truong_don_vi`) | Nhân sự có dòng `nhan_vien_chuc_vu` hiệu lực hôm nay (`la_goc = 1`) tại đơn vị mình giữ chức vụ trưởng + cây con. `@id_nhan_vien` NULL → tập người bị lọc theo phạm vi; ngoài phạm vi → `FORBIDDEN` |
| Còn lại | `FORBIDDEN` (403) |

- Cổng nằm **trước** bước "không tìm thấy nhân viên", để người ngoài phạm vi không dò được id nào tồn tại.
- RS1 có thêm cột `error_code` (`NOT_FOUND` / `INVALID` / `FORBIDDEN` / NULL).
- Phần tính điểm và RS2–RS4 không đổi.

### 21.3. Thứ tự deploy

Chạy `update_database.sql` **trước**, deploy C# **ngay sau**. SP mới bắt buộc 3 tham số người gọi, nên khoảng giữa hai
bước backend cũ gọi xem trước theo mẫu sẽ lỗi 500. Deploy C# trước thì cả hai route lỗi 500, vì SP cũ không nhận tham số
mới và `sp_phieu_tu_dong_chi_tiet` chưa có.

## 22. XẾP HẠNG TẠM TÍNH TRÊN PHIẾU (2026-10-07)

### 22.0. Vì sao có đợt này

Giảng viên muốn biết mình đang đứng thứ mấy trong khoa (vd 12/60) **ngay khi điền / xem phiếu**. Trước đợt này chưa
có số nào dùng được:

- `phieu_danh_gia.hang_trong_khoa` chỉ được ghi ở `sp_to_trinh_khoa_dong_goi` (§8.2), mà bước này đòi 100% hồ sơ của
  đơn vị ở trạng thái 4/5.
- `tong_diem_tich_luy` chỉ được ghi ở `sp_phieu_khoa_duyet_ho_so` (3 → 4). Trong lúc chấm (1/2/3) cột này NULL nên
  không sắp xếp được.

### 22.1. `GET api/phieu/{id}/xep-hang-tam-tinh` → `sp_phieu_xep_hang_tam_tinh` (chỉ đọc)

Luật đã chốt với người dùng (2026-10-07):

| Điểm | Luật |
|---|---|
| Phạm vi xếp | **Trong nhóm** hạn ngạch (1 GV thường · 2 VC/NLĐ · 3 CBQL), khớp `hang_trong_khoa`. Không xếp toàn đơn vị. Viên chức Khoa (xét xuất sắc cấp Trường, §8.7) vẫn xếp trong nhóm 2 như bước đóng gói |
| Mẫu số `TongSo` | **Mọi** phiếu năm (`quy = 0`, chưa xoá) của (năm, đơn vị) trong nhóm, **kể cả phiếu đang Nháp**. Điểm nháp của người khác cũng được tính; `SoPhieuChuaNop` để FE ghi chú |
| Điểm mỗi phiếu | Trạng thái ≥ 4 và đã có `tong_diem_tich_luy` → lấy cột (đúng số đóng gói dùng). Còn lại → `EXEC sp_phieu_danh_gia_tinh_tong_diem` (**gọi**, không chép công thức: một nguồn sự thật cho cả nhánh roll-up quý và trần nhóm B) |
| Đồng hạng | `RANK()`: cùng điểm thì cùng hạng. Khác đóng gói (`ROW_NUMBER` + `uu_tien_xuat_sac`) vì ở đây chỉ hiển thị, không cắt suất |
| Lộ dữ liệu | Chỉ trả số liệu của **chính phiếu được hỏi**, không trả điểm hay tên người khác |

Response: `Hang`, `TongSo`, `SoNguoiDongHang` (tính cả mình), `SoPhieuChuaNop`, `TongDiemTichLuy`, `NhomXepHang`,
`LaTamTinh` (trong nhóm còn phiếu < 4), `HangChinhThuc` (= `hang_trong_khoa` của lần đóng gói gần nhất, null nếu chưa
đóng gói).

Chi phí mỗi lần gọi: một lần `EXEC sp_phieu_danh_gia_tinh_tong_diem` cho mỗi phiếu chưa chốt trong nhóm (khoa 60 người
thì khoảng 60 lần, mỗi lần SUM chi tiết của một phiếu). Không cache, không ghi DB.

**Bất biến chép (không gọi)**, sửa một nơi phải sửa cả nơi kia:

| Phần | Chép từ |
|---|---|
| Cổng xem phiếu năm | Nhánh `quy = 0` của `sp_phieu_tu_dong_chi_tiet` (= `sp_phieu_danh_gia_get_detail`): chủ phiếu · HT / ADMIN · trưởng đơn vị chủ quản (+ cây con) · trưởng đơn vị được giao chấm ≥ 1 tiêu chí |
| Khoá nhóm (`CASE` trên `fn_chuc_vu_can_ht_duyet()` / `loai_doi_tuong`) | `sp_to_trinh_khoa_dong_goi` (và `nhom_hien_tai` của `sp_to_trinh_khoa_get_detail`) |

Không qua cổng, phiếu quý hoặc id không tồn tại → `NOT_FOUND` (404), giống `GET api/phieu/{id}`.

### 22.2. Thứ tự deploy

Không phụ thuộc thứ tự: SP mới không ai gọi cho tới khi C# mới lên; C# lên trước thì chỉ route mới lỗi 500 cho tới khi
chạy `update_database.sql`. Không đổi bảng, không đổi dữ liệu. Script test: `Tests/test_xep_hang_tam_tinh.sql` (chỉ đọc).

## 23. NHẬT KÝ THAO TÁC (AUDIT) + NHẬT KÝ PHIÊN + TRA CỨU (2026-10-09)

### 23.0. Vì sao có đợt này

Rà soát 2026-10-08 cho thấy hai lỗ hổng truy vết:

- Danh mục nhân sự, vi phạm giảng dạy và dữ liệu import / đồng bộ **không có vết**. Nhiều SP xoá hẳn khỏi DB
  (`sp_vi_pham_giang_day_delete`, `sp_nhan_vien_chuc_vu_delete`…), sửa thì ghi đè giá trị cũ. Các SP danh mục
  (vd `sp_don_vi_update`) không nhận `@current_user_id`, nên không biết ai sửa.
- `nhat_ky_dang_nhap` chỉ ghi đăng nhập. Dòng "thành công" lại được ghi **trước** khi kiểm đơn vị và lưu refresh
  token, nên có thể ghi thành công cho một lần đăng nhập thực ra bị từ chối. IP lấy từ `X-Forwarded-For` mà không
  kiểm tra, trong khi IIS production nhận request trực tiếp, nên client làm giả được IP.

Chốt với người dùng (2026-10-09):

| Điểm | Quyết định |
|---|---|
| Cách ghi | Trigger + `CONTEXT_INFO`. Không đổi chữ ký SP / DAL / BLL nghiệp vụ |
| Mức ghi | Chi tiết (XML cũ / mới từng dòng) cho mọi bảng, trừ 4 bảng import thô lớn ghi **tóm tắt** |
| Nguyên tắc | **Fail-closed**: không xác định được danh tính thì không ghi dữ liệu; không ghi được vết thì không ghi dữ liệu; sự kiện phiên thành công ghi **cùng transaction** với thay đổi |
| Triển khai | 2 đợt: A (13 bảng) bật ngay; B (20 bảng) seed `dang_bat = 0`, bật sau 1–2 tuần đo |
| Xem | API chỉ ADMIN; người dùng thường không có API tự xem |
| Xoá log | Không tự động. Người vận hành tự chạy `sp_nhat_ky_xoa_theo_lo` (production là SQL Express, không có SQL Agent) |
| IP | Chỉ IP kết nối thật (`UserHostAddress`) |

### 23.1. Luồng danh tính → trigger

```text
Request ──► TokenAuthorize (token hợp lệ) ──► AuditContext.SetCurrentUser(id)       [HttpContext.Items]
        ──► DAL: DbHelper.GetConnection().Open()
              └─ StateChange → Open ──► EXEC dbo.sp_audit_set_context  ──► SET CONTEXT_INFO (128 byte)
                                         lỗi → đóng connection + ném lỗi (KHÔNG chạy tiếp)
        ──► SP nghiệp vụ: INSERT / UPDATE / DELETE / MERGE trên bảng có trigger
              └─ trg_audit_<bảng> ──► dbo.fn_audit_context() + snapshot nhan_vien ──► dbo.nhat_ky_thao_tac
```

- Mọi connection của ứng dụng đều mở qua `DbHelper.GetConnection()` (đã rà: không có `new SqlConnection` /
  `SqlBulkCopy` nào khác), nên móc tại một điểm là phủ hết. `sp_audit_set_context` **luôn ghi đè** ở mọi lần Open,
  kể cả request ẩn danh, nên connection pool không mang danh tính của request trước.
- `CONTEXT_INFO`: `[0xA1 marker][loại tác nhân][id 4B][mã yêu cầu 16B][len][IP ≤45][len][nguồn ≤59]`.
  `SET CONTEXT_INFO` trong SP **không** bị hoàn lại khi SP kết thúc.
- Tác nhân (`loai_tac_nhan`):

| Giá trị | Nghĩa | Khi nào |
|---|---|---|
| 1 | Người dùng | Request đã qua `TokenAuthorize`. CHECK bắt buộc có `id_nguoi_thuc_hien` |
| 2 | Hệ thống / ẩn danh của ứng dụng | Đăng nhập, refresh, đăng xuất; ngoài HTTP request (`nguon = 'SYSTEM'`) |
| 3 | **Ngoài ứng dụng** | Không có marker: sửa tay qua SSMS, script, job ngoài ứng dụng; C# cũ chưa deploy |

  Loại 2 và lỗi truyền danh tính **không** dùng chung ý nghĩa: lỗi thì không có dòng nào (thao tác bị từ chối).
- `ma_yeu_cau` là Guid tạo một lần cho mỗi HTTP request (`AuditContext.MaYeuCau`), dùng chung cho access log
  (`ReqId: ...`), `nhat_ky_dang_nhap.ma_yeu_cau` và `nhat_ky_thao_tac.ma_yeu_cau`, để nối các dấu vết.
- `TokenAuthorize` gán người dùng **trước** bước kiểm quyền theo mã chức vụ, vì bước đó cũng truy vấn CSDL.

### 23.2. `nhat_ky_thao_tac` (§5.2) và `cau_hinh_audit` (§5.3)

| Cột | Ghi chú |
|---|---|
| `muc_ghi` | 1 Chi tiết: 1 dòng / bản ghi. 2 Tóm tắt: 1 dòng / lần kích hoạt trigger |
| `hanh_dong` | 1 Thêm · 2 Sửa · 3 Xoá · 4 Đổi khoá chính |
| `khoa_ban_ghi` / `khoa_ban_ghi_cu` | PK dạng chuỗi, nhiều cột nối `\|`, ngày style 126. Tóm tắt: cả hai NULL |
| `so_dong` | Chi tiết = 1. Tóm tắt = số dòng câu lệnh **tác động** (kể cả UPDATE không đổi giá trị) |
| `du_lieu_cu` / `du_lieu_moi` | `<r cot="..."/>` (FOR XML RAW). Cột NULL = vắng attribute; `''` = `cot=""` |
| `ma_nguoi_thuc_hien`, `ho_ten_nguoi_thuc_hien` | **Snapshot** lúc ghi: vẫn nhận diện được khi nhân viên đổi tên / bị xoá |
| `ten_dang_nhap_sql`, `ung_dung` | `SUSER_SNAME()`, `APP_NAME()` của phiên ghi: phát hiện sửa trực tiếp CSDL |

- **Không FK** tới bảng nào: vết phải còn khi bản ghi hoặc nhân viên bị xoá (khác `lich_su_*` có
  `ON DELETE CASCADE` theo phiếu).
- **Không filtered index** trên bảng này: trigger ghi từ mọi SP, kể cả SP tạo với `QUOTED_IDENTIFIER` khác nhau.
- `cau_hinh_audit`: `ten_bang`, `muc_ghi`, `dang_bat`, `dot_trien_khai` (A/B), `cot_bo_qua` (CSV), `ghi_chu`.
  Seed 33 dòng (xem `schema.sql` §5.3).
- **Phân biệt với `lich_su_*` của từng module** (`lich_su_cham_diem`, `lich_su_trang_thai_phieu`…): các bảng đó ghi
  **ý nghĩa nghiệp vụ** (chấm, duyệt, trả lại, lý do) và giữ nguyên. `nhat_ky_thao_tac` ghi **dữ liệu thô** cũ / mới.
  Bảng `nhat_ky` (§5.1) vẫn không có SP nào ghi; đợt này không dùng nó.

### 23.3. Generator `sp_audit_tao_trigger` — KHÔNG sửa tay trigger

`EXEC dbo.sp_audit_tao_trigger [@ten_bang = N'<bảng>'] [, @chi_xem_truoc = 1];`

- Đọc cấu trúc **DB thật** (`sys.columns` theo `column_id`, PK theo `key_ordinal`), nên không lệch `schema.sql` khi
  cột được thêm bằng ALTER. Thứ tự cột trong XML ổn định theo `column_id`.
- **Quy tắc bắt buộc:** thêm / đổi / xoá cột ở bảng có audit thì trong cùng đợt phải chạy
  `EXEC dbo.sp_audit_tao_trigger N'<bảng>';`. Trigger cũ không biết cột mới (bỏ sót) hoặc tham chiếu cột đã xoá
  (mọi DML trên bảng lỗi).
- Cột được ghi: kiểu số, ngày, chuỗi, `uniqueidentifier`. Tự bỏ qua: `rowversion` (vd `phieu_danh_gia.row_version`),
  `xml`, `text`, `ntext`, `image`, `varbinary`, `sql_variant`, kiểu CLR, cột `ngay_cap_nhat`, cột trong `cot_bo_qua`.
- **Danh sách cấm cứng** (không ghi đè được bằng cấu hình): mọi cột có tên chứa `mat_khau`, `password`, `token`,
  `secret`, `salt`, `hash`. Hiện gồm `nhan_vien.mat_khau`, `refresh_token_hash`, `refresh_token_het_han`. Thêm vào đó,
  `cot_bo_qua` của `nhan_vien` bỏ `so_lan_dang_nhap_sai`, `khoa_dang_nhap_den`, nên đăng nhập / refresh (chỉ đổi những
  cột này) không sinh dòng audit. Cổng PHAN 5 của migration kiểm lại: không định nghĩa `trg_audit_%` nào nhắc các mẫu tên này.
- **Nguyên tử:** bước 1 sinh DDL cho mọi bảng (lỗi cấu trúc thì RAISERROR, chưa đổi gì); bước 2 DROP + CREATE tất cả
  trong **một** transaction (lỗi bất kỳ bảng nào thì ROLLBACK toàn bộ). Chạy không tham số còn gỡ trigger
  `trg_audit_%` mồ côi (bảng không còn trong cấu hình).
- `@chi_xem_truoc = 1` chỉ SELECT `(ten_bang, ddl)`, dùng để review hoặc parse offline (ScriptDom không đọc vào chuỗi SQL động).

Ngữ nghĩa trigger chi tiết:

| Trường hợp | Ghi |
|---|---|
| Chỉ `inserted` (INSERT, nhánh INSERT của MERGE) | hành động 1, `du_lieu_moi` |
| Chỉ `deleted` | hành động 3, `du_lieu_cu` |
| Cả hai, khớp PK | hành động 2, **chỉ khi thật sự đổi**: so `CAST(xml AS NVARCHAR(MAX)) COLLATE Latin1_General_BIN2`. Phân biệt hoa / thường, tổ hợp dấu (ò dựng sẵn ≠ o + dấu), NULL ≠ `''`, khoảng trắng cuối (XML luôn kết thúc `/>`) |
| Cả hai, **không khớp PK** (chỉ sinh cho bảng có PK không phải IDENTITY đơn) | hành động 4. Đúng 1 cũ + 1 mới thì ghép 1 dòng (`khoa_ban_ghi_cu` → `khoa_ban_ghi`, có cả cũ lẫn mới); ngược lại mỗi dòng ghi riêng (chỉ cũ hoặc chỉ mới), gom bằng `ma_yeu_cau` |

Mức tóm tắt: 1 dòng / **lần kích hoạt trigger**. `MERGE` kích hoạt trigger **riêng cho từng loại hành động**, nên một
câu `MERGE` (vd `sp_sinh_vien_hoc_vu_import`) ra tới 3 dòng cùng `ma_yeu_cau`.

Rủi ro đã rà khi bật trigger: không SP nào dùng `@@IDENTITY` (`SCOPE_IDENTITY()` không bị ảnh hưởng); mọi `OUTPUT`
trong `procedure.sql` đều có `INTO` (thiếu `INTO` trên bảng có trigger là lỗi 334), kể cả hai `MERGE … OUTPUT $action`.
`@@ROWCOUNT` ngay sau DML trên bảng có trigger (các SP import) được kiểm bằng `Tests/test_nhat_ky.sql` T3.
Trigger lỗi thì cả câu lệnh nghiệp vụ rollback, đây là chủ ý (nguyên tắc 2).

### 23.4. Phạm vi và đợt triển khai

| Đợt | Bảng | Mức |
|---|---|---|
| A | `loai_vi_pham`, `loai_vi_pham_don_vi_ghi_nhan`, `vi_pham_giang_day`; `don_vi`, `chuc_vu`, `chuc_danh_nghe_nghiep`, `nhan_vien`, `nhan_vien_chuc_vu`, `nhan_vien_chuc_danh` | Chi tiết |
| A | `phan_hoi_sinh_vien`, `sinh_vien_hoc_vu`, `canh_bao_hoc_vu`, `gio_giang_tkb_chi_tiet` | **Tóm tắt** |
| B | `phieu_danh_gia`, `chi_tiet_danh_gia`, `phieu_danh_gia_don_vi`, `chi_tiet_danh_gia_don_vi`; `diem_tb_phan_hoi_sinh_vien`, `khoa_dao_tao_anh_xa`, `gio_giang_tkb_lan_import`, `gio_giang_tkb`, `gio_giang_tkb_anh_xa`, `giam_tru_nhan_vien`, `giam_tru_con_nho`, 9 bảng `nckh_*` | Chi tiết |

Cấu hình KPI (tiêu chí, thang điểm, mẫu…) **chưa** nằm trong phạm vi. Muốn thêm một bảng: `INSERT cau_hinh_audit`
rồi `EXEC dbo.sp_audit_tao_trigger N'<bảng>';`. Đổi mức ghi: `UPDATE … SET muc_ghi = …` rồi chạy lại generator.

### 23.5. Nhật ký phiên (`nhat_ky_dang_nhap`, §1.6)

| `loai_su_kien` | Thành công ghi ở (CÙNG transaction) | Thất bại ghi riêng (`sp_auth_log_login_attempt`) |
|---|---|---|
| 1 Đăng nhập | `sp_auth_set_refresh_token` — bước cuối, sau kiểm đơn vị | IpBlocked, UserNotFound, AccountLocked, InvalidPassword, ChuaGanDonVi, LoiCapToken |
| 2 Làm mới token | `sp_auth_set_refresh_token` | AccountDisabled, TokenExpired, ChuaGanDonVi, LoiCapToken. Token không khớp ai thì không có danh tính để ghi (access log vẫn có 401 kèm `ReqId`) |
| 3 Đăng xuất | `sp_auth_clear_refresh_token` — đúng nhân viên bị cập nhật (`OUTPUT … INTO`) | — |
| 4 Đổi mật khẩu | `sp_auth_change_password` | AccountDisabled, InvalidPassword, LoiCapNhat |
| 5 Quản trị đặt lại | `sp_auth_change_password` (`id_nguoi_thuc_hien` = admin) | NhanVienKhongTonTai, LoiCapNhat |

- Ghi nội bộ qua `sp_auth_ghi_nhat_ky_noi_bo`: chỉ INSERT, **không** tự mở / rollback transaction; lỗi (vd vi phạm
  `chk_nkdn_loai_su_kien`) nổi lên CATCH của SP gọi, nên **thay đổi không xảy ra**. Snapshot `ho_ten`,
  `ma_nguoi_thuc_hien`, `ho_ten_nguoi_thuc_hien` lúc ghi.
- Ghi thất bại là best-effort: lỗi khi ghi chỉ vào error log (NLog), không đổi mã trả về (thao tác chính đã thất bại,
  không có dữ liệu nào đổi cần vết).
- `sp_auth_is_ip_blocked` chỉ đếm **đăng nhập** thất bại (`loai_su_kien = 1`) và bỏ `ChuaGanDonVi`, `LoiCapToken`
  (lỗi phía máy chủ / cấu hình). Đổi mật khẩu sai không khoá IP.
- IP là **IP kết nối thật** (`Helper/ClientIpHelper.cs`) ở cả nhật ký phiên, chặn IP, access log và audit. Nếu sau này
  đặt reverse proxy phía trước thì phải sửa helper (chỉ tin `X-Forwarded-For` khi `UserHostAddress` là proxy đã cấu
  hình), nếu không mọi người dùng sẽ mang IP của proxy và cùng bị chặn.

### 23.6. API tra cứu (chỉ ADMIN) và vận hành

| Endpoint | SP |
|---|---|
| `GET api/nhat-ky/dang-nhap` | `sp_nhat_ky_dang_nhap_list` |
| `GET api/nhat-ky/thao-tac` | `sp_nhat_ky_thao_tac_list` (`khoaBanGhi` khớp cả `khoa_ban_ghi_cu`) |
| `GET api/nhat-ky/thao-tac/{id}` | `sp_nhat_ky_thao_tac_get_by_id` (BLL dựng diff từng trường từ XML) |
| `GET api/nhat-ky/thao-tac/bang` | `sp_cau_hinh_audit_list` (kèm trạng thái trigger thật) |
| `GET api/nhat-ky/dung-luong` | `sp_nhat_ky_thong_ke_dung_luong` |

- Quyền chặn ở hai tầng: `[TokenAuthorize(maChucVuAllowed = "ADMIN")]` và SP (`fn_pham_vi_don_vi` có `ADMIN`).
  Phân trang `ROW_NUMBER() OVER (ORDER BY thoi_gian DESC, id DESC)`, tối đa 200 dòng / trang. Ngày lọc theo giờ máy chủ.
- **Không có API sửa / xoá nhật ký.** Xoá log cũ: người vận hành tự chạy bằng login có quyền
  `EXEC dbo.sp_nhat_ky_xoa_theo_lo @loai = N'thao_tac' | N'dang_nhap', @truoc_ngay = '<ngày>' [, @kich_thuoc_lo = 5000] [, @so_lo_toi_da = n];`.
  SP xoá `TOP (n)` lặp, mỗi lô một transaction nhỏ, bắt buộc `@truoc_ngay` cách hôm nay ≥ 30 ngày. Recovery model FULL
  thì backup log giữa các lần chạy.
- **Dung lượng (SQL Express):** giới hạn dữ liệu 10GB / CSDL (2008 R2 trở lên; 2008 thường là 4GB). Chạm giới hạn thì
  **mọi** lệnh ghi lỗi, và vì trigger ghi audit trong cùng câu lệnh nên nghiệp vụ cũng dừng. `GET api/nhat-ky/dung-luong`
  bật `CanhBao` khi dữ liệu đã dùng ≥ 80%.
- (DBA, tuỳ chọn) `DENY UPDATE, DELETE` trên hai bảng nhật ký và `DENY EXECUTE ON sp_nhat_ky_xoa_theo_lo` cho login
  ứng dụng (xem cuối `update_database.sql`). Chỉ có hiệu lực khi login đó không phải `db_owner` / `sysadmin`.

### 23.7. Đo trước khi bật đợt B

Sau 1–2 tuần chạy đợt A, rồi thử đợt B trên CSDL test với dữ liệu cỡ thật, đo:

1. Tốc độ tăng `nhat_ky_thao_tac` / ngày và % so với giới hạn (`GET api/nhat-ky/dung-luong`, RS2 theo bảng × tháng).
2. Transaction log trong lúc import TKB, đồng bộ NCKH và lúc engine tính lại điểm: `DBCC SQLPERF(LOGSPACE)` trước / sau.
3. Thời gian import TKB và đồng bộ NCKH trước / sau trigger, so với `CommandTimeout` 300–600s của các DAL import.
4. Khoá / blocking trong lúc import: `sys.dm_exec_requests` (`blocking_session_id`, `wait_type`) và lock escalation.

**Tiêu chí bật:** dự báo 12 tháng vẫn dưới 80% giới hạn; import không vượt 50% timeout; không có blocking kéo dài
ảnh hưởng người dùng. Đạt thì:

```sql
UPDATE dbo.cau_hinh_audit SET dang_bat = 1 WHERE dot_trien_khai = 'B';
EXEC dbo.sp_audit_tao_trigger;
```

Không đạt thì giữ đợt B tắt, hoặc chuyển riêng bảng đó sang tóm tắt (`muc_ghi = 2`).

### 23.8. Thứ tự deploy và kiểm thử

1. **SQL trước, C# sau.** C# mới gọi `sp_audit_set_context` ở mọi lần mở connection; thiếu SP đó thì mọi truy cập CSDL
   bị từ chối (đúng nguyên tắc 1). C# cũ chạy được với SQL mới (tham số mới đều có mặc định). Trong khoảng giữa, trigger
   vẫn ghi với `loai_tac_nhan = 3`.
2. `update_database.sql` có cổng xác nhận cuối (PHAN 5): đủ 33 cấu hình đúng mức / đợt, đợt A đang bật, mỗi bảng bật
   có `trg_audit_<bảng>` đúng bảng, đang chạy, đủ 3 sự kiện; bảng tắt không có trigger; không trigger mồ côi; không lộ
   cột bí mật. Sai bất kỳ mục nào thì file coi như **thất bại**, chưa deploy C#.
3. `Tests/test_nhat_ky.sql` (CSDL test, `BEGIN TRAN … ROLLBACK`): danh tính A/B, so sánh nhị phân, `@@ROWCOUNT`,
   tác nhân 2/3, CONTEXT_INFO IPv6, xoá, bí mật, chặn IP, tóm tắt + MERGE, đổi khoá chính, xem trước generator,
   FORBIDDEN, cổng xác nhận, ghi nhật ký lỗi thì không đổi mật khẩu.

### 23.9. Ngoài phạm vi / còn mở

- Access log là ActionFilter, nên request bị `TokenAuthorize` từ chối (401/403) không có dòng access log. Muốn đủ thì
  chuyển sang `DelegatingHandler`.
- Mật khẩu vẫn lưu plain-text (đợt riêng).
- Chưa có chính sách thời gian lưu giữ: người vận hành tự quyết và tự xoá theo lô (23.6).
