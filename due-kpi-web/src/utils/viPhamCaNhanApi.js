/**
 * Vi phạm của CHÍNH người đăng nhập — lớp đọc cho màn hình cá nhân.
 *
 * Dùng lại GET /viphamgiangday (xem docs/openapi.yaml): endpoint tự thu hẹp phạm
 * vi theo vai trò trong token — "nguoi dung khac chi xem vi pham cua chinh minh".
 * Vì vậy màn hình cá nhân KHÔNG gửi idNhanVien: người dùng thường gửi id của
 * người khác cũng không lấy được gì, còn TK/TP/Admin mà gửi id của mình thì lại
 * đúng ý; để trống là cách duy nhất cho ra "vi phạm của tôi" với mọi vai trò.
 *
 * Không có endpoint tổng hợp riêng cho cá nhân: /vi-pham/tong-hop-giang-vien là
 * bảng của người quản lý (openapi không nói nó mở cho giảng viên thường), nên
 * phần tóm tắt được cộng tại client theo đúng công thức đã ghi trong tài liệu:
 * DiemTruCaNhan = MIN(tổng điểm trừ trong năm, 15).
 */

import { apiFetch } from './api';
import { readApiError } from './apiError';
import { parseNgay } from './phieuApi';

/** Trần điểm trừ vi phạm của một cá nhân trong một năm (theo API tổng hợp). */
export const TRAN_DIEM_TRU_CA_NHAN = 15;

/**
 * Danh sách vi phạm của người đăng nhập trong một năm.
 * @param {{idNam?: number|string}} params
 * @returns {Promise<object[]>} ViPhamGiangDayDto[]
 */
export const fetchViPhamCuaToi = async ({ idNam } = {}) => {
  const qs = idNam ? `?idNam=${encodeURIComponent(idNam)}` : '';
  const response = await apiFetch(`viphamgiangday${qs}`);

  if (!response.ok) {
    const info = await readApiError(response, 'Không tải được danh sách vi phạm');
    const error = new Error(info.message);
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  return result.Items || (Array.isArray(result) ? result : []);
};

const soHoacKhong = (value) => {
  const so = Number(value);
  return Number.isFinite(so) ? so : 0;
};

/**
 * Tóm tắt điểm trừ của một năm.
 *
 * Trả cả điểm thô lẫn điểm sau trần để màn hình nói rõ khi người dùng đã chạm
 * trần — nếu chỉ hiện số sau trần, họ sẽ tưởng bảng bên dưới cộng sai.
 */
export const tongHopViPham = (danhSach = []) => {
  const tongDiemTruTho = danhSach.reduce(
    (tong, vp) => tong + soHoacKhong(vp.DiemTru),
    0
  );
  return {
    soViPham: danhSach.length,
    soBiKyLuat: danhSach.filter((vp) => vp.BiKyLuat).length,
    tongDiemTruTho,
    diemTruCaNhan: Math.min(tongDiemTruTho, TRAN_DIEM_TRU_CA_NHAN),
    chamTran: tongDiemTruTho > TRAN_DIEM_TRU_CA_NHAN,
  };
};

/** Gom theo nhóm vi phạm, sắp giảm dần theo điểm trừ để nhóm nặng nhất lên đầu. */
export const nhomTheoNhomViPham = (danhSach = []) => {
  const map = new Map();
  danhSach.forEach((vp) => {
    // Bản ghi cũ có thể chưa gắn loại vi phạm (IdLoaiViPham null) nên không có nhóm
    const ten = vp.TenNhom || 'Chưa phân loại';
    const cu = map.get(ten) || { tenNhom: ten, soViPham: 0, diemTru: 0 };
    cu.soViPham += 1;
    cu.diemTru += soHoacKhong(vp.DiemTru);
    map.set(ten, cu);
  });
  return [...map.values()].sort((a, b) => b.diemTru - a.diemTru);
};

/** Mới nhất lên đầu: ưu tiên ngày vi phạm, thiếu thì lấy ngày ghi nhận. */
export const sapXepMoiNhat = (danhSach = []) => {
  const moc = (vp) => {
    const d = parseNgay(vp.NgayViPham) || parseNgay(vp.NgayGhiNhan);
    return d ? d.getTime() : 0;
  };
  return [...danhSach].sort((a, b) => moc(b) - moc(a));
};
