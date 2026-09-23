/**
 * Phần phân quyền / kiểm tra dữ liệu ĐẶC THÙ của màn hình ghi nhận vi phạm
 * VIÊN CHỨC - NGƯỜI LAO ĐỘNG (LoaiDoiTuong = 2).
 *
 * Máy chủ dùng CHUNG bộ endpoint api/viphamgiangday cho cả hai đối tượng, nên
 * mọi quy tắc không phụ thuộc đối tượng (ai được ghi nhận, ai được sửa/xóa, cây
 * đơn vị) vẫn lấy nguyên từ viPhamPermissions.js - đừng khai lại ở đây.
 *
 * Chỗ khác nhau chỉ có hai:
 *   1. ĐỐI TƯỢNG hợp lệ là ngạch viên chức / NLĐ, không phải giảng viên thuộc Khoa
 *      (sai tập -> 403 NOT_VIEN_CHUC).
 *   2. Mức điểm trừ bị ràng buộc bởi CheDoDiemTru của danh mục loại vi phạm.
 */

import { LOAI_DOI_TUONG } from "./phieuApi";
import { loaiDoiTuongNhanVien } from "./chuaLapPhieu";
import { canGhiNhanLoai, canRecordViPham } from "./viPhamPermissions";

/** Giá trị LoaiDoiTuong của dòng vi phạm / danh mục thuộc về màn hình này. */
export const LOAI_DOI_TUONG_VIEN_CHUC = LOAI_DOI_TUONG.VIEN_CHUC;

/* ------------------------------------------------------------------ */
/* Đối tượng bị ghi nhận: VIÊN CHỨC / NLĐ                              */
/* ------------------------------------------------------------------ */

/**
 * Loại viên chức / NLĐ đọc từ LoaiDoiTuong do backend trả trên bản ghi nhân viên.
 *
 * Khác với giảng viên, đối tượng này KHÔNG bị ràng buộc phải thuộc Khoa: nhân
 * viên văn phòng Khoa cũng nằm trong tập của máy chủ.
 */
export const laVienChuc = (nhanVien) =>
  loaiDoiTuongNhanVien(nhanVien) === LOAI_DOI_TUONG.VIEN_CHUC;

/** Trả null nếu hợp lệ, ngược lại trả lý do tiếng Việt để hiển thị. */
export const getVienChucBlockReason = (nhanVien) => {
  if (!nhanVien) return null;
  if (laVienChuc(nhanVien)) return null;
  const ten = nhanVien.TenChucDanh ? ` (chức danh: ${nhanVien.TenChucDanh})` : "";
  return `${nhanVien.HoTen || "Người này"} không thuộc ngạch viên chức / người lao động${ten} - máy chủ sẽ từ chối ghi nhận.`;
};

/* ------------------------------------------------------------------ */
/* Quyền ghi nhận theo từng loại vi phạm                               */
/* ------------------------------------------------------------------ */

/**
 * Cùng luật với giảng viên (xem canGhiNhanLoai), chỉ đổi từ ngữ: đơn vị chủ
 * quản của viên chức có thể là Phòng chứ không riêng Khoa.
 */
export const getLoaiBlockReasonNhanVien = (
  loai,
  user,
  nhanVien,
  donViIndex,
) => {
  if (canGhiNhanLoai(loai, user, nhanVien, donViIndex)) return null;
  if (!canRecordViPham(user)) {
    return "Chỉ trưởng đơn vị (TK/TKL/TP) hoặc Admin mới được ghi nhận vi phạm.";
  }
  if (loai?.ChoPhepKhoaChuQuan === true && !nhanVien) {
    return "Loại vi phạm này do đơn vị chủ quản ghi nhận - hãy chọn nhân viên trước.";
  }
  const dsDonVi = (loai?.DonViGhiNhan || [])
    .map((d) => d.MaDonVi)
    .filter(Boolean);
  if (dsDonVi.length > 0) {
    return `Loại vi phạm này chỉ được ghi nhận bởi: ${dsDonVi.join(", ")}.`;
  }
  return "Đơn vị của bạn không được phân quyền ghi nhận loại vi phạm này.";
};

/* ------------------------------------------------------------------ */
/* Mức điểm trừ theo CheDoDiemTru của danh mục                         */
/* ------------------------------------------------------------------ */

/**
 * 0 = tự do: nhập bao nhiêu cũng được, để trống thì máy chủ lấy DiemTruMacDinh.
 * 1 = cố định: máy chủ LUÔN ghi DiemTruMacDinh, bỏ qua giá trị client gửi.
 * 2 = tối thiểu: phải >= DiemTruMacDinh, trừ cao hơn thì BẮT BUỘC có lý do.
 */
export const CHE_DO_DIEM_TRU = {
  TU_DO: 0,
  CO_DINH: 1,
  TOI_THIEU: 2,
};

