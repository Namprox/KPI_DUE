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
import "../../css/QuanLyChamDiem/PhanCongNhiemVuKhoa.css";
import SearchSelect from "../../components/Common/SearchSelect";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import NvkPanelNhiemVu from "../../components/QuanLyChamDiem/NvkPanelNhiemVu";
import NvkPanelPhanHoi from "../../components/QuanLyChamDiem/NvkPanelPhanHoi";
import NvkPanelTongHop from "../../components/QuanLyChamDiem/NvkPanelTongHop";
import NvkPanelLichSu from "../../components/QuanLyChamDiem/NvkPanelLichSu";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useMinhChungNvkPreview } from "../../hooks/useMinhChungNvkPreview";
import { apiFetch } from "../../utils/api";
import { formatDiem } from "../../utils/phieuApi";
import {
  buildDonViIndex,
  laDonViKhoa,
  resolveKhoaCuaNhanVien,
} from "../../utils/viPhamPermissions";
import { coTheNhap, layCauHinh, layKy } from "../../utils/nhiemVuKhoaApi";

const TAB = {
  NHIEM_VU: "nhiem-vu",
  PHAN_HOI: "phan-hoi",
  TONG_HOP: "tong-hop",
  LICH_SU: "lich-su",
};

const NHOM_TAT_CA = "";

/**
 * Khoa nhập nhiệm vụ phục vụ cộng đồng và phân công vai trò cho giảng viên.
 *
 * Trang này là KHUNG của cả phân hệ phía Khoa: bốn tab (nhiệm vụ · phản hồi ·
 * tổng hợp & chốt · nhật ký) dùng chung một lần nạp cấu hình và kỳ, thay vì bốn
 * màn hình rời cùng gọi lại `/cau-hinh` và `/ky`. Nhờ vậy badge "phản hồi chờ
 * xử lý" bấm được, và màn hình kiểm tra chốt nhảy thẳng sang đúng nhiệm vụ /
 * phản hồi đang gây chặn.
 *
 * Nghiệp vụ đảo chiều so với mô hình cũ: **Khoa nhập, giảng viên phản hồi.** Vai
 * trò chủ trì / phối hợp chính / phối hợp là quan hệ tương đối giữa nhiều người
 * trong CÙNG một nhiệm vụ, chỉ Khoa mới có thẩm quyền phân định.
 *
 * Phạm vi dữ liệu: đúng Khoa của người đăng nhập, suy từ `IdDonVi` rồi roll-up
 * lên cấp Khoa (thư ký có thể nằm ở Bộ môn con). Không có dropdown chọn Khoa
 * khác - server cũng chặn lại theo token.
 *
 * Quyền thao tác lấy từ cờ `CanNhap` / `CanChot` do endpoint `/ky` trả về, KHÔNG
 * suy từ `MaChucVu`: server còn xét cả phạm vi đơn vị lẫn trạng thái kỳ. Thư ký
 * Khoa nhập được nhưng không chốt được.
 *
 * Kỳ được tạo LƯỜI - endpoint `/ky` tự tạo nếu chưa có, nên không có nút "mở kỳ".
 */
const PhanCongNhiemVuKhoa = () => {
  const toast = useRef(null);
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [donViList, setDonViList] = useState([]);
  const [dangTaiDonVi, setDangTaiDonVi] = useState(true);

  const [cauHinh, setCauHinh] = useState(null);
  const [ky, setKy] = useState(null);
  const [nhomKy, setNhomKy] = useState([]);

  const [tab, setTab] = useState(TAB.NHIEM_VU);
  const [nhomLoc, setNhomLoc] = useState(NHOM_TAT_CA);
  const [tuKhoa, setTuKhoa] = useState("");
  const [tuKhoaApDung, setTuKhoaApDung] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [loi, setLoi] = useState("");
  const [yeuCauForm, setYeuCauForm] = useState(null);

  const showToast = useCallback((severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 3500 });
  }, []);

  const baoLoi = useCallback(
    (message) => showToast("error", "Lỗi", message),
    [showToast],
  );
  const baoThanhCong = useCallback(
    (message) => showToast("success", "Thành công", message),
    [showToast],
  );

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungNvkPreview(baoLoi);

  useEffect(() => {
    let huy = false;
    const tai = async () => {
      try {
        const res = await apiFetch("donvi");
        if (!res.ok) throw new Error("Không tải được danh sách đơn vị");
        const result = await res.json();
        if (!huy) {
          setDonViList(result.Items || (Array.isArray(result) ? result : []));
        }
      } catch (error) {
        console.error("Lỗi tải danh sách đơn vị:", error);
        if (!huy) baoLoi(error.message);
      } finally {
        if (!huy) setDangTaiDonVi(false);
      }
    };
    tai();
    return () => {
      huy = true;
    };
  }, [baoLoi]);

  /** Khoa chủ quản của người đăng nhập - phạm vi dữ liệu của cả màn hình. */
  const khoaCuaToi = useMemo(() => {
    const donViIndex = buildDonViIndex(donViList);
    if (user?.DonVi && Array.isArray(user.DonVi)) {
      for (const d of user.DonVi) {
        const k = resolveKhoaCuaNhanVien(d.IdDonVi, donViIndex);
        if (laDonViKhoa(k)) return k;
      }
    }
    const khoa = resolveKhoaCuaNhanVien(user?.IdDonVi, donViIndex);
    return laDonViKhoa(khoa) ? khoa : null;
  }, [user, donViList]);

  const idDonVi = khoaCuaToi?.IdDonVi;
  const sanSang = !!selectedNam && !!idDonVi;

  // Gõ tới đâu lọc tới đó nhưng chỉ gọi API khi người dùng ngừng gõ
  useEffect(() => {
    const timer = setTimeout(() => setTuKhoaApDung(tuKhoa.trim()), 400);
    return () => clearTimeout(timer);
  }, [tuKhoa]);

  /**
   * Cấu hình + kỳ: chỉ phụ thuộc (năm × Khoa), nạp một lần cho cả bốn tab.
   * Mọi thao tác ghi đều gọi lại hàm này để badge đếm và trạng thái kỳ khớp lại.
   */
  const taiTongQuan = useCallback(async () => {
    if (!sanSang) return;
    setIsLoading(true);
    setLoi("");
    try {
      const [ch, kq] = await Promise.all([
        layCauHinh({ idDonVi, idNam: selectedNam }),
        layKy({ idNam: selectedNam, idDonVi }),
      ]);
      setCauHinh(ch);
      setKy(kq.ky);
      setNhomKy(kq.nhom);
    } catch (error) {
      console.error("Lỗi tải tổng quan kỳ nhiệm vụ Khoa:", error);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [sanSang, idDonVi, selectedNam]);

  useEffect(() => {
    if (!dangTaiNam && !dangTaiDonVi) taiTongQuan();
  }, [dangTaiNam, dangTaiDonVi, taiTongQuan]);

  const choPhepSua = coTheNhap(ky);

  /** Từ tab Phản hồi / Kiểm tra chốt nhảy sang form nhiệm vụ tương ứng. */
  const moNhiemVu = (idNhiemVuKhoa) => {
    setTab(TAB.NHIEM_VU);
    setYeuCauForm({ nonce: Date.now(), idNhiemVuKhoa });
  };

  const taoNhiemVuTrongNhom = (idNhomNv) => {
    setTab(TAB.NHIEM_VU);
    setYeuCauForm({ nonce: Date.now(), idNhomNv });
  };

  const soPhanHoiCho = ky?.SoPhanHoiCho ?? 0;
  const thieuKhoa = !dangTaiDonVi && !khoaCuaToi;
  const dangTaiLanDau = (isLoading || dangTaiNam || dangTaiDonVi) && !ky;

  const chungChoPanel = {
    idNam: selectedNam,
    idDonVi,
    onLamMoiKy: taiTongQuan,
    onXemMinhChung: openPreview,
    onTaiMinhChung: downloadMinhChung,
    onError: baoLoi,
    onSuccess: baoThanhCong,
  };

  const renderPanel = () => {
    if (tab === TAB.PHAN_HOI) {
      return (
        <NvkPanelPhanHoi
          {...chungChoPanel}
          choPhepSua={choPhepSua}
          onMoNhiemVu={moNhiemVu}
          onTaoNhiemVu={taoNhiemVuTrongNhom}
        />
      );
    }
    if (tab === TAB.TONG_HOP) {
      return (
        <NvkPanelTongHop
          {...chungChoPanel}
          ky={ky}
          choPhepSua={choPhepSua}
          onMoNhiemVu={moNhiemVu}
          onSangPhanHoi={() => setTab(TAB.PHAN_HOI)}
        />
      );
    }
    if (tab === TAB.LICH_SU) {
      return <NvkPanelLichSu {...chungChoPanel} />;
    }
    return (
      <NvkPanelNhiemVu
        {...chungChoPanel}
        cauHinh={cauHinh}
        choPhepSua={choPhepSua}
        nhomLoc={nhomLoc}
        tuKhoa={tuKhoaApDung}
        yeuCauForm={yeuCauForm}
        onYeuCauXong={() => setYeuCauForm(null)}
      />
    );
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 className="nvk-title">Phân công phục vụ cộng đồng</h2>
        <span className="breadcrumb">
          Khoa nhập nhiệm vụ và phân định vai trò - nguồn điểm KPI Nhóm III của
          giảng viên
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
            disabled={dangTaiNam}
          />
        </div>

        {/* Hai ô lọc chỉ có nghĩa với tab Nhiệm vụ nên ẩn ở các tab khác */}
        {tab === TAB.NHIEM_VU && (
          <>
            <div className="cd-field nvk-o-nhom">
              <label className="cd-label">Nhóm nhiệm vụ</label>
              <SearchSelect
                value={nhomLoc}
                onChange={(v) => setNhomLoc(String(v ?? NHOM_TAT_CA))}
                options={[
                  {
                    value: NHOM_TAT_CA,
                    label: `Tất cả (${ky?.SoNhiemVu ?? 0})`,
                  },
                  ...nhomKy.map((n) => ({
                    value: n.IdNhomNv,
                    label: `${n.TenNhom} (${n.SoNhiemVu ?? 0})`,
                  })),
                ]}
                placeholder="Tất cả nhóm"
                searchable
                searchPlaceholder="Tìm nhóm..."
                disabled={!sanSang}
              />
            </div>

            <div className="cd-field nvk-o-tim">
              <label className="cd-label">Tìm nhiệm vụ</label>
              <input
                type="text"
                className="form-input"
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                placeholder="Tên hoặc mô tả nhiệm vụ..."
                disabled={!sanSang}
              />
            </div>
          </>
        )}

        <button
          className="btn-cancel"
          onClick={taiTongQuan}
          disabled={isLoading || !sanSang}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>

        {choPhepSua && tab === TAB.NHIEM_VU && (
          <button
            className="btn-add-new"
            onClick={() => setYeuCauForm({ nonce: Date.now(), idNhomNv: "" })}
          >
            <i className="fa-solid fa-plus"></i> Thêm nhiệm vụ
          </button>
        )}
      </div>

      {thieuKhoa ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-building-circle-exclamation"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không xác định được Khoa của bạn
            </h3>
            <p style={{ margin: 0 }}>
              Module này chỉ áp dụng cho Khoa. Đơn vị trong hồ sơ của bạn không
              thuộc Khoa nào - liên hệ quản trị viên để cập nhật lại đơn vị.
            </p>
          </div>
        </div>
      ) : dangTaiLanDau ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải dữ liệu của Khoa...
          </div>
        </div>
      ) : loi ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không tải được dữ liệu
            </h3>
            <p style={{ margin: 0 }}>{loi}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="nvk-ky-banner">
            <div className="nvk-ky-info">
              <div className="nvk-ky-don-vi">
                <i className="fa-solid fa-building-columns"></i>{" "}
                {ky?.TenDonVi || khoaCuaToi?.TenDonVi}
              </div>
              <div className="nvk-ky-meta">
                <span className="nvk-han">
                  <i className="fa-solid fa-list-check"></i>{" "}
                  <b>{ky?.SoNhiemVu ?? 0}</b> nhiệm vụ
                </span>
                {soPhanHoiCho > 0 && (
                  <button
                    type="button"
                    className="cd-status-badge nvk-badge-cho nvk-badge-nut"
                    onClick={() => setTab(TAB.PHAN_HOI)}
                  >
                    <i className="fa-solid fa-comment-dots"></i> {soPhanHoiCho}{" "}
                    phản hồi chờ xử lý
                  </button>
                )}
              </div>
            </div>
          </div>

          {cauHinh?.LechCauHinh && (
            <div className="cd-hint cd-hint-warn nvk-canh-bao">
              <i className="fa-solid fa-circle-exclamation"></i> Trần điểm của
              module ({formatDiem(cauHinh.TranDiem, 1)}) khác điểm tối đa của
              tiêu chí trên phiếu KPI ({formatDiem(cauHinh.DiemToiDaTieuChi, 1)}
              ). Điểm chấm vào phiếu sẽ lệch với bảng tổng hợp - báo quản trị
              viên rà lại cấu hình.
            </div>
          )}

          <div className="cd-tabs nvk-tabs">
            <button
              className={`cd-tab${tab === TAB.NHIEM_VU ? " cd-tab-active" : ""}`}
              onClick={() => setTab(TAB.NHIEM_VU)}
            >
              <i className="fa-solid fa-clipboard-list"></i> Nhiệm vụ
            </button>
            <button
              className={`cd-tab${tab === TAB.PHAN_HOI ? " cd-tab-active" : ""}`}
              onClick={() => setTab(TAB.PHAN_HOI)}
            >
              <i className="fa-solid fa-comment-dots"></i> Phản hồi
              {soPhanHoiCho > 0 && (
                <span className="nvk-tab-dem">{soPhanHoiCho}</span>
              )}
            </button>
            <button
              className={`cd-tab${tab === TAB.TONG_HOP ? " cd-tab-active" : ""}`}
              onClick={() => setTab(TAB.TONG_HOP)}
            >
              <i className="fa-solid fa-table-list"></i> Tổng hợp &amp; chốt kỳ
            </button>
            <button
              className={`cd-tab${tab === TAB.LICH_SU ? " cd-tab-active" : ""}`}
              onClick={() => setTab(TAB.LICH_SU)}
            >
              <i className="fa-solid fa-clock-rotate-left"></i> Nhật ký
            </button>
          </div>

          {renderPanel()}
        </>
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

export default PhanCongNhiemVuKhoa;
