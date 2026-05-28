import React, { useState, useEffect } from 'react';
import '../../css/Pages.css';
import QL_DinhMucListing from '../../components/PlanManagement/QL_DinhMuc/QL_DinhMucListing';
import QL_DinhMucForm from '../../components/PlanManagement/QL_DinhMuc/QL_DinhMucForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_DinhMucGiangVien = () => {
    const initialForm = { IdNhomGv: '', IdNam: '', GioGiangLyThuyet: '', GioNckh: '', MoTa: '' };
    const [data, setData] = useState([]);
    const [namList, setNamList] = useState([]);
    const [nhomList, setNhomList] = useState([]);
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
        fetchNamList();
        fetchNhomList();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('dinh-muc-gv');
            if (response.ok) {
                const result = await response.json();
                setData(result);
                setFilteredData(result);
            }
        } catch (error) { console.error(error); }
        finally { setIsLoading(false); }
    };

    const fetchNamList = async () => {
        try {
            const response = await apiFetch('nam-danh-gia');
            if (response.ok) setNamList(await response.json());
        } catch (error) { console.error(error); }
    };

    const fetchNhomList = async () => {
        try {
            const response = await apiFetch('nhom-giang-vien');
            if (response.ok) setNhomList(await response.json());
        } catch (error) { console.error(error); }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        setFilteredData(data.filter(item =>
            (item.TenNhomGv && item.TenNhomGv.toLowerCase().includes(query)) ||
            (item.IdNam && item.IdNam.toString().includes(query))
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManage) return;
        const method = editId ? 'PUT' : 'POST';
        try {
            const response = await apiFetch('dinh-muc-gv', {
                method, body: JSON.stringify(formData)
            });
            if (response.ok) { fetchData(); closeModal(); } else alert("Lưu thất bại!");
        } catch (error) { console.error(error); alert("Lỗi kết nối!"); }
    };

    const handleDelete = (id) => {
        confirmDeleteDialog({
            header: 'Xác nhận xóa', message: 'Bạn có chắc chắn muốn xóa định mức này?',
            accept: async () => {
                const res = await apiFetch(`dinh-muc-gv?id=${id}`, { method: 'DELETE' });
                if (res.ok) {
                    const result = await res.json();
                    if (result.status === "success") fetchData(); else alert(result.message);
                }
            }
        });
    };

    const closeModal = () => { setIsModalOpen(false); setFormData(initialForm); setEditId(null); };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-title">
                    <h2>ĐỊNH MỨC GIỜ CHUẨN</h2>
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
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH ĐỊNH MỨC</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm theo năm hoặc nhóm"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QL_DinhMucListing
                data={filteredData}
                onEdit={(item) => {
                    if (!canManage) return;
                    setEditId(item.IdDinhMuc);
                    setFormData(item);
                    setIsModalOpen(true);
                }}
                onDelete={canManage ? handleDelete : () => { }}
                isLoading={isLoading}
            />

            <QL_DinhMucForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                namList={namList}
                nhomList={nhomList}
            />
        </div>
    );
};

export default QL_DinhMucGiangVien;