import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/KeKhaiGioQuyDoi.css";
import SearchSelect from "../../components/Common/SearchSelect";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { formatNgay } from "../../utils/phieuApi";
import {
  formatGio,
  layDanhSachChoDuyet,
  TRANG_THAI_KE_KHAI,
  TRANG_THAI_KE_KHAI_META,
} from "../../utils/keKhaiGioQuyDoiApi";

const PAGE_SIZE = 20;

const LOC_TRANG_THAI = [
  { value: String(TRANG_THAI_KE_KHAI.CHO_DUYET), label: "Chờ duyệt" },
  { value: String(TRANG_THAI_KE_KHAI.DA_DUYET), label: "Đã chốt" },
  { value: String(TRANG_THAI_KE_KHAI.TRA_LAI), label: "Đã trả lại" },
  { value: String(TRANG_THAI_KE_KHAI.NHAP), label: "Giảng viên đang kê" },
];

const BadgeTrangThai = ({ trangThai }) => {
  const meta = TRANG_THAI_KE_KHAI_META[trangThai];
  if (!meta) return <span className="kkq-trong">—</span>;
  return (
    <span
      className="cd-status-badge"
      style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
    >
      <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
    </span>
  );
};

/**
 * Hàng đợi duyệt bản kê giờ quy đổi — phía TRƯỞNG ĐƠN VỊ (TK/TKL/TP, và HT/Admin
 * xem toàn trường).
 *
 * Trang này chỉ là LỐI VÀO: mọi thao tác duyệt / từ chối / sửa số lượng / chốt /
 * trả lại đều nằm ở màn hình chi tiết, vì đơn vị nghiệp vụ là TỪNG DÒNG kê khai
 * chứ không phải cả bản kê.
 *
 * Phạm vi do SERVER quyết (đơn vị mình + đơn vị con; ADMIN/HT toàn trường) — FE
 * không lọc lại, chỉ hiển thị và điều hướng. Bộ lọc đơn vị cố ý không dựng ở đây:
 * trưởng khoa chỉ có một phạm vi, thêm ô chọn chỉ tạo cảm giác chọn được nhiều
 * hơn thực tế.
 *
 * Cột "Chờ duyệt" là `SoDongChoDuyet` — khác 0 nghĩa là CHƯA chốt được bản kê
 * (server trả 422 CON_DONG_CHUA_XET), nên đây là con số cần nhìn trước tiên.
 */
