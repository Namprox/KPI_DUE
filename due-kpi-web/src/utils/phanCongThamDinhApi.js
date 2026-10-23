import { apiFetch } from "./api";

/**
 * Phân công thẩm định cho phó / thư ký đơn vị (bàn giao 2026-10-23).
 *
 * Trưởng đơn vị (TK / TKL / TP / QTP / GD / VT) giao cho cấp phó (PTK / PTKL /
 * PTP / PGD / PVT) hoặc thư ký (TKK / TKP) CỦA CHÍNH đơn vị mình thẩm định toàn
 * bộ tiêu chí đơn vị được giao. Người được phân công làm được giai đoạn 2 (duyệt /
 * sửa điểm / trả về từng dòng) trừ trên phiếu của chính họ; giai đoạn 3 vẫn là
 * của trưởng đơn vị.
 *
 * Quyền đọc thẳng từ CSDL và có hiệu lực ngay - FE gọi lại /quyen chứ không suy
 * từ chức vụ trong token.
 */
const ROOT = "phan-cong-tham-dinh";
const query = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) qs.set(key, String(value));
  });
  const value = qs.toString();
  return value ? `?${value}` : "";
};

/**
 * Message của server là tiếng Việt không dấu, nên mã lỗi nào có câu riêng thì
 * câu đó thắng. NOT_FOUND / DA_DUOC_PHAN_CONG / DA_THU_HOI đều nghĩa là danh
 * sách trên màn hình đã cũ - bên gọi tải lại (xem LOI_CAN_TAI_LAI).
 */
export const LOI_PHAN_CONG_THAM_DINH = {
  TU_PHAN_CONG: "Không thể tự phân công cho chính mình.",
  FORBIDDEN: "Bạn không có quyền phân công thẩm định cho đơn vị này.",
  NOT_FOUND: "Đơn vị, nhân sự hoặc phân công không còn tồn tại. Danh sách đã được tải lại.",
  DA_DUOC_PHAN_CONG: "Người này đã được phân công thẩm định tại đơn vị. Danh sách đã được tải lại.",
  DA_THU_HOI: "Phân công này đã được thu hồi trước đó. Danh sách đã được tải lại.",
  KHONG_DU_DIEU_KIEN: "Người này không phải phó / thư ký của đơn vị.",
};
export const LOI_CAN_TAI_LAI = ["NOT_FOUND", "DA_DUOC_PHAN_CONG", "DA_THU_HOI"];

const errorFrom = (response, body) => Object.assign(
  new Error(LOI_PHAN_CONG_THAM_DINH[body?.ErrorCode] || body?.Message ||
    `Không thực hiện được yêu cầu (HTTP ${response.status}).`),
  { status: response.status, errorCode: body?.ErrorCode },
);
async function request(path = "", options) {
  const response = await apiFetch(`${ROOT}${path}`, options);
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.Success !== true) throw errorFrom(response, body);
  return body;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const GHI_CHU_TOI_DA = 500;

export const layQuyenThamDinh = () => request("/quyen", { cache: "no-store" });
export const layPhanCongThamDinh = (idDonVi, baoGomDaThuHoi) =>
  request(query({ idDonVi, baoGomDaThuHoi }));
export const layUngVienThamDinh = (idDonVi) => request(`/ung-vien${query({ idDonVi })}`);
export const phanCongThamDinh = ({ idDonVi, idNhanVien, ghiChu }) =>
  request("", json("POST", { IdDonVi: idDonVi, IdNhanVien: idNhanVien, GhiChu: ghiChu || null }));
/** `id` là PhanCongThamDinhDto.Id - KHÔNG phải id nhân viên. */
export const thuHoiPhanCongThamDinh = (id) => request(`/${id}`, { method: "DELETE" });
