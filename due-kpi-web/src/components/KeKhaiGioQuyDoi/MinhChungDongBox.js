import React, { useRef, useState } from "react";
import MinhChungKeKhaiRow from "./MinhChungKeKhaiRow";
import {
  formatKb,
  GIOI_HAN_MINH_CHUNG,
  themMinhChung,
  validatePdf,
  xoaMinhChung,
} from "../../utils/keKhaiGioQuyDoiApi";

let seqCho = 0;

/**
 * Minh chứng của MỘT dòng kê khai.
 *
 * Cho phép người dùng bấm trực tiếp vào nút đính kèm để mở hộp thoại chọn tệp PDF.
 * Tệp được đính kèm ngay lập tức mà không cần form trung gian.
 */
const MinhChungDongBox = ({
  idChiTiet,
  danhSach = [],
  mcCho = [],
  choPhepSua,
  onChange,
  onChangeCho,
  onXem,
  onTai,
  onError,
  onSuccess,
}) => {
  const inputRef = useRef(null);
  const [dangTai, setDangTai] = useState(false);
  const [dangXoaId, setDangXoaId] = useState(null);

  const handleChonFile = async (e) => {
    const chon = e.target.files?.[0] || null;
    if (!chon) return;

    // Chặn sớm nếu không phải PDF hợp lệ
    const loi = validatePdf(chon);
    if (loi) {
      onError?.(loi);
      e.target.value = "";
      return;
    }

    // Reset input để có thể chọn lại file cùng tên nếu muốn
    e.target.value = "";

    // Dòng chưa có IdChiTiet: xếp vào hàng chờ FE, trang cha sẽ tải lên sau khi bấm Lưu
    if (!idChiTiet) {
      onChangeCho?.([
        ...mcCho,
        {
          key: `cho-${++seqCho}`,
          file: chon,
          tenHienThi: chon.name,
        },
      ]);
      onSuccess?.("Đã đính kèm tệp - bấm Lưu để tải lên máy chủ");
      return;
    }

    // Dòng đã có IdChiTiet: tải lên máy chủ ngay
    setDangTai(true);
    try {
      const moi = await themMinhChung(idChiTiet, chon, "");
      if (moi) onChange?.([...danhSach, moi]);
      onSuccess?.("Đã tải lên minh chứng");
    } catch (error) {
      console.error("Lỗi tải lên minh chứng kê khai:", error);
      onError?.(error.message);
    } finally {
      setDangTai(false);
    }
  };

  const xoa = async (mc) => {
    setDangXoaId(mc.IdMinhChungKk);
    try {
      await xoaMinhChung(mc.IdMinhChungKk);
      onChange?.(danhSach.filter((x) => x.IdMinhChungKk !== mc.IdMinhChungKk));
      onSuccess?.("Đã gỡ minh chứng");
    } catch (error) {
      console.error("Lỗi gỡ minh chứng kê khai:", error);
      onError?.(error.message);
    } finally {
      setDangXoaId(null);
    }
  };

  return (
    <div className="kkq-mc-box">
      <input
        ref={inputRef}
        type="file"
        accept={GIOI_HAN_MINH_CHUNG.Accept}
        style={{ display: "none" }}
        onChange={handleChonFile}
      />

      {danhSach.length > 0 && (
        <div className="kkq-mc-list">
          {danhSach.map((mc) => (
            <MinhChungKeKhaiRow
              key={mc.IdMinhChungKk}
              mc={mc}
              onXem={onXem}
              onTai={onTai}
              onXoa={choPhepSua ? xoa : undefined}
              dangXoa={dangXoaId === mc.IdMinhChungKk}
            />
          ))}
        </div>
      )}

      {mcCho.length > 0 && (
        <div className="kkq-mc-list">
          {mcCho.map((item) => (
            <div className="kkq-mc-cho" key={item.key}>
              <i
                className="fa-solid fa-file-pdf"
                style={{ color: "#dc2626" }}
              ></i>
              <div className="kkq-mc-cho-main">
                <div className="kkq-mc-cho-ten">{item.file.name}</div>
                <div className="kkq-mc-cho-meta">
                  {formatKb(Math.ceil(item.file.size / 1024))} • sẽ tải lên khi
                  bấm Lưu
                </div>
              </div>
              {choPhepSua && (
                <button
                  type="button"
                  className="kkq-mc-cho-go"
                  onClick={() =>
                    onChangeCho?.(mcCho.filter((x) => x.key !== item.key))
                  }
                  title="Bỏ tệp khỏi hàng chờ"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {choPhepSua && (
        <div className="kkq-mc-add-wrap">
          <button
            type="button"
            className="cd-link-btn kkq-mc-btn-add"
            onClick={() => inputRef.current?.click()}
            disabled={dangTai}
          >
            <i
              className={`fa-solid ${
                dangTai ? "fa-spinner fa-spin" : "fa-paperclip"
              }`}
            ></i>{" "}
            {dangTai
              ? "Đang tải lên..."
              : danhSach.length === 0 && mcCho.length === 0
                ? "Đính kèm minh chứng (PDF)"
                : "Thêm tệp PDF"}
          </button>
        </div>
      )}

      {!choPhepSua && danhSach.length === 0 && (
        <span className="kkq-trong">Không có minh chứng</span>
      )}
    </div>
  );
};

export default MinhChungDongBox;
