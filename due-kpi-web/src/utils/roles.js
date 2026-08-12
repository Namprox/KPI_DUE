/**
 * Mã chức vụ, chức danh nghề nghiệp và các tập quyền dùng chung toàn hệ thống.
 *
 * Đây là nơi DUY NHẤT định nghĩa "nhóm nào gồm những ai".
 * Sidebar, route guard và các trang đều phải lấy từ đây — không khai lại
 * mảng vai trò rời rạc trong từng file như trước.
 *
 * Hệ thống có HAI trục phân quyền độc lập, đừng trộn lẫn:
 *  - CHỨC VỤ (`nhan_vien.MaChucVu`: ADMIN/HT/TK/TKK/...) — "đang giữ vị trí gì".
 *  - CHỨC DANH nghề nghiệp (`nhan_vien.IdChucDanh`: GV/GVC/CV/...) — "ngạch gì".
 * Phiếu KPI Giảng viên / KPI Nhân viên là hai biểu mẫu khác nhau nên chia theo
 * chức danh; các màn hình quản trị chia theo chức vụ.
 *
 * Lưu ý dữ liệu: `nhan_vien.MaChucVu` trả về không thống nhất hoa/thường
 * ('Admin' vs 'ADMIN'), nên MỌI so sánh vai trò phải đi qua normalizeRole().
 */

/** Chuẩn hóa mã chức vụ về chữ hoa, không khoảng trắng thừa. */
export const normalizeRole = (user) =>
  String(user?.MaChucVu || "").trim().toUpperCase();

export const ROLE = {
  ADMIN: "ADMIN",
  HIEU_TRUONG: "HT",
  PHO_HIEU_TRUONG: "PHT",
  TRUONG_KHOA: "TK",
  TRUONG_KHOA_LON: "TKL",
  TRUONG_PHONG: "TP",
  TRUONG_BO_MON: "TBM",
  THU_KY_KHOA: "TKK",
  THU_KY_PHONG: "TKP",
};

/** Sentinel: mọi người dùng đã đăng nhập đều truy cập được. */
export const MOI_NGUOI = "*";

export const ROLE_SETS = {
  /** Chỉ quản trị viên hệ thống. */
  ADMIN: [ROLE.ADMIN],

  /**
   * Nhóm được quản trị dữ liệu hệ thống (danh mục, kế hoạch, cơ cấu tổ chức).
   * Giữ nguyên đúng tập vai trò đang chạy trước refactor: Admin/HT/PHT/TK/TBM.
   */
  QUAN_TRI: [
    ROLE.ADMIN,
    ROLE.HIEU_TRUONG,
    ROLE.PHO_HIEU_TRUONG,
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_BO_MON,
  ],

  /** Trưởng Khoa và Trưởng Khoa lớn — xem số liệu Khoa mình phụ trách. */
  TRUONG_KHOA: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON],

  /**
   * Trưởng đơn vị — nhóm được chấm điểm cấp Khoa cho phiếu KPI cá nhân.
   * Gồm cả Trưởng Phòng: phòng ban ngoài Khoa vẫn được giao chấm một số tiêu
   * chí qua bảng `tieu_chi_don_vi_cham` (ví dụ P.QLCL chấm tiêu chí phản hồi SV).
   * Ai chấm được tiêu chí NÀO thì server quyết; ở đây chỉ mở cửa vào màn hình.
   */
  TRUONG_DON_VI: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON, ROLE.TRUONG_PHONG],

  /**
   * Nhập nhiệm vụ phục vụ cộng đồng và phân công vai trò (KPI Nhóm III).
   *
   * Module chỉ áp dụng cho KHOA (`ma_don_vi LIKE 'K_%'`) nên Trưởng Phòng bị
   * loại — gọi với đơn vị khác server trả `KHONG_PHAI_KHOA`. Thư ký Khoa có mặt
   * vì thực tế họ là người gõ dữ liệu, nhưng CHỐT KỲ là thẩm quyền của trưởng
   * đơn vị: đừng suy quyền thao tác từ tập này, hãy đọc cờ `CanNhap` / `CanChot`
   * do endpoint `/nhiem-vu-khoa/ky` trả về.
   */
  NHIEM_VU_KHOA: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON, ROLE.THU_KY_KHOA],

  /**
   * Người chấm KPI cho cả đơn vị: thư ký Khoa/Phòng là người nhập, trưởng
   * Khoa / Khoa lớn / Phòng là người chịu trách nhiệm ký.
   */
  DANH_GIA_DON_VI: [
    ROLE.THU_KY_KHOA,
    ROLE.THU_KY_PHONG,
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_KHOA_LON,
    ROLE.TRUONG_PHONG,
  ],
};

