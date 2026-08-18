import React, { useState } from "react";
import {
  chuanHoaFileMinhChung,
  ACCEPT_PDF,
} from "../../../utils/minhChungPhieuApi";
import { formatNgay as formatNgayChung } from "../../../utils/phieuApi";
import LichSuChamDong from "../../QuanLyChamDiem/LichSuChamDong";

/**
 * Khác formatNgay dùng chung ở chỗ trả chuỗi RỖNG thay vì "—": dòng meta của
 * minh chứng NCKH bên dưới dựa vào chuỗi rỗng để quyết định có hiện dấu • và có
 * hiện cả dòng hay không — trả "—" sẽ làm mọi minh chứng mọc thêm một gạch ngang.
 */
const formatNgay = (value) => {
  const ngay = formatNgayChung(value);
  return ngay === "—" ? "" : ngay;
};

/**
 * Khối "lịch sử vòng trước" của một tiêu chí đang chờ chủ phiếu sửa.
 *
 * MỞ SẴN: người đang phải sửa cần đọc ngay vòng trước bị chấm bao nhiêu và
 * chuyên viên nhận xét gì — bắt bấm thêm một nút nữa mới thấy thì gần như không
 * ai mở. Vẫn giữ nút thu gọn cho tiêu chí bị trả về nhiều lần, lúc đó danh sách
 * lượt chấm dài và đẩy ô nhập điểm xuống dưới màn hình.
 *
 * KHÔNG truyền `chiTiet` xuống LichSuChamDong: khối này chỉ dựng cho dòng chấm
 * tay (tiêu chí tự động không bao giờ chờ chủ phiếu bổ sung), mà tham số đó chỉ
 * dùng để nhận diện lượt chấm của máy.
 */
const LichSuDongTruoc = ({ lichSu = [], dangTai = false }) => {
  const [moRong, setMoRong] = useState(true);

  if (dangTai) {
    return (
      <div className="pl2-lich-su-tai">
        <i className="fa-solid fa-spinner fa-spin"></i> Đang tải lịch sử chấm
        điểm...
      </div>
    );
  }
  if (lichSu.length === 0) return null;

  const soLuot = lichSu.reduce(
    (tong, nhom) => tong + (nhom.Entries?.length || 0),
    0,
  );

  return (
    <div className="pl2-lich-su">
      <button
        type="button"
        className="pl2-lich-su-nut"
        onClick={() => setMoRong((truoc) => !truoc)}
      >
        <i
          className={`fa-solid ${moRong ? "fa-chevron-up" : "fa-chevron-down"}`}
        ></i>{" "}
        Lịch sử chấm điểm trước đó ({soLuot})
        <span className="pl2-lich-su-phu">
          {moRong ? "— thu gọn" : "— xem"}
        </span>
      </button>
      {moRong && (
        <div className="pl2-lich-su-noi-dung">
          <LichSuChamDong lichSu={lichSu} />
        </div>
      )}
    </div>
  );
};

const formatDiem = (value) => {
  const n = Number(value) || 0;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
};

/**
 * Biểu mẫu tự đánh giá.
 *
 * Từ quy trình 4 giai đoạn, việc khóa/mở ô nhập tính theo TỪNG DÒNG chứ không
 * theo trạng thái phiếu: sau khi nộp, một tiêu chí bị trả về vẫn sửa được trong
 * khi các tiêu chí khác đang chờ thẩm định thì không. Vì vậy component KHÔNG tự
 * suy diễn từ trạng thái phiếu nữa mà nhận hai hàm từ trang cha:
 *
 *   laDongMoNhap(tc)    → tiêu chí này có cho sửa điểm / minh chứng không
 *   thongTinDong(tc)    → { trangThaiDong, canBoSung, nguonTraVe, lyDoTraVe,
 *                          ngayTraVe, soLanTraVe } để hiện badge và yêu cầu bổ
 *                          sung; trả null thì bỏ qua
 *   lichSuDong(tc)      → lịch sử chấm của dòng, đã gom theo (LanDanhGia, Cap).
 *                          Chỉ dựng cho dòng đang chờ bổ sung: người phải sửa
 *                          cần biết vòng trước bị chấm bao nhiêu và vì sao
 *
 * `hanhDong` là toàn bộ cụm nút ở góc phải header. Trang cha quyết định nộp /
 * nộp lại / hủy nộp vì mỗi luồng có điều kiện riêng — form không đoán hộ.
 */
