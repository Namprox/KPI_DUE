import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import FilePreviewModal from '../../components/Common/FilePreviewModal';
import { TrangThaiBadge } from '../../components/QuanLyChamDiem/TrangThaiBadge';
import { useMinhChungPhieuPreview } from '../../hooks/useMinhChungPhieuPreview';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import { formatNgay } from '../../utils/phieuApi';
import SearchSelect from '../../components/Common/SearchSelect';
import {
  fetchKhoMinhChung,
  formatKb,
  iconFile,
  laMinhChungFile,
} from '../../utils/minhChungPhieuApi';

/**
 * Kho minh chứng cá nhân: mọi tệp/liên kết đã nộp kèm phiếu KPI, xuyên năm.
 *
 * Chỉ đọc — xem trước và tải về. Sửa tên / xóa minh chứng vẫn nằm ở form tự đánh
 * giá, nơi phiếu còn ở trạng thái Nhập và người dùng đang có ngữ cảnh tiêu chí.
 *
 * Bộ lọc phản chiếu đúng thứ tự ưu tiên của server: idPhieu > idNam > không có
 * tham số (mọi năm). Vì vậy khi vào từ danh sách phiếu (?idPhieu=) thì ô chọn năm
 * bị khóa — chọn năm lúc đó sẽ không có tác dụng gì, khóa lại thì thật thà hơn.
 */
