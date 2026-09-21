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
import "../../css/KeKhaiThanhTich.css";
import SearchSelect from "../../components/Common/SearchSelect";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { fetchDonViList } from "../../utils/donViApi";
import { CAP_KHOA_PHONG } from "../../utils/viPhamPermissions";
import {
  formatDiem,
  layDanhSachChoDuyet,
  LOAI_THANH_TICH_META,
  TRANG_THAI_KE_KHAI,
  TRANG_THAI_KE_KHAI_META,
} from "../../utils/keKhaiThanhTichApi";

const PAGE_SIZE = 20;

/**
 * Chế độ xem của hàng đợi.
 *
 * "pending" KHÔNG phải một trạng thái bản kê mà là bộ lọc `chiConChoDuyet=1`:
 * chỉ bản kê còn dòng CHÍNH BẠN phải xét. Đó mới là phần việc; các lựa chọn còn
 * lại lọc theo NHÃN dẫn xuất của bản kê và gửi `chiConChoDuyet=0` để lấy hết.
 */
const CHE_DO_CHO_XET = "pending";

const LOC_TRANG_THAI = [
  { value: CHE_DO_CHO_XET, label: "Còn dòng chờ bạn xét" },
  { value: "all", label: "Tất cả bản kê" },
  { value: String(TRANG_THAI_KE_KHAI.CON_TRA_VE), label: "Có dòng trả về" },
  {
    value: String(TRANG_THAI_KE_KHAI.TAT_CA_DA_CHOT),
    label: "Tất cả dòng đã chốt",
  },
  {
    value: String(TRANG_THAI_KE_KHAI.CON_CHO_DUYET),
    label: "Còn dòng chờ duyệt",
  },
];

