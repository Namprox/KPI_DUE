import React, { useId } from "react";
import { Link } from "react-router-dom";
import { XEP_LOAI_META } from "../../utils/phieuApi";
import "../../css/CaNhan/TongQuanDashboard.css";

/**
 * Khối dựng dùng chung của trang tổng quan theo vai trò.
 *
 * Trạng thái phiếu, xếp loại và tiến độ quý dùng MỘT dải xanh đậm dần theo thứ
 * tự tiến trình. Đừng tô "Hoàn tất" xanh lá hay "Nháp" đỏ: đây là tiến độ, không
 * phải đánh giá tốt / xấu, và dải một sắc vẫn đọc được khi in đen trắng.
 */
export const RAMP5 = ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab", "#104281"];
export const XL4 = ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"];
export const XL3 = ["#86b6ef", "#2a78d6", "#104281"];
export const MAU_QUY = {
  CHOT: "#104281",
  CHO: "#2a78d6",
  DANG: "#86b6ef",
  CHUA: "#e2e8f0",
};
/** Nhóm viên chức trên biểu đồ điểm TB - khác sắc hẳn nhóm giảng viên. */
export const MAU_VIEN_CHUC = "#eb6834";

/** Mọi con số trên trang dùng dấu phẩy thập phân kiểu Việt Nam. */
const VI = "vi-VN";

export const so = (v) =>
  v == null || v === "" || Number.isNaN(Number(v))
    ? "—"
    : Number(v).toLocaleString(VI);

export const tyLe = (v, toiDa = 2) =>
  v == null
    ? "—"
    : `${Number(v).toLocaleString(VI, { maximumFractionDigits: toiDa })}%`;

/** Phần trăm làm tròn 1 chữ số; null khi mẫu số 0 (khác 0%). */
export const phanTram = (xong, tong) =>
  Number(tong) > 0 ? Math.round((Number(xong) * 1000) / Number(tong)) / 10 : null;

export const diem = (v) =>
  v == null || v === ""
    ? "—"
    : Number(v).toLocaleString(VI, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      });

/** Năm nhập học → số khóa theo quy ước của Trường (2022 → Khóa 48). */
export const hienThiKhoa = (nam) => {
  if (nam == null || Number.isNaN(Number(nam))) return "-";
  const n = Number(nam);
  return n > 1974 ? String(n - 1974) : String(n);
};

/** DemTheoTrangThai từ API → Map theo mã trạng thái. */
export const demTrangThai = (rows) => {
  const map = new Map();
  (rows || []).forEach((r) =>
    map.set(Number(r.TrangThai), Number(r.SoLuong) || 0),
  );
  return map;
};

/** Nhãn trạng thái: ưu tiên TrangThaiText server trả, thiếu mới dùng nhãn dự phòng. */
export const taoNhanTrangThai = (rows, duPhong) => (tt) =>
  (rows || []).find((r) => Number(r.TrangThai) === Number(tt))?.TrangThaiText ||
  duPhong[tt] ||
  `Trạng thái ${tt}`;

/** Phiếu đánh giá đơn vị theo ngữ cảnh báo cáo (openapi BaoCaoDonViThongKeDto). */
export const NHAN_PHIEU_DON_VI = {
  1: "Nháp",
  2: "Chờ trưởng đơn vị duyệt",
  3: "Chờ Trường duyệt",
  4: "HT đã duyệt, chờ chốt",
  5: "Hoàn tất",
};

/* ------------------------------------------------------------------ */
/* Biểu tượng                                                          */
/* ------------------------------------------------------------------ */

const DUONG_VE = {
  canhBao: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  chan: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </>
  ),
  dongHo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  thongTin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  muiTen: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  khoa: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  lamMoi: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </>
  ),
  xong: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.7 2.7L16 9.5" />
    </>
  ),
  traVe: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
};

/** Cùng sắc với .stat-icon-amber / .stat-icon-green và nút chính của app. */
const MAU_BIEU_TUONG = {
  canhBao: "#d97706",
  chan: "#dc2626",
  dongHo: "#d97706",
  thongTin: "#0056b3",
  muiTen: "#0056b3",
  khoa: "#0056b3",
  lamMoi: "#d97706",
  xong: "#059669",
  traVe: "#d97706",
};

