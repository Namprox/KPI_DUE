import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Paginator } from 'primereact/paginator';
import { apiFetch } from '../../utils/api';
import '../../css/Pages.css';
import '../../css/QuanLyToChuc/QL_NhanVien.css';

const DanhSachThanhVien = () => {
    const { maDonVi } = useParams();
    const [members, setMembers] = useState([]);
    const [filteredMembers, setFilteredMembers] = useState([]);
    const [unitName, setUnitName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [first, setFirst] = useState(0);
    const rows = 20;

    useEffect(() => {
        fetchUnitName();
        fetchMembers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maDonVi]);

    const fetchUnitName = async () => {
        try {
            const response = await apiFetch('donvi');
            if (response.ok) {
                const result = await response.json();
                const units = result.Items || (Array.isArray(result) ? result : []);
                const currentUnit = units.find(u => u.MaDonVi === maDonVi);
                if (currentUnit) {
                    setUnitName(currentUnit.TenDonVi);
                }
            }
        } catch (error) {
            console.error("Lỗi lấy thông tin đơn vị:", error);
        }
    };

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch(`nhan-vien?maDonVi=${maDonVi}&baoGomDonViCon=true`);
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setMembers(list);
                setFilteredMembers(list);
                
                if (!unitName && list.length > 0) {
                    const matchingItem = list.find(item => item.MaDonVi === maDonVi);
                    if (matchingItem) {
                        setUnitName(matchingItem.TenDonVi);
                    } else if (list[0].TenDonVi) {
                        setUnitName(list[0].TenDonVi);
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách nhân viên:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredMembers(members.filter(item => 
            (item.HoTen && item.HoTen.toLowerCase().includes(query)) ||
            (item.MaNhanVien && item.MaNhanVien.toLowerCase().includes(query)) ||
            (item.Email && item.Email.toLowerCase().includes(query)) ||
            (item.TenChucVu && item.TenChucVu.toLowerCase().includes(query)) ||
            (item.TenDonVi && item.TenDonVi.toLowerCase().includes(query))
        ));
        setFirst(0);
    };

    const paginatedData = filteredMembers.slice(first, first + rows);
    const onPageChange = (event) => setFirst(event.first);

    return (
        <div className="page-container">
            <div style={{ marginBottom: '15px' }}>
                <Link to="/quan-ly-don-vi" style={{ textDecoration: 'none', color: '#0056b3', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '14px' }}>
                    <i className="fa-solid fa-arrow-left"></i> Quay lại quản lý đơn vị
                </Link>
            </div>

            <div className="page-header">
                <div className="header-title">
                    <h2>DANH SÁCH THÀNH VIÊN</h2>
                    <span className="breadcrumb">Quản lý đơn vị / {unitName || maDonVi} / Danh sách thành viên</span>
                </div>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <p className="sub-title" style={{ margin: 0 }}>
                            ĐƠN VỊ: <span style={{ color: '#003399' }}>{unitName || maDonVi}</span>
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#666' }}>
                            Mã đơn vị: <strong>{maDonVi}</strong> | Tổng số thành viên: <strong>{filteredMembers.length}</strong>
                        </p>
                    </div>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm tên, mã, email, chức vụ..."
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <div className="table-card nhanvien-table-container" style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db', marginRight: '10px' }}></i>
                        <p style={{ marginTop: '10px', color: '#666' }}>Đang tải danh sách thành viên...</p>
                    </div>
                ) : filteredMembers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                        <i className="fa-solid fa-users-slash" style={{ fontSize: '60px', color: '#5dade2', marginBottom: '15px' }}></i>
                        <h3 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Không tìm thấy thành viên nào</h3>
                    </div>
                ) : (
                    <>
                        <table className="custom-table nhanvien-table" style={{ minWidth: '1000px' }}>
                            <thead>
                                <tr>
                                    <th width="5%" style={{ textAlign: 'center' }}>STT</th>
                                    <th width="15%">MÃ NHÂN VIÊN</th>
                                    <th width="25%">HỌ VÀ TÊN</th>
                                    <th width="20%">ĐƠN VỊ CÔNG TÁC</th>
                                    <th width="15%">CHỨC VỤ</th>
                                    <th width="25%">EMAIL</th>
                                    <th width="10%" style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((item, index) => {
                                    const actualIndex = first + index + 1;
                                    return (
                                        <tr key={item.IdNhanVien}>
                                            <td style={{ textAlign: 'center' }}>{actualIndex}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: 'bold', color: '#003399' }}>{item.MaNhanVien}</div>
                                            </td>
                                            <td style={{ whiteSpace: 'nowrap' }}>
                                                <div style={{ fontWeight: '600', color: '#333' }}>{item.HoTen}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '500' }}>{item.TenDonVi || '---'}</div>
                                                {item.MaDonVi && <span style={{ fontSize: '11px', color: '#666' }}>({item.MaDonVi})</span>}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '500', color: '#0284c7' }}>{item.TenChucVu || '---'}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px', color: '#475569' }}>
                                                    <i className="fa-regular fa-envelope" style={{ marginRight: '5px', color: '#3b82f6' }}></i>
                                                    {item.Email || '---'}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {item.TrangThai ? (
                                                    <span style={{ backgroundColor: '#22c55e', color: '#fff', padding: '5px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                                        Đang hoạt động
                                                    </span>
                                                ) : (
                                                    <span style={{ backgroundColor: '#94a3b8', color: '#fff', padding: '5px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                                        Đã khóa
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredMembers.length > rows && (
                            <div style={{ marginTop: '15px', borderTop: '1px solid #e9ecef', paddingTop: '10px' }}>
                                <Paginator
                                    first={first}
                                    rows={rows}
                                    totalRecords={filteredMembers.length}
                                    onPageChange={onPageChange}
                                    template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                                    style={{ background: 'transparent', border: 'none' }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default DanhSachThanhVien;
