import React, { useState } from "react";
import "../../css/Pages.css";

const AdminMauPhieuMockPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px", fontWeight: 700 }}>
                    CẤU HÌNH NHÓM TIÊU CHÍ (MOCK ADMIN)
                </h2>
                <span className="breadcrumb">Quản trị hệ thống • Mẫu phiếu Nhân viên / Người lao động</span>
            </div>

            <div className="modern-table-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold", color: "#334155" }}>
                        <i className="fa-solid fa-list-check"></i> Cấu trúc Nhóm tiêu chí - Phụ lục 3
                    </div>
                    <button className="btn-submit" onClick={() => setIsModalOpen(true)} style={{ backgroundColor: "#3b82f6", borderColor: "#3b82f6" }}>
                        <i className="fa-solid fa-plus"></i> Thêm Nhóm Mới
                    </button>
                </div>

                <table className="custom-table" style={{ width: "100%" }}>
                    <thead>
                        <tr>
                            <th style={{ width: "5%", textAlign: "center" }}>STT</th>
                            <th style={{ width: "40%" }}>Tên Nhóm</th>
                            <th style={{ width: "20%" }}>Loại Nhóm (Hệ thống)</th>
                            <th style={{ width: "20%", textAlign: "center" }}>Cơ chế điểm</th>
                            <th style={{ width: "15%", textAlign: "center" }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ textAlign: "center", fontWeight: "bold" }}>1</td>
                            <td style={{ fontWeight: "bold" }}>I. Nhiệm vụ cơ bản</td>
                            <td><span className="tag-badge" style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>Nhóm Cơ bản</span></td>
                            <td style={{ textAlign: "center" }}>Cộng dồn (0 - Max)</td>
                            <td style={{ textAlign: "center", color: "#3b82f6", cursor: "pointer" }}><i className="fa-solid fa-pen"></i></td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: "center", fontWeight: "bold" }}>2</td>
                            <td style={{ fontWeight: "bold" }}>II. Thành tích vượt trội</td>
                            <td><span className="tag-badge" style={{ backgroundColor: "#f0fdf4", color: "#166534" }}>Nhóm Vượt trội</span></td>
                            <td style={{ textAlign: "center" }}>Cộng dồn (0 - Max)</td>
                            <td style={{ textAlign: "center", color: "#3b82f6", cursor: "pointer" }}><i className="fa-solid fa-pen"></i></td>
                        </tr>
                        <tr>
                            <td style={{ textAlign: "center", fontWeight: "bold" }}>3</td>
                            <td style={{ fontWeight: "bold" }}>III. Chấp hành quy định</td>
                            <td><span className="tag-badge" style={{ backgroundColor: "#fef2f2", color: "#991b1b" }}>Nhóm Điểm trừ</span></td>
                            <td style={{ textAlign: "center", color: "#ef4444", fontWeight: "bold" }}>Trừ điểm (Âm)</td>
                            <td style={{ textAlign: "center", color: "#3b82f6", cursor: "pointer" }}><i className="fa-solid fa-pen"></i></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 10000 }}>
                    <div className="modal-box" style={{ width: "500px", padding: "20px" }}>
                        <h3 style={{ marginTop: 0, borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Thêm Nhóm Tiêu Chí</h3>

                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px", fontSize: "13px" }}>Tên nhóm *</label>
                            <input type="text" className="form-input" placeholder="VD: III. Chấp hành quy định..." style={{ width: "100%" }} />
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <label style={{ display: "block", fontWeight: "bold", marginBottom: "5px", fontSize: "13px" }}>Loại nhóm nội bộ *</label>
                            <select className="form-input" style={{ width: "100%" }}>
                                <option>1 - Nhóm Tiêu chí Cơ bản</option>
                                <option>2 - Nhóm Thành tích Vượt trội</option>
                                <option>3 - Nhóm Điểm trừ (Vi phạm)</option>
                            </select>
                        </div>

                        <div style={{ backgroundColor: "#fef2f2", padding: "12px", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "20px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                                <input type="checkbox" defaultChecked style={{ width: "18px", height: "18px", accentColor: "#ef4444" }} />
                                <span style={{ fontWeight: "bold", color: "#991b1b", fontSize: "14px" }}>Bật cơ chế điểm trừ (Chỉ cho phép nhập số âm)</span>
                            </label>
                            <p style={{ margin: "5px 0 0 26px", fontSize: "12px", color: "#b91c1c" }}>Khi check mục này, giao diện đánh giá sẽ tự động hiển thị màu cảnh báo và chặn nhập số dương.</p>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Hủy</button>
                            <button className="btn-submit" onClick={() => setIsModalOpen(false)}>Lưu cấu hình</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMauPhieuMockPage;