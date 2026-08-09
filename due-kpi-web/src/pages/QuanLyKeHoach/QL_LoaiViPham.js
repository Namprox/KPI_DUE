import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import QL_LoaiViPhamListing from '../../components/QuanLyKeHoach/QL_LoaiViPham/QL_LoaiViPhamListing';
import QL_LoaiViPhamForm from '../../components/QuanLyKeHoach/QL_LoaiViPham/QL_LoaiViPhamForm';
import QL_DonViGhiNhanModal from '../../components/QuanLyKeHoach/QL_LoaiViPham/QL_DonViGhiNhanModal';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';
import { readApiError } from '../../utils/apiError';
import { isAdminRole, CAP_KHOA_PHONG } from '../../utils/viPhamPermissions';
import SearchSelect from '../../components/Common/SearchSelect';

const TRANG_THAI_FILTER_OPTIONS = [
    { value: '', label: '-- Tất cả --' },
    { value: 'true', label: 'Đang sử dụng' },
    { value: 'false', label: 'Ngừng sử dụng' },
];

const initialForm = {
    IdNhomVp: '',
    MaLoaiViPham: '',
    NoiDung: '',
    DiemTruMacDinh: '1',
    HoSoKemTheo: '',
    ChoPhepKhoaChuQuan: false,
    ChoPhepMoiDonVi: false,
    GhiChu: '',
    ThuTuHienThi: '0',
    TrangThai: true,
    IdDonViGhiNhanList: [],
};

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' };

