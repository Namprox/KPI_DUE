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
import "../../css/KeKhaiGioQuyDoi.css";
import SearchSelect from "../../components/Common/SearchSelect";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import MinhChungDongBox from "../../components/KeKhaiGioQuyDoi/MinhChungDongBox";
import DanhMucCongViecModal from "../../components/KeKhaiGioQuyDoi/DanhMucCongViecModal";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useMinhChungKeKhaiPreview } from "../../hooks/useMinhChungKeKhaiPreview";
import { formatNgayGio, kyHocCuaNam } from "../../utils/phieuApi";
import { tenKyHoc } from "../../utils/phanHoiSinhVienApi";
import {
  biTraLai,
  choPhepHuyNop,
  choPhepNop,
  choPhepSua,
  daChot,
  formatGio,
  huyNopBanKe,
  layBanKeCuaToi,
  layCayCongViec,
  luuChiTiet,
  nhanHeSo,
  nopBanKe,
  themMinhChung,
  TRANG_THAI_DONG_KK,
  TRANG_THAI_DONG_KK_META,
  TRANG_THAI_KE_KHAI_META,
  tinhGio,
} from "../../utils/keKhaiGioQuyDoiApi";

let seqKey = 0;
const dongMoi = () => ({
  key: `moi-${++seqKey}`,
  idChiTiet: null,
  idCongViec: "",
  kyHoc: "",
  soLuong: "",
  moTa: "",
  minhChung: [],
  mcCho: [],
});

/** Dòng từ server → dòng của form. Giữ `IdChiTiet` để server nhận ra là sửa. */
const tuChiTiet = (ct) => ({
  key: `ct-${ct.IdChiTiet}`,
  idChiTiet: ct.IdChiTiet,
  idCongViec: String(ct.IdCongViec ?? ""),
  kyHoc: ct.KyHoc != null ? String(ct.KyHoc) : "",
  soLuong: ct.SoLuong != null ? String(ct.SoLuong) : "",
  moTa: ct.MoTa ?? "",
  minhChung: ct.MinhChung || [],
  mcCho: [],
});

/**
 * Phần đường dẫn NẰM TRÊN đầu việc, để hiện breadcrumb tách khỏi tên.
 *
 * `DuongDanTen` là chuỗi ghép từ gốc xuống nên đưa nguyên vào bảng sẽ thành một
 * dòng rất dài, đọc mãi mới tới tên đầu việc. Cắt đuôi bằng cách so với
 * `TenCongViec` thay vì tách theo dấu ">" — tên đầu việc trong quyết định có thể
 * chứa dấu ngoặc, dấu gạch, nên tách theo ký tự phân cách là tự chuốc rủi ro.
 */
const duongDanCha = (cv) => {
  const ten = cv?.TenCongViec || "";
  const duongDan = String(cv?.DuongDanTen || "");
  if (!duongDan || !ten || !duongDan.endsWith(ten)) return duongDan;
  return duongDan
    .slice(0, duongDan.length - ten.length)
    .replace(/\s*>\s*$/, "")
    .trim();
};

/** Chữ ký so sánh để biết form có thay đổi chưa lưu hay không. */
const chuKy = (rows) =>
  JSON.stringify(
    rows.map((r) => [
      r.idChiTiet,
      r.idCongViec,
      r.kyHoc,
      String(r.soLuong).trim(),
      r.moTa,
      // Tệp đang chờ cũng là thay đổi chưa lưu: quên nó thì nút Lưu tắt và
      // người dùng nộp bản kê thiếu minh chứng mà không hay biết.
      (r.mcCho || []).map((m) => m.key).join(","),
    ]),
  );

