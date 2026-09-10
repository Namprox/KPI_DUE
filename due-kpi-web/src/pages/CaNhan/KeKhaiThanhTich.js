import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/KeKhaiThanhTich.css";
import SearchSelect from "../../components/Common/SearchSelect";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import MinhChungDongThanhTichBox from "../../components/KeKhaiThanhTich/MinhChungDongThanhTichBox";
import DanhMucThanhTichModal from "../../components/KeKhaiThanhTich/DanhMucThanhTichModal";
import TongHopLoaiPanel from "../../components/KeKhaiThanhTich/TongHopLoaiPanel";
import DongCoVanDeBanner from "../../components/KeKhaiThanhTich/DongCoVanDeBanner";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useMinhChungThanhTichPreview } from "../../hooks/useMinhChungThanhTichPreview";
import { formatNgayGio } from "../../utils/phieuApi";
import {
  biTraLai,
  choPhepHuyNop,
  choPhepNop,
  choPhepSua,
  daChot,
  formatDiem,
  huyNopBanKe,
  layBanKeCuaToi,
  layCayThanhTich,
  luuChiTiet,
  nopBanKe,
  QUY_OPTIONS,
  themMinhChung,
  thieuMinhChung,
  tenQuy,
  tinhDiem,
  TRANG_THAI_DONG_TT,
  TRANG_THAI_DONG_TT_META,
  TRANG_THAI_KE_KHAI_META,
} from "../../utils/keKhaiThanhTichApi";

let seqKey = 0;
const dongMoi = () => ({
  key: `moi-${++seqKey}`,
  idChiTiet: null,
  idMuc: "",
  quy: "",
  ngayDatDuoc: "",
  tenThanhTich: "",
  soQuyetDinh: "",
  coQuanCap: "",
  soLuong: "1",
  moTa: "",
  minhChung: [],
  mcCho: [],
});

/** Dòng từ server → dòng của form. Giữ `IdChiTiet` để server nhận ra là sửa. */
const tuChiTiet = (ct) => ({
  key: `ct-${ct.IdChiTiet}`,
  idChiTiet: ct.IdChiTiet,
  idMuc: String(ct.IdMuc ?? ""),
  quy: ct.Quy != null ? String(ct.Quy) : "",
  // Server trả date-only nhưng vẫn có thể kèm phần giờ; <input type="date"> chỉ
  // nhận đúng "YYYY-MM-DD" nên cắt tại đây, không đổi sang Date rồi format lại
  // (đi qua Date là tự chuốc lệch múi giờ).
  ngayDatDuoc: ct.NgayDatDuoc ? String(ct.NgayDatDuoc).slice(0, 10) : "",
  tenThanhTich: ct.TenThanhTich ?? "",
  soQuyetDinh: ct.SoQuyetDinh ?? "",
  coQuanCap: ct.CoQuanCap ?? "",
  soLuong: ct.SoLuong != null ? String(ct.SoLuong) : "",
  moTa: ct.MoTa ?? "",
  minhChung: ct.MinhChung || [],
  mcCho: [],
});

/** Chữ ký so sánh để biết form có thay đổi chưa lưu hay không. */
const chuKy = (rows) =>
  JSON.stringify(
    rows.map((r) => [
      r.idChiTiet,
      r.idMuc,
      r.quy,
      r.ngayDatDuoc,
      r.tenThanhTich,
      r.soQuyetDinh,
      r.coQuanCap,
      String(r.soLuong).trim(),
      r.moTa,
      // Tệp đang chờ cũng là thay đổi chưa lưu: quên nó thì nút Lưu tắt và
      // người dùng nộp bản kê thiếu minh chứng mà không hay biết.
      (r.mcCho || []).map((m) => m.key).join(","),
    ]),
  );

const BadgeTrangThai = ({ meta, ghiChu }) => {
  if (!meta) return <span className="kkt-trong">-</span>;
  return (
    <span
      className="cd-status-badge"
      style={{
        background: meta.bg,
        color: meta.color,
        borderColor: meta.border,
      }}
      title={ghiChu || undefined}
    >
      <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
    </span>
  );
};

