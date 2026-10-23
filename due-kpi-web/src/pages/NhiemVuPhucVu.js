import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dialog } from "primereact/dialog";
import SearchSelect from "../components/Common/SearchSelect";
import { useNamDanhGia } from "../hooks/useNamDanhGia";
import * as api from "../utils/nhiemVuPhucVuApi";
import NhiemVuForm from "../components/NhiemVuPhucVu/NhiemVuForm";
import NhiemVuPhucVuDetail from "../components/NhiemVuPhucVu/NhiemVuPhucVuDetail";
import "../css/Pages.css";
import "../css/QuanLyChamDiem.css";
import "../css/NhiemVuPhucVu.css";

function TaskTable({ items, onOpen, empty }) {
  return <div className="modern-table-card table-scroll"><table className="custom-table nvpv-table"><thead><tr><th>Nhiệm vụ / Khoa</th><th>Thời gian / Đăng ký</th><th>Số lượng</th><th>Trạng thái</th><th>Tham gia / Kết quả của tôi</th><th /></tr></thead><tbody>
    {items.map((v) => <tr key={v.IdNhiemVu}><td><strong>{v.TenNhiemVu}</strong><small>{v.TenDonVi} · {v.TenNguon}</small><small>{v.TenNhom}</small></td>
      <td>{api.hienThiNgay(v.TuNgay)} – {api.hienThiNgay(v.DenNgay)}<small>Hạn: {v.HanDangKy ? api.hienThiNgay(v.HanDangKy, true) : "Chỉ phân công"}</small></td>
      <td>{v.SoThanhVien}/{v.SoLuongToiDa}<small>Còn {v.SoSuatConLai ?? "-"} suất</small></td>
      <td><span className={`cd-status-badge nvpv-status-${v.TrangThai}`}>{v.TenTrangThai || api.TRANG_THAI[v.TrangThai]}</span>{v.DangMoDangKy === true && <small>{v.ChoPhepDangKy === true ? "Đang mở đăng ký" : "Không còn suất đăng ký cho bạn"}</small>}</td>
      <td>{v.CuaToi ? <>{v.CuaToi.TenVaiTro || "-"}<small>{v.CuaToi.DaRoi === true ? "Đã rút / gỡ" : v.CuaToi.TenNguonThamGia}</small>{v.CuaToi.TenKetQua && <small>{v.CuaToi.TenKetQua}{v.CuaToi.Diem != null ? ` · ${v.CuaToi.Diem} điểm` : ""}</small>}{v.CuaToi.LyDoKhongHoanThanh && <small>{v.CuaToi.LyDoKhongHoanThanh}</small>}</> : "-"}</td>
      <td><button onClick={() => onOpen(v.IdNhiemVu)}>Xem chi tiết</button></td></tr>)}
    {!items.length && <tr><td colSpan={6} className="nvpv-empty">{empty || "Chưa có nhiệm vụ phù hợp."}</td></tr>}
  </tbody></table></div>;
}
const SUMMARY_FIELDS = [["SoNhap", "Bản nháp"], ["SoChoTrienKhai", "Chờ triển khai"], ["SoDangTrienKhai", "Đang triển khai"], ["SoChoDuyet", "Chờ duyệt"], ["SoDaChot", "Đã chốt"], ["SoDaHuy", "Đã hủy"]];
const SCORE_FIELDS = [["SoHoanThanh", "Hoàn thành"], ["SoKhongHoanThanh", "Không hoàn thành"], ["SoChuTri", "Chủ trì"], ["SoPhoiHopChinh", "Phối hợp chính"], ["SoPhoiHop", "Phối hợp"], ["SoDangThamGia", "Đang tham gia"], ["DiemKhoa", "Điểm Khoa"], ["TongDiemQuyDoi", "Tổng điểm quy đổi (mọi Khoa)"], ["TongDiemThucTe", "Điểm thực tế vào phiếu (mọi Khoa)"]];

