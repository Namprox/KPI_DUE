import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import QLNhomNhiemVuListing from '../../components/QuanLyTieuChi/QL_NhomNhiemVu/QL_NhomNhiemVuListing';
import QLNhomNhiemVuForm from '../../components/QuanLyTieuChi/QL_NhomNhiemVu/QL_NhomNhiemVuForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_NhomNhiemVu = () => {
    const initialForm = {
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
            const response = await apiFetch('nhomnhiemvu');
            if (response.ok) {
                const result = await response.json();
                if (Array.isArray(result)) {
                    setData(result);
                    setFilteredData(result);
                } else {
                    setData([]); setFilteredData([]);
                }
            } else {
                setData([]); setFilteredData([]);
            }
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
            setData([]); setFilteredData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredData(data.filter(item =>
            (item.TenNhom && item.TenNhom.toLowerCase().includes(query))
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

        const response = await apiFetch('nhomnhiemvu', {
            method,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const res = await response.json();
            if (res.status === 'success') {
                fetchData();
                closeModal();
            } else {
                alert("Lưu thất bại! " + (res.message || ""));
            }
        } else {
            alert("Lưu thất bại! Vui lòng kiểm tra lại dữ liệu");
        }
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        setEditId(item.IdNhomNv);
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Nhóm nhiệm vụ này?',
            accept: async () => {
                const response = await apiFetch(`nhom-nhiem-vu?id=${id}`, {
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
                            placeholder="Tìm tên nhiệm vụ"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QLNhomNhiemVuListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QLNhomNhiemVuForm
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