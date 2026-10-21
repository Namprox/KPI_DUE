import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import ObjectTabs from "../components/Common/ObjectTabs";
import SearchSelect from "../components/Common/SearchSelect";
import { getNhatKy, SU_KIEN, HANH_DONG, TAC_NHAN, LY_DO, rawValue, isSummary, logTime } from "../utils/nhatKyApi";
import "../css/Pages.css";
import "../css/NhatKyHeThong.css";

const TABS = [{ key: "dang-nhap", label: "Phiên đăng nhập", enabled: true }, { key: "thao-tac", label: "Thao tác dữ liệu", enabled: true }];
const number = (value) => value == null ? "—" : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const person = (name, code, id) => [name, code || (id == null ? null : `ID ${id}`)].filter(Boolean).join(" · ") || "—";

function Capacity({ item }) {
  if (!item) return null;
  return <section className="modern-table-card nk-capacity" aria-label="Dung lượng cơ sở dữ liệu">
    <div className="nk-toolbar"><strong>Dung lượng CSDL</strong><span>{item.PhienBan}</span></div>
    <p>Đã dùng <b>{number(item.DuLieuDaDungMb)} MB</b> · Cấp phát {number(item.DuLieuCapPhatMb)} MB{item.GioiHanMb != null && <> · Giới hạn {number(item.GioiHanMb)} MB</>}</p>
    {item.PhanTramGioiHan != null && <><progress aria-label="Phần trăm giới hạn dung lượng" max="100" value={item.PhanTramGioiHan} /><span> {number(item.PhanTramGioiHan)}%</span></>}
    {item.CanhBao === true && <p className="nk-alert" role="alert">CSDL sắp đầy: cần xoá nhật ký cũ. Hết dung lượng sẽ khiến mọi thao tác ghi lỗi. Quản trị CSDL thực hiện bằng script, không xoá trên giao diện.</p>}
    <div className="nk-stats">
      <div><b>Thao tác dữ liệu</b><br />{number(item.NhatKyThaoTacSoDong)} dòng · {number(item.NhatKyThaoTacMb)} MB<br /><small>Cũ nhất: {logTime(item.NhatKyThaoTacCuNhat)} (giờ máy chủ)</small></div>
      <div><b>Phiên đăng nhập</b><br />{number(item.NhatKyDangNhapSoDong)} dòng · {number(item.NhatKyDangNhapMb)} MB<br /><small>Cũ nhất: {logTime(item.NhatKyDangNhapCuNhat, true)}</small></div>
    </div>
    {!!item.TheoThang?.length && <details><summary>Thống kê theo bảng trong 12 tháng gần nhất</summary><div className="table-scroll"><table className="nk-table"><thead><tr><th>Tháng</th><th>Bảng</th><th>Dòng nhật ký</th><th>Dòng tác động</th></tr></thead><tbody>{item.TheoThang.map((r, i) => <tr key={i}><td>{r.Thang}</td><td>{r.TenBang}</td><td>{number(r.SoDongNhatKy)}</td><td>{number(r.SoDongTacDong)}</td></tr>)}</tbody></table></div></details>}
  </section>;
}

