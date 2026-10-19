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
 * Phân loại KPI cá nhân lấy từ DonVi[].LoaiDoiTuong do backend trả về;
 * các màn hình quản trị chia theo chức vụ.
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
  QUYEN_TRUONG_PHONG: "QTP",
  GIAM_DOC: "GD",
  VIEN_TRUONG: "VT",
  PHO_TRUONG_PHONG: "PTP",
  TRUONG_BO_MON: "TBM",
  THU_KY_KHOA: "TKK",
  TRO_LY_GIAO_VU_KHOA: "TLGVK",
  THU_KY_PHONG: "TKP",
};

/** Các chức vụ cấp trưởng của Phòng, Trung tâm và Viện. */
export const VAI_TRO_TRUONG_PHONG = [
  ROLE.TRUONG_PHONG,
  ROLE.QUYEN_TRUONG_PHONG,
  ROLE.GIAM_DOC,
  ROLE.VIEN_TRUONG,
];

/**
 * Tập HẸP hơn VAI_TRO_TRUONG_PHONG: chỉ Trưởng Phòng và Quyền Trưởng Phòng.
 *
 * Dùng cho màn hình mà backend gác bằng ĐÚNG MÃ chức vụ, không bằng khái niệm
 * "cấp trưởng đơn vị". Mọi cổng phân quyền mà docs tả rõ đều viết "TP / QTP"
 * (fn_phan_hoi_sinh_vien_co_quyen_import, fn_nckh_co_quyen_dong_bo - §19.2)
 * hoặc IN (N'TK', N'TKL', N'TP') (§10.6); GD và VT KHÔNG có mặt ở cổng nào.
 * Mở thêm cho họ chỉ dẫn Giám đốc Trung tâm / Viện trưởng tới 403 hoặc bảng
 * rỗng - xem canManageHocVu, cũng cố ý loại GD/VT theo quyền backend.
 *
 * TP và QTP luôn đi CẶP, đừng tách: một Phòng chỉ có một trong hai chức vụ,
 * không bao giờ có cả hai (chốt với người dùng 2026-10-19). Nên QTP không phải
 * vai trò phụ mở thêm cho rộng - đó chính là người đang phụ trách đơn vị, và
 * loại QTP ra là khóa đúng người cần vào.
 */
export const VAI_TRO_TP_QTP = [ROLE.TRUONG_PHONG, ROLE.QUYEN_TRUONG_PHONG];

/** Sentinel: mọi người dùng đã đăng nhập đều truy cập được. */
export const MOI_NGUOI = "*";

