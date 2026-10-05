# Rà soát tài liệu "Tổng hợp trang, chức năng, phân quyền và API"

- Tài liệu được rà soát: [tong-hop-trang-chuc-nang-phan-quyen-api.md](tong-hop-trang-chuc-nang-phan-quyen-api.md)
- Mã nguồn đối chiếu: `due-kpi-web`, nhánh `Phat`, commit `5cfd338`, ngày 04/10/2026
- Phương pháp: chỉ đọc mã nguồn (route, menu, quyền, lớp `*Api.js`, trang và component). Chưa chạy ứng dụng, chưa gọi API thật, chưa đối chiếu với backend đang triển khai.
- Mọi đường dẫn bên dưới tính từ thư mục gốc `due-kpi-web/`. Số dòng ứng với commit nêu trên.

## Tình trạng sau xử lý ngày 04/10/2026

- Đã cập nhật tài liệu tổng hợp theo các mục 1–9, bao gồm phân biệt API dùng chung với helper chưa dùng.
- Đã sửa mục 6: chi tiết hàng đợi chọn màn hình Khoa/Phòng theo `LoaiDoiTuong` do API mẫu trả; TP* đúng đơn vị duyệt được phiếu Phòng ở trạng thái 2. Quyền dòng và phạm vi danh sách vẫn do BE cấp. Hàng đợi chỉ xử lý cấp đơn vị; không thêm nút cấp Trường.
- Đã sửa mục A: nút “Mở phiếu” ở báo cáo chỉ hiện khi `canAccessPath` cho phép trang đích, có xét kiêm nhiệm.
- Giữ luật hiện tại cho chức vụ chính ADMIN: nhập/trình ở trạng thái 1, duyệt cấp đơn vị ở trạng thái 2; BE vẫn quyết định hành động thực tế. Tổng hợp KPI Khoa chạy tự động khi có dòng tự động, không có nút tổng hợp riêng.
- Các trích dẫn “Tài liệu đang ghi” và bằng chứng theo số dòng bên dưới là ảnh chụp tại commit `5cfd338`, trước cập nhật này. Hiện trạng sử dụng nằm trong tài liệu tổng hợp đã chỉnh.
- Đã đối chiếu thêm mã nguồn DTO/API mẫu của `KPI_API`; chưa gọi API thật, chưa thay đổi backend hoặc cơ sở dữ liệu. Kết quả test/build được ghi ở cuối tài liệu.

## Tóm tắt góp ý tại commit `5cfd338` (trước xử lý)

| # | Mục trong tài liệu | Loại | Nội dung |
|---|---|---|---|
| 1 | §4, §11.3, §15.3 | **Sai** | Tài liệu nói không có giao diện tạo phiếu đơn vị, nhưng trang KPI Khoa/Phòng tự gọi `POST phieu-don-vi` |
| 2 | §7, §11.3, §15.3 | **Chưa chính xác** | Màn hình Phòng đã có nút cấp Trường; màn hình Khoa thì không |
| 3 | §6 Báo cáo đơn vị | **Sai** | Trang không có chức năng "xuất dữ liệu" |
| 4 | §4 Lịch sử KPI Khoa/Phòng | **Sai** | Trang không gọi API mẫu hay số liệu nguồn |
| 5 | §11.2, §12 | **Sai một phần / thiếu** | Ghi một API đọc minh chứng quý mà không trang nào gọi; thiếu API đọc phiếu năm kèm lịch sử |
| 6 | §6 Chờ tôi chấm KPI đơn vị | **Thiếu + cần xác nhận** | Trang có 2 tab; phần chi tiết luôn dùng màn hình Khoa nên quyền của TP/ADMIN khác với tài liệu |
| 7 | §8 Ghi nhận phục vụ cộng đồng | **Thiếu** | Thiếu thao tác kê khai/sửa/xóa nhiệm vụ và mở lại kỳ |
| 8 | §14.3 | **Thiếu** | Chỉ nêu 1 helper chưa dùng, thực tế có 9 (thêm 8) |
| 9 | §1, §3, §8 | **Chi tiết nhỏ** | Thiếu tham số `lyDo`, `baoGomDaThuHoi` và API `to-trinh-khoa/{id}` của dashboard |
| A | (ngoài tài liệu) | **Hành vi cần xác nhận** | Nút "Mở" trong Báo cáo đơn vị dẫn một số vai trò tới trang không có quyền |

