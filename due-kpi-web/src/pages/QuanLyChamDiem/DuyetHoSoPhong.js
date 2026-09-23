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
import { fetchDonViList } from "../../utils/donViApi";
import { phongToiPhuTrach } from "../../utils/phieuChamPermissions";
import { normalizeRole, ROLE } from "../../utils/roles";
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
  XepLoaiBadge,
  XepLoaiKhoaBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";

const PAGE_SIZE = 20;

/**
 * Trần số hồ sơ nạp một lần cho mỗi tab.
 *
 * Nhóm API phiếu KHÔNG trả TotalCount, nên muốn hiện số đếm trên tab thì không có
 * cách nào ngoài nạp thẳng danh sách. Một Phòng vài chục người vẫn gọn trong một
 * request; chạm trần thì số đếm hiện dạng "200+" chứ không bịa con số.
 */
const TRAN_NAP = 200;

const TAB = {
  CHUA_CHAM: "chua-cham",
  THAM_DINH: "tham-dinh",
  CHO_CHOT: "cho-chot",
  DA_CHOT: "da-chot",
};

/**
 * Hàng đợi hồ sơ KPI nhân viên / viên chức của PHÒNG - góc nhìn Trưởng phòng.
 *
 * VÌ SAO LÀ MÀN HÌNH RIÊNG, không mở rộng /quan-ly/duyet-ho-so: màn hình kia phục
 * vụ Trưởng khoa với hồ sơ giảng viên - QĐ 838, định mức giờ NCKH, hạn ngạch xuất
 * sắc 20%, tờ trình Khoa - không thứ nào áp dụng cho phiếu ở Phòng. Server thì
 * dùng CHUNG một endpoint (POST phieu/{id}/khoa/duyet-ho-so mở cho cả TK/TKL/TP),
 * nên đây là tách MÀN HÌNH chứ không phải tách thẩm quyền.
 *
 * MỌI hồ sơ ở đây đều là loai_doi_tuong = 2, và điều đó suy từ ĐƠN VỊ chứ không
 * từ chức danh: phiếu ở Phòng / Trung tâm luôn là viên chức, kể cả phiếu của một
 * PGS kiêm nhiệm làm Trưởng phòng. Vì vậy mọi lời gọi danh sách đều GHIM
 * idDonVi = Phòng đang chọn, và KHÔNG có cột / bộ lọc "Loại đối tượng" - câu trả
 * lời là hằng số, nó thuộc về phụ đề trang.
 *
 * PhieuDanhGiaChiTietDto KHÔNG khai trường LoaiDoiTuong (xem docs/openapi.yaml),
 * nên đừng bao giờ lọc theo nó mà không có đường lùi: `Number(undefined) !== 2`
 * luôn đúng và sẽ lọc sạch bảng. Ở đây nó chỉ dùng để ASSERT - xem locTheoPhong().
 *
 * NGUỒN DỮ LIỆU TỪNG TAB - KHÁC NHAU, đừng gộp:
 *
 *  - "Chưa tự chấm"   ghép ở client (useChuaTuCham). Người chưa bấm lưu lần nào
 *    không có dòng nào trong `phieu_danh_gia` nên mọi endpoint phiếu đều không
 *    thấy họ. PHẢI truyền idDonViLoc (không chỉ idDonViGoc): nó ép cả danh bạ lẫn
 *    danh sách phiếu về ĐÚNG một đơn vị. Bỏ trống thì tinhChuaTuCham ghép theo
 *    IdNhanVien trên tập phiếu rộng hơn và sẽ nhận nhầm phiếu Khoa của người kiêm
 *    nhiệm là phiếu Phòng, khiến họ biến mất khỏi tab này.
 *
 *  - "Đang thẩm định" GET /api/phieu?idDonVi={phong}&trangThai=2.
 *    KHÔNG dùng /api/phieu/khoa/pending làm NGUỒN DÒNG: endpoint đó không có tham
 *    số idDonVi và lọc theo PHÂN QUYỀN TIÊU CHÍ, nên một TP được giao chấm tiêu
 *    chí toàn trường (ví dụ P.QLCL chấm tiêu chí phản hồi sinh viên) sẽ nhận về hồ
 *    sơ GIẢNG VIÊN của mọi Khoa. Nó chỉ được dùng để TRA hai cột tiến độ.
 *
 *  - "Chờ tôi chốt"   GET /api/phieu?idDonVi={phong}&trangThai=3.
 *  - "Đã chốt"        GET /api/phieu?idDonVi={phong}&trangThai=4,5.
 *
 * ADMIN: không giữ chức vụ TP ở đơn vị nào nên phongToiPhuTrach() trả mảng rỗng.
 * Họ được bày bộ chọn đơn vị lấy từ danh mục, nhưng panel chốt ở màn hình chi tiết
 * vẫn ẩn - với Admin trang chạy ở chế độ CHỈ XEM. Có chủ đích, không phải sót.
 */
