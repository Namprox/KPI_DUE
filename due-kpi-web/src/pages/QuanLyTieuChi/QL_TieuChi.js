import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import QLTieuChiListing from '../../components/QuanLyTieuChi/QL_TieuChi/QL_TieuChiListing';
import QLTieuChiForm from '../../components/QuanLyTieuChi/QL_TieuChi/QL_TieuChiForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_TieuChi = () => {
    const initialForm = {
        TenTieuChi: '',
        IdNhom: '',
        IdNam: '',
        CapDanhGia: '',
        MoTa: '',
        DiemToiDa: '',
        LoaiThangDiem: 1,
        CongThucTinhDiem: '',
        BatBuocMinhChung: false,
        ThuTuHienThi: 1,
        TrangThai: true
    };

    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [nhomTieuChiList, setNhomTieuChiList] = useState([]);
    const [namDanhGiaList, setNamDanhGiaList] = useState([]);
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
        fetchNhomTieuChi();
        fetchNamDanhGia();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('tieuchidanhgia');
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

    const fetchNhomTieuChi = async () => {
        try {
            const response = await apiFetch('nhomtieuchi');
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setNhomTieuChiList(list);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách nhóm tiêu chí:", error);
        }
    };

    const fetchNamDanhGia = async () => {
        try {
            const response = await apiFetch('namdanhgia');
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setNamDanhGiaList(list);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách năm đánh giá:", error);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredData(data.filter(item =>
            (item.TenTieuChi && item.TenTieuChi.toLowerCase().includes(query)) ||
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
            IdNhom: parseInt(formData.IdNhom) || 0,
            IdNam: formData.IdNam ? parseInt(formData.IdNam) : null,
            CapDanhGia: formData.CapDanhGia ? parseInt(formData.CapDanhGia) : null,
            DiemToiDa: parseFloat(formData.DiemToiDa) || 0,
            LoaiThangDiem: parseInt(formData.LoaiThangDiem) || 1,
            ThuTuHienThi: parseInt(formData.ThuTuHienThi) || 1,
            TrangThai: !!formData.TrangThai,
            BatBuocMinhChung: !!formData.BatBuocMinhChung,
            CongThucTinhDiem: formData.CongThucTinhDiem || '',
            MoTa: formData.MoTa || ''
        };
        if (editId) payload.IdTieuChi = editId;

        const response = await apiFetch('tieuchidanhgia', {
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
        setEditId(item.IdTieuChi);
        setFormData({
            ...item,
            IdNam: item.IdNam || '',
            CapDanhGia: item.CapDanhGia || '',
            CongThucTinhDiem: item.CongThucTinhDiem || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Tiêu chí này?',
            accept: async () => {
                const response = await apiFetch(`tieu-chi?id=${id}`, {
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
                    <h2>QUẢN LÝ TIÊU CHÍ ĐÁNH GIÁ</h2>
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
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH TIÊU CHÍ</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm tên tiêu chí, nhóm"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QLTieuChiListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QLTieuChiForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                nhomTieuChiList={nhomTieuChiList}
                namDanhGiaList={namDanhGiaList}
            />
        </div>
    );
};

export default QL_TieuChi;