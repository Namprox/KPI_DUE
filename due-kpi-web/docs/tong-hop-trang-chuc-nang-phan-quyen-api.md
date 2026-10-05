# Tổng hợp trang, chức năng, phân quyền và API

Ngày rà soát: **04/10/2026**. Dự án: `due-kpi-web`.

Bản tổng hợp dựa trên mã nguồn frontend hiện tại: route trong `src/App.js` và `src/routes/AppRoutes.js`, menu trong `src/config/menuConfig.js`, quyền trong `src/utils/roles.js`, cùng các lời gọi API ở trang, component con, hook và context. Đây là bằng chứng từ mã nguồn, chưa kiểm thử API thật, tài khoản thật hoặc đối chiếu quyền với backend đang triển khai.

## 1. Quy mô và quy ước

| Nhóm menu | Số mục nghiệp vụ |
|---|---:|
| Phiếu KPI | 9 |
| Kê khai và dữ liệu của tôi | 6 |
| Xử lý KPI đơn vị | 10 |
| Duyệt KPI cấp trường | 3 |
| Ghi nhận và số liệu KPI | 16 |
| Thiết lập KPI | 5 |
| Quản lý tiêu chí | 3 |
| Cơ cấu tổ chức | 4 |
| **Tổng** | **56** |

Ngoài 56 mục trên còn có trang đăng nhập, tổng quan, thông tin cá nhân, các route chi tiết và 14 trang mock bị ẩn khỏi sidebar. `AppRoutes.js` khai báo 96 mẫu đường dẫn: 78 route nghiệp vụ/cá nhân/chi tiết/alias, 14 route mock và 4 route chuyển hướng. `/login` được khai báo riêng trong `App.js`, nên tổng cộng có 97 mẫu route, không đồng nghĩa 97 màn hình độc lập.

Quy ước API trong tài liệu:

- Đường dẫn API đều tương đối với `/api`; ví dụ `GET phieu` nghĩa là `GET /api/phieu`. Host lấy từ `REACT_APP_API_BASE_URL`; mặc định trong mã nguồn là `http://localhost:5000/api`.
- `{id}`, `{nam}`, `{nv}`, `{ct}`, `{mau}`, `{dv}` là tham số API. `:id` là tham số route frontend.
- `CRUD X` nghĩa là đọc danh sách `GET X`, tạo `POST X`, sửa `PUT X/{id}`, xóa `DELETE X/{id}`. Các trường hợp khác cấu trúc này được ghi riêng.
- Đào tạo, phát triển đội ngũ và đoàn thể gửi lý do xóa qua `DELETE X/{id}?lyDo=...`. Danh sách người nhập của đào tạo/phát triển đội ngũ có query `baoGomDaThuHoi`.
- Cột API của bảng trang ghi các API nghiệp vụ chính. API danh mục và minh chứng dùng chung được liệt kê ở mục 12; các bộ API chi tiết ở mục 11.
- Quyền trong bảng là **quyền vào trang ở frontend**. Quyền đọc dữ liệu, chấm từng tiêu chí hoặc sửa từng bản ghi còn phụ thuộc đơn vị, trạng thái và cờ quyền của backend.

## 2. Cách phân quyền

| Ký hiệu | Ý nghĩa |
|---|---|
| Mọi tài khoản | Người dùng đã đăng nhập |
| GV | Có ít nhất một `DonVi[].LoaiDoiTuong === 1` |
| VC/NLĐ | Có ít nhất một `DonVi[].LoaiDoiTuong === 2` |
| KPI cá nhân | Có loại đối tượng 1 hoặc 2; loại 0 không được vào các trang KPI cá nhân |
| ADMIN | Quản trị viên |
| HT / PHT | Hiệu trưởng / Phó Hiệu trưởng |
| TK / TKL | Trưởng khoa / Trưởng khoa lớn |
| TP* | `TP`, `QTP`, `GD`, `VT`: Trưởng phòng, Quyền trưởng phòng, Giám đốc, Viện trưởng |
| TBM | Trưởng bộ môn |
| TKK / TKP | Thư ký Khoa / Thư ký Phòng |
| TLGVK | Trợ lý giáo vụ Khoa |
| QTR | Tập `QUAN_TRI`: ADMIN, HT, PHT, TK, TBM |
| Quyền từ BE | Cờ do API `/quyen` hoặc DTO bản ghi trả về |

Các nguyên tắc hiện tại:

1. `menuConfig.js` sinh cả sidebar và luật URL trực tiếp. `RequireRole` gọi `canAccessPath`; route nghiệp vụ không có luật sẽ bị chặn.
2. Chức vụ đối chiếu bằng `MaChucVu`, có xét chức vụ kiêm nhiệm trong `DonVi[]`. Các thao tác theo đơn vị phải khớp chức vụ và đơn vị trên cùng một dòng.
3. Loại đối tượng KPI do backend cấp; frontend không suy loại 1/2 từ chức danh hay chức vụ. Loại 0 và chưa có phân loại không tự chuyển thành VC/NLĐ.
4. ADMIN chỉ được vào các trang có luật phù hợp, không tự vượt qua mọi tập quyền. Ví dụ các trang thẩm định cá nhân chỉ mở cho TK/TKL/TP*, còn phiếu KPI Khoa chỉ mở cho TKK/TK/TKL.
5. Hai trang nghiệp vụ giám sát giảng dạy yêu cầu TP* tại `IdDonVi = 23`; ADMIN được miễn điều kiện đơn vị. Chức vụ và đơn vị phải cùng khớp.
6. Đào tạo, phát triển đội ngũ và đoàn thể dùng `XemTatCa`, `XemTheoKhoa`, `DuocNhap`, `LaQuanLy`, `ChoPhepSua` từ BE. Vào được danh sách không đồng nghĩa được thêm/sửa/xóa/import.

## 3. Trang chung và tài khoản

| Trang / route | Chức năng hiện tại | Quyền | API |
|---|---|---|---|
| Đăng nhập — `/login` | Đăng nhập, khôi phục phiên và lấy hồ sơ hiện tại | Chưa đăng nhập; đã đăng nhập chuyển về `/` | `POST auth/login`, `GET auth/me`; phiên dùng `POST auth/refresh` |
| Tổng quan — `/` | Phiếu cá nhân, tiến độ, hạn nộp; dashboard Khoa/Phòng/Trường theo vai trò | Mọi tài khoản; từng khối theo loại đối tượng/chức vụ | `GET phieu/me/{nam}`, `GET phieu/{id}/kiem-tra-hop-le`; dashboard dùng các API báo cáo, `GET phieu-don-vi`, `GET to-trinh-khoa`, `GET to-trinh-khoa/{id}` (khối Khoa khi có tờ trình và quyền trưởng Khoa tại đơn vị), `GET tham-dinh/pending`, `GET phieu-quy/tong-hop`, `GET viphamgiangday` tùy vai trò |
| Thông tin cá nhân — `/thong-tin-lien-he` | Xem hồ sơ, chức danh, chức vụ kiêm nhiệm; cập nhật hồ sơ; mở đổi mật khẩu | Mọi tài khoản, hồ sơ của mình | `GET nhan-vien?search=...`, `GET nhan-vien-chuc-vu/by-nhan-vien/{nv}`, `GET nhan-vien-chuc-danh/by-nhan-vien/{nv}`, `PUT nhan-vien/{nv}/ho-so` |
| Đổi mật khẩu — hộp thoại toàn ứng dụng | Đổi mật khẩu tài khoản đang dùng | Đã đăng nhập | `POST changepassword` |
| Đăng xuất — menu tài khoản | Kết thúc phiên | Đã đăng nhập | `POST auth/logout` |

