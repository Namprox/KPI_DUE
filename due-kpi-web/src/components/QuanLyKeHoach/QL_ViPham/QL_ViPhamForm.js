import React, { useEffect } from 'react';
import { Calendar } from 'primereact/calendar';
import { addLocale, locale } from 'primereact/api';

const QL_ViPhamForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing, namList, nhanVienList, currentUser }) => {
    useEffect(() => {
        addLocale('vi', {
            firstDayOfWeek: 1,
            dayNames: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
            dayNamesShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
            dayNamesMin: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
            monthNames: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
            monthNamesShort: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'],
            today: 'Hôm nay',
            clear: 'Xóa'
        });
        locale('vi');
    }, []);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleDateChange = (name, dateValue) => {
        if (!dateValue) {
            setFormData({ ...formData, [name]: '' });
            return;
        }
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        setFormData({ ...formData, [name]: `${year}-${month}-${day}` });
    };

    const parseDate = (dateString) => {
        if (!dateString) return null;
        let date;
        if (typeof dateString === "string" && dateString.includes("/Date(")) {
            const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
            date = new Date(timestamp);
        } else {
            date = new Date(dateString);
        }
        return isNaN(date.getTime()) ? null : date;
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '650px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Cập nhật thông tin vi phạm" : "Ghi nhận vi phạm mới"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>
                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="viPhamForm" onSubmit={onSubmit}>
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
                                <label>Nhân viên vi phạm <span className="text-red">*</span></label>
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
                                <label>Ngày vi phạm</label>
                                <Calendar
                                    value={parseDate(formData.NgayViPham)}
                                    onChange={(e) => handleDateChange('NgayViPham', e.value)}
                                    dateFormat="dd/mm/yy"
                                    showIcon
                                    showButtonBar
                                    placeholder="Không bắt buộc"
                                    inputClassName="form-input"
                                    style={{ width: '100%' }}
                                    appendTo={document.body}
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                                    <input
                                        type="checkbox"
                                        id="LaNghiemTrong"
                                        name="LaNghiemTrong"
                                        checked={!!formData.LaNghiemTrong}
                                        onChange={(e) => setFormData({ ...formData, LaNghiemTrong: e.target.checked })}
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="LaNghiemTrong" style={{ margin: 0, cursor: 'pointer', fontWeight: '600' }}>
                                        Vi phạm nghiêm trọng
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Mô tả vi phạm <span className="text-red">*</span></label>
                            <textarea
                                name="MoTa"
                                className="form-input"
                                value={formData.MoTa || ''}
                                onChange={handleChange}
                                rows="3"
                                placeholder="Nhập chi tiết lỗi vi phạm..."
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Người ghi nhận</label>
                            <input
                                type="text"
                                className="form-input"
                                value={currentUser ? `${currentUser.MaNhanVien || ''} - ${currentUser.HoTen || ''}` : ''}
                                disabled
                                style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                            />
                        </div>
                    </form>
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="viPhamForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_ViPhamForm;
