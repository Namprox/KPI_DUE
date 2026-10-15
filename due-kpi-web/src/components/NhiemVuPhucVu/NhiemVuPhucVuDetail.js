import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import * as api from "../../utils/nhiemVuPhucVuApi";
import NhiemVuForm from "./NhiemVuForm";
import PhanCongForm from "./PhanCongForm";
import ChotForm from "./ChotForm";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/NhiemVuPhucVu.css";

const ACTIONS = [
  ["cong-bo", "Công bố nhiệm vụ", "ChoPhepCongBo"],
  ["trien-khai", "Triển khai nhiệm vụ", "ChoPhepTrienKhai"],
  ["dang-ky", "Đăng ký tham gia", "ChoPhepDangKy"],
  ["rut-dang-ky", "Rút đăng ký", "ChoPhepRutDangKy"],
  ["gui-bao-cao", "Gửi báo cáo", "ChoPhepGuiBaoCao"],
  ["tra-bao-cao", "Trả báo cáo", "ChoPhepTraBaoCao"],
  ["huy", "Hủy nhiệm vụ", "ChoPhepHuy"],
];

export default function NhiemVuPhucVuDetail({ id, onClose, onChanged }) {
  const [item, setItem] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState("");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState("");
  const [reason, setReason] = useState("");
  const [deadline, setDeadline] = useState("");
  const [report, setReport] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyRevision, setHistoryRevision] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [retry, setRetry] = useState(0);
  const { namList } = useNamDanhGia();
  const request = useRef(0);
  const writing = useRef(false);
  const fileInput = useRef(null);
  const changed = useRef(onChanged);
  changed.current = onChanged;
  const accept = useCallback((next) => {
    setItem(next); setReport(next?.BaoCao?.NoiDung || ""); setPanel("");
    setReason(""); setDeadline(api.gioInput(next?.HanDangKy)); setDeleteId(null);
    setHistoryRevision((v) => v + 1);
  }, []);
  useEffect(() => {
    const seq = ++request.current;
    setLoading(true); setItem(null); setConfig(null); setError(""); setConfigError(""); setNotice("");
    setPanel(""); setShowHistory(false); setHistory(null); setFile(null); setFileName("");
    (async () => {
      try {
        const next = await api.layNhiemVu(id);
        if (seq !== request.current) return;
        accept(next); setLoading(false);
      } catch (e) { if (seq === request.current) { setError(e.message); setLoading(false); } }
    })();
    return () => { request.current += 1; };
  }, [id, retry, accept]);
  const itemYear = item?.IdNam;
  const itemUnit = item?.IdDonVi;
  useEffect(() => {
    setConfig(null); setConfigError("");
    if (!itemYear || !itemUnit) return;
    let cancelled = false;
    api.layCauHinh({ idDonVi: itemUnit, idNam: itemYear })
      .then((c) => { if (!cancelled) setConfig(c); })
      .catch((e) => { if (!cancelled) setConfigError(e.message); });
    return () => { cancelled = true; };
  }, [itemYear, itemUnit, retry]);
  useEffect(() => {
    if (!showHistory) return;
    let cancelled = false;
    setHistoryLoading(true); setHistoryError(""); setHistory(null);
    api.layLichSu(id).then((r) => { if (!cancelled) setHistory(r); })
      .catch((e) => { if (!cancelled) setHistoryError(e.message); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [id, showHistory, historyRevision]);

  const run = async (operation, message = "Đã lưu thay đổi.") => {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError(""); setNotice("");
    const seq = request.current;
    try {
      const next = await operation();
      if (seq !== request.current) return;
      accept(next); setNotice(message); changed.current?.(next);
    } catch (e) {
      if (seq !== request.current) return;
      setError(e.message);
      // Never retry a write automatically. Invalidate the editor before reading the new revision.
      if (e.status === 409) {
        setItem(null); setPanel(""); setLoading(true); changed.current?.();
        try {
          const next = await api.layNhiemVu(id);
          if (seq === request.current) { accept(next); setNotice("Dữ liệu vừa thay đổi. Đã tải lại chi tiết; hãy kiểm tra và thực hiện lại thao tác."); }
        } catch (reloadError) { if (seq === request.current) setError(`${e.message} ${reloadError.message}`); }
        finally { if (seq === request.current) setLoading(false); }
      }
    } finally {
      writing.current = false;
      if (seq === request.current) setBusy(false);
    }
  };
  const members = api.thanhVienHienTai(item);
  const reportDirty = report !== (item?.BaoCao?.NoiDung || "");
  const checklist = [
    [members.filter((v) => v.MaVaiTro === "CT").length === 1, "Đúng một Chủ trì"],
    [!!item?.BaoCao?.NoiDung?.trim() && !reportDirty, "Nội dung báo cáo đã lưu"],
    [(item?.MinhChung || []).length > 0, "Có ít nhất một minh chứng PDF"],
  ];
  const checklistReady = checklist.every(([ok]) => ok);
  const currentAction = ACTIONS.find(([key]) => key === panel);
  const needsReason = ["huy", "tra-bao-cao"].includes(panel);
  const submitAction = (e) => {
    e.preventDefault();
    if (!currentAction || item?.[currentAction[2]] !== true) return;
    if (needsReason && !reason.trim()) { setError("Vui lòng nhập lý do."); return; }
    if (panel === "trien-khai" && deadline && deadline >= `${api.ngayInput(item.TuNgay)}T00:00:00`) { setError("Hạn đăng ký phải trước 00:00 ngày bắt đầu."); return; }
    if (panel === "gui-bao-cao" && !checklistReady) return;
    run(() => api.thaoTac(item, panel, needsReason ? { LyDo: reason.trim() } : panel === "trien-khai" ? { HanDangKy: deadline || null } : {}), `${currentAction[1]} thành công.`);
  };
  const upload = () => {
    const message = api.loiMinhChung(file, fileName, config, item?.MinhChung?.length || 0);
    if (message) { setError(message); return; }
    run(async () => {
      try {
        const next = await api.taiMinhChung(item, file, fileName);
        setFile(null); setFileName(""); if (fileInput.current) fileInput.current.value = "";
        return next;
      } catch (e) {
        // A successful upload followed by a failed read must not leave an old RowVersion editable.
        setItem(null); setPanel(""); changed.current?.();
        throw e;
      }
    }, "Đã tải minh chứng và cập nhật chi tiết.");
  };
  return <Dialog draggable={false} visible modal header="Chi tiết nhiệm vụ PVCĐ" onHide={() => { if (!busy) onClose(); }} closable={!busy} closeOnEscape={!busy}
    className="nvpv-dialog" style={{ width: "1080px" }} breakpoints={{ "1120px": "96vw" }}>
    <div className="nvpv">
      {error && <p role="alert" className="nvpv-error">{error} {!item && !loading && <button onClick={() => setRetry((v) => v + 1)}>Tải lại chi tiết</button>}</p>}
      {notice && <p role="status" className="nvpv-notice">{notice}</p>}
      {loading ? <p role="status">Đang tải chi tiết...</p> : item && <>
        <div className="nvpv-detail-title"><h3>{item.TenNhiemVu}</h3><span className={`cd-status-badge nvpv-status-${item.TrangThai}`}>{item.TenTrangThai || api.TRANG_THAI[item.TrangThai]}</span></div>
        <dl className="nvpv-details"><dt>Khoa / Năm</dt><dd>{item.TenDonVi} · {item.IdNam}</dd><dt>Nguồn / Nhóm</dt><dd>{item.TenNguon} · {item.TenNhom}</dd>
          <dt>Thời gian</dt><dd>{api.hienThiNgay(item.TuNgay)} – {api.hienThiNgay(item.DenNgay)}</dd><dt>Hạn đăng ký</dt><dd>{item.HanDangKy ? api.hienThiNgay(item.HanDangKy, true) : "Không mở tự đăng ký"} (giờ Việt Nam)</dd>
          <dt>Số lượng</dt><dd>{item.SoThanhVien}/{item.SoLuongToiDa} · Còn {item.SoSuatConLai ?? "—"} suất</dd><dt>Mô tả</dt><dd className="nvpv-pre">{item.MoTa || "—"}</dd>
        </dl>
        {item.LyDoHuy && <p className="nvpv-warning">Lý do hủy: {item.LyDoHuy}</p>}
        {configError && <p role="alert" className="nvpv-error">Không tải được cấu hình: {configError} <button disabled={busy} onClick={() => setRetry((v) => v + 1)}>Thử lại</button></p>}
        {config?.BayGio && <p className="nvpv-muted">Giờ máy chủ khi tải: {api.hienThiNgay(config.BayGio, true)} (Việt Nam).</p>}
        {Number(item.CuaToi?.NguonThamGia) === 2 && item.CuaToi?.DaRoi !== true && <p className="nvpv-notice">Bạn được phân công tham gia. Liên hệ Trưởng khoa nếu cần rút khỏi nhiệm vụ.</p>}
        <div className="nvpv-actions">
          {(item.ChoPhepSuaNoiDung === true || item.ChoPhepSuaHanDangKy === true) && <button disabled={busy || reportDirty || !config} onClick={() => setPanel("edit")}>Sửa nhiệm vụ</button>}
          {(item.ChoPhepPhanCong === true || item.ChoPhepDoiVaiTro === true) && <button disabled={busy || reportDirty || !config} onClick={() => setPanel("assign")}>Phân công / Vai trò</button>}
          {ACTIONS.filter(([, , flag]) => item[flag] === true).map(([key, label]) => <button key={key} disabled={busy || reportDirty || (key === "gui-bao-cao" && !checklistReady)} onClick={() => { setPanel(key); setReason(""); setError(""); }}>{label}</button>)}
          {item.ChoPhepChot === true && <button className="btn-submit" disabled={busy || reportDirty} onClick={() => setPanel("finalize")}>Chốt kết quả</button>}
        </div>
        {panel === "edit" && <NhiemVuForm key={item.RowVersion} item={item} config={config} namList={namList} busy={busy} onCancel={() => setPanel("")} onSave={(body) => run(() => api.luuNhiemVu(item.IdNhiemVu, body))} />}
        {panel === "assign" && <PhanCongForm key={item.RowVersion} item={item} config={config} busy={busy} onCancel={() => setPanel("")} onSave={(body) => run(() => api.thaoTac(item, "phan-cong", body))} />}
        {panel === "finalize" && <ChotForm key={item.RowVersion} item={item} busy={busy} onCancel={() => setPanel("")} onSave={(body) => run(() => api.thaoTac(item, "chot", body), `Đã chốt kết quả. ${api.HUONG_DAN_DIEM}`)} />}
        {currentAction && <form className="nvpv-form" onSubmit={submitAction}><h3>{currentAction[1]}</h3><fieldset disabled={busy}>
          {needsReason ? <label>Lý do bắt buộc<textarea required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
            : panel === "trien-khai" ? <label>Hạn đăng ký (để trống nếu chỉ phân công)<input type="datetime-local" step="1" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
            : <p>{panel === "gui-bao-cao" ? "Sau khi gửi, mọi chỉnh sửa bị khóa đến khi Trưởng khoa trả báo cáo." : `Xác nhận ${currentAction[1].toLowerCase()}?`}</p>}
          <div className="nvpv-actions"><button className="btn-submit" type="submit">Xác nhận {currentAction[1].toLowerCase()}</button><button type="button" onClick={() => setPanel("")}>Quay lại</button></div>
        </fieldset></form>}
        <h3>Thành viên và kết quả</h3>
        <div className="modern-table-card table-scroll"><table className="custom-table"><thead><tr><th>Thành viên</th><th>Vai trò / Nguồn tham gia</th><th>Trạng thái</th><th>Kết quả / Điểm</th></tr></thead><tbody>
          {(item.ThanhVien || []).map((v) => <tr key={v.IdThanhVien} className={v.DaRoi === true ? "nvpv-left" : ""}><td>{v.HoTen}{v.LaToi === true ? " (Tôi)" : ""}<small>{v.MaNhanVien}</small></td><td>{v.TenVaiTro}<small>{v.TenNguonThamGia}</small></td><td>{v.DaRoi === true ? "Đã rút / gỡ" : "Đang trong danh sách"}</td><td>{v.TenKetQua || "—"}{v.DiemSnapshot != null && <small>{v.DiemSnapshot} điểm</small>}{v.LyDoKhongHoanThanh && <small>{v.LyDoKhongHoanThanh}</small>}</td></tr>)}
          {!(item.ThanhVien || []).length && <tr><td colSpan={4}>Chưa có thành viên.</td></tr>}
        </tbody></table></div>
        {item.XemBaoCao === true && <section className="nvpv-section"><h3>Báo cáo chung và minh chứng</h3>
          {(Number(item.TrangThaiBaoCao) === 3 || item.BaoCao?.DaTraLai === true) && <p className="nvpv-warning">Báo cáo bị trả lại: {item.LyDoTraLai || item.BaoCao?.LyDoTraLai}</p>}
          <p className="nvpv-muted">{({ 0: "Chưa có báo cáo", 1: "Đang soạn", 2: "Chờ duyệt", 3: "Bị trả lại", 4: "Đã chốt" })[item.TrangThaiBaoCao] || "Chưa có báo cáo"} · Số lần gửi: {item.SoLanGui ?? item.BaoCao?.SoLanGui ?? 0} · Ngày gửi: {api.hienThiNgay(item.NgayGui || item.BaoCao?.NgayGui, true)}</p>
          {item.ChoPhepBaoCao === true ? <><label>Nội dung báo cáo<textarea rows={6} maxLength={4000} value={report} disabled={busy} onChange={(e) => setReport(e.target.value)} /></label><div className="nvpv-actions"><button disabled={busy || !reportDirty} onClick={() => run(() => api.luuBaoCao(item, report))}>Lưu báo cáo</button><span>{report.length}/4000 ký tự {reportDirty ? "· Chưa lưu" : ""}</span></div></> : <p className="nvpv-pre">{item.BaoCao?.NoiDung || "Chưa có nội dung báo cáo."}</p>}
          <ul className="nvpv-evidence">{(item.MinhChung || []).map((mc) => <li key={mc.IdMinhChung}><span>{mc.TenHienThi || mc.TenFileGoc}<small>{mc.KichThuocKb} KB · {mc.TenNguoiTaiLen}</small></span><a href={api.urlMinhChung(mc.IdMinhChung, true)} target="_blank" rel="noreferrer">Xem PDF</a><a href={api.urlMinhChung(mc.IdMinhChung)}>Tải về</a>{item.ChoPhepBaoCao === true && <button disabled={busy} onClick={() => setDeleteId(mc.IdMinhChung)}>Gỡ minh chứng</button>}</li>)}</ul>
          {deleteId != null && <div className="nvpv-warning">Xác nhận gỡ minh chứng này? <button disabled={busy || reportDirty} onClick={() => run(() => api.xoaMinhChung(deleteId))}>Xác nhận gỡ</button> <button disabled={busy} onClick={() => setDeleteId(null)}>Giữ lại</button></div>}
          {item.ChoPhepBaoCao === true && <div className="nvpv-form"><div className="nvpv-grid"><label>Minh chứng PDF<input ref={fileInput} type="file" accept={config?.Accept || ".pdf"} disabled={busy || !config} onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><label>Tên hiển thị (tùy chọn)<input value={fileName} maxLength={config?.MaxTenHienThiLength} disabled={busy} onChange={(e) => setFileName(e.target.value)} /></label></div><p className="nvpv-muted">{config ? `Tối đa ${config.MaxSoMinhChung} PDF, ${config.MaxFileSizeKb} KB/tệp.` : "Đang tải giới hạn minh chứng..."}</p><button disabled={busy || !config || !file || reportDirty} onClick={upload}>Tải minh chứng</button>{reportDirty && <small>Lưu nội dung báo cáo trước khi tải minh chứng.</small>}</div>}
          {item.LaChuTri === true && <><ul className="nvpv-checklist">{checklist.map(([ok, label]) => <li key={label}>{ok ? "✓" : "○"} {label}</li>)}</ul><p className="nvpv-muted">Chỉ được gửi từ ngày sau ngày kết thúc; quyền gửi theo thời gian máy chủ.</p></>}
        </section>}
        {Number(item.TrangThai) === 5 && <p className="nvpv-notice">{api.HUONG_DAN_DIEM}</p>}
        {(item.XemBaoCao === true || item.LaThanhVien === true || item.CuaToi || item.LaTruongKhoa === true || item.LaBanGiamHieu === true) && <section className="nvpv-section"><button onClick={() => setShowHistory((v) => !v)}>{showHistory ? "Ẩn lịch sử" : "Xem lịch sử"}</button>
          {showHistory && (historyLoading ? <p role="status">Đang tải lịch sử...</p> : historyError ? <p role="alert">{historyError} <button onClick={() => setHistoryRevision((v) => v + 1)}>Thử lại</button></p> : <ol className="nvpv-history">{(history || []).map((h) => <li key={h.Id}><b>{h.TenHanhDong}</b><small>{h.TenNguoiThucHien} · {api.hienThiNgay(h.NgayThucHien, true)}</small><p>{h.MoTa}</p></li>)}{history?.length === 0 && <li>Chưa có lịch sử.</li>}</ol>)}
        </section>}
      </>}
      <div className="nvpv-actions nvpv-footer"><button disabled={busy} onClick={onClose}>Đóng</button>{busy && <span role="status">Đang xử lý...</span>}</div>
    </div>
  </Dialog>;
}
