# Frontend nhiệm vụ PVCĐ

Triển khai theo `openapi.yaml` tag `NhiemVuPhucVu` và `schema_ghi_chu.md` mục 25, bản cập nhật ngày 12/10/2026.

## Điều hướng

Nhóm sidebar riêng **Nhiệm vụ PVCĐ**:

| Mục | URL | Phạm vi |
|---|---|---|
| Nhiệm vụ của tôi | `/nhiem-vu-phuc-vu` | Tham gia, kết quả cá nhân, nhiệm vụ mở đăng ký |
| Phân công và thực hiện | `/nhiem-vu-phuc-vu/quan-ly` | BGH / Trưởng khoa do cấu hình server xác nhận |
| Tổng hợp kết quả | `/nhiem-vu-phuc-vu/tong-hop` | BGH / Trưởng khoa; bắt buộc chọn một Khoa |
| Chi tiết nhiệm vụ | `/nhiem-vu-phuc-vu/:id` | Server kiểm quyền xem; hỗ trợ mở minh chứng của thành viên cũ |

Sidebar và `RequireRole` dùng chung cấu hình quyền. Không cấp quyền từ chức vụ JWT, không có nhánh ADMIN vượt quyền. Bộ chọn Khoa quản lý chỉ lấy dòng `LaTruongKhoa = true`, hoặc mọi Khoa nếu `LaBanGiamHieu = true`. Các thao tác chi tiết và trường nhập lấy trực tiếp cờ `ChoPhep*`.

## Luồng đã nối API

- Tạo nháp Khoa / Trường, sửa đủ trường, công bố, triển khai và hủy có lý do.
- Đăng ký / rút; suất được phân công hướng dẫn liên hệ Trưởng khoa.
- Gửi toàn bộ danh sách phân công, giữ người tự đăng ký; kiểm số lượng và tối đa một CT; khóa thêm/gỡ độc lập với đổi vai trò.
- Báo cáo chung, PDF theo giới hạn cấu hình, xem/tải qua cookie, gỡ minh chứng và checklist gửi.
- Trả báo cáo có lý do; chốt đúng đủ thành viên, bắt buộc lý do không hoàn thành và xác nhận không mở lại.
- Tổng hợp từng Khoa, phân biệt điểm Khoa và điểm mọi Khoa; lịch sử 16 hành động hiển thị tên từ server.
- Nguồn minh chứng 6 mở nhiệm vụ mới trên phiếu và card chấm điểm. Nguồn 14 hiển thị văn bản lưu trữ, không liên kết.

Mọi ghi dùng `Item` mới thay state. Upload trả DTO minh chứng nên đọc lại chi tiết. Đăng ký, rút và thêm/gỡ minh chứng không gửi `RowVersion`; thao tác khác gửi phiên bản vừa đọc. Gặp HTTP 409: đóng biểu mẫu cũ, tải lại chi tiết và danh sách, yêu cầu xem lại; không tự gửi lại thao tác ghi. Ngày/giờ giữ nguyên giờ Việt Nam, không chuyển theo timezone trình duyệt.

Các màn hình, hook, API, CSS và kiểm thử riêng module Nhiệm vụ Khoa cũ đã gỡ khỏi `src`. Không còn lời gọi `nhiem-vu-khoa`, `minh-chung-nvk` hoặc cấu hình cũ trong mã chạy. Bản sao nguồn trước khi thay nằm trong `.cache/nhiem-vu-phuc-vu-before-20261012/` vì workspace hiện không có Git sử dụng được.

## Xác minh

```powershell
$env:CI='true'
npm test -- --watch=false --runInBand --testPathPattern='nhiemVuPhucVu|NhiemVuPhucVu|menuConfig|RequireRole|apiError.kpi'
$env:CI='false'
npm run build
```

Kiểm thử tập trung bao phủ API, phân quyền sidebar/URL, thay đổi tài khoản, kiêm nhiệm, lọc/phân trang, phản hồi đến muộn, giữ nguyên trường khóa, phân công đầy đủ, checklist, RowVersion và minh chứng loại 6/14. Build còn các cảnh báo lint hiện có ngoài module mới. Lần chạy mở rộng phát hiện các test cũ ở `PhieuTuDong.test.js` và `phieuTuDongApi.test.js` không khớp implementation điểm tự động hiện tại (bao gồm tham chiếu hàm `diemHienThiTuDong` không còn export); không thay đổi cơ chế tính điểm để sửa các test đó trong đợt này.

Chưa xác minh bằng phiên đăng nhập thật hoặc dữ liệu BE/DB thật. Khi kiểm tra sau triển khai: dùng các tài khoản BGH, TK/TKL kiêm nhiệm, giảng viên, CT và người không có quyền; thử tranh suất cuối, đăng ký trong lúc TK sửa phân công, upload PDF rồi gửi báo cáo, trả/chốt và đối chiếu điểm sau Tổng hợp tự động. Backend và frontend phải dùng cùng hợp đồng mới vì các API cũ đã gỡ.
