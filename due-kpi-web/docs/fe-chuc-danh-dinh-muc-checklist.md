# Kết quả checklist mục 5 — chức danh và định mức

Ngày kiểm tra: 25/09/2026. Đối chiếu `docs/fe-chuc-danh-dinh-muc.md`.

## Kết quả từng mục

| Mục | Kết quả kiểm tra FE | Giới hạn bằng chứng |
|---|---|---|
| 1. Dropdown 24 chức danh, tên dài | Test component nhận 24 mục từ API giả lập, loại mục `TrangThai=false`, chọn tên dài có `/`, giữ tooltip. Dropdown nhân viên/lịch sử và định mức lọc `TrangThai=true`. Bảng chức danh/nhân viên/định mức giới hạn tên dài bằng ellipsis + tooltip. Không tìm thấy cache danh mục chức danh trong localStorage/sessionStorage. | Chưa xác minh API thật trả đúng 24 mục hoặc layout bằng trình duyệt. |
| 2. CRUD định mức chỉ còn giờ giảng | Test UI thêm/sửa/xóa qua API giả lập thành công; POST/PUT chỉ gửi 4 field hợp đồng. Sửa route PUT/DELETE thành `dinhmucgiangvien/{id}`, xử lý `Success`/`Message`. | Chưa ghi/xóa dữ liệu thật. |
| 3. Định mức áp dụng | Test render 270 giờ giảng, tỷ lệ chức vụ, lý do điều chỉnh; không còn khối định mức NCKH/PVCĐ. Giữ giờ NCKH thực tế theo endpoint không đổi. | Số 270 là dữ liệu fixture, chưa xác nhận định mức thực của một GV. |
| 4. Chốt hồ sơ | Test giá trị ban đầu true/false từ lần preview bỏ `duNckh`; tick/bỏ tick gọi lại preview và cập nhật mức chọn; chốt gửi quyết định tay cùng RowVersion. Bỏ so sánh tự động NCKH. Checkbox chỉ hiện khi loại đối tượng bằng 1. Cảnh báo thiếu định mức hiển thị và chặn chốt. | Chốt thành công trong test mock; chưa chốt phiếu thật. |
| 5. Chi tiết/in phiếu với field null | Rà soát toàn bộ `src`: không còn tham chiếu 3 field snapshot định mức NCKH/PVCĐ/hệ số. Không có phép chuyển null của chúng thành 0/NaN. | Kiểm tra tĩnh; chưa mở/in phiếu vừa chốt thật. |
| 6. Ngoại lệ Tập sự | Test form thực với Calendar giả lập: checkbox miễn NCKH không còn; POST gửi `LoaiNgoaiLe=1, MienNckh=true`, phản hồi thành công đóng form. Các thông số NCKH/PVCĐ vô hiệu được bỏ khỏi form/bảng/body. | Chưa tạo ngoại lệ trên API thật. |
| 7. Grep field/mã cũ | Qua. Tìm theo tên field đầy đủ (word boundary) và mã đặt trong dấu nháy trên toàn bộ mã/test `src`: không có kết quả. `DuDinhMucGioNckhApDung` là field còn hợp lệ, không phải `GioNckhApDung`. Không còn `GioNckh` trong CRUD định mức. | Từ PGS còn trong một bình luận giải thích kiêm nhiệm ở màn duyệt Phòng; không phải hardcode nghiệp vụ. |
| 8. Type-check, lint, test | Test: 29 suites / 176 tests PASS. Build PASS (có warnings). Lint các file thay đổi: không có lỗi. | Dự án JavaScript không có tsconfig hoặc script type-check. Lint toàn `src` chưa qua: 34 lỗi và 34 warnings có sẵn; 34 lỗi thuộc 7 file test không sửa trong đợt này. |

Không đánh dấu toàn bộ checklist là đã xác minh trên môi trường thật. Browser từ chối truy cập `http://localhost:3005` vì quyền truy cập không được chấp thuận. Không dùng đường vòng để tiếp tục thao tác trình duyệt.

