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
import "../../css/DanhGia/DanhGiaKpiDonVi.css";
import {
  fetchDiemPhanHoiSv,
  fetchTieuChiTheoMau,
} from "../../utils/phieuApi";
import { fetchDonViList } from "../../utils/donViApi";
import {
  CAU_HINH_MC_MAC_DINH,
  layCauHinhMinhChung,
} from "../../utils/minhChungDonViApi";
import { useMinhChungDonViPreview } from "../../hooks/useMinhChungDonViPreview";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import {
  coTieuChiDanhGiaSinhVien,
  coTieuChiDiemTruTapThe,
  diemHieuLucCuaDong,
  fetchPhieuDonViDetail,
  laDongChamTay,
  nhapDiemChiTietDonVi,
  suaDuocPhieu,
  tinhThongKePhanHoiKhoa,
  tongHopKpiDonVi,
  trinhPhieuDonVi,
  TRANG_THAI_DV,
} from "../../utils/phieuDonViApi";
import { fetchDiemTruKhoa } from "../../utils/viPhamTongHopApi";
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

  /**
   * Chạy POST phieu-don-vi/{id}/tong-hop-kpi.
   *
   * `imLang` dành cho lần chạy tự động lúc mở phiếu: không báo thành công (người
   * dùng không bấm gì thì đừng bắn toast), và lỗi chỉ hạ xuống banner cảnh báo
   * chứ không được làm hỏng màn hình - thư ký vẫn còn nút bấm tay.
   *
   * @returns {object|null} phiếu mới sau khi tổng hợp, null nếu lỗi
   */
  const chayTongHop = useCallback(
    async ({ imLang = false } = {}) => {
      setDangTongHop(true);
      try {
        // Không gửi baoGomDonViCon: để server áp mặc định (true - gom cả cây đơn vị)
        const { item, tongHop: ketQua } = await tongHopKpiDonVi(id);
        setTongHop(ketQua);
        setLoiTongHop("");
        // Phải dùng phiếu của response: POST làm đổi RowVersion của phiếu cha,
        // giữ state cũ là ăn 409 ở thao tác kế tiếp.
        if (item) setPhieu(item);
        else await taiPhieu({ imLang: true });
        if (!imLang) {
          showToast(
            "success",
            "Đã tổng hợp",
            "Điểm của các tiêu chí tự động đã được cập nhật theo KPI thành viên.",
          );
        }
        return item;
      } catch (error) {
        console.error("Lỗi tổng hợp KPI thành viên:", error);
        setLoiTongHop(error.message);
        if (!imLang) showToast("error", "Tổng hợp thất bại", error.message);
        if (error.isConflict) await taiPhieu({ imLang: true });
        return null;
      } finally {
        setDangTongHop(false);
      }
    },
    [id, taiPhieu, showToast],
  );

  const handleTongHop = () => chayTongHop();

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
   * VÌ SAO: trước đây điểm của dòng `LoaiNguonDiem = 2` chỉ được cập nhật khi thư
   * ký nhớ bấm "Tổng hợp KPI". Quên bấm là phiếu lên Trưởng khoa với điểm rỗng -
   * nặng nhất là tiêu chí DIEM_TRU_TAP_THE (mức TUÂN THỦ, thường 7,5đ): Khoa
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
    if (!suaDuocPhieu(phieu)) return;
    // Phiếu toàn tiêu chí chấm tay thì không có gì để tổng hợp
    if (!chiTietList.some((ct) => !laDongChamTay(ct))) return;

    daTuTongHop.current = true;
    chayTongHop({ imLang: true });
  }, [id, phieu, chiTietList, chayTongHop]);

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
    setDangTrinh(true);
    try {
      // Tổng hợp lại lần cuối: phiếu cá nhân của thành viên có thể đã đổi kể từ
      // lúc mở màn hình, và sau bước này thư ký hết sửa được điểm.
      let rowVersion = phieu?.RowVersion;
      if (chiTietList.some((ct) => !laDongChamTay(ct))) {
        const sauTongHop = await chayTongHop({ imLang: true });
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
