import React, { useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import SearchSelect from "../../components/Common/SearchSelect";
import "../../css/Pages.css";
import "../../css/QuanLyKeHoach/QL_GioGiang.css";
import { apiFetch } from "../../utils/api";
import {
  chonNamDanhGiaMacDinh,
  importThoiKhoaBieu,
  kiemTraFileThoiKhoaBieu,
  kiemTraImportTkb,
  layDanhSachGioGiangTkb,
  quetAnhXaTuDong,
} from "../../utils/gioGiangTkbApi";

const BO_LOC_ANH_XA = [
  { value: "tat-ca", label: "Tất cả trạng thái" },
  { value: "da-anh-xa", label: "Đã ánh xạ nhân viên" },
  { value: "chua-anh-xa", label: "Chưa ánh xạ nhân viên" },
];

const CANH_BAO_META = {
  TRUNG_LOP: "Trùng lớp",
  SO_TIET_TRONG: "Số tiết trống",
};

const so = (value, maximumFractionDigits = 2) =>
  Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits });

const ngayGio = (value) => {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const TrangThaiAnhXa = ({ item }) => {
  if (item.IdNhanVien) {
    return (
      <div className="ggtk-mapped-person">
        <span className="ggtk-badge is-success">
          <i className="fa-solid fa-check" aria-hidden="true" /> Đã ánh xạ
        </span>
        <small>
          {item.MaNhanVien ? `${item.MaNhanVien} · ` : ""}
          {item.HoTenNhanVien}
        </small>
        <small>{item.TenDonVi}</small>
      </div>
    );
  }

  const soNguoiKhop = Number(item.SoNguoiKhopTen || 0);
  if (item.GoiYIdNhanVien) {
    return (
      <div className="ggtk-mapped-person">
        <span className="ggtk-badge is-info">
          <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
          Có thể tự ánh xạ
        </span>
        <small>
          Gợi ý: {item.GoiYMaNhanVien ? `${item.GoiYMaNhanVien} · ` : ""}
          {item.GoiYTenDonVi}
        </small>
      </div>
    );
  }

  if (soNguoiKhop >= 2) {
    return (
      <div className="ggtk-mapped-person">
        <span className="ggtk-badge is-warning">
          <i className="fa-solid fa-users" aria-hidden="true" /> Trùng tên
        </span>
        <small>Có {soNguoiKhop} nhân viên trùng tên, cần chọn thủ công.</small>
      </div>
    );
  }

  return (
    <div className="ggtk-mapped-person">
      <span className="ggtk-badge is-danger">
        <i className="fa-solid fa-user-slash" aria-hidden="true" /> Không tìm thấy
      </span>
      <small>Kiểm tra họ tên hoặc hồ sơ nhân viên trong hệ thống.</small>
    </div>
  );
};

const QL_GioGiang = () => {
  const toast = useRef(null);
  const fileInputRef = useRef(null);
  const [namList, setNamList] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [items, setItems] = useState([]);
  const [soDongChuaAnhXa, setSoDongChuaAnhXa] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [mappingFilter, setMappingFilter] = useState("tat-ca");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRemapping, setIsRemapping] = useState(false);
  const [formError, setFormError] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [importFile, setImportFile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchYears = async () => {
      try {
        const response = await apiFetch("namdanhgia");
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.Message || "Không tải được danh sách năm");
        }

        const list = (body?.Items || (Array.isArray(body) ? body : []))
          .filter((item) => item?.IdNam)
          .sort((a, b) => Number(b.IdNam) - Number(a.IdNam));

        if (!cancelled) {
          setNamList(list);
          setSelectedYear(
            (current) => current || chonNamDanhGiaMacDinh(list),
          );
          if (list.length === 0) setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error.message || "Không tải được danh sách năm đánh giá",
          );
          setIsLoading(false);
        }
      }
    };

    fetchYears();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = async (idNam, signal) => {
    if (!idNam) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");
    try {
      const result = await layDanhSachGioGiangTkb(idNam, signal);
      setItems(result.items);
      setSoDongChuaAnhXa(result.soDongChuaAnhXa);
    } catch (error) {
      if (error.name !== "AbortError") {
        setItems([]);
        setSoDongChuaAnhXa(0);
        setLoadError(error.message || "Không tải được dữ liệu giờ giảng");
      }
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(selectedYear, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  useEffect(() => {
    if (!isImportModalOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !isImporting) setIsImportModalOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isImportModalOpen, isImporting]);

  const filteredItems = useMemo(() => {
    const keyword = searchQuery.trim().toLocaleLowerCase("vi-VN");
    return items.filter((item) => {
      const daAnhXa = Boolean(item.IdNhanVien);
      if (mappingFilter === "da-anh-xa" && !daAnhXa) return false;
      if (mappingFilter === "chua-anh-xa" && daAnhXa) return false;
      if (!keyword) return true;
      return [item.HoTen, item.TenKhoa, item.HoTenNhanVien, item.MaNhanVien]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("vi-VN").includes(keyword),
        );
    });
  }, [items, mappingFilter, searchQuery]);

  const summary = useMemo(
    () => ({
      soGiangVien: items.length,
      soLop: items.reduce((sum, item) => sum + Number(item.SoLop || 0), 0),
      soTietTrongNam: items.reduce(
        (sum, item) => sum + Number(item.SoTietTrongNam || 0),
        0,
      ),
      gioChuan: items.reduce(
        (sum, item) => sum + Number(item.GioChuanTrongNam || 0),
        0,
      ),
    }),
    [items],
  );

  const lastImport = useMemo(() => {
    const timestamps = items
      .map((item) => new Date(item.NgayImport).getTime())
      .filter(Number.isFinite);
    return timestamps.length ? new Date(Math.max(...timestamps)) : null;
  }, [items]);

  const openImportModal = () => {
    setImportFile(null);
    setFormError("");
    setIsImportModalOpen(true);
  };

  const closeImportModal = () => {
    if (isImporting) return;
    setIsImportModalOpen(false);
    setFormError("");
  };

  const selectFile = (file) => {
    const fileError = kiemTraFileThoiKhoaBieu(file);
    setImportFile(fileError ? null : file);
    setFormError(fileError);
    if (fileError && fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async (event) => {
    event.preventDefault();
    const payload = {
      file: importFile,
      idNam: selectedYear,
    };
    const validationMessage = kiemTraImportTkb(payload);
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setIsImporting(true);
    setFormError("");
    try {
      const result = await importThoiKhoaBieu(payload);
      setImportResult({
        soDongDoc: result.SoDongDoc ?? result.soDongDoc ?? 0,
        importedCount: result.ImportedCount ?? result.importedCount ?? 0,
        soGiangVien: result.SoGiangVien ?? result.soGiangVien ?? 0,
        soDongBoQua: result.SoDongBoQua ?? result.soDongBoQua ?? 0,
        soDongTrung: result.SoDongTrung ?? result.soDongTrung ?? 0,
        soDongTuDongAnhXa:
          result.SoDongTuDongAnhXa ?? result.soDongTuDongAnhXa ?? 0,
        soDongChuaAnhXa:
          result.SoDongChuaAnhXa ?? result.soDongChuaAnhXa ?? 0,
        canhBao: result.CanhBao || result.canhBao || [],
      });
      setIsImportModalOpen(false);
      await fetchData(selectedYear);
      toast.current?.show({
        severity: "success",
        summary: "Upload thành công",
        detail: `Đã cập nhật ${
          result.SoGiangVien ?? result.soGiangVien ?? 0
        } giảng viên, tự ánh xạ ${
          result.SoDongTuDongAnhXa ?? result.soDongTuDongAnhXa ?? 0
        } dòng dữ liệu.`,
        life: 4500,
      });
    } catch (error) {
      setFormError(error.message || "Không thể nhập file thời khóa biểu");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemap = async () => {
    if (!selectedYear || isRemapping) return;
    setIsRemapping(true);
    try {
      const result = await quetAnhXaTuDong(selectedYear);
      const soDaAnhXa =
        result.SoDongTuDongAnhXa ?? result.soDongTuDongAnhXa ?? 0;
      const soConLai = result.SoDongChuaAnhXa ?? result.soDongChuaAnhXa ?? 0;
      await fetchData(selectedYear);
      toast.current?.show({
        severity: soDaAnhXa > 0 ? "success" : "info",
        summary: soDaAnhXa > 0 ? "Đã quét ánh xạ" : "Không có ánh xạ mới",
        detail: `Đã ánh xạ thêm ${soDaAnhXa} dòng dữ liệu, còn ${soConLai} dòng cần xử lý thủ công.`,
        life: 5000,
      });
    } catch (error) {
      toast.current?.show({
        severity: "error",
        summary: "Không thể quét ánh xạ",
        detail: error.message || "Vui lòng thử lại sau.",
        life: 5000,
      });
    } finally {
      setIsRemapping(false);
    }
  };

  const yearOptions = namList.map((item) => ({
    value: String(item.IdNam),
    label: `Năm đánh giá ${item.IdNam}`,
  }));

  return (
    <div className="page-container ggtk-page">
      <Toast ref={toast} position="top-right" />

      <div className="ggtk-page-header">
        <div className="header-title">
          <h2>QUẢN LÝ GIỜ GIẢNG TỪ THỜI KHÓA BIỂU</h2>
          <span className="breadcrumb">
            Upload thời khóa biểu và tổng hợp giờ chuẩn theo năm đánh giá
          </span>
        </div>
        <div className="ggtk-header-actions">
          <div className="ggtk-year-field">
            <label>Năm đánh giá</label>
            <SearchSelect
              name="ggtk-year"
              value={selectedYear}
              onChange={setSelectedYear}
              options={yearOptions}
              placeholder="Chọn năm đánh giá"
            />
          </div>
          <button
            type="button"
            className="btn-add-new ggtk-upload-button"
            onClick={openImportModal}
            disabled={!selectedYear}
          >
            <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
            Upload thời khóa biểu
          </button>
        </div>
      </div>

      <div className="ggtk-summary-grid" aria-label="Tổng quan giờ giảng">
        <div className="ggtk-summary-card">
          <span className="ggtk-summary-icon is-blue">
            <i className="fa-solid fa-chalkboard-user" aria-hidden="true" />
          </span>
          <div><span>Giảng viên</span><strong>{so(summary.soGiangVien, 0)}</strong></div>
        </div>
        <div className="ggtk-summary-card">
          <span className="ggtk-summary-icon is-violet">
            <i className="fa-solid fa-layer-group" aria-hidden="true" />
          </span>
          <div><span>Lớp tín chỉ</span><strong>{so(summary.soLop, 0)}</strong></div>
        </div>
        <div className="ggtk-summary-card">
          <span className="ggtk-summary-icon is-amber">
            <i className="fa-solid fa-clock" aria-hidden="true" />
          </span>
          <div><span>Tiết trong năm</span><strong>{so(summary.soTietTrongNam, 0)}</strong></div>
        </div>
        <div className="ggtk-summary-card">
          <span className="ggtk-summary-icon is-green">
            <i className="fa-solid fa-calculator" aria-hidden="true" />
          </span>
          <div><span>Giờ chuẩn</span><strong>{so(summary.gioChuan)}</strong></div>
        </div>
      </div>

      {soDongChuaAnhXa > 0 && (
        <div className="ggtk-alert is-warning" role="status">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <div>
            <strong>Còn {so(soDongChuaAnhXa, 0)} dòng dữ liệu chưa ánh xạ</strong>
            <span>Đây là các trường hợp không khớp ai hoặc có nhiều nhân viên trùng tên; các dòng này chưa được tính vào bảng tổng hợp.</span>
          </div>
          <button
            type="button"
            className="ggtk-remap-button"
            onClick={handleRemap}
            disabled={isRemapping}
          >
            <i className={`fa-solid ${isRemapping ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`} aria-hidden="true" />
            {isRemapping ? "Đang quét..." : "Quét lại tự động"}
          </button>
        </div>
      )}

      {importResult && (
        <div className="ggtk-import-result" role="status">
          <div className="ggtk-result-heading">
            <div>
              <strong>Kết quả upload gần nhất</strong>
              <span>
                Đọc {so(importResult.soDongDoc, 0)} dòng, lưu {so(importResult.importedCount, 0)} lớp của {so(importResult.soGiangVien, 0)} giảng viên.
              </span>
            </div>
            <button type="button" onClick={() => setImportResult(null)} aria-label="Đóng kết quả upload">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
          <div className="ggtk-result-counts">
              <span className="is-success">{so(importResult.soDongTuDongAnhXa, 0)} dòng được tự ánh xạ</span>
              {importResult.soDongChuaAnhXa > 0 && <span className="is-warning">{so(importResult.soDongChuaAnhXa, 0)} dòng còn chưa ánh xạ</span>}
              {importResult.soDongBoQua > 0 && <span>{so(importResult.soDongBoQua, 0)} dòng thuộc năm khác đã bỏ qua</span>}
              {importResult.soDongTrung > 0 && <span>{so(importResult.soDongTrung, 0)} dòng trùng lớp</span>}
          </div>
          {importResult.canhBao.length > 0 && (
            <ul className="ggtk-warning-list">
              {importResult.canhBao.slice(0, 5).map((warning, index) => (
                <li key={`${warning.Loai || "warning"}-${warning.SoDongExcel || index}-${index}`}>
                  <strong>{CANH_BAO_META[warning.Loai] || "Cảnh báo"}</strong>
                  {warning.SoDongExcel > 0 && <span>Dòng {warning.SoDongExcel}: </span>}
                  {warning.ThongDiep}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="table-card ggtk-table-card">
        <div className="ggtk-table-toolbar">
          <div>
            <h3>Danh sách giờ giảng</h3>
            <p>
              {lastImport
                ? `Cập nhật lần cuối ${ngayGio(lastImport)}`
                : "Chưa có dữ liệu upload trong năm này"}
            </p>
          </div>
          <div className="ggtk-toolbar-controls">
            <div className="ggtk-search-box">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm giảng viên, khoa..."
                aria-label="Tìm giảng viên hoặc khoa"
              />
            </div>
            <div className="ggtk-mapping-filter">
              <SearchSelect
                value={mappingFilter}
                onChange={setMappingFilter}
                options={BO_LOC_ANH_XA}
              />
            </div>
          </div>
        </div>

        {loadError && (
          <div className="ggtk-load-state is-error" role="alert">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
            <span>{loadError}</span>
            <button type="button" onClick={() => fetchData(selectedYear)}>Thử lại</button>
          </div>
        )}

        {!loadError && isLoading && (
          <div className="ggtk-load-state">
            <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
            Đang tải dữ liệu giờ giảng...
          </div>
        )}

        {!loadError && !isLoading && (
          <div className="table-scroll">
            <table className="custom-table ggtk-table">
              <thead>
                <tr>
                  <th className="ggtk-stt">STT</th>
                  <th>Giảng viên từ TKB</th>
                  <th>Khoa</th>
                  <th className="ggtk-number">Số lớp</th>
                  <th className="ggtk-number">Tiết trong năm</th>
                  <th className="ggtk-number">Giờ chuẩn</th>
                  <th>Ánh xạ nhân viên</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item, index) => (
                  <tr key={item.IdGioGiangTkb || `${item.HoTenChuan}-${index}`}>
                    <td className="ggtk-stt">{index + 1}</td>
                    <td>
                      <div className="ggtk-person-cell">
                        <strong>{item.HoTen || "---"}</strong>
                        <span>Import {ngayGio(item.NgayImport)}</span>
                      </div>
                    </td>
                    <td>{item.TenKhoa || "---"}</td>
                    <td className="ggtk-number">{so(item.SoLop, 0)}</td>
                    <td className="ggtk-number">{so(item.SoTietTrongNam, 0)}</td>
                    <td className="ggtk-number ggtk-hours">{so(item.GioChuanTrongNam)}</td>
                    <td>
                      <TrangThaiAnhXa item={item} />
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      <div className="ggtk-empty-state">
                        <i className="fa-regular fa-calendar-xmark" aria-hidden="true" />
                        <strong>{items.length === 0 ? "Chưa có dữ liệu thời khóa biểu" : "Không tìm thấy kết quả phù hợp"}</strong>
                        <span>{items.length === 0 ? "Hãy upload file Excel thời khóa biểu để bắt đầu tổng hợp." : "Thử thay đổi từ khóa hoặc bộ lọc ánh xạ."}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !loadError && items.length > 0 && (
          <div className="table-foot">
            <span>Hiển thị <strong>{filteredItems.length}</strong> / {items.length} giảng viên</span>
            <span>Năm đánh giá <strong>{selectedYear}</strong></span>
          </div>
        )}
      </div>

      {isImportModalOpen && (
        <div
          className="modal-overlay ggtk-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeImportModal();
          }}
        >
          <div
            className="modal-box form-modal-box ggtk-import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ggtk-import-title"
          >
            <div className="modal-header">
              <div>
                <h3 id="ggtk-import-title">Upload thời khóa biểu</h3>
                <span>Năm đánh giá {selectedYear}</span>
              </div>
              <button type="button" className="close-btn" onClick={closeImportModal} disabled={isImporting} aria-label="Đóng">
                &times;
              </button>
            </div>

            <form onSubmit={handleImport}>
              <div className="modal-body">
                <div className="ggtk-overwrite-note">
                  <i className="fa-solid fa-circle-info" aria-hidden="true" />
                  <span>Lần upload mới sẽ ghi đè dữ liệu thời khóa biểu của năm {selectedYear} và tự ánh xạ các họ tên khớp duy nhất một nhân viên đang hoạt động. Ánh xạ đã có, kể cả đã sửa tay, luôn được giữ nguyên.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="ggtk-excel-file">File Excel thời khóa biểu <span className="text-red">*</span></label>
                  <button
                    type="button"
                    className={`ggtk-file-picker${importFile ? " has-file" : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <span className="ggtk-file-icon"><i className="fa-solid fa-file-excel" aria-hidden="true" /></span>
                    <span className="ggtk-file-copy">
                      <strong>{importFile?.name || "Chọn file thời khóa biểu"}</strong>
                      <small>{importFile ? `${so(importFile.size / 1024 / 1024)} MB · Nhấn để chọn file khác` : "Hỗ trợ .xlsx, .xls · tối đa 100 MB"}</small>
                    </span>
                    <span className="ggtk-browse-label">Chọn file</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    id="ggtk-excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    className="ggtk-hidden-file"
                    onChange={(event) => selectFile(event.target.files?.[0] || null)}
                    tabIndex="-1"
                  />
                  <small className="ggtk-field-help">Cột bắt buộc: KY_HOC, Ten, SLSV_DangKyHoc và SoTiet. Hệ thống tự bỏ qua các kỳ không thuộc năm {selectedYear}.</small>
                </div>

                {formError && (
                  <div className="ggtk-form-error" role="alert">
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                    {formError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeImportModal} disabled={isImporting}>Hủy</button>
                <button type="submit" className="btn-submit" disabled={isImporting}>
                  <i className={`fa-solid ${isImporting ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"}`} aria-hidden="true" />
                  {isImporting ? "Đang xử lý..." : "Upload và tính giờ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QL_GioGiang;