---

## 1. Tạo phiếu KPI đơn vị: có giao diện gọi `POST phieu-don-vi`

**Tài liệu đang ghi (§11.3):**
> Các helper `POST phieu-don-vi` (tạo phiếu) … tồn tại trong lớp API. Tuy nhiên không tìm thấy giao diện đang gọi helper tạo phiếu …

Ở §15.3 có câu tương tự: "Tạo và duyệt cấp Trường cho phiếu đơn vị còn thiếu lối vào".

**Thực tế trong mã nguồn:**
Hai route `/danh-gia-kpi-don-vi` và `/danh-gia-kpi-phong` cùng dùng `KpiDonViWorkspace`. Đây là màn hình làm việc với **một phiếu**: người dùng chọn đơn vị và năm, rồi trang gọi `timHoacTaoPhieu`. Hàm này chạy như sau:

1. Tìm phiếu bằng `GET phieu-don-vi?idNam=…&idDonVi=…`.
2. Nếu chưa có phiếu **và** người dùng giữ chức vụ thư ký (TKK cho Khoa, TKP cho Phòng) tại đúng đơn vị đó, trang tự gọi `POST phieu-don-vi`.
3. Nếu `POST` lỗi, trang đọc lại danh sách một lần, phòng trường hợp người khác vừa tạo phiếu.
4. TK/TKL/TP mở năm chưa có phiếu thì trang không tạo phiếu mà chỉ báo chưa có.

