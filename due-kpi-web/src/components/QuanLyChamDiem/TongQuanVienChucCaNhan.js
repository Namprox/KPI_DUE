import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchBaoCaoTongQuan,
  formatNgay,
  formatNgayGio,
  NGUONG_XEP_LOAI,
  tenTrangThai,
} from "../../utils/phieuApi";
import { fetchTongHopPhieuQuy } from "../../utils/phieuQuyApi";
import { fetchViPhamCuaToi } from "../../utils/viPhamCaNhanApi";
import { Alert, Card, DangTai, diem, Icon, Section, so, XL3 } from "./TongQuanUi";

/** Thang hiển thị của thanh dự kiến; điểm tích lũy viên chức hiếm khi vượt. */
const THANG_DIEM = 120;
/** Ngưỡng Hoàn thành tốt của viên chức (≥ 101) - khác giảng viên (> 100). */
const NGUONG_HT_TOT_VIEN_CHUC = 101;

const viTri = (v) => `${Math.round((Math.min(Math.max(v, 0), THANG_DIEM) * 1000) / THANG_DIEM) / 10}%`;

/**
 * Trạng thái của một quý chưa chốt. Phiếu quý: 1 đang tự chấm, 2 chờ trưởng đơn
 * vị duyệt, 5 đã chốt.
 */
const moTaQuyChuaChot = (q, quyHienTai) => {
  const tuongLai = quyHienTai && Number(q.Quy) > quyHienTai;
  if (q.IdPhieu == null) {
    return tuongLai
      ? { chip: "Chưa đến", ghiChu: "Chưa đến quý." }
      : { chip: "Chưa lập", ghiChu: "Bạn chưa lập phiếu quý này." };
  }
  if (Number(q.TrangThai) === 2) {
    return {
      chip: q.TrangThaiText || "Chờ duyệt",
      ghiChu: "Đã nộp. Điểm và xếp loại quý hiển thị sau khi trưởng đơn vị chốt.",
    };
  }
  return {
    chip: q.TrangThaiText || "Đang tự chấm",
    ghiChu: "Đang tự chấm — nộp phiếu để trưởng đơn vị duyệt.",
  };
};

/**
 * Trang chủ của viên chức / NLĐ khi năm đánh giá chấm theo quý: bốn quý, điểm
 * dự kiến cả năm và phiếu năm. Năm chưa bật đánh giá theo quý thì trả về
 * `fallback` (khối phiếu cá nhân chung của trang).
 *
 * @param {React.ReactNode} children khối "việc với phiếu năm" (bị trả về / còn
 *   thiếu) - chỉ truyền khi thật sự có việc.
 */
