import React from "react";
import "../../css/Pages.css";

const MOCK_TO_TRINH = [
    { Stt: 1, HoTen: "Lê Văn Xuất Sắc", ChucDanh: "Chuyên viên", TongDiem: 145, DeXuat: "Hoàn thành xuất sắc", Top20: true },
    { Stt: 2, HoTen: "Nguyễn Văn Test", ChucDanh: "Chuyên viên", TongDiem: 117, DeXuat: "Hoàn thành xuất sắc", Top20: true },
    { Stt: 3, HoTen: "Trần Thị Giỏi", ChucDanh: "Nghiên cứu viên", TongDiem: 115, DeXuat: "Hoàn thành tốt", Top20: false },
    { Stt: 4, HoTen: "Phạm Văn Khá", ChucDanh: "Nhân viên", TongDiem: 105, DeXuat: "Hoàn thành tốt", Top20: false },
    { Stt: 5, HoTen: "Đinh Thị Trung Bình", ChucDanh: "Chuyên viên", TongDiem: 95, DeXuat: "Hoàn thành nhiệm vụ", Top20: false },
    { Stt: 6, HoTen: "Hoàng Văn Yếu", ChucDanh: "Nhân viên", TongDiem: 75, DeXuat: "Không hoàn thành", Top20: false },
];

const ToTrinhNhanVienMockPage = () => {
    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px", fontWeight: 700 }}>
                    TỜ TRÌNH XẾP LOẠI NHÂN VIÊN
                </h2>
                <span className="breadcrumb">Phòng Đào tạo • Kỳ đánh giá 2026</span>
            </div>

            <div className="modern-table-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>
                    <div style={{ flex: 1, backgroundColor: "#eff6ff", padding: "15px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                        <div style={{ fontSize: "13px", color: "#1e40af", fontWeight: "bold" }}>TỔNG SỐ NHÂN VIÊN ĐÁNH GIÁ</div>
                        <div style={{ fontSize: "24px", color: "#1d4ed8", fontWeight: "bold" }}>6</div>
                    </div>
                    <div style={{ flex: 1, backgroundColor: "#fef3c7", padding: "15px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                        <div style={{ fontSize: "13px", color: "#92400e", fontWeight: "bold" }}>HẠN NGẠCH XUẤT SẮC (TOP 20%)</div>
                        <div style={{ fontSize: "24px", color: "#b45309", fontWeight: "bold" }}>2 <span style={{ fontSize: '14px', fontWeight: 'normal' }}>suất</span></div>
                    </div>
                </div>

                <div className="cd-hint" style={{ padding: "10px 20px" }}>
                    <i className="fa-solid fa-circle-info"></i> Đường kẻ đậm đứt nét bên dưới là ranh giới <b>2 suất xuất sắc</b> (Top 20% của đơn vị). Chỉ những nhân viên đạt từ 101 điểm trở lên và nằm trên vạch này mới được giữ mức "Hoàn thành xuất sắc".
                </div>

                <table className="custom-table" style={{ width: "100%", marginTop: "15px" }}>
                    <thead>
                        <tr>
                            <th style={{ width: "8%", textAlign: "center" }}>Xếp hạng</th>
                            <th style={{ width: "25%" }}>Họ tên</th>
                            <th style={{ width: "20%" }}>Chức danh</th>
                            <th style={{ width: "15%", textAlign: "center" }}>Tổng điểm</th>
                            <th style={{ width: "32%" }}>Mức xếp loại cuối cùng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_TO_TRINH.map((nv, idx) => (
                            <React.Fragment key={nv.Stt}>
                                <tr>
                                    <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px" }}>#{nv.Stt}</td>
                                    <td style={{ fontWeight: "bold", color: "#0f172a" }}>{nv.HoTen}</td>
                                    <td>{nv.ChucDanh}</td>
                                    <td style={{ textAlign: "center", fontWeight: "bold", color: "#1d4ed8", fontSize: "15px" }}>{nv.TongDiem}đ</td>
                                    <td>
                                        {nv.TongDiem > 100 && nv.Top20 ? (
                                            <span className="rating-badge rating-high">Hoàn thành xuất sắc nhiệm vụ</span>
                                        ) : nv.TongDiem > 100 ? (
                                            <span className="rating-badge rating-medium">Hoàn thành tốt nhiệm vụ</span>
                                        ) : nv.TongDiem >= 80 ? (
                                            <span className="rating-badge" style={{ backgroundColor: "#e2e8f0", color: "#475569" }}>Hoàn thành nhiệm vụ</span>
                                        ) : (
                                            <span className="rating-badge" style={{ backgroundColor: "#fecaca", color: "#b91c1c" }}>Không hoàn thành nhiệm vụ</span>
                                        )}
                                    </td>
                                </tr>
                                {idx === 1 && (
                                    <tr>
                                        <td colSpan="5" style={{ padding: 0 }}>
                                            <div style={{ height: "3px", backgroundColor: "#f59e0b", width: "100%", position: "relative" }}>
                                                <div style={{ position: "absolute", right: "20px", top: "-10px", backgroundColor: "#fef3c7", border: "1px solid #f59e0b", color: "#b45309", padding: "2px 10px", fontSize: "11px", fontWeight: "bold", borderRadius: "10px" }}>
                                                    HẾT HẠN NGẠCH XUẤT SẮC
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ToTrinhNhanVienMockPage;