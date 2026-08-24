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
import {
  duyetThamDinh,
  fetchPhieuDetail,
  fetchThamDinhPending,
  formatDiem,
  formatNgay,
  NGUON_TRA_VE,
  putDiemKhoa,
  traVeThamDinh,
} from "../../utils/phieuApi";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { chuCaiDau } from "../../hooks/useNhanVienIndex";
import SearchSelect from "../../components/Common/SearchSelect";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import { NguonTraVeBadge } from "../../components/QuanLyChamDiem/TrangThaiBadge";

const PAGE_SIZE = 20;

/**
 * Hàng đợi thẩm định theo DÒNG TIÊU CHÍ — màn hình làm việc chính của chuyên
 * viên ở giai đoạn 2.
 *
 * Khác "Hàng đợi chờ chấm" (gom theo phiếu, dùng để nhìn tổng quan tiến độ một
 * hồ sơ): ở đây đơn vị công việc là từng dòng. Một chuyên viên được giao tiêu
 * chí X của 40 giảng viên sẽ thấy đúng 40 dòng cần xử lý, không phải mở lần
 * lượt 40 hồ sơ.
 *
 * Server đã lọc theo tieu_chi_don_vi_cham và ĐÃ SẮP XẾP: dòng bị Trưởng khoa
 * trả về thẩm định lại (NguonTraVe = 3) luôn nằm trên đầu vì đó là việc đang
 * chặn cả hồ sơ. KHÔNG sắp xếp lại ở client.
 */
