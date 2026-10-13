import { apiFetch } from "./api";

const ROOT = "khen-thuong-dot-xuat";
const query = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) qs.set(key, String(value));
  });
  const value = qs.toString();
  return value ? `?${value}` : "";
};
export async function khenThuongRequest(path = "", options) {
  const response = await apiFetch(`${ROOT}${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.Success !== true) throw Object.assign(
    new Error(body?.Message || `Không thực hiện được yêu cầu (HTTP ${response.status}).`),
    { status: response.status, errorCode: body?.ErrorCode },
  );
  return body;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const layQuyenKhenThuong = () => khenThuongRequest("/quyen", { cache: "no-store" });
export const layMucKhenThuong = (params, signal) => khenThuongRequest(`/muc${query(params)}`, { signal });
export const layVienChucKhenThuong = (params, signal) => khenThuongRequest(`/vien-chuc${query(params)}`, { signal });
export const layKhenThuongDotXuat = (params, signal) => khenThuongRequest(query(params), { signal });
export const layChiTietKhenThuong = (id) => khenThuongRequest(`/${encodeURIComponent(id)}`);
export const themKhenThuongDotXuat = (body) => khenThuongRequest("", json("POST", body));
export const suaKhenThuongDotXuat = (id, body) => khenThuongRequest(`/${encodeURIComponent(id)}`, json("PUT", body));
export const xoaKhenThuongDotXuat = (id, lyDo) => khenThuongRequest(`/${encodeURIComponent(id)}${query({ lyDo })}`, { method: "DELETE" });
export const layNguoiNhapKhenThuong = (baoGomDaThuHoi) => khenThuongRequest(`/nguoi-nhap${query({ baoGomDaThuHoi })}`);
export const layUngVienKhenThuong = () => khenThuongRequest("/nguoi-nhap/ung-vien");
export const capQuyenKhenThuong = (body) => khenThuongRequest("/nguoi-nhap", json("POST", body));
export const thuHoiQuyenKhenThuong = (id) => khenThuongRequest(`/nguoi-nhap/${encodeURIComponent(id)}`, { method: "DELETE" });
