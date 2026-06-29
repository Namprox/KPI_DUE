import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import QLMauDanhGiaListing from '../../components/QuanLyKeHoach/QL_MauDanhGia/QL_MauDanhGiaListing';
import QLMauDanhGiaForm from '../../components/QuanLyKeHoach/QL_MauDanhGia/QL_MauDanhGiaForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';
import { Toast } from 'primereact/toast';
import ObjectTabs, { OBJECT_TYPES } from '../../components/Common/ObjectTabs';

const QL_MauDanhGia = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentType = searchParams.get('type') || '1';

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
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const editIdRef = useRef(null);

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
            fetchNamDanhGia();
            fetchTieuChi();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentType, setSearchParams]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch(`maudanhgia?loaiDoiTuong=${currentType}`);
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

    const fetchNamDanhGia = async () => {
        try {
            const response = await apiFetch('namdanhgia');
            if (response.ok) {
                const res = await response.json();
                setNamList(res.Items || (Array.isArray(res) ? res : []));
            }
        } catch (error) {
            console.error("Lỗi tải danh sách năm:", error);
        }
    };

    const fetchTieuChi = async () => {
        try {
            const response = await apiFetch(`tieuchidanhgia?loaiDoiTuong=${currentType}`);
            if (response.ok) {
                const res = await response.json();
                setTieuChiList(res.Items || (Array.isArray(res) ? res : []));
            }
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
            toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Bạn không có quyền thực hiện chức năng này!', life: 4000 });
            return;
        }

        const method = editId ? 'PUT' : 'POST';
        const payload = {
            TenMau: formData.TenMau,
            IdNam: parseInt(formData.IdNam),
            MoTa: formData.MoTa || '',
            TrangThai: !!formData.TrangThai,
            LoaiDoiTuong: parseInt(currentType),
            loaiDoiTuong: parseInt(currentType)
        };
        if (editId) payload.IdMau = editId;

        const endpoint = editId 
            ? `maudanhgia/${editId}?loaiDoiTuong=${currentType}` 
            : `maudanhgia?loaiDoiTuong=${currentType}`;

        const response = await apiFetch(endpoint, {
            method,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            const createdId = editId || result.Item?.IdMau || result.IdMau;
            let bulkSuccess = true;

            if (createdId && formData.DanhSachIdTieuChi && formData.DanhSachIdTieuChi.length > 0) {
                const bulkResponse = await apiFetch('chitietmaudanhgia/bulk', {
                    method: 'POST',
                    body: JSON.stringify({
                        IdMau: createdId,
                        IdTieuChiList: formData.DanhSachIdTieuChi.map(id => parseInt(id))
                    })
                });

                if (!bulkResponse.ok) {
                    bulkSuccess = false;
                    toast.current.show({ severity: 'warn', summary: 'Cảnh báo', detail: 'Lưu thông tin chung thành công nhưng lỗi liên kết tiêu chí!', life: 4000 });
                }
            }

            if (bulkSuccess) {
                toast.current.show({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu mẫu đánh giá và danh sách tiêu chí thành công!', life: 3000 });
            }

            fetchData();
            closeModal();
        } else {
            toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Lưu thất bại! Vui lòng kiểm tra lại dữ liệu', life: 4000 });
        }
    };

    const handleEdit = async (item) => {
        if (!canManage) return;
        editIdRef.current = item.IdMau;
        setEditId(item.IdMau);
        setIsModalOpen(true);
        setIsLoadingDetails(true);
        setFormData({
            ...item,
            DanhSachIdTieuChi: []
        });

        try {
            const response = await apiFetch(`maudanhgia/${item.IdMau}/chi-tiet`);
            if (response.ok) {
                const result = await response.json();
                if (result.Success && result.Item && editIdRef.current === item.IdMau) {
                    const detailItem = result.Item;
                    const extractTieuChiIds = (nhomList) => {
                        let ids = [];
                        if (!Array.isArray(nhomList)) return ids;
                        for (const nhom of nhomList) {
                            if (Array.isArray(nhom.TieuChi)) {
                                for (const tc of nhom.TieuChi) {
                                    if (tc.IdTieuChi) {
                                        ids.push(tc.IdTieuChi);
                                    }
                                }
                            }
                            if (Array.isArray(nhom.NhomCon)) {
                                ids = ids.concat(extractTieuChiIds(nhom.NhomCon));
                            }
                        }
                        return ids;
                    };
                    const ids = extractTieuChiIds(detailItem.Nhom);
                    setFormData({
                        TenMau: detailItem.TenMau || item.TenMau || '',
                        IdNam: detailItem.IdNam || item.IdNam || '',
                        MoTa: detailItem.MoTa || item.MoTa || '',
                        TrangThai: detailItem.TrangThai !== undefined ? detailItem.TrangThai : item.TrangThai,
                        DanhSachIdTieuChi: ids
                    });
                }
            }
        } catch (error) {
            console.error("Lỗi tải chi tiết mẫu đánh giá:", error);
        } finally {
            if (editIdRef.current === item.IdMau) {
                setIsLoadingDetails(false);
            }
        }
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa Mẫu phiếu này? Tất cả các tiêu chí đã gán bên trong cũng sẽ bị hủy liên kết',
            accept: async () => {
                const res = await apiFetch(`maudanhgia/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    const result = await res.json();
                    if (result.status === "success" || !result.status) {
                        fetchData();
                        toast.current.show({ severity: 'success', summary: 'Thành công', detail: 'Đã xóa mẫu phiếu thành công!', life: 3000 });
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
        editIdRef.current = null;
    };

    return (
        <div className="page-container">
            <Toast ref={toast} position="top-right" />
            <div className="page-header">
                <div className="header-title">
                    <h2>QUẢN LÝ MẪU ĐÁNH GIÁ</h2>
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
                isLoadingDetails={isLoadingDetails}
            />
        </div>
    );
};

export default QL_MauDanhGia;