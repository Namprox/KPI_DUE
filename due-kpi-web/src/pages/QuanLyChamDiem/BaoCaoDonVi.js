import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { apiFetch } from '../../utils/api';
import {
  fetchBaoCaoChuaHoanTat,
  fetchBaoCaoDiemTrungBinh,
  fetchBaoCaoTongQuan,
  formatDiem,
  formatNgay,
  LOAI_DOI_TUONG,
  TRANG_THAI_META,
} from '../../utils/phieuApi';
import { useAuth } from '../../context/AuthContext';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import { useChuaTuCham } from '../../hooks/useChuaTuCham';
import { TrangThaiBadge } from '../../components/QuanLyChamDiem/TrangThaiBadge';
import SearchSelect from '../../components/Common/SearchSelect';

/** Số ngày trôi mà một phiếu chưa hoàn tất bị coi là "để quá lâu". */
const NGUONG_TRE = 30;

const TEN_LOAI_DOI_TUONG = {
  [LOAI_DOI_TUONG.GIANG_VIEN]: 'Giảng viên',
  [LOAI_DOI_TUONG.VIEN_CHUC]: 'Viên chức / NLĐ',
};

/**
 * Báo cáo tiến độ và kết quả KPI của đơn vị.
 *
 * Cả ba endpoint đều BẮT BUỘC idNam (thiếu là 400) và tự giới hạn phạm vi theo
 * chức vụ trong JWT, nên bộ lọc đơn vị ở đây chỉ để thu hẹp trong phạm vi sẵn có.
 *
 * Khối cuối trang KHÔNG đến từ báo cáo: /bao-cao/chua-hoan-tat chỉ liệt kê phiếu
 * ĐÃ TỒN TẠI, nên người chưa bấm lưu lần nào không lọt vào bất kỳ con số nào phía
 * trên — kể cả "Tổng số phiếu". Danh sách chưa lập phiếu được ghép riêng ở client
 * (useChuaTuCham) và cố tình để tách bảng: nó đếm NGƯỜI, không đếm phiếu.
 */
