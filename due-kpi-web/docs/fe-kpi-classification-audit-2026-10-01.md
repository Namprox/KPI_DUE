# Rà soát phân loại đối tượng KPI — 2026-10-01

Đã sửa các lỗi rõ ràng A, C, D, G; thay quyền dựa trên chức danh bằng phân loại backend ở B; sửa nguồn danh sách chưa lập phiếu ở F; kiểm tra và bổ sung cảnh báo phân công cũ ở E. Hai picker ghi vi phạm vẫn dùng danh bạ chung và được liệt kê bên dưới để đổi nguồn API, theo yêu cầu không tự suy chức danh.

Các số dòng dưới đây thuộc mã sau sửa. “Đã sửa” mô tả lỗi trước sửa; “Đúng” là phần đã kiểm tra và giữ nguyên. Rà soát toàn bộ `src`, gồm menu, route, helper, trang, component, kiểu dữ liệu và test. Các file tài liệu đã được người dùng thay đổi trước phiên này được giữ nguyên.

## A. Auth/me, menu và URL

| file:dòng | Vấn đề / kết quả | Mức độ | Cách sửa / trạng thái |
|---|---|---|---|
| `src/config/menuConfig.js:226`, `:236`, `:247`, `:257` | Thành tích NCKH, phản hồi sinh viên, phục vụ cộng đồng, vi phạm cá nhân dùng tập chức danh có HĐLĐ. | Cao | Đã sửa: chỉ mở khi có ít nhất một đơn vị `LoaiDoiTuong === 1`; menu và URL cùng luật. |
| `src/config/menuConfig.js:49` | Lịch sử phiếu cá nhân mở cho mọi người đăng nhập, trái với yêu cầu không có chức năng đánh giá cá nhân khi không có loại 1/2. | Cao | Đã sửa: chỉ mở khi có loại 1 hoặc 2; áp dụng cả `/lich-su-danh-gia/:id`. |
| `src/components/RequireRole.js:31` | Chặn chung chưa giải thích trường hợp loại 0; guard có thể chạy trước khi auth hoàn tất. | Cao | Đã sửa: chờ auth; người loại 0 không có đơn vị loại 1/2 nhận “Bạn không thuộc diện đánh giá KPI”; loại thiếu/null nhận thông báo quyền truy cập chung. Không render trang con. |
| `src/pages/CaNhan/TongQuanCaNhan.js:133`, `:563` | Trang chủ gọi `phieu/me` và hiện khối phiếu cá nhân cho mọi tài khoản. | Cao | Đã sửa: không gọi phiếu cá nhân khi không có loại 1/2; thay khối đó bằng thông báo. Dashboard quản lý vẫn theo chức vụ. |
| `src/utils/roles.js:505`, `:513`, `:518` | Helper chọn đơn vị, kiểm tra loại và đường dẫn tự đánh giá. | Thấp | Đúng: so sánh loại 1/2 tường minh, xét toàn bộ `DonVi[]`; đường dẫn ưu tiên đơn vị chính hợp lệ rồi tìm đơn vị khác. Loại 0/null/thiếu không được mặc định thành 2. |
| `src/pages/DanhGia/PhieuTuDanhGia.js:172`; `src/pages/DanhGia/PhieuQuyCuaToi.js:256`; `src/pages/DanhGia/DanhGiaNhanVien.js:76` | Đơn vị dùng để tạo phiếu năm/quý. | Thấp | Đúng: lọc theo loại backend, giữ đúng ID đơn vị được chọn; không lấy đơn vị đầu tiên để phân loại mọi bổ nhiệm. Phiếu quý tích hợp trong “Đánh giá KPI Nhân viên”, không có route độc lập `/phieu-quy-cua-toi`. |
| `src/config/menuConfig.js:209` | Kê khai thành tích có gắn KPI không? | Thấp | Đã xác minh: nguồn điểm KPI Nhóm II của viên chức/NLĐ; giữ gate loại 2. Không cần chọn quy tắc nghiệp vụ mới. |
| `src/components/CaNhan/GioGiangNamCard.js:7` | Thẻ tự xem giờ giảng. | Thấp | Đúng: chỉ gọi API với ID chính mình khi có đơn vị loại 1. Test bổ sung xác nhận loại 0/null/thiếu không gọi API. |
| `src/config/menuConfig.js:52` và các rule quản lý | Người miễn KPI vẫn có thể giữ chức vụ quản lý. | Cao | Giữ nguyên toàn bộ tập quyền quản lý, duyệt, báo cáo và quản trị. Không thêm gate loại cá nhân vào các route này. Kho minh chứng cá nhân chỉ đọc tiếp tục mở theo quyền cũ. |

