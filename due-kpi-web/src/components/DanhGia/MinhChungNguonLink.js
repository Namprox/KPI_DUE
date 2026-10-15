import React, { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import "../../css/HoatDongDaoTao.css";

// Chỉ các nguồn có endpoint chi tiết theo MaNguon; loại khác (bài báo NCKH, vi
// phạm, lưu trữ 14...) chỉ hiện văn bản.
const sources = {
  6: { path: "nhiem-vu-phuc-vu", Detail: lazy(() => import("../NhiemVuPhucVu/NhiemVuPhucVuDetail")) },
  9: { path: "hoat-dong-dao-tao", Detail: lazy(() => import("../HoatDongDaoTao/HoatDongDaoTaoDetail")) },
  10: { path: "thanh-tich-doan-the", Detail: lazy(() => import("../ThanhTichDoanThe/ThanhTichDoanTheDetail")) },
  11: { path: "phat-trien-doi-ngu", Detail: lazy(() => import("../PhatTrienDoiNgu/PhatTrienDoiNguDetail")) },
  12: { path: "sang-kien", Detail: lazy(() => import("../SangKien/SangKienDetail")) },
  13: { path: "khen-thuong-dot-xuat", Detail: lazy(() => import("../KhenThuongDotXuat/KhenThuongDotXuatDetail")) },
};

export default function MinhChungNguonLink({ mc, className }) {
  const [open, setOpen] = useState(false);
  // Xem được phiếu chưa chắc xem được bản ghi nguồn: 403/404 thì lùi về văn bản.
  const [khongXemDuoc, setKhongXemDuoc] = useState(false);
  const source = sources[Number(mc.LoaiNguon)];
  const title = mc.TieuDe || mc.TenLoaiNguon || "Minh chứng nguồn";
  if (!source || mc.MaNguon == null || khongXemDuoc) {
    return <span className={className} title={khongXemDuoc ? "Bạn không có quyền xem chi tiết bản ghi nguồn" : undefined}>{title}</span>;
  }
  const Detail = source.Detail;
  return <>
    <Link className={className} to={`/${source.path}/${encodeURIComponent(mc.MaNguon)}`}
      onClick={(event) => { event.preventDefault(); setOpen(true); }}>{title}</Link>
    {open && <Suspense fallback={<span role="status">Đang tải chi tiết...</span>}>
      <Detail id={mc.MaNguon} onClose={() => setOpen(false)}
        onUnavailable={() => { setOpen(false); setKhongXemDuoc(true); }} />
    </Suspense>}
  </>;
}
