import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import UserListing from '../../components/OrganizationalManagement/QL_NhanVien/QL_NhanVienListing';
import UserForm from '../../components/OrganizationalManagement/QL_NhanVien/QL_NhanVienForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_NhanVien = () => {
    const initialForm = {
        MaNhanVien: '',
        MatKhau: '',
        HoTen: '',
        Email: '',
        IdDonVi: '',
        IdChucVu: '',
        IdQuanLyTrucTiep: '',
        IdChucDanh: '',
        ScienceUserId: '',
        TrangThai: true
    };

    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState(initialForm);
    const [editId, setEditId] = useState(null);

    const [donViList, setDonViList] = useState([]);
    const [chucVuList, setChucVuList] = useState([]);
    const [chucDanhList, setChucDanhList] = useState([]);
    const [quanLyList, setQuanLyList] = useState([]);

    const { confirmDeleteDialog } = useConfirmDeleteDialog();
    const { user } = useAuth();
    const currentUser = user || {};
    const roleId = currentUser?.IdChucVu || currentUser?.RoleId || 0;
    const roleName = (currentUser?.RoleName || '').toLowerCase();
    const isAdmin = roleId === 5 || roleId === 4 || roleName.includes('hiệu trưởng');
    const isManager = roleId === 3 || roleId === 2 || roleName.includes('trưởng khoa') || roleName.includes('trưởng bộ môn');
    const canManage = isAdmin || isManager;

    useEffect(() => {
        fetchData();
        fetchDropdownData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchDropdownData = async () => {
        try {
            const [dvRes, cvRes, cdRes, qlRes] = await Promise.all([
                apiFetch('donvi'),
                apiFetch('chucvu'),
                apiFetch('chuc-danh-nghe-nghiep'),
                apiFetch('nhan-vien')
            ]);

            if (dvRes.ok) {
                const res = await dvRes.json();
                setDonViList(res.Items || (Array.isArray(res) ? res : []));
            }
            if (cvRes.ok) {
                const res = await cvRes.json();
                setChucVuList(res.Items || (Array.isArray(res) ? res : []));
            }
            if (cdRes.ok) {
                const res = await cdRes.json();
                setChucDanhList(res.Items || (Array.isArray(res) ? res : []));
            }
            if (qlRes.ok) {
                const res = await qlRes.json();
                setQuanLyList(res.Items || (Array.isArray(res) ? res : []));
            }
        } catch (error) { console.error("Lỗi tải dữ liệu dropdown:", error); }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('nhan-vien');
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setData(list); setFilteredData(list);
            }
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredData(data.filter(item => (item.HoTen && item.HoTen.toLowerCase().includes(query)) || (item.MaNhanVien && item.MaNhanVien.toLowerCase().includes(query))));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManage) return alert("Bạn không có quyền thực hiện chức năng này!");
        const method = editId ? 'PUT' : 'POST';

        const payload = {
            ...formData,
            IdDonVi: formData.IdDonVi ? parseInt(formData.IdDonVi) : null,
            IdChucVu: formData.IdChucVu ? parseInt(formData.IdChucVu) : null,
            IdChucDanh: formData.IdChucDanh ? parseInt(formData.IdChucDanh) : null,
            IdQuanLyTrucTiep: formData.IdQuanLyTrucTiep ? parseInt(formData.IdQuanLyTrucTiep) : null,
            ScienceUserId: formData.ScienceUserId ? parseInt(formData.ScienceUserId) : null,
            TrangThai: !!formData.TrangThai
        };
        if (editId) payload.IdNhanVien = editId;

        const response = await apiFetch('nhan-vien', {
            method, body: JSON.stringify(payload)
        });

        if (response.ok) { fetchData(); closeModal(); } else alert("Lưu thất bại! Vui lòng kiểm tra lại dữ liệu");
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        setEditId(item.IdNhanVien);
        setFormData({
            ...item,
            ConfirmPassword: item.MatKhau,
            IdDonVi: item.IdDonVi || '',
            IdChucVu: item.IdChucVu || '',
            IdChucDanh: item.IdChucDanh || '',
            IdQuanLyTrucTiep: item.IdQuanLyTrucTiep || '',
            ScienceUserId: item.ScienceUserId || ''
        });
        setIsModalOpen(true);
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

    const closeModal = () => { setIsModalOpen(false); setFormData(initialForm); setEditId(null); };

    return (
        <div className="page-container">
            <div className="page-header"><div className="header-title"><h2>QUẢN LÝ NHÂN VIÊN / GIẢNG VIÊN</h2></div></div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                {canManage && (<button className="btn-add-new" onClick={() => setIsModalOpen(true)} style={{ margin: 0 }}><i className="fa-solid fa-plus"></i> Thêm mới</button>)}
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
                isLoading={isLoading}
                canManage={canManage}
            />

            <UserForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                donViList={donViList}
                chucVuList={chucVuList}
                chucDanhList={chucDanhList}
                quanLyList={quanLyList}
                currentUser={currentUser}
            />
        </div>
    );
};

export default QL_NhanVien;