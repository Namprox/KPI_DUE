# FE sau khi gỡ kê khai giờ quy đổi — 2026-09-30

Đã gỡ các màn, menu, quyền, API client, hook minh chứng và CSS của module. Tổng hợp giờ giảng chỉ còn TKB; tỷ lệ hoàn thành dùng TKB + QNDB. FE hiển thị nguyên `TongGio`, `TyLeHoanThanh`, `DiemDuKien` từ API, không tính lại hoặc bổ sung field cũ khi JSON thiếu field.

## Tệp đã xoá (10)

- `src/pages/CaNhan/KeKhaiGioQuyDoi.js`
- `src/pages/QuanLyChamDiem/DuyetKeKhaiGioQuyDoi.js`
- `src/pages/QuanLyChamDiem/ChiTietDuyetKeKhai.js`
- `src/components/KeKhaiGioQuyDoi/DanhMucCongViecModal.js`
- `src/components/KeKhaiGioQuyDoi/MinhChungDongBox.js`
- `src/components/KeKhaiGioQuyDoi/MinhChungKeKhaiRow.js`
- `src/hooks/useMinhChungKeKhaiPreview.js`
- `src/utils/keKhaiGioQuyDoiApi.js`
- `src/utils/keKhaiGioQuyDoiApi.test.js`
- `src/css/KeKhaiGioQuyDoi.css`

Không tìm thấy màn danh mục/tổng hợp độc lập, store hoặc badge chung còn phụ thuộc module; danh mục nằm trong modal và số chờ duyệt nằm trong màn đã xoá.

## Tệp sửa chức năng (6)

| Tệp | Thay đổi |
| --- | --- |
| `src/routes/AppRoutes.js` | Xoá import/màn cũ; bookmark dùng redirect `replace` trước guard của trang đích. |
| `src/config/menuConfig.js` | Xoá menu cá nhân/duyệt và các rule URL dẫn xuất của module. |
| `src/utils/roles.js` | Xoá tập quyền riêng của kê khai giờ, giữ quyền thành tích. |
| `src/utils/gioGiangTyLeTypes.d.ts` | Xoá `GioKeKhai` và `IdKeKhai` của DTO giờ giảng. |
| `src/utils/gioGiangDienGiai.js` | Xoá nhóm và nhánh mô tả `GIO_KE_KHAI`. |
| `src/pages/QuanLyKeHoach/GioGiangTkbPanels.js` | Xoá cột nguồn kê khai, giữ `GioTkbDaiHoc`/`GioTkbSauDaiHoc`, sửa chú thích, sửa colspan thành 6. |

Màn tổng hợp không có tính năng xuất dữ liệu Excel/CSV cần sửa. Tính năng nhập/tải mẫu TKB vẫn giữ nguyên.

### Bookmark cũ

| Đường dẫn cũ, gồm cả đường dẫn con | Trang đích |
| --- | --- |
| `/ke-khai-gio-quy-doi/*` | `/gio-giang-cua-toi` |
| `/quan-ly/ke-khai-gio-quy-doi/*` | `/ty-le-hoan-thanh-gio-giang` |
| `/cong-viec-quy-doi/*` | `/quan-ly-gio-giang` |
| `/quan-ly/cong-viec-quy-doi/*` | `/quan-ly-gio-giang` |

Người không có quyền trang đích thấy thông báo không có quyền; không có trang trắng hoặc request API cũ.

## Test sửa/thêm (7)

- `src/config/menuConfig.sidebar.test.js`: thứ tự menu sau khi xoá.
- `src/config/menuConfig.truongPhongTuongDuong.test.js`: bỏ quyền URL cũ khỏi danh sách TP tương đương.
- `src/pages/QuanLyKeHoach/QL_GioGiang.test.js`: fixture mới chỉ có TKB, kiểm tra đủ 6 cột và tổng giờ API.
- `src/pages/QuanLyKeHoach/GioGiangDienGiai.test.js`: TKB + QNDB, API số nguyên trạng, request có `idNhanVien`, không có nhóm nguồn kê khai.
- `src/pages/QuanLyKeHoach/GioGiangTyLe.test.js`: thêm `MemoryRouter` cho form đã có link tới trang giờ cá nhân. Sửa lỗi test có trước đợt này.
- `src/pages/Login.test.js`: cập nhật locator theo nhãn hiện tại. Sửa lỗi test có trước đợt này.
- `src/routes/AppRoutes.retiredTeachingHours.test.js` (mới): bookmark, guard trang đích, menu không còn module với GV/TK/TKL/TP/HT/ADMIN.

## Tệp chỉ sửa comment (9)

Xoá các mô tả so sánh hoặc tham chiếu tệp của module đã gỡ; không thay đổi luồng thành tích:

- `src/utils/keKhaiThanhTichApi.js`
- `src/hooks/useMinhChungThanhTichPreview.js`
- `src/css/KeKhaiThanhTich.css`
- `src/pages/CaNhan/KeKhaiThanhTich.js`
- `src/pages/CaNhan/KeKhaiThanhTich.test.js`
- `src/pages/QuanLyChamDiem/DuyetKeKhaiThanhTich.js`
- `src/pages/QuanLyChamDiem/ChiTietDuyetThanhTich.js`
- `src/components/KeKhaiThanhTich/DanhMucThanhTichModal.js`
- `src/components/KeKhaiThanhTich/MinhChungDongThanhTichBox.js`

## Tài liệu sửa/thêm

