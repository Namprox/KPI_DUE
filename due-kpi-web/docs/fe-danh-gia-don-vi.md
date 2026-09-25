# Bàn giao Front-end — Luồng đánh giá KPI đơn vị (Khoa / Phòng)

Mô tả luồng **hiện tại** của phiếu đánh giá đơn vị để sửa màn hình FE. Khoa và Phòng/Trung tâm
dùng **chung một luồng, chung API**. Chỉ khác mẫu tiêu chí và ngưỡng xếp loại (backend lo).

**Thay đổi mới nhất** (mục 4): ở trạng thái 2, tiêu chí đã phân quyền trong
`tieu_chi_don_vi_cham` do **trưởng đơn vị được giao** chấm, không còn do Trưởng khoa/phòng
của phiếu chấm. Không có route mới. Chỉ thêm 1 query param, 4 field response và 1 mã lỗi 422.

JSON dùng **PascalCase** (`TrangThai`, `DiemDuyetDv`…). Mọi response có dạng
`{ Success, Message, Item | Items, ... }`. Nên hiển thị `Message` của backend khi lỗi.

---

## 1. Vai trò

| Mã chức vụ | Vai trò trong luồng |
|---|---|
| `TKK` / `TKP` | Thư ký Khoa/Phòng: tạo phiếu, nhập điểm, tổng hợp tự động, gửi |
| `TK` / `TKL` / `TP` của **đơn vị của phiếu** | Chấm tiêu chí **chưa phân quyền**, bấm **Duyệt** 2→3 |
| `TK` / `TKL` / `TP` của **đơn vị được giao** | Chấm tiêu chí **được giao** cho đơn vị mình (trạng thái 2) |
| `HT` | Chấm cấp trường, duyệt 3→4, chốt 4→5, mở lại |
| `ADMIN` | Làm được mọi thứ |

Một người có thể vừa là trưởng đơn vị của phiếu vừa là trưởng đơn vị được giao. Vì vậy
**đừng suy quyền từ chức vụ ở FE**, hãy dùng các cờ backend trả về (mục 3).

---

## 2. Trạng thái phiếu (`TrangThai`)

```
1 Đang nhập ──submit──► 2 Chờ duyệt cấp đơn vị ──duyet-dv──► 3 Chờ Trường
                                                                   │ duyet-truong
                                    5 Hoàn tất ◄──chot── 4 Trường đã duyệt
                                        │
                                        └──mo-lai──► 1 / 2 / 3   (HT, bắt buộc lý do)
```

Không có nút "Trả lại" ở trạng thái 2 và 3. Muốn quay lại thì phải chốt xong rồi Mở lại.

| TT | Ai làm gì | Điểm được sửa trên mỗi tiêu chí |
|---|---|---|
| 1 | TKK/TKP nhập điểm, bấm Tổng hợp KPI, thêm minh chứng, bấm Gửi | `DiemNhap` (chỉ tiêu chí `LoaiNguonDiem = 1`) |
| 2 | Trưởng đơn vị được giao chấm tiêu chí được giao; Trưởng đơn vị của phiếu chấm tiêu chí còn lại rồi bấm Duyệt | `DiemDuyetDv` |
| 3 | HT chấm (tùy chọn) rồi bấm Duyệt | `DiemTruong` |
| 4 | HT bấm Chốt (chọn xếp loại hoặc để hệ thống tự tính) | — |
| 5 | Chỉ xem; HT có thể Mở lại | — |

**Điểm hiển thị cho một tiêu chí** = giá trị đầu tiên khác null theo thứ tự
`DiemChinhThuc → DiemTruong → DiemDuyetDv → (LoaiNguonDiem = 2 ? DiemTongHop : DiemNhap)`.

`LoaiNguonDiem = 2` là tiêu chí tự động: ở trạng thái 1 **không cho nhập tay**, chỉ nút
"Tổng hợp KPI" mới điền `DiemTongHop`.

---

## 3. Màn hình chi tiết phiếu: FE dựa vào đâu để bật/tắt

Gọi `GET api/phieu-don-vi/{id}`. Backend trả sẵn các cờ tính theo **người đang xem**:

