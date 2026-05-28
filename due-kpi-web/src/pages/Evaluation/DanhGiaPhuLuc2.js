import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../css/Pages.css';
import '../../css/Evaluation/DanhGiaPhuLuc2.css';
import DanhGiaPhuLuc2Form from '../../components/Evaluation/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form';
import { Toast } from 'primereact/toast';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { apiFetch } from '../../utils/api';

// Hàm hỗ trợ convert ngày tháng từ C#
const parseNetDate = (dateString) => {
    if (!dateString) return null;
    if (typeof dateString === 'string' && dateString.includes('/Date(')) {
        return new Date(parseInt(dateString.match(/\d+/)[0], 10));
    }
    return new Date(dateString);
};

const DanhGiaPhuLuc2 = () => {
    const [criteriaList, setCriteriaList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({});
    const [tongDiemCoBan, setTongDiemCoBan] = useState(0);

    const [trangThaiPhieu, setTrangThaiPhieu] = useState(0);
    const [lyDoTraVe, setLyDoTraVe] = useState("");

    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogType, setDialogType] = useState('');

    const toast = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};

    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const yearParam = queryParams.get('year');

    const [listYears, setListYears] = useState([]);
    const [yearDetails, setYearDetails] = useState([]); 
    const [selectedYear, setSelectedYear] = useState(yearParam ? parseInt(yearParam) : new Date().getFullYear());

    useEffect(() => {
        const fetchYears = async () => {
            const currentRealYear = new Date().getFullYear();
            try {
                const res = await apiFetch('nam-danh-gia');
                const result = await res.json();

                if (Array.isArray(result) && result.length > 0) {
                    setYearDetails(result); 
                    const years = result.map(item => item.IdNam || item.id_nam || item.NamHoc || item.nam).filter(y => y != null && !isNaN(y));
                    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

                    if (uniqueYears.length > 0) {
                        setListYears(uniqueYears);

                        if (!yearParam) {
                            setSelectedYear(uniqueYears[0]);
                            navigate(`/danh-gia-phu-luc-2?year=${uniqueYears[0]}`, { replace: true });
                        }
                    } else {
                        setListYears([currentRealYear]);
                    }
                } else {
                    setListYears([currentRealYear]);
                }
            } catch (err) {
                console.error("Lỗi lấy danh sách năm:", err);
                setListYears([currentRealYear]);
            }
        };

        fetchYears();
    }, []);

    useEffect(() => {
        const fetchScoringData = async () => {
            setIsLoading(true);
            try {
                const endpoint = `scoring?idNam=${selectedYear}&idNhanVien=${currentUser.IdNhanVien || 0}`;
                const res = await apiFetch(endpoint);

                if (!res.ok) throw new Error("Network response was not ok");
                const result = await res.json();

                setFormData({});
                setTongDiemCoBan(0);
                setTrangThaiPhieu(0);
                setLyDoTraVe("");

                if (result.success) {
                    setCriteriaList(result.data || []);

                    if (result.phieu) {
                        setTrangThaiPhieu(result.phieu.TrangThai);
                        setLyDoTraVe(result.phieu.LyDoTraVe || "");

                        if (result.chiTiet && result.chiTiet.length > 0) {
                            const initialFormData = {};
                            result.chiTiet.forEach(item => {
                                if (!initialFormData[item.IdTieuChi]) {
                                    initialFormData[item.IdTieuChi] = {
                                        IdTieuChi: item.IdTieuChi,
                                        IdThangDiemChon: item.IdThangDiemChon,
                                        DiemTuDanhGia: item.DiemTuDanhGia,
                                        MoTaHoanThanh: item.MoTaHoanThanh,
                                        DanhSachFile: [],
                                        DanhSachNCKH: [] // Khởi tạo mảng rỗng chứa bài báo khoa học
                                    };
                                }

                                if (item.TenFile) {
                                    initialFormData[item.IdTieuChi].DanhSachFile.push({
                                        fileName: item.TenFile,
                                        originalName: item.TenFileGoc || item.TenFile,
                                        fileType: item.LoaiFile,
                                        fileSizeKB: item.KichThuocKB
                                    });
                                }

                                // Gợi ý: Nếu API đổ dữ liệu liên kết khoa học về, ta sẽ push vào DanhSachNCKH ở đây
                                if (item.ScienceRecordId) {
                                    initialFormData[item.IdTieuChi].DanhSachNCKH.push({
                                        ScienceRecordId: item.ScienceRecordId,
                                        BangNguon: item.BangNguon || 'ScientificArticles',
                                        MoTa: item.MoTaNckh || ''
                                    });
                                }
                            });
                            setFormData(initialFormData);
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi API Tải dữ liệu đánh giá:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (listYears.length > 0) {
            fetchScoringData();
        }
    }, [selectedYear, currentUser.IdNhanVien, listYears.length]);

    const activeYear = yearDetails.find(y => y.IdNam === selectedYear);
    let isWithinTime = false;
    let timeMessage = "";

    if (activeYear) {
        const now = new Date().getTime();
        const start = activeYear.NgayMoTuDanhGia ? parseNetDate(activeYear.NgayMoTuDanhGia).getTime() : 0;
        const end = activeYear.NgayDongTuDanhGia ? parseNetDate(activeYear.NgayDongTuDanhGia).setHours(23, 59, 59, 999) : 0;

        if (!activeYear.NgayMoTuDanhGia || !activeYear.NgayDongTuDanhGia) {
            timeMessage = "Hệ thống chưa thiết lập lịch tự đánh giá cho năm này.";
        } else if (now < start) {
            timeMessage = `Chưa đến thời gian mở hệ thống. Lịch tự đánh giá sẽ bắt đầu từ ${parseNetDate(activeYear.NgayMoTuDanhGia).toLocaleDateString('vi-VN')}.`;
        } else if (now > end) {
            timeMessage = `Đã hết hạn tự đánh giá! Hệ thống đã đóng vào lúc 23:59 ngày ${parseNetDate(activeYear.NgayDongTuDanhGia).toLocaleDateString('vi-VN')}.`;
        } else {
            isWithinTime = true;
        }
    }

    const displayTrangThai = !isWithinTime ? Math.max(trangThaiPhieu, 2.5) : trangThaiPhieu;

    const handleYearChange = (e) => {
        const newYear = parseInt(e.target.value);
        setSelectedYear(newYear);
        navigate(`/danh-gia-phu-luc-2?year=${newYear}`);
    };

    useEffect(() => {
        const total = Object.values(formData).reduce((sum, item) => sum + (item.DiemTuDanhGia || 0), 0);
        setTongDiemCoBan(total);
    }, [formData]);

    const handleScoreChange = (idTieuChi, idThangDiem, score) => {
        if (displayTrangThai >= 2) return;
        setFormData(prev => ({
            ...prev,
            [idTieuChi]: { ...prev[idTieuChi], IdTieuChi: idTieuChi, IdThangDiemChon: idThangDiem, DiemTuDanhGia: score }
        }));
    };

    const handleTextChange = (idTieuChi, text) => {
        if (displayTrangThai >= 2) return;
        setFormData(prev => ({
            ...prev,
            [idTieuChi]: { ...prev[idTieuChi], IdTieuChi: idTieuChi, MoTaHoanThanh: text }
        }));
    };

    const handleFileChange = (idTieuChi, newFilesArray) => {
        if (displayTrangThai >= 2 || !newFilesArray || newFilesArray.length === 0) return;

        setFormData(prev => {
            const currentData = prev[idTieuChi] || { IdTieuChi: idTieuChi, DanhSachFile: [], DanhSachNCKH: [] };
            const currentFiles = currentData.DanhSachFile || [];

            return {
                ...prev,
                [idTieuChi]: {
                    ...currentData,
                    DanhSachFile: [...currentFiles, ...newFilesArray]
                }
            };
        });
    };

    const handleRemoveFile = (idTieuChi, indexToRemove) => {
        if (displayTrangThai >= 2) return;

        setFormData(prev => {
            const currentData = prev[idTieuChi];
            if (!currentData || !currentData.DanhSachFile) return prev;

            const newFilesList = currentData.DanhSachFile.filter((_, idx) => idx !== indexToRemove);

            return {
                ...prev,
                [idTieuChi]: {
                    ...currentData,
                    DanhSachFile: newFilesList
                }
            };
        });
    };

    // ĐÃ THÊM: Hàm xử lý thêm bài báo NCKH
    const handleNckhChange = (idTieuChi, articleObj) => {
        if (displayTrangThai >= 2) return;

        setFormData(prev => {
            const currentData = prev[idTieuChi] || { IdTieuChi: idTieuChi, DanhSachFile: [], DanhSachNCKH: [] };
            const currentNckh = currentData.DanhSachNCKH || [];

            // Chống chọn trùng bài báo trên cùng một tiêu chí
            if (currentNckh.some(item => item.ScienceRecordId === articleObj.ScienceRecordId)) {
                return prev;
            }

            return {
                ...prev,
                [idTieuChi]: {
                    ...currentData,
                    DanhSachNCKH: [...currentNckh, articleObj]
                }
            };
        });
    };

    // ĐÃ THÊM: Hàm xử lý gỡ bỏ bài báo NCKH khỏi danh sách chọn
    const handleRemoveNckh = (idTieuChi, indexToRemove) => {
        if (displayTrangThai >= 2) return;

        setFormData(prev => {
            const currentData = prev[idTieuChi];
            if (!currentData || !currentData.DanhSachNCKH) return prev;

            const newNckhList = currentData.DanhSachNCKH.filter((_, idx) => idx !== indexToRemove);

            return {
                ...prev,
                [idTieuChi]: {
                    ...currentData,
                    DanhSachNCKH: newNckhList
                }
            };
        });
    };

    const executeSubmit = async (status) => {
        setIsSubmitting(true);
        toast.current.show({ severity: 'info', summary: 'Đang xử lý', detail: 'Đang tải tệp tin và lưu dữ liệu', sticky: true });

        try {
            const finalChiTiet = [];

            for (const item of Object.values(formData)) {
                const uploadedFilesList = [];
                const filesToProcess = item.DanhSachFile || [];

                for (const fileItem of filesToProcess) {
                    if (fileItem instanceof File) {
                        const resUpload = await apiFetch(`upload?fileName=${encodeURIComponent(fileItem.name)}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': undefined
                            },
                            body: fileItem
                        });

                        if (!resUpload.ok) throw new Error("Upload file thất bại");

                        const uploadResult = await resUpload.json();
                        if (uploadResult.success) {
                            uploadedFilesList.push({
                                fileName: uploadResult.fileName,
                                originalName: uploadResult.originalName,
                                fileType: uploadResult.fileType,
                                fileSizeKB: uploadResult.fileSizeKB
                            });
                        } else {
                            throw new Error(uploadResult.message);
                        }
                    }
                    else {
                        uploadedFilesList.push(fileItem);
                    }
                }

                finalChiTiet.push({
                    ...item,
                    DanhSachFile: uploadedFilesList,
                    DanhSachNCKH: item.DanhSachNCKH || [] // GỬI KÈM MẢNG NCKH LÊN SERVER C#
                });
            }

            const payload = {
                Action: 'SUBMIT',
                IdNam: selectedYear,
                IdNhanVien: currentUser.IdNhanVien,
                IdDonVi: currentUser.IdDonVi,
                TrangThai: status,
                TongDiemCoBan: tongDiemCoBan,
                TongDiemTichLuy: tongDiemCoBan,
                ChiTiet: finalChiTiet
            };

            const res = await apiFetch('scoring', {
                method: 'POST', body: JSON.stringify(payload)
            });
            const result = await res.json();

            toast.current.clear();

            if (result.status === 'success') {
                toast.current.show({ severity: 'success', summary: 'Thành công', detail: result.message, life: 3000 });
                setTrangThaiPhieu(status);
            } else {
                toast.current.show({ severity: 'error', summary: 'Lỗi', detail: result.message || "Lỗi lưu phiếu!", life: 4000 });
            }
        } catch (err) {
            console.error("Lỗi khi nộp phiếu/upload file:", err);
            toast.current.clear();
            toast.current.show({ severity: 'error', summary: 'Lỗi', detail: 'Quá trình tải tệp tin hoặc lưu phiếu thất bại!', life: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (status) => {
        if (status === 2) {
            const hasEvaluated = Object.values(formData).some(item =>
                item.IdThangDiemChon != null ||
                (item.MoTaHoanThanh && item.MoTaHoanThanh.trim() !== '') ||
                (item.DanhSachFile && item.DanhSachFile.length > 0) ||
                (item.DanhSachNCKH && item.DanhSachNCKH.length > 0)
            );

            if (!hasEvaluated) {
                toast.current.show({
                    severity: 'error',
                    summary: 'Không thể nộp phiếu',
                    detail: 'Bạn chưa chọn mục đánh giá hoặc tải file nào! Vui lòng đánh giá ít nhất 1 tiêu chí trước khi nộp.',
                    life: 4000
                });
                return;
            }

            setDialogType('SUBMIT');
            setDialogVisible(true);
        } else {
            executeSubmit(status);
        }
    };

    const executeRecall = async () => {
        setIsSubmitting(true);
        const payload = {
            Action: 'RECALL',
            IdNam: selectedYear,
            IdNhanVien: currentUser.IdNhanVien
        };

        try {
            const res = await apiFetch('scoring', {
                method: 'POST', body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.status === 'success') {
                toast.current.show({ severity: 'success', summary: 'Thành công', detail: result.message, life: 3000 });
                setTrangThaiPhieu(1);
            } else {
                toast.current.show({ severity: 'error', summary: 'Lỗi', detail: result.message || "Lỗi thu hồi phiếu!", life: 4000 });
            }
        } catch (err) {
            console.error("Lỗi khi thu hồi phiếu:", err);
            toast.current.show({ severity: 'error', summary: 'Lỗi kết nối', detail: 'Không thể kết nối đến máy chủ!', life: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecall = () => {
        setDialogType('RECALL');
        setDialogVisible(true);
    };

    return (
        <div className="page-container">
            <Toast ref={toast} position="top-right" />

            <ConfirmDialog
                visible={dialogVisible}
                onHide={() => setDialogVisible(false)}
                message={dialogType === 'SUBMIT' ? "Xác nhận nộp phiếu? Sau khi nộp sẽ không thể chỉnh sửa dữ liệu!" : "Bạn có chắc chắn muốn thu hồi phiếu để chỉnh sửa lại?"}
                header={dialogType === 'SUBMIT' ? "Xác nhận nộp phiếu" : "Xác nhận thu hồi"}
                icon={dialogType === 'SUBMIT' ? "pi pi-exclamation-triangle" : "pi pi-info-circle"}
                acceptLabel={dialogType === 'SUBMIT' ? "Nộp phiếu" : "Thu hồi phiếu"}
                rejectLabel="Hủy bỏ"
                acceptClassName={dialogType === 'SUBMIT' ? "p-button-primary" : "p-button-danger"}
                accept={() => {
                    if (dialogType === 'SUBMIT') executeSubmit(2);
                    if (dialogType === 'RECALL') executeRecall();
                }}
            />

            <div className="phu-luc-2-container">
                <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>ĐÁNH GIÁ PHỤ LỤC 2</h2>
                        <span className="breadcrumb phu-luc-2-breadcrumb">
                            Giảng viên: {currentUser.FullName || 'Người dùng'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#475569', fontWeight: 'bold' }}>Năm đánh giá:</label>
                        <select
                            className="form-input"
                            value={selectedYear}
                            onChange={handleYearChange}
                            disabled={isLoading || listYears.length === 0}
                            style={{ width: '130px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', fontSize: '14px' }}
                        >
                            {listYears.map(y => (
                                <option key={y} value={y}>Năm {y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {!isWithinTime && timeMessage && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fa-solid fa-lock" style={{ fontSize: '20px' }}></i>
                        <span style={{ fontWeight: '500' }}>{timeMessage} Hiện tại bạn không thể thao tác nộp hoặc chỉnh sửa phiếu.</span>
                    </div>
                )}

                <div className="phu-luc-2-content">
                    <DanhGiaPhuLuc2Form
                        criteriaList={criteriaList}
                        formData={formData}
                        tongDiemCoBan={tongDiemCoBan}
                        isSubmitting={isSubmitting}
                        trangThaiPhieu={displayTrangThai}
                        lyDoTraVe={lyDoTraVe}
                        onSubmit={handleSubmit}
                        onScoreChange={handleScoreChange}
                        onTextChange={handleTextChange}
                        onFileChange={handleFileChange}
                        onRemoveFile={handleRemoveFile}
                        onNckhChange={handleNckhChange}    // ĐÃ THÊM TRUYỀN HÀM XUỐNG FORM
                        onRemoveNckh={handleRemoveNckh}  // ĐÃ THÊM TRUYỀN HÀM XUỐNG FORM
                        onRecall={handleRecall}
                    />
                </div>
            </div>
        </div>
    );
};

export default DanhGiaPhuLuc2;