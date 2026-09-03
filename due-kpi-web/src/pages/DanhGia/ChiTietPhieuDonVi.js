import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/DanhGia/DanhGiaPhuLuc2.css";
import {
  fetchTieuChiTheoMau,
  formatDiem,
  formatNgayGio,
} from "../../utils/phieuApi";
import {
  diemHieuLucCuaDong,
  fetchPhieuDonViDetail,
  laDongChamTay,
  nhapDiemChiTietDonVi,
  suaDuocPhieu,
  tongHopKpiDonVi,
  trinhPhieuDonVi,
  TRANG_THAI_DV,
} from "../../utils/phieuDonViApi";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import {
  TrangThaiDonViBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";
import DanhGiaDonViForm from "../../components/DanhGia/DanhGiaKpiDonVi/DanhGiaDonViForm";

/** Giá trị ô nhập: bản nháp người dùng đang gõ, chưa có thì lấy số của server. */
const giaTriO = (nhap, goc) =>
  nhap !== undefined
    ? nhap
    : goc === null || goc === undefined
      ? ""
      : String(goc);

/**
 * Màn hình nhập liệu Đánh giá KPI Đơn vị - dạng thẻ đồng bộ với KPI Giảng viên.
 */
const ChiTietPhieuDonVi = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);

  const [phieu, setPhieu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState("");
  const [tieuChiMap, setTieuChiMap] = useState(new Map());

  // Bản nháp cục bộ
  const [nhapDiem, setNhapDiem] = useState({});
  const [nhapNhanXet, setNhapNhanXet] = useState({});
  const [idDangLuu, setIdDangLuu] = useState(null);
  const [dangLuuTatCa, setDangLuuTatCa] = useState(false);

  const [gomDonViCon, setGomDonViCon] = useState(true);
  const [dangTongHop, setDangTongHop] = useState(false);
  const [tongHop, setTongHop] = useState(null);

  const [moTrinh, setMoTrinh] = useState(false);
  const [dangTrinh, setDangTrinh] = useState(false);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const taiPhieu = useCallback(
    async ({ imLang = false } = {}) => {
      if (!imLang) setIsLoading(true);
      try {
        const item = await fetchPhieuDonViDetail(id);
        if (!item) {
          setLoiTai(
            "Không tìm thấy phiếu này, hoặc phiếu nằm ngoài phạm vi bạn được xem.",
          );
          setPhieu(null);
          return null;
        }
        setPhieu(item);
        setLoiTai("");

        // Tải cấu hình thang điểm mẫu nếu có
        if (item.IdMau) {
          try {
            const tcMap = await fetchTieuChiTheoMau(item.IdMau);
            setTieuChiMap(tcMap);
          } catch (err) {
            console.error("Lỗi tải thông tin thang điểm mẫu:", err);
          }
        }
        return item;
      } catch (error) {
        console.error("Lỗi tải phiếu KPI đơn vị:", error);
        setLoiTai(error.message);
        setPhieu(null);
        return null;
      } finally {
        if (!imLang) setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    taiPhieu();
  }, [taiPhieu]);

  const chiTietList = useMemo(() => phieu?.ChiTiet || [], [phieu]);
  const choPhepNhap = suaDuocPhieu(phieu);

  // Tính toán tổng điểm tạm tính thời gian thực (bao gồm cả dữ liệu đang gõ nháp)
  const tamTinh = useMemo(() => {
    if (!Array.isArray(chiTietList) || chiTietList.length === 0) return null;
    let coBan = 0;
    let vuotTroi = 0;
    let tichLuy = 0;
    let soDongChuaCoDiem = 0;

    chiTietList.forEach((ct) => {
      const idCt = ct.IdChiTietDv;
      let diem = null;
      if (laDongChamTay(ct)) {
        const draft = nhapDiem[idCt];
        if (draft !== undefined) {
          diem = draft === "" ? null : Number(draft);
        } else {
          diem =
            ct.DiemNhap === null || ct.DiemNhap === undefined
              ? null
              : Number(ct.DiemNhap);
        }
      } else {
        diem =
          ct.DiemTongHop === null || ct.DiemTongHop === undefined
            ? null
            : Number(ct.DiemTongHop);
      }

      if (diem === null || isNaN(diem)) {
        soDongChuaCoDiem += 1;
        return;
      }
      tichLuy += diem;
      if (Number(ct.LoaiNhom) === 2) vuotTroi += diem;
      else coBan += diem;
    });

    return { coBan, vuotTroi, tichLuy, soDongChuaCoDiem };
  }, [chiTietList, nhapDiem]);

  /** Gom theo phân cấp nhóm: Nhóm Cha (Cấp 1 theo LoaiNhom) -> Nhóm Con (Cấp 2 theo TenNhom) */
  const sections = useMemo(() => {
    if (!Array.isArray(chiTietList) || chiTietList.length === 0) return [];

    const nhomTree = tieuChiMap?.nhomTree || [];
    const nhomTreeByLoai = new Map();
    nhomTree.forEach((n) => {
      if (n.LoaiNhom != null) {
        nhomTreeByLoai.set(Number(n.LoaiNhom), n);
      }
    });

    // Gom các dòng theo LoaiNhom (1: Cơ bản, 2: Vượt trội, khác: Khác)
    const loaiNhomMap = new Map();
    chiTietList.forEach((ct) => {
      const loai = Number(ct.LoaiNhom) || 1;
      if (!loaiNhomMap.has(loai)) {
        loaiNhomMap.set(loai, []);
      }
      loaiNhomMap.get(loai).push(ct);
    });

    const sortedLoaiList = [...loaiNhomMap.keys()].sort((a, b) => a - b);

    return sortedLoaiList.map((loai) => {
      const rowsOfLoai = loaiNhomMap.get(loai) || [];
      const nhomChaFromTree = nhomTreeByLoai.get(loai);

      const tenCha =
        nhomChaFromTree?.TenNhom ||
        (loai === 2
          ? "B - Nhóm các tiêu chí liên quan đến thành tích vượt trội"
          : "A - Nhóm các tiêu chí liên quan đến nhiệm vụ cơ bản");

      const diemToiDaCha =
        nhomChaFromTree?.DiemToiDa != null
          ? Number(nhomChaFromTree.DiemToiDa)
          : null;

      // Gom theo nhóm con (TenNhom)
      const nhomConMap = new Map();
      rowsOfLoai.forEach((ct) => {
        const tenCon = ct.TenNhom || "Tiêu chí";
        if (!nhomConMap.has(tenCon)) {
          nhomConMap.set(tenCon, []);
        }
        nhomConMap.get(tenCon).push(ct);
      });

      const nhomConList = [...nhomConMap.entries()].map(([tenCon, dong]) => {
        const nhomConFromTree = nhomChaFromTree?.NhomCon?.find(
          (nc) =>
            nc.TenNhom === tenCon ||
            (nc.IdNhom && nc.IdNhom === dong[0]?.IdNhomCha),
        );
        const diemToiDaCon =
          nhomConFromTree?.DiemToiDa != null
            ? Number(nhomConFromTree.DiemToiDa)
            : null;

        const isDirect =
          tenCon.trim().toLowerCase() === tenCha.trim().toLowerCase() ||
          (nhomChaFromTree &&
            (!nhomChaFromTree.NhomCon || nhomChaFromTree.NhomCon.length === 0));

        return {
          ten: tenCon,
          isDirect,
          diemToiDa: diemToiDaCon,
          dong,
        };
      });

      return {
        loaiNhom: loai,
        tenNhom: tenCha,
        diemToiDa: diemToiDaCha,
        nhomConList,
      };
    });
  }, [chiTietList, tieuChiMap]);

  const dongChamTayThieuDiem = useMemo(
    () =>
      chiTietList.filter(
        (ct) => laDongChamTay(ct) && diemHieuLucCuaDong(ct) === null,
      ),
    [chiTietList],
  );

  const oDaSua = useCallback(
    (ct) => {
      const idCt = ct.IdChiTietDv;
      const diemMoi = nhapDiem[idCt];
      const nhanXetMoi = nhapNhanXet[idCt];
      const diemCu =
        ct.DiemNhap === null || ct.DiemNhap === undefined
          ? ""
          : String(ct.DiemNhap);
      const nhanXetCu = ct.NhanXetNhap || "";
      return (
        (diemMoi !== undefined && String(diemMoi) !== diemCu) ||
        (nhanXetMoi !== undefined && nhanXetMoi !== nhanXetCu)
      );
    },
    [nhapDiem, nhapNhanXet],
  );

  const soDongDaSua = useMemo(() => {
    return chiTietList.filter((ct) => oDaSua(ct)).length;
  }, [chiTietList, oDaSua]);

  const handleDiemChange = (idCt, val) => {
    setNhapDiem((prev) => ({
      ...prev,
      [idCt]: val,
    }));
  };

  const handleNhanXetChange = (idCt, val) => {
    setNhapNhanXet((prev) => ({
      ...prev,
      [idCt]: val,
    }));
  };

  // Lưu một tiêu chí đơn lẻ
  const handleLuuDong = async (ct) => {
    const idCt = ct.IdChiTietDv;
    setIdDangLuu(idCt);
    try {
      const { item, newRowVersion } = await nhapDiemChiTietDonVi(idCt, {
        diem: giaTriO(nhapDiem[idCt], ct.DiemNhap),
        nhanXet: giaTriO(nhapNhanXet[idCt], ct.NhanXetNhap),
        rowVersion: phieu?.RowVersion,
      });

      setNhapDiem((cur) => {
        const { [idCt]: _bo, ...conLai } = cur;
        return conLai;
      });
      setNhapNhanXet((cur) => {
        const { [idCt]: _bo, ...conLai } = cur;
        return conLai;
      });

      if (!newRowVersion) {
        await taiPhieu({ imLang: true });
      } else {
        setPhieu((cur) =>
          cur
            ? {
              ...cur,
              RowVersion: newRowVersion,
              ChiTiet: (cur.ChiTiet || []).map((dong) =>
                dong.IdChiTietDv === idCt && item
                  ? { ...dong, ...item }
                  : dong,
              ),
            }
            : cur,
        );
      }
      showToast(
        "success",
        "Đã lưu",
        `Đã lưu điểm tiêu chí "${ct.TenTieuChi}".`,
      );
    } catch (error) {
      console.error("Lỗi lưu điểm tiêu chí đơn vị:", error);
      showToast("error", "Lưu thất bại", error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setIdDangLuu(null);
    }
  };

  // Lưu tất cả tiêu chí đã chỉnh sửa
  const handleLuuTatCa = async () => {
    const danhSachSua = chiTietList.filter((ct) => oDaSua(ct));
    if (danhSachSua.length === 0) return;

    setDangLuuTatCa(true);
    let currentRowVersion = phieu?.RowVersion;
    let savedCount = 0;
    let hasError = false;

    try {
      for (const ct of danhSachSua) {
        const idCt = ct.IdChiTietDv;
        const { item, newRowVersion } = await nhapDiemChiTietDonVi(idCt, {
          diem: giaTriO(nhapDiem[idCt], ct.DiemNhap),
          nhanXet: giaTriO(nhapNhanXet[idCt], ct.NhanXetNhap),
          rowVersion: currentRowVersion,
        });

        if (newRowVersion) currentRowVersion = newRowVersion;
        savedCount++;

        // Xóa bản nháp dòng đã lưu thành công
        setNhapDiem((cur) => {
          const { [idCt]: _bo, ...conLai } = cur;
          return conLai;
        });
        setNhapNhanXet((cur) => {
          const { [idCt]: _bo, ...conLai } = cur;
          return conLai;
        });
      }

      await taiPhieu({ imLang: true });
      showToast(
        "success",
        "Đã lưu tất cả",
        `Đã lưu thành công ${savedCount} tiêu chí có thay đổi.`,
      );
    } catch (error) {
      hasError = true;
      console.error("Lỗi lưu danh sách tiêu chí:", error);
      showToast(
        "error",
        "Lưu chưa hoàn tất",
        `${error.message} (Đã lưu ${savedCount}/${danhSachSua.length} tiêu chí)`,
      );
      await taiPhieu({ imLang: true });
    } finally {
      setDangLuuTatCa(false);
    }
  };

  const handleTongHop = async () => {
    setDangTongHop(true);
    try {
      const { item, tongHop: ketQua } = await tongHopKpiDonVi(id, {
        baoGomDonViCon: gomDonViCon,
      });
      setTongHop(ketQua);
      if (item) setPhieu(item);
      else await taiPhieu({ imLang: true });
      showToast(
        "success",
        "Đã tổng hợp",
        "Điểm của các tiêu chí tự động đã được cập nhật theo KPI thành viên.",
      );
    } catch (error) {
      console.error("Lỗi tổng hợp KPI thành viên:", error);
      showToast("error", "Tổng hợp thất bại", error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setDangTongHop(false);
    }
  };

  const handleTrinh = async ({ lyDo }) => {
    setDangTrinh(true);
    try {
      const item = await trinhPhieuDonVi(id, {
        nhanXet: lyDo,
        rowVersion: phieu?.RowVersion,
      });
      setMoTrinh(false);
      if (item) setPhieu(item);
      else await taiPhieu({ imLang: true });
      showToast(
        "success",
        "Đã trình",
        "Phiếu đã chuyển sang chờ Trưởng đơn vị duyệt.",
        5000,
      );
    } catch (error) {
      console.error("Lỗi trình phiếu KPI đơn vị:", error);
      showToast("error", "Trình phiếu thất bại", error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setDangTrinh(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải phiếu KPI đơn vị...
          </div>
        </div>
      </div>
    );
  }

  if (loiTai || !phieu) {
    return (
      <div className="page-container">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i
              className="fa-solid fa-triangle-exclamation"
              style={{ color: "#f59e0b" }}
            ></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không mở được phiếu
            </h3>
            <p style={{ margin: "0 0 20px 0" }}>
              {loiTai || "Phiếu không tồn tại."}
            </p>
            <button
              className="btn-cancel"
              style={{ margin: "0 auto" }}
              onClick={() => navigate("/danh-gia-kpi-don-vi")}
            >
              <i className="fa-solid fa-arrow-left"></i> Về danh sách phiếu đơn
              vị
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Khối hành động trên header
  const headerActions = choPhepNhap ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        className="btn-luu-nhap"
        disabled={soDongDaSua === 0 || dangLuuTatCa || idDangLuu !== null}
        onClick={handleLuuTatCa}
        title="Lưu tất cả tiêu chí bạn đã sửa đổi"
      >
        <i
          className={`fa-solid ${dangLuuTatCa ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}
        ></i>
        {dangLuuTatCa
          ? "Đang lưu..."
          : soDongDaSua > 0
            ? `Lưu thay đổi (${soDongDaSua})`
            : "Lưu thay đổi"}
      </button>

      <button
        type="button"
        className="btn-tong-hop"
        disabled={dangTongHop || dangLuuTatCa}
        onClick={handleTongHop}
        title="Tổng hợp lại điểm KPI từ các thành viên trong đơn vị"
      >
        <i
          className={`fa-solid ${dangTongHop ? "fa-spinner fa-spin" : "fa-calculator"}`}
        ></i>
        {dangTongHop ? "Đang tổng hợp..." : "Tổng hợp KPI"}
      </button>

      <label
        style={{
          fontSize: "13px",
          color: "#475569",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={gomDonViCon}
          disabled={dangTongHop || dangLuuTatCa}
          onChange={(e) => setGomDonViCon(e.target.checked)}
        />
        Gồm đơn vị con
      </label>

      <button
        type="button"
        className="btn-nop-phieu"
        disabled={dangTrinh || dangLuuTatCa}
        onClick={() => setMoTrinh(true)}
      >
        <i className="fa-solid fa-paper-plane"></i> Trình Trưởng đơn vị
      </button>
    </div>
  ) : (
    <div className="pl2-approved pl2-waiting">
      {Number(phieu.TrangThai) === TRANG_THAI_DV.CHO_DV_DUYET ? (
        <>
          <i className="fa-solid fa-hourglass-half"></i> Chờ Trưởng đơn vị duyệt
        </>
      ) : Number(phieu.TrangThai) === TRANG_THAI_DV.DV_DA_DUYET ? (
        <>
          <i className="fa-solid fa-user-check"></i> Trưởng đơn vị đã duyệt
        </>
      ) : Number(phieu.TrangThai) === TRANG_THAI_DV.TRUONG_DA_DUYET ? (
        <>
          <i className="fa-solid fa-circle-check"></i> Hiệu trưởng đã duyệt
        </>
      ) : (
        <>
          <i className="fa-solid fa-lock"></i> Đã hoàn tất
        </>
      )}
    </div>
  );

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      {/* Tiêu đề & Breadcrumb & Badge */}
      <div className="page-header">
        <button
          className="cd-link-btn"
          style={{ marginBottom: "8px" }}
          onClick={() => navigate("/danh-gia-kpi-don-vi")}
        >
          <i className="fa-solid fa-arrow-left"></i> Danh sách phiếu KPI đơn vị
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: "#1e293b",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              {phieu.TenDonVi || `Đơn vị #${phieu.IdDonVi}`} - Năm học{" "}
              {phieu.IdNam}
            </h2>
            <span className="breadcrumb">
              {phieu.TenMau ? `${phieu.TenMau} · ` : ""}Lần đánh giá{" "}
              {phieu.LanDanhGia}
              {phieu.LanMoLai > 0 ? ` · Đã mở lại ${phieu.LanMoLai} lần` : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <TrangThaiDonViBadge trangThai={phieu.TrangThai} />
            <XepLoaiBadge xepLoai={phieu.XepLoai} />
          </div>
        </div>
      </div>

      {/* Biểu mẫu đánh giá dạng thẻ */}
      <DanhGiaDonViForm
        phieu={phieu}
        chiTietList={chiTietList}
        sections={sections}
        tieuChiMap={tieuChiMap}
        nhapDiem={nhapDiem}
        nhapNhanXet={nhapNhanXet}
        choPhepNhap={choPhepNhap}
        idDangLuu={idDangLuu}
        onDiemChange={handleDiemChange}
        onNhanXetChange={handleNhanXetChange}
        onLuuDong={handleLuuDong}
        oDaSua={oDaSua}
        hanhDong={headerActions}
        tamTinh={tamTinh}
        tongHop={tongHop}
      />

      {/* Modal xác nhận trình duyệt */}
      {moTrinh && (
        <LyDoModal
          tieuDe="Trình phiếu lên Trưởng đơn vị"
          moTa="Phiếu sẽ chuyển sang trạng thái chờ Trưởng đơn vị duyệt. Sau bước này bạn không sửa được điểm nữa."
          nhanLyDo="Nhận xét / Ý kiến kèm theo"
          batBuocLyDo={false}
          nhanXacNhan="Trình phiếu"
          iconXacNhan="fa-paper-plane"
          dangGui={dangTrinh}
          onDong={() => setMoTrinh(false)}
          onXacNhan={handleTrinh}
        >
          {dongChamTayThieuDiem.length > 0 && (
            <div
              className="cd-hint cd-hint-warn"
              style={{ marginBottom: "12px" }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i> Còn{" "}
              <b>{dongChamTayThieuDiem.length}</b> tiêu chí chấm tay chưa có
              điểm. Nếu trình bây giờ thì Trưởng đơn vị sẽ nhận phiếu chưa đầy
              đủ điểm.
            </div>
          )}
        </LyDoModal>
      )}
    </div>
  );
};

export default ChiTietPhieuDonVi;
