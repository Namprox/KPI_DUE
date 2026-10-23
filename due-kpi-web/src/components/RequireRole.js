import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAccessPath, findRouteRule } from "../config/menuConfig";
import { coDanhGiaKpiCaNhan } from "../utils/roles";
import { useQuyenDaoTao } from "../context/HoatDongDaoTaoContext";
import { useQuyenDoiNgu } from "../context/PhatTrienDoiNguContext";
import { useQuyenSangKien } from "../context/SangKienContext";
import { useQuyenKhenThuong } from "../context/KhenThuongDotXuatContext";
import { useQuyenChucVu } from "../context/NhanVienChucVuContext";
import { useQuyenThamDinh } from "../context/PhanCongThamDinhContext";

import { useQuyenNhiemVuPhucVu } from "../context/NhiemVuPhucVuContext";

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

const LoiTaiQuyen = ({ message, onRetry }) => (
  <div className="page-container">
    <div
      role="alert"
      className="modern-table-card"
      style={{ padding: "60px 20px", textAlign: "center", color: "#666" }}
    >
      <i
        className="fa-solid fa-triangle-exclamation"
        style={{ fontSize: "56px", color: "#e0a800", marginBottom: "15px" }}
      ></i>
      <h3 style={{ color: "#7f8c8d", margin: "0 0 8px 0" }}>Không tải được quyền truy cập</h3>
      <p style={{ margin: "0 0 20px 0", fontSize: "14px" }}>{message}</p>
      <button
        type="button"
        className="btn-submit"
        style={{ display: "inline-flex" }}
        onClick={onRetry}
      >
        <i className="fa-solid fa-rotate-right" aria-hidden="true"></i> Thử lại
      </button>
    </div>
  </div>
);

const RequireRole = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const daoTao = useQuyenDaoTao();
  const doiNgu = useQuyenDoiNgu();
  const sangKien = useQuyenSangKien();
  const khenThuong = useQuyenKhenThuong();
  const nhiemVuPhucVu = useQuyenNhiemVuPhucVu();
  const chucVu = useQuyenChucVu();
  const thamDinh = useQuyenThamDinh();
  const rule = findRouteRule(location.pathname);
  const coQuyen = () => canAccessPath(location.pathname, user, daoTao.quyen, doiNgu.quyen, sangKien.quyen, khenThuong.quyen, nhiemVuPhucVu.quyen, chucVu.quyen, thamDinh.quyen);

  if (loading) return <div className="page-container">Đang tải thông tin tài khoản...</div>;
  if (rule?.serverPermission) {
    const permission = rule.serverPermissionSource === "thamDinh" ? thamDinh : rule.serverPermissionSource === "nhiemVuPhucVu" ? nhiemVuPhucVu : rule.serverPermissionSource === "khenThuong" ? khenThuong : rule.serverPermissionSource === "sangKien" ? sangKien : rule.serverPermissionSource === "doiNgu" ? doiNgu : rule.serverPermissionSource === "chucVu" ? chucVu : daoTao;
    if (permission.loading) return <div className="page-container">Đang tải quyền truy cập...</div>;
    // Mục có vaiTroDuPhong: tải quyền lỗi thì vẫn cho người đúng chức vụ vào.
    if (permission.error && !(rule.vaiTroDuPhong && coQuyen())) return <LoiTaiQuyen message={permission.error} onRetry={permission.refresh} />;
  }
  if (!coQuyen()) {
    const khongDanhGia = findRouteRule(location.pathname)?.personalKpi &&
      Array.isArray(user?.DonVi) && user.DonVi.some((dv) => dv?.LoaiDoiTuong === 0) &&
      !coDanhGiaKpiCaNhan(user);
    return <KhongCoQuyen khongDanhGia={khongDanhGia} />;
  }
  return children;
};

export default RequireRole;
