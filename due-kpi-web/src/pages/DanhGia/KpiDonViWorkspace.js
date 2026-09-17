import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { fetchDonViList } from "../../utils/donViApi";
import { fetchPhieuDonViList, TRANG_THAI_DV_META } from "../../utils/phieuDonViApi";
import { cauHinhKpiDonVi, donViKpiCuaToi, timHoacTaoPhieu } from "../../utils/kpiDonViWorkspace";
import useKpiDonViFilters from "../../hooks/useKpiDonViFilters";
import SearchSelect from "../../components/Common/SearchSelect";
import BangLichSuKpiDonVi from "../../components/DanhGia/BangLichSuKpiDonVi";
import ChiTietPhieuDonVi from "./ChiTietPhieuDonVi";
import ChiTietPhieuPhong from "./ChiTietPhieuPhong";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/DanhGia/LichSuKpiDonVi.css";

const PAGE_SIZE = 20;

export default function KpiDonViWorkspace({ loai = "khoa", lichSu = false }) {
  const { user } = useAuth();
  const config = cauHinhKpiDonVi(loai);
  const { namList, selectedNam, dangTaiNam } = useNamDanhGia();
  const [params, setParams] = useKpiDonViFilters();
  const [danhMuc, setDanhMuc] = useState([]);
  const [taiDonVi, setTaiDonVi] = useState(true);
  const [retry, setRetry] = useState(0);
  const [ketQua, setKetQua] = useState({ key: "", rows: [], phieu: null, loi: "" });
  const [dangTai, setDangTai] = useState(false);
  const editorRef = useRef(null);
  const [choChuyen, setChoChuyen] = useState(null);
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    let con = true;
    setTaiDonVi(true);
    fetchDonViList(true).then((list) => {
      if (con) { setDanhMuc(list); setTaiDonVi(false); }
    });
    return () => { con = false; };
  }, [retry]);

  const donViList = useMemo(() => donViKpiCuaToi(user, danhMuc, loai), [user, danhMuc, loai]);
  const dvParam = params.get("idDonVi");
  const idDonVi = dvParam !== null ? dvParam : donViList.length === 1 ? String(donViList[0].IdDonVi) : "";
  const donVi = donViList.find((d) => String(d.IdDonVi) === idDonVi);
  const idNam = lichSu ? params.get("idNam") ?? selectedNam : params.get("idNam") || selectedNam;
  const trangThai = params.get("trangThai") || "";
  const sortBy = params.get("sortBy") === "ngay_gui" ? "ngay_gui" : "ngay_tao";
  const trangThaiChon = trangThai.split(",").filter(Boolean);
  const requestedPage = Number(params.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const hopLe = !!donVi && (lichSu ? !idNam || namList.some((n) => String(n.IdNam) === idNam) : namList.some((n) => String(n.IdNam) === idNam));
  const key = `${loai}:${lichSu}:${user?.IdNhanVien}:${idDonVi}:${idNam}:${trangThai}:${sortBy}:${page}:${retry}`;

  useEffect(() => {
    if (dangTaiNam || taiDonVi || !hopLe) return;
    let con = true;
    setDangTai(true);
    const request = lichSu
      ? fetchPhieuDonViList({ idNam: idNam || undefined, idDonVi, trangThai: trangThai || undefined, page, pageSize: PAGE_SIZE, sortBy }).then((rows) => ({ rows, phieu: null }))
      : timHoacTaoPhieu({ user, loai, idNam, idDonVi, conHieuLuc: () => con }).then((phieu) => ({ rows: [], phieu }));
    request.then((data) => {
      if (con) setKetQua({ key, ...data, loi: "" });
    }).catch((e) => {
      if (con) setKetQua({ key, rows: [], phieu: null, loi: e.message || "Không tải được phiếu." });
    }).finally(() => { if (con) setDangTai(false); });
    return () => { con = false; };
  }, [dangTaiNam, taiDonVi, hopLe, key, lichSu, idNam, idDonVi, trangThai, sortBy, page, user, loai]);

  const doiLoc = (field, value) => {
    const next = new URLSearchParams(params);
    // Giữ cả mặc định trong trạng thái điều hướng.
    next.set("idNam", idNam);
    next.set("idDonVi", idDonVi);
    next.set(field, String(value ?? ""));
    if (field !== "page") next.set("page", "1");
    if (editorRef.current?.busy) return;
    if (editorRef.current?.dirty) setChoChuyen(next);
    else setParams(next);
  };
  const luuVaChuyen = async () => {
    setDangLuu(true);
    try {
      if (await editorRef.current?.save()) { setParams(choChuyen); setChoChuyen(null); }
    } finally { setDangLuu(false); }
  };
  const ready = ketQua.key === key;
  const loading = dangTaiNam || taiDonVi || (hopLe && (dangTai || !ready));
  const filters = { idNam, idDonVi, trangThai, page: String(page), sortBy };
  const Detail = loai === "phong" ? ChiTietPhieuPhong : ChiTietPhieuDonVi;

  return <div className={`page-container${lichSu ? " kpi-dv-history" : ""}`}>
    <div className="page-header">
      <h2>{lichSu ? "Lịch sử đánh giá" : "Đánh giá"} KPI {config.ten}</h2>
      {lichSu ? <span className="breadcrumb">
        {donVi?.TenDonVi || user?.HoTen || config.ten} - toàn bộ phiếu KPI qua các năm
      </span> : <Link className="cd-link-btn" to={config.lichSu} state={{ kpiFilters: { idNam, idDonVi } }}>
        Lịch sử đánh giá
      </Link>}
    </div>
    <div className="cd-toolbar">
      <div className="cd-field"><label className="cd-label">Năm đánh giá</label>
        <SearchSelect value={idNam} disabled={dangTaiNam || dangLuu} onChange={(v) => doiLoc("idNam", v)}
          options={[...(lichSu ? [{ value: "", label: "Tất cả các năm" }] : []), ...namList.map((n) => ({ value: String(n.IdNam), label: `Năm học ${n.IdNam}` }))]} />
      </div>
      {(!lichSu || donViList.length > 1) && <div className="cd-field"><label className="cd-label">Đơn vị</label>
        {donViList.length === 1 && donVi ? <strong>{donVi.TenDonVi || donVi.MaDonVi}</strong> :
          <SearchSelect value={idDonVi} disabled={taiDonVi || dangLuu} placeholder="Chọn đơn vị" onChange={(v) => doiLoc("idDonVi", v)}
            options={donViList.map((d) => ({ value: String(d.IdDonVi), label: d.TenDonVi || d.MaDonVi }))} />}
      </div>}
      {lichSu && <>
        <div className="cd-field"><label className="cd-label">Sắp xếp</label>
          <SearchSelect value={sortBy} onChange={(v) => doiLoc("sortBy", v)} options={[
            { value: "ngay_tao", label: "Ngày tạo" }, { value: "ngay_gui", label: "Ngày gửi" },
          ]} />
        </div>
        <button className="btn-cancel" onClick={() => setRetry((n) => n + 1)} disabled={loading}>
          <i className={`fa-solid fa-rotate${loading ? " fa-spin" : ""}`}></i> Làm mới
        </button>
      </>}
    </div>
    {lichSu && <div className="kpi-dv-history-status">
      <span>Trạng thái:</span>
      <button className="cd-status-badge" aria-pressed={!trangThaiChon.length}
        style={{ background: !trangThaiChon.length ? "#1d4ed8" : "#fff", color: !trangThaiChon.length ? "#fff" : "#475569", borderColor: !trangThaiChon.length ? "#1d4ed8" : "#e2e8f0" }}
        onClick={() => doiLoc("trangThai", "")}>Tất cả</button>
      {Object.entries(TRANG_THAI_DV_META).map(([value, meta]) => {
        const chon = trangThaiChon.includes(value);
        return <button key={value} className="cd-status-badge" aria-pressed={chon}
          style={{ background: chon ? meta.bg : "#fff", color: chon ? meta.color : "#94a3b8", borderColor: chon ? meta.border : "#e2e8f0" }}
          onClick={() => doiLoc("trangThai", (chon ? trangThaiChon.filter((v) => v !== value) : [...trangThaiChon, value]).join(","))}>
          <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
        </button>;
      })}
    </div>}
    {loading ? <div className="cd-empty">Đang tải phiếu KPI...</div> : !hopLe ?
      <div className="cd-empty">{!namList.length ? "Chưa có năm đánh giá." : !donViList.length ? "Không có đơn vị phù hợp với chức vụ của bạn hoặc chưa tải được danh mục đơn vị." : "Vui lòng chọn năm và đơn vị hợp lệ."}
        <button className="btn-cancel" onClick={() => setRetry((n) => n + 1)}>Tải lại</button>
      </div> : ready && ketQua.loi ? <div className="cd-empty" role="alert">{ketQua.loi}
        <button className="btn-cancel" onClick={() => setRetry((n) => n + 1)}>Thử lại</button>
      </div> : lichSu ? <BangLichSuKpiDonVi
        rows={ketQua.rows} donVi={donVi} config={config} filters={filters} page={page}
        onPageChange={(value) => doiLoc("page", value)}
      /> : ketQua.phieu ? <Detail key={ketQua.phieu.IdPhieuDv} idPhieu={ketQua.phieu.IdPhieuDv} editorRef={editorRef} embedded /> :
        <div className="cd-empty">Chưa có phiếu cho năm này. Vui lòng chờ thư ký lập phiếu.</div>}
    {choChuyen && <div className="modal-overlay"><div className="modal-box" role="dialog" aria-modal="true" aria-label="Thay đổi chưa lưu">
      <div className="modal-header"><h3>Thay đổi chưa lưu</h3></div>
      <div className="modal-body">Lưu thay đổi trước khi chuyển năm hoặc đơn vị?</div>
      <div className="modal-footer">
        <button className="btn-cancel" disabled={dangLuu} onClick={() => setChoChuyen(null)}>Ở lại</button>
        <button className="btn-cancel" disabled={dangLuu} onClick={() => { setParams(choChuyen); setChoChuyen(null); }}>Bỏ thay đổi</button>
        <button className="btn-submit" disabled={dangLuu} onClick={luuVaChuyen}>{dangLuu ? "Đang lưu..." : "Lưu và chuyển"}</button>
      </div>
    </div></div>}
  </div>;
}