const DuyetHoSoPhong = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const { nhanVienIndex } = useNhanVienIndex();

  const phongList = useMemo(() => phongToiPhuTrach(user), [user]);
  const laAdmin = normalizeRole(user) === ROLE.ADMIN;

  const [donViAdmin, setDonViAdmin] = useState([]);
  const [idPhong, setIdPhong] = useState(null);

  // Admin không có dòng TP nào trong user.DonVi[] nên phải lấy đơn vị từ danh mục.
  // Lọc bỏ Khoa (ma_don_vi LIKE 'K_%') vì hồ sơ ở Khoa đi đường /quan-ly/duyet-ho-so.
  useEffect(() => {
    if (!laAdmin || phongList.length > 0) return undefined;
    let huy = false;
    fetchDonViList()
      .then((list) => {
        if (huy) return;
        setDonViAdmin(
          (list || []).filter(
            (d) =>
              !String(d.MaDonVi || "")
                .toUpperCase()
                .startsWith("K_"),
          ),
        );
      })
      .catch((error) => console.error("Lỗi tải danh mục đơn vị:", error));
    return () => {
      huy = true;
    };
  }, [laAdmin, phongList.length]);

  const donViChonDuoc = phongList.length > 0 ? phongList : donViAdmin;

  useEffect(() => {
    if (idPhong == null && donViChonDuoc.length > 0) {
      setIdPhong(donViChonDuoc[0].IdDonVi);
    }
  }, [donViChonDuoc, idPhong]);

  const tenPhong = useMemo(
    () =>
      donViChonDuoc.find((d) => Number(d.IdDonVi) === Number(idPhong))
        ?.TenDonVi || "",
    [donViChonDuoc, idPhong],
  );

  const {
    tatCa: chuaTuCham,
    dangTai: dangTaiChuaCham,
    loi: loiChuaCham,
    taiLai: taiLaiChuaCham,
  } = useChuaTuCham({
    idNam: selectedNam,
    idDonViGoc: idPhong,
    idDonViLoc: idPhong,
    bat: !!idPhong,
  });

  const [tab, setTab] = useState(TAB.CHO_CHOT);
  const [duLieu, setDuLieu] = useState({
    [TAB.THAM_DINH]: [],
    [TAB.CHO_CHOT]: [],
    [TAB.DA_CHOT]: [],
  });
  const [tienDoTheoPhieu, setTienDoTheoPhieu] = useState(() => new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [timKiem, setTimKiem] = useState("");

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  /**
   * Ba lớp phòng thủ để chỉ còn lại hồ sơ viên chức của đúng Phòng này.
   *
   * 1. Server đã ghim idDonVi (khớp CHÍNH XÁC một đơn vị) - lớp chính.
   * 2. Lọc lại ở client: một dòng, sống sót nếu sau này server đổi idDonVi thành
   *    lọc cả cây đơn vị.
   * 3. ASSERT chứ không phải filter. Guard `!= null` là BẮT BUỘC vì DTO không khai
   *    LoaiDoiTuong; dính nhánh này nghĩa là giả định "Phòng luôn cho ra loại 2"
   *    đã sai và cần đọc lại schema, chứ không phải im lặng bỏ dòng.
   */
  const locTheoPhong = useCallback(
    (rows, idDonVi) =>
      (rows || []).filter((p) => {
        if (Number(p.IdDonVi) !== Number(idDonVi)) return false;
        if (
          p.LoaiDoiTuong != null &&
          Number(p.LoaiDoiTuong) === LOAI_DOI_TUONG.GIANG_VIEN
        ) {
          console.warn(
            `[DuyetHoSoPhong] Phiếu #${p.IdPhieu} ở đơn vị ${idDonVi} mang LoaiDoiTuong = 1 (giảng viên). Giả định "phiếu ở Phòng luôn là viên chức" không còn đúng.`,
          );
          return false;
        }
        return true;
      }),
    [],
  );

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam || !idPhong) return;
    setIsLoading(true);

    const chung = {
      idNam: selectedNam,
      idDonVi: idPhong,
      page: 1,
      pageSize: TRAN_NAP,
      sortBy: "ngay_gui",
    };
    const ketQua = await Promise.allSettled([
      fetchPhieuList({ ...chung, trangThai: TRANG_THAI.THAM_DINH }),
      fetchPhieuList({ ...chung, trangThai: TRANG_THAI.CHO_TK_DUYET }),
      fetchPhieuList({
        ...chung,
        trangThai: [TRANG_THAI.TK_DA_DUYET, TRANG_THAI.HOAN_TAT],
      }),
      fetchPhieuChoCham({ idNam: selectedNam, page: 1, pageSize: TRAN_NAP }),
    ]);

    const [thamDinh, choChot, daChot, tienDo] = ketQua;
    // Chỉ báo lỗi cho ba danh sách phiếu. Hàng đợi tiến độ hỏng chỉ làm mất hai
    // cột phụ, không đáng bắn toast đỏ che mất việc chính.
    const loi = [thamDinh, choChot, daChot].find((r) => r.status === "rejected");
    if (loi) {
      console.error("Lỗi tải hàng đợi hồ sơ nhân viên:", loi.reason);
      showToast(
        "error",
        "Lỗi",
        loi.reason?.message || "Không tải được danh sách hồ sơ",
      );
    }
    if (tienDo.status === "rejected") {
      console.error("Lỗi tải tiến độ thẩm định:", tienDo.reason);
    }

    setDuLieu({
      [TAB.THAM_DINH]:
        thamDinh.status === "fulfilled"
          ? locTheoPhong(thamDinh.value, idPhong)
          : [],
      [TAB.CHO_CHOT]:
        choChot.status === "fulfilled"
          ? locTheoPhong(choChot.value, idPhong)
          : [],
      [TAB.DA_CHOT]:
        daChot.status === "fulfilled" ? locTheoPhong(daChot.value, idPhong) : [],
    });

    // CHỈ dùng làm bảng tra - xem cảnh báo ở đầu file về phạm vi của endpoint này.
    const map = new Map();
    if (tienDo.status === "fulfilled") {
      (tienDo.value || []).forEach((p) =>
        map.set(Number(p.IdPhieu), {
          daCham: p.SoTieuChiDaCham ?? null,
          duocGiao: p.SoTieuChiDuocGiao ?? null,
        }),
      );
    }
    setTienDoTheoPhieu(map);
    setIsLoading(false);
  }, [selectedNam, idPhong, locTheoPhong]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [tab, timKiem, selectedNam, idPhong]);

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
    if (!q) return withNames;
    return withNames.filter((p) =>
      [p.nv.hoTen, p.nv.maNhanVien].some((f) =>
        String(f || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [nguonTab, tab, nhanVienIndex, timKiem]);

  const tongTrang = Math.max(1, Math.ceil(rowsDaLoc.length / PAGE_SIZE));
  const rowsHienThi = rowsDaLoc.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const laChuaCham = tab === TAB.CHUA_CHAM;
  const laThamDinh = tab === TAB.THAM_DINH;
  const laChoChot = tab === TAB.CHO_CHOT;
  const laDaChot = tab === TAB.DA_CHOT;
  const dangTaiTab = laChuaCham ? dangTaiChuaCham : isLoading;

  const rongTieuDe = laChuaCham
    ? "Cả Phòng đã nộp phiếu"
    : laThamDinh
      ? "Không có hồ sơ nào đang thẩm định"
      : laChoChot
        ? "Không có hồ sơ nào chờ chốt"
        : "Chưa chốt hồ sơ nào";
  const rongMoTa = laChuaCham
    ? "Mọi nhân viên của Phòng đều đã nộp phiếu tự đánh giá."
    : laThamDinh
      ? 'Hồ sơ ở đây còn ít nhất một tiêu chí chưa được thẩm định xong. Chúng tự chuyển sang tab "Chờ tôi chốt" khi đủ 100%.'
      : laChoChot
        ? "Hồ sơ chỉ xuất hiện ở đây khi 100% tiêu chí đã được thẩm định xong."
        : "Hồ sơ bạn đã chốt sẽ hiện ở đây.";

  if (donViChonDuoc.length === 0 && !laAdmin) {
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
            Chốt hồ sơ KPI nhân viên
          </h2>
        </div>
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-user-slash"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Chưa gán chức vụ Trưởng phòng
            </h3>
            <p style={{ margin: 0 }}>
              Tài khoản của bạn chưa được gán chức vụ Trưởng phòng tại đơn vị
              nào, nên không có hàng đợi hồ sơ nào để hiển thị. Vui lòng liên hệ
              quản trị viên.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
          Chốt hồ sơ KPI nhân viên
        </h2>
        <span className="breadcrumb">
          Trưởng phòng rà lại hồ sơ viên chức / người lao động của Phòng mình,
          chọn xếp loại và chốt
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

        {/* Một người có thể là TP ở nhiều đơn vị (kiêm nhiệm), mỗi đơn vị là một
            hàng đợi riêng. Chỉ bày bộ chọn khi thật sự có gì để chọn - một
            dropdown một mục là nhiễu. */}
        <div className="cd-field">
          <label className="cd-label">Phòng phụ trách</label>
          {donViChonDuoc.length > 1 ? (
            <SearchSelect
              value={idPhong}
              onChange={(v) => setIdPhong(v)}
              options={donViChonDuoc.map((d) => ({
                value: d.IdDonVi,
                label: d.TenDonVi,
              }))}
            />
          ) : (
            <div
              style={{
                padding: "9px 0",
                fontWeight: 600,
                color: "#0f172a",
                fontSize: "14px",
              }}
            >
              {tenPhong || "—"}
            </div>
          )}
        </div>

        <div className="cd-field" style={{ flex: "2 1 240px" }}>
          <label className="cd-label">Tìm nhân viên</label>
          <input
            type="text"
            className="form-input"
            placeholder="Họ tên, mã cán bộ..."
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
      </div>

      {loiChuaCham && (
        <div className="cd-canh-bao">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            {loiChuaCham}. Tab "Chưa tự chấm" đang trống vì chưa đối chiếu được
            danh bạ - con số ở đó không phản ánh thực tế.
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
          className={`cd-tab${laThamDinh ? " cd-tab-active" : ""}`}
          onClick={() => setTab(TAB.THAM_DINH)}
        >
          <i className="fa-solid fa-clipboard-check"></i> Đang thẩm định (
          {demTab(TAB.THAM_DINH)})
        </button>
        <button
          className={`cd-tab${laChoChot ? " cd-tab-active" : ""}`}
          onClick={() => setTab(TAB.CHO_CHOT)}
        >
          <i className="fa-solid fa-user-check"></i> Chờ tôi chốt (
          {demTab(TAB.CHO_CHOT)})
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
            <table className="custom-table" style={{ minWidth: "900px" }}>
              <thead>
                <tr>
                  {/* Ba cột điểm CỐ Ý vắng mặt ở tab "Chờ tôi chốt": tong_diem_*
                      chỉ được server ghi TRONG giao dịch chốt nên trước đó luôn
                      null. Một cột toàn dấu gạch tệ hơn là không có cột - số liệu
                      thật nằm ở màn hình chốt, lấy từ GET phieu/{id}/xem-truoc-chot. */}
                  <th style={{ width: laDaChot ? "30%" : "44%" }}>Nhân viên</th>
                  {laThamDinh ? (
                    <th style={{ width: "26%" }}>Tiến độ thẩm định</th>
                  ) : laChuaCham ? (
                    <th style={{ width: "26%" }}>Đơn vị</th>
                  ) : laDaChot ? (
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
                  ) : null}
                  <th style={{ width: "16%" }}>
                    {laDaChot ? "Kết quả" : "Trạng thái"}
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
                  const tienDo = tienDoTheoPhieu.get(Number(p.IdPhieu));
                  const duocGiao = tienDo?.duocGiao ?? null;
                  const daCham = tienDo?.daCham ?? 0;
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

                      {laThamDinh ? (
                        <td>
                          {duocGiao == null ? (
                            <span
                              style={{ color: "#94a3b8", fontSize: "13px" }}
                              title="Đơn vị bạn không được giao tiêu chí nào trên hồ sơ này."
                            >
                              —
                            </span>
                          ) : (
                            <span
                              className={`cd-tien-do${xong ? " cd-tien-do-xong" : ""}`}
                            >
                              <i
                                className={`fa-solid ${xong ? "fa-circle-check" : "fa-hourglass-half"}`}
                              ></i>
                              {daCham}/{duocGiao} tiêu chí đơn vị bạn được giao
                              thẩm định
                            </span>
                          )}
                        </td>
                      ) : laChuaCham ? (
                        <td style={{ fontSize: "13px", color: "#475569" }}>
                          {p.nv.tenDonVi || p.TenDonVi || "-"}
                        </td>
                      ) : laDaChot ? (
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
                      ) : null}

                      <td>
                        {laDaChot ? (
                          p.XepLoai != null ? (
                            <XepLoaiBadge xepLoai={p.XepLoai} />
                          ) : (
                            <XepLoaiKhoaBadge xepLoaiKhoa={p.XepLoaiKhoa} />
                          )
                        ) : (
                          <TrangThaiBadge
                            trangThai={p.TrangThai}
                            canHtDuyet={p.CanHtDuyet}
                          />
                        )}
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {formatNgay(laChuaCham ? p.NgayTao : p.NgayGui)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {/* Người chưa lập phiếu không có gì để mở ở màn hình phiếu;
                            lối đi hợp lý duy nhất là hồ sơ KPI của họ. */}
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
                        ) : laThamDinh ? (
                          /* Bàn giao sang GIAI ĐOẠN 2. Màn hình chấm từng tiêu chí
                             dùng chung với mọi trưởng đơn vị khác - Trưởng phòng đã
                             vào được qua ROLE_SETS.TRUONG_DON_VI, không dựng lại. */
                          <button
                            className="btn-cancel"
                            style={{ padding: "8px 14px" }}
                            onClick={() =>
                              navigate(`/quan-ly/phieu/${p.IdPhieu}`)
                            }
                          >
                            <i className="fa-solid fa-pen-to-square"></i> Chấm
                            điểm
                          </button>
                        ) : (
                          <button
                            className={laChoChot ? "btn-submit" : "btn-cancel"}
                            style={{ padding: "8px 14px" }}
                            onClick={() =>
                              navigate(`/quan-ly/ho-so-nhan-vien/${p.IdPhieu}`)
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

export default DuyetHoSoPhong;
