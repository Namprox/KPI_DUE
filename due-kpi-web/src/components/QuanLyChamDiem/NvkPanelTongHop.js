import React, { useCallback, useEffect, useState } from "react";
import { formatDiem, formatNgay } from "../../utils/phieuApi";
import {
  capNhatKy,
  chotKy,
  coTheChot,
  kiemTraChot,
  laKyDaChot,
  layTongHop,
  LOAI_VAN_DE,
  taiExcelTongHop,
} from "../../utils/nhiemVuKhoaApi";

/** Ngày thuần từ API ("2026-12-31T00:00:00") → giá trị cho <input type="date">. */
const sangInputDate = (value) => (value ? String(value).slice(0, 10) : "");

/**
 * Tab "Tổng hợp & chốt kỳ".
 *
 * Ba khối theo đúng thứ tự người dùng cần: xem số liệu → soát vấn đề → chốt.
 *
 * Hai điểm nghiệp vụ dễ làm sai được xử lý ở đây:
 *  - **Luôn hiển thị cả hai cột điểm.** `TongDiemQuyDoi` = MIN(thực tế, trần) là
 *    con số dùng để báo cáo; `TongDiemThucTe` để người ký thấy ai bị cắt bao
 *    nhiêu. Vượt trần chỉ tô cảnh báo, KHÔNG chặn chốt.
 *  - **Server tự kiểm tra lại điều kiện khi chốt**, không tin kết quả màn hình
 *    kiểm tra mà client vừa xem - nên vẫn phải xử lý 422 CHOT_KHONG_HOP_LE vì
 *    dữ liệu có thể đổi giữa hai lần gọi.
 */
