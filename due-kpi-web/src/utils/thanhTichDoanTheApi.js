import { apiFetch } from "./api";

const ROOT = "thanh-tich-doan-the";
const query = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) qs.set(key, String(value));
  });
  const value = qs.toString();
  return value ? `?${value}` : "";
};
const errorFrom = (response, body) => Object.assign(
  new Error(body?.Message || `Không thực hiện được yêu cầu (HTTP ${response.status}).`),
  { status: response.status, errorCode: body?.ErrorCode },
);
export async function doanTheRequest(path = "", options) {
  const response = await apiFetch(`${ROOT}${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.Success !== true) throw errorFrom(response, body);
  return body;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const layQuyenDoanThe = () => doanTheRequest("/quyen", { cache: "no-store" });
export const layLoaiDoanThe = () => doanTheRequest("/loai");
export const layThanhTichDoanThe = (params, signal) => doanTheRequest(query(params), { signal });
export const layGiangVienDoanThe = (params, signal) => doanTheRequest(`/giang-vien${query(params)}`, { signal });
export const layChiTietDoanThe = (id) => doanTheRequest(`/${id}`);
export const themThanhTichDoanThe = (body) => doanTheRequest("", json("POST", body));
export const suaThanhTichDoanThe = (id, body) => doanTheRequest(`/${id}`, json("PUT", body));
export const xoaThanhTichDoanThe = (id, lyDo) => doanTheRequest(`/${id}${query({ lyDo })}`, { method: "DELETE" });
export const importDoanThe = (file, idNam, chiKiemTra) => {
  const body = new FormData();
  body.append("file", file);
  body.append("idNam", String(idNam));
  body.append("chiKiemTra", String(chiKiemTra));
  return doanTheRequest("/import", { method: "POST", body });
};
export async function taiMauDoanThe() {
  const response = await apiFetch(`${ROOT}/mau-import`);
  if (!response.ok || response.headers.get("content-type")?.includes("json")) {
    throw errorFrom(response, await response.json().catch(() => null));
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "MauImport_ThanhTichDoanThe.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
