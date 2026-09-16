import React, { useState, useMemo } from "react";
import { formatNgayGio } from "../../../utils/phieuApi";

/**
 * Thẻ hiển thị điểm trung bình đánh giá của sinh viên cho toàn Khoa.
 *
 * Dùng tại tiêu chí đánh giá của sinh viên trên biểu mẫu KPI Khoa để tường minh
 * số liệu căn cứ chấm điểm, bao gồm điểm tổng hợp toàn khoa và bảng chi tiết từng GV.
 *
 * @param {object} props
 * @param {object|null} props.soLieuPhsv Dữ liệu trả về từ tinhThongKePhanHoiKhoa
 * @param {boolean} [props.dangTai=false] Trạng thái đang tải dữ liệu
 */
const DiemTbSinhVienKhoaCard = ({ soLieuPhsv, dangTai = false }) => {
  const [moChiTiet, setMoChiTiet] = useState(false);
  const [tuKhoa, setTuKhoa] = useState("");

  const danhSachGv = soLieuPhsv?.danhSachGv;

  const danhSachLoc = useMemo(() => {
    const list = danhSachGv || [];
    if (!tuKhoa.trim()) return list;
    const query = tuKhoa.trim().toLowerCase();
    return list.filter((gv) => {
      const ten = (gv.HoTen || gv.hoTen || "").toLowerCase();
      const ma = (gv.MaCanBo || gv.maCanBo || "").toLowerCase();
      const donVi = (gv.TenDonVi || gv.tenDonVi || "").toLowerCase();
      return ten.includes(query) || ma.includes(query) || donVi.includes(query);
    });
  }, [danhSachGv, tuKhoa]);

  if (dangTai) {
    return (
      <div className="dv-phsv-box dv-phsv-loading">
        <i className="fa-solid fa-circle-notch fa-spin"></i>
        <span>Đang tải số liệu đánh giá sinh viên của Khoa...</span>
      </div>
    );
  }

  // Trường hợp chưa có đợt chốt hoặc không có số liệu
  if (!soLieuPhsv || !soLieuPhsv.dotChot) {
    return (
      <div className="dv-phsv-box dv-phsv-chua-chot">
        <div className="dv-phsv-chua-chot-header">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            <div className="dv-phsv-chua-chot-title">
              Chưa có đợt chốt điểm phản hồi sinh viên cho năm học này
            </div>
            <div className="dv-phsv-chua-chot-desc">
              Dữ liệu khảo sát ý kiến sinh viên của Khoa cần được Phòng Quản lý chất lượng (P.QLCL) chốt trước khi có điểm trung bình chính thức của Khoa.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    dotChot,
    soGiangVien,
    tongLuotDanhGia,
    tongSoSv,
    diemTrungBinhKhoa,
  } = soLieuPhsv;

  const soSvToanKhoa = tongSoSv ?? Math.round((tongLuotDanhGia || 0) / 12);

  return (
    <div className="dv-phsv-card">
      {/* Header thông tin tổng quan */}
      <div className="dv-phsv-header">
        <div className="dv-phsv-header-left">
          <div className="dv-phsv-icon-wrap">
            <i className="fa-solid fa-users-viewfinder"></i>
          </div>
          <div>
            <h4 className="dv-phsv-title">
              KẾT QUẢ ĐÁNH GIÁ CỦA SINH VIÊN (TOÀN KHOA)
            </h4>
            <p className="dv-phsv-subtitle">
              Nguồn dữ liệu: Snapshot chốt khảo sát ý kiến sinh viên từ Phòng QLCL
            </p>
          </div>
        </div>

        {dotChot?.NgayChot && (
          <div className="dv-phsv-dot-chot-pill" title="Thời điểm chốt kết quả của năm học">
            <i className="fa-solid fa-calendar-check"></i>
            <span>Đã chốt: {formatNgayGio(dotChot.NgayChot)}</span>
            {dotChot.NguoiChotHoTen && (
              <span className="dv-phsv-dot-chot-user">
                ({dotChot.NguoiChotHoTen})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Grid 3 chỉ số chính */}
      <div className="dv-phsv-metrics-grid">
        {/* Chỉ số 1: Điểm trung bình của Khoa */}
        <div className="dv-phsv-metric-cell dv-phsv-metric-primary">
          <div className="dv-phsv-metric-label">
            <i className="fa-solid fa-star"></i> Điểm trung bình của Khoa
          </div>
          <div className="dv-phsv-metric-val-row">
            <span className="dv-phsv-metric-val">
              {diemTrungBinhKhoa != null
                ? Number(diemTrungBinhKhoa).toFixed(2)
                : "---"}
            </span>
            <span className="dv-phsv-metric-max">/ 5.00</span>
          </div>
          <div className="dv-phsv-metric-hint">
            (Trung bình điểm TB của {soGiangVien} giảng viên trong Khoa)
          </div>
        </div>

        {/* Chỉ số 2: Quy mô khảo sát */}
        <div className="dv-phsv-metric-cell">
          <div className="dv-phsv-metric-label">
            <i className="fa-solid fa-chalkboard-user"></i> Giảng viên được khảo sát
          </div>
          <div className="dv-phsv-metric-val-row">
            <span className="dv-phsv-metric-val">{soGiangVien}</span>
            <span className="dv-phsv-metric-unit">giảng viên</span>
          </div>
        </div>

        {/* Chỉ số 3: Số lượt sinh viên tham gia đánh giá */}
        <div className="dv-phsv-metric-cell">
          <div className="dv-phsv-metric-label">
            <i className="fa-solid fa-user-graduate"></i> Số lượt sinh viên tham gia đánh giá
          </div>
          <div className="dv-phsv-metric-val-row">
            <span className="dv-phsv-metric-val">
              {soSvToanKhoa > 0
                ? Number(soSvToanKhoa).toLocaleString("vi-VN")
                : "0"}
            </span>
            <span className="dv-phsv-metric-unit">lượt</span>
          </div>
        </div>
      </div>

      {/* Nút bật/tắt xem danh sách chi tiết */}
      {soGiangVien > 0 && (
        <div className="dv-phsv-toggle-row">
          <button
            type="button"
            className="cd-link-btn dv-phsv-toggle-btn"
            aria-expanded={moChiTiet}
            onClick={() => setMoChiTiet((mo) => !mo)}
          >
            <i
              className={`fa-solid ${moChiTiet ? "fa-chevron-up" : "fa-chevron-down"
                }`}
              aria-hidden="true"
            ></i>
            <span>
              {moChiTiet ? "Thu gọn" : "Xem chi tiết"} điểm sinh viên đánh giá{" "}
              của <b>{soGiangVien}</b> giảng viên trong Khoa
            </span>
          </button>
        </div>
      )}

      {/* Bảng chi tiết từng giảng viên */}
      {moChiTiet && soGiangVien > 0 && (
        <div className="dv-phsv-detail-wrap">
          <div className="dv-phsv-search-bar">
            <div className="dv-phsv-search-input-wrap">
              <i
                className="fa-solid fa-magnifying-glass dv-phsv-search-icon"
                aria-hidden="true"
              ></i>
              <input
                type="text"
                className="form-input dv-phsv-search-input"
                placeholder="Tìm theo tên giảng viên, mã cán bộ, bộ môn..."
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
              />
            </div>
            <div className="dv-phsv-search-count">
              Hiển thị <b>{danhSachLoc.length}</b>/{soGiangVien} giảng viên
            </div>
          </div>

          <div className="dv-phsv-table-container">
            <table className="custom-table dv-phsv-table">
              <colgroup>
                <col className="dv-phsv-col-stt" />
                <col className="dv-phsv-col-ma" />
                <col className="dv-phsv-col-ho-ten" />
                <col className="dv-phsv-col-don-vi" />
                <col className="dv-phsv-col-so-sv" />
                <col className="dv-phsv-col-diem" />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>STT</th>
                  <th>Mã CB</th>
                  <th>Họ và tên giảng viên</th>
                  <th>Bộ môn / Đơn vị</th>
                  <th style={{ textAlign: "center" }}>
                    Số sinh viên đánh giá
                  </th>
                  <th style={{ textAlign: "center" }}>
                    Điểm TB (1-5)
                  </th>
                </tr>
              </thead>
              <tbody>
                {danhSachLoc.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                      Không tìm thấy giảng viên nào khớp với từ khóa tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  danhSachLoc.map((gv, idx) => {
                    const dtb = Number(gv.DiemTrungBinh ?? gv.diemTrungBinh) || 0;
                    const luot = Number(gv.SoLuotDanhGia ?? gv.soLuotDanhGia) || 0;
                    const soSv = gv.soSvDanhGia ?? Math.round(luot / 12);

                    return (
                      <tr key={gv.IdNhanVien || gv.MaCanBo || idx}>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {idx + 1}
                        </td>
                        <td style={{ fontWeight: 600, color: "#1e293b", fontFamily: "ui-monospace, monospace" }}>
                          {gv.MaCanBo || gv.maCanBo || "---"}
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>
                          {gv.HoTen || gv.hoTen || "---"}
                        </td>
                        <td style={{ color: "#475569", fontSize: "13px" }}>
                          {gv.TenDonVi || gv.tenDonVi || "---"}
                        </td>
                        <td style={{ textAlign: "center", color: "#334155" }}>
                          {soSv.toLocaleString("vi-VN")}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "14px",
                              color: "#0f172a",
                            }}
                          >
                            {dtb.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiemTbSinhVienKhoaCard;
