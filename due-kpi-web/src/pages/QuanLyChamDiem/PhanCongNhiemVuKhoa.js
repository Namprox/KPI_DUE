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
import {
  canKeKhaiNhiemVu,
  laKyDaChot,
  layCauHinh,
  layKy,
} from "../../utils/nhiemVuKhoaApi";

export default function PhanCongNhiemVuKhoa() {
  const toast = useRef(null);
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const [donViList, setDonViList] = useState([]);
  const [dangTaiDonVi, setDangTaiDonVi] = useState(true);
  const [khoaChon, setKhoaChon] = useState("");
  const [cauHinh, setCauHinh] = useState(null);
  const [ky, setKy] = useState(null);
  const [nhomKy, setNhomKy] = useState([]);
  const [tab, setTab] = useState("nhiem-vu");
  const [nhomLoc, setNhomLoc] = useState("");
  const [trangThai, setTrangThai] = useState("1");
  const [tuKhoa, setTuKhoa] = useState("");
  const [tuKhoaApDung, setTuKhoaApDung] = useState("");
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState("");
  const [revision, setRevision] = useState(0);
  const [yeuCauForm, setYeuCauForm] = useState(null);
  const request = useRef(0);
  const baoLoi = useCallback(
    (detail) =>
      toast.current?.show({
        severity: "error",
        summary: "Lỗi",
        detail,
        life: 5000,
      }),
    [],
  );
  const baoThanhCong = useCallback(
    (detail) =>
      toast.current?.show({
        severity: "success",
        summary: "Thành công",
        detail,
        life: 6000,
      }),
    [],
  );
  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungNvkPreview(baoLoi);
  useEffect(() => {
    let huy = false;
    apiFetch("donvi")
      .then(async (res) => {
        if (!res.ok) throw new Error("Không tải được danh sách đơn vị");
        const result = await res.json();
        if (!huy)
          setDonViList(result.Items || (Array.isArray(result) ? result : []));
      })
      .catch((error) => {
        if (!huy) baoLoi(error.message);
      })
      .finally(() => {
        if (!huy) setDangTaiDonVi(false);
      });
    return () => {
      huy = true;
    };
  }, [baoLoi]);
  // Phạm vi xem gồm các Khoa trong hồ sơ kiêm nhiệm. Quyền ghi do BE quyết định.
  const khoaList = useMemo(() => {
    const index = buildDonViIndex(donViList);
    const appointments = [...(user?.DonVi || [])].sort(
      (a, b) =>
        Number(["TK", "TKL"].includes(String(b.MaChucVu).toUpperCase())) -
        Number(["TK", "TKL"].includes(String(a.MaChucVu).toUpperCase())),
    );
    const ids = [...appointments.map((d) => d.IdDonVi), user?.IdDonVi];
    const map = new Map();
    ids.forEach((id) => {
      const k = resolveKhoaCuaNhanVien(id, index);
      if (laDonViKhoa(k)) map.set(String(k.IdDonVi), k);
    });
    return [...map.values()];
  }, [user, donViList]);
  const khoa =
    khoaList.find((k) => String(k.IdDonVi) === khoaChon) || khoaList[0];
  const idDonVi = khoa?.IdDonVi;
  useEffect(() => {
    const timer = setTimeout(() => setTuKhoaApDung(tuKhoa.trim()), 400);
    return () => clearTimeout(timer);
  }, [tuKhoa]);
  const taiTongQuan = useCallback(async () => {
    if (!selectedNam || !idDonVi) return;
    const seq = ++request.current;
    setDangTai(true);
    setLoi("");
    try {
      const [ch, kq] = await Promise.all([
        layCauHinh({ idDonVi, idNam: selectedNam }),
        layKy({ idNam: selectedNam, idDonVi }),
      ]);
      if (seq === request.current) {
        setCauHinh(ch);
        setKy(kq.ky);
        setNhomKy(kq.nhom);
        setRevision((v) => v + 1);
      }
    } catch (error) {
      if (seq === request.current) {
        setKy(null);
        setLoi(error.message);
      }
    } finally {
      if (seq === request.current) setDangTai(false);
    }
  }, [selectedNam, idDonVi]);
  useEffect(() => {
    setKy(null);
    setYeuCauForm(null);
    if (!dangTaiNam && !dangTaiDonVi) taiTongQuan();
    return () => {
      request.current += 1;
    };
  }, [dangTaiNam, dangTaiDonVi, taiTongQuan]);
  const chung = {
    idNam: selectedNam,
    idDonVi,
    ky,
    revision,
    onLamMoiKy: taiTongQuan,
    onError: baoLoi,
    onSuccess: baoThanhCong,
    onXemMinhChung: openPreview,
    onTaiMinhChung: downloadMinhChung,
  };
  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />
      <div className="page-header">
        <h2 className="nvk-title">Ghi nhận phục vụ cộng đồng</h2>
        <span className="breadcrumb">
          Chủ trì tự kê khai · Trưởng khoa duyệt từng nhiệm vụ
        </span>
      </div>
      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={setSelectedNam}
            options={namList.map((n) => ({
              value: n.IdNam,
              label: `Năm học ${n.IdNam}`,
            }))}
            disabled={dangTaiNam}
          />
        </div>
        {khoaList.length > 1 && (
          <div className="cd-field">
            <label className="cd-label">Khoa</label>
            <SearchSelect
              value={idDonVi}
              onChange={(v) => setKhoaChon(String(v))}
              options={khoaList.map((k) => ({
                value: k.IdDonVi,
                label: k.TenDonVi,
              }))}
            />
          </div>
        )}
        {tab === "nhiem-vu" && (
          <>
            <div className="cd-field">
              <label className="cd-label">Trạng thái</label>
              <SearchSelect
                ariaLabel="Trạng thái nhiệm vụ"
                value={trangThai}
                onChange={setTrangThai}
                options={[
                  { value: "1", label: "Chờ duyệt" },
                  { value: "2", label: "Đã duyệt" },
                  { value: "3", label: "Trả về" },
                  { value: "", label: "Tất cả" },
                ]}
              />
            </div>
            <div className="cd-field nvk-o-nhom">
              <label className="cd-label">Nhóm nhiệm vụ</label>
              <SearchSelect
                value={nhomLoc}
                onChange={setNhomLoc}
                options={[
                  { value: "", label: "Tất cả nhóm" },
                  ...nhomKy.map((n) => ({
                    value: n.IdNhomNv,
                    label: n.TenNhom,
                  })),
                ]}
                searchable
              />
            </div>
            <div className="cd-field nvk-o-tim">
              <label className="cd-label">Tìm nhiệm vụ</label>
              <input
                className="form-input"
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                placeholder="Tên hoặc mô tả nhiệm vụ..."
              />
            </div>
          </>
        )}
        <button
          className="btn-cancel"
          disabled={dangTai || !idDonVi}
          onClick={taiTongQuan}
        >
          Làm mới
        </button>
        {canKeKhaiNhiemVu(ky) && tab === "nhiem-vu" && (
          <button
            className="btn-add-new"
            disabled={dangTai}
            onClick={() => setYeuCauForm({ nonce: Date.now() })}
          >
            Kê khai nhiệm vụ
          </button>
        )}
      </div>
      {dangTaiDonVi || dangTaiNam || (!ky && dangTai) ? (
        <div className="cd-empty">Đang tải dữ liệu của Khoa...</div>
      ) : !idDonVi ? (
        <div className="cd-empty">Không xác định được Khoa của bạn.</div>
      ) : loi ? (
        <div className="cd-empty" role="alert">
          {loi}
        </div>
      ) : (
        ky && (
          <>
            <div className="nvk-ky-banner">
              <div>
                <div className="nvk-ky-don-vi">
                  {ky.TenDonVi || khoa.TenDonVi}
                </div>
                <div className="nvk-actions">
                  {[
                    ["1", "SoChoDuyet", "chờ duyệt"],
                    ["2", "SoDaDuyet", "đã duyệt"],
                    ["3", "SoTraVe", "trả về"],
                  ].map(([value, field, text]) => (
                    <button
                      key={value}
                      className={`cd-status-badge nvk-status-${value}`}
                      onClick={() => {
                        setTab("nhiem-vu");
                        setTrangThai(value);
                      }}
                    >
                      {ky[field] ?? "—"} {text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {laKyDaChot(ky) && (
              <p className="cd-hint cd-hint-warn">
                Kỳ đã chốt theo luồng cũ. Mở tab Tổng hợp để mở lại kỳ.
              </p>
            )}
            {cauHinh?.LechCauHinh && (
              <p className="cd-hint cd-hint-warn">
                Trần điểm module ({formatDiem(cauHinh.TranDiem, 1)}) khác điểm
                tối đa tiêu chí ({formatDiem(cauHinh.DiemToiDaTieuChi, 1)}). Báo
                quản trị viên rà lại cấu hình.
              </p>
            )}
            <div className="cd-tabs nvk-tabs">
              {[
                ["nhiem-vu", "Nhiệm vụ"],
                ["tong-hop", "Tổng hợp"],
                ["phan-hoi", "Lưu trữ phản hồi"],
                ["lich-su", "Nhật ký"],
              ].map(([value, text]) => (
                <button
                  key={value}
                  className={`cd-tab${tab === value ? " cd-tab-active" : ""}`}
                  onClick={() => setTab(value)}
                >
                  {text}
                </button>
              ))}
            </div>
            {tab === "nhiem-vu" && (
              <NvkPanelNhiemVu
                {...chung}
                nhomLoc={nhomLoc}
                tuKhoa={tuKhoaApDung}
                trangThai={trangThai}
                yeuCauForm={yeuCauForm}
                onYeuCauXong={() => setYeuCauForm(null)}
              />
            )}
            {tab === "tong-hop" && (
              <NvkPanelTongHop key={`${selectedNam}:${idDonVi}`} {...chung} />
            )}
            {tab === "phan-hoi" && (
              <NvkPanelPhanHoi key={`${selectedNam}:${idDonVi}`} {...chung} />
            )}
            {tab === "lich-su" && (
              <NvkPanelLichSu key={`${selectedNam}:${idDonVi}`} {...chung} />
            )}
          </>
        )
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
}
