import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import UserListing from '../../components/QuanLyToChuc/QL_NhanVien/QL_NhanVienListing';
import ResetPasswordModal from '../../components/QuanLyToChuc/QL_NhanVien/ResetPasswordModal';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const PAGE_SIZE = 20;

const QL_NhanVien = () => {
    const [data, setData] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [first, setFirst] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
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

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(Math.floor(first / PAGE_SIZE) + 1),
                pageSize: String(PAGE_SIZE)
            });
            if (searchTerm) params.set('search', searchTerm);
            const response = await apiFetch(`nhan-vien?${params.toString()}`);
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setData(list);
                setTotalCount(typeof result.TotalCount === 'number' ? result.TotalCount : list.length);
            }
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    }, [first, searchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFirst(0);
            setSearchTerm(searchQuery.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = (e) => setSearchQuery(e.target.value);

    const handlePageChange = (event) => setFirst(event.first);

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
                if (data.length === 1 && first > 0) setFirst(first - PAGE_SIZE);
                else fetchData();
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
                        <input type="text" placeholder="Tìm tên, mã nhân viên, email" className="form-input" style={{ width: '100%', paddingLeft: '35px' }} value={searchQuery} onChange={handleSearch} />
                    </div>
                </div>
            </div>

            <UserListing
                data={data}
                first={first}
                rows={PAGE_SIZE}
                totalRecords={totalCount}
                onPageChange={handlePageChange}
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
