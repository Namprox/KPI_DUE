import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import UserListing from '../../components/QuanLyToChuc/QL_NhanVien/QL_NhanVienListing';
import ResetPasswordModal from '../../components/QuanLyToChuc/QL_NhanVien/ResetPasswordModal';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';
import { fetchDonViList, getTenDonViFromList } from '../../utils/donViApi';
import {
    normalizeRole,
    ROLE,
    ROLE_SETS,
    hasRole,
    donViTheoVaiTro
} from '../../utils/roles';

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

    // Đơn vị và quyền
    const [selectedDonViId, setSelectedDonViId] = useState('');
    const [allDonViList, setAllDonViList] = useState([]);

    const { confirmDeleteDialog } = useConfirmDeleteDialog();
    const { user } = useAuth();
    const navigate = useNavigate();
    const role = normalizeRole(user);
    const isToanTruong = hasRole([ROLE.ADMIN, ROLE.HIEU_TRUONG, ROLE.PHO_HIEU_TRUONG], user);
    const canManage = hasRole(ROLE_SETS.QUAN_LY_NGUOI_DUNG, user);

    // Danh sách đơn vị mà người dùng làm Trưởng (TK, TKL, TP, TBM)
    const donViPhuTrach = useMemo(() => {
        if (isToanTruong) return [];
        const list = donViTheoVaiTro(
            [...ROLE_SETS.TRUONG_DON_VI, ROLE.TRUONG_BO_MON],
            user
        );
        if (list.length > 0) return list;
        // Fallback nếu danh sách kiêm nhiệm chưa có trong user.DonVi nhưng role chính là trưởng và có IdDonVi
        if (
            user?.IdDonVi &&
            [...ROLE_SETS.TRUONG_DON_VI, ROLE.TRUONG_BO_MON].includes(role)
        ) {
            return [{
                IdDonVi: user.IdDonVi,
                MaDonVi: user.MaDonVi || '',
                TenDonVi: user.TenDonVi || '',
                MaChucVu: role
            }];
        }
        return [];
    }, [user, isToanTruong, role]);

    // Tải danh mục đơn vị để hiển thị tên đơn vị đẹp
    useEffect(() => {
        let isMounted = true;
        fetchDonViList()
            .then(list => {
                if (isMounted) setAllDonViList(list || []);
            })
            .catch(err => console.error('Lỗi nạp danh mục đơn vị:', err));
        return () => { isMounted = false; };
    }, []);

    // Tự động chọn đơn vị phụ trách đầu tiên nếu là Trưởng đơn vị
    useEffect(() => {
        if (!isToanTruong && donViPhuTrach.length > 0) {
            const exists = donViPhuTrach.some(d => String(d.IdDonVi) === String(selectedDonViId));
            if (!exists) {
                setSelectedDonViId(String(donViPhuTrach[0].IdDonVi));
            }
        }
    }, [isToanTruong, donViPhuTrach, selectedDonViId]);

    const fetchData = useCallback(async () => {
        // Nếu là Trưởng đơn vị nhưng chưa xác định được đơn vị phụ trách
        if (!isToanTruong) {
            if (!selectedDonViId) {
                if (donViPhuTrach.length > 0) return; // Đang chờ useEffect gán selectedDonViId
                setData([]);
                setTotalCount(0);
                setIsLoading(false);
                return;
            }
        }

        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(Math.floor(first / PAGE_SIZE) + 1),
                pageSize: String(PAGE_SIZE)
            });
            if (searchTerm) params.set('search', searchTerm);

            if (!isToanTruong) {
                params.set('idDonVi', String(selectedDonViId));
                params.set('baoGomDonViCon', 'true');
            } else if (selectedDonViId) {
                // Toàn trường nhưng người dùng có chọn lọc theo 1 đơn vị
                params.set('idDonVi', String(selectedDonViId));
                params.set('baoGomDonViCon', 'true');
            }

            const response = await apiFetch(`nhan-vien?${params.toString()}`);
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setData(list);
                setTotalCount(typeof result.TotalCount === 'number' ? result.TotalCount : list.length);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [first, searchTerm, isToanTruong, selectedDonViId, donViPhuTrach.length]);

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

    const handleDonViChange = (e) => {
        setFirst(0);
        setSelectedDonViId(e.target.value);
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        navigate(`/quan-ly-nguoi-dung/chi-tiet/${item.IdNhanVien}`);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa nhân viên này?',
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

    // Tên đơn vị đang được chọn hiển thị
    const currentDonViName = useMemo(() => {
        if (!selectedDonViId) return '';
        const fromPhuTrach = donViPhuTrach.find(d => String(d.IdDonVi) === String(selectedDonViId));
        if (fromPhuTrach?.TenDonVi) return fromPhuTrach.TenDonVi;
        return getTenDonViFromList(allDonViList, selectedDonViId);
    }, [selectedDonViId, donViPhuTrach, allDonViList]);

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-title">
                    <h2>QUẢN LÝ NHÂN VIÊN / GIẢNG VIÊN</h2>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    {canManage && (
                        <button
                            className="btn-add-new"
                            onClick={() => navigate('/quan-ly-nguoi-dung/them-moi')}
                            style={{ margin: 0 }}
                        >
                            <i className="fa-solid fa-plus"></i> Thêm mới
                        </button>
                    )}
                </div>

                {/* Banner hoặc Selector đơn vị phụ trách */}
                {!isToanTruong ? (
                    donViPhuTrach.length > 1 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ fontWeight: 600, color: '#334155', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                <i className="fa-solid fa-building-user" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                                Đơn vị phụ trách:
                            </label>
                            <select
                                className="form-input"
                                style={{ minWidth: '260px', padding: '6px 12px', borderColor: '#0284c7', fontWeight: 500 }}
                                value={selectedDonViId}
                                onChange={handleDonViChange}
                            >
                                {donViPhuTrach.map(d => {
                                    const name = d.TenDonVi || getTenDonViFromList(allDonViList, d.IdDonVi);
                                    return (
                                        <option key={d.IdDonVi} value={String(d.IdDonVi)}>
                                            {name}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    ) : donViPhuTrach.length === 1 ? (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#f0f9ff',
                            color: '#0369a1',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            border: '1px solid #bae6fd'
                        }}>
                            <i className="fa-solid fa-building-user" style={{ color: '#0284c7' }}></i>
                            <span>Đơn vị phụ trách: <strong>{currentDonViName || 'Đang tải...'}</strong></span>
                            <span style={{ fontSize: '12px', color: '#0284c7' }}>(Gồm các bộ môn / đơn vị trực thuộc)</span>
                        </div>
                    ) : (
                        <div style={{
                            padding: '8px 16px',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            borderRadius: '8px',
                            fontSize: '14px',
                            border: '1px solid #fde68a'
                        }}>
                            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                            Tài khoản chưa được gán đơn vị phụ trách
                        </div>
                    )
                ) : (
                    /* Cấp toàn trường (Admin, HT, PHT) */
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontWeight: 500, color: '#475569', fontSize: '14px', whiteSpace: 'nowrap' }}>
                            <i className="fa-solid fa-filter" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                            Lọc theo đơn vị:
                        </label>
                        <select
                            className="form-input"
                            style={{ minWidth: '260px', padding: '6px 12px' }}
                            value={selectedDonViId}
                            onChange={handleDonViChange}
                        >
                            <option value="">-- Toàn trường (Tất cả đơn vị) --</option>
                            {allDonViList.map(d => {
                                const id = d.IdDonVi || d.id_don_vi;
                                const name = d.TenDonVi || d.ten_don_vi;
                                return (
                                    <option key={id} value={String(id)}>
                                        {name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}
            </div>

            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH NHÂN VIÊN</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm tên, mã nhân viên, email"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
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
