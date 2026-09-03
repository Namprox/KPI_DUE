import React, { useState } from "react";
import "../../css/Pages.css";

const MOCK_DON_VI = [
    { id: 1, ten: "Khoa Công nghệ thông tin", loai: "Khoa", diem: 105, tyLeHTNV: 100 },
    { id: 2, ten: "Khoa Quản trị kinh doanh", loai: "Khoa", diem: 98, tyLeHTNV: 100 },
    { id: 3, ten: "Khoa Kế toán", loai: "Khoa", diem: 95, tyLeHTNV: 95 },
    { id: 4, ten: "Khoa Tài chính", loai: "Khoa", diem: 92, tyLeHTNV: 100 },
    { id: 5, ten: "Khoa Luật", loai: "Khoa", diem: 85, tyLeHTNV: 100 },
];

const BangXepHangDonViMock = () => {
    const [dsDonVi, setDsDonVi] = useState(MOCK_DON_VI.sort((a, b) => b.diem - a.diem));
    const hanNgachXuatSac = Math.floor(dsDonVi.length * 0.2);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>BẢNG XẾP HẠNG & XÉT DUYỆT ĐƠN VỊ</h2>
                <span className="breadcrumb">Cấp Trường • Xét duyệt Top 20% Đơn vị Xuất sắc</span>
            </div>

            <div style={{ backgroundColor: "#f0fdf4", padding: "15px", borderRadius: "8px", border: "1px solid #bbf7d0", marginBottom: "20px" }}>
                <div style={{ fontWeight: "bold", color: "#166534", marginBottom: "5px" }}>Quy định xét Xuất sắc cho Đơn vị:</div>
                <ul style={{ margin: 0, paddingLeft: "20px", color: "#15803d", fontSize: "14px" }}>
                    <li>Tổng điểm tích lũy &gt; 100 (đối với Khoa) hoặc &gt; 80 (đối với Phòng).</li>
                    <li>Đạt 100% nhân sự hoàn thành nhiệm vụ trở lên (trong đó 70% đạt mức Hoàn thành Tốt).</li>
                    <li>Nằm trong <b>Top 20%</b> đơn vị có điểm cao nhất toàn trường.</li>
                </ul>
            </div>

            <div className="modern-table-card" style={{ padding: "20px" }}>
                <div style={{ fontWeight: "bold", color: "#334155", marginBottom: "15px" }}>
                    Tổng số Đơn vị: {dsDonVi.length} | Quỹ Xuất sắc tối đa: <span style={{ color: "#ef4444" }}>{hanNgachXuatSac} đơn vị</span>
                </div>

                <table className="custom-table" style={{ width: "100%" }}>
                    <thead>
                        <tr>
                            <th style={{ width: "10%", textAlign: "center" }}>Hạng</th>
                            <th style={{ width: "35%" }}>Tên Đơn vị</th>
                            <th style={{ width: "15%", textAlign: "center" }}>Tỷ lệ HTNV</th>
                            <th style={{ width: "15%", textAlign: "center" }}>Tổng điểm</th>
                            <th style={{ width: "25%", textAlign: "center" }}>Xếp loại Hệ thống Đề xuất</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dsDonVi.map((dv, index) => {
                            const datXuatSac = index < hanNgachXuatSac && dv.diem > 100 && dv.tyLeHTNV === 100;
                            const datTot = !datXuatSac && dv.diem > 80;

                            return (
                                <tr key={dv.id} style={{ backgroundColor: index < hanNgachXuatSac ? "#f8fafc" : "transparent" }}>
                                    <td style={{ textAlign: "center", fontWeight: "bold", color: index < hanNgachXuatSac ? "#ef4444" : "#64748b" }}>#{index + 1}</td>
                                    <td style={{ fontWeight: "bold" }}>{dv.ten}</td>
                                    <td style={{ textAlign: "center", color: dv.tyLeHTNV === 100 ? "#10b981" : "#f59e0b", fontWeight: "bold" }}>{dv.tyLeHTNV}%</td>
                                    <td style={{ textAlign: "center", fontWeight: "bold", color: "#1d4ed8" }}>{dv.diem}</td>
                                    <td style={{ textAlign: "center" }}>
                                        <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", backgroundColor: datXuatSac ? "#dcfce7" : datTot ? "#dbeafe" : "#fef3c7", color: datXuatSac ? "#166534" : datTot ? "#1e40af" : "#b45309" }}>
                                            {datXuatSac ? "Hoàn thành Xuất sắc" : datTot ? "Hoàn thành Tốt" : "Hoàn thành nhiệm vụ"}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
                <button className="btn-submit" style={{ backgroundColor: "#10b981", borderColor: "#10b981", padding: "10px 20px", fontSize: "15px" }}>
                    <i className="fa-solid fa-stamp"></i> Chốt Quyết định Xếp loại toàn Trường
                </button>
            </div>
        </div>
    );
};

export default BangXepHangDonViMock;