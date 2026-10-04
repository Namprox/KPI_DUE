import { apiFetch } from "./api";

const ROOT = "phat-trien-doi-ngu";
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
export async function doiNguRequest(path = "", options) {
  const response = await apiFetch(`${ROOT}${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.Success !== true) throw errorFrom(response, body);
  return body;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const layQuyenDoiNgu = () => doiNguRequest("/quyen", { cache: "no-store" });
export const layLoaiDoiNgu = () => doiNguRequest("/loai");
export const layHangMucDoiNgu = (params, signal) => doiNguRequest(`/hang-muc${query(params)}`, { signal });
export const themHangMucDoiNgu = (body) => doiNguRequest("/hang-muc", json("POST", body));
export const suaHangMucDoiNgu = (id, body) => doiNguRequest(`/hang-muc/${id}`, json("PUT", body));
export const layPhatTrienDoiNgu = (params, signal) => doiNguRequest(query(params), { signal });
export const layGiangVienDoiNgu = (params, signal) => doiNguRequest(`/giang-vien${query(params)}`, { signal });
export const layChiTietDoiNgu = (id) => doiNguRequest(`/${id}`);
export const themPhatTrienDoiNgu = (body) => doiNguRequest("", json("POST", body));
export const suaPhatTrienDoiNgu = (id, body) => doiNguRequest(`/${id}`, json("PUT", body));
export const xoaPhatTrienDoiNgu = (id, lyDo) => doiNguRequest(`/${id}${query({ lyDo })}`, { method: "DELETE" });
export const layNguoiNhapDoiNgu = (baoGomDaThuHoi) => doiNguRequest(`/nguoi-nhap${query({ baoGomDaThuHoi })}`);
export const layUngVienDoiNgu = () => doiNguRequest("/nguoi-nhap/ung-vien");
export const capQuyenDoiNgu = (body) => doiNguRequest("/nguoi-nhap", json("POST", body));
export const thuHoiQuyenDoiNgu = (id) => doiNguRequest(`/nguoi-nhap/${id}`, { method: "DELETE" });
export const importDoiNgu = (file, idNam, chiKiemTra) => {
  const body = new FormData();
  body.append("file", file);
  body.append("idNam", String(idNam));
  body.append("chiKiemTra", String(chiKiemTra));
  return doiNguRequest("/import", { method: "POST", body });
};
export async function taiMauDoiNgu() {
  const response = await apiFetch(`${ROOT}/mau-import`);
  if (!response.ok || response.headers.get("content-type")?.includes("json")) {
    throw errorFrom(response, await response.json().catch(() => null));
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "MauImport_PhatTrienDoiNgu.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
