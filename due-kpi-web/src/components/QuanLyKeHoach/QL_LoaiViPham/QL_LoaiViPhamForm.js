import React from 'react';
import SearchSelect from '../../Common/SearchSelect';

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' };
const hintStyle = { fontSize: '12px', color: '#64748b', marginTop: '5px' };

const QL_LoaiViPhamForm = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    setFormData,
    isEditing,
    nhomList,
    donViList,
    isSaving,
}) => {
    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSelect = (name) => (value) => setFormData({ ...formData, [name]: value });

    const handleCheck = (e) => {
        const { name, checked } = e.target;
        setFormData({ ...formData, [name]: checked });
    };

    const toggleDonVi = (idDonVi) => {
        const current = formData.IdDonViGhiNhanList || [];
        setFormData({
            ...formData,
            IdDonViGhiNhanList: current.includes(idDonVi)
                ? current.filter((x) => x !== idDonVi)
                : [...current, idDonVi],
        });
    };

    const moiDonVi = !!formData.ChoPhepMoiDonVi;
    const noiDungLen = (formData.NoiDung || '').length;
    const ghiChuLen = (formData.GhiChu || '').length;

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '760px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        {isEditing ? 'Cập nhật loại vi phạm' : 'Thêm loại vi phạm mới'}
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0 }}>
                        &times;
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '25px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <form id="loaiViPhamForm" onSubmit={onSubmit}>
                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label style={labelStyle}>Nhóm vi phạm <span className="text-red">*</span></label>
                                <SearchSelect
                                    name="IdNhomVp"
                                    value={formData.IdNhomVp || ''}
                                    onChange={handleSelect('IdNhomVp')}
                                    options={nhomList.map((n) => ({ value: n.IdNhomVp, label: n.TenNhom }))}
                                    placeholder="-- Chọn nhóm --"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Mã loại vi phạm <span className="text-red">*</span></label>
                                <input
                                    type="text"
                                    name="MaLoaiViPham"
                                    className="form-input"
                                    value={formData.MaLoaiViPham || ''}
                                    onChange={handleChange}
                                    maxLength={50}
                                    placeholder="VD: VP_GIOGIANG_05"
                                    required
                                />
                                <div style={hintStyle}>Không trùng với mã đã có, tối đa 50 ký tự.</div>
                            </div>
                        </div>

                        <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                            <div className="form-group">
                                <label style={labelStyle}>Điểm trừ mặc định <span className="text-red">*</span></label>
                                <input
                                    type="number"
                                    name="DiemTruMacDinh"
                                    className="form-input"
                                    value={formData.DiemTruMacDinh ?? ''}
                                    onChange={handleChange}
                                    step="0.5"
                                    min="0"
                                    required
                                />
                                <div style={hintStyle}>Theo quy định, mặc định 1 điểm / 1 nội dung.</div>
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Thứ tự hiển thị</label>
                                <input
                                    type="text"
                                    name="ThuTuHienThi"
                                    className="form-input"
                                    value={formData.ThuTuHienThi ?? ''}
                                    onChange={handleChange}
                                    placeholder="VD: 0"
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Nội dung vi phạm <span className="text-red">*</span></label>
                            <textarea
                                name="NoiDung"
                                className="form-input"
                                value={formData.NoiDung || ''}
                                onChange={handleChange}
                                rows="3"
                                maxLength={500}
                                placeholder="VD: Đi dạy trễ giờ 25 phút / 2 lần"
                                required
                            />
                            <div style={{ ...hintStyle, textAlign: 'right' }}>{noiDungLen}/500</div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Hồ sơ kèm theo</label>
                            <input
                                type="text"
                                name="HoSoKemTheo"
                                className="form-input"
                                value={formData.HoSoKemTheo || ''}
                                onChange={handleChange}
                                maxLength={200}
                                placeholder="VD: Biên bản / hồ sơ kiểm tra / email thông báo"
                            />
                            <div style={hintStyle}>
                                Nếu điền, người ghi nhận sẽ <strong>bắt buộc</strong> phải tải lên tệp PDF biên bản/hồ sơ.
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px', padding: '14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: '500' }}>
                                <input type="checkbox" name="ChoPhepKhoaChuQuan" checked={!!formData.ChoPhepKhoaChuQuan}
                                    onChange={handleCheck} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                Khoa chủ quản được ghi nhận
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: '500' }}>
                                <input type="checkbox" name="ChoPhepMoiDonVi" checked={moiDonVi}
                                    onChange={handleCheck} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                Mọi đơn vị chủ trì được ghi nhận
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: '500' }}>
                                <input type="checkbox" name="TrangThai" checked={!!formData.TrangThai}
                                    onChange={handleCheck} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                Đang sử dụng
                            </label>
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Đơn vị được ghi nhận cố định</label>
                            {moiDonVi && (
                                <div style={{ fontSize: '13px', color: '#92400e', background: '#fffbe6', border: '1px solid #fde68a', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px' }}>
                                    <i className="fa-solid fa-circle-info" style={{ marginRight: '6px' }}></i>
                                    Đang bật "Mọi đơn vị chủ trì" nên danh sách cố định không còn tác dụng.
                                </div>
                            )}
                            <div style={{
                                maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0',
                                borderRadius: '8px', padding: '10px',
                                opacity: moiDonVi ? 0.5 : 1, pointerEvents: moiDonVi ? 'none' : 'auto',
                            }}>
                                {donViList.length === 0 ? (
                                    <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có đơn vị nào.</div>
                                ) : (
                                    donViList.map((dv) => (
                                        <label key={dv.IdDonVi}
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 4px', cursor: 'pointer', fontWeight: '400', margin: 0 }}>
                                            <input
                                                type="checkbox"
                                                checked={(formData.IdDonViGhiNhanList || []).includes(dv.IdDonVi)}
                                                onChange={() => toggleDonVi(dv.IdDonVi)}
                                                disabled={moiDonVi}
                                                style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                                            />
                                            <span className="code-pill" style={{ fontSize: '12px' }}>{dv.MaDonVi}</span>
                                            <span style={{ color: '#334155' }}>{dv.TenDonVi}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={labelStyle}>Ghi chú</label>
                            <textarea
                                name="GhiChu"
                                className="form-input"
                                value={formData.GhiChu || ''}
                                onChange={handleChange}
                                rows="2"
                                maxLength={500}
                            />
                            <div style={{ ...hintStyle, textAlign: 'right' }}>{ghiChuLen}/500</div>
                        </div>
                    </form>
                </div>

                <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button type="submit" form="loaiViPhamForm" className="btn-submit" disabled={isSaving}>
                        <i className={`fa-solid ${isSaving ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} style={{ marginRight: '5px' }}></i>
                        Lưu dữ liệu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_LoaiViPhamForm;
