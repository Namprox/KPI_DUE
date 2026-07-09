import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";

const QL_ChucVuListing = ({ data, onEdit, onDelete, isLoading }) => {
  const [first, setFirst] = useState(0);
  const [isDesktop, setIsDesktop] = useState(true);
  const rows = 10;

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 992);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setFirst(0);
  }, [data]);

  const paginatedData = data.slice(first, first + rows);
  const onPageChange = (event) => setFirst(event.first);

  const formatRatio = (val) => {
    if (val === null || val === undefined) return "---";
    const num = parseFloat(val);
    if (isNaN(num)) return "---";
    const percent = (num * 100).toFixed(0);
    return `${percent}% (${num})`;
  };

  return (
    <div
      className="table-card"
      style={{
        overflowX: "auto",
        background: "#fff",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        paddingBottom: "10px",
      }}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <i
            className="fa-solid fa-circle-notch fa-spin fa-2x"
            style={{ color: "#3498db", marginRight: "10px" }}
          ></i>
          <p style={{ marginTop: "10px", color: "#666" }}>
            Đang tải danh sách chức vụ
          </p>
        </div>
      ) : data.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}
        >
          <i
            className="fa-solid fa-briefcase"
            style={{ fontSize: "60px", color: "#5dade2", marginBottom: "15px" }}
          ></i>
          <h3 style={{ color: "#e74c3c", margin: "0 0 10px 0" }}>
            Không tìm thấy chức vụ nào
          </h3>
        </div>
      ) : (
        <>
          <table
            className="custom-table"
            style={{ minWidth: isDesktop ? "1100px" : "100%" }}
          >
            <thead>
              <tr>
                <th width="5%" style={{ textAlign: "center" }}>
                  STT
                </th>
                <th width="7%">MÃ CHỨC VỤ</th>
                <th width="20%">TÊN CHỨC VỤ</th>
                <th width="15%" style={{ textAlign: "center" }}>
                  ĐỊNH MỨC GIỜ GIẢNG DẠY
                </th>
                <th width="15%" style={{ textAlign: "center" }}>
                  ĐỊNH MỨC NCKH
                </th>
                <th width="28%">ĐIỀU KIỆN ÁP DỤNG / GHI CHÚ</th>
                <th width="10%" style={{ textAlign: "center" }}>
                  TRẠNG THÁI
                </th>
                <th width="10%" style={{ textAlign: "center" }}>
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => {
                const actualIndex = first + index + 1;
                return (
                  <tr key={item.IdChucVu}>
                    <td style={{ textAlign: "center" }}>{actualIndex}</td>
                    <td style={{ fontWeight: "bold", color: "#003399" }}>
                      {item.MaChucVu}
                    </td>
                    <td style={{ fontWeight: "600" }}>{item.TenChucVu}</td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "500",
                        color:
                          item.TyLeDinhMucGiang !== null
                            ? "#1e293b"
                            : "#94a3b8",
                      }}
                    >
                      {formatRatio(item.TyLeDinhMucGiang)}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "500",
                        color:
                          item.ty_le_dinh_muc_nckh !== null
                            ? "#1e293b"
                            : "#94a3b8",
                      }}
                    >
                      {formatRatio(item.ty_le_dinh_muc_nckh)}
                    </td>
                    <td
                      style={{
                        color: "#555",
                        fontSize: "13px",
                        lineHeight: "1.4",
                        textAlign: "justify",
                        hyphens: "auto",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.GhiChuDieuKien || "---"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.TrangThai ? (
                        <span
                          style={{
                            backgroundColor: "#22c55e",
                            color: "#fff",
                            padding: "5px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Hoạt động
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: "#94a3b8",
                            color: "#fff",
                            padding: "5px 12px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "15px",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          className="action-btn edit-btn"
                          onClick={() => onEdit(item)}
                          title="Chỉnh sửa"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </div>
                        <div
                          className="action-btn delete-btn"
                          onClick={() => onDelete(item.IdChucVu)}
                          title="Xóa"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.length > rows && (
            <div
              style={{
                marginTop: "15px",
                borderTop: "1px solid #e9ecef",
                paddingTop: "10px",
              }}
            >
              <Paginator
                first={first}
                rows={rows}
                totalRecords={data.length}
                onPageChange={onPageChange}
                template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                style={{ background: "transparent", border: "none" }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QL_ChucVuListing;
