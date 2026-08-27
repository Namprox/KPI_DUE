import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import {
  fetchPhieuDetail,
  fetchPhieuList,
  formatDiem,
  formatNgay,
  laTieuChiChamTay,
  NGUON_TRA_VE,
  TRANG_THAI,
  TRANG_THAI_DONG,
  TRANG_THAI_META,
} from "../../utils/phieuApi";
import { fetchDonViList, getTenDonViFromList } from "../../utils/donViApi";
import {
  TrangThaiBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";
import TienDoCham from "../../components/QuanLyChamDiem/TienDoCham";
import SearchSelect from "../../components/Common/SearchSelect";

const PAGE_SIZE = 20;
const SO_PHIEU_TAI_SONG_SONG = 5;

const MOI_TRANG_THAI = [
  TRANG_THAI.NHAP,
  TRANG_THAI.THAM_DINH,
  TRANG_THAI.CHO_TK_DUYET,
  TRANG_THAI.TK_DA_DUYET,
  TRANG_THAI.HOAN_TAT,
];

/**
 * Tiến độ chấm của một phiếu, đếm từ ChiTiet[] của bản chi tiết.
 *
 * Mẫu số là tiêu chí CHẤM TAY (giống tinhTienDoCham): dòng LoaiNguonDiem = 2
 * được engine chốt ngay trong giao dịch nộp phiếu nên gộp vào sẽ khiến thanh
 * tiến độ báo gần đầy khi chưa ai thẩm định.
 *
 * `choBoSung` đếm dòng đang mở yêu cầu trả về cho chủ phiếu - đây là phần việc
 * của chính người đang xem bảng, nên tách riêng khỏi "chưa chốt".
 */
const doTienDoPhieu = (phieu) => {
  const chiTiet = phieu?.ChiTiet || [];
  const chamTay = chiTiet.filter(laTieuChiChamTay);
  return {
    tong: chamTay.length,
    xong: chamTay.filter(
      (ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG.DA_CHOT,
    ).length,
    choBoSung: chiTiet.filter(
      (ct) => Number(ct.NguonTraVe) === NGUON_TRA_VE.DON_VI_THAM_DINH,
    ).length,
  };
};

/**
 * Danh sách phiếu đánh giá của CHÍNH NGƯỜI ĐANG ĐĂNG NHẬP, qua các năm.
 *
 * Luôn truyền idNhanVien của mình: với người không thuộc cấp Khoa/Trường thì
 * server đã tự giới hạn phạm vi, còn với trưởng đơn vị thì tham số này là thứ
 * ngăn màn hình "phiếu của tôi" biến thành danh sách toàn đơn vị.
 */
const LichSuDanhGia = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = user || {};
  // Bộ lọc năm ở đây có thêm lựa chọn "tất cả" nên giữ state riêng, chỉ mượn
  // selectedNam của hook làm giá trị mặc định lúc mở trang.
  const { namList, selectedNam, dangTaiNam } = useNamDanhGia();

  const [donViList, setDonViList] = useState([]);
  const [idDonVi, setIdDonVi] = useState("");
  const [rows, setRows] = useState([]);
  // IdPhieu -> tiến độ chấm. undefined = đang tải, null = tải hỏng.
  const [tienDoTheoPhieu, setTienDoTheoPhieu] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [idNam, setIdNam] = useState(""); // '' = mọi năm
  const [trangThaiChon, setTrangThaiChon] = useState([]); // rỗng = mọi trạng thái
  const [sortBy, setSortBy] = useState("ngay_tao");
  const [page, setPage] = useState(1);
  // Chỉ tải sau khi năm mặc định đã được gieo, nếu không lượt tải đầu tiên chạy
  // với bộ lọc rỗng rồi lập tức bị lượt thứ hai thay thế.
  const [daSanSang, setDaSanSang] = useState(false);

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  useEffect(() => {
    fetchDonViList().then(setDonViList);
  }, []);

  // Mặc định bám theo năm đang mở, người dùng vẫn chuyển sang "mọi năm" được.
  useEffect(() => {
    if (dangTaiNam) return;
    setIdNam(String(selectedNam || ""));
    setDaSanSang(true);
  }, [dangTaiNam, selectedNam]);

  const taiDanhSach = useCallback(async () => {
    if (!currentUser.IdNhanVien) return;
    setIsLoading(true);
    try {
      const items = await fetchPhieuList({
        idNam: idNam || undefined,
        idDonVi: idDonVi || undefined,
        idNhanVien: currentUser.IdNhanVien,
        trangThai: trangThaiChon.length > 0 ? trangThaiChon : undefined,
        page,
        pageSize: PAGE_SIZE,
        sortBy,
      });
      setRows(items);
    } catch (error) {
      console.error("Lỗi tải danh sách phiếu của tôi:", error);
      showToast("error", "Lỗi", error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.IdNhanVien, idNam, idDonVi, trangThaiChon, page, sortBy]);

  useEffect(() => {
    if (daSanSang) taiDanhSach();
  }, [daSanSang, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [idNam, idDonVi, trangThaiChon, sortBy]);

  /**
   * Trạng thái chấm không có trong PhieuDanhGiaDto của danh sách (chỉ có trạng
   * thái HỒ SƠ), nên phải mở chi tiết từng phiếu để đếm dòng đã chốt. Tải sau khi
   * bảng đã hiện, theo lô 5 phiếu để không bắn cả trang request cùng lúc và để
   * từng dòng sáng dần thay vì chờ hết.
   *
   * Một phiếu lỗi chỉ mất ô của chính nó, không làm hỏng cả bảng.
   */
  useEffect(() => {
    setTienDoTheoPhieu({});
    if (rows.length === 0) return undefined;

    let daHuy = false;
    (async () => {
      // Phiếu chưa nộp thì chưa ai chấm - bỏ qua để khỏi tốn một request cho ô
      // vốn chỉ hiện dòng chữ "chưa nộp".
      const ids = rows
        .filter((p) => Number(p.TrangThai) !== TRANG_THAI.NHAP)
        .map((p) => p.IdPhieu);
      for (let i = 0; i < ids.length; i += SO_PHIEU_TAI_SONG_SONG) {
        if (daHuy) return;
        const lo = ids.slice(i, i + SO_PHIEU_TAI_SONG_SONG);
        // eslint-disable-next-line no-await-in-loop
        const ketQua = await Promise.all(
          lo.map(async (id) => {
            try {
              return [id, doTienDoPhieu(await fetchPhieuDetail(id))];
            } catch (error) {
              console.error("Lỗi tải tiến độ chấm của phiếu:", error);
              return [id, null];
            }
          }),
        );
        if (daHuy) return;
        setTienDoTheoPhieu((truoc) => {
          const sau = { ...truoc };
          ketQua.forEach(([id, giaTri]) => {
            sau[id] = giaTri;
          });
          return sau;
        });
      }
    })();

    return () => {
      daHuy = true;
    };
  }, [rows]);

  const toggleTrangThai = (tt) => {
    setTrangThaiChon((cur) =>
      cur.includes(tt)
        ? cur.filter((x) => x !== tt)
        : [...cur, tt].sort((a, b) => a - b),
    );
  };

  /**
   * Ô "Trạng thái chấm". Phiếu chưa nộp thì không có gì để chấm - hiện 0/0 chỉ
   * bịa ra một phần việc chưa tồn tại.
   */
  const veTrangThaiCham = (p) => {
    if (Number(p.TrangThai) === TRANG_THAI.NHAP) {
      return (
        <span
          style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}
        >
          Chưa nộp, chưa chấm
        </span>
      );
    }

    const td = tienDoTheoPhieu[p.IdPhieu];
    if (td === undefined) {
      return (
        <div className="cd-progress-ghichu">
          <i className="fa-solid fa-spinner fa-spin"></i> Đang tính...
        </div>
      );
    }
    if (td === null) {
      return <div className="cd-progress-ghichu">Không tải được tiến độ</div>;
    }
    if (td.tong === 0) {
      return (
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>
          Không có tiêu chí chấm tay
        </span>
      );
    }

    return (
      <div className="cd-progress-stack">
        <TienDoCham xong={td.xong} tong={td.tong} nhan="Đã chốt điểm" />
        {td.choBoSung > 0 && (
          <div className="cd-progress-ghichu" style={{ color: "#c2410c" }}>
            <i className="fa-solid fa-rotate-left"></i> {td.choBoSung} tiêu chí
            chờ bạn bổ sung
          </div>
        )}
      </div>
    );
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
          Phiếu đánh giá của tôi
        </h2>
        <span className="breadcrumb">
          {currentUser.HoTen || "Người dùng"} - toàn bộ phiếu KPI qua các năm
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={idNam}
            onChange={(v) => setIdNam(v)}
            options={[
              { value: "", label: "-- Tất cả các năm --" },
              ...namList.map((n) => ({
                value: n.IdNam,
                label: `Năm học ${n.IdNam}`,
              })),
            ]}
            placeholder="-- Tất cả các năm --"
            disabled={dangTaiNam}
          />
        </div>

        {Array.isArray(currentUser?.DonVi) && currentUser.DonVi.length > 1 && (
          <div className="cd-field">
            <label className="cd-label">Đơn vị</label>
            <SearchSelect
              value={idDonVi}
              onChange={(v) => setIdDonVi(v)}
              options={[
                { value: "", label: "-- Tất cả đơn vị --" },
                ...currentUser.DonVi.map((d) => ({
                  value: d.IdDonVi,
                  label: d.TenDonVi || d.MaDonVi,
                })),
              ]}
              placeholder="-- Tất cả đơn vị --"
            />
          </div>
        )}

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

        <button
          className="btn-cancel"
          onClick={taiDanhSach}
          disabled={isLoading}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
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
            background: trangThaiChon.length === 0 ? "#1d4ed8" : "#fff",
            color: trangThaiChon.length === 0 ? "#fff" : "#475569",
            borderColor: trangThaiChon.length === 0 ? "#1d4ed8" : "#e2e8f0",
          }}
          onClick={() => setTrangThaiChon([])}
        >
          Tất cả
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

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải danh sách phiếu...
          </div>
        ) : rows.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-folder-open"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không có phiếu nào
            </h3>
            <p style={{ margin: 0 }}>
              Bạn chưa có phiếu đánh giá khớp bộ lọc hiện tại. Thử chọn "Tất cả
              các năm".
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table" style={{ minWidth: "1080px" }}>
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>Năm học</th>
                  <th style={{ width: "16%" }}>Đơn vị</th>
                  <th style={{ width: "14%", textAlign: "center" }}>
                    Trạng thái
                  </th>
                  <th style={{ width: "18%" }}>Trạng thái chấm</th>
                  <th style={{ width: "10%", textAlign: "right" }}>
                    Tổng điểm
                  </th>
                  <th style={{ width: "14%", textAlign: "center" }}>
                    Xếp loại
                  </th>
                  <th style={{ width: "10%" }}>Ngày gửi</th>
                  <th style={{ width: "10%", textAlign: "center" }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.IdPhieu}>
                    <td style={{ fontWeight: 700, color: "#0f172a" }}>
                      {p.IdNam}
                    </td>
                    <td
                      style={{
                        fontSize: "13px",
                        color: "#334155",
                        fontWeight: 500,
                      }}
                    >
                      {getTenDonViFromList(donViList, p.IdDonVi) || "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <TrangThaiBadge trangThai={p.TrangThai} />
                    </td>
                    <td>{veTrangThaiCham(p)}</td>
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
                      {p.NgayGui ? (
                        formatNgay(p.NgayGui)
                      ) : (
                        <span style={{ color: "#94a3b8", fontStyle: "italic" }}>
                          Chưa nộp
                        </span>
                      )}
                    </td>
                    {/* Bảng này chỉ để TRA CỨU. Lối vào form tự đánh giá nằm ở
                        mục riêng trên sidebar, không nhân bản vào đây: form đi
                        theo NĂM chứ không theo IdPhieu, và với phiếu đã qua thẩm
                        định nó chỉ là bản chỉ đọc nghèo hơn trang chi tiết. */}
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="action-btn view-btn"
                          title="Xem điểm từng tiêu chí, minh chứng và lịch sử chấm"
                          onClick={() =>
                            navigate(`/lich-su-danh-gia/${p.IdPhieu}`)
                          }
                        >
                          <i className="fa-solid fa-list-check"></i>
                        </button>
                        <button
                          type="button"
                          className="action-btn view-btn"
                          title="Xem minh chứng của phiếu này"
                          onClick={() =>
                            navigate(`/kho-minh-chung?idPhieu=${p.IdPhieu}`)
                          }
                        >
                          <i className="fa-solid fa-paperclip"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server không trả TotalCount trên nhóm API phiếu nên không dùng được
            <Paginator>: chỉ suy ra "còn trang sau" từ số dòng nhận được. */}
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
          <span>Trang {page}</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn-cancel"
              style={{ padding: "8px 14px" }}
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <i className="fa-solid fa-chevron-left"></i> Trước
            </button>
            <button
              className="btn-cancel"
              style={{ padding: "8px 14px" }}
              disabled={rows.length < PAGE_SIZE || isLoading}
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

export default LichSuDanhGia;
