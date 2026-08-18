import React from "react";
import PhieuTuDanhGia from "./PhieuTuDanhGia";

/**
 * Phiếu tự đánh giá KPI ngạch VIÊN CHỨC / NGƯỜI LAO ĐỘNG.
 *
 * Trước đây trang này chạy trên bộ API đời đầu (`POST scoring`, `POST upload`)
 * vốn không còn tồn tại trong docs/openapi.yaml. Nay dùng chung PhieuTuDanhGia
 * với đúng luồng 4 giai đoạn như ngạch giảng viên; khác biệt duy nhất về nghiệp
 * vụ là viên chức / NLĐ bị kẹp trần xếp loại ở mức 2 và không tranh hạn ngạch
 * xuất sắc — cả hai điều đó do server và màn hình chốt hồ sơ của Trưởng khoa xử
 * lý, không phải ở đây.
 */
const DanhGiaNhanVien = () => (
  <PhieuTuDanhGia
    loaiDoiTuong={2}
    duongDan="/danh-gia-kpi-nhan-vien"
    tieuDe="ĐÁNH GIÁ KPI VIÊN CHỨC / NGƯỜI LAO ĐỘNG"
  />
);

export default DanhGiaNhanVien;