## B. Chức danh và suy loại người

| file:dòng | Vấn đề / kết quả | Mức độ | Cách sửa / trạng thái |
|---|---|---|---|
| `src/utils/roles.js:489`; `src/config/menuConfig.js:226` | Tập `CHUC_DANH_SETS.GIANG_VIEN` chứa `HDLD_GV`, `HDLD_HUU` và helper cấp quyền bằng `MaChucDanh`. | Cao | Đã bỏ tập và helper cấp quyền này; tất cả consumer chuyển sang loại backend. Không thay bằng tập 3 mã mới. |
| `src/pages/QuanLyChamDiem/DuyetHoSoPhong.js:176` | Bộ lọc cũ chấp nhận phiếu thiếu loại vì suy “Phòng là loại 2”. | TB | Đã sửa: nhận đúng đơn vị và `LoaiDoiTuong === 2` từ phiếu. Đã kiểm tra DTO backend hiện có field này. |
| `src/pages/QuanLyChamDiem/ChotHoSoPhong.js:240` | Nhãn loại cá nhân có fallback `?? 2` vì suy từ Phòng. | TB | Đã bỏ fallback; lấy loại từ preview hoặc chi tiết phiếu. Không đổi công thức/xếp loại của màn viên chức. |
| `src/utils/viPhamPermissions.js:153`, `:157` | Khi danh bạ không trả loại, `laGiangVien()` cho ứng viên đi qua để server kiểm tra lúc lưu. | Cao | Chưa đổi: thuộc vấn đề picker E. Chuyển sang endpoint chuyên biệt; không suy loại từ chức danh/mã đơn vị. |
| `src/pages/QuanLyToChuc/QL_NhanVienChiTiet.js:184`, `:334`, `:746`; `src/pages/ThongTinCaNhan.js:1214` | Các tham chiếu chức danh còn lại dùng sắp xếp, chỉnh hồ sơ, lịch sử và hiển thị nhãn. | Thấp | Giữ nguyên: không cấp quyền/không phân loại KPI. Các kiểm tra cây Khoa/Phòng cho phạm vi quản lý, phiếu đơn vị loại 3/4 và cấu hình danh mục cũng không phải suy loại cá nhân. |

## C. Nhãn và kiểu dữ liệu

| file:dòng | Vấn đề / kết quả | Mức độ | Cách sửa / trạng thái |
|---|---|---|---|
| `src/utils/roles.js:489`, `:495` | Enum auth chưa có loại 0; chưa có nhãn an toàn cho loại này. | TB | Thêm `KHONG_DANH_GIA: 0` và nhãn “Không thuộc diện đánh giá KPI”. Nhánh mặc định “Chưa có phân loại đối tượng KPI”, khác rõ với 0. |
| `src/utils/authTypes.d.ts:8`; `src/context/AuthContext.js:15` | Repo dùng JS, trước đó không có type `AuthUserDonVi`. | Thấp | Thêm declaration dùng cho auth: `LoaiDoiTuong?: 0 \| 1 \| 2 \| null`, liên kết bằng JSDoc tại state auth. Không mở rộng enum/type phiếu sang 0. |
| `src/components/QuanLyChamDiem/BaoCaoBoSung.js:59`; `src/components/QuanLyChamDiem/TongQuanUi.js:533` | Nhãn báo cáo thuộc DTO báo cáo, không phải auth. | Thấp | Đúng: đọc `LoaiDoiTuongText` từ API, không tự map lại hoặc thêm cột loại 0. |

