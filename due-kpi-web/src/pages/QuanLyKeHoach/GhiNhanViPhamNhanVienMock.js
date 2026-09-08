import React, { useState } from "react";
import "../../css/Pages.css";

const MOCK_DATA = [
    { id: 1, nam: 2026, ten: "Nguyễn Văn Test", ma: "NV001", donVi: "Phòng Đào tạo", nhom: "Giờ giấc, tác phong", loai: "Đi làm muộn", moTa: "Đi muộn 30 phút không báo trước", diemTru: 1.00, minhChung: "log_vantay.pdf", ngayVp: "---", kyLuat: "---", nguoiGhiNhanTen: "Trần Thị Sáu", nguoiGhiNhanDonVi: "Phòng Tổ chức Hành chính" },
    { id: 2, nam: 2026, ten: "Trần Thị Demo", ma: "NV002", donVi: "Phòng Khảo thí", nhom: "Chấp hành quy định", loai: "Làm hư hỏng tài sản", moTa: "Làm hỏng thiết bị chung không đền bù", diemTru: 5.00, minhChung: "bien_ban.pdf", ngayVp: "15/08/2026", kyLuat: "Khiển trách", nguoiGhiNhanTen: "Trần Thị Sáu", nguoiGhiNhanDonVi: "Phòng Tổ chức Hành chính" }
];

const GhiNhanViPhamNhanVienMock = () => {
    const [data] = useState(MOCK_DATA);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between" }}>
                <div>
                    <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>Ghi nhận vi phạm nhân viên (Mock)</h2>
                    <span className="breadcrumb">Ghi nhận các việc chưa tuân thủ của nhân viên thuộc các Phòng/Ban</span>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-cancel" style={{ padding: "8px 16px", backgroundColor: "#64748b", color: "#fff", border: "none", borderRadius: "4px" }}><i className="fa-solid fa-chart-pie"></i> Thống kê vi phạm</button>
                    <button className="btn-submit" style={{ backgroundColor: "#1d4ed8", padding: "8px 16px", color: "#fff", border: "none", borderRadius: "4px" }}><i className="fa-solid fa-plus"></i> Thêm ghi nhận</button>
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
                    <label className="cd-label" style={{ fontSize: "12px", fontWeight: "bold" }}>Nhóm vi phạm</label>
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
                            <th style={{ width: "5%" }}>STT</th>
                            <th style={{ width: "8%" }}>Năm</th>
                            <th style={{ width: "15%" }}>Nhân viên</th>
                            <th style={{ width: "12%" }}>Nhóm vi phạm</th>
                            <th style={{ width: "15%" }}>Loại vi phạm</th>
                            <th style={{ width: "15%" }}>Mô tả</th>
                            <th style={{ width: "8%", textAlign: "center" }}>Điểm trừ</th>
                            <th style={{ width: "10%", textAlign: "center" }}>Minh chứng</th>
                            <th style={{ width: "8%", textAlign: "center" }}>Ngày VP</th>
                            <th style={{ width: "8%", textAlign: "center" }}>Kỷ luật</th>
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
                                <td style={{ fontSize: "13px", color: "#334155" }}>{vp.loai}</td>
                                <td style={{ fontSize: "13px", color: "#475569" }}>{vp.moTa}</td>
                                <td style={{ textAlign: "center", color: "#b45309", fontWeight: "bold", backgroundColor: "#fffbeb" }}>{vp.diemTru.toFixed(2)}</td>
                                <td style={{ textAlign: "center" }}>
                                    <span style={{ color: "#ef4444", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}><i className="fa-solid fa-file-pdf"></i> {vp.minhChung}</span>
                                </td>
                                <td style={{ textAlign: "center", fontSize: "13px", color: "#64748b" }}>{vp.ngayVp}</td>
                                <td style={{ textAlign: "center", fontSize: "13px", color: "#64748b" }}>{vp.kyLuat}</td>
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
        </div>
    );
};

export default GhiNhanViPhamNhanVienMock;