const LOC_LOAI = [
  { value: "", label: "-- Mọi tiêu chí --" },
  ...Object.entries(LOAI_THANH_TICH_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const BadgeTrangThai = ({ trangThai }) => {
  const meta = TRANG_THAI_KE_KHAI_META[trangThai];
  if (!meta) return <span className="kkt-trong">-</span>;
  return (
    <span
      className="cd-status-badge"
      style={{
        background: meta.bg,
        color: meta.color,
        borderColor: meta.border,
      }}
    >
      <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
    </span>
  );
};

/**
 * Hàng đợi duyệt bản kê THÀNH TÍCH VƯỢT TRỘI.
 *
 * Trang này chỉ là LỐI VÀO: mọi thao tác chốt / trả về / mở lại nằm ở màn hình
 * chi tiết, vì đơn vị nghiệp vụ là TỪNG DÒNG kê khai - không còn chốt cả bản kê.
 *
 * Khác hẳn hàng đợi giờ quy đổi ở phạm vi: ở đó phạm vi là "đơn vị mình + đơn vị
 * con", còn ở đây một bản kê lọt vào danh sách khi người gọi duyệt được ÍT NHẤT
 * MỘT dòng của nó. Hai đường vào:
 *   (a) dòng trỏ tới mức có `IdDonViDuyet` = đơn vị người gọi giữ chức vụ duyệt
 *       → Trưởng Phòng P.TCHC thấy dòng khen thưởng của nhân viên TOÀN TRƯỜNG;
 *   (b) dòng không chỉ định đơn vị phụ trách → rơi về trưởng đơn vị quản lý
 *       trực tiếp của nhân viên.
 *
 * Hệ quả cho giao diện: con số cần nhìn trước tiên là **`SoDongChoDuyetCuaToi`**
 * (phần việc của riêng người đang đăng nhập), KHÔNG phải `SoDongChoDuyet` (tổng
 * dòng chưa xét của cả bản kê, gồm cả phần của đơn vị khác). Nhầm hai con số này
 * là hứa với người dùng một khối lượng việc không phải của họ.
 *
 * KHÔNG còn bước "nộp" nên cũng không còn cột "Ngày nộp": nhân viên kê tới đâu
 * người duyệt thấy tới đó, và `NgayNop` chỉ còn là dấu vết của dữ liệu cũ.
 * Mặc định màn hình mở ở chế độ "còn dòng chờ bạn xét" (`chiConChoDuyet=1`).
 *
 * Bộ lọc đơn vị ở đây CHỈ để thu hẹp hiển thị, không phải phân quyền - server đã
 * quyết phạm vi. Cố ý dựng nó (khác màn hình giờ quy đổi) vì người của phòng
 * chuyên trách có thể phải lọc giữa hàng trăm nhân viên toàn trường.
 */
const DuyetKeKhaiThanhTich = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [rows, setRows] = useState([]);
  const [phanTrang, setPhanTrang] = useState(null);
  const [donViList, setDonViList] = useState([]);
  const [trangThai, setTrangThai] = useState(CHE_DO_CHO_XET);
  const [loai, setLoai] = useState("");
  const [idDonVi, setIdDonVi] = useState("");
  const [oTuKhoa, setOTuKhoa] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loi, setLoi] = useState("");

  const showToast = (severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  };

  useEffect(() => {
    fetchDonViList()
      .then((list) =>
        setDonViList(
          list
            .filter((dv) => dv.CapDonVi === CAP_KHOA_PHONG)
            .sort((a, b) =>
              String(a.MaDonVi || "").localeCompare(String(b.MaDonVi || "")),
            ),
        ),
      )
      .catch((error) => console.error("Lỗi tải danh mục đơn vị:", error));
  }, []);

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;

    setIsLoading(true);
    setLoi("");
    try {
      const chiConChoXet = trangThai === CHE_DO_CHO_XET;
      const { items, phanTrang: pt } = await layDanhSachChoDuyet({
        idNam: selectedNam,
        loai: loai || undefined,
        idDonVi: idDonVi || undefined,
        // Hai lựa chọn đầu không phải nhãn trạng thái nên không gửi trangThai.
        trangThai: chiConChoXet || trangThai === "all" ? undefined : trangThai,
        chiConChoDuyet: chiConChoXet ? 1 : 0,
        tuKhoa,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(items);
      setPhanTrang(pt);
    } catch (error) {
      console.error("Lỗi tải danh sách bản kê thành tích chờ duyệt:", error);
      setRows([]);
      setPhanTrang(null);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [selectedNam, loai, idDonVi, trangThai, tuKhoa, page]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  // Đổi bộ lọc thì phải về trang 1, nếu không sẽ hiện trang trống của tập kết quả mới.
  useEffect(() => {
    setPage(1);
  }, [selectedNam, loai, idDonVi, trangThai, tuKhoa]);

  const tong = useMemo(
    () => ({
      soBanKe: phanTrang?.TongSo ?? rows.length,
      dongCuaToi: rows.reduce((s, r) => s + (r.SoDongChoDuyetCuaToi || 0), 0),
      dongChoDuyet: rows.reduce((s, r) => s + (r.SoDongChoDuyet || 0), 0),
      diemKeKhai: rows.reduce((s, r) => s + (Number(r.TongDiemKeKhai) || 0), 0),
      diemDuyet: rows.reduce((s, r) => s + (Number(r.TongDiemDuyet) || 0), 0),
    }),
    [rows, phanTrang],
  );

  const tongSoTrang = phanTrang?.TongSoTrang || 1;

  const timKiem = () => {
    setTuKhoa(oTuKhoa.trim());
    if (!oTuKhoa.trim() && tuKhoa)
      showToast("info", "Đã bỏ lọc", "Hiện tất cả");
  };

  return (
    <div className="page-container kkt-page">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 className="kkt-title">Duyệt kê khai thành tích</h2>
        <span className="breadcrumb">
          Bản kê thành tích vượt trội (Nhóm II) của viên chức / người lao động
          mà bạn có quyền thẩm định - chốt hoặc trả về từng dòng, không có bước
          chốt cả bản kê
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
          <label className="cd-label">Tiêu chí</label>
          <SearchSelect
            value={loai}
            onChange={(v) => setLoai(v)}
            options={LOC_LOAI}
            placeholder="-- Mọi tiêu chí --"
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Đơn vị</label>
          <SearchSelect
            value={idDonVi}
            onChange={(v) => setIdDonVi(v)}
            options={[
              { value: "", label: "-- Mọi đơn vị --" },
              ...donViList.map((dv) => ({
                value: dv.IdDonVi,
                label: `${dv.MaDonVi} — ${dv.TenDonVi}`,
              })),
            ]}
            placeholder="-- Mọi đơn vị --"
            searchable
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
          <label className="cd-label">Tìm nhân viên</label>
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
        {/* Phần việc của RIÊNG người đang đăng nhập - con số quan trọng nhất
            của màn hình, nên đặt đầu tiên và tô đậm. */}
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-purple">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div>
            <div className="stat-label">Dòng chờ BẠN xét</div>
            <div className="stat-value" style={{ color: "#7e22ce" }}>
              {tong.dongCuaToi}
            </div>
            {/* Dòng chú thích dưới số dùng .cd-hint chứ không phải .stat-label:
                .stat-label là nhãn tiêu đề (đậm), dùng lại ở đây sẽ thành chữ
                đậm ngang hàng với tiêu đề thẻ. */}
            <div className="cd-hint" style={{ marginTop: 0 }}>
              trên trang hiện tại
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-amber">
            <i className="fa-solid fa-inbox"></i>
          </div>
          <div>
            <div className="stat-label">Bản kê khớp bộ lọc</div>
            <div className="stat-value">{tong.soBanKe}</div>
            <div className="cd-hint" style={{ marginTop: 0 }}>
              {tong.dongChoDuyet} dòng chưa xét (mọi đơn vị)
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-blue">
            <i className="fa-solid fa-pen-to-square"></i>
          </div>
          <div>
            <div className="stat-label">Điểm nhân viên kê</div>
            <div className="stat-value">{formatDiem(tong.diemKeKhai)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-green">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="stat-label">Điểm đã chốt</div>
            <div className="stat-value" style={{ color: "#047857" }}>
              {formatDiem(tong.diemDuyet)}
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
              Không có bản kê nào khớp bộ lọc này, hoặc bạn đã xử lý hết phần
              việc của mình.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="custom-table" style={{ minWidth: "1080px" }}>
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Nhân viên</th>
                  <th style={{ width: "18%" }}>Đơn vị</th>
                  <th style={{ width: "16%", textAlign: "center" }}>Số dòng</th>
                  <th style={{ width: "10%", textAlign: "right" }}>Điểm kê</th>
                  <th style={{ width: "10%", textAlign: "right" }}>
                    Điểm chốt
                  </th>
                  <th style={{ width: "12%" }}>Trạng thái</th>
                  <th style={{ width: "8%", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const cuaToi = r.SoDongChoDuyetCuaToi || 0;
                  const choDuyet = r.SoDongChoDuyet || 0;
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
                          <span className="table-empty-mark">-</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="tag-badge">{r.SoDong ?? 0}</span>
                        {cuaToi > 0 && (
                          <span
                            className="tag-badge kkt-tag-cho"
                            title="Số dòng CHÍNH BẠN duyệt được mà chưa xét"
                          >
                            {cuaToi} chờ bạn
                          </span>
                        )}
                        {/* Chỉ nhắc phần của đơn vị khác khi nó thực sự tồn tại -
                            đó là lý do nút Chốt có thể vẫn tắt dù bạn đã xong. */}
                        {choDuyet > cuaToi && (
                          <div
                            style={{
                              fontSize: "11.5px",
                              color: "#94a3b8",
                              marginTop: "4px",
                            }}
                            title="Những dòng này thuộc quyền duyệt của đơn vị khác - bạn không xét thay được"
                          >
                            +{choDuyet - cuaToi} dòng của đơn vị khác
                          </div>
                        )}
                      </td>
                      <td className="table-num">
                        {formatDiem(r.TongDiemKeKhai)}
                      </td>
                      <td className="table-num kkt-diem">
                        <b>{formatDiem(r.TongDiemDuyet)}</b>
                      </td>
                      <td>
                        <BadgeTrangThai trangThai={r.TrangThai} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="table-btn-primary"
                          title="Mở bản kê để xét từng dòng"
                          onClick={() =>
                            navigate(
                              `/quan-ly/ke-khai-thanh-tich/${r.IdKeKhai}`,
                            )
                          }
                        >
                          <i className="fa-solid fa-pen-to-square"></i>{" "}
                          {cuaToi > 0 ? "Xét" : "Xem"}
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
            {phanTrang?.TongSo != null ? ` - ${phanTrang.TongSo} bản kê` : ""}
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

export default DuyetKeKhaiThanhTich;