export const ROLE_SETS = {
  /** Hợp đồng tham-dinh/tieu-chi: các trưởng đơn vị hoặc ADMIN. */
  THAM_DINH_TIEU_CHI: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON, ...VAI_TRO_TRUONG_PHONG, ROLE.ADMIN],
  /** Đóng gói và chỉ định ưu tiên tại đúng đơn vị; không gồm cấp phó. */
  TO_TRINH_DON_VI: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON, ...VAI_TRO_TRUONG_PHONG, ROLE.ADMIN],
  /** Chỉ quản trị viên hệ thống. */
  ADMIN: [ROLE.ADMIN],
  /** Duyệt phiếu quý của viên chức tại đúng đơn vị phụ trách. */
  DUYET_PHIEU_QUY: [
    ...VAI_TRO_TRUONG_PHONG,
    ROLE.TRUONG_KHOA,
    ROLE.TRUONG_KHOA_LON,
    ROLE.ADMIN,
  ],

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
   * CỐ Ý tách riêng với NAM_DANH_GIA và CAP_TRUONG, theo
   * đúng quy ước của file này: ba tập trả lời ba câu hỏi khác nhau (dựng bộ
   * tiêu chí / mở đóng năm đánh giá / duyệt gói KPI), đổi một tập không được
   * lặng lẽ kéo theo hai tập kia.
   */
  QUAN_LY_TIEU_CHI: [ROLE.ADMIN, ROLE.HIEU_TRUONG],

  /**
   * Danh mục nền của toàn trường: cây đơn vị, chức danh nghề nghiệp
   * (nhóm menu "Tổ chức & hệ thống", TRỪ mục "Người dùng").
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
    ...VAI_TRO_TRUONG_PHONG,
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
  XET_XUAT_SAC_VIEN_CHUC_KHOA: [ROLE.HIEU_TRUONG, ROLE.ADMIN],

  /**
   * Thiết lập kỳ đánh giá của toàn trường: mở/đóng năm, chốt mốc thời gian.
   *
   * ADMIN/HT/PHT theo chức vụ chính trong token (bàn giao 2026-10-14).
   * Dùng canManageNamDanhGia cho thao tác ghi và lối vào màn quản lý.
   */
  NAM_DANH_GIA: [ROLE.ADMIN, ROLE.HIEU_TRUONG, ROLE.PHO_HIEU_TRUONG],

  /** Danh mục chức vụ và giảm trừ theo năm; API xét chức vụ chính trong token. */
  CHUC_VU: [ROLE.ADMIN, ROLE.HIEU_TRUONG, ROLE.PHO_HIEU_TRUONG],

  /** Định mức giảng viên toàn trường chỉ do Admin và Hiệu trưởng quản lý. */
  DINH_MUC_GIANG_VIEN: [ROLE.ADMIN, ROLE.HIEU_TRUONG],

  /**
   * Upload thời khóa biểu là thao tác ghi đè dữ liệu nguồn toàn trường của một
   * năm đánh giá. Khớp đúng quyền API /gio-giang-tkb/import: chỉ Admin và Hiệu
   * trưởng được thực hiện thao tác ghi. Quyền xem dùng canViewGioGiangTkb.
   */
  GIO_GIANG_TKB: [ROLE.ADMIN, ROLE.HIEU_TRUONG],

  /**
   * Quyền ĐỌC tỷ lệ hoàn thành giờ giảng, phần KHÔNG xét đơn vị
   * (/ty-le-hoan-thanh-gio-giang). Lối vào màn hình là canViewTyLeGioGiang,
   * tập này chỉ là một nửa của nó - xem hàm đó trước khi sửa.
   *
   * Khớp GET api/gio-giang-tkb/ty-le-hoan-thanh: ADMIN / HT xem toàn trường;
   * TK / TKL xem đơn vị mình giữ chức vụ + cây đơn vị cấp dưới; ai cũng xem
   * được dòng của CHÍNH MÌNH khi truyền idNhanVien = id của mình (lối đi đó ở
   * /gio-giang-cua-toi, không qua tập này).
   *
   * TRƯỞNG PHÒNG CỐ Ý KHÔNG có ở đây dù backend vẫn nhận chức vụ TP: trang
   * liệt kê GIẢNG VIÊN, mà giảng viên thuộc Khoa (v_giang_vien_khoa), nên TP
   * của một Phòng bất kỳ chỉ nhận về bảng rỗng - một mục menu dẫn tới trang
   * trắng. Chỉ P_DTBDCL có việc ở đây (họ import thời khóa biểu), và ràng buộc
   * đơn vị đó nằm trong canViewTyLeGioGiang. GD / VT không có ở cổng nào.
   *
   * PHT nằm ngoài (backend không nhận). Song sinh với DIEM_TB_PHAN_HOI_SV
   * nhưng KHÁC thành viên ở hai đầu: tập đó có TKK và không có HT - đừng gộp.
   */
  TY_LE_GIO_GIANG: [ROLE.ADMIN, ROLE.HIEU_TRUONG, ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON],

  /**
   * Quyền ĐỌC điểm trung bình phản hồi sinh viên đã chốt
   * (/diem-trung-binh-danh-gia-sinh-vien).
   *
   * Khớp GET api/diem-tb-phan-hoi-sv: ADMIN và TP@P_DTBDCL xem toàn trường;
   * TK / TKL / TP / TKK chỉ xem giảng viên thuộc đơn vị mình (+ con trực
   * tiếp). Người không giữ chức vụ nào trong số đó nhận 404 - SP không trả
   * result set - nên tập này phải khớp đúng: rộng hơn là đẩy người dùng vào
   * trang trắng kèm thông điệp "hãy chốt điểm" mà họ không có quyền làm.
   *
   * TRƯỞNG PHÒNG CỐ Ý KHÔNG có ở đây, dù backend vẫn nhận chức vụ TP: mỗi dòng
   * là một GIẢNG VIÊN, nên TP của một Phòng bất kỳ chỉ nhận bảng rỗng. Đúng
   * MỘT phòng có việc ở trang này là P_DTBDCL - phòng chốt điểm, và cũng là
   * người duy nhất xem được TOÀN TRƯỜNG - nên ràng buộc đơn vị nằm trong
   * canXemDiemTbPhanHoiSv chứ không phải ở tập vai trò này. Không bỏ TP/QTP
   * của P_DTBDCL được: họ đã import và chốt điểm (canManagePhanHoiSinhVien,
   * cùng luật fn_phan_hoi_sinh_vien_co_quyen_import = "ADMIN, hoặc TP / QTP
   * tại P_DTBDCL"), cho chốt mà không cho xem kết quả là luồng vỡ.
   *
   * HT / PHT CỐ Ý nằm ngoài, khác hẳn TY_LE_GIO_GIANG ở trên: SP đọc không
   * nhận hai chức vụ này. Muốn mở cho Hiệu trưởng thì phải sửa
   * sp_diem_tb_phan_hoi_sv_get_chi_tiet trước; thêm vào đây chỉ dẫn tới 404.
   *
   * CHỈ mở cửa màn hình XEM. Quyền import / chốt là canManagePhanHoiSinhVien.
   */
  DIEM_TB_PHAN_HOI_SV: [ROLE.ADMIN, ROLE.THU_KY_KHOA, ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON],

  /**
   * Trưởng đơn vị - nhóm được chấm điểm cấp Khoa cho phiếu KPI cá nhân.
   * Gồm cả Trưởng Phòng: phòng ban ngoài Khoa vẫn được giao chấm một số tiêu
   * chí qua bảng `tieu_chi_don_vi_cham` (ví dụ P.QLCL chấm tiêu chí phản hồi SV).
   * Ai chấm được tiêu chí NÀO thì server quyết; ở đây chỉ mở cửa vào màn hình.
   */
  TRUONG_DON_VI: [ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON, ...VAI_TRO_TRUONG_PHONG],

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
   * Lối vào màn hình ghi nhận vi phạm VIÊN CHỨC / NLĐ (LoaiDoiTuong = 2).
   * TK/TKL không thấy màn hình này theo luồng KPI Khoa. TP (kể cả kiêm nhiệm)
   * vẫn có lối vào; quyền xem sẵn có của cấp Trường và TBM được giữ nguyên.
   * Không dùng chung tập với vi phạm giảng viên.
   */
  GHI_NHAN_VI_PHAM_NHAN_VIEN: [
    ROLE.ADMIN,
    ROLE.HIEU_TRUONG,
    ROLE.PHO_HIEU_TRUONG,
    ROLE.TRUONG_BO_MON,
    ...VAI_TRO_TRUONG_PHONG,
  ],

  /**
   * Duyệt bản kê THÀNH TÍCH VƯỢT TRỘI (Nhóm II) của viên chức / NLĐ.
   *
   * Dành cho trưởng phòng chuyên trách (P.TCHC duyệt khen thưởng,
   * P.KHHTQT duyệt sáng kiến), cộng HT/Admin xem toàn trường. TK/TKL không
   * tham gia luồng duyệt này.
   *
   * Quyền gác theo TỪNG DÒNG qua `danh_muc_thanh_tich.id_don_vi_duyet`:
   * một Trưởng Phòng của P.TCHC duyệt dòng khen thưởng trên toàn trường.
   *
   * TBM bị loại (bộ môn là đơn vị cấp 3, không bao giờ là đơn vị duyệt). TKP
   * cũng bị loại dù thực tế thư ký P.TCHC là người xử lý khen thưởng: server
   * chưa cho, thêm vào đây chỉ dẫn họ tới 403.
   *
   * Tập này chỉ MỞ CỬA vào màn hình; ai duyệt được dòng nào thì server quyết -
   * gửi lẫn dòng của đơn vị khác sẽ nhận 403 FORBIDDEN_DONG cho cả request.
   */
  DUYET_KE_KHAI_THANH_TICH: [
    ...VAI_TRO_TRUONG_PHONG,
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
    ...VAI_TRO_TRUONG_PHONG,
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
  KPI_PHONG: [ROLE.THU_KY_PHONG, ...VAI_TRO_TRUONG_PHONG],

  /**
   * Giám sát hoạt động giảng dạy toàn trường: quản lý phiếu khảo sát ý kiến
   * sinh viên (/quan-ly-danh-gia-sinh-vien) và tổng hợp điểm trừ vi phạm
   * (/tong-hop-vi-pham).
   *
   * Nghiệp vụ của đúng MỘT phòng chuyên trách, nên PHẢI đi kèm
   * DON_VI_SETS.GIAM_SAT_GIANG_DAY - trưởng phòng của phòng khác không có việc
   * gì ở các màn hình này. Admin nằm ngoài ràng buộc đơn vị, xem hasDonVi().
   */
  GIAM_SAT_GIANG_DAY: [...VAI_TRO_TRUONG_PHONG, ROLE.ADMIN],

  /**
   * Giai đoạn 3 trên hồ sơ KPI của NHÂN VIÊN / VIÊN CHỨC (loai_doi_tuong = 2):
   * Trưởng phòng chốt hồ sơ của chính Phòng mình và chọn xếp loại theo mức hệ thống đề xuất.
   *
   * CỐ Ý tách khỏi TRUONG_KHOA dù server dùng CHUNG một endpoint
   * (POST phieu/{id}/khoa/duyet-ho-so mở cho cả TK/TKL/TP - xem openapi.yaml).
   * Lý do tách là MÀN HÌNH chứ không phải thẩm quyền: /quan-ly/duyet-ho-so dựng
   * cho hồ sơ giảng viên với QĐ 838 và định mức giờ NCKH. Tờ trình dùng
   * quyền TO_TRINH_DON_VI riêng, bao gồm Trưởng phòng.
   *
   * TK/TKL nằm ngoài: nhân viên văn phòng Khoa cũng là loai_doi_tuong = 2 nhưng
   * họ đã có lối đi ở /quan-ly/duyet-ho-so, màn hình đó đã rẽ nhánh theo
   * laVienChuc. Thêm TK vào đây chỉ đẻ ra hai lối vào cho cùng một hồ sơ.
   *
   * Admin có mặt để xem và hỗ trợ vận hành. Họ không giữ chức vụ TP tại đơn vị
   * nào nên laTruongPhongCuaPhieu() trả false và panel chốt tự ẩn - với Admin
   * trang chạy ở chế độ CHỈ XEM. Đây là lựa chọn có chủ đích, không phải sót.
   */
  DUYET_HO_SO_NHAN_VIEN: [...VAI_TRO_TRUONG_PHONG, ROLE.ADMIN],
};

