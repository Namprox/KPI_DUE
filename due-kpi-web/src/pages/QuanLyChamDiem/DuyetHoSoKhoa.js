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
import {
  fetchPhieuChoCham,
  fetchPhieuList,
  formatDiem,
  formatNgay,
  LOAI_DOI_TUONG,
  TRANG_THAI,
} from "../../utils/phieuApi";
import { fetchToTrinhList } from "../../utils/toTrinhApi";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useChuaTuCham } from "../../hooks/useChuaTuCham";
import {
  chuCaiDau,
  thongTinNhanVien,
  useNhanVienIndex,
} from "../../hooks/useNhanVienIndex";
import SearchSelect from "../../components/Common/SearchSelect";
import {
  TrangThaiBadge,
  TrangThaiToTrinhBadge,
  XepLoaiBadge,
  XepLoaiKhoaBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";

const PAGE_SIZE = 20;

/**
 * Trần số hồ sơ nạp một lần cho mỗi tab.
 *
 * Nhóm API phiếu KHÔNG trả TotalCount, nên muốn hiện số đếm trên tab thì không có
 * cách nào ngoài nạp thẳng danh sách. Một Khoa vài trăm người vẫn gọn trong một
 * request; chạm trần thì số đếm hiện dạng "200+" chứ không bịa con số.
 */
const TRAN_NAP = 200;

const TAB = {
  CHUA_CHAM: "chua-cham",
  CHO_CHOT: "cho-chot",
  THAM_DINH: "tham-dinh",
  DA_CHOT: "da-chot",
};

const TEN_LOAI_DOI_TUONG = {
  [LOAI_DOI_TUONG.GIANG_VIEN]: "GV",
  [LOAI_DOI_TUONG.VIEN_CHUC]: "VC",
};

/**
 * Hàng đợi giai đoạn 3 của Trưởng khoa — các tab bám đúng chặng hồ sơ đi qua.
 *
 * Nguồn dữ liệu KHÁC NHAU cho từng tab, đừng gộp:
 *
 *  - "Chưa tự chấm"    KHÔNG lấy từ nhóm API phiếu. Người chưa bấm lưu lần nào
 *    không có dòng nào trong `phieu_danh_gia` nên mọi endpoint phiếu đều không
 *    thấy họ; tab này ghép danh bạ nhân viên với danh sách phiếu ở client
 *    (useChuaTuCham). Gồm cả người đã lưu nháp nhưng chưa nộp — dưới góc nhìn
 *    Trưởng khoa cả hai đều là hồ sơ chưa khởi động.
 *
 *  - "Chờ tôi chốt"    GET /api/phieu?trangThai=3. Endpoint tự giới hạn phạm vi về
 *    đơn vị của người đăng nhập cộng đơn vị con trực tiếp. KHÔNG dùng
 *    /api/phieu/truong/pending: endpoint đó chỉ dành cho Hiệu trưởng, trả 403 với
 *    Trưởng khoa và cũng chỉ trả phiếu ở trạng thái 4.
 *
 *  - "Đang thẩm định"  GET /api/phieu/khoa/pending. Bất chấp cái tên, đây KHÔNG
 *    phải hàng đợi chờ chốt: sp_phieu_khoa_get_pending lọc trang_thai = 2. Giá trị
 *    của nó là hai cột SoTieuChiDaCham / SoTieuChiDuocGiao — biết còn vướng đơn vị
 *    nào trước khi hồ sơ rơi vào tab 1.
 *
 *  - "Đã chốt"         GET /api/phieu?trangThai=4,5. Gộp cả hồ sơ đã vào gói
 *    (4) lẫn hồ sơ Hiệu trưởng đã duyệt xong (5).
 *
 * Các tab nạp cùng lúc và phân trang tại client: server không trả TotalCount nên
 * không có đường nào khác để hiện số đếm trên nhãn tab.
 */
const DuyetHoSoKhoa = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const { nhanVienIndex } = useNhanVienIndex();
  const {
    tatCa: chuaTuCham,
    dangTai: dangTaiChuaCham,
    loi: loiChuaCham,
    taiLai: taiLaiChuaCham,
  } = useChuaTuCham({ idNam: selectedNam, idDonViGoc: user?.IdDonVi });

  const [tab, setTab] = useState(TAB.CHO_CHOT);
  const [duLieu, setDuLieu] = useState({
    [TAB.CHO_CHOT]: [],
    [TAB.THAM_DINH]: [],
    [TAB.DA_CHOT]: [],
  });
  const [goiToTrinh, setGoiToTrinh] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [timKiem, setTimKiem] = useState("");
  const [locLoai, setLocLoai] = useState("");

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    const ketQua = await Promise.allSettled([
      fetchPhieuList({
        idNam: selectedNam,
        trangThai: TRANG_THAI.CHO_TK_DUYET,
        page: 1,
        pageSize: TRAN_NAP,
        sortBy: "ngay_gui",
      }),
      fetchPhieuChoCham({ idNam: selectedNam, page: 1, pageSize: TRAN_NAP }),
      fetchPhieuList({
        idNam: selectedNam,
        trangThai: [TRANG_THAI.TK_DA_DUYET, TRANG_THAI.HOAN_TAT],
        page: 1,
        pageSize: TRAN_NAP,
        sortBy: "ngay_gui",
      }),
      fetchToTrinhList({ idNam: selectedNam }),
    ]);

    const [choChot, thamDinh, daChot, toTrinh] = ketQua;
    // Chỉ báo lỗi cho ba danh sách phiếu. Gói tờ trình hỏng (403 với người không
    // phải Trưởng khoa, hoặc chưa có gói nào) chỉ làm mất cái badge, không đáng
    // để bắn toast đỏ che mất việc chính.
    const loi = [choChot, thamDinh, daChot].find(
      (r) => r.status === "rejected",
    );
    if (loi) {
      console.error("Lỗi tải hàng đợi chốt hồ sơ:", loi.reason);
      showToast(
        "error",
        "Lỗi",
        loi.reason?.message || "Không tải được danh sách hồ sơ",
      );
    }
    if (toTrinh.status === "rejected") {
      console.error("Lỗi tải gói tờ trình KPI:", toTrinh.reason);
    }

    setDuLieu({
      [TAB.CHO_CHOT]: choChot.status === "fulfilled" ? choChot.value : [],
      [TAB.THAM_DINH]: thamDinh.status === "fulfilled" ? thamDinh.value : [],
      [TAB.DA_CHOT]: daChot.status === "fulfilled" ? daChot.value : [],
    });
    setGoiToTrinh(toTrinh.status === "fulfilled" ? toTrinh.value : []);
    setIsLoading(false);
  }, [selectedNam]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [tab, timKiem, locLoai, selectedNam]);

  // Tab "Chưa tự chấm" không đi qua `duLieu`: nguồn của nó là phép ghép ở client,
  // không phải một lời gọi hàng đợi, nên nó nằm ngoài trần TRAN_NAP.
  const nguonTab = useMemo(
    () => ({ ...duLieu, [TAB.CHUA_CHAM]: chuaTuCham }),
    [duLieu, chuaTuCham],
  );

  const demTab = (key) => {
    const n = nguonTab[key].length;
    return key !== TAB.CHUA_CHAM && n >= TRAN_NAP ? `${TRAN_NAP}+` : String(n);
  };

  const rowsDaLoc = useMemo(() => {
    const withNames = nguonTab[tab].map((p) => ({
      ...p,
      nv: thongTinNhanVien(nhanVienIndex, p.IdNhanVien),
    }));
    const q = timKiem.trim().toLowerCase();
    return withNames.filter((p) => {
      if (locLoai && Number(p.LoaiDoiTuong) !== Number(locLoai)) return false;
      if (!q) return true;
      return [p.nv.hoTen, p.nv.maNhanVien, p.nv.tenDonVi].some((f) =>
        String(f || "")
          .toLowerCase()
          .includes(q),
      );
    });
  }, [nguonTab, tab, nhanVienIndex, timKiem, locLoai]);

  const tongTrang = Math.max(1, Math.ceil(rowsDaLoc.length / PAGE_SIZE));
  const rowsHienThi = rowsDaLoc.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const laChuaCham = tab === TAB.CHUA_CHAM;
  const laChoChot = tab === TAB.CHO_CHOT;
  const laThamDinh = tab === TAB.THAM_DINH;
  const laDaChot = tab === TAB.DA_CHOT;
  const dangTaiTab = laChuaCham ? dangTaiChuaCham : isLoading;

  // Trưởng khoa hầu như chỉ phụ trách một đơn vị nên gói đầu tiên là gói của họ.
  // Nhiều gói thì badge chỉ tổng hợp con số, không khẳng định trạng thái của gói nào.
  const goiChinh = goiToTrinh.length === 1 ? goiToTrinh[0] : null;
  const tongDaChot = goiToTrinh.reduce((t, g) => t + (g.SoHoSoDaChot ?? 0), 0);
  const tongHoSo = goiToTrinh.reduce((t, g) => t + (g.SoHoSo ?? 0), 0);

  const rongTieuDe = laChuaCham
    ? "Cả đơn vị đã nộp phiếu"
    : laThamDinh
      ? "Không có hồ sơ nào đang thẩm định"
      : laChoChot
        ? "Không có hồ sơ nào chờ chốt"
        : "Chưa chốt hồ sơ nào";
  const rongMoTa = laChuaCham
    ? "Mọi người trong phạm vi đơn vị bạn phụ trách đều đã nộp phiếu tự đánh giá."
    : laThamDinh
      ? 'Hồ sơ ở đây còn ít nhất một tiêu chí chưa được đơn vị thẩm định xong. Chúng tự chuyển sang tab "Chờ tôi chốt" khi đủ 100%.'
      : laChoChot
        ? "Hồ sơ chỉ xuất hiện ở đây khi 100% tiêu chí đã được các đơn vị thẩm định xong."
        : "Hồ sơ đã chốt sẽ hiện ở đây và được đưa vào gói KPI của Khoa.";

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
          Chốt hồ sơ KPI
        </h2>
        <span className="breadcrumb">
          Trưởng khoa rà lại hồ sơ đã thẩm định xong, chọn xếp loại và chốt
          trước khi đóng gói tờ trình
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
          <label className="cd-label">Loại đối tượng</label>
          <SearchSelect
            value={locLoai}
            onChange={(v) => setLocLoai(v)}
            options={[
              { value: "", label: "Tất cả" },
              { value: LOAI_DOI_TUONG.GIANG_VIEN, label: "Giảng viên" },
              {
                value: LOAI_DOI_TUONG.VIEN_CHUC,
                label: "Viên chức / người lao động",
              },
            ]}
          />
        </div>

        <div className="cd-field" style={{ flex: "2 1 240px" }}>
          <label className="cd-label">Tìm giảng viên</label>
          <input
            type="text"
            className="form-input"
            placeholder="Họ tên, mã cán bộ, đơn vị..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
        </div>

        <button
          className="btn-cancel"
          onClick={() => {
            taiDanhSach();
            taiLaiChuaCham();
          }}
          disabled={dangTaiTab}
        >
          <i
            className={`fa-solid fa-rotate${dangTaiTab ? " fa-spin" : ""}`}
          ></i>{" "}
          Làm mới
        </button>

        <button
          className="btn-submit"
          onClick={() => navigate("/quan-ly/to-trinh")}
        >
          <i className="fa-solid fa-file-signature"></i> Tờ trình Khoa
          {goiToTrinh.length > 0 && (
            <span className="cd-nut-dem">
              {tongDaChot}/{tongHoSo}
            </span>
          )}
        </button>
      </div>

      {goiChinh && (
        <div className="cd-goi-tom-tat">
          <TrangThaiToTrinhBadge trangThai={goiChinh.TrangThai} />
          <span>
            Gói KPI {goiChinh.TenDonVi} — <b>{goiChinh.SoHoSoDaChot ?? 0}</b>/
            {goiChinh.SoHoSo ?? 0} hồ sơ đã chốt
          </span>
          <button
            className="cd-link-btn"
            onClick={() => navigate("/quan-ly/to-trinh")}
          >
            Mở tờ trình <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      )}

      {loiChuaCham && (
        <div className="cd-canh-bao">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            {loiChuaCham}. Tab "Chưa tự chấm" đang trống vì chưa đối chiếu được
            danh bạ — con số ở đó không phản ánh thực tế.
          </span>
        </div>
      )}

      <div className="cd-tabs">
        <button
          className={`cd-tab${laChuaCham ? " cd-tab-active" : ""}`}
          onClick={() => setTab(TAB.CHUA_CHAM)}
        >
          <i className="fa-solid fa-user-slash"></i> Chưa tự chấm (
          {dangTaiChuaCham ? "…" : demTab(TAB.CHUA_CHAM)})
        </button>
        <button
          className={`cd-tab${laChoChot ? " cd-tab-active" : ""}`}
          onClick={() => setTab(TAB.CHO_CHOT)}
        >
          <i className="fa-solid fa-user-check"></i> Chờ tôi chốt (
          {demTab(TAB.CHO_CHOT)})
        </button>
        <button
          className={`cd-tab${laThamDinh ? " cd-tab-active" : ""}`}
          onClick={() => setTab(TAB.THAM_DINH)}
        >
          <i className="fa-solid fa-clipboard-check"></i> Đang thẩm định (
          {demTab(TAB.THAM_DINH)})
        </button>
        <button
          className={`cd-tab${laDaChot ? " cd-tab-active" : ""}`}
          onClick={() => setTab(TAB.DA_CHOT)}
        >
          <i className="fa-solid fa-lock"></i> Đã chốt ({demTab(TAB.DA_CHOT)})
        </button>
      </div>

      <div className="modern-table-card">
        {dangTaiTab ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            {laChuaCham
              ? "Đang đối chiếu danh bạ đơn vị với danh sách phiếu..."
              : "Đang tải danh sách hồ sơ..."}
          </div>
        ) : rowsHienThi.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-mug-hot"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              {rongTieuDe}
            </h3>
            <p style={{ margin: 0 }}>{rongMoTa}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table" style={{ minWidth: "1040px" }}>
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Giảng viên</th>
                  <th style={{ width: "8%" }}>Loại</th>
                  {laThamDinh ? (
                    <th style={{ width: "22%" }}>Tiến độ thẩm định</th>
                  ) : laChuaCham ? (
                    <th style={{ width: "22%" }}>Đơn vị</th>
                  ) : (
                    <>
                      <th style={{ width: "10%", textAlign: "right" }}>
                        Cơ bản
                      </th>
                      <th style={{ width: "10%", textAlign: "right" }}>
                        Vượt trội
                      </th>
                      <th style={{ width: "10%", textAlign: "right" }}>
                        Tích lũy
                      </th>
                    </>
                  )}
                  <th style={{ width: "16%" }}>
                    {laDaChot
                      ? "Kết quả"
                      : laThamDinh || laChuaCham
                        ? "Trạng thái"
                        : "Mức Khoa đã chọn"}
                  </th>
                  <th style={{ width: "11%" }}>
                    {laChuaCham ? "Ngày lưu nháp" : "Ngày gửi"}
                  </th>
                  <th style={{ width: "13%", textAlign: "center" }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsHienThi.map((p) => {
                  const daCham = p.SoTieuChiDaCham ?? 0;
                  const duocGiao = p.SoTieuChiDuocGiao ?? 0;
                  const xong = duocGiao > 0 && daCham >= duocGiao;
                  return (
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
                              <span className="code-pill">
                                {p.nv.maNhanVien}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: "13px", color: "#475569" }}>
                        {TEN_LOAI_DOI_TUONG[Number(p.LoaiDoiTuong)] || "—"}
                      </td>

                      {laThamDinh ? (
                        <td>
                          <span
                            className={`cd-tien-do${xong ? " cd-tien-do-xong" : ""}`}
                          >
                            <i
                              className={`fa-solid ${xong ? "fa-circle-check" : "fa-hourglass-half"}`}
                            ></i>
                            {daCham}/{duocGiao} tiêu chí đơn vị bạn được giao
                            thẩm định
                          </span>
                        </td>
                      ) : laChuaCham ? (
                        <td style={{ fontSize: "13px", color: "#475569" }}>
                          {p.nv.tenDonVi || p.TenDonVi || "—"}
                        </td>
                      ) : (
                        <>
                          <td style={{ textAlign: "right", color: "#475569" }}>
                            {formatDiem(p.TongDiemCoBan)}
                          </td>
                          <td style={{ textAlign: "right", color: "#475569" }}>
                            {formatDiem(p.TongDiemVuotTroi)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: 700,
                              color: "#1d4ed8",
                            }}
                          >
                            {formatDiem(p.TongDiemTichLuy)}
                          </td>
                        </>
                      )}

                      <td>
                        {laDaChot ? (
                          p.XepLoai != null ? (
                            <XepLoaiBadge xepLoai={p.XepLoai} />
                          ) : (
                            <XepLoaiKhoaBadge xepLoaiKhoa={p.XepLoaiKhoa} />
                          )
                        ) : (
                          <TrangThaiBadge trangThai={p.TrangThai} />
                        )}
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {formatNgay(laChuaCham ? p.NgayTao : p.NgayGui)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {/* Người chưa lập phiếu không có gì để mở ở màn hình phiếu;
                            lối đi hợp lý duy nhất là hồ sơ KPI của họ (định mức, giờ
                            giảng, NCKH) để Trưởng khoa biết nhắc ai vì việc gì. */}
                        {laChuaCham ? (
                          <button
                            className="btn-cancel"
                            style={{ padding: "8px 14px" }}
                            onClick={() =>
                              navigate(
                                p.IdPhieu
                                  ? `/quan-ly/phieu/${p.IdPhieu}`
                                  : `/quan-ly/giang-vien/${p.IdNhanVien}`,
                              )
                            }
                          >
                            <i className="fa-solid fa-eye"></i>{" "}
                            {p.IdPhieu ? "Xem nháp" : "Hồ sơ KPI"}
                          </button>
                        ) : (
                          <button
                            className={laChoChot ? "btn-submit" : "btn-cancel"}
                            style={{ padding: "8px 14px" }}
                            onClick={() =>
                              navigate(`/quan-ly/duyet-ho-so/${p.IdPhieu}`)
                            }
                          >
                            <i
                              className={`fa-solid ${laChoChot ? "fa-user-check" : "fa-eye"}`}
                            ></i>{" "}
                            {laChoChot ? "Xem & chốt" : "Xem"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rowsDaLoc.length > PAGE_SIZE && (
          <div className="cd-pager">
            <span>
              Trang {page}/{tongTrang} · {rowsDaLoc.length}{" "}
              {laChuaCham ? "người" : "hồ sơ"}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-cancel"
                style={{ padding: "8px 14px" }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="fa-solid fa-chevron-left"></i> Trước
              </button>
              <button
                className="btn-cancel"
                style={{ padding: "8px 14px" }}
                disabled={page >= tongTrang}
                onClick={() => setPage((p) => Math.min(tongTrang, p + 1))}
              >
                Sau <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuyetHoSoKhoa;
