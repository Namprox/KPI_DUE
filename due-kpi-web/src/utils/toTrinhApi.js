/**
 * Lớp gọi API + hằng số miền cho TỜ TRÌNH KPI KHOA (to_trinh_kpi_khoa).
 *
 * Đây là giai đoạn 4 của quy trình. Đơn vị thao tác ở đây là CẢ GÓI KPI của một
 * Khoa, không phải hồ sơ cá nhân: Hiệu trưởng duyệt hoặc trả lại cả gói, không
 * còn duyệt/chốt từng phiếu lẻ.
 *
 * Máy trạng thái gói (`to_trinh_kpi_khoa.trang_thai`):
 *   1 DANG_TONG_HOP  chưa đủ 100% giảng viên được Trưởng khoa chốt
 *   2 DA_DONG_GOI    đã tính hạn ngạch + nâng xuất sắc, mở nút Trình Hiệu trưởng
 *   3 DA_TRINH       chờ Hiệu trưởng duyệt
 *   4 HT_DA_DUYET    chốt số liệu toàn Khoa, khóa chiến dịch
 *   5 HT_TRA_VE      HT trả về ≥1 hồ sơ; TK xử lý rồi đóng gói và trình lại
 *
 * Gói được server tự tạo khi hồ sơ đầu tiên của một (năm, đơn vị) được chốt. Bất
 * kỳ hồ sơ nào rớt khỏi trạng thái 4 đều kéo gói về 1.
 *
 * RowVersion ở đây là của TỜ TRÌNH, không phải của phiếu - đừng lẫn hai giá trị.
 */

import { apiFetch } from "./api";
import { readApiError } from "./apiError";

/* ------------------------------------------------------------------ */
/* Trạng thái gói                                                      */
/* ------------------------------------------------------------------ */

export const TRANG_THAI_TO_TRINH = {
  DANG_TONG_HOP: 1,
  DA_DONG_GOI: 2,
  DA_TRINH: 3,
  HT_DA_DUYET: 4,
  HT_TRA_VE: 5,
};

export const TRANG_THAI_TO_TRINH_META = {
  1: {
    label: "Đang tổng hợp",
    icon: "fa-inbox",
    bg: "#f1f5f9",
    color: "#475569",
    border: "#e2e8f0",
  },
  2: {
    label: "Đã đóng gói",
    icon: "fa-box-archive",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fde68a",
  },
  3: {
    label: "Đã trình Hiệu trưởng",
    icon: "fa-hourglass-half",
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#bfdbfe",
  },
  4: {
    label: "Hiệu trưởng đã duyệt",
    icon: "fa-circle-check",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#a7f3d0",
  },
  5: {
    label: "Hiệu trưởng trả về",
    icon: "fa-rotate-left",
    bg: "#fef2f2",
    color: "#b91c1c",
    border: "#fecaca",
  },
};

export const tenTrangThaiToTrinh = (trangThai) =>
  TRANG_THAI_TO_TRINH_META[trangThai]?.label ||
  `Không xác định (${trangThai ?? "-"})`;

export const HANH_DONG_TO_TRINH = {
  DONG_GOI: 1,
  TRINH_HT: 2,
  HT_DUYET: 3,
  HT_TRA_VE: 4,
  MO_LAI_GOI: 5,
};

export const TEN_HANH_DONG_TO_TRINH = {
  1: "Đóng gói tờ trình",
  2: "Trình Hiệu trưởng",
  3: "Hiệu trưởng duyệt gói",
  4: "Hiệu trưởng trả về",
  5: "Mở lại gói",
};

/** Tỷ lệ xuất sắc mặc định lưu trên gói (to_trinh_kpi_khoa.ty_le_xuat_sac). */
export const TY_LE_XUAT_SAC_MAC_DINH = 0.2;