export default function TongQuanVienChucCaNhan({
  idNam,
  idNhanVien,
  reloadKey,
  phieu,
  hanNop,
  nhanHan = "Hạn tự đánh giá",
  duongDanPhieu,
  fallback = null,
  children,
}) {
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    if (!idNam || !idNhanVien) return undefined;
    let active = true;
    setState({ loading: true });
    (async () => {
      try {
        const overview = await fetchBaoCaoTongQuan({ idNam });
        if (!active) return;
        if (!overview?.ApDungPhieuQuy) {
          setState({ overview });
          return;
        }
        const [summary, viPham] = await Promise.allSettled([
          fetchTongHopPhieuQuy({ idNam, idNhanVien }),
          fetchViPhamCuaToi({ idNam, idNhanVien }),
        ]);
        if (!active) return;
        setState({
          overview,
          summary: summary.status === "fulfilled" ? summary.value : null,
          error: summary.status === "rejected" ? summary.reason?.message : "",
          soViPham: viPham.status === "fulfilled" ? (viPham.value || []).length : null,
        });
      } catch (error) {
        if (active) setState({ error: error.message });
      }
    })();
    return () => {
      active = false;
    };
  }, [idNam, idNhanVien, reloadKey]);

  if (!idNhanVien) return fallback;
  if (state.loading) return <DangTai>Đang tải kết quả các quý...</DangTai>;
  if (!state.overview?.ApDungPhieuQuy) return fallback;
  if (!state.summary) {
    return (
      <>
        {state.error && <Alert muc="danger">{state.error}</Alert>}
        {fallback}
      </>
    );
  }

  const { summary, soViPham } = state;
  const quyHienTai = Number(state.overview.QuyHienTai) || null;
  const dsQuy = summary.Quy || [];
  const quyNay = dsQuy.find((q) => Number(q.Quy) === quyHienTai) || null;
  const soQuyChot = Number(summary.SoQuyDaChot) || 0;
  const tichLuy = summary.DiemTichLuyDuKien;
  const xlDuKien = Number(summary.XepLoaiNamDuKien) || null;
  const biCatTranNhom =
    summary.TongVuotTroiTruocTranNhom != null &&
    summary.DiemVuotTroiTongQuy != null &&
    Number(summary.TongVuotTroiTruocTranNhom) > Number(summary.DiemVuotTroiTongQuy);
  const canTongHopLai =
    summary.NgayTongHopQuy != null &&
    summary.XepLoaiTongHopQuy != null &&
    xlDuKien != null &&
    Number(summary.XepLoaiTongHopQuy) !== xlDuKien;

  const banner = !quyNay
    ? { tieuDe: `Theo dõi phiếu quý năm ${idNam}`, nut: "Mở phiếu đánh giá" }
    : quyNay.DaChot
      ? { tieuDe: `Phiếu quý ${quyNay.Quy} đã được chốt`, nut: `Xem phiếu quý ${quyNay.Quy}` }
      : quyNay.IdPhieu == null
        ? { tieuDe: `Bạn chưa lập phiếu quý ${quyNay.Quy}`, nut: `Lập phiếu quý ${quyNay.Quy}`, canhBao: true }
        : Number(quyNay.TrangThai) === 2
          ? {
              tieuDe: `Phiếu quý ${quyNay.Quy} đã nộp — đang chờ trưởng đơn vị duyệt`,
              nut: `Xem phiếu quý ${quyNay.Quy}`,
            }
          : {
              tieuDe: `Phiếu quý ${quyNay.Quy} đang ở bước tự chấm — nhớ nộp trước khi hết quý`,
              nut: `Tiếp tục phiếu quý ${quyNay.Quy}`,
            };

  const conThieu =
    tichLuy == null
      ? null
      : Number(tichLuy) >= NGUONG_HT_TOT_VIEN_CHUC
        ? "Đã đạt ngưỡng Hoàn thành tốt (≥ 101)"
        : Number(tichLuy) >= NGUONG_XEP_LOAI.HOAN_THANH
          ? `Còn ${diem(NGUONG_HT_TOT_VIEN_CHUC - Number(tichLuy))} điểm để đạt mức Hoàn thành tốt (≥ ${NGUONG_HT_TOT_VIEN_CHUC})`
          : `Còn ${diem(NGUONG_XEP_LOAI.HOAN_THANH - Number(tichLuy))} điểm để đạt mức Hoàn thành (≥ ${NGUONG_XEP_LOAI.HOAN_THANH})`;

  return (
    <>
      <div className={`db-banner${banner.canhBao ? " is-warn" : ""}`}>
        <div className="db-banner-main">
          <Icon ten={banner.canhBao ? "canhBao" : "dongHo"} size={20} mau={banner.canhBao ? undefined : "#0056b3"} />
          <div className="db-banner-text">
            <span className="db-banner-tieu-de">{banner.tieuDe}</span>
            <span className="db-banner-mo-ta">Phiếu năm được tổng hợp từ các quý đã chốt.</span>
          </div>
        </div>
        {duongDanPhieu && (
          <Link className="db-btn db-btn-primary" to={duongDanPhieu}>
            {banner.nut}
          </Link>
        )}
      </div>

      <Section title={`Bốn quý năm ${idNam}`}>
        <div className="db-quy-grid">
          {dsQuy.map((q) => {
            const laHienTai = Number(q.Quy) === quyHienTai;
            const tuongLai = quyHienTai && Number(q.Quy) > quyHienTai;
            const moTa = q.DaChot ? null : moTaQuyChuaChot(q, quyHienTai);
            return (
              <article
                key={q.Quy}
                className={`db-quy db-quy-vc${laHienTai ? " is-current" : ""}${tuongLai ? " is-future" : ""}`}
              >
                <div className="db-quy-head">
                  <h3 className="db-quy-ten">Quý {q.Quy}</h3>
                  <span className={`db-chip${laHienTai && !q.DaChot ? " is-accent" : ""}`}>
                    {q.DaChot ? "Đã chốt" : moTa.chip}
                  </span>
                </div>
                {q.DaChot ? (
                  <>
                    <div className="db-quy-vc-diem">
                      <span>{diem(q.TongDiemTichLuy)}</span>
                      <span>điểm tích lũy</span>
                    </div>
                    <div className="db-quy-dong">
                      <div className="db-quy-dong-row">
                        <span>Cơ bản</span>
                        <span>{diem(q.TongDiemCoBan)}</span>
                      </div>
                      <div className="db-quy-dong-row">
                        <span>Vượt trội</span>
                        <span>{diem(q.TongDiemVuotTroi)}</span>
                      </div>
                    </div>
                    {q.XepLoaiQuyText && (
                      <span className="db-xl-chip">
                        <span
                          className="db-swatch"
                          style={{ background: XL3[Number(q.XepLoaiQuy) - 1] || XL3[1] }}
                        />
                        {q.XepLoaiQuyText}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="db-quy-vc-note">{moTa.ghiChu}</p>
                )}
              </article>
            );
          })}
        </div>
      </Section>

      <div className="db-grid-3">
        <Card
          className="db-span-2"
          title="Dự kiến cả năm (theo điểm)"
          meta={
            soQuyChot > 0
              ? `Tính từ ${soQuyChot} / 4 quý đã chốt${summary.DanhSachQuyDaChot ? ` (quý ${String(summary.DanhSachQuyDaChot).split(",").join(", ")})` : ""}`
              : "Chưa có quý nào được chốt"
          }
          actions={
            summary.XepLoaiNamDuKienText && (
              <span className="db-chip db-chip-lg">
                <span className="db-swatch" style={{ background: XL3[xlDuKien - 1] || XL3[1] }} />
                Xếp loại dự kiến: {summary.XepLoaiNamDuKienText}
              </span>
            )
          }
        >
          {soQuyChot === 0 || tichLuy == null ? (
            <p className="db-empty">
              Điểm dự kiến cả năm hiện ra khi có ít nhất một quý được trưởng đơn vị chốt.
            </p>
          ) : (
            <>
              <div className="db-hero-line">
                <span className="db-hero-so">{diem(tichLuy)}</span>
                <span className="db-hero-mau">điểm tích lũy dự kiến</span>
              </div>
              <div className="db-gauge">
                <div
                  className="db-gauge-track"
                  role="img"
                  aria-label={`${diem(tichLuy)} điểm trên thang 0 đến ${THANG_DIEM}; ngưỡng Hoàn thành ${NGUONG_XEP_LOAI.HOAN_THANH}, Hoàn thành tốt ${NGUONG_HT_TOT_VIEN_CHUC}`}
                >
                  <div className="db-gauge-fill" style={{ width: viTri(Number(tichLuy)) }} />
                  <div className="db-gauge-mark" style={{ left: viTri(NGUONG_XEP_LOAI.HOAN_THANH) }} />
                  <div className="db-gauge-mark" style={{ left: viTri(NGUONG_HT_TOT_VIEN_CHUC) }} />
                </div>
                <div className="db-gauge-scale" aria-hidden="true">
                  <span style={{ left: 0 }}>0</span>
                  <span className="is-mark" style={{ left: viTri(NGUONG_XEP_LOAI.HOAN_THANH) }}>
                    {NGUONG_XEP_LOAI.HOAN_THANH}
                    <br />
                    Hoàn thành
                  </span>
                  <span className="is-mark" style={{ left: viTri(NGUONG_HT_TOT_VIEN_CHUC) }}>
                    {NGUONG_HT_TOT_VIEN_CHUC}
                    <br />
                    Hoàn thành tốt
                  </span>
                  <span style={{ right: 0 }}>{THANG_DIEM}</span>
                </div>
              </div>
              {conThieu && (
                <div className="db-inline-item" style={{ fontSize: 14 }}>
                  <Icon ten="thongTin" />
                  <span>{conThieu}</span>
                </div>
              )}
              <div className="db-cong-thuc">
                <div>
                  <span>Cơ bản — TB {soQuyChot} quý</span>
                  <span>{diem(summary.DiemCoBanTbQuy)}</span>
                </div>
                <span className="db-toan-tu" aria-hidden="true">+</span>
                <div>
                  <span>Chấp hành (cả năm)</span>
                  <span>{diem(summary.DiemVpvcNam)}</span>
                </div>
                <span className="db-toan-tu" aria-hidden="true">+</span>
                <div>
                  <span>Vượt trội cộng dồn</span>
                  <span>{diem(summary.DiemVuotTroiTongQuy)}</span>
                </div>
                <span className="db-toan-tu" aria-hidden="true">=</span>
                <div>
                  <span>Tích lũy dự kiến</span>
                  <span style={{ fontWeight: 700 }}>{diem(tichLuy)}</span>
                </div>
              </div>
              {biCatTranNhom && (
                <Alert nho icon="thongTin" muc="info">
                  Vượt trội cộng dồn {diem(summary.TongVuotTroiTruocTranNhom)} điểm, đã cắt
                  về trần nhóm {diem(summary.TranNhomVuotTroi)} điểm.
                </Alert>
              )}
              <p className="db-note">
                Đây là mức xếp loại theo điểm để bạn theo dõi. Kết quả chính thức do
                trưởng đơn vị chốt khi duyệt hồ sơ năm và có thể khác.
              </p>
            </>
          )}
        </Card>

        <Card title={`Phiếu năm ${idNam}`}>
          <div className="db-kv-list">
            <div className="db-kv">
              <span>Trạng thái</span>
              <span>{phieu ? tenTrangThai(phieu.TrangThai) : "Chưa lập"}</span>
            </div>
            <div className="db-kv">
              <span>Nguồn điểm</span>
              <span>Tổng hợp từ các quý</span>
            </div>
            <div className="db-kv">
              <span>Tổng hợp gần nhất</span>
              <span>
                {summary.NgayTongHopQuy ? formatNgayGio(summary.NgayTongHopQuy) : "Chưa tổng hợp"}
              </span>
            </div>
            {soViPham != null && (
              <div className="db-kv">
                <span>Vi phạm đã ghi nhận</span>
                <span>{so(soViPham)}</span>
              </div>
            )}
            <div className="db-kv">
              <span>{nhanHan}</span>
              <span>{hanNop ? formatNgay(hanNop) : "Chưa thiết lập"}</span>
            </div>
          </div>
          {canTongHopLai && (
            <Alert nho icon="lamMoi">
              Có quý được chốt sau lần tổng hợp gần nhất — phiếu năm cần tổng hợp lại.
            </Alert>
          )}
          {duongDanPhieu && (
            <Link className="db-btn" to={duongDanPhieu} style={{ alignSelf: "flex-start" }}>
              Mở phiếu năm
            </Link>
          )}
        </Card>
      </div>

      {children}
    </>
  );
}
