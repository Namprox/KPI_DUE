import React, { useEffect, useState } from "react";
import {
  fetchBaoCaoPhongTongQuan,
  fetchBaoCaoToanTruong,
  TRANG_THAI_META,
  XEP_LOAI_META,
} from "../../utils/phieuApi";
import { TRANG_THAI_CHUA_LAP_META } from "../../utils/chuaLapPhieu";
import { TRANG_THAI_DV_META } from "../../utils/phieuDonViApi";
import {
  TrangThaiDonViBadge,
  TrangThaiToTrinhBadge,
} from "./TrangThaiBadge";
import HocVuTongQuan from "./HocVuTongQuan";
import TienDoCham from "./TienDoCham";
import "../../css/CaNhan/TongQuanCapQuanLy.css";

const so = (value) => Number(value || 0).toLocaleString("vi-VN");
const tyLe = (value) =>
  value == null
    ? "Chưa có dữ liệu"
    : `${Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
const diem = (value) =>
  value == null
    ? "Chưa có điểm"
    : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

const TrangThaiPhieuDonViBaoCao = ({ trangThai }) => {
  if (![3, 4].includes(Number(trangThai))) {
    return <TrangThaiDonViBadge trangThai={trangThai} />;
  }
  const meta = TRANG_THAI_DV_META[trangThai];
  return (
    <span className="cd-status-badge" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
      <i className={`fa-solid ${meta.icon}`}></i>{" "}
      {Number(trangThai) === 3 ? "Chờ Trường duyệt" : "HT đã duyệt, chờ chốt"}
    </span>
  );
};

const MAU_O_ICON = {
  "chua-lap": { background: "#fdecec", color: "#b91c1c" },
  1: { background: "#eef0f6", color: "#565c74" },
  2: { background: "#fef3e0", color: "#b4680a" },
  3: { background: "#eef1fb", color: "#003399" },
  4: { background: "#eaf7ee", color: "#15803d" },
  5: { background: "#eef0f6", color: "#565c74" },
};

const TRANG_THAI_NAM = [
  [1, "Nháp", TRANG_THAI_META[1].icon],
  [2, "Đang thẩm định", TRANG_THAI_META[2].icon],
  [3, "Chờ trưởng đơn vị chốt", TRANG_THAI_META[3].icon],
  [4, "Trưởng đơn vị đã chốt", TRANG_THAI_META[4].icon],
  [5, "Hoàn tất", TRANG_THAI_META[5].icon],
];

const VIEC_CHO_HT = [
  ["SoToTrinhChoDuyet", "tờ trình chờ duyệt", "fa-file-signature", "#003399", "#eef1fb"],
  ["SoHoSoLanhDaoChoDuyet", "hồ sơ lãnh đạo chờ duyệt", "fa-user-check", "#b4680a", "#fef3e0"],
  ["SoPhieuDonViChoDuyet", "phiếu đơn vị chờ duyệt", "fa-building-circle-check", "#003399", "#eef1fb"],
  ["SoPhieuDonViChoChot", "phiếu đơn vị chờ chốt", "fa-clipboard-check", "#15803d", "#eaf7ee"],
];
const TEN_LOAI_DON_VI = { TRUONG: "Trường", KHOA: "Khoa", PHONG: "Phòng" };

const NhomSo = ({ label, value, icon, colorClass }) => {
  const valNum = Number(value || 0);
  return (
    <div className={`tqql-stat-cell ${valNum === 0 ? "is-zero" : "has-value"} ${colorClass || ""}`}>
      <div className="cd-meta-label">
        {icon && <i className={`fa-solid ${icon} tqql-cell-icon`}></i>}
        <span>{label}</span>
      </div>
      <div className="cd-meta-value">{so(value)}</div>
    </div>
  );
};

/** Phạm vi và phép gộp DonVi đều do API quyết định. */
const TongQuanCapQuanLy = ({ idNam, cap, reloadKey = 0, anThongKeTienDo = false }) => {
  const [baoCao, setBaoCao] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");
  const laToanTruong = cap === "truong";

  useEffect(() => {
    if (!idNam) return undefined;
    let active = true;
    setDangTai(true);
    setLoi("");
    setBaoCao(null);
    const request = laToanTruong
      ? fetchBaoCaoToanTruong({ idNam })
      : fetchBaoCaoPhongTongQuan({ idNam });
    request
      .then((item) => {
        if (!active) return;
        if (!item) throw new Error("Báo cáo chưa có dữ liệu");
        setBaoCao(item);
      })
      .catch((error) => {
        if (active) setLoi(error.message || "Không tải được tổng quan KPI");
      })
      .finally(() => {
        if (active) setDangTai(false);
      });
    return () => { active = false; };
  }, [idNam, laToanTruong, reloadKey]);

  const title = laToanTruong ? "TỔNG QUAN KPI TOÀN TRƯỜNG" : "TỔNG QUAN KPI PHÒNG";
  const tong = baoCao?.TongHop;
  const dem = new Map(
    (tong?.DemTheoTrangThai || []).map((row) => [Number(row.TrangThai), Number(row.SoLuong) || 0]),
  );
  const soPhieu = Number(tong?.TongSoPhieu) || 0;
  const soChuaLap = Number(tong?.SoChuaLapPhieu) || 0;
  const soHoanTat = dem.get(5) || 0;

  return (
    <section className="tqql" aria-label={title}>
      <div className="tqql-header-bar">
        <p className="sub-title tqk-title">
          <span className="tqql-title-text">
            <i className={`fa-solid ${laToanTruong ? "fa-school" : "fa-building-user"} tqql-title-icon`}></i>
            {title}
            {!laToanTruong && baoCao?.DonVi?.length === 1 &&
              ` - ${baoCao.DonVi[0].TenDonVi.toUpperCase()}`}
          </span>
        </p>
      </div>

      {dangTai && (
        <div className="modern-table-card"><div className="cd-empty">
          <i className="fa-solid fa-spinner fa-spin"></i> Đang tổng hợp số liệu KPI...
        </div></div>
      )}
      {loi && <div className="cd-canh-bao tqk-canh-bao"><i className="fa-solid fa-triangle-exclamation"></i> {loi}</div>}
      {baoCao && (
        <>
          {!anThongKeTienDo && (
            <div className="cd-phieu-header tqk-tien-do tqql-hero-progress">
              <div className="tqql-total-line">
                <span><strong>{so(tong?.SoNhanVien)}</strong> nhân viên theo đơn vị chính</span>
                <span><strong>{soPhieu}</strong> phiếu năm đã lập</span>
                <span><strong>{so(tong?.SoChoHtDuyet)}</strong> hồ sơ lãnh đạo chờ HT (trong số đã chốt)</span>
              </div>
              <TienDoCham
                nhan="Đã nộp trong số phiếu đã lập"
                xong={soPhieu - (dem.get(1) || 0)}
                tong={soPhieu}
              />
              <TienDoCham phu nhan="Hoàn tất phiếu năm" xong={soHoanTat} tong={soPhieu} />
            </div>
          )}

          <div className="stat-card-grid tqk-stat-grid tqql-pipeline-grid">
            {[["chua-lap", "Chưa lập phiếu", TRANG_THAI_CHUA_LAP_META.icon, soChuaLap],
              ...TRANG_THAI_NAM.map(([status, label, icon]) => [
                status,
                !laToanTruong && status === 3 ? "Chờ Trưởng phòng chốt" :
                  !laToanTruong && status === 4 ? "Trưởng phòng đã chốt" : label,
                icon,
                dem.get(status) || 0,
              ])]
              .map(([key, label, icon, value]) => {
                const valNum = Number(value || 0);
                return (
                  <div className={`stat-card ${valNum === 0 ? "stat-card-zero" : "stat-card-active"}`} key={key}>
                    <div className="stat-icon-box" style={MAU_O_ICON[key]}><i className={`fa-solid ${icon}`}></i></div>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value">{so(value)}</div>
                  </div>
                );
              })}
          </div>

          {laToanTruong && baoCao.ChoHieuTruong && (
            <div className="tqk-viec-list" aria-label="Việc chờ Hiệu trưởng">
              {VIEC_CHO_HT.map(([field, label, icon, color, background]) => (
                <div className="tqk-viec tqql-viec" key={field}>
                  <span className="tqk-viec-icon" style={{ color, background }}><i className={`fa-solid ${icon}`}></i></span>
                  <span className="tqk-viec-so" style={{ color }}>{so(baoCao.ChoHieuTruong[field])}</span>
                  <span className="tqk-viec-nhan">{label}</span>
                </div>
              ))}
            </div>
          )}

          {laToanTruong && <HocVuTongQuan hocVu={baoCao.HocVu} />}

          {baoCao.ApDungPhieuQuy && baoCao.PhieuQuy?.length > 0 && (
            <div className="tqql-section-wrapper">
              <div className="tqql-section-header">
                <p className="sub-title tqql-section-title">
                  <i className="fa-solid fa-chart-pie tqql-section-icon"></i>
                  TIẾN ĐỘ PHIẾU QUÝ
                </p>
              </div>
              <div className="tqql-quarter-grid">
                {baoCao.PhieuQuy.map((row) => (
                  <div className="cd-phieu-header tqk-goi tqql-quarter" key={row.Quy}>
                    <div className="tqql-quarter-head">
                      <div className="tqk-goi-ten">Quý {row.Quy}</div>
                      <span className="tqql-quarter-badge">
                        {so(row.SoDaChot)}/{so(row.SoNhanVien)} đã chốt
                      </span>
                    </div>
                    <div className="tqk-goi-phu">{so(row.SoNhanVien)} viên chức cần lập phiếu</div>
                    <div className="tqql-quarter-progress">
                      <TienDoCham nhan="Đã chốt phiếu" xong={row.SoDaChot} tong={row.SoNhanVien} />
                    </div>
                    <div className="cd-meta-grid tqk-meta-grid tqql-quarter-metrics">
                      <NhomSo label="Chưa lập" value={row.SoChuaLapPhieu} icon="fa-user-xmark" colorClass="dot-red" />
                      <NhomSo label="Đang chấm" value={row.SoDangChamDiem} icon="fa-pencil" colorClass="dot-amber" />
                      <NhomSo label="Chờ TP duyệt" value={row.SoChoDuyet} icon="fa-hourglass-half" colorClass="dot-blue" />
                      <NhomSo label="Đã chốt" value={row.SoDaChot} icon="fa-check-double" colorClass="dot-green" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="tqql-section-wrapper">
            <div className="tqql-section-header">
              <p className="sub-title tqql-section-title">
                <i className="fa-solid fa-sitemap tqql-section-icon"></i>
                ĐƠN VỊ ({so(baoCao.DonVi?.length)})
              </p>
            </div>
            {(baoCao.DonVi || []).map((row) => (
              <div className="cd-phieu-header tqk-goi tqql-unit" key={row.IdDonVi}>
                <div className="cd-phieu-top tqk-goi-top">
                  <div>
                    <div className="tqk-goi-ten">{row.TenDonVi}</div>
                    <div className="tqk-goi-phu">
                      <span className="tqql-unit-staff">{so(row.SoNhanVien)} nhân viên</span>
                      <span className="tqql-unit-sep"> · </span>
                      <span className={Number(row.SoChuaLapPhieu) > 0 ? "tqql-unit-chualap-warn" : ""}>
                        {so(row.SoChuaLapPhieu)} chưa lập phiếu
                      </span>
                    </div>
                  </div>
                  <span className="tqql-unit-type">{TEN_LOAI_DON_VI[row.LoaiDonVi] || row.LoaiDonVi}</span>
                </div>
                <div className="cd-meta-grid tqk-meta-grid tqql-unit-metrics">
                  <NhomSo label="Nháp" value={row.SoNhap} icon="fa-file-lines" colorClass="dot-gray" />
                  <NhomSo label="Đang thẩm định" value={row.SoThamDinh} icon="fa-clipboard-check" colorClass="dot-amber" />
                  <NhomSo label={row.LoaiDonVi === "PHONG" ? "Chờ Trưởng phòng chốt" : "Chờ trưởng đơn vị chốt"} value={row.SoChoTkDuyet} icon="fa-hourglass-half" colorClass="dot-blue" />
                  <NhomSo label={row.LoaiDonVi === "PHONG" ? "Trưởng phòng đã chốt" : "Trưởng đơn vị đã chốt"} value={row.SoTkDaDuyet} icon="fa-circle-check" colorClass="dot-teal" />
                  <NhomSo label="Hoàn tất" value={row.SoHoanTat} icon="fa-lock" colorClass="dot-green" />
                  <NhomSo label="Hồ sơ chờ HT (trong số đã chốt)" value={row.SoChoHtDuyet} icon="fa-building-circle-check" colorClass="dot-indigo" />
                </div>
                <div className="tqql-unit-bottom">
                  <div className="tqql-bottom-cell">
                    <span className="cd-meta-label">Phiếu đánh giá đơn vị</span>
                    {row.TrangThaiPhieuDv == null ? <span className="tq-placeholder">Chưa có phiếu</span> : <TrangThaiPhieuDonViBaoCao trangThai={row.TrangThaiPhieuDv} />}
                  </div>
                  {row.TongDiemPhieuDv != null && (
                    <div className="tqql-bottom-cell"><span className="cd-meta-label">Điểm phiếu đơn vị</span><strong>{diem(row.TongDiemPhieuDv)}</strong></div>
                  )}
                  {row.XepLoaiPhieuDv != null && (
                    <div className="tqql-bottom-cell">
                      <span className="cd-meta-label">Xếp loại đơn vị</span>
                      <span className={`rating-badge ${XEP_LOAI_META[row.XepLoaiPhieuDv]?.className || ""}`}>
                        {XEP_LOAI_META[row.XepLoaiPhieuDv]?.label || row.XepLoaiPhieuDv}
                      </span>
                    </div>
                  )}
                  <div className="tqql-bottom-cell">
                    <span className="cd-meta-label">Tờ trình</span>
                    {row.TrangThaiToTrinh == null ? <span className="tq-placeholder">Chưa có tờ trình</span> : <TrangThaiToTrinhBadge trangThai={row.TrangThaiToTrinh} />}
                  </div>
                  {laToanTruong && row.LoaiDonVi === "KHOA" && (
                    <>
                      <div className="tqql-bottom-cell"><span className="cd-meta-label">Tốt nghiệp đúng hạn</span><strong>{tyLe(row.TyLeTotNghiepDungHan)}</strong></div>
                      <div className="tqql-bottom-cell"><span className="cd-meta-label">Cảnh báo học vụ</span><strong>{tyLe(row.TyLeCanhBaoHocVu)}</strong></div>
                    </>
                  )}
                </div>
              </div>
            ))}
            {baoCao.DonVi?.length === 0 && <div className="modern-table-card cd-empty">Chưa có đơn vị trong phạm vi báo cáo.</div>}
          </div>

          <div className="cd-phieu-header tqk-goi tqql-xep-loai">
            <div className="tqk-goi-ten">
              <i className="fa-solid fa-award tqql-xl-title-icon"></i>
              Xếp loại phiếu hoàn tất
            </div>
            {baoCao.DemTheoXepLoai?.length > 0 ? (
              <div className="tqk-xl-list">
                {baoCao.DemTheoXepLoai.map((row) => (
                  <span className={`rating-badge ${XEP_LOAI_META[row.XepLoai]?.className || ""}`} key={row.XepLoai}>
                    {XEP_LOAI_META[row.XepLoai]?.label || row.XepLoai}: {so(row.SoLuong)}
                  </span>
                ))}
              </div>
            ) : (
              <div className="tqk-goi-phu tqql-xl-empty">
                <i className="fa-solid fa-circle-info"></i>
                <span>Chưa có phiếu hoàn tất được xếp loại.</span>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default TongQuanCapQuanLy;
