/**
 * Lớp đọc cho các endpoint TỔNG HỢP vi phạm ở phạm vi đơn vị (/api/vi-pham/...).
 *
 * Khác viPhamCaNhanApi.js (phạm vi một người) và viPhamMinhChungApi.js (tệp đính
 * kèm): ở đây là số liệu đã roll-up theo Khoa, dùng chung cho màn hình thống kê
 * lẫn phiếu KPI đơn vị.
 */

import { apiFetch } from "./api";

/** Trần điểm trừ tập thể của một Khoa trong một năm (theo fn_diem_tru_tap_the_khoa). */
export const TRAN_DIEM_TRU_TAP_THE = 7.5;

/**
 * Điểm trừ tập thể của một Khoa trong một năm.
 *
 * `DiemTruTapThe = MIN(7,5 * T / (0,2 * 15 * N), 7,5)`, với T = tổng điểm trừ của
 * các cá nhân (mỗi người đã áp trần 15) và N = số giảng viên đang hoạt động.
 *
 * VÌ SAO DÙNG Ở PHIẾU KPI ĐƠN VỊ: endpoint này và khối `TongHop` của
 * `POST phieu-don-vi/{id}/tong-hop-kpi` đọc CÙNG một TVF `fn_diem_tru_tap_the_khoa`
 * (xem docs/schema_ghi_chu.md §3.2 - hàm này là nguồn sự thật duy nhất), nên hai
 * nơi luôn khớp số. Khác biệt: endpoint này CHỈ ĐỌC, không ghi `diem_tong_hop`,
 * nên dùng được để hiển thị lại sau khi tải trang mà không phải POST tổng hợp chỉ
 * để xem con số.
 *
 * Đơn vị không phải Khoa thì server trả đủ 1 dòng với mọi cột = 0.
 *
 * Trả null khi server từ chối hoặc chưa có dữ liệu - đây là số liệu diễn giải,
 * nơi gọi KHÔNG được coi là lỗi của cả trang.
 *
 * @param {{idNam: number|string, idDonVi?: number|string}} params
 * @returns {Promise<object|null>} ViPhamDiemTruKhoaDto của đúng đơn vị được hỏi
 */
export const fetchDiemTruKhoa = async ({ idNam, idDonVi } = {}) => {
  if (!idNam) return null;

  const params = new URLSearchParams({ idNam });
  if (idDonVi) params.set("idDonVi", idDonVi);

  const response = await apiFetch(`vi-pham/diem-tru-khoa?${params.toString()}`);
  if (!response.ok) return null;

  const result = await response.json();
  const items = result.Items || (Array.isArray(result) ? result : []);
  // Đã lọc theo idDonVi nhưng vẫn khớp lại id: endpoint luôn trả mảng, kể cả 1 dòng
  return (
    items.find((r) => String(r.IdDonVi) === String(idDonVi)) || items[0] || null
  );
};
