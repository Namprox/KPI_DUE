import { apiFetch } from "./api";

/**
 * GET api/nhan-vien có PHÂN TRANG (pageSize mặc định 20, tối đa 200).
 * Gọi trần `apiFetch('nhan-vien')` chỉ lấy được 20 người đầu tiên - lỗi im lặng.
 * Hàm này lặp qua toàn bộ trang để nạp đủ danh sách cho dropdown.
 */
export const fetchAllNhanVien = async ({
  trangThai = true,
  idDonVi = null,
  baoGomDonViCon = false,
  pageSize = 200,
  maxPages = 25,
} = {}) => {
  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (trangThai != null) params.set("trangThai", String(trangThai));
    if (idDonVi) {
      params.set("idDonVi", String(idDonVi));
      if (baoGomDonViCon) params.set("baoGomDonViCon", "true");
    }

    const response = await apiFetch(`nhan-vien?${params.toString()}`);
    if (!response.ok) break;

    const result = await response.json();
    all.push(...(result.Items || []));
    totalPages = result.TotalPages || 1;
    page += 1;
  } while (page <= totalPages && page <= maxPages);

  if (page > maxPages && page <= totalPages) {
    console.warn(
      `[fetchAllNhanVien] Đã chạm giới hạn ${maxPages} trang, danh sách nhân viên có thể bị thiếu.`,
    );
  }

  return all;
};
