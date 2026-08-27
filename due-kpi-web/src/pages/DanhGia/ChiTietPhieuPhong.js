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
import "../../css/DanhGia/DanhGiaKpiPhong.css";
import { useAuth } from "../../context/AuthContext";
import { fetchTieuChiTheoMau } from "../../utils/phieuApi";
import {
  chotPhieuDonVi,
  duyetDvPhieuDonVi,
  duyetTruongPhieuDonVi,
  fetchPhieuDonViDetail,
  moLaiPhieuDonVi,
  nhapDiemChiTietDonVi,
  nhapDiemDuyetDvChiTietDonVi,
  nhapDiemTruongChiTietDonVi,
  trinhPhieuDonVi,
  TRANG_THAI_DV,
  tenTrangThaiDonVi,
} from "../../utils/phieuDonViApi";
import {
  CAP_CHAM,
  TRUONG_DIEM_CUA_CAP,
  capChamTheoTrangThai,
  dongThieuDiem as locDongThieuDiem,
  dungSectionsPhong,
  quyenPhieuPhong,
  tinhTongDiemPhongTamTinh,
} from "../../utils/phieuPhongApi";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import {
  TrangThaiDonViBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";
import DanhGiaPhongForm from "../../components/DanhGia/DanhGiaKpiPhong/DanhGiaPhongForm";
import ChotPhieuPhongModal from "../../components/DanhGia/DanhGiaKpiPhong/ChotPhieuPhongModal";

/** Hàm ghi điểm tương ứng với lớp điểm đang được sửa. */
const HAM_GHI_DIEM = {
  [CAP_CHAM.NHAP]: nhapDiemChiTietDonVi,
  [CAP_CHAM.DUYET_DV]: nhapDiemDuyetDvChiTietDonVi,
  [CAP_CHAM.TRUONG]: nhapDiemTruongChiTietDonVi,
};

/** Giá trị ô nhập: bản nháp người dùng đang gõ, chưa có thì lấy số của server. */
const giaTriO = (nhap, goc) =>
  nhap !== undefined
    ? nhap
    : goc === null || goc === undefined
      ? ""
      : String(goc);

/**
 * Màn hình chấm phiếu KPI Phòng / Trung tâm - phủ TRỌN năm trạng thái.
 *
 * Một màn hình dùng chung cho cả ba cấp chấm, vì cả ba làm đúng một việc (gõ điểm
 * từng dòng rồi bấm một nút chuyển trạng thái), chỉ khác LỚP ĐIỂM được ghi:
 *
 *   trạng thái 1  thư ký      -> diem_nhap      -> Trình Trưởng phòng   (1→2)
 *   trạng thái 2  Trưởng phòng-> diem_duyet_dv  -> Duyệt                (2→3)
 *   trạng thái 3  cấp Trường  -> diem_truong    -> Duyệt cấp Trường     (3→4)
 *   trạng thái 4  cấp Trường  -> (khóa)         -> Chốt                 (4→5)
 *   trạng thái 5  cấp Trường  -> (khóa)         -> Mở lại               (5→1/2/3)
 *
 * KHÔNG CÓ NÚT TRẢ VỀ. Luồng đơn vị chỉ có năm hành động trên, không có thao tác
 * hủy nộp hay trả phiếu xuống cấp dưới - đường lùi duy nhất là "Mở lại" sau khi
 * phiếu đã hoàn tất. Đừng đi tìm endpoint trả về, server không có.
 *
 * KHÔNG GỌI tong-hop-kpi. Cả sáu tiêu chí của mẫu Phòng/TT đều là
 * `loai_nguon_diem = 1` (chấm tay), không dòng nào tổng hợp từ KPI cá nhân - gọi
 * endpoint đó cũng không đổi gì.
 */
const ChiTietPhieuPhong = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const { user } = useAuth();

  const [phieu, setPhieu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState("");
  const [tieuChiMap, setTieuChiMap] = useState(new Map());

  const [nhapDiem, setNhapDiem] = useState({});
  const [nhapNhanXet, setNhapNhanXet] = useState({});
  const [idDangLuu, setIdDangLuu] = useState(null);
  const [dangLuuTatCa, setDangLuuTatCa] = useState(false);

  const [moChuyenTiep, setMoChuyenTiep] = useState(false);
  const [moChot, setMoChot] = useState(false);
  const [moMoLai, setMoMoLai] = useState(false);
  const [trangThaiMoLai, setTrangThaiMoLai] = useState(
    String(TRANG_THAI_DV.NHAP),
  );
  const [dangGui, setDangGui] = useState(false);

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

        if (item.IdMau) {
          try {
            setTieuChiMap(await fetchTieuChiTheoMau(item.IdMau));
          } catch (err) {
            // Thiếu bảng thang điểm không chặn việc chấm: form rơi về ô nhập tự do.
            console.error("Lỗi tải thông tin thang điểm mẫu:", err);
          }
        }
        return item;
      } catch (error) {
        console.error("Lỗi tải phiếu KPI Phòng:", error);
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

  /** Bản nháp thuộc về một lớp điểm cụ thể - đổi trạng thái là phải bỏ hết. */
  useEffect(() => {
    setNhapDiem({});
    setNhapNhanXet({});
  }, [phieu?.TrangThai]);

  const chiTietList = useMemo(() => phieu?.ChiTiet || [], [phieu]);
  const cap = useMemo(() => capChamTheoTrangThai(phieu?.TrangThai), [phieu]);
  const truongCuaCap = cap ? TRUONG_DIEM_CUA_CAP[cap] : null;
  const quyen = useMemo(() => quyenPhieuPhong(phieu, user), [phieu, user]);

  const choPhepNhap =
    (quyen.coTheNhap && cap === CAP_CHAM.NHAP) ||
    (quyen.coTheChamDuyetDv && cap === CAP_CHAM.DUYET_DV) ||
    (quyen.coTheChamTruong && cap === CAP_CHAM.TRUONG);

  const sections = useMemo(
    () => dungSectionsPhong(chiTietList, tieuChiMap),
    [chiTietList, tieuChiMap],
  );

  const tamTinh = useMemo(
    () => tinhTongDiemPhongTamTinh(chiTietList, nhapDiem, cap),
    [chiTietList, nhapDiem, cap],
  );

  const dongThieuDiem = useMemo(
    () => locDongThieuDiem(chiTietList),
    [chiTietList],
  );

  const oDaSua = useCallback(
    (ct) => {
      if (!truongCuaCap) return false;
      const idCt = ct.IdChiTietDv;
      const diemMoi = nhapDiem[idCt];
      const nhanXetMoi = nhapNhanXet[idCt];
      const diemCu =
        ct[truongCuaCap.diem] === null || ct[truongCuaCap.diem] === undefined
          ? ""
          : String(ct[truongCuaCap.diem]);
      const nhanXetCu = ct[truongCuaCap.nhanXet] || "";
      return (
        (diemMoi !== undefined && String(diemMoi) !== diemCu) ||
        (nhanXetMoi !== undefined && nhanXetMoi !== nhanXetCu)
      );
    },
    [nhapDiem, nhapNhanXet, truongCuaCap],
  );

  const soDongDaSua = useMemo(
    () => chiTietList.filter((ct) => oDaSua(ct)).length,
    [chiTietList, oDaSua],
  );

  const handleDiemChange = (idCt, val) =>
    setNhapDiem((prev) => ({ ...prev, [idCt]: val }));

  const handleNhanXetChange = (idCt, val) =>
    setNhapNhanXet((prev) => ({ ...prev, [idCt]: val }));

  const boNhapCuaDong = (idCt) => {
    setNhapDiem((cur) => {
      const { [idCt]: _bo, ...conLai } = cur;
      return conLai;
    });
    setNhapNhanXet((cur) => {
      const { [idCt]: _bo, ...conLai } = cur;
      return conLai;
    });
  };

  const handleLuuDong = async (ct) => {
    if (!cap) return;
    const idCt = ct.IdChiTietDv;
    setIdDangLuu(idCt);
    try {
      const { item, newRowVersion } = await HAM_GHI_DIEM[cap](idCt, {
        diem: giaTriO(nhapDiem[idCt], ct[truongCuaCap.diem]),
        nhanXet: giaTriO(nhapNhanXet[idCt], ct[truongCuaCap.nhanXet]),
        rowVersion: phieu?.RowVersion,
      });

      boNhapCuaDong(idCt);

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
      console.error("Lỗi lưu điểm tiêu chí Phòng:", error);
      showToast("error", "Lưu thất bại", error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setIdDangLuu(null);
    }
  };

  /**
   * Lưu tuần tự từng dòng: RowVersion là của PHIẾU CHA nên mỗi lần ghi lại sinh
   * một giá trị mới, bắn song song sẽ ăn 409 ngay từ dòng thứ hai.
   */
  const handleLuuTatCa = async () => {
    if (!cap) return;
    const danhSachSua = chiTietList.filter((ct) => oDaSua(ct));
    if (danhSachSua.length === 0) return;

    setDangLuuTatCa(true);
    let rowVersionHienTai = phieu?.RowVersion;
    let daLuu = 0;

    try {
      for (const ct of danhSachSua) {
        const idCt = ct.IdChiTietDv;
        const { newRowVersion } = await HAM_GHI_DIEM[cap](idCt, {
          diem: giaTriO(nhapDiem[idCt], ct[truongCuaCap.diem]),
          nhanXet: giaTriO(nhapNhanXet[idCt], ct[truongCuaCap.nhanXet]),
          rowVersion: rowVersionHienTai,
        });
        if (newRowVersion) rowVersionHienTai = newRowVersion;
        daLuu += 1;
        boNhapCuaDong(idCt);
      }

      await taiPhieu({ imLang: true });
      showToast(
        "success",
        "Đã lưu tất cả",
        `Đã lưu ${daLuu} tiêu chí có thay đổi.`,
      );
    } catch (error) {
      console.error("Lỗi lưu danh sách tiêu chí Phòng:", error);
      showToast(
        "error",
        "Lưu chưa hoàn tất",
        `${error.message} (Đã lưu ${daLuu}/${danhSachSua.length} tiêu chí)`,
      );
      await taiPhieu({ imLang: true });
    } finally {
      setDangLuuTatCa(false);
    }
  };

  /** Ba bước chuyển trạng thái tiến lên đều cùng một khuôn: nhận xét + RowVersion. */
  const buocChuyenTiep = useMemo(() => {
    if (quyen.coTheTrinh) {
      return {
        ham: (tham) => trinhPhieuDonVi(id, tham),
        tieuDe: "Trình phiếu lên Trưởng phòng",
        moTa: "Phiếu sẽ chuyển sang chờ Trưởng phòng duyệt. Sau bước này bạn không sửa được điểm nữa.",
        nhanXacNhan: "Trình phiếu",
        icon: "fa-paper-plane",
        thanhCong: "Phiếu đã chuyển sang chờ Trưởng phòng duyệt.",
      };
    }
    if (quyen.coTheDuyetDv) {
      return {
        ham: (tham) => duyetDvPhieuDonVi(id, tham),
        tieuDe: "Duyệt phiếu và chuyển lên cấp Trường",
        moTa: "Điểm bạn chấm ở lớp Trưởng phòng sẽ được ghi nhận và phiếu chuyển sang chờ cấp Trường duyệt.",
        nhanXacNhan: "Duyệt phiếu",
        icon: "fa-user-check",
        thanhCong: "Phiếu đã chuyển sang chờ cấp Trường duyệt.",
      };
    }
    if (quyen.coTheDuyetTruong) {
      return {
        ham: (tham) => duyetTruongPhieuDonVi(id, tham),
        tieuDe: "Duyệt phiếu ở cấp Trường",
        moTa: "Phiếu sẽ chuyển sang trạng thái chờ chốt. Điểm cấp Trường là lớp thắng khi tính tổng.",
        nhanXacNhan: "Duyệt cấp Trường",
        icon: "fa-circle-check",
        thanhCong: "Phiếu đã chuyển sang chờ chốt.",
      };
    }
    return null;
  }, [quyen, id]);

  const handleChuyenTiep = async ({ lyDo }) => {
    if (!buocChuyenTiep) return;
    setDangGui(true);
    try {
      const item = await buocChuyenTiep.ham({
        nhanXet: lyDo,
        rowVersion: phieu?.RowVersion,
      });
      setMoChuyenTiep(false);
      if (item) setPhieu(item);
      else await taiPhieu({ imLang: true });
      showToast("success", "Thành công", buocChuyenTiep.thanhCong, 5000);
    } catch (error) {
      console.error("Lỗi chuyển trạng thái phiếu Phòng:", error);
      showToast("error", "Thao tác thất bại", error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setDangGui(false);
    }
  };

  const handleChot = async ({ xepLoai, ghiChuXepLoai, nhanXet }) => {
    setDangGui(true);
    try {
      const item = await chotPhieuDonVi(id, {
        xepLoai,
        ghiChuXepLoai,
        nhanXet,
        rowVersion: phieu?.RowVersion,
      });
      setMoChot(false);
      if (item) setPhieu(item);
      else await taiPhieu({ imLang: true });
      showToast("success", "Đã chốt", "Phiếu KPI đơn vị đã hoàn tất.", 5000);
    } catch (error) {
      console.error("Lỗi chốt phiếu Phòng:", error);
      showToast("error", "Chốt thất bại", error.message, 6000);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setDangGui(false);
    }
  };

  const handleMoLai = async ({ lyDo, nhanXet }) => {
    setDangGui(true);
    try {
      const item = await moLaiPhieuDonVi(id, {
        trangThaiMoi: trangThaiMoLai,
        lyDo,
        nhanXet,
        rowVersion: phieu?.RowVersion,
      });
      setMoMoLai(false);
      if (item) setPhieu(item);
      else await taiPhieu({ imLang: true });
      showToast(
        "success",
        "Đã mở lại",
        `Phiếu quay về trạng thái "${tenTrangThaiDonVi(Number(trangThaiMoLai))}". Tổng điểm và xếp loại đã bị xóa.`,
        6000,
      );
    } catch (error) {
      console.error("Lỗi mở lại phiếu Phòng:", error);
      showToast("error", "Mở lại thất bại", error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
    } finally {
      setDangGui(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải phiếu KPI Phòng/Trung tâm...
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
              onClick={() => navigate("/danh-gia-kpi-phong")}
            >
              <i className="fa-solid fa-arrow-left"></i> Về danh sách phiếu
              Phòng/TT
            </button>
          </div>
        </div>
      </div>
    );
  }

  const headerActions = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      {choPhepNhap && (
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
      )}

      {buocChuyenTiep && (
        <button
          type="button"
          className="btn-nop-phieu"
          disabled={dangGui || dangLuuTatCa}
          onClick={() => setMoChuyenTiep(true)}
        >
          <i className={`fa-solid ${buocChuyenTiep.icon}`}></i>{" "}
          {buocChuyenTiep.nhanXacNhan}
        </button>
      )}

      {quyen.coTheChot && (
        <button
          type="button"
          className="btn-nop-phieu"
          disabled={dangGui}
          onClick={() => setMoChot(true)}
        >
          <i className="fa-solid fa-lock"></i> Chốt phiếu
        </button>
      )}

      {quyen.coTheMoLai && (
        <button
          type="button"
          className="btn-thu-hoi"
          disabled={dangGui}
          onClick={() => setMoMoLai(true)}
        >
          <i className="fa-solid fa-rotate-left"></i> Mở lại phiếu
        </button>
      )}

      {!choPhepNhap &&
        !buocChuyenTiep &&
        !quyen.coTheChot &&
        !quyen.coTheMoLai && (
          <div className="pl2-approved pl2-waiting">
            <i className="fa-solid fa-eye"></i>{" "}
            {tenTrangThaiDonVi(phieu.TrangThai)}
          </div>
        )}
    </div>
  );

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <button
          className="cd-link-btn"
          style={{ marginBottom: "8px" }}
          onClick={() => navigate("/danh-gia-kpi-phong")}
        >
          <i className="fa-solid fa-arrow-left"></i> Danh sách phiếu KPI
          Phòng/TT
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

      <DanhGiaPhongForm
        phieu={phieu}
        chiTietList={chiTietList}
        sections={sections}
        tieuChiMap={tieuChiMap}
        cap={cap}
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
      />

      {moChuyenTiep && buocChuyenTiep && (
        <LyDoModal
          tieuDe={buocChuyenTiep.tieuDe}
          moTa={buocChuyenTiep.moTa}
          nhanLyDo="Nhận xét / Ý kiến kèm theo"
          batBuocLyDo={false}
          nhanXacNhan={buocChuyenTiep.nhanXacNhan}
          iconXacNhan={buocChuyenTiep.icon}
          dangGui={dangGui}
          onDong={() => setMoChuyenTiep(false)}
          onXacNhan={handleChuyenTiep}
        >
          {dongThieuDiem.length > 0 && (
            <div
              className="cd-hint cd-hint-warn"
              style={{ marginBottom: "12px" }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i> Còn{" "}
              <b>{dongThieuDiem.length}</b> tiêu chí chưa có điểm. Cấp sau sẽ
              nhận phiếu chưa đầy đủ, và bước chốt sẽ bị chặn cho tới khi mọi
              dòng có điểm.
            </div>
          )}
        </LyDoModal>
      )}

      {moChot && (
        <ChotPhieuPhongModal
          tongDiem={phieu.TongDiemTichLuy ?? tamTinh?.tichLuy ?? 0}
          dongThieuDiem={dongThieuDiem}
          dangGui={dangGui}
          onDong={() => setMoChot(false)}
          onXacNhan={handleChot}
        />
      )}

      {moMoLai && (
        <LyDoModal
          tieuDe="Mở lại phiếu đã hoàn tất"
          moTa="Đây là đường lùi duy nhất của luồng đơn vị - luồng này không có thao tác trả phiếu về cấp dưới."
          canhBao="Mở lại sẽ tăng số lần đánh giá, lưu ảnh chụp điểm cũ vào lịch sử, và XÓA TRẮNG tổng điểm, xếp loại cùng thông tin người chốt."
          nhanLyDo="Lý do mở lại"
          goiYLyDo="Ví dụ: đơn vị bổ sung minh chứng cho tiêu chí II.2 sau khi đã chốt."
          batBuocLyDo
          hienNhanXet
          nhanXacNhan="Mở lại phiếu"
          iconXacNhan="fa-rotate-left"
          dangGui={dangGui}
          onDong={() => setMoMoLai(false)}
          onXacNhan={handleMoLai}
        >
          <div className="form-group" style={{ marginBottom: "10px" }}>
            <label>Mở lại về trạng thái</label>
            <div className="phong-mo-lai-chon">
              {[
                TRANG_THAI_DV.NHAP,
                TRANG_THAI_DV.CHO_DV_DUYET,
                TRANG_THAI_DV.DV_DA_DUYET,
              ].map((tt) => (
                <label
                  key={tt}
                  className={`phong-mo-lai-o ${Number(trangThaiMoLai) === tt ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="trang_thai_mo_lai"
                    checked={Number(trangThaiMoLai) === tt}
                    disabled={dangGui}
                    onChange={() => setTrangThaiMoLai(String(tt))}
                  />
                  <span>
                    {tt}. {tenTrangThaiDonVi(tt)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </LyDoModal>
      )}
    </div>
  );
};

export default ChiTietPhieuPhong;
