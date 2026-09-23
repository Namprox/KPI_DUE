import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { confirmDialog } from "primereact/confirmdialog";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { ROLE, donViTheoVaiTro, normalizeRole } from "../../utils/roles";
import { fetchDonViList } from "../../utils/donViApi";
import TieuChiChamCard from "../../components/QuanLyChamDiem/TieuChiChamCard";
import TienDoCham from "../../components/QuanLyChamDiem/TienDoCham";
import TongDiemMeta from "../../components/QuanLyChamDiem/TongDiemMeta";
import {
  duyetPhieuQuy,
  downloadMinhChungQuy,
  fetchChiTietMauDanhGia,
  fetchPendingPhieuQuy,
  fetchPhieuQuy,
  khoangDiemVienChuc,
  lapTieuChiMauTheoId,
  traVePhieuQuy,
  trangThaiPhieuQuy,
} from "../../utils/phieuQuyApi";
import "../../css/DanhGia/PhieuQuy.css";
import "../../css/QuanLyChamDiem.css";

const formatDiem = (value) =>
  value == null || value === ""
    ? "—"
    : Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

const DuyetPhieuQuy = () => {
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const toastRef = useRef(null);
  const donViTheoQuyen = useMemo(
    () =>
      donViTheoVaiTro(
        [ROLE.TRUONG_PHONG, ROLE.TRUONG_KHOA, ROLE.TRUONG_KHOA_LON],
        user,
      ),
    [user],
  );
  const [adminDonViList, setAdminDonViList] = useState([]);
  const donViList = donViTheoQuyen.length > 0 ? donViTheoQuyen : adminDonViList;
  const [idDonVi, setIdDonVi] = useState("");
  const [quy, setQuy] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tieuChiMau, setTieuChiMau] = useState({});
  const [scores, setScores] = useState({});
  const [nhanXet, setNhanXet] = useState("");
  const [lyDo, setLyDo] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (donViTheoQuyen.length === 0 && normalizeRole(user) === ROLE.ADMIN) {
      fetchDonViList().then(setAdminDonViList);
    }
  }, [donViTheoQuyen, user]);

  useEffect(() => {
    if (!idDonVi && donViList.length > 0) setIdDonVi(String(donViList[0].IdDonVi));
  }, [donViList, idDonVi]);

  const toast = useCallback((detail, severity = "info") => {
    toastRef.current?.show({ severity, summary: severity === "error" ? "Không thể thực hiện" : "Thông báo", detail, life: 5000 });
  }, []);

  const loadList = useCallback(async () => {
    if (!selectedNam || (!idDonVi && donViList.length > 0)) return;
    setLoading(true);
    try {
      const result = await fetchPendingPhieuQuy({
        idNam: selectedNam,
        idDonVi: idDonVi || undefined,
        quy: quy || undefined,
        page: 1,
        pageSize: 100,
      });
      setItems(result.items);
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [selectedNam, idDonVi, quy, donViList.length, toast]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const open = async (item) => {
    setLoading(true);
    try {
      const detail = await fetchPhieuQuy(item.IdPhieu);
      setSelected(detail);
      try {
        const mau = await fetchChiTietMauDanhGia(detail.IdMau);
        setTieuChiMau(lapTieuChiMauTheoId(mau));
      } catch (mauError) {
        setTieuChiMau({});
        console.error("Lỗi khi tải chi tiết mẫu phiếu quý:", mauError);
      }
      setScores({});
      setNhanXet("");
      setLyDo("");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (selected?.IdPhieu) {
      try {
        setSelected(await fetchPhieuQuy(selected.IdPhieu));
      } catch (error) {
        toast(error.message, "error");
      }
    }
    await loadList();
  };

  const approve = (quick = false) => {
    const manual = (selected?.ChiTiet || []).filter(
      (row) => Number(row.LoaiNguonDiem) === 1,
    );
    const payloadScores = quick
      ? []
      : manual
          .filter((row) => scores[row.IdChiTiet] !== undefined)
          .map((row) => ({
            IdChiTiet: row.IdChiTiet,
            Diem:
              scores[row.IdChiTiet]?.Diem === "" ||
              scores[row.IdChiTiet]?.Diem == null
                ? null
                : Number(scores[row.IdChiTiet].Diem),
            NhanXet: scores[row.IdChiTiet]?.NhanXet || null,
          }));

    const invalid = payloadScores.find((entry) => {
      if (entry.Diem == null) return false;
      const row = manual.find((x) => x.IdChiTiet === entry.IdChiTiet);
      const { san, tran } = khoangDiemVienChuc(row.DiemToiDa);
      return !Number.isFinite(entry.Diem) || entry.Diem < san || entry.Diem > tran;
    });
    if (invalid) {
      toast("Có điểm Trưởng đơn vị chấm ngoài khoảng cho phép", "error");
      return;
    }

    confirmDialog({
      header: quick ? "Duyệt nhanh phiếu quý" : "Duyệt và chốt điểm quý",
      message: quick
        ? "Giữ nguyên toàn bộ điểm nhân viên tự chấm và chốt phiếu? Thao tác này không thể hoàn tác."
        : "Chốt điểm quý với các điều chỉnh đang nhập? Thao tác này không thể hoàn tác.",
      icon: "pi pi-lock",
      acceptLabel: "Duyệt và chốt",
      rejectLabel: "Hủy",
      accept: async () => {
        setBusy(true);
        try {
          const result = await duyetPhieuQuy(selected.IdPhieu, {
            NhanXet: nhanXet || null,
            Diem: payloadScores,
            RowVersion: selected.RowVersion,
          });
          toast(
            `Đã chốt quý: cơ bản ${formatDiem(result.TongDiemCoBan)}, vượt trội ${formatDiem(result.TongDiemVuotTroi)}, tích lũy ${formatDiem(result.TongDiemTichLuy)}`,
            "success",
          );
          setSelected(null);
          await loadList();
        } catch (error) {
          toast(error.message, "error");
          if (["CONCURRENCY_CONFLICT", "INVALID_STATE"].includes(error.errorCode)) await refresh();
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const returnSheet = async () => {
    if (!lyDo.trim()) {
      toast("Phải nhập lý do trả phiếu", "warn");
      return;
    }
    setBusy(true);
    try {
      await traVePhieuQuy(selected.IdPhieu, {
        LyDo: lyDo.trim(),
        RowVersion: selected.RowVersion,
      });
      toast("Đã trả phiếu về cho nhân viên", "success");
      setSelected(null);
      await loadList();
    } catch (error) {
      toast(error.message, "error");
      if (["CONCURRENCY_CONFLICT", "INVALID_STATE"].includes(error.errorCode)) await refresh();
    } finally {
      setBusy(false);
    }
  };

  const reviewRows = (selected?.ChiTiet || []).map((row) => ({
    ...row,
    MoTa: tieuChiMau[row.IdTieuChi]?.MoTa ?? row.MoTa ?? null,
  }));
  const manualRows = reviewRows.filter(
    (row) => Number(row.LoaiNguonDiem) === 1,
  );
  const reviewedCount = manualRows.filter(
    (row) => scores[row.IdChiTiet] !== undefined,
  ).length;
  const reviewTotals = reviewRows.reduce(
    (total, row) => {
      const override = scores[row.IdChiTiet]?.Diem;
      const value =
        Number(row.LoaiNguonDiem) === 2
          ? row.DiemTuDong ?? row.DiemChinhThuc
          : override === "" || override == null
            ? row.DiemTuDanhGia
            : override;
      const key = Number(row.LoaiNhom) === 2 ? "vuotTroi" : "coBan";
      total[key] += Number(value) || 0;
      total.tichLuy += Number(value) || 0;
      return total;
    },
    { coBan: 0, vuotTroi: 0, tichLuy: 0, soDongChuaChot: 0 },
  );

  return (
    <div className="page-container pq-page">
      <Toast ref={toastRef} position="top-right" />
      <header className="pq-header">
        <div><h2>DUYỆT KPI VIÊN CHỨC THEO QUÝ</h2><p>Hàng đợi tại đúng đơn vị bạn phụ trách</p></div>
        <div className="pq-filters">
          <label>Năm<select value={selectedNam} disabled={dangTaiNam} onChange={(e) => setSelectedNam(e.target.value)}>{namList.map((n) => <option key={n.IdNam} value={n.IdNam}>{n.IdNam}</option>)}</select></label>
          {donViList.length > 0 && <label>Đơn vị<select value={idDonVi} onChange={(e) => setIdDonVi(e.target.value)}>{donViList.map((d) => <option key={d.IdDonVi} value={d.IdDonVi}>{d.TenDonVi || d.MaDonVi}</option>)}</select></label>}
          <label>Quý<select value={quy} onChange={(e) => setQuy(e.target.value)}><option value="">Tất cả</option>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>Quý {q}</option>)}</select></label>
        </div>
      </header>

      {selected ? (
        <>
          <div className="pq-toolbar">
            <div><button type="button" className="cd-link-btn" onClick={() => setSelected(null)}><i className="fa-solid fa-arrow-left"></i> Hồ sơ chờ duyệt</button></div>
            <div><button type="button" className="btn-cancel" disabled={busy} onClick={() => approve(true)}>Duyệt nhanh</button><button type="button" className="btn-submit" disabled={busy} onClick={() => approve(false)}>Duyệt & chốt điểm</button></div>
          </div>
          <div className="cd-phieu-header">
            <div className="cd-phieu-top">
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a" }}>
                  {selected.HoTen || selected.TenNhanVien}
                </div>
                <div style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
                  {selected.MaNhanVien && <span className="code-pill" style={{ marginRight: "8px" }}>{selected.MaNhanVien}</span>}
                  {selected.TenDonVi || "-"} · Quý {selected.Quy} · Năm {selected.IdNam}
                </div>
              </div>
              <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
                <span className="pq-status pq-status-2">{trangThaiPhieuQuy(selected)}</span>
                <TienDoCham
                  xong={reviewedCount}
                  tong={manualRows.length}
                  nhan="Điểm đã điều chỉnh"
                  ghiChu="Dòng để trống sẽ giữ nguyên điểm viên chức tự chấm"
                />
              </div>
            </div>
            <div className="cd-meta-grid">
              <TongDiemMeta phieu={{}} tamTinh={reviewTotals} />
              <div><div className="cd-meta-label">Quý đánh giá</div><div className="cd-meta-value">Quý {selected.Quy}</div></div>
              <div><div className="cd-meta-label">Lần đánh giá</div><div className="cd-meta-value">{selected.LanDanhGia || 1}</div></div>
            </div>
          </div>
          <div>
            {reviewRows.map((row, index) => {
              const auto = Number(row.LoaiNguonDiem) === 2;
              const range = khoangDiemVienChuc(row.DiemToiDa);
              const override = scores[row.IdChiTiet] || {};
              return (
                <TieuChiChamCard
                  key={row.IdChiTiet}
                  chiTiet={{
                    ...row,
                    // Phiếu quý không có nghiệp vụ nhiệm vụ cộng đồng; truyền
                    // mảng rỗng để card dùng chung không gọi nhầm API giảng viên.
                    NhiemVuCongDong: row.NhiemVuCongDong || [],
                  }}
                  stt={index + 1}
                  moTa={row.MoTa}
                  nhanChuPhieu="Viên chức"
                  choPhepNhap={!auto}
                  dangLuu={busy}
                  onXemMinhChung={(mc) => downloadMinhChungQuy(mc.IdMinhChung, mc.TenHienThi || mc.TenFileGoc || "minh-chung").catch((error) => toast(error.message, "error"))}
                  onTaiMinhChung={(mc) => downloadMinhChungQuy(mc.IdMinhChung, mc.TenHienThi || mc.TenFileGoc || "minh-chung").catch((error) => toast(error.message, "error"))}
                  noiDungBen={
                    auto ? null : (
                      <>
                        <div className="cdm-ben-tieu-de">Trưởng đơn vị chấm</div>
                        <div className="cdm-ben-diem">
                          <span className="cdm-ben-diem-nhan">Viên chức tự chấm</span>
                          <span className="cdm-ben-diem-gt"><b className="cdm-ben-diem-so">{formatDiem(row.DiemTuDanhGia)}</b></span>
                        </div>
                        <label className="pq-review-card-field">
                          Điểm duyệt
                          <input type="number" step="any" min={range.san} max={range.tran} value={override.Diem ?? ""} placeholder="Để trống = giữ nguyên" onChange={(e) => setScores((old) => ({ ...old, [row.IdChiTiet]: { ...override, Diem: e.target.value } }))} />
                          <small>Khoảng hợp lệ: {range.san} đến {range.tran}</small>
                        </label>
                        <label className="pq-review-card-field">
                          Nhận xét
                          <textarea rows="3" placeholder="Nhận xét cho tiêu chí" value={override.NhanXet || ""} onChange={(e) => setScores((old) => ({ ...old, [row.IdChiTiet]: { ...override, NhanXet: e.target.value } }))} />
                        </label>
                      </>
                    )
                  }
                />
              );
            })}
          </div>
          <div className="pq-review-footer">
            <label>Nhận xét chung<textarea rows="3" value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} /></label>
            <label>Trả về để bổ sung<textarea rows="3" value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Lý do bắt buộc" /></label>
            <button type="button" className="pq-btn pq-btn-danger" disabled={busy || !lyDo.trim()} onClick={returnSheet}><i className="fa-solid fa-rotate-left"></i> Trả phiếu</button>
          </div>
        </>
      ) : (
        <section className="pq-section">
          <div className="pq-section-title"><i className="fa-solid fa-inbox"></i><h3>Phiếu chờ duyệt ({items.length})</h3></div>
          {loading ? <div className="pq-loading"><i className="fa-solid fa-spinner fa-spin"></i> Đang tải hàng đợi...</div> : items.length === 0 ? <div className="pq-empty"><i className="fa-solid fa-check"></i><h3>Không có phiếu đang chờ</h3></div> : <div className="pq-table-wrap"><table className="pq-table"><thead><tr><th>Nhân viên</th><th>Đơn vị</th><th>Quý</th><th>Trạng thái</th><th></th></tr></thead><tbody>{items.map((item) => <tr key={item.IdPhieu}><td><strong>{item.HoTen || item.TenNhanVien}</strong></td><td>{item.TenDonVi}</td><td>Quý {item.Quy}</td><td>{item.TrangThaiText || trangThaiPhieuQuy(item)}</td><td><button type="button" className="pq-btn pq-btn-primary" onClick={() => open(item)}>Mở phiếu</button></td></tr>)}</tbody></table></div>}
        </section>
      )}
    </div>
  );
};

export default DuyetPhieuQuy;
