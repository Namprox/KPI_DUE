import React from 'react';

const QL_NhomGiangVienForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing }) => {
    if (!isOpen) return null;
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '600px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Cập nhật Nhóm Giảng viên" : "Thêm Nhóm mới"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>
                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="nhomGvForm" onSubmit={onSubmit}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Mã nhóm <span className="text-red">*</span></label>
                            <input type="text" name="MaNhom" className="form-input" value={formData.MaNhom || ''} onChange={handleChange} required placeholder="PGS, TS, THS, ..." />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Tên nhóm <span className="text-red">*</span></label>
                            <input type="text" name="TenNhom" className="form-input" value={formData.TenNhom || ''} onChange={handleChange} required placeholder="Phó Giáo sư, Tiến sĩ, ..." />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Mô tả / Ghi chú</label>
                            <textarea name="MoTa" className="form-input" value={formData.MoTa || ''} onChange={handleChange} rows="2"></textarea>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
                            <input type="checkbox" name="TrangThai" id="ttNhom" checked={formData.TrangThai !== false} onChange={handleChange} style={{ width: '18px', height: '18px', marginRight: '10px' }} />
                            <label htmlFor="ttNhom" style={{ margin: 0, cursor: 'pointer', fontWeight: '500' }}>Đang hoạt động</label>
                        </div>
                    </form>
                </div>
                <div className="modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="nhomGvForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_NhomGiangVienForm;