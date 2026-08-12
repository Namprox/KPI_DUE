import React, { useEffect, useRef, useState } from "react";
import "../../css/NhiemVuKhoa.css";
import SearchSelect from "../Common/SearchSelect";
import {
  formatKb,
  guiPhanHoi,
  layCauHinh,
  LOAI_PHAN_HOI,
  validatePdf,
} from "../../utils/nhiemVuKhoaApi";

/**
 * Giảng viên gửi phản hồi về phân công của Khoa.
 *
 * ⚠️ Endpoint `POST /nhiem-vu-khoa/phan-hoi` CHỈ nhận `multipart/form-data`, kể
 * cả khi không đính kèm file — gửi JSON sẽ nhận 415. Việc dựng FormData nằm
 * trong `guiPhanHoi()` nên form này chỉ cần truyền giá trị thô.
 *
 * Hai loại phản hồi cần hai thứ khác nhau:
 *  - **Sai vai trò** BẮT BUỘC trỏ tới một nhiệm vụ của chính kỳ đó — chọn từ
 *    danh sách nhiệm vụ giảng viên đang được phân công.
 *  - **Thiếu nhiệm vụ** không trỏ tới nhiệm vụ nào (giảng viên KHÔNG tự tạo được
 *    nhiệm vụ), chỉ chọn nhóm gợi ý để Khoa biết xếp vào đâu.
 *
 * File là TUỲ CHỌN và được server đính kèm SAU khi phản hồi đã lưu, nên upload
 * lỗi không làm mất nội dung vừa gửi — trường hợp đó hiện cảnh báo nhẹ chứ không
 * báo thất bại toàn bộ.
 */
