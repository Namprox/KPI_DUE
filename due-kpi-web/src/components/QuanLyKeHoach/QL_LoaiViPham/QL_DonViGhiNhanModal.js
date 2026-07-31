import React, { useState, useEffect } from 'react';

/**
 * PUT api/loai-vi-pham/{id}/don-vi-ghi-nhan THAY THẾ toàn bộ danh sách (replace, không merge)
 * nên state phải được seed từ phân quyền hiện tại, nếu không sẽ xóa sạch quyền cũ.
 */
const QL_DonViGhiNhanModal = ({ isOpen, onClose, onSave, target, donViList, isSaving }) => {
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (target) {
            setSelectedIds((target.DonViGhiNhan || []).map((d) => d.IdDonVi));
        }
    }, [target]);

    if (!isOpen || !target) return null;

    const toggle = (idDonVi) => {
        setSelectedIds((prev) =>
            prev.includes(idDonVi) ? prev.filter((x) => x !== idDonVi) : [...prev, idDonVi]
        );
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
            <div className="modal-box form-modal-box" style={{ width: '90%', maxWidth: '600px' }}>
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, paddingRight: '20px', lineHeight: '1.4' }}>
                        Phân quyền đơn vị ghi nhận
                    </h3>
                    <button className="close-btn" onClick={onClose} style={{ fontSize: '26px', lineHeight: '1', flexShrink: 0 }}>
                        &times;
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '25px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <span className="code-pill">{target.MaLoaiViPham}</span>
                        <div style={{ marginTop: '8px', color: '#1e293b', fontWeight: '500' }}>{target.NoiDung}</div>
                    </div>

                    <div style={{ background: '#fffbe6', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '15px', fontSize: '13px', color: '#92400e' }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                        Danh sách dưới đây sẽ <strong>thay thế toàn bộ</strong> phân quyền hiện tại. Bỏ chọn hết đồng nghĩa
                        chỉ còn "Khoa chủ quản" / "Mọi đơn vị" quyết định quyền ghi nhận.
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <button type="button" className="btn-cancel" style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => setSelectedIds(donViList.map((d) => d.IdDonVi))}>
                            Chọn tất cả
                        </button>
                        <button type="button" className="btn-cancel" style={{ padding: '6px 12px', fontSize: '13px' }}
                            onClick={() => setSelectedIds([])}>
                            Bỏ chọn tất cả
                        </button>
                        <span style={{ marginLeft: 'auto', alignSelf: 'center', fontSize: '13px', color: '#64748b' }}>
                            Đã chọn {selectedIds.length}/{donViList.length}
                        </span>
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                        {donViList.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '10px' }}>Không có đơn vị nào.</div>
                        ) : (
                            donViList.map((dv) => (
                                <label key={dv.IdDonVi}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 4px', cursor: 'pointer', fontWeight: '400' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(dv.IdDonVi)}
                                        onChange={() => toggle(dv.IdDonVi)}
                                        style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                                    />
                                    <span className="code-pill" style={{ fontSize: '12px' }}>{dv.MaDonVi}</span>
                                    <span style={{ color: '#334155' }}>{dv.TenDonVi}</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn-cancel" onClick={onClose}>
                        <i className="fa-solid fa-times" style={{ marginRight: '5px' }}></i> Hủy
                    </button>
                    <button
                        type="button"
                        className="btn-submit"
                        disabled={isSaving}
                        onClick={() => onSave(target.IdLoaiViPham, selectedIds)}
                    >
                        <i className={`fa-solid ${isSaving ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} style={{ marginRight: '5px' }}></i>
                        Lưu phân quyền
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QL_DonViGhiNhanModal;
