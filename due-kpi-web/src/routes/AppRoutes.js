import React from 'react';
import { Routes, Route } from 'react-router-dom';
import QLNhanVien from '../pages/OrganizationalManagement/QL_NhanVien';
import QLDonVi from '../pages/OrganizationalManagement/QL_DonVi';
import QLTieuChi from '../pages/CriteriaManagement/QL_TieuChi';
import QLNhomTieuChi from '../pages/CriteriaManagement/QL_NhomTieuChi';
import QLNhomNhiemVu from '../pages/CriteriaManagement/QL_NhomNhiemVu';
import QLNamDanhGia from '../pages/PlanManagement/QL_NamDanhGia';
import QLMauDanhGia from '../pages/PlanManagement/QL_MauDanhGia';
import QLThangDiem from '../pages/CriteriaManagement/QL_ThangDiem';
import QLThangDiemByTieuChi from '../pages/CriteriaManagement/QL_ThangDiemByTieuChi';
import QLDinhMucGiangVien from '../pages/PlanManagement/QL_DinhMucGiangVien';
import DanhGiaPhuLuc2 from '../pages/Evaluation/DanhGiaPhuLuc2';
import LichSuDanhGia from '../pages/Evaluation/LichSuDanhGia';
import DanhSachDuyetPhieu from '../pages/EvaluationManagement/DanhSachDuyetPhieu';
import ChiTietDuyetPhieu from '../pages/EvaluationManagement/ChiTietDuyetPhieu';
import QLGioThucHien from '../pages/PlanManagement/QL_GioThucHien';
import QLChucDanh from '../pages/OrganizationalManagement/QL_ChucDanh';
import DanhSachThanhVien from '../pages/OrganizationalManagement/DanhSachThanhVien';

const Overview = () => (
    <div className="content-body" style={{ padding: '20px' }}>
        <h2>Thông tin tổng quan</h2>
        <p>Hệ thống Đánh giá KPI Giảng viên © 2026 - DUE</p>
    </div>
);

const AppRoutes = ({ triggerNotification }) => {
    return (
        <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/danh-gia-phu-luc-2" element={<DanhGiaPhuLuc2 />} />
            <Route path="/lich-su-danh-gia" element={<LichSuDanhGia />} />
            <Route path="/quan-ly-nguoi-dung" element={<QLNhanVien />} />
            <Route path="/quan-ly-don-vi" element={<QLDonVi />} />
            <Route path="/quan-ly-don-vi/:maDonVi/danh-sach-thanh-vien" element={<DanhSachThanhVien />} />
            <Route path="/quan-ly-tieu-chi" element={<QLTieuChi />} />
            <Route path="/quan-ly-nhom-tieu-chi" element={<QLNhomTieuChi />} />
            <Route path="/quan-ly-nhom-nhiem-vu" element={<QLNhomNhiemVu />} />
            <Route path="/quan-ly-nam-danh-gia" element={<QLNamDanhGia />} />
            <Route path="/quan-ly-mau-danh-gia" element={<QLMauDanhGia />} />
            <Route path="/quan-ly-thang-diem" element={<QLThangDiem />} />
            <Route path="/:tieuChiId/thang-diem" element={<QLThangDiemByTieuChi />} />
            <Route path="/quan-ly-dinh-muc-giang-vien" element={<QLDinhMucGiangVien />} />
            <Route path="/quan-ly-chuc-danh" element={<QLChucDanh />} />
            <Route path="/danh-sach-duyet-phieu" element={<DanhSachDuyetPhieu />} />
            <Route path="/chi-tiet-duyet-phieu" element={<ChiTietDuyetPhieu />} />
            <Route path="/quan-ly-gio-thuc-hien" element={<QLGioThucHien />} />
        </Routes>
    );
};

export default AppRoutes;