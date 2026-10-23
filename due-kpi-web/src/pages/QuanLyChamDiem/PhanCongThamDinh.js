import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../../components/Common/SearchSelect";
import { useQuyenThamDinh } from "../../context/PhanCongThamDinhContext";
import {
  GHI_CHU_TOI_DA, LOI_CAN_TAI_LAI, layPhanCongThamDinh, layUngVienThamDinh,
  phanCongThamDinh, thuHoiPhanCongThamDinh,
} from "../../utils/phanCongThamDinhApi";
import "../../css/Pages.css";
// Cùng khuôn màn ủy quyền với "Kê khai chức vụ" / "Phát triển đội ngũ", nên dùng
// lại bộ class `ptdn` thay vì nhân bản CSS.
import "../../css/PhatTrienDoiNgu.css";

const ngayGio = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("vi-VN");
};

/**
 * Khác màn ủy quyền kê khai chức vụ ở hai chỗ: phải CHỌN ĐƠN VỊ (một người có thể
 * làm trưởng nhiều đơn vị, ADMIN quản lý mọi đơn vị), và thu hồi theo id PHÂN
 * CÔNG chứ không theo id nhân viên.
 *
 * Phân công gắn với đơn vị, không gắn người cấp: trưởng đơn vị mới thấy và thu
 * hồi được phân công của người tiền nhiệm.
 */
const HieuLuc = ({ row }) => {
  if (row.DaThuHoi === true) {
    return <><span className="ptdn-badge ptdn-TRUNG">Đã thu hồi</span>
      <small>{row.TenNguoiThuHoi ? `${row.TenNguoiThuHoi} · ` : ""}{ngayGio(row.NgayThuHoi)}</small></>;
  }
  if (row.ConHieuLuc === false) {
    return <span className="ptdn-badge ptdn-warning">Đã thôi chức vụ - không còn hiệu lực</span>;
  }
  return <span className="ptdn-badge ptdn-THEM">Đang có hiệu lực</span>;
};

