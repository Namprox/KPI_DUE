import { matchPath } from "react-router-dom";
import {
  ROLE_SETS,
  CHUC_DANH_SETS,
  MOI_NGUOI,
  hasRole,
  hasChucDanh,
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
        // Phiếu tự đánh giá theo ngạch giảng viên — không xét chức vụ.
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
        // Chấm cho cả đơn vị: thư ký Khoa/Phòng nhập, trưởng đơn vị ký.
        // Đây là quyền theo chức vụ nên KHÔNG gate theo chức danh.
        name: "Đánh giá KPI Đơn vị",
        icon: "fa-solid fa-users-gear",
        path: "/danh-gia-kpi-don-vi",
        roles: ROLE_SETS.DANH_GIA_DON_VI,
      },
      {
        name: "Lịch sử đánh giá",
        icon: "fa-solid fa-clock-rotate-left",
        path: "/lich-su-danh-gia",
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
        // Tra cứu minh chứng của chính mình, xuyên năm. Chỉ đọc — server tự giới
        // hạn về người đăng nhập nên không cần gate theo chức vụ/chức danh.
        name: "Kho minh chứng",
        icon: "fa-solid fa-folder-tree",
        path: "/kho-minh-chung",
        roles: MOI_NGUOI,
      },
    ],
  },
  {
    // Phân hệ của TRƯỞNG ĐƠN VỊ (TK/TKL/TP): chấm điểm cấp Khoa cho phiếu KPI
    // cá nhân. Khác hẳn nhóm "Quản lý đánh giá" của Hiệu trưởng — HT duyệt/chốt
    // chứ không chấm tiêu chí, nên hai nhóm không dùng chung màn hình.
    key: "unitScoring",
    label: "Chấm điểm KPI đơn vị",
    icon: "fa-clipboard-check",
    items: [
      {
        name: "Hàng đợi chờ chấm",
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
        // Cùng màn hình với mục "Ghi nhận vi phạm" ở nhóm kế hoạch — chỉ khác
        // lối vào dành cho trưởng đơn vị, không nhân bản trang.
        name: "Ghi nhận vi phạm",
        icon: "fa-solid fa-circle-exclamation",
        path: "/quan-ly/vi-pham",
        roles: ROLE_SETS.TRUONG_DON_VI,
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
    label: "Thiết lập kế hoạch",
    icon: "fa-calendar-check",
    items: [
      {
        name: "Danh sách phiếu đánh giá",
        icon: "fa-solid fa-clipboard-check",
        path: "/quan-ly-phieu",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Quản lý năm đánh giá",
        icon: "fa-solid fa-calendar-days",
        path: "/quan-ly-nam-danh-gia",
        roles: ROLE_SETS.QUAN_TRI,
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
        name: "Ghi nhận vi phạm",
        icon: "fa-solid fa-circle-exclamation",
        path: "/quan-ly-vi-pham",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Tổng hợp điểm trừ vi phạm",
        icon: "fa-solid fa-square-poll-vertical",
        path: "/tong-hop-vi-pham",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Thống kê vi phạm của Khoa",
        icon: "fa-solid fa-chart-pie",
        path: "/thong-ke-vi-pham-khoa",
        roles: ROLE_SETS.TRUONG_KHOA,
      },
      {
        name: "Quản lý đánh giá sinh viên",
        icon: "fa-solid fa-user-graduate",
        path: "/quan-ly-danh-gia-sinh-vien",
        roles: ROLE_SETS.QUAN_TRI,
      },
      {
        name: "Điểm trung bình ĐGSV",
        icon: "fa-solid fa-square-poll-vertical",
        path: "/diem-trung-binh-danh-gia-sinh-vien",
        roles: ROLE_SETS.QUAN_TRI,
      },
    ],
  },
  {
    key: "criteriaMgmt",
    label: "Quản lý tiêu chí",
    icon: "fa-list-check",
    items: [
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
        roles: ROLE_SETS.QUAN_TRI,
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
    key: "evaluationMgmt",
    label: "Quản lý đánh giá",
    icon: "fa-check-double",
    items: [
      {
        name: "Danh sách duyệt phiếu",
        icon: "fa-solid fa-file-pen",
        path: "/danh-sach-duyet-phieu",
        roles: ROLE_SETS.QUAN_TRI,
        childPaths: ["/chi-tiet-duyet-phieu"],
      },
    ],
  },
];

const buildRouteRules = () => {
  const rules = [...PUBLIC_ROUTES];
  MENU_GROUPS.forEach((group) => {
    group.items.forEach((item) => {
      const rule = { roles: item.roles, chucDanh: item.chucDanh };
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

export const canAccessRule = (rule, user) =>
  hasRole(rule.roles, user) && hasChucDanh(rule.chucDanh, user);

export const canAccessPath = (pathname, user) => {
  const rule = findRouteRule(pathname);
  if (!rule) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[phân quyền] Route "${pathname}" chưa được khai trong menuConfig.js ` +
          `— đang bị chặn. Thêm nó vào MENU_GROUPS (hoặc childPaths của mục cha).`,
      );
    }
    return false;
  }
  return canAccessRule(rule, user);
};

export const visibleItems = (group, user) =>
  group.items.filter((item) => canAccessRule(item, user));

export const visibleGroups = (user) =>
  MENU_GROUPS.map((group) => ({
    ...group,
    items: visibleItems(group, user),
  })).filter((group) => group.items.length > 0);
