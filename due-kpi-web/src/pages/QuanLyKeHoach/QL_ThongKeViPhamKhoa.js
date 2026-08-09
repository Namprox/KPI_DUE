import React, { useState, useEffect, useRef, useMemo } from "react";
import { Toast } from "primereact/toast";
import { useAuth } from "../../context/AuthContext";
import "../../css/Pages.css";
import QL_ViPhamListing from "../../components/QuanLyKeHoach/QL_ViPham/QL_ViPhamListing";
import QL_TongHopGiangVienListing from "../../components/QuanLyKeHoach/QL_TongHopViPham/QL_TongHopGiangVienListing";
import QL_DiemTruTapTheCard from "../../components/QuanLyKeHoach/QL_ThongKeViPhamKhoa/QL_DiemTruTapTheCard";
import QL_ThongKeTheoNhomListing from "../../components/QuanLyKeHoach/QL_ThongKeViPhamKhoa/QL_ThongKeTheoNhomListing";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import SearchSelect from "../../components/Common/SearchSelect";
import { useViPhamMinhChungPreview } from "../../hooks/useViPhamMinhChungPreview";
import { apiFetch } from "../../utils/api";
import { readApiError } from "../../utils/apiError";
import {
  canXemThongKeKhoa,
  resolveKhoaCuaToi,
} from "../../utils/viPhamPermissions";

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "6px",
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  let date;
  if (typeof dateString === "string" && dateString.includes("/Date(")) {
    const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
    date = new Date(timestamp);
  } else {
    date = new Date(dateString);
  }
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

/**
 * Thống kê vi phạm của Khoa — màn hình RIÊNG cho Trưởng Khoa.
 *
 * Khoa được suy ra từ tài khoản đăng nhập, không có ô chọn Khoa và không nhận
 * idDonVi từ URL: một Trưởng Khoa chỉ thấy đúng Khoa mình phụ trách. Số liệu toàn
 * trường nằm ở màn hình "Tổng hợp điểm trừ vi phạm".
 *
 * Nguồn dữ liệu (đều lọc theo idNam + idDonVi của Khoa):
 *   GET api/viphamgiangday                — danh sách vi phạm chi tiết
 *   GET api/vi-pham/tong-hop-giang-vien   — điểm trừ từng GV (đã áp trần 15đ)
 *   GET api/vi-pham/diem-tru-khoa         — điểm trừ tập thể (trần 7,5đ)
 */
