import React, { useCallback, useEffect, useState } from "react";
import { formatDiem, formatNgayGio } from "../../utils/phieuApi";
import {
  HANH_DONG,
  layLichSuKy,
  TEN_HANH_DONG,
} from "../../utils/nhiemVuKhoaApi";

/** Màu theo nhóm hành động, để mắt quét nhanh cột nhật ký. */
const MAU_HANH_DONG = {
  [HANH_DONG.TAO_NHIEM_VU]: "nvk-ls-them",
  [HANH_DONG.THEM_PHAN_CONG]: "nvk-ls-them",
  [HANH_DONG.SUA_NHIEM_VU]: "nvk-ls-sua",
  [HANH_DONG.DOI_VAI_TRO]: "nvk-ls-sua",
  [HANH_DONG.XOA_NHIEM_VU]: "nvk-ls-xoa",
  [HANH_DONG.GO_PHAN_CONG]: "nvk-ls-xoa",
  [HANH_DONG.CHOT_KY]: "nvk-ls-chot",
  [HANH_DONG.MO_LAI_KY]: "nvk-ls-chot",
  [HANH_DONG.XU_LY_PHAN_HOI]: "nvk-ls-phan-hoi",
};

/**
 * Tab "Nhật ký" — mọi thay đổi vai trò, điểm và thao tác chốt kỳ.
 *
 * Nhật ký được ghi trong CÙNG transaction với thao tác nên đây là bản ghi đáng
 * tin để đối chiếu khi có tranh chấp về vai trò. Dòng `HanhDong = 5` mang đủ
 * VaiTroTruoc/Sau và DiemTruoc/Sau nên hiển thị được thành "A (10đ) → B (4đ)".
 */
const NvkPanelLichSu = ({ idNam, idDonVi, onError }) => {
  const [danhSach, setDanhSach] = useState([]);
  const [dangTai, setDangTai] = useState(true);

  const tai = useCallback(async () => {
    if (!idNam || !idDonVi) return;
    setDangTai(true);
    try {
      setDanhSach(await layLichSuKy({ idNam, idDonVi }));
    } catch (error) {
      console.error("Lỗi tải nhật ký kỳ nhiệm vụ:", error);
      onError(error.message);
      setDanhSach([]);
    }
    setDangTai(false);
  }, [idNam, idDonVi, onError]);

  useEffect(() => {
    tai();
  }, [tai]);

  const renderChiTiet = (ls) => {
    if (ls.HanhDong === HANH_DONG.DOI_VAI_TRO) {
      return (
        <span className="nvk-ls-doi">
          {ls.VaiTroTruoc ?? "—"} ({formatDiem(ls.DiemTruoc, 1)}đ)
          <i className="fa-solid fa-arrow-right"></i>
          {ls.VaiTroSau ?? "—"} ({formatDiem(ls.DiemSau, 1)}đ)
        </span>
      );
    }
    if (ls.MoTa) return ls.MoTa;
    if (ls.VaiTroSau) {
      return `${ls.VaiTroSau} (${formatDiem(ls.DiemSau, 1)}đ)`;
    }
    return <span className="nvk-trong">—</span>;
  };

  return (
    <div style={{ opacity: dangTai ? 0.55 : 1, transition: "opacity 0.15s ease" }}>
      <div className="modern-table-card">
        {danhSach.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-clock-rotate-left"></i>
            Kỳ này chưa phát sinh thao tác nào.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="custom-table nvk-ls-bang">
              <thead>
                <tr>
                  <th style={{ width: "140px" }}>Thời gian</th>
                  <th style={{ width: "150px" }}>Hành động</th>
                  <th>Nhiệm vụ</th>
                  <th style={{ width: "160px" }}>Giảng viên</th>
                  <th style={{ width: "240px" }}>Chi tiết</th>
                  <th style={{ width: "150px" }}>Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {danhSach.map((ls) => (
                  <tr key={ls.Id}>
                    <td>{formatNgayGio(ls.NgayThucHien)}</td>
                    <td>
                      <span
                        className={`tag-badge ${MAU_HANH_DONG[ls.HanhDong] || ""}`}
                      >
                        {TEN_HANH_DONG[ls.HanhDong] || `Hành động ${ls.HanhDong}`}
                      </span>
                    </td>
                    <td>{ls.TenNhiemVu || <span className="nvk-trong">—</span>}</td>
                    <td>
                      {ls.HoTenNhanVien || <span className="nvk-trong">—</span>}
                    </td>
                    <td>{renderChiTiet(ls)}</td>
                    <td>{ls.HoTenNguoiThucHien || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default NvkPanelLichSu;
