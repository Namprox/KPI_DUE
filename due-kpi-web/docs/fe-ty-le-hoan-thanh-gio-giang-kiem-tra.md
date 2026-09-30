# Kết quả cập nhật FE tỷ lệ hoàn thành giờ giảng

Ngày kiểm tra: 28/09/2026. Theo bàn giao `fe-ty-le-hoan-thanh-gio-giang.md`.

## Phần đã cập nhật

### Bổ sung DAO_TAO_TINH_100

- Thêm nhãn “Đi đào tạo tiến sĩ cả năm: tính hoàn thành 100%”; bỏ map cảnh báo TAP_SU_KIEM_TRA_TRAN_50.
- Rà soát xác nhận tỷ lệ hiển thị theo TyLeHoanThanh, độc lập với LyDo; màu theo DiemDuKien/DiemToiDa. Không chia giờ cho định mức.
- Bộ lọc không chấm tự động đã dựa vào DiemDuKien null/undefined. Preview và phiếu đã dựa vào điểm API, không gắn trạng thái miễn chấm với người đi đào tạo, nên giữ nguyên logic.
- Thêm 3 test hồi quy: bảng quản lý và bộ lọc, thẻ tự xem, preview và điểm chính thức. Fixture có TongGio=0, DinhMucApDung=0, TyLeHoanThanh=100, DiemDuKien=20.
- Lượt này: 20/20 test tập trung qua; lint hai file sửa và type-check model/helper qua. Chưa xác minh mã mới bằng dữ liệu live; số liệu kiểm tra toàn repo bên dưới thuộc lượt kiểm tra trước.

### Bổ sung theo bản bàn giao có DienGiai

- Khi mở giải trình ở màn quản lý, gọi lại cùng API với `idNhanVien` và năm đang chọn. Có loading, lỗi/thử lại và hủy request khi đóng hoặc đổi người/năm.
- Thẻ cá nhân dùng `DienGiai` trong response tự xem; mở giải trình không gọi thêm API.
- Nhóm theo `KhoanMuc`: định mức gốc → giảm trừ → định mức áp dụng → các nguồn giờ → tổng giờ. Tổng nhóm lấy từ dòng tổng, không cộng các dòng con. Nhóm 0 không có dòng con được ẩn.
- Các dòng con có diễn giải khoảng ngày nguồn/trong năm, khối miễn gộp khi rộng hơn đoạn, công thức API nguyên văn, giờ và chú thích nhiều mã. Giữ mã lạ; ngày định dạng trực tiếp dd/MM/yyyy, không đổi múi giờ.
- Nút chi tiết lớp TKB tái sử dụng `ChiTietGioGiang`; khi đóng quay lại giải trình đã tải.
- Đã mở chi tiết TKB live: đủ 10 lớp với kỳ học, học phần, số tiết, hệ số và giờ chuẩn; đóng chi tiết trở lại đúng giải trình trước đó.
- Đã đối chiếu DTO mới trong OpenAPI, khai báo `DienGiai` và các field nullable là optional, gồm `IdChucVu`, `MauSo`.
- Kiểm tra live bằng tài khoản đã được cung cấp: cả tự xem và modal quản lý có diễn giải chức vụ, ngày bắt đầu 28/04/2021, khoảng áp dụng năm 2026 và công thức `270 x 30% x 12 / 12 = 81`; nguồn TKB hiện 10 lớp, 390 tiết, 493,5 giờ.
- Checklist bổ sung: test hai đoạn trước vào trường/tập sự cùng khối 6 tháng, chú thích kiêm nhiệm, thiếu DienGiai, thiếu SoGio, lỗi 403/thử lại, hủy request và luồng chi tiết lớp đều qua. Ca khối miễn 6 tháng và kiêm nhiệm đã kiểm tra bằng fixture, chưa xác nhận bằng dữ liệu live.
- Lint các file sửa ở lượt bổ sung: 0 lỗi/cảnh báo. Type-check model và helper (gồm `gioGiangDienGiai.js`): qua. Build qua. Toàn repo vẫn còn 39 lỗi lint/37 cảnh báo, 902 lỗi checkJs và 3 test Login lỗi như lượt trước.

### Phần đã triển khai trước đó, tiếp tục giữ nguyên

- Route `/ty-le-hoan-thanh-gio-giang`, cạnh mục Giờ giảng từ thời khóa biểu. Menu và URL dùng chung `ROLE_SETS.TY_LE_GIO_GIANG`: ADMIN, HT, TK, TKL, TP. Quyền nhập TKB vẫn giữ nguyên.
- Tái sử dụng `TongHopGioGiang`, `GioGiangModal`, `SearchSelect`, bộ lọc năm, phân trang 20 dòng, API client `gioGiangTkbApi` và CSS của màn tổng hợp. Banner chưa ánh xạ được dùng chung.
- Lọc năm/đơn vị, tìm theo tên/mã/đơn vị tại client, sắp xếp đơn vị/tỷ lệ, lọc cảnh báo/không chấm tự động. Không polling hoặc refetch theo từng phím. Request cũ được hủy khi đổi bộ lọc năm/đơn vị.
- Thẻ Giờ giảng năm trên trang Tổng quan cá nhân dùng `IdNhanVien` và `DonVi[].LoaiDoiTuong` từ AuthContext (GET `auth/me`).
- Hiện toàn bộ khoản giảm khác 0, điều chỉnh sàn, nguồn giờ và tháng miễn trong giải trình. Không cộng lại giờ, định mức, tỷ lệ hoặc tính điểm tại FE. Màu tỷ lệ dựa trên điểm API.
- Các trường nullable được khai báo optional trong `gioGiangTyLeTypes.d.ts`; null và undefined được xử lý giống nhau.
- Form tiêu chí gửi `LoaiNguonDiem` và `CongThucTongHop`; giữ các mã công thức đang có trong danh sách dữ liệu. Dùng nhóm quyền quản lý tiêu chí hiện có, hỗ trợ cả `ADMIN` và `Admin`.
- Preview và chi tiết phiếu hiện “Không chấm tự động” cho công thức giờ giảng có điểm trống; không lấy điểm tự chấm cũ để thay điểm chính thức trống.
- Màn tổng hợp hiện không có nút xuất Excel, nên không thêm chức năng xuất mới theo điều kiện trong bàn giao.
- Không phát hiện cache localStorage/sessionStorage/query persist cho phiếu hoặc nháp. Luồng tải lại đã reset state và đọc server; không cần migration xóa storage. Các thay đổi workspace không liên quan được giữ nguyên.