const QL_LoaiViPham = () => {
    const toast = useRef(null);
    const { user } = useAuth();
    const currentUser = user || {};
    const isAdmin = isAdminRole(currentUser);

    const [nhomList, setNhomList] = useState([]);
    const [donViList, setDonViList] = useState([]);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);

    const [filterNhom, setFilterNhom] = useState('');
    const [filterTrangThai, setFilterTrangThai] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(initialForm);
    const [editId, setEditId] = useState(null);

    const [isDonViModalOpen, setIsDonViModalOpen] = useState(false);
    const [donViModalTarget, setDonViModalTarget] = useState(null);

    const { confirmDeleteDialog } = useConfirmDeleteDialog();

    useEffect(() => {
        if (isAdmin) initData();
        else setIsLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const showToast = (severity, summary, detail) => {
        if (toast.current) toast.current.show({ severity, summary, detail, life: 3000 });
    };

    const initData = async () => {
        setIsLoading(true);
        try {
            const [nhomRes, donViRes] = await Promise.all([
                apiFetch('nhom-vi-pham'),
                apiFetch('donvi'),
            ]);

            if (nhomRes.ok) {
                const result = await nhomRes.json();
                // Lưu ý: endpoint này trả list dưới key "Nhom", không phải "Items"
                const list = result.Nhom || result.Items || (Array.isArray(result) ? result : []);
                setNhomList([...list].sort((a, b) => (a.ThuTuHienThi || 0) - (b.ThuTuHienThi || 0)));
            }

            if (donViRes.ok) {
                const result = await donViRes.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setDonViList(
                    list
                        .filter((dv) => dv.CapDonVi === CAP_KHOA_PHONG)
                        .sort((a, b) => String(a.MaDonVi || '').localeCompare(String(b.MaDonVi || '')))
                );
            }

            await loadLoaiList('', '');
        } catch (error) {
            console.error('Lỗi khởi tạo danh mục loại vi phạm:', error);
            showToast('error', 'Lỗi', 'Không thể khởi tạo dữ liệu');
        } finally {
            setIsLoading(false);
        }
    };

    const loadLoaiList = async (nhomFilter = filterNhom, trangThaiFilter = filterTrangThai) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (nhomFilter) params.set('idNhomVp', nhomFilter);
            if (trangThaiFilter) params.set('trangThai', trangThaiFilter);
            const qs = params.toString();

            const response = await apiFetch(`loai-vi-pham${qs ? `?${qs}` : ''}`);
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setData(list);
                applyTextFilter(list, searchQuery);
            } else {
                const err = await readApiError(response, 'Không tải được danh mục loại vi phạm');
                showToast('error', 'Lỗi', err.message);
                setData([]);
                setFilteredData([]);
            }
        } catch (error) {
            console.error('Lỗi tải danh mục loại vi phạm:', error);
            showToast('error', 'Lỗi', 'Lỗi kết nối máy chủ');
        } finally {
            setIsLoading(false);
        }
    };

    const applyTextFilter = (rawList = data, search = searchQuery) => {
        if (!search.trim()) {
            setFilteredData(rawList);
            return;
        }
        const query = search.toLowerCase();
        setFilteredData(
            rawList.filter((item) =>
                [item.MaLoaiViPham, item.NoiDung, item.TenNhom, item.GhiChu, item.HoSoKemTheo]
                    .filter(Boolean)
                    .some((field) => String(field).toLowerCase().includes(query))
            )
        );
    };

    const handleNhomFilterChange = (val) => {
        setFilterNhom(val);
        loadLoaiList(val, filterTrangThai);
    };

    const handleTrangThaiFilterChange = (val) => {
        setFilterTrangThai(val);
        loadLoaiList(filterNhom, val);
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        applyTextFilter(data, val);
    };

    const handleOpenCreateModal = () => {
        setEditId(null);
        setFormData({ ...initialForm, IdNhomVp: filterNhom || '' });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item) => {
        setEditId(item.IdLoaiViPham);
        setFormData({
            IdNhomVp: item.IdNhomVp ?? '',
            MaLoaiViPham: item.MaLoaiViPham || '',
            NoiDung: item.NoiDung || '',
            DiemTruMacDinh: item.DiemTruMacDinh != null ? String(item.DiemTruMacDinh) : '0',
            HoSoKemTheo: item.HoSoKemTheo || '',
            ChoPhepKhoaChuQuan: !!item.ChoPhepKhoaChuQuan,
            ChoPhepMoiDonVi: !!item.ChoPhepMoiDonVi,
            GhiChu: item.GhiChu || '',
            ThuTuHienThi: item.ThuTuHienThi != null ? String(item.ThuTuHienThi) : '0',
            TrangThai: item.TrangThai !== false,
            IdDonViGhiNhanList: (item.DonViGhiNhan || []).map((d) => d.IdDonVi),
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData(initialForm);
        setEditId(null);
    };

    const buildPayload = (overrides = {}) => ({
        IdNhomVp: parseInt(formData.IdNhomVp, 10),
        MaLoaiViPham: (formData.MaLoaiViPham || '').trim(),
        NoiDung: (formData.NoiDung || '').trim(),
        DiemTruMacDinh: parseFloat(formData.DiemTruMacDinh),
        HoSoKemTheo: (formData.HoSoKemTheo || '').trim() || null,
        ChoPhepKhoaChuQuan: !!formData.ChoPhepKhoaChuQuan,
        ChoPhepMoiDonVi: !!formData.ChoPhepMoiDonVi,
        GhiChu: (formData.GhiChu || '').trim() || null,
        ThuTuHienThi: parseInt(formData.ThuTuHienThi, 10) || 0,
        TrangThai: !!formData.TrangThai,
        // Luôn gửi mảng cụ thể: null nghĩa là "giữ nguyên", dễ gây lưu hụt
        IdDonViGhiNhanList: formData.IdDonViGhiNhanList || [],
        ...overrides,
    });

    const validate = () => {
        if (!formData.IdNhomVp) return 'Vui lòng chọn nhóm vi phạm';
        if (!(formData.MaLoaiViPham || '').trim()) return 'Vui lòng nhập mã loại vi phạm';
        if ((formData.MaLoaiViPham || '').trim().length > 50) return 'Mã loại vi phạm tối đa 50 ký tự';
        if (!(formData.NoiDung || '').trim()) return 'Vui lòng nhập nội dung vi phạm';
        if ((formData.NoiDung || '').trim().length > 500) return 'Nội dung tối đa 500 ký tự';
        const diem = parseFloat(formData.DiemTruMacDinh);
        if (isNaN(diem) || diem < 0) return 'Điểm trừ mặc định phải là số không âm';
        if ((formData.HoSoKemTheo || '').length > 200) return 'Hồ sơ kèm theo tối đa 200 ký tự';
        if ((formData.GhiChu || '').length > 500) return 'Ghi chú tối đa 500 ký tự';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;

        const error = validate();
        if (error) {
            showToast('warn', 'Thiếu thông tin', error);
            return;
        }

        setIsSaving(true);
        try {
            const response = await apiFetch(editId ? `loai-vi-pham/${editId}` : 'loai-vi-pham', {
                method: editId ? 'PUT' : 'POST',
                body: JSON.stringify(buildPayload()),
            });

            if (response.ok || response.status === 201) {
                showToast('success', 'Thành công', editId ? 'Cập nhật loại vi phạm thành công' : 'Thêm loại vi phạm thành công');
                closeModal();
                loadLoaiList();
            } else {
                const err = await readApiError(response, 'Lưu thất bại');
                showToast('error', 'Lỗi', err.message);
            }
        } catch (error) {
            console.error('Lỗi khi lưu loại vi phạm:', error);
            showToast('error', 'Lỗi', 'Lỗi kết nối máy chủ');
        } finally {
            setIsSaving(false);
        }
    };

    const deactivateLoai = async (item) => {
        try {
            const response = await apiFetch(`loai-vi-pham/${item.IdLoaiViPham}`, {
                method: 'PUT',
                body: JSON.stringify({
                    IdNhomVp: item.IdNhomVp,
                    MaLoaiViPham: item.MaLoaiViPham,
                    NoiDung: item.NoiDung,
                    DiemTruMacDinh: item.DiemTruMacDinh,
                    HoSoKemTheo: item.HoSoKemTheo || null,
                    ChoPhepKhoaChuQuan: !!item.ChoPhepKhoaChuQuan,
                    ChoPhepMoiDonVi: !!item.ChoPhepMoiDonVi,
                    GhiChu: item.GhiChu || null,
                    ThuTuHienThi: item.ThuTuHienThi || 0,
                    TrangThai: false,
                    IdDonViGhiNhanList: (item.DonViGhiNhan || []).map((d) => d.IdDonVi),
                }),
            });
            if (response.ok) {
                showToast('success', 'Thành công', 'Đã chuyển loại vi phạm sang trạng thái ngừng sử dụng');
                loadLoaiList();
            } else {
                const err = await readApiError(response, 'Không thể cập nhật trạng thái');
                showToast('error', 'Lỗi', err.message);
            }
        } catch (error) {
            console.error('Lỗi khi ngừng sử dụng loại vi phạm:', error);
            showToast('error', 'Lỗi', 'Lỗi kết nối máy chủ');
        }
    };

    const handleDelete = (item) => {
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa loại vi phạm "${item.MaLoaiViPham}" không?`,
            accept: async () => {
                try {
                    const response = await apiFetch(`loai-vi-pham/${item.IdLoaiViPham}`, { method: 'DELETE' });
                    if (response.ok) {
                        showToast('success', 'Thành công', 'Đã xóa loại vi phạm');
                        loadLoaiList();
                        return;
                    }

                    const err = await readApiError(response, 'Xóa thất bại');
                    if (response.status === 409) {
                        confirmDialog({
                            header: 'Không thể xóa',
                            message: `${err.message}. Bạn có muốn chuyển loại vi phạm này sang trạng thái "Ngừng sử dụng" không?`,
                            icon: 'pi pi-exclamation-triangle',
                            acceptLabel: 'Ngừng sử dụng',
                            rejectLabel: 'Đóng',
                            accept: () => deactivateLoai(item),
                        });
                    } else {
                        showToast('error', 'Lỗi', err.message);
                    }
                } catch (error) {
                    console.error('Lỗi khi xóa loại vi phạm:', error);
                    showToast('error', 'Lỗi', 'Lỗi kết nối máy chủ');
                }
            },
        });
    };

    const handleOpenDonViModal = (item) => {
        setDonViModalTarget(item);
        setIsDonViModalOpen(true);
    };

    const handleSaveDonVi = async (idLoaiViPham, idDonViList) => {
        setIsSaving(true);
        try {
            const response = await apiFetch(`loai-vi-pham/${idLoaiViPham}/don-vi-ghi-nhan`, {
                method: 'PUT',
                body: JSON.stringify({ IdDonViList: idDonViList }),
            });
            if (response.ok) {
                showToast('success', 'Thành công', 'Đã cập nhật phân quyền đơn vị ghi nhận');
                setIsDonViModalOpen(false);
                setDonViModalTarget(null);
                loadLoaiList();
            } else {
                const err = await readApiError(response, 'Cập nhật phân quyền thất bại');
                showToast('error', 'Lỗi', err.message);
            }
        } catch (error) {
            console.error('Lỗi khi lưu phân quyền đơn vị:', error);
            showToast('error', 'Lỗi', 'Lỗi kết nối máy chủ');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="page-container" style={{ padding: '20px' }}>
                <Toast ref={toast} />
                <div className="modern-table-card" style={{ textAlign: 'center', padding: '70px 20px', color: '#666' }}>
                    <i className="fa-solid fa-lock" style={{ fontSize: '58px', color: '#cbd5e1', marginBottom: '18px' }}></i>
                    <h3 style={{ color: '#475569', margin: '0 0 8px 0' }}>Chức năng chỉ dành cho Quản trị hệ thống</h3>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                        Danh mục loại vi phạm là cấu hình toàn hệ thống nên chỉ tài khoản Admin mới được truy cập.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ padding: '20px' }}>
            <Toast ref={toast} />

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '700' }}>
                        Danh mục loại vi phạm
                    </h2>
                    <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                        Cấu hình các nội dung "việc chưa tuân thủ", điểm trừ mặc định và đơn vị được ghi nhận
                    </p>
                </div>

                <button
                    className="btn-submit"
                    onClick={handleOpenCreateModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '14px' }}
                >
                    <i className="fa-solid fa-plus"></i> Thêm loại vi phạm
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ minWidth: '240px', flex: '2 1 240px' }}>
                    <label style={labelStyle}>Nhóm vi phạm</label>
                    <SearchSelect
                        value={filterNhom}
                        onChange={handleNhomFilterChange}
                        options={[
                            { value: '', label: '-- Tất cả nhóm --' },
                            ...nhomList.map((n) => ({ value: n.IdNhomVp, label: n.TenNhom })),
                        ]}
                        placeholder="-- Tất cả nhóm --"
                    />
                </div>

                <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
                    <label style={labelStyle}>Trạng thái</label>
                    <SearchSelect
                        value={filterTrangThai}
                        onChange={handleTrangThaiFilterChange}
                        options={TRANG_THAI_FILTER_OPTIONS}
                        placeholder="-- Tất cả --"
                    />
                </div>

                <div style={{ minWidth: '220px', flex: '2 1 220px' }}>
                    <label style={labelStyle}>Tìm kiếm từ khóa</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Mã, nội dung, nhóm..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            style={{ paddingRight: '30px' }}
                        />
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                    </div>
                </div>
            </div>

            <QL_LoaiViPhamListing
                data={filteredData}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                onEditDonVi={handleOpenDonViModal}
                isLoading={isLoading}
            />

            <QL_LoaiViPhamForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                nhomList={nhomList}
                donViList={donViList}
                isSaving={isSaving}
            />

            <QL_DonViGhiNhanModal
                isOpen={isDonViModalOpen}
                onClose={() => { setIsDonViModalOpen(false); setDonViModalTarget(null); }}
                onSave={handleSaveDonVi}
                target={donViModalTarget}
                donViList={donViList}
                isSaving={isSaving}
            />
        </div>
    );
};

export default QL_LoaiViPham;
