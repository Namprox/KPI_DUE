import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { formatDiem, formatNgayGio } from '../../utils/phieuApi';
import {
  diemHieuLucCuaDong,
  fetchPhieuDonViDetail,
  laDongChamTay,
  nhapDiemChiTietDonVi,
  suaDuocPhieu,
  tinhTongDiemDonViTamTinh,
  tongHopKpiDonVi,
  trinhPhieuDonVi,
} from '../../utils/phieuDonViApi';
import LyDoModal from '../../components/QuanLyChamDiem/LyDoModal';
import {
  TrangThaiDonViBadge,
  XepLoaiBadge,
} from '../../components/QuanLyChamDiem/TrangThaiBadge';

/** Giá trị ô nhập: bản nháp người dùng đang gõ, chưa có thì lấy số của server. */
const giaTriO = (nhap, goc) =>
  nhap !== undefined ? nhap : goc === null || goc === undefined ? '' : String(goc);

/**
 * Nhập điểm cho MỘT phiếu KPI đơn vị — phần việc của thư ký Khoa/Phòng.
 *
 * Ba điều quyết định cách trang này hoạt động:
 *
 * 1. Hai loại dòng không trộn lẫn. `loai_nguon_diem = 1` là dòng thư ký gõ tay;
 *    `= 2` là dòng hệ thống tổng hợp từ KPI của từng thành viên, gõ tay bị server
 *    từ chối. Dòng loại 2 chỉ đổi qua nút "Tổng hợp KPI thành viên", và nút đó
 *    ghi đè toàn bộ dòng loại 2 bằng số liệu mới nhất — chạy lại được nhiều lần.
 *
 * 2. RowVersion là của PHIẾU CHA kể cả khi lưu một dòng. Mỗi lần lưu, server trả
 *    row_version MỚI của phiếu và lần lưu kế tiếp phải dùng đúng giá trị đó, nếu
 *    không sẽ ăn 409. Thiếu giá trị mới thì trang tải lại phiếu chứ không đoán.
 *
 * 3. Lưu theo TỪNG DÒNG, không có nút "lưu tất cả": API chỉ có endpoint cấp dòng
 *    (PUT chi-tiet-don-vi/{id}/diem-nhap), gom nhiều dòng vào một nút chỉ tạo ảo
 *    giác nguyên tử — một dòng hỏng giữa chừng là trạng thái nửa vời không nói
 *    được cho người dùng.
 *
 * Trình phiếu (1 → 2) là ranh giới quyền: sau đó thư ký chỉ còn xem, mọi thao tác
 * thuộc về Trưởng đơn vị rồi Hiệu trưởng. Trang vẫn mở được ở các trạng thái sau
 * nhưng ở chế độ chỉ đọc.
 */