export const Icon = ({ ten, size = 16, mau, className, nhan }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={mau || MAU_BIEU_TUONG[ten] || "currentColor"}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden={nhan ? undefined : "true"}
    role={nhan ? "img" : undefined}
    aria-label={nhan}
  >
    {DUONG_VE[ten]}
  </svg>
);

/* ------------------------------------------------------------------ */
/* Khung                                                               */
/* ------------------------------------------------------------------ */

/**
 * Đầu mỗi bảng điều khiển. `chinh` = khối đầu tiên của trang (h1 + bộ lọc năm);
 * người kiêm nhiệm có hai khối thì khối sau chỉ còn tiêu đề h2.
 */
export const DashHeader = ({ title, subtitle, quyHienTai, controls, chinh = true }) => {
  const Tag = chinh ? "h1" : "h2";
  return (
    <div className="db-header">
      <div className="db-header-text">
        <Tag>{title}</Tag>
        {subtitle && <p className="db-header-sub">{subtitle}</p>}
      </div>
      {(controls || quyHienTai) && (
        <div className="db-header-controls">
          {quyHienTai ? (
            <div className="db-quy-chip">
              <Icon ten="dongHo" mau="#004494" />
              Quý hiện tại: Quý {quyHienTai}
            </div>
          ) : null}
          {controls}
        </div>
      )}
    </div>
  );
};