## 4. Phiếu KPI — 9 mục

| Trang / route | Chức năng hiện tại | Quyền vào trang | API chính |
|---|---|---|---|
| Đánh giá KPI Giảng viên — `/danh-gia-phu-luc-2` | Tự đánh giá năm, nhập điểm, tải minh chứng, nộp/hủy nộp/bổ sung dòng trả về | GV | Bộ **phiếu cá nhân năm**: `phieu`, `chitiet`, `maudanhgia`, `minhchung` — mục 11.1 |
| Đánh giá KPI Nhân viên — `/danh-gia-kpi-nhan-vien` | Tự đánh giá năm hoặc quý; tổng hợp điểm quý vào phiếu năm | VC/NLĐ | Bộ **phiếu cá nhân năm** và **phiếu quý** — mục 11.1–11.2 |
| Lịch sử đánh giá — `/lich-su-danh-gia` | Danh sách phiếu năm/quý của mình; mở kết quả chỉ đọc | KPI cá nhân | `GET phieu`, `GET phieu/{id}`, `GET phieu-quy`; chi tiết dùng `GET phieu/{id}/lich-su-cham-diem`, mẫu và minh chứng |
| Đánh giá KPI Khoa — `/danh-gia-kpi-don-vi` | Chọn đơn vị/năm; tìm phiếu, tự tạo khi chưa có và là TKK tại đúng đơn vị; nhập điểm, tự tổng hợp KPI thành viên khi mở/trước khi trình, trình và duyệt cấp đơn vị | TKK, TK, TKL | Bộ **phiếu KPI đơn vị** — mục 11.3; thêm `GET diem-tb-phan-hoi-sv`, `GET vi-pham/diem-tru-khoa` |
| Lịch sử đánh giá KPI Khoa — `/lich-su-danh-gia-khoa` | Tra cứu phiếu Khoa và chi tiết chỉ đọc | TKK, TK, TKL | `GET phieu-don-vi` (năm/đơn vị/trạng thái), `GET phieu-don-vi/{id}` (chi tiết và tiến độ phiếu trạng thái 2/3), `GET minh-chung-don-vi/{id}/tai-ve` |
| Đánh giá KPI Phòng/Trung tâm — `/danh-gia-kpi-phong` | Chọn đơn vị/năm; tìm phiếu, tự tạo khi chưa có và là TKP tại đúng đơn vị; nhập điểm, trình và duyệt cấp đơn vị | TKP, TP* | Bộ **phiếu KPI đơn vị** — mục 11.3 |
| Lịch sử đánh giá KPI Phòng/Trung tâm — `/lich-su-danh-gia-phong` | Tra cứu phiếu Phòng/Trung tâm và chi tiết chỉ đọc | TKP, TP* | `GET phieu-don-vi` (năm/đơn vị/trạng thái), `GET phieu-don-vi/{id}` (chi tiết và tiến độ phiếu trạng thái 2/3), `GET minh-chung-don-vi/{id}/tai-ve` |
| Kho minh chứng cá nhân — `/kho-minh-chung` | Lọc và xem/tải minh chứng cá nhân xuyên năm | Mọi tài khoản | `GET minhchung`, `GET minhchung/{id}/tai-ve` |
| Kho minh chứng đơn vị — `/kho-minh-chung-don-vi` | Tra cứu minh chứng KPI đơn vị trong phạm vi được phép | ADMIN, HT, TKK, TKP, TK, TKL, TP* | `GET minh-chung-don-vi`, `GET minh-chung-don-vi/{id}/tai-ve` |

Phiếu nhân viên chuyển sang giao diện quý khi năm có `ApDungPhieuQuy`, `TrangThai === 2`, người dùng thuộc loại 2 và có mẫu phù hợp. Phiếu quý là component bên trong route KPI nhân viên, không có route cá nhân riêng.

Phiếu Khoa: TKK nhập/trình, TK/TKL xử lý theo quyền tại đơn vị. Phiếu Phòng: TKP nhập/trình, TP* xử lý theo quyền tại đơn vị. Quyền chấm từng dòng còn xét cờ `DuocChamDuyetDv` của dòng và trạng thái phiếu; `choToiCham` là query lọc hàng đợi, không phải cờ quyền của DTO. Chi tiết xem `quyenPhieuDonVi`, `duocChamDuyetDv`, `quyenPhieuKhoa`, `quyenPhieuPhong`.

## 5. Kê khai và dữ liệu của tôi — 6 mục

| Trang / route | Chức năng hiện tại | Quyền | API chính |
|---|---|---|---|
| Giờ giảng của tôi — `/gio-giang-cua-toi` | Xem giờ thực hiện, định mức, tỷ lệ và diễn giải theo năm | GV | `GET gio-giang-tkb/ty-le-hoan-thanh?idNam=...&idNhanVien=...`; xem chi tiết dùng `GET gio-giang-tkb/{id}/chi-tiet` |
| Kê khai thành tích — `/ke-khai-thanh-tich` | Kê khai thành tích vượt trội, minh chứng từng dòng, xem kết quả xét | VC/NLĐ; sửa theo `ChoPhepSua` | `GET ke-khai-thanh-tich/cua-toi`, `GET danh-muc-thanh-tich`, `PUT ke-khai-thanh-tich/chi-tiet`; bộ minh chứng thành tích — mục 12 |
| Thành tích NCKH — `/thanh-tich-nckh` | Xem tổng hợp năm, bài báo, đề tài, sách và kê khai khác; chỉ đọc | GV | `GET nckh/giang-vien/{nv}`, `GET nckh/bai-bao`, `GET nckh/de-tai`, `GET nckh/sach`, `GET nckh/ke-khai-khac` |
| Phản hồi sinh viên — `/phan-hoi-sinh-vien-cua-toi` | Tra cứu khảo sát theo năm, kỳ và học phần; xuất Excel tại frontend | GV | `GET phanhoisinhvien/cua-toi` |
| Phục vụ cộng đồng — `/nhiem-vu-khoa-cua-toi` | Xem nhiệm vụ; kê khai chủ trì và cộng tác viên, thêm minh chứng khi được phép | GV; ghi theo `CanKeKhai`, `ChoPhepSua` của BE | `GET nhiem-vu-khoa/cua-toi`, `GET cau-hinh/nhiem-vu-khoa`, `GET nhiem-vu-khoa/giang-vien`, `GET nhiem-vu-khoa/{id}`, `POST nhiem-vu-khoa`, `PUT nhiem-vu-khoa/{id}`, `DELETE nhiem-vu-khoa/{id}` và minh chứng NVK |
| Vi phạm của tôi — `/vi-pham-cua-toi` | Xem vi phạm giảng dạy, tổng điểm trừ và minh chứng | GV | `GET viphamgiangday`, `GET vi-pham/tong-hop-giang-vien`, `GET viphamgiangday/{id}/minh-chung/tai-ve` |

