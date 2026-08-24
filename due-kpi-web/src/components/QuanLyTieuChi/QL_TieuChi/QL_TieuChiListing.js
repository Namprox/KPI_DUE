import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";
import "../../../css/QuanLyTieuChi/QL_TieuChi.css";
import { Link } from "react-router-dom";

const QL_TieuChiListing = ({
  data,
  onEdit,
  onDelete,
  isLoading,
  canManage,
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

  const getLoaiThangDiem = (loai) => {
    switch (loai) {
      case 1:
        return "Rời rạc";
      case 2:
        return "Liên tục";
      case 3:
        return "Có / Không";
      // case 4:
      //   return "Công thức";
      default:
        return "---";
    }
  };

  return (
    <div
      className="table-card tieuchi-table-container"
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
            Đang tải dữ liệu tiêu chí
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
            Chưa có tiêu chí nào được tạo
          </h3>
        </div>
      ) : (
        <>
          <table
            className="custom-table tieuchi-table"
            style={{ minWidth: isDesktop ? "1200px" : "100%" }}
          >
            <thead>
              <tr>
                <th width="5%" style={{ textAlign: "center" }}>
                  STT
                </th>
                <th width="32%">NỘI DUNG TIÊU CHÍ</th>
                <th width="18%">THUỘC NHÓM</th>
                <th width="10%" style={{ textAlign: "center" }}>
                  ĐIỂM TỐI ĐA
                </th>
                <th width="10%" style={{ textAlign: "center" }}>
                  THANG ĐIỂM
                </th>
                <th width="15%" style={{ textAlign: "center" }}>
                  YÊU CẦU
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
                  <tr key={item.IdTieuChi}>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>
                      {actualIndex}
                    </td>
                    <td>
                      <div style={{ fontWeight: "600", color: "#333" }}>
                        {item.TenTieuChi}
                      </div>
                      {item.MoTa && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "4px",
                            whiteSpace: "pre-line",
                            textAlign: "justify",
                            hyphens: "auto",
                            wordBreak: "break-word",
                          }}
                        >
                          {item.MoTa}
                        </div>
                      )}
                      {/* {item.LoaiThangDiem === 4 && item.CongThucTinhDiem && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#e67e22",
                            marginTop: "4px",
                            fontStyle: "italic",
                          }}
                        >
                          <i
                            className="fa-solid fa-calculator"
                            style={{ marginRight: "4px" }}
                          ></i>
                          Công thức: {item.CongThucTinhDiem}
                        </div>
                      )} */}
                    </td>
                    <td>
                      <div style={{ fontWeight: "500", color: "#0284c7" }}>
                        {item.TenNhom}
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        color: "#e74c3c",
                        fontSize: "16px",
                      }}
                    >
                      {item.DiemToiDa}
                    </td>
                    <td className="thangdiem-cell">
                      <div
                        className={`thangdiem-value type-${item.LoaiThangDiem}`}
                      >
                        {getLoaiThangDiem(item.LoaiThangDiem)}
                      </div>

                      {item.LoaiThangDiem === 1 && (
                        <Link
                          to={`/${item.IdTieuChi}/thang-diem`}
                          className="thangdiem-action-link"
                        >
                          Xem chi tiết
                        </Link>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {item.BatBuocMinhChung ? (
                          <span style={{ color: "#d35400" }}>
                            <i
                              className="fa-solid fa-paperclip"
                              style={{ marginRight: "4px" }}
                            ></i>
                            Có minh chứng
                          </span>
                        ) : (
                          <span style={{ color: "#7f8c8d" }}>
                            <i
                              className="fa-solid fa-minus"
                              style={{ marginRight: "4px" }}
                            ></i>
                            Không bắt buộc
                          </span>
                        )}

                        {/* {item.CoTheDongBoScience && (
                          <span
                            style={{ color: "#2980b9" }}
                            title={
                              item.BangNguonScience || "Chưa cấu hình nguồn"
                            }
                          >
                            <i
                              className="fa-solid fa-rotate"
                              style={{ marginRight: "4px" }}
                            ></i>
                            Đồng bộ: {item.BangNguonScience || "Chưa cấu hình"}
                          </span>
                        )} */}
                      </div>
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
                          onClick={() => onDelete(item.IdTieuChi)}
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

export default QL_TieuChiListing;
