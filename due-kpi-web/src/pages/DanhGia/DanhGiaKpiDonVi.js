import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { formatDiem, formatNgayGio } from '../../utils/phieuApi';
import {
  fetchPhieuDonViList,
  taoPhieuDonVi,
  TRANG_THAI_DV,
} from '../../utils/phieuDonViApi';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import {
  TrangThaiDonViBadge,
  XepLoaiBadge,
} from '../../components/QuanLyChamDiem/TrangThaiBadge';
import SearchSelect from '../../components/Common/SearchSelect';

const PAGE_SIZE = 20;

/**
 * Danh sách phiếu ĐÁNH GIÁ KPI ĐƠN VỊ của một năm — lối vào của thư ký Khoa.
 *
 * Khác hẳn "Danh sách phiếu đánh giá" (/quan-ly/phieu): ở đó mỗi dòng là một
 * NGƯỜI, ở đây mỗi dòng là một ĐƠN VỊ. Hai phân hệ chạy trên hai bộ endpoint và
 * hai máy trạng thái riêng, không dùng chung màn hình nào.
 *
 * Phạm vi dữ liệu do server quyết theo chức vụ trong JWT: thư ký chỉ thấy phiếu
 * của đơn vị mình (và đơn vị con nếu có). Bộ lọc đơn vị ở đây chỉ thu hẹp trong
 * phạm vi đó chứ không mở thêm dữ liệu.
 *
 * Mỗi đơn vị chỉ MỘT phiếu mỗi năm, nên nút "Lập phiếu" cố tình không tự đoán
 * đơn vị: nó mở hộp thoại để người dùng xác nhận, và server vẫn là chốt chặn
 * cuối cùng (chỉ cấp nhập đơn vị mới tạo được, tạo trùng trả 400).
 */