export default function NhiemVuPhucVu({ mode = "mine", detailOnly = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const [config, setConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState("");
  const [khoa, setKhoa] = useState("");
  const [filter, setFilter] = useState({ idNhomNv: "", nguon: "", trangThai: "", tuKhoa: "", chiMoDangKy: false });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [configRevision, setConfigRevision] = useState(0);
  const [detailId, setDetailId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [notice, setNotice] = useState("");
  const writing = useRef(false);
  const request = useRef(0);
  useEffect(() => {
    if (detailOnly || !selectedNam) return;
    let cancelled = false;
    setConfig(null); setConfigError(""); setConfigLoading(true); setCreating(false); setData(null);
    api.layCauHinh({ idNam: selectedNam }).then((c) => {
      if (cancelled) return;
      setConfig(c);
      const allowed = (c.Khoa || []).filter((k) => mode === "mine" || c.LaBanGiamHieu === true || k.LaTruongKhoa === true);
      setKhoa((old) => allowed.some((k) => String(k.IdDonVi) === old) ? old : c.LaBanGiamHieu === true && mode === "manage" ? "" : String(allowed[0]?.IdDonVi ?? ""));
      setPage(1);
    }).catch((e) => { if (!cancelled) setConfigError(e.message); })
      .finally(() => { if (!cancelled) setConfigLoading(false); });
    return () => { cancelled = true; };
  }, [selectedNam, mode, detailOnly, configRevision]);
  useEffect(() => {
    const timer = setTimeout(() => { setFilter((f) => ({ ...f, tuKhoa: search.trim() })); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  const canManage = api.quyenTuCauHinh(config).QuanLy;
  useEffect(() => {
    const seq = ++request.current;
    setData(null); setError("");
    if (detailOnly || !selectedNam || !config || (mode !== "mine" && !canManage) || (mode === "summary" && !khoa)) { setLoading(false); return; }
    setLoading(true);
    const params = { idNam: selectedNam, idDonVi: khoa };
    const promise = mode === "mine" ? api.layCuaToi(selectedNam) : mode === "summary" ? api.layTongHop(params)
      : api.layDanhSach({ ...params, ...filter, chiMoDangKy: filter.chiMoDangKy || undefined, page, pageSize: 20 });
    promise.then((r) => { if (seq === request.current) setData(r); })
      .catch((e) => { if (seq === request.current) setError(e.message); })
      .finally(() => { if (seq === request.current) setLoading(false); });
    return () => { request.current += 1; };
  }, [selectedNam, khoa, config, canManage, mode, filter, page, revision, detailOnly]);
  const refresh = () => setRevision((v) => v + 1);
  const create = async (body) => {
    if (writing.current) return;
    writing.current = true; setSaving(true); setCreateError("");
    try {
      const item = await api.luuNhiemVu(null, body);
      setCreating(false); setDetailId(item.IdNhiemVu); setNotice("Đã tạo bản nháp. Mở chi tiết để công bố nhiệm vụ."); refresh();
    } catch (e) { setCreateError(e.message); }
    finally { writing.current = false; setSaving(false); }
  };
  if (detailOnly) return <NhiemVuPhucVuDetail key={id} id={id} onClose={() => navigate("/nhiem-vu-phuc-vu")} />;
  const khoas = (config?.Khoa || []).filter((k) => mode === "mine" || config?.LaBanGiamHieu === true || k.LaTruongKhoa === true);
  const setField = (key, value) => { setFilter((f) => ({ ...f, [key]: value })); setPage(1); };
  return <div className="page-container nvpv">
    <div className="page-header"><div className="header-title"><h2>{mode === "mine" ? "Nhiệm vụ PVCĐ của tôi" : mode === "summary" ? "Tổng hợp nhiệm vụ PVCĐ" : "Phân công và thực hiện nhiệm vụ PVCĐ"}</h2></div><span className="breadcrumb">KPI Nhóm III · {mode === "mine" ? "Đăng ký, thực hiện và theo dõi kết quả" : "Nhiệm vụ Khoa và nhiệm vụ Trường giao"}</span></div>
    <div className="cd-toolbar"><label className="cd-field">Năm đánh giá<SearchSelect ariaLabel="Năm đánh giá" value={selectedNam} disabled={dangTaiNam} placeholder="Chọn năm"
      onChange={(value) => { setSelectedNam(String(value)); setData(null); setConfig(null); }} options={namList.map((n) => ({ value: n.IdNam, label: String(n.IdNam) }))} /></label>
      {mode !== "mine" && <label className="cd-field">Khoa<SearchSelect ariaLabel="Khoa" searchable value={khoa} disabled={configLoading} placeholder="Chọn Khoa"
        onChange={(value) => { setKhoa(String(value)); setPage(1); }} options={[
          ...(config?.LaBanGiamHieu === true && mode === "manage" ? [{ value: "", label: "Tất cả Khoa" }] : []),
          ...khoas.map((k) => ({ value: k.IdDonVi, label: k.TenDonVi })),
        ]} /></label>}
      <button disabled={loading || configLoading} onClick={() => setConfigRevision((v) => v + 1)}>Làm mới</button>
      {mode === "manage" && canManage && <button className="btn-submit" onClick={() => { setCreating(true); setCreateError(""); }}>Tạo nhiệm vụ</button>}
    </div>
    {!dangTaiNam && !selectedNam && <p role="alert" className="nvpv-warning">Chưa tải được danh mục năm đánh giá hoặc danh mục đang trống. Vui lòng tải lại trang.</p>}
    {configError && <p role="alert" className="nvpv-error">{configError} <button onClick={() => setConfigRevision((v) => v + 1)}>Thử lại</button></p>}
    {notice && <p role="status" className="nvpv-notice">{notice}</p>}
    {config?.LechCauHinh === true && <p className="nvpv-warning">Trần điểm nhiệm vụ ({config.TranDiem}) khác điểm tối đa tiêu chí ({config.DiemToiDaTieuChi}). Vui lòng báo quản trị để kiểm tra cấu hình.</p>}
    {/* {config && <p className="nvpv-muted">Trần điểm: {config.TranDiem} · Giờ máy chủ khi tải: {api.hienThiNgay(config.BayGio, true)} (Việt Nam). {api.HUONG_DAN_DIEM}</p>} */}
    {config && mode !== "mine" && !canManage && <p role="alert">Bạn không có quyền quản lý nhiệm vụ PVCĐ trong phạm vi này.</p>}
    {mode === "manage" && canManage && <>
      <div className="nvpv-actions nvpv-queues"><button aria-pressed={filter.trangThai === ""} onClick={() => setField("trangThai", "")}>Tất cả nhiệm vụ</button><button aria-pressed={filter.trangThai === "2"} onClick={() => setField("trangThai", "2")}>Chờ Khoa triển khai</button><button aria-pressed={filter.trangThai === "4"} onClick={() => setField("trangThai", "4")}>Chờ duyệt báo cáo</button></div>
      <div className="cd-toolbar"><label className="cd-field">Nhóm nhiệm vụ<SearchSelect ariaLabel="Nhóm nhiệm vụ" searchable value={filter.idNhomNv} onChange={(value) => setField("idNhomNv", value)}
        options={[{ value: "", label: "Tất cả nhóm" }, ...(config?.Nhom || []).map((n) => ({ value: n.IdNhomNv, label: n.TenNhom }))]} /></label>
        <label className="cd-field">Nguồn<SearchSelect ariaLabel="Nguồn" value={filter.nguon} onChange={(value) => setField("nguon", value)}
          options={[{ value: "", label: "Tất cả nguồn" }, { value: 1, label: "Nhiệm vụ Khoa" }, { value: 2, label: "Nhiệm vụ Trường giao" }]} /></label>
        <label className="cd-field">Trạng thái<SearchSelect ariaLabel="Trạng thái" value={filter.trangThai} onChange={(value) => setField("trangThai", value)}
          options={[{ value: "", label: "Tất cả trạng thái" }, ...Object.entries(api.TRANG_THAI).map(([value, label]) => ({ value, label }))]} /></label>
        <label className="cd-field">Tìm nhiệm vụ<input maxLength={100} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nhập từ khóa" /></label>
        <label className="nvpv-check"><input type="checkbox" checked={filter.chiMoDangKy} onChange={(e) => setField("chiMoDangKy", e.target.checked)} />Chỉ đang mở đăng ký</label>
      </div>
    </>}
    {error && <p role="alert" className="nvpv-error">{error} <button onClick={refresh}>Thử lại</button></p>}
    {(loading || (configLoading && selectedNam)) && <p role="status">Đang tải nhiệm vụ PVCĐ...</p>}
    {!loading && data && mode === "mine" && <>
      <div className="nvpv-stats">{[["TongDiemThucTe", "Điểm thực tế vào phiếu"], ["TongDiemQuyDoi", "Tổng điểm quy đổi"], ["SoNhiemVuHoanThanh", "Nhiệm vụ hoàn thành"], ["SoDangThamGia", "Đang tham gia"]].map(([key, label]) => <div key={key}><span>{label}</span><b>{data.Header?.[key] ?? "-"}</b></div>)}</div>
      <h3>Nhiệm vụ PVCĐ</h3><TaskTable items={data.Items || []} onOpen={setDetailId} empty="Bạn chưa tham gia nhiệm vụ nào trong năm này." />
      <h3>Đang mở đăng ký tại Khoa của tôi</h3><TaskTable items={data.MoDangKy || []} onOpen={setDetailId} empty="Chưa có nhiệm vụ đang mở đăng ký." />
    </>}
    {!loading && data && mode === "manage" && <><TaskTable items={data.Items || []} onOpen={setDetailId} /><div className="nvpv-pagination"><span>{data.TotalCount ?? 0} nhiệm vụ · Trang {data.Page ?? page}/{Math.max(1, data.TotalPages || 1)}</span><button disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Trang trước</button><button disabled={page >= Number(data.TotalPages || 1)} onClick={() => setPage((v) => v + 1)}>Trang sau</button></div></>}
    {!loading && data && mode === "summary" && <><div className="nvpv-stats">{SUMMARY_FIELDS.map(([key, label]) => <div key={key}><span>{label}</span><b>{data.Header?.[key] ?? "-"}</b></div>)}</div>
      <p className="nvpv-muted">Điểm Khoa thuộc phạm vi đang xem; điểm thực tế và điểm quy đổi tổng hợp từ mọi Khoa. Trần điểm: {data.Header?.TranDiem ?? config?.TranDiem}.</p>
      <div className="modern-table-card table-scroll"><table className="custom-table"><thead><tr><th>Giảng viên</th>{SCORE_FIELDS.map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead><tbody>{(data.Items || []).map((v) => <tr key={v.IdNhanVien}><td>{v.HoTen}<small>{v.MaNhanVien}</small></td>{SCORE_FIELDS.map(([key]) => <td key={key}>{v[key] ?? "-"}</td>)}</tr>)}{!data.Items?.length && <tr><td colSpan={10}>Chưa có số liệu tổng hợp.</td></tr>}</tbody></table></div></>}
    {creating && config && <Dialog draggable={false} visible modal header="Tạo nhiệm vụ PVCĐ" closable={!saving} closeOnEscape={!saving} onHide={() => { if (!saving) setCreating(false); }} className="nvpv-dialog" style={{ width: "850px" }} breakpoints={{ "900px": "96vw" }}><div className="nvpv">{createError && <p role="alert" className="nvpv-error">{createError}</p>}<NhiemVuForm config={config} namList={namList} idNam={selectedNam} idDonVi={khoa} busy={saving} onSave={create} onCancel={() => setCreating(false)} /></div></Dialog>}
    {detailId != null && <NhiemVuPhucVuDetail key={detailId} id={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />}
  </div>;
}