/** Các API danh mục này chỉ xét chức vụ chính, không xét kiêm nhiệm. */
export const canManageChucVuNam = (user) => ROLE_SETS.CHUC_VU.includes(normalizeRole(user));
export const canManageNamDanhGia = (user) => ROLE_SETS.NAM_DANH_GIA.includes(normalizeRole(user));

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
/* Quyền học vụ và phân loại KPI cá nhân từ auth/me                   */
/* ------------------------------------------------------------------ */

/** Quyền xem học vụ: cấp Khoa hoặc tài khoản xem toàn trường. */
export const canManageHocVu = (user) =>
  hasRole(ROLE_SETS.ADMIN, user) ||
  ([ROLE.TRUONG_PHONG, ROLE.QUYEN_TRUONG_PHONG].includes(normalizeRole(user)) &&
    String(user?.MaDonVi || "").toUpperCase() === "P_DTBDCL") ||
  (Array.isArray(user?.DonVi) && user.DonVi.some((dv) =>
    [ROLE.TRUONG_PHONG, ROLE.QUYEN_TRUONG_PHONG].includes(String(dv.MaChucVu || "").trim().toUpperCase()) &&
    String(dv.MaDonVi || "").trim().toUpperCase() === "P_DTBDCL"
  ));

/** Xem giờ TKB: ADMIN/HT hoặc TP/QTP tại P_DTBDCL, kể cả kiêm nhiệm. */
export const canViewGioGiangTkb = (user) => {
  if (hasRole(ROLE_SETS.GIO_GIANG_TKB, user)) return true;
  const appointments = Array.isArray(user?.DonVi) && user.DonVi.length > 0
    ? user.DonVi : [user];
  return appointments.some((dv) =>
    [ROLE.TRUONG_PHONG, ROLE.QUYEN_TRUONG_PHONG].includes(normalizeRole(dv)) &&
    String(dv?.MaDonVi || "").trim().toUpperCase() === "P_DTBDCL"
  );
};

