import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "../../css/Pages.css";
import { Toast } from "primereact/toast";
import { apiFetch } from "../../utils/api";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import SearchSelect from "../../components/Common/SearchSelect";
import { useMinhChungPhieuPreview } from "../../hooks/useMinhChungPhieuPreview";
import {
  chuanHoaFileMinhChung,
  downloadMinhChungFile,
  iconFile,
} from "../../utils/minhChungPhieuApi";

const DanhSachDuyetPhieu = () => {
  const [approvalList, setApprovalList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();
  const toast = useRef(null);
  const { user } = useAuth();
  const currentUser = user || {};

  // Phiếu đang tải cả bộ minh chứng — chặn bấm hai lần vào cùng một hàng
  const [idPhieuDangTai, setIdPhieuDangTai] = useState(null);

  const showToast = (severity, summary, detail, life = 3000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  // Xem trước / tải minh chứng dùng chung với trang chấm điểm và trang vi phạm
  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungPhieuPreview((message) => showToast("error", "Lỗi", message));

  const roleCode = currentUser?.MaChucVu || "";
  const isAdmin = roleCode === "Admin";
  const isManager = ["HT", "PHT", "TK", "TBM"].includes(roleCode);
  const isTopLevel = isAdmin || roleCode === "HT" || roleCode === "PHT";

  const currentRealYear = new Date().getFullYear();
  const [listYears, setListYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(currentRealYear);

  useEffect(() => {
    const fetchYears = async () => {
      if (!isAdmin && !isManager) return;

      try {
        const res = await apiFetch("namdanhgia");
        const result = await res.json();
        const list = result.Items || (Array.isArray(result) ? result : []);

        if (list.length > 0) {
          const years = list
            .map((item) => item.IdNam || item.id_nam || item.NamHoc || item.nam)
            .filter((y) => y != null && !isNaN(y));
          const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

          if (uniqueYears.length > 0) {
            setListYears(uniqueYears);
            setSelectedYear(uniqueYears[0]);
          } else {
            setListYears([currentRealYear]);
          }
        } else {
          setListYears([currentRealYear]);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách năm:", err);
        setListYears([currentRealYear]);
      }
    };

    fetchYears();
  }, [isAdmin, isManager, currentRealYear]);

  useEffect(() => {
    const fetchApprovalList = async () => {
      if (!isAdmin && !isManager) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const endpoint = `approval?idQuanLy=${currentUser.IdNhanVien}&idNam=${selectedYear}&isTopLevel=${isTopLevel}`;
        const res = await apiFetch(endpoint);
        const result = await res.json();
        if (result.success) {
          setApprovalList(result.data || []);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách duyệt:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser.IdNhanVien && listYears.length > 0) {
      fetchApprovalList();
    }
  }, [
    currentUser.IdNhanVien,
    selectedYear,
    isAdmin,
    isManager,
    isTopLevel,
    listYears.length,
  ]);

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1].charAt(0).toUpperCase();
  };

  const getStatusBadge = (status) => {
    if (status === 2)
      return (
        <span
          style={{
            background: "#fef08a",
            color: "#a16207",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            display: "inline-block",
            minWidth: "85px",
            textAlign: "center",
          }}
        >
          Cần duyệt
        </span>
      );
    if (status === 3)
      return (
        <span
          style={{
            background: "#dcfce3",
            color: "#15803d",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
            display: "inline-block",
            minWidth: "85px",
            textAlign: "center",
          }}
        >
          Đã duyệt
        </span>
      );
    return (
      <span
        style={{
          background: "#e2e8f0",
          color: "#475569",
          padding: "6px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "600",
          display: "inline-block",
          minWidth: "85px",
          textAlign: "center",
        }}
      >
        Không xác định
      </span>
    );
  };

  /**
   * Tải cả bộ minh chứng của một phiếu.
   * Tải TUẦN TỰ chứ không bắn song song: mỗi tệp là một lượt fetch có xác thực, và
   * trình duyệt hay chặn nhiều lượt tải tự động dồn cùng lúc.
   */
  const handleDownloadAllFiles = async (item) => {
    const danhSach = (item?.DanhSachFile || []).map(chuanHoaFileMinhChung);
    if (danhSach.length === 0) {
      showToast("warn", "Không có tệp", "Phiếu này không có tệp đính kèm nào.");
      return;
    }

    const taiDuoc = danhSach.filter((mc) => mc.IdMinhChung);
    const boQua = danhSach.length - taiDuoc.length;
    if (taiDuoc.length === 0) {
      showToast(
        "warn",
        "Không tải được",
        `${boQua} tệp là bản ghi cũ, không có mã minh chứng nên không tải được từ máy chủ.`,
        5000,
      );
      return;
    }

    setIdPhieuDangTai(item.IdPhieu);
    showToast(
      "info",
      "Đang tải xuống",
      `Hệ thống đang tải ${taiDuoc.length} tệp về máy`,
    );

    let soLoi = 0;
    for (const mc of taiDuoc) {
      try {
        await downloadMinhChungFile(mc);
      } catch (error) {
        console.error(`Lỗi tải tệp minh chứng #${mc.IdMinhChung}:`, error);
        soLoi += 1;
      }
    }
    setIdPhieuDangTai(null);

    if (soLoi > 0 || boQua > 0) {
      const phanLoi = soLoi > 0 ? `${soLoi} tệp tải thất bại` : "";
      const phanBoQua = boQua > 0 ? `${boQua} tệp không có mã minh chứng` : "";
      showToast(
        "warn",
        `Đã tải ${taiDuoc.length - soLoi}/${danhSach.length} tệp`,
        [phanLoi, phanBoQua].filter(Boolean).join(" • "),
        5000,
      );
    } else {
      showToast("success", "Hoàn tất", `Đã tải ${taiDuoc.length} tệp về máy`);
    }
  };

  if (!isAdmin && !isManager) {
    return (
      <div
        className="page-container"
        style={{
          textAlign: "center",
          padding: "100px 20px",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            background: "#fee2e2",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <i
            className="fa-solid fa-lock"
            style={{ fontSize: "35px", color: "#ef4444" }}
          ></i>
        </div>
        <h2 style={{ color: "#1e293b", marginBottom: "10px" }}>
          Từ chối truy cập
        </h2>
        <p
          style={{
            color: "#64748b",
            marginBottom: "25px",
            maxWidth: "500px",
            margin: "0 auto 25px",
          }}
        >
          Chỉ cấp Quản lý (Trưởng khoa, Trưởng bộ môn) và Ban Giám hiệu mới có
          quyền truy cập vào phân hệ duyệt phiếu đánh giá KPI.
        </p>
        <button
          className="btn-submit"
          style={{ padding: "10px 25px", borderRadius: "8px" }}
          onClick={() => navigate("/")}
        >
          <i
            className="fa-solid fa-arrow-left"
            style={{ marginRight: "8px" }}
          ></i>{" "}
          Quay về Trang chủ
        </button>
      </div>
    );
  }

  const filteredList = approvalList.filter(
    (item) =>
      item.HoTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.MaNhanVien.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b" }}>
            DANH SÁCH DUYỆT PHIẾU ĐÁNH GIÁ
          </h2>
          <span className="breadcrumb">
            Người duyệt: {currentUser.FullName} ({currentUser.RoleName})
          </span>
        </div>
      </div>

      <div
        className="table-container"
        style={{
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: "1", maxWidth: "350px" }}>
            <i
              className="fa-solid fa-search"
              style={{
                position: "absolute",
                left: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            ></i>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã nhân viên"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: "40px",
                width: "100%",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label
              style={{ fontSize: "14px", color: "#475569", fontWeight: "500" }}
            >
              Năm học:
            </label>
            <div style={{ width: "120px" }}>
              <SearchSelect
                value={selectedYear}
                onChange={(v) => setSelectedYear(parseInt(v))}
                options={listYears.map((y) => ({ value: y, label: String(y) }))}
                disabled={isLoading || listYears.length === 0}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <i
              className="fa-solid fa-spinner fa-spin"
              style={{ fontSize: "30px", color: "#003399" }}
            ></i>
            <p style={{ marginTop: "15px", color: "#64748b" }}>
              Đang tải dữ liệu phiếu đánh giá
            </p>
          </div>
        ) : filteredList.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              color: "#64748b",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                background: "#f1f5f9",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <i
                className="fa-solid fa-clipboard-check"
                style={{ fontSize: "35px", color: "#94a3b8" }}
              ></i>
            </div>
            <h3 style={{ color: "#334155", marginBottom: "10px" }}>
              Không có dữ liệu
            </h3>
            <p>
              Hiện không có phiếu đánh giá nào cần bạn phê duyệt trong năm học
              này
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              className="custom-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "950px",
              }}
            >
              <thead
                style={{
                  background: "#f8fafc",
                  borderBottom: "2px solid #e2e8f0",
                }}
              >
                <tr>
                  <th
                    style={{
                      width: "25%",
                      padding: "16px 20px",
                      textAlign: "left",
                      color: "#475569",
                      fontSize: "13px",
                      textTransform: "uppercase",
                    }}
                  >
                    Giảng viên
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "16px 20px",
                      textAlign: "left",
                      color: "#475569",
                      fontSize: "13px",
                      textTransform: "uppercase",
                    }}
                  >
                    Chức vụ
                  </th>
                  <th
                    style={{
                      width: "10%",
                      padding: "16px 20px",
                      textAlign: "center",
                      color: "#475569",
                      fontSize: "13px",
                      textTransform: "uppercase",
                    }}
                  >
                    Điểm
                  </th>
                  <th
                    style={{
                      width: "22%",
                      padding: "16px 20px",
                      textAlign: "left",
                      color: "#475569",
                      fontSize: "13px",
                      textTransform: "uppercase",
                    }}
                  >
                    Minh chứng
                  </th>
                  <th
                    style={{
                      width: "13%",
                      padding: "16px 20px",
                      textAlign: "center",
                      color: "#475569",
                      fontSize: "13px",
                      textTransform: "uppercase",
                    }}
                  >
                    Trạng thái
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "16px 20px",
                      textAlign: "center",
                      color: "#475569",
                      fontSize: "13px",
                      textTransform: "uppercase",
                    }}
                  >
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => (
                  <tr
                    key={item.IdPhieu}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "all 0.2s",
                      background: item.TrangThai === 2 ? "#fefce8" : "#fff",
                    }}
                    className="table-row-hover"
                  >
                    <td style={{ padding: "16px 20px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: "#e0e7ff",
                            color: "#003399",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            fontSize: "16px",
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(item.HoTen)}
                        </div>
                        <div>
                          <b
                            style={{
                              color: "#0f172a",
                              fontSize: "14px",
                              display: "block",
                              marginBottom: "2px",
                            }}
                          >
                            {item.HoTen}
                          </b>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              background: "#f1f5f9",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            {item.MaNhanVien}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "16px 20px",
                        color: "#475569",
                        fontSize: "13px",
                      }}
                    >
                      {item.TenChucVu}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center" }}>
                      <span
                        style={{
                          color: "#003399",
                          fontSize: "15px",
                          fontWeight: "700",
                          background: "#eff6ff",
                          padding: "4px 10px",
                          borderRadius: "20px",
                        }}
                      >
                        {item.TongDiemTichLuy?.toFixed(2)}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px 20px",
                        fontSize: "12px",
                        color: "#475569",
                      }}
                    >
                      {item.DanhSachFile && item.DanhSachFile.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "5px",
                          }}
                        >
                          {item.DanhSachFile.map((file, idx) => {
                            const mc = chuanHoaFileMinhChung(file);
                            const icon = iconFile(mc);
                            const nhan = mc.TenFileGoc || "Minh chứng";
                            const tenStyle = {
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "180px",
                            };

                            return (
                              <div
                                key={mc.IdMinhChung || idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                <i
                                  className={icon.className}
                                  style={{ color: icon.color, flexShrink: 0 }}
                                ></i>
                                {mc.IdMinhChung ? (
                                  <button
                                    type="button"
                                    onClick={() => openPreview(mc)}
                                    title={`Xem trước: ${nhan}`}
                                    style={{
                                      ...tenStyle,
                                      background: "none",
                                      border: "none",
                                      padding: 0,
                                      cursor: "pointer",
                                      color: "#1d4ed8",
                                      fontSize: "12px",
                                      fontFamily: "inherit",
                                      textAlign: "left",
                                    }}
                                  >
                                    {nhan}
                                  </button>
                                ) : (
                                  <span
                                    style={tenStyle}
                                    title={`${nhan} — bản ghi cũ không có mã minh chứng nên không xem/tải được`}
                                  >
                                    {nhan}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                          Không có tệp
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center" }}>
                      {getStatusBadge(item.TrangThai)}
                    </td>
                    <td style={{ padding: "16px 20px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          title={
                            item.TrangThai === 2
                              ? "Tiến hành Duyệt phiếu"
                              : "Xem chi tiết phiếu"
                          }
                          className={
                            item.TrangThai === 2 ? "btn-submit" : "btn-cancel"
                          }
                          style={{
                            width: "32px",
                            height: "32px",
                            padding: "0",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border:
                              item.TrangThai === 2
                                ? "none"
                                : "1px solid #cbd5e1",
                          }}
                          onClick={() =>
                            navigate(
                              `/chi-tiet-duyet-phieu?idPhieu=${item.IdPhieu}&idNhanVien=${item.IdNhanVien}&year=${item.IdNam}`,
                            )
                          }
                        >
                          {item.TrangThai === 2 ? (
                            <i className="fa-solid fa-pen-to-square"></i>
                          ) : (
                            <i className="fa-solid fa-eye"></i>
                          )}
                        </button>

                        {(() => {
                          const dangTai = idPhieuDangTai === item.IdPhieu;
                          const khongCoTep =
                            !item.DanhSachFile ||
                            item.DanhSachFile.length === 0;
                          const moKhoa = !khongCoTep && !dangTai;

                          return (
                            <button
                              title={
                                dangTai
                                  ? "Đang tải các tệp minh chứng..."
                                  : "Tải tất cả tệp minh chứng"
                              }
                              disabled={!moKhoa}
                              style={{
                                width: "32px",
                                height: "32px",
                                padding: "0",
                                borderRadius: "8px",
                                cursor: moKhoa ? "pointer" : "not-allowed",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: moKhoa ? "#eff6ff" : "#f1f5f9",
                                color: moKhoa ? "#003399" : "#94a3b8",
                                border: moKhoa
                                  ? "1px solid #bfdbfe"
                                  : "1px solid #e2e8f0",
                                transition: "all 0.2s",
                              }}
                              onClick={() => handleDownloadAllFiles(item)}
                            >
                              <i
                                className={
                                  dangTai
                                    ? "fa-solid fa-spinner fa-spin"
                                    : "fa-solid fa-download"
                                }
                              ></i>
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenFileGoc || preview.mc?.TenHienThi}
        kieu={preview.kieu}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />
    </div>
  );
};

export default DanhSachDuyetPhieu;
