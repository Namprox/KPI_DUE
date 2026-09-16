import { matchPath } from "react-router-dom";
import {
  ROLE_SETS,
  CHUC_DANH_SETS,
  DON_VI_SETS,
  MOI_NGUOI,
  hasRole,
  hasChucDanh,
  hasDonVi,
} from "../utils/roles";

export const PUBLIC_ROUTES = [
  { path: "/", roles: MOI_NGUOI },
  { path: "/thong-tin-lien-he", roles: MOI_NGUOI },
];

export const MENU_GROUPS = [
  {
    key: "evaluation",
    label: "Đánh giá KPI",
    icon: "fa-check-double",
    items: [
      {
        name: "[Mock] Thẩm định NV",
        icon: "fa-solid fa-eye",
        path: "/mock-tham-dinh-nhan-vien",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Danh sách duyệt",
        icon: "fa-solid fa-users-viewfinder",
        path: "/mock-danh-sach-nhan-vien",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Xem kết quả NV",
        icon: "fa-solid fa-file-invoice",
        path: "/mock-chi-tiet-nhan-vien",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Tờ trình NV",
        icon: "fa-solid fa-file-signature",
        path: "/mock-to-trinh-nhan-vien",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Đánh giá GV",
        icon: "fa-solid fa-chalkboard-user",
        path: "/mock-danh-gia-giang-vien",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Duyệt KPI GV",
        icon: "fa-solid fa-user-check",
        path: "/mock-tham-dinh-giang-vien",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Đánh giá Khoa",
        icon: "fa-solid fa-building-columns",
        path: "/mock-danh-gia-khoa",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Đánh giá Phòng",
        icon: "fa-solid fa-building-user",
        path: "/mock-danh-gia-phong",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Đánh giá Quản lý Khoa",
        icon: "fa-solid fa-user-tie",
        path: "/mock-danh-gia-quan-ly-khoa",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Xét duyệt Trường",
        icon: "fa-solid fa-ranking-star",
        path: "/mock-bang-xep-hang-don-vi",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Đề xuất tăng hạng",
        icon: "fa-solid fa-arrow-trend-up",
        path: "/mock-de-xuat-tang-hang",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Hiệu trưởng phê duyệt",
        icon: "fa-solid fa-chart-column",
        path: "/mock-hieu-truong-duyet",
        roles: MOI_NGUOI,
      },
      {
        name: "[Mock] Thống kê toàn trường",
        icon: "fa-solid fa-chart-pie",
        path: "/mock-thong-ke-toan-truong",
        roles: MOI_NGUOI,
      },
      {
        // Phiếu tự đánh giá theo ngạch giảng viên - không xét chức vụ.
        name: "Đánh giá KPI Giảng viên",
        icon: "fa-solid fa-file-pen",
        path: "/danh-gia-phu-luc-2",
        roles: MOI_NGUOI,
        chucDanh: CHUC_DANH_SETS.GIANG_VIEN,
      },
      {
        // Phiếu tự đánh giá theo ngạch viên chức / người lao động.
        name: "Đánh giá KPI Nhân viên",
        icon: "fa-solid fa-file-pen",
        path: "/danh-gia-kpi-nhan-vien",
        roles: MOI_NGUOI,
        chucDanh: CHUC_DANH_SETS.NHAN_VIEN,
      },
      {
        // Phiếu KPI của cả ĐƠN VỊ (Khoa/Phòng), chạy trên bộ API riêng
        // /api/phieu-don-vi với máy trạng thái riêng - không liên quan tới phiếu
        // KPI cá nhân ở hai mục trên.
        //
        // Gate theo NHAP_PHIEU_DON_VI (chỉ TKK) chứ không phải DANH_GIA_DON_VI:
        // màn hình mới dựng phần việc nhập của thư ký, chưa có màn hình cho cấp
        // duyệt. Không xét chức danh - đây là việc theo chức vụ.
        name: "Đánh giá KPI Đơn vị",
        icon: "fa-solid fa-building-columns",
        path: "/danh-gia-kpi-don-vi",
        roles: ROLE_SETS.NHAP_PHIEU_DON_VI,
        childPaths: ["/danh-gia-kpi-don-vi/:id"],
      },
      {
        // Phiếu KPI của PHÒNG / TRUNG TÂM - cùng bộ API /api/phieu-don-vi với mục
        // trên, nhưng mẫu loại 4: nhóm tiêu chí phẳng (loai_nhom = NULL), tổng
        // điểm cộng thẳng, ngưỡng xếp loại 80/60/50.
        //
        // Tách thành mục riêng cho TKP nhập/trình và TP chấm/duyệt. HT xem và
        // duyệt ở màn hình cấp Trường riêng, nên không được mở mục hoặc route
        // này. Phân quyền theo từng thao tác nằm ở quyenPhieuPhong().
        name: "Đánh giá KPI Phòng",
        icon: "fa-solid fa-building-user",
        path: "/danh-gia-kpi-phong",
        roles: ROLE_SETS.KPI_PHONG,
        childPaths: ["/danh-gia-kpi-phong/:id"],
      },
      {
        name: "Lịch sử đánh giá",
        icon: "fa-solid fa-clock-rotate-left",
        path: "/lich-su-danh-gia",
        // Bản chỉ đọc của màn hình chấm điểm, mở từ nút trong bảng. Cùng quyền
        // với trang cha vì server đã giới hạn phiếu về đúng người đăng nhập.
        childPaths: ["/lich-su-danh-gia/:id"],
        roles: MOI_NGUOI,
      },
      {
        // Kết quả khảo sát ý kiến sinh viên của chính mình. Gate theo NGẠCH chứ
        // không theo chức vụ: dữ liệu khảo sát chỉ phát sinh cho người đứng lớp,
        // và server đã tự giới hạn theo mã cán bộ nên đây chỉ là lối vào.
        name: "Phản hồi sinh viên",
        icon: "fa-solid fa-star-half-stroke",
        path: "/phan-hoi-sinh-vien-cua-toi",
        roles: MOI_NGUOI,
        chucDanh: CHUC_DANH_SETS.GIANG_VIEN,
      },
      {
        // KPI Nhóm III: phục vụ cộng đồng và các nhiệm vụ khác, theo phân công
        // của Khoa. Server suy người dùng TỪ TOKEN nên đây chỉ là lối vào; gate
        // theo NGẠCH giống "Phản hồi sinh viên" vì chỉ giảng viên của Khoa mới
        // phát sinh dữ liệu này.
        name: "Phục vụ cộng đồng",
        icon: "fa-solid fa-hands-holding-circle",
        path: "/nhiem-vu-khoa-cua-toi",
        roles: MOI_NGUOI,
        chucDanh: CHUC_DANH_SETS.GIANG_VIEN,
      },
      {
        // Kê khai giờ quy đổi theo PHỤ LỤC II - "quy đổi các hoạt động chuyên
        // môn ra giờ chuẩn giảng dạy". Giảng viên TỰ kê số lượng từng đầu việc,
        // TK/TKL duyệt từng dòng. Server suy người dùng TỪ TOKEN nên đây chỉ là
        // lối vào; gate theo NGẠCH vì chỉ giảng viên mới có định mức giờ chuẩn.
        name: "Kê khai giờ quy đổi",
        icon: "fa-solid fa-stopwatch",
        path: "/ke-khai-gio-quy-doi",
        roles: MOI_NGUOI,
        chucDanh: CHUC_DANH_SETS.GIANG_VIEN,
      },
      {
        // Song sinh của mục trên cho VIÊN CHỨC / NLĐ: kê khai THÀNH TÍCH VƯỢT
        // TRỘI (Nhóm II - sáng kiến, khen thưởng, đào tạo, phong trào). Nhân
        // viên TỰ kê từng thành tích, đơn vị phụ trách duyệt từng dòng.
        //
        // Server suy người dùng TỪ TOKEN nên đây chỉ là lối vào.
        //
        // ⚠️ `chucDanh` bên dưới KHÔNG phải luật quyết định: đường dẫn này nằm
        // trong DUONG_DAN_NGACH_NHAN_VIEN nên canAccessRule() xử lý riêng, cho
        // qua cả người thuộc đơn vị ngoài Khoa dù chức danh trống hoặc lệch
        // ngạch. Giữ lại trường này cho khớp cách khai của "Đánh giá KPI Nhân
        // viên"; sửa luật thì sửa ở canAccessRule.
        name: "Kê khai thành tích",
        icon: "fa-solid fa-medal",
        path: "/ke-khai-thanh-tich",
        roles: MOI_NGUOI,
        chucDanh: CHUC_DANH_SETS.NHAN_VIEN,
      },
      {
        // Công trình NCKH đồng bộ từ hệ thống nghiên cứu khoa học của trường -
        // nguồn của các tiêu chí NCKH chấm tự động. Endpoint /api/nckh/* nhận
        // id_nhan_vien qua query (không suy từ token) nhưng màn hình chỉ truyền
        // id của chính người đăng nhập; gate theo NGẠCH vì chỉ giảng viên mới có
        // tiêu chí NCKH trong phiếu.
        name: "Thành tích NCKH",
        icon: "fa-solid fa-flask",
        path: "/thanh-tich-nckh",
        roles: MOI_NGUOI,
        chucDanh: CHUC_DANH_SETS.GIANG_VIEN,
      },
      {
        // Vi phạm giảng dạy do đơn vị ghi nhận cho chính mình (điểm trừ KPI).
        // Server tự giới hạn GET /viphamgiangday về người đăng nhập, nên đây chỉ
        // là lối vào; gate theo NGẠCH vì chỉ giảng viên thuộc Khoa mới bị ghi nhận.
        name: "Vi phạm của tôi",
        icon: "fa-solid fa-triangle-exclamation",
        path: "/vi-pham-cua-toi",
        roles: MOI_NGUOI,
        chucDanh: CHUC_DANH_SETS.GIANG_VIEN,
      },
      {
        // Tra cứu minh chứng của chính mình, xuyên năm. Chỉ đọc - server tự giới
        // hạn về người đăng nhập nên không cần gate theo chức vụ/chức danh.
        name: "Kho minh chứng cá nhân",
        icon: "fa-solid fa-folder-tree",
        path: "/kho-minh-chung",
        roles: MOI_NGUOI,
      },
      {
        // Kho chỉ đọc dùng chung cho phiếu KPI Khoa và Phòng/Trung tâm. Server
        // tự giới hạn dữ liệu về đơn vị của người đang đăng nhập.
        name: "Kho minh chứng đơn vị",
        icon: "fa-solid fa-building-circle-check",
        path: "/kho-minh-chung-don-vi",
        roles: ROLE_SETS.KHO_MINH_CHUNG_DON_VI,
      },
    ],
  },
  {
    // Phân hệ của TRƯỞNG ĐƠN VỊ (TK/TKL/TP): chấm điểm cấp Khoa cho phiếu KPI
    // cá nhân. Khác hẳn nhóm "Quản lý đánh giá" của Hiệu trưởng - HT duyệt/chốt
    // chứ không chấm tiêu chí, nên hai nhóm không dùng chung màn hình.
    key: "unitScoring",
    label: "Chấm điểm KPI đơn vị",
    icon: "fa-clipboard-check",
    items: [
      {
        // Giai đoạn 2 - lối vào duy nhất của chuyên viên thẩm định. Hàng đợi
        // theo TỪNG DÒNG tiêu chí (/quan-ly/tham-dinh) đã bị ẩn khỏi menu và
        // AppRoutes: nó không xem được minh chứng nên vẫn phải mở hồ sơ để
        // chấm, thành ra chỉ nhân đôi lối đi. File màn hình vẫn còn ở
        // pages/QuanLyChamDiem/HangDoiThamDinh.js nếu cần bật lại.
        name: "Hồ sơ chờ thẩm định",
        icon: "fa-solid fa-inbox",
        path: "/quan-ly/cho-cham",
        roles: ROLE_SETS.TRUONG_DON_VI,
      },
      {
        name: "Phiếu toàn đơn vị",
        icon: "fa-solid fa-folder-open",
        path: "/quan-ly/phieu",
        roles: ROLE_SETS.TRUONG_DON_VI,
        // Màn hình chấm và hồ sơ tra cứu không có mục sidebar riêng nhưng phải
        // được khai ở đây, nếu không <RequireRole> sẽ chặn khi mở bằng URL.
        childPaths: ["/quan-ly/phieu/:id", "/quan-ly/giang-vien/:idNv"],
      },
      {
        // Giai đoạn 3 - thẩm quyền của TRƯỞNG KHOA, Trưởng Phòng không vào được.
        name: "Duyệt hồ sơ KPI",
        icon: "fa-solid fa-user-check",
        path: "/quan-ly/duyet-ho-so",
        roles: ROLE_SETS.TRUONG_KHOA,
        childPaths: ["/quan-ly/duyet-ho-so/:id"],
      },
      {
        // Giai đoạn 3 phía PHÒNG - Trưởng phòng chốt hồ sơ nhân viên / viên chức
        // của chính Phòng mình. Song song với "Duyệt hồ sơ KPI" ở trên (của
        // Trưởng khoa, hồ sơ giảng viên): hai tập vai trò RỜI NHAU nên một người
        // chỉ thấy đúng một trong hai mục.
        //
        // Server dùng chung một endpoint cho cả hai (POST phieu/{id}/khoa/
        // duyet-ho-so mở cho TK/TKL/TP), nên đây là tách MÀN HÌNH chứ không phải
        // tách thẩm quyền - màn hình của Trưởng khoa đầy thứ không áp dụng cho
        // Phòng (QĐ 838, định mức NCKH, hạn ngạch xuất sắc, tờ trình Khoa).
        //
        // Chấm điểm từng tiêu chí (giai đoạn 2) KHÔNG ở đây - Trưởng phòng dùng
        // chung /quan-ly/phieu/:id với mọi trưởng đơn vị khác.
        name: "Chốt hồ sơ nhân viên",
        icon: "fa-solid fa-user-shield",
        path: "/quan-ly/ho-so-nhan-vien",
        roles: ROLE_SETS.DUYET_HO_SO_NHAN_VIEN,
        // Màn hình chốt không có mục sidebar riêng nhưng PHẢI khai ở đây, nếu
        // không <RequireRole> chặn khi mở bằng URL (canAccessPath fail closed).
        childPaths: ["/quan-ly/ho-so-nhan-vien/:id"],
      },
      {
        // Giai đoạn 4 phía Khoa - đóng gói hạn ngạch xuất sắc rồi trình Hiệu trưởng.
        name: "Tờ trình KPI Khoa",
        icon: "fa-solid fa-file-signature",
        path: "/quan-ly/to-trinh",
        roles: ROLE_SETS.TRUONG_KHOA,
      },
      {
        // Duyệt bản kê giờ quy đổi (Phụ lục II) của giảng viên trong phạm vi
        // đơn vị. Trục nghiệp vụ RIÊNG, không nằm trong máy trạng thái của phiếu
        // KPI: module cố ý chưa ghi vào gio_thuc_hien_gv, chỉ lưu và phát API
        // đọc cho bước cộng với giờ giảng dạy sau này.
        //
        // Tập vai trò rộng hơn các mục khác của nhóm (thêm HT/Admin) vì server
        // cho hai chức vụ đó xem toàn trường - xem ROLE_SETS.DUYET_KE_KHAI_GIO.
        name: "Duyệt kê khai giờ quy đổi",
        icon: "fa-solid fa-stopwatch",
        path: "/quan-ly/ke-khai-gio-quy-doi",
        roles: ROLE_SETS.DUYET_KE_KHAI_GIO,
        childPaths: ["/quan-ly/ke-khai-gio-quy-doi/:id"],
      },
      {
        // Duyệt bản kê thành tích vượt trội của viên chức / NLĐ.
        //
        // Khác mọi mục còn lại của nhóm ở chỗ phạm vi KHÔNG phải "đơn vị mình +
        // đơn vị con": quyền gác theo TỪNG DÒNG qua đơn vị phụ trách của mức, nên
        // Trưởng Phòng P.TCHC thấy dòng khen thưởng của nhân viên TOÀN TRƯỜNG.
        // Vì vậy dùng tập vai trò riêng - xem ROLE_SETS.DUYET_KE_KHAI_THANH_TICH.
        name: "Duyệt kê khai thành tích",
        icon: "fa-solid fa-medal",
        path: "/quan-ly/ke-khai-thanh-tich",
        roles: ROLE_SETS.DUYET_KE_KHAI_THANH_TICH,
        childPaths: ["/quan-ly/ke-khai-thanh-tich/:id"],
      },
      {
        name: "Báo cáo đơn vị",
        icon: "fa-solid fa-chart-line",
        path: "/quan-ly/bao-cao",
        roles: ROLE_SETS.TRUONG_DON_VI,
      },
    ],
  },
  {
    key: "planMgmt",
    label: "Thiết lập đánh giá KPI",
    icon: "fa-calendar-check",
    items: [
      {
        name: "Quản lý năm đánh giá",
        icon: "fa-solid fa-calendar-days",
        path: "/quan-ly-nam-danh-gia",
        roles: ROLE_SETS.NAM_DANH_GIA,
      },
      {
        name: "Định mức giảng viên",
        icon: "fa-solid fa-scale-balanced",
        path: "/quan-ly-dinh-muc-giang-vien",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Ngoại lệ định mức",
        icon: "fa-solid fa-file-contract",
        path: "/quan-ly-ngoai-le-dinh-muc",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Quản lý giờ giảng",
        icon: "fa-solid fa-scale-balanced",
        path: "/quan-ly-gio-giang",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Danh mục loại vi phạm",
        icon: "fa-solid fa-list-check",
        path: "/danh-muc-loai-vi-pham",
        roles: ROLE_SETS.ADMIN,
      },
      {
        // Danh mục điểm CỘNG đối xứng với mục trên: cây 2 cấp của Nhóm II
        // (4 tiêu chí + các mức quy đổi).
        //
        // Ngoài việc sửa điểm quy đổi, đây còn là nơi DUY NHẤT gán "đơn vị phụ
        // trách" cho từng mức. Danh mục được seed để trống toàn bộ vì id của
        // P.TCHC / P.KHHTQT khác nhau theo từng lần triển khai; chưa gán thì mọi
        // dòng rơi về trưởng đơn vị quản lý trực tiếp và phòng chuyên trách
        // không thấy gì để duyệt.
        name: "Danh mục thành tích vượt trội",
        icon: "fa-solid fa-trophy",
        path: "/danh-muc-thanh-tich",
        roles: ROLE_SETS.ADMIN,
      },
      {
        // Lối vào DUY NHẤT của màn hình ghi nhận vi phạm. Trước đây nhóm
        // "Chấm điểm KPI đơn vị" còn một mục nữa trỏ vào cùng trang qua
        // /quan-ly/vi-pham; giữ đường dẫn đó làm childPath để các link cũ
        // (ví dụ nút trong Hồ sơ KPI giảng viên) không bị RequireRole chặn.
        name: "Ghi nhận vi phạm giảng viên",
        icon: "fa-solid fa-circle-exclamation",
        path: "/quan-ly-vi-pham",
        roles: ROLE_SETS.GHI_NHAN_VI_PHAM,
        childPaths: ["/quan-ly/vi-pham"],
      },
      {
        // Song sinh của mục trên cho VIÊN CHỨC / NLĐ (LoaiDoiTuong = 2): cùng bộ
        // endpoint api/viphamgiangday, khác danh mục nhóm/loại và luật mức trừ
        // (CheDoDiemTru). Tách màn hình vì hai đối tượng có tập người, tập loại
        // vi phạm và cách áp trần điểm khác hẳn nhau.
        //
        // Giữ đường dẫn mock cũ làm childPath để các link đã chia sẻ không bị
        // RequireRole chặn.
        name: "Ghi nhận vi phạm nhân viên",
        icon: "fa-solid fa-user-xmark",
        path: "/ghi-nhan-vi-pham-nhan-vien",
        roles: ROLE_SETS.GHI_NHAN_VI_PHAM,
        childPaths: ["/mock-ghi-nhan-vi-pham-nv"],
      },
      {
        // Cùng luật vào trang với "Quản lý đánh giá sinh viên": chức vụ Trưởng
        // Phòng VÀ thuộc đúng phòng giám sát giảng dạy (Admin được miễn ràng
        // buộc đơn vị).
        name: "Tổng hợp điểm trừ vi phạm",
        icon: "fa-solid fa-square-poll-vertical",
        path: "/tong-hop-vi-pham",
        roles: ROLE_SETS.GIAM_SAT_GIANG_DAY,
        donVi: DON_VI_SETS.GIAM_SAT_GIANG_DAY,
      },
      {
        name: "Thống kê vi phạm của Khoa",
        icon: "fa-solid fa-chart-pie",
        path: "/thong-ke-vi-pham-khoa",
        roles: ROLE_SETS.TRUONG_KHOA,
      },
      {
        // Hai điều kiện phải cùng đúng: chức vụ Trưởng Phòng VÀ thuộc đúng phòng
        // giám sát giảng dạy. Đây là màn hình nghiệp vụ của riêng phòng đó,
        // không phải màn hình quản trị dữ liệu chung.
        name: "Quản lý đánh giá sinh viên",
        icon: "fa-solid fa-user-graduate",
        path: "/quan-ly-danh-gia-sinh-vien",
        roles: ROLE_SETS.GIAM_SAT_GIANG_DAY,
        donVi: DON_VI_SETS.GIAM_SAT_GIANG_DAY,
      },
      {
        name: "Điểm trung bình ĐGSV",
        icon: "fa-solid fa-square-poll-vertical",
        path: "/diem-trung-binh-danh-gia-sinh-vien",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        // Khoa nhập nhiệm vụ phục vụ cộng đồng và phân công vai trò cho giảng
        // viên (KPI Nhóm III). Chỉ TK/TKL được vào; nút Chốt kỳ trên màn hình
        // vẫn phụ thuộc cờ CanChot của server.
        name: "Ghi nhận phục vụ cộng đồng",
        icon: "fa-solid fa-hands-holding-circle",
        path: "/quan-ly/nhiem-vu-khoa",
        roles: ROLE_SETS.NHIEM_VU_KHOA,
      },
    ],
  },
  {
    key: "criteriaMgmt",
    label: "Quản lý tiêu chí",
    icon: "fa-list-check",
    items: [
      {
        name: "[Mock] Cấu hình Admin",
        icon: "fa-solid fa-sliders",
        path: "/mock-admin-mau-phieu",
        roles: MOI_NGUOI,
      },
      {
        name: "Nhóm tiêu chí",
        icon: "fa-solid fa-layer-group",
        path: "/nhom-tieu-chi",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Tiêu chí đánh giá",
        icon: "fa-solid fa-list-ol",
        path: "/tieu-chi-danh-gia",
        roles: ROLE_SETS.QUAN_TRI,
        childPaths: ["/:tieuChiId/thang-diem"],
      },
      {
        name: "Mẫu phiếu đánh giá",
        icon: "fa-solid fa-file-invoice",
        path: "/mau-danh-gia",
        roles: ROLE_SETS.QUAN_TRI,
        childPaths: ["/mau-danh-gia/:idMau/phan-quyen"],
      },
    ],
  },
  {
    key: "orgMgmt",
    label: "Cơ cấu tổ chức",
    icon: "fa-users-gear",
    items: [
      {
        name: "Cơ cấu đơn vị",
        icon: "fa-solid fa-sitemap",
        path: "/quan-ly-don-vi",
        roles: ROLE_SETS.QUAN_TRI,
        childPaths: ["/quan-ly-don-vi/:maDonVi/danh-sach-thanh-vien"],
      },
      {
        name: "Người dùng",
        icon: "fa-solid fa-users",
        path: "/quan-ly-nguoi-dung",
        roles: ROLE_SETS.QUAN_LY_NGUOI_DUNG,
        childPaths: [
          "/quan-ly-nguoi-dung/them-moi",
          "/quan-ly-nguoi-dung/chi-tiet/:id",
        ],
      },
      {
        name: "Chức danh nghề nghiệp",
        icon: "fa-solid fa-chalkboard-user",
        path: "/quan-ly-chuc-danh",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Quản lý chức vụ",
        icon: "fa-solid fa-briefcase",
        path: "/quan-ly-chuc-vu",
        roles: ROLE_SETS.QUAN_TRI,
      },
    ],
  },
  {
    // Phân hệ CẤP TRƯỜNG. Hiệu trưởng không còn duyệt từng phiếu lẻ: đơn vị
    // thao tác là cả GÓI KPI của một Khoa (tờ trình).
    key: "evaluationMgmt",
    label: "Quản lý đánh giá",
    icon: "fa-check-double",
    items: [
      {
        name: "Duyệt tờ trình KPI",
        icon: "fa-solid fa-stamp",
        path: "/truong/to-trinh",
        roles: ROLE_SETS.CAP_TRUONG,
      },
      {
        name: "Theo dõi phiếu toàn trường",
        icon: "fa-solid fa-binoculars",
        path: "/truong/phieu",
        roles: ROLE_SETS.CAP_TRUONG,
      },
    ],
  },
];

