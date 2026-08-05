import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPath } from "../config/menuConfig";

const KhongCoQuyen = () => (
  <div className="page-container">
    <div
      className="modern-table-card"
      style={{ padding: "60px 20px", textAlign: "center", color: "#666" }}
    >
      <i
        className="fa-solid fa-lock"
        style={{ fontSize: "56px", color: "#bdc3c7", marginBottom: "15px" }}
      ></i>
      <h3 style={{ color: "#7f8c8d", margin: "0 0 8px 0" }}>
        Bạn không có quyền truy cập trang này
      </h3>
      <p style={{ margin: 0, fontSize: "14px" }}>
        Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên.
      </p>
    </div>
  </div>
);

const RequireRole = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!canAccessPath(location.pathname, user)) return <KhongCoQuyen />;
  return children;
};

export default RequireRole;
