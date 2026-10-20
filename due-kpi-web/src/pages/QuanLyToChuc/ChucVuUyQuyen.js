import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import { useQuyenChucVu } from "../../context/NhanVienChucVuContext";
import { layNguoiNhapChucVu, layUngVienChucVu, capQuyenChucVu, thuHoiQuyenChucVu } from "../../utils/nhanVienChucVuApi";
import "../../css/Pages.css";
// Cùng một màn ủy quyền nhập liệu như "Phát triển đội ngũ" (cùng shape DTO, chỉ
// khác URL), nên dùng lại luôn bộ class `ptdn` thay vì nhân bản CSS.
import "../../css/PhatTrienDoiNgu.css";

const ngayGio = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
};

export default function ChucVuUyQuyen() {
  const { quyen } = useQuyenChucVu();
  const [history, setHistory] = useState(false);
  const [rows, setRows] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setRows([]); setCandidates([]); setError("");
    if (quyen?.LaQuanLy !== true) return;
    setLoading(true);
    Promise.all([layNguoiNhapChucVu(history), layUngVienChucVu()])
      .then(([list, people]) => { if (!cancelled) { setRows(list.Items || []); setCandidates(people.Items || []); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [history, revision, quyen]);
  const open = (person, revoke) => { setAction({ person, revoke }); setNote(""); setActionError(""); };
  const submit = async () => {
    if (busy || quyen?.LaQuanLy !== true) return;
    setBusy(true); setActionError("");
    try {
      const result = action.revoke ? await thuHoiQuyenChucVu(action.person.IdNhanVien) : await capQuyenChucVu({ IdNhanVien: action.person.IdNhanVien, GhiChu: note.trim() || null });
      setMessage(result.Message || (action.revoke ? "Đã thu hồi quyền." : "Đã cấp quyền.")); setAction(null); setRevision((v) => v + 1);
    } catch (e) { setActionError(e.message); }
    finally { setBusy(false); }
  };
  if (quyen?.LaQuanLy !== true) return <div className="page-container">Bạn không có quyền ủy quyền kê khai chức vụ.</div>;
  return <div className="page-container ptdn">
    <div className="page-header ptdn-heading"><div className="header-title"><h2>Ủy quyền kê khai chức vụ</h2><span className="breadcrumb">Cấp quyền gán chức vụ nhân viên và sửa hệ số giảm trừ cho nhân sự Phòng Tổ chức – Hành chính</span></div><Link className="ptdn-button" to="/quan-ly-nguoi-dung">Về danh sách người dùng</Link></div>
    {message && <p role="status" className="ptdn-notice">{message}</p>}
    {error && <div role="alert" className="ptdn-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại</button></div>}
    <div className="ptdn-heading"><h3>Danh sách ủy quyền</h3><label className="ptdn-check"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />Bao gồm đã thu hồi</label></div>
    <div className="modern-table-card ptdn-table-scroll"><table className="custom-table" aria-label="Danh sách ủy quyền"><thead><tr><th>Nhân sự</th><th>Người cấp / Ngày cấp</th><th>Ghi chú</th><th>Hiệu lực</th><th>Thao tác</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5} className="ptdn-empty">Đang tải...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="ptdn-empty">{error ? "Không tải được dữ liệu." : "Chưa có ủy quyền."}</td></tr> : rows.map((r, i) => <tr key={`${r.IdNhanVien}-${r.NgayCap}-${i}`}>
        <td><span className="table-person-name">{r.HoTen}</span><small>{r.MaNhanVien} · {r.Email || "—"}</small></td><td>{r.TenNguoiCap || "—"}<small>{ngayGio(r.NgayCap)}</small></td><td>{r.GhiChu || "—"}</td>
        <td>{r.DaThuHoi === true ? <><span className="ptdn-badge ptdn-TRUNG">Đã thu hồi</span><small>{ngayGio(r.NgayThuHoi)}</small></> : r.ConThuocPhong === false ? <span className="ptdn-badge ptdn-warning">Đã rời phòng – không còn hiệu lực</span> : r.ConThuocPhong === true ? <span className="ptdn-badge ptdn-THEM">Đang có hiệu lực</span> : "—"}</td>
        <td>{r.DaThuHoi === false && <button className="ptdn-danger" onClick={() => open(r, true)}>Thu hồi</button>}</td>
      </tr>)}
    </tbody></table></div>
    <h3>Nhân sự của phòng</h3>
    <div className="modern-table-card ptdn-table-scroll"><table className="custom-table" aria-label="Ứng viên kê khai chức vụ"><thead><tr><th>Nhân sự</th><th>Chức vụ</th><th>Quyền kê khai</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={3} className="ptdn-empty">Đang tải...</td></tr> : candidates.length === 0 ? <tr><td colSpan={3} className="ptdn-empty">Chưa có nhân sự để hiển thị.</td></tr> : candidates.map((p) => <tr key={p.IdNhanVien}><td><span className="table-person-name">{p.HoTen}</span><small>{p.MaNhanVien}</small></td><td>{p.TenChucVu || "—"}</td><td>
        {p.LaQuanLy === true ? <button disabled>Đã có toàn quyền</button> : p.DaDuocCap === true ? <button className="ptdn-danger" onClick={() => open(p, true)}>Thu hồi</button> : <button className="ptdn-primary" onClick={() => open(p, false)}>Cấp quyền</button>}
      </td></tr>)}
    </tbody></table></div>
    {action && <Dialog draggable={false} visible header={action.revoke ? "Thu hồi quyền kê khai chức vụ" : "Cấp quyền kê khai chức vụ"} onHide={() => setAction(null)} modal closable={!busy} closeOnEscape={!busy} maskClassName="ptdn-dialog-mask"
      className="ptdn-dialog" style={{ width: "520px" }} breakpoints={{ "600px": "95vw" }}>
      <div className="ptdn"><p>{action.revoke ? "Thu hồi" : "Cấp"} quyền kê khai chức vụ cho <strong>{action.person.HoTen}</strong>?</p>
        {!action.revoke && <label className="ptdn-field">Ghi chú<textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} rows={3} disabled={busy} /></label>}
        {actionError && <p role="alert" className="ptdn-error">{actionError}</p>}
        <div className="ptdn-actions ptdn-footer"><button onClick={() => setAction(null)} disabled={busy}>Hủy</button><button className={action.revoke ? "ptdn-danger" : "ptdn-primary"} onClick={submit} disabled={busy}>{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
