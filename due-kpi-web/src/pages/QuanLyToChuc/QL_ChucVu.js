import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QLChucVuListing from '../../components/QuanLyToChuc/QL_ChucVu/QL_ChucVuListing';
import QLChucVuForm from '../../components/QuanLyToChuc/QL_ChucVu/QL_ChucVuForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canManageChucVuNam } from '../../utils/roles';
import { requestDanhMuc, GIAM_TRU_CHUC_VU_PATH } from '../../utils/chucVuGiamTruApi';

const QL_ChucVu = () => {
    const initialForm = { MaChucVu: '', TenChucVu: '', TrangThai: true };
    const { user } = useAuth();
    const canManage = canManageChucVuNam(user);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);
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
            const result = await requestDanhMuc('chucvu');
            const list = result.Items || (Array.isArray(result) ? result : []);
            setData(list);
            setFilteredData(list);
        } catch (error) {
            setError(error.message);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManage || saving) return;
        setSaving(true);
        setError('');
        try {
            const { MaChucVu, TenChucVu, TrangThai } = formData;
            await requestDanhMuc(editId ? `chucvu/${editId}` : 'chucvu', {
                method: editId ? 'PUT' : 'POST', body: JSON.stringify({ MaChucVu, TenChucVu, TrangThai }),
            });
            setNotice(editId ? 'Đã cập nhật chức vụ.' : 'Đã tạo chức vụ. Hãy cấu hình giảm trừ theo năm cho chức vụ mới.');
            closeModal();
            await fetchData();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = (id) => {
        if (!canManage || saving) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Chức vụ này?',
            accept: async () => {
                setSaving(true);
                setError('');
                try {
                    await requestDanhMuc(`chucvu/${id}`, { method: 'DELETE' });
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
                    <h2>QUẢN LÝ CHỨC VỤ</h2>
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                {canManage && <button className="btn-add-new" disabled={saving} onClick={() => { setError(''); setIsModalOpen(true); }} style={{ margin: 0 }}>
                    <i className="fa-solid fa-plus"></i> Thêm mới
                </button>}
                <Link className="btn-cancel" to={GIAM_TRU_CHUC_VU_PATH}>Giảm trừ theo năm</Link>
            </div>
            {!isModalOpen && error && <p role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}

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
                    if (!canManage || saving) return;
                    setEditId(item.IdChucVu);
                    setFormData({ MaChucVu: item.MaChucVu, TenChucVu: item.TenChucVu, TrangThai: item.TrangThai });
                    setError('');
                    setIsModalOpen(true);
                }}
                onDelete={handleDelete}
                isLoading={isLoading}
                canManage={canManage && !saving}
            />

            <QLChucVuForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                saving={saving}
                error={error}
            />
        </div>
    );
};

export default QL_ChucVu;
