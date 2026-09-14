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
import { fetchTieuChiTheoMau, formatDiem } from "../../utils/phieuApi";
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
import {
  CAU_HINH_MC_MAC_DINH,
  layCauHinhMinhChung,
} from "../../utils/minhChungDonViApi";
import { useMinhChungDonViPreview } from "../../hooks/useMinhChungDonViPreview";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import {
  TrangThaiDonViBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";
import DanhGiaPhongForm from "../../components/DanhGia/DanhGiaKpiPhong/DanhGiaPhongForm";
import DuyetPhongForm from "../../components/DanhGia/DanhGiaKpiPhong/DuyetPhongForm";
import SuaDiemDonViModal from "../../components/DanhGia/DanhGiaKpiPhong/SuaDiemDonViModal";
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
 * HAI GIAO DIỆN, MỘT TRANG. Trạng thái 2 (Trưởng phòng duyệt) dựng bằng
 * DuyetPhongForm - bố cục thẻ `cdm-*` y như màn hình thẩm định hồ sơ giảng viên
 * (ChamDiemPhieu), vì việc cần làm ở đó là DUYỆT lại đề xuất có sẵn của thư ký.
 * Bốn trạng thái còn lại vẫn là DanhGiaPhongForm (form kê khai `pl2-*`), nơi
 * việc cần làm là GÕ điểm cho cả phiếu.
 *
 * Khác biệt thao tác kéo theo: ở trạng thái 2 mỗi cú bấm trên thẻ GHI NGAY một
 * dòng, nên không còn bản nháp `nhapDiem`/`nhapNhanXet` lẫn nút "Lưu thay đổi".
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

  /** Dòng đang mở hộp thoại chọn lại mức điểm (chỉ dùng ở màn hình duyệt). */
  const [dongSuaDiem, setDongSuaDiem] = useState(null);

  const [moChuyenTiep, setMoChuyenTiep] = useState(false);
  const [moChot, setMoChot] = useState(false);
  const [moMoLai, setMoMoLai] = useState(false);
  const [trangThaiMoLai, setTrangThaiMoLai] = useState(
    String(TRANG_THAI_DV.NHAP),
  );
  const [dangGui, setDangGui] = useState(false);

  const [cauHinhMc, setCauHinhMc] = useState(CAU_HINH_MC_MAC_DINH);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const baoLoiMc = useCallback((msg) => {
    toast.current?.show({
      severity: "error",
      summary: "Minh chứng",
      detail: msg,
      life: 5000,
    });
  }, []);

  const baoOkMc = useCallback((msg) => {
    toast.current?.show({
      severity: "success",
      summary: "Minh chứng",
      detail: msg,
      life: 2500,
    });
  }, []);

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungDonViPreview(baoLoiMc);

  // Whitelist đuôi tệp / dung lượng do server quyết; lỗi thì layCauHinhMinhChung
  // đã tự rơi về mặc định nên không cần nhánh catch ở đây.
  useEffect(() => {
    let con = true;
    layCauHinhMinhChung().then((ch) => {
      if (con) setCauHinhMc(ch);
    });
    return () => {
      con = false;
    };
  }, []);

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

  /**
   * Trạng thái 2 đổi hẳn sang bố cục duyệt (thẻ cdm-*), kể cả với người chỉ xem:
   * nếu chỉ đổi cho riêng Trưởng phòng thì cùng một phiếu lại hiện hai kiểu giao
   * diện tùy người đăng nhập, khó đối chiếu khi trao đổi với nhau.
   */
  const laBuocDuyetPhong =
    Number(phieu?.TrangThai) === TRANG_THAI_DV.CHO_DV_DUYET;

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

  /**
   * Quyền thêm/gỡ minh chứng trùng đúng quyền ghi `diem-nhap`: thư ký của chính
   * phòng đó, và phiếu còn ở trạng thái 1. Các cấp sau chỉ xem và tải về.
   */
  const choPhepSuaMinhChung = quyen.coTheNhap;

  /**
   * Vá danh sách minh chứng của MỘT dòng, ngay tại chỗ.
   *
   * ⚠️ KHÔNG đụng RowVersion và KHÔNG gọi taiPhieu(): endpoint minh chứng cố ý không
   * đổi RowVersion của phiếu (xem docs/openapi.yaml), còn tải lại phiếu sẽ xoá sạch
   * bản nháp điểm người dùng đang gõ dở ở các dòng khác.
   */
  const handleMinhChungChange = useCallback((idCt, dsMoi) => {
    setPhieu((cur) =>
      cur
        ? {
            ...cur,
            ChiTiet: (cur.ChiTiet || []).map((dong) =>
              dong.IdChiTietDv === idCt ? { ...dong, MinhChung: dsMoi } : dong,
            ),
          }
        : cur,
    );
  }, []);

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

  /**
   * Ghi điểm MỘT dòng ở lớp điểm đang mở, rồi vá kết quả vào state tại chỗ.
   *
   * Dùng chung cho cả ba lối vào: nút "Lưu tiêu chí" của form kê khai, và hai
   * nút "Duyệt giữ nguyên" / "Chỉnh sửa điểm" của màn hình duyệt. Cả ba gọi đúng
   * một endpoint PUT chi-tiet-don-vi/{id}/{cap}, chỉ khác giá trị gửi lên.
   *
   * HAI CÁCH CẬP NHẬT, chọn theo màn hình đang mở:
   *
   *  - Form kê khai (trạng thái 1, 3): VÁ tại chỗ theo `Item` + `NewRowVersion`.
   *    Tải lại phiếu sẽ xóa sạch bản nháp người dùng đang gõ dở ở các dòng khác.
   *  - Màn hình duyệt (trạng thái 2): ĐỌC LẠI phiếu từ server. Ở đó không có bản
   *    nháp nào để mất, mà phần vá tại chỗ lại phụ thuộc hoàn toàn vào việc
   *    server có trả `Item` hay không - thiếu nó là thẻ đứng im sau khi bấm,
   *    người duyệt chỉ thấy mỗi thông báo. Đọc lại vừa chắc vừa kéo theo cả các
   *    trường server tự tính (DiemChinhThuc, NgayDuyetDv).
   */
  const ghiDiemDong = async (ct, { diem, nhanXet }, thongDiepXong) => {
    if (!cap) return false;
    const idCt = ct.IdChiTietDv;
    setIdDangLuu(idCt);
    try {
      const { item, newRowVersion } = await HAM_GHI_DIEM[cap](idCt, {
        diem,
        nhanXet,
        rowVersion: phieu?.RowVersion,
      });

      boNhapCuaDong(idCt);

      if (laBuocDuyetPhong || !newRowVersion || !item) {
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
      showToast("success", "Đã lưu", thongDiepXong);
      return true;
    } catch (error) {
      console.error("Lỗi lưu điểm tiêu chí Phòng:", error);
      showToast("error", "Lưu thất bại", error.message);
      if (error.isConflict) await taiPhieu({ imLang: true });
      return false;
    } finally {
      setIdDangLuu(null);
    }
  };

  // Phiếu đã khóa (trạng thái 4, 5) thì không còn lớp điểm nào để ghi và
  // truongCuaCap là null - chặn ngay ở đây thay vì để đọc thuộc tính trên null.
  const handleLuuDong = (ct) => {
    if (!truongCuaCap) return undefined;
    return ghiDiemDong(
      ct,
      {
        diem: giaTriO(nhapDiem[ct.IdChiTietDv], ct[truongCuaCap.diem]),
        nhanXet: giaTriO(
          nhapNhanXet[ct.IdChiTietDv],
          ct[truongCuaCap.nhanXet],
        ),
      },
      `Đã lưu điểm tiêu chí "${ct.TenTieuChi}".`,
    );
  };

  /**
   * "Duyệt giữ nguyên": ghi đúng con số thư ký đã đề xuất vào lớp Trưởng phòng.
   * Không có endpoint duyệt-theo-dòng riêng cho phiếu đơn vị, nhưng ghi
   * diem-duyet-dv = DiemNhap cho ra đúng kết quả đó.
   *
   * Nhận xét cũ của chính lớp này được gửi lại nguyên vẹn: server ghi đè cả hai
   * cột, không gửi kèm là xóa mất ghi chú người duyệt đã viết trước đó.
   */
  const handleDuyetDong = (ct) => {
    if (!truongCuaCap) return undefined;
    return ghiDiemDong(
      ct,
      { diem: ct.DiemNhap, nhanXet: ct[truongCuaCap.nhanXet] },
      `Đã duyệt "${ct.TenTieuChi}" giữ nguyên ${formatDiem(ct.DiemNhap)} điểm.`,
    );
  };

  const handleSuaDiemDong = async ({ diem, nhanXet }) => {
    const ct = dongSuaDiem;
    setDongSuaDiem(null);
    await ghiDiemDong(
      ct,
      { diem, nhanXet },
      `Đã chấm "${ct.TenTieuChi}" ở mức ${formatDiem(diem)} điểm.`,
    );
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

  /**
   * Nút thao tác của MÀN HÌNH DUYỆT, đặt ở page-header như ChamDiemPhieu.
   *
   * Không dùng lại headerActions bên dưới: bộ nút đó mang các lớp .btn-nop-phieu
   * / .btn-luu-nhap / .btn-thu-hoi, mà kích thước, padding và bo góc của chúng
   * được khai trong selector con `.pl2-header-actions button` của
   * DanhGiaPhuLuc2.css. Ra khỏi wrapper .pl2-header-actions thì chỉ còn màu nền,
   * nút co lại thành một mẩu chữ dính sát viền.
   */
  const duyetActions = buocChuyenTiep ? (
    <button
      type="button"
      className="btn-submit"
      disabled={dangGui}
      onClick={() => setMoChuyenTiep(true)}
    >
      <i className={`fa-solid ${buocChuyenTiep.icon}`}></i>{" "}
      {buocChuyenTiep.nhanXacNhan}
    </button>
  ) : null;

  const headerActions = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      {/* Màn hình duyệt ghi ngay mỗi khi bấm nên không có gì để "lưu" cả lượt. */}
      {choPhepNhap && !laBuocDuyetPhong && (
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

      {/* Màn hình duyệt đã có TrangThaiDonViBadge ngay trên đầu khối thông tin
          phiếu, thêm badge này nữa là lặp - và nó mang lớp pl2-* của form kê
          khai, lạc hẳn giữa bố cục cd-*. */}
      {!laBuocDuyetPhong &&
        !choPhepNhap &&
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

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <TrangThaiDonViBadge trangThai={phieu.TrangThai} />
            <XepLoaiBadge xepLoai={phieu.XepLoai} />
            {duyetActions}
          </div>
        </div>
      </div>

      {laBuocDuyetPhong ? (
        <DuyetPhongForm
          phieu={phieu}
          chiTietList={chiTietList}
          sections={sections}
          choPhepNhap={choPhepNhap}
          lyDoKhoa={
            quyen.laCapTruong
              ? "Phiếu đang chờ Trưởng phòng duyệt; cấp Trường chấm ở bước sau."
              : "Bạn không phải Trưởng phòng của đơn vị này nên chỉ xem được."
          }
          idDangLuu={idDangLuu}
          cauHinhMc={cauHinhMc}
          tamTinh={tamTinh}
          onDuyetDong={handleDuyetDong}
          onSuaDiemDong={setDongSuaDiem}
          onXemMinhChung={openPreview}
          onTaiMinhChung={downloadMinhChung}
        />
      ) : (
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
          cauHinhMc={cauHinhMc}
          choPhepSuaMinhChung={choPhepSuaMinhChung}
          onMinhChungChange={handleMinhChungChange}
          onXemMinhChung={openPreview}
          onTaiMinhChung={downloadMinhChung}
          onLoiMinhChung={baoLoiMc}
          onOkMinhChung={baoOkMc}
        />
      )}

      {dongSuaDiem && (
        <SuaDiemDonViModal
          chiTiet={dongSuaDiem}
          thangDiem={tieuChiMap?.get(Number(dongSuaDiem.IdTieuChi))}
          dangGui={idDangLuu === dongSuaDiem.IdChiTietDv}
          onDong={() => setDongSuaDiem(null)}
          onXacNhan={handleSuaDiemDong}
        />
      )}

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

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenHienThi || preview.mc?.TenFileGoc}
        kieu={preview.kieu}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />
    </div>
  );
};

export default ChiTietPhieuPhong;
