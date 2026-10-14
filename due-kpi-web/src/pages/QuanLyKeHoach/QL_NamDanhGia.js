import { canManageNamDanhGia } from "../../utils/roles";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import QLNamDanhGiaListing from '../../components/QuanLyKeHoach/QL_NamDanhGia/QL_NamDanhGiaListing';
import QLNamDanhGiaForm from '../../components/QuanLyKeHoach/QL_NamDanhGia/QL_NamDanhGiaForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { requestDanhMuc, GIAM_TRU_CHUC_VU_PATH } from '../../utils/chucVuGiamTruApi';
import { Link } from 'react-router-dom';

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
    const [error, setError] = useState('');
    const [conflictYear, setConflictYear] = useState(null);
    const [saving, setSaving] = useState(false);

    const { confirmDeleteDialog } = useConfirmDeleteDialog();

    const { user } = useAuth();
    const currentUser = user || {};

    const canManage = canManageNamDanhGia(currentUser);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await requestDanhMuc('namdanhgia');
            const list = result.Items || (Array.isArray(result) ? result : []);
            setData(list);
            setFilteredData(list);
        } catch (error) {
            setError(error.message);
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

        if (saving) return;
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
        const endpoint = editId ? `namdanhgia/${editId}` : 'namdanhgia';
        const payload = {
            ...formData,
            IdNam: parseInt(formData.IdNam),
            TrangThai: parseInt(formData.TrangThai)
        };

        setError('');
        setConflictYear(null);
        setSaving(true);
        try {
            await requestDanhMuc(endpoint, { method, body: JSON.stringify(payload) });
            closeModal();
            await fetchData();
        } catch (err) {
            setError(err.message);
            if (err.status === 409 && payload.TrangThai === 3) setConflictYear(payload.IdNam);
        } finally { setSaving(false); }
    };

    const handleEdit = (item) => {
        if (!canManage || saving) return;
        setError('');
        setConflictYear(null);
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
        if (!canManage || saving) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa Năm đánh giá ${id}?`,
            accept: async () => {
                setSaving(true);
                setError('');
                try {
                    await requestDanhMuc(`namdanhgia/${id}`, { method: 'DELETE' });
                    await fetchData();
                } catch (err) { setError(err.message); }
                finally { setSaving(false); }
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
                    <button className="btn-add-new" disabled={saving} onClick={() => { setError(''); setConflictYear(null); setIsModalOpen(true); }} style={{ margin: 0 }}>
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

            {!isModalOpen && error && <p role="alert">{error}</p>}
            <QLNamDanhGiaListing
                data={filteredData}
                onEdit={canManage ? handleEdit : () => { }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
                canManage={canManage && !saving}
            />

            <QLNamDanhGiaForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                saving={saving}
                error={error}
                conflictLink={conflictYear != null ? <Link to={`${GIAM_TRU_CHUC_VU_PATH}?idNam=${conflictYear}`}>Cấu hình giảm trừ năm {conflictYear}</Link> : null}
            />
        </div>
    );
};

export default QL_NamDanhGia;
