import React, { useCallback, useEffect, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import { formatNgayGio } from "../../utils/phieuApi";
import {
  fetchToTrinhDetail,
  fetchToTrinhList,
  htDuyetToTrinh,
  htTraLaiToTrinh,
  TEN_HANH_DONG_TO_TRINH,
  TRANG_THAI_TO_TRINH,
} from "../../utils/toTrinhApi";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import SearchSelect from "../../components/Common/SearchSelect";
import BangHoSoToTrinh from "../../components/QuanLyChamDiem/BangHoSoToTrinh";
import LyDoModal from "../../components/QuanLyChamDiem/LyDoModal";
import { TrangThaiToTrinhBadge } from "../../components/QuanLyChamDiem/TrangThaiBadge";

/**
 * Giai đoạn 4 phía Hiệu trưởng - HÀNG ĐỢI HÀNH ĐỘNG THẬT của cấp Trường.
 *
 * Hiệu trưởng không còn duyệt/chốt từng phiếu lẻ: đơn vị thao tác là cả gói KPI
 * của một Khoa. Ba endpoint duyệt phiếu lẻ của luồng cũ đã bị gỡ.
 *
 * Hai hành động ở đây bất đối xứng, đừng nhầm:
 *  - "Duyệt gói" áp cho TOÀN BỘ hồ sơ: gói 3 → 4 và mọi phiếu 4 → 5 HOÀN TẤT.
 *    Đây là bước cuối của cả quy trình và không hoàn tác được.
 *  - "Trả lại" áp cho một DANH SÁCH hồ sơ được chọn: những phiếu đó 4 → 3, các
 *    phiếu còn lại giữ nguyên ở 4, gói chuyển sang 5 để Trưởng khoa xử lý rồi
 *    đóng gói và trình lại.
 */
const DuyetToTrinh = () => {
  const toast = useRef(null);
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [locTrangThai, setLocTrangThai] = useState(
    TRANG_THAI_TO_TRINH.DA_TRINH,
  );
  const [danhSach, setDanhSach] = useState([]);
  const [idToTrinh, setIdToTrinh] = useState(null);
  const [goi, setGoi] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dangXuLy, setDangXuLy] = useState(false);

  const [chonTraVe, setChonTraVe] = useState([]);
  const [moDuyet, setMoDuyet] = useState(false);
  const [moTraVe, setMoTraVe] = useState(false);

  const showToast = (severity, summary, detail, life = 4000) => {
    toast.current?.show({ severity, summary, detail, life });
  };

  const taiDanhSach = useCallback(async () => {
    if (!selectedNam) return;
    try {
      const items = await fetchToTrinhList({
        idNam: selectedNam,
        trangThai: locTrangThai,
      });
      setDanhSach(items);
      setIdToTrinh((truoc) =>
        truoc && items.some((t) => t.IdToTrinh === truoc)
          ? truoc
          : (items[0]?.IdToTrinh ?? null),
      );
    } catch (error) {
      console.error("Lỗi tải danh sách tờ trình:", error);
      showToast("error", "Lỗi", error.message);
      setDanhSach([]);
      setIdToTrinh(null);
    }
  }, [selectedNam, locTrangThai]);

  useEffect(() => {
    if (!dangTaiNam) taiDanhSach();
  }, [dangTaiNam, taiDanhSach]);

  const taiChiTiet = useCallback(
    async ({ imLang = false } = {}) => {
      if (!idToTrinh) {
        setGoi(null);
        setIsLoading(false);
        return;
      }
      if (!imLang) setIsLoading(true);
      try {
        setGoi(await fetchToTrinhDetail(idToTrinh));
        setChonTraVe([]);
      } catch (error) {
        console.error("Lỗi tải chi tiết tờ trình:", error);
        showToast("error", "Lỗi", error.message);
        setGoi(null);
      } finally {
        setIsLoading(false);
      }
    },
    [idToTrinh],
  );

  useEffect(() => {
    taiChiTiet();
  }, [taiChiTiet]);

  const choDuyet = goi?.TrangThai === TRANG_THAI_TO_TRINH.DA_TRINH;

  const handleDuyet = async ({ lyDo }) => {
    setMoDuyet(false);
    setDangXuLy(true);
    try {
      const item = await htDuyetToTrinh(goi.IdToTrinh, {
        nhanXet: lyDo,
        rowVersion: goi.RowVersion,
      });
      await Promise.all([taiChiTiet({ imLang: true }), taiDanhSach()]);
      showToast(
        "success",
        "Đã duyệt gói KPI",
        `Toàn bộ hồ sơ của ${goi.TenDonVi} đã chuyển sang HOÀN TẤT (${item?.SoDatXuatSac ?? 0} người đạt xuất sắc). Kết quả nay chỉ đọc.`,
        8000,
      );
    } catch (error) {
      console.error("Lỗi duyệt gói KPI:", error);
      if (error.isConflict) await taiChiTiet({ imLang: true });
      showToast("error", "Không duyệt được", error.message, 7000);
    } finally {
      setDangXuLy(false);
    }
  };

  const handleTraVe = async ({ lyDo }) => {
    setMoTraVe(false);
    setDangXuLy(true);
    try {
      const { hoSo } = await htTraLaiToTrinh(goi.IdToTrinh, {
        idPhieuList: chonTraVe,
        lyDo,
        rowVersion: goi.RowVersion,
      });
      await Promise.all([taiChiTiet({ imLang: true }), taiDanhSach()]);
      showToast(
        "success",
        "Đã trả lại hồ sơ",
        `${hoSo.length} hồ sơ đã quay về cho Trưởng khoa xử lý. Các hồ sơ còn lại trong gói giữ nguyên.`,
        7000,
      );
    } catch (error) {
      console.error("Lỗi trả lại hồ sơ:", error);
      if (error.isConflict) await taiChiTiet({ imLang: true });
      showToast("error", "Không trả lại được", error.message, 7000);
    } finally {
      setDangXuLy(false);
    }
  };

  const doiChon = (idPhieu) =>
    setChonTraVe((truoc) =>
      truoc.includes(idPhieu)
        ? truoc.filter((x) => x !== idPhieu)
        : [...truoc, idPhieu],
    );

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2
          style={{
            margin: 0,
            color: "#1e293b",
            fontSize: "22px",
            fontWeight: 700,
          }}
        >
          Duyệt tờ trình KPI
        </h2>
        <span className="breadcrumb">
          Phê duyệt hoặc trả lại gói KPI của từng Khoa - duyệt gói là bước cuối
          cùng của quy trình đánh giá
        </span>
      </div>

      <div className="cd-toolbar">
        <div className="cd-field">
          <label className="cd-label">Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={(v) => setSelectedNam(v)}
            options={namList.map((n) => ({
              value: n.IdNam,
              label: `Năm học ${n.IdNam}`,
            }))}
            disabled={dangTaiNam}
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Trạng thái gói</label>
          <SearchSelect
            value={locTrangThai}
            onChange={(v) => setLocTrangThai(Number(v))}
            options={[
              { value: TRANG_THAI_TO_TRINH.DA_TRINH, label: "Chờ tôi duyệt" },
              { value: TRANG_THAI_TO_TRINH.HT_DA_DUYET, label: "Đã duyệt" },
              { value: TRANG_THAI_TO_TRINH.HT_TRA_VE, label: "Đã trả về Khoa" },
              {
                value: TRANG_THAI_TO_TRINH.DA_DONG_GOI,
                label: "Khoa đã đóng gói, chưa trình",
              },
            ]}
          />
        </div>

        <div className="cd-field" style={{ flex: "2 1 260px" }}>
          <label className="cd-label">Khoa</label>
          <SearchSelect
            value={idToTrinh}
            onChange={(v) => setIdToTrinh(Number(v))}
            options={danhSach.map((t) => ({
              value: t.IdToTrinh,
              label: `${t.TenDonVi} - ${t.SoHoSo ?? 0} hồ sơ, ${t.SoDatXuatSac ?? 0}/${t.HanNgachXuatSac ?? 0} suất xuất sắc`,
            }))}
            placeholder="Không có gói nào ở trạng thái này"
            disabled={danhSach.length === 0}
          />
        </div>

        <button
          className="btn-cancel"
          onClick={() => taiChiTiet()}
          disabled={isLoading || dangXuLy}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải gói KPI...
          </div>
        </div>
      ) : !goi ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-mug-hot"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không có gói KPI nào
            </h3>
            <p style={{ margin: 0 }}>
              Gói chỉ tới bàn Hiệu trưởng khi Trưởng khoa đã chốt đủ 100% hồ sơ,
              đóng gói và bấm trình.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="cd-phieu-header">
            <div className="cd-phieu-top">
              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  {goi.TenDonVi}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginTop: "4px",
                  }}
                >
                  {goi.MaDonVi && (
                    <span className="code-pill" style={{ marginRight: "8px" }}>
                      {goi.MaDonVi}
                    </span>
                  )}
                  Năm học {goi.IdNam}
                  {goi.LanTrinh > 0
                    ? ` · Khoa đã trình ${goi.LanTrinh} lần`
                    : ""}
                </div>
              </div>
              <TrangThaiToTrinhBadge trangThai={goi.TrangThai} />
            </div>

            <div className="cd-meta-grid">
              <div>
                <div className="cd-meta-label">Tổng hồ sơ</div>
                <div className="cd-meta-value">{goi.SoHoSo ?? 0}</div>
              </div>
              <div>
                <div className="cd-meta-label">Giảng viên (mẫu số)</div>
                <div className="cd-meta-value">{goi.SoGiangVien ?? "-"}</div>
              </div>
              <div>
                <div className="cd-meta-label">Tỷ lệ áp dụng</div>
                <div className="cd-meta-value">
                  {goi.TyLeXuatSac != null
                    ? `${(goi.TyLeXuatSac * 100).toFixed(0)}%`
                    : "-"}
                </div>
              </div>
              <div>
                <div className="cd-meta-label">Hạn ngạch xuất sắc</div>
                <div className="cd-meta-value" style={{ color: "#1d4ed8" }}>
                  {goi.HanNgachXuatSac ?? "-"} suất
                </div>
              </div>
              <div>
                <div className="cd-meta-label">Đã đạt xuất sắc</div>
                <div className="cd-meta-value">{goi.SoDatXuatSac ?? "-"}</div>
              </div>
              <div>
                <div className="cd-meta-label">Khoa trình lúc</div>
                <div className="cd-meta-value">
                  {formatNgayGio(goi.NgayTrinh)}
                </div>
              </div>
            </div>

            {/* Dữ liệu trước khi có hạn ngạch có thể vượt trần - là sự thật lịch
                sử, không phải lỗi dữ liệu. Chú thích để người duyệt khỏi hoang mang. */}
            {goi.SoDatXuatSac > goi.HanNgachXuatSac && (
              <div className="cd-canh-bao" style={{ marginTop: "16px" }}>
                <i className="fa-solid fa-circle-info"></i>
                <span>
                  Số người xuất sắc ({goi.SoDatXuatSac}) vượt hạn ngạch (
                  {goi.HanNgachXuatSac}). Điều này chỉ xảy ra với dữ liệu của
                  các năm trước khi áp dụng hạn ngạch - hãy đối chiếu lại nếu
                  đây là gói mới.
                </span>
              </div>
            )}
          </div>

          {choDuyet && (
            <div
              className="modern-table-card"
              style={{ padding: "20px", marginBottom: "20px" }}
            >
              <p className="sub-title" style={{ marginTop: 0 }}>
                QUYẾT ĐỊNH CỦA HIỆU TRƯỞNG
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  className="btn-submit"
                  disabled={dangXuLy}
                  onClick={() => setMoDuyet(true)}
                >
                  <i className="fa-solid fa-stamp"></i> Duyệt cả gói
                </button>
                <button
                  className="cd-btn-tra-ve"
                  disabled={dangXuLy || chonTraVe.length === 0}
                  onClick={() => setMoTraVe(true)}
                >
                  <i className="fa-solid fa-rotate-left"></i> Trả lại{" "}
                  {chonTraVe.length} hồ sơ đã chọn
                </button>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Tick vào các hồ sơ cần Khoa xem lại ở bảng bên dưới, hoặc
                  duyệt cả gói nếu không có vấn đề gì.
                </span>
              </div>
            </div>
          )}

          <p className="sub-title" style={{ marginBottom: "12px" }}>
            HỒ SƠ TRONG GÓI ({goi.HoSo?.length ?? 0})
          </p>

          <div className="modern-table-card">
            <BangHoSoToTrinh
              hoSo={goi.HoSo || []}
              hanNgach={goi.HanNgachXuatSac ?? null}
              chonDuoc={choDuyet}
              daChon={chonTraVe}
              onDoiChon={doiChon}
              ghiChuCot="Ghi chú"
            />
          </div>

          {goi.LichSu?.length > 0 && (
            <>
              <p
                className="sub-title"
                style={{ marginBottom: "12px", marginTop: "20px" }}
              >
                NHẬT KÝ GÓI
              </p>
              <div className="modern-table-card">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: "22%" }}>Thời điểm</th>
                      <th style={{ width: "24%" }}>Hành động</th>
                      <th style={{ width: "22%" }}>Người thực hiện</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goi.LichSu.map((ls) => (
                      <tr key={ls.Id}>
                        <td style={{ fontSize: "13px" }}>
                          {formatNgayGio(ls.NgayThucHien)}
                        </td>
                        <td style={{ fontSize: "13px" }}>
                          {TEN_HANH_DONG_TO_TRINH[ls.HanhDong] ||
                            `Hành động ${ls.HanhDong}`}
                          {ls.SoHoSoTraVe ? ` (${ls.SoHoSoTraVe} hồ sơ)` : ""}
                        </td>
                        <td style={{ fontSize: "13px" }}>
                          {ls.TenNguoiThucHien || "-"}
                        </td>
                        <td style={{ fontSize: "13px", color: "#64748b" }}>
                          {ls.LyDo || ls.NhanXet || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {moDuyet && (
        <LyDoModal
          tieuDe="Duyệt gói KPI Khoa"
          moTa={`Toàn bộ ${goi?.SoHoSo ?? 0} hồ sơ của ${goi?.TenDonVi} sẽ chuyển sang HOÀN TẤT và trở thành chỉ đọc.`}
          canhBao="Đây là bước cuối cùng của quy trình đánh giá và không hoàn tác được. Sau khi duyệt, muốn sửa một hồ sơ thì phải mở lại từng phiếu riêng lẻ."
          nhanLyDo="Nhận xét phê duyệt"
          goiYLyDo="VD: Phê duyệt kết quả KPI Khoa CNTT năm học 2025-2026."
          batBuocLyDo={false}
          nhanXacNhan="Duyệt cả gói"
          iconXacNhan="fa-stamp"
          dangGui={dangXuLy}
          onDong={() => setMoDuyet(false)}
          onXacNhan={handleDuyet}
        />
      )}

      {moTraVe && (
        <LyDoModal
          tieuDe={`Trả lại ${chonTraVe.length} hồ sơ cho Trưởng khoa`}
          moTa="Các hồ sơ được chọn quay về bước Trưởng khoa chốt; những hồ sơ còn lại trong gói giữ nguyên. Mức xếp loại Khoa đã chọn được giữ nguyên để Trưởng khoa thấy và sửa."
          nhanLyDo="Lý do trả lại"
          goiYLyDo="VD: Đề nghị Khoa rà lại xếp loại 2 trường hợp: điểm NCKH chưa khớp minh chứng."
          nhanXacNhan="Trả lại hồ sơ"
          dangGui={dangXuLy}
          onDong={() => setMoTraVe(false)}
          onXacNhan={handleTraVe}
        >
          <div className="cd-box" style={{ marginBottom: "15px" }}>
            <div className="cd-box-title">Hồ sơ được chọn</div>
            <ul
              style={{
                margin: 0,
                paddingLeft: "18px",
                fontSize: "13px",
                color: "#334155",
              }}
            >
              {(goi?.HoSo || [])
                .filter((h) => chonTraVe.includes(h.IdPhieu))
                .map((h) => (
                  <li key={h.IdPhieu}>{h.HoTen}</li>
                ))}
            </ul>
          </div>
        </LyDoModal>
      )}
    </div>
  );
};

export default DuyetToTrinh;