## Lệnh đã chạy

```powershell
$env:CI='true'
npx react-scripts test --watchAll=false --runInBand
npx eslint src --format json --output-file "$env:TEMP/kpi-title-eslint.json"
npm run build
git diff --check
```

Log chạy nằm trong thư mục tạm của máy: `kpi-title-tests.log`, `kpi-title-eslint.json`, `kpi-title-build.log`.

Các file có lỗi lint ngoài phạm vi:

- `src/components/QuanLyChamDiem/CanhBaoTieuChiChuaChot.test.js`: 4
- `src/components/QuanLyChamDiem/HanNgachTheoNhom.test.js`: 7
- `src/components/QuanLyChamDiem/TongQuanCapQuanLy.test.js`: 7
- `src/pages/CaNhan/KeKhaiThanhTich.test.js`: 9
- `src/pages/QuanLyChamDiem/ChiTietDuyetThanhTich.test.js`: 1
- `src/pages/QuanLyChamDiem/DuyetKeKhaiThanhTich.test.js`: 2
- `src/pages/QuanLyKeHoach/HocVuSinhVien.test.js`: 4

## Lưu ý phân loại màn vi phạm

Đã bỏ danh sách mã chức danh và lookup để tự suy giảng viên. Nếu có phân loại từ backend thì dùng phân loại đó. Danh bạ `NhanVienListItemDto` hiện chưa cung cấp phân loại: giữ ứng viên thuộc Khoa và để backend kiểm tra ngạch khi ghi nhận. Không lấy `auth/me` của người đang đăng nhập để phân loại người khác. API tổng hợp vi phạm chỉ trả người đã có vi phạm nên không dùng nó làm danh sách ứng viên. Để dropdown chỉ chứa giảng viên từ đầu, backend cần bổ sung phân loại hoặc endpoint danh sách tương ứng.

Không thay đổi các màn đồng bộ/đối chiếu NCKH hoặc định mức của hệ thống NCKH.

## File mã nguồn và test thay đổi

- `src/components/QuanLyKeHoach/QL_DinhMuc/QL_DinhMucForm.js`
- `src/components/QuanLyKeHoach/QL_DinhMuc/QL_DinhMucListing.js`
- `src/components/QuanLyKeHoach/QL_NgoaiLeDinhMuc/QL_NgoaiLeForm.js`
- `src/components/QuanLyKeHoach/QL_NgoaiLeDinhMuc/QL_NgoaiLeListing.js`
- `src/components/QuanLyToChuc/QL_ChucDanh/QL_ChucDanhForm.js`
- `src/components/QuanLyToChuc/QL_ChucDanh/QL_ChucDanhListing.js`
- `src/components/QuanLyToChuc/QL_ChucVu/QL_ChucVuForm.js`
- `src/components/QuanLyToChuc/QL_ChucVu/QL_ChucVuListing.js`
- `src/components/QuanLyToChuc/QL_NhanVien/QL_NhanVienListing.js`
- `src/pages/QuanLyChamDiem/ChotHoSoKhoa.js`
- `src/pages/QuanLyChamDiem/ChotHoSoXuatSac.test.js`
- `src/pages/QuanLyChamDiem/HoSoKpiGiangVien.js`
- `src/pages/QuanLyKeHoach/QL_DinhMucGiangVien.js`
- `src/pages/QuanLyKeHoach/QL_NgoaiLeDinhMuc.js`
- `src/pages/QuanLyKeHoach/QL_ViPham.js`
- `src/pages/QuanLyToChuc/QL_ChucVu.js`
- `src/pages/QuanLyToChuc/QL_NhanVienChiTiet.js`
- `src/utils/viPhamPermissions.js`
- `src/pages/QuanLyChamDiem/HoSoKpiGiangVien.test.js`
- `src/pages/QuanLyKeHoach/QL_DinhMucGiangVien.test.js`
- `src/pages/QuanLyKeHoach/QL_NgoaiLeDinhMuc.test.js`
- `src/utils/viPhamPermissions.test.js`
