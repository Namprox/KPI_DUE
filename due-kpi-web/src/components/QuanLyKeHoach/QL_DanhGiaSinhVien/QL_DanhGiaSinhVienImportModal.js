import React, { useState, useEffect } from "react";
import { apiFetch } from "../../../utils/api";
import SearchSelect from "../../Common/SearchSelect";

const QL_DanhGiaSinhVienImportModal = ({
  isOpen,
  onClose,
  onSuccess,
  namList,
  donViList,
}) => {
  const [namHoc, setNamHoc] = useState("");
  const [maDonVi, setMaDonVi] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Filter units: only keep those whose ma_don_vi starts with "K_"
  const khoaList = (donViList || []).filter((item) => {
    const code = item.MaDonVi || item.ma_don_vi || item.maDonVi || "";
    return code.toUpperCase().startsWith("K_");
  });

  useEffect(() => {
    if (isOpen) {
      setMessage({ type: "", text: "" });
      setFile(null);
      if (namList && namList.length > 0 && !namHoc) {
        setNamHoc(namList[0].IdNam || namList[0].id_nam || "");
      }
      if (khoaList && khoaList.length > 0 && !maDonVi) {
        const defaultCode = khoaList[0].MaDonVi || khoaList[0].ma_don_vi || "";
        setMaDonVi(defaultCode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, namList, donViList]);

  if (!isOpen) return null;

  const getNamHoc2Digits = (yearVal) => {
    if (!yearVal) return "";
    const num = parseInt(yearVal, 10);
    if (isNaN(num)) return yearVal;
    return num > 100 ? num % 100 : num;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!namHoc) {
      setMessage({ type: "error", text: "Vui lòng chọn năm học!" });
      return;
    }

    if (!maDonVi) {
      setMessage({ type: "error", text: "Vui lòng chọn đơn vị (Khoa)!" });
      return;
    }

    if (!file) {
      setMessage({
        type: "error",
        text: "Vui lòng chọn file Excel để import!",
      });
      return;
    }

    const namHoc2Digits = getNamHoc2Digits(namHoc);

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namHoc", namHoc2Digits);
      formData.append("maDonVi", maDonVi);

      const res = await apiFetch("phanhoisinhvien/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      const isSuccess = res.ok && result.Success !== false;

      if (isSuccess) {
        const infoMsg =
          result.Message ||
          `Import thành công! Đã xử lý ${result.ValidRows || result.GroupsProcessed || 0} bản ghi.`;
        setMessage({ type: "success", text: infoMsg });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setMessage({
          type: "error",
          text:
            result.Message ||
            result.message ||
            "Import thất bại. Vui lòng kiểm tra lại file dữ liệu!",
        });
      }
    } catch (error) {
      console.error("Lỗi khi import đánh giá sinh viên:", error);
      setMessage({
        type: "error",
        text: "Lỗi kết nối máy chủ khi thực hiện import!",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="modal-box form-modal-box"
        style={{ width: "90%", maxWidth: "560px" }}
      >
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, paddingRight: "20px", lineHeight: "1.4" }}>
            <i
              className="fa-solid fa-file-import"
              style={{ marginRight: "8px", color: "#10b981" }}
            ></i>
            Import Đánh Giá Sinh Viên
          </h3>
          <button
            className="close-btn"
            onClick={onClose}
            style={{ fontSize: "26px", lineHeight: "1", flexShrink: 0 }}
            disabled={isLoading}
          >
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: "20px 25px" }}>
          {message.text && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                marginBottom: "18px",
                fontSize: "14px",
                backgroundColor:
                  message.type === "error" ? "#fef2f2" : "#ecfdf5",
                color: message.type === "error" ? "#991b1b" : "#065f46",
                border: `1px solid ${message.type === "error" ? "#fecaca" : "#a7f3d0"}`,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <i
                className={`fa-solid ${message.type === "error" ? "fa-triangle-exclamation" : "fa-circle-check"}`}
              ></i>
              <span>{message.text}</span>
            </div>
          )}

          <form id="importDanhGiaSinhVienForm" onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: "18px" }}>
              <label
                style={{
                  fontWeight: "600",
                  marginBottom: "6px",
                  display: "block",
                }}
              >
                Năm học <span className="text-red">*</span>
              </label>
              <SearchSelect
                value={namHoc}
                onChange={(v) => setNamHoc(v)}
                options={namList.map((y) => {
                  const val = y.IdNam || y.id_nam;
                  return { value: val, label: `Năm ${val}` };
                })}
                placeholder="-- Chọn năm học --"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "18px" }}>
              <label
                style={{
                  fontWeight: "600",
                  marginBottom: "6px",
                  display: "block",
                }}
              >
                Đơn vị (Khoa) <span className="text-red">*</span>
              </label>
              <SearchSelect
                value={maDonVi}
                onChange={(v) => setMaDonVi(v)}
                options={khoaList.map((dv) => ({
                  value: dv.MaDonVi || dv.ma_don_vi || "",
                  label: dv.TenDonVi || dv.ten_don_vi || "",
                }))}
                placeholder="-- Chọn đơn vị (Khoa) --"
                required
                disabled={isLoading}
              />
              {khoaList.length === 0 && (
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "12px",
                    color: "#ef4444",
                  }}
                >
                  Không tìm thấy đơn vị nào có mã bắt đầu bằng "K_"
                </p>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: "10px" }}>
              <label
                style={{
                  fontWeight: "600",
                  marginBottom: "6px",
                  display: "block",
                }}
              >
                File Excel dữ liệu <span className="text-red">*</span>
              </label>
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "8px",
                  padding: "20px",
                  textAlign: "center",
                  background: "#f8fafc",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "border-color 0.2s",
                }}
                onClick={() =>
                  !isLoading &&
                  document.getElementById("excelFileInput").click()
                }
              >
                <i
                  className="fa-solid fa-file-excel"
                  style={{
                    fontSize: "36px",
                    color: "#16a34a",
                    marginBottom: "8px",
                  }}
                ></i>
                <p
                  style={{
                    margin: "0 0 4px 0",
                    fontWeight: "600",
                    color: "#334155",
                  }}
                >
                  {file ? file.name : "Nhấn vào đây để chọn file Excel"}
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  Hỗ trợ định dạng .xlsx, .xls
                </p>
                <input
                  type="file"
                  id="excelFileInput"
                  accept=".xlsx, .xls"
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </form>
        </div>

        <div
          className="modal-footer"
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            padding: "15px 25px",
          }}
        >
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i>{" "}
            Hủy
          </button>
          <button
            type="submit"
            form="importDanhGiaSinhVienForm"
            className="btn-submit"
            style={{ backgroundColor: "#10b981", borderColor: "#10b981" }}
            disabled={isLoading || !file || !namHoc || !maDonVi}
          >
            {isLoading ? (
              <>
                <i
                  className="fa-solid fa-spinner fa-spin"
                  style={{ marginRight: "5px" }}
                ></i>{" "}
                Đang import...
              </>
            ) : (
              <>
                <i
                  className="fa-solid fa-upload"
                  style={{ marginRight: "5px" }}
                ></i>{" "}
                Nhập dữ liệu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QL_DanhGiaSinhVienImportModal;
