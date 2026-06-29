import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";
import "../../../css/QuanLyTieuChi/QL_NhomTieuChi.css";

const QL_NhomTieuChiListing = ({
  data,
  onEdit,
  onDelete,
  isLoading,
  canManage,
  showLoaiNhom = true,
}) => {
  const [first, setFirst] = useState(0);
  const [isDesktop, setIsDesktop] = useState(true);
  const rows = 20;

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 992);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setFirst(0);
  }, [data]);

  const paginatedData = data.slice(first, first + rows);

  const onPageChange = (event) => {
    setFirst(event.first);
  };

  return (
    <div
      className="table-card nhom-tieu-chi-table-container"
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
            Đang tải dữ liệu nhóm tiêu chí
          </p>
        </div>
      ) : data.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}
        >
          <i
            className="fa-solid fa-list-check"
            style={{ fontSize: "60px", color: "#5dade2", marginBottom: "15px" }}
          ></i>
          <h3 style={{ color: "#e74c3c", margin: "0 0 10px 0" }}>
            Chưa có nhóm tiêu chí nào được tạo
          </h3>
        </div>
      ) : (
        <>
          <table
            className="custom-table nhom-tieu-chi-table"
            style={{ minWidth: isDesktop ? "900px" : "100%" }}
          >
            <thead>
              <tr>
                <th width="8%" style={{ textAlign: "center" }}>
                  STT
                </th>
                <th width={showLoaiNhom ? "35%" : "47%"}>TÊN NHÓM TIÊU CHÍ</th>
                <th width="20%">CẤP CHA (NẾU CÓ)</th>
                {showLoaiNhom && (
                  <th width="12%" style={{ textAlign: "center" }}>
                    LOẠI NHÓM
                  </th>
                )}
                <th width="10%" style={{ textAlign: "center" }}>
                  TRẠNG THÁI
                </th>
                <th width="15%" style={{ textAlign: "center" }}>
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => {
                const actualIndex = first + index + 1;

                return (
                  <tr key={item.IdNhom}>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>
                      {actualIndex}
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#333" }}>
                        {item.TenNhom}
                      </div>
                      {item.DiemToiDa && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#e74c3c",
                            marginTop: "4px",
                          }}
                        >
                          Điểm tối đa: {item.DiemToiDa}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        color: item.IdNhomCha ? "#0394ddff" : "#94a3b8",
                        fontStyle: item.IdNhomCha ? "normal" : "italic",
                        fontWeight: 500,
                      }}
                    >
                      {item.TenNhomCha || "---"}
                    </td>
                    {showLoaiNhom && (
                      <td style={{ textAlign: "center", fontWeight: "500" }}>
                        {item.LoaiNhom === 1 ? (
                          "Cơ bản (A)"
                        ) : (
                          <span style={{ color: "#8e44ad" }}>Vượt trội (B)</span>
                        )}
                      </td>
                    )}
                    <td style={{ textAlign: "center" }}>
                      {item.TrangThai ? (
                        <span className="nhom-nhiem-vu-status-active">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="nhom-nhiem-vu-status-inactive">
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
                          opacity: canManage ? 1 : 0.4,
                          pointerEvents: canManage ? "auto" : "none",
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
                          onClick={() => onDelete(item.IdNhom)}
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

export default QL_NhomTieuChiListing;
