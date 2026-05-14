import React, { useState, useEffect } from 'react';
import { Paginator } from 'primereact/paginator';
import '../../../css/CriteriaManagement/QL_ThangDiem.css';

const QL_ThangDiemListing = ({ data, onEdit, onDelete, isLoading, canManage }) => {
    const [first, setFirst] = useState(0);
    const [isDesktop, setIsDesktop] = useState(true);
    const rows = 15;

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
        <div
            className="table-card thang-diem-table-container"
            style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', paddingBottom: '10px' }}
        >
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db', marginRight: '10px' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải thang điểm</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-sliders" style={{ fontSize: '60px', color: '#5dade2', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Chưa có thang điểm nào được tạo</h3>
                </div>
            ) : (
                <>
                    <table
                        className="custom-table thang-diem-table"
                        style={{ minWidth: isDesktop ? '900px' : '100%' }}
                    >
                        <thead>
                            <tr>
                                <th width="5%" style={{ textAlign: 'center' }}>STT</th>
                                <th width="34%">THUỘC TIÊU CHÍ (CẤP CHA)</th>
                                <th width="34%">ĐIỀU KIỆN ĐẠT ĐIỂM</th>
                                <th width="12%" style={{ textAlign: 'center' }}>MỨC ĐIỂM</th>
                                <th width="15%" style={{ textAlign: 'center' }}>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, index) => {
                                const actualIndex = first + index + 1;
                                return (
                                    <tr key={item.IdThangDiem}>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{actualIndex}</td>
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#003399', fontSize: '14px', lineHeight: '1.4' }}>
                                                {item.TenTieuChi || `Tiêu chí ID: ${item.IdTieuChi}`}
                                            </div>
                                        </td>
                                        <td style={{ color: '#475569', fontSize: '14px', lineHeight: '1.4' }}>
                                            {item.DieuKienDiem || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Không có mô tả điều kiện</span>}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px' }}>
                                                {item.GiaTriDiem} đ
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', opacity: canManage ? 1 : 0.4, pointerEvents: canManage ? 'auto' : 'none' }}>
                                                <div className="action-btn edit-btn" onClick={() => onEdit(item)} title="Chỉnh sửa">
                                                    <i className="fa-solid fa-pen"></i>
                                                </div>
                                                <div className="action-btn delete-btn" onClick={() => onDelete(item.IdThangDiem)} title="Xóa">
                                                    <i className="fa-solid fa-trash"></i>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
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

export default QL_ThangDiemListing;