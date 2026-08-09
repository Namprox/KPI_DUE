import React, { useEffect } from 'react';
import { Calendar } from 'primereact/calendar';
import { addLocale, locale } from 'primereact/api';
import SearchSelect from '../../Common/SearchSelect';

const TRANG_THAI_OPTIONS = [
    { value: 1, label: '1 - Đang cấu hình (Chuẩn bị)' },
    { value: 2, label: '2 - Mở hệ thống (Đang chạy)' },
    { value: 3, label: '3 - Đóng hệ thống (Kết thúc)' },
];

const QL_NamDanhGiaForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing }) => {
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
        return new Date(dateString);
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '750px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Cập nhật Lịch Đánh giá" : "Mở Năm Đánh giá Mới"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>
                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="namDanhGiaForm" onSubmit={onSubmit}>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Năm đánh giá <span className="text-red">*</span></label>
                                <input
                                    type="number"
                                    name="IdNam"
                                    className="form-input"
                                    value={formData.IdNam || ''}
                                    onChange={handleChange}
                                    required
                                    disabled={isEditing}
                                    style={{ backgroundColor: isEditing ? '#f1f5f9' : '#fff', fontWeight: 'bold', fontSize: '16px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Trạng thái hệ thống (Tự động) <span className="text-red">*</span></label>
                                <SearchSelect
                                    name="TrangThai"
                                    value={formData.TrangThai || 1}
                                    onChange={(v) => setFormData({ ...formData, TrangThai: v })}
                                    options={TRANG_THAI_OPTIONS}
                                    disabled
                                />
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                            <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#334155' }}>
                                1. Mốc thời gian của Năm học
                            </p>
                            <div className="form-grid-2">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Ngày Bắt đầu <span className="text-red">*</span></label>
                                    <Calendar
                                        id="NgayBatDau"
                                        value={parseDate(formData.NgayBatDau)}
                                        onChange={(e) => handleDateChange('NgayBatDau', e.value)}
                                        dateFormat="dd/mm/yy"
                                        showIcon
                                        required
                                        placeholder="dd/mm/yyyy"
                                        inputClassName="form-input"
                                        style={{ width: '100%' }}
                                        appendTo={document.body}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Ngày Kết thúc <span className="text-red">*</span></label>
                                    <Calendar
                                        id="NgayKetThuc"
                                        value={parseDate(formData.NgayKetThuc)}
                                        onChange={(e) => handleDateChange('NgayKetThuc', e.value)}
                                        dateFormat="dd/mm/yy"
                                        showIcon
                                        required
                                        placeholder="dd/mm/yyyy"
                                        inputClassName="form-input"
                                        style={{ width: '100%' }}
                                        appendTo={document.body}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
                            <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#166534' }}>
                                2. Lịch cho Giảng viên Tự đánh giá
                            </p>
                            <div className="form-grid-2">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Từ ngày</label>
                                    <Calendar
                                        value={parseDate(formData.NgayMoTuDanhGia)}
                                        onChange={(e) => handleDateChange('NgayMoTuDanhGia', e.value)}
                                        dateFormat="dd/mm/yy"
                                        showIcon
                                        showButtonBar
                                        placeholder="Không bắt buộc"
                                        inputClassName="form-input"
                                        style={{ width: '100%' }}
                                        appendTo={document.body}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Đến ngày (Hạn chót)</label>
                                    <Calendar
                                        value={parseDate(formData.NgayDongTuDanhGia)}
                                        onChange={(e) => handleDateChange('NgayDongTuDanhGia', e.value)}
                                        dateFormat="dd/mm/yy"
                                        showIcon
                                        showButtonBar
                                        placeholder="Không bắt buộc"
                                        inputClassName="form-input"
                                        style={{ width: '100%' }}
                                        appendTo={document.body}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bfdbfe' }}>
                            <p style={{ margin: '0 0 15px 0', fontWeight: 'bold', color: '#1e40af' }}>
                                3. Lịch cho Cấp trên duyệt điểm
                            </p>
                            <div className="form-grid-2">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Từ ngày</label>
                                    <Calendar
                                        value={parseDate(formData.NgayMoDanhGiaCapTren)}
                                        onChange={(e) => handleDateChange('NgayMoDanhGiaCapTren', e.value)}
                                        dateFormat="dd/mm/yy"
                                        showIcon
                                        showButtonBar
                                        placeholder="Không bắt buộc"
                                        inputClassName="form-input"
                                        style={{ width: '100%' }}
                                        appendTo={document.body}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Đến ngày (Hạn chót)</label>
                                    <Calendar
                                        value={parseDate(formData.NgayDongDanhGiaCapTren)}
                                        onChange={(e) => handleDateChange('NgayDongDanhGiaCapTren', e.value)}
                                        dateFormat="dd/mm/yy"
                                        showIcon
                                        showButtonBar
                                        placeholder="Không bắt buộc"
                                        inputClassName="form-input"
                                        style={{ width: '100%' }}
                                        appendTo={document.body}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Ghi chú</label>
                            <textarea name="GhiChu" className="form-input" value={formData.GhiChu || ''} onChange={handleChange} rows="2"></textarea>
                        </div>

                    </form>
                </div>
                <div className="modal-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="namDanhGiaForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_NamDanhGiaForm;