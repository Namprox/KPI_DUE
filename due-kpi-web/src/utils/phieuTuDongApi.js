import { apiFetch } from "./api";
import { readApiError } from "./apiError";

// Trả cả envelope để giữ thông báo và phiếu nhận điểm của người kiêm nhiệm.
export const fetchDiemTuDongPhieu = async (idPhieu, signal) => {
  const response = await apiFetch(`phieu/${idPhieu}/tu-dong`, { signal });
  if (!response.ok) {
    const info = await readApiError(response, "Không tải được điểm tự động");
    throw Object.assign(new Error(response.status === 404 ? "Không tìm thấy phiếu" : info.message), {
      status: response.status,
      errorCode: info.errorCode,
    });
  }
  return response.json();
};
