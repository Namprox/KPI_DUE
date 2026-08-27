import React, { useMemo } from "react";
import { formatDiem } from "../../../utils/phieuApi";
import { laDongChamTay, LOAI_NHOM_DV } from "../../../utils/phieuDonViApi";

/**
 * Biểu mẫu nhập liệu Đánh giá KPI Đơn vị - phân cấp 2 tầng nhóm (Nhóm cha A, B -> Nhóm con I, II... -> Tiêu chí).
 */
const DanhGiaDonViForm = ({
  phieu,
  chiTietList = [],
  sections = [],
  nhomList = [],
  tieuChiMap = new Map(),
  nhapDiem = {},
  nhapNhanXet = {},
  choPhepNhap = false,
  idDangLuu = null,
  onDiemChange,
  onNhanXetChange,
  onLuuDong,
  oDaSua,
  hanhDong = null,
  tamTinh = null,
  tongHop = null,
}) => {
  // Lấy điểm hiện tại của một tiêu chí (ưu tiên số đang gõ nháp, rồi đến điểm của server)
  const getScoreOf = (ct) => {
    const idCt = ct.IdChiTietDv;
    if (laDongChamTay(ct)) {
      const draft = nhapDiem[idCt];
      if (draft !== undefined) {
        return draft === "" ? null : Number(draft);
      }
      return ct.DiemNhap === null || ct.DiemNhap === undefined
        ? null
        : Number(ct.DiemNhap);
    }
    return ct.DiemTongHop === null || ct.DiemTongHop === undefined
      ? null
      : Number(ct.DiemTongHop);
  };

  const totalCount = chiTietList.length;
  const answeredCount = chiTietList.filter(
    (ct) => getScoreOf(ct) != null,
  ).length;
  const progressPercent =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Tính tổng điểm tích lũy / cơ bản / vượt trội
  const scoreTichLuy = phieu?.TongDiemTichLuy ?? tamTinh?.tichLuy ?? 0;
  const scoreCoBan = phieu?.TongDiemCoBan ?? tamTinh?.coBan ?? 0;
  const scoreVuotTroi = phieu?.TongDiemVuotTroi ?? tamTinh?.vuotTroi ?? 0;

  const getGroupStats = (items = []) => {
    let sum = 0;
    let max = 0;
    items.forEach((ct) => {
      max += Number(ct.DiemToiDa) || 0;
      const s = getScoreOf(ct);
      if (s != null) sum += s;
    });
    return { sum, max };
  };

  // Cấu trúc phân cấp 2 tầng hiển thị
  const finalSections = useMemo(() => {
    if (Array.isArray(sections) && sections.length > 0) {
      return sections;
    }
    if (Array.isArray(nhomList) && nhomList.length > 0) {
      const loaiMap = new Map();
      nhomList.forEach((nhom) => {
        const loai = Number(nhom.loaiNhom) || 1;
        if (!loaiMap.has(loai)) loaiMap.set(loai, []);
        loaiMap.get(loai).push(nhom);
      });
      return [...loaiMap.entries()].map(([loai, list]) => ({
        loaiNhom: loai,
        tenNhom:
          loai === LOAI_NHOM_DV.VUOT_TROI
            ? "B - Nhóm các tiêu chí liên quan đến thành tích vượt trội"
            : "A - Nhóm các tiêu chí liên quan đến nhiệm vụ cơ bản",
        diemToiDa: 100,
        nhomConList: list.map((nhom) => ({
          ten: nhom.ten,
          isDirect: false,
          diemToiDa: null,
          dong: nhom.dong || [],
        })),
      }));
    }
    return [];
  }, [sections, nhomList]);

  return (
    <div className="pl2-container">
      {/* Header tổng điểm tích lũy & Tiến độ & Thao tác */}
      <div className="pl2-header">
        <div className="pl2-header-score">
          <span className="pl2-header-score-label">
            <i className="fa-solid fa-chart-line"></i> TỔNG ĐIỂM TÍCH LŨY
          </span>

          <div className="pl2-header-score-row">
            <div className="pl2-header-score-value">
              {formatDiem(scoreTichLuy)}
              <span className="pl2-header-score-unit">điểm</span>
            </div>
          </div>

          <div className="pl2-header-score-note">
            (Điểm cơ bản: <b>{formatDiem(scoreCoBan)}đ</b> · Điểm vượt trội:{" "}
            <b>{formatDiem(scoreVuotTroi)}đ</b>)
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

      {/* Thông tin phản hồi / Nhận xét / Kết quả tổng hợp */}
      {phieu?.NhanXetDv && (
        <div className="pl2-return-note">
          <i className="fa-solid fa-circle-info"></i>
          <div>
            <b>Nhận xét của Trưởng đơn vị:</b> {phieu.NhanXetDv}
          </div>
        </div>
      )}

      {phieu?.NhanXetTruong && (
        <div className="pl2-return-note">
          <i className="fa-solid fa-circle-info"></i>
          <div>
            <b>Nhận xét của Hiệu trưởng:</b> {phieu.NhanXetTruong}
          </div>
        </div>
      )}

      {phieu?.LyDoMoLai && (
        <div className="pl2-return-note">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>
            <b>Lý do mở lại phiếu:</b> {phieu.LyDoMoLai}
          </div>
        </div>
      )}

      {tongHop && (
        <div className="cd-hint cd-hint-ok" style={{ marginBottom: "20px" }}>
          <i className="fa-solid fa-circle-check"></i> Đã tổng hợp{" "}
          <b>{tongHop.SoPhieuThanhVien ?? 0}</b> phiếu thành viên ·{" "}
          <b>{tongHop.SoXuatSac ?? 0}</b> xuất sắc ·{" "}
          <b>{tongHop.SoHoanThanh ?? 0}</b> hoàn thành · Điểm trung bình{" "}
          <b>{formatDiem(tongHop.DiemTrungBinh)}đ</b>.
        </div>
      )}

      {/* Danh sách phân cấp 2 tầng: Nhóm Cha -> Nhóm Con -> Tiêu chí */}
      {finalSections.map((section, sIndex) => {
        const isVuotTroi = Number(section.loaiNhom) === LOAI_NHOM_DV.VUOT_TROI;

        return (
          <div key={section.loaiNhom || sIndex} className="pl2-section">
            {/* Header Nhóm Cha Cấp 1 */}
            <div
              className={`pl2-section-header ${isVuotTroi ? "vuot-troi" : ""}`}
            >
              <h3 className="pl2-section-title">
                <i
                  className={`fa-solid ${isVuotTroi ? "fa-award" : "fa-list-check"}`}
                ></i>
                {section.tenNhom}
              </h3>
            </div>

            {/* Thân Nhóm Cha chứa các Nhóm Con Cấp 2 */}
            <div className="pl2-section-body">
              {section.nhomConList?.map((nhomCon, gIndex) => {
                const items = nhomCon.dong || [];
                const { sum: subSum, max: subMax } = getGroupStats(items);
                const maxCon =
                  nhomCon.diemToiDa != null ? nhomCon.diemToiDa : subMax;

                return (
                  <div key={nhomCon.ten || gIndex} className="pl2-group">
                    {/* Header Nhóm Con (chỉ hiện khi không phải nhóm trực tiếp trùng tên cha) */}
                    {!nhomCon.isDirect && (
                      <div className="pl2-group-header">
                        <h4 className="pl2-group-title">{nhomCon.ten}</h4>
                        <span className="pl2-group-score">
                          <i className="fa-solid fa-star"></i>{" "}
                          {formatDiem(subSum)}
                          <span className="pl2-group-score-max">
                            / {formatDiem(maxCon)}đ
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Danh sách tiêu chí */}
                    <div className="pl2-group-items">
                      {items.map((ct, index) => {
                        const idCt = ct.IdChiTietDv;
                        const idTc = ct.IdTieuChi;
                        const tcInfo = tieuChiMap?.get(Number(idTc));
                        const chamTay = laDongChamTay(ct);
                        const currentScore = getScoreOf(ct);
                        const hasScore = currentScore != null;
                        const daSua = oDaSua ? oDaSua(ct) : false;
                        const dangLuu = idDangLuu === idCt;
                        const moNhap = choPhepNhap && chamTay;

                        const loaiThangDiem =
                          tcInfo?.loaiThangDiem || ct.LoaiThangDiem || 2;
                        const mucDiem = tcInfo?.mucDiem || ct.ThangDiem || [];

                        const draftDiemVal =
                          nhapDiem[idCt] !== undefined
                            ? nhapDiem[idCt]
                            : ct.DiemNhap === null || ct.DiemNhap === undefined
                              ? ""
                              : String(ct.DiemNhap);

                        const draftNhanXetVal =
                          nhapNhanXet[idCt] !== undefined
                            ? nhapNhanXet[idCt]
                            : ct.NhanXetNhap || "";

                        const prefix = !nhomCon.isDirect
                          ? `${gIndex + 1}.${index + 1}.`
                          : `${index + 1}.`;

                        const criteriaHeader = (
                          <div className="pl2-criteria-header">
                            <div className="pl2-criteria-header-main">
                              <span className="pl2-criteria-title">
                                {prefix} {ct.TenTieuChi}
                              </span>
                              {ct.MoTa && (
                                <div className="pl2-criteria-desc">
                                  {ct.MoTa}
                                </div>
                              )}
                            </div>
                            <div className="pl2-criteria-header-side">
                              {hasScore && (
                                <span className="pl2-criteria-score">
                                  <i className="fa-solid fa-circle-check"></i>{" "}
                                  {formatDiem(currentScore)}đ
                                </span>
                              )}
                              <span className="pl2-criteria-max">
                                Tối đa: {formatDiem(ct.DiemToiDa)}đ
                              </span>
                            </div>
                          </div>
                        );

                        // Dòng TỰ ĐỘNG tổng hợp từ KPI thành viên (LoaiNguonDiem = 2)
                        if (!chamTay) {
                          return (
                            <div
                              key={idCt}
                              className="pl2-criteria pl2-criteria-auto active"
                            >
                              {criteriaHeader}

                              <div className="pl2-auto-score-box">
                                <div className="pl2-auto-score-info">
                                  <i className="fa-solid fa-gauge-high pl2-auto-icon"></i>
                                  <span className="pl2-auto-score-label">
                                    Điểm hệ thống tự động tổng hợp
                                  </span>
                                  <i className="fa-solid fa-lock pl2-auto-lock"></i>
                                  <span className="pl2-auto-score-note">
                                    Tính từ điểm KPI của thành viên trong đơn vị
                                  </span>
                                </div>
                                <div className="pl2-auto-score-value">
                                  {formatDiem(ct.DiemTongHop)}đ
                                </div>
                              </div>

                              {mucDiem.length > 0 && (
                                <ul className="pl2-auto-thang-diem-list">
                                  {mucDiem.map((td) => {
                                    const chon =
                                      Number(td.GiaTriDiem) ===
                                      Number(ct.DiemTongHop);
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
                            </div>
                          );
                        }

                        // Dòng CHẤM TAY (LoaiNguonDiem = 1)
                        return (
                          <div
                            key={idCt}
                            className={`pl2-criteria ${hasScore ? "active" : ""} ${daSua ? "modified" : ""}`}
                          >
                            {criteriaHeader}

                            {/* Lựa chọn theo loại thang điểm */}
                            {loaiThangDiem === 1 && mucDiem.length > 0 ? (
                              <div className="pl2-thang-diem-list">
                                {mucDiem.map((td) => {
                                  const isSelected =
                                    draftDiemVal !== "" &&
                                    Number(draftDiemVal) ===
                                      Number(td.GiaTriDiem);
                                  return (
                                    <label
                                      key={td.IdThangDiem}
                                      className={`pl2-thang-diem-item ${isSelected ? "selected" : ""} ${!moNhap ? "disabled" : ""}`}
                                    >
                                      <input
                                        type="radio"
                                        name={`thang_diem_${idCt}`}
                                        checked={isSelected}
                                        disabled={!moNhap || dangLuu}
                                        onClick={() => {
                                          if (!moNhap || dangLuu) return;
                                          if (isSelected) {
                                            onDiemChange(idCt, "");
                                          } else {
                                            onDiemChange(idCt, td.GiaTriDiem);
                                          }
                                        }}
                                        onChange={() => {}}
                                      />
                                      <span className="pl2-diem-badge">
                                        {formatDiem(td.GiaTriDiem)}đ
                                      </span>
                                      <span className="pl2-thang-diem-text">
                                        {td.DieuKienDiem}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : loaiThangDiem === 3 ? (
                              <div className="pl2-thang-diem-list">
                                <label
                                  className={`pl2-thang-diem-item ${Number(draftDiemVal) === Number(ct.DiemToiDa) ? "selected" : ""} ${!moNhap ? "disabled" : ""}`}
                                >
                                  <input
                                    type="radio"
                                    name={`yesno_${idCt}`}
                                    checked={
                                      Number(draftDiemVal) ===
                                      Number(ct.DiemToiDa)
                                    }
                                    disabled={!moNhap || dangLuu}
                                    onChange={() => {
                                      if (!moNhap || dangLuu) return;
                                      onDiemChange(idCt, ct.DiemToiDa);
                                    }}
                                  />
                                  <span className="pl2-diem-badge">
                                    {formatDiem(ct.DiemToiDa)}đ
                                  </span>
                                  <span className="pl2-thang-diem-text">
                                    Có / Đạt
                                  </span>
                                </label>
                                <label
                                  className={`pl2-thang-diem-item ${draftDiemVal !== "" && Number(draftDiemVal) === 0 ? "selected" : ""} ${!moNhap ? "disabled" : ""}`}
                                >
                                  <input
                                    type="radio"
                                    name={`yesno_${idCt}`}
                                    checked={
                                      draftDiemVal !== "" &&
                                      Number(draftDiemVal) === 0
                                    }
                                    disabled={!moNhap || dangLuu}
                                    onChange={() => {
                                      if (!moNhap || dangLuu) return;
                                      onDiemChange(idCt, 0);
                                    }}
                                  />
                                  <span className="pl2-diem-badge">0đ</span>
                                  <span className="pl2-thang-diem-text">
                                    Không / Chưa đạt
                                  </span>
                                </label>
                              </div>
                            ) : (
                              <div className="pl2-score-input-container">
                                <span className="pl2-score-input-label">
                                  Nhập điểm:
                                </span>
                                <input
                                  type="number"
                                  className="pl2-score-input"
                                  placeholder={`Tối đa ${formatDiem(ct.DiemToiDa)}`}
                                  value={draftDiemVal}
                                  disabled={!moNhap || dangLuu}
                                  min="0"
                                  max={ct.DiemToiDa}
                                  step="any"
                                  onChange={(e) => {
                                    if (!moNhap || dangLuu) return;
                                    const val = e.target.value;
                                    if (val === "") {
                                      onDiemChange(idCt, "");
                                    } else {
                                      let num = parseFloat(val);
                                      if (isNaN(num)) num = 0;
                                      if (num < 0) num = 0;
                                      if (ct.DiemToiDa && num > ct.DiemToiDa)
                                        num = ct.DiemToiDa;
                                      onDiemChange(idCt, num);
                                    }
                                  }}
                                />
                                <span className="pl2-score-input-hint">
                                  (Điểm tối đa: {formatDiem(ct.DiemToiDa)}đ)
                                </span>
                              </div>
                            )}

                            {/* Ô ghi chú / diễn giải */}
                            <textarea
                              className="pl2-textarea"
                              placeholder="Nhập diễn giải / ghi chú cho tiêu chí này (nếu có)..."
                              value={draftNhanXetVal}
                              disabled={!moNhap || dangLuu}
                              onChange={(e) => {
                                if (!moNhap || dangLuu) return;
                                onNhanXetChange(idCt, e.target.value);
                              }}
                            />

                            {/* Thanh trạng thái & Nút lưu dòng nếu cho phép nhập */}
                            {choPhepNhap && (
                              <div className="pl2-criteria-footer">
                                <div>
                                  {daSua ? (
                                    <span className="pl2-criteria-status-hint modified">
                                      <i className="fa-solid fa-circle-dot"></i>{" "}
                                      Có thay đổi chưa lưu
                                    </span>
                                  ) : hasScore ? (
                                    <span className="pl2-criteria-status-hint">
                                      <i
                                        className="fa-solid fa-circle-check"
                                        style={{ color: "#10b981" }}
                                      ></i>{" "}
                                      Đã lưu điểm
                                    </span>
                                  ) : (
                                    <span className="pl2-criteria-status-hint">
                                      <i
                                        className="fa-regular fa-circle"
                                        style={{ color: "#94a3b8" }}
                                      ></i>{" "}
                                      Chưa có điểm
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <button
                                    type="button"
                                    className="btn-save-item"
                                    disabled={!daSua || dangLuu}
                                    onClick={() => onLuuDong(ct)}
                                    title={
                                      daSua
                                        ? "Lưu điểm và ghi chú của tiêu chí này"
                                        : "Chưa có thay đổi"
                                    }
                                  >
                                    <i
                                      className={`fa-solid ${dangLuu ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}
                                    ></i>
                                    {dangLuu ? "Đang lưu..." : "Lưu tiêu chí"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

export default DanhGiaDonViForm;
