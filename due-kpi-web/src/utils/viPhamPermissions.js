/**
 * Quy tắc phân quyền cho module Quản lý vi phạm giảng viên.
 *
 * Quyền ghi nhận 1 loại vi phạm = HỢP của 3 nguồn:
 *   (a) loai.DonViGhiNhan[] chứa đơn vị của người ghi
 *   (b) loai.ChoPhepKhoaChuQuan = true và người ghi là trưởng Khoa chủ quản của giảng viên
 *   (c) loai.ChoPhepMoiDonVi   = true (bất kỳ trưởng đơn vị nào)
 *
 * Đây chỉ là lớp gợi ý cho UI. Server vẫn chặn lại ở BLL + Stored Procedure.
 */

import { normalizeRole } from './roles';

const ROLE_TRUONG_DON_VI = ['TK', 'TKL', 'TP'];

/** Re-export để các file đang import normalizeRole từ đây vẫn chạy. */
export { normalizeRole };

export const isAdminRole = (user) => normalizeRole(user) === 'ADMIN';

/** Trưởng Khoa / Trưởng Khoa lớn / Trưởng Phòng — nhóm được ghi nhận vi phạm. */
export const isTruongDonVi = (user) => {
  if (ROLE_TRUONG_DON_VI.includes(normalizeRole(user))) return true;
  if (user?.DonVi && Array.isArray(user.DonVi)) {
    return user.DonVi.some((d) =>
      ROLE_TRUONG_DON_VI.includes(String(d.MaChucVu || '').trim().toUpperCase())
    );
  }
  return false;
};

/** Cấp Trường — chỉ được XEM toàn bộ, không nằm trong nhóm ghi nhận. */
export const isCapTruong = (user) => ['HT', 'PHT'].includes(normalizeRole(user));

/** Có được phép ghi nhận vi phạm (gate chức vụ, chưa xét đơn vị) hay không. */
export const canRecordViPham = (user) => isAdminRole(user) || isTruongDonVi(user);

/** Xem được màn hình tổng hợp điểm trừ Khoa của mọi Khoa. */
export const canXemMoiKhoa = (user) =>
  isAdminRole(user) || isCapTruong(user) || isTruongDonVi(user);

/* ------------------------------------------------------------------ */
/* Cây đơn vị                                                          */
/* ------------------------------------------------------------------ */

/** cap_don_vi: 1 = Trường, 2 = Khoa/Phòng, 3 = Bộ môn */
export const CAP_KHOA_PHONG = 2;

export const buildDonViIndex = (donViList = []) => {
  const map = new Map();
  donViList.forEach((dv) => {
    if (dv && dv.IdDonVi != null) map.set(dv.IdDonVi, dv);
  });
  return map;
};

/**
 * Đi ngược IdDonViCha để tìm Khoa/Phòng chủ quản (CapDonVi = 2).
 * Giảng viên có thể nằm ở Bộ môn con của Khoa nên phải roll-up.
 */
export const resolveKhoaCuaNhanVien = (idDonVi, donViIndex) => {
  if (idDonVi == null || !donViIndex) return null;
  let current = donViIndex.get(idDonVi);
  const seen = new Set();
  let hop = 0;
  while (current && hop < 5) {
    if (current.CapDonVi === CAP_KHOA_PHONG) return current;
    if (seen.has(current.IdDonVi)) return null; // chống vòng lặp dữ liệu bẩn
    seen.add(current.IdDonVi);
    if (current.IdDonViCha == null) return null;
    current = donViIndex.get(current.IdDonViCha);
    hop += 1;
  }
  return null;
};

/**
 * Có phải Khoa hay không.
 * Lưu ý: quy tắc gốc là SQL `ma_don_vi LIKE 'K_%'`, trong đó `_` là wildcard 1 ký tự
 * => nghĩa là "bắt đầu bằng K", không phải "bắt đầu bằng chuỗi K_".
 * Repo tồn tại 2 quy ước dấu phân cách (P_QLCL và P.KT) nên chỉ so ký tự đầu.
 */
