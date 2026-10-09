import React, { useEffect, useState } from "react";
import { apiFetch } from "../../../utils/api";

const ViTriPhieuTrongKhoa = ({ idPhieu, tenDonVi, lanLamMoi = 0 }) => {
  const [ketQua, setKetQua] = useState(null);

  useEffect(() => {
    if (!idPhieu) return;
    const controller = new AbortController();
    setKetQua(null);

    const taiViTri = async () => {
      try {
        const res = await apiFetch(`phieu/${idPhieu}/xep-hang-tam-tinh`, {
          signal: controller.signal,
          cache: "no-store",
        });
        // 404 bao gồm phiếu quý / không có quyền: ẩn, không thử lại.
        if (!res.ok) return;
        const data = await res.json();
        if (!controller.signal.aborted && data.Success === true &&
            Number(data.IdPhieu) === Number(idPhieu) && Number(data.TongSo) > 0 &&
            Number(data.HangChinhThuc ?? data.Hang) > 0) {
          setKetQua({ idPhieu, lanLamMoi, data });
        }
      } catch (err) {
        // Thông tin tham khảo không chặn việc điền hoặc lưu phiếu.
      }
    };

    taiViTri();
    return () => controller.abort();
  }, [idPhieu, lanLamMoi]);

  const data = ketQua?.idPhieu === idPhieu && ketQua?.lanLamMoi === lanLamMoi
    ? ketQua.data : null;
  if (!idPhieu) {
    return (
      <div className="pl2-ranking" aria-label="Vị trí của phiếu trong khoa">
        <span className="pl2-header-score-label">
          <i className="fa-solid fa-ranking-star" aria-hidden="true"></i>
          Vị trí tạm tính
        </span>
        <div className="pl2-ranking-value">—</div>
        {tenDonVi && <div className="pl2-ranking-context">{tenDonVi}</div>}
        <div className="pl2-ranking-note">Lưu nháp phiếu để xem vị trí trong khoa.</div>
      </div>
    );
  }
  if (!data) return null;

  const coHangChinhThuc = data.HangChinhThuc != null;
  const tamTinh = !coHangChinhThuc && data.LaTamTinh === true;
  const soDongHang = Number(data.SoNguoiDongHang) || 0;
  const hangHienThi = coHangChinhThuc ? data.HangChinhThuc : data.Hang;
  const ghiChuTamTinh = tamTinh
    ? "Thứ hạng thay đổi khi bạn hoặc đồng nghiệp cập nhật điểm."
    : undefined;

  return (
    <div className="pl2-ranking" aria-label="Vị trí của phiếu trong khoa" aria-live="polite">
      <div className="pl2-ranking-heading">
        <span className="pl2-header-score-label" title={ghiChuTamTinh}>
          <i className="fa-solid fa-ranking-star" aria-hidden="true"></i>
          {coHangChinhThuc ? "Hạng chính thức" : "Vị trí tạm tính"}
        </span>
      </div>
      <div className="pl2-ranking-value">
        {hangHienThi}
        <span className="pl2-ranking-total">/{data.TongSo}</span>
      </div>
      <div className="pl2-ranking-description">
        Vị trí {hangHienThi} trên {data.TongSo} phiếu trong nhóm
      </div>
      <div className="pl2-ranking-context">
        Nhóm: {data.NhomXepHangText}{tenDonVi && ` · ${tenDonVi}`}
      </div>
      {!coHangChinhThuc && soDongHang > 1 && (
        <div className="pl2-ranking-note">Đồng hạng với {soDongHang - 1} người</div>
      )}
    </div>
  );
};

export default ViTriPhieuTrongKhoa;
