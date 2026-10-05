import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../../components/Common/SearchSelect";
import SangKienForm from "../../components/SangKien/SangKienForm";
import SangKienDetail from "../../components/SangKien/SangKienDetail";
import { ngaySangKien, ketQuaXetSangKien, TacGiaSangKien, TrangThaiSangKien } from "../../components/SangKien/SangKienInfo";
import { useQuyenSangKien } from "../../context/SangKienContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { apiFetch } from "../../utils/api";
import { layDanhMucSangKien, laySangKien, layChiTietSangKien, dongBoSangKien, xoaSangKien, xetGiangDaySangKien } from "../../utils/sangKienApi";
import "../../css/Pages.css";
import "../../css/SangKien.css";

const positive = (value, fallback, max = Infinity) => Number.isInteger(Number(value)) && Number(value) > 0 ? Math.min(Number(value), max) : fallback;
export default function SangKien() {
  const { quyen, loading: permissionLoading, error: permissionError, refresh } = useQuyenSangKien();
  const { namList, selectedNam, dangTaiNam } = useNamDanhGia();
  const [params, setParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const defaultNam = String(namList.find((n) => Number(n.IdNam) === currentYear)?.IdNam ?? (selectedNam || currentYear));
  const canWrite = quyen?.DuocNhap === true;
  const management = quyen?.XemTatCa === true || quyen?.XemTheoDonVi === true;
  const review = canWrite && params.get("tab") === "giang-day";
  const filter = useMemo(() => ({
    idNam: params.has("idNam") ? params.get("idNam") : defaultNam,
    nguon: review ? 1 : params.get("nguon") ?? "", idCap: params.get("idCap") ?? "",
    trangThaiXet: params.get("trangThaiXet") ?? (review ? 0 : ""),
    doiTuong: review ? 1 : params.get("doiTuong") ?? "", idNhanVien: params.get("idNhanVien") ?? "",
    chuaKhopTacGia: params.get("chuaKhopTacGia") === "true", ghepTheoHoTen: params.get("ghepTheoHoTen") === "true",
    baoGomKhongCon: params.get("baoGomKhongCon") === "true",
    tuKhoa: (params.get("tuKhoa") ?? "").slice(0, 100), page: positive(params.get("page"), 1), pageSize: positive(params.get("pageSize"), 20, 500),
  }), [params, defaultNam, review]);
  const [keyword, setKeyword] = useState(filter.tuKhoa);
  const [catalog, setCatalog] = useState({ Cap: [], LoaiGiaiPhap: [] });
  const [units, setUnits] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [form, setForm] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [selection, setSelection] = useState([]);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState("");
  const permissionRef = useRef(quyen);
  permissionRef.current = quyen;
  const changeFilters = (values) => setParams((previous) => {
    const next = new URLSearchParams(previous);
    Object.entries({ ...values, page: values.page ?? 1 }).forEach(([key, value]) => {
      if (value === "" && key !== "idNam" && key !== "trangThaiXet") next.delete(key);
      else next.set(key, String(value));
    });
    return next;
  }, { replace: true });
  useEffect(() => { setKeyword(filter.tuKhoa); }, [filter.tuKhoa]);
  useEffect(() => {
    if (keyword.trim() === filter.tuKhoa) return;
    const timer = setTimeout(() => setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (keyword.trim()) next.set("tuKhoa", keyword.trim()); else next.delete("tuKhoa");
      next.set("page", "1");
      return next;
    }, { replace: true }), 350);
    return () => clearTimeout(timer);
  }, [keyword, filter.tuKhoa, setParams]);
  useEffect(() => {
    let cancelled = false;
    setCatalog({ Cap: [], LoaiGiaiPhap: [] }); setUnits([]); setCatalogError("");
    if (!quyen || permissionLoading) return;
    Promise.allSettled([layDanhMucSangKien(), canWrite ? apiFetch("donvi").then(async (response) => {
      const body = await response.json();
      if (!response.ok || body.Success === false) throw new Error(body.Message || "Không tải được danh sách đơn vị.");
      return body.Items || (Array.isArray(body) ? body : []);
    }) : Promise.resolve([])]).then((results) => {
      if (cancelled) return;
      if (results[0].status === "fulfilled") setCatalog(results[0].value);
      if (results[1].status === "fulfilled") setUnits(results[1].value);
      setCatalogError(results.filter((r) => r.status === "rejected").map((r) => r.reason.message).join(" "));
    });
    return () => { cancelled = true; };
  }, [quyen, permissionLoading, canWrite, catalogRetry]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError(""); setSelection([]);
    if (!quyen || permissionLoading || dangTaiNam) { setLoading(false); return; }
    setLoading(true);
    laySangKien(filter, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (filter.page > 1 && result.TotalPages < filter.page) {
        setParams((previous) => { const next = new URLSearchParams(previous); next.set("page", String(Math.max(1, result.TotalPages))); return next; }, { replace: true });
      } else setData(result);
    }).catch((e) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filter, quyen, permissionLoading, dangTaiNam, revision, setParams]);
  useEffect(() => { setForm(null); setAction(null); setSelection([]); setDetailId(null); setSyncResult(null); setMessage(""); }, [quyen]);
  const saved = (result) => {
    setMessage(result.CoThayDoi === false ? "Không có thay đổi nào được ghi nhận." : result.Message || "Đã lưu sáng kiến.");
    setForm(null); setRevision((v) => v + 1);
  };
  const synchronize = async () => {
    if (busy || !canWrite) return;
    const owner = quyen;
    setBusy(true); setSyncing(true); setError(""); setMessage(""); setSyncResult(null);
    try {
      const result = await dongBoSangKien();
      if (permissionRef.current !== owner) return;
      setSyncResult(result); setMessage(result.Message || "Đồng bộ sáng kiến thành công."); setRevision((v) => v + 1);
    } catch (e) { if (permissionRef.current === owner) setError(e.message); }
    finally { setBusy(false); setSyncing(false); }
  };
  const edit = async (row) => {
    if (busy || !canWrite || row.ChoPhepSua !== true) return;
    const owner = quyen;
    setBusy(true); setError("");
    try {
      const result = await layChiTietSangKien(row.IdSangKien);
      if (permissionRef.current !== owner) return;
      if (result.Item?.ChoPhepSua === true) setForm({ item: result.Item });
      else setError("Bạn không còn quyền sửa sáng kiến này.");
    } catch (e) { if (permissionRef.current === owner) setError(e.message); }
    finally { setBusy(false); }
  };
  const openAction = (value) => { setAction(value); setNote(""); setActionError(""); };
  const submitAction = async () => {
    if (busy || !canWrite || !action) return;
    if (action.deleting ? action.deleting.ChoPhepSua !== true : action.rows.length === 0 || action.rows.length > 1000 || action.rows.some((r) => r.ChoPhepXet !== true)) return;
    const owner = quyen;
    setBusy(true); setActionError("");
    try {
      const result = action.deleting ? await xoaSangKien(action.deleting.IdSangKien, note.trim())
        : await xetGiangDaySangKien(action.rows.map((r) => ({ IdSangKien: r.IdSangKien, LaDoiMoiGiangDay: action.value, GhiChuXet: note.trim() || null })));
      if (permissionRef.current !== owner) return;
      setMessage(result.Message || (action.deleting ? "Đã xoá sáng kiến." : `Đã cập nhật ${result.SoCapNhat ?? 0} sáng kiến.`));
      setAction(null); setRevision((v) => v + 1);
    } catch (e) { if (permissionRef.current === owner) setActionError(e.message); }
    finally { setBusy(false); }
  };
  const rows = data?.Items || [];
  const eligible = rows.filter((r) => r.ChoPhepXet === true);
  const selectedRows = eligible.filter((r) => selection.includes(r.IdSangKien));
  const toggle = (id) => setSelection((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  const reviewButtons = (items) => <>
    <button disabled={busy || items.length === 0} onClick={() => openAction({ rows: items, value: true })}>Có đổi mới giảng dạy</button>
    <button disabled={busy || items.length === 0} onClick={() => openAction({ rows: items, value: false })}>Không phải đổi mới</button>
    <button disabled={busy || items.length === 0} onClick={() => openAction({ rows: items, value: null })}>Bỏ xét</button>
  </>;
  const colSpan = 5 + (canWrite ? 1 : 0) + (review ? 1 : 0);
  return <div className="page-container sk">
    <div className="page-header sk-heading"><div className="header-title"><h2>{management ? "Sáng kiến" : "Sáng kiến của tôi"}</h2><span className="breadcrumb">
      {quyen?.XemTatCa === true ? "Sáng kiến của toàn trường từ NCKH và Phòng Khoa học ghi nhận" : quyen?.XemTheoDonVi === true ? "Sáng kiến của nhân sự trong phạm vi đơn vị" : "Sáng kiến bạn là tác giả"}</span></div>
      <div className="sk-actions">{canWrite && <><button disabled={busy} onClick={synchronize}>{syncing ? "Đang đồng bộ NCKH..." : "Đồng bộ NCKH"}</button>
        <button className="sk-primary" disabled={busy || !catalog.Cap?.length} onClick={() => setForm({ item: null })}>+ Thêm (viên chức)</button></>}
        {quyen?.LaQuanLy === true && <Link className="sk-button" to="/sang-kien/uy-quyen">Ủy quyền nhập liệu</Link>}</div>
    </div>
    {permissionLoading && <p role="status">Đang tải quyền truy cập...</p>}
    {permissionError && <div role="alert" className="sk-error">{permissionError} <button onClick={refresh}>Thử lại</button></div>}
    {catalogError && <div role="alert" className="sk-error">{catalogError} <button onClick={() => setCatalogRetry((v) => v + 1)}>Tải lại danh mục</button></div>}
    {quyen?.DuocUyQuyen === true && !canWrite && <p className="sk-warning">Ủy quyền nhập liệu không còn hiệu lực do bạn đã rời Phòng Khoa học.</p>}
    {canWrite && <p className="sk-muted">Đồng bộ, nhập liệu và xét giảng dạy không tự chấm lại phiếu đã nộp. Phiếu năm cần tổng hợp tự động lại; phiếu quý viên chức cần nộp lại.</p>}
    {message && <p role="status" className="sk-notice">{message}</p>}
    {syncing && <p role="status" className="sk-notice">Đang lấy toàn bộ sáng kiến từ NCKH. Quá trình có thể mất vài chục giây.</p>}
    {syncResult && <div className="sk-sync-results">
      <div className="sk-summary">{[["Người dùng nguồn", "SoNguoiDungNguon"], ["Sáng kiến", "SoSangKien"], ["Mới", "SoMoi"], ["Đã có", "SoDaCo"], ["Không còn trên NCKH", "SoKhongConONguon"], ["Tác giả", "SoTacGia"]].map(([label, key]) => <span key={key}>{label}: <strong>{syncResult[key] ?? "—"}</strong></span>)}</div>
      {syncResult.SoTacGiaChuaKhop > 0 && <p className="sk-warning">{syncResult.SoTacGiaChuaKhop} tác giả chưa khớp nhân sự, không được tính điểm. <Link to="/sang-kien?idNam=&nguon=1&chuaKhopTacGia=true">Xem sáng kiến chưa khớp tác giả</Link></p>}
      {syncResult.SoTacGiaGhepHoTen > 0 && <p className="sk-warning">{syncResult.SoTacGiaGhepHoTen} tác giả tạm ghép theo họ tên, vẫn được tính điểm theo quy tắc sáng kiến và cần rà soát. Sửa email nhân sự cho khớp NCKH rồi đồng bộ lại để ghép theo email. <Link to="/sang-kien?idNam=&nguon=1&ghepTheoHoTen=true">Xem sáng kiến ghép theo họ tên</Link></p>}
      {syncResult.SoCapKhongNhanDien > 0 && <p className="sk-warning">{syncResult.SoCapKhongNhanDien} sáng kiến chưa xác định cấp, không được tính điểm viên chức. <Link to="/sang-kien?idNam=&nguon=1&idCap=0">Xem sáng kiến chưa xác định cấp</Link></p>}
      {syncResult.SoThieuNgayCongNhan > 0 && <p className="sk-warning">{syncResult.SoThieuNgayCongNhan} sáng kiến thiếu / sai ngày công nhận, không thuộc năm đánh giá. <Link to="/sang-kien?idNam=&nguon=1">Xem dữ liệu đồng bộ mọi năm</Link></p>}
    </div>}
    {canWrite && <div className="sk-tabs" role="tablist" aria-label="Danh sách sáng kiến">
      <button role="tab" aria-selected={!review} onClick={() => changeFilters({ tab: "", trangThaiXet: "", nguon: "", doiTuong: "" })}>Tất cả sáng kiến</button>
      <button role="tab" aria-selected={review} onClick={() => changeFilters({ tab: "giang-day", nguon: 1, doiTuong: 1, trangThaiXet: 0 })}>Xét đổi mới giảng dạy</button>
    </div>}
    <div className="sk-filters">
      <div className="sk-field"><label>Năm đánh giá</label><SearchSelect ariaLabel="Năm đánh giá" value={filter.idNam} placeholder={filter.idNam || "Mọi năm"} disabled={dangTaiNam} onChange={(v) => changeFilters({ idNam: v })} options={[...(dangTaiNam ? [] : [{ value: "", label: "Mọi năm" }]), ...namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))]} /></div>
      <div className="sk-field"><label>Nguồn</label><SearchSelect ariaLabel="Lọc nguồn" value={filter.nguon} disabled={review} onChange={(v) => changeFilters({ nguon: v, trangThaiXet: "" })} options={[{ value: "", label: "Tất cả nguồn" }, { value: 1, label: "Đồng bộ NCKH" }, { value: 2, label: "P_KH nhập tay" }]} /></div>
      <div className="sk-field"><label>Cấp công nhận</label><SearchSelect ariaLabel="Lọc cấp công nhận" value={filter.idCap} onChange={(v) => changeFilters({ idCap: v })} options={[{ value: "", label: "Tất cả cấp" }, { value: 0, label: "Chưa xác định cấp" }, ...(catalog.Cap || []).map((c) => ({ value: c.IdCap, label: c.TenCap }))]} /></div>
      <div className="sk-field"><label>Trạng thái xét</label><SearchSelect ariaLabel="Trạng thái xét" value={filter.trangThaiXet} onChange={(v) => changeFilters({ trangThaiXet: v, ...(v !== "" ? { nguon: 1 } : {}) })} options={[{ value: "", label: "Tất cả trạng thái" }, { value: 0, label: "Chưa xét" }, { value: 1, label: "Có đổi mới giảng dạy" }, { value: 2, label: "Không phải đổi mới" }]} /></div>
      <div className="sk-field"><label>Đối tượng tác giả</label><SearchSelect ariaLabel="Đối tượng tác giả" value={filter.doiTuong} disabled={review} onChange={(v) => changeFilters({ doiTuong: v })} options={[{ value: "", label: "Tất cả đối tượng" }, { value: 1, label: "Có tác giả giảng viên" }, { value: 2, label: "Có tác giả viên chức" }]} /></div>
      <label className="sk-field sk-search">Tìm kiếm<input maxLength={100} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tên sáng kiến, chứng nhận, tác giả, mã / email" /></label>
      <button disabled={loading || permissionLoading || busy} onClick={() => { setRevision((v) => v + 1); refresh(); }}>Làm mới</button>
      <div className="sk-filter-checks"><label className="sk-check"><input type="checkbox" checked={filter.chuaKhopTacGia} onChange={(e) => changeFilters({ chuaKhopTacGia: e.target.checked })} />Chưa khớp tác giả</label>
        <label className="sk-check"><input type="checkbox" checked={filter.ghepTheoHoTen} onChange={(e) => changeFilters({ ghepTheoHoTen: e.target.checked })} />Ghép tạm theo họ tên (cần rà soát)</label>
        <label className="sk-check"><input type="checkbox" checked={filter.baoGomKhongCon} onChange={(e) => changeFilters({ baoGomKhongCon: e.target.checked })} />Bao gồm không còn trên NCKH</label></div>
    </div>
    {error && <div role="alert" className="sk-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại danh sách</button></div>}
    {review && <div className="sk-actions sk-review-bar"><span>Đã chọn {selectedRows.length} sáng kiến trên trang</span>{reviewButtons(selectedRows)}</div>}
    <div className="modern-table-card"><div className="sk-table-scroll"><table className="custom-table sk-list" aria-label="Danh sách sáng kiến">
      <colgroup>{review && <col style={{ width: "4%" }} />}<col style={{ width: "5%" }} /><col style={{ width: canWrite ? "29%" : "35%" }} /><col style={{ width: "22%" }} /><col style={{ width: "18%" }} /><col style={{ width: "16%" }} />{canWrite && <col style={{ width: review ? "6%" : "10%" }} />}</colgroup>
      <thead><tr>{review && <th><input type="checkbox" aria-label="Chọn tất cả sáng kiến được xét trên trang" disabled={busy || eligible.length === 0} checked={eligible.length > 0 && selectedRows.length === eligible.length} onChange={(e) => setSelection(e.target.checked ? eligible.map((r) => r.IdSangKien) : [])} /></th>}<th>STT</th><th>Sáng kiến / Nguồn</th><th>Tác giả</th><th>Cấp / Công nhận</th><th>Đổi mới giảng dạy</th>{canWrite && <th>Thao tác</th>}</tr></thead>
      <tbody>{loading || permissionLoading || dangTaiNam ? <tr><td colSpan={colSpan} className="sk-empty">Đang tải danh sách...</td></tr> : rows.length === 0 ? <tr><td colSpan={colSpan} className="sk-empty">{error ? "Không tải được danh sách." : "Chưa có sáng kiến phù hợp với bộ lọc."}</td></tr> : rows.map((r, index) => <tr key={r.IdSangKien}>
        {review && <td>{r.ChoPhepXet === true && <input type="checkbox" aria-label={`Chọn ${r.TenSangKien}`} checked={selection.includes(r.IdSangKien)} disabled={busy} onChange={() => toggle(r.IdSangKien)} />}</td>}
        <td>{((data.Page ?? filter.page) - 1) * (data.PageSize ?? filter.pageSize) + index + 1}</td>
        <td><button className="sk-text-link" onClick={() => setDetailId(r.IdSangKien)}>{r.TenSangKien}</button><TrangThaiSangKien item={r} /><small>{r.TenLoaiGiaiPhap || r.LoaiGiaiPhapTextNguon}</small><small>{r.DonViChuTri}</small></td>
        <td><TacGiaSangKien items={r.TacGia} /></td>
        <td>{r.TenCap || r.CapTextNguon || "Chưa xác định cấp"}<small>{ngaySangKien(r.NgayCongNhan)} · Năm {r.IdNamDanhGia ?? "—"}</small><small>{r.SoChungNhan || "—"}</small>{r.DiemVienChuc != null && <small>{r.DiemVienChuc} điểm / lần (viên chức)</small>}</td>
        <td>{r.Nguon === 1 ? <><span className={`sk-badge ${r.LaDoiMoiGiangDay === true ? "sk-THEM" : "sk-TRUNG"}`}>{ketQuaXetSangKien(r)}</span><small>{r.GhiChuXet}</small></> : "Không áp dụng"}</td>
        {canWrite && <td><div className="sk-row-actions">{r.ChoPhepSua === true && <><button disabled={busy} onClick={() => edit(r)}>Sửa</button><button disabled={busy} className="sk-danger" onClick={() => openAction({ deleting: r })}>Xoá</button></>}
          {r.ChoPhepXet === true && <button disabled={busy} onClick={() => openAction({ rows: [r], value: r.LaDoiMoiGiangDay ?? null, choose: true })}>Xét</button>}</div></td>}
      </tr>)}</tbody>
    </table></div><div className="table-pager sk-pagination"><span>{data ? `${data.TotalCount ?? 0} sáng kiến · Trang ${data.Page ?? filter.page}/${Math.max(1, data.TotalPages ?? 1)}` : "—"}</span>
      <div className="sk-actions"><SearchSelect ariaLabel="Số sáng kiến mỗi trang" value={filter.pageSize} onChange={(v) => changeFilters({ pageSize: v })} options={[20, 50, 100, 500].map((n) => ({ value: n, label: `${n} / trang` }))} />
        <button className="table-pager-btn" disabled={loading || !data || filter.page <= 1} onClick={() => changeFilters({ page: filter.page - 1 })}>Trước</button><button className="table-pager-btn" disabled={loading || !data || filter.page >= data.TotalPages} onClick={() => changeFilters({ page: filter.page + 1 })}>Sau</button></div></div></div>
    {form && canWrite && <SangKienForm item={form.item} catalog={catalog} donViList={units} onClose={() => setForm(null)} onSaved={saved} />}
    {detailId && <SangKienDetail id={detailId} onClose={() => setDetailId(null)} />}
    {action && canWrite && <Dialog visible header={action.deleting ? "Xoá sáng kiến" : "Xét đổi mới, sáng tạo trong giảng dạy"} onHide={() => setAction(null)} modal closable={!busy} closeOnEscape={!busy} className="sk-dialog" maskClassName="sk-dialog-mask" style={{ width: "620px" }} breakpoints={{ "660px": "95vw" }}>
      <div className="sk sk-action-form">{action.deleting ? <p>Xoá sáng kiến <strong>{action.deleting.TenSangKien}</strong>?</p> : <><p>Áp dụng cho {action.rows.length} sáng kiến.</p>
        {action.choose ? <div className="sk-field"><label>Kết quả xét</label><SearchSelect ariaLabel="Kết quả xét" value={action.value === null ? "null" : String(action.value)} disabled={busy} onChange={(v) => setAction((prev) => ({ ...prev, value: v === "null" ? null : v === "true" }))} options={[{ value: "true", label: "Có đổi mới giảng dạy" }, { value: "false", label: "Không phải đổi mới" }, { value: "null", label: "Chưa xét (bỏ xét)" }]} /></div>
          : <p><strong>{action.value === true ? "Có đổi mới giảng dạy" : action.value === false ? "Không phải đổi mới giảng dạy" : "Bỏ xét — trở về chưa xét"}</strong></p>}</>}
        <label className="sk-field">{action.deleting ? "Lý do xoá (tuỳ chọn)" : "Ghi chú xét (tuỳ chọn)"}<textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} rows={3} /></label>
        {actionError && <p role="alert" className="sk-error">{actionError}</p>}<div className="sk-actions sk-footer"><button disabled={busy} onClick={() => setAction(null)}>Hủy</button><button disabled={busy} className={action.deleting ? "sk-danger" : "sk-primary"} onClick={submitAction}>{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
