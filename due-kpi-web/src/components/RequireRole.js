import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPath, findRouteRule } from "../config/menuConfig";
import { coDanhGiaKpiCaNhan } from "../utils/roles";
import { useQuyenDaoTao } from "../context/HoatDongDaoTaoContext";
import { useQuyenDoiNgu } from "../context/PhatTrienDoiNguContext";
import { useQuyenSangKien } from "../context/SangKienContext";

const KhongCoQuyen = ({ khongDanhGia }) => (
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
        {khongDanhGia ? "Bạn không thuộc diện đánh giá KPI" : "Bạn không có quyền truy cập trang này"}
      </h3>
      <p style={{ margin: 0, fontSize: "14px" }}>
        Nếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ quản trị viên.
      </p>
    </div>
  </div>
);

const RequireRole = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const daoTao = useQuyenDaoTao();
  const doiNgu = useQuyenDoiNgu();
  const sangKien = useQuyenSangKien();
  const rule = findRouteRule(location.pathname);

  if (loading) return <div className="page-container">Đang tải thông tin tài khoản...</div>;
  if (rule?.serverPermission) {
    const permission = rule.serverPermissionSource === "sangKien" ? sangKien : rule.serverPermissionSource === "doiNgu" ? doiNgu : daoTao;
    if (permission.loading) return <div className="page-container">Đang tải quyền truy cập...</div>;
    if (permission.error) return <div className="page-container"><p role="alert">{permission.error}</p><button onClick={permission.refresh}>Thử lại</button></div>;
  }
  if (!canAccessPath(location.pathname, user, daoTao.quyen, doiNgu.quyen, sangKien.quyen)) {
    const khongDanhGia = findRouteRule(location.pathname)?.personalKpi &&
      Array.isArray(user?.DonVi) && user.DonVi.some((dv) => dv?.LoaiDoiTuong === 0) &&
      !coDanhGiaKpiCaNhan(user);
    return <KhongCoQuyen khongDanhGia={khongDanhGia} />;
  }
  return children;
};

export default RequireRole;
