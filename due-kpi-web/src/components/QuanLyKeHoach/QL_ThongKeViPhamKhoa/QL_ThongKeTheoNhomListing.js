import React, { useState, useMemo } from 'react';

const CHUA_PHAN_LOAI = 'Chưa phân loại (bản ghi cũ)';

/**
 * Gom các dòng vi phạm chi tiết theo Nhóm → Loại.
 * Tính client-side từ GET api/viphamgiangday vì chưa có endpoint thống kê riêng.
 */
const buildThongKe = (data) => {
    const nhomMap = new Map();

    data.forEach((item) => {
        const tenNhom = item.TenNhom || CHUA_PHAN_LOAI;
        const tenLoai = item.IdLoaiViPham != null ? item.NoiDung || 'Không rõ nội dung' : CHUA_PHAN_LOAI;
        const diemTru = Number(item.DiemTru) || 0;

        if (!nhomMap.has(tenNhom)) {
            nhomMap.set(tenNhom, { tenNhom, soLuot: 0, diemTru: 0, loaiMap: new Map() });
        }
        const nhom = nhomMap.get(tenNhom);
        nhom.soLuot += 1;
        nhom.diemTru += diemTru;

        if (!nhom.loaiMap.has(tenLoai)) {
            nhom.loaiMap.set(tenLoai, { tenLoai, soLuot: 0, diemTru: 0 });
        }
        const loai = nhom.loaiMap.get(tenLoai);
        loai.soLuot += 1;
        loai.diemTru += diemTru;
    });

    return [...nhomMap.values()]
        .map((nhom) => ({
            ...nhom,
            loaiList: [...nhom.loaiMap.values()].sort((a, b) => b.soLuot - a.soLuot),
        }))
        .sort((a, b) => b.soLuot - a.soLuot || b.diemTru - a.diemTru);
};

const QL_ThongKeTheoNhomListing = ({ data, isLoading }) => {
    const [expanded, setExpanded] = useState({});

    const thongKe = useMemo(() => buildThongKe(data), [data]);
    const tongLuot = useMemo(() => thongKe.reduce((sum, n) => sum + n.soLuot, 0), [thongKe]);

    const toggle = (tenNhom) =>
        setExpanded((prev) => ({ ...prev, [tenNhom]: !prev[tenNhom] }));

    return (
        <div className="modern-table-card" style={{ overflowX: 'auto', paddingBottom: '10px', marginBottom: '25px' }}>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang thống kê theo nhóm vi phạm</p>
                </div>
            ) : thongKe.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: '#666' }}>
                    <i className="fa-solid fa-chart-simple" style={{ fontSize: '48px', color: '#bdc3c7', marginBottom: '12px' }}></i>
                    <h3 style={{ color: '#7f8c8d', margin: 0 }}>Chưa có vi phạm nào để thống kê</h3>
                </div>
            ) : (
                <table className="custom-table" style={{ minWidth: '100%' }}>
                    <thead>
                        <tr>
                            <th width="45%">NHÓM / LOẠI VI PHẠM</th>
                            <th width="12%" style={{ textAlign: 'center' }}>SỐ LƯỢT</th>
                            <th width="13%" style={{ textAlign: 'center' }}>TỔNG ĐIỂM TRỪ</th>
                            <th width="30%">TỶ TRỌNG SỐ LƯỢT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {thongKe.map((nhom) => {
                            const isOpen = !!expanded[nhom.tenNhom];
                            const tyTrong = tongLuot > 0 ? (nhom.soLuot / tongLuot) * 100 : 0;

                            return (
                                <React.Fragment key={nhom.tenNhom}>
                                    <tr
                                        onClick={() => toggle(nhom.tenNhom)}
                                        style={{ cursor: 'pointer' }}
                                        title={isOpen ? 'Thu gọn chi tiết loại vi phạm' : 'Xem chi tiết theo loại vi phạm'}
                                    >
                                        <td style={{ fontWeight: '600', color: '#1e293b' }}>
                                            <i
                                                className={`fa-solid ${isOpen ? 'fa-chevron-down' : 'fa-chevron-right'}`}
                                                style={{ marginRight: '8px', color: '#94a3b8', fontSize: '12px' }}
                                            ></i>
                                            {nhom.tenNhom}
                                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: '400' }}>
                                                ({nhom.loaiList.length} loại)
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="tag-badge">{nhom.soLuot}</span>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: '600', color: '#475569' }}>
                                            {nhom.diemTru.toFixed(2)}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${tyTrong}%`, height: '100%', background: '#3b82f6', borderRadius: '999px' }}></div>
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#64748b', minWidth: '42px', textAlign: 'right' }}>
                                                    {tyTrong.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>

                                    {isOpen &&
                                        nhom.loaiList.map((loai) => (
                                            <tr key={`${nhom.tenNhom}__${loai.tenLoai}`} style={{ background: '#fbfdff' }}>
                                                <td style={{ paddingLeft: '34px', fontSize: '13px', color: '#475569', textAlign: 'justify' }}>
                                                    <i className="fa-solid fa-angle-right" style={{ marginRight: '8px', color: '#cbd5e1', fontSize: '11px' }}></i>
                                                    {loai.tenLoai}
                                                </td>
                                                <td style={{ textAlign: 'center', fontSize: '13px', color: '#475569' }}>{loai.soLuot}</td>
                                                <td style={{ textAlign: 'center', fontSize: '13px', color: '#475569' }}>
                                                    {loai.diemTru.toFixed(2)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default QL_ThongKeTheoNhomListing;
