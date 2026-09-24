import React, { useCallback, useEffect, useMemo, useState } from "react";
import { confirmDialog } from "primereact/confirmdialog";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import { canManageHocVu } from "../../utils/roles";
import HocVuSinhVienDoiChieu from "./HocVuSinhVienDoiChieu";
import "../../css/Pages.css";
import "../../css/HocVuSinhVien.css";

const FILES = {
  sinhVien: {
    title: "Danh sách sinh viên",
    sheet: "Sheet1",
    columns: "MaKhoa, TenKhoa, namNhaphoc, maKhoahoc, LOP, MA_SINH_VIEN, hovaten, ThoiHoc, SO_HIEU_VAN_BANG_TOT_NGHIEP_CT1, NamTotNghiepNganh1",
    endpoint: "hoc-vu/import-sinh-vien",
    extra: [
      ["UpdatedRows", "Đã cập nhật"], ["SkippedNewerRows", "Bỏ qua bản ghi mới hơn"],
      ["ExcludedRows", "Loại trừ (Khoa 201 / lớp CTS)"], ["DuplicateRows", "Dòng trùng"],
      ["AutoMappedKhoa", "Khoa tự ánh xạ"], ["UnmappedKhoa", "Khoa chưa ánh xạ"],
    ],
  },
  canhBao: {
    title: "Cảnh báo học vụ",
    sheet: "Cảnh báo",
    columns: "MSV, Họ, Tên, Ghi chú CB, số QĐ, số TB",
    endpoint: "hoc-vu/import-canh-bao",
    extra: [["SoSinhVien", "Số sinh viên"], ["UnmatchedStudents", "Sinh viên không khớp"]],
  },
};

const COMMON_STATS = [
  ["TotalRowsRead", "Dòng đã đọc"], ["ValidRows", "Dòng hợp lệ"],
  ["SkippedRows", "Dòng bỏ qua"], ["InsertedRows", "Dòng đã thêm"],
  ["DeletedRows", "Dòng đã xóa"],
];

