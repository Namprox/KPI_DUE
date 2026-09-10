import React from "react";
import { tenQuy } from "../../utils/keKhaiThanhTichApi";

/**
 * Liệt kê `DongCoVanDe[]` mà server trả kèm khi từ chối cả request.
 *
 * Hai tình huống dùng chung component nhưng KHÔNG dùng chung cách render, vì hợp
 * đồng phát ra hai tập trường khác nhau:
 *
 *   mode="thieu-minh-chung"  (422 lúc NỘP)
 *     có: IdChiTiet, TenThanhTich, TenMuc, LoaiThanhTich, Quy
 *     thiếu: TenDonVi
 *
 *   mode="forbidden-dong"    (403 lúc DUYỆT)
 *     có: IdChiTiet, TenThanhTich, TenDonVi
 *     thiếu: TenMuc, Quy
 *
 * Điểm chung quan trọng nhất phải nói với người dùng: server KHÔNG ghi gì cả -
 * cả hai lỗi đều huỷ trọn vẹn lần gọi. Thiếu câu đó thì người dùng không dám thử
 * lại vì sợ ghi trùng.
 *
 * @param {"thieu-minh-chung"|"forbidden-dong"} mode
 * @param {object[]} dong
 * @param {(idChiTiet:number)=>void} [onChonDong] bấm vào một dòng để cuộn tới nó
 * @param {()=>void} [onDong] đóng banner
 */
const DongCoVanDeBanner = ({ mode, dong = [], onChonDong, onDong }) => {
  if (!Array.isArray(dong) || dong.length === 0) return null;

  const laThieuMc = mode === "thieu-minh-chung";

  return (
    <div className="kkt-vande">
      <div className="kkt-vande-title">
        <i
          className={`fa-solid ${laThieuMc ? "fa-file-circle-exclamation" : "fa-user-lock"}`}
        ></i>
        {laThieuMc
          ? `${dong.length} dòng bắt buộc minh chứng nhưng chưa có tệp PDF`
          : `${dong.length} dòng thuộc quyền duyệt của đơn vị khác`}
        {onDong && (
          <button
            type="button"
            className="kkt-nhom-toggle"
            style={{ marginLeft: "auto" }}
            onClick={onDong}
            title="Đóng thông báo"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      <div>
        {laThieuMc
          ? "Bản kê chưa được nộp — hãy đính kèm PDF cho các dòng dưới đây rồi bấm Nộp lại."
          : "Toàn bộ lần lưu đã bị huỷ, chưa có dòng nào được ghi. Hãy bỏ chọn các dòng dưới đây rồi lưu lại phần thuộc đơn vị bạn."}
      </div>

      <div className="kkt-vande-list">
        {dong.map((d) => (
          <button
            key={d.IdChiTiet}
            type="button"
            className="kkt-vande-item"
            onClick={onChonDong ? () => onChonDong(d.IdChiTiet) : undefined}
            disabled={!onChonDong}
            title={onChonDong ? "Cuộn tới dòng này" : undefined}
          >
            <i
              className="fa-solid fa-arrow-right-long"
              style={{ marginTop: "3px" }}
            ></i>
            <span>
              <b>{d.TenThanhTich || `Dòng #${d.IdChiTiet}`}</b>
              <span className="kkt-vande-meta">
                {laThieuMc ? (
                  <>
                    {d.Quy != null && <> · {tenQuy(d.Quy)}</>}
                    {d.TenMuc && <> · {d.TenMuc}</>}
                  </>
                ) : (
                  d.TenDonVi && <> · do {d.TenDonVi} duyệt</>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>

      {!laThieuMc && (
        <div className="kkt-vande-note">
          <i className="fa-solid fa-circle-info"></i> Mỗi mức thành tích có một
          đơn vị phụ trách riêng, nên một bản kê có thể do nhiều đơn vị cùng
          duyệt. Bạn chỉ xét được phần của đơn vị mình.
        </div>
      )}
    </div>
  );
};

export default DongCoVanDeBanner;