## D. Thông điệp lỗi

| file:dòng | Vấn đề / kết quả | Mức độ | Cách sửa / trạng thái |
|---|---|---|---|
| `src/utils/apiError.js:84` | `SAI_LOAI_DOI_TUONG` bị đổi thành một câu cố định, không diễn đạt được người miễn KPI. | Cao | Đã bỏ câu cố định; giữ `Message`/`message` của server. Test cả hai cách đặt tên body, HTTP 409. |
| `src/utils/apiError.js:10` | `NOT_GIANG_VIEN_KHOA` và `NOT_VIEN_CHUC` ghi đè thông điệp 403 của server. | Cao | Đã bỏ map cố định cho hai mã này; các trang ghi/sửa vi phạm đang dùng `readApiError` và toast thông điệp đó. |
| `src/utils/nhiemVuKhoaApi.js:113` | `GV_NGOAI_KHOA` bị map thành “không thuộc Khoa”, trong khi có thể là người loại 0 ngay tại Khoa. | Cao | Đã dùng thông điệp server. Test POST và PUT với HTTP 400. |
| `src/pages/DanhGia/PhieuTuDanhGia.js:744` | Sau bất kỳ lỗi tạo phiếu nào, FE thử lấy phiếu sẵn có rồi tiếp tục; có thể nuốt lỗi 409 miễn KPI nếu còn phiếu cũ. | Cao | Đã giới hạn đường khôi phục vào HTTP 409 có thông điệp “phiếu đã tồn tại”. Lỗi khác ném đúng `Message`/`message`, hiện qua toast của thao tác lưu. Backend hiện trả câu không dấu `Phieu danh gia da ton tai.` cho trường hợp trùng. |
| `src/utils/phieuQuyApi.js:40`; `src/pages/DanhGia/PhieuQuyCuaToi.js:370`; `src/components/QuanLyChamDiem/NhiemVuKhoaFormModal.js:259` | Các caller có nuốt lỗi không? | Thấp | Đúng: helper ném lỗi và caller hiện `error.message`; đã kiểm tra các thao tác tạo/lưu liên quan. Các map lỗi khác giữ nguyên. |

## E. Picker và phân công cũ

| file:dòng | Vấn đề / kết quả | Mức độ | Cách sửa / trạng thái |
|---|---|---|---|
| `src/pages/QuanLyKeHoach/QL_ViPham.js:200`, `:143`; `src/utils/viPhamPermissions.js:157` | Picker giảng viên dùng `fetchAllNhanVien` → `api/nhan-vien`; thiếu phân loại vẫn được xem là ứng viên, nên người miễn KPI có thể được chọn rồi nhận 403. | Cao | Đề xuất đổi nguồn sang `api/vi-pham/tong-hop-giang-vien` theo năm/phạm vi; giữ backend là bên quyết định tập người. Chưa đổi picker trong lượt này. Nếu tiếp tục dùng danh bạ chung, backend cần bổ sung phân loại tại đơn vị cho danh bạ. |
| `src/pages/QuanLyKeHoach/GhiNhanViPhamNhanVien.js:207`, `:118` | Picker viên chức cũng dùng danh bạ chung rồi đòi `LoaiDoiTuong === 2`. `NhanVienListItemDto` backend hiện không có field này, nên có thể rỗng/mất cả nhân viên văn phòng Khoa không có chức danh. | Cao | Đề xuất dùng `api/vi-pham/tong-hop-nhan-vien` theo năm/phạm vi. Backend đã lọc loại 2 gồm văn phòng Khoa. Không suy từ mã/id chức danh; không thêm fallback loại 2. Chưa đổi picker trong lượt này. |
| `src/utils/nhiemVuKhoaApi.js:375` | Picker giao nhiệm vụ đã dùng `api/nhiem-vu-khoa/giang-vien`. | Thấp | Đúng: server lọc tập người. Không thêm lọc chức danh ở FE. |
| `src/components/QuanLyChamDiem/NhiemVuKhoaFormModal.js:90`, `:375`, `:399`, `:455` | Phân công cũ còn ID không có trong picker: form không crash nhưng ô chọn hiện placeholder, khó nhận ra người cần bỏ. | TB | Đã thêm cảnh báo tên/ID gốc, không đưa người đó trở lại tập chọn. Có nút gỡ dòng; test đã gỡ người vắng khỏi picker, lưu PUT với `PhanCong: []` thành công. |
| `src/pages/DanhGia/PhieuTuDanhGia.js:722`; `src/pages/DanhGia/PhieuQuyCuaToi.js:366` | Tạo phiếu hộ có dùng danh bạ chung không? | Thấp | Không thấy picker tạo hộ trong các luồng tạo phiếu đang hoạt động; ID người tạo lấy từ auth. |

