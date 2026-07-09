import React from "react";
import { Routes, Route } from "react-router-dom";
import QLNhanVien from "../pages/QuanLyToChuc/QL_NhanVien";
import QLNhanVienChiTiet from "../pages/QuanLyToChuc/QL_NhanVienChiTiet";
import QLDonVi from "../pages/QuanLyToChuc/QL_DonVi";
import QLTieuChi from "../pages/QuanLyTieuChi/QL_TieuChi";
import QLNhomTieuChi from "../pages/QuanLyTieuChi/QL_NhomTieuChi";
import QLNamDanhGia from "../pages/QuanLyKeHoach/QL_NamDanhGia";
import QLMauDanhGia from "../pages/QuanLyKeHoach/QL_MauDanhGia";
import QLPhanQuyenTieuChi from "../pages/QuanLyKeHoach/QL_PhanQuyenTieuChi";
import QLThangDiemByTieuChi from "../pages/QuanLyTieuChi/QL_ThangDiemByTieuChi";
import QLDinhMucGiangVien from "../pages/QuanLyKeHoach/QL_DinhMucGiangVien";
import DanhGiaPhuLuc2 from "../pages/DanhGia/DanhGiaPhuLuc2";
import DanhGiaNhanVien from "../pages/DanhGia/DanhGiaNhanVien";
import LichSuDanhGia from "../pages/DanhGia/LichSuDanhGia";
import DanhSachDuyetPhieu from "../pages/QuanLyDanhGia/DanhSachDuyetPhieu";
import ChiTietDuyetPhieu from "../pages/QuanLyDanhGia/ChiTietDuyetPhieu";
import QLGioGiang from "../pages/QuanLyKeHoach/QL_GioGiang";
import QLViPham from "../pages/QuanLyKeHoach/QL_ViPham";
import QLDanhGiaSinhVien from "../pages/QuanLyKeHoach/QL_DanhGiaSinhVien";
import QLChucDanh from "../pages/QuanLyToChuc/QL_ChucDanh";
import QLChucVu from "../pages/QuanLyToChuc/QL_ChucVu";
import DanhSachThanhVien from "../pages/QuanLyToChuc/DanhSachThanhVien";

const Overview = () => (
  <div className="content-body" style={{ padding: "20px" }}>
    <h2>Thông tin tổng quan</h2>
    <p>Hệ thống Đánh giá KPI Giảng viên © 2026 - DUE</p>
  </div>
);

const AppRoutes = ({ triggerNotification }) => {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/danh-gia-phu-luc-2" element={<DanhGiaPhuLuc2 />} />
      <Route path="/danh-gia-kpi-nhan-vien" element={<DanhGiaNhanVien />} />
      <Route path="/lich-su-danh-gia" element={<LichSuDanhGia />} />
      <Route path="/quan-ly-nguoi-dung" element={<QLNhanVien />} />
      <Route path="/quan-ly-nguoi-dung/them-moi" element={<QLNhanVienChiTiet />} />
      <Route path="/quan-ly-nguoi-dung/chi-tiet/:id" element={<QLNhanVienChiTiet />} />
      <Route path="/quan-ly-don-vi" element={<QLDonVi />} />
      <Route
        path="/quan-ly-don-vi/:maDonVi/danh-sach-thanh-vien"
        element={<DanhSachThanhVien />}
      />
      <Route path="/tieu-chi-danh-gia" element={<QLTieuChi />} />
      <Route path="/nhom-tieu-chi" element={<QLNhomTieuChi />} />
      <Route path="/quan-ly-nam-danh-gia" element={<QLNamDanhGia />} />
      <Route path="/mau-danh-gia" element={<QLMauDanhGia />} />
      <Route path="/mau-danh-gia/:idMau/phan-quyen" element={<QLPhanQuyenTieuChi />} />
      <Route path="/:tieuChiId/thang-diem" element={<QLThangDiemByTieuChi />} />
      <Route
        path="/quan-ly-dinh-muc-giang-vien"
        element={<QLDinhMucGiangVien />}
      />
      <Route path="/quan-ly-chuc-danh" element={<QLChucDanh />} />
      <Route path="/quan-ly-chuc-vu" element={<QLChucVu />} />
      <Route path="/danh-sach-duyet-phieu" element={<DanhSachDuyetPhieu />} />
      <Route path="/chi-tiet-duyet-phieu" element={<ChiTietDuyetPhieu />} />
      <Route path="/quan-ly-gio-giang" element={<QLGioGiang />} />
      <Route path="/quan-ly-vi-pham" element={<QLViPham />} />
      <Route path="/quan-ly-danh-gia-sinh-vien" element={<QLDanhGiaSinhVien />} />
    </Routes>
  );
};

export default AppRoutes;
