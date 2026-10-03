import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../Common/SearchSelect";
import { layGiangVienDaoTao, themHoatDongDaoTao, suaHoatDongDaoTao } from "../../utils/hoatDongDaoTaoApi";

export default function HoatDongDaoTaoForm({ item, idNam, namList, loaiList, khoaList, onClose, onSaved }) {
  const editing = !!item?.IdHoatDong;
  const [form, setForm] = useState({
    IdNam: item?.IdNam ?? idNam, IdLoai: item?.IdLoai ?? "", NoiDung: item?.NoiDung ?? "",
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
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const type = loaiList.find((l) => String(l.IdLoai) === String(form.IdLoai));
  useEffect(() => {
    const controller = new AbortController();
    setTeachers([]); setSearchError("");
    if (!keyword.trim() && !khoa) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const result = await layGiangVienDaoTao({ tuKhoa: keyword.trim(), idDonVi: khoa }, controller.signal);
        if (!controller.signal.aborted) setTeachers(result.Items || []);
      } catch (e) {
        if (!controller.signal.aborted) setSearchError(e.message);
      } finally { if (!controller.signal.aborted) setSearching(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [keyword, khoa]);
  const pick = (teacher) => {
    if (editing) setSelected([teacher]);
    else setSelected((prev) => prev.some((p) => p.IdNhanVien === teacher.IdNhanVien) ? prev : [...prev, teacher]);
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.IdNam || !form.IdLoai || !form.NoiDung.trim() || selected.length < 1 || selected.length > 500) {
      setError("Chọn năm, loại hoạt động, nhập nội dung và chọn từ 1 đến 500 giảng viên."); return;
    }
    setBusy(true); setError("");
    const body = {
      IdNam: Number(form.IdNam), IdLoai: Number(form.IdLoai), NoiDung: form.NoiDung.trim(),
      SoQuyetDinh: form.SoQuyetDinh.trim() || null, NgayQuyetDinh: form.NgayQuyetDinh || null, GhiChu: form.GhiChu.trim() || null,
      ...(editing ? { IdNhanVien: selected[0].IdNhanVien } : { IdNhanViens: selected.map((p) => p.IdNhanVien) }),
    };
    try {
      const result = editing ? await suaHoatDongDaoTao(item.IdHoatDong, body) : await themHoatDongDaoTao(body);
      onSaved(result, editing && result.CoThayDoi === false ? "Không có thay đổi nào được ghi nhận." : result.Message);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const footer = <>
    <button type="button" className="btn-cancel" onClick={onClose} disabled={busy}><i className="fa-solid fa-times" aria-hidden="true" /> Hủy</button>
    <button className="btn-submit" type="submit" form="hoatDongDaoTaoForm" disabled={busy}>
      <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} aria-hidden="true" />
      {busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Ghi nhận"}
    </button>
  </>;
  return <Dialog visible header={editing ? "Sửa hoạt động đào tạo" : "Thêm hoạt động đào tạo"} onHide={onClose} maskClassName="hddt-dialog-mask"
    className="hddt-dialog" style={{ width: "780px" }} breakpoints={{ "820px": "95vw" }} modal closable={!busy} closeOnEscape={!busy}
    closeIcon={<span aria-hidden="true">×</span>} footer={footer}
    pt={{ header: { className: "modal-header" }, content: { className: "modal-body" }, footer: { className: "modal-footer" } }}>
    <form id="hoatDongDaoTaoForm" onSubmit={save} className="hddt hddt-entry-form">
      {error && <p className="hddt-error" role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <div className="form-grid-2">
          <div className="form-grid-2 hddt-entry-type-row hddt-full">
            <div className="form-group"><label>Năm đánh giá <span className="text-red">*</span></label><SearchSelect ariaLabel="Năm ghi nhận" value={form.IdNam} disabled={busy}
              onChange={(v) => change("IdNam", v)} options={namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))} /></div>
            <div className="form-group"><label>Loại hoạt động <span className="text-red">*</span></label><SearchSelect ariaLabel="Loại ghi nhận" value={form.IdLoai} disabled={busy}
              onChange={(v) => change("IdLoai", v)} options={loaiList.map((l) => ({ value: l.IdLoai, label: l.TenLoai }))} /></div>
          </div>
          <div className="form-group hddt-full"><label htmlFor="hddt-noi-dung">{type?.NhanNoiDung || "Nội dung"} <span className="text-red">*</span></label><textarea id="hddt-noi-dung" className="form-input" required maxLength={500} value={form.NoiDung} onChange={(e) => change("NoiDung", e.target.value)} rows={3} /></div>
          <div className="form-group"><label htmlFor="hddt-so-quyet-dinh">Số quyết định</label><input id="hddt-so-quyet-dinh" className="form-input" maxLength={100} value={form.SoQuyetDinh} onChange={(e) => change("SoQuyetDinh", e.target.value)} /></div>
          <div className="form-group"><label htmlFor="hddt-ngay-quyet-dinh">Ngày quyết định</label><input id="hddt-ngay-quyet-dinh" className="form-input" type="date" value={form.NgayQuyetDinh} onChange={(e) => change("NgayQuyetDinh", e.target.value)} /></div>
          <div className="form-group hddt-full"><label htmlFor="hddt-ghi-chu">Ghi chú</label><textarea id="hddt-ghi-chu" className="form-input" maxLength={1000} value={form.GhiChu} onChange={(e) => change("GhiChu", e.target.value)} rows={2} /></div>
        </div>
        <div className="hddt-picker">
          <h4>{editing ? "Giảng viên được ghi nhận" : `Giảng viên được ghi nhận (${selected.length}/500)`}</h4>
          <div className="hddt-chips">{selected.map((p) => <span key={p.IdNhanVien}>{p.HoTen} · {p.MaNhanVien}
            <button type="button" aria-label={`Bỏ ${p.HoTen}`} onClick={() => setSelected((prev) => prev.filter((s) => s.IdNhanVien !== p.IdNhanVien))}>×</button></span>)}</div>
          <div className="form-grid-2">
            <div className="form-group"><label htmlFor="hddt-tim-giang-vien">Tìm giảng viên</label><input id="hddt-tim-giang-vien" className="form-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Nhập họ tên hoặc mã nhân viên" /></div>
            <div className="form-group"><label>Khoa của giảng viên</label><SearchSelect ariaLabel="Khoa của giảng viên" value={khoa} onChange={setKhoa} disabled={busy} searchable
              options={[{ value: "", label: "Tất cả Khoa" }, ...khoaList.map((k) => ({ value: k.IdDonVi, label: k.TenDonVi }))]} /></div>
          </div>
          <p className="hddt-muted">{searching ? "Đang tìm giảng viên..." : !keyword.trim() && !khoa ? "Nhập từ khóa hoặc chọn Khoa để tìm giảng viên đang công tác." : teachers.length === 0 ? "Không tìm thấy giảng viên." : "Chọn giảng viên trong kết quả bên dưới."}</p>
          {searchError && <p role="alert" className="hddt-error">{searchError}</p>}
          <div className="hddt-picker-results">{teachers.map((p) => <button type="button" key={p.IdNhanVien} onClick={() => pick(p)}
            disabled={selected.some((s) => s.IdNhanVien === p.IdNhanVien) || (!editing && selected.length >= 500)}>
            <strong>{p.HoTen}</strong><span>{p.MaNhanVien} · {p.TenKhoa || "—"}</span></button>)}</div>
        </div>
      </fieldset>
    </form>
  </Dialog>;
}
