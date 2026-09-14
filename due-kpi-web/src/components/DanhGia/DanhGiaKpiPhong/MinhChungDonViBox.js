import React, { useRef, useState } from "react";
import { formatNgayGio } from "../../../utils/phieuApi";
import {
  CAU_HINH_MC_MAC_DINH,
  formatKb,
  iconFile,
  kieuXemTruoc,
  locFileHopLe,
  themMinhChungDonVi,
  xoaMinhChungDonVi,
} from "../../../utils/minhChungDonViApi";

/**
 * Minh chứng của MỘT dòng tiêu chí trong phiếu KPI Phòng / Trung tâm.
 *
 * Vùng đính kèm là một DROPZONE: kéo thả hoặc bấm để chọn, nhận nhiều tệp một lượt.
 * Khi đã có tệp, dropzone tự thu về dạng thanh gọn để danh sách tệp - thứ người dùng
 * thực sự cần đọc - không bị đẩy xuống dưới một khối trống to.
 *
 * KHÁC bản của kê khai thành tích ở ba điểm:
 *
 *  - KHÔNG CÓ HÀNG CHỜ. Dòng chi tiết của phiếu đơn vị được server tạo sẵn cùng phiếu
 *    nên `idChiTiet` (id_chi_tiet_dv) luôn tồn tại - tải lên được ngay, không cần xếp
 *    hàng rồi ghép id sau khi Lưu như bên kê khai (ở đó dòng mới chưa có id).
 *  - NHẬN CẢ ẢNH. Whitelist lấy từ GET api/cau-hinh/minh-chung (pdf/png/jpg/jpeg), nên
 *    icon phải suy theo định dạng thật chứ không cắm cứng PDF.
 *  - CẢNH BÁO LÀ NHẮC NHỞ, KHÔNG PHẢI CHẶN. `batBuoc` (BatBuocMinhChung) chỉ tô viền
 *    nhắc đính kèm; sp_phieu_dv_submit không kiểm cờ này nên phiếu vẫn nộp được khi
 *    còn trống - đừng dùng nó để khoá nút Trình phiếu.
 *
 * @param {number}   idChiTiet   id_chi_tiet_dv của dòng
 * @param {object[]} danhSach    MinhChungDto[] đã có trên server
 * @param {boolean}  choPhepSua  chỉ thư ký phòng ở trạng thái 1 mới được sửa
 * @param {boolean}  [batBuoc]   tiêu chí được đánh dấu nên có minh chứng
 * @param {object}   [cauHinh]   kết quả layCauHinhMinhChung()
 */
