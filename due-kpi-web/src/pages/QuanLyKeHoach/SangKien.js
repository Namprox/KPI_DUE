import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../../components/Common/SearchSelect";
import SangKienDetail from "../../components/SangKien/SangKienDetail";
import { ngaySangKien, ketQuaXetSangKien, ketQuaCaiTienSangKien, DiemVienChucSangKien, TacGiaSangKien, TrangThaiSangKien } from "../../components/SangKien/SangKienInfo";
import { useQuyenSangKien } from "../../context/SangKienContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { layDanhMucSangKien, laySangKien, dongBoSangKien, xetGiangDaySangKien, xetCaiTienSangKien } from "../../utils/sangKienApi";
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
  const canImprove = quyen?.DuocXetCaiTien === true;
  const management = quyen?.XemTatCa === true || quyen?.XemTheoDonVi === true;
  const reviewTeaching = canWrite && params.get("tab") === "giang-day";
  const reviewImprovement = canImprove && params.get("tab") === "cai-tien";
  const review = reviewTeaching || reviewImprovement;
  const rowPermission = reviewImprovement ? "ChoPhepXetCaiTien" : "ChoPhepXet";
  const hasActions = canWrite || canImprove;
  const filter = useMemo(() => ({
    idNam: params.has("idNam") ? params.get("idNam") : defaultNam,
    idCap: params.get("idCap") ?? "",
    trangThaiXet: params.get("trangThaiXet") ?? (reviewTeaching ? 0 : ""),
    trangThaiCaiTien: params.get("trangThaiCaiTien") ?? (reviewImprovement ? 0 : ""),
    doiTuong: reviewTeaching ? 1 : reviewImprovement ? 2 : params.get("doiTuong") ?? "", idNhanVien: params.get("idNhanVien") ?? "",
    chuaKhopTacGia: params.get("chuaKhopTacGia") === "true", ghepTheoHoTen: params.get("ghepTheoHoTen") === "true",
    baoGomKhongCon: params.get("baoGomKhongCon") === "true",
    tuKhoa: (params.get("tuKhoa") ?? "").slice(0, 100), page: positive(params.get("page"), 1), pageSize: positive(params.get("pageSize"), 20, 500),
  }), [params, defaultNam, reviewTeaching, reviewImprovement]);
  const [keyword, setKeyword] = useState(filter.tuKhoa);
  const [catalog, setCatalog] = useState({ Cap: [], LoaiGiaiPhap: [] });
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
      if (value === "" && !["idNam", "trangThaiXet", "trangThaiCaiTien"].includes(key)) next.delete(key);
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
    setCatalog({ Cap: [], LoaiGiaiPhap: [] }); setCatalogError("");
    if (!quyen || permissionLoading) return;
    layDanhMucSangKien().then((result) => { if (!cancelled) setCatalog(result); })
      .catch((e) => { if (!cancelled) setCatalogError(e.message); });
    return () => { cancelled = true; };
  }, [quyen, permissionLoading, catalogRetry]);
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
  useEffect(() => { setAction(null); setSelection([]); setDetailId(null); setSyncResult(null); setMessage(""); }, [quyen]);
  useEffect(() => { setAction(null); setSelection([]); }, [filter]);
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
  const openAction = (value) => { setAction(value); setNote(value.note || ""); setActionError(""); };
  const submitAction = async () => {
    if (busy || !action || (action.improvement ? !canImprove : !canWrite)) return;
    const permission = action.improvement ? "ChoPhepXetCaiTien" : "ChoPhepXet";
    if (action.rows.length === 0 || action.rows.length > 1000 || action.rows.some((r) => r[permission] !== true)) return;
    const owner = quyen;
    setBusy(true); setActionError("");
    try {
      const result = action.improvement
        ? await xetCaiTienSangKien(action.rows.map((r) => ({ IdSangKien: r.IdSangKien, LaCaiTienCongViec: action.value, GhiChu: note.trim() || null })))
        : await xetGiangDaySangKien(action.rows.map((r) => ({ IdSangKien: r.IdSangKien, LaDoiMoiGiangDay: action.value, GhiChuXet: note.trim() || null })));
      if (permissionRef.current !== owner) return;
      setMessage(result.Message || `Đã cập nhật ${result.SoCapNhat ?? 0} sáng kiến.`);
      setAction(null); setRevision((v) => v + 1);
    } catch (e) { if (permissionRef.current === owner) setActionError(e.message); }
    finally { setBusy(false); }
  };
  const rows = data?.Items || [];
  const eligible = rows.filter((r) => r[rowPermission] === true);
  const selectedRows = eligible.filter((r) => selection.includes(r.IdSangKien));
  const toggle = (id) => setSelection((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]);
  const reviewButtons = (items) => <>
    <button disabled={busy || items.length === 0} onClick={() => openAction({ rows: items, value: true, improvement: reviewImprovement })}>{reviewImprovement ? "Có cải tiến công việc" : "Có đổi mới giảng dạy"}</button>
    <button disabled={busy || items.length === 0} onClick={() => openAction({ rows: items, value: false, improvement: reviewImprovement })}>{reviewImprovement ? "Không phải cải tiến" : "Không phải đổi mới"}</button>
    <button disabled={busy || items.length === 0} onClick={() => openAction({ rows: items, value: null, improvement: reviewImprovement })}>Bỏ xét</button>
  </>;
  const colSpan = 6 + (hasActions ? 1 : 0) + (review ? 1 : 0);
  return <div className="page-container sk">
    <div className="page-header sk-heading"><div className="header-title"><h2>{management ? "Sáng kiến" : "Sáng kiến của tôi"}</h2><span className="breadcrumb">
      {quyen?.XemTatCa === true ? "Sáng kiến của toàn trường từ hệ thống NCKH" : quyen?.XemTheoDonVi === true ? "Sáng kiến của nhân sự trong phạm vi đơn vị" : "Sáng kiến bạn là tác giả"}</span></div>
      <div className="sk-actions">{canWrite && <button disabled={busy} onClick={synchronize}>{syncing ? "Đang đồng bộ NCKH..." : "Đồng bộ NCKH"}</button>}
        {quyen?.LaQuanLy === true && <Link className="sk-button" to="/sang-kien/uy-quyen">Ủy quyền nhập liệu</Link>}</div>
    </div>
    {permissionLoading && <p role="status">Đang tải quyền truy cập...</p>}
    {permissionError && <div role="alert" className="sk-error">{permissionError} <button onClick={refresh}>Thử lại</button></div>}
    {catalogError && <div role="alert" className="sk-error">{catalogError} <button onClick={() => setCatalogRetry((v) => v + 1)}>Tải lại danh mục</button></div>}
    {quyen?.DuocUyQuyen === true && !canWrite && <p className="sk-warning">Ủy quyền nhập liệu không còn hiệu lực do bạn đã rời Phòng Khoa học.</p>}
    <p className="sk-muted">Thông tin sáng kiến được đồng bộ từ NCKH. Nếu thông tin chưa đúng, sửa trên NCKH rồi nhờ Phòng Khoa học đồng bộ lại.</p>
    {hasActions && <p className="sk-muted">Đồng bộ và đánh dấu sáng kiến không tự chấm lại phiếu đã nộp. Phiếu năm cần tổng hợp tự động lại; phiếu quý viên chức cần nộp lại.</p>}
    {message && <p role="status" className="sk-notice">{message}</p>}
    {syncing && <p role="status" className="sk-notice">Đang lấy toàn bộ sáng kiến từ NCKH. Quá trình có thể mất vài chục giây.</p>}
    {syncResult && <div className="sk-sync-results">
      <div className="sk-summary">{[["Người dùng nguồn", "SoNguoiDungNguon"], ["Sáng kiến", "SoSangKien"], ["Mới", "SoMoi"], ["Đã có", "SoDaCo"], ["Không còn trên NCKH", "SoKhongConONguon"], ["Tác giả", "SoTacGia"]].map(([label, key]) => <span key={key}>{label}: <strong>{syncResult[key] ?? "—"}</strong></span>)}</div>
      {syncResult.SoTacGiaChuaKhop > 0 && <p className="sk-warning">{syncResult.SoTacGiaChuaKhop} tác giả chưa khớp nhân sự, không được tính điểm. <Link to="/sang-kien?idNam=&chuaKhopTacGia=true">Xem sáng kiến chưa khớp tác giả</Link></p>}
      {syncResult.SoTacGiaGhepHoTen > 0 && <p className="sk-warning">{syncResult.SoTacGiaGhepHoTen} tác giả tạm ghép theo họ tên, vẫn được tính điểm theo quy tắc sáng kiến và cần rà soát. Sửa email nhân sự cho khớp NCKH rồi đồng bộ lại để ghép theo email. <Link to="/sang-kien?idNam=&ghepTheoHoTen=true">Xem sáng kiến ghép theo họ tên</Link></p>}
      {syncResult.SoCapKhongNhanDien > 0 && <p className="sk-warning">{syncResult.SoCapKhongNhanDien} sáng kiến chưa xác định cấp, không có điểm cấp; vẫn được cộng điểm cải tiến công việc nếu được đánh dấu. <Link to="/sang-kien?idNam=&idCap=0">Xem sáng kiến chưa xác định cấp</Link></p>}
      {syncResult.SoThieuNgayCongNhan > 0 && <p className="sk-warning">{syncResult.SoThieuNgayCongNhan} sáng kiến thiếu / sai ngày công nhận, không thuộc năm đánh giá. <Link to="/sang-kien?idNam=">Xem dữ liệu đồng bộ mọi năm</Link></p>}
    </div>}
    {hasActions && <div className="sk-tabs" role="tablist" aria-label="Danh sách sáng kiến">
      <button role="tab" disabled={busy} aria-selected={!review} onClick={() => changeFilters({ tab: "", trangThaiXet: "", trangThaiCaiTien: "", doiTuong: "" })}>Tất cả sáng kiến</button>
      {canWrite && <button role="tab" disabled={busy} aria-selected={reviewTeaching} onClick={() => changeFilters({ tab: "giang-day", doiTuong: 1, trangThaiXet: 0, trangThaiCaiTien: "" })}>Xét đổi mới giảng dạy</button>}
      {canImprove && <button role="tab" disabled={busy} aria-selected={reviewImprovement} onClick={() => changeFilters({ tab: "cai-tien", doiTuong: 2, trangThaiCaiTien: 0, trangThaiXet: "" })}>Xét cải tiến công việc</button>}
    </div>}
    <div className="sk-filters">
      <div className="sk-field"><label>Năm đánh giá</label><SearchSelect ariaLabel="Năm đánh giá" value={filter.idNam} placeholder={filter.idNam || "Mọi năm"} disabled={dangTaiNam} onChange={(v) => changeFilters({ idNam: v })} options={[...(dangTaiNam ? [] : [{ value: "", label: "Mọi năm" }]), ...namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))]} /></div>
      <div className="sk-field"><label>Cấp công nhận</label><SearchSelect ariaLabel="Lọc cấp công nhận" value={filter.idCap} onChange={(v) => changeFilters({ idCap: v })} options={[{ value: "", label: "Tất cả cấp" }, { value: 0, label: "Chưa xác định cấp" }, ...(catalog.Cap || []).map((c) => ({ value: c.IdCap, label: c.TenCap }))]} /></div>
      <div className="sk-field"><label>Trạng thái xét giảng dạy</label><SearchSelect ariaLabel="Trạng thái xét giảng dạy" value={filter.trangThaiXet} onChange={(v) => changeFilters({ trangThaiXet: v })} options={[{ value: "", label: "Tất cả trạng thái" }, { value: 0, label: "Chưa xét" }, { value: 1, label: "Có đổi mới giảng dạy" }, { value: 2, label: "Không phải đổi mới" }]} /></div>
      <div className="sk-field"><label>Trạng thái cải tiến</label><SearchSelect ariaLabel="Trạng thái cải tiến" value={filter.trangThaiCaiTien} onChange={(v) => changeFilters({ trangThaiCaiTien: v })} options={[{ value: "", label: "Tất cả trạng thái" }, { value: 0, label: "Chưa xét" }, { value: 1, label: "Có cải tiến công việc" }, { value: 2, label: "Không phải cải tiến" }]} /></div>
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
      <colgroup>{review && <col style={{ width: "4%" }} />}<col style={{ width: "5%" }} /><col style={{ width: "23%" }} /><col style={{ width: "19%" }} /><col style={{ width: "19%" }} /><col style={{ width: "15%" }} /><col style={{ width: "15%" }} />{hasActions && <col style={{ width: "12%" }} />}</colgroup>
      <thead><tr>{review && <th><input type="checkbox" aria-label="Chọn tất cả sáng kiến được xét trên trang" disabled={busy || eligible.length === 0} checked={eligible.length > 0 && selectedRows.length === eligible.length} onChange={(e) => setSelection(e.target.checked ? eligible.map((r) => r.IdSangKien) : [])} /></th>}<th>STT</th><th>Sáng kiến / Nguồn</th><th>Tác giả</th><th>Cấp / Công nhận</th><th>Đổi mới giảng dạy</th><th>Cải tiến công việc</th>{hasActions && <th>Thao tác</th>}</tr></thead>
      <tbody>{loading || permissionLoading || dangTaiNam ? <tr><td colSpan={colSpan} className="sk-empty">Đang tải danh sách...</td></tr> : rows.length === 0 ? <tr><td colSpan={colSpan} className="sk-empty">{error ? "Không tải được danh sách." : "Chưa có sáng kiến phù hợp với bộ lọc."}</td></tr> : rows.map((r, index) => <tr key={r.IdSangKien}>
        {review && <td><input type="checkbox" aria-label={`Chọn ${r.TenSangKien}`} checked={selection.includes(r.IdSangKien)} disabled={busy || r[rowPermission] !== true} onChange={() => toggle(r.IdSangKien)} /></td>}
        <td>{((data.Page ?? filter.page) - 1) * (data.PageSize ?? filter.pageSize) + index + 1}</td>
        <td><button className="sk-text-link" onClick={() => setDetailId(r.IdSangKien)}>{r.TenSangKien}</button><TrangThaiSangKien item={r} /><small>{r.TenLoaiGiaiPhap || r.LoaiGiaiPhapTextNguon}</small><small>{r.DonViChuTri}</small></td>
        <td><TacGiaSangKien items={r.TacGia} /></td>
        <td>{r.TenCap || r.CapTextNguon || "Chưa xác định cấp"}<small>{ngaySangKien(r.NgayCongNhan)} · Năm {r.IdNamDanhGia ?? "—"}</small><small>{r.SoChungNhan || "—"}</small><DiemVienChucSangKien item={r} diemCaiTien={catalog.DiemCaiTienCongViec} /></td>
        <td>{r.Nguon === 1 ? <><span className={`sk-badge ${r.LaDoiMoiGiangDay === true ? "sk-THEM" : "sk-TRUNG"}`}>{ketQuaXetSangKien(r)}</span><small>{r.GhiChuXet}</small></> : "Không áp dụng"}</td>
        <td><span className={`sk-badge ${r.LaCaiTienCongViec === true ? "sk-THEM" : "sk-TRUNG"}`}>{r.LaCaiTienCongViec === true ? `Cải tiến +${catalog.DiemCaiTienCongViec ?? "—"}` : ketQuaCaiTienSangKien(r)}</span><small>{r.GhiChuXetCaiTien}</small>
          <small>{r.TenNguoiXetCaiTien || "—"} · {ngaySangKien(r.NgayXetCaiTien, true)}</small></td>
        {hasActions && <td><div className="sk-row-actions">
          {canWrite && r.ChoPhepXet === true && <button disabled={busy} onClick={() => openAction({ rows: [r], value: r.LaDoiMoiGiangDay ?? null, choose: true, improvement: false, note: r.GhiChuXet })}>Xét giảng dạy</button>}
          {canImprove && r.ChoPhepXetCaiTien === true && <button disabled={busy} onClick={() => openAction({ rows: [r], value: r.LaCaiTienCongViec ?? null, choose: true, improvement: true, note: r.GhiChuXetCaiTien })}>Xét cải tiến</button>}
        </div></td>}
      </tr>)}</tbody>
    </table></div><div className="table-pager sk-pagination"><span>{data ? `${data.TotalCount ?? 0} sáng kiến · Trang ${data.Page ?? filter.page}/${Math.max(1, data.TotalPages ?? 1)}` : "—"}</span>
      <div className="sk-actions"><SearchSelect ariaLabel="Số sáng kiến mỗi trang" value={filter.pageSize} onChange={(v) => changeFilters({ pageSize: v })} options={[20, 50, 100, 500].map((n) => ({ value: n, label: `${n} / trang` }))} />
        <button className="table-pager-btn" disabled={loading || !data || filter.page <= 1} onClick={() => changeFilters({ page: filter.page - 1 })}>Trước</button><button className="table-pager-btn" disabled={loading || !data || filter.page >= data.TotalPages} onClick={() => changeFilters({ page: filter.page + 1 })}>Sau</button></div></div></div>
    {detailId && <SangKienDetail id={detailId} onClose={() => setDetailId(null)} />}
    {action && (action.improvement ? canImprove : canWrite) && <Dialog visible header={action.improvement ? "Xét cải tiến công việc" : "Xét đổi mới, sáng tạo trong giảng dạy"} onHide={() => { if (!busy) setAction(null); }} modal closable={!busy} closeOnEscape={!busy} className="sk-dialog" maskClassName="sk-dialog-mask" style={{ width: "620px" }} breakpoints={{ "660px": "95vw" }}>
      <div className="sk sk-action-form"><p>Áp dụng cho {action.rows.length} sáng kiến.</p>
        {action.improvement && <p className="sk-muted">Kết quả áp dụng cho toàn bộ sáng kiến và mọi tác giả viên chức. Lần xét sau thay thế kết quả trước.</p>}
        {action.choose ? <div className="sk-field"><label>Kết quả xét</label><SearchSelect ariaLabel="Kết quả xét" value={action.value === null ? "null" : String(action.value)} disabled={busy} onChange={(v) => setAction((prev) => ({ ...prev, value: v === "null" ? null : v === "true" }))} options={[{ value: "true", label: action.improvement ? "Có cải tiến công việc" : "Có đổi mới giảng dạy" }, { value: "false", label: action.improvement ? "Không phải cải tiến công việc" : "Không phải đổi mới" }, { value: "null", label: "Chưa xét (bỏ xét)" }]} /></div>
          : <p><strong>{action.value === null ? "Bỏ xét — trở về chưa xét" : action.improvement ? ketQuaCaiTienSangKien({ LaCaiTienCongViec: action.value }) : ketQuaXetSangKien({ LaDoiMoiGiangDay: action.value })}</strong></p>}
        <label className="sk-field">Ghi chú xét (tuỳ chọn)<textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} rows={3} /></label>
        {actionError && <p role="alert" className="sk-error">{actionError}</p>}<div className="sk-actions sk-footer"><button disabled={busy} onClick={() => setAction(null)}>Hủy</button><button disabled={busy} className="sk-primary" onClick={submitAction}>{busy ? "Đang xử lý..." : "Xác nhận"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