export const laDonViKhoa = (donVi) =>
  !!donVi &&
  donVi.CapDonVi === CAP_KHOA_PHONG &&
  String(donVi.MaDonVi || '').trim().toUpperCase().startsWith('K');

/**
 * Màn hình "Thống kê vi phạm theo Khoa" chỉ dành cho Trưởng Khoa / Trưởng Khoa
 * lớn: mỗi người xem đúng Khoa mình phụ trách, không có lựa chọn Khoa khác.
 * Cấp Trường xem số liệu toàn trường ở màn hình tổng hợp.
 */
export const canXemThongKeKhoa = (user) => {
  if (['TK', 'TKL'].includes(normalizeRole(user))) return true;
  if (user?.DonVi && Array.isArray(user.DonVi)) {
    return user.DonVi.some((d) =>
      ['TK', 'TKL'].includes(String(d.MaChucVu || '').trim().toUpperCase())
    );
  }
  return false;
};

/**
 * Khoa mà người dùng đang phụ trách — nguồn duy nhất xác định phạm vi dữ liệu của
 * màn hình thống kê Khoa (không nhận idDonVi từ URL hay dropdown).
 *
 * Trả null khi: không phải Trưởng Khoa, hoặc đơn vị của họ không roll-up ra Khoa nào.
 * Đây chỉ là lớp gợi ý cho UI — server vẫn kiểm tra lại theo token.
 */
export const resolveKhoaCuaToi = (user, donViList = []) => {
  if (!canXemThongKeKhoa(user)) return null;
  const donViIndex = buildDonViIndex(donViList);
  if (user?.DonVi && Array.isArray(user.DonVi)) {
    for (const d of user.DonVi) {
      if (['TK', 'TKL'].includes(String(d.MaChucVu || '').trim().toUpperCase())) {
        const k = resolveKhoaCuaNhanVien(d.IdDonVi, donViIndex);
        if (laDonViKhoa(k)) return k;
      }
    }
  }
  const khoa = resolveKhoaCuaNhanVien(user?.IdDonVi, donViIndex);
  return laDonViKhoa(khoa) ? khoa : null;
};

/* ------------------------------------------------------------------ */
/* Đối tượng bị ghi nhận: phải là GIẢNG VIÊN thuộc KHOA                */
/* ------------------------------------------------------------------ */

/**
 * Server chỉ cho ghi nhận vi phạm của giảng viên thuộc Khoa
 * (view v_giang_vien_khoa — chuc_danh_nghe_nghiep.ma_chuc_danh trong tập này).
 * Sai đối tượng → 403 NOT_GIANG_VIEN_KHOA.
 */
export const MA_CHUC_DANH_GIANG_VIEN = ['GV', 'GVC', 'GVCC', 'PGS', 'GS'];

export const buildChucDanhIndex = (chucDanhList = []) => {
  const map = new Map();
  chucDanhList.forEach((cd) => {
    if (cd && cd.IdChucDanh != null) map.set(cd.IdChucDanh, cd);
  });
  return map;
};

/**
 * NhanVienListItemDto chỉ có IdChucDanh/TenChucDanh (không có MaChucDanh)
 * nên phải tra mã qua danh mục chuc-danh-nghe-nghiep.
 * Nếu danh mục chưa nạp được thì KHÔNG chặn — nhường quyết định cho server,
 * tránh việc lỗi 1 endpoint lookup làm rỗng toàn bộ dropdown giảng viên.
 */
export const laGiangVien = (nhanVien, chucDanhIndex) => {
  if (!nhanVien) return false;
  if (!chucDanhIndex || chucDanhIndex.size === 0) return true;
  if (nhanVien.IdChucDanh == null) return false;
  const cd = chucDanhIndex.get(nhanVien.IdChucDanh);
  if (!cd) return false;
  return MA_CHUC_DANH_GIANG_VIEN.includes(String(cd.MaChucDanh || '').trim().toUpperCase());
};

/** Đủ điều kiện bị ghi nhận vi phạm: vừa là giảng viên, vừa thuộc một Khoa. */
export const laGiangVienKhoa = (nhanVien, donViIndex, chucDanhIndex) =>
  laGiangVien(nhanVien, chucDanhIndex) &&
  laDonViKhoa(resolveKhoaCuaNhanVien(nhanVien?.IdDonVi, donViIndex));

