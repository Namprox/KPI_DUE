import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QL_NamDanhGiaListing from '../../components/PlanManagement/QL_NamDanhGia/QL_NamDanhGiaListing';
import QL_NamDanhGiaForm from '../../components/PlanManagement/QL_NamDanhGia/QL_NamDanhGiaForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_NamDanhGia = () => {
    const currentYear = new Date().getFullYear();
    const initialForm = {
        IdNam: currentYear,
        NgayBatDau: '',
        NgayKetThuc: '',
        NgayMoTuDanhGia: '',
        NgayDongTuDanhGia: '',
        NgayMoDanhGiaCapTren: '',
        NgayDongDanhGiaCapTren: '',
        TrangThai: 1,
        GhiChu: ''
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

    const roleId = currentUser?.IdChucVu || currentUser?.RoleId || 0;
    const roleName = (currentUser?.RoleName || '').toLowerCase();
    const isAdmin = roleId === 5 || roleId === 4 || roleName.includes('hiệu trưởng');
    const isManager = roleId === 3 || roleId === 2 || roleName.includes('trưởng khoa') || roleName.includes('trưởng bộ môn');
    const canManage = isAdmin || isManager;

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (formData.NgayMoTuDanhGia && formData.NgayDongDanhGiaCapTren) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const startDate = new Date(formData.NgayMoTuDanhGia);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(formData.NgayDongDanhGiaCapTren);
            endDate.setHours(23, 59, 59, 999);

            let autoStatus = 1;

            if (today < startDate) {
                autoStatus = 1;
            } else if (today >= startDate && today <= endDate) {
                autoStatus = 2;
            } else if (today > endDate) {
                autoStatus = 3;
            }

            if (formData.TrangThai !== autoStatus) {
                setFormData(prev => ({ ...prev, TrangThai: autoStatus }));
            }
        }
    }, [formData.NgayMoTuDanhGia, formData.NgayDongDanhGiaCapTren]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('nam-danh-gia');
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
            item.IdNam.toString().includes(query) ||
            (item.GhiChu && item.GhiChu.toLowerCase().includes(query))
        ));
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';

        let date;
        if (typeof dateString === 'string' && dateString.includes('/Date(')) {
            const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
            date = new Date(timestamp);
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) return '';

        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().split('T')[0];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!canManage) {
            alert("Bạn không có quyền thực hiện chức năng này!");
            return;
        }

        const dBatDau = new Date(formData.NgayBatDau);
        const dKetThuc = new Date(formData.NgayKetThuc);
        const dMoGV = new Date(formData.NgayMoTuDanhGia);
        const dDongGV = new Date(formData.NgayDongTuDanhGia);
        const dMoGD = new Date(formData.NgayMoDanhGiaCapTren);
        const dDongGD = new Date(formData.NgayDongDanhGiaCapTren);

        if (dBatDau > dKetThuc) {
            alert("Lỗi logic: Ngày kết thúc NĂM HỌC không thể nằm trước Ngày bắt đầu!");
            return;
        }
        if (dMoGV > dDongGV) {
            alert("Lỗi logic: Hạn chót GIẢNG VIÊN ĐÁNH GIÁ không thể nằm trước Ngày bắt đầu mở hệ thống!");
            return;
        }
        if (dMoGD > dDongGD) {
            alert("Lỗi logic: Ngày đóng LỊCH DUYỆT ĐIỂM không thể nằm trước Ngày mở!");
            return;
        }
        if (dDongGD < dMoGV) {
            alert("Lỗi xung đột: Lịch duyệt điểm của Cấp trên không thể kết thúc trước khi Giảng viên được phép tự đánh giá!");
            return;
        }

        const method = editId ? 'PUT' : 'POST';
        const payload = {
            ...formData,
            IdNam: parseInt(formData.IdNam),
            TrangThai: parseInt(formData.TrangThai)
        };

        const response = await apiFetch('nam-danh-gia', {
            method,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            if (result.status === 'success' || result.status === undefined) {
                fetchData();
                closeModal();
            } else {
                alert(result.message || "Lưu thất bại!");
            }
        } else {
            alert("Lỗi kết nối máy chủ!");
        }
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        setEditId(item.IdNam);
        setFormData({
            ...item,
            NgayBatDau: formatDateForInput(item.NgayBatDau),
            NgayKetThuc: formatDateForInput(item.NgayKetThuc),
            NgayMoTuDanhGia: formatDateForInput(item.NgayMoTuDanhGia),
            NgayDongTuDanhGia: formatDateForInput(item.NgayDongTuDanhGia),
            NgayMoDanhGiaCapTren: formatDateForInput(item.NgayMoDanhGiaCapTren),
            NgayDongDanhGiaCapTren: formatDateForInput(item.NgayDongDanhGiaCapTren)
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa Năm đánh giá ${id}?`,
            accept: async () => {
                const res = await apiFetch(`nam-danh-gia?id=${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    const result = await res.json();
                    if (result.status === "success" || result.status === undefined) {
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
                    <h2>QUẢN LÝ NĂM ĐÁNH GIÁ</h2>
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
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH CÁC NĂM</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm theo năm"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QL_NamDanhGiaListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QL_NamDanhGiaForm
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

export default QL_NamDanhGia;