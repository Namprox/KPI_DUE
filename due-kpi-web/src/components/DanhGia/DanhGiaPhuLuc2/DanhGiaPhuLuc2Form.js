import React from "react";
import {
  chuanHoaFileMinhChung,
  ACCEPT_PDF,
} from "../../../utils/minhChungPhieuApi";
import { formatNgay as formatNgayChung } from "../../../utils/phieuApi";

/**
 * Khác formatNgay dùng chung ở chỗ trả chuỗi RỖNG thay vì "—": dòng meta của
 * minh chứng NCKH bên dưới dựa vào chuỗi rỗng để quyết định có hiện dấu • và có
 * hiện cả dòng hay không — trả "—" sẽ làm mọi minh chứng mọc thêm một gạch ngang.
 */
const formatNgay = (value) => {
  const ngay = formatNgayChung(value);
  return ngay === "—" ? "" : ngay;
};

const formatDiem = (value) => {
  const n = Number(value) || 0;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
};

const DanhGiaPhuLuc2Form = ({
  criteriaList,
  formData,
  autoScores = {},
  tongDiemCoBan,
  isSubmitting,
  trangThaiPhieu,
  lyDoTraVe,
  onScoreChange,
  onTextChange,
  onFileChange,
  onRemoveFile,
  onSubmit,
  onRecall,
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

  const totalCount = criteriaList.length;
  const answeredCount = criteriaList.filter(
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

        <div className="pl2-header-actions">
          {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
            <>
              <button
                onClick={() => onSubmit(1)}
                disabled={isSubmitting}
                className="btn-luu-nhap"
              >
                <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
              </button>
              <button
                onClick={() => onSubmit(2)}
                disabled={isSubmitting}
                className="btn-nop-phieu"
              >
                <i className="fa-solid fa-paper-plane"></i> Nộp Phiếu
              </button>
            </>
          )}
          {trangThaiPhieu === 2 && !isKhoaEvaluating && onRecall && (
            <button
              onClick={onRecall}
              disabled={isSubmitting}
              className="btn-thu-hoi"
              title="Đưa phiếu về trạng thái nháp để chỉnh sửa rồi nộp lại"
            >
              <i className="fa-solid fa-rotate-left"></i> Hủy nộp để chỉnh sửa
            </button>
          )}
          {trangThaiPhieu === 2 && !isKhoaEvaluating && !onRecall && (
            <div className="pl2-approved pl2-waiting">
              <i className="fa-solid fa-paper-plane"></i> Phiếu đã nộp, chờ Khoa
              đánh giá
            </div>
          )}
          {trangThaiPhieu >= 3 && !isKhoaEvaluating && (
            <div className="pl2-approved">
              <i className="fa-solid fa-check-circle"></i> Phiếu đã được phê
              duyệt
            </div>
          )}
        </div>
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
                        <span className="pl2-criteria-score">
                          <i className="fa-solid fa-circle-check"></i>{" "}
                          {currentScore % 1 === 0
                            ? currentScore
                            : currentScore.toFixed(2)}
                          đ
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
                    ? "Điểm được tính tự động dựa vào dữ liệu ở trang NCKH"
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

                  // PHSV_DIEM_TB_GTE_3 -> threshold 3 (default 3 if not encoded)
                  const nguongMatch = congThuc.match(/GTE_(\d+(?:\.\d+)?)/);
                  const nguong = nguongMatch ? Number(nguongMatch[1]) : 3;

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

                      {isPhsv && (
                        <div
                          className={`pl2-phsv-tb-box ${phsvThieuCanCu ? "pl2-phsv-tb-box-thieu" : ""}`}
                        >
                          <span className="pl2-phsv-tb-label">
                            <i className="fa-solid fa-users"></i> Điểm trung
                            bình phản hồi sinh viên:
                          </span>
                          {phsvChot ? (
                            <>
                              {diemTb && (
                                <span className="pl2-phsv-tb-value">
                                  {diemTb}
                                </span>
                              )}
                              <span className="pl2-phsv-tb-badge pl2-phsv-tb-dat">
                                <i className="fa-solid fa-circle-check"></i>
                                Đạt (≥ {nguong})
                              </span>
                            </>
                          ) : phsvThieuCanCu ? (
                            <span className="pl2-phsv-tb-empty">
                              <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                              Chưa có đợt chốt điểm phản hồi sinh viên cho năm
                              này — điểm ở trên chưa có căn cứ
                            </span>
                          ) : (
                            <span className="pl2-phsv-tb-badge pl2-phsv-tb-khong-dat">
                              <i className="fa-solid fa-circle-xmark"></i>
                              Không đạt (&lt; {nguong})
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

                let disabledRadio = false;
                let disabledText = false;

                if (isKhoaEvaluating) {
                  disabledRadio = trangThaiPhieu >= 3;
                  disabledText = trangThaiPhieu >= 3;
                } else {
                  disabledRadio = trangThaiPhieu >= 2;
                  disabledText = trangThaiPhieu >= 2;
                }

                return (
                  <div
                    key={tc.IdTieuChi}
                    className={`pl2-criteria ${isActive ? "active" : ""}`}
                  >
                    {criteriaHeader}

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
                      {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
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
                            tệp PDF
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
                                {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
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
                              {trangThaiPhieu <= 1 &&
                                !isKhoaEvaluating &&
                                onRemoveNckh && (
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
