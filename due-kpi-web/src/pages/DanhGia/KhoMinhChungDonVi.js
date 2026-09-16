import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/DanhGia/KhoMinhChung.css";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import SearchSelect from "../../components/Common/SearchSelect";
import { TrangThaiDonViBadge } from "../../components/QuanLyChamDiem/TrangThaiBadge";
import { useMinhChungDonViPreview } from "../../hooks/useMinhChungDonViPreview";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import {
  coTenFileGocKhac,
  fetchKhoMinhChungDonVi,
  formatKb,
  iconFile,
  laMinhChungFile,
} from "../../utils/minhChungDonViApi";
import { formatNgay } from "../../utils/phieuApi";

/**
 * Kho minh chứng của PHIẾU KPI ĐƠN VỊ (Khoa và Phòng/Trung tâm).
 *
 * Trang chỉ đọc: việc thêm/xóa vẫn nằm ở phiếu đang nhập để giữ nguyên ngữ
 * cảnh tiêu chí và luật trạng thái. Trang không gửi idDonVi; server tự suy và
 * giới hạn đơn vị từ người đang đăng nhập.
 */
const KhoMinhChungDonVi = () => {
  const toast = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } =
    useNamDanhGia();

  const idPhieuDv = searchParams.get("idPhieuDv");
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timKiem, setTimKiem] = useState("");

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungDonViPreview((message) =>
      showToast("error", "Lỗi", message),
    );

  const taiDanhSach = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await fetchKhoMinhChungDonVi(
        idPhieuDv
          ? { idPhieuDv }
          : {
              idNam: selectedNam || undefined,
            },
      );
      setRows(items);
    } catch (error) {
      console.error("Lỗi tải kho minh chứng đơn vị:", error);
      toast.current?.show({
        severity: "error",
        summary: "Lỗi",
        detail: error.message,
        life: 4000,
      });
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [idPhieuDv, selectedNam]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  const rowsHienThi = useMemo(() => {
    const q = timKiem.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((mc) =>
      [mc.TenHienThi, mc.TenFileGoc, mc.TenTieuChi, mc.TenDonVi].some(
        (field) =>
          String(field || "")
            .toLowerCase()
            .includes(q),
      ),
    );
  }, [rows, timKiem]);

  const tongDungLuongKb = useMemo(
    () =>
      rowsHienThi.reduce(
        (tong, mc) =>
          tong + (laMinhChungFile(mc) ? Number(mc.KichThuocKb) || 0 : 0),
        0,
      ),
    [rowsHienThi],
  );

  const boLocPhieu = () => {
    const con = new URLSearchParams(searchParams);
    con.delete("idPhieuDv");
    setSearchParams(con, { replace: true });
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2
          style={{
            margin: 0,
            color: "#1e293b",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          Kho minh chứng đơn vị
        </h2>
        <span className="breadcrumb">
          Tra cứu minh chứng đã đính kèm trong phiếu KPI Khoa, Phòng hoặc Trung
          tâm
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <div title={idPhieuDv ? "Đang lọc theo một phiếu cụ thể" : undefined}>
            <SearchSelect
              value={selectedNam}
              onChange={(value) => setSelectedNam(value)}
              options={[
                { value: "", label: "-- Tất cả các năm --" },
                ...namList.map((nam) => ({
                  value: nam.IdNam,
                  label: `Năm học ${nam.IdNam}`,
                })),
              ]}
              placeholder="-- Tất cả các năm --"
              disabled={dangTaiNam || Boolean(idPhieuDv)}
            />
          </div>
        </div>

        <div className="cd-field" style={{ flex: "2 1 260px" }}>
          <label className="cd-label">Tìm minh chứng</label>
          <input
            type="text"
            className="form-input"
            placeholder="Tên tệp, đơn vị, tiêu chí..."
            value={timKiem}
            onChange={(event) => setTimKiem(event.target.value)}
          />
        </div>

        <button
          type="button"
          className="btn-cancel"
          onClick={taiDanhSach}
          disabled={isLoading}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
      </div>

      {idPhieuDv && (
        <div style={{ marginBottom: "18px" }}>
          <button type="button" className="cd-chip" onClick={boLocPhieu}>
            <i className="fa-solid fa-filter"></i>
            <span>Đang lọc theo phiếu đơn vị #{idPhieuDv}</span>
            <i className="fa-solid fa-xmark" style={{ marginLeft: "2px" }}></i>
          </button>
        </div>
      )}

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải kho minh chứng đơn vị...
          </div>
        ) : rowsHienThi.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-folder-open"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Chưa có minh chứng nào
            </h3>
            <p style={{ margin: 0 }}>
              {timKiem
                ? "Không có minh chứng nào khớp từ khóa tìm kiếm."
                : "Đơn vị chưa có phiếu phù hợp hoặc phiếu chưa đính kèm minh chứng."}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="custom-table mc-vault-table mc-dv-table">
              <colgroup>
                <col className="mc-dv-col-file" />
                <col className="mc-dv-col-unit" />
                <col className="mc-dv-col-criterion" />
                <col className="mc-dv-col-year" />
                <col className="mc-dv-col-status" />
                <col className="mc-dv-col-size" />
                <col className="mc-dv-col-date" />
                <col className="mc-dv-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>Minh chứng</th>
                  <th>Đơn vị</th>
                  <th>Tiêu chí</th>
                  <th style={{ textAlign: "center" }}>Năm</th>
                  <th style={{ textAlign: "center" }}>
                    Trạng thái phiếu
                  </th>
                  <th style={{ textAlign: "right" }}>Dung lượng</th>
                  <th>Ngày tải lên</th>
                  <th style={{ textAlign: "center" }}>Tải về</th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((mc) => {
                  const laFile = laMinhChungFile(mc);
                  const icon = iconFile(mc);
                  return (
                    <tr key={mc.IdMinhChung}>
                      <td>
                        <div className="mc-vault-file-cell">
                          <i
                            className={`${laFile ? icon.className : "fa-solid fa-link"} cd-mc-icon`}
                            style={{ color: laFile ? icon.color : "#1d4ed8" }}
                          ></i>
                          <div className="mc-vault-file-text">
                            {laFile ? (
                              <button
                                type="button"
                                className="cd-mc-name"
                                title={`${mc.TenHienThi || mc.TenFileGoc}\nBấm để xem trước`}
                                onClick={() => openPreview(mc)}
                              >
                                {mc.TenHienThi || mc.TenFileGoc}
                              </button>
                            ) : (
                              <a
                                className="cd-mc-name"
                                href={mc.DuongDan}
                                target="_blank"
                                rel="noreferrer"
                                title={mc.DuongDan}
                              >
                                {mc.TenHienThi || mc.DuongDan}
                              </a>
                            )}
                            {laFile && coTenFileGocKhac(mc) && (
                              <div className="cd-mc-meta">
                                {mc.TenFileGoc}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="mc-dv-unit-cell">
                        {mc.TenDonVi || `Đơn vị #${mc.IdDonVi}`}
                      </td>
                      <td
                        className="mc-dv-criterion-cell"
                        title={mc.TenTieuChi || undefined}
                      >
                        <div className="mc-vault-criterion-text">
                          {mc.TenTieuChi || `Tiêu chí #${mc.IdTieuChi}`}
                        </div>
                      </td>
                      <td
                        className="table-num-strong"
                        style={{ textAlign: "center" }}
                      >
                        {mc.IdNam}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <TrangThaiDonViBadge
                          trangThai={mc.TrangThaiPhieu}
                        />
                      </td>
                      <td className="table-num">
                        {laFile ? (
                          formatKb(mc.KichThuocKb)
                        ) : (
                          <span className="table-empty-mark">-</span>
                        )}
                      </td>
                      <td className="table-num">{formatNgay(mc.NgayTaiLen)}</td>
                      <td>
                        <div className="table-actions">
                          {laFile ? (
                            <button
                              type="button"
                              className="action-btn view-btn"
                              title="Tải tệp về máy"
                              onClick={() => downloadMinhChung(mc)}
                            >
                              <i className="fa-solid fa-download"></i>
                            </button>
                          ) : (
                            <span className="table-empty-mark">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && rowsHienThi.length > 0 && (
          <div className="table-foot">
            <span>
              {rowsHienThi.length} minh chứng
              {timKiem && rows.length !== rowsHienThi.length
                ? ` / ${rows.length} tổng cộng`
                : ""}
            </span>
            <span>
              Tổng dung lượng <strong>{formatKb(tongDungLuongKb)}</strong>
            </span>
          </div>
        )}
      </div>

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenHienThi || preview.mc?.TenFileGoc}
        kieu={preview.kieu}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />
    </div>
  );
};

export default KhoMinhChungDonVi;
