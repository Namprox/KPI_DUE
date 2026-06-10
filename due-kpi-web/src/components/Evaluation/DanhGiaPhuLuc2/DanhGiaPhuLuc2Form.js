import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { apiFetch } from '../../../utils/api';

const DanhGiaPhuLuc2Form = ({
    criteriaList, formData, tongDiemCoBan, isSubmitting,
    trangThaiPhieu, lyDoTraVe, onScoreChange, onTextChange, onFileChange, onRemoveFile, onSubmit, onRecall,
    onNckhChange, onRemoveNckh,
    isKhoaEvaluating = false
}) => {
    const [scienceDialogVisible, setScienceDialogVisible] = useState(false);
    const [scienceArticles, setScienceArticles] = useState([]);
    const [isLoadingScience, setIsLoadingScience] = useState(false);
    const [activeTieuChiId, setActiveTieuChiId] = useState(null);

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};

    const groupedCriteria = criteriaList.reduce((groups, item) => {
        const group = (groups[item.TenNhom] || []);
        group.push(item);
        groups[item.TenNhom] = group;
        return groups;
    }, {});

    const isKhoaCriteria = (tc, groupName) => {
        if (tc.CapDanhGia === 'Khoa') return true;
        const ten = (tc.TenTieuChi || '').toLowerCase();
        const nhom = (groupName || '').toLowerCase();
        if (nhom.includes('iii') || nhom.includes('phục vụ cộng đồng')) return true;
        if (ten.includes('cấp khoa') || ten.includes('linh hoạt điều chỉnh')) return true;
        return false;
    };

    const openScienceDialog = async (idTieuChi, tenTieuChi) => {
        const userEmail = currentUser.email || currentUser.Email || '';

        if (!userEmail) {
            alert("Lỗi: Tài khoản của bạn chưa được cập nhật Email nên không thể đồng bộ NCKH!");
            return;
        }

        let dataType = 'article';
        const tenLower = (tenTieuChi || '').toLowerCase();
        if (tenLower.includes('sách') || tenLower.includes('giáo trình')) {
            dataType = 'book';
        } else if (tenLower.includes('đề tài')) {
            dataType = 'project';
        } else if (tenLower.includes('sáng chế') || tenLower.includes('giải pháp') || tenLower.includes('shtt')) {
            dataType = 'invention';
        } else if (tenLower.includes('sinh viên') || tenLower.includes('sv nckh')) {
            dataType = 'student_research';
        } else if (tenLower.includes('tham luận') || tenLower.includes('hội thảo') || tenLower.includes('diễn giả')) {
            dataType = 'conference';
        } else if (tenLower.includes('góp ý') || tenLower.includes('tham vấn')) {
            dataType = 'other_research';
        }

        setActiveTieuChiId(idTieuChi);
        setScienceDialogVisible(true);
        setIsLoadingScience(true);
        setScienceArticles([]);

        try {
            const res = await fetch(`${API_URL}/science-data?email=${encodeURIComponent(userEmail)}&type=${dataType}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            const result = await res.json();

            if (result.success) {
                setScienceArticles(result.data);
            } else {
                alert("Không thể tải dữ liệu: " + result.message);
            }
        } catch (error) {
            alert("Mất kết nối đến hệ thống NCKH!");
        } finally {
            setIsLoadingScience(false);
        }
    };

    const handleSelectArticle = (article) => {
        if (onNckhChange) onNckhChange(activeTieuChiId, article);
        setScienceDialogVisible(false);
    };

    const getXepLoai = (diem) => {
        if (diem === 0) return { text: 'Chưa đánh giá', color: '#64748b', bg: '#f8fafc', icon: 'fa-circle-question' };
        if (diem < 80) return { text: 'Không hoàn thành', color: '#ef4444', bg: '#fef2f2', icon: 'fa-circle-xmark' };
        if (diem >= 80 && diem <= 100) return { text: 'Hoàn thành', color: '#0ea5e9', bg: '#f0f9ff', icon: 'fa-circle-check' };
        return { text: 'Hoàn thành Tốt / Xuất sắc', color: '#10b981', bg: '#ecfdf5', icon: 'fa-medal' };
    };

    const xepLoai = getXepLoai(tongDiemCoBan);

    return (
        <div className="pl2-container">
            <Dialog
                header="Danh sách Minh chứng Khoa học (Đã duyệt)"
                visible={scienceDialogVisible}
                style={{ width: '700px' }}
                onHide={() => setScienceDialogVisible(false)}
            >
                {isLoadingScience ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}><i className="fa-solid fa-spinner fa-spin fa-2x color-primary"></i></div>
                ) : scienceArticles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Không tìm thấy minh chứng nào phù hợp trong hệ thống NCKH</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        {scienceArticles.map(article => (
                            <div key={article.ScienceRecordId} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <b style={{ color: '#0f172a', display: 'block', marginBottom: '5px' }}>{article.MoTa}</b>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', marginRight: '8px', fontWeight: 'bold' }}>{article.QRanking}</span>
                                        {article.JournalName && `${article.JournalName} `}({article.CreatedAt})
                                    </span>
                                </div>
                                <button
                                    className="btn-submit"
                                    style={{ padding: '6px 15px', fontSize: '12px' }}
                                    onClick={() => handleSelectArticle(article)}
                                >
                                    Chọn
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Dialog>

            <div className="pl2-header" style={{ position: 'static' }}>
                <div className="pl2-header-score">
                    <span className="pl2-header-score-label">TỔNG ĐIỂM TÍCH LŨY</span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                        <div className="pl2-header-score-value">
                            {tongDiemCoBan.toFixed(2)}
                            <span style={{ fontSize: '16px', color: '#64748b', fontWeight: 'normal', marginLeft: '5px' }}>điểm</span>
                        </div>

                        {tongDiemCoBan > 0 && (
                            <div style={{
                                background: xepLoai.bg, color: xepLoai.color, border: `1px solid ${xepLoai.color}40`,
                                padding: '6px 15px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.3s ease'
                            }}>
                                <i className={`fa-solid ${xepLoai.icon}`}></i>
                                Dự kiến: {xepLoai.text}
                            </div>
                        )}
                    </div>

                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: '500' }}>
                        (Bao gồm Điểm cơ bản + Điểm vượt trội)
                    </div>
                </div>

                <div className="pl2-header-actions">
                    {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
                        <>
                            <button onClick={() => onSubmit(1)} disabled={isSubmitting} className="btn-luu-nhap">
                                <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
                            </button>
                            <button onClick={() => onSubmit(2)} disabled={isSubmitting} className="btn-nop-phieu">
                                <i className="fa-solid fa-paper-plane"></i> Nộp Phiếu
                            </button>
                        </>
                    )}
                    {trangThaiPhieu === 2 && !isKhoaEvaluating && (
                        <button onClick={onRecall} disabled={isSubmitting} className="btn-thu-hoi">
                            <i className="fa-solid fa-rotate-left"></i> Thu hồi phiếu để sửa
                        </button>
                    )}
                    {trangThaiPhieu >= 3 && !isKhoaEvaluating && (
                        <div className="pl2-approved">
                            <i className="fa-solid fa-check-circle"></i> Phiếu đã được phê duyệt
                        </div>
                    )}
                </div>
            </div>

            {Object.keys(groupedCriteria).map((groupName, gIndex) => (
                <div key={groupName} className="pl2-group">
                    <h3 className="pl2-group-title">{groupName}</h3>
                    <div className="pl2-group-items">
                        {groupedCriteria[groupName].map((tc, index) => {
                            const isActive = formData[tc.IdTieuChi]?.DiemTuDanhGia > 0;
                            const fileList = formData[tc.IdTieuChi]?.DanhSachFile || [];
                            const nckhList = formData[tc.IdTieuChi]?.DanhSachNCKH || [];

                            const isKhoa = isKhoaCriteria(tc, groupName);
                            let disabledRadio = false;
                            let disabledText = false;

                            if (isKhoaEvaluating) {
                                disabledRadio = trangThaiPhieu >= 3 || !isKhoa;
                                disabledText = trangThaiPhieu >= 3 || !isKhoa;
                            } else {
                                disabledRadio = trangThaiPhieu >= 2 || isKhoa;
                                disabledText = trangThaiPhieu >= 2;
                            }

                            return (
                                <div key={tc.IdTieuChi} className={`pl2-criteria ${isActive ? 'active' : ''}`}>
                                    <div className="pl2-criteria-header">
                                        <span className="pl2-criteria-title">{gIndex + 1}.{index + 1}. {tc.TenTieuChi}</span>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            {isKhoa && (
                                                <span style={{ fontSize: '11px', background: '#fef08a', color: '#b45309', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                                    <i className="fa-solid fa-user-tie" style={{ marginRight: '4px' }}></i> Khoa chấm
                                                </span>
                                            )}
                                            <span className="pl2-criteria-max">Tối đa: {tc.DiemToiDa}đ</span>
                                        </div>
                                    </div>

                                    {tc.CacThangDiem?.length > 0 && (
                                        <div className="pl2-thang-diem-list">
                                            {tc.CacThangDiem.map(td => {
                                                const selected = formData[tc.IdTieuChi]?.IdThangDiemChon === td.IdThangDiem;
                                                return (
                                                    <label key={td.IdThangDiem} className={`pl2-thang-diem-item ${selected ? 'selected' : ''} ${disabledRadio ? 'disabled' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            checked={selected}
                                                            disabled={disabledRadio}
                                                            onClick={() => {
                                                                if (disabledRadio) return;
                                                                if (selected) onScoreChange(tc.IdTieuChi, null, 0);
                                                                else onScoreChange(tc.IdTieuChi, td.IdThangDiem, td.GiaTriDiem);
                                                            }}
                                                            onChange={() => { }}
                                                        />
                                                        <span className="pl2-thang-diem-text"><b>{td.GiaTriDiem}đ:</b> {td.DieuKienDiem}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <textarea
                                        className="pl2-textarea"
                                        placeholder={isKhoaEvaluating && isKhoa ? "Nhập nhận xét của Khoa..." : "Nhập diễn giải (nếu có)"}
                                        value={formData[tc.IdTieuChi]?.MoTaHoanThanh || ''}
                                        onChange={(e) => onTextChange(tc.IdTieuChi, e.target.value)}
                                        disabled={disabledText}
                                    />

                                    <div className="pl2-file-upload" style={{ marginTop: '10px' }}>
                                        {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: (fileList.length > 0 || nckhList.length > 0) ? '10px' : '0' }}>
                                                <button
                                                    type="button"
                                                    style={{ padding: '6px 15px', fontSize: '13px', borderRadius: '6px', border: '1px dashed #003399', color: '#003399', background: '#f0f7ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: '500' }}
                                                    onClick={() => document.getElementById(`file_input_${tc.IdTieuChi}`).click()}
                                                >
                                                    <i className="fa-solid fa-paperclip" style={{ marginRight: '6px' }}></i> Đính kèm tệp
                                                </button>
                                                <input
                                                    id={`file_input_${tc.IdTieuChi}`} type="file" multiple style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files);
                                                        if (files.length > 0 && onFileChange) onFileChange(tc.IdTieuChi, files);
                                                        e.target.value = null;
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    style={{ padding: '6px 15px', fontSize: '13px', borderRadius: '6px', border: '1px dashed #7e22ce', color: '#7e22ce', background: '#faf5ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: '500' }}
                                                    onClick={() => openScienceDialog(tc.IdTieuChi, tc.TenTieuChi)}
                                                >
                                                    <i className="fa-solid fa-database" style={{ marginRight: '6px' }}></i> Lấy từ NCKH
                                                </button>
                                            </div>
                                        )}

                                        {fileList.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                                {fileList.map((fileItem, fileIndex) => {
                                                    const isSavedOnServer = !(fileItem instanceof File);
                                                    const fileNameDisplay = isSavedOnServer ? (fileItem.originalName || fileItem.fileName) : fileItem.name;
                                                    return (
                                                        <div key={fileIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontSize: '13px', color: '#15803d', display: 'flex', alignItems: 'center', background: '#dcfce3', padding: '5px 12px', borderRadius: '20px', fontWeight: '500' }}>
                                                                <i className="fa-solid fa-file-circle-check" style={{ marginRight: '6px' }}></i> {fileNameDisplay}
                                                            </span>
                                                            {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
                                                                <button type="button" onClick={() => onRemoveFile(tc.IdTieuChi, fileIndex)} style={{ fontSize: '13px', color: '#ef4444', background: '#fef2f2', padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', cursor: 'pointer' }}>
                                                                    <i className="fa-solid fa-xmark"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {nckhList.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {nckhList.map((nckhItem, nckhIndex) => (
                                                    <div key={nckhIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '13px', color: '#6b21a8', display: 'flex', alignItems: 'center', background: '#f3e8ff', padding: '5px 12px', borderRadius: '20px', fontWeight: '500', border: '1px solid #e9d5ff' }}>
                                                            <i className="fa-solid fa-book-open" style={{ marginRight: '6px' }}></i>
                                                            [{nckhItem.QRanking}] {nckhItem.MoTa}
                                                        </span>
                                                        {trangThaiPhieu <= 1 && !isKhoaEvaluating && onRemoveNckh && (
                                                            <button type="button" onClick={() => onRemoveNckh(tc.IdTieuChi, nckhIndex)} style={{ fontSize: '13px', color: '#ef4444', background: '#fef2f2', padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', cursor: 'pointer' }}>
                                                                <i className="fa-solid fa-xmark"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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