API NCKH nhận các query `id_nam`, `id_nhan_vien`; trang cá nhân truyền ID người đang đăng nhập. Nhiệm vụ đã duyệt mới đóng góp điểm; phản hồi NVK của luồng cũ được giữ để đọc, giao diện hiện tại không gửi phản hồi mới.

## 6. Xử lý KPI đơn vị — 10 mục

| Trang / route | Chức năng hiện tại | Quyền vào trang | API chính |
|---|---|---|---|
| Hồ sơ chờ thẩm định — `/quan-ly/cho-cham` | Hàng đợi phiếu cá nhân cần chấm; mở chi tiết | TK, TKL, TP* | `GET phieu/khoa/pending`, `GET phieu/{id}` |
| Chờ tôi chấm KPI đơn vị — `/phieu-don-vi-cho-cham` | Hai tab Chờ tôi chấm/Tất cả phiếu được xem; mở màn hình Khoa hoặc Phòng theo loại mẫu BE; chấm dòng được giao, duyệt cấp đơn vị tại đúng đơn vị theo trạng thái | TK, TKL, TP*, ADMIN; hành động theo quyền tại đơn vị, trạng thái và cờ dòng | `GET phieu-don-vi` (tab chờ có `choToiCham=true`), `GET phieu-don-vi/{id}`, `GET maudanhgia/{mau}`, `GET maudanhgia/{mau}/chi-tiet`, `PUT chi-tiet-don-vi/{ct}/diem-duyet-dv`, `POST phieu-don-vi/{id}/duyet-dv`; ADMIN còn có nhập/trình khi trạng thái 1, tổng hợp tự động nếu phiếu Khoa có dòng tự động; minh chứng đơn vị |
| Phiếu toàn đơn vị — `/quan-ly/phieu` | Lọc danh sách phiếu cá nhân theo năm, đơn vị, nhân viên, trạng thái; mở màn hình chấm | TK, TKL, TP* | `GET phieu`; màn hình `/quan-ly/phieu/:id` dùng bộ **thẩm định dòng** — mục 11.4 |
| Duyệt KPI viên chức theo quý — `/quan-ly/phieu-quy` | Đọc phiếu quý, minh chứng; duyệt hoặc trả về | TK, TKL, TP*, ADMIN | `GET phieu-quy/tp/pending`, `GET phieu-quy/{id}`, `POST phieu-quy/{id}/tp/duyet`, `POST phieu-quy/{id}/tp/tra-ve`; mẫu và minh chứng |
| Duyệt hồ sơ KPI — `/quan-ly/duyet-ho-so` | Danh sách hồ sơ Khoa; xem trước, chốt hồ sơ GV/VC thuộc Khoa, trả tiêu chí thẩm định lại | TK, TKL | `GET phieu`, `GET phieu/khoa/pending`, `GET to-trinh-khoa`; chi tiết dùng `GET phieu/{id}/xem-truoc-chot`, `POST phieu/{id}/khoa/duyet-ho-so`, `POST chitiet/{ct}/khoa/tra-tham-dinh` |
| Chốt hồ sơ nhân viên — `/quan-ly/ho-so-nhan-vien` | Danh sách, xem trước và chốt hồ sơ VC/NLĐ của Phòng | TP*, ADMIN; ADMIN có giao diện chỉ xem khi không giữ vai trò trưởng Phòng của phiếu | `GET phieu`, `GET phieu/khoa/pending`, `GET phieu/{id}`, `GET phieu/{id}/xem-truoc-chot`, `POST phieu/{id}/khoa/duyet-ho-so` |
| Tờ trình KPI đơn vị — `/quan-ly/to-trinh` | Đóng gói kết quả, đặt ưu tiên xuất sắc, trình cấp Trường, xem lịch sử gói | TK, TKL, TP*, ADMIN | `GET to-trinh-khoa`, `GET to-trinh-khoa/{id}`, `POST to-trinh-khoa/{id}/dong-goi`, `POST to-trinh-khoa/{id}/trinh`, `PUT phieu/{id}/uu-tien-xuat-sac`, `GET phieu/{id}` |
| Duyệt kê khai thành tích — `/quan-ly/ke-khai-thanh-tich` | Hàng đợi và chi tiết bản kê; xét từng dòng theo đơn vị phụ trách | TP*, HT, ADMIN | `GET ke-khai-thanh-tich/cho-duyet`, `GET ke-khai-thanh-tich/{id}`, `GET ke-khai-thanh-tich/{id}/lich-su`, `POST ke-khai-thanh-tich/{id}/duyet-chi-tiet` và minh chứng |
| Ghi nhận vi phạm nhân viên — `/ghi-nhan-vi-pham-nhan-vien` | Ghi nhận/sửa/xóa vi phạm VC/NLĐ, đính kèm minh chứng | ADMIN, HT, PHT, TBM, TP* | `CRUD viphamgiangday`; danh mục `GET nhom-vi-pham`, `GET loai-vi-pham` dùng `loaiDoiTuong=2`; minh chứng vi phạm |
| Báo cáo đơn vị — `/quan-ly/bao-cao` | Tổng quan kèm học vụ khi BE trả `HocVu`, điểm trung bình, chưa hoàn tất, chưa lập phiếu theo năm/quý/loại đối tượng; lọc năm/đơn vị, làm mới; nút mở phiếu theo quyền vào trang đích; chưa có xuất dữ liệu | TK, TKL, TP*, HT, ADMIN, TKK, TKP | `GET bao-cao/tong-quan`, `GET bao-cao/diem-trung-binh`, `GET bao-cao/chua-hoan-tat`, `GET bao-cao/chua-lap-phieu` |

Hồ sơ tra cứu `/quan-ly/giang-vien/:idNv` mở theo quyền của “Phiếu toàn đơn vị”. Các tab gọi `GET dinh-muc-giang-vien/ap-dung/{nv}/{nam}`, `GET dinh-muc-giang-vien/gio-nckh-thuc-te/{nv}/{nam}`, `GET nckh/giang-vien/{nv}`, `GET gio-giang-import?kyHoc=...`, `GET vi-pham/tong-hop-giang-vien`, `GET diem-tb-phan-hoi-sv`.

Phạm vi duyệt thành tích vượt trội đi theo **đơn vị phụ trách từng mức thành tích**, không đơn thuần theo đơn vị của người kê khai. TK/TKL không có lối vào trang này theo luật hiện tại.

Chi tiết hàng đợi đọc `LoaiDoiTuong` từ `GET maudanhgia/{mau}`: 3 dùng `ChiTietPhieuDonVi`/`quyenPhieuKhoa`, 4 dùng `ChiTietPhieuPhong`/`quyenPhieuPhong`. Thiếu mẫu hoặc loại khác 3/4 thì báo lỗi và cho thử lại, chưa mở màn hình chấm. Chỉ dòng có `DuocChamDuyetDv === true` ở trạng thái 2 được chấm; duyệt cả phiếu cần đúng vai trò trưởng Khoa/Phòng tại đơn vị và không còn dòng được giao chưa chấm. Chức vụ chính ADMIN vẫn có quyền nhập/trình ở trạng thái 1 và duyệt đơn vị ở trạng thái 2 theo helper hiện tại; BE có thể từ chối hành động. Tổng hợp KPI Khoa chạy tự động khi có dòng tự động, không có nút tổng hợp riêng. Hàng đợi không hiển thị thao tác cấp Trường.

