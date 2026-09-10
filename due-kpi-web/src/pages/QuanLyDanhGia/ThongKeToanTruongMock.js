import React, { useState } from "react";
import "../../css/Pages.css";

const ThongKeToanTruongMock = () => {
    const [namHoc] = useState("2025-2026");

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>THỐNG KÊ TỔNG HỢP TOÀN TRƯỜNG</h2>
                <span className="breadcrumb">Phân tích dữ liệu Đánh giá KPI • Năm học {namHoc}</span>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <div style={{ flex: 1, padding: "20px", backgroundColor: "#fff", borderRadius: "8px", borderTop: "4px solid #3b82f6", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold", marginBottom: "8px" }}>TỶ LỆ HOÀN THÀNH TỐT TRỞ LÊN (A, A+)</div>
                        <div style={{ fontSize: "28px", color: "#1e293b", fontWeight: "bold" }}>82.5%</div>
                    </div>
                    <i className="fa-solid fa-chart-pie" style={{ fontSize: "40px", color: "#eff6ff" }}></i>
                </div>
                <div style={{ flex: 1, padding: "20px", backgroundColor: "#fff", borderRadius: "8px", borderTop: "4px solid #10b981", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold", marginBottom: "8px" }}>TỔNG SỐ SÁNG KIẾN / BÀI BÁO (Q1, Q2)</div>
                        <div style={{ fontSize: "28px", color: "#1e293b", fontWeight: "bold" }}>142</div>
                    </div>
                    <i className="fa-solid fa-flask" style={{ fontSize: "40px", color: "#f0fdf4" }}></i>
                </div>
                <div style={{ flex: 1, padding: "20px", backgroundColor: "#fff", borderRadius: "8px", borderTop: "4px solid #ef4444", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold", marginBottom: "8px" }}>TỔNG LƯỢT VI PHẠM KỶ LUẬT</div>
                        <div style={{ fontSize: "28px", color: "#1e293b", fontWeight: "bold" }}>38</div>
                    </div>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "40px", color: "#fef2f2" }}></i>
                </div>
            </div>

            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>

                <div style={{ flex: 2, backgroundColor: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                        <h4 style={{ margin: 0, color: "#1e293b" }}>Cơ cấu Xếp loại KPI theo Khối</h4>
                        <div style={{ display: "flex", gap: "15px", fontSize: "12px" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><div style={{ width: "12px", height: "12px", backgroundColor: "#3b82f6", borderRadius: "2px" }}></div> Khối Giảng dạy</span>
                            <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><div style={{ width: "12px", height: "12px", backgroundColor: "#94a3b8", borderRadius: "2px" }}></div> Khối Hành chính</span>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end", height: "250px", gap: "30px", paddingBottom: "10px", borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "5px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>18%</span>
                                <div style={{ width: "40px", height: "18%", backgroundColor: "#3b82f6", borderRadius: "4px 4px 0 0" }}></div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>15%</span>
                                <div style={{ width: "40px", height: "15%", backgroundColor: "#94a3b8", borderRadius: "4px 4px 0 0" }}></div>
                            </div>
                        </div>
                        <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "5px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>62%</span>
                                <div style={{ width: "40px", height: "62%", backgroundColor: "#3b82f6", borderRadius: "4px 4px 0 0" }}></div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>68%</span>
                                <div style={{ width: "40px", height: "68%", backgroundColor: "#94a3b8", borderRadius: "4px 4px 0 0" }}></div>
                            </div>
                        </div>
                        <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "5px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>18%</span>
                                <div style={{ width: "40px", height: "18%", backgroundColor: "#3b82f6", borderRadius: "4px 4px 0 0" }}></div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>15%</span>
                                <div style={{ width: "40px", height: "15%", backgroundColor: "#94a3b8", borderRadius: "4px 4px 0 0" }}></div>
                            </div>
                        </div>
                        <div style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "5px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>2%</span>
                                <div style={{ width: "40px", height: "2%", backgroundColor: "#3b82f6", borderRadius: "4px 4px 0 0" }}></div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                                <span style={{ fontSize: "11px", color: "#64748b", marginBottom: "5px" }}>2%</span>
                                <div style={{ width: "40px", height: "2%", backgroundColor: "#94a3b8", borderRadius: "4px 4px 0 0" }}></div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: "flex", marginTop: "10px" }}>
                        <div style={{ flex: 1, textAlign: "center", fontWeight: "bold", color: "#475569" }}>Xuất sắc (A+)</div>
                        <div style={{ flex: 1, textAlign: "center", fontWeight: "bold", color: "#475569" }}>Tốt (A)</div>
                        <div style={{ flex: 1, textAlign: "center", fontWeight: "bold", color: "#475569" }}>Hoàn thành (B)</div>
                        <div style={{ flex: 1, textAlign: "center", fontWeight: "bold", color: "#475569" }}>Không HT (C)</div>
                    </div>
                </div>

                <div style={{ flex: 1, backgroundColor: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                    <h4 style={{ margin: "0 0 20px 0", color: "#1e293b" }}>Top 4 Khoa dẫn đầu NCKH</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold", color: "#475569" }}>
                                <span>Khoa CNTT</span> <span>1,240 điểm</span>
                            </div>
                            <div style={{ width: "100%", backgroundColor: "#f1f5f9", borderRadius: "4px", height: "12px" }}>
                                <div style={{ width: "100%", backgroundColor: "#10b981", height: "100%", borderRadius: "4px" }}></div>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold", color: "#475569" }}>
                                <span>Khoa Kinh tế</span> <span>980 điểm</span>
                            </div>
                            <div style={{ width: "100%", backgroundColor: "#f1f5f9", borderRadius: "4px", height: "12px" }}>
                                <div style={{ width: "78%", backgroundColor: "#10b981", height: "100%", borderRadius: "4px" }}></div>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold", color: "#475569" }}>
                                <span>Khoa Kế toán</span> <span>850 điểm</span>
                            </div>
                            <div style={{ width: "100%", backgroundColor: "#f1f5f9", borderRadius: "4px", height: "12px" }}>
                                <div style={{ width: "65%", backgroundColor: "#10b981", height: "100%", borderRadius: "4px" }}></div>
                            </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: "bold", color: "#475569" }}>
                                <span>Khoa QTKD</span> <span>720 điểm</span>
                            </div>
                            <div style={{ width: "100%", backgroundColor: "#f1f5f9", borderRadius: "4px", height: "12px" }}>
                                <div style={{ width: "55%", backgroundColor: "#10b981", height: "100%", borderRadius: "4px" }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <h4 style={{ margin: "0 0 15px 0", color: "#1e293b" }}>Xu hướng ghi nhận Vi phạm Kỷ luật / Trễ hạn (Quý 3 & 4)</h4>

                <div style={{ display: "flex", alignItems: "flex-end", height: "200px", gap: "40px", padding: "10px 40px 0 40px", borderBottom: "2px solid #cbd5e1" }}>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#ef4444", marginBottom: "5px" }}>12 lỗi</span>
                        <div style={{ width: "16px", height: "16px", backgroundColor: "#ef4444", borderRadius: "50%", border: "3px solid #fff", boxShadow: "0 0 0 1px #ef4444", zIndex: 2 }}></div>
                        <div style={{ width: "4px", height: "40%", backgroundColor: "#fecaca", marginTop: "-2px" }}></div>
                    </div>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#ef4444", marginBottom: "5px" }}>18 lỗi</span>
                        <div style={{ width: "16px", height: "16px", backgroundColor: "#ef4444", borderRadius: "50%", border: "3px solid #fff", boxShadow: "0 0 0 1px #ef4444", zIndex: 2 }}></div>
                        <div style={{ width: "4px", height: "60%", backgroundColor: "#fecaca", marginTop: "-2px" }}></div>
                    </div>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#ef4444", marginBottom: "5px" }}>25 lỗi</span>
                        <div style={{ width: "16px", height: "16px", backgroundColor: "#ef4444", borderRadius: "50%", border: "3px solid #fff", boxShadow: "0 0 0 1px #ef4444", zIndex: 2 }}></div>
                        <div style={{ width: "4px", height: "85%", backgroundColor: "#fecaca", marginTop: "-2px" }}></div>
                    </div>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#ef4444", marginBottom: "5px" }}>8 lỗi</span>
                        <div style={{ width: "16px", height: "16px", backgroundColor: "#ef4444", borderRadius: "50%", border: "3px solid #fff", boxShadow: "0 0 0 1px #ef4444", zIndex: 2 }}></div>
                        <div style={{ width: "4px", height: "25%", backgroundColor: "#fecaca", marginTop: "-2px" }}></div>
                    </div>

                    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "12px", fontWeight: "bold", color: "#ef4444", marginBottom: "5px" }}>4 lỗi</span>
                        <div style={{ width: "16px", height: "16px", backgroundColor: "#ef4444", borderRadius: "50%", border: "3px solid #fff", boxShadow: "0 0 0 1px #ef4444", zIndex: 2 }}></div>
                        <div style={{ width: "4px", height: "10%", backgroundColor: "#fecaca", marginTop: "-2px" }}></div>
                    </div>

                </div>
                <div style={{ display: "flex", padding: "10px 40px 0 40px" }}>
                    <div style={{ flex: 1, textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>Tháng 8</div>
                    <div style={{ flex: 1, textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>Tháng 9</div>
                    <div style={{ flex: 1, textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>Tháng 10 (Đỉnh điểm)</div>
                    <div style={{ flex: 1, textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>Tháng 11</div>
                    <div style={{ flex: 1, textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>Tháng 12</div>
                </div>
            </div>

        </div>
    );
};

export default ThongKeToanTruongMock;