import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchBaoCaoChuaHoanTat,
  fetchBaoCaoChuaLapPhieu,
  fetchBaoCaoDiemTrungBinh,
  fetchBaoCaoTongQuan,
  fetchThamDinhPending,
  formatNgayGio,
  TRANG_THAI_META,
  XEP_LOAI_META,
} from "../../utils/phieuApi";
import {
  fetchToTrinhDetail,
  fetchToTrinhList,
  TRANG_THAI_TO_TRINH,
  TRANG_THAI_TO_TRINH_META,
  TY_LE_XUAT_SAC_MAC_DINH,
} from "../../utils/toTrinhApi";
import { fetchPhieuDonViList } from "../../utils/phieuDonViApi";
import { nhomHanNgachHienThi } from "../../utils/hanNgachXuatSac";
import { coQuyenTaiDonVi, ROLE_SETS } from "../../utils/roles";
import { DanhSachChuaLap } from "./BaoCaoBoSung";
import TongQuanThuKy from "./TongQuanThuKy";
import {
  Alert,
  Card,
  chuGiaiQuy,
  DangTai,
  DashHeader,
  demTrangThai,
  DiemTrungBinhCard,
  hangXepLoaiNam,
  HeroKpi,
  Icon,
  KpiCard,
  KpiRow,
  LegendInline,
  PhieuNamVienChucPanel,
  QuyCard,
  RAMP5,
  Section,
  so,
  taoNhanTrangThai,
  TaskCard,
  theHocVu,
  TienDoPhieuNam,
  XepLoaiBars,
  XL4,
} from "./TongQuanUi";

/** Gói đã chạy thuật toán hạn ngạch → cột XepLoai mới có nghĩa. */
const TRANG_THAI_DA_AP_HAN_NGACH = [
  TRANG_THAI_TO_TRINH.DA_DONG_GOI,
  TRANG_THAI_TO_TRINH.DA_TRINH,
  TRANG_THAI_TO_TRINH.HT_DA_DUYET,
];

const NHAN_TRANG_THAI_NAM = Object.fromEntries(
  Object.entries(TRANG_THAI_META).map(([tt, meta]) => [tt, meta.label]),
);

/** Ngày đứng yên ở một trạng thái từ mức này trở lên thì gắn cờ. */
const NGUONG_TRE = 30;

/** Số dòng hai danh sách cuối trang; phần còn lại ở trang Báo cáo. */
const SO_DONG_DANH_SACH = 6;

const MOT_NGAY_MS = 24 * 60 * 60 * 1000;
const soNgayTu = (ngay) => {
  const t = ngay ? new Date(ngay).getTime() : NaN;
  return Number.isNaN(t) ? null : Math.max(Math.floor((Date.now() - t) / MOT_NGAY_MS), 0);
};

/**
 * Tổng quan KPI cấp Khoa trên trang chủ của TK / TKL (Trưởng khoa) và TKK (Thư
 * ký khoa - chỉ số tổng hợp, xem TongQuanThuKy).
 *
 * Báo cáo tổng quan tự giới hạn phạm vi theo chức vụ trong JWT (TK/TKL/TKK chỉ
 * thấy cây đơn vị mình), nên không truyền idDonVi: với Trưởng khoa lớn, bộ lọc
 * còn cắt mất các Khoa con. idDonVi dùng để chọn gói tờ trình và phiếu đánh giá
 * của đúng đơn vị mình.
 *
 * Phân bố xếp loại ưu tiên HoSo[] của tờ trình thay vì `DemTheoXepLoai`: cái sau
 * chỉ đếm phiếu trang_thai = 5 (sau khi Hiệu trưởng duyệt cả gói) nên suốt mùa
 * đánh giá nó rỗng - đúng lúc Trưởng khoa cần nhìn nhất.
 */
