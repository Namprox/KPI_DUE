import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/api";
import SearchSelect from "../../components/Common/SearchSelect";
import { fetchDonViList } from "../../utils/donViApi";
import { layChiTietGioGiangTkb, layTongHopGioGiangTkb, layTyLeHoanThanhGioGiang, luuAnhXaGioGiangTkb } from "../../utils/gioGiangTkbApi";
import { CanhBaoChuaAnhXa, DiemGioGiang, GiaiTrinhGioGiang, LyDoCanhBaoGioGiang, TyLeGioGiang } from "./GioGiangTyLeDetails";
import { soGioGiang } from "../../utils/gioGiangTyLe";

const so = (value) => value == null ? "-" : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const SO_NGUOI_MOI_TRANG = 20;

const tenKyHoc = (kyHoc) => {
  const maKy = Number(kyHoc);
  if (!Number.isInteger(maKy)) return kyHoc || "-";

  const ky = maKy % 10;
  const namKetThuc = Math.floor(maKy / 10);
  const namBatDauHienThi = String(namKetThuc - 1).slice(-2).padStart(2, "0");
  const namKetThucHienThi = String(namKetThuc).slice(-2).padStart(2, "0");
  const tenKy = { 1: "Kỳ I", 2: "Kỳ II", 3: "Kỳ hè" }[ky];
  return tenKy
    ? `${tenKy} ${namBatDauHienThi}-${namKetThucHienThi}`
    : String(kyHoc);
};

