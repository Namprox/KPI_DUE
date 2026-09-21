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
import "../../css/KeKhaiThanhTich.css";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import MinhChungThanhTichRow from "../../components/KeKhaiThanhTich/MinhChungThanhTichRow";
import TongHopLoaiPanel from "../../components/KeKhaiThanhTich/TongHopLoaiPanel";
import DongCoVanDeBanner from "../../components/KeKhaiThanhTich/DongCoVanDeBanner";
import { useMinhChungThanhTichPreview } from "../../hooks/useMinhChungThanhTichPreview";
import { formatNgayGio } from "../../utils/phieuApi";
import {
  choPhepDuyet,
  choPhepXetDong,
  duyetChiTiet,
  formatDiem,
  layBanKeTheoId,
  layLichSuBanKe,
  QUYET_DINH,
  TEN_HANH_DONG_TT,
  tenDonViDuyet,
  tenQuy,
  tinhDiem,
  TRANG_THAI_DONG_TT,
  TRANG_THAI_DONG_TT_META,
  TRANG_THAI_KE_KHAI,
  TRANG_THAI_KE_KHAI_META,
} from "../../utils/keKhaiThanhTichApi";

/**
 * Quyết định của người duyệt cho một dòng, ở dạng state cục bộ.
 * `quyetDinh = ""` nghĩa là chưa xét - khác hẳn "đã trả về".
 */
const tuChiTiet = (ct) => {
  const tt = Number(ct.TrangThaiDong);
  const daXet =
    tt === TRANG_THAI_DONG_TT.DA_CHOT || tt === TRANG_THAI_DONG_TT.TRA_VE;
  return {
    quyetDinh: daXet ? String(tt) : "",
    soLuongDuyet:
      ct.SoLuongDuyet != null
        ? String(ct.SoLuongDuyet)
        : ct.SoLuong != null
          ? String(ct.SoLuong)
          : "",
    nhanXet: ct.NhanXetDuyet ?? "",
  };
};

const chuKyQuyetDinh = (qd) =>
  JSON.stringify([qd?.quyetDinh, String(qd?.soLuongDuyet).trim(), qd?.nhanXet]);

const BadgeMeta = ({ meta }) => {
  if (!meta) return <span className="kkt-trong">-</span>;
  return (
    <span
      className="cd-status-badge"
      style={{
        background: meta.bg,
        color: meta.color,
        borderColor: meta.border,
      }}
    >
      <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
    </span>
  );
};

/**
 * Duyệt một bản kê THÀNH TÍCH VƯỢT TRỘI - màn hình thao tác của đơn vị phụ trách.
 *
 * Đây là màn hình khác template giờ quy đổi NHIỀU NHẤT, vì một điểm nghiệp vụ:
 *
 *   ⚠️ **Quyền xét gác theo TỪNG DÒNG.** Mỗi mức thành tích có `IdDonViDuyet`
 *   riêng, nên một bản kê có thể do nhiều đơn vị cùng xét (P.TCHC xét khen
 *   thưởng, Trưởng Khoa xét sáng kiến...). Gửi lẫn MỘT dòng của đơn vị khác lên
 *   `duyet-chi-tiet` là CẢ REQUEST bị từ chối 403 FORBIDDEN_DONG và KHÔNG ghi
 *   gì cả.
 *
 * Thiết kế chống lỗi theo hai lớp:
 *
 *  1. **Cấu trúc**: bảng gom dòng theo ĐƠN VỊ DUYỆT, và nút "Lưu quyết định" là
 *     của TỪNG NHÓM. Nhờ vậy payload luôn thuộc đúng một đơn vị - giao diện
 *     không dựng nổi một request lẫn đơn vị. Cố ý KHÔNG có nút "xét tất cả"
 *     toàn bản kê: trên bản kê nhiều đơn vị, nó là 403 chắc chắn.
 *  2. **Phục hồi**: nếu vẫn dính 403, `error.dongCoVanDe` cho biết dòng nào của
 *     đơn vị nào; banner nói rõ server chưa ghi gì nên thử lại là an toàn.
 *
 * Quyền lấy THẲNG từ cờ `ChoPhepXet` server trả trên từng dòng - không suy từ
 * vai trò, chức vụ hay trạng thái header nữa. Nhóm nào không có dòng nào xét
 * được thì thu gọn sẵn, nhưng vẫn mở ra xem được: đây là hiển thị, không phải
 * phân quyền.
 *
 * Ba quy ước còn lại:
 *  - Không còn chốt / trả lại cấp BẢN KÊ. Vòng đời nằm trọn ở `duyet-chi-tiet`,
 *    và dòng ĐÃ CHỐT vẫn xét lại được qua chính endpoint đó (mở lại - nhật ký
 *    ghi HanhDong = 10). Nhân viên cũng không phải nộp lại gì.
 *  - Điểm duyệt tính lại từ SNAPSHOT `DiemMuc` của dòng, không đọc lại danh mục.
 *  - Dòng bị trả về cho điểm duyệt = 0 nhưng vẫn giữ số lượng để đối chiếu, và
 *    BẮT BUỘC kèm lý do (server trả 400 THIEU_LY_DO nếu thiếu).
 */