/**
 * @param {string[]|"*"} roles tập vai trò được phép, hoặc MOI_NGUOI
 * @param {object} user
 */
export const hasRole = (roles, user) => {
  if (roles === MOI_NGUOI) return true;
  if (!Array.isArray(roles) || roles.length === 0) return false; // fail closed
  return roles.includes(normalizeRole(user));
};

/* ------------------------------------------------------------------ */
/* Chức danh nghề nghiệp (nhan_vien.IdChucDanh)                        */
/* ------------------------------------------------------------------ */

/**
 * Tập id chức danh theo loại phiếu KPI.
 *
 * Đây là ID trong bảng `chuc_danh_nghe_nghiep`, KHÔNG phải mã chức danh —
 * đổi dữ liệu danh mục thì phải sửa lại ở đây (và ở BLL tương ứng).
 */
export const CHUC_DANH_SETS = {
  /** Ngạch giảng viên — dùng phiếu KPI Giảng viên (Phụ lục 2). */
  GIANG_VIEN: [3, 4, 5, 6, 7],

  /** Ngạch viên chức / người lao động — dùng phiếu KPI Nhân viên. */
  NHAN_VIEN: [8, 9, 10],
};

/** Chuẩn hóa IdChucDanh về number; trả null nếu không xác định được. */
export const normalizeChucDanh = (user) => {
  const id = Number(user?.IdChucDanh);
  return Number.isFinite(id) ? id : null;
};

/**
 * @param {number[]|undefined|null} chucDanh tập id được phép.
 *   Không khai (undefined/null) = trang không xét chức danh → cho qua.
 * @param {object} user
 */
export const hasChucDanh = (chucDanh, user) => {
  if (chucDanh == null) return true;
  if (!Array.isArray(chucDanh) || chucDanh.length === 0) return false; // fail closed
  const id = normalizeChucDanh(user);
  return id != null && chucDanh.includes(id);
};

/**
 * Đường dẫn form tự đánh giá đúng ngạch của người dùng.
 *
 * Hai biểu mẫu là hai trang riêng và <RequireRole> chặn theo đúng hai tập chức
 * danh này, nên điều hướng phải suy ra từ CHÍNH IdChucDanh của người đăng nhập —
 * đoán theo LoaiDoiTuong của phiếu sẽ lệch với luật vào trang.
 *
 * @returns {string|null} null khi người dùng không thuộc ngạch nào có phiếu KPI
 *   cá nhân (ví dụ tài khoản quản trị) — bên gọi phải ẩn nút thay vì dẫn tới
 *   trang "không có quyền".
 */
export const duongDanPhieuTuDanhGia = (user, idNam) => {
  const query = idNam ? `?year=${idNam}` : "";
  if (hasChucDanh(CHUC_DANH_SETS.GIANG_VIEN, user)) {
    return `/danh-gia-phu-luc-2${query}`;
  }
  if (hasChucDanh(CHUC_DANH_SETS.NHAN_VIEN, user)) {
    return `/danh-gia-kpi-nhan-vien${query}`;
  }
  return null;
};
