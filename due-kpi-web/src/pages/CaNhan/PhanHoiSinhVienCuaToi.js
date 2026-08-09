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
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { downloadExcel } from "../../utils/excelUtils";
import { formatDiem, formatNgay } from "../../utils/phieuApi";
import SearchSelect from "../../components/Common/SearchSelect";
import {
  fetchPhanHoiCuaToi,
  mauTheoDiem,
  phanTramDiem,
  SO_CAU_HOI,
  tenKyHoc,
} from "../../utils/phanHoiSinhVienApi";

const TABS = [
  { key: "hocPhan", nhan: "Theo học phần", icon: "fa-book" },
  { key: "cauHoi", nhan: "Theo câu hỏi", icon: "fa-list-ol" },
  { key: "kyHoc", nhan: "Theo kỳ học", icon: "fa-calendar-days" },
];

/** Thanh điểm 1..5 kèm nhãn số — dùng lại cho cả ba tab. */
const ThanhDiem = ({ diem }) => {
  const mau = mauTheoDiem(diem);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        minWidth: "160px",
      }}
    >
      <div className="cd-progress-track" style={{ flex: 1, minWidth: "80px" }}>
        <div
          className="cd-progress-fill"
          style={{ width: `${phanTramDiem(diem)}%`, background: mau.nen }}
        ></div>
      </div>
      <b
        style={{
          color: mau.chu,
          fontSize: "13px",
          width: "34px",
          textAlign: "right",
        }}
      >
        {formatDiem(diem, 2)}
      </b>
    </div>
  );
};

/**
 * Kết quả khảo sát ý kiến sinh viên của CHÍNH giảng viên đang đăng nhập.
 *
 * Trang chỉ đọc và không tự tính gì: mọi con số đến thẳng từ
 * GET /phanhoisinhvien/cua-toi, kể cả điểm đã chốt. Mã cán bộ do server suy từ
 * token nên trang không cần biết người dùng là ai.
 *
 * Bộ lọc kỳ/học phần do SERVER áp — đổi bộ lọc là gọi lại API, không lọc lại trên
 * dữ liệu đã có. Riêng danh mục trong hai ô lọc và điểm chốt luôn là số cả năm,
 * nên chúng không đổi khi lọc (xem chú thích ở phanHoiSinhVienApi.js).
 */
