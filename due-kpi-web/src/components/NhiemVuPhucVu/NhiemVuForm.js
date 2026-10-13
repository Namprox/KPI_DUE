import React, { useState } from "react";
import SearchSelect from "../Common/SearchSelect";
import { ngayInput, gioInput } from "../../utils/nhiemVuPhucVuApi";

export default function NhiemVuForm({ item, config, namList, idNam, idDonVi, busy, onSave, onCancel }) {
  const editing = !!item;
  const sources = [
    ...(config?.Khoa?.some((k) => k.LaTruongKhoa === true) ? [1] : []),
    ...(config?.LaBanGiamHieu === true ? [2] : []),
  ];
  const [form, setForm] = useState(() => ({
    IdNam: item?.IdNam ?? idNam, IdDonVi: item?.IdDonVi ?? idDonVi ?? "",
    IdNhomNv: item?.IdNhomNv ?? "", Nguon: item?.Nguon ?? sources[0] ?? "",
    TenNhiemVu: item?.TenNhiemVu ?? "", MoTa: item?.MoTa ?? "",
    TuNgay: ngayInput(item?.TuNgay), DenNgay: ngayInput(item?.DenNgay),
    HanDangKy: gioInput(item?.HanDangKy), SoLuongToiDa: item?.SoLuongToiDa ?? 1,
  }));
  const [error, setError] = useState("");
  const content = !editing || item.ChoPhepSuaNoiDung === true;
  const deadline = editing ? item.ChoPhepSuaHanDangKy === true : Number(form.Nguon) === 1;
  const khoas = (config?.Khoa || []).filter((k) => editing || Number(form.Nguon) === 2 || k.LaTruongKhoa === true);
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const save = (event) => {
    event.preventDefault(); setError("");
    if (form.DenNgay < form.TuNgay) { setError("Ngày kết thúc phải từ ngày bắt đầu trở đi."); return; }
    if (deadline && form.HanDangKy && form.HanDangKy >= `${form.TuNgay}T00:00:00`) { setError("Hạn đăng ký phải trước 00:00 ngày bắt đầu."); return; }
    if (!editing && !khoas.some((k) => String(k.IdDonVi) === String(form.IdDonVi))) { setError("Chọn Khoa được phép giao nhiệm vụ."); return; }
    if (Number(form.SoLuongToiDa) < Number(item?.SoThanhVien || 0)) { setError("Số lượng tối đa không được nhỏ hơn số thành viên hiện tại."); return; }
    const body = { ...form, IdNam: Number(form.IdNam), IdDonVi: Number(form.IdDonVi), IdNhomNv: Number(form.IdNhomNv),
      Nguon: Number(form.Nguon), SoLuongToiDa: Number(form.SoLuongToiDa), HanDangKy: form.HanDangKy || null };
    if (editing) {
      // Preserve original values verbatim for fields the server forbids editing.
      if (!content) ["IdNam", "IdNhomNv", "TenNhiemVu", "MoTa", "TuNgay", "DenNgay", "SoLuongToiDa"].forEach((key) => { body[key] = item[key] ?? null; });
      if (!deadline) body.HanDangKy = item.HanDangKy ?? null;
      body.IdDonVi = item.IdDonVi; body.Nguon = item.Nguon; body.RowVersion = item.RowVersion;
    } else if (body.Nguon === 2) body.HanDangKy = null;
    onSave(body);
  };
  return <form className="nvpv-form" onSubmit={save}>
    {error && <p role="alert" className="nvpv-error">{error}</p>}
    <fieldset disabled={busy}>
      <div className="nvpv-grid">
        <label>Nguồn nhiệm vụ<SearchSelect ariaLabel="Nguồn nhiệm vụ" portal value={form.Nguon} disabled={busy || editing} required
          onChange={(value) => setForm((f) => ({ ...f, Nguon: value, IdDonVi: "", HanDangKy: "" }))}
          options={(editing ? [Number(item.Nguon)] : sources).map((n) => ({ value: n, label: n === 1 ? "Nhiệm vụ Khoa" : "Nhiệm vụ Trường giao" }))} /></label>
        <label>Khoa thực hiện<SearchSelect ariaLabel="Khoa thực hiện" portal searchable value={form.IdDonVi} disabled={busy || editing} required placeholder="Chọn Khoa"
          onChange={(value) => change("IdDonVi", value)} options={khoas.map((k) => ({ value: k.IdDonVi, label: k.TenDonVi }))} /></label>
        <label>Năm đánh giá<SearchSelect ariaLabel="Năm đánh giá" portal value={form.IdNam} disabled={busy || !content} required placeholder="Chọn năm"
          onChange={(value) => change("IdNam", value)} options={[
            ...namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) })),
            ...(!namList.some((n) => String(n.IdNam) === String(form.IdNam)) && form.IdNam ? [{ value: form.IdNam, label: String(form.IdNam) }] : []),
          ]} /></label>
        <label>Nhóm nhiệm vụ<SearchSelect ariaLabel="Nhóm nhiệm vụ" portal searchable value={form.IdNhomNv} disabled={busy || !content} required placeholder="Chọn nhóm"
          onChange={(value) => change("IdNhomNv", value)} options={(config?.Nhom || []).map((n) => ({ value: n.IdNhomNv, label: n.TenNhom }))} /></label>
        <label className="nvpv-wide">Tên nhiệm vụ<input required maxLength={500} value={form.TenNhiemVu} disabled={!content} onChange={(e) => change("TenNhiemVu", e.target.value)} /></label>
        <label className="nvpv-wide">Mô tả<textarea maxLength={2000} rows={3} value={form.MoTa} disabled={!content} onChange={(e) => change("MoTa", e.target.value)} /></label>
        <label>Ngày bắt đầu<input type="date" required value={form.TuNgay} disabled={!content} onChange={(e) => change("TuNgay", e.target.value)} /></label>
        <label>Ngày kết thúc<input type="date" required min={form.TuNgay} value={form.DenNgay} disabled={!content} onChange={(e) => change("DenNgay", e.target.value)} /></label>
        <label>Số lượng tối đa<input type="number" min={Math.max(1, item?.SoThanhVien || 0)} max={500} step="1" required value={form.SoLuongToiDa} disabled={!content} onChange={(e) => change("SoLuongToiDa", e.target.value)} /></label>
        <label>Hạn đăng ký (giờ Việt Nam)<input type="datetime-local" step="1" value={form.HanDangKy} disabled={!deadline} onChange={(e) => change("HanDangKy", e.target.value)} /></label>
      </div>
      <p className="nvpv-muted">Để trống hạn đăng ký nếu chỉ phân công trực tiếp. Với nhiệm vụ Trường giao, Trưởng khoa đặt hạn khi triển khai. Năm đánh giá phải chứa ngày kết thúc.</p>
      <div className="nvpv-actions"><button type="submit" className="btn-submit">{busy ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo bản nháp"}</button><button type="button" onClick={onCancel}>Đóng biểu mẫu</button></div>
    </fieldset>
  </form>;
}
