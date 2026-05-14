import React from 'react';

const DanhGiaPhuLuc2Form = ({
    criteriaList, formData, tongDiemCoBan, isSubmitting,
    trangThaiPhieu, lyDoTraVe, onScoreChange, onTextChange, onSubmit, onRecall
}) => {
    const groupedCriteria = criteriaList.reduce((groups, item) => {
        const group = (groups[item.TenNhom] || []);
        group.push(item);
        groups[item.TenNhom] = group;
        return groups;
    }, {});

    return (
        <div className="pl2-container">
            <div className="pl2-header" style={{ position: 'static' }}>
                <div className="pl2-header-score">
                    <span className="pl2-header-score-label">TỔNG ĐIỂM TỰ ĐÁNH GIÁ</span>
                    <div className="pl2-header-score-value">
                        {tongDiemCoBan.toFixed(2)} <span>/ 100</span>
                    </div>
                </div>

                <div className="pl2-header-actions">
                    {trangThaiPhieu <= 1 && (
                        <>
                            <button
                                onClick={() => onSubmit(1)}
                                disabled={isSubmitting}
                                className="btn-luu-nhap"
                            >
                                <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
                            </button>
                            <button
                                onClick={() => onSubmit(2)}
                                disabled={isSubmitting}
                                className="btn-nop-phieu"
                            >
                                <i className="fa-solid fa-paper-plane"></i> Nộp Phiếu
                            </button>
                        </>
                    )}

                    {trangThaiPhieu === 2 && (
                        <button
                            onClick={onRecall}
                            disabled={isSubmitting}
                            className="btn-thu-hoi"
                        >
                            <i className="fa-solid fa-rotate-left"></i> Thu hồi phiếu để sửa
                        </button>
                    )}

                    {trangThaiPhieu >= 3 && (
                        <div className="pl2-approved">
                            <i className="fa-solid fa-check-circle"></i> Phiếu đã được phê duyệt
                        </div>
                    )}
                </div>
            </div>

            {trangThaiPhieu === 1 && lyDoTraVe && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '16px 20px', borderRadius: '10px', marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'flex-start', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.1)' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '24px', color: '#ef4444', marginTop: '2px' }}></i>
                    <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 'bold' }}>Phiếu đánh giá bị yêu cầu làm lại!</h4>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{lyDoTraVe}</p>
                    </div>
                </div>
            )}

            {Object.keys(groupedCriteria).map((groupName, gIndex) => (
                <div key={groupName} className="pl2-group">
                    <h3 className="pl2-group-title">{groupName}</h3>
                    <div className="pl2-group-items">
                        {groupedCriteria[groupName].map((tc, index) => {
                            const isActive = formData[tc.IdTieuChi]?.DiemTuDanhGia > 0;
                            const isMissingEvidence = tc.BatBuocMinhChung && formData[tc.IdTieuChi]?.DiemTuDanhGia > 0
                                && !formData[tc.IdTieuChi]?.MoTaHoanThanh && trangThaiPhieu <= 1;

                            return (
                                <div
                                    key={tc.IdTieuChi}
                                    className={`pl2-criteria ${isActive ? 'active' : ''}`}
                                >
                                    <div className="pl2-criteria-header">
                                        <span className="pl2-criteria-title">
                                            {gIndex + 1}.{index + 1}. {tc.TenTieuChi}
                                        </span>
                                        <span className="pl2-criteria-max">
                                            Tối đa: {tc.DiemToiDa}đ
                                        </span>
                                    </div>

                                    {tc.CacThangDiem?.length > 0 && (
                                        <div className="pl2-thang-diem-list">
                                            {tc.CacThangDiem.map(td => {
                                                const selected = formData[tc.IdTieuChi]?.IdThangDiemChon === td.IdThangDiem;
                                                const disabled = trangThaiPhieu >= 2;
                                                return (
                                                    <label
                                                        key={td.IdThangDiem}
                                                        className={`pl2-thang-diem-item ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`tc_${tc.IdTieuChi}`}
                                                            checked={selected}
                                                            disabled={disabled}
                                                            onClick={() => {
                                                                if (disabled) return;
                                                                if (selected) {
                                                                    onScoreChange(tc.IdTieuChi, null, 0);
                                                                } else {
                                                                    onScoreChange(tc.IdTieuChi, td.IdThangDiem, td.GiaTriDiem);
                                                                }
                                                            }}
                                                            onChange={() => { }}
                                                        />
                                                        <span className="pl2-thang-diem-text">
                                                            <b>{td.GiaTriDiem}đ:</b> {td.DieuKienDiem}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <textarea
                                        className={`pl2-textarea ${isMissingEvidence ? 'error' : ''}`}
                                        placeholder={tc.BatBuocMinhChung ? "Bắt buộc nhập giải trình/minh chứng" : "Nhập diễn giải (nếu có)"}
                                        value={formData[tc.IdTieuChi]?.MoTaHoanThanh || ''}
                                        onChange={(e) => onTextChange(tc.IdTieuChi, e.target.value)}
                                        disabled={trangThaiPhieu >= 2}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DanhGiaPhuLuc2Form;