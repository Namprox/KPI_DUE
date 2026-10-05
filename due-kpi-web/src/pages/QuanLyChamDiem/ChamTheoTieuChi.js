import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import SearchSelect from "../../components/Common/SearchSelect";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import SuaDiemModal from "../../components/QuanLyChamDiem/SuaDiemModal";
import TienDoCham from "../../components/QuanLyChamDiem/TienDoCham";
import { MinhChungRow } from "../../components/QuanLyChamDiem/TieuChiChamCard";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useMinhChungPhieuPreview } from "../../hooks/useMinhChungPhieuPreview";
import { chuCaiDau } from "../../hooks/useNhanVienIndex";
import {
  duyetThamDinh, duyetThamDinhHangLoat, fetchCaNhanThamDinhTieuChi,
  fetchMinhChung, fetchThamDinhTieuChi, fetchThangDiemTieuChi,
  formatDiem, formatNgay, putDiemKhoa, traVeThamDinh,
} from "../../utils/phieuApi";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/QuanLyChamDiem/ChamTheoTieuChi.css";

const PAGE_SIZE = 500;
const GOI_Y_LOI = {
  CONCURRENCY_CONFLICT: "Tải lại danh sách và xem lại dòng này trước khi chấm.",
  INVALID_STATE_DONG: "Dòng đã đổi trạng thái. Vui lòng tải lại danh sách.",
  INVALID_STATE: "Phiếu đã đổi trạng thái. Vui lòng tải lại danh sách.",
  FORBIDDEN_DON_VI: "Phân công đã thay đổi. Vui lòng tải lại danh sách.",
  FORBIDDEN: "Vui lòng tải lại danh sách để kiểm tra phạm vi được chấm.",
  AUTO_SCORED: "Tiêu chí chấm tự động. Vui lòng tải lại danh sách.",
  NOT_FOUND: "Dòng hoặc phiếu không còn. Vui lòng tải lại danh sách.",
  SQL_ERROR: "Có thể thử lại; báo quản trị nếu lỗi lặp lại.",
};
const diemCanLuuY = (r) => r.DiemTuDanhGia == null || Number(r.DiemTuDanhGia) === 0;
const thieuMinhChung = (r) => r.BatBuocMinhChung === true && Number(r.SoMinhChung ?? 0) === 0;
const canTaiLai = (loi) => Boolean(loi && loi.ErrorCode !== "SQL_ERROR");
const khopTimKiem = (q, fields) => !q || fields.some((f) => String(f ?? "").toLocaleLowerCase("vi").includes(q));

const MinhChungModal = ({ dong, onDong, onXem, onTai }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lanTai, setLanTai] = useState(0);
  useEffect(() => {
    let huy = false;
    setLoading(true);
    setError("");
    fetchMinhChung(dong.IdChiTiet).then((data) => {
      if (!huy) setItems(data);
    }).catch((e) => {
      if (!huy) setError(e.message);
    }).finally(() => {
      if (!huy) setLoading(false);
    });
    return () => { huy = true; };
  }, [dong.IdChiTiet, lanTai]);
  return (
    <div className="modal-overlay" onClick={onDong}>
      <div className="modal-box cd-modal-cham" role="dialog" aria-modal="true" aria-label="Minh chứng tiêu chí" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Minh chứng tiêu chí</h3>
          <button className="close-btn" aria-label="Đóng minh chứng" onClick={onDong}>&times;</button>
        </div>
        <div className="modal-body cd-sd-form">
          <b>{dong.HoTen}</b>
          <div>{dong.TenTieuChi}</div>
          {dong.NhanXetTuDanhGia && <p className="ctc-noi-dung">{dong.NhanXetTuDanhGia}</p>}
          {loading ? <div className="cd-empty">Đang tải minh chứng...</div> : error ? (
            <div role="alert" className="cd-hint cd-hint-error">
              {error} <button className="cd-link-btn" onClick={() => setLanTai((v) => v + 1)}>Thử lại</button>
            </div>
          ) : items.length === 0 ? <div className="cd-hint">Chưa có minh chứng.</div> : items.map((mc) => (
            <MinhChungRow key={mc.IdMinhChung} mc={mc} onXem={onXem} onTai={onTai} />
          ))}
        </div>
        <div className="modal-footer"><button className="btn-cancel" onClick={onDong}>Đóng</button></div>
      </div>
    </div>
  );
};

