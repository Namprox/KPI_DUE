import React from "react";
import PhieuTuDanhGia from "./PhieuTuDanhGia";

/**
 * Phiếu tự đánh giá KPI ngạch VIÊN CHỨC / NGƯỜI LAO ĐỘNG.
 *
 * Toàn bộ logic nằm ở PhieuTuDanhGia - hai ngạch đi chung một quy trình, chỉ
 * khác mẫu đánh giá được chọn theo loaiDoiTuong.
 */
const DanhGiaNhanVien = () => (
  <PhieuTuDanhGia
    loaiDoiTuong={2}
    duongDan="/danh-gia-kpi-nhan-vien"
    tieuDe="ĐÁNH GIÁ KPI VIÊN CHỨC / NGƯỜI LAO ĐỘNG"
  />
);

export default DanhGiaNhanVien;