import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { layChiTietDoiNgu } from "../../utils/phatTrienDoiNguApi";
import "../../css/Pages.css";
import "../../css/PhatTrienDoiNgu.css";

export const ngayDoiNgu = (value, time = false) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : time ? date.toLocaleString("vi-VN") : date.toLocaleDateString("vi-VN");
};
const actions = { 1: "Ghi nhận", 2: "Sửa", 3: "Xoá", 4: "Import Excel" };
export default function PhatTrienDoiNguDetail({ id, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setData(null); setError("");
    layChiTietDoiNgu(id).then((r) => { if (!cancelled) setData(r); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id, retry]);
  const item = data?.Item;
  return <Dialog visible header="Chi tiết phát triển đội ngũ" onHide={onClose} modal className="ptdn-dialog" maskClassName="ptdn-dialog-mask"
    style={{ width: "780px" }} breakpoints={{ "820px": "95vw" }}>
    <div className="ptdn">
      {error ? <div role="alert" className="ptdn-error">{error} <button onClick={() => setRetry((v) => v + 1)}>Thử lại</button></div> : !data ? <p>Đang tải chi tiết...</p> : <>
        {item && <dl className="ptdn-details">
          <dt>Giảng viên</dt><dd>{item.HoTen} · {item.MaNhanVien}</dd><dt>Khoa</dt><dd>{item.TenKhoa || "—"}</dd>
          <dt>Năm đánh giá</dt><dd>{item.IdNam}</dd><dt>Loại ghi nhận</dt><dd>{item.TenLoai}</dd>
          <dt>Hạng mục</dt><dd>{item.TenHangMuc}{item.MaHangMuc && <small>{item.MaHangMuc}</small>}</dd>
          <dt>Chi tiết</dt><dd>{item.NoiDung || "—"}</dd><dt>Quyết định</dt><dd>{item.SoQuyetDinh || "—"} · {ngayDoiNgu(item.NgayQuyetDinh)}</dd>
          <dt>Ghi chú</dt><dd>{item.GhiChu || "—"}</dd><dt>Nguồn</dt><dd>{item.Nguon === 2 ? "Import Excel" : item.Nguon === 1 ? "Nhập form" : "—"}</dd>
          <dt>Người tạo</dt><dd>{item.TenNguoiTao || "—"} · {ngayDoiNgu(item.NgayTao, true)}</dd>
        </dl>}
        <h4>Lịch sử thay đổi</h4>
        {(data.LichSu || []).length === 0 ? <p className="ptdn-muted">Chưa có lịch sử.</p> : <ol className="ptdn-history">{data.LichSu.map((l) => <li key={l.Id}>
          <strong>{actions[l.HanhDong] || `Hành động ${l.HanhDong}`}</strong><small>{l.TenNguoiThucHien || "—"} · {ngayDoiNgu(l.NgayThucHien, true)}</small><p>{l.MoTa}</p>
        </li>)}</ol>}
      </>}
      <div className="ptdn-actions ptdn-footer"><button onClick={onClose}>Đóng</button></div>
    </div>
  </Dialog>;
}
