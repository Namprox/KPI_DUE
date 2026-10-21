import React from "react";
import { formatDiem, formatNgayGio } from "../../utils/phieuApi";
import { diemHienThiTuDong, thoiDiemGhiDiemTuDong } from "../../utils/diemTuDongPhieu";
import "../../css/DanhGia/PhieuTuDong.css";

export default function DiemTuDongStatus({ info }) {
  if (!info?.TuDongTheoPhieu) return null;
  const { duKien } = diemHienThiTuDong(info);
  const thoiDiem = thoiDiemGhiDiemTuDong(info);
  return <div className="phieu-auto-status">
    {duKien && <p>Điểm dự kiến, chưa được ghi vào phiếu.{thoiDiem ? ` ${thoiDiem}` : ""}</p>}
    {info.NgayTuDong && <p>Đã tổng hợp: {formatNgayGio(info.NgayTuDong)}</p>}
    {info.CanChamLai === true && <div className="phieu-auto-warning" role="status">
      <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      <div>
        <p>Dữ liệu nguồn đã thay đổi - điểm mới sẽ là {formatDiem(info.DiemTuDong)} điểm khi được chấm lại.</p>
        {thoiDiem && <p>{thoiDiem}</p>}
        <p>Minh chứng hiển thị phản ánh dữ liệu nguồn hiện tại.</p>
      </div>
    </div>}
  </div>;
}
