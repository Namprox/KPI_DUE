import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QL_ThangDiemListing from '../../components/CriteriaManagement/QL_ThangDiem/QL_ThangDiemListing';
import QL_ThangDiemForm from '../../components/CriteriaManagement/QL_ThangDiem/QL_ThangDiemForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_ThangDiem = () => {
    const initialForm = {
        IdTieuChi: '', GiaTriDiem: '', DieuKienDiem: '', ThuTuHienThi: 1
    };

    const [data, setData] = useState([]);
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
        fetchTieuChi();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('thang-diem');
            if (response.ok) {
                const result = await response.json();
                setData(result);
                setFilteredData(result);
            }
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error);
            alert("Không thể tải danh sách thang điểm. Vui lòng thử lại sau");
        } finally {
            setIsLoading(false);
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
            (item.TenTieuChi && item.TenTieuChi.toLowerCase().includes(query)) ||
            (item.DieuKienDiem && item.DieuKienDiem.toLowerCase().includes(query))
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
            IdTieuChi: parseInt(formData.IdTieuChi),
            GiaTriDiem: parseFloat(formData.GiaTriDiem),
            ThuTuHienThi: parseInt(formData.ThuTuHienThi) || 1
        };
        if (editId) payload.IdThangDiem = editId;

        const response = await apiFetch('thang-diem', {
            method,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const resData = await response.json();
            if (resData.status === 'success' || !resData.status) {
                fetchData();
                closeModal();
            } else {
                alert(resData.message || "Lưu thất bại!");
            }
        } else {
            alert("Lỗi kết nối máy chủ!");
        }
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        setEditId(item.IdThangDiem);
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa mức thang điểm này?',
            accept: async () => {
                const res = await apiFetch(`thang-diem?id=${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    const result = await res.json();
                    if (result.status === "success" || !result.status) {
                        fetchData();
                    } else {
                        alert(result.message || "Xóa thất bại!");
                    }
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
                    <h2>CẤU HÌNH THANG ĐIỂM</h2>
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
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH MỨC ĐIỂM</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm theo tên tiêu chí, điều kiện"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QL_ThangDiemListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QL_ThangDiemForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                tieuChiList={tieuChiList}
            />
        </div>
    );
};

export default QL_ThangDiem;