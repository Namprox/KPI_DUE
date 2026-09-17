/**
 * Mã chức vụ, chức danh nghề nghiệp và các tập quyền dùng chung toàn hệ thống.
 *
 * Đây là nơi DUY NHẤT định nghĩa "nhóm nào gồm những ai".
 * Sidebar, route guard và các trang đều phải lấy từ đây - không khai lại
 * mảng vai trò rời rạc trong từng file như trước.
 *
 * Hệ thống có HAI trục phân quyền độc lập, đừng trộn lẫn:
 *  - CHỨC VỤ (`nhan_vien.MaChucVu`: ADMIN/HT/TK/TKK/...) - "đang giữ vị trí gì".
 *  - CHỨC DANH nghề nghiệp (`nhan_vien.IdChucDanh`: GV/GVC/CV/...) - "ngạch gì".
 * Phiếu KPI Giảng viên / KPI Nhân viên là hai biểu mẫu khác nhau nên chia theo
 * chức danh; các màn hình quản trị chia theo chức vụ.
 *
 * Lưu ý dữ liệu: `nhan_vien.MaChucVu` trả về không thống nhất hoa/thường
 * ('Admin' vs 'ADMIN'), nên MỌI so sánh vai trò phải đi qua normalizeRole().
 */

/** Chuẩn hóa mã chức vụ về chữ hoa, không khoảng trắng thừa. */
export const normalizeRole = (user) =>
  String(user?.MaChucVu || "")
    .trim()
    .toUpperCase();

