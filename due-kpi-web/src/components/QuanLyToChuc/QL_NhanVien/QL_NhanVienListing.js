import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";
import "../../../css/QuanLyToChuc/QL_NhanVien.css";

const QL_NhanVienListing = ({
  data,
  first,
  rows,
  totalRecords,
  onPageChange,
  onEdit,
  onDelete,
  onResetPassword,
  isLoading,
  canManage,
}) => {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 992);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="table-card nhanvien-table-container"
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
            Đang tải dữ liệu nhân viên
          </p>
        </div>
      ) : data.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}
        >
          <i
            className="fa-solid fa-users-slash"
            style={{ fontSize: "60px", color: "#5dade2", marginBottom: "15px" }}
          ></i>
          <h3 style={{ color: "#e74c3c", margin: "0 0 10px 0" }}>
            Không tìm thấy nhân viên / giảng viên nào
          </h3>
        </div>
      ) : (
        <>
          <table
            className="custom-table nhanvien-table"
            style={{ minWidth: isDesktop ? "1450px" : "100%" }}
          >
            <thead>
              <tr>
                <th width="3%" style={{ textAlign: "center" }}>
                  STT
                </th>
                <th width="11%">MÃ NHÂN VIÊN</th>
                <th width="15%">HỌ VÀ TÊN</th>
                <th width="15%">ĐƠN VỊ CÔNG TÁC</th>
                <th width="12%">CHỨC VỤ</th>
                <th width="12%">CHỨC DANH</th>
                <th width="14%">THÔNG TIN LIÊN HỆ</th>
                <th width="10%" style={{ textAlign: "center" }}>
                  TRẠNG THÁI
                </th>
                <th width="8%" style={{ textAlign: "center" }}>
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const actualIndex = first + index + 1;
                return (
                  <tr key={item.IdNhanVien}>
                    <td style={{ textAlign: "center" }}>{actualIndex}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: "bold", color: "#003399" }}>
                        {item.MaNhanVien}
                      </div>
                      {/* {item.ScienceUserId ? (
                                                <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fa-solid fa-link"></i> DueScience: {item.ScienceUserId}</div>
                                             ) : (
                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="fa-solid fa-link-slash"></i> Chưa liên kết DB</div>
                                             )} */}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: "600", color: "#333" }}>
                        {item.HoTen}
                      </div>
                    </td>
                    <td
                      style={{
                        color: item.TenDonVi ? "inherit" : "#999",
                        fontStyle: item.TenDonVi ? "normal" : "italic",
                      }}
                    >
                      {item.TenDonVi || "Chưa cập nhật"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: "500", color: "#0284c7" }}>
                        {item.TenChucVu || "---"}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: "500", color: "#475569" }}>
                        {item.TenChucDanh || "—"}
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: "13px", color: "#475569" }}>
                        <i
                          className="fa-regular fa-envelope"
                          style={{
                            width: "16px",
                            marginRight: "5px",
                            color: "#3b82f6",
                          }}
                        ></i>
                        {item.Email || "---"}
                      </div>
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
                          Đang hoạt động
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
                          gap: "10px",
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
                          className="action-btn key-btn"
                          onClick={() => onResetPassword(item)}
                          title="Đổi mật khẩu"
                        >
                          <i className="fa-solid fa-key"></i>
                        </div>
                        <div
                          className="action-btn delete-btn"
                          onClick={() => onDelete(item.IdNhanVien)}
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
          {totalRecords > rows && (
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
                totalRecords={totalRecords}
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

export default QL_NhanVienListing;
