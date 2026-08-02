import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";

/** Cột văn bản dài (nhóm / loại / mô tả) căn đều hai bên cho thẳng lề. */
const justifiedCellStyle = {
  textAlign: "justify",
  textJustify: "inter-word",
};

/** Kiểu chữ dùng chung cho nội dung cột NHÓM VI PHẠM và LOẠI VI PHẠM. */
const phanLoaiTextStyle = {
  fontSize: "12px",
  fontWeight: "600",
  color: "#475569",
  lineHeight: "1.5",
};

const QL_ViPhamListing = ({
  data,
  onEdit,
  onDelete,
  isLoading,
  canManage,
  canSuaXoa,
  selectedNam,
  onPreviewMinhChung,
}) => {
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

  const formatDate = (dateString) => {
    if (!dateString) return "---";
    let date;
    if (typeof dateString === "string" && dateString.includes("/Date(")) {
      const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
      date = new Date(timestamp);
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return "---";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div
      className="modern-table-card"
      style={{ overflowX: "auto", paddingBottom: "10px" }}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <i
            className="fa-solid fa-circle-notch fa-spin fa-2x"
            style={{ color: "#3498db" }}
          ></i>
          <p style={{ marginTop: "10px", color: "#666" }}>
            Đang tải danh sách vi phạm
          </p>
        </div>
      ) : data.length === 0 ? (
        <div
          style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}
        >
          <i
            className="fa-solid fa-circle-check"
            style={{ fontSize: "60px", color: "#bdc3c7", marginBottom: "15px" }}
          ></i>
          <h3 style={{ color: "#7f8c8d", margin: "0 0 10px 0" }}>
            {selectedNam
              ? `Chưa ghi nhận vi phạm nào trong năm ${selectedNam}`
              : "Chưa ghi nhận vi phạm nào"}
          </h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Thử đổi bộ lọc năm / đơn vị / giảng viên để xem dữ liệu khác.
          </p>
        </div>
      ) : (
        <>
          <table
            className="custom-table"
            style={{ minWidth: isDesktop ? "1600px" : "100%" }}
          >
            <thead>
              <tr>
                <th width="4%" style={{ textAlign: "center" }}>
                  STT
                </th>
                <th width="6%" style={{ textAlign: "center" }}>
                  NĂM
                </th>
                <th width="14%">GIẢNG VIÊN</th>
                <th width="13%">NHÓM VI PHẠM</th>
                <th width="16%">LOẠI VI PHẠM</th>
                <th width="12%">MÔ TẢ</th>
                <th width="6%" style={{ textAlign: "center" }}>
                  ĐIỂM TRỪ
                </th>
                <th width="8%">MINH CHỨNG</th>
                <th width="7%" style={{ textAlign: "center" }}>
                  NGÀY VP
                </th>
                <th width="7%" style={{ textAlign: "center" }}>
                  KỶ LUẬT
                </th>
                <th width="11%">NGƯỜI GHI NHẬN</th>
                {canManage && (
                  <th width="7%" style={{ textAlign: "center" }}>
                    THAO TÁC
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => (
                <tr key={item.IdViPham}>
                  <td style={{ textAlign: "center", color: "#64748b" }}>
                    {first + index + 1}
                  </td>
                  <td style={{ textAlign: "center", fontWeight: "600" }}>
                    {item.IdNam}
                  </td>
                  <td>
                    <div style={{ fontWeight: "600", color: "#1e293b" }}>
                      {item.HoTenNhanVien || `Mã NV: ${item.IdNhanVien}`}
                    </div>
                    {item.MaNhanVien && (
                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "13px",
                        }}
                      >
                        Mã giảng viên:{" "}
                        <span
                          className="code-pill"
                          style={{ fontSize: "12px" }}
                        >
                          {item.MaNhanVien}
                        </span>
                      </div>
                    )}
                    {item.TenDonVi && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginTop: "3px",
                        }}
                      >
                        {item.TenDonVi}
                      </div>
                    )}
                  </td>
                  <td style={justifiedCellStyle}>
                    {item.TenNhom ? (
                      <div style={phanLoaiTextStyle}>{item.TenNhom}</div>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>---</span>
                    )}
                  </td>
                  <td style={justifiedCellStyle}>
                    {item.IdLoaiViPham != null ? (
                      <div style={phanLoaiTextStyle}>{item.NoiDung}</div>
                    ) : (
                      <span
                        style={{
                          color: "#94a3b8",
                          fontStyle: "italic",
                          fontSize: "13px",
                        }}
                      >
                        <i
                          className="fa-solid fa-circle-question"
                          style={{ marginRight: "5px" }}
                        ></i>
                        Chưa phân loại (bản ghi cũ)
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      ...justifiedCellStyle,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: "13px",
                    }}
                  >
                    {item.MoTa ? (
                      item.MoTa
                    ) : (
                      <span style={{ color: "#94a3b8" }}>---</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {item.DiemTru != null ? (
                      <span className="rating-badge rating-low">
                        {Number(item.DiemTru).toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>---</span>
                    )}
                  </td>
                  <td style={{ fontSize: "13px", color: "#475569" }}>
                    {item.MinhChung ? (
                      <button
                        type="button"
                        onClick={() =>
                          onPreviewMinhChung && onPreviewMinhChung(item)
                        }
                        title={`Xem trước: ${item.MinhChung.TenFileGoc || "minh chứng.pdf"}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          maxWidth: "100%",
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          color: "#1d4ed8",
                          fontSize: "13px",
                          textAlign: "left",
                        }}
                      >
                        <i
                          className="fa-solid fa-file-pdf"
                          style={{ color: "#dc2626", flexShrink: 0 }}
                        ></i>
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.MinhChung.TenFileGoc || "Minh chứng.pdf"}
                        </span>
                      </button>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>
                        <i
                          className="fa-regular fa-file"
                          style={{ marginRight: "5px" }}
                        ></i>
                        Chưa có
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: "center", fontSize: "13px" }}>
                    {formatDate(item.NgayViPham)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {item.BiKyLuat ? (
                      <span
                        style={{
                          backgroundColor: "#f8d7da",
                          color: "#721c24",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          border: "1px solid #f5c6cb",
                        }}
                      >
                        Bị kỷ luật
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                        ---
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: "13px", color: "#475569" }}>
                    <div>{item.HoTenNguoiGhiNhan || "---"}</div>
                    {item.TenDonViGhiNhan && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginTop: "3px",
                        }}
                      >
                        {item.TenDonViGhiNhan}
                      </div>
                    )}
                  </td>
                  {canManage && (
                    <td>
                      {/* Server chỉ cho đơn vị đã ghi nhận (hoặc Admin) sửa/xóa */}
                      {(canSuaXoa ? canSuaXoa(item) : true) ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
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
                            onClick={() => onDelete(item)}
                            title="Xóa"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{ textAlign: "center", color: "#cbd5e1" }}
                          title={`Do ${item.TenDonViGhiNhan || "đơn vị khác"} ghi nhận — bạn không có quyền sửa/xóa`}
                        >
                          <i className="fa-solid fa-lock"></i>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
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

export default QL_ViPhamListing;
