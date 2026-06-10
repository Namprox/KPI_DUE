import React, { useState, useEffect } from 'react';
import { Paginator } from 'primereact/paginator';
import '../../../css/OrganizationalManagement/QL_DonVi.css';

const QL_DonViListing = ({ data, onEdit, onDelete, isLoading, canManage }) => {
    const [first, setFirst] = useState(0);
    const rows = 20;

    useEffect(() => { setFirst(0); }, [data]);

    const paginatedData = data.slice(first, first + rows);
    const onPageChange = (event) => setFirst(event.first);

    return (
        <div className="table-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db', marginRight: '10px' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải dữ liệu đơn vị</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-sitemap" style={{ fontSize: '60px', color: '#5dade2', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Chưa có đơn vị nào được tạo</h3>
                </div>
            ) : (
                <>
                    <div className="donvi-table-wrapper">
                        <table className="custom-table donvi-table">
                            <thead>
                                <tr>
                                    <th width="4%" style={{ textAlign: 'center' }}>STT</th>
                                    <th width="10%">MÃ ĐƠN VỊ</th>
                                    <th width="30%">TÊN ĐƠN VỊ</th>
                                    <th width="16%">TRỰC THUỘC (CẤP CHA)</th>
                                    <th width="8%" style={{ textAlign: 'center' }}>CẤP</th>
                                    <th width="10%" style={{ textAlign: 'center' }}>NHÂN SỰ</th>
                                    <th width="12%" style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                                    <th width="10%" style={{ textAlign: 'center' }}>THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((item, index) => {
                                    const actualIndex = first + index + 1;
                                    return (
                                        <tr key={item.IdDonVi}>
                                            <td style={{ textAlign: 'center' }}>{actualIndex}</td>
                                            <td style={{ fontWeight: 'bold', color: '#003399', whiteSpace: 'nowrap' }}>{item.MaDonVi}</td>
                                            <td style={{ fontWeight: '600', color: '#333' }}>{item.TenDonVi}</td>
                                            <td style={{ color: item.IdDonViCha ? '#0284c7' : '#999', fontStyle: item.IdDonViCha ? 'normal' : 'italic' }}>
                                                {item.TenDonViCha || (item.IdDonViCha ? '' : '---')}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: '500' }}>{item.CapDonVi}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="donvi-user-count">
                                                    <i className="fa-solid fa-user" style={{ marginRight: '4px' }}></i>{item.TotalUsers}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {item.TrangThai ? (
                                                    <span className="donvi-status-active">Đang hoạt động</span>
                                                ) : (
                                                    <span className="donvi-status-inactive">Đã khóa</span>
                                                )}
                                            </td>
                                            <td>
                                                <div
                                                    className="donvi-action-group"
                                                    style={{
                                                        opacity: canManage ? 1 : 0.4,
                                                        pointerEvents: canManage ? 'auto' : 'none'
                                                    }}
                                                >
                                                    <div className="donvi-action-btn donvi-edit-btn" onClick={() => onEdit(item)} title="Chỉnh sửa">
                                                        <i className="fa-solid fa-pen"></i>
                                                    </div>
                                                    <div className="donvi-action-btn donvi-delete-btn" onClick={() => onDelete(item.IdDonVi)} title="Xóa">
                                                        <i className="fa-solid fa-trash"></i>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {data.length > rows && (
                        <div style={{ marginTop: '15px', borderTop: '1px solid #e9ecef', paddingTop: '10px' }}>
                            <Paginator
                                first={first} rows={rows} totalRecords={data.length} onPageChange={onPageChange}
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

export default QL_DonViListing;