import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { confirmDialog } from "primereact/confirmdialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  createPhieuNam,
  createPhieuQuy,
  deleteMinhChungQuy,
  downloadMinhChungQuy,
  fetchChiTietMauDanhGia,
  fetchDiemTuDongMau,
  fetchPhieuNamCuaToi,
  fetchPhieuQuy,
  fetchPhieuQuyCuaToi,
  fetchTongHopPhieuQuy,
  huyNopPhieuQuy,
  khoangDiemVienChuc,
  lapTieuChiMauTheoId,
  nopPhieuQuy,
  saveTuDanhGiaQuy,
  submitPhieuNam,
  tongHopPhieuNamTuQuy,
  taoTieuChiHienThiQuy,
  trangThaiPhieuQuy,
  uploadMinhChungQuy,
} from "../../utils/phieuQuyApi";
import DanhGiaPhuLuc2Form from "../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";
import "../../css/DanhGia/DanhGiaPhuLuc2.css";
import "../../css/DanhGia/PhieuQuy.css";

const so = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatDiem = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
};

const layDiemDong = (dong) =>
  dong?.DiemTuDong ?? dong?.DiemTuDanhGia ?? dong?.DiemChinhThuc ?? null;

const CanhBaoLoi = ({ error }) =>
  error ? (
    <div className="pq-alert pq-alert-error">
      <i className="fa-solid fa-circle-exclamation"></i>
      <span>{error.message || "Không tải được dữ liệu"}</span>
    </div>
  ) : null;

const TrangThaiQuy = ({ phieu }) => (
  <span className={`pq-status pq-status-${phieu?.TrangThai || 0}`}>
    {trangThaiPhieuQuy(phieu)}
  </span>
);

