import React, { useEffect, useState } from "react";
import MinhChungNvkRow from "../Common/MinhChungNvkRow";
import { formatNgayGio } from "../../utils/phieuApi";
import {
  layDanhSachPhanHoi,
  TEN_LOAI_PHAN_HOI,
} from "../../utils/nhiemVuKhoaApi";

/** Phản hồi của luồng cũ chỉ được đọc, không còn thao tác ghi. */
export default function NvkPanelPhanHoi({
  idNam,
  idDonVi,
  onXemMinhChung,
  onTaiMinhChung,
  onError,
}) {
  const [items, setItems] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  useEffect(() => {
    let huy = false;
    setDangTai(true);
    layDanhSachPhanHoi({ idNam, idDonVi })
      .then((result) => {
        if (!huy) setItems(result);
      })
      .catch((error) => {
        if (!huy) {
          setItems([]);
          onError(error.message);
        }
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, [idNam, idDonVi, onError]);
  return (
    <>
      <p className="cd-hint">Phản hồi từ luồng cũ được lưu để tra cứu.</p>
      {dangTai ? (
        <div className="cd-empty">Đang tải phản hồi cũ...</div>
      ) : items.length === 0 ? (
        <div className="cd-empty">Không có phản hồi lưu trữ.</div>
      ) : (
        <div className="nvk-ph-list">
          {items.map((ph) => (
            <div className="nvk-ph-card" key={ph.IdPhanHoi}>
              <div className="nvk-ph-head">
                <b>{ph.HoTen}</b>
                <span>{TEN_LOAI_PHAN_HOI[ph.LoaiPhanHoi] || "Phản hồi"}</span>
                <span>
                  {Number(ph.TrangThai) === 2 ? "Đã xử lý" : "Chờ xử lý (cũ)"}
                </span>
                <span>{formatNgayGio(ph.NgayTao)}</span>
              </div>
              <p>{ph.TenNhiemVu || ph.TenNhom}</p>
              <div className="nvk-ph-noi-dung">{ph.NoiDung}</div>
              {ph.GhiChuXuLy && (
                <div className="nvk-ph-xu-ly">
                  {ph.TenNguoiXuLy}: {ph.GhiChuXuLy}
                </div>
              )}
              {(ph.MinhChung || []).map((mc) => (
                <MinhChungNvkRow
                  key={mc.IdMinhChungNvk}
                  mc={mc}
                  onXem={onXemMinhChung}
                  onTai={onTaiMinhChung}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
