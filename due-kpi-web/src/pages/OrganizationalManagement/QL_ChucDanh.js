import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QL_ChucDanhListing from '../../components/OrganizationalManagement/QL_ChucDanh/QL_ChucDanhListing';
import QL_ChucDanhForm from '../../components/OrganizationalManagement/QL_ChucDanh/QL_ChucDanhForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';

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
    const token = localStorage.getItem('accessToken');
    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const roleId = currentUser?.IdChucVu || currentUser?.RoleId || 0;
    const roleName = (currentUser?.RoleName || '').toLowerCase();
    const isAdmin = roleId === 5 || roleId === 4 || roleName.includes('hiệu trưởng');
    const isManager = roleId === 3 || roleId === 2 || roleName.includes('trưởng khoa') || roleName.includes('trưởng bộ môn');
    const canManage = isAdmin || isManager;

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/chuc-danh`, { headers: authHeaders });
            if (response.ok) {
                const result = await response.json();
                setData(result); setFilteredData(result);
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
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/chuc-danh`, {
                method, headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
            });

            if (response.ok) {
                try {
                    const res = await response.json();
                    if (res.status === 'success') { fetchData(); closeModal(); } else alert(res.message);
                } catch (jsonError) { fetchData(); closeModal(); }
            } else alert("Lưu thất bại! Mã lỗi: " + response.status);
        } catch (error) { alert("Không thể kết nối đến máy chủ!"); }
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa', message: 'Bạn có chắc chắn muốn xóa Chức danh này?',
            accept: async () => {
                const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/chuc-danh?id=${id}`, { method: 'DELETE', headers: authHeaders });
                if (res.ok) {
                    const result = await res.json();
                    if (result.status === "success") fetchData(); else alert(result.message);
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

            <QL_ChucDanhListing
                data={filteredData}
                onEdit={(item) => { if (!canManage) return; setEditId(item.IdChucDanh); setFormData(item); setIsModalOpen(true); }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
            />

            <QL_ChucDanhForm
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