export const laThanhTichDoanThe = (row) =>
  ["TTDT_HUY_CHUONG", "TTDT_GHI_NHAN_NGOAI"].includes(
    String(row?.CongThucSnapshot || row?.CongThucTongHop || "").toUpperCase(),
  );
export const laPhatTrienDoiNgu = (row) =>
  ["PTDN_DANH_HIEU_NHA_GIAO", "PTDN_NGACH_HOC_HAM_HOC_VI", "PTDN_BOI_DUONG"].includes(
    String(row?.CongThucSnapshot || row?.CongThucTongHop || "").toUpperCase(),
  );
export const laSangKien = (row) =>
  ["SK_DOI_MOI_GIANG_DAY", "TTVT_SANG_KIEN"].includes(
    String(row?.CongThucSnapshot || row?.CongThucTongHop || "").toUpperCase(),
  );
export const diemSangKienDaLuu = (row) => row?.DiemTuDong !== undefined
  ? row.DiemTuDong : row?.DiemChinhThuc ?? null;
export const laKhenThuongDotXuat = (row) =>
  String(row?.CongThucSnapshot || row?.CongThucTongHop || "").toUpperCase() === "TTVT_KHEN_THUONG";

// Câu giải thích vì sao tiêu chí tự động ra điểm đó (LyDoDiemTuDong của BE) dưới
// thẻ tiêu chí, trên cả phiếu tự đánh giá lẫn màn chấm. Đang tắt theo yêu cầu;
// đổi thành true để hiện lại.
export const HIEN_LY_DO_DIEM_TU_DONG = false;

// Hiện trên các màn ghi nhận nguồn: lưu nguồn không chấm lại phiếu đã có.
export const HUONG_DAN_DIEM_NGUON =
  "Ghi nhận, sửa hoặc xoá không tự cập nhật điểm phiếu đã nộp. Phiếu còn ở trạng thái Nháp sẽ được chấm khi giảng viên nộp. Phiếu đang thẩm định cần trưởng đơn vị chạy “Tổng hợp tự động”.";

// API bỏ hẳn trường null, nên vắng và null cùng nghĩa; 0 là giá trị thật.
const coGiaTri = (value) => value !== null && value !== undefined && value !== "";

/**
 * Adapter duy nhất ghép GET phieu/{id} (ChiTiet[]) với GET phieu/{id}/tu-dong.
 *
 * - `response` là nguyên envelope `/tu-dong` (hoặc `{ Items }` xem trước theo mẫu
 *   khi chưa có phiếu). Dòng phiếu ghép theo IdChiTiet; chỉ item không có
 *   IdChiTiet (xem trước theo mẫu) mới ghép theo IdTieuChi.
 * - Dòng tự động xác định bằng LoaiNguonDiem snapshot của phiếu, không theo cấu
 *   hình tiêu chí hiện tại. Dòng tự động vẫn khoá nhập khi `/tu-dong` lỗi.
 * - Kết quả khoá theo IdTieuChi (duy nhất trong một phiếu). Trong item,
 *   DiemTuDong là điểm TÍNH LẠI lúc gọi; điểm hiển thị lấy qua diemHienThiTuDong.
 */
export function ghepDiemTuDongPhieu(response, chiTiet = [], criteria = [], { trangThaiPhieu } = {}) {
  const items = Array.isArray(response?.Items) ? response.Items : [];
  const theoChiTiet = new Map();
  const theoTieuChi = new Map();
  items.forEach((item) => {
    if (!item) return;
    if (item.IdChiTiet != null) theoChiTiet.set(String(item.IdChiTiet), item);
    else if (item.IdTieuChi != null) theoTieuChi.set(String(item.IdTieuChi), item);
  });
  const khongNhanDiem = response?.LaPhieuNhanTuDong === false;

  const rows = new Map(chiTiet.filter((row) => row?.IdTieuChi != null)
    .map((row) => [String(row.IdTieuChi), row]));
  const all = new Map(criteria.filter((row) => row?.IdTieuChi != null)
    .map((row) => [String(row.IdTieuChi), row]));
  rows.forEach((row, id) => all.set(id, row));

  const result = {};
  all.forEach((row, id) => {
    const laDongPhieu = rows.has(id);
    const item = laDongPhieu
      ? row.IdChiTiet != null ? theoChiTiet.get(String(row.IdChiTiet)) : undefined
      : theoTieuChi.get(id);
    // DTO chi tiết mẫu không có LoaiNguonDiem: tiêu chí chưa vào phiếu được nhận
    // diện tự động qua dữ liệu xem trước theo mẫu.
    const laTuDong = Number(row.LoaiNguonDiem) === 2 ||
      (!laDongPhieu && !row.LoaiNguonDiem && !!item);
    if (!laTuDong) return;
    const info = {
      IdTieuChi: row.IdTieuChi,
      IdChiTiet: row.IdChiTiet,
      CongThucTongHop: row.CongThucSnapshot || row.CongThucTongHop,
      DiemToiDa: row.DiemToiDa,
      // Chưa có `/tu-dong`: giữ điểm đã ghi trên phiếu, không tự tính lại
      // (DiemTuDong của ChiTiet trong GET phieu/{id} là điểm đã ghi).
      ...(laDongPhieu ? { DiemChinhThuc: row.DiemChinhThuc ?? row.DiemTuDong ?? null } : {}),
      ...item,
    };
    if (item && laDongPhieu) {
      info.TuDongTheoPhieu = true;
      // Đã ghép được thì điểm chính thức chỉ theo `/tu-dong`, không lấy số cũ của ChiTiet.
      info.DiemChinhThuc = item.DiemChinhThuc ?? null;
      info.CongThucTongHop = item.CongThucTongHop || info.CongThucTongHop;
    }
    if (coGiaTri(response?.Quy)) info.Quy = response.Quy;
    if (response?.LaPhieuNhanTuDong !== undefined) info.LaPhieuNhanTuDong = response.LaPhieuNhanTuDong;
    if (trangThaiPhieu != null) info.TrangThaiPhieu = trangThaiPhieu;
    // Phiếu không nhận điểm vẫn có thể kèm lý do "Không tìm thấy dữ liệu..." - ẩn đi.
    if (khongNhanDiem) delete info.LyDoDiemTuDong;
    result[id] = info;
  });
  return result;
}

