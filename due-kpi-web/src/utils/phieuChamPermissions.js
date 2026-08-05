/**
 * "Ô nhập điểm của tiêu chí này có được mở cho tôi không?"
 *
 * Quy tắc server (PUT api/chitiet/{id}/diem-khoa):
 *  - Tiêu chí CÓ dòng trong `tieu_chi_don_vi_cham` → chỉ trưởng (TK/TKL/TP) của
 *    đúng các đơn vị đó được chấm.
 *  - Tiêu chí KHÔNG có dòng nào → mặc định trưởng đơn vị chủ quản của phiếu
 *    (hoặc đơn vị cha) được chấm.
 *
 * Đây CHỈ là lớp gợi ý UI để disable ô nhập thay vì để người dùng gõ xong mới
 * ăn 403. Server vẫn kiểm tra lại — không được coi đây là hàng rào bảo mật.
 */

import { normalizeRole } from './roles';
import { buildDonViIndex } from './viPhamPermissions';
import { TRANG_THAI, laTieuChiChamTay } from './phieuApi';

const ROLE_TRUONG_DON_VI = ['TK', 'TKL', 'TP'];

export const laTruongDonVi = (user) => ROLE_TRUONG_DON_VI.includes(normalizeRole(user));

/**
 * `idCha` có phải chính nó hoặc tổ tiên của `idCon` không (đi ngược IdDonViCha).
 * Giới hạn 6 bước để dữ liệu bẩn tạo vòng lặp không treo trình duyệt.
 */
export const laDonViChaHoacChinhNo = (idCha, idCon, donViIndex) => {
  if (idCha == null || idCon == null) return false;
  if (String(idCha) === String(idCon)) return true;
  if (!donViIndex) return false;

  let current = donViIndex.get(Number(idCon)) || donViIndex.get(idCon);
  const seen = new Set();
  let hop = 0;
  while (current && hop < 6) {
    if (seen.has(current.IdDonVi)) return false;
    seen.add(current.IdDonVi);
    if (current.IdDonViCha == null) return false;
    if (String(current.IdDonViCha) === String(idCha)) return true;
    current = donViIndex.get(current.IdDonViCha);
    hop += 1;
  }
  return false;
};

/**
 * Gom danh sách phân quyền phẳng thành Map(idTieuChi → Set(idDonVi)).
 * @param {object[]} rows TieuChiDonViChamDto[] lấy theo idMau của phiếu
 */
export const buildPhanQuyenChamIndex = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!row || row.IdTieuChi == null) return;
    const key = Number(row.IdTieuChi);
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(Number(row.IdDonVi));
  });
  return map;
};

/**
 * Tôi có được chấm tiêu chí này không (chưa xét trạng thái phiếu).
 *
 * @param {object} chiTiet   ChiTietDanhGiaDto
 * @param {object} ctx
 * @param {object} ctx.user       người đăng nhập
 * @param {object} ctx.phieu      phiếu đang mở (cần IdDonVi = đơn vị chủ quản)
 * @param {Map}    ctx.phanQuyen  Map(idTieuChi → Set(idDonVi))
 * @param {Map}    ctx.donViIndex Map(idDonVi → DonViDto)
 */
export const duocChamTieuChi = (chiTiet, { user, phieu, phanQuyen, donViIndex }) => {
  if (!chiTiet || !user || !laTruongDonVi(user)) return false;
  if (user.IdDonVi == null) return false;

  const daPhanQuyen = phanQuyen?.get(Number(chiTiet.IdTieuChi));
  if (daPhanQuyen && daPhanQuyen.size > 0) {
    return daPhanQuyen.has(Number(user.IdDonVi));
  }

  // Không phân quyền riêng → đơn vị chủ quản phiếu (hoặc đơn vị cha) chấm.
  return laDonViChaHoacChinhNo(user.IdDonVi, phieu?.IdDonVi, donViIndex);
};

/**
 * Ô nhập điểm mở khi: phiếu đang ở bước đơn vị chấm, tiêu chí chấm tay, và tôi
 * được giao tiêu chí đó.
 */
export const oNhapDiemMo = (chiTiet, ctx) =>
  ctx?.phieu?.TrangThai === TRANG_THAI.DON_VI_CHAM &&
  laTieuChiChamTay(chiTiet) &&
  duocChamTieuChi(chiTiet, ctx);

/** Lý do tiếng Việt để hiện cạnh ô bị khóa — giúp người dùng khỏi đoán. */
export const lyDoKhoaONhap = (chiTiet, ctx) => {
  if (!laTieuChiChamTay(chiTiet)) {
    return 'Tiêu chí này do hệ thống tính điểm tự động, không chấm tay.';
  }
  if (ctx?.phieu?.TrangThai !== TRANG_THAI.DON_VI_CHAM) {
    return 'Phiếu không ở bước đơn vị chấm nên mọi ô nhập đều bị khóa.';
  }
  if (!laTruongDonVi(ctx?.user)) {
    return 'Chỉ trưởng đơn vị (TK/TKL/TP) mới được chấm điểm cấp đơn vị.';
  }
  return 'Tiêu chí này được giao cho đơn vị khác chấm.';
};

/** Dựng sẵn context dùng chung cho cả màn hình chấm. */
export const buildChamContext = ({ user, phieu, phanQuyenRows, donViList }) => ({
  user,
  phieu,
  phanQuyen: buildPhanQuyenChamIndex(phanQuyenRows),
  donViIndex: buildDonViIndex(donViList),
});

/**
 * Tiến độ chấm: đếm trên tiêu chí CHẤM TAY.
 * `cuaToi` = phần việc của đơn vị đang đăng nhập; `toanPhieu` = mọi đơn vị —
 * phiếu chỉ tự lên HT khi `toanPhieu` đủ, nên cần hiện cả hai.
 */
export const tinhTienDoCham = (chiTietList = [], ctx) => {
  const chamTay = chiTietList.filter(laTieuChiChamTay);
  const cuaToi = chamTay.filter((ct) => duocChamTieuChi(ct, ctx));
  const daCham = (list) => list.filter((ct) => ct.DiemKhoa != null).length;

  return {
    toanPhieu: { tong: chamTay.length, xong: daCham(chamTay) },
    cuaToi: { tong: cuaToi.length, xong: daCham(cuaToi) },
  };
};
