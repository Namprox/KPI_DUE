import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";
import {
  LOAI_THANH_TICH_META,
  formatDiem,
} from "../../../utils/keKhaiThanhTichApi";

/**
 * Bảng danh mục thành tích vượt trội - cây 2 CẤP đã phẳng hoá.
 *
 * Server trả danh sách đã sắp theo thứ tự cây, nên chỉ cần thụt lề nút lá là đọc
 * được quan hệ cha/con; KHÔNG tự sắp xếp lại ở đây, làm thế là phá thứ tự cây.
 *
 * Cột "Đơn vị duyệt" là cột quan trọng nhất của màn hình: danh mục được seed
 * toàn NULL, mà `IdDonViDuyet` để trống nghĩa là dòng kê khai sẽ rơi về trưởng
 * đơn vị quản lý trực tiếp - P.TCHC sẽ KHÔNG thấy dòng khen thưởng nào. Vì vậy
 * mức lá chưa gán được đánh dấu bằng cảnh báo hổ phách chứ không bỏ trống lặng lẽ.
 */
const QL_DanhMucThanhTichListing = ({ data, onEdit, onDelete, isLoading }) => {
  const [first, setFirst] = useState(0);
  const [isDesktop, setIsDesktop] = useState(true);
  const rows = 20;

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

  /**
   * Đơn vị phụ trách thẩm định dòng kê khai trỏ tới mức này.
   *
   * Chỉ cảnh báo ở mức LÁ: nút gốc là nút gom, không có dòng nào trỏ thẳng vào
   * nó nên để trống là bình thường.
   */
  const renderDonViDuyet = (item) => {
    if (item.IdDonViDuyet != null) {
      return (
        <span className="tag-badge" title={item.MaDonVi || ""}>
          {item.TenDonVi || item.MaDonVi}
        </span>
      );
    }
    if (!item.LaLa) {
      return <span style={{ color: "#cbd5e1" }}>—</span>;
    }
    return (
      <span
        style={{ color: "#b45309", fontSize: "13px", fontStyle: "italic" }}
        title="Chưa gán đơn vị phụ trách nên dòng kê khai sẽ rơi về trưởng đơn vị quản lý trực tiếp của nhân viên. Nếu mức này thuộc P.TCHC / P.KHHTQT thì phải gán ở đây."
      >
        <i
          className="fa-solid fa-triangle-exclamation"
          style={{ marginRight: "5px", color: "#f59e0b" }}
        ></i>
        Đơn vị quản lý trực tiếp
      </span>
    );
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
            Đang tải danh mục thành tích
          </p>
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
          <i
            className="fa-solid fa-trophy"
            style={{ fontSize: "60px", color: "#bdc3c7", marginBottom: "15px" }}
          ></i>
          <h3 style={{ color: "#7f8c8d", margin: "0 0 10px 0" }}>
            Không có mục nào
          </h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Thử đổi bộ lọc tiêu chí / trạng thái hoặc thêm mục mới.
          </p>
        </div>
      ) : (
        <>
          <table
            className="custom-table"
            style={{ minWidth: isDesktop ? "1240px" : "100%" }}
          >
            <thead>
              <tr>
                <th width="4%" style={{ textAlign: "center" }}>
                  STT
                </th>
                <th width="11%">MÃ</th>
                <th width="26%">TÊN MỤC</th>
                <th width="13%">TIÊU CHÍ</th>
                <th width="9%" style={{ textAlign: "center" }}>
                  ĐIỂM
                </th>
                <th width="16%">ĐƠN VỊ DUYỆT</th>
                <th width="9%" style={{ textAlign: "center" }}>
                  QUY ƯỚC
                </th>
                <th width="6%" style={{ textAlign: "center" }}>
                  TRẠNG THÁI
                </th>
                <th width="6%" style={{ textAlign: "center" }}>
                  THAO TÁC
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, index) => {
                const meta = LOAI_THANH_TICH_META[item.LoaiThanhTich];
                const laGoc = !item.LaLa && item.IdCha == null;
                return (
                  <tr
                    key={item.IdMuc}
                    style={laGoc ? { background: "#f8fafc" } : undefined}
                  >
                    <td style={{ textAlign: "center", color: "#64748b" }}>
                      {first + index + 1}
                    </td>
                    <td>
                      <span className="code-pill">{item.MaMuc}</span>
                    </td>
                    <td>
                      <div
                        style={{
                          // Thụt lề mức lá để đọc ra quan hệ cha/con của cây 2 cấp
                          paddingLeft: item.IdCha != null ? "18px" : 0,
                          fontWeight: laGoc ? "700" : "500",
                          color: "#1e293b",
                        }}
                      >
                        {item.IdCha != null && (
                          <i
                            className="fa-solid fa-turn-up fa-rotate-90"
                            style={{ marginRight: "8px", color: "#cbd5e1" }}
                          ></i>
                        )}
                        {item.TenMuc}
                      </div>
                      {item.GhiChu && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            marginTop: "3px",
                            paddingLeft: item.IdCha != null ? "18px" : 0,
                          }}
                        >
                          {item.GhiChu}
                        </div>
                      )}
                    </td>
                    <td>
                      {meta ? (
                        <span
                          className="tag-badge"
                          style={{
                            backgroundColor: meta.bg,
                            color: meta.color,
                            borderColor: meta.border,
                          }}
                        >
                          <i
                            className={`fa-solid ${meta.icon}`}
                            style={{ marginRight: "5px" }}
                          ></i>
                          {meta.label}
                        </span>
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>—</span>
                      )}
                      {item.TranDiem != null && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#c2410c",
                            marginTop: "4px",
                          }}
                          title="Trần điểm của cả tiêu chí này trong một năm"
                        >
                          <i
                            className="fa-solid fa-gauge-high"
                            style={{ marginRight: "4px" }}
                          ></i>
                          Trần: {formatDiem(item.TranDiem)}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.LaLa ? (
                        <span className="rating-badge rating-high">
                          +{formatDiem(item.DiemQuyDoi)}
                        </span>
                      ) : (
                        <span
                          style={{ color: "#94a3b8", fontSize: "13px" }}
                          title="Nút gộp - không kê khai trực tiếp được"
                        >
                          Nút gộp
                        </span>
                      )}
                    </td>
                    <td>{renderDonViDuyet(item)}</td>
                    <td style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          justifyContent: "center",
                        }}
                      >
                        {item.YeuCauMinhChung && (
                          <i
                            className="fa-solid fa-file-pdf"
                            style={{ color: "#dc2626" }}
                            title="Bắt buộc có minh chứng PDF mới nộp được bản kê"
                          ></i>
                        )}
                        {item.LaLa && !item.ChoPhepSoLuong && (
                          <i
                            className="fa-solid fa-1"
                            style={{ color: "#64748b" }}
                            title="Mỗi dòng luôn tính 1 đơn vị - server ép SoLuong về 1"
                          ></i>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {item.TrangThai ? (
                        <span className="rating-badge rating-high">
                          Đang dùng
                        </span>
                      ) : (
                        <span
                          className="tag-badge"
                          style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
                        >
                          Ngừng
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
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
                          title="Ngừng sử dụng"
                        >
                          <i className="fa-solid fa-ban"></i>
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

export default QL_DanhMucThanhTichListing;
