import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchBaoCaoTongQuan,
  fetchThamDinhPending,
  formatNgayGio,
  LOAI_DOI_TUONG,
  TRANG_THAI,
  TRANG_THAI_META,
  XEP_LOAI_META,
} from '../../utils/phieuApi';
import {
  fetchToTrinhDetail,
  fetchToTrinhList,
  tinhHanNgach,
  TRANG_THAI_TO_TRINH,
  TY_LE_XUAT_SAC_MAC_DINH,
} from '../../utils/toTrinhApi';
import { TRANG_THAI_CHUA_LAP_META } from '../../utils/chuaLapPhieu';
import { useChuaTuCham } from '../../hooks/useChuaTuCham';
import { TrangThaiToTrinhBadge } from './TrangThaiBadge';
import TienDoCham from './TienDoCham';

/** Thứ tự hiển thị của bảng xếp loại — mức cao trước, giống mọi bảng kết quả khác. */
const THU_TU_XEP_LOAI = [4, 3, 2, 1];

/**
 * Màu ô icon riêng của dải thẻ đếm ở đây, ĐÈ lên màu trong TRANG_THAI_META.
 *
 * Hai bảng màu phục vụ hai việc khác nhau: TRANG_THAI_META phải cho mỗi trạng
 * thái một sắc riêng để badge trong bảng phiếu phân biệt được với nhau, còn ở đây
 * sáu thẻ đứng cạnh nhau theo đúng thứ tự tiến trình nên màu đọc theo mức độ cần
 * can thiệp: đỏ = phải nhắc người ta, hổ phách = đang tới lượt mình, xanh dương =
 * đang chờ mình duyệt, xanh lá = xong, xám = chưa cần đụng tới.
 */
const MAU_O_ICON = {
  'chua-lap': { background: '#fdecec', color: '#b91c1c' },
  1: { background: '#eef0f6', color: '#565c74' },
  2: { background: '#fef3e0', color: '#b4680a' },
  3: { background: '#eef1fb', color: '#003399' },
  4: { background: '#eaf7ee', color: '#15803d' },
  5: { background: '#eef0f6', color: '#565c74' },
};

/** Gói đã chạy thuật toán hạn ngạch → cột XepLoai mới có nghĩa. */
const TRANG_THAI_DA_AP_HAN_NGACH = [
  TRANG_THAI_TO_TRINH.DA_DONG_GOI,
  TRANG_THAI_TO_TRINH.DA_TRINH,
  TRANG_THAI_TO_TRINH.HT_DA_DUYET,
];

/**
 * Khối tổng quan KPI cấp Khoa trên trang chủ của Trưởng khoa / Trưởng khoa lớn.
 *
 * Ba endpoint chính đều tự kẹp phạm vi theo `ma_chuc_vu` trong JWT (TK/TKL chỉ
 * thấy cây đơn vị mình), nên KHÔNG truyền idDonVi — truyền vào chỉ thu hẹp thêm,
 * và với Trưởng khoa lớn còn cắt mất các Khoa con. `idDonVi` ở đây dùng cho đúng
 * hai việc: chọn gói tờ trình của chính đơn vị mình, và làm gốc cây cho danh bạ
 * đối chiếu người chưa lập phiếu.
 *
 * Hai con số KHÔNG lấy từ báo cáo server, vì server không trả được:
 *
 *  - Người chưa lập phiếu: phiếu chỉ tồn tại sau khi giảng viên bấm lưu lần đầu,
 *    nên họ vắng mặt trong mọi endpoint đọc `phieu_danh_gia` — kể cả TongSoPhieu.
 *    Ghép ở client qua useChuaTuCham (danh bạ trừ đi danh sách phiếu).
 *  - Phân bố xếp loại: `DemTheoXepLoai` của /bao-cao/tong-quan chỉ đếm phiếu
 *    trang_thai = 5, tức sau khi Hiệu trưởng duyệt cả gói. Suốt mùa đánh giá nó
 *    rỗng — đúng lúc Trưởng khoa cần nhìn nhất. Ở đây đếm từ HoSo[] của tờ trình,
 *    nguồn duy nhất có xếp loại ở MỌI giai đoạn.
 */