export const ROLE = {
  ADMIN: "ADMIN",
  HIEU_TRUONG: "HT",
  PHO_HIEU_TRUONG: "PHT",
  TRUONG_KHOA: "TK",
  TRUONG_KHOA_LON: "TKL",
  PHO_TRUONG_KHOA: "PTK",
  PHO_TRUONG_KHOA_LON: "PTKL",
  TRUONG_PHONG: "TP",
  PHO_TRUONG_PHONG: "PTP",
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
   * Bộ khung tiêu chí dùng chung toàn trường: nhóm tiêu chí, tiêu chí, thang
   * điểm và mẫu phiếu đánh giá (nhóm menu "Quản lý tiêu chí").
   *
   * HẸP HƠN QUAN_TRI một cách có chủ đích. Sửa một tiêu chí hay một mẫu phiếu
   * là đổi thước đo của MỌI đơn vị trong năm đánh giá đó, nên không phải việc
   * của cấp đơn vị: TK và TBM trước đây thấy nhóm này chỉ vì dùng chung
   * QUAN_TRI với các danh mục cấp Khoa. PHT cũng bị loại - duyệt kết quả là
   * việc của họ, dựng thước đo thì không.
   *
   * TRÙNG thành viên với NAM_DANH_GIA và CAP_TRUONG nhưng CỐ Ý tách riêng, theo
   * đúng quy ước của file này: ba tập trả lời ba câu hỏi khác nhau (dựng bộ
   * tiêu chí / mở đóng năm đánh giá / duyệt gói KPI), đổi một tập không được
   * lặng lẽ kéo theo hai tập kia.
   */
  QUAN_LY_TIEU_CHI: [ROLE.ADMIN, ROLE.HIEU_TRUONG],

  /**
   * Danh mục nền của toàn trường: cây đơn vị, chức danh nghề nghiệp, chức vụ
   * (nhóm menu "Cơ cấu tổ chức", TRỪ mục "Người dùng").
   *
   * HẸP HƠN QUAN_TRI một cách có chủ đích, cùng lý do với QUAN_LY_TIEU_CHI:
   * ba danh mục này là dữ liệu gốc mà mọi phân quyền khác dựa vào - đổi
   * `cap_don_vi` hay `id_don_vi_cha` của một đơn vị là đổi luôn kết quả roll-up
   * Khoa chủ quản ở module vi phạm, đổi mã chức danh là đổi tập đối tượng của
   * từng loại phiếu KPI. Cấp đơn vị không sửa dữ liệu của cấp trên và của đơn
   * vị bạn.
   *
   * CỐ Ý không dùng chung với QUAN_LY_TIEU_CHI dù hiện TRÙNG thành viên: một
   * bên là thước đo đánh giá, một bên là cơ cấu tổ chức - hai trục nghiệp vụ
   * khác nhau, mở thêm vai trò cho bên này không được kéo theo bên kia.
   *
   * Mục "Người dùng" nằm NGOÀI tập này: TK/TKL/TP/TBM vẫn quản lý người dùng
   * trong phạm vi đơn vị mình - xem QUAN_LY_NGUOI_DUNG.
   */
  CO_CAU_TO_CHUC: [ROLE.ADMIN, ROLE.HIEU_TRUONG],

  /**
   * Nhóm được quản lý danh sách người dùng (/quan-ly-nguoi-dung).
   * Gồm: Admin, BGH (HT, PHT) toàn trường, và Trưởng Khoa (TK, TKL), Trưởng Phòng (TP), Trưởng Bộ môn (TBM)
   * trong phạm vi đơn vị mình phụ trách.
   */
  QUAN_LY_NGUOI_DUNG: [
    ROLE.ADMIN,
    ROLE.HIEU_TRUONG,
    ROLE.PHO_HIEU_TRUONG,
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_KHOA_LON,
    ROLE.TRUONG_PHONG,
    ROLE.TRUONG_BO_MON,
  ],

  /**
   * Trưởng Khoa và Trưởng Khoa lớn - xem số liệu Khoa mình phụ trách, và là
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
   * lại phiếu đã hoàn tất. Hiệu trưởng KHÔNG còn duyệt từng phiếu lẻ - đơn vị
   * thao tác là cả tờ trình.
   *
   * Admin có mặt để xem và hỗ trợ vận hành; riêng thao tác duyệt gói và mở lại
   * phiếu server chỉ chấp nhận đúng mã chức vụ HT.
   */
  CAP_TRUONG: [ROLE.HIEU_TRUONG, ROLE.ADMIN],

  /**
   * Thiết lập kỳ đánh giá của toàn trường: mở/đóng năm, chốt mốc thời gian.
   *
   * Hẹp hơn QUAN_TRI vì một năm đánh giá chi phối tất cả các Khoa - PHT, Trưởng
   * Khoa và Trưởng Bộ môn chỉ làm việc trong năm đã mở, không tự mở năm mới.
   * Trùng thành viên với CAP_TRUONG nhưng tách riêng: bên kia là thẩm quyền
   * duyệt gói KPI, đổi một tập không kéo theo tập còn lại.
   */
  NAM_DANH_GIA: [ROLE.ADMIN, ROLE.HIEU_TRUONG],

  /**
   * Trưởng đơn vị - nhóm được chấm điểm cấp Khoa cho phiếu KPI cá nhân.
   * Gồm cả Trưởng Phòng: phòng ban ngoài Khoa vẫn được giao chấm một số tiêu
   * chí qua bảng `tieu_chi_don_vi_cham` (ví dụ P.QLCL chấm tiêu chí phản hồi SV).
   * Ai chấm được tiêu chí NÀO thì server quyết; ở đây chỉ mở cửa vào màn hình.
   */
  TRUONG_DON_VI: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON, ROLE.TRUONG_PHONG],

  /**
   * Ghi nhận vi phạm của GIẢNG VIÊN (LoaiDoiTuong = 1).
   *
   * Trưởng Phòng CỐ Ý nằm ngoài, khác hẳn GHI_NHAN_VI_PHAM_NHAN_VIEN bên dưới:
   * đối tượng bị ghi nhận ở đây bắt buộc là giảng viên THUỘC KHOA (server chặn
   * bằng view v_giang_vien_khoa, sai tập trả 403 NOT_GIANG_VIEN_KHOA), nên
   * trưởng phòng ban không có người nào của mình để ghi nhận. Trước đây tập này
   * dùng CHUNG với màn hình vi phạm nhân viên và có TP; tách ra vì hai màn hình
   * có tập đối tượng khác hẳn nhau.
   *
   * ĐÁNH ĐỔI đã biết: phòng chuyên trách được gán trong
   * `loai_vi_pham.DonViGhiNhan[]` (điển hình là phòng giám sát giảng dạy,
   * DON_VI_SETS.GIAM_SAT_GIANG_DAY) cũng mất lối vào màn hình, dù server vẫn
   * cho họ ghi. Muốn mở lại cho riêng phòng đó thì thêm ROLE.TRUONG_PHONG vào
   * đây KÈM `donVi: DON_VI_SETS.GIAM_SAT_GIANG_DAY` ở mục menu - đừng thêm mỗi
   * vai trò, vì `hasDonVi` là AND với `hasRole` nên sẽ khóa luôn TK/TKL.
   *
   * Ai ghi nhận được loại vi phạm NÀO và cho đơn vị nào thì server quyết - xem
   * thêm viPhamPermissions.js.
   */
  GHI_NHAN_VI_PHAM_GIANG_VIEN: [
    ROLE.ADMIN,
    ROLE.HIEU_TRUONG,
    ROLE.PHO_HIEU_TRUONG,
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_KHOA_LON,
    ROLE.TRUONG_BO_MON,
  ],

  /**
   * Ghi nhận vi phạm của VIÊN CHỨC / NLĐ (LoaiDoiTuong = 2) - giữ nguyên tập
   * vai trò cũ, gồm cả Trưởng Phòng.
   *
   * Ở đây TP là người dùng CHÍNH chứ không phải ngoại lệ: nhân viên văn phòng
   * thuộc Phòng của họ nằm đúng trong tập đối tượng hợp lệ của server.
   *
   * CỐ Ý tách khỏi GHI_NHAN_VI_PHAM_GIANG_VIEN dù hiện chỉ chênh nhau một vai
   * trò: hai màn hình khác tập đối tượng, đổi một bên không được kéo theo bên
   * kia.
   */
  GHI_NHAN_VI_PHAM_NHAN_VIEN: [
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
   * loại - gọi với đơn vị khác server trả `KHONG_PHAI_KHOA`. Chỉ Trưởng Khoa /
   * Trưởng Khoa lớn được truy cập trang quản lý này. Quyền thao tác trên từng
   * kỳ vẫn được xác định theo cờ `CanNhap` / `CanChot`
   * do endpoint `/nhiem-vu-khoa/ky` trả về.
   */
  NHIEM_VU_KHOA: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON],

  /**
   * Duyệt bản kê giờ quy đổi theo Phụ lục II của giảng viên.
   *
   * Khớp đúng `fn_ke_khai_gio_quy_doi_quyen` phía server: TK/TKL/TP duyệt trong
   * phạm vi đơn vị mình + đơn vị con, HT và Admin thấy toàn trường. Thư ký Khoa
   * CỐ Ý bị loại - duyệt là thẩm quyền của trưởng đơn vị, giống nhiệm vụ Khoa.
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
   * Duyệt bản kê THÀNH TÍCH VƯỢT TRỘI (Nhóm II) của viên chức / NLĐ.
   *
   * Hợp của "trưởng đơn vị quản lý trực tiếp" và "trưởng phòng chuyên trách"
   * (P.TCHC duyệt khen thưởng, P.KHHTQT duyệt sáng kiến), cộng HT/Admin xem
   * toàn trường.
   *
   * CỐ Ý tách khỏi DUYET_KE_KHAI_GIO dù hiện TRÙNG thành viên, vì luật đằng sau
   * khác hẳn: giờ quy đổi gác theo phạm vi "đơn vị mình + đơn vị con", còn ở đây
   * gác theo TỪNG DÒNG qua `danh_muc_thanh_tich.id_don_vi_duyet` - một Trưởng
   * Phòng của P.TCHC với riêng dòng khen thưởng phủ toàn trường. Trộn hai tập
   * thì lần đầu ai đó xin mở thêm vai trò cho một bên sẽ lặng lẽ mở cả bên kia.
   *
   * TBM bị loại (bộ môn là đơn vị cấp 3, không bao giờ là đơn vị duyệt). TKP
   * cũng bị loại dù thực tế thư ký P.TCHC là người xử lý khen thưởng: server
   * chưa cho, thêm vào đây chỉ dẫn họ tới 403.
   *
   * Tập này chỉ MỞ CỬA vào màn hình; ai duyệt được dòng nào thì server quyết -
   * gửi lẫn dòng của đơn vị khác sẽ nhận 403 FORBIDDEN_DONG cho cả request.
   */
  DUYET_KE_KHAI_THANH_TICH: [
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_KHOA_LON,
    ROLE.TRUONG_PHONG,
    ROLE.HIEU_TRUONG,
    ROLE.ADMIN,
  ],

  /**
   * Kho minh chứng của phiếu KPI đơn vị.
   *
   * Khớp đúng quyền ĐỌC của GET /api/minh-chung-don-vi: thư ký và trưởng đơn
   * vị xem trong phạm vi được giao, HT/Admin xem toàn trường. Rộng hơn hợp của
   * KPI_KHOA và KPI_PHONG vì hai tập đó cố ý không chứa cấp Trường.
   */
  KHO_MINH_CHUNG_DON_VI: [
    ROLE.ADMIN,
    ROLE.HIEU_TRUONG,
    ROLE.THU_KY_KHOA,
    ROLE.THU_KY_PHONG,
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_KHOA_LON,
    ROLE.TRUONG_PHONG,
  ],

  /**
   * Màn hình đánh giá KPI KHOA (/danh-gia-kpi-don-vi).
   *
   * Trang này phục vụ hai cấp dưới của Khoa:
   *   TKK      nhập điểm, tổng hợp KPI thành viên rồi trình  (trạng thái 1)
   *   TK/TKL   chấm đè lên điểm thư ký, duyệt cả phiếu       (trạng thái 2)
   * HT duyệt và chốt ở cấp Trường - hai bước đó đã có endpoint nhưng CHƯA có
   * màn hình, nên không mở route này cho HT/Admin: vào chỉ để xem một phiếu
   * không thao tác được.
   *
   * Song sinh của KPI_PHONG, chỉ khác mã chức vụ của hai cấp. Đừng gộp làm một
   * tập: mỗi tập gác một màn hình riêng, và hai màn hình có thể mở cho cấp
   * Trường vào những thời điểm khác nhau.
   *
   * Ai làm được gì trên MỘT phiếu cụ thể thì quyenPhieuKhoa() trong
   * phieuKhoaApi.js quyết; tập này chỉ mở cửa vào màn hình.
   */
  KPI_KHOA: [ROLE.THU_KY_KHOA, ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON],

  /**
   * Màn hình đánh giá KPI PHÒNG / TRUNG TÂM (/danh-gia-kpi-phong).
   *
   * Trang này chỉ phục vụ hai cấp của Phòng:
   *   TKP  nhập điểm rồi trình            (trạng thái 1)
   *   TP   chấm đè lên điểm thư ký, duyệt (trạng thái 2)
   * HT xem và duyệt ở màn hình cấp Trường riêng, nên không mở route này cho
   * HT/Admin dù API phiếu có thể cho phép họ đọc dữ liệu.
   *
   * CỐ Ý không gộp vào KPI_KHOA: tập đó gác màn hình KPI Khoa và đi theo mã
   * chức vụ của Khoa (TKK/TK/TKL) - xem ghi chú ở đó.
   *
   * Ai làm được gì trên MỘT phiếu cụ thể thì quyenPhieuPhong() trong
   * phieuPhongApi.js quyết; tập này chỉ mở cửa vào màn hình.
   */
  KPI_PHONG: [ROLE.THU_KY_PHONG, ROLE.TRUONG_PHONG],

  /**
   * Giám sát hoạt động giảng dạy toàn trường: quản lý phiếu khảo sát ý kiến
   * sinh viên (/quan-ly-danh-gia-sinh-vien) và tổng hợp điểm trừ vi phạm
   * (/tong-hop-vi-pham).
   *
   * Nghiệp vụ của đúng MỘT phòng chuyên trách, nên PHẢI đi kèm
   * DON_VI_SETS.GIAM_SAT_GIANG_DAY - trưởng phòng của phòng khác không có việc
   * gì ở các màn hình này. Admin nằm ngoài ràng buộc đơn vị, xem hasDonVi().
   */
  GIAM_SAT_GIANG_DAY: [ROLE.TRUONG_PHONG, ROLE.ADMIN],

  /**
   * Giai đoạn 3 trên hồ sơ KPI của NHÂN VIÊN / VIÊN CHỨC (loai_doi_tuong = 2):
   * Trưởng phòng chốt hồ sơ của chính Phòng mình và chọn xếp loại (tối đa mức 2).
   *
   * CỐ Ý tách khỏi TRUONG_KHOA dù server dùng CHUNG một endpoint
   * (POST phieu/{id}/khoa/duyet-ho-so mở cho cả TK/TKL/TP - xem openapi.yaml).
   * Lý do tách là MÀN HÌNH chứ không phải thẩm quyền: /quan-ly/duyet-ho-so dựng
   * cho hồ sơ giảng viên - QĐ 838, định mức giờ NCKH, hạn ngạch xuất sắc 20%,
   * tờ trình Khoa - không thứ nào áp dụng cho phiếu ở Phòng. Nhét TP vào tập kia
   * là mở cho họ một màn hình sai nghiệp vụ VÀ kéo theo cả /quan-ly/to-trinh.
   *
   * TK/TKL nằm ngoài: nhân viên văn phòng Khoa cũng là loai_doi_tuong = 2 nhưng
   * họ đã có lối đi ở /quan-ly/duyet-ho-so, màn hình đó đã rẽ nhánh theo
   * laVienChuc. Thêm TK vào đây chỉ đẻ ra hai lối vào cho cùng một hồ sơ.
   *
   * Admin có mặt để xem và hỗ trợ vận hành. Họ không giữ chức vụ TP tại đơn vị
   * nào nên laTruongPhongCuaPhieu() trả false và panel chốt tự ẩn - với Admin
   * trang chạy ở chế độ CHỈ XEM. Đây là lựa chọn có chủ đích, không phải sót.
   */
  DUYET_HO_SO_NHAN_VIEN: [ROLE.TRUONG_PHONG, ROLE.ADMIN],
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
  if (mainRole === ROLE.HIEU_TRUONG && roles.includes(ROLE.HIEU_TRUONG))
    return true;

  // Kiểm tra vai trò trên từng đơn vị kiêm nhiệm (DonVi[])
  if (Array.isArray(user?.DonVi)) {
    return user.DonVi.some((dv) => {
      const r = String(dv.MaChucVu || "")
        .trim()
        .toUpperCase();
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
  if (
    mainRole === ROLE.ADMIN &&
    (roleArray.includes(ROLE.ADMIN) || roleArray.includes(MOI_NGUOI))
  )
    return true;
  if (
    mainRole === ROLE.HIEU_TRUONG &&
    (roleArray.includes(ROLE.HIEU_TRUONG) || roleArray.includes(MOI_NGUOI))
  )
    return true;

  const donViList =
    Array.isArray(user?.DonVi) && user.DonVi.length > 0
      ? user.DonVi
      : user?.IdDonVi
        ? [{ IdDonVi: user.IdDonVi, MaChucVu: user.MaChucVu, LaChinh: true }]
        : [];

  if (idDonVi == null || idDonVi === "") {
    return donViList.some((dv) => {
      const dvRole = String(dv.MaChucVu || "")
        .trim()
        .toUpperCase();
      return dvRole && roleArray.includes(dvRole);
    });
  }

  const targetId = Number(idDonVi);
  return donViList.some((dv) => {
    if (Number(dv.IdDonVi) !== targetId) return false;
    const dvRole = String(dv.MaChucVu || "")
      .trim()
      .toUpperCase();
    return dvRole && roleArray.includes(dvRole);
  });
};

/**
 * Các đơn vị mà người dùng ĐANG GIỮ một trong các chức vụ đã cho.
 *
 * Anh em "liệt kê" của coQuyenTaiDonVi(): cùng một luật - chức vụ và đơn vị phải
 * nằm TRÊN CÙNG MỘT DÒNG của user.DonVi[] - chỉ khác là trả về danh sách thay vì
 * boolean. Màn hình nào phải hỏi "tôi phụ trách những đơn vị nào" để dựng bộ lọc
 * thì dùng hàm này, đừng tự duyệt user.DonVi[] tại chỗ: kiêm nhiệm là ca bình
 * thường, và mỗi nơi tự duyệt là mỗi nơi quên một nhánh.
 *
 * CỐ Ý KHÔNG có đường tắt cho ADMIN/HT như coQuyenTaiDonVi: hai vai trò đó có
 * hiệu lực toàn hệ thống chứ không giữ chức vụ tại đơn vị nghiệp vụ nào, nên câu
 * trả lời đúng cho họ là mảng RỖNG. Bên gọi tự lo lối đi riêng (ví dụ bày bộ
 * chọn đơn vị lấy từ danh mục /donvi).
 *
 * @param {string[]|string} roles Tập mã chức vụ cần tìm
 * @param {object} user
 * @returns {{IdDonVi:number, MaDonVi?:string, TenDonVi?:string, MaChucVu:string}[]}
 */
export const donViTheoVaiTro = (roles, user) => {
  if (!user) return [];

  const roleArray = (Array.isArray(roles) ? roles : [roles]).map((r) =>
    String(r).trim().toUpperCase(),
  );

  const donViList =
    Array.isArray(user?.DonVi) && user.DonVi.length > 0
      ? user.DonVi
      : user?.IdDonVi
        ? [{ IdDonVi: user.IdDonVi, MaChucVu: user.MaChucVu, LaChinh: true }]
        : [];

  return donViList.filter((dv) => {
    const dvRole = String(dv.MaChucVu || "")
      .trim()
      .toUpperCase();
    return dvRole && roleArray.includes(dvRole);
  });
};

/* ------------------------------------------------------------------ */
/* Chức danh nghề nghiệp (nhan_vien.IdChucDanh)                        */
/* ------------------------------------------------------------------ */

/**
 * Tập id chức danh theo loại phiếu KPI.
 *
 * Đây là ID trong bảng `chuc_danh_nghe_nghiep`, KHÔNG phải mã chức danh -
 * đổi dữ liệu danh mục thì phải sửa lại ở đây (và ở BLL tương ứng).
 */
export const CHUC_DANH_SETS = {
  /** Ngạch giảng viên - dùng phiếu KPI Giảng viên (Phụ lục 2). */
  GIANG_VIEN: [3, 4, 5, 6, 7],

  /** Ngạch viên chức / người lao động - dùng phiếu KPI Nhân viên. */
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
    const coKhoa = user.DonVi.some((d) =>
      String(d.MaDonVi || "").startsWith("K_"),
    );
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
