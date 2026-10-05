import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/BaoCaoDonVi.css";
import { apiFetch } from "../../utils/api";
import {
  fetchBaoCaoChuaHoanTat,
  fetchBaoCaoDiemTrungBinh,
  fetchBaoCaoTongQuan,
  formatDiem,
  formatNgay,
  TRANG_THAI_META,
} from "../../utils/phieuApi";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import BaoCaoBoSung, { DanhSachChuaLap } from "../../components/QuanLyChamDiem/BaoCaoBoSung";
import HocVuTongQuan from "../../components/QuanLyChamDiem/HocVuTongQuan";
import { TRANG_THAI_CHUA_LAP_META } from "../../utils/chuaLapPhieu";
import SearchSelect from "../../components/Common/SearchSelect";
import { useAuth } from "../../context/AuthContext";
import { canAccessPath } from "../../config/menuConfig";

/** Ngày ở trạng thái mà một phiếu chưa hoàn tất bị coi là "để quá lâu". */
const NGUONG_TRE = 30;

const BaoCaoDonVi = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [donViList, setDonViList] = useState([]);
  const [idDonVi, setIdDonVi] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [tongQuan, setTongQuan] = useState(null);
  const [diemTb, setDiemTb] = useState([]);
  const [chuaHoanTat, setChuaHoanTat] = useState([]);

  const [drill, setDrill] = useState(null);
  const [loiDanhSach, setLoiDanhSach] = useState("");
  const requestId = useRef(0);

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  useEffect(() => {
    const taiDonVi = async () => {
      try {
        const res = await apiFetch("donvi");
        if (!res.ok) return;
        const result = await res.json();
        setDonViList(result.Items || (Array.isArray(result) ? result : []));
      } catch (error) {
        console.error("Lỗi tải danh mục đơn vị:", error);
      }
    };
    taiDonVi();
  }, []);

  const taiBaoCao = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    const tham = { idNam: selectedNam, idDonVi: idDonVi || undefined };

    const current = ++requestId.current;
    setDrill(null);
    setTongQuan(null);
    setChuaHoanTat([]);
    setLoiDanhSach("");
    const [tq, tb] = await Promise.allSettled([
      fetchBaoCaoTongQuan(tham), fetchBaoCaoDiemTrungBinh(tham),
    ]);
    if (current !== requestId.current) return;
    const overview = tq.status === "fulfilled" ? tq.value : null;
    setTongQuan(overview);
    setDiemTb(tb.status === "fulfilled" ? tb.value : []);
    const loi = [tq, tb].find((r) => r.status === "rejected");
    if (loi) showToast("error", "Lỗi tải báo cáo", loi.reason.message);
    if (overview?.CoQuyenXemDanhSach === true) {
      try {
        // Keep the unpaged contract until the database migration is confirmed.
        const rows = await fetchBaoCaoChuaHoanTat(tham);
        if (current !== requestId.current) return;
        setChuaHoanTat(rows);
      } catch (error) {
        if (current !== requestId.current) return;
        setLoiDanhSach(error.message);
      }
    }
    setIsLoading(false);
  }, [selectedNam, idDonVi]);

  useEffect(() => {
    if (!dangTaiNam) taiBaoCao();
    return () => { requestId.current += 1; };
  }, [dangTaiNam, taiBaoCao]);

  const demTheoTrangThai = useMemo(() => {
    const map = new Map();
    (tongQuan?.DemTheoTrangThai || []).forEach((d) =>
      map.set(Number(d.TrangThai), d.SoLuong),
    );
    return map;
  }, [tongQuan]);

  const soTre = useMemo(
    () => chuaHoanTat.filter((r) => (r.SoNgayOTrangThai || 0) >= NGUONG_TRE).length,
    [chuaHoanTat],
  );

  return (
    <div className="page-container bc-report">
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
          Báo cáo đơn vị
        </h2>
        <span className="breadcrumb">
          Tiến độ phiếu, điểm trung bình theo đơn vị và danh sách phiếu chưa
          hoàn tất
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

        <div className="cd-field bc-report-unit">
          <label className="cd-label">Đơn vị</label>
          <SearchSelect
            value={idDonVi}
            onChange={(v) => setIdDonVi(v)}
            options={[
              { value: "", label: "-- Toàn bộ phạm vi của tôi --" },
              ...donViList.map((dv) => ({
                value: dv.IdDonVi,
                label: dv.TenDonVi,
              })),
            ]}
            placeholder="-- Toàn bộ phạm vi của tôi --"
          />
        </div>

        <button
          className="btn-cancel"
          onClick={() => {
            taiBaoCao();
          }}
          disabled={isLoading}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tổng hợp số liệu...
          </div>
        </div>
      ) : (
        <div className="bc-report-content">
          <section className="bc-report-section">
            <p className="sub-title">
              TIẾN ĐỘ PHIẾU ({tongQuan?.TongSoPhieu ?? 0} phiếu đã lập)
            </p>
            <div className="stat-card-grid">
              <div className="stat-card">
                <div
                  className="stat-icon-box"
                  style={{
                    background: TRANG_THAI_CHUA_LAP_META.bg,
                    color: TRANG_THAI_CHUA_LAP_META.color,
                  }}
                >
                  <i className={`fa-solid ${TRANG_THAI_CHUA_LAP_META.icon}`}></i>
                </div>
                <div>
                  <div className="stat-label">
                    {TRANG_THAI_CHUA_LAP_META.label}
                  </div>
                  <div className="stat-value">
                    {tongQuan?.SoChuaLapPhieu ?? "-"}
                  </div>
                </div>
              </div>
              {Object.entries(TRANG_THAI_META).map(([tt, meta]) => (
                <div className="stat-card" key={tt}>
                  <div
                    className="stat-icon-box"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    <i className={`fa-solid ${meta.icon}`}></i>
                  </div>
                  <div>
                    <div className="stat-label">{tongQuan?.DemTheoTrangThai?.find((r) => Number(r.TrangThai) === Number(tt))?.TrangThaiText || meta.label}</div>
                    <div className="stat-value">
                      {demTheoTrangThai.get(Number(tt)) || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <BaoCaoBoSung data={tongQuan} onChuaLap={tongQuan?.CoQuyenXemDanhSach === true ? setDrill : undefined} />
          {tongQuan?.CoQuyenXemDanhSach === true && drill && <DanhSachChuaLap key={JSON.stringify([selectedNam, idDonVi, drill])} idNam={selectedNam} idDonVi={idDonVi || undefined} {...drill} onClose={() => setDrill(null)} />}
          <HocVuTongQuan hocVu={tongQuan?.HocVu} />

          {(tongQuan?.DemTheoXepLoai || []).length > 0 && (
            <section className="bc-report-section">
              <p className="sub-title">
                XẾP LOẠI (CHỈ TÍNH PHIẾU ĐÃ HOÀN TẤT)
              </p>
              <div className="stat-card-grid">
                {tongQuan.DemTheoXepLoai.map((x) => (
                  <div className="stat-card" key={x.MaXepLoai}>
                    <div className="stat-icon-box stat-icon-green">
                      <i className="fa-solid fa-award"></i>
                    </div>
                    <div>
                      <div className="stat-label">{x.XepLoaiText || "Chưa có nhãn"}</div>
                      <div className="stat-value">{x.SoLuong}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="bc-report-section">
            <p className="sub-title">
              ĐIỂM TRUNG BÌNH THEO ĐƠN VỊ TRỰC THUỘC
            </p>
            <div className="modern-table-card">
              {diemTb.length === 0 ? (
                <div className="cd-empty">
                  <i className="fa-solid fa-chart-column"></i>
                  Chưa có phiếu nào hoàn tất trong năm này nên chưa tính được điểm
                  trung bình.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="custom-table" style={{ minWidth: "700px" }}>
                    <thead>
                      <tr>
                        <th>Đơn vị</th>
                        <th style={{ width: "110px", textAlign: "center" }}>
                          Phiếu GV / VC
                        </th>
                        <th style={{ width: "130px", textAlign: "right" }}>
                          TB giảng viên
                        </th>
                        <th style={{ width: "120px", textAlign: "right" }}>
                          TB viên chức
                        </th>
                        <th style={{ width: "120px", textAlign: "right" }}>
                          TB chung (tham khảo)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {diemTb.map((r) => (
                        <tr key={r.IdDonVi}>
                          <td>
                            <b style={{ color: "#0f172a" }}>
                              {r.LaTrucThuoc && "Trực thuộc "}{r.TenDonVi || `Đơn vị #${r.IdDonVi}`}
                            </b>
                            {r.MaDonVi && (
                              <span
                                className="code-pill"
                                style={{ marginLeft: "8px" }}
                              >
                                {r.MaDonVi}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>{r.SoPhieuGiangVien ?? "—"} / {r.SoPhieuVienChuc ?? "—"}</td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#1d4ed8",
                            }}
                          >
                            {formatDiem(r.DiemTrungBinhGiangVien)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {formatDiem(r.DiemTrungBinhVienChuc)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {formatDiem(r.DiemTrungBinh)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {tongQuan?.CoQuyenXemDanhSach === true && <section className="bc-report-section">
          <p className="sub-title">
            PHIẾU CHƯA HOÀN TẤT ({chuaHoanTat.length}
            {soTre > 0 ? `, ${soTre} phiếu quá ${NGUONG_TRE} ngày` : ""})
          </p>
          <div className="modern-table-card">
            {loiDanhSach ? <p role="alert">{loiDanhSach}</p> : chuaHoanTat.length === 0 ? (
              <div className="cd-empty">
                <i
                  className="fa-solid fa-circle-check"
                  style={{ color: "#10b981" }}
                ></i>
                Mọi phiếu trong phạm vi của bạn đã hoàn tất.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="custom-table" style={{ minWidth: "900px" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "26%" }}>Nhân viên</th>
                      <th style={{ width: "20%" }}>Đơn vị</th>
                      <th style={{ width: "16%", textAlign: "center" }}>
                        Trạng thái
                      </th>
                      <th style={{ width: "12%" }}>Ngày tạo</th>
                      <th style={{ width: "12%", textAlign: "center" }}>
                        Ngày ở trạng thái
                      </th>
                      <th style={{ width: "8%", textAlign: "center" }}>Mở</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chuaHoanTat.map((r) => {
                      const tre = (r.SoNgayOTrangThai || 0) >= NGUONG_TRE;
                      return (
                        <tr key={r.IdPhieu}>
                          <td>
                            <b style={{ color: "#0f172a", display: "block" }}>
                              {r.HoTen || `#${r.IdNhanVien}`}
                            </b>
                            <div className="bc-report-person-meta">
                              <small>{r.LoaiDoiTuongText}</small>
                              {r.MaNhanVien && (
                                <span className="code-pill">{r.MaNhanVien}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: "13px", color: "#475569" }}>
                            {r.TenDonVi || "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {r.TrangThaiText || "—"}
                          </td>
                          <td style={{ fontSize: "13px" }}>
                            {formatNgay(r.NgayTao)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              className="rating-badge"
                              style={
                                tre
                                  ? {
                                    background: "#fef2f2",
                                    color: "#b91c1c",
                                    border: "1px solid #fecaca",
                                  }
                                  : {
                                    background: "#f1f5f9",
                                    color: "#475569",
                                    border: "1px solid #e2e8f0",
                                  }
                              }
                            >
                              {r.SoNgayOTrangThai == null ? "—" : `${r.SoNgayOTrangThai} ngày`}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              {canAccessPath(`/quan-ly/phieu/${r.IdPhieu}`, user) && <button
                                className="action-btn view-btn"
                                title="Mở phiếu"
                                aria-label="Mở phiếu"
                                onClick={() =>
                                  navigate(`/quan-ly/phieu/${r.IdPhieu}`)
                                }
                              >
                                <i className="fa-solid fa-eye"></i>
                              </button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          </section>}
        </div>
      )}
    </div>
  );
};

export default BaoCaoDonVi;
