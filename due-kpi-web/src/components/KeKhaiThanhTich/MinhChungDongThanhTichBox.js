import React, { useRef, useState } from "react";
import MinhChungThanhTichRow from "./MinhChungThanhTichRow";
import {
  formatKb,
  GIOI_HAN_MINH_CHUNG,
  themMinhChung,
  validatePdf,
  xoaMinhChung,
} from "../../utils/keKhaiThanhTichApi";

let seqCho = 0;

const GIOI_HAN_TEXT = `Chỉ nhận PDF · tối đa ${formatKb(
  GIOI_HAN_MINH_CHUNG.MaxFileSizeKb,
)} mỗi tệp`;

/**
 * Minh chứng của MỘT dòng kê khai thành tích.
 *
 * Vùng đính kèm là một DROPZONE: kéo thả hoặc bấm để chọn, nhận nhiều tệp một
 * lượt. Khi đã có tệp, dropzone tự thu về dạng thanh gọn để danh sách tệp - thứ
 * người dùng thực sự cần đọc - không bị đẩy xuống dưới một khối trống to.
 *
 * Khác bản của giờ quy đổi ở đúng một điểm: minh chứng có thể BẮT BUỘC. Mức có
 * `YeuCauMinhChung` mà chưa có tệp nào sẽ chặn nộp cả bản kê (422
 * THIEU_MINH_CHUNG), nên ô trống phải cảnh báo đỏ chứ không im lặng. Cảnh báo
 * nằm NGAY TRONG dropzone: nó vừa là lý do vừa là chỗ để sửa, tách thành một
 * dòng chữ đỏ riêng chỉ làm khối này dài thêm mà không chỉ ra cần bấm vào đâu.
 *
 * ⚠️ Điều kiện cảnh báo phải xét CẢ hàng chờ: tệp vừa chọn cho một dòng chưa lưu
 * nằm ở `mcCho` và chưa lên server, nhưng người dùng đã làm đúng phần việc của
 * mình rồi - báo đỏ lúc đó là báo sai.
 *
 * @param {boolean} [yeuCauMinhChung] mức này bắt buộc có minh chứng
 */
