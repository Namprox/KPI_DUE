import React, { useState } from 'react';
import '../../../css/Pages.css';
import { apiFetch } from '../../../utils/api';

const ResetPasswordModal = ({ isOpen, onClose, user }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!newPassword || !confirmPassword) {
            alert('Vui lòng điền đầy đủ các trường!');
            return;
        }

        if (newPassword.length < 8) {
            alert('Mật khẩu mới phải có ít nhất 8 ký tự!');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Mật khẩu xác nhận không khớp!');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiFetch('auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({
                    IdNhanVien: user.IdNhanVien,
                    NewPassword: newPassword
                })
            });

            if (response.ok) {
                alert('Đổi mật khẩu thành công!');
                setNewPassword('');
                setConfirmPassword('');
                onClose();
            } else {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (_) {}
                alert(errorData.message || 'Đổi mật khẩu thất bại! Vui lòng kiểm tra lại.');
            }
        } catch (error) {
            console.error('Lỗi khi đổi mật khẩu:', error);
            alert('Lỗi kết nối máy chủ!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setNewPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '500px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Đổi mật khẩu</h3>
                    <button className="close-btn" onClick={handleClose} style={{ fontSize: '26px', lineHeight: '1', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>&times;</button>
                </div>

                <div className="modal-body" style={{ padding: '25px' }}>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                        Đặt lại mật khẩu cho người dùng: <strong>{user.HoTen}</strong> ({user.MaNhanVien})
                    </p>
                    
                    <form id="resetPasswordForm" onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                                Mật khẩu mới <span className="text-red">*</span>
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="form-input" 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    required 
                                    placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                                    style={{ width: '100%', paddingRight: '40px', margin: 0 }} 
                                />
                                <i 
                                    className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} 
                                    style={{ position: 'absolute', right: '12px', cursor: 'pointer', color: '#666' }} 
                                    onClick={() => setShowPassword(!showPassword)}
                                ></i>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>
                                Xác nhận mật khẩu mới <span className="text-red">*</span>
                            </label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="form-input" 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    required 
                                    placeholder="Xác nhận lại mật khẩu mới"
                                    style={{ width: '100%', paddingRight: '40px', margin: 0 }} 
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '15px 25px' }}>
                    <button type="button" className="btn-cancel" onClick={handleClose} disabled={isSubmitting}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="resetPasswordForm" className="btn-submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '5px' }}></i> Đang xử lý...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-key" style={{ marginRight: '5px' }}></i> Cập nhật
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordModal;
