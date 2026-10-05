import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../Common/SearchSelect";
import { layVienChucSangKien, themSangKien, suaSangKien } from "../../utils/sangKienApi";
import "../../css/Pages.css";
import "../../css/SangKien.css";

export default function SangKienForm({ item, catalog, donViList = [], onClose, onSaved }) {
  const editing = !!item?.IdSangKien;
  const [form, setForm] = useState({ TenSangKien: item?.TenSangKien ?? "", IdCap: item?.IdCap ?? "", IdLoaiGiaiPhap: item?.IdLoaiGiaiPhap ?? "",
    DonViChuTri: item?.DonViChuTri ?? "", NgayCongNhan: item?.NgayCongNhan?.slice(0, 10) ?? "", SoChungNhan: item?.SoChungNhan ?? "", GhiChu: item?.GhiChu ?? "" });
  // Existing authors may have changed classification; preserve them as returned by the server.
  const [selected, setSelected] = useState((item?.TacGia || []).filter((p) => p.IdNhanVien != null));
  const [keyword, setKeyword] = useState("");
  const [unit, setUnit] = useState("");
  const [people, setPeople] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  useEffect(() => {
    const controller = new AbortController();
    setPeople([]); setSearchError(""); setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await layVienChucSangKien({ tuKhoa: keyword.trim(), idDonVi: unit }, controller.signal);
        if (!controller.signal.aborted) setPeople(result.Items || []);
      } catch (e) { if (!controller.signal.aborted) setSearchError(e.message); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [keyword, unit, retry]);
  const save = async (event) => {
    event.preventDefault();
    if (busy || (editing && item.ChoPhepSua !== true)) return;
    if (!form.TenSangKien.trim() || !form.NgayCongNhan || !catalog.Cap?.some((c) => String(c.IdCap) === String(form.IdCap)) || selected.length < 1 || selected.length > 100) {
      setError("Nhập tên, cấp, ngày công nhận và chọn từ 1 đến 100 tác giả."); return;
    }
    setBusy(true); setError("");
    const body = { TenSangKien: form.TenSangKien.trim(), IdCap: Number(form.IdCap), IdLoaiGiaiPhap: form.IdLoaiGiaiPhap === "" ? null : Number(form.IdLoaiGiaiPhap),
      DonViChuTri: form.DonViChuTri.trim() || null, NgayCongNhan: form.NgayCongNhan, SoChungNhan: form.SoChungNhan.trim() || null, GhiChu: form.GhiChu.trim() || null,
      IdNhanViens: selected.map((p) => Number(p.IdNhanVien)) };
    try { onSaved(editing ? await suaSangKien(item.IdSangKien, body) : await themSangKien(body)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const footer = <><button type="button" className="btn-cancel" onClick={onClose} disabled={busy}>Hủy</button>
    <button className="btn-submit" type="submit" form="sangKienForm" disabled={busy}>{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Ghi nhận"}</button></>;
  return <Dialog visible header={editing ? "Sửa sáng kiến viên chức" : "Thêm sáng kiến viên chức"} onHide={onClose} className="sk-dialog" maskClassName="sk-dialog-mask"
    style={{ width: "800px" }} breakpoints={{ "840px": "95vw" }} modal closable={!busy} closeOnEscape={!busy} footer={footer}>
    <form id="sangKienForm" onSubmit={save} className="sk sk-entry-form">
      {error && <p className="sk-error" role="alert">{error}</p>}
      <fieldset disabled={busy}><div className="form-grid-2">
        <div className="form-group sk-full"><label htmlFor="sk-ten">Tên sáng kiến <span className="text-red">*</span></label><textarea id="sk-ten" className="form-input" required maxLength={1000} value={form.TenSangKien} onChange={(e) => change("TenSangKien", e.target.value)} rows={2} /></div>
        <div className="form-group"><label>Cấp công nhận <span className="text-red">*</span></label><SearchSelect ariaLabel="Cấp công nhận" required value={form.IdCap} disabled={busy} onChange={(v) => change("IdCap", v)} options={(catalog.Cap || []).map((c) => ({ value: c.IdCap, label: c.TenCap }))} /></div>
        <div className="form-group"><label>Loại giải pháp</label><SearchSelect ariaLabel="Loại giải pháp" value={form.IdLoaiGiaiPhap} disabled={busy} onChange={(v) => change("IdLoaiGiaiPhap", v)} options={[{ value: "", label: "Chưa chọn" }, ...(catalog.LoaiGiaiPhap || []).map((l) => ({ value: l.IdLoai, label: l.TenLoai }))]} /></div>
        <div className="form-group"><label htmlFor="sk-ngay">Ngày công nhận <span className="text-red">*</span></label><input id="sk-ngay" className="form-input" type="date" required value={form.NgayCongNhan} onChange={(e) => change("NgayCongNhan", e.target.value)} /></div>
        <div className="form-group"><label htmlFor="sk-so">Số chứng nhận / quyết định</label><input id="sk-so" className="form-input" maxLength={500} value={form.SoChungNhan} onChange={(e) => change("SoChungNhan", e.target.value)} /></div>
        <p className="sk-muted sk-full">Năm và quý tính điểm được xác định từ ngày công nhận. Ngày công nhận phải thuộc một năm đánh giá.</p>
        <div className="form-group sk-full"><label htmlFor="sk-don-vi">Đơn vị chủ trì</label><input id="sk-don-vi" className="form-input" maxLength={500} value={form.DonViChuTri} onChange={(e) => change("DonViChuTri", e.target.value)} /></div>
        <div className="form-group sk-full"><label htmlFor="sk-ghi-chu">Ghi chú</label><textarea id="sk-ghi-chu" className="form-input" maxLength={1000} value={form.GhiChu} onChange={(e) => change("GhiChu", e.target.value)} rows={2} /></div>
      </div><div className="sk-picker">
        <h4>Tác giả sáng kiến</h4><p className="sk-muted">Chọn tối đa 100 viên chức. Mọi tác giả đều được ghi nhận; tác giả mới chọn phải là viên chức.</p>
        <div className="sk-chips">{selected.map((p) => <span key={p.IdNhanVien}>{p.HoTen || p.HoTenNguon} · {p.MaNhanVien}
          <button type="button" aria-label={`Bỏ ${p.HoTen || p.HoTenNguon}`} onClick={() => setSelected((prev) => prev.filter((s) => String(s.IdNhanVien) !== String(p.IdNhanVien)))}>×</button></span>)}</div>
        <div className="form-grid-2"><div className="form-group"><label htmlFor="sk-tim-vien-chuc">Tìm viên chức</label><input id="sk-tim-vien-chuc" className="form-input" maxLength={100} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Họ tên hoặc mã nhân viên" /></div>
          <div className="form-group"><label>Đơn vị của viên chức</label><SearchSelect ariaLabel="Đơn vị của viên chức" value={unit} onChange={setUnit} disabled={busy} searchable options={[{ value: "", label: "Tất cả đơn vị" }, ...donViList.map((d) => ({ value: d.IdDonVi, label: d.TenDonVi }))]} /></div></div>
        {searchError && <p className="sk-error" role="alert">{searchError} <button type="button" onClick={() => setRetry((v) => v + 1)}>Tìm lại</button></p>}
        <p className="sk-muted" role="status">{searching ? "Đang tìm viên chức..." : people.length === 0 ? "Không tìm thấy viên chức." : "Chọn viên chức trong kết quả bên dưới."}</p>
        <div className="sk-picker-results">{people.map((p) => <button type="button" key={p.IdNhanVien} disabled={selected.length >= 100 || selected.some((s) => String(s.IdNhanVien) === String(p.IdNhanVien))}
          onClick={() => setSelected((prev) => prev.some((s) => String(s.IdNhanVien) === String(p.IdNhanVien)) || prev.length >= 100 ? prev : [...prev, p])}>
          <strong>{p.HoTen}</strong><span>{p.MaNhanVien} · {p.TenDonVi || "—"}</span></button>)}</div>
      </div></fieldset>
    </form>
  </Dialog>;
}
