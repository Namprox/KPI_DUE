import React, { useState } from "react";
import "../../css/Pages.css";

const MOCK_DON_VI = [
    {
        id: "K01",
        ten: "Khoa Luật",
        loai: "Khoa",
        diem: 102.5,
        deXuat: "A+",
        trangThai: "Chờ duyệt",
        chiTiet: {
            diemCoBan: {
                tong: 82.5,
                daoTao: 35.0,
                nckh: 30.5,
                phucVu: 17.0
            },
            diemVuotTroi: 20.0,
            thanhTichNoiBat: [
                { ten: "Thực hiện kiểm định thành công 1 CTĐT", diem: 10 },
                { ten: "Sinh viên tốt nghiệp đúng hạn đạt >70%", diem: 5 },
                { ten: "Tăng 1 Tiến sĩ trong năm học", diem: 5 }
            ],
            xepLoaiNhanSu: { aPlus: 5, a: 25, b: 2, c: 0 }
        }
    },
    {
        id: "P01",
        ten: "Phòng Đào tạo",
        loai: "Phòng",
        diem: 85.0,
        deXuat: "A+",
        trangThai: "Chờ duyệt",
        chiTiet: {
            diemCoBan: {
                tong: 70.0,
                daoTao: 0,
                nckh: 0,
                phucVu: 70.0
            },
            diemVuotTroi: 15.0,
            thanhTichNoiBat: [
                { ten: "Có sáng kiến xử lý công việc phát sinh mới", diem: 10 },
                { ten: "Đóng góp vào chương trình trọng điểm của Trường", diem: 5 }
            ],
            xepLoaiNhanSu: { aPlus: 2, a: 10, b: 0, c: 0 }
        }
    },
    {
        id: "K02",
        ten: "Khoa CNTT",
        loai: "Khoa",
        diem: 95.0,
        deXuat: "A",
        trangThai: "Đã duyệt",
        chiTiet: null
    }
];

const MOCK_TANG_HANG = [
    { id: 1, donVi: "Khoa Luật", nhanVien: "Nguyễn Văn Test", tu: "B", len: "A", lyDo: "Thành tích xuất sắc đột xuất", trangThai: "Chờ duyệt" }
];

