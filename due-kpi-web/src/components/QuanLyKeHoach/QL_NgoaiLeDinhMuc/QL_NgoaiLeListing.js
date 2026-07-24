import React, { useState, useEffect } from 'react';
import { Paginator } from 'primereact/paginator';

export const LOAI_NGOAI_LE_MAP = {
    1: '1: Tập sự / Thử việc (Miễn NCKH)',
    2: '2: Nghỉ BHXH / Nghỉ LĐ',
    3: '3: Cử đi đào tạo TS tập trung',
    4: '4: GV nữ nuôi con 7-12 tháng (Giảm 40h)',
    5: '5: GV nữ nuôi con 13-36 tháng (Giảm 10%)',
    6: '6: Quân nhân dự bị / Tự vệ huấn luyện (Cộng giờ NCKH)',
    7: '7: Hệ số NCKH nữ (Hệ số 1.20)',
    8: '8: Khác'
};

const QL_NgoaiLeListing = ({ data, nhanVienList, onEdit, onDelete, isLoading, canManage }) => {
    const [first, setFirst] = useState(0);
    const [isDesktop, setIsDesktop] = useState(true);
    const rows = 10;

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 992);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { setFirst(0); }, [data]);

    const paginatedData = data.slice(first, first + rows);
    const onPageChange = (event) => setFirst(event.first);

    const formatDate = (dateString) => {
        if (!dateString) return "---";
        let date;
        if (typeof dateString === "string" && dateString.includes("/Date(")) {
            const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
            date = new Date(timestamp);
        } else {
            date = new Date(dateString);
        }
        if (isNaN(date.getTime())) return "---";
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getNhanVienName = (id, hoTenDirect) => {
        if (hoTenDirect) return hoTenDirect;
        if (!id) return "---";
        const nv = nhanVienList.find(item => item.IdNhanVien === id);
        return nv ? `${nv.MaNhanVien ? nv.MaNhanVien + ' - ' : ''}${nv.HoTen}` : `Mã NV: ${id}`;
    };

    const renderDetails = (item) => {
        const parts = [];
        if (item.MienNckh) parts.push('Miễn NCKH');
        if (item.HeSoGiamGiang != null) parts.push(`Giảm giờ giảng: ${item.HeSoGiamGiang * 100}%`);
        if (item.SoGioGiamGiang != null) parts.push(`Giảm giờ giảng: ${item.SoGioGiamGiang}h`);
        if (item.HeSoNckh != null) parts.push(`Hệ số NCKH: ${item.HeSoNckh}`);
        if (item.HeSoGiamNckh != null) parts.push(`Giảm NCKH: ${item.HeSoGiamNckh * 100}%`);
        if (item.SoGioThemNckh != null) parts.push(`Cộng giờ NCKH: +${item.SoGioThemNckh}h`);
        if (item.HeSoGiamPvcd != null) parts.push(`Giảm PVCĐ: ${item.HeSoGiamPvcd * 100}%`);

        if (parts.length === 0) return <span style={{ color: '#95a5a6', fontStyle: 'italic' }}>Theo quy định</span>;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13px' }}>
                {parts.map((p, idx) => (
                    <span key={idx} style={{ backgroundColor: '#edf2f7', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', width: 'fit-content', color: '#2d3748', fontWeight: '500' }}>
                        {p}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="table-card" style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db', marginRight: '10px' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải danh sách ngoại lệ định mức</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-scale-balanced" style={{ fontSize: '60px', color: '#bdc3c7', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>Chưa có bản ghi ngoại lệ định mức nào</h3>
                </div>
            ) : (
                <>
                    <table className="custom-table" style={{ minWidth: isDesktop ? '1100px' : '100%' }}>
                        <thead>
                            <tr>
                                <th width="8%" style={{ textAlign: 'center' }}>NĂM HỌC</th>
                                <th width="18%">GIẢNG VIÊN</th>
                                <th width="18%">LOẠI NGOẠI LỆ</th>
                                <th width="18%">CHI TIẾT MỨC GIẢM / ƯU ĐÃI</th>
                                <th width="13%" style={{ textAlign: 'center' }}>THỜI GIAN ÁP DỤNG</th>
                                <th width="15%">LÝ DO / MINH CHỨNG</th>
                                <th width="10%" style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                                {canManage && <th width="10%" style={{ textAlign: 'center' }}>THAO TÁC</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item) => {
                                const isInactive = item.TrangThai === false || item.trang_thai === 0;
                                return (
                                    <tr key={item.IdNgoaiLe || item.id_ngoai_le} style={{ opacity: isInactive ? 0.65 : 1 }}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.IdNam || item.id_nam}</td>
                                        <td style={{ fontWeight: '600', color: '#2c3e50' }}>
                                            {getNhanVienName(item.IdNhanVien || item.id_nhan_vien, item.HoTen || item.ho_ten)}
                                        </td>
                                        <td style={{ fontSize: '13px', fontWeight: '500' }}>
                                            {item.LoaiNgoaiLeText || LOAI_NGOAI_LE_MAP[item.LoaiNgoaiLe || item.loai_ngoai_le] || `Loại ${item.LoaiNgoaiLe || item.loai_ngoai_le}`}
                                        </td>
                                        <td>{renderDetails(item)}</td>
                                        <td style={{ textAlign: 'center', fontSize: '13px' }}>
                                            <div>{formatDate(item.TuNgay || item.tu_ngay)}</div>
                                            <div style={{ color: '#7f8c8d', fontSize: '12px' }}>đến {formatDate(item.DenNgay || item.den_ngay)}</div>
                                        </td>
                                        <td style={{ fontSize: '13px' }}>
                                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.LyDo || item.ly_do || '---'}</div>
                                            {(item.MinhChungUrl || item.minh_chung_url) && (
                                                <a
                                                    href={item.MinhChungUrl || item.minh_chung_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2563eb', marginTop: '4px' }}
                                                >
                                                    <i className="fa-solid fa-paperclip"></i> Minh chứng
                                                </a>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {!isInactive ? (
                                                <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>
                                                    Hiệu lực
                                                </span>
                                            ) : (
                                                <span style={{ backgroundColor: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', border: '1px solid #e5e7eb' }}>
                                                    Đã vô hiệu
                                                </span>
                                            )}
                                        </td>
                                        {canManage && (
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <div className="action-btn edit-btn" onClick={() => onEdit(item)} title="Chỉnh sửa">
                                                        <i className="fa-solid fa-pen"></i>
                                                    </div>
                                                    {!isInactive && (
                                                        <div className="action-btn delete-btn" onClick={() => onDelete(item.IdNgoaiLe || item.id_ngoai_le)} title="Vô hiệu hóa">
                                                            <i className="fa-solid fa-ban"></i>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {data.length > rows && (
                        <div style={{ marginTop: '15px', borderTop: '1px solid #e9ecef', paddingTop: '10px' }}>
                            <Paginator first={first} rows={rows} totalRecords={data.length} onPageChange={onPageChange} template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport" style={{ background: 'transparent', border: 'none' }} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default QL_NgoaiLeListing;
