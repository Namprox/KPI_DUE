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

Mã đơn vị duy nhất còn viết cứng trong SP: `N'P_DTBDCL'` (Phòng Đào tạo và Bảo đảm chất lượng, gộp từ
`P_DT` + `P_QLCL`) — TP của đơn vị này được chốt / xem toàn trường điểm TB phản hồi SV
(`sp_diem_tb_phan_hoi_sv_chot`, `_get_chi_tiet`). Đổi mã này phải sửa cả 2 SP.
Đơn vị mới thuộc nhóm Phòng/TT/Viện **không được** đặt mã `K_…`, kể cả khi danh sách tổ chức xếp nó cạnh các Khoa
(vd Viện Đào tạo quốc tế = `P_DTQT`).

### 1.3. `chuc_danh_nghe_nghiep` — Chức danh nghề nghiệp
Từ đợt "Chức danh chính thức": danh mục = **23 chức danh theo danh sách nhân sự thực tế + `HDLD_GV`**
(24 mã). Tên lưu **nguyên văn** danh sách (kể cả khoảng trắng sau "HĐLĐ/").

| Mã | Tên | Ngạch giảng dạy |
|---|---|---|
| `GV` / `GVC` / `GVCC` | Giảng viên / Giảng viên chính / Giảng viên cao cấp | ✅ |
| `HDLD_GV` | HĐLĐ/Giảng viên | ✅ |
| `HDLD_HUU` | HĐLĐ/ Hưu trí | ✅ (từ đợt "Thêm HDLD_HUU vào ngạch giảng dạy") |
| `CV`, `CVC`, `NCV`, `KS`, `TVV`, `YS` | Chuyên viên, Chuyên viên chính, Nghiên cứu viên, Kỹ sư, Thư viện viên, Y sĩ | — |
| `KTV`, `KTV_C`, `KTV_TC` | Kế toán viên, Kế toán viên chính, Kế toán viên trung cấp | — |
| `NV_PV68`, `NV_BV68`, `NV_KT68` | Nhân viên phục vụ/68, bảo vệ/68, kỹ thuật/68 | — |
| `HDLD_BV`, `HDLD_DC` | HĐLĐ/ Nhân viên bảo vệ, HĐLĐ dùng chung | — |
| `HDLD_CTVP`, `HDLD_CNTT`, `HDLD_CTDT`, `HDLD_KNST`, `HDLD_CTD` | HĐLĐ/ Hỗ trợ CTVP, CNTT, CTĐT, công tác khởi nghiệp và đổi mới sáng tạo, CT Đảng | — |

**Ngạch giảng dạy = `GV, GVC, GVCC, HDLD_GV, HDLD_HUU`**, khai báo ở **đúng 3 chỗ** phải khớp nhau:
`fn_loai_doi_tuong_ca_nhan`, `v_giang_vien_khoa`, `v_vien_chuc_don_vi`. Thêm ngạch giảng dạy mới = sửa cả ba
+ tạo định mức giờ giảng cho nó. Thông điệp lỗi `NOT_GIANG_VIEN_KHOA` của `sp_vi_pham_kiem_tra_quyen_ghi`
cũng liệt kê cứng danh sách này — sửa kèm.