Hai đề xuất đổi picker có thể dùng endpoint chuyên biệt đã tồn tại; không bắt buộc tạo route/DTO mới. Trước khi đổi cần nối thêm việc tải lại theo năm và giữ đúng phạm vi quyền ghi nhận, thông tin đơn vị của người chọn và cách giữ bản ghi cũ khi sửa. Không dùng loại của người ghi nhận trong `auth/me` để phân loại người khác.

## F. Dashboard và báo cáo

| file:dòng | Vấn đề / kết quả | Mức độ | Cách sửa / trạng thái |
|---|---|---|---|
| `src/hooks/useChuaTuCham.js:39`; `src/utils/chuaLapPhieu.js:47`, `:89` | Duyệt hồ sơ Khoa, duyệt hồ sơ Phòng và danh sách phiếu tự tính người chưa lập bằng danh bạ chung trừ phiếu; danh bạ không có phân loại KPI. | Cao | Đã chuyển sang `bao-cao/chua-lap-phieu?quy=0`. Lấy đủ trang theo `TotalCount`, không có fallback danh bạ. Phiếu nháp vẫn lấy từ API phiếu. Lỗi báo cáo được hiện qua state lỗi, không biến thành danh sách thành công rỗng. |
| `src/utils/chuaLapPhieu.js:64` | API báo cáo lọc cả cây đơn vị, còn bộ lọc màn phiếu chọn chính xác một đơn vị. | TB | Đã kiểm tra procedure backend: giữ lọc chính xác `IdDonVi` khi có `idDonViLoc` trên các dòng báo cáo được server cho phép đọc. Không suy loại người, không gọi danh bạ chung. |
| `src/components/QuanLyChamDiem/TongQuanKhoa.js:236`; `src/components/QuanLyChamDiem/TongQuanCapQuanLy.js:295`; `src/pages/QuanLyChamDiem/BaoCaoDonVi.js:206` | Số nhân viên/số chưa lập trên dashboard và báo cáo. | Thấp | Đúng: đọc số backend trả. Fallback cũ ở tổng quan Khoa cộng số phiếu và số chưa lập đều từ response báo cáo, không đếm danh bạ. Không đổi cách hiển thị số/nhãn của báo cáo. |
| `src/components/QuanLyChamDiem/BaoCaoBoSung.js:58` | `TheoLoaiDoiTuong`. | Thấp | Giữ hai nhóm 1 và 2 từ backend, không thêm nhóm/cột 0. |

## G. Cache và tải lại auth

