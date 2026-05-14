import React, { useState, useEffect } from 'react';
import { Paginator } from 'primereact/paginator';
import '../../../css/PlanManagement/QL_NamDanhGia.css';

const QL_NamDanhGiaListing = ({ data, onEdit, onDelete, isLoading, canManage }) => {
    const [first, setFirst] = useState(0);
    const [isDesktop, setIsDesktop] = useState(true);
    const rows = 15;

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth > 992);
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setFirst(0);
    }, [data]);

    const paginatedData = data.slice(first, first + rows);

    const onPageChange = (event) => {
        setFirst(event.first);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '---';

        let date;
        if (typeof dateString === 'string' && dateString.includes('/Date(')) {
            const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
            date = new Date(timestamp);
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) return '---';
        return date.toLocaleDateString('vi-VN');
    };

    const renderStatus = (status) => {
        switch (status) {
            case 1: return <span style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '5px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Chuẩn bị</span>;
            case 2: return <span style={{ backgroundColor: '#22c55e', color: '#fff', padding: '5px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Đang mở KPI</span>;
            case 3: return <span style={{ backgroundColor: '#64748b', color: '#fff', padding: '5px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>Đã đóng</span>;
            default: return '---';
        }
    };

    return (
        <div
            className="table-card nam-danhgia-table-container"
            style={{
                overflowX: 'auto',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                paddingBottom: '10px'
            }}
        >
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db', marginRight: '10px' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải dữ liệu năm đánh giá</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '60px', color: '#5dade2', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Chưa có năm đánh giá nào được tạo</h3>
                </div>
            ) : (
                <>
                    <table
                        className="custom-table nam-danhgia-table"
                        style={{ minWidth: isDesktop ? '1000px' : '100%' }}
                    >
                        <thead>
                            <tr>
                                <th width="10%" style={{ textAlign: 'center' }}>NĂM ĐÁNH GIÁ</th>
                                <th width="20%" style={{ textAlign: 'center' }}>THỜI GIAN NĂM HỌC</th>
                                <th width="25%" style={{ textAlign: 'center' }}>THỜI GIAN GV TỰ ĐÁNH GIÁ</th>
                                <th width="20%">GHI CHÚ</th>
                                <th width="12%" style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                                <th width="13%" style={{ textAlign: 'center' }}>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item) => (
                                <tr key={item.IdNam}>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: '#003399' }}>
                                        {item.IdNam}
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#333' }}>
                                        {formatDate(item.NgayBatDau)} <i className="fa-solid fa-arrow-right" style={{ color: '#ccc', margin: '0 5px' }}></i> {formatDate(item.NgayKetThuc)}
                                    </td>
                                    <td style={{ textAlign: 'center', color: '#16a085', fontWeight: '500' }}>
                                        {formatDate(item.NgayMoTuDanhGia)} <i className="fa-solid fa-arrow-right" style={{ color: '#ccc', margin: '0 5px' }}></i> {formatDate(item.NgayDongTuDanhGia)}
                                    </td>
                                    <td style={{ fontSize: '13px', color: '#666' }}>{item.GhiChu || '---'}</td>
                                    <td style={{ textAlign: 'center' }}>{renderStatus(item.TrangThai)}</td>
                                    <td>
                                        <div style={{
                                            display: 'flex',
                                            gap: '15px',
                                            justifyContent: 'center',
                                            opacity: canManage ? 1 : 0.4,
                                            pointerEvents: canManage ? 'auto' : 'none'
                                        }}>
                                            <div className="action-btn edit-btn" onClick={() => onEdit(item)} title="Chỉnh sửa">
                                                <i className="fa-solid fa-calendar-days"></i>
                                            </div>
                                            <div className="action-btn delete-btn" onClick={() => onDelete(item.IdNam)} title="Xóa">
                                                <i className="fa-solid fa-trash"></i>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {data.length > rows && (
                        <div style={{ marginTop: '15px', borderTop: '1px solid #e9ecef', paddingTop: '10px' }}>
                            <Paginator
                                first={first}
                                rows={rows}
                                totalRecords={data.length}
                                onPageChange={onPageChange}
                                template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                                style={{ background: 'transparent', border: 'none' }}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default QL_NamDanhGiaListing;