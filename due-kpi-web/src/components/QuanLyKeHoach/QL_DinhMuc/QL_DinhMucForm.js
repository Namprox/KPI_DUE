import React from 'react';
import SearchSelect from '../../Common/SearchSelect';

const QL_DinhMucForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing, namList, chucDanhList }) => {
    if (!isOpen) return null;
    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSelect = (name) => (value) => setFormData({ ...formData, [name]: value });

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '600px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Sửa Định Mức" : "Thêm Định Mức Mới"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>
                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="dmForm" onSubmit={onSubmit}>
                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Năm học</label>
                                <SearchSelect
                                    name="IdNam"
                                    value={formData.IdNam || ''}
                                    onChange={handleSelect('IdNam')}
                                    options={namList.map(n => ({ value: n.IdNam, label: `Năm ${n.IdNam}` }))}
                                    placeholder="Chọn năm"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Chức danh nghề nghiệp</label>
                                <SearchSelect
                                    name="IdChucDanh"
                                    value={formData.IdChucDanh || ''}
                                    onChange={handleSelect('IdChucDanh')}
                                    options={chucDanhList.map(cd => ({ value: cd.IdChucDanh, label: cd.TenChucDanh }))}
                                    placeholder="Chọn chức danh"
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Giờ giảng dạy chuẩn</label>
                                <input type="number" name="GioGiangLyThuyet" className="form-input" value={formData.GioGiangLyThuyet || ''} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Giờ NCKH chuẩn</label>
                                <input type="number" name="GioNckh" className="form-input" value={formData.GioNckh || ''} onChange={handleChange} required />
                            </div>
                        </div>
                    </form>
                </div>
                <div className="modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="dmForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_DinhMucForm;