/** Trả null nếu hợp lệ, ngược lại trả lý do tiếng Việt để hiển thị. */
export const getNhanVienBlockReason = (nhanVien, donViIndex, chucDanhIndex) => {
  if (!nhanVien) return null;
  if (!laGiangVien(nhanVien, chucDanhIndex)) {
    const ten = nhanVien.TenChucDanh ? ` (chức danh: ${nhanVien.TenChucDanh})` : '';
    return `${nhanVien.HoTen || 'Người này'} không có chức danh giảng viên${ten} — máy chủ sẽ từ chối ghi nhận.`;
  }
  if (!laDonViKhoa(resolveKhoaCuaNhanVien(nhanVien.IdDonVi, donViIndex))) {
    return `${nhanVien.HoTen || 'Người này'} không thuộc Khoa nào — chỉ ghi nhận được vi phạm của giảng viên thuộc Khoa.`;
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Quyền sửa / xóa một ghi nhận đã có                                  */
/* ------------------------------------------------------------------ */

/**
 * Server: "chỉ đơn vị đã ghi nhận hoặc ADMIN" (PUT/DELETE trả FORBIDDEN_DON_VI).
 * So theo id_don_vi_ghi_nhan đã snapshot trên bản ghi, không so người ghi.
 */
export const canSuaXoaViPham = (item, user) => {
  if (!item) return false;
  if (isAdminRole(user)) return true;
  if (!isTruongDonVi(user)) return false;
  if (item.IdDonViGhiNhan == null || user?.IdDonVi == null) return false;
  return String(item.IdDonViGhiNhan) === String(user.IdDonVi);
};

/* ------------------------------------------------------------------ */
/* Quyền ghi nhận theo từng loại vi phạm                               */
/* ------------------------------------------------------------------ */

/**
 * @param {object} loai      LoaiViPhamDto
 * @param {object} user      người dùng hiện tại (từ auth/me)
 * @param {object} lecturer  giảng viên đang được chọn (NhanVienListItemDto) — cần cho nhánh (b)
 * @param {Map}    donViIndex
 */
export const canGhiNhanLoai = (loai, user, lecturer, donViIndex) => {
  if (!loai) return false;
  if (isAdminRole(user)) return true;
  if (!isTruongDonVi(user)) return false;

  // (a) đơn vị cố định được phân quyền
  if ((loai.DonViGhiNhan || []).some((d) => d.IdDonVi === user?.IdDonVi)) return true;

  // (c) mọi đơn vị chủ trì
  if (loai.ChoPhepMoiDonVi === true) return true;

  // (b) trưởng Khoa chủ quản của chính giảng viên đó
  if (loai.ChoPhepKhoaChuQuan === true && lecturer) {
    const khoa = resolveKhoaCuaNhanVien(lecturer.IdDonVi, donViIndex);
    if (khoa && khoa.IdDonVi === user?.IdDonVi) return true;
  }

  return false;
};

/** Trả null nếu được phép, ngược lại trả lý do tiếng Việt để hiển thị cạnh option bị khóa. */
export const getLoaiBlockReason = (loai, user, lecturer, donViIndex) => {
  if (canGhiNhanLoai(loai, user, lecturer, donViIndex)) return null;
  if (!canRecordViPham(user)) {
    return 'Chỉ trưởng đơn vị (TK/TKL/TP) hoặc Admin mới được ghi nhận vi phạm.';
  }
  if (loai?.ChoPhepKhoaChuQuan === true && !lecturer) {
    return 'Loại vi phạm này do Khoa chủ quản ghi nhận — hãy chọn giảng viên trước.';
  }
  const dsDonVi = (loai?.DonViGhiNhan || []).map((d) => d.MaDonVi).filter(Boolean);
  if (dsDonVi.length > 0) {
    return `Loại vi phạm này chỉ được ghi nhận bởi: ${dsDonVi.join(', ')}.`;
  }
  return 'Đơn vị của bạn không được phân quyền ghi nhận loại vi phạm này.';
};
