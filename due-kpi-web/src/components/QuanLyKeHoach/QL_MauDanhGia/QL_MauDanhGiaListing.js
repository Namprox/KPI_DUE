import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";
import "../../../css/QuanLyKeHoach/QL_MauDanhGia.css";

const QL_MauDanhGiaListing = ({
  data,
  onEdit,
  onDelete,
  onConfigPermissions,
  isLoading,
  canManage,
}) => {
  const [first, setFirst] = useState(0);
  const [isDesktop, setIsDesktop] = useState(true);
  const rows = 15;

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

  return (
    <div
      className="table-card mau-danhgia-table-container"
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
            Đang tải danh sách mẫu phiếu
          </p>
        </div>
      ) : data.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}
        >
          <i
            className="fa-solid fa-file-circle-plus"
            style={{ fontSize: "60px", color: "#5dade2", marginBottom: "15px" }}
          ></i>
          <h3 style={{ color: "#e74c3c", margin: "0 0 10px 0" }}>
            Chưa có mẫu phiếu nào được tạo
          </h3>
        </div>
      ) : (
        <>
          <table
            className="custom-table mau-danhgia-table"
            style={{ minWidth: isDesktop ? "900px" : "100%" }}
          >
            <thead>
              <tr>
                <th width="5%" style={{ textAlign: "center" }}>
                  STT
                </th>
                <th width="35%">TÊN MẪU PHIẾU ĐÁNH GIÁ</th>
                <th width="15%" style={{ textAlign: "center" }}>
                  NĂM ÁP DỤNG
                </th>
                <th width="15%" style={{ textAlign: "center" }}>
                  SỐ TIÊU CHÍ
                </th>
                <th width="15%" style={{ textAlign: "center" }}>
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
                  <tr key={item.IdMau}>
                    <td style={{ textAlign: "center", fontWeight: "bold" }}>
                      {actualIndex}
                    </td>
                    <td>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#003399",
                          fontSize: "15px",
                        }}
                      >
                        {item.TenMau}
                      </div>
                      {item.MoTa && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#666",
                            marginTop: "4px",
                          }}
                        >
                          {item.MoTa}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        color: "#e67e22",
                        fontSize: "16px",
                      }}
                    >
                      {item.IdNam}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          backgroundColor: "#e0f2fe",
                          color: "#1d4ed8",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontWeight: "bold",
                          fontSize: "13px",
                        }}
                      >
                        {item.SoTieuChi || 0} Tiêu chí
                      </span>
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
                          }}
                        >
                          Đang sử dụng
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
                          opacity: canManage ? 1 : 0.4,
                          pointerEvents: canManage ? "auto" : "none",
                        }}
                      >
                        <div
                          className="action-btn perm-btn"
                          onClick={() => onConfigPermissions(item)}
                          title="Phân quyền đánh giá"
                          style={{ color: "#10b981" }}
                        >
                          <i className="fa-solid fa-user-shield"></i>
                        </div>
                        <div
                          className="action-btn edit-btn"
                          onClick={() => onEdit(item)}
                          title="Chỉnh sửa Mẫu"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </div>
                        <div
                          className="action-btn delete-btn"
                          onClick={() => onDelete(item.IdMau)}
                          title="Xóa Mẫu"
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

export default QL_MauDanhGiaListing;
