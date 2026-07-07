import React from "react";

const DanhGiaPhuLuc2Form = ({
  criteriaList,
  formData,
  tongDiemCoBan,
  isSubmitting,
  trangThaiPhieu,
  lyDoTraVe,
  onScoreChange,
  onTextChange,
  onFileChange,
  onRemoveFile,
  onSubmit,
  onRecall,
  onNckhChange,
  onRemoveNckh,
  isKhoaEvaluating = false,
}) => {
  const groupedCriteria = criteriaList.reduce((groups, item) => {
    const group = groups[item.TenNhom] || [];
    group.push(item);
    groups[item.TenNhom] = group;
    return groups;
  }, {});

  const getXepLoai = (diem) => {
    if (diem >= 80 && diem <= 100)
      return {
        text: "Hoàn thành",
        color: "#0ea5e9",
        bg: "#f0f9ff",
        icon: "fa-circle-check",
      };
    if (diem > 100)
      return {
        text: "Hoàn thành Tốt / Xuất sắc",
        color: "#10b981",
        bg: "#ecfdf5",
        icon: "fa-medal",
      };
    return null;
  };

  const xepLoai = getXepLoai(tongDiemCoBan);

  return (
    <div className="pl2-container">
      <div className="pl2-header" style={{ position: "static" }}>
        <div className="pl2-header-score">
          <span className="pl2-header-score-label">TỔNG ĐIỂM TÍCH LŨY</span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div className="pl2-header-score-value">
              {tongDiemCoBan.toFixed(2)}
              <span
                style={{
                  fontSize: "16px",
                  color: "#64748b",
                  fontWeight: "normal",
                  marginLeft: "5px",
                }}
              >
                điểm
              </span>
            </div>

            {xepLoai && (
              <div
                style={{
                  background: xepLoai.bg,
                  color: xepLoai.color,
                  border: `1px solid ${xepLoai.color}40`,
                  padding: "6px 15px",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  transition: "all 0.3s ease",
                }}
              >
                <i className={`fa-solid ${xepLoai.icon}`}></i>
                Dự kiến: {xepLoai.text}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              marginTop: "4px",
              fontWeight: "500",
            }}
          >
            (Bao gồm Điểm cơ bản + Điểm vượt trội)
          </div>
        </div>

        <div className="pl2-header-actions">
          {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
            <>
              <button
                onClick={() => onSubmit(1)}
                disabled={isSubmitting}
                className="btn-luu-nhap"
              >
                <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
              </button>
              <button
                onClick={() => onSubmit(2)}
                disabled={isSubmitting}
                className="btn-nop-phieu"
              >
                <i className="fa-solid fa-paper-plane"></i> Nộp Phiếu
              </button>
            </>
          )}
          {trangThaiPhieu === 2 && !isKhoaEvaluating && (
            <button
              onClick={onRecall}
              disabled={isSubmitting}
              className="btn-thu-hoi"
            >
              <i className="fa-solid fa-rotate-left"></i> Thu hồi phiếu để sửa
            </button>
          )}
          {trangThaiPhieu >= 3 && !isKhoaEvaluating && (
            <div className="pl2-approved">
              <i className="fa-solid fa-check-circle"></i> Phiếu đã được phê
              duyệt
            </div>
          )}
        </div>
      </div>

      {Object.keys(groupedCriteria).map((groupName, gIndex) => (
        <div key={groupName} className="pl2-group">
          <h3 className="pl2-group-title">{groupName}</h3>
          <div className="pl2-group-items">
            {groupedCriteria[groupName].map((tc, index) => {
              const isActive = formData[tc.IdTieuChi]?.DiemTuDanhGia > 0;
              const fileList = formData[tc.IdTieuChi]?.DanhSachFile || [];
              const nckhList = formData[tc.IdTieuChi]?.DanhSachNCKH || [];

              let disabledRadio = false;
              let disabledText = false;

              if (isKhoaEvaluating) {
                disabledRadio = trangThaiPhieu >= 3;
                disabledText = trangThaiPhieu >= 3;
              } else {
                disabledRadio = trangThaiPhieu >= 2;
                disabledText = trangThaiPhieu >= 2;
              }

              return (
                <div
                  key={tc.IdTieuChi}
                  className={`pl2-criteria ${isActive ? "active" : ""}`}
                >
                  <div
                    className="pl2-criteria-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "24px",
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <span
                        className="pl2-criteria-title"
                        style={{
                          fontWeight: "600",
                          color: "#333",
                          fontSize: "16px",
                        }}
                      >
                        {gIndex + 1}.{index + 1}. {tc.TenTieuChi}
                      </span>

                      {tc.MoTa && (
                        <div
                          className="pl2-criteria-desc"
                          style={{
                            color: "#555",
                            fontSize: "14px",
                            lineHeight: "1.6",
                            whiteSpace: "pre-line",
                            paddingLeft: "4px",
                          }}
                        >
                          {tc.MoTa}
                        </div>
                      )}
                    </div>

                    <span
                      className="pl2-criteria-max"
                      style={{
                        whiteSpace: "nowrap",
                        color: "#333",
                        fontSize: "14px",
                      }}
                    >
                      Tối đa: {tc.DiemToiDa}đ
                    </span>
                  </div>

                  {tc.LoaiThangDiem === 2 ? (
                    <div className="pl2-score-input-container">
                      <span style={{ fontSize: "14px", fontWeight: "500", color: "#475569" }}>
                        Nhập điểm:
                      </span>
                      <input
                        type="number"
                        className="pl2-score-input"
                        placeholder={`Tối đa ${tc.DiemToiDa}`}
                        value={formData[tc.IdTieuChi]?.DiemTuDanhGia ?? ""}
                        disabled={disabledRadio}
                        min="0"
                        max={tc.DiemToiDa}
                        step="any"
                        onChange={(e) => {
                          if (disabledRadio) return;
                          const val = e.target.value;
                          if (val === "") {
                            onScoreChange(tc.IdTieuChi, null, "");
                          } else {
                            let parsed = parseFloat(val);
                            if (isNaN(parsed)) parsed = 0;
                            if (parsed < 0) parsed = 0;
                            if (parsed > tc.DiemToiDa) parsed = tc.DiemToiDa;
                            onScoreChange(tc.IdTieuChi, null, parsed);
                          }
                        }}
                      />
                      <span style={{ fontSize: "13px", color: "#64748b" }}>
                        (Điểm tối đa: {tc.DiemToiDa}đ)
                      </span>
                    </div>
                  ) : tc.LoaiThangDiem === 3 ? (
                    <div className="pl2-thang-diem-list">
                      <label
                        className={`pl2-thang-diem-item ${formData[tc.IdTieuChi]?.DiemTuDanhGia === tc.DiemToiDa ? "selected" : ""} ${disabledRadio ? "disabled" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`yesno_${tc.IdTieuChi}`}
                          checked={
                            formData[tc.IdTieuChi]?.DiemTuDanhGia ===
                            tc.DiemToiDa
                          }
                          disabled={disabledRadio}
                          onChange={() => {
                            if (disabledRadio) return;
                            onScoreChange(tc.IdTieuChi, null, tc.DiemToiDa);
                          }}
                        />
                        <span className="pl2-thang-diem-text">
                          Có ({tc.DiemToiDa}đ)
                        </span>
                      </label>
                      <label
                        className={`pl2-thang-diem-item ${formData[tc.IdTieuChi]?.DiemTuDanhGia === 0 || formData[tc.IdTieuChi]?.DiemTuDanhGia == null ? "selected" : ""} ${disabledRadio ? "disabled" : ""}`}
                      >
                        <input
                          type="radio"
                          name={`yesno_${tc.IdTieuChi}`}
                          checked={
                            formData[tc.IdTieuChi]?.DiemTuDanhGia === 0 ||
                            formData[tc.IdTieuChi]?.DiemTuDanhGia == null
                          }
                          disabled={disabledRadio}
                          onChange={() => {
                            if (disabledRadio) return;
                            onScoreChange(tc.IdTieuChi, null, 0);
                          }}
                        />
                        <span className="pl2-thang-diem-text">Không (0đ)</span>
                      </label>
                    </div>
                  ) : (
                    tc.CacThangDiem?.length > 0 && (
                      <div className="pl2-thang-diem-list">
                        {tc.CacThangDiem.map((td) => {
                          const selected =
                            formData[tc.IdTieuChi]?.IdThangDiemChon ===
                            td.IdThangDiem;
                          return (
                            <label
                              key={td.IdThangDiem}
                              className={`pl2-thang-diem-item ${selected ? "selected" : ""} ${disabledRadio ? "disabled" : ""}`}
                            >
                              <input
                                type="radio"
                                checked={selected}
                                disabled={disabledRadio}
                                onClick={() => {
                                  if (disabledRadio) return;
                                  if (selected)
                                    onScoreChange(tc.IdTieuChi, null, 0);
                                  else
                                    onScoreChange(
                                      tc.IdTieuChi,
                                      td.IdThangDiem,
                                      td.GiaTriDiem,
                                    );
                                }}
                                onChange={() => {}}
                              />
                              <span className="pl2-thang-diem-text">
                                <b>{td.GiaTriDiem}đ:</b> {td.DieuKienDiem}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )
                  )}

                  <textarea
                    className="pl2-textarea"
                    placeholder={
                      isKhoaEvaluating
                        ? "Nhập nhận xét của Khoa..."
                        : "Nhập diễn giải (nếu có)"
                    }
                    value={formData[tc.IdTieuChi]?.MoTaHoanThanh || ""}
                    onChange={(e) => onTextChange(tc.IdTieuChi, e.target.value)}
                    disabled={disabledText}
                  />

                  <div
                    className="pl2-file-upload"
                    style={{ marginTop: "10px" }}
                  >
                    {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginBottom:
                            fileList.length > 0 || nckhList.length > 0
                              ? "10px"
                              : "0",
                        }}
                      >
                        <button
                          type="button"
                          className="btn-attach-file"
                          onClick={() =>
                            document
                              .getElementById(`file_input_${tc.IdTieuChi}`)
                              .click()
                          }
                        >
                          <i className="fa-solid fa-paperclip"></i> Đính kèm tệp
                        </button>
                        <input
                          id={`file_input_${tc.IdTieuChi}`}
                          type="file"
                          multiple
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            if (files.length > 0 && onFileChange)
                              onFileChange(tc.IdTieuChi, files);
                            e.target.value = null;
                          }}
                        />
                      </div>
                    )}

                    {fileList.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        {fileList.map((fileItem, fileIndex) => {
                          const isSavedOnServer = !(fileItem instanceof File);
                          const fileNameDisplay = isSavedOnServer
                            ? fileItem.originalName || fileItem.fileName
                            : fileItem.name;
                          return (
                            <div
                              key={fileIndex}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "13px",
                                  color: "#15803d",
                                  display: "flex",
                                  alignItems: "center",
                                  background: "#dcfce3",
                                  padding: "5px 12px",
                                  borderRadius: "20px",
                                  fontWeight: "500",
                                }}
                              >
                                <i
                                  className="fa-solid fa-file-circle-check"
                                  style={{ marginRight: "6px" }}
                                ></i>{" "}
                                {fileNameDisplay}
                              </span>
                              {trangThaiPhieu <= 1 && !isKhoaEvaluating && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRemoveFile(tc.IdTieuChi, fileIndex)
                                  }
                                  style={{
                                    fontSize: "13px",
                                    color: "#ef4444",
                                    background: "#fef2f2",
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #fecaca",
                                    cursor: "pointer",
                                  }}
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {nckhList.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {nckhList.map((nckhItem, nckhIndex) => (
                          <div
                            key={nckhIndex}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                color: "#6b21a8",
                                display: "flex",
                                alignItems: "center",
                                background: "#f3e8ff",
                                padding: "5px 12px",
                                borderRadius: "20px",
                                fontWeight: "500",
                                border: "1px solid #e9d5ff",
                              }}
                            >
                              <i
                                className="fa-solid fa-book-open"
                                style={{ marginRight: "6px" }}
                              ></i>
                              [{nckhItem.QRanking}] {nckhItem.MoTa}
                            </span>
                            {trangThaiPhieu <= 1 &&
                              !isKhoaEvaluating &&
                              onRemoveNckh && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onRemoveNckh(tc.IdTieuChi, nckhIndex)
                                  }
                                  style={{
                                    fontSize: "13px",
                                    color: "#ef4444",
                                    background: "#fef2f2",
                                    padding: "5px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #fecaca",
                                    cursor: "pointer",
                                  }}
                                >
                                  <i className="fa-solid fa-xmark"></i>
                                </button>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DanhGiaPhuLuc2Form;
