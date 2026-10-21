import React, { useState } from "react";
import SearchSelect from "../Common/SearchSelect";
import { thanhVienHienTai } from "../../utils/nhiemVuPhucVuApi";

export default function ChotForm({ item, busy, onSave, onCancel }) {
  const [rows, setRows] = useState(() => thanhVienHienTai(item).map((v) => ({ ...v, choice: "", LyDo: "" })));
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const change = (index, patch) => setRows((old) => old.map((v, i) => i === index ? { ...v, ...patch } : v));
  const submit = (e) => {
    e.preventDefault();
    if (!rows.length || rows.some((r) => !r.choice || (r.choice === "no" && !r.LyDo.trim())) || !confirmed) {
      setError("Đánh giá đủ tất cả thành viên, nhập lý do không hoàn thành và xác nhận chốt."); return;
    }
    onSave({ KetQua: rows.map((v) => ({ IdNhanVien: v.IdNhanVien, HoanThanh: v.choice === "yes", ...(v.choice === "no" ? { LyDo: v.LyDo.trim() } : {}) })) });
  };
  return <form className="nvpv-form" onSubmit={submit}>
    <h3>Chốt kết quả từng thành viên</h3>
    <p className="nvpv-warning">Chốt rồi không thể sửa, hủy hoặc mở lại. Không hoàn thành = 0 điểm. Điểm hiển thị dưới đây là dự kiến.</p>
    {error && <p role="alert" className="nvpv-error">{error}</p>}
    <fieldset disabled={busy}><div className="table-scroll"><table className="custom-table"><thead><tr><th>Thành viên</th><th>Vai trò / Điểm dự kiến</th><th>Kết quả</th><th>Lý do không hoàn thành</th></tr></thead><tbody>
      {rows.map((v, i) => <tr key={v.IdNhanVien}><td>{v.HoTen}</td><td>{v.TenVaiTro} · {v.DiemVaiTro ?? "-"}</td><td><SearchSelect required ariaLabel={`Kết quả ${v.HoTen}`} portal disabled={busy} value={v.choice} placeholder="Chọn kết quả"
        onChange={(value) => change(i, { choice: value })} options={[{ value: "yes", label: "Hoàn thành" }, { value: "no", label: "Không hoàn thành" }]} /></td><td>{v.choice === "no" && <input required maxLength={500} aria-label={`Lý do ${v.HoTen}`} value={v.LyDo} onChange={(e) => change(i, { LyDo: e.target.value })} />}</td></tr>)}
    </tbody></table></div>
      <label className="nvpv-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} required />Tôi xác nhận kết quả đúng và đủ, hiểu rằng không thể mở lại sau chốt.</label>
      <div className="nvpv-actions"><button className="btn-submit" type="submit">Xác nhận chốt kết quả</button><button type="button" onClick={onCancel}>Quay lại</button></div>
    </fieldset>
  </form>;
}