const TongQuanKhoa = ({ idNam, idDonVi, reloadKey = 0 }) => {
  const navigate = useNavigate();

  const [tongQuan, setTongQuan] = useState(null);
  const [soDongThamDinh, setSoDongThamDinh] = useState(null);
  const [goi, setGoi] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');

  const {
    chuaLapPhieu,
    dangTai: dangTaiChuaLap,
    loi: loiChuaLap,
    taiLai: taiLaiChuaLap,
  } = useChuaTuCham({ idNam, idDonViGoc: idDonVi });

  const tai = useCallback(async () => {
    if (!idNam) return;
    setDangTai(true);
    setLoi('');

    const [tq, td, ds] = await Promise.allSettled([
      fetchBaoCaoTongQuan({ idNam }),
      // Chỉ cần TongSoDong nên lấy trang nhỏ nhất — không dòng nào được dùng tới.
      fetchThamDinhPending({ idNam, pageSize: 1 }),
      fetchToTrinhList({ idNam }),
    ]);

    setTongQuan(tq.status === 'fulfilled' ? tq.value : null);
    // Trưởng khoa không được giao tiêu chí nào thì endpoint trả 403 — đó là cấu
    // hình hợp lệ, không phải lỗi: để null và ẩn hẳn dòng việc tương ứng.
    setSoDongThamDinh(td.status === 'fulfilled' ? td.value.tongSoDong : null);

    const dsGoi = ds.status === 'fulfilled' ? ds.value : [];
    const goiCuaToi =
      dsGoi.find((t) => Number(t.IdDonVi) === Number(idDonVi)) || dsGoi[0] || null;

    if (!goiCuaToi) {
      setGoi(null);
    } else {
      try {
        setGoi(await fetchToTrinhDetail(goiCuaToi.IdToTrinh));
      } catch (error) {
        // Dòng tóm tắt trong danh sách vẫn đủ dựng khối gói; chỉ mất phân bố xếp
        // loại vì HoSo[] chỉ có ở endpoint chi tiết.
        console.error('Lỗi tải chi tiết gói KPI Khoa:', error);
        setGoi(goiCuaToi);
      }
    }

    if (tq.status === 'rejected') {
      console.error('Lỗi tải báo cáo tổng quan Khoa:', tq.reason);
      setLoi(tq.reason?.message || 'Không tải được số liệu KPI của Khoa');
    }
    setDangTai(false);
  }, [idNam, idDonVi]);

  useEffect(() => {
    tai();
  }, [tai]);

  /**
   * Nút "Làm mới" của trang cha. Bỏ qua lần chạy đầu: hai nguồn dữ liệu đã tự tải
   * trong effect của mình rồi, chạy thêm ở đây là nhân đôi request lúc mở trang.
   */
  const lanDau = useRef(true);
  useEffect(() => {
    if (lanDau.current) {
      lanDau.current = false;
      return;
    }
    tai();
    taiLaiChuaLap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const demTheoTrangThai = useMemo(() => {
    const map = new Map();
    (tongQuan?.DemTheoTrangThai || []).forEach((d) =>
      map.set(Number(d.TrangThai), Number(d.SoLuong) || 0),
    );
    return map;
  }, [tongQuan]);

  const soPhieu = Number(tongQuan?.TongSoPhieu) || 0;
  const soChuaLap = chuaLapPhieu.length;
  const soDangNhap = demTheoTrangThai.get(TRANG_THAI.NHAP) || 0;
  const soChoToiChot = demTheoTrangThai.get(TRANG_THAI.CHO_TK_DUYET) || 0;

  /**
   * Mẫu số là NGƯỜI phải nộp, không phải phiếu đã tồn tại: cộng thêm những người
   * chưa lập phiếu, nếu không thì khoa nào càng nhiều người chưa động vào phiếu
   * lại càng hiện tỷ lệ hoàn thành đẹp.
   */
  const soPhaiNop = soPhieu + soChuaLap;
  const soDaNop = soPhieu - soDangNhap;

  const theTrangThai = useMemo(
    () => [
      {
        key: 'chua-lap',
        meta: TRANG_THAI_CHUA_LAP_META,
        soLuong: dangTaiChuaLap ? null : soChuaLap,
      },
      ...Object.entries(TRANG_THAI_META).map(([tt, meta]) => ({
        key: tt,
        meta,
        soLuong: demTheoTrangThai.get(Number(tt)) || 0,
      })),
    ],
    [dangTaiChuaLap, soChuaLap, demTheoTrangThai],
  );

  const viecCanLam = useMemo(
    () =>
      [
        {
          key: 'chot',
          so: soChoToiChot,
          nhan: 'hồ sơ chờ bạn chốt và chọn xếp loại',
          icon: 'fa-user-check',
          mau: '#003399',
          nen: '#eef1fb',
          duongDan: '/quan-ly/duyet-ho-so',
        },
        {
          key: 'tham-dinh',
          so: soDongThamDinh,
          nhan: 'dòng tiêu chí đơn vị bạn phải thẩm định',
          icon: 'fa-clipboard-check',
          mau: '#b4680a',
          nen: '#fef3e0',
          duongDan: '/quan-ly/cho-cham',
        },
        {
          key: 'chua-lap',
          so: dangTaiChuaLap ? 0 : soChuaLap,
          nhan: 'người chưa lập phiếu, cần nhắc nộp',
          icon: 'fa-user-slash',
          mau: '#b91c1c',
          nen: '#fdecec',
          duongDan: '/quan-ly/bao-cao',
        },
      ].filter((v) => Number(v.so) > 0),
    [soChoToiChot, soDongThamDinh, soChuaLap, dangTaiChuaLap],
  );

  /**
   * Xếp loại của cả Khoa, đếm từ HoSo[] của gói.
   *
   * `XepLoai` chỉ được ghi ở bước đóng gói (và chỉ ở đó mới có mức 4), nên trước
   * đó phải rơi về `XepLoaiKhoa` — mức Trưởng khoa chọn tay, trần là 3. Hai cột
   * này khác nghĩa nên nhãn hiển thị phải đổi theo trạng thái gói.
   */
  const phanBoXepLoai = useMemo(() => {
    const hoSo = goi?.HoSo || [];
    if (hoSo.length === 0) return null;

    const dem = new Map();
    let chuaXep = 0;
    hoSo.forEach((h) => {
      const muc = Number(h.XepLoai ?? h.XepLoaiKhoa) || 0;
      if (!muc) chuaXep += 1;
      else dem.set(muc, (dem.get(muc) || 0) + 1);
    });
    return { dem, chuaXep, tong: hoSo.length };
  }, [goi]);

  const daApHanNgach = TRANG_THAI_DA_AP_HAN_NGACH.includes(Number(goi?.TrangThai));

  /**
   * `NgayDongGoi` là dấu hiệu đáng tin duy nhất cho "đã có số liệu hạn ngạch
   * thật": trạng thái 5 cũng từng đóng gói nên vẫn còn số cũ, còn trạng thái 1
   * thì chưa bao giờ có.
   */
  const daTinhHanNgach = goi?.NgayDongGoi != null;

  /**
   * Mẫu số hạn ngạch — đếm PHIẾU, không đếm đầu người.
   *
   * `so_giang_vien = COUNT(phiếu trong gói WHERE loai_doi_tuong = 1)`, xem
   * docs/schema_ghi_chu.md §8.2 và chú thích cột trong docs/schema.sql. Giảng viên
   * chưa lập phiếu KHÔNG có dòng nào trong `phieu_danh_gia` nên không lọt vào mẫu
   * số, và hạn ngạch của Khoa bị hụt theo.
   *
   * Tính lại tại chỗ từ HoSo[] thay vì đọc `SoGiangVienHienTai`: HoSo[] lấy theo
   * (id_nam, id_don_vi) và gồm cả hồ sơ chưa chốt nên chạy đúng công thức trên,
   * trong khi mô tả của SoGiangVienHienTai ("số GV hiện tại của đơn vị") không nói
   * rõ nó đếm phiếu hay đếm nhân sự. `SoGiangVien` đã snapshot vẫn được ưu tiên
   * sau khi đóng gói vì đó mới là con số server thực sự dùng để chia suất.
   */
  const soGvCoPhieu = useMemo(
    () =>
      (goi?.HoSo || []).filter(
        (h) => Number(h.LoaiDoiTuong) === LOAI_DOI_TUONG.GIANG_VIEN,
      ).length,
    [goi],
  );

  /** Giảng viên chưa lập phiếu — nhóm bị mẫu số bỏ sót. Viên chức/NLĐ không tính. */
  const soGvChuaLapPhieu = useMemo(
    () =>
      chuaLapPhieu.filter(
        (r) => Number(r.LoaiDoiTuong) === LOAI_DOI_TUONG.GIANG_VIEN,
      ).length,
    [chuaLapPhieu],
  );

  const mauSoHienTai = daTinhHanNgach ? (goi?.SoGiangVien ?? soGvCoPhieu) : soGvCoPhieu;
  const soGvToanKhoa = soGvCoPhieu + soGvChuaLapPhieu;
  const hanNgachHienTai = useMemo(() => tinhHanNgach(mauSoHienTai), [mauSoHienTai]);

  if (dangTai) {
    return (
      <div className="modern-table-card">
        <div className="cd-empty">
          <i className="fa-solid fa-spinner fa-spin"></i>
          Đang tổng hợp số liệu KPI của Khoa...
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="sub-title tqk-title">
        TỔNG QUAN KPI KHOA
        {goi?.TenDonVi ? ` — ${goi.TenDonVi.toUpperCase()}` : ''}
        <button className="cd-link-btn" onClick={() => navigate('/quan-ly/bao-cao')}>
          Xem báo cáo đầy đủ <i className="fa-solid fa-arrow-right"></i>
        </button>
      </p>

      {loi && (
        <div className="cd-canh-bao tqk-canh-bao">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>{loi}</span>
        </div>
      )}

      <div className="cd-phieu-header tqk-tien-do">
        <TienDoCham
          nhan="Đã nộp phiếu"
          xong={soDaNop}
          tong={soPhaiNop}
          ghiChu={
            // Chỉ giữ lại hai trạng thái BẤT THƯỜNG của mẫu số: đang đối chiếu và
            // đối chiếu hỏng. Trường hợp bình thường không cần chú thích — số người
            // chưa lập phiếu đã có thẻ đếm riêng ngay bên dưới.
            dangTaiChuaLap
              ? 'Đang đối chiếu danh bạ đơn vị...'
              : loiChuaLap
                ? 'Mẫu số chỉ gồm người đã có phiếu — không đối chiếu được danh bạ.'
                : undefined
          }
        />
        <TienDoCham
          phu
          nhan="Đã chốt hồ sơ"
          xong={goi?.SoHoSoDaChot ?? 0}
          tong={goi?.SoHoSo ?? 0}
        />
      </div>

      <div className="stat-card-grid tqk-stat-grid">
        {theTrangThai.map((t) => (
          <div className="stat-card" key={t.key}>
            <div
              className="stat-icon-box"
              style={MAU_O_ICON[t.key] || { background: t.meta.bg, color: t.meta.color }}
            >
              <i className={`fa-solid ${t.meta.icon}`}></i>
            </div>
            <div className="stat-label">{t.meta.label}</div>
            <div className="stat-value">{t.soLuong == null ? '…' : t.soLuong}</div>
          </div>
        ))}
      </div>

      {viecCanLam.length > 0 && (
        <div className="tqk-viec-list">
          {viecCanLam.map((v) => (
            <button
              type="button"
              className="tqk-viec"
              key={v.key}
              onClick={() => navigate(v.duongDan)}
            >
              <span className="tqk-viec-icon" style={{ background: v.nen, color: v.mau }}>
                <i className={`fa-solid ${v.icon}`}></i>
              </span>
              <span className="tqk-viec-so" style={{ color: v.mau }}>
                {v.so}
              </span>
              <span className="tqk-viec-nhan">{v.nhan}</span>
              <i className="fa-solid fa-arrow-right tqk-viec-mui"></i>
            </button>
          ))}
        </div>
      )}

      <div className="cd-phieu-header tqk-goi">
        <div className="cd-phieu-top tqk-goi-top">
          <div>
            <div className="tqk-goi-ten">Tờ trình KPI của Khoa</div>
            <div className="tqk-goi-phu">
              {goi
                ? `Năm học ${goi.IdNam}${goi.LanTrinh > 0 ? ` · đã trình Hiệu trưởng ${goi.LanTrinh} lần` : ''}`
                : 'Tờ trình được tạo tự động ngay khi bạn chốt hồ sơ đầu tiên của Khoa'}
            </div>
          </div>
          {goi ? (
            <TrangThaiToTrinhBadge trangThai={goi.TrangThai} />
          ) : (
            <span className="tq-placeholder">Chưa có gói</span>
          )}
        </div>

        {goi && (
          <>
            <div className="cd-meta-grid tqk-meta-grid">
              <div>
                <div className="cd-meta-label">Giảng viên đã có phiếu</div>
                <div className="cd-meta-value">
                  {mauSoHienTai}
                  {soGvChuaLapPhieu > 0 && (
                    <span className="tqk-mau-so-phu"> / {soGvToanKhoa} của Khoa</span>
                  )}
                </div>
              </div>
              <div>
                <div className="cd-meta-label">
                  Suất Xuất sắc ({(TY_LE_XUAT_SAC_MAC_DINH * 100).toFixed(0)}%)
                </div>
                <div className="cd-meta-value tqk-nhan-manh">
                  {daTinhHanNgach ? (goi.HanNgachXuatSac ?? 0) : hanNgachHienTai}{' '}
                  <span className="tqk-don-vi">
                    {daTinhHanNgach ? 'suất' : 'suất (dự kiến)'}
                  </span>
                </div>
              </div>
              <div>
                <div className="cd-meta-label">Đã đạt Xuất sắc</div>
                <div className="cd-meta-value">
                  {daTinhHanNgach ? (goi.SoDatXuatSac ?? 0) : 'Chưa xét'}
                </div>
              </div>
              <div>
                <div className="cd-meta-label">Đóng gói lần cuối</div>
                <div className="cd-meta-value">
                  {daTinhHanNgach ? formatNgayGio(goi.NgayDongGoi) : 'Chưa đóng gói'}
                </div>
              </div>
            </div>

            {goi.LyDoTraVe && (
              <div className="cd-canh-bao tqk-canh-bao">
                <i className="fa-solid fa-rotate-left"></i>
                <span>
                  Hiệu trưởng đã trả gói về: {goi.LyDoTraVe}
                </span>
              </div>
            )}

            {phanBoXepLoai && (
              <div className="tqk-xep-loai">
                <div className="cd-meta-label">
                  {daApHanNgach
                    ? `Kết quả xếp loại chính thức (${phanBoXepLoai.tong} hồ sơ)`
                    : `Xếp loại bạn đã chọn khi chốt hồ sơ (${phanBoXepLoai.tong} hồ sơ)`}
                </div>
                <div className="tqk-xl-list">
                  {THU_TU_XEP_LOAI.filter((muc) => phanBoXepLoai.dem.get(muc)).map((muc) => (
                    <span className={`rating-badge ${XEP_LOAI_META[muc].className}`} key={muc}>
                      {XEP_LOAI_META[muc].label}: {phanBoXepLoai.dem.get(muc)}
                    </span>
                  ))}
                  {phanBoXepLoai.chuaXep > 0 && (
                    <span className="tqk-xl-chua">
                      Bạn chưa chốt: {phanBoXepLoai.chuaXep}
                    </span>
                  )}
                </div>
              </div>
            )}

            <button
              className="btn-submit tqk-goi-nut"
              onClick={() => navigate('/quan-ly/to-trinh')}
            >
              <i className="fa-solid fa-file-signature"></i>{' '}
              {Number(goi.TrangThai) === TRANG_THAI_TO_TRINH.DANG_TONG_HOP
                ? 'Mở trang đóng gói tờ trình'
                : 'Mở tờ trình KPI Khoa'}
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default TongQuanKhoa;
