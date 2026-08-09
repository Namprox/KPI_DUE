import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../../utils/api';
import SearchSelect from '../../components/Common/SearchSelect';
import { Toast } from 'primereact/toast';
import { confirmDialog } from 'primereact/confirmdialog';
import '../../css/Pages.css';

const QL_PhanQuyenTieuChi = () => {
    const { idMau } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const toast = useRef(null);

    const [isLoading, setIsLoading] = useState(true);
    const [mauDanhGia, setMauDanhGia] = useState(null);
    const [tieuChiList, setTieuChiList] = useState([]);
    const [donViList, setDonViList] = useState([]);
    const [permissionMap, setPermissionMap] = useState({}); // { [idTieuChi]: string }
    const [initialPermissions, setInitialPermissions] = useState({}); // { [idTieuChi]: string }
    const [defaultDVLabel, setDefaultDVLabel] = useState('Mặc định (Trưởng khoa/phòng chủ quản)');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (idMau) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idMau]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Tải chi tiết mẫu đánh giá
            const resDetail = await apiFetch(`maudanhgia/${idMau}/chi-tiet`);
            if (!resDetail.ok) {
                throw new Error("Không thể tải thông tin mẫu đánh giá");
            }
            const resultDetail = await resDetail.json();
            const itemDetail = resultDetail.Item || resultDetail.data || {};
            setMauDanhGia(itemDetail);

            // 2. Tải danh sách đơn vị
            const resDonVi = await apiFetch('donvi');
            let allDonVi = [];
            if (resDonVi.ok) {
                const data = await resDonVi.json();
                allDonVi = data.Items || (Array.isArray(data) ? data : []);
            }

            // Lọc các đơn vị thực tế có mã bắt đầu bằng P_
            const pUnits = allDonVi.filter(dv => dv.MaDonVi && dv.MaDonVi.toUpperCase().startsWith('P_'));
            setDonViList(pUnits);

            // Xác định loaiDoiTuong để đặt nhãn mặc định động
            let loaiDoiTuong = location.state?.loaiDoiTuong;
            if (!loaiDoiTuong) {
                const resBase = await apiFetch(`maudanhgia/${idMau}`);
                if (resBase.ok) {
                    const resultBase = await resBase.json();
                    const itemBase = resultBase.Item || resultBase.data || {};
                    loaiDoiTuong = itemBase.LoaiDoiTuong || itemBase.loaiDoiTuong;
                }
            }
            loaiDoiTuong = loaiDoiTuong || itemDetail.LoaiDoiTuong || itemDetail.loaiDoiTuong || 1;

            const typeStr = String(loaiDoiTuong);
            if (typeStr === '1' || typeStr === '3') {
                setDefaultDVLabel('Mặc định (Trưởng khoa chủ quản)');
            } else if (typeStr === '2' || typeStr === '4') {
                setDefaultDVLabel('Mặc định (Trưởng phòng chủ quản)');
            } else {
                setDefaultDVLabel('Mặc định (Trưởng khoa/phòng chủ quản)');
            }

            // 3. Tải danh sách phân quyền chấm tiêu chí hiện tại của mẫu
            const resPerms = await apiFetch(`tieu-chi-don-vi-cham?idMau=${idMau}`);
            let permsList = [];
            if (resPerms.ok) {
                const data = await resPerms.json();
                permsList = data.Items || (Array.isArray(data) ? data : []);
            }

            // Flatten danh sách tiêu chí từ nhóm & nhóm con
            const flatCriteria = [];
            const initialPermsMap = {};

            const extractCriteria = (nhomList) => {
                if (!Array.isArray(nhomList)) return;
                for (const nhom of nhomList) {
                    if (Array.isArray(nhom.TieuChi)) {
                        for (const tc of nhom.TieuChi) {
                            flatCriteria.push({
                                ...tc,
                                TenNhom: nhom.TenNhom
                            });
                            // Lấy danh sách ID đơn vị được giao phân quyền chấm tiêu chí này (chỉ lấy đơn vị đầu tiên)
                            const tcPerms = permsList
                                .filter(p => p.IdTieuChi === tc.IdTieuChi)
                                .map(p => p.IdDonVi);
                            const currentDV = tcPerms.length > 0 ? String(tcPerms[0]) : '';
                            initialPermsMap[tc.IdTieuChi] = currentDV;
                        }
                    }
                    if (Array.isArray(nhom.NhomCon)) {
                        extractCriteria(nhom.NhomCon);
                    }
                }
            };

            extractCriteria(itemDetail.Nhom);
            setTieuChiList(flatCriteria);
            setPermissionMap(JSON.parse(JSON.stringify(initialPermsMap)));
            setInitialPermissions(initialPermsMap);

        } catch (error) {
            console.error("Lỗi tải dữ liệu cấu hình trang phân quyền:", error);
            toast.current?.show({
                severity: 'error',
                summary: 'Lỗi',
                detail: error.message || 'Không thể tải dữ liệu cấu hình phân quyền!',
                life: 4000
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectChange = (idTieuChi, value) => {
        setPermissionMap(prev => ({
            ...prev,
            [idTieuChi]: value
        }));
    };

    const handleSave = () => {
        confirmDialog({
            message: 'Bạn có chắc chắn muốn lưu cấu hình phân quyền đánh giá này không?',
            header: 'Xác nhận lưu cấu hình',
            icon: 'fa-solid fa-circle-question',
            acceptLabel: 'Đồng ý',
            rejectLabel: 'Hủy bỏ',
            accept: () => executeSave()
        });
    };

    const executeSave = async () => {
        setIsSaving(true);
        try {
            // Chỉ gửi request cho các tiêu chí có thay đổi phân quyền so với ban đầu
            const changedCriteria = Object.keys(permissionMap).filter(idTieuChi => {
                return (permissionMap[idTieuChi] || '') !== (initialPermissions[idTieuChi] || '');
            });

            if (changedCriteria.length === 0) {
                toast.current?.show({
                    severity: 'success',
                    summary: 'Thành công',
                    detail: 'Không có thay đổi nào cần lưu!',
                    life: 2000
                });
                setTimeout(() => {
                    navigate('/mau-danh-gia');
                }, 1000);
                return;
            }

            // Gọi các API cập nhật phân quyền
            const savePromises = changedCriteria.map(async (idTieuChi) => {
                const selectedValue = permissionMap[idTieuChi] || '';
                const idDonViList = selectedValue ? [parseInt(selectedValue)] : [];
                const payload = {
                    IdTieuChi: parseInt(idTieuChi),
                    IdDonViList: idDonViList
                };
                
                const response = await apiFetch('tieu-chi-don-vi-cham', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`Lưu phân quyền cho tiêu chí ID ${idTieuChi} thất bại!`);
                }
            });

            await Promise.all(savePromises);

            toast.current?.show({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Đã lưu cấu hình phân quyền đơn vị đánh giá thành công!',
                life: 3000
            });
            setTimeout(() => {
                navigate('/mau-danh-gia');
            }, 1000);
            
        } catch (error) {
            console.error("Lỗi lưu cấu hình phân quyền:", error);
            toast.current?.show({
                severity: 'error',
                summary: 'Lỗi',
                detail: error.message || 'Không thể lưu cấu hình phân quyền đánh giá!',
                life: 4000
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page-container">
            <Toast ref={toast} position="top-right" />

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div className="header-title">
                    <h2 style={{ margin: 0 }}>CẤU HÌNH ĐƠN VỊ ĐÁNH GIÁ TIÊU CHÍ</h2>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        type="button" 
                        className="btn-cancel" 
                        onClick={() => navigate('/mau-danh-gia')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontWeight: '500' }}
                        disabled={isSaving}
                    >
                        <i className="fa-solid fa-arrow-left"></i> Quay lại
                    </button>
                    <button 
                        type="button" 
                        className="btn-submit" 
                        onClick={handleSave}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: '500', margin: 0 }}
                        disabled={isSaving || isLoading || tieuChiList.length === 0}
                    >
                        {isSaving ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                            <i className="fa-solid fa-floppy-disk"></i>
                        )}
                        Lưu phân quyền
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '80px 20px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#003399', marginBottom: '15px' }}></i>
                    <p style={{ color: '#64748b', fontSize: '15px' }}>Đang tải dữ liệu cấu hình mẫu phiếu...</p>
                </div>
            ) : (
                <>
                    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#003399', fontSize: '17px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>THÔNG TIN MẪU PHIẾU ĐÁNH GIÁ</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155' }}>
                            <div>Tên mẫu phiếu: <strong>{mauDanhGia?.TenMau}</strong></div>
                            <div>Năm áp dụng: <strong style={{ color: '#e67e22' }}>{mauDanhGia?.IdNam}</strong></div>
                            {mauDanhGia?.MoTa && <div>Ghi chú: <span style={{ fontStyle: 'italic', color: '#64748b' }}>{mauDanhGia.MoTa}</span></div>}
                        </div>
                    </div>

                    <div className="table-card" style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', padding: '20px', overflowX: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <p className="sub-title" style={{ margin: 0, fontWeight: 'bold', color: '#334155' }}>
                                DANH SÁCH TIÊU CHÍ KPI ({tieuChiList.length})
                            </p>
                        </div>

                        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th width="5%" style={{ textAlign: 'center', padding: '12px' }}>STT</th>
                                    <th width="20%" style={{ padding: '12px' }}>NHÓM TIÊU CHÍ</th>
                                    <th width="50%" style={{ padding: '12px' }}>TÊN TIÊU CHÍ KPI</th>
                                    <th width="25%" style={{ padding: '12px' }}>ĐƠN VỊ CHỊU TRÁCH NHIỆM ĐÁNH GIÁ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tieuChiList.map((tc, index) => {
                                    const selectedValue = permissionMap[tc.IdTieuChi] || '';
                                    return (
                                        <tr key={tc.IdTieuChi} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.2s' }}>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '12px', color: '#475569' }}>{index + 1}</td>
                                            <td style={{ color: '#64748b', fontSize: '13px', padding: '12px', fontWeight: '500' }}>{tc.TenNhom || 'Chưa phân nhóm'}</td>
                                            <td style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px', padding: '12px' }}>
                                                {tc.TenTieuChi}
                                                {tc.DiemToiDa > 0 && (
                                                    <span style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px', fontSize: '11px', fontWeight: 'bold' }}>
                                                        Max: {tc.DiemToiDa}đ
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <SearchSelect
                                                    value={selectedValue}
                                                    onChange={(v) => handleSelectChange(tc.IdTieuChi, v)}
                                                    options={[
                                                        { value: '', label: defaultDVLabel },
                                                        ...donViList.map(dv => ({ value: dv.IdDonVi, label: dv.TenDonVi })),
                                                    ]}
                                                    placeholder={defaultDVLabel}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {tieuChiList.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' }}>
                                            Chưa có tiêu chí nào được gán vào mẫu phiếu này.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default QL_PhanQuyenTieuChi;
