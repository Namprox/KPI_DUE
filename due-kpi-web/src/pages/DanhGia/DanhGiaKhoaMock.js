import React, { useState, useMemo } from "react";
import "../../css/Pages.css";

const MOCK_KHOA_CRITERIA = [
  {
    Id: 1,
    Ten: "I. Đào tạo - Giảng dạy - Đảm bảo chất lượng",
    ToiDa: 40,
    Loai: "CoBan",
    MoTa: "Tỉ lệ GV hoàn thành giảng dạy (10đ), Tuân thủ quy định (7.5đ), Điểm phản hồi SV (2.5đ)...",
  },
  {
    Id: 2,
    Ten: "II. Nghiên cứu khoa học",
    ToiDa: 40,
    Loai: "CoBan",
    MoTa: "Tỷ lệ GV hoàn thành NCKH (20đ), Sinh hoạt học thuật cấp Khoa (20đ)",
  },
  {
    Id: 3,
    Ten: "III. Phục vụ cộng đồng và nhiệm vụ khác",
    ToiDa: 20,
    Loai: "CoBan",
    MoTa: "Công tác tư vấn tuyển sinh, hợp tác quốc tế, quan hệ doanh nghiệp...",
  },
  {
    Id: 4,
    Ten: "Khoa thực hiện kiểm định thành công 1 CTĐT",
    ToiDa: 10,
    Loai: "VuotTroi",
    MoTa: "Thành tích đặc biệt (10 điểm) - Yêu cầu đính kèm giấy chứng nhận kiểm định",
    BatBuocMinhChung: true,
  },
  {
    Id: 5,
    Ten: "Mở 1 chuyên ngành đào tạo/hình thức đào tạo mới",
    ToiDa: 10,
    Loai: "VuotTroi",
    MoTa: "Tuyển sinh thành công (10 điểm) - Yêu cầu Quyết định mở ngành",
    BatBuocMinhChung: true,
  },
  {
    Id: 6,
    Ten: ">70% sinh viên tốt nghiệp đúng hạn",
    ToiDa: 5,
    Loai: "VuotTroi",
    MoTa: "Thưởng 5 điểm - Thống kê tốt nghiệp",
  },
];

