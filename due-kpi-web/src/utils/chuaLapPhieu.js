/**
 * Người chưa lập phiếu lấy từ báo cáo backend, không đối chiếu danh bạ nhân viên.
 *
 * Hai rổ trả về khác nhau và đừng gộp:
 *  - `chuaLapPhieu` - chưa có dòng phiếu nào, không mở được màn hình phiếu.
 *  - `phieuNhap`    - đã lưu nhưng còn ở trạng thái 1, phiếu tồn tại và mở được.
 * Dưới góc nhìn Trưởng khoa cả hai đều là "chưa tự chấm xong", nhưng thao tác
 * tiếp theo với từng rổ hoàn toàn khác nhau.
 */

import { fetchBaoCaoChuaLapPhieu, LOAI_DOI_TUONG, TRANG_THAI } from "./phieuApi";

/**
 * Trạng thái ẢO cho người chưa lập phiếu.
 *
 * CỐ Ý không nhét vào TRANG_THAI_META: bảng đó được duyệt bằng Object.entries để
 * dựng thẻ thống kê và dải chip lọc, thêm khóa 0 vào sẽ đẻ ra một "trạng thái
 * phiếu" không tồn tại trong DB ở khắp nơi. Số 0 chỉ là sentinel phía client.
 */
export const TRANG_THAI_CHUA_LAP = 0;

export const TRANG_THAI_CHUA_LAP_META = {
  label: "Chưa lập phiếu",
  icon: "fa-user-slash",
  bg: "#fef2f2",
  color: "#b91c1c",
  border: "#fecaca",
};

/**
 * Loại đối tượng do backend trả trên bản ghi nhân viên.
 *
 * null = backend chưa cung cấp loại đối tượng nên không đưa vào danh sách cần
 * nộp; không suy đoán từ chức danh.
 */
export const loaiDoiTuongNhanVien = (nhanVien) =>
  nhanVien?.LoaiDoiTuong === LOAI_DOI_TUONG.GIANG_VIEN ||
  nhanVien?.LoaiDoiTuong === LOAI_DOI_TUONG.VIEN_CHUC
    ? nhanVien.LoaiDoiTuong
    : null;

/**
 * Báo cáo phân trang, idDonVi có phạm vi cây đơn vị do backend quyết định.
 * Bộ lọc idDonViLoc trên màn phiếu chọn chính xác đơn vị, nên thu hẹp các dòng
 * báo cáo đã được server cho phép xem theo IdDonVi, không suy phân loại người.
 */
export const fetchDanhSachChuaLapPhieu = async ({
  idNam, idDonVi, idDonViLoc,
} = {}) => {
  if (!idNam) return [];
  const list = [];
  let page = 1;
  let totalCount;
  do {
    const data = await fetchBaoCaoChuaLapPhieu({ idNam, idDonVi, quy: 0, page, pageSize: 100 });
    list.push(...data.Items);
    totalCount = data.TotalCount;
    if (data.Items.length === 0 && list.length < totalCount) {
      throw new Error("Danh sách chưa lập phiếu đã thay đổi. Vui lòng tải lại.");
    }
    page += 1;
  } while (list.length < totalCount);
  return idDonViLoc
    ? list.filter((row) => Number(row.IdDonVi) === Number(idDonViLoc))
    : list;
};

/** Dòng hiển thị chung cho cả hai rổ, để các bảng dùng đúng một bộ trường. */
const dungDong = (nhanVien, phieu) => ({
  ...nhanVien,
  key: phieu ? `phieu-${phieu.IdPhieu}` : `nv-${nhanVien.IdNhanVien}`,
  IdNhanVien: Number(nhanVien.IdNhanVien),
  IdPhieu: phieu?.IdPhieu ?? null,
  TrangThai: phieu ? Number(phieu.TrangThai) : TRANG_THAI_CHUA_LAP,
  LoaiDoiTuong: phieu?.LoaiDoiTuong ?? nhanVien.LoaiDoiTuong,
  NgayTao: phieu?.NgayTao ?? null,
  HoTen: nhanVien.HoTen || "",
  MaNhanVien: nhanVien.MaNhanVien || "",
  TenDonVi: nhanVien.TenDonVi || "",
  TenChucDanh: nhanVien.TenChucDanh || "",
});

const theoHoTen = (a, b) =>
  String(a.HoTen).localeCompare(String(b.HoTen), "vi");

/**
 * Giữ danh sách chưa lập của server; phiếu nháp lấy trực tiếp từ API phiếu.
 */
export const tinhChuaTuCham = ({ chuaLapList = [], phieuList = [] } = {}) => {
  const chuaLapPhieu = chuaLapList.map((row) => dungDong(row, null));
  const phieuNhap = phieuList
    .filter((p) => Number(p.TrangThai) === TRANG_THAI.NHAP)
    .map((p) => dungDong(p, p));

  chuaLapPhieu.sort(theoHoTen);
  phieuNhap.sort(theoHoTen);

  return { chuaLapPhieu, phieuNhap, tatCa: [...chuaLapPhieu, ...phieuNhap] };
};
