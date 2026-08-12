import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import "../../css/CaNhan/NhiemVuKhoaCuaToi.css";
import SearchSelect from "../../components/Common/SearchSelect";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import MinhChungNvkRow from "../../components/Common/MinhChungNvkRow";
import GuiPhanHoiModal from "../../components/CaNhan/GuiPhanHoiModal";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useMinhChungNvkPreview } from "../../hooks/useMinhChungNvkPreview";
import { formatDiem, formatNgayGio } from "../../utils/phieuApi";
import {
  laKyDaChot,
  layNhiemVuCuaToi,
  LOAI_PHAN_HOI,
  TEN_LOAI_PHAN_HOI,
  TRANG_THAI_PHAN_HOI,
  vuotTran,
} from "../../utils/nhiemVuKhoaApi";

/** Một phản hồi giảng viên đã gửi, kèm kết quả xử lý của Khoa. */
const PhanHoiCard = ({ ph, onXem, onTai }) => {
  const daXuLy = Number(ph.TrangThai) === TRANG_THAI_PHAN_HOI.DA_XU_LY;
  const laSaiVaiTro = Number(ph.LoaiPhanHoi) === LOAI_PHAN_HOI.SAI_VAI_TRO;

  return (
    <div className="nvk-ph-card">
      <div className="nvk-ph-head">
        <span className={`tag-badge${laSaiVaiTro ? "" : " nvk-tag-tim"}`}>
          {TEN_LOAI_PHAN_HOI[ph.LoaiPhanHoi] || "Phản hồi"}
        </span>
        <span
          className={`cd-status-badge${daXuLy ? " nvk-badge-xong" : " nvk-badge-cho"}`}
        >
          <i
            className={`fa-solid ${daXuLy ? "fa-circle-check" : "fa-hourglass-half"}`}
          ></i>{" "}
          {daXuLy ? "Đã xử lý" : "Chờ xử lý"}
        </span>
        <span className="nvk-ph-ngay">
          Gửi ngày {formatNgayGio(ph.NgayTao)}
        </span>
      </div>

      {(ph.TenNhiemVu || ph.TenNhom) && (
        <div className="nvk-ph-doi-tuong">
          <i className="fa-solid fa-arrow-turn-up fa-rotate-90"></i>{" "}
          {ph.TenNhiemVu || ph.TenNhom}
        </div>
      )}

      <div className="nvk-ph-noi-dung">{ph.NoiDung}</div>

      {daXuLy && (
        <div className="nvk-ph-xu-ly">
          <b>Khoa đã xử lý</b>
          {ph.TenNguoiXuLy ? ` — ${ph.TenNguoiXuLy}` : ""}
          {ph.NgayXuLy ? `, ${formatNgayGio(ph.NgayXuLy)}` : ""}
          {ph.GhiChuXuLy ? `: ${ph.GhiChuXuLy}` : "."}
        </div>
      )}

      {(ph.MinhChung || []).length > 0 && (
        <div className="nvk-ph-mc">
          {ph.MinhChung.map((mc) => (
            <MinhChungNvkRow
              key={mc.IdMinhChungNvk}
              mc={mc}
              onXem={onXem}
              onTai={onTai}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Phục vụ cộng đồng và các nhiệm vụ khác theo phân công của Khoa — phía GIẢNG VIÊN.
 *
 * Đây là KPI Nhóm III trên phiếu đánh giá giảng viên: tiêu chí "Thực hiện nhiệm
 * vụ theo phân công của Khoa", trần 20 điểm, cộng dồn từ điểm quy đổi của từng
 * vai trò (chủ trì / phối hợp chính / phối hợp).
 *
 * Trang chỉ đọc và chỉ gọi MỘT endpoint: GET /nhiem-vu-khoa/cua-toi. Server suy
 * người dùng từ token nên không cần idDonVi và không cần kiểm tra vai trò ở FE.
 *
 * Ba quy ước nghiệp vụ mà giao diện phải phản ánh đúng, nếu không sẽ gây hiểu lầm:
 *
 *  - **Luôn hiện CẢ HAI con số điểm.** `TongDiemQuyDoi` = MIN(thực tế, trần) là
 *    số đưa vào phiếu KPI; `TongDiemThucTe` để giảng viên thấy mình bị cắt bao
 *    nhiêu. Vượt trần là hợp lệ, chỉ tô cảnh báo chứ không phải lỗi.
 *  - **Hạn phản hồi hết hạn KHÔNG khoá gì** — chỉ là nhãn hiển thị: không lên
 *    tiếng thì hiểu là đồng ý. Chỉ `TrangThai = 2` (đã chốt) mới khoá ghi.
 *  - **Khoa chưa mở kỳ vẫn trả Header với Items rỗng** → hiện thông báo, không
 *    để màn hình trắng.
 *
 * Giảng viên KHÔNG tự kê khai nhiệm vụ: vai trò chủ trì / phối hợp là quan hệ
 * tương đối giữa nhiều người trong cùng một nhiệm vụ nên chỉ Khoa phân định
 * được. Kênh duy nhất của giảng viên là gửi phản hồi.
 */
const NhiemVuKhoaCuaToi = () => {
  const toast = useRef(null);
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [duLieu, setDuLieu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loi, setLoi] = useState("");
  const [formPhanHoi, setFormPhanHoi] = useState(false);

  const showToast = useCallback((severity, summary, detail) => {
    toast.current?.show({ severity, summary, detail, life: 4000 });
  }, []);

  const baoLoi = useCallback(
    (message) => showToast("error", "Lỗi", message),
    [showToast],
  );

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungNvkPreview(baoLoi);

  const taiDuLieu = useCallback(async () => {
    if (!selectedNam) return;

    setIsLoading(true);
    setLoi("");
    try {
      setDuLieu(await layNhiemVuCuaToi(selectedNam));
    } catch (error) {
      console.error("Lỗi tải nhiệm vụ theo phân công của Khoa:", error);
      setDuLieu(null);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [selectedNam]);

  useEffect(() => {
    if (!dangTaiNam) taiDuLieu();
  }, [dangTaiNam, taiDuLieu]);

  const header = duLieu?.Header || null;
  const items = duLieu?.Items || [];
  const phanHoi = duLieu?.PhanHoi || [];

  /**
   * Gom theo nhóm nhiệm vụ (`danh_muc_nhom_nhiem_vu`), sắp bằng `ThuTuNhom` của
   * server. Không tự đặt lại thứ tự 7 nhóm ở FE: đây là danh mục cố định dùng
   * chung với biểu mẫu giấy của Khoa.
   */
  const nhomHienThi = useMemo(() => {
    const map = new Map();
    (duLieu?.Items || []).forEach((it) => {
      const key = it.IdNhomNv;
      if (!map.has(key)) {
        map.set(key, {
          idNhomNv: key,
          tenNhom: it.TenNhom || "Chưa phân nhóm",
          thuTu: it.ThuTuNhom ?? 999,
          dong: [],
        });
      }
      map.get(key).dong.push(it);
    });
    return [...map.values()].sort((a, b) => a.thuTu - b.thuTu);
  }, [duLieu]);

  const daChot = laKyDaChot(header);
  const biCatDiem = vuotTran(header?.TongDiemThucTe, header?.TranDiem);
  const chuaMoKy = !!header && header.IdKy == null;
  const dangTaiLanDau = (isLoading || dangTaiNam) && !duLieu;

  // Khoa chưa mở kỳ thì chưa có gì để phản hồi (endpoint trả 404)
  const coTheGuiPhanHoi = !!header && !chuaMoKy && !daChot;

  const soPhanHoiCho = phanHoi.filter(
    (ph) => Number(ph.TrangThai) === TRANG_THAI_PHAN_HOI.CHO_XU_LY,
  ).length;

  const renderNoiDung = () => {
    if (dangTaiLanDau) {
      return (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải bảng nhiệm vụ...
          </div>
        </div>
      );
    }

    if (loi) {
      return (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không tải được dữ liệu
            </h3>
            <p style={{ margin: 0 }}>{loi}</p>
          </div>
        </div>
      );
    }

    if (!header) return null;

    return (
      <div
        style={{
          opacity: isLoading ? 0.55 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
        <div className="stat-card-grid">
          <div className="stat-card">
            <div className="stat-icon-box stat-icon-green">
              <i className="fa-solid fa-award"></i>
            </div>
            <div>
              <div className="stat-label">Điểm KPI Nhóm III</div>
              <div className="stat-value" style={{ color: "#047857" }}>
                {formatDiem(header.TongDiemQuyDoi, 1)}
                <span className="nvk-stat-phu">
                  {" "}
                  / {formatDiem(header.TranDiem, 1)}
                </span>
              </div>
              <div className="cd-hint" style={{ marginTop: 0 }}>
                điểm quy đổi, đã cắt theo trần
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div
              className={`stat-icon-box ${biCatDiem ? "stat-icon-amber" : "stat-icon-blue"}`}
            >
              <i className="fa-solid fa-calculator"></i>
            </div>
            <div>
              <div className="stat-label">Điểm thực tế</div>
              <div
                className="stat-value"
                style={{ color: biCatDiem ? "#b45309" : undefined }}
              >
                {formatDiem(header.TongDiemThucTe, 1)}
              </div>
              <div className="cd-hint" style={{ marginTop: 0 }}>
                tổng cộng dồn mọi nhiệm vụ
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box stat-icon-purple">
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div>
              <div className="stat-label">Số nhiệm vụ</div>
              <div className="stat-value">
                {header.SoNhiemVu ?? items.length}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box stat-icon-amber">
              <i className="fa-solid fa-comment-dots"></i>
            </div>
            <div>
              <div className="stat-label">Phản hồi đã gửi</div>
              <div className="stat-value">{phanHoi.length}</div>
              {soPhanHoiCho > 0 && (
                <div className="cd-hint" style={{ marginTop: 0 }}>
                  {soPhanHoiCho} phản hồi Khoa chưa xử lý
                </div>
              )}
            </div>
          </div>
        </div>

        {biCatDiem && (
          <div className="cd-hint cd-hint-warn nvk-canh-bao">
            <i className="fa-solid fa-circle-exclamation"></i> Tổng điểm thực tế{" "}
            <b>{formatDiem(header.TongDiemThucTe, 1)}</b> vượt trần{" "}
            <b>{formatDiem(header.TranDiem, 1)}</b> của tiêu chí phục vụ cộng
            đồng, nên điểm đưa vào phiếu KPI được quy đổi về{" "}
            <b>{formatDiem(header.TongDiemQuyDoi, 1)}</b>. Đây là quy định của
            quy chế, không phải lỗi dữ liệu.
          </div>
        )}

        <p className="sub-title" style={{ marginBottom: "10px" }}>
          NHIỆM VỤ KHOA ĐÃ PHÂN CÔNG CHO BẠN
        </p>

        {items.length === 0 ? (
          <div className="modern-table-card">
            <div className="cd-empty">
              <i className="fa-solid fa-clipboard-list"></i>
              <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
                {chuaMoKy
                  ? `Không có nhiệm vụ nào được kê khai của năm ${selectedNam}`
                  : "Không có nhiệm vụ nào được kê khai"}
              </h3>
            </div>
          </div>
        ) : (
          <div className="modern-table-card nvk-bang-card">
            <div style={{ overflowX: "auto" }}>
              <table className="custom-table nvk-bang">
                <thead>
                  <tr>
                    <th>Nhiệm vụ</th>
                    <th style={{ width: "180px" }}>Vai trò</th>
                    <th style={{ width: "90px", textAlign: "right" }}>Điểm</th>
                    <th style={{ width: "320px" }}>Minh chứng của Khoa</th>
                  </tr>
                </thead>

                {nhomHienThi.map((nhom) => (
                  <tbody key={nhom.idNhomNv}>
                    <tr className="nvk-nhom-row">
                      <td colSpan={4}>
                        <i className="fa-solid fa-layer-group"></i>{" "}
                        {nhom.tenNhom}
                        <span className="nvk-nhom-dem">
                          {nhom.dong.length} nhiệm vụ
                        </span>
                      </td>
                    </tr>

                    {nhom.dong.map((nv) => (
                      <tr key={nv.IdPhanCong}>
                        <td>
                          <div className="nvk-ten-nv">{nv.TenNhiemVu}</div>
                          {nv.MoTa && (
                            <div className="nvk-mo-ta">{nv.MoTa}</div>
                          )}
                          {nv.GhiChu && (
                            <div className="nvk-ghi-chu">
                              <i className="fa-solid fa-note-sticky"></i>{" "}
                              {nv.GhiChu}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`tag-badge${nv.LaChuTri ? " nvk-tag-chu-tri" : ""}`}
                          >
                            {nv.TenVaiTroSnapshot || "—"}
                          </span>
                        </td>
                        <td className="nvk-diem">
                          {formatDiem(nv.DiemSnapshot, 1)}
                        </td>
                        <td>
                          {(nv.MinhChung || []).length === 0 ? (
                            <span className="nvk-trong">
                              Khoa chưa đính kèm tệp
                            </span>
                          ) : (
                            nv.MinhChung.map((mc) => (
                              <MinhChungNvkRow
                                key={mc.IdMinhChungNvk}
                                mc={mc}
                                onXem={openPreview}
                                onTai={downloadMinhChung}
                              />
                            ))
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}

                <tfoot>
                  <tr className="nvk-tong-row">
                    <td colSpan={2}>
                      Tổng cộng {items.length} nhiệm vụ — điểm thực tế
                    </td>
                    <td className="nvk-diem">
                      {formatDiem(header.TongDiemThucTe, 1)}
                    </td>
                    <td className="nvk-tong-quy-doi">
                      Quy đổi vào KPI:{" "}
                      <b>{formatDiem(header.TongDiemQuyDoi, 1)}</b> / trần{" "}
                      {formatDiem(header.TranDiem, 1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {phanHoi.length > 0 && (
          <>
            <p className="sub-title" style={{ margin: "24px 0 10px 0" }}>
              PHẢN HỒI BẠN ĐÃ GỬI
            </p>
            <div className="nvk-ph-list">
              {phanHoi.map((ph) => (
                <PhanHoiCard
                  key={ph.IdPhanHoi}
                  ph={ph}
                  onXem={openPreview}
                  onTai={downloadMinhChung}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="page-header">
        <h2 className="nvk-title">Phục vụ cộng đồng và các nhiệm vụ khác</h2>
        <span className="breadcrumb">
          Nhiệm vụ theo phân công của Khoa — điểm KPI Nhóm III trên phiếu đánh
          giá giảng viên
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

        <button
          className="btn-cancel"
          onClick={taiDuLieu}
          disabled={isLoading || dangTaiNam}
        >
          <i className={`fa-solid fa-rotate${isLoading ? " fa-spin" : ""}`}></i>{" "}
          Làm mới
        </button>

        {/* Kỳ đã chốt là khoá ghi TOÀN BỘ, kể cả gửi phản hồi (409 KY_DA_CHOT)
            — ẩn nút thay vì để bấm rồi báo lỗi. */}
        {coTheGuiPhanHoi && (
          <button className="btn-submit" onClick={() => setFormPhanHoi(true)}>
            <i className="fa-solid fa-comment-dots"></i> Gửi phản hồi
          </button>
        )}
      </div>

      {renderNoiDung()}

      <GuiPhanHoiModal
        isOpen={formPhanHoi}
        idNam={selectedNam}
        nhiemVuCuaToi={items}
        onClose={() => setFormPhanHoi(false)}
        onSent={() => {
          setFormPhanHoi(false);
          taiDuLieu();
        }}
        onError={baoLoi}
        onSuccess={(m) => showToast("success", "Đã gửi", m)}
        onWarn={(m) => showToast("warn", "Gửi thành công một phần", m)}
      />

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenHienThi || preview.mc?.TenFileGoc}
        kieu="pdf"
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />
    </div>
  );
};

export default NhiemVuKhoaCuaToi;
