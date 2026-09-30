import { soGioGiang as so } from "./gioGiangTyLe";

export const NHOM_DINH_MUC = [
  ["DINH_MUC_GOC", "Định mức gốc", "DinhMucGoc"],
  ["CHUA_VAO_TRUONG", "Trước ngày vào Trường", "GiamChuaVaoTruong"],
  ["TAP_SU", "Tập sự / thử việc", "GiamTapSu"],
  ["NGHI", "Nghỉ BHXH / theo BLLĐ", "GiamNghi"],
  ["DAO_TAO", "Được cử đi đào tạo", "GiamDaoTao"],
  ["CHUC_VU", "Giảm theo chức vụ", "GiamChucVu"],
  ["CON_NHO_10", "Con nhỏ 13–36 tháng", "GiamConNho10"],
  ["CONG_DOAN", "Chức vụ công đoàn", "GiamCongDoan"],
  ["CON_NHO_40", "Con nhỏ 7–12 tháng", "GiamConNho40"],
  ["DAC_BIET_HT", "Giảm đặc biệt (Hiệu trưởng)", "GiamDacBietHt"],
  ["DIEU_CHINH_SAN_0", "Điều chỉnh (không để định mức âm)", "DieuChinhSan0"],
];
export const NHOM_GIO_THUC_HIEN = [
  ["GIO_TKB", "Giờ theo TKB", "GioTkb"],
  ["GIO_KE_KHAI", "Kê khai Phụ lục II", "GioKeKhai"],
  ["GIO_QNDB", "Huấn luyện QNDB / tự vệ", "GioQndb"],
];
export const GHI_CHU_DIEN_GIAI = {
  DO_THEO_NGAY: "Tính theo số ngày thực tế trong tháng",
  THEO_COT_O: 'Số tháng lấy theo cột "Thời gian không làm việc" của file giảm trừ (tháng tròn)',
  COT_O_KHONG_CONG_THEM: "Đã gộp với tập sự / đào tạo, không cộng thêm số tháng ở cột O",
  COT_O_KHONG_CO_NGAY: "File có số tháng không làm việc nhưng không ghi ngày cụ thể",
  MIEN_TOAN_BO: "Được miễn định mức cả năm",
  THANG_MIEN_VUOT_NAM: "Số tháng miễn vượt quá năm, cần kiểm tra file giảm trừ",
  QUY_DOI_THEO_COT_O: "Số tháng đã quy đổi theo cột O",
  TU_NGAY_BU_TU_COT_I: "Ngày bắt đầu chức vụ lấy theo file giảm trừ",
  KIEM_NHIEM_LAY_TY_LE_THAP_NHAT: "Kiêm nhiệm nhiều chức vụ, áp tỷ lệ giảm nhiều nhất",
  NHIEU_CON_KHONG_CONG_DON: "Nhiều con cùng độ tuổi, chỉ giảm một lần",
  CUA_SO_VAT_NAM: "Một phần thời gian thuộc năm khác, chỉ tính phần trong năm",
  TRUNG_THOI_GIAN_MIEN: "Trùng thời gian đã được miễn, phần trùng không trừ thêm",
};

// Calendar dates: never convert through UTC or the browser's timezone.
export const ngayDienGiai = (value) => {
  const match = typeof value === "string" && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
};
const khoangNgay = (start, end) => {
  const tu = ngayDienGiai(start);
  const den = ngayDienGiai(end);
  if (tu && den) return `từ ${tu} đến ${den}`;
  return tu ? `từ ${tu}` : den ? `đến ${den}` : "";
};

/** @param {import('./gioGiangTyLeTypes').DienGiaiGioGiang} item
 * @param {{ TenChucDanh?: string | null, IdNam?: number }} row */
