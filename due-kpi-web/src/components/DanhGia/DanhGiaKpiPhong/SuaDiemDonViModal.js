import React, { useMemo, useState } from "react";
import { formatDiem, LOAI_THANG_DIEM } from "../../../utils/phieuApi";

const bangNhau = (a, b) =>
  a != null && a !== "" && b != null && b !== "" && Number(a) === Number(b);

/**
 * Chọn lại mức điểm cho MỘT tiêu chí của phiếu KPI Phòng / Trung tâm, ở bước
 * Trưởng phòng duyệt.
 *
 * Song song với SuaDiemModal của luồng cá nhân và cố ý ĐƠN GIẢN HƠN - ba khác
 * biệt bên dưới đều bắt nguồn từ dữ liệu, đừng chép ngược logic bên kia sang:
 *
 *  - MỐC ĐỐI CHIẾU là `DiemNhap` (thư ký đơn vị đề xuất), không phải điểm giảng
 *    viên tự chấm.
 *  - KHÔNG CÓ `IdThangDiemChon`. ChiTietDanhGiaDonViDto không lưu mức thư ký đã
 *    bấm, nên mức của thư ký chỉ dò được theo GIÁ TRỊ điểm. Mẫu có hai mức trùng
 *    điểm thì dấu "Thư ký chọn" rơi vào mức đầu tiên - chấp nhận được, vì nó chỉ
 *    là chỉ dẫn nhìn.
 *  - NHẬN XÉT KHÔNG BẮT BUỘC khi lệch điểm. PUT chi-tiet-don-vi/{id}/diem-duyet-dv
 *    không có nhánh 409 THIEU_LY_DO như diem-khoa của phiếu cá nhân; bắt buộc ở
 *    client sẽ chặn oan một thao tác server vẫn cho qua.
 *
 * Ba dạng thang điểm lấy từ mẫu (fetchTieuChiTheoMau): 1 rời rạc → danh sách mức,
 * 3 có/không → hai mức dựng tại chỗ, 2 liên tục → ô nhập số. Không tải được mẫu
 * cũng rơi về ô nhập số: thà chấm tay còn hơn chặn hẳn.
 */