const ChiTietDuyetThanhTich = () => {
  const { id } = useParams();
  const toast = useRef(null);
  const navigate = useNavigate();

  const [banKe, setBanKe] = useState(null);
  const [lichSu, setLichSu] = useState([]);
  const [quyetDinh, setQuyetDinh] = useState({});
  const [goc, setGoc] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [dangLuuNhom, setDangLuuNhom] = useState(null);
  const [hienLichSu, setHienLichSu] = useState(false);
  const [nhomMo, setNhomMo] = useState({});
  const [dongBiTuChoi, setDongBiTuChoi] = useState([]);
  const [loi, setLoi] = useState("");

  const showToast = useCallback((severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 5000 });
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

  /** Nhận bản kê mới từ mọi endpoint và đồng bộ lại quyết định + mốc so sánh. */
  const apDungBanKe = useCallback((item) => {
    setBanKe(item);
    const map = {};
    (item?.ChiTiet || []).forEach((ct) => {
      map[ct.IdChiTiet] = tuChiTiet(ct);
    });
    setQuyetDinh(map);
    setGoc(map);
  }, []);

  const taiDuLieu = useCallback(async () => {
    setIsLoading(true);
    setLoi("");
    setDongBiTuChoi([]);
    try {
      const item = await layBanKeTheoId(id);
      apDungBanKe(item);
      // Nhật ký hỏng không được làm mất màn hình duyệt - đây là dữ liệu phụ.
      try {
        setLichSu(await layLichSuBanKe(id));
      } catch (error) {
        console.error("Lỗi tải nhật ký bản kê:", error);
        setLichSu([]);
      }
    } catch (error) {
      console.error("Lỗi tải bản kê thành tích:", error);
      setBanKe(null);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [id, apDungBanKe]);

  useEffect(() => {
    taiDuLieu();
  }, [taiDuLieu]);

  const chiTiet = useMemo(() => banKe?.ChiTiet || [], [banKe]);

  /** Mở được màn hình thao tác không (xét được ÍT NHẤT MỘT dòng). */
  const duyetDuoc = choPhepDuyet(banKe);

  const capNhat = (idChiTiet, thayDoi) =>
    setQuyetDinh((truoc) => ({
      ...truoc,
      [idChiTiet]: { ...truoc[idChiTiet], ...thayDoi },
    }));

  /**
   * Gom dòng theo đơn vị phụ trách - đây là trục tổ chức của cả màn hình, và là
   * thứ giữ cho payload không bao giờ lẫn phạm vi.
   *
   * Khoá nhóm là `IdDonViDuyet` (null thành chuỗi "null" để Map không nuốt mất).
   * `coTheDuyet` đọc thẳng từ cờ `ChoPhepXet` của các dòng trong nhóm, không
   * đoán theo vai trò: nhóm nào không có dòng nào xét được thì chỉ để xem.
   */
  const nhomTheoDonVi = useMemo(() => {
    const map = new Map();
    chiTiet.forEach((ct) => {
      const khoa = ct.IdDonViDuyet == null ? "null" : String(ct.IdDonViDuyet);
      if (!map.has(khoa)) {
        map.set(khoa, {
          khoa,
          idDonVi: ct.IdDonViDuyet ?? null,
          ten: tenDonViDuyet(ct),
          dong: [],
        });
      }
      map.get(khoa).dong.push(ct);
    });

    return Array.from(map.values()).map((n) => ({
      ...n,
      coTheDuyet: n.dong.some(choPhepXetDong),
    }));
  }, [chiTiet]);

  /** Dòng có thay đổi so với server, trong phạm vi một nhóm. */
  const dongThayDoiCuaNhom = useCallback(
    (nhom) =>
      nhom.dong.filter((ct) => {
        if (!choPhepXetDong(ct)) return false;
        const hienTai = quyetDinh[ct.IdChiTiet];
        if (!hienTai || !hienTai.quyetDinh) return false;
        return chuKyQuyetDinh(hienTai) !== chuKyQuyetDinh(goc[ct.IdChiTiet]);
      }),
    [quyetDinh, goc],
  );

  const tongThayDoi = useMemo(
    () =>
      nhomTheoDonVi.reduce((n, nhom) => n + dongThayDoiCuaNhom(nhom).length, 0),
    [nhomTheoDonVi, dongThayDoiCuaNhom],
  );

  /** Dòng chưa xét trên SERVER - đây là khối lượng việc thật, không phải state. */
  const soChuaXet = chiTiet.filter(
    (ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG_TT.CHO_DUYET,
  ).length;

  /** Tổng điểm duyệt dự kiến theo quyết định đang chọn (chưa lưu). */
  const tongDiemDuKien = useMemo(
    () =>
      chiTiet.reduce((tong, ct) => {
        const qd = quyetDinh[ct.IdChiTiet];
        if (qd?.quyetDinh !== String(QUYET_DINH.CHOT)) return tong;
        const diem = tinhDiem(qd.soLuongDuyet, ct.DiemMuc);
        return tong + (diem || 0);
      }, 0),
    [chiTiet, quyetDinh],
  );

  const idBiTuChoi = useMemo(
    () => new Set(dongBiTuChoi.map((d) => Number(d.IdChiTiet))),
    [dongBiTuChoi],
  );

  /** Đặt "Chốt" cho mọi dòng CHƯA XÉT và xét được TRONG MỘT NHÓM. */
  const chotCaNhom = (nhom) => {
    setQuyetDinh((truoc) => {
      const sau = { ...truoc };
      nhom.dong.forEach((ct) => {
        if (!choPhepXetDong(ct)) return;
        if (Number(ct.TrangThaiDong) !== TRANG_THAI_DONG_TT.CHO_DUYET) return;
        sau[ct.IdChiTiet] = {
          ...sau[ct.IdChiTiet],
          quyetDinh: String(QUYET_DINH.CHOT),
        };
      });
      return sau;
    });
  };

  /**
   * Lưu quyết định của ĐÚNG MỘT nhóm.
   *
   * Đây là lý do màn hình gom nhóm: payload chỉ chứa dòng của một đơn vị nên
   * không thể dính FORBIDDEN_DONG vì lẫn đơn vị. Nếu vẫn dính (cờ `ChoPhepXet`
   * đã cũ so với phân quyền hiện tại), banner sẽ chỉ đúng dòng nào.
   */
  const luuNhom = async (nhom) => {
    const thayDoi = dongThayDoiCuaNhom(nhom);
    if (thayDoi.length === 0) {
      showToast("info", "Không có gì để lưu", "Chưa có dòng nào thay đổi");
      return;
    }

    const soAm = thayDoi.filter((ct) => {
      const qd = quyetDinh[ct.IdChiTiet];
      return qd.soLuongDuyet !== "" && Number(qd.soLuongDuyet) < 0;
    }).length;
    if (soAm > 0) {
      showToast(
        "warn",
        "Chưa lưu được",
        `Có ${soAm} dòng đặt số lượng duyệt âm`,
      );
      return;
    }

    // Chặn sớm THIEU_LY_DO: server từ chối CẢ nhóm nếu một dòng trả về thiếu
    // lý do, mà lý do lại là toàn bộ thông tin nhân viên nhận được để sửa.
    const thieuLyDo = thayDoi.filter((ct) => {
      const qd = quyetDinh[ct.IdChiTiet];
      return qd.quyetDinh === String(QUYET_DINH.TRA_VE) && !qd.nhanXet?.trim();
    }).length;
    if (thieuLyDo > 0) {
      showToast(
        "warn",
        "Chưa lưu được",
        `Có ${thieuLyDo} dòng trả về chưa ghi lý do`,
      );
      return;
    }

    setDangLuuNhom(nhom.khoa);
    try {
      const item = await duyetChiTiet(
        banKe.IdKeKhai,
        thayDoi.map((ct) => {
          const qd = quyetDinh[ct.IdChiTiet];
          return {
            IdChiTiet: ct.IdChiTiet,
            QuyetDinh: Number(qd.quyetDinh),
            SoLuongDuyet:
              qd.soLuongDuyet === "" ? null : Number(qd.soLuongDuyet),
            NhanXet: qd.nhanXet?.trim() || null,
          };
        }),
      );
      apDungBanKe(item);
      setDongBiTuChoi([]);
      setLichSu(await layLichSuBanKe(id).catch(() => lichSu));
      baoOk(`Đã lưu quyết định cho ${thayDoi.length} dòng của ${nhom.ten}`);
    } catch (error) {
      console.error("Lỗi lưu kết quả duyệt:", error);
      if (error.errorCode === "FORBIDDEN_DONG") {
        // Server KHÔNG ghi gì - chỉ mặt các dòng ngoài quyền rồi cho thử lại.
        setDongBiTuChoi(error.dongCoVanDe || []);
        showToast("warn", "Không lưu được", error.message);
      } else {
        baoLoi(error.message);
      }
    }
    setDangLuuNhom(null);
  };

  const cuonToiDong = (d) => {
    const el = document.getElementById(`kkt-dong-${d?.IdChiTiet}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (isLoading) {
    return (
      <div className="page-container kkt-page">
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải bản kê...
          </div>
        </div>
      </div>
    );
  }

  if (loi || !banKe) {
    return (
      <div className="page-container kkt-page">
        <Toast ref={toast} position="top-right" />
        <div className="page-header">
          <button
            className="cd-quay-lai"
            onClick={() => navigate("/quan-ly/ke-khai-thanh-tich")}
          >
            <i className="fa-solid fa-arrow-left"></i> Danh sách bản kê
          </button>
        </div>
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không mở được bản kê
            </h3>
            <p style={{ margin: 0 }}>{loi || "Không tìm thấy dữ liệu"}</p>
          </div>
        </div>
      </div>
    );
  }

  /** Một dòng trong bảng của nhóm. */
  const renderDong = (ct) => {
    const qd = quyetDinh[ct.IdChiTiet] || {};
    const xetDuoc = choPhepXetDong(ct);
    const laChot = qd.quyetDinh === String(QUYET_DINH.CHOT);
    const laTraVe = qd.quyetDinh === String(QUYET_DINH.TRA_VE);
    const diemDuKien = laChot
      ? tinhDiem(qd.soLuongDuyet, ct.DiemMuc)
      : laTraVe
        ? 0
        : null;
    const biChiMat = idBiTuChoi.has(Number(ct.IdChiTiet));
    const khoaSoLuong = ct.ChoPhepSoLuong === false;
    const daChotTrenServer =
      Number(ct.TrangThaiDong) === TRANG_THAI_DONG_TT.DA_CHOT;

    const classDong = [
      laTraVe ? "kkt-row-tra-ve" : "",
      biChiMat ? "kkt-row-loi" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <tr
        key={ct.IdChiTiet}
        id={`kkt-dong-${ct.IdChiTiet}`}
        className={classDong || undefined}
      >
        <td>
          <div className="kkt-ten-cv">{ct.TenThanhTich}</div>
          <div className="kkt-diem-muc">
            <i className="fa-solid fa-layer-group"></i> {ct.TenMuc} ·{" "}
            {formatDiem(ct.DiemMuc)} điểm
            {ct.ChoPhepSoLuong ? " / đơn vị" : ""}
          </div>
          {(ct.SoQuyetDinh || ct.CoQuanCap || ct.NgayDatDuoc) && (
            <div className="kkt-mo-ta">
              {[
                ct.SoQuyetDinh && `QĐ ${ct.SoQuyetDinh}`,
                ct.CoQuanCap,
                ct.NgayDatDuoc && String(ct.NgayDatDuoc).slice(0, 10),
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
          {ct.MoTa && <div className="kkt-mo-ta">{ct.MoTa}</div>}
          {(ct.MinhChung || []).length === 0 ? (
            <div
              className={
                ct.YeuCauMinhChung
                  ? "cd-hint cd-hint-error kkt-hint"
                  : "kkt-trong"
              }
            >
              {ct.YeuCauMinhChung ? (
                <>
                  <i className="fa-solid fa-triangle-exclamation"></i> Mức này
                  bắt buộc minh chứng nhưng dòng không có tệp nào
                </>
              ) : (
                "Không có minh chứng"
              )}
            </div>
          ) : (
            <div className="kkt-mc-list">
              {ct.MinhChung.map((mc) => (
                <MinhChungThanhTichRow
                  key={mc.IdMinhChungTt}
                  mc={mc}
                  onXem={openPreview}
                />
              ))}
            </div>
          )}
        </td>

        <td>{tenQuy(ct.Quy)}</td>

        <td className="table-num">{formatDiem(ct.SoLuong)}</td>

        <td className="table-num kkt-diem">{formatDiem(ct.DiemKeKhai)}</td>

        <td>
          {xetDuoc ? (
            <>
              <div className="kkt-qd-nhom">
                <label className={`kkt-qd-nut${laChot ? " kkt-qd-chot" : ""}`}>
                  <input
                    type="radio"
                    name={`qd-${ct.IdChiTiet}`}
                    checked={laChot}
                    onChange={() =>
                      capNhat(ct.IdChiTiet, {
                        quyetDinh: String(QUYET_DINH.CHOT),
                      })
                    }
                    disabled={!!dangLuuNhom}
                  />
                  <i className="fa-solid fa-lock"></i> Chốt
                </label>
                <label
                  className={`kkt-qd-nut${laTraVe ? " kkt-qd-tra-ve" : ""}`}
                >
                  <input
                    type="radio"
                    name={`qd-${ct.IdChiTiet}`}
                    checked={laTraVe}
                    onChange={() =>
                      capNhat(ct.IdChiTiet, {
                        quyetDinh: String(QUYET_DINH.TRA_VE),
                      })
                    }
                    disabled={!!dangLuuNhom}
                  />
                  <i className="fa-solid fa-rotate-left"></i> Trả về
                </label>
              </div>
              {/* Dòng đã chốt vẫn xét lại được - đây chính là "mở lại", không
                  cần can thiệp cơ sở dữ liệu như thiết kế cũ. */}
              {daChotTrenServer && (
                <div className="cd-hint kkt-hint">
                  Dòng đã chốt - chọn <b>Trả về</b> kèm lý do để mở lại cho nhân
                  viên sửa.
                </div>
              )}
            </>
          ) : (
            <BadgeMeta meta={TRANG_THAI_DONG_TT_META[ct.TrangThaiDong]} />
          )}
        </td>

        <td>
          {xetDuoc ? (
            <input
              type="number"
              className="form-input cd-diem-input kkt-so"
              min="0"
              value={khoaSoLuong ? "1" : (qd.soLuongDuyet ?? "")}
              onChange={(e) =>
                capNhat(ct.IdChiTiet, { soLuongDuyet: e.target.value })
              }
              disabled={laTraVe || !!dangLuuNhom || khoaSoLuong}
              title={
                khoaSoLuong
                  ? "Mức này luôn tính 1 đơn vị cho mỗi dòng"
                  : "Bỏ trống = giữ nguyên số lượng nhân viên đã kê"
              }
            />
          ) : ct.SoLuongDuyet == null ? (
            <span className="kkt-trong">-</span>
          ) : (
            formatDiem(ct.SoLuongDuyet)
          )}
        </td>

        <td className="table-num kkt-diem">
          {diemDuKien == null ? (
            <span className="kkt-trong">-</span>
          ) : (
            <b>{formatDiem(diemDuKien)}</b>
          )}
        </td>

        <td>
          {xetDuoc ? (
            <textarea
              className="form-input cd-textarea kkt-mota"
              rows={2}
              maxLength={1000}
              value={qd.nhanXet ?? ""}
              onChange={(e) =>
                capNhat(ct.IdChiTiet, { nhanXet: e.target.value })
              }
              placeholder={
                laTraVe ? "Bắt buộc: nêu rõ lý do trả về" : "Ghi chú (tuỳ chọn)"
              }
              disabled={!!dangLuuNhom}
            />
          ) : (
            <>
              {ct.NhanXetDuyet ? (
                <div className="kkt-nhan-xet">{ct.NhanXetDuyet}</div>
              ) : (
                <span className="kkt-trong">-</span>
              )}
              {ct.TenNguoiDuyetDong && (
                <div className="kkt-mo-ta">
                  {ct.TenNguoiDuyetDong}
                  {ct.NgayDuyetDong
                    ? `, ${formatNgayGio(ct.NgayDuyetDong)}`
                    : ""}
                </div>
              )}
            </>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="page-container kkt-page">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <button
          className="cd-quay-lai"
          onClick={() => navigate("/quan-ly/ke-khai-thanh-tich")}
        >
          <i className="fa-solid fa-arrow-left"></i> Danh sách bản kê
        </button>
        <h2 className="kkt-title">
          Bản kê thành tích - {banKe.HoTen}
          {banKe.MaNhanVien ? ` (${banKe.MaNhanVien})` : ""}
        </h2>
        <span className="breadcrumb">
          {banKe.TenDonVi || "Chưa rõ đơn vị"} • Năm học {banKe.IdNam} • Nhóm II
          - thành tích vượt trội của viên chức / người lao động
        </span>
      </div>

      <div className="stat-card-grid">
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-blue">
            <i className="fa-solid fa-pen-to-square"></i>
          </div>
          <div>
            <div className="stat-label">Nhân viên kê</div>
            <div className="stat-value">{formatDiem(banKe.TongDiemKeKhai)}</div>
            <div className="cd-hint" style={{ marginTop: 0 }}>
              {banKe.SoDong ?? chiTiet.length} dòng
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box stat-icon-green">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="stat-label">Điểm đã chốt</div>
            <div className="stat-value" style={{ color: "#047857" }}>
              {formatDiem(banKe.TongDiemDuyet)}
            </div>
            {Math.abs(tongDiemDuKien - (Number(banKe.TongDiemDuyet) || 0)) >
              0.001 && (
              <div className="cd-hint" style={{ marginTop: 0 }}>
                dự kiến sau khi lưu: {formatDiem(tongDiemDuKien)}
              </div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box stat-icon-amber">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div>
            <div className="stat-label">Dòng chưa xét</div>
            <div className="stat-value">{soChuaXet}</div>
            {soChuaXet > 0 && (
              <div className="cd-hint" style={{ marginTop: 0 }}>
                gồm cả dòng của đơn vị khác
              </div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box stat-icon-purple">
            <i className="fa-solid fa-flag"></i>
          </div>
          <div>
            <div className="stat-label">Trạng thái</div>
            <div style={{ marginTop: "6px" }}>
              <BadgeMeta meta={TRANG_THAI_KE_KHAI_META[banKe.TrangThai]} />
            </div>
            <div className="cd-hint" style={{ marginTop: "4px" }}>
              Nhãn tự tính từ trạng thái từng dòng
            </div>
          </div>
        </div>
      </div>

      {/* Người duyệt phải thấy trần: chốt thêm một dòng sáng kiến thứ tư có thể
          không cộng thêm điểm nào vào KPI. */}
      <TongHopLoaiPanel tongHop={banKe.TongHopTheoLoai} />

      <DongCoVanDeBanner
        mode="forbidden-dong"
        dong={dongBiTuChoi}
        onChonDong={cuonToiDong}
        onDong={() => setDongBiTuChoi([])}
      />

      {Number(banKe.TrangThai) === TRANG_THAI_KE_KHAI.TAT_CA_DA_CHOT && (
        <div className="cd-hint cd-hint-ok kkt-banner">
          <i className="fa-solid fa-circle-check"></i> Mọi dòng hiện có đã chốt.
          Nhân viên vẫn kê thêm được thành tích khác trong năm, và bạn vẫn mở
          lại được đúng dòng cần sửa - không phải can thiệp cơ sở dữ liệu.
        </div>
      )}

      {Number(banKe.TrangThai) === TRANG_THAI_KE_KHAI.CON_TRA_VE && (
        <div className="cd-hint cd-hint-warn kkt-banner">
          <i className="fa-solid fa-rotate-left"></i> Bản kê còn dòng đã trả về.
          Lý do nằm trên từng dòng; nhân viên sửa và lưu dòng nào thì dòng đó tự
          quay lại chờ duyệt.
        </div>
      )}

      {Number(banKe.TrangThai) === TRANG_THAI_KE_KHAI.KHONG_CO_DONG && (
        <div className="cd-hint kkt-banner">
          <i className="fa-solid fa-pen"></i> Bản kê chưa có dòng nào.
        </div>
      )}

      {duyetDuoc && nhomTheoDonVi.length > 1 && (
        <div className="cd-hint kkt-banner">
          <i className="fa-solid fa-circle-info"></i> Bản kê này do{" "}
          <b>{nhomTheoDonVi.length} đơn vị</b> cùng thẩm định - mỗi mức thành
          tích có đơn vị phụ trách riêng. Bạn chỉ lưu được quyết định cho những
          dòng thuộc quyền của mình, và mỗi nhóm được gửi lên thành một lần lưu
          riêng.
        </div>
      )}

      <p className="sub-title" style={{ margin: "20px 0 10px 0" }}>
        CHI TIẾT THEO ĐƠN VỊ PHỤ TRÁCH
      </p>

      {chiTiet.length === 0 ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-clipboard-list"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Bản kê chưa có dòng nào
            </h3>
          </div>
        </div>
      ) : (
        nhomTheoDonVi.map((nhom) => {
          const thayDoi = dongThayDoiCuaNhom(nhom);
          const chuaXet = nhom.dong.filter(
            (ct) =>
              Number(ct.TrangThaiDong) === TRANG_THAI_DONG_TT.CHO_DUYET &&
              choPhepXetDong(ct),
          ).length;
          // Nhóm không phải việc của mình thì thu gọn sẵn, nhưng vẫn mở ra xem
          // được - thu gọn là hiển thị, không được phép giấu dữ liệu.
          const mo = nhomMo[nhom.khoa] ?? nhom.coTheDuyet;
          const dangLuu = dangLuuNhom === nhom.khoa;

          return (
            <div
              className={`kkt-nhom${nhom.coTheDuyet ? "" : " kkt-nhom-khoa"}`}
              key={nhom.khoa}
            >
              <div className="kkt-nhom-head">
                <button
                  type="button"
                  className="kkt-nhom-toggle"
                  onClick={() =>
                    setNhomMo((truoc) => ({ ...truoc, [nhom.khoa]: !mo }))
                  }
                  title={mo ? "Thu gọn" : "Mở rộng"}
                >
                  <i
                    className={`fa-solid ${mo ? "fa-chevron-down" : "fa-chevron-right"}`}
                  ></i>
                </button>
                <div className="kkt-nhom-ten">
                  <i className="fa-solid fa-user-check"></i> {nhom.ten}
                </div>
                <div className="kkt-nhom-dem">
                  {nhom.dong.length} dòng
                  {chuaXet > 0 ? ` · ${chuaXet} chờ bạn xét` : " · đã xét xong"}
                </div>
                {!nhom.coTheDuyet && (
                  <div className="kkt-nhom-khoa-note">
                    Nhóm này do {nhom.ten} xét — bạn xem được nhưng không lưu
                    quyết định được.
                  </div>
                )}

                {nhom.coTheDuyet && (
                  <div className="kkt-nhom-act">
                    <button
                      className="btn-cancel"
                      onClick={() => chotCaNhom(nhom)}
                      disabled={chuaXet === 0 || !!dangLuuNhom}
                      title="Đặt quyết định 'Chốt' cho mọi dòng đang chờ của nhóm này, giữ nguyên số lượng nhân viên kê"
                    >
                      <i className="fa-solid fa-check-double"></i> Chốt{" "}
                      {chuaXet} dòng chờ xét
                    </button>
                    <button
                      className="btn-submit"
                      onClick={() => luuNhom(nhom)}
                      disabled={thayDoi.length === 0 || !!dangLuuNhom}
                      title="Chỉ gửi dòng của nhóm này - đó là cách chắc chắn không bị máy chủ từ chối vì lẫn đơn vị"
                    >
                      <i
                        className={`fa-solid ${dangLuu ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}
                      ></i>{" "}
                      Lưu quyết định
                      {thayDoi.length > 0 ? ` (${thayDoi.length})` : ""}
                    </button>
                  </div>
                )}
              </div>

              {mo && (
                <div className="table-scroll">
                  <table className="custom-table kkt-bang kkt-bang-duyet">
                    <colgroup>
                      <col className="kkt-col-thanh-tich" />
                      <col className="kkt-col-quy" />
                      <col className="kkt-col-so-luong-ke" />
                      <col className="kkt-col-diem-ke" />
                      <col className="kkt-col-quyet-dinh" />
                      <col className="kkt-col-so-luong-duyet" />
                      <col className="kkt-col-diem-duyet" />
                      <col className="kkt-col-nhan-xet" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Thành tích / minh chứng</th>
                        <th>Quý</th>
                        <th style={{ textAlign: "right" }}>Nhân viên kê</th>
                        <th style={{ textAlign: "right" }}>Điểm kê</th>
                        <th>Quyết định</th>
                        <th>Số lượng chốt</th>
                        <th style={{ textAlign: "right" }}>Điểm chốt</th>
                        <th>Nhận xét</th>
                      </tr>
                    </thead>
                    <tbody>{nhom.dong.map((ct) => renderDong(ct))}</tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}

      {tongThayDoi > 0 && (
        <div className="cd-hint cd-hint-warn kkt-banner">
          <i className="fa-solid fa-circle-exclamation"></i> Còn{" "}
          <b>{tongThayDoi}</b> dòng có quyết định chưa lưu - rời trang bây giờ
          sẽ mất.
        </div>
      )}

      <div className="kkt-ls-head">
        <button
          type="button"
          className="cd-link-btn"
          onClick={() => setHienLichSu((truoc) => !truoc)}
        >
          <i
            className={`fa-solid ${hienLichSu ? "fa-chevron-up" : "fa-chevron-down"}`}
          ></i>{" "}
          Nhật ký bản kê ({lichSu.length})
        </button>
      </div>

      {hienLichSu && (
        <div className="modern-table-card">
          {lichSu.length === 0 ? (
            <div className="cd-empty">
              <i className="fa-solid fa-clock-rotate-left"></i>
              Chưa có thao tác nào được ghi nhận
            </div>
          ) : (
            <div className="table-scroll">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: "18%" }}>Thời điểm</th>
                    <th style={{ width: "18%" }}>Hành động</th>
                    <th style={{ width: "24%" }}>Người thực hiện</th>
                    <th>Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {lichSu.map((ls) => (
                    <tr key={ls.Id}>
                      <td className="cd-ls-thoi-gian">
                        {formatNgayGio(ls.NgayThucHien)}
                      </td>
                      <td>
                        {TEN_HANH_DONG_TT[ls.HanhDong] ||
                          `Hành động ${ls.HanhDong}`}
                      </td>
                      <td>{ls.TenNguoiThucHien || "-"}</td>
                      <td>
                        {ls.MoTa && <div>{ls.MoTa}</div>}
                        {(ls.DiemTruoc != null || ls.DiemSau != null) && (
                          <div className="cd-ls-diem">
                            Điểm: {formatDiem(ls.DiemTruoc)} →{" "}
                            {formatDiem(ls.DiemSau)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

export default ChiTietDuyetThanhTich;
