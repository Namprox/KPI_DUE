import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/DanhGia/DanhGiaPhuLuc2.css";
import "../../css/DanhGia/DanhGiaKpiDonVi.css";
import {
  fetchDiemPhanHoiSv,
  fetchTieuChiTheoMau,
  formatDiem,
} from "../../utils/phieuApi";
import { fetchDonViList } from "../../utils/donViApi";
import {
  CAU_HINH_MC_MAC_DINH,
  layCauHinhMinhChung,
} from "../../utils/minhChungDonViApi";
import { useMinhChungDonViPreview } from "../../hooks/useMinhChungDonViPreview";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import {
  CAP_CHAM,
  TRUONG_DIEM_CUA_CAP,
  capChamTheoTrangThai,
  coTieuChiDanhGiaSinhVien,
  coTieuChiDiemTruTapThe,
  diemGocCuaDong,
  diemHieuLucCuaDong,
  duyetDvPhieuDonVi,
  fetchPhieuDonViDetail,
  duocChamDuyetDv,
  laDongChamTay,
  nhapDiemChiTietDonVi,
  nhapDiemDuyetDvChiTietDonVi,
  tinhThongKePhanHoiKhoa,
  tinhTongDiemDonViTamTinh,
  tongHopKpiDonVi,
  trinhPhieuDonVi,
  tenTrangThaiDonVi,
  TRANG_THAI_DV,
  TRANG_THAI_DV_META,
} from "../../utils/phieuDonViApi";
import {
  NHAN_CAP_CHAM_KHOA,
  quyenPhieuKhoa,
} from "../../utils/phieuKhoaApi";
import { fetchDiemTruKhoa } from "../../utils/viPhamTongHopApi";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import {
  TrangThaiDonViBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";
import DanhGiaDonViForm from "../../components/DanhGia/DanhGiaKpiDonVi/DanhGiaDonViForm";
import DuyetDonViForm from "../../components/DanhGia/DanhGiaKpiDonVi/DuyetDonViForm";
import SuaDiemDonViModal from "../../components/DanhGia/SuaDiemDonViModal";
import { useAuth } from "../../context/AuthContext";
import LichSuPhieuDonViHeader from "../../components/DanhGia/LichSuPhieuDonViHeader";

/** Giá trị ô nhập: bản nháp người dùng đang gõ, chưa có thì lấy số của server. */
const giaTriO = (nhap, goc) =>
  nhap !== undefined
    ? nhap
    : goc === null || goc === undefined
      ? ""
      : String(goc);

/** Hàm ghi điểm tương ứng với lớp điểm đang được sửa. */
const HAM_GHI_DIEM = {
  [CAP_CHAM.NHAP]: nhapDiemChiTietDonVi,
  [CAP_CHAM.DUYET_DV]: nhapDiemDuyetDvChiTietDonVi,
};

/**
 * Màn hình Đánh giá KPI Khoa - phục vụ HAI cấp dưới của quy trình đơn vị:
 *
 *   trạng thái 1  Thư ký Khoa (TKK)        -> diem_nhap      -> Trình (1→2)
 *   trạng thái 2  Trưởng Khoa (TK/TKL)     -> diem_duyet_dv  -> Duyệt (2→3)
 *
 * HAI GIAO DIỆN, MỘT TRANG - giống hệt cách màn hình Phòng/TT làm. Trạng thái 2
 * dựng bằng DuyetDonViForm (bố cục thẻ `cdm-*` của màn hình thẩm định hồ sơ
 * giảng viên) vì việc cần làm ở đó là DUYỆT lại đề xuất có sẵn của thư ký; các
 * trạng thái còn lại vẫn là DanhGiaDonViForm (form kê khai `pl2-*`), nơi việc
 * cần làm là GÕ điểm cho cả phiếu.
 *
 * Khác biệt thao tác kéo theo: ở trạng thái 2 mỗi cú bấm trên thẻ GHI NGAY một
 * dòng, nên không có bản nháp `nhapDiem` lẫn nút "Lưu thay đổi".
 *
 * BA TRẠNG THÁI CUỐI (cấp Trường duyệt / chốt / mở lại) CHỈ ĐỌC ở đây: chúng là
 * việc của Hiệu trưởng, mà ROLE_SETS.KPI_KHOA không mở route này cho HT - xem
 * ghi chú ở menuConfig.js. Endpoint đã có sẵn (duyetTruongPhieuDonVi,
 * chotPhieuDonVi, moLaiPhieuDonVi trong phieuDonViApi.js), chỉ thiếu màn hình.
 *
 * KHÔNG CÓ NÚT TRẢ VỀ. Luồng đơn vị không có thao tác hủy nộp hay trả phiếu
 * xuống cấp dưới - đường lùi duy nhất là cấp Trường "Mở lại" sau khi phiếu đã
 * hoàn tất. Trưởng đơn vị thấy điểm chưa đúng thì chấm đè chứ không trả lại.
 */
const ChiTietPhieuDonVi = ({ idPhieu, readOnly = false, editorRef, embedded = false, backTo = "/danh-gia-kpi-don-vi" }) => {
  const { id: routeId } = useParams();
  const id = idPhieu ?? routeId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useRef(null);

  const [phieu, setPhieu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState("");
  const [tieuChiMap, setTieuChiMap] = useState(new Map());

  // Bản nháp cục bộ
  const [nhapDiem, setNhapDiem] = useState({});
  const [nhapNhanXet, setNhapNhanXet] = useState({});
  const [dangLuuTatCa, setDangLuuTatCa] = useState(false);

  const [dangTongHop, setDangTongHop] = useState(false);
  const [tongHop, setTongHop] = useState(null);
  const [loiTongHop, setLoiTongHop] = useState("");
  // Số liệu điểm trừ tập thể đọc riêng để không mất khi tải lại trang (xem taiDiemTruKhoa)
  const [diemTruKhoa, setDiemTruKhoa] = useState(null);
  // Số liệu điểm đánh giá sinh viên của Khoa
  const [phanHoiSvKhoa, setPhanHoiSvKhoa] = useState(null);
  const [dangTaiPhanHoiSv, setDangTaiPhanHoiSv] = useState(false);
  /** Chốt lần tổng hợp tự động: chỉ chạy một lần cho mỗi phiếu được mở. */
  const daTuTongHop = useRef(false);

  const [moTrinh, setMoTrinh] = useState(false);
  const [dangTrinh, setDangTrinh] = useState(false);

  /** Dòng đang mở hộp thoại chọn lại mức điểm (chỉ dùng ở màn hình duyệt). */
  const [dongSuaDiem, setDongSuaDiem] = useState(null);
  /** Dòng đang được ghi điểm ở màn hình duyệt - khóa đúng thẻ đó thôi. */
  const [idDangLuu, setIdDangLuu] = useState(null);
  const [moDuyet, setMoDuyet] = useState(false);
  const [dangDuyet, setDangDuyet] = useState(false);

  const [cauHinhMc, setCauHinhMc] = useState(CAU_HINH_MC_MAC_DINH);

  // useCallback để dùng được trong deps của các hàm bên dưới; chỉ đụng ref nên ổn định.
  const showToast = useCallback((severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  }, []);

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

  // Tải cấu hình dung lượng và định dạng tệp minh chứng từ server
  useEffect(() => {
    let con = true;
    layCauHinhMinhChung().then((ch) => {
      if (con) setCauHinhMc(ch);
    });
    return () => {
      con = false;
    };
  }, []);

  /**
   * Cập nhật danh sách minh chứng của một dòng tiêu chí ngay tại chỗ.
   * Cố tình KHÔNG đổi RowVersion và KHÔNG gọi taiPhieu() để không ghi đè dữ liệu điểm đang nhập nháp.
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

  /** Bản nháp thuộc về một lớp điểm cụ thể - đổi trạng thái là phải bỏ hết. */
  useEffect(() => {
    setNhapDiem({});
    setNhapNhanXet({});
  }, [phieu?.TrangThai]);

  const soChoCham = Number(phieu?.SoTieuChiGiaoChuaCham) || 0;
  const chiTietList = useMemo(() => phieu?.ChiTiet || [], [phieu]);
  const cap = useMemo(() => capChamTheoTrangThai(phieu?.TrangThai), [phieu]);
  const quyen = useMemo(() => quyenPhieuKhoa(phieu, user), [phieu, user]);

  /** Thư ký Khoa đang ở bước nhập (trạng thái 1). */
  const coQuyenNhap = quyen.coTheNhap;
  const choPhepNhap = !readOnly && coQuyenNhap;

  /**
   * Trạng thái 2 đổi hẳn sang bố cục duyệt, KỂ CẢ với người chỉ xem: nếu chỉ đổi
   * cho riêng Trưởng đơn vị thì cùng một phiếu lại hiện hai kiểu giao diện tùy
   * người đăng nhập, khó đối chiếu khi trao đổi với nhau.
   */
  const laBuocDuyet = Number(phieu?.TrangThai) === TRANG_THAI_DV.CHO_DV_DUYET;
  const choPhepDuyet = !readOnly && quyen.coTheDuyetDv;
  const choPhepCham = !readOnly && quyen.coTheChamDuyetDv;

  /**
   * Tổng điểm tạm tính, có tính cả bản nháp đang gõ.
   *
   * Đi qua diemHieuLucCuaDong nên ở trạng thái 2 con số đã phản ánh điểm Trưởng
   * đơn vị vừa chấm đè, chứ không dừng ở điểm thư ký.
   */
  const tamTinh = useMemo(
    () => tinhTongDiemDonViTamTinh(chiTietList, nhapDiem, cap),
    [chiTietList, nhapDiem, cap],
  );

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

  /**
   * Dòng TỰ ĐỘNG vẫn rỗng sau khi đã tổng hợp.
   *
   * Không phải lỗi thao tác của thư ký mà là lỗi cấu hình: mã công thức chưa được
   * hỗ trợ, hoặc phiếu được lập trước khi tiêu chí được gán mã (`cong_thuc_snapshot`
   * chốt lúc tạo phiếu nên phiếu cũ không nhận mã mới). Vì vậy lời nhắc phải khác
   * hẳn dòng chấm tay.
   */
  const dongTuDongThieuDiem = useMemo(
    () =>
      chiTietList.filter(
        (ct) => !laDongChamTay(ct) && diemHieuLucCuaDong(ct) === null,
      ),
    [chiTietList],
  );

  /**
   * Mọi dòng chưa có điểm hiệu lực nào - dùng cho lời nhắc ở bước Trưởng đơn vị
   * duyệt, nơi không phân biệt chấm tay hay tự động: cả hai loại đều chặn bước
   * chốt của cấp Trường như nhau.
   */
  const dongThieuDiemHieuLuc = useMemo(
    () => chiTietList.filter((ct) => diemHieuLucCuaDong(ct) === null),
    [chiTietList],
  );

  const dongThieuMinhChung = useMemo(
    () =>
      chiTietList.filter(
        (ct) =>
          laDongChamTay(ct) &&
          ct.BatBuocMinhChung &&
          (!Array.isArray(ct.MinhChung) || ct.MinhChung.length === 0),
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

  // Lưu tất cả tiêu chí đã chỉnh sửa
  const handleLuuTatCa = async () => {
    if (!choPhepNhap) return false;
    const danhSachSua = chiTietList.filter((ct) => laDongChamTay(ct) && oDaSua(ct));
    if (danhSachSua.length === 0) return true;

    setDangLuuTatCa(true);
    let currentRowVersion = phieu?.RowVersion;
    let savedCount = 0;
    let hasError = false;

    try {
      for (const ct of danhSachSua) {
        const idCt = ct.IdChiTietDv;
        const { newRowVersion } = await nhapDiemChiTietDonVi(idCt, {
          diem: giaTriO(nhapDiem[idCt], ct.DiemNhap),
          nhanXet: giaTriO(nhapNhanXet[idCt], ct.NhanXetNhap),
          rowVersion: currentRowVersion,
        });

        if (newRowVersion) {
          currentRowVersion = newRowVersion;
          setPhieu((cur) => ({ ...cur, RowVersion: newRowVersion }));
        }
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
    return !hasError;
  };

  /**
   * Ghi điểm MỘT dòng ở lớp điểm của cấp duyệt, rồi ĐỌC LẠI phiếu.
   *
   * Chỉ dùng cho màn hình duyệt (trạng thái 2), nơi mỗi cú bấm ghi ngay một dòng
   * - bước nhập của thư ký vẫn gom cả lượt qua handleLuuTatCa.
   *
   * Đọc lại thay vì vá tại chỗ: ở đây không có bản nháp nào để mất, mà phần vá
   * lại phụ thuộc hoàn toàn vào việc server có trả `Item` hay không - thiếu nó
   * là thẻ đứng im sau khi bấm. Đọc lại còn kéo theo các trường server tự tính
   * (DiemChinhThuc, NgayDuyetDv).
   */
  const ghiDiemDong = async (ct, { diem, nhanXet }, thongDiepXong) => {
    if (!cap || readOnly || !duocChamDuyetDv(phieu, ct) || idDangLuu !== null) return false;
    const idCt = ct.IdChiTietDv;
    setIdDangLuu(idCt);
    try {
      const { newRowVersion } = await HAM_GHI_DIEM[cap](idCt, {
        diem,
        nhanXet,
        rowVersion: phieu?.RowVersion,
      });
      if (newRowVersion) setPhieu((cur) => ({ ...cur, RowVersion: newRowVersion }));
      await taiPhieu({ imLang: true });
      showToast("success", "Đã lưu", thongDiepXong);
      return true;
    } catch (error) {
      console.error("Lỗi lưu điểm tiêu chí đơn vị:", error);
      showToast("error", "Lưu thất bại", error.message);
      if (error.isConflict || error.isForbidden || error.status === 422) await taiPhieu({ imLang: true });
      return false;
    } finally {
      setIdDangLuu(null);
    }
  };

  /**
   * "Duyệt giữ nguyên": ghi đúng con số cấp dưới đề xuất vào lớp Trưởng đơn vị.
   * Không có endpoint duyệt-theo-dòng riêng cho phiếu đơn vị, nhưng ghi
   * diem-duyet-dv = điểm gốc cho ra đúng kết quả đó.
   *
   * Nhận xét cũ của chính lớp này được gửi lại nguyên vẹn: server ghi đè cả hai
   * cột, không gửi kèm là xóa mất ghi chú người duyệt đã viết trước đó.
   */
  const handleDuyetDong = (ct) => {
    const truong = TRUONG_DIEM_CUA_CAP[CAP_CHAM.DUYET_DV];
    const diemGoc = diemGocCuaDong(ct);
    return ghiDiemDong(
      ct,
      { diem: diemGoc, nhanXet: ct[truong.nhanXet] },
      `Đã duyệt "${ct.TenTieuChi}" giữ nguyên ${formatDiem(diemGoc)} điểm.`,
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

  useImperativeHandle(editorRef, () => ({
    dirty: soDongDaSua > 0 || !!dongSuaDiem,
    busy:
      dangLuuTatCa ||
      dangTongHop ||
      dangTrinh ||
      dangDuyet ||
      idDangLuu !== null,
    save: async () => !dongSuaDiem && handleLuuTatCa(),
  }));

  /**
   * Chạy POST phieu-don-vi/{id}/tong-hop-kpi.
   *
   * Tự chạy lúc mở phiếu và trước khi trình. Lỗi lúc mở phiếu chỉ hiện cảnh báo,
   * để thư ký vẫn xem và nhập được điểm; bước trình sẽ thử tổng hợp lại.
   *
   * @returns {object|null} phiếu mới sau khi tổng hợp, null nếu lỗi
   */
  const chayTongHop = useCallback(
    async () => {
      if (!choPhepNhap) return null;
      setDangTongHop(true);
      try {
        // Không gửi baoGomDonViCon: để server áp mặc định (true - gom cả cây đơn vị)
        const { item, tongHop: ketQua } = await tongHopKpiDonVi(id);
        setTongHop(ketQua);
        setLoiTongHop("");
        // POST đổi RowVersion nhưng API hiện chỉ trả TongHop (Item = null).
        // Đọc lại phiếu để lần trình tiếp theo dùng đúng phiên bản mới.
        const phieuMoi = item || (await taiPhieu({ imLang: true }));
        if (!phieuMoi?.RowVersion) {
          throw new Error(
            "Không tải được phiên bản phiếu sau khi tổng hợp. Vui lòng thử lại.",
          );
        }
        if (item) setPhieu(item);
        return phieuMoi;
      } catch (error) {
        console.error("Lỗi tổng hợp KPI thành viên:", error);
        setLoiTongHop(error.message);
        if (error.isConflict || error.isForbidden || error.status === 422) await taiPhieu({ imLang: true });
        return null;
      } finally {
        setDangTongHop(false);
      }
    },
    [id, taiPhieu, choPhepNhap],
  );

  // Đổi sang phiếu khác thì cho phép tổng hợp tự động lại từ đầu
  useEffect(() => {
    daTuTongHop.current = false;
    setTongHop(null);
    setLoiTongHop("");
    setDiemTruKhoa(null);
    setPhanHoiSvKhoa(null);
  }, [id]);

  /**
   * Tổng hợp TỰ ĐỘNG ngay khi mở phiếu.
   *
   * VÌ SAO: điểm của dòng `LoaiNguonDiem = 2` cần được cập nhật trước khi thư
   * ký trình phiếu. Tiêu chí DIEM_TRU_TAP_THE (mức TUÂN THỦ, thường 7,5đ): Khoa
   * không vi phạm mà vẫn bị 0 vì chưa ai tổng hợp.
   *
   * Endpoint idempotent và chỉ ghi dòng tự động, không đụng `diem_nhap`, nên chạy
   * lại vô hại. Vẫn chốt bằng ref để một lần mở phiếu chỉ POST một lần.
   */
  useEffect(() => {
    if (!phieu || daTuTongHop.current) return;
    // Đi thẳng từ phiếu này sang phiếu khác thì `id` đổi trước khi phiếu mới tải
    // xong: chặn lại, đừng POST lên phiếu mới bằng trạng thái của phiếu cũ.
    if (String(phieu.IdPhieuDv) !== String(id)) return;
    // Chỉ trạng thái 1: từ trạng thái 2 phiếu đã khóa với thư ký, không tự ghi đè
    // điểm của phiếu đang chờ duyệt.
    if (!choPhepNhap) return;
    // Phiếu toàn tiêu chí chấm tay thì không có gì để tổng hợp
    if (!chiTietList.some((ct) => !laDongChamTay(ct))) return;

    daTuTongHop.current = true;
    chayTongHop();
  }, [id, phieu, chiTietList, chayTongHop, choPhepNhap]);

  /**
   * Số liệu điểm trừ tập thể, đọc riêng bằng GET vi-pham/diem-tru-khoa.
   *
   * Khối `TongHop` chỉ có trong response của POST tong-hop-kpi nên tải lại trang
   * là mất. Endpoint này đọc CÙNG hàm `fn_diem_tru_tap_the_khoa` (docs/schema_ghi_chu.md
   * §3.2) nên số liệu khớp tuyệt đối, mà không phải POST ghi đè DB chỉ để xem.
   *
   * Chỉ gọi khi phiếu thật sự có tiêu chí dùng mã đó - `PhieuDanhGiaDonViDto`
   * không trả `MaDonVi` nên không dùng được `laDonViPhongTrungTam`, và mã công
   * thức trên chính phiếu là điều kiện chính xác hơn mã đơn vị.
   */
  useEffect(() => {
    if (!phieu?.IdNam || !phieu?.IdDonVi) return;
    // Phiếu cũ còn trong state khi vừa đổi id: đừng hiện số của đơn vị khác
    if (String(phieu.IdPhieuDv) !== String(id)) return;
    if (!coTieuChiDiemTruTapThe(chiTietList)) return;

    let huy = false;
    fetchDiemTruKhoa({ idNam: phieu.IdNam, idDonVi: phieu.IdDonVi })
      .then((dong) => {
        if (!huy) setDiemTruKhoa(dong);
      })
      .catch((error) => {
        // Số liệu diễn giải, hỏng thì thôi - không được làm chết màn hình chấm điểm
        console.error("Lỗi tải điểm trừ tập thể của Khoa:", error);
      });
    return () => {
      huy = true;
    };
  }, [id, phieu?.IdPhieuDv, phieu?.IdNam, phieu?.IdDonVi, chiTietList]);

  /**
   * Tải số liệu điểm đánh giá của sinh viên (toàn Khoa).
   *
   * Endpoint `GET api/diem-tb-phan-hoi-sv?idNam={idNam}` trả về kết quả chốt
   * điểm khảo sát sinh viên của năm học. Kết hợp với danh mục đơn vị để lọc
   * các giảng viên thuộc Khoa (+ các bộ môn trực thuộc) và tính điểm trung bình
   * có trọng số của Khoa theo đúng mô tả nghiệp vụ trong docs/schema_ghi_chu.md.
   */
  useEffect(() => {
    if (!phieu?.IdNam || !phieu?.IdDonVi) return;
    if (String(phieu.IdPhieuDv) !== String(id)) return;
    if (!coTieuChiDanhGiaSinhVien(chiTietList)) return;

    let huy = false;
    setDangTaiPhanHoiSv(true);

    Promise.all([
      fetchDiemPhanHoiSv(phieu.IdNam).catch((err) => {
        console.error("Lỗi tải điểm phản hồi sinh viên:", err);
        return { dotChot: null, items: [] };
      }),
      fetchDonViList().catch(() => []),
    ])
      .then(([{ dotChot, items }, donViList]) => {
        if (huy) return;
        const thongKe = tinhThongKePhanHoiKhoa({
          items,
          idDonVi: phieu.IdDonVi,
          donViList,
          dotChot,
        });
        setPhanHoiSvKhoa(thongKe);
      })
      .catch((error) => {
        console.error("Lỗi xử lý thống kê đánh giá sinh viên của Khoa:", error);
      })
      .finally(() => {
        if (!huy) setDangTaiPhanHoiSv(false);
      });

    return () => {
      huy = true;
    };
  }, [id, phieu?.IdPhieuDv, phieu?.IdNam, phieu?.IdDonVi, chiTietList]);

  const handleTrinh = async ({ lyDo }) => {
    if (!choPhepNhap) return;
    setDangTrinh(true);
    try {
      // Tổng hợp lại lần cuối: phiếu cá nhân của thành viên có thể đã đổi kể từ
      // lúc mở màn hình, và sau bước này thư ký hết sửa được điểm.
      let rowVersion = phieu?.RowVersion;
      if (chiTietList.some((ct) => !laDongChamTay(ct))) {
        const sauTongHop = await chayTongHop();
        if (!sauTongHop) {
          // Thà không nộp còn hơn nộp phiếu mang điểm tự động cũ
          setMoTrinh(false);
          showToast(
            "error",
            "Chưa trình được phiếu",
            "Không tổng hợp lại được điểm tự động nên phiếu chưa được trình. Vui lòng thử lại.",
            6000,
          );
          return;
        }
        // POST tổng hợp vừa làm đổi RowVersion của phiếu: dùng lại giá trị cũ là 409
        rowVersion = sauTongHop.RowVersion ?? rowVersion;
      }

      const item = await trinhPhieuDonVi(id, {
        nhanXet: lyDo,
        rowVersion,
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
      if (error.isConflict || error.isForbidden || error.status === 422) await taiPhieu({ imLang: true });
    } finally {
      setDangTrinh(false);
    }
  };

  /**
   * Trưởng đơn vị duyệt CẢ PHIẾU (2 → 3).
   *
   * Không đòi phải chấm hết từng dòng: dòng nào trưởng đơn vị không đụng tới thì
   * điểm thư ký vẫn là điểm hiệu lực (xem diemHieuLucCuaDong), nên duyệt sớm
   * không làm mất điểm. Chỉ nhắc khi còn dòng CHƯA CÓ ĐIỂM NÀO - bước chốt của
   * cấp Trường sẽ bị chặn vì chúng.
   */
  const handleDuyet = async ({ lyDo }) => {
    if (!choPhepDuyet || soChoCham > 0 || idDangLuu !== null) return;
    setDangDuyet(true);
    try {
      const item = await duyetDvPhieuDonVi(id, {
        nhanXet: lyDo,
        rowVersion: phieu?.RowVersion,
      });
      setMoDuyet(false);
      if (item) setPhieu(item);
      else await taiPhieu({ imLang: true });
      showToast(
        "success",
        "Đã duyệt",
        "Phiếu đã chuyển sang chờ cấp Trường duyệt.",
        5000,
      );
    } catch (error) {
      console.error("Lỗi duyệt phiếu KPI đơn vị:", error);
      showToast("error", "Duyệt phiếu thất bại", error.message);
      setMoDuyet(false);
      if (error.isConflict || error.isForbidden || error.status === 422) await taiPhieu({ imLang: true });
    } finally {
      setDangDuyet(false);
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
              onClick={() => navigate(backTo)}
            >
              <i className="fa-solid fa-arrow-left"></i> Về danh sách phiếu đơn
              vị
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Nút thao tác của MÀN HÌNH DUYỆT, đặt ở page-header.
   *
   * Không dùng lại headerActions bên dưới: bộ nút đó mang các lớp .btn-nop-phieu
   * / .btn-luu-nhap, mà kích thước và bo góc của chúng được khai trong selector
   * con `.pl2-header-actions button` của DanhGiaPhuLuc2.css. Ra khỏi wrapper đó
   * thì nút co lại thành một mẩu chữ dính sát viền.
   */
  const duyetActions = choPhepDuyet ? (
    <button
      type="button"
      className="btn-submit"
      disabled={dangDuyet || idDangLuu !== null || soChoCham > 0}
      onClick={() => setMoDuyet(true)}
    >
      <i className="fa-solid fa-user-check"></i> Duyệt phiếu
    </button>
  ) : null;

  // Khối hành động trên header
  const headerActions = readOnly ? null : choPhepNhap ? (
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
        disabled={soDongDaSua === 0 || dangLuuTatCa}
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
        className="btn-nop-phieu"
        disabled={dangTrinh || dangLuuTatCa || dangTongHop}
        onClick={() => setMoTrinh(true)}
      >
        <i className="fa-solid fa-paper-plane"></i> Trình Trưởng đơn vị
      </button>
    </div>
  ) : (
    /*
      Người không có phần việc nào ở trạng thái hiện tại - lấy thẳng nhãn và
      icon từ TRANG_THAI_DV_META. Trước đây khối này liệt kê tay từng trạng
      thái và rơi về "Đã hoàn tất" cho mọi giá trị còn lại; từ khi TK/TKL vào
      được màn hình, trạng thái 1 (thư ký đang nhập) cũng đi qua đây và nhãn
      chép tay đó nói sai hẳn tình trạng phiếu.
    */
    <div className="pl2-approved pl2-waiting">
      <i
        className={`fa-solid ${TRANG_THAI_DV_META[Number(phieu.TrangThai)]?.icon || "fa-circle-info"}`}
      ></i>{" "}
      {tenTrangThaiDonVi(Number(phieu.TrangThai))}
    </div>
  );

  return (
    <div className={embedded ? "" : "page-container"}>
      <Toast ref={toast} position="top-right" />

      {readOnly && <LichSuPhieuDonViHeader phieu={phieu} loai="khoa" coTheDanhGia={coQuyenNhap} />}

      {/* Tiêu đề & Breadcrumb & Badge */}
      <div className="page-header">
        {!embedded && <button
          className="cd-link-btn"
          style={{ marginBottom: "8px" }}
          onClick={() => navigate(backTo)}
        >
          <i className="fa-solid fa-arrow-left"></i> {readOnly ? "Lịch sử đánh giá KPI Khoa" : "Đánh giá KPI Khoa"}
        </button>}

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

      {Number(phieu.TrangThai) === 2 && soChoCham > 0 && (
        <div className="cd-hint cd-hint-warn" role="alert">
          Còn {soChoCham} tiêu chí chờ đơn vị được giao chấm
        </div>
      )}

      {/* Trạng thái 2: bố cục duyệt; các trạng thái khác: form kê khai */}
      {laBuocDuyet ? (
        <DuyetDonViForm
          readOnly={readOnly}
          phieu={phieu}
          chiTietList={chiTietList}
          sections={sections}
          tieuChiMap={tieuChiMap}
          choPhepNhap={choPhepCham}
          lyDoKhoa={
            readOnly
              ? "Bạn đang xem lịch sử đánh giá (chỉ đọc)."
              : quyen.laCapTruong
                ? "Phiếu đang chờ Trưởng đơn vị duyệt; cấp Trường chấm ở bước sau."
                : "Bạn không phải Trưởng đơn vị của đơn vị này nên chỉ xem được."
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
      <DanhGiaDonViForm
        phieu={phieu}
        chiTietList={chiTietList}
        sections={sections}
        tieuChiMap={tieuChiMap}
        nhapDiem={nhapDiem}
        nhapNhanXet={nhapNhanXet}
        choPhepNhap={choPhepNhap}
        dangLuu={dangLuuTatCa}
        onDiemChange={handleDiemChange}
        onNhanXetChange={handleNhanXetChange}
        oDaSua={oDaSua}
        hanhDong={headerActions}
        tamTinh={tamTinh}
        tongHop={tongHop}
        diemTruKhoa={diemTruKhoa}
        phanHoiSvKhoa={phanHoiSvKhoa}
        dangTaiPhanHoiSv={dangTaiPhanHoiSv}
        loiTongHop={loiTongHop}
        cauHinhMc={cauHinhMc}
        choPhepSuaMinhChung={choPhepNhap}
        onMinhChungChange={handleMinhChungChange}
        onXemMinhChung={openPreview}
        onTaiMinhChung={downloadMinhChung}
        onLoiMinhChung={baoLoiMc}
        onOkMinhChung={baoOkMc}
      />
      )}

      {/* Hộp thoại chọn lại mức điểm của màn hình duyệt */}
      {dongSuaDiem && (
        <SuaDiemDonViModal
          chiTiet={dongSuaDiem}
          thangDiem={tieuChiMap?.get(Number(dongSuaDiem.IdTieuChi))}
          nhanTruong={NHAN_CAP_CHAM_KHOA[CAP_CHAM.DUYET_DV]}
          dangGui={idDangLuu === dongSuaDiem.IdChiTietDv}
          onDong={() => setDongSuaDiem(null)}
          onXacNhan={handleSuaDiemDong}
        />
      )}

      {/* Modal xác nhận duyệt phiếu (2 → 3) */}
      {moDuyet && (
        <LyDoModal
          tieuDe="Duyệt phiếu và chuyển lên cấp Trường"
          moTa="Điểm bạn chấm ở lớp Trưởng đơn vị sẽ được ghi nhận và phiếu chuyển sang chờ cấp Trường duyệt. Luồng đơn vị không có thao tác trả phiếu về, nên sau bước này bạn không sửa được điểm nữa."
          nhanLyDo="Nhận xét / Ý kiến kèm theo"
          batBuocLyDo={false}
          nhanXacNhan="Duyệt phiếu"
          iconXacNhan="fa-user-check"
          dangGui={dangDuyet}
          onDong={() => setMoDuyet(false)}
          onXacNhan={handleDuyet}
        >
          {dongThieuDiemHieuLuc.length > 0 && (
            <div
              className="cd-hint cd-hint-warn"
              style={{ marginBottom: "12px" }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i> Còn{" "}
              <b>{dongThieuDiemHieuLuc.length}</b> tiêu chí chưa có điểm nào.
              Cấp Trường sẽ nhận phiếu chưa đầy đủ, và bước chốt bị chặn cho tới
              khi mọi tiêu chí có điểm.
            </div>
          )}
        </LyDoModal>
      )}

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

          {dongTuDongThieuDiem.length > 0 && (
            <div
              className="cd-hint cd-hint-warn"
              style={{ marginBottom: "12px" }}
            >
              <i className="fa-solid fa-robot"></i> Có{" "}
              <b>{dongTuDongThieuDiem.length}</b> tiêu chí tự động chưa có điểm
              sau khi tổng hợp. Thường do mã công thức của tiêu chí chưa được hỗ
              trợ, hoặc phiếu được lập trước khi tiêu chí được gán mã (khi đó
              phải lập lại phiếu). Nên liên hệ quản trị trước khi trình.
            </div>
          )}

          {dongThieuMinhChung.length > 0 && (
            <div
              className="cd-hint cd-hint-warn"
              style={{ marginBottom: "12px" }}
            >
              <i className="fa-solid fa-paperclip"></i> Có{" "}
              <b>{dongThieuMinhChung.length}</b> tiêu chí yêu cầu minh chứng
              nhưng chưa được đính kèm tệp.
            </div>
          )}
        </LyDoModal>
      )}

      {/* Modal xem trước tệp minh chứng */}
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

export default ChiTietPhieuDonVi;
