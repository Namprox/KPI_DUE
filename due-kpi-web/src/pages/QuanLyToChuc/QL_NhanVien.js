import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import UserListing from '../../components/QuanLyToChuc/QL_NhanVien/QL_NhanVienListing';
import ResetPasswordModal from '../../components/QuanLyToChuc/QL_NhanVien/ResetPasswordModal';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_NhanVien = () => {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [resetPasswordUser, setResetPasswordUser] = useState(null);

    const { confirmDeleteDialog } = useConfirmDeleteDialog();
    const { user } = useAuth();
    const navigate = useNavigate();
    const currentUser = user || {};
    const roleCode = currentUser?.MaChucVu || '';
    const isAdmin = roleCode === 'Admin';
    const isManager = ['HT', 'PHT', 'TK', 'TBM'].includes(roleCode);
    const canManage = isAdmin || isManager;

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('nhan-vien');
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setData(list);
                setFilteredData(list);
            }
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredData(data.filter(item => (item.HoTen && item.HoTen.toLowerCase().includes(query)) || (item.MaNhanVien && item.MaNhanVien.toLowerCase().includes(query))));
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        navigate(`/quan-ly-nguoi-dung/chi-tiet/${item.IdNhanVien}`);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa', message: 'Bạn có chắc chắn muốn xóa nhân viên này?',
            accept: async () => {
                await apiFetch(`nhanvien?id=${id}`, { method: 'DELETE' });
                fetchData();
            }
        });
    };

    const handleResetPassword = (item) => {
        setResetPasswordUser(item);
        setIsResetPasswordOpen(true);
    };

    const closeResetPasswordModal = () => {
        setIsResetPasswordOpen(false);
        setResetPasswordUser(null);
    };

    return (
        <div className="page-container">
            <div className="page-header"><div className="header-title"><h2>QUẢN LÝ NHÂN VIÊN / GIẢNG VIÊN</h2></div></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                {canManage && (<button className="btn-add-new" onClick={() => navigate('/quan-ly-nguoi-dung/them-moi')} style={{ margin: 0 }}><i className="fa-solid fa-plus"></i> Thêm mới</button>)}
            </div>
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH NHÂN VIÊN</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input type="text" placeholder="Tìm tên, mã nhân viên" className="form-input" style={{ width: '100%', paddingLeft: '35px' }} value={searchQuery} onChange={handleSearch} />
                    </div>
                </div>
            </div>

            <UserListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                onResetPassword={handleResetPassword}
                isLoading={isLoading}
                canManage={canManage}
            />

            <ResetPasswordModal
                isOpen={isResetPasswordOpen}
                onClose={closeResetPasswordModal}
                user={resetPasswordUser}
            />
        </div>
    );
};

export default QL_NhanVien;