export default function NhatKyHeThong() {
  const [tab, setTab] = useState("dang-nhap");
  const [draft, setDraft] = useState({});
  const [query, setQuery] = useState({ page: 1, pageSize: 50 });
  const [reload, setReload] = useState(0);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState("");
  const [tables, setTables] = useState([]);
  const [capacity, setCapacity] = useState(null);
  const [metaErrors, setMetaErrors] = useState({});
  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailError, setDetailError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const session = tab === "dang-nhap";

  useEffect(() => {
    const controller = new AbortController();
    setCapacity(null); setTables([]); setMetaErrors({});
    [["thao-tac/bang", (data) => setTables(data.Items || [])], ["dung-luong", (data) => setCapacity(data.Item)]].forEach(([path, apply]) => {
      getNhatKy(path, {}, controller.signal).then((data) => { if (!controller.signal.aborted) apply(data); }).catch((err) => {
        if (!controller.signal.aborted) setMetaErrors((prev) => ({ ...prev, [path]: err.message }));
      });
    });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true); setError(""); setList(null);
    getNhatKy(tab, query, controller.signal).then((data) => { if (!controller.signal.aborted) setList(data); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [tab, query, reload]);

  useEffect(() => {
    if (detailId == null) return undefined;
    const controller = new AbortController();
    setDetail(null); setDetailError(""); setShowAll(false);
    getNhatKy(`thao-tac/${encodeURIComponent(detailId)}`, {}, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setDetail(data.Item || data); })
      .catch((err) => { if (!controller.signal.aborted) setDetailError(err.message); });
    return () => controller.abort();
  }, [detailId]);

  const switchTab = (next, filters = {}) => {
    setTab(next); setDraft(filters); setQuery({ ...filters, page: 1, pageSize: query.pageSize }); setValidation(""); setDetailId(null);
  };
  const field = (key, label, options, type = "text") => <label className="nk-field" key={key}>{label}
    {options ? <SearchSelect ariaLabel={label} value={draft[key] || ""} onChange={(v) => setDraft({ ...draft, [key]: v })}
      options={[{ value: "", label: "Tất cả" }, ...options.map(([value, text, disabled]) => ({ value, label: text, disabled }))]} />
      : <input type={type} min={type === "number" ? 1 : undefined} step={type === "number" ? 1 : undefined} value={draft[key] || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />}
  </label>;
  const requestLink = (id) => id ? <button className="nk-link" title="Xem thao tác cùng yêu cầu" onClick={() => switchTab("thao-tac", { maYeuCau: id })}>{id}</button> : "—";
  const action = (row) => <>{HANH_DONG[row.HanhDong] || row.TenHanhDong}{isSummary(row) && <div>Import {number(row.SoDong)} dòng (tóm tắt)</div>}{row.HanhDong === 4 && <div>{row.KhoaBanGhiCu != null && row.KhoaBanGhi != null ? `Đổi khoá: ${row.KhoaBanGhiCu} → ${row.KhoaBanGhi}` : "Đổi nhiều dòng, không ghép được khoá; xem cùng mã yêu cầu."}</div>}</>;
  const actor = (row) => <>{TAC_NHAN[row.LoaiTacNhan] || row.TenLoaiTacNhan}{row.LoaiTacNhan === 1 && <div>{person(row.HoTenNguoiThucHien, row.MaNguoiThucHien, row.IdNguoiThucHien)}</div>}{row.LoaiTacNhan === 3 && <div>SQL: {row.TenDangNhapSql || "—"}<br />Ứng dụng: {row.UngDung || "—"}</div>}</>;

  return <div className="page-container nk-page">
    <div className="page-header nk-toolbar"><div className="header-title"><h2>Nhật ký hệ thống</h2><span className="breadcrumb">Quản trị hệ thống / Tra cứu nhật ký</span></div><button className="btn-cancel" onClick={() => setReload((n) => n + 1)}>Tải lại</button></div>
    {Object.entries(metaErrors).map(([key, message]) => <p role="alert" className="nk-alert" key={key}>{key === "dung-luong" ? "Dung lượng" : "Bảng đang theo dõi"}: {message}</p>)}
    <Capacity item={capacity} />
    {tables.filter((r) => r.DangBat === true && r.TriggerDangChay === false).map((r) => <p role="alert" className="nk-alert" key={r.TenBang}>Nhật ký bảng {r.TenBang} chưa hoạt động – báo quản trị CSDL.</p>)}
    <ObjectTabs types={TABS} currentType={tab} onChange={(next) => switchTab(next)} />
    <form className="modern-table-card nk-filters" onSubmit={(e) => {
      e.preventDefault();
      if (draft.tuNgay && draft.denNgay && draft.tuNgay > draft.denNgay) { setValidation("Từ ngày phải trước hoặc bằng đến ngày."); return; }
      if (draft.maYeuCau && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.maYeuCau)) { setValidation("Mã yêu cầu phải là UUID hợp lệ."); return; }
      setValidation(""); setQuery({ ...draft, page: 1, pageSize: query.pageSize });
    }}>
      {session ? <>{field("idNhanVien", "ID nhân viên", null, "number")}{field("tenDangNhap", "Tên đăng nhập (tiền tố)")}{field("diaChiIp", "Địa chỉ IP")}{field("loaiSuKien", "Sự kiện", Object.entries(SU_KIEN))}{field("thanhCong", "Kết quả", [["true", "Thành công"], ["false", "Thất bại"]])}</>
        : <>{field("tenBang", "Bảng", tables.map((r) => [r.TenBang, `${r.TenBang}${r.DangBat ? "" : " (chưa bật)"}`, !r.DangBat]))}{field("khoaBanGhi", "Khoá bản ghi (ghép bằng |)")}{field("hanhDong", "Hành động", Object.entries(HANH_DONG))}{field("loaiTacNhan", "Tác nhân", Object.entries(TAC_NHAN))}{field("idNguoiThucHien", "ID người thực hiện", null, "number")}</>}
      {field("maYeuCau", "Mã yêu cầu (UUID)")}{field("tuNgay", "Từ ngày", null, "date")}{field("denNgay", "Đến ngày", null, "date")}
      <div className="nk-filter-actions"><button className="btn-submit" type="submit">Tra cứu</button><button className="btn-cancel" type="button" onClick={() => switchTab(tab)}>Xoá bộ lọc</button></div>
      <small className="nk-wide">Ngày lọc theo giờ máy chủ; đến ngày bao gồm trọn ngày. {session ? "Thời gian phiên hiển thị theo giờ máy của bạn." : "Thời gian thao tác hiển thị theo giờ máy chủ."} Danh sách mới nhất trước.</small>
      {validation && <p className="nk-alert nk-wide" role="alert">{validation}</p>}
    </form>
    {error && <p role="alert" className="nk-alert">{error}</p>}
    <div className="modern-table-card" aria-busy={busy}>
      {busy ? <p className="nk-empty" role="status">Đang tải nhật ký...</p> : !error && <>
        <div className="table-scroll"><table className="nk-table"><thead><tr><th>Thời gian</th><th>{session ? "Sự kiện / Kết quả" : "Bảng / Hành động"}</th><th>{session ? "Nhân viên của phiên" : "Tác nhân"}</th><th>Thông tin</th><th>Mã yêu cầu</th>{!session && <th>Tra cứu</th>}</tr></thead><tbody>
          {(list?.Items || []).map((row) => <tr key={row.Id} className={!session && row.LoaiTacNhan === 3 ? "nk-external" : ""}>
            <td>{logTime(row.ThoiGian, session)}</td>
            <td>{session ? <>{SU_KIEN[row.LoaiSuKien] || row.TenLoaiSuKien}<div className={row.ThanhCong ? "nk-success" : "nk-failure"}>{row.ThanhCong ? "Thành công" : "Thất bại"}</div>{!row.ThanhCong && <div>{LY_DO[row.LyDoThatBai] || row.LyDoThatBai || "Không có lý do được ghi"}</div>}</> : <><b>{row.TenBang}</b><div>{action(row)}</div></>}</td>
            <td>{session ? <>{person(row.HoTen, row.MaNhanVien, row.IdNhanVien)}<div>{row.TenDangNhap || "—"}</div>{row.LoaiSuKien === 5 && <div>Người đặt lại: {person(row.HoTenNguoiThucHien, row.MaNguoiThucHien, row.IdNguoiThucHien)}</div>}</> : actor(row)}</td>
            <td>IP: {row.DiaChiIp || "—"}{session ? <div className="nk-agent">{row.UserAgent || "—"}</div> : <><div>{row.Nguon || "—"}</div>{!isSummary(row) && <div>Khoá: {row.KhoaBanGhi ?? "—"}</div>}<div>{row.CacTruongThayDoi?.join(", ")}</div></>}</td>
            <td>{requestLink(row.MaYeuCau)}</td>
            {!session && <td>{!isSummary(row) && <button className="nk-link" onClick={() => setDetailId(row.Id)}>Chi tiết</button>}{!isSummary(row) && row.KhoaBanGhi != null && <button className="nk-link" onClick={() => switchTab("thao-tac", { tenBang: row.TenBang, khoaBanGhi: row.KhoaBanGhi })}>Lịch sử bản ghi</button>}</td>}
          </tr>)}
          {!list?.Items?.length && <tr><td colSpan={session ? 5 : 6} className="nk-empty">Không có nhật ký phù hợp.</td></tr>}
        </tbody></table></div>
      </>}
      <div className="nk-toolbar nk-pagination"><span>{number(list?.TotalCount)} bản ghi · Trang {list?.Page || query.page} / {list?.TotalPages || 1}</span><div className="nk-toolbar">
        <label>Số dòng <SearchSelect ariaLabel="Số dòng mỗi trang" value={query.pageSize} onChange={(v) => setQuery({ ...query, page: 1, pageSize: Number(v) })} options={[25, 50, 100, 200].map((n) => ({ value: n, label: String(n) }))} /></label>
        <button disabled={busy || !list || query.page <= 1} onClick={() => setQuery({ ...query, page: query.page - 1 })}>Trước</button><button disabled={busy || !list || query.page >= (list.TotalPages || 1)} onClick={() => setQuery({ ...query, page: query.page + 1 })}>Sau</button>
      </div></div>
    </div>
    <Dialog header="Chi tiết thao tác dữ liệu" visible={detailId != null} onHide={() => setDetailId(null)} style={{ width: "min(1000px, 95vw)" }} modal draggable={false}>
      {detailError ? <p role="alert" className="nk-alert">{detailError}</p> : !detail ? <p role="status">Đang tải chi tiết...</p> : <div className="nk-detail">
        <p><b>{detail.TenBang}</b> · {action(detail)} · {logTime(detail.ThoiGian)} (giờ máy chủ)</p>
        <p>{actor(detail)}</p><p>IP: {detail.DiaChiIp || "—"} · Nguồn: {detail.Nguon || "—"}</p><p>Mã yêu cầu: {requestLink(detail.MaYeuCau)}</p>
        {isSummary(detail) ? <p>Nhật ký tóm tắt không có chi tiết từng trường.</p> : <><label><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Hiện tất cả trường</label>
          <div className="table-scroll"><table className="nk-table"><thead><tr><th>Trường</th><th>Giá trị cũ</th><th>Giá trị mới</th></tr></thead><tbody>{(detail.CacTruong || []).filter((r) => showAll || r.CoThayDoi === true).map((r) => <tr className={r.CoThayDoi ? "nk-changed" : ""} key={r.Truong}><td>{r.Truong}</td><td><pre>{rawValue(r.GiaTriCu)}</pre></td><td><pre>{rawValue(r.GiaTriMoi)}</pre></td></tr>)}</tbody></table></div>
          {!(detail.CacTruong || []).some((r) => showAll || r.CoThayDoi === true) && <p>Không có trường {showAll ? "được ghi" : "thay đổi"}.</p>}</>}
      </div>}
    </Dialog>
  </div>;
}
