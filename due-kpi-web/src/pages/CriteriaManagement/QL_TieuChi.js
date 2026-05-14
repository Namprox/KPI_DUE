import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QL_TieuChiListing from '../../components/CriteriaManagement/QL_TieuChi/QL_TieuChiListing';
import QL_TieuChiForm from '../../components/CriteriaManagement/QL_TieuChi/QL_TieuChiForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';

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
        CoTheDongBoScience: false,
        BangNguonScience: '',
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
        fetchNhomTieuChi();
        fetchNamDanhGia();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/tieu-chi`, {
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

    const fetchNhomTieuChi = async () => {
        try {
            const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/tieu-chi?type=nhom-tieu-chi`, {
                method: 'GET',
                headers: authHeaders
            });
            if (response.ok) {
                const result = await response.json();
                setNhomTieuChiList(result);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách nhóm tiêu chí:", error);
        }
    };

    const fetchNamDanhGia = async () => {
        try {
            const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
            const response = await fetch(`${baseUrl}/nam-danh-gia`, {
                method: 'GET',
                headers: authHeaders
            });
            if (response.ok) {
                const result = await response.json();
                setNamDanhGiaList(result);
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
            IdNhom: parseInt(formData.IdNhom),
            IdNam: formData.IdNam ? parseInt(formData.IdNam) : null,
            CapDanhGia: formData.CapDanhGia ? parseInt(formData.CapDanhGia) : null,
            DiemToiDa: parseFloat(formData.DiemToiDa),
            LoaiThangDiem: parseInt(formData.LoaiThangDiem),
            ThuTuHienThi: parseInt(formData.ThuTuHienThi) || 1,
            TrangThai: !!formData.TrangThai,
            BatBuocMinhChung: !!formData.BatBuocMinhChung,
            CoTheDongBoScience: !!formData.CoTheDongBoScience,
            CongThucTinhDiem: formData.CongThucTinhDiem || '',
            BangNguonScience: formData.BangNguonScience || ''
        };
        if (editId) payload.IdTieuChi = editId;

        const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${baseUrl}/tieu-chi`, {
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
        setEditId(item.IdTieuChi);
        setFormData({
            ...item,
            IdNam: item.IdNam || '',
            CapDanhGia: item.CapDanhGia || '',
            CongThucTinhDiem: item.CongThucTinhDiem || '',
            BangNguonScience: item.BangNguonScience || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Tiêu chí này?',
            accept: async () => {
                const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';
                const response = await fetch(`${baseUrl}/tieu-chi?id=${id}`, {
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

            <QL_TieuChiListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QL_TieuChiForm
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