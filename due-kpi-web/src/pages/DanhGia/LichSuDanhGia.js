import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { useAuth } from '../../context/AuthContext';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import {
  fetchPhieuList,
  formatDiem,
  formatNgay,
  TRANG_THAI,
  TRANG_THAI_META,
} from '../../utils/phieuApi';
import { duongDanPhieuTuDanhGia } from '../../utils/roles';
import {
  TrangThaiBadge,
  XepLoaiBadge,
} from '../../components/QuanLyChamDiem/TrangThaiBadge';

const PAGE_SIZE = 20;

const MOI_TRANG_THAI = [
  TRANG_THAI.NHAP,
  TRANG_THAI.DON_VI_CHAM,
  TRANG_THAI.CHO_HT_DUYET,
  TRANG_THAI.HT_DA_DUYET,
  TRANG_THAI.HOAN_TAT,
];

/**
 * Danh sách phiếu đánh giá của CHÍNH NGƯỜI ĐANG ĐĂNG NHẬP, qua các năm.
 *
 * Luôn truyền idNhanVien của mình: với người không thuộc cấp Khoa/Trường thì
 * server đã tự giới hạn phạm vi, còn với trưởng đơn vị thì tham số này là thứ
 * ngăn màn hình "phiếu của tôi" biến thành danh sách toàn đơn vị.
 */
const LichSuDanhGia = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = user || {};
  // Bộ lọc năm ở đây có thêm lựa chọn "tất cả" nên giữ state riêng, chỉ mượn
  // selectedNam của hook làm giá trị mặc định lúc mở trang.
  const { namList, selectedNam, dangTaiNam } = useNamDanhGia();

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [idNam, setIdNam] = useState(''); // '' = mọi năm
  const [trangThaiChon, setTrangThaiChon] = useState([]); // rỗng = mọi trạng thái
  const [sortBy, setSortBy] = useState('ngay_tao');
  const [page, setPage] = useState(1);
  // Chỉ tải sau khi năm mặc định đã được gieo, nếu không lượt tải đầu tiên chạy
  // với bộ lọc rỗng rồi lập tức bị lượt thứ hai thay thế.
  const [daSanSang, setDaSanSang] = useState(false);

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  // Mặc định bám theo năm đang mở, người dùng vẫn chuyển sang "mọi năm" được.
  useEffect(() => {
    if (dangTaiNam) return;
    setIdNam(String(selectedNam || ''));
    setDaSanSang(true);
  }, [dangTaiNam, selectedNam]);

  const taiDanhSach = useCallback(async () => {
    if (!currentUser.IdNhanVien) return;
    setIsLoading(true);
    try {
      const items = await fetchPhieuList({
        idNam: idNam || undefined,
        idNhanVien: currentUser.IdNhanVien,
        trangThai: trangThaiChon.length > 0 ? trangThaiChon : undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy,
      });
      setRows(items);
    } catch (error) {
      console.error('Lỗi tải danh sách phiếu của tôi:', error);
      showToast('error', 'Lỗi', error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.IdNhanVien, idNam, trangThaiChon, page, sortBy]);

  useEffect(() => {
    if (daSanSang) taiDanhSach();
  }, [daSanSang, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [idNam, trangThaiChon, sortBy]);

  const toggleTrangThai = (tt) => {
    setTrangThaiChon((cur) =>
      cur.includes(tt) ? cur.filter((x) => x !== tt) : [...cur, tt].sort((a, b) => a - b),
    );
  };

  const moPhieu = (p) => {
    const duongDan = duongDanPhieuTuDanhGia(currentUser, p.IdNam);
    if (duongDan) navigate(duongDan);
    else {
      showToast(
        'warn',
        'Không mở được phiếu',
        'Chức danh nghề nghiệp của bạn không gắn với biểu mẫu KPI cá nhân nào.',
      );
    }
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Phiếu đánh giá của tôi
        </h2>
        <span className="breadcrumb">
          {currentUser.HoTen || 'Người dùng'} — toàn bộ phiếu KPI qua các năm
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <select
            className="form-input"
            value={idNam}
            onChange={(e) => setIdNam(e.target.value)}
            disabled={dangTaiNam}
          >
            <option value="">-- Tất cả các năm --</option>
            {namList.map((n) => (
              <option key={n.IdNam} value={n.IdNam}>
                Năm học {n.IdNam}
              </option>
            ))}
          </select>
        </div>

        <div className="cd-field">
          <label className="cd-label">Sắp xếp</label>
          <select className="form-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="ngay_tao">Ngày tạo</option>
            <option value="ngay_gui">Ngày gửi</option>
          </select>
        </div>

        <button
          className="btn-cancel"
          onClick={taiDanhSach}
          disabled={isLoading}
        >
          <i className={`fa-solid fa-rotate${isLoading ? ' fa-spin' : ''}`}></i> Làm mới
        </button>
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
        ) : rows.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-folder-open"></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>Không có phiếu nào</h3>
            <p style={{ margin: 0 }}>
              Bạn chưa có phiếu đánh giá khớp bộ lọc hiện tại. Thử chọn "Tất cả các năm".
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Năm học</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Tổng điểm</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Xếp loại</th>
                  <th style={{ width: '16%' }}>Ngày gửi</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.IdPhieu}>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{p.IdNam}</td>
                    <td style={{ textAlign: 'center' }}>
                      <TrangThaiBadge trangThai={p.TrangThai} />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {formatDiem(p.TongDiemTichLuy)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <XepLoaiBadge xepLoai={p.XepLoai} />
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {p.NgayGui ? (
                        formatNgay(p.NgayGui)
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa nộp</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="action-btn view-btn"
                          title="Xem phiếu đánh giá năm này"
                          onClick={() => moPhieu(p)}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="action-btn edit-btn"
                          title="Xem minh chứng của phiếu này"
                          onClick={() => navigate(`/kho-minh-chung?idPhieu=${p.IdPhieu}`)}
                        >
                          <i className="fa-solid fa-paperclip"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server không trả TotalCount trên nhóm API phiếu nên không dùng được
            <Paginator>: chỉ suy ra "còn trang sau" từ số dòng nhận được. */}
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

export default LichSuDanhGia;
