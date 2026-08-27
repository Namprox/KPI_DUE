import React from "react";
import { formatDiem } from "../../../utils/phieuApi";
import {
  diemHieuLucCuaDong,
  TRANG_THAI_DV,
} from "../../../utils/phieuDonViApi";
import {
  CAP_CHAM,
  NHAN_CAP_CHAM,
  TRUONG_DIEM_CUA_CAP,
  diemDangHienThi,
} from "../../../utils/phieuPhongApi";

const THU_TU_CAP = [CAP_CHAM.NHAP, CAP_CHAM.DUYET_DV, CAP_CHAM.TRUONG];

/**
 * Biểu mẫu chấm KPI Phòng / Trung tâm.
 *
 * Giữ nguyên bố cục của biểu mẫu Khoa (DanhGiaDonViForm) - cùng khối pl2-*, cùng
 * thứ tự, cùng cách hiện ghi chú. Chỉ hai chỗ buộc phải khác, đều do mẫu loại 4:
 *
 *  - NHÓM MỘT TẦNG. Mẫu Phòng/TT khai `loai_nhom = NULL` nên không có tầng
 *    A (cơ bản) / B (vượt trội) để bọc ngoài; mỗi mục của biểu mẫu là một section.
 *    Dòng "Điểm cơ bản / Điểm vượt trội" ở header vì thế cũng bỏ: mọi dòng sẽ rơi
 *    vào vế cơ bản, hiện ra là sai nghĩa chứ không phải thiếu thông tin.
 *  - BA LỚP ĐIỂM. Màn hình phục vụ cả ba cấp chấm nên từ trạng thái 2 trở đi, mỗi
 *    dòng hiện dải Thư ký → Trưởng phòng → Cấp Trường để cấp trên thấy cấp dưới
 *    đã cho bao nhiêu. Ở trạng thái 1 chỉ có một lớp nên dải này ẩn, và màn hình
 *    trông đúng như bên Khoa.
 */
