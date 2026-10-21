import { apiFetch } from "./api";

export async function getNhatKy(path, params = {}, signal) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) query.set(key, String(value));
  });
  const queryString = query.toString();
  const response = await apiFetch(`nhat-ky/${path}${queryString ? `?${queryString}` : ""}`, { signal });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.Success === false || !data) {
    throw new Error(response.status === 403 ? "Bạn không có quyền xem nhật ký hệ thống."
      : response.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : response.status === 404 ? "Không tìm thấy nhật ký hoặc API chưa được triển khai."
          : data?.Message || "Không tải được nhật ký. Vui lòng thử lại.");
  }
  return data;
}

export const SU_KIEN = { 1: "Đăng nhập", 2: "Làm mới token", 3: "Đăng xuất", 4: "Đổi mật khẩu", 5: "Quản trị đặt lại mật khẩu" };
export const HANH_DONG = { 1: "Thêm", 2: "Sửa", 3: "Xoá", 4: "Đổi khoá chính" };
export const TAC_NHAN = { 1: "Người dùng", 2: "Hệ thống", 3: "Ngoài ứng dụng" };
export const LY_DO = {
  InvalidPassword: "Sai mật khẩu", UserNotFound: "Tài khoản không tồn tại / đã ngưng",
  AccountLocked: "Tài khoản đang bị khoá tạm (sai nhiều lần)", IpBlocked: "IP bị chặn tạm (quá nhiều lần đăng nhập sai)",
  AccountDisabled: "Tài khoản đã ngưng hoạt động", TokenExpired: "Phiên đã hết hạn",
  ChuaGanDonVi: "Tài khoản chưa được gán đơn vị chính", LoiCapToken: "Lỗi hệ thống khi lưu",
  LoiCapNhat: "Lỗi hệ thống khi lưu", NhanVienKhongTonTai: "Nhân viên không tồn tại",
};
export const rawValue = (value) => value == null ? "(trống)" : value === "" ? '""' : String(value);
export const isSummary = (row) => row.LaTomTat === true || row.MucGhi === 2;
export function logTime(value, session = false) {
  if (!value) return "-";
  // Thao tác là giờ máy chủ, không gắn thêm múi giờ hoặc chuyển sang UTC.
  if (!session) return String(value).replace("T", " ");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}
