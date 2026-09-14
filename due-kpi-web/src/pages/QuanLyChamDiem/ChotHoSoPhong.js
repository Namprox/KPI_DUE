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
import { useAuth } from "../../context/AuthContext";
import {
  fetchLichSuChamDiemPhieu,
  fetchPhieuDetail,
  fetchTieuChiTheoMau,
  fetchXemTruocChot,
  formatDiem,
  formatNgayGio,
  gomLichSuTheoChiTiet,
  khoaDuyetHoSo,
  LOAI_DOI_TUONG,
  tinhTongDiemTamTinh,
  tinhXepLoaiGoiY,
  TRANG_THAI,
  TRANG_THAI_DONG,
  XEP_LOAI_META,
} from "../../utils/phieuApi";
import { laTruongPhongCuaPhieu } from "../../utils/phieuChamPermissions";
import {
  thongTinNhanVien,
  useNhanVienIndex,
} from "../../hooks/useNhanVienIndex";
import { useMinhChungPhieuPreview } from "../../hooks/useMinhChungPhieuPreview";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import TieuChiChamCard from "../../components/QuanLyChamDiem/TieuChiChamCard";
import {
  TrangThaiBadge,
  XepLoaiBadge,
  XepLoaiKhoaBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";

/** Trần xếp loại cứng của viên chức / NLĐ - server chặn bằng 409 VUOT_MUC_VIEN_CHUC. */
const TRAN_MUC_VIEN_CHUC = 2;

/** Chờ người dùng ngừng bấm trước khi hỏi lại server (ms). */
const TRE_XEM_TRUOC = 350;

const DUONG_DAN_DANH_SACH = "/quan-ly/ho-so-nhan-vien";

/**
 * Giai đoạn 3 - Trưởng phòng chốt hồ sơ KPI của NHÂN VIÊN / VIÊN CHỨC và CHỌN TAY
 * xếp loại.
 *
 * Song song với ChotHoSoKhoa.js (cùng endpoint POST phieu/{id}/khoa/duyet-ho-so,
 * server mở cho cả TK/TKL/TP) nhưng là màn hình RIÊNG, và các nhánh giảng viên bị
 * CẮT HẲN chứ không rẽ theo cờ lúc chạy. Bốn thứ không tồn tại ở đây:
 *   - QĐ 838: server ép null với viên chức, `BatBuocQd838` luôn false.
 *   - Định mức giờ NCKH: viên chức không có, không gọi fetchDinhMucApDung.
 *   - Mức 3 và mức 4: trần cứng là mức 2 (Hoàn thành nhiệm vụ).
 *   - Hạn ngạch xuất sắc 20%: viên chức KHÔNG vào mẫu số của Khoa, không tranh suất.
 *
 * NGUỒN SỐ LIỆU: GET phieu/{id}/xem-truoc-chot, không phải phép tính ở client.
 * Ba cột tong_diem_* và xep_loai_de_xuat chỉ được server ghi TRONG giao dịch chốt
 * nên GET phieu/{id} trả null cho cả bốn - mà đây lại là màn hình đứng ngay trước
 * cái nút chốt đó. Endpoint dry-run trả đúng những con số sẽ được lưu, kèm
 * `CacMucChonDuoc` (tập mức hợp lệ) và `SanSangChot`. tinhTongDiemTamTinh /
 * tinhXepLoaiGoiY chỉ còn là ĐƯỜNG LÙI khi lời gọi đó hỏng, và khi đó màn hình
 * phải nói rõ số đang hiện là tạm tính.
 *
 * KHÔNG NÂNG XẾP LOẠI ĐƯỢC ở bước này (400 CAM_NANG_XEP_LOAI): `CacMucChonDuoc` =
 * 1..XepLoaiDeXuat, nên "chọn khác mức đề xuất" giờ chỉ còn một nghĩa là HẠ mức.
 *
 * Chốt là điểm không quay đầu với Trưởng phòng: chỉ Hiệu trưởng gọi được
 * phieu/{id}/mo-lai. Bắt buộc hộp xác nhận và phải nói thẳng hệ quả đó.
 *
 * ADMIN xem được nhưng laTruongPhongCuaPhieu() trả false nên panel chốt ẩn - trang
 * chạy ở chế độ CHỈ XEM. Có chủ đích, xem ROLE_SETS.DUYET_HO_SO_NHAN_VIEN.
 *
 * Thẩm định / sửa điểm từng tiêu chí KHÔNG làm ở đây mà ở /quan-ly/phieu/:id.
 */
const ChotHoSoPhong = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const { user } = useAuth();
  const { nhanVienIndex } = useNhanVienIndex();

  const [phieu, setPhieu] = useState(null);
  // Map IdTieuChi -> { loaiNhom } của mẫu: nguồn DUY NHẤT để biết tiêu chí thuộc
  // Nhóm A hay Nhóm B, vì ChiTietDanhGiaDto không trả loai_nhom. Chỉ cần cho
  // đường lùi tinhTongDiemTamTinh().
  const [tieuChiMauMap, setTieuChiMauMap] = useState(new Map());
  const [lichSuItems, setLichSuItems] = useState([]);
  const [dangTaiLichSu, setDangTaiLichSu] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewLoi, setPreviewLoi] = useState("");
  const [lanTaiLai, setLanTaiLai] = useState(0);

  const [dangChot, setDangChot] = useState(false);
  const [xacNhanChot, setXacNhanChot] = useState(false);
  const [thieuTieuChi, setThieuTieuChi] = useState(null);

  const [form, setForm] = useState({
    xepLoaiKhoa: null,
    lyDoXepLoai: "",
    khongViPhamPhapLuat: true,
    ghiChuXepLoai: "",
    nhanXet: "",
  });
  // Lỗi gắn vào ĐÚNG ô gây ra nó. `chung` chỉ dành cho lỗi không quy được về ô nào.
  const [loiForm, setLoiForm] = useState({});
  const lyDoRef = useRef(null);
  // Người dùng đã gõ gì chưa - quyết định có được phép nạp đè form từ server không.
  const daSuaForm = useRef(false);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const { preview: mcPreview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungPhieuPreview((message) => showToast("error", "Lỗi", message));

  const taiPhieu = useCallback(
    async ({ imLang = false } = {}) => {
      if (!imLang) setIsLoading(true);
      try {
        const item = await fetchPhieuDetail(id);
        if (!item) {
          setLoiTai(
            "Không tìm thấy hồ sơ này, hoặc hồ sơ nằm ngoài phạm vi bạn được xem.",
          );
          setPhieu(null);
          return null;
        }
        setPhieu(item);
        setLoiTai("");
        return item;
      } catch (error) {
        console.error("Lỗi tải hồ sơ:", error);
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

  const taiLichSu = useCallback(async () => {
    setDangTaiLichSu(true);
    try {
      setLichSuItems(await fetchLichSuChamDiemPhieu(id));
    } catch (error) {
      console.error("Lỗi tải lịch sử chấm điểm:", error);
      setLichSuItems([]);
    } finally {
      setDangTaiLichSu(false);
    }
  }, [id]);

  useEffect(() => {
    taiLichSu();
  }, [taiLichSu]);

  useEffect(() => {
    if (!phieu?.IdMau) return undefined;
    let huy = false;
    fetchTieuChiTheoMau(phieu.IdMau)
      .then((map) => {
        if (!huy) setTieuChiMauMap(map);
      })
      .catch((error) => console.error("Lỗi tải chi tiết mẫu đánh giá:", error));
    return () => {
      huy = true;
    };
  }, [phieu?.IdMau]);

  /**
   * Hỏi lại server mỗi khi người dùng đổi điều kiện kết luận.
   *
   * Endpoint yêu cầu gọi lại để con số trên màn hình TRÙNG con số lúc chốt - tự
   * tính ở client sẽ tái tạo đúng sai lệch mà endpoint này sinh ra để dập. Với
   * viên chức, `khongViPhamPhapLuat` là ô duy nhất còn lại nên chi phí rất nhỏ.
   *
   * `duNckh` / `qd838` CỐ Ý bỏ trống: viên chức không có hai điều kiện đó và
   * server ép null. Gửi lên chỉ tạo ảo giác là chúng có tác dụng.
   *
   * phienBanRef chặn response cũ (về muộn) ghi đè response mới.
   */
  const phienBanRef = useRef(0);
  useEffect(() => {
    if (!id) return undefined;
    const phienBan = ++phienBanRef.current;
    const timer = setTimeout(async () => {
      try {
        const kq = await fetchXemTruocChot(id, {
          khongViPham: form.khongViPhamPhapLuat,
        });
        if (phienBan !== phienBanRef.current) return;
        setPreview(kq);
        setPreviewLoi("");
      } catch (error) {
        if (phienBan !== phienBanRef.current) return;
        console.error("Lỗi xem trước kết quả chốt:", error);
        setPreview(null);
        setPreviewLoi(error.message);
      }
    }, TRE_XEM_TRUOC);
    return () => clearTimeout(timer);
  }, [id, form.khongViPhamPhapLuat, lanTaiLai]);

  const chiTietList = useMemo(() => phieu?.ChiTiet || [], [phieu]);
  const lichSuTheoChiTiet = useMemo(
    () => gomLichSuTheoChiTiet(lichSuItems),
    [lichSuItems],
  );
  const nv = thongTinNhanVien(nhanVienIndex, phieu?.IdNhanVien);

  const chuaChot = useMemo(
    () =>
      chiTietList.filter(
        (ct) => Number(ct.TrangThaiDong) !== TRANG_THAI_DONG.DA_CHOT,
      ),
    [chiTietList],
  );
  const soDaChot = chiTietList.length - chuaChot.length;

  /**
   * Loại đối tượng - PhieuDanhGiaChiTietDto KHÔNG khai trường này nên
   * fetchPhieuDetail có thể trả undefined; xem-truoc-chot mới là nguồn chuẩn.
   *
   * Mặc định cuối cùng là VIEN_CHUC, và nó an toàn RIÊNG ở trang này: trang chỉ
   * tới được từ hàng đợi của một Phòng, mà phiếu ở Phòng luôn mang
   * loai_doi_tuong = 2 (suy từ ĐƠN VỊ, không từ chức danh - xem schema_ghi_chu).
   */
  const laVienChuc =
    Number(
      preview?.LoaiDoiTuong ?? phieu?.LoaiDoiTuong ?? LOAI_DOI_TUONG.VIEN_CHUC,
    ) === LOAI_DOI_TUONG.VIEN_CHUC;

  // Mở nhầm hồ sơ giảng viên ở đây là lỗi điều hướng, không phải lỗi người dùng.
  useEffect(() => {
    if (preview?.BatBuocQd838 === true) {
      console.error(
        "[ChotHoSoPhong] Hồ sơ này bắt buộc ghi nhận QĐ 838 (giảng viên) nhưng màn hình Phòng không có ô đó. Có lỗi điều hướng - hồ sơ nên mở ở /quan-ly/duyet-ho-so.",
        preview,
      );
    }
  }, [preview]);

  // Đường lùi khi xem-truoc-chot hỏng. Chỉ dùng khi previewLoi có giá trị.
  const tamTinh = useMemo(
    () => tinhTongDiemTamTinh(chiTietList, tieuChiMauMap),
    [chiTietList, tieuChiMauMap],
  );
  const mucGoiYCuc = useMemo(
    () =>
      tinhXepLoaiGoiY({
        tichLuy: tamTinh?.tichLuy,
        // Viên chức không dính QĐ 838, và không có định mức NCKH để phủ quyết.
        canQd838: false,
        duDinhMucGioNckh: true,
        khongViPhamPhapLuat: form.khongViPhamPhapLuat,
        tranMuc: TRAN_MUC_VIEN_CHUC,
      }),
    [tamTinh, form.khongViPhamPhapLuat],
  );

  const dungDuongLui = !preview;

  const diem = dungDuongLui
    ? {
        coBan: tamTinh?.coBan ?? null,
        vuotTroi: tamTinh?.vuotTroi ?? null,
        tichLuy: tamTinh?.tichLuy ?? null,
      }
    : {
        coBan: preview.TongDiemCoBan,
        vuotTroi: preview.TongDiemVuotTroi,
        tichLuy: preview.TongDiemTichLuy,
      };
  const tichLuyHienCo = diem.tichLuy;

  const mucDoiChieu = dungDuongLui
    ? mucGoiYCuc
    : (preview.XepLoaiDeXuat ?? mucGoiYCuc);
  const tenMucDoiChieu =
    (!dungDuongLui && preview.XepLoaiDeXuatText) ||
    (mucDoiChieu != null ? XEP_LOAI_META[mucDoiChieu]?.label : null);

  /**
   * Tập mức được phép chọn.
   *
   * Nguồn chuẩn là CacMucChonDuoc (= 1..XepLoaiDeXuat, không bao giờ có mức 4).
   * Kẹp thêm trần 2 là BẢO HIỂM: spec không hứa XepLoaiDeXuat đã áp trần viên
   * chức ngay trong xem-truoc-chot (trần chắc chắn có trong sp_phieu_khoa_duyet_
   * ho_so). Render mức 3 rồi ăn 409 VUOT_MUC_VIEN_CHUC là lỗi giao diện, không
   * phải lỗi thao tác. Nếu server cũng kẹp thì filter này thành no-op vô hại.
   */
  const mucChonDuoc = useMemo(() => {
    const tran = laVienChuc ? TRAN_MUC_VIEN_CHUC : 3;
    const nguon =
      !dungDuongLui && preview.CacMucChonDuoc?.length
        ? preview.CacMucChonDuoc
        : mucGoiYCuc != null
          ? [1, 2].filter((m) => m <= mucGoiYCuc)
          : [1, 2];
    return nguon.map(Number).filter((m) => m >= 1 && m <= tran);
  }, [dungDuongLui, preview, mucGoiYCuc, laVienChuc]);

  const coQuyenChot =
    laTruongPhongCuaPhieu(user, phieu) &&
    Number(phieu?.TrangThai) === TRANG_THAI.CHO_TK_DUYET;

  const lechDeXuat =
    form.xepLoaiKhoa != null &&
    mucDoiChieu != null &&
    Number(form.xepLoaiKhoa) !== Number(mucDoiChieu);

  // Server là gate thật; ở đường lùi ta chỉ có thông tin cấp dòng để đoán.
  const sanSangChot = dungDuongLui
    ? chuaChot.length === 0
    : !!preview.SanSangChot;

  // useMemo để giữ tham chiếu ổn định - nó là dependency của idChiTietThieu, một
  // mảng mới mỗi lần render sẽ làm effect cuộn trang chạy lại liên tục.
  const dongChuaChotServer = useMemo(
    () => (!dungDuongLui && preview.DongChuaChot) || [],
    [dungDuongLui, preview],
  );

  // Nạp form từ dữ liệu server mỗi khi hồ sơ được tải lại. Nhưng KHÔNG nạp đè khi
  // người dùng đã gõ: 409 làm màn hình tự tải lại phiếu, nạp đè ở đó là xóa trắng
  // lý do vừa viết - đúng thứ họ sẽ phải viết lại.
  useEffect(() => {
    if (!phieu || daSuaForm.current) return;
    setForm({
      xepLoaiKhoa:
        phieu.XepLoaiKhoa ??
        (phieu.XepLoaiDeXuat != null
          ? Math.min(Number(phieu.XepLoaiDeXuat), TRAN_MUC_VIEN_CHUC)
          : null),
      lyDoXepLoai: phieu.LyDoXepLoai || "",
      khongViPhamPhapLuat: phieu.KhongViPhamPhapLuat ?? true,
      ghiChuXepLoai: phieu.GhiChuXepLoai || "",
      nhanXet: "",
    });
    setLoiForm({});
  }, [phieu]);

  // Bỏ tick điều kiện có thể kéo trần xuống dưới mức đang chọn - hạ theo ngay,
  // nếu không form sẽ giữ một mức đã bị khóa ngay bên cạnh.
  const mucToiDaChon = mucChonDuoc.length
    ? Math.max(...mucChonDuoc)
    : TRAN_MUC_VIEN_CHUC;
  useEffect(() => {
    if (form.xepLoaiKhoa != null && Number(form.xepLoaiKhoa) > mucToiDaChon) {
      setForm((truoc) => ({ ...truoc, xepLoaiKhoa: mucToiDaChon }));
    }
  }, [mucToiDaChon, form.xepLoaiKhoa]);

  const capNhat = (patch) => {
    daSuaForm.current = true;
    setForm((truoc) => ({ ...truoc, ...patch }));
    setLoiForm((truoc) => {
      const con = { ...truoc };
      Object.keys(patch).forEach((k) => delete con[k]);
      delete con.chung;
      return con;
    });
  };

  // Dòng server chỉ đích danh trong 422, hoặc trong DongChuaChot của xem-truoc-chot.
  // Cả hai cùng shape PhieuSubmitMissingItemDto và chỉ chắc chắn có idTieuChi, nên
  // phải dò ngược về IdChiTiet để tô đúng thẻ.
  const idChiTietThieu = useMemo(() => {
    const set = new Set();
    (thieuTieuChi || dongChuaChotServer || []).forEach((m) => {
      const idCt = m.idChiTiet ?? m.IdChiTiet;
      if (idCt != null) return set.add(Number(idCt));
      const idTc = m.idTieuChi ?? m.IdTieuChi;
      const dong = chiTietList.find(
        (ct) => Number(ct.IdTieuChi) === Number(idTc),
      );
      if (dong) set.add(Number(dong.IdChiTiet));
    });
    return set;
  }, [thieuTieuChi, dongChuaChotServer, chiTietList]);

  useEffect(() => {
    const dau = idChiTietThieu.values().next().value;
    if (dau == null) return;
    document
      .getElementById(`tieu-chi-${dau}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [idChiTietThieu]);

  const kiemTraForm = () => {
    const loi = {};
    if (form.xepLoaiKhoa == null) {
      loi.xepLoaiKhoa = "Chưa chọn mức xếp loại.";
    }
    if (lechDeXuat && !form.lyDoXepLoai.trim()) {
      loi.lyDoXepLoai =
        "Mức bạn chọn khác mức hệ thống đề xuất - bắt buộc nêu lý do để hồ sơ có căn cứ.";
    }
    setLoiForm(loi);
    return Object.keys(loi).length === 0;
  };

  const moXacNhan = () => {
    setThieuTieuChi(null);
    if (kiemTraForm()) setXacNhanChot(true);
  };

  /**
   * Phân loại lỗi trả về của lời gọi chốt về đúng chỗ hiển thị.
   * Mọi mã lỗi đều phải có chỗ đậu - không có nhánh nào rơi vào "chỉ toast đỏ".
   */
  const xuLyLoiChot = async (error) => {
    const ma = error.errorCode;
    const thongDiep = error.message || "";

    if (error.missingItems?.length) {
      setThieuTieuChi(error.missingItems);
      showToast("error", "Chưa chốt được hồ sơ", thongDiep, 7000);
      return;
    }

    if (ma === "THIEU_LY_DO") {
      setLoiForm({ lyDoXepLoai: thongDiep });
      lyDoRef.current?.focus();
      return;
    }

    // Tập mức hợp lệ rõ ràng đã đổi dưới chân ta - hỏi lại server thay vì để
    // người dùng bấm lại đúng cái mức vừa bị từ chối.
    if (ma === "CAM_NANG_XEP_LOAI" || ma === "DIEM_KHONG_DU") {
      setLoiForm({ xepLoaiKhoa: thongDiep });
      setLanTaiLai((n) => n + 1);
      return;
    }

    // Mã này lẽ ra không bao giờ tới được đây: nó chỉ phát sinh khi form bày một
    // mức > 2 cho viên chức, tức là lớp kẹp trần ở mucChonDuoc đã hỏng.
    if (ma === "VUOT_MUC_VIEN_CHUC") {
      console.error(
        "[ChotHoSoPhong] Form đang render sai mức xếp loại:",
        ma,
        { mucChonDuoc, preview },
      );
      setLoiForm({
        chung: `${thongDiep} Đây là lỗi hiển thị của hệ thống - vui lòng tải lại trang và báo quản trị.`,
      });
      return;
    }

    // Việc của người khác (Hiệu trưởng phải trả gói về trước) - không gợi ý thử lại.
    if (ma === "TO_TRINH_DA_TRINH") {
      setLoiForm({ chung: thongDiep });
      showToast("error", "Không chốt được hồ sơ", thongDiep, 7000);
      return;
    }

    if (error.isForbidden) {
      setLoiForm({
        chung:
          "Bạn không phải Trưởng phòng của đơn vị chủ quản hồ sơ này nên không chốt được.",
      });
      return;
    }

    if (error.isConflict) {
      // Tải lại để lấy RowVersion mới, nhưng giữ nguyên những gì đang gõ dở.
      await taiPhieu({ imLang: true });
      setLanTaiLai((n) => n + 1);
      showToast("warn", "Dữ liệu đã thay đổi", thongDiep, 7000);
      setLoiForm({
        chung:
          "Hồ sơ vừa được cập nhật ở nơi khác. Nội dung bạn nhập vẫn còn - bấm Chốt hồ sơ lần nữa để gửi lại.",
      });
      return;
    }

    setLoiForm({ chung: thongDiep });
    showToast("error", "Không chốt được hồ sơ", thongDiep, 7000);
  };

  const handleChot = async () => {
    setXacNhanChot(false);
    setDangChot(true);
    setThieuTieuChi(null);
    try {
      await khoaDuyetHoSo(phieu.IdPhieu, {
        xepLoaiKhoa: form.xepLoaiKhoa,
        lyDoXepLoai: form.lyDoXepLoai.trim(),
        // Viên chức không có QĐ 838 - gửi null, server cũng bỏ qua.
        mucNckhcnQd838: null,
        // Không có định mức giờ NCKH để phủ quyết, nên luôn coi là đạt.
        duDinhMucGioNckh: true,
        khongViPhamPhapLuat: form.khongViPhamPhapLuat,
        ghiChuXepLoai: form.ghiChuXepLoai.trim(),
        nhanXet: form.nhanXet.trim(),
        rowVersion: phieu.RowVersion,
      });
      showToast(
        "success",
        "Đã chốt hồ sơ",
        `Hồ sơ của ${nv.hoTen} đã được chốt ở mức ${form.xepLoaiKhoa}.`,
        7000,
      );
      navigate(DUONG_DAN_DANH_SACH);
    } catch (error) {
      console.error("Lỗi chốt hồ sơ:", error);
      await xuLyLoiChot(error);
    } finally {
      setDangChot(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải hồ sơ...
          </div>
        </div>
      </div>
    );
  }

  if (loiTai || !phieu) {
    return (
      <div className="page-container">
        <Toast ref={toast} position="top-right" />
        <div className="modern-table-card">
          <div className="cd-empty">
            <i
              className="fa-solid fa-triangle-exclamation"
              style={{ color: "#f59e0b" }}
            ></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không mở được hồ sơ
            </h3>
            <p style={{ margin: "0 0 20px 0" }}>
              {loiTai || "Hồ sơ không tồn tại."}
            </p>
            <button
              className="btn-cancel"
              style={{ margin: "0 auto" }}
              onClick={() => navigate(DUONG_DAN_DANH_SACH)}
            >
              <i className="fa-solid fa-arrow-left"></i> Về danh sách hồ sơ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const panelChot = (
    <div className="cd-chot-panel">
      <div className="cd-chot-panel-head">
        <div className="cd-chot-eyebrow">Kết luận của Trưởng phòng</div>
        <div className="cd-chot-phu-de">
          Quyết định của Trưởng phòng được ưu tiên hơn kết quả tự động của hệ
          thống.
        </div>
      </div>

      <div className="cd-chot-cot">
        <div className="cd-chot-o">
          <div className="cd-chot-o-nhan">1. Điều kiện kết luận</div>
          {/* Chỉ MỘT ô. Viên chức / NLĐ không có định mức giờ NCKH nên ô đó không
              tồn tại ở màn hình này - bày một ô luôn tick là nói dối. */}
          <label className="cd-checkbox">
            <input
              type="checkbox"
              checked={form.khongViPhamPhapLuat}
              disabled={dangChot}
              onChange={(e) =>
                capNhat({ khongViPhamPhapLuat: e.target.checked })
              }
            />
            <span>Không vi phạm pháp luật</span>
          </label>
          <div className="cd-chot-o-mo-ta">
            Bỏ tick thì hồ sơ rơi về mức 1, bất kể điểm số.
          </div>
        </div>

        <div className="cd-chot-o">
          <div className="cd-chot-o-nhan">
            2. Xếp loại Phòng chọn <span className="text-red">*</span>
          </div>
          <div className="cd-xep-loai-chon">
            {mucChonDuoc.map((muc) => {
              const dangChon = Number(form.xepLoaiKhoa) === muc;
              return (
                <button
                  key={muc}
                  type="button"
                  className={`cd-muc-btn${dangChon ? " cd-muc-chon" : ""}`}
                  disabled={dangChot}
                  onClick={() => capNhat({ xepLoaiKhoa: muc })}
                >
                  <span className="cd-muc-dong">
                    <b>Mức {muc}</b>
                    {dangChon && <em>Đang chọn</em>}
                  </span>
                  <span className="cd-muc-ten">{XEP_LOAI_META[muc]?.label}</span>
                </button>
              );
            })}
          </div>
          {loiForm.xepLoaiKhoa && (
            <div className="cd-hint cd-hint-error">
              <i className="fa-solid fa-circle-exclamation"></i>{" "}
              {loiForm.xepLoaiKhoa}
            </div>
          )}
          {/* CacMucChonDuoc đã cắt sẵn các mức không đạt, nên thay vì bày nút
              "đã khóa" ta giải thích bằng chính câu của server. */}
          {mucToiDaChon < TRAN_MUC_VIEN_CHUC && (
            <div className="cd-khoa-vi-sao">
              <div className="cd-khoa-vi-sao-nhan">
                <i className="fa-solid fa-lock"></i> Vì sao chỉ còn mức{" "}
                {mucToiDaChon}
              </div>
              <p>
                {(!dungDuongLui && preview.GiaiThichMucDeXuat) ||
                  (!form.khongViPhamPhapLuat
                    ? "Có vi phạm pháp luật nên hồ sơ chỉ ở mức 1."
                    : `Tổng tích lũy ${formatDiem(tichLuyHienCo)} chưa đạt ngưỡng của mức cao hơn.`)}
              </p>
            </div>
          )}
          <details className="cd-chot-luu-y">
            <summary>
              <i className="fa-solid fa-chevron-right"></i>
              Vì sao không có mức 3 và mức 4?
            </summary>
            <div className="cd-chot-luu-y-than">
              <p>
                Hồ sơ ở Phòng / Trung tâm mang loại đối tượng{" "}
                <b>viên chức / người lao động</b> - điều này suy từ ĐƠN VỊ của
                phiếu chứ không từ chức danh, nên kể cả một PGS kiêm nhiệm làm
                Trưởng phòng thì phiếu Phòng của họ vẫn là loại này.
              </p>
              <ul>
                <li>
                  Trần xếp loại là <b>mức 2 - Hoàn thành nhiệm vụ</b>. Server
                  chặn cứng bằng 409 VUOT_MUC_VIEN_CHUC.
                </li>
                <li>
                  Viên chức không vào mẫu số hạn ngạch xuất sắc 20% của Khoa nên
                  không tranh suất mức 4.
                </li>
              </ul>
              <p>
                Ngoài ra bước này KHÔNG nâng xếp loại được, chỉ giữ nguyên hoặc
                hạ so với mức hệ thống đề xuất.
              </p>
            </div>
          </details>
        </div>
      </div>

      <div className="cd-chot-ghi">
        <div className="form-group">
          <label>
            Lý do xếp loại {lechDeXuat && <span className="text-red">*</span>}
          </label>
          <textarea
            ref={lyDoRef}
            className="cd-textarea"
            rows={3}
            value={form.lyDoXepLoai}
            disabled={dangChot}
            placeholder={
              lechDeXuat
                ? "Bắt buộc: vì sao hạ xuống dưới mức hệ thống đề xuất"
                : "Không bắt buộc khi trùng mức hệ thống đề xuất"
            }
            onChange={(e) => capNhat({ lyDoXepLoai: e.target.value })}
          />
          {loiForm.lyDoXepLoai ? (
            <div className="cd-hint cd-hint-error">
              <i className="fa-solid fa-circle-exclamation"></i>{" "}
              {loiForm.lyDoXepLoai}
            </div>
          ) : lechDeXuat ? (
            <div className="cd-hint cd-hint-warn">
              {/* Trần là mức đề xuất nên "khác" chỉ còn một nghĩa: HẠ mức. */}
              <i className="fa-solid fa-circle-info"></i> Bạn đang <b>hạ</b> từ
              mức {mucDoiChieu} xuống mức {form.xepLoaiKhoa} - phải ghi lý do.
            </div>
          ) : null}
        </div>

        <div className="form-group">
          <label>Ghi chú xếp loại</label>
          <textarea
            className="cd-textarea"
            rows={3}
            value={form.ghiChuXepLoai}
            disabled={dangChot}
            onChange={(e) => capNhat({ ghiChuXepLoai: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Nhận xét của Phòng</label>
          <textarea
            className="cd-textarea"
            rows={3}
            value={form.nhanXet}
            disabled={dangChot}
            onChange={(e) => capNhat({ nhanXet: e.target.value })}
          />
        </div>
      </div>

      {loiForm.chung && (
        <div className="cd-hint cd-hint-error">
          <i className="fa-solid fa-circle-exclamation"></i> {loiForm.chung}
        </div>
      )}

      <div className="cd-chot-thanh-nut">
        <button
          className="btn-submit"
          disabled={dangChot || !sanSangChot}
          onClick={moXacNhan}
        >
          {dangChot ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i> Đang chốt...
            </>
          ) : (
            <>
              <i className="fa-solid fa-user-check"></i> Chốt hồ sơ này
            </>
          )}
        </button>
        <button
          className="btn-cancel"
          disabled={dangChot}
          onClick={() => navigate(DUONG_DAN_DANH_SACH)}
        >
          Để sau
        </button>
        {!sanSangChot ? (
          <span className="cd-hint cd-hint-warn" style={{ marginTop: 0 }}>
            <i className="fa-solid fa-lock"></i> Còn{" "}
            {dungDuongLui
              ? chuaChot.length
              : (preview.SoDongTongCong ?? 0) - (preview.SoDongDaChot ?? 0)}{" "}
            tiêu chí chưa chốt điểm nên chưa chốt được hồ sơ.
          </span>
        ) : (
          form.xepLoaiKhoa != null && (
            <span className="cd-chot-tom-luoc">
              Chốt sẽ lưu tổng {formatDiem(tichLuyHienCo)} và xếp loại Mức{" "}
              {form.xepLoaiKhoa} · {XEP_LOAI_META[form.xepLoaiKhoa]?.label}.
            </span>
          )
        )}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <button
          className="cd-quay-lai"
          onClick={() => navigate(DUONG_DAN_DANH_SACH)}
        >
          <i className="fa-solid fa-arrow-left"></i> Danh sách hồ sơ
        </button>
        <h2
          style={{
            margin: 0,
            color: "#1e293b",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          Chốt hồ sơ #{phieu.IdPhieu}
        </h2>
        <span className="breadcrumb">
          Năm học {phieu.IdNam} · Lần đánh giá {phieu.LanDanhGia}
          {phieu.LanMoLai > 0 ? ` · Đã mở lại ${phieu.LanMoLai} lần` : ""}
        </span>
      </div>

      <div className="cd-chot-header">
        <div className="cd-chot-header-main">
          <div className="cd-phieu-top">
            <div>
              <div className="cd-phieu-ten">{nv.hoTen}</div>
              <div className="cd-phieu-phu">
                {nv.maNhanVien && (
                  <span className="code-pill" style={{ marginRight: "8px" }}>
                    {nv.maNhanVien}
                  </span>
                )}
                {nv.tenDonVi || "-"}
                {phieu.TenChucDanh ? ` · ${phieu.TenChucDanh}` : ""}
                {laVienChuc ? " · Viên chức / người lao động" : ""}
              </div>
            </div>
            <TrangThaiBadge trangThai={phieu.TrangThai} />
          </div>

          <div className="cd-diem-panel">
            <div className="cd-diem-panel-nhan">
              Tổng điểm tích lũy
              {dungDuongLui && diem.tichLuy != null && (
                <span className="cd-tam-tinh">tạm tính</span>
              )}
            </div>
            <div className="cd-diem-cong">
              <div className="cd-diem-o">
                <b>{formatDiem(diem.coBan)}</b>
                <span>Cơ bản</span>
              </div>
              <span className="cd-diem-dau">+</span>
              <div className="cd-diem-o">
                <b>{formatDiem(diem.vuotTroi)}</b>
                <span>Vượt trội</span>
              </div>
              <span className="cd-diem-dau">=</span>
              <div className="cd-diem-o cd-diem-o-tong">
                <b>{formatDiem(diem.tichLuy)}</b>
                <span>Tích lũy</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cd-chot-header-rail">
          <div>
            <div className="cd-rail-nhan">
              Mức hệ thống đề xuất
              {dungDuongLui && mucDoiChieu != null && (
                <span className="cd-tam-tinh">tạm tính</span>
              )}
            </div>
            <div className="cd-rail-muc">
              {mucDoiChieu != null
                ? `Mức ${mucDoiChieu}${tenMucDoiChieu ? ` · ${tenMucDoiChieu}` : ""}`
                : "Chưa tính được"}
            </div>
            {coQuyenChot && (
              <div className="cd-rail-phu">
                {!dungDuongLui && preview.GiaiThichMucDeXuat
                  ? preview.GiaiThichMucDeXuat
                  : "Bước này chỉ được giữ nguyên hoặc hạ mức, không nâng."}
              </div>
            )}
          </div>

          <div className="cd-rail-list">
            <div>
              <span>Dòng tiêu chí đã chốt</span>
              <b className={sanSangChot ? "cd-rail-dat" : "cd-rail-thieu"}>
                {dungDuongLui ? soDaChot : (preview.SoDongDaChot ?? soDaChot)} /{" "}
                {dungDuongLui
                  ? chiTietList.length
                  : (preview.SoDongTongCong ?? chiTietList.length)}
              </b>
            </div>
            <div>
              <span>Mức Phòng đã chọn</span>
              <XepLoaiKhoaBadge xepLoaiKhoa={phieu.XepLoaiKhoa} />
            </div>
            <div>
              <span>Xếp loại cuối cùng</span>
              <XepLoaiBadge xepLoai={phieu.XepLoai} />
            </div>
          </div>
        </div>

        {phieu.LyDoHtTraVe && (
          <div className="cd-chot-header-bao">
            <div className="cd-yeu-cau-bo-sung">
              <div className="cd-yc-head">
                <span
                  className="cd-status-badge"
                  style={{
                    background: "#fef2f2",
                    color: "#b91c1c",
                    borderColor: "#fecaca",
                  }}
                >
                  <i className="fa-solid fa-rotate-left"></i> Hiệu trưởng trả hồ
                  sơ về
                </span>
              </div>
              <p className="cd-yc-lydo">{phieu.LyDoHtTraVe}</p>
            </div>
          </div>
        )}
      </div>

      {previewLoi && (
        <div className="cd-hint cd-hint-warn" style={{ marginBottom: "16px" }}>
          <i className="fa-solid fa-triangle-exclamation"></i> {previewLoi}. Các
          con số trên là tạm tính tại máy bạn và có thể lệch với kết quả lúc
          chốt.
        </div>
      )}

      {phieu.TrangThai !== TRANG_THAI.CHO_TK_DUYET && (
        <div
          className="cd-box"
          style={{
            background: "#eff6ff",
            borderColor: "#bfdbfe",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "13px", color: "#1e40af" }}>
            <i
              className="fa-solid fa-circle-info"
              style={{ marginRight: "8px" }}
            ></i>
            {phieu.TrangThai === TRANG_THAI.TK_DA_DUYET ||
            phieu.TrangThai === TRANG_THAI.HOAN_TAT
              ? "Hồ sơ đã được chốt. Chỉ Hiệu trưởng mới mở lại được."
              : "Hồ sơ chưa thẩm định xong toàn bộ tiêu chí nên chưa chốt được. Bạn vẫn xem được chi tiết bên dưới."}
          </div>
        </div>
      )}

      {!coQuyenChot && phieu.TrangThai === TRANG_THAI.CHO_TK_DUYET && (
        <div
          className="cd-box"
          style={{
            background: "#f8fafc",
            borderColor: "#e2e8f0",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "13px", color: "#475569" }}>
            <i
              className="fa-solid fa-eye"
              style={{ marginRight: "8px" }}
            ></i>
            Bạn đang xem ở chế độ chỉ đọc. Chỉ Trưởng phòng của đơn vị chủ quản
            hồ sơ này mới chốt được.
          </div>
        </div>
      )}

      {chuaChot.length > 0 && (
        <div className="cd-canh-bao">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            Còn <b>{chuaChot.length}</b> tiêu chí chưa thẩm định xong:{" "}
            {chuaChot
              .map((ct) => ct.TenTieuChi)
              .filter(Boolean)
              .join(", ")}
            . Hồ sơ chỉ chốt được khi 100% tiêu chí đã chốt điểm - việc thẩm định
            làm ở màn hình chấm điểm.
          </span>
        </div>
      )}

      {thieuTieuChi?.length > 0 && (
        <div className="cd-canh-bao">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>
            Server từ chối chốt vì các tiêu chí sau chưa hoàn tất:{" "}
            <b>
              {thieuTieuChi
                .map(
                  (m) =>
                    m.tenTieuChi ||
                    m.TenTieuChi ||
                    `#${m.idTieuChi ?? m.IdTieuChi}`,
                )
                .join(", ")}
            </b>
            . Các thẻ tương ứng bên dưới đã được tô đỏ.
          </span>
        </div>
      )}

      {coQuyenChot && panelChot}

      <p className="sub-title" style={{ marginBottom: "12px" }}>
        CHI TIẾT TIÊU CHÍ ({soDaChot}/{chiTietList.length} dòng đã chốt)
      </p>

      {chiTietList.map((ct, index) => (
        <TieuChiChamCard
          key={ct.IdChiTiet}
          chiTiet={ct}
          stt={index + 1}
          lichSu={lichSuTheoChiTiet.get(Number(ct.IdChiTiet)) || []}
          dangTaiLichSu={dangTaiLichSu}
          // Tên CHẾ ĐỘ HIỂN THỊ của thẻ (ẩn dải nút thẩm định), không phải khẳng
          // định vai trò - đừng đổi tên theo chức vụ của người đang xem.
          vaiTro="truongKhoa"
          noiBat={idChiTietThieu.has(Number(ct.IdChiTiet))}
          // Màn hình này CHỈ để chốt hồ sơ. Thẩm định / sửa điểm từng tiêu chí
          // làm ở /quan-ly/phieu/:id - Trưởng phòng đã vào được qua
          // ROLE_SETS.TRUONG_DON_VI.
          choPhepNhap={false}
          // Trả dòng về đơn vị thẩm định: server CHO PHÉP TP (xem openapi
          // chitiet/{id}/khoa/tra-tham-dinh) nhưng traThamDinhDuoc() hiện gác
          // bằng laTruongKhoa(). Để mở, thêm một helper riêng cho Phòng - ĐỪNG
          // nới traThamDinhDuoc(), ChotHoSoKhoa đang phụ thuộc vào nó.
          choPhepTraThamDinh={false}
          onXemMinhChung={openPreview}
          onTaiMinhChung={downloadMinhChung}
        />
      ))}

      <FilePreviewModal
        isOpen={mcPreview.isOpen}
        fileName={mcPreview.mc?.TenFileGoc || mcPreview.mc?.TenHienThi}
        kieu={mcPreview.kieu}
        url={mcPreview.url}
        isLoading={mcPreview.isLoading}
        error={mcPreview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(mcPreview.mc)}
      />

      {xacNhanChot && (
        <div
          className="modal-overlay"
          onClick={dangChot ? undefined : () => setXacNhanChot(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chốt hồ sơ của {nv.hoTen}?</h3>
              <button
                className="close-btn"
                onClick={() => setXacNhanChot(false)}
                disabled={dangChot}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              {/* Nói thẳng hệ quả, không dùng "bạn có chắc chắn không":
                  Trưởng phòng KHÔNG tự mở lại được hồ sơ sau bước này. */}
              <div
                className="cd-hint cd-hint-error"
                style={{ marginBottom: "15px" }}
              >
                <i className="fa-solid fa-triangle-exclamation"></i> Sau khi
                chốt, chỉ Hiệu trưởng mới mở lại được hồ sơ này.
              </div>

              <div className="cd-xac-nhan-tom-tat">
                <div>
                  <span>Xếp loại Phòng chọn</span>
                  <b>
                    Mức {form.xepLoaiKhoa} ·{" "}
                    {XEP_LOAI_META[form.xepLoaiKhoa]?.label}
                  </b>
                </div>
                <div>
                  <span>Tổng tích lũy{dungDuongLui ? " (tạm tính)" : ""}</span>
                  <b>{formatDiem(tichLuyHienCo)}</b>
                </div>
                <div>
                  <span>Tiêu chí đã chốt</span>
                  <b>
                    {soDaChot}/{chiTietList.length}
                  </b>
                </div>
              </div>

              {lechDeXuat && (
                <div
                  className="cd-hint cd-hint-warn"
                  style={{ marginTop: "12px" }}
                >
                  <i className="fa-solid fa-circle-info"></i> Bạn hạ từ mức{" "}
                  {mucDoiChieu} xuống mức {form.xepLoaiKhoa} - lý do đã ghi sẽ
                  được lưu kèm hồ sơ.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setXacNhanChot(false)}
                disabled={dangChot}
              >
                Quay lại sửa
              </button>
              <button
                className="btn-submit"
                onClick={handleChot}
                disabled={dangChot}
              >
                {dangChot ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang chốt...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-check"></i> Chốt hồ sơ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {phieu.NgayXepLoai && (
        <div className="cd-hint" style={{ marginTop: "16px" }}>
          Chốt lúc {formatNgayGio(phieu.NgayXepLoai)}
        </div>
      )}
    </div>
  );
};

export default ChotHoSoPhong;
