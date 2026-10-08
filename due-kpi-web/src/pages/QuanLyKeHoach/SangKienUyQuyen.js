import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import { useQuyenSangKien } from "../../context/SangKienContext";
import { layNguoiNhapSangKien, layUngVienSangKien, capQuyenSangKien, thuHoiQuyenSangKien } from "../../utils/sangKienApi";
import { ngaySangKien } from "../../components/SangKien/SangKienInfo";
import "../../css/Pages.css";
import "../../css/SangKien.css";

export default function SangKienUyQuyen() {
  const { quyen } = useQuyenSangKien();
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
    Promise.all([layNguoiNhapSangKien(history), layUngVienSangKien()])
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
      const result = action.revoke ? await thuHoiQuyenSangKien(action.person.IdNhanVien) : await capQuyenSangKien({ IdNhanVien: action.person.IdNhanVien, GhiChu: note.trim() || null });
      setMessage(result.Message || (action.revoke ? "Đã thu hồi quyền." : "Đã cấp quyền.")); setAction(null); setRevision((v) => v + 1);
    } catch (e) { setActionError(e.message); }
    finally { setBusy(false); }
  };
  if (quyen?.LaQuanLy !== true) return <div className="page-container">Bạn không có quyền ủy quyền nhập liệu.</div>;
  return <div className="page-container sk">
    <div className="page-header sk-heading"><div className="header-title"><h2>Ủy quyền nhập liệu sáng kiến</h2><span className="breadcrumb">Cấp quyền đồng bộ NCKH và xét đổi mới giảng dạy cho nhân sự Phòng Khoa học</span></div><Link className="sk-button" to="/sang-kien">Về danh sách sáng kiến</Link></div>
    {message && <p role="status" className="sk-notice">{message}</p>}
    {error && <div role="alert" className="sk-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại</button></div>}
    <div className="sk-heading"><h3>Danh sách ủy quyền</h3><label className="sk-check"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />Bao gồm đã thu hồi</label></div>
    <div className="modern-table-card sk-table-scroll"><table className="custom-table" aria-label="Danh sách ủy quyền"><thead><tr><th>Nhân sự</th><th>Người cấp / Ngày cấp</th><th>Ghi chú</th><th>Hiệu lực</th><th>Thao tác</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5} className="sk-empty">Đang tải...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="sk-empty">{error ? "Không tải được dữ liệu." : "Chưa có ủy quyền."}</td></tr> : rows.map((r, i) => <tr key={`${r.IdNhanVien}-${r.NgayCap}-${i}`}>
        <td><span className="table-person-name">{r.HoTen}</span><small>{r.MaNhanVien} · {r.Email || "—"}</small></td><td>{r.TenNguoiCap || "—"}<small>{ngaySangKien(r.NgayCap, true)}</small></td><td>{r.GhiChu || "—"}</td>
        <td>{r.DaThuHoi === true ? <><span className="sk-badge sk-TRUNG">Đã thu hồi</span><small>{ngaySangKien(r.NgayThuHoi, true)}</small></> : r.ConThuocPhong === false ? <span className="sk-badge sk-warning">Đã rời phòng – không còn hiệu lực</span> : r.ConThuocPhong === true ? <span className="sk-badge sk-THEM">Đang có hiệu lực</span> : "—"}</td>
        <td>{r.DaThuHoi === false && <button className="sk-danger" onClick={() => open(r, true)}>Thu hồi</button>}</td>
      </tr>)}
    </tbody></table></div>
    <h3>Nhân sự của phòng</h3>
    <div className="modern-table-card sk-table-scroll"><table className="custom-table" aria-label="Ứng viên nhập liệu"><thead><tr><th>Nhân sự</th><th>Chức vụ</th><th>Quyền nhập liệu</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={3} className="sk-empty">Đang tải...</td></tr> : candidates.length === 0 ? <tr><td colSpan={3} className="sk-empty">Chưa có nhân sự để hiển thị.</td></tr> : candidates.map((p) => <tr key={p.IdNhanVien}><td><span className="table-person-name">{p.HoTen}</span><small>{p.MaNhanVien}</small></td><td>{p.TenChucVu || "—"}</td><td>
        {p.LaQuanLy === true ? <button disabled>Đã có toàn quyền</button> : p.DaDuocCap === true ? <button className="sk-danger" onClick={() => open(p, true)}>Thu hồi</button> : <button className="sk-primary" onClick={() => open(p, false)}>Cấp quyền</button>}
      </td></tr>)}
    </tbody></table></div>
    {action && <Dialog visible header={action.revoke ? "Thu hồi quyền nhập liệu" : "Cấp quyền nhập liệu"} onHide={() => setAction(null)} modal closable={!busy} closeOnEscape={!busy} maskClassName="sk-dialog-mask"
      className="sk-dialog" style={{ width: "520px" }} breakpoints={{ "600px": "95vw" }}>
      <div className="sk sk-action-form"><p>{action.revoke ? "Thu hồi" : "Cấp"} quyền nhập liệu cho <strong>{action.person.HoTen}</strong>?</p>
        {!action.revoke && <label className="sk-field">Ghi chú<textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} rows={3} disabled={busy} /></label>}
        {actionError && <p role="alert" className="sk-error">{actionError}</p>}
        <div className="sk-actions sk-footer"><button onClick={() => setAction(null)} disabled={busy}>Hủy</button><button className={action.revoke ? "sk-danger" : "sk-primary"} onClick={submit} disabled={busy}>{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
