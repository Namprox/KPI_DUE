import React from "react";
import "../../css/NhiemVuKhoa.css";
import { formatKb } from "../../utils/nhiemVuKhoaApi";
import { formatNgayGio } from "../../utils/phieuApi";

/**
 * Một tệp minh chứng của module nhiệm vụ phục vụ cộng đồng.
 *
 * Dùng chung cho CẢ HAI cấp gán (`CapGan = 1` cấp nhiệm vụ, `= 2` cấp phản hồi)
 * vì hai cấp đi chung một endpoint tải về và cùng một luồng upload — khác biệt
 * duy nhất là ai được xoá, và điều đó do bên gọi quyết định qua `onXoa`.
 *
 * Module chỉ nhận PDF (server kiểm cả đuôi file lẫn chữ ký `%PDF-`) nên không có
 * nhánh "định dạng không xem trước được" như minh chứng của phiếu đánh giá.
 *
 * @param {object}   mc
 * @param {Function} onXem
 * @param {Function} onTai
 * @param {Function} [onXoa] bỏ trống = ẩn nút xoá (chỉ đọc)
 * @param {boolean}  [dangXoa]
 */
const MinhChungNvkRow = ({ mc, onXem, onTai, onXoa, dangXoa = false }) => {
  const nhan = mc.TenHienThi || mc.TenFileGoc || "Tệp minh chứng";
  const meta = [
    mc.KichThuocKb != null ? formatKb(mc.KichThuocKb) : null,
    mc.TenNguoiTaiLen || null,
    mc.NgayTaiLen ? formatNgayGio(mc.NgayTaiLen) : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="cd-mc-row">
      <i
        className="fa-solid fa-file-pdf cd-mc-icon"
        style={{ color: "#dc2626" }}
      ></i>
      <div className="cd-mc-main">
        <button
          type="button"
          className="cd-mc-name"
          onClick={() => onXem(mc)}
          title={`Xem trước: ${nhan}`}
        >
          {nhan}
        </button>
        <div className="cd-mc-meta">{meta || "—"}</div>
      </div>
      <button
        type="button"
        className="cd-mc-act"
        onClick={() => onXem(mc)}
        title="Xem trước tệp"
      >
        <i className="fa-solid fa-eye"></i> Xem
      </button>
      <button
        type="button"
        className="cd-mc-act"
        onClick={() => onTai(mc)}
        title="Tải tệp về máy"
      >
        <i className="fa-solid fa-download"></i> Tải về
      </button>
      {onXoa && (
        <button
          type="button"
          className="cd-mc-act nvk-mc-xoa"
          onClick={() => onXoa(mc)}
          disabled={dangXoa}
          title="Gỡ tệp khỏi nhiệm vụ"
        >
          <i
            className={`fa-solid ${dangXoa ? "fa-spinner fa-spin" : "fa-trash"}`}
          ></i>{" "}
          Gỡ
        </button>
      )}
    </div>
  );
};

export default MinhChungNvkRow;
