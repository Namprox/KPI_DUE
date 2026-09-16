import React, { useId } from "react";

/**
 * Ô diễn giải / ghi chú của một tiêu chí, kèm bộ đếm ký tự.
 *
 * `gioiHan` CHỈ để hiển thị và tô cảnh báo, KHÔNG cắt chuỗi: dữ liệu cũ có thể
 * dài hơn hạn mềm này và cắt đi là mất chữ của người dùng. Muốn chặn cứng thì
 * đặt `catCung` - lúc đó mới cắt lúc gõ.
 *
 * @param {string}   giaTri
 * @param {Function} onChange     nhận chuỗi mới
 * @param {boolean}  [doc]        chỉ đọc
 * @param {string}   [placeholder]
 * @param {number}   [gioiHan]    số ký tự khuyến nghị; bỏ trống thì ẩn bộ đếm
 * @param {boolean}  [catCung]    cắt chuỗi khi vượt `gioiHan`
 * @param {boolean}  [loi]        tô viền đỏ (form đang báo thiếu diễn giải)
 */
const ODienGiai = ({
  giaTri = "",
  onChange,
  doc = false,
  placeholder = "Nhập diễn giải (nếu có)",
  gioiHan = 500,
  catCung = false,
  loi = false,
}) => {
  const inputId = useId();
  const chuoi = giaTri || "";
  const quaDai = gioiHan > 0 && chuoi.length > gioiHan;

  return (
    <div className="pl2-textarea-wrap">
      <label className="pl2-field-label" htmlFor={inputId}>Diễn giải / ghi chú</label>
      <textarea
        id={inputId}
        className={`pl2-textarea ${loi ? "error" : ""}`}
        placeholder={placeholder}
        value={chuoi}
        disabled={doc}
        onChange={(e) => {
          const v = e.target.value;
          onChange(catCung && gioiHan > 0 ? v.slice(0, gioiHan) : v);
        }}
      />
      {gioiHan > 0 && (
        <div className={`pl2-textarea-count ${quaDai ? "qua-dai" : ""}`}>
          {chuoi.length} / {gioiHan}
        </div>
      )}
    </div>
  );
};

export default ODienGiai;
