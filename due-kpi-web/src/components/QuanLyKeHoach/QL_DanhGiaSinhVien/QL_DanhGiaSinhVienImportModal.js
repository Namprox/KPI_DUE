import React, { useState, useEffect } from "react";
import { confirmDialog } from "primereact/confirmdialog";
import { apiFetch } from "../../../utils/api";
import SearchSelect from "../../Common/SearchSelect";

const QL_DanhGiaSinhVienImportModal = ({
  isOpen,
  onClose,
  onSuccess,
  namList,
}) => {
  const [namHoc, setNamHoc] = useState("");
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  // Từ 2026-10-21 đơn vị của từng dòng = Khoa khớp cột H, không chọn ở màn này
  // nữa. Giá trị cột H không khớp đúng 1 Khoa làm backend từ chối CẢ FILE
  // (400 KHOA_KHONG_KHOP) và không xoá / ghi gì, nên liệt kê ra để sửa file.
  const [khoaKhongKhop, setKhoaKhongKhop] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setMessage({ type: "", text: "" });
      setKhoaKhongKhop([]);
      setFile(null);
      if (namList && namList.length > 0 && !namHoc) {
        setNamHoc(namList[0].IdNam || namList[0].id_nam || "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, namList]);

  if (!isOpen) return null;

  const getNamHoc2Digits = (yearVal) => {
    if (!yearVal) return "";
    const num = parseInt(yearVal, 10);
    if (isNaN(num)) return yearVal;
    return num > 100 ? num % 100 : num;
  };

  const runImport = async () => {
    const namHoc2Digits = getNamHoc2Digits(namHoc);

    setIsLoading(true);
    setKhoaKhongKhop([]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namHoc", namHoc2Digits);

      const res = await apiFetch("phanhoisinhvien/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      const isSuccess = res.ok && result.Success !== false;

      if (isSuccess) {
        const soDongGhi = result.InsertedRows ?? result.ValidRows ?? 0;
        const phan = [`Đã import ${soDongGhi} dòng.`];
        // Message của server nêu số Khoa có trong file - thông tin FE không tự
        // suy ra được vì Khoa nằm ở cột H của từng dòng.
        if (result.Message) phan.push(result.Message);
        if (result.SkippedRows > 0) {
          phan.push(
            `${result.SkippedRows} dòng bị bỏ qua do thiếu mã cán bộ / câu hỏi / điểm.`,
          );
        }
        // Điểm chốt là ảnh chụp tại thời điểm chốt, KHÔNG tự cập nhật theo dữ
        // liệu thô. Màn này không biết năm đã chốt hay chưa nên nhắc có điều
        // kiện, rẻ hơn gọi thêm một route chỉ để biết điều đó.
        phan.push(
          "Nếu năm này đã chốt điểm trung bình, cần chốt lại để cập nhật.",
        );
        setMessage({ type: "success", text: phan.join(" ") });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const dsKhoa = Array.isArray(result.KhoaKhongKhop)
          ? result.KhoaKhongKhop
          : [];
        setKhoaKhongKhop(result.ErrorCode === "KHOA_KHONG_KHOP" ? dsKhoa : []);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setKhoaKhongKhop([]);

    if (!namHoc) {
      setMessage({ type: "error", text: "Vui lòng chọn năm học!" });
      return;
    }

    if (!file) {
      setMessage({
        type: "error",
        text: "Vui lòng chọn file Excel để import!",
      });
      return;
    }

    confirmDialog({
      header: "Xác nhận nhập dữ liệu đánh giá sinh viên",
      message: `Nhập file “${file.name}” cho năm ${namHoc}. Khoa của từng dòng lấy từ cột H (ngành/khoa) trong file. Dữ liệu phản hồi sinh viên đã có của năm này ở các Khoa có trong file sẽ bị ghi đè, Khoa không có trong file giữ nguyên; điểm trung bình được tính lại sau đó. Tiếp tục?`,
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Nhập dữ liệu",
      rejectLabel: "Hủy",
      acceptClassName: "p-button-primary",
      rejectClassName: "p-button-secondary p-button-outlined",
      // Modal import dùng z-index 10000 nên hộp xác nhận phải nằm trên mức đó.
      baseZIndex: 10001,
      accept: runImport,
    });
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

          {khoaKhongKhop.length > 0 && (
            <div
              role="alert"
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                marginBottom: "18px",
                fontSize: "13px",
                backgroundColor: "#fffbeb",
                color: "#92400e",
                border: "1px solid #fde68a",
              }}
            >
              <p style={{ margin: "0 0 4px 0", fontWeight: "700" }}>
                File chưa được import: {khoaKhongKhop.length} tên Khoa ở cột H
                không khớp danh mục đơn vị.
              </p>
              <p style={{ margin: "0 0 10px 0" }}>
                Chưa có dữ liệu nào bị xoá hay ghi. Sửa cột H (ngành/khoa) trong
                file rồi import lại.
              </p>
              <table
                className="custom-table"
                style={{ width: "100%", fontSize: "13px" }}
              >
                <thead>
                  <tr>
                    <th>GIÁ TRỊ CỘT H</th>
                    <th style={{ textAlign: "center", width: "90px" }}>
                      SỐ DÒNG
                    </th>
                    <th>LÝ DO</th>
                  </tr>
                </thead>
                <tbody>
                  {khoaKhongKhop.map((item, index) => (
                    <tr key={`${item.GiaTriCotH || ""}-${index}`}>
                      {/* Bọc nháy để người dùng thấy cả khoảng trắng thừa khi
                          dò lại ô trong Excel. */}
                      <td>
                        {item.GiaTriCotH
                          ? `“${item.GiaTriCotH}”`
                          : "(để trống)"}
                      </td>
                      <td style={{ textAlign: "center" }}>{item.SoDong}</td>
                      <td>
                        {item.SoKhoaKhop > 1
                          ? `Trùng tên ${item.SoKhoaKhop} Khoa - liên hệ quản trị`
                          : "Không có Khoa nào tên này"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <p
                style={{
                  margin: "8px 0 0 0",
                  fontSize: "12px",
                  color: "#64748b",
                }}
              >
                Khoa của từng dòng lấy từ cột H (ngành/khoa) và phải là tên
                đầy đủ của Khoa đúng như trong danh mục đơn vị - không cần chọn
                Khoa ở đây nữa.
                <br />
                <strong>
                  Mỗi file phải chứa đủ dữ liệu cả năm học của các Khoa có trong
                  file
                </strong>
                : import xoá toàn bộ dữ liệu cả năm học (cả 3 kỳ) của từng Khoa
                có trong file rồi ghi lại, nên không tách file theo học kỳ.
              </p>
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
            disabled={isLoading || !file || !namHoc}
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
