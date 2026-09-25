# Rà soát FE KPI đơn vị

Nguồn hợp đồng: `fe-danh-gia-don-vi.md`, mục 3, 4 và checklist 7.

## Các nơi gọi API

- `src/utils/phieuDonViApi.js`: danh sách, chi tiết, tạo phiếu, ba lớp điểm và các bước chuyển trạng thái.
- `src/utils/minhChungDonViApi.js`: minh chứng theo chi tiết đơn vị, xem/tải/xóa minh chứng.
- `src/utils/kpiDonViWorkspace.js`: tìm/tạo phiếu qua service.
- `src/pages/DanhGia/KpiDonViWorkspace.js`: dùng chung cho đánh giá/lịch sử Khoa và Phòng.
- `src/pages/DanhGia/ChiTietPhieuDonVi.js`, `ChiTietPhieuPhong.js`: nhập/chấm/duyệt và minh chứng.
- `src/pages/DanhGia/ChiTietLichSuKpiDonVi.js`: đọc kết quả/lịch sử.
- Mới: `src/pages/DanhGia/PhieuDonViChoCham.js`, danh sách và đường vào chi tiết chung cho trưởng đơn vị được giao.

## Điểm lệch đã xác định trước khi sửa và kết quả

| Điểm lệch | Đã sửa |
| --- | --- |
| Chưa có query/hàng đợi `choToiCham` | Menu Chờ tôi chấm KPI đơn vị, tab Chờ tôi chấm và Tất cả phiếu được xem; không gửi bộ lọc đơn vị công tác |
| Quyền chấm mở theo chức vụ cho cả phiếu | Chỉ mở dòng khi `TrangThai == 2 && DuocChamDuyetDv === true`; cờ thiếu/false đều khóa |
| Chưa hiển thị đơn vị được giao | Badge `Giao: TenDonViCham` trên các thẻ tiêu chí |
| Không xác nhận được điểm tự động | Nút Xác nhận gửi `DiemTongHop`, kể cả 0; hộp thoại sửa có giá trị nguồn gợi ý |
| Dòng đã chấm bị khóa ngay | Cho sửa tiếp trong trạng thái 2 nếu backend vẫn cấp quyền |
| Nút Duyệt không kiểm tra số tiêu chí được giao còn thiếu | Khóa theo `SoTieuChiGiaoChuaCham`, hiện số còn chờ; người chỉ được giao chấm không thấy nút Duyệt |
| Chưa xử lý 422 mới / 403 chưa tải lại quyền | Hiện Message backend, đóng hộp thoại, tải lại phiếu; đánh dấu dòng được giao nhập tay còn thiếu điểm |
| Ghi điểm trạng thái 2 chỉ dựa vào GET để cập nhật phiên bản | Cập nhật `NewRowVersion` ngay sau PUT, sau đó đồng bộ chi tiết/header |
| Route Khoa/Phòng tách vai trò khiến người được giao thiếu đường vào | Thêm route chung `/phieu-don-vi-cho-cham/:id`, cùng quyền với menu; kiểm tra cả menu và URL |

Giữ JSON PascalCase. Người được giao chỉ xem/tải minh chứng; thêm/xóa vẫn thuộc bước nhập của thư ký. Giao diện tái sử dụng `cd-*`, `cdm-*`, `pl2-*`, `TieuChiCardHeader` và hộp thoại hiện có như các trang giảng viên.

## File tạo/chỉnh sửa

- Service: `src/utils/phieuDonViApi.js`, `src/utils/phieuDonViApi.test.js`.
- Màn hình: `src/pages/DanhGia/ChiTietPhieuDonVi.js`, `ChiTietPhieuPhong.js`, `PhieuDonViChoCham.js`; test `ChiTietPhieuDonVi.test.js`, `PhieuDonViChoCham.test.js`.
- Form/thẻ: `src/components/DanhGia/DanhGiaKpiDonVi/DanhGiaDonViForm.js`, `DuyetDonViForm.js`; `src/components/DanhGia/DanhGiaKpiPhong/DanhGiaPhongForm.js`, `DuyetPhongForm.js`; `src/components/DanhGia/TieuChiChamDonViCard.js`, `TieuChiKetQuaDonViCard.js`.
- Điều hướng: `src/config/menuConfig.js`, `menuConfig.sidebar.test.js`, `src/routes/AppRoutes.js`.
- Bản rà soát này. Không sửa tài liệu hợp đồng backend.

## Kiểm tra và giới hạn

- Toàn bộ 24 test suites / 164 tests qua; sau đó hai test mới về hàng đợi và RowVersion cũng qua trong lượt chạy tập trung (tổng 166 test đã được chạy thành công).
- Build thông thường thành công, có cảnh báo lint ngoài các file thay đổi. Build với `CI=true` bị chặn bởi các cảnh báo đó.
- Chưa xác thực bằng tài khoản thật/API triển khai hoặc kiểm tra trực quan trên trình duyệt.
- Ngoài checklist 7: màn hình Khoa vẫn chưa có thao tác cấp Trường (trạng thái 3–5). Màn hình Phòng vẫn chưa có thao tác Tổng hợp KPI ở trạng thái 1; mẫu Phòng trước đây được FE giả định toàn tiêu chí nhập tay. Hai giới hạn sẵn có này chưa được triển khai trong lần cập nhật phân quyền chấm này.
