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

  /**
   * Trưởng Khoa và Trưởng Khoa lớn — xem số liệu Khoa mình phụ trách, và là
   * nhóm DUY NHẤT được thực hiện giai đoạn 3–4 của quy trình đánh giá: chốt hồ
   * sơ cá nhân kèm chọn xếp loại, trả dòng về đơn vị thẩm định, đóng gói và
   * trình tờ trình KPI Khoa.
   *
   * Trưởng Phòng CỐ Ý nằm ngoài: họ thẩm định các tiêu chí được giao (xem
   * TRUONG_DON_VI) nhưng không duyệt hồ sơ giảng viên. Gọi các endpoint giai
   * đoạn 3–4 với chức vụ TP sẽ nhận 403.
   */
  TRUONG_KHOA: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON],

  /**
   * Cấp Trường trong quy trình đánh giá: duyệt / trả lại GÓI KPI của Khoa, mở
   * lại phiếu đã hoàn tất. Hiệu trưởng KHÔNG còn duyệt từng phiếu lẻ — đơn vị
   * thao tác là cả tờ trình.
   *
   * Admin có mặt để xem và hỗ trợ vận hành; riêng thao tác duyệt gói và mở lại
   * phiếu server chỉ chấp nhận đúng mã chức vụ HT.
   */
  CAP_TRUONG: [ROLE.HIEU_TRUONG, ROLE.ADMIN],

  /**
   * Thiết lập kỳ đánh giá của toàn trường: mở/đóng năm, chốt mốc thời gian.
   *
   * Hẹp hơn QUAN_TRI vì một năm đánh giá chi phối tất cả các Khoa — PHT, Trưởng
   * Khoa và Trưởng Bộ môn chỉ làm việc trong năm đã mở, không tự mở năm mới.
   * Trùng thành viên với CAP_TRUONG nhưng tách riêng: bên kia là thẩm quyền
   * duyệt gói KPI, đổi một tập không kéo theo tập còn lại.
   */
  NAM_DANH_GIA: [ROLE.ADMIN, ROLE.HIEU_TRUONG],

  /**
   * Trưởng đơn vị — nhóm được chấm điểm cấp Khoa cho phiếu KPI cá nhân.
   * Gồm cả Trưởng Phòng: phòng ban ngoài Khoa vẫn được giao chấm một số tiêu
   * chí qua bảng `tieu_chi_don_vi_cham` (ví dụ P.QLCL chấm tiêu chí phản hồi SV).
   * Ai chấm được tiêu chí NÀO thì server quyết; ở đây chỉ mở cửa vào màn hình.
   */
  TRUONG_DON_VI: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON, ROLE.TRUONG_PHONG],

  /**
   * Ghi nhận vi phạm giảng dạy — hợp của QUAN_TRI và TRUONG_DON_VI.
   *
   * Màn hình này trước đây có hai lối vào ở hai nhóm menu khác nhau (nhóm
   * quản trị dữ liệu và nhóm chấm điểm của trưởng đơn vị); nay gộp làm một mục
   * duy nhất nên tập vai trò cũng phải gộp theo. Ai ghi nhận được loại vi phạm
   * NÀO và cho đơn vị nào thì server quyết — xem thêm viPhamPermissions.js.
   */
  GHI_NHAN_VI_PHAM: [
    ROLE.ADMIN,
    ROLE.HIEU_TRUONG,
    ROLE.PHO_HIEU_TRUONG,
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_KHOA_LON,
    ROLE.TRUONG_BO_MON,
    ROLE.TRUONG_PHONG,
  ],

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
   * Duyệt bản kê giờ quy đổi theo Phụ lục II của giảng viên.
   *
   * Khớp đúng `fn_ke_khai_gio_quy_doi_quyen` phía server: TK/TKL/TP duyệt trong
   * phạm vi đơn vị mình + đơn vị con, HT và Admin thấy toàn trường. Thư ký Khoa
   * CỐ Ý bị loại — duyệt là thẩm quyền của trưởng đơn vị, giống nhiệm vụ Khoa.
   *
   * Rộng hơn TRUONG_DON_VI vì có thêm HT/Admin, nên đừng dùng lẫn hai tập: đổi
   * một bên không kéo theo bên kia.
   */
  DUYET_KE_KHAI_GIO: [
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_KHOA_LON,
    ROLE.TRUONG_PHONG,
    ROLE.HIEU_TRUONG,
    ROLE.ADMIN,
  ],

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

  /**
   * Màn hình NHẬP phiếu KPI đơn vị (/danh-gia-kpi-don-vi).
   *
   * Hẹp hơn DANH_GIA_DON_VI một cách CỐ Ý: màn hình hiện chỉ dựng đúng phần việc
   * cấp 1 của quy trình — lập phiếu, gõ điểm tiêu chí chấm tay, tổng hợp KPI
   * thành viên, trình lên Trưởng đơn vị. Các bước duyệt (Trưởng đơn vị → Hiệu
   * trưởng → chốt) đã có endpoint nhưng chưa có màn hình, nên mở cửa cho TK/TKL/
   * TP/TKP vào đây chỉ dẫn họ tới một trang không làm được việc của họ.
   *
   * Mở rộng tập này khi (và chỉ khi) màn hình cấp duyệt được dựng.
   */
  NHAP_PHIEU_DON_VI: [ROLE.THU_KY_KHOA],

  /**
   * Giám sát hoạt động giảng dạy toàn trường: quản lý phiếu khảo sát ý kiến
   * sinh viên (/quan-ly-danh-gia-sinh-vien) và tổng hợp điểm trừ vi phạm
   * (/tong-hop-vi-pham).
   *
   * Nghiệp vụ của đúng MỘT phòng chuyên trách, nên PHẢI đi kèm
   * DON_VI_SETS.GIAM_SAT_GIANG_DAY — trưởng phòng của phòng khác không có việc
   * gì ở các màn hình này. Admin nằm ngoài ràng buộc đơn vị, xem hasDonVi().
   */
  GIAM_SAT_GIANG_DAY: [ROLE.TRUONG_PHONG, ROLE.ADMIN],
};

