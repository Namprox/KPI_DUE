import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import DonViListing from '../../components/OrganizationalManagement/QL_DonVi/QL_DonViListing';
import DonViForm from '../../components/OrganizationalManagement/QL_DonVi/QL_DonViForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_DonVi = () => {
    const initialForm = {
        MaDonVi: '',
        TenDonVi: '',
        IdDonViCha: '',
        CapDonVi: 1,
        ScienceDeptId: '',
        TrangThai: true
    };

    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState(initialForm);
    const [editId, setEditId] = useState(null);

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
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('donvi');
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
        setFilteredData(data.filter(item =>
            (item.TenDonVi && item.TenDonVi.toLowerCase().includes(query)) ||
            (item.MaDonVi && item.MaDonVi.toLowerCase().includes(query))
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManage) return alert("Bạn không có quyền thực hiện chức năng này!");

        const method = editId ? 'PUT' : 'POST';

        const payload = {
            ...formData,
            IdDonViCha: formData.IdDonViCha ? parseInt(formData.IdDonViCha) : null,
            CapDonVi: parseInt(formData.CapDonVi) || 1,
            ScienceDeptId: formData.ScienceDeptId ? parseInt(formData.ScienceDeptId) : null,
            TrangThai: !!formData.TrangThai
        };
        if (editId) payload.IdDonVi = editId;

        const response = await apiFetch('donvi', {
            method,
            body: JSON.stringify(payload)
        });

        if (response.ok) { fetchData(); closeModal(); }
        else { alert("Lưu thất bại! Vui lòng kiểm tra lại dữ liệu"); }
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        setEditId(item.IdDonVi);
        setFormData({
            ...item,
            IdDonViCha: item.IdDonViCha || '',
            ScienceDeptId: item.ScienceDeptId || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa đơn vị này? Nếu đơn vị này đang chứa nhân viên, quá trình xóa sẽ bị chặn lại để đảm bảo an toàn dữ liệu.',
            accept: async () => {
                const res = await apiFetch(`don-vi?id=${id}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    const result = await res.json();
                    if (result.status === "success") {
                        fetchData();
                    } else {
                        alert(result.message);
                    }
                }
            }
        });
    };

    const closeModal = () => { setIsModalOpen(false); setFormData(initialForm); setEditId(null); };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-title">
                    <h2>QUẢN LÝ ĐƠN VỊ</h2>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                {canManage && (
                    <button className="btn-add-new" onClick={() => setIsModalOpen(true)} style={{ margin: 0 }}>
                        <i className="fa-solid fa-plus"></i> Thêm mới
                    </button>
                )}
            </div>

            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH ĐƠN VỊ</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm mã hoặc tên đơn vị"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <DonViListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <DonViForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                donViList={data}
            />
        </div>
    );
};

export default QL_DonVi;