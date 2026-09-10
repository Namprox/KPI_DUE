import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toast } from "primereact/toast";
import { useAuth } from "../../context/AuthContext";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/KeKhaiThanhTich.css";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import MinhChungThanhTichRow from "../../components/KeKhaiThanhTich/MinhChungThanhTichRow";
import TraLaiThanhTichModal from "../../components/KeKhaiThanhTich/TraLaiThanhTichModal";
import TongHopLoaiPanel from "../../components/KeKhaiThanhTich/TongHopLoaiPanel";
import DongCoVanDeBanner from "../../components/KeKhaiThanhTich/DongCoVanDeBanner";
import { useMinhChungThanhTichPreview } from "../../hooks/useMinhChungThanhTichPreview";
import { formatNgayGio } from "../../utils/phieuApi";
import { ROLE_SETS, coQuyenTaiDonVi } from "../../utils/roles";
import {
  choPhepDuyet,
  chotBanKe,
  conDongChuaXet,
  daChot,
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
  traLaiBanKe,
} from "../../utils/keKhaiThanhTichApi";

/**
 * Quyết định của người duyệt cho một dòng, ở dạng state cục bộ.
 * `quyetDinh = ""` nghĩa là chưa xét - khác hẳn "đã từ chối".
 */
const tuChiTiet = (ct) => {
  const tt = Number(ct.TrangThaiDong);
  const daXet =
    tt === TRANG_THAI_DONG_TT.DA_DUYET || tt === TRANG_THAI_DONG_TT.TU_CHOI;
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
 *   ⚠️ **Quyền duyệt gác theo TỪNG DÒNG.** Mỗi mức thành tích có `IdDonViDuyet`
 *   riêng, nên một bản kê có thể do nhiều đơn vị cùng duyệt (P.TCHC xét khen
 *   thưởng, Trưởng Khoa xét sáng kiến...). Gửi lẫn MỘT dòng của đơn vị khác lên
 *   `duyet-chi-tiet` là CẢ REQUEST bị từ chối 403 FORBIDDEN_DONG và KHÔNG ghi
 *   gì cả.
 *
 * Vì DTO không có cờ `CanDuyetDong` từng dòng, FE không thể biết chắc mình duyệt
 * được dòng nào. Nên thiết kế chống lỗi theo hai lớp:
 *
 *  1. **Cấu trúc**: bảng gom dòng theo ĐƠN VỊ DUYỆT, và nút "Lưu quyết định" là
 *     của TỪNG NHÓM. Nhờ vậy payload luôn thuộc đúng một đơn vị - giao diện
 *     không dựng nổi một request lẫn đơn vị. Cố ý BỎ HẲN nút "duyệt tất cả"
 *     toàn bản kê của template gốc: trên bản kê nhiều đơn vị, nó là 403 chắc
 *     chắn.
 *  2. **Phục hồi**: nếu vẫn dính 403, `error.dongCoVanDe` cho biết dòng nào của
 *     đơn vị nào; banner nói rõ server chưa ghi gì nên thử lại là an toàn.
 *
 * Đoán mềm bằng `coQuyenTaiDonVi` chỉ để THU GỌN nhóm không phải việc của mình,
 * không bao giờ dùng làm cổng duy nhất: nhóm `IdDonViDuyet = null` ("đơn vị quản
 * lý trực tiếp") không phân giải được ở client nên luôn để mở.
 *
 * Ba quy ước còn lại giống module giờ quy đổi:
 *  - Điểm duyệt tính lại từ SNAPSHOT `DiemMuc` của dòng, không đọc lại danh mục.
 *  - Dòng bị từ chối cho điểm duyệt = 0 nhưng vẫn giữ số lượng để đối chiếu.
 *  - Chốt bị chặn khi CÒN BẤT KỲ dòng nào chưa xét, kể cả dòng của đơn vị khác.
 */
const ChiTietDuyetThanhTich = () => {
  const { id } = useParams();
  const toast = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [banKe, setBanKe] = useState(null);
  const [lichSu, setLichSu] = useState([]);
  const [quyetDinh, setQuyetDinh] = useState({});
  const [goc, setGoc] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [dangLuuNhom, setDangLuuNhom] = useState(null);
  const [dangChot, setDangChot] = useState(false);
  const [moTraLai, setMoTraLai] = useState(false);
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

  const duyetDuoc =
    choPhepDuyet(banKe) &&
    Number(banKe?.TrangThai) === TRANG_THAI_KE_KHAI.CHO_DUYET;

  const capNhat = (idChiTiet, thayDoi) =>
    setQuyetDinh((truoc) => ({
      ...truoc,
      [idChiTiet]: { ...truoc[idChiTiet], ...thayDoi },
    }));

  /**
   * Gom dòng theo đơn vị phụ trách - đây là trục tổ chức của cả màn hình.
   *
   * Khoá nhóm là `IdDonViDuyet` (null thành chuỗi "null" để Map không nuốt mất).
   * `coQuyenTaiDonVi` chỉ là ĐOÁN MỀM để thu gọn nhóm không phải việc của mình;
   * nhóm null luôn coi là "có thể của mình" vì client không phân giải được "đơn
   * vị quản lý trực tiếp" là đơn vị nào.
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
      coTheDuyet:
        n.idDonVi == null ||
        coQuyenTaiDonVi(
          ROLE_SETS.DUYET_KE_KHAI_THANH_TICH,
          n.idDonVi,
          user,
        ),
    }));
  }, [chiTiet, user]);

  /** Dòng có thay đổi so với server, trong phạm vi một nhóm. */
  const dongThayDoiCuaNhom = useCallback(
    (nhom) =>
      nhom.dong.filter((ct) => {
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

  const soChuaXet = chiTiet.filter(
    (ct) => !quyetDinh[ct.IdChiTiet]?.quyetDinh,
  ).length;

  const soDaXetTrenServer = chiTiet.filter(
    (ct) => Number(ct.TrangThaiDong) !== TRANG_THAI_DONG_TT.CHO_DUYET,
  ).length;

  /** Tổng điểm duyệt dự kiến theo quyết định đang chọn (chưa lưu). */
  const tongDiemDuKien = useMemo(
    () =>
      chiTiet.reduce((tong, ct) => {
        const qd = quyetDinh[ct.IdChiTiet];
        if (qd?.quyetDinh !== String(QUYET_DINH.DUYET)) return tong;
        const diem = tinhDiem(qd.soLuongDuyet, ct.DiemMuc);
        return tong + (diem || 0);
      }, 0),
    [chiTiet, quyetDinh],
  );

  const idBiTuChoi = useMemo(
    () => new Set(dongBiTuChoi.map((d) => Number(d.IdChiTiet))),
    [dongBiTuChoi],
  );

  /** Đặt "Duyệt" cho mọi dòng chưa xét TRONG MỘT NHÓM. */
  const duyetCaNhom = (nhom) => {
    setQuyetDinh((truoc) => {
      const sau = { ...truoc };
      nhom.dong.forEach((ct) => {
        if (sau[ct.IdChiTiet]?.quyetDinh) return;
        sau[ct.IdChiTiet] = {
          ...sau[ct.IdChiTiet],
          quyetDinh: String(QUYET_DINH.DUYET),
        };
      });
      return sau;
    });
  };

  /**
   * Lưu quyết định của ĐÚNG MỘT nhóm.
   *
   * Đây là lý do màn hình gom nhóm: payload chỉ chứa dòng của một đơn vị nên
   * không thể dính FORBIDDEN_DONG vì lẫn đơn vị. Nếu vẫn dính (người dùng giữ
   * vai trò ở đơn vị khác với suy đoán của FE), banner sẽ chỉ đúng dòng nào.
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

  const chot = async () => {
    if (tongThayDoi > 0) {
      showToast(
        "warn",
        "Còn quyết định chưa lưu",
        "Hãy lưu quyết định của từng nhóm trước khi chốt bản kê.",
      );
      return;
    }
    if (
      !window.confirm(
        "Chốt bản kê này? Trạng thái ĐÃ CHỐT là điểm cuối - hệ thống chưa có chức năng mở lại, chốt nhầm phải nhờ quản trị sửa dưới cơ sở dữ liệu.",
      )
    ) {
      return;
    }

    setDangChot(true);
    try {
      const item = await chotBanKe(banKe.IdKeKhai, {
        rowVersion: banKe.RowVersion,
      });
      apDungBanKe(item);
      setLichSu(await layLichSuBanKe(id).catch(() => lichSu));
      baoOk("Đã chốt bản kê");
      // Điểm chỉ chảy vào phiếu KPI sau khi tổng hợp lại - màn hình này không
      // biết IdPhieu nên không tự gọi được, phải nhắc người duyệt.
      showToast(
        "info",
        "Còn một bước nữa",
        "Điểm thành tích chỉ vào phiếu KPI sau khi chạy lại 'Tổng hợp tự động' trên màn hình phiếu của nhân viên này.",
      );
    } catch (error) {
      console.error("Lỗi chốt bản kê:", error);
      baoLoi(error.message);
    }
    setDangChot(false);
  };

  const traLai = async (lyDo) => {
    setDangChot(true);
    try {
      const item = await traLaiBanKe(banKe.IdKeKhai, lyDo, banKe.RowVersion);
      apDungBanKe(item);
      setLichSu(await layLichSuBanKe(id).catch(() => lichSu));
      setMoTraLai(false);
      baoOk("Đã trả bản kê về cho nhân viên");
    } catch (error) {
      console.error("Lỗi trả lại bản kê:", error);
      baoLoi(error.message);
    }
    setDangChot(false);
  };

  const cuonToiDong = (idChiTiet) => {
    const el = document.getElementById(`kkt-dong-${idChiTiet}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (isLoading) {
    return (
      <div className="page-container">
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
      <div className="page-container">
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
    const laDuyet = qd.quyetDinh === String(QUYET_DINH.DUYET);
    const laTuChoi = qd.quyetDinh === String(QUYET_DINH.TU_CHOI);
    const diemDuKien = laDuyet
      ? tinhDiem(qd.soLuongDuyet, ct.DiemMuc)
      : laTuChoi
        ? 0
        : null;
    const biChiMat = idBiTuChoi.has(Number(ct.IdChiTiet));
    const khoaSoLuong = ct.ChoPhepSoLuong === false;

    const classDong = [
      laTuChoi ? "kkt-row-tu-choi" : "",
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
                ct.YeuCauMinhChung ? "cd-hint cd-hint-error kkt-hint" : "kkt-trong"
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
                  onTai={downloadMinhChung}
                />
              ))}
            </div>
          )}
        </td>

        <td>{tenQuy(ct.Quy)}</td>

        <td className="table-num">{formatDiem(ct.SoLuong)}</td>

        <td className="table-num kkt-diem">{formatDiem(ct.DiemKeKhai)}</td>

        <td>
          {duyetDuoc ? (
            <div className="kkt-qd-nhom">
              <label className={`kkt-qd-nut${laDuyet ? " kkt-qd-duyet" : ""}`}>
                <input
                  type="radio"
                  name={`qd-${ct.IdChiTiet}`}
                  checked={laDuyet}
                  onChange={() =>
                    capNhat(ct.IdChiTiet, {
                      quyetDinh: String(QUYET_DINH.DUYET),
                    })
                  }
                  disabled={!!dangLuuNhom || dangChot}
                />
                <i className="fa-solid fa-check"></i> Duyệt
              </label>
              <label
                className={`kkt-qd-nut${laTuChoi ? " kkt-qd-tu-choi" : ""}`}
              >
                <input
                  type="radio"
                  name={`qd-${ct.IdChiTiet}`}
                  checked={laTuChoi}
                  onChange={() =>
                    capNhat(ct.IdChiTiet, {
                      quyetDinh: String(QUYET_DINH.TU_CHOI),
                    })
                  }
                  disabled={!!dangLuuNhom || dangChot}
                />
                <i className="fa-solid fa-xmark"></i> Từ chối
              </label>
            </div>
          ) : (
            <BadgeMeta meta={TRANG_THAI_DONG_TT_META[ct.TrangThaiDong]} />
          )}
        </td>

        <td>
          {duyetDuoc ? (
            <input
              type="number"
              className="form-input cd-diem-input kkt-so"
              min="0"
              value={khoaSoLuong ? "1" : (qd.soLuongDuyet ?? "")}
              onChange={(e) =>
                capNhat(ct.IdChiTiet, { soLuongDuyet: e.target.value })
              }
              disabled={laTuChoi || !!dangLuuNhom || dangChot || khoaSoLuong}
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
          {duyetDuoc ? (
            <textarea
              className="form-input cd-textarea kkt-mota"
              rows={2}
              maxLength={1000}
              value={qd.nhanXet ?? ""}
              onChange={(e) => capNhat(ct.IdChiTiet, { nhanXet: e.target.value })}
              placeholder={
                laTuChoi ? "Nêu rõ vì sao từ chối" : "Ghi chú (tuỳ chọn)"
              }
              disabled={!!dangLuuNhom || dangChot}
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
    <div className="page-container">
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
            <div className="stat-label">Điểm duyệt đã lưu</div>
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
            {banKe.NgayNop && (
              <div className="cd-hint" style={{ marginTop: "4px" }}>
                Nộp {formatNgayGio(banKe.NgayNop)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Người duyệt phải thấy trần: duyệt thêm một dòng sáng kiến thứ tư có
          thể không cộng thêm điểm nào vào KPI. */}
      <TongHopLoaiPanel tongHop={banKe.TongHopTheoLoai} />

      <DongCoVanDeBanner
        mode="forbidden-dong"
        dong={dongBiTuChoi}
        onChonDong={cuonToiDong}
        onDong={() => setDongBiTuChoi([])}
      />

      {daChot(banKe) && (
        <div className="cd-hint cd-hint-ok kkt-banner">
          <i className="fa-solid fa-lock"></i> Bản kê đã chốt
          {banKe.TenNguoiDuyet ? ` bởi ${banKe.TenNguoiDuyet}` : ""}
          {banKe.NgayDuyet ? ` ngày ${formatNgayGio(banKe.NgayDuyet)}` : ""} -
          chỉ đọc. Hệ thống chưa có chức năng mở lại bản kê đã chốt.
        </div>
      )}

      {Number(banKe.TrangThai) === TRANG_THAI_KE_KHAI.TRA_LAI && (
        <div className="cd-hint cd-hint-warn kkt-banner">
          <i className="fa-solid fa-rotate-left"></i> Bản kê đã được trả về cho
          nhân viên sửa. Lý do: <b>{banKe.NhanXetDuyet || "không ghi"}</b>. Chờ
          nhân viên nộp lại rồi duyệt tiếp.
        </div>
      )}

      {Number(banKe.TrangThai) === TRANG_THAI_KE_KHAI.NHAP && (
        <div className="cd-hint kkt-banner">
          <i className="fa-solid fa-pen"></i> Nhân viên đang kê khai, chưa nộp
          nên chưa duyệt được. Bảng dưới là số liệu tạm thời.
        </div>
      )}

      {duyetDuoc && nhomTheoDonVi.length > 1 && (
        <div className="cd-hint kkt-banner">
          <i className="fa-solid fa-circle-info"></i> Bản kê này do{" "}
          <b>{nhomTheoDonVi.length} đơn vị</b> cùng thẩm định - mỗi mức thành
          tích có đơn vị phụ trách riêng. Bạn chỉ lưu được quyết định cho nhóm
          thuộc quyền của mình, và <b>Chốt</b> chỉ mở khi mọi đơn vị đã xét xong
          phần của họ.
        </div>
      )}

      {duyetDuoc && (
        <div className="cd-toolbar kkt-thanh-duyet">
          {/* KHÔNG có nút "duyệt tất cả" toàn bản kê: trên bản kê nhiều đơn vị
              nó là 403 FORBIDDEN_DONG chắc chắn. Duyệt hàng loạt nằm ở từng
              nhóm bên dưới. */}
          <button
            className="btn-submit kkt-btn-chot"
            onClick={chot}
            disabled={dangChot || conDongChuaXet(banKe) || tongThayDoi > 0}
            title={
              conDongChuaXet(banKe)
                ? `Còn ${banKe.SoDongChoDuyet} dòng chưa duyệt hoặc chưa từ chối${
                    nhomTheoDonVi.length > 1
                      ? " - có thể là dòng của đơn vị khác, bạn không xét thay được"
                      : ""
                  }`
                : tongThayDoi > 0
                  ? "Hãy lưu quyết định của từng nhóm trước khi chốt"
                  : "Chốt bản kê - không mở lại được"
            }
          >
            <i
              className={`fa-solid ${dangChot ? "fa-spinner fa-spin" : "fa-lock"}`}
            ></i>{" "}
            Chốt bản kê
          </button>

          <button
            className="cd-btn-tra-ve"
            onClick={() => setMoTraLai(true)}
            disabled={!!dangLuuNhom || dangChot}
          >
            <i className="fa-solid fa-rotate-left"></i> Trả lại cho nhân viên
          </button>
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
            (ct) => !quyetDinh[ct.IdChiTiet]?.quyetDinh,
          ).length;
          // Nhóm nghi ngờ không phải việc của mình thì thu gọn sẵn, nhưng vẫn
          // mở ra xem được - đoán mềm không được phép giấu dữ liệu.
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
                  {chuaXet > 0 ? ` · ${chuaXet} chưa xét` : " · đã xét xong"}
                </div>
                {!nhom.coTheDuyet && (
                  <div className="kkt-nhom-khoa-note">
                    Nhóm này do {nhom.ten} duyệt — bạn xem được nhưng không lưu
                    quyết định được.
                  </div>
                )}

                {duyetDuoc && (
                  <div className="kkt-nhom-act">
                    <button
                      className="btn-cancel"
                      onClick={() => duyetCaNhom(nhom)}
                      disabled={chuaXet === 0 || !!dangLuuNhom || dangChot}
                      title="Đặt quyết định 'Duyệt' cho mọi dòng chưa xét của nhóm này, giữ nguyên số lượng nhân viên kê"
                    >
                      <i className="fa-solid fa-check-double"></i> Duyệt{" "}
                      {chuaXet} dòng còn lại
                    </button>
                    <button
                      className="btn-submit"
                      onClick={() => luuNhom(nhom)}
                      disabled={
                        thayDoi.length === 0 || !!dangLuuNhom || dangChot
                      }
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
                  <table
                    className="custom-table kkt-bang"
                    style={{ minWidth: "1180px" }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: "30%" }}>
                          Thành tích / minh chứng
                        </th>
                        <th style={{ width: "9%" }}>Quý</th>
                        <th style={{ width: "10%", textAlign: "right" }}>
                          Nhân viên kê
                        </th>
                        <th style={{ width: "8%", textAlign: "right" }}>
                          Điểm kê
                        </th>
                        <th style={{ width: "15%" }}>Quyết định</th>
                        <th style={{ width: "10%" }}>Số lượng duyệt</th>
                        <th style={{ width: "8%", textAlign: "right" }}>
                          Điểm duyệt
                        </th>
                        <th style={{ width: "18%" }}>Nhận xét</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nhom.dong.map((ct) => renderDong(ct))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
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

      <TraLaiThanhTichModal
        isOpen={moTraLai}
        soDongDaXet={soDaXetTrenServer}
        dangGui={dangChot}
        onClose={() => setMoTraLai(false)}
        onSubmit={traLai}
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

export default ChiTietDuyetThanhTich;
