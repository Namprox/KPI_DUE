import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../css/Pages.css';

const DanhSachDuyetPhieu = () => {
    const [approvalList, setApprovalList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const authHeaders = {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
    };
    const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

    const roleName = (currentUser.RoleName || currentUser.TenChucVu || '').toLowerCase();
    const isAdmin = roleName.includes('hiệu trưởng');
    const isManager = roleName.includes('trưởng khoa') || roleName.includes('trưởng bộ môn');

    const currentRealYear = new Date().getFullYear();
    const [listYears, setListYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(currentRealYear);

    useEffect(() => {
        const fetchYears = async () => {
            if (!isAdmin && !isManager) return;

            try {
                const res = await fetch(`${API_URL}/nam-danh-gia`, { headers: authHeaders });
                const result = await res.json();

                if (Array.isArray(result) && result.length > 0) {
                    const years = result.map(item => item.IdNam || item.id_nam || item.NamHoc || item.nam).filter(y => y != null && !isNaN(y));
                    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

                    if (uniqueYears.length > 0) {
                        setListYears(uniqueYears);
                        setSelectedYear(uniqueYears[0]);
                    } else {
                        setListYears([currentRealYear]);
                    }
                } else {
                    setListYears([currentRealYear]);
                }
            } catch (err) {
                console.error("Lỗi lấy danh sách năm:", err);
                setListYears([currentRealYear]);
            }
        };

        fetchYears();
    }, [isAdmin, isManager]);

    useEffect(() => {
        const fetchApprovalList = async () => {
            if (!isAdmin && !isManager) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const url = `${API_URL}/approval?idQuanLy=${currentUser.IdNhanVien}&idNam=${selectedYear}&isTopLevel=${isAdmin}`;
                const res = await fetch(url, { headers: authHeaders });
                const result = await res.json();
                if (result.success) {
                    setApprovalList(result.data || []);
                }
            } catch (err) {
                console.error("Lỗi tải danh sách duyệt:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser.IdNhanVien && listYears.length > 0) {
            fetchApprovalList();
        }
    }, [currentUser.IdNhanVien, selectedYear, isAdmin, isManager, listYears.length]);

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        return parts[parts.length - 1].charAt(0).toUpperCase();
    };

    const getStatusBadge = (status) => {
        if (status === 2) return <span style={{ background: '#fef08a', color: '#a16207', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', minWidth: '90px', textAlign: 'center' }}>Cần duyệt</span>;
        if (status === 3) return <span style={{ background: '#dcfce3', color: '#15803d', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', minWidth: '90px', textAlign: 'center' }}>Đã duyệt</span>;
        return <span style={{ background: '#e2e8f0', color: '#475569', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'inline-block', minWidth: '90px', textAlign: 'center' }}>Không xác định</span>;
    };

    if (!isAdmin && !isManager) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '100px 20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ width: '80px', height: '80px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <i className="fa-solid fa-lock" style={{ fontSize: '35px', color: '#ef4444' }}></i>
                </div>
                <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Từ chối truy cập</h2>
                <p style={{ color: '#64748b', marginBottom: '25px', maxWidth: '500px', margin: '0 auto 25px' }}>
                    Chỉ cấp Quản lý (Trưởng khoa, Trưởng bộ môn) và Ban Giám hiệu mới có quyền truy cập vào phân hệ duyệt phiếu đánh giá KPI.
                </p>
                <button className="btn-submit" style={{ padding: '10px 25px', borderRadius: '8px' }} onClick={() => navigate('/')}>
                    <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i> Quay về Trang chủ
                </button>
            </div>
        );
    }

    const filteredList = approvalList.filter(item =>
        item.HoTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.MaNhanVien.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>DANH SÁCH DUYỆT PHIẾU ĐÁNH GIÁ</h2>
                    <span className="breadcrumb">Người duyệt: {currentUser.FullName} ({currentUser.RoleName})</span>
                </div>
            </div>

            <div className="table-container" style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1', maxWidth: '350px' }}>
                        <i className="fa-solid fa-search" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc mã nhân viên"
                            className="form-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '40px', width: '100%', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>Năm học:</label>
                        <select
                            className="form-input"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            style={{ width: '120px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                            disabled={isLoading || listYears.length === 0}
                        >
                            {listYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '30px', color: '#003399' }}></i>
                        <p style={{ marginTop: '15px', color: '#64748b' }}>Đang tải dữ liệu phiếu đánh giá...</p>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
                        <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <i className="fa-solid fa-clipboard-check" style={{ fontSize: '35px', color: '#94a3b8' }}></i>
                        </div>
                        <h3 style={{ color: '#334155', marginBottom: '10px' }}>Không có dữ liệu</h3>
                        <p>Hiện không có phiếu đánh giá nào cần bạn phê duyệt trong năm học này.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ width: '30%', padding: '16px 20px', textAlign: 'left', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>Nhân viên</th>
                                    <th style={{ width: '15%', padding: '16px 20px', textAlign: 'left', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>Chức vụ</th>
                                    <th style={{ width: '15%', padding: '16px 20px', textAlign: 'center', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>Điểm tự chấm</th>
                                    <th style={{ width: '15%', padding: '16px 20px', textAlign: 'center', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>Ngày nộp</th>
                                    <th style={{ width: '15%', padding: '16px 20px', textAlign: 'center', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>Trạng thái</th>
                                    <th style={{ width: '10%', padding: '16px 20px', textAlign: 'center', color: '#475569', fontSize: '13px', textTransform: 'uppercase' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredList.map((item) => (
                                    <tr key={item.IdPhieu} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.2s', background: item.TrangThai === 2 ? '#fefce8' : '#fff' }} className="table-row-hover">
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0e7ff', color: '#003399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                                                    {getInitials(item.HoTen)}
                                                </div>
                                                <div>
                                                    <b style={{ color: '#0f172a', fontSize: '14px', display: 'block', marginBottom: '2px' }}>{item.HoTen}</b>
                                                    <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{item.MaNhanVien}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px', color: '#475569', fontSize: '14px' }}>
                                            {item.TenChucVu}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <span style={{ color: '#003399', fontSize: '16px', fontWeight: '700', background: '#eff6ff', padding: '4px 12px', borderRadius: '20px' }}>
                                                {item.TongDiemTichLuy?.toFixed(2)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                            {item.NgayGui || '---'}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            {getStatusBadge(item.TrangThai)}
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                                            <button
                                                className={item.TrangThai === 2 ? "btn-submit" : "btn-cancel"}
                                                style={{
                                                    padding: '6px 16px',
                                                    fontSize: '13px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    border: item.TrangThai === 2 ? 'none' : '1px solid #cbd5e1'
                                                }}
                                                onClick={() => navigate(`/chi-tiet-duyet-phieu?idPhieu=${item.IdPhieu}&idNhanVien=${item.IdNhanVien}&year=${item.IdNam}`)}
                                            >
                                                {item.TrangThai === 2 ? <i className="fa-solid fa-pen-to-square"></i> : <i className="fa-solid fa-eye"></i>}
                                                {item.TrangThai === 2 ? "Duyệt" : "Xem"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DanhSachDuyetPhieu;