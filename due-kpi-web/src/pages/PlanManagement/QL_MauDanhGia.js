import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QLMauDanhGiaListing from '../../components/PlanManagement/QL_MauDanhGia/QL_MauDanhGiaListing';
import QLMauDanhGiaForm from '../../components/PlanManagement/QL_MauDanhGia/QL_MauDanhGiaForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_MauDanhGia = () => {
    const initialForm = {
        TenMau: '', IdNam: '', MoTa: '', TrangThai: true, DanhSachIdTieuChi: []
    };

    const [data, setData] = useState([]);
    const [namList, setNamList] = useState([]);
    const [tieuChiList, setTieuChiList] = useState([]);
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
        fetchNamDanhGia();
        fetchTieuChi();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('mau-danh-gia');
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

    const fetchNamDanhGia = async () => {
        try {
            const response = await apiFetch('nam-danh-gia');
            if (response.ok) setNamList(await response.json());
        } catch (error) {
            console.error("Lỗi tải danh sách năm:", error);
        }
    };

    const fetchTieuChi = async () => {
        try {
            const response = await apiFetch('tieu-chi');
            if (response.ok) setTieuChiList(await response.json());
        } catch (error) {
            console.error("Lỗi tải danh sách tiêu chí:", error);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredData(data.filter(item =>
            (item.TenMau && item.TenMau.toLowerCase().includes(query)) ||
            (item.IdNam && item.IdNam.toString().includes(query))
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
            IdNam: parseInt(formData.IdNam),
            TrangThai: !!formData.TrangThai
        };
        if (editId) payload.IdMau = editId;

        const response = await apiFetch('mau-danh-gia', {
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
        setEditId(item.IdMau);
        setFormData({
            ...item,
            DanhSachIdTieuChi: item.DanhSachIdTieuChi || []
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Mẫu phiếu này? Tất cả các tiêu chí đã gán bên trong cũng sẽ bị hủy liên kết',
            accept: async () => {
                const res = await apiFetch(`mau-danh-gia?id=${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    const result = await res.json();
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
                    <h2>QUẢN LÝ MẪU ĐÁNH GIÁ</h2>
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
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH MẪU PHIẾU</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm tên mẫu, năm áp dụng"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QLMauDanhGiaListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QLMauDanhGiaForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                namList={namList}
                tieuChiList={tieuChiList}
            />
        </div>
    );
};

export default QL_MauDanhGia;