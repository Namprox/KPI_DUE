import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { apiFetch } from '../../utils/api';
import {
  fetchPhieuList,
  formatDiem,
  formatNgay,
  TRANG_THAI,
  TRANG_THAI_META,
} from '../../utils/phieuApi';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import { chuCaiDau, thongTinNhanVien, useNhanVienIndex } from '../../hooks/useNhanVienIndex';
import { TrangThaiBadge, XepLoaiBadge } from '../../components/QuanLyChamDiem/TrangThaiBadge';
import SearchSelect from '../../components/Common/SearchSelect';

const PAGE_SIZE = 20;

const MOI_TRANG_THAI = [
  TRANG_THAI.NHAP,
  TRANG_THAI.DON_VI_CHAM,
  TRANG_THAI.CHO_HT_DUYET,
  TRANG_THAI.HT_DA_DUYET,
  TRANG_THAI.HOAN_TAT,
];

/**
 * Danh sách phiếu toàn đơn vị, mọi trạng thái.
 *
 * Phạm vi dữ liệu do server quyết theo JWT (cấp Khoa thấy cây đơn vị mình).
 * Bộ lọc idDonVi ở đây chỉ để thu hẹp trong phạm vi đã được phép — chọn đơn vị
 * ngoài phạm vi cũng không lộ thêm dữ liệu.
 */
const DanhSachPhieu = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const { nhanVienIndex } = useNhanVienIndex();

  const [donViList, setDonViList] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [idDonVi, setIdDonVi] = useState('');
  const [trangThaiChon, setTrangThaiChon] = useState([]); // rỗng = mọi trạng thái
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [sortBy, setSortBy] = useState('ngay_tao');
  const [page, setPage] = useState(1);
  const [timKiem, setTimKiem] = useState('');

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  useEffect(() => {
    const taiDonVi = async () => {
      try {
        const res = await apiFetch('donvi');
        if (!res.ok) return;
        const result = await res.json();
        setDonViList(result.Items || (Array.isArray(result) ? result : []));
      } catch (error) {
        console.error('Lỗi tải danh mục đơn vị:', error);
      }
    };
    taiDonVi();
  }, []);

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    try {
      const items = await fetchPhieuList({
        idNam: selectedNam,
        idDonVi: idDonVi || undefined,
        trangThai: trangThaiChon.length > 0 ? trangThaiChon : undefined,
        // input type=date cho ra 'yyyy-MM-dd'; server nhận date-time nên chuỗi này
        // được hiểu là 00:00 ngày đó — đúng ý "từ đầu ngày / đến đầu ngày".
        tuNgay: tuNgay || undefined,
        denNgay: denNgay || undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy,
      });
      setRows(items);
    } catch (error) {
      console.error('Lỗi tải danh sách phiếu:', error);
      showToast('error', 'Lỗi', error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNam, idDonVi, trangThaiChon, tuNgay, denNgay, page, sortBy]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [selectedNam, idDonVi, trangThaiChon, tuNgay, denNgay, sortBy]);

  const toggleTrangThai = (tt) => {
    setTrangThaiChon((cur) =>
      cur.includes(tt) ? cur.filter((x) => x !== tt) : [...cur, tt].sort((a, b) => a - b),
    );
  };

  const rowsHienThi = useMemo(() => {
    const withNames = rows.map((p) => ({ ...p, nv: thongTinNhanVien(nhanVienIndex, p.IdNhanVien) }));
    const q = timKiem.trim().toLowerCase();
    if (!q) return withNames;
    return withNames.filter((p) =>
      [p.nv.hoTen, p.nv.maNhanVien, p.nv.tenDonVi].some((f) =>
        String(f || '').toLowerCase().includes(q),
      ),
    );
  }, [rows, nhanVienIndex, timKiem]);

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Danh sách phiếu đánh giá
        </h2>
        <span className="breadcrumb">
          Toàn bộ phiếu trong phạm vi đơn vị bạn phụ trách, mọi trạng thái
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={(v) => setSelectedNam(v)}
            options={namList.map((n) => ({
              value: n.IdNam,
              label: `Năm học ${n.IdNam}`,
            }))}
            disabled={dangTaiNam}
          />
        </div>

        <div className="cd-field" style={{ flex: '2 1 220px' }}>
          <label className="cd-label">Đơn vị</label>
          <SearchSelect
            value={idDonVi}
            onChange={(v) => setIdDonVi(v)}
            options={[
              { value: '', label: '-- Toàn bộ phạm vi của tôi --' },
              ...donViList.map((dv) => ({ value: dv.IdDonVi, label: dv.TenDonVi })),
            ]}
            placeholder="-- Toàn bộ phạm vi của tôi --"
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Từ ngày (ngày tạo)</label>
          <input
            type="date"
            className="form-input"
            value={tuNgay}
            onChange={(e) => setTuNgay(e.target.value)}
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Đến ngày</label>
          <input
            type="date"
            className="form-input"
            value={denNgay}
            onChange={(e) => setDenNgay(e.target.value)}
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Sắp xếp</label>
          <SearchSelect
            value={sortBy}
            onChange={(v) => setSortBy(v)}
            options={[
              { value: 'ngay_tao', label: 'Ngày tạo' },
              { value: 'ngay_gui', label: 'Ngày gửi' },
            ]}
          />
        </div>

        <div className="cd-field" style={{ flex: '2 1 220px' }}>
          <label className="cd-label">Tìm giảng viên</label>
          <input
            type="text"
            className="form-input"
            placeholder="Họ tên, mã cán bộ, đơn vị..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '18px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Trạng thái:</span>
        <button
          className="cd-status-badge"
          style={{
            cursor: 'pointer',
            background: trangThaiChon.length === 0 ? '#1d4ed8' : '#fff',
            color: trangThaiChon.length === 0 ? '#fff' : '#475569',
            borderColor: trangThaiChon.length === 0 ? '#1d4ed8' : '#e2e8f0',
          }}
          onClick={() => setTrangThaiChon([])}
        >
          Tất cả
        </button>
        {MOI_TRANG_THAI.map((tt) => {
          const meta = TRANG_THAI_META[tt];
          const chon = trangThaiChon.includes(tt);
          return (
            <button
              key={tt}
              className="cd-status-badge"
              style={{
                cursor: 'pointer',
                background: chon ? meta.bg : '#fff',
                color: chon ? meta.color : '#94a3b8',
                borderColor: chon ? meta.border : '#e2e8f0',
              }}
              onClick={() => toggleTrangThai(tt)}
            >
              <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
            </button>
          );
        })}
      </div>

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải danh sách phiếu...
          </div>
        ) : rowsHienThi.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-folder-open"></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>Không có phiếu nào</h3>
            <p style={{ margin: 0 }}>Thử nới bộ lọc trạng thái hoặc khoảng thời gian.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ minWidth: '1050px' }}>
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Giảng viên</th>
                  <th style={{ width: '16%' }}>Đơn vị</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Tổng điểm</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>Xếp loại</th>
                  <th style={{ width: '11%' }}>Ngày gửi</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((p) => (
                  <tr key={p.IdPhieu}>
                    <td>
                      <div className="teacher-avatar-wrapper">
                        <div className="teacher-avatar">{chuCaiDau(p.nv.hoTen)}</div>
                        <div>
                          <b style={{ color: '#0f172a', display: 'block' }}>{p.nv.hoTen}</b>
                          {p.nv.maNhanVien && <span className="code-pill">{p.nv.maNhanVien}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: '#475569' }}>{p.nv.tenDonVi || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <TrangThaiBadge trangThai={p.TrangThai} />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatDiem(p.TongDiemTichLuy)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <XepLoaiBadge xepLoai={p.XepLoai} />
                    </td>
                    <td style={{ fontSize: '13px' }}>{formatNgay(p.NgayGui)}</td>
                    <td>
                      <div className="table-actions">
                        {p.TrangThai === TRANG_THAI.DON_VI_CHAM ? (
                          <button
                            className="action-btn edit-btn"
                            title="Chấm điểm phiếu này"
                            onClick={() => navigate(`/quan-ly/phieu/${p.IdPhieu}`)}
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                        ) : (
                          <button
                            className="action-btn view-btn"
                            title="Xem chi tiết phiếu"
                            onClick={() => navigate(`/quan-ly/phieu/${p.IdPhieu}`)}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          <span>Trang {page}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-cancel"
              style={{ padding: '8px 14px' }}
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="fa-solid fa-chevron-left"></i> Trước
            </button>
            <button
              className="btn-cancel"
              style={{ padding: '8px 14px' }}
              disabled={rows.length < PAGE_SIZE || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DanhSachPhieu;