const TongHopNam = ({ idNam, idDonVi, idNhanVien, idMau, toast }) => {
  const [data, setData] = useState(null);
  const [phieuNam, setPhieuNam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [rollupWarning, setRollupWarning] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [tongHopResult, phieuNamResult] = await Promise.allSettled([
      fetchTongHopPhieuQuy({ idNam, idNhanVien, idDonVi }),
      fetchPhieuNamCuaToi({ idNam, idDonVi }),
    ]);
    if (tongHopResult.status === "fulfilled") setData(tongHopResult.value);
    else setError(tongHopResult.reason);
    setPhieuNam(phieuNamResult.status === "fulfilled" ? phieuNamResult.value : null);
    setLoading(false);
  }, [idNam, idNhanVien, idDonVi]);

  useEffect(() => {
    load();
  }, [load]);

  const ensureAnnual = async () => {
    if (phieuNam) return phieuNam;
    const created = await createPhieuNam({
      IdNam: Number(idNam),
      IdNhanVien: Number(idNhanVien),
      IdMau: Number(idMau),
      IdDonVi: idDonVi || null,
    });
    setPhieuNam(created);
    return created;
  };

  const rollup = async () => {
    setBusy(true);
    try {
      const annual = await ensureAnnual();
      const result = await tongHopPhieuNamTuQuy(annual.IdPhieu, annual.RowVersion);
      if (result.CanhBao) {
        toast(`Chỉ tổng hợp từ ${result.SoQuyDaChot} quý (${result.DanhSachQuyDaChot || "chưa có"})`, "warn");
      } else {
        toast("Đã tổng hợp điểm năm từ các quý", "success");
      }
      if (result.CanhBaoTieuChiTuDong) {
        const message = `${result.SoTieuChiTuDongBoSot} tiêu chí chấm tự động đang đóng góp 0 điểm`;
        setRollupWarning(message);
        toast(message, "error", 8000);
      } else {
        setRollupWarning(null);
      }
      await load();
    } catch (e) {
      toast(e.message, "error");
      if (["CONCURRENCY_CONFLICT", "INVALID_STATE"].includes(e.errorCode)) await load();
    } finally {
      setBusy(false);
    }
  };

  const submitAnnual = async () => {
    if (!phieuNam) return;
    setBusy(true);
    try {
      await submitPhieuNam(phieuNam.IdPhieu, phieuNam.RowVersion);
      toast("Đã nộp phiếu năm để Trưởng đơn vị chốt hồ sơ", "success");
      await load();
    } catch (e) {
      toast(e.message, "error");
      if (["CONCURRENCY_CONFLICT", "INVALID_STATE"].includes(e.errorCode)) await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="pq-loading"><i className="fa-solid fa-spinner fa-spin"></i> Đang tổng hợp dữ liệu...</div>;
  if (error) return <CanhBaoLoi error={error} />;
  const quy = data?.Quy || [];
  const vuotTroi = data?.VuotTroiTheoTieuChi || [];
  const biCatNhom =
    data?.TranNhomVuotTroi != null &&
    so(data?.TongVuotTroiTruocTranNhom) > so(data?.DiemVuotTroiTongQuy);

  return (
    <div className="pq-summary">
      <div className="pq-quarter-cards">
        {quy.map((q) => (
          <div key={q.Quy} className={`pq-quarter-card ${q.DaChot ? "done" : ""}`}>
            <strong>Quý {q.Quy}</strong>
            <span>{q.TrangThaiText || "Chưa tạo phiếu"}</span>
            <b>{q.DaChot ? `${formatDiem(q.TongDiemTichLuy)} điểm` : "—"}</b>
          </div>
        ))}
      </div>
      <div className="pq-metrics">
        <div><span>Điểm cơ bản bình quân</span><strong>{formatDiem(data?.DiemCoBanTbQuy)}</strong><small>Trung bình từ {data?.SoQuyDaChot || 0} quý ({data?.DanhSachQuyDaChot || "chưa có"})</small></div>
        <div><span>Vi phạm viên chức cả năm</span><strong>{formatDiem(data?.DiemVpvcNam)}</strong><small>3 tiêu chí VPVC trên phiếu năm</small></div>
        <div><span>Điểm vượt trội cộng dồn</span><strong>{formatDiem(data?.DiemVuotTroiTongQuy)}</strong><small>{data?.TranNhomVuotTroi == null ? "Không áp dụng trần nhóm" : `Trần nhóm ${formatDiem(data.TranNhomVuotTroi)}`}</small></div>
        <div className="primary"><span>Điểm tích lũy dự kiến</span><strong>{formatDiem(data?.DiemTichLuyDuKien)}</strong><small>Chỉ là số xem trước</small></div>
      </div>
      {vuotTroi.length > 0 && (
        <section className="pq-section">
          <div className="pq-section-title"><i className="fa-solid fa-chart-column"></i><h3>Giải trình điểm vượt trội sau kẹp trần</h3></div>
          <div className="pq-table-wrap">
            <table className="pq-table pq-summary-table">
              <thead><tr><th>Tiêu chí</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>Tổng quý</th><th>Điểm sau kẹp</th></tr></thead>
              <tbody>
                {vuotTroi.map((row) => (
                  <tr key={row.IdTieuChi} className={row.BiKep ? "pq-clamped" : ""}>
                    <td><strong>{row.TenTieuChi || `#${row.IdTieuChi}`}</strong><small>{row.SoQuyCoDong} quý có dòng · tối đa {formatDiem(row.DiemToiDa)}</small></td>
                    {[1, 2, 3, 4].map((q) => <td key={q}>{formatDiem(row[`DiemQuy${q}`])}</td>)}
                    <td>{formatDiem(row.TongCacQuy)}</td>
                    <td><strong>{formatDiem(row.DiemSauKep)}</strong>{row.BiKep && <i className="fa-solid fa-triangle-exclamation" title="Điểm đã bị kẹp theo trần tiêu chí"></i>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {biCatNhom && (
        <div className="pq-alert pq-alert-warn">
          <i className="fa-solid fa-triangle-exclamation"></i>
          Tổng vượt trội {formatDiem(data.TongVuotTroiTruocTranNhom)} đã bị cắt về trần nhóm {formatDiem(data.TranNhomVuotTroi)}.
        </div>
      )}
      <section className="pq-annual-card">
        <div>
          <h3>Phiếu năm và chốt điểm</h3>
          <p>Phiếu năm chỉ giữ ba tiêu chí VPVC chấm tự động. Tổng hợp quý trước khi Trưởng đơn vị chốt hồ sơ.</p>
        </div>
        <div className="pq-annual-actions">
          <button type="button" className="pq-btn pq-btn-primary" disabled={busy || Number(data?.SoQuyDaChot) === 0} onClick={rollup}>
            <i className="fa-solid fa-arrows-rotate"></i> Tổng hợp từ quý
          </button>
          {phieuNam && Number(phieuNam.TrangThai) === 1 && (
            <button type="button" className="pq-btn pq-btn-secondary" disabled={busy} onClick={submitAnnual}>
              <i className="fa-solid fa-paper-plane"></i> Nộp phiếu năm
            </button>
          )}
        </div>
        {Number(data?.SoQuyDaChot) === 0 && <div className="pq-muted">Chưa có quý nào chốt điểm; chưa thể tổng hợp hoặc xếp loại năm.</div>}
        {rollupWarning && (
          <div className="pq-alert pq-alert-error pq-annual-warning">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <strong>{rollupWarning}</strong>
          </div>
        )}
        {phieuNam && (
          <div className="pq-annual-lines">
            {(phieuNam.ChiTiet || []).map((row) => (
              <div key={row.IdChiTiet}>
                <span>{row.TenTieuChi || `Tiêu chí #${row.IdTieuChi}`}</span>
                <b>{formatDiem(layDiemDong(row))} điểm</b>
                <em>Hệ thống chấm</em>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const PhieuQuyCuaToi = ({ namList, selectedYear, onYearChange, template }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toastRef = useRef(null);
  const [tab, setTab] = useState(() => {
    const q = Number(new URLSearchParams(window.location.search).get("quy"));
    return q >= 1 && q <= 4 ? q : Math.min(Math.floor(new Date().getMonth() / 3) + 1, 4);
  });
  const donViList = useMemo(() => {
    return Array.isArray(user?.DonVi)
      ? user.DonVi.filter((donVi) => donVi?.LoaiDoiTuong === 2)
      : [];
  }, [user]);
  const [idDonVi, setIdDonVi] = useState(() => donViList.find((x) => x.LaChinh)?.IdDonVi || donViList[0]?.IdDonVi || "");
  const [phieu, setPhieu] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [diemTuDong, setDiemTuDong] = useState({});
  const [tieuChiMau, setTieuChiMau] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const toast = useCallback((detail, severity = "info", life = 4500) => {
    toastRef.current?.show({ severity, summary: severity === "error" ? "Không thể thực hiện" : "Thông báo", detail, life });
  }, []);

  const activeDonVi = donViList.find((d) => Number(d.IdDonVi) === Number(idDonVi));
  const queryDonVi = idDonVi || undefined;

  useEffect(() => {
    const selectedExists = donViList.some(
      (donVi) => Number(donVi.IdDonVi) === Number(idDonVi),
    );
    if (!selectedExists) {
      setIdDonVi(donViList.find((donVi) => donVi.LaChinh)?.IdDonVi || donViList[0]?.IdDonVi || "");
    }
  }, [donViList, idDonVi]);

  const load = useCallback(async () => {
    if (tab === 5) return;
    setLoading(true);
    setError(null);
    try {
      const item = await fetchPhieuQuyCuaToi({ idNam: selectedYear, quy: tab, idDonVi: queryDonVi });
      setPhieu(item);
      const next = {};
      const diemDuPhong = {};
      (item?.ChiTiet || []).forEach((row) => {
        next[row.IdChiTiet] = { Diem: row.DiemTuDanhGia ?? "", NhanXet: row.NhanXetTuDanhGia || row.NhanXet || "" };
        if (Number(row.LoaiNguonDiem) === 2 && row.IdTieuChi != null) {
          diemDuPhong[row.IdTieuChi] = row;
        }
      });
      setDrafts(next);
      setDiemTuDong(diemDuPhong);

      if (item) {
        const idMau = item.IdMau || template?.IdMau;
        const [diemResult, mauResult] = await Promise.allSettled([
          fetchDiemTuDongMau({
            idMau: item.IdMau || template?.IdMau,
            idNhanVien: item.IdNhanVien || user?.IdNhanVien,
            quy: tab,
          }),
          fetchChiTietMauDanhGia(idMau),
        ]);

        if (diemResult.status === "fulfilled") {
          const nextDiemTuDong = { ...diemDuPhong };
          diemResult.value.forEach((score) => {
            if (score.IdTieuChi == null) return;
            nextDiemTuDong[score.IdTieuChi] = {
              ...nextDiemTuDong[score.IdTieuChi],
              ...score,
            };
          });
          setDiemTuDong(nextDiemTuDong);
        } else {
          // Preview là dữ liệu bổ sung; phiếu và điểm đã chốt trong ChiTiet vẫn
          // phải hiển thị được khi endpoint điểm tự động tạm thời lỗi.
          console.error("Lỗi khi tải điểm tự động phiếu quý:", diemResult.reason);
        }

        if (mauResult.status === "fulfilled") {
          setTieuChiMau(lapTieuChiMauTheoId(mauResult.value));
        } else {
          setTieuChiMau({});
          // MoTa chỉ là metadata trình bày; không để lỗi chi tiết mẫu làm hỏng
          // việc kê khai trên phiếu quý đã có sẵn.
          console.error("Lỗi khi tải chi tiết mẫu phiếu quý:", mauResult.reason);
        }
      }
    } catch (e) {
      if (e.status === 404 || e.responseStatus === 404 || e.errorCode === "NOT_FOUND") {
        setPhieu(null);
        setDiemTuDong({});
        setTieuChiMau({});
      }
      else setError(e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, tab, queryDonVi, template?.IdMau, user?.IdNhanVien]);

  useEffect(() => {
    load();
  }, [load]);

  const changeTab = (value) => {
    setTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("year", selectedYear);
    if (value <= 4) params.set("quy", value);
    else params.delete("quy");
    navigate(`/danh-gia-kpi-nhan-vien?${params}`, { replace: true });
  };

  const create = async () => {
    setBusy(true);
    try {
      const item = await createPhieuQuy({ IdNam: Number(selectedYear), IdNhanVien: Number(user.IdNhanVien), Quy: Number(tab), IdMau: Number(template.IdMau), IdDonVi: queryDonVi || null });
      setPhieu(item);
      toast(`Đã tạo phiếu quý ${tab}`, "success");
      await load();
    } catch (e) {
      toast(e.message, "error");
      if (e.errorCode === "PHIEU_QUY_DA_TON_TAI") await load();
    } finally {
      setBusy(false);
    }
  };

  const saveAll = async () => {
    const manual = (phieu?.ChiTiet || []).filter(
      (row) => Number(row.LoaiNguonDiem) === 1,
    );
    const invalid = manual.find((row) => {
      const raw = drafts[row.IdChiTiet]?.Diem;
      if (raw === "" || raw == null) return false;
      const value = Number(raw);
      const range = khoangDiemVienChuc(row.DiemToiDa);
      return !Number.isFinite(value) || value < range.san || value > range.tran;
    });
    if (invalid) {
      const range = khoangDiemVienChuc(invalid.DiemToiDa);
      toast(`Điểm phải nằm trong khoảng ${range.san} đến ${range.tran}`, "error");
      return false;
    }
    setBusy(true);
    try {
      await Promise.all(
        manual.map((row) => {
          const draft = drafts[row.IdChiTiet] || {};
          return saveTuDanhGiaQuy(row.IdChiTiet, {
            Diem: draft.Diem === "" || draft.Diem == null ? null : Number(draft.Diem),
            NhanXet: draft.NhanXet || null,
            IdThangDiemChon: null,
          });
        }),
      );
      toast("Đã lưu bản nháp", "success");
      await load();
      return true;
    } catch (e) {
      toast(e.message, "error");
      if (["CONCURRENCY_CONFLICT", "INVALID_STATE"].includes(e.errorCode)) await load();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const uploadEvidence = async (idTieuChi, files) => {
    const row = (phieu?.ChiTiet || []).find(
      (item) => Number(item.IdTieuChi) === Number(idTieuChi),
    );
    if (!row) return;
    setBusy(true);
    try {
      for (const file of files || []) {
        await uploadMinhChungQuy(row.IdChiTiet, file);
      }
      toast("Đã tải minh chứng", "success");
      await load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const removeEvidence = async (idTieuChi, index) => {
    const row = (phieu?.ChiTiet || []).find(
      (item) => Number(item.IdTieuChi) === Number(idTieuChi),
    );
    const mc = row?.MinhChung?.[index];
    if (!mc?.IdMinhChung) return;
    setBusy(true);
    try {
      await deleteMinhChungQuy(mc.IdMinhChung);
      toast("Đã xóa minh chứng", "success");
      await load();
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    const manual = (phieu.ChiTiet || []).filter((r) => Number(r.LoaiNguonDiem) === 1);
    const missing = manual.filter((r) => drafts[r.IdChiTiet]?.Diem === "" || drafts[r.IdChiTiet]?.Diem == null).length;
    const missingEvidence = manual.filter(
      (r) => r.BatBuocMinhChung && (r.MinhChung || []).length === 0,
    ).length;
    if (missingEvidence > 0) {
      toast(
        `Còn ${missingEvidence} dòng thiếu minh chứng bắt buộc. Hãy bổ sung trước khi nộp.`,
        "warn",
      );
      return;
    }
    confirmDialog({
      header: `Nộp phiếu quý ${tab}`,
      message:
        missing > 0
          ? `Còn ${missing} dòng chưa chấm; khi nộp các dòng này sẽ được tính 0 điểm. Bạn vẫn muốn nộp?`
          : "Sau khi nộp, phiếu sẽ chuyển tới Trưởng đơn vị duyệt. Bạn chắc chắn muốn tiếp tục?",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Nộp phiếu",
      rejectLabel: "Kiểm tra lại",
      accept: async () => {
        setBusy(true);
        try {
          await Promise.all(manual.map((row) => saveTuDanhGiaQuy(row.IdChiTiet, { Diem: drafts[row.IdChiTiet]?.Diem === "" ? null : Number(drafts[row.IdChiTiet]?.Diem), NhanXet: drafts[row.IdChiTiet]?.NhanXet || null, IdThangDiemChon: null })));
          const fresh = await fetchPhieuQuy(phieu.IdPhieu);
          await nopPhieuQuy(phieu.IdPhieu, { NhanXet: null, RowVersion: fresh.RowVersion });
          toast("Đã nộp phiếu quý", "success");
          await load();
        } catch (e) {
          toast(e.message, "error");
          if (["CONCURRENCY_CONFLICT", "INVALID_STATE"].includes(e.errorCode)) await load();
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const recall = () => {
    const lyDo = window.prompt("Nhập lý do hủy nộp phiếu:");
    if (!lyDo?.trim()) return;
    setBusy(true);
    huyNopPhieuQuy(phieu.IdPhieu, { LyDo: lyDo.trim(), RowVersion: phieu.RowVersion })
      .then(() => { toast("Đã đưa phiếu về trạng thái nháp", "success"); return load(); })
      .catch(async (e) => { toast(e.message, e.errorCode === "DA_CHAM" ? "warn" : "error"); if (["CONCURRENCY_CONFLICT", "INVALID_STATE"].includes(e.errorCode)) await load(); })
      .finally(() => setBusy(false));
  };

  const rows = phieu?.ChiTiet || [];
  const criteriaList = rows.map((row) => {
    const mau = tieuChiMau[row.IdTieuChi] || {};
    return taoTieuChiHienThiQuy({
      ...mau,
      ...row,
      MoTa: mau.MoTa ?? row.MoTa ?? null,
      LoaiThangDiem: mau.LoaiThangDiem ?? row.LoaiThangDiem,
      CacThangDiem:
        mau.ThangDiem ||
        mau.CacThangDiem ||
        row.CacThangDiem ||
        row.ThangDiem ||
        [],
    });
  });
  const formData = {};
  rows.forEach((row) => {
    if (Number(row.LoaiNguonDiem) === 2) return;
    const draft = drafts[row.IdChiTiet] || {};
    formData[row.IdTieuChi] = {
      IdTieuChi: row.IdTieuChi,
      DiemTuDanhGia: draft.Diem ?? row.DiemTuDanhGia ?? "",
      MoTaHoanThanh: draft.NhanXet ?? row.NhanXetTuDanhGia ?? "",
      DanhSachFile: (row.MinhChung || []).map((mc) => ({
        idMinhChung: mc.IdMinhChung,
        fileName: mc.DuongDan,
        originalName: mc.TenHienThi || mc.TenFileGoc || mc.DuongDan,
        fileType: mc.LoaiFile,
        fileSizeKB: mc.KichThuocKb || 0,
      })),
    };
  });
  const tongDiem = rows.reduce((sum, row) => {
    const value =
      Number(row.LoaiNguonDiem) === 2
        ? diemTuDong[row.IdTieuChi]?.DiemTuDong ??
          row.DiemTuDong ??
          row.DiemChinhThuc
        : drafts[row.IdChiTiet]?.Diem ?? row.DiemTuDanhGia;
    return sum + (Number(value) || 0);
  }, 0);

  return (
    <div className="page-container pq-page">
      <Toast ref={toastRef} position="top-right" />
      <header className="pq-header">
        <div><h2>ĐÁNH GIÁ KPI VIÊN CHỨC THEO QUÝ</h2><p>{user?.HoTen || "Người dùng"}{activeDonVi ? ` · ${activeDonVi.TenDonVi || activeDonVi.MaDonVi}` : ""}</p></div>
        <div className="pq-filters">
          <label>Năm<select value={selectedYear} onChange={(e) => onYearChange(Number(e.target.value))}>{namList.map((n) => <option key={n.IdNam} value={n.IdNam}>{n.IdNam}</option>)}</select></label>
          {donViList.length > 1 && <label>Đơn vị<select value={idDonVi} onChange={(e) => setIdDonVi(e.target.value)}>{donViList.map((d) => <option key={d.IdDonVi} value={d.IdDonVi}>{d.TenDonVi || d.MaDonVi}</option>)}</select></label>}
        </div>
      </header>
      <nav className="pq-tabs" aria-label="Phiếu quý và tổng hợp năm">
        {[1, 2, 3, 4].map((q) => <button type="button" key={q} className={tab === q ? "active" : ""} onClick={() => changeTab(q)}>Quý {q}</button>)}
        <button type="button" className={tab === 5 ? "active" : ""} onClick={() => changeTab(5)}>Tổng hợp năm</button>
      </nav>
      {tab === 5 ? (
        <TongHopNam idNam={selectedYear} idDonVi={queryDonVi} idNhanVien={user.IdNhanVien} idMau={template.IdMau} toast={toast} />
      ) : loading ? (
        <div className="pq-loading"><i className="fa-solid fa-spinner fa-spin"></i> Đang tải phiếu quý {tab}...</div>
      ) : error ? <CanhBaoLoi error={error} /> : !phieu ? (
        <div className="pq-empty"><i className="fa-regular fa-file-lines"></i><h3>Chưa có phiếu quý {tab}</h3><p>Tạo phiếu từ mẫu KPI viên chức của năm {selectedYear}.</p><button type="button" className="pq-btn pq-btn-primary" disabled={busy} onClick={create}>Tạo phiếu quý {tab}</button></div>
      ) : (
        <>
          <div className="pq-toolbar"><div><TrangThaiQuy phieu={phieu} /><span className="pq-total">Phiếu quý {tab}</span></div></div>
          {phieu.LyDoTraVe && <div className="pq-alert pq-alert-warn"><i className="fa-solid fa-rotate-left"></i><span><b>Phiếu được trả về:</b> {phieu.LyDoTraVe}</span></div>}
          <DanhGiaPhuLuc2Form
            criteriaList={criteriaList}
            formData={formData}
            autoScores={diemTuDong}
            tongDiemCoBan={tongDiem}
            loaiDoiTuong={2}
            laDongMoNhap={(tc) => {
              const row = rows.find((item) => Number(item.IdTieuChi) === Number(tc.IdTieuChi));
              return Number(phieu.TrangThai) === 1 && Number(row?.TrangThaiDong ?? 1) === 1 && Number(row?.LoaiNguonDiem) === 1;
            }}
            thongTinDong={(tc) => rows.find((item) => Number(item.IdTieuChi) === Number(tc.IdTieuChi)) || null}
            hanhDong={
              Number(phieu.TrangThai) === 1 ? (
                <>
                  <button type="button" className="btn-luu-nhap" disabled={busy} onClick={saveAll}>
                    <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
                  </button>
                  <button type="button" className="btn-nop-phieu" disabled={busy} onClick={submit}>
                    <i className="fa-solid fa-paper-plane"></i> Nộp phiếu
                  </button>
                </>
              ) : Number(phieu.TrangThai) === 2 ? (
                <button type="button" className="btn-thu-hoi" disabled={busy} onClick={recall}>
                  <i className="fa-solid fa-rotate-left"></i> Hủy nộp để chỉnh sửa
                </button>
              ) : null
            }
            onScoreChange={(idTieuChi, _idThangDiem, value) => {
              const row = rows.find((item) => Number(item.IdTieuChi) === Number(idTieuChi));
              if (!row) return;
              setDrafts((old) => ({
                ...old,
                [row.IdChiTiet]: { ...old[row.IdChiTiet], Diem: value },
              }));
            }}
            onTextChange={(idTieuChi, value) => {
              const row = rows.find((item) => Number(item.IdTieuChi) === Number(idTieuChi));
              if (!row) return;
              setDrafts((old) => ({
                ...old,
                [row.IdChiTiet]: { ...old[row.IdChiTiet], NhanXet: value },
              }));
            }}
            onFileChange={uploadEvidence}
            onRemoveFile={removeEvidence}
            onXemMinhChung={(mc) =>
              downloadMinhChungQuy(
                mc.IdMinhChung,
                mc.TenHienThi || mc.TenFileGoc || "minh-chung",
              ).catch((e) => toast(e.message, "error"))
            }
          />
          {rows.length === 0 && <div className="pq-empty"><h3>Phiếu chưa có tiêu chí</h3><p>Vui lòng kiểm tra cấu hình mẫu đánh giá.</p></div>}
        </>
      )}
    </div>
  );
};

export default PhieuQuyCuaToi;
