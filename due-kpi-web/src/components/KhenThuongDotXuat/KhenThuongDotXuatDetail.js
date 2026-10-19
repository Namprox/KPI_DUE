import React, { useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { layChiTietKhenThuong } from "../../utils/khenThuongDotXuatApi";
import { formatDiem } from "../../utils/keKhaiThanhTichApi";
import "../../css/Pages.css";
import "../../css/KhenThuongDotXuat.css";
import LichSuTimeline, { tachNgayGio } from "../Common/LichSuTimeline";

export const ngayKhenThuong = (value, time = false) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : time ? date.toLocaleString("vi-VN") : date.toLocaleDateString("vi-VN");
};
export const nguonKhenThuong = (item) => Number(item.Nguon) === 3 ? "Bản sao dòng kê khai đã chốt" : Number(item.Nguon) === 1 ? "P_TCHC ghi nhận" : "—";
export const HUONG_DAN_DIEM = "Lưu nguồn không tự cập nhật điểm đã chấm trên phiếu. Phiếu năm dùng Tổng hợp tự động; phiếu quý dùng luồng nộp/chấm lại hiện có.";
export const DONG_BI_KHU = "Không cộng điểm: cùng nội dung trong năm đã có dòng điểm cao hơn hoặc bằng điểm với ID nhỏ hơn.";
export default function KhenThuongDotXuatDetail({ id, onClose, onUnavailable }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const unavailable = useRef(onUnavailable);
  unavailable.current = onUnavailable;
  useEffect(() => {
    let cancelled = false;
    setData(null); setError("");
    layChiTietKhenThuong(id).then((r) => { if (!cancelled) setData(r); })
      .catch((e) => {
        if (cancelled) return;
        if (unavailable.current && [403, 404].includes(e.status)) unavailable.current(e);
        else setError(e.message);
      });
    return () => { cancelled = true; };
  }, [id, retry]);
  const item = data?.Item;
  return <Dialog draggable={false} visible header="Chi tiết khen thưởng đột xuất" onHide={onClose} modal className="ktdx-dialog" maskClassName="ktdx-dialog-mask"
    style={{ width: "780px" }} breakpoints={{ "820px": "95vw" }}>
    <div className="ktdx">
      {error ? <div role="alert" className="ktdx-error">{error} <button onClick={() => setRetry((v) => v + 1)}>Thử lại</button></div> : !data ? <p>Đang tải chi tiết...</p> : <>
        {item ? <>
          {item.DaXoa === true && <p className="ktdx-warning">Bản ghi đã xóa.</p>}
          {item.LaDongBiKhu === true && <p className="ktdx-warning">{DONG_BI_KHU}</p>}
          <dl className="ktdx-details">
            <dt>Viên chức</dt><dd>{item.HoTen} · {item.MaNhanVien}</dd><dt>Đơn vị</dt><dd>{item.TenDonVi || "—"}</dd>
            <dt>Năm / Quý</dt><dd>{item.IdNam} / Quý {item.Quy}</dd><dt>Mức khen thưởng</dt><dd>{item.TenMuc}</dd>
            <dt>Điểm ghi nhận</dt><dd>{formatDiem(item.Diem)}</dd><dt>Nội dung</dt><dd>{item.NoiDung}</dd>
            <dt>Quyết định</dt><dd>{item.SoQuyetDinh || "—"} · {ngayKhenThuong(item.NgayQuyetDinh)}</dd>
            <dt>Cơ quan khen</dt><dd>{item.CoQuanKhen || "—"}</dd><dt>Ghi chú</dt><dd>{item.GhiChu || "—"}</dd>
            <dt>Nguồn</dt><dd>{nguonKhenThuong(item)}{item.IdChiTietKeKhai != null && <small>Dòng kê khai gốc #{item.IdChiTietKeKhai} (đối chiếu lịch sử)</small>}</dd>
            <dt>Người tạo</dt><dd>{item.TenNguoiTao || "—"} · {ngayKhenThuong(item.NgayTao, true)}</dd>
          </dl>
        </> : <p>Không có thông tin bản ghi.</p>}
        <p className="ktdx-muted">{HUONG_DAN_DIEM}</p>
        <h4>Lịch sử thay đổi</h4>
        <LichSuTimeline items={(data.LichSu || []).map((l) => ({ key: l.Id, ...tachNgayGio(l.NgayThucHien), tieuDe: { 1: "Ghi nhận", 2: "Sửa", 3: "Xóa" }[l.HanhDong] || "Thay đổi", moTa: l.MoTa, nguoi: l.TenNguoiThucHien }))} />
      </>}
      <div className="ktdx-actions ktdx-footer"><button onClick={onClose}>Đóng</button></div>
    </div>
  </Dialog>;
}
