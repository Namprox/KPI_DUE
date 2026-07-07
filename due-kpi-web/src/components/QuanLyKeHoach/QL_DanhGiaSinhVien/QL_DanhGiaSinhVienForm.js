import React from 'react';

const QL_DanhGiaSinhVienForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing, namList, nhanVienList }) => {
    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleNumberChange = (e) => {
        const { name, value } = e.target;
        setFormData({ 
            ...formData, 
            [name]: value === '' ? '' : (name === 'DiemTrungBinh' ? parseFloat(value) : parseInt(value, 10)) 
        });
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '600px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Cập nhật đánh giá sinh viên" : "Thêm mới đánh giá sinh viên"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>
                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="danhGiaSinhVienForm" onSubmit={onSubmit}>
                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Năm học <span className="text-red">*</span></label>
                                <select
                                    name="IdNam"
                                    className="form-input"
                                    value={formData.IdNam || ''}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">-- Chọn năm học --</option>
                                    {namList.map(n => (
                                        <option key={n.IdNam} value={n.IdNam}>{n.IdNam}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Nhân viên <span className="text-red">*</span></label>
                                <select
                                    name="IdNhanVien"
                                    className="form-input"
                                    value={formData.IdNhanVien || ''}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {nhanVienList.map(nv => (
                                        <option key={nv.IdNhanVien} value={nv.IdNhanVien}>{nv.MaNhanVien} - {nv.HoTen}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Điểm trung bình (Thang 5) <span className="text-red">*</span></label>
                                <input
                                    type="number"
                                    name="DiemTrungBinh"
                                    className="form-input"
                                    value={formData.DiemTrungBinh !== undefined && formData.DiemTrungBinh !== null ? formData.DiemTrungBinh : ''}
                                    onChange={handleNumberChange}
                                    step="0.01"
                                    min="0"
                                    max="5"
                                    placeholder="Ví dụ: 4.5"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Số học phần đánh giá</label>
                                <input
                                    type="number"
                                    name="SoHocPhanDanhGia"
                                    className="form-input"
                                    value={formData.SoHocPhanDanhGia !== undefined && formData.SoHocPhanDanhGia !== null ? formData.SoHocPhanDanhGia : ''}
                                    onChange={handleNumberChange}
                                    step="1"
                                    min="0"
                                    placeholder="Ví dụ: 3"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Hệ thống nguồn</label>
                            <input
                                type="text"
                                name="HeThongNguon"
                                className="form-input"
                                value={formData.HeThongNguon || ''}
                                onChange={handleChange}
                                placeholder="Ví dụ: Portal, Survey..."
                            />
                        </div>
                    </form>
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="danhGiaSinhVienForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_DanhGiaSinhVienForm;
