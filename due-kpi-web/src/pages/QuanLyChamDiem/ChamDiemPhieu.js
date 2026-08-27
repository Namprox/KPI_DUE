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
  duyetThamDinh,
  fetchLichSuChamDiemPhieu,
  fetchPhieuDetail,
  fetchTieuChiDonViCham,
  fetchTieuChiTheoMau,
  formatDiem,
  formatNgayGio,
  gomLichSuTheoChiTiet,
  laTieuChiChamTay,
  putDiemKhoa,
  tinhTongDiemTamTinh,
  traThamDinhLai,
  traVeThamDinh,
  TRANG_THAI,
  TRANG_THAI_DONG,
} from "../../utils/phieuApi";
import {
  buildChamContext,
  duocChamTieuChi,
  laTruongKhoa,
  laTruongPhong,
  locTieuChiHienThi,
  lyDoKhoaONhap,
  oNhapDiemMo,
  phanLoaiDongCham,
  RO_VIEC,
  RO_VIEC_META,
  tenDonViDuocGiaoCham,
  tinhTienDoCham,
  traThamDinhDuoc,
} from "../../utils/phieuChamPermissions";
import {
  thongTinNhanVien,
  useNhanVienIndex,
} from "../../hooks/useNhanVienIndex";
import { useMinhChungPhieuPreview } from "../../hooks/useMinhChungPhieuPreview";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import TienDoCham from "../../components/QuanLyChamDiem/TienDoCham";
import TieuChiChamCard from "../../components/QuanLyChamDiem/TieuChiChamCard";
import TongDiemMeta from "../../components/QuanLyChamDiem/TongDiemMeta";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import SuaDiemModal from "../../components/QuanLyChamDiem/SuaDiemModal";
import {
  TrangThaiBadge,
  XepLoaiBadge,
} from "../../components/QuanLyChamDiem/TrangThaiBadge";

/**
 * Màn hình thẩm định một hồ sơ - trang quan trọng nhất của phân hệ.
 *
 * Ba điều dễ sai nếu không đọc kỹ luồng nghiệp vụ:
 *
 * 1. Mọi thao tác đều ở CẤP DÒNG, không có thao tác nào trên cả hồ sơ. Không có
 *    nút "Khoa duyệt" và cũng không còn nút "Trả lại phiếu": trả về là trả đúng
 *    một tiêu chí, các tiêu chí khác giữ nguyên tiến độ và hồ sơ ở lại trạng
 *    thái 2. Endpoint trả cả phiếu của luồng cũ đã bị gỡ.
 *
 * 2. Hồ sơ tự chuyển 2 ↔ 3 sau mỗi thao tác cấp dòng. Vì vậy sau mỗi lần gọi
 *    phải tải lại phiếu: badge trạng thái, RowVersion và quyền nhập đều có thể
 *    vừa đổi. Response trả kèm TrangThaiPhieu để báo trước điều đó.
 *
 * 3. RowVersion là khóa lạc quan và là của PHIẾU CHA cho cả thao tác cấp dòng.
 *    Khi server trả 409 nghĩa là phiếu đã bị người khác sửa - ta tải lại và bắt
 *    người dùng xem lại trước khi thử tiếp, không tự động gửi lại.
 *
 * Trang phục vụ hai vai: chuyên viên đơn vị thẩm định (thao tác trên dòng đang
 * chờ) và Trưởng khoa (trả dòng ĐÃ CHỐT về đơn vị làm lại). Vai nào thấy nút gì
 * do phieuChamPermissions quyết định, không suy diễn tại đây.
 *
 * 4. Danh sách tiêu chí có bộ lọc theo RỔ VIỆC và gom nhóm theo ĐƠN VỊ ĐƯỢC GIAO.
 *    Trưởng khoa cố ý thấy cả phiếu (locTieuChiHienThi chỉ cắt cho Trưởng phòng),
 *    nên bày phẳng là một danh sách dài mà đa số dòng đang khóa - mặc định mở vào
 *    rổ "Cần bạn xử lý" chính là để tránh điều đó. Lọc và gom CHỈ đổi cách bày,
 *    mọi con số tiến độ vẫn tính trên danh sách đầy đủ. Trưởng phòng KHÔNG thấy
 *    lớp này: danh sách của họ đã bị cắt còn đúng phần được giao.
 */