const TongQuanKhoa = ({ idNam, idDonVi, tenDonVi, reloadKey = 0, controls, chinh = true }) => {
  const { user } = useAuth();
  const laTruongKhoaTaiDonVi = coQuyenTaiDonVi(ROLE_SETS.TRUONG_KHOA, idDonVi, user);
  const duocThamDinh = coQuyenTaiDonVi(ROLE_SETS.TRUONG_DON_VI, idDonVi, user);

  const [duLieu, setDuLieu] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [drill, setDrill] = useState(null);
  const lanTai = useRef(0);

  const tai = useCallback(async () => {
    if (!idNam) return;
    const lan = ++lanTai.current;
    setDangTai(true);
    setLoi("");
    setDrill(null);

    const [tq, td, ds, tb, pdv] = await Promise.allSettled([
      fetchBaoCaoTongQuan({ idNam }),
      // Chỉ cần TongSoDong nên lấy trang nhỏ nhất - không dòng nào được dùng tới.
      duocThamDinh ? fetchThamDinhPending({ idNam, pageSize: 1 }) : Promise.resolve(null),
      fetchToTrinhList({ idNam }),
      fetchBaoCaoDiemTrungBinh({ idNam }),
      laTruongKhoaTaiDonVi
        ? Promise.resolve(null)
        : fetchPhieuDonViList({ idNam, idDonVi, pageSize: 5 }),
    ]);
    if (lan !== lanTai.current) return;

    const tongQuan = tq.status === "fulfilled" ? tq.value : null;
    const coQuyenDs = tongQuan?.CoQuyenXemDanhSach === true;
    const dsGoi = ds.status === "fulfilled" ? ds.value || [] : [];
    const goiTomTat =
      dsGoi.find((t) => Number(t.IdDonVi) === Number(idDonVi)) || dsGoi[0] || null;

    // TKK đọc được danh sách gói nhưng API chi tiết chỉ cho TK/TKL/TP.
    const [chiTiet, cht, cl] = await Promise.allSettled([
      goiTomTat && laTruongKhoaTaiDonVi
        ? fetchToTrinhDetail(goiTomTat.IdToTrinh)
        : Promise.resolve(goiTomTat),
      coQuyenDs ? fetchBaoCaoChuaHoanTat({ idNam }) : Promise.resolve(null),
      coQuyenDs
        ? fetchBaoCaoChuaLapPhieu({ idNam, page: 1, pageSize: SO_DONG_DANH_SACH })
        : Promise.resolve(null),
    ]);
    if (lan !== lanTai.current) return;

    if (chiTiet.status === "rejected") {
      // Dòng tóm tắt vẫn đủ dựng thẻ tờ trình; chỉ mất phân bố xếp loại.
      console.error("Lỗi tải chi tiết gói KPI Khoa:", chiTiet.reason);
    }
    const dsPhieuDv = pdv.status === "fulfilled" ? pdv.value || [] : [];

    setDuLieu({
      tongQuan,
      // Trưởng khoa không được giao tiêu chí nào thì endpoint trả 403 - cấu hình
      // hợp lệ, không phải lỗi: để null và ẩn hẳn thẻ việc tương ứng.
      soDongThamDinh: td.status === "fulfilled" ? (td.value?.tongSoDong ?? null) : null,
      goi: chiTiet.status === "fulfilled" ? chiTiet.value : goiTomTat,
      diemTb: tb.status === "fulfilled" ? tb.value || [] : null,
      phieuDv:
        dsPhieuDv.find((p) => Number(p.IdDonVi) === Number(idDonVi)) || dsPhieuDv[0] || null,
      chuaHoanTat: cht.status === "fulfilled" ? cht.value : null,
      chuaLap: cl.status === "fulfilled" ? cl.value : null,
    });

    if (tq.status === "rejected") {
      console.error("Lỗi tải báo cáo tổng quan Khoa:", tq.reason);
      setLoi(tq.reason?.message || "Không tải được số liệu KPI của Khoa");
    }
    setDangTai(false);
  }, [idNam, idDonVi, duocThamDinh, laTruongKhoaTaiDonVi]);

  useEffect(() => {
    tai();
  }, [tai, reloadKey]);

  const tongQuan = duLieu?.tongQuan;
  const goi = duLieu?.goi;
  const tieuDe = goi?.TenDonVi || tenDonVi || "Tổng quan KPI Khoa";
  const apDungQuy = tongQuan?.ApDungPhieuQuy === true && (tongQuan?.PhieuQuy || []).length > 0;
  const quyHienTai = apDungQuy ? tongQuan?.QuyHienTai : null;

  if (!duLieu) {
    return (
      <>
        <DashHeader title={tieuDe} controls={controls} chinh={chinh} />
        {dangTai ? (
          <DangTai>Đang tổng hợp số liệu KPI của Khoa...</DangTai>
        ) : (
          loi && <Alert muc="danger">{loi}</Alert>
        )}
      </>
    );
  }

  if (!laTruongKhoaTaiDonVi) {
    return (
      <TongQuanThuKy
        tieuDe={tieuDe}
        phuDe={`Năm đánh giá ${idNam} · số liệu tổng hợp của Khoa`}
        loaiDonVi="Khoa"
        controls={controls}
        chinh={chinh}
        duLieu={tongQuan}
        trangThaiPhieuDv={duLieu.phieuDv?.TrangThai ?? null}
        duongDanPhieuDv="/danh-gia-kpi-don-vi"
        diemTb={duLieu.diemTb}
      />
    );
  }

  return (
    <TruongKhoa
      idNam={idNam}
      tieuDe={tieuDe}
      controls={controls}
      chinh={chinh}
      quyHienTai={quyHienTai}
      apDungQuy={apDungQuy}
      loi={loi}
      duLieu={duLieu}
      drill={drill}
      setDrill={setDrill}
      reloadKey={reloadKey}
    />
  );
};