export const canViewHocVu = (user) =>
  canManageHocVu(user) || hasRole(ROLE_SETS.KPI_KHOA, user);

/** Import và chốt phản hồi SV: chức vụ và đơn vị phải cùng một bổ nhiệm. */
export const canManagePhanHoiSinhVien = (user) => {
  if (hasRole(ROLE_SETS.ADMIN, user)) return true;
  const appointments = Array.isArray(user?.DonVi) && user.DonVi.length > 0
    ? user.DonVi : [user];
  return appointments.some((dv) =>
    [ROLE.TRUONG_PHONG, ROLE.QUYEN_TRUONG_PHONG].includes(normalizeRole(dv)) &&
    String(dv?.MaDonVi || "").trim().toUpperCase() === "P_DTBDCL"
  );
};

/**
 * TP / QTP tại ĐÚNG một đơn vị (theo mã), xét cả bổ nhiệm kiêm nhiệm.
 *
 * Chức vụ và mã đơn vị phải nằm trên CÙNG MỘT bổ nhiệm - đúng nguyên tắc của
 * backend (§10.6: hai vế phải ở cùng một dòng fn_pham_vi_don_vi). Kiểm rời rạc
 * sẽ cho người là TP ở Phòng mang tư cách TP sang mọi đơn vị khác.
 */