const PhanHoiSinhVienCuaToi = () => {
  const toast = useRef(null);
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  const [duLieu, setDuLieu] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loi, setLoi] = useState("");

  const [kyHoc, setKyHoc] = useState("");
  const [maHocPhan, setMaHocPhan] = useState("");
  const [tab, setTab] = useState("hocPhan");

  const taiDuLieu = useCallback(async () => {
    if (!selectedNam) return;

    setIsLoading(true);
    setLoi("");
    try {
      setDuLieu(
        await fetchPhanHoiCuaToi({ idNam: selectedNam, kyHoc, maHocPhan }),
      );
    } catch (error) {
      console.error("Lỗi tải phản hồi sinh viên:", error);
      setDuLieu(null);
      setLoi(error.message);
    }
    setIsLoading(false);
  }, [selectedNam, kyHoc, maHocPhan]);

  useEffect(() => {
    if (!dangTaiNam) taiDuLieu();
  }, [dangTaiNam, taiDuLieu]);

  // Đổi năm là đổi hẳn tập học phần/kỳ — giữ bộ lọc cũ sẽ ra bảng trống khó hiểu.
  useEffect(() => {
    setKyHoc("");
    setMaHocPhan("");
  }, [selectedNam]);

  const tomTat = duLieu?.tomTat;
  const boLoc = duLieu?.boLoc || { kyHoc: [], hocPhan: [] };
  const diemChot = duLieu?.diemChot || null;
  const dangLoc = !!kyHoc || !!maHocPhan;
  const mauTong = mauTheoDiem(tomTat?.diemTb);

  /**
   * Điểm chốt tính trên CẢ NĂM. Chỉ đối chiếu khi màn hình cũng đang xem cả năm,
   * nếu không sẽ so một con số cả năm với một con số đã lọc và báo lệch sai.
   */
  const lechVoiChot = useMemo(() => {
    if (
      !diemChot ||
      diemChot.diemTb == null ||
      dangLoc ||
      tomTat?.diemTb == null
    )
      return null;
    const lech = tomTat.diemTb - diemChot.diemTb;
    return Math.abs(lech) >= 0.01 ? lech : null;
  }, [diemChot, dangLoc, tomTat]);

  const xoaBoLoc = () => {
    setKyHoc("");
    setMaHocPhan("");
  };

  const xuatExcel = () => {
    const rows = duLieu?.theoHocPhan || [];
    if (rows.length === 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Không có dữ liệu",
        detail: "Chưa có phản hồi nào để xuất.",
        life: 3000,
      });
      return;
    }

    downloadExcel({
      data: rows.map((hp, i) => ({
        STT: i + 1,
        "Mã học phần": hp.maHocPhan,
        "Khoa quản lý": hp.khoaQuanLy,
        "Điểm trung bình":
          hp.diemTb != null ? Number(hp.diemTb.toFixed(2)) : "",
        "Số lượt trả lời": hp.soLuot,
        "Số sinh viên": hp.soSinhVien,
      })),
      fileName: `PhanHoiSinhVien_${duLieu.maCanBo || "CaNhan"}_${selectedNam}`,
      sheetName: "Theo hoc phan",
      colWidths: [
        { wch: 6 },
        { wch: 16 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
      ],
    });
  };

  const tongPhanBo = tomTat
    ? Object.values(tomTat.phanBo).reduce((a, b) => a + b, 0)
    : 0;

  // Lần tải đầu mới dựng khung chờ; đổi bộ lọc thì giữ nội dung cũ và làm mờ, để
  // trang không nháy trắng sau mỗi lần chọn.
  const dangTaiLanDau = (isLoading || dangTaiNam) && !duLieu;

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
          Phản hồi của sinh viên
        </h2>
        <span className="breadcrumb">
          Kết quả khảo sát ý kiến sinh viên về hoạt động giảng dạy
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
          <label className="cd-label">Kỳ học</label>
          <SearchSelect
            value={kyHoc}
            onChange={(v) => setKyHoc(v)}
            options={[
              { value: '', label: 'Tất cả các kỳ' },
              ...boLoc.kyHoc.map((ky) => ({ value: ky, label: tenKyHoc(ky) })),
            ]}
            placeholder="Tất cả các kỳ"
            disabled={isLoading || boLoc.kyHoc.length === 0}
          />
        </div>

        <div className="cd-field">
          <label className="cd-label">Học phần</label>
          <SearchSelect
            value={maHocPhan}
            onChange={(v) => setMaHocPhan(v)}
            options={[
              { value: '', label: 'Tất cả học phần' },
              ...boLoc.hocPhan.map((ma) => ({ value: ma, label: ma })),
            ]}
            placeholder="Tất cả học phần"
            disabled={isLoading || boLoc.hocPhan.length === 0}
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
          disabled={isLoading || (duLieu?.theoHocPhan || []).length === 0}
        >
          <i className="fa-solid fa-file-excel"></i> Xuất Excel
        </button>
      </div>

      {dangTaiLanDau ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-spinner fa-spin"></i>
            Đang tải phản hồi sinh viên...
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
      ) : !tomTat ? null : tomTat.soLuot === 0 && !dangLoc ? (
        <div className="modern-table-card">
          <div className="cd-empty">
            <i className="fa-solid fa-comment-slash"></i>
            <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
              Chưa có phản hồi nào trong năm {selectedNam}
            </h3>
            <p style={{ margin: 0 }}>
              Dữ liệu khảo sát do phòng Quản lý chất lượng nhập theo từng đợt —
              nếu kỳ vừa rồi bạn có giảng dạy, hãy thử lại sau khi đợt khảo sát
              được nhập.
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
          {tomTat.soLuot === 0 ? (
            <div className="modern-table-card">
              <div className="cd-empty">
                <i className="fa-solid fa-filter-circle-xmark"></i>
                <h3 style={{ color: "#334155", margin: "0 0 6px 0" }}>
                  Không có phản hồi nào khớp bộ lọc
                </h3>
                <p style={{ margin: "0 0 14px 0" }}>
                  Hai ô lọc liệt kê mọi kỳ và học phần của cả năm nên có thể
                  ghép ra tổ hợp không tồn tại — ví dụ một học phần bạn không
                  dạy trong kỳ đang chọn.
                </p>
                <button className="cd-link-btn" onClick={xoaBoLoc}>
                  <i className="fa-solid fa-rotate-left"></i> Xem lại cả năm
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="stat-card-grid">
                <div className="stat-card">
                  <div
                    className="stat-icon-box"
                    style={{
                      background: `${mauTong.nen}22`,
                      color: mauTong.chu,
                    }}
                  >
                    <i className="fa-solid fa-star"></i>
                  </div>
                  <div>
                    <div className="stat-label">Điểm trung bình</div>
                    <div className="stat-value" style={{ color: mauTong.chu }}>
                      {formatDiem(tomTat.diemTb, 2)}
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#94a3b8",
                          fontWeight: 500,
                        }}
                      >
                        {" "}
                        / 5
                      </span>
                    </div>
                    <div className="cd-hint" style={{ marginTop: 0 }}>
                      {dangLoc ? "theo bộ lọc đang chọn" : "tính trên cả năm"}
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-blue">
                    <i className="fa-solid fa-comments"></i>
                  </div>
                  <div>
                    <div className="stat-label">Số lượt trả lời</div>
                    <div className="stat-value">{tomTat.soLuot}</div>
                    <div className="cd-hint" style={{ marginTop: 0 }}>
                      mỗi sinh viên trả lời {SO_CAU_HOI} câu
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-purple">
                    <i className="fa-solid fa-user-graduate"></i>
                  </div>
                  <div>
                    <div className="stat-label">Số sinh viên</div>
                    <div className="stat-value">{tomTat.soSinhVien}</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon-box stat-icon-amber">
                    <i className="fa-solid fa-book"></i>
                  </div>
                  <div>
                    <div className="stat-label">Số học phần</div>
                    <div className="stat-value">{tomTat.soHocPhan}</div>
                  </div>
                </div>
              </div>

              {diemChot && (
                <div className="cd-phieu-header">
                  <div
                    className="cd-phieu-top"
                    style={{ alignItems: "center" }}
                  >
                    {/* Khối này mang con số quan trọng nhất trang nên được phóng
                        lớn hơn một nấc so với .cd-box-title/.cd-hint/.cd-meta-*
                        mặc định. Ghi đè tại chỗ, KHÔNG sửa file CSS dùng chung —
                        các lớp đó còn phục vụ màn hình chấm điểm và hồ sơ KPI. */}
                    <div style={{ flex: "1 1 320px" }}>
                      <div
                        className="cd-box-title"
                        style={{ marginBottom: "6px", fontSize: "13px" }}
                      >
                        <i
                          className="fa-solid fa-lock"
                          style={{ marginRight: "8px", color: "#6d28d9" }}
                        ></i>
                        Điểm đã chốt đưa vào KPI
                      </div>
                      <div
                        className="cd-hint"
                        style={{ marginTop: 0, fontSize: "13px" }}
                      >
                        {diemChot.ngayChot
                          ? `Chốt ngày ${formatNgay(diemChot.ngayChot)}${
                              diemChot.nguoiChot
                                ? ` bởi ${diemChot.nguoiChot}`
                                : ""
                            }.`
                          : "Đã chốt cho năm này."}
                      </div>
                      {lechVoiChot != null && (
                        <div
                          className="cd-hint cd-hint-warn"
                          style={{ marginBottom: 0, fontSize: "13px" }}
                        >
                          <i className="fa-solid fa-circle-exclamation"></i> Dữ
                          liệu hiện tại đang{" "}
                          {lechVoiChot > 0 ? "cao hơn" : "thấp hơn"} điểm đã
                          chốt {formatDiem(Math.abs(lechVoiChot), 2)} điểm.
                        </div>
                      )}
                    </div>

                    <div
                      className="cd-meta-grid"
                      style={{
                        marginTop: 0,
                        paddingTop: 0,
                        border: "none",
                        flex: "0 0 auto",
                      }}
                    >
                      <div>
                        <div
                          className="cd-meta-label"
                          style={{ fontSize: "13px" }}
                        >
                          Điểm chốt
                        </div>
                        <div
                          className="cd-meta-value"
                          style={{ fontSize: "26px", color: "#6d28d9" }}
                        >
                          {formatDiem(diemChot.diemTb, 2)}
                        </div>
                      </div>
                      <div>
                        <div
                          className="cd-meta-label"
                          style={{ fontSize: "13px" }}
                        >
                          Số lượt tính
                        </div>
                        <div
                          className="cd-meta-value"
                          style={{ fontSize: "16px" }}
                        >
                          {diemChot.soLuot}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <p className="sub-title" style={{ marginBottom: "10px" }}>
                PHÂN BỐ MỨC ĐIỂM SINH VIÊN CHỌN
              </p>
              <div
                className="modern-table-card"
                style={{ padding: "18px 20px", marginBottom: "24px" }}
              >
                {tongPhanBo === 0 ? (
                  <div className="cd-hint" style={{ marginTop: 0 }}>
                    Không có câu trả lời hợp lệ trong phạm vi đang lọc.
                  </div>
                ) : (
                  [5, 4, 3, 2, 1].map((muc) => {
                    const soLuot = tomTat.phanBo[muc] || 0;
                    const tyLe = (soLuot / tongPhanBo) * 100;
                    const mau = mauTheoDiem(muc);
                    return (
                      <div
                        key={muc}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "6px 0",
                        }}
                      >
                        <span
                          style={{
                            width: "58px",
                            fontSize: "13px",
                            color: "#475569",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {muc}{" "}
                          <i
                            className="fa-solid fa-star"
                            style={{ color: "#fbbf24", fontSize: "11px" }}
                          ></i>
                        </span>
                        <div className="cd-progress-track" style={{ flex: 1 }}>
                          <div
                            className="cd-progress-fill"
                            style={{ width: `${tyLe}%`, background: mau.nen }}
                          ></div>
                        </div>
                        <span
                          style={{
                            width: "120px",
                            textAlign: "right",
                            fontSize: "13px",
                            color: "#475569",
                            flexShrink: 0,
                          }}
                        >
                          <b style={{ color: "#0f172a" }}>{soLuot}</b> lượt (
                          {tyLe.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="cd-tabs">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    className={`cd-tab${tab === t.key ? " cd-tab-active" : ""}`}
                    onClick={() => setTab(t.key)}
                  >
                    <i className={`fa-solid ${t.icon}`}></i> {t.nhan}
                  </button>
                ))}
              </div>

              {tab === "hocPhan" && (
                <div
                  className="modern-table-card"
                  style={{ padding: "18px 20px" }}
                >
                  <div
                    className="cd-hint"
                    style={{ marginTop: 0, marginBottom: "12px" }}
                  >
                    Xếp theo điểm giảm dần — học phần cần cải thiện nằm ở cuối
                    bảng.
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      className="custom-table"
                      style={{ minWidth: "640px", fontSize: "13px" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: "60px" }}>STT</th>
                          <th>Học phần</th>
                          <th style={{ width: "200px" }}>Điểm trung bình</th>
                          <th style={{ width: "110px", textAlign: "right" }}>
                            Lượt trả lời
                          </th>
                          <th style={{ width: "110px", textAlign: "right" }}>
                            Sinh viên
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {duLieu.theoHocPhan.map((hp, i) => (
                          <tr key={hp.maHocPhan}>
                            <td>{i + 1}</td>
                            <td>
                              <span className="code-pill">{hp.maHocPhan}</span>
                              {hp.khoaQuanLy && (
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#94a3b8",
                                    marginTop: "4px",
                                  }}
                                >
                                  {hp.khoaQuanLy}
                                </div>
                              )}
                            </td>
                            <td>
                              <ThanhDiem diem={hp.diemTb} />
                            </td>
                            <td style={{ textAlign: "right" }}>{hp.soLuot}</td>
                            <td style={{ textAlign: "right" }}>
                              {hp.soSinhVien}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === "cauHoi" && (
                <div
                  className="modern-table-card"
                  style={{ padding: "18px 20px" }}
                >
                  <div
                    className="cd-hint"
                    style={{ marginTop: 0, marginBottom: "12px" }}
                  >
                    Trung bình từng câu hỏi trong phiếu khảo sát ({SO_CAU_HOI}{" "}
                    câu). Nội dung câu hỏi xem tại phiếu khảo sát do phòng Quản
                    lý chất lượng ban hành.
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      className="custom-table"
                      style={{ minWidth: "560px", fontSize: "13px" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: "120px" }}>Câu hỏi</th>
                          <th style={{ width: "220px" }}>Điểm trung bình</th>
                          <th style={{ width: "120px", textAlign: "right" }}>
                            Lượt trả lời
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {duLieu.theoCauHoi.map((ch) => (
                          <tr key={ch.cauHoi}>
                            <td>
                              <span className="tag-badge">Câu {ch.cauHoi}</span>
                            </td>
                            <td>
                              <ThanhDiem diem={ch.diemTb} />
                            </td>
                            <td style={{ textAlign: "right" }}>{ch.soLuot}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === "kyHoc" && (
                <div
                  className="modern-table-card"
                  style={{ padding: "18px 20px" }}
                >
                  <div style={{ overflowX: "auto" }}>
                    <table
                      className="custom-table"
                      style={{ minWidth: "600px", fontSize: "13px" }}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: "180px" }}>Kỳ học</th>
                          <th style={{ width: "220px" }}>Điểm trung bình</th>
                          <th style={{ width: "120px", textAlign: "right" }}>
                            Lượt trả lời
                          </th>
                          <th style={{ width: "120px", textAlign: "right" }}>
                            Sinh viên
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {duLieu.theoKyHoc.map((ky) => (
                          <tr key={ky.kyHoc}>
                            <td>
                              {tenKyHoc(ky.kyHoc)}{" "}
                              <span
                                className="tag-badge"
                                style={{ marginLeft: "6px" }}
                              >
                                {ky.kyHoc}
                              </span>
                            </td>
                            <td>
                              <ThanhDiem diem={ky.diemTb} />
                            </td>
                            <td style={{ textAlign: "right" }}>{ky.soLuot}</td>
                            <td style={{ textAlign: "right" }}>
                              {ky.soSinhVien}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PhanHoiSinhVienCuaToi;
