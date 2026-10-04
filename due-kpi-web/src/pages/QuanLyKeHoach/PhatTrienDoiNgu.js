import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../../components/Common/SearchSelect";
import PhatTrienDoiNguForm from "../../components/PhatTrienDoiNgu/PhatTrienDoiNguForm";
import PhatTrienDoiNguImport from "../../components/PhatTrienDoiNgu/PhatTrienDoiNguImport";
import PhatTrienDoiNguDetail, { ngayDoiNgu } from "../../components/PhatTrienDoiNgu/PhatTrienDoiNguDetail";
import { useQuyenDoiNgu } from "../../context/PhatTrienDoiNguContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { apiFetch } from "../../utils/api";
import { layLoaiDoiNgu, layHangMucDoiNgu, layChiTietDoiNgu, layPhatTrienDoiNgu, xoaPhatTrienDoiNgu, taiMauDoiNgu } from "../../utils/phatTrienDoiNguApi";
import "../../css/Pages.css";
import "../../css/PhatTrienDoiNgu.css";

export default function PhatTrienDoiNgu() {
  const { quyen, loading: permissionLoading, error: permissionError, refresh } = useQuyenDoiNgu();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const [loaiList, setLoaiList] = useState([]);
  const [hangMucList, setHangMucList] = useState([]);
  const [khoaList, setKhoaList] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [filter, setFilter] = useState({ idLoai: "", idHangMuc: "", idDonVi: "", tuKhoa: "", page: 1, pageSize: 20 });
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
  const permissionRef = useRef(quyen);
  permissionRef.current = quyen;
  useEffect(() => {
    let cancelled = false;
    setCatalogError("");
    const load = async () => {
      const results = await Promise.allSettled([
        layLoaiDoiNgu(),
        layHangMucDoiNgu({ baoGomNgungDung: true }),
        management || canWrite ? apiFetch("donvi").then(async (res) => {
          const body = await res.json();
          if (!res.ok || body.Success === false) throw new Error(body.Message || "Không tải được danh sách Khoa.");
          return body.Items || (Array.isArray(body) ? body : []);
        }) : Promise.resolve([]),
      ]);
      if (cancelled) return;
      if (results[0].status === "fulfilled") setLoaiList(results[0].value.Items || []);
      if (results[1].status === "fulfilled") setHangMucList(results[1].value.Items || []);
      if (results[2].status === "fulfilled") setKhoaList(results[2].value.filter((k) => String(k.MaDonVi || "").toUpperCase().startsWith("K_")));
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
    layPhatTrienDoiNgu({ idNam: selectedNam, ...filter, idDonVi: management ? filter.idDonVi : "" }, controller.signal)
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
    setMessage(text || result.Message || "Đã lưu phát triển đội ngũ."); setForm(null); setRevision((v) => v + 1);
  };
  const deleteRecord = async () => {
    if (busy || deleting?.ChoPhepSua !== true) return;
    setBusy(true); setDeleteError("");
    try {
      const result = await xoaPhatTrienDoiNgu(deleting.IdBanGhi, reason.trim());
      setMessage(result.Message || "Đã xoá bản ghi."); setDeleting(null); setRevision((v) => v + 1);
    } catch (e) { setDeleteError(e.message); }
    finally { setBusy(false); }
  };
  const download = async () => {
    setBusy(true); setError("");
    try { await taiMauDoiNgu(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const edit = async (row) => {
    if (busy || row.ChoPhepSua !== true) return;
    setBusy(true); setError("");
    const permissionAtStart = quyen;
    try {
      const result = await layChiTietDoiNgu(row.IdBanGhi);
      if (permissionRef.current !== permissionAtStart) return;
      if (result.Item?.ChoPhepSua === true) setForm({ item: result.Item });
      else setError("Bạn không còn quyền sửa bản ghi này.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const rows = data?.Items || [];
  const actionColumn = canWrite || rows.some((r) => r.ChoPhepSua === true);
  return <div className="page-container ptdn">
    <div className="page-header ptdn-heading"><div className="header-title"><h2>{management ? "Phát triển đội ngũ" : "Phát triển đội ngũ của tôi"}</h2><span className="breadcrumb">
      {management ? quyen.XemTatCa ? "Ghi nhận phát triển đội ngũ của giảng viên toàn trường" : "Ghi nhận của giảng viên trong phạm vi Khoa" : "Các kết quả phát triển đội ngũ đã được ghi nhận cho bạn"}</span></div>
      <div className="ptdn-actions">{canWrite && <>
        <button onClick={download} disabled={busy}>Tải file mẫu</button>
        <button onClick={() => setImportOpen(true)} disabled={!selectedNam || busy}>Import Excel</button>
        <button className="ptdn-primary" onClick={() => setForm({ item: null })} disabled={!selectedNam || loaiList.length === 0}>+ Thêm ghi nhận</button>
      </>}{quyen?.LaQuanLy === true && <><Link className="ptdn-button" to="/phat-trien-doi-ngu/hang-muc">Danh mục hạng mục</Link><Link className="ptdn-button" to="/phat-trien-doi-ngu/uy-quyen">Ủy quyền nhập liệu</Link></>}</div>
    </div>
    {permissionLoading && <p role="status">Đang tải quyền truy cập...</p>}
    {permissionError && <div role="alert" className="ptdn-error">{permissionError} <button onClick={refresh}>Thử lại</button></div>}
    {catalogError && <div role="alert" className="ptdn-error">{catalogError} <button onClick={() => setCatalogRetry((v) => v + 1)}>Tải lại danh mục</button></div>}
    {quyen?.DuocUyQuyen === true && !canWrite && <p className="ptdn-warning">Quyền nhập liệu không còn hiệu lực do bạn đã rời Phòng Tổ chức – Hành chính.</p>}
    {message && <p role="status" className="ptdn-notice">{message}</p>}
    {canWrite && <p className="ptdn-warning">Ghi nhận, sửa hoặc xoá không tự cập nhật điểm phiếu đã nộp. Phiếu đang thẩm định cần tổng hợp lại điểm tự động; phiếu Nháp được chấm khi giảng viên nộp.</p>}
    <div className="ptdn-filters">
      <div className="ptdn-field"><label>Năm đánh giá</label><SearchSelect ariaLabel="Năm đánh giá" value={selectedNam} disabled={dangTaiNam}
        onChange={(v) => { setSelectedNam(String(v)); changeFilter("page", 1); }} options={namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))} /></div>
      <div className="ptdn-field"><label>Loại ghi nhận</label><SearchSelect ariaLabel="Lọc loại ghi nhận" value={filter.idLoai} onChange={(v) => setFilter((p) => ({ ...p, idLoai: v, idHangMuc: "", page: 1 }))}
        options={[{ value: "", label: "Tất cả loại" }, ...loaiList.map((l) => ({ value: l.IdLoai, label: l.TenLoai }))]} /></div>
      <div className="ptdn-field"><label>Hạng mục</label><SearchSelect ariaLabel="Lọc hạng mục" searchable value={filter.idHangMuc} onChange={(v) => changeFilter("idHangMuc", v)}
        options={[{ value: "", label: "Tất cả hạng mục" }, ...hangMucList.filter((h) => !filter.idLoai || String(h.IdLoai) === String(filter.idLoai)).map((h) => ({ value: h.IdHangMuc, label: `${h.TenHangMuc}${h.DangSuDung === false ? " (Đã ngừng dùng)" : ""}` }))]} /></div>
      {management && <div className="ptdn-field"><label>Khoa</label><SearchSelect ariaLabel="Lọc Khoa" searchable value={filter.idDonVi} onChange={(v) => changeFilter("idDonVi", v)}
        options={[{ value: "", label: quyen.XemTatCa ? "Tất cả Khoa" : "Tất cả Khoa trong phạm vi" }, ...khoaList.map((k) => ({ value: k.IdDonVi, label: k.TenDonVi }))]} /></div>}
      <label className="ptdn-field ptdn-search">Tìm kiếm<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Họ tên, mã NV, hạng mục, số QĐ" /></label>
      <button onClick={() => { setRevision((v) => v + 1); refresh(); }} disabled={loading || permissionLoading}>Làm mới</button>
    </div>
    {!dangTaiNam && !selectedNam && <p role="alert" className="ptdn-warning">Chưa tải được năm đánh giá hoặc danh mục năm đang trống. Vui lòng tải lại trang.</p>}
    {error && <div role="alert" className="ptdn-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại danh sách</button></div>}
    <div className="modern-table-card"><div className="ptdn-table-scroll"><table className="custom-table" aria-label="Danh sách phát triển đội ngũ"><colgroup>
      <col style={{ width: "6%" }} /><col style={{ width: "19%" }} /><col style={{ width: "21%" }} /><col style={{ width: "28%" }} /><col style={{ width: "16%" }} />{actionColumn && <col style={{ width: "10%" }} />}
    </colgroup><thead><tr><th>STT</th><th>Giảng viên / Khoa</th><th>Loại ghi nhận</th><th>Hạng mục / Chi tiết</th><th>Quyết định</th>{actionColumn && <th>Thao tác</th>}</tr></thead><tbody>
      {loading || permissionLoading ? <tr><td className="ptdn-empty" colSpan={actionColumn ? 6 : 5}>Đang tải danh sách...</td></tr> : rows.length === 0 ? <tr><td className="ptdn-empty" colSpan={actionColumn ? 6 : 5}>{error ? "Không tải được danh sách." : "Chưa có hoạt động phù hợp với bộ lọc."}</td></tr> : rows.map((r, i) => <tr key={r.IdBanGhi}>
        <td>{((data.Page ?? filter.page) - 1) * (data.PageSize ?? filter.pageSize) + i + 1}</td>
        <td><span className="table-person-name">{r.HoTen}</span><small>{r.MaNhanVien}</small><small>{r.TenKhoa || "—"}</small></td><td>{r.TenLoai}</td>
        <td><button className="ptdn-text-link" onClick={() => setDetailId(r.IdBanGhi)}>{r.TenHangMuc}</button>{r.NoiDung && <small>{r.NoiDung}</small>}{r.GhiChu && <small>{r.GhiChu}</small>}<small>{r.Nguon === 2 ? "Import Excel" : r.Nguon === 1 ? "Nhập form" : ""}</small></td>
        <td>{r.SoQuyetDinh || "—"}<small>{ngayDoiNgu(r.NgayQuyetDinh)}</small></td>
        {actionColumn && <td>{r.ChoPhepSua === true && <div className="ptdn-row-actions"><button disabled={busy} onClick={() => edit(r)}>Sửa</button><button className="ptdn-danger" onClick={() => { setDeleting(r); setReason(""); setDeleteError(""); }}>Xoá</button></div>}</td>}
      </tr>)}
    </tbody></table></div>
      <div className="table-pager ptdn-pagination"><span>{data ? `${data.TotalCount ?? 0} bản ghi · Trang ${data.Page ?? filter.page}/${Math.max(1, data.TotalPages ?? 1)}` : "—"}</span>
        <div className="ptdn-actions"><SearchSelect ariaLabel="Số bản ghi mỗi trang" value={filter.pageSize} onChange={(v) => changeFilter("pageSize", Number(v))}
          options={[20, 50, 100].map((n) => ({ value: n, label: `${n} / trang` }))} />
          <button className="table-pager-btn" disabled={loading || !data || filter.page <= 1} onClick={() => setFilter((p) => ({ ...p, page: p.page - 1 }))}>Trước</button>
          <button className="table-pager-btn" disabled={loading || !data || filter.page >= data.TotalPages} onClick={() => setFilter((p) => ({ ...p, page: p.page + 1 }))}>Sau</button></div>
      </div>
    </div>
    {form && <PhatTrienDoiNguForm item={form.item} idNam={selectedNam} namList={namList} loaiList={loaiList} khoaList={khoaList} onClose={() => setForm(null)} onSaved={saved} />}
    {importOpen && canWrite && <PhatTrienDoiNguImport idNam={selectedNam} onClose={() => setImportOpen(false)} onImported={(r) => { setMessage(r.Message || "Đã import phát triển đội ngũ."); setRevision((v) => v + 1); }} />}
    {detailId && <PhatTrienDoiNguDetail id={detailId} onClose={() => setDetailId(null)} />}
    {deleting && <Dialog visible header="Xoá phát triển đội ngũ" onHide={() => setDeleting(null)} modal closable={!busy} closeOnEscape={!busy} className="ptdn-dialog" maskClassName="ptdn-dialog-mask" style={{ width: "520px" }} breakpoints={{ "600px": "95vw" }}>
      <div className="ptdn"><p>Xoá ghi nhận của <strong>{deleting.HoTen}</strong>: {deleting.TenHangMuc}?</p><p className="ptdn-muted">Bản ghi được xoá mềm và lưu lịch sử.</p>
        <label className="ptdn-field">Lý do (tuỳ chọn)<textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} rows={3} /></label>
        {deleteError && <p role="alert" className="ptdn-error">{deleteError}</p>}<div className="ptdn-actions ptdn-footer"><button onClick={() => setDeleting(null)} disabled={busy}>Hủy</button><button className="ptdn-danger" onClick={deleteRecord} disabled={busy}>{busy ? "Đang xoá..." : "Xác nhận xoá"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
