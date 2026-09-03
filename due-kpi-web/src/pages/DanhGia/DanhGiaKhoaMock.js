import React, { useState, useMemo } from "react";
import "../../css/Pages.css";

const MOCK_KHOA_CRITERIA = [
    { Id: 1, Ten: "I. Đào tạo - Giảng dạy - Đảm bảo chất lượng", ToiDa: 40, Loai: "CoBan", MoTa: "Tỉ lệ GV hoàn thành giảng dạy (10đ), Tuân thủ quy định (7.5đ), Điểm phản hồi SV (2.5đ)..." },
    { Id: 2, Ten: "II. Nghiên cứu khoa học", ToiDa: 40, Loai: "CoBan", MoTa: "Tỷ lệ GV hoàn thành NCKH (20đ), Sinh hoạt học thuật cấp Khoa (20đ)" },
    { Id: 3, Ten: "III. Phục vụ cộng đồng và nhiệm vụ khác", ToiDa: 20, Loai: "CoBan", MoTa: "Công tác tư vấn tuyển sinh, hợp tác quốc tế, quan hệ doanh nghiệp..." },
    { Id: 4, Ten: "Khoa thực hiện kiểm định thành công 1 CTĐT", ToiDa: 10, Loai: "VuotTroi", MoTa: "Thành tích đặc biệt (10 điểm)" },
    { Id: 5, Ten: "Mở 1 chuyên ngành đào tạo/hình thức đào tạo mới", ToiDa: 10, Loai: "VuotTroi", MoTa: "Tuyển sinh thành công (10 điểm)" },
    { Id: 6, Ten: ">70% sinh viên tốt nghiệp đúng hạn", ToiDa: 5, Loai: "VuotTroi", MoTa: "Thưởng 5 điểm" }
];

const DanhGiaKhoaMock = () => {
    const [diem, setDiem] = useState({});

    const tongCoBan = useMemo(() => MOCK_KHOA_CRITERIA.filter(t => t.Loai === "CoBan").reduce((sum, t) => sum + (Number(diem[t.Id]) || 0), 0), [diem]);
    const tongVuotTroi = useMemo(() => MOCK_KHOA_CRITERIA.filter(t => t.Loai === "VuotTroi").reduce((sum, t) => sum + (Number(diem[t.Id]) || 0), 0), [diem]);
    const tongTichLuy = tongCoBan + tongVuotTroi;

    const xepLoai = useMemo(() => {
        if (tongTichLuy < 80) return { text: "Không hoàn thành", color: "#ef4444" };
        if (tongTichLuy <= 100) return { text: "Hoàn thành nhiệm vụ", color: "#f59e0b" };
        return { text: "Hoàn thành Tốt / Xuất sắc (Cần xét Top 20% & Tỷ lệ NV)", color: "#10b981" };
    }, [tongTichLuy]);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>ĐÁNH GIÁ KPI KHOA / BỘ MÔN</h2>
                <span className="breadcrumb">Phụ lục 1A • Đơn vị</span>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>ĐIỂM CƠ BẢN (MAX 100)</div>
                    <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: 'bold' }}>{tongCoBan}</div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>ĐIỂM VƯỢT TRỘI</div>
                    <div style={{ fontSize: '24px', color: '#166534', fontWeight: 'bold' }}>+{tongVuotTroi}</div>
                </div>
                <div style={{ flex: 2, background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>DỰ KIẾN XẾP LOẠI</div>
                    <div style={{ fontSize: '18px', color: xepLoai.color, fontWeight: 'bold', marginTop: '4px' }}>{xepLoai.text}</div>
                    {tongTichLuy > 100 && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            <i className="fa-solid fa-circle-info"></i> Để đạt Xuất sắc, Khoa phải thuộc Top 20% điểm cao nhất và 100% nhân sự hoàn thành nhiệm vụ.
                        </div>
                    )}
                </div>
            </div>

            <div className="modern-table-card" style={{ padding: '20px' }}>
                {MOCK_KHOA_CRITERIA.map((tc) => (
                    <div key={tc.Id} style={{ padding: '15px', borderBottom: '1px dashed #cbd5e1', display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ flex: '1 1 70%' }}>
                            <div style={{ fontWeight: '600', color: tc.Loai === "VuotTroi" ? '#166534' : '#1e293b' }}>
                                {tc.Loai === "VuotTroi" && <i className="fa-solid fa-award" style={{ marginRight: '8px' }}></i>}
                                {tc.Ten}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>{tc.MoTa}</div>
                        </div>
                        <div style={{ flex: '1 1 30%', textAlign: 'right' }}>
                            <input
                                type="number"
                                placeholder={`Tối đa ${tc.ToiDa}đ`}
                                className="form-input"
                                style={{ width: '120px' }}
                                value={diem[tc.Id] || ""}
                                onChange={(e) => setDiem(prev => ({ ...prev, [tc.Id]: e.target.value }))}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DanhGiaKhoaMock;