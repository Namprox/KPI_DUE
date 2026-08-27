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
import "../../css/DanhGia/DanhGiaKpiPhong.css";
import { useAuth } from "../../context/AuthContext";
import { formatDiem, formatNgayGio } from "../../utils/phieuApi";
import { fetchDonViList } from "../../utils/donViApi";
import {
  fetchPhieuDonViList,
  taoPhieuDonVi,
  TRANG_THAI_DV_META,
} from "../../utils/phieuDonViApi";
import { coViecCanLam, laDonViPhongTrungTam } from "../../utils/phieuPhongApi";
import { ROLE, coQuyenTaiDonVi } from "../../utils/roles";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import {
  TrangThaiDonViBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";
import SearchSelect from "../../components/Common/SearchSelect";

const PAGE_SIZE = 20;

/**
 * Danh sách phiếu ĐÁNH GIÁ KPI PHÒNG / TRUNG TÂM của một năm.
 *
 * Song song với "Đánh giá KPI Đơn vị" (/danh-gia-kpi-don-vi): cùng bộ endpoint
 * /api/phieu-don-vi, nhưng màn hình này dành cho đơn vị dùng mẫu loại 4 và phủ
 * trọn vòng đời phiếu, nên phục vụ cả bốn vai trò trong quy trình chứ không chỉ
 * thư ký. Mỗi dòng là một ĐƠN VỊ, không phải một người.
 *
 * Phạm vi dữ liệu do server quyết theo chức vụ trong JWT; các bộ lọc ở đây chỉ
 * thu hẹp trong phạm vi đó chứ không mở thêm dữ liệu.
 */
const DanhGiaKpiPhong = () => {
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [donViList, setDonViList] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [locTrangThai, setLocTrangThai] = useState("");
  const [dangLap, setDangLap] = useState(false);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  useEffect(() => {
    let huy = false;
    fetchDonViList().then((list) => {
      if (!huy) setDonViList(list || []);
    });
    return () => {
      huy = true;
    };
  }, []);

  /** IdDonVi -> {MaDonVi, TenDonVi}. DTO phiếu không trả MaDonVi nên phải tra bảng. */
  const donViTheoId = useMemo(() => {
    const map = new Map();
    donViList.forEach((dv) => {
      map.set(Number(dv.IdDonVi), {
        maDonVi: dv.MaDonVi || "",
        tenDonVi: dv.TenDonVi || "",
      });
    });
    return map;
  }, [donViList]);

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    setIsLoading(true);
    try {
      const items = await fetchPhieuDonViList({
        idNam: selectedNam,
        trangThai: locTrangThai || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(items);
    } catch (error) {
      console.error("Lỗi tải danh sách phiếu KPI Phòng:", error);
      showToast("error", "Lỗi", error.message);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedNam, locTrangThai, page]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  useEffect(() => {
    setPage(1);
  }, [selectedNam, locTrangThai]);

  /**
   * Lọc phiếu Phòng/TT ở CLIENT.
   *
   * Endpoint list không nhận `loaiDoiTuong` và DTO phiếu không trả `MaDonVi`, nên
   * không có cách nào lọc ở server. Hệ quả: phân trang là của server (gồm cả phiếu
   * Khoa) còn con số hiển thị là sau khi lọc - pager vì thế ghi rõ "trong trang"
   * thay vì tổng số phiếu.
   *
   * Danh mục đơn vị chưa tải xong thì để trống thay vì hiện nhầm phiếu Khoa.
   */
  const rowsPhong = useMemo(() => {
    if (donViTheoId.size === 0) return [];
    return rows.filter((p) =>
      laDonViPhongTrungTam(donViTheoId.get(Number(p.IdDonVi))?.maDonVi),
    );
  }, [rows, donViTheoId]);

  /** Đơn vị mà người dùng đang giữ vai trò thư ký - nơi họ được lập phiếu. */
  const donViLapPhieu = useMemo(() => {
    const ungVien =
      Array.isArray(user?.DonVi) && user.DonVi.length > 0
        ? user.DonVi
        : user?.IdDonVi
          ? [{ IdDonVi: user.IdDonVi, MaChucVu: user.MaChucVu }]
          : [];
    return ungVien.filter(
      (dv) =>
        coQuyenTaiDonVi([ROLE.THU_KY_PHONG], dv.IdDonVi, user) &&
        laDonViPhongTrungTam(donViTheoId.get(Number(dv.IdDonVi))?.maDonVi),
    );
  }, [user, donViTheoId]);

  const handleLapPhieu = async () => {
    if (!selectedNam) {
      showToast(
        "warn",
        "Thiếu thông tin",
        "Vui lòng chọn năm đánh giá trước khi lập phiếu.",
      );
      return;
    }
    const idDonVi = donViLapPhieu[0]?.IdDonVi;
    if (!idDonVi) {
      showToast(
        "warn",
        "Thiếu thông tin",
        "Tài khoản chưa được gán vai trò thư ký ở một Phòng/Trung tâm nào.",
      );
      return;
    }

    // Mỗi đơn vị chỉ MỘT phiếu mỗi năm - có sẵn thì đi thẳng vào chứ đừng gọi
    // POST để ăn 400.
    const daCo = rowsPhong.find((r) => Number(r.IdDonVi) === Number(idDonVi));
    if (daCo?.IdPhieuDv) {
      navigate(`/danh-gia-kpi-phong/${daCo.IdPhieuDv}`);
      return;
    }

    setDangLap(true);
    try {
      const item = await taoPhieuDonVi({ idNam: selectedNam, idDonVi });
      if (item?.IdPhieuDv) {
        navigate(`/danh-gia-kpi-phong/${item.IdPhieuDv}`);
        return;
      }
      showToast(
        "success",
        "Đã lập phiếu",
        "Phiếu KPI Phòng/Trung tâm đã được tạo.",
      );
      taiDanhSach();
    } catch (error) {
      console.error("Lỗi lập phiếu KPI Phòng:", error);
      // Chưa dựng mẫu loại 4 cho năm đánh giá là lỗi hay gặp nhất khi mở màn hình
      // này lần đầu; thông điệp thô của server không nói phải làm gì tiếp.
      const thieuMau = /mau danh gia|mẫu đánh giá/i.test(error.message || "");
      showToast(
        "error",
        "Không lập được phiếu",
        thieuMau
          ? `${error.message} Hãy tạo mẫu đánh giá có Loại đối tượng = "Phòng / Trung tâm" cho năm học này ở màn hình Mẫu đánh giá, rồi gắn đủ tiêu chí vào mẫu.`
          : error.message,
        thieuMau ? 8000 : 4000,
      );
    } finally {
      setDangLap(false);
    }
  };

  const trangThaiOptions = useMemo(
    () => [
      { value: "", label: "Tất cả trạng thái" },
      ...Object.entries(TRANG_THAI_DV_META).map(([ma, meta]) => ({
        value: ma,
        label: `${ma}. ${meta.label}`,
      })),
    ],
    [],
  );

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
          Đánh giá KPI Phòng / Trung tâm
        </h2>
        <span className="breadcrumb">
          Thư ký nhập điểm → Trưởng phòng duyệt → cấp Trường duyệt → chốt xếp
          loại
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
            value={locTrangThai}
            onChange={(v) => setLocTrangThai(v)}
            options={trangThaiOptions}
          />
        </div>

        {donViLapPhieu.length > 0 && (
          <div
            className="cd-field"
            style={{ display: "flex", alignItems: "flex-end" }}
          >
            <button
              className="btn-add-new"
              onClick={handleLapPhieu}
              disabled={!selectedNam || dangLap}
            >
              {dangLap ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus"></i> Lập phiếu Phòng/TT
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="modern-table-card">
        {isLoading ? (
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải danh sách phiếu KPI Phòng/Trung tâm...
          </div>
        ) : rowsPhong.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-folder-open"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Chưa có phiếu Phòng/Trung tâm nào cho năm học {selectedNam || "-"}
            </h3>
            <p style={{ margin: 0 }}>
              {donViLapPhieu.length > 0 ? (
                <>
                  Bấm <b>Lập phiếu Phòng/TT</b> để tạo phiếu KPI cho đơn vị bạn.
                  Mỗi đơn vị chỉ có một phiếu mỗi năm.
                </>
              ) : (
                "Phiếu sẽ xuất hiện ở đây sau khi thư ký của đơn vị lập."
              )}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table" style={{ minWidth: "960px" }}>
              <thead>
                <tr>
                  <th style={{ width: "32%" }}>Đơn vị</th>
                  <th style={{ width: "20%", textAlign: "center" }}>
                    Trạng thái
                  </th>
                  <th style={{ width: "12%", textAlign: "right" }}>
                    Tổng điểm
                  </th>
                  <th style={{ width: "14%", textAlign: "center" }}>
                    Xếp loại
                  </th>
                  <th style={{ width: "13%" }}>Cập nhật</th>
                  <th style={{ width: "9%", textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rowsPhong.map((p) => {
                  const thongTin = donViTheoId.get(Number(p.IdDonVi));
                  // Icon đổi theo việc của chính người đang đăng nhập: bút khi họ
                  // còn phần việc trên phiếu này, mắt khi chỉ xem được.
                  const canLam = coViecCanLam(p, user);
                  return (
                    <tr key={p.IdPhieuDv}>
                      <td>
                        <b style={{ color: "#0f172a" }}>
                          {p.TenDonVi ||
                            thongTin?.tenDonVi ||
                            `Đơn vị #${p.IdDonVi}`}
                        </b>
                        <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                          Năm học {p.IdNam} · Lần đánh giá {p.LanDanhGia}
                          {p.LanMoLai > 0
                            ? ` · Đã mở lại ${p.LanMoLai} lần`
                            : ""}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <TrangThaiDonViBadge trangThai={p.TrangThai} />
                      </td>
                      <td className="table-num-strong">
                        {formatDiem(p.TongDiemTichLuy)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <XepLoaiBadge xepLoai={p.XepLoai} />
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {formatNgayGio(p.NgayCapNhat)}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className={
                              canLam
                                ? "action-btn edit-btn"
                                : "action-btn view-btn"
                            }
                            title={
                              canLam ? "Xử lý phiếu này" : "Xem chi tiết phiếu"
                            }
                            onClick={() =>
                              navigate(`/danh-gia-kpi-phong/${p.IdPhieuDv}`)
                            }
                          >
                            <i
                              className={`fa-solid ${canLam ? "fa-pen" : "fa-eye"}`}
                            ></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="cd-pager">
          <span>
            Trang {page} · {rowsPhong.length} phiếu Phòng/TT trong trang
          </span>
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

export default DanhGiaKpiPhong;