const DanhGiaKpiDonVi = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [donViList, setDonViList] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idDonVi, setIdDonVi] = useState('');
  const [page, setPage] = useState(1);

  const [moHopThoaiLap, setMoHopThoaiLap] = useState(false);
  const [donViLap, setDonViLap] = useState('');
  const [dangLap, setDangLap] = useState(false);

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
      const items = await fetchPhieuDonViList({
        idNam: selectedNam,
        idDonVi: idDonVi || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(items);
    } catch (error) {
      console.error('Lỗi tải danh sách phiếu KPI đơn vị:', error);
      showToast('error', 'Lỗi', error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNam, idDonVi, page]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [selectedNam, idDonVi]);

  const tenDonVi = useMemo(() => {
    const map = new Map();
    donViList.forEach((dv) => map.set(Number(dv.IdDonVi), dv.TenDonVi));
    return map;
  }, [donViList]);

  const moHopThoai = () => {
    // Đơn vị của chính người đăng nhập là lựa chọn đúng trong gần như mọi trường
    // hợp — điền sẵn để thư ký chỉ phải xác nhận, nhưng vẫn cho đổi vì Khoa lớn
    // có đơn vị con.
    setDonViLap(user?.IdDonVi ? String(user.IdDonVi) : '');
    setMoHopThoaiLap(true);
  };

  const handleLapPhieu = async () => {
    if (!selectedNam || !donViLap) {
      showToast('warn', 'Thiếu thông tin', 'Chọn năm đánh giá và đơn vị trước khi lập phiếu.');
      return;
    }
    setDangLap(true);
    try {
      const item = await taoPhieuDonVi({ idNam: selectedNam, idDonVi: donViLap });
      setMoHopThoaiLap(false);
      if (item?.IdPhieuDv) {
        navigate(`/danh-gia-kpi-don-vi/${item.IdPhieuDv}`);
        return;
      }
      // Server báo thành công nhưng không trả Item: không có gì để mở, tải lại
      // danh sách để người dùng tự thấy phiếu vừa tạo.
      showToast('success', 'Đã lập phiếu', 'Phiếu KPI đơn vị đã được tạo.');
      taiDanhSach();
    } catch (error) {
      console.error('Lỗi lập phiếu KPI đơn vị:', error);
      showToast('error', 'Không lập được phiếu', error.message);
    } finally {
      setDangLap(false);
    }
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Đánh giá KPI đơn vị
        </h2>
        <span className="breadcrumb">
          Phiếu KPI của Khoa / Phòng — thư ký nhập điểm rồi trình Trưởng đơn vị
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

        <div className="cd-field" style={{ flex: '2 1 240px' }}>
          <label className="cd-label">Đơn vị</label>
          <SearchSelect
            value={idDonVi}
            onChange={(v) => setIdDonVi(v)}
            options={[
              { value: '', label: '-- Toàn bộ phạm vi của tôi --' },
              ...donViList.map((dv) => ({ value: dv.IdDonVi, label: dv.TenDonVi })),
            ]}
            placeholder="-- Toàn bộ phạm vi của tôi --"
            searchable
          />
        </div>

        <div className="cd-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn-add-new" onClick={moHopThoai} disabled={!selectedNam}>
            <i className="fa-solid fa-plus"></i> Lập phiếu đơn vị
          </button>
        </div>
      </div>

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải danh sách phiếu KPI đơn vị...
          </div>
        ) : rows.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-folder-open"></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>
              Chưa có phiếu nào cho năm học {selectedNam || '—'}
            </h3>
            <p style={{ margin: 0 }}>
              Bấm <b>Lập phiếu đơn vị</b> để tạo phiếu KPI của đơn vị bạn. Mỗi đơn
              vị chỉ có một phiếu mỗi năm.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ minWidth: '960px' }}>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Đơn vị</th>
                  <th style={{ width: '18%' }}>Mẫu đánh giá</th>
                  <th style={{ width: '18%', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Tổng điểm</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>Xếp loại</th>
                  <th style={{ width: '12%' }}>Cập nhật</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.IdPhieuDv}>
                    <td>
                      <b style={{ color: '#0f172a' }}>
                        {p.TenDonVi || tenDonVi.get(Number(p.IdDonVi)) || `Đơn vị #${p.IdDonVi}`}
                      </b>
                      <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                        Năm học {p.IdNam} · Lần đánh giá {p.LanDanhGia}
                        {p.LanMoLai > 0 ? ` · Đã mở lại ${p.LanMoLai} lần` : ''}
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: '#475569' }}>
                      {p.TenMau || <span className="table-empty-mark">—</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <TrangThaiDonViBadge trangThai={p.TrangThai} />
                    </td>
                    <td className="table-num-strong">{formatDiem(p.TongDiemTichLuy)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <XepLoaiBadge xepLoai={p.XepLoai} />
                    </td>
                    <td style={{ fontSize: '13px' }}>{formatNgayGio(p.NgayCapNhat)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className={
                            Number(p.TrangThai) === TRANG_THAI_DV.NHAP
                              ? 'action-btn edit-btn'
                              : 'action-btn view-btn'
                          }
                          title={
                            Number(p.TrangThai) === TRANG_THAI_DV.NHAP
                              ? 'Nhập điểm cho phiếu này'
                              : 'Xem chi tiết phiếu'
                          }
                          onClick={() => navigate(`/danh-gia-kpi-don-vi/${p.IdPhieuDv}`)}
                        >
                          <i
                            className={`fa-solid ${
                              Number(p.TrangThai) === TRANG_THAI_DV.NHAP
                                ? 'fa-pen'
                                : 'fa-eye'
                            }`}
                          ></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="cd-pager">
          <span>
            Trang {page} · {rows.length} phiếu
          </span>
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

      {moHopThoaiLap && (
        <div
          className="modal-overlay"
          onClick={dangLap ? undefined : () => setMoHopThoaiLap(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Lập phiếu KPI đơn vị</h3>
              <button
                className="close-btn"
                onClick={() => setMoHopThoaiLap(false)}
                disabled={dangLap}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Năm đánh giá</label>
                <input
                  className="form-input"
                  value={selectedNam ? `Năm học ${selectedNam}` : ''}
                  readOnly
                />
              </div>

              <div className="form-group" style={{ marginTop: '14px' }}>
                <label>
                  Đơn vị <span className="text-red">*</span>
                </label>
                <SearchSelect
                  value={donViLap}
                  onChange={(v) => setDonViLap(v)}
                  options={donViList.map((dv) => ({
                    value: dv.IdDonVi,
                    label: dv.TenDonVi,
                  }))}
                  placeholder="-- Chọn đơn vị --"
                  searchable
                  disabled={dangLap}
                />
              </div>

              <div className="cd-hint">
                <i className="fa-solid fa-circle-info"></i> Hệ thống tự chọn mẫu
                đánh giá theo loại đơn vị (Khoa hay Phòng). Bạn chỉ lập được phiếu
                cho đơn vị mình phụ trách, và mỗi đơn vị chỉ có một phiếu mỗi năm.
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setMoHopThoaiLap(false)}
                disabled={dangLap}
              >
                Hủy
              </button>
              <button className="btn-submit" onClick={handleLapPhieu} disabled={dangLap}>
                {dangLap ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang lập...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plus"></i> Lập phiếu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DanhGiaKpiDonVi;
