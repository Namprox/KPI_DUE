import React, { useState, useEffect } from 'react';

const TRAN_TAP_THE = 7.5;

const QL_DiemTruKhoaListing = ({ data, isLoading, selectedNam }) => {
    const [isDesktop, setIsDesktop] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 992);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fmt = (value) => (value != null ? Number(value).toFixed(2) : '---');

    return (
        <div className="modern-table-card" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải điểm trừ tập thể Khoa</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-building-columns" style={{ fontSize: '60px', color: '#bdc3c7', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>
                        {selectedNam ? `Chưa có số liệu điểm trừ tập thể năm ${selectedNam}` : 'Chưa có số liệu điểm trừ tập thể'}
                    </h3>
                </div>
            ) : (
                <>
                    <table className="custom-table" style={{ minWidth: isDesktop ? '1100px' : '100%' }}>
                        <thead>
                            <tr>
                                <th width="5%" style={{ textAlign: 'center' }}>STT</th>
                                <th width="35%">TÊN KHOA</th>
                                <th width="9%" style={{ textAlign: 'center' }}>SỐ GV (N)</th>
                                <th width="11%" style={{ textAlign: 'center' }}>SỐ GV VI PHẠM</th>
                                <th width="13%" style={{ textAlign: 'center' }}>TỔNG ĐIỂM TRỪ CÁ NHÂN (T)</th>
                                <th width="12%" style={{ textAlign: 'center' }}>MẪU SỐ</th>
                                <th width="15%" style={{ textAlign: 'center' }}>ĐIỂM TRỪ TẬP THỂ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => {
                                const soGv = item.SoGiangVien ?? 0;
                                const khongCoGv = soGv === 0;

                                return (
                                    <tr key={item.IdDonVi}>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{index + 1}</td>
                                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.TenDonVi || '---'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{soGv}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="tag-badge">{item.SoGiangVienViPham ?? 0}</span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                                            {fmt(item.TongDiemTruCaNhan)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: '600', color: '#475569' }}>{fmt(item.MauSo)}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
                                                0,2 × 15 × {soGv}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`rating-badge ${Number(item.DiemTruTapThe || 0) >= TRAN_TAP_THE ? 'rating-low' : 'rating-medium'}`}>
                                                {fmt(item.DiemTruTapThe)}
                                            </span>
                                            {khongCoGv ? (
                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginTop: '4px' }}>
                                                    Khoa chưa có giảng viên hoạt động
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>
                                                    MIN(7,5 × {fmt(item.TongDiemTruCaNhan)} / {fmt(item.MauSo)}; 7,5)
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Chú giải công thức */}
                    <div style={{ margin: '18px', padding: '14px 18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', color: '#1e40af', lineHeight: '1.7' }}>
                        <div style={{ fontWeight: '700', marginBottom: '6px' }}>
                            <i className="fa-solid fa-circle-info" style={{ marginRight: '6px' }}></i>
                            Diễn giải công thức
                        </div>
                        <div>
                            <strong>Điểm trừ tập thể của Khoa</strong> = MIN(7,5 × T / (0,2 × 15 × N); 7,5)
                        </div>
                        <div>• <strong>T</strong> = tổng điểm trừ cá nhân của Khoa (mỗi cá nhân ĐÃ áp trần 15 điểm)</div>
                        <div>• <strong>N</strong> = tổng số giảng viên đang hoạt động của Khoa (kể cả đơn vị con). N = 0 → điểm trừ tập thể = 0</div>
                        <div>• Điểm trừ cá nhân của mỗi giảng viên được giới hạn tối đa <strong>15 điểm/năm</strong>.</div>
                    </div>
                </>
            )}
        </div>
    );
};

export default QL_DiemTruKhoaListing;
