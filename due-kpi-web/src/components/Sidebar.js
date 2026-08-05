import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../css/Sidebar.css";
import logoImage from "../images/logo.png";
import { useAuth } from "../context/AuthContext";
import { normalizeRole } from "../utils/roles";
import { visibleGroups } from "../config/menuConfig";

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobile }) => {
  const { user: authUser, logout } = useAuth();
  const user = authUser || {};
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenus, setOpenMenus] = useState({});
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = !isCollapsed || isHovered;

  const myRole = normalizeRole(user);
  const groups = useMemo(() => visibleGroups(authUser), [authUser]);

  useEffect(() => {
    const currentPath = location.pathname;
    for (const group of groups) {
      if (
        group.items.some(
          (item) =>
            item.path === currentPath ||
            (item.path !== "/" && currentPath.startsWith(item.path + "/")),
        )
      ) {
        setOpenMenus((prev) => ({ ...prev, [group.key]: true }));
        break;
      }
    }
  }, [location.pathname, myRole]);

  const toggleSubMenu = (menuKey) => {
    if (!isExpanded) return;
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const isMenuActive = (group) => {
    return group.items.some(
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

          {groups.map((group) => (
            <React.Fragment key={group.key}>
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
            </React.Fragment>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