const BadgeTrangThai = ({ meta, ghiChu }) => {
  if (!meta) return <span className="kkq-trong">—</span>;
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
 * Kê khai giờ quy đổi theo PHỤ LỤC II — phía GIẢNG VIÊN.
 *
 * "Quy đổi các hoạt động chuyên môn ra giờ chuẩn giảng dạy": giảng viên tự kê số
 * lượng từng đầu việc (số học viên, số bài, số bộ đề...), hệ thống quy ra giờ,
 * Trưởng khoa/Trưởng khoa liên duyệt từng dòng rồi chốt.
 *
 * Bốn quy ước nghiệp vụ mà giao diện phải phản ánh đúng, nếu không sẽ gây hiểu lầm:
 *
 *  - **Không bao giờ nhập giờ.** Ô nhập là SỐ LƯỢNG theo đơn vị tính của đầu
 *    việc; cột "Giờ quy đổi" lúc đang gõ chỉ là con số dự kiến tính tại chỗ, số
 *    chính thức luôn là `GioKeKhai` server trả về sau khi lưu.
 *  - **Một form, một lần lưu.** Gỡ dòng ở đây chỉ là bỏ dòng khỏi bảng; nó chỉ
 *    thực sự mất khi bấm Lưu (server tự tính diff theo danh sách gửi lên).
 *  - **Nộp là mốc khoá ghi.** Sau khi nộp không sửa được nữa; huỷ nộp chỉ còn
 *    hiệu lực khi người duyệt chưa xét dòng nào, ngoài ra phải nhờ trả lại.
 *  - **Minh chứng là tuỳ chọn** — bản kê không có tệp nào vẫn nộp được. Dòng
 *    chưa lưu vẫn chọn được tệp: chúng nằm ở hàng chờ và tự tải lên ngay sau
 *    khi lưu, vì endpoint upload cần IdChiTiet do server cấp.
 *
 * Thêm dòng đi qua ĐÚNG MỘT lối: nút "Kê khai giờ quy đổi" mở danh mục Phụ lục
 * II rồi chọn đầu việc. Cố ý bỏ nút "Thêm dòng" tạo dòng trống — dòng trống bắt
 * người dùng dò lại đầu việc trong ô chọn phẳng, trong khi mọi dòng đều buộc
 * phải trỏ tới một đầu việc mới lưu được.
 *
 * Quyền thao tác lấy từ cờ `ChoPhepSua` / `ChoPhepNop` do server tính sẵn, KHÔNG
 * tự suy từ trạng thái ở FE.
 */
const KeKhaiGioQuyDoi = () => {
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
    useMinhChungKeKhaiPreview(baoLoi);

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
    try {
      // Danh mục là văn bản quy định, đổi rất hiếm — nhưng vẫn tải cùng bản kê
      // để một lần Làm mới là đủ khi Admin vừa bổ sung đầu việc.
      const [item, cay] = await Promise.all([
        layBanKeCuaToi(selectedNam),
        layCayCongViec({ chiHoatDong: true }),
      ]);
      apDungBanKe(item);
      setDanhMuc(cay);
    } catch (error) {
      console.error("Lỗi tải bản kê giờ quy đổi:", error);
      setBanKe(null);
      setRows([]);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [selectedNam, apDungBanKe]);

  useEffect(() => {
    if (!dangTaiNam) taiDuLieu();
  }, [dangTaiNam, taiDuLieu]);

  const congViecById = useMemo(() => {
    const map = new Map();
    danhMuc.forEach((cv) => map.set(String(cv.IdCongViec), cv));
    return map;
  }, [danhMuc]);

  const optionKyHoc = useMemo(
    () =>
      kyHocCuaNam(selectedNam).map((ky) => ({
        value: String(ky),
        label: tenKyHoc(ky),
      })),
    [selectedNam],
  );

  const suaDuoc = choPhepSua(banKe);
  const coThayDoi = chuKy(rows) !== goc;

  const capNhatDong = (key, thayDoi) =>
    setRows((truoc) =>
      truoc.map((r) => (r.key === key ? { ...r, ...thayDoi } : r)),
    );

  const goDong = (key) =>
    setRows((truoc) => truoc.filter((r) => r.key !== key));

  /**
   * Chỉ chặn hai lỗi server sẽ trả 400 và HUỶ TOÀN BỘ lần lưu — bắt sớm ở đây
   * rẻ hơn nhiều so với để người dùng mất cả bảng vì một dòng bỏ trống.
   */
  const kiemTraTruocKhiLuu = () => {
    const thieuDauViec = rows.filter((r) => !r.idCongViec).length;
    if (thieuDauViec > 0) {
      return `Còn ${thieuDauViec} dòng chưa chọn đầu việc`;
    }
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
   * lượt theo đầu việc + kỳ học + số lượng và tiêu thụ mỗi id đúng một lần — kê
   * hai dòng cùng đầu việc vẫn ra đúng id cho từng dòng.
   */
  const ghepIdChoDongMoi = (rowsCanTai, chiTietMoi, idCu) => {
    const conTrong = (chiTietMoi || []).filter(
      (ct) => !idCu.has(Number(ct.IdChiTiet)),
    );
    const daDung = new Set();

    return rowsCanTai.map((r) => {
      if (r.idChiTiet) return { row: r, idChiTiet: r.idChiTiet };

      const chuaDung = (ct) => !daDung.has(ct.IdChiTiet);
      const cungDauViec = (ct) =>
        chuaDung(ct) && Number(ct.IdCongViec) === Number(r.idCongViec);

      const khop =
        conTrong.find(
          (ct) =>
            cungDauViec(ct) &&
            String(ct.KyHoc ?? "") === String(r.kyHoc ?? "") &&
            Number(ct.SoLuong) === Number(r.soLuong),
        ) || conTrong.find(cungDauViec);

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
          IdCongViec: Number(r.idCongViec),
          KyHoc: r.kyHoc ? Number(r.kyHoc) : null,
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
        // Đọc lại để bảng hiện đúng danh sách minh chứng server đang giữ.
        if (kq.soOk > 0) item = await layBanKeCuaToi(selectedNam);
      }

      apDungBanKe(item);
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
          `Không tải lên được ${loiTep.length} tệp (${loiTep.join(", ")}) — tệp vẫn nằm ở hàng chờ, hãy bấm Lưu lại.`,
        );
      }
    } catch (error) {
      console.error("Lỗi lưu bản kê giờ quy đổi:", error);
      baoLoi(error.message);
    }
    setDangLuu(false);
    return ketQua;
  };

  const luu = () => thucHienLuu();

  const nop = async () => {
    const loiNhac = coThayDoi
      ? "Bản kê còn thay đổi chưa lưu — hệ thống sẽ lưu (kèm tệp minh chứng đang chờ) rồi nộp luôn.\n\n"
      : "";
    if (
      !window.confirm(
        loiNhac +
          "Nộp bản kê cho Trưởng đơn vị duyệt? Sau khi nộp bạn sẽ không sửa được nữa.",
      )
    ) {
      return;
    }

    // Nộp là mốc khoá ghi nên phải nộp đúng bản vừa lưu: lấy `RowVersion` từ
    // kết quả trả về, state `banKe` lúc này vẫn còn là bản cũ.
    let hienTai = banKe;
    if (coThayDoi) {
      hienTai = await thucHienLuu();
      if (!hienTai) return;
    }

    setDangNop(true);
    try {
      const item = await nopBanKe(selectedNam, hienTai?.RowVersion);
      apDungBanKe(item);
      baoOk("Đã nộp bản kê, đang chờ Trưởng đơn vị duyệt");
    } catch (error) {
      console.error("Lỗi nộp bản kê giờ quy đổi:", error);
      baoLoi(error.message);
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
      console.error("Lỗi huỷ nộp bản kê giờ quy đổi:", error);
      baoLoi(error.message);
    }
    setDangNop(false);
  };

  /** Tổng giờ dự kiến của bảng đang gõ — khác `TongGioKeKhai` khi chưa lưu. */
  const tongDuKien = useMemo(
    () =>
      rows.reduce((tong, r) => {
        const cv = congViecById.get(String(r.idCongViec));
        const gio = cv
          ? tinhGio(r.soLuong, cv.HeSoQuyDoi, cv.SoLuongMau)
          : null;
        return tong + (gio || 0);
      }, 0),
    [rows, congViecById],
  );

  const soDongTuChoi = useMemo(
    () =>
      (banKe?.ChiTiet || []).filter(
        (ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG_KK.TU_CHOI,
      ).length,
    [banKe],
  );

  const metaTrangThai = TRANG_THAI_KE_KHAI_META[banKe?.TrangThai];

  const renderBangSua = () => (
    <div className="modern-table-card kkq-bang-card">
      <div className="table-scroll">
        <table className="custom-table kkq-bang kkq-bang-sua">
          <thead>
            <tr>
              <th style={{ width: "44px", textAlign: "center" }}>#</th>
              <th style={{ width: "30%" }}>Đầu việc theo Phụ lục II</th>
              <th style={{ width: "155px" }}>Kỳ học</th>
              <th style={{ width: "150px" }}>Số lượng</th>
              <th style={{ width: "115px", textAlign: "right" }}>
                Giờ quy đổi
              </th>
              <th style={{ width: "30%" }}>Mô tả / minh chứng</th>
              <th style={{ width: "48px", textAlign: "center" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cv = congViecById.get(String(r.idCongViec));
              // Ô trống phải hiện "—": Number("") = 0 nên tính thẳng sẽ ra "0 giờ",
              // đọc như thể đã quy đổi xong trong khi người dùng chưa nhập gì.
              const coSoLuong = String(r.soLuong).trim() !== "";
              const gio =
                cv && coSoLuong
                  ? tinhGio(r.soLuong, cv.HeSoQuyDoi, cv.SoLuongMau)
                  : null;
              const soSai = coSoLuong && !(Number(r.soLuong) > 0);
              const duongDan = duongDanCha(cv);

              return (
                <tr key={r.key}>
                  <td className="kkq-stt-cell">
                    <div className="kkq-stt-box">{i + 1}</div>
                  </td>
                  <td>
                    {cv ? (
                      <>
                        {duongDan && (
                          <div className="kkq-dv-duong-dan">{duongDan}</div>
                        )}
                        <div className="kkq-dv-ten">{cv.TenCongViec}</div>
                        <div className="kkq-heso">
                          <i className="fa-solid fa-calculator"></i>{" "}
                          {nhanHeSo(cv)}
                        </div>
                      </>
                    ) : (
                      <div className="cd-hint cd-hint-error kkq-hint">
                        <i className="fa-solid fa-triangle-exclamation"></i> Đầu
                        việc không còn trong danh mục đang hoạt động — hãy gỡ
                        dòng này rồi kê khai lại.
                      </div>
                    )}
                  </td>
                  <td className="kkq-cell-kyhoc">
                    <SearchSelect
                      value={r.kyHoc}
                      onChange={(v) => capNhatDong(r.key, { kyHoc: v })}
                      options={optionKyHoc}
                      placeholder="Cả năm"
                      clearable
                      disabled={dangLuu}
                      portal
                    />
                  </td>
                  <td className="kkq-cell-soluong">
                    <div className="kkq-sl-o">
                      <input
                        type="number"
                        className="form-input kkq-so"
                        min="0"
                        step="0.01"
                        value={r.soLuong}
                        onChange={(e) =>
                          capNhatDong(r.key, { soLuong: e.target.value })
                        }
                        placeholder="0"
                        disabled={dangLuu}
                      />
                      {cv?.DonViTinh && (
                        <span className="kkq-sl-dv">{cv.DonViTinh}</span>
                      )}
                    </div>
                    {soSai && (
                      <div className="cd-hint cd-hint-error kkq-hint">
                        Phải lớn hơn 0
                      </div>
                    )}
                  </td>
                  <td className="table-num kkq-gio-cell">
                    <div className="kkq-gio-box">
                      {gio == null ? (
                        <span className="kkq-trong">—</span>
                      ) : (
                        <span className="kkq-gio-val">
                          {formatGio(gio)}{" "}
                          <span className="kkq-gio-dv">giờ</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="kkq-mota-cell">
                    <textarea
                      className="form-input kkq-mota"
                      rows={2}
                      maxLength={1000}
                      value={r.moTa}
                      onChange={(e) =>
                        capNhatDong(r.key, { moTa: e.target.value })
                      }
                      placeholder="Tên học viên / lớp / học phần... (tuỳ chọn)"
                      disabled={dangLuu}
                    />
                    <MinhChungDongBox
                      idChiTiet={r.idChiTiet}
                      danhSach={r.minhChung}
                      mcCho={r.mcCho}
                      choPhepSua={suaDuoc}
                      onChange={(ds) => capNhatDong(r.key, { minhChung: ds })}
                      onChangeCho={(ds) => capNhatDong(r.key, { mcCho: ds })}
                      onXem={openPreview}
                      onTai={downloadMinhChung}
                      onError={baoLoi}
                      onSuccess={baoOk}
                    />
                  </td>
                  <td className="kkq-act-cell">
                    <div className="kkq-act-box">
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
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total-row">
              <td colSpan={4} className="kkq-tfoot-label">
                Tổng <strong>{rows.length}</strong> dòng — Giờ quy đổi dự kiến:
              </td>
              <td className="table-num kkq-gio kkq-tfoot-gio">
                <div className="kkq-gio-box">
                  <b>{formatGio(tongDuKien)}</b>{" "}
                  <span className="kkq-gio-dv">giờ</span>
                </div>
              </td>
              <td colSpan={2} className="kkq-tong-ghi-chu">
                <i className="fa-solid fa-server"></i> Đã lưu trên máy chủ:{" "}
                <strong>{formatGio(banKe?.TongGioKeKhai)}</strong> giờ
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  const renderBangXem = () => (
    <div className="modern-table-card kkq-bang-card">
      <div className="table-scroll">
        <table className="custom-table kkq-bang" style={{ minWidth: "1100px" }}>
          <thead>
            <tr>
              <th style={{ width: "44px", textAlign: "center" }}>#</th>
              <th style={{ width: "28%" }}>Đầu việc</th>
              <th style={{ width: "130px" }}>Kỳ học</th>
              <th style={{ width: "115px", textAlign: "right" }}>Bạn kê</th>
              <th style={{ width: "105px", textAlign: "right" }}>
                Giờ kê khai
              </th>
              <th style={{ width: "115px", textAlign: "right" }}>Duyệt</th>
              <th style={{ width: "105px", textAlign: "right" }}>Giờ duyệt</th>
              <th style={{ width: "23%" }}>Kết quả</th>
            </tr>
          </thead>
          <tbody>
            {(banKe?.ChiTiet || []).map((ct, i) => {
              const meta = TRANG_THAI_DONG_KK_META[ct.TrangThaiDong];
              const biSua =
                ct.SoLuongDuyet != null &&
                Number(ct.SoLuongDuyet) !== Number(ct.SoLuong);

              return (
                <tr key={ct.IdChiTiet}>
                  <td className="kkq-stt-cell">
                    <div className="kkq-stt-box">{i + 1}</div>
                  </td>
                  <td>
                    <div className="kkq-ten-cv">{ct.TenCongViec}</div>
                    {ct.GhiChuQuyDoi && (
                      <div className="kkq-heso">
                        <i className="fa-solid fa-calculator"></i>{" "}
                        {ct.GhiChuQuyDoi}
                      </div>
                    )}
                    {ct.MoTa && <div className="kkq-mo-ta">{ct.MoTa}</div>}
                    {(ct.MinhChung || []).length > 0 && (
                      <div className="kkq-mc-list">
                        {ct.MinhChung.map((mc) => (
                          <button
                            key={mc.IdMinhChungKk}
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
                  <td>
                    {ct.KyHoc ? (
                      tenKyHoc(ct.KyHoc)
                    ) : (
                      <span className="kkq-trong">Cả năm</span>
                    )}
                  </td>
                  <td className="table-num">
                    {formatGio(ct.SoLuong)}
                    {ct.DonViTinh ? ` ${ct.DonViTinh}` : ""}
                  </td>
                  <td className="table-num kkq-gio">
                    {formatGio(ct.GioKeKhai)}
                  </td>
                  <td className="table-num">
                    {ct.SoLuongDuyet == null ? (
                      <span className="kkq-trong">—</span>
                    ) : (
                      <span className={biSua ? "kkq-sua-so" : undefined}>
                        {formatGio(ct.SoLuongDuyet)}
                      </span>
                    )}
                  </td>
                  <td className="table-num kkq-gio">
                    {ct.GioDuyet == null ? (
                      <span className="kkq-trong">—</span>
                    ) : (
                      <b>{formatGio(ct.GioDuyet)}</b>
                    )}
                  </td>
                  <td>
                    <BadgeTrangThai meta={meta} />
                    {ct.NhanXetDuyet && (
                      <div className="kkq-nhan-xet">
                        <i className="fa-solid fa-comment-dots"></i>{" "}
                        {ct.NhanXetDuyet}
                      </div>
                    )}
                    {biSua && (
                      <div className="cd-hint cd-hint-warn kkq-hint">
                        Người duyệt đã sửa số lượng từ {formatGio(ct.SoLuong)}{" "}
                        xuống {formatGio(ct.SoLuongDuyet)}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="table-total-row">
              <td colSpan={4} className="kkq-tfoot-label">
                Tổng cộng <strong>{banKe?.SoDong ?? 0}</strong> dòng:
              </td>
              <td className="table-num kkq-gio">
                <div className="kkq-gio-box">
                  <b>{formatGio(banKe?.TongGioKeKhai)}</b>{" "}
                  <span className="kkq-gio-dv">giờ</span>
                </div>
              </td>
              <td></td>
              <td className="table-num kkq-gio">
                <div className="kkq-gio-box">
                  <b>{formatGio(banKe?.TongGioDuyet)}</b>{" "}
                  <span className="kkq-gio-dv">giờ</span>
                </div>
              </td>
              <td className="kkq-tong-ghi-chu">
                <i className="fa-solid fa-circle-info"></i> Giờ duyệt chỉ cộng
                các dòng được duyệt
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
            <div className="stat-icon-box stat-icon-blue">
              <i className="fa-solid fa-clock"></i>
            </div>
            <div>
              <div className="stat-label">Giờ quy đổi đã kê</div>
              <div className="stat-value">{formatGio(banKe.TongGioKeKhai)}</div>
              <div className="cd-hint" style={{ marginTop: 0 }}>
                giờ chuẩn giảng dạy
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box stat-icon-green">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <div className="stat-label">Giờ đã được duyệt</div>
              <div className="stat-value" style={{ color: "#047857" }}>
                {formatGio(banKe.TongGioDuyet)}
              </div>
              <div className="cd-hint" style={{ marginTop: 0 }}>
                chỉ cộng dòng được duyệt
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

        {biTraLai(banKe) && (
          <div className="cd-hint cd-hint-error kkq-banner">
            <i className="fa-solid fa-rotate-left"></i>{" "}
            <b>Bản kê bị trả lại để sửa.</b>{" "}
            {banKe.NhanXetDuyet || "Người duyệt không ghi lý do."}
            {banKe.TenNguoiDuyet ? ` — ${banKe.TenNguoiDuyet}` : ""}
            {banKe.NgayDuyet ? `, ${formatNgayGio(banKe.NgayDuyet)}` : ""}
            <div style={{ marginTop: "6px" }}>
              Toàn bộ kết quả duyệt trước đó đã bị xoá — sửa xong hãy bấm Lưu
              rồi Nộp lại.
            </div>
          </div>
        )}

        {daChot(banKe) && (
          <div className="cd-hint cd-hint-ok kkq-banner">
            <i className="fa-solid fa-lock"></i> Bản kê đã được chốt
            {banKe.TenNguoiDuyet ? ` bởi ${banKe.TenNguoiDuyet}` : ""}
            {banKe.NgayDuyet ? ` ngày ${formatNgayGio(banKe.NgayDuyet)}` : ""}.
            Đây là số liệu cuối cùng của năm — muốn thay đổi phải liên hệ đơn vị
            quản lý.
            {banKe.NhanXetDuyet ? ` Ghi chú: ${banKe.NhanXetDuyet}` : ""}
          </div>
        )}

        {!suaDuoc && !daChot(banKe) && !biTraLai(banKe) && (
          <div className="cd-hint cd-hint-warn kkq-banner">
            <i className="fa-solid fa-hourglass-half"></i> Bản kê đang chờ
            Trưởng đơn vị duyệt nên tạm khoá sửa. Nếu cần chỉnh, hãy bấm{" "}
            <b>Huỷ nộp</b> — chỉ được khi người duyệt chưa xét dòng nào.
          </div>
        )}

        <div className="kkq-bang-header">
          <p className="sub-title" style={{ margin: 0 }}>
            {suaDuoc ? "BẢNG KÊ KHAI CỦA BẠN" : "KẾT QUẢ DUYỆT TỪNG DÒNG"}
          </p>
          {coThayDoi && suaDuoc && (
            <div className="cd-hint cd-hint-warn kkq-unsaved-badge">
              <i className="fa-solid fa-circle-exclamation"></i> Có thay đổi
              chưa lưu - rời trang bây giờ sẽ mất.
            </div>
          )}
        </div>

        {rows.length === 0 && (banKe.ChiTiet || []).length === 0 ? (
          <div className="modern-table-card">
            <div className="cd-empty">
              <i className="fa-solid fa-clipboard-list"></i>
              <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
                Chưa kê khai đầu việc nào
              </h3>
              <p style={{ margin: 0 }}>
                {suaDuoc
                  ? 'Bấm "Kê khai giờ quy đổi" rồi chọn đầu việc trong danh mục Phụ lục II.'
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
        <h2 className="kkq-title">Kê khai giờ quy đổi</h2>
        <span className="breadcrumb">
          Quy đổi các hoạt động chuyên môn ra giờ chuẩn giảng dạy theo Phụ lục
          II — bạn kê số lượng, hệ thống tự tính giờ
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

        <button
          className="btn-submit kkq-btn-them"
          onClick={() => setMoDanhMuc(true)}
          disabled={danhMuc.length === 0}
        >
          <i className="fa-solid fa-book-open"></i> Kê khai giờ quy đổi
        </button>

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
            className="btn-submit kkq-btn-nop"
            onClick={nop}
            disabled={dangLuu || dangNop || rows.length === 0}
            title={
              rows.length === 0 ? "Bản kê chưa có dòng nào để nộp" : undefined
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

      <DanhMucCongViecModal
        isOpen={moDanhMuc}
        danhMuc={danhMuc}
        onClose={() => setMoDanhMuc(false)}
        onChon={
          suaDuoc
            ? (cv) => {
                setRows((truoc) => [
                  ...truoc,
                  { ...dongMoi(), idCongViec: String(cv.IdCongViec) },
                ]);
                setMoDanhMuc(false);
                showToast(
                  "info",
                  "Đã thêm dòng",
                  `${cv.TenCongViec} — nhập số lượng rồi bấm Lưu`,
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

export default KeKhaiGioQuyDoi;
