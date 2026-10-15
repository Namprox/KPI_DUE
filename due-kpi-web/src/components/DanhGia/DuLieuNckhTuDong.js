import React from "react";
import { formatDiem, formatNgay, formatNgayGio } from "../../utils/phieuApi";
import "../../css/DanhGia/PhieuTuDong.css";

/**
 * Dữ liệu NCKH thay cho MinhChung của NCKH_GIO_TY_LE (DuLieuGioNckh) và
 * NCKH_BBQT_DIEM_KPI (DuLieuBaiBaoQuocTe.BaiBao[]). Bài báo ở đây khác minh chứng
 * LoaiNguon = 1 của hai mã NCKH_BAI_*.
 */
export default function DuLieuNckhTuDong({ info }) {
  const gio = info?.DuLieuGioNckh;
  const bbqt = info?.DuLieuBaiBaoQuocTe;
  if (!gio && !bbqt) return null;
  const baiBao = Array.isArray(bbqt?.BaiBao) ? bbqt.BaiBao : [];
  return <div className="phieu-auto-nckh">
    {gio && <p>
      Giờ NCKH quy đổi {formatDiem(gio.GioNckhQuyDoi)} / định mức {formatDiem(gio.GioNckhDinhMuc)}
      {gio.TyLeHoanThanh != null && ` · hoàn thành ${formatDiem(gio.TyLeHoanThanh)}%`}
      {gio.DatDinhMuc === true ? " · Đạt định mức" : gio.DatDinhMuc === false ? " · Chưa đạt định mức" : ""}
      {gio.ThoiGianDongBo && ` · đồng bộ ${formatNgayGio(gio.ThoiGianDongBo)}`}
    </p>}
    {bbqt && <>
      <p>
        Bài báo quốc tế từ NCKH: {bbqt.SoBaiBao ?? baiBao.length} bài
        {bbqt.TongBaiWosScopus != null && ` · WoS/Scopus ${bbqt.TongBaiWosScopus}`}
        {bbqt.CoQ1Q2 === true && " · có bài Q1/Q2"}
        {bbqt.DiemKpiCuoi != null && ` · điểm KPI ${formatDiem(bbqt.DiemKpiCuoi)}`}
      </p>
      {baiBao.length > 0 && <ul>{baiBao.map((bb, index) => <li key={bb.ArticleId ?? index}>
        {bb.Title || "(Không có tiêu đề)"}
        <small>{[
          bb.JournalName,
          bb.QRanking,
          bb.JournalCategory,
          bb.PublicationDate ? formatNgay(bb.PublicationDate) : null,
          bb.IsPrimaryAuthor === true ? "Tác giả chính" : null,
          bb.YourScore != null ? `${formatDiem(bb.YourScore)} điểm` : null,
        ].filter(Boolean).join(" · ")}</small>
      </li>)}</ul>}
    </>}
  </div>;
}
