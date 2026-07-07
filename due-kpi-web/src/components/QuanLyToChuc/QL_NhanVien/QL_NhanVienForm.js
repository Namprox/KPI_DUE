import React, { useState } from 'react';
import '../../../css/Pages.css';

const QL_NhanVienForm = ({
    isOpen, onClose, onSubmit, formData, setFormData, isEditing,
    donViList = [], chucVuList = [], chucDanhList = [], quanLyList = []
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit(e);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '800px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Cập nhật Nhân viên / Giảng viên" : "Thêm mới Nhân viên / Giảng viên"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>

                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="nhanVienForm" onSubmit={handleFormSubmit}>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Mã nhân viên <span className="text-red">*</span></label>
                                <input type="text" name="MaNhanVien" className="form-input" value={formData.MaNhanVien || ''} onChange={handleChange} required disabled={isEditing} />
                            </div>
                            <div className="form-group">
                                <label>Họ và Tên <span className="text-red">*</span></label>
                                <input type="text" name="HoTen" className="form-input" value={formData.HoTen || ''} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email liên hệ</label>
                            <input type="email" name="Email" className="form-input" value={formData.Email || ''} onChange={handleChange} />
                        </div>

                        <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Đơn vị trực thuộc <span className="text-red">*</span></label>
                                <select name="IdDonVi" className="form-input" value={formData.IdDonVi || ''} onChange={handleChange} required>
                                    <option value="">Chọn đơn vị</option>
                                    {donViList.map(dv => <option key={dv.id_don_vi || dv.IdDonVi} value={dv.id_don_vi || dv.IdDonVi}>{dv.ten_don_vi || dv.TenDonVi}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Chức vụ (Quyền hạn) <span className="text-red">*</span></label>
                                <select name="IdChucVu" className="form-input" value={formData.IdChucVu || ''} onChange={handleChange} required>
                                    <option value="">Chọn chức vụ</option>
                                    {chucVuList.map(cv => <option key={cv.id_chuc_vu || cv.IdChucVu} value={cv.id_chuc_vu || cv.IdChucVu}>{cv.ten_chuc_vu || cv.TenChucVu}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-grid-2">
                            <div className="form-group">
                                <label>Chức danh nghề nghiệp <span className="text-red">*</span></label>
                                <select name="IdChucDanh" className="form-input" value={formData.IdChucDanh || ''} onChange={handleChange} required>
                                    <option value="">Chọn chức danh nghề nghiệp</option>
                                    {chucDanhList.map(cd => (
                                        <option key={cd.id_chuc_danh || cd.IdChucDanh} value={cd.id_chuc_danh || cd.IdChucDanh}>
                                            {cd.ten_chuc_danh || cd.TenChucDanh}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Người quản lý trực tiếp</label>
                                <select name="IdQuanLyTrucTiep" className="form-input" value={formData.IdQuanLyTrucTiep || ''} onChange={handleChange}>
                                    <option value="">Không có</option>
                                    {quanLyList.filter(nv => nv.IdNhanVien !== formData.IdNhanVien).map(nv => (
                                        <option key={nv.IdNhanVien} value={nv.IdNhanVien}>{nv.MaNhanVien} - {nv.HoTen}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <hr style={{ border: '0', borderTop: '1px solid #eee', margin: '20px 0' }} />

                        <div className="form-group">
                            <label>Mật khẩu đăng nhập <span className="text-red">*</span></label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input type={showPassword ? "text" : "password"} name="MatKhau" className="form-input" value={formData.MatKhau || ''} onChange={handleChange} required={!isEditing} placeholder={isEditing ? "Bỏ trống nếu không đổi mật khẩu" : "Nhập mật khẩu"} style={{ width: '100%', paddingRight: '40px', margin: 0 }} />
                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: '#666' }} onClick={() => setShowPassword(!showPassword)}></i>
                            </div>
                        </div>

                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
                            <input type="checkbox" name="TrangThai" id="trangThaiCheck" checked={formData.TrangThai !== false} onChange={handleChange} style={{ width: '18px', height: '18px', marginRight: '10px' }} />
                            <label htmlFor="trangThaiCheck" style={{ margin: 0, cursor: 'pointer', fontWeight: '500' }}>Cho phép tài khoản hoạt động</label>
                        </div>
                    </form>
                </div>

                <div className="modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}><i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy</button>
                    <button type="submit" form="nhanVienForm" className="btn-submit"><i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu dữ liệu</button>
                </div>
            </div>
        </div>
    );
};

export default QL_NhanVienForm;