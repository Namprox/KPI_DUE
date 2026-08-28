import React, { useMemo } from "react";
import "../../../css/QuanLyChamDiem.css";

const formatDiem = (value) => {
    const n = Number(value);
    if (isNaN(n)) return "---";
    return n % 1 === 0 ? String(n) : n.toFixed(2);
};

const ChamDiemNhanVienForm = ({
    chiTietList = [],
    diemThamDinh = {},
    nhanXetThamDinh = {},
    onDiemChange,
    onNhanXetChange,
}) => {
    const sections = useMemo(() => {
        if (!chiTietList.length) return [];
        const loaiMap = new Map();
        chiTietList.forEach((tc) => {
            const loai = Number(tc.LoaiNhom) || 1;
            if (!loaiMap.has(loai)) loaiMap.set(loai, { tenNhom: tc.TenNhomCha || "Nhóm tiêu chí", dong: [] });
            loaiMap.get(loai).dong.push(tc);
        });

        return [...loaiMap.entries()].sort(([a], [b]) => a - b).map(([loai, data]) => ({
            loaiNhom: loai,
            tenNhom: data.tenNhom,
            items: data.dong,
        }));
    }, [chiTietList]);

    return (
        <div className="pl2-container">
            {sections.map((section, sIndex) => {
                const isDiemTru = section.loaiNhom === 3;
                const isVuotTroi = section.loaiNhom === 2;

                return (
                    <div key={section.loaiNhom || sIndex} className="pl2-section" style={{ marginBottom: '20px' }}>
                        <div
                            className={`pl2-section-header`}
                            style={{
                                backgroundColor: isDiemTru ? '#fef2f2' : isVuotTroi ? '#f0fdf4' : '#f8fafc',
                                borderLeft: `4px solid ${isDiemTru ? '#ef4444' : isVuotTroi ? '#22c55e' : '#3b82f6'}`,
                                padding: '12px 15px',
                                borderRadius: '4px'
                            }}
                        >
                            <h3 style={{ margin: 0, fontSize: '15px', color: '#ffffff' }}>
                                <i className={`fa-solid ${isVuotTroi ? "fa-award" : isDiemTru ? "fa-triangle-exclamation" : "fa-list-check"}`} style={{ marginRight: '8px' }}></i>
                                {section.tenNhom}
                            </h3>
                        </div>

                        <div className="pl2-section-body" style={{ marginTop: '15px' }}>
                            {section.items.map((tc, index) => {
                                const draftDiem = diemThamDinh[tc.IdTieuChi];
                                const draftNhanXet = nhanXetThamDinh[tc.IdTieuChi] || "";

                                return (
                                    <div key={tc.IdTieuChi} className="cdm-the" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', marginBottom: '15px', display: 'flex', gap: '20px', backgroundColor: '#fff' }}>

                                        <div style={{ flex: '1 1 60%' }}>
                                            <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                                                {index + 1}. {tc.TenTieuChi}
                                            </div>
                                            {tc.MoTa && <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px', whiteSpace: 'pre-line' }}>{tc.MoTa}</div>}

                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 15px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>TỐI ĐA</div>
                                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: isDiemTru ? '#ef4444' : '#0f172a' }}>{isDiemTru ? "Điểm trừ" : `${tc.DiemToiDa}đ`}</div>
                                                </div>
                                                <div style={{ borderLeft: '1px solid #cbd5e1', height: '30px' }}></div>
                                                <div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>NHÂN VIÊN TỰ CHẤM</div>
                                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0284c7' }}>{formatDiem(tc.DiemTuDanhGia)}đ</div>
                                                </div>
                                            </div>

                                            {tc.NhanXetTuDanhGia && (
                                                <div style={{ marginTop: '10px', fontSize: '13px', color: '#475569', fontStyle: 'italic', paddingLeft: '10px', borderLeft: '3px solid #cbd5e1' }}>
                                                    <i className="fa-solid fa-quote-left" style={{ color: '#94a3b8', marginRight: '5px' }}></i>
                                                    {tc.NhanXetTuDanhGia}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ flex: '1 1 40%', backgroundColor: '#eff6ff', padding: '15px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                            <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '10px', fontSize: '14px' }}>
                                                <i className="fa-solid fa-pen-to-square" style={{ marginRight: '5px' }}></i> Chấm điểm thẩm định
                                            </div>

                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px' }}>
                                                    Điểm cấp trên chấm <span style={{ color: 'red' }}>*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    placeholder={isDiemTru ? "VD: -10" : `Tối đa ${tc.DiemToiDa}đ`}
                                                    value={draftDiem ?? ""}
                                                    max={isDiemTru ? 0 : tc.DiemToiDa}
                                                    min={isDiemTru ? undefined : 0}
                                                    step="any"
                                                    style={{ width: '100%', borderColor: '#93c5fd', fontWeight: 'bold', color: isDiemTru && draftDiem < 0 ? '#ef4444' : '#0f172a' }}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === "") {
                                                            onDiemChange(tc.IdTieuChi, "");
                                                            return;
                                                        }
                                                        let num = parseFloat(val);
                                                        if (isNaN(num)) num = 0;
                                                        if (isDiemTru && num > 0) num = 0;
                                                        if (!isDiemTru && num < 0) num = 0;
                                                        if (!isDiemTru && tc.DiemToiDa && num > tc.DiemToiDa) num = tc.DiemToiDa;
                                                        onDiemChange(tc.IdTieuChi, num);
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '5px' }}>
                                                    Nhận xét / Lý do <span style={{ color: '#ef4444', fontWeight: 'normal', fontSize: '11px' }}>(Bắt buộc nếu lệch điểm)</span>
                                                </label>
                                                <textarea
                                                    className="form-input"
                                                    rows="2"
                                                    placeholder="Nhập lý do nếu bạn chấm khác điểm nhân viên tự kê khai"
                                                    value={draftNhanXet}
                                                    onChange={(e) => onNhanXetChange(tc.IdTieuChi, e.target.value)}
                                                    style={{ width: '100%', borderColor: '#93c5fd', fontSize: '13px', resize: 'vertical' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ChamDiemNhanVienForm;