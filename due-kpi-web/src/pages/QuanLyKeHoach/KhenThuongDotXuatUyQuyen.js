import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import { useQuyenKhenThuong } from "../../context/KhenThuongDotXuatContext";
import { layNguoiNhapKhenThuong, layUngVienKhenThuong, capQuyenKhenThuong, thuHoiQuyenKhenThuong } from "../../utils/khenThuongDotXuatApi";
import { ngayKhenThuong } from "../../components/KhenThuongDotXuat/KhenThuongDotXuatDetail";
import "../../css/Pages.css";
import "../../css/KhenThuongDotXuat.css";

export default function KhenThuongDotXuatUyQuyen() {
  const { quyen } = useQuyenKhenThuong();
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
  useEffect(() => { setAction(null); setMessage(""); }, [quyen]);
  useEffect(() => {
    let cancelled = false;
    setRows([]); setCandidates([]); setError("");
    if (quyen?.LaQuanLy !== true) return;
    setLoading(true);
    Promise.all([layNguoiNhapKhenThuong(history), layUngVienKhenThuong()])
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
      const result = action.revoke ? await thuHoiQuyenKhenThuong(action.person.IdNhanVien) : await capQuyenKhenThuong({ IdNhanVien: action.person.IdNhanVien, GhiChu: note.trim() || null });
      setMessage(result.Message || (action.revoke ? "Đã thu hồi quyền." : "Đã cấp quyền.")); setAction(null); setRevision((v) => v + 1);
    } catch (e) { setActionError(e.message); }
    finally { setBusy(false); }
  };
  if (quyen?.LaQuanLy !== true) return <div className="page-container">Bạn không có quyền ủy quyền nhập liệu.</div>;
  return <div className="page-container ktdx">
    <div className="page-header ktdx-heading"><div className="header-title"><h2>Ủy quyền nhập liệu khen thưởng đột xuất</h2><span className="breadcrumb">Cấp quyền ghi nhận cho nhân sự Phòng Tổ chức – Hành chính</span></div><Link className="ktdx-button" to="/khen-thuong-dot-xuat">Về danh sách ghi nhận</Link></div>
    {message && <p role="status" className="ktdx-notice">{message}</p>}
    {error && <div role="alert" className="ktdx-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại</button></div>}
    <div className="ktdx-heading"><h3>Danh sách ủy quyền</h3><label className="ktdx-check"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />Bao gồm đã thu hồi</label></div>
    <div className="modern-table-card ktdx-table-scroll"><table className="custom-table" aria-label="Danh sách ủy quyền"><thead><tr><th>Nhân sự</th><th>Người cấp / Ngày cấp</th><th>Ghi chú</th><th>Hiệu lực</th><th>Thao tác</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5} className="ktdx-empty">Đang tải...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="ktdx-empty">{error ? "Không tải được dữ liệu." : "Chưa có ủy quyền."}</td></tr> : rows.map((r, i) => <tr key={`${r.IdNhanVien}-${r.NgayCap}-${i}`}>
        <td><span className="table-person-name">{r.HoTen}</span><small>{r.MaNhanVien} · {r.Email || "—"}</small></td><td>{r.TenNguoiCap || "—"}<small>{ngayKhenThuong(r.NgayCap, true)}</small></td><td>{r.GhiChu || "—"}</td>
        <td>{r.DaThuHoi === true ? <><span className="ktdx-badge ktdx-TRUNG">Đã thu hồi</span><small>{ngayKhenThuong(r.NgayThuHoi, true)}</small></> : r.ConThuocPhong === false ? <span className="ktdx-badge ktdx-warning">Đã rời phòng – không còn hiệu lực</span> : r.ConThuocPhong === true ? <span className="ktdx-badge ktdx-THEM">Đang có hiệu lực</span> : "—"}</td>
        <td>{r.DaThuHoi === false && <button className="ktdx-danger" onClick={() => open(r, true)}>Thu hồi</button>}</td>
      </tr>)}
    </tbody></table></div>
    <h3>Nhân sự của phòng</h3>
    <div className="modern-table-card ktdx-table-scroll"><table className="custom-table" aria-label="Ứng viên nhập liệu"><thead><tr><th>Nhân sự</th><th>Chức vụ</th><th>Quyền nhập liệu</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={3} className="ktdx-empty">Đang tải...</td></tr> : candidates.length === 0 ? <tr><td colSpan={3} className="ktdx-empty">Chưa có nhân sự để hiển thị.</td></tr> : candidates.map((p) => <tr key={p.IdNhanVien}><td><span className="table-person-name">{p.HoTen}</span><small>{p.MaNhanVien}</small></td><td>{p.TenChucVu || "—"}</td><td>
        {p.LaQuanLy === true ? <button disabled>Đã có toàn quyền</button> : p.DaDuocCap === true ? <button className="ktdx-danger" onClick={() => open(p, true)}>Thu hồi</button> : <button className="ktdx-primary" onClick={() => open(p, false)}>Cấp quyền</button>}
      </td></tr>)}
    </tbody></table></div>
    {action && <Dialog draggable={false} visible header={action.revoke ? "Thu hồi quyền nhập liệu" : "Cấp quyền nhập liệu"} onHide={() => setAction(null)} modal closable={!busy} closeOnEscape={!busy} maskClassName="ktdx-dialog-mask"
      className="ktdx-dialog" style={{ width: "520px" }} breakpoints={{ "600px": "95vw" }}>
      <div className="ktdx"><p>{action.revoke ? "Thu hồi" : "Cấp"} quyền nhập liệu cho <strong>{action.person.HoTen}</strong>?</p>
        {!action.revoke && <label className="ktdx-field">Ghi chú<textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} rows={3} disabled={busy} /></label>}
        {actionError && <p role="alert" className="ktdx-error">{actionError}</p>}
        <div className="ktdx-actions ktdx-footer"><button onClick={() => setAction(null)} disabled={busy}>Hủy</button><button className={action.revoke ? "ktdx-danger" : "ktdx-primary"} onClick={submit} disabled={busy}>{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
