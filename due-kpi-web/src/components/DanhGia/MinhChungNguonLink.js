import React, { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import "../../css/HoatDongDaoTao.css";

const sources = {
  9: { path: "hoat-dong-dao-tao", Detail: lazy(() => import("../HoatDongDaoTao/HoatDongDaoTaoDetail")) },
  10: { path: "thanh-tich-doan-the", Detail: lazy(() => import("../ThanhTichDoanThe/ThanhTichDoanTheDetail")) },
  11: { path: "phat-trien-doi-ngu", Detail: lazy(() => import("../PhatTrienDoiNgu/PhatTrienDoiNguDetail")) },
  12: { path: "sang-kien", Detail: lazy(() => import("../SangKien/SangKienDetail")) },
};

export default function MinhChungNguonLink({ mc, className }) {
  const [open, setOpen] = useState(false);
  const source = sources[Number(mc.LoaiNguon)];
  const title = mc.TieuDe || mc.TenLoaiNguon || "Minh chứng nguồn";
  if (!source || mc.MaNguon == null) return <span className={className}>{title}</span>;
  const Detail = source.Detail;
  return <>
    <Link className={className} to={`/${source.path}/${encodeURIComponent(mc.MaNguon)}`}
      onClick={(event) => { event.preventDefault(); setOpen(true); }}>{title}</Link>
    {open && <Suspense fallback={<span role="status">Đang tải chi tiết...</span>}>
      <Detail id={mc.MaNguon} onClose={() => setOpen(false)} />
    </Suspense>}
  </>;
}