const HieuTruongDuyetKpiMock = () => {
    const [activeTab, setActiveTab] = useState("DON_VI");
    const [selectedUnit, setSelectedUnit] = useState(null);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>BẢNG ĐIỀU KHIỂN PHÊ DUYỆT KPI CẤP TRƯỜNG</h2>
                <span className="breadcrumb">Quyền truy cập: Hiệu trưởng / Admin toàn hệ thống</span>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <div style={{ flex: 1, padding: "15px", backgroundColor: "#fff", borderRadius: "8px", borderLeft: "4px solid #3b82f6", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}>TỔNG CÁN BỘ / GIẢNG VIÊN</div>
                    <div style={{ fontSize: "24px", color: "#1e293b", fontWeight: "bold", marginTop: "5px" }}>845</div>
                </div>
                <div style={{ flex: 1, padding: "15px", backgroundColor: "#fff", borderRadius: "8px", borderLeft: "4px solid #10b981", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}>ĐƠN VỊ ĐÃ TRÌNH DUYỆT</div>
                    <div style={{ fontSize: "24px", color: "#1e293b", fontWeight: "bold", marginTop: "5px" }}>24 / 32</div>
                </div>
                <div style={{ flex: 1, padding: "15px", backgroundColor: "#fff", borderRadius: "8px", borderLeft: "4px solid #f59e0b", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}>ĐỀ XUẤT TĂNG HẠNG CHỜ DUYỆT</div>
                    <div style={{ fontSize: "24px", color: "#1e293b", fontWeight: "bold", marginTop: "5px" }}>12</div>
                </div>
            </div>

            <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                    Kiểm soát tỷ lệ Xếp loại toàn trường (Giới hạn A+ không quá 20%)
                </h4>
                <div style={{ display: "flex", alignItems: "flex-end", height: "220px", gap: "20px", padding: "10px 20px 0 20px", borderBottom: "2px solid #cbd5e1" }}>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>18%</span>
                        <div style={{ width: "60px", height: "35%", backgroundColor: "#8b5cf6", borderRadius: "4px 4px 0 0" }}></div>
                        <span style={{ fontWeight: "bold", color: "#1e293b", marginTop: "5px" }}>A+ (Xuất sắc)</span>
                    </div>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>65%</span>
                        <div style={{ width: "60px", height: "90%", backgroundColor: "#3b82f6", borderRadius: "4px 4px 0 0" }}></div>
                        <span style={{ fontWeight: "bold", color: "#1e293b", marginTop: "5px" }}>A (Tốt)</span>
                    </div>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>15%</span>
                        <div style={{ width: "60px", height: "25%", backgroundColor: "#10b981", borderRadius: "4px 4px 0 0" }}></div>
                        <span style={{ fontWeight: "bold", color: "#1e293b", marginTop: "5px" }}>B (Hoàn thành)</span>
                    </div>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>2%</span>
                        <div style={{ width: "60px", height: "5%", backgroundColor: "#ef4444", borderRadius: "4px 4px 0 0" }}></div>
                        <span style={{ fontWeight: "bold", color: "#1e293b", marginTop: "5px" }}>C (Không HT)</span>
                    </div>

                </div>
                <div style={{ textAlign: "center", marginTop: "15px", fontSize: "13px", color: "#64748b" }}>
                    <i className="fa-solid fa-circle-info" style={{ color: "#3b82f6" }}></i> Tỷ lệ A+ đang ở mức an toàn (Dưới 20% theo Điều 5).
                </div>
            </div>

            <div style={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
                <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                    <button
                        style={{ padding: "15px 20px", border: "none", background: activeTab === "DON_VI" ? "#fff" : "transparent", borderBottom: activeTab === "DON_VI" ? "2px solid #2563eb" : "none", fontWeight: "bold", color: activeTab === "DON_VI" ? "#2563eb" : "#64748b", cursor: "pointer" }}
                        onClick={() => setActiveTab("DON_VI")}
                    >
                        PHÊ DUYỆT KẾT QUẢ ĐƠN VỊ
                    </button>
                    <button
                        style={{ padding: "15px 20px", border: "none", background: activeTab === "TANG_HANG" ? "#fff" : "transparent", borderBottom: activeTab === "TANG_HANG" ? "2px solid #d97706" : "none", fontWeight: "bold", color: activeTab === "TANG_HANG" ? "#d97706" : "#64748b", cursor: "pointer" }}
                        onClick={() => setActiveTab("TANG_HANG")}
                    >
                        PHÊ DUYỆT ĐỀ XUẤT TĂNG HẠNG
                    </button>
                </div>

                <div style={{ padding: "20px" }}>
                    {activeTab === "DON_VI" && (
                        <table className="custom-table" style={{ width: "100%", textAlign: "left" }}>
                            <thead>
                                <tr style={{ color: "#64748b", fontSize: "12px", backgroundColor: "#f1f5f9" }}>
                                    <th style={{ padding: "12px" }}>MÃ ĐƠN VỊ</th>
                                    <th style={{ padding: "12px" }}>TÊN ĐƠN VỊ</th>
                                    <th style={{ padding: "12px", textAlign: "center" }}>TỔNG ĐIỂM</th>
                                    <th style={{ padding: "12px", textAlign: "center" }}>ĐỀ XUẤT XL</th>
                                    <th style={{ padding: "12px", textAlign: "center" }}>CHI TIẾT</th>
                                    <th style={{ padding: "12px", textAlign: "center" }}>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_DON_VI.map(dv => (
                                    <tr key={dv.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                        <td style={{ padding: "12px", fontWeight: "bold" }}>{dv.id}</td>
                                        <td style={{ padding: "12px", color: "#1e293b", fontWeight: "bold" }}>{dv.ten}</td>
                                        <td style={{ padding: "12px", textAlign: "center", color: "#2563eb", fontWeight: "bold" }}>{dv.diem.toFixed(2)}</td>
                                        <td style={{ padding: "12px", textAlign: "center" }}>
                                            <span style={{ backgroundColor: dv.deXuat === "A+" ? "#ede9fe" : "#dbeafe", color: dv.deXuat === "A+" ? "#7c3aed" : "#1d4ed8", padding: "4px 12px", borderRadius: "12px", fontWeight: "bold" }}>
                                                {dv.deXuat}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "center" }}>
                                            <button
                                                onClick={() => setSelectedUnit(dv)}
                                                style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "6px 10px", cursor: "pointer", color: "#3b82f6", fontSize: "12px", fontWeight: "bold", transition: "0.2s" }}
                                                onMouseOver={(e) => e.target.style.background = '#e0f2fe'}
                                                onMouseOut={(e) => e.target.style.background = '#f8fafc'}
                                            >
                                                <i className="fa-solid fa-magnifying-glass-chart"></i> Xem Báo cáo
                                            </button>
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "center" }}>
                                            {dv.trangThai === "Chờ duyệt" ? (
                                                <button style={{ backgroundColor: "#10b981", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}><i className="fa-solid fa-check"></i> Duyệt</button>
                                            ) : (
                                                <span style={{ color: "#10b981", fontWeight: "bold" }}><i className="fa-solid fa-check-double"></i> Đã duyệt</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === "TANG_HANG" && (
                        <table className="custom-table" style={{ width: "100%", textAlign: "left" }}>
                            <thead>
                                <tr style={{ color: "#64748b", fontSize: "12px", backgroundColor: "#fef3c7" }}>
                                    <th style={{ padding: "12px" }}>ĐƠN VỊ TRÌNH</th>
                                    <th style={{ padding: "12px" }}>CÁ NHÂN</th>
                                    <th style={{ padding: "12px", textAlign: "center" }}>NỘI DUNG</th>
                                    <th style={{ padding: "12px" }}>CHI TIẾT</th>
                                    <th style={{ padding: "12px", textAlign: "center" }}>PHÊ DUYỆT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_TANG_HANG.map(th => (
                                    <tr key={th.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                        <td style={{ padding: "12px", fontWeight: "bold" }}>{th.donVi}</td>
                                        <td style={{ padding: "12px" }}>
                                            <div style={{ fontWeight: "bold", color: "#1e293b" }}>{th.nhanVien}</div>
                                            <div style={{ fontSize: "12px", color: "#64748b" }}>{th.lyDo}</div>
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "center" }}>
                                            <span style={{ color: "#64748b", textDecoration: "line-through" }}>{th.tu}</span> <i className="fa-solid fa-arrow-right" style={{ margin: "0 5px", color: "#10b981" }}></i> <span style={{ color: "#10b981", fontWeight: "bold" }}>{th.len}</span>
                                        </td>
                                        <td style={{ padding: "12px" }}>
                                            <button style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "6px 10px", cursor: "pointer", color: "#3b82f6", fontSize: "12px", fontWeight: "bold" }}>
                                                <i className="fa-solid fa-folder-open"></i> Mở tờ trình
                                            </button>
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "center", display: "flex", gap: "5px", justifyContent: "center" }}>
                                            <button style={{ backgroundColor: "#10b981", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer" }}><i className="fa-solid fa-check"></i></button>
                                            <button style={{ backgroundColor: "#ef4444", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer" }}><i className="fa-solid fa-xmark"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {selectedUnit && selectedUnit.chiTiet && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                    <div style={{ backgroundColor: "#fff", width: "850px", borderRadius: "8px", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
                        <div style={{ padding: "15px 20px", backgroundColor: "#1a58bb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h3 style={{ margin: 0, color: "#fff" }}>BÁO CÁO PHÂN TÍCH ĐIỂM KPI: {selectedUnit.ten.toUpperCase()}</h3>
                            <button onClick={() => setSelectedUnit(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}>&times;</button>
                        </div>

                        <div style={{ padding: "20px", maxHeight: "75vh", overflowY: "auto" }}>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", marginBottom: "20px" }}>
                                <div>
                                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}>TỔNG ĐIỂM TÍCH LŨY</div>
                                    <div style={{ fontSize: "28px", color: "#2563eb", fontWeight: "bold" }}>{selectedUnit.diem.toFixed(2)}</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}>ĐỀ XUẤT XẾP LOẠI</div>
                                    <div style={{ fontSize: "28px", color: selectedUnit.deXuat === "A+" ? "#7c3aed" : "#10b981", fontWeight: "bold" }}>{selectedUnit.deXuat}</div>
                                </div>
                            </div>

                            <h4 style={{ margin: "0 0 10px 0", color: "#1e293b", borderBottom: "2px solid #e2e8f0", paddingBottom: "5px" }}>I. Nhóm nhiệm vụ cơ bản ({selectedUnit.chiTiet.diemCoBan.tong}đ / 100đ)</h4>
                            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                                <div style={{ flex: 1, padding: "10px", backgroundColor: "#f1f5f9", borderRadius: "6px", borderLeft: "3px solid #3b82f6" }}>
                                    <div style={{ fontSize: "12px", color: "#475569", fontWeight: "bold" }}>ĐÀO TẠO & GIẢNG DẠY</div>
                                    <div style={{ fontSize: "18px", color: "#1e293b", fontWeight: "bold" }}>{selectedUnit.chiTiet.diemCoBan.daoTao} / 40đ</div>
                                </div>
                                <div style={{ flex: 1, padding: "10px", backgroundColor: "#f1f5f9", borderRadius: "6px", borderLeft: "3px solid #8b5cf6" }}>
                                    <div style={{ fontSize: "12px", color: "#475569", fontWeight: "bold" }}>NGHIÊN CỨU KHOA HỌC</div>
                                    <div style={{ fontSize: "18px", color: "#1e293b", fontWeight: "bold" }}>{selectedUnit.chiTiet.diemCoBan.nckh} / 40đ</div>
                                </div>
                                <div style={{ flex: 1, padding: "10px", backgroundColor: "#f1f5f9", borderRadius: "6px", borderLeft: "3px solid #f59e0b" }}>
                                    <div style={{ fontSize: "12px", color: "#475569", fontWeight: "bold" }}>PHỤC VỤ CỘNG ĐỒNG</div>
                                    <div style={{ fontSize: "18px", color: "#1e293b", fontWeight: "bold" }}>{selectedUnit.chiTiet.diemCoBan.phucVu} / 20đ</div>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "5px", marginBottom: "10px" }}>
                                <h4 style={{ margin: 0, color: "#1e293b" }}>II. Thành tích vượt trội</h4>
                                <div style={{ fontWeight: "bold", color: "#10b981", fontSize: "16px" }}>+{selectedUnit.chiTiet.diemVuotTroi}đ</div>
                            </div>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "13px" }}>
                                <tbody>
                                    {selectedUnit.chiTiet.thanhTichNoiBat.map((tt, idx) => (
                                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "8px 0", color: "#475569" }}><i className="fa-solid fa-medal" style={{ color: "#fbbf24", marginRight: "8px" }}></i> {tt.ten}</td>
                                            <td style={{ padding: "8px 0", textAlign: "right", color: "#10b981", fontWeight: "bold" }}>+{tt.diem}đ</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <h4 style={{ margin: "0 0 10px 0", color: "#1e293b", borderBottom: "2px solid #e2e8f0", paddingBottom: "5px" }}>Phổ điểm xếp loại Cán bộ / Giảng viên thuộc đơn vị:</h4>
                            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                                <div style={{ flex: 1, padding: "8px", backgroundColor: "#ede9fe", color: "#7c3aed", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}>A+ (Xuất sắc): {selectedUnit.chiTiet.xepLoaiNhanSu.aPlus}</div>
                                <div style={{ flex: 1, padding: "8px", backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}>A (Tốt): {selectedUnit.chiTiet.xepLoaiNhanSu.a}</div>
                                <div style={{ flex: 1, padding: "8px", backgroundColor: "#dcfce7", color: "#15803d", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}>B (Hoàn thành): {selectedUnit.chiTiet.xepLoaiNhanSu.b}</div>
                                <div style={{ flex: 1, padding: "8px", backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}>C (Không HT): {selectedUnit.chiTiet.xepLoaiNhanSu.c}</div>
                            </div>

                        </div>

                        <div style={{ padding: "15px 20px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                            <button style={{ padding: "8px 16px", backgroundColor: "#fff", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", color: "#475569" }}>
                                <i className="fa-solid fa-file-pdf" style={{ color: "#ef4444", marginRight: "5px" }}></i> Tải toàn văn hồ sơ gốc
                            </button>
                            <button onClick={() => setSelectedUnit(null)} style={{ padding: "8px 16px", backgroundColor: "#64748b", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", color: "#fff" }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HieuTruongDuyetKpiMock;