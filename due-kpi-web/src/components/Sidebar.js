import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/Sidebar.css";
import logoImage from "../images/logo.png";
import { useAuth } from "../context/AuthContext";
import { visibleGroups } from "../config/menuConfig";
import { useQuyenDaoTao } from "../context/HoatDongDaoTaoContext";
import { useQuyenDoanThe } from "../context/ThanhTichDoanTheContext";
import { useQuyenDoiNgu } from "../context/PhatTrienDoiNguContext";
import { useQuyenKhenThuong } from "../context/KhenThuongDotXuatContext";
import { useQuyenSangKien } from "../context/SangKienContext";
import { useQuyenChucVu } from "../context/NhanVienChucVuContext";

import { useQuyenNhiemVuPhucVu } from "../context/NhiemVuPhucVuContext";

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobile }) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenus, setOpenMenus] = useState({});
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !isCollapsed || isHovered;

  const { quyen } = useQuyenDaoTao();
  const { quyen: quyenDoanThe } = useQuyenDoanThe();
  const { quyen: quyenDoiNgu } = useQuyenDoiNgu();
  const { quyen: quyenSangKien } = useQuyenSangKien();
  const { quyen: quyenKhenThuong } = useQuyenKhenThuong();
  const { quyen: quyenNhiemVuPhucVu } = useQuyenNhiemVuPhucVu();
  const { quyen: quyenChucVu } = useQuyenChucVu();
  const groups = useMemo(() => visibleGroups(authUser, quyen, quyenDoanThe, quyenDoiNgu, quyenSangKien, quyenKhenThuong, quyenNhiemVuPhucVu, quyenChucVu), [authUser, quyen, quyenDoanThe, quyenDoiNgu, quyenSangKien, quyenKhenThuong, quyenNhiemVuPhucVu, quyenChucVu]);
  const activePath = useMemo(() => groups.flatMap((group) => group.items).reduce((active, item) => {
    const matches = location.pathname === item.path ||
      (item.path !== "/" && location.pathname.startsWith(item.path + "/"));
    return matches && item.path.length > (active?.length || 0) ? item.path : active;
  }, null), [groups, location.pathname]);

  // Nhóm chứa mục khớp DÀI NHẤT. Không xét theo tiền tố từng nhóm: mục cha và
  // mục con có thể nằm ở hai nhóm khác nhau (vd /sang-kien ở "Hoạt động &
  // thành tích", /sang-kien/uy-quyen ở "Ủy quyền nhập liệu").
  const activeGroupKey = useMemo(() => (
    groups.find((group) => group.items.some((item) => item.path === activePath))?.key || null
  ), [groups, activePath]);

  // Accordion: đổi trang thì chỉ mở nhóm chứa trang đó.
  useEffect(() => {
    if (activeGroupKey) setOpenMenus({ [activeGroupKey]: true });
  }, [activeGroupKey]);

  const toggleSubMenu = (menuKey) => {
    if (!isExpanded) return;
    setOpenMenus((prev) => (prev[menuKey] ? {} : { [menuKey]: true }));
  };

  const isMenuActive = (group) => group.key === activeGroupKey;

  const renderSubMenu = (items) => {
    if (!isExpanded) return null;
    return (
      <ul className="sub-menu">
        {items.map((item, index) => (
          <li
            key={index}
            className={`sub-menu-item ${activePath === item.path ? "active" : ""}`}
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

          {groups.map((group, index) => (
            <React.Fragment key={group.key}>
              {group.section !== groups[index - 1]?.section && (
                <li
                  className={`menu-section ${isExpanded ? "" : "menu-section-collapsed"}`}
                  aria-hidden={!isExpanded}
                >
                  {isExpanded && group.section}
                </li>
              )}
              {group.items.length === 1 ? (
                // Nhóm chỉ còn một mục với người dùng này: hiện thẳng mục đó
                // (một lần bấm) thay vì tiêu đề nhóm phải mở ra mới thấy.
                <li
                  className={`menu-item ${activePath === group.items[0].path ? "active" : ""}`}
                  onClick={() => {
                    navigate(group.items[0].path);
                    if (isMobile) setIsCollapsed(true);
                  }}
                >
                  <i className={`${group.items[0].icon} menu-icon`}></i>
                  {isExpanded && <span>{group.items[0].name}</span>}
                </li>
              ) : (
                <>
                  <li
                    className={`menu-item has-submenu ${isMenuActive(group) ? "active" : ""}`}
                    onClick={() => toggleSubMenu(group.key)}
                  >
                    <i className={`fa-solid ${group.icon} menu-icon`}></i>
                    {isExpanded && <span>{group.label}</span>}
                    {isExpanded && (
                      <i
                        className={`fa-solid fa-chevron-down arrow ${openMenus[group.key] ? "open" : ""}`}
                      ></i>
                    )}
                  </li>
                  {openMenus[group.key] && renderSubMenu(group.items)}
                </>
              )}
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
