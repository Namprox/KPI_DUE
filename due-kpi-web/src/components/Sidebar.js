import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/Sidebar.css";
import logoImage from "../images/logo.png";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/viPhamPermissions";

const menuStructure = {
  evaluation: [
    {
      name: "Đánh giá KPI Giảng viên",
      icon: "fa-solid fa-file-pen",
      path: "/danh-gia-phu-luc-2",
    },
    {
      name: "Đánh giá KPI Nhân viên",
      icon: "fa-solid fa-file-pen",
      path: "/danh-gia-kpi-nhan-vien",
    },
    {
      name: "Đánh giá KPI Đơn vị",
      icon: "fa-solid fa-users-gear",
      path: "/danh-gia-kpi-don-vi",
    },
    {
      name: "Lịch sử đánh giá",
      icon: "fa-solid fa-clock-rotate-left",
      path: "/lich-su-danh-gia",
    },
  ],
  planMgmt: [
    {
      name: "Danh sách phiếu đánh giá",
      icon: "fa-solid fa-clipboard-check",
      path: "/quan-ly-phieu",
    },
    {
      name: "Quản lý năm đánh giá",
      icon: "fa-solid fa-calendar-days",
      path: "/quan-ly-nam-danh-gia",
    },
    {
      name: "Định mức giảng viên",
      icon: "fa-solid fa-scale-balanced",
      path: "/quan-ly-dinh-muc-giang-vien",
    },
    {
      name: "Ngoại lệ định mức",
      icon: "fa-solid fa-file-contract",
      path: "/quan-ly-ngoai-le-dinh-muc",
    },
    {
      name: "Quản lý giờ giảng",
      icon: "fa-solid fa-scale-balanced",
      path: "/quan-ly-gio-giang",
    },
    {
      name: "Danh mục loại vi phạm",
      icon: "fa-solid fa-list-check",
      path: "/danh-muc-loai-vi-pham",
      roles: ["ADMIN"],
    },
    {
      name: "Ghi nhận vi phạm",
      icon: "fa-solid fa-circle-exclamation",
      path: "/quan-ly-vi-pham",
    },
    {
      name: "Tổng hợp điểm trừ vi phạm",
      icon: "fa-solid fa-square-poll-vertical",
      path: "/tong-hop-vi-pham",
    },
    {
      name: "Thống kê vi phạm của Khoa",
      icon: "fa-solid fa-chart-pie",
      path: "/thong-ke-vi-pham-khoa",
      roles: ["TK", "TKL"],
    },
    {
      name: "Quản lý đánh giá sinh viên",
      icon: "fa-solid fa-user-graduate",
      path: "/quan-ly-danh-gia-sinh-vien",
    },
    {
      name: "Điểm trung bình ĐGSV",
      icon: "fa-solid fa-square-poll-vertical",
      path: "/diem-trung-binh-danh-gia-sinh-vien",
    },
  ],
  criteriaMgmt: [
    {
      name: "Nhóm tiêu chí",
      icon: "fa-solid fa-layer-group",
      path: "/nhom-tieu-chi",
    },
    {
      name: "Tiêu chí đánh giá",
      icon: "fa-solid fa-list-ol",
      path: "/tieu-chi-danh-gia",
    },
    {
      name: "Mẫu phiếu đánh giá",
      icon: "fa-solid fa-file-invoice",
      path: "/mau-danh-gia",
    },
  ],
  orgMgmt: [
    {
      name: "Cơ cấu đơn vị",
      icon: "fa-solid fa-sitemap",
      path: "/quan-ly-don-vi",
    },
    {
      name: "Người dùng",
      icon: "fa-solid fa-users",
      path: "/quan-ly-nguoi-dung",
    },
    {
      name: "Chức danh nghề nghiệp",
      icon: "fa-solid fa-chalkboard-user",
      path: "/quan-ly-chuc-danh",
    },
    {
      name: "Quản lý chức vụ",
      icon: "fa-solid fa-briefcase",
      path: "/quan-ly-chuc-vu",
    },
  ],
  evaluationMgmt: [
    {
      name: "Danh sách duyệt phiếu",
      icon: "fa-solid fa-file-pen",
      path: "/danh-sach-duyet-phieu",
    },
  ],
};

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobile }) => {
  const { user: authUser, logout } = useAuth();
  const user = authUser || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenus, setOpenMenus] = useState({});
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !isCollapsed || isHovered;

  const roleCode = user?.MaChucVu || "";
  const isAdmin = roleCode === "Admin";
  const isManager = ["HT", "PHT", "TK", "TBM"].includes(roleCode);
  const canManageSystem = isAdmin || isManager;

  // Gating theo từng mục: item không khai báo `roles` thì ai thấy group là thấy mục
  const myRole = normalizeRole(user);
  const canSeeItem = (item) => !item.roles || item.roles.includes(myRole);
  const visibleItems = (menuKey) => menuStructure[menuKey].filter(canSeeItem);

  useEffect(() => {
    const currentPath = location.pathname;
    for (const [key, subItems] of Object.entries(menuStructure)) {
      if (
        subItems.filter(canSeeItem).some(
          (item) =>
            item.path === currentPath ||
            (item.path !== "/" && currentPath.startsWith(item.path + "/")),
        )
      ) {
        setOpenMenus((prev) => ({ ...prev, [key]: true }));
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, myRole]);

  const toggleSubMenu = (menuKey) => {
    if (!isExpanded) return;
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const isMenuActive = (menuKey) => {
    return visibleItems(menuKey).some(
      (item) =>
        item.path === location.pathname ||
        (item.path !== "/" && location.pathname.startsWith(item.path + "/")),
    );
  };

  const handleLogout = async (e) => {
    e.stopPropagation();
    await logout();
    navigate("/login");
  };

  const renderSubMenu = (items) => {
    if (!isExpanded) return null;
    return (
      <ul className="sub-menu">
        {items.map((item, index) => (
          <li
            key={index}
            className={`sub-menu-item ${location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path + "/")) ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (item.path) {
                navigate(item.path);
                if (isMobile) setIsCollapsed(true);
              }
            }}
          >
            <i className={`${item.icon} sub-icon`}></i> {item.name}
          </li>
        ))}
      </ul>
    );
  };

  let sidebarClass = `sidebar ${isHovered ? "sidebar-hovered" : ""}`;
  if (isMobile) {
    sidebarClass += isCollapsed ? " mobile-closed" : " mobile-open";
  }

  return (
    <div className={sidebarClass}>
      <div className="sidebar-header-wrapper">
        {!isCollapsed && (
          <div
            className="sidebar-logo"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            <img src={logoImage} alt="DUE Logo" className="sidebar-logo-img" />
            <span
              className="logo-text"
              style={{ marginLeft: "10px", fontWeight: "bold" }}
            >
              DUE KPI
            </span>
          </div>
        )}

        <div
          className="sidebar-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
        >
          <i className="fa-solid fa-bars"></i>
        </div>
      </div>

      <div
        className="sidebar-nav-content"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div
            className="user-info"
            onClick={() => isExpanded && setIsUserMenuOpen(!isUserMenuOpen)}
            style={{ cursor: isExpanded ? "pointer" : "default" }}
          >
            <div className="avatar">
              {user.AvatarUrl ? (
                <img src={user.AvatarUrl} alt="Avatar" />
              ) : (
                user.HoTen.trim().split(/\s+/).pop()[0] || "U"
              )}
            </div>

            {isExpanded && (
              <div style={{ marginLeft: "12px", overflow: "hidden", flex: 1 }}>
                <div
                  style={{
                    fontWeight: "600",
                    fontSize: "14px",
                    whiteSpace: "nowrap",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span className="text-truncate">
                    {user.HoTen || "Người dùng"}
                  </span>
                  <i
                    className={`fa-solid fa-caret-down arrow ${isUserMenuOpen ? "open" : ""}`}
                    style={{ margin: 0 }}
                  ></i>
                </div>
                <div
                  style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}
                  className="text-truncate"
                >
                  {user.RoleName || "Giảng viên"}
                </div>
              </div>
            )}
          </div>

          <div
            className={`user-dropdown-wrapper ${isExpanded && isUserMenuOpen ? "open" : ""}`}
          >
            <div className="user-dropdown-inner">
              <div
                className="user-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUserMenuOpen(false);
                  navigate("/thong-tin-lien-he");
                }}
              >
                <i
                  className="fa-solid fa-user"
                  style={{ marginRight: "8px", width: "16px" }}
                ></i>{" "}
                Hồ sơ của tôi
              </div>

              <div
                className="user-dropdown-item"
                onClick={handleLogout}
                style={{ color: "#ff6b6b" }}
              >
                <i
                  className="fa-solid fa-arrow-right-from-bracket"
                  style={{
                    marginRight: "8px",
                    width: "16px",
                    color: "inherit",
                  }}
                ></i>{" "}
                Đăng xuất
              </div>
            </div>
          </div>
        </div>

        <ul className="menu-list">
          <li
            className={`menu-item ${location.pathname === "/" ? "active" : ""}`}
            onClick={() => {
              navigate("/");
              if (isMobile) setIsCollapsed(true);
            }}
          >
            <i className="fa-solid fa-chart-pie menu-icon"></i>
            {isExpanded && <span>Tổng quan</span>}
          </li>

          {Object.keys(menuStructure).map((key) => {
            if (key !== "evaluation" && !canManageSystem) return null;
            if (visibleItems(key).length === 0) return null;

            const labels = {
              evaluation: "Đánh giá KPI",
              planMgmt: "Thiết lập kế hoạch",
              criteriaMgmt: "Quản lý tiêu chí",
              orgMgmt: "Cơ cấu tổ chức",
              evaluationMgmt: "Quản lý đánh giá",
            };

            const icons = {
              evaluation: "fa-check-double",
              planMgmt: "fa-calendar-check",
              criteriaMgmt: "fa-list-check",
              orgMgmt: "fa-users-gear",
              evaluationMgmt: "fa-check-double",
            };

            return (
              <React.Fragment key={key}>
                <li
                  className={`menu-item has-submenu ${isMenuActive(key) ? "active" : ""}`}
                  onClick={() => toggleSubMenu(key)}
                >
                  <i className={`fa-solid ${icons[key]} menu-icon`}></i>
                  {isExpanded && <span>{labels[key]}</span>}
                  {isExpanded && (
                    <i
                      className={`fa-solid fa-chevron-down arrow ${openMenus[key] ? "open" : ""}`}
                    ></i>
                  )}
                </li>
                {openMenus[key] && renderSubMenu(visibleItems(key))}
              </React.Fragment>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
