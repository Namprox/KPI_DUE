export const laThanhTichDoanThe = (row) =>
  ["TTDT_HUY_CHUONG", "TTDT_GHI_NHAN_NGOAI"].includes(
    String(row?.CongThucSnapshot || row?.CongThucTongHop || "").toUpperCase(),
  );
export const laPhatTrienDoiNgu = (row) =>
  ["PTDN_DANH_HIEU_NHA_GIAO", "PTDN_NGACH_HOC_HAM_HOC_VI", "PTDN_BOI_DUONG"].includes(
    String(row?.CongThucSnapshot || row?.CongThucTongHop || "").toUpperCase(),
  );

// Snapshot của phiếu quyết định nguồn điểm, kể cả khi cấu hình mẫu đã thay đổi.
// Dòng tự động vẫn khoá nhập nếu API xem trước không tải được.
export function ghepDiemTuDongPhieu(preview = {}, chiTiet = [], criteria = []) {
  const result = { ...preview };
  const rows = new Map(chiTiet.map((row) => [String(row.IdTieuChi), row]));
  const all = new Map(criteria.map((row) => [String(row.IdTieuChi), row]));
  rows.forEach((row, id) => all.set(id, row));
  all.forEach((row, id) => {
    if (Number(row.LoaiNguonDiem) === 1) {
      delete result[id];
      return;
    }
    if (Number(row.LoaiNguonDiem) !== 2) return;
    result[id] = {
      IdTieuChi: row.IdTieuChi,
      CongThucTongHop: row.CongThucSnapshot || row.CongThucTongHop,
      DiemToiDa: row.DiemToiDa,
      DiemTuDong: row.DiemChinhThuc ?? null,
      ...preview[id],
    };
    // Phiếu đã có giữ điểm engine đã lưu; ghi nhận nguồn không tự chấm lại phiếu.
    if (rows.has(id) && (laThanhTichDoanThe(row) || laPhatTrienDoiNgu(row))) {
      result[id].CongThucTongHop = row.CongThucSnapshot || row.CongThucTongHop;
      result[id].DiemTuDong = row.DiemChinhThuc ?? null;
    }
  });
  return result;
}
