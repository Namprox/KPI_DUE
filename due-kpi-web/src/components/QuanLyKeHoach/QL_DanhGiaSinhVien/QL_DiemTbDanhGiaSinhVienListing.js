import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";

const QL_DiemTbDanhGiaSinhVienListing = ({ data, isLoading }) => {
  const [first, setFirst] = useState(0);
  const rows = 15;

  useEffect(() => {
    setFirst(0);
  }, [data]);

  const paginatedData = (data || []).slice(first, first + rows);
  const onPageChange = (event) => setFirst(event.first);

  return (
    <div className="modern-table-card" style={{ overflowX: "auto" }}>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <i
            className="fa-solid fa-circle-notch fa-spin fa-2x"
            style={{ color: "#2563eb", marginBottom: "12px" }}
          ></i>
          <p style={{ margin: 0, color: "#64748b", fontWeight: "500" }}>
            Đang tải dữ liệu điểm trung bình...
          </p>
        </div>
      ) : !data || data.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: "#f1f5f9",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <i
              className="fa-solid fa-chart-bar"
              style={{ fontSize: "32px", color: "#94a3b8" }}
            ></i>
          </div>
          <h3
            style={{
              color: "#334155",
              fontSize: "16px",
              fontWeight: "600",
              margin: "0 0 8px 0",
            }}
          >
            Không tìm thấy dữ liệu điểm trung bình
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
            Vui lòng chọn Năm đánh giá hoặc thực hiện chốt điểm cho năm được chọn.
          </p>
        </div>
      ) : (
        <>
          <table className="custom-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "center", width: "60px", whiteSpace: "nowrap" }}>
                  STT
                </th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap", width: "120px" }}>
                  MÃ CB
                </th>
                <th style={{ whiteSpace: "nowrap" }}>HỌ TÊN GIẢNG VIÊN</th>
                <th style={{ whiteSpace: "nowrap" }}>ĐƠN VỊ</th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap", width: "150px" }}>
                  SỐ LƯỢT ĐÁNH GIÁ
                </th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap", width: "160px" }}>
                  ĐIỂM TRUNG BÌNH
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => {
                const rowNum = first + index + 1;
                const diemTb =
                  item.DiemTrungBinh !== null && item.DiemTrungBinh !== undefined
                    ? Number(item.DiemTrungBinh).toFixed(2)
                    : "---";
                const isGoodScore =
                  item.DiemTrungBinh !== null && Number(item.DiemTrungBinh) >= 4.0;

                return (
                  <tr key={item.IdNhanVien || item.MaCanBo || index}>
                    <td style={{ textAlign: "center", color: "#64748b", fontWeight: "500" }}>
                      {rowNum}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: "600", color: "#1e293b" }}>
                      {item.MaCanBo || "---"}
                    </td>
                    <td style={{ fontWeight: "600", color: "#0f172a" }}>
                      {item.HoTen || "---"}
                    </td>
                    <td style={{ color: "#475569" }}>
                      {item.TenDonVi || "---"}
                    </td>
                    <td style={{ textAlign: "center", color: "#334155" }}>
                      <span
                        style={{
                          backgroundColor: "#f1f5f9",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "13px",
                          fontWeight: "500",
                        }}
                      >
                        {item.SoLuotDanhGia ?? "---"}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: "16px",
                          fontWeight: "700",
                          fontSize: "14px",
                          backgroundColor: isGoodScore ? "#dcfce7" : "#fef3c7",
                          color: isGoodScore ? "#15803d" : "#b45309",
                          border: `1px solid ${isGoodScore ? "#86efac" : "#fde68a"}`,
                        }}
                      >
                        {diemTb}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.length > rows && (
            <div style={{ padding: "10px", backgroundColor: "#fff" }}>
              <Paginator
                first={first}
                rows={rows}
                totalRecords={data.length}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QL_DiemTbDanhGiaSinhVienListing;
