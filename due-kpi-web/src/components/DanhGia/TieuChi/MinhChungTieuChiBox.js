import React, { useState } from "react";
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
import MinhChungDropzone from "./MinhChungDropzone";
import "../../../css/DanhGia/MinhChungTieuChiBox.css";

/**
 * Minh chứng của MỘT dòng tiêu chí trong phiếu KPI Đơn vị/Khoa và Phòng/Trung tâm.
 *
 * Gộp từ hai bản trùng nhau trước đây (DanhGiaKpiDonVi/MinhChungDonViBox.js và
 * DanhGiaKpiPhong/MinhChungDonViBox.js) - chúng chỉ khác nhau tiền tố class.
 *
 * KHÁC bản của kê khai thành tích ở ba điểm:
 *
 *  - KHÔNG CÓ HÀNG CHỜ. Dòng chi tiết của phiếu đơn vị được server tạo sẵn cùng
 *    phiếu nên `idChiTiet` (id_chi_tiet_dv) luôn tồn tại - tải lên được ngay,
 *    không cần xếp hàng rồi ghép id sau khi Lưu như bên kê khai.
 *  - NHẬN CẢ ẢNH. Whitelist lấy từ GET api/cau-hinh/minh-chung (pdf/png/jpg/jpeg),
 *    nên icon phải suy theo định dạng thật chứ không cắm cứng PDF.
 *  - CẢNH BÁO LÀ NHẮC NHỞ, KHÔNG PHẢI CHẶN. `batBuoc` (BatBuocMinhChung) chỉ tô
 *    viền nhắc đính kèm; sp_phieu_dv_submit không kiểm cờ này nên phiếu vẫn nộp
 *    được khi còn trống - đừng dùng nó để khoá nút Trình phiếu.
 *
 * @param {number}   idChiTiet   id_chi_tiet_dv của dòng tiêu chí
 * @param {object[]} danhSach    MinhChungDto[] đã có trên server
 * @param {boolean}  choPhepSua  quyền sửa minh chứng (thư ký ở trạng thái 1)
 * @param {boolean}  [batBuoc]   tiêu chí có cờ BatBuocMinhChung
 * @param {object}   [cauHinh]   cấu hình từ layCauHinhMinhChung()
 * @param {Function} [onChange]  bắn danh sách minh chứng mới sau khi thêm/gỡ
 * @param {Function} [onXem]     xem trước tệp trong modal
 * @param {Function} [onTai]     tải tệp về máy
 * @param {Function} [onError]   thông báo lỗi (toast)
 * @param {Function} [onSuccess] thông báo thành công (toast)
 */
const MinhChungTieuChiBox = ({
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
  const [tienDo, setTienDo] = useState(null);
  const [dangXoaId, setDangXoaId] = useState(null);

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

  return (
    <div className="pl2-mc-box">
      {/* Danh sách minh chứng đã đính kèm */}
      {danhSach.length > 0 && (
        <div className="pl2-mc-list">
          {danhSach.map((mc) => {
            const nhan = mc.TenHienThi || mc.TenFileGoc || "Tệp minh chứng";
            const icon = iconFile(mc);
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
                {choPhepSua && (
                  <button
                    type="button"
                    className="cd-mc-act pl2-mc-xoa"
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

      {/* Vùng kéo thả khi còn quyền sửa */}
      {choPhepSua && (
        <MinhChungDropzone
          coTep={coTep}
          thieu={thieu}
          dangTai={dangTai}
          nhanDangTai={
            dangTai
              ? `Đang tải lên ${Math.min(tienDo.xong + 1, tienDo.tong)}/${tienDo.tong}…`
              : ""
          }
          accept={cauHinh.Accept}
          gioiHanText={gioiHanText}
          onNhanTep={nhanTepMoi}
        />
      )}

      {/* Thông báo rỗng khi không còn quyền sửa và chưa có tệp */}
      {!choPhepSua && danhSach.length === 0 && (
        <span className="pl2-mc-trong">Chưa có minh chứng</span>
      )}
    </div>
  );
};

export default MinhChungTieuChiBox;