const HangDoiThamDinh = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [rows, setRows] = useState([]);
  const [tongSoDong, setTongSoDong] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("moi_nhat");
  const [timKiem, setTimKiem] = useState("");

  const [dangXuLy, setDangXuLy] = useState(null);
  const [dongSuaDiem, setDongSuaDiem] = useState(null);
  const [dongTraVe, setDongTraVe] = useState(null);

  /**
   * RowVersion của phiếu CHA, khóa theo IdPhieu.
   *
   * ThamDinhPendingDto không mang RowVersion (nó là DTO cấp dòng), nhưng mọi
   * thao tác thẩm định lại cần RowVersion của phiếu. Nạp lười khi cần rồi cập
   * nhật bằng NewRowVersion mà server trả về — nếu không, xử lý dòng thứ hai
   * của cùng một hồ sơ sẽ chắc chắn dính 409.
   */
  const rowVersionRef = useRef(new Map());

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    try {
      const { items, tongSoDong: tong } = await fetchThamDinhPending({
        idNam: selectedNam,
        page,
        pageSize: PAGE_SIZE,
        sortBy,
      });
      setRows(items);
      setTongSoDong(tong);
      // Danh sách vừa nạp lại thì mọi RowVersion đang giữ đều có thể đã cũ.
      rowVersionRef.current.clear();
    } catch (error) {
      console.error("Lỗi tải hàng đợi thẩm định:", error);
      showToast("error", "Lỗi", error.message);
      setRows([]);
      setTongSoDong(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNam, page, sortBy]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [selectedNam, sortBy]);

  const layRowVersion = async (idPhieu) => {
    const daCo = rowVersionRef.current.get(idPhieu);
    if (daCo) return daCo;
    const phieu = await fetchPhieuDetail(idPhieu);
    const rv = phieu?.RowVersion || null;
    if (rv) rowVersionRef.current.set(idPhieu, rv);
    return rv;
  };

  /**
   * Khung chạy chung cho cả ba thao tác cấp dòng: lấy RowVersion, gọi API, gỡ
   * dòng vừa xử lý khỏi bảng và báo lại nếu hồ sơ vừa rời hàng đợi.
   */
  const chayThaoTac = async (dong, thucHien, thongDiepXong) => {
    setDangXuLy(dong.IdChiTiet);
    try {
      const rowVersion = await layRowVersion(dong.IdPhieu);
      const { trangThaiPhieu, newRowVersion } = await thucHien(rowVersion);

      if (newRowVersion) rowVersionRef.current.set(dong.IdPhieu, newRowVersion);

      // Dòng đã rời trạng thái CHO_THAM_DINH nên không còn thuộc hàng đợi này.
      setRows((truoc) => truoc.filter((r) => r.IdChiTiet !== dong.IdChiTiet));

      showToast("success", "Thành công", thongDiepXong);
      if (trangThaiPhieu === 3) {
        showToast(
          "info",
          "Hồ sơ đã đủ điều kiện",
          `Mọi tiêu chí của ${dong.HoTen} đã thẩm định xong — hồ sơ chuyển sang chờ Trưởng khoa duyệt.`,
          6000,
        );
      }
    } catch (error) {
      console.error("Lỗi thao tác thẩm định:", error);
      if (error.isConflict) {
        // Ai đó vừa đụng vào phiếu này — RowVersion đang giữ chắc chắn hỏng.
        rowVersionRef.current.delete(dong.IdPhieu);
        showToast("warn", "Dữ liệu đã thay đổi", error.message, 6000);
        taiDanhSach();
      } else {
        showToast("error", "Lỗi", error.message, 6000);
      }
    } finally {
      setDangXuLy(null);
    }
  };

  const handleDuyet = (dong) =>
    chayThaoTac(
      dong,
      (rowVersion) => duyetThamDinh(dong.IdChiTiet, { rowVersion }),
      `Đã duyệt "${dong.TenTieuChi}" giữ nguyên ${formatDiem(dong.DiemTuDanhGia)} điểm.`,
    );

  const handleSuaDiem = ({ diem, nhanXet }) => {
    const dong = dongSuaDiem;
    setDongSuaDiem(null);
    return chayThaoTac(
      dong,
      (rowVersion) =>
        putDiemKhoa(dong.IdChiTiet, { diem, nhanXet, rowVersion }),
      `Đã chốt "${dong.TenTieuChi}" ở mức ${formatDiem(diem)} điểm.`,
    );
  };

  const handleTraVe = ({ lyDo }) => {
    const dong = dongTraVe;
    setDongTraVe(null);
    return chayThaoTac(
      dong,
      (rowVersion) => traVeThamDinh(dong.IdChiTiet, { lyDo, rowVersion }),
      `Đã trả "${dong.TenTieuChi}" về cho ${dong.HoTen} bổ sung.`,
    );
  };

  const rowsHienThi = useMemo(() => {
    const q = timKiem.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.HoTen, r.MaNhanVien, r.TenDonVi, r.TenTieuChi].some((f) =>
        String(f || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, timKiem]);

  const thongKe = useMemo(
    () => ({
      soDong: rows.length,
      soTraLai: rows.filter((r) => r.NguonTraVe === NGUON_TRA_VE.TRUONG_KHOA)
        .length,
      soGiangVien: new Set(rows.map((r) => r.IdNhanVien)).size,
    }),
    [rows],
  );

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2
          style={{
            margin: 0,
            color: "#1e293b",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          Hàng đợi thẩm định
        </h2>
        <span className="breadcrumb">
          Từng tiêu chí được giao cho đơn vị bạn — duyệt giữ nguyên điểm, sửa
          điểm (bắt buộc lý do) hoặc trả về cho giảng viên bổ sung
        </span>
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

        <div className="cd-field">
          <label className="cd-label">Sắp xếp theo</label>
          <SearchSelect
            value={sortBy}
            onChange={(v) => setSortBy(v)}
            options={[
              { value: "moi_nhat", label: "Mới nhất" },
              { value: "cu_nhat", label: "Cũ nhất" },
            ]}
          />
        </div>

        <div className="cd-field" style={{ flex: "2 1 240px" }}>
          <label className="cd-label">Tìm nhanh</label>
          <input
            type="text"
            className="form-input"
            placeholder="Họ tên, mã cán bộ, tên tiêu chí..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
        </div>

        <button
          className="btn-cancel"
          onClick={taiDanhSach}
          disabled={isLoading}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
      </div>

      <div className="stat-card-grid">
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-amber">
            <i className="fa-solid fa-list-check"></i>
          </div>
          <div>
            <div className="stat-label">Tiêu chí chờ bạn xử lý</div>
            <div className="stat-value">{tongSoDong ?? thongKe.soDong}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-blue">
            <i className="fa-solid fa-user-group"></i>
          </div>
          <div>
            <div className="stat-label">Giảng viên liên quan (trang này)</div>
            <div className="stat-value">{thongKe.soGiangVien}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-purple">
            <i className="fa-solid fa-rotate-left"></i>
          </div>
          <div>
            <div className="stat-label">Trưởng khoa yêu cầu làm lại</div>
            <div className="stat-value">{thongKe.soTraLai}</div>
          </div>
        </div>
      </div>

      {thongKe.soTraLai > 0 && (
        <div className="cd-canh-bao">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            Có <b>{thongKe.soTraLai}</b> tiêu chí bị Trưởng khoa trả về thẩm
            định lại. Những dòng này đang chặn cả hồ sơ nên được xếp lên đầu —
            xử lý trước.
          </span>
        </div>
      )}

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải hàng đợi...
          </div>
        ) : rowsHienThi.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-mug-hot"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không còn tiêu chí nào chờ thẩm định
            </h3>
            <p style={{ margin: 0 }}>
              Mọi tiêu chí thuộc phần việc của đơn vị bạn đã được xử lý, hoặc
              chưa có giảng viên nào nộp phiếu.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="custom-table" style={{ minWidth: "1080px" }}>
              <thead>
                <tr>
                  <th style={{ width: "22%" }}>Giảng viên</th>
                  <th style={{ width: "26%" }}>Tiêu chí</th>
                  <th style={{ width: "10%", textAlign: "center" }}>
                    GV tự chấm
                  </th>
                  <th style={{ width: "10%", textAlign: "center" }}>
                    Minh chứng
                  </th>
                  <th style={{ width: "10%" }}>Ngày nộp</th>
                  <th style={{ width: "22%", textAlign: "center" }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((r) => {
                  const dangChay = dangXuLy === r.IdChiTiet;
                  const traLaiBoiTk = r.NguonTraVe === NGUON_TRA_VE.TRUONG_KHOA;
                  return (
                    <tr
                      key={r.IdChiTiet}
                      className={traLaiBoiTk ? "cd-row-uu-tien" : undefined}
                    >
                      <td>
                        <div className="teacher-avatar-wrapper">
                          <div className="teacher-avatar">
                            {chuCaiDau(r.HoTen)}
                          </div>
                          <div>
                            <b style={{ color: "#0f172a", display: "block" }}>
                              {r.HoTen}
                            </b>
                            {r.MaNhanVien && (
                              <span className="code-pill">{r.MaNhanVien}</span>
                            )}
                            <div style={{ fontSize: "12px", color: "#64748b" }}>
                              {r.TenDonVi || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <b style={{ color: "#0f172a", display: "block" }}>
                          {r.TenTieuChi}
                        </b>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {r.TenNhom || "—"} · tối đa {formatDiem(r.DiemToiDa)}
                        </div>
                        {traLaiBoiTk && (
                          <div style={{ marginTop: "6px" }}>
                            <NguonTraVeBadge nguonTraVe={r.NguonTraVe} />
                            {r.LyDoTraVe && (
                              <div
                                className="cd-yc-lydo"
                                style={{ marginTop: "4px" }}
                              >
                                {r.LyDoTraVe}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          fontWeight: 700,
                          color: "#334155",
                        }}
                      >
                        {formatDiem(r.DiemTuDanhGia)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {/* Tiêu chí bắt buộc minh chứng mà nộp 0 tệp là dấu hiệu
                            cần trả về — làm nổi để chuyên viên khỏi bỏ sót. */}
                        <span
                          className="tag-badge"
                          style={
                            r.BatBuocMinhChung && !r.SoMinhChung
                              ? { background: "#fef2f2", color: "#b91c1c" }
                              : undefined
                          }
                        >
                          {r.SoMinhChung || 0}
                          {r.BatBuocMinhChung ? " (bắt buộc)" : ""}
                        </span>
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {formatNgay(r.NgayGui)}
                      </td>
                      <td>
                        <div className="cd-row-actions">
                          <button
                            className="btn-submit"
                            disabled={dangChay}
                            onClick={() => handleDuyet(r)}
                            title="Chốt tiêu chí ở đúng mức điểm giảng viên tự kê khai"
                          >
                            {dangChay ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fa-solid fa-check"></i>
                            )}{" "}
                            Duyệt
                          </button>
                          <button
                            className="btn-cancel"
                            disabled={dangChay}
                            onClick={() => setDongSuaDiem(r)}
                            title="Chốt tiêu chí ở mức điểm khác, bắt buộc nêu lý do"
                          >
                            <i className="fa-solid fa-pen"></i> Sửa điểm
                          </button>
                          <button
                            className="cd-btn-tra-ve"
                            disabled={dangChay}
                            onClick={() => setDongTraVe(r)}
                            title="Trả tiêu chí về cho giảng viên bổ sung"
                          >
                            <i className="fa-solid fa-rotate-left"></i> Trả về
                          </button>
                          <button
                            className="cd-link-btn"
                            onClick={() =>
                              navigate(`/quan-ly/phieu/${r.IdPhieu}`)
                            }
                            title="Mở toàn bộ hồ sơ để xem minh chứng và các tiêu chí khác"
                          >
                            <i className="fa-solid fa-folder-open"></i> Mở hồ sơ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="cd-pager">
          <span>
            Trang <strong style={{ color: "#172033" }}>{page}</strong>
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className="table-pager-btn"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="fa-solid fa-chevron-left"></i> Trước
            </button>
            <button
              className="table-pager-btn"
              disabled={rows.length < PAGE_SIZE || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      {dongSuaDiem && (
        <SuaDiemModal
          dong={dongSuaDiem}
          dangGui={dangXuLy === dongSuaDiem.IdChiTiet}
          onDong={() => setDongSuaDiem(null)}
          onXacNhan={handleSuaDiem}
        />
      )}

      {dongTraVe && (
        <LyDoModal
          tieuDe="Trả tiêu chí về cho giảng viên"
          moTa={`Tiêu chí "${dongTraVe.TenTieuChi}" của ${dongTraVe.HoTen} sẽ quay lại để giảng viên bổ sung. Các tiêu chí khác của hồ sơ giữ nguyên tiến độ và hồ sơ KHÔNG bị đưa về trạng thái nháp.`}
          nhanLyDo="Lý do trả về"
          goiYLyDo="VD: Thiếu bìa tạp chí và trang mục lục cho bài báo số 2..."
          nhanXacNhan="Trả về giảng viên"
          dangGui={dangXuLy === dongTraVe.IdChiTiet}
          onDong={() => setDongTraVe(null)}
          onXacNhan={handleTraVe}
        />
      )}
    </div>
  );
};

/**
 * Nhập điểm mới cho một dòng.
 *
 * Server bắt buộc nhận xét khi điểm khác mức giảng viên tự kê khai (409
 * THIEU_LY_DO) — đây là nguồn khiếu nại lớn nhất của quy trình cũ nên chặn ngay
 * tại form thay vì để người dùng gửi lên rồi mới biết.
 */
const SuaDiemModal = ({ dong, dangGui, onDong, onXacNhan }) => {
  const [diem, setDiem] = useState(dong.DiemTuDanhGia ?? "");
  const [nhanXet, setNhanXet] = useState("");
  const [loi, setLoi] = useState("");

  const lech =
    diem !== "" &&
    dong.DiemTuDanhGia != null &&
    Number(diem) !== Number(dong.DiemTuDanhGia);

  const handleXacNhan = () => {
    if (diem === "") return setLoi("Chưa nhập điểm.");
    const so = Number(diem);
    if (isNaN(so)) return setLoi("Điểm phải là số.");
    if (so < 0) return setLoi("Điểm không được âm.");
    if (dong.DiemToiDa != null && so > Number(dong.DiemToiDa)) {
      return setLoi(`Điểm vượt mức tối đa (${formatDiem(dong.DiemToiDa)}).`);
    }
    if (lech && !nhanXet.trim()) {
      return setLoi(
        "Điểm khác mức giảng viên tự kê khai — bắt buộc ghi lý do điều chỉnh.",
      );
    }
    setLoi("");
    onXacNhan({ diem: so, nhanXet: nhanXet.trim() || null });
  };

  return (
    <div className="modal-overlay" onClick={dangGui ? undefined : onDong}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sửa điểm và chốt tiêu chí</h3>
          <button className="close-btn" onClick={onDong} disabled={dangGui}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginTop: 0, fontSize: "14px", color: "#475569" }}>
            <b>{dong.TenTieuChi}</b> — {dong.HoTen}
            <br />
            Giảng viên tự chấm <b>{formatDiem(dong.DiemTuDanhGia)}</b> / tối đa{" "}
            {formatDiem(dong.DiemToiDa)}.
          </p>

          {dong.NhanXetTuDanhGia && (
            <div className="cd-box" style={{ marginBottom: "15px" }}>
              <div className="cd-box-title">Giảng viên ghi chú</div>
              <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                {dong.NhanXetTuDanhGia}
              </p>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "15px" }}>
            <label>
              Điểm thẩm định <span className="text-red">*</span>
            </label>
            <input
              type="number"
              min="0"
              max={dong.DiemToiDa ?? undefined}
              className="cd-diem-input"
              value={diem}
              disabled={dangGui}
              onChange={(e) => {
                setDiem(e.target.value);
                if (loi) setLoi("");
              }}
            />
          </div>

          <div className="form-group">
            <label>
              Lý do điều chỉnh {lech && <span className="text-red">*</span>}
            </label>
            <textarea
              className="cd-textarea"
              rows={3}
              value={nhanXet}
              disabled={dangGui}
              placeholder="VD: Giảm 3đ — thiếu minh chứng cho 2 lớp học phần."
              onChange={(e) => {
                setNhanXet(e.target.value);
                if (loi) setLoi("");
              }}
            />
            {lech && (
              <div className="cd-hint cd-hint-warn">
                <i className="fa-solid fa-circle-info"></i> Điểm khác mức giảng
                viên tự kê khai nên bắt buộc ghi lý do.
              </div>
            )}
          </div>

          {loi && (
            <div className="cd-hint cd-hint-error">
              <i className="fa-solid fa-circle-exclamation"></i> {loi}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onDong} disabled={dangGui}>
            Hủy
          </button>
          <button
            className="btn-submit"
            onClick={handleXacNhan}
            disabled={dangGui}
          >
            {dangGui ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check"></i> Chốt tiêu chí
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HangDoiThamDinh;
