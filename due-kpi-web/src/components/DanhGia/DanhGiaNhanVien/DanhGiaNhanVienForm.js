import React, { useMemo } from "react";
import "../../../css/DanhGia/DanhGiaPhuLuc2.css";

const formatDiem = (value) => {
    const n = Number(value) || 0;
    return n % 1 === 0 ? String(n) : n.toFixed(2);
};

const DanhGiaNhanVienForm = ({
    criteriaList = [],
    formData = {},
    onScoreChange,
    onTextChange,
    onFileChange,
    onRemoveFile,
    onXemMinhChung,
    choPhepNhap = true,
    tongDiemTichLuy = 0
}) => {
    const sections = useMemo(() => {
        if (!criteriaList.length) return [];
        const loaiMap = new Map();
        criteriaList.forEach((tc) => {
            const loai = Number(tc.LoaiNhom) || 1;
            if (!loaiMap.has(loai)) loaiMap.set(loai, { tenNhom: tc.TenNhomCha || "Nhóm tiêu chí", dong: [] });
            loaiMap.get(loai).dong.push(tc);
        });

        return [...loaiMap.entries()].sort(([a], [b]) => a - b).map(([loai, data]) => ({
            loaiNhom: loai,
            tenNhom: data.tenNhom,
            items: data.dong,
        }));
    }, [criteriaList]);

    const totalCount = criteriaList.length;
    const answeredCount = criteriaList.filter((tc) => formData[tc.IdTieuChi]?.DiemTuDanhGia != null).length;
    const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

    return (
        <div className="pl2-container">
            <div className="pl2-header">
                <div className="pl2-header-score">
                    <span className="pl2-header-score-label">
                        <i className="fa-solid fa-chart-line"></i> TỔNG ĐIỂM TÍCH LŨY
                    </span>
                    <div className="pl2-header-score-row">
                        <div className="pl2-header-score-value">
                            {formatDiem(tongDiemTichLuy)}
                            <span className="pl2-header-score-unit">điểm</span>
                        </div>
                    </div>
                    <div className="pl2-progress">
                        <div className="pl2-progress-bar">
                            <div className="pl2-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <div className="pl2-progress-label">
                            Đã đánh giá <b>{answeredCount}</b>/{totalCount} tiêu chí
                        </div>
                    </div>
                </div>
            </div>

            {sections.map((section, sIndex) => {
                const isDiemTru = section.loaiNhom === 3;
                const isVuotTroi = section.loaiNhom === 2;

                return (
                    <div key={section.loaiNhom || sIndex} className="pl2-section">
                        <div className={`pl2-section-header ${isVuotTroi ? "vuot-troi" : isDiemTru ? "tru-diem" : ""}`} style={isDiemTru ? { backgroundColor: '#fef2f2', color: '#b91c1c', borderLeftColor: '#ef4444' } : {}}>
                            <h3 className="pl2-section-title">
                                <i className={`fa-solid ${isVuotTroi ? "fa-award" : isDiemTru ? "fa-triangle-exclamation" : "fa-list-check"}`}></i>
                                {section.tenNhom}
                            </h3>
                        </div>

                        <div className="pl2-section-body">
                            <div className="pl2-group-items">
                                {section.items.map((tc, index) => {
                                    const currentScore = formData[tc.IdTieuChi]?.DiemTuDanhGia;
                                    const hasScore = currentScore != null;
                                    const fileList = formData[tc.IdTieuChi]?.DanhSachFile || [];

                                    return (
                                        <div key={tc.IdTieuChi} className={`pl2-criteria ${hasScore ? "active" : ""}`}>
                                            <div className="pl2-criteria-header">
                                                <div className="pl2-criteria-header-main">
                                                    <span className="pl2-criteria-title">
                                                        {index + 1}. {tc.TenTieuChi}
                                                    </span>
                                                    {tc.MoTa && <div className="pl2-criteria-desc">{tc.MoTa}</div>}
                                                </div>
                                                <div className="pl2-criteria-header-side">
                                                    {hasScore && (
                                                        <span className="pl2-criteria-score">
                                                            <i className="fa-solid fa-circle-check"></i> {formatDiem(currentScore)}đ
                                                        </span>
                                                    )}
                                                    <span className="pl2-criteria-max" style={{ color: isDiemTru ? '#ef4444' : '#64748b' }}>
                                                        {isDiemTru ? "Điểm trừ" : `Tối đa: ${tc.DiemToiDa}đ`}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pl2-score-input-container">
                                                <span className="pl2-score-input-label">
                                                    {isDiemTru ? "Nhập điểm trừ:" : "Nhập điểm:"}
                                                </span>
                                                <input
                                                    type="number"
                                                    className="pl2-score-input"
                                                    placeholder={isDiemTru ? "VD: -10" : `Tối đa ${tc.DiemToiDa}`}
                                                    value={currentScore ?? ""}
                                                    max={isDiemTru ? 0 : tc.DiemToiDa}
                                                    min={isDiemTru ? undefined : 0}
                                                    step="any"
                                                    disabled={!choPhepNhap}
                                                    onChange={(e) => {
                                                        if (!choPhepNhap) return;
                                                        const val = e.target.value;
                                                        if (val === "") {
                                                            onScoreChange(tc.IdTieuChi, "");
                                                            return;
                                                        }
                                                        let num = parseFloat(val);
                                                        if (isNaN(num)) num = 0;
                                                        if (isDiemTru && num > 0) num = 0;
                                                        if (!isDiemTru && num < 0) num = 0;
                                                        if (!isDiemTru && tc.DiemToiDa && num > tc.DiemToiDa) num = tc.DiemToiDa;
                                                        onScoreChange(tc.IdTieuChi, num);
                                                    }}
                                                />

                                                {tc.IdTieuChi === 102 && choPhepNhap && (
                                                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>
                                                            <i className="fa-solid fa-calculator"></i> Máy tính điểm nhanh:
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                            <span style={{ fontSize: '13px', color: '#334155' }}>Số lần đi làm muộn (-1đ/lần):</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <button type="button" style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }} onClick={() => {
                                                                    const hienTai = Number(currentScore) || 30;
                                                                    if (hienTai < 30) onScoreChange(tc.IdTieuChi, hienTai + 1);
                                                                }}>-</button>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>
                                                                    {currentScore !== undefined && currentScore !== "" ? 30 - Number(currentScore) : 0}
                                                                </span>
                                                                <button type="button" style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }} onClick={() => {
                                                                    const hienTai = currentScore !== undefined && currentScore !== "" ? Number(currentScore) : 30;
                                                                    if (hienTai > 0) onScoreChange(tc.IdTieuChi, hienTai - 1);
                                                                }}>+</button>
                                                            </div>
                                                        </div>

                                                        <div style={{ fontSize: '11px', color: '#10b981', fontStyle: 'italic' }}>
                                                            * Bấm (+) để tăng số lần vi phạm, hệ thống sẽ tự động trừ vào tổng điểm tối đa (30đ) ở ô bên trên.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <textarea
                                                className="pl2-textarea"
                                                placeholder="Nhập diễn giải / ghi chú cho tiêu chí này (nếu có)..."
                                                value={formData[tc.IdTieuChi]?.MoTaHoanThanh || ""}
                                                disabled={!choPhepNhap}
                                                onChange={(e) => onTextChange(tc.IdTieuChi, e.target.value)}
                                            />

                                            {isVuotTroi && (
                                                <div className="pl2-file-upload" style={{ marginTop: '15px' }}>
                                                    {choPhepNhap && (
                                                        <div className="pl2-file-actions">
                                                            <button
                                                                type="button"
                                                                className="btn-attach-file"
                                                                onClick={() => document.getElementById(`file_input_${tc.IdTieuChi}`).click()}
                                                                style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: '500' }}
                                                            >
                                                                <i className="fa-solid fa-paperclip" style={{ color: '#3b82f6' }}></i> Đính kèm minh chứng PDF
                                                            </button>
                                                            <input
                                                                id={`file_input_${tc.IdTieuChi}`}
                                                                type="file"
                                                                multiple
                                                                accept="application/pdf,.pdf"
                                                                style={{ display: "none" }}
                                                                onChange={(e) => {
                                                                    const files = Array.from(e.target.files);
                                                                    if (files.length > 0 && onFileChange) {
                                                                        onFileChange(tc.IdTieuChi, files);
                                                                    }
                                                                    e.target.value = null;
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {fileList.length > 0 && (
                                                        <div className="pl2-chip-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                                            {fileList.map((fileItem, fileIndex) => {
                                                                const isSavedOnServer = !(fileItem instanceof File);
                                                                const fileNameDisplay = isSavedOnServer ? (fileItem.originalName || fileItem.fileName) : fileItem.name;

                                                                const mc = isSavedOnServer ? {
                                                                    IdMinhChung: fileItem.idMinhChung,
                                                                    TenFileGoc: fileNameDisplay,
                                                                    DuongDan: fileItem.fileName,
                                                                    LoaiFile: fileItem.fileType,
                                                                    KichThuocKb: fileItem.fileSizeKB || 0
                                                                } : null;
                                                                const xemDuoc = !!(mc && mc.IdMinhChung && onXemMinhChung);

                                                                return (
                                                                    <div key={fileIndex} className="pl2-chip-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f1f5f9', padding: '8px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                                        {xemDuoc ? (
                                                                            <button
                                                                                type="button"
                                                                                className="pl2-chip pl2-chip-file pl2-chip-xem"
                                                                                onClick={() => onXemMinhChung(mc)}
                                                                                title={`Xem trước / tải về: ${fileNameDisplay}`}
                                                                                style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', padding: 0 }}
                                                                            >
                                                                                <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '16px' }}></i>
                                                                                {fileNameDisplay}
                                                                            </button>
                                                                        ) : (
                                                                            <span className="pl2-chip pl2-chip-file" style={{ color: '#475569', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                                                                                <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '16px' }}></i>
                                                                                {fileNameDisplay}
                                                                                {!isSavedOnServer && <span style={{ fontSize: '11px', color: '#10b981', fontStyle: 'italic', marginLeft: '5px' }}>(Sẽ tải lên khi lưu)</span>}
                                                                            </span>
                                                                        )}

                                                                        {choPhepNhap && onRemoveFile && (
                                                                            <button
                                                                                type="button"
                                                                                className="pl2-chip-remove"
                                                                                title="Xóa tệp"
                                                                                onClick={() => onRemoveFile(tc.IdTieuChi, fileIndex)}
                                                                                style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#ef4444', cursor: 'pointer', marginLeft: 'auto', width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                            >
                                                                                <i className="fa-solid fa-xmark"></i>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DanhGiaNhanVienForm;