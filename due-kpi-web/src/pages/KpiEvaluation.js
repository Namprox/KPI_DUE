import React from 'react';
import '../css/Pages.css'; // Import CSS khung trang
import KpiEvaluationForm from '../components/KpiEvaluation/KpiEvaluationForm'; // Gọi Component Form lên

const KpiEvaluationPage = () => {
    return (
        <div className="page-container">
            {/* 1. Header của trang */}
            <div className="page-header">
                <div className="header-title">
                    <h2>Phiếu Tự Đánh Giá KPI Giảng Viên</h2>
                    <span className="breadcrumb">Hệ thống KPI / Đánh giá Phụ lục 2</span>
                </div>
            </div>

            {/* 2. Khu vực nút bấm chức năng của trang */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px' }}>
                <button className="btn-cancel">
                    <i className="fa-solid fa-rotate-left"></i> Nhập lại
                </button>
                <button className="btn-submit">
                    <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
                </button>
            </div>

            {/* 3. Lắp Component Bảng Form vào đây */}
            <KpiEvaluationForm />
            
        </div>
    );
};

export default KpiEvaluationPage;