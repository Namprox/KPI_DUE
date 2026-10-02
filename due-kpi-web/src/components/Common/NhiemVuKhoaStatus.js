import React from "react";
import { TEN_TRANG_THAI_NHIEM_VU } from "../../utils/nhiemVuKhoaApi";
import "../../css/NhiemVuKhoa.css";

export default function NhiemVuKhoaStatus({ nhiemVu }) {
  const trangThai = Number(nhiemVu?.TrangThai);
  return (
    <div className="nvk-status">
      <span className={`cd-status-badge nvk-status-${trangThai}`}>
        {TEN_TRANG_THAI_NHIEM_VU[trangThai] || "Chưa xác định"}
      </span>
      {trangThai === 3 && nhiemVu.LyDoTraVe && (
        <div className="nvk-ly-do">
          <b>Lý do trả về:</b> {nhiemVu.LyDoTraVe}
        </div>
      )}
    </div>
  );
}
