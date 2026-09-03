import React, { useState, useMemo } from "react";
import "../../css/Pages.css";

const MOCK_QL_CRITERIA = [
    { Id: 1, Ten: "Hoàn thành định mức giờ giảng (Đã giảm trừ % theo chức vụ)", ToiDa: 20, Nhom: "I. Đào tạo - Giảng dạy", MoTa: "Đạt 100% định mức giảm trừ: 20đ" },
    { Id: 2, Ten: "Mức độ hoàn thành định mức giờ NCKH (Đã giảm trừ %)", ToiDa: 40, Nhom: "II. Nghiên cứu khoa học", MoTa: "Hoàn thành 100% định mức giảm trừ: 40đ" },
    { Id: 3, Ten: "Các nhiệm vụ khác do Trưởng đơn vị phân công", ToiDa: 20, Nhom: "III. Nhiệm vụ quản lý", MoTa: "Chỉ áp dụng cho Phó khoa/Tổ trưởng. Trưởng khoa do BGH phân công." },
    { Id: 4, Ten: "Điểm thành tích vượt trội", ToiDa: null, Nhom: "B. Thành tích vượt trội", MoTa: "Tính tương tự ngạch Giảng viên" }
];

const DanhGiaQuanLyKhoaMock = () => {
    const [diem, setDiem] = useState({});
    const [khoaXuatSac, setKhoaXuatSac] = useState(false);
    const [laTruongKhoa, setLaTruongKhoa] = useState(true);

    const tongDiem = useMemo(() => MOCK_QL_CRITERIA.reduce((sum, tc) => sum + (Number(diem[tc.Id]) || 0), 0), [diem]);

    const xepLoai = useMemo(() => {
        if (laTruongKhoa && khoaXuatSac) return { text: "Hoàn thành Xuất sắc (Đặc cách theo thành tích Khoa)", color: "#10b981" };
        if (tongDiem < 80) return { text: "Không hoàn thành nhiệm vụ", color: "#ef4444" };
        if (tongDiem <= 100) return { text: "Hoàn thành nhiệm vụ", color: "#f59e0b" };
        return { text: "Hoàn thành Tốt / Xuất sắc (Xét Top 20% Cán bộ quản lý)", color: "#3b82f6" };
    }, [tongDiem, laTruongKhoa, khoaXuatSac]);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>ĐÁNH GIÁ KPI: CÁN BỘ QUẢN LÝ CẤP KHOA</h2>
                <span className="breadcrumb">Phụ lục 2 (Biến thể) • Trưởng/Phó Khoa, Tổ trưởng Bộ môn</span>
            </div>

            <div style={{ backgroundColor: "#eff6ff", padding: "15px", borderRadius: "8px", border: "1px solid #bfdbfe", marginBottom: "20px", display: "flex", gap: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", cursor: "pointer" }}>
                    <input type="checkbox" checked={laTruongKhoa} onChange={(e) => setLaTruongKhoa(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                    Tôi là Trưởng Khoa
                </label>
                {laTruongKhoa && (
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", color: khoaXuatSac ? "#166534" : "#1e293b", cursor: "pointer" }}>
                        <input type="checkbox" checked={khoaXuatSac} onChange={(e) => setKhoaXuatSac(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                        Khoa đạt Hoàn thành Xuất sắc (Kích hoạt Đặc cách)
                    </label>
                )}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>TỔNG ĐIỂM TÍCH LŨY</div>
                    <div style={{ fontSize: '24px', color: '#1d4ed8', fontWeight: 'bold' }}>{tongDiem}</div>
                </div>
                <div style={{ flex: 2, background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>DỰ KIẾN XẾP LOẠI</div>
                    <div style={{ fontSize: '18px', color: xepLoai.color, fontWeight: 'bold', marginTop: '4px' }}>{xepLoai.text}</div>
                </div>
            </div>

            <div className="modern-table-card" style={{ padding: '20px' }}>
                {MOCK_QL_CRITERIA.map((tc, idx) => (
                    <React.Fragment key={tc.Id}>
                        {(idx === 0 || MOCK_QL_CRITERIA[idx - 1].Nhom !== tc.Nhom) && (
                            <div style={{ padding: '10px 15px', background: '#e2e8f0', fontWeight: 'bold', marginTop: idx > 0 ? '20px' : '0', borderRadius: '4px' }}>{tc.Nhom}</div>
                        )}
                        <div style={{ padding: '15px', borderBottom: '1px dashed #cbd5e1', display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ flex: '1 1 70%' }}>
                                <div style={{ fontWeight: '600' }}>{tc.Ten}</div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>{tc.MoTa}</div>
                            </div>
                            <div style={{ flex: '1 1 30%', textAlign: 'right' }}>
                                <input
                                    type="number"
                                    placeholder={tc.ToiDa ? `Max ${tc.ToiDa}đ` : "Điểm mở"}
                                    className="form-input"
                                    style={{ width: '130px' }}
                                    value={diem[tc.Id] || ""}
                                    onChange={(e) => setDiem(prev => ({ ...prev, [tc.Id]: e.target.value }))}
                                />
                            </div>
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default DanhGiaQuanLyKhoaMock;