/**
 * Số suất xuất sắc của một Khoa.
 *
 * Mẫu số là TỔNG SỐ giảng viên của Khoa (loai_doi_tuong = 1), KHÔNG phải số
 * người đạt "Hoàn thành tốt": Khoa 30 giảng viên có 6 suất kể cả khi chỉ 10
 * người ở mức 3. Làm tròn XUỐNG - 27 giảng viên ra 5 suất, không phải 6.
 */
export const tinhHanNgach = (soGiangVien, tyLe = TY_LE_XUAT_SAC_MAC_DINH) => {
  const n = Number(soGiangVien);
  const t = Number(tyLe);
  if (!Number.isFinite(n) || !Number.isFinite(t)) return 0;
  return Math.floor(n * t);
};

/**
 * Hồ sơ này có đang tranh suất xuất sắc không.
 *
 * Server đã trả sẵn cờ `DuDieuKienXuatSac`; hàm này chỉ để tính lại tại chỗ khi
 * dữ liệu đến từ nguồn không có cờ đó (ví dụ danh sách kèm theo lỗi DONG_HANG).
 */
export const duDieuKienXuatSac = (hoSo) =>
  Number(hoSo?.LoaiDoiTuong) === 1 &&
  Number(hoSo?.XepLoaiKhoa) === 3 &&
  Number(hoSo?.MucNckhcnQd838) === 2;

/* ------------------------------------------------------------------ */
/* Hạ tầng gọi API                                                     */
/* ------------------------------------------------------------------ */

const buildApiError = async (response, fallback) => {
  const info = await readApiError(response, fallback);
  const isConflict = response.status === 409;
  const error = new Error(
    isConflict
      ? info.message || "Gói KPI đã bị thay đổi. Vui lòng tải lại trang."
      : info.message,
  );
  error.status = response.status;
  error.errorCode = info.errorCode;
  error.isConflict = isConflict;
  error.isForbidden = response.status === 403;
  // CHUA_DU_HO_SO và DONG_HANG đều trả kèm danh sách hồ sơ để dựng UI xử lý.
  error.hoSo = info.hoSo;
  error.dongHang = info.dongHang;
  return error;
};

const getJson = async (endpoint, fallback) => {
  const response = await apiFetch(endpoint);
  if (!response.ok) throw await buildApiError(response, fallback);
  return response.json();
};

