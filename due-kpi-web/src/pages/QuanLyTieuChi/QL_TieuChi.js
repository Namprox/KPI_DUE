import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import QLTieuChiListing from '../../components/QuanLyTieuChi/QL_TieuChi/QL_TieuChiListing';
import QLTieuChiForm from '../../components/QuanLyTieuChi/QL_TieuChi/QL_TieuChiForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';
import { Toast } from 'primereact/toast';
import ObjectTabs, { OBJECT_TYPES } from '../../components/Common/ObjectTabs';

const QL_TieuChi = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentType = searchParams.get('type') || '1';

    const initialForm = {
        TenTieuChi: '',
        IdNhom: '',
        MoTa: '',
        DiemToiDa: '',
        LoaiThangDiem: 1,
        CongThucTinhDiem: '',
        BatBuocMinhChung: false,
        ThuTuHienThi: 1,
        TrangThai: true,
        ThangDiemList: [],
        DeletedThangDiemIds: []
    };

    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [nhomTieuChiList, setNhomTieuChiList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState(initialForm);
    const [editId, setEditId] = useState(null);

    const { confirmDeleteDialog } = useConfirmDeleteDialog();
    const toast = useRef(null);

    const { user } = useAuth();
    const currentUser = user || {};

    const roleCode = currentUser?.MaChucVu || '';
    const isAdmin = roleCode === 'Admin';
    const isManager = ['HT', 'PHT', 'TK', 'TBM'].includes(roleCode);
    const canManage = isAdmin || isManager;

    useEffect(() => {
        const isTypeEnabled = OBJECT_TYPES.some(t => t.key === currentType && t.enabled);
        if (!isTypeEnabled) {
            setSearchParams({ type: '1' }, { replace: true });
        } else {
            fetchData();
            fetchNhomTieuChi();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentType, setSearchParams]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch(`tieuchidanhgia?loaiDoiTuong=${currentType}`);
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
            const response = await apiFetch(`nhomtieuchi?loaiDoiTuong=${currentType}`);
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setNhomTieuChiList(list);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách nhóm tiêu chí:", error);
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
            toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Bạn không có quyền thực hiện chức năng này!', life: 4000 });
            return;
        }

        const method = editId ? 'PUT' : 'POST';

        const payload = {
            ...formData,
            IdNhom: parseInt(formData.IdNhom) || 0,
            IdNam: null,
            DiemToiDa: parseFloat(formData.DiemToiDa) || 0,
            LoaiThangDiem: parseInt(formData.LoaiThangDiem) || 1,
            ThuTuHienThi: parseInt(formData.ThuTuHienThi) || 1,
            TrangThai: !!formData.TrangThai,
            BatBuocMinhChung: !!formData.BatBuocMinhChung,
            CongThucTinhDiem: formData.CongThucTinhDiem || '',
            MoTa: formData.MoTa || '',
            LoaiDoiTuong: parseInt(currentType),
            loaiDoiTuong: parseInt(currentType)
        };
        if (editId) payload.IdTieuChi = editId;

        const endpoint = editId 
            ? `tieuchidanhgia/${editId}?loaiDoiTuong=${currentType}` 
            : `tieuchidanhgia?loaiDoiTuong=${currentType}`;

        const response = await apiFetch(endpoint, {
            method,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            const createdId = editId || result.Item?.IdTieuChi || result.IdTieuChi;

            if (createdId) {
                if (parseInt(payload.LoaiThangDiem) === 1) {
                    // 1. Delete removed items
                    if (formData.DeletedThangDiemIds && formData.DeletedThangDiemIds.length > 0) {
                        try {
                            await Promise.all(
                                formData.DeletedThangDiemIds.map(id =>
                                    apiFetch(`thangdiem/${id}`, { method: 'DELETE' })
                                )
                            );
                        } catch (err) {
                            console.error("Lỗi khi xóa thang điểm:", err);
                        }
                    }

                    // 2. Save / Update items
                    if (formData.ThangDiemList && formData.ThangDiemList.length > 0) {
                        try {
                            await Promise.all(
                                formData.ThangDiemList.map(item => {
                                    const subPayload = {
                                        IdTieuChi: createdId,
                                        GiaTriDiem: parseFloat(item.GiaTriDiem) || 0,
                                        DieuKienDiem: item.DieuKienDiem || '',
                                        ThuTuHienThi: parseInt(item.ThuTuHienThi) || 1
                                    };

                                    if (item.IdThangDiem) {
                                        subPayload.IdThangDiem = item.IdThangDiem;
                                        return apiFetch(`thangdiem/${item.IdThangDiem}`, {
                                            method: 'PUT',
                                            body: JSON.stringify(subPayload)
                                        });
                                    } else {
                                        return apiFetch('thangdiem', {
                                            method: 'POST',
                                            body: JSON.stringify(subPayload)
                                        });
                                    }
                                })
                            );
                        } catch (err) {
                            console.error("Lỗi khi lưu thang điểm:", err);
                        }
                    }
                } else {
                    // If changed away from discrete scale type, delete any existing scale options
                    const originalList = formData.ThangDiemList || [];
                    const idsToDelete = originalList
                        .map(item => item.IdThangDiem)
                        .filter(id => id != null);

                    if (idsToDelete.length > 0) {
                        try {
                            await Promise.all(
                                idsToDelete.map(id =>
                                    apiFetch(`thangdiem/${id}`, { method: 'DELETE' })
                                )
                            );
                        } catch (err) {
                            console.error("Lỗi khi dọn dẹp thang điểm cũ:", err);
                        }
                    }
                }
            }

            toast.current.show({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu tiêu chí đánh giá thành công!', life: 3000 });
            fetchData();
            closeModal();
        } else {
            toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Lưu thất bại! Vui lòng kiểm tra lại dữ liệu', life: 4000 });
        }
    };

    const handleEdit = async (item) => {
        if (!canManage) return;
        setEditId(item.IdTieuChi);
        
        // Open modal with current item data first
        setFormData({
            ...item,
            CongThucTinhDiem: item.CongThucTinhDiem || '',
            ThangDiemList: [],
            DeletedThangDiemIds: []
        });
        setIsModalOpen(true);

        if (Number(item.LoaiThangDiem) === 1) {
            try {
                const response = await apiFetch(`thangdiem?tieuChiId=${item.IdTieuChi}`);
                if (response.ok) {
                    const result = await response.json();
                    let thangDiemList = result.Items || (Array.isArray(result) ? result : []);
                    thangDiemList = thangDiemList.filter(td => td.IdTieuChi === item.IdTieuChi);
                    thangDiemList.sort((a, b) => (a.ThuTuHienThi || 0) - (b.ThuTuHienThi || 0));
                    
                    setFormData(prev => ({
                        ...prev,
                        ThangDiemList: thangDiemList
                    }));
                }
            } catch (error) {
                console.error("Lỗi tải danh sách thang điểm:", error);
            }
        }
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Tiêu chí này?',
            accept: async () => {
                const response = await apiFetch(`tieuchidanhgia/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.status === "success" || !result.status) {
                        fetchData();
                        toast.current.show({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa tiêu chí đánh giá thành công!', life: 3000 });
                    } else {
                        toast.current.show({ severity: 'error', summary: 'Lỗi', detail: result.message || "Xóa thất bại!", life: 4000 });
                    }
                } else {
                    toast.current.show({ severity: 'error', summary: 'Lỗi', detail: "Xóa thất bại!", life: 4000 });
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
            <Toast ref={toast} position="top-right" />
            <div className="page-header">
                <div className="header-title">
                    <h2>QUẢN LÝ TIÊU CHÍ ĐÁNH GIÁ</h2>
                </div>
            </div>

            <ObjectTabs currentType={currentType} onChange={(key) => setSearchParams({ type: key })} />

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
            />
        </div>
    );
};

export default QL_TieuChi;