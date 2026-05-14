import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QL_NhomNhiemVuListing from '../../components/CriteriaManagement/QL_NhomNhiemVu/QL_NhomNhiemVuListing';
import QL_NhomNhiemVuForm from '../../components/CriteriaManagement/QL_NhomNhiemVu/QL_NhomNhiemVuForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';

const QL_NhomNhiemVu = () => {
    const initialForm = {
        MaNhom: '',
        TenNhom: '',
        ThuTu: 1,
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

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const token = localStorage.getItem('accessToken');

    const roleId = currentUser?.IdChucVu || currentUser?.RoleId || 0;
    const roleName = (currentUser?.RoleName || '').toLowerCase();
    const isAdmin = roleId === 5 || roleId === 4 || roleName.includes('hiệu trưởng');
    const isManager = roleId === 3 || roleId === 2 || roleName.includes('trưởng khoa') || roleName.includes('trưởng bộ môn');
    const canManage = isAdmin || isManager;

    const authHeaders = {
        'Authorization': `Bearer ${token}`
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/nhom-nhiem-vu`, {
                method: 'GET',
                headers: authHeaders
            });
            if (response.ok) {
                const result = await response.json();
                setData(result);
                setFilteredData(result);
            }
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredData(data.filter(item =>
            (item.TenNhom && item.TenNhom.toLowerCase().includes(query)) ||
            (item.MaNhom && item.MaNhom.toLowerCase().includes(query))
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!canManage) {
            alert("Bạn không có quyền thực hiện chức năng này!");
            return;
        }

        const method = editId ? 'PUT' : 'POST';

        const payload = {
            ...formData,
            ThuTu: parseInt(formData.ThuTu) || 1,
            TrangThai: !!formData.TrangThai
        };
        if (editId) payload.IdNhomNv = editId;

        const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${baseUrl}/nhom-nhiem-vu`, {
            method,
            headers: {
                ...authHeaders,
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            fetchData();
            closeModal();
        } else {
            alert("Lưu thất bại! Vui lòng kiểm tra lại dữ liệu");
        }
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        setEditId(item.IdNhomNv);
        setFormData({
            ...item
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Nhóm nhiệm vụ này?',
            accept: async () => {
                const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
                const response = await fetch(`${baseUrl}/nhom-nhiem-vu?id=${id}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.status === "success" || !result.status) {
                        fetchData();
                    } else {
                        alert(result.message || "Xóa thất bại!");
                    }
                } else {
                    alert("Xóa thất bại!");
                }
            }
        });
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData(initialForm);
        setEditId(null);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-title">
                    <h2>QUẢN LÝ NHÓM NHIỆM VỤ</h2>
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
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH NHÓM NHIỆM VỤ</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm mã hoặc tên nhiệm vụ"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QL_NhomNhiemVuListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QL_NhomNhiemVuForm
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

export default QL_NhomNhiemVu;