Nút “Mở phiếu” của báo cáo kiểm tra `canAccessPath('/quan-ly/phieu/{id}', user)`. HT/ADMIN/TKK/TKP chỉ có nút này nếu kiêm nhiệm vai trò được vào trang đích; quyền BE cho xem danh sách vẫn là điều kiện riêng.

## 7. Duyệt KPI cấp trường — 3 mục

| Trang / route | Chức năng hiện tại | Quyền vào trang | API chính |
|---|---|---|---|
| Duyệt hồ sơ lãnh đạo — `/truong/to-trinh` | Xem gói đã trình, duyệt hồ sơ lãnh đạo còn chờ hoặc trả lại các hồ sơ được chọn | HT, ADMIN; API quyết định quyền thực hiện hành động | `GET to-trinh-khoa`, `GET to-trinh-khoa/{id}`, `POST to-trinh-khoa/{id}/ht-duyet`, `POST to-trinh-khoa/{id}/ht-tra-lai` |
| Xét xuất sắc viên chức Khoa — `/truong/xet-xuat-sac-vien-chuc-khoa` | Xem ứng viên và điều kiện chốt, chọn danh sách xuất sắc, chốt theo năm | HT, ADMIN; chốt khi BE trả `DuDieuKienChot === true` | `GET xet-xuat-sac-vien-chuc-khoa`, `POST xet-xuat-sac-vien-chuc-khoa/chot` |
| Theo dõi phiếu toàn trường — `/truong/phieu` | Tra cứu phiếu, hàng đợi cấp Trường, mở lại phiếu hoàn tất | HT, ADMIN; nút mở lại chỉ hiện cho chức vụ chính HT | `GET phieu`, `GET phieu/truong/pending`, `POST phieu/{id}/mo-lai` |

Các trang này xử lý hồ sơ KPI cá nhân/tờ trình. Chưa có route nghiệp vụ riêng cho HT duyệt/chốt **phiếu KPI đơn vị** Khoa/Phòng. Không nên đồng nhất `/truong/to-trinh` với luồng `/phieu-don-vi`.

## 8. Ghi nhận và số liệu KPI — 16 mục

| Trang / route | Chức năng hiện tại | Quyền vào trang / thao tác | API chính |
|---|---|---|---|
| Giờ giảng từ thời khóa biểu — `/quan-ly-gio-giang` | Import Excel, danh sách TKB, ánh xạ GV, quét tự động, xem tổng hợp | ADMIN, HT | `GET gio-giang-tkb`, `POST gio-giang-tkb/import`, `POST gio-giang-tkb/anh-xa`, `POST gio-giang-tkb/anh-xa/tu-dong`, `GET gio-giang-tkb/{id}/chi-tiet`, `GET gio-giang-tkb/tong-hop` |
| Tỷ lệ hoàn thành giờ giảng — `/ty-le-hoan-thanh-gio-giang` | Tra cứu giờ/định mức/tỷ lệ/điểm dự kiến và diễn giải | ADMIN, HT, TK, TKL, **TP**; tập này hiện chưa gồm QTP/GD/VT | `GET gio-giang-tkb/ty-le-hoan-thanh`, `GET gio-giang-tkb/{id}/chi-tiet` |
| Mẫu giảm trừ — `/mau-giam-tru` | Import giảm trừ theo năm; tùy chọn cập nhật danh sách nhân viên; xem kết quả/cảnh báo | ADMIN | `POST giam-tru/import` |
| Quản lý học vụ — `/hoc-vu-sinh-vien` | Xem tỷ lệ Khoa, đối chiếu sinh viên; quản lý có import và ánh xạ Khoa | Xem: ADMIN, TP/QTP tại `P_DTBDCL`, TKK/TK/TKL. Ghi: ADMIN hoặc TP/QTP tại `P_DTBDCL` | `GET hoc-vu/ty-le-khoa`, `GET hoc-vu/sinh-vien`; quản lý dùng `POST hoc-vu/import-sinh-vien`, `POST hoc-vu/import-canh-bao`, `GET/POST hoc-vu/anh-xa-khoa`, `DELETE hoc-vu/anh-xa-khoa/{maKhoa}` |
| Hoạt động đào tạo — `/hoat-dong-dao-tao` | Xem của mình/Khoa/toàn trường; người có quyền nhập thêm/sửa/xóa/import, tải mẫu | Mọi tài khoản; dữ liệu theo `XemTatCa/XemTheoKhoa`, nhập theo `DuocNhap`, sửa/xóa theo `ChoPhepSua` | `GET hoat-dong-dao-tao/quyen`, `GET hoat-dong-dao-tao/loai`, `GET hoat-dong-dao-tao/giang-vien`, `CRUD hoat-dong-dao-tao`, `GET hoat-dong-dao-tao/{id}`, `POST hoat-dong-dao-tao/import`, `GET hoat-dong-dao-tao/mau-import` |
| Ủy quyền nhập liệu đào tạo — `/hoat-dong-dao-tao/uy-quyen` | Xem người nhập/ứng viên; cấp và thu hồi quyền nhập | `hoat-dong-dao-tao/quyen.LaQuanLy === true` | `GET hoat-dong-dao-tao/nguoi-nhap`, `GET hoat-dong-dao-tao/nguoi-nhap/ung-vien`, `POST hoat-dong-dao-tao/nguoi-nhap`, `DELETE hoat-dong-dao-tao/nguoi-nhap/{id}` |
| Phát triển đội ngũ — `/phat-trien-doi-ngu` | Xem, lọc, chi tiết; thêm/sửa/xóa/import và tải mẫu theo quyền | Mọi tài khoản; cờ quyền từ BE | `GET phat-trien-doi-ngu/quyen`, `GET phat-trien-doi-ngu/loai`, `GET phat-trien-doi-ngu/hang-muc`, `GET phat-trien-doi-ngu/giang-vien`, `CRUD phat-trien-doi-ngu`, `GET phat-trien-doi-ngu/{id}`, `POST phat-trien-doi-ngu/import`, `GET phat-trien-doi-ngu/mau-import` |
| Danh mục hạng mục phát triển đội ngũ — `/phat-trien-doi-ngu/hang-muc` | Xem, thêm và sửa hạng mục | `phat-trien-doi-ngu/quyen.LaQuanLy === true` | `GET phat-trien-doi-ngu/loai`, `GET phat-trien-doi-ngu/hang-muc`, `POST phat-trien-doi-ngu/hang-muc`, `PUT phat-trien-doi-ngu/hang-muc/{id}` |
| Ủy quyền nhập liệu phát triển đội ngũ — `/phat-trien-doi-ngu/uy-quyen` | Xem người nhập/ứng viên; cấp và thu hồi quyền | `phat-trien-doi-ngu/quyen.LaQuanLy === true` | `GET phat-trien-doi-ngu/nguoi-nhap`, `GET phat-trien-doi-ngu/nguoi-nhap/ung-vien`, `POST phat-trien-doi-ngu/nguoi-nhap`, `DELETE phat-trien-doi-ngu/nguoi-nhap/{id}` |
| Thành tích đoàn thể — `/thanh-tich-doan-the` | Xem của mình/Khoa/toàn trường, chi tiết; CRUD/import theo quyền | Mọi tài khoản; cờ quyền từ BE | `GET thanh-tich-doan-the/quyen`, `GET thanh-tich-doan-the/loai`, `GET thanh-tich-doan-the/giang-vien`, `CRUD thanh-tich-doan-the`, `GET thanh-tich-doan-the/{id}`, `POST thanh-tich-doan-the/import`, `GET thanh-tich-doan-the/mau-import` |
| Quản lý đánh giá sinh viên — `/quan-ly-danh-gia-sinh-vien` | CRUD khảo sát, import Excel, chốt điểm trung bình | ADMIN hoặc TP* tại đơn vị ID 23 | `CRUD phanhoisinhvien`, `POST phanhoisinhvien/import`, `POST diem-tb-phan-hoi-sv/chot` |
| Điểm trung bình ĐGSV — `/diem-trung-binh-danh-gia-sinh-vien` | Xem điểm trung bình đã tổng hợp theo năm | QTR | `GET diem-tb-phan-hoi-sv` |
| Ghi nhận phục vụ cộng đồng — `/quan-ly/nhiem-vu-khoa` | Xem/kê khai/sửa/xóa nhiệm vụ theo quyền BE; xét từng nhiệm vụ; tổng hợp/xuất Excel; mở lại kỳ cũ đã chốt với lý do khi có `CanDuyet`; đọc phản hồi lưu trữ và lịch sử | TK, TKL, TLGVK; hành động theo cờ BE; TKK không có quyền vào | Bộ **nhiệm vụ Khoa** — mục 11.5 |
| Ghi nhận vi phạm giảng viên — `/quan-ly-vi-pham` | CRUD vi phạm GV và minh chứng | ADMIN, HT, PHT, TK, TKL, TBM | `CRUD viphamgiangday`; `GET nhom-vi-pham`, `GET loai-vi-pham` với `loaiDoiTuong=1`; minh chứng vi phạm |
| Tổng hợp điểm trừ vi phạm — `/tong-hop-vi-pham` | Tổng hợp theo GV và điểm trừ tập thể Khoa | ADMIN hoặc TP* tại đơn vị ID 23 | `GET vi-pham/tong-hop-giang-vien`, `GET vi-pham/diem-tru-khoa` |
| Thống kê vi phạm của Khoa — `/thong-ke-vi-pham-khoa` | Xem vi phạm, thống kê nhóm và điểm trừ của Khoa | TK, TKL | `GET viphamgiangday`, `GET vi-pham/tong-hop-giang-vien`, `GET vi-pham/diem-tru-khoa` và tải minh chứng |

