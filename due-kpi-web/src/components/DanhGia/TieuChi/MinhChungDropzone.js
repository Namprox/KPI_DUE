import React, { useRef, useState } from "react";

/**
 * Vùng kéo-thả / bấm-chọn tệp minh chứng. THUẦN TRÌNH BÀY: không gọi API, không
 * biết gì về vòng đời tệp - cứ có tệp mới là bắn `onNhanTep(FileList)` rồi để
 * nơi gọi tự xử.
 *
 * Phải tách ra vì hai phiếu tải lên theo hai kiểu khác hẳn nhau:
 *  - Đơn vị / Phòng: dòng chi tiết đã có id_chi_tiet_dv nên tải lên server ngay.
 *  - Giảng viên / Nhân viên: tệp nằm dạng File trong form, tải lên khi Lưu phiếu.
 *
 * @param {boolean}  [coTep]     đã có tệp đính kèm -> dropzone thu về dạng gọn
 * @param {boolean}  [thieu]     tiêu chí bắt buộc minh chứng mà chưa có tệp
 * @param {boolean}  [dangTai]   đang tải lên (khoá tương tác, đổi icon)
 * @param {string}   [nhanDangTai] chữ hiện khi đang tải ("Đang tải lên 1/3…")
 * @param {string}   [accept]    whitelist cho input[type=file]
 * @param {string}   [gioiHanText] dòng phụ mô tả định dạng / dung lượng
 * @param {string}   [nhanThem]  chữ chính khi đã có tệp
 * @param {Function} onNhanTep   nhận FileList mỗi khi người dùng chọn / thả tệp
 */
const MinhChungDropzone = ({
  coTep = false,
  thieu = false,
  dangTai = false,
  nhanDangTai = "Đang tải lên…",
  accept,
  gioiHanText = "",
  nhanThem = "Thêm minh chứng",
  onNhanTep,
}) => {
  const inputRef = useRef(null);
  const [keo, setKeo] = useState(false);

  // dragenter/dragleave bắn cả khi con trỏ đi qua các phần tử CON bên trong
  // dropzone; phải đếm vào-ra mới biết lúc nào chuột thật sự rời khỏi vùng.
  const demKeo = useRef(0);

  const nhanDuoc = !dangTai;

  const keoVao = (e) => {
    if (!nhanDuoc) return;
    e.preventDefault();
    demKeo.current += 1;
    setKeo(true);
  };

  const keoTren = (e) => {
    if (!nhanDuoc) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const keoRa = (e) => {
    e.preventDefault();
    demKeo.current = Math.max(0, demKeo.current - 1);
    if (demKeo.current === 0) setKeo(false);
  };

  const tha = (e) => {
    e.preventDefault();
    demKeo.current = 0;
    setKeo(false);
    if (!nhanDuoc) return;
    onNhanTep?.(e.dataTransfer?.files);
  };

  const chonTep = (e) => {
    // Reset input TRƯỚC khi gọi: chọn lại đúng tệp vừa chọn vẫn phải bắn sự kiện
    const lo = e.target.files;
    const ds = lo ? Array.from(lo) : [];
    e.target.value = "";
    if (ds.length > 0) onNhanTep?.(ds);
  };

  const lop = [
    "pl2-dz",
    coTep ? "pl2-dz-gon" : "",
    keo ? "pl2-dz-keo" : "",
    thieu ? "pl2-dz-loi" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        style={{ display: "none" }}
        onChange={chonTep}
      />
      <button
        type="button"
        className={lop}
        onClick={() => inputRef.current?.click()}
        onDragEnter={keoVao}
        onDragOver={keoTren}
        onDragLeave={keoRa}
        onDrop={tha}
        disabled={dangTai}
      >
        <span className="pl2-dz-icon">
          <i
            className={`fa-solid ${
              dangTai
                ? "fa-spinner fa-spin"
                : keo
                  ? "fa-file-arrow-down"
                  : "fa-cloud-arrow-up"
            }`}
          ></i>
        </span>
        <span className="pl2-dz-text">
          <span className="pl2-dz-chinh">
            {dangTai
              ? nhanDangTai
              : keo
                ? "Thả tệp để đính kèm"
                : coTep
                  ? nhanThem
                  : "Kéo thả tệp vào đây hoặc bấm để chọn"}
          </span>
          <span className={`pl2-dz-phu${thieu ? " pl2-dz-phu-loi" : ""}`}>
            {thieu ? (
              <>
                <i className="fa-solid fa-triangle-exclamation"></i> Tiêu chí này
                được yêu cầu có minh chứng kèm theo
              </>
            ) : (
              gioiHanText
            )}
          </span>
        </span>
      </button>
    </>
  );
};

export default MinhChungDropzone;
