import React, { useRef, useState } from "react";
import MinhChungThanhTichRow from "./MinhChungThanhTichRow";
import {
  formatKb,
  GIOI_HAN_MINH_CHUNG,
  themMinhChung,
  themMinhChungTam,
  validatePdf,
  xoaMinhChung,
} from "../../utils/keKhaiThanhTichApi";

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
 * Khác bản của giờ quy đổi ở hai điểm, cả hai đều do minh chứng ở đây có thể
 * BẮT BUỘC:
 *
 *  1. Mức có `YeuCauMinhChung` mà chưa có tệp nào sẽ chặn LƯU cả bản kê (422
 *     THIEU_MINH_CHUNG), nên ô trống phải cảnh báo đỏ chứ không im lặng. Cảnh
 *     báo nằm NGAY TRONG dropzone: nó vừa là lý do vừa là chỗ để sửa.
 *  2. Dòng CHƯA tồn tại không thể đợi "lưu xong rồi tải tệp lên" - server kiểm
 *     minh chứng ngay trong chính request lưu. Vì vậy tệp của dòng mới đi thẳng
 *     vào KHO TẠM (`themMinhChungTam`) ngay khi chọn; trang cha giữ
 *     `IdMinhChungTt` và gửi kèm `IdMinhChung[]` của dòng khi lưu.
 *
 * Tệp tạm là tệp THẬT trên máy chủ, không phải hàng đợi trong bộ nhớ: bỏ nó ra
 * khỏi dòng phải gọi API xoá, không chỉ là gỡ khỏi state.
 *
 * @param {number|null} idChiTiet null = dòng chưa lưu ⇒ đi kho tạm
 * @param {number|string} idNam năm của bản kê, chủ sở hữu của tệp tạm
 * @param {object[]} danhSach minh chứng đã gắn vào dòng
 * @param {object[]} mcTam minh chứng đang nằm ở kho tạm, chờ lần lưu tới
 * @param {boolean} [yeuCauMinhChung] mức này bắt buộc có minh chứng
 */
const MinhChungDongThanhTichBox = ({
  idChiTiet,
  idNam,
  danhSach = [],
  mcTam = [],
  choPhepSua,
  yeuCauMinhChung = false,
  onChange,
  onChangeTam,
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
  const coTep = danhSach.length > 0 || mcTam.length > 0;
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

    // Tải lên TUẦN TỰ. Chạy song song thì mỗi lần onChange đều dựng từ danh
    // sách cũ và đè mất kết quả của nhau.
    setTienDo({ xong: 0, tong: hopLe.length });
    let dsGan = danhSach;
    let dsTam = mcTam;
    try {
      for (const f of hopLe) {
        if (idChiTiet) {
          const moi = await themMinhChung(idChiTiet, f, "");
          if (moi) {
            dsGan = [...dsGan, moi];
            onChange?.(dsGan);
          }
        } else {
          const moi = await themMinhChungTam(idNam, f, "");
          if (moi) {
            dsTam = [...dsTam, moi];
            onChangeTam?.(dsTam);
          }
        }
        setTienDo((t) => (t ? { ...t, xong: t.xong + 1 } : t));
      }
      onSuccess?.(
        idChiTiet
          ? hopLe.length === 1
            ? "Đã tải lên minh chứng"
            : `Đã tải lên ${hopLe.length} minh chứng`
          : hopLe.length === 1
            ? "Đã tải tệp lên máy chủ - bấm Lưu để gắn vào dòng"
            : `Đã tải ${hopLe.length} tệp lên máy chủ - bấm Lưu để gắn vào dòng`,
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

  /**
   * Bỏ một tệp tạm. Tệp đã nằm trên máy chủ nên phải gọi API xoá - server có dọn
   * tệp mồ côi sau 7 ngày, nhưng để người dùng nhìn thấy tệp "đã bỏ" vẫn còn
   * chiếm chỗ suốt một tuần thì không chấp nhận được.
   */
  const boTepTam = async (mc) => {
    setDangXoaId(mc.IdMinhChungTt);
    try {
      await xoaMinhChung(mc.IdMinhChungTt);
      onChangeTam?.(mcTam.filter((x) => x.IdMinhChungTt !== mc.IdMinhChungTt));
    } catch (error) {
      console.error("Lỗi bỏ minh chứng tạm:", error);
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

      {mcTam.length > 0 && (
        <div className="kkt-mc-list">
          {mcTam.map((mc) => (
            <div className="kkt-mc-cho" key={mc.IdMinhChungTt}>
              <span className="kkt-mc-cho-icon">
                <i className="fa-solid fa-file-pdf"></i>
              </span>
              <div className="kkt-mc-cho-main">
                <button
                  type="button"
                  className="kkt-mc-cho-ten"
                  onClick={() => onXem?.(mc)}
                  title={`Xem trước: ${mc.TenHienThi || mc.TenFileGoc}`}
                >
                  {mc.TenHienThi || mc.TenFileGoc}
                </button>
                <div className="kkt-mc-cho-meta">
                  {formatKb(mc.KichThuocKb)}
                  <span className="kkt-mc-cho-tag">
                    <i className="fa-regular fa-clock"></i> gắn vào dòng khi bấm
                    Lưu
                  </span>
                </div>
              </div>
              {choPhepSua && (
                <button
                  type="button"
                  className="kkt-mc-cho-go"
                  onClick={() => boTepTam(mc)}
                  disabled={dangXoaId === mc.IdMinhChungTt}
                  title="Bỏ tệp này"
                >
                  <i
                    className={`fa-solid ${
                      dangXoaId === mc.IdMinhChungTt
                        ? "fa-spinner fa-spin"
                        : "fa-xmark"
                    }`}
                  ></i>
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
                  có minh chứng — chưa đính kèm thì không lưu được dòng này
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
