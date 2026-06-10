import React, { useState, useEffect } from 'react';
import { Paginator } from 'primereact/paginator';
import '../../../css/PlanManagement/QL_DinhMuc.css';

const QL_DinhMucListing = ({ data, onEdit, onDelete, isLoading }) => {
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

    return (
        <div className="table-card dinh-muc-table-container" style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db', marginRight: '10px' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải định mức</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-ruler-combined" style={{ fontSize: '60px', color: '#5dade2', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Chưa có định mức nào được thiết lập</h3>
                </div>
            ) : (
                <>
                    <table className="custom-table dinh-muc-table" style={{ minWidth: isDesktop ? '800px' : '100%' }}>
                        <thead>
                            <tr>
                                <th width="10%" style={{ textAlign: 'center' }}>NĂM</th>
                                <th width="30%">CHỨC DANH NGHỀ NGHIỆP</th> {/* ĐÃ SỬA TIÊU ĐỀ */}
                                <th width="20%" style={{ textAlign: 'center' }}>GIỜ GIẢNG DẠY</th>
                                <th width="20%" style={{ textAlign: 'center' }}>GIỜ NCKH</th>
                                <th width="20%" style={{ textAlign: 'center' }}>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item) => (
                                <tr key={item.IdDinhMuc}>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.IdNam}</td>
                                    {/* ĐÃ SỬA TÊN BIẾN */}
                                    <td style={{ fontWeight: '600', color: '#003399' }}>{item.TenChucDanh || '---'}</td>
                                    <td style={{ textAlign: 'center' }}>{item.GioGiangLyThuyet} giờ</td>
                                    <td style={{ textAlign: 'center' }}>{item.GioNckh} giờ</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                                            <div className="action-btn edit-btn" onClick={() => onEdit(item)}><i className="fa-solid fa-pen"></i></div>
                                            <div className="action-btn delete-btn" onClick={() => onDelete(item.IdDinhMuc)}><i className="fa-solid fa-trash"></i></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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

export default QL_DinhMucListing;