const MinhChungDonViBox = ({
  idChiTiet,
  danhSach = [],
  choPhepSua,
  batBuoc = false,
  cauHinh = CAU_HINH_MC_MAC_DINH,
  onChange,
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
  const coTep = danhSach.length > 0;
  const thieu = batBuoc && !coTep;

  const gioiHanText = `Nhận ${(cauHinh.AllowedExtensions || []).join(", ")} · tối đa ${formatKb(
    cauHinh.MaxFileSizeKb,
  )} mỗi tệp`;

  /**
   * Nhận một lô tệp từ input hoặc từ thao tác kéo thả.
   *
   * Lọc trước rồi mới tải: một tệp sai định dạng không được kéo cả lô hỏng theo -
   * kéo nhầm 1 trong 5 tệp thì 4 tệp còn lại vẫn phải vào.
   */
  const nhanTepMoi = async (fileList) => {
    const tep = Array.from(fileList || []);
    if (tep.length === 0) return;

    const { hopLe, loi } = locFileHopLe(tep, cauHinh);
    if (loi.length > 0) onError?.(loi.join(" · "));
    if (hopLe.length === 0) return;

    // Tải lên TUẦN TỰ. Chạy song song thì mỗi lần onChange đều dựng từ `danhSach`
    // cũ và đè mất kết quả của nhau.
    setTienDo({ xong: 0, tong: hopLe.length });
    let ds = danhSach;
    try {
      for (const f of hopLe) {
        const moi = await themMinhChungDonVi(idChiTiet, f, "");
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
      console.error("Lỗi tải lên minh chứng phiếu đơn vị:", error);
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
    setDangXoaId(mc.IdMinhChung);
    try {
      await xoaMinhChungDonVi(mc.IdMinhChung);
      onChange?.(danhSach.filter((x) => x.IdMinhChung !== mc.IdMinhChung));
      onSuccess?.("Đã gỡ minh chứng");
    } catch (error) {
      console.error("Lỗi gỡ minh chứng phiếu đơn vị:", error);
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

  const lopDropzone = ["phong-dz", coTep ? "phong-dz-gon" : "", keo ? "phong-dz-keo" : "", thieu ? "phong-dz-loi" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="phong-mc-box">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={cauHinh.Accept}
        style={{ display: "none" }}
        onChange={handleChonFile}
      />

      {danhSach.length > 0 && (
        <div className="phong-mc-list">
          {danhSach.map((mc) => {
            const nhan = mc.TenHienThi || mc.TenFileGoc || "Tệp minh chứng";
            const icon = iconFile(mc);
            // doc/xls cũ không nhúng được vào iframe: ẩn nút Xem, chỉ mời tải về
            const xemDuoc = kieuXemTruoc(mc) !== null;
            const meta = [
              mc.KichThuocKb != null ? formatKb(mc.KichThuocKb) : null,
              mc.TenNguoiTaiLen || null,
              mc.NgayTaiLen ? formatNgayGio(mc.NgayTaiLen) : null,
            ]
              .filter(Boolean)
              .join(" • ");

            return (
              <div className="cd-mc-row" key={mc.IdMinhChung}>
                <i
                  className={`${icon.className} cd-mc-icon`}
                  style={{ color: icon.color }}
                ></i>
                <div className="cd-mc-main">
                  <button
                    type="button"
                    className="cd-mc-name"
                    onClick={() => (xemDuoc ? onXem?.(mc) : onTai?.(mc))}
                    title={xemDuoc ? `Xem trước: ${nhan}` : `Tải về: ${nhan}`}
                  >
                    {nhan}
                  </button>
                  <div className="cd-mc-meta">{meta || "-"}</div>
                </div>
                {xemDuoc && (
                  <button
                    type="button"
                    className="cd-mc-act"
                    onClick={() => onXem?.(mc)}
                    title="Xem trước tệp"
                  >
                    <i className="fa-solid fa-eye"></i> Xem
                  </button>
                )}
                <button
                  type="button"
                  className="cd-mc-act"
                  onClick={() => onTai?.(mc)}
                  title="Tải tệp về máy"
                >
                  <i className="fa-solid fa-download"></i> Tải về
                </button>
                {choPhepSua && (
                  <button
                    type="button"
                    className="cd-mc-act phong-mc-xoa"
                    onClick={() => xoa(mc)}
                    disabled={dangXoaId === mc.IdMinhChung}
                    title="Gỡ tệp khỏi tiêu chí này"
                  >
                    <i
                      className={`fa-solid ${
                        dangXoaId === mc.IdMinhChung
                          ? "fa-spinner fa-spin"
                          : "fa-trash"
                      }`}
                    ></i>{" "}
                    Gỡ
                  </button>
                )}
              </div>
            );
          })}
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
          <span className="phong-dz-icon">
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
          <span className="phong-dz-text">
            <span className="phong-dz-chinh">
              {dangTai
                ? `Đang tải lên ${Math.min(tienDo.xong + 1, tienDo.tong)}/${tienDo.tong}…`
                : keo
                  ? "Thả tệp để đính kèm"
                  : coTep
                    ? "Thêm minh chứng"
                    : "Kéo thả tệp vào đây hoặc bấm để chọn"}
            </span>
            <span className={`phong-dz-phu${thieu ? " phong-dz-phu-loi" : ""}`}>
              {thieu ? (
                <>
                  <i className="fa-solid fa-triangle-exclamation"></i> Tiêu chí
                  này nên có minh chứng kèm theo
                </>
              ) : (
                gioiHanText
              )}
            </span>
          </span>
        </button>
      )}

      {!choPhepSua && danhSach.length === 0 && (
        <span className="phong-mc-trong">Không có minh chứng</span>
      )}
    </div>
  );
};

export default MinhChungDonViBox;
