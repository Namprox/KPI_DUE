import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { donViTheoVaiTro, normalizeRole, ROLE_SETS } from "../../utils/roles";
import { laDonViChaHoacChinhNo } from "../../utils/phieuChamPermissions";
import { buildDonViIndex } from "../../utils/viPhamPermissions";
import { tongHopTuDong } from "../../utils/phieuApi";
import "../../css/DanhGia/PhieuTuDong.css";

export const duocTongHopTuDongPhieu = (user, phieu, data, donViList = []) => {
  if (!phieu?.IdPhieu || Number(data?.Quy ?? phieu.Quy ?? 0) !== 0 ||
    ![1, 2].includes(Number(phieu.TrangThai)) || data?.LaPhieuNhanTuDong !== true ||
    !data.Items?.some((item) => item.CanChamLai === true)) return false;
  if (normalizeRole(user) === "ADMIN") return true;
  const index = buildDonViIndex(donViList);
  return donViTheoVaiTro(ROLE_SETS.TRUONG_DON_VI, user).some((dv) =>
    laDonViChaHoacChinhNo(dv.IdDonVi, phieu.IdDonVi, index));
};

export default function PhieuTuDongNotice({ phieu, tuDong, donViList, onReload }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { setMessage(""); }, [phieu?.IdPhieu]);
  const { data, error, loading } = tuDong;
  const canAggregate = !!onReload && duocTongHopTuDongPhieu(user, phieu, data, donViList);
  const aggregate = async () => {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      await tongHopTuDong(phieu.IdPhieu);
      await onReload();
      setMessage("Đã tổng hợp điểm tự động.");
    } catch (e) {
      setMessage(e.message);
      // Mọi kết quả ghi đều cần đọc lại trạng thái/RowVersion trước lần thao tác tiếp.
      await onReload();
    } finally { setBusy(false); }
  };
  if (!phieu) return null;
  if (loading) return <p className="phieu-auto-notice" role="status">Đang tải điểm tự động và minh chứng...</p>;
  if (error) return <p className="phieu-auto-notice" role="alert">{error.message}</p>;
  if (data?.LaPhieuNhanTuDong === false) {
    const query = Number(data.Quy) > 0 ? "?loai=quy" : "";
    return <div className="phieu-auto-notice">
      <p>{data.Message}</p>
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
    {message && <p role="status">{message}</p>}
  </div>;
}
