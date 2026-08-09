import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { fetchPhieuChoCham, formatNgay } from '../../utils/phieuApi';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import { chuCaiDau, thongTinNhanVien, useNhanVienIndex } from '../../hooks/useNhanVienIndex';
import TienDoCham from '../../components/QuanLyChamDiem/TienDoCham';
import SearchSelect from '../../components/Common/SearchSelect';

const PAGE_SIZE = 20;

/**
 * Hàng đợi phiếu chờ đơn vị chấm.
 *
 * Server đã lọc sẵn theo JWT + bảng tieu_chi_don_vi_cham: chỉ trả phiếu
 * (trang_thai = 2) mà đơn vị đang đăng nhập có ít nhất một tiêu chí được giao.
 * FE không lọc lại phạm vi, chỉ hiển thị và điều hướng.
 *
 * Phân trang: PhieuDanhGiaResponse không trả tổng số trang, nên nút "Trang sau"
 * chỉ mở khi trang hiện tại đầy (đủ pageSize dòng) — hết dữ liệu sẽ tự khóa lại.
 */
const ChoCham = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const { nhanVienIndex } = useNhanVienIndex();

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('ngay_gui');
  const [timKiem, setTimKiem] = useState('');

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    try {
      const items = await fetchPhieuChoCham({
        idNam: selectedNam,
        page,
        pageSize: PAGE_SIZE,
        sortBy,
      });
      setRows(items);
    } catch (error) {
      console.error('Lỗi tải hàng đợi chờ chấm:', error);
      showToast('error', 'Lỗi', error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNam, page, sortBy]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  // Đổi bộ lọc thì phải về trang 1, nếu không sẽ hiện trang trống của tập kết quả mới.
  useEffect(() => {
    setPage(1);
  }, [selectedNam, sortBy]);

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

  const tongTienDo = useMemo(() => {
    const tong = rows.reduce((s, p) => s + (p.SoTieuChiDuocGiao || 0), 0);
    const xong = rows.reduce((s, p) => s + (p.SoTieuChiDaCham || 0), 0);
    const chuaDung = rows.filter(
      (p) => (p.SoTieuChiDaCham || 0) < (p.SoTieuChiDuocGiao || 0),
    ).length;
    return { tong, xong, chuaDung };
  }, [rows]);

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Hàng đợi chờ chấm
        </h2>
        <span className="breadcrumb">
          Phiếu đã gửi lên và đơn vị của bạn được giao chấm ít nhất một tiêu chí
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

        <div className="cd-field">
          <label className="cd-label">Sắp xếp theo</label>
          <SearchSelect
            value={sortBy}
            onChange={(v) => setSortBy(v)}
            options={[
              { value: 'ngay_gui', label: 'Ngày gửi' },
              { value: 'ngay_tao', label: 'Ngày tạo' },
            ]}
          />
        </div>

        <div className="cd-field" style={{ flex: '2 1 240px' }}>
          <label className="cd-label">Tìm giảng viên</label>
          <input
            type="text"
            className="form-input"
            placeholder="Họ tên, mã cán bộ, đơn vị..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
        </div>

        <button
          className="btn-cancel"
          onClick={taiDanhSach}
          disabled={isLoading}
        >
          <i className={`fa-solid fa-rotate${isLoading ? ' fa-spin' : ''}`}></i> Làm mới
        </button>
      </div>

      <div className="stat-card-grid">
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-amber">
            <i className="fa-solid fa-clipboard-list"></i>
          </div>
          <div>
            <div className="stat-label">Phiếu trong hàng đợi</div>
            <div className="stat-value">{rows.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-blue">
            <i className="fa-solid fa-list-check"></i>
          </div>
          <div>
            <div className="stat-label">Tiêu chí bạn được giao</div>
            <div className="stat-value">{tongTienDo.tong}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-green">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="stat-label">Tiêu chí đã chấm</div>
            <div className="stat-value">{tongTienDo.xong}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-purple">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div>
            <div className="stat-label">Phiếu chưa chấm xong</div>
            <div className="stat-value">{tongTienDo.chuaDung}</div>
          </div>
        </div>
      </div>

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải hàng đợi...
          </div>
        ) : rowsHienThi.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-mug-hot"></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>Không có phiếu nào chờ chấm</h3>
            <p style={{ margin: 0 }}>
              Hàng đợi trống nghĩa là mọi phiếu thuộc phần việc của đơn vị bạn đã được chấm xong,
              hoặc chưa có giảng viên nào gửi phiếu lên.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Giảng viên</th>
                  <th style={{ width: '20%' }}>Đơn vị</th>
                  <th style={{ width: '12%' }}>Ngày gửi</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Vòng</th>
                  <th style={{ width: '20%' }}>Tiến độ phần bạn chấm</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((p) => {
                  const xong = p.SoTieuChiDaCham || 0;
                  const tong = p.SoTieuChiDuocGiao || 0;
                  return (
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
                      <td style={{ fontSize: '13px' }}>{formatNgay(p.NgayGui)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="tag-badge">Lần {p.LanDanhGia}</span>
                      </td>
                      <td>
                        <TienDoCham xong={xong} tong={tong} nhan="Đã chấm" />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-submit"
                          title="Mở màn hình chấm"
                          style={{ padding: '8px 14px' }}
                          onClick={() => navigate(`/quan-ly/phieu/${p.IdPhieu}`)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i> Chấm
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

export default ChoCham;
