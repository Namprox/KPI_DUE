# Hoạt động đào tạo — Front-end

Module ghi nhận hoạt động đào tạo theo năm, sử dụng 14 thao tác API của tag `HoatDongDaoTao` trong `openapi.yaml`.

- `/hoat-dong-dao-tao`: danh sách, bộ lọc, phân trang, form thêm nhiều giảng viên, sửa một bản ghi, xoá mềm có lý do, chi tiết và lịch sử; import kiểm tra rồi xác nhận cùng file.
- `/hoat-dong-dao-tao/uy-quyen`: danh sách ủy quyền, lịch sử đã thu hồi, ứng viên của phòng, cấp và thu hồi quyền. Guard URL và sidebar chỉ mở khi `/quyen` trả `LaQuanLy=true`.

`HoatDongDaoTaoProvider` nạp quyền sau khi có tài khoản, nạp lại khi vào module, loại bỏ quyền cũ khi đổi tài khoản và bỏ qua response đến muộn. Tên menu/trang cá nhân dựa trên `XemTatCa` / `XemTheoKhoa`; nút nhập dựa trên `DuocNhap`; sửa/xoá từng dòng dựa trên `ChoPhepSua === true`. Không dùng mã chức vụ, đơn vị chính hoặc phân loại KPI để cấp quyền module này. Phạm vi danh sách do backend lọc.

Picker tìm giảng viên qua `/giang-vien` sau 350 ms, khi có từ khoá hoặc Khoa. Không dùng danh sách nhân viên chung để chọn người ghi nhận. Lỗi 409/422 giữ nguyên form, người đã chọn và thông báo chi tiết từ backend.

PUT luôn gửi đủ trường PascalCase; trường tuỳ chọn trống gửi `null` để xoá. Ngày gửi `yyyy-MM-dd`, không chuyển ngày quyết định qua UTC. `CoThayDoi=false` hiện thông báo không có thay đổi.

Import gửi `file`, `idNam`, `chiKiemTra` bằng FormData qua `apiFetch`; không tự đặt Content-Type. Xác nhận chỉ mở sau kết quả `ChiKiemTra=true` có `SoThem>0`; thay file xoá kết quả kiểm tra cũ. Dòng trùng/lỗi, cảnh báo từng dòng và `Warnings` cấp file đều được hiển thị. File mẫu tải blob; JSON báo lỗi quyền được hiển thị thay vì tải thành Excel.

Module không hiển thị điểm, không tạo bước duyệt và chưa tích hợp dữ liệu vào phiếu KPI.

## Kiểm chứng

Các test `hoatDongDaoTaoApi.test.js`, `HoatDongDaoTao.test.js`, `HoatDongDaoTaoContext.test.js` kiểm tra hợp đồng request, quyền menu/URL, quyền từng dòng, form nhiều người, xoá, lịch sử, import hai bước và ủy quyền. Chạy cùng các test sidebar, guard và routes hiện có.

```powershell
$env:CI='true'
npm test -- --watchAll=false --runInBand --cacheDirectory=node_modules/.cache/hddt-jest
npm run build
```

Kiểm thử tự động và kiểm tra giao diện với response giả lập không xác nhận migration, quyền hoặc dữ liệu của API thật. Kiểm tra sau khi backend triển khai bằng tài khoản quản lý P_DTBDCL kiêm nhiệm, người được ủy quyền, HT, TK/TKL/TKK và người xem cá nhân; xác nhận lỗi 409/422, file mẫu 403, import và lịch sử trên dữ liệu kiểm thử được cho phép.
