import React from "react";
import "../../css/LichSuTimeline.css";

const haiChuSo = (n) => String(n).padStart(2, "0");

/** Date hoặc chuỗi ngày → { ngay: "dd/mm/yyyy", gio: "HH:mm", moc } theo giờ trình duyệt. */
export const tachNgayGio = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return { ngay: "—", gio: "" };
  return {
    ngay: `${haiChuSo(date.getDate())}/${haiChuSo(date.getMonth() + 1)}/${date.getFullYear()}`,
    gio: `${haiChuSo(date.getHours())}:${haiChuSo(date.getMinutes())}`,
    moc: date.getTime(),
  };
};

/**
 * Lịch sử dạng thanh dọc: cột trái là ngày/giờ, phải là nội dung từng mốc.
 * Mỗi item: { key, ngay, gio, moc, tieuDe, moTa, phu, nguoi } - chuỗi đã định dạng sẵn,
 * vì mỗi module đọc ngày theo cách riêng (giờ Việt Nam dạng chuỗi hay Date).
 * Khi mọi item có `moc` (ms), danh sách tự xếp mới nhất lên đầu - API không cam kết
 * thứ tự - và chấm đầu tiên được tô đậm làm mốc mới nhất.
 */
export default function LichSuTimeline({ items = [], rong = "Chưa có lịch sử.", compact = false }) {
  if (!items.length) return rong ? <p className="ls-timeline-rong">{rong}</p> : null;
  const coMoc = items.every((it) => Number.isFinite(it.moc));
  const ds = coMoc ? [...items].sort((a, b) => b.moc - a.moc) : items;
  return <ol className={`ls-timeline${compact ? " ls-timeline-compact" : ""}${coMoc ? " ls-timeline-moi-nhat" : ""}`}>
    {ds.map((it) => <li key={it.key}>
      <time className="ls-timeline-time"><b>{it.ngay}</b>{it.gio && <span>{it.gio}</span>}</time>
      <div className="ls-timeline-body">
        <b>{it.tieuDe}</b>
        {it.moTa && <p>{it.moTa}</p>}
        {it.phu && <div className="ls-timeline-phu">{it.phu}</div>}
        {it.nguoi && <small>{it.nguoi}</small>}
      </div>
    </li>)}
  </ol>;
}
