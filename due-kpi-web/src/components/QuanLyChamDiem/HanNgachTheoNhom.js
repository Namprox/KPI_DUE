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
            <td>{n.SoMauSo ?? "-"}</td>
            <td>{n.SoDat ?? "-"} / {n.HanNgach ?? "-"} suất</td>
          </tr>)}</tbody>
        </table>
      </div>
      {snapshotHanNgachDaDoi(goi) && <p className="cd-canh-bao">Số liệu đã thay đổi, cần đóng gói lại.</p>}
      <details className="cd-chot-luu-y">
        <summary>Cách xét suất xuất sắc</summary>
        <div className="cd-chot-luu-y-than">
          <ul>
            <li><strong>Giảng viên:</strong> Đáp ứng các điều kiện Hoàn thành tốt nhiệm vụ; thuộc Top 20% giảng viên Hoàn thành tốt nhiệm vụ có tổng điểm tích lũy cao nhất; đồng thời đáp ứng điều kiện hoàn thành xuất sắc nhiệm vụ khoa học công nghệ theo Quyết định số 838/QĐ-ĐHKT ngày 25/02/2026.</li>
            <li><strong>Viên chức / người lao động:</strong> Tổng điểm tích lũy từ 101 điểm trở lên và thuộc nhóm 20% có điểm tích lũy cao nhất, xếp theo thứ tự từ cao xuống thấp.</li>
            <li><strong>Cán bộ quản lý:</strong> Tỷ lệ xếp loại Hoàn thành xuất sắc nhiệm vụ không vượt quá 20% đối với nhóm viên chức quản lý.</li>
            <li><strong>Người đứng đầu đơn vị:</strong> Được xem xét xếp loại Hoàn thành xuất sắc nhiệm vụ khi đơn vị đạt mức này, trên cơ sở đáp ứng đầy đủ các điều kiện, tiêu chuẩn về giảng dạy, nghiên cứu khoa học và các nhiệm vụ khác được giao.</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
