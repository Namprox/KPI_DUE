import { apiFetch } from "./api";

const ROOT = "nhiem-vu-phuc-vu";
const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : "";
};
async function request(path = "", options) {
  const response = await apiFetch(`${ROOT}${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.Success !== true) {
    const error = new Error(data?.Message || data?.message || "Không xử lý được yêu cầu nhiệm vụ PVCĐ.");
    error.status = response.status;
    error.code = data?.ErrorCode;
    error.errorCode = data?.ErrorCode;
    throw error;
  }
  return data;
}
const write = (path, method, body) => request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
export const layCauHinh = (params) => request(`/cau-hinh${query(params)}`).then((r) => r.Item);
export const layDanhSach = (params) => request(query(params));
export const layCuaToi = (idNam) => request(`/cua-toi${query({ idNam })}`);
export const layNhiemVu = (id) => request(`/${encodeURIComponent(id)}`).then((r) => r.Item);
export const layGiangVien = (params) => request(`/giang-vien${query(params)}`).then((r) => r.Items || []);
export const layTongHop = (params) => request(`/tong-hop${query(params)}`);
export const layLichSu = (id) => request(`/${id}/lich-su`).then((r) => r.Items || []);
export const luuNhiemVu = (id, body) => write(id ? `/${id}` : "", id ? "PUT" : "POST", body).then((r) => r.Item);
export const thaoTac = (item, action, body = {}) => write(`/${item.IdNhiemVu}/${action}`, "POST",
  ["dang-ky", "rut-dang-ky"].includes(action) ? undefined : { ...body, RowVersion: item.RowVersion }).then((r) => r.Item);
export const luuBaoCao = (item, NoiDung) => write(`/${item.IdNhiemVu}/bao-cao`, "PUT", { NoiDung, RowVersion: item.RowVersion }).then((r) => r.Item);
// Evidence writes do not require RowVersion (including DELETE, per OpenAPI).
export const xoaMinhChung = (id) => write(`/minh-chung/${id}`, "DELETE").then((r) => r.Item);
export async function taiMinhChung(item, file, tenHienThi) {
  const body = new FormData();
  body.append("file", file);
  if (tenHienThi.trim()) body.append("tenHienThi", tenHienThi.trim());
  await request(`/${item.IdNhiemVu}/minh-chung`, { method: "POST", body });
  // Upload is the sole write returning an evidence DTO, not a task DTO.
  return layNhiemVu(item.IdNhiemVu);
}
export const urlMinhChung = (id, inline = false) =>
  `${process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api"}/${ROOT}/minh-chung/${encodeURIComponent(id)}/tai-ve${inline ? "?inline=1" : ""}`;

export const TRANG_THAI = { 1: "Bản nháp", 2: "Chờ Khoa triển khai", 3: "Đang triển khai", 4: "Chờ duyệt báo cáo", 5: "Đã chốt", 6: "Đã hủy" };
export const HUONG_DAN_DIEM = "Điểm sẽ được cập nhật vào phiếu KPI khi bạn nộp phiếu hoặc bấm “Tổng hợp tự động”.";
// Server dates are Vietnam wall-clock values. Never parse them through browser timezone.
export const ngayInput = (value) => value ? String(value).slice(0, 10) : "";
export const gioInput = (value) => value ? String(value).slice(0, 19) : "";
export const hienThiNgay = (value, time = false) => {
  if (!value) return "-";
  const [y, m, d] = ngayInput(value).split("-");
  return `${d}/${m}/${y}${time && String(value).length > 10 ? ` ${String(value).slice(11, 16)}` : ""}`;
};
export const thanhVienHienTai = (item) => (item?.ThanhVien || []).filter((v) => v.DaRoi !== true);
export const quyenTuCauHinh = (config) => ({
  Xem: config?.LaBanGiamHieu === true || (config?.Khoa || []).some((k) => k.LaTruongKhoa === true || k.LaGiangVienKhoa === true),
  QuanLy: config?.LaBanGiamHieu === true || (config?.Khoa || []).some((k) => k.LaTruongKhoa === true),
});
export function loiPhanCong(rows, limit) {
  if (rows.length > Number(limit)) return "Số thành viên vượt số lượng tối đa.";
  if (new Set(rows.map((v) => String(v.IdNhanVien))).size !== rows.length) return "Danh sách bị trùng thành viên.";
  if (rows.filter((v) => v.MaVaiTro === "CT").length > 1) return "Chỉ được chọn tối đa một Chủ trì.";
  if (rows.some((v) => !v.MaVaiTro)) return "Chọn vai trò cho tất cả thành viên.";
  return "";
}
export function loiMinhChung(file, name, config, count) {
  if (!file) return "Chọn một tệp PDF.";
  if (!config || !config.MaxFileSizeKb || !config.MaxSoMinhChung) return "Chưa tải được giới hạn minh chứng. Vui lòng tải lại.";
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext !== "pdf" || !(config.AllowedExtensions || []).some((s) => String(s).replace(/^\./, "").toLowerCase() === ext)) return "Chỉ nhận minh chứng PDF.";
  if (file.size > config.MaxFileSizeKb * 1024) return `Tệp vượt giới hạn ${config.MaxFileSizeKb} KB.`;
  if (count >= config.MaxSoMinhChung) return `Tối đa ${config.MaxSoMinhChung} minh chứng.`;
  if (name.trim().length > config.MaxTenHienThiLength) return "Tên hiển thị quá dài.";
  return "";
}
