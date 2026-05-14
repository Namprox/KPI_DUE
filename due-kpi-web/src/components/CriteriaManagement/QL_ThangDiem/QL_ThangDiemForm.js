import React from 'react';

const QL_ThangDiemForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing, tieuChiList = [] }) => {
    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '650px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Cập nhật Mức điểm" : "Thêm Mức điểm mới"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>
                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="thangDiemForm" onSubmit={onSubmit}>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Thuộc Tiêu chí đánh giá <span className="text-red">*</span></label>
                            <select name="IdTieuChi" className="form-input" value={formData.IdTieuChi || ''} onChange={handleChange} required>
                                <option value="">Chọn tiêu chí áp dụng</option>
                                {tieuChiList.map(tc => (
                                    <option key={tc.IdTieuChi} value={tc.IdTieuChi}>
                                        {tc.TenTieuChi} {tc.DiemToiDa ? `(Max: ${tc.DiemToiDa}đ)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Mức điểm quy định <span className="text-red">*</span></label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="GiaTriDiem"
                                    className="form-input"
                                    value={formData.GiaTriDiem || ''}
                                    onChange={handleChange}
                                    required
                                    placeholder="VD: 10"
                                />
                            </div>
                            <div className="form-group">
                                <label>Thứ tự hiển thị</label>
                                <input
                                    type="number"
                                    name="ThuTuHienThi"
                                    className="form-input"
                                    value={formData.ThuTuHienThi || 1}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Mô tả / Điều kiện đạt mức điểm này <span className="text-red">*</span></label>
                            <textarea
                                name="DieuKienDiem"
                                className="form-input"
                                value={formData.DieuKienDiem || ''}
                                onChange={handleChange}
                                required
                                rows="3"
                            ></textarea>
                        </div>

                    </form>
                </div>
                <div className="modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
                    <button type="submit" form="thangDiemForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_ThangDiemForm;