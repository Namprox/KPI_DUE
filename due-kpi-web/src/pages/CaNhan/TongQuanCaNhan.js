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
  laDongBiTraVe,
  locDongChoBoSung,
  moTaHanNop,
  nhanHanNop,
  parseNgay,
  tenTrangThai,
  tinhCuaSoTuDanhGia,
  TRANG_THAI,
  TRANG_THAI_META,
} from "../../utils/phieuApi";
import { duongDanPhieuTuDanhGia, hasRole, ROLE_SETS } from "../../utils/roles";
import SearchSelect from "../../components/Common/SearchSelect";
import ThieuTieuChiChecklist from "../../components/DanhGia/ThieuTieuChiChecklist";
import {
  TrangThaiBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";
import TongQuanKhoa from "../../components/QuanLyChamDiem/TongQuanKhoa";

/** Màu thẻ hạn theo mức độ gấp. */
const MAU_HAN = {
  "chua-mo": { bg: "#f1f5f9", color: "#475569" },
  "dang-mo": { bg: "#ecfdf5", color: "#047857" },
  "sap-het": { bg: "#fffbeb", color: "#b45309" },
  "da-dong": { bg: "#fef2f2", color: "#b91c1c" },
  "khong-ro": { bg: "#f1f5f9", color: "#64748b" },
};

const MOT_NGAY_MS = 24 * 60 * 60 * 1000;

/**
 * Số ngày còn lại tính từ một mốc hạn do SERVER cấp (HanNop).
 *
 * Đây chỉ là định dạng hiển thị, không phải suy diễn hạn: cột hạn trong DB là
 * DATE nên phải kéo đến hết ngày trước khi trừ, nếu không người dùng mất trắng
 * ngày cuối.
 */
const soNgayToiHan = (han) => {
  const ngay = parseNgay(han);
  if (!ngay) return null;
  const hetNgay = new Date(ngay);
  hetNgay.setHours(23, 59, 59, 999);
  return Math.ceil((hetNgay.getTime() - Date.now()) / MOT_NGAY_MS);
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
  // Khối Khoa tự quản lý vòng đời dữ liệu của nó; nút "Làm mới" chung chỉ đẩy
  // token này sang để nó tải lại, thay vì kéo state của Khoa lên trang cha.
  const [lanLamMoi, setLanLamMoi] = useState(0);

  const laTruongKhoa = hasRole(ROLE_SETS.TRUONG_KHOA, currentUser);

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

    // Gọi cho MỌI phiếu, không chỉ phiếu đang ở trạng thái Nhập: từ khi hạn được
    // chọn theo giai đoạn, đây là chỗ duy nhất biết hạn hiệu lực và cờ QuaHan
    // của phiếu ở trạng thái 2 (vòng lặp trả về). SoTieuChiThieu cũng chỉ đếm
    // dòng đang chờ kê khai nên dùng chung được cho cả nộp lại.
    if (phieuCuaToi?.IdPhieu) {
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

  /**
   * Cửa sổ tự đánh giá theo cấu hình NĂM — chỉ dùng khi CHƯA có phiếu.
   * Có phiếu rồi thì hạn hiệu lực do server chọn theo giai đoạn và chỉ đọc được
   * ở kiem-tra-hop-le; tự tính lại sẽ báo "đã đóng" cho cả người đang trong hạn
   * bổ sung theo yêu cầu thẩm định.
   */
  const cuaSoNam = useMemo(
    () => tinhCuaSoTuDanhGia(namDangChon),
    [namDangChon],
  );

  /**
   * Chủ phiếu còn việc phải làm không.
   *
   * Nộp lại KHÔNG đưa phiếu ra khỏi trạng thái 2 (đúng thiết kế — không phải
   * vòng đánh giá mới) nên `HanNop` vẫn là hạn thẩm định và vẫn còn giá trị.
   * Nhưng lúc đó bóng đã sang chân đơn vị thẩm định, hiện tiếp một cái hạn chỉ
   * khiến người dùng tưởng mình còn phải nộp gì nữa.
   */
  const conViecCuaChuPhieu =
    !phieu ||
    Number(phieu.TrangThai) === TRANG_THAI.NHAP ||
    locDongChoBoSung(phieu.ChiTiet || []).length > 0;

  const quaHan = kiemTra
    ? Boolean(kiemTra.QuaHan)
    : cuaSoNam.trangThai === "da-dong";

  // Nhãn tự đổi theo giai đoạn: "Hạn tự đánh giá" ở trạng thái 1, "Hạn bổ sung
  // theo yêu cầu thẩm định" ở trạng thái 2.
  const nhanHan = kiemTra ? nhanHanNop(kiemTra.TrangThai) : "Hạn tự đánh giá";
  const thongDiepHan = kiemTra ? moTaHanNop(kiemTra) : cuaSoNam.thongDiep;

  const hanNop = kiemTra ? kiemTra.HanNop : cuaSoNam.ngayDong;
  const soNgayConLai = quaHan ? null : soNgayToiHan(hanNop);

  const mauHan = !conViecCuaChuPhieu
    ? MAU_HAN["dang-mo"]
    : quaHan
      ? MAU_HAN["da-dong"]
      : !kiemTra && cuaSoNam.trangThai === "chua-mo"
        ? MAU_HAN["chua-mo"]
        : soNgayConLai == null
          ? MAU_HAN["khong-ro"]
          : soNgayConLai <= 7
            ? MAU_HAN["sap-het"]
            : MAU_HAN["dang-mo"];

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

  /**
   * Tiêu chí đơn vị thẩm định đã trả về cho chính người đang xem (NguonTraVe = 2).
   * Chỉ dòng có yêu cầu trả về ĐANG MỞ mới còn giữ trường này — nộp lại xong là
   * server xóa, nên không cần lọc thêm theo TrangThaiDong.
   *
   * NguonTraVe = 3 (Trưởng khoa trả đơn vị thẩm định làm lại) KHÔNG thuộc việc
   * của giảng viên, đừng gộp vào đây.
   */
  const dongBiTraVe = useMemo(
    () => (phieu?.ChiTiet || []).filter(laDongBiTraVe),
    [phieu],
  );

  const daChotDiem = phieu?.TongDiemTichLuy != null;
  const thieu = kiemTra?.ThieuMinhChung || [];

  const moPhieu = () => {
    if (duongDanPhieu) navigate(duongDanPhieu);
  };

  return (
    <div className="page-container tq-page">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 className="tq-title">Xin chào, {currentUser.HoTen || "bạn"}</h2>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={(v) => setSelectedNam(v)}
            options={namList.map((n) => ({
              value: n.IdNam,
              label: `Năm học ${n.IdNam}`,
            }))}
            disabled={dangTaiNam}
          />
        </div>

        <button
          className="btn-cancel"
          onClick={() => {
            taiDuLieu();
            setLanLamMoi((n) => n + 1);
          }}
          disabled={isLoading || dangTaiNam}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
      </div>

      {/* Đặt TRÊN phần cá nhân và ngoài nhánh isLoading: với Trưởng khoa thì số
          liệu Khoa mới là việc hằng ngày, và để ngoài thì hai nửa tải song song
          thay vì nửa dưới phải chờ phiếu cá nhân xong. */}
      {laTruongKhoa && !dangTaiNam && (
        <TongQuanKhoa
          idNam={selectedNam}
          idDonVi={currentUser.IdDonVi}
          reloadKey={lanLamMoi}
        />
      )}

      {laTruongKhoa && <p className="sub-title">PHIẾU KPI CỦA BẠN</p>}

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
              {/* Không còn việc thì thẻ này nói về tình trạng chứ không nói về
                  hạn: hạn của giai đoạn vẫn còn hiệu lực nhưng không phải việc
                  của chủ phiếu nữa. */}
              {conViecCuaChuPhieu ? (
                <div>
                  <div className="stat-label">{nhanHan}</div>
                  <div className="stat-value" style={{ color: mauHan.color }}>
                    {quaHan
                      ? "Đã đóng"
                      : !kiemTra && cuaSoNam.trangThai === "chua-mo"
                        ? "Chưa mở"
                        : !hanNop
                          ? "Không giới hạn"
                          : `${soNgayConLai} ngày`}
                  </div>
                  {hanNop && (
                    <div className="cd-hint" style={{ marginTop: 0 }}>
                      Hạn chót {formatNgay(hanNop)}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="stat-label">Việc của bạn</div>
                  <div className="stat-value" style={{ color: "#047857" }}>
                    Đã xong
                  </div>
                  <div className="cd-hint" style={{ marginTop: 0 }}>
                    Phiếu đang {tenTrangThai(phieu?.TrangThai).toLowerCase()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {dongBiTraVe.length > 0 && (
            <div className="cd-canh-bao tq-canh-bao-tra-ve">
              <i className="fa-solid fa-rotate-left"></i>
              <span>
                Đơn vị thẩm định đã trả về <b>{dongBiTraVe.length} tiêu chí</b>{" "}
                cần bạn bổ sung rồi nộp lại. Các tiêu chí khác vẫn giữ nguyên
                tiến độ.
                {/* Hạn chặn việc bổ sung là hạn THẨM ĐỊNH chứ không phải hạn tự
                    đánh giá — QuaHan của kiem-tra-hop-le đã phản ánh đúng hạn
                    của giai đoạn phiếu đang đứng. */}
                {quaHan && (
                  <>
                    {" "}
                    {thongDiepHan} nên bạn cần được gia hạn riêng mới sửa được —
                    liên hệ đơn vị quản lý.
                  </>
                )}
              </span>
            </div>
          )}

          <div className="cd-phieu-header">
            <div className="cd-phieu-top">
              <div style={{ flex: "1 1 320px" }}>
                {conViecCuaChuPhieu ? (
                  <div
                    className={`cd-hint tq-status-line ${
                      quaHan
                        ? "cd-hint-error"
                        : !kiemTra && cuaSoNam.trangThai !== "dang-mo"
                          ? "cd-hint-warn"
                          : ""
                    }`}
                    style={{ marginTop: 0 }}
                  >
                    <i
                      className="fa-solid fa-calendar-day"
                      style={{ marginRight: "8px" }}
                    ></i>
                    {thongDiepHan}
                  </div>
                ) : (
                  <div className="cd-hint tq-status-line" style={{ marginTop: 0 }}>
                    <i
                      className="fa-solid fa-circle-check"
                      style={{ color: "#047857", marginRight: "8px" }}
                    ></i>
                    Bạn đã nộp xong phần của mình. Phiếu đang{" "}
                    <b>{tenTrangThai(phieu?.TrangThai).toLowerCase()}</b>.
                  </div>
                )}
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
                  {dongBiTraVe.length > 0
                    ? `Bổ sung ${dongBiTraVe.length} tiêu chí`
                    : phieu
                      ? "Mở phiếu tự đánh giá"
                      : "Bắt đầu tự đánh giá"}
                </button>
              )}
            </div>
          </div>

          <p className="sub-title" style={{ marginBottom: "10px" }}>
            {dongBiTraVe.length > 0 ? "CẦN BẠN BỔ SUNG" : "CÒN THIẾU GÌ ĐỂ NỘP"}
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
            ) : dongBiTraVe.length > 0 ? (
              <>
                <div
                  className="cd-hint cd-hint-warn tq-status-line"
                  style={{ marginTop: 0, marginBottom: "14px" }}
                >
                  <i
                    className="fa-solid fa-rotate-left"
                    style={{ marginRight: "8px" }}
                  ></i>
                  {dongBiTraVe.length} tiêu chí bị trả về — sửa xong bấm{" "}
                  <b>Nộp lại</b> trong phiếu tự đánh giá
                </div>

                {dongBiTraVe.map((ct) => (
                  <div className="cd-mc-row" key={ct.IdChiTiet}>
                    <i
                      className="fa-solid fa-circle-exclamation cd-mc-icon"
                      style={{ color: "#ea580c" }}
                    ></i>
                    <div className="cd-mc-main">
                      <div
                        className="cd-mc-name"
                        style={{ color: "#0f172a", cursor: "default" }}
                      >
                        {ct.TenTieuChi || `Tiêu chí #${ct.IdTieuChi}`}
                      </div>
                      {ct.LyDoTraVe && (
                        <div className="tq-tra-ve-ly-do">{ct.LyDoTraVe}</div>
                      )}
                      <div className="cd-mc-meta">
                        {ct.TenDonViThamDinh || "Đơn vị thẩm định"} trả về
                        {ct.NgayTraVe ? ` ngày ${formatNgay(ct.NgayTraVe)}` : ""}
                        {ct.SoLanTraVe > 1 ? ` · lần thứ ${ct.SoLanTraVe}` : ""}
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

                {/* Cùng schema với missingItems của 422 /submit và /nop-lai nên
                    dùng chung đúng một component checklist. */}
                <ThieuTieuChiChecklist
                  items={thieu}
                  onMo={duongDanPhieu ? moPhieu : undefined}
                />

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
