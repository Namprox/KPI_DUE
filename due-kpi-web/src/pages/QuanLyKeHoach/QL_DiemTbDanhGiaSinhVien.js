import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/Pages.css";
import QL_DiemTbDanhGiaSinhVienListing from "../../components/QuanLyKeHoach/QL_DanhGiaSinhVien/QL_DiemTbDanhGiaSinhVienListing";
import { apiFetch } from "../../utils/api";

const QL_DiemTbDanhGiaSinhVien = () => {
  const navigate = useNavigate();

  const [namList, setNamList] = useState([]);
  const [selectedNam, setSelectedNam] = useState("");
  const [dotChotInfo, setDotChotInfo] = useState(null);

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchNamList();
  }, []);

  const fetchNamList = async () => {
    try {
      const response = await apiFetch("namdanhgia");
      if (response.ok) {
        const result = await response.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        setNamList(list);
        if (list.length > 0) {
          const currentYearStr = String(new Date().getFullYear());
          const foundItem = list.find(
            (item) => String(item.IdNam || item.id_nam) === currentYearStr
          );
          const defaultNam = foundItem
            ? (foundItem.IdNam || foundItem.id_nam)
            : (list[0].IdNam || list[0].id_nam || "");
          setSelectedNam(defaultNam);
          fetchChiTiet(defaultNam);
        }
      }
    } catch (error) {
      console.error("Lỗi tải danh sách năm đánh giá:", error);
    }
  };

  const fetchChiTiet = async (idNam) => {
    if (!idNam) {
      setDotChotInfo(null);
      setData([]);
      setFilteredData([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiFetch(`diem-tb-phan-hoi-sv?idNam=${idNam}`);
      if (response.ok) {
        const result = await response.json();
        setDotChotInfo(result.DotChot || result.dotChot || null);
        const items = result.Items || (Array.isArray(result) ? result : []);
        setData(items);
        setFilteredData(items);
      } else {
        setDotChotInfo(null);
        setData([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết điểm trung bình:", error);
      setDotChotInfo(null);
      setData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNamChange = (e) => {
    const newNam = e.target.value;
    setSelectedNam(newNam);
    setSearchQuery("");
    fetchChiTiet(newNam);
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredData(data);
      return;
    }

    setFilteredData(
      data.filter((item) => {
        const maCb = (item.MaCanBo || item.maCanBo || "").toLowerCase();
        const hoTen = (item.HoTen || item.hoTen || "").toLowerCase();
        const donVi = (item.TenDonVi || item.tenDonVi || "").toLowerCase();

        return maCb.includes(query) || hoTen.includes(query) || donVi.includes(query);
      })
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "---";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "---";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} lúc ${hours}:${minutes}`;
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div className="header-title">
          <h2>ĐIỂM TRUNG BÌNH ĐÁNH GIÁ SINH VIÊN</h2>
        </div>
        <button
          className="btn-add-new"
          onClick={() => navigate("/quan-ly-danh-gia-sinh-vien")}
          style={{ margin: 0, backgroundColor: "#64748b", borderColor: "#64748b" }}
        >
          <i className="fa-solid fa-arrow-left"></i> Quản lý dữ liệu thô
        </button>
      </div>

      {/* Filter bar */}
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            alignItems: "flex-end",
          }}
        >
          <div style={{ flex: "1 1 200px", maxWidth: "250px" }}>
            <label style={{ fontWeight: "600", marginBottom: "6px", display: "block", color: "#334155" }}>
              Năm đánh giá
            </label>
            <select
              className="form-input"
              value={selectedNam}
              onChange={handleNamChange}
              style={{ width: "100%" }}
            >
              <option value="">-- Chọn năm --</option>
              {namList.map((y) => {
                const val = y.IdNam || y.id_nam;
                return (
                  <option key={val} value={val}>
                    Năm {val}
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ flex: "1 1 250px", marginLeft: "auto" }}>
            <div
              className="search-wrapper"
              style={{ position: "relative", width: "100%" }}
            >
              <i
                className="fa-solid fa-magnifying-glass"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "12px",
                  color: "#94a3b8",
                }}
              ></i>
              <input
                type="text"
                placeholder="Tìm theo tên, mã cán bộ, đơn vị..."
                className="form-input"
                style={{ width: "100%", paddingLeft: "36px" }}
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Information Card */}
      {dotChotInfo && (
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              <i className="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px 0", color: "#1e3a8a", fontSize: "15px", fontWeight: "700" }}>
                Kết quả chốt điểm - Năm {dotChotInfo.IdNam || dotChotInfo.idNam || selectedNam}
              </h4>
              <p style={{ margin: 0, color: "#1e40af", fontSize: "13px" }}>
                Người thực hiện: <strong>{dotChotInfo.NguoiChotHoTen || dotChotInfo.nguoiChotHoTen || "Hệ thống"}</strong> • Ngày chốt: {formatDateTime(dotChotInfo.NgayChot || dotChotInfo.ngayChot)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ textAlign: "center", backgroundColor: "#fff", padding: "6px 16px", borderRadius: "6px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600", display: "block" }}>Số giảng viên</span>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{dotChotInfo.SoGiangVien ?? 0}</span>
            </div>
            {dotChotInfo.SoMaKhongKhop > 0 && (
              <div style={{ textAlign: "center", backgroundColor: "#fff", padding: "6px 16px", borderRadius: "6px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: "11px", color: "#ef4444", textTransform: "uppercase", fontWeight: "600", display: "block" }}>Mã không khớp</span>
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#dc2626" }}>{dotChotInfo.SoMaKhongKhop}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Listing */}
      <QL_DiemTbDanhGiaSinhVienListing data={filteredData} isLoading={isLoading} />
    </div>
  );
};

export default QL_DiemTbDanhGiaSinhVien;
