import { apiFetch } from "./api";

const ROOT = "hoat-dong-dao-tao";
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
export async function daoTaoRequest(path = "", options) {
  const response = await apiFetch(`${ROOT}${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.Success !== true) throw errorFrom(response, body);
  return body;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const layQuyenDaoTao = () => daoTaoRequest("/quyen", { cache: "no-store" });
export const layLoaiDaoTao = () => daoTaoRequest("/loai");
export const layHoatDongDaoTao = (params, signal) => daoTaoRequest(query(params), { signal });
export const layGiangVienDaoTao = (params, signal) => daoTaoRequest(`/giang-vien${query(params)}`, { signal });
export const layChiTietDaoTao = (id) => daoTaoRequest(`/${id}`);
export const themHoatDongDaoTao = (body) => daoTaoRequest("", json("POST", body));
export const suaHoatDongDaoTao = (id, body) => daoTaoRequest(`/${id}`, json("PUT", body));
export const xoaHoatDongDaoTao = (id, lyDo) => daoTaoRequest(`/${id}${query({ lyDo })}`, { method: "DELETE" });
export const layNguoiNhapDaoTao = (baoGomDaThuHoi) => daoTaoRequest(`/nguoi-nhap${query({ baoGomDaThuHoi })}`);
export const layUngVienDaoTao = () => daoTaoRequest("/nguoi-nhap/ung-vien");
export const capQuyenDaoTao = (body) => daoTaoRequest("/nguoi-nhap", json("POST", body));
export const thuHoiQuyenDaoTao = (id) => daoTaoRequest(`/nguoi-nhap/${id}`, { method: "DELETE" });
export const importDaoTao = (file, idNam, chiKiemTra) => {
  const body = new FormData();
  body.append("file", file);
  body.append("idNam", String(idNam));
  body.append("chiKiemTra", String(chiKiemTra));
  return daoTaoRequest("/import", { method: "POST", body });
};
export async function taiMauDaoTao() {
  const response = await apiFetch(`${ROOT}/mau-import`);
  if (!response.ok || response.headers.get("content-type")?.includes("json")) {
    throw errorFrom(response, await response.json().catch(() => null));
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = "MauImport_HoatDongDaoTao.xlsx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
