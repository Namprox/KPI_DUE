import React from 'react';
import { Routes, Route } from 'react-router-dom';
import QL_NhanVien from '../pages/OrganizationalManagement/QL_NhanVien';
import QL_DonVi from '../pages/OrganizationalManagement/QL_DonVi';
import QL_TieuChi from '../pages/CriteriaManagement/QL_TieuChi';
import QL_NhomTieuChi from '../pages/CriteriaManagement/QL_NhomTieuChi';
import QL_NhomNhiemVu from '../pages/CriteriaManagement/QL_NhomNhiemVu';
import QL_NamDanhGia from '../pages/PlanManagement/QL_NamDanhGia';
import QL_MauDanhGia from '../pages/PlanManagement/QL_MauDanhGia';
import QL_ThangDiem from '../pages/CriteriaManagement/QL_ThangDiem';
import QL_DinhMucGiangVien from '../pages/PlanManagement/QL_DinhMucGiangVien';
import QL_NhomGiangVien from '../pages/OrganizationalManagement/QL_NhomGiangVien';
import DanhGiaPhuLuc2 from '../pages/Evaluation/DanhGiaPhuLuc2';
import LichSuDanhGia from '../pages/Evaluation/LichSuDanhGia';
import DanhSachDuyetPhieu from '../pages/EvaluationManagement/DanhSachDuyetPhieu';
import ChiTietDuyetPhieu from '../pages/EvaluationManagement/ChiTietDuyetPhieu';

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
            <Route path="/quan-ly-nguoi-dung" element={<QL_NhanVien />} />
            <Route path="/quan-ly-don-vi" element={<QL_DonVi />} />
            <Route path="/quan-ly-tieu-chi" element={<QL_TieuChi />} />
            <Route path="/quan-ly-nhom-tieu-chi" element={<QL_NhomTieuChi />} />
            <Route path="/quan-ly-nhom-nhiem-vu" element={<QL_NhomNhiemVu />} />
            <Route path="/quan-ly-nam-danh-gia" element={<QL_NamDanhGia />} />
            <Route path="/quan-ly-mau-danh-gia" element={<QL_MauDanhGia />} />
            <Route path="/quan-ly-thang-diem" element={<QL_ThangDiem />} />
            <Route path="/quan-ly-dinh-muc-giang-vien" element={<QL_DinhMucGiangVien />} />
            <Route path="/quan-ly-nhom-giang-vien" element={<QL_NhomGiangVien />} />
            <Route path="/danh-sach-duyet-phieu" element={<DanhSachDuyetPhieu />} />
            <Route path="/chi-tiet-duyet-phieu" element={<ChiTietDuyetPhieu />} />
        </Routes>
    );
};

export default AppRoutes;