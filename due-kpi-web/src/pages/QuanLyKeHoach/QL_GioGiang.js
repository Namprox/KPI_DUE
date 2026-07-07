import React, { useState, useEffect, useRef } from "react";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import { apiFetch } from "../../utils/api";

const QL_GioGiang = () => {
  const toast = useRef(null);
  const [allData, setAllData] = useState([]);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [namList, setNamList] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // New states for Excel Import Modal
  const [dbNamList, setDbNamList] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importYear, setImportYear] = useState("");
  const [importSemester, setImportSemester] = useState("");
  const [importFile, setImportFile] = useState(null);

  useEffect(() => {
    fetchAllData();
    fetchDbNamList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDbNamList = async () => {
    try {
      const response = await apiFetch("namdanhgia");
      if (response.ok) {
        const result = await response.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        const sortedList = list.sort((a, b) => b.IdNam - a.IdNam);
        setDbNamList(sortedList);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách năm:", error);
    }
  };

  const getKyHocPrefix = (year) => {
    if (!year) return null;
    const numYear = parseInt(year);
    return numYear % 100;
  };

  const formatKyHoc = (kyHoc) => {
    if (!kyHoc) return "";
    const str = kyHoc.toString();
    if (str.length < 3) return str;
    const suffix = str.slice(-1);
    const prefix = parseInt(str.slice(0, -1));
    const yearStart = 2000 + prefix - 1;
    const yearEnd = 2000 + prefix;
    let termName = "";
    if (suffix === "1") termName = "Kỳ 1";
    else if (suffix === "2") termName = "Kỳ 2";
    else if (suffix === "3") termName = "Kỳ hè";
    else termName = `Kỳ ${suffix}`;
    return `${termName} (${yearStart}-${yearEnd})`;
  };

  const formatNgayImport = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${hh}:${mm} ${dd}/${month}/${yyyy}`;
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch("gio-giang-import");
      if (response.ok) {
        const result = await response.json();
        const success = result.Success !== undefined ? result.Success : result.success;
        if (success) {
          const items = result.Items || result.items || [];
          setAllData(items);

          // Extract unique years from item.KyHoc
          // kyHoc format is YYS, where YY is end year suffix, S is semester.
          // Prefix is Math.floor(kyHoc / 10), year is 2000 + prefix.
          const years = [...new Set(items.map((item) => 2000 + Math.floor((item.KyHoc || 0) / 10)))]
            .filter((y) => y > 2000)
            .sort((a, b) => b - a);

          setNamList(years.map(y => ({ IdNam: y.toString() })));

          if (years.length > 0) {
            setSelectedYear((prev) => {
              if (prev && years.includes(parseInt(prev))) return prev;
              return years[0].toString();
            });
          } else {
            setSelectedYear("");
          }
        }
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedYear) {
      setData([]);
      setFilteredData([]);
      return;
    }

    const prefix = parseInt(selectedYear) % 100;
    
    // 1. Filter by year
    let result = allData.filter((item) => Math.floor((item.KyHoc || 0) / 10) === prefix);

    // 2. Filter by semester
    if (selectedSemester) {
      const targetKyHoc = prefix * 10 + parseInt(selectedSemester);
      result = result.filter((item) => item.KyHoc === targetKyHoc);
    }

    setData(result);

    // 3. Filter by search query
    const query = searchQuery.toLowerCase();
    setFilteredData(
      result.filter(
        (item) =>
          (item.HoTen && item.HoTen.toLowerCase().includes(query)) ||
          (item.ChucDanh && item.ChucDanh.toLowerCase().includes(query)),
      ),
    );
  }, [allData, selectedYear, selectedSemester, searchQuery]);

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      let endpoint = "gio-giang-import/export";
      let kyHocValue = null;
      if (selectedYear && selectedSemester) {
        const prefix = parseInt(selectedYear) % 100;
        kyHocValue = `${prefix}${selectedSemester}`;
        endpoint += `?kyHoc=${kyHocValue}`;
      }

      const response = await apiFetch(endpoint);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const disposition = response.headers.get("content-disposition");
        let fileName = "DL_GioGiang.xlsx";
        if (disposition && disposition.indexOf("attachment") !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            fileName = matches[1].replace(/['"]/g, "");
          }
        }
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        toast.current.show({
          severity: "success",
          summary: "Thành công",
          detail: "Xuất dữ liệu Excel thành công!",
          life: 4000,
        });
      } else {
        const result = await response.json().catch(() => ({}));
        toast.current.show({
          severity: "error",
          summary: "Lỗi xuất dữ liệu",
          detail: result.Message || "Xuất dữ liệu Excel thất bại!",
          life: 5000,
        });
      }
    } catch (error) {
      console.error("Lỗi xuất dữ liệu:", error);
      toast.current.show({
        severity: "error",
        summary: "Lỗi kết nối",
        detail: "Mất kết nối tới máy chủ!",
        life: 4000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenImportModal = () => {
    setImportYear(selectedYear || (dbNamList[0]?.IdNam?.toString() || ""));
    setImportSemester(selectedSemester || "1");
    setImportFile(null);
    setIsImportModalOpen(true);
  };

  const handleModalImport = async () => {
    if (!importFile) {
      toast.current.show({
        severity: "warn",
        summary: "Cảnh báo",
        detail: "Vui lòng chọn file Excel!",
        life: 4000,
      });
      return;
    }

    if (!importSemester) {
      toast.current.show({
        severity: "warn",
        summary: "Cảnh báo",
        detail: "Vui lòng chọn học kỳ!",
        life: 4000,
      });
      return;
    }

    if (!importYear) {
      toast.current.show({
        severity: "warn",
        summary: "Cảnh báo",
        detail: "Vui lòng chọn năm học!",
        life: 4000,
      });
      return;
    }

    setIsLoading(true);
    const prefix = getKyHocPrefix(importYear);
    const kyHocValue = `${prefix}${importSemester}`;

    const formData = new FormData();
    formData.append("file", importFile);
    formData.append("kyHoc", kyHocValue);

    const BASE_URL =
      process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

    try {
      const res = await fetch(`${BASE_URL}/gio-giang-import/import`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await res.json();
      const success =
        result.Success !== undefined ? result.Success : result.success;

      if (res.ok && success) {
        toast.current.show({
          severity: "success",
          summary: "Thành công",
          detail:
            result.Message ||
            `Import thành công ${result.ImportedCount || 0} dòng!`,
          life: 4000,
        });
        setSelectedYear(importYear);
        setSelectedSemester(importSemester);
        fetchAllData();
        setIsImportModalOpen(false);
      } else {
        toast.current.show({
          severity: "error",
          summary: "Lỗi Import",
          detail: result.Message || "Import Excel thất bại!",
          life: 5000,
        });
      }
    } catch (err) {
      console.error(err);
      toast.current.show({
        severity: "error",
        summary: "Lỗi kết nối",
        detail: "Mất kết nối tới máy chủ!",
        life: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div className="header-title">
          <h2 style={{ margin: 0 }}>QUẢN LÝ GIỜ GIẢNG GIẢNG VIÊN</h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label
              style={{ fontSize: "14px", color: "#475569", fontWeight: "bold" }}
            >
              Năm học:
            </label>
            <select
              className="form-input"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: "140px",
                padding: "8px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              {namList.map((y) => {
                const endYear = parseInt(y.IdNam);
                return (
                  <option key={y.IdNam} value={y.IdNam}>
                    {endYear - 1}-{endYear}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label
              style={{ fontSize: "14px", color: "#475569", fontWeight: "bold" }}
            >
              Học kỳ:
            </label>
            <select
              className="form-input"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{
                width: "150px",
                padding: "8px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <option value="">Tất cả học kỳ</option>
              <option value="1">Học kỳ 1</option>
              <option value="2">Học kỳ 2</option>
              <option value="3">Học kỳ hè</option>
            </select>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <button
          className="btn-add-new"
          onClick={handleExportData}
          disabled={isExporting}
          style={{
            margin: 0,
            backgroundColor: "#f59e0b",
            borderColor: "#d97706",
            color: "#fff",
            opacity: isExporting ? 0.7 : 1,
            cursor: isExporting ? "not-allowed" : "pointer",
          }}
        >
          <i
            className={isExporting ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-download"}
            style={{ marginRight: "6px" }}
          ></i>{" "}
          {isExporting ? "Đang xuất..." : "Xuất Excel"}
        </button>

        <button
          className="btn-add-new"
          onClick={handleOpenImportModal}
          style={{
            margin: 0,
            backgroundColor: "#3b82f6",
            borderColor: "#2563eb",
          }}
        >
          <i className="fa-solid fa-upload" style={{ marginRight: "6px" }}></i>{" "}
          Nhập từ Excel
        </button>
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          padding: "15px",
          borderRadius: "5px",
          marginBottom: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "15px",
          }}
        >
          <p className="sub-title" style={{ margin: 0 }}>
            DANH SÁCH GIỜ GIẢNG ĐÃ IMPORT (NĂM HỌC {selectedYear && `${parseInt(selectedYear) - 1}-${parseInt(selectedYear)}`})
          </p>
          <div
            className="search-wrapper"
            style={{ position: "relative", width: "100%", maxWidth: "350px" }}
          >
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: "absolute",
                left: "10px",
                top: "12px",
                color: "#888",
              }}
            ></i>
            <input
              type="text"
              placeholder="Tìm theo họ tên hoặc chức danh..."
              className="form-input"
              style={{ width: "100%", paddingLeft: "35px" }}
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>
      </div>

      <div
        className="table-container"
        style={{
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x color-primary"></i>
          </div>
        ) : (
          <table
            className="custom-table"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead style={{ background: "#f8fafc", color: "#334155" }}>
              <tr>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "center",
                    width: "50px",
                  }}
                >
                  STT
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "left",
                  }}
                >
                  Họ Tên
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "left",
                    width: "90px",
                  }}
                >
                  Chức Danh
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "right",
                    width: "120px",
                  }}
                >
                  Giờ Giảng Dạy
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "right",
                    width: "100px",
                  }}
                >
                  Giờ CVK
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "right",
                    width: "120px",
                  }}
                >
                  Giờ Quy Đổi
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "right",
                    width: "120px",
                  }}
                >
                  Định Mức
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "right",
                    width: "120px",
                  }}
                >
                  Thực Lĩnh
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "center",
                    width: "150px",
                  }}
                >
                  Kỳ Học
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "center",
                    width: "150px",
                  }}
                >
                  Ngày Import
                </th>
                <th
                  style={{
                    padding: "12px",
                    borderBottom: "2px solid #e2e8f0",
                    textAlign: "left",
                    width: "140px",
                  }}
                >
                  Người Import
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr
                  key={item.IdGioGiangImport}
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                >
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    {index + 1}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      color: "#0f172a",
                      fontWeight: "600",
                    }}
                  >
                    {item.HoTen}
                  </td>
                  <td style={{ padding: "12px", color: "#475569" }}>
                    {item.ChucDanh || "---"}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "600",
                      color: "#0369a1",
                    }}
                  >
                    {(item.TongGioGiangDay || 0).toLocaleString("vi-VN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      color: "#475569",
                    }}
                  >
                    {(item.TongGioCvk || 0).toLocaleString("vi-VN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "600",
                      color: "#166534",
                    }}
                  >
                    {(item.TongGioQuiDoi || 0).toLocaleString("vi-VN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      color: "#b45309",
                    }}
                  >
                    {(item.DinhMucGioChuan || 0).toLocaleString("vi-VN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "700",
                      color: "#6d28d9",
                    }}
                  >
                    {(item.TongGioThucLinh || 0).toLocaleString("vi-VN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontSize: "13px",
                      color: "#334155",
                    }}
                  >
                    {formatKyHoc(item.KyHoc)}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    {formatNgayImport(item.NgayImport) || "---"}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      color: "#64748b",
                      fontSize: "13px",
                    }}
                  >
                    {item.NguoiImportHoTen || "---"}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td
                    colSpan="11"
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#64748b",
                    }}
                  >
                    Không tìm thấy giảng viên nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box form-modal-box" style={{ width: "90%", maxWidth: "500px" }}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, paddingRight: "20px", lineHeight: "1.4" }}>
                Nhập dữ liệu từ Excel
              </h3>
              <button className="close-btn" onClick={() => setIsImportModalOpen(false)} style={{ fontSize: "26px", lineHeight: "1", flexShrink: 0, marginTop: "-2px" }}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: "25px" }}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>Năm học <span className="text-red">*</span></label>
                <select
                  className="form-input"
                  value={importYear}
                  onChange={(e) => setImportYear(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px" }}
                >
                  {dbNamList.map((y) => {
                    const endYear = parseInt(y.IdNam);
                    return (
                      <option key={y.IdNam} value={y.IdNam}>
                        {endYear - 1}-{endYear}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>Học kỳ <span className="text-red">*</span></label>
                <select
                  className="form-input"
                  value={importSemester}
                  onChange={(e) => setImportSemester(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px" }}
                >
                  <option value="1">Học kỳ 1</option>
                  <option value="2">Học kỳ 2</option>
                  <option value="3">Học kỳ hè</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>Chọn file Excel <span className="text-red">*</span></label>
                <div 
                  style={{
                    border: "2px dashed #cbd5e1",
                    borderRadius: "8px",
                    padding: "20px",
                    textAlign: "center",
                    background: "#f8fafc",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onClick={() => document.getElementById("modalExcelUpload").click()}
                >
                  <i className="fa-solid fa-file-excel" style={{ fontSize: "36px", color: "#16a34a", marginBottom: "10px" }}></i>
                  <p style={{ 
                    margin: "0 0 5px 0", 
                    fontWeight: "600", 
                    color: "#334155",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%"
                  }}>
                    {importFile ? importFile.name : "Chọn file Excel từ máy tính"}
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    Hỗ trợ định dạng .xlsx, .xls
                  </p>
                  <input
                    type="file"
                    id="modalExcelUpload"
                    accept=".xlsx, .xls"
                    style={{ display: "none" }}
                    onChange={(e) => setImportFile(e.target.files[0])}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "15px 25px" }}>
              <button type="button" className="btn-cancel" onClick={() => setIsImportModalOpen(false)}>
                <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i> Hủy
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={handleModalImport}
                disabled={isLoading || !importFile || !importYear || !importSemester}
                style={{ 
                  opacity: (isLoading || !importFile || !importYear || !importSemester) ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "5px" }}></i> Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-upload" style={{ marginRight: "5px" }}></i> Nhập dữ liệu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QL_GioGiang;