/** "Dự kiến": engine chưa ghi dòng (DiemDaGhi vắng) nhưng đã tính được DiemTuDong. */
export const laDiemDuKien = (info) =>
  !!info && !coGiaTri(info.DiemDaGhi) && coGiaTri(info.DiemTuDong);

/** Điểm hiển thị của dòng tự động: DiemChinhThuc, hoặc DiemTuDong kèm nhãn Dự kiến. */
export const diemHienThiTuDong = (info) => {
  if (laDiemDuKien(info)) return { diem: Number(info.DiemTuDong), duKien: true };
  return { diem: coGiaTri(info?.DiemChinhThuc) ? Number(info.DiemChinhThuc) : null, duKien: false };
};

/** Mức thang điểm đi cùng điểm hiển thị (mức đã ghi, hoặc mức của điểm dự kiến). */
export const thangDiemHienThiTuDong = (info) =>
  (laDiemDuKien(info) ? info.IdThangDiemChon : info?.IdThangDiemDaGhi) ?? null;

/**
 * Điểm dự kiến / điểm mới được ghi khi nào - theo loại và trạng thái phiếu
 * (bàn giao BE mục 3.2). null khi không xác định được trạng thái.
 */
export const thoiDiemGhiDiemTuDong = (info) => {
  const trangThai = Number(info?.TrangThaiPhieu);
  if (!trangThai) return null;
  if (Number(info?.Quy) > 0) {
    if (trangThai === 1) return "Hệ thống sẽ chấm lại khi nộp phiếu quý.";
    if (trangThai === 2) return "Hệ thống sẽ chấm lại khi Trưởng đơn vị chốt phiếu quý.";
    if (trangThai === 5) return "Phiếu quý đã chốt nên điểm không tự đổi.";
    return null;
  }
  if (trangThai === 1) return "Hệ thống sẽ chấm lại khi nộp phiếu.";
  if (trangThai === 2) return "Điểm được cập nhật sau khi trưởng đơn vị hoặc Admin bấm “Tổng hợp tự động”.";
  if (trangThai === 3 || trangThai === 4) {
    return "Điểm không tự đổi. Chỉ cập nhật được nếu Trưởng khoa trả một tiêu chí chấm tay về thẩm định (phiếu về Đang thẩm định) rồi bấm “Tổng hợp tự động”.";
  }
  if (trangThai === 5) return "Điểm không tự đổi. Chỉ cập nhật được khi cấp Trường mở lại phiếu về Nháp hoặc Đang thẩm định.";
  return null;
};

/** Câu thông báo của FE cho lỗi POST phieu/{id}/tong-hop-tu-dong (BE không có ErrorCode). */
export const thongBaoLoiTongHopTuDong = (error) => {
  const raw = String(error?.rawMessage || "");
  const status = Number(error?.status);
  if (status === 403) return "Chỉ trưởng đơn vị hoặc Admin mới được tổng hợp điểm tự động.";
  if (status === 404) return "Không tìm thấy phiếu.";
  if (status === 409) {
    const phieu = raw.match(/phieu #(\d+)/i);
    return phieu
      ? `Điểm tự động của kỳ này thuộc về phiếu #${phieu[1]}, không tổng hợp trên phiếu này.`
      : "Chỉ tổng hợp được khi phiếu đang ở trạng thái Nháp hoặc Đang thẩm định. Vui lòng tải lại phiếu.";
  }
  if (status === 400) {
    if (/phieu theo quy/i.test(raw)) return "Phiếu quý không dùng chức năng Tổng hợp tự động.";
    if (/khong co quyen/i.test(raw)) return "Bạn không có quyền tổng hợp tự động cho phiếu của đơn vị này.";
  }
  return "Tổng hợp điểm tự động thất bại. Vui lòng thử lại.";
};
