import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "primereact/toast";
import "../../css/Pages.css";
import "../../css/QuanLyChamDiem.css";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { useViPhamMinhChungPreview } from "../../hooks/useViPhamMinhChungPreview";
import SearchSelect from "../../components/Common/SearchSelect";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import { formatDiem, formatNgay } from "../../utils/phieuApi";
import { downloadExcel } from "../../utils/excelUtils";
import {
  TRAN_DIEM_TRU_CA_NHAN,
  fetchViPhamCuaToi,
  nhomTheoNhomViPham,
  sapXepMoiNhat,
  tongHopViPham,
} from "../../utils/viPhamCaNhanApi";

/**
 * Các vi phạm giảng dạy do đơn vị ghi nhận cho CHÍNH người đăng nhập.
 *
 * Trang chỉ đọc: giảng viên không sửa/xóa được ghi nhận của mình (server chỉ cho
 * đơn vị đã lập hoặc Admin), nên ở đây không có nút thao tác nào ngoài xem minh
 * chứng. Phạm vi dữ liệu do TOKEN quyết định — xem chú thích ở viPhamCaNhanApi.js.
 */
const ViPhamCuaToi = () => {
  const toast = useRef(null);
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [danhSach, setDanhSach] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loi, setLoi] = useState("");
  const [filterNhom, setFilterNhom] = useState("");

  const showToast = (severity, summary, detail) =>
    toast.current?.show({ severity, summary, detail, life: 3000 });

  const { preview, openPreview, closePreview, downloadMinhChung } =
    useViPhamMinhChungPreview((message) => showToast("error", "Lỗi", message));

  const taiDuLieu = useCallback(async () => {
    if (!selectedNam) return;

    setIsLoading(true);
    setLoi("");
    try {
      const items = await fetchViPhamCuaToi({ idNam: selectedNam });
      setDanhSach(sapXepMoiNhat(items));
    } catch (error) {
      console.error("Lỗi tải vi phạm cá nhân:", error);
      setDanhSach([]);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [selectedNam]);

  useEffect(() => {
    if (!dangTaiNam) taiDuLieu();
  }, [dangTaiNam, taiDuLieu]);

  // Đổi năm là đổi hẳn tập nhóm vi phạm — giữ bộ lọc cũ sẽ ra bảng trống khó hiểu.
  useEffect(() => {
    setFilterNhom("");
  }, [selectedNam]);

  // Tóm tắt và danh mục nhóm luôn tính trên CẢ NĂM, không theo bộ lọc: điểm trừ
  // đưa vào KPI là con số cả năm, lọc theo nhóm mà tổng cũng đổi thì rất dễ hiểu nhầm.
  const tomTat = useMemo(() => tongHopViPham(danhSach), [danhSach]);
  const theoNhom = useMemo(() => nhomTheoNhomViPham(danhSach), [danhSach]);

  const danhSachHienThi = useMemo(
    () =>
      filterNhom
        ? danhSach.filter((vp) => (vp.TenNhom || "Chưa phân loại") === filterNhom)
        : danhSach,
    [danhSach, filterNhom],
  );

  const xuatExcel = () => {
    if (danhSachHienThi.length === 0) {
      showToast("warn", "Không có dữ liệu", "Chưa có vi phạm nào để xuất.");
      return;
    }

    downloadExcel({
      data: danhSachHienThi.map((vp, i) => ({
        STT: i + 1,
        "Ngày vi phạm": formatNgay(vp.NgayViPham),
        "Nhóm vi phạm": vp.TenNhom || "Chưa phân loại",
        "Loại vi phạm": vp.NoiDung || "",
        "Mô tả": vp.MoTa || "",
        "Điểm trừ": vp.DiemTru != null ? Number(vp.DiemTru) : "",
        "Bị kỷ luật": vp.BiKyLuat ? "Có" : "",
        "Đơn vị ghi nhận": vp.TenDonViGhiNhan || "",
        "Ngày ghi nhận": formatNgay(vp.NgayGhiNhan),
      })),
      fileName: `ViPhamCuaToi_${selectedNam}`,
      sheetName: "Vi pham",
      colWidths: [
        { wch: 6 },
        { wch: 14 },
        { wch: 24 },
        { wch: 36 },
        { wch: 32 },
        { wch: 10 },
        { wch: 12 },
        { wch: 24 },
        { wch: 14 },
      ],
    });
  };

  // Lần tải đầu mới dựng khung chờ; đổi năm thì giữ nội dung cũ và làm mờ, để
  // trang không nháy trắng sau mỗi lần chọn.
  const dangTaiLanDau = (isLoading || dangTaiNam) && danhSach.length === 0 && !loi;

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
          Vi phạm của tôi
        </h2>
        <span className="breadcrumb">
          Các vi phạm giảng dạy do đơn vị ghi nhận và điểm trừ KPI tương ứng
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
          <label className="cd-label">Nhóm vi phạm</label>
          <SearchSelect
            value={filterNhom}
            onChange={(v) => setFilterNhom(v)}
            options={[
              { value: "", label: "Tất cả các nhóm" },
              ...theoNhom.map((n) => ({ value: n.tenNhom, label: n.tenNhom })),
            ]}
            placeholder="Tất cả các nhóm"
            disabled={isLoading || theoNhom.length === 0}
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

        <button
          className="btn-cancel"
          onClick={xuatExcel}
          disabled={isLoading || danhSachHienThi.length === 0}
        >
          <i className="fa-solid fa-file-excel"></i> Xuất Excel
        </button>
      </div>

      {dangTaiLanDau ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải danh sách vi phạm...
          </div>
        </div>
      ) : loi ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-triangle-exclamation"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không tải được dữ liệu
            </h3>
            <p style={{ margin: 0 }}>{loi}</p>
          </div>
        </div>
      ) : danhSach.length === 0 ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i
              className="fa-solid fa-circle-check"
              style={{ color: "#16a34a" }}
            ></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Không có vi phạm nào trong năm {selectedNam}
            </h3>
            <p style={{ margin: 0 }}>
              Vi phạm do đơn vị chủ trì ghi nhận. Nếu bạn cho rằng thiếu hoặc sai
              thông tin, hãy liên hệ Khoa/Phòng đã lập ghi nhận.
            </p>
          </div>
        </div>
      ) : (
        <div
          style={{
            opacity: isLoading ? 0.55 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          <div className="stat-card-grid">
            <div className="stat-card">
              <div
                className="stat-icon-box"
                style={{ background: "#fee2e222", color: "#dc2626" }}
              >
                <i className="fa-solid fa-circle-minus"></i>
              </div>
              <div>
                <div className="stat-label">Điểm trừ tính vào KPI</div>
                <div className="stat-value" style={{ color: "#dc2626" }}>
                  {formatDiem(tomTat.diemTruCaNhan, 2)}
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#94a3b8",
                      fontWeight: 500,
                    }}
                  >
                    {" "}
                    / {TRAN_DIEM_TRU_CA_NHAN}
                  </span>
                </div>
                <div className="cd-hint" style={{ marginTop: 0 }}>
                  tính trên cả năm {selectedNam}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box stat-icon-amber">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <div className="stat-label">Số lần bị ghi nhận</div>
                <div className="stat-value">{tomTat.soViPham}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-box stat-icon-purple">
                <i className="fa-solid fa-gavel"></i>
              </div>
              <div>
                <div className="stat-label">Đã xử lý kỷ luật</div>
                <div className="stat-value">{tomTat.soBiKyLuat}</div>
              </div>
            </div>

          </div>

          {tomTat.chamTran && (
            <div className="cd-hint cd-hint-warn" style={{ marginTop: 0 }}>
              <i className="fa-solid fa-circle-exclamation"></i> Tổng điểm trừ
              trong năm là {formatDiem(tomTat.tongDiemTruTho, 2)}, nhưng mỗi cá
              nhân chỉ bị trừ tối đa {TRAN_DIEM_TRU_CA_NHAN} điểm nên phần vượt
              không cộng thêm.
            </div>
          )}

          {theoNhom.length > 1 && (
            <>
              <p className="sub-title" style={{ marginBottom: "10px" }}>
                ĐIỂM TRỪ THEO NHÓM VI PHẠM
              </p>
              <div
                className="modern-table-card"
                style={{ padding: "18px 20px", marginBottom: "24px" }}
              >
                {theoNhom.map((nhom) => {
                  const tyLe =
                    tomTat.tongDiemTruTho > 0
                      ? (nhom.diemTru / tomTat.tongDiemTruTho) * 100
                      : 0;
                  return (
                    <div
                      key={nhom.tenNhom}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "6px 0",
                      }}
                    >
                      <span
                        style={{
                          flex: "0 0 220px",
                          fontSize: "13px",
                          color: "#475569",
                          fontWeight: 600,
                        }}
                      >
                        {nhom.tenNhom}
                      </span>
                      <div className="cd-progress-track" style={{ flex: 1 }}>
                        <div
                          className="cd-progress-fill"
                          style={{ width: `${tyLe}%`, background: "#ef4444" }}
                        ></div>
                      </div>
                      <span
                        style={{
                          width: "150px",
                          textAlign: "right",
                          fontSize: "13px",
                          color: "#475569",
                          flexShrink: 0,
                        }}
                      >
                        <b style={{ color: "#0f172a" }}>
                          {formatDiem(nhom.diemTru, 2)}
                        </b>{" "}
                        điểm / {nhom.soViPham} lần
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <p className="sub-title" style={{ marginBottom: "10px" }}>
            CHI TIẾT CÁC LẦN GHI NHẬN
          </p>
          <div className="modern-table-card" style={{ overflowX: "auto" }}>
            {danhSachHienThi.length === 0 ? (
              <div className="cd-empty">
                <i className="fa-solid fa-filter-circle-xmark"></i>
                <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
                  Không có vi phạm nào thuộc nhóm đang lọc
                </h3>
                <button
                  className="cd-link-btn"
                  onClick={() => setFilterNhom("")}
                >
                  <i className="fa-solid fa-rotate-left"></i> Xem lại tất cả
                </button>
              </div>
            ) : (
              <table
                className="custom-table"
                style={{ minWidth: "1100px", fontSize: "13px" }}
              >
                <thead>
                  <tr>
                    <th style={{ width: "56px", textAlign: "center" }}>STT</th>
                    <th style={{ width: "110px", textAlign: "center" }}>
                      NGÀY VP
                    </th>
                    <th style={{ width: "180px" }}>NHÓM VI PHẠM</th>
                    <th>LOẠI VI PHẠM</th>
                    <th style={{ width: "220px" }}>MÔ TẢ</th>
                    <th style={{ width: "90px", textAlign: "center" }}>
                      ĐIỂM TRỪ
                    </th>
                    <th style={{ width: "170px" }}>MINH CHỨNG</th>
                    <th style={{ width: "180px" }}>ĐƠN VỊ GHI NHẬN</th>
                  </tr>
                </thead>
                <tbody>
                  {danhSachHienThi.map((vp, index) => (
                    <tr key={vp.IdViPham}>
                      <td style={{ textAlign: "center", color: "#64748b" }}>
                        {index + 1}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {formatNgay(vp.NgayViPham)}
                        {vp.BiKyLuat && (
                          <div style={{ marginTop: "4px" }}>
                            <span
                              className="tag-badge"
                              style={{
                                background: "#fee2e2",
                                color: "#991b1b",
                                borderColor: "#fecaca",
                              }}
                            >
                              Bị kỷ luật
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: "#475569" }}>
                        {vp.TenNhom || (
                          <span style={{ color: "#94a3b8" }}>---</span>
                        )}
                      </td>
                      <td style={{ textAlign: "justify" }}>
                        {vp.IdLoaiViPham != null ? (
                          vp.NoiDung
                        ) : (
                          <span
                            style={{ color: "#94a3b8", fontStyle: "italic" }}
                          >
                            <i
                              className="fa-solid fa-circle-question"
                              style={{ marginRight: "5px" }}
                            ></i>
                            Chưa phân loại (bản ghi cũ)
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "justify",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {vp.MoTa || (
                          <span style={{ color: "#94a3b8" }}>---</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {vp.DiemTru != null ? (
                          <span className="rating-badge rating-low">
                            {formatDiem(vp.DiemTru, 2)}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>---</span>
                        )}
                      </td>
                      <td>
                        {vp.MinhChung ? (
                          <button
                            type="button"
                            onClick={() => openPreview(vp)}
                            title={`Xem trước: ${vp.MinhChung.TenFileGoc || "minh chứng.pdf"}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              maxWidth: "100%",
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              color: "#1d4ed8",
                              fontSize: "13px",
                              textAlign: "left",
                            }}
                          >
                            <i
                              className="fa-solid fa-file-pdf"
                              style={{ color: "#dc2626", flexShrink: 0 }}
                            ></i>
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {vp.MinhChung.TenFileGoc || "Minh chứng.pdf"}
                            </span>
                          </button>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>
                            <i
                              className="fa-regular fa-file"
                              style={{ marginRight: "5px" }}
                            ></i>
                            Chưa có
                          </span>
                        )}
                      </td>
                      <td style={{ color: "#475569" }}>
                        <div>{vp.TenDonViGhiNhan || "---"}</div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            marginTop: "3px",
                          }}
                        >
                          Ghi nhận {formatNgay(vp.NgayGhiNhan)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.item?.MinhChung?.TenFileGoc}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.item)}
      />
    </div>
  );
};

export default ViPhamCuaToi;