const NvkPanelTongHop = ({
  idNam,
  idDonVi,
  ky,
  choPhepSua,
  onMoNhiemVu,
  onSangPhanHoi,
  onLamMoiKy,
  onError,
  onSuccess,
}) => {
  const [duLieu, setDuLieu] = useState(null);
  const [kiemTra, setKiemTra] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);

  const [hanPhanHoi, setHanPhanHoi] = useState("");
  const [ghiChuChot, setGhiChuChot] = useState("");
  const [lyDoMoLai, setLyDoMoLai] = useState("");

  const daChot = laKyDaChot(ky);
  const duocChot = coTheChot(ky);

  const tai = useCallback(async () => {
    if (!idNam || !idDonVi) return;
    setDangTai(true);
    try {
      const [th, kt] = await Promise.all([
        layTongHop({ idNam, idDonVi }),
        kiemTraChot({ idNam, idDonVi }).catch((error) => {
          // Kỳ chưa mở thì endpoint này trả 404 - bảng tổng hợp vẫn xem được
          if (error.status === 404) return null;
          throw error;
        }),
      ]);
      setDuLieu(th);
      setKiemTra(kt);
    } catch (error) {
      console.error("Lỗi tải bảng tổng hợp:", error);
      onError(error.message);
    }
    setDangTai(false);
  }, [idNam, idDonVi, onError]);

  useEffect(() => {
    tai();
  }, [tai]);

  useEffect(() => {
    setHanPhanHoi(sangInputDate(ky?.HanPhanHoi));
  }, [ky]);

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

  const luuHan = async (xoa) => {
    setDangXuLy(true);
    try {
      await capNhatKy({
        idNam,
        idDonVi,
        hanPhanHoi: xoa ? null : hanPhanHoi || null,
        xoaHan: xoa,
      });
      onSuccess(xoa ? "Đã gỡ hạn phản hồi" : "Đã cập nhật hạn phản hồi");
      onLamMoiKy();
    } catch (error) {
      console.error("Lỗi cập nhật hạn phản hồi:", error);
      onError(error.message);
    }
    setDangXuLy(false);
  };

  const chot = async () => {
    setDangXuLy(true);
    try {
      await chotKy({ idNam, idDonVi, ghiChu: ghiChuChot });
      onSuccess("Đã chốt kỳ nhiệm vụ");
      setGhiChuChot("");
      onLamMoiKy();
      tai();
    } catch (error) {
      console.error("Lỗi chốt kỳ:", error);
      onError(error.message);
      // 422 nghĩa là dữ liệu đã đổi sau lần kiểm tra vừa rồi - soát lại ngay
      if (error.status === 422) tai();
    }
    setDangXuLy(false);
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

  const vanDe = kiemTra?.VanDe || [];
  const vanDeChan = vanDe.filter((v) => v.LaChan);
  const canhBao = vanDe.filter((v) => !v.LaChan);

  const dieuHuongVanDe = (v) => {
    if (v.LoaiVanDe === LOAI_VAN_DE.PHAN_HOI_CHUA_XU_LY) return onSangPhanHoi();
    if (v.IdNhiemVuKhoa) return onMoNhiemVu(v.IdNhiemVuKhoa);
    return undefined;
  };

  const coDieuHuong = (v) =>
    v.LoaiVanDe === LOAI_VAN_DE.PHAN_HOI_CHUA_XU_LY || !!v.IdNhiemVuKhoa;

  return (
    <div
      style={{ opacity: dangTai ? 0.55 : 1, transition: "opacity 0.15s ease" }}
    >
      <div className="nvk-th-actions">
        <p className="sub-title" style={{ margin: 0 }}>
          BẢNG TỔNG HỢP TOÀN KHOA
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
                        {r.SoNhiemVu === 0 ? " · chưa được phân công" : ""}
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

      <p className="sub-title" style={{ margin: "24px 0 10px 0" }}>
        KIỂM TRA TRƯỚC KHI CHỐT
      </p>

      {!kiemTra ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-circle-info"></i>
            Kỳ chưa được mở nên chưa kiểm tra được điều kiện chốt.
          </div>
        </div>
      ) : (
        <div className="nvk-chot-box">
          {vanDeChan.length === 0 && canhBao.length === 0 ? (
            <div className="nvk-vd-ok">
              <i className="fa-solid fa-circle-check"></i> Không còn vấn đề nào
              - kỳ đã sẵn sàng để chốt.
            </div>
          ) : (
            <>
              {vanDeChan.length > 0 && (
                <div className="nvk-vd-nhom">
                  <div className="nvk-vd-tieu-de nvk-vd-chan">
                    <i className="fa-solid fa-circle-xmark"></i> Cần xử lý (
                    {vanDeChan.length}) - chặn chốt kỳ
                  </div>
                  {vanDeChan.map((v, i) => (
                    <div key={`chan-${i}`} className="nvk-vd-dong">
                      <span className="nvk-vd-noi-dung">
                        {v.TenNhiemVu || v.HoTen ? (
                          <b>{v.TenNhiemVu || v.HoTen}: </b>
                        ) : null}
                        {v.MoTa}
                      </span>
                      {coDieuHuong(v) && (
                        <button
                          type="button"
                          className="cd-link-btn"
                          onClick={() => dieuHuongVanDe(v)}
                        >
                          <i className="fa-solid fa-arrow-right"></i> Xử lý
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canhBao.length > 0 && (
                <div className="nvk-vd-nhom">
                  <div className="nvk-vd-tieu-de nvk-vd-luu-y">
                    <i className="fa-solid fa-circle-exclamation"></i> Lưu ý (
                    {canhBao.length}) - không chặn chốt
                  </div>
                  {canhBao.map((v, i) => (
                    <div key={`luuy-${i}`} className="nvk-vd-dong">
                      <span className="nvk-vd-noi-dung">
                        {v.HoTen ? <b>{v.HoTen}: </b> : null}
                        {v.MoTa}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="nvk-chot-thao-tac">
            {daChot ? (
              <>
                <div className="nvk-chot-thong-tin">
                  <i className="fa-solid fa-lock"></i> Kỳ đã chốt
                  {ky?.NgayChot ? ` ngày ${formatNgay(ky.NgayChot)}` : ""}
                  {ky?.TenNguoiChot ? ` bởi ${ky.TenNguoiChot}` : ""}.
                  {duocChot
                    ? " Muốn sửa tiếp thì phải mở lại kỳ."
                    : " Chỉ trưởng đơn vị mới mở lại được."}
                </div>
                {duocChot && (
                  <div className="nvk-chot-hang">
                    <input
                      type="text"
                      className="form-input"
                      value={lyDoMoLai}
                      maxLength={1000}
                      placeholder="Lý do mở lại (bắt buộc)"
                      onChange={(e) => setLyDoMoLai(e.target.value)}
                      disabled={dangXuLy}
                    />
                    <button
                      type="button"
                      className="btn-submit"
                      onClick={moLai}
                      disabled={dangXuLy || !lyDoMoLai.trim()}
                    >
                      <i className="fa-solid fa-lock-open"></i> Mở lại kỳ
                    </button>
                  </div>
                )}
              </>
            ) : !duocChot ? (
              <div className="nvk-chot-thong-tin">
                <i className="fa-solid fa-circle-info"></i> Bạn nhập được dữ
                liệu nhưng không có quyền chốt kỳ - thẩm quyền này thuộc trưởng
                đơn vị.
              </div>
            ) : (
              <div className="nvk-chot-hang">
                <input
                  type="text"
                  className="form-input"
                  value={ghiChuChot}
                  maxLength={500}
                  placeholder="Ghi chú khi chốt (tuỳ chọn)"
                  onChange={(e) => setGhiChuChot(e.target.value)}
                  disabled={dangXuLy}
                />
                <button
                  type="button"
                  className="btn-submit"
                  onClick={chot}
                  disabled={dangXuLy || !kiemTra.CoTheChot}
                  title={
                    kiemTra.CoTheChot
                      ? "Chốt kỳ nhiệm vụ"
                      : "Còn vấn đề chặn, chưa chốt được"
                  }
                >
                  <i
                    className={`fa-solid ${dangXuLy ? "fa-spinner fa-spin" : "fa-lock"}`}
                  ></i>{" "}
                  Chốt kỳ
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {choPhepSua && (
        <>
          <p className="sub-title" style={{ margin: "24px 0 10px 0" }}>
            HẠN PHẢN HỒI
          </p>
          <div className="nvk-chot-box">
            <div className="cd-hint" style={{ marginTop: 0 }}>
              Hết hạn KHÔNG khoá gì - đây chỉ là mốc nhắc việc, giảng viên không
              lên tiếng thì hiểu là đồng ý với phân công.
            </div>
            <div className="nvk-chot-hang">
              <input
                type="date"
                className="form-input nvk-o-ngay"
                value={hanPhanHoi}
                onChange={(e) => setHanPhanHoi(e.target.value)}
                disabled={dangXuLy}
              />
              <button
                type="button"
                className="btn-submit"
                onClick={() => luuHan(false)}
                disabled={dangXuLy || !hanPhanHoi}
              >
                <i className="fa-solid fa-floppy-disk"></i> Lưu hạn
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => luuHan(true)}
                disabled={dangXuLy || !ky?.HanPhanHoi}
              >
                <i className="fa-solid fa-eraser"></i> Gỡ hạn
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NvkPanelTongHop;
