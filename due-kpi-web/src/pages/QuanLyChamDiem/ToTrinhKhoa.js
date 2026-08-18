import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import '../../css/Pages.css';
import '../../css/QuanLyChamDiem.css';
import { datUuTienXuatSac, fetchPhieuDetail, formatDiem, formatNgayGio } from '../../utils/phieuApi';
import {
  dongGoiToTrinh,
  fetchToTrinhDetail,
  fetchToTrinhList,
  TEN_HANH_DONG_TO_TRINH,
  tinhHanNgach,
  TRANG_THAI_TO_TRINH,
  trinhToTrinh,
  TY_LE_XUAT_SAC_MAC_DINH,
} from '../../utils/toTrinhApi';
import { useNamDanhGia } from '../../hooks/useNamDanhGia';
import SearchSelect from '../../components/Common/SearchSelect';
import BangHoSoToTrinh from '../../components/QuanLyChamDiem/BangHoSoToTrinh';
import LyDoModal from '../../components/QuanLyChamDiem/LyDoModal';
import { TrangThaiToTrinhBadge } from '../../components/QuanLyChamDiem/TrangThaiBadge';

/**
 * Giai đoạn 4 phía Trưởng khoa — đóng gói tờ trình KPI Khoa rồi trình Hiệu trưởng.
 *
 * Gói do server tự tạo khi hồ sơ đầu tiên của (năm, đơn vị) được chốt, nên trang
 * này chỉ đọc gói của đơn vị mình chứ không có nút "tạo tờ trình".
 *
 * Hai nhánh lỗi khi đóng gói là phần quan trọng nhất của màn hình, không phải
 * đường chạy thành công:
 *
 *  - CHUA_DU_HO_SO: còn người chưa được chốt. Hiện danh sách kèm lối đi thẳng
 *    sang màn hình chốt hồ sơ.
 *  - DONG_HANG: nhiều người đồng điểm tranh những suất cuối. Server CỐ Ý không
 *    tự tie-break vì đây là quyết định nhân sự — mở panel để Trưởng khoa chỉ
 *    định, và chỉ mở lại nút đóng gói khi số người được chọn khớp ĐÚNG số suất
 *    còn lại (thừa hay thiếu đều bị server chặn tiếp).
 */
