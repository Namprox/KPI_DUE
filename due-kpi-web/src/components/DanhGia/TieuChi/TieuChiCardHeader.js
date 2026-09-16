import React from "react";
import "../../../css/DanhGia/TieuChiDanhGia.css";

/**
 * Phần đầu của MỘT thẻ tiêu chí chấm điểm, dùng chung cho cả 4 phiếu KPI
 * (giảng viên, nhân viên, khoa/đơn vị, phòng/trung tâm).
 *
 * Bố cục: chip số thứ tự | tiêu đề + mô tả + hàng pill phụ | pill điểm.
 *
 * Trước đây ba component form dựng tay khối này, mỗi nơi lệch nhau một ít; gom
 * về đây để sửa một lần là cả bốn phiếu cùng đổi.
 *
 * @param {string}   soThuTu       số hiệu tiêu chí hiển thị ở chip trái ("1.2")
 * @param {string}   tieuDe        tên tiêu chí
 * @param {string}   [moTa]        mô tả / diễn giải của tiêu chí
 * @param {string}   [tenNhom]     tên nhóm - CHỈ truyền khi nhóm không có tiêu
 *                                 đề riêng phía trên, tránh nhắc lại thừa
 * @param {boolean}  [batBuocMinhChung] cờ BatBuocMinhChung của tiêu chí
 * @param {number}   [soMinhChung] số tệp minh chứng đang đính kèm
 * @param {boolean}  [hienBadgeMinhChung] tắt hẳn huy hiệu minh chứng (dòng tự
 *                                 tính, màn chỉ xem... không cần nhắc)
 * @param {number}   [diem]        điểm đã chấm, null/undefined nghĩa là chưa chấm
 * @param {string}   [diemText]    chuỗi điểm đã định dạng sẵn, ưu tiên hơn `diem`
 * @param {boolean}  [diemLaKhong] tô xám pill điểm (dòng tự tính bị 0 điểm)
 * @param {string}   diemToiDaText chuỗi điểm tối đa đã định dạng
 * @param {React.ReactNode} [metaPhu] pill phụ thêm vào hàng meta
 * @param {React.ReactNode} [phuTro]  nội dung thêm vào cụm pill bên phải
 */
const TieuChiCardHeader = ({
  soThuTu,
  tieuDe,
  moTa,
  tenNhom,
  batBuocMinhChung = false,
  soMinhChung = 0,
  hienBadgeMinhChung = true,
  diem,
  diemText,
  diemLaKhong = false,
  diemToiDaText,
  metaPhu,
  phuTro,
}) => {
  const coMinhChung = soMinhChung > 0;
  const coDiem = diemText != null || diem != null;

  // Bắt buộc mà chưa có tệp thì nhắc bằng màu vàng; đã có thì báo số lượng.
  let badgeMinhChung = null;
  if (hienBadgeMinhChung && batBuocMinhChung) {
    badgeMinhChung = (
      <span
        className={`pl2-mc-badge ${coMinhChung ? "du-mc" : "can-mc"}`}
        title={
          coMinhChung
            ? `Đã đính kèm ${soMinhChung} minh chứng`
            : "Tiêu chí có yêu cầu minh chứng nhưng chưa đính kèm tệp"
        }
      >
        <i
          className={`fa-solid ${
            coMinhChung ? "fa-paperclip" : "fa-triangle-exclamation"
          }`}
        ></i>
        {coMinhChung ? `${soMinhChung} minh chứng` : "Bắt buộc có minh chứng"}
      </span>
    );
  } else if (hienBadgeMinhChung && coMinhChung) {
    badgeMinhChung = (
      <span className="pl2-mc-badge da-co" title="Đã có minh chứng đính kèm">
        <i className="fa-solid fa-paperclip"></i> {soMinhChung} minh chứng
      </span>
    );
  }

  const pillNhom = tenNhom ? (
    <span className="pl2-criteria-meta-pill" title={tenNhom}>
      Nhóm: {tenNhom}
    </span>
  ) : null;

  const coMeta = pillNhom || badgeMinhChung || metaPhu;

  return (
    <div className="pl2-criteria-header">
      {soThuTu ? <span className="pl2-criteria-idx">{soThuTu}</span> : null}

      <div className="pl2-criteria-header-main">
        <span className="pl2-criteria-title">{tieuDe}</span>
        {moTa ? <div className="pl2-criteria-desc">{moTa}</div> : null}
        {coMeta ? (
          <div className="pl2-criteria-meta">
            {pillNhom}
            {badgeMinhChung}
            {metaPhu}
          </div>
        ) : null}
      </div>

      <div className="pl2-criteria-header-side">
        {coDiem && (
          <span
            className={`pl2-criteria-score ${
              diemLaKhong ? "pl2-criteria-score-zero" : ""
            }`}
          >
            <i
              className={`fa-solid ${
                diemLaKhong ? "fa-circle-minus" : "fa-circle-check"
              }`}
            ></i>{" "}
            {diemText != null ? diemText : `${diem}đ`}
          </span>
        )}
        <span className="pl2-criteria-max">Tối đa: {diemToiDaText}</span>
        {phuTro}
      </div>
    </div>
  );
};

export default TieuChiCardHeader;
