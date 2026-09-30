import React, { useEffect, useState } from "react";
import {
  fetchBaoCaoPhongTongQuan,
  fetchBaoCaoToanTruong,
  fetchBaoCaoTongQuan,
} from "../../utils/phieuApi";
import { TRANG_THAI_TO_TRINH_META } from "../../utils/toTrinhApi";
import { DanhSachChuaLap } from "./BaoCaoBoSung";
import TongQuanThuKy from "./TongQuanThuKy";
import {
  Alert,
  Card,
  chuGiaiQuy,
  DangTai,
  DashHeader,
  demTrangThai,
  giaiDoanQuy,
  hangXepLoaiNam,
  HeroKpi,
  Icon,
  KpiCard,
  KpiRow,
  LegendInline,
  NHAN_PHIEU_DON_VI,
  PhieuNamVienChucPanel,
  QuyCard,
  RAMP5,
  Section,
  so,
  StackBar,
  taoNhanTrangThai,
  TaskCard,
  theHocVu,
  TienDoPhieuNam,
  tyLe,
  XepLoaiBars,
  XL3,
} from "./TongQuanUi";

const NHAN_NAM_TRUONG = {
  1: "Nháp",
  2: "Đang thẩm định",
  3: "Chờ trưởng đơn vị chốt",
  4: "Trưởng đơn vị đã chốt",
  5: "Hoàn tất",
};

const NHAN_NAM_PHONG = {
  ...NHAN_NAM_TRUONG,
  3: "Chờ Trưởng phòng chốt",
  4: "Trưởng phòng đã chốt",
};

const TEN_LOAI_DON_VI = { TRUONG: "Trường", KHOA: "Khoa", PHONG: "Phòng" };

/** Bảng đơn vị mặc định chỉ hiện chừng này dòng đáng chú ý nhất. */
const SO_DON_VI_MAC_DINH = 8;

/** Tỷ lệ chưa lập phiếu từ mức này trở lên thì gắn cờ trên bảng đơn vị. */
const NGUONG_CO_CHUA_LAP = 0.1;

const tenPhieuDonVi = (row) =>
  row.TrangThaiPhieuDv == null
    ? "Chưa có phiếu"
    : NHAN_PHIEU_DON_VI[row.TrangThaiPhieuDv] || `Trạng thái ${row.TrangThaiPhieuDv}`;

const tenToTrinh = (row) =>
  row.TrangThaiToTrinh == null
    ? "Chưa có tờ trình"
    : row.TrangThaiToTrinhText ||
      TRANG_THAI_TO_TRINH_META[row.TrangThaiToTrinh]?.label ||
      "Chưa có nhãn";

const tong5 = (tt) => tt.reduce((a, b) => a + b, 0);

/**
 * Tổng quan cấp quản lý: Hiệu trưởng / Admin (cap = "truong") và Trưởng phòng
 * (cap = "phong"). Thư ký Phòng (`thuKy`) dùng chung số liệu Phòng nhưng chỉ
 * thấy bản tổng hợp - xem TongQuanThuKy.
 *
 * Phạm vi và phép gộp DonVi đều do API quyết định. `bao-cao/tong-quan` gọi kèm
 * để lấy phần tách theo loại đối tượng và quyền xem danh sách từng người.
 */