/**
 * Kê khai THÀNH TÍCH VƯỢT TRỘI (Nhóm II) - phía VIÊN CHỨC / NGƯỜI LAO ĐỘNG.
 *
 * Nhân viên tự kê từng thành tích đạt được trong năm (sáng kiến, khen thưởng,
 * hoàn thành khoá đào tạo, tham gia phong trào), đơn vị phụ trách duyệt TỪNG
 * DÒNG rồi chốt; điểm đã duyệt chảy vào phiếu KPI qua bốn mã công thức TTVT_*.
 *
 * Năm quy ước nghiệp vụ mà giao diện phải phản ánh đúng:
 *
 *  - **Không bao giờ nhập điểm.** Ô nhập là SỐ LƯỢNG; cột "Điểm dự kiến" lúc
 *    đang gõ chỉ là con số tính tại chỗ. Số vào KPI lại càng khác: đó là
 *    `DiemDuocTinh` trong panel trần điểm, đã khử trùng và cắt trần.
 *  - **Một form, một lần lưu.** Gỡ dòng ở đây chỉ là bỏ dòng khỏi bảng; nó chỉ
 *    thực sự mất khi bấm Lưu (server tự tính diff theo danh sách gửi lên).
 *  - **Minh chứng là BẮT BUỘC** với mức có `YeuCauMinhChung` - khác hẳn kê khai
 *    giờ quy đổi. Dòng chưa lưu vẫn chọn được tệp: chúng nằm ở hàng chờ và tự
 *    tải lên ngay sau khi lưu, vì endpoint upload cần IdChiTiet do server cấp.
 *  - **Vượt trần vẫn lưu được.** Bảng KPI ghi "Điểm tối đa 30" chứ không ghi
 *    "chỉ được kê 30" - kê 4 sáng kiến cấp Bộ là hợp lệ, phần vượt chỉ không
 *    được tính. Cảnh báo trên panel là THÔNG TIN, không chặn thao tác nào.
 *  - **Nộp là mốc khoá ghi.** Sau khi nộp không sửa được; huỷ nộp chỉ còn hiệu
 *    lực khi CHƯA đơn vị duyệt nào xét dòng nào - mà bản kê có thể do nhiều đơn
 *    vị cùng duyệt, nên "chưa ai xét" khó đoán hơn ở module giờ quy đổi.
 *
 * Thêm dòng đi qua ĐÚNG MỘT lối: nút "Kê khai thành tích" mở danh mục rồi chọn
 * mức. Cố ý bỏ nút "Thêm dòng trống" - dòng không trỏ tới mức nào thì không lưu
 * được, tạo ra nó chỉ để người dùng tự đi tìm đường sửa.
 *
 * Quyền thao tác lấy từ cờ `ChoPhepSua` / `ChoPhepNop` do server tính sẵn.
 */
