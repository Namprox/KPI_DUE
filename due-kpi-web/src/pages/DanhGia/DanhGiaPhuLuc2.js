import React from "react";
import PhieuTuDanhGia from "./PhieuTuDanhGia";

/**
 * Phiếu tự đánh giá KPI ngạch GIẢNG VIÊN (Phụ lục 2).
 *
 * Toàn bộ logic nằm ở PhieuTuDanhGia — hai ngạch đi chung một quy trình, chỉ
 * khác mẫu đánh giá được chọn theo loaiDoiTuong.
 */
const DanhGiaPhuLuc2 = () => (
  <PhieuTuDanhGia
    loaiDoiTuong={1}
    duongDan="/danh-gia-phu-luc-2"
    tieuDe="ĐÁNH GIÁ KPI GIẢNG VIÊN (PHỤ LỤC 2)"
  />
);

export default DanhGiaPhuLuc2;
