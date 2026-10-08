import React from "react";
import { GHI_CHU_DIEN_GIAI, NHOM_DINH_MUC, NHOM_GIO_THUC_HIEN, moTaDienGiai } from "../../utils/gioGiangDienGiai";
import { CANH_BAO_GIO_GIANG, LY_DO_GIO_GIANG, mauDiemGioGiang, soGioGiang as so } from "../../utils/gioGiangTyLe";

export function CanhBaoChuaAnhXa({ count }) {
  return count > 0 ? <div className="ggtk-alert" role="status">Còn {count} dòng TKB chưa ánh xạ, số liệu giờ giảng chưa đầy đủ.</div> : null;
}

export function LyDoCanhBaoGioGiang({ row }) {
  return <div className="ggtl-notices">
    {row.LyDo && <span className="ggtk-badge is-info">{LY_DO_GIO_GIANG[row.LyDo] || row.LyDo}</span>}
    {(row.CanhBao || "").split(";").map((code) => code.trim()).filter(Boolean).map((code, index) =>
      <span className="ggtk-badge is-warning" key={`${code}-${index}`}>{CANH_BAO_GIO_GIANG[code] || code}</span>)}
  </div>;
}

export function TyLeGioGiang({ row }) {
  return <span className={`ggtk-badge ${mauDiemGioGiang(row)}`}>
    {row.TyLeHoanThanh == null ? "—" : `${so(row.TyLeHoanThanh, true)}%`}
  </span>;
}

export function DiemGioGiang({ row }) {
  return <>{row.DiemDuKien == null ? "Không chấm tự động" : `${so(row.DiemDuKien)} / ${so(row.DiemToiDa)}`}</>;
}

export function GiaiTrinhGioGiang({ row, dienGiai, onViewTkb }) {
  const items = (Array.isArray(dienGiai) ? dienGiai : []).filter((item) => item.IdNhanVien === row.IdNhanVien);
  const known = [...NHOM_DINH_MUC, ...NHOM_GIO_THUC_HIEN].map(([code]) => code);
  const unknown = [...new Set(items.map((item) => item.KhoanMuc))].filter((code) => !known.includes(code));
  const group = ([code, label, field]) => {
    if (code === "DIEU_CHINH_SAN_0") return null;
    const children = items.filter((item) => item.KhoanMuc === code);
    if (row[field] === 0 && !children.length) return null;
    if (row[field] == null && !children.length && code !== "DINH_MUC_GOC") return null;
    return <React.Fragment key={code}>
      <tr className="ggtl-group"><th colSpan={2} scope="row">{label}</th><td className="ggtk-number"><strong>{so(row[field])}</strong></td></tr>
      {children.map((item, index) => <tr key={`${item.ThuTu}-${index}`}>
        <td><div className="ggtl-description">{moTaDienGiai(item, row) || "—"}</div>
          <div className="ggtl-notes">{(item.GhiChu || "").split(";").map((code) => code.trim()).filter((code) => code && code !== "DO_THEO_NGAY").map((code, i) => <small key={`${code}-${i}`}>{GHI_CHU_DIEN_GIAI[code] || code}</small>)}</div>
          {item.KhoanMuc === "GIO_TKB" && item.IdGioGiangTkb != null && onViewTkb && <button type="button" className="btn-cancel" onClick={() => onViewTkb({ IdGioGiangTkb: item.IdGioGiangTkb, HoTen: row.HoTen, TenKhoa: row.TenDonVi })}>Xem chi tiết lớp TKB</button>}
        </td>
        <td className="ggtl-formula">{item.CongThuc || "—"}</td><td className="ggtk-number">{so(item.SoGio)}</td>
      </tr>)}
    </React.Fragment>;
  };
  return <div className="ggtl-detail">
    <LyDoCanhBaoGioGiang row={row} />
    {!items.length && <p className="ggtk-field-help">Chưa có diễn giải chi tiết. Các tổng dưới đây do hệ thống cung cấp.</p>}
    <p className="ggtk-field-help">Số tháng miễn / số tháng của năm: {so(row.SoThangMien)} / {so(row.SoThangNam)}</p>
    <div className="table-scroll"><table className="custom-table ggtl-explanation-table">
      <caption>Giải trình định mức và giờ thực hiện</caption>
      <thead><tr><th>Khoản mục / diễn giải</th><th>Cách tính</th><th className="ggtk-number">Số giờ</th></tr></thead>
      <tbody>
        {NHOM_DINH_MUC.map(group)}
        <tr className="ggtl-result"><th colSpan={2} scope="row">Định mức áp dụng</th><td className="ggtk-number"><strong>{so(row.DinhMucApDung)}</strong></td></tr>
        {NHOM_GIO_THUC_HIEN.map(group)}
        {unknown.map((code) => group([code, code, ""]))}
        <tr className="ggtl-result"><th colSpan={2} scope="row">Tổng giờ thực hiện</th><td className="ggtk-number"><strong>{so(row.TongGio)}</strong></td></tr>
      </tbody>
    </table></div>
  </div>;
}
