import React, { useState, useMemo } from "react";
import "../../css/Pages.css";

const MOCK_GV_CRITERIA = [
    { Id: 1, Ten: "Hoàn thành định mức giờ giảng theo quy định", ToiDa: 20, Nhom: "I. Đào tạo - Giảng dạy", DiemTuCham: 20 },
    { Id: 4, Ten: "Mức độ hoàn thành định mức giờ NCKH", ToiDa: 40, Nhom: "II. Nghiên cứu khoa học", DiemTuCham: 40 },
    { Id: 5, Ten: "Thực hiện nhiệm vụ phục vụ cộng đồng", ToiDa: 20, Nhom: "III. Phục vụ cộng đồng", DiemTuCham: 10 },
    { Id: 8, Ten: "Bài báo đăng trong tạp chí WoS/Scopus Q1/Q2", ToiDa: null, Nhom: "B. Thành tích vượt trội", DiemTuCham: 35 }
];

const ThamDinhGiangVienMockPage = () => {
    const [diemThamDinh, setDiemThamDinh] = useState({});
    const [datQuyDinh838, setDatQuyDinh838] = useState(false);

    const tongDiem = useMemo(() => {
        return MOCK_GV_CRITERIA.reduce((sum, tc) => {
            const d = diemThamDinh[tc.Id] !== undefined ? diemThamDinh[tc.Id] : tc.DiemTuCham;
            return sum + (Number(d) || 0);
        }, 0);
    }, [diemThamDinh]);

    const xepLoai = useMemo(() => {
        if (tongDiem < 80) return { text: "Không hoàn thành nhiệm vụ", color: "#ef4444", alert: "" };
        if (tongDiem <= 100) return { text: "Hoàn thành nhiệm vụ", color: "#f59e0b", alert: "" };
        if (tongDiem > 100 && datQuyDinh838) return { text: "Hoàn thành Xuất sắc", color: "#10b981", alert: "" };
        return {
            text: "Hoàn thành nhiệm vụ",
            color: "#f59e0b",
            alert: "Hệ thống hạ bậc xếp loại do không đạt điều kiện Nhiệm vụ Khoa học công nghệ (QĐ 838)."
        };
    }, [tongDiem, datQuyDinh838]);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>THẨM ĐỊNH KPI GIẢNG VIÊN: Nguyễn Văn Giảng Viên</h2>
                <span className="breadcrumb">Khoa Công nghệ thông tin • Chế độ duyệt (Mock)</span>
            </div>

            <div style={{ backgroundColor: datQuyDinh838 ? "#dcfce7" : "#fef2f2", padding: "15px", borderRadius: "8px", border: `1px solid ${datQuyDinh838 ? "#bbf7d0" : "#fecaca"}`, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                    type="checkbox"
                    checked={datQuyDinh838}
                    onChange={(e) => setDatQuyDinh838(e.target.checked)}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
                <div>
                    <div style={{ fontWeight: "bold", color: datQuyDinh838 ? "#166534" : "#991b1b" }}>
                        Xác nhận Giảng viên đạt điều kiện Hoàn thành nhiệm vụ Khoa học công nghệ
                    </div>
                    <div style={{ fontSize: "13px", color: datQuyDinh838 ? "#15803d" : "#b91c1c" }}>
                        (Theo Quyết định số 838/QĐ-ĐHKT. Bắt buộc để được xếp loại Hoàn thành Tốt hoặc Xuất sắc).
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>TỔNG ĐIỂM THẨM ĐỊNH</div>
                    <div style={{ fontSize: '24px', color: '#1d4ed8', fontWeight: 'bold' }}>{tongDiem}</div>
                </div>
                <div style={{ flex: 2, background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>ĐỀ XUẤT XẾP LOẠI TỪ HỆ THỐNG</div>
                    <div style={{ fontSize: '18px', color: xepLoai.color, fontWeight: 'bold', marginTop: '4px' }}>{xepLoai.text}</div>
                    {xepLoai.alert && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: 'bold' }}><i className="fa-solid fa-triangle-exclamation"></i> {xepLoai.alert}</div>}
                </div>
            </div>

            <div className="modern-table-card" style={{ padding: '20px' }}>
                {MOCK_GV_CRITERIA.map((tc) => (
                    <div key={tc.Id} style={{ padding: '15px', borderBottom: '1px dashed #cbd5e1', display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ flex: '1 1 50%', fontWeight: '600' }}>{tc.Ten}</div>
                        <div style={{ flex: '1 1 20%', color: '#64748b', fontSize: '14px' }}>Tự chấm: <b>{tc.DiemTuCham}đ</b></div>
                        <div style={{ flex: '1 1 30%', textAlign: 'right' }}>
                            <input
                                type="number"
                                placeholder="Điểm thẩm định"
                                className="form-input"
                                style={{ width: '130px' }}
                                value={diemThamDinh[tc.Id] !== undefined ? diemThamDinh[tc.Id] : tc.DiemTuCham}
                                onChange={(e) => setDiemThamDinh(prev => ({ ...prev, [tc.Id]: e.target.value }))}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ThamDinhGiangVienMockPage;