Các trang đào tạo/phát triển đội ngũ/đoàn thể đổi nhãn thành “... của tôi” khi BE không cấp phạm vi toàn trường hoặc theo Khoa. Import có tham số kiểm tra trước (`chiKiemTra`); quyền và kết quả xử lý lấy từ BE.

## 9. Thiết lập KPI — 5 mục

| Trang / route | Chức năng hiện tại | Quyền | API chính |
|---|---|---|---|
| Quản lý năm đánh giá — `/quan-ly-nam-danh-gia` | CRUD năm, thời gian, trạng thái, cấu hình phiếu quý | ADMIN, HT | `CRUD namdanhgia` |
| Định mức giảng viên — `/quan-ly-dinh-muc-giang-vien` | CRUD định mức theo chức danh/năm; đồng bộ dữ liệu | ADMIN, HT | `CRUD dinhmucgiangvien`, `POST sync-data?idNam=...` |
| Ngoại lệ định mức — `/quan-ly-ngoai-le-dinh-muc` | Tra cứu theo NV/năm, thêm/sửa/xóa ngoại lệ | QTR | `GET ngoai-le-dinh-muc/by-nhan-vien-nam/{nv}/{nam}`, `POST ngoai-le-dinh-muc`, `PUT ngoai-le-dinh-muc/{id}`, `DELETE ngoai-le-dinh-muc/{id}` |
| Danh mục thành tích vượt trội — `/danh-muc-thanh-tich` | Quản lý cây mức thành tích, điểm quy đổi, đơn vị phụ trách duyệt | ADMIN | `CRUD danh-muc-thanh-tich` |
| Danh mục loại vi phạm — `/danh-muc-loai-vi-pham` | Quản lý loại vi phạm theo đối tượng, điểm trừ và đơn vị được ghi nhận | ADMIN | `CRUD loai-vi-pham`, `GET nhom-vi-pham`, `PUT loai-vi-pham/{id}/don-vi-ghi-nhan` |

## 10. Tiêu chí và cơ cấu tổ chức — 7 mục

| Trang / route | Chức năng hiện tại | Quyền | API chính |
|---|---|---|---|
| Nhóm tiêu chí — `/nhom-tieu-chi` | CRUD nhóm theo loại đối tượng | ADMIN, HT | `CRUD nhomtieuchi`, có query `loaiDoiTuong` khi đọc/tạo/sửa |
| Tiêu chí đánh giá — `/tieu-chi-danh-gia` | CRUD tiêu chí và các mức thang điểm | ADMIN, HT | `CRUD tieuchidanhgia`, `GET nhomtieuchi`, `CRUD thangdiem` |
| Mẫu phiếu đánh giá — `/mau-danh-gia` | CRUD mẫu, gán danh sách tiêu chí, mở phân quyền chấm | ADMIN, HT | `CRUD maudanhgia`, `GET maudanhgia/{mau}/chi-tiet`, `POST chitietmaudanhgia/bulk`; phân quyền dùng `GET/PUT tieu-chi-don-vi-cham` |
| Cơ cấu đơn vị — `/quan-ly-don-vi` | Xem/lọc danh sách đơn vị, mở thành viên; **hiện chỉ đọc** | ADMIN, HT | `GET donvi`; trang thành viên dùng `GET nhan-vien?maDonVi=...&baoGomDonViCon=true` |
| Người dùng — `/quan-ly-nguoi-dung` | Lọc danh sách; thêm/sửa hồ sơ, quản lý chức danh/chức vụ kiêm nhiệm; xóa; reset mật khẩu | ADMIN, HT, PHT, TK, TKL, TP*, TBM; nút reset hiện dùng quyền quản lý chung, quyền thực thi API cần kiểm tra riêng | `GET nhan-vien`, `POST/PUT nhan-vien`, **`DELETE nhanvien?id=...`**; `nhan-vien-chuc-danh`, `nhan-vien-chuc-vu`; `POST auth/reset-password` |
| Chức danh nghề nghiệp — `/quan-ly-chuc-danh` | Đọc, tạo/sửa/xóa danh mục | ADMIN, HT | `GET/POST/PUT chuc-danh-nghe-nghiep`, **`DELETE chuc-danh-nghe-nghiep?id=...`** |
| Quản lý chức vụ — `/quan-ly-chuc-vu` | Đọc danh sách thật; thêm/sửa/xóa hiện chỉ cập nhật state của frontend | ADMIN, HT | **Chỉ `GET chucvu`**; chưa gọi API lưu/xóa từ trang này |

Các API nhân sự chi tiết: `GET nhan-vien-chuc-danh/by-nhan-vien/{nv}`, `POST nhan-vien-chuc-danh`, `PUT/DELETE nhan-vien-chuc-danh/{id}`; tương tự với `nhan-vien-chuc-vu`. Danh mục hỗ trợ: `GET donvi`, `GET chucvu`, `GET chuc-danh-nghe-nghiep`.

## 11. Các bộ API cho form và màn hình chi tiết

