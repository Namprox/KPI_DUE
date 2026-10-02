import React, { useCallback, useEffect, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { hasRole, ROLE_SETS } from "../../utils/roles";
import { formatDiem, formatNgayGio } from "../../utils/phieuApi";
import { chotXetXuatSacVienChucKhoa, fetchXetXuatSacVienChucKhoa } from "../../utils/xetXuatSacVienChucKhoaApi";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import SearchSelect from "../../components/Common/SearchSelect";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/XetXuatSacVienChucKhoa.css";

const BangHoSoCanXuLy = ({ hoSo, khongHopLe = false }) => (
  <div className="modern-table-card xxsk-table-wrap">
    <table className="custom-table">
      <thead><tr><th>Họ tên</th><th>Khoa</th><th>{khongHopLe ? "Lý do" : "Trạng thái"}</th></tr></thead>
      <tbody>{hoSo.map((h) => <tr key={h.IdPhieu}>
        <td><b>{h.HoTen || "-"}</b><div className="xxsk-muted">{h.MaNhanVien || `Phiếu ${h.IdPhieu}`}</div></td>
        <td>{h.TenDonVi || "-"}</td><td>{(khongHopLe ? h.LyDo : h.TrangThaiText) || "-"}</td>
      </tr>)}</tbody>
    </table>
  </div>
);

const XetXuatSacVienChucKhoa = () => {
  const toast = useRef(null);
  const lanTai = useRef(0);
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  const [duLieu, setDuLieu] = useState(null);
  const [daChon, setDaChon] = useState([]);
  const [dangTai, setDangTai] = useState(false);
  const [dangChot, setDangChot] = useState(false);
  const [moChot, setMoChot] = useState(false);
  const [loi, setLoi] = useState(null);
  const coQuyen = hasRole(ROLE_SETS.XET_XUAT_SAC_VIEN_CHUC_KHOA, user);

  const apDungDuLieu = (data) => {
    setDuLieu(data);
    setDaChon((data.UngVien || []).filter((h) => h.DaChon === true).map((h) => h.IdPhieu));
  };

  const taiDanhSach = useCallback(async () => {
    const lan = ++lanTai.current;
    setDuLieu(null);
    setDaChon([]);
    setLoi(null);
    setMoChot(false);
    if (!selectedNam || !coQuyen) return;
    setDangTai(true);
    try {
      const data = await fetchXetXuatSacVienChucKhoa(selectedNam);
      if (lan === lanTai.current) apDungDuLieu(data);
    } catch (error) {
      if (lan === lanTai.current) setLoi(error);
    } finally {
      if (lan === lanTai.current) setDangTai(false);
    }
  }, [selectedNam, coQuyen]);

  const huyLanTai = useCallback(() => { ++lanTai.current; }, []);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
    return huyLanTai;
  }, [dangTaiNam, taiDanhSach, huyLanTai]);

  const tongHop = duLieu?.TongHop;
  const ungVien = duLieu?.UngVien || [];
  const hoSoChuaDuyet = loi?.errorCode === "CHUA_DU_HO_SO" ? loi.hoSoChuaDuyet || [] : duLieu?.HoSoChuaDuyet || [];
  const coTheChot = coQuyen && tongHop?.DuDieuKienChot === true && Number(tongHop.IdNam) === Number(selectedNam) && !dangTai && !dangChot && !loi;

  const handleChot = async ({ lyDo }) => {
    if (!coTheChot) return;
    if (lyDo.length > 1000) return;
    setMoChot(false);
    setDangChot(true);
    setLoi(null);
    try {
      const data = await chotXetXuatSacVienChucKhoa({
        idNam: selectedNam,
        idPhieuList: ungVien.filter((h) => daChon.includes(h.IdPhieu)).map((h) => h.IdPhieu),
        ghiChu: lyDo,
        rowVersion: tongHop.RowVersion,
      });
      apDungDuLieu(data);
      toast.current?.show({ severity: "success", summary: "Đã chốt xét xuất sắc", detail: data.Message, life: 8000 });
    } catch (error) {
      if (error.errorCode === "CONCURRENCY_CONFLICT") {
        await taiDanhSach();
        toast.current?.show({ severity: "warn", summary: "Danh sách đã thay đổi", detail: `${error.message} Đã tải lại danh sách. Vui lòng kiểm tra lựa chọn và chốt lại.`, life: 10000 });
      } else {
        setLoi(error);
      }
    } finally {
      setDangChot(false);
    }
  };

  if (!coQuyen) return <div className="page-container">Bạn không có quyền xét xuất sắc cấp Trường.</div>;

  return <div className="page-container xxsk-page">
    <Toast ref={toast} position="top-right" />
    <div className="page-header xxsk-heading">
      <div className="xxsk-title">
        <h2>Xét xuất sắc viên chức Khoa</h2>
        <span className="breadcrumb">Hiệu trưởng xét chọn trên danh sách viên chức Hoàn thành tốt của tất cả các Khoa.</span>
      </div>
      <div className="cd-field xxsk-year">
        <label className="cd-label">Năm đánh giá</label>
        <SearchSelect
          ariaLabel="Năm đánh giá"
          value={selectedNam}
          onChange={(value) => setSelectedNam(String(value))}
          options={namList.map((n) => ({ value: n.IdNam, label: n.TenNam || `Năm học ${n.IdNam}` }))}
          placeholder="Chọn năm"
          disabled={dangTaiNam || dangChot}
        />
      </div>
    </div>
    {loi && <div role="alert" className="cd-hint cd-hint-error">{loi.message}</div>}
    {loi?.hoSoKhongHopLe?.length > 0 && <section><h3>Hồ sơ không hợp lệ</h3><BangHoSoCanXuLy hoSo={loi.hoSoKhongHopLe} khongHopLe /></section>}
    {(dangTaiNam || dangTai) && <div className="cd-empty">Đang tải danh sách xét chọn...</div>}
    {!dangTaiNam && !selectedNam && <div className="cd-empty">Chưa có năm đánh giá để xét chọn.</div>}
    {tongHop && <>
      <div className="xxsk-stats">
        {[["Tổng viên chức Khoa", tongHop.SoVienChuc], ["Chưa được Khoa duyệt", tongHop.SoChuaDuyet], ["Ứng viên", tongHop.SoUngVien], ["Chờ xét", tongHop.SoChoXet], ["Đã chốt xuất sắc", tongHop.SoDaChon]].map(([label, value]) =>
          <div className="xxsk-stat" key={label}><span>{label}</span><strong>{value ?? "-"}</strong></div>)}
      </div>
      {tongHop.LanChot == null ? <div className="xxsk-notice">Danh sách chưa được Hiệu trưởng chốt.{ungVien.some((h) => h.DaChon === true) && " Lựa chọn đang hiển thị có thể gồm kết quả từ hạn ngạch Khoa trước đây."}</div> :
        <div className="cd-box">
          <div className="cd-box-title">Lần chốt gần nhất: {tongHop.LanChot}</div>
          <p>{tongHop.HoTenNguoiChot || "-"} · {formatNgayGio(tongHop.NgayChot)}</p>
          <p>{tongHop.SoUngVienLanChot ?? "-"} ứng viên, {tongHop.SoXuatSacLanChot ?? "-"} người xuất sắc tại lần chốt này.</p>
          {tongHop.GhiChu && <p className="xxsk-note">{tongHop.GhiChu}</p>}
        </div>}
      {tongHop.LanChot != null && Number(tongHop.SoChoXet) > 0 && <div className="xxsk-notice">Có {tongHop.SoChoXet} ứng viên mới đang chờ xét. Cần kiểm tra danh sách và chốt lại.</div>}
      {hoSoChuaDuyet.length > 0 && <section><h3>Hồ sơ chưa được Trưởng khoa duyệt ({hoSoChuaDuyet.length})</h3><BangHoSoCanXuLy hoSo={hoSoChuaDuyet} /></section>}
      <section><h3>Tiến độ từng Khoa</h3>
        <div className="modern-table-card xxsk-table-wrap"><table className="custom-table xxsk-faculties">
          <colgroup><col style={{ width: "36%" }} /><col style={{ width: "14%" }} /><col style={{ width: "18%" }} /><col style={{ width: "14%" }} /><col style={{ width: "18%" }} /></colgroup>
          <thead><tr><th>Khoa</th><th>Viên chức</th><th>Chưa duyệt</th><th>Ứng viên</th><th>Đã chốt xuất sắc</th></tr></thead>
          <tbody>{(duLieu.Khoa || []).map((k) => <tr key={k.IdDonVi} className={k.SoChuaDuyet > 0 ? "xxsk-blocking" : ""}>
            <td>{k.TenDonVi}</td><td>{k.SoVienChuc ?? "-"}</td><td>{k.SoChuaDuyet ?? "-"}{k.SoChuaDuyet > 0 && " · Đang chờ Khoa duyệt"}</td><td>{k.SoUngVien ?? "-"}</td><td>{k.SoDaChon ?? "-"}</td>
          </tr>)}</tbody>
        </table>{!duLieu.Khoa?.length && <div className="cd-empty">Chưa có dữ liệu Khoa.</div>}</div>
      </section>
      <section><div className="xxsk-selection-header">
        <div><h3>Danh sách ứng viên</h3><p className="xxsk-muted">Chọn theo quyết định của Hiệu trưởng, kể cả không chọn ai. Người bằng điểm có thể cùng hạng.</p></div>
        <span className="xxsk-selection-count">Đang chọn {daChon.length} người xuất sắc</span>
      </div>
        <div className="modern-table-card xxsk-table-wrap"><table className="custom-table xxsk-candidates">
          <colgroup>
            <col className="xxsk-col-select" /><col className="xxsk-col-rank" />
            <col className="xxsk-col-person" /><col className="xxsk-col-faculty" />
            <col className="xxsk-col-score" /><col className="xxsk-col-score" /><col className="xxsk-col-total" />
            <col className="xxsk-col-rating" /><col className="xxsk-col-status" />
          </colgroup>
          <thead><tr><th aria-label="Chọn xuất sắc" title="Chọn xuất sắc">Chọn</th><th aria-label="Hạng toàn Trường" title="Hạng toàn Trường">Hạng</th><th>Họ tên</th><th>Khoa</th><th>Điểm<br />cơ bản</th><th>Điểm<br />vượt trội</th><th>Tổng<br />tích lũy</th><th>Kết quả đã chốt</th><th>Trạng thái</th></tr></thead>
          <tbody>{ungVien.map((h) => <tr key={h.IdPhieu} className={daChon.includes(h.IdPhieu) ? "cd-row-xuat-sac" : ""}>
            <td><input type="checkbox" aria-label={`Chọn xuất sắc ${h.HoTen}`} checked={daChon.includes(h.IdPhieu)} disabled={dangChot || dangTai || !!loi} onChange={() => setDaChon((ids) => ids.includes(h.IdPhieu) ? ids.filter((id) => id !== h.IdPhieu) : [...ids, h.IdPhieu])} /></td>
            <td>{h.HangToanTruong ?? "-"}</td><td><b>{h.HoTen || "-"}</b><div className="xxsk-muted">{h.MaNhanVien || "-"}</div></td><td>{h.TenDonVi || "-"}</td>
            <td>{formatDiem(h.TongDiemCoBan)}</td><td>{formatDiem(h.TongDiemVuotTroi)}</td><td><b>{formatDiem(h.TongDiemTichLuy)}</b></td>
            <td>{Number(h.TrangThai) === 5 ? h.XepLoaiText || "-" : "Chưa chốt"}</td><td>{h.TrangThaiText || "-"}</td>
          </tr>)}</tbody>
        </table>{!ungVien.length && <div className="cd-empty">Chưa có ứng viên để xét xuất sắc.</div>}</div>
      </section>
      <div className="xxsk-actions">
        <div className="xxsk-action-copy">
          <p className="xxsk-muted">Mỗi lần chốt cập nhật toàn bộ ứng viên: người được chọn đạt Hoàn thành xuất sắc, người còn lại giữ Hoàn thành tốt và tất cả hoàn tất.</p>
          {tongHop.DuDieuKienChot !== true && <p className="xxsk-muted">{Number(tongHop.SoChuaDuyet) > 0 ? "Chỉ chốt được khi tất cả phiếu viên chức Khoa đã được Trưởng khoa duyệt." : "Chưa đủ điều kiện chốt xét xuất sắc."}</p>}
        </div>
        <button className="btn-submit" disabled={!coTheChot} onClick={() => setMoChot(true)}>{dangChot ? "Đang chốt..." : "Chốt xét xuất sắc"}</button>
      </div>
    </>}
    {moChot && <LyDoModal tieuDe="Chốt xét xuất sắc cấp Trường" moTa={`Chọn ${daChon.length} người xuất sắc trong danh sách ${ungVien.length} ứng viên. Lần chốt này thay thế toàn bộ lựa chọn trước đó.`}
      nhanLyDo="Ghi chú (tối đa 1000 ký tự)" maxLengthLyDo={1000} batBuocLyDo={false} nhanXacNhan="Xác nhận chốt" iconXacNhan="fa-check" dangGui={dangChot} onDong={() => setMoChot(false)} onXacNhan={handleChot}>
      {daChon.length > 0 ? <ul>{ungVien.filter((h) => daChon.includes(h.IdPhieu)).map((h) => <li key={h.IdPhieu}>{h.HoTen} · {h.TenDonVi}</li>)}</ul> : <p>Không chọn ai xuất sắc. Tất cả ứng viên giữ mức Hoàn thành tốt.</p>}
    </LyDoModal>}
  </div>;
};

export default XetXuatSacVienChucKhoa;