const DanhGiaKhoaMock = () => {
  const [diem, setDiem] = useState({});
  const [minhChung, setMinhChung] = useState({});

  const tongCoBan = useMemo(
    () =>
      MOCK_KHOA_CRITERIA.filter((t) => t.Loai === "CoBan").reduce(
        (sum, t) => sum + (Number(diem[t.Id]) || 0),
        0,
      ),
    [diem],
  );
  const tongVuotTroi = useMemo(
    () =>
      MOCK_KHOA_CRITERIA.filter((t) => t.Loai === "VuotTroi").reduce(
        (sum, t) => sum + (Number(diem[t.Id]) || 0),
        0,
      ),
    [diem],
  );
  const tongTichLuy = tongCoBan + tongVuotTroi;

  const xepLoai = useMemo(() => {
    if (tongTichLuy < 80)
      return { text: "Không hoàn thành", color: "#ef4444" };
    if (tongTichLuy <= 100)
      return { text: "Hoàn thành nhiệm vụ", color: "#f59e0b" };
    return {
      text: "Hoàn thành Tốt / Xuất sắc (Cần xét Top 20% & Tỷ lệ NV)",
      color: "#10b981",
    };
  }, [tongTichLuy]);

  const handleChonTep = (tcId, e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const danhSachMoi = files.map((f, idx) => ({
      id: `${Date.now()}_${idx}`,
      name: f.name,
      sizeKb: Math.round(f.size / 1024),
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
    setMinhChung((prev) => ({
      ...prev,
      [tcId]: [...(prev[tcId] || []), ...danhSachMoi],
    }));
    e.target.value = "";
  };

  const xoaTep = (tcId, fileId) => {
    setMinhChung((prev) => ({
      ...prev,
      [tcId]: (prev[tcId] || []).filter((f) => f.id !== fileId),
    }));
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>
          ĐÁNH GIÁ KPI KHOA / BỘ MÔN
        </h2>
        <span className="breadcrumb">Phụ lục 1A • Đơn vị [Mock UI]</span>
      </div>

      <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
        <div
          style={{
            flex: 1,
            background: "#f8fafc",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: "bold" }}>
            ĐIỂM CƠ BẢN (MAX 100)
          </div>
          <div
            style={{ fontSize: "25px", color: "#0f172a", fontWeight: "bold" }}
          >
            {tongCoBan}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: "#f0fdf4",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #bbf7d0",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: "bold" }}>
            ĐIỂM VƯỢT TRỘI
          </div>
          <div
            style={{ fontSize: "25px", color: "#166534", fontWeight: "bold" }}
          >
            +{tongVuotTroi}
          </div>
        </div>
        <div
          style={{
            flex: 2,
            background: "#eff6ff",
            padding: "15px",
            borderRadius: "8px",
            border: "1px solid #bfdbfe",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: "bold" }}>
            DỰ KIẾN XẾP LOẠI
          </div>
          <div
            style={{
              fontSize: "19px",
              color: xepLoai.color,
              fontWeight: "bold",
              marginTop: "4px",
            }}
          >
            {xepLoai.text}
          </div>
          {tongTichLuy > 100 && (
            <div
              style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}
            >
              <i className="fa-solid fa-circle-info"></i> Để đạt Xuất sắc, Khoa
              phải thuộc Top 20% điểm cao nhất và 100% nhân sự hoàn thành nhiệm
              vụ.
            </div>
          )}
        </div>
      </div>

      <div className="modern-table-card" style={{ padding: "20px" }}>
        {MOCK_KHOA_CRITERIA.map((tc) => {
          const dsMc = minhChung[tc.Id] || [];
          return (
            <div
              key={tc.Id}
              style={{
                padding: "18px 0",
                borderBottom: "1px dashed #cbd5e1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ flex: "1 1 70%" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "600",
                        color: tc.Loai === "VuotTroi" ? "#166534" : "#1e293b",
                      }}
                    >
                      {tc.Loai === "VuotTroi" && (
                        <i
                          className="fa-solid fa-award"
                          style={{ marginRight: "6px" }}
                        ></i>
                      )}
                      {tc.Ten}
                    </span>
                    {tc.BatBuocMinhChung && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: dsMc.length > 0 ? "#ecfdf5" : "#fffbeb",
                          color: dsMc.length > 0 ? "#047857" : "#b45309",
                          border: `1px solid ${dsMc.length > 0 ? "#a7f3d0" : "#fde68a"}`,
                        }}
                      >
                        <i
                          className={`fa-solid ${
                            dsMc.length > 0
                              ? "fa-paperclip"
                              : "fa-triangle-exclamation"
                          }`}
                        ></i>{" "}
                        {dsMc.length > 0
                          ? `${dsMc.length} minh chứng`
                          : "Cần minh chứng"}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      marginTop: "5px",
                    }}
                  >
                    {tc.MoTa}
                  </div>
                </div>
                <div style={{ flex: "0 0 140px", textAlign: "right" }}>
                  <input
                    type="number"
                    placeholder={`Tối đa ${tc.ToiDa}đ`}
                    className="form-input"
                    style={{ width: "120px" }}
                    value={diem[tc.Id] || ""}
                    onChange={(e) =>
                      setDiem((prev) => ({ ...prev, [tc.Id]: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Thông tin diễn giải điểm trung bình sinh viên đánh giá của Khoa */}
              {tc.Id === 1 && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px 16px",
                    background: "#f0f7ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "8px",
                        background: "#dbeafe",
                        color: "#1d4ed8",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                      }}
                    >
                      <i className="fa-solid fa-users-viewfinder"></i>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#1e3a8a",
                        }}
                      >
                        Điểm trung bình đánh giá của sinh viên (Khoa):{" "}
                        <span
                          style={{ color: "#1d4ed8", fontSize: "15px" }}
                        >
                          4.52
                        </span>{" "}
                        / 5.00
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Tổng hợp từ 28 giảng viên trong Khoa • 118 sinh viên
                        đánh giá (quy đổi ÷ 12)
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "12px",
                      background: "#ecfdf5",
                      color: "#047857",
                      border: "1px solid #a7f3d0",
                    }}
                  >
                    <i
                      className="fa-solid fa-circle-check"
                      style={{ marginRight: "4px" }}
                    ></i>
                    Đạt mức xuất sắc (≥ 4.5đ)
                  </span>
                </div>
              )}

              {/* Khối upload minh chứng chỉ cho tiêu chí vượt trội (chấm tay) */}
              {tc.Loai === "VuotTroi" && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#475569",
                      }}
                    >
                      <i
                        className="fa-solid fa-paperclip"
                        style={{ color: "#2563eb", marginRight: "6px" }}
                      ></i>
                      Minh chứng ({dsMc.length})
                    </span>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 12px",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "12.5px",
                        fontWeight: 500,
                      }}
                    >
                      <i className="fa-solid fa-cloud-arrow-up"></i> Tải minh chứng
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg"
                        style={{ display: "none" }}
                        onChange={(e) => handleChonTep(tc.Id, e)}
                      />
                    </label>
                  </div>

                  {dsMc.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {dsMc.map((f) => (
                        <div
                          key={f.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            background: "#ffffff",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              overflow: "hidden",
                            }}
                          >
                            <i
                              className="fa-solid fa-file-pdf"
                              style={{ color: "#dc2626" }}
                            ></i>
                            <span
                              style={{
                                fontWeight: 500,
                                color: "#1e293b",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "350px",
                              }}
                            >
                              {f.name}
                            </span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              ({f.sizeKb} KB • {f.time})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => xoaTep(tc.Id, f.id)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#dc2626",
                              cursor: "pointer",
                              padding: "2px 6px",
                              fontSize: "12px",
                            }}
                            title="Gỡ tệp"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DanhGiaKhoaMock;