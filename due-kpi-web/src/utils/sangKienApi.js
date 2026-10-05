import { apiFetch } from "./api";

const query = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) qs.set(key, String(value));
  });
  return qs.toString() ? `?${qs.toString()}` : "";
};
export async function sangKienRequest(path = "", options) {
  const response = await apiFetch(`sang-kien${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.Success !== true) throw Object.assign(
    new Error(body?.Message || `Không thực hiện được yêu cầu (HTTP ${response.status}).`),
    { status: response.status, errorCode: body?.ErrorCode },
  );
  return body;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const layQuyenSangKien = () => sangKienRequest("/quyen", { cache: "no-store" });
export const layDanhMucSangKien = () => sangKienRequest("/danh-muc");
export const laySangKien = (params, signal) => sangKienRequest(query(params), { signal });
export const dongBoSangKien = () => sangKienRequest("/dong-bo", { method: "POST" });
export const xetGiangDaySangKien = (Items) => sangKienRequest("/xet-giang-day", json("POST", { Items }));
export const layVienChucSangKien = (params, signal) => sangKienRequest(`/vien-chuc${query(params)}`, { signal });
export const layChiTietSangKien = (id) => sangKienRequest(`/${id}`);
export const themSangKien = (body) => sangKienRequest("", json("POST", body));
export const suaSangKien = (id, body) => sangKienRequest(`/${id}`, json("PUT", body));
export const xoaSangKien = (id, lyDo) => sangKienRequest(`/${id}${query({ lyDo })}`, { method: "DELETE" });
export const layNguoiNhapSangKien = (baoGomDaThuHoi) => sangKienRequest(`/nguoi-nhap${query({ baoGomDaThuHoi })}`);
export const layUngVienSangKien = () => sangKienRequest("/nguoi-nhap/ung-vien");
export const capQuyenSangKien = (body) => sangKienRequest("/nguoi-nhap", json("POST", body));
export const thuHoiQuyenSangKien = (id) => sangKienRequest(`/nguoi-nhap/${id}`, { method: "DELETE" });
