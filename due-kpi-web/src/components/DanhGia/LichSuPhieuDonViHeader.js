import React from "react";
import { Link } from "react-router-dom";
import { cauHinhKpiDonVi } from "../../utils/kpiDonViWorkspace";
import { formatNgayGio } from "../../utils/phieuApi";

export default function LichSuPhieuDonViHeader({ phieu, loai, coTheDanhGia }) {
  const config = cauHinhKpiDonVi(loai);
  return <div className="modern-table-card" style={{ padding: 16, marginBottom: 16 }}>
    <p style={{ marginTop: 0 }}>Bạn đang xem lịch sử đánh giá (chỉ đọc).</p>
    {coTheDanhGia && <Link className="cd-link-btn" to={`${config.danhGia}?${new URLSearchParams({ idNam: phieu.IdNam, idDonVi: phieu.IdDonVi })}`}>Chuyển sang trang đánh giá</Link>}
    {!!phieu.PheDuyet?.length && <details style={{ marginTop: 12 }}><summary>Thông tin phê duyệt</summary>
      <ul>{phieu.PheDuyet.map((p, i) => <li key={p.IdPheDuyet ?? i}>
        Lần {p.LanDanhGia} · Cấp duyệt {p.CapDuyet} · {formatNgayGio(p.NgayDuyet || p.NgayTao)}
        {p.NhanXet ? ` · ${p.NhanXet}` : ""}{p.LyDoTuChoi ? ` · ${p.LyDoTuChoi}` : ""}
      </li>)}</ul>
    </details>}
  </div>;
}