/**
 * @param {string[]|"*"} roles tập vai trò được phép, hoặc MOI_NGUOI
 * @param {object} user
 */
export const hasRole = (roles, user) => {
  if (roles === MOI_NGUOI) return true;
  if (!Array.isArray(roles) || roles.length === 0) return false; // fail closed
  
  const mainRole = normalizeRole(user);
  if (roles.includes(mainRole)) return true;

  // HT và ADMIN có hiệu lực toàn hệ thống
  if (mainRole === ROLE.ADMIN && roles.includes(ROLE.ADMIN)) return true;
  if (mainRole === ROLE.HIEU_TRUONG && roles.includes(ROLE.HIEU_TRUONG)) return true;

  // Kiểm tra vai trò trên từng đơn vị kiêm nhiệm (DonVi[])
  if (Array.isArray(user?.DonVi)) {
    return user.DonVi.some((dv) => {
      const r = String(dv.MaChucVu || "").trim().toUpperCase();
      return r && roles.includes(r);
    });
  }

  return false;
};

/**
 * Kiểm tra xem người dùng có quyền (tập chức vụ) tại một đơn vị cụ thể hay không.
 * Đối chiếu cả hai trường (đơn vị, chức vụ) TRÊN CÙNG MỘT DÒNG trong user.DonVi[].
 *
 * @param {string[]|string|"*"} roles Tập mã chức vụ được phép, hoặc MOI_NGUOI
 * @param {number|string|undefined|null} idDonVi ID đơn vị cần kiểm tra (bỏ trống = kiểm tra tồn tại ít nhất 1 đơn vị thỏa mãn)
 * @param {object} user Thông tin người dùng (chứa User.DonVi[])
 * @returns {boolean}
 */
