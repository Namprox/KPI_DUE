import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../css/Pages.css';
import '../../css/Evaluation/DanhGiaPhuLuc2.css';
import DanhGiaPhuLuc2Form from '../../components/Evaluation/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

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
    const authHeaders = {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
    };

    const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const yearParam = queryParams.get('year');

    const [listYears, setListYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState(yearParam ? parseInt(yearParam) : new Date().getFullYear());

    useEffect(() => {
        const fetchYears = async () => {
            const currentRealYear = new Date().getFullYear();
            try {
                const res = await fetch(`${API_URL}/nam-danh-gia`, { headers: authHeaders });
                const result = await res.json();

                if (Array.isArray(result) && result.length > 0) {

                    const years = result.map(item => item.IdNam).filter(y => y != null);
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
                const url = `${API_URL}/scoring?idNam=${selectedYear}&idNhanVien=${currentUser.IdNhanVien || 0}`;
                const res = await fetch(url, { headers: authHeaders });

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
                                initialFormData[item.IdTieuChi] = {
                                    IdTieuChi: item.IdTieuChi,
                                    IdThangDiemChon: item.IdThangDiemChon,
                                    DiemTuDanhGia: item.DiemTuDanhGia,
                                    MoTaHoanThanh: item.MoTaHoanThanh
                                };
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
        if (trangThaiPhieu >= 2) return;
        setFormData(prev => ({
            ...prev,
            [idTieuChi]: { ...prev[idTieuChi], IdTieuChi: idTieuChi, IdThangDiemChon: idThangDiem, DiemTuDanhGia: score }
        }));
    };

    const handleTextChange = (idTieuChi, text) => {
        if (trangThaiPhieu >= 2) return;
        setFormData(prev => ({
            ...prev,
            [idTieuChi]: { ...prev[idTieuChi], IdTieuChi: idTieuChi, MoTaHoanThanh: text }
        }));
    };

    const executeSubmit = async (status) => {
        setIsSubmitting(true);
        const payload = {
            Action: 'SUBMIT',
            IdNam: selectedYear,
            IdNhanVien: currentUser.IdNhanVien,
            IdDonVi: currentUser.IdDonVi,
            TrangThai: status,
            TongDiemCoBan: tongDiemCoBan,
            TongDiemTichLuy: tongDiemCoBan,
            ChiTiet: Object.values(formData)
        };

        try {
            const res = await fetch(`${API_URL}/scoring`, {
                method: 'POST', headers: authHeaders, body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.status === 'success') {
                toast.current.show({ severity: 'success', summary: 'Thành công', detail: result.message, life: 3000 });
                setTrangThaiPhieu(status);
            } else {
                toast.current.show({ severity: 'error', summary: 'Lỗi', detail: result.message || "Lỗi lưu phiếu!", life: 4000 });
            }
        } catch (err) {
            console.error("Lỗi khi nộp phiếu:", err);
            toast.current.show({ severity: 'error', summary: 'Lỗi kết nối', detail: 'Không thể kết nối đến máy chủ!', life: 4000 });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (status) => {
        if (status === 2) {
            const hasEvaluated = Object.values(formData).some(item =>
                item.IdThangDiemChon != null || (item.MoTaHoanThanh && item.MoTaHoanThanh.trim() !== '')
            );

            if (!hasEvaluated) {
                toast.current.show({
                    severity: 'error',
                    summary: 'Không thể nộp phiếu',
                    detail: 'Bạn chưa chọn mục đánh giá nào! Vui lòng đánh giá ít nhất 1 tiêu chí trước khi nộp.',
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
            const res = await fetch(`${API_URL}/scoring`, {
                method: 'POST', headers: authHeaders, body: JSON.stringify(payload)
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

    if (isLoading) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '50px' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '30px', color: '#003399' }}></i>
                <p style={{ marginTop: '15px' }}>Đang tải biểu mẫu đánh giá</p>
            </div>
        );
    }

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

                <div className="phu-luc-2-content">
                    <DanhGiaPhuLuc2Form
                        criteriaList={criteriaList}
                        formData={formData}
                        tongDiemCoBan={tongDiemCoBan}
                        isSubmitting={isSubmitting}
                        trangThaiPhieu={trangThaiPhieu}
                        lyDoTraVe={lyDoTraVe}
                        onSubmit={handleSubmit}
                        onScoreChange={handleScoreChange}
                        onTextChange={handleTextChange}
                        onRecall={handleRecall}
                    />
                </div>
            </div>
        </div>
    );
};

export default DanhGiaPhuLuc2;