**Bằng chứng:**
- [src/utils/kpiDonViWorkspace.js:29-56](../src/utils/kpiDonViWorkspace.js#L29-L56): `timHoacTaoPhieu`. Điều kiện thư ký ở dòng 36, lời gọi `taoPhieuDonVi` ở dòng 41.
- [src/pages/DanhGia/KpiDonViWorkspace.js:59-61](../src/pages/DanhGia/KpiDonViWorkspace.js#L59-L61): chế độ không phải lịch sử gọi `timHoacTaoPhieu`.
- [src/utils/phieuDonViApi.js:608-610](../src/utils/phieuDonViApi.js#L608-L610): `taoPhieuDonVi` gửi `POST phieu-don-vi`.

**Đề xuất sửa:**
- §4, cột chức năng của "Đánh giá KPI Khoa": *"Chọn đơn vị và năm; tự tìm phiếu, nếu chưa có và người dùng là TKK của đơn vị thì tự tạo phiếu; nhập điểm, tổng hợp KPI thành viên, trình và duyệt cấp đơn vị."* Mục "Đánh giá KPI Phòng/Trung tâm" sửa tương tự, thay TKK bằng TKP.
- §11.3, thêm dòng: `Tìm hoặc tạo phiếu khi mở trang | GET phieu-don-vi?idNam=…&idDonVi=…, POST phieu-don-vi (chỉ khi người dùng là TKK/TKP tại đơn vị)`.
- §11.3 và §15.3: bỏ câu "không tìm thấy giao diện đang gọi helper tạo phiếu".

**Cách tự kiểm tra:** tìm `timHoacTaoPhieu` và `taoPhieuDonVi` trong `src/`.

---

## 2. Thao tác cấp Trường của phiếu đơn vị: Khoa và Phòng khác nhau

**Tài liệu đang ghi (§11.3):**
> … `PUT chi-tiet-don-vi/{ct}/diem-truong`, `POST phieu-don-vi/{id}/duyet-truong`, `/chot`, `/mo-lai` tồn tại trong lớp API … các nhánh cấp Trường không có route nghiệp vụ được mở cho HT/ADMIN …

Kết luận "chưa có lối vào cho HT/ADMIN" là **đúng**. Tuy nhiên tài liệu ngầm hiểu rằng các helper này chưa được nối vào giao diện, điều đó chỉ đúng với màn hình Khoa.

**Thực tế trong mã nguồn:**
- **Màn hình Khoa (`ChiTietPhieuDonVi`)**: không có nút cấp Trường. Ba trạng thái cuối chỉ hiển thị để đọc; chú thích trong code ghi rõ "chỉ thiếu màn hình".
- **Màn hình Phòng (`ChiTietPhieuPhong`)**: **đã có** đủ nút chấm cấp Trường, duyệt cấp Trường, chốt và mở lại. Các nút này chỉ hiện khi `laCapTruong` đúng, tức **chức vụ chính** là HT hoặc ADMIN.
- Route `/danh-gia-kpi-phong/:id` chỉ mở cho TKP và TP* (TP, QTP, GD, VT), nên thông thường HT/ADMIN không tới được các nút trên.
- Ngoại lệ: người có chức vụ chính HT/ADMIN **đồng thời kiêm nhiệm** TKP hoặc TP* trong `DonVi[]` sẽ vào được route và thấy các nút cấp Trường.
- `/phieu-don-vi-cho-cham/:id` (ADMIN vào được) dùng màn hình Khoa, nên ở đó cũng không có nút cấp Trường.

**Bằng chứng:**
- [src/pages/DanhGia/ChiTietPhieuDonVi.js:94-97](../src/pages/DanhGia/ChiTietPhieuDonVi.js#L94-L97): chú thích về ba trạng thái cuối chỉ đọc.
- [src/pages/DanhGia/ChiTietPhieuPhong.js](../src/pages/DanhGia/ChiTietPhieuPhong.js): dòng 62 (`diem-truong`), 235 (`coTheChamTruong`), 499-501 (`duyetTruongPhieuDonVi`), 535-538 (`chotPhieuDonVi`), 558-561 (`moLaiPhieuDonVi`), 689 và 700 (nút).
- [src/utils/phieuDonViApi.js:386](../src/utils/phieuDonViApi.js#L386): `laCapTruong` xét chức vụ chính HT/ADMIN; các dòng 397-400 dùng nó cho bốn quyền cấp Trường.

**Đề xuất sửa** (thay đoạn cuối §11.3 và điểm 3 của §15):
> Các thao tác cấp Trường (`PUT chi-tiet-don-vi/{ct}/diem-truong`, `POST phieu-don-vi/{id}/duyet-truong`, `/chot`, `/mo-lai`): màn hình Khoa để ba trạng thái cuối ở chế độ chỉ đọc, không có nút. Màn hình Phòng đã có nút nhưng chỉ hiện khi chức vụ chính là HT/ADMIN, trong khi `/danh-gia-kpi-phong/:id` không mở cho HT/ADMIN. Vì vậy hiện chưa có lối vào dùng được cho cấp Trường, trừ trường hợp HT/ADMIN kiêm nhiệm TKP hoặc TP*.

---

## 3. Báo cáo đơn vị không có chức năng xuất dữ liệu

**Tài liệu đang ghi (§6):**
> Báo cáo đơn vị — Tổng quan, điểm trung bình, chưa hoàn tất, chưa lập phiếu; bộ lọc và **xuất dữ liệu**

**Thực tế trong mã nguồn:**
- Không tìm thấy nút xuất Excel, CSV, in hay tải về trong `BaoCaoDonVi.js` và `BaoCaoBoSung.js`.
- Các thao tác thực tế gồm: bộ lọc năm và đơn vị, nút "Làm mới", nút "Mở" từng phiếu trong danh sách chưa hoàn tất, và các nút xem danh sách chưa lập phiếu theo năm, quý và loại đối tượng.
- Trang còn có **khối học vụ** (`HocVuTongQuan`), lấy dữ liệu từ trường `HocVu` trong phản hồi `bao-cao/tong-quan`. Tài liệu chưa nhắc tới khối này.

**Bằng chứng:**
- [src/pages/QuanLyChamDiem/BaoCaoDonVi.js:166-175](../src/pages/QuanLyChamDiem/BaoCaoDonVi.js#L166-L175): nút "Làm mới", là nút thao tác duy nhất trên thanh lọc.
- [src/pages/QuanLyChamDiem/BaoCaoDonVi.js:230](../src/pages/QuanLyChamDiem/BaoCaoDonVi.js#L230): `HocVuTongQuan hocVu={tongQuan?.HocVu}`.
- [src/components/QuanLyChamDiem/BaoCaoBoSung.js:39-76](../src/components/QuanLyChamDiem/BaoCaoBoSung.js#L39-L76): các nút xem danh sách chưa lập phiếu và lời gọi `bao-cao/chua-lap-phieu`.

**Đề xuất sửa:**
> Báo cáo đơn vị — Tổng quan (kèm khối học vụ khi BE trả `HocVu`), điểm trung bình, danh sách phiếu chưa hoàn tất (mở từng phiếu), danh sách chưa lập phiếu theo năm/quý/loại đối tượng; lọc theo năm và đơn vị. **Không có chức năng xuất.**

**Cách tự kiểm tra:** tìm `excel`, `xlsx`, `csv`, `download` hoặc `xuất` (không phân biệt hoa thường) trong hai file trên. Kết quả hiện tại: không có.

---

## 4. Lịch sử KPI Khoa/Phòng không gọi API mẫu hay số liệu nguồn

**Tài liệu đang ghi (§4):**
- Lịch sử đánh giá KPI Khoa: `GET phieu-don-vi`, `GET phieu-don-vi/{id}`, **mẫu, số liệu nguồn** và minh chứng đơn vị
- Lịch sử đánh giá KPI Phòng/Trung tâm: `GET phieu-don-vi`, `GET phieu-don-vi/{id}`, **mẫu** và minh chứng đơn vị

**Thực tế trong mã nguồn:**
- Trang danh sách (`KpiDonViWorkspace` ở chế độ `lichSu`) gọi `GET phieu-don-vi`, có lọc theo năm, đơn vị và trạng thái. Bảng `BangLichSuKpiDonVi` gọi thêm `GET phieu-don-vi/{id}` cho từng phiếu ở trạng thái 2 hoặc 3 để tính tiến độ chấm.
- Trang chi tiết (`ChiTietLichSuKpiDonVi`) chỉ gọi `GET phieu-don-vi/{id}` và tải minh chứng qua `minh-chung-don-vi/{id}/tai-ve`.
- Không có lời gọi `maudanhgia/{mau}/chi-tiet`, `diem-tb-phan-hoi-sv` hay `vi-pham/diem-tru-khoa`. Các API này chỉ được gọi ở màn hình chấm `ChiTietPhieuDonVi`.

**Bằng chứng:**
- [src/pages/DanhGia/ChiTietLichSuKpiDonVi.js:4](../src/pages/DanhGia/ChiTietLichSuKpiDonVi.js#L4): chỉ import `fetchPhieuDonViDetail` từ lớp API; lời gọi ở dòng 37, hook tải minh chứng ở dòng 29.
- [src/components/DanhGia/BangLichSuKpiDonVi.js:19](../src/components/DanhGia/BangLichSuKpiDonVi.js#L19): gọi chi tiết từng phiếu để tính tiến độ.
- Trong `LichSuKpiDonVi.js`, `TieuChiKetQuaDonViCard.js` và `LichSuPhieuDonViHeader.js` không có lời gọi API nào.

**Đề xuất sửa (cả hai dòng Khoa và Phòng):**
> `GET phieu-don-vi` (lọc năm, đơn vị, trạng thái), `GET phieu-don-vi/{id}` (chi tiết, và để tính tiến độ cho phiếu ở trạng thái 2/3), `GET minh-chung-don-vi/{id}/tai-ve`

---

## 5. §11.2 Phiếu quý: một API không được gọi, một API bị thiếu

**Tài liệu đang ghi (§11.2):**
> Minh chứng | `GET chitiet/{ct}/minh-chung`, `POST chitiet/{ct}/minh-chung/file`, …

**Thực tế trong mã nguồn:**
- Helper `fetchMinhChungQuy` (`GET chitiet/{ct}/minh-chung`) **không được trang nào gọi**. `PhieuQuyCuaToi` chỉ dùng tải lên, xóa và tải về minh chứng.
- **Thiếu** `GET phieu/me/{nam}?kemLichSu=true&idDonVi=…` (`fetchPhieuNamCuaToi`), là lời gọi `PhieuQuyCuaToi` dùng để đọc phiếu năm khi tổng hợp từ các quý.
- Liên quan §12, dòng "Minh chứng phiếu cá nhân": `GET chitiet/{ct}/minh-chung` thực tế chỉ được gọi từ `TieuChiChamCard`, và chỉ khi dữ liệu phiếu chưa nhúng sẵn minh chứng. Component này nằm ở các màn hình thẩm định, chốt hồ sơ, lịch sử cá nhân và duyệt phiếu quý. Hai form tự đánh giá năm và quý không gọi API này.

**Bằng chứng:**
- [src/utils/phieuQuyApi.js:270](../src/utils/phieuQuyApi.js#L270): `fetchMinhChungQuy`; tìm trong `src/` thì không có nơi nào gọi.
- [src/utils/phieuQuyApi.js:300-302](../src/utils/phieuQuyApi.js#L300-L302) và [src/pages/DanhGia/PhieuQuyCuaToi.js:77](../src/pages/DanhGia/PhieuQuyCuaToi.js#L77): đọc phiếu năm kèm lịch sử.
- [src/components/QuanLyChamDiem/TieuChiChamCard.js:185-196](../src/components/QuanLyChamDiem/TieuChiChamCard.js#L185-L196): chỉ gọi `fetchMinhChung` khi chưa có danh sách minh chứng nhúng sẵn.

**Đề xuất sửa:**
- §11.2, dòng Minh chứng: `POST chitiet/{ct}/minh-chung/file`, `DELETE minhchung/{id}`, `GET minhchung/{id}/tai-ve`.
- §11.2, thêm dòng: `Đọc phiếu năm kèm lịch sử | GET phieu/me/{nam}?kemLichSu=true&idDonVi=…`.
- §12, cột "Trang sử dụng" của `GET chitiet/{ct}/minh-chung`: ghi "thẩm định, chốt hồ sơ, lịch sử cá nhân, duyệt phiếu quý (khi DTO chưa nhúng minh chứng)".

---

## 6. "Chờ tôi chấm KPI đơn vị": mô tả thiếu, quyền thực tế khác tài liệu (đã xử lý)

**Tài liệu đang ghi (§6):**
> Hàng đợi phiếu đơn vị có dòng được giao cho mình; chấm/xác nhận theo quyền | TK, TKL, TP*, ADMIN | `GET phieu-don-vi?choToiCham=true`, `GET phieu-don-vi/{id}`, `PUT chi-tiet-don-vi/{ct}/diem-duyet-dv`, `POST phieu-don-vi/{id}/duyet-dv` …

**Thực tế trong mã nguồn:**
- **Trang có hai tab:**
  - "Chờ tôi chấm": gọi `GET phieu-don-vi` có `choToiCham=true`.
  - "Tất cả phiếu được xem" (`?tab=tat-ca`): gọi `GET phieu-don-vi` không có `choToiCham`.
- **Phần chi tiết luôn dùng component Khoa** (`ChiTietPhieuDonVi`), kể cả khi phiếu thuộc Phòng/Trung tâm. Quyền vì thế được tính bằng `quyenPhieuKhoa`, coi TKK là thư ký và TK/TKL là trưởng đơn vị. Hệ quả:
  - **TP*** mở phiếu Phòng ở trang này chấm được dòng khi trạng thái 2 và `DuocChamDuyetDv === true`, nhưng **không thấy nút duyệt cả phiếu** nếu không đồng thời giữ TK/TKL tại đúng đơn vị. TP* phải sang `/danh-gia-kpi-phong/:id` để duyệt theo vai trò trưởng Phòng.
  - **Chức vụ chính ADMIN** được `quyenPhieuDonVi` coi vừa là thư ký vừa là trưởng đơn vị: nhập/trình ở trạng thái 1, duyệt cấp đơn vị ở trạng thái 2. Tổng hợp KPI chạy tự động khi phiếu Khoa có dòng tự động; không có nút tổng hợp riêng.
  - Phiếu Phòng được hiển thị theo bố cục của phiếu Khoa.
- Do đó, API thực tế có thể được gọi từ trang này còn gồm `PUT chi-tiet-don-vi/{ct}/diem-nhap`, `POST phieu-don-vi/{id}/tong-hop-kpi` và `POST phieu-don-vi/{id}/submit`.

**Bằng chứng:**
- [src/pages/DanhGia/PhieuDonViChoCham.js:17](../src/pages/DanhGia/PhieuDonViChoCham.js#L17): đọc tab; dòng 26-30: query; dòng 74: nhúng `ChiTietPhieuDonVi`; dòng 91-110: hai tab.
- [src/pages/DanhGia/ChiTietPhieuDonVi.js:247](../src/pages/DanhGia/ChiTietPhieuDonVi.js#L247): `quyenPhieuKhoa`; dòng 251 và 259: `choPhepNhap`, `choPhepDuyet`; dòng 582, 741, 775: tổng hợp, trình, duyệt cấp đơn vị.
- [src/utils/phieuKhoaApi.js:40-44](../src/utils/phieuKhoaApi.js#L40-L44): trưởng đơn vị chỉ gồm TK/TKL.
- [src/utils/phieuDonViApi.js:380-381](../src/utils/phieuDonViApi.js#L380-L381): ADMIN được coi là thư ký và trưởng đơn vị; dòng 392-396: điều kiện nhập, trình, duyệt.

**Đề xuất sửa tài liệu:**
> Hai tab: "Chờ tôi chấm" (`choToiCham=true`) và "Tất cả phiếu được xem". Chi tiết chọn màn hình Khoa/Phòng theo `GET maudanhgia/{mau}.Item.LoaiDoiTuong` (3/4); thiếu mẫu hoặc loại khác thì báo lỗi, cho thử lại. Chấm từng dòng ở trạng thái 2 theo `DuocChamDuyetDv`; duyệt cả phiếu theo đúng vai trò trưởng Khoa/Phòng tại đơn vị. Chức vụ chính ADMIN giữ nhập/trình ở trạng thái 1 và duyệt đơn vị ở trạng thái 2; tổng hợp tự động chỉ với phiếu Khoa có dòng tự động. Hàng đợi không có thao tác cấp Trường.

**Đã xử lý:** [ChiTietPhieuDonViChoCham](../src/pages/DanhGia/ChiTietPhieuDonViChoCham.js) chọn đúng màn hình theo loại mẫu BE và chuyển phiếu đã đọc vào màn hình con để không đọc chi tiết hai lần khi mở. Giữ luật ADMIN hiện tại và giới hạn hàng đợi ở cấp đơn vị. Các hành động ghi vẫn cần backend chấp nhận.

---

## 7. "Ghi nhận phục vụ cộng đồng": thiếu thao tác kê khai/sửa/xóa và mở lại kỳ

**Tài liệu đang ghi (§8):**
> Xem nhiệm vụ, xét từng nhiệm vụ, tổng hợp/xuất Excel, đọc phản hồi lưu trữ và lịch sử

**Thực tế trong mã nguồn:**
- Có nút **"Kê khai nhiệm vụ"** ở tab Nhiệm vụ khi `canKeKhaiNhiemVu(ky)` đúng. Mỗi dòng có **sửa** (`canSuaNhiemVu`) và **xóa** (`canXoaNhiemVu`).
- Ở tab Tổng hợp có **mở lại kỳ đã chốt**, bắt buộc nhập lý do. FE chỉ xét `CanDuyet === true`; TLGVK không mở lại khi BE trả cờ false, có xét quyền tại đơn vị và kiêm nhiệm.
- Bộ API ở §11.5 đã liệt kê đúng các endpoint tương ứng, chỉ cột chức năng ở §8 bị thiếu.

**Bằng chứng:**
- [src/pages/QuanLyChamDiem/PhanCongNhiemVuKhoa.js:247-253](../src/pages/QuanLyChamDiem/PhanCongNhiemVuKhoa.js#L247-L253): nút "Kê khai nhiệm vụ".
- [src/components/QuanLyChamDiem/NvkPanelNhiemVu.js](../src/components/QuanLyChamDiem/NvkPanelNhiemVu.js): dòng 83 (mở form), 100 (xóa), 221 (sửa/xem), 247 (điều kiện xóa).
- [src/components/QuanLyChamDiem/NvkPanelTongHop.js:62](../src/components/QuanLyChamDiem/NvkPanelTongHop.js#L62) (`capNhatKy({ moLai: true, lyDo })`) và dòng 211 (`canDuyetKy`).

**Đề xuất sửa:**
> Xem nhiệm vụ; kê khai khi `CanKeKhai === true` và kỳ chưa chốt; sửa theo `ChoPhepSua`; xóa khi kỳ chưa chốt và (`ChoPhepSua === true` hoặc `CanDuyet === true`); xét từng nhiệm vụ; tổng hợp/xuất Excel; mở lại kỳ đã chốt (cần lý do, chỉ người có `CanDuyet`); đọc phản hồi lưu trữ và lịch sử.

---

## 8. §14.3: còn nhiều helper API chưa có giao diện gọi

**Tài liệu đang ghi (§14.3):** chỉ nêu helper `tongHopTuDong` (`POST phieu/{id}/tong-hop-tu-dong`).

**Thực tế trong mã nguồn:** tìm tên hàm trong `src/` (bỏ qua file test và chính file khai báo) thì các helper sau không có nơi gọi:

| Helper | Endpoint | Vị trí |
|---|---|---|
| `tongHopTuDong` | `POST phieu/{id}/tong-hop-tu-dong` | [src/utils/phieuApi.js:714](../src/utils/phieuApi.js#L714) (tài liệu đã nêu) |
| `fetchLichSuChamDiem` | `GET chitiet/{ct}/lich-su-cham-diem` | [src/utils/phieuApi.js:1145](../src/utils/phieuApi.js#L1145) |
| `fetchLichSuTrangThai` | `GET phieu/{id}/lich-su-trang-thai` | [src/utils/phieuApi.js:1173](../src/utils/phieuApi.js#L1173) |
| `addLinkMinhChungQuy` | `POST chitiet/{ct}/minh-chung/link` | [src/utils/phieuQuyApi.js:254](../src/utils/phieuQuyApi.js#L254) |
| `fetchMinhChungQuy` | `GET chitiet/{ct}/minh-chung` | [src/utils/phieuQuyApi.js:270](../src/utils/phieuQuyApi.js#L270) (xem mục 5) |
| `fetchMinhChungDonVi` | `GET chi-tiet-don-vi/{ct}/minh-chung` | [src/utils/minhChungDonViApi.js:247](../src/utils/minhChungDonViApi.js#L247) (§12 đã ghi chú một phần) |
| `layTongHopThanhTich` | `GET ke-khai-thanh-tich/tong-hop` | [src/utils/keKhaiThanhTichApi.js:625](../src/utils/keKhaiThanhTichApi.js#L625) |
| `layMinhChungNhiemVu` | `GET nhiem-vu-khoa/{id}/minh-chung` | [src/utils/nhiemVuKhoaApi.js:569](../src/utils/nhiemVuKhoaApi.js#L569) |
| `layLichSuNhiemVu` | `GET nhiem-vu-khoa/{id}/lich-su` | [src/utils/nhiemVuKhoaApi.js:653](../src/utils/nhiemVuKhoaApi.js#L653) |

**Đề xuất sửa:** thay gạch đầu dòng cuối của §14.3 bằng bảng 9 helper trên. Phân biệt helper chưa dùng với endpoint: `fetchMinhChungQuy` chưa dùng, nhưng cùng endpoint `GET chitiet/{ct}/minh-chung` vẫn được gọi qua `fetchMinhChung` ở các màn hình nêu trong mục 5. Chỉ mô tả thao tác có nút khi có giao diện gọi helper tương ứng.

---

## 9. Chi tiết nhỏ (tùy chọn)

1. **§1, quy ước "CRUD X":** lệnh xóa của ba module đào tạo, phát triển đội ngũ và đoàn thể gửi `DELETE X/{id}?lyDo=…`. API danh sách người nhập gửi `GET X/nguoi-nhap?baoGomDaThuHoi=…`.
   - [src/utils/hoatDongDaoTaoApi.js:30-31](../src/utils/hoatDongDaoTaoApi.js#L30-L31)
   - [src/utils/phatTrienDoiNguApi.js:33-34](../src/utils/phatTrienDoiNguApi.js#L33-L34)
   - [src/utils/thanhTichDoanTheApi.js:30](../src/utils/thanhTichDoanTheApi.js#L30)
2. **§3 Tổng quan:** dashboard Khoa gọi cả `GET to-trinh-khoa/{id}`, không chỉ `GET to-trinh-khoa` — [src/components/QuanLyChamDiem/TongQuanKhoa.js:128](../src/components/QuanLyChamDiem/TongQuanKhoa.js#L128).

---

## A. Hành vi điều hướng ngoài tài liệu (đã xử lý)

**Trước sửa: nút "Mở" trong Báo cáo đơn vị dẫn tới trang không có quyền.**
- Bảng "chưa hoàn tất" luôn hiện nút "Mở", điều hướng tới `/quan-ly/phieu/{id}`.
- Route này chỉ mở cho TK, TKL, TP*. Trong khi đó trang báo cáo còn mở cho HT, ADMIN, TKK, TKP.
- Kết quả trước khi sửa: HT/ADMIN/TKK/TKP không kiêm nhiệm TK/TKL/TP* bấm "Mở" sẽ bị route guard chặn. Nếu có kiêm nhiệm hợp lệ thì vào được trang đích.
- Bằng chứng: [src/pages/QuanLyChamDiem/BaoCaoDonVi.js:399-407](../src/pages/QuanLyChamDiem/BaoCaoDonVi.js#L399-L407) (nút không có điều kiện); [src/config/menuConfig.js:285-291](../src/config/menuConfig.js#L285-L291) và [src/config/menuConfig.js:370](../src/config/menuConfig.js#L370) (hai tập quyền).
- §12 của tài liệu đã có câu "quyền vào dashboard/báo cáo không tự cấp quyền mở hồ sơ của người khác". Đã sửa [BaoCaoDonVi](../src/pages/QuanLyChamDiem/BaoCaoDonVi.js): chỉ hiện nút khi `canAccessPath` của đúng đường dẫn phiếu cho phép, giữ nguyên quyền xem danh sách từ BE.

---

## Các phần đã đối chiếu và khớp (không cần kiểm tra lại)

- **Số lượng:**
  - 56 mục menu chia 8 nhóm, đúng số mục từng nhóm.
  - 14 trang mock: 13 trang ở nhóm "Phiếu KPI" và 1 trang ("[Mock] Cấu hình Admin") ở nhóm "Quản lý tiêu chí".
  - `AppRoutes.js` có 96 route (78 + 14 mock + 4 chuyển hướng), cộng `/login` là 97.
- **Quyền vào trang ở §3–§10:** khớp `src/utils/roles.js` và `src/config/menuConfig.js`. Đã kiểm cả các trường hợp đặc biệt:
  - TP* gồm TP, QTP, GD, VT; riêng trang tỷ lệ giờ giảng chỉ có TP.
  - Tập QTR gồm ADMIN, HT, PHT, TK, TBM và không có TKL.
  - Hai trang giám sát giảng dạy yêu cầu đơn vị 23, ADMIN được miễn.
  - Trang học vụ xét đơn vị `P_DTBDCL`.
  - Các trang hạng mục và ủy quyền dùng cờ `LaQuanLy` lấy từ `…/quyen`.
- **§13:** đủ 20 route chi tiết/alias, kế thừa đúng luật của mục cha.
- **§15:**
  - Điểm 1 và 2: trang chức vụ chỉ sửa state; trang cơ cấu đơn vị chỉ gọi `GET donvi`.
  - Điểm 4: hồ sơ GV gọi `gio-giang-import` tại `src/utils/phieuApi.js:1420`.
  - Điểm 5 (tập TP*) và điểm 7 (nút reset dùng `canManage`, trùng tập quyền với route): đều đúng.
- **§4:** điều kiện chuyển sang giao diện phiếu quý đúng như mô tả — `src/pages/DanhGia/DanhGiaNhanVien.js:78-82`.
- **§14.1:** các trang mock không gọi API.
- **Các trang còn lại:** API của các trang ở §3, §5, §7, §9, §10 và các bộ §11.1, §11.4, §11.5 khớp với lời gọi trong mã nguồn.

## Kiểm tra sau thay đổi ngày 04/10/2026

- Test tập trung: **9 bộ, 96/96 test đạt**, bao gồm hàng đợi, hai màn hình chi tiết, workspace/lịch sử, báo cáo, API phiếu và quyền route.
- Đã kiểm tra TP/QTP/GD/VT tại đúng Phòng duyệt được cả phiếu trong hàng đợi; người ở đơn vị khác chỉ chấm dòng được giao; ADMIN không có nút cấp Trường trong hàng đợi; thiếu/sai loại mẫu báo lỗi và có thể thử lại.
- Đã kiểm tra nút mở báo cáo cho TK/TKL/TP/QTP/GD/VT, ẩn cho HT/ADMIN/TKK/TKP không có kiêm nhiệm hợp lệ, và giữ trường hợp ADMIN kiêm nhiệm TP. Quyền xem danh sách vẫn lấy từ `CoQuyenXemDanhSach` của BE.
- `npm run build`: thành công, có cảnh báo lint ở các file ngoài phạm vi sửa, cảnh báo Browserslist cũ và kích thước bundle.
- `git diff --check`: không có lỗi khoảng trắng.
- Đây là kiểm tra mã nguồn, test với API mock và build; chưa có bằng chứng API thật, tài khoản thật hoặc thao tác trên trình duyệt đang đăng nhập.
