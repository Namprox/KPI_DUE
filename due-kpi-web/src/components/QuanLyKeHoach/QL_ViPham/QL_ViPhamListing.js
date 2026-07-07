import React, { useState, useEffect } from 'react';
import { Paginator } from 'primereact/paginator';

const QL_ViPhamListing = ({ data, nhanVienList, onEdit, onDelete, isLoading, canManage }) => {
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

    const getNhanVienName = (id) => {
        if (!id) return "---";
        const nv = nhanVienList.find(item => item.IdNhanVien === id);
        return nv ? `${nv.MaNhanVien} - ${nv.HoTen}` : `Mã NV: ${id}`;
    };

    return (
        <div className="table-card" style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db', marginRight: '10px' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải danh sách vi phạm</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '60px', color: '#bdc3c7', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>Chưa ghi nhận vi phạm nào</h3>
                </div>
            ) : (
                <>
                    <table className="custom-table" style={{ minWidth: isDesktop ? '1000px' : '100%' }}>
                        <thead>
                            <tr>
                                <th width="10%" style={{ textAlign: 'center' }}>NĂM HỌC</th>
                                <th width="20%">NHÂN VIÊN</th>
                                <th width="25%">MÔ TẢ VI PHẠM</th>
                                <th width="15%" style={{ textAlign: 'center' }}>MỨC ĐỘ</th>
                                <th width="12%" style={{ textAlign: 'center' }}>NGÀY VI PHẠM</th>
                                <th width="18%">NGƯỜI GHI NHẬN</th>
                                {canManage && <th width="10%" style={{ textAlign: 'center' }}>THAO TÁC</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item) => (
                                <tr key={item.IdViPham}>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.IdNam}</td>
                                    <td style={{ fontWeight: '600', color: '#2c3e50' }}>{getNhanVienName(item.IdNhanVien)}</td>
                                    <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.MoTa}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {item.LaNghiemTrong ? (
                                            <span style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: '1px solid #f5c6cb' }}>
                                                Nghiêm trọng
                                            </span>
                                        ) : (
                                            <span style={{ backgroundColor: '#e2e3e5', color: '#383d41', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '500', border: '1px solid #d6d8db' }}>
                                                Thường
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{formatDate(item.NgayViPham)}</td>
                                    <td style={{ fontSize: '13px', color: '#7f8c8d' }}>{getNhanVienName(item.IdNguoiGhiNhan)}</td>
                                    {canManage && (
                                        <td>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                <div className="action-btn edit-btn" onClick={() => onEdit(item)} title="Chỉnh sửa"><i className="fa-solid fa-pen"></i></div>
                                                <div className="action-btn delete-btn" onClick={() => onDelete(item.IdViPham)} title="Xóa"><i className="fa-solid fa-trash"></i></div>
                                            </div>
                                        </td>
                                    )}
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

export default QL_ViPhamListing;
