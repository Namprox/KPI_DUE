/**
 * Điểm TB phản hồi sinh viên - lớp ĐỌC cho các màn QUẢN TRỊ (chốt điểm, kiểm
 * tra dữ liệu). Khác `phanHoiSinhVienApi.js`: file đó phục vụ màn hình cá nhân
 * của giảng viên và suy mã cán bộ từ token, còn ở đây dữ liệu là toàn trường.
 *
 * Quyền của cả nhóm route này giống hệt quyền import / chốt
 * (`canManagePhanHoiSinhVien`: ADMIN, hoặc TP / QTP tại P_DTBDCL). Backend
 * KHÔNG có route hỏi quyền riêng, nên quy ước của màn hình là: chỉ bày lối vào
 * cho người thoả `canManagePhanHoiSinhVien`, và nếu vẫn nhận 403 thì ẩn hẳn
 * khối đó đi chứ không báo lỗi đỏ (người dùng không làm gì được với lỗi ấy).
 */

import { apiFetch } from "./api";
import { readApiError } from "./apiError";

/** Mỗi lượt khảo sát sinh ra 12 dòng trả lời (phiếu có 12 câu hỏi). */
export const SO_CAU_HOI_MOI_PHIEU = 12;

/**
 * Số DÒNG trả lời → số LƯỢT đánh giá.
 *
 * Mọi route của nhóm phản hồi sinh viên đều đặt tên trường là `SoLuotDanhGia`
 * nhưng đếm trên bảng `phan_hoi_sinh_vien`, tức là đếm DÒNG. Quy đổi ở một chỗ
 * để hai màn (điểm TB đã chốt và danh sách mã không khớp) không nói hai con số
 * khác nhau cho cùng một giảng viên.
 */
export const soLuotDanhGia = (soDongTraLoi) => {
  const so = Number(soDongTraLoi);
  if (!Number.isFinite(so)) return null;
  return Math.round(so / SO_CAU_HOI_MOI_PHIEU);
};

const soNguyen = (giaTri) => Number(giaTri) || 0;

/**
 * Chuẩn hoá DTO PascalCase, đồng thời quy đổi dòng → lượt ngay tại biên.
 * `HoTenGv` / `TenDonVi` có thể vắng hẳn (NullValueHandling.Ignore) nên phần
 * render chỉ cần kiểm chuỗi rỗng, không phải kiểm cả undefined lẫn null.
 */
const chuanHoaKhongKhop = (data) => ({
  idNam: data?.IdNam ?? null,
  soMaKhongKhop: soNguyen(data?.SoMaKhongKhop),
  soLuotDanhGia: soLuotDanhGia(data?.SoLuotDanhGia) ?? 0,
  items: (data?.Items || []).map((item) => ({
    maCanBo: item?.MaCanBo || "",
    // Họ tên GHI TRONG FILE khảo sát, không phải tên trong danh mục nhân viên -
    // mã này có khớp nhân viên nào đâu mà lấy tên hệ thống.
    hoTenGv: item?.HoTenGv || "",
    soLuot: soLuotDanhGia(item?.SoLuotDanhGia) ?? 0,
    danhSachKhoa: (item?.DanhSachKhoa || []).map((khoa) => ({
      idDonVi: khoa?.IdDonVi ?? null,
      tenDonVi: khoa?.TenDonVi || "",
      soLuot: soLuotDanhGia(khoa?.SoLuotDanhGia) ?? 0,
    })),
  })),
});

/**
 * Danh sách mã cán bộ trong dữ liệu khảo sát không khớp nhân viên nào - chính
 * là các mã bị bỏ qua khi chốt (`SoMaKhongKhop`).
 *
 * Tính TRỰC TIẾP trên dữ liệu thô hiện tại nên gọi được cả khi năm chưa chốt:
 * đó là cách dùng chính, sửa mã xong rồi mới chốt. Đổi lại, sau khi sửa dữ liệu
 * thì danh sách này đổi ngay còn điểm TB thì KHÔNG - điểm chốt là ảnh chụp, phải
 * chốt lại mới cập nhật.
 *
 * Lỗi ném ra kèm `status` để bên gọi phân biệt 403 (ẩn khối) với 404 (báo năm
 * không tồn tại); backend không trả `ErrorCode` cho route này.
 */
export const fetchMaCanBoKhongKhop = async (idNam) => {
  const response = await apiFetch(`diem-tb-phan-hoi-sv/khong-khop?idNam=${idNam}`);
  if (!response.ok) {
    const info = await readApiError(
      response,
      "Không tải được danh sách mã cán bộ không khớp",
    );
    throw Object.assign(new Error(info.message), { status: response.status });
  }
  return chuanHoaKhongKhop(await response.json());
};
