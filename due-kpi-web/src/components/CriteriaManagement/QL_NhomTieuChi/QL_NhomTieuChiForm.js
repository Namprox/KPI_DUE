import React from 'react';

const QL_NhomTieuChiForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing, nhomChaList = [] }) => {
    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '650px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Cập nhật Nhóm tiêu chí" : "Thêm mới Nhóm tiêu chí"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>

                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="nhomTieuChiForm" onSubmit={onSubmit}>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Tên Nhóm tiêu chí <span className="text-red">*</span></label>
                            <input
                                type="text"
                                name="TenNhom"
                                className="form-input"
                                value={formData.TenNhom || ''}
                                onChange={handleChange}
                                required
                                placeholder="VD: I. Đào tạo - Giảng dạy"
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Trực thuộc (Cấp cha)</label>
                            <select
                                name="IdNhomCha"
                                className="form-input"
                                value={formData.IdNhomCha || ''}
                                onChange={handleChange}
                            >
                                <option value="">Thuộc cấp cao nhất</option>
                                {nhomChaList
                                    .filter(n => n.IdNhom !== formData.IdNhom)
                                    .map(n => (
                                        <option key={n.IdNhom} value={n.IdNhom}>{n.TenNhom}</option>
                                    ))}
                            </select>
                        </div>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Loại Nhóm <span className="text-red">*</span></label>
                                <select
                                    name="LoaiNhom"
                                    className="form-input"
                                    value={formData.LoaiNhom || 1}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value={1}>1 - Tiêu chí cơ bản (Nhóm A)</option>
                                    <option value={2}>2 - Thành tích vượt trội (Nhóm B)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Điểm tối đa (Nếu có)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="DiemToiDa"
                                    className="form-input"
                                    value={formData.DiemToiDa || ''}
                                    onChange={handleChange}
                                    placeholder="VD: 100"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Thứ tự hiển thị</label>
                            <input
                                type="number"
                                name="ThuTuHienThi"
                                className="form-input"
                                value={formData.ThuTuHienThi || 1}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
                            <input
                                type="checkbox"
                                name="TrangThai"
                                id="ttNTC"
                                checked={formData.TrangThai !== false}
                                onChange={handleChange}
                                style={{ width: '18px', height: '18px', marginRight: '10px' }}
                            />
                            <label htmlFor="ttNTC" style={{ margin: 0, cursor: 'pointer', fontWeight: '500' }}>
                                Kích hoạt nhóm này
                            </label>
                        </div>

                    </form>
                </div>

                <div className="modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="nhomTieuChiForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_NhomTieuChiForm;