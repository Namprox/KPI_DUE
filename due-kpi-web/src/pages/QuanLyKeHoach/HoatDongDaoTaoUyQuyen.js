import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import { useQuyenDaoTao } from "../../context/HoatDongDaoTaoContext";
import { layNguoiNhapDaoTao, layUngVienDaoTao, capQuyenDaoTao, thuHoiQuyenDaoTao } from "../../utils/hoatDongDaoTaoApi";
import { ngayDaoTao } from "../../components/HoatDongDaoTao/HoatDongDaoTaoDetail";
import "../../css/Pages.css";
import "../../css/HoatDongDaoTao.css";

export default function HoatDongDaoTaoUyQuyen() {
  const { quyen } = useQuyenDaoTao();
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
    Promise.all([layNguoiNhapDaoTao(history), layUngVienDaoTao()])
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
      const result = action.revoke ? await thuHoiQuyenDaoTao(action.person.IdNhanVien) : await capQuyenDaoTao({ IdNhanVien: action.person.IdNhanVien, GhiChu: note.trim() || null });
      setMessage(result.Message || (action.revoke ? "Đã thu hồi quyền." : "Đã cấp quyền.")); setAction(null); setRevision((v) => v + 1);
    } catch (e) { setActionError(e.message); }
    finally { setBusy(false); }
  };
  if (quyen?.LaQuanLy !== true) return <div className="page-container">Bạn không có quyền ủy quyền nhập liệu.</div>;
  return <div className="page-container hddt">
    <div className="page-header hddt-heading"><div className="header-title"><h2>Ủy quyền nhập liệu đào tạo</h2><span className="breadcrumb">Cấp quyền ghi nhận cho nhân sự Phòng Đào tạo và Bảo đảm chất lượng</span></div><Link className="hddt-button" to="/hoat-dong-dao-tao">Về danh sách hoạt động</Link></div>
    {message && <p role="status" className="hddt-notice">{message}</p>}
    {error && <div role="alert" className="hddt-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại</button></div>}
    <div className="hddt-heading"><h3>Danh sách ủy quyền</h3><label className="hddt-check"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />Bao gồm đã thu hồi</label></div>
    <div className="modern-table-card hddt-table-scroll"><table className="custom-table" aria-label="Danh sách ủy quyền"><thead><tr><th>Nhân sự</th><th>Người cấp / Ngày cấp</th><th>Ghi chú</th><th>Hiệu lực</th><th>Thao tác</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={5} className="hddt-empty">Đang tải...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="hddt-empty">{error ? "Không tải được dữ liệu." : "Chưa có ủy quyền."}</td></tr> : rows.map((r, i) => <tr key={`${r.IdNhanVien}-${r.NgayCap}-${i}`}>
        <td><span className="table-person-name">{r.HoTen}</span><small>{r.MaNhanVien} · {r.Email || "—"}</small></td><td>{r.TenNguoiCap || "—"}<small>{ngayDaoTao(r.NgayCap, true)}</small></td><td>{r.GhiChu || "—"}</td>
        <td>{r.DaThuHoi === true ? <><span className="hddt-badge hddt-TRUNG">Đã thu hồi</span><small>{ngayDaoTao(r.NgayThuHoi, true)}</small></> : r.ConThuocPhong === false ? <span className="hddt-badge hddt-warning">Đã rời phòng – không còn hiệu lực</span> : r.ConThuocPhong === true ? <span className="hddt-badge hddt-THEM">Đang có hiệu lực</span> : "—"}</td>
        <td>{r.DaThuHoi === false && <button className="hddt-danger" onClick={() => open(r, true)}>Thu hồi</button>}</td>
      </tr>)}
    </tbody></table></div>
    <h3>Nhân sự của phòng</h3>
    <div className="modern-table-card hddt-table-scroll"><table className="custom-table" aria-label="Ứng viên nhập liệu"><thead><tr><th>Nhân sự</th><th>Chức vụ</th><th>Quyền nhập liệu</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={3} className="hddt-empty">Đang tải...</td></tr> : candidates.length === 0 ? <tr><td colSpan={3} className="hddt-empty">Chưa có nhân sự để hiển thị.</td></tr> : candidates.map((p) => <tr key={p.IdNhanVien}><td><span className="table-person-name">{p.HoTen}</span><small>{p.MaNhanVien}</small></td><td>{p.TenChucVu || "—"}</td><td>
        {p.LaQuanLy === true ? <button disabled>Đã có toàn quyền</button> : p.DaDuocCap === true ? <button className="hddt-danger" onClick={() => open(p, true)}>Thu hồi</button> : <button className="hddt-primary" onClick={() => open(p, false)}>Cấp quyền</button>}
      </td></tr>)}
    </tbody></table></div>
    {action && <Dialog visible header={action.revoke ? "Thu hồi quyền nhập liệu" : "Cấp quyền nhập liệu"} onHide={() => setAction(null)} modal closable={!busy} closeOnEscape={!busy} maskClassName="hddt-dialog-mask"
      className="hddt-dialog" style={{ width: "520px" }} breakpoints={{ "600px": "95vw" }}>
      <div className="hddt"><p>{action.revoke ? "Thu hồi" : "Cấp"} quyền nhập liệu cho <strong>{action.person.HoTen}</strong>?</p>
        {!action.revoke && <label className="hddt-field">Ghi chú<textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} rows={3} disabled={busy} /></label>}
        {actionError && <p role="alert" className="hddt-error">{actionError}</p>}
        <div className="hddt-actions hddt-footer"><button onClick={() => setAction(null)} disabled={busy}>Hủy</button><button className={action.revoke ? "hddt-danger" : "hddt-primary"} onClick={submit} disabled={busy}>{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