const KhoMinhChung = () => {
  const toast = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { namList, selectedNam, dangTaiNam } = useNamDanhGia();

  const idPhieu = searchParams.get('idPhieu');

  const [idNam, setIdNam] = useState('');
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timKiem, setTimKiem] = useState('');
  // Chỉ tải sau khi năm mặc định đã được gieo, nếu không lượt tải đầu tiên chạy
  // với bộ lọc rỗng rồi lập tức bị lượt thứ hai thay thế.
  const [daSanSang, setDaSanSang] = useState(false);

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungPhieuPreview((message) => showToast('error', 'Lỗi', message));

  // Mặc định mở theo năm đang chạy; người dùng chuyển sang "tất cả" khi cần tra cứu cũ.
  useEffect(() => {
    if (dangTaiNam) return;
    setIdNam(String(selectedNam || ''));
    setDaSanSang(true);
  }, [dangTaiNam, selectedNam]);

  const taiDanhSach = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchKhoMinhChung(
        idPhieu ? { idPhieu } : { idNam: idNam || undefined },
      );
      setRows(items);
    } catch (error) {
      console.error('Lỗi tải kho minh chứng:', error);
      showToast('error', 'Lỗi', error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [idPhieu, idNam]);

  useEffect(() => {
    if (daSanSang) taiDanhSach();
  }, [daSanSang, taiDanhSach]);

  const rowsHienThi = useMemo(() => {
    const q = timKiem.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((mc) =>
      [mc.TenHienThi, mc.TenFileGoc, mc.TenTieuChi].some((f) =>
        String(f || '').toLowerCase().includes(q),
      ),
    );
  }, [rows, timKiem]);

  const tongDungLuongKb = useMemo(
    () =>
      rowsHienThi.reduce(
        (tong, mc) => tong + (laMinhChungFile(mc) ? Number(mc.KichThuocKb) || 0 : 0),
        0,
      ),
    [rowsHienThi],
  );

  const boLocPhieu = () => {
    const con = new URLSearchParams(searchParams);
    con.delete('idPhieu');
    setSearchParams(con, { replace: true });
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Kho minh chứng
        </h2>
        <span className="breadcrumb">
          Toàn bộ minh chứng bạn đã nộp kèm phiếu KPI, tra cứu theo phiếu hoặc theo năm
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <div title={idPhieu ? 'Đang lọc theo một phiếu cụ thể' : undefined}>
            <SearchSelect
              value={idNam}
              onChange={(v) => setIdNam(v)}
              options={[
                { value: '', label: '-- Tất cả các năm --' },
                ...namList.map((n) => ({
                  value: n.IdNam,
                  label: `Năm học ${n.IdNam}`,
                })),
              ]}
              placeholder="-- Tất cả các năm --"
              disabled={dangTaiNam || Boolean(idPhieu)}
            />
          </div>
        </div>

        <div className="cd-field" style={{ flex: '2 1 260px' }}>
          <label className="cd-label">Tìm minh chứng</label>
          <input
            type="text"
            className="form-input"
            placeholder="Tên tệp, tên hiển thị, tên tiêu chí..."
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

      {idPhieu && (
        <div style={{ marginBottom: '18px' }}>
          <button type="button" className="cd-chip" onClick={boLocPhieu}>
            <i className="fa-solid fa-filter"></i>
            <span>Đang lọc theo phiếu #{idPhieu}</span>
            <i className="fa-solid fa-xmark" style={{ marginLeft: '2px' }}></i>
          </button>
        </div>
      )}

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải kho minh chứng...
          </div>
        ) : rowsHienThi.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-folder-open"></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>Chưa có minh chứng nào</h3>
            <p style={{ margin: 0 }}>
              {timKiem
                ? 'Không có minh chứng nào khớp từ khóa tìm kiếm.'
                : 'Minh chứng bạn tải lên trong phiếu tự đánh giá sẽ xuất hiện ở đây.'}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="custom-table" style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Minh chứng</th>
                  <th style={{ width: '26%' }}>Tiêu chí</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Năm</th>
                  <th style={{ width: '16%', textAlign: 'center' }}>Trạng thái phiếu</th>
                  <th style={{ width: '9%', textAlign: 'right' }}>Dung lượng</th>
                  <th style={{ width: '11%' }}>Ngày tải lên</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Tải về</th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((mc) => {
                  const laFile = laMinhChungFile(mc);
                  const icon = iconFile(mc);
                  return (
                    <tr key={mc.IdMinhChung}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <i
                            className={`${laFile ? icon.className : 'fa-solid fa-link'} cd-mc-icon`}
                            style={{ color: laFile ? icon.color : '#1d4ed8' }}
                          ></i>
                          <div style={{ minWidth: 0 }}>
                            {laFile ? (
                              <button
                                type="button"
                                className="cd-mc-name"
                                title="Xem trước tệp"
                                onClick={() => openPreview(mc)}
                              >
                                {mc.TenHienThi || mc.TenFileGoc}
                              </button>
                            ) : (
                              // Minh chứng dạng liên kết / DOI không có tệp trên máy chủ
                              <a
                                className="cd-mc-name"
                                href={mc.DuongDan}
                                target="_blank"
                                rel="noreferrer"
                                title={mc.DuongDan}
                              >
                                {mc.TenHienThi || mc.DuongDan}
                              </a>
                            )}
                            {laFile && mc.TenFileGoc && mc.TenFileGoc !== mc.TenHienThi && (
                              <div className="cd-mc-meta">{mc.TenFileGoc}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: '#475569' }}>
                        {mc.TenTieuChi || `Tiêu chí #${mc.IdTieuChi}`}
                      </td>
                      <td className="table-num-strong" style={{ textAlign: 'center' }}>
                        {mc.IdNam}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <TrangThaiBadge trangThai={mc.TrangThaiPhieu} />
                      </td>
                      <td className="table-num">
                        {laFile ? formatKb(mc.KichThuocKb) : <span className="table-empty-mark">—</span>}
                      </td>
                      <td className="table-num">{formatNgay(mc.NgayTaiLen)}</td>
                      <td>
                        <div className="table-actions">
                          {laFile ? (
                            <button
                              type="button"
                              className="action-btn view-btn"
                              title="Tải tệp về máy"
                              onClick={() => downloadMinhChung(mc)}
                            >
                              <i className="fa-solid fa-download"></i>
                            </button>
                          ) : (
                            <span className="table-empty-mark">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && rowsHienThi.length > 0 && (
          <div className="table-foot">
            <span>
              {rowsHienThi.length} minh chứng
              {timKiem && rows.length !== rowsHienThi.length ? ` / ${rows.length} tổng cộng` : ''}
            </span>
            <span>
              Tổng dung lượng <strong>{formatKb(tongDungLuongKb)}</strong>
            </span>
          </div>
        )}
      </div>

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenHienThi || preview.mc?.TenFileGoc}
        kieu={preview.kieu}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />
    </div>
  );
};

export default KhoMinhChung;