Đợt "Thêm HDLD_HUU vào ngạch giảng dạy" (chỉ SQL, không đổi schema / C#):
- Người `HDLD_HUU` ở **Khoa** chuyển từ loại 2 sang loại 1: phiếu **mới** theo mẫu giảng viên, không tạo được
  phiếu quý, tính vào `N` của điểm trừ tập thể, chỉ nhận vi phạm loại 1. Ở Phòng / Trung tâm vẫn là loại 2.
- Phiếu **đã tạo** trước đợt giữ nguyên `loai_doi_tuong = 2` (snapshot lúc tạo). Script không tự chuyển —
  truy vấn KT5 trong `update_database.sql` của đợt liệt kê phiếu lệch để xoá / tạo lại từng phiếu.
- `HDLD_HUU` phải có dòng `dinh_muc_giang_vien` cho từng năm (KT3 liệt kê năm còn thiếu), nếu không bước
  duyệt hồ sơ trả 400.

Các mã cũ `TROGIANG, TAPSU, GS, PGS, NV, KHAC` đã **xoá hẳn** (người mang PGS/GS chuyển tạm sang `GVCC`,
NV → `HDLD_CNTT` — dữ liệu dev). GS/PGS là **học hàm**, không phải chức danh nghề nghiệp.

### 2.2. `dinh_muc_giang_vien` — chỉ còn giờ giảng
Từ đợt "Chức danh chính thức": cột `gio_nckh`, `gio_pvcd` đã **DROP**. Định mức = `gio_giang_ly_thuyet`
(270 cho 4 ngạch `GV, GVC, GVCC, HDLD_GV`; `HDLD_HUU` vào ngạch sau nên định mức của nó phải tạo riêng
theo từng năm — xem §1.3). Hệ quả:
- Điều kiện "đủ định mức giờ NCKH" khi duyệt hồ sơ do **Trưởng khoa tick tay**; hệ thống không còn gợi ý.
- Điểm tự động NCKH (`NCKH_GIO_TY_LE`) **không đổi** — dùng `nckh_gio_nckh.gio_nckh_dinh_muc` của web NCKH.
- Còn lại nhưng **không còn tác dụng**: `chuc_vu.ty_le_dinh_muc_nckh`; `ngoai_le_dinh_muc.he_so_nckh /
  he_so_giam_nckh / so_gio_them_nckh / he_so_giam_pvcd / mien_nckh`; `phieu_danh_gia.gio_nckh_dinh_muc_ap_dung /
  gio_pvcd_dinh_muc_ap_dung / he_so_nckh_ap_dung` (phiếu mới lưu NULL).
- `schema.sql` chưa phản ánh việc DROP 2 cột (file read-only) — nguồn sự thật là DB sau `update_database.sql`.

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
  Giảng viên = `chuc_danh_nghe_nghiep.ma_chuc_danh IN ('GV','GVC','GVCC','HDLD_GV','HDLD_HUU')`
  — xem view `v_giang_vien_khoa` trong procedure.sql.
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
| `ty_le_giam` | `ReductionPercentage` | Tỷ lệ định mức, đơn vị **%** (vd 85) | `chuc_vu.ty_le_dinh_muc_nckh` (không còn dùng) |
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
| `sp_phieu_khoa_uu_tien_xuat_sac` | TK/TKL/TP chỉ định ai được suất cuối khi đồng hạng | `TO_TRINH_DA_TRINH`, `FORBIDDEN`, `FORBIDDEN_DON_VI` |

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
   `xep_loai_khoa`. Mức 4 không có đường ghi nào khác ngoài `sp_to_trinh_khoa_dong_goi`.
4. **(Luồng tách đôi)** Phiếu ở trạng thái 4 ⟹ `can_ht_duyet = 1`. Hồ sơ thường không bao giờ
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

Sáu cột phục vụ roll-up: `diem_co_ban_tb_quy`, `so_quy_da_chot`, `danh_sach_quy_da_chot`
(ví dụ `'1,2,4'` — `so_quy_da_chot = 3` một mình không audit được là những quý nào),
`ngay_tong_hop_quy`, `id_nguoi_tong_hop_quy`, cộng `nguon_diem_co_ban`.

#### State machine RÚT GỌN của phiếu quý

Dùng lại cột `trang_thai` nhưng **chỉ ba giá trị**, và **đọc giá trị 2 khác hẳn** luồng năm:

| | Luồng NĂM | Luồng QUÝ |
|---|---|---|
| 1 | Nháp | Nhân viên đang tự chấm |
| 2 | Đang thẩm định | **Đã nộp, chờ Trưởng phòng duyệt** |
| 3 | Chờ Trưởng khoa duyệt | **KHÔNG DÙNG** |
| 4 | Chờ Hiệu trưởng duyệt | **KHÔNG DÙNG** |
| 5 | Hoàn tất | TP đã chốt điểm. `xep_loai` **NULL vĩnh viễn** |

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
| Khoa (`ma_don_vi LIKE 'K_%'`) | ngạch giảng dạy: `GV, GVC, GVCC, HDLD_GV, HDLD_HUU` | **1** | Giảng viên |
| Khoa | NULL, hoặc mọi mã còn lại (`CV, CVC, NCV, KTV, HDLD_CNTT, ...`) | **2** | Viên chức / NLĐ — nhân viên văn phòng Khoa |
| Phòng / Trung tâm / Trường | bất kỳ | **2** | Viên chức / NLĐ |

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

## 7. NHIỆM VỤ THEO PHÂN CÔNG CỦA KHOA (KPI Nhóm III)

### Vì sao đảo chiều nhập liệu

Nhóm III trước đây dự kiến để **giảng viên tự kê khai** (bảng `nhiem_vu_cong_dong`).
Cách đó sai nghiệp vụ: vai trò *chủ trì* / *phối hợp chính* / *phối hợp* là **quan hệ
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

| Cờ | Ai | Làm gì |
|---|---|---|
| `can_nhap` | `TK` `TKL` `TP` **`TLGVK`** trong phạm vi đơn vị, hoặc `ADMIN` | Tạo/sửa/xoá nhiệm vụ, phân công, xử lý phản hồi, minh chứng cấp nhiệm vụ |
| `can_chot` | `TK` `TKL` `TP` trong phạm vi đơn vị, hoặc `ADMIN` | Chốt kỳ / mở lại kỳ — **`TLGVK` CỐ Ý bị loại** |
| `can_xem`  | `can_nhap`, hoặc `HT` / `ADMIN` | Xem toàn bộ |

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
| 2 Viên chức / NLĐ | `loai_doi_tuong = 2`, chức vụ ∉ bộ 6 mã | **TỔNG đầu người của nhóm** | trong Top **và** `xep_loai_khoa = 3` |
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

1. **MẪU SỐ BẤT ĐỐI XỨNG GIỮA CÁC NHÓM — cố ý, đừng "sửa cho nhất quán".** Nhóm 1 lấy *số
   người mức 3*; nhóm 2 và 3 lấy *tổng đầu người*. Đây là quyết định nghiệp vụ.
   Khoa có 30 GV mà chỉ 10 người mức 3 ⇒ hạn ngạch nhóm 1 = `FLOOR(10 × 0.2)` = **2**.
   Phòng có 8 viên chức mà chỉ 2 người mức 3 ⇒ hạn ngạch nhóm 2 = `FLOOR(8 × 0.2)` = **1**.
2. **Làm tròn XUỐNG, NHƯNG tối thiểu 1 suất** nếu mẫu số > 0. Mẫu số 27 ⇒ 5; mẫu số 3 ⇒
   `FLOOR(0.6) = 0` ⇒ nâng lên **1**. Đây là ngoại lệ nghiệp vụ đã xác nhận: nhóm 1–4
   người sẽ vượt tỷ lệ 20% trên thực tế (nhóm 3 người ⇒ 1 suất = 33%). Chấp nhận.
3. **Viên chức/NLĐ CÓ tranh hạn ngạch** và lên được mức 3 (từ 101 điểm) lẫn mức 4 — ở bảng
   riêng của mình. Trần mức 2 cũ (`VUOT_MUC_VIEN_CHUC`) đã bị gỡ bỏ.
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
| **`so_mau_so`** | **Mẫu số thực dùng** — nhóm 1 = `so_nguoi_muc3`; nhóm 2/3 = `so_nguoi` |
| `so_du_dieu_kien` | Số người đủ điều kiện mức 4 trong **toàn** nhóm (không chỉ trong Top) |
| `han_ngach` | `MAX(1, FLOOR(so_mau_so × ty_le))`, hoặc 0 khi `so_mau_so = 0` |
| `so_dat` | Thực tế đạt mức 4 — **có thể < `han_ngach`** |

FE **phải** đọc `so_mau_so`, KHÔNG được tự suy mẫu số từ `so_nguoi_muc3` hay `so_nguoi`
(mẫu số bất đối xứng giữa các nhóm — xem §8.2 điểm 1).

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


---

## 9. KÊ KHAI GIỜ QUY ĐỔI THEO PHỤ LỤC II

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
| 3 | `fn_ke_khai_gio_quy_doi_quyen` + module kê khai giờ quy đổi | Xong |
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
  bảng xếp hạng riêng (nhóm 2) với mẫu số = tổng đầu người, và cán bộ quản lý có nhóm 3
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

## 13. GIỜ GIẢNG THEO THỜI KHOÁ BIỂU (`gio_giang_tkb`)

### 13.0. Vì sao có module này

Mục 9.0 ghi "Thời gian thực hiện" của giảng viên có **hai** nguồn, và nguồn (1) — *tiết
giảng dạy quy đổi* — **CHƯA làm**. Module này **chính là nguồn (1)**, lấy từ file Excel
thời khoá biểu thay vì chờ hệ thống ngoài gọi sang.

Kết quả cuối cùng nằm ở `sp_gio_giang_tkb_tong_hop` (`GET api/gio-giang-tkb/tong-hop`):

```
TỔNG GIỜ GIẢNG trong năm = giờ theo TKB + giờ kê khai Phụ lục II đã duyệt
```

Bảng này khoá theo **năm đánh giá**, tự lọc theo kỳ học, và có đường nối về nhân viên —
khác hẳn cách nhập staging phẳng theo **kỳ học** trước đây, vốn chỉ nhận các cột tổng giờ
đã tính sẵn ở nơi khác nên không kiểm chứng được.

### 13.1. Phạm vi CỐ Ý chưa làm — đã chốt với người dùng

- **KHÔNG** thêm mã chấm điểm tự động vào `fn_nckh_diem_tu_dong`. Module chỉ lưu và phát
  API đọc, giống hệt cách module kê khai Phụ lục II dừng lại.
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

### 13.4. Quy đổi tiết → giờ chuẩn theo sĩ số

| `SLSV_DangKyHoc` | Hệ số |
|---|---|
| ≤ 40 | 1,0 |
| 41 – 50 | 1,1 |
| 51 – 60 | 1,2 |
| 61 – 70 | 1,3 |
| 71 – 80 | 1,4 |
| ≥ 81 | 1,5 |

Hệ số áp **theo tiết**, không theo lớp: lớp 90 SV dạy 45 tiết = 45 × 1,5 = 67,5 giờ chuẩn.
Sĩ số ≤ 0 (ô trống / thiếu dữ liệu) áp bậc thấp nhất 1,0.

`gio_chuan_trong_nam = ROUND(so_tiet_trong_nam × he_so, 2)`, làm tròn `AwayFromZero` để
không lệch với cách người dùng cộng tay trên Excel. Làm tròn **từng lớp** rồi mới cộng, đúng
thứ tự mà bảng chi tiết hiển thị — nhờ vậy tổng ở dòng header luôn bằng tổng các dòng chi
tiết mà người dùng nhìn thấy.

⚠️ **BẤT BIẾN — toàn bộ quy tắc ở tầng C#.** `BLL/GioGiangTkbService` lọc kỳ học,
`Helper/GioChuanQuyDoi` quy đổi tiết → giờ. SQL **chỉ nhận** các con số đã chốt qua TVP
`dbo.GioGiangTkbRow`. Tuyệt đối không tính lại ở SQL — nhân bản logic sẽ lệch.

### 13.5. Hai cột số — vì sao chỉ cần hai

| Cột | Ý nghĩa |
|---|---|
| `so_tiet_trong_nam` | tổng cột `SoTiet` của các lớp thuộc 3 kỳ của năm |
| `gio_chuan_trong_nam` | tổng `SoTiet × hệ số` của từng lớp |

Bản trước có **bốn** cột (`so_tiet_excel`, `so_tiet_tkb`, `so_tiet_nghi`,
`so_tiet_trong_nam`) để lọc dần từng bước và đối chiếu tay. Khi số tiết lấy thẳng từ file thì
cả bốn luôn bằng nhau (hoặc bằng 0), nên ba cột đầu đã bị **bỏ hẳn** khỏi bảng, khỏi TVP và
khỏi DTO — xem `App_Data/update_database.sql`.

Dòng trùng `(họ tên, kỳ học, mã lớp tín chỉ)` được **giữ nguyên cả hai** — đồng giảng là có
thật, khử trùng sẽ làm mất giờ — kèm cảnh báo `TRUNG_LOP`. Vì vậy TVP `GioGiangTkbRow` **cố ý
không có PRIMARY KEY**.

### 13.6. Ánh xạ họ tên → nhân viên (`gio_giang_tkb_anh_xa`)

File TKB **chỉ có** `HoLot` + `Ten` — không mã giảng viên, không email. Khoá gộp là
`ho_ten_chuan` (bỏ dấu + gộp khoảng trắng + viết hoa, do `Helper/ChuanHoaTen` sinh ra).

**Quyết định đã chốt: hệ thống TỰ ánh xạ khi tên khớp duy nhất.** Import xong, mọi
`ho_ten_chuan` khớp **đúng một** nhân viên đang hoạt động được gắn ngay. Trùng tên (≥ 2
người) hoặc không khớp ai thì để trống — người dùng xử lý tay.

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

Bốn nơi cần biết "tên này khớp ai": hai đường ghi ở trên, `sp_gio_giang_tkb_list` và
`sp_gio_giang_tkb_chi_tiet`. Trước đây mỗi nơi tự viết lại; nay tất cả gọi chung hàm này,
trả `(ho_ten_chuan, id_nhan_vien, so_nguoi_khop)`.

Nó là **multi-statement TVF** chứ không phải inline, có lý do: bên trong vật hoá tên so sánh
của nhân viên vào một table variable **một lần** rồi mới join. Để `fn_gio_giang_tkb_ten_so_sanh`
vào thẳng mệnh đề `JOIN` thì số lần gọi hàm là `N * M` thay vì `M`.

`nhan_vien` là **1 dòng / người** (PK `id_nhan_vien`, `uq_ma_nhan_vien`; kiêm nhiệm nằm ở
`nhan_vien_chuc_vu`) — nên `so_nguoi_khop > 1` đúng nghĩa là **hai người khác nhau trùng
tên**, không phải một người bị đếm hai lần.

`SoNguoiKhopTen` được trả ra API: với dòng chưa ánh xạ, `0` = không có ai tên này trong hệ
thống (sai chính tả / chưa có hồ sơ), `≥ 2` = trùng tên, cần người chọn.

Hệ quả: `GoiYIdNhanVien` nay **gần như luôn null** — tên khớp duy nhất thì đã được gắn rồi.
Cột vẫn giữ (không phá hợp đồng API) và còn giá trị trong khoảng giữa hai lần quét, ví dụ
vừa thêm nhân viên mới mà chưa gọi `POST api/gio-giang-tkb/anh-xa/tu-dong`.

Ba tính chất làm nên giá trị của bảng này:

1. **Không gắn `id_nam`** → ánh xạ làm một lần dùng cho mọi năm.
2. **Không bị xoá khi import lại** → công sức ánh xạ tay không mất.
3. **Join lúc ĐỌC** (không lưu `id_nhan_vien` trên `gio_giang_tkb`) → sửa ánh xạ có hiệu lực
   **ngay**, không phải import lại file.

Một nhân viên có thể nhận **nhiều** tên (file ghi tên không nhất quán giữa các kỳ), nên
**không** đặt UNIQUE trên `id_nhan_vien`, và `sp_gio_giang_tkb_tong_hop` phải `SUM` chứ
không lấy một dòng.

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
`@id_nam` rồi chèn lại, trong **một** transaction (khuôn của `sp_nckh_gio_nckh_dong_bo`).

**GUARD: TVP rỗng → KHÔNG xoá gì.** Nếu không, một file lỗi sẽ xoá sạch dữ liệu cũ.

Quyền: **ADMIN / HT** — import ghi đè cả năm nên không mở cho cấp Khoa. Ánh xạ thì mở tới
TK / TKL / TP, kể cả `sp_gio_giang_tkb_anh_xa_tu_dong`: thủ tục đó chỉ **thêm** ánh xạ, không
phá dữ liệu nào, nên không cần siết bằng cổng của import.

### 13.8. Tổng hợp — hợp hai nguồn, không phải giao

`sp_gio_giang_tkb_tong_hop` lấy tập giảng viên là **HỢP** của:

- người có dòng TKB **đã ánh xạ**, và
- người có `ke_khai_gio_quy_doi` **đã chốt** (`trang_thai = 3`).

Người chỉ có một nguồn vẫn xuất hiện, nguồn còn lại bằng 0. Dùng `INNER JOIN` ở đây sẽ làm
biến mất người chưa kê khai — đúng nhóm mà bảng này cần nhìn thấy nhất.

Dòng TKB **chưa ánh xạ** không vào được bảng tổng hợp (không biết là ai). Số lượng những
dòng đó trả về ở `SoDongChuaAnhXa` — còn lớn hơn 0 nghĩa là **tổng hợp chưa đầy đủ**, FE
phải cảnh báo trước khi ai đó dùng số liệu.

⚠️ **BẤT BIẾN:** mệnh đề lọc "bản kê đã chốt + dòng đã duyệt" và phép tách SĐH / ĐH được
**nhân bản** từ `sp_ke_khai_gio_quy_doi_tong_hop`. Sửa một bên phải sửa cả bên kia, nếu
không hai endpoint trả hai con số khác nhau cho cùng một giảng viên.

Cổng quyền **sao y** SP gốc: ADMIN/HT toàn trường; TK/TKL/TP theo đơn vị mình giữ chức vụ
(+ cây con). Dùng `EXISTS` trên tập `DISTINCT` chứ **không** `JOIN`, để người kiêm nhiệm
nhiều đơn vị không bị nhân dòng.

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
2. **Lưu NGUYÊN dữ liệu giảm trừ** theo (năm × nhân viên). Đợt này **chưa tính** giảm trừ.

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
