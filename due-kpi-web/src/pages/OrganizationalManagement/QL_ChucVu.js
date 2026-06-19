import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QLChucVuListing from '../../components/OrganizationalManagement/QL_ChucVu/QL_ChucVuListing';
import QLChucVuForm from '../../components/OrganizationalManagement/QL_ChucVu/QL_ChucVuForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_ChucVu = () => {
    const initialForm = { MaChucVu: '', TenChucVu: '', TyLeDinhMucGiang: null, ty_le_dinh_muc_nckh: null, GhiChuDieuKien: '', TrangThai: true };
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(initialForm);
    const [editId, setEditId] = useState(null);

    const { confirmDeleteDialog } = useConfirmDeleteDialog();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('chucvu');
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setData(list);
                setFilteredData(list);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const filterData = (query, list) => {
        setFilteredData(list.filter(item =>
            (item.TenChucVu && item.TenChucVu.toLowerCase().includes(query)) ||
            (item.MaChucVu && item.MaChucVu.toLowerCase().includes(query))
        ));
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        filterData(query, data);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let updatedList;
        if (editId) {
            // Edit mock update in memory
            updatedList = data.map(item => item.IdChucVu === editId ? { ...formData } : item);
        } else {
            // Add mock create in memory
            const newId = data.length > 0 ? Math.max(...data.map(d => d.IdChucVu || 0), 0) + 1 : 1;
            const newItem = {
                ...formData,
                IdChucVu: newId
            };
            updatedList = [...data, newItem];
        }
        setData(updatedList);
        filterData(searchQuery, updatedList);
        closeModal();
    };

    const handleDelete = (id) => {
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Chức vụ này?',
            accept: () => {
                const updatedList = data.filter(item => item.IdChucVu !== id);
                setData(updatedList);
                filterData(searchQuery, updatedList);
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
                    <h2>QUẢN LÝ CHỨC VỤ</h2>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                <button className="btn-add-new" onClick={() => setIsModalOpen(true)} style={{ margin: 0 }}>
                    <i className="fa-solid fa-plus"></i> Thêm mới
                </button>
            </div>

            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH CHỨC VỤ</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm mã hoặc tên chức vụ"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QLChucVuListing
                data={filteredData}
                onEdit={(item) => {
                    setEditId(item.IdChucVu);
                    setFormData({ ...item });
                    setIsModalOpen(true);
                }}
                onDelete={handleDelete}
                isLoading={isLoading}
            />

            <QLChucVuForm
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

export default QL_ChucVu;