## Checklist mục 6

| Mục | Kết quả và giới hạn |
|---|---|
| ADMIN tải năm 2026, giải trình khớp | Quyền ADMIN đã có test menu/URL. Chưa có phiên ADMIN để kiểm tra live toàn trường. Tài khoản được cung cấp tải live năm 2026 thành công; giải trình 270 − 81 = 189 khớp định mức áp dụng. |
| Trưởng khoa đúng phạm vi; giảng viên bị từ chối | Tài khoản được cung cấp thấy 21 giảng viên, cả hai trang đều thuộc Khoa Luật. Test kiểm tra ADMIN/HT/TK/TKL/TP, kiêm nhiệm, chặn GV/TKK/PHT/PTK và xử lý 403 có thông báo/thử lại. Chưa thử live bằng tài khoản giảng viên thuần. |
| Giảng viên tự xem | Đã kiểm tra live: tổng giờ 493,5; định mức áp dụng 189; tỷ lệ 261,11%; điểm 20/20. Test xác nhận request có ID chính mình và chỉ dựng thẻ khi có đơn vị LoaiDoiTuong=1. |
| MIEN_TOAN_BO và cảnh báo nhiều mã | Live có 3 dòng miễn toàn bộ: tỷ lệ “—”, điểm “Không chấm tự động”; bộ lọc hoạt động. Test nhiều mã gồm mã lạ hiển thị đủ, không lỗi. |
| Field vắng không lỗi | Test null/undefined, dữ liệu thiếu nhân sự/định mức, tỷ lệ rất lớn và điều chỉnh sàn âm đều qua; không NaN/undefined trong bảng. |
| Tạo tiêu chí và preview | Test giả lập POST gửi đúng GIO_GIANG_TY_LE, nguồn 2, đối tượng 1, điểm tối đa 20. Test preview null/undefined và chi tiết đã chốt đều qua. Không tạo tiêu chí thật trên hệ thống. |
| Phiếu của tôi rỗng và tạo lại | Live hiện “Bạn chưa có phiếu năm 2026”, nút Bắt đầu tự đánh giá và hướng dẫn lưu lần đầu. Test đọc phiếu lần hai trả rỗng không giữ ID cũ. Chưa tạo phiếu thật; cấu hình hiện báo hết hạn từ 27/09/2026. Tổng quan Khoa cũng hiện chưa có gói, 0 phiếu đã nộp. |
| Grep danh sách công thức | Đã grep trước khi sửa theo 6 từ khóa bàn giao. Danh sách mới duy nhất có NCKH_GIO_TY_LE nằm trong gioGiangTyLe.js và có cả GIO_GIANG_TY_LE. |
| Type-check, lint, test | Phần mới qua kiểm tra tập trung; toàn repo chưa xanh, xem chi tiết dưới đây. |

## Kiểm tra kỹ thuật

- Build production: thành công, còn cảnh báo ESLint của mã hiện có.
- Test toàn bộ: **240/243 qua**, **37/38 suite qua**. 18 test mới của tính năng đều qua (gồm 5 test bổ sung cho DienGiai). Ba lỗi còn lại ở `src/pages/Login.test.js`: test tìm nhãn “Mã nhân viên hoặc email”, giao diện hiện dùng “Mã nhân viên / Email”. Không thay đổi luồng đăng nhập trong tác vụ này.
- ESLint các file thay đổi trong tác vụ: **0 lỗi**, 2 cảnh báo `sum`/`max` đã có trong `DanhGiaPhuLuc2Form.js`.
- ESLint toàn `src`: **39 lỗi, 37 cảnh báo**. Các lỗi nằm ở test hiện có ngoài thay đổi này, chủ yếu `testing-library/no-node-access`, `testing-library/no-container`, `jest/no-conditional-expect`.
- Repo là JavaScript, chưa có script hoặc cấu hình type-check. Chạy TypeScript `checkJs` trực tiếp: model/helper mới **qua**; toàn ứng dụng từ `src/index.js` còn **902 lỗi**, gồm suy luận props bắt buộc của component cũ, JSDoc cũ và kiểu error/API. Chưa thể xác nhận type-check toàn FE qua.
- Browser thật: kiểm tra bảng, banner, phân trang, lọc miễn chấm, giải trình, thẻ cá nhân và trạng thái phiếu rỗng. Ở viewport 390px: chiều rộng document 390px; bảng 1380px cuộn trong wrapper 315px có overflow auto, không làm tràn trang.

Các lệnh đã chạy:

```powershell
$env:CI='true'
npm test -- --watchAll=false --runInBand
npm run build
node node_modules/eslint/bin/eslint.js src --ext .js
node node_modules/typescript/bin/tsc --noEmit --allowJs --checkJs --jsx react-jsx --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck src/utils/gioGiangTyLe.js src/utils/gioGiangTyLeTypes.d.ts
node node_modules/typescript/bin/tsc --noEmit --allowJs --checkJs --jsx react-jsx --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck src/index.js
```
