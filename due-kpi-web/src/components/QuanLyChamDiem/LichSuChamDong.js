import React from "react";
import "../../css/QuanLyChamDiem.css";
import {
  CAP_CHAM,
  formatDiem,
  formatNgayGio,
  HANH_DONG_CHAM,
  laLuotChamTuDong,
  laTieuChiChamTay,
  TEN_CAP_CHAM,
  TEN_HANH_DONG_CHAM,
} from "../../utils/phieuApi";

/**
 * Lịch sử chấm điểm của MỘT dòng tiêu chí, đã gom nhóm theo (LanDanhGia, Cap).
 *
 * Nhận thẳng kết quả của `gomLichSuTheoChiTiet(...)` cho dòng đó - component
 * không tự gọi API vì trang cha lấy một lần cho cả phiếu qua
 * GET api/phieu/{id}/lich-su-cham-diem rồi phát xuống.
 *
 * Dùng chung cho màn hình thẩm định (TieuChiChamCard) và màn hình tự đánh giá:
 * khi một tiêu chí bị trả về, chủ phiếu cần thấy vòng trước đã bị chấm bao nhiêu
 * và ai chấm thì mới biết phải sửa gì.
 *
 * @param {object[]} lichSu  các nhóm { LanDanhGia, Cap, Entries[] }
 * @param {object}   chiTiet dòng tương ứng - chỉ dùng để nhận diện lượt chấm máy
 */
const LichSuChamDong = ({ lichSu = [], chiTiet }) => {
  if (lichSu.length === 0) return null;

  const chamTay = laTieuChiChamTay(chiTiet);

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {lichSu.map((nhom) => {
        // Tiêu chí chấm tự động không đi qua ai: bút toán cấp "Trường" của nó
        // thực chất là engine ghi lúc nộp phiếu, gọi tên người sẽ sai.
        const nhomTuDong = !chamTay && Number(nhom.Cap) === CAP_CHAM.TRUONG;
        return (
          <div key={`${nhom.LanDanhGia}-${nhom.Cap}`}>
            <div className="cd-ls-cap">
              {nhomTuDong
                ? "Hệ thống tính"
                : TEN_CAP_CHAM[nhom.Cap] || `Cấp ${nhom.Cap}`}
            </div>
            {(nhom.Entries || []).map((e) => {
              const may = laLuotChamTuDong(e, chiTiet);
              const nguoi = e.TenNguoiThucHien || `#${e.IdNguoiThucHien}`;
              // Lượt trả về bổ sung không phải là một lần cho điểm: khoa chỉ
              // đẩy dòng về cho chủ phiếu kê khai lại, điểm kèm theo là điểm
              // cũ nên hiện ra chỉ gây hiểu nhầm.
              const traVe = Number(e.HanhDong) === HANH_DONG_CHAM.TRA_VE_DONG;
              return (
                <div key={e.IdLichSu} className="cd-ls-dong">
                  <span className="cd-ls-thoi-gian">
                    {formatNgayGio(e.NgayThucHien)}
                  </span>{" "}
                  ·{" "}
                  {!traVe && (
                    <>
                      <b className="cd-ls-diem">{formatDiem(e.Diem)}</b> ·{" "}
                    </>
                  )}
                  {may
                    ? `Hệ thống chấm tự động khi ${nguoi} nộp phiếu`
                    : `${TEN_HANH_DONG_CHAM[e.HanhDong] || "Cập nhật"} bởi ${nguoi}`}
                  {e.NhanXet
                    ? traVe
                      ? ` - Lý do: ${e.NhanXet}`
                      : ` - ${e.NhanXet}`
                    : ""}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default LichSuChamDong;
