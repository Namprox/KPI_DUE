import React from "react";
import SearchSelect from "../../Common/SearchSelect";
import {
  MUC_TU_DE_XUAT,
  TRANG_THAI,
  formatNgayGio,
} from "../../../utils/phieuApi";

const LUA_CHON = [{ value: "", label: "(Chưa đề xuất)" }, ...MUC_TU_DE_XUAT];

/**
 * Ô "Đề xuất mức xếp loại" của CBQL Khoa (TK/TKL/PTK/PTKL) trên phiếu năm.
 *
 * Có ô hay không là do cờ `DuocTuDeXuatXepLoai` server tính theo chức vụ TẠI
 * ĐƠN VỊ CỦA PHIẾU - người kiêm nhiệm có ô ở phiếu Khoa này mà không có ở phiếu
 * Khoa kia, nên tuyệt đối không tự suy từ chức vụ của user đăng nhập.
 *
 * Chỉ chủ phiếu ở trạng thái 1/2 mới chọn được; còn lại chỉ xem. Đợt này giá trị
 * CHỈ ĐƯỢC LƯU, chưa ảnh hưởng xếp loại nào - đừng gắn chữ "kết quả" vào đây.
 *
 *   deXuat      → docTuDeXuatXepLoai(Item)
 *   onChon(muc) → muc 1..4, hoặc null khi chọn lại "(Chưa đề xuất)"
 */
const TuDeXuatXepLoai = ({
  deXuat,
  laChuPhieu,
  trangThai,
  dangLuu = false,
  khoa = false,
  onChon,
}) => {
  if (!deXuat?.DuocTuDeXuatXepLoai) return null;

  const suaDuoc =
    laChuPhieu &&
    (Number(trangThai) === TRANG_THAI.NHAP ||
      Number(trangThai) === TRANG_THAI.THAM_DINH);
  const coDeXuat = deXuat.XepLoaiTuDeXuat != null;
  // Giá trị đang lưu hiện bằng text server trả; số chỉ là đường lui khi thiếu.
  const textDeXuat =
    deXuat.XepLoaiTuDeXuatText || `Mức ${deXuat.XepLoaiTuDeXuat}`;

  const chon = (giaTri) => {
    const muc = giaTri === "" || giaTri == null ? null : Number(giaTri);
    if (muc === (deXuat.XepLoaiTuDeXuat ?? null)) return;
    onChon?.(muc);
  };

  return (
    <section className="pl2-tu-de-xuat" aria-label="Đề xuất mức xếp loại">
      <div className="pl2-tu-de-xuat-mo-ta">
        <span className="pl2-header-score-label">
          <i className="fa-solid fa-user-tie" aria-hidden="true"></i>
          ĐỀ XUẤT MỨC XẾP LOẠI
        </span>
        <span className="pl2-tu-de-xuat-dien">(dành cho cán bộ quản lý)</span>
        <p>
          {laChuPhieu
            ? "Mức bạn tự đề xuất cho bản thân. Trưởng khoa / Hiệu trưởng xem xét khi xếp loại."
            : "Mức cán bộ quản lý tự đề xuất cho bản thân, để tham khảo khi xếp loại."}
        </p>
      </div>

      <div className="pl2-tu-de-xuat-gia-tri">
        {suaDuoc ? (
          <SearchSelect
            value={deXuat.XepLoaiTuDeXuat ?? ""}
            options={LUA_CHON}
            onChange={chon}
            disabled={dangLuu || khoa}
            ariaLabel="Đề xuất mức xếp loại"
          />
        ) : laChuPhieu ? (
          <div className="pl2-tu-de-xuat-xem">
            {coDeXuat ? textDeXuat : "Chưa đề xuất"}
          </div>
        ) : (
          <div className="pl2-tu-de-xuat-xem">
            {coDeXuat ? `Cá nhân đề xuất: ${textDeXuat}` : "Không đề xuất"}
          </div>
        )}
        <div className="pl2-tu-de-xuat-phu" aria-live="polite">
          {dangLuu
            ? "Đang lưu đề xuất"
            : coDeXuat && deXuat.NgayTuDeXuat
              ? `Cập nhật lúc ${formatNgayGio(deXuat.NgayTuDeXuat)}`
              : null}
        </div>
      </div>
    </section>
  );
};

export default TuDeXuatXepLoai;