const ChamTheoTieuChi = () => {
  const toast = useRef(null);
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const [tieuChiList, setTieuChiList] = useState([]);
  const [tieuChi, setTieuChi] = useState(null);
  const [loadingTieuChi, setLoadingTieuChi] = useState(false);
  const [loiTieuChi, setLoiTieuChi] = useState("");
  const [phamVi, setPhamVi] = useState("phan_cong");
  const [timKiem, setTimKiem] = useState("");
  const [sortBy, setSortBy] = useState("cu_nhat");
  const [rows, setRows] = useState([]);
  const [tongSoDong, setTongSoDong] = useState(null);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loiDanhSach, setLoiDanhSach] = useState("");
  const [lanTai, setLanTai] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loiDong, setLoiDong] = useState({});
  const [ketQuaLo, setKetQuaLo] = useState(null);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [xacNhan, setXacNhan] = useState(null);
  const [dongTraVe, setDongTraVe] = useState(null);
  const [suaDiem, setSuaDiem] = useState(null);
  const [dongMinhChung, setDongMinhChung] = useState(null);
  const khoaGhi = useRef(false);
  const tieuChiRequest = useRef(0);
  const idTieuChi = tieuChi?.IdTieuChi;
  const showToast = useCallback((severity, detail) => {
    toast.current?.show({ severity, summary: severity === "success" ? "Thành công" : "Thông báo", detail, life: 6000 });
  }, []);
  const { preview, openPreview, closePreview, downloadMinhChung } = useMinhChungPhieuPreview((m) => showToast("error", m));

  const taiTieuChi = useCallback(async () => {
    if (!selectedNam) return;
    const request = ++tieuChiRequest.current;
    setLoadingTieuChi(true);
    setLoiTieuChi("");
    try {
      const items = await fetchThamDinhTieuChi(selectedNam);
      if (request === tieuChiRequest.current) setTieuChiList(items);
    } catch (error) {
      if (request === tieuChiRequest.current) setLoiTieuChi(error.message);
    } finally {
      if (request === tieuChiRequest.current) setLoadingTieuChi(false);
    }
  }, [selectedNam]);

  useEffect(() => {
    setTieuChiList([]);
    if (!dangTaiNam) taiTieuChi();
    return () => { tieuChiRequest.current += 1; };
  }, [dangTaiNam, taiTieuChi]);

  useEffect(() => {
    let huy = false;
    setRows([]);
    setTongSoDong(null);
    setSelectedIds(new Set());
    setLoiDong({});
    setKetQuaLo(null);
    setLoiDanhSach("");
    if (!selectedNam || !idTieuChi) return undefined;
    setLoadingRows(true);
    fetchCaNhanThamDinhTieuChi(idTieuChi, { idNam: selectedNam, page: 1, pageSize: PAGE_SIZE, sortBy })
      .then(({ items, tongSoDong: tong }) => {
        if (!huy) { setRows(items); setTongSoDong(tong); }
      }).catch((error) => {
        if (!huy) setLoiDanhSach(error.message);
      }).finally(() => {
        if (!huy) setLoadingRows(false);
      });
    return () => { huy = true; };
  }, [selectedNam, idTieuChi, sortBy, lanTai]);

  const q = timKiem.trim().toLocaleLowerCase("vi");
  const tieuChiHienThi = tieuChiList.filter((tc) =>
    (phamVi !== "phan_cong" || tc.CoPhanQuyen === true) && khopTimKiem(q, [tc.TenTieuChi, tc.TenNhom]));
  // Giữ thứ tự ưu tiên từ BE; lọc tìm kiếm chỉ trong tối đa 500 dòng đã tải.
  const rowsHienThi = rows.filter((r) => khopTimKiem(q, [r.HoTen, r.MaNhanVien, r.TenDonVi]));
  const dongDuocChon = rowsHienThi.filter((r) => selectedIds.has(r.IdChiTiet));
  const thongTinTieuChi = tieuChiList.find((tc) => tc.IdTieuChi === idTieuChi) || tieuChi;
  const moModal = Boolean(xacNhan || dongTraVe || suaDiem || dongMinhChung);
  const khoa = dangXuLy || loadingRows || moModal;
  const coTheCham = (r) => Boolean(r.RowVersion) && !canTaiLai(loiDong[r.IdChiTiet]);
  const dongChonDuoc = rowsHienThi.filter(coTheCham);
  const chonHet = dongChonDuoc.length > 0 && dongChonDuoc.every((r) => selectedIds.has(r.IdChiTiet));
  const coTheDuyetLo = (ds) => ds.length > 0 && ds.length <= PAGE_SIZE && ds.every(coTheCham);
  const canhBaoLo = useMemo(() => {
    const ds = xacNhan?.rows || [];
    return {
      diem: ds.filter(diemCanLuuY).length,
      minhChung: ds.filter(thieuMinhChung).length,
    };
  }, [xacNhan]);

  const taiLaiRows = () => { setRows([]); setLanTai((v) => v + 1); };
  const doiTimKiem = (value) => { setTimKiem(value); setSelectedIds(new Set()); };
  const chonTieuChi = (tc) => { setTieuChi(tc); setTimKiem(""); setRows([]); };
  const ghiNhanLoi = (r, error) => {
    setLoiDong((prev) => ({ ...prev, [r.IdChiTiet]: { Message: error.message, ErrorCode: error.errorCode } }));
  };
  const boDongThanhCong = (ids, ketQua = []) => {
    const daXong = new Set(ids);
    const rowVersions = new Map(ketQua.filter((k) => k.Success === true && k.NewRowVersion && k.IdPhieu)
      .map((k) => [k.IdPhieu, k.NewRowVersion]));
    setRows((prev) => prev.filter((r) => !daXong.has(r.IdChiTiet)).map((r) =>
      rowVersions.has(r.IdPhieu) ? { ...r, RowVersion: rowVersions.get(r.IdPhieu) } : r));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !daXong.has(id))));
    setTongSoDong((prev) => prev == null ? null : Math.max(0, prev - ids.length));
  };

  const chayThaoTac = async (dong, thucHien, thongBao) => {
    if (khoaGhi.current || !coTheCham(dong)) return;
    khoaGhi.current = true;
    setDangXuLy(true);
    try {
      const result = await thucHien(dong.RowVersion);
      boDongThanhCong([dong.IdChiTiet], [{ Success: true, IdPhieu: dong.IdPhieu, NewRowVersion: result.newRowVersion }]);
      setSuaDiem(null);
      setDongTraVe(null);
      showToast("success", thongBao);
      if (result.trangThaiPhieu === 3) showToast("info", `Hồ sơ của ${dong.HoTen} đã chuyển sang chờ Trưởng khoa duyệt.`);
      await taiTieuChi();
    } catch (error) {
      ghiNhanLoi(dong, error);
      setSuaDiem(null);
      setDongTraVe(null);
      showToast("error", error.message);
    } finally {
      khoaGhi.current = false;
      setDangXuLy(false);
    }
  };

  const duyetLo = async ({ lyDo }) => {
    if (khoaGhi.current || !xacNhan || !coTheDuyetLo(xacNhan.rows)) return;
    const ds = xacNhan.rows;
    khoaGhi.current = true;
    setDangXuLy(true);
    try {
      const result = await duyetThamDinhHangLoat({ items: ds, nhanXet: lyDo });
      const ketQua = result.KetQua || [];
      const theoId = new Map(ketQua.map((k) => [k.IdChiTiet, k]));
      const thanhCong = ds.filter((r) => theoId.get(r.IdChiTiet)?.Success === true);
      const thatBai = ds.filter((r) => theoId.get(r.IdChiTiet)?.Success !== true);
      boDongThanhCong(thanhCong.map((r) => r.IdChiTiet), ketQua);
      setLoiDong((prev) => {
        const next = { ...prev };
        ds.forEach((r) => { delete next[r.IdChiTiet]; });
        thatBai.forEach((r) => {
          next[r.IdChiTiet] = theoId.get(r.IdChiTiet) || { Message: "Chưa nhận được kết quả dòng này. Vui lòng tải lại danh sách." };
        });
        return next;
      });
      setSelectedIds(new Set());
      setKetQuaLo({ message: result.Message, thanhCong: thanhCong.length, thatBai: thatBai.length });
      const soChuyen = ketQua.filter((k) => k.Success === true && k.TrangThaiPhieu === 3).length;
      if (soChuyen > 0) showToast("info", `${soChuyen} hồ sơ đã chuyển sang chờ Trưởng khoa duyệt.`);
      await taiTieuChi();
    } catch (error) {
      // Mất kết nối có thể xảy ra sau khi BE đã ghi: yêu cầu tải lại trước khi thử tiếp.
      ds.forEach((r) => ghiNhanLoi(r, error));
      showToast("error", error.message);
    } finally {
      setXacNhan(null);
      khoaGhi.current = false;
      setDangXuLy(false);
    }
  };

  const moSuaDiem = async (r) => {
    if (khoaGhi.current) return;
    khoaGhi.current = true;
    setDangXuLy(true);
    try {
      const mucDiem = Number(r.LoaiThangDiem) === 1 ? await fetchThangDiemTieuChi(r.IdTieuChi) : [];
      setSuaDiem({ dong: r, thangDiem: { loaiThangDiem: Number(r.LoaiThangDiem), diemToiDa: r.DiemToiDa, mucDiem } });
    } catch (error) {
      showToast("error", error.message);
    } finally {
      khoaGhi.current = false;
      setDangXuLy(false);
    }
  };

  return (
    <div className="page-container ctc-page">
      <Toast ref={toast} position="top-right" />
      <div className="page-header">
        <h2>Chấm theo tiêu chí</h2>
        <span className="breadcrumb">Chọn tiêu chí để thẩm định cá nhân, xem minh chứng và duyệt giữ nguyên điểm tự đánh giá.</span>
      </div>
      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect ariaLabel="Năm đánh giá" value={selectedNam} options={namList.map((n) => ({ value: n.IdNam, label: `Năm ${n.IdNam}` }))}
            disabled={dangTaiNam || khoa} onChange={(v) => { setTieuChi(null); setTimKiem(""); setSelectedNam(v); }} />
        </div>
        {!tieuChi ? <div className="cd-field">
          <label className="cd-label">Phạm vi tiêu chí</label>
          <SearchSelect ariaLabel="Phạm vi tiêu chí" value={phamVi} onChange={setPhamVi} disabled={khoa} options={[
            { value: "phan_cong", label: "Được phân công" },
            { value: "tat_ca", label: "Tất cả trong phạm vi thẩm định" },
          ]} />
        </div> : <div className="cd-field">
          <label className="cd-label">Sắp xếp theo</label>
          <SearchSelect ariaLabel="Sắp xếp theo" value={sortBy} disabled={khoa} onChange={(v) => { setRows([]); setSortBy(v); }} options={[
            { value: "cu_nhat", label: "Nộp trước lên trước" }, { value: "moi_nhat", label: "Nộp sau lên trước" },
          ]} />
        </div>}
        <div className="cd-field ctc-search">
          <label className="cd-label" htmlFor="ctc-search">Tìm nhanh</label>
          <input id="ctc-search" className="form-input" value={timKiem} disabled={khoa} onChange={(e) => doiTimKiem(e.target.value)}
            placeholder={tieuChi ? "Họ tên, mã nhân viên, đơn vị trong danh sách đã tải..." : "Tên tiêu chí, nhóm tiêu chí..."} />
        </div>
        <button className="btn-cancel" disabled={khoa || loadingTieuChi || !selectedNam} onClick={() => { taiTieuChi(); if (tieuChi) taiLaiRows(); }}>
          <i className="fa-solid fa-rotate" /> Tải lại danh sách
        </button>
      </div>
      {!dangTaiNam && !selectedNam && <div className="cd-canh-bao" role="alert">Chưa tải được năm đánh giá. Vui lòng tải lại trang.</div>}
      {loiTieuChi && <div className="cd-canh-bao" role="alert">{loiTieuChi}</div>}

      {!tieuChi ? <div className="modern-table-card">
        {loadingTieuChi || dangTaiNam ? <div className="cd-empty">Đang tải tiêu chí...</div> : tieuChiHienThi.length === 0 ? (
          <div className="cd-empty">{loiTieuChi ? "Không tải được danh sách tiêu chí." : "Không có tiêu chí phù hợp trong năm và phạm vi đã chọn."}</div>
        ) : <div className="table-scroll"><table className="custom-table ctc-criteria-table">
          <thead><tr><th>Tiêu chí</th><th>Đối tượng</th><th>Chờ thẩm định</th><th>Đang bổ sung</th><th>Tiến độ</th><th>Thao tác</th></tr></thead>
          <tbody>{tieuChiHienThi.map((tc) => <tr key={tc.IdTieuChi}>
            <td><b>{tc.TenTieuChi}</b><div className="ctc-meta">{tc.TenNhom} · Tối đa {formatDiem(tc.DiemToiDa)} điểm</div>
              <span className="tag-badge">{tc.CoPhanQuyen === true ? "Được phân công" : "Đơn vị chủ quản"}</span></td>
            <td>{Number(tc.LoaiDoiTuong) === 1 ? "Giảng viên" : Number(tc.LoaiDoiTuong) === 2 ? "Viên chức / NLĐ" : "-"}</td>
            <td><b>{tc.SoChoThamDinh ?? "-"}</b>{tc.SoBiTraLaiThamDinh > 0 && <div className="ctc-warning">{tc.SoBiTraLaiThamDinh} dòng cần thẩm định lại</div>}</td>
            <td>{tc.SoDangBoSung ?? "-"}</td>
            <td><TienDoCham xong={tc.SoDaChot ?? 0} tong={(tc.SoChoThamDinh ?? 0) + (tc.SoDangBoSung ?? 0) + (tc.SoDaChot ?? 0)} nhan="Đã chốt" /></td>
            <td><button className="btn-submit" onClick={() => chonTieuChi(tc)}>Xem cá nhân</button></td>
          </tr>)}</tbody>
        </table></div>}
      </div> : <>
        <div className="cd-phieu-header">
          <button className="cd-link-btn" disabled={khoa} onClick={() => { setTieuChi(null); setTimKiem(""); }}><i className="fa-solid fa-arrow-left" /> Danh sách tiêu chí</button>
          <h3 className="ctc-ten-tieu-chi">{thongTinTieuChi.TenTieuChi}</h3>
          <div className="ctc-meta">{thongTinTieuChi.TenNhom} · Tối đa {formatDiem(thongTinTieuChi.DiemToiDa)} điểm</div>
          <div className="ctc-summary"><span>Chờ thẩm định: <b>{thongTinTieuChi.SoChoThamDinh ?? "-"}</b></span><span>Đang bổ sung: <b>{thongTinTieuChi.SoDangBoSung ?? "-"}</b></span><span>Đã chốt: <b>{thongTinTieuChi.SoDaChot ?? "-"}</b></span></div>
        </div>
        {tongSoDong > PAGE_SIZE && <div className="cd-canh-bao"><i className="fa-solid fa-circle-info" /><span>Có {tongSoDong} dòng chờ. Mỗi lần tải tối đa 500 dòng; “Duyệt toàn bộ” chỉ áp dụng cho {rowsHienThi.length} dòng đang hiển thị. Duyệt xong, tải lại để lấy phần còn lại.</span></div>}
        {rowsHienThi.some((r) => !r.RowVersion) && <div className="cd-canh-bao" role="alert">Có dòng thiếu RowVersion. Vui lòng tải lại danh sách trước khi duyệt.</div>}
        {ketQuaLo && <div className={`ctc-result${ketQuaLo.thatBai ? " ctc-result-warning" : ""}`} role="status">
          <b>Đã duyệt {ketQuaLo.thanhCong} dòng; {ketQuaLo.thatBai} dòng chưa duyệt.</b>
          {ketQuaLo.message && <div>{ketQuaLo.message}</div>}
          <div>{ketQuaLo.thatBai ? "Các dòng lỗi được giữ bên dưới. Xem thông báo từng dòng và tải lại khi được yêu cầu." : "Tải lại danh sách để kiểm tra các cá nhân còn chờ."}</div>
        </div>}
        <div className="modern-table-card">
          <div className="ctc-bulk-toolbar">
            <span>Hiển thị <b>{rowsHienThi.length}</b> / {rows.length} dòng đã tải{tongSoDong != null && ` · ${tongSoDong} dòng còn chờ`}</span>
            <div className="ctc-bulk-actions">
              <button className="btn-cancel" disabled={khoa || !coTheDuyetLo(dongDuocChon)} onClick={() => setXacNhan({ rows: [...dongDuocChon] })}>Duyệt đã chọn ({dongDuocChon.length})</button>
              <button className="btn-submit" disabled={khoa || !coTheDuyetLo(rowsHienThi)} onClick={() => setXacNhan({ rows: [...rowsHienThi] })}>Duyệt toàn bộ ({rowsHienThi.length})</button>
            </div>
          </div>
          {loadingRows ? <div className="cd-empty">Đang tải cá nhân chờ thẩm định...</div> : loiDanhSach ? <div className="cd-empty" role="alert">{loiDanhSach}</div> : rowsHienThi.length === 0 ? (
            <div className="cd-empty">{q ? "Không có cá nhân khớp tìm kiếm trong danh sách đã tải." : "Không còn cá nhân chờ thẩm định trong danh sách đã tải."}</div>
          ) : <div className="table-scroll"><table className="custom-table ctc-person-table">
            <thead><tr><th><input type="checkbox" aria-label="Chọn tất cả dòng có thể duyệt đang hiển thị" checked={chonHet} disabled={khoa || !dongChonDuoc.length}
              onChange={(e) => setSelectedIds(e.target.checked ? new Set(dongChonDuoc.map((r) => r.IdChiTiet)) : new Set())} /></th>
              <th>Cá nhân</th><th>Điểm tự đánh giá</th><th>Minh chứng</th><th>Ngày nộp</th><th>Thao tác</th></tr></thead>
            <tbody>{rowsHienThi.map((r) => <tr key={r.IdChiTiet} className={Number(r.NguonTraVe) === 3 ? "cd-row-uu-tien" : undefined}>
              <td><input type="checkbox" aria-label={`Chọn ${r.HoTen}`} checked={selectedIds.has(r.IdChiTiet)} disabled={khoa || !coTheCham(r)} onChange={(e) => {
                const checked = e.target.checked;
                setSelectedIds((prev) => { const next = new Set(prev); if (checked) next.add(r.IdChiTiet); else next.delete(r.IdChiTiet); return next; });
              }} /></td>
              <td><div className="teacher-avatar-wrapper"><div className="teacher-avatar">{chuCaiDau(r.HoTen)}</div><div><b>{r.HoTen}</b>
                {r.MaNhanVien && <div><span className="code-pill">{r.MaNhanVien}</span></div>}<div className="ctc-meta">{r.TenDonVi || "-"}</div></div></div>
                {Number(r.NguonTraVe) === 3 && <div className="ctc-warning"><b>Trưởng khoa yêu cầu thẩm định lại</b>{r.LyDoTraVe && <div className="ctc-noi-dung">{r.LyDoTraVe}</div>}</div>}
                {r.NhanXetTuDanhGia && <div className="ctc-meta ctc-noi-dung">{r.NhanXetTuDanhGia}</div>}
                {loiDong[r.IdChiTiet] && <div className="ctc-row-error" role="alert"><b>{loiDong[r.IdChiTiet].Message}</b><div>{GOI_Y_LOI[loiDong[r.IdChiTiet].ErrorCode] || "Vui lòng tải lại danh sách trước khi thao tác tiếp."}</div></div>}
                {!r.RowVersion && <div className="ctc-row-error">Thiếu RowVersion; cần tải lại.</div>}</td>
              <td className={diemCanLuuY(r) ? "ctc-score-warning" : "ctc-score"}><b>{r.DiemTuDanhGia == null ? "Chưa kê khai" : formatDiem(r.DiemTuDanhGia)}</b>
                {r.DiemTuDanhGia == null && <div className="ctc-meta">Duyệt sẽ tính 0 điểm</div>}</td>
              <td><button className={`cd-link-btn${thieuMinhChung(r) ? " ctc-warning" : ""}`} disabled={khoa} onClick={() => setDongMinhChung(r)}>
                <i className="fa-solid fa-paperclip" /> Xem ({r.SoMinhChung ?? 0})</button>{thieuMinhChung(r) && <div className="ctc-warning">Thiếu minh chứng bắt buộc</div>}</td>
              <td>{formatNgay(r.NgayGui)}</td>
              <td><div className="cd-row-actions">
                <button className="btn-submit" disabled={khoa || !coTheCham(r)} onClick={() => chayThaoTac(r, (rowVersion) => duyetThamDinh(r.IdChiTiet, { rowVersion }), `Đã duyệt ${r.HoTen}, giữ nguyên điểm tự đánh giá.`)}><i className="fa-solid fa-check" /> Duyệt</button>
                <button className="btn-cancel" disabled={khoa || !coTheCham(r)} onClick={() => moSuaDiem(r)}><i className="fa-solid fa-pen" /> Sửa điểm</button>
                <button className="cd-btn-tra-ve" disabled={khoa || !coTheCham(r)} onClick={() => setDongTraVe(r)}><i className="fa-solid fa-rotate-left" /> Trả về</button>
              </div></td>
            </tr>)}</tbody>
          </table></div>}
        </div>
      </>}
      {xacNhan && <LyDoModal tieuDe="Xác nhận duyệt" moTa={`Duyệt ${xacNhan.rows.length} người, giữ nguyên điểm tự đánh giá?`}
        nhanLyDo="Nhận xét (không bắt buộc)" maxLengthLyDo={1000} batBuocLyDo={false} nhanXacNhan={`Duyệt ${xacNhan.rows.length} người`} iconXacNhan="fa-check"
        dangGui={dangXuLy} onDong={() => setXacNhan(null)} onXacNhan={duyetLo}>
        <div className="cd-xac-nhan-tom-tat"><div><span>Tiêu chí</span><b>{tieuChi.TenTieuChi}</b></div><div><span>Năm đánh giá</span><b>{selectedNam}</b></div></div>
        {(canhBaoLo.diem > 0 || canhBaoLo.minhChung > 0) && <div className="ctc-warning ctc-confirm-warning">
          {canhBaoLo.diem > 0 && <div>{canhBaoLo.diem} dòng chưa kê khai hoặc có điểm tự đánh giá bằng 0. Dòng chưa kê khai sẽ tính 0 điểm.</div>}
          {canhBaoLo.minhChung > 0 && <div>{canhBaoLo.minhChung} dòng thiếu minh chứng bắt buộc. Nên xem minh chứng trước khi duyệt.</div>}
        </div>}
      </LyDoModal>}
      {dongTraVe && <LyDoModal tieuDe="Trả về cho cá nhân bổ sung" moTa={`${dongTraVe.HoTen} · ${dongTraVe.TenTieuChi}`} nhanLyDo="Lý do trả về"
        nhanXacNhan="Trả về" dangGui={dangXuLy} onDong={() => setDongTraVe(null)} onXacNhan={({ lyDo }) => chayThaoTac(dongTraVe,
          (rowVersion) => traVeThamDinh(dongTraVe.IdChiTiet, { lyDo, rowVersion }), `Đã trả tiêu chí về cho ${dongTraVe.HoTen} bổ sung.`)} />}
      {suaDiem && <SuaDiemModal chiTiet={suaDiem.dong} thangDiem={suaDiem.thangDiem} nhanChuPhieu="Cá nhân" dangGui={dangXuLy} onDong={() => setSuaDiem(null)}
        onXacNhan={({ diem, nhanXet }) => chayThaoTac(suaDiem.dong, (rowVersion) => putDiemKhoa(suaDiem.dong.IdChiTiet, { diem, nhanXet, rowVersion }), `Đã chốt ${formatDiem(diem)} điểm cho ${suaDiem.dong.HoTen}.`)} />}
      {dongMinhChung && <MinhChungModal dong={dongMinhChung} onDong={() => setDongMinhChung(null)} onXem={openPreview} onTai={downloadMinhChung} />}
      <FilePreviewModal isOpen={preview.isOpen} fileName={preview.mc?.TenFileGoc || preview.mc?.TenHienThi} kieu={preview.kieu} url={preview.url}
        isLoading={preview.isLoading} error={preview.error} onClose={closePreview} onDownload={() => downloadMinhChung(preview.mc)} />
    </div>
  );
};

export default ChamTheoTieuChi;
