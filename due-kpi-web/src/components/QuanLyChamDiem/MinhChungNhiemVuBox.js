import React, { useRef, useState } from "react";
import "../../css/NhiemVuKhoa.css";
import MinhChungNvkRow from "../Common/MinhChungNvkRow";
import {
  formatKb,
  themMinhChungNhiemVu,
  validatePdf,
  xoaMinhChung,
} from "../../utils/nhiemVuKhoaApi";

let seqCho = 0;

/**
 * Minh chứng CẤP NHIỆM VỤ (cap_gan = 1) trong form của Khoa.
 *
 * Đây là file DÙNG CHUNG cho cả nhóm — quyết định phân công, kế hoạch, biên bản:
 * tải lên một lần, mọi giảng viên được phân công đều xem được. Cho phép nhiều
 * file và bổ sung bất cứ lúc nào khi kỳ còn mở.
 *
 * Endpoint minh chứng tách khỏi endpoint lưu nhiệm vụ và cần `IdNhiemVuKhoa` đã
 * tồn tại, nên khối này có HAI chế độ:
 *  - nhiệm vụ đã có id: upload đi NGAY khi bấm nút, không chờ nút Lưu của form;
 *  - nhiệm vụ chưa tạo: file được xếp vào HÀNG CHỜ ở FE, form tự tải lên ngay
 *    sau khi tạo nhiệm vụ xong — người nhập không phải lưu rồi mở lại.
 *
 * @param {number|null} idNhiemVu       null = nhiệm vụ chưa được tạo
 * @param {object[]}    danhSach        minh chứng hiện có
 * @param {object[]}    hangCho         file chờ tải lên sau khi tạo nhiệm vụ
 * @param {object}      cauHinh         Accept / MaxFileSizeKb / MaxTenHienThiLength
 * @param {boolean}     choPhepSua      kỳ còn mở VÀ người dùng có CanNhap
 * @param {Function}    onChange        (danhSachMoi) => void
 * @param {Function}    onHangChoChange (hangChoMoi) => void
 * @param {Function}    onXem
 * @param {Function}    onTai
 * @param {Function}    onError
 * @param {Function}    onSuccess
 */
const MinhChungNhiemVuBox = ({
  idNhiemVu,
  danhSach = [],
  hangCho = [],
  cauHinh,
  choPhepSua,
  onChange,
  onHangChoChange,
  onXem,
  onTai,
  onError,
  onSuccess,
}) => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [tenHienThi, setTenHienThi] = useState("");
  const [dangTai, setDangTai] = useState(false);
  const [dangXoaId, setDangXoaId] = useState(null);

  const maxTen = cauHinh?.MaxTenHienThiLength || 255;

  const chonFile = (e) => {
    const chon = e.target.files?.[0] || null;
    if (!chon) {
      setFile(null);
      return;
    }
    // Chặn sớm cho êm tay người dùng; server vẫn kiểm lại đuôi file + chữ ký PDF
    const loi = validatePdf(chon, cauHinh);
    if (loi) {
      onError(loi);
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(chon);
  };

  const resetO = () => {
    setFile(null);
    setTenHienThi("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const taiLen = async () => {
    if (!file || !idNhiemVu) return;
    setDangTai(true);
    try {
      const moi = await themMinhChungNhiemVu(
        idNhiemVu,
        file,
        tenHienThi,
        cauHinh,
      );
      if (moi) onChange([...danhSach, moi]);
      resetO();
      onSuccess("Đã tải lên minh chứng");
    } catch (error) {
      console.error("Lỗi tải lên minh chứng nhiệm vụ:", error);
      onError(error.message);
    }
    setDangTai(false);
  };

  // Nhiệm vụ chưa có id: giữ file lại ở FE, form sẽ tải lên ngay sau khi tạo.
  const themVaoHangCho = () => {
    if (!file) return;
    onHangChoChange?.([
      ...hangCho,
      { key: `cho-${++seqCho}`, file, tenHienThi: tenHienThi.trim() },
    ]);
    resetO();
  };

  const goKhoiHangCho = (key) =>
    onHangChoChange?.(hangCho.filter((x) => x.key !== key));

  const xoa = async (mc) => {
    setDangXoaId(mc.IdMinhChungNvk);
    try {
      await xoaMinhChung(mc.IdMinhChungNvk);
      onChange(
        danhSach.filter((x) => x.IdMinhChungNvk !== mc.IdMinhChungNvk),
      );
      onSuccess("Đã gỡ minh chứng");
    } catch (error) {
      console.error("Lỗi gỡ minh chứng nhiệm vụ:", error);
      onError(error.message);
    }
    setDangXoaId(null);
  };

  return (
    <div className="cd-box nvk-mc-box">
      <div className="cd-box-title">
        <i className="fa-solid fa-paperclip"></i> Minh chứng chung của nhiệm vụ
      </div>

      {danhSach.length === 0 && hangCho.length === 0 ? (
        <div className="cd-hint" style={{ marginTop: 0 }}>
          Chưa có tệp nào. Quyết định phân công / kế hoạch / biên bản tải lên ở
          đây sẽ hiển thị cho mọi giảng viên trong nhiệm vụ.
        </div>
      ) : (
        <div className="nvk-mc-list">
          {danhSach.map((mc) => (
            <MinhChungNvkRow
              key={mc.IdMinhChungNvk}
              mc={mc}
              onXem={onXem}
              onTai={onTai}
              onXoa={choPhepSua ? xoa : undefined}
              dangXoa={dangXoaId === mc.IdMinhChungNvk}
            />
          ))}

          {hangCho.map((cho) => (
            <div key={cho.key} className="cd-mc-row nvk-mc-cho">
              <i
                className="fa-solid fa-file-pdf cd-mc-icon"
                style={{ color: "#dc2626" }}
              ></i>
              <div className="cd-mc-main">
                <div className="nvk-mc-cho-ten">
                  {cho.tenHienThi || cho.file.name}
                </div>
                <div className="cd-mc-meta">
                  {formatKb(Math.ceil(cho.file.size / 1024))} • chờ lưu nhiệm vụ
                </div>
              </div>
              <button
                type="button"
                className="cd-mc-act nvk-mc-xoa"
                onClick={() => goKhoiHangCho(cho.key)}
                title="Gỡ tệp này"
              >
                <i className="fa-solid fa-trash"></i> Gỡ
              </button>
            </div>
          ))}
        </div>
      )}

      {choPhepSua && (
        <div className="nvk-mc-form">
          <input
            ref={inputRef}
            type="file"
            className="form-input nvk-mc-file"
            accept={cauHinh?.Accept || ".pdf"}
            onChange={chonFile}
            disabled={dangTai}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Tên hiển thị (tuỳ chọn)"
            value={tenHienThi}
            maxLength={maxTen}
            onChange={(e) => setTenHienThi(e.target.value)}
            disabled={dangTai}
          />
          <button
            type="button"
            className="btn-submit"
            onClick={idNhiemVu ? taiLen : themVaoHangCho}
            disabled={!file || dangTai}
          >
            <i
              className={`fa-solid ${dangTai ? "fa-spinner fa-spin" : "fa-upload"}`}
            ></i>{" "}
            Tải lên
          </button>
        </div>
      )}
    </div>
  );
};

export default MinhChungNhiemVuBox;
