import React from "react";

/**
 * Cảnh báo gọn cho danh sách tiêu chí chưa chốt.
 *
 * Danh sách có thể rất dài nên mặc định chỉ hiện số lượng và điều kiện chốt hồ
 * sơ. Người dùng vẫn có thể mở toàn bộ tên tiêu chí khi cần đối chiếu.
 */
const CanhBaoTieuChiChuaChot = ({ tieuChi = [], ghiChu }) => {
  if (!tieuChi.length) return null;

  const tenTieuChi = tieuChi.map(
    (item, index) =>
      item?.TenTieuChi ||
      item?.tenTieuChi ||
      (item?.IdTieuChi != null || item?.idTieuChi != null
        ? `Tiêu chí #${item.IdTieuChi ?? item.idTieuChi}`
        : `Tiêu chí ${index + 1}`),
  );

  return (
    <div className="cd-canh-bao cd-canh-bao-thu-gon">
      <i
        className="fa-solid fa-triangle-exclamation"
        aria-hidden="true"
      ></i>
      <details className="cd-canh-bao-chi-tiet">
        <summary>
          <span className="cd-canh-bao-tom-tat">
            Còn <b>{tieuChi.length}</b> tiêu chí chưa thẩm định xong. Hồ sơ chỉ
            chốt được khi 100% tiêu chí đã chốt điểm.
          </span>
          <span className="cd-canh-bao-toggle" aria-hidden="true">
            <span className="cd-canh-bao-toggle-mo">Xem danh sách</span>
            <span className="cd-canh-bao-toggle-dong">Thu gọn</span>
            <i className="fa-solid fa-chevron-down"></i>
          </span>
        </summary>
        <div className="cd-canh-bao-danh-sach">
          {ghiChu && <p>{ghiChu}</p>}
          <ol>
            {tenTieuChi.map((ten, index) => (
              <li key={`${index}-${ten}`}>{ten}</li>
            ))}
          </ol>
        </div>
      </details>
    </div>
  );
};

export default CanhBaoTieuChiChuaChot;
