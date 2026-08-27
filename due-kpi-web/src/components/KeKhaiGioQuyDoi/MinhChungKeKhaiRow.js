import React from "react";
import { formatKb } from "../../utils/keKhaiGioQuyDoiApi";
import { formatNgayGio } from "../../utils/phieuApi";

/**
 * Một tệp minh chứng gắn vào MỘT dòng kê khai giờ quy đổi.
 *
 * Song song với MinhChungNvkRow nhưng khoá theo `IdMinhChungKk` và đi endpoint
 * riêng của module - hai module không dùng chung bảng minh chứng nên đừng gộp.
 *
 * Module chỉ nhận PDF (server kiểm cả đuôi file lẫn chữ ký `%PDF-`) nên không có
 * nhánh "định dạng không xem trước được".
 *
 * @param {object}   mc
 * @param {Function} onXem
 * @param {Function} onTai
 * @param {Function} [onXoa] bỏ trống = ẩn nút gỡ (chỉ đọc)
 * @param {boolean}  [dangXoa]
 */
const MinhChungKeKhaiRow = ({ mc, onXem, onTai, onXoa, dangXoa = false }) => {
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
        <div className="cd-mc-meta">{meta || "-"}</div>
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
          className="cd-mc-act kkq-mc-xoa"
          onClick={() => onXoa(mc)}
          disabled={dangXoa}
          title="Gỡ tệp khỏi dòng kê khai"
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

export default MinhChungKeKhaiRow;
