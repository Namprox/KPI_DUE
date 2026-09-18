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
import "../../css/KeKhaiGioQuyDoi.css";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import MinhChungKeKhaiRow from "../../components/KeKhaiGioQuyDoi/MinhChungKeKhaiRow";
import { useMinhChungKeKhaiPreview } from "../../hooks/useMinhChungKeKhaiPreview";
import { formatNgayGio } from "../../utils/phieuApi";
import { tenKyHoc } from "../../utils/phanHoiSinhVienApi";
import {
  choPhepDuyet,
  duyetChiTiet,
  formatGio,
  layBanKeTheoId,
  layLichSuBanKe,
  QUYET_DINH,
  TEN_HANH_DONG_KK,
  TRANG_THAI_DONG_KK,
  TRANG_THAI_DONG_KK_META,
  TRANG_THAI_KE_KHAI,
  TRANG_THAI_KE_KHAI_META,
  tinhGio,
} from "../../utils/keKhaiGioQuyDoiApi";

/**
 * Quyết định của người duyệt cho một dòng, ở dạng state cục bộ.
 * `quyetDinh = ""` nghĩa là chưa xét - khác hẳn "đã trả về".
 */
const tuChiTiet = (ct) => {
  const tt = Number(ct.TrangThaiDong);
  const daXet =
    tt === TRANG_THAI_DONG_KK.DA_CHOT || tt === TRANG_THAI_DONG_KK.TRA_VE;
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
  JSON.stringify([qd.quyetDinh, String(qd.soLuongDuyet).trim(), qd.nhanXet]);

const BadgeMeta = ({ meta }) => {
  if (!meta) return <span className="kkq-trong">-</span>;
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
 * Duyệt một bản kê giờ quy đổi - màn hình thao tác của TK/TKL/TP (HT/Admin xem
 * toàn trường).
 *
 * Đơn vị nghiệp vụ là TỪNG DÒNG: mỗi đầu việc được chốt hoặc trả về riêng, và
 * người duyệt **được sửa số lượng** trước khi chốt (ví dụ giảng viên kê 12 bài
 * nhưng minh chứng chỉ có 10).
 *
 * Bốn quy ước phải phản ánh đúng, nếu không sẽ chốt nhầm số liệu:
 *
 *  - **Giờ duyệt tính lại từ SNAPSHOT của dòng**, không đọc lại danh mục. Cột
 *    "Giờ duyệt dự kiến" ở đây dùng đúng `HeSo`/`SoLuongMau` server đã ghi vào
 *    dòng, nên khớp với con số server sẽ tính.
 *  - **Dòng trả về cho giờ duyệt = 0** nhưng vẫn giữ số lượng để đối chiếu.
 *  - Không còn chốt/trả cả bản kê. Mỗi lần lưu quyết định có hiệu lực ngay trên
 *    đúng các dòng thay đổi; dòng đã chốt vẫn có thể mở lại bằng cách trả về.
 *
 * Chỉ gửi lên những dòng CÓ THAY ĐỔI so với dữ liệu server, để nhật ký không đầy
 * những bản ghi "duyệt lại y nguyên" mỗi lần bấm Lưu.
 */
const ChiTietDuyetKeKhai = () => {
  const { id } = useParams();
  const toast = useRef(null);
  const navigate = useNavigate();

  const [banKe, setBanKe] = useState(null);
  const [lichSu, setLichSu] = useState([]);
  const [quyetDinh, setQuyetDinh] = useState({});
  const [goc, setGoc] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [hienLichSu, setHienLichSu] = useState(false);
  const [loi, setLoi] = useState("");

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
      console.error("Lỗi tải bản kê giờ quy đổi:", error);
      setBanKe(null);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [id, apDungBanKe]);

  useEffect(() => {
    taiDuLieu();
  }, [taiDuLieu]);

  const chiTiet = useMemo(() => banKe?.ChiTiet || [], [banKe]);

  const duyetDuoc = choPhepDuyet(banKe);

  const capNhat = (idChiTiet, thayDoi) =>
    setQuyetDinh((truoc) => ({
      ...truoc,
      [idChiTiet]: { ...truoc[idChiTiet], ...thayDoi },
    }));

  /** Dòng có thay đổi so với server - chỉ những dòng này mới được gửi lên. */
  const dongThayDoi = useMemo(
    () =>
      chiTiet.filter((ct) => {
        if (ct.ChoPhepXet !== true) return false;
        const hienTai = quyetDinh[ct.IdChiTiet];
        if (!hienTai || !hienTai.quyetDinh) return false;
        return chuKyQuyetDinh(hienTai) !== chuKyQuyetDinh(goc[ct.IdChiTiet]);
      }),
    [chiTiet, quyetDinh, goc],
  );

  const soChuaXet = chiTiet.filter(
    (ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG_KK.CHO_DUYET,
  ).length;

  /** Tổng giờ duyệt dự kiến theo quyết định đang chọn (chưa lưu). */
  const tongGioDuKien = useMemo(
    () =>
      chiTiet.reduce((tong, ct) => {
        const qd = quyetDinh[ct.IdChiTiet];
        if (qd?.quyetDinh !== String(QUYET_DINH.CHOT)) return tong;
        const gio = tinhGio(qd.soLuongDuyet, ct.HeSo, ct.SoLuongMau);
        return tong + (gio || 0);
      }, 0),
    [chiTiet, quyetDinh],
  );

  const duyetTatCaConLai = () => {
    setQuyetDinh((truoc) => {
      const sau = { ...truoc };
      chiTiet.forEach((ct) => {
        if (
          ct.ChoPhepXet !== true ||
          Number(ct.TrangThaiDong) !== TRANG_THAI_DONG_KK.CHO_DUYET
        )
          return;
        sau[ct.IdChiTiet] = {
          ...sau[ct.IdChiTiet],
          quyetDinh: String(QUYET_DINH.CHOT),
        };
      });
      return sau;
    });
  };

  const luuQuyetDinh = async () => {
    if (dongThayDoi.length === 0) {
      showToast("info", "Không có gì để lưu", "Chưa có dòng nào thay đổi");
      return;
    }

    const soAm = dongThayDoi.filter((ct) => {
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

    const thieuLyDo = dongThayDoi.filter((ct) => {
      const qd = quyetDinh[ct.IdChiTiet];
      return (
        qd.quyetDinh === String(QUYET_DINH.TRA_VE) &&
        !qd.nhanXet?.trim()
      );
    }).length;
    if (thieuLyDo > 0) {
      showToast(
        "warn",
        "Chưa lưu được",
        `Có ${thieuLyDo} dòng trả về chưa ghi lý do`,
      );
      return;
    }

    setDangLuu(true);
    try {
      const item = await duyetChiTiet(
        banKe.IdKeKhai,
        dongThayDoi.map((ct) => {
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
      setLichSu(await layLichSuBanKe(id).catch(() => lichSu));
      baoOk(`Đã cập nhật kết quả xét cho ${dongThayDoi.length} dòng`);
    } catch (error) {
      console.error("Lỗi lưu kết quả duyệt:", error);
      baoLoi(error.message);
    }
    setDangLuu(false);
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
            onClick={() => navigate("/quan-ly/ke-khai-gio-quy-doi")}
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

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <button
          className="cd-quay-lai"
          onClick={() => navigate("/quan-ly/ke-khai-gio-quy-doi")}
        >
          <i className="fa-solid fa-arrow-left"></i> Danh sách bản kê
        </button>
        <h2 className="kkq-title">
          Bản kê giờ quy đổi - {banKe.HoTen}
          {banKe.MaNhanVien ? ` (${banKe.MaNhanVien})` : ""}
        </h2>
        <span className="breadcrumb">
          {banKe.TenDonVi || "Chưa rõ đơn vị"} • Năm học {banKe.IdNam} • Phụ lục
          II - quy đổi hoạt động chuyên môn ra giờ chuẩn giảng dạy
        </span>
      </div>

      <div className="stat-card-grid">
        <div className="stat-card">
          <div className="stat-icon-box stat-icon-blue">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div>
            <div className="stat-label">Giảng viên kê</div>
            <div className="stat-value">{formatGio(banKe.TongGioKeKhai)}</div>
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
            <div className="stat-label">Giờ duyệt đã lưu</div>
            <div className="stat-value" style={{ color: "#047857" }}>
              {formatGio(banKe.TongGioDuyet)}
            </div>
            {Math.abs(tongGioDuKien - (Number(banKe.TongGioDuyet) || 0)) >
              0.001 && (
              <div className="cd-hint" style={{ marginTop: 0 }}>
                dự kiến sau khi lưu: {formatGio(tongGioDuKien)}
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
                có thể chốt hoặc trả về ngay từng dòng
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

      {Number(banKe.TrangThai) === TRANG_THAI_KE_KHAI.TAT_CA_DA_CHOT && (
        <div className="cd-hint cd-hint-ok kkq-banner">
          <i className="fa-solid fa-circle-check"></i> Mọi dòng hiện có đã chốt.
          Bạn vẫn có thể xét lại và trả về đúng dòng cần mở; không cần can thiệp
          cơ sở dữ liệu.
        </div>
      )}

      {Number(banKe.TrangThai) === TRANG_THAI_KE_KHAI.CON_TRA_VE && (
        <div className="cd-hint cd-hint-warn kkq-banner">
          <i className="fa-solid fa-rotate-left"></i> Bản kê còn dòng đã trả về.
          Lý do nằm trên từng dòng; giảng viên sửa và lưu dòng nào thì dòng đó tự
          quay lại chờ duyệt.
        </div>
      )}

      {Number(banKe.TrangThai) === TRANG_THAI_KE_KHAI.KHONG_CO_DONG && (
        <div className="cd-hint kkq-banner">
          <i className="fa-solid fa-pen"></i> Bản kê chưa có dòng nào.
        </div>
      )}

      {duyetDuoc && (
        <div className="cd-toolbar kkq-thanh-duyet">
          <button
            className="btn-cancel"
            onClick={duyetTatCaConLai}
            disabled={soChuaXet === 0 || dangLuu}
            title="Đặt quyết định 'Chốt' cho mọi dòng đang chờ, giữ nguyên số lượng giảng viên kê"
          >
            <i className="fa-solid fa-check-double"></i> Chốt tất cả dòng chưa
            xét ({soChuaXet})
          </button>

          <button
            className="btn-submit"
            onClick={luuQuyetDinh}
            disabled={dongThayDoi.length === 0 || dangLuu}
          >
            <i
              className={`fa-solid ${dangLuu ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}
            ></i>{" "}
            Lưu kết quả xét
            {dongThayDoi.length > 0 ? ` (${dongThayDoi.length})` : ""}
          </button>
        </div>
      )}

      <p className="sub-title" style={{ margin: "20px 0 10px 0" }}>
        CHI TIẾT TỪNG ĐẦU VIỆC
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
        <div className="modern-table-card kkq-bang-card">
          <div className="table-scroll">
            <table
              className="custom-table kkq-bang"
              style={{ minWidth: "1180px" }}
            >
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Đầu việc / minh chứng</th>
                  <th style={{ width: "9%" }}>Kỳ học</th>
                  <th style={{ width: "10%", textAlign: "right" }}>
                    Giảng viên kê
                  </th>
                  <th style={{ width: "8%", textAlign: "right" }}>Giờ kê</th>
                  <th style={{ width: "15%" }}>Quyết định</th>
                  <th style={{ width: "10%" }}>Số lượng duyệt</th>
                  <th style={{ width: "8%", textAlign: "right" }}>Giờ duyệt</th>
                  <th style={{ width: "18%" }}>Nhận xét</th>
                </tr>
              </thead>
              <tbody>
                {chiTiet.map((ct) => {
                  const qd = quyetDinh[ct.IdChiTiet] || {};
                  const xetDuoc = duyetDuoc && ct.ChoPhepXet === true;
                  const laChot = qd.quyetDinh === String(QUYET_DINH.CHOT);
                  const laTraVe = qd.quyetDinh === String(QUYET_DINH.TRA_VE);
                  const gioDuKien = laChot
                    ? tinhGio(qd.soLuongDuyet, ct.HeSo, ct.SoLuongMau)
                    : laTraVe
                      ? 0
                      : null;

                  return (
                    <tr
                      key={ct.IdChiTiet}
                      className={laTraVe ? "kkq-row-tra-ve" : undefined}
                    >
                      <td>
                        <div className="kkq-ten-cv">{ct.TenCongViec}</div>
                        {ct.GhiChuQuyDoi && (
                          <div className="kkq-heso">
                            <i className="fa-solid fa-calculator"></i>{" "}
                            {ct.GhiChuQuyDoi}
                          </div>
                        )}
                        {ct.MoTa && <div className="kkq-mo-ta">{ct.MoTa}</div>}
                        {(ct.MinhChung || []).length === 0 ? (
                          <div className="kkq-trong">Không có minh chứng</div>
                        ) : (
                          <div className="kkq-mc-list">
                            {ct.MinhChung.map((mc) => (
                              <MinhChungKeKhaiRow
                                key={mc.IdMinhChungKk}
                                mc={mc}
                                onXem={openPreview}
                                onTai={downloadMinhChung}
                              />
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

                      <td>
                        {xetDuoc ? (
                          <div className="kkq-qd-nhom">
                            <label
                              className={`kkq-qd-nut${laChot ? " kkq-qd-duyet" : ""}`}
                            >
                              <input
                                type="radio"
                                name={`qd-${ct.IdChiTiet}`}
                                checked={laChot}
                                onChange={() =>
                                  capNhat(ct.IdChiTiet, {
                                    quyetDinh: String(QUYET_DINH.CHOT),
                                  })
                                }
                                disabled={dangLuu}
                              />
                              <i className="fa-solid fa-lock"></i> Chốt
                            </label>
                            <label
                              className={`kkq-qd-nut${laTraVe ? " kkq-qd-tra-ve" : ""}`}
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
                                disabled={dangLuu}
                              />
                              <i className="fa-solid fa-rotate-left"></i> Trả về
                            </label>
                          </div>
                        ) : (
                          <BadgeMeta
                            meta={TRANG_THAI_DONG_KK_META[ct.TrangThaiDong]}
                          />
                        )}
                      </td>

                      <td>
                        {xetDuoc ? (
                          <input
                            type="number"
                            className="form-input cd-diem-input kkq-so"
                            min="0"
                            value={qd.soLuongDuyet ?? ""}
                            onChange={(e) =>
                              capNhat(ct.IdChiTiet, {
                                soLuongDuyet: e.target.value,
                              })
                            }
                            disabled={laTraVe || dangLuu}
                            title="Bỏ trống = giữ nguyên số lượng giảng viên đã kê"
                          />
                        ) : ct.SoLuongDuyet == null ? (
                          <span className="kkq-trong">-</span>
                        ) : (
                          formatGio(ct.SoLuongDuyet)
                        )}
                      </td>

                      <td className="table-num kkq-gio">
                        {gioDuKien == null ? (
                          <span className="kkq-trong">-</span>
                        ) : (
                          <b>{formatGio(gioDuKien)}</b>
                        )}
                      </td>

                      <td>
                        {xetDuoc ? (
                          <textarea
                            className="form-input cd-textarea kkq-mota"
                            rows={2}
                            maxLength={1000}
                            value={qd.nhanXet ?? ""}
                            onChange={(e) =>
                              capNhat(ct.IdChiTiet, { nhanXet: e.target.value })
                            }
                            placeholder={
                              laTraVe
                                ? "Bắt buộc: nêu rõ lý do trả về"
                                : "Ghi chú (tuỳ chọn)"
                            }
                            disabled={dangLuu}
                          />
                        ) : ct.NhanXetDuyet ? (
                          <div className="kkq-nhan-xet">{ct.NhanXetDuyet}</div>
                        ) : (
                          <span className="kkq-trong">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-total-row">
                  <td colSpan={3}>
                    Tổng {chiTiet.length} dòng - {soChuaXet} chưa xét
                  </td>
                  <td className="table-num kkq-gio">
                    <b>{formatGio(banKe.TongGioKeKhai)}</b>
                  </td>
                  <td colSpan={2} className="kkq-tong-ghi-chu">
                    Giờ duyệt chỉ cộng dòng được duyệt
                  </td>
                  <td className="table-num kkq-gio">
                    <b>
                      {formatGio(
                        duyetDuoc ? tongGioDuKien : banKe.TongGioDuyet,
                      )}
                    </b>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="kkq-ls-head">
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
                        {TEN_HANH_DONG_KK[ls.HanhDong] ||
                          `Hành động ${ls.HanhDong}`}
                      </td>
                      <td>{ls.TenNguoiThucHien || "-"}</td>
                      <td>
                        {ls.MoTa && <div>{ls.MoTa}</div>}
                        {(ls.GioTruoc != null || ls.GioSau != null) && (
                          <div className="cd-ls-diem">
                            Giờ: {formatGio(ls.GioTruoc)} →{" "}
                            {formatGio(ls.GioSau)}
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

export default ChiTietDuyetKeKhai;
