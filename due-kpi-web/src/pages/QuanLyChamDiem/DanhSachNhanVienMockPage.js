import React, { useState } from "react";
import "../../css/Pages.css";

const MOCK_DANH_SACH = [
    { Id: 1, MaNV: "NV001", HoTen: "Nguyễn Văn Test", ChucDanh: "Chuyên viên", DiemTuCham: 110, TrangThai: "Chờ thẩm định" },
    { Id: 2, MaNV: "NV002", HoTen: "Trần Thị Mock", ChucDanh: "Nhân viên", DiemTuCham: 85, TrangThai: "Chờ thẩm định" },
    { Id: 3, MaNV: "NV003", HoTen: "Lê Văn Demo", ChucDanh: "Nghiên cứu viên", DiemTuCham: 135, TrangThai: "Đã thẩm định", DiemThamDinh: 125, XepLoai: "Hoàn thành tốt" },
];

const DanhSachNhanVienMockPage = () => {
    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px", fontWeight: 700 }}>
                    DANH SÁCH NHÂN VIÊN CHỜ THẨM ĐỊNH (MOCK)
                </h2>
                <span className="breadcrumb">Phòng Đào tạo • Kỳ đánh giá 2026</span>
            </div>

            <div className="modern-table-card" style={{ padding: "20px", overflowX: "auto" }}>
                <table className="custom-table" style={{ width: "100%" }}>
                    <thead>
                        <tr>
                            <th style={{ width: "5%", textAlign: "center" }}>STT</th>
                            <th style={{ width: "10%" }}>Mã NV</th>
                            <th style={{ width: "25%" }}>Họ tên</th>
                            <th style={{ width: "15%" }}>Chức danh</th>
                            <th style={{ width: "10%", textAlign: "center" }}>Điểm tự chấm</th>
                            <th style={{ width: "10%", textAlign: "center" }}>Điểm thẩm định</th>
                            <th style={{ width: "15%", textAlign: "center" }}>Trạng thái</th>
                            <th style={{ width: "10%", textAlign: "center" }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_DANH_SACH.map((nv, idx) => (
                            <tr key={nv.Id}>
                                <td style={{ textAlign: "center", fontWeight: "bold" }}>{idx + 1}</td>
                                <td><span className="code-pill">{nv.MaNV}</span></td>
                                <td style={{ fontWeight: "bold", color: "#0f172a" }}>{nv.HoTen}</td>
                                <td>{nv.ChucDanh}</td>
                                <td style={{ textAlign: "center", fontWeight: "bold", color: "#0284c7" }}>{nv.DiemTuCham}đ</td>
                                <td style={{ textAlign: "center", fontWeight: "bold", color: "#b45309" }}>{nv.DiemThamDinh ? `${nv.DiemThamDinh}đ` : "-"}</td>
                                <td style={{ textAlign: "center" }}>
                                    {nv.TrangThai === "Chờ thẩm định" ? (
                                        <span className="tag-badge" style={{ backgroundColor: "#fef3c7", color: "#d97706", border: "1px solid #fde68a" }}>Chờ thẩm định</span>
                                    ) : (
                                        <span className="tag-badge" style={{ backgroundColor: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>Đã thẩm định</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                                        <button
                                            title="Vào Thẩm định"
                                            style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "16px" }}
                                            onClick={() => window.location.href = "/mock-tham-dinh-nhan-vien"}
                                        >
                                            <i className="fa-solid fa-pen-to-square"></i>
                                        </button>
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

export default DanhSachNhanVienMockPage;