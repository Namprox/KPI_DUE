import React, { useRef, useState } from "react";
import { confirmDialog } from "primereact/confirmdialog";
import useNamDanhGia from "../../hooks/useNamDanhGia";
import { importGiamTru } from "../../utils/giamTruApi";
import "../../css/Pages.css";
import "../../css/HocVuSinhVien.css";
import "../../css/MauGiamTru.css";

const STATS = [
  ["TotalRowsRead", "Dòng đã đọc"], ["ValidRows", "Dòng hợp lệ"],
  ["GiamTruDaLuu", "Bản ghi giảm trừ đã lưu"], ["ConNhoDaLuu", "Thông tin con nhỏ đã lưu"],
  ["SkippedRows", "Dòng thiếu thông tin"], ["DuplicateRows", "Dòng trùng mã"],
  ["KhongCoNhanVien", "Dòng chưa có nhân viên"], ["SoNhanVien", "Nhân viên trong file"],
  ["NhanVienTaoMoi", "Nhân viên tạo mới"], ["NhanVienCapNhat", "Nhân viên cập nhật"],
  ["ChucDanhThayDoi", "Thay đổi chức danh"], ["DonViChucVuThayDoi", "Thay đổi đơn vị / chức vụ"],
  ["GiuNguyenAdmin", "Giữ nguyên đơn vị / chức vụ ADMIN"], ["EmailBoTrong", "Email để trống"],
  ["NhanVienNgoaiFile", "Nhân viên ngoài file"],
];
const LOAI = {
  DON_VI: "Thiếu đơn vị", CHUC_DANH: "Thiếu chức danh", CHUC_VU: "Thiếu chức vụ",
  DON_VI_TRUNG_TEN: "Đơn vị trùng tên", CHUC_DANH_TRUNG_TEN: "Chức danh trùng tên",
  CHUC_VU_TRUNG_TEN: "Chức vụ trùng tên", TRUNG_MA: "Trùng mã nhân viên",
  EMAIL_BO_TRONG: "Email để trống", EMAIL_GIU_NGUYEN: "Giữ nguyên email",
  GIU_ADMIN: "Giữ nguyên quyền ADMIN", KHONG_CO_NHAN_VIEN: "Chưa có nhân viên",
};

