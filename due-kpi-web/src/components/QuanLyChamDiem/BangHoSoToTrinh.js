import React from "react";
import {
  formatDiem,
  LOAI_DOI_TUONG,
  TEN_MUC_QD838,
} from "../../utils/phieuApi";
import { XepLoaiBadge, XepLoaiKhoaBadge } from "./TrangThaiBadge";

/**
 * Bảng hồ sơ trong một gói KPI Khoa - dùng chung cho màn hình của Trưởng khoa
 * (đóng gói / trình) và của Hiệu trưởng (duyệt / trả lại).
 *
 * Cột "Mức Khoa chọn" và "Xếp loại cuối" cố ý đứng cạnh nhau: chúng khác nhau
 * đúng ở những người được hạn ngạch nâng lên mức 4, và đó là thông tin người
 * duyệt cần thấy ngay.
 *
 * `hanNgach` dùng để kẻ vạch ranh giới suất xuất sắc. Vạch được đặt sau người
 * thứ `hanNgach` TRONG SỐ NHỮNG NGƯỜI ĐỦ ĐIỀU KIỆN TRANH SUẤT, không phải sau
 * dòng thứ `hanNgach` của bảng - người điểm cao nhưng không đạt QĐ 838 bị bỏ
 * qua và suất dồn xuống người kế tiếp.
 */