const buildRouteRules = () => {
  const rules = [...PUBLIC_ROUTES];
  MENU_GROUPS.forEach((group) => {
    group.items.forEach((item) => {
      const rule = {
        roles: item.roles,
        chucDanh: item.chucDanh,
        donVi: item.donVi,
      };
      rules.push({ path: item.path, ...rule });
      (item.childPaths || []).forEach((child) => {
        rules.push({ path: child, ...rule });
      });
    });
  });
  return rules.sort(
    (a, b) => Number(a.path.includes(":")) - Number(b.path.includes(":")),
  );
};

export const ROUTE_RULES = buildRouteRules();

export const findRouteRule = (pathname) =>
  ROUTE_RULES.find((rule) => matchPath(rule.path, pathname)) || null;

/**
 * Các trang dành cho NGẠCH viên chức / người lao động.
 *
 * `IdChucDanh` một mình KHÔNG đủ để nhận ra nhóm này: nhiều tài khoản để trống
 * chức danh, và người kiêm nhiệm có thể mang chức danh giảng viên nhưng làm
 * việc ở Phòng/Trung tâm. Vì vậy mọi trang ở đây dùng chung luật hai nhánh bên
 * dưới - đúng chức danh HOẶC thuộc một đơn vị ngoài Khoa.
 *
 * Thêm trang mới của nhóm này thì khai vào đây, đừng chỉ đặt
 * `chucDanh: CHUC_DANH_SETS.NHAN_VIEN` ở mục menu: nhánh đó fail-closed nên sẽ
 * ẩn mục với chính những người cần dùng nó.
 */
