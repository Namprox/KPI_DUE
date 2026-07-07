import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';

const KpiEvaluationForm = () => {
    const [criteria, setCriteria] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch templates for Giảng viên (loaiDoiTuong = 1)
        apiFetch('maudanhgia?loaiDoiTuong=1')
            .then(res => res.json())
            .then(resTemplates => {
                const list = resTemplates.Items || resTemplates.data || (Array.isArray(resTemplates) ? resTemplates : []);
                const currentYear = new Date().getFullYear();
                const matchedTemplate = list.find(t => t.IdNam === currentYear && t.TrangThai) || list.find(t => t.IdNam === currentYear) || list[0];
                
                if (matchedTemplate) {
                    const idMau = matchedTemplate.IdMau;
                    return apiFetch(`maudanhgia/${idMau}/chi-tiet`)
                        .then(resDetail => resDetail.json())
                        .then(resultDetail => {
                            const item = resultDetail.Item || resultDetail.data || {};
                            const flatCriteria = [];
                            if (item.Nhom && Array.isArray(item.Nhom)) {
                                item.Nhom.forEach(nhomCha => {
                                    if (nhomCha.TieuChi && Array.isArray(nhomCha.TieuChi)) {
                                        nhomCha.TieuChi.forEach(tc => {
                                            flatCriteria.push({
                                                ...tc,
                                                TenNhom: nhomCha.TenNhom,
                                                CacThangDiem: tc.ThangDiem || []
                                            });
                                        });
                                    }
                                    if (nhomCha.NhomCon && Array.isArray(nhomCha.NhomCon)) {
                                        nhomCha.NhomCon.forEach(nhomCon => {
                                            if (nhomCon.TieuChi && Array.isArray(nhomCon.TieuChi)) {
                                                nhomCon.TieuChi.forEach(tc => {
                                                    flatCriteria.push({
                                                        ...tc,
                                                        TenNhom: nhomCon.TenNhom || nhomCha.TenNhom,
                                                        CacThangDiem: tc.ThangDiem || []
                                                    });
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                            setCriteria(flatCriteria);
                            setLoading(false);
                        });
                } else {
                    setLoading(false);
                }
            })
            .catch(error => {
                console.error("Lỗi khi lấy dữ liệu KPI:", error);
                setLoading(false);
            });
    }, []);

    return (
        <div className="table-card">
            {loading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <p style={{ marginTop: '10px' }}>Đang tải dữ liệu tiêu chí từ Server...</p>
                </div>
            ) : criteria.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                    <p>Chưa có tiêu chí nào trong cơ sở dữ liệu.</p>
                </div>
            ) : (
                <table className="custom-table">
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>STT</th>
                            <th style={{ width: '50%' }}>Nội dung tiêu chí</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>Điểm tối đa</th>
                            <th style={{ width: '30%' }}>Mức độ đạt được (Tự đánh giá)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {criteria.map((item, index) => (
                            <tr key={item.IdTieuChi}>
                                <td style={{ fontWeight: 'bold', color: '#003399' }}>{index + 1}</td>
                                <td>
                                    {item.TenTieuChi}
                                    {item.BatBuocMinhChung && (
                                        <span style={{ color: 'red', fontSize: '12px', marginLeft: '5px' }}>(*Bắt buộc minh chứng)</span>
                                    )}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#d32f2f' }}>
                                    {item.DiemToiDa}
                                </td>
                                <td>
                                     {item.LoaiThangDiem === 3 ? (
                                         <select className="form-input" style={{ cursor: 'pointer' }}>
                                             <option value="">-- Chọn mức đạt được --</option>
                                             <option value={item.DiemToiDa}>Có ({item.DiemToiDa} điểm)</option>
                                             <option value="0">Không (0 điểm)</option>
                                         </select>
                                     ) : item.CacThangDiem && item.CacThangDiem.length > 0 ? (
                                         <select className="form-input" style={{ cursor: 'pointer' }}>
                                             <option value="">-- Chọn mức đạt được --</option>
                                             {item.CacThangDiem.map(td => (
                                                 <option key={td.IdThangDiem} value={td.GiaTriDiem}>
                                                     {td.DieuKienDiem} ({td.GiaTriDiem} điểm)
                                                 </option>
                                             ))}
                                         </select>
                                     ) : (
                                         <input 
                                             type="number" 
                                             className="form-input" 
                                             placeholder={`Tối đa ${item.DiemToiDa} điểm...`} 
                                             max={item.DiemToiDa} 
                                             min="0"
                                         />
                                     )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            
            {/* Nút nộp phiếu thuộc về form */}
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', borderTop: '1px solid #eee' }}>
                <button className="btn-submit" style={{ padding: '12px 30px', fontSize: '16px' }}>
                    <i className="fa-solid fa-paper-plane"></i> Gửi Phiếu Đánh Giá
                </button>
            </div>
        </div>
    );
};

export default KpiEvaluationForm;