### 11.1. Phiếu cá nhân năm

| Thao tác | API |
|---|---|
| Lấy phiếu của mình theo năm/đơn vị | `GET phieu/me/{nam}?idDonVi=...` |
| Lấy mẫu/tiêu chí/điểm tự động | `GET maudanhgia?loaiDoiTuong=...`, `GET maudanhgia/{mau}/chi-tiet`, `GET maudanhgia/{mau}/diem-tu-dong?idNhanVien=...` |
| Tạo phiếu | `POST phieu` |
| Lưu điểm tự đánh giá | `PUT chitiet/{ct}/tu-danh-gia` |
| Kiểm tra điều kiện nộp | `GET phieu/{id}/kiem-tra-hop-le` |
| Nộp / nộp lại / hủy nộp | `POST phieu/{id}/submit`, `POST phieu/{id}/nop-lai`, `POST phieu/{id}/huy-nop` |
| Xem lịch sử chấm | `GET phieu/{id}/lich-su-cham-diem` |
| Minh chứng | `POST chitiet/{ct}/minh-chung/file`, `DELETE minhchung/{id}`, `GET minhchung/{id}/tai-ve` |

### 11.2. Phiếu quý và tổng hợp năm

| Thao tác | API |
|---|---|
| Phiếu quý của mình / danh sách / chi tiết | `GET phieu-quy/cua-toi`, `GET phieu-quy`, `GET phieu-quy/{id}` |
| Điểm tự động và mẫu | `GET maudanhgia/{mau}/diem-tu-dong?idNhanVien=...&quy=...`, `GET maudanhgia/{mau}/chi-tiet` |
| Tạo quý / lưu dòng | `POST phieu-quy`, `PUT chitiet/{ct}/tu-danh-gia` |
| Nộp / hủy nộp quý | `POST phieu-quy/{id}/nop`, `POST phieu-quy/{id}/huy-nop` |
| Hàng đợi duyệt / duyệt / trả về | `GET phieu-quy/tp/pending`, `POST phieu-quy/{id}/tp/duyet`, `POST phieu-quy/{id}/tp/tra-ve` |
| Xem tổng hợp bốn quý / cập nhật phiếu năm | `GET phieu-quy/tong-hop`, `POST phieu/{id}/tong-hop-tu-quy` |
| Tạo/nộp phiếu năm từ giao diện quý | `POST phieu`, `POST phieu/{id}/submit` |
| Đọc phiếu năm kèm lịch sử | `GET phieu/me/{nam}?kemLichSu=true&idDonVi=...` |
| Minh chứng trong form quý | `POST chitiet/{ct}/minh-chung/file`, `DELETE minhchung/{id}`, `GET minhchung/{id}/tai-ve` |

### 11.3. Phiếu KPI đơn vị

| Thao tác đang có giao diện | API |
|---|---|
| Danh sách / chi tiết / hàng đợi của mình | `GET phieu-don-vi`, `GET phieu-don-vi/{id}`; hàng đợi thêm `choToiCham=true` |
| Tìm hoặc tạo phiếu khi mở trang đánh giá | `GET phieu-don-vi?idNam=...&idDonVi=...`, `POST phieu-don-vi` khi chưa có và người dùng là TKK/TKP tại đúng đơn vị |
| Nhập điểm thư ký | `PUT chi-tiet-don-vi/{ct}/diem-nhap` |
| Chấm điểm cấp đơn vị | `PUT chi-tiet-don-vi/{ct}/diem-duyet-dv` |
| Tự tổng hợp KPI thành viên của Khoa khi mở/trước khi trình | `POST phieu-don-vi/{id}/tong-hop-kpi`; chỉ trạng thái 1 có quyền nhập và có dòng tự động, không có nút riêng |
| Trình / duyệt cấp đơn vị | `POST phieu-don-vi/{id}/submit`, `POST phieu-don-vi/{id}/duyet-dv` |
| Đọc mẫu | `GET maudanhgia/{mau}/chi-tiet`; hàng đợi đọc thêm `GET maudanhgia/{mau}` để chọn màn hình theo `LoaiDoiTuong` |
| Minh chứng | `POST chi-tiet-don-vi/{ct}/minh-chung/file`, `DELETE minh-chung-don-vi/{id}`, `GET minh-chung-don-vi/{id}/tai-ve` |

Màn hình Phòng đã nối `PUT chi-tiet-don-vi/{ct}/diem-truong`, `POST phieu-don-vi/{id}/duyet-truong`, `/chot`, `/mo-lai`, lần lượt ở trạng thái 3/3/4/5 khi chức vụ chính là HT/ADMIN. Màn hình Khoa và màn hình Phòng trong hàng đợi chỉ hiển thị ba trạng thái cuối để đọc. Route `/danh-gia-kpi-phong/:id` mở cho TKP/TP*, nên HT/ADMIN chỉ tới được các nút cấp Trường khi đồng thời kiêm nhiệm một vai trò hợp lệ; chưa có lối vào riêng cho cấp Trường.

### 11.4. Thẩm định từng dòng và chốt hồ sơ

| Thao tác | API |
|---|---|
| Đọc hồ sơ / phân quyền tiêu chí / mẫu | `GET phieu/{id}`, `GET tieu-chi-don-vi-cham`, `GET maudanhgia/{mau}/chi-tiet` |
| Lưu điểm thẩm định | `PUT chitiet/{ct}/diem-khoa` |
| Duyệt / trả dòng cho người kê khai | `POST chitiet/{ct}/tham-dinh/duyet`, `POST chitiet/{ct}/tham-dinh/tra-ve` |
| Trưởng Khoa trả dòng đã chốt để thẩm định lại | `POST chitiet/{ct}/khoa/tra-tham-dinh` |
| Đọc minh chứng / nhiệm vụ / lịch sử | `GET chitiet/{ct}/minh-chung`, `GET chitiet/{ct}/nhiem-vu`, `GET phieu/{id}/lich-su-cham-diem` |
| Xem trước chốt hồ sơ | `GET phieu/{id}/xem-truoc-chot` |
| Chốt hồ sơ cá nhân của Khoa hoặc Phòng | `POST phieu/{id}/khoa/duyet-ho-so` |

Quyền chấm ở frontend xét tiêu chí được giao, loại nguồn điểm, trạng thái dòng và đơn vị. Các thao tác cập nhật phiếu thường gửi `RowVersion`; xung đột 409 yêu cầu tải lại dữ liệu.

### 11.5. Nhiệm vụ Khoa / phục vụ cộng đồng

| Thao tác | API |
|---|---|
| Cấu hình / kỳ / danh sách / chi tiết / GV | `GET cau-hinh/nhiem-vu-khoa`, `GET nhiem-vu-khoa/ky`, `GET nhiem-vu-khoa`, `GET nhiem-vu-khoa/{id}`, `GET nhiem-vu-khoa/giang-vien` |
| Kê khai/sửa/xóa | `POST nhiem-vu-khoa`, `PUT nhiem-vu-khoa/{id}`, `DELETE nhiem-vu-khoa/{id}` |
| Xét từng nhiệm vụ | `POST nhiem-vu-khoa/{id}/xet` |
| Nhiệm vụ của mình / tổng hợp / xuất Excel | `GET nhiem-vu-khoa/cua-toi`, `GET nhiem-vu-khoa/tong-hop`, `GET nhiem-vu-khoa/export` |
| Phản hồi lưu trữ / lịch sử | `GET nhiem-vu-khoa/phan-hoi`, `GET nhiem-vu-khoa/lich-su` |
| Mở lại kỳ cũ khi được phép | `PUT nhiem-vu-khoa/ky` với `MoLai=true`, lý do |
| Minh chứng | `POST nhiem-vu-khoa/{id}/minh-chung`, `DELETE minh-chung-nvk/{id}`, `GET minh-chung-nvk/{id}/tai-ve` |