const BaoCaoDonVi = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [donViList, setDonViList] = useState([]);
  const [idDonVi, setIdDonVi] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [tongQuan, setTongQuan] = useState(null);
  const [diemTb, setDiemTb] = useState([]);
  const [chuaHoanTat, setChuaHoanTat] = useState([]);

  const {
    chuaLapPhieu,
    dangTai: dangTaiChuaLap,
    loi: loiChuaLap,
    taiLai: taiLaiChuaLap,
  } = useChuaTuCham({
    idNam: selectedNam,
    idDonViGoc: user?.IdDonVi,
    idDonViLoc: idDonVi || undefined,
  });

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

  const taiBaoCao = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    const tham = { idNam: selectedNam, idDonVi: idDonVi || undefined };

    const [tq, tb, cht] = await Promise.allSettled([
      fetchBaoCaoTongQuan(tham),
      fetchBaoCaoDiemTrungBinh(tham),
      fetchBaoCaoChuaHoanTat(tham),
    ]);

    setTongQuan(tq.status === 'fulfilled' ? tq.value : null);
    setDiemTb(tb.status === 'fulfilled' ? tb.value : []);
    setChuaHoanTat(cht.status === 'fulfilled' ? cht.value : []);

    // Gộp lỗi thành một toast: ba khối cùng hỏng thường là cùng một nguyên nhân.
    const loi = [tq, tb, cht].find((r) => r.status === 'rejected');
    if (loi) showToast('error', 'Lỗi tải báo cáo', loi.reason.message);

    setIsLoading(false);
  }, [selectedNam, idDonVi]);

  useEffect(() => {
    if (!dangTaiNam) taiBaoCao();
  }, [dangTaiNam, taiBaoCao]);

  const demTheoTrangThai = useMemo(() => {
    const map = new Map();
    (tongQuan?.DemTheoTrangThai || []).forEach((d) => map.set(Number(d.TrangThai), d.SoLuong));
    return map;
  }, [tongQuan]);

  const soTre = useMemo(
    () => chuaHoanTat.filter((r) => (r.SoNgayTroi || 0) >= NGUONG_TRE).length,
    [chuaHoanTat],
  );

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Báo cáo đơn vị
        </h2>
        <span className="breadcrumb">
          Tiến độ phiếu, điểm trung bình theo đơn vị và danh sách phiếu chưa hoàn tất
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
          />
        </div>

        <button
          className="btn-cancel"
          onClick={() => {
            taiBaoCao();
            taiLaiChuaLap();
          }}
          disabled={isLoading}
        >
          <i className={`fa-solid fa-rotate${isLoading ? ' fa-spin' : ''}`}></i> Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tổng hợp số liệu...
          </div>
        </div>
      ) : (
        <>
          <p className="sub-title" style={{ marginBottom: '10px' }}>
            TIẾN ĐỘ PHIẾU ({tongQuan?.TongSoPhieu ?? 0} phiếu)
          </p>
          <div className="stat-card-grid">
            {Object.entries(TRANG_THAI_META).map(([tt, meta]) => (
              <div className="stat-card" key={tt}>
                <div
                  className="stat-icon-box"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  <i className={`fa-solid ${meta.icon}`}></i>
                </div>
                <div>
                  <div className="stat-label">{meta.label}</div>
                  <div className="stat-value">{demTheoTrangThai.get(Number(tt)) || 0}</div>
                </div>
              </div>
            ))}
          </div>

          {(tongQuan?.DemTheoXepLoai || []).length > 0 && (
            <>
              <p className="sub-title" style={{ marginBottom: '10px' }}>
                XẾP LOẠI (CHỈ TÍNH PHIẾU ĐÃ HOÀN TẤT)
              </p>
              <div className="stat-card-grid">
                {tongQuan.DemTheoXepLoai.map((x) => (
                  <div className="stat-card" key={x.XepLoai}>
                    <div className="stat-icon-box stat-icon-green">
                      <i className="fa-solid fa-award"></i>
                    </div>
                    <div>
                      <div className="stat-label">{x.XepLoai}</div>
                      <div className="stat-value">{x.SoLuong}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="sub-title" style={{ marginBottom: '10px' }}>
            ĐIỂM TRUNG BÌNH THEO ĐƠN VỊ TRỰC THUỘC
          </p>
          <div className="modern-table-card" style={{ marginBottom: '24px' }}>
            {diemTb.length === 0 ? (
              <div className="cd-empty">
                <i className="fa-solid fa-chart-column"></i>
                Chưa có phiếu nào hoàn tất trong năm này nên chưa tính được điểm trung bình.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ minWidth: '700px' }}>
                  <thead>
                    <tr>
                      <th>Đơn vị</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Số phiếu</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Trung bình</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Thấp nhất</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Cao nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diemTb.map((r) => (
                      <tr key={r.IdDonVi}>
                        <td>
                          <b style={{ color: '#0f172a' }}>{r.TenDonVi || `Đơn vị #${r.IdDonVi}`}</b>
                          {r.MaDonVi && (
                            <span className="code-pill" style={{ marginLeft: '8px' }}>
                              {r.MaDonVi}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>{r.SoPhieu}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>
                          {formatDiem(r.DiemTrungBinh)}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatDiem(r.DiemThapNhat)}</td>
                        <td style={{ textAlign: 'right' }}>{formatDiem(r.DiemCaoNhat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="sub-title" style={{ marginBottom: '10px' }}>
            PHIẾU CHƯA HOÀN TẤT ({chuaHoanTat.length}
            {soTre > 0 ? `, ${soTre} phiếu quá ${NGUONG_TRE} ngày` : ''})
          </p>
          <div className="modern-table-card">
            {chuaHoanTat.length === 0 ? (
              <div className="cd-empty">
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                Mọi phiếu trong phạm vi của bạn đã hoàn tất.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '26%' }}>Giảng viên</th>
                      <th style={{ width: '20%' }}>Đơn vị</th>
                      <th style={{ width: '16%', textAlign: 'center' }}>Trạng thái</th>
                      <th style={{ width: '12%' }}>Ngày tạo</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Số ngày trôi</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Mở</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chuaHoanTat.map((r) => {
                      const tre = (r.SoNgayTroi || 0) >= NGUONG_TRE;
                      return (
                        <tr key={r.IdPhieu}>
                          <td>
                            <b style={{ color: '#0f172a', display: 'block' }}>{r.HoTen || `#${r.IdNhanVien}`}</b>
                            {r.MaNhanVien && <span className="code-pill">{r.MaNhanVien}</span>}
                          </td>
                          <td style={{ fontSize: '13px', color: '#475569' }}>{r.TenDonVi || '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <TrangThaiBadge trangThai={r.TrangThai} />
                          </td>
                          <td style={{ fontSize: '13px' }}>{formatNgay(r.NgayTao)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="rating-badge"
                              style={
                                tre
                                  ? { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
                                  : { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }
                              }
                            >
                              {r.SoNgayTroi} ngày
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="action-btn view-btn"
                                title="Mở phiếu"
                                onClick={() => navigate(`/quan-ly/phieu/${r.IdPhieu}`)}
                              >
                                <i className="fa-solid fa-eye"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="sub-title" style={{ marginTop: '24px', marginBottom: '10px' }}>
            CHƯA LẬP PHIẾU ({dangTaiChuaLap ? '…' : chuaLapPhieu.length} người)
          </p>
          <div className="modern-table-card">
            {loiChuaLap ? (
              <div className="cd-empty">
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }}></i>
                {loiChuaLap}
              </div>
            ) : dangTaiChuaLap ? (
              <div className="cd-empty">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Đang đối chiếu danh bạ đơn vị với danh sách phiếu...
              </div>
            ) : chuaLapPhieu.length === 0 ? (
              <div className="cd-empty">
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                Mọi người thuộc diện đánh giá trong phạm vi của bạn đều đã có phiếu.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="custom-table" style={{ minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Họ tên</th>
                      <th style={{ width: '26%' }}>Đơn vị</th>
                      <th style={{ width: '22%' }}>Chức danh</th>
                      <th style={{ width: '14%' }}>Loại phiếu</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Mở</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chuaLapPhieu.map((r) => (
                      <tr key={r.key}>
                        <td>
                          <b style={{ color: '#0f172a', display: 'block' }}>{r.HoTen}</b>
                          {r.MaNhanVien && <span className="code-pill">{r.MaNhanVien}</span>}
                        </td>
                        <td style={{ fontSize: '13px', color: '#475569' }}>
                          {r.TenDonVi || '—'}
                        </td>
                        <td style={{ fontSize: '13px', color: '#475569' }}>
                          {r.TenChucDanh || '—'}
                        </td>
                        <td style={{ fontSize: '13px', color: '#475569' }}>
                          {TEN_LOAI_DOI_TUONG[Number(r.LoaiDoiTuong)] || '—'}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="action-btn view-btn"
                              title="Xem hồ sơ KPI của người này"
                              onClick={() => navigate(`/quan-ly/giang-vien/${r.IdNhanVien}`)}
                            >
                              <i className="fa-solid fa-id-card"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BaoCaoDonVi;
