import React, { useCallback, useEffect, useState } from "react";
import { formatDiem } from "../../utils/phieuApi";
import {
  capNhatKy,
  canDuyetKy,
  laKyDaChot,
  layTongHop,
  taiExcelTongHop,
} from "../../utils/nhiemVuKhoaApi";

/** Điểm tổng hợp chỉ gồm nhiệm vụ đã duyệt; giữ mở lại kỳ cũ cho Trưởng khoa. */
const NvkPanelTongHop = ({
  idNam,
  idDonVi,
  ky,
  revision,
  onLamMoiKy,
  onError,
  onSuccess,
}) => {
  const [duLieu, setDuLieu] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [lyDoMoLai, setLyDoMoLai] = useState("");
  const daChot = laKyDaChot(ky);
  const tai = useCallback(async () => {
    if (!idNam || !idDonVi) return;
    setDangTai(true);
    try {
      setDuLieu(await layTongHop({ idNam, idDonVi }));
    } catch (error) {
      setDuLieu(null);
      onError(error.message);
    } finally {
      setDangTai(false);
    }
  }, [idNam, idDonVi, onError]);
  useEffect(() => {
    tai();
  }, [tai, revision]);

  const xuatExcel = async () => {
    try {
      await taiExcelTongHop({
        idNam,
        idDonVi,
        maDonVi: duLieu?.Header?.MaDonVi,
      });
    } catch (error) {
      console.error("Lỗi xuất Excel tổng hợp:", error);
      onError(error.message);
    }
  };

  const moLai = async () => {
    if (!lyDoMoLai.trim()) {
      onError("Mở lại kỳ bắt buộc phải có lý do");
      return;
    }
    setDangXuLy(true);
    try {
      await capNhatKy({ idNam, idDonVi, moLai: true, lyDo: lyDoMoLai });
      onSuccess("Đã mở lại kỳ");
      setLyDoMoLai("");
      onLamMoiKy();
      tai();
    } catch (error) {
      console.error("Lỗi mở lại kỳ:", error);
      onError(error.message);
    }
    setDangXuLy(false);
  };

  const header = duLieu?.Header;
  const rows = duLieu?.Items || [];
  const nhom = duLieu?.Nhom || [];

  return (
    <div
      style={{ opacity: dangTai ? 0.55 : 1, transition: "opacity 0.15s ease" }}
    >
      <div className="nvk-th-actions">
        <p className="sub-title" style={{ margin: 0 }}>
          BẢNG TỔNG HỢP NHIỆM VỤ ĐÃ DUYỆT
        </p>
        <button
          type="button"
          className="btn-cancel"
          onClick={xuatExcel}
          disabled={rows.length === 0}
        >
          <i className="fa-solid fa-file-excel"></i> Xuất Excel
        </button>
      </div>

      <p className="cd-hint">
        {header?.SoChoDuyet ?? "—"} chờ duyệt · {header?.SoTraVe ?? "—"} trả về
        · {header?.SoDaDuyet ?? "—"} đã duyệt. Điểm chờ duyệt được hiển thị
        riêng và chưa tính vào KPI.
      </p>
      <div className="modern-table-card" style={{ marginBottom: "20px" }}>
        {rows.length === 0 ? (
          <div className="cd-empty">
            <i className="fa-solid fa-table"></i>
            Chưa có giảng viên nào trong danh sách của Khoa.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="custom-table nvk-th-bang">
              <thead>
                <tr>
                  <th style={{ width: "46px" }}>STT</th>
                  <th>Giảng viên</th>
                  {/* Cột động: duyệt Nhom (đã sắp theo ThuTu) rồi tra map
                      SoNhiemVuTheoNhom, mặc định 0. Tên nhóm quá dài để làm tiêu
                      đề cột nên rút thành số thứ tự, chú giải đặt dưới bảng. */}
                  {nhom.map((n, i) => (
                    <th
                      key={n.IdNhomNv}
                      title={n.TenNhom}
                      style={{ width: "56px", textAlign: "center" }}
                    >
                      N{i + 1}
                    </th>
                  ))}
                  <th style={{ width: "60px", textAlign: "center" }}>CT</th>
                  <th style={{ width: "60px", textAlign: "center" }}>PHC</th>
                  <th style={{ width: "60px", textAlign: "center" }}>PH</th>
                  <th style={{ width: "100px", textAlign: "right" }}>
                    Điểm thực tế
                  </th>
                  <th style={{ width: "110px", textAlign: "right" }}>
                    Điểm quy đổi
                  </th>
                  <th>Chờ duyệt (chưa tính)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.IdNhanVien}
                    className={r.VuotTran ? "nvk-th-vuot" : ""}
                  >
                    <td>{i + 1}</td>
                    <td>
                      <div className="nvk-ql-ten">{r.HoTen}</div>
                      <div className="nvk-ql-mo-ta">
                        {r.MaNhanVien}
                        {r.SoNhiemVu === 0
                          ? " · chưa có nhiệm vụ đã duyệt"
                          : ""}
                      </div>
                    </td>
                    {nhom.map((n) => (
                      <td key={n.IdNhomNv} style={{ textAlign: "center" }}>
                        {r.SoNhiemVuTheoNhom?.[n.IdNhomNv] ?? 0}
                      </td>
                    ))}
                    <td style={{ textAlign: "center" }}>{r.SoChuTri}</td>
                    <td style={{ textAlign: "center" }}>{r.SoPhoiHopChinh}</td>
                    <td style={{ textAlign: "center" }}>{r.SoPhoiHop}</td>
                    <td
                      style={{ textAlign: "right" }}
                      title={
                        r.VuotTran
                          ? `Vượt trần ${formatDiem(header?.TranDiem, 1)}đ - báo cáo dùng điểm quy đổi`
                          : undefined
                      }
                    >
                      {formatDiem(r.TongDiemThucTe, 1)}
                      {r.VuotTran && (
                        <i
                          className="fa-solid fa-triangle-exclamation"
                          style={{ marginLeft: "6px", color: "#b45309" }}
                        ></i>
                      )}
                    </td>
                    <td className="nvk-th-quy-doi">
                      {formatDiem(r.TongDiemQuyDoi, 1)}
                    </td>
                    <td>
                      <div>{r.SoNhiemVuChoDuyet ?? "—"} nhiệm vụ</div>
                      <div className="nvk-pending-points">
                        +{formatDiem(r.TongDiemChoDuyet, 1)} điểm chờ duyệt
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {nhom.length > 0 && (
        <div className="nvk-th-chu-giai">
          {nhom.map((n, i) => (
            <span key={n.IdNhomNv}>
              <b>N{i + 1}</b> {n.TenNhom}
            </span>
          ))}
        </div>
      )}

      {daChot && (
        <div className="cd-box">
          <p>
            Kỳ đã chốt theo luồng cũ. Cần mở lại kỳ để kê khai và xét từng nhiệm
            vụ.
          </p>
          {canDuyetKy(ky) && (
            <>
              <label htmlFor="nvk-mo-ky">Lý do mở lại kỳ (bắt buộc)</label>
              <textarea
                id="nvk-mo-ky"
                className="form-input"
                maxLength={1000}
                value={lyDoMoLai}
                onChange={(e) => setLyDoMoLai(e.target.value)}
                disabled={dangXuLy}
              />
              <button
                className="btn-submit"
                onClick={moLai}
                disabled={dangXuLy}
              >
                Mở lại kỳ cũ
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
export default NvkPanelTongHop;