const TruongKhoa = ({
  idNam,
  tieuDe,
  controls,
  chinh,
  quyHienTai,
  apDungQuy,
  loi,
  duLieu,
  drill,
  setDrill,
  reloadKey,
}) => {
  const { tongQuan, goi, soDongThamDinh, diemTb, chuaHoanTat, chuaLap } = duLieu;
  const dem = demTrangThai(tongQuan?.DemTheoTrangThai);
  const nhanTrangThai = taoNhanTrangThai(tongQuan?.DemTheoTrangThai, NHAN_TRANG_THAI_NAM);
  const tongSoPhieu = Number(tongQuan?.TongSoPhieu) || 0;
  const soChuaLap = Number(tongQuan?.SoChuaLapPhieu) || 0;
  const soNhanVien =
    tongQuan?.SoNhanVien != null ? Number(tongQuan.SoNhanVien) : tongSoPhieu + soChuaLap;
  const coQuyenDs = tongQuan?.CoQuyenXemDanhSach === true;
  const moDrill = coQuyenDs ? setDrill : undefined;
  const phieuNamVc = tongQuan?.PhieuNamVienChuc;
  const biChan = Number(phieuNamVc?.SoChoTkDuyetChuaChotQuy) || 0;
  const quyRows = apDungQuy ? tongQuan.PhieuQuy : [];
  const quyChoDuyet = quyRows.filter((r) => Number(r.SoChoDuyet) > 0);

  const phanBoXepLoai = useMemo(() => {
    const hoSo = goi?.HoSo || [];
    if (hoSo.length === 0) return null;
    const demXl = new Map();
    let chuaXep = 0;
    hoSo.forEach((h) => {
      // `XepLoai` chỉ ghi ở bước đóng gói (mới có mức 4); trước đó rơi về
      // `XepLoaiKhoa` - mức Trưởng khoa chọn tay, trần là 3.
      const muc = Number(h.XepLoai ?? h.XepLoaiKhoa) || 0;
      if (!muc) chuaXep += 1;
      else demXl.set(muc, (demXl.get(muc) || 0) + 1);
    });
    return { dem: demXl, chuaXep, tong: hoSo.length };
  }, [goi]);

  const daApHanNgach = TRANG_THAI_DA_AP_HAN_NGACH.includes(Number(goi?.TrangThai));
  // NgayDongGoi là dấu hiệu duy nhất đáng tin cho "đã có số liệu hạn ngạch thật".
  const daTinhHanNgach = goi?.NgayDongGoi != null;
  const nhomHanNgach = nhomHanNgachHienThi(goi);
  const hanNgachDuKien = nhomHanNgach.length
    ? nhomHanNgach.reduce((sum, n) => sum + Number(n.HanNgach || 0), 0)
    : null;

  const xepLoaiRows = phanBoXepLoai
    ? [1, 2, 3, 4].map((muc) => ({
        key: muc,
        nhan: `${XEP_LOAI_META[muc].label} nhiệm vụ`,
        so: phanBoXepLoai.dem.get(muc) || 0,
        c: XL4[muc - 1],
      }))
    : hangXepLoaiNam(tongQuan?.DemTheoXepLoai);

  const drillKey = JSON.stringify([idNam, reloadKey, drill]);
  const khoiDrill = (theoQuy) =>
    coQuyenDs &&
    drill &&
    Boolean(drill.quy) === theoQuy && (
      <div className="db-drill">
        <DanhSachChuaLap key={drillKey} idNam={idNam} {...drill} onClose={() => setDrill(null)} />
      </div>
    );

  const hoSoCho = [...(chuaHoanTat || [])].sort(
    (a, b) => (Number(b.SoNgayOTrangThai) || 0) - (Number(a.SoNgayOTrangThai) || 0),
  );

  return (
    <>
      <DashHeader
        title={tieuDe}
        subtitle={`Năm đánh giá ${idNam} · gồm cả các đơn vị trực thuộc Khoa`}
        quyHienTai={quyHienTai}
        controls={controls}
        chinh={chinh}
      />
      {loi && <Alert muc="danger">{loi}</Alert>}

      <Section title="Việc cần làm">
        <div className="db-task-grid">
          <TaskCard
            nhan="Hồ sơ năm chờ bạn duyệt"
            giaTri={so(dem.get(3) || 0)}
            phu={
              biChan > 0
                ? `${so(biChan)} hồ sơ viên chức chưa duyệt được`
                : "Chốt hồ sơ và chọn xếp loại"
            }
            phuIcon={biChan > 0 ? "chan" : undefined}
            to="/quan-ly/duyet-ho-so"
          />
          {apDungQuy && (
            <TaskCard
              nhan="Phiếu quý chờ bạn duyệt"
              giaTri={so(quyChoDuyet.reduce((s, r) => s + Number(r.SoChoDuyet), 0))}
              phu={
                quyChoDuyet.length
                  ? quyChoDuyet.map((r) => `Quý ${r.Quy}: ${so(r.SoChoDuyet)} phiếu`).join(" · ")
                  : "Không có phiếu nào đang chờ"
              }
              to="/quan-ly/phieu-quy"
            />
          )}
          {Number(soDongThamDinh) > 0 && (
            <TaskCard
              nhan="Tiêu chí chờ bạn thẩm định"
              giaTri={so(soDongThamDinh)}
              phu="Dòng tiêu chí đơn vị bạn được giao chấm"
              to="/quan-ly/cho-cham"
            />
          )}
          <TaskCard
            nhan="Chưa lập phiếu năm"
            giaTri={so(soChuaLap)}
            phu={
              (tongQuan?.TheoLoaiDoiTuong || [])
                .filter((r) => Number(r.SoChuaLapPhieu) > 0)
                .map((r) => `${so(r.SoChuaLapPhieu)} ${String(r.LoaiDoiTuongText || "").toLowerCase()}`)
                .join(" · ") || undefined
            }
            onClick={moDrill && soChuaLap > 0 ? () => moDrill({ quy: 0 }) : undefined}
          />
          <TaskCard
            nhan="Tờ trình KPI Khoa"
            laChu
            giaTri={
              goi
                ? TRANG_THAI_TO_TRINH_META[goi.TrangThai]?.label || "Chưa có nhãn"
                : "Chưa có tờ trình"
            }
            phu={
              goi?.LyDoTraVe
                ? "Hiệu trưởng đã trả gói về"
                : goi
                  ? `${so(goi.SoHoSoDaChot ?? 0)} / ${so(goi.SoHoSo ?? 0)} hồ sơ đã chốt`
                  : "Tạo tự động khi bạn chốt hồ sơ đầu tiên"
            }
            phuIcon={goi?.LyDoTraVe ? "canhBao" : undefined}
            cta={
              Number(goi?.TrangThai) === TRANG_THAI_TO_TRINH.DANG_TONG_HOP
                ? "Mở trang đóng gói tờ trình"
                : "Mở tờ trình KPI Khoa"
            }
            to={goi ? "/quan-ly/to-trinh" : undefined}
          />
        </div>
      </Section>

      <KpiRow
        hero={
          <HeroKpi
            nhan="Nhân sự đã lập phiếu năm"
            xong={Math.max(soNhanVien - soChuaLap, 0)}
            tong={soNhanVien}
          >
            {soChuaLap > 0 &&
              (moDrill ? (
                <button type="button" className="db-link-btn" onClick={() => moDrill({ quy: 0 })}>
                  <Icon ten="canhBao" />
                  {so(soChuaLap)} người chưa lập phiếu năm — xem danh sách
                </button>
              ) : (
                <span className="db-kpi-phu">{so(soChuaLap)} người chưa lập phiếu năm</span>
              ))}
          </HeroKpi>
        }
      >
        <KpiCard
          nhan="Phiếu năm hoàn tất"
          giaTri={so(dem.get(5) || 0)}
          phu={`trên ${so(tongSoPhieu)} phiếu đã lập`}
        />
        {theHocVu(tongQuan?.HocVu)}
      </KpiRow>
      {khoiDrill(false)}

      <div className="db-grid-3">
        <TienDoPhieuNam
          className="db-span-2"
          dem={dem}
          nhanTrangThai={nhanTrangThai}
          tongSoPhieu={tongSoPhieu}
          theoLoai={tongQuan?.TheoLoaiDoiTuong}
        />
        <Card
          title="Xếp loại năm"
          meta={
            phanBoXepLoai
              ? daApHanNgach
                ? `Kết quả chính thức · ${so(phanBoXepLoai.tong)} hồ sơ`
                : `Mức bạn chọn khi chốt · ${so(phanBoXepLoai.tong)} hồ sơ`
              : `${so(dem.get(5) || 0)} phiếu hoàn tất`
          }
        >
          {xepLoaiRows.length ? (
            <XepLoaiBars rows={xepLoaiRows} />
          ) : (
            <p className="db-empty">Chưa có hồ sơ nào được xếp loại.</p>
          )}
          {goi && (
            <div className="db-meta-lines">
              {phanBoXepLoai?.chuaXep > 0 && (
                <div className="db-meta-line">
                  <span>Bạn chưa chốt</span>
                  <span>{so(phanBoXepLoai.chuaXep)} hồ sơ</span>
                </div>
              )}
              <div className="db-meta-line">
                <span>Suất Xuất sắc ({(TY_LE_XUAT_SAC_MAC_DINH * 100).toFixed(0)}%)</span>
                <span>
                  {daTinhHanNgach
                    ? `${so(goi.HanNgachXuatSac ?? 0)} suất`
                    : hanNgachDuKien == null
                      ? "—"
                      : `${so(hanNgachDuKien)} suất (dự kiến)`}
                </span>
              </div>
              <div className="db-meta-line">
                <span>Đã đạt Xuất sắc</span>
                <span>{daTinhHanNgach ? so(goi.SoDatXuatSac ?? 0) : "Chưa xét"}</span>
              </div>
              <div className="db-meta-line">
                <span>Đóng gói lần cuối</span>
                <span>{daTinhHanNgach ? formatNgayGio(goi.NgayDongGoi) : "Chưa đóng gói"}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {diemTb && <DiemTrungBinhCard rows={diemTb} />}

      {apDungQuy && (
        <Card
          title="Viên chức văn phòng Khoa — đánh giá theo quý"
          meta={`${so(quyRows[0]?.SoNhanVien)} viên chức · Trưởng khoa duyệt phiếu quý`}
          actions={<LegendInline items={chuGiaiQuy()} />}
        >
          <div className={phieuNamVc ? "db-quy-layout" : undefined}>
            <div className="db-quy-grid">
              {quyRows.map((r) => (
                <QuyCard key={r.Quy} row={r} quyHienTai={quyHienTai} onChuaLap={moDrill} />
              ))}
            </div>
            <PhieuNamVienChucPanel data={phieuNamVc} choBan />
          </div>
          {khoiDrill(true)}
        </Card>
      )}

      {coQuyenDs && (chuaHoanTat || chuaLap) && (
        <div className="db-grid-3">
          {chuaHoanTat && (
            <Card
              flush
              className="db-span-2"
              title="Hồ sơ chưa hoàn tất"
              meta={`Sắp theo số ngày đứng ở trạng thái hiện tại · ${so(Math.min(hoSoCho.length, SO_DONG_DANH_SACH))} / ${so(hoSoCho.length)} hồ sơ`}
              actions={
                <Link className="db-link-strong" to="/quan-ly/bao-cao">
                  Xem tất cả
                </Link>
              }
            >
              {hoSoCho.length === 0 ? (
                <p className="db-empty" style={{ padding: "0 24px 20px" }}>
                  Mọi phiếu trong phạm vi của bạn đã hoàn tất.
                </p>
              ) : (
                <div className="db-table-wrap">
                  <table className="db-table" style={{ minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th>Họ tên</th>
                        <th>Nhóm</th>
                        <th>Trạng thái</th>
                        <th className="is-num">Ở trạng thái</th>
                        <th className="is-num">Tuổi phiếu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hoSoCho.slice(0, SO_DONG_DANH_SACH).map((r) => {
                        const tt = Number(r.TrangThai);
                        const oTrangThai = r.SoNgayOTrangThai;
                        const tuoi = r.SoNgayTroi ?? soNgayTu(r.NgayTao);
                        return (
                          <tr key={r.IdPhieu}>
                            <td>
                              <div className="db-table-ten">
                                <Link to={`/quan-ly/phieu/${r.IdPhieu}`}>
                                  {r.HoTen || `#${r.IdNhanVien}`}
                                </Link>
                              </div>
                            </td>
                            <td className="is-muted">{r.LoaiDoiTuongText || "—"}</td>
                            <td>
                              <div className="db-tt-cell">
                                <span>
                                  <span
                                    className="db-swatch db-swatch-sm"
                                    style={{ background: RAMP5[tt - 1] || RAMP5[0] }}
                                  />
                                  {r.TrangThaiText || nhanTrangThai(tt)}
                                </span>
                              </div>
                            </td>
                            <td className="is-num">
                              <span className="db-canh-bao-so">
                                {Number(oTrangThai) >= NGUONG_TRE && (
                                  <Icon ten="dongHo" size={14} nhan={`Quá ${NGUONG_TRE} ngày`} />
                                )}
                                {oTrangThai == null ? "—" : `${so(oTrangThai)} ngày`}
                              </span>
                            </td>
                            <td className="is-num is-muted">
                              {tuoi == null ? "—" : `${so(tuoi)} ngày`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {chuaLap && (
            <Card
              flush
              title="Chưa lập phiếu năm"
              meta={`${so(chuaLap.TotalCount)} người · tại đơn vị chính`}
              actions={
                chuaLap.TotalCount > 0 && (
                  <button
                    type="button"
                    className="db-link-btn db-link-strong"
                    onClick={() => setDrill({ quy: 0 })}
                  >
                    Xem tất cả
                  </button>
                )
              }
            >
              {chuaLap.Items.length === 0 ? (
                <p className="db-empty" style={{ padding: "0 24px 20px" }}>
                  Mọi người đã lập phiếu năm.
                </p>
              ) : (
                <div className="db-person-list">
                  {chuaLap.Items.map((p) => (
                    <div className="db-person" key={p.IdNhanVien}>
                      <div className="db-person-ten">
                        <span>{p.HoTen}</span>
                        <span>{p.TenChucDanh || p.TenDonVi || "—"}</span>
                      </div>
                      {p.LoaiDoiTuongText && <span className="db-chip">{p.LoaiDoiTuongText}</span>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </>
  );
};

export default TongQuanKhoa;
