import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import {
  fetchPhieuChoCham,
  fetchPhieuDetail,
  formatNgay,
  laTieuChiChamTay,
  TRANG_THAI_DONG,
} from '../../utils/phieuApi';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import { thongTinNhanVien, useNhanVienIndex } from '../../hooks/useNhanVienIndex';
import TienDoCham from '../../components/QuanLyChamDiem/TienDoCham';
import SearchSelect from '../../components/Common/SearchSelect';

const PAGE_SIZE = 20;
const SO_PHIEU_TAI_SONG_SONG = 5;

/**
 * Hàng đợi gom theo HỒ SƠ — lối vào duy nhất của chuyên viên thẩm định.
 *
 * Từ đây bấm "Thẩm định" để mở /quan-ly/phieu/:id và chấm từng tiêu chí. Hàng
 * đợi theo từng dòng tiêu chí (HangDoiThamDinh) đã bị ẩn khỏi menu vì nó không
 * xem được minh chứng nên vẫn phải mở hồ sơ mới chấm được — hai lối vào cho
 * cùng một việc chỉ làm rối. Đừng thêm link sang đó nữa.
 *
 * Server đã lọc sẵn theo JWT + bảng tieu_chi_don_vi_cham: chỉ trả phiếu
 * (trang_thai = 2) mà đơn vị đang đăng nhập có ít nhất một tiêu chí được giao.
 * FE không lọc lại phạm vi, chỉ hiển thị và điều hướng.
 *
 * SoTieuChiDaCham đếm theo trang_thai_dong = 3 (đã chốt), KHÔNG theo
 * diem_khoa IS NOT NULL: một dòng bị trả về vẫn còn điểm của vòng trước nên
 * đếm theo cột đó sẽ báo nhầm "đã xong" trong khi việc vẫn còn.
 *
 * Cột Tiến độ hiện hai thanh: phần việc của đơn vị đang đăng nhập (lấy thẳng từ
 * hàng đợi) và tiến độ toàn phiếu của giảng viên (gộp mọi đơn vị) — hồ sơ chỉ tự
 * lên Trưởng khoa khi thanh toàn phiếu đầy, nên chấm xong phần mình mà thanh kia
 * chưa đầy nghĩa là còn phải chờ đơn vị khác.
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
  const [tienDoToanPhieu, setTienDoToanPhieu] = useState({});
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

  /**
   * Tiến độ TOÀN PHIẾU không có trong /phieu/khoa/pending (endpoint chỉ đếm phần
   * việc của đơn vị đang đăng nhập), nên phải mở chi tiết từng phiếu để đếm.
   * Tải sau khi bảng đã hiện, theo lô 5 phiếu để không bắn 20 request cùng lúc và
   * để thanh tiến trình hiện dần thay vì chờ cả trang.
   *
   * Giá trị `undefined` = đang tải, `null` = tải hỏng — một phiếu lỗi chỉ mất
   * thanh của chính nó, không làm hỏng cả bảng.
   */
  useEffect(() => {
    setTienDoToanPhieu({});
    if (rows.length === 0) return undefined;

    let daHuy = false;
    (async () => {
      const ids = rows.map((p) => p.IdPhieu);
      for (let i = 0; i < ids.length; i += SO_PHIEU_TAI_SONG_SONG) {
        if (daHuy) return;
        const lo = ids.slice(i, i + SO_PHIEU_TAI_SONG_SONG);
        // eslint-disable-next-line no-await-in-loop
        const ketQua = await Promise.all(
          lo.map(async (id) => {
            try {
              const phieu = await fetchPhieuDetail(id);
              const chamTay = (phieu?.ChiTiet || []).filter(laTieuChiChamTay);
              return [
                id,
                {
                  tong: chamTay.length,
                  xong: chamTay.filter(
                    (ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG.DA_CHOT,
                  ).length,
                },
              ];
            } catch (error) {
              console.error('Lỗi tải tiến độ toàn phiếu:', error);
              return [id, null];
            }
          }),
        );
        if (daHuy) return;
        setTienDoToanPhieu((truoc) => {
          const sau = { ...truoc };
          ketQua.forEach(([id, giaTri]) => {
            sau[id] = giaTri;
          });
          return sau;
        });
      }
    })();

    return () => {
      daHuy = true;
    };
  }, [rows]);

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
          Hồ sơ chờ đơn vị thẩm định
        </h2>
        <span className="breadcrumb">
          Hồ sơ đã nộp mà đơn vị của bạn được giao thẩm định ít nhất một tiêu chí —
          xem tiến độ theo từng hồ sơ
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
            <div className="stat-label">trên trang hiện tại</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-green">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="stat-label">Tiêu chí đã chốt điểm</div>
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
          <div className="table-scroll">
            <table className="custom-table" style={{ minWidth: '1080px' }}>
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Giảng viên</th>
                  <th style={{ width: '15%' }}>Đơn vị</th>
                  <th style={{ width: '11%', textAlign: 'right' }}>Ngày gửi</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Vòng</th>
                  <th style={{ width: '30%' }}>Tiến độ</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((p) => {
                  const xong = p.SoTieuChiDaCham || 0;
                  const tong = p.SoTieuChiDuocGiao || 0;
                  const toanPhieu = tienDoToanPhieu[p.IdPhieu];
                  return (
                    <tr key={p.IdPhieu}>
                      <td>
                        <div className="table-person-name">{p.nv.hoTen}</div>
                        {p.nv.maNhanVien && (
                          <div className="table-person-code">{p.nv.maNhanVien}</div>
                        )}
                      </td>
                      <td>{p.nv.tenDonVi || <span className="table-empty-mark">—</span>}</td>
                      <td className="table-num">{formatNgay(p.NgayGui)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="tag-badge tag-blue">Lần {p.LanDanhGia}</span>
                      </td>
                      <td>
                        <div className="cd-progress-stack">
                          <TienDoCham xong={xong} tong={tong} nhan="Phần bạn thẩm định" />
                          {toanPhieu === undefined ? (
                            <div className="cd-progress-ghichu">
                              <i className="fa-solid fa-spinner fa-spin"></i> Đang tính tiến độ toàn phiếu...
                            </div>
                          ) : toanPhieu === null ? (
                            <div className="cd-progress-ghichu">Không tải được tiến độ toàn phiếu</div>
                          ) : (
                            <TienDoCham
                              xong={toanPhieu.xong}
                              tong={toanPhieu.tong}
                              nhan="Toàn phiếu giảng viên"
                              phu
                            />
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="table-btn-primary"
                          title="Mở hồ sơ để thẩm định từng tiêu chí"
                          onClick={() => navigate(`/quan-ly/phieu/${p.IdPhieu}`)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i> Thẩm định
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-pager">
          <span>
            Trang <strong style={{ color: '#172033' }}>{page}</strong>
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="table-pager-btn"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="fa-solid fa-chevron-left"></i> Trước
            </button>
            <button
              className="table-pager-btn"
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
