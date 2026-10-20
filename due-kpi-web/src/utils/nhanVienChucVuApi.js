import { apiFetch } from "./api";
import { ROLE, normalizeRole } from "./roles";

const ROOT = "nhan-vien-chuc-vu";
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
export async function chucVuRequest(path = "", options) {
  const response = await apiFetch(`${ROOT}${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.Success !== true) throw errorFrom(response, body);
  return body;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const layQuyenChucVu = () => chucVuRequest("/quyen", { cache: "no-store" });
export const layNguoiNhapChucVu = (baoGomDaThuHoi) => chucVuRequest(`/nguoi-nhap${query({ baoGomDaThuHoi })}`);
export const layUngVienChucVu = () => chucVuRequest("/nguoi-nhap/ung-vien");
export const capQuyenChucVu = (body) => chucVuRequest("/nguoi-nhap", json("POST", body));
export const thuHoiQuyenChucVu = (id) => chucVuRequest(`/nguoi-nhap/${id}`, { method: "DELETE" });

/**
 * Ba chốt chặn 403 của đợt 2026-10-20 trên POST / PUT / DELETE api/nhan-vien-chuc-vu.
 * Backend kiểm quyền TRƯỚC mọi lỗi nghiệp vụ, nên ErrorCode ở đây luôn thắng Message.
 * Lỗi nghiệp vụ cũ (trùng dòng hiệu lực, bỏ đơn vị chính cuối cùng…) không có ErrorCode.
 */
export const LOI_KE_KHAI_CHUC_VU = {
  FORBIDDEN: "Bạn không có quyền kê khai chức vụ.",
  TU_SUA: "Không tự kê khai chức vụ cho chính mình — nhờ người khác có quyền.",
  CHUC_VU_ADMIN: "Chỉ ADMIN được thao tác với chức vụ / tài khoản ADMIN.",
};
export const thongBaoLoiChucVu = (body, macDinh) =>
  LOI_KE_KHAI_CHUC_VU[body?.ErrorCode] || body?.Message || body?.message || macDinh;

/** Dòng chức vụ ADMIN chỉ ADMIN được chọn / sửa; backend chặn bằng CHUC_VU_ADMIN. */
export const laChucVuAdmin = (chucVu) =>
  normalizeRole({ MaChucVu: chucVu?.MaChucVu ?? chucVu?.ma_chuc_vu }) === ROLE.ADMIN;
