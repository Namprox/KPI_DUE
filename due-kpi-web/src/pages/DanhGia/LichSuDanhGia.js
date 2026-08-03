import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../../css/Pages.css";
import "../../css/DanhGia/LichSuDanhGia.css";
import { apiFetch } from "../../utils/api";

const LichSuDanhGia = () => {
  const [historyList, setHistoryList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const { user } = useAuth();
  const currentUser = user || {};

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const res = await apiFetch(
          `phieu?idNhanVien=${currentUser.IdNhanVien}`,
        );
        const result = await res.json();
        const isSuccess =
          result.Success !== undefined ? result.Success : result.success;
        const items = result.Items || result.data || [];
        if (isSuccess) {
          setHistoryList(items);
        }
      } catch (err) {
        console.error("Lỗi tải lịch sử:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser.IdNhanVien) fetchHistory();
  }, [currentUser.IdNhanVien]);

  // phieu_danh_gia.trang_thai: 1 NHAP, 2 DON_VI_CHAM, 3 CHO_HT_DUYET, 4 HT_DA_DUYET, 5 HOAN_TAT
  const getStatusBadge = (status) => {
    switch (status) {
      case 1:
        return <span className="badge badge-nhap">Lưu nháp</span>;
      case 2:
        return <span className="badge badge-dang-cham">Đơn vị đang chấm</span>;
      case 3:
        return (
          <span className="badge badge-cho-duyet">Chờ Hiệu trưởng duyệt</span>
        );
      case 4:
        return (
          <span className="badge badge-da-duyet">Hiệu trưởng đã duyệt</span>
        );
      case 5:
        return <span className="badge badge-hoan-tat">Đã hoàn tất</span>;
      default:
        return <span className="badge badge-chua-ro">Chưa rõ</span>;
    }
  };

  // xep_loai: 1 Không hoàn thành, 2 Hoàn thành, 3 Hoàn thành tốt, 4 Hoàn thành xuất sắc
  const getXepLoaiText = (item) => {
    if (item.XepLoaiText) return item.XepLoaiText;
    switch (item.XepLoai) {
      case 1:
        return "Không hoàn thành";
      case 2:
        return "Hoàn thành";
      case 3:
        return "Hoàn thành tốt";
      case 4:
        return "Hoàn thành xuất sắc";
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("vi-VN");
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: "25px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b" }}>LỊCH SỬ ĐÁNH GIÁ KPI</h2>
          <span className="breadcrumb">
            {currentUser.RoleName || "Giảng viên"}:{" "}
            {currentUser.HoTen || currentUser.FullName}
          </span>
        </div>
      </div>

      <div
        className="table-card lich-su-table-container"
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          paddingBottom: "10px",
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <i
              className="fa-solid fa-spinner fa-spin"
              style={{ fontSize: "30px", color: "#003399" }}
            ></i>
          </div>
        ) : historyList.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "50px", color: "#64748b" }}
          >
            <i
              className="fa-solid fa-folder-open"
              style={{
                fontSize: "40px",
                marginBottom: "15px",
                color: "#cbd5e1",
              }}
            ></i>
            <p>Bạn chưa có phiếu đánh giá nào trong hệ thống</p>
          </div>
        ) : (
          <table className="custom-table lich-su-table">
            <thead
              style={{
                background: "#f8fafc",
                borderBottom: "2px solid #e2e8f0",
              }}
            >
              <tr>
                <th
                  style={{
                    width: "10%",
                    padding: "15px",
                    textAlign: "center",
                    color: "#475569",
                  }}
                >
                  Năm học
                </th>
                <th
                  style={{
                    width: "35%",
                    padding: "15px",
                    textAlign: "left",
                    color: "#475569",
                  }}
                >
                  Tổng điểm (Tích lũy)
                </th>
                <th
                  style={{
                    width: "20%",
                    padding: "15px",
                    textAlign: "center",
                    color: "#475569",
                  }}
                >
                  Ngày gửi
                </th>
                <th
                  style={{
                    width: "15%",
                    padding: "15px",
                    textAlign: "center",
                    color: "#475569",
                  }}
                >
                  Trạng thái
                </th>
                <th
                  style={{
                    width: "20%",
                    padding: "15px",
                    textAlign: "center",
                    color: "#475569",
                  }}
                >
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((item) => (
                <tr
                  key={item.IdPhieu}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    transition: "0.2s",
                  }}
                >
                  <td
                    className="nowrap"
                    style={{
                      padding: "15px",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: "#0f172a",
                    }}
                  >
                    {item.IdNam}
                  </td>

                  <td style={{ padding: "15px", textAlign: "left" }}>
                    {item.TongDiemTichLuy != null ? (
                      <>
                        <b style={{ color: "#003399", fontSize: "16px" }}>
                          {Number(item.TongDiemTichLuy).toFixed(2)} đ
                        </b>
                        {getXepLoaiText(item) && (
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#64748b",
                              marginTop: "2px",
                            }}
                          >
                            {getXepLoaiText(item)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Chưa có điểm tổng kết
                      </span>
                    )}
                  </td>

                  <td
                    className="nowrap"
                    style={{
                      padding: "15px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    {formatDate(item.NgayGui) || (
                      <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Chưa nộp
                      </span>
                    )}
                  </td>

                  <td className="nowrap" style={{ padding: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {getStatusBadge(item.TrangThai)}
                    </div>
                  </td>

                  <td className="nowrap" style={{ padding: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <button
                        className="btn-submit"
                        style={{
                          padding: "6px 15px",
                          fontSize: "13px",
                          borderRadius: "6px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        onClick={() => {
                          // LoaiDoiTuong hợp lệ là 1 (giảng viên) / 2 (viên chức - NLĐ).
                          // API danh sách có thể trả 0 (không map) -> suy ra từ chức danh của phiếu.
                          const loaiDoiTuong =
                            item.LoaiDoiTuong ?? item.loaiDoiTuong;
                          const isStaff =
                            loaiDoiTuong === 1
                              ? false
                              : loaiDoiTuong === 2 ||
                                !(item.IdChucDanh ?? currentUser.IdChucDanh);
                          if (isStaff) {
                            navigate(
                              `/danh-gia-kpi-nhan-vien?year=${item.IdNam}`,
                            );
                          } else {
                            navigate(`/danh-gia-phu-luc-2?year=${item.IdNam}`);
                          }
                        }}
                      >
                        <i className="fa-solid fa-eye"></i> Xem chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LichSuDanhGia;
