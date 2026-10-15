import { apiFetch } from "./api";

// Trả cả envelope để giữ thông báo và phiếu nhận điểm của người kiêm nhiệm.
// BE trả 404 cho cả phiếu không tồn tại lẫn phiếu ngoài phạm vi; Message không
// dấu nên không hiển thị nguyên văn.
export const fetchDiemTuDongPhieu = async (idPhieu, signal) => {
  const response = await apiFetch(`phieu/${idPhieu}/tu-dong`, { signal });
  if (!response.ok) {
    throw Object.assign(new Error(response.status === 404
      ? "Không tìm thấy phiếu"
      : "Không tải được điểm tự động và minh chứng"), { status: response.status });
  }
  return response.json();
};