const ChiTietPhieuDonVi = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);

  const [phieu, setPhieu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState('');

  // Bản nháp CHỈ chứa dòng người dùng đã gõ. Ô nào không có ở đây thì lấy thẳng
  // số của server — nhờ vậy tải lại phiếu không xóa mất thứ đang gõ dở.
  const [nhapDiem, setNhapDiem] = useState({});
  const [nhapNhanXet, setNhapNhanXet] = useState({});
  const [idDangLuu, setIdDangLuu] = useState(null);

  const [gomDonViCon, setGomDonViCon] = useState(true);
  const [dangTongHop, setDangTongHop] = useState(false);
  const [tongHop, setTongHop] = useState(null);

  const [moTrinh, setMoTrinh] = useState(false);
  const [dangTrinh, setDangTrinh] = useState(false);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const taiPhieu = useCallback(
    async ({ imLang = false } = {}) => {
      if (!imLang) setIsLoading(true);
      try {
        const item = await fetchPhieuDonViDetail(id);
        if (!item) {
          setLoiTai('Không tìm thấy phiếu này, hoặc phiếu nằm ngoài phạm vi bạn được xem.');
          setPhieu(null);
          return null;
        }
        setPhieu(item);
        setLoiTai('');
        return item;
      } catch (error) {
        console.error('Lỗi tải phiếu KPI đơn vị:', error);
        setLoiTai(error.message);
        setPhieu(null);
        return null;
      } finally {
        if (!imLang) setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    taiPhieu();
  }, [taiPhieu]);

  const chiTietList = useMemo(() => phieu?.ChiTiet || [], [phieu]);
  const tamTinh = useMemo(
    () => tinhTongDiemDonViTamTinh(chiTietList),
    [chiTietList],
  );
  const choPhepNhap = suaDuocPhieu(phieu);

  // Số thứ tự bám theo vị trí trong PHIẾU, không đánh lại theo từng nhóm.
  const sttTheoDong = useMemo(
    () => new Map(chiTietList.map((ct, index) => [ct.IdChiTietDv, index + 1])),
    [chiTietList],
  );

  /** Gom theo nhóm tiêu chí, giữ nguyên thứ tự nhóm xuất hiện trong phiếu. */
  const nhomList = useMemo(() => {
    const map = new Map();
    chiTietList.forEach((ct) => {
      const ten = ct.TenNhom || 'Tiêu chí khác';
      if (!map.has(ten)) map.set(ten, { ten, dong: [] });
      map.get(ten).dong.push(ct);
    });
    return [...map.values()];
  }, [chiTietList]);

  const dongChamTayThieuDiem = useMemo(
    () =>
      chiTietList.filter(
        (ct) => laDongChamTay(ct) && diemHieuLucCuaDong(ct) === null,
      ),
    [chiTietList],
  );

  const oDaSua = (ct) => {
    const idCt = ct.IdChiTietDv;
    const diemMoi = nhapDiem[idCt];
    const nhanXetMoi = nhapNhanXet[idCt];
    const diemCu = ct.DiemNhap === null || ct.DiemNhap === undefined ? '' : String(ct.DiemNhap);
    const nhanXetCu = ct.NhanXetNhap || '';
    return (
      (diemMoi !== undefined && diemMoi !== diemCu) ||
      (nhanXetMoi !== undefined && nhanXetMoi !== nhanXetCu)
    );
  };

  const handleLuuDong = async (ct) => {
    const idCt = ct.IdChiTietDv;
    setIdDangLuu(idCt);
    try {
      const { item, newRowVersion } = await nhapDiemChiTietDonVi(idCt, {
        diem: giaTriO(nhapDiem[idCt], ct.DiemNhap),
        nhanXet: giaTriO(nhapNhanXet[idCt], ct.NhanXetNhap),
        rowVersion: phieu?.RowVersion,
      });

      // Bỏ bản nháp của đúng dòng vừa lưu; các dòng khác giữ nguyên thứ đang gõ.
      setNhapDiem((cur) => {
        const { [idCt]: _bo, ...conLai } = cur;
        return conLai;
      });
      setNhapNhanXet((cur) => {
        const { [idCt]: _bo, ...conLai } = cur;
        return conLai;
      });

      // Không có row_version mới thì mọi lần lưu sau sẽ 409 — tải lại cả phiếu
      // để lấy lại giá trị đúng thay vì gửi đi một giá trị đã cũ.
      if (!newRowVersion) {
        await taiPhieu({ imLang: true });
      } else {
        setPhieu((cur) =>
          cur
            ? {
                ...cur,
                RowVersion: newRowVersion,
                ChiTiet: (cur.ChiTiet || []).map((dong) =>
                  dong.IdChiTietDv === idCt && item ? { ...dong, ...item } : dong,
                ),
              }
            : cur,
        );
      }
      showToast('success', 'Đã lưu', `Đã lưu điểm tiêu chí "${ct.TenTieuChi}".`);
    } catch (error) {
      console.error('Lỗi lưu điểm tiêu chí đơn vị:', error);
      showToast('error', 'Lưu thất bại', error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setIdDangLuu(null);
    }
  };

  const handleTongHop = async () => {
    setDangTongHop(true);
    try {
      const { item, tongHop: ketQua } = await tongHopKpiDonVi(id, {
        baoGomDonViCon: gomDonViCon,
      });
      setTongHop(ketQua);
      if (item) setPhieu(item);
      else await taiPhieu({ imLang: true });
      showToast(
        'success',
        'Đã tổng hợp',
        'Điểm của các tiêu chí tự động đã được cập nhật theo KPI thành viên.',
      );
    } catch (error) {
      console.error('Lỗi tổng hợp KPI thành viên:', error);
      showToast('error', 'Tổng hợp thất bại', error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setDangTongHop(false);
    }
  };

  const handleTrinh = async ({ lyDo }) => {
    setDangTrinh(true);
    try {
      const item = await trinhPhieuDonVi(id, {
        nhanXet: lyDo,
        rowVersion: phieu?.RowVersion,
      });
      setMoTrinh(false);
      if (item) setPhieu(item);
      else await taiPhieu({ imLang: true });
      showToast(
        'success',
        'Đã trình',
        'Phiếu đã chuyển sang chờ Trưởng đơn vị duyệt.',
        5000,
      );
    } catch (error) {
      console.error('Lỗi trình phiếu KPI đơn vị:', error);
      showToast('error', 'Trình phiếu thất bại', error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setDangTrinh(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải phiếu KPI đơn vị...
          </div>
        </div>
      </div>
    );
  }

  if (loiTai || !phieu) {
    return (
      <div className="page-container">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#f59e0b' }}></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>Không mở được phiếu</h3>
            <p style={{ margin: '0 0 20px 0' }}>{loiTai || 'Phiếu không tồn tại.'}</p>
            <button
              className="btn-cancel"
              style={{ margin: '0 auto' }}
              onClick={() => navigate('/danh-gia-kpi-don-vi')}
            >
              <i className="fa-solid fa-arrow-left"></i> Về danh sách phiếu đơn vị
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <button
          className="cd-link-btn"
          style={{ marginBottom: '8px' }}
          onClick={() => navigate('/danh-gia-kpi-don-vi')}
        >
          <i className="fa-solid fa-arrow-left"></i> Danh sách phiếu KPI đơn vị
        </button>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          {phieu.TenDonVi || `Đơn vị #${phieu.IdDonVi}`} — năm học {phieu.IdNam}
        </h2>
        <span className="breadcrumb">
          {phieu.TenMau ? `${phieu.TenMau} · ` : ''}Lần đánh giá {phieu.LanDanhGia}
          {phieu.LanMoLai > 0 ? ` · Đã mở lại ${phieu.LanMoLai} lần` : ''}
        </span>
      </div>

      <div className="cd-phieu-header">
        <div className="cd-phieu-top">
          <TrangThaiDonViBadge trangThai={phieu.TrangThai} />
          {!choPhepNhap && (
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              <i className="fa-solid fa-lock" style={{ marginRight: '6px' }}></i>
              Phiếu đã trình nên chỉ còn xem — mọi thay đổi thuộc về cấp duyệt.
            </span>
          )}
        </div>

        <div className="cd-meta-grid">
          <div>
            <div className="cd-meta-label">Điểm cơ bản</div>
            <div className="cd-meta-value">
              {formatDiem(phieu.TongDiemCoBan ?? tamTinh?.coBan)}
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Điểm vượt trội</div>
            <div className="cd-meta-value">
              {formatDiem(phieu.TongDiemVuotTroi ?? tamTinh?.vuotTroi)}
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Tổng tích lũy</div>
            <div className="cd-meta-value" style={{ fontWeight: 700 }}>
              {formatDiem(phieu.TongDiemTichLuy ?? tamTinh?.tichLuy)}
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Xếp loại</div>
            <div className="cd-meta-value">
              <XepLoaiBadge xepLoai={phieu.XepLoai} />
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Ngày gửi</div>
            <div className="cd-meta-value">{formatNgayGio(phieu.NgayGui)}</div>
          </div>
          <div>
            <div className="cd-meta-label">Cập nhật gần nhất</div>
            <div className="cd-meta-value">{formatNgayGio(phieu.NgayCapNhat)}</div>
          </div>
        </div>

        {phieu.TongDiemTichLuy == null && tamTinh && (
          <div className="cd-hint">
            <i className="fa-solid fa-circle-info"></i> Hệ thống chỉ lưu tổng điểm
            vào phiếu ở bước chốt. Các con số trên là tạm tính từ điểm hiện có của
            từng tiêu chí
            {tamTinh.soDongChuaCoDiem > 0
              ? `, còn ${tamTinh.soDongChuaCoDiem} tiêu chí chưa có điểm.`
              : '.'}
          </div>
        )}

        {phieu.NhanXetDv && (
          <div className="cd-box" style={{ marginTop: '16px' }}>
            <div className="cd-box-title">Nhận xét của Trưởng đơn vị</div>
            <div style={{ fontSize: '14px', color: '#334155' }}>{phieu.NhanXetDv}</div>
          </div>
        )}
        {phieu.NhanXetTruong && (
          <div className="cd-box" style={{ marginTop: '10px' }}>
            <div className="cd-box-title">Nhận xét của Hiệu trưởng</div>
            <div style={{ fontSize: '14px', color: '#334155' }}>{phieu.NhanXetTruong}</div>
          </div>
        )}
        {phieu.LyDoMoLai && (
          <div className="cd-box" style={{ marginTop: '10px' }}>
            <div className="cd-box-title">Lý do mở lại phiếu</div>
            <div style={{ fontSize: '14px', color: '#334155' }}>{phieu.LyDoMoLai}</div>
          </div>
        )}
      </div>

      {choPhepNhap && (
        <div className="cd-box" style={{ marginBottom: '18px' }}>
          <div className="cd-box-title">Thao tác</div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <button className="btn-cancel" onClick={handleTongHop} disabled={dangTongHop}>
              {dangTongHop ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang tổng hợp...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-calculator"></i> Tổng hợp KPI thành viên
                </>
              )}
            </button>
            <label
              className="cd-checkbox"
              style={{ fontSize: '13px', color: '#475569' }}
            >
              <input
                type="checkbox"
                checked={gomDonViCon}
                disabled={dangTongHop}
                onChange={(e) => setGomDonViCon(e.target.checked)}
              />{' '}
              Gồm cả phiếu của đơn vị con
            </label>
            <button
              className="btn-submit"
              style={{ marginLeft: 'auto' }}
              onClick={() => setMoTrinh(true)}
            >
              <i className="fa-solid fa-paper-plane"></i> Trình Trưởng đơn vị
            </button>
          </div>

          <div className="cd-hint">
            <i className="fa-solid fa-circle-info"></i> Tổng hợp ghi đè điểm của
            mọi tiêu chí tự động bằng số liệu KPI mới nhất của thành viên — nên chạy
            lại ngay trước khi trình.
          </div>

          {tongHop && (
            <div className="cd-hint cd-hint-ok" style={{ marginTop: '10px' }}>
              <i className="fa-solid fa-circle-check"></i> Đã tổng hợp{' '}
              <b>{tongHop.SoPhieuThanhVien ?? 0}</b> phiếu thành viên ·{' '}
              <b>{tongHop.SoXuatSac ?? 0}</b> xuất sắc ·{' '}
              <b>{tongHop.SoHoanThanh ?? 0}</b> hoàn thành · điểm trung bình{' '}
              <b>{formatDiem(tongHop.DiemTrungBinh)}</b>.
            </div>
          )}
        </div>
      )}

      <p className="sub-title" style={{ marginBottom: '12px' }}>
        CHI TIẾT TIÊU CHÍ ({chiTietList.length})
      </p>

      <div className="modern-table-card">
        {chiTietList.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-list"></i>
            Phiếu chưa có tiêu chí nào. Kiểm tra lại mẫu đánh giá của đơn vị.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ minWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>STT</th>
                  <th style={{ width: '33%' }}>Tiêu chí</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Điểm tối đa</th>
                  <th style={{ width: '16%' }}>Điểm</th>
                  <th style={{ width: '28%' }}>Nhận xét</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Lưu</th>
                </tr>
              </thead>
              <tbody>
                {nhomList.map((nhom) => (
                  <React.Fragment key={nhom.ten}>
                    <tr className="table-group-row">
                      <td colSpan={6}>
                        <span className="table-group-bar"></span>
                        {nhom.ten}
                        <span className="table-group-count">
                          {nhom.dong.length} tiêu chí
                        </span>
                      </td>
                    </tr>
                    {nhom.dong.map((ct) => {
                      const idCt = ct.IdChiTietDv;
                      const chamTay = laDongChamTay(ct);
                      const moO = choPhepNhap && chamTay;
                      const daSua = oDaSua(ct);
                      const dangLuu = idDangLuu === idCt;
                      return (
                        <tr key={idCt}>
                          <td>{sttTheoDong.get(idCt)}</td>
                          <td>
                            <b style={{ color: '#0f172a' }}>{ct.TenTieuChi}</b>
                            {!chamTay && (
                              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                                <i className="fa-solid fa-robot" style={{ marginRight: '6px' }}></i>
                                Tự động tổng hợp từ KPI thành viên
                              </div>
                            )}
                          </td>
                          <td className="table-num">
                            {ct.DiemToiDa === null || ct.DiemToiDa === undefined ? (
                              <span className="table-empty-mark">—</span>
                            ) : (
                              formatDiem(ct.DiemToiDa)
                            )}
                          </td>
                          <td>
                            {moO ? (
                              <input
                                type="number"
                                step="0.01"
                                className="cd-diem-input"
                                style={{ width: '100%', fontSize: '14px', padding: '8px 10px' }}
                                value={giaTriO(nhapDiem[idCt], ct.DiemNhap)}
                                disabled={dangLuu}
                                onChange={(e) =>
                                  setNhapDiem((cur) => ({ ...cur, [idCt]: e.target.value }))
                                }
                              />
                            ) : (
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {diemHieuLucCuaDong(ct) === null ? (
                                  <span className="table-empty-mark">—</span>
                                ) : (
                                  formatDiem(diemHieuLucCuaDong(ct))
                                )}
                              </span>
                            )}
                          </td>
                          <td>
                            {moO ? (
                              <input
                                type="text"
                                className="form-input"
                                placeholder="Ghi chú cho tiêu chí này..."
                                value={giaTriO(nhapNhanXet[idCt], ct.NhanXetNhap)}
                                disabled={dangLuu}
                                onChange={(e) =>
                                  setNhapNhanXet((cur) => ({ ...cur, [idCt]: e.target.value }))
                                }
                              />
                            ) : (
                              <span style={{ fontSize: '13px', color: '#475569' }}>
                                {ct.NhanXetNhap || <span className="table-empty-mark">—</span>}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {moO ? (
                              <button
                                className="action-btn edit-btn"
                                title={
                                  daSua
                                    ? 'Lưu điểm tiêu chí này'
                                    : 'Chưa có thay đổi nào để lưu'
                                }
                                disabled={!daSua || dangLuu}
                                onClick={() => handleLuuDong(ct)}
                              >
                                <i
                                  className={`fa-solid ${
                                    dangLuu ? 'fa-spinner fa-spin' : 'fa-floppy-disk'
                                  }`}
                                ></i>
                              </button>
                            ) : (
                              <span className="table-empty-mark">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {moTrinh && (
        <LyDoModal
          tieuDe="Trình phiếu lên Trưởng đơn vị"
          moTa="Phiếu chuyển sang trạng thái chờ Trưởng đơn vị duyệt. Sau bước này bạn không sửa được điểm nữa."
          nhanLyDo="Nhận xét kèm theo"
          batBuocLyDo={false}
          nhanXacNhan="Trình phiếu"
          iconXacNhan="fa-paper-plane"
          dangGui={dangTrinh}
          onDong={() => setMoTrinh(false)}
          onXacNhan={handleTrinh}
        >
          {dongChamTayThieuDiem.length > 0 && (
            <div className="cd-hint cd-hint-warn" style={{ marginBottom: '12px' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> Còn{' '}
              <b>{dongChamTayThieuDiem.length}</b> tiêu chí chấm tay chưa có điểm.
              Trình bây giờ thì Trưởng đơn vị sẽ nhận phiếu thiếu điểm.
            </div>
          )}
        </LyDoModal>
      )}
    </div>
  );
};

export default ChiTietPhieuDonVi;
