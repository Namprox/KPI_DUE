import React from 'react';
import '../../../css/Pages.css';

const QL_DonViForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing, donViList = [] }) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '700px' }}>
                <div className="modal-header">
                    <h3>
                        {isEditing ? "Cập nhật Đơn vị" : "Thêm mới Đơn vị"}
                    </h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <form id="donViForm" onSubmit={onSubmit}>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Mã Đơn vị <span className="text-red">*</span></label>
                                <input
                                    type="text"
                                    name="MaDonVi"
                                    className="form-input"
                                    value={formData.MaDonVi || ''}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Tên Đơn vị <span className="text-red">*</span></label>
                                <input
                                    type="text"
                                    name="TenDonVi"
                                    className="form-input"
                                    value={formData.TenDonVi || ''}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Trực thuộc (Đơn vị cha)</label>
                                <select
                                    name="IdDonViCha"
                                    className="form-input"
                                    value={formData.IdDonViCha || ''}
                                    onChange={handleChange}
                                >
                                    <option value="">Cấp cao nhất (Không có)</option>
                                    {donViList
                                        .filter(dv => dv.IdDonVi !== formData.IdDonVi)
                                        .map(dv => (
                                            <option key={dv.IdDonVi} value={dv.IdDonVi}>
                                                {dv.TenDonVi}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Cấp độ <span className="text-red">*</span></label>
                                <select
                                    name="CapDonVi"
                                    className="form-input"
                                    value={formData.CapDonVi || 1}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value={1}>Cấp 1 (Trường)</option>
                                    <option value={2}>Cấp 2 (Khoa/Phòng/Ban)</option>
                                    <option value={3}>Cấp 3 (Bộ môn/Tổ)</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>ID ánh xạ hệ thống Science (Nếu có)</label>
                            <input
                                type="number"
                                name="ScienceDeptId"
                                className="form-input"
                                value={formData.ScienceDeptId || ''}
                                onChange={handleChange}
                                placeholder="Nhập ID từ hệ thống cũ để đồng bộ"
                            />
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                            <input
                                type="checkbox"
                                name="TrangThai"
                                id="trangThaiCheckDv"
                                checked={formData.TrangThai !== false}
                                onChange={handleChange}
                                style={{ width: '18px', height: '18px', marginRight: '10px' }}
                            />
                            <label htmlFor="trangThaiCheckDv" style={{ margin: 0, cursor: 'pointer', fontWeight: '500' }}>
                                Đơn vị đang hoạt động
                            </label>
                        </div>

                    </form>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times"></i> Hủy
                    </button>
                    <button type="submit" form="donViForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk"></i> Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_DonViForm;