export default function PhanCongThamDinh() {
  const { quyen } = useQuyenThamDinh();
  const duocQuanLy = quyen?.LaTruongDonVi === true || quyen?.LaAdmin === true;
  const donViList = useMemo(() => quyen?.DonViQuanLy || [], [quyen]);
  const [idDonVi, setIdDonVi] = useState(null);
  const [history, setHistory] = useState(false);
  const [rows, setRows] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  // Chỉ quản lý một đơn vị thì chọn sẵn; đơn vị đang chọn biến mất khỏi danh
  // sách (vừa thôi chức vụ trưởng) thì bỏ chọn.
  useEffect(() => {
    setIdDonVi((current) => {
      if (donViList.some((dv) => dv.IdDonVi === current)) return current;
      return donViList.length === 1 ? donViList[0].IdDonVi : null;
    });
  }, [donViList]);

  useEffect(() => {
    let cancelled = false;
    setRows([]); setCandidates([]); setError("");
    if (!duocQuanLy || idDonVi == null) return undefined;
    setLoading(true);
    Promise.all([layPhanCongThamDinh(idDonVi, history), layUngVienThamDinh(idDonVi)])
      .then(([list, people]) => { if (!cancelled) { setRows(list.Items || []); setCandidates(people.Items || []); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [idDonVi, history, revision, duocQuanLy]);

  const tenDonVi = donViList.find((dv) => dv.IdDonVi === idDonVi)?.TenDonVi || "";
  const open = (target, revoke) => { setAction({ target, revoke }); setNote(""); setActionError(""); };
  const submit = async () => {
    if (busy || !action) return;
    setBusy(true); setActionError("");
    try {
      const result = action.revoke
        ? await thuHoiPhanCongThamDinh(action.target.Id)
        : await phanCongThamDinh({ idDonVi, idNhanVien: action.target.IdNhanVien, ghiChu: note.trim() });
      setMessage({ ok: true, text: result.Message || (action.revoke ? "Đã thu hồi phân công." : "Đã phân công thẩm định.") });
      setAction(null); setRevision((v) => v + 1);
    } catch (e) {
      // Danh sách trên màn hình đã cũ: đóng hộp thoại, báo lý do rồi tải lại.
      if (LOI_CAN_TAI_LAI.includes(e.errorCode)) {
        setMessage({ ok: false, text: e.message });
        setAction(null); setRevision((v) => v + 1);
      } else {
        setActionError(e.message);
      }
    } finally { setBusy(false); }
  };

  if (!duocQuanLy) return <div className="page-container">Bạn không có quyền phân công thẩm định.</div>;
  return <div className="page-container ptdn">
    <div className="page-header ptdn-heading"><div className="header-title"><h2>Phân công thẩm định</h2>
      <span className="breadcrumb">Giao phó / thư ký của đơn vị thẩm định toàn bộ tiêu chí đơn vị được giao. Người được phân công không duyệt được phiếu của chính mình và không chốt hồ sơ.</span></div></div>
    <div className="ptdn-filters"><div className="ptdn-field"><label>Đơn vị</label>
      <SearchSelect ariaLabel="Đơn vị" value={idDonVi} searchable={donViList.length > 8} placeholder="-- Chọn đơn vị --"
        disabled={busy || donViList.length === 0} onChange={(v) => { setIdDonVi(v); setMessage(null); }}
        options={donViList.map((dv) => ({ value: dv.IdDonVi, label: dv.TenDonVi }))} /></div></div>
    {donViList.length === 0 && <p className="ptdn-warning">Bạn chưa quản lý đơn vị nào để phân công thẩm định.</p>}
    {message && <p role={message.ok ? "status" : "alert"} className={message.ok ? "ptdn-notice" : "ptdn-error"}>{message.text}</p>}
    {error && <div role="alert" className="ptdn-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại</button></div>}
    {idDonVi != null && <>
      <div className="ptdn-heading"><h3>Danh sách phân công · {tenDonVi}</h3><label className="ptdn-check"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} />Bao gồm đã thu hồi</label></div>
      <div className="modern-table-card ptdn-table-scroll"><table className="custom-table" aria-label="Danh sách phân công thẩm định"><thead><tr><th>Nhân sự</th><th>Chức vụ</th><th>Người cấp / Ngày cấp</th><th>Ghi chú</th><th>Hiệu lực</th><th>Thao tác</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6} className="ptdn-empty">Đang tải...</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="ptdn-empty">{error ? "Không tải được dữ liệu." : "Đơn vị chưa phân công ai thẩm định."}</td></tr> : rows.map((r) => <tr key={r.Id}>
          <td><span className="table-person-name">{r.HoTen}</span><small>{r.MaNhanVien} · {r.Email || "-"}</small></td>
          <td>{r.TenChucVu || "-"}</td>
          <td>{r.TenNguoiCap || "-"}<small>{ngayGio(r.NgayCap)}</small></td><td>{r.GhiChu || "-"}</td>
          <td><HieuLuc row={r} /></td>
          <td>{r.DaThuHoi !== true && <button className="ptdn-danger" onClick={() => open(r, true)}>Thu hồi</button>}</td>
        </tr>)}
      </tbody></table></div>
      <h3>Phó / thư ký của đơn vị</h3>
      <div className="modern-table-card ptdn-table-scroll"><table className="custom-table" aria-label="Ứng viên phân công thẩm định"><thead><tr><th>Nhân sự</th><th>Chức vụ</th><th>Phân công</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={3} className="ptdn-empty">Đang tải...</td></tr> : candidates.length === 0 ? <tr><td colSpan={3} className="ptdn-empty">{error ? "Không tải được dữ liệu." : "Đơn vị chưa có phó / thư ký nào - liên hệ P_TCHC kê khai chức vụ."}</td></tr> : candidates.map((p) => <tr key={p.IdNhanVien}>
          <td><span className="table-person-name">{p.HoTen}</span><small>{p.MaNhanVien} · {p.Email || "-"}</small></td><td>{p.TenChucVu || "-"}</td>
          <td>{p.DaDuocPhanCong === true ? <button disabled>Đã phân công</button> : <button className="ptdn-primary" onClick={() => open(p, false)}>Phân công</button>}</td>
        </tr>)}
      </tbody></table></div>
    </>}
    {action && <Dialog draggable={false} visible header={action.revoke ? "Thu hồi phân công thẩm định" : "Phân công thẩm định"} onHide={() => setAction(null)} modal closable={!busy} closeOnEscape={!busy} maskClassName="ptdn-dialog-mask"
      className="ptdn-dialog" style={{ width: "520px" }} breakpoints={{ "600px": "95vw" }}>
      <div className="ptdn"><p>{action.revoke ? "Thu hồi quyền thẩm định của" : "Giao thẩm định toàn bộ tiêu chí của đơn vị cho"} <strong>{action.target.HoTen}</strong>{tenDonVi && <> tại <strong>{tenDonVi}</strong></>}?</p>
        {action.revoke && <p className="ptdn-muted">Có hiệu lực ngay: người này mất quyền thẩm định ở lần tải lại màn hình kế tiếp.</p>}
        {!action.revoke && <label className="ptdn-field">Ghi chú<textarea maxLength={GHI_CHU_TOI_DA} value={note} onChange={(e) => setNote(e.target.value)} rows={3} disabled={busy} placeholder="Ví dụ: Duyệt điểm giảng viên" />
          <span className="ptdn-muted">{note.length}/{GHI_CHU_TOI_DA} ký tự</span></label>}
        {actionError && <p role="alert" className="ptdn-error">{actionError}</p>}
        <div className="ptdn-actions ptdn-footer"><button onClick={() => setAction(null)} disabled={busy}>Hủy</button><button className={action.revoke ? "ptdn-danger" : "ptdn-primary"} onClick={submit} disabled={busy}>{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
