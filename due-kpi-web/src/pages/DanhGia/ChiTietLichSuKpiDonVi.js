import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toast } from "primereact/toast";
import { fetchPhieuDonViDetail, laDongChamTay, tinhTongDiemDonViTamTinh } from "../../utils/phieuDonViApi";
import { formatDiem, formatNgayGio } from "../../utils/phieuApi";
import { cauHinhKpiDonVi } from "../../utils/kpiDonViWorkspace";
import { quyenPhieuKhoa } from "../../utils/phieuKhoaApi";
import { quyenPhieuPhong } from "../../utils/phieuPhongApi";
import { useAuth } from "../../context/AuthContext";
import { useMinhChungDonViPreview } from "../../hooks/useMinhChungDonViPreview";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import TienDoCham from "../../components/QuanLyChamDiem/TienDoCham";
import TongDiemMeta from "../../components/QuanLyChamDiem/TongDiemMeta";
import { TrangThaiDonViBadge, XepLoaiBadge } from "../../components/QuanLyChamDiem/TrangThaiBadge";
import TieuChiKetQuaDonViCard from "../../components/DanhGia/TieuChiKetQuaDonViCard";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";

/** Trang kết quả riêng: chỉ nhập API đọc, không gắn lại form hay hiệu ứng ghi điểm. */
export default function ChiTietLichSuKpiDonVi({ idPhieu, loai = "khoa", backTo, backState }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = cauHinhKpiDonVi(loai);
  const toast = useRef(null);
  const [phieu, setPhieu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loi, setLoi] = useState("");
  const [retry, setRetry] = useState(0);
  const { preview, openPreview, closePreview, downloadMinhChung } = useMinhChungDonViPreview((message) =>
    toast.current?.show({ severity: "error", summary: "Minh chứng", detail: message, life: 4000 }),
  );

  useEffect(() => {
    let con = true;
    setLoading(true);
    setLoi("");
    fetchPhieuDonViDetail(idPhieu).then((item) => {
      if (!con) return;
      setPhieu(item);
      if (!item) setLoi("Không tìm thấy phiếu hoặc bạn không có quyền xem phiếu này.");
    }).catch((error) => {
      if (con) { setPhieu(null); setLoi(error.message); }
    }).finally(() => { if (con) setLoading(false); });
    return () => { con = false; };
  }, [idPhieu, retry]);

  const veLichSu = () => navigate(backTo || config.lichSu, { state: backState });
  if (loading) return <div className="page-container"><div className="modern-table-card"><div className="cd-empty">Đang tải phiếu đánh giá...</div></div></div>;
  if (loi || !phieu) return <div className="page-container"><div className="modern-table-card"><div className="cd-empty" role="alert">
    <h3>Không mở được phiếu</h3><p>{loi}</p>
    <button className="btn-cancel" onClick={veLichSu}>Về danh sách phiếu</button>
    <button className="btn-cancel" onClick={() => setRetry((n) => n + 1)}>Thử lại</button>
  </div></div></div>;

  const chiTiet = phieu.ChiTiet || [];
  const tamTinh = tinhTongDiemDonViTamTinh(chiTiet);
  const chamTay = chiTiet.filter(laDongChamTay);
  const capTruong = Number(phieu.TrangThai) >= 3;
  const truongDiem = capTruong ? "DiemTruong" : "DiemDuyetDv";
  const daCham = chamTay.filter((ct) => ct[truongDiem] != null).length;
  // Hỏi đúng bảng quyền mà trang đánh giá dùng: chỉ mời sang khi người xem thật
  // sự còn việc trên phiếu này - nhập (trạng thái 1) hoặc duyệt (trạng thái 2).
  const quyen = loai === "phong" ? quyenPhieuPhong(phieu, user) : quyenPhieuKhoa(phieu, user);
  const coTheDanhGia = quyen.coTheNhap || quyen.coTheDuyetDv;

  return <div className="page-container">
    <Toast ref={toast} position="top-right" />
    <div className="page-header">
      <button className="cd-link-btn" style={{ marginBottom: 8 }} onClick={veLichSu}><i className="fa-solid fa-arrow-left"></i> Phiếu đánh giá KPI {config.ten}</button>
      <h2 style={{ margin: 0, color: "#1e293b", fontSize: 22, fontWeight: 700 }}>Kết quả chấm điểm - năm học {phieu.IdNam}</h2>
      <span className="breadcrumb">Lần đánh giá {phieu.LanDanhGia}{phieu.LanMoLai > 0 ? ` · Đã mở lại ${phieu.LanMoLai} lần` : ""} · Chỉ xem, không chỉnh sửa</span>
    </div>
    <div className="cd-phieu-header">
      <div className="cd-phieu-top">
        <TrangThaiDonViBadge trangThai={phieu.TrangThai} />
        {chamTay.length > 0 && <TienDoCham xong={daCham} tong={chamTay.length} nhan={capTruong ? "Tiêu chí cấp Trường đã chấm" : "Tiêu chí Trưởng đơn vị đã chấm"}
          ghiChu={chiTiet.length > chamTay.length ? `Không tính ${chiTiet.length - chamTay.length} tiêu chí hệ thống tự chấm` : undefined} />}
      </div>
      <div className="cd-meta-grid">
        {loai === "khoa" ? <TongDiemMeta phieu={phieu} tamTinh={tamTinh} /> : <div>
          <div className="cd-meta-label">Tổng điểm tích lũy{phieu.TongDiemTichLuy == null && tamTinh && <span className="cd-tam-tinh">tạm tính</span>}</div>
          <div className="cd-meta-value" style={{ color: "#1d4ed8" }}>{formatDiem(phieu.TongDiemTichLuy ?? tamTinh?.tichLuy)}</div>
        </div>}
        <div><div className="cd-meta-label">Đơn vị</div><div className="cd-meta-value" style={{ fontWeight: 600 }}>{phieu.TenDonVi || `Đơn vị #${phieu.IdDonVi}`}</div></div>
        <div><div className="cd-meta-label">Xếp loại</div><div className="cd-meta-value"><XepLoaiBadge xepLoai={phieu.XepLoai} /></div></div>
        <div><div className="cd-meta-label">Ngày gửi</div><div className="cd-meta-value">{formatNgayGio(phieu.NgayGui)}</div></div>
        <div><div className="cd-meta-label">Cập nhật gần nhất</div><div className="cd-meta-value">{formatNgayGio(phieu.NgayCapNhat)}</div></div>
      </div>
      {phieu.TongDiemTichLuy == null && tamTinh && <div className="cd-hint"><i className="fa-solid fa-circle-info"></i> Tổng điểm được lưu khi chốt phiếu. Số “tạm tính” cộng từ điểm hiện có của từng tiêu chí{tamTinh.soDongChuaCoDiem ? `, còn ${tamTinh.soDongChuaCoDiem} tiêu chí chưa có điểm.` : "."}</div>}
      {[["Nhận xét của Trưởng đơn vị", phieu.NhanXetDv], ["Nhận xét của cấp Trường", phieu.NhanXetTruong]].filter(([, text]) => text).map(([nhan, text]) =>
        <div className="cd-box" style={{ marginTop: 16 }} key={nhan}><div className="cd-box-title">{nhan}</div><div>{text}</div></div>)}
      {!!phieu.PheDuyet?.length && <details style={{ marginTop: 12 }}><summary>Thông tin phê duyệt</summary><ul>{phieu.PheDuyet.map((p, i) =>
        <li key={p.IdPheDuyet ?? i}>Lần {p.LanDanhGia} · Cấp duyệt {p.CapDuyet} · {formatNgayGio(p.NgayDuyet || p.NgayTao)}{p.NhanXet ? ` · ${p.NhanXet}` : ""}{p.LyDoTuChoi ? ` · ${p.LyDoTuChoi}` : ""}</li>)}</ul></details>}
      {coTheDanhGia && <button className="cd-link-btn" style={{ marginTop: 12 }} onClick={() => navigate(config.danhGia, { state: { kpiFilters: { idNam: String(phieu.IdNam), idDonVi: String(phieu.IdDonVi) } } })}>Chuyển sang trang đánh giá</button>}
    </div>
    <p className="sub-title" style={{ marginBottom: 12 }}>CHI TIẾT TIÊU CHÍ ({chiTiet.length})</p>
    {chiTiet.length ? chiTiet.map((ct, index) => <TieuChiKetQuaDonViCard key={ct.IdChiTietDv} chiTiet={ct} stt={index + 1} onXem={openPreview} onTai={downloadMinhChung} />) :
      <div className="modern-table-card"><div className="cd-empty">Phiếu chưa có tiêu chí nào.</div></div>}
    <FilePreviewModal isOpen={preview.isOpen} fileName={preview.mc?.TenFileGoc || preview.mc?.TenHienThi} kieu={preview.kieu} url={preview.url}
      isLoading={preview.isLoading} error={preview.error} onClose={closePreview} onDownload={() => downloadMinhChung(preview.mc)} />
  </div>;
}
