import React, { useState, useEffect } from 'react';
import { Paginator } from 'primereact/paginator';
import { CHE_DO_DIEM_TRU, TEN_CHE_DO_DIEM_TRU, cheDoCuaLoai } from '../../../utils/viPhamNhanVienPermissions';
import { LOAI_DOI_TUONG } from '../../../utils/phieuApi';

const CHE_DO_BADGE_STYLE = {
    [CHE_DO_DIEM_TRU.TU_DO]: { backgroundColor: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' },
    [CHE_DO_DIEM_TRU.CO_DINH]: { backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' },
    [CHE_DO_DIEM_TRU.TOI_THIEU]: { backgroundColor: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' },
};

/** Dấu đứng trước mức trừ để đọc là "trừ đúng 1.00" hay "trừ từ 5.00 trở lên". */
const CHE_DO_PREFIX = {
    [CHE_DO_DIEM_TRU.CO_DINH]: '= ',
    [CHE_DO_DIEM_TRU.TOI_THIEU]: '≥ ',
};

const QL_LoaiViPhamListing = ({ data, onEdit, onDelete, onEditDonVi, isLoading, loaiDoiTuong }) => {
    const laVienChuc = Number(loaiDoiTuong) === LOAI_DOI_TUONG.VIEN_CHUC;
    const nhanKhoaChuQuan = laVienChuc ? 'Khoa/Phòng chủ quản' : 'Khoa chủ quản';
    const [first, setFirst] = useState(0);
    const [isDesktop, setIsDesktop] = useState(true);
    const rows = 10;

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 992);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => { setFirst(0); }, [data]);

    const paginatedData = data.slice(first, first + rows);
    const onPageChange = (event) => setFirst(event.first);

    const renderPhamViGhiNhan = (item) => {
        const dsDonVi = item.DonViGhiNhan || [];
        const chips = [];

        if (item.ChoPhepMoiDonVi) {
            chips.push(
                <span
                    key="moi-don-vi"
                    className="tag-badge"
                    style={{ backgroundColor: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                    title="Bất kỳ trưởng đơn vị nào cũng được ghi nhận (đơn vị chủ trì)"
                >
                    Mọi đơn vị
                </span>
            );
        } else if (dsDonVi.length > 0) {
            // Hiện tên đầy đủ cho dễ đọc; mã đơn vị lùi xuống tooltip.
            dsDonVi.slice(0, 3).forEach((dv) => {
                chips.push(
                    <span key={dv.IdDonVi} className="tag-badge" title={dv.MaDonVi}>
                        {dv.TenDonVi || dv.MaDonVi}
                    </span>
                );
            });
            if (dsDonVi.length > 3) {
                chips.push(
                    <span
                        key="more"
                        className="tag-badge"
                        title={dsDonVi.slice(3).map((d) => `${d.TenDonVi || ''} (${d.MaDonVi})`).join('\n')}
                    >
                        +{dsDonVi.length - 3}
                    </span>
                );
            }
        }

        if (item.ChoPhepKhoaChuQuan) {
            chips.push(
                <span
                    key="khoa-chu-quan"
                    className="tag-badge"
                    style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}
                    title={`Trưởng ${nhanKhoaChuQuan} của người bị ghi nhận cũng được ghi nhận`}
                >
                    {nhanKhoaChuQuan}
                </span>
            );
        }

        if (chips.length === 0) {
            return (
                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px' }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '5px', color: '#f59e0b' }}></i>
                    Chưa phân quyền
                </span>
            );
        }

        return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>{chips}</div>;
    };

    return (
        <div className="modern-table-card" style={{ overflowX: 'auto', paddingBottom: '10px' }}>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#3498db' }}></i>
                    <p style={{ marginTop: '10px', color: '#666' }}>Đang tải danh mục loại vi phạm</p>
                </div>
            ) : data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '60px', color: '#bdc3c7', marginBottom: '15px' }}></i>
                    <h3 style={{ color: '#7f8c8d', margin: '0 0 10px 0' }}>Không có loại vi phạm nào</h3>
                    <p style={{ margin: 0, fontSize: '14px' }}>Thử đổi bộ lọc nhóm / trạng thái hoặc thêm loại vi phạm mới.</p>
                </div>
            ) : (
                <>
                    <table className="custom-table" style={{ minWidth: isDesktop ? '1200px' : '100%' }}>
                        <thead>
                            <tr>
                                <th width="4%" style={{ textAlign: 'center' }}>STT</th>
                                <th width="12%">MÃ</th>
                                <th width="14%">NHÓM</th>
                                <th width="17%">NỘI DUNG</th>
                                <th width="8%" style={{ textAlign: 'center' }}>CHẾ ĐỘ</th>
                                <th width="8%" style={{ textAlign: 'center' }}>ĐIỂM TRỪ</th>
                                <th width="19%">PHẠM VI GHI NHẬN</th>
                                <th width="5%" style={{ textAlign: 'center' }}>THỨ TỰ</th>
                                <th width="7%" style={{ textAlign: 'center' }}>TRẠNG THÁI</th>
                                <th width="10%" style={{ textAlign: 'center' }}>THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map((item, index) => {
                                const cheDo = cheDoCuaLoai(item);
                                return (
                                <tr key={item.IdLoaiViPham}>
                                    <td style={{ textAlign: 'center', color: '#64748b' }}>{first + index + 1}</td>
                                    <td><span className="code-pill">{item.MaLoaiViPham}</span></td>
                                    <td>
                                        <span className="tag-badge">{item.TenNhom || '---'}</span>
                                        {item.TranDiemTru != null && (
                                            <div
                                                style={{ fontSize: '12px', color: '#c2410c', marginTop: '4px' }}
                                                title="Trần điểm trừ của nhóm này trên một cá nhân trong một năm"
                                            >
                                                <i className="fa-solid fa-gauge-high" style={{ marginRight: '4px' }}></i>
                                                Trần nhóm: {Number(item.TranDiemTru).toFixed(2)}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '500', color: '#1e293b' }}>{item.NoiDung}</div>
                                        {item.HoSoKemTheo && (
                                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                                                <i className="fa-solid fa-paperclip" style={{ marginRight: '4px' }}></i>
                                                Hồ sơ: {item.HoSoKemTheo}
                                            </div>
                                        )}
                                        {item.GhiChu && (
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>{item.GhiChu}</div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="tag-badge" style={CHE_DO_BADGE_STYLE[cheDo]}>
                                            {TEN_CHE_DO_DIEM_TRU[cheDo]}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="rating-badge rating-low">
                                            {item.DiemTruMacDinh != null
                                                ? `${CHE_DO_PREFIX[cheDo] || ''}${Number(item.DiemTruMacDinh).toFixed(2)}`
                                                : '---'}
                                        </span>
                                    </td>
                                    <td>{renderPhamViGhiNhan(item)}</td>
                                    <td style={{ textAlign: 'center', color: '#64748b' }}>{item.ThuTuHienThi ?? 0}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {item.TrangThai ? (
                                            <span className="rating-badge rating-high">Đang dùng</span>
                                        ) : (
                                            <span className="tag-badge" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>Ngừng</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <div className="action-btn edit-btn" onClick={() => onEdit(item)} title="Chỉnh sửa">
                                                <i className="fa-solid fa-pen"></i>
                                            </div>
                                            <div className="action-btn key-btn" onClick={() => onEditDonVi(item)} title="Phân quyền đơn vị ghi nhận">
                                                <i className="fa-solid fa-user-shield"></i>
                                            </div>
                                            <div className="action-btn delete-btn" onClick={() => onDelete(item)} title="Xóa">
                                                <i className="fa-solid fa-trash"></i>
                                            </div>
                                        </div>
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

export default QL_LoaiViPhamListing;