Kê khai cần `CanKeKhai === true` và kỳ chưa chốt; sửa theo `ChoPhepSua === true`; xóa cần kỳ chưa chốt và (`ChoPhepSua === true` hoặc `CanDuyet === true`). Mở lại kỳ theo `CanDuyet === true` và bắt buộc lý do. FE không tự loại vai trò TLGVK khỏi thao tác này; BE cấp quyền theo từng đơn vị và kiêm nhiệm.

## 12. API dùng chung và minh chứng

| Nhóm | API | Trang sử dụng |
|---|---|---|
| Năm đánh giá | `GET namdanhgia` | Hầu hết trang đánh giá, quản lý nguồn và báo cáo |
| Đơn vị | `GET donvi` | Bộ lọc, nhân sự, số liệu nguồn, quản lý/chấm KPI |
| Nhân viên | `GET nhan-vien` với query tìm kiếm/phân trang/phạm vi | Chọn người, nhân sự, vi phạm, tra cứu hồ sơ |
| Cấu hình minh chứng đơn vị | `GET cau-hinh/minh-chung` | Form minh chứng KPI đơn vị |
| Đọc minh chứng phiếu cá nhân | `GET chitiet/{ct}/minh-chung` | Thẩm định, chốt hồ sơ, lịch sử cá nhân, duyệt phiếu quý qua `TieuChiChamCard`, khi DTO chưa nhúng danh sách minh chứng |
| Tải lên/xóa/tải về minh chứng cá nhân | `POST chitiet/{ct}/minh-chung/file`, `DELETE minhchung/{id}`, `GET minhchung/{id}/tai-ve` | Form năm/quý tải lên/xóa; các màn hình đọc dùng tải về/xem trước khi có minh chứng |
| Kho minh chứng cá nhân | `GET minhchung` | `/kho-minh-chung` |
| Minh chứng đơn vị | `POST chi-tiet-don-vi/{ct}/minh-chung/file`, `DELETE minh-chung-don-vi/{id}`, `GET minh-chung-don-vi/{id}/tai-ve` | Form KPI Khoa/Phòng tải lên/xóa; màn hình chấm và lịch sử nhận danh sách từ DTO phiếu để xem/tải; helper đọc riêng chưa dùng, xem mục 14.3 |
| Kho minh chứng đơn vị | `GET minh-chung-don-vi` | `/kho-minh-chung-don-vi` |
| Minh chứng thành tích | `POST ke-khai-thanh-tich/chi-tiet/{ct}/minh-chung`, `POST ke-khai-thanh-tich/minh-chung-tam`, `DELETE ke-khai-thanh-tich/minh-chung/{id}`, `GET ke-khai-thanh-tich/minh-chung/{id}` | Kê khai và duyệt thành tích |
| Minh chứng NVK | `POST nhiem-vu-khoa/{id}/minh-chung`, `DELETE minh-chung-nvk/{id}`, `GET minh-chung-nvk/{id}/tai-ve` | Phục vụ cộng đồng cá nhân và quản lý |
| Minh chứng vi phạm | `POST/DELETE viphamgiangday/{id}/minh-chung`, `GET viphamgiangday/{id}/minh-chung/tai-ve` | Ghi nhận GV/VC, thống kê, vi phạm cá nhân |
| Phiên đăng nhập | `GET auth/me`, `POST auth/refresh`, `POST auth/logout` | Context và lớp gọi API toàn ứng dụng |

Dashboard dùng thêm `GET bao-cao/phong/tong-quan`, `GET bao-cao/toan-truong`, `GET bao-cao/tong-quan`, `GET bao-cao/diem-trung-binh`, `GET bao-cao/chua-hoan-tat`, `GET bao-cao/chua-lap-phieu` theo vai trò. TKK/TKP xem dữ liệu tổng hợp theo phạm vi được cấp; quyền vào dashboard/báo cáo không tự cấp quyền mở hồ sơ của người khác.

## 13. Route chi tiết và alias không có mục menu riêng

Các route dưới đây kế thừa luật của mục cha trong `menuConfig.js`.

| Route | Màn hình / API tương ứng |
|---|---|
| `/phieu-don-vi-cho-cham/:id` | Chi tiết Khoa/Phòng theo loại mẫu BE, xử lý cấp đơn vị; bộ API mục 11.3 |
| `/danh-gia-kpi-don-vi/:id` | Chi tiết/chấm phiếu Khoa; bộ API mục 11.3 |
| `/danh-gia-kpi-phong/:id` | Chi tiết/chấm phiếu Phòng; bộ API mục 11.3 |
| `/lich-su-danh-gia-khoa/:id` | Chi tiết phiếu Khoa ở chế độ lịch sử, chỉ đọc |
| `/lich-su-danh-gia-phong/:id` | Chi tiết phiếu Phòng ở chế độ lịch sử, chỉ đọc |
| `/lich-su-danh-gia/:id` | Chi tiết phiếu cá nhân, minh chứng và lịch sử chấm |
| `/quan-ly-nguoi-dung/them-moi` | Tạo người dùng; `POST nhan-vien`, thêm chức danh/chức vụ |
| `/quan-ly-nguoi-dung/chi-tiet/:id` | Sửa người dùng và chức danh/chức vụ; API mục 10 |
| `/quan-ly-don-vi/:maDonVi/danh-sach-thanh-vien` | Thành viên đơn vị; `GET nhan-vien?maDonVi=...&baoGomDonViCon=true` |
| `/mau-danh-gia/:idMau/phan-quyen` | Phân quyền chấm tiêu chí; `GET maudanhgia/{mau}`, `GET maudanhgia/{mau}/chi-tiet`, `GET donvi`, `GET/PUT tieu-chi-don-vi-cham` |
| `/:tieuChiId/thang-diem` | Quản lý mức điểm; `GET tieuchidanhgia`, `GET thangdiem?tieuChiId=...`, `POST thangdiem`, `PUT/DELETE thangdiem/{id}` |
| `/phat-trien-doi-ngu/:id` | Chi tiết bản ghi; `GET phat-trien-doi-ngu/{id}` |
| `/thanh-tich-doan-the/:id` | Chi tiết thành tích; `GET thanh-tich-doan-the/{id}` |
| `/quan-ly/phieu/:id` | Chấm từng dòng phiếu cá nhân; bộ API mục 11.4 |
| `/quan-ly/duyet-ho-so/:id` | Chốt hồ sơ của Khoa; bộ API mục 11.4 |
| `/quan-ly/ho-so-nhan-vien/:id` | Chốt hồ sơ VC/NLĐ của Phòng; bộ API mục 11.4 |
| `/quan-ly/giang-vien/:idNv` | Tra cứu dữ liệu nguồn của GV; các tab và API nêu ở mục 6 |
| `/quan-ly/ke-khai-thanh-tich/:id` | Chi tiết/xét từng dòng thành tích; API nêu ở mục 6 |
| `/quan-ly/vi-pham` | Alias của `/quan-ly-vi-pham`, cùng trang và quyền |
| `/mock-ghi-nhan-vi-pham-nv` | Alias cũ của trang vi phạm nhân viên **dùng API thật**, có `RequireRole`; không phải một trong 14 trang mock |

