import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';

const DanhGiaPhuLuc2Form = ({
    criteriaList, formData, tongDiemCoBan, isSubmitting,
    trangThaiPhieu, lyDoTraVe, onScoreChange, onTextChange, onFileChange, onRemoveFile, onSubmit, onRecall,
    // Cần thêm 2 hàm xử lý NCKH ở file cha truyền xuống
    onNckhChange, onRemoveNckh
}) => {
    const [scienceDialogVisible, setScienceDialogVisible] = useState(false);
    const [scienceArticles, setScienceArticles] = useState([]);
    const [isLoadingScience, setIsLoadingScience] = useState(false);
    const [activeTieuChiId, setActiveTieuChiId] = useState(null);

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

    const groupedCriteria = criteriaList.reduce((groups, item) => {
        const group = (groups[item.TenNhom] || []);
        group.push(item);
        groups[item.TenNhom] = group;
        return groups;
    }, {});

    // Gọi API lấy bài báo từ DueScienceDB
    // Gọi API lấy bài báo từ DueScienceDB
    const openScienceDialog = async (idTieuChi) => {
        // ĐÃ SỬA: Quét cả email thường và hoa để đảm bảo không bị rỗng
        const userEmail = currentUser.email || currentUser.Email || '';
        
        if (!userEmail) {
            alert("Lỗi: Tài khoản của bạn chưa được cập nhật Email nên không thể đồng bộ NCKH!");
            return;
        }

        setActiveTieuChiId(idTieuChi);
        setScienceDialogVisible(true);
        setIsLoadingScience(true);
        
        try {
            const res = await fetch(`${API_URL}/science-data?email=${encodeURIComponent(userEmail)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            const result = await res.json();
            
            if (result.success) {
                setScienceArticles(result.data);
            } else {
                console.error("Lỗi từ Backend:", result.message);
                alert("Không thể tải bài báo: " + result.message);
            }
        } catch (error) {
            console.error("Lỗi lấy dữ liệu NCKH:", error);
            alert("Mất kết nối đến hệ thống NCKH!");
        } finally {
            setIsLoadingScience(false);
        }
    };

    const handleSelectArticle = (article) => {
        if (onNckhChange) onNckhChange(activeTieuChiId, article);
        setScienceDialogVisible(false);
    };

    return (
        <div className="pl2-container">
            {/* POPUP CHỌN BÀI BÁO NCKH */}
            <Dialog 
                header="Danh sách Bài báo Khoa học (Đã duyệt)" 
                visible={scienceDialogVisible} 
                style={{ width: '700px' }} 
                onHide={() => setScienceDialogVisible(false)}
            >
                {isLoadingScience ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}><i className="fa-solid fa-spinner fa-spin fa-2x color-primary"></i></div>
                ) : scienceArticles.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Không tìm thấy bài báo nào trong hệ thống NCKH.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                        {scienceArticles.map(article => (
                            <div key={article.ScienceRecordId} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <b style={{ color: '#0f172a', display: 'block', marginBottom: '5px' }}>{article.MoTa}</b>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                        <span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', marginRight: '8px', fontWeight: 'bold' }}>{article.QRanking}</span>
                                        {article.JournalName} ({article.CreatedAt})
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
                    <span className="pl2-header-score-label">TỔNG ĐIỂM TỰ ĐÁNH GIÁ</span>
                    <div className="pl2-header-score-value">
                        {tongDiemCoBan.toFixed(2)} <span>/ 100</span>
                    </div>
                </div>

                <div className="pl2-header-actions">
                    {trangThaiPhieu <= 1 && (
                        <>
                            <button onClick={() => onSubmit(1)} disabled={isSubmitting} className="btn-luu-nhap">
                                <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
                            </button>
                            <button onClick={() => onSubmit(2)} disabled={isSubmitting} className="btn-nop-phieu">
                                <i className="fa-solid fa-paper-plane"></i> Nộp Phiếu
                            </button>
                        </>
                    )}
                    {trangThaiPhieu === 2 && (
                        <button onClick={onRecall} disabled={isSubmitting} className="btn-thu-hoi">
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

            {Object.keys(groupedCriteria).map((groupName, gIndex) => (
                <div key={groupName} className="pl2-group">
                    <h3 className="pl2-group-title">{groupName}</h3>
                    <div className="pl2-group-items">
                        {groupedCriteria[groupName].map((tc, index) => {
                            const isActive = formData[tc.IdTieuChi]?.DiemTuDanhGia > 0;
                            const fileList = formData[tc.IdTieuChi]?.DanhSachFile || [];
                            const nckhList = formData[tc.IdTieuChi]?.DanhSachNCKH || []; // Danh sách NCKH
                            
                            return (
                                <div key={tc.IdTieuChi} className={`pl2-criteria ${isActive ? 'active' : ''}`}>
                                    <div className="pl2-criteria-header">
                                        <span className="pl2-criteria-title">{gIndex + 1}.{index + 1}. {tc.TenTieuChi}</span>
                                        <span className="pl2-criteria-max">Tối đa: {tc.DiemToiDa}đ</span>
                                    </div>

                                    {tc.CacThangDiem?.length > 0 && (
                                        <div className="pl2-thang-diem-list">
                                            {tc.CacThangDiem.map(td => {
                                                const selected = formData[tc.IdTieuChi]?.IdThangDiemChon === td.IdThangDiem;
                                                const disabled = trangThaiPhieu >= 2;
                                                return (
                                                    <label key={td.IdThangDiem} className={`pl2-thang-diem-item ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            checked={selected}
                                                            disabled={disabled}
                                                            onClick={() => {
                                                                if (disabled) return;
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
                                        placeholder="Nhập diễn giải (nếu có)"
                                        value={formData[tc.IdTieuChi]?.MoTaHoanThanh || ''}
                                        onChange={(e) => onTextChange(tc.IdTieuChi, e.target.value)}
                                        disabled={trangThaiPhieu >= 2}
                                    />

                                    <div className="pl2-file-upload" style={{ marginTop: '10px' }}>
                                        {/* CỤM NÚT ĐÍNH KÈM */}
                                        {trangThaiPhieu <= 1 && (
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

                                                {/* ĐÃ THÊM: Nút Lấy từ NCKH */}
                                                <button
                                                    type="button"
                                                    style={{ padding: '6px 15px', fontSize: '13px', borderRadius: '6px', border: '1px dashed #7e22ce', color: '#7e22ce', background: '#faf5ff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight: '500' }}
                                                    onClick={() => openScienceDialog(tc.IdTieuChi)}
                                                >
                                                    <i className="fa-solid fa-database" style={{ marginRight: '6px' }}></i> Lấy từ NCKH
                                                </button>
                                            </div>
                                        )}

                                        {/* HIỂN THỊ DANH SÁCH FILE CỨNG (MÀU XANH) */}
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
                                                            {trangThaiPhieu <= 1 && (
                                                                <button type="button" onClick={() => onRemoveFile(tc.IdTieuChi, fileIndex)} style={{ fontSize: '13px', color: '#ef4444', background: '#fef2f2', padding: '5px 10px', borderRadius: '6px', border: '1px solid #fecaca', cursor: 'pointer' }}>
                                                                    <i className="fa-solid fa-xmark"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* HIỂN THỊ DANH SÁCH BÀI BÁO NCKH (MÀU TÍM) */}
                                        {nckhList.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {nckhList.map((nckhItem, nckhIndex) => (
                                                    <div key={nckhIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '13px', color: '#6b21a8', display: 'flex', alignItems: 'center', background: '#f3e8ff', padding: '5px 12px', borderRadius: '20px', fontWeight: '500', border: '1px solid #e9d5ff' }}>
                                                            <i className="fa-solid fa-book-open" style={{ marginRight: '6px' }}></i> 
                                                            [{nckhItem.QRanking}] {nckhItem.MoTa}
                                                        </span>
                                                        {trangThaiPhieu <= 1 && onRemoveNckh && (
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