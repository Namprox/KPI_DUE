import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../css/Pages.css';
import QL_ViPhamListing from '../../components/QuanLyKeHoach/QL_ViPham/QL_ViPhamListing';
import QL_ViPhamForm from '../../components/QuanLyKeHoach/QL_ViPham/QL_ViPhamForm';
import { useConfirmDeleteDialog } from '../../hooks/useConfirmDeleteDialog';
import { apiFetch } from '../../utils/api';

const QL_ViPham = () => {
    const initialForm = {
        IdNhanVien: '',
        IdNam: '',
        MoTa: '',
        LaNghiemTrong: false,
        NgayViPham: '',
        IdNguoiGhiNhan: ''
    };

    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [namList, setNamList] = useState([]);
    const [nhanVienList, setNhanVienList] = useState([]);
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
        fetchNamList();
        fetchNhanVienList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await apiFetch('viphamgiangday');
            if (response.ok) {
                const result = await response.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                setData(list);
                setFilteredData(list);
            }
        } catch (error) {
            console.error("Lỗi tải danh sách vi phạm:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNamList = async () => {
        try {
            const response = await apiFetch('namdanhgia');
            if (response.ok) {
                const result = await response.json();
                setNamList(result.Items || (Array.isArray(result) ? result : []));
            }
        } catch (error) {
            console.error("Lỗi tải danh sách năm đánh giá:", error);
        }
    };

    const fetchNhanVienList = async () => {
        try {
            const response = await apiFetch('nhan-vien');
            if (response.ok) {
                const result = await response.json();
                setNhanVienList(result.Items || (Array.isArray(result) ? result : []));
            }
        } catch (error) {
            console.error("Lỗi tải danh sách nhân viên:", error);
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        setSearchQuery(query);
        
        if (!query.trim()) {
            setFilteredData(data);
            return;
        }

        setFilteredData(data.filter(item => {
            const nv = nhanVienList.find(x => x.IdNhanVien === item.IdNhanVien);
            const employeeName = nv ? nv.HoTen.toLowerCase() : '';
            const employeeCode = nv ? nv.MaNhanVien.toLowerCase() : '';
            const desc = item.MoTa ? item.MoTa.toLowerCase() : '';
            const yearStr = item.IdNam ? item.IdNam.toString() : '';
            
            return employeeName.includes(query) || 
                   employeeCode.includes(query) ||
                   desc.includes(query) ||
                   yearStr.includes(query);
        }));
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

        const method = editId ? 'PUT' : 'POST';
        const endpoint = editId ? `viphamgiangday/${editId}` : 'viphamgiangday';
        
        const payload = {
            IdNhanVien: parseInt(formData.IdNhanVien),
            IdNam: parseInt(formData.IdNam),
            MoTa: formData.MoTa,
            LaNghiemTrong: !!formData.LaNghiemTrong,
            NgayViPham: formData.NgayViPham ? new Date(formData.NgayViPham).toISOString() : null,
            IdNguoiGhiNhan: editId ? formData.IdNguoiGhiNhan : (currentUser.IdNhanVien || null)
        };

        if (editId) {
            payload.IdViPham = editId;
        }

        try {
            const response = await apiFetch(endpoint, {
                method,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                fetchData();
                closeModal();
            } else {
                alert("Lưu thất bại! Vui lòng thử lại.");
            }
        } catch (error) {
            console.error("Lỗi khi lưu dữ liệu:", error);
            alert("Có lỗi xảy ra khi kết nối máy chủ!");
        }
    };

    const handleEdit = (item) => {
        if (!canManage) return;
        setEditId(item.IdViPham);
        setFormData({
            IdNhanVien: item.IdNhanVien || '',
            IdNam: item.IdNam || '',
            MoTa: item.MoTa || '',
            LaNghiemTrong: !!item.LaNghiemTrong,
            NgayViPham: formatDateForInput(item.NgayViPham),
            IdNguoiGhiNhan: item.IdNguoiGhiNhan || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (!canManage) return;
        confirmDeleteDialog({
            header: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa ghi nhận vi phạm này?',
            accept: async () => {
                try {
                    const res = await apiFetch(`viphamgiangday/${id}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        fetchData();
                    } else {
                        alert("Xóa thất bại!");
                    }
                } catch (error) {
                    console.error("Lỗi khi xóa:", error);
                    alert("Lỗi kết nối máy chủ!");
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
                    <h2>QUẢN LÝ VI PHẠM</h2>
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
                    <p className="sub-title" style={{ margin: 0 }}>DANH SÁCH VI PHẠM</p>
                    <div className="search-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '12px', color: '#888' }}></i>
                        <input
                            type="text"
                            placeholder="Tìm theo tên, mã NV, mô tả hoặc năm"
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '35px' }}
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            <QL_ViPhamListing
                data={filteredData}
                nhanVienList={nhanVienList}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
                canManage={canManage}
            />

            <QL_ViPhamForm
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editId}
                namList={namList}
                nhanVienList={nhanVienList}
                currentUser={currentUser}
            />
        </div>
    );
};

export default QL_ViPham;
