import React, { useState } from "react";
import TieuChiHoanThanhMock from "../../components/DanhGia/DanhGiaNhanVien/TieuChiHoanThanhMock";
import ChotPhieuNhanVienMockModal from "../../components/DanhGia/DanhGiaNhanVien/ChotPhieuNhanVienMockModal";
import "../../css/Pages.css";

const ThamDinhNhanVienMockPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [diemHieuQuaCongViec, setDiemHieuQuaCongViec] = useState(65);

    const diemGioGiacAuto = 30 - 6;
    const diemThanhTichAuto = 10;
    const diemKyLuatAuto = 0;

    const tongDiemSieuTinh = diemHieuQuaCongViec + diemGioGiacAuto + diemThanhTichAuto - diemKyLuatAuto;

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px", fontWeight: 700 }}>
                        THẨM ĐỊNH KPI NHÂN VIÊN: Nguyễn Văn Test
                    </h2>
                    <span className="breadcrumb">Phòng Đào tạo • Kỳ đánh giá 2026</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>TỔNG ĐIỂM CHỐT</div>
                    <div style={{ fontSize: '28px', color: '#1d4ed8', fontWeight: 'bold' }}>{tongDiemSieuTinh.toFixed(2)}</div>
                </div>
            </div>

            <div className="modern-table-card" style={{ padding: '20px', backgroundColor: '#eff6ff', marginBottom: '20px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
                    <i className="fa-solid fa-link" style={{ marginRight: '8px' }}></i>
                    Giao diện Thẩm định thông minh. Các mục Thành tích và Vi phạm đã bị khóa lại để <b>đảm bảo tính toàn vẹn dữ liệu</b>, tự động đồng bộ từ Sổ ghi nhận sự kiện của đơn vị. Quản lý chỉ cần đánh giá Mục 1.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>

                <div style={{ padding: '10px 15px', background: '#e2e8f0', fontWeight: 'bold', borderRadius: '4px' }}>
                    I. Nhóm các tiêu chí liên quan đến nhiệm vụ cơ bản (100đ)
                </div>

                <TieuChiHoanThanhMock
                    tieuChi={{
                        ten: "1. Hoàn thành công việc theo đúng kế hoạch, nhiệm vụ được phân công",
                        diemToiDa: 70,
                        diemTuCham: diemHieuQuaCongViec,
                        moTa: "Quản lý chấm điểm dựa trên tiến độ và chất lượng công việc thực tế."
                    }}
                />

                <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "15px", backgroundColor: "#f8fafc", opacity: 0.85 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h4 style={{ margin: "0 0 5px 0", color: "#475569" }}>2. Tuân thủ các quy định về giờ giấc, tác phong làm việc</h4>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                                <span style={{ backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", marginRight: "8px" }}>
                                    <i className="fa-solid fa-lock"></i> ĐỒNG BỘ TỪ HỆ THỐNG
                                </span>
                                Ghi nhận 2 lỗi vi phạm trong kỳ.
                            </div>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#b45309" }}>
                            {diemGioGiacAuto} / 30đ
                        </div>
                    </div>
                </div>

                <div style={{ padding: '10px 15px', background: '#e2e8f0', fontWeight: 'bold', borderRadius: '4px' }}>
                    II. Nhóm các tiêu chí liên quan đến thành tích vượt trội
                </div>

                <div style={{ border: "1px solid #bbf7d0", borderRadius: "8px", padding: "15px", backgroundColor: "#f0fdf4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h4 style={{ margin: "0 0 5px 0", color: "#166534" }}>Tổng điểm thành tích, sáng kiến, khen thưởng</h4>
                            <div style={{ fontSize: "13px", color: "#15803d" }}>
                                <span style={{ backgroundColor: "#dcfce7", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", marginRight: "8px" }}>
                                    <i className="fa-solid fa-lock"></i> ĐỒNG BỘ TỪ HỆ THỐNG
                                </span>
                                Có 1 danh hiệu / sáng kiến được ghi nhận.
                            </div>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>
                            +{diemThanhTichAuto}đ
                        </div>
                    </div>
                </div>

                <div style={{ padding: '10px 15px', background: '#e2e8f0', fontWeight: 'bold', borderRadius: '4px' }}>
                    III. Chấp hành quy định (Điểm trừ kỷ luật)
                </div>

                <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "15px", backgroundColor: "#f8fafc", opacity: 0.85 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <h4 style={{ margin: "0 0 5px 0", color: "#475569" }}>Vi phạm chính trị, tư tưởng, pháp luật</h4>
                            <div style={{ fontSize: "13px", color: "#64748b" }}>
                                <span style={{ backgroundColor: "#e2e8f0", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", marginRight: "8px" }}>
                                    <i className="fa-solid fa-lock"></i> ĐỒNG BỘ TỪ HỆ THỐNG
                                </span>
                                Không có vi phạm.
                            </div>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#64748b" }}>
                            -{diemKyLuatAuto}đ
                        </div>
                    </div>
                </div>

            </div>

            <div style={{ padding: "20px", display: "flex", justifyContent: "flex-end", gap: "10px", backgroundColor: "#fff", marginTop: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <button className="btn-cancel"><i className="fa-solid fa-rotate-left"></i> Trả về bổ sung (Mock)</button>
                <button
                    className="btn-submit"
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                    onClick={() => setIsModalOpen(true)}
                >
                    <i className="fa-solid fa-check-double"></i> Chốt điểm (Mock)
                </button>
            </div>

            <ChotPhieuNhanVienMockModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tongDiem={tongDiemSieuTinh}
                tenNhanVien="Nguyễn Văn Test"
            />
        </div>
    );
};

export default ThamDinhNhanVienMockPage;