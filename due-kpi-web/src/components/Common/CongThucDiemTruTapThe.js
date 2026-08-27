import React from "react";

/**
 * Chú giải công thức điểm trừ KPI tập thể, trình bày bám theo văn bản quy định:
 *
 *   Điểm trừ KPI tập thể được tính = 7,5 × (T / (0,2 × 15 × N))
 *
 * Trần 7,5 nằm ở dòng chú giải "điểm trừ tối đa của tập thể" đúng như văn bản,
 * còn phép cắt trần thực tế do máy chủ làm: MIN(7.5 * T / (0.2 * 15 * N), 7.5)
 * - xem sp_vi_pham_diem_tru_khoa trong docs/schema.sql.
 */

const KY_HIEU = [
  { ky_hieu: "T", y_nghia: "là tổng điểm trừ của cá nhân" },
  { ky_hieu: "N", y_nghia: "tổng số cá nhân của tập thể" },
  { ky_hieu: "7,5", y_nghia: "là điểm trừ tối đa của tập thể" },
  { ky_hieu: "15", y_nghia: "là điểm trừ tối đa của cá nhân" },
  { ky_hieu: "0,2", y_nghia: "là tỉ lệ giới hạn" },
];

const monoStyle = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

const CongThucDiemTruTapThe = ({ style }) => (
  <div
    style={{
      border: "1px solid #bfdbfe",
      borderRadius: "8px",
      overflow: "hidden",
      fontSize: "13px",
      color: "#1e40af",
      ...style,
    }}
  >
    <div
      style={{
        ...monoStyle,
        background: "#eff6ff",
        padding: "12px 16px",
        fontWeight: "700",
        textAlign: "center",
        borderBottom: "1px solid #bfdbfe",
      }}
    >
      Điểm trừ KPI tập thể được tính = 7,5 × (T / (0,2 × 15 × N))
    </div>

    <div style={{ display: "flex", background: "#fff" }}>
      <div
        style={{
          flex: "0 0 110px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px",
          borderRight: "1px solid #e2e8f0",
          fontStyle: "italic",
          color: "#475569",
        }}
      >
        Trong đó
      </div>
      <div style={{ flex: 1 }}>
        {KY_HIEU.map((dong, index) => (
          <div
            key={dong.ky_hieu}
            style={{
              padding: "8px 16px",
              color: "#334155",
              borderTop: index === 0 ? "none" : "1px solid #e2e8f0",
            }}
          >
            <span style={{ ...monoStyle, fontWeight: "700" }}>
              {dong.ky_hieu}
            </span>
            {`: ${dong.y_nghia}`}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default CongThucDiemTruTapThe;