const number = (value) => Number(value ?? 0).toLocaleString("vi-VN");
const dateTime = (value) => value ? new Date(value).toLocaleString("vi-VN") : "Chưa upload";
const ratio = (value) => value == null
  ? <span title="Chưa có dữ liệu">—</span>
  : `${Number(value).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

const toKhoaHoc = (year) => {
  if (year == null || isNaN(year)) return "—";
  const num = Number(year);
  return num > 1974 ? String(num - 1974) : String(num);
};

const readResponse = async (response, fallback) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.Success === false) throw new Error(body.Message || fallback);
  return body;
};

function Stats({ result, fields }) {
  return (
    <div className="hoc-vu-stats-grid">
      {fields.filter(([key]) => result[key] != null).map(([key, label]) => (
        <div key={key} className="hoc-vu-stat-pill">
          <strong>{number(result[key])}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function UploadCard({ kind, idNam, busy, onUploadingChange, onUploaded, onShowMappings }) {
  const config = FILES[kind];
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setFile(null);
    setMessage(null);
    setResult(null);
  }, [idNam]);

  const upload = async () => {
    if (!file || !idNam || uploading) return;
    setUploading(true);
    onUploadingChange(true);
    setMessage(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("idNam", idNam);
      const response = await apiFetch(config.endpoint, { method: "POST", body: formData });
      const body = await readResponse(response, "Upload thất bại.");
      setResult(body);
      setMessage({ type: "success", text: body.Message || "Upload thành công." });
      onUploaded();
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Không kết nối được máy chủ." });
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  };

  const confirmUpload = () => confirmDialog({
    header: "Xác nhận upload",
    message: `Upload sẽ thay dữ liệu của năm ${idNam}. Tiếp tục?`,
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Tiếp tục", rejectLabel: "Hủy",
    accept: upload,
  });

  return (
    <section className="hoc-vu-upload-card">
      <div className="hoc-vu-upload-card-header">
        <h3>
          <i className="fa-solid fa-file-excel" aria-hidden="true" />
          {config.title}
        </h3>
        <span className="status-pill pill-blue">Excel</span>
      </div>

      <div className="hoc-vu-upload-rules">
        <div className="hoc-vu-upload-rules-row">
          <span className="hoc-vu-upload-rules-label">Tên Sheet:</span>
          <span className="code-pill">{config.sheet}</span>
        </div>
        <div className="hoc-vu-upload-rules-row">
          <span className="hoc-vu-upload-rules-label">Các cột cần có:</span>
          <span>{config.columns}</span>
        </div>
      </div>

      <label className="hoc-vu-dropzone">
        <div className="hoc-vu-dropzone-icon">
          <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
        </div>
        <div className="hoc-vu-dropzone-text">
          {file ? (
            <div className="hoc-vu-file-selected">
              <i className="fa-solid fa-file-excel" aria-hidden="true" />
              <span className="hoc-vu-file-name">{file.name}</span>
              <span className="hoc-vu-file-size">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          ) : (
            <>
              <strong>Nhấn để chọn tệp Excel</strong> hoặc kéo thả tệp vào đây
              <span className="hoc-vu-file-subtext">Hỗ trợ tệp định dạng .xlsx, .xls</span>
            </>
          )}
        </div>
        <input
          type="file"
          accept=".xls,.xlsx"
          disabled={busy}
          onChange={(event) => {
            setFile(event.target.files[0] || null);
            setMessage(null);
            setResult(null);
          }}
        />
      </label>

      <button
        type="button"
        className="btn-add-new hoc-vu-upload-btn"
        disabled={busy || !file || !idNam || !/\.xlsx?$/i.test(file.name)}
        onClick={confirmUpload}
      >
        <i className={`fa-solid ${uploading ? "fa-spinner fa-spin" : "fa-upload"}`} aria-hidden="true" />
        {uploading ? "Đang upload, vui lòng chờ giây lát..." : "Upload dữ liệu"}
      </button>

      {message && (
        <div
          className={`hoc-vu-banner hoc-vu-message ${message.type}`}
          role={message.type === "error" ? "alert" : "status"}
          style={{ marginTop: "16px", marginBottom: "0" }}
        >
          <i
            className={`fa-solid ${message.type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}`}
            aria-hidden="true"
          />
          <span>{message.text}</span>
        </div>
      )}

      {result && (
        <div className="hoc-vu-upload-result">
          <h4>Kết quả xử lý</h4>
          <Stats result={result} fields={[...COMMON_STATS, ...config.extra]} />
          {result.UnmappedKhoa > 0 && (
            <div className="hoc-vu-alert-warning" style={{ marginTop: "12px", marginBottom: "0" }}>
              <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
              <div>Còn <strong>{number(result.UnmappedKhoa)}</strong> mã Khoa chưa ánh xạ.</div>
              <button type="button" className="hoc-vu-warning-btn" onClick={onShowMappings}>
                Đến Ánh xạ Khoa
              </button>
            </div>
          )}
          {Array.isArray(result.Warnings) && result.Warnings.length > 0 && (
            <details>
              <summary>{number(result.Warnings.length)} cảnh báo từ tệp dữ liệu</summary>
              <ul>
                {result.Warnings.map((warning, index) => <li key={index}>{warning}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

export default function HocVuSinhVien() {
  const { user } = useAuth();
  const [tab, setTab] = useState("tyLe");
  const [years, setYears] = useState([]);
  const [idNam, setIdNam] = useState("");
  const [donViList, setDonViList] = useState([]);
  const [tyLe, setTyLe] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loadError, setLoadError] = useState("");
  const [mappingError, setMappingError] = useState("");
  const [notice, setNotice] = useState(null);
  const [loadingTyLe, setLoadingTyLe] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [busyMapping, setBusyMapping] = useState("");
  const [saveProgress, setSaveProgress] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reload, setReload] = useState(0);
  const [doiChieuSelection, setDoiChieuSelection] = useState({ loai: "tot-nghiep", idDonVi: "" });

  // Search & filter states
  const [searchKhoa, setSearchKhoa] = useState("");
  const [searchMapping, setSearchMapping] = useState("");
  const [mappingFilter, setMappingFilter] = useState("all"); // "all" | "unmapped" | "mapped"

  const canManage = canManageHocVu(user);
  const khoaList = useMemo(() => donViList.filter((item) =>
    Number(item.CapDonVi) === 2 && String(item.MaDonVi || "").toUpperCase().startsWith("K_")
  ), [donViList]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const responses = await Promise.allSettled([apiFetch("namdanhgia"), apiFetch("donvi")]);
      if (!active) return;
      for (let index = 0; index < responses.length; index += 1) {
        try {
          if (responses[index].status === "rejected") throw responses[index].reason;
          const body = await readResponse(responses[index].value, "Không tải được danh mục.");
          if (!active) return;
          const items = body.Items || (Array.isArray(body) ? body : []);
          if (index === 0) {
            const sorted = items.filter((item) => item.IdNam != null).sort((a, b) => Number(b.IdNam) - Number(a.IdNam));
            setYears(sorted);
            const currentYearStr = String(new Date().getFullYear());
            const currentYearItem = sorted.find((item) => String(item.IdNam) === currentYearStr);
            const defaultYear = currentYearItem ? String(currentYearItem.IdNam) : (sorted.length ? String(sorted[0].IdNam) : "");
            setIdNam(defaultYear);
          } else setDonViList(items);
        } catch (error) {
          if (active) setNotice({ type: "error", text: error.message || "Không tải được danh mục." });
        }
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!idNam) return undefined;
    const controller = new AbortController();
    setLoadingTyLe(true);
    setLoadError("");
    apiFetch(`hoc-vu/ty-le-khoa?idNam=${encodeURIComponent(idNam)}`, { signal: controller.signal })
      .then((response) => readResponse(response, "Không tải được tỷ lệ theo Khoa."))
      .then((body) => { if (!controller.signal.aborted) setTyLe(body); })
      .catch((error) => { if (!controller.signal.aborted) { setTyLe(null); setLoadError(error.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoadingTyLe(false); });
    return () => controller.abort();
  }, [idNam, reload]);

  const loadMappings = useCallback(async (draftsToKeep = {}) => {
    setLoadingMappings(true);
    setMappingError("");
    try {
      const response = await apiFetch("hoc-vu/anh-xa-khoa");
      const body = await readResponse(response, "Không tải được ánh xạ Khoa.");
      setMappings(body.Items || []);
      setDrafts(draftsToKeep);
    } catch (error) {
      setMappings([]);
      setMappingError(error.message);
    } finally {
      setLoadingMappings(false);
    }
  }, []);

  useEffect(() => { if (tab === "anhXa" && canManage) loadMappings(); }, [tab, canManage, loadMappings]);

  useEffect(() => {
    if (!canManage && tab !== "tyLe" && tab !== "doiChieu") setTab("tyLe");
  }, [canManage, tab]);

  const pendingMappings = mappings.filter((item) =>
    drafts[item.MaKhoa] != null && drafts[item.MaKhoa] !== "" &&
    String(drafts[item.MaKhoa]) !== String(item.IdDonVi)
  );

  const saveMappings = async () => {
    if (!canManage || busyMapping || pendingMappings.length === 0) return;
    setBusyMapping("all");
    setNotice(null);
    const failedDrafts = {};
    const errors = [];
    let saved = 0;
    try {
      for (const [index, item] of pendingMappings.entries()) {
        setSaveProgress(`${index + 1}/${pendingMappings.length}`);
        try {
          const response = await apiFetch("hoc-vu/anh-xa-khoa", {
            method: "POST",
            body: JSON.stringify({ maKhoa: item.MaKhoa, idDonVi: Number(drafts[item.MaKhoa]) }),
          });
          await readResponse(response, "Không lưu được ánh xạ Khoa.");
          saved += 1;
        } catch (error) {
          failedDrafts[item.MaKhoa] = drafts[item.MaKhoa];
          errors.push(`${item.MaKhoa}: ${error.message || "Không lưu được ánh xạ Khoa."}`);
        }
      }
      await loadMappings(failedDrafts);
      if (saved > 0) setReload((value) => value + 1);
      setNotice(errors.length
        ? { type: "error", text: `Đã lưu ${saved}/${pendingMappings.length} ánh xạ. Chưa lưu: ${errors.join("; ")}` }
        : { type: "success", text: `Đã lưu ${saved} ánh xạ Khoa.` });
    } finally {
      setSaveProgress("");
      setBusyMapping("");
    }
  };

  const deleteMapping = (item) => confirmDialog({
    header: "Xác nhận xóa ánh xạ",
    message: `Xóa ánh xạ mã Khoa ${item.MaKhoa}?`,
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Xóa", rejectLabel: "Hủy", acceptClassName: "p-button-danger",
    accept: async () => {
      setBusyMapping(item.MaKhoa);
      setNotice(null);
      try {
        const response = await apiFetch(`hoc-vu/anh-xa-khoa/${encodeURIComponent(item.MaKhoa)}`, { method: "DELETE" });
        const body = await readResponse(response, "Không xóa được ánh xạ Khoa.");
        setNotice({ type: "success", text: body.Message || "Đã xóa ánh xạ Khoa." });
        const remainingDrafts = Object.fromEntries(
          Object.entries(drafts).filter(([maKhoa]) => maKhoa !== item.MaKhoa)
        );
        await loadMappings(remainingDrafts);
        setReload((value) => value + 1);
      } catch (error) { setNotice({ type: "error", text: error.message }); }
      finally { setBusyMapping(""); }
    },
  });

  const overview = tyLe?.TongQuan;
  const items = useMemo(() => tyLe?.Items || [], [tyLe]);

  // Filter items in TyLe table
  const filteredItems = useMemo(() => {
    if (!searchKhoa.trim()) return items;
    const q = searchKhoa.trim().toLowerCase();
    return items.filter((item) =>
      (item.TenDonVi || "").toLowerCase().includes(q) ||
      (item.MaDonVi || "").toLowerCase().includes(q) ||
      (item.MaKhoaDaoTao || "").toLowerCase().includes(q)
    );
  }, [items, searchKhoa]);

  // Filter mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter((item) => {
      if (mappingFilter === "unmapped" && item.IdDonVi != null) return false;
      if (mappingFilter === "mapped" && item.IdDonVi == null) return false;
      if (searchMapping.trim()) {
        const q = searchMapping.trim().toLowerCase();
        const matchCode = (item.MaKhoa || "").toLowerCase().includes(q);
        const matchName = (item.TenKhoa || "").toLowerCase().includes(q);
        const matchSys = (item.TenDonVi || item.MaDonVi || "").toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchSys) return false;
      }
      return true;
    });
  }, [mappings, mappingFilter, searchMapping]);

  const mappedCount = useMemo(() => mappings.filter((m) => m.IdDonVi != null).length, [mappings]);
  const unmappedCount = mappings.length - mappedCount;
  const openDoiChieu = (loai, idDonVi) => {
    setDoiChieuSelection({ loai, idDonVi: tyLe?.XemTatCa ? idDonVi : "" });
    setTab("doiChieu");
  };

  return (
    <div className="page-container hoc-vu-page">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div className="header-title">
          <h2>QUẢN LÝ HỌC VỤ</h2>
          <span className="breadcrumb">
            Theo dõi tỷ lệ tốt nghiệp đúng hạn, cảnh báo học vụ theo Khoa và đối chiếu sinh viên
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="hoc-vu-toolbar">
        <div className="hoc-vu-tabs" role="tablist" aria-label="Nội dung quản lý học vụ">
          <button
            type="button"
            role="tab"
            disabled={uploading}
            aria-selected={tab === "tyLe"}
            className={`hoc-vu-tab-btn ${tab === "tyLe" ? "active" : ""}`}
            onClick={() => setTab("tyLe")}
          >
            <i className="fa-solid fa-chart-pie" aria-hidden="true" />
            <span>Tỷ lệ theo Khoa</span>
          </button>
          <button
            type="button"
            role="tab"
            disabled={uploading}
            aria-selected={tab === "doiChieu"}
            className={`hoc-vu-tab-btn ${tab === "doiChieu" ? "active" : ""}`}
            onClick={() => setTab("doiChieu")}
          >
            <i className="fa-solid fa-users-viewfinder" aria-hidden="true" />
            <span>Đối chiếu sinh viên</span>
          </button>
          {canManage && (
            <button
              type="button"
              role="tab"
              disabled={uploading}
              aria-selected={tab === "upload"}
              className={`hoc-vu-tab-btn ${tab === "upload" ? "active" : ""}`}
              onClick={() => setTab("upload")}
            >
              <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
              <span>Upload dữ liệu</span>
            </button>
          )}
          {canManage && (
            <button
              type="button"
              role="tab"
              disabled={uploading}
              aria-selected={tab === "anhXa"}
              className={`hoc-vu-tab-btn ${tab === "anhXa" ? "active" : ""}`}
              onClick={() => setTab("anhXa")}
            >
              <i className="fa-solid fa-network-wired" aria-hidden="true" />
              <span>Ánh xạ Khoa</span>
            </button>
          )}
        </div>

        {tab !== "anhXa" && (
          <div className="hoc-vu-year-control">
            <label htmlFor="hoc-vu-year-select">
              <i className="fa-regular fa-calendar-check" aria-hidden="true" /> Năm đánh giá
            </label>
            <select
              id="hoc-vu-year-select"
              className="form-input"
              value={idNam}
              disabled={uploading}
              onChange={(event) => setIdNam(event.target.value)}
            >
              {years.length === 0 && <option value="">Chưa có năm</option>}
              {years.map((year) => (
                <option key={year.IdNam} value={year.IdNam}>
                  Năm {year.IdNam}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Global Notice Banner */}
      {notice && (
        <div
          className={`hoc-vu-banner hoc-vu-message ${notice.type}`}
          role={notice.type === "error" ? "alert" : "status"}
        >
          <i
            className={`fa-solid ${notice.type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}`}
            aria-hidden="true"
          />
          <span>{notice.text}</span>
          <button
            type="button"
            className="hoc-vu-banner-close"
            onClick={() => setNotice(null)}
            aria-label="Đóng thông báo"
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Tab: Tỷ lệ theo Khoa */}
      {tab === "tyLe" && (
        <>
          {loadError && (
            <div className="hoc-vu-banner hoc-vu-message error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
              <span>{loadError}</span>
              <button
                type="button"
                className="hoc-vu-warning-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => setReload((value) => value + 1)}
              >
                <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Thử lại
              </button>
            </div>
          )}

          {loadingTyLe && (
            <div className="hoc-vu-empty-state" style={{ padding: "60px 20px" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: "#0056b3" }} aria-hidden="true" />
              <h4>Đang tải dữ liệu tỷ lệ theo Khoa...</h4>
              <p>Vui lòng chờ trong giây lát.</p>
            </div>
          )}

          {!loadingTyLe && !loadError && tyLe && (
            <>
              {/* Khóa nhập học áp dụng cho cả cấp Khoa khi TongQuan là null. */}
              <div className="stat-card-grid">
                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-blue">
                    <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
                  </div>
                  <div className="stat-info">
                    <div className="stat-label">Khóa tốt nghiệp</div>
                    <div
                      className="stat-value"
                      title={tyLe.NamNhapHocTotNghiep != null ? `Năm nhập học: ${tyLe.NamNhapHocTotNghiep}` : undefined}
                    >
                      {tyLe.NamNhapHocTotNghiep != null ? toKhoaHoc(tyLe.NamNhapHocTotNghiep) : "—"}
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-amber">
                    <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                  </div>
                  <div className="stat-info">
                    <div className="stat-label">Khóa tính cảnh báo</div>
                    <div
                      className="stat-value"
                      title={
                        tyLe.NamNhapHocCanhBaoTu != null && tyLe.NamNhapHocCanhBaoDen != null
                          ? `Năm nhập học: ${tyLe.NamNhapHocCanhBaoTu} – ${tyLe.NamNhapHocCanhBaoDen}`
                          : undefined
                      }
                    >
                      {tyLe.NamNhapHocCanhBaoTu != null && tyLe.NamNhapHocCanhBaoDen != null
                        ? `${toKhoaHoc(tyLe.NamNhapHocCanhBaoTu)} - ${toKhoaHoc(tyLe.NamNhapHocCanhBaoDen)}`
                        : "—"}
                    </div>
                  </div>
                </div>

                {overview && <div className="stat-card">
                  <div className="stat-icon-box stat-icon-green">
                    <i className="fa-solid fa-users" aria-hidden="true" />
                  </div>
                  <div className="stat-info">
                    <div className="stat-label">Tổng số sinh viên</div>
                    <div className="stat-value">{number(overview.SoSinhVien)}</div>
                  </div>
                </div>}

                {overview && <div className="stat-card">
                  <div className="stat-icon-box stat-icon-purple">
                    <i className="fa-solid fa-file-circle-exclamation" aria-hidden="true" />
                  </div>
                  <div className="stat-info">
                    <div className="stat-label">Số dòng cảnh báo</div>
                    <div className="stat-value">{number(overview.SoDongCanhBao)}</div>
                  </div>
                </div>}
              </div>

              {/* Metadata Info Bar */}
              {overview && <div className="hoc-vu-meta-bar">
                <span>
                  <i className="fa-regular fa-clock" aria-hidden="true" /> Cập nhật sinh viên:{" "}
                  <strong>{dateTime(overview.NgayCapNhatSinhVien)}</strong>
                </span>
                <span className="hoc-vu-meta-divider">•</span>
                <span>
                  <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" /> Import cảnh báo:{" "}
                  <strong>{dateTime(overview.NgayImportCanhBao)}</strong>
                </span>
              </div>}

              {/* Unmapped Warnings */}
              {overview?.SoSinhVienChuaAnhXa > 0 && (
                <div className="hoc-vu-alert-warning" role="status">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                  <div>
                    Có <strong>{number(overview.SoSinhVienChuaAnhXa)}</strong> sinh viên thuộc{" "}
                    <strong>{number(overview.SoMaKhoaChuaAnhXa)}</strong> mã Khoa chưa ánh xạ nên chưa được tính vào tỷ lệ.
                  </div>
                  {canManage && (
                    <button type="button" className="hoc-vu-warning-btn" onClick={() => setTab("anhXa")}>
                      <i className="fa-solid fa-arrow-right" aria-hidden="true" /> Đến Ánh xạ Khoa
                    </button>
                  )}
                </div>
              )}

              {overview?.SoSvCanhBaoKhongKhop > 0 && (
                <div className="hoc-vu-secondary-warning">
                  <i className="fa-solid fa-circle-info" aria-hidden="true" />
                  <span>
                    <strong>{number(overview.SoSvCanhBaoKhongKhop)}</strong> sinh viên bị cảnh báo không có trong danh sách sinh viên.
                  </span>
                </div>
              )}

              {/* Table Card */}
              <div className="modern-table-card">
                <div className="hoc-vu-table-header">
                  <div className="hoc-vu-table-title-area">
                    <h3>Tỷ lệ theo Khoa năm {idNam}</h3>
                    <span className="hoc-vu-table-subtitle">
                      Tỷ lệ tốt nghiệp đúng hạn và tỷ lệ cảnh báo học vụ của từng Khoa
                    </span>
                  </div>

                  <div className="hoc-vu-search-box">
                    <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                    <input
                      type="text"
                      placeholder="Tìm Khoa hoặc mã đào tạo..."
                      className="form-input hoc-vu-search-input"
                      value={searchKhoa}
                      onChange={(e) => setSearchKhoa(e.target.value)}
                    />
                    {searchKhoa && (
                      <button
                        type="button"
                        className="hoc-vu-clear-search"
                        onClick={() => setSearchKhoa("")}
                        title="Xóa tìm kiếm"
                      >
                        <i className="fa-solid fa-xmark" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-scroll">
                  <table className="custom-table hoc-vu-table">
                    <thead>
                      <tr>
                        <th style={{ width: "60px", textAlign: "center" }}>STT</th>
                        <th>Khoa</th>
                        <th style={{ width: "160px" }}>Mã Khoa đào tạo</th>
                        <th>Tốt nghiệp đúng hạn</th>
                        <th style={{ width: "190px", textAlign: "center" }}>Tỷ lệ tốt nghiệp</th>
                        <th>Cảnh báo học vụ</th>
                        <th style={{ width: "190px", textAlign: "center" }}>Tỷ lệ cảnh báo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, index) => (
                        <tr key={item.IdDonVi || item.MaDonVi || index}>
                          <td style={{ textAlign: "center", color: "#64748b" }}>{index + 1}</td>
                          <td>
                            <div className="table-person-name">{item.TenDonVi || "—"}</div>
                            {item.MaDonVi && <div className="table-person-code">{item.MaDonVi}</div>}
                          </td>
                          <td>
                            {item.MaKhoaDaoTao ? (
                              <span className="code-pill">{item.MaKhoaDaoTao}</span>
                            ) : (
                              <span className="table-empty-mark">—</span>
                            )}
                          </td>
                          <td title={`Thôi học: ${number(item.SoThoiHocKhoaTotNghiep)}`}>
                            <div className="hoc-vu-calc-cell">
                              <strong>{number(item.SoTotNghiepDungHan)}</strong>
                              <span className="hoc-vu-calc-formula">
                                / ({number(item.SoSvKhoaTotNghiep)} − {number(item.SoThoiHocKhoaTotNghiep)})
                              </span>
                            </div>
                            <button type="button" className="hoc-vu-drilldown" onClick={() => openDoiChieu("tot-nghiep", item.IdDonVi)}>Đối chiếu sinh viên</button>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {item.TyLeTotNghiepDungHan == null ? (
                              ratio(null)
                            ) : (
                              <span className="status-pill pill-blue">
                                {ratio(item.TyLeTotNghiepDungHan)}
                              </span>
                            )}
                          </td>
                          <td title={`Thôi học: ${number(item.SoThoiHocKhoaCanhBao)}`}>
                            <div className="hoc-vu-calc-cell">
                              <strong>{number(item.SoSvBiCanhBao)}</strong>
                              <span className="hoc-vu-calc-formula">
                                / ({number(item.SoSvKhoaCanhBao)} − {number(item.SoThoiHocKhoaCanhBao)})
                              </span>
                            </div>
                            <button type="button" className="hoc-vu-drilldown" onClick={() => openDoiChieu("canh-bao", item.IdDonVi)}>Đối chiếu sinh viên</button>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {item.TyLeCanhBaoHocVu == null ? (
                              ratio(null)
                            ) : (
                              <span
                                className={`status-pill ${Number(item.TyLeCanhBaoHocVu) > 10 ? "pill-amber" : "pill-green"
                                  }`}
                              >
                                {ratio(item.TyLeCanhBaoHocVu)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan="7">
                            <div className="hoc-vu-empty-state">
                              <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
                              <h4>Không có dữ liệu</h4>
                              <p>
                                {searchKhoa
                                  ? `Không tìm thấy Khoa nào khớp với từ khóa "${searchKhoa}".`
                                  : "Chưa có dữ liệu tỷ lệ theo Khoa cho năm đánh giá này."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="table-foot">
                  <span>
                    Hiển thị <strong>{filteredItems.length}</strong> / <strong>{items.length}</strong> Khoa
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === "doiChieu" && (loadingTyLe ? (
        <div className="hoc-vu-empty-state" role="status">Đang tải phạm vi Khoa...</div>
      ) : loadError ? (
        <div className="hoc-vu-banner error" role="alert">{loadError}</div>
      ) : tyLe ? (
        <HocVuSinhVienDoiChieu key={idNam} idNam={idNam} tyLe={tyLe}
          initialSelection={doiChieuSelection} reload={reload} />
      ) : null)}

      {/* Tab: Upload dữ liệu */}
      {tab === "upload" && canManage && (
        <div className="hoc-vu-upload-grid">
          {Object.keys(FILES).map((kind) => (
            <UploadCard
              key={kind}
              kind={kind}
              idNam={idNam}
              busy={uploading}
              onUploadingChange={setUploading}
              onUploaded={() => setReload((value) => value + 1)}
              onShowMappings={() => setTab("anhXa")}
            />
          ))}
        </div>
      )}

      {/* Tab: Ánh xạ Khoa */}
      {tab === "anhXa" && canManage && (
        <div className="modern-table-card">
          <div className="hoc-vu-table-header">
            <div className="hoc-vu-table-title-area">
              <h3>Ánh xạ mã Khoa đào tạo</h3>
              <span className="hoc-vu-table-subtitle">
                {canManage
                  ? "Chọn Khoa tương ứng cho các mã cần ánh xạ, rồi bấm Lưu ánh xạ."
                  : "Danh sách ánh xạ mã Khoa đào tạo (Chế độ chỉ xem)."}
              </span>
            </div>

            <div className="hoc-vu-search-box">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên Khoa..."
                className="form-input hoc-vu-search-input"
                value={searchMapping}
                onChange={(e) => setSearchMapping(e.target.value)}
              />
              {searchMapping && (
                <button
                  type="button"
                  className="hoc-vu-clear-search"
                  onClick={() => setSearchMapping("")}
                  title="Xóa tìm kiếm"
                >
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="hoc-vu-mapping-filter-bar">
            <div className="hoc-vu-filter-chips">
              <button
                type="button"
                className={`hoc-vu-chip-btn ${mappingFilter === "all" ? "active" : ""}`}
                onClick={() => setMappingFilter("all")}
              >
                Tất cả ({mappings.length})
              </button>
              <button
                type="button"
                className={`hoc-vu-chip-btn ${mappingFilter === "unmapped" ? "active" : ""}`}
                onClick={() => setMappingFilter("unmapped")}
              >
                Chưa ánh xạ ({unmappedCount})
              </button>
              <button
                type="button"
                className={`hoc-vu-chip-btn ${mappingFilter === "mapped" ? "active" : ""}`}
                onClick={() => setMappingFilter("mapped")}
              >
                Đã ánh xạ ({mappedCount})
              </button>
            </div>
            {canManage && (
              <div className="hoc-vu-save-all">
                <span>{pendingMappings.length} thay đổi chưa lưu</span>
                <button
                  type="button"
                  className="hoc-vu-btn-save"
                  disabled={!!busyMapping || pendingMappings.length === 0}
                  onClick={saveMappings}
                >
                  <i className={`fa-solid ${busyMapping === "all" ? "fa-spinner fa-spin" : "fa-floppy-disk"}`} aria-hidden="true" />
                  {busyMapping === "all" ? `Đang lưu ${saveProgress}...` : "Lưu ánh xạ"}
                </button>
              </div>
            )}
          </div>

          {mappingError && (
            <div className="hoc-vu-banner hoc-vu-message error" role="alert" style={{ margin: "16px 20px" }}>
              <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
              <span>{mappingError}</span>
              <button
                type="button"
                className="hoc-vu-warning-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => loadMappings()}
              >
                <i className="fa-solid fa-rotate-right" aria-hidden="true" /> Thử lại
              </button>
            </div>
          )}

          {loadingMappings && (
            <div className="hoc-vu-empty-state" style={{ padding: "60px 20px" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: "#0056b3" }} aria-hidden="true" />
              <h4>Đang tải dữ liệu ánh xạ Khoa...</h4>
              <p>Vui lòng chờ trong giây lát.</p>
            </div>
          )}

          {!loadingMappings && !mappingError && (
            <>
              <div className="table-scroll">
                <table className="custom-table hoc-vu-table">
                  <thead>
                    <tr>
                      <th style={{ width: "140px" }}>Mã Khoa (file)</th>
                      <th>Tên Khoa (file)</th>
                      <th style={{ width: "120px", textAlign: "right" }}>Số SV</th>
                      <th style={{ minWidth: "300px" }}>Khoa trong hệ thống</th>
                      {canManage && <th style={{ width: "120px", textAlign: "center" }}>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappings.map((item) => (
                      <tr
                        key={item.MaKhoa}
                        className={item.IdDonVi == null ? "hoc-vu-unmapped-row" : ""}
                      >
                        <td>
                          <span className="code-pill">
                            <strong>{item.MaKhoa}</strong>
                          </span>
                        </td>
                        <td>
                          <span className="table-title-cell">{item.TenKhoa || "—"}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="table-num-strong">{number(item.SoSinhVien)}</span>
                        </td>
                        <td>
                          {canManage ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              <select
                                className="form-input hoc-vu-mapping-select"
                                aria-label={`Khoa trong hệ thống cho mã ${item.MaKhoa}`}
                                value={drafts[item.MaKhoa] ?? item.IdDonVi ?? ""}
                                disabled={!!busyMapping}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [item.MaKhoa]: event.target.value,
                                  }))
                                }
                              >
                                <option value="" disabled={item.IdDonVi != null}>Chưa ánh xạ</option>
                                {khoaList.map((khoa) => (
                                  <option key={khoa.IdDonVi} value={khoa.IdDonVi}>
                                    {khoa.TenDonVi}
                                  </option>
                                ))}
                              </select>
                              {item.IdDonVi == null && (
                                <span className="status-pill pill-amber hoc-vu-badge">
                                  Chưa ánh xạ
                                </span>
                              )}
                            </div>
                          ) : (
                            item.IdDonVi == null ? (
                              <span className="status-pill pill-amber hoc-vu-badge">
                                Chưa ánh xạ
                              </span>
                            ) : (
                              <span className="table-title-cell">
                                {item.TenDonVi || "—"}
                              </span>
                            )
                          )}
                        </td>
                        {canManage && (
                          <td style={{ textAlign: "center" }}>
                            <div className="hoc-vu-actions-cell" style={{ justifyContent: "center" }}>
                              {item.IdDonVi != null && (
                                <button
                                  type="button"
                                  className="hoc-vu-btn-delete"
                                  disabled={!!busyMapping}
                                  onClick={() => deleteMapping(item)}
                                >
                                  <i className="fa-solid fa-trash-can" aria-hidden="true" />
                                  Xóa ánh xạ
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredMappings.length === 0 && (
                      <tr>
                        <td colSpan={canManage ? 5 : 4}>
                          <div className="hoc-vu-empty-state">
                            <i className="fa-solid fa-network-wired" aria-hidden="true" />
                            <h4>Không tìm thấy kết quả</h4>
                            <p>
                              {searchMapping
                                ? `Không tìm thấy mã Khoa nào khớp với từ khóa "${searchMapping}".`
                                : "Chưa có danh sách mã Khoa đào tạo."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-foot">
                <span>
                  Hiển thị <strong>{filteredMappings.length}</strong> / <strong>{mappings.length}</strong> mã Khoa đào tạo
                </span>
                <span>
                  Đã ánh xạ: <strong style={{ color: "#059669" }}>{mappedCount}</strong> • Chưa ánh xạ:{" "}
                  <strong style={{ color: "#d97706" }}>{unmappedCount}</strong>
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
