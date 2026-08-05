import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/CaNhan/TongQuanCaNhan.css";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import {
  fetchKiemTraHopLe,
  fetchPhieuCuaToi,
  formatDiem,
  formatNgay,
  tenTrangThai,
  tinhCuaSoTuDanhGia,
  TRANG_THAI,
  TRANG_THAI_META,
} from "../../utils/phieuApi";
import { duongDanPhieuTuDanhGia } from "../../utils/roles";
import {
  TrangThaiBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";

/** Màu thẻ "hạn tự đánh giá" theo mức độ gấp. */
const MAU_HAN = {
  "chua-mo": { bg: "#f1f5f9", color: "#475569" },
  "dang-mo": { bg: "#ecfdf5", color: "#047857" },
  "da-dong": { bg: "#fef2f2", color: "#b91c1c" },
  "khong-ro": { bg: "#f1f5f9", color: "#64748b" },
};

const mauHanGap = (cuaSo) => {
  if (cuaSo.trangThai === "dang-mo" && cuaSo.soNgayConLai <= 7) {
    return { bg: "#fffbeb", color: "#b45309" };
  }
  return MAU_HAN[cuaSo.trangThai] || MAU_HAN["khong-ro"];
};

/**
 * Trang chủ của người dùng: phiếu năm hiện tại đang ở đâu, được bao nhiêu điểm,
 * còn bao lâu để tự đánh giá và còn thiếu gì trước khi nộp.
 *
 * Route "/" mở cho MỌI vai trò (xem PUBLIC_ROUTES trong config/menuConfig.js), kể
 * cả tài khoản quản trị vốn không có phiếu KPI cá nhân nào. Vì vậy mọi khối đều
 * phải xuống thang êm: không phiếu = trạng thái trống, KHÔNG phải lỗi để báo đỏ.
 */
const TongQuanCaNhan = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = user || {};
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [phieu, setPhieu] = useState(null);
  const [kiemTra, setKiemTra] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  const duongDanPhieu = duongDanPhieuTuDanhGia(currentUser, selectedNam);

  const taiDuLieu = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    setKiemTra(null);

    const phieuCuaToi = await fetchPhieuCuaToi(selectedNam);
    setPhieu(phieuCuaToi);

    // Checklist chỉ có nghĩa khi phiếu còn ở trạng thái Nhập — phiếu đã nộp thì
    // không còn gì để bổ sung, gọi thêm chỉ tốn một vòng mạng.
    if (phieuCuaToi?.IdPhieu && phieuCuaToi.TrangThai === TRANG_THAI.NHAP) {
      try {
        setKiemTra(await fetchKiemTraHopLe(phieuCuaToi.IdPhieu));
      } catch (error) {
        console.error("Lỗi kiểm tra điều kiện nộp phiếu:", error);
        showToast("warn", "Không kiểm tra được điều kiện nộp", error.message);
      }
    }

    setIsLoading(false);
  }, [selectedNam]);

  useEffect(() => {
    if (!dangTaiNam) taiDuLieu();
  }, [dangTaiNam, taiDuLieu]);

  const namDangChon = useMemo(
    () => namList.find((n) => String(n.IdNam) === String(selectedNam)) || null,
    [namList, selectedNam],
  );

  const cuaSo = useMemo(() => tinhCuaSoTuDanhGia(namDangChon), [namDangChon]);

  /**
   * Điểm tạm tính khi server chưa chốt TongDiemTichLuy: cộng dồn điểm tự đánh giá
   * trên từng tiêu chí. Đây là con số GV nhìn thấy trong form, chưa gồm điểm cấp
   * trên chấm lại — nhãn hiển thị phải nói rõ điều đó.
   */
  const diemTamTinh = useMemo(() => {
    const chiTiet = phieu?.ChiTiet || [];
    if (chiTiet.length === 0) return null;
    return chiTiet.reduce(
      (tong, ct) => tong + (Number(ct.DiemTuDanhGia) || 0),
      0,
    );
  }, [phieu]);

  const daChotDiem = phieu?.TongDiemTichLuy != null;
  const thieu = kiemTra?.ThieuMinhChung || [];
  const mauHan = mauHanGap(cuaSo);

  const moPhieu = () => {
    if (duongDanPhieu) navigate(duongDanPhieu);
  };

  return (
    <div className="page-container tq-page">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 className="tq-title">Xin chào, {currentUser.HoTen || "bạn"}</h2>
        <span className="breadcrumb">
          Tổng quan phiếu đánh giá KPI của bạn trong năm học đang chọn
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <select
            className="form-input"
            value={selectedNam}
            onChange={(e) => setSelectedNam(e.target.value)}
            disabled={dangTaiNam}
          >
            {namList.map((n) => (
              <option key={n.IdNam} value={n.IdNam}>
                Năm học {n.IdNam}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-cancel"
          onClick={taiDuLieu}
          disabled={isLoading || dangTaiNam}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
      </div>

      {isLoading || dangTaiNam ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải thông tin phiếu của bạn...
          </div>
        </div>
      ) : (
        <>
          <div className="stat-card-grid">
            <div className="stat-card">
              <div
                className="stat-icon-box"
                style={{
                  // .stat-icon-box không có màu mặc định: luôn phải truyền, nếu
                  // không ô icon sẽ trong suốt khi người dùng chưa có phiếu.
                  background:
                    TRANG_THAI_META[phieu?.TrangThai]?.bg || "#f1f5f9",
                  color: TRANG_THAI_META[phieu?.TrangThai]?.color || "#94a3b8",
                }}
              >
                <i
                  className={`fa-solid ${
                    TRANG_THAI_META[phieu?.TrangThai]?.icon ||
                    "fa-file-circle-question"
                  }`}
                ></i>
              </div>
              <div>
                <div className="stat-label">Trạng thái phiếu</div>
                <div style={{ marginTop: "4px" }}>
                  {phieu ? (
                    <TrangThaiBadge trangThai={phieu.TrangThai} />
                  ) : (
                    <span className="tq-placeholder">Chưa có phiếu</span>
                  )}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box stat-icon-blue">
                <i className="fa-solid fa-star"></i>
              </div>
              <div>
                <div className="stat-label">
                  {daChotDiem ? "Tổng điểm tích lũy" : "Điểm tạm tính"}
                </div>
                <div className="stat-value">
                  {daChotDiem
                    ? formatDiem(phieu.TongDiemTichLuy)
                    : formatDiem(diemTamTinh)}
                </div>
                {!daChotDiem && diemTamTinh != null && (
                  <div className="cd-hint" style={{ marginTop: 0 }}>
                    Chưa gồm điểm cấp trên chấm
                  </div>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box stat-icon-green">
                <i className="fa-solid fa-award"></i>
              </div>
              <div>
                <div className="stat-label">Xếp loại</div>
                <div style={{ marginTop: "4px" }}>
                  {phieu?.XepLoai ? (
                    <XepLoaiBadge xepLoai={phieu.XepLoai} />
                  ) : (
                    <span className="tq-placeholder">Chưa chốt kết quả</span>
                  )}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div
                className="stat-icon-box"
                style={{ background: mauHan.bg, color: mauHan.color }}
              >
                <i className="fa-solid fa-hourglass-half"></i>
              </div>
              <div>
                <div className="stat-label">Hạn tự đánh giá</div>
                <div className="stat-value" style={{ color: mauHan.color }}>
                  {cuaSo.trangThai === "dang-mo"
                    ? `${cuaSo.soNgayConLai} ngày`
                    : cuaSo.trangThai === "da-dong"
                      ? "Đã đóng"
                      : cuaSo.trangThai === "chua-mo"
                        ? "Chưa mở"
                        : "—"}
                </div>
                {cuaSo.ngayDong && (
                  <div className="cd-hint" style={{ marginTop: 0 }}>
                    Hạn chót {formatNgay(cuaSo.ngayDong)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="cd-phieu-header">
            <div className="cd-phieu-top">
              <div style={{ flex: "1 1 320px" }}>
                <div
                  className={`cd-hint tq-status-line ${
                    cuaSo.trangThai === "da-dong"
                      ? "cd-hint-error"
                      : cuaSo.trangThai === "dang-mo"
                        ? ""
                        : "cd-hint-warn"
                  }`}
                  style={{ marginTop: 0 }}
                >
                  <i
                    className="fa-solid fa-calendar-day"
                    style={{ marginRight: "8px" }}
                  ></i>
                  {cuaSo.thongDiep}
                </div>
                {phieu && (
                  <div
                    className="cd-meta-grid"
                    style={{ marginTop: "14px", paddingTop: "14px" }}
                  >
                    <div>
                      <div className="cd-meta-label">Lần đánh giá</div>
                      <div className="cd-meta-value">
                        {phieu.LanDanhGia ?? 1}
                      </div>
                    </div>
                    <div>
                      <div className="cd-meta-label">Ngày gửi</div>
                      <div className="cd-meta-value">
                        {formatNgay(phieu.NgayGui)}
                      </div>
                    </div>
                    <div>
                      <div className="cd-meta-label">Cập nhật gần nhất</div>
                      <div className="cd-meta-value">
                        {formatNgay(phieu.NgayCapNhat)}
                      </div>
                    </div>
                    <div>
                      <div className="cd-meta-label">Số tiêu chí</div>
                      <div className="cd-meta-value">
                        {(phieu.ChiTiet || []).length}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {duongDanPhieu && (
                <button className="btn-submit" onClick={moPhieu}>
                  <i className="fa-solid fa-file-pen"></i>{" "}
                  {phieu ? "Mở phiếu tự đánh giá" : "Bắt đầu tự đánh giá"}
                </button>
              )}
            </div>
          </div>

          <p className="sub-title" style={{ marginBottom: "10px" }}>
            CÒN THIẾU GÌ ĐỂ NỘP
          </p>
          <div
            className="modern-table-card"
            style={{ padding: "18px 20px", marginBottom: "24px" }}
          >
            {!phieu ? (
              <div className="cd-empty" style={{ padding: "40px 20px" }}>
                <i className="fa-solid fa-file-circle-plus"></i>
                {duongDanPhieu ? (
                  <>
                    <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
                      Bạn chưa có phiếu năm {selectedNam}
                    </h3>
                    <p style={{ margin: 0 }}>
                      Phiếu được tạo khi bạn lưu lần đầu trong form tự đánh giá.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
                      Bạn không thuộc diện tự đánh giá KPI
                    </h3>
                    <p style={{ margin: 0 }}>
                      Chức danh nghề nghiệp hiện tại không gắn với biểu mẫu KPI
                      cá nhân nào.
                    </p>
                  </>
                )}
              </div>
            ) : phieu.TrangThai !== TRANG_THAI.NHAP ? (
              <div className="cd-hint tq-status-line" style={{ marginTop: 0 }}>
                <i
                  className="fa-solid fa-circle-check"
                  style={{ color: "#047857", marginRight: "8px" }}
                ></i>
                Phiếu đã nộp, đang <b>{tenTrangThai(phieu.TrangThai)}</b>.
              </div>
            ) : !kiemTra ? (
              <div
                className="cd-hint cd-hint-warn tq-status-line"
                style={{ marginTop: 0 }}
              >
                <i
                  className="fa-solid fa-triangle-exclamation"
                  style={{ marginRight: "8px" }}
                ></i>
                Chưa lấy được kết quả kiểm tra. Bấm "Làm mới" để thử lại.
              </div>
            ) : (
              <>
                <div
                  className={`cd-hint tq-status-line ${
                    kiemTra.CoTheNop ? "" : "cd-hint-warn"
                  }`}
                  style={{
                    marginTop: 0,
                    marginBottom: thieu.length > 0 ? "14px" : 0,
                    color: kiemTra.CoTheNop ? "#047857" : undefined,
                  }}
                >
                  <i
                    className={`fa-solid ${
                      kiemTra.CoTheNop
                        ? "fa-circle-check"
                        : "fa-triangle-exclamation"
                    }`}
                    style={{ marginRight: "8px" }}
                  ></i>
                  {kiemTra.CoTheNop
                    ? `Phiếu đủ điều kiện nộp (${kiemTra.TongSoTieuChi} tiêu chí đã hoàn tất)`
                    : `Còn ${kiemTra.SoTieuChiThieu}/${kiemTra.TongSoTieuChi} tiêu chí chưa xong`}
                </div>

                {/* Phần tử của ThieuMinhChung[] dùng camelCase, khác phần còn lại
                    của DTO — xem chú thích ở fetchKiemTraHopLe. */}
                {thieu.map((item) => (
                  <div className="cd-mc-row" key={item.idChiTiet}>
                    <i
                      className="fa-solid fa-circle-exclamation cd-mc-icon"
                      style={{ color: "#f59e0b" }}
                    ></i>
                    <div className="cd-mc-main">
                      <div
                        className="cd-mc-name"
                        style={{ color: "#0f172a", cursor: "default" }}
                      >
                        {item.tenTieuChi || `Tiêu chí #${item.idTieuChi}`}
                      </div>
                      <div style={{ marginTop: "4px" }}>
                        {item.missingDiemTuDanhGia && (
                          <span
                            className="cd-tc-tag"
                            style={{
                              background: "#fef2f2",
                              color: "#b91c1c",
                              borderColor: "#fecaca",
                            }}
                          >
                            Chưa chấm điểm
                          </span>
                        )}
                        {item.missingMinhChung && (
                          <span
                            className="cd-tc-tag"
                            style={{
                              background: "#fffbeb",
                              color: "#b45309",
                              borderColor: "#fde68a",
                            }}
                          >
                            Thiếu minh chứng
                          </span>
                        )}
                      </div>
                    </div>
                    {duongDanPhieu && (
                      <button
                        type="button"
                        className="cd-mc-act"
                        onClick={moPhieu}
                      >
                        <i className="fa-solid fa-arrow-right"></i> Bổ sung
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              className="cd-chip"
              onClick={() => navigate("/lich-su-danh-gia")}
            >
              <i className="fa-solid fa-clock-rotate-left"></i>
              <span>Danh sách phiếu của tôi</span>
            </button>
            <button
              className="cd-chip"
              onClick={() => navigate("/kho-minh-chung")}
            >
              <i className="fa-solid fa-folder-tree"></i>
              <span>Kho minh chứng</span>
            </button>
            <button
              className="cd-chip"
              onClick={() => navigate("/thong-tin-lien-he")}
            >
              <i className="fa-solid fa-user"></i>
              <span>Hồ sơ của tôi</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TongQuanCaNhan;
