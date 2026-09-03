import React, { useState, useMemo } from "react";
import "../../css/Pages.css";

const MOCK_PHONG_CRITERIA = [
    { Id: 101, Ten: "1. Có xây dựng, ban hành đầy đủ kế hoạch (năm/quý/tháng)", ToiDa: 20, Nhom: "I. Thực hiện nhiệm vụ được giao", Loai: "Cong", MoTa: "Bám sát nhiệm vụ BGH phân công và Bộ tiêu chí thi đua ĐHĐN." },
    { Id: 102, Ten: "2. Mức độ hoàn thành nhiệm vụ (theo Bộ tiêu chí ĐHĐN)", ToiDa: 50, Nhom: "I. Thực hiện nhiệm vụ được giao", Loai: "Cong", MoTa: "Số điểm = 50% x Số điểm ĐHĐN đánh giá." },
    { Id: 201, Ten: "1. Tập thể có sáng kiến, xử lý công việc phát sinh mới", ToiDa: 20, Nhom: "II. Thi đua / Sáng tạo / Đóng góp phong trào", Loai: "Cong", MoTa: "Sáng kiến chưa có tiền lệ." },
    { Id: 202, Ten: "2. Được khen thưởng đột xuất vì thành tích", ToiDa: 10, Nhom: "II. Thi đua / Sáng tạo / Đóng góp phong trào", Loai: "Cong", MoTa: "Khen thưởng thi đua, đổi mới sáng tạo..." },
    { Id: 301, Ten: "Chấp hành chủ trương, đường lối, chính sách, pháp luật...", ToiDa: 0, Nhom: "III. Chấp hành quy định", Loai: "Tru", MoTa: "Nhập số âm (VD: -10) nếu có vi phạm, mất đoàn kết nội bộ." }
];

const DanhGiaPhongMock = () => {
    const [diem, setDiem] = useState({});

    const tongDiem = useMemo(() => {
        return MOCK_PHONG_CRITERIA.reduce((sum, tc) => sum + (Number(diem[tc.Id]) || 0), 0);
    }, [diem]);

    const xepLoai = useMemo(() => {
        if (tongDiem < 50) return { text: "Không hoàn thành nhiệm vụ", color: "#ef4444" };
        if (tongDiem <= 60) return { text: "Hoàn thành nhiệm vụ", color: "#f59e0b" };
        if (tongDiem <= 80) return { text: "Hoàn thành tốt nhiệm vụ", color: "#3b82f6" };
        return { text: "Hoàn thành Xuất sắc (Cần xét Top 20%)", color: "#10b981" };
    }, [tongDiem]);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>ĐÁNH GIÁ KPI PHÒNG / TRUNG TÂM</h2>
                <span className="breadcrumb">Phụ lục 1B • Đơn vị</span>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>TỔNG ĐIỂM TÍCH LŨY</div>
                    <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: 'bold' }}>{tongDiem} / 100</div>
                </div>
                <div style={{ flex: 2, background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>DỰ KIẾN XẾP LOẠI</div>
                    <div style={{ fontSize: '18px', color: xepLoai.color, fontWeight: 'bold', marginTop: '4px' }}>{xepLoai.text}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        <i className="fa-solid fa-circle-info"></i> Từ 50-60: HTNV | &gt;60: HT Tốt | &gt;80 & Top 20%: Xuất sắc.
                    </div>
                </div>
            </div>

            <div className="modern-table-card" style={{ padding: '20px' }}>
                {MOCK_PHONG_CRITERIA.map((tc, idx) => {
                    const showHeader = idx === 0 || MOCK_PHONG_CRITERIA[idx - 1].Nhom !== tc.Nhom;
                    const isTru = tc.Loai === "Tru";

                    return (
                        <React.Fragment key={tc.Id}>
                            {showHeader && (
                                <div style={{ padding: '10px 15px', background: isTru ? '#fef2f2' : '#e2e8f0', color: isTru ? '#991b1b' : '#1e293b', fontWeight: 'bold', marginTop: idx > 0 ? '20px' : '0', borderRadius: '4px', borderLeft: isTru ? '4px solid #ef4444' : 'none' }}>
                                    {tc.Nhom}
                                </div>
                            )}
                            <div style={{ padding: '15px', borderBottom: '1px dashed #cbd5e1', display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <div style={{ flex: '1 1 70%' }}>
                                    <div style={{ fontWeight: '600', color: isTru ? '#ef4444' : '#1e293b' }}>{tc.Ten}</div>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>{tc.MoTa}</div>
                                </div>
                                <div style={{ flex: '1 1 30%', textAlign: 'right' }}>
                                    <input
                                        type="number"
                                        placeholder={isTru ? "Điểm trừ (Âm)" : `Tối đa ${tc.ToiDa}đ`}
                                        className="form-input"
                                        style={{ width: '130px', borderColor: isTru ? '#fca5a5' : '#cbd5e1' }}
                                        value={diem[tc.Id] || ""}
                                        onChange={(e) => setDiem(prev => ({ ...prev, [tc.Id]: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default DanhGiaPhongMock;