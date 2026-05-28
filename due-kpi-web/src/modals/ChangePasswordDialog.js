import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { apiFetch } from '../utils/api';

const ChangePasswordDialog = ({ isOpen, onHide, user, toast }) => {
    const [passData, setPassData] = useState({ oldPass: '', newPass: '', confirmPass: '' });
    const [isDesktop, setIsDesktop] = useState(true);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 992);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const resetForm = () => setPassData({ oldPass: '', newPass: '', confirmPass: '' });

    const handleSubmit = async () => {
        if (!passData.oldPass || !passData.newPass || !passData.confirmPass) {
            toast.current.show({ severity: 'warn', detail: 'Vui lòng điền đầy đủ các trường!' });
            return;
        }
        if (passData.newPass !== passData.confirmPass) {
            toast.current.show({ severity: 'error', detail: 'Mật khẩu xác nhận không khớp!' });
            return;
        }

        try {
            const response = await apiFetch('changepassword', {
                method: 'POST',
                body: JSON.stringify({
                    UserId: user.Id,
                    OldPassword: passData.oldPass,
                    NewPassword: passData.newPass
                })
            });
            const result = await response.json();
            if (response.ok) {
                toast.current.show({ severity: 'success', detail: 'Đổi mật khẩu thành công!' });
                resetForm();
                onHide();
            } else {
                toast.current.show({ severity: 'error', detail: result.message || 'Lỗi!' });
            }
        } catch (e) {
            toast.current.show({ severity: 'error', detail: 'Lỗi kết nối máy chủ!' });
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box',
        marginTop: '5px'
    };

    return (
        <Dialog
            header="Đổi mật khẩu"
            visible={isOpen}
            style={{ width: isDesktop ? '450px' : '95vw', maxWidth: '100%' }}
            onHide={() => { onHide(); resetForm(); }}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="btn-cancel-modal" onClick={() => { onHide(); resetForm(); }}>Hủy</button>
                    <button className="btn-save-modal" onClick={handleSubmit}>Hoàn tất</button>
                </div>
            }
        >
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>Điền vào biểu mẫu dưới đây để đổi mật khẩu</p>
            <div className="form-group-password">
                <label style={{ fontWeight: 'bold', color: '#333' }}>Mật khẩu cũ *</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={passData.oldPass}
                    onChange={(e) => setPassData({ ...passData, oldPass: e.target.value })}
                />

                <label style={{ marginTop: '15px', display: 'block', fontWeight: 'bold', color: '#333' }}>Mật khẩu mới *</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={passData.newPass}
                    onChange={(e) => setPassData({ ...passData, newPass: e.target.value })}
                />

                <label style={{ marginTop: '15px', display: 'block', fontWeight: 'bold', color: '#333' }}>Xác nhận mật khẩu mới *</label>
                <input
                    type="password"
                    style={inputStyle}
                    value={passData.confirmPass}
                    onChange={(e) => setPassData({ ...passData, confirmPass: e.target.value })}
                />
            </div>
        </Dialog>
    );
};

export default ChangePasswordDialog;