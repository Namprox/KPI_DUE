import React, { useState, useEffect } from "react";
import { Paginator } from "primereact/paginator";

const QL_DanhGiaSinhVienListing = ({
  data = [],
  totalCount = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  isLoading,
}) => {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 992);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const first = (page - 1) * pageSize;

  const handlePaginatorChange = (event) => {
    if (onPageChange) {
      const newPage = event.page + 1;
      const newPageSize = event.rows;
      onPageChange(newPage, newPageSize);
    }
  };

  const formatDateTime = (dateString) => {
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
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const paginatedData = data;

  return (
    <div className="modern-table-card" style={{ overflowX: "auto" }}>
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <i
            className="fa-solid fa-circle-notch fa-spin fa-2x"
            style={{ color: "#2563eb", marginBottom: "12px" }}
          ></i>
          <p style={{ margin: 0, color: "#64748b", fontWeight: "500" }}>
            Đang tải dữ liệu đánh giá sinh viên...
          </p>
        </div>
      ) : data.length === 0 ? (
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
              className="fa-solid fa-folder-open"
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
            Không tìm thấy dữ liệu đánh giá
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
            Hiện chưa có bản ghi đánh giá sinh viên nào.
          </p>
        </div>
      ) : (
        <>
          <table
            className="custom-table"
            style={{ minWidth: isDesktop ? "1000px" : "100%", width: "100%" }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  MSSV
                </th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  MÃ CB
                </th>
                <th style={{ whiteSpace: "nowrap" }}>HỌ TÊN GV</th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  MÃ HP
                </th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  NĂM HỌC
                </th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  KỲ HỌC
                </th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  CÂU HỎI
                </th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  ĐÁNH GIÁ
                </th>
                <th style={{ whiteSpace: "nowrap" }}>KHOA</th>
                <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  NGÀY IMPORT
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => {
                const idPhanHoi = item.IdPhanHoi || item.idPhanHoi || idx;
                const mssv = item.Mssv || item.mssv || "---";
                const maCB = item.MaCanBo || item.maCanBo || "---";
                const hoTenGv = item.HoTenGv || item.hoTenGv || "---";
                const maHocPhan = item.MaHocPhan || item.maHocPhan || "---";

                const kyHoc = item.KyHoc ?? item.kyHoc;
                let namHocVal = "---";
                let kyHocVal = "---";
                if (kyHoc) {
                  const str = String(kyHoc);
                  if (str.length >= 3) {
                    const yearPart = parseInt(str.substring(0, 2), 10);
                    const semPart = str.substring(2);
                    namHocVal = `${2000 + yearPart - 1}-${2000 + yearPart}`;
                    kyHocVal = semPart;
                  } else {
                    namHocVal = Math.floor(kyHoc / 10).toString();
                    kyHocVal = (kyHoc % 10).toString();
                  }
                }

                const cauHoi = item.CauHoi ?? item.cauHoi ?? "---";
                const danhGia = item.DanhGia ?? item.danhGia;
                const numDanhGia =
                  danhGia !== null && danhGia !== undefined
                    ? Number(danhGia)
                    : null;
                const displayDanhGia =
                  numDanhGia !== null ? numDanhGia.toFixed(1) : "---";

                let ratingClass = "rating-medium";
                if (numDanhGia !== null) {
                  if (numDanhGia >= 4.5) ratingClass = "rating-high";
                  else if (numDanhGia < 3.5) ratingClass = "rating-low";
                }

                const donVi = item.TenDonVi || item.tenDonVi || "---";
                const ngayImport = item.NgayImport || item.ngayImport;

                return (
                  <tr key={idPhanHoi}>
                    <td style={{ textAlign: "center" }}>
                      <span className="code-pill">{mssv}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#64748b",
                        }}
                      >
                        {maCB}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: "600", color: "#0f172a" }}>
                        {hoTenGv}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        className="tag-badge"
                        style={{
                          backgroundColor: "#eff6ff",
                          color: "#1d4ed8",
                          borderColor: "#bfdbfe",
                        }}
                      >
                        {maHocPhan}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "13px", color: "#334155" }}>
                        {namHocVal}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="tag-badge">Kỳ {kyHocVal}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontWeight: "600", color: "#475569" }}>
                        {cauHoi}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {numDanhGia !== null ? (
                        <span className={`rating-badge ${ratingClass}`}>
                          <i
                            className="fa-solid fa-star"
                            style={{ fontSize: "10px" }}
                          ></i>{" "}
                          {displayDanhGia}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>---</span>
                      )}
                    </td>
                    <td>
                      <span className="tag-badge">{donVi}</span>
                    </td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          color: "#475569",
                          fontSize: "13px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          lineHeight: "1",
                        }}
                      >
                        <i
                          className="fa-regular fa-clock"
                          style={{ fontSize: "12px", color: "#94a3b8", display: "inline-block", flexShrink: 0 }}
                        ></i>
                        <span>{formatDateTime(ngayImport)}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              backgroundColor: "#ffffff",
            }}
          >
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "500" }}>
              Hiển thị{" "}
              <strong style={{ color: "#0f172a" }}>
                {totalCount === 0 ? 0 : first + 1}
              </strong>{" "}
              -{" "}
              <strong style={{ color: "#0f172a" }}>
                {Math.min(first + pageSize, totalCount)}
              </strong>{" "}
              trong tổng số{" "}
              <strong style={{ color: "#0f172a" }}>
                {totalCount}
              </strong>{" "}
              bản ghi
            </span>

            {totalCount > pageSize && (
              <Paginator
                first={first}
                rows={pageSize}
                totalRecords={totalCount}
                onPageChange={handlePaginatorChange}
                template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
                style={{ background: "transparent", border: "none", padding: 0 }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default QL_DanhGiaSinhVienListing;
