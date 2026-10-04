import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../Common/SearchSelect";
import { layGiangVienDoiNgu, layHangMucDoiNgu, themPhatTrienDoiNgu, suaPhatTrienDoiNgu } from "../../utils/phatTrienDoiNguApi";

export default function PhatTrienDoiNguForm({ item, idNam, namList, loaiList, khoaList, onClose, onSaved }) {
  const editing = !!item?.IdBanGhi;
  const [form, setForm] = useState({
    IdNam: item?.IdNam ?? idNam, IdLoai: item?.IdLoai ?? "", IdHangMuc: item?.IdHangMuc ?? "", NoiDung: item?.NoiDung ?? "",
    SoQuyetDinh: item?.SoQuyetDinh ?? "", NgayQuyetDinh: item?.NgayQuyetDinh?.slice(0, 10) ?? "", GhiChu: item?.GhiChu ?? "",
  });
  const [selected, setSelected] = useState(item ? [item] : []);
  const [keyword, setKeyword] = useState("");
  const [khoa, setKhoa] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState({ items: [], loading: false, error: "" });
  const [catalogRetry, setCatalogRetry] = useState(0);
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const type = loaiList.find((l) => String(l.IdLoai) === String(form.IdLoai));
  useEffect(() => {
    const controller = new AbortController();
    if (!form.IdLoai) { setCatalog({ items: [], loading: false, error: "" }); return; }
    setCatalog({ items: [], loading: true, error: "" });
    layHangMucDoiNgu({ idLoai: form.IdLoai }, controller.signal).then((r) => {
      if (controller.signal.aborted) return;
      const items = [...(r.Items || [])];
      // Keep the original category selectable even after it has been retired.
      if (editing && String(item.IdLoai) === String(form.IdLoai) && !items.some((h) => String(h.IdHangMuc) === String(item.IdHangMuc))) {
        items.push({ ...item, DangSuDung: false });
      }
      setCatalog({ items, loading: false, error: "" });
    }).catch((e) => { if (!controller.signal.aborted) setCatalog({ items: [], loading: false, error: e.message }); });
    return () => controller.abort();
  }, [form.IdLoai, editing, item, catalogRetry]);
  useEffect(() => {
    const controller = new AbortController();
    setTeachers([]); setSearchError("");
    if (!keyword.trim() && !khoa) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await layGiangVienDoiNgu({ tuKhoa: keyword.trim(), idDonVi: khoa }, controller.signal);
        if (!controller.signal.aborted) setTeachers(result.Items || []);
      } catch (e) {
        if (!controller.signal.aborted) setSearchError(e.message);
      } finally { if (!controller.signal.aborted) setSearching(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [keyword, khoa]);
  const pick = (teacher) => {
    if (editing) setSelected([teacher]);
    else setSelected((prev) => prev.some((p) => String(p.IdNhanVien) === String(teacher.IdNhanVien)) ? prev : [...prev, teacher]);
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.IdNam || !form.IdHangMuc || catalog.loading || catalog.error || !catalog.items.some((h) => String(h.IdHangMuc) === String(form.IdHangMuc)) || selected.length < 1 || selected.length > 500) {
      setError("Chọn năm, hạng mục và từ 1 đến 500 giảng viên."); return;
    }
    setBusy(true); setError("");
    const body = {
      IdNam: Number(form.IdNam), IdHangMuc: Number(form.IdHangMuc), NoiDung: form.NoiDung.trim() || null,
      SoQuyetDinh: form.SoQuyetDinh.trim() || null, NgayQuyetDinh: form.NgayQuyetDinh || null, GhiChu: form.GhiChu.trim() || null,
      ...(editing ? { IdNhanVien: Number(selected[0].IdNhanVien) } : { IdNhanViens: selected.map((p) => Number(p.IdNhanVien)) }),
    };
    try {
      const result = editing ? await suaPhatTrienDoiNgu(item.IdBanGhi, body) : await themPhatTrienDoiNgu(body);
      onSaved(result, editing && result.CoThayDoi === false ? "Không có thay đổi nào được ghi nhận." : result.Message);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const footer = <>
    <button type="button" className="btn-cancel" onClick={onClose} disabled={busy}><i className="fa-solid fa-times" aria-hidden="true" /> Hủy</button>
    <button className="btn-submit" type="submit" form="phatTrienDoiNguForm" disabled={busy || catalog.loading || !!catalog.error}>
      <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} aria-hidden="true" />
      {busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Ghi nhận"}
    </button>
  </>;
  return <Dialog visible header={editing ? "Sửa ghi nhận phát triển đội ngũ" : "Thêm ghi nhận phát triển đội ngũ"} onHide={onClose} maskClassName="ptdn-dialog-mask"
    className="ptdn-dialog" style={{ width: "780px" }} breakpoints={{ "820px": "95vw" }} modal closable={!busy} closeOnEscape={!busy}
    closeIcon={<span aria-hidden="true">×</span>} footer={footer}
    pt={{ header: { className: "modal-header" }, content: { className: "modal-body" }, footer: { className: "modal-footer" } }}>
    <form id="phatTrienDoiNguForm" onSubmit={save} className="ptdn ptdn-entry-form">
      {error && <p className="ptdn-error" role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <div className="form-grid-2">
          <div className="form-grid-2 ptdn-entry-type-row ptdn-full">
            <div className="form-group"><label>Năm đánh giá <span className="text-red">*</span></label><SearchSelect ariaLabel="Năm ghi nhận" value={form.IdNam} disabled={busy}
              onChange={(v) => change("IdNam", v)} options={namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))} /></div>
            <div className="form-group"><label>Loại ghi nhận <span className="text-red">*</span></label><SearchSelect ariaLabel="Loại ghi nhận" value={form.IdLoai} disabled={busy}
              onChange={(v) => setForm((p) => ({ ...p, IdLoai: v, IdHangMuc: "" }))} options={loaiList.map((l) => ({ value: l.IdLoai, label: l.TenLoai }))} /></div>
          </div>
          <div className="form-group ptdn-full"><label>Hạng mục <span className="text-red">*</span></label>
            <SearchSelect ariaLabel="Hạng mục ghi nhận" value={form.IdHangMuc} required searchable disabled={busy || !form.IdLoai || catalog.loading || !!catalog.error}
              onChange={(v) => change("IdHangMuc", v)} placeholder={catalog.loading ? "Đang tải hạng mục..." : "Chọn hạng mục"}
              options={catalog.items.map((h) => ({ value: h.IdHangMuc, label: `${h.TenHangMuc}${h.DangSuDung === false ? " (Đã ngừng dùng)" : ""}` }))} />
            {catalog.error && <p role="alert" className="ptdn-error">{catalog.error} <button type="button" onClick={() => setCatalogRetry((v) => v + 1)}>Tải lại hạng mục</button></p>}
          </div>
          <div className="form-group ptdn-full"><label htmlFor="ptdn-noi-dung">{type?.NhanNoiDung || "Chi tiết"} (tuỳ chọn)</label><textarea id="ptdn-noi-dung" className="form-input" maxLength={500} value={form.NoiDung} onChange={(e) => change("NoiDung", e.target.value)} rows={3} /></div>
          <div className="form-group"><label htmlFor="ptdn-so-quyet-dinh">Số quyết định</label><input id="ptdn-so-quyet-dinh" className="form-input" maxLength={100} value={form.SoQuyetDinh} onChange={(e) => change("SoQuyetDinh", e.target.value)} /></div>
          <div className="form-group"><label htmlFor="ptdn-ngay-quyet-dinh">Ngày quyết định</label><input id="ptdn-ngay-quyet-dinh" className="form-input" type="date" value={form.NgayQuyetDinh} onChange={(e) => change("NgayQuyetDinh", e.target.value)} /></div>
          <div className="form-group ptdn-full"><label htmlFor="ptdn-ghi-chu">Ghi chú</label><textarea id="ptdn-ghi-chu" className="form-input" maxLength={1000} value={form.GhiChu} onChange={(e) => change("GhiChu", e.target.value)} rows={2} /></div>
        </div>
        <div className="ptdn-picker">
          <h4>Giảng viên được ghi nhận</h4>
          {!editing && <p className="ptdn-muted">Chọn tối đa 500 giảng viên cho cùng hạng mục. Nếu có người không hợp lệ hoặc trùng bản ghi, toàn bộ lượt ghi nhận sẽ không được lưu.</p>}
          <div className="ptdn-chips">{selected.map((p) => <span key={p.IdNhanVien}>{p.HoTen} · {p.MaNhanVien}
            <button type="button" aria-label={`Bỏ ${p.HoTen}`} onClick={() => setSelected((prev) => prev.filter((s) => String(s.IdNhanVien) !== String(p.IdNhanVien)))}>×</button></span>)}</div>
          <div className="form-grid-2">
            <div className="form-group"><label htmlFor="ptdn-tim-giang-vien">Tìm giảng viên</label><input id="ptdn-tim-giang-vien" className="form-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Nhập họ tên hoặc mã giảng viên" /></div>
            <div className="form-group"><label>Khoa của giảng viên</label><SearchSelect ariaLabel="Khoa của giảng viên" value={khoa} onChange={setKhoa} disabled={busy} searchable
              options={[{ value: "", label: "Tất cả Khoa" }, ...khoaList.map((k) => ({ value: k.IdDonVi, label: k.TenDonVi }))]} /></div>
          </div>
          <p className="ptdn-muted">{searching ? "Đang tìm giảng viên..." : !keyword.trim() && !khoa ? "Nhập từ khóa hoặc chọn Khoa để tìm giảng viên đang công tác." : teachers.length === 0 ? "Không tìm thấy giảng viên." : "Chọn giảng viên trong kết quả bên dưới."}</p>
          {searchError && <p role="alert" className="ptdn-error">{searchError}</p>}
          <div className="ptdn-picker-results">{teachers.map((p) => <button type="button" key={p.IdNhanVien} onClick={() => pick(p)}
            disabled={selected.some((s) => String(s.IdNhanVien) === String(p.IdNhanVien)) || (!editing && selected.length >= 500)}>
            <strong>{p.HoTen}</strong><span>{p.MaNhanVien} · {p.TenKhoa || "—"}</span></button>)}</div>
        </div>
      </fieldset>
    </form>
  </Dialog>;
}