const laTruongPhongTai = (user, maDonVi) => {
  const appointments = Array.isArray(user?.DonVi) && user.DonVi.length > 0
    ? user.DonVi : [user];
  return appointments.some((dv) =>
    VAI_TRO_TP_QTP.includes(normalizeRole(dv)) &&
    String(dv?.MaDonVi || "").trim().toUpperCase() === maDonVi);
};

/**
 * Lối vào /ty-le-hoan-thanh-gio-giang: cấp Trường và cấp Khoa theo chức vụ
 * (TY_LE_GIO_GIANG), cộng TP / QTP tại P_DTBDCL - phòng import thời khóa biểu,
 * cùng điều kiện với canViewGioGiangTkb của trang dữ liệu thô.
 *
 * Gác theo đơn vị ở đây chứ không bằng `donVi` trên mục menu: `hasDonVi` là
 * phép AND với `hasRole` nên khai `donVi` sẽ khóa luôn TK / TKL, những người
 * cần trang này nhất.
 */
export const canViewTyLeGioGiang = (user) =>
  hasRole(ROLE_SETS.TY_LE_GIO_GIANG, user) || laTruongPhongTai(user, "P_DTBDCL");

/**
 * Lối vào /diem-trung-binh-danh-gia-sinh-vien: cấp Khoa và ADMIN theo chức vụ
 * (DIEM_TB_PHAN_HOI_SV), cộng TP / QTP tại P_DTBDCL - phòng chốt điểm, cũng là
 * người duy nhất xem được toàn trường. Cùng lý do dùng hàm thay cho `donVi`
 * như canViewTyLeGioGiang.
 */