const BangHoSoToTrinh = ({
  hoSo = [],
  hanNgach = null,
  chonDuoc = false,
  daChon = [],
  onDoiChon,
  ghiChuCot,
}) => {
  if (!hoSo.length) {
    return (
      <div className="cd-empty">
        <i className="fa-solid fa-list"></i>
        Chưa có hồ sơ nào trong gói.
      </div>
    );
  }

  // Đếm dồn số người đủ điều kiện đã gặp để biết đặt vạch hạn ngạch ở đâu.
  let daDuyetDuDieuKien = 0;

  const trangThaiHoSo = (h) => {
    const trangThai = Number(h.TrangThai);
    if (trangThai === 5 && h.CanHtDuyet === false) {
      return { nhan: "Hoàn tất (TK duyệt)", mau: "#047857", icon: "fa-circle-check" };
    }
    if (trangThai === 5 && h.CanHtDuyet === true) {
      return { nhan: "Hoàn tất (HT duyệt)", mau: "#047857", icon: "fa-circle-check" };
    }
    if (trangThai === 5) {
      return { nhan: "Hoàn tất", mau: "#047857", icon: "fa-circle-check" };
    }
    if (trangThai === 4 && h.CanHtDuyet === true) {
      return { nhan: "Chờ Hiệu trưởng", mau: "#1d4ed8", icon: "fa-hourglass-half" };
    }
    if (trangThai === 4 && h.CanHtDuyet === false) {
      return {
        nhan: "Dữ liệu cũ - cần đóng gói lại",
        mau: "#b45309",
        icon: "fa-triangle-exclamation",
        title:
          "Hồ sơ từ quy trình cũ — Trưởng khoa cần đóng gói lại tờ trình để hoàn tất.",
      };
    }
    return { nhan: "Chưa chốt", mau: "#64748b", icon: "fa-clock" };
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="custom-table" style={{ minWidth: "1160px" }}>
        <thead>
          <tr>
            {chonDuoc && <th style={{ width: "44px" }}></th>}
            <th style={{ width: "8%", textAlign: "center" }}>Hạng</th>
            <th style={{ width: "26%" }}>Giảng viên</th>
            <th style={{ width: "12%", textAlign: "right" }}>Tổng tích lũy</th>
            <th style={{ width: "12%" }}>QĐ 838</th>
            <th style={{ width: "16%" }}>Mức Khoa chọn</th>
            <th style={{ width: "16%" }}>Xếp loại cuối</th>
            <th style={{ width: "18%" }}>Trạng thái</th>
            {ghiChuCot && <th style={{ width: "14%" }}>{ghiChuCot}</th>}
          </tr>
        </thead>
        <tbody>
          {hoSo.map((h) => {
            const vienChuc =
              Number(h.LoaiDoiTuong) === LOAI_DOI_TUONG.VIEN_CHUC;
            const duDieuKien = h.DuDieuKienXuatSac === true;
            if (duDieuKien) daDuyetDuDieuKien += 1;
            const laVachHanNgach =
              hanNgach != null && duDieuKien && daDuyetDuDieuKien === hanNgach;
            const daNangXuatSac = Number(h.XepLoai) === 4;
            const trangThai = trangThaiHoSo(h);
            const duocChonTraVe = Number(h.TrangThai) === 4;

            return (
              <tr
                key={h.IdPhieu}
                className={[
                  daNangXuatSac ? "cd-row-xuat-sac" : "",
                  laVachHanNgach ? "cd-row-vach-han-ngach" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {chonDuoc && (
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={daChon.includes(h.IdPhieu)}
                      disabled={!duocChonTraVe}
                      title={
                        duocChonTraVe
                          ? "Chọn hồ sơ để trả về"
                          : "Hồ sơ đã hoàn tất; muốn sửa phải dùng chức năng mở lại"
                      }
                      onChange={() => onDoiChon(h.IdPhieu)}
                    />
                  </td>
                )}
                <td
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#475569",
                  }}
                >
                  {h.HangTrongKhoa ?? "-"}
                </td>
                <td>
                  <b style={{ color: "#0f172a", display: "block" }}>
                    {h.HoTen}
                  </b>
                  {h.MaNhanVien && (
                    <span className="code-pill">{h.MaNhanVien}</span>
                  )}
                  {vienChuc && (
                    <span
                      className="tag-badge"
                      title="Viên chức / người lao động: không tính vào mẫu số hạn ngạch và không tranh suất"
                    >
                      Viên chức / NLĐ
                    </span>
                  )}
                  {h.UuTienXuatSac && (
                    <span
                      className="tag-badge"
                      style={{ background: "#fef3c7", color: "#92400e" }}
                      title="Trưởng khoa đã chỉ định người này nhận suất xuất sắc cuối cùng"
                    >
                      <i className="fa-solid fa-star"></i> Được ưu tiên
                    </span>
                  )}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: "#1d4ed8",
                  }}
                >
                  {formatDiem(h.TongDiemTichLuy)}
                </td>
                <td style={{ fontSize: "13px", color: "#475569" }}>
                  {h.MucNckhcnQd838 == null
                    ? "-"
                    : TEN_MUC_QD838[h.MucNckhcnQd838]}
                </td>
                <td>
                  <XepLoaiKhoaBadge xepLoaiKhoa={h.XepLoaiKhoa} />
                </td>
                <td>
                  <XepLoaiBadge xepLoai={h.XepLoai} />
                </td>
                <td>
                  <span
                    title={trangThai.title}
                    style={{ color: trangThai.mau, fontSize: "12px", fontWeight: 600 }}
                  >
                    <i className={`fa-solid ${trangThai.icon}`}></i> {trangThai.nhan}
                  </span>
                </td>
                {ghiChuCot && (
                  <td style={{ fontSize: "12px", color: "#64748b" }}>
                    {h.LyDoHtTraVe || h.LyDoXepLoai || "-"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {hanNgach != null && (
        <div className="cd-hint" style={{ padding: "10px 20px" }}>
          <i className="fa-solid fa-circle-info"></i> Đường kẻ đậm là ranh giới{" "}
          <b>{hanNgach}</b> suất xuất sắc. Chỉ người vừa được Khoa xếp mức 3 vừa
          đạt QĐ 838 mức 2 mới tranh suất; ai không đạt sẽ bị bỏ qua và suất dồn
          cho người kế tiếp.
        </div>
      )}
    </div>
  );
};

export default BangHoSoToTrinh;
