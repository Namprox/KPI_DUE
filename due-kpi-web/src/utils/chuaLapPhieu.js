/**
 * "Ai trong đơn vị chưa tự chấm KPI?" - câu hỏi mà nhóm API phiếu KHÔNG trả lời được.
 *
 * Phiếu chỉ được tạo khi giảng viên bấm lưu lần đầu (xem fetchPhieuCuaToi trong
 * phieuApi.js), nên người chưa mở phiếu bao giờ không có dòng nào trong
 * `phieu_danh_gia`. Mọi endpoint ở đây - /phieu, /phieu/khoa/pending,
 * /bao-cao/chua-hoan-tat - đều đọc từ bảng đó, vì vậy họ VÔ HÌNH với Trưởng khoa.
 *
 * Server không có endpoint nào liệt kê "người chưa lập phiếu", nên chỗ này ghép
 * ở client: lấy danh bạ nhân viên của đơn vị rồi trừ đi những người đã có phiếu.
 *
 * Hai rổ trả về khác nhau và đừng gộp:
 *  - `chuaLapPhieu` - chưa có dòng phiếu nào, không mở được màn hình phiếu.
 *  - `phieuNhap`    - đã lưu nhưng còn ở trạng thái 1, phiếu tồn tại và mở được.
 * Dưới góc nhìn Trưởng khoa cả hai đều là "chưa tự chấm xong", nhưng thao tác
 * tiếp theo với từng rổ hoàn toàn khác nhau.
 */

import { fetchAllNhanVien } from "./nhanVienApi";
import { LOAI_DOI_TUONG, TRANG_THAI } from "./phieuApi";
import { CHUC_DANH_SETS } from "./roles";

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

const CHUC_DANH_LOAI = new Map([
  ...CHUC_DANH_SETS.GIANG_VIEN.map((id) => [id, LOAI_DOI_TUONG.GIANG_VIEN]),
  ...CHUC_DANH_SETS.NHAN_VIEN.map((id) => [id, LOAI_DOI_TUONG.VIEN_CHUC]),
]);

/**
 * Ngạch nghề nghiệp → loại phiếu KPI người đó phải nộp.
 *
 * null = KHÔNG thuộc diện đánh giá KPI cá nhân (tài khoản quản trị, ngạch nằm
 * ngoài hai tập trong roles.js). Những người này phải bị loại khỏi danh sách
 * "chưa tự chấm": họ không có phiếu vì đúng ra không phải nộp, kể tên họ vào đây
 * là báo động giả.
 */
export const loaiDoiTuongTheoChucDanh = (nhanVien) => {
  const id = Number(nhanVien?.IdChucDanh);
  if (!Number.isFinite(id)) return null;
  return CHUC_DANH_LOAI.get(id) ?? null;
};

/**
 * Danh bạ những người PHẢI nộp phiếu KPI trong một phạm vi đơn vị.
 *
 * @param {boolean} baoGomDonViCon true khi phạm vi là cả cây đơn vị (khớp với
 *   phạm vi mặc định của GET /phieu ở cấp Khoa); false khi người dùng đã chọn
 *   đích danh một đơn vị, vì bộ lọc idDonVi của GET /phieu khớp chính xác.
 */
export const fetchNhanVienPhaiNopKpi = async ({
  idDonVi,
  baoGomDonViCon = true,
} = {}) => {
  if (!idDonVi) return [];
  const list = await fetchAllNhanVien({
    idDonVi,
    baoGomDonViCon,
    trangThai: true,
  });
  return list
    .map((nv) => ({ ...nv, LoaiDoiTuong: loaiDoiTuongTheoChucDanh(nv) }))
    .filter((nv) => nv.IdNhanVien != null && nv.LoaiDoiTuong != null);
};

/** Dòng hiển thị chung cho cả hai rổ, để các bảng dùng đúng một bộ trường. */
const dungDong = (nhanVien, phieu) => ({
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
 * Ghép danh bạ với danh sách phiếu.
 *
 * Đối chiếu theo IdNhanVien chứ không theo đơn vị của phiếu: một người có thể
 * vừa chuyển đơn vị sau khi đã nộp, phiếu cũ vẫn là phiếu của họ.
 */
export const tinhChuaTuCham = ({ nhanVienList = [], phieuList = [] } = {}) => {
  const phieuTheoNguoi = new Map();
  phieuList.forEach((p) => {
    if (p?.IdNhanVien != null) phieuTheoNguoi.set(Number(p.IdNhanVien), p);
  });

  const chuaLapPhieu = [];
  const phieuNhap = [];

  nhanVienList.forEach((nv) => {
    const phieu = phieuTheoNguoi.get(Number(nv.IdNhanVien));
    if (!phieu) {
      chuaLapPhieu.push(dungDong(nv, null));
      return;
    }
    if (Number(phieu.TrangThai) === TRANG_THAI.NHAP) {
      phieuNhap.push(dungDong(nv, phieu));
    }
  });

  chuaLapPhieu.sort(theoHoTen);
  phieuNhap.sort(theoHoTen);

  return { chuaLapPhieu, phieuNhap, tatCa: [...chuaLapPhieu, ...phieuNhap] };
};
