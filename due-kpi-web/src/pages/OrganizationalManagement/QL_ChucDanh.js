import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QLChucDanhListing from '../../components/OrganizationalManagement/QL_ChucDanh/QL_ChucDanhListing';
import QLChucDanhForm from '../../components/OrganizationalManagement/QL_ChucDanh/QL_ChucDanhForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_ChucDanh = () => {
    const initialForm = { MaChucDanh: '', TenChucDanh: '', MoTa: '', TrangThai: true };
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(initialForm);
    const [editId, setEditId] = useState(null);

    const { confirmDeleteDialog } = useConfirmDeleteDialog();
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const roleId = currentUser?.IdChucVu || currentUser?.RoleId || 0;
    const roleName = (currentUser?.RoleName || '').toLowerCase();
    const isAdmin = roleId === 5 || roleId === 4 || roleName.includes('hiệu trưởng');
    const isManager = roleId === 3 || roleId === 2 || roleName.includes('trưởng khoa') || roleName.includes('trưởng bộ môn');
    const canManage = isAdmin || isManager;

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('chuc-danh-nghe-nghiep');
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
        setFilteredData(data.filter(item => item.TenChucDanh.toLowerCase().includes(query) || item.MaChucDanh.toLowerCase().includes(query)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManage) return alert("Bạn không có quyền thực hiện chức năng này!");
        const method = editId ? 'PUT' : 'POST';

        try {
            const response = await apiFetch('chuc-danh-nghe-nghiep', {
                method, body: JSON.stringify(formData)
            });

            if (response.ok) {
                try {
                    const res = await response.json();
                    if (res.status === 'success' || res.Success === true) { fetchData(); closeModal(); } else alert(res.message || res.Message);
                } catch (jsonError) { fetchData(); closeModal(); }
            } else alert("Lưu thất bại! Mã lỗi: " + response.status);
        } catch (error) { alert("Không thể kết nối đến máy chủ!"); }
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa', message: 'Bạn có chắc chắn muốn xóa Chức danh này?',
            accept: async () => {
                const res = await apiFetch(`chuc-danh-nghe-nghiep?id=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    const result = await res.json();
                    if (result.status === "success" || result.Success === true) fetchData(); else alert(result.message || result.Message);
                }
            }
        });
    };

    const closeModal = () => { setIsModalOpen(false); setFormData(initialForm); setEditId(null); };

    return (
        <div className="page-container">
            <div className="page-header"><div className="header-title"><h2>QUẢN LÝ CHỨC DANH NGHỀ NGHIỆP</h2></div></div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                {canManage && (<button className="btn-add-new" onClick={() => setIsModalOpen(true)} style={{ margin: 0 }}><i className="fa-solid fa-plus"></i> Thêm mới</button>)}
            </div>

            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH CHỨC DANH</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input type="text" placeholder="Tìm mã hoặc tên chức danh" className="form-input" style={{ width: '100%', paddingLeft: '35px' }} value={searchQuery} onChange={handleSearch} />
                    </div>
                </div>
            </div>

            <QLChucDanhListing
                data={filteredData}
                onEdit={(item) => { if (!canManage) return; setEditId(item.IdChucDanh); setFormData(item); setIsModalOpen(true); }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
            />

            <QLChucDanhForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
            />
        </div>
    );
};

export default QL_ChucDanh;