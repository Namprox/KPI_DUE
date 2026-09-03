import React, { useState, useMemo } from "react";
import "../../css/Pages.css";

const MOCK_GV_CRITERIA = [
    { Id: 1, Ten: "Hoàn thành định mức giờ giảng theo quy định", ToiDa: 20, Nhom: "I. Đào tạo - Giảng dạy", NhomLon: "A", MoTa: "100%: 20đ | >75-99%: 15đ | >50-75%: 10đ | <50%: 0đ" },
    { Id: 2, Ten: "Tuân thủ đúng quy định về giảng dạy/năm", ToiDa: 15, Nhom: "I. Đào tạo - Giảng dạy", NhomLon: "A", MoTa: "Không lỗi: 15đ | 1-3 lỗi: 10đ | 4-6 lỗi: 5đ | >6 lỗi: 0đ" },
    { Id: 3, Ten: "Điểm đánh giá phản hồi của sinh viên (Likert 5)", ToiDa: 5, Nhom: "I. Đào tạo - Giảng dạy", NhomLon: "A", MoTa: ">=3 điểm: 5đ | <3 điểm: 0đ" },
    { Id: 4, Ten: "Mức độ hoàn thành định mức giờ NCKH", ToiDa: 40, Nhom: "II. Nghiên cứu khoa học", NhomLon: "A", MoTa: "100%: 40đ | >75-99%: 30đ | >50-75%: 20đ | <50%: 0đ" },
    { Id: 5, Ten: "Thực hiện nhiệm vụ phục vụ cộng đồng (Khoa phân công)", ToiDa: 20, Nhom: "III. Phục vụ cộng đồng", NhomLon: "A", MoTa: "Phối hợp: 4đ | Phối hợp chính: 7đ | Chủ trì: 10đ" },
    { Id: 6, Ten: "Giờ giảng dạy lý thuyết vượt định mức", ToiDa: 15, Nhom: "B. Thành tích vượt trội", NhomLon: "B", MoTa: "Vượt 2 lớp: 5đ | Vượt 3 lớp: 10đ | Vượt 4 lớp: 15đ" },
    { Id: 7, Ten: "Hướng dẫn SV NCKH đạt giải cấp trường trở lên", ToiDa: 10, Nhom: "B. Thành tích vượt trội", NhomLon: "B", MoTa: "Cộng tối đa 10đ theo cấp đánh giá của Trường" },
    { Id: 8, Ten: "Có 01 bài báo đăng trong tạp chí/Kỷ yếu WoS/Scopus Q1/Q2", ToiDa: null, Nhom: "B. Thành tích vượt trội", NhomLon: "B", MoTa: "Trường thẩm định và cộng điểm không giới hạn" },
    { Id: 9, Ten: "Tham luận/báo cáo tại sự kiện do TW/Chính phủ tổ chức", ToiDa: null, Nhom: "B. Thành tích vượt trội", NhomLon: "B", MoTa: "Cộng điểm theo cấp đánh giá của Trường" }
];

const DanhGiaGiangVienMock = () => {
    const [diem, setDiem] = useState({});
    const [minhChung, setMinhChung] = useState({});

    const handleNhapDiem = (id, val) => {
        setDiem(prev => ({ ...prev, [id]: val }));
    };

    const tongDiemA = useMemo(() => MOCK_GV_CRITERIA.filter(t => t.NhomLon === "A").reduce((sum, t) => sum + (Number(diem[t.Id]) || 0), 0), [diem]);
    const tongDiemB = useMemo(() => MOCK_GV_CRITERIA.filter(t => t.NhomLon === "B").reduce((sum, t) => sum + (Number(diem[t.Id]) || 0), 0), [diem]);

    const xepLoai = useMemo(() => {
        const tong = tongDiemA + tongDiemB;
        if (tong < 80) return { thongBao: "Không hoàn thành nhiệm vụ", mau: "#ef4444" };
        if (tong > 100) return { thongBao: "HT Tốt / HT Xuất sắc (Cần xét QĐ 838)", mau: "#10b981" };
        return { thongBao: "Hoàn thành nhiệm vụ", mau: "#f59e0b" };
    }, [tongDiemA, tongDiemB]);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>PHIẾU ĐÁNH GIÁ KPI GIẢNG VIÊN</h2>
                <span className="breadcrumb">Phụ lục 2 • Chế độ dùng thử</span>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                <div style={{ flex: 1, background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>ĐIỂM CƠ BẢN (MAX 100)</div>
                    <div style={{ fontSize: '24px', color: '#0f172a', fontWeight: 'bold' }}>{tongDiemA}</div>
                </div>
                <div style={{ flex: 1, background: '#f0fdf4', padding: '15px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>ĐIỂM VƯỢT TRỘI</div>
                    <div style={{ fontSize: '24px', color: '#166534', fontWeight: 'bold' }}>+{tongDiemB}</div>
                </div>
                <div style={{ flex: 2, background: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>DỰ KIẾN XẾP LOẠI</div>
                    <div style={{ fontSize: '18px', color: xepLoai.mau, fontWeight: 'bold', marginTop: '4px' }}>{xepLoai.thongBao}</div>
                </div>
            </div>

            <div className="modern-table-card" style={{ padding: '20px' }}>
                {MOCK_GV_CRITERIA.map((tc, idx) => {
                    const showHeader = idx === 0 || MOCK_GV_CRITERIA[idx - 1].Nhom !== tc.Nhom;
                    const isVTA = tc.NhomLon === "B";

                    return (
                        <React.Fragment key={tc.Id}>
                            {showHeader && (
                                <div style={{ padding: '10px 15px', background: isVTA ? '#dcfce7' : '#e2e8f0', color: isVTA ? '#166534' : '#1e293b', fontWeight: 'bold', marginTop: idx > 0 ? '20px' : '0', borderRadius: '4px' }}>
                                    {tc.Nhom}
                                </div>
                            )}
                            <div style={{ padding: '15px', borderBottom: '1px dashed #cbd5e1', display: 'flex', gap: '20px' }}>
                                <div style={{ flex: '1 1 60%' }}>
                                    <div style={{ fontWeight: '600' }}>{tc.Ten}</div>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '5px' }}>{tc.MoTa}</div>
                                </div>
                                <div style={{ flex: '1 1 40%', textAlign: 'right' }}>
                                    <input
                                        type="number"
                                        placeholder={`Điểm ${tc.ToiDa ? `(Max ${tc.ToiDa})` : '(Không giới hạn)'}`}
                                        className="form-input"
                                        style={{ width: '150px', display: 'inline-block' }}
                                        value={diem[tc.Id] || ""}
                                        onChange={(e) => handleNhapDiem(tc.Id, e.target.value)}
                                    />
                                    {isVTA && (
                                        <div style={{ marginTop: '10px' }}>
                                            <button className="btn-cancel" style={{ padding: '4px 10px', fontSize: '12px' }}>
                                                <i className="fa-solid fa-upload"></i> Minh chứng
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default DanhGiaGiangVienMock;