import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import QL_TongHopGiangVienListing from '../../components/QuanLyKeHoach/QL_TongHopViPham/QL_TongHopGiangVienListing';
import QL_DiemTruKhoaListing from '../../components/QuanLyKeHoach/QL_TongHopViPham/QL_DiemTruKhoaListing';
import { apiFetch } from '../../utils/api';
import { readApiError } from '../../utils/apiError';
import { laDonViKhoa } from '../../utils/viPhamPermissions';
import SearchSelect from '../../components/Common/SearchSelect';

const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' };

const QL_TongHopViPham = () => {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [namList, setNamList] = useState([]);
    const [donViList, setDonViList] = useState([]);
    const [gvRows, setGvRows] = useState([]);
    const [khoaRows, setKhoaRows] = useState([]);

    const [selectedNam, setSelectedNam] = useState('');
    const [selectedDonVi, setSelectedDonVi] = useState('');
    const [gvSearch, setGvSearch] = useState('');

    const [isLoading, setIsLoading] = useState(true);

    const khoaList = useMemo(() => donViList.filter(laDonViKhoa), [donViList]);

    const filteredGvRows = useMemo(() => {
        if (!gvSearch.trim()) return gvRows;
        const query = gvSearch.toLowerCase();
        return gvRows.filter((r) =>
            [r.MaNhanVien, r.HoTen, r.TenDonVi, r.MaDonVi]
                .filter(Boolean)
                .some((f) => String(f).toLowerCase().includes(query))
        );
    }, [gvRows, gvSearch]);

    const stats = useMemo(() => {
        const tongLuot = gvRows.reduce((sum, r) => sum + (r.SoViPham || 0), 0);
        const tongDiemTru = gvRows.reduce((sum, r) => sum + (Number(r.DiemTruCaNhan) || 0), 0);
        const khoaBiTru = khoaRows.filter((k) => Number(k.DiemTruTapThe || 0) > 0).length;
        return { soGv: gvRows.length, tongLuot, tongDiemTru, khoaBiTru };
    }, [gvRows, khoaRows]);

    useEffect(() => {
        initData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showToast = (severity, summary, detail) => {
        if (toast.current) toast.current.show({ severity, summary, detail, life: 3000 });
    };

    const initData = async () => {
        setIsLoading(true);
        try {
            const [namRes, donViRes] = await Promise.all([
                apiFetch('namdanhgia'),
                apiFetch('donvi'),
            ]);

            let years = [];
            if (namRes.ok) {
                const result = await namRes.json();
                const list = result.Items || (Array.isArray(result) ? result : []);
                years = [...list].sort((a, b) => b.IdNam - a.IdNam);
                setNamList(years);
            }

            if (donViRes.ok) {
                const result = await donViRes.json();
                setDonViList(result.Items || (Array.isArray(result) ? result : []));
            }

            const currentYear = new Date().getFullYear();
            const matched = years.find((y) => y.IdNam === currentYear);
            const defaultYear = matched
                ? String(matched.IdNam)
                : years.length > 0
                    ? String(years[0].IdNam)
                    : '';
            setSelectedNam(defaultYear);

            if (defaultYear) {
                await loadTongHop(defaultYear, '');
            } else {
                showToast('warn', 'Thiếu dữ liệu', 'Chưa có năm đánh giá nào trong hệ thống');
            }
        } catch (error) {
            console.error('Lỗi khởi tạo tổng hợp vi phạm:', error);
            showToast('error', 'Lỗi', 'Không thể khởi tạo dữ liệu');
        } finally {
            setIsLoading(false);
        }
    };

    /** idNam là BẮT BUỘC với cả 2 endpoint — thiếu sẽ bị 400. */
    const loadTongHop = async (idNam, idDonVi) => {
        if (!idNam) {
            setGvRows([]);
            setKhoaRows([]);
            return;
        }

        setIsLoading(true);
        try {
            const buildQs = () => {
                const params = new URLSearchParams();
                params.set('idNam', idNam);
                if (idDonVi) params.set('idDonVi', idDonVi);
                return params.toString();
            };

            const [gvRes, khoaRes] = await Promise.all([
                apiFetch(`vi-pham/tong-hop-giang-vien?${buildQs()}`),
                apiFetch(`vi-pham/diem-tru-khoa?${buildQs()}`),
            ]);

            if (gvRes.ok) {
                const result = await gvRes.json();
                setGvRows(result.Items || (Array.isArray(result) ? result : []));
            } else {
                const err = await readApiError(gvRes, 'Không tải được tổng hợp cá nhân');
                showToast('error', 'Lỗi', err.message);
                setGvRows([]);
            }

            if (khoaRes.ok) {
                const result = await khoaRes.json();
                setKhoaRows(result.Items || (Array.isArray(result) ? result : []));
            } else {
                const err = await readApiError(khoaRes, 'Không tải được điểm trừ tập thể Khoa');
                showToast('error', 'Lỗi', err.message);
                setKhoaRows([]);
            }
        } catch (error) {
            console.error('Lỗi tải tổng hợp vi phạm:', error);
            showToast('error', 'Lỗi', 'Lỗi kết nối máy chủ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNamChange = (val) => {
        setSelectedNam(val);
        loadTongHop(val, selectedDonVi);
    };

    const handleDonViChange = (val) => {
        setSelectedDonVi(val);
        loadTongHop(selectedNam, val);
    };

    const handleExport = async () => {
        if (filteredGvRows.length === 0 && khoaRows.length === 0) {
            showToast('warn', 'Không có dữ liệu', 'Chưa có số liệu để xuất');
            return;
        }

        // Nạp động: thư viện xlsx nặng ~107kB gzip, không nên nằm trong bundle chính
        let downloadExcel;
        try {
            ({ downloadExcel } = await import('../../utils/excelUtils'));
        } catch (error) {
            console.error('Không tải được thư viện xuất Excel:', error);
            showToast('error', 'Lỗi', 'Không tải được thư viện xuất Excel');
            return;
        }

        if (filteredGvRows.length > 0) {
            downloadExcel({
                data: filteredGvRows.map((r, i) => ({
                    'STT': i + 1,
                    'Mã cán bộ': r.MaNhanVien || '',
                    'Họ tên': r.HoTen || '',
                    'Tên khoa': r.TenDonVi || '',
                    'Số vi phạm': r.SoViPham ?? 0,
                    'Tổng điểm trừ thô': r.TongDiemTruTho != null ? Number(r.TongDiemTruTho) : 0,
                    'Điểm trừ cá nhân (trần 15)': r.DiemTruCaNhan != null ? Number(r.DiemTruCaNhan) : 0,
                })),
                fileName: `TongHopDiemTruCaNhan_Nam${selectedNam}`,
                sheetName: 'Diem tru ca nhan',
                colWidths: [{ wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 22 }],
            });
        }

        if (khoaRows.length > 0) {
            downloadExcel({
                data: khoaRows.map((r, i) => ({
                    'STT': i + 1,
                    'Tên khoa': r.TenDonVi || '',
                    'Số GV (N)': r.SoGiangVien ?? 0,
                    'Số GV vi phạm': r.SoGiangVienViPham ?? 0,
                    'Tổng điểm trừ cá nhân (T)': r.TongDiemTruCaNhan != null ? Number(r.TongDiemTruCaNhan) : 0,
                    'Mẫu số (0.2 x 15 x N)': r.MauSo != null ? Number(r.MauSo) : 0,
                    'Điểm trừ tập thể (trần 7.5)': r.DiemTruTapThe != null ? Number(r.DiemTruTapThe) : 0,
                })),
                fileName: `DiemTruTapTheKhoa_Nam${selectedNam}`,
                sheetName: 'Diem tru tap the',
                colWidths: [{ wch: 6 }, { wch: 32 }, { wch: 10 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 24 }],
            });
        }

        showToast('success', 'Thành công', 'Đã xuất file Excel');
    };

    return (
        <div className="page-container" style={{ padding: '20px' }}>
            <Toast ref={toast} />

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '700' }}>
                        Tổng hợp điểm trừ vi phạm
                    </h2>
                    <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                        Điểm trừ KPI cá nhân (trần 15 điểm) và điểm trừ KPI tập thể của Khoa (trần 7,5 điểm)
                    </p>
                </div>

                <button
                    className="btn-cancel"
                    onClick={() => navigate('/quan-ly-vi-pham')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '14px' }}
                >
                    <i className="fa-solid fa-circle-exclamation"></i> Ghi nhận vi phạm
                </button>
            </div>

            {/* Filter Bar */}
            <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
                    <label style={labelStyle}>Năm đánh giá</label>
                    <SearchSelect
                        value={selectedNam}
                        onChange={handleNamChange}
                        options={namList.map((n) => ({ value: n.IdNam, label: `Năm học ${n.IdNam}` }))}
                    />
                </div>

                <div style={{ minWidth: '220px', flex: '2 1 220px' }}>
                    <label style={labelStyle}>Khoa</label>
                    <SearchSelect
                        value={selectedDonVi}
                        onChange={handleDonViChange}
                        options={[
                            { value: '', label: '-- Tất cả Khoa --' },
                            ...khoaList.map((dv) => ({ value: dv.IdDonVi, label: dv.TenDonVi })),
                        ]}
                        placeholder="-- Tất cả Khoa --"
                    />
                </div>

                <div style={{ minWidth: '220px', flex: '2 1 220px' }}>
                    <label style={labelStyle}>Tìm giảng viên</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Mã cán bộ, họ tên, khoa..."
                            value={gvSearch}
                            onChange={(e) => setGvSearch(e.target.value)}
                            style={{ paddingRight: '30px' }}
                        />
                        <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                    </div>
                </div>

                <button
                    className="btn-submit"
                    onClick={handleExport}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 18px', fontSize: '14px', height: '43px', flex: '0 0 auto', whiteSpace: 'nowrap' }}
                >
                    <i className="fa-solid fa-file-excel"></i> Xuất Excel
                </button>
            </div>

            {/* Stat tiles */}
            <div className="stat-card-grid">
                <div className="stat-card">
                    <div className="stat-icon-box stat-icon-blue"><i className="fa-solid fa-user-xmark"></i></div>
                    <div>
                        <div className="stat-label">Giảng viên bị ghi nhận</div>
                        <div className="stat-value">{stats.soGv}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-box stat-icon-amber"><i className="fa-solid fa-triangle-exclamation"></i></div>
                    <div>
                        <div className="stat-label">Tổng lượt vi phạm</div>
                        <div className="stat-value">{stats.tongLuot}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-box stat-icon-purple"><i className="fa-solid fa-arrow-down-9-1"></i></div>
                    <div>
                        <div className="stat-label">Tổng điểm trừ cá nhân</div>
                        <div className="stat-value">{stats.tongDiemTru.toFixed(2)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon-box stat-icon-green"><i className="fa-solid fa-building-columns"></i></div>
                    <div>
                        <div className="stat-label">Khoa bị trừ điểm tập thể</div>
                        <div className="stat-value">{stats.khoaBiTru}</div>
                    </div>
                </div>
            </div>

            <p className="sub-title" style={{ marginBottom: '10px' }}>ĐIỂM TRỪ CÁ NHÂN (TRẦN 15 ĐIỂM)</p>
            <QL_TongHopGiangVienListing
                data={filteredGvRows}
                isLoading={isLoading}
                selectedNam={selectedNam}
            />

            <p className="sub-title" style={{ marginBottom: '10px' }}>ĐIỂM TRỪ TẬP THỂ CỦA KHOA (TRẦN 7,5 ĐIỂM)</p>
            <QL_DiemTruKhoaListing
                data={khoaRows}
                isLoading={isLoading}
                selectedNam={selectedNam}
            />
        </div>
    );
};

export default QL_TongHopViPham;