/** Nguồn cho dropdown chọn chế độ ở màn danh mục loại vi phạm. */
export const CHE_DO_DIEM_TRU_OPTIONS = [
  {
    value: CHE_DO_DIEM_TRU.TU_DO,
    label: "Tự do",
    hint: "Người ghi nhập mức trừ tùy ý; bỏ trống thì lấy mức mặc định.",
  },
  {
    value: CHE_DO_DIEM_TRU.CO_DINH,
    label: "Cố định",
    hint: "Luôn trừ đúng mức mặc định, giá trị người ghi nhập bị bỏ qua.",
  },
  {
    value: CHE_DO_DIEM_TRU.TOI_THIEU,
    label: "Tối thiểu",
    hint: "Phải trừ >= mức mặc định; trừ cao hơn thì bắt buộc ghi căn cứ điều chỉnh.",
  },
];

export const TEN_CHE_DO_DIEM_TRU = {
  [CHE_DO_DIEM_TRU.TU_DO]: "Tự do",
  [CHE_DO_DIEM_TRU.CO_DINH]: "Cố định",
  [CHE_DO_DIEM_TRU.TOI_THIEU]: "Tối thiểu",
};

/** Chế độ của một loại vi phạm; dữ liệu cũ thiếu trường thì coi như tự do. */
export const cheDoCuaLoai = (loai) => {
  const che = Number(loai?.CheDoDiemTru);
  return Number.isFinite(che) ? che : CHE_DO_DIEM_TRU.TU_DO;
};

/** Mức mặc định (đồng thời là mức tối thiểu với chế độ 2); null nếu danh mục bỏ trống. */
export const diemTruMacDinhCuaLoai = (loai) => {
  const diem = Number(loai?.DiemTruMacDinh);
  return Number.isFinite(diem) ? diem : null;
};

/** Chế độ 2 và người dùng đang trừ CAO HƠN mức tối thiểu -> phải ghi căn cứ. */
export const canLyDoDieuChinh = (loai, diemTru) => {
  if (cheDoCuaLoai(loai) !== CHE_DO_DIEM_TRU.TOI_THIEU) return false;
  const toiThieu = diemTruMacDinhCuaLoai(loai);
  if (toiThieu == null) return false;
  const diem = parseFloat(diemTru);
  return !isNaN(diem) && diem > toiThieu;
};

/**
 * Chặn trước ở client đúng hai mã lỗi 400 của máy chủ
 * (DIEM_TRU_DUOI_TOI_THIEU / THIEU_LY_DO_DIEU_CHINH).
 *
 * KHÔNG kiểm tra trần 70/30 của nhóm: trần đó áp trên TỔNG điểm trừ cả năm của
 * một người trong một nhóm (api/vi-pham/tong-hop-nhan-vien tính), không phải
 * trên từng bản ghi.
 *
 * @returns {string|null} thông điệp lỗi, null nếu hợp lệ
 */
export const validateDiemTru = (loai, { DiemTru, LyDoDieuChinh } = {}) => {
  const cheDo = cheDoCuaLoai(loai);
  // Chế độ cố định: giá trị client gửi bị bỏ qua nên không có gì để kiểm tra.
  if (cheDo === CHE_DO_DIEM_TRU.CO_DINH) return null;

  const boTrong = DiemTru === "" || DiemTru == null;
  if (boTrong) {
    // Để trống = máy chủ lấy DiemTruMacDinh, luôn thỏa mức tối thiểu.
    return null;
  }

  const diem = parseFloat(DiemTru);
  if (isNaN(diem) || diem < 0) return "Điểm trừ phải là số không âm";

  if (cheDo === CHE_DO_DIEM_TRU.TOI_THIEU) {
    const toiThieu = diemTruMacDinhCuaLoai(loai);
    if (toiThieu != null && diem < toiThieu) {
      return `Loại vi phạm này trừ tối thiểu ${toiThieu.toFixed(2)} điểm`;
    }
    if (
      canLyDoDieuChinh(loai, diem) &&
      !String(LyDoDieuChinh || "").trim()
    ) {
      return "Trừ cao hơn mức tối thiểu thì phải ghi căn cứ điều chỉnh";
    }
  }

  if (String(LyDoDieuChinh || "").length > 500) {
    return "Lý do điều chỉnh tối đa 500 ký tự";
  }

  return null;
};

/**
 * Giá trị DiemTru / LyDoDieuChinh đưa vào body POST-PUT.
 * Chế độ cố định gửi null để máy chủ tự ghi mức của danh mục; lý do điều chỉnh
 * chỉ có nghĩa với chế độ tối thiểu khi trừ cao hơn mức sàn.
 */
export const buildDiemTruPayload = (loai, formData = {}) => {
  const cheDo = cheDoCuaLoai(loai);
  if (cheDo === CHE_DO_DIEM_TRU.CO_DINH) {
    return { DiemTru: null, LyDoDieuChinh: null };
  }

  const boTrong = formData.DiemTru === "" || formData.DiemTru == null;
  const diem = boTrong ? null : parseFloat(formData.DiemTru);
  return {
    DiemTru: diem != null && !isNaN(diem) ? diem : null,
    LyDoDieuChinh: canLyDoDieuChinh(loai, diem)
      ? String(formData.LyDoDieuChinh || "").trim() || null
      : null,
  };
};
