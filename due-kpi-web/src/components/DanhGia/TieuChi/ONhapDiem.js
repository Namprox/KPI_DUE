import React from "react";

/**
 * Ô nhập điểm cho tiêu chí thang LIÊN TỤC (LoaiThangDiem = 2), dùng chung cho
 * cả 4 phiếu KPI.
 *
 * Ô nhập và hậu tố "/ tối đa" nằm chung một khung viền để người chấm luôn thấy
 * trần điểm ngay cạnh con số mình gõ; kèm hai nút đặt nhanh và một dòng
 * gợi ý/cảnh báo.
 *
 * KHÔNG tự kẹp giá trị về [0, diemToiDa]. Việc kẹp thuộc về form (mỗi phiếu kẹp
 * ở một chỗ khác nhau); ở đây chỉ báo đỏ để người dùng biết mình gõ sai.
 *
 * @param {string|number} giaTri  giá trị đang hiển thị ("" nghĩa là chưa nhập)
 * @param {number}   diemToiDa    trần điểm của tiêu chí
 * @param {boolean}  [doc]        chỉ đọc (không còn quyền chấm)
 * @param {Function} onChange     nhận chuỗi thô người dùng gõ
 * @param {string}   [goiY]       dòng gợi ý khi không có lỗi
 */
const ONhapDiem = ({
  giaTri,
  diemToiDa,
  doc = false,
  onChange,
  goiY = "Nhập số thập phân, ví dụ 17.5",
}) => {
  const chuoi = giaTri === null || giaTri === undefined ? "" : String(giaTri);
  const so = chuoi.trim() === "" ? null : Number(chuoi);
  const khongHopLe = so !== null && Number.isNaN(so);
  const vuotTran = so !== null && !Number.isNaN(so) && so > diemToiDa;
  const amSo = so !== null && !Number.isNaN(so) && so < 0;
  const loi = khongHopLe || vuotTran || amSo;

  const thongBao = vuotTran
    ? `Điểm vượt quá mức tối đa ${diemToiDa}`
    : amSo
      ? "Điểm không được nhỏ hơn 0"
      : khongHopLe
        ? "Điểm không hợp lệ"
        : goiY;

  const dat = (v) => {
    if (doc) return;
    onChange(String(v));
  };

  return (
    <div className="pl2-score-wrap">
      <div className="pl2-field-label">Điểm chấm</div>
      <div className="pl2-score-row">
        <div
          className={`pl2-score-box ${loi ? "loi" : ""} ${doc ? "khoa" : ""}`}
        >
          <input
            type="number"
            className="pl2-score-input"
            inputMode="decimal"
            placeholder="0"
            step="any"
            min="0"
            max={diemToiDa}
            value={chuoi}
            disabled={doc}
            aria-label="Điểm chấm cho tiêu chí"
            onChange={(e) => {
              if (doc) return;
              onChange(e.target.value);
            }}
          />
          <span className="pl2-score-suffix">/ {diemToiDa}</span>
        </div>

        <button
          type="button"
          className="pl2-score-quick"
          disabled={doc}
          onClick={() => dat(diemToiDa)}
        >
          Điểm tối đa
        </button>
        <button
          type="button"
          className="pl2-score-quick"
          disabled={doc}
          onClick={() => dat(0)}
        >
          0 điểm
        </button>
      </div>

      <div className={`pl2-score-hint ${loi ? "loi" : ""}`}>{thongBao}</div>
    </div>
  );
};

export default ONhapDiem;
