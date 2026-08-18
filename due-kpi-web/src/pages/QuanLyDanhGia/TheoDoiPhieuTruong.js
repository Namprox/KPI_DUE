import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole, ROLE } from '../../utils/roles';
import {
  fetchPhieuList,
  fetchPhieuTruongPending,
  formatDiem,
  formatNgay,
  moLaiPhieu,
  TRANG_THAI,
} from '../../utils/phieuApi';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import { chuCaiDau, thongTinNhanVien, useNhanVienIndex } from '../../hooks/useNhanVienIndex';
import SearchSelect from '../../components/Common/SearchSelect';
import LyDoModal from '../../components/QuanLyChamDiem/LyDoModal';
import {
  TrangThaiBadge,
  XepLoaiBadge,
  XepLoaiKhoaBadge,
} from '../../components/QuanLyChamDiem/TrangThaiBadge';

const PAGE_SIZE = 20;

/**
 * View theo dõi phiếu cấp Trường.
 *
 * Đây KHÔNG phải hàng đợi hành động: Hiệu trưởng không còn duyệt/chốt từng phiếu
 * lẻ, việc phê duyệt nằm ở /truong/to-trinh (duyệt cả gói KPI của Khoa). Trang
 * này chỉ để nhìn toàn cảnh và cho một thao tác cấp phiếu duy nhất còn lại: MỞ
 * LẠI phiếu đã hoàn tất khi phát hiện sai sót.
 *
 * Hai tab lấy từ hai nguồn khác nhau vì server chia sẵn như vậy:
 *  - "Chờ đóng gói" → /phieu/truong/pending (chỉ trạng thái 4, toàn trường)
 *  - "Đã hoàn tất"  → /phieu?trangThai=5
 * Phiếu trạng thái 3 cố ý không xuất hiện ở đây: trạng thái 3 nay là việc của
 * Trưởng khoa, chưa tới lượt cấp Trường.
 */