const KeKhaiThanhTich = () => {
  const toast = useRef(null);
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [banKe, setBanKe] = useState(null);
  const [danhMuc, setDanhMuc] = useState([]);
  const [rows, setRows] = useState([]);
  const [goc, setGoc] = useState("[]");
  const [isLoading, setIsLoading] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [dangNop, setDangNop] = useState(false);
  const [loi, setLoi] = useState("");
  const [moDanhMuc, setMoDanhMuc] = useState(false);
  // Dòng thiếu minh chứng mà server chỉ mặt khi từ chối lệnh Nộp
  const [dongThieuMc, setDongThieuMc] = useState([]);

  const showToast = useCallback((severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  }, []);

  const baoLoi = useCallback(
    (message) => showToast("error", "Lỗi", message),
    [showToast],
  );
  const baoOk = useCallback(
    (message) => showToast("success", "Thành công", message),
    [showToast],
  );

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungThanhTichPreview(baoLoi);

  /** Nhận bản kê mới từ mọi endpoint và đồng bộ lại bảng + mốc so sánh. */
  const apDungBanKe = useCallback((item) => {
    setBanKe(item);
    const moi = (item?.ChiTiet || []).map(tuChiTiet);
    setRows(moi);
    setGoc(chuKy(moi));
  }, []);

  const taiDuLieu = useCallback(async () => {
    if (!selectedNam) return;

    setIsLoading(true);
    setLoi("");
    setDongThieuMc([]);
    try {
      // KHÔNG truyền chiLa: picker cần cả nút gốc để dựng cột điều hướng bên
      // trái, lọc `LaLa` ở phía màn hình rẻ hơn gọi endpoint hai lần.
      const [item, cay] = await Promise.all([
        layBanKeCuaToi(selectedNam),
        layCayThanhTich({ chiHoatDong: true }),
      ]);
      apDungBanKe(item);
      setDanhMuc(cay);
    } catch (error) {
      console.error("Lỗi tải bản kê thành tích:", error);
      setBanKe(null);
      setRows([]);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [selectedNam, apDungBanKe]);

  useEffect(() => {
    if (!dangTaiNam) taiDuLieu();
  }, [dangTaiNam, taiDuLieu]);

  const mucById = useMemo(() => {
    const map = new Map();
    danhMuc.forEach((m) => map.set(String(m.IdMuc), m));
    return map;
  }, [danhMuc]);

  const suaDuoc = choPhepSua(banKe);
  const coThayDoi = chuKy(rows) !== goc;

  const capNhatDong = (key, thayDoi) =>
    setRows((truoc) =>
      truoc.map((r) => (r.key === key ? { ...r, ...thayDoi } : r)),
    );

  const goDong = (key) =>
    setRows((truoc) => truoc.filter((r) => r.key !== key));

  /**
   * Chặn sớm những lỗi server sẽ trả 400 và HUỶ TOÀN BỘ lần lưu - rẻ hơn nhiều
   * so với để người dùng mất cả bảng vì một dòng bỏ trống.
   *
   * `Quy` nằm trong danh sách vì nó BẮT BUỘC ở module này (khác `KyHoc` của giờ
   * quy đổi vốn cho phép để trống nghĩa là "cả năm").
   */
  const kiemTraTruocKhiLuu = () => {
    const thieuMuc = rows.filter((r) => !r.idMuc).length;
    if (thieuMuc > 0) return `Còn ${thieuMuc} dòng chưa chọn mức thành tích`;

    const thieuQuy = rows.filter((r) => !r.quy).length;
    if (thieuQuy > 0) return `Còn ${thieuQuy} dòng chưa chọn quý`;

    const thieuTen = rows.filter((r) => !r.tenThanhTich?.trim()).length;
    if (thieuTen > 0) return `Còn ${thieuTen} dòng chưa nhập tên thành tích`;

    const saiSoLuong = rows.filter((r) => !(Number(r.soLuong) > 0)).length;
    if (saiSoLuong > 0) {
      return `Còn ${saiSoLuong} dòng có số lượng không hợp lệ (phải lớn hơn 0)`;
    }
    return null;
  };

  /**
   * Ghép dòng đang chờ tệp với `IdChiTiet` server vừa cấp sau khi lưu.
   *
   * Server trả về cả bản kê chứ không trả bản đồ "dòng gửi lên → id", nên phải
   * tự dò: chỉ xét những `IdChiTiet` CHƯA từng thấy trước lúc lưu, rồi khớp lần
   * lượt theo mức + quý + tên thành tích và tiêu thụ mỗi id đúng một lần - kê
   * hai dòng cùng một mức vẫn ra đúng id cho từng dòng.
   */
  const ghepIdChoDongMoi = (rowsCanTai, chiTietMoi, idCu) => {
    const conTrong = (chiTietMoi || []).filter(
      (ct) => !idCu.has(Number(ct.IdChiTiet)),
    );
    const daDung = new Set();

    return rowsCanTai.map((r) => {
      if (r.idChiTiet) return { row: r, idChiTiet: r.idChiTiet };

      const chuaDung = (ct) => !daDung.has(ct.IdChiTiet);
      const cungMuc = (ct) =>
        chuaDung(ct) && Number(ct.IdMuc) === Number(r.idMuc);

      const khop =
        conTrong.find(
          (ct) =>
            cungMuc(ct) &&
            String(ct.Quy ?? "") === String(r.quy ?? "") &&
            String(ct.TenThanhTich ?? "").trim() ===
              String(r.tenThanhTich ?? "").trim(),
        ) || conTrong.find(cungMuc);

      if (khop) daDung.add(khop.IdChiTiet);
      return { row: r, idChiTiet: khop?.IdChiTiet ?? null };
    });
  };

  /**
   * Tải các tệp đang chờ lên đúng dòng của chúng, sau khi lưu xong.
   *
   * Trả kèm danh sách tệp còn lại để dòng nào tải hỏng thì tệp vẫn nằm ở hàng
   * chờ chứ không biến mất cùng lần đọc lại bản kê.
   */
  const taiMinhChungCho = async (rowsCanTai, item) => {
    const idCu = new Set(
      rows.map((r) => Number(r.idChiTiet)).filter((id) => id > 0),
    );
    const cap = ghepIdChoDongMoi(rowsCanTai, item?.ChiTiet, idCu);

    let soOk = 0;
    const conLai = new Map();
    const loiTep = [];

    for (const { row, idChiTiet } of cap) {
      if (!idChiTiet) {
        conLai.set(row.key, row.mcCho);
        loiTep.push(...row.mcCho.map((m) => m.file.name));
        continue;
      }
      const hong = [];
      for (const m of row.mcCho) {
        try {
          await themMinhChung(idChiTiet, m.file, m.tenHienThi);
          soOk += 1;
        } catch (error) {
          console.error("Lỗi tải minh chứng đang chờ:", error);
          hong.push(m);
          loiTep.push(m.file.name);
        }
      }
      if (hong.length > 0) conLai.set(idChiTiet, hong);
    }

    return { soOk, conLai, loiTep };
  };

  /**
   * Lưu bảng rồi tải nốt tệp đang chờ. Trả về bản kê mới nhất (null nếu hỏng)
   * để "Nộp" dùng ngay được `RowVersion` mà không phải đợi state cập nhật.
   */
  const thucHienLuu = async () => {
    const loiForm = kiemTraTruocKhiLuu();
    if (loiForm) {
      showToast("warn", "Chưa lưu được", loiForm);
      return null;
    }

    const rowsCanTai = rows.filter((r) => (r.mcCho || []).length > 0);

    setDangLuu(true);
    let ketQua = null;
    try {
      let item = await luuChiTiet(
        selectedNam,
        rows.map((r) => ({
          IdChiTiet: r.idChiTiet ?? null,
          IdMuc: Number(r.idMuc),
          Quy: Number(r.quy),
          // Giữ nguyên chuỗi 'YYYY-MM-DD' của <input type="date">, không đổi
          // sang ISO để tránh lệch một ngày do múi giờ.
          NgayDatDuoc: r.ngayDatDuoc || null,
          TenThanhTich: r.tenThanhTich.trim(),
          SoQuyetDinh: r.soQuyetDinh?.trim() || null,
          CoQuanCap: r.coQuanCap?.trim() || null,
          SoLuong: Number(r.soLuong),
          MoTa: r.moTa?.trim() || null,
        })),
      );

      let conLai = new Map();
      let soTep = 0;
      let loiTep = [];
      if (rowsCanTai.length > 0) {
        const kq = await taiMinhChungCho(rowsCanTai, item);
        conLai = kq.conLai;
        soTep = kq.soOk;
        loiTep = kq.loiTep;
        // Đọc lại để bảng hiện đúng minh chứng server đang giữ - và để
        // `SoDongThieuMinhChung` (cơ sở tắt/bật nút Nộp) tự đúng trở lại.
        if (kq.soOk > 0) item = await layBanKeCuaToi(selectedNam);
      }

      apDungBanKe(item);
      setDongThieuMc([]);
      if (conLai.size > 0) {
        setRows((truoc) =>
          truoc.map((r) => {
            const con = conLai.get(r.idChiTiet) || conLai.get(r.key);
            return con ? { ...r, mcCho: con } : r;
          }),
        );
      }

      ketQua = item;
      baoOk(
        `Đã lưu ${item?.SoDong ?? rows.length} dòng kê khai` +
          (soTep > 0 ? `, đính kèm ${soTep} tệp minh chứng` : ""),
      );
      if (loiTep.length > 0) {
        baoLoi(
          `Không tải lên được ${loiTep.length} tệp (${loiTep.join(", ")}) - tệp vẫn nằm ở hàng chờ, hãy bấm Lưu lại.`,
        );
      }
    } catch (error) {
      console.error("Lỗi lưu bản kê thành tích:", error);
      baoLoi(error.message);
    }
    setDangLuu(false);
    return ketQua;
  };

  const luu = () => thucHienLuu();

  const nop = async () => {
    const loiNhac = coThayDoi
      ? "Bản kê còn thay đổi chưa lưu - hệ thống sẽ lưu (kèm tệp minh chứng đang chờ) rồi nộp luôn.\n\n"
      : "";
    if (
      !window.confirm(
        loiNhac +
          "Nộp bản kê cho đơn vị phụ trách duyệt? Sau khi nộp bạn sẽ không sửa được nữa.",
      )
    ) {
      return;
    }

    // Nộp là mốc khoá ghi nên phải nộp đúng bản vừa lưu: lấy `RowVersion` từ
    // kết quả trả về, state `banKe` lúc này vẫn còn là bản cũ. Việc lưu trước
    // còn quan trọng hơn ở module này - tệp trong hàng chờ phải lên server
    // TRƯỚC khi server tính `SoDongThieuMinhChung`.
    let hienTai = banKe;
    if (coThayDoi) {
      hienTai = await thucHienLuu();
      if (!hienTai) return;
    }

    setDangNop(true);
    try {
      const item = await nopBanKe(selectedNam, hienTai?.RowVersion);
      apDungBanKe(item);
      setDongThieuMc([]);
      baoOk("Đã nộp bản kê, đang chờ đơn vị phụ trách duyệt");
    } catch (error) {
      console.error("Lỗi nộp bản kê thành tích:", error);
      // THIEU_MINH_CHUNG là lỗi DUY NHẤT server chỉ đích danh được dòng nào -
      // hiện banner để bấm vào là cuộn tới, thay vì bắt người dùng tự dò.
      if (error.errorCode === "THIEU_MINH_CHUNG") {
        setDongThieuMc(error.dongCoVanDe || []);
        showToast("warn", "Chưa nộp được", error.message);
      } else {
        if (error.errorCode === "CONCURRENCY_CONFLICT") await taiDuLieu();
        baoLoi(error.message);
      }
    }
    setDangNop(false);
  };

  const huyNop = async () => {
    if (!window.confirm("Huỷ nộp để sửa lại bản kê?")) return;

    setDangNop(true);
    try {
      const item = await huyNopBanKe(selectedNam, banKe?.RowVersion);
      apDungBanKe(item);
      baoOk("Đã huỷ nộp, bạn có thể sửa tiếp");
    } catch (error) {
      console.error("Lỗi huỷ nộp bản kê thành tích:", error);
      baoLoi(error.message);
    }
    setDangNop(false);
  };

  /** Cuộn tới dòng server vừa chỉ mặt trong banner. */
  const cuonToiDong = (idChiTiet) => {
    const el = document.getElementById(`kkt-dong-${idChiTiet}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /**
   * Tổng điểm DỰ KIẾN của bảng đang gõ.
   *
   * ⚠️ Con số này KHÁC điểm vào KPI ngay khi có tiêu chí vượt trần hoặc có khen
   * thưởng trùng nội dung. Nhãn ở chân bảng phải nói rõ "trước khi áp trần",
   * còn con số thật nằm ở TongHopLoaiPanel phía trên.
   */
  const tongDuKien = useMemo(
    () =>
      rows.reduce((tong, r) => {
        const muc = mucById.get(String(r.idMuc));
        const diem = muc ? tinhDiem(r.soLuong, muc.DiemQuyDoi) : null;
        return tong + (diem || 0);
      }, 0),
    [rows, mucById],
  );

  const soDongTuChoi = useMemo(
    () =>
      (banKe?.ChiTiet || []).filter(
        (ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG_TT.TU_CHOI,
      ).length,
    [banKe],
  );

  const idThieuMc = useMemo(
    () => new Set(dongThieuMc.map((d) => Number(d.IdChiTiet))),
    [dongThieuMc],
  );

  const metaTrangThai = TRANG_THAI_KE_KHAI_META[banKe?.TrangThai];
  const thieuMc = thieuMinhChung(banKe);

  const renderBangSua = () => (
    <div className="modern-table-card kkt-bang-card">
      <div className="table-scroll">
        <table className="custom-table kkt-bang kkt-bang-sua">
          <thead>
            <tr>
              <th style={{ width: "44px", textAlign: "center" }}>#</th>
              <th style={{ width: "34%" }}>Mức thành tích</th>
              <th style={{ width: "150px" }}>Quý</th>
              <th style={{ width: "120px" }}>Số lượng</th>
              <th style={{ width: "115px", textAlign: "right" }}>
                Điểm dự kiến
              </th>
              <th style={{ width: "48px", textAlign: "center" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const muc = mucById.get(String(r.idMuc));
              // Ô trống phải hiện "-": Number("") = 0 nên tính thẳng sẽ ra
              // "0 điểm", đọc như thể đã quy đổi xong trong khi chưa nhập gì.
              const coSoLuong = String(r.soLuong).trim() !== "";
              const diem =
                muc && coSoLuong ? tinhDiem(r.soLuong, muc.DiemQuyDoi) : null;
              const soSai = coSoLuong && !(Number(r.soLuong) > 0);
              // Mức không cho nhập số lượng thì server ép về 1 - khoá ô lại cho
              // khớp, kèm title giải thích, thay vì để người dùng gõ rồi mất.
              const khoaSoLuong = muc ? muc.ChoPhepSoLuong === false : false;
              const biChiMat = r.idChiTiet && idThieuMc.has(Number(r.idChiTiet));

              return (
                <React.Fragment key={r.key}>
                  <tr
                    id={r.idChiTiet ? `kkt-dong-${r.idChiTiet}` : undefined}
                    className={biChiMat ? "kkt-row-loi" : undefined}
                  >
                    <td className="kkt-stt-cell" rowSpan={2}>
                      <div className="kkt-stt-box">{i + 1}</div>
                    </td>
                    <td>
                      {muc ? (
                        <>
                          <div className="kkt-dv-ten">{muc.TenMuc}</div>
                          <div className="kkt-diem-muc">
                            <i className="fa-solid fa-calculator"></i>{" "}
                            {formatDiem(muc.DiemQuyDoi)} điểm
                            {muc.ChoPhepSoLuong ? " / đơn vị" : ""}
                            {" · "}
                            <i className="fa-solid fa-user-check"></i>{" "}
                            {muc.TenDonVi || "Đơn vị quản lý trực tiếp"}
                          </div>
                        </>
                      ) : (
                        <div className="cd-hint cd-hint-error kkt-hint">
                          <i className="fa-solid fa-triangle-exclamation"></i>{" "}
                          Mức này không còn trong danh mục đang hoạt động - hãy
                          gỡ dòng rồi kê khai lại.
                        </div>
                      )}
                    </td>
                    <td className="kkt-cell-kyhoc">
                      <SearchSelect
                        value={r.quy}
                        onChange={(v) => capNhatDong(r.key, { quy: v })}
                        options={QUY_OPTIONS}
                        placeholder="— Chọn quý —"
                        disabled={dangLuu}
                        portal
                      />
                    </td>
                    <td className="kkt-cell-soluong">
                      <div className="kkt-sl-o">
                        <input
                          type="number"
                          className="form-input kkt-so"
                          min="0"
                          value={khoaSoLuong ? "1" : r.soLuong}
                          onChange={(e) =>
                            capNhatDong(r.key, { soLuong: e.target.value })
                          }
                          placeholder="0"
                          disabled={dangLuu || khoaSoLuong}
                          title={
                            khoaSoLuong
                              ? "Mức này luôn tính 1 đơn vị cho mỗi dòng - mỗi lần đạt được hãy kê thành một dòng riêng."
                              : undefined
                          }
                        />
                      </div>
                      {soSai && (
                        <div className="cd-hint cd-hint-error kkt-hint">
                          Phải lớn hơn 0
                        </div>
                      )}
                    </td>
                    <td className="table-num kkt-diem-cell">
                      <div className="kkt-diem-box">
                        {diem == null ? (
                          <span className="kkt-trong">-</span>
                        ) : (
                          <span className="kkt-diem-val">
                            {formatDiem(diem)}{" "}
                            <span className="kkt-diem-dv">điểm</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="kkt-act-cell">
                      <div className="kkt-act-box">
                        <button
                          type="button"
                          className="action-btn delete-btn"
                          onClick={() => goDong(r.key)}
                          disabled={dangLuu}
                          title="Gỡ dòng này (chỉ mất hẳn sau khi bấm Lưu)"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Hàng 2: tám trường không vừa một dòng bảng nên phần còn
                      lại nằm ở lưới con full-width, vẫn trong cùng một dòng
                      logic của bảng. */}
                  <tr className={biChiMat ? "kkt-row-loi" : undefined}>
                    <td className="kkt-dong2-cell" colSpan={5}>
                      <div className="kkt-dong2">
                        <div className="kkt-dong2-o kkt-dong2-rong">
                          <label className="kkt-dong2-nhan">
                            Tên thành tích *
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            maxLength={500}
                            value={r.tenThanhTich}
                            onChange={(e) =>
                              capNhatDong(r.key, {
                                tenThanhTich: e.target.value,
                              })
                            }
                            placeholder="Tên sáng kiến / danh hiệu / khoá học / sự kiện..."
                            disabled={dangLuu}
                          />
                        </div>

                        <div className="kkt-dong2-o">
                          <label className="kkt-dong2-nhan">Ngày đạt được</label>
                          <input
                            type="date"
                            className="form-input"
                            value={r.ngayDatDuoc}
                            onChange={(e) =>
                              capNhatDong(r.key, {
                                ngayDatDuoc: e.target.value,
                              })
                            }
                            disabled={dangLuu}
                          />
                        </div>

                        <div className="kkt-dong2-o">
                          <label className="kkt-dong2-nhan">Số quyết định</label>
                          <input
                            type="text"
                            className="form-input"
                            maxLength={100}
                            value={r.soQuyetDinh}
                            onChange={(e) =>
                              capNhatDong(r.key, {
                                soQuyetDinh: e.target.value,
                              })
                            }
                            disabled={dangLuu}
                          />
                        </div>

                        <div className="kkt-dong2-o">
                          <label className="kkt-dong2-nhan">Cơ quan cấp</label>
                          <input
                            type="text"
                            className="form-input"
                            maxLength={255}
                            value={r.coQuanCap}
                            onChange={(e) =>
                              capNhatDong(r.key, { coQuanCap: e.target.value })
                            }
                            disabled={dangLuu}
                          />
                        </div>

                        <div className="kkt-dong2-o kkt-dong2-rong">
                          <label className="kkt-dong2-nhan">Mô tả</label>
                          <textarea
                            className="form-input kkt-mota"
                            rows={2}
                            maxLength={1000}
                            value={r.moTa}
                            onChange={(e) =>
                              capNhatDong(r.key, { moTa: e.target.value })
                            }
                            placeholder="Nội dung cụ thể (tuỳ chọn)"
                            disabled={dangLuu}
                          />
                        </div>

                        <div className="kkt-dong2-o kkt-dong2-rong">
                          <label className="kkt-dong2-nhan">Minh chứng</label>
                          <MinhChungDongThanhTichBox
                            idChiTiet={r.idChiTiet}
                            danhSach={r.minhChung}
                            mcCho={r.mcCho}
                            choPhepSua={suaDuoc}
                            yeuCauMinhChung={muc?.YeuCauMinhChung}
                            onChange={(ds) =>
                              capNhatDong(r.key, { minhChung: ds })
                            }
                            onChangeCho={(ds) =>
                              capNhatDong(r.key, { mcCho: ds })
                            }
                            onXem={openPreview}
                            onTai={downloadMinhChung}
                            onError={baoLoi}
                            onSuccess={baoOk}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total-row">
              <td colSpan={4} className="kkt-tfoot-label">
                Tổng <strong>{rows.length}</strong> dòng - điểm dự kiến{" "}
                <span style={{ fontWeight: 500, color: "#94a3b8" }}>
                  (trước khi áp trần và khử trùng)
                </span>
                :
              </td>
              <td className="table-num kkt-diem kkt-tfoot-diem">
                <div className="kkt-diem-box">
                  <b>{formatDiem(tongDuKien)}</b>{" "}
                  <span className="kkt-diem-dv">điểm</span>
                </div>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  const renderBangXem = () => (
    <div className="modern-table-card kkt-bang-card">
      <div className="table-scroll">
        <table className="custom-table kkt-bang" style={{ minWidth: "1150px" }}>
          <thead>
            <tr>
              <th style={{ width: "44px", textAlign: "center" }}>#</th>
              <th style={{ width: "32%" }}>Thành tích</th>
              <th style={{ width: "110px" }}>Quý</th>
              <th style={{ width: "100px", textAlign: "right" }}>Bạn kê</th>
              <th style={{ width: "105px", textAlign: "right" }}>Điểm kê</th>
              <th style={{ width: "100px", textAlign: "right" }}>Duyệt</th>
              <th style={{ width: "105px", textAlign: "right" }}>Điểm duyệt</th>
              <th style={{ width: "22%" }}>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {(banKe?.ChiTiet || []).map((ct, i) => {
              const meta = TRANG_THAI_DONG_TT_META[ct.TrangThaiDong];
              const biSua =
                ct.SoLuongDuyet != null &&
                Number(ct.SoLuongDuyet) !== Number(ct.SoLuong);

              return (
                <tr key={ct.IdChiTiet} id={`kkt-dong-${ct.IdChiTiet}`}>
                  <td className="kkt-stt-cell">
                    <div className="kkt-stt-box">{i + 1}</div>
                  </td>
                  <td>
                    <div className="kkt-ten-cv">{ct.TenThanhTich}</div>
                    <div className="kkt-diem-muc">
                      <i className="fa-solid fa-layer-group"></i> {ct.TenMuc}
                      {" · "}
                      <i className="fa-solid fa-user-check"></i>{" "}
                      {ct.TenDonViDuyet || "Đơn vị quản lý trực tiếp"}
                    </div>
                    {(ct.SoQuyetDinh || ct.CoQuanCap || ct.NgayDatDuoc) && (
                      <div className="kkt-mo-ta">
                        {[
                          ct.SoQuyetDinh && `QĐ ${ct.SoQuyetDinh}`,
                          ct.CoQuanCap,
                          ct.NgayDatDuoc &&
                            String(ct.NgayDatDuoc).slice(0, 10),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                    {ct.MoTa && <div className="kkt-mo-ta">{ct.MoTa}</div>}
                    {(ct.MinhChung || []).length > 0 && (
                      <div className="kkt-mc-list">
                        {ct.MinhChung.map((mc) => (
                          <button
                            key={mc.IdMinhChungTt}
                            type="button"
                            className="cd-link-btn"
                            onClick={() => openPreview(mc)}
                          >
                            <i className="fa-solid fa-file-pdf"></i>{" "}
                            {mc.TenHienThi || mc.TenFileGoc}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>{tenQuy(ct.Quy)}</td>
                  <td className="table-num">{formatDiem(ct.SoLuong)}</td>
                  <td className="table-num kkt-diem">
                    {formatDiem(ct.DiemKeKhai)}
                  </td>
                  <td className="table-num">
                    {ct.SoLuongDuyet == null ? (
                      <span className="kkt-trong">-</span>
                    ) : (
                      <span className={biSua ? "kkt-sua-so" : undefined}>
                        {formatDiem(ct.SoLuongDuyet)}
                      </span>
                    )}
                  </td>
                  <td className="table-num kkt-diem">
                    {ct.DiemDuyet == null ? (
                      <span className="kkt-trong">-</span>
                    ) : (
                      <b>{formatDiem(ct.DiemDuyet)}</b>
                    )}
                  </td>
                  <td>
                    <BadgeTrangThai meta={meta} />
                    {ct.TenNguoiDuyetDong && (
                      <div className="kkt-mo-ta">
                        {ct.TenNguoiDuyetDong}
                        {ct.NgayDuyetDong
                          ? `, ${formatNgayGio(ct.NgayDuyetDong)}`
                          : ""}
                      </div>
                    )}
                    {ct.NhanXetDuyet && (
                      <div className="kkt-nhan-xet">
                        <i className="fa-solid fa-comment-dots"></i>{" "}
                        {ct.NhanXetDuyet}
                      </div>
                    )}
                    {biSua && (
                      <div className="cd-hint cd-hint-warn kkt-hint">
                        Người duyệt đã sửa số lượng từ {formatDiem(ct.SoLuong)}{" "}
                        xuống {formatDiem(ct.SoLuongDuyet)}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total-row">
              <td colSpan={4} className="kkt-tfoot-label">
                Tổng cộng <strong>{banKe?.SoDong ?? 0}</strong> dòng:
              </td>
              <td className="table-num kkt-diem">
                <div className="kkt-diem-box">
                  <b>{formatDiem(banKe?.TongDiemKeKhai)}</b>{" "}
                  <span className="kkt-diem-dv">điểm</span>
                </div>
              </td>
              <td></td>
              <td className="table-num kkt-diem">
                <div className="kkt-diem-box">
                  <b>{formatDiem(banKe?.TongDiemDuyet)}</b>{" "}
                  <span className="kkt-diem-dv">điểm</span>
                </div>
              </td>
              <td className="kkt-tong-ghi-chu">
                <i className="fa-solid fa-circle-info"></i> Vào KPI:{" "}
                <strong>{formatDiem(banKe?.TongDiemDuocTinh)}</strong> điểm (sau
                khử trùng và áp trần)
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  const renderNoiDung = () => {
    if ((isLoading || dangTaiNam) && !banKe) {
      return (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải bản kê khai...
          </div>
        </div>
      );
    }

    if (loi) {
      return (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không tải được dữ liệu
            </h3>
            <p style={{ margin: 0 }}>{loi}</p>
          </div>
        </div>
      );
    }

    if (!banKe) return null;

    return (
      <div
        style={{
          opacity: isLoading ? 0.55 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        <div className="stat-card-grid">
          <div className="stat-card">
            <div className="stat-icon-box stat-icon-green">
              <i className="fa-solid fa-trophy"></i>
            </div>
            <div>
              <div className="stat-label">Điểm được tính vào KPI</div>
              <div className="stat-value" style={{ color: "#047857" }}>
                {formatDiem(banKe.TongDiemDuocTinh)}
              </div>
              <div className="cd-hint" style={{ marginTop: 0 }}>
                sau khử trùng và áp trần
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box stat-icon-blue">
              <i className="fa-solid fa-pen-to-square"></i>
            </div>
            <div>
              <div className="stat-label">Điểm bạn đã kê</div>
              <div className="stat-value">
                {formatDiem(banKe.TongDiemKeKhai)}
              </div>
              <div className="cd-hint" style={{ marginTop: 0 }}>
                đã duyệt {formatDiem(banKe.TongDiemDuyet)}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box stat-icon-purple">
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div>
              <div className="stat-label">Số dòng kê khai</div>
              <div className="stat-value">{banKe.SoDong ?? rows.length}</div>
              {soDongTuChoi > 0 && (
                <div className="cd-hint" style={{ marginTop: 0 }}>
                  {soDongTuChoi} dòng bị từ chối
                </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box stat-icon-amber">
              <i className="fa-solid fa-flag"></i>
            </div>
            <div>
              <div className="stat-label">Trạng thái bản kê</div>
              <div style={{ marginTop: "6px" }}>
                <BadgeTrangThai meta={metaTrangThai} />
              </div>
              {banKe.NgayNop && (
                <div className="cd-hint" style={{ marginTop: "4px" }}>
                  Nộp {formatNgayGio(banKe.NgayNop)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel trần điểm nằm TRÊN bảng: tổng ở chân bảng là con số dự kiến,
            còn đây mới là điểm thật sự vào KPI. */}
        <TongHopLoaiPanel tongHop={banKe.TongHopTheoLoai} />

        <DongCoVanDeBanner
          mode="thieu-minh-chung"
          dong={dongThieuMc}
          onChonDong={cuonToiDong}
          onDong={() => setDongThieuMc([])}
        />

        {biTraLai(banKe) && (
          <div className="cd-hint cd-hint-error kkt-banner">
            <i className="fa-solid fa-rotate-left"></i>{" "}
            <b>Bản kê bị trả lại để sửa.</b>{" "}
            {banKe.NhanXetDuyet || "Người duyệt không ghi lý do."}
            {banKe.TenNguoiDuyet ? ` - ${banKe.TenNguoiDuyet}` : ""}
            {banKe.NgayDuyet ? `, ${formatNgayGio(banKe.NgayDuyet)}` : ""}
            <div style={{ marginTop: "6px" }}>
              Toàn bộ kết quả duyệt trước đó đã bị xoá - sửa xong hãy bấm Lưu
              rồi Nộp lại.
            </div>
          </div>
        )}

        {daChot(banKe) && (
          <div className="cd-hint cd-hint-ok kkt-banner">
            <i className="fa-solid fa-lock"></i> Bản kê đã được chốt
            {banKe.TenNguoiDuyet ? ` bởi ${banKe.TenNguoiDuyet}` : ""}
            {banKe.NgayDuyet ? ` ngày ${formatNgayGio(banKe.NgayDuyet)}` : ""}.
            Đây là số liệu cuối cùng của năm - muốn thay đổi phải liên hệ đơn vị
            quản lý.
            {banKe.NhanXetDuyet ? ` Ghi chú: ${banKe.NhanXetDuyet}` : ""}
          </div>
        )}

        {!suaDuoc && !daChot(banKe) && !biTraLai(banKe) && (
          <div className="cd-hint cd-hint-warn kkt-banner">
            <i className="fa-solid fa-hourglass-half"></i> Bản kê đang chờ đơn
            vị phụ trách duyệt nên tạm khoá sửa. Nếu cần chỉnh, hãy bấm{" "}
            <b>Huỷ nộp</b> - chỉ được khi chưa đơn vị nào xét dòng nào.
          </div>
        )}

        {suaDuoc && thieuMc && (
          <div className="cd-hint cd-hint-warn kkt-banner">
            <i className="fa-solid fa-file-circle-exclamation"></i> Còn{" "}
            <b>{banKe.SoDongThieuMinhChung}</b> dòng bắt buộc minh chứng nhưng
            chưa có tệp PDF - chưa nộp được bản kê.
          </div>
        )}

        <div className="kkt-bang-header">
          <p className="sub-title" style={{ margin: 0 }}>
            {suaDuoc ? "BẢNG KÊ KHAI CỦA BẠN" : "KẾT QUẢ DUYỆT TỪNG DÒNG"}
          </p>
          {coThayDoi && suaDuoc && (
            <div className="cd-hint cd-hint-warn kkt-unsaved-badge">
              <i className="fa-solid fa-circle-exclamation"></i> Có thay đổi
              chưa lưu - rời trang bây giờ sẽ mất.
            </div>
          )}
        </div>

        {rows.length === 0 && (banKe.ChiTiet || []).length === 0 ? (
          <div className="modern-table-card">
            <div className="cd-empty">
              <i className="fa-solid fa-trophy"></i>
              <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
                Chưa kê khai thành tích nào
              </h3>
              <p style={{ margin: 0 }}>
                {suaDuoc
                  ? 'Bấm "Kê khai thành tích" rồi chọn mức trong danh mục Nhóm II.'
                  : "Bản kê của năm này không có dòng nào."}
              </p>
            </div>
          </div>
        ) : suaDuoc ? (
          renderBangSua()
        ) : (
          renderBangXem()
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 className="kkt-title">Kê khai thành tích vượt trội</h2>
        <span className="breadcrumb">
          Sáng kiến, khen thưởng, đào tạo bồi dưỡng và phong trào của Trường -
          bạn kê từng thành tích, đơn vị phụ trách duyệt rồi cộng vào KPI
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
            disabled={dangTaiNam || dangLuu || dangNop}
          />
        </div>

        <button
          className="btn-cancel"
          onClick={taiDuLieu}
          disabled={isLoading || dangTaiNam || dangLuu || dangNop}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>

        {suaDuoc && (
          <button
            className="btn-submit kkt-btn-them"
            onClick={() => setMoDanhMuc(true)}
            disabled={danhMuc.length === 0}
          >
            <i className="fa-solid fa-medal"></i> Kê khai thành tích
          </button>
        )}

        {suaDuoc && (
          <button
            className="btn-submit"
            onClick={luu}
            disabled={dangLuu || dangNop || !coThayDoi}
            title={coThayDoi ? undefined : "Không có thay đổi nào cần lưu"}
          >
            <i
              className={`fa-solid ${dangLuu ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}
            ></i>{" "}
            Lưu
          </button>
        )}

        {choPhepNop(banKe) && (
          <button
            className="btn-submit kkt-btn-nop"
            onClick={nop}
            disabled={dangLuu || dangNop || rows.length === 0 || thieuMc}
            title={
              rows.length === 0
                ? "Bản kê chưa có dòng nào để nộp"
                : thieuMc
                  ? `Còn ${banKe.SoDongThieuMinhChung} dòng bắt buộc minh chứng nhưng chưa có tệp PDF`
                  : undefined
            }
          >
            <i
              className={`fa-solid ${dangNop ? "fa-spinner fa-spin" : "fa-paper-plane"}`}
            ></i>{" "}
            Nộp bản kê
          </button>
        )}

        {choPhepHuyNop(banKe) && (
          <button
            className="btn-cancel"
            onClick={huyNop}
            disabled={dangLuu || dangNop}
          >
            <i
              className={`fa-solid ${dangNop ? "fa-spinner fa-spin" : "fa-rotate-left"}`}
            ></i>{" "}
            Huỷ nộp
          </button>
        )}
      </div>

      {renderNoiDung()}

      <DanhMucThanhTichModal
        isOpen={moDanhMuc}
        danhMuc={danhMuc}
        onClose={() => setMoDanhMuc(false)}
        onChon={
          suaDuoc
            ? (muc) => {
                setRows((truoc) => [
                  ...truoc,
                  { ...dongMoi(), idMuc: String(muc.IdMuc) },
                ]);
                setMoDanhMuc(false);
                showToast(
                  "info",
                  "Đã thêm dòng",
                  `${muc.TenMuc} - nhập tên thành tích và quý rồi bấm Lưu`,
                );
              }
            : undefined
        }
      />

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenHienThi || preview.mc?.TenFileGoc}
        kieu="pdf"
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />
    </div>
  );
};

export default KeKhaiThanhTich;