export function GioGiangModal({ title, onClose, busy = false, children }) {
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
  return <GioGiangModal title={`Chi tiết giờ giảng - ${item.HoTen}`} onClose={onClose}>
    <p>{summary.TenKhoa || "Chưa ghi khoa"} · Giờ ĐH: <strong>{so(summary.GioChuanDaiHoc)}</strong> · Giờ SĐH: <strong>{so(summary.GioChuanSauDaiHoc)}</strong> · Tổng: <strong>{so(summary.GioChuanTrongNam)}</strong></p>
    {error ? <div className="ggtk-form-error" role="alert">{error}</div> : !data ? <p role="status">Đang tải chi tiết...</p> :
      <div className="table-scroll ggtk-detail-table-wrap"><table className="custom-table ggtk-table ggtk-detail-table">
        <colgroup>
          <col style={{ width: "6%" }} /><col style={{ width: "10%" }} /><col style={{ width: "19%" }} />
          <col style={{ width: "23%" }} /><col style={{ width: "11%" }} /><col style={{ width: "7%" }} />
          <col style={{ width: "7%" }} /><col style={{ width: "6%" }} /><col style={{ width: "11%" }} />
        </colgroup>
        <thead><tr><th>Hệ</th><th>Kỳ học</th><th>Lớp</th><th>Học phần</th><th>Ngôn ngữ</th><th>Sĩ số</th><th>Số tiết</th><th>Hệ số</th><th>Giờ chuẩn</th></tr></thead>
        <tbody>{(data.ChiTiet || []).map((row) => <tr key={row.IdChiTiet}>
          <td>{row.HeDaoTao === "DH" ? "ĐH" : row.HeDaoTao === "SDH" ? "SĐH" : "-"}</td><td>{tenKyHoc(row.KyHoc)}</td><td>{row.MaLopTinChi || "-"}</td>
          <td>{row.TenHocPhan || row.MaHocPhan || "-"}</td><td>{row.GiangTiengAnh === true ? "Tiếng Anh" : row.GiangTiengAnh === false ? "Tiếng Việt" : "-"}</td>
          <td className="ggtk-number">{so(row.SlSvDangKyHoc)}</td><td className="ggtk-number">{so(row.SoTietTrongNam)}</td><td className="ggtk-number">{so(row.HeSo)}</td><td className="ggtk-number ggtk-hours">{so(row.GioChuanTrongNam)}</td>
        </tr>)}{!data.ChiTiet?.length && <tr><td colSpan={9}>Chưa có chi tiết lớp.</td></tr>}</tbody>
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
        if (!response.ok || body.Success === false) throw new Error(body.Message || "Không tải được danh sách giảng viên");
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
  return <GioGiangModal title="Ánh xạ giảng viên" onClose={onClose} busy={saving}>
    <p><strong>{item.HoTen}</strong> · Khoa trong file: <strong>{item.TenKhoa || "Chưa ghi khoa"}</strong></p>
    <p className="ggtk-field-help">Chọn đúng người theo họ tên và khoa. Ánh xạ áp dụng cho cặp tên, khoa này qua các năm và được giữ khi import lại.</p>
    {item.IdNhanVien != null && <p>Hiện tại: {item.MaNhanVien} · {item.HoTenNhanVien} · {item.TenDonVi}</p>}
    <label className="ggtk-search-label">Tìm họ tên hoặc mã giảng viên
      <input type="search" value={search} disabled={saving} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
    </label>
    {error && <div className="ggtk-form-error" role="alert">{error}</div>}
    {loading ? <p role="status">Đang tìm giảng viên...</p> : <div className="table-scroll"><table className="custom-table">
      <thead><tr><th>Chọn</th><th>Mã giảng viên</th><th>Họ tên</th><th>Đơn vị chính</th></tr></thead>
      <tbody>{(data?.Items || []).map((person) => <tr key={person.IdNhanVien}>
        <td><input type="radio" name="ggtk-person" aria-label={`Chọn ${person.MaNhanVien}`} checked={selected?.IdNhanVien === person.IdNhanVien} disabled={saving} onChange={() => setSelected(person)} /></td>
        <td>{person.MaNhanVien}</td><td>{person.HoTen}{person.IdNhanVien === item.GoiYIdNhanVien && <span className="ggtk-badge is-info">API gợi ý theo tên, khoa</span>}</td><td>{person.TenDonVi || "-"}</td>
      </tr>)}{!data?.Items?.length && <tr><td colSpan={4}>Không tìm thấy giảng viên.</td></tr>}</tbody>
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

export function GiaiTrinhTheoNhanVien({ row, idNam, onViewTkb }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError("");
    layTyLeHoanThanhGioGiang(idNam, controller.signal, undefined, row.IdNhanVien)
      .then((body) => {
        if (controller.signal.aborted) return;
        if (!body.TyLeHoanThanh?.some((item) => item.IdNhanVien === row.IdNhanVien)) throw new Error("Không có dữ liệu giải trình của giảng viên này.");
        setData(body);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [idNam, row.IdNhanVien, retry]);
  if (error) return <div className="ggtk-load-state is-error" role="alert">{error}<button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>;
  if (!data) return <p className="ggtk-load-state" role="status">Đang tải diễn giải giờ giảng...</p>;
  return <GiaiTrinhGioGiang row={data.TyLeHoanThanh.find((item) => item.IdNhanVien === row.IdNhanVien)} dienGiai={data.DienGiai} onViewTkb={onViewTkb} />;
}

export function TongHopGioGiang({ idNam, revision = 0, tyLe = false, idNhanVien = undefined }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [donViList, setDonViList] = useState([]);
  const [idKhoa, setIdKhoa] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const [onlyUnscored, setOnlyUnscored] = useState(false);
  const [sort, setSort] = useState("");
  const [detail, setDetail] = useState(null);
  const [tkbDetail, setTkbDetail] = useState(null);

  useEffect(() => {
    if (idNhanVien) return undefined;
    let active = true;
    fetchDonViList().then((list) => {
      if (active) setDonViList(list);
    });
    return () => { active = false; };
  }, [idNhanVien]);

  useEffect(() => {
    if (!idNam) return undefined;
    const controller = new AbortController();
    setData(null); setError(""); setDetail(null); setTkbDetail(null);
    const request = tyLe
      ? layTyLeHoanThanhGioGiang(idNam, controller.signal, idKhoa, idNhanVien)
      : layTongHopGioGiangTkb(idNam, controller.signal, idKhoa);
    request
      .then((body) => { if (!controller.signal.aborted) setData(body); })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message); });
    return () => controller.abort();
  }, [idNam, idKhoa, revision, retry, tyLe, idNhanVien]);

  useEffect(() => { setPage(1); }, [idNam, idKhoa, search, onlyWarnings, onlyUnscored, sort]);

  const khoaOptions = useMemo(() => [
    { value: "", label: tyLe ? "Tất cả đơn vị trong phạm vi được xem" : "Tất cả Khoa" },
    ...donViList
      .filter((item) => tyLe || (Number(item.CapDonVi) === 2 && String(item.MaDonVi || "").toUpperCase().startsWith("K_")))
      .sort((a, b) => String(a.TenDonVi || "").localeCompare(String(b.TenDonVi || ""), "vi"))
      .map((item) => ({ value: String(item.IdDonVi), label: item.TenDonVi })),
  ], [donViList, tyLe]);

  const rows = (tyLe ? data?.TyLeHoanThanh : data?.TongHop) || [];
  const filteredRows = rows.filter((row) =>
    `${row.HoTen || ""} ${row.MaNhanVien || ""} ${row.TenDonVi || ""}`.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN")) &&
    (!onlyWarnings || !!row.CanhBao?.trim()) && (!onlyUnscored || row.DiemDuKien == null));
  if (sort === "don-vi") filteredRows.sort((a, b) => String(a.TenDonVi || "").localeCompare(String(b.TenDonVi || ""), "vi"));
  if (sort === "ty-le-tang" || sort === "ty-le-giam") filteredRows.sort((a, b) => {
    if (a.TyLeHoanThanh == null) return b.TyLeHoanThanh == null ? 0 : 1;
    if (b.TyLeHoanThanh == null) return -1;
    return sort === "ty-le-tang" ? a.TyLeHoanThanh - b.TyLeHoanThanh : b.TyLeHoanThanh - a.TyLeHoanThanh;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / SO_NGUOI_MOI_TRANG));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * SO_NGUOI_MOI_TRANG, currentPage * SO_NGUOI_MOI_TRANG);

  if (!idNam) return null;
  return <section className={`table-card ggtk-total-card${tyLe ? " ggtl-card" : ""}`}>
    <div className="ggtk-table-toolbar">
      <div><h3>{idNhanVien ? "Giờ giảng" : tyLe ? "Tỷ lệ hoàn thành giờ giảng" : "Tổng hợp giờ giảng"} năm {idNam}</h3><p>{tyLe ? "Giờ thực hiện, định mức sau giảm trừ và điểm dự kiến do hệ thống cung cấp." : "Giờ giảng dạy từ TKB + Phụ lục II đã duyệt. Các cột đều là giờ chuẩn."}</p></div>
      {!idNhanVien && <div className="ggtk-toolbar-controls">
        <div className="ggtk-search-box">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên giảng viên..." aria-label="Tìm theo tên giảng viên trong tổng hợp" />
        </div>
        <div className="ggtk-faculty-filter">
          <span>{tyLe ? "Đơn vị" : "Khoa"}</span>
          <SearchSelect name="ggtk-unit" ariaLabel={tyLe ? "Lọc tỷ lệ giờ giảng theo đơn vị" : "Lọc tổng hợp giờ giảng theo Khoa"} value={idKhoa} onChange={setIdKhoa} options={khoaOptions} />
        </div>
      </div>}
    </div>
    {tyLe && !idNhanVien && <div className="ggtl-filters">
      <label><input type="checkbox" checked={onlyWarnings} onChange={(e) => setOnlyWarnings(e.target.checked)} /> Chỉ dòng có cảnh báo</label>
      <label><input type="checkbox" checked={onlyUnscored} onChange={(e) => setOnlyUnscored(e.target.checked)} /> Chỉ dòng không chấm tự động</label>
      <SearchSelect name="ggtl-sort" ariaLabel="Sắp xếp tỷ lệ giờ giảng" value={sort} onChange={setSort} options={[
        { value: "", label: "Thứ tự mặc định" }, { value: "don-vi", label: "Theo đơn vị" },
        { value: "ty-le-tang", label: "Tỷ lệ tăng dần" }, { value: "ty-le-giam", label: "Tỷ lệ giảm dần" },
      ]} />
    </div>}
    {error ? <div className="ggtk-load-state is-error" role="alert">{error}<button onClick={() => setRetry(retry + 1)}>Thử lại</button></div> : !data ? <p className="ggtk-load-state" role="status">Đang tải tổng hợp...</p> : <>
      {!idNhanVien && <CanhBaoChuaAnhXa count={data.SoDongChuaAnhXa} />}
      {tyLe ? idNhanVien ? rows.length ? rows.map((row) => <div key={row.IdNhanVien} className="ggtl-personal">
        <dl className="ggtl-metrics">
          <div><dt>Tổng giờ</dt><dd>{soGioGiang(row.TongGio)}</dd></div>
          <div><dt>Định mức áp dụng</dt><dd>{soGioGiang(row.DinhMucApDung)}</dd></div>
          <div><dt>Tỷ lệ hoàn thành</dt><dd><TyLeGioGiang row={row} /></dd></div>
          <div><dt>Điểm dự kiến / tối đa</dt><dd><DiemGioGiang row={row} /></dd></div>
        </dl>
        <GiaiTrinhGioGiang row={row} dienGiai={data.DienGiai} onViewTkb={setTkbDetail} />
      </div>) : <p className="ggtk-load-state">Chưa có dữ liệu giờ giảng năm này.</p> :
        <div className="table-scroll"><table className="custom-table ggtk-table ggtl-table">
          <thead><tr>{["Mã NV", "Họ tên", "Đơn vị", "Chức danh", "Định mức gốc", "Định mức áp dụng", "Tổng giờ", "Tỷ lệ (%)", "Điểm dự kiến / tối đa", "Lý do / Cảnh báo", "Giải trình"].map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{pageRows.map((row) => <tr key={row.IdNhanVien}>
            <td>{row.MaNhanVien || "—"}</td><td><strong>{row.HoTen || "—"}</strong></td><td>{row.TenDonVi || "—"}</td><td>{row.TenChucDanh || "—"}</td>
            {["DinhMucGoc", "DinhMucApDung", "TongGio"].map((field) => <td className="ggtk-number" key={field}>{soGioGiang(row[field])}</td>)}
            <td className="ggtk-number"><TyLeGioGiang row={row} /></td><td><DiemGioGiang row={row} /></td><td><LyDoCanhBaoGioGiang row={row} /></td>
            <td><button className="btn-cancel" onClick={() => setDetail(row)} aria-label={`Giải trình giờ giảng của ${row.HoTen}`}>Xem</button></td>
          </tr>)}{!filteredRows.length && <tr><td colSpan={11}>Chưa có dữ liệu phù hợp.</td></tr>}</tbody>
        </table></div> : <div className="table-scroll"><table className="custom-table ggtk-table"><thead><tr><th>Giảng viên</th><th>Đơn vị chính</th><th>Giảng dạy ĐH</th><th>Giảng dạy SĐH</th><th>Tổng TKB</th><th>Phụ lục II – ĐH</th><th>Phụ lục II – SĐH</th><th>Tổng giờ</th></tr></thead>
        <tbody>{pageRows.map((row) => <tr key={row.IdNhanVien}><td><div className="ggtk-person-cell"><strong>{row.HoTen}</strong><span>{row.MaNhanVien}</span></div></td><td>{row.TenDonVi || "-"}</td>
          {["GioTkbDaiHoc", "GioTkbSauDaiHoc", "GioTkb", "GioDaiHoc", "GioSauDaiHoc", "TongGio"].map((field) => <td className="ggtk-number" key={field}>{so(row[field])}</td>)}
        </tr>)}{!filteredRows.length && <tr><td colSpan={8}>{rows.length ? "Không tìm thấy giảng viên phù hợp." : "Chưa có dữ liệu tổng hợp."}</td></tr>}</tbody>
      </table></div>}
      {!idNhanVien && <div className="table-foot">
        <span>Hiển thị <strong>{filteredRows.length ? (currentPage - 1) * SO_NGUOI_MOI_TRANG + 1 : 0}–{Math.min(currentPage * SO_NGUOI_MOI_TRANG, filteredRows.length)}</strong> / {filteredRows.length} giảng viên</span>
        <span>Năm đánh giá <strong>{idNam}</strong></span>
        {totalPages > 1 && <div className="ggtk-pagination" aria-label="Phân trang tổng hợp giờ giảng">
          <button type="button" className="btn-cancel" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trang trước</button>
          <span>Trang {currentPage} / {totalPages}</span>
          <button type="button" className="btn-cancel" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Trang sau</button>
        </div>}
      </div>}
    </>}
    {detail && <div hidden={!!tkbDetail}><GioGiangModal busy={!!tkbDetail} title={`Giải trình giờ giảng - ${detail.HoTen}`} onClose={() => { setDetail(null); setTkbDetail(null); }}><GiaiTrinhTheoNhanVien key={`${idNam}-${detail.IdNhanVien}`} row={detail} idNam={idNam} onViewTkb={setTkbDetail} /></GioGiangModal></div>}
    {tkbDetail && <ChiTietGioGiang item={tkbDetail} onClose={() => setTkbDetail(null)} />}
  </section>;
}