- `docs/fe-ty-le-hoan-thanh-gio-giang.md`: công thức, JSON mẫu và hướng dẫn diễn giải theo contract mới.
- `docs/fe-remove-converted-hours.md` (tệp này): danh sách thay đổi và bằng chứng kiểm tra.

## Kết quả grep cố ý giữ

| Kết quả | Lý do giữ |
| --- | --- |
| Tên route cũ trong `AppRoutes.js` và test redirect | Chỉ nhận bookmark để chuyển hướng, không gọi API cũ. |
| `IdKeKhai`, `DiemQuyDoi`, "quy đổi" trong API/pages/components/tests/danh mục thành tích | Là kê khai thành tích vượt trội; giữ cả luồng kê khai/duyệt/minh chứng. |
| `nckhApi.js`, dữ liệu NCKH và mô tả NCKH trong OpenAPI/schema | Thuộc NCKH, giữ `nckh/ke-khai-khac` và giờ/điểm NCKH. |
| `NhiemVuKhoaCuaToi.js`, `nhiemVuKhoaApi.js`, `NhiemVuKhoaFormModal.js`, `NvkPanelTongHop.js` | Thuộc PVCĐ/nhiệm vụ Khoa, giữ điểm quy đổi và trần điểm. |
| `phieuDonViApi.js`, `DanhGiaKhoaMock.js` | Quy đổi số sinh viên đánh giá, không phải giờ kê khai. |
| `QUY_DOI_THEO_COT_O` và các mã giảm trừ/đào tạo | Giải trình thời gian giảm định mức, không phải module kê khai giờ. |
| Giờ quy đổi trong `HoSoKpiGiangVien.js` | Màn cũ đọc `gio-giang-import` qua `fetchGioGiangTheoNam`, không dùng API kê khai đang gỡ. Ngoài phạm vi; route này không có trong OpenAPI hiện tại, chưa kiểm tra runtime. |
| Lịch sử module đã gỡ trong `docs/schema.sql`, `docs/schema_ghi_chu.md`, mô tả gỡ nguồn cũ trong `docs/openapi.yaml` | Các tệp contract/schema đang có sửa sẵn trước đợt FE; giữ nguyên nội dung và lịch sử của backend. |
| Tên module/field cũ trong báo cáo này | Ghi nhận những gì đã xoá, không phải contract hoặc consumer còn hoạt động. |

Grep case-insensitive toàn repo, gồm source/docs/public và các tệp bị ignore (loại trừ dependency, build, coverage, Git), không còn tên DTO/field nguồn kê khai trong `src`. Không còn endpoint cũ trong API client/hooks/components/pages. Các đường dẫn cũ chỉ còn ở redirect và test của redirect.

## Kiểm tra

- Test toàn bộ: **43 suite / 279 test pass**.
- Build production: **pass**, có cảnh báo lint sẵn của repo.
- Type declarations: `tsc --noEmit --skipLibCheck src/utils/gioGiangTyLeTypes.d.ts` **pass**. Repo JavaScript không có script type-check toàn bộ.
- Lint các file chức năng đã sửa và test mới/sửa liên quan (trừ hai test có lỗi sẵn bên dưới): **pass**.
- Lint toàn `src`: **38 lỗi / 37 cảnh báo**. Đối chiếu nguồn Git HEAD của từng file lỗi: số lỗi trước/sau đều giống nhau. Hai test thuộc đợt này có lỗi sẵn là `QL_GioGiang.test.js` (4 lỗi) và `KeKhaiThanhTich.test.js` (9 lỗi). Không mở rộng thành việc sửa lint các module khác.
- `git diff --check`: **pass**.
- OpenAPI đang chạy `localhost:9090/api/openapi.yaml`: HTTP 200, không còn route API cũ hoặc field giờ kê khai đã xoá.

### Browser và API thật

Đã kiểm tra bản FE tại `http://localhost:3006`, phiên người dùng cung cấp có quyền Trưởng Khoa:

- Trang tỷ lệ tải danh sách 21 giảng viên trong phạm vi, không có cột kê khai.
- Giải trình theo người và trang cá nhân tải thành công `gio-giang-tkb/ty-le-hoan-thanh?idNam=2026&idNhanVien=177`; TKB **493,5**, tổng giờ **493,5**, định mức **189**, tỷ lệ **261,11%**, điểm **20/20**; không có khoản kê khai.
- Bookmark cá nhân và bookmark chi tiết duyệt cũ chuyển đúng trang giờ giảng, không trang trắng.
- Theo dõi đường gọi qua `apiFetch` bằng log tạm giới hạn ở cổng QA: chỉ có `auth/me`, `namdanhgia`, `donvi`, `gio-giang-tkb/ty-le-hoan-thanh` (có/không `idNhanVien`); không gọi hai API đã gỡ. Log tạm đã xoá, `src/utils/api.js` không có diff. Công cụ browser không cung cấp tab Network trực tiếp; đây là bằng chứng từ đường gọi client.
- Trang quản lý TKB/tổng hợp và kê khai thành tích bị chặn đúng quyền của tài khoản hiện tại. Hai màn này đã kiểm tra bằng test, **chưa có browser proof với tài khoản đủ quyền**.
- Các test API/kê khai/duyệt/chi tiết thành tích đều pass; không thay đổi hành vi của module đó.

Các thay đổi sẵn của người dùng ngoài danh sách ở trên được giữ nguyên. Không chạy migration hoặc sửa backend/database.
