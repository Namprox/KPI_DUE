import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../css/Pages.css';
import DanhGiaPhuLuc2Form from '../../components/Evaluation/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form';
import { Toast } from 'primereact/toast';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Dialog } from 'primereact/dialog';

const parseNetDate = (dateString) => {
    if (!dateString) return null;
    if (typeof dateString === 'string' && dateString.includes('/Date(')) {
        return new Date(parseInt(dateString.match(/\d+/)[0], 10));
    }
    return new Date(dateString);
};

const ChiTietDuyetPhieu = () => {
    const [criteriaList, setCriteriaList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({});
    const [tongDiemCoBan, setTongDiemCoBan] = useState(0);
    const [thongTinPhieu, setThongTinPhieu] = useState(null);

    const [rejectDialogVisible, setRejectDialogVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmAction, setConfirmAction] = useState("");

    const [isWithinTime, setIsWithinTime] = useState(true);
    const [timeMessage, setTimeMessage] = useState("");

    const toast = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const idPhieu = queryParams.get('idPhieu');
    const idNhanVien = queryParams.get('idNhanVien');
    const year = queryParams.get('year');

    const authHeaders = {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
    };
    const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

    useEffect(() => {
        if (!idNhanVien || !year) {
            navigate('/danh-sach-duyet-phieu');
            return;
        }

        const fetchChiTiet = async () => {
            setIsLoading(true);
            try {
                const [resPhieu, resNam] = await Promise.all([
                    fetch(`${API_URL}/scoring?idNam=${year}&idNhanVien=${idNhanVien}&t=${new Date().getTime()}`, { headers: authHeaders }),
                    fetch(`${API_URL}/nam-danh-gia`, { headers: authHeaders })
                ]);

                const result = await resPhieu.json();
                const resultNam = await resNam.json();

                if (Array.isArray(resultNam)) {
                    const activeYear = resultNam.find(y => y.IdNam === parseInt(year));
                    if (activeYear) {
                        const now = new Date().getTime();
                        const start = activeYear.NgayMoDanhGiaCapTren ? parseNetDate(activeYear.NgayMoDanhGiaCapTren).getTime() : 0;
                        const end = activeYear.NgayDongDanhGiaCapTren ? parseNetDate(activeYear.NgayDongDanhGiaCapTren).setHours(23, 59, 59, 999) : 0;

                        if (!activeYear.NgayMoDanhGiaCapTren || !activeYear.NgayDongDanhGiaCapTren) {
                            setIsWithinTime(false);
                            setTimeMessage("Hệ thống chưa thiết lập lịch Duyệt phiếu cho năm này");
                        } else if (now < start) {
                            setIsWithinTime(false);
                            setTimeMessage(`Chưa đến thời gian Duyệt phiếu. (Bắt đầu từ ${parseNetDate(activeYear.NgayMoDanhGiaCapTren).toLocaleDateString('vi-VN')})`);
                        } else if (now > end) {
                            setIsWithinTime(false);
                            setTimeMessage(`Đã hết hạn Duyệt phiếu! Cổng phê duyệt đã đóng vào lúc 23:59 ngày ${parseNetDate(activeYear.NgayDongDanhGiaCapTren).toLocaleDateString('vi-VN')}`);
                        } else {
                            setIsWithinTime(true);
                        }
                    }
                }

                if (result.success) {
                    setCriteriaList(result.data || []);
                    if (result.phieu) {
                        setThongTinPhieu(result.phieu);
                        setTongDiemCoBan(result.phieu.TongDiemCoBan);

                        if (result.chiTiet && result.chiTiet.length > 0) {
                            const initialFormData = {};
                            result.chiTiet.forEach(item => {
                                if (!initialFormData[item.IdTieuChi]) {
                                    initialFormData[item.IdTieuChi] = {
                                        IdTieuChi: item.IdTieuChi,
                                        IdThangDiemChon: item.IdThangDiemChon,
                                        DiemTuDanhGia: item.DiemTuDanhGia,
                                        MoTaHoanThanh: item.MoTaHoanThanh,
                                        DanhSachFile: []
                                    };
                                }

                                const fileName = item.TenFile || item.ten_file || item.FileMinhChung || item.file_minh_chung;
                                const originalName = item.TenFileGoc || item.ten_file_goc || fileName;

                                if (fileName) {
                                    initialFormData[item.IdTieuChi].DanhSachFile.push({
                                        fileName: fileName,
                                        originalName: originalName,
                                        fileType: item.LoaiFile || item.loai_file || '',
                                        fileSizeKB: item.KichThuocKB || item.kich_thuoc_kb || 0
                                    });

                                    initialFormData[item.IdTieuChi].FileMinhChung = fileName;
                                }
                            });
                            setFormData(initialFormData);
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi API tải chi tiết phiếu:", err);
                toast.current?.show({ severity: 'error', summary: 'Lỗi', detail: 'Lỗi tải dữ liệu phiếu!', life: 4000 });
            } finally {
                setIsLoading(false);
            }
        };

        fetchChiTiet();
    }, [idNhanVien, year, navigate]);

    const executeApproval = async (actionType, reason = "") => {
        setIsSubmitting(true);
        try {
            const payload = {
                Action: actionType,
                IdPhieu: idPhieu,
                IdNhanVien: idNhanVien,
                IdNam: year,
                LyDo: reason
            };

            const res = await fetch(`${API_URL}/approval`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.status === 'success') {
                toast.current.show({ severity: 'success', summary: 'Thành công', detail: result.message, life: 2000 });
                setTimeout(() => navigate('/danh-sach-duyet-phieu'), 1500);
            } else {
                toast.current.show({ severity: 'error', summary: 'Lỗi', detail: result.message || "Có lỗi xảy ra!", life: 4000 });
            }
        } catch (err) {
            console.error("Lỗi duyệt phiếu:", err);
            toast.current.show({ severity: 'error', summary: 'Lỗi kết nối', detail: 'Không thể kết nối đến máy chủ!', life: 4000 });
        } finally {
            setIsSubmitting(false);
            setConfirmVisible(false);
        }
    };

    const handleApprove = () => {
        setConfirmAction('APPROVE');
        setConfirmVisible(true);
    };

    const handleCancelApprove = () => {
        setConfirmAction('CANCEL_APPROVE');
        setConfirmVisible(true);
    };

    const handleOpenReject = () => {
        setRejectReason("");
        setRejectDialogVisible(true);
    };

    const submitReject = () => {
        if (rejectReason.trim() === "") {
            toast.current.show({ severity: 'warn', summary: 'Cảnh báo', detail: 'Bắt buộc phải nhập lý do trả về!', life: 3000 });
            return;
        }
        setRejectDialogVisible(false);
        executeApproval('REJECT', rejectReason);
    };

    const rejectDialogFooter = (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn-cancel" onClick={() => setRejectDialogVisible(false)} disabled={isSubmitting} style={{ padding: '8px 20px' }}>Hủy bỏ</button>
            <button className="btn-submit" onClick={submitReject} disabled={isSubmitting} style={{ padding: '8px 20px', background: '#ef4444', border: 'none' }}>
                <i className="fa-solid fa-paper-plane" style={{ marginRight: '6px' }}></i> Xác nhận trả về
            </button>
        </div>
    );

    if (isLoading) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '50px' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '30px', color: '#003399' }}></i>
                <p>Đang tải dữ liệu chi tiết phiếu</p>
            </div>
        );
    }

    return (
        <div className="page-container">
            <Toast ref={toast} position="top-right" />

            <ConfirmDialog
                visible={confirmVisible}
                onHide={() => setConfirmVisible(false)}
                message={confirmAction === 'APPROVE' ? 'Xác nhận PHÊ DUYỆT phiếu đánh giá này?' : 'Bạn có chắc chắn muốn HỦY DUYỆT phiếu này để xem xét lại?'}
                header={confirmAction === 'APPROVE' ? 'Xác nhận phê duyệt' : 'Xác nhận hủy duyệt'}
                icon={confirmAction === 'APPROVE' ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle'}
                acceptLabel={confirmAction === 'APPROVE' ? 'Phê duyệt' : 'Hủy duyệt'}
                rejectLabel="Hủy bỏ"
                acceptClassName={confirmAction === 'APPROVE' ? 'p-button-success' : 'p-button-warning'}
                accept={() => executeApproval(confirmAction)}
            />

            <Dialog
                header="Yêu cầu làm lại phiếu"
                visible={rejectDialogVisible}
                style={{ width: '500px' }}
                footer={rejectDialogFooter}
                onHide={() => setRejectDialogVisible(false)}
            >
                <div style={{ paddingTop: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>Lý do trả về (Bắt buộc):</label>
                    <textarea
                        className="form-input"
                        rows="4"
                        placeholder="Vui lòng nhập rõ lý do để giảng viên chỉnh sửa"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                    />
                </div>
            </Dialog>

            <div className="page-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>CHI TIẾT DUYỆT PHIẾU</h2>
                    <span className="breadcrumb" style={{ cursor: 'pointer', color: '#003399' }} onClick={() => navigate('/danh-sach-duyet-phieu')}>
                        <i className="fa-solid fa-arrow-left"></i> Quay lại danh sách
                    </span>
                </div>

                {isWithinTime && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {thongTinPhieu?.TrangThai === 2 && (
                            <>
                                <button
                                    disabled={isSubmitting}
                                    className="btn-cancel"
                                    style={{ border: '1px solid #ef4444', color: '#ef4444', padding: '10px 20px', background: '#fef2f2' }}
                                    onClick={handleOpenReject}
                                >
                                    <i className="fa-solid fa-rotate-left"></i> Yêu cầu làm lại
                                </button>
                                <button
                                    disabled={isSubmitting}
                                    className="btn-submit"
                                    style={{ padding: '10px 25px' }}
                                    onClick={handleApprove}
                                >
                                    <i className="fa-solid fa-check-double"></i> Phê duyệt
                                </button>
                            </>
                        )}

                        {thongTinPhieu?.TrangThai === 3 && (
                            <button
                                disabled={isSubmitting}
                                className="btn-cancel"
                                style={{ border: '1px solid #f59e0b', color: '#d97706', padding: '10px 20px', background: '#fefce8' }}
                                onClick={handleCancelApprove}
                            >
                                <i className="fa-solid fa-undo"></i> Hủy duyệt phiếu
                            </button>
                        )}
                    </div>
                )}
            </div>

            {!isWithinTime && timeMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-lock" style={{ fontSize: '20px' }}></i>
                    <span style={{ fontWeight: '500' }}>{timeMessage} Hiện tại không thể thao tác phê duyệt hay hủy duyệt phiếu</span>
                </div>
            )}

            <DanhGiaPhuLuc2Form
                criteriaList={criteriaList}
                formData={formData}
                tongDiemCoBan={tongDiemCoBan}
                isSubmitting={true}
                trangThaiPhieu={thongTinPhieu?.TrangThai === 3 ? 3 : 2.5}
                onSubmit={() => { }}
                onScoreChange={() => { }}
                onTextChange={() => { }}
                onFileChange={() => { }}
                onRemoveFile={() => { }}
                onRecall={() => { }}
            />
        </div>
    );
};

export default ChiTietDuyetPhieu;