| file:dòng | Vấn đề / kết quả | Mức độ | Cách sửa / trạng thái |
|---|---|---|---|
| `src/context/AuthContext.js:21`, `:41`, `:63` | Auth lưu trong React state, đã gọi `auth/me` khi khởi động và sau login; HTTP cache chưa được vô hiệu rõ. | Cao | Đã thêm `cache: "no-store"`. Không tìm thấy `localStorage`/`sessionStorage` lưu user/DonVi trong `src`. Tải lại app tạo store mới và nạp auth mới. |
| `src/context/AuthContext.js:48`, `:64` | Login trả thành công dù tải hồ sơ đầy đủ thất bại; có nguy cơ giữ cách hiểu sai trạng thái đăng nhập. | TB | Đã xóa user cũ khi bắt đầu login, chỉ trả thành công nếu `auth/me` nạp được. Khi lỗi, user = null và hiện “Không tải được thông tin tài khoản. Vui lòng đăng nhập lại.” |
| `src/context/AuthContext.test.js:42` | Kiểm chứng phân loại thay đổi 1 → 0. | TB | Test remount provider và test đăng nhập mới xác nhận dùng loại 0 từ `auth/me`, không dùng `User` thiếu/cũ từ login; có test lỗi nạp hồ sơ. |

## Checklist kiểm tra thủ công

Chạy trên môi trường đã deploy backend/migrate. Mỗi lần đăng nhập hoặc reload kiểm tra request `GET auth/me` và giá trị từng `DonVi[].LoaiDoiTuong`. Các checklist sau là kỳ vọng cần xác nhận bằng tài khoản thật, chưa được đánh dấu hoàn tất.

Các nhóm menu cá nhân để đối chiếu:

- **G**: Đánh giá KPI Giảng viên; Giờ giảng của tôi; Thành tích NCKH; Phản hồi sinh viên; Phục vụ cộng đồng; Vi phạm của tôi.
- **V**: Đánh giá KPI Nhân viên (bao gồm phiếu quý khi năm bật `ApDungPhieuQuy`); Kê khai thành tích.
- **H**: Lịch sử đánh giá cá nhân và URL chi tiết lịch sử.
- Tổng quan, thông tin liên hệ và kho minh chứng cá nhân chỉ đọc giữ quyền hiện có. Menu quản lý M theo chức vụ, không theo G/V.

