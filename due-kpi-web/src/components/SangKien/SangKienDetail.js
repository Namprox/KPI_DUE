import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { layChiTietSangKien, layDanhMucSangKien } from "../../utils/sangKienApi";
import { ngaySangKien, ketQuaXetSangKien, ketQuaCaiTienSangKien, DiemVienChucSangKien, TacGiaSangKien, TrangThaiSangKien } from "./SangKienInfo";
import "../../css/Pages.css";
import "../../css/SangKien.css";

const actions = { 1: "Tạo sáng kiến", 2: "Sửa", 3: "Xoá", 4: "Xét đổi mới giảng dạy", 8: "Xét cải tiến công việc" };
export default function SangKienDetail({ id, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [catalog, setCatalog] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setData(null); setError("");
    layChiTietSangKien(id).then((r) => { if (!cancelled) setData(r); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [id, retry]);
  useEffect(() => {
    let cancelled = false;
    layDanhMucSangKien().then((result) => { if (!cancelled) setCatalog(result); })
      .catch(() => { if (!cancelled) setCatalog(null); });
    return () => { cancelled = true; };
  }, [retry]);
  const item = data?.Item;
  return <Dialog visible header="Chi tiết sáng kiến" onHide={onClose} modal className="sk-dialog" maskClassName="sk-dialog-mask"
    style={{ width: "820px" }} breakpoints={{ "860px": "95vw" }}>
    <div className="sk">
      {error ? <div role="alert" className="sk-error">{error} <button onClick={() => setRetry((v) => v + 1)}>Thử lại</button></div> : !data ? <p role="status">Đang tải chi tiết...</p> : !item ? <p>Không có thông tin sáng kiến.</p> : <>
        <TrangThaiSangKien item={item} />
        <dl className="sk-details">
          <dt>Tên sáng kiến</dt><dd>{item.TenSangKien}</dd>
          <dt>Tác giả</dt><dd><TacGiaSangKien items={item.TacGia} /></dd>
          <dt>Cấp công nhận</dt><dd>{item.TenCap || item.CapTextNguon || "Chưa xác định cấp"}<DiemVienChucSangKien item={item} diemCaiTien={catalog?.DiemCaiTienCongViec} /></dd>
          <dt>Loại giải pháp</dt><dd>{item.TenLoaiGiaiPhap || item.LoaiGiaiPhapTextNguon || "—"}</dd>
          <dt>Đơn vị chủ trì</dt><dd>{item.DonViChuTri || "—"}</dd>
          <dt>Ngày công nhận</dt><dd>{ngaySangKien(item.NgayCongNhan)}</dd>
          <dt>Năm đánh giá</dt><dd>{item.IdNamDanhGia ?? "Không thuộc năm đánh giá"}</dd>
          <dt>Số chứng nhận</dt><dd>{item.SoChungNhan || "—"}</dd>
          <dt>Ghi chú</dt><dd>{item.GhiChu || "—"}</dd>
          {item.Nguon === 1 && <><dt>Đổi mới giảng dạy</dt><dd>{ketQuaXetSangKien(item)}<small>{item.GhiChuXet}</small></dd>
            <dt>Người xét giảng dạy</dt><dd>{item.TenNguoiXet || "—"} · {ngaySangKien(item.NgayXet, true)}</dd>
            <dt>Cải tiến công việc</dt><dd>{ketQuaCaiTienSangKien(item)}<small>{item.GhiChuXetCaiTien}</small></dd>
            <dt>Người xét cải tiến</dt><dd>{item.TenNguoiXetCaiTien || "—"} · {ngaySangKien(item.NgayXetCaiTien, true)}</dd>
            <dt>Lần đồng bộ</dt><dd>{ngaySangKien(item.ThoiGianDongBo, true)}</dd></>}
          <dt>Người tạo</dt><dd>{item.TenNguoiTao || "—"} · {ngaySangKien(item.NgayTao, true)}</dd>
          <dt>Cập nhật gần nhất</dt><dd>{item.TenNguoiCapNhat || "—"} · {ngaySangKien(item.NgayCapNhat, true)}</dd>
        </dl>
        <h4>Lịch sử thay đổi</h4>
        {(data.LichSu || []).length === 0 ? <p className="sk-muted">Chưa có lịch sử.</p> : <ol className="sk-history">{data.LichSu.map((entry) => <li key={entry.Id}>
          <strong>{actions[entry.HanhDong] || `Hành động ${entry.HanhDong}`}</strong><small>{entry.TenNguoiThucHien || "—"} · {ngaySangKien(entry.NgayThucHien, true)}</small><p>{entry.MoTa}</p>
        </li>)}</ol>}
      </>}
      <div className="sk-actions sk-footer"><button onClick={onClose}>Đóng</button></div>
    </div>
  </Dialog>;
}
