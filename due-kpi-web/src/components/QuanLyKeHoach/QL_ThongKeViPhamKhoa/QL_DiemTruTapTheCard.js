import React from "react";
import CongThucDiemTruTapThe from "../../Common/CongThucDiemTruTapThe";

const TRAN_TAP_THE = 7.5;

const fmt = (value) => (value != null ? Number(value).toFixed(2) : "---");

const cellStyle = {
  padding: "12px 16px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  flex: "1 1 150px",
};

const cellLabelStyle = {
  fontSize: "12px",
  color: "#64748b",
  marginBottom: "4px",
};
const cellValueStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#0f172a",
};
const monoStyle = { fontFamily: "ui-monospace, Menlo, Consolas, monospace" };

/**
 * Điểm trừ tập thể của MỘT Khoa - dạng thẻ diễn giải công thức, thay cho bảng
 * nhiều Khoa ở màn hình tổng hợp toàn trường.
 *
 * @param {object|null} data dòng dữ liệu từ GET api/vi-pham/diem-tru-khoa của đúng Khoa đang xem
 */
const QL_DiemTruTapTheCard = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div
        className="modern-table-card"
        style={{ padding: "50px", textAlign: "center", marginBottom: "25px" }}
      >
        <i
          className="fa-solid fa-circle-notch fa-spin fa-2x"
          style={{ color: "#3498db" }}
        ></i>
        <p style={{ marginTop: "10px", color: "#666" }}>
          Đang tính điểm trừ tập thể
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="modern-table-card"
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "#666",
          marginBottom: "25px",
        }}
      >
        <i
          className="fa-solid fa-building-columns"
          style={{ fontSize: "48px", color: "#bdc3c7", marginBottom: "12px" }}
        ></i>
        <h3 style={{ color: "#7f8c8d", margin: 0 }}>
          Chưa có số liệu điểm trừ tập thể của Khoa này
        </h3>
      </div>
    );
  }

  const soGv = data.SoGiangVien ?? 0;
  const khongCoGv = soGv === 0;
  const diemTru = Number(data.DiemTruTapThe || 0);
  const chamTran = diemTru >= TRAN_TAP_THE;
  const mauSo = Number(data.MauSo) || 0;
  // Giá trị trước khi cắt trần, chỉ để giải thích cho người xem
  const truocTran =
    mauSo > 0
      ? (TRAN_TAP_THE * Number(data.TongDiemTruCaNhan || 0)) / mauSo
      : 0;
  // Thanh tiến độ so với trần 7,5 điểm
  const tyLe = Math.min(100, (diemTru / TRAN_TAP_THE) * 100);

  return (
    <div
      className="modern-table-card"
      style={{ padding: "20px", marginBottom: "25px" }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div style={cellStyle}>
          <div style={cellLabelStyle}>Số giảng viên của Khoa (N)</div>
          <div style={cellValueStyle}>{soGv}</div>
        </div>
        <div style={cellStyle}>
          <div style={cellLabelStyle}>Số giảng viên vi phạm</div>
          <div style={cellValueStyle}>{data.SoGiangVienViPham ?? 0}</div>
        </div>
        <div style={cellStyle}>
          <div style={cellLabelStyle}>Tổng điểm trừ cá nhân (T)</div>
          <div style={cellValueStyle}>{fmt(data.TongDiemTruCaNhan)}</div>
        </div>
        <div style={cellStyle}>
          <div style={cellLabelStyle}>Mẫu số (0,2 × 15 × N)</div>
          <div style={cellValueStyle}>{fmt(data.MauSo)}</div>
        </div>
        <div
          style={{
            ...cellStyle,
            background: chamTran ? "#fff7ed" : "#eff6ff",
            borderColor: chamTran ? "#fed7aa" : "#bfdbfe",
          }}
        >
          <div style={cellLabelStyle}>
            Điểm trừ tập thể (trần {TRAN_TAP_THE})
          </div>
          <div
            style={{
              ...cellValueStyle,
              color: chamTran ? "#c2410c" : "#1d4ed8",
            }}
          >
            {fmt(data.DiemTruTapThe)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#64748b",
            marginBottom: "6px",
          }}
        >
          <span>Điểm trừ KPI của Khoa</span>
          <span style={monoStyle}>
            {fmt(diemTru)} / {TRAN_TAP_THE.toFixed(2)}
          </span>
        </div>
        <div
          style={{
            height: "10px",
            background: "#f1f5f9",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${tyLe}%`,
              height: "100%",
              borderRadius: "999px",
              background: chamTran ? "#f97316" : "#3b82f6",
              transition: "width 0.3s ease",
            }}
          ></div>
        </div>
      </div>

      <CongThucDiemTruTapThe />

      <div
        style={{
          marginTop: "12px",
          padding: "12px 16px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#475569",
          lineHeight: "1.7",
        }}
      >
        <div
          style={{ fontWeight: "700", marginBottom: "4px", color: "#334155" }}
        >
          <i
            className="fa-solid fa-circle-info"
            style={{ marginRight: "6px" }}
          ></i>
          Thay số của Khoa
        </div>
        {khongCoGv ? (
          <div>
            Khoa chưa có giảng viên đang hoạt động (N = 0) → điểm trừ tập thể =
            0.
          </div>
        ) : (
          <>
            <div style={monoStyle}>
              7,5 × ({fmt(data.TongDiemTruCaNhan)} / {fmt(data.MauSo)}) ={" "}
              {fmt(truocTran)}
            </div>
            {truocTran - diemTru > 0.001 && (
              <div style={{ color: "#c2410c" }}>
                Vượt điểm trừ tối đa của tập thể → áp trần còn{" "}
                {fmt(data.DiemTruTapThe)}
              </div>
            )}
          </>
        )}
        <div>
          • T tính trên toàn Khoa, mỗi cá nhân ĐÃ áp trần 15 điểm trước khi
          cộng.
        </div>
        <div>• N tính cả giảng viên ở đơn vị con của Khoa.</div>
      </div>
    </div>
  );
};

export default QL_DiemTruTapTheCard;
