import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import QLNhomTieuChiListing from '../../components/CriteriaManagement/QL_NhomTieuChi/QL_NhomTieuChiListing';
import QLNhomTieuChiForm from '../../components/CriteriaManagement/QL_NhomTieuChi/QL_NhomTieuChiForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_NhomTieuChi = () => {
    const initialForm = {
        TenNhom: '',
        IdNhomCha: '',
        LoaiNhom: 1,
        DiemToiDa: '',
        ThuTuHienThi: 1,
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

    const roleCode = currentUser?.MaChucVu || '';
    const isAdmin = roleCode === 'Admin';
    const isManager = ['HT', 'PHT', 'TK', 'TBM'].includes(roleCode);
    const canManage = isAdmin || isManager;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('nhomtieuchi');
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setData(list);
                setFilteredData(list);
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
            item.TenNhom && item.TenNhom.toLowerCase().includes(query)
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
            IdNhomCha: formData.IdNhomCha ? parseInt(formData.IdNhomCha) : null,
            LoaiNhom: parseInt(formData.LoaiNhom) || 1,
            DiemToiDa: formData.DiemToiDa ? parseFloat(formData.DiemToiDa) : null,
            ThuTuHienThi: parseInt(formData.ThuTuHienThi) || 1,
            TrangThai: !!formData.TrangThai
        };
        if (editId) payload.IdNhom = editId;

        const response = await apiFetch('nhomtieuchi', {
            method,
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
        setEditId(item.IdNhom);
        setFormData({
            ...item,
            IdNhomCha: item.IdNhomCha || '',
            DiemToiDa: item.DiemToiDa || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Nhóm tiêu chí này?',
            accept: async () => {
                const response = await apiFetch(`nhom-tieu-chi?id=${id}`, {
                    method: 'DELETE'
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
                    <h2>QUẢN LÝ NHÓM TIÊU CHÍ</h2>
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
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH NHÓM TIÊU CHÍ</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm tên nhóm tiêu chí"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QLNhomTieuChiListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QLNhomTieuChiForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                nhomChaList={data}
            />
        </div>
    );
};

export default QL_NhomTieuChi;