import React, { useState, useEffect } from 'react';
import { Paginator } from 'primereact/paginator';

const TRAN_CA_NHAN = 15;

const QL_TongHopGiangVienListing = ({ data, isLoading, selectedNam }) => {
    const [first, setFirst] = useState(0);
    const [isDesktop, setIsDesktop] = useState(true);
    const rows = 15;

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 992);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { setFirst(0); }, [data]);

    const paginatedData = data.slice(first, first + rows);
    const onPageChange = (event) => setFirst(event.first);

    return (
        <div className="modern-table-card" style={{ overflowX: 'auto', paddingBottom: '10px', marginBottom: '25px' }}>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải tổng hợp điểm trừ cá nhân</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '60px', color: '#bdc3c7', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>
                        {selectedNam ? `Không có giảng viên nào bị ghi nhận vi phạm trong năm ${selectedNam}` : 'Chưa có dữ liệu tổng hợp'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px' }}>Bảng này chỉ hiển thị giảng viên có ít nhất 1 vi phạm.</p>
                </div>
            ) : (
                <>
                    <table className="custom-table" style={{ minWidth: isDesktop ? '1050px' : '100%' }}>
                        <thead>
                            <tr>
                                <th width="5%" style={{ textAlign: 'center' }}>STT</th>
                                <th width="12%">MÃ CB</th>
                                <th width="24%">HỌ TÊN</th>
                                <th width="24%">KHOA</th>
                                <th width="10%" style={{ textAlign: 'center' }}>SỐ VI PHẠM</th>
                                <th width="12%" style={{ textAlign: 'center' }}>TỔNG ĐIỂM TRỪ THÔ</th>
                                <th width="13%" style={{ textAlign: 'center' }}>ĐIỂM TRỪ CÁ NHÂN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, index) => {
                                const tho = item.TongDiemTruTho != null ? Number(item.TongDiemTruTho) : 0;
                                const capped = item.DiemTruCaNhan != null ? Number(item.DiemTruCaNhan) : 0;
                                // So sánh có epsilon: đây là double đọc từ DECIMAL(5,2)
                                const chamTran = tho - capped > 0.001;

                                return (
                                    <tr key={item.IdNhanVien}>
                                        <td style={{ textAlign: 'center', color: '#64748b' }}>{first + index + 1}</td>
                                        <td><span className="code-pill">{item.MaNhanVien || '---'}</span></td>
                                        <td style={{ fontWeight: '600', color: '#1e293b' }}>{item.HoTen || '---'}</td>
                                        <td style={{ fontSize: '13px', color: '#475569' }}>{item.TenDonVi || '---'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="tag-badge">{item.SoViPham ?? 0}</span>
                                        </td>
                                        <td style={{ textAlign: 'center', color: '#475569', fontWeight: '600' }}>
                                            {tho.toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`rating-badge ${capped >= TRAN_CA_NHAN ? 'rating-low' : 'rating-medium'}`}>
                                                {capped.toFixed(2)}
                                            </span>
                                            {chamTran && (
                                                <div style={{ marginTop: '5px' }}>
                                                    <span
                                                        className="tag-badge"
                                                        style={{ backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }}
                                                        title={`Tổng thô ${tho.toFixed(2)}đ đã bị giới hạn còn ${TRAN_CA_NHAN}đ theo quy định`}
                                                    >
                                                        <i className="fa-solid fa-arrow-down-wide-short" style={{ marginRight: '4px' }}></i>
                                                        Chạm trần {TRAN_CA_NHAN}đ
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {data.length > rows && (
                        <div style={{ marginTop: '15px', borderTop: '1px solid #e9ecef', paddingTop: '10px' }}>
                            <Paginator
                                first={first}
                                rows={rows}
                                totalRecords={data.length}
                                onPageChange={onPageChange}
                                template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                                style={{ background: 'transparent', border: 'none' }}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default QL_TongHopGiangVienListing;
