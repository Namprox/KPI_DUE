import React, { useRef, useState } from "react";
import "../../css/NhiemVuKhoa.css";
import MinhChungNvkRow from "../Common/MinhChungNvkRow";
import {
  formatKb,
  themMinhChungNhiemVu,
  validatePdf,
  xoaMinhChung,
  canTaiLaiNhiemVu,
  CAU_HINH_MAC_DINH,
} from "../../utils/nhiemVuKhoaApi";

let seqCho = 0;

/**
 * Minh chứng CẤP NHIỆM VỤ (cap_gan = 1) trong form của Khoa.
 *
 * Đây là file DÙNG CHUNG cho cả nhóm - quyết định phân công, kế hoạch, biên bản:
 * tải lên một lần, mọi giảng viên được phân công đều xem được. Cho phép nhiều
 * file và bổ sung bất cứ lúc nào khi kỳ còn mở.
 *
 * Endpoint minh chứng tách khỏi endpoint lưu nhiệm vụ và cần `IdNhiemVuKhoa` đã
 * tồn tại, nên khối này có HAI chế độ:
 *  - nhiệm vụ đã có id: upload đi NGAY khi chọn tệp, không chờ nút Lưu của form;
 *  - nhiệm vụ chưa tạo: file được xếp vào HÀNG CHỜ ở FE, form tự tải lên ngay
 *    sau khi tạo nhiệm vụ xong - người nhập không phải lưu rồi mở lại.
 *
 * @param {number|null} idNhiemVu       null = nhiệm vụ chưa được tạo
 * @param {object[]}    danhSach        minh chứng hiện có
 * @param {object[]}    hangCho         file chờ tải lên sau khi tạo nhiệm vụ
 * @param {object}      cauHinh         Accept / MaxFileSizeKb
 * @param {boolean}     choPhepSua      cờ ChoPhepSua của nhiệm vụ hoặc CanKeKhai khi tạo
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
  onConflict,
}) => {
  const inputRef = useRef(null);
  const dangTaiRef = useRef(false);
  const [file, setFile] = useState(null);
  const [dangTai, setDangTai] = useState(false);
  const [dangXoaId, setDangXoaId] = useState(null);

  const chonFile = async (e) => {
    const chon = e.target.files?.[0] || null;
    // Chọn lại cùng một tệp sau lỗi vẫn phải phát sinh onChange.
    e.target.value = "";
    if (!chon || !choPhepSua || dangTaiRef.current) return;
    // Chặn sớm cho êm tay người dùng; server vẫn kiểm lại đuôi file + chữ ký PDF
    const loi = validatePdf(chon, cauHinh);
    if (loi) {
      onError(loi);
      return;
    }
    if (idNhiemVu) await taiLen(chon);
    else themVaoHangCho(chon);
  };

  const taiLen = async (tep) => {
    dangTaiRef.current = true;
    setFile(tep);
    setDangTai(true);
    try {
      const moi = await themMinhChungNhiemVu(idNhiemVu, tep, "", cauHinh);
      if (moi) onChange([...danhSach, moi]);
      onSuccess("Đã tải lên minh chứng");
    } catch (error) {
      console.error("Lỗi tải lên minh chứng nhiệm vụ:", error);
      onError(error.message);
      if (canTaiLaiNhiemVu(error)) onConflict?.();
    } finally {
      dangTaiRef.current = false;
      setDangTai(false);
      setFile(null);
    }
  };

  // Nhiệm vụ chưa có id: giữ file lại ở FE, form sẽ tải lên ngay sau khi tạo.
  const themVaoHangCho = (tep) => {
    onHangChoChange?.([...hangCho, { key: `cho-${++seqCho}`, file: tep }]);
  };

  const goKhoiHangCho = (key) =>
    onHangChoChange?.(hangCho.filter((x) => x.key !== key));

  const xoa = async (mc) => {
    setDangXoaId(mc.IdMinhChungNvk);
    try {
      await xoaMinhChung(mc.IdMinhChungNvk);
      onChange(danhSach.filter((x) => x.IdMinhChungNvk !== mc.IdMinhChungNvk));
      onSuccess("Đã gỡ minh chứng");
    } catch (error) {
      console.error("Lỗi gỡ minh chứng nhiệm vụ:", error);
      onError(error.message);
      if (canTaiLaiNhiemVu(error)) onConflict?.();
    }
    setDangXoaId(null);
  };

  return (
    <div className="cd-box nvk-mc-box">
      <div className="cd-box-title">
        <i className="fa-solid fa-paperclip"></i> Minh chứng chung của nhiệm vụ
      </div>

      {danhSach.length === 0 && hangCho.length === 0 ? (
        !choPhepSua && <div className="cd-hint">Chưa có tệp minh chứng.</div>
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
                <div className="nvk-mc-cho-ten" title={cho.file.name}>
                  {cho.file.name}
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
            className="nvk-mc-file"
            aria-label="Chọn tệp minh chứng"
            accept={cauHinh?.Accept || ".pdf"}
            onChange={chonFile}
            disabled={dangTai}
          />
          <button
            type="button"
            className="nvk-mc-chon"
            onClick={() => inputRef.current?.click()}
            disabled={dangTai}
          >
            <span className="nvk-mc-chon-icon">
              <i
                className={`fa-solid ${dangTai ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"}`}
              ></i>
            </span>
            <span className="nvk-mc-chon-text">
              <span className="nvk-mc-chon-ten" title={file?.name}>
                {dangTai
                  ? `Đang tải lên: ${file.name}`
                  : "Bấm để chọn tệp minh chứng"}
              </span>
              <span className="nvk-mc-chon-meta">
                {dangTai
                  ? formatKb(Math.ceil(file.size / 1024))
                  : `Chỉ nhận PDF · tối đa ${formatKb(cauHinh?.MaxFileSizeKb || CAU_HINH_MAC_DINH.MaxFileSizeKb)} mỗi tệp`}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MinhChungNhiemVuBox;
