import React from 'react';

const QL_TieuChiForm = ({ isOpen, onClose, onSubmit, formData, setFormData, isEditing, nhomTieuChiList = [], namDanhGiaList = [] }) => {
    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const formatDate = (dateInput) => {
        if (!dateInput) return 'N/A';

        if (typeof dateInput === 'string' && dateInput.indexOf('/Date(') >= 0) {
            const ms = parseInt(dateInput.replace(/[^0-9]/g, ''), 10);
            return new Date(ms).toLocaleDateString('vi-VN');
        }

        const d = new Date(dateInput);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('vi-VN');
    };

    const isFormula = Number(formData.LoaiThangDiem) === 4;
    const isSync = formData.CoTheDongBoScience === true;

    return (
        <div className="modal-overlay">
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '850px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? "Cập nhật Tiêu chí Đánh giá" : "Thêm mới Tiêu chí Đánh giá"}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0, marginTop: '-2px' }}>&times;</button>
                </div>

                <div className="modal-body" style={{ padding: '25px' }}>
                    <form id="tieuChiForm" onSubmit={onSubmit}>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Thuộc Nhóm Tiêu Chí <span className="text-red">*</span></label>
                                <select name="IdNhom" className="form-input" value={formData.IdNhom || ''} onChange={handleChange} required>
                                    <option value="">Chọn nhóm tiêu chí</option>
                                    {nhomTieuChiList.map(nhom => (
                                        <option key={nhom.IdNhom} value={nhom.IdNhom}>{nhom.TenNhom}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Năm áp dụng (Để trống = Áp dụng mọi năm)</label>
                                <select name="IdNam" className="form-input" value={formData.IdNam || ''} onChange={handleChange}>
                                    <option value="">Mặc định (Tất cả)</option>
                                    {namDanhGiaList.map(nam => {
                                        const bd = formatDate(nam.NgayBatDau);
                                        const kt = formatDate(nam.NgayKetThuc);
                                        return (
                                            <option key={nam.IdNam} value={nam.IdNam}>
                                                Năm {nam.IdNam} ({bd} - {kt})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Tên Tiêu chí (Nội dung) <span className="text-red">*</span></label>
                            <textarea name="TenTieuChi" className="form-input" value={formData.TenTieuChi || ''} onChange={handleChange} required rows="2" placeholder="Nhập nội dung tiêu chí"></textarea>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label>Mô tả chi tiết (Hướng dẫn chấm điểm)</label>
                            <textarea
                                name="MoTa"
                                className="form-input"
                                value={formData.MoTa || ''}
                                onChange={handleChange}
                                rows="2"
                                placeholder="Giải thích cách tính điểm hoặc yêu cầu chi tiết của tiêu chí">
                            </textarea>
                        </div>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Cấp đánh giá</label>
                                <select name="CapDanhGia" className="form-input" value={formData.CapDanhGia || ''} onChange={handleChange}>
                                    <option value="">Dành cho mọi cấp</option>
                                    <option value={1}>Cấp Trường</option>
                                    <option value={2}>Cấp Khoa/Viện</option>
                                    <option value={3}>Cấp Bộ môn</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Điểm Tối Đa <span className="text-red">*</span></label>
                                <input type="number" step="0.01" name="DiemToiDa" className="form-input" value={formData.DiemToiDa || ''} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Loại Thang Điểm <span className="text-red">*</span></label>
                                <select name="LoaiThangDiem" className="form-input" value={formData.LoaiThangDiem || 1} onChange={handleChange} required>
                                    <option value={1}>1 - Mức điểm rời rạc (VD: 2đ, 5đ, 10đ)</option>
                                    <option value={2}>2 - Điểm liên tục (Tự nhập số)</option>
                                    <option value={3}>3 - Chọn Có / Không</option>
                                    {/* <option value={4}>4 - Theo công thức tính toán</option> */}
                                </select>
                            </div>
                            {/* <div className="form-group">
                                <label>Công thức tính điểm {isFormula && <span className="text-red">*</span>}</label>
                                <input
                                    type="text"
                                    name="CongThucTinhDiem"
                                    className="form-input"
                                    value={formData.CongThucTinhDiem || ''}
                                    onChange={handleChange}
                                    disabled={!isFormula}
                                    required={isFormula}
                                    placeholder={isFormula ? "VD: {SoGio} * 1.5" : "Chỉ mở khi Loại thang điểm = 4"}
                                    style={{ backgroundColor: !isFormula ? '#f1f5f9' : '#fff', borderColor: isFormula ? '#e67e22' : '#ccc' }}
                                />
                            </div> */}
                        </div>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Yêu cầu bổ sung</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input type="checkbox" name="BatBuocMinhChung" id="bbMc" checked={formData.BatBuocMinhChung || false} onChange={handleChange} style={{ width: '18px', height: '18px', marginRight: '10px' }} />
                                        <label htmlFor="bbMc" style={{ margin: 0, cursor: 'pointer' }}>Bắt buộc tải lên minh chứng</label>
                                    </div>
                                    {/* <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input type="checkbox" name="CoTheDongBoScience" id="syncSc" checked={formData.CoTheDongBoScience || false} onChange={handleChange} style={{ width: '18px', height: '18px', marginRight: '10px' }} />
                                        <label htmlFor="syncSc" style={{ margin: 0, cursor: 'pointer', color: '#2980b9', fontWeight: 'bold' }}>Tự động đồng bộ từ Hệ thống Science</label>
                                    </div> */}
                                </div>
                            </div>
                            {/* <div className="form-group">
                                <label>Bảng nguồn Science {isSync && <span className="text-red">*</span>}</label>
                                <input
                                    type="text"
                                    name="BangNguonScience"
                                    className="form-input"
                                    value={formData.BangNguonScience || ''}
                                    onChange={handleChange}
                                    disabled={!isSync}
                                    required={isSync}
                                    placeholder={isSync ? "VD: Nckh_BaiBao" : "Chỉ mở khi bật Đồng bộ"}
                                    style={{ backgroundColor: !isSync ? '#f1f5f9' : '#fff', borderColor: isSync ? '#2980b9' : '#ccc' }}
                                />
                            </div> */}
                        </div>

                        <div className="form-grid-2" style={{ marginBottom: '10px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <div className="form-group">
                                <label>Thứ tự hiển thị (Trên phiếu)</label>
                                <input type="number" name="ThuTuHienThi" className="form-input" value={formData.ThuTuHienThi || 1} onChange={handleChange} />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <input type="checkbox" name="TrangThai" id="ttTC" checked={formData.TrangThai !== false} onChange={handleChange} style={{ width: '18px', height: '18px', marginRight: '10px' }} />
                                    <label htmlFor="ttTC" style={{ margin: 0, cursor: 'pointer', fontWeight: '500' }}>Kích hoạt tiêu chí này</label>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="tieuChiForm" className="btn-submit">
                        <i className="fa-solid fa-floppy-disk" style={{ marginRight: '5px' }}></i> Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_TieuChiForm;