const GuiPhanHoiModal = ({
  isOpen,
  idNam,
  nhiemVuCuaToi = [],
  onClose,
  onSent,
  onError,
  onSuccess,
  onWarn,
}) => {
  const inputRef = useRef(null);

  const [loai, setLoai] = useState(String(LOAI_PHAN_HOI.SAI_VAI_TRO));
  const [idNhiemVuKhoa, setIdNhiemVuKhoa] = useState("");
  const [idNhomNv, setIdNhomNv] = useState("");
  const [noiDung, setNoiDung] = useState("");
  const [file, setFile] = useState(null);
  const [tenHienThi, setTenHienThi] = useState("");

  const [cauHinh, setCauHinh] = useState(null);
  const [dangGui, setDangGui] = useState(false);
  const [loiForm, setLoiForm] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoai(String(LOAI_PHAN_HOI.SAI_VAI_TRO));
    setIdNhiemVuKhoa(
      nhiemVuCuaToi.length === 1 ? String(nhiemVuCuaToi[0].IdNhiemVuKhoa) : "",
    );
    setIdNhomNv("");
    setNoiDung("");
    setFile(null);
    setTenHienThi("");
    setLoiForm("");
    setDangGui(false);
    if (inputRef.current) inputRef.current.value = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /** Danh mục nhóm + giới hạn upload; nạp lười khi mở form, dùng lại lần sau. */
  useEffect(() => {
    if (!isOpen || cauHinh) return;
    let huy = false;
    layCauHinh()
      .then((ch) => {
        if (!huy) setCauHinh(ch);
      })
      .catch((error) => {
        console.error("Lỗi tải cấu hình module nhiệm vụ Khoa:", error);
      });
    return () => {
      huy = true;
    };
  }, [isOpen, cauHinh]);

  const laSaiVaiTro = Number(loai) === LOAI_PHAN_HOI.SAI_VAI_TRO;

  const chonFile = (e) => {
    const chon = e.target.files?.[0] || null;
    if (!chon) {
      setFile(null);
      return;
    }
    const loi = validatePdf(chon, cauHinh);
    if (loi) {
      onError(loi);
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(chon);
  };

  const moChonFile = () => inputRef.current?.click();

  const boFile = () => {
    setFile(null);
    setTenHienThi("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const gui = async () => {
    if (!noiDung.trim()) {
      setLoiForm("Chưa nhập nội dung phản hồi");
      return;
    }
    if (laSaiVaiTro && !idNhiemVuKhoa) {
      setLoiForm("Phản hồi sai vai trò phải chỉ rõ nhiệm vụ nào");
      return;
    }
    setLoiForm("");
    setDangGui(true);
    try {
      const { canhBaoDinhKem } = await guiPhanHoi({
        idNam,
        loaiPhanHoi: loai,
        idNhiemVuKhoa,
        idNhomNv,
        noiDung,
        file,
        tenHienThi,
      });
      if (canhBaoDinhKem) {
        onWarn(
          "Phản hồi đã gửi nhưng tệp đính kèm không tải lên được. Bạn có thể bổ sung tệp sau.",
        );
      } else {
        onSuccess("Đã gửi phản hồi tới Khoa");
      }
      onSent();
    } catch (error) {
      console.error("Lỗi gửi phản hồi:", error);
      setLoiForm(error.message);
      onError(error.message);
    }
    setDangGui(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box form-modal-box nvk-ph-form"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>
            <i
              className="fa-solid fa-comment-dots"
              style={{ marginRight: "8px" }}
            ></i>
            Gửi phản hồi tới Khoa
          </h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label>Loại phản hồi</label>
            <div className="nvk-loai-chon">
              <button
                type="button"
                className={`nvk-loai-nut${laSaiVaiTro ? " nvk-loai-chon-active" : ""}`}
                onClick={() => setLoai(String(LOAI_PHAN_HOI.SAI_VAI_TRO))}
                disabled={dangGui}
              >
                <b>Sai vai trò</b>
                <span>
                  Bạn có trong nhiệm vụ nhưng vai trò hoặc điểm chưa đúng
                </span>
              </button>
              <button
                type="button"
                className={`nvk-loai-nut${!laSaiVaiTro ? " nvk-loai-chon-active" : ""}`}
                onClick={() => setLoai(String(LOAI_PHAN_HOI.THIEU_NHIEM_VU))}
                disabled={dangGui}
              >
                <b>Thiếu nhiệm vụ</b>
                <span>Bạn có tham gia một việc chưa thấy trong danh sách</span>
              </button>
            </div>
          </div>

          {laSaiVaiTro ? (
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label>
                Nhiệm vụ liên quan <span className="text-red">*</span>
              </label>
              <SearchSelect
                value={idNhiemVuKhoa}
                onChange={(v) => setIdNhiemVuKhoa(String(v ?? ""))}
                options={nhiemVuCuaToi.map((nv) => ({
                  value: nv.IdNhiemVuKhoa,
                  label: `${nv.TenNhiemVu} — ${nv.TenVaiTroSnapshot}`,
                }))}
                placeholder="-- Chọn nhiệm vụ --"
                searchable
                disabled={dangGui}
              />
              {nhiemVuCuaToi.length === 0 && (
                <div className="cd-hint cd-hint-warn">
                  Bạn chưa được phân công nhiệm vụ nào, nên hãy chọn loại “Thiếu
                  nhiệm vụ”.
                </div>
              )}
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label>Nhóm gợi ý</label>
              <SearchSelect
                value={idNhomNv}
                onChange={(v) => setIdNhomNv(String(v ?? ""))}
                options={(cauHinh?.Nhom || []).map((n) => ({
                  value: n.IdNhomNv,
                  label: n.TenNhom,
                }))}
                placeholder="-- Chọn nhóm (không bắt buộc) --"
                searchable
                disabled={dangGui}
              />
              <div className="cd-hint">
                Bạn chỉ mô tả bằng lời, Khoa mới là người tạo nhiệm vụ và phân
                định vai trò.
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "16px" }}>
            <label>
              Nội dung <span className="text-red">*</span>
            </label>
            <textarea
              className="form-input cd-textarea"
              rows={4}
              value={noiDung}
              maxLength={2000}
              onChange={(e) => setNoiDung(e.target.value)}
              placeholder="Mô tả rõ vấn đề để Khoa đối chiếu, ví dụ: tôi là chủ trì chứ không phải phối hợp chính."
              disabled={dangGui}
            />
          </div>

          <div className="form-group">
            <label>Tệp đính kèm (PDF, không bắt buộc)</label>

            <input
              ref={inputRef}
              type="file"
              accept={cauHinh?.Accept || ".pdf"}
              onChange={chonFile}
              style={{ display: "none" }}
            />

            {file ? (
              <>
                <div className="cd-mc-row nvk-mc-cho">
                  <i
                    className="fa-solid fa-file-pdf cd-mc-icon"
                    style={{ color: "#dc2626" }}
                  ></i>
                  <div className="cd-mc-main">
                    <div className="nvk-mc-cho-ten">{file.name}</div>
                    <div className="cd-mc-meta">
                      {formatKb(Math.ceil(file.size / 1024))} • gửi kèm phản hồi
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cd-mc-act"
                    onClick={moChonFile}
                    disabled={dangGui}
                    title="Chọn tệp khác"
                  >
                    <i className="fa-solid fa-arrows-rotate"></i> Chọn lại
                  </button>
                  <button
                    type="button"
                    className="cd-mc-act nvk-mc-xoa"
                    onClick={boFile}
                    disabled={dangGui}
                    title="Gỡ tệp đính kèm"
                  >
                    <i className="fa-solid fa-trash"></i> Gỡ
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input nvk-mc-ten"
                  placeholder="Tên hiển thị (tuỳ chọn)"
                  value={tenHienThi}
                  maxLength={cauHinh?.MaxTenHienThiLength || 255}
                  onChange={(e) => setTenHienThi(e.target.value)}
                  disabled={dangGui}
                />
              </>
            ) : (
              <button
                type="button"
                className="nvk-mc-chon"
                onClick={moChonFile}
                disabled={dangGui}
              >
                <i className="fa-solid fa-cloud-arrow-up"></i> Chọn tệp PDF đính
                kèm
              </button>
            )}
          </div>

          {loiForm && (
            <div className="cd-hint cd-hint-error" style={{ fontSize: "13px" }}>
              <i className="fa-solid fa-triangle-exclamation"></i> {loiForm}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            <i className="fa-solid fa-times"></i> Huỷ
          </button>
          <button
            type="button"
            className="btn-submit"
            onClick={gui}
            disabled={dangGui}
          >
            <i
              className={`fa-solid ${dangGui ? "fa-spinner fa-spin" : "fa-paper-plane"}`}
            ></i>{" "}
            Gửi phản hồi
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuiPhanHoiModal;