| Tài khoản | Auth phải trả | Menu hiện | Menu ẩn / URL bị chặn | Thao tác và thông báo cần xác nhận |
|---|---|---|---|---|
| HĐLĐ/Giảng viên ở Khoa (`HDLD_GV`) | 0 tại **mọi** đơn vị | Tổng quan, thông tin liên hệ, kho minh chứng cá nhân; M nếu có chức vụ tương ứng | Toàn bộ G, V, H | URL trực tiếp của G/V/H hiện **“Bạn không thuộc diện đánh giá KPI”**. Trang chủ không gọi `phieu/me`; không gọi thẻ giờ giảng, nhiệm vụ/phan-hoi hoặc kê khai thành tích. Kiểm tra POST phiếu năm 409, POST phiếu quý 409 `SAI_LOAI_DOI_TUONG`, ghi/sửa vi phạm 403, phân công nhiệm vụ 400: giữ nguyên thông điệp body. |
| HĐLĐ/Hưu trí ở Phòng (`HDLD_HUU`) | 0 tại **mọi** đơn vị | Tổng quan, thông tin liên hệ, kho minh chứng cá nhân; M nếu có chức vụ | Toàn bộ G, V, H | Như tài khoản trên; đặc biệt không thấy KPI Nhân viên/phiếu quý dù thuộc Phòng. URL V bị chặn với thông báo miễn KPI; lỗi thao tác giữ thông điệp server. |
| HĐLĐ có chức vụ quản lý | 0 tại mọi đơn vị, giữ `MaChucVu` đúng | Với TK/TKL: KPI Khoa, duyệt hồ sơ KPI, duyệt quý viên chức, tờ trình, ghi nhận phục vụ cộng đồng/vi phạm giảng viên, báo cáo. Với TP: KPI Phòng, chốt hồ sơ nhân viên, duyệt quý, tờ trình, duyệt kê khai thành tích, ghi vi phạm nhân viên, báo cáo. ADMIN/HT vẫn giữ các mục quản trị/duyệt tương ứng. | G, V, H cá nhân | URL quản lý mở bình thường; thao tác quản lý đúng người/đơn vị còn theo quyền/cờ backend. URL cá nhân bị chặn bằng thông báo miễn KPI. Dashboard quản lý vẫn hiện; phần phiếu của bản thân không gọi API. |
| GV / GVC / GVCC ở Khoa | 1 tại đơn vị Khoa tương ứng | G và H | V nếu không có bổ nhiệm loại 2 | Mở/tạo/tự đánh giá phiếu năm đúng đơn vị; xem giờ giảng với ID bản thân; xem và gửi phản hồi nhiệm vụ. Không tạo phiếu quý cho đơn vị loại 1; nếu gọi POST trái loại, hiện thông điệp 409 của server. Không xuất hiện cột loại 0 trên báo cáo. |
| Viên chức ở Phòng | 2 | V và H | G nếu không có bổ nhiệm loại 1 | Phiếu quý mở khi năm bật chế độ quý; khi năm không bật, dùng phiếu năm hiện có. Kê khai thành tích hoạt động. URL G hiện **“Bạn không có quyền truy cập trang này”**. Ghi vi phạm hợp lệ giữ luồng cũ; lưu lỗi hiện thông điệp body. |
| Nhân viên văn phòng Khoa không có chức danh | 2 tại Khoa, `MaChucDanh` null/vắng | V và H | G nếu không có bổ nhiệm loại 1 | KPI Nhân viên/phiếu quý và kê khai thành tích mở bình thường. Xác nhận `vi-pham/tong-hop-nhan-vien` có người này và cho ghi vi phạm loại 2. **Picker FE hiện còn vướng nguồn danh bạ chung ở E: chưa coi kiểm tra chọn người là đạt trước khi đổi nguồn.** |
| Kiêm nhiệm Khoa + Phòng | Từng đơn vị có loại do backend trả; ví dụ Khoa 1, Phòng 2 | G, V, H khi thực sự có cả 1 và 2; M theo mọi bổ nhiệm hợp lệ | Chỉ ẩn nhóm không có loại tương ứng; nếu là HĐLĐ có 0 ở cả Khoa + Phòng thì ẩn G/V/H | Đảo thứ tự `DonVi[]` vẫn cùng quyền menu/URL. Chọn đơn vị phiếu năm/quý phải gửi đúng ID; không dùng loại của đơn vị đầu tiên cho tất cả. Quý chỉ chọn đơn vị loại 2. URL nhóm không hợp lệ hiện thông báo quyền; khi mọi đơn vị 0 hiện thông báo miễn KPI. |

Kiểm tra bổ sung:

- [ ] Reload/đăng nhập lại tài khoản trước đây loại 1/2, nay backend trả 0: menu cá nhân biến mất ngay sau `auth/me`, không dùng store cũ.
- [ ] Auth trả null/vắng loại: không có G/V/H, không mặc định thành viên chức; trang chủ nói chưa có phân loại, khác thông báo miễn KPI.
- [ ] Đổi người kiểm thử từ loại 0 sang loại 1/2 qua đăng nhập thật: không còn quyền/menu cũ của phiên trước.
- [ ] Chặn trực tiếp cả URL lịch sử con và các bookmark cũ dẫn đến trang giờ giảng; trang đích vẫn kiểm tra quyền.
- [ ] Sửa nhiệm vụ cũ có người HĐLĐ không còn trong picker: thấy cảnh báo tên/ID, gỡ dòng rồi lưu; request không còn ID đã gỡ. Giữ ID đó khi lưu thì thấy đúng thông điệp 400 backend.
- [ ] Tạo phiếu năm thất bại vì miễn KPI trong khi tài khoản còn phiếu cũ: không khôi phục phiếu để nuốt lỗi 409. Lỗi “phiếu đã tồn tại” vẫn khôi phục được như luồng cũ.
- [ ] Lỗi `SAI_LOAI_DOI_TUONG` vì giảng viên và vì miễn KPI cùng mã nhưng hiện hai thông điệp server tương ứng.
- [ ] Dashboard và báo cáo giảm số nhân viên/chưa lập theo backend; chỉ hai nhóm 1/2. Danh sách chưa lập không còn người loại 0, lấy đủ nhiều trang, bộ lọc Phòng chọn đúng đơn vị.
- [ ] Nếu API báo cáo trả 403/500, tab chưa tự chấm hiện lỗi, không báo thành công rằng đã hết người chưa lập.
- [ ] Các chức danh/ID ở màn quản lý hồ sơ nhân viên vẫn hiển thị, sửa và sắp xếp như cũ; không ảnh hưởng các chức năng NCKH/thành tích ngoài thay đổi quyền cá nhân đã nêu.