const DanhGiaPhuLuc2Form = ({
  criteriaList,
  // Danh sách dùng để đếm tiến độ ở header. Mặc định trùng criteriaList; trang
  // cha truyền danh sách ĐẦY ĐỦ khi đang lọc bớt tiêu chí, nếu không thanh tiến
  // độ sẽ báo "1/1 tiêu chí" trong khi tổng điểm bên cạnh vẫn của cả phiếu.
  tieuChiThongKe,
  formData,
  autoScores = {},
  tongDiemCoBan,
  lyDoTraVe,
  laDongMoNhap = () => false,
  thongTinDong = () => null,
  lichSuDong = () => [],
  dangTaiLichSu = false,
  hanhDong = null,
  onScoreChange,
  onTextChange,
  onFileChange,
  onRemoveFile,
  onNckhChange,
  onRemoveNckh,
  isKhoaEvaluating = false,
  // Có truyền thì chip tệp đã lưu bấm được để xem trước; không truyền thì chip chỉ hiển thị
  onXemMinhChung,
}) => {
  const groupedCriteria = criteriaList.reduce((groups, item) => {
    const group = groups[item.TenNhom] || [];
    group.push(item);
    groups[item.TenNhom] = group;
    return groups;
  }, {});

  // Current score of a criterion: auto score, or the manually entered/selected score
  const getScoreOf = (tc) => {
    const autoInfo = autoScores[tc.IdTieuChi];
    if (autoInfo) return Number(autoInfo.DiemTuDong || 0);
    const v = formData[tc.IdTieuChi]?.DiemTuDanhGia;
    return v == null || v === "" ? null : Number(v);
  };

  const danhSachThongKe = tieuChiThongKe || criteriaList;
  const totalCount = danhSachThongKe.length;
  const answeredCount = danhSachThongKe.filter(
    (tc) => getScoreOf(tc) != null,
  ).length;
  const progressPercent =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const getGroupStats = (items) => {
    let sum = 0;
    let max = 0;
    items.forEach((tc) => {
      max += Number(tc.DiemToiDa) || 0;
      const s = getScoreOf(tc);
      if (s != null) sum += s;
    });
    return { sum, max };
  };

  return (
    <div className="pl2-container">
      <div className="pl2-header">
        <div className="pl2-header-score">
          <span className="pl2-header-score-label">
            <i className="fa-solid fa-chart-line"></i> TỔNG ĐIỂM TÍCH LŨY
          </span>

          <div className="pl2-header-score-row">
            <div className="pl2-header-score-value">
              {tongDiemCoBan.toFixed(2)}
              <span className="pl2-header-score-unit">điểm</span>
            </div>
          </div>

          <div className="pl2-header-score-note">
            (Bao gồm Điểm cơ bản + Điểm vượt trội)
          </div>

          <div className="pl2-progress">
            <div className="pl2-progress-bar">
              <div
                className="pl2-progress-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="pl2-progress-label">
              Đã đánh giá <b>{answeredCount}</b>/{totalCount} tiêu chí
            </div>
          </div>
        </div>

        <div className="pl2-header-actions">{hanhDong}</div>
      </div>

      {lyDoTraVe && (
        <div className="pl2-return-note">
          <i className="fa-solid fa-circle-info"></i>
          <div>
            <b>Nhận xét từ Khoa:</b> {lyDoTraVe}
          </div>
        </div>
      )}

      {Object.keys(groupedCriteria).map((groupName, gIndex) => {
        const items = groupedCriteria[groupName];
        const { sum, max } = getGroupStats(items);
        return (
          <div key={groupName} className="pl2-group">
            <div className="pl2-group-header">
              <h3 className="pl2-group-title">{groupName}</h3>
              <span className="pl2-group-score">
                <i className="fa-solid fa-star"></i>{" "}
                {sum % 1 === 0 ? sum : sum.toFixed(2)}
                <span className="pl2-group-score-max">/ {max}đ</span>
              </span>
            </div>
            <div className="pl2-group-items">
              {items.map((tc, index) => {
                const autoInfo = autoScores[tc.IdTieuChi];
                const currentScore = getScoreOf(tc);
                const hasScore = currentScore != null;

                const criteriaHeader = (
                  <div className="pl2-criteria-header">
                    <div className="pl2-criteria-header-main">
                      <span className="pl2-criteria-title">
                        {gIndex + 1}.{index + 1}. {tc.TenTieuChi}
                      </span>
                      {tc.MoTa && (
                        <div className="pl2-criteria-desc">{tc.MoTa}</div>
                      )}
                    </div>
                    <div className="pl2-criteria-header-side">
                      {hasScore && (
                        <span
                          className={`pl2-criteria-score ${autoInfo && currentScore === 0 ? "pl2-criteria-score-zero" : ""}`}
                        >
                          <i
                            className={`fa-solid ${autoInfo && currentScore === 0 ? "fa-circle-minus" : "fa-circle-check"}`}
                          ></i>{" "}
                          {formatDiem(currentScore)}đ
                        </span>
                      )}
                      <span className="pl2-criteria-max">
                        Tối đa: {tc.DiemToiDa}đ
                      </span>
                    </div>
                  </div>
                );

                // Auto-scored criterion (LoaiNguonDiem = 2): system-computed, read-only
                if (autoInfo) {
                  const congThuc = (
                    autoInfo.CongThucTongHop || ""
                  ).toUpperCase();
                  const isPhsv = congThuc.startsWith("PHSV");
                  const isNckh = congThuc.startsWith("NCKH");
                  const isVpgd = congThuc.startsWith("VPGD");
                  const autoNote = isNckh
                    ? "Điểm được tính tự động dựa vào dữ liệu từ website NCKH của trường"
                    : isPhsv
                      ? "Điểm được tính tự động dựa vào dữ liệu đánh giá của sinh viên"
                      : isVpgd
                        ? "Điểm được tính tự động dựa vào các vi phạm giảng dạy đã ghi nhận"
                        : "Không chỉnh sửa";

                  const minhChungList = Array.isArray(autoInfo.MinhChung)
                    ? autoInfo.MinhChung
                    : [];

                  // VPGD_TUAN_THU là điểm TRỪ dần: điểm = điểm tối đa − tổng điểm trừ
                  // của các vi phạm trong năm (sàn 0), không vi phạm = trọn điểm.
                  const diemToiDaAuto =
                    Number(autoInfo.DiemToiDa ?? tc.DiemToiDa) || 0;
                  const tongDiemTru = isVpgd
                    ? Math.max(
                        diemToiDaAuto - Number(autoInfo.DiemTuDong || 0),
                        0,
                      )
                    : 0;

                  // Thang điểm kèm cờ DaChon do API điểm tự động trả về; thang điểm
                  // trong mẫu chỉ là nguồn dự phòng (không có cờ chọn) khi API trống.
                  const thangDiemAuto = [
                    ...(autoInfo.ThangDiem?.length
                      ? autoInfo.ThangDiem
                      : tc.CacThangDiem || []),
                  ].sort(
                    (a, b) => (a.ThuTuHienThi ?? 0) - (b.ThuTuHienThi ?? 0),
                  );

                  // Tiêu chí liên tục (VPGD_TUAN_THU) không được API ánh xạ mức nào ->
                  // tự khớp theo giá trị điểm để vẫn tô sáng đúng mức khi trùng khít.
                  const idMucApDung =
                    autoInfo.IdThangDiemChon ??
                    thangDiemAuto.find(
                      (td) =>
                        td.DaChon ||
                        Number(td.GiaTriDiem) ===
                          Number(autoInfo.DiemTuDong ?? -1),
                    )?.IdThangDiem ??
                    null;
                  // Nguồn duy nhất của tiêu chí PHSV là dòng chốt trong
                  // diem_tb_phan_hoi_sinh_vien -> minh chứng đầu tiên chính là nó.
                  // API chỉ trả minh chứng khi ĐẠT, nên rỗng có 2 nghĩa: điểm TB dưới
                  // ngưỡng (DiemTuDong = 0), hoặc chưa chốt mà vẫn có điểm -> bất thường.
                  const phsvChot = isPhsv ? minhChungList[0] : null;
                  const phsvThieuCanCu =
                    isPhsv && !phsvChot && Number(autoInfo.DiemTuDong || 0) > 0;

                  // MoTa dạng "Điểm TB 4.65 - 8688 lượt đánh giá" -> chỉ lấy điểm TB,
                  // số lượt và ngày chốt không hiển thị ở phiếu tự đánh giá.
                  const diemTbMatch = (phsvChot?.MoTa || "").match(
                    /\d+(?:[.,]\d+)?/,
                  );
                  const diemTb = diemTbMatch
                    ? diemTbMatch[0].replace(",", ".")
                    : null;

                  return (
                    <div
                      key={tc.IdTieuChi}
                      className="pl2-criteria pl2-criteria-auto"
                    >
                      {criteriaHeader}

                      <div className="pl2-auto-score-box">
                        <div className="pl2-auto-score-info">
                          <i className="fa-solid fa-gauge-high pl2-auto-icon"></i>
                          <span className="pl2-auto-score-label">
                            Điểm hệ thống tự tính
                          </span>
                          <i className="fa-solid fa-lock pl2-auto-lock"></i>
                          <span className="pl2-auto-score-note">
                            {autoNote}
                          </span>
                        </div>
                        <div
                          className={`pl2-auto-score-value ${tongDiemTru > 0 ? "pl2-auto-score-value-tru" : ""}`}
                        >
                          {formatDiem(autoInfo.DiemTuDong)}đ
                        </div>
                      </div>

                      {thangDiemAuto.length > 0 && (
                        <ul className="pl2-auto-thang-diem-list">
                          {thangDiemAuto.map((td) => {
                            const chon = td.IdThangDiem === idMucApDung;
                            return (
                              <li
                                key={td.IdThangDiem}
                                className={`pl2-auto-thang-diem-item ${chon ? "selected" : ""}`}
                              >
                                <i
                                  className={`fa-solid ${chon ? "fa-circle-check" : "fa-circle"} pl2-auto-thang-diem-icon`}
                                ></i>
                                <span className="pl2-diem-badge">
                                  {formatDiem(td.GiaTriDiem)}đ
                                </span>
                                <span className="pl2-thang-diem-text">
                                  {td.DieuKienDiem}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {isPhsv && (phsvChot || phsvThieuCanCu) && (
                        <div
                          className={`pl2-phsv-tb-box ${phsvThieuCanCu ? "pl2-phsv-tb-box-thieu" : ""}`}
                        >
                          <span className="pl2-phsv-tb-label">
                            <i className="fa-solid fa-users"></i> Điểm trung
                            bình phản hồi sinh viên:
                          </span>
                          {phsvChot ? (
                            <span className="pl2-phsv-tb-value">
                              {diemTb || phsvChot.MoTa || "Đã chốt"}
                            </span>
                          ) : (
                            <span className="pl2-phsv-tb-empty">
                              <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                              Chưa có đợt chốt điểm phản hồi sinh viên cho năm
                              này — điểm ở trên chưa có căn cứ
                            </span>
                          )}
                        </div>
                      )}

                      {(isNckh || isVpgd) && minhChungList.length > 0 && (
                        <div
                          className={`pl2-nckh-mc-box ${isVpgd ? "pl2-mc-box-vpgd" : ""}`}
                        >
                          <div className="pl2-nckh-mc-title">
                            {isVpgd ? (
                              <>
                                <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                                Vi phạm giảng dạy đã ghi nhận
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-book-open"></i> Minh
                                chứng từ hệ thống NCKH
                              </>
                            )}
                            <span className="pl2-nckh-mc-count">
                              {minhChungList.length}
                            </span>
                          </div>
                          <ul className="pl2-nckh-mc-list">
                            {minhChungList.map((mc, mcIndex) => {
                              const ngay = formatNgay(mc.Ngay);
                              return (
                                <li
                                  key={`${mc.LoaiNguon}_${mc.MaNguon}_${mcIndex}`}
                                  className="pl2-nckh-mc-item"
                                >
                                  <div className="pl2-nckh-mc-item-main">
                                    <span className="pl2-nckh-mc-name">
                                      {mc.TieuDe || "(Không có tiêu đề)"}
                                    </span>
                                  </div>
                                  {(mc.MoTa || ngay) && (
                                    <div className="pl2-nckh-mc-meta">
                                      {mc.MoTa}
                                      {mc.MoTa && ngay ? " • " : ""}
                                      {ngay}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = formData[tc.IdTieuChi]?.DiemTuDanhGia > 0;
                const fileList = formData[tc.IdTieuChi]?.DanhSachFile || [];
                const nckhList = formData[tc.IdTieuChi]?.DanhSachNCKH || [];

                // Quyền sửa của DÒNG này, do trang cha quyết định.
                const moNhap = laDongMoNhap(tc);
                const disabledRadio = !moNhap;
                const disabledText = !moNhap;
                const dong = thongTinDong(tc);
                const biTraVe = dong?.nguonTraVe != null;

                return (
                  <div
                    key={tc.IdTieuChi}
                    className={`pl2-criteria ${isActive ? "active" : ""} ${biTraVe ? "pl2-bi-tra-ve" : ""}`}
                  >
                    {criteriaHeader}

                    {dong?.nhan && (
                      <div className="pl2-dong-trang-thai">
                        <span
                          className={`pl2-dong-badge pl2-dong-${dong.trangThaiDong}`}
                        >
                          {dong.nhan}
                        </span>
                        {dong.soLanTraVe > 0 && (
                          <span className="pl2-dong-meta">
                            Đã bị trả về {dong.soLanTraVe} lần
                          </span>
                        )}
                      </div>
                    )}

                    {biTraVe && dong.lyDoTraVe && (
                      <div className="pl2-return-note">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        <div>
                          <b>Ghi chú trả về:</b> {dong.lyDoTraVe}
                          {dong.ngayTraVe && (
                            <div className="pl2-dong-ngay-tra-ve">
                              Trả về ngày {formatNgay(dong.ngayTraVe)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {dong?.canBoSung && (
                      <LichSuDongTruoc
                        lichSu={lichSuDong(tc)}
                        dangTai={dangTaiLichSu}
                      />
                    )}

                    {tc.LoaiThangDiem === 2 ? (
                      <div className="pl2-score-input-container">
                        <span className="pl2-score-input-label">
                          Nhập điểm:
                        </span>
                        <input
                          type="number"
                          className="pl2-score-input"
                          placeholder={`Tối đa ${tc.DiemToiDa}`}
                          value={formData[tc.IdTieuChi]?.DiemTuDanhGia ?? ""}
                          disabled={disabledRadio}
                          min="0"
                          max={tc.DiemToiDa}
                          step="any"
                          onChange={(e) => {
                            if (disabledRadio) return;
                            const val = e.target.value;
                            if (val === "") {
                              onScoreChange(tc.IdTieuChi, null, "");
                            } else {
                              let parsed = parseFloat(val);
                              if (isNaN(parsed)) parsed = 0;
                              if (parsed < 0) parsed = 0;
                              if (parsed > tc.DiemToiDa) parsed = tc.DiemToiDa;
                              onScoreChange(tc.IdTieuChi, null, parsed);
                            }
                          }}
                        />
                        <span className="pl2-score-input-hint">
                          (Điểm tối đa: {tc.DiemToiDa}đ)
                        </span>
                      </div>
                    ) : tc.LoaiThangDiem === 3 ? (
                      <div className="pl2-thang-diem-list">
                        <label
                          className={`pl2-thang-diem-item ${formData[tc.IdTieuChi]?.DiemTuDanhGia === tc.DiemToiDa ? "selected" : ""} ${disabledRadio ? "disabled" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`yesno_${tc.IdTieuChi}`}
                            checked={
                              formData[tc.IdTieuChi]?.DiemTuDanhGia ===
                              tc.DiemToiDa
                            }
                            disabled={disabledRadio}
                            onChange={() => {
                              if (disabledRadio) return;
                              onScoreChange(tc.IdTieuChi, null, tc.DiemToiDa);
                            }}
                          />
                          <span className="pl2-diem-badge">
                            {tc.DiemToiDa}đ
                          </span>
                          <span className="pl2-thang-diem-text">Có</span>
                        </label>
                        <label
                          className={`pl2-thang-diem-item ${formData[tc.IdTieuChi]?.DiemTuDanhGia === 0 || formData[tc.IdTieuChi]?.DiemTuDanhGia == null ? "selected" : ""} ${disabledRadio ? "disabled" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`yesno_${tc.IdTieuChi}`}
                            checked={
                              formData[tc.IdTieuChi]?.DiemTuDanhGia === 0 ||
                              formData[tc.IdTieuChi]?.DiemTuDanhGia == null
                            }
                            disabled={disabledRadio}
                            onChange={() => {
                              if (disabledRadio) return;
                              onScoreChange(tc.IdTieuChi, null, 0);
                            }}
                          />
                          <span className="pl2-diem-badge">0đ</span>
                          <span className="pl2-thang-diem-text">Không</span>
                        </label>
                      </div>
                    ) : (
                      tc.CacThangDiem?.length > 0 && (
                        <div className="pl2-thang-diem-list">
                          {tc.CacThangDiem.map((td) => {
                            const selected =
                              formData[tc.IdTieuChi]?.IdThangDiemChon ===
                              td.IdThangDiem;
                            return (
                              <label
                                key={td.IdThangDiem}
                                className={`pl2-thang-diem-item ${selected ? "selected" : ""} ${disabledRadio ? "disabled" : ""}`}
                              >
                                <input
                                  type="radio"
                                  checked={selected}
                                  disabled={disabledRadio}
                                  onClick={() => {
                                    if (disabledRadio) return;
                                    if (selected)
                                      onScoreChange(tc.IdTieuChi, null, 0);
                                    else
                                      onScoreChange(
                                        tc.IdTieuChi,
                                        td.IdThangDiem,
                                        td.GiaTriDiem,
                                      );
                                  }}
                                  onChange={() => {}}
                                />
                                <span className="pl2-diem-badge">
                                  {td.GiaTriDiem}đ
                                </span>
                                <span className="pl2-thang-diem-text">
                                  {td.DieuKienDiem}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )
                    )}

                    <textarea
                      className="pl2-textarea"
                      placeholder={
                        isKhoaEvaluating
                          ? "Nhập nhận xét của Khoa..."
                          : "Nhập diễn giải (nếu có)"
                      }
                      value={formData[tc.IdTieuChi]?.MoTaHoanThanh || ""}
                      onChange={(e) =>
                        onTextChange(tc.IdTieuChi, e.target.value)
                      }
                      disabled={disabledText}
                    />

                    <div className="pl2-file-upload">
                      {moNhap && !isKhoaEvaluating && (
                        <div className="pl2-file-actions">
                          <button
                            type="button"
                            className="btn-attach-file"
                            title="Chỉ chấp nhận tệp PDF"
                            onClick={() =>
                              document
                                .getElementById(`file_input_${tc.IdTieuChi}`)
                                .click()
                            }
                          >
                            <i className="fa-solid fa-paperclip"></i> Đính kèm
                            minh chứng
                          </button>
                          <input
                            id={`file_input_${tc.IdTieuChi}`}
                            type="file"
                            multiple
                            accept={ACCEPT_PDF}
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              if (files.length > 0 && onFileChange)
                                onFileChange(tc.IdTieuChi, files);
                              e.target.value = null;
                            }}
                          />
                        </div>
                      )}

                      {fileList.length > 0 && (
                        <div className="pl2-chip-list">
                          {fileList.map((fileItem, fileIndex) => {
                            const isSavedOnServer = !(fileItem instanceof File);
                            const fileNameDisplay = isSavedOnServer
                              ? fileItem.originalName || fileItem.fileName
                              : fileItem.name;

                            // Chỉ tệp đã lưu và có IdMinhChung mới xem trước được:
                            // endpoint api/minhchung/{id}/tai-ve khóa theo id, còn tệp
                            // vừa chọn thì chưa lên máy chủ.
                            const mc = isSavedOnServer
                              ? chuanHoaFileMinhChung(fileItem)
                              : null;
                            const xemDuoc = !!(
                              mc &&
                              mc.IdMinhChung &&
                              onXemMinhChung
                            );

                            return (
                              <div key={fileIndex} className="pl2-chip-row">
                                {xemDuoc ? (
                                  <button
                                    type="button"
                                    className="pl2-chip pl2-chip-file pl2-chip-xem"
                                    onClick={() => onXemMinhChung(mc)}
                                    title={`Xem trước / tải về: ${fileNameDisplay}`}
                                  >
                                    <i className="fa-solid fa-file-circle-check"></i>
                                    {fileNameDisplay}
                                    <i className="fa-solid fa-eye pl2-chip-xem-icon"></i>
                                  </button>
                                ) : (
                                  <span
                                    className="pl2-chip pl2-chip-file"
                                    title={
                                      isSavedOnServer
                                        ? `${fileNameDisplay} — bản ghi cũ không có mã minh chứng nên không xem được`
                                        : `${fileNameDisplay} — tệp mới chọn, xem được sau khi lưu phiếu`
                                    }
                                  >
                                    <i className="fa-solid fa-file-circle-check"></i>
                                    {fileNameDisplay}
                                  </span>
                                )}
                                {moNhap && !isKhoaEvaluating && (
                                  <button
                                    type="button"
                                    className="pl2-chip-remove"
                                    title="Xóa tệp"
                                    onClick={() =>
                                      onRemoveFile(tc.IdTieuChi, fileIndex)
                                    }
                                  >
                                    <i className="fa-solid fa-xmark"></i>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {nckhList.length > 0 && (
                        <div className="pl2-chip-list">
                          {nckhList.map((nckhItem, nckhIndex) => (
                            <div key={nckhIndex} className="pl2-chip-row">
                              <span className="pl2-chip pl2-chip-nckh">
                                <i className="fa-solid fa-book-open"></i>[
                                {nckhItem.QRanking}] {nckhItem.MoTa}
                              </span>
                              {moNhap && !isKhoaEvaluating && onRemoveNckh && (
                                <button
                                  type="button"
                                  className="pl2-chip-remove"
                                  title="Xóa"
                                  onClick={() =>
                                    onRemoveNckh(tc.IdTieuChi, nckhIndex)
                                  }
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DanhGiaPhuLuc2Form;
