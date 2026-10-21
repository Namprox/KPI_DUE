import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../Common/SearchSelect";
import { useQuyenKhenThuong } from "../../context/KhenThuongDotXuatContext";
import { layVienChucKhenThuong, layMucKhenThuong, themKhenThuongDotXuat, suaKhenThuongDotXuat } from "../../utils/khenThuongDotXuatApi";
import { formatDiem } from "../../utils/keKhaiThanhTichApi";
import { HUONG_DAN_DIEM } from "./KhenThuongDotXuatDetail";

export default function KhenThuongDotXuatForm({ item, idNam, namList, donViList, onClose, onSaved }) {
  const { quyen } = useQuyenKhenThuong();
  const editing = !!item?.IdKhenThuong;
  const canSave = editing ? item.ChoPhepSua === true : quyen?.DuocNhap === true;
  const legacy = editing && Number(item.Nguon) === 3;
  const [form, setForm] = useState({
    IdNam: item?.IdNam ?? idNam, IdMuc: item?.IdMuc ?? "", NoiDung: item?.NoiDung ?? "",
    SoQuyetDinh: item?.SoQuyetDinh ?? "", NgayQuyetDinh: item?.NgayQuyetDinh?.slice(0, 10) ?? "",
    Quy: item?.Quy ?? "", CoQuanKhen: item?.CoQuanKhen ?? "", GhiChu: item?.GhiChu ?? "",
  });
  const [selected, setSelected] = useState(item ? [item] : []);
  const [keyword, setKeyword] = useState("");
  const [donVi, setDonVi] = useState("");
  const [people, setPeople] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchRetry, setSearchRetry] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState({ items: [], loading: true, error: "" });
  const [catalogRetry, setCatalogRetry] = useState(0);
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  useEffect(() => {
    const controller = new AbortController();
    setCatalog({ items: [], loading: true, error: "" });
    layMucKhenThuong({ baoGomNgungDung: editing }, controller.signal).then((r) => {
      if (!controller.signal.aborted) setCatalog({ items: (r.Items || []).filter((m) => m.DangSuDung === true || (editing && String(m.IdMuc) === String(item.IdMuc))), loading: false, error: "" });
    }).catch((e) => { if (!controller.signal.aborted) setCatalog({ items: [], loading: false, error: e.message }); });
    return () => controller.abort();
  }, [editing, item, catalogRetry]);
  useEffect(() => {
    const controller = new AbortController();
    setPeople([]); setSearchError("");
    if ((!keyword.trim() && !donVi) || quyen?.DuocNhap !== true) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await layVienChucKhenThuong({ tuKhoa: keyword.trim(), idDonVi: donVi }, controller.signal);
        if (!controller.signal.aborted) setPeople(result.Items || []);
      } catch (e) { if (!controller.signal.aborted) setSearchError(e.message); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [keyword, donVi, quyen, searchRetry]);
  const pick = (person) => {
    if (editing) setSelected([person]);
    else setSelected((prev) => prev.some((p) => String(p.IdNhanVien) === String(person.IdNhanVien)) ? prev : [...prev, person]);
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy || !canSave) return;
    if (!form.IdNam || !catalog.items.some((m) => String(m.IdMuc) === String(form.IdMuc)) || catalog.loading || catalog.error || selected.length < 1 || selected.length > 500) {
      setError("Chọn năm, mức khen thưởng và từ 1 đến 500 viên chức."); return;
    }
    if (!form.NoiDung.trim()) { setError("Nhập nội dung khen thưởng."); return; }
    if ((!legacy && (!form.SoQuyetDinh.trim() || !form.NgayQuyetDinh)) ||
      (legacy && String(form.IdNam) !== String(item.IdNam) && !form.NgayQuyetDinh)) {
      setError("Số và ngày quyết định bắt buộc khi nhập mới; đổi năm bản sao cũ phải có ngày quyết định."); return;
    }
    if (form.NgayQuyetDinh && Number(form.NgayQuyetDinh.slice(0, 4)) !== Number(form.IdNam)) {
      setError("Ngày quyết định phải thuộc năm ghi nhận."); return;
    }
    const body = {
      IdNam: Number(form.IdNam), IdMuc: Number(form.IdMuc), NoiDung: form.NoiDung.trim(),
      SoQuyetDinh: form.SoQuyetDinh.trim() || null, NgayQuyetDinh: form.NgayQuyetDinh || null,
      Quy: form.Quy === "" ? null : Number(form.Quy), CoQuanKhen: form.CoQuanKhen.trim() || null, GhiChu: form.GhiChu.trim() || null,
      ...(editing ? { IdNhanVien: Number(selected[0].IdNhanVien) } : { IdNhanViens: selected.map((p) => Number(p.IdNhanVien)) }),
    };
    setBusy(true); setError("");
    try {
      const result = editing ? await suaKhenThuongDotXuat(item.IdKhenThuong, body) : await themKhenThuongDotXuat(body);
      onSaved(result, editing && result.CoThayDoi === false ? "Không có thay đổi nào được ghi nhận." : result.Message);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const muc = catalog.items.find((m) => String(m.IdMuc) === String(form.IdMuc));
  const footer = <><button type="button" className="btn-cancel" onClick={onClose} disabled={busy}>Hủy</button>
    <button className="btn-submit" type="submit" form="khenThuongForm" disabled={busy || !canSave || catalog.loading || !!catalog.error}>{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Ghi nhận"}</button></>;
  return <Dialog draggable={false} visible header={editing ? "Sửa khen thưởng đột xuất" : "Thêm khen thưởng đột xuất"} onHide={onClose} maskClassName="ktdx-dialog-mask"
    className="ktdx-dialog" style={{ width: "780px" }} breakpoints={{ "820px": "95vw" }} modal closable={!busy} closeOnEscape={!busy} footer={footer}
    pt={{ header: { className: "modal-header" }, content: { className: "modal-body" }, footer: { className: "modal-footer" } }}>
    <form id="khenThuongForm" onSubmit={save} className="ktdx ktdx-entry-form">
      {error && <p className="ktdx-error" role="alert">{error}</p>}
      <p className="ktdx-muted">{HUONG_DAN_DIEM}</p>
      {legacy && <p className="ktdx-warning">Bản sao đã chốt được giữ thông tin quyết định còn thiếu. Thay đổi ở đây chỉ cập nhật nguồn khen thưởng, không sửa dòng kê khai gốc.</p>}
      <fieldset disabled={busy || !canSave}>
        <div className="form-grid-2">
          <div className="form-group"><label>Năm ghi nhận *</label><SearchSelect ariaLabel="Năm ghi nhận" value={form.IdNam} disabled={busy} onChange={(v) => change("IdNam", v)} options={namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))} /></div>
          <div className="form-group"><label>Quý</label><SearchSelect ariaLabel="Quý ghi nhận" value={form.Quy} disabled={busy} onChange={(v) => change("Quy", v)} options={[{ value: "", label: "Theo ngày quyết định" }, ...[1, 2, 3, 4].map((q) => ({ value: q, label: `Quý ${q}` }))]} /></div>
          <div className="form-group ktdx-full"><label>Mức khen thưởng *</label><SearchSelect ariaLabel="Mức khen thưởng" value={form.IdMuc} searchable disabled={busy || catalog.loading || !!catalog.error}
            onChange={(v) => change("IdMuc", v)} placeholder={catalog.loading ? "Đang tải mức..." : "Chọn mức khen thưởng"}
            options={catalog.items.map((m) => ({ value: m.IdMuc, label: `${m.TenMuc} (${formatDiem(m.DiemQuyDoi)} điểm)${m.DangSuDung === false ? " - Đã ngừng dùng" : ""}` }))} />
            {muc && <small>Điểm theo danh mục: {formatDiem(muc.DiemQuyDoi)}. Hệ thống khử trùng nội dung trong cả năm và áp dụng trần tiêu chí.</small>}
            {catalog.error && <p role="alert" className="ktdx-error">{catalog.error} <button type="button" onClick={() => setCatalogRetry((v) => v + 1)}>Tải lại mức</button></p>}
          </div>
          <div className="form-group ktdx-full"><label htmlFor="ktdx-noi-dung">Nội dung *</label><textarea id="ktdx-noi-dung" className="form-input" required maxLength={500} value={form.NoiDung} onChange={(e) => change("NoiDung", e.target.value)} rows={3} /><small>Dùng thống nhất tên nội dung khi ghi nhận ở các cấp khác nhau.</small></div>
          <label className="form-group">Số quyết định{!legacy && " *"}<input className="form-input" required={!legacy} maxLength={100} value={form.SoQuyetDinh} onChange={(e) => change("SoQuyetDinh", e.target.value)} /></label>
          <label className="form-group">Ngày quyết định{!legacy && " *"}<input className="form-input" type="date" required={!legacy || String(form.IdNam) !== String(item?.IdNam)} value={form.NgayQuyetDinh} onChange={(e) => change("NgayQuyetDinh", e.target.value)} /></label>
          <label className="form-group ktdx-full">Cơ quan khen<input className="form-input" maxLength={255} value={form.CoQuanKhen} onChange={(e) => change("CoQuanKhen", e.target.value)} /></label>
          <label className="form-group ktdx-full">Ghi chú<textarea className="form-input" maxLength={1000} value={form.GhiChu} onChange={(e) => change("GhiChu", e.target.value)} rows={2} /></label>
        </div>
        <div className="ktdx-picker">
          <h4>Viên chức được ghi nhận</h4>
          {!editing && <p className="ktdx-muted">Chọn từ 1 đến 500 viên chức cho cùng quyết định.</p>}
          <div className="ktdx-chips">{selected.map((p) => <span key={p.IdNhanVien}>{p.HoTen} · {p.MaNhanVien}<button type="button" aria-label={`Bỏ ${p.HoTen}`} onClick={() => setSelected((prev) => prev.filter((s) => String(s.IdNhanVien) !== String(p.IdNhanVien)))}>×</button></span>)}</div>
          <div className="form-grid-2">
            <label className="form-group">Tìm viên chức<input className="form-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Họ tên hoặc mã viên chức" /></label>
            <div className="form-group"><label>Đơn vị viên chức</label><SearchSelect ariaLabel="Đơn vị viên chức" value={donVi} onChange={setDonVi} disabled={busy} searchable options={[{ value: "", label: "Tất cả đơn vị" }, ...donViList.map((d) => ({ value: d.IdDonVi, label: d.TenDonVi }))]} /></div>
          </div>
          <p className="ktdx-muted">{searching ? "Đang tìm viên chức..." : !keyword.trim() && !donVi ? "Nhập từ khóa hoặc chọn đơn vị để tìm viên chức." : people.length === 0 ? "Không tìm thấy viên chức." : "Chọn viên chức trong kết quả bên dưới."}</p>
          {searchError && <p role="alert" className="ktdx-error">{searchError} <button type="button" onClick={() => setSearchRetry((v) => v + 1)}>Tìm lại</button></p>}
          <div className="ktdx-picker-results">{people.map((p) => <button type="button" key={p.IdNhanVien} onClick={() => pick(p)} disabled={selected.some((s) => String(s.IdNhanVien) === String(p.IdNhanVien)) || (!editing && selected.length >= 500)}><strong>{p.HoTen}</strong><span>{p.MaNhanVien} · {p.TenDonVi || "-"}</span></button>)}</div>
        </div>
      </fieldset>
    </form>
  </Dialog>;
}
