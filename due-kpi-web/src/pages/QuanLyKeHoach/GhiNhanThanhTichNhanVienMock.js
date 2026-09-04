import React, { useState } from "react";
import "../../css/Pages.css";
import ThemThanhTichNhanVienMockModal from "../../components/QuanLyKeHoach/QL_ThanhTich/ThemThanhTichNhanVienMockModal";

const MOCK_DATA = [
    { id: 1, nam: 2026, ten: "Nguyễn Văn Test", ma: "NV001", donVi: "Phòng Đào tạo", nhom: "Sáng kiến, cải tiến", loai: "Sáng kiến cấp Trường", moTa: "Số hóa quy trình thẩm định hồ sơ KPI", diemThuong: 10.00, minhChung: "qd_cong_nhan.pdf", ngay: "12/09/2026", cap: "Trường", nguoiGhiNhanTen: "Trần Thị Sáu", nguoiGhiNhanDonVi: "Phòng Tổ chức Hành chính" },
    { id: 2, nam: 2026, ten: "Trần Thị Demo", ma: "NV002", donVi: "Phòng Khảo thí", nhom: "Khen thưởng đột xuất", loai: "Bằng khen cấp ĐHĐN", moTa: "Thành tích xuất sắc trong công tác tuyển sinh", diemThuong: 10.00, minhChung: "bang_khen.pdf", ngay: "15/08/2026", cap: "ĐHĐN", nguoiGhiNhanTen: "Trần Thị Sáu", nguoiGhiNhanDonVi: "Phòng Tổ chức Hành chính" }
];

const GhiNhanThanhTichNhanVienMock = () => {
    const [data] = useState(MOCK_DATA);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
                <div>
                    <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>Ghi nhận thành tích nhân viên (Mock)</h2>
                    <span className="breadcrumb">Ghi nhận các danh hiệu, sáng kiến, khen thưởng để tính điểm cộng KPI</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-cancel" style={{ padding: "8px 16px", backgroundColor: "#64748b", color: "#fff", border: "none", borderRadius: "4px" }}><i className="fa-solid fa-chart-line"></i> Thống kê thành tích</button>
                    <button
                        className="btn-submit"
                        style={{ backgroundColor: "#10b981", padding: "8px 16px", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                        onClick={() => setIsModalOpen(true)}
                    >
                        <i className="fa-solid fa-medal"></i> Thêm ghi nhận
                    </button>
                </div>
            </div>

            <div className="cd-toolbar" style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <div style={{ flex: 1 }}>
                    <label className="cd-label" style={{ fontSize: "12px", fontWeight: "bold" }}>Năm đánh giá</label>
                    <select className="form-input" style={{ width: "100%", padding: "8px" }}><option>Năm học 2026</option></select>
                </div>
                <div style={{ flex: 1 }}>
                    <label className="cd-label" style={{ fontSize: "12px", fontWeight: "bold" }}>Đơn vị (Phòng/Ban)</label>
                    <select className="form-input" style={{ width: "100%", padding: "8px" }}><option>-- Tất cả Phòng/Ban --</option></select>
                </div>
                <div style={{ flex: 1 }}>
                    <label className="cd-label" style={{ fontSize: "12px", fontWeight: "bold" }}>Nhân viên</label>
                    <select className="form-input" style={{ width: "100%", padding: "8px" }}><option>-- Tất cả nhân viên --</option></select>
                </div>
                <div style={{ flex: 1 }}>
                    <label className="cd-label" style={{ fontSize: "12px", fontWeight: "bold" }}>Nhóm thành tích</label>
                    <select className="form-input" style={{ width: "100%", padding: "8px" }}><option>-- Tất cả nhóm --</option></select>
                </div>
                <div style={{ flex: 1 }}>
                    <label className="cd-label" style={{ fontSize: "12px", fontWeight: "bold" }}>Tìm kiếm từ khóa</label>
                    <input type="text" className="form-input" placeholder="Mã / Tên nhân viên" style={{ width: "100%", padding: "8px" }} />
                </div>
            </div>

            <div className="modern-table-card" style={{ overflowX: "auto" }}>
                <table className="custom-table" style={{ width: "100%", textAlign: "left", minWidth: "1200px" }}>
                    <thead>
                        <tr style={{ color: "#64748b", fontSize: "12px", textTransform: "uppercase" }}>
                            <th style={{ width: "5%", textAlign: "center" }}>STT</th>
                            <th style={{ width: "8%", textAlign: "center" }}>Năm</th>
                            <th style={{ width: "15%" }}>Nhân viên</th>
                            <th style={{ width: "12%" }}>Nhóm thành tích</th>
                            <th style={{ width: "15%" }}>Tên thành tích</th>
                            <th style={{ width: "15%" }}>Mô tả chi tiết</th>
                            <th style={{ width: "8%", textAlign: "center" }}>Điểm cộng</th>
                            <th style={{ width: "10%", textAlign: "center" }}>Minh chứng</th>
                            <th style={{ width: "8%", textAlign: "center" }}>Ngày QĐ</th>
                            <th style={{ width: "12%", textAlign: "center" }}>Người ghi nhận</th>
                            <th style={{ width: "10%", textAlign: "center" }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((vp, idx) => (
                            <tr key={vp.id}>
                                <td style={{ color: "#64748b", textAlign: "center" }}>{idx + 1}</td>
                                <td style={{ fontWeight: "bold", textAlign: "center" }}>{vp.nam}</td>
                                <td>
                                    <div style={{ fontWeight: "bold", color: "#1e293b" }}>{vp.ten}</div>
                                    <div style={{ fontSize: "12px", color: "#64748b" }}>Mã nhân viên: <span style={{ backgroundColor: "#f1f5f9", padding: "2px 4px", borderRadius: "4px" }}>{vp.ma}</span></div>
                                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{vp.donVi}</div>
                                </td>
                                <td style={{ fontSize: "13px", color: "#334155" }}>{vp.nhom}</td>
                                <td style={{ fontSize: "13px", color: "#334155", fontWeight: "600" }}>{vp.loai}</td>
                                <td style={{ fontSize: "13px", color: "#475569" }}>{vp.moTa}</td>
                                <td style={{ textAlign: "center", color: "#10b981", fontWeight: "bold", backgroundColor: "#f0fdf4" }}>+{vp.diemThuong.toFixed(2)}</td>
                                <td style={{ textAlign: "center" }}>
                                    <span style={{ color: "#3b82f6", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}><i className="fa-solid fa-file-pdf"></i> {vp.minhChung}</span>
                                </td>
                                <td style={{ textAlign: "center", fontSize: "13px", color: "#64748b" }}>
                                    <div>{vp.ngay}</div>
                                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cấp: {vp.cap}</div>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "13px", color: "#334155" }}>{vp.nguoiGhiNhanTen}</div>
                                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{vp.nguoiGhiNhanDonVi}</div>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                    <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                                        <button style={{ border: "none", backgroundColor: "#eff6ff", color: "#3b82f6", width: "28px", height: "28px", borderRadius: "4px", cursor: "pointer" }}><i className="fa-solid fa-pen"></i></button>
                                        <button style={{ border: "none", backgroundColor: "#fef2f2", color: "#ef4444", width: "28px", height: "28px", borderRadius: "4px", cursor: "pointer" }}><i className="fa-solid fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ThemThanhTichNhanVienMockModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default GhiNhanThanhTichNhanVienMock;