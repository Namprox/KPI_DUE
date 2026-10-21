import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../../components/Common/SearchSelect";
import KhenThuongDotXuatForm from "../../components/KhenThuongDotXuat/KhenThuongDotXuatForm";
import KhenThuongDotXuatDetail, { ngayKhenThuong, nguonKhenThuong, HUONG_DAN_DIEM, DONG_BI_KHU } from "../../components/KhenThuongDotXuat/KhenThuongDotXuatDetail";
import { useQuyenKhenThuong } from "../../context/KhenThuongDotXuatContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { apiFetch } from "../../utils/api";
import { formatDiem } from "../../utils/keKhaiThanhTichApi";
import { layMucKhenThuong, layChiTietKhenThuong, layKhenThuongDotXuat, xoaKhenThuongDotXuat } from "../../utils/khenThuongDotXuatApi";
import "../../css/Pages.css";
import "../../css/KhenThuongDotXuat.css";

export default function KhenThuongDotXuat() {
  const { quyen, loading: permissionLoading, error: permissionError, refresh } = useQuyenKhenThuong();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const [mucList, setMucList] = useState([]);
  const [donViList, setDonViList] = useState([]);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRetry, setCatalogRetry] = useState(0);
  const [filter, setFilter] = useState({ quy: "", idMuc: "", idDonVi: "", tuKhoa: "", page: 1, pageSize: 20 });
  const [keyword, setKeyword] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [reason, setReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);
  const management = quyen?.XemTatCa === true || quyen?.XemTheoDonVi === true;
  const canWrite = quyen?.DuocNhap === true && data?.DuocNhap !== false;
  const permissionRef = useRef(quyen);
  permissionRef.current = quyen;
  useEffect(() => {
    let cancelled = false;
    setCatalogError(""); setMucList([]); setDonViList([]);
    if (!quyen || permissionLoading) return;
    Promise.allSettled([
      layMucKhenThuong({ baoGomNgungDung: true }),
      management || canWrite ? apiFetch("donvi").then(async (res) => {
        const body = await res.json();
        if (!res.ok || body.Success === false) throw new Error(body.Message || "Không tải được danh sách đơn vị.");
        return body.Items || (Array.isArray(body) ? body : []);
      }) : Promise.resolve([]),
    ]).then((results) => {
      if (cancelled) return;
      if (results[0].status === "fulfilled") setMucList(results[0].value.Items || []);
      if (results[1].status === "fulfilled") setDonViList(results[1].value);
      setCatalogError(results.filter((r) => r.status === "rejected").map((r) => r.reason.message).join(" "));
    });
    return () => { cancelled = true; };
  }, [quyen, permissionLoading, management, canWrite, catalogRetry]);
  useEffect(() => {
    const timer = setTimeout(() => setFilter((p) => ({ ...p, tuKhoa: keyword.trim(), page: 1 })), 350);
    return () => clearTimeout(timer);
  }, [keyword]);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError("");
    if (!selectedNam || !quyen || permissionLoading) { setLoading(false); return; }
    setLoading(true);
    layKhenThuongDotXuat({ idNam: selectedNam, ...filter, idDonVi: management ? filter.idDonVi : "" }, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (filter.page > 1 && result.TotalPages < filter.page) setFilter((p) => ({ ...p, page: Math.max(1, result.TotalPages) }));
      else setData(result);
    }).catch((e) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedNam, filter, quyen, permissionLoading, revision, management]);
  useEffect(() => { setForm(null); setDeleting(null); setDetailId(null); setMessage(""); }, [quyen]);
  const changeFilter = (key, value) => setFilter((p) => ({ ...p, [key]: value, page: 1 }));
  const saved = (result, text) => { setMessage(text || result.Message || `Đã lưu ${result.SoBanGhi ?? 1} ghi nhận.`); setForm(null); setRevision((v) => v + 1); };
  const edit = async (row) => {
    if (busy || row.ChoPhepSua !== true) return;
    setBusy(true); setError("");
    const owner = quyen;
    try {
      const result = await layChiTietKhenThuong(row.IdKhenThuong);
      if (permissionRef.current !== owner) return;
      if (result.Item?.ChoPhepSua === true) setForm({ item: result.Item });
      else setError("Bạn không còn quyền sửa bản ghi này.");
    } catch (e) { if (permissionRef.current === owner) setError(e.message); }
    finally { setBusy(false); }
  };
  const deleteRecord = async () => {
    if (busy || deleting?.ChoPhepSua !== true) return;
    setBusy(true); setDeleteError("");
    const owner = quyen;
    try {
      const result = await xoaKhenThuongDotXuat(deleting.IdKhenThuong, reason.trim());
      if (permissionRef.current !== owner) return;
      setMessage(result.Message || "Đã xóa bản ghi."); setDeleting(null); setRevision((v) => v + 1);
    } catch (e) { if (permissionRef.current === owner) setDeleteError(e.message); }
    finally { setBusy(false); }
  };
  const rows = data?.Items || [];
  const actionColumn = rows.some((r) => r.ChoPhepSua === true);
  return <div className="page-container ktdx">
    <div className="page-header ktdx-heading"><div className="header-title"><h2>{management ? "Khen thưởng đột xuất" : "Khen thưởng đột xuất của tôi"}</h2><span className="breadcrumb">{quyen?.XemTatCa === true ? "Ghi nhận của viên chức toàn trường" : management ? "Ghi nhận của viên chức trong phạm vi đơn vị" : "Các khen thưởng đã được ghi nhận cho bạn"}</span></div>
      <div className="ktdx-actions">{canWrite && <button className="ktdx-primary" onClick={() => setForm({ item: null })} disabled={!selectedNam || busy || mucList.length === 0}>+ Thêm ghi nhận</button>}
        {quyen?.LaQuanLy === true && <Link className="ktdx-button" to="/khen-thuong-dot-xuat/uy-quyen">Ủy quyền nhập liệu</Link>}</div>
    </div>
    {permissionLoading && <p role="status">Đang tải quyền truy cập...</p>}
    {permissionError && <div role="alert" className="ktdx-error">{permissionError} <button onClick={refresh}>Thử lại</button></div>}
    {catalogError && <div role="alert" className="ktdx-error">{catalogError} <button onClick={() => setCatalogRetry((v) => v + 1)}>Tải lại danh mục</button></div>}
    <p className="ktdx-notice">Khen thưởng đột xuất do Phòng Tổ chức - Hành chính ghi nhận. Lưu ghi nhận có hiệu lực ngay, không có bước duyệt riêng.</p>
    <p className="ktdx-muted">Cùng viên chức và nội dung trong cả năm chỉ cộng dòng điểm cao nhất; bằng điểm chọn ID nhỏ nhất, sau đó mới lọc quý. Giữ trần điểm tiêu chí hiện hành.</p>
    <p className="ktdx-muted">{HUONG_DAN_DIEM}</p>
    {quyen?.DuocUyQuyen === true && quyen?.DuocNhap !== true && <p className="ktdx-warning">Quyền nhập liệu được ủy quyền hiện không còn hiệu lực.</p>}
    {message && <p role="status" className="ktdx-notice">{message}</p>}
    <div className="ktdx-filters">
      <div className="ktdx-field"><label>Năm đánh giá</label><SearchSelect ariaLabel="Năm đánh giá" value={selectedNam} disabled={dangTaiNam} onChange={(v) => { setSelectedNam(String(v)); changeFilter("page", 1); }} options={namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))} /></div>
      <div className="ktdx-field"><label>Quý</label><SearchSelect ariaLabel="Lọc quý" value={filter.quy} onChange={(v) => changeFilter("quy", v)} options={[{ value: "", label: "Cả năm" }, ...[1, 2, 3, 4].map((q) => ({ value: q, label: `Quý ${q}` }))]} /></div>
      <div className="ktdx-field"><label>Mức khen thưởng</label><SearchSelect ariaLabel="Lọc mức khen thưởng" searchable value={filter.idMuc} onChange={(v) => changeFilter("idMuc", v)} options={[{ value: "", label: "Tất cả mức" }, ...mucList.map((m) => ({ value: m.IdMuc, label: `${m.TenMuc}${m.DangSuDung === false ? " (Đã ngừng dùng)" : ""}` }))]} /></div>
      {management && <div className="ktdx-field"><label>Đơn vị</label><SearchSelect ariaLabel="Lọc đơn vị" searchable value={filter.idDonVi} onChange={(v) => changeFilter("idDonVi", v)} options={[{ value: "", label: "Tất cả trong phạm vi" }, ...donViList.map((d) => ({ value: d.IdDonVi, label: d.TenDonVi }))]} /></div>}
      <label className="ktdx-field ktdx-search">Tìm kiếm<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Họ tên, mã NV, nội dung, số QĐ" /></label>
      <button onClick={refresh} disabled={loading || permissionLoading || busy}>Làm mới</button>
    </div>
    {!dangTaiNam && !selectedNam && <p role="alert" className="ktdx-warning">Chưa tải được năm đánh giá. Vui lòng tải lại trang.</p>}
    {error && <div role="alert" className="ktdx-error">{error} <button onClick={() => setRevision((v) => v + 1)}>Thử lại danh sách</button></div>}
    <div className="modern-table-card"><div className="ktdx-table-scroll"><table className="custom-table" aria-label="Danh sách khen thưởng đột xuất"><thead><tr><th>STT</th><th>Viên chức / Đơn vị</th><th>Nội dung / Mức khen</th><th>Quyết định</th><th>Điểm / Quý</th>{actionColumn && <th>Thao tác</th>}</tr></thead><tbody>
      {loading || permissionLoading ? <tr><td className="ktdx-empty" colSpan={actionColumn ? 6 : 5}>Đang tải danh sách...</td></tr> : rows.length === 0 ? <tr><td className="ktdx-empty" colSpan={actionColumn ? 6 : 5}>{error ? "Không tải được danh sách." : "Chưa có ghi nhận phù hợp với bộ lọc."}</td></tr> : rows.map((r, i) => <tr key={r.IdKhenThuong}>
        <td>{((data.Page ?? filter.page) - 1) * (data.PageSize ?? filter.pageSize) + i + 1}</td>
        <td><span className="table-person-name">{r.HoTen}</span><small>{r.MaNhanVien}</small><small>{r.TenDonVi || "-"}</small></td>
        <td><button className="ktdx-text-link" onClick={() => setDetailId(r.IdKhenThuong)}>{r.NoiDung}</button><small>{r.TenMuc}</small><small>{nguonKhenThuong(r)}</small>{r.LaDongBiKhu === true && <small className="ktdx-warning">{DONG_BI_KHU}</small>}</td>
        <td>{r.SoQuyetDinh || "-"}<small>{ngayKhenThuong(r.NgayQuyetDinh)}</small><small>{r.CoQuanKhen}</small></td><td>{formatDiem(r.Diem)} điểm<small>Quý {r.Quy}</small></td>
        {actionColumn && <td>{r.ChoPhepSua === true && <div className="ktdx-row-actions"><button disabled={busy} onClick={() => edit(r)}>Sửa</button><button disabled={busy} className="ktdx-danger" onClick={() => { setDeleting(r); setReason(""); setDeleteError(""); }}>Xóa</button></div>}</td>}
      </tr>)}
    </tbody></table></div>
      <div className="table-pager ktdx-pagination"><span>{data ? `${data.TotalCount ?? 0} bản ghi · Trang ${data.Page ?? filter.page}/${Math.max(1, data.TotalPages ?? 1)}` : "-"}</span><div className="ktdx-actions">
        <SearchSelect ariaLabel="Số bản ghi mỗi trang" value={filter.pageSize} onChange={(v) => changeFilter("pageSize", Number(v))} options={[20, 50, 100, 500].map((n) => ({ value: n, label: `${n} / trang` }))} />
        <button disabled={loading || !data || filter.page <= 1} onClick={() => setFilter((p) => ({ ...p, page: p.page - 1 }))}>Trước</button><button disabled={loading || !data || filter.page >= data.TotalPages} onClick={() => setFilter((p) => ({ ...p, page: p.page + 1 }))}>Sau</button>
      </div></div>
    </div>
    {form && <KhenThuongDotXuatForm item={form.item} idNam={selectedNam} namList={namList} donViList={donViList} onClose={() => setForm(null)} onSaved={saved} />}
    {detailId && <KhenThuongDotXuatDetail id={detailId} onClose={() => setDetailId(null)} />}
    {deleting && <Dialog draggable={false} visible header="Xóa khen thưởng đột xuất" onHide={() => setDeleting(null)} modal closable={!busy} closeOnEscape={!busy} className="ktdx-dialog" maskClassName="ktdx-dialog-mask" style={{ width: "520px" }} breakpoints={{ "600px": "95vw" }}>
      <div className="ktdx"><p>Xóa ghi nhận của <strong>{deleting.HoTen}</strong>: {deleting.NoiDung}?</p><p className="ktdx-muted">Bản ghi được xóa mềm và lưu lịch sử.</p><label className="ktdx-field">Lý do (tùy chọn)<textarea maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} disabled={busy} rows={3} /></label>
        {deleteError && <p role="alert" className="ktdx-error">{deleteError}</p>}<div className="ktdx-actions ktdx-footer"><button onClick={() => setDeleting(null)} disabled={busy}>Hủy</button><button className="ktdx-danger" onClick={deleteRecord} disabled={busy}>{busy ? "Đang xóa..." : "Xác nhận xóa"}</button></div>
      </div>
    </Dialog>}
  </div>;
}
