export const CONG_THUC_GIO_GIANG = "GIO_GIANG_TY_LE";
export const CONG_THUC_TU_DONG_OPTIONS = [
  { value: "GIO_GIANG_TY_LE", label: "Tỷ lệ hoàn thành định mức giờ giảng" },
  { value: "NCKH_GIO_TY_LE", label: "Tỷ lệ hoàn thành giờ nghiên cứu khoa học" },
];
/** @param {{ CongThucSnapshot?: string, CongThucTongHop?: string }} row */
export const laCongThucGioGiang = (row) =>
  String(row?.CongThucSnapshot || row?.CongThucTongHop || "").toUpperCase() === CONG_THUC_GIO_GIANG;

export const LY_DO_GIO_GIANG = {
  DAO_TAO_TINH_100: "Đi đào tạo tiến sĩ cả năm: tính hoàn thành 100%",
  CHUA_CO_CHUC_DANH: "Chưa có chức danh nghề nghiệp",
  CHUA_CAU_HINH_DINH_MUC: "Chưa cấu hình định mức cho chức danh / năm",
  DINH_MUC_BANG_0: "Định mức sau giảm trừ bằng 0",
  MIEN_TOAN_BO: "Được miễn định mức cả năm (đi học, tập sự…)",
  DU_LIEU_CAN_KIEM_TRA: "Số tháng miễn vượt quá năm, cần kiểm tra file giảm trừ",
  KHONG_TIM_THAY_NHAN_VIEN: "Dữ liệu không hợp lệ",
  NAM_KHONG_TON_TAI: "Dữ liệu không hợp lệ",
};
export const CANH_BAO_GIO_GIANG = {
  CHUA_CO_DU_LIEU_GIAM_TRU: "Chưa có dữ liệu file giảm trừ năm này. Hiện chỉ tính giảm theo chức vụ",
  CHUC_VU_DOI_TRONG_NAM: "Chức vụ thay đổi trong năm. Kiểm tra lịch sử chức vụ đã nhập đủ chưa",
  THANG_MIEN_VUOT_NAM: "Số tháng miễn vượt quá số tháng của năm",
};
export const COT_GIAM_GIO_GIANG = [
  ["GiamChuaVaoTruong", "Thời gian trước khi vào Trường"],
  ["GiamTapSu", "Tập sự / thử việc"],
  ["GiamNghi", "Nghỉ BHXH / theo Bộ luật Lao động"],
  ["GiamDaoTao", "Được cử đi đào tạo"],
  ["GiamChucVu", "Giảm theo chức vụ"],
  ["GiamConNho10", "Con nhỏ tháng 13–36 (10%)"],
  ["GiamCongDoan", "Chức vụ công đoàn"],
  ["GiamConNho40", "Con nhỏ tháng 7–12 (40 giờ)"],
  ["GiamDacBietHt", "Giảm đặc biệt do Hiệu trưởng quyết định"],
  ["DieuChinhSan0", "Điều chỉnh sàn 0"],
];
export const soGioGiang = (value, fixed = false) =>
  value == null || !Number.isFinite(Number(value)) ? "—" : Number(value).toLocaleString("vi-VN", {
    minimumFractionDigits: fixed ? 2 : 0, maximumFractionDigits: 2,
  });

// Color uses only the API score, never thresholds of teaching completion.
/** @param {import('./gioGiangTyLeTypes').TyLeHoanThanhGioGiang} row */
export const mauDiemGioGiang = (row) => {
  if (row.DiemDuKien == null || row.DiemToiDa == null) return "";
  if (row.DiemDuKien >= row.DiemToiDa) return "is-success";
  if (row.DiemDuKien >= row.DiemToiDa * 0.75) return "is-info";
  if (row.DiemDuKien > 0) return "is-warning";
  return "is-danger";
};