| Field | Ở đâu | Ý nghĩa / cách dùng |
|---|---|---|
| `CoPhanQuyen` | từng tiêu chí | `true`: tiêu chí đã giao cho đơn vị khác chấm ở cấp 2. Hiện badge. |
| `TenDonViCham` | từng tiêu chí | Tên các đơn vị được giao, nối bằng `", "`. Hiện dạng "Giao: Phòng Đào tạo…". `null` nếu chưa phân quyền. |
| `DuocChamDuyetDv` | từng tiêu chí | Người đang xem có được sửa `DiemDuyetDv` dòng này không. **Không xét trạng thái.** |
| `SoTieuChiGiaoChuaCham` | header | Số tiêu chí đã giao + nhập tay mà đơn vị được giao chưa chấm. `> 0` thì khóa nút Duyệt. |

**Luật bật ô nhập / nút:**

```
Ô DiemNhap        : TrangThai == 1 && LoaiNguonDiem == 1 && (người dùng là TKK/TKP của đơn vị phiếu)
Nút Tổng hợp KPI  : TrangThai == 1 && TKK/TKP
Nút Gửi           : TrangThai == 1 && TKK/TKP
Ô DiemDuyetDv     : TrangThai == 2 && DuocChamDuyetDv == true          ← dùng cờ, không tự suy
Nút Duyệt (2→3)   : TrangThai == 2 && là trưởng đơn vị CỦA PHIẾU && SoTieuChiGiaoChuaCham == 0
Ô DiemTruong, nút Duyệt trường : TrangThai == 3 && HT/ADMIN
Nút Chốt          : TrangThai == 4 && HT/ADMIN
Nút Mở lại        : TrangThai == 5 && HT/ADMIN
Thêm/xóa minh chứng : TrangThai == 1 && TKK/TKP
```

Nếu FE không chắc ai là "trưởng đơn vị của phiếu", cứ hiện nút Duyệt và để backend trả 403.
Riêng `SoTieuChiGiaoChuaCham > 0` thì nên khóa nút và ghi rõ
"Còn N tiêu chí chờ đơn vị được giao chấm".

---

## 4. Thay đổi mới: tiêu chí được giao cho đơn vị khác (trạng thái 2)

| Tiêu chí | Ai sửa `DiemDuyetDv` | Có chặn nút Duyệt nếu chưa chấm? |
|---|---|---|
| `CoPhanQuyen = true`, `LoaiNguonDiem = 1` | Trưởng đơn vị được giao | **Có** |
| `CoPhanQuyen = true`, `LoaiNguonDiem = 2` | Trưởng đơn vị được giao | Không. Không chấm thì giữ `DiemTongHop` |
| `CoPhanQuyen = false` | Trưởng đơn vị của phiếu | Không. Không chấm thì giữ điểm nguồn |

Hệ quả cho FE:

1. **Trưởng khoa/phòng của phiếu không sửa được tiêu chí đã giao**: ô bị khóa, gọi API sẽ bị 403.
   Họ vẫn là người bấm Duyệt.
2. **Trưởng đơn vị được giao** (ví dụ TP Phòng Đào tạo) nay **thấy phiếu của Khoa khác** trong
   danh sách, từ trạng thái 2 trở đi. Trên phiếu đó họ chỉ sửa được các dòng có
   `DuocChamDuyetDv = true`, không có nút Duyệt, không thêm/xóa được minh chứng nhưng **xem và tải**
   được minh chứng.
3. **Hàng đợi "Phiếu chờ tôi chấm"** (nên làm một tab/menu riêng):
   `GET api/phieu-don-vi?choToiCham=true` trả các phiếu ở trạng thái 2 còn tiêu chí được giao cho
   người dùng mà `DiemDuyetDv` đang null. Phiếu rời hàng đợi khi đã chấm hết hoặc phiếu lên
   trạng thái 3.
4. Mở lại về trạng thái 1 hoặc 2 sẽ xóa `DiemDuyetDv`, nên đơn vị được giao phải chấm lại.
   Phiếu sẽ tự quay lại hàng đợi.

Tiêu chí **tự động** được giao (ví dụ các tiêu chí học vụ giao Phòng Đào tạo): FE nên hiện
`DiemTongHop` làm giá trị gợi ý trong ô `DiemDuyetDv`, kèm nút "Xác nhận" (gửi đúng giá trị đó).

---

## 5. API