const SuaDiemDonViModal = ({ chiTiet, thangDiem, dangGui, onDong, onXacNhan }) => {
  const diemToiDa = Number(chiTiet.DiemToiDa ?? thangDiem?.diemToiDa ?? 0);
  const loai =
    thangDiem?.loaiThangDiem ??
    chiTiet.LoaiThangDiem ??
    LOAI_THANG_DIEM.LIEN_TUC;

  const mucList = useMemo(() => {
    if (loai === LOAI_THANG_DIEM.CO_KHONG) {
      return [
        { id: "co", diem: diemToiDa, moTa: "Có / Đạt" },
        { id: "khong", diem: 0, moTa: "Không / Chưa đạt" },
      ];
    }
    if (loai !== LOAI_THANG_DIEM.ROI_RAC) return [];
    return (thangDiem?.mucDiem || []).map((td) => ({
      id: td.IdThangDiem,
      diem: td.GiaTriDiem,
      moTa: td.DieuKienDiem,
    }));
  }, [loai, diemToiDa, thangDiem]);

  const chonTheoMuc = mucList.length > 0;

  const idMucThuKy =
    mucList.find((m) => bangNhau(m.diem, chiTiet.DiemNhap))?.id ?? null;
  const idMucDaCham =
    chiTiet.DiemDuyetDv != null
      ? (mucList.find((m) => bangNhau(m.diem, chiTiet.DiemDuyetDv))?.id ?? null)
      : null;

  const [idChon, setIdChon] = useState(idMucDaCham ?? idMucThuKy);
  const [diemNhap, setDiemNhap] = useState(
    chiTiet.DiemDuyetDv ?? chiTiet.DiemNhap ?? "",
  );
  const [nhanXet, setNhanXet] = useState(chiTiet.NhanXetDuyetDv ?? "");
  const [loi, setLoi] = useState("");

  const mucDangChon = mucList.find((m) => m.id === idChon) || null;
  const diemChon = chonTheoMuc ? (mucDangChon?.diem ?? null) : diemNhap;
  const lechDiemThuKy =
    diemChon !== "" &&
    diemChon != null &&
    chiTiet.DiemNhap != null &&
    Number(diemChon) !== Number(chiTiet.DiemNhap);

  const kiemTraDiem = () => {
    if (diemChon === "" || diemChon == null)
      return chonTheoMuc ? "Chưa chọn mức điểm" : "Chưa nhập điểm";
    const so = Number(diemChon);
    if (isNaN(so)) return "Điểm phải là số";
    if (so < 0) return "Điểm không được âm";
    if (chiTiet.DiemToiDa != null && so > Number(chiTiet.DiemToiDa)) {
      return `Điểm vượt mức tối đa (${formatDiem(chiTiet.DiemToiDa)})`;
    }
    return "";
  };

  const handleXacNhan = () => {
    const loiDiem = kiemTraDiem();
    if (loiDiem) {
      setLoi(loiDiem);
      return;
    }
    setLoi("");
    onXacNhan({ diem: Number(diemChon), nhanXet: nhanXet.trim() || null });
  };

  return (
    <div className="modal-overlay" onClick={dangGui ? undefined : onDong}>
      <div
        className="modal-box cd-modal-cham"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Chấm lại điểm tiêu chí</h3>
          <button className="close-btn" onClick={onDong} disabled={dangGui}>
            &times;
          </button>
        </div>

        <div className="modal-body cd-sd-form">
          <p className="cd-sd-ten">
            {chiTiet.TenTieuChi || `Tiêu chí #${chiTiet.IdTieuChi}`}
          </p>

          <div className="cd-sd-tom-tat">
            <div>
              <div className="cd-meta-label">Thư ký đề xuất</div>
              <div className="cd-sd-so">{formatDiem(chiTiet.DiemNhap)}</div>
            </div>
            <div>
              <div className="cd-meta-label">Trưởng phòng đã chấm</div>
              <div className="cd-sd-so">
                {chiTiet.DiemDuyetDv != null
                  ? formatDiem(chiTiet.DiemDuyetDv)
                  : "-"}
              </div>
            </div>
            <div>
              <div className="cd-meta-label">Tối đa</div>
              <div className="cd-sd-so">{formatDiem(chiTiet.DiemToiDa)}</div>
            </div>
          </div>

          {chiTiet.NhanXetNhap && (
            <div className="cd-box">
              <div className="cd-box-title">Thư ký đơn vị diễn giải</div>
              <div className="cd-sd-mo-ta">{chiTiet.NhanXetNhap}</div>
            </div>
          )}

          {chonTheoMuc ? (
            <div className="cd-sd-nhom">
              <span className="cd-label">Chọn mức điểm</span>
              <div className="cd-td-list">
                {mucList.map((muc) => {
                  const chon = muc.id === idChon;
                  return (
                    <label
                      key={muc.id}
                      className={`cd-td-item${chon ? " selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`muc-dv-${chiTiet.IdChiTietDv}`}
                        checked={chon}
                        disabled={dangGui}
                        onChange={() => {
                          setIdChon(muc.id);
                          if (loi) setLoi("");
                        }}
                      />
                      <span className="cd-td-badge">
                        {formatDiem(muc.diem)}đ
                      </span>
                      <span className="cd-td-text">
                        {muc.moTa || "(Không có mô tả mức)"}
                      </span>
                      {muc.id === idMucThuKy && (
                        <span className="cd-td-cua-gv">
                          <i className="fa-solid fa-user-check"></i> Thư ký chọn
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="cd-sd-nhom">
              <label
                className="cd-label"
                htmlFor={`sd-dv-diem-${chiTiet.IdChiTietDv}`}
              >
                Điểm (0 – {formatDiem(chiTiet.DiemToiDa)})
              </label>
              <input
                id={`sd-dv-diem-${chiTiet.IdChiTietDv}`}
                type="number"
                min="0"
                max={chiTiet.DiemToiDa ?? undefined}
                step="any"
                className="cd-diem-input"
                value={diemNhap}
                disabled={dangGui}
                onChange={(e) => {
                  setDiemNhap(e.target.value);
                  if (loi) setLoi("");
                }}
              />
              <div className="cd-hint">
                Tiêu chí này chấm theo điểm liên tục nên không có mức để chọn.
              </div>
            </div>
          )}

          <div className="cd-sd-nhom">
            <label
              className="cd-label"
              htmlFor={`sd-dv-nx-${chiTiet.IdChiTietDv}`}
            >
              Nhận xét
            </label>
            <textarea
              id={`sd-dv-nx-${chiTiet.IdChiTietDv}`}
              className="cd-textarea"
              rows={3}
              value={nhanXet}
              disabled={dangGui}
              placeholder="Nhận xét của Trưởng phòng (không bắt buộc)"
              onChange={(e) => {
                setNhanXet(e.target.value);
                if (loi) setLoi("");
              }}
            />

            {lechDiemThuKy && (
              <div className="cd-hint cd-hint-warn">
                <i className="fa-solid fa-circle-info"></i> Mức bạn chọn (
                {formatDiem(diemChon)}) khác mức thư ký đề xuất (
                {formatDiem(chiTiet.DiemNhap)}) - nên ghi lại lý do điều chỉnh.
              </div>
            )}

            {loi && (
              <div className="cd-hint cd-hint-error">
                <i className="fa-solid fa-circle-exclamation"></i> {loi}
              </div>
            )}
          </div>
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
                <i className="fa-solid fa-check"></i> Chấm{" "}
                {diemChon === "" || diemChon == null
                  ? "điểm"
                  : `${formatDiem(diemChon)} điểm`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuaDiemDonViModal;