## Kiểm chứng đã thực hiện và giới hạn

- Chạy toàn bộ `npm test -- --watchAll=false --runInBand --silent`: **48 bộ test, 349 test đều qua**.
- `npm run build` production thành công. Có các cảnh báo lint cũ ở SearchSelect, Sidebar, form tự đánh giá, một số màn mock/QL và cảnh báo dung lượng bundle/Browserslist; không có lỗi build hay cảnh báo mới ở các đoạn sửa.
- Test mới bao phủ HDLD_GV/HDLD_HUU loại 0 ở mọi đơn vị, menu + URL, chức vụ quản lý, kiêm nhiệm, null/vắng, giờ giảng không gọi API, trang chủ không gọi phiếu, tải auth mới, lỗi 409/403/400, báo cáo phân trang và gỡ phân công cũ.
- Kiểm tra Browser với bản production cục bộ và API giả lập mới chỉ xác nhận mock nhận `auth/me` loại 0 và `namdanhgia`, không gọi API phiếu cá nhân. Chưa xác nhận giao diện trực quan: Browser từ chối truy cập `scv.udn.vn` do quyền trước đó bị từ chối, nên đã dừng kiểm tra UI. Không có ảnh chụp chứng minh UI sau sửa.
- Chưa thử bằng tài khoản thật, chưa kiểm chứng API xác thực với backend đã migrate. Không chạy truy vấn/migration DB và không thao tác dữ liệu thật.

## File đã thay đổi trong lượt rà soát

Mã ứng dụng: `src/config/menuConfig.js`, `src/components/RequireRole.js`, `src/utils/roles.js`, `src/utils/authTypes.d.ts`, `src/context/AuthContext.js`, `src/pages/CaNhan/TongQuanCaNhan.js`, `src/pages/DanhGia/PhieuTuDanhGia.js`, `src/utils/apiError.js`, `src/utils/nhiemVuKhoaApi.js`, `src/utils/chuaLapPhieu.js`, `src/hooks/useChuaTuCham.js`, `src/components/QuanLyChamDiem/NhiemVuKhoaFormModal.js`, `src/pages/QuanLyChamDiem/ChotHoSoPhong.js`, `src/pages/QuanLyChamDiem/DuyetHoSoPhong.js`. Chú thích nguồn dữ liệu: `src/pages/QuanLyChamDiem/DuyetHoSoKhoa.js`, `src/pages/QuanLyChamDiem/DanhSachPhieu.js`.

Test: `src/config/menuConfig.sidebar.test.js`, `src/context/AuthContext.test.js`, `src/components/RequireRole.kpi.test.js`, `src/pages/CaNhan/TongQuanCaNhan.kpi.test.js`, `src/components/QuanLyChamDiem/NhiemVuKhoaFormModal.test.js`, `src/utils/apiError.kpi.test.js`, `src/utils/chuaLapPhieu.test.js`, `src/pages/QuanLyKeHoach/GioGiangTyLe.test.js`.
