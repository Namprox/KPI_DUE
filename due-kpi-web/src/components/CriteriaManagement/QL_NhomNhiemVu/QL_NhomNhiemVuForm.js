import React from 'react';

const QL_NhomNhiemVuForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing }) => {
    if (!isOpen) return null;
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3>{isEditing ? "Cập nhật Nhóm nhiệm vụ" : "Thêm Nhóm nhiệm vụ"}</h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <form id="nhiemVuForm" onSubmit={onSubmit}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Tên Nhóm nhiệm vụ <span className="text-red">*</span></label>
                            <input
                                type="text"
                                name="TenNhom"
                                className="form-input"
                                value={formData.TenNhom || ''}
                                onChange={handleChange}
                                required
                                placeholder="VD: Nhiệm vụ Giảng dạy, Nghiên cứu khoa học..."
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Thứ tự hiển thị</label>
                            <input
                                type="number"
                                name="ThuTu"
                                className="form-input"
                                value={formData.ThuTu || 1}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
                            <input type="checkbox" name="TrangThai" id="ttNV" checked={formData.TrangThai !== false} onChange={handleChange} style={{ width: '18px', height: '18px', marginRight: '10px' }} />
                            <label htmlFor="ttNV" style={{ margin: 0, cursor: 'pointer' }}>Đang hoạt động</label>
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
                    <button type="submit" form="nhiemVuForm" className="btn-submit">Lưu dữ liệu</button>
                </div>
            </div>
        </div>
    );
};

export default QL_NhomNhiemVuForm;