export const moTaDienGiai = (item, row) => {
  const parts = [];
  const nguon = khoangNgay(item.NguonTuNgay, item.NguonDenNgay);
  const trongNam = khoangNgay(item.TuNgay, item.DenNgay);
  const laMienTheoThoiGian = ["CHUA_VAO_TRUONG", "TAP_SU", "NGHI", "DAO_TAO"].includes(item.KhoanMuc);
  // TyLe is an API fraction; multiplying by 100 only formats it as a percent.
  const tyLe = item.TyLe == null ? "" : `${so(item.TyLe * 100)}%`;
  switch (item.KhoanMuc) {
    case "DINH_MUC_GOC": if (row.TenChucDanh) parts.push(`Theo chức danh ${row.TenChucDanh}`); break;
    case "CHUA_VAO_TRUONG":
      if (item.NguonDenNgay) parts.push(`Bắt đầu làm việc tại Trường ngày ${ngayDienGiai(item.NguonDenNgay)}`);
      if (trongNam) parts.push(`Không tính định mức ${trongNam}`);
      break;
    case "TAP_SU": case "NGHI": case "DAO_TAO":
      if (nguon) parts.push(`Thời gian ${{ TAP_SU: "tập sự / thử việc", NGHI: "nghỉ", DAO_TAO: "đào tạo" }[item.KhoanMuc]}: ${nguon}`);
      break;
    case "CHUC_VU":
      if (item.TenNguon) parts.push(item.TenNguon);
      if (item.TyLe != null) {
        const giam = so((1 - item.TyLe) * 100);
        parts.push(`Định mức giờ giảng giảm ${giam}% (còn ${tyLe})`);
      }
      if (item.NguonTuNgay) parts.push(`Giữ chức vụ từ ${ngayDienGiai(item.NguonTuNgay)} đến ${ngayDienGiai(item.NguonDenNgay) || "nay"}`);
      else if (item.NguonDenNgay) parts.push(`Giữ chức vụ đến ${ngayDienGiai(item.NguonDenNgay)}`);
      if (trongNam) parts.push(`Áp dụng ${trongNam}`);
      break;
    case "CONG_DOAN":
      if (item.TenNguon) parts.push(item.TenNguon);
      if (item.GioNam != null) parts.push(`Giảm ${so(item.GioNam)} giờ/năm`);
      if (trongNam) parts.push(`Áp dụng ${trongNam}`);
      break;
    case "CON_NHO_10": case "CON_NHO_40":
      if (item.NgaySinhCon) parts.push(`Con sinh ${ngayDienGiai(item.NgaySinhCon)}`);
      if (nguon) parts.push(`Tháng ${item.KhoanMuc === "CON_NHO_10" ? "13–36" : "7–12"} là ${nguon}`);
      if (trongNam) parts.push(`Phần tính trong năm ${trongNam}`);
      if (tyLe) parts.push(`Giảm ${tyLe}`);
      break;
    case "DIEU_CHINH_SAN_0": parts.push("Tổng giảm vượt định mức; phần vượt không tính"); break;
    case "GIO_TKB":
      if (item.TenNguon) parts.push(item.TenNguon);
      if (item.SoLop != null) parts.push(`${so(item.SoLop)} lớp`);
      if (item.SoTiet != null) parts.push(`${so(item.SoTiet)} tiết`);
      break;
    case "GIO_KE_KHAI":
      if (item.IdKeKhai != null) parts.push(`Bản kê #${item.IdKeKhai}`);
      if (item.TenNguon) parts.push({ DH: "Phần Đại học", SDH: "Phần Sau đại học" }[item.TenNguon] || item.TenNguon);
      break;
    case "GIO_QNDB": if (item.SoNgay != null) parts.push(`${so(item.SoNgay)} ngày × 2,5 giờ`); break;
    default: if (item.TenNguon) parts.push(item.TenNguon);
  }
  // Keep month-only records readable when the API has no source dates.
  // Do not append in-year months to the original training/leave date range.
  const anThoiGianTrongNam = ["TAP_SU", "NGHI", "DAO_TAO"].includes(item.KhoanMuc) && !!nguon;
  if (item.SoThang != null && !anThoiGianTrongNam) {
    if (laMienTheoThoiGian && trongNam && parts.length) parts[parts.length - 1] += ` (${so(item.SoThang)} tháng)`;
    else parts.push(laMienTheoThoiGian ? `Thời gian tính: ${so(item.SoThang)} tháng` : `${so(item.SoThang)} tháng`);
  }
  const ngay = (v) => typeof v === "string" ? v.slice(0, 10) : "";
  if (["CHUA_VAO_TRUONG", "TAP_SU", "NGHI", "DAO_TAO"].includes(item.KhoanMuc) && item.KhoiTuNgay &&
    ((item.TuNgay && ngay(item.KhoiTuNgay) < ngay(item.TuNgay)) || (item.KhoiDenNgay && item.DenNgay && ngay(item.KhoiDenNgay) > ngay(item.DenNgay)))) {
    parts.push(`Gộp chung khối miễn ${khoangNgay(item.KhoiTuNgay, item.KhoiDenNgay)}${item.KhoiSoThang == null ? "" : ` (${so(item.KhoiSoThang)} tháng)`}`);
  }
  if (laMienTheoThoiGian) return parts.map((part) => `${part}.`).join("\n");
  return parts.join("; ");
};
