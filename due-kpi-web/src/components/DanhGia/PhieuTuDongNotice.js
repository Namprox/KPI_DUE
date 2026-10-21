import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { donViTheoVaiTro, normalizeRole, ROLE_SETS } from "../../utils/roles";
import { laDonViChaHoacChinhNo } from "../../utils/phieuChamPermissions";
import { buildDonViIndex } from "../../utils/viPhamPermissions";
import { tongHopTuDong } from "../../utils/phieuApi";
import { laDiemDuKien, thongBaoLoiTongHopTuDong } from "../../utils/diemTuDongPhieu";
import "../../css/DanhGia/PhieuTuDong.css";

// BE không trả cờ quyền: chỉ phiếu năm 1/2 đang nhận điểm, ADMIN hoặc trưởng đơn vị
// (không gồm HT/PHT/cấp phó) tại đơn vị của phiếu hoặc cấp trên, xét theo từng
// dòng bổ nhiệm kể cả kiêm nhiệm. Chỉ hiện nút khi có điểm chưa ghi hoặc đã lệch.
export const duocTongHopTuDongPhieu = (user, phieu, data, donViList = []) => {
  if (!phieu?.IdPhieu || Number(data?.Quy ?? phieu.Quy ?? 0) !== 0 ||
    ![1, 2].includes(Number(phieu.TrangThai)) || data?.LaPhieuNhanTuDong !== true ||
    !data.Items?.some((item) => item.CanChamLai === true || laDiemDuKien(item))) return false;
  if (normalizeRole(user) === "ADMIN") return true;
  const index = buildDonViIndex(donViList);
  return donViTheoVaiTro(ROLE_SETS.TRUONG_DON_VI, user).some((dv) =>
    laDonViChaHoacChinhNo(dv.IdDonVi, phieu.IdDonVi, index));
};

export default function PhieuTuDongNotice({ phieu, tuDong, donViList, onReload }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  useEffect(() => { setMessage(null); }, [phieu?.IdPhieu]);
  const { data, error, loading } = tuDong;
  const canAggregate = !!onReload && duocTongHopTuDongPhieu(user, phieu, data, donViList);
  const aggregate = async () => {
    if (busy) return;
    setBusy(true); setMessage(null);
    try {
      await tongHopTuDong(phieu.IdPhieu);
      await onReload();
      setMessage({ text: "Đã tổng hợp điểm tự động." });
    } catch (e) {
      setMessage({ text: thongBaoLoiTongHopTuDong(e), error: true });
      // Mọi kết quả ghi đều cần đọc lại trạng thái/RowVersion trước lần thao tác tiếp.
      await onReload();
    } finally { setBusy(false); }
  };
  if (!phieu) return null;
  if (loading) return <p className="phieu-auto-notice" role="status">Đang tải điểm tự động và minh chứng...</p>;
  if (error) return <p className="phieu-auto-notice" role="alert">{error.message}</p>;
  // Phiếu không có dòng tự động cũng có thể có LaPhieuNhanTuDong = false.
  if (data?.LaPhieuNhanTuDong === false && Number(data.SoTieuChiTuDong) > 0) {
    const quy = Number(data.Quy) > 0 ? Number(data.Quy) : 0;
    const query = quy ? "?loai=quy" : "";
    return <div className="phieu-auto-notice">
      <p>
        Điểm tự động của {quy ? `quý ${quy}` : "năm"} được ghi vào
        {data.IdPhieuNhanTuDong ? ` phiếu #${data.IdPhieuNhanTuDong}` : " phiếu khác"} của cùng viên chức - mỗi kỳ
        chỉ một phiếu nhận điểm tự động, nên các tiêu chí tự động trên phiếu này không được chấm.
      </p>
      {data.IdPhieuNhanTuDong && <Link to={`/lich-su-danh-gia/${data.IdPhieuNhanTuDong}${query}`}>
        Xem phiếu #{data.IdPhieuNhanTuDong} nhận điểm tự động
      </Link>}
    </div>;
  }
  if (!canAggregate && !message) return null;
  return <div className="phieu-auto-notice">
    {canAggregate && <button type="button" className="phieu-auto-aggregate" disabled={busy} onClick={aggregate}>
      <i className={`fa-solid ${busy ? "fa-spinner fa-spin" : "fa-rotate"}`} aria-hidden="true" />
      Tổng hợp tự động
    </button>}
    {message && <p role={message.error ? "alert" : "status"}>{message.text}</p>}
  </div>;
}