const sendJson = async (endpoint, method, body, fallback) => {
  const response = await apiFetch(endpoint, {
    method,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await buildApiError(response, fallback);
  return response.json().catch(() => ({}));
};

const buildQuery = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
};

/* ------------------------------------------------------------------ */
/* Đọc                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Danh sách gói KPI. Lọc trangThai = 3 để lấy hàng đợi hành động của Hiệu trưởng.
 * Trưởng khoa chỉ thấy gói của các đơn vị trong cây quản lý của mình.
 */
export const fetchToTrinhList = async ({
  idNam,
  idDonVi,
  trangThai,
  page = 1,
  pageSize = 20,
} = {}) => {
  const data = await getJson(
    `to-trinh-khoa${buildQuery({ idNam, idDonVi, trangThai, page, pageSize })}`,
    "Không tải được danh sách tờ trình KPI",
  );
  return data.Items || [];
};

/**
 * Chi tiết một gói: header + HoSo[] + LichSu[].
 *
 * `SoGiangVien` là mẫu số đã SNAPSHOT lúc đóng gói; `SoGiangVienHienTai` (chỉ có
 * ở endpoint này) là số đếm tại thời điểm gọi. Hai giá trị lệch nhau nghĩa là
 * nhân sự Khoa đã thay đổi sau khi đóng gói - UI phải cảnh báo, hạn ngạch đang
 * hiển thị không còn đúng.
 */
export const fetchToTrinhDetail = async (idToTrinh) => {
  const data = await getJson(
    `to-trinh-khoa/${idToTrinh}`,
    "Không tải được chi tiết tờ trình KPI",
  );
  return data.Item || null;
};

/* ------------------------------------------------------------------ */
/* Ghi - Trưởng khoa                                                   */
/* ------------------------------------------------------------------ */

/**
 * Đóng gói tờ trình (gói 1 hoặc 5 → 2).
 *
 * Đây là nơi DUY NHẤT ghi XepLoai = 4: chạy thuật toán hạn ngạch, xếp hạng theo
 * tổng điểm tích lũy rồi nâng những người trúng suất lên mức xuất sắc. Đóng gói
 * lại được nhiều lần trước khi trình.
 *
 * `tyLeXuatSac` để trống = giữ tỷ lệ đang lưu trên gói (mặc định 0.2).
 *
 * Hai nhánh lỗi 409 mà UI BẮT BUỘC xử lý riêng thay vì chỉ báo đỏ:
 *  - CHUA_DU_HO_SO - `error.hoSo` liệt kê người chưa được Trưởng khoa chốt.
 *  - DONG_HANG - `error.dongHang.SoSuatConLai` và `error.hoSo` là những người
 *    đồng điểm ở ranh giới. Server cố ý KHÔNG tự tie-break: đây là quyết định
 *    nhân sự, phải để Trưởng khoa chỉ định qua datUuTienXuatSac.
 */
export const dongGoiToTrinh = async (
  idToTrinh,
  { tyLeXuatSac, rowVersion },
) => {
  const data = await sendJson(
    `to-trinh-khoa/${idToTrinh}/dong-goi`,
    "POST",
    { TyLeXuatSac: tyLeXuatSac ?? null, RowVersion: rowVersion },
    "Đóng gói tờ trình thất bại",
  );
  return { item: data.Item || null, hoSo: data.HoSo || [] };
};

/** Trình gói lên Hiệu trưởng (gói 2 → 3, LanTrinh += 1). */
export const trinhToTrinh = async (idToTrinh, { nhanXet, rowVersion }) => {
  const data = await sendJson(
    `to-trinh-khoa/${idToTrinh}/trinh`,
    "POST",
    { NhanXet: nhanXet || null, RowVersion: rowVersion },
    "Trình tờ trình thất bại",
  );
  return data.Item || null;
};

/* ------------------------------------------------------------------ */
/* Ghi - Hiệu trưởng                                                   */
/* ------------------------------------------------------------------ */

/**
 * Hiệu trưởng duyệt CẢ GÓI - bước cuối cùng của toàn bộ quy trình.
 *
 * Gói 3 → 4 và MỌI hồ sơ trong gói 4 → 5 (HOAN_TAT), trở thành chỉ đọc. Không
 * hoàn tác được: sau bước này chỉ còn đường mở lại từng phiếu lẻ. UI phải hỏi
 * xác nhận trước khi gọi.
 */
export const htDuyetToTrinh = async (idToTrinh, { nhanXet, rowVersion }) => {
  const data = await sendJson(
    `to-trinh-khoa/${idToTrinh}/ht-duyet`,
    "POST",
    { NhanXet: nhanXet || null, RowVersion: rowVersion },
    "Duyệt gói KPI thất bại",
  );
  return data.Item || null;
};

/**
 * Hiệu trưởng trả về một DANH SÁCH hồ sơ, không phải cả gói (gói 3 → 5).
 *
 * Các phiếu được chọn về 4 → 3 kèm LyDoHtTraVe; phiếu khác giữ nguyên ở 4.
 * XepLoaiKhoa của hồ sơ bị trả về được GIỮ NGUYÊN để Trưởng khoa thấy mình đã
 * chọn gì mà sửa.
 */
export const htTraLaiToTrinh = async (
  idToTrinh,
  { idPhieuList, lyDo, rowVersion },
) => {
  const data = await sendJson(
    `to-trinh-khoa/${idToTrinh}/ht-tra-lai`,
    "POST",
    { IdPhieuList: idPhieuList, LyDo: lyDo, RowVersion: rowVersion },
    "Trả lại hồ sơ thất bại",
  );
  return { item: data.Item || null, hoSo: data.HoSo || [] };
};