export const canXemDiemTbPhanHoiSv = (user) =>
  hasRole(ROLE_SETS.DIEM_TB_PHAN_HOI_SV, user) || laTruongPhongTai(user, "P_DTBDCL");

/** Đồng bộ NCKH: ADMIN hoặc TP/QTP tại đúng P_KH, kể cả kiêm nhiệm. */
export const canSyncNckh = (user) => {
  if (hasRole(ROLE_SETS.ADMIN, user)) return true;
  const appointments = Array.isArray(user?.DonVi) && user.DonVi.length > 0
    ? user.DonVi
    : [user];
  return appointments.some((dv) =>
    [ROLE.TRUONG_PHONG, ROLE.QUYEN_TRUONG_PHONG].includes(normalizeRole(dv)) &&
    String(dv?.MaDonVi || "").trim().toUpperCase() === "P_KH"
  );
};

/** Các loại đối tượng KPI được backend gán theo từng đơn vị của người dùng. */
export const LOAI_DOI_TUONG_KPI = {
  KHONG_DANH_GIA: 0,
  GIANG_VIEN: 1,
  VIEN_CHUC: 2,
};

export const tenLoaiDoiTuongKpi = (loai) => {
  switch (loai) {
    case 0: return "Không thuộc diện đánh giá KPI";
    case 1: return "Giảng viên";
    case 2: return "Viên chức / NLĐ";
    default: return "Chưa có phân loại đối tượng KPI";
  }
};

/** Trả về các đơn vị có loại phiếu được backend xác định tương ứng. */
export const donViTheoLoaiDoiTuong = (user, loaiDoiTuong) =>
  Array.isArray(user?.DonVi)
    ? user.DonVi.filter((donVi) => donVi?.LoaiDoiTuong === loaiDoiTuong)
    : [];

export const coLoaiDoiTuong = (user, loaiDoiTuong) =>
  donViTheoLoaiDoiTuong(user, loaiDoiTuong).length > 0;

export const coDanhGiaKpiCaNhan = (user) =>
  coLoaiDoiTuong(user, LOAI_DOI_TUONG_KPI.GIANG_VIEN) ||
  coLoaiDoiTuong(user, LOAI_DOI_TUONG_KPI.VIEN_CHUC);

/**
 * Đường dẫn form tự đánh giá đúng ngạch của người dùng.
 *
 * @returns {string|null} null khi người dùng không thuộc ngạch nào có phiếu KPI cá nhân
 */
export const duongDanPhieuTuDanhGia = (user, idNam) => {
  const query = idNam ? `?year=${idNam}` : "";
  const donViList = Array.isArray(user?.DonVi) ? user.DonVi : [];
  const donViChinh = donViList.find((donVi) => donVi?.LaChinh);
  const donViDaPhanLoai =
    (donViChinh?.LoaiDoiTuong === LOAI_DOI_TUONG_KPI.GIANG_VIEN ||
    donViChinh?.LoaiDoiTuong === LOAI_DOI_TUONG_KPI.VIEN_CHUC)
      ? donViChinh
      : donViList.find(
          (donVi) =>
            donVi?.LoaiDoiTuong === LOAI_DOI_TUONG_KPI.GIANG_VIEN ||
            donVi?.LoaiDoiTuong === LOAI_DOI_TUONG_KPI.VIEN_CHUC,
        );
  if (donViDaPhanLoai?.LoaiDoiTuong === LOAI_DOI_TUONG_KPI.GIANG_VIEN) {
    return `/danh-gia-phu-luc-2${query}`;
  }
  if (donViDaPhanLoai?.LoaiDoiTuong === LOAI_DOI_TUONG_KPI.VIEN_CHUC) {
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