const MinhChungDongThanhTichBox = ({
  idChiTiet,
  danhSach = [],
  mcCho = [],
  choPhepSua,
  yeuCauMinhChung = false,
  onChange,
  onChangeCho,
  onXem,
  onTai,
  onError,
  onSuccess,
}) => {
  const inputRef = useRef(null);
  const [tienDo, setTienDo] = useState(null);
  const [dangXoaId, setDangXoaId] = useState(null);
  const [keo, setKeo] = useState(false);

  // dragenter/dragleave bắn cả khi con trỏ đi qua các phần tử CON bên trong
  // dropzone; phải đếm vào-ra mới biết lúc nào chuột thật sự rời khỏi vùng.
  const demKeo = useRef(0);

  const dangTai = tienDo != null;
  const coTep = danhSach.length > 0 || mcCho.length > 0;
  const thieu = yeuCauMinhChung && !coTep;

  /**
   * Nhận một lô tệp từ input hoặc từ thao tác kéo thả.
   *
   * Lọc trước rồi mới tải: một tệp sai định dạng không được kéo cả lô hỏng theo
   * - kéo nhầm 1 trong 5 tệp thì 4 tệp còn lại vẫn phải vào.
   */
  const nhanTepMoi = async (fileList) => {
    const tep = Array.from(fileList || []);
    if (tep.length === 0) return;

    const hopLe = [];
    const loi = [];
    tep.forEach((f) => {
      const l = validatePdf(f);
      if (l) loi.push(`${f.name}: ${l}`);
      else hopLe.push(f);
    });

    if (loi.length > 0) onError?.(loi.join(" · "));
    if (hopLe.length === 0) return;

    // Dòng chưa có IdChiTiet: xếp vào hàng chờ FE, trang cha tải lên sau khi Lưu
    if (!idChiTiet) {
      onChangeCho?.([
        ...mcCho,
        ...hopLe.map((f) => ({
          key: `cho-${++seqCho}`,
          file: f,
          tenHienThi: f.name,
        })),
      ]);
      onSuccess?.(
        hopLe.length === 1
          ? "Đã đính kèm tệp - bấm Lưu để tải lên máy chủ"
          : `Đã đính kèm ${hopLe.length} tệp - bấm Lưu để tải lên máy chủ`,
      );
      return;
    }

    // Dòng đã có IdChiTiet: tải lên máy chủ ngay, TUẦN TỰ. Chạy song song thì
    // mỗi lần onChange đều dựng từ `danhSach` cũ và đè mất kết quả của nhau.
    setTienDo({ xong: 0, tong: hopLe.length });
    let ds = danhSach;
    try {
      for (const f of hopLe) {
        const moi = await themMinhChung(idChiTiet, f, "");
        if (moi) {
          ds = [...ds, moi];
          onChange?.(ds);
        }
        setTienDo((t) => (t ? { ...t, xong: t.xong + 1 } : t));
      }
      onSuccess?.(
        hopLe.length === 1
          ? "Đã tải lên minh chứng"
          : `Đã tải lên ${hopLe.length} minh chứng`,
      );
    } catch (error) {
      console.error("Lỗi tải lên minh chứng kê khai thành tích:", error);
      onError?.(error.message);
    } finally {
      setTienDo(null);
    }
  };

  const handleChonFile = async (e) => {
    // Reset input TRƯỚC khi await: chọn lại đúng tệp vừa chọn vẫn phải bắn onChange
    const lo = Array.from(e.target.files || []);
    e.target.value = "";
    await nhanTepMoi(lo);
  };

  const xoa = async (mc) => {
    setDangXoaId(mc.IdMinhChungTt);
    try {
      await xoaMinhChung(mc.IdMinhChungTt);
      onChange?.(danhSach.filter((x) => x.IdMinhChungTt !== mc.IdMinhChungTt));
      onSuccess?.("Đã gỡ minh chứng");
    } catch (error) {
      console.error("Lỗi gỡ minh chứng kê khai thành tích:", error);
      onError?.(error.message);
    } finally {
      setDangXoaId(null);
    }
  };

  const nhanDuoc = choPhepSua && !dangTai;

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
    nhanTepMoi(e.dataTransfer?.files);
  };

  const lopDropzone = [
    "kkt-dz",
    coTep ? "kkt-dz-gon" : "",
    keo ? "kkt-dz-keo" : "",
    thieu ? "kkt-dz-loi" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="kkt-mc-box">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={GIOI_HAN_MINH_CHUNG.Accept}
        style={{ display: "none" }}
        onChange={handleChonFile}
      />

      {danhSach.length > 0 && (
        <div className="kkt-mc-list">
          {danhSach.map((mc) => (
            <MinhChungThanhTichRow
              key={mc.IdMinhChungTt}
              mc={mc}
              onXem={onXem}
              onTai={onTai}
              onXoa={choPhepSua ? xoa : undefined}
              dangXoa={dangXoaId === mc.IdMinhChungTt}
            />
          ))}
        </div>
      )}

      {mcCho.length > 0 && (
        <div className="kkt-mc-list">
          {mcCho.map((item) => (
            <div className="kkt-mc-cho" key={item.key}>
              <span className="kkt-mc-cho-icon">
                <i className="fa-solid fa-file-pdf"></i>
              </span>
              <div className="kkt-mc-cho-main">
                <div className="kkt-mc-cho-ten" title={item.file.name}>
                  {item.file.name}
                </div>
                <div className="kkt-mc-cho-meta">
                  {formatKb(Math.ceil(item.file.size / 1024))}
                  <span className="kkt-mc-cho-tag">
                    <i className="fa-regular fa-clock"></i> chờ bấm Lưu
                  </span>
                </div>
              </div>
              {choPhepSua && (
                <button
                  type="button"
                  className="kkt-mc-cho-go"
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
        <button
          type="button"
          className={lopDropzone}
          onClick={() => inputRef.current?.click()}
          onDragEnter={keoVao}
          onDragOver={keoTren}
          onDragLeave={keoRa}
          onDrop={tha}
          disabled={dangTai}
        >
          <span className="kkt-dz-icon">
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
          <span className="kkt-dz-text">
            <span className="kkt-dz-chinh">
              {dangTai
                ? `Đang tải lên ${Math.min(tienDo.xong + 1, tienDo.tong)}/${tienDo.tong}…`
                : keo
                  ? "Thả tệp để đính kèm"
                  : coTep
                    ? "Thêm tệp PDF"
                    : "Kéo thả tệp PDF vào đây hoặc bấm để chọn"}
            </span>
            <span className={`kkt-dz-phu${thieu ? " kkt-dz-phu-loi" : ""}`}>
              {thieu ? (
                <>
                  <i className="fa-solid fa-triangle-exclamation"></i> Bắt buộc
                  có minh chứng — chưa đính kèm thì không nộp được bản kê
                </>
              ) : (
                GIOI_HAN_TEXT
              )}
            </span>
          </span>
        </button>
      )}

      {!choPhepSua && danhSach.length === 0 && (
        <span className="kkt-trong">Không có minh chứng</span>
      )}
    </div>
  );
};

export default MinhChungDongThanhTichBox;