const DanhGiaPhongForm = ({
  phieu,
  chiTietList = [],
  sections = [],
  tieuChiMap = new Map(),
  cap = null,
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
}) => {
  const truongCuaCap = cap ? TRUONG_DIEM_CUA_CAP[cap] : null;

  const totalCount = chiTietList.length;
  const answeredCount = chiTietList.filter(
    (ct) => diemDangHienThi(ct, nhapDiem, cap) != null,
  ).length;
  const progressPercent =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Server chỉ ghi tong_diem_* ở bước chốt, nên trước đó phải lấy số tạm tính.
  const scoreTichLuy = phieu?.TongDiemTichLuy ?? tamTinh?.tichLuy ?? 0;

  // Trạng thái 1 chỉ có duy nhất lớp điểm của thư ký - hiện dải ba lớp lúc đó là
  // thừa, và làm màn hình lệch khỏi bố cục bên Khoa.
  const hienLopDiem = Number(phieu?.TrangThai) > TRANG_THAI_DV.NHAP;

  const getScoreOf = (ct) => diemDangHienThi(ct, nhapDiem, cap);

  return (
    <div className="pl2-container">
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

      {phieu?.NhanXetDv && (
        <div className="pl2-return-note">
          <i className="fa-solid fa-circle-info"></i>
          <div>
            <b>Nhận xét của Trưởng phòng:</b> {phieu.NhanXetDv}
          </div>
        </div>
      )}

      {phieu?.NhanXetTruong && (
        <div className="pl2-return-note">
          <i className="fa-solid fa-circle-info"></i>
          <div>
            <b>Nhận xét của cấp Trường:</b> {phieu.NhanXetTruong}
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

      {sections.map((section, sIndex) => {
        const items = section.dong || [];

        return (
          <div key={section.khoa || sIndex} className="pl2-section">
            <div className="pl2-section-header">
              <h3 className="pl2-section-title">
                <i className="fa-solid fa-list-check"></i>
                {section.ten}
              </h3>
            </div>

            <div className="pl2-section-body">
              <div className="pl2-group-items">
                {items.map((ct, index) => {
                  const idCt = ct.IdChiTietDv;
                  const tcInfo = tieuChiMap?.get(Number(ct.IdTieuChi));
                  const currentScore = getScoreOf(ct);
                  const hasScore = currentScore != null;
                  const daSua = oDaSua ? oDaSua(ct) : false;
                  const dangLuu = idDangLuu === idCt;
                  const moNhap = choPhepNhap && !!truongCuaCap;

                  const loaiThangDiem =
                    tcInfo?.loaiThangDiem || ct.LoaiThangDiem || 2;
                  const mucDiem = tcInfo?.mucDiem || ct.ThangDiem || [];

                  const diemGoc = truongCuaCap ? ct[truongCuaCap.diem] : null;
                  const draftDiemVal =
                    nhapDiem[idCt] !== undefined
                      ? nhapDiem[idCt]
                      : diemGoc === null || diemGoc === undefined
                        ? ""
                        : String(diemGoc);

                  const nhanXetGoc = truongCuaCap
                    ? ct[truongCuaCap.nhanXet] || ""
                    : "";
                  const draftNhanXetVal =
                    nhapNhanXet[idCt] !== undefined
                      ? nhapNhanXet[idCt]
                      : nhanXetGoc;

                  const diemHieuLuc = diemHieuLucCuaDong(ct);

                  return (
                    <div
                      key={idCt}
                      className={`pl2-criteria ${hasScore ? "active" : ""} ${daSua ? "modified" : ""}`}
                    >
                      <div className="pl2-criteria-header">
                        <div className="pl2-criteria-header-main">
                          <span className="pl2-criteria-title">
                            {index + 1}. {ct.TenTieuChi}
                          </span>
                          {ct.MoTa && (
                            <div className="pl2-criteria-desc">{ct.MoTa}</div>
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

                      {/* Từ trạng thái 2: lớp nào đang thắng thì tô đậm. */}
                      {hienLopDiem && (
                        <div className="phong-lop-diem">
                          {THU_TU_CAP.map((capItem) => {
                            const truong = TRUONG_DIEM_CUA_CAP[capItem];
                            const giaTri = ct[truong.diem];
                            const coDiem =
                              giaTri !== null &&
                              giaTri !== undefined &&
                              giaTri !== "";
                            const laHieuLuc =
                              coDiem && Number(giaTri) === Number(diemHieuLuc);
                            return (
                              <div
                                key={capItem}
                                className={[
                                  "phong-lop-diem-o",
                                  laHieuLuc ? "hieu-luc" : "",
                                  capItem === cap ? "dang-cham" : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                                title={
                                  ct[truong.nhanXet] || NHAN_CAP_CHAM[capItem]
                                }
                              >
                                <span className="phong-lop-diem-nhan">
                                  {NHAN_CAP_CHAM[capItem]}
                                </span>
                                <span className="phong-lop-diem-so">
                                  {coDiem ? `${formatDiem(giaTri)}đ` : "-"}
                                </span>
                              </div>
                            );
                          })}
                          {ct.DiemChinhThuc !== null &&
                            ct.DiemChinhThuc !== undefined && (
                              <div className="phong-lop-diem-o chinh-thuc">
                                <span className="phong-lop-diem-nhan">
                                  Chính thức
                                </span>
                                <span className="phong-lop-diem-so">
                                  {formatDiem(ct.DiemChinhThuc)}đ
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                      {truongCuaCap && (
                        <>
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
                                        onDiemChange(
                                          idCt,
                                          isSelected ? "" : td.GiaTriDiem,
                                        );
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
                                    draftDiemVal !== "" &&
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
                                    return;
                                  }
                                  let num = parseFloat(val);
                                  if (isNaN(num)) num = 0;
                                  if (num < 0) num = 0;
                                  if (ct.DiemToiDa && num > ct.DiemToiDa)
                                    num = ct.DiemToiDa;
                                  onDiemChange(idCt, num);
                                }}
                              />
                              <span className="pl2-score-input-hint">
                                (Điểm tối đa: {formatDiem(ct.DiemToiDa)}đ)
                              </span>
                            </div>
                          )}

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
                        </>
                      )}

                      {choPhepNhap && (
                        <div className="pl2-criteria-footer">
                          <div>
                            {daSua ? (
                              <span className="pl2-criteria-status-hint modified">
                                <i className="fa-solid fa-circle-dot"></i> Có
                                thay đổi chưa lưu
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
          </div>
        );
      })}
    </div>
  );
};

export default DanhGiaPhongForm;
