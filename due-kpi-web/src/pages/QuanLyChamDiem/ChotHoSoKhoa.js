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
import { apiFetch } from "../../utils/api";
import {
  fetchDinhMucApDung,
  fetchGioNckhThucTe,
  fetchLichSuChamDiemPhieu,
  fetchPhieuDetail,
  fetchTieuChiDonViCham,
  fetchTieuChiTheoMau,
  formatDiem,
  formatNgayGio,
  gomLichSuTheoChiTiet,
  khoaDuyetHoSo,
  LOAI_DOI_TUONG,
  MUC_QD838,
  NAM_AP_DUNG_QD838,
  NGUONG_XEP_LOAI,
  TEN_MUC_QD838,
  tinhTongDiemTamTinh,
  tinhXepLoaiGoiY,
  traThamDinhLai,
  TRANG_THAI,
  TRANG_THAI_DONG,
  XEP_LOAI_KHOA_CHON,
  XEP_LOAI_META,
} from "../../utils/phieuApi";
import {
  buildChamContext,
  laTruongKhoa,
  lyDoKhoaONhap,
  traThamDinhDuoc,
} from "../../utils/phieuChamPermissions";
import {
  thongTinNhanVien,
  useNhanVienIndex,
} from "../../hooks/useNhanVienIndex";
import { useMinhChungPhieuPreview } from "../../hooks/useMinhChungPhieuPreview";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import TieuChiChamCard from "../../components/QuanLyChamDiem/TieuChiChamCard";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import {
  TrangThaiBadge,
  XepLoaiBadge,
  XepLoaiKhoaBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";

/**
 * Giai đoạn 3 - Trưởng khoa chốt hồ sơ cá nhân và CHỌN TAY xếp loại.
 *
 * Bốn điều phải nắm trước khi sửa trang này:
 *
 * 1. Trưởng khoa chỉ chọn được mức 1/2/3. Mức 4 (Hoàn thành xuất sắc) phụ thuộc
 *    thứ hạng trong cả Khoa nên chỉ bước đóng gói tờ trình mới nâng lên được -
 *    gửi XepLoaiKhoa = 4 sẽ bị server trả 400. Mức 4 KHÔNG được render ở bất kỳ
 *    đâu trong form; thay bằng dòng chú thích dưới nhóm nút.
 *
 * 2. `xep_loai_de_xuat` được server tính NGAY TRONG lời gọi chốt, từ chính ba ô
 *    Trưởng khoa vừa tick, rồi mới ghi xuống DB. Trước lần chốt đầu tiên,
 *    GET phieu/{id} trả XepLoaiDeXuat = null và không có endpoint dry-run nào để
 *    hỏi trước. Hệ quả cho giao diện:
 *      - ô "Lý do xếp loại" LUÔN hiện, không ẩn/hiện theo điều kiện;
 *      - mức gợi ý tính ở client chỉ để tham khảo (nhãn "tạm tính");
 *      - nếu vẫn dính 400 THIEU_LY_DO thì GIỮ NGUYÊN form, hiện lỗi inline ngay
 *        dưới ô lý do và đưa con trỏ vào đó - không được xóa những gì đã nhập.
 *
 * 3. Chốt là điểm không quay đầu với Trưởng khoa: chỉ Hiệu trưởng gọi được
 *    phieu/{id}/mo-lai. Bắt buộc hộp xác nhận và phải nói thẳng hệ quả đó.
 *
 * 4. Trả một dòng về đơn vị thẩm định sẽ XÓA cả nhóm xếp loại và kéo hồ sơ về
 *    trạng thái 2 - không phải thao tác nhẹ, phải cảnh báo trước.
 */
const ChotHoSoKhoa = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const { user } = useAuth();
  const { nhanVienIndex } = useNhanVienIndex();

  const [phieu, setPhieu] = useState(null);
  const [donViList, setDonViList] = useState([]);
  const [phanQuyenRows, setPhanQuyenRows] = useState([]);
  // Map IdTieuChi -> { loaiNhom } của mẫu: nguồn DUY NHẤT để biết tiêu chí thuộc
  // Nhóm A hay Nhóm B, vì ChiTietDanhGiaDto không trả loai_nhom.
  const [tieuChiMauMap, setTieuChiMauMap] = useState(new Map());
  const [lichSuItems, setLichSuItems] = useState([]);
  const [dangTaiLichSu, setDangTaiLichSu] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState("");
  const [dinhMuc, setDinhMuc] = useState({ apDung: null, gioNckh: null });

  const [dangChot, setDangChot] = useState(false);
  const [xacNhanChot, setXacNhanChot] = useState(false);
  const [idDangLuu, setIdDangLuu] = useState(null);
  const [dongTraThamDinh, setDongTraThamDinh] = useState(null);
  const [thieuTieuChi, setThieuTieuChi] = useState(null);

  const [form, setForm] = useState({
    xepLoaiKhoa: null,
    lyDoXepLoai: "",
    mucNckhcnQd838: null,
    duDinhMucGioNckh: true,
    khongViPhamPhapLuat: true,
    ghiChuXepLoai: "",
    nhanXet: "",
  });
  // Lỗi gắn vào ĐÚNG ô gây ra nó. `chung` chỉ dành cho lỗi không quy được về ô nào.
  const [loiForm, setLoiForm] = useState({});
  const lyDoRef = useRef(null);
  const qd838Ref = useRef(null);
  // Người dùng đã gõ gì chưa - quyết định có được phép nạp đè form từ server không.
  const daSuaForm = useRef(false);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const { preview, openPreview, closePreview, downloadMinhChung } =
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
    const taiDonVi = async () => {
      try {
        const res = await apiFetch("donvi");
        if (!res.ok) return;
        const result = await res.json();
        setDonViList(result.Items || (Array.isArray(result) ? result : []));
      } catch (error) {
        console.error("Lỗi tải danh mục đơn vị:", error);
      }
    };
    taiDonVi();
  }, []);

  useEffect(() => {
    if (!phieu?.IdMau) return undefined;
    let huy = false;
    fetchTieuChiDonViCham({ idMau: phieu.IdMau })
      .then((rows) => {
        if (!huy) setPhanQuyenRows(rows);
      })
      .catch((error) =>
        console.error("Lỗi tải phân quyền chấm tiêu chí:", error),
      );
    fetchTieuChiTheoMau(phieu.IdMau)
      .then((map) => {
        if (!huy) setTieuChiMauMap(map);
      })
      .catch((error) => console.error("Lỗi tải chi tiết mẫu đánh giá:", error));
    return () => {
      huy = true;
    };
  }, [phieu?.IdMau]);

  const laVienChuc = Number(phieu?.LoaiDoiTuong) === LOAI_DOI_TUONG.VIEN_CHUC;

  // Ô tick "Đủ định mức giờ NCKH" là một phán quyết, không phải một con số tự
  // động - nhưng người phán quyết cần thấy giờ thực tế / định mức trước khi tick.
  // Hỏng thì bỏ trống, không chặn màn hình.
  useEffect(() => {
    const idNv = phieu?.IdNhanVien;
    const idNam = phieu?.IdNam;
    if (!idNv || !idNam || laVienChuc) return undefined;
    let huy = false;
    Promise.allSettled([
      fetchDinhMucApDung(idNv, idNam),
      fetchGioNckhThucTe(idNv, idNam),
    ]).then(([ad, gio]) => {
      if (huy) return;
      setDinhMuc({
        apDung: ad.status === "fulfilled" ? ad.value : null,
        gioNckh: gio.status === "fulfilled" ? gio.value : null,
      });
    });
    return () => {
      huy = true;
    };
  }, [phieu?.IdNhanVien, phieu?.IdNam, laVienChuc]);

  // Nạp form từ dữ liệu server mỗi khi hồ sơ được tải lại. Mức mặc định là mức
  // hệ thống đề xuất (kẹp trần ở 3 vì Trưởng khoa không chọn được mức 4) -
  // người dùng vẫn đổi được, đây chỉ là điểm xuất phát hợp lý.
  //
  // Nhưng KHÔNG nạp đè khi người dùng đã gõ: 409 làm màn hình tự tải lại phiếu,
  // nạp đè ở đó là xóa trắng lý do vừa viết - đúng thứ họ sẽ phải viết lại.
  useEffect(() => {
    if (!phieu || daSuaForm.current) return;
    setForm({
      xepLoaiKhoa:
        phieu.XepLoaiKhoa ??
        (phieu.XepLoaiDeXuat != null
          ? Math.min(Number(phieu.XepLoaiDeXuat), 3)
          : null),
      lyDoXepLoai: phieu.LyDoXepLoai || "",
      mucNckhcnQd838: phieu.MucNckhcnQd838 ?? null,
      duDinhMucGioNckh: phieu.DuDinhMucGioNckh ?? true,
      khongViPhamPhapLuat: phieu.KhongViPhamPhapLuat ?? true,
      ghiChuXepLoai: phieu.GhiChuXepLoai || "",
      nhanXet: "",
    });
    setLoiForm({});
  }, [phieu]);

  const chamCtx = useMemo(
    () => buildChamContext({ user, phieu, phanQuyenRows, donViList }),
    [user, phieu, phanQuyenRows, donViList],
  );

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

  const canQd838 = !laVienChuc && Number(phieu?.IdNam) >= NAM_AP_DUNG_QD838;

  // Server chỉ ghi tong_diem_* và xep_loai_de_xuat khi hồ sơ được CHỐT, mà đây
  // lại đúng là màn hình đứng trước cái nút chốt đó - nên cả hai phải tính tạm ở
  // client, nếu không Trưởng khoa phải chọn mức xếp loại trong khi không nhìn
  // thấy điểm nào cả.
  const tamTinh = useMemo(
    () => tinhTongDiemTamTinh(chiTietList, tieuChiMauMap),
    [chiTietList, tieuChiMauMap],
  );
  const tichLuyHienCo = phieu?.TongDiemTichLuy ?? tamTinh?.tichLuy ?? null;

  // Mức gợi ý bám theo form: đổi mức QĐ 838 hay bỏ tick điều kiện là nó đổi ngay,
  // giống hệt cách server sẽ tính lại lúc nhận request chốt.
  const mucGoiY = useMemo(
    () =>
      tinhXepLoaiGoiY({
        tichLuy: tichLuyHienCo,
        mucNckhcnQd838: form.mucNckhcnQd838,
        canQd838,
        duDinhMucGioNckh: form.duDinhMucGioNckh,
        khongViPhamPhapLuat: form.khongViPhamPhapLuat,
        tranMuc: laVienChuc ? 2 : 3,
      }),
    [
      tichLuyHienCo,
      form.mucNckhcnQd838,
      form.duDinhMucGioNckh,
      form.khongViPhamPhapLuat,
      canQd838,
      laVienChuc,
    ],
  );

  // Mức đem ra đối chiếu: ưu tiên con số server đã ghi, chưa có thì dùng gợi ý.
  const mucDoiChieu = phieu?.XepLoaiDeXuat ?? mucGoiY;
  const lechDeXuat =
    form.xepLoaiKhoa != null &&
    mucDoiChieu != null &&
    Number(form.xepLoaiKhoa) !== Number(mucDoiChieu);

  const coQuyenChot =
    laTruongKhoa(user) && phieu?.TrangThai === TRANG_THAI.CHO_TK_DUYET;

  // Viên chức / người lao động bị kẹp trần mức 2 (VUOT_MUC_VIEN_CHUC ở server).
  const mucChonDuoc = laVienChuc
    ? XEP_LOAI_KHOA_CHON.filter((m) => m <= 2)
    : XEP_LOAI_KHOA_CHON;

  /**
   * Trần mức được phép chọn theo dữ liệu hiện có.
   *
   * Điểm không tới ngưỡng thì mức cao hơn bị KHÓA chứ không chỉ cảnh báo: xếp
   * "Hoàn thành" cho hồ sơ dưới 80 điểm là chuyện lý do gì cũng không cứu được,
   * và server sẽ tính lại rồi từ chối. Chiều ngược lại vẫn mở - Trưởng khoa luôn
   * được xếp THẤP hơn mức điểm cho phép, chỉ cần ghi lý do.
   */
  const mucToiDaChon = mucGoiY ?? (laVienChuc ? 2 : 3);

  const lyDoKhoaMuc = () => {
    if (!form.duDinhMucGioNckh)
      return "Chưa đủ định mức giờ NCKH nên hồ sơ chỉ ở mức 1.";
    if (!form.khongViPhamPhapLuat)
      return "Có vi phạm pháp luật nên hồ sơ chỉ ở mức 1.";
    if (Number(tichLuyHienCo) < NGUONG_XEP_LOAI.HOAN_THANH)
      return `Tổng tích lũy ${formatDiem(tichLuyHienCo)} chưa đạt ${NGUONG_XEP_LOAI.HOAN_THANH} điểm nên hồ sơ chỉ ở mức 1.`;
    if (Number(tichLuyHienCo) <= NGUONG_XEP_LOAI.HOAN_THANH_TOT)
      return `Tổng tích lũy ${formatDiem(tichLuyHienCo)} chưa vượt ${NGUONG_XEP_LOAI.HOAN_THANH_TOT} điểm nên chưa lên được mức 3.`;
    return "Chưa đạt QĐ 838 nên chưa lên được mức 3.";
  };
  const coMucBiKhoa = mucChonDuoc.some((m) => m > mucToiDaChon);

  // Bỏ tick một điều kiện hay hạ mức QĐ 838 có thể kéo trần xuống dưới mức đang
  // chọn - hạ theo ngay, nếu không form sẽ giữ một mức đã bị khóa ngay bên cạnh.
  useEffect(() => {
    if (form.xepLoaiKhoa != null && Number(form.xepLoaiKhoa) > mucToiDaChon) {
      setForm((truoc) => ({ ...truoc, xepLoaiKhoa: mucToiDaChon }));
    }
  }, [mucToiDaChon, form.xepLoaiKhoa]);

  // Điều kiện CẦN để được tranh hạn ngạch xuất sắc ở bước đóng gói tờ trình.
  // Chọn mức 2 ở đây là tự loại người này khỏi cuộc đua - hệ quả nhân sự mà
  // người bấm phải thấy trước khi bấm, không phải sau.
  const duTranhXuatSac =
    !laVienChuc &&
    Number(form.xepLoaiKhoa) === 3 &&
    Number(form.mucNckhcnQd838) === MUC_QD838.HT_XUAT_SAC;
  const truotVanTranhXuatSac =
    !laVienChuc && form.xepLoaiKhoa != null && Number(form.xepLoaiKhoa) < 3;

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

  // Danh sách dòng server chỉ đích danh trong 422 CHUA_CHOT_HET. missingItems chỉ
  // chắc chắn có idTieuChi nên phải dò ngược về IdChiTiet để tô đúng thẻ.
  const idChiTietThieu = useMemo(() => {
    const set = new Set();
    (thieuTieuChi || []).forEach((m) => {
      const idCt = m.idChiTiet ?? m.IdChiTiet;
      if (idCt != null) return set.add(Number(idCt));
      const idTc = m.idTieuChi ?? m.IdTieuChi;
      const dong = chiTietList.find(
        (ct) => Number(ct.IdTieuChi) === Number(idTc),
      );
      if (dong) set.add(Number(dong.IdChiTiet));
    });
    return set;
  }, [thieuTieuChi, chiTietList]);

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
    if (canQd838 && form.mucNckhcnQd838 == null) {
      loi.mucNckhcnQd838 =
        "Từ năm học 2025-2026, hồ sơ giảng viên bắt buộc ghi nhận mức đạt QĐ 838.";
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

    if (error.status === 400 && /838/.test(thongDiep)) {
      setLoiForm({ mucNckhcnQd838: thongDiep });
      qd838Ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Hai mã này lẽ ra không bao giờ tới được đây: chúng chỉ phát sinh khi form
    // render sai theo LoaiDoiTuong (bày mức 3 cho viên chức) hoặc bày mức 4.
    // Thấy chúng nghĩa là giao diện hỏng, không phải người dùng thao tác sai.
    if (ma === "VUOT_MUC_VIEN_CHUC" || ma === "CAM_CHON_XUAT_SAC") {
      console.error("Form chốt hồ sơ đang render sai mức xếp loại:", ma, phieu);
      setLoiForm({
        chung: `${thongDiep} Đây là lỗi hiển thị của hệ thống - vui lòng tải lại trang và báo quản trị.`,
      });
      return;
    }

    if (error.isConflict) {
      // Tải lại để lấy RowVersion mới, nhưng giữ nguyên những gì đang gõ dở.
      await taiPhieu({ imLang: true });
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
        ...form,
        lyDoXepLoai: form.lyDoXepLoai.trim(),
        ghiChuXepLoai: form.ghiChuXepLoai.trim(),
        nhanXet: form.nhanXet.trim(),
        rowVersion: phieu.RowVersion,
      });
      showToast(
        "success",
        "Đã chốt hồ sơ",
        `Hồ sơ của ${nv.hoTen} đã được chốt. Xếp loại cuối cùng sẽ được ghi khi bạn đóng gói tờ trình KPI Khoa.`,
        7000,
      );
      navigate("/quan-ly/duyet-ho-so");
    } catch (error) {
      console.error("Lỗi chốt hồ sơ:", error);
      await xuLyLoiChot(error);
    } finally {
      setDangChot(false);
    }
  };

  const handleTraThamDinh = async ({ lyDo }) => {
    const chiTiet = dongTraThamDinh;
    setDongTraThamDinh(null);
    setIdDangLuu(chiTiet.IdChiTiet);
    try {
      await traThamDinhLai(chiTiet.IdChiTiet, {
        lyDo,
        rowVersion: phieu.RowVersion,
      });
      // Hồ sơ vừa tụt về trạng thái 2 và nhóm xếp loại đã bị xóa - form cũ không
      // còn nghĩa gì, cho phép nạp lại từ server.
      daSuaForm.current = false;
      await Promise.all([taiPhieu({ imLang: true }), taiLichSu()]);
      showToast(
        "success",
        "Đã trả về đơn vị thẩm định",
        `"${chiTiet.TenTieuChi}" đã quay về đơn vị chấm lại. Hồ sơ trở lại bước thẩm định và nhóm xếp loại đã bị xóa - bạn sẽ chốt lại sau khi tiêu chí xong.`,
        8000,
      );
    } catch (error) {
      console.error("Lỗi trả tiêu chí về đơn vị thẩm định:", error);
      if (error.isConflict) {
        await taiPhieu({ imLang: true });
        showToast("warn", "Dữ liệu đã thay đổi", error.message, 7000);
      } else {
        showToast("error", "Không thực hiện được", error.message, 6000);
      }
    } finally {
      setIdDangLuu(null);
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
              onClick={() => navigate("/quan-ly/duyet-ho-so")}
            >
              <i className="fa-solid fa-arrow-left"></i> Về danh sách hồ sơ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const gioNckhThucTe = dinhMuc.gioNckh?.GioNckhThucTe;
  const gioNckhApDung = dinhMuc.apDung?.GioNckhApDung;
  const mienNckh = !!dinhMuc.apDung?.MienNckh;
  const datGioNckh =
    gioNckhThucTe != null &&
    gioNckhApDung != null &&
    Number(gioNckhThucTe) >= Number(gioNckhApDung);

  // Ba cột tong_diem_* được server ghi trong cùng một transaction lúc chốt, nên
  // chỉ cần tích lũy có giá trị là cả ba đều là số đã lưu.
  const daCoDiemServer = phieu.TongDiemTichLuy != null;
  const diem = daCoDiemServer
    ? {
        coBan: phieu.TongDiemCoBan,
        vuotTroi: phieu.TongDiemVuotTroi,
        tichLuy: phieu.TongDiemTichLuy,
      }
    : {
        coBan: tamTinh?.coBan ?? null,
        vuotTroi: tamTinh?.vuotTroi ?? null,
        tichLuy: tamTinh?.tichLuy ?? null,
      };
  const diemLaTamTinh = !daCoDiemServer && tamTinh != null;

  // Mức thấp nhất đang bị khóa - hộp giải thích phải gọi đúng số đó, không nói chung chung.
  const mucKhoaDauTien = mucChonDuoc.find((m) => m > mucToiDaChon);
  // Cột QĐ 838 chỉ tồn tại với giảng viên từ năm áp dụng trở đi nên số thứ tự
  // của cột xếp loại phải trượt theo.
  const sttXepLoai = canQd838 ? 3 : 2;
  /**
   * Một dòng DUY NHẤT nói người này còn tranh suất xuất sắc hay không, thay cho
   * mấy hint rời rạc trước đây.
   *
   * Nó cũng bịt lỗ hổng cũ: hồ sơ chọn mức 3 nhưng chưa ghi nhận QĐ 838 mức 2
   * thì không hint nào hiện, người bấm tưởng vẫn đang trong cuộc đua.
   *
   * Năm chưa áp dụng QĐ 838 thì im lặng ở ca mức 3 - nói "chưa đạt QĐ 838" cho
   * một năm không thu thập chỉ tiêu đó là đổ lỗi sai chỗ.
   */
  const trangThaiXuatSac = (() => {
    if (laVienChuc || form.xepLoaiKhoa == null) return null;
    if (duTranhXuatSac) {
      return {
        kieu: "cd-hint-ok",
        icon: "fa-star",
        text: "Còn trong danh sách tranh suất xuất sắc ở bước đóng gói tờ trình.",
      };
    }
    if (truotVanTranhXuatSac) {
      return {
        kieu: "cd-hint-warn",
        icon: "fa-circle-info",
        text: `Chọn mức ${form.xepLoaiKhoa} là người này không còn tranh suất xuất sắc - chỉ hồ sơ mức 3 kèm QĐ 838 mức 2 mới vào cuộc.`,
      };
    }
    if (canQd838) {
      return {
        kieu: "cd-hint-warn",
        icon: "fa-circle-info",
        text: "Đang ở mức 3 nhưng chưa ghi nhận QĐ 838 mức 2 nên chưa tranh được suất xuất sắc.",
      };
    }
    return null;
  })();

  const panelChot = (
    <div className="cd-chot-panel">
      <div className="cd-chot-panel-head">
        <div className="cd-chot-eyebrow">Kết luận của Trưởng khoa</div>
        <div className="cd-chot-phu-de">
          Quyết định của Trưởng khoa được ưu tiên hơn kết quả tự động của hệ
          thống.
        </div>
      </div>

      <div className="cd-chot-cot">
        <div className="cd-chot-o">
          <div className="cd-chot-o-nhan">1. Điều kiện kết luận</div>
          {/* Viên chức / NLĐ không có định mức giờ NCKH nên ô này không có
              nghĩa với họ - server cũng bỏ qua. Ẩn hẳn thay vì bày một ô luôn
              tick. */}
          {!laVienChuc && (
            <label className="cd-checkbox">
              <input
                type="checkbox"
                checked={form.duDinhMucGioNckh}
                disabled={dangChot}
                onChange={(e) =>
                  capNhat({ duDinhMucGioNckh: e.target.checked })
                }
              />
              <span>Đủ định mức giờ nghiên cứu khoa học</span>
            </label>
          )}
          {/* Ô tick trên là một phán quyết, nhưng người phán quyết cần thấy giờ
              thực tế / định mức ngay cạnh nó mới tick được có căn cứ. */}
          {!laVienChuc && (gioNckhThucTe != null || gioNckhApDung != null) && (
            <div
              className={`cd-nckh-so${
                mienNckh ? "" : datGioNckh ? " cd-nckh-dat" : " cd-nckh-thieu"
              }`}
            >
              Giờ NCKH thực tế / định mức:{" "}
              <b>
                {formatDiem(gioNckhThucTe, 1)} / {formatDiem(gioNckhApDung, 1)}
                {mienNckh ? " (miễn)" : ""}
              </b>
            </div>
          )}
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
            Bỏ tick bất kỳ ô nào thì hồ sơ rơi về mức 1, bất kể điểm số.
          </div>
        </div>

        {canQd838 && (
          <div className="cd-chot-o" ref={qd838Ref}>
            <div className="cd-chot-o-nhan">
              2. Mức đạt QĐ 838 <span className="text-red">*</span>
            </div>
            <div className="cd-xep-loai-chon">
              {[
                MUC_QD838.CHUA_DAT,
                MUC_QD838.HT_TOT,
                MUC_QD838.HT_XUAT_SAC,
              ].map((muc) => {
                const dangChon = Number(form.mucNckhcnQd838) === muc;
                return (
                  <button
                    key={muc}
                    type="button"
                    className={`cd-muc-btn${dangChon ? " cd-muc-chon" : ""}`}
                    disabled={dangChot}
                    onClick={() => capNhat({ mucNckhcnQd838: muc })}
                  >
                    <span className="cd-muc-dong">
                      <b>Mức {muc}</b>
                      {dangChon && <em>Đang chọn</em>}
                    </span>
                    <span className="cd-muc-ten">{TEN_MUC_QD838[muc]}</span>
                  </button>
                );
              })}
            </div>
            {loiForm.mucNckhcnQd838 && (
              <div className="cd-hint cd-hint-error">
                <i className="fa-solid fa-circle-exclamation"></i>{" "}
                {loiForm.mucNckhcnQd838}
              </div>
            )}
            <div className="cd-chot-o-mo-ta">
              Chỉ người đạt mức 2 mới đủ điều kiện tranh hạn ngạch xuất sắc ở
              bước đóng gói tờ trình.
            </div>
          </div>
        )}

        <div className="cd-chot-o">
          <div className="cd-chot-o-nhan">
            {sttXepLoai}. Xếp loại Khoa chọn <span className="text-red">*</span>
          </div>
          <div className="cd-xep-loai-chon">
            {mucChonDuoc.map((muc) => {
              const biKhoa = muc > mucToiDaChon;
              const dangChon = Number(form.xepLoaiKhoa) === muc;
              return (
                <button
                  key={muc}
                  type="button"
                  className={`cd-muc-btn${dangChon ? " cd-muc-chon" : ""}${biKhoa ? " cd-muc-khoa" : ""}`}
                  disabled={dangChot || biKhoa}
                  title={biKhoa ? lyDoKhoaMuc() : undefined}
                  onClick={() => capNhat({ xepLoaiKhoa: muc })}
                >
                  <span className="cd-muc-dong">
                    <b>Mức {muc}</b>
                    {dangChon && <em>Đang chọn</em>}
                    {biKhoa && <em>Đã khóa</em>}
                  </span>
                  <span className="cd-muc-ten">{XEP_LOAI_META[muc].label}</span>
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
          {coMucBiKhoa && (
            <div className="cd-khoa-vi-sao">
              <div className="cd-khoa-vi-sao-nhan">
                <i className="fa-solid fa-lock"></i> Vì sao mức {mucKhoaDauTien}{" "}
                bị khóa
              </div>
              <p>{lyDoKhoaMuc()}</p>
              {/* Ngoại lệ này là một ĐƯỜNG KHÁC để lên mức, không phải lý do bị
                  khóa - gộp chung một đoạn với câu trên thì không ai đọc ra. */}
              <div className="cd-khoa-ngoai-le">
                <b>Ngoại lệ</b>
                <span>
                  Đơn vị hoàn thành nhiều nhiệm vụ trọng tâm và được xếp loại
                  hoàn thành xuất sắc nhiệm vụ (A+) định kỳ hoặc cuối năm thì
                  được đề xuất tăng tối đa 01 chỉ tiêu xếp loại (B lên A, hoặc A
                  lên A+), kèm giải trình riêng cho đề xuất tăng thêm đó.
                </span>
              </div>
            </div>
          )}
          {trangThaiXuatSac && (
            <div className={`cd-hint ${trangThaiXuatSac.kieu}`}>
              <i className={`fa-solid ${trangThaiXuatSac.icon}`}></i>{" "}
              {trangThaiXuatSac.text}
            </div>
          )}
          <details className="cd-chot-luu-y">
            <summary>
              <i className="fa-solid fa-chevron-right"></i>
              Mức 4 (Hoàn thành xuất sắc) được xét thế nào?
            </summary>
            <div className="cd-chot-luu-y-than">
              <p>
                Không chọn thủ công được. Bước đóng gói tờ trình Khoa mới nâng,
                và chỉ nâng cho giảng viên đủ cả ba điều kiện:
              </p>
              <ul>
                <li>Được Khoa xếp mức 3 - Hoàn thành tốt nhiệm vụ</li>
                <li>Hoàn thành xuất sắc nhiệm vụ theo QĐ 838 (mức 2)</li>
                <li>Lọt hạn ngạch 20% của Khoa</li>
              </ul>
              {laVienChuc && (
                <p>
                  Hồ sơ này là viên chức / người lao động nên trần là mức 2 và
                  không vào mẫu số hạn ngạch.
                </p>
              )}
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
                ? "Bắt buộc: vì sao chọn khác mức hệ thống tính lúc chốt"
                : "Không bắt buộc khi trùng mức hệ thống tính"
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
              <i className="fa-solid fa-circle-info"></i> Bạn chọn mức{" "}
              {form.xepLoaiKhoa} trong khi mức tạm tính là {mucDoiChieu} - phải
              ghi lý do.
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
          <label>Nhận xét của Khoa</label>
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
          disabled={dangChot || chuaChot.length > 0}
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
          onClick={() => navigate("/quan-ly/duyet-ho-so")}
        >
          Để sau
        </button>
        {chuaChot.length > 0 ? (
          <span className="cd-hint cd-hint-warn" style={{ marginTop: 0 }}>
            <i className="fa-solid fa-lock"></i> Còn {chuaChot.length} tiêu chí
            chưa chốt điểm nên chưa chốt được hồ sơ.
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
          onClick={() => navigate("/quan-ly/duyet-ho-so")}
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
              {diemLaTamTinh && diem.tichLuy != null && (
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
              Mức hệ thống tạm tính
              {phieu.XepLoaiDeXuat == null && mucGoiY != null && (
                <span className="cd-tam-tinh">chưa lưu</span>
              )}
            </div>
            <div className="cd-rail-muc">
              {mucDoiChieu != null
                ? `Mức ${mucDoiChieu} · ${XEP_LOAI_META[mucDoiChieu]?.label}`
                : "Chưa tính được"}
            </div>
            {coQuyenChot && (
              <div className="cd-rail-phu">
                {Number(mucDoiChieu) === Number(mucToiDaChon)
                  ? "Cũng là mức tối đa được chọn ở bước này."
                  : `Mức tối đa được chọn ở bước này: Mức ${mucToiDaChon} · ${XEP_LOAI_META[mucToiDaChon]?.label}.`}
              </div>
            )}
          </div>

          <div className="cd-rail-list">
            <div>
              <span>Dòng tiêu chí đã chốt</span>
              <b
                className={
                  chuaChot.length === 0 ? "cd-rail-dat" : "cd-rail-thieu"
                }
              >
                {soDaChot} / {chiTietList.length}
              </b>
            </div>
            <div>
              <span>Mức Khoa đã chọn</span>
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
            {phieu.TrangThai === TRANG_THAI.TK_DA_DUYET
              ? "Hồ sơ đã được chốt. Bước tiếp theo là đóng gói tờ trình KPI Khoa."
              : "Hồ sơ chưa thẩm định xong toàn bộ tiêu chí nên chưa chốt được. Bạn vẫn xem được chi tiết bên dưới."}
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
            . Hồ sơ chỉ chốt được khi 100% tiêu chí đã chốt điểm.
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
          vaiTro="truongKhoa"
          noiBat={idChiTietThieu.has(Number(ct.IdChiTiet))}
          // Màn hình này CHỈ để chốt hồ sơ, không thẩm định - kể cả khi Trưởng
          // khoa đồng thời là đơn vị được giao chấm tiêu chí đó. Việc thẩm định
          // làm ở /quan-ly/phieu/:id; ở đây hồ sơ đang
          // ở trạng thái 3 nên mọi dòng đều đã chốt.
          choPhepNhap={false}
          choPhepTraThamDinh={traThamDinhDuoc(ct, chamCtx)}
          lyDoKhoa={lyDoKhoaONhap(ct, chamCtx)}
          dangLuu={idDangLuu === ct.IdChiTiet}
          onTraThamDinh={setDongTraThamDinh}
          onXemMinhChung={openPreview}
          onTaiMinhChung={downloadMinhChung}
        />
      ))}

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenFileGoc || preview.mc?.TenHienThi}
        kieu={preview.kieu}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
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
              {/* Câu này nói thẳng hệ quả, không dùng "bạn có chắc chắn không":
                  Trưởng khoa KHÔNG tự mở lại được hồ sơ sau bước này. */}
              <div
                className="cd-hint cd-hint-error"
                style={{ marginBottom: "15px" }}
              >
                <i className="fa-solid fa-triangle-exclamation"></i> Sau khi
                chốt, chỉ Hiệu trưởng mới mở lại được hồ sơ này.
              </div>

              <div className="cd-xac-nhan-tom-tat">
                <div>
                  <span>Xếp loại Khoa chọn</span>
                  <b>
                    Mức {form.xepLoaiKhoa} ·{" "}
                    {XEP_LOAI_META[form.xepLoaiKhoa]?.label}
                  </b>
                </div>
                {canQd838 && (
                  <div>
                    <span>Mức QĐ 838</span>
                    <b>
                      Mức {form.mucNckhcnQd838} ·{" "}
                      {TEN_MUC_QD838[form.mucNckhcnQd838]}
                    </b>
                  </div>
                )}
                <div>
                  <span>Tổng tích lũy (tạm tính)</span>
                  <b>{formatDiem(tichLuyHienCo)}</b>
                </div>
                <div>
                  <span>Tiêu chí đã chốt</span>
                  <b>
                    {soDaChot}/{chiTietList.length}
                  </b>
                </div>
                {!laVienChuc && (
                  <div>
                    <span>Tranh hạn ngạch xuất sắc</span>
                    <b>{duTranhXuatSac ? "Có" : "Không"}</b>
                  </div>
                )}
              </div>

              {lechDeXuat && (
                <div
                  className="cd-hint cd-hint-warn"
                  style={{ marginTop: "12px" }}
                >
                  <i className="fa-solid fa-circle-info"></i> Mức bạn chọn khác
                  mức tạm tính ({mucDoiChieu}) - lý do đã ghi sẽ được lưu kèm hồ
                  sơ.
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

      {dongTraThamDinh && (
        <LyDoModal
          tieuDe="Trả tiêu chí về đơn vị thẩm định"
          moTa={`Tiêu chí "${dongTraThamDinh.TenTieuChi}" sẽ quay về ${dongTraThamDinh.TenDonViThamDinh || "đơn vị đã thẩm định"} để chấm lại.`}
          canhBao="Thao tác này đưa hồ sơ về bước thẩm định và XÓA cả nhóm xếp loại (mức Khoa, mức đề xuất, lý do, thứ hạng). Bạn sẽ phải chốt lại hồ sơ từ đầu sau khi tiêu chí được thẩm định xong."
          nhanLyDo="Lý do trả về đơn vị"
          goiYLyDo="VD: Giờ chuẩn tiêu chí C3 lệch với bảng phân công, đề nghị P.ĐT kiểm tra lại."
          nhanXacNhan="Trả về đơn vị"
          dangGui={idDangLuu === dongTraThamDinh.IdChiTiet}
          onDong={() => setDongTraThamDinh(null)}
          onXacNhan={handleTraThamDinh}
        />
      )}

      {phieu.NgayXepLoai && (
        <div className="cd-hint" style={{ marginTop: "16px" }}>
          Chốt lúc {formatNgayGio(phieu.NgayXepLoai)}
        </div>
      )}
    </div>
  );
};

export default ChotHoSoKhoa;