const ChamDiemPhieu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const { user } = useAuth();
  const { nhanVienIndex } = useNhanVienIndex();

  const [phieu, setPhieu] = useState(null);
  const [donViList, setDonViList] = useState([]);
  const [phanQuyenRows, setPhanQuyenRows] = useState([]);
  // Map IdTieuChi -> { loaiNhom, thang điểm } của mẫu; rỗng thì hộp thoại chấm
  // rơi về nhập số và hai ô điểm thành phần ở header bỏ trống.
  const [tieuChiMauMap, setTieuChiMauMap] = useState(new Map());
  const [dangTaiPhanQuyen, setDangTaiPhanQuyen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loiTai, setLoiTai] = useState("");
  const [idDangLuu, setIdDangLuu] = useState(null);
  const [lichSuItems, setLichSuItems] = useState([]);
  const [dangTaiLichSu, setDangTaiLichSu] = useState(true);
  // Dòng đang chờ nhập lý do. Hai chiều trả về khác hẳn nhau nên tách hai state
  // thay vì một state kèm cờ - nhầm chiều là gửi sai endpoint.
  const [dongTraVe, setDongTraVe] = useState(null);
  const [dongTraThamDinh, setDongTraThamDinh] = useState(null);
  // Dòng đang mở hộp thoại chọn lại mức điểm.
  const [dongSuaDiem, setDongSuaDiem] = useState(null);
  // null = chưa chọn tay → dùng rổ mặc định tính theo dữ liệu (xem roDangXem).
  const [roDaChon, setRoDaChon] = useState(null);
  // Chỉ giữ các nhóm người dùng BẤM tay; nhóm không có trong đây dùng mặc định
  // (nhóm của đơn vị mình mở sẵn, nhóm đơn vị khác thu gọn).
  const [nhomGatTay, setNhomGatTay] = useState({});

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  // Xem trước / tải minh chứng của từng tiêu chí - modal dùng chung với trang vi phạm
  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungPhieuPreview((message) => showToast("error", "Lỗi", message));

  const taiPhieu = useCallback(
    async ({ imLang = false } = {}) => {
      if (!imLang) setIsLoading(true);
      try {
        const item = await fetchPhieuDetail(id);
        if (!item) {
          setLoiTai(
            "Không tìm thấy phiếu này, hoặc phiếu nằm ngoài phạm vi bạn được xem.",
          );
          setPhieu(null);
          return null;
        }
        setPhieu(item);
        setLoiTai("");
        return item;
      } catch (error) {
        console.error("Lỗi tải phiếu:", error);
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

  // Lịch sử chấm lấy một lần cho cả phiếu (thay vì mỗi tiêu chí một request) và
  // nạp lại sau mỗi lần lưu điểm - lượt vừa lưu chính là một dòng mới trong đó.
  const taiLichSu = useCallback(async () => {
    setDangTaiLichSu(true);
    try {
      setLichSuItems(await fetchLichSuChamDiemPhieu(id));
    } catch (error) {
      // Thiếu lịch sử không được chặn màn hình chấm - chỉ mất khối tham khảo.
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

  // Phân quyền chấm lấy theo mẫu của phiếu: gọi trước để disable đúng ô, thay vì
  // để người dùng gõ điểm xong mới nhận 403 từ server.
  useEffect(() => {
    if (!phieu?.IdMau) return;
    let huy = false;
    setDangTaiPhanQuyen(true);
    fetchTieuChiDonViCham({ idMau: phieu.IdMau })
      .then((rows) => {
        if (!huy) setPhanQuyenRows(rows);
      })
      .catch((error) => {
        // Không chặn màn hình: thiếu bảng phân quyền thì mọi tiêu chí rơi về quy
        // tắc mặc định (đơn vị chủ quản chấm) - server vẫn là chốt chặn cuối.
        console.error("Lỗi tải phân quyền chấm tiêu chí:", error);
      })
      .finally(() => {
        if (!huy) setDangTaiPhanQuyen(false);
      });
    return () => {
      huy = true;
    };
  }, [phieu?.IdMau]);

  // Bảng tra tiêu chí lấy từ MẪU của phiếu: chi tiết phiếu chỉ có con số điểm,
  // không có danh sách mức để người thẩm định chọn lại, cũng không có loai_nhom
  // để tách điểm cơ bản với vượt trội. Lỗi ở đây không chặn màn hình - hộp thoại
  // chấm rơi về ô nhập điểm tự do như trước.
  useEffect(() => {
    if (!phieu?.IdMau) return undefined;
    let huy = false;
    fetchTieuChiTheoMau(phieu.IdMau)
      .then((map) => {
        if (!huy) setTieuChiMauMap(map);
      })
      .catch((error) => {
        console.error("Lỗi tải chi tiết mẫu đánh giá:", error);
      });
    return () => {
      huy = true;
    };
  }, [phieu?.IdMau]);

  const chamCtx = useMemo(
    () => buildChamContext({ user, phieu, phanQuyenRows, donViList }),
    [user, phieu, phanQuyenRows, donViList],
  );

  const chiTietList = useMemo(() => phieu?.ChiTiet || [], [phieu]);
  // Trưởng phòng chỉ thấy tiêu chí đơn vị mình được giao; TK/TKL thấy cả phiếu.
  // Tiến độ vẫn tính trên danh sách ĐẦY ĐỦ - con số "toàn phiếu" là thứ giải
  // thích vì sao hồ sơ chưa tự chuyển bước, lọc theo vai sẽ báo sai.
  const chiTietHienThi = useMemo(
    () => locTieuChiHienThi(chiTietList, chamCtx),
    [chiTietList, chamCtx],
  );
  const anBotTieuChi = chiTietHienThi.length < chiTietList.length;
  // Số thứ tự luôn là vị trí trong PHIẾU GỐC, không đánh lại theo danh sách đã
  // lọc: "tiêu chí 7" phải là cùng một tiêu chí dù ai đang mở màn hình.
  const sttTheoChiTiet = useMemo(
    () => new Map(chiTietList.map((ct, index) => [ct.IdChiTiet, index + 1])),
    [chiTietList],
  );
  // Xếp rổ MỘT lần rồi dùng lại cho cả chip đếm, bộ lọc lẫn nhóm: phanLoaiDongCham
  // phải tra bảng phân quyền nên không gọi lại khi vẽ từng thẻ.
  const dongDaXepRo = useMemo(
    () =>
      chiTietHienThi.map((ct) => ({ ct, ro: phanLoaiDongCham(ct, chamCtx) })),
    [chiTietHienThi, chamCtx],
  );

  const demTheoRo = useMemo(() => {
    const dem = {};
    dongDaXepRo.forEach(({ ro }) => {
      dem[ro] = (dem[ro] || 0) + 1;
    });
    return dem;
  }, [dongDaXepRo]);

  /**
   * Lọc và gom nhóm chỉ dành cho người nhìn CẢ phiếu (TK/TKL). Trưởng phòng đã
   * được locTieuChiHienThi cắt xuống đúng phần đơn vị mình được giao, nên với họ
   * mọi thẻ đều là việc phải làm - thêm một lớp lọc nữa chỉ là bước thừa và có
   * nguy cơ giấu mất tiêu chí họ đang cần chấm.
   */
  const dungBoLoc = !laTruongPhong(user);

  /**
   * Rổ đang xem: ưu tiên lựa chọn tay, chưa chọn thì mở thẳng vào việc của mình.
   * Trưởng khoa nhìn thấy CẢ phiếu nên vào bằng danh sách phẳng là rối nhất -
   * mặc định này cắt nó xuống đúng phần phải thao tác.
   *
   * Chấm hết phần của mình → rổ CAN_XU_LY rỗng → tự rơi về "Tất cả" để màn hình
   * không trống trơn sau thao tác cuối.
   */
  const roDangXem = !dungBoLoc
    ? "tatCa"
    : (roDaChon ??
      (demTheoRo[RO_VIEC.CAN_XU_LY] > 0 ? RO_VIEC.CAN_XU_LY : "tatCa"));

  const dongTheoBoLoc = useMemo(
    () =>
      roDangXem === "tatCa"
        ? dongDaXepRo
        : dongDaXepRo.filter((d) => d.ro === roDangXem),
    [dongDaXepRo, roDangXem],
  );

  /**
   * Gom theo ĐƠN VỊ ĐƯỢC GIAO để trả lời "ai đang giữ tiêu chí nào" ngay ở tiêu
   * đề nhóm, không phải mở từng thẻ đọc dòng lý do khóa. Nhóm của đơn vị mình
   * luôn đứng đầu và mở sẵn.
   */
  const nhomTheoDonVi = useMemo(() => {
    const map = new Map();
    dongTheoBoLoc.forEach((dong) => {
      const ten =
        tenDonViDuocGiaoCham(dong.ct, chamCtx) || "Chưa xác định đơn vị";
      if (!map.has(ten)) map.set(ten, { ten, cuaToi: false, dong: [] });
      const nhom = map.get(ten);
      nhom.dong.push(dong);
      if (duocChamTieuChi(dong.ct, chamCtx)) nhom.cuaToi = true;
    });
    return [...map.values()].sort((a, b) => {
      if (a.cuaToi !== b.cuaToi) return a.cuaToi ? -1 : 1;
      return a.ten.localeCompare(b.ten, "vi");
    });
  }, [dongTheoBoLoc, chamCtx]);

  /**
   * Tiến độ của TỪNG đơn vị, tính trên toàn bộ dòng của đơn vị đó chứ không theo
   * bộ lọc đang xem: đứng ở rổ "Đã chốt" mà nhóm nào cũng báo 4/4 thì con số vô
   * nghĩa. Mẫu số là tiêu chí CHẤM TAY - giống tinhTienDoCham, vì dòng điểm tự
   * động không phải việc của đơn vị nào.
   *
   * `tuDong` đếm riêng chứ không cộng vào mẫu số: nó là lời giải thích cho khoảng
   * chênh giữa "31 tiêu chí" và "5 tiêu chí chấm tay" của cùng một nhóm, không
   * phải phần việc còn nợ của đơn vị.
   */
  const tienDoTheoDonVi = useMemo(() => {
    const map = new Map();
    dongDaXepRo.forEach(({ ct }) => {
      const ten = tenDonViDuocGiaoCham(ct, chamCtx) || "Chưa xác định đơn vị";
      const muc = map.get(ten) || { tong: 0, xong: 0, tuDong: 0 };
      if (laTieuChiChamTay(ct)) {
        muc.tong += 1;
        if (Number(ct.TrangThaiDong) === TRANG_THAI_DONG.DA_CHOT) muc.xong += 1;
      } else {
        muc.tuDong += 1;
      }
      map.set(ten, muc);
    });
    return map;
  }, [dongDaXepRo, chamCtx]);

  // Rổ "Điểm tự động" không gom theo đơn vị: không đơn vị nào được giao chấm các
  // dòng này, tên nhóm chỉ là giá trị dự phòng (đơn vị chủ quản phiếu) nên bày ra
  // là nói sai rằng có người đang giữ việc.
  const xemDiemTuDong = roDangXem === RO_VIEC.TU_DONG;
  const gomNhom = dungBoLoc && !xemDiemTuDong && nhomTheoDonVi.length > 1;
  const nhomDangMo = (nhom) => nhomGatTay[nhom.ten] ?? nhom.cuaToi;

  const lichSuTheoChiTiet = useMemo(
    () => gomLichSuTheoChiTiet(lichSuItems),
    [lichSuItems],
  );
  const tienDo = useMemo(
    () => tinhTienDoCham(chiTietList, chamCtx),
    [chiTietList, chamCtx],
  );
  // Ba cột tong_diem_* của server chỉ có giá trị sau khi Trưởng khoa chốt hồ sơ,
  // tức là suốt cả bước thẩm định này header sẽ trống. Cộng tạm ở client để
  // người chấm thấy điểm dồn tới đâu - luôn tính trên chiTietList đầy đủ, KHÔNG
  // phải danh sách đã lọc theo phạm vi của người đang xem.
  const tamTinh = useMemo(
    () => tinhTongDiemTamTinh(chiTietList, tieuChiMauMap),
    [chiTietList, tieuChiMauMap],
  );
  const nv = thongTinNhanVien(nhanVienIndex, phieu?.IdNhanVien);

  const dangOBuocThamDinh = phieu?.TrangThai === TRANG_THAI.THAM_DINH;
  const vaiTro = laTruongKhoa(user) ? "truongKhoa" : "thamDinh";

  /**
   * Khung chạy chung cho mọi thao tác cấp dòng.
   *
   * Luôn tải lại phiếu + lịch sử sau khi gọi: thao tác có thể kéo theo đổi trạng
   * thái hồ sơ, và RowVersion đang giữ đã cũ ngay khi server ghi. Đọc lại từ
   * server đơn giản và an toàn hơn là tự vá state theo NewRowVersion ở màn hình
   * chỉ làm việc trên một phiếu.
   */
  const chayThaoTacDong = async (chiTiet, thucHien, thongDiepXong) => {
    setIdDangLuu(chiTiet.IdChiTiet);
    try {
      const { trangThaiPhieu } = await thucHien(phieu.RowVersion);
      await Promise.all([taiPhieu({ imLang: true }), taiLichSu()]);

      if (trangThaiPhieu === TRANG_THAI.CHO_TK_DUYET) {
        showToast(
          "success",
          "Đã thẩm định xong toàn hồ sơ",
          "Đây là tiêu chí cuối cùng chưa chốt - hồ sơ đã tự chuyển sang chờ Trưởng khoa duyệt và rời khỏi hàng đợi thẩm định.",
          7000,
        );
      } else {
        showToast("success", "Thành công", thongDiepXong);
      }
    } catch (error) {
      console.error("Lỗi thao tác thẩm định:", error);
      if (error.isConflict) {
        await taiPhieu({ imLang: true });
        showToast(
          "warn",
          "Dữ liệu đã thay đổi",
          error.message ||
            "Hồ sơ vừa được người khác cập nhật. Màn hình đã tải lại - vui lòng kiểm tra rồi thao tác lại.",
          7000,
        );
      } else {
        showToast("error", "Không thực hiện được", error.message, 6000);
      }
    } finally {
      setIdDangLuu(null);
    }
  };

  const handleLuuDiem = ({ diem, nhanXet }) => {
    const chiTiet = dongSuaDiem;
    setDongSuaDiem(null);
    return chayThaoTacDong(
      chiTiet,
      (rowVersion) =>
        putDiemKhoa(chiTiet.IdChiTiet, { diem, nhanXet, rowVersion }),
      `Đã chốt "${chiTiet.TenTieuChi}" ở mức ${formatDiem(diem)} điểm.`,
    );
  };

  const handleDuyetDong = (chiTiet, { nhanXet }) =>
    chayThaoTacDong(
      chiTiet,
      (rowVersion) => duyetThamDinh(chiTiet.IdChiTiet, { nhanXet, rowVersion }),
      `Đã duyệt "${chiTiet.TenTieuChi}" giữ nguyên ${formatDiem(chiTiet.DiemTuDanhGia)} điểm.`,
    );

  const handleTraVeDong = ({ lyDo }) => {
    const chiTiet = dongTraVe;
    setDongTraVe(null);
    return chayThaoTacDong(
      chiTiet,
      (rowVersion) => traVeThamDinh(chiTiet.IdChiTiet, { lyDo, rowVersion }),
      `Đã trả "${chiTiet.TenTieuChi}" về cho ${nv.hoTen} bổ sung.`,
    );
  };

  const handleTraThamDinh = ({ lyDo }) => {
    const chiTiet = dongTraThamDinh;
    setDongTraThamDinh(null);
    return chayThaoTacDong(
      chiTiet,
      (rowVersion) => traThamDinhLai(chiTiet.IdChiTiet, { lyDo, rowVersion }),
      `Đã trả "${chiTiet.TenTieuChi}" về đơn vị thẩm định chấm lại.`,
    );
  };

  // Thẻ tiêu chí vẽ y hệt nhau ở cả hai kiểu bày (phẳng / gom nhóm theo đơn vị) -
  // giữ một chỗ dựng để hai nhánh không lệch props.
  const veTheTieuChi = (ct) => {
    const choPhepNhap = oNhapDiemMo(ct, chamCtx);
    return (
      <TieuChiChamCard
        key={ct.IdChiTiet}
        chiTiet={ct}
        stt={sttTheoChiTiet.get(ct.IdChiTiet)}
        lichSu={lichSuTheoChiTiet.get(Number(ct.IdChiTiet)) || []}
        dangTaiLichSu={dangTaiLichSu}
        vaiTro={vaiTro}
        choPhepNhap={choPhepNhap}
        choPhepTraThamDinh={traThamDinhDuoc(ct, chamCtx)}
        lyDoKhoa={choPhepNhap ? "" : lyDoKhoaONhap(ct, chamCtx)}
        dangLuu={idDangLuu === ct.IdChiTiet}
        onSuaDiem={setDongSuaDiem}
        onDuyet={handleDuyetDong}
        onTraVe={setDongTraVe}
        onTraThamDinh={setDongTraThamDinh}
        onXemMinhChung={openPreview}
        onTaiMinhChung={downloadMinhChung}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải phiếu đánh giá...
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
              Không mở được phiếu
            </h3>
            <p style={{ margin: "0 0 20px 0" }}>
              {loiTai || "Phiếu không tồn tại."}
            </p>
            <button
              className="btn-cancel"
              style={{ margin: "0 auto" }}
              onClick={() => navigate("/quan-ly/cho-cham")}
            >
              <i className="fa-solid fa-arrow-left"></i> Về hàng đợi chờ chấm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "15px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <button
            className="cd-link-btn"
            style={{ marginBottom: "8px" }}
            onClick={() => navigate("/quan-ly/cho-cham")}
          >
            <i className="fa-solid fa-arrow-left"></i> Hồ sơ chờ thẩm định
          </button>
          <h2
            style={{
              margin: 0,
              color: "#1e293b",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            Thẩm định hồ sơ #{phieu.IdPhieu}
          </h2>
          <span className="breadcrumb">
            Năm học {phieu.IdNam} · Lần đánh giá {phieu.LanDanhGia}
            {phieu.LanMoLai > 0 ? ` · Đã mở lại ${phieu.LanMoLai} lần` : ""}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn-cancel"
            onClick={() =>
              navigate(
                `/quan-ly/giang-vien/${phieu.IdNhanVien}?idNam=${phieu.IdNam}`,
              )
            }
          >
            <i className="fa-solid fa-address-card"></i> Hồ sơ KPI giảng viên
          </button>
          {/* Hồ sơ đã đủ điều kiện chốt thì việc tiếp theo nằm ở màn hình của
              Trưởng khoa - dẫn thẳng sang thay vì bắt người dùng tự tìm. */}
          {vaiTro === "truongKhoa" &&
            phieu.TrangThai === TRANG_THAI.CHO_TK_DUYET && (
              <button
                className="btn-submit"
                onClick={() =>
                  navigate(`/quan-ly/duyet-ho-so/${phieu.IdPhieu}`)
                }
              >
                <i className="fa-solid fa-user-check"></i> Chốt hồ sơ
              </button>
            )}
        </div>
      </div>

      <div className="cd-phieu-header">
        <div className="cd-phieu-top">
          <div>
            <div
              style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}
            >
              {nv.hoTen}
            </div>
            <div
              style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}
            >
              {nv.maNhanVien && (
                <span className="code-pill" style={{ marginRight: "8px" }}>
                  {nv.maNhanVien}
                </span>
              )}
              {nv.tenDonVi || "-"}
              {phieu.TenChucDanh ? ` · ${phieu.TenChucDanh}` : ""}
              {phieu.TenChucVu ? ` · ${phieu.TenChucVu}` : ""}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <TrangThaiBadge trangThai={phieu.TrangThai} />
            <TienDoCham
              xong={tienDo.cuaToi.xong}
              tong={tienDo.cuaToi.tong}
              nhan="Phần đơn vị bạn chấm"
              ghiChu={`Toàn phiếu: ${tienDo.toanPhieu.xong}/${tienDo.toanPhieu.tong} tiêu chí chấm tay`}
            />
          </div>
        </div>

        <div className="cd-meta-grid">
          <TongDiemMeta phieu={phieu} tamTinh={tamTinh} />
          <div>
            <div className="cd-meta-label">Xếp loại</div>
            <div className="cd-meta-value">
              <XepLoaiBadge xepLoai={phieu.XepLoai} />
            </div>
          </div>
          <div>
            <div className="cd-meta-label">Ngày gửi</div>
            <div className="cd-meta-value">{formatNgayGio(phieu.NgayGui)}</div>
          </div>
          <div>
            <div className="cd-meta-label">Cập nhật gần nhất</div>
            <div className="cd-meta-value">
              {formatNgayGio(phieu.NgayCapNhat)}
            </div>
          </div>
        </div>

        {phieu.TongDiemTichLuy == null && tamTinh && (
          <div className="cd-hint">
            <i className="fa-solid fa-circle-info"></i> Hệ thống chỉ lưu tổng
            điểm vào hồ sơ khi Trưởng khoa chốt. Số “tạm tính” do trình duyệt
            cộng từ điểm chính thức của từng tiêu chí
            {tamTinh.soDongChuaChot > 0
              ? `, còn ${tamTinh.soDongChuaChot} tiêu chí chưa chốt điểm.`
              : "."}
          </div>
        )}

        {phieu.NhanXetKhoa && (
          <div className="cd-box" style={{ marginTop: "16px" }}>
            <div className="cd-box-title">Nhận xét của đơn vị</div>
            <div style={{ fontSize: "14px", color: "#334155" }}>
              {phieu.NhanXetKhoa}
            </div>
          </div>
        )}
        {phieu.NhanXetTruong && (
          <div className="cd-box" style={{ marginTop: "10px" }}>
            <div className="cd-box-title">Nhận xét của Hiệu trưởng</div>
            <div style={{ fontSize: "14px", color: "#334155" }}>
              {phieu.NhanXetTruong}
            </div>
          </div>
        )}
      </div>

      {!dangOBuocThamDinh && (
        <div
          className="cd-box"
          style={{
            background: "#eff6ff",
            borderColor: "#bfdbfe",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#1e40af" }}>
            <i
              className="fa-solid fa-circle-info"
              style={{ marginRight: "8px" }}
            ></i>
            Hồ sơ không ở bước <b>thẩm định</b> nên các ô nhập điểm đang khóa.
            Bạn vẫn xem được điểm, minh chứng và lịch sử chấm của từng tiêu chí.
          </div>
        </div>
      )}

      <p className="sub-title" style={{ marginBottom: "12px" }}>
        CHI TIẾT TIÊU CHÍ ({chiTietHienThi.length}
        {anBotTieuChi ? `/${chiTietList.length}` : ""})
      </p>

      {anBotTieuChi && (
        <div
          className="cd-box"
          style={{
            background: "#f8fafc",
            borderColor: "#e2e8f0",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#475569" }}>
            <i
              className="fa-solid fa-filter"
              style={{ marginRight: "8px" }}
            ></i>
            Đang hiển thị {chiTietHienThi.length} tiêu chí đơn vị bạn được phân
            công thẩm định. Các tiêu chí còn lại của hồ sơ do đơn vị khác phụ
            trách.
          </div>
        </div>
      )}

      {/* Chờ có bảng phân quyền rồi mới bày chip: thiếu nó mọi dòng rơi về quy tắc
          mặc định nên số đếm sẽ nhảy ngay sau đó. */}
      {dungBoLoc && !dangTaiPhanQuyen && chiTietHienThi.length > 0 && (
        <div className="cd-loc-bar">
          {Object.values(RO_VIEC)
            .filter((ro) => ro !== RO_VIEC.DON_VI_KHAC && demTheoRo[ro] > 0)
            .map((ro) => (
              <button
                key={ro}
                type="button"
                className={`cd-loc-chip${roDangXem === ro ? " cd-loc-active" : ""}`}
                onClick={() => setRoDaChon(ro)}
              >
                <i className={`fa-solid ${RO_VIEC_META[ro].icon}`}></i>
                {RO_VIEC_META[ro].nhan}
                <b>{demTheoRo[ro]}</b>
              </button>
            ))}
          <button
            type="button"
            className={`cd-loc-chip${roDangXem === "tatCa" ? " cd-loc-active" : ""}`}
            onClick={() => setRoDaChon("tatCa")}
          >
            <i className="fa-solid fa-list"></i>
            Tất cả
            <b>{chiTietHienThi.length}</b>
          </button>
        </div>
      )}

      {/* Nói trước vì sao rổ này không có nút nào và vì sao nó không làm thanh
          tiến độ nhích lên - nếu không, người thẩm định sẽ tưởng mình đang bị
          khóa nhầm. */}
      {xemDiemTuDong && dongTheoBoLoc.length > 0 && (
        <div
          className="cd-box"
          style={{
            background: "#f8fafc",
            borderColor: "#e2e8f0",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#475569" }}>
            <i className="fa-solid fa-robot" style={{ marginRight: "8px" }}></i>
            {dongTheoBoLoc.length} tiêu chí do hệ thống tự tính điểm từ dữ liệu
            đã ghi nhận (website NCKH, phản hồi sinh viên, vi phạm giảng dạy,
            phục vụ cộng đồng,...).
          </div>
        </div>
      )}

      {dangTaiPhanQuyen ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải phân công thẩm định...
          </div>
        </div>
      ) : chiTietHienThi.length === 0 ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-list"></i>
            {chiTietList.length === 0
              ? "Phiếu chưa có tiêu chí nào."
              : "Đơn vị bạn không được phân công thẩm định tiêu chí nào trong hồ sơ này."}
          </div>
        </div>
      ) : dongTheoBoLoc.length === 0 ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-filter-circle-xmark"></i>
            Không có tiêu chí nào trong mục &quot;
            {RO_VIEC_META[roDangXem]?.nhan}&quot;.
            <button
              type="button"
              className="cd-link-btn"
              style={{ marginTop: "10px" }}
              onClick={() => setRoDaChon("tatCa")}
            >
              Xem tất cả {chiTietHienThi.length} tiêu chí
            </button>
          </div>
        </div>
      ) : gomNhom ? (
        nhomTheoDonVi.map((nhom) => {
          const dangMo = nhomDangMo(nhom);
          const td = tienDoTheoDonVi.get(nhom.ten);
          const xongHet = td && td.tong > 0 && td.xong >= td.tong;
          return (
            <div className="cd-nhom-dv" key={nhom.ten}>
              <button
                type="button"
                className="cd-nhom-dv-head"
                onClick={() =>
                  setNhomGatTay((truoc) => ({ ...truoc, [nhom.ten]: !dangMo }))
                }
              >
                <i
                  className={`fa-solid fa-chevron-${dangMo ? "down" : "right"}`}
                ></i>
                <span className="cd-nhom-dv-ten">{nhom.ten}</span>
                {nhom.cuaToi && (
                  <span className="cd-nhom-dv-toi">Đơn vị bạn</span>
                )}
                <span className="cd-nhom-dv-phai">
                  {/* Đơn vị chỉ có dòng điểm tự động thì không có gì để chấm -
                      hiện 0/0 là bịa ra một phần việc không tồn tại. */}
                  {td && td.tong > 0 && (
                    <span
                      className={`cd-nhom-dv-tiendo${xongHet ? " cd-done" : ""}`}
                      title={`${nhom.ten} đã chốt ${td.xong}/${td.tong} tiêu chí chấm tay`}
                    >
                      <span className="cd-nhom-dv-track">
                        <span
                          className="cd-nhom-dv-fill"
                          style={{
                            width: `${Math.round((td.xong / td.tong) * 100)}%`,
                          }}
                        />
                      </span>
                      <b>
                        {td.xong}/{td.tong}
                      </b>
                      đã chốt
                    </span>
                  )}
                  {/* Nói luôn phần máy tự tính để người xem không tưởng đơn vị
                      đang bỏ sót mấy chục dòng chưa ai đụng tới. */}
                  {td && td.tuDong > 0 && (
                    <span
                      className="cd-nhom-dv-tudong"
                      title={`${td.tuDong} tiêu chí do hệ thống tự tính điểm, không ai chấm tay`}
                    >
                      <i className="fa-solid fa-robot"></i>
                      {td.tuDong} tự động
                    </span>
                  )}
                  {/* Đang lọc thì số thẻ bày ra khác tổng của đơn vị - nói rõ
                      "đang hiện" để nó không đá nhau với con số tiến độ. */}
                  <span className="cd-nhom-dv-dem">
                    {roDangXem === "tatCa"
                      ? `${nhom.dong.length} tiêu chí`
                      : `${nhom.dong.length} đang hiện`}
                  </span>
                </span>
              </button>
              {dangMo && nhom.dong.map(({ ct }) => veTheTieuChi(ct))}
            </div>
          );
        })
      ) : (
        dongTheoBoLoc.map(({ ct }) => veTheTieuChi(ct))
      )}

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

      {dongSuaDiem && (
        <SuaDiemModal
          chiTiet={dongSuaDiem}
          thangDiem={tieuChiMauMap.get(Number(dongSuaDiem.IdTieuChi))}
          dangGui={idDangLuu === dongSuaDiem.IdChiTiet}
          onDong={() => setDongSuaDiem(null)}
          onXacNhan={handleLuuDiem}
        />
      )}

      {dongTraVe && (
        <LyDoModal
          tieuDe="Trả tiêu chí về cho giảng viên"
          moTa={`Tiêu chí "${dongTraVe.TenTieuChi}" sẽ quay lại để giảng viên ${nv.hoTen} chỉnh sửa/bổ sung. Các tiêu chí khác giữ nguyên tiến độ và hồ sơ KHÔNG bị đưa về trạng thái nháp.`}
          nhanLyDo="Lý do trả về"
          goiYLyDo="VD: Thiếu bìa tạp chí và trang mục lục cho bài báo số 2..."
          nhanXacNhan="Trả về giảng viên"
          dangGui={idDangLuu === dongTraVe.IdChiTiet}
          onDong={() => setDongTraVe(null)}
          onXacNhan={handleTraVeDong}
        />
      )}

      {dongTraThamDinh && (
        <LyDoModal
          tieuDe="Trả tiêu chí về đơn vị thẩm định"
          moTa={`Tiêu chí "${dongTraThamDinh.TenTieuChi}" sẽ quay về ${dongTraThamDinh.TenDonViThamDinh || "đơn vị đã thẩm định"} để chấm lại. Điểm chính thức của dòng bị xóa.`}
          canhBao="Thao tác này đưa hồ sơ về bước thẩm định và XÓA cả nhóm xếp loại đã chọn (mức Khoa, mức đề xuất, lý do, thứ hạng). Bạn sẽ phải chốt lại hồ sơ từ đầu sau khi tiêu chí được thẩm định xong."
          nhanLyDo="Lý do trả về đơn vị"
          goiYLyDo="VD: Giờ chuẩn tiêu chí C3 lệch với bảng phân công, đề nghị P.ĐT kiểm tra lại."
          nhanXacNhan="Trả về đơn vị"
          dangGui={idDangLuu === dongTraThamDinh.IdChiTiet}
          onDong={() => setDongTraThamDinh(null)}
          onXacNhan={handleTraThamDinh}
        />
      )}
    </div>
  );
};

export default ChamDiemPhieu;
