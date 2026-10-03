import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../../components/Common/SearchSelect";
import HoatDongDaoTaoForm from "../../components/HoatDongDaoTao/HoatDongDaoTaoForm";
import HoatDongDaoTaoImport from "../../components/HoatDongDaoTao/HoatDongDaoTaoImport";
import HoatDongDaoTaoDetail, { ngayDaoTao } from "../../components/HoatDongDaoTao/HoatDongDaoTaoDetail";
import { useQuyenDaoTao } from "../../context/HoatDongDaoTaoContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { apiFetch } from "../../utils/api";
import { layLoaiDaoTao, layHoatDongDaoTao, xoaHoatDongDaoTao, taiMauDaoTao } from "../../utils/hoatDongDaoTaoApi";
import "../../css/Pages.css";
import "../../css/HoatDongDaoTao.css";

export default function HoatDongDaoTao() {
  const { quyen, loading: permissionLoading, error: permissionError, refresh } = useQuyenDaoTao();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const [loaiList, setLoaiList] = useState([]);
  const [khoaList, setKhoaList] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [filter, setFilter] = useState({ idLoai: "", idDonVi: "", tuKhoa: "", page: 1, pageSize: 20 });
  const [keyword, setKeyword] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [reason, setReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);
  const management = quyen?.XemTatCa === true || quyen?.XemTheoKhoa === true;
  const canWrite = quyen?.DuocNhap === true;
  useEffect(() => {
    let cancelled = false;
    setCatalogError("");
    const load = async () => {
      const results = await Promise.allSettled([
        layLoaiDaoTao(),
        management || canWrite ? apiFetch("donvi").then(async (res) => {
          const body = await res.json();
          if (!res.ok || body.Success === false) throw new Error(body.Message || "Không tải được danh sách Khoa.");
          return body.Items || (Array.isArray(body) ? body : []);
        }) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      if (results[0].status === "fulfilled") setLoaiList(results[0].value.Items || []);
      if (results[1].status === "fulfilled") setKhoaList(results[1].value.filter((k) => String(k.MaDonVi || "").toUpperCase().startsWith("K_")));
      setCatalogError(results.filter((r) => r.status === "rejected").map((r) => r.reason.message).join(" "));
    };
    if (quyen) load();
    return () => { cancelled = true; };
  }, [quyen, management, canWrite, catalogRetry]);
  useEffect(() => {
    const timer = setTimeout(() => setFilter((prev) => ({ ...prev, tuKhoa: keyword.trim(), page: 1 })), 350);
    return () => clearTimeout(timer);
  }, [keyword]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError("");
    if (!selectedNam || !quyen || permissionLoading) { setLoading(false); return; }
    setLoading(true);
    layHoatDongDaoTao({ idNam: selectedNam, ...filter, idDonVi: management ? filter.idDonVi : "" }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (filter.page > 1 && result.TotalPages < filter.page) {
          setFilter((prev) => ({ ...prev, page: Math.max(1, result.TotalPages) }));
        } else setData(result);
      }).catch((e) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedNam, filter, quyen, permissionLoading, revision, management]);
  // Any newly loaded permission response closes actions opened under earlier permissions.
  useEffect(() => { setForm(null); setImportOpen(false); setDeleting(null); }, [quyen]);
  const changeFilter = (key, value) => setFilter((prev) => ({ ...prev, [key]: value, page: 1 }));
  const saved = (result, text) => {
    setMessage(text || result.Message || "Đã lưu hoạt động đào tạo."); setForm(null); setRevision((v) => v + 1);
  };
  const deleteRecord = async () => {
    if (busy || deleting?.ChoPhepSua !== true) return;
    setBusy(true); setDeleteError("");
    try {
      const result = await xoaHoatDongDaoTao(deleting.IdHoatDong, reason.trim());
      setMessage(result.Message || "Đã xoá bản ghi."); setDeleting(null); setRevision((v) => v + 1);
    } catch (e) { setDeleteError(e.message); }
    finally { setBusy(false); }
  };
  const download = async () => {
    setBusy(true); setError("");
    try { await taiMauDaoTao(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const rows = data?.Items || [];
  const actionColumn = canWrite || rows.some((r) => r.ChoPhepSua === true);
  return <div className="page-container hddt">
    <div className="page-header hddt-heading"><div><h2>{management ? "Hoạt động đào tạo" : "Hoạt động đào tạo của tôi"}</h2><span className="breadcrumb">
      {management ? quyen.XemTatCa ? "Ghi nhận hoạt động của giảng viên toàn trường" : "Hoạt động của giảng viên trong phạm vi Khoa" : "Các hoạt động đã được ghi nhận cho bạn"}</span></div>
      <div className="hddt-actions">{canWrite && <>
        <button onClick={download} disabled={busy}>Tải file mẫu</button>
        <button onClick={() => setImportOpen(true)} disabled={!selectedNam || busy}>Import Excel</button>
        <button className="hddt-primary" onClick={() => setForm({ item: null })} disabled={!selectedNam || loaiList.length === 0}>+ Thêm hoạt động</button>
      </>}{quyen?.LaQuanLy === true && <Link className="hddt-button" to="/hoat-dong-dao-tao/uy-quyen">Ủy quyền nhập liệu</Link>}</div>
    </div>
    {permissionLoading && <p role="status">Đang tải quyền truy cập...</p>}
    {permissionError && <div role="alert" className="hddt-error">{permissionError} <button onClick={refresh}>Thử lại</button></div>}
    {catalogError && <div role="alert" className="hddt-error">{catalogError} <button onClick={() => setCatalogRetry((v) => v + 1)}>Tải lại danh mục</button></div>}
    {quyen?.DuocUyQuyen === true && !canWrite && <p className="hddt-warning">Quyền nhập liệu không còn hiệu lực do bạn đã rời Phòng Đào tạo và Bảo đảm chất lượng.</p>}
    {message && <p role="status" className="hddt-notice">{message}</p>}
    <div className="hddt-filters">
      <div className="hddt-field"><label>Năm đánh giá</label><SearchSelect ariaLabel="Năm đánh giá" value={selectedNam} disabled={dangTaiNam}
        onChange={(v) => { setSelectedNam(String(v)); changeFilter("page", 1); }} options={namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))} /></div>
      <div className="hddt-field"><label>Loại hoạt động</label><SearchSelect ariaLabel="Lọc loại hoạt động" value={filter.idLoai} onChange={(v) => changeFilter("idLoai", v)}
        options={[{ value: "", label: "Tất cả loại" }, ...loaiList.map((l) => ({ value: l.IdLoai, label: l.TenLoai }))]} /></div>
      {management && <div className="hddt-field"><label>Khoa</label><SearchSelect ariaLabel="Lọc Khoa" searchable value={filter.idDonVi} onChange={(v) => changeFilter("idDonVi", v)}
        options={[{ value: "", label: quyen.XemTatCa ? "Tất cả Khoa" : "Tất cả Khoa trong phạm vi" }, ...khoaList.map((k) => ({ value: k.IdDonVi, label: k.TenDonVi }))]} /></div>}
      <label className="hddt-field hddt-search">Tìm kiếm<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Họ tên, mã NV, nội dung, số quyết định" /></label>
      <button onClick={() => { setRevision((v) => v + 1); refresh(); }} disabled={loading || permissionLoading}>Làm mới</button>
    </div>
    {!dangTaiNam && !selectedNam && <p role="alert" className="hddt-warning">Chưa tải được năm đánh giá hoặc danh mục năm đang trống. Vui lòng tải lại trang.</p>}
    {error && <div role="alert" className="hddt-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại danh sách</button></div>}
    <div className="modern-table-card"><div className="hddt-table-scroll"><table aria-label="Danh sách hoạt động đào tạo"><colgroup>
      <col style={{ width: "6%" }} /><col style={{ width: "19%" }} /><col style={{ width: "21%" }} /><col style={{ width: "28%" }} /><col style={{ width: "16%" }} />{actionColumn && <col style={{ width: "10%" }} />}
    </colgroup><thead><tr><th>STT</th><th>Giảng viên / Khoa</th><th>Loại hoạt động</th><th>Nội dung / Ghi chú</th><th>Quyết định</th>{actionColumn && <th>Thao tác</th>}</tr></thead><tbody>
      {loading || permissionLoading ? <tr><td className="hddt-empty" colSpan={actionColumn ? 6 : 5}>Đang tải danh sách...</td></tr> : rows.length === 0 ? <tr><td className="hddt-empty" colSpan={actionColumn ? 6 : 5}>{error ? "Không tải được danh sách." : "Chưa có hoạt động phù hợp với bộ lọc."}</td></tr> : rows.map((r, i) => <tr key={r.IdHoatDong}>
        <td>{((data.Page ?? filter.page) - 1) * (data.PageSize ?? filter.pageSize) + i + 1}</td>
        <td><strong>{r.HoTen}</strong><small>{r.MaNhanVien}</small><small>{r.TenKhoa || "—"}</small></td><td>{r.TenLoai}</td>
        <td><button className="hddt-text-link" onClick={() => setDetailId(r.IdHoatDong)}>{r.NoiDung}</button>{r.GhiChu && <small>{r.GhiChu}</small>}<small>{r.Nguon === 2 ? "Import Excel" : r.Nguon === 1 ? "Nhập form" : ""}</small></td>
        <td>{r.SoQuyetDinh || "—"}<small>{ngayDaoTao(r.NgayQuyetDinh)}</small></td>
        {actionColumn && <td>{r.ChoPhepSua === true && <div className="hddt-row-actions"><button onClick={() => setForm({ item: r })}>Sửa</button><button className="hddt-danger" onClick={() => { setDeleting(r); setReason(""); setDeleteError(""); }}>Xoá</button></div>}</td>}
      </tr>)}
    </tbody></table></div>
      <div className="hddt-pagination"><span>{data ? `${data.TotalCount ?? 0} bản ghi · Trang ${data.Page ?? filter.page}/${Math.max(1, data.TotalPages ?? 1)}` : "—"}</span>
        <div className="hddt-actions"><SearchSelect ariaLabel="Số bản ghi mỗi trang" value={filter.pageSize} onChange={(v) => changeFilter("pageSize", Number(v))}
          options={[20, 50, 100].map((n) => ({ value: n, label: `${n} / trang` }))} />
          <button disabled={loading || !data || filter.page <= 1} onClick={() => setFilter((p) => ({ ...p, page: p.page - 1 }))}>Trước</button>
          <button disabled={loading || !data || filter.page >= data.TotalPages} onClick={() => setFilter((p) => ({ ...p, page: p.page + 1 }))}>Sau</button></div>
      </div>
    </div>
    {form && <HoatDongDaoTaoForm item={form.item} idNam={selectedNam} namList={namList} loaiList={loaiList} khoaList={khoaList} onClose={() => setForm(null)} onSaved={saved} />}
    {importOpen && canWrite && <HoatDongDaoTaoImport idNam={selectedNam} onClose={() => setImportOpen(false)} onImported={(r) => { setMessage(r.Message || "Đã import hoạt động đào tạo."); setRevision((v) => v + 1); }} />}
    {detailId && <HoatDongDaoTaoDetail id={detailId} onClose={() => setDetailId(null)} />}
    {deleting && <Dialog visible header="Xoá hoạt động đào tạo" onHide={() => setDeleting(null)} modal closable={!busy} closeOnEscape={!busy} className="hddt-dialog" maskClassName="hddt-dialog-mask" style={{ width: "520px" }} breakpoints={{ "600px": "95vw" }}>
      <div className="hddt"><p>Xoá ghi nhận của <strong>{deleting.HoTen}</strong>: {deleting.NoiDung}?</p><p className="hddt-muted">Bản ghi được xoá mềm và lưu lịch sử.</p>
        <label className="hddt-field">Lý do (tuỳ chọn)<textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} rows={3} /></label>
        {deleteError && <p role="alert" className="hddt-error">{deleteError}</p>}<div className="hddt-actions hddt-footer"><button onClick={() => setDeleting(null)} disabled={busy}>Hủy</button><button className="hddt-danger" onClick={deleteRecord} disabled={busy}>{busy ? "Đang xoá..." : "Xác nhận xoá"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
