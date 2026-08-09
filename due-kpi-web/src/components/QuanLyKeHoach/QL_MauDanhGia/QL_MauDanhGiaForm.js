import React, { useMemo } from 'react';
import SearchSelect from '../../Common/SearchSelect';

const QL_MauDanhGiaForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing, namList = [], tieuChiList = [], isLoadingDetails = false }) => {

    const groupedTieuChi = useMemo(() => {
        return tieuChiList.reduce((groups, item) => {
            const groupName = item.TenNhom || 'Khác';
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(item);
            return groups;
        }, {});
    }, [tieuChiList]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleCheckboxChange = (idTieuChi, isChecked) => {
        let newList = [...(formData.DanhSachIdTieuChi || [])];
        if (isChecked) {
            if (!newList.includes(idTieuChi)) newList.push(idTieuChi);
        } else {
            newList = newList.filter(id => id !== idTieuChi);
        }
        setFormData({ ...formData, DanhSachIdTieuChi: newList });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ maxWidth: '800px', maxHeight: '95vh' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0 }}>{isEditing ? "Cập nhật Mẫu Phiếu" : "Tạo Mẫu Phiếu Mới"}</h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', marginTop: '-2px' }}>&times;</button>
                </div>
                <div className="modal-body" style={{ padding: '20px' }}>
                    <form id="mauDanhGiaForm" onSubmit={onSubmit}>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Tên mẫu phiếu <span className="text-red">*</span></label>
                                <input type="text" name="TenMau" className="form-input" value={formData.TenMau || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Năm áp dụng <span className="text-red">*</span></label>
                                <SearchSelect
                                    name="IdNam"
                                    value={formData.IdNam || ''}
                                    onChange={(v) => setFormData({ ...formData, IdNam: v })}
                                    options={namList.map(nam => ({ value: nam.IdNam, label: `Năm ${nam.IdNam}` }))}
                                    placeholder="Chọn năm"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Mô tả / Ghi chú</label>
                            <input type="text" name="MoTa" className="form-input" value={formData.MoTa || ''} onChange={handleChange} placeholder="Phạm vi áp dụng" />
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label style={{ fontSize: '15px', color: '#0056b3', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                <i className="fa-solid fa-list-check" style={{ marginRight: '8px' }}></i>
                                CHỌN TIÊU CHÍ ĐƯA VÀO MẪU NÀY
                                <span style={{ float: 'right', fontSize: '13px', color: '#e74c3c' }}>
                                    Đã chọn: {formData.DanhSachIdTieuChi?.length || 0} tiêu chí
                                </span>
                            </label>

                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', maxHeight: '350px', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '10px' }}>
                                {isLoadingDetails ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                                        <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#003399', marginBottom: '10px' }}></i>
                                        <span style={{ color: '#64748b', fontSize: '14px' }}>Đang tải danh sách tiêu chí...</span>
                                    </div>
                                ) : (
                                    <>
                                        {Object.keys(groupedTieuChi).map((groupName, idx) => (
                                            <div key={idx} style={{ marginBottom: '15px' }}>
                                                <div style={{ backgroundColor: '#e2e8f0', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', color: '#334155', fontSize: '13px', marginBottom: '8px' }}>
                                                    {groupName}
                                                </div>
                                                {groupedTieuChi[groupName].map(tc => {
                                                    const isChecked = (formData.DanhSachIdTieuChi || []).includes(tc.IdTieuChi);
                                                    return (
                                                        <div key={tc.IdTieuChi} style={{ display: 'flex', alignItems: 'flex-start', padding: '6px 10px', gap: '10px', transition: 'background 0.2s', borderRadius: '4px', backgroundColor: isChecked ? '#eff6ff' : 'transparent' }}>
                                                            <input
                                                                type="checkbox"
                                                                id={`tc_${tc.IdTieuChi}`}
                                                                checked={isChecked}
                                                                onChange={(e) => handleCheckboxChange(tc.IdTieuChi, e.target.checked)}
                                                                style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer' }}
                                                            />
                                                            <label htmlFor={`tc_${tc.IdTieuChi}`} style={{ margin: 0, cursor: 'pointer', fontWeight: isChecked ? 'bold' : 'normal', color: isChecked ? '#1d4ed8' : '#475569', fontSize: '14px', flex: 1 }}>
                                                                {tc.TenTieuChi}
                                                                {tc.DiemToiDa > 0 && <span style={{ color: '#ef4444', marginLeft: '5px', fontSize: '12px' }}>(Max: {tc.DiemToiDa}đ)</span>}
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                        {tieuChiList.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Chưa có tiêu chí nào trong kho dữ liệu</div>}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                            <input type="checkbox" name="TrangThai" id="ttMau" checked={formData.TrangThai !== false} onChange={handleChange} style={{ width: '18px', height: '18px', marginRight: '10px' }} />
                            <label htmlFor="ttMau" style={{ margin: 0, cursor: 'pointer', fontWeight: '500' }}>Kích hoạt sử dụng mẫu này</label>
                        </div>
                    </form>
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
                    <button type="submit" form="mauDanhGiaForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_MauDanhGiaForm;