const DUONG_DAN_NGACH_NHAN_VIEN = [
  "/danh-gia-kpi-nhan-vien",
  "/ke-khai-thanh-tich",
];

export const canAccessRule = (rule, user) => {
  if (!user) return false;

  // Xử lý đặc biệt cho 2 mẫu tự đánh giá khi kiêm nhiệm:
  // - Nếu có đơn vị Khoa (K_) + chức danh giảng viên => được vào /danh-gia-phu-luc-2
  // - Nếu có đơn vị ngoài Khoa (Phòng, TT...) => được vào /danh-gia-kpi-nhan-vien
  if (rule.path === "/danh-gia-phu-luc-2") {
    if (hasChucDanh(CHUC_DANH_SETS.GIANG_VIEN, user)) return true;
    if (
      Array.isArray(user?.DonVi) &&
      user.DonVi.some((d) => String(d.MaDonVi || "").startsWith("K_")) &&
      user?.IdChucDanh
    ) {
      return true;
    }
    return false;
  }

  if (DUONG_DAN_NGACH_NHAN_VIEN.includes(rule.path)) {
    if (hasChucDanh(CHUC_DANH_SETS.NHAN_VIEN, user)) return true;
    if (
      Array.isArray(user?.DonVi) &&
      user.DonVi.some((d) => !String(d.MaDonVi || "").startsWith("K_"))
    ) {
      return true;
    }
    return false;
  }

  // Nếu rule yêu cầu cả đơn vị lẫn chức vụ cụ thể
  if (rule.donVi && rule.roles && rule.roles !== MOI_NGUOI) {
    if (hasRole(ROLE_SETS.ADMIN, user)) return true;
    if (Array.isArray(user?.DonVi)) {
      const match = user.DonVi.some((dv) => {
        const r = String(dv.MaChucVu || "")
          .trim()
          .toUpperCase();
        return (
          rule.donVi.includes(Number(dv.IdDonVi)) && rule.roles.includes(r)
        );
      });
      if (match) return true;
    }
  }

  return (
    hasRole(rule.roles, user) &&
    hasChucDanh(rule.chucDanh, user) &&
    hasDonVi(rule.donVi, user)
  );
};

export const canAccessPath = (pathname, user) => {
  const rule = findRouteRule(pathname);
  if (!rule) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[phân quyền] Route "${pathname}" chưa được khai trong menuConfig.js ` +
        `- đang bị chặn. Thêm nó vào MENU_GROUPS (hoặc childPaths của mục cha).`,
      );
    }
    return false;
  }
  return canAccessRule(rule, user);
};

/**
 * Mục menu đặt tên "[Mock] ..." là trang demo/dựng thử: vẫn vào được bằng URL
 * trực tiếp (ROUTE_RULES không đổi) nhưng không hiện trên sidebar.
 */
const laMucMock = (item) => String(item?.name || "").startsWith("[Mock]");

export const visibleItems = (group, user) =>
  group.items.filter((item) => !laMucMock(item) && canAccessRule(item, user));

export const visibleGroups = (user) =>
  MENU_GROUPS.map((group) => ({
    ...group,
    items: visibleItems(group, user),
  })).filter((group) => group.items.length > 0);
