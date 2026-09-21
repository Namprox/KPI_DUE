import React from "react";
import { laGoiLegacy, nhomHanNgachHienThi, TEN_NHOM_XEP_HANG } from "../../utils/hanNgachXuatSac";
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
 * Hạng và ranh giới Top thuộc từng nhóm; dữ liệu legacy giữ hạng cũ.
 */
const BangHoSoToTrinh = ({
  hoSo = [],
  hanNgach = null,
  goi,
  hangTheoNhom = false,
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

  if (goi && !laGoiLegacy(goi)) {
    const nhom = nhomHanNgachHienThi(goi);
    const cotNhom = goi.NgayDongGoi == null ? "NhomHienTai" : "NhomXepHang";
    const ids = [...new Set(hoSo.map((h) => h[cotNhom] == null ? "unknown" : Number(h[cotNhom])))];
    return ids.sort((a, b) => a - b).map((id) => {
      const n = nhom.find((x) => Number(x.Nhom) === id);
      return <section key={id}>
        <h4 style={{ padding: "12px 20px", margin: 0 }}>{n?.TenNhom || TEN_NHOM_XEP_HANG[id] || "Chưa có thông tin nhóm"}</h4>
        <BangHoSoToTrinh
          hoSo={hoSo.filter((h) => (h[cotNhom] == null ? "unknown" : Number(h[cotNhom])) === id)
            .sort((a, b) => (a.HangTrongKhoa ?? Infinity) - (b.HangTrongKhoa ?? Infinity))}
          hanNgach={n?.HanNgach ?? null} hangTheoNhom
          chonDuoc={chonDuoc} daChon={daChon} onDoiChon={onDoiChon} ghiChuCot={ghiChuCot}
        />
      </section>;
    });
  }

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
            <th style={{ width: "8%", textAlign: "center" }}>{hangTheoNhom ? "Hạng trong nhóm" : "Hạng (quy tắc cũ)"}</th>
            <th style={{ width: "26%" }}>Họ tên</th>
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
            const laVachHanNgach = hangTheoNhom && Number(hanNgach) > 0 && Number(h.HangTrongKhoa) === Number(hanNgach);
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
                      title="Viên chức / người lao động"
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

      {hangTheoNhom && hanNgach != null && (
        <div className="cd-hint" style={{ padding: "10px 20px" }}>
          Top {hanNgach} của nhóm được xét điều kiện xuất sắc. Suất bỏ trống không dồn xuống người kế tiếp.
        </div>
      )}
    </div>
  );
};

export default BangHoSoToTrinh;