| Method & route | Body | Ghi chú |
|---|---|---|
| `GET api/phieu-don-vi` | query: `idNam, idDonVi, trangThai` (CSV, vd `"2,3"`), `page, pageSize, sortBy` (`ngay_tao`/`ngay_gui`), **`choToiCham`** (bool) | `Items[]` |
| `GET api/phieu-don-vi/{id}` | — | `Item` gồm header + `ChiTiet[]` (mỗi dòng có `MinhChung[]`) + `PheDuyet[]` |
| `POST api/phieu-don-vi` | `{ IdNam, IdDonVi, IdMau? }` | TKK/TKP. Bỏ `IdMau` để backend tự chọn mẫu |
| `POST api/phieu-don-vi/{id}/tong-hop-kpi` | query `baoGomDonViCon` (mặc định true) | TT 1. Trả `TongHop` (số liệu chẩn đoán) |
| `POST api/phieu-don-vi/{id}/submit` | `{ RowVersion, NhanXet? }` | 1→2 |
| `POST api/phieu-don-vi/{id}/duyet-dv` | `{ RowVersion, NhanXet? }` | 2→3 |
| `POST api/phieu-don-vi/{id}/duyet-truong` | `{ RowVersion, NhanXet? }` | 3→4 |
| `POST api/phieu-don-vi/{id}/chot` | `{ RowVersion, XepLoai?, NhanXet?, GhiChuXepLoai? }` | 4→5. `XepLoai` 1–4, bỏ trống = tự tính |
| `POST api/phieu-don-vi/{id}/mo-lai` | `{ RowVersion, TrangThaiMoi (1/2/3), LyDo, NhanXet? }` | 5→1/2/3 |
| `PUT api/chi-tiet-don-vi/{idChiTiet}/diem-nhap` | `{ Diem, NhanXet?, RowVersion? }` | TT 1 |
| `PUT api/chi-tiet-don-vi/{idChiTiet}/diem-duyet-dv` | như trên | TT 2 |
| `PUT api/chi-tiet-don-vi/{idChiTiet}/diem-truong` | như trên | TT 3 |
| `POST api/chi-tiet-don-vi/{idChiTiet}/minh-chung/file` · `/link` | multipart / json | TT 1, TKK/TKP |
| `GET api/chi-tiet-don-vi/{idChiTiet}/minh-chung` | — | |
| `GET api/minh-chung-don-vi/{idMinhChung}/tai-ve` | — | tải file |
| `DELETE api/minh-chung-don-vi/{idMinhChung}` | — | TT 1, TKK/TKP |

**RowVersion (chống ghi đè đồng thời):** header phiếu có `RowVersion` (base64). Gửi kèm mọi thao
tác chuyển trạng thái. Sau mỗi lần chấm điểm, response trả `NewRowVersion`; **phải cập nhật lại
RowVersion đang giữ**, nếu không thao tác kế tiếp sẽ bị 409.

---

## 6. Mã lỗi

| HTTP | Khi nào | FE xử lý |
|---|---|---|
| 400 | Dữ liệu sai (id, điểm âm, thiếu lý do…) | Hiện `Message` |
| 403 | Không có quyền, vd `"Tieu chi nay da duoc phan quyen cho don vi khac cham."` | Hiện `Message`, reload phiếu |
| 404 | Không tìm thấy hoặc ngoài phạm vi xem | |
| 409 | Sai trạng thái, hoặc RowVersion cũ (`"Phieu da bi nguoi khac cap nhat..."`) | Reload phiếu |
| 422 | Thiếu điểm. **Mới:** `"Con N tieu chi da phan quyen chua duoc don vi duoc giao cham."` khi bấm Duyệt | Hiện `Message`, đánh dấu các dòng `CoPhanQuyen && LoaiNguonDiem == 1 && DiemDuyetDv == null` |

---

## 7. Checklist sửa FE

- [ ] Danh sách phiếu: thêm tab/menu **"Chờ tôi chấm"** gọi `?choToiCham=true`.
- [ ] Chi tiết phiếu: hiện badge `TenDonViCham` ở các dòng `CoPhanQuyen = true`.
- [ ] Ô `DiemDuyetDv` bật theo `TrangThai == 2 && DuocChamDuyetDv`, **bỏ** logic cũ "là trưởng đơn vị thì mở hết".
- [ ] Tiêu chí tự động được giao: điền sẵn `DiemTongHop`, có nút Xác nhận.
- [ ] Nút Duyệt 2→3: khóa khi `SoTieuChiGiaoChuaCham > 0`, hiện "Còn N tiêu chí chờ đơn vị được giao chấm".
- [ ] Xử lý lỗi 422 mới của `duyet-dv`.
- [ ] Người xem là đơn vị được giao: ẩn nút Duyệt, ẩn thêm/xóa minh chứng, giữ nút xem/tải minh chứng.
- [ ] Sau mỗi `PUT .../diem-*`, cập nhật `RowVersion` từ `NewRowVersion`.