const DuyetKeKhaiGioQuyDoi = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [rows, setRows] = useState([]);
  const [phanTrang, setPhanTrang] = useState(null);
  const [trangThai, setTrangThai] = useState(
    String(TRANG_THAI_KE_KHAI.CHO_DUYET),
  );
  const [oTuKhoa, setOTuKhoa] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loi, setLoi] = useState("");

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;

    setIsLoading(true);
    setLoi("");
    try {
      const { items, phanTrang: pt } = await layDanhSachChoDuyet({
        idNam: selectedNam,
        trangThai,
        tuKhoa,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(items);
      setPhanTrang(pt);
    } catch (error) {
      console.error("Lỗi tải danh sách bản kê chờ duyệt:", error);
      setRows([]);
      setPhanTrang(null);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [selectedNam, trangThai, tuKhoa, page]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  // Đổi bộ lọc thì phải về trang 1, nếu không sẽ hiện trang trống của tập kết quả mới.
  useEffect(() => {
    setPage(1);
  }, [selectedNam, trangThai, tuKhoa]);

  const tong = useMemo(
    () => ({
      soBanKe: phanTrang?.TongSo ?? rows.length,
      dongChoDuyet: rows.reduce((s, r) => s + (r.SoDongChoDuyet || 0), 0),
      gioKeKhai: rows.reduce((s, r) => s + (Number(r.TongGioKeKhai) || 0), 0),
      gioDuyet: rows.reduce((s, r) => s + (Number(r.TongGioDuyet) || 0), 0),
    }),
    [rows, phanTrang],
  );

  const tongSoTrang = phanTrang?.TongSoTrang || 1;

  const timKiem = () => {
    setTuKhoa(oTuKhoa.trim());
    if (!oTuKhoa.trim() && tuKhoa) showToast("info", "Đã bỏ lọc", "Hiện tất cả");
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 className="kkq-title">Duyệt kê khai giờ quy đổi</h2>
        <span className="breadcrumb">
          Bản kê giờ quy đổi theo Phụ lục II của giảng viên trong phạm vi đơn vị
          bạn phụ trách — duyệt hoặc từ chối từng dòng rồi chốt
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={(v) => setSelectedNam(v)}
            options={namList.map((n) => ({
              value: n.IdNam,
              label: `Năm học ${n.IdNam}`,
            }))}
            disabled={dangTaiNam}
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Trạng thái</label>
          <SearchSelect
            value={trangThai}
            onChange={(v) => setTrangThai(v)}
            options={LOC_TRANG_THAI}
          />
        </div>

        <div className="cd-field" style={{ flex: "2 1 240px" }}>
          <label className="cd-label">Tìm giảng viên</label>
          <input
            type="text"
            className="form-input"
            placeholder="Họ tên hoặc mã cán bộ..."
            value={oTuKhoa}
            onChange={(e) => setOTuKhoa(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") timKiem();
            }}
          />
        </div>

        <button className="btn-cancel" onClick={timKiem} disabled={isLoading}>
          <i className="fa-solid fa-magnifying-glass"></i> Tìm
        </button>

        <button
          className="btn-cancel"
          onClick={taiDanhSach}
          disabled={isLoading || dangTaiNam}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
      </div>

      <div className="stat-card-grid">
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-amber">
            <i className="fa-solid fa-inbox"></i>
          </div>
          <div>
            <div className="stat-label">Bản kê khớp bộ lọc</div>
            <div className="stat-value">{tong.soBanKe}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-purple">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div>
            <div className="stat-label">Dòng chờ bạn xét</div>
            <div className="stat-value">{tong.dongChoDuyet}</div>
            <div className="stat-label">trên trang hiện tại</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-blue">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div>
            <div className="stat-label">Giờ giảng viên kê</div>
            <div className="stat-value">{formatGio(tong.gioKeKhai)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-green">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="stat-label">Giờ đã duyệt</div>
            <div className="stat-value" style={{ color: "#047857" }}>
              {formatGio(tong.gioDuyet)}
            </div>
          </div>
        </div>
      </div>

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải danh sách bản kê...
          </div>
        ) : loi ? (
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không tải được danh sách
            </h3>
            <p style={{ margin: 0 }}>{loi}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-mug-hot"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không có bản kê nào
            </h3>
            <p style={{ margin: 0 }}>
              Chưa có giảng viên nào nộp bản kê ở trạng thái này, hoặc bạn đã xử
              lý hết.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="custom-table" style={{ minWidth: "1040px" }}>
              <thead>
                <tr>
                  <th style={{ width: "24%" }}>Giảng viên</th>
                  <th style={{ width: "16%" }}>Đơn vị</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Ngày nộp</th>
                  <th style={{ width: "10%", textAlign: "center" }}>Số dòng</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Giờ kê</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Giờ duyệt</th>
                  <th style={{ width: "12%" }}>Trạng thái</th>
                  <th style={{ width: "8%", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cho = r.SoDongChoDuyet || 0;
                  return (
                    <tr key={r.IdKeKhai}>
                      <td>
                        <div className="table-person-name">{r.HoTen}</div>
                        {r.MaNhanVien && (
                          <div className="table-person-code">
                            {r.MaNhanVien}
                          </div>
                        )}
                      </td>
                      <td>
                        {r.TenDonVi || (
                          <span className="table-empty-mark">—</span>
                        )}
                      </td>
                      <td className="table-num">
                        {r.NgayNop ? (
                          formatNgay(r.NgayNop)
                        ) : (
                          <span className="table-empty-mark">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="tag-badge">{r.SoDong ?? 0}</span>
                        {cho > 0 && (
                          <span
                            className="tag-badge kkq-tag-cho"
                            title="Số dòng bạn chưa duyệt hoặc chưa từ chối"
                          >
                            {cho} chờ xét
                          </span>
                        )}
                      </td>
                      <td className="table-num">
                        {formatGio(r.TongGioKeKhai)}
                      </td>
                      <td className="table-num kkq-gio">
                        <b>{formatGio(r.TongGioDuyet)}</b>
                      </td>
                      <td>
                        <BadgeTrangThai trangThai={r.TrangThai} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="table-btn-primary"
                          title="Mở bản kê để duyệt từng dòng"
                          onClick={() =>
                            navigate(
                              `/quan-ly/ke-khai-gio-quy-doi/${r.IdKeKhai}`,
                            )
                          }
                        >
                          <i className="fa-solid fa-pen-to-square"></i>{" "}
                          {Number(r.TrangThai) ===
                          TRANG_THAI_KE_KHAI.CHO_DUYET
                            ? "Duyệt"
                            : "Xem"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-pager">
          <span>
            Trang <strong style={{ color: "#172033" }}>{page}</strong> /{" "}
            {tongSoTrang}
            {phanTrang?.TongSo != null ? ` — ${phanTrang.TongSo} bản kê` : ""}
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className="table-pager-btn"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="fa-solid fa-chevron-left"></i> Trước
            </button>
            <button
              className="table-pager-btn"
              disabled={page >= tongSoTrang || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuyetKeKhaiGioQuyDoi;
