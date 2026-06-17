import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../css/Pages.css';
import '../../css/Evaluation/LichSuDanhGia.css';
import { apiFetch } from '../../utils/api';

const LichSuDanhGia = () => {
    const [historyList, setHistoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const { user } = useAuth();
    const currentUser = user || {};

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const res = await apiFetch(`scoring?action=history&idNhanVien=${currentUser.IdNhanVien}`);
                const result = await res.json();
                if (result.success) {
                    setHistoryList(result.data || []);
                }
            } catch (err) {
                console.error("Lỗi tải lịch sử:", err);
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser.IdNhanVien) fetchHistory();
    }, [currentUser.IdNhanVien]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 1: return <span className="badge badge-nhap">Đang nháp</span>;
            case 2: return <span className="badge badge-cho-duyet">Chờ duyệt</span>;
            case 3: return <span className="badge badge-da-duyet">Đã duyệt</span>;
            default: return <span className="badge badge-chua-ro">Chưa rõ</span>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '---';
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('vi-VN');
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: '25px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b' }}>LỊCH SỬ ĐÁNH GIÁ KPI</h2>
                    <span className="breadcrumb">Giảng viên: {currentUser.FullName}</span>
                </div>
            </div>

            <div className="table-card lich-su-table-container" style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', paddingBottom: '10px' }}>
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '30px', color: '#003399' }}></i>
                    </div>
                ) : historyList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                        <i className="fa-solid fa-folder-open" style={{ fontSize: '40px', marginBottom: '15px', color: '#cbd5e1' }}></i>
                        <p>Bạn chưa có phiếu đánh giá nào trong hệ thống</p>
                    </div>
                ) : (
                    <table className="custom-table lich-su-table">
                        <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ width: '10%', padding: '15px', textAlign: 'center', color: '#475569' }}>Năm học</th>
                                <th style={{ width: '35%', padding: '15px', textAlign: 'left', color: '#475569' }}>Tổng điểm (Tích lũy)</th>
                                <th style={{ width: '20%', padding: '15px', textAlign: 'center', color: '#475569' }}>Ngày gửi</th>
                                <th style={{ width: '15%', padding: '15px', textAlign: 'center', color: '#475569' }}>Trạng thái</th>
                                <th style={{ width: '20%', padding: '15px', textAlign: 'center', color: '#475569' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyList.map((item) => (
                                <tr key={item.IdPhieu} style={{ borderBottom: '1px solid #f1f5f9', transition: '0.2s' }}>
                                    <td className="nowrap" style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>{item.IdNam}</td>

                                    <td style={{ padding: '15px', textAlign: 'left' }}>
                                        <b style={{ color: '#003399', fontSize: '16px' }}>{item.TongDiemTichLuy?.toFixed(2)} đ</b>
                                    </td>

                                    <td className="nowrap" style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>
                                        {formatDate(item.NgayGui)}
                                    </td>

                                    <td className="nowrap" style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            {getStatusBadge(item.TrangThai)}
                                        </div>
                                    </td>

                                    <td className="nowrap" style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button
                                                className="btn-submit"
                                                style={{
                                                    padding: '6px 15px',
                                                    fontSize: '13px',
                                                    borderRadius: '6px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                                onClick={() => navigate(`/danh-gia-phu-luc-2?year=${item.IdNam}`)}
                                            >
                                                <i className="fa-solid fa-eye"></i> Xem chi tiết
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default LichSuDanhGia;