const TongQuanCapQuanLy = ({
  idNam,
  cap,
  reloadKey = 0,
  anThongKeTienDo = false,
  controls,
  chinh = true,
  thuKy = false,
}) => {
  const laToanTruong = cap === "truong";
  const [baoCao, setBaoCao] = useState(null);
  const [tongQuan, setTongQuan] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");
  const [loiTongQuan, setLoiTongQuan] = useState("");
  const [drill, setDrill] = useState(null);
  // Trưởng phòng kiêm nhiệm nhiều Phòng: lọc về một Phòng. Danh sách lựa chọn
  // lấy từ lần tải KHÔNG lọc, nếu không chọn một Phòng xong sẽ mất các Phòng kia.
  const [idPhong, setIdPhong] = useState("");
  const [dsPhong, setDsPhong] = useState([]);

  useEffect(() => {
    setIdPhong("");
    setDsPhong([]);
  }, [idNam]);

  useEffect(() => {
    if (!idNam) return undefined;
    let active = true;
    const thamSo = !laToanTruong && idPhong ? { idNam, idDonVi: idPhong } : { idNam };
    setDangTai(true);
    setLoi("");
    setLoiTongQuan("");
    setDrill(null);

    Promise.allSettled([
      laToanTruong ? fetchBaoCaoToanTruong({ idNam }) : fetchBaoCaoPhongTongQuan(thamSo),
      fetchBaoCaoTongQuan(thamSo),
    ]).then(([bc, tq]) => {
      if (!active) return;
      if (bc.status === "fulfilled" && bc.value) {
        setBaoCao(bc.value);
        if (!laToanTruong && !idPhong) setDsPhong(bc.value.DonVi || []);
      } else {
        setBaoCao(null);
        setLoi(
          bc.status === "rejected"
            ? bc.reason?.message || "Không tải được tổng quan KPI"
            : "Báo cáo chưa có dữ liệu",
        );
      }
      if (tq.status === "fulfilled") {
        setTongQuan(tq.value);
      } else {
        setTongQuan(null);
        setLoiTongQuan(tq.reason?.message || "Không tải được số liệu theo loại đối tượng");
      }
      setDangTai(false);
    });
    return () => {
      active = false;
    };
  }, [idNam, laToanTruong, idPhong, reloadKey]);

  const tong = baoCao?.TongHop;
  const donVi = baoCao?.DonVi || [];
  const apDungQuy = baoCao?.ApDungPhieuQuy === true && (baoCao?.PhieuQuy || []).length > 0;
  const quyHienTai = apDungQuy ? (baoCao?.QuyHienTai ?? tongQuan?.QuyHienTai ?? null) : null;
  const coQuyenDs = tongQuan?.CoQuyenXemDanhSach === true;

  const locPhong =
    !laToanTruong && dsPhong.length > 1 ? (
      <label className="db-field">
        Phòng (khi kiêm nhiệm)
        <select
          className="db-select db-select-wide"
          value={idPhong}
          onChange={(e) => setIdPhong(e.target.value)}
        >
          <option value="">Tất cả Phòng của tôi</option>
          {dsPhong.map((p) => (
            <option key={p.IdDonVi} value={p.IdDonVi}>
              {p.TenDonVi}
            </option>
          ))}
        </select>
      </label>
    ) : null;
  const boLoc =
    controls || locPhong ? (
      <>
        {controls}
        {locPhong}
      </>
    ) : null;

  const tieuDe = laToanTruong
    ? "Tổng quan toàn trường"
    : donVi.length === 1
      ? donVi[0].TenDonVi
      : "Tổng quan KPI Phòng";

  if (!baoCao) {
    return (
      <>
        <DashHeader title={tieuDe} controls={boLoc} chinh={chinh} />
        {dangTai ? (
          <DangTai>Đang tổng hợp số liệu KPI...</DangTai>
        ) : (
          loi && <Alert muc="danger">{loi}</Alert>
        )}
      </>
    );
  }

  if (thuKy) {
    return (
      <TongQuanThuKy
        tieuDe={tieuDe}
        phuDe={`Năm đánh giá ${idNam} · số liệu tổng hợp của Phòng`}
        loaiDonVi="Phòng"
        controls={boLoc}
        chinh={chinh}
        duLieu={{
          ...(tongQuan || {}),
          SoNhanVien: tong?.SoNhanVien,
          SoChuaLapPhieu: tong?.SoChuaLapPhieu,
          TongSoPhieu: tong?.TongSoPhieu,
          DemTheoTrangThai: tong?.DemTheoTrangThai,
          DemTheoXepLoai: baoCao.DemTheoXepLoai,
          ApDungPhieuQuy: baoCao.ApDungPhieuQuy,
          PhieuQuy: baoCao.PhieuQuy,
          QuyHienTai: quyHienTai,
          HocVu: undefined,
        }}
        trangThaiPhieuDv={donVi.length === 1 ? (donVi[0].TrangThaiPhieuDv ?? null) : null}
        duongDanPhieuDv="/danh-gia-kpi-phong"
        diemTb={null}
      />
    );
  }

  const drillKey = JSON.stringify([idNam, reloadKey, idPhong, drill]);
  const khoiDrill = (theoQuy) =>
    coQuyenDs &&
    drill &&
    Boolean(drill.quy) === theoQuy && (
      <div className="db-drill">
        <DanhSachChuaLap
          key={drillKey}
          idNam={idNam}
          idDonVi={idPhong || undefined}
          {...drill}
          onClose={() => setDrill(null)}
        />
      </div>
    );

  const chung = {
    idNam,
    baoCao,
    tongQuan,
    tong,
    donVi,
    apDungQuy,
    quyHienTai,
    coQuyenDs,
    anThongKeTienDo,
    moDrill: coQuyenDs ? setDrill : undefined,
    khoiDrill,
  };

  return (
    <>
      <DashHeader
        title={tieuDe}
        subtitle={
          laToanTruong
            ? `Năm đánh giá ${idNam}${apDungQuy ? " · Viên chức / NLĐ đánh giá theo quý" : ""}`
            : `Năm đánh giá ${idNam} · ${so(tong?.SoNhanVien)} nhân sự${apDungQuy ? " · đánh giá theo quý" : ""}`
        }
        quyHienTai={quyHienTai}
        controls={boLoc}
        chinh={chinh}
      />
      {loiTongQuan && <Alert>{loiTongQuan}</Alert>}
      {laToanTruong ? <ToanTruong {...chung} /> : <Phong {...chung} />}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Hiệu trưởng / Admin                                                 */
/* ------------------------------------------------------------------ */

const ToanTruong = ({
  baoCao,
  tongQuan,
  tong,
  donVi,
  apDungQuy,
  quyHienTai,
  anThongKeTienDo,
  moDrill,
  khoiDrill,
}) => {
  const [xemTatCa, setXemTatCa] = useState(false);
  const dem = demTrangThai(tong?.DemTheoTrangThai);
  const nhanTrangThai = taoNhanTrangThai(tong?.DemTheoTrangThai, NHAN_NAM_TRUONG);
  const soNhanVien = Number(tong?.SoNhanVien) || 0;
  const soChuaLap = Number(tong?.SoChuaLapPhieu) || 0;
  const tongSoPhieu = Number(tong?.TongSoPhieu) || 0;
  const cho = baoCao.ChoHieuTruong;
  const xepLoai = hangXepLoaiNam(baoCao.DemTheoXepLoai);
  const soHoanTatXl = xepLoai.reduce((s, r) => s + r.so, 0);
  const phieuNamVc = tong?.PhieuNamVienChuc || tongQuan?.PhieuNamVienChuc;

  const donViSapXep = [...donVi].sort(
    (a, b) =>
      (Number(b.SoChuaLapPhieu) || 0) - (Number(a.SoChuaLapPhieu) || 0) ||
      String(a.TenDonVi).localeCompare(String(b.TenDonVi), "vi"),
  );
  const donViHien = xemTatCa ? donViSapXep : donViSapXep.slice(0, SO_DON_VI_MAC_DINH);
  const coCotQuy = apDungQuy && quyHienTai;

  return (
    <>
      {cho && (
        <Section title="Việc đang chờ Hiệu trưởng">
          <div className="db-task-grid">
            <TaskCard
              nhan="Tờ trình KPI chờ duyệt"
              giaTri={so(cho.SoToTrinhChoDuyet)}
              cta="Mở tờ trình"
              to="/truong/to-trinh"
            />
            <TaskCard
              nhan="Hồ sơ lãnh đạo đơn vị chờ duyệt"
              giaTri={so(cho.SoHoSoLanhDaoChoDuyet)}
              cta="Xem hồ sơ"
              to="/truong/to-trinh"
            />
            <TaskCard
              nhan="Phiếu đánh giá đơn vị chờ duyệt"
              giaTri={so(cho.SoPhieuDonViChoDuyet)}
            />
            <TaskCard
              nhan="Phiếu đánh giá đơn vị chờ chốt"
              giaTri={so(cho.SoPhieuDonViChoChot)}
            />
          </div>
        </Section>
      )}

      <KpiRow
        hero={
          !anThongKeTienDo && (
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
          )
        }
      >
        <KpiCard
          nhan="Phiếu năm hoàn tất"
          giaTri={so(dem.get(5) || 0)}
          phu={`trên ${so(tongSoPhieu)} phiếu đã lập`}
        />
        {theHocVu(baoCao.HocVu, { gop: true })}
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
        <Card title="Xếp loại năm" meta={`${so(soHoanTatXl)} phiếu hoàn tất`}>
          {xepLoai.length ? (
            <XepLoaiBars rows={xepLoai} />
          ) : (
            <p className="db-empty">Chưa có phiếu hoàn tất được xếp loại.</p>
          )}
        </Card>
      </div>

      {apDungQuy && (
        <Card
          title="Viên chức / NLĐ — đánh giá theo quý"
          meta={`${so(baoCao.PhieuQuy[0]?.SoNhanVien)} viên chức phải lập phiếu quý tại đơn vị chính`}
          actions={<LegendInline items={chuGiaiQuy()} />}
        >
          <div className={phieuNamVc ? "db-quy-layout" : undefined}>
            <div className="db-quy-grid">
              {baoCao.PhieuQuy.map((r) => (
                <QuyCard key={r.Quy} row={r} quyHienTai={quyHienTai} onChuaLap={moDrill} />
              ))}
            </div>
            <PhieuNamVienChucPanel data={phieuNamVc} />
          </div>
          {khoiDrill(true)}
        </Card>
      )}

      <Card
        flush
        title="Theo đơn vị"
        meta={`Sắp theo số người chưa lập phiếu năm · ${so(donViHien.length)} / ${so(donVi.length)} đơn vị`}
      >
        {donVi.length === 0 ? (
          <p className="db-empty" style={{ padding: "0 24px 20px" }}>
            Chưa có đơn vị trong phạm vi báo cáo.
          </p>
        ) : (
          <>
            <div className="db-table-wrap">
              <table className="db-table" style={{ minWidth: 1080 }}>
                <thead>
                  <tr>
                    <th>Đơn vị</th>
                    <th className="is-num">Nhân sự</th>
                    <th className="is-num">Chưa lập</th>
                    <th>Tiến độ phiếu năm</th>
                    <th className="is-num">Hoàn tất</th>
                    {coCotQuy && <th className="is-num">Quý {quyHienTai} đã chốt</th>}
                    <th>Phiếu đơn vị</th>
                    <th>Tờ trình KPI</th>
                    <th className="is-num">TN đúng hạn</th>
                  </tr>
                </thead>
                <tbody>
                  {donViHien.map((r) => {
                    const tt = [r.SoNhap, r.SoThamDinh, r.SoChoTkDuyet, r.SoTkDaDuyet, r.SoHoanTat].map(
                      (v) => Number(v) || 0,
                    );
                    const nv = Number(r.SoNhanVien) || 0;
                    const chuaLap = Number(r.SoChuaLapPhieu) || 0;
                    const coCo = chuaLap > 0 && nv > 0 && chuaLap / nv >= NGUONG_CO_CHUA_LAP;
                    const quy = coCotQuy
                      ? (r.PhieuQuy || []).find((q) => Number(q.Quy) === Number(quyHienTai))
                      : null;
                    const segs = tt.map((n, i) => ({
                      key: i,
                      n,
                      c: RAMP5[i],
                      nhan: nhanTrangThai(i + 1),
                    }));
                    return (
                      <tr key={r.IdDonVi}>
                        <td>
                          <div className="db-table-ten">
                            <span>{r.TenDonVi}</span>
                            <span>{TEN_LOAI_DON_VI[r.LoaiDonVi] || r.LoaiDonVi}</span>
                          </div>
                        </td>
                        <td className="is-num">{so(nv)}</td>
                        <td className="is-num">
                          <span className="db-canh-bao-so">
                            {coCo && <Icon ten="canhBao" size={14} nhan="Nhiều người chưa lập" />}
                            {so(chuaLap)}
                          </span>
                        </td>
                        <td>
                          <StackBar
                            segments={segs}
                            nhan={`${r.TenDonVi}: ${segs.map((s) => `${s.nhan} ${s.n}`).join(", ")}`}
                          />
                        </td>
                        <td className="is-num">
                          {so(tt[4])} / {so(tong5(tt))}
                        </td>
                        {coCotQuy && (
                          <td className="is-num">
                            {quy ? `${so(quy.SoDaChot)} / ${so(quy.SoNhanVien)}` : "—"}
                          </td>
                        )}
                        <td className="is-muted">
                          {tenPhieuDonVi(r)}
                          {r.XepLoaiPhieuDvText ? ` · ${r.XepLoaiPhieuDvText}` : ""}
                        </td>
                        <td className="is-muted">{tenToTrinh(r)}</td>
                        <td className="is-num">
                          {r.LoaiDonVi === "KHOA" ? tyLe(r.TyLeTotNghiepDungHan) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {donVi.length > SO_DON_VI_MAC_DINH && (
              <div className="db-table-foot">
                <button type="button" className="db-btn" onClick={() => setXemTatCa((v) => !v)}>
                  {xemTatCa ? "Thu gọn" : `Xem tất cả ${so(donVi.length)} đơn vị`}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Trưởng phòng                                                        */
/* ------------------------------------------------------------------ */

const Phong = ({
  baoCao,
  tongQuan,
  tong,
  donVi,
  apDungQuy,
  quyHienTai,
  anThongKeTienDo,
  moDrill,
  khoiDrill,
}) => {
  const dem = demTrangThai(tong?.DemTheoTrangThai);
  const nhanTrangThai = taoNhanTrangThai(tong?.DemTheoTrangThai, NHAN_NAM_PHONG);
  const soNhanVien = Number(tong?.SoNhanVien) || 0;
  const soChuaLap = Number(tong?.SoChuaLapPhieu) || 0;
  const tongSoPhieu = Number(tong?.TongSoPhieu) || 0;
  const phieuNamVc = tong?.PhieuNamVienChuc || tongQuan?.PhieuNamVienChuc;
  const quyRows = apDungQuy ? baoCao.PhieuQuy : [];
  const quyNay = quyRows.find((r) => Number(r.Quy) === Number(quyHienTai)) || null;

  const quyChoDuyet = quyRows.filter((r) => Number(r.SoChoDuyet) > 0);
  const tongChoDuyetQuy = quyChoDuyet.reduce((s, r) => s + Number(r.SoChoDuyet), 0);
  const coQuyQuaChuaDuyet = quyChoDuyet.some((r) => giaiDoanQuy(r, quyHienTai) === "da-qua");

  // Quý gần nhất đã có phiếu chốt: con số "Hoàn thành tốt" có nghĩa nhất ở đó.
  const quyXl = [...quyRows].reverse().find((r) => Number(r.SoDaChot) > 0);
  const soHtTot = quyXl
    ? Number((quyXl.DemTheoXepLoaiQuy || []).find((x) => Number(x.MaXepLoai) === 3)?.SoLuong) || 0
    : null;

  const xepLoai = hangXepLoaiNam(baoCao.DemTheoXepLoai);
  const soHoanTatXl = xepLoai.reduce((s, r) => s + r.so, 0);
  const biChan = Number(phieuNamVc?.SoChoTkDuyetChuaChotQuy) || 0;

  return (
    <>
      <Section title="Việc cần làm">
        <div className="db-task-grid">
          {apDungQuy && (
            <TaskCard
              nhan="Phiếu quý chờ bạn duyệt"
              giaTri={so(tongChoDuyetQuy)}
              phu={
                quyChoDuyet.length
                  ? quyChoDuyet
                      .map(
                        (r) =>
                          `Quý ${r.Quy}${giaiDoanQuy(r, quyHienTai) === "da-qua" ? " (đã qua)" : ""}: ${so(r.SoChoDuyet)}`,
                      )
                      .join(" · ")
                  : "Không có phiếu nào đang chờ"
              }
              phuIcon={coQuyQuaChuaDuyet ? "canhBao" : undefined}
              to="/quan-ly/phieu-quy"
            />
          )}
          <TaskCard
            nhan="Hồ sơ năm chờ bạn duyệt"
            giaTri={so(dem.get(3) || 0)}
            phu={biChan > 0 ? `${so(biChan)} hồ sơ chưa duyệt được (0 quý chốt)` : "Chốt hồ sơ và xếp loại năm"}
            phuIcon={biChan > 0 ? "chan" : undefined}
            to="/quan-ly/ho-so-nhan-vien"
          />
          {quyNay ? (
            <TaskCard
              nhan={`Chưa lập phiếu quý ${quyNay.Quy}`}
              giaTri={so(quyNay.SoChuaLapPhieu)}
              phu={moDrill ? "Quý đang diễn ra · xem danh sách" : "Quý đang diễn ra"}
              onClick={moDrill ? () => moDrill({ quy: quyNay.Quy }) : undefined}
            />
          ) : (
            <TaskCard
              nhan="Chưa lập phiếu năm"
              giaTri={so(soChuaLap)}
              phu={moDrill ? "Xem danh sách" : undefined}
              onClick={moDrill ? () => moDrill({ quy: 0 }) : undefined}
            />
          )}
          {phieuNamVc && (
            <TaskCard
              nhan="Phiếu năm cần tổng hợp từ quý"
              giaTri={so((Number(phieuNamVc.SoChuaTongHopQuy) || 0) + (Number(phieuNamVc.SoTongHopQuyCu) || 0))}
              phu={`${so(phieuNamVc.SoChuaTongHopQuy)} chưa tổng hợp · ${so(phieuNamVc.SoTongHopQuyCu)} tổng hợp đã cũ`}
              to="/quan-ly/ho-so-nhan-vien"
            />
          )}
        </div>
      </Section>

      <KpiRow
        hero={
          !anThongKeTienDo &&
          (quyNay ? (
            <HeroKpi
              nhan={`Đã lập phiếu quý ${quyNay.Quy}`}
              xong={Math.max((Number(quyNay.SoNhanVien) || 0) - (Number(quyNay.SoChuaLapPhieu) || 0), 0)}
              tong={quyNay.SoNhanVien}
              donVi="viên chức"
            >
              <span className="db-kpi-phu">
                Trong đó {so(quyNay.SoDaChot)} đã chốt · {so(quyNay.SoChoDuyet)} chờ bạn duyệt ·{" "}
                {so(quyNay.SoDangChamDiem)} đang tự chấm
              </span>
            </HeroKpi>
          ) : (
            <HeroKpi
              nhan="Nhân sự đã lập phiếu năm"
              xong={Math.max(soNhanVien - soChuaLap, 0)}
              tong={soNhanVien}
            >
              <span className="db-kpi-phu">{so(soChuaLap)} người chưa lập phiếu năm</span>
            </HeroKpi>
          ))
        }
      >
        {(quyNay || anThongKeTienDo) && (
          <KpiCard
            nhan="Đã lập phiếu năm"
            giaTri={`${so(Math.max(soNhanVien - soChuaLap, 0))} / ${so(soNhanVien)}`}
            phu={`${so(soChuaLap)} người chưa lập`}
          />
        )}
        <KpiCard
          nhan="Phiếu năm hoàn tất"
          giaTri={so(dem.get(5) || 0)}
          phu={`trên ${so(tongSoPhieu)} phiếu đã lập`}
        />
        {quyXl && (
          <KpiCard
            nhan={`Hoàn thành tốt — quý ${quyXl.Quy}`}
            giaTri={`${so(soHtTot)} / ${so(quyXl.SoDaChot)}`}
            phu={`phiếu quý ${quyXl.Quy} đã chốt`}
          />
        )}
      </KpiRow>
      {khoiDrill(false)}

      {apDungQuy && (
        <Card
          title="Phiếu quý theo từng quý"
          meta="Luồng quý: tự chấm → nộp → Trưởng phòng duyệt và chốt điểm (xếp loại quý tự động, tối đa Hoàn thành tốt)"
          actions={<LegendInline items={chuGiaiQuy("Chờ duyệt", "Đang tự chấm")} />}
        >
          <div className="db-quy-grid">
            {quyRows.map((r) => (
              <QuyCard
                key={r.Quy}
                row={r}
                quyHienTai={quyHienTai}
                nhanCho="Chờ bạn duyệt"
                nhanDang="Đang tự chấm"
                xlDangThanh
                onChuaLap={moDrill}
              />
            ))}
          </div>
          {khoiDrill(true)}
        </Card>
      )}

      <div className="db-grid-3">
        <TienDoPhieuNam
          className="db-span-2"
          title="Phiếu năm"
          meta={`${so(tongSoPhieu)} phiếu đã lập${phieuNamVc ? ` · ${so(phieuNamVc.SoPhieu)} phiếu lấy điểm từ các quý` : ""}`}
          dem={dem}
          nhanTrangThai={nhanTrangThai}
          tongSoPhieu={tongSoPhieu}
        >
          {phieuNamVc && <PhieuNamQuyTomTat data={phieuNamVc} />}
        </TienDoPhieuNam>

        <Card title="Đánh giá đơn vị">
          <div className="db-kv-list">
            {donVi.map((r) => (
              <React.Fragment key={r.IdDonVi}>
                {donVi.length > 1 && <span className="db-loai-ten">{r.TenDonVi}</span>}
                <div className="db-kv">
                  <span>Phiếu đánh giá Phòng</span>
                  <span className="db-chip">{tenPhieuDonVi(r)}</span>
                </div>
                <div className="db-kv">
                  <span>Tờ trình KPI</span>
                  <span className="db-chip">{tenToTrinh(r)}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="db-card-head-text">
            <h3 className="db-card-title" style={{ fontSize: 14 }}>
              Xếp loại năm
            </h3>
            <span className="db-card-meta">{so(soHoanTatXl)} phiếu hoàn tất</span>
          </div>
          {xepLoai.length ? (
            <XepLoaiBars rows={xepLoai} />
          ) : (
            <p className="db-empty">Chưa có phiếu hoàn tất được xếp loại.</p>
          )}
        </Card>
      </div>
    </>
  );
};

/** Khung xám trong thẻ "Phiếu năm" của Trưởng phòng. */
const PhieuNamQuyTomTat = ({ data }) => {
  const segs = [
    { key: 0, nhan: "0 quý", n: Number(data.SoChuaChotQuyNao) || 0, c: XL3[0] },
    { key: 1, nhan: "1–3 quý", n: Number(data.SoChotChuaDuQuy) || 0, c: XL3[1] },
    { key: 2, nhan: "Đủ 4 quý", n: Number(data.SoChotDuBonQuy) || 0, c: XL3[2] },
  ];
  const biChan = Number(data.SoChoTkDuyetChuaChotQuy) || 0;
  const chuaTongHop = Number(data.SoChuaTongHopQuy) || 0;
  const tongHopCu = Number(data.SoTongHopQuyCu) || 0;
  return (
    <div className="db-subpanel">
      <div className="db-subpanel-col">
        <span className="db-subpanel-tieu-de">Theo số quý đã chốt</span>
        <StackBar segments={segs} nhan={`Theo số quý đã chốt: ${segs.map((s) => `${s.nhan} ${s.n}`).join(", ")}`} />
        <LegendInline items={segs} nho />
      </div>
      <div className="db-inline-list">
        {biChan > 0 && (
          <div className="db-inline-item">
            <Icon ten="chan" />
            <span>
              <b>
                {so(biChan)} / {so(data.SoChoTkDuyet)}
              </b>{" "}
              hồ sơ chờ bạn duyệt chưa chốt quý nào — chưa duyệt được
            </span>
          </div>
        )}
        {chuaTongHop > 0 && (
          <div className="db-inline-item">
            <Icon ten="dongHo" />
            <span>
              <b>{so(chuaTongHop)}</b> phiếu chưa tổng hợp từ quý
            </span>
          </div>
        )}
        {tongHopCu > 0 && (
          <div className="db-inline-item">
            <Icon ten="lamMoi" />
            <span>
              <b>{so(tongHopCu)}</b> phiếu tổng hợp đã cũ — có quý chốt sau lần tổng hợp
            </span>
          </div>
        )}
        {biChan === 0 && chuaTongHop === 0 && tongHopCu === 0 && (
          <div className="db-inline-item">
            <Icon ten="xong" />
            <span>Mọi phiếu năm đã tổng hợp đúng theo các quý đã chốt.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TongQuanCapQuanLy;