const TheoDoiPhieuTruong = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const { nhanVienIndex } = useNhanVienIndex();

  const [tab, setTab] = useState(TRANG_THAI.TK_DA_DUYET);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [timKiem, setTimKiem] = useState('');

  const [phieuMoLai, setPhieuMoLai] = useState(null);
  const [trangThaiMoi, setTrangThaiMoi] = useState(TRANG_THAI.THAM_DINH);
  const [dangXuLy, setDangXuLy] = useState(false);

  // Server chỉ chấp nhận đúng mã chức vụ HT cho thao tác mở lại; Admin xem được
  // nhưng gọi sẽ ăn 403, nên ẩn nút thay vì để bấm rồi báo lỗi.
  const laHieuTruong = normalizeRole(user) === ROLE.HIEU_TRUONG;

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    try {
      const items =
        tab === TRANG_THAI.TK_DA_DUYET
          ? await fetchPhieuTruongPending({ idNam: selectedNam, page, pageSize: PAGE_SIZE })
          : await fetchPhieuList({
              idNam: selectedNam,
              trangThai: TRANG_THAI.HOAN_TAT,
              page,
              pageSize: PAGE_SIZE,
            });
      setRows(items);
    } catch (error) {
      console.error('Lỗi tải danh sách phiếu cấp Trường:', error);
      showToast('error', 'Lỗi', error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNam, tab, page]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [selectedNam, tab]);

  const handleMoLai = async ({ lyDo }) => {
    const phieu = phieuMoLai;
    setPhieuMoLai(null);
    setDangXuLy(true);
    try {
      await moLaiPhieu(phieu.IdPhieu, {
        trangThaiMoi,
        lyDo,
        rowVersion: phieu.RowVersion,
      });
      await taiDanhSach();
      showToast(
        'success',
        'Đã mở lại phiếu',
        'Điểm hiện tại đã được lưu vào lịch sử. Hồ sơ quay lại bước đã chọn và phải đi lại quy trình từ đó.',
        7000,
      );
    } catch (error) {
      console.error('Lỗi mở lại phiếu:', error);
      if (error.isConflict) await taiDanhSach();
      showToast('error', 'Không mở lại được', error.message, 7000);
    } finally {
      setDangXuLy(false);
    }
  };

  const rowsHienThi = useMemo(() => {
    const withNames = rows.map((p) => ({
      ...p,
      nv: thongTinNhanVien(nhanVienIndex, p.IdNhanVien),
    }));
    const q = timKiem.trim().toLowerCase();
    if (!q) return withNames;
    return withNames.filter((p) =>
      [p.nv.hoTen, p.nv.maNhanVien, p.nv.tenDonVi, p.TenDonVi].some((f) =>
        String(f || '').toLowerCase().includes(q),
      ),
    );
  }, [rows, nhanVienIndex, timKiem]);

  const daHoanTat = tab === TRANG_THAI.HOAN_TAT;

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Theo dõi phiếu toàn trường
        </h2>
        <span className="breadcrumb">
          Toàn cảnh hồ sơ KPI cấp Trường — chỉ để theo dõi và tra cứu
        </span>
      </div>

      <div className="cd-box" style={{ background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#1e40af' }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: '8px' }}></i>
          Trang này <b>không có nút duyệt phiếu lẻ</b>. Hiệu trưởng phê duyệt theo GÓI
          KPI của từng Khoa —{' '}
          <button className="cd-link-btn" onClick={() => navigate('/truong/to-trinh')}>
            sang màn hình duyệt tờ trình
          </button>
          .
        </div>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={(v) => setSelectedNam(v)}
            options={namList.map((n) => ({ value: n.IdNam, label: `Năm học ${n.IdNam}` }))}
            disabled={dangTaiNam}
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Nhóm hồ sơ</label>
          <SearchSelect
            value={tab}
            onChange={(v) => setTab(Number(v))}
            options={[
              { value: TRANG_THAI.TK_DA_DUYET, label: 'Khoa đã chốt, chờ đóng gói' },
              { value: TRANG_THAI.HOAN_TAT, label: 'Đã hoàn tất' },
            ]}
          />
        </div>

        <div className="cd-field" style={{ flex: '2 1 240px' }}>
          <label className="cd-label">Tìm nhanh</label>
          <input
            type="text"
            className="form-input"
            placeholder="Họ tên, mã cán bộ, đơn vị..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
        </div>

        <button className="btn-cancel" onClick={taiDanhSach} disabled={isLoading}>
          <i className={`fa-solid fa-rotate${isLoading ? ' fa-spin' : ''}`}></i> Làm mới
        </button>
      </div>

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải danh sách...
          </div>
        ) : rowsHienThi.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-folder-open"></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>Chưa có hồ sơ nào</h3>
            <p style={{ margin: 0 }}>
              {daHoanTat
                ? 'Hồ sơ chuyển sang HOÀN TẤT sau khi bạn duyệt gói KPI của Khoa.'
                : 'Hồ sơ xuất hiện ở đây sau khi Trưởng khoa chốt và chọn xếp loại.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ minWidth: '1040px' }}>
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Giảng viên</th>
                  <th style={{ width: '18%' }}>Đơn vị</th>
                  <th style={{ width: '11%', textAlign: 'right' }}>Tổng tích lũy</th>
                  <th style={{ width: '15%' }}>Mức Khoa chọn</th>
                  <th style={{ width: '15%' }}>Xếp loại cuối</th>
                  <th style={{ width: '9%' }}>Trạng thái</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((p) => (
                  <tr key={p.IdPhieu}>
                    <td>
                      <div className="teacher-avatar-wrapper">
                        <div className="teacher-avatar">{chuCaiDau(p.HoTen || p.nv.hoTen)}</div>
                        <div>
                          <b style={{ color: '#0f172a', display: 'block' }}>
                            {p.HoTen || p.nv.hoTen}
                          </b>
                          {p.nv.maNhanVien && <span className="code-pill">{p.nv.maNhanVien}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: '#475569' }}>
                      {p.TenDonVi || p.nv.tenDonVi || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>
                      {formatDiem(p.TongDiemTichLuy)}
                    </td>
                    <td>
                      <XepLoaiKhoaBadge xepLoaiKhoa={p.XepLoaiKhoa} />
                    </td>
                    <td>
                      <XepLoaiBadge xepLoai={p.XepLoai} />
                    </td>
                    <td>
                      <TrangThaiBadge trangThai={p.TrangThai} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {daHoanTat && laHieuTruong ? (
                        <button
                          className="cd-btn-tra-ve"
                          style={{ padding: '8px 12px' }}
                          disabled={dangXuLy}
                          onClick={() => {
                            setPhieuMoLai(p);
                            setTrangThaiMoi(TRANG_THAI.THAM_DINH);
                          }}
                          title="Mở lại phiếu đã hoàn tất để chỉnh sửa"
                        >
                          <i className="fa-solid fa-lock-open"></i> Mở lại
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {formatNgay(p.NgayGui)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="cd-pager">
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

      {phieuMoLai && (
        <LyDoModal
          tieuDe="Mở lại phiếu đã hoàn tất"
          moTa={`Hồ sơ của ${phieuMoLai.HoTen || phieuMoLai.nv?.hoTen} sẽ quay về bước bạn chọn để đánh giá lại.`}
          canhBao="Điểm hiện tại được lưu vào lịch sử rồi bị xóa theo mức trạng thái đích; xếp loại và điểm chính thức cũng bị xóa. Số lần đánh giá và số lần mở lại đều tăng. Không hoàn tác được."
          nhanLyDo="Lý do mở lại"
          goiYLyDo="VD: Phát hiện sai sót điểm thẩm định tiêu chí C3, cần đánh giá lại."
          nhanXacNhan="Mở lại phiếu"
          iconXacNhan="fa-lock-open"
          dangGui={dangXuLy}
          onDong={() => setPhieuMoLai(null)}
          onXacNhan={handleMoLai}
        >
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label>
              Mở lại về bước <span className="text-red">*</span>
            </label>
            <SearchSelect
              value={trangThaiMoi}
              onChange={(v) => setTrangThaiMoi(Number(v))}
              options={[
                { value: TRANG_THAI.NHAP, label: '1 — Giảng viên kê khai lại từ đầu' },
                { value: TRANG_THAI.THAM_DINH, label: '2 — Đơn vị thẩm định lại' },
                { value: TRANG_THAI.CHO_TK_DUYET, label: '3 — Trưởng khoa chốt lại' },
              ]}
            />
            <div className="cd-hint">
              <i className="fa-solid fa-circle-info"></i> Về bước 1 xóa cả điểm giảng
              viên; bước 2 xóa điểm đơn vị và điểm chính thức; bước 3 chỉ xóa kết luận
              cấp Trường. Tiêu chí chấm tự động luôn giữ nguyên.
            </div>
          </div>
        </LyDoModal>
      )}
    </div>
  );
};

export default TheoDoiPhieuTruong;
