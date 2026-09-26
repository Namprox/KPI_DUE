import React, { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { layChiTietGioGiangTkb, layTongHopGioGiangTkb, luuAnhXaGioGiangTkb } from "../../utils/gioGiangTkbApi";

const so = (value) => value == null ? "—" : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export function GioGiangModal({ title, onClose, busy, children }) {
  useEffect(() => {
    const handler = (event) => { if (event.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, busy]);
  return <div className="modal-overlay ggtk-modal-overlay" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !busy) onClose();
  }}>
    <div className="modal-box form-modal-box ggtk-detail-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-header"><h3>{title}</h3><button type="button" className="close-btn" aria-label="Đóng" onClick={onClose} disabled={busy}>&times;</button></div>
      <div className="modal-body">{children}</div>
    </div>
  </div>;
}

export function ChiTietGioGiang({ item, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    layChiTietGioGiangTkb(item.IdGioGiangTkb, controller.signal)
      .then((body) => { if (!controller.signal.aborted) setData(body); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [item.IdGioGiangTkb]);
  const summary = data?.Item || item;
  return <GioGiangModal title={`Chi tiết giờ giảng — ${item.HoTen}`} onClose={onClose}>
    <p>{summary.TenKhoa || "Chưa ghi khoa"} · Giờ ĐH: <strong>{so(summary.GioChuanDaiHoc)}</strong> · Giờ SĐH: <strong>{so(summary.GioChuanSauDaiHoc)}</strong> · Tổng: <strong>{so(summary.GioChuanTrongNam)}</strong></p>
    {error ? <div className="ggtk-form-error" role="alert">{error}</div> : !data ? <p role="status">Đang tải chi tiết...</p> :
      <div className="table-scroll"><table className="custom-table ggtk-table">
        <thead><tr><th>Hệ</th><th>Kỳ học</th><th>Lớp</th><th>Học phần</th><th>Ngôn ngữ</th><th>Sĩ số</th><th>Số tiết</th><th>Hệ số</th><th>Giờ chuẩn</th></tr></thead>
        <tbody>{(data.ChiTiet || []).map((row) => <tr key={row.IdChiTiet}>
          <td>{row.HeDaoTao === "DH" ? "ĐH" : row.HeDaoTao === "SDH" ? "SĐH" : "—"}</td><td>{row.KyHoc}</td><td>{row.MaLopTinChi || "—"}</td>
          <td>{row.TenHocPhan || row.MaHocPhan || "—"}</td><td>{row.GiangTiengAnh === true ? <span className="ggtk-badge is-info">Tiếng Anh</span> : row.GiangTiengAnh === false ? "Tiếng Việt" : "—"}</td>
          <td className="ggtk-number">{so(row.SlSvDangKyHoc)}</td><td className="ggtk-number">{so(row.SoTietTrongNam)}</td><td className="ggtk-number">{so(row.HeSo)}</td><td className="ggtk-number ggtk-hours">{so(row.GioChuanTrongNam)}</td>
        </tr>)}{!data.ChiTiet?.length && <tr><td colSpan="9">Chưa có chi tiết lớp.</td></tr>}</tbody>
      </table></div>}
  </GioGiangModal>;
}

export function AnhXaGioGiang({ item, onClose, onSaved }) {
  const [search, setSearch] = useState(item.HoTen || "");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search, page: String(page), pageSize: "20", trangThai: "true" });
        const response = await apiFetch(`nhan-vien?${params}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok || body.Success === false) throw new Error(body.Message || "Không tải được nhân viên");
        if (!controller.signal.aborted) setData(body);
      } catch (err) { if (!controller.signal.aborted) { setData(null); setError(err.message); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page]);
  const save = async (id) => {
    setSaving(true);
    setError("");
    try { await luuAnhXaGioGiangTkb(item, id); await onSaved(); onClose(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  return <GioGiangModal title="Ánh xạ nhân viên" onClose={onClose} busy={saving}>
    <p><strong>{item.HoTen}</strong> · Khoa trong file: <strong>{item.TenKhoa || "Chưa ghi khoa"}</strong></p>
    <p className="ggtk-field-help">Chọn đúng người theo họ tên và khoa. Ánh xạ áp dụng cho cặp tên, khoa này qua các năm và được giữ khi import lại.</p>
    {item.IdNhanVien != null && <p>Hiện tại: {item.MaNhanVien} · {item.HoTenNhanVien} · {item.TenDonVi}</p>}
    <label className="ggtk-search-label">Tìm họ tên hoặc mã nhân viên
      <input type="search" value={search} disabled={saving} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    </label>
    {error && <div className="ggtk-form-error" role="alert">{error}</div>}
    {loading ? <p role="status">Đang tìm nhân viên...</p> : <div className="table-scroll"><table className="custom-table">
      <thead><tr><th>Chọn</th><th>Mã nhân viên</th><th>Họ tên</th><th>Đơn vị chính</th></tr></thead>
      <tbody>{(data?.Items || []).map((person) => <tr key={person.IdNhanVien}>
        <td><input type="radio" name="ggtk-person" aria-label={`Chọn ${person.MaNhanVien}`} checked={selected?.IdNhanVien === person.IdNhanVien} disabled={saving} onChange={() => setSelected(person)} /></td>
        <td>{person.MaNhanVien}</td><td>{person.HoTen}{person.IdNhanVien === item.GoiYIdNhanVien && <span className="ggtk-badge is-info">API gợi ý theo tên, khoa</span>}</td><td>{person.TenDonVi || "—"}</td>
      </tr>)}{!data?.Items?.length && <tr><td colSpan="4">Không tìm thấy nhân viên.</td></tr>}</tbody>
    </table></div>}
    <div className="ggtk-panel-actions">
      <button className="btn-cancel" disabled={loading || saving || page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button><span>Trang {page}</span>
      <button className="btn-cancel" disabled={loading || saving || page * 20 >= (data?.TotalCount ?? 0)} onClick={() => setPage(page + 1)}>Trang sau</button>
    </div>
    {selected && <p>Đã chọn: <strong>{selected.MaNhanVien} · {selected.HoTen}</strong> · {selected.TenDonVi}</p>}
    <div className="ggtk-panel-actions">
      {item.IdNhanVien != null && <button className="btn-cancel" disabled={saving} onClick={() => save(null)}>Gỡ ánh xạ</button>}
      <button className="btn-cancel" disabled={saving} onClick={onClose}>Hủy</button>
      <button className="btn-submit" disabled={saving || !selected} onClick={() => save(selected.IdNhanVien)}>{saving ? "Đang lưu..." : "Lưu ánh xạ"}</button>
    </div>
  </GioGiangModal>;
}

export function TongHopGioGiang({ idNam, revision }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!idNam) return undefined;
    const controller = new AbortController();
    setData(null); setError("");
    layTongHopGioGiangTkb(idNam, controller.signal)
      .then((body) => { if (!controller.signal.aborted) setData(body); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [idNam, revision, retry]);
  if (!idNam) return null;
  return <section className="table-card ggtk-total-card">
    <div className="ggtk-table-toolbar"><div><h3>Tổng hợp giờ giảng năm {idNam}</h3><p>Giờ giảng dạy từ TKB + Phụ lục II đã duyệt. Các cột đều là giờ chuẩn.</p></div></div>
    {error ? <div className="ggtk-load-state is-error" role="alert">{error}<button onClick={() => setRetry(retry + 1)}>Thử lại</button></div> : !data ? <p className="ggtk-load-state" role="status">Đang tải tổng hợp...</p> : <>
      {data.SoDongChuaAnhXa > 0 && <div className="ggtk-alert" role="status">Còn {data.SoDongChuaAnhXa} dòng TKB chưa ánh xạ, chưa được tính vào tổng hợp.</div>}
      <div className="table-scroll"><table className="custom-table ggtk-table"><thead><tr><th>Nhân viên</th><th>Đơn vị</th><th>Giảng dạy ĐH</th><th>Giảng dạy SĐH</th><th>Tổng TKB</th><th>Phụ lục II – ĐH</th><th>Phụ lục II – SĐH</th><th>Tổng giờ</th></tr></thead>
        <tbody>{(data.TongHop || []).map((row) => <tr key={row.IdNhanVien}><td><div className="ggtk-person-cell"><strong>{row.HoTen}</strong><span>{row.MaNhanVien}</span></div></td><td>{row.TenDonVi || "—"}</td>
          {["GioTkbDaiHoc", "GioTkbSauDaiHoc", "GioTkb", "GioDaiHoc", "GioSauDaiHoc", "TongGio"].map((field) => <td className="ggtk-number" key={field}>{so(row[field])}</td>)}
        </tr>)}{!data.TongHop?.length && <tr><td colSpan="8">Chưa có dữ liệu tổng hợp.</td></tr>}</tbody>
      </table></div>
    </>}
  </section>;
}