export const Card = ({
  as: Tag = "section",
  title,
  meta,
  actions,
  flush = false,
  className = "",
  children,
}) => {
  const id = useId();
  return (
    <Tag
      className={`db-card${flush ? " db-card-flush" : ""}${className ? ` ${className}` : ""}`}
      aria-labelledby={title ? id : undefined}
    >
      {(title || actions) && (
        <div className="db-card-head">
          <div className="db-card-head-text">
            {title && (
              <h2 id={id} className="db-card-title">
                {title}
              </h2>
            )}
            {meta && <span className="db-card-meta">{meta}</span>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </Tag>
  );
};

export const Section = ({ title, children }) => {
  const id = useId();
  return (
    <section className="db-section" aria-labelledby={id}>
      <h2 id={id} className="db-section-title">
        {title}
      </h2>
      {children}
    </section>
  );
};

export const DangTai = ({ children }) => (
  <div className="db-loading" role="status">
    <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
    {children}
  </div>
);

export const Alert = ({ muc = "warn", icon = "canhBao", tieuDe, moTa, nho = false, children }) => (
  <div
    className={`db-alert${muc === "danger" ? " is-danger" : muc === "info" ? " is-info" : ""}${nho ? " db-alert-sm" : ""}`}
  >
    <Icon ten={icon} size={nho ? 14 : 18} />
    {tieuDe || moTa ? (
      <div className="db-alert-body">
        {tieuDe && <span className="db-alert-tieu-de">{tieuDe}</span>}
        {moTa && <span className="db-alert-mo-ta">{moTa}</span>}
      </div>
    ) : (
      <span>{children}</span>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Thẻ việc + thẻ số                                                   */
/* ------------------------------------------------------------------ */

/**
 * Một việc đang chờ người xem. Có `to` thì là liên kết, có `onClick` thì là nút;
 * thiếu cả hai (chưa có màn hình xử lý) thì chỉ là thẻ đếm, không giả vờ bấm được.
 */
export const TaskCard = ({ nhan, giaTri, laChu = false, phu, phuIcon, cta, to, onClick }) => {
  const noiDung = (
    <>
      <span className="db-task-nhan">{nhan}</span>
      <span className={`db-task-so${laChu ? " is-text" : ""}`}>{giaTri}</span>
      {phu && (
        <span className="db-task-phu">
          {phuIcon && <Icon ten={phuIcon} size={14} />}
          {phu}
        </span>
      )}
      {cta && (to || onClick) && (
        <span className="db-task-cta">
          {cta}
          <Icon ten="muiTen" size={14} />
        </span>
      )}
    </>
  );
  if (to) {
    return (
      <Link className="db-task" to={to}>
        {noiDung}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className="db-task" onClick={onClick}>
        {noiDung}
      </button>
    );
  }
  return <div className="db-task">{noiDung}</div>;
};

/** `laChu` cho giá trị là chữ ("Chưa có dữ liệu") - cỡ số 32px quá to với câu. */
export const KpiCard = ({ nhan, giaTri, phu, laChu = false }) => (
  <div className="db-kpi">
    <span className="db-kpi-nhan">{nhan}</span>
    <span className={`db-kpi-so${laChu ? " is-text" : ""}`}>{giaTri}</span>
    {phu && <span className="db-kpi-phu">{phu}</span>}
  </div>
);

/**
 * Hai thẻ học vụ. Tỷ lệ null = mẫu số 0 (chưa import / Khoa chưa ánh xạ), KHÁC
 * 0% nên phải nói rõ "Chưa có dữ liệu". `gop` cho cấp Trường: nhiều Khoa gộp
 * lại thì tử / mẫu không còn ý nghĩa với người đọc, chỉ nêu số Khoa.
 */
export const theHocVu = (hocVu, { gop = false } = {}) => {
  if (!hocVu) return [];
  const mauSo = (tong, thoiHoc) =>
    tong == null ? null : Number(tong) - (Number(thoiHoc) || 0);
  const khoaTn = `Khóa ${hienThiKhoa(hocVu.NamNhapHocTotNghiep)}`;
  const khoaCb = `Khóa ${hienThiKhoa(hocVu.NamNhapHocCanhBaoTu)} – ${hienThiKhoa(hocVu.NamNhapHocCanhBaoDen)}`;
  const chiSo = [
    {
      key: "tot-nghiep",
      nhan: "Tốt nghiệp đúng hạn",
      tyLe: hocVu.TyLeTotNghiepDungHan,
      phu: gop
        ? `${khoaTn} · gộp ${so(hocVu.SoKhoa)} Khoa`
        : `${so(hocVu.SoTotNghiepDungHan)} / ${so(mauSo(hocVu.SoSvKhoaTotNghiep, hocVu.SoThoiHocKhoaTotNghiep))} SV · ${khoaTn}`,
    },
    {
      key: "canh-bao",
      nhan: "Cảnh báo học vụ",
      tyLe: hocVu.TyLeCanhBaoHocVu,
      phu: gop
        ? khoaCb
        : `${so(hocVu.SoSvBiCanhBao)} / ${so(mauSo(hocVu.SoSvKhoaCanhBao, hocVu.SoThoiHocKhoaCanhBao))} SV · ${khoaCb}`,
    },
  ];
  return chiSo.map((c) => (
    <KpiCard
      key={c.key}
      nhan={c.nhan}
      laChu={c.tyLe == null}
      giaTri={c.tyLe == null ? "Chưa có dữ liệu" : tyLe(c.tyLe)}
      phu={c.phu}
    />
  ));
};

export const HeroKpi = ({ nhan, xong, tong, donVi = "nhân sự", children }) => {
  const pt = phanTram(xong, tong);
  return (
    <div className="db-kpi db-hero">
      <span className="db-kpi-nhan">{nhan}</span>
      <div className="db-hero-line">
        <span className="db-hero-so">
          {pt == null ? "—" : `${pt.toLocaleString(VI)}%`}
        </span>
        <span className="db-hero-mau">
          {so(xong)} / {so(tong)} {donVi}
        </span>
      </div>
      <div
        className="db-bar"
        role="img"
        aria-label={`${nhan}: ${so(xong)} trên ${so(tong)} ${donVi}`}
      >
        <div className="db-bar-fill" style={{ width: `${pt || 0}%` }} />
      </div>
      {children}
    </div>
  );
};

export const KpiRow = ({ hero, children }) => {
  const the = React.Children.toArray(children);
  const coHero = Boolean(hero) && the.length > 0;
  return (
    <div
      className={`db-kpi-row${coHero ? " db-has-hero" : ""}`}
      style={coHero ? { "--db-kpi-con": the.length } : undefined}
    >
      {hero}
      {the}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Biểu đồ                                                             */
/* ------------------------------------------------------------------ */

export const StackBar = ({ segments, nhan }) => {
  const coSo = segments.filter((s) => Number(s.n) > 0);
  const moTa =
    nhan || segments.map((s) => `${s.nhan} ${so(s.n)}`).join(", ");
  return (
    <div
      className={`db-stack${coSo.length ? "" : " db-stack-empty"}`}
      role="img"
      aria-label={moTa}
    >
      {coSo.map((s, i) => (
        <div key={s.key ?? i} style={{ flex: `${s.n} 1 0px`, background: s.c }} />
      ))}
    </div>
  );
};

export const LegendInline = ({ items, nho = false }) => (
  <div className={`db-legend-inline${nho ? " is-small" : ""}`}>
    {items.map((l) => (
      <span key={l.key ?? l.nhan}>
        <span
          className={`db-swatch${nho ? " db-swatch-sm" : ""}`}
          style={{ background: l.c }}
        />
        {l.nhan}
        {l.n != null && <b className="db-num">{so(l.n)}</b>}
      </span>
    ))}
  </div>
);

export const XepLoaiBars = ({ rows }) => {
  const max = Math.max(1, ...rows.map((r) => Number(r.so) || 0));
  return (
    <div className="db-xl-list">
      {rows.map((r) => (
        <div className="db-xl-item" key={r.key}>
          <span className="db-xl-nhan">{r.nhan}</span>
          <div className="db-xl-line">
            <div
              className="db-xl-bar"
              style={{
                width: `${Math.round(((Number(r.so) || 0) * 85) / max)}%`,
                background: r.c,
              }}
            />
            <span className="db-xl-so">{so(r.so)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/** DemTheoXepLoai của server → hàng cho XepLoaiBars, mức thấp trước. */
export const hangXepLoaiNam = (rows) =>
  [...(rows || [])]
    .sort((a, b) => Number(a.MaXepLoai) - Number(b.MaXepLoai))
    .map((r) => ({
      key: r.MaXepLoai,
      nhan: r.XepLoaiText || XEP_LOAI_META[r.MaXepLoai]?.label || "Chưa có nhãn",
      so: Number(r.SoLuong) || 0,
      c: XL4[Number(r.MaXepLoai) - 1] || XL4[0],
    }));

/* ------------------------------------------------------------------ */
/* Tiến độ phiếu năm                                                   */
/* ------------------------------------------------------------------ */

const TRANG_THAI_NAM = [1, 2, 3, 4, 5];

export const TienDoPhieuNam = ({
  dem,
  nhanTrangThai,
  tongSoPhieu,
  theoLoai,
  title = "Tiến độ phiếu năm",
  meta,
  className,
  children,
}) => {
  const segs = TRANG_THAI_NAM.map((tt) => ({
    key: tt,
    n: dem.get(tt) || 0,
    c: RAMP5[tt - 1],
    nhan: nhanTrangThai(tt),
  }));
  return (
    <Card
      className={className}
      title={title}
      actions={
        <span className="db-card-meta">{meta || `${so(tongSoPhieu)} phiếu đã lập`}</span>
      }
    >
      <StackBar
        segments={segs}
        nhan={`Phiếu năm theo trạng thái: ${segs.map((s) => `${s.nhan} ${s.n}`).join(", ")}`}
      />
      <div className="db-legend-grid">
        {segs.map((s) => (
          <div className="db-legend-item" key={s.key}>
            <span className="db-legend-nhan">
              <span className="db-swatch" style={{ background: s.c }} />
              {s.nhan}
            </span>
            <span className="db-legend-so">{so(s.n)}</span>
          </div>
        ))}
      </div>
      {theoLoai?.length > 0 && (
        <>
          <div className="db-divider" />
          <div className="db-loai-list">
            {theoLoai.map((g) => {
              const nv = Number(g.SoNhanVien) || 0;
              const chuaLap = Number(g.SoChuaLapPhieu) || 0;
              const daLap = Math.max(nv - chuaLap, 0);
              const pt = phanTram(daLap, nv);
              return (
                <div className="db-loai-row" key={g.LoaiDoiTuong}>
                  <span className="db-loai-ten">{g.LoaiDoiTuongText}</span>
                  <div className="db-loai-bar">
                    <div className="db-bar db-bar-sm">
                      <div className="db-bar-fill" style={{ width: `${pt || 0}%` }} />
                    </div>
                    <span className="db-loai-cap">
                      Đã lập {so(daLap)} / {so(nv)} nhân sự
                      {pt != null && ` · ${tyLe(pt, 1)}`}
                    </span>
                  </div>
                  <span className="db-loai-so">
                    Chưa lập <b>{so(chuaLap)}</b>
                  </span>
                  <span className="db-loai-so">
                    Phiếu <b>{so(g.SoPhieu)}</b>
                  </span>
                  <span className="db-loai-so">
                    Hoàn tất <b>{so(g.SoHoanTat)}</b>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
      {children}
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Phiếu quý                                                           */
/* ------------------------------------------------------------------ */

/**
 * "Đã qua" chỉ khẳng định được khi biết quý hiện tại: thiếu QuyHienTai mà suy
 * từ DaDenQuy thì quý đang chạy cũng bị báo "chưa chốt dù quý đã qua".
 */
export const giaiDoanQuy = (row, quyHienTai) => {
  const q = Number(row.Quy);
  const hienTai = quyHienTai == null ? null : Number(quyHienTai);
  if (row.DaDenQuy === false || (hienTai != null && q > hienTai)) return "chua-den";
  if (hienTai != null && q === hienTai) return "hien-tai";
  if (hienTai != null && q < hienTai) return "da-qua";
  return "khong-ro";
};

const CHIP_QUY = {
  "chua-den": "Chưa đến",
  "hien-tai": "Quý hiện tại",
  "da-qua": "Đã qua",
};

export const segQuy = (r) => [
  { key: "chot", nhan: "Đã chốt", n: Number(r.SoDaChot) || 0, c: MAU_QUY.CHOT },
  { key: "cho", nhan: "Chờ duyệt", n: Number(r.SoChoDuyet) || 0, c: MAU_QUY.CHO },
  { key: "dang", nhan: "Đang chấm", n: Number(r.SoDangChamDiem) || 0, c: MAU_QUY.DANG },
  { key: "chua", nhan: "Chưa lập", n: Number(r.SoChuaLapPhieu) || 0, c: MAU_QUY.CHUA },
];

const canhBaoQuyDaQua = (r) => {
  const chuaLap = Number(r.SoChuaLapPhieu) || 0;
  const chuaChot = (Number(r.SoDangChamDiem) || 0) + (Number(r.SoChoDuyet) || 0);
  if (chuaLap && chuaChot)
    return `${so(chuaLap)} người chưa lập, ${so(chuaChot)} phiếu chưa chốt dù quý đã qua`;
  if (chuaLap) return `${so(chuaLap)} người chưa lập dù quý đã qua`;
  if (chuaChot) return `${so(chuaChot)} phiếu chưa chốt dù quý đã qua`;
  return null;
};

export const QuyCard = ({
  row,
  quyHienTai,
  nhanCho = "Chờ duyệt",
  nhanDang = "Đang chấm",
  xlDangThanh = false,
  onChuaLap,
}) => {
  const giaiDoan = giaiDoanQuy(row, quyHienTai);
  const chuaDen = giaiDoan === "chua-den";
  const segs = segQuy(row);
  const nhanDong = [
    "Đã chốt",
    nhanCho,
    nhanDang,
    chuaDen ? "Chưa lập (chưa đến quý)" : "Chưa lập",
  ];
  const canhBao = giaiDoan === "da-qua" ? canhBaoQuyDaQua(row) : null;
  const soChot = Number(row.SoDaChot) || 0;
  const xl = [...(row.DemTheoXepLoaiQuy || [])].sort(
    (a, b) => Number(a.MaXepLoai) - Number(b.MaXepLoai),
  );
  const xlMax = Math.max(1, ...xl.map((x) => Number(x.SoLuong) || 0));
  const chuaLap = Number(row.SoChuaLapPhieu) || 0;

  return (
    <article
      className={`db-quy${giaiDoan === "hien-tai" ? " is-current" : ""}${chuaDen ? " is-future" : ""}`}
    >
      <div className="db-quy-head">
        <h3 className="db-quy-ten">Quý {row.Quy}</h3>
        {CHIP_QUY[giaiDoan] && (
          <span className={`db-chip${giaiDoan === "hien-tai" ? " is-accent" : ""}`}>
            {CHIP_QUY[giaiDoan]}
          </span>
        )}
      </div>
      <StackBar
        segments={segs}
        nhan={`Quý ${row.Quy}: ${segs.map((s, i) => `${nhanDong[i].toLowerCase()} ${s.n}`).join(", ")}`}
      />
      <div className="db-quy-dong">
        {segs.map((s, i) => (
          <div className="db-quy-dong-row" key={s.key}>
            <span>
              <span className="db-swatch db-swatch-sm" style={{ background: s.c }} />
              {nhanDong[i]}
            </span>
            <span>{so(s.n)}</span>
          </div>
        ))}
      </div>
      {canhBao && <Alert nho>{canhBao}</Alert>}
      {onChuaLap && chuaLap > 0 && !chuaDen && (
        <button type="button" className="db-link-btn" onClick={() => onChuaLap({ quy: row.Quy })}>
          Xem danh sách quý {row.Quy}
        </button>
      )}
      {soChot > 0 && xl.length > 0 && (
        <div className="db-quy-xl">
          <span className="db-quy-xl-tieu-de">
            {xlDangThanh
              ? `Xếp loại quý · ${so(soChot)} phiếu đã chốt`
              : "Xếp loại quý (đã chốt)"}
          </span>
          {xl.map((x) => {
            const mau = XL3[Number(x.MaXepLoai) - 1] || XL3[0];
            const nhan = x.XepLoaiText || "Chưa có nhãn";
            return xlDangThanh ? (
              <div className="db-quy-xl-bar-row" key={x.MaXepLoai}>
                <span>{nhan}</span>
                <div className="db-xl-line">
                  <div
                    className="db-xl-bar"
                    style={{
                      width: `${Math.round(((Number(x.SoLuong) || 0) * 80) / xlMax)}%`,
                      background: mau,
                    }}
                  />
                  <span className="db-xl-so">{so(x.SoLuong)}</span>
                </div>
              </div>
            ) : (
              <div className="db-quy-xl-row" key={x.MaXepLoai}>
                <span>
                  <span className="db-swatch db-swatch-sm" style={{ background: mau }} />
                  {nhan}
                </span>
                <span>{so(x.SoLuong)}</span>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};

export const chuGiaiQuy = (nhanCho = "Chờ duyệt", nhanDang = "Đang chấm") => [
  { key: "chot", nhan: "Đã chốt", c: MAU_QUY.CHOT },
  { key: "cho", nhan: nhanCho, c: MAU_QUY.CHO },
  { key: "dang", nhan: nhanDang, c: MAU_QUY.DANG },
  { key: "chua", nhan: "Chưa lập", c: MAU_QUY.CHUA },
];

/** Tiến độ quý dạng gọn cho thư ký: mỗi quý một dòng. */
export const QuyCompact = ({ rows, quyHienTai }) => (
  <div className="db-quy-compact">
    {rows.map((r) => {
      const giaiDoan = giaiDoanQuy(r, quyHienTai);
      const nv = Number(r.SoNhanVien) || 0;
      const chot = Number(r.SoDaChot) || 0;
      const cho = Number(r.SoChoDuyet) || 0;
      const daLap = Math.max(nv - (Number(r.SoChuaLapPhieu) || 0), 0);
      const tomTat =
        giaiDoan === "chua-den"
          ? "Chưa đến quý"
          : chot >= nv && nv > 0
            ? `${so(chot)} / ${so(nv)} đã chốt`
            : giaiDoan === "hien-tai"
              ? `${so(daLap)} / ${so(nv)} đã lập`
              : `${so(chot)} đã chốt${cho ? ` · ${so(cho)} chờ duyệt` : ""}`;
      return (
        <div className="db-quy-compact-row" key={r.Quy}>
          <div className="db-quy-compact-head">
            <span>
              Quý {r.Quy}
              {giaiDoan === "hien-tai" && " · hiện tại"}
            </span>
            <span>{tomTat}</span>
          </div>
          <StackBar segments={segQuy(r)} nhan={`Quý ${r.Quy}: ${segQuy(r).map((s) => `${s.nhan.toLowerCase()} ${s.n}`).join(", ")}`} />
        </div>
      );
    })}
    <LegendInline items={chuGiaiQuy()} nho />
  </div>
);

/* ------------------------------------------------------------------ */
/* Phiếu năm của viên chức (lấy điểm từ quý)                           */
/* ------------------------------------------------------------------ */

/**
 * Tập con của phiếu năm - KHÔNG cộng thêm vào tổng phiếu. `choBan` đổi giọng câu
 * cảnh báo cho người trực tiếp duyệt (TK / TP) thay vì người theo dõi (HT).
 */
export const PhieuNamVienChucPanel = ({ data, choBan = false }) => {
  if (!data) return null;
  const segs = [
    { key: 0, nhan: "0 quý", n: Number(data.SoChuaChotQuyNao) || 0, c: XL3[0] },
    { key: 1, nhan: "1–3 quý", n: Number(data.SoChotChuaDuQuy) || 0, c: XL3[1] },
    { key: 2, nhan: "Đủ 4 quý", n: Number(data.SoChotDuBonQuy) || 0, c: XL3[2] },
  ];
  const biChan = Number(data.SoChoTkDuyetChuaChotQuy) || 0;
  const choDuyet = Number(data.SoChoTkDuyet) || 0;
  const chuaTongHop = Number(data.SoChuaTongHopQuy) || 0;
  const tongHopCu = Number(data.SoTongHopQuyCu) || 0;

  return (
    <aside className="db-aside" aria-label="Phiếu năm viên chức">
      <div className="db-card-head-text">
        <h3>Phiếu năm viên chức</h3>
        <span className="db-card-meta">
          {so(data.SoPhieu)} phiếu lấy điểm từ các quý · theo số quý đã chốt
        </span>
      </div>
      <StackBar
        segments={segs}
        nhan={`Theo số quý đã chốt: ${segs.map((s) => `${s.nhan} ${s.n}`).join(", ")}`}
      />
      <LegendInline items={segs} nho />
      <div className="db-alert-list">
        {biChan > 0 && (
          <Alert
            muc="danger"
            icon="chan"
            tieuDe={
              choBan
                ? `${so(biChan)} / ${so(choDuyet)} hồ sơ chờ bạn duyệt chưa duyệt được`
                : `${so(biChan)} hồ sơ chờ trưởng đơn vị chưa duyệt được`
            }
            moTa={
              choBan
                ? "Chưa chốt quý nào — hãy duyệt phiếu quý trước."
                : `Nằm trong ${so(choDuyet)} hồ sơ chờ trưởng đơn vị duyệt nhưng chưa chốt quý nào — hệ thống sẽ chặn khi chốt hồ sơ.`
            }
          />
        )}
        {chuaTongHop > 0 && (
          <Alert
            icon="dongHo"
            tieuDe={`${so(chuaTongHop)} phiếu chưa tổng hợp từ quý`}
            moTa={'Chưa chạy "Tổng hợp từ quý" cho phiếu năm.'}
          />
        )}
        {tongHopCu > 0 && (
          <Alert
            icon="lamMoi"
            tieuDe={`${so(tongHopCu)} phiếu tổng hợp đã cũ`}
            moTa="Có quý được chốt sau lần tổng hợp gần nhất — cần tổng hợp lại."
          />
        )}
      </div>
      <p className="db-note">
        Hồ sơ có 1–3 quý đã chốt vẫn chốt được, với kết quả chỉ từ các quý đó.
      </p>
    </aside>
  );
};

/* ------------------------------------------------------------------ */
/* Điểm trung bình phiếu hoàn tất                                      */
/* ------------------------------------------------------------------ */

const THANG_DIEM = 120;

export const DiemTrungBinhCard = ({ rows }) => (
  <Card
    flush
    title="Điểm trung bình phiếu hoàn tất"
    meta='Theo đơn vị con; phiếu gắn thẳng vào Khoa nằm ở dòng "Trực thuộc"'
    actions={
      <LegendInline
        items={[
          { key: "gv", nhan: "Giảng viên", c: "#2a78d6" },
          { key: "vc", nhan: "Viên chức / NLĐ", c: MAU_VIEN_CHUC },
        ]}
      />
    }
  >
    {rows.length === 0 ? (
      <p className="db-empty">
        Chưa có phiếu nào hoàn tất nên chưa tính được điểm trung bình.
      </p>
    ) : (
      <div className="db-table-wrap">
        <table className="db-table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Đơn vị</th>
              <th className="is-num">Số phiếu</th>
              <th className="is-num">TB chung (tham khảo)</th>
              <th className="is-num">Thấp – cao</th>
              <th>Điểm TB tách nhóm (thang 0–{THANG_DIEM})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const soGv = Number(r.SoPhieuGiangVien) || 0;
              const soVc = Number(r.SoPhieuVienChuc) || 0;
              const nhom = [
                { key: "gv", nhan: "Giảng viên", diem: r.DiemTrungBinhGiangVien, so: soGv, c: "#2a78d6" },
                { key: "vc", nhan: "Viên chức", diem: r.DiemTrungBinhVienChuc, so: soVc, c: MAU_VIEN_CHUC },
              ].filter((n) => n.diem != null);
              return (
                <tr key={r.IdDonVi}>
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      {r.TenDonVi || `Đơn vị #${r.IdDonVi}`}
                    </span>{" "}
                    {r.LaTrucThuoc && <span className="db-chip">Trực thuộc</span>}
                  </td>
                  <td className="is-num">{so(r.SoPhieu ?? soGv + soVc)}</td>
                  <td className="is-num">{diem(r.DiemTrungBinh)}</td>
                  <td className="is-num is-muted">
                    {r.DiemThapNhat == null
                      ? "—"
                      : `${diem(r.DiemThapNhat)} – ${diem(r.DiemCaoNhat)}`}
                  </td>
                  <td>
                    <div className="db-diem-nhom">
                      {nhom.length === 0 && <span className="db-muted">—</span>}
                      {nhom.map((n) => (
                        <div className="db-diem-nhom-row" key={n.key}>
                          <div
                            className="db-xl-bar"
                            style={{
                              width: `${Math.round((Math.min(Number(n.diem), THANG_DIEM) * 70) / THANG_DIEM)}%`,
                              background: n.c,
                            }}
                          />
                          <span>
                            <b>{diem(n.diem)}</b>{" "}
                            <span className="db-muted">
                              · {n.nhan} · {so(n.so)} phiếu
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
    <div className="db-card-note">
      <Alert muc="info" icon="thongTin" nho>
        Hai nhóm chấm theo hai bảng tiêu chí khác nhau (ngưỡng Hoàn thành tốt:
        giảng viên &gt; 100, viên chức ≥ 101) — không so sánh trực tiếp hai con số.
      </Alert>
    </div>
  </Card>
);

/** Gộp điểm TB của nhiều đơn vị con theo trọng số số phiếu. */
export const gopDiemTrungBinh = (rows) => {
  const gop = (khoaDiem, khoaSo) => {
    let tong = 0;
    let mau = 0;
    (rows || []).forEach((r) => {
      const n = Number(r[khoaSo]) || 0;
      if (r[khoaDiem] == null || n === 0) return;
      tong += Number(r[khoaDiem]) * n;
      mau += n;
    });
    return mau > 0 ? tong / mau : null;
  };
  const soPhieu = (r) =>
    r.SoPhieu ?? (Number(r.SoPhieuGiangVien) || 0) + (Number(r.SoPhieuVienChuc) || 0);
  const rowsCoSo = (rows || []).map((r) => ({ ...r, _SoPhieu: soPhieu(r) }));
  let tong = 0;
  let mau = 0;
  rowsCoSo.forEach((r) => {
    if (r.DiemTrungBinh == null || !r._SoPhieu) return;
    tong += Number(r.DiemTrungBinh) * r._SoPhieu;
    mau += r._SoPhieu;
  });
  return {
    chung: mau > 0 ? tong / mau : null,
    giangVien: gop("DiemTrungBinhGiangVien", "SoPhieuGiangVien"),
    vienChuc: gop("DiemTrungBinhVienChuc", "SoPhieuVienChuc"),
  };
};