export const coQuyenTaiDonVi = (roles, idDonVi, user) => {
  if (!user) return false;
  if (roles === MOI_NGUOI) return true;

  const roleArray = Array.isArray(roles)
    ? roles.map((r) => String(r).trim().toUpperCase())
    : [String(roles).trim().toUpperCase()];

  const mainRole = normalizeRole(user);

  // HT và ADMIN có hiệu lực toàn hệ thống, không ràng buộc đơn vị
  if (mainRole === ROLE.ADMIN && (roleArray.includes(ROLE.ADMIN) || roleArray.includes(MOI_NGUOI))) return true;
  if (mainRole === ROLE.HIEU_TRUONG && (roleArray.includes(ROLE.HIEU_TRUONG) || roleArray.includes(MOI_NGUOI))) return true;

  const donViList = Array.isArray(user?.DonVi) && user.DonVi.length > 0
    ? user.DonVi
    : (user?.IdDonVi ? [{ IdDonVi: user.IdDonVi, MaChucVu: user.MaChucVu, LaChinh: true }] : []);

  if (idDonVi == null || idDonVi === "") {
    return donViList.some((dv) => {
      const dvRole = String(dv.MaChucVu || "").trim().toUpperCase();
      return dvRole && roleArray.includes(dvRole);
    });
  }

  const targetId = Number(idDonVi);
  return donViList.some((dv) => {
    if (Number(dv.IdDonVi) !== targetId) return false;
    const dvRole = String(dv.MaChucVu || "").trim().toUpperCase();
    return dvRole && roleArray.includes(dvRole);
  });
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
 * @returns {string|null} null khi người dùng không thuộc ngạch nào có phiếu KPI cá nhân
 */
export const duongDanPhieuTuDanhGia = (user, idNam) => {
  const query = idNam ? `?year=${idNam}` : "";
  if (hasChucDanh(CHUC_DANH_SETS.GIANG_VIEN, user)) {
    return `/danh-gia-phu-luc-2${query}`;
  }
  if (hasChucDanh(CHUC_DANH_SETS.NHAN_VIEN, user)) {
    return `/danh-gia-kpi-nhan-vien${query}`;
  }
  if (Array.isArray(user?.DonVi) && user.DonVi.length > 0) {
    const coKhoa = user.DonVi.some((d) => String(d.MaDonVi || "").startsWith("K_"));
    if (coKhoa && user?.IdChucDanh) return `/danh-gia-phu-luc-2${query}`;
    return `/danh-gia-kpi-nhan-vien${query}`;
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Đơn vị công tác (nhan_vien.IdDonVi)                                 */
/* ------------------------------------------------------------------ */

/**
 * Tập id đơn vị được phép vào một màn hình.
 *
 * Trục thứ BA, độc lập với chức vụ và chức danh: có những màn hình nghiệp vụ
 * chỉ thuộc về đúng một đơn vị chuyên trách, đúng chức vụ vẫn chưa đủ.
 */
export const DON_VI_SETS = {
  /** Phòng chuyên trách khảo sát ý kiến sinh viên và tổng hợp vi phạm. */
  GIAM_SAT_GIANG_DAY: [23],
};

/** Chuẩn hóa IdDonVi về number; trả null nếu không xác định được. */
export const normalizeDonVi = (user) => {
  const id = Number(user?.IdDonVi);
  return Number.isFinite(id) ? id : null;
};

/**
 * Admin đi xuyên qua mọi ràng buộc đơn vị: tài khoản quản trị hệ thống không
 * gắn với đơn vị nghiệp vụ nào, chặn theo IdDonVi sẽ khóa luôn người vận hành
 * ra khỏi màn hình họ cần hỗ trợ. Ràng buộc CHỨC VỤ vẫn phải qua hasRole().
 *
 * @param {number[]|undefined|null} donVi tập id đơn vị được phép.
 *   Không khai (undefined/null) = trang không xét đơn vị → cho qua.
 * @param {object} user
 */
export const hasDonVi = (donVi, user) => {
  if (donVi == null) return true;
  if (normalizeRole(user) === ROLE.ADMIN) return true;
  if (!Array.isArray(donVi) || donVi.length === 0) return false; // fail closed
  
  const id = normalizeDonVi(user);
  if (id != null && donVi.includes(id)) return true;

  if (Array.isArray(user?.DonVi)) {
    return user.DonVi.some((dv) => donVi.includes(Number(dv.IdDonVi)));
  }

  return false;
};
