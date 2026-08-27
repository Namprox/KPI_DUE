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
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import {
  fetchPhieuListDayDu,
  formatDiem,
  formatNgay,
  TRANG_THAI,
  TRANG_THAI_META,
} from "../../utils/phieuApi";
import { laTruongKhoa } from "../../utils/phieuChamPermissions";
import {
  TRANG_THAI_CHUA_LAP,
  TRANG_THAI_CHUA_LAP_META,
} from "../../utils/chuaLapPhieu";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useChuaTuCham } from "../../hooks/useChuaTuCham";
import {
  chuCaiDau,
  thongTinNhanVien,
  useNhanVienIndex,
} from "../../hooks/useNhanVienIndex";
import {
  TrangThaiBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";
import SearchSelect from "../../components/Common/SearchSelect";

const PAGE_SIZE = 20;

const MOI_TRANG_THAI = [
  TRANG_THAI.NHAP,
  TRANG_THAI.THAM_DINH,
  TRANG_THAI.CHO_TK_DUYET,
  TRANG_THAI.TK_DA_DUYET,
  TRANG_THAI.HOAN_TAT,
];

/**
 * Danh sách phiếu toàn đơn vị, mọi trạng thái.
 *
 * Phạm vi dữ liệu do server quyết theo JWT (cấp Khoa thấy cây đơn vị mình).
 * Bộ lọc idDonVi ở đây chỉ để thu hẹp trong phạm vi đã được phép - chọn đơn vị
 * ngoài phạm vi cũng không lộ thêm dữ liệu.
 *
 * Đây là màn hình TRA CỨU, không phải hàng đợi: mọi thao tác nghiệp vụ nằm ở
 * màn hình của đúng giai đoạn. Nhưng hồ sơ ở trạng thái 3 lọt vào đây là việc
 * đang chờ CHÍNH người đang xem (nếu họ là TK/TKL), nên phải có lối đi thẳng
 * sang "Duyệt hồ sơ KPI" - bắt họ tự nhớ đổi mục sidebar là bỏ rơi giữa đường.
 * Trưởng phòng không thấy lối đi này: giai đoạn 3 trả 403 với họ.
 *
 * Bảng này ghép HAI nguồn: phiếu từ GET /phieu, và người chưa lập phiếu do
 * useChuaTuCham đối chiếu danh bạ ở client. "Chưa lập phiếu" là một chip trạng
 * thái bình thường (sentinel TRANG_THAI_CHUA_LAP), và "Tất cả" bao gồm cả họ -
 * đó mới là toàn cảnh của đơn vị, không phải toàn cảnh của bảng phiếu.
 *
 * HỆ QUẢ: trang này KHÔNG phân trang ở server nữa. Không thể trộn dữ liệu client
 * vào một trang do server cắt sẵn mà số trang và số dòng vẫn đúng, nên danh sách
 * phiếu được quét hết (fetchPhieuListDayDu) rồi cắt trang tại client. Đổi lại
 * mọi con số trên trang là con số THẬT của cả phạm vi, không còn phải rào trước
 * "chỉ tính những dòng đang hiện".
 */
const DanhSachPhieu = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const { nhanVienIndex } = useNhanVienIndex();

  const [donViList, setDonViList] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [idDonVi, setIdDonVi] = useState("");
  // Rỗng = tất cả, KỂ CẢ người chưa lập phiếu. Mảng này có thể chứa sentinel
  // TRANG_THAI_CHUA_LAP - phải lọc bỏ trước khi gửi lên server.
  const [trangThaiChon, setTrangThaiChon] = useState([]);
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  const [sortBy, setSortBy] = useState("ngay_tao");
  const [page, setPage] = useState(1);
  const [timKiem, setTimKiem] = useState("");

  const {
    chuaLapPhieu,
    dangTai: dangTaiChuaLap,
    loi: loiChuaLap,
  } = useChuaTuCham({
    idNam: selectedNam,
    idDonViGoc: user?.IdDonVi,
    idDonViLoc: idDonVi || undefined,
  });

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

  const chonChuaLap = trangThaiChon.includes(TRANG_THAI_CHUA_LAP);
  const trangThaiPhieu = useMemo(
    () => trangThaiChon.filter((tt) => tt !== TRANG_THAI_CHUA_LAP),
    [trangThaiChon],
  );
  // Bộ lọc ngày chạy trên ngày tạo/gửi PHIẾU. Người chưa lập phiếu không có ngày
  // nào cả nên không thể khớp khoảng nào - ghép họ vào lúc đang lọc ngày là bịa ra
  // một kết quả không tồn tại.
  const dangLocNgay = Boolean(tuNgay || denNgay);
  // Rỗng = "Tất cả", và tất cả thì gồm luôn người chưa lập phiếu.
  const hienChuaLap =
    (trangThaiChon.length === 0 || chonChuaLap) && !dangLocNgay;
  // Chỉ tick mỗi "Chưa lập phiếu" thì GET /phieu không còn gì để trả - gọi vào
  // chỉ tốn một request rồi vứt đi. Trừ khi bộ lọc ngày đã loại họ ra, lúc đó
  // bảng rỗng thật và vẫn phải nói rõ vì sao.
  const boQuaPhieu = chonChuaLap && trangThaiPhieu.length === 0 && !dangLocNgay;

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    if (boQuaPhieu) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const items = await fetchPhieuListDayDu({
        idNam: selectedNam,
        idDonVi: idDonVi || undefined,
        trangThai: trangThaiPhieu.length > 0 ? trangThaiPhieu : undefined,
        // input type=date cho ra 'yyyy-MM-dd'; server nhận date-time nên chuỗi này
        // được hiểu là 00:00 ngày đó - đúng ý "từ đầu ngày / đến đầu ngày".
        tuNgay: tuNgay || undefined,
        denNgay: denNgay || undefined,
        sortBy,
      });
      setRows(items);
    } catch (error) {
      console.error("Lỗi tải danh sách phiếu:", error);
      showToast("error", "Lỗi", error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedNam,
    idDonVi,
    trangThaiPhieu,
    tuNgay,
    denNgay,
    sortBy,
    boQuaPhieu,
  ]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [selectedNam, idDonVi, trangThaiChon, tuNgay, denNgay, sortBy, timKiem]);

  const toggleTrangThai = (tt) => {
    setTrangThaiChon((cur) =>
      cur.includes(tt)
        ? cur.filter((x) => x !== tt)
        : [...cur, tt].sort((a, b) => a - b),
    );
  };

  const rowsDaLoc = useMemo(() => {
    // Phiếu đã lập lên trước, người chưa lập xếp sau cùng: đây là màn hình TRA CỨU
    // phiếu, nên thứ tự sortBy của danh sách phiếu phải là thứ tự chính. Nhóm chưa
    // lập không có ngày tạo / ngày gửi để xen vào đúng chỗ theo sortBy, gom hết
    // xuống cuối là chỗ duy nhất không phá vỡ thứ tự đó.
    const nguon = [...rows, ...(hienChuaLap ? chuaLapPhieu : [])];
    const withNames = nguon.map((p) => ({
      ...p,
      nv: thongTinNhanVien(nhanVienIndex, p.IdNhanVien),
    }));
    const q = timKiem.trim().toLowerCase();
    if (!q) return withNames;
    return withNames.filter((p) =>
      [p.nv.hoTen, p.nv.maNhanVien, p.nv.tenDonVi].some((f) =>
        String(f || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [hienChuaLap, chuaLapPhieu, rows, nhanVienIndex, timKiem]);

  const tongTrang = Math.max(1, Math.ceil(rowsDaLoc.length / PAGE_SIZE));
  const rowsHienThi = rowsDaLoc.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const dangTaiBang = isLoading || (hienChuaLap && dangTaiChuaLap);
  // Đếm sau khi đã lọc theo ô tìm kiếm, không lấy thẳng chuaLapPhieu.length: hai
  // con số cạnh nhau trong cùng một câu mà một cái lọc một cái không thì đọc ra sai.
  const soChuaLapHienThi = useMemo(
    () => rowsDaLoc.filter((p) => !p.IdPhieu).length,
    [rowsDaLoc],
  );

  const coTheChot = laTruongKhoa(user);
  // Đếm trên TOÀN BỘ tập kết quả, không riêng trang đang xem: từ khi trang tự cắt
  // trang ở client, `rowsDaLoc` đã là đủ cả phạm vi nên con số này nói thật.
  const soChoChot = useMemo(
    () =>
      rowsDaLoc.filter((p) => p.TrangThai === TRANG_THAI.CHO_TK_DUYET).length,
    [rowsDaLoc],
  );
  const metaChoChot = TRANG_THAI_META[TRANG_THAI.CHO_TK_DUYET];
  const laTatCa = trangThaiChon.length === 0;

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
          Danh sách phiếu đánh giá
        </h2>
        <span className="breadcrumb">
          Toàn bộ phiếu trong phạm vi đơn vị bạn phụ trách, mọi trạng thái
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

        <div className="cd-field" style={{ flex: "2 1 220px" }}>
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

        <div className="cd-field">
          <label className="cd-label">Từ ngày (ngày tạo)</label>
          <input
            type="date"
            className="form-input"
            value={tuNgay}
            onChange={(e) => setTuNgay(e.target.value)}
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Đến ngày</label>
          <input
            type="date"
            className="form-input"
            value={denNgay}
            onChange={(e) => setDenNgay(e.target.value)}
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Sắp xếp</label>
          <SearchSelect
            value={sortBy}
            onChange={(v) => setSortBy(v)}
            options={[
              { value: "ngay_tao", label: "Ngày tạo" },
              { value: "ngay_gui", label: "Ngày gửi" },
            ]}
          />
        </div>

        <div className="cd-field" style={{ flex: "2 1 220px" }}>
          <label className="cd-label">Tìm giảng viên</label>
          <input
            type="text"
            className="form-input"
            placeholder="Họ tên, mã cán bộ, đơn vị..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>
          Trạng thái:
        </span>
        <button
          className="cd-status-badge"
          style={{
            cursor: "pointer",
            background: laTatCa ? "#1d4ed8" : "#fff",
            color: laTatCa ? "#fff" : "#475569",
            borderColor: laTatCa ? "#1d4ed8" : "#e2e8f0",
          }}
          onClick={() => setTrangThaiChon([])}
        >
          Tất cả
        </button>
        <button
          className="cd-status-badge"
          title="Người trong đơn vị chưa từng lưu phiếu năm nay - họ không có dòng nào trong bảng phiếu nên chỉ ghép được ở đây"
          style={{
            cursor: "pointer",
            background: chonChuaLap ? TRANG_THAI_CHUA_LAP_META.bg : "#fff",
            color: chonChuaLap ? TRANG_THAI_CHUA_LAP_META.color : "#94a3b8",
            borderColor: chonChuaLap
              ? TRANG_THAI_CHUA_LAP_META.border
              : "#e2e8f0",
          }}
          onClick={() => toggleTrangThai(TRANG_THAI_CHUA_LAP)}
        >
          <i className={`fa-solid ${TRANG_THAI_CHUA_LAP_META.icon}`}></i>{" "}
          {TRANG_THAI_CHUA_LAP_META.label}
          {!dangTaiChuaLap &&
            chuaLapPhieu.length > 0 &&
            ` (${chuaLapPhieu.length})`}
        </button>
        {MOI_TRANG_THAI.map((tt) => {
          const meta = TRANG_THAI_META[tt];
          const chon = trangThaiChon.includes(tt);
          return (
            <button
              key={tt}
              className="cd-status-badge"
              style={{
                cursor: "pointer",
                background: chon ? meta.bg : "#fff",
                color: chon ? meta.color : "#94a3b8",
                borderColor: chon ? meta.border : "#e2e8f0",
              }}
              onClick={() => toggleTrangThai(tt)}
            >
              <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
            </button>
          );
        })}
      </div>

      {coTheChot && !dangTaiBang && soChoChot > 0 && (
        <div className="cd-goi-tom-tat">
          <span
            className="cd-status-badge"
            style={{
              background: metaChoChot.bg,
              color: metaChoChot.color,
              borderColor: metaChoChot.border,
            }}
          >
            <i className={`fa-solid ${metaChoChot.icon}`}></i>{" "}
            {metaChoChot.label}
          </span>
          <span>
            <b>{soChoChot}</b> hồ sơ khớp bộ lọc đã thẩm định xong và chờ bạn
            chọn xếp loại để chốt.
          </span>
          <button
            className="cd-link-btn"
            onClick={() => navigate("/quan-ly/duyet-ho-so")}
          >
            Mở Duyệt hồ sơ KPI <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      )}

      {chonChuaLap && dangLocNgay && (
        <div className="cd-canh-bao">
          <i className="fa-solid fa-circle-info"></i>
          <span>
            Đang lọc theo khoảng ngày nên người chưa lập phiếu bị bỏ ra: họ
            không có ngày tạo hay ngày gửi để khớp. Xóa hai ô ngày để xem lại
            họ.
          </span>
        </div>
      )}

      {hienChuaLap && loiChuaLap && (
        <div className="cd-canh-bao">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            {loiChuaLap}. Bảng dưới đây chỉ còn là danh sách phiếu - người chưa
            lập phiếu KHÔNG được ghép vào, đừng coi đây là toàn cảnh đơn vị.
          </span>
        </div>
      )}

      <div className="modern-table-card">
        {dangTaiBang ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            {boQuaPhieu
              ? "Đang đối chiếu danh bạ đơn vị với danh sách phiếu..."
              : "Đang tải danh sách phiếu..."}
          </div>
        ) : rowsHienThi.length === 0 ? (
          <div className="cd-empty">
            <i
              className={`fa-solid ${boQuaPhieu ? "fa-circle-check" : "fa-folder-open"}`}
            ></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              {boQuaPhieu ? "Cả đơn vị đã lập phiếu" : "Không có dòng nào"}
            </h3>
            <p style={{ margin: 0 }}>
              {boQuaPhieu
                ? "Mọi người thuộc diện đánh giá trong phạm vi này đều đã có phiếu năm nay."
                : "Thử nới bộ lọc trạng thái hoặc khoảng thời gian."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table" style={{ minWidth: "1050px" }}>
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Giảng viên</th>
                  <th style={{ width: "16%" }}>Đơn vị</th>
                  <th style={{ width: "15%", textAlign: "center" }}>
                    Trạng thái
                  </th>
                  <th style={{ width: "10%", textAlign: "right" }}>
                    Tổng điểm
                  </th>
                  <th style={{ width: "14%", textAlign: "center" }}>
                    Xếp loại
                  </th>
                  <th style={{ width: "11%" }}>Ngày gửi</th>
                  <th style={{ width: "8%", textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((p) => (
                  <tr key={p.key || `phieu-${p.IdPhieu}`}>
                    <td>
                      <div className="teacher-avatar-wrapper">
                        <div className="teacher-avatar">
                          {chuCaiDau(p.nv.hoTen)}
                        </div>
                        <div>
                          <b style={{ color: "#0f172a", display: "block" }}>
                            {p.nv.hoTen}
                          </b>
                          {p.nv.maNhanVien && (
                            <span className="code-pill">{p.nv.maNhanVien}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: "13px", color: "#475569" }}>
                      {p.nv.tenDonVi || "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <TrangThaiBadge trangThai={p.TrangThai} />
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {formatDiem(p.TongDiemTichLuy)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <XepLoaiBadge xepLoai={p.XepLoai} />
                    </td>
                    <td style={{ fontSize: "13px" }}>
                      {formatNgay(p.NgayGui)}
                    </td>
                    <td>
                      <div className="table-actions">
                        {/* Dòng "chưa lập phiếu" không có IdPhieu - mọi nút dẫn tới
                            /quan-ly/phieu/undefined. Lối đi duy nhất còn nghĩa là hồ
                            sơ KPI của người đó. */}
                        {!p.IdPhieu ? (
                          <button
                            className="action-btn view-btn"
                            title="Xem hồ sơ KPI của người này"
                            onClick={() =>
                              navigate(`/quan-ly/giang-vien/${p.IdNhanVien}`)
                            }
                          >
                            <i className="fa-solid fa-id-card"></i>
                          </button>
                        ) : p.TrangThai === TRANG_THAI.THAM_DINH ? (
                          <button
                            className="action-btn edit-btn"
                            title="Thẩm định hồ sơ này"
                            onClick={() =>
                              navigate(`/quan-ly/phieu/${p.IdPhieu}`)
                            }
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                        ) : (
                          <button
                            className="action-btn view-btn"
                            title="Xem chi tiết phiếu"
                            onClick={() =>
                              navigate(`/quan-ly/phieu/${p.IdPhieu}`)
                            }
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                        )}
                        {/* Trạng thái 3 là việc của Trưởng khoa, và màn hình chốt
                            nằm ở route khác - nút này là cầu nối duy nhất từ đây
                            sang đó. Giữ luôn nút xem bên trái: người dùng vẫn cần
                            xem lại từng tiêu chí trước khi quyết định. */}
                        {coTheChot &&
                          p.TrangThai === TRANG_THAI.CHO_TK_DUYET && (
                            <button
                              className="action-btn chot-btn"
                              title="Chọn xếp loại và chốt hồ sơ này"
                              onClick={() =>
                                navigate(`/quan-ly/duyet-ho-so/${p.IdPhieu}`)
                              }
                            >
                              <i className="fa-solid fa-user-check"></i>
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderTop: "1px solid #e2e8f0",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          <span>
            Trang {page}/{tongTrang} · {rowsDaLoc.length} dòng
            {soChuaLapHienThi > 0
              ? ` (trong đó ${soChuaLapHienThi} người chưa lập phiếu)`
              : ""}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn-cancel"
              style={{ padding: "8px 14px" }}
              disabled={page <= 1 || dangTaiBang}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="fa-solid fa-chevron-left"></i> Trước
            </button>
            <button
              className="btn-cancel"
              style={{ padding: "8px 14px" }}
              disabled={page >= tongTrang || dangTaiBang}
              onClick={() => setPage((p) => Math.min(tongTrang, p + 1))}
            >
              Sau <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DanhSachPhieu;
