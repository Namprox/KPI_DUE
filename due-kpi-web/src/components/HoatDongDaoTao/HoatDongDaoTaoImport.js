import React, { useState } from "react";
import { Dialog } from "primereact/dialog";
import { importDaoTao } from "../../utils/hoatDongDaoTaoApi";

export default function HoatDongDaoTaoImport({ idNam, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (preview) => {
    if (!file || busy) return;
    setBusy(true); setError("");
    try {
      const data = await importDaoTao(file, idNam, preview);
      setResult(data);
      if (!preview) onImported(data);
    } catch (e) { setError(e.message); if (preview) setResult(null); }
    finally { setBusy(false); }
  };
  const canConfirm = result?.ChiKiemTra === true && result.SoThem > 0;
  const footer = <>
    <button className="btn-cancel" onClick={onClose} disabled={busy}><i className="fa-solid fa-times" aria-hidden="true" /> Đóng</button>
    <button className="btn-submit" onClick={() => run(true)} disabled={!file || busy}><i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-file-circle-check"}`} aria-hidden="true" />{busy ? "Đang xử lý..." : "Kiểm tra file"}</button>
    <button className="btn-submit" onClick={() => run(false)} disabled={!canConfirm || busy}><i className="fa-solid fa-file-import" aria-hidden="true" />Xác nhận import</button>
  </>;
  return <Dialog visible header={`Import hoạt động đào tạo · Năm ${idNam}`} onHide={onClose} modal maskClassName="hddt-dialog-mask"
    className="hddt-dialog" style={{ width: "1050px" }} breakpoints={{ "1100px": "95vw" }} closable={!busy} closeOnEscape={!busy}
    closeIcon={<span aria-hidden="true">×</span>} footer={footer}
    pt={{ header: { className: "modal-header" }, content: { className: "modal-body" }, footer: { className: "modal-footer" } }}>
    <div className="hddt">
      <p>Kiểm tra file trước khi xác nhận. Chỉ thêm bản ghi mới; dòng trùng hoặc lỗi được bỏ qua. Tối đa 5000 dòng, đọc sheet đầu tiên.</p>
      <label className="hddt-field">File Excel (.xls, .xlsx)<input type="file" accept=".xls,.xlsx" disabled={busy} onChange={(e) => {
        const next = e.target.files?.[0] || null;
        setResult(null); setError("");
        if (next && !/\.xlsx?$/i.test(next.name)) { setFile(null); setError("Chọn file .xls hoặc .xlsx."); }
        else setFile(next);
      }} /></label>
      {error && <p role="alert" className="hddt-error">{error}</p>}
      {result && <>
        <p role="status" className="hddt-notice">{result.ChiKiemTra === true ? "Kết quả kiểm tra — chưa ghi dữ liệu." : "Kết quả import."} {result.Message}</p>
        <div className="hddt-summary"><span>Tổng dòng: <b>{result.TongDong}</b></span><span>{result.ChiKiemTra ? "Sẽ thêm" : "Đã thêm"}: <b>{result.SoThem}</b></span><span>Trùng: <b>{result.SoTrung}</b></span><span>Lỗi: <b>{result.SoLoi}</b></span><span>Cảnh báo: <b>{result.SoCanhBao}</b></span></div>
        {(result.Warnings || []).map((w, i) => <p className="hddt-warning" key={i}>{w}</p>)}
        <div className="hddt-table-scroll hddt-import-results"><table><thead><tr><th>Dòng Excel</th><th>Kết quả</th><th>Giảng viên</th><th>Loại / nội dung</th><th>Thông báo</th></tr></thead>
          <tbody>{(result.Dong || []).map((d, i) => <tr key={`${d.DongExcel}-${i}`}>
            <td>{d.DongExcel}</td><td><span className={`hddt-badge hddt-${d.KetQua}`}>
              {d.KetQua === "THEM" ? result.ChiKiemTra ? "Sẽ thêm" : "Đã thêm" : d.KetQua === "TRUNG" ? "Trùng · bỏ qua" : d.KetQua === "LOI" ? "Lỗi · bỏ qua" : d.KetQua}</span></td>
            <td>{d.HoTen || "—"}<small>{d.MaNhanVien}</small></td><td>{d.MaLoai || d.IdLoai || "—"}<small>{d.NoiDung}</small></td>
            <td>{d.ThongBao}{d.MaLoi && <small>{d.MaLoi}</small>}{d.CanhBao && <p className="hddt-warning">⚠ {d.CanhBao}</p>}</td>
          </tr>)}</tbody></table></div>
      </>}
    </div>
  </Dialog>;
}