const ToTrinhKhoa = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [danhSach, setDanhSach] = useState([]);
  const [idToTrinh, setIdToTrinh] = useState(null);
  const [goi, setGoi] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [moTrinh, setMoTrinh] = useState(false);

  const [hoSoThieu, setHoSoThieu] = useState(null);
  const [dongHang, setDongHang] = useState(null);
  const [uuTienChon, setUuTienChon] = useState([]);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    try {
      const items = await fetchToTrinhList({ idNam: selectedNam });
      setDanhSach(items);
      // Trưởng khoa thường chỉ phụ trách một đơn vị — chọn sẵn gói đầu tiên để
      // vào trang là thấy việc ngay, không phải bấm thêm một lần.
      setIdToTrinh((truoc) =>
        truoc && items.some((t) => t.IdToTrinh === truoc) ? truoc : items[0]?.IdToTrinh ?? null,
      );
    } catch (error) {
      console.error('Lỗi tải danh sách tờ trình:', error);
      showToast('error', 'Lỗi', error.message);
      setDanhSach([]);
      setIdToTrinh(null);
    }
  }, [selectedNam]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  const taiChiTiet = useCallback(
    async ({ imLang = false } = {}) => {
      if (!idToTrinh) {
        setGoi(null);
        setIsLoading(false);
        return;
      }
      if (!imLang) setIsLoading(true);
      try {
        const item = await fetchToTrinhDetail(idToTrinh);
        setGoi(item);
      } catch (error) {
        console.error('Lỗi tải chi tiết tờ trình:', error);
        showToast('error', 'Lỗi', error.message);
        setGoi(null);
      } finally {
        setIsLoading(false);
      }
    },
    [idToTrinh],
  );

  useEffect(() => {
    taiChiTiet();
  }, [taiChiTiet]);

  const trangThai = goi?.TrangThai;
  const coTheDongGoi =
    trangThai === TRANG_THAI_TO_TRINH.DANG_TONG_HOP ||
    trangThai === TRANG_THAI_TO_TRINH.DA_DONG_GOI ||
    trangThai === TRANG_THAI_TO_TRINH.HT_TRA_VE;
  const coTheTrinh = trangThai === TRANG_THAI_TO_TRINH.DA_DONG_GOI;

  const nhanSuDaDoi =
    goi?.SoGiangVienHienTai != null &&
    goi?.SoGiangVien != null &&
    Number(goi.SoGiangVienHienTai) !== Number(goi.SoGiangVien);

  const hanNgachDuKien = useMemo(
    () => tinhHanNgach(goi?.SoGiangVienHienTai ?? goi?.SoGiangVien, TY_LE_XUAT_SAC_MAC_DINH),
    [goi],
  );

  const xoaKetQuaLoi = () => {
    setHoSoThieu(null);
    setDongHang(null);
    setUuTienChon([]);
  };

  /**
   * @param {object} [goiDung] gói dùng cho lần gọi này. Sau khi ghi ưu tiên xong,
   *   `goi` trong state chưa kịp cập nhật nên nhánh "xác nhận & đóng gói lại"
   *   phải truyền thẳng bản vừa đọc lại vào, nếu không lần đóng gói thứ hai dính 409.
   */
  const handleDongGoi = async (goiDung) => {
    const g = goiDung || goi;
    setDangXuLy(true);
    xoaKetQuaLoi();
    try {
      const { item } = await dongGoiToTrinh(g.IdToTrinh, {
        tyLeXuatSac: TY_LE_XUAT_SAC_MAC_DINH,
        rowVersion: g.RowVersion,
      });
      await Promise.all([taiChiTiet({ imLang: true }), taiDanhSach()]);
      showToast(
        'success',
        'Đã đóng gói tờ trình',
        `${item?.SoDatXuatSac ?? 0}/${item?.HanNgachXuatSac ?? 0} suất xuất sắc đã được lấp đầy trên tổng ${item?.SoGiangVien ?? 0} giảng viên. Bạn có thể đóng gói lại nhiều lần trước khi trình.`,
        8000,
      );
    } catch (error) {
      console.error('Lỗi đóng gói tờ trình:', error);
      if (error.errorCode === 'CHUA_DU_HO_SO') {
        setHoSoThieu(error.hoSo || []);
      } else if (error.errorCode === 'DONG_HANG') {
        setDongHang({ thongTin: error.dongHang, hoSo: error.hoSo || [] });
        // Người server đã ghi nhận ưu tiên từ trước vẫn nên được tick sẵn.
        setUuTienChon((error.hoSo || []).filter((h) => h.UuTienXuatSac).map((h) => h.IdPhieu));
      } else if (error.isConflict) {
        await taiChiTiet({ imLang: true });
      }
      showToast('error', 'Không đóng gói được', error.message, 8000);
    } finally {
      setDangXuLy(false);
    }
  };

  const handleTrinh = async ({ nhanXet }) => {
    setMoTrinh(false);
    setDangXuLy(true);
    try {
      await trinhToTrinh(goi.IdToTrinh, { nhanXet, rowVersion: goi.RowVersion });
      await Promise.all([taiChiTiet({ imLang: true }), taiDanhSach()]);
      showToast(
        'success',
        'Đã trình Hiệu trưởng',
        'Gói KPI đã chuyển sang chờ Hiệu trưởng duyệt. Trong lúc chờ, gói bị khóa — muốn sửa hồ sơ phải để Hiệu trưởng trả về trước.',
        8000,
      );
    } catch (error) {
      console.error('Lỗi trình tờ trình:', error);
      if (error.isConflict) await taiChiTiet({ imLang: true });
      showToast('error', 'Không trình được', error.message, 7000);
    } finally {
      setDangXuLy(false);
    }
  };

  const doiChonUuTien = (idPhieu) =>
    setUuTienChon((truoc) =>
      truoc.includes(idPhieu) ? truoc.filter((x) => x !== idPhieu) : [...truoc, idPhieu],
    );

  /**
   * Ghi cờ ưu tiên cho đúng những người được chọn và gỡ cờ của những người bị bỏ
   * chọn. Phải xử lý cả hai chiều: nếu chỉ ghi thêm mà không gỡ, tổng số người
   * được ưu tiên sẽ vượt số suất và server vẫn báo DONG_HANG.
   */
  const luuUuTien = async () => {
    for (const h of dongHang?.hoSo || []) {
      const muonUuTien = uuTienChon.includes(h.IdPhieu);
      if (!!h.UuTienXuatSac === muonUuTien) continue;
      // ToTrinhKhoaPhieuDto không luôn mang RowVersion của phiếu — đọc lại cho chắc.
      const rowVersion = h.RowVersion || (await fetchPhieuDetail(h.IdPhieu))?.RowVersion;
      await datUuTienXuatSac(h.IdPhieu, { uuTien: muonUuTien, rowVersion });
    }
  };

  /**
   * Ghi ưu tiên rồi đóng gói lại ngay trong một thao tác.
   *
   * Tách hai bước ra hai nút là bẫy: ghi ưu tiên xong mà quên bấm đóng gói lại thì
   * gói vẫn đứng nguyên ở trạng thái cũ, và lần vào sau không còn gì nhắc là đang
   * dở việc. Một nút đi hết đường.
   */
  const handleXacNhanDongHang = async () => {
    setDangXuLy(true);
    let goiMoi = null;
    try {
      await luuUuTien();
      goiMoi = await fetchToTrinhDetail(goi.IdToTrinh);
      if (goiMoi) setGoi(goiMoi);
    } catch (error) {
      console.error('Lỗi cập nhật ưu tiên xuất sắc:', error);
      showToast('error', 'Không cập nhật được', error.message, 7000);
      setDangXuLy(false);
      return;
    }
    setDangXuLy(false);
    setDongHang(null);
    await handleDongGoi(goiMoi || goi);
  };

  const soSuatConLai = dongHang?.thongTin?.SoSuatConLai ?? 0;
  const khopSoSuat = uuTienChon.length === soSuatConLai;

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: 700 }}>
          Tờ trình KPI Khoa
        </h2>
        <span className="breadcrumb">
          Đóng gói kết quả toàn Khoa, áp hạn ngạch xuất sắc 20% rồi trình Hiệu trưởng
          phê duyệt
        </span>
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

        <div className="cd-field" style={{ flex: '2 1 260px' }}>
          <label className="cd-label">Đơn vị</label>
          <SearchSelect
            value={idToTrinh}
            onChange={(v) => setIdToTrinh(Number(v))}
            options={danhSach.map((t) => ({
              value: t.IdToTrinh,
              label: `${t.TenDonVi} — ${t.SoHoSoDaChot ?? 0}/${t.SoHoSo ?? 0} hồ sơ đã chốt`,
            }))}
            placeholder="Chưa có gói KPI nào"
            disabled={danhSach.length === 0}
          />
        </div>

        <button className="btn-cancel" onClick={() => taiChiTiet()} disabled={isLoading || dangXuLy}>
          <i className={`fa-solid fa-rotate${isLoading ? ' fa-spin' : ''}`}></i> Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải gói KPI...
          </div>
        </div>
      ) : !goi ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-box-open"></i>
            <h3 style={{ color: '#334155', margin: '0 0 6px 0' }}>Chưa có gói KPI nào</h3>
            <p style={{ margin: 0 }}>
              Gói được tạo tự động khi hồ sơ đầu tiên của Khoa được Trưởng khoa chốt.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="cd-phieu-header">
            <div className="cd-phieu-top">
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {goi.TenDonVi}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                  {goi.MaDonVi && (
                    <span className="code-pill" style={{ marginRight: '8px' }}>
                      {goi.MaDonVi}
                    </span>
                  )}
                  Năm học {goi.IdNam}
                  {goi.LanTrinh > 0 ? ` · Đã trình ${goi.LanTrinh} lần` : ''}
                </div>
              </div>
              <TrangThaiToTrinhBadge trangThai={goi.TrangThai} />
            </div>

            <div className="cd-meta-grid">
              <div>
                <div className="cd-meta-label">Hồ sơ đã chốt</div>
                <div className="cd-meta-value">
                  {goi.SoHoSoDaChot ?? 0} / {goi.SoHoSo ?? 0}
                </div>
              </div>
              <div>
                <div className="cd-meta-label">Giảng viên (mẫu số hạn ngạch)</div>
                <div className="cd-meta-value">{goi.SoGiangVien ?? '—'}</div>
              </div>
              <div>
                <div className="cd-meta-label">Tỷ lệ xuất sắc</div>
                <div className="cd-meta-value">
                  {goi.TyLeXuatSac != null ? `${(goi.TyLeXuatSac * 100).toFixed(0)}%` : '—'}
                </div>
              </div>
              <div>
                <div className="cd-meta-label">Hạn ngạch</div>
                <div className="cd-meta-value" style={{ color: '#1d4ed8' }}>
                  {goi.HanNgachXuatSac ?? '—'} suất
                </div>
              </div>
              <div>
                <div className="cd-meta-label">Đã đạt xuất sắc</div>
                <div className="cd-meta-value">{goi.SoDatXuatSac ?? '—'}</div>
              </div>
              <div>
                <div className="cd-meta-label">Đóng gói lúc</div>
                <div className="cd-meta-value">{formatNgayGio(goi.NgayDongGoi)}</div>
              </div>
            </div>

            {nhanSuDaDoi && (
              <div className="cd-canh-bao" style={{ marginTop: '16px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>
                  Số giảng viên của Khoa đã đổi sau lần đóng gói gần nhất: lúc đóng gói là{' '}
                  <b>{goi.SoGiangVien}</b>, hiện tại là <b>{goi.SoGiangVienHienTai}</b>. Hạn
                  ngạch đang hiển thị tính trên mẫu số cũ — nên đóng gói lại.
                </span>
              </div>
            )}

            {goi.LyDoTraVe && (
              <div className="cd-yeu-cau-bo-sung" style={{ marginTop: '16px' }}>
                <div className="cd-yc-head">
                  <span
                    className="cd-status-badge"
                    style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                  >
                    <i className="fa-solid fa-rotate-left"></i> Hiệu trưởng trả về
                  </span>
                </div>
                <p className="cd-yc-lydo">{goi.LyDoTraVe}</p>
              </div>
            )}

            {goi.NhanXetHt && (
              <div className="cd-box" style={{ marginTop: '10px' }}>
                <div className="cd-box-title">Nhận xét của Hiệu trưởng</div>
                <div style={{ fontSize: '13px', color: '#334155' }}>{goi.NhanXetHt}</div>
              </div>
            )}
          </div>

          <div className="modern-table-card" style={{ padding: '20px', marginBottom: '20px' }}>
            <p className="sub-title" style={{ marginTop: 0 }}>
              ĐÓNG GÓI VÀ TRÌNH
            </p>

            {/* Gói đang nằm ở Hiệu trưởng thì nút vẫn hiện nhưng khóa, kèm lý do.
                Ẩn hẳn nút sẽ khiến người dùng tưởng mình mất quyền, trong khi thật
                ra chỉ là đang chờ — TO_TRINH_DA_TRINH / INVALID_STATE của server. */}
            {!coTheDongGoi && (
              <div className="cd-hint cd-hint-warn" style={{ marginBottom: '12px' }}>
                <i className="fa-solid fa-hourglass-half"></i> Chờ Hiệu trưởng xử lý —{' '}
                {trangThai === TRANG_THAI_TO_TRINH.HT_DA_DUYET
                  ? 'gói đã được duyệt và khóa số liệu.'
                  : 'gói đang ở bàn Hiệu trưởng, phải được trả về trước khi đóng gói lại.'}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {/* Tỷ lệ xuất sắc là con số của quy chế, không phải tham số người
                  dùng chỉnh: luôn 20%. Hiển thị để biết mẫu số đang dùng là gì,
                  không cho sửa. */}
              <div className="cd-field" style={{ flex: '0 1 160px' }}>
                <label className="cd-label">Tỷ lệ xuất sắc</label>
                <div
                  className="cd-meta-value"
                  style={{ fontSize: '18px', color: '#1d4ed8', padding: '6px 0' }}
                >
                  {(TY_LE_XUAT_SAC_MAC_DINH * 100).toFixed(0)}%
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#475569', flex: '1 1 260px' }}>
                Với {goi.SoGiangVienHienTai ?? goi.SoGiangVien ?? 0} giảng viên, hạn ngạch
                dự kiến là <b>{hanNgachDuKien} suất</b> (làm tròn xuống). Mẫu số là TỔNG
                số giảng viên của Khoa, không phải số người đạt "Hoàn thành tốt"; viên
                chức / người lao động không tính vào mẫu số.
              </div>

              <button
                className="btn-submit"
                disabled={dangXuLy || !coTheDongGoi}
                onClick={() => handleDongGoi()}
              >
                {dangXuLy ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-box-archive"></i>{' '}
                    {trangThai === TRANG_THAI_TO_TRINH.DANG_TONG_HOP
                      ? 'Đóng gói tờ trình'
                      : 'Đóng gói lại'}
                  </>
                )}
              </button>

              <button
                className="btn-submit"
                disabled={dangXuLy || !coTheTrinh}
                onClick={() => setMoTrinh(true)}
              >
                <i className="fa-solid fa-paper-plane"></i> Trình Hiệu trưởng
              </button>
            </div>
          </div>

          {hoSoThieu?.length > 0 && (
            <div className="modern-table-card" style={{ padding: '20px', marginBottom: '20px' }}>
              <div className="cd-canh-bao" style={{ marginTop: 0 }}>
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>
                  Còn <b>{hoSoThieu.length}</b> hồ sơ chưa được chốt nên chưa đóng gói được.
                  Gói chỉ đóng khi 100% giảng viên của Khoa đã có kết luận.
                </span>
              </div>
              <table className="custom-table" style={{ marginTop: '12px' }}>
                <thead>
                  <tr>
                    <th>Giảng viên</th>
                    <th style={{ width: '20%' }}>Trạng thái hồ sơ</th>
                    <th style={{ width: '16%', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {hoSoThieu.map((h) => (
                    <tr key={h.IdPhieu}>
                      <td>
                        <b style={{ color: '#0f172a' }}>{h.HoTen}</b>{' '}
                        {h.MaNhanVien && <span className="code-pill">{h.MaNhanVien}</span>}
                      </td>
                      <td style={{ fontSize: '13px', color: '#475569' }}>
                        {h.TrangThai === 3 ? 'Chờ bạn chốt' : 'Chưa thẩm định xong'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-cancel"
                          style={{ padding: '8px 14px' }}
                          onClick={() => navigate(`/quan-ly/duyet-ho-so/${h.IdPhieu}`)}
                        >
                          <i className="fa-solid fa-arrow-right"></i> Mở hồ sơ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="sub-title" style={{ marginBottom: '12px' }}>
            HỒ SƠ TRONG GÓI ({goi.HoSo?.length ?? 0})
          </p>

          <div className="modern-table-card">
            <BangHoSoToTrinh
              hoSo={goi.HoSo || []}
              hanNgach={goi.HanNgachXuatSac ?? null}
              ghiChuCot="Ghi chú"
            />
          </div>

          {goi.LichSu?.length > 0 && (
            <>
              <p className="sub-title" style={{ marginBottom: '12px', marginTop: '20px' }}>
                NHẬT KÝ GÓI
              </p>
              <div className="modern-table-card">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Thời điểm</th>
                      <th style={{ width: '24%' }}>Hành động</th>
                      <th style={{ width: '22%' }}>Người thực hiện</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goi.LichSu.map((ls) => (
                      <tr key={ls.Id}>
                        <td style={{ fontSize: '13px' }}>{formatNgayGio(ls.NgayThucHien)}</td>
                        <td style={{ fontSize: '13px' }}>
                          {TEN_HANH_DONG_TO_TRINH[ls.HanhDong] || `Hành động ${ls.HanhDong}`}
                          {ls.SoHoSoTraVe ? ` (${ls.SoHoSoTraVe} hồ sơ)` : ''}
                        </td>
                        <td style={{ fontSize: '13px' }}>{ls.TenNguoiThucHien || '—'}</td>
                        <td style={{ fontSize: '13px', color: '#64748b' }}>
                          {ls.LyDo || ls.NhanXet || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* Đồng hạng là một quyết định nhân sự phải làm DỨT ĐIỂM ngay lúc nó nổ ra,
          nên đặt trong modal chứ không phải một khối trôi giữa trang: đóng gói đã
          dừng lại chờ đúng thao tác này. */}
      {dongHang && (
        <div className="modal-overlay" onClick={dangXuLy ? undefined : () => setDongHang(null)}>
          <div
            className="modal-box cd-modal-dong-hang"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Chỉ định người được suất xuất sắc cuối cùng</h3>
              <button className="close-btn" onClick={() => setDongHang(null)} disabled={dangXuLy}>
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="cd-canh-bao" style={{ marginTop: 0 }}>
                <i className="fa-solid fa-scale-balanced"></i>
                <span>
                  Còn <b>{soSuatConLai}</b> suất xuất sắc,{' '}
                  <b>{dongHang.thongTin?.SoNguoiDongHang ?? dongHang.hoSo.length}</b> người cùng{' '}
                  {formatDiem(dongHang.thongTin?.DiemRanhGioi)} điểm. Hệ thống cố ý KHÔNG tự
                  phân xử — đây là quyết định nhân sự, bạn phải chỉ định.
                </span>
              </div>

              <table className="custom-table" style={{ marginTop: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '44px' }}></th>
                    <th>Giảng viên</th>
                    <th style={{ width: '26%', textAlign: 'right' }}>Tổng tích lũy</th>
                  </tr>
                </thead>
                <tbody>
                  {dongHang.hoSo.map((h) => (
                    <tr key={h.IdPhieu}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={uuTienChon.includes(h.IdPhieu)}
                          disabled={dangXuLy}
                          onChange={() => doiChonUuTien(h.IdPhieu)}
                        />
                      </td>
                      <td>
                        <b style={{ color: '#0f172a' }}>{h.HoTen}</b>{' '}
                        {h.MaNhanVien && <span className="code-pill">{h.MaNhanVien}</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>
                        {formatDiem(h.TongDiemTichLuy)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              {/* Stored procedure từ chối cả khi thừa lẫn khi thiếu, nên bộ đếm này
                  là điều kiện đóng/mở nút chứ không chỉ để trang trí. */}
              <span
                style={{
                  marginRight: 'auto',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: khopSoSuat ? '#047857' : '#b45309',
                }}
              >
                Đã chọn {uuTienChon.length}/{soSuatConLai} suất
                {!khopSoSuat && ' — phải chọn đúng số suất còn lại'}
              </span>
              <button className="btn-cancel" onClick={() => setDongHang(null)} disabled={dangXuLy}>
                Hủy
              </button>
              <button
                className="btn-submit"
                disabled={dangXuLy || !khopSoSuat}
                onClick={handleXacNhanDongHang}
              >
                {dangXuLy ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-star"></i> Xác nhận & đóng gói lại
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {moTrinh && (
        <LyDoModal
          tieuDe="Trình gói KPI lên Hiệu trưởng"
          moTa={`Toàn bộ ${goi?.SoHoSo ?? 0} hồ sơ của ${goi?.TenDonVi} sẽ được trình lên Hiệu trưởng phê duyệt. Trong lúc chờ, gói bị khóa — muốn sửa hồ sơ phải để Hiệu trưởng trả về trước.`}
          nhanLyDo="Nội dung trình"
          goiYLyDo="VD: Kính trình Hiệu trưởng phê duyệt kết quả KPI năm học 2025-2026."
          batBuocLyDo={false}
          nhanXacNhan="Trình Hiệu trưởng"
          iconXacNhan="fa-paper-plane"
          dangGui={dangXuLy}
          onDong={() => setMoTrinh(false)}
          onXacNhan={({ lyDo }) => handleTrinh({ nhanXet: lyDo })}
        />
      )}
    </div>
  );
};

export default ToTrinhKhoa;
