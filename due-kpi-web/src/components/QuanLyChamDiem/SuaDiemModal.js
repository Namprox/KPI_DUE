import React, { useMemo, useState } from "react";
import { formatDiem, LOAI_THANG_DIEM } from "../../utils/phieuApi";

const bangNhau = (a, b) =>
  a != null && a !== "" && b != null && b !== "" && Number(a) === Number(b);

/**
 * Chọn lại mức điểm cho MỘT tiêu chí khi thẩm định.
 *
 * Người thẩm định chấm trên đúng thang điểm giảng viên đã dùng, nên hộp thoại
 * bày nguyên danh sách mức của tiêu chí (như màn hình tự đánh giá) và đánh dấu
 * mức giảng viên đang chọn - gõ tay một con số rời khỏi thang là cách cũ, dễ
 * cho ra mức không tồn tại trong mẫu.
 *
 * Ba dạng thang điểm, lấy từ `thangDiem` (mẫu đánh giá):
 *   1 rời rạc  → danh sách mức trong mẫu
 *   3 có/không → hai mức dựng tại chỗ (trọn điểm / 0 điểm)
 *   2 liên tục → không có mức nào, rơi về ô nhập số
 * Không tải được mẫu cũng rơi về ô nhập số: thà chấm tay còn hơn chặn hẳn.
 *
 * Nhận xét bắt buộc khi điểm chọn lệch điểm giảng viên tự kê khai - server trả
 * 409 THIEU_LY_DO trong đúng trường hợp này.
 */
const SuaDiemModal = ({ chiTiet, thangDiem, dangGui, onDong, onXacNhan }) => {
  const diemToiDa = Number(chiTiet.DiemToiDa ?? thangDiem?.diemToiDa ?? 0);
  const loai = thangDiem?.loaiThangDiem ?? LOAI_THANG_DIEM.LIEN_TUC;

  const mucList = useMemo(() => {
    if (loai === LOAI_THANG_DIEM.CO_KHONG) {
      return [
        { id: "co", diem: diemToiDa, moTa: "Có" },
        { id: "khong", diem: 0, moTa: "Không" },
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

  // Mức của giảng viên: ưu tiên id đã lưu trên dòng, không có thì dò theo giá
  // trị điểm (thang có/không và các phiếu đời cũ không lưu IdThangDiemChon).
  const idMucGv =
    mucList.find((m) => bangNhau(m.id, chiTiet.IdThangDiemChon))?.id ??
    mucList.find((m) => bangNhau(m.diem, chiTiet.DiemTuDanhGia))?.id ??
    null;
  const idMucDaCham =
    chiTiet.DiemKhoa != null
      ? (mucList.find((m) => bangNhau(m.diem, chiTiet.DiemKhoa))?.id ?? null)
      : null;

  const [idChon, setIdChon] = useState(idMucDaCham ?? idMucGv);
  const [diemNhap, setDiemNhap] = useState(
    chiTiet.DiemKhoa ?? chiTiet.DiemTuDanhGia ?? "",
  );
  const [nhanXet, setNhanXet] = useState(chiTiet.NhanXetKhoa ?? "");
  const [loi, setLoi] = useState("");

  const mucDangChon = mucList.find((m) => m.id === idChon) || null;
  const diemChon = chonTheoMuc ? (mucDangChon?.diem ?? null) : diemNhap;
  const lechDiemGv =
    diemChon !== "" &&
    diemChon != null &&
    chiTiet.DiemTuDanhGia != null &&
    Number(diemChon) !== Number(chiTiet.DiemTuDanhGia);

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
    if (lechDiemGv && !nhanXet.trim()) {
      setLoi(
        "Điểm khác mức giảng viên tự kê khai - bắt buộc ghi lý do điều chỉnh trong ô nhận xét.",
      );
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

        {/* Mọi khoảng cách trong thân hộp thoại do .cd-sd-form (gap) quyết định:
            các khối con KHÔNG tự đặt margin, nếu không nhịp dọc lại so le mỗi khi
            thêm/bớt một khối tùy điều kiện (mô tả GV, cảnh báo lệch điểm...). */}
        <div className="modal-body cd-sd-form">
          <p className="cd-sd-ten">
            {chiTiet.TenTieuChi || `Tiêu chí #${chiTiet.IdTieuChi}`}
          </p>

          <div className="cd-sd-tom-tat">
            <div>
              <div className="cd-meta-label">Giảng viên tự chấm</div>
              <div className="cd-sd-so">
                {formatDiem(chiTiet.DiemTuDanhGia)}
              </div>
            </div>
            <div>
              <div className="cd-meta-label">Đơn vị đã chấm</div>
              <div className="cd-sd-so">
                {chiTiet.DiemKhoa != null ? formatDiem(chiTiet.DiemKhoa) : "-"}
              </div>
            </div>
            <div>
              <div className="cd-meta-label">Tối đa</div>
              <div className="cd-sd-so">{formatDiem(chiTiet.DiemToiDa)}</div>
            </div>
          </div>

          {chiTiet.MoTaHoanThanh && (
            <div className="cd-box">
              <div className="cd-box-title">Giảng viên mô tả</div>
              <div className="cd-sd-mo-ta">{chiTiet.MoTaHoanThanh}</div>
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
                        name={`muc-${chiTiet.IdChiTiet}`}
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
                      {muc.id === idMucGv && (
                        <span className="cd-td-cua-gv">
                          <i className="fa-solid fa-user-check"></i> GV chọn
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
                htmlFor={`sd-diem-${chiTiet.IdChiTiet}`}
              >
                Điểm (0 – {formatDiem(chiTiet.DiemToiDa)})
              </label>
              <input
                id={`sd-diem-${chiTiet.IdChiTiet}`}
                type="number"
                min="0"
                max={chiTiet.DiemToiDa ?? undefined}
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
            <label className="cd-label" htmlFor={`sd-nx-${chiTiet.IdChiTiet}`}>
              Nhận xét {lechDiemGv && <span className="text-red">*</span>}
            </label>
            <textarea
              id={`sd-nx-${chiTiet.IdChiTiet}`}
              className="cd-textarea"
              rows={3}
              value={nhanXet}
              disabled={dangGui}
              placeholder={
                lechDiemGv
                  ? "Bắt buộc: nêu lý do điều chỉnh so với mức giảng viên tự kê khai"
                  : "Nhận xét của đơn vị (không bắt buộc)"
              }
              onChange={(e) => {
                setNhanXet(e.target.value);
                if (loi) setLoi("");
              }}
            />

            {lechDiemGv && (
              <div className="cd-hint cd-hint-warn">
                <i className="fa-solid fa-circle-info"></i> Mức bạn chọn (
                {formatDiem(diemChon)}) khác mức giảng viên tự kê khai (
                {formatDiem(chiTiet.DiemTuDanhGia)}) - phải ghi lý do.
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
                <i className="fa-solid fa-check"></i> Chốt{" "}
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

export default SuaDiemModal;
