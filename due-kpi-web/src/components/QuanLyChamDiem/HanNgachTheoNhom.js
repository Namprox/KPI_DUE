import React from "react";
import { nhomHanNgachHienThi, snapshotHanNgachDaDoi, TEN_NHOM_XEP_HANG } from "../../utils/hanNgachXuatSac";

export default function HanNgachTheoNhom({ goi }) {
  const nhom = nhomHanNgachHienThi(goi);
  if (!nhom.length) return null;
  const xemTruoc = goi.NgayDongGoi == null;
  return (
    <div className="cd-box" style={{ marginTop: 16 }}>
      <div className="cd-box-title">Hạn ngạch theo nhóm {xemTruoc ? "(dự kiến)" : "(lần đóng gói gần nhất)"}</div>
      <div style={{ overflowX: "auto" }}>
        <table className="custom-table">
          <thead><tr><th>Nhóm</th><th>Mẫu số</th><th>Đạt / hạn ngạch</th></tr></thead>
          <tbody>{nhom.map((n) => <tr key={n.Nhom}>
            <td>{n.TenNhom || TEN_NHOM_XEP_HANG[n.Nhom]}</td>
            <td>{n.SoMauSo ?? "—"}</td>
            <td>{n.SoDat ?? "—"} / {n.HanNgach ?? "—"} suất</td>
          </tr>)}</tbody>
        </table>
      </div>
      {snapshotHanNgachDaDoi(goi) && <p className="cd-canh-bao">Số liệu đã thay đổi, cần đóng gói lại.</p>}
      <details className="cd-chot-luu-y">
        <summary>Cách xét suất xuất sắc</summary>
        <p>Giảng viên dùng số người mức 3 làm mẫu số; viên chức / NLĐ và cán bộ quản lý dùng tổng số người của nhóm. Tỷ lệ cố định 20%, mẫu số lớn hơn 0 có tối thiểu 1 suất.</p>
        <p>Xếp Top trước, xét điều kiện sau. Người trong Top chưa đủ điều kiện để lại suất bỏ trống; suất không dồn xuống người kế tiếp. Đủ điều kiện chưa bảo đảm đạt xuất sắc.</p>
      </details>
    </div>
  );
}