function UploadForm({ idNam, busy, setBusy }) {
  const [file, setFile] = useState(null);
  const [capNhatNhanVien, setCapNhatNhanVien] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);
  const inputRef = useRef(null);
  const pending = useRef(false);

  const chooseFile = (next) => {
    setResult(null);
    setMessage(null);
    if (next && (!/\.(xlsx|xls)$/i.test(next.name) || next.size === 0)) {
      setFile(null);
      setMessage({ type: "error", text: "Vui lòng chọn file Excel .xls hoặc .xlsx có dữ liệu." });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(next);
  };

  const upload = async () => {
    if (pending.current || !file || !idNam) return;
    pending.current = true;
    setBusy(true);
    setResult(null);
    setMessage(null);
    try {
      const body = await importGiamTru({ file, idNam, capNhatNhanVien });
      setResult(body);
      setMessage({ type: "success", text: body.Message || "Upload mẫu giảm trừ thành công." });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      setResult(error.result || null);
      setMessage({ type: "error", text: error.message || "Không kết nối được máy chủ." });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return <>
    <div className="giam-tru-layout">
      <section className="hoc-vu-upload-card">
        <div className="hoc-vu-upload-card-header">
          <h3><i className="fa-solid fa-file-excel" aria-hidden="true" /> Upload mẫu giảm trừ</h3>
          <span className="status-pill pill-blue">Năm {idNam || "—"}</span>
        </div>
        <label className="hoc-vu-dropzone" onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (!busy) chooseFile(e.dataTransfer.files[0] || null); }}>
          <div className="hoc-vu-dropzone-icon"><i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" /></div>
          <div className="hoc-vu-dropzone-text">
            <strong>{file ? file.name : "Nhấn để chọn hoặc kéo thả file Excel"}</strong>
            <span className="hoc-vu-file-subtext">{file ? `${(file.size / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} KB • Nhấn để đổi file` : "Hỗ trợ định dạng .xlsx, .xls"}</span>
          </div>
          <input ref={inputRef} aria-label="File mẫu giảm trừ" type="file" accept=".xls,.xlsx" disabled={busy || !idNam}
            onChange={(e) => chooseFile(e.target.files[0] || null)} />
        </label>
        <label className="giam-tru-option">
          <input type="checkbox" checked={capNhatNhanVien} disabled={busy} onChange={(e) => setCapNhatNhanVien(e.target.checked)} />
          <span><strong>Đồng thời cập nhật danh sách nhân viên</strong><small>Tạo nhân viên chưa có; cập nhật họ tên, chức danh, đơn vị chính và chức vụ theo file.</small></span>
        </label>
        <div className="hoc-vu-alert-warning">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <div>Upload sẽ ghi đè dữ liệu giảm trừ của năm <strong>{idNam || "được chọn"}</strong>.
            {!capNhatNhanVien && " Chỉ lưu cho nhân viên đã có trong hệ thống; mã chưa có sẽ bị bỏ qua."}</div>
        </div>
        <button className="btn-add-new hoc-vu-upload-btn" disabled={busy || !file || !idNam} onClick={() => confirmDialog({
          header: "Xác nhận upload mẫu giảm trừ",
          message: `Upload file “${file.name}” sẽ ghi đè dữ liệu giảm trừ năm ${idNam}.${capNhatNhanVien ? " Đồng thời tạo / cập nhật hồ sơ nhân viên theo file." : " Chỉ lưu giảm trừ cho nhân viên đã có."} Tiếp tục?`,
          icon: "pi pi-exclamation-triangle", acceptLabel: "Upload", rejectLabel: "Hủy", accept: upload,
        })}>
          <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-upload"}`} aria-hidden="true" />
          {busy ? "Đang xử lý..." : "Upload dữ liệu"}
        </button>
      </section>
      <aside className="hoc-vu-upload-card giam-tru-guide">
        <div className="hoc-vu-upload-card-header"><h3><i className="fa-solid fa-circle-info" aria-hidden="true" /> Hướng dẫn chuẩn bị file</h3></div>
        <ul>
          <li>Sử dụng file “Mẫu giảm trừ”, dữ liệu nằm ở <strong>sheet đầu tiên</strong>.</li>
          <li>Giữ nguyên tiêu đề gộp 2 dòng và thứ tự cột của mẫu.</li>
          <li>Bắt buộc có <strong>B: Mã CBVC, D: Họ và tên, F: Đơn vị</strong>.</li>
          <li>Tên đơn vị, chức danh và chức vụ phải khớp danh mục đang hoạt động.</li>
          <li>Ngày ghi theo dạng <strong>dd/MM/yyyy</strong>. Nhiều ngày sinh con nhỏ tại cột V được ngăn bằng xuống dòng.</li>
          <li>Kiểm tra cảnh báo sau upload: dữ liệu giảm trừ sai định dạng có thể bị để trống.</li>
        </ul>
      </aside>
    </div>
    {message && <div className={`hoc-vu-banner ${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</div>}
    {result && <section className="hoc-vu-upload-card giam-tru-result">
      <div className="hoc-vu-upload-card-header"><h3>Kết quả xử lý năm {result.IdNam ?? idNam}</h3></div>
      {result.ErrorCode && <p>Mã lỗi: {result.ErrorCode}</p>}
      {result.Success === true && <div className="hoc-vu-stats-grid">
        {STATS.filter(([key]) => result[key] != null).map(([key, label]) => <div className="hoc-vu-stat-pill" key={key}>
          <strong>{Number(result[key]).toLocaleString("vi-VN")}</strong><span>{label}</span>
        </div>)}
      </div>}
      {result.Warnings?.length > 0 && <details open><summary>Cảnh báo ({result.Warnings.length})</summary>
        <ul>{result.Warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
      </details>}
      {result.ChiTiet?.length > 0 && <div className="table-responsive"><table className="custom-table">
        <thead><tr><th>Nội dung</th><th>Giá trị</th><th>Mã nhân viên</th><th>Dòng Excel</th><th>Số dòng</th></tr></thead>
        <tbody>{result.ChiTiet.map((row, index) => <tr key={index}>
          <td>{LOAI[row.Loai] || row.Loai}</td><td>{row.GiaTri || "—"}</td><td>{row.MaNhanVien || "—"}</td>
          <td>{row.DongExcel ?? "—"}</td><td>{row.SoDong ?? "—"}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>}
  </>;
}

export default function MauGiamTru() {
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const [busy, setBusy] = useState(false);
  return <div className="page-container hoc-vu-page giam-tru-page">
    <div className="page-header"><div className="header-title">
      <h2>Mẫu giảm trừ</h2><span className="breadcrumb">Nhập dữ liệu giảm trừ định mức của cán bộ, viên chức theo từng năm</span>
    </div></div>
    <div className="hoc-vu-toolbar"><div className="hoc-vu-year-control">
      <label htmlFor="giam-tru-nam"><i className="fa-solid fa-calendar" aria-hidden="true" /> Năm đánh giá</label>
      <select id="giam-tru-nam" className="form-input" value={selectedNam} disabled={busy || dangTaiNam} onChange={(e) => setSelectedNam(e.target.value)}>
        {!namList.length && <option value="">{dangTaiNam ? "Đang tải năm..." : "Chưa có năm đánh giá"}</option>}
        {namList.map((nam) => <option key={nam.IdNam} value={nam.IdNam}>{nam.TenNam || nam.IdNam}</option>)}
      </select>
    </div><span className="status-pill pill-blue">Quản trị viên</span></div>
    {!dangTaiNam && !namList.length && <div className="hoc-vu-banner error" role="alert">Không có danh mục năm. Vui lòng kiểm tra năm đánh giá hoặc tải lại trang.</div>}
    <UploadForm key={selectedNam} idNam={selectedNam} busy={busy} setBusy={setBusy} />
  </div>;
}
