import React, { useEffect, useState } from "react";
import SearchSelect from "../Common/SearchSelect";
import { layGiangVien, loiPhanCong, thanhVienHienTai } from "../../utils/nhiemVuPhucVuApi";

export default function PhanCongForm({ item, config, busy, onSave, onCancel }) {
  const [rows, setRows] = useState(() => thanhVienHienTai(item));
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const canAssign = item.ChoPhepPhanCong === true;
  const canRole = item.ChoPhepDoiVaiTro === true;
  useEffect(() => {
    if (!canAssign) return;
    let cancelled = false;
    setLoading(true); setTeachers([]);
    const timer = setTimeout(() => {
      layGiangVien({ idDonVi: item.IdDonVi, idNam: item.IdNam, tuKhoa: search.trim() })
        .then((r) => { if (!cancelled) { setTeachers(r); setError(""); } })
        .catch((e) => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [item.IdDonVi, item.IdNam, search, canAssign, retry]);
  const save = (e) => {
    e.preventDefault(); const message = loiPhanCong(rows, item.SoLuongToiDa);
    if (message) { setError(message); return; }
    onSave({ ThanhVien: rows.map((v) => ({ IdNhanVien: v.IdNhanVien, MaVaiTro: v.MaVaiTro })) });
  };
  return <form className="nvpv-form" onSubmit={save}>
    <h3>Phân công và vai trò</h3>
    {error && <p role="alert" className="nvpv-error">{error} <button type="button" onClick={() => setRetry((v) => v + 1)}>Tải lại giảng viên</button></p>}
    <p>Danh sách lưu gồm toàn bộ thành viên cần giữ, kể cả người tự đăng ký. Bỏ khỏi danh sách đồng nghĩa gỡ thành viên.</p>
    {!canAssign && <p className="nvpv-notice">Đã khóa thêm/gỡ thành viên. Chỉ được đổi vai trò theo quyền hiện tại.</p>}
    <fieldset disabled={busy}>
      {canAssign && <><label>Tìm giảng viên<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Họ tên hoặc mã nhân viên" /></label>
        {loading ? <p role="status">Đang tải giảng viên...</p> : <label>Thêm thành viên<SearchSelect ariaLabel="Thêm thành viên" portal className="select-multiline" value="" onChange={(value) => {
          const teacher = teachers.find((v) => String(v.IdNhanVien) === String(value));
          if (teacher) setRows((old) => [...old, { ...teacher, MaVaiTro: "PH" }]);
        }} disabled={busy || rows.length >= Number(item.SoLuongToiDa)} placeholder={`Chọn giảng viên · ${rows.length}/${item.SoLuongToiDa} suất`}
          options={teachers.filter((v) => !rows.some((r) => String(r.IdNhanVien) === String(v.IdNhanVien))).map((v) => ({ value: v.IdNhanVien, label: `${v.HoTen} · ${v.MaNhanVien} · Đang tham gia: ${v.SoDangThamGia ?? 0} · Điểm thực tế: ${v.TongDiemThucTe ?? 0}` }))} /></label>}</>}
      <div className="table-scroll"><table className="custom-table"><thead><tr><th>Thành viên</th><th>Nguồn</th><th>Vai trò</th><th /></tr></thead><tbody>
        {rows.map((v, index) => <tr key={v.IdNhanVien}><td>{v.HoTen}<small>{v.MaNhanVien}</small></td><td>{v.TenNguonThamGia || "Phân công mới"}</td><td><SearchSelect ariaLabel={`Vai trò ${v.HoTen}`} portal value={v.MaVaiTro} disabled={busy || !canRole}
          onChange={(value) => setRows((old) => old.map((r, i) => i === index ? { ...r, MaVaiTro: value } : r))}
          options={(config?.VaiTro || []).map((r) => ({ value: r.MaVaiTro, label: `${r.TenVaiTro} · ${r.DiemQuyDoi} điểm dự kiến` }))} /></td><td>{canAssign && <button type="button" onClick={() => setRows((old) => old.filter((r) => r.IdNhanVien !== v.IdNhanVien))}>Gỡ {v.HoTen}</button>}</td></tr>)}
      </tbody></table></div>
      {rows.filter((r) => r.MaVaiTro === "CT").length !== 1 && <p className="nvpv-warning">Cần đúng một Chủ trì trước khi gửi báo cáo. Hãy phân công Chủ trì sớm.</p>}
      <div className="nvpv-actions"><button className="btn-submit" type="submit">Lưu toàn bộ phân công</button><button type="button" onClick={onCancel}>Đóng biểu mẫu</button></div>
    </fieldset>
  </form>;
}