## 14. Mock, route chuyển hướng và màn hình chưa gắn route

### 14.1. 14 trang mock

| Route | Chức năng minh họa |
|---|---|
| `/mock-tham-dinh-nhan-vien` | Thẩm định nhân viên |
| `/mock-danh-sach-nhan-vien` | Danh sách duyệt nhân viên |
| `/mock-chi-tiet-nhan-vien` | Kết quả/chi tiết nhân viên |
| `/mock-to-trinh-nhan-vien` | Tờ trình nhân viên |
| `/mock-admin-mau-phieu` | Cấu hình mẫu phiếu |
| `/mock-danh-gia-giang-vien` | Đánh giá giảng viên |
| `/mock-danh-gia-khoa` | Đánh giá Khoa |
| `/mock-danh-gia-phong` | Đánh giá Phòng |
| `/mock-tham-dinh-giang-vien` | Thẩm định giảng viên |
| `/mock-danh-gia-quan-ly-khoa` | Đánh giá quản lý Khoa |
| `/mock-bang-xep-hang-don-vi` | Xếp hạng đơn vị |
| `/mock-de-xuat-tang-hang` | Đề xuất tăng hạng |
| `/mock-hieu-truong-duyet` | Hiệu trưởng duyệt |
| `/mock-thong-ke-toan-truong` | Thống kê toàn trường |

Các trang này dùng dữ liệu minh họa; không tìm thấy lời gọi API nghiệp vụ trong các trang mock và phần component liên quan được rà soát. Bị ẩn khỏi sidebar bằng tên `[Mock]`, nhưng route vẫn tồn tại. Chúng nằm ngoài nhóm `RequireRole` trong `AppRoutes.js`; lớp ứng dụng vẫn yêu cầu đăng nhập. Không mô tả chúng như màn hình vận hành đã tích hợp API.

### 14.2. Các route cũ chuyển hướng

| Route cũ | Đích hiện tại |
|---|---|
| `/ke-khai-gio-quy-doi/*` | `/gio-giang-cua-toi` |
| `/quan-ly/ke-khai-gio-quy-doi/*` | `/ty-le-hoan-thanh-gio-giang` |
| `/cong-viec-quy-doi/*` | `/quan-ly-gio-giang` |
| `/quan-ly/cong-viec-quy-doi/*` | `/quan-ly-gio-giang` |

Các route cũ chỉ chuyển hướng; trang đích vẫn kiểm tra quyền của mình. Module kê khai giờ quy đổi không còn là trang nghiệp vụ hiện tại.

### 14.3. Màn hình/helper chưa tạo thành trang đang truy cập được

- `HangDoiThamDinh.js` còn trong thư mục trang, nhưng `/quan-ly/tham-dinh` không được gắn trong `AppRoutes.js` hoặc menu; lối vào hiện tại là `/quan-ly/cho-cham`.
- `PhieuQuyCuaToi.js` là component của trang KPI nhân viên, không có URL độc lập.
- `KpiEvaluation.js` và một số form/mock cũ còn trong cây mã nguồn nhưng không được khai báo thành route độc lập hiện tại; không cộng vào danh sách trang đang mở được.

Các **helper** sau chưa có nơi gọi trong giao diện hiện tại (bỏ qua file khai báo và test):

| Helper | Endpoint |
|---|---|
| `tongHopTuDong` | `POST phieu/{id}/tong-hop-tu-dong` |
| `fetchLichSuChamDiem` | `GET chitiet/{ct}/lich-su-cham-diem` |
| `fetchLichSuTrangThai` | `GET phieu/{id}/lich-su-trang-thai` |
| `addLinkMinhChungQuy` | `POST chitiet/{ct}/minh-chung/link` |
| `fetchMinhChungQuy` | `GET chitiet/{ct}/minh-chung` |
| `fetchMinhChungDonVi` | `GET chi-tiet-don-vi/{ct}/minh-chung` |
| `layTongHopThanhTich` | `GET ke-khai-thanh-tich/tong-hop` |
| `layMinhChungNhiemVu` | `GET nhiem-vu-khoa/{id}/minh-chung` |
| `layLichSuNhiemVu` | `GET nhiem-vu-khoa/{id}/lich-su` |

Có 9 helper trong bảng. Helper chưa dùng không đồng nghĩa endpoint chưa dùng: `GET chitiet/{ct}/minh-chung` vẫn được gọi qua `fetchMinhChung` tại các màn hình nêu ở mục 12. Không mô tả một helper có sẵn như thao tác có nút nếu chưa có giao diện gọi nó.

## 15. Các điểm cần lưu ý khi dùng bản tổng hợp

1. **Chức vụ chưa lưu thật:** `/quan-ly-chuc-vu` có form thêm/sửa/xóa nhưng handler chỉ sửa state. Tải lại trang sẽ lấy lại danh sách `GET chucvu`.
2. **Cơ cấu đơn vị chỉ đọc:** `/quan-ly-don-vi` hiện không gọi API tạo/sửa/xóa đơn vị.
3. **Phiếu đơn vị đã có tự tạo, còn thiếu lối vào riêng cấp Trường:** TKK/TKP tại đúng đơn vị được tự tạo phiếu khi mở năm chưa có. Khoa không có nút cấp Trường; Phòng đã có nhưng route chỉ mở cho TKP/TP*, nên HT/ADMIN phải kiêm nhiệm mới tới được. Hàng đợi chỉ xử lý cấp đơn vị.
4. **API giờ giảng của hồ sơ GV còn dùng đường dẫn cũ:** `/quan-ly/giang-vien/:idNv` gọi `gio-giang-import`, trong khi các trang giờ giảng chính dùng `gio-giang-tkb`. Đây là khác biệt trực tiếp trong mã nguồn; cần API thật để kết luận endpoint cũ còn được phục vụ hay không.
5. **Tập quyền TP* chưa áp dụng cho mọi trang:** tỷ lệ giờ giảng hiện chỉ gồm TP, còn các nhóm khác đã có QTP/GD/VT. Bản tổng hợp giữ đúng cấu hình hiện tại.
6. **Luật frontend và API khác cấp độ:** route chỉ mở lối vào; backend quyết định phạm vi và hành động. Không lấy danh sách vai trò được vào trang làm danh sách chắc chắn được ghi mọi dữ liệu.
7. **Nút reset mật khẩu chưa có gate riêng trong danh sách người dùng:** `QL_NhanVienListing.js` bật cả cụm thao tác bằng `canManage`, bao gồm reset. Không thể kết luận mọi vai trò nhìn thấy nút đều được API cho phép reset; tài liệu này chưa kiểm tra backend đang chạy.

Nguồn chính để cập nhật tài liệu: `src/routes/AppRoutes.js`, `src/config/menuConfig.js`, `src/utils/roles.js`, `src/components/RequireRole.js`, `src/utils/*Api.js`, các trang/component/hook/context được chúng sử dụng. Tài liệu này không thay thế hợp đồng và kiểm tra phân quyền của backend.
