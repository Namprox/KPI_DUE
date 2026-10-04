import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../../components/Common/SearchSelect";
import { useQuyenDoiNgu } from "../../context/PhatTrienDoiNguContext";
import { layLoaiDoiNgu, layHangMucDoiNgu, themHangMucDoiNgu, suaHangMucDoiNgu } from "../../utils/phatTrienDoiNguApi";
import "../../css/Pages.css";
import "../../css/PhatTrienDoiNgu.css";

export default function PhatTrienDoiNguHangMuc() {
  const { quyen } = useQuyenDoiNgu();
  const [types, setTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [idLoai, setIdLoai] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const type = types.find((t) => String(t.IdLoai) === String(idLoai));
  useEffect(() => {
    const controller = new AbortController();
    setRows([]); setError(""); setForm(null);
    if (quyen?.LaQuanLy !== true) return;
    setLoading(true);
    Promise.all([layLoaiDoiNgu(), layHangMucDoiNgu({ idLoai, baoGomNgungDung: true }, controller.signal)])
      .then(([loai, hangMuc]) => { if (!controller.signal.aborted) { setTypes(loai.Items || []); setRows(hangMuc.Items || []); } })
      .catch((e) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [quyen, idLoai, revision]);
  const open = (item) => {
    setFormError("");
    setForm(item ? { ...item, MaHangMuc: item.MaHangMuc || "" } : { IdLoai: type.IdLoai, MaHangMuc: "", TenHangMuc: "", ThuTu: "", DangSuDung: true });
  };
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const save = async (e) => {
    e.preventDefault();
    if (busy || quyen?.LaQuanLy !== true) return;
    if (form.IdHangMuc ? form.CoTheSua !== true : type?.ChoThemHangMuc !== true) return;
    const code = form.MaHangMuc.trim();
    if (!form.TenHangMuc.trim() || (code && !/^[a-zA-Z0-9_]+$/.test(code)) || (form.IdHangMuc && form.ThuTu === "") || (form.ThuTu !== "" && !Number.isInteger(Number(form.ThuTu)))) {
      setFormError("Nhập tên hạng mục, mã chỉ gồm chữ không dấu / số / dấu gạch dưới và thứ tự là số nguyên."); return;
    }
    setBusy(true); setFormError("");
    const body = { MaHangMuc: code || null, TenHangMuc: form.TenHangMuc.trim(), ThuTu: form.ThuTu === "" ? null : Number(form.ThuTu) };
    try {
      const result = form.IdHangMuc
        ? await suaHangMucDoiNgu(form.IdHangMuc, { ...body, DangSuDung: form.DangSuDung })
        : await themHangMucDoiNgu({ ...body, IdLoai: Number(form.IdLoai) });
      setMessage(result.CoThayDoi === false ? "Không có thay đổi nào được ghi nhận." : result.Message || "Đã lưu hạng mục.");
      setForm(null); setRevision((v) => v + 1);
    } catch (err) { setFormError(err.message); }
    finally { setBusy(false); }
  };
  if (quyen?.LaQuanLy !== true) return <div className="page-container">Bạn không có quyền quản lý hạng mục.</div>;
  return <div className="page-container ptdn">
    <div className="page-header ptdn-heading"><div className="header-title"><h2>Danh mục hạng mục phát triển đội ngũ</h2><span className="breadcrumb">Phòng Tổ chức – Hành chính quản lý các khoá bồi dưỡng</span></div><Link className="ptdn-button" to="/phat-trien-doi-ngu">Về danh sách ghi nhận</Link></div>
    <p className="ptdn-muted">Danh hiệu nhà giáo và ngạch / học hàm, học vị là danh mục cố định. Ngừng dùng hạng mục không ảnh hưởng đến điểm của bản ghi cũ. Đổi tên sẽ cập nhật tên hiển thị trên các bản ghi liên quan.</p>
    {message && <p role="status" className="ptdn-notice">{message}</p>}
    {error && <div role="alert" className="ptdn-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại</button></div>}
    <div className="ptdn-filters"><div className="ptdn-field"><label>Loại ghi nhận</label><SearchSelect ariaLabel="Loại danh mục" value={idLoai} onChange={setIdLoai} options={[{ value: "", label: "Tất cả loại" }, ...types.map((t) => ({ value: t.IdLoai, label: t.TenLoai }))]} /></div>
      {type?.ChoThemHangMuc === true && <button className="ptdn-primary" disabled={loading} onClick={() => open(null)}>+ Thêm hạng mục</button>}
    </div>
    <div className="modern-table-card ptdn-table-scroll"><table className="custom-table" aria-label="Danh mục hạng mục"><colgroup><col style={{ width: "7%" }} /><col style={{ width: "13%" }} /><col style={{ width: "27%" }} /><col style={{ width: "23%" }} /><col style={{ width: "12%" }} /><col style={{ width: "8%" }} /><col style={{ width: "10%" }} /></colgroup>
      <thead><tr><th>Thứ tự</th><th>Mã</th><th>Hạng mục</th><th>Loại ghi nhận</th><th>Trạng thái</th><th>Bản ghi</th><th>Thao tác</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={7} className="ptdn-empty">Đang tải...</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="ptdn-empty">{error ? "Không tải được danh mục." : "Chưa có hạng mục."}</td></tr> : rows.map((h) => <tr key={h.IdHangMuc}>
          <td>{h.ThuTu}</td><td>{h.MaHangMuc || "—"}</td><td>{h.TenHangMuc}{h.LaCoDinh === true && <small>Cố định</small>}</td><td>{h.TenLoai}</td><td><span className={`ptdn-badge ${h.DangSuDung === true ? "ptdn-THEM" : "ptdn-TRUNG"}`}>{h.DangSuDung === true ? "Đang dùng" : "Ngừng dùng"}</span></td><td>{h.SoBanGhi ?? "—"}</td><td>{h.CoTheSua === true && <button onClick={() => open(h)}>Sửa</button>}</td>
        </tr>)}
      </tbody></table></div>
    {form && <Dialog visible header={form.IdHangMuc ? "Sửa hạng mục" : "Thêm hạng mục"} modal onHide={() => setForm(null)} closable={!busy} closeOnEscape={!busy} className="ptdn-dialog" maskClassName="ptdn-dialog-mask" style={{ width: "620px" }} breakpoints={{ "700px": "95vw" }}
      pt={{ header: { className: "modal-header" }, content: { className: "modal-body" }, footer: { className: "modal-footer" } }} footer={<><button className="btn-cancel" onClick={() => setForm(null)} disabled={busy}>Hủy</button><button className="btn-submit" form="ptdn-hang-muc-form" type="submit" disabled={busy}>{busy ? "Đang lưu..." : "Lưu hạng mục"}</button></>}>
      <form id="ptdn-hang-muc-form" onSubmit={save} className="ptdn ptdn-entry-form">
        {formError && <p role="alert" className="ptdn-error">{formError}</p>}
        <fieldset disabled={busy}><div className="form-grid-2">
          <div className="form-group ptdn-full"><label htmlFor="ptdn-ten-hang-muc">Tên hạng mục <span className="text-red">*</span></label><input id="ptdn-ten-hang-muc" className="form-input" required maxLength={255} value={form.TenHangMuc} onChange={(e) => change("TenHangMuc", e.target.value)} /></div>
          <div className="form-group"><label htmlFor="ptdn-ma-hang-muc">Mã hạng mục (tuỳ chọn)</label><input id="ptdn-ma-hang-muc" className="form-input" maxLength={50} pattern="[A-Za-z0-9_]+" value={form.MaHangMuc} onChange={(e) => change("MaHangMuc", e.target.value)} /><small className="ptdn-muted">Chữ không dấu, số, dấu _; dùng mã khi import.</small></div>
          <div className="form-group"><label htmlFor="ptdn-thu-tu">Thứ tự{!form.IdHangMuc && " (trống = cuối danh sách)"}</label><input id="ptdn-thu-tu" className="form-input" type="number" step="1" required={!!form.IdHangMuc} value={form.ThuTu} onChange={(e) => change("ThuTu", e.target.value)} /></div>
          {form.IdHangMuc && <label className="ptdn-check"><input type="checkbox" checked={form.DangSuDung === true} onChange={(e) => change("DangSuDung", e.target.checked)} />Đang sử dụng</label>}
        </div></fieldset>
      </form>
    </Dialog>}
  </div>;
}