const QL_ThongKeViPhamKhoa = () => {
  const toast = useRef(null);
  const { user } = useAuth();
  const currentUser = useMemo(() => user || {}, [user]);

  const [namList, setNamList] = useState([]);
  const [donViList, setDonViList] = useState([]);
  const [selectedNam, setSelectedNam] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [chiTietRows, setChiTietRows] = useState([]);
  const [gvRows, setGvRows] = useState([]);
  const [khoaRow, setKhoaRow] = useState(null);

  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = (severity, summary, detail) => {
    if (toast.current)
      toast.current.show({ severity, summary, detail, life: 3000 });
  };

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useViPhamMinhChungPreview((message) => showToast("error", "Lỗi", message));

  /** Khoa của chính người đăng nhập — không cho chọn Khoa khác. */
  const khoaHienTai = useMemo(
    () => resolveKhoaCuaToi(currentUser, donViList),
    [currentUser, donViList],
  );

  const laTruongKhoa = canXemThongKeKhoa(currentUser);
  // Đúng Trưởng Khoa nhưng đơn vị không roll-up ra Khoa nào → lỗi dữ liệu hồ sơ, không phải thiếu quyền
  const thieuKhoaChuQuan = isBootstrapped && laTruongKhoa && !khoaHienTai;
  const khongCoQuyen = isBootstrapped && !laTruongKhoa;

  const filteredChiTiet = useMemo(() => {
    if (!searchQuery.trim()) return chiTietRows;
    const query = searchQuery.toLowerCase();
    return chiTietRows.filter((item) =>
      [
        item.MaNhanVien,
        item.HoTenNhanVien,
        item.MoTa,
        item.NoiDung,
        item.TenNhom,
        item.MinhChung?.TenFileGoc,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query)),
    );
  }, [chiTietRows, searchQuery]);

  const filteredGvRows = useMemo(() => {
    if (!searchQuery.trim()) return gvRows;
    const query = searchQuery.toLowerCase();
    return gvRows.filter((r) =>
      [r.MaNhanVien, r.HoTen]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(query)),
    );
  }, [gvRows, searchQuery]);

  const stats = useMemo(() => {
    const biKyLuat = chiTietRows.filter((r) => r.BiKyLuat).length;
    const tongDiemTru = gvRows.reduce(
      (sum, r) => sum + (Number(r.DiemTruCaNhan) || 0),
      0,
    );
    return {
      soLuot: chiTietRows.length,
      biKyLuat,
      soGv: gvRows.length,
      tongDiemTru,
      diemTruTapThe: khoaRow ? Number(khoaRow.DiemTruTapThe || 0) : 0,
    };
  }, [chiTietRows, gvRows, khoaRow]);

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Cả 3 endpoint đều BẮT BUỘC idNam — thiếu sẽ bị 400. */
  useEffect(() => {
    if (!isBootstrapped) return;
    if (!selectedNam || !khoaHienTai) {
      setChiTietRows([]);
      setGvRows([]);
      setKhoaRow(null);
      setIsLoading(false);
      return;
    }
    loadThongKe(selectedNam, khoaHienTai.IdDonVi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapped, selectedNam, khoaHienTai]);

  const initData = async () => {
    setIsLoading(true);
    try {
      const [namRes, donViRes] = await Promise.all([
        apiFetch("namdanhgia"),
        apiFetch("donvi"),
      ]);

      let years = [];
      if (namRes.ok) {
        const result = await namRes.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        years = [...list].sort((a, b) => b.IdNam - a.IdNam);
        setNamList(years);
      }

      if (donViRes.ok) {
        const result = await donViRes.json();
        setDonViList(result.Items || (Array.isArray(result) ? result : []));
      } else {
        const err = await readApiError(
          donViRes,
          "Không tải được danh sách đơn vị",
        );
        showToast("error", "Lỗi", err.message);
      }

      const currentYear = new Date().getFullYear();
      const matched = years.find((y) => y.IdNam === currentYear);
      setSelectedNam(
        matched
          ? String(matched.IdNam)
          : years.length > 0
            ? String(years[0].IdNam)
            : "",
      );

      if (years.length === 0) {
        showToast(
          "warn",
          "Thiếu dữ liệu",
          "Chưa có năm đánh giá nào trong hệ thống",
        );
      }
    } catch (error) {
      console.error("Lỗi khởi tạo thống kê vi phạm Khoa:", error);
      showToast("error", "Lỗi", "Không thể khởi tạo dữ liệu");
    } finally {
      setIsBootstrapped(true);
      setIsLoading(false);
    }
  };

  const loadThongKe = async (idNam, idKhoa) => {
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({ idNam, idDonVi: idKhoa }).toString();

      const [chiTietRes, gvRes, khoaRes] = await Promise.all([
        // Lưu ý: route này KHÔNG có dấu gạch ngang (khác api/vi-pham/...)
        apiFetch(`viphamgiangday?${qs}`),
        apiFetch(`vi-pham/tong-hop-giang-vien?${qs}`),
        apiFetch(`vi-pham/diem-tru-khoa?${qs}`),
      ]);

      if (chiTietRes.ok) {
        const result = await chiTietRes.json();
        setChiTietRows(result.Items || (Array.isArray(result) ? result : []));
      } else {
        const err = await readApiError(
          chiTietRes,
          "Không tải được danh sách vi phạm chi tiết",
        );
        showToast("error", "Lỗi", err.message);
        setChiTietRows([]);
      }

      if (gvRes.ok) {
        const result = await gvRes.json();
        setGvRows(result.Items || (Array.isArray(result) ? result : []));
      } else {
        const err = await readApiError(
          gvRes,
          "Không tải được tổng hợp điểm trừ cá nhân",
        );
        showToast("error", "Lỗi", err.message);
        setGvRows([]);
      }

      if (khoaRes.ok) {
        const result = await khoaRes.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        // Endpoint trả về mảng kể cả khi lọc 1 Khoa — lấy đúng dòng của Khoa đang xem
        setKhoaRow(
          list.find((k) => String(k.IdDonVi) === String(idKhoa)) ||
            list[0] ||
            null,
        );
      } else {
        const err = await readApiError(
          khoaRes,
          "Không tải được điểm trừ tập thể",
        );
        showToast("error", "Lỗi", err.message);
        setKhoaRow(null);
      }
    } catch (error) {
      console.error("Lỗi tải thống kê vi phạm Khoa:", error);
      showToast("error", "Lỗi", "Lỗi kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (filteredChiTiet.length === 0 && filteredGvRows.length === 0) {
      showToast("warn", "Không có dữ liệu", "Chưa có số liệu để xuất");
      return;
    }

    // Nạp động: thư viện xlsx nặng ~107kB gzip, không nên nằm trong bundle chính
    let downloadExcel;
    try {
      ({ downloadExcel } = await import("../../utils/excelUtils"));
    } catch (error) {
      console.error("Không tải được thư viện xuất Excel:", error);
      showToast("error", "Lỗi", "Không tải được thư viện xuất Excel");
      return;
    }

    const maKhoa = khoaHienTai?.MaDonVi || khoaHienTai?.IdDonVi || "Khoa";

    if (filteredChiTiet.length > 0) {
      downloadExcel({
        data: filteredChiTiet.map((r, i) => ({
          STT: i + 1,
          "Mã cán bộ": r.MaNhanVien || "",
          "Họ tên": r.HoTenNhanVien || "",
          "Đơn vị": r.TenDonVi || "",
          "Nhóm vi phạm": r.TenNhom || "",
          "Loại vi phạm": r.NoiDung || "",
          "Mô tả": r.MoTa || "",
          "Điểm trừ": r.DiemTru != null ? Number(r.DiemTru) : 0,
          "Đã bị xử lý kỷ luật": r.BiKyLuat ? "Có" : "Không",
          "Ngày vi phạm": formatDate(r.NgayViPham),
          "Minh chứng": r.MinhChung?.TenFileGoc || "",
          "Người ghi nhận": r.HoTenNguoiGhiNhan || "",
          "Đơn vị ghi nhận": r.TenDonViGhiNhan || "",
        })),
        fileName: `ViPhamChiTiet_${maKhoa}_Nam${selectedNam}`,
        sheetName: "Vi pham chi tiet",
        colWidths: [
          { wch: 6 },
          { wch: 14 },
          { wch: 26 },
          { wch: 24 },
          { wch: 22 },
          { wch: 36 },
          { wch: 30 },
          { wch: 10 },
          { wch: 14 },
          { wch: 14 },
          { wch: 26 },
          { wch: 22 },
          { wch: 22 },
        ],
      });
    }

    if (filteredGvRows.length > 0) {
      downloadExcel({
        data: filteredGvRows.map((r, i) => ({
          STT: i + 1,
          "Mã cán bộ": r.MaNhanVien || "",
          "Họ tên": r.HoTen || "",
          "Số vi phạm": r.SoViPham ?? 0,
          "Tổng điểm trừ thô":
            r.TongDiemTruTho != null ? Number(r.TongDiemTruTho) : 0,
          "Điểm trừ cá nhân (trần 15)":
            r.DiemTruCaNhan != null ? Number(r.DiemTruCaNhan) : 0,
        })),
        fileName: `DiemTruCaNhan_${maKhoa}_Nam${selectedNam}`,
        sheetName: "Diem tru ca nhan",
        colWidths: [
          { wch: 6 },
          { wch: 14 },
          { wch: 28 },
          { wch: 12 },
          { wch: 18 },
          { wch: 22 },
        ],
      });
    }

    showToast("success", "Thành công", "Đã xuất file Excel");
  };

  return (
    <div className="page-container" style={{ padding: "20px" }}>
      <Toast ref={toast} />

      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#1e293b",
              fontSize: "22px",
              fontWeight: "700",
            }}
          >
            Thống kê vi phạm của Khoa
          </h2>
          <p
            style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            {khoaHienTai
              ? `${khoaHienTai.TenDonVi}${selectedNam ? ` — năm ${selectedNam}` : ""}`
              : "Vi phạm và điểm trừ KPI của Khoa bạn phụ trách"}
          </p>
        </div>

        {khoaHienTai && (
          <button
            className="btn-submit"
            onClick={handleExport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              fontSize: "14px",
            }}
          >
            <i className="fa-solid fa-file-excel"></i> Xuất Excel
          </button>
        )}
      </div>

      {khongCoQuyen || thieuKhoaChuQuan ? (
        <div
          className="modern-table-card"
          style={{ padding: "60px 20px", textAlign: "center", color: "#666" }}
        >
          <i
            className={`fa-solid ${khongCoQuyen ? "fa-lock" : "fa-building-circle-exclamation"}`}
            style={{ fontSize: "56px", color: "#bdc3c7", marginBottom: "15px" }}
          ></i>
          <h3 style={{ color: "#7f8c8d", margin: "0 0 8px 0" }}>
            {khongCoQuyen
              ? "Bạn không có quyền xem màn hình này"
              : "Tài khoản của bạn chưa gắn với Khoa nào"}
          </h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            {khongCoQuyen
              ? "Thống kê vi phạm của Khoa chỉ dành cho Trưởng Khoa."
              : "Đơn vị trong hồ sơ của bạn không thuộc Khoa nào — vui lòng liên hệ quản trị viên."}
          </p>
        </div>
      ) : (
        <>
          {/* Filter Bar — không có ô chọn Khoa: phạm vi lấy từ tài khoản đăng nhập */}
          <div
            style={{
              background: "#fff",
              padding: "16px 20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              marginBottom: "20px",
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={{ minWidth: "160px", flex: "1 1 160px" }}>
              <label style={labelStyle}>Năm đánh giá</label>
              <SearchSelect
                value={selectedNam}
                onChange={(v) => setSelectedNam(v)}
                options={namList.map((n) => ({
                  value: n.IdNam,
                  label: `Năm học ${n.IdNam}`,
                }))}
              />
            </div>

            <div style={{ minWidth: "260px", flex: "2 1 260px" }}>
              <label style={labelStyle}>Tìm kiếm</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Mã / Tên giảng viên"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingRight: "30px" }}
                />
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                ></i>
              </div>
            </div>
          </div>

          {!khoaHienTai ? (
            <div
              className="modern-table-card"
              style={{ padding: "50px", textAlign: "center" }}
            >
              <i
                className="fa-solid fa-circle-notch fa-spin fa-2x"
                style={{ color: "#3498db" }}
              ></i>
              <p style={{ marginTop: "10px", color: "#666" }}>
                Đang xác định Khoa phụ trách
              </p>
            </div>
          ) : (
            <>
              <div className="stat-card-grid">
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-amber">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </div>
                  <div>
                    <div className="stat-label">Lượt vi phạm</div>
                    <div className="stat-value">{stats.soLuot}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-blue">
                    <i className="fa-solid fa-user-xmark"></i>
                  </div>
                  <div>
                    <div className="stat-label">Giảng viên bị ghi nhận</div>
                    <div className="stat-value">{stats.soGv}</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-purple">
                    <i className="fa-solid fa-arrow-down-9-1"></i>
                  </div>
                  <div>
                    <div className="stat-label">Tổng điểm trừ cá nhân</div>
                    <div className="stat-value">
                      {stats.tongDiemTru.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-green">
                    <i className="fa-solid fa-building-columns"></i>
                  </div>
                  <div>
                    <div className="stat-label">Điểm trừ tập thể Khoa</div>
                    <div className="stat-value">
                      {stats.diemTruTapThe.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-amber">
                    <i className="fa-solid fa-gavel"></i>
                  </div>
                  <div>
                    <div className="stat-label">Đã bị xử lý kỷ luật</div>
                    <div className="stat-value">{stats.biKyLuat}</div>
                  </div>
                </div>
              </div>

              <p className="sub-title" style={{ marginBottom: "10px" }}>
                ĐIỂM TRỪ TẬP THỂ CỦA KHOA (TRẦN 7,5 ĐIỂM)
              </p>
              <QL_DiemTruTapTheCard data={khoaRow} isLoading={isLoading} />

              <p className="sub-title" style={{ marginBottom: "10px" }}>
                ĐIỂM TRỪ TỪNG GIẢNG VIÊN (TRẦN 15 ĐIỂM)
              </p>
              <QL_TongHopGiangVienListing
                data={filteredGvRows}
                isLoading={isLoading}
                selectedNam={selectedNam}
              />

              <p className="sub-title" style={{ marginBottom: "10px" }}>
                CƠ CẤU VI PHẠM THEO NHÓM
              </p>
              <QL_ThongKeTheoNhomListing
                data={filteredChiTiet}
                isLoading={isLoading}
              />

              <p className="sub-title" style={{ marginBottom: "10px" }}>
                DANH SÁCH VI PHẠM CHI TIẾT
              </p>
              <QL_ViPhamListing
                data={filteredChiTiet}
                isLoading={isLoading}
                canManage={false}
                selectedNam={selectedNam}
                onPreviewMinhChung={openPreview}
              />
            </>
          )}
        </>
      )}

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.item?.MinhChung?.TenFileGoc}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.item)}
      />
    </div>
  );
};

export default QL